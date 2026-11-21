/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Settings,
  RotateCcw,
} from 'lucide-react';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  Party,
  PaymentMode,
  ShopSettings,
  TabId,
  Transaction,
  TransactionDirection,
} from './types/ledger';
import { formatINR, getCurrentTime24, getLocalDateString } from './utils/formatters';
import { TodayView } from './components/TodayView';
import { UdhaarView } from './components/UdhaarView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { EntrySheetModal } from './components/EntrySheetModal';
import { LoginScreen } from './components/LoginScreen';
import { ProfileSetupModal } from './components/ProfileSetupModal';

const FALLBACK_SHELL_SETTINGS: ShopSettings = {
  shopName: 'Your Shop Ledger',
  proprietorName: '',
  businessType: 'Kirana & Provision',
  phone: '',
  gstin: '',
  address: '',
  openingCashBalance: 0,
  customCategories: [],
  showBilingualTerms: true,
  showNumericKeypad: true,
  showPaiseDecimals: false,
};

function timestampToMillis(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number') return val;
  return Date.now();
}

interface ToastState {
  message: string;
  undoTx?: Transaction;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [settings, setSettings] = useState<ShopSettings>(FALLBACK_SHELL_SETTINGS);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parties, setParties] = useState<Party[]>([]);

  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString(0));
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  const [entrySheet, setEntrySheet] = useState<{
    isOpen: boolean;
    direction: TransactionDirection;
    partyId?: string;
    paymentMode?: PaymentMode;
    editingTransaction?: Transaction | null;
  }>({
    isOpen: false,
    direction: 'in',
    editingTransaction: null,
  });

  const [toast, setToast] = useState<ToastState | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProfileLoaded(false);
        setProfileCompleted(false);
        setSettings(FALLBACK_SHELL_SETTINGS);
        setTransactions([]);
        setParties([]);
        setSelectedPartyId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to ShopProfile doc once authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    const profilePath = `users/${user.uid}`;
    const profileRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setSettings({
            shopName: String(d.shopName ?? ''),
            proprietorName: String(d.proprietorName ?? ''),
            businessType: d.businessType ?? 'Kirana & Provision',
            phone: String(d.phone ?? '').replace(/\D/g, '').slice(0, 10),
            gstin: String(d.gstin ?? ''),
            address: String(d.address ?? ''),
            openingCashBalance: Number(d.openingCashBalance ?? 0),
            customCategories: Array.isArray(d.customCategories)
              ? d.customCategories
                  .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
                  .slice(0, 25)
              : [],
            showBilingualTerms: Boolean(d.showBilingualTerms ?? true),
            showNumericKeypad: Boolean(d.showNumericKeypad ?? true),
            showPaiseDecimals: Boolean(d.showPaiseDecimals ?? false),
          });
          setProfileCompleted(Boolean(d.profileCompleted));
        } else {
          setProfileCompleted(false);
          setSettings(FALLBACK_SHELL_SETTINGS);
        }
        setProfileLoaded(true);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, profilePath);
        } catch (err) {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );

    return () => unsubscribe();
  }, [authReady, user]);

  // Subscribe to user's private Parties & Transactions after profile setup is complete
  useEffect(() => {
    if (!authReady || !user || !profileCompleted) return;

    const partiesPath = `users/${user.uid}/parties`;
    const partiesQuery = query(
      collection(db, 'users', user.uid, 'parties'),
      where('ownerId', '==', user.uid)
    );
    const unsubParties = onSnapshot(
      partiesQuery,
      (snapshot) => {
        const list: Party[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: String(d.name ?? ''),
            phone: String(d.phone ?? ''),
            role: d.role === 'supplier' ? 'supplier' : 'customer',
            address: d.address ? String(d.address) : undefined,
            openingBalance: Number(d.openingBalance ?? 0),
            createdAt: timestampToMillis(d.createdAt),
          };
        });
        setParties(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, partiesPath);
        } catch (err) {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );

    const txPath = `users/${user.uid}/transactions`;
    const txQuery = query(
      collection(db, 'users', user.uid, 'transactions'),
      where('ownerId', '==', user.uid)
    );
    const unsubTx = onSnapshot(
      txQuery,
      (snapshot) => {
        const list: Transaction[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            direction: d.direction === 'out' ? 'out' : 'in',
            amount: Number(d.amount ?? 0),
            paymentMode:
              d.paymentMode === 'UPI' || d.paymentMode === 'Khata'
                ? d.paymentMode
                : 'Cash',
            partyId: d.partyId ? String(d.partyId) : undefined,
            partyName: String(d.partyName ?? ''),
            category: d.category ?? 'Counter Sale',
            note: String(d.note ?? ''),
            billNo: d.billNo ? String(d.billNo) : undefined,
            date: String(d.date ?? getLocalDateString(0)),
            time: String(d.time ?? '00:00'),
            createdAt: timestampToMillis(d.createdAt),
          };
        });
        setTransactions(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, txPath);
        } catch (err) {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    );

    return () => {
      unsubParties();
      unsubTx();
    };
  }, [authReady, user, profileCompleted]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string, undoTx?: Transaction) => {
    setToast({ message, undoTx });
  };

  const handleCompleteProfileSetup = async (profile: ShopSettings) => {
    if (!user) return;
    const profilePath = `users/${user.uid}`;
    const profileRef = doc(db, 'users', user.uid);
    try {
      await setDoc(profileRef, {
        uid: user.uid,
        email: (user.email ?? '').slice(0, 200),
        shopName: profile.shopName.trim().slice(0, 120),
        proprietorName: profile.proprietorName.trim().slice(0, 100),
        businessType: profile.businessType,
        phone: profile.phone.replace(/\D/g, '').slice(0, 10),
        gstin: profile.gstin.trim().toUpperCase().slice(0, 20),
        address: profile.address.trim().slice(0, 240),
        openingCashBalance: Math.max(0, Math.min(1000000000, profile.openingCashBalance)),
        customCategories: (profile.customCategories ?? [])
          .map((c) => c.trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, 25),
        showBilingualTerms: Boolean(profile.showBilingualTerms),
        showNumericKeypad: Boolean(profile.showNumericKeypad),
        showPaiseDecimals: Boolean(profile.showPaiseDecimals),
        profileCompleted: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(`Welcome! ${profile.shopName} ledger is ready.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, profilePath);
    }
  };

  const handleUpdateSettings = async (next: ShopSettings) => {
    if (!user) return;
    const profilePath = `users/${user.uid}`;
    const profileRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(profileRef, {
        shopName: next.shopName.trim().slice(0, 120),
        proprietorName: next.proprietorName.trim().slice(0, 100),
        businessType: next.businessType,
        phone: next.phone.replace(/\D/g, '').slice(0, 10),
        gstin: next.gstin.trim().toUpperCase().slice(0, 20),
        address: next.address.trim().slice(0, 240),
        openingCashBalance: Math.max(0, Math.min(1000000000, next.openingCashBalance)),
        customCategories: (next.customCategories ?? [])
          .map((c) => c.trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, 25),
        showBilingualTerms: Boolean(next.showBilingualTerms),
        showNumericKeypad: Boolean(next.showNumericKeypad),
        showPaiseDecimals: Boolean(next.showPaiseDecimals),
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, profilePath);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleOpenEntrySheet = (
    direction: TransactionDirection,
    paymentMode?: PaymentMode,
    partyId?: string
  ) => {
    setEntrySheet({
      isOpen: true,
      direction,
      paymentMode,
      partyId,
      editingTransaction: null,
    });
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEntrySheet({
      isOpen: true,
      direction: tx.direction,
      paymentMode: tx.paymentMode,
      partyId: tx.partyId,
      editingTransaction: tx,
    });
  };

  const handleSaveTransaction = async (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    editId?: string
  ) => {
    if (!user) return;

    const validPartyId =
      txData.partyId && parties.some((p) => p.id === txData.partyId)
        ? txData.partyId.slice(0, 128)
        : '';

    const today = getLocalDateString(0);
    const safeDate =
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(txData.date) && txData.date <= today
        ? txData.date
        : today;
    const safeTime = /^[0-9]{2}:[0-9]{2}$/.test(txData.time)
      ? txData.time
      : getCurrentTime24();

    const basePayload = {
      direction: txData.direction,
      amount: Math.max(0.01, Math.min(1000000000, Math.round(txData.amount * 100) / 100)),
      paymentMode: txData.paymentMode,
      partyId: validPartyId,
      partyName: txData.partyName.trim().slice(0, 120) || 'Counter Entry',
      category: txData.category.trim().slice(0, 40) || 'Counter Sale',
      note: (txData.note ?? '').trim().slice(0, 280),
      billNo: (txData.billNo ?? '').trim().slice(0, 40),
      date: safeDate,
      time: safeTime,
    };

    if (editId) {
      const path = `users/${user.uid}/transactions/${editId}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'transactions', editId), {
          ...basePayload,
          updatedAt: serverTimestamp(),
        });
        showToast(`Updated ${formatINR(basePayload.amount)} entry for ${basePayload.partyName}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    } else {
      const path = `users/${user.uid}/transactions`;
      try {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), {
          ownerId: user.uid,
          ...basePayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(
          `Recorded ${basePayload.direction === 'in' ? '+' : '-'} ${formatINR(basePayload.amount)} (${basePayload.paymentMode})`
        );
        if (activeTab === 'today' && basePayload.date !== selectedDate) {
          setSelectedDate(basePayload.date);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  };

  const handleDeleteTransaction = async (tx: Transaction) => {
    if (!user) return;
    const path = `users/${user.uid}/transactions/${tx.id}`;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', tx.id));
      showToast(`Deleted ${formatINR(tx.amount)} entry`, tx);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleUndoDelete = async () => {
    if (!toast?.undoTx || !user) return;
    const restored = toast.undoTx;
    setToast(null);
    await handleSaveTransaction({
      direction: restored.direction,
      amount: restored.amount,
      paymentMode: restored.paymentMode,
      partyId: restored.partyId,
      partyName: restored.partyName,
      category: restored.category,
      note: restored.note,
      billNo: restored.billNo,
      date: restored.date,
      time: restored.time,
    });
  };

  const handleAddParty = async (partyData: Omit<Party, 'id' | 'createdAt'>) => {
    if (!user) return;
    const path = `users/${user.uid}/parties`;
    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'parties'), {
        ownerId: user.uid,
        name: partyData.name.trim().slice(0, 120),
        phone: (partyData.phone ?? '').replace(/\D/g, '').slice(0, 10),
        role: partyData.role,
        address: (partyData.address ?? '').trim().slice(0, 240),
        openingBalance: Math.max(
          -1000000000,
          Math.min(1000000000, Math.round(partyData.openingBalance * 100) / 100)
        ),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSelectedPartyId(docRef.id);
      showToast(`Added ${partyData.name} to Udhaar Khata`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleExportBackupJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      accountEmail: user?.email ?? '',
      shop: settings,
      parties,
      transactions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rokad-book-backup-${getLocalDateString(0)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded JSON ledger backup');
  };

  if (!authReady || (user && !profileLoaded)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F2F4F8] p-4">
        <div className="card-ledger w-full max-w-[360px] p-6 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-[#E2E6EE] border-t-[#3B5BDB]" />
          <p className="mt-4 text-sm font-semibold text-[#141B2D]">
            {!authReady ? 'Checking Google sign-in...' : 'Loading your shop ledger...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const navItems: { id: TabId; label: string; icon: typeof CalendarDays }[] = [
    { id: 'today', label: 'Today', icon: CalendarDays },
    { id: 'udhaar', label: 'Udhaar', icon: BookOpen },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-dvh bg-[#F2F4F8] text-[#141B2D]">
      {/* Sticky Top Header */}
      <header className="no-print sticky top-0 z-30 border-b border-[#E2E6EE] bg-white">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-8 px-4 sm:px-6 md:h-16">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className="text-[20px] font-bold tracking-[-0.02em] text-[#141B2D] whitespace-nowrap shrink-0"
          >
            Rokad Book
          </button>

          <nav
            aria-label="Primary sections"
            className="hidden items-center gap-7 md:flex"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-[#3B5BDB]'
                      : 'text-[#637083] hover:text-[#141B2D]'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-[17px] h-[2.5px] rounded-full bg-[#3B5BDB]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-[1120px] px-4 pb-24 pt-4 sm:px-6 md:pb-12 md:pt-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-[20px] font-bold leading-7 tracking-[-0.01em] text-[#141B2D] sm:text-[24px] sm:leading-8">
              {settings.shopName}
            </h1>
            <p className="mt-0.5 text-xs font-medium text-[#637083]">
              {settings.businessType}
              {settings.proprietorName && (
                <>
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  {settings.proprietorName}
                </>
              )}
              {settings.gstin && (
                <>
                  <span className="mx-1.5 hidden sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span className="tnum hidden sm:inline">GSTIN {settings.gstin}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {activeTab === 'today' && (
          <TodayView
            transactions={transactions}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            settings={settings}
            onOpenEntrySheet={(dir, mode) => handleOpenEntrySheet(dir, mode)}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onNavigateToParty={(pid) => {
              setSelectedPartyId(pid);
              setActiveTab('udhaar');
            }}
          />
        )}

        {activeTab === 'udhaar' && (
          <UdhaarView
            parties={parties}
            transactions={transactions}
            settings={settings}
            selectedPartyId={selectedPartyId}
            onSelectPartyId={setSelectedPartyId}
            onAddParty={handleAddParty}
            onRecordForParty={(partyId, direction, mode) =>
              handleOpenEntrySheet(direction, mode, partyId)
            }
            onNotify={(msg) => showToast(msg)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            settings={settings}
            onNotify={(msg) => showToast(msg)}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            userEmail={user.email ?? ''}
            transactionCount={transactions.length}
            partyCount={parties.length}
            onUpdateSettings={handleUpdateSettings}
            onExportBackupJSON={handleExportBackupJSON}
            onSignOut={handleSignOut}
            onNotify={(msg) => showToast(msg)}
          />
        )}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="no-print bottom-nav-elevated fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-[480px] grid-cols-4 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-[#3B5BDB]' : 'text-[#637083]'
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.25 : 1.8} />
                <span className="text-[11px] font-semibold leading-[14px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Post-Google-Login Profile Setup Window */}
      {!profileCompleted && (
        <ProfileSetupModal
          userEmail={user.email ?? ''}
          userDisplayName={user.displayName ?? ''}
          onComplete={handleCompleteProfileSetup}
          onSignOut={handleSignOut}
        />
      )}

      {/* Quick Entry Bottom Sheet / Modal */}
      <EntrySheetModal
        isOpen={entrySheet.isOpen}
        initialDirection={entrySheet.direction}
        initialDate={selectedDate}
        initialPartyId={entrySheet.partyId}
        initialPaymentMode={entrySheet.paymentMode}
        editingTransaction={entrySheet.editingTransaction}
        parties={parties}
        customCategories={settings.customCategories}
        showBilingualTerms={settings.showBilingualTerms}
        onClose={() =>
          setEntrySheet((prev) => ({
            ...prev,
            isOpen: false,
            editingTransaction: null,
          }))
        }
        onSave={handleSaveTransaction}
      />

      {/* Inline Toast Feedback Banner */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 items-center justify-between gap-3 rounded-[14px] bg-[#141B2D] px-4 py-3 text-sm font-medium text-white shadow-lg md:bottom-6"
        >
          <span className="tnum truncate">{toast.message}</span>
          {toast.undoTx && (
            <button
              type="button"
              onClick={handleUndoDelete}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/25"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Undo</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
