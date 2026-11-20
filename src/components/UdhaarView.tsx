import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Phone,
  Plus,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import {
  Party,
  PartyRole,
  PaymentMode,
  ShopSettings,
  Transaction,
  TransactionDirection,
} from '../types/ledger';
import {
  buildPaymentReminderText,
  downloadCSV,
  formatDisplayTime,
  formatINR,
  formatPhoneIndian,
  formatShortDate,
  getInitials,
} from '../utils/formatters';
import { computePartyAccounts, PartyComputedAccount } from '../utils/ledgerMath';

interface UdhaarViewProps {
  parties: Party[];
  transactions: Transaction[];
  settings: ShopSettings;
  selectedPartyId: string | null;
  onSelectPartyId: (id: string | null) => void;
  onAddParty: (party: Omit<Party, 'id' | 'createdAt'>) => void;
  onRecordForParty: (
    partyId: string,
    direction: TransactionDirection,
    paymentMode: PaymentMode
  ) => void;
  onNotify: (message: string) => void;
}

type UdhaarFilter = 'all' | 'collect' | 'pay' | 'settled';

export const UdhaarView: React.FC<UdhaarViewProps> = ({
  parties,
  transactions,
  settings,
  selectedPartyId,
  onSelectPartyId,
  onAddParty,
  onRecordForParty,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<UdhaarFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedPartyId, setCopiedPartyId] = useState<string | null>(null);

  // Add party form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<PartyRole>('customer');
  const [newAddress, setNewAddress] = useState('');
  const [newOpeningAmt, setNewOpeningAmt] = useState('');
  const [newOpeningType, setNewOpeningType] = useState<'get' | 'give'>('get');
  const [addError, setAddError] = useState<string | null>(null);

  const dec = settings.showPaiseDecimals;

  const accounts = useMemo(
    () => computePartyAccounts(parties, transactions),
    [parties, transactions]
  );

  const totals = useMemo(() => {
    let toCollect = 0;
    let toPay = 0;
    for (const acc of accounts) {
      if (acc.balance > 0) toCollect += acc.balance;
      else if (acc.balance < 0) toPay += Math.abs(acc.balance);
    }
    return { toCollect, toPay, net: toCollect - toPay };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts
      .filter((acc) => {
        if (filter === 'collect') return acc.balance > 0;
        if (filter === 'pay') return acc.balance < 0;
        if (filter === 'settled') return acc.balance === 0;
        return true;
      })
      .filter((acc) => {
        if (!q) return true;
        return (
          acc.party.name.toLowerCase().includes(q) ||
          acc.party.phone.includes(q) ||
          (acc.party.address && acc.party.address.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [accounts, filter, searchQuery]);

  const selectedAccount: PartyComputedAccount | null = useMemo(() => {
    if (!selectedPartyId) return null;
    return accounts.find((a) => a.party.id === selectedPartyId) ?? null;
  }, [accounts, selectedPartyId]);

  const handleCopyReminder = async (acc: PartyComputedAccount) => {
    const text = buildPaymentReminderText({
      partyName: acc.party.name,
      shopName: settings.shopName,
      amountDue: Math.abs(acc.balance),
      shopPhone: settings.phone,
      bilingual: settings.showBilingualTerms,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPartyId(acc.party.id);
      onNotify(`Payment reminder copied for ${acc.party.name}`);
      setTimeout(() => setCopiedPartyId(null), 2200);
    } catch {
      onNotify('Reminder ready — clipboard access blocked in this frame.');
    }
  };

  const handleExportPartyCSV = (acc: PartyComputedAccount) => {
    const rows = acc.transactions.map((tx) => [
      tx.date,
      tx.time,
      tx.direction === 'in' ? 'Received (Jama)' : 'Given / Paid (Naam)',
      tx.paymentMode,
      tx.category,
      tx.billNo || '',
      tx.note || '',
      tx.amount,
    ]);
    downloadCSV(
      `khata-${acc.party.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`,
      ['Date', 'Time', 'Type', 'Mode', 'Category', 'Bill No', 'Note', 'Amount (INR)'],
      rows
    );
    onNotify(`Downloaded statement for ${acc.party.name}`);
  };

  const handleCreateParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setAddError('Party name is required.');
      return;
    }
    const cleanPhone = newPhone.replace(/\D/g, '').slice(0, 10);
    if (cleanPhone.length > 0 && cleanPhone.length !== 10) {
      setAddError('Contact number must be exactly 10 digits.');
      return;
    }
    const parsedOpen = Math.max(0, Number(newOpeningAmt) || 0);
    const signedOpen = newOpeningType === 'get' ? parsedOpen : -parsedOpen;

    onAddParty({
      name: newName.trim(),
      phone: cleanPhone,
      role: newRole,
      address: newAddress.trim() || undefined,
      openingBalance: signedOpen,
    });

    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewOpeningAmt('');
    setNewRole('customer');
    setNewOpeningType('get');
    setAddError(null);
    setShowAddModal(false);
  };

  // Compute chronological statement with running balance for selected party
  const statementRows = useMemo(() => {
    if (!selectedAccount) return [];
    const chronological = [...selectedAccount.transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
    let running = selectedAccount.party.openingBalance;
    const withRunning = chronological.map((tx) => {
      running = tx.direction === 'in' ? running - tx.amount : running + tx.amount;
      return { tx, runningBalance: running };
    });
    return withRunning.reverse();
  }, [selectedAccount]);

  return (
    <div className="space-y-4">
      {/* Udhaar Summary Banner */}
      <section className="card-ledger p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid flex-1 grid-cols-2 divide-x divide-[#E2E6EE] sm:max-w-xl">
            <div className="pr-4">
              <p className="text-xs font-semibold text-[#637083]">
                {settings.showBilingualTerms ? 'You Will Get (Lena Hai)' : 'Total Receivable'}
              </p>
              <p className="tnum mt-1 text-[24px] font-bold leading-[30px] text-[#0C9B6A]">
                {formatINR(totals.toCollect, { showDecimals: dec })}
              </p>
            </div>
            <div className="pl-5">
              <p className="text-xs font-semibold text-[#637083]">
                {settings.showBilingualTerms ? 'You Will Give (Dena Hai)' : 'Total Payable'}
              </p>
              <p className="tnum mt-1 text-[24px] font-bold leading-[30px] text-[#D6453D]">
                {formatINR(totals.toPay, { showDecimals: dec })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-[12px] bg-[#3B5BDB] px-5 text-sm font-bold text-white transition-colors hover:bg-[#1A40C2] whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Party</span>
          </button>
        </div>
      </section>

      {/* Main Split View: Party List + Selected Party Khata Statement */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
        {/* Party List Card (hidden on mobile when inspecting a party) */}
        <section
          className={`card-ledger overflow-hidden lg:col-span-6 ${
            selectedAccount ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="space-y-3 border-b border-[#E2E6EE] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-[#141B2D]">
                {settings.showBilingualTerms ? 'Party Khata Accounts' : 'Credit Accounts'}
              </h2>
              <span className="tnum text-xs font-medium text-[#637083]">
                {filteredAccounts.length} parties
              </span>
            </div>

            <div className="flex items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 focus-within:border-[#3B5BDB]">
              <Search className="mr-2 h-4 w-4 shrink-0 text-[#637083]" />
              <input
                type="text"
                placeholder="Search customer or wholesaler..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search party accounts"
                className="h-[46px] w-full bg-transparent text-sm text-[#141B2D] outline-none placeholder:text-[#94A3B8]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear party search"
                  className="flex h-8 w-8 items-center justify-center text-[#637083]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-0.5">
              {(
                [
                  { id: 'all', label: 'All Parties' },
                  {
                    id: 'collect',
                    label: settings.showBilingualTerms ? 'Lena Hai (Get)' : 'To Collect',
                  },
                  {
                    id: 'pay',
                    label: settings.showBilingualTerms ? 'Dena Hai (Give)' : 'To Pay',
                  },
                  { id: 'settled', label: 'Settled' },
                ] as { id: UdhaarFilter; label: string }[]
              ).map((chip) => {
                const active = filter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilter(chip.id)}
                    className={`h-[34px] shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      active
                        ? 'border-[#3B5BDB] bg-[#EEF2FF] text-[#3B5BDB]'
                        : 'border-[#E2E6EE] bg-white text-[#637083] hover:text-[#141B2D]'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-base font-semibold text-[#141B2D]">
                {parties.length === 0 ? 'No khata parties added yet' : 'No matching parties'}
              </p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-[#637083]">
                {parties.length === 0
                  ? 'Add your regular customers or wholesale suppliers to start tracking Lena Hai and Dena Hai balances.'
                  : 'Try a different filter or add a new customer or supplier account.'}
              </p>
              {parties.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] bg-[#3B5BDB] px-5 text-sm font-bold text-white hover:bg-[#1A40C2]"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add First Party</span>
                </button>
              )}
            </div>
          ) : (
            <div>
              {filteredAccounts.map((acc, idx) => {
                const isSelected = selectedPartyId === acc.party.id;
                const isGet = acc.balance > 0;
                const isPay = acc.balance < 0;
                return (
                  <div key={acc.party.id}>
                    {idx > 0 && <div className="ml-[68px] mr-5 h-px bg-[#E2E6EE]" />}
                    <button
                      type="button"
                      onClick={() => onSelectPartyId(acc.party.id)}
                      className={`flex min-h-[72px] w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-[#EEF2FF]/70'
                          : 'hover:bg-[#F2F4F8]/65'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isSelected
                              ? 'bg-[#3B5BDB] text-white'
                              : 'bg-[#F2F4F8] text-[#141B2D]'
                          }`}
                        >
                          {getInitials(acc.party.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-[#141B2D]">
                            {acc.party.name}
                          </p>
                          <p className="tnum mt-0.5 truncate text-xs text-[#637083]">
                            {acc.party.role === 'customer' ? 'Customer' : 'Supplier'}
                            {acc.party.phone ? ` · ${formatPhoneIndian(acc.party.phone)}` : ''}
                            {acc.lastActivityDate
                              ? ` · Last ${formatShortDate(acc.lastActivityDate)}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={`tnum text-[16px] font-bold ${
                            isGet
                              ? 'text-[#0C9B6A]'
                              : isPay
                                ? 'text-[#D6453D]'
                                : 'text-[#637083]'
                          }`}
                        >
                          {formatINR(Math.abs(acc.balance), { showDecimals: dec })}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-[#637083]">
                          {isGet
                            ? settings.showBilingualTerms
                              ? 'Lena Hai'
                              : "You'll Get"
                            : isPay
                              ? settings.showBilingualTerms
                                ? 'Dena Hai'
                                : "You'll Give"
                              : 'Settled'}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Selected Party Khata Statement Detail Panel */}
        <section
          className={`card-ledger overflow-hidden lg:col-span-6 ${
            selectedAccount ? 'block' : 'hidden lg:block'
          }`}
        >
          {!selectedAccount ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF2FF] text-[#3B5BDB]">
                <Plus className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#141B2D]">
                Select a Party to View Khata Statement
              </h3>
              <p className="mt-1 max-w-xs text-sm text-[#637083]">
                Inspect running balances, record instant credit or payment recovery, and copy WhatsApp reminders.
              </p>
            </div>
          ) : (
            <div>
              {/* Party Header */}
              <div className="border-b border-[#E2E6EE] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onSelectPartyId(null)}
                      aria-label="Back to party list"
                      className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#E2E6EE] text-[#141B2D] lg:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <h3 className="text-[18px] font-bold text-[#141B2D]">
                        {selectedAccount.party.name}
                      </h3>
                      <p className="tnum mt-0.5 flex items-center gap-1.5 text-xs text-[#637083]">
                        {selectedAccount.party.phone && (
                          <>
                            <Phone className="h-3.5 w-3.5" />
                            <span>{formatPhoneIndian(selectedAccount.party.phone)}</span>
                          </>
                        )}
                        {selectedAccount.party.address && (
                          <>
                            {selectedAccount.party.phone && <span aria-hidden="true">·</span>}
                            <span>{selectedAccount.party.address}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Running Net Balance Box */}
                <div className="mt-4 flex items-center justify-between rounded-[14px] bg-[#F2F4F8]/80 px-4 py-3.5">
                  <div>
                    <p className="text-xs font-semibold text-[#637083]">
                      {selectedAccount.balance > 0
                        ? settings.showBilingualTerms
                          ? 'Net Receivable (Lena Hai)'
                          : 'Net Receivable'
                        : selectedAccount.balance < 0
                          ? settings.showBilingualTerms
                            ? 'Net Payable (Dena Hai)'
                            : 'Net Payable'
                          : 'Account Settled'}
                    </p>
                    <p
                      className={`tnum mt-0.5 text-[24px] font-bold ${
                        selectedAccount.balance > 0
                          ? 'text-[#0C9B6A]'
                          : selectedAccount.balance < 0
                            ? 'text-[#D6453D]'
                            : 'text-[#141B2D]'
                      }`}
                    >
                      {formatINR(Math.abs(selectedAccount.balance), { showDecimals: dec })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedAccount.balance > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCopyReminder(selectedAccount)}
                        className="flex min-h-[44px] items-center gap-1.5 rounded-[12px] border border-[#E2E6EE] bg-white px-3 text-xs font-semibold text-[#141B2D] hover:border-[#3B5BDB] hover:text-[#3B5BDB]"
                      >
                        {copiedPartyId === selectedAccount.party.id ? (
                          <Check className="h-4 w-4 text-[#0C9B6A]" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span>
                          {copiedPartyId === selectedAccount.party.id ? 'Copied' : 'Reminder'}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleExportPartyCSV(selectedAccount)}
                      aria-label="Export party CSV statement"
                      className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#E2E6EE] bg-white text-[#141B2D] hover:border-[#3B5BDB] hover:text-[#3B5BDB]"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Party Quick-Action Directional CTA Pair */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onRecordForParty(selectedAccount.party.id, 'in', 'UPI')
                    }
                    className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-[12px] bg-[#0C9B6A] px-3 text-xs font-bold text-white hover:bg-[#0A875C] sm:text-sm"
                  >
                    <ArrowDownLeft className="h-4 w-4 shrink-0" />
                    <span>
                      {settings.showBilingualTerms ? 'Got Payment (Jama)' : 'Payment Received'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onRecordForParty(
                        selectedAccount.party.id,
                        'out',
                        selectedAccount.party.role === 'customer' ? 'Khata' : 'UPI'
                      )
                    }
                    className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-[12px] bg-[#D6453D] px-3 text-xs font-bold text-white hover:bg-[#BE342E] sm:text-sm"
                  >
                    <ArrowUpRight className="h-4 w-4 shrink-0" />
                    <span>
                      {selectedAccount.party.role === 'customer'
                        ? settings.showBilingualTerms
                          ? 'Give Credit (Udhaar)'
                          : 'Give Credit'
                        : settings.showBilingualTerms
                          ? 'Pay Vendor (Naam)'
                          : 'Pay Supplier'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Chronological Statement Rows */}
              <div className="divide-y divide-[#E2E6EE]">
                {statementRows.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-[#637083]">
                    No recent entries yet. Opening balance is{' '}
                    <span className="tnum font-semibold text-[#141B2D]">
                      {formatINR(Math.abs(selectedAccount.party.openingBalance))}
                    </span>
                    .
                  </div>
                ) : (
                  statementRows.map(({ tx, runningBalance }) => {
                    const isIn = tx.direction === 'in';
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-3 px-5 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#141B2D]">
                            {tx.note || tx.category}
                          </p>
                          <p className="tnum mt-0.5 text-xs text-[#637083]">
                            {formatShortDate(tx.date)} · {formatDisplayTime(tx.time)} ·{' '}
                            <span className="font-semibold text-[#141B2D]">{tx.paymentMode}</span>
                            {tx.billNo ? ` · ${tx.billNo}` : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={`tnum text-[15px] font-bold ${
                              isIn ? 'text-[#0C9B6A]' : 'text-[#D6453D]'
                            }`}
                          >
                            {formatINR(tx.amount, {
                              direction: tx.direction,
                              showDecimals: dec,
                            })}
                          </p>
                          <p className="tnum mt-0.5 text-[11px] text-[#637083]">
                            Bal {formatINR(Math.abs(runningBalance))}{' '}
                            {runningBalance > 0 ? 'Dr' : runningBalance < 0 ? 'Cr' : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Opening Balance Footnote */}
                <div className="flex items-center justify-between bg-[#F2F4F8]/50 px-5 py-3 text-xs text-[#637083]">
                  <span>Opening Carried-Forward Balance</span>
                  <span className="tnum font-semibold text-[#141B2D]">
                    {formatINR(Math.abs(selectedAccount.party.openingBalance))}{' '}
                    {selectedAccount.party.openingBalance > 0
                      ? '(Lena)'
                      : selectedAccount.party.openingBalance < 0
                        ? '(Dena)'
                        : ''}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Add New Party Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#141B2D]/45 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add new khata party"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="sheet-elevated w-full max-w-[460px] overflow-hidden rounded-t-[22px] sm:rounded-[18px]">
            <div className="flex items-center justify-between border-b border-[#E2E6EE] px-5 py-4">
              <h3 className="text-[18px] font-semibold text-[#141B2D]">
                Add Khata Party
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close modal"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#637083] hover:bg-[#F2F4F8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParty} className="space-y-4 p-5">
              {/* Role */}
              <div className="grid grid-cols-2 gap-2 rounded-[12px] bg-[#F2F4F8] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setNewRole('customer');
                    setNewOpeningType('get');
                  }}
                  className={`min-h-[44px] rounded-[10px] text-xs font-semibold ${
                    newRole === 'customer'
                      ? 'bg-white text-[#141B2D] shadow-sm'
                      : 'text-[#637083]'
                  }`}
                >
                  Customer (Grahak)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewRole('supplier');
                    setNewOpeningType('give');
                  }}
                  className={`min-h-[44px] rounded-[10px] text-xs font-semibold ${
                    newRole === 'supplier'
                      ? 'bg-white text-[#141B2D] shadow-sm'
                      : 'text-[#637083]'
                  }`}
                >
                  Supplier (Vyapari)
                </button>
              </div>

              <div>
                <label htmlFor="party-name" className="mb-1 block text-xs font-semibold text-[#637083]">
                  Party Full Name
                </label>
                <input
                  id="party-name"
                  type="text"
                  placeholder="e.g., Sharma Provision Stores"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setAddError(null);
                  }}
                  className="h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] px-3.5 text-sm font-medium text-[#141B2D] outline-none focus:border-[#3B5BDB]"
                />
                {addError && (
                  <p className="mt-1 text-xs font-medium text-[#D6453D]">{addError}</p>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="party-phone" className="block text-xs font-semibold text-[#637083]">
                    Mobile Number (10 digits, Optional)
                  </label>
                  <span
                    className={`tnum text-[11px] font-semibold ${
                      newPhone.length === 10 ? 'text-[#0C9B6A]' : 'text-[#637083]'
                    }`}
                  >
                    {newPhone.length}/10
                  </span>
                </div>
                <div className="flex items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 focus-within:border-[#3B5BDB]">
                  <span className="tnum mr-2 select-none text-sm font-semibold text-[#637083]">
                    +91
                  </span>
                  <input
                    id="party-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9820144312"
                    value={newPhone}
                    onChange={(e) => {
                      setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setAddError(null);
                    }}
                    className="tnum h-[46px] w-full bg-transparent text-sm font-medium text-[#141B2D] outline-none placeholder:text-[#94A3B8]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="party-address" className="mb-1 block text-xs font-semibold text-[#637083]">
                  Area / Address (Optional)
                </label>
                <input
                  id="party-address"
                  type="text"
                  placeholder="e.g., Market Road, Lane 2"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] px-3.5 text-sm text-[#141B2D] outline-none focus:border-[#3B5BDB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="party-opening" className="mb-1 block text-xs font-semibold text-[#637083]">
                    Opening Balance (₹)
                  </label>
                  <input
                    id="party-opening"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newOpeningAmt}
                    onChange={(e) => setNewOpeningAmt(e.target.value)}
                    className="tnum h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] px-3.5 text-sm font-bold text-[#141B2D] outline-none focus:border-[#3B5BDB]"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold text-[#637083]">
                    Balance Type
                  </span>
                  <div className="grid h-[48px] grid-cols-2 gap-1 rounded-[12px] border border-[#E2E6EE] bg-[#F2F4F8] p-1">
                    <button
                      type="button"
                      onClick={() => setNewOpeningType('get')}
                      className={`rounded-[8px] text-xs font-semibold ${
                        newOpeningType === 'get'
                          ? 'bg-[#0C9B6A] text-white'
                          : 'text-[#637083]'
                      }`}
                    >
                      Get
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewOpeningType('give')}
                      className={`rounded-[8px] text-xs font-semibold ${
                        newOpeningType === 'give'
                          ? 'bg-[#D6453D] text-white'
                          : 'text-[#637083]'
                      }`}
                    >
                      Give
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-[52px] rounded-[12px] border-[1.5px] border-[#E2E6EE] px-4 text-sm font-semibold text-[#141B2D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[52px] flex-1 rounded-[12px] bg-[#3B5BDB] px-5 text-sm font-bold text-white hover:bg-[#1A40C2]"
                >
                  Save Party Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
