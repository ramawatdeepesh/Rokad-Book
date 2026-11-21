import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  X,
  Check,
  Search,
  Calendar,
  Clock,
  FileText,
  Smartphone,
  Banknote,
  BookOpen,
} from 'lucide-react';
import {
  DEFAULT_IN_CATEGORIES,
  DEFAULT_OUT_CATEGORIES,
  EntryCategory,
  Party,
  PaymentMode,
  Transaction,
  TransactionDirection,
} from '../types/ledger';
import {
  formatINR,
  getCurrentTime24,
  getLocalDateString,
} from '../utils/formatters';

interface EntrySheetModalProps {
  isOpen: boolean;
  initialDirection: TransactionDirection;
  initialDate?: string;
  initialPartyId?: string;
  initialPaymentMode?: PaymentMode;
  editingTransaction?: Transaction | null;
  parties: Party[];
  customCategories: string[];
  showBilingualTerms: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id' | 'createdAt'>, editId?: string) => void;
}

const QUICK_ADD_AMOUNTS = [100, 500, 1000, 2000];

export const EntrySheetModal: React.FC<EntrySheetModalProps> = ({
  isOpen,
  initialDirection,
  initialDate,
  initialPartyId,
  initialPaymentMode,
  editingTransaction,
  parties,
  customCategories,
  showBilingualTerms,
  onClose,
  onSave,
}) => {
  const [direction, setDirection] = useState<TransactionDirection>(initialDirection);
  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initialPaymentMode ?? 'Cash');
  const [partyId, setPartyId] = useState<string | undefined>(initialPartyId);
  const [partyName, setPartyName] = useState<string>('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [category, setCategory] = useState<EntryCategory>('Counter Sale');
  const [note, setNote] = useState('');
  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState(initialDate ?? getLocalDateString(0));
  const [time, setTime] = useState(getCurrentTime24());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  const inCategories = useMemo(
    () => Array.from(new Set([...DEFAULT_IN_CATEGORIES, ...customCategories])),
    [customCategories]
  );
  const outCategories = useMemo(
    () => Array.from(new Set([...DEFAULT_OUT_CATEGORIES, ...customCategories])),
    [customCategories]
  );

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    if (editingTransaction) {
      setDirection(editingTransaction.direction);
      setAmountStr(String(editingTransaction.amount));
      setPaymentMode(editingTransaction.paymentMode);
      setPartyId(editingTransaction.partyId);
      setPartyName(editingTransaction.partyName);
      setCategory(editingTransaction.category);
      setNote(editingTransaction.note);
      setBillNo(editingTransaction.billNo ?? '');
      setDate(editingTransaction.date);
      setTime(editingTransaction.time);
    } else {
      setDirection(initialDirection);
      setAmountStr('');
      setPaymentMode(initialPaymentMode ?? 'Cash');
      const matchedParty = initialPartyId
        ? parties.find((p) => p.id === initialPartyId)
        : undefined;
      setPartyId(matchedParty?.id);
      setPartyName(matchedParty?.name ?? '');
      if (initialPaymentMode === 'Khata') {
        setCategory(initialDirection === 'out' ? 'Udhaar Given' : 'Wholesale Stock');
      } else if (matchedParty) {
        setCategory(initialDirection === 'in' ? 'Udhaar Recovery' : 'Vendor Payout');
      } else {
        setCategory(initialDirection === 'in' ? 'Counter Sale' : 'Shop Expense');
      }
      setNote('');
      setBillNo('');
      setDate(initialDate ?? getLocalDateString(0));
      setTime(getCurrentTime24());
    }
  }, [
    isOpen,
    initialDirection,
    initialDate,
    initialPartyId,
    initialPaymentMode,
    editingTransaction,
    parties,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const filteredParties = useMemo(() => {
    const q = partyName.trim().toLowerCase();
    if (!q) return parties.slice(0, 6);
    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q)
    );
  }, [parties, partyName]);

  if (!isOpen) return null;

  const parsedAmount = Number(amountStr) || 0;
  const isCashIn = direction === 'in';
  const availableCategories = isCashIn ? inCategories : outCategories;

  const handleDirectionChange = (next: TransactionDirection) => {
    setDirection(next);
    if (next === 'in' && !inCategories.includes(category)) {
      setCategory(partyId ? 'Udhaar Recovery' : 'Counter Sale');
    } else if (next === 'out' && !outCategories.includes(category)) {
      setCategory(paymentMode === 'Khata' ? 'Udhaar Given' : partyId ? 'Vendor Payout' : 'Shop Expense');
    }
  };

  const handleQuickAdd = (increment: number) => {
    setErrorMsg(null);
    const next = Math.round((parsedAmount + increment) * 100) / 100;
    setAmountStr(String(next));
  };

  const handleAmountTextChange = (val: string) => {
    setErrorMsg(null);
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    if (parts[0].length > 8) return;
    setAmountStr(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setErrorMsg('Please enter an amount greater than ₹ 0.');
      amountInputRef.current?.focus();
      return;
    }
    const finalPartyName =
      partyName.trim() ||
      (isCashIn
        ? paymentMode === 'UPI'
          ? 'UPI Counter Collection'
          : 'Walk-in Counter Sale'
        : category);

    if (paymentMode === 'Khata' && !partyId && !partyName.trim()) {
      setErrorMsg('Please select or enter a party name for Khata credit entries.');
      return;
    }

    onSave(
      {
        direction,
        amount: Math.round(parsedAmount * 100) / 100,
        paymentMode,
        partyId,
        partyName: finalPartyName,
        category,
        note: note.trim(),
        billNo: billNo.trim() || undefined,
        date,
        time,
      },
      editingTransaction?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#141B2D]/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editingTransaction ? 'Edit ledger entry' : 'Record ledger entry'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-elevated flex max-h-[94dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[22px] sm:rounded-[18px]">
        {/* Mobile grab handle */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-[#E2E6EE]" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E2E6EE] px-5 py-3.5">
          <div>
            <h2 className="text-[18px] font-semibold leading-6 text-[#141B2D]">
              {editingTransaction
                ? 'Edit Entry'
                : isCashIn
                  ? showBilingualTerms
                    ? 'Record Cash In (Aaya / Jama)'
                    : 'Record Cash In'
                  : showBilingualTerms
                    ? 'Record Cash Out (Gaya / Naam)'
                    : 'Record Cash Out'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close entry sheet"
            className="flex h-11 w-11 items-center justify-center rounded-[12px] text-[#637083] transition-colors hover:bg-[#F2F4F8] hover:text-[#141B2D]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-4 p-5">
            {/* Direction Segmented Switch */}
            <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-[#F2F4F8] p-1">
              <button
                type="button"
                onClick={() => handleDirectionChange('in')}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-semibold transition-all whitespace-nowrap ${
                  isCashIn
                    ? 'bg-[#0C9B6A] text-white shadow-sm'
                    : 'text-[#637083] hover:text-[#141B2D]'
                }`}
              >
                <ArrowDownLeft className="h-4 w-4" />
                <span>{showBilingualTerms ? '+ In / Aaya' : '+ Cash In'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDirectionChange('out')}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-semibold transition-all whitespace-nowrap ${
                  !isCashIn
                    ? 'bg-[#D6453D] text-white shadow-sm'
                    : 'text-[#637083] hover:text-[#141B2D]'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                <span>{showBilingualTerms ? '- Out / Gaya' : '- Cash Out'}</span>
              </button>
            </div>

            {/* Extra-Large Amount Input */}
            <div>
              <label htmlFor="entry-amount-input" className="mb-1.5 block text-xs font-semibold tracking-wide text-[#637083]">
                Amount (INR)
              </label>
              <div
                className={`flex items-center rounded-[12px] border-[1.5px] bg-white px-4 py-2.5 transition-colors focus-within:border-[#3B5BDB] ${
                  errorMsg ? 'border-[#D6453D]' : 'border-[#E2E6EE]'
                }`}
              >
                <span className="mr-2 select-none text-[26px] font-bold leading-none text-[#637083]">
                  ₹
                </span>
                <input
                  ref={amountInputRef}
                  id="entry-amount-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={amountStr}
                  onChange={(e) => handleAmountTextChange(e.target.value)}
                  className={`tnum w-full bg-transparent text-[28px] font-bold leading-[34px] tracking-[-0.01em] outline-none placeholder:text-[#CBD5E1] ${
                    isCashIn ? 'text-[#0C9B6A]' : 'text-[#D6453D]'
                  }`}
                />
                {amountStr && (
                  <button
                    type="button"
                    onClick={() => setAmountStr('')}
                    aria-label="Clear amount"
                    className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#637083] hover:bg-[#F2F4F8] hover:text-[#141B2D]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Quick Denomination Additions */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {QUICK_ADD_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAdd(amt)}
                    className="tnum h-[34px] rounded-full border border-[#E2E6EE] bg-white px-3 text-xs font-semibold text-[#141B2D] transition-colors hover:border-[#3B5BDB] hover:bg-[#EEF2FF] hover:text-[#3B5BDB]"
                  >
                    + ₹&nbsp;{amt.toLocaleString('en-IN')}
                  </button>
                ))}
                {parsedAmount > 0 && (
                  <span className="tnum ml-auto text-xs font-medium text-[#637083]">
                    {formatINR(parsedAmount)}
                  </span>
                )}
              </div>

              {errorMsg && (
                <p className="mt-1.5 text-xs font-medium text-[#D6453D]">{errorMsg}</p>
              )}
            </div>

            {/* Payment Mode Selection */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#637083]">
                Payment Mode
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'Cash', label: 'Cash', icon: Banknote },
                    { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
                    { id: 'Khata', label: 'Khata Credit', icon: BookOpen },
                  ] as const
                ).map((mode) => {
                  const Icon = mode.icon;
                  const active = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setPaymentMode(mode.id);
                        if (mode.id === 'Khata' && direction === 'out') {
                          setCategory('Udhaar Given');
                        }
                      }}
                      className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-[12px] border-[1.5px] px-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'border-[#3B5BDB] bg-[#EEF2FF] text-[#3B5BDB]'
                          : 'border-[#E2E6EE] bg-white text-[#637083] hover:text-[#141B2D]'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Party / Customer / Supplier Picker */}
            <div className="relative">
              <label htmlFor="entry-party-input" className="mb-1.5 block text-xs font-semibold tracking-wide text-[#637083]">
                Party / Customer / Vendor Name
              </label>
              <div className="flex items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 focus-within:border-[#3B5BDB]">
                <Search className="mr-2 h-4 w-4 shrink-0 text-[#637083]" />
                <input
                  id="entry-party-input"
                  type="text"
                  placeholder={isCashIn ? 'e.g., Shree Ganesh Caterers or Counter Sale' : 'e.g., Mehta Wholesale or Shop Expense'}
                  value={partyName}
                  onFocus={() => setShowPartyDropdown(true)}
                  onChange={(e) => {
                    setPartyName(e.target.value);
                    setPartyId(undefined);
                    setShowPartyDropdown(true);
                  }}
                  className="h-[48px] w-full bg-transparent text-sm font-medium text-[#141B2D] outline-none placeholder:text-[#94A3B8]"
                />
                {partyId && (
                  <span className="ml-2 shrink-0 text-[11px] font-semibold text-[#3B5BDB]">
                    Linked
                  </span>
                )}
              </div>

              {showPartyDropdown && filteredParties.length > 0 && (
                <div className="mt-1.5 max-h-44 overflow-y-auto rounded-[12px] border border-[#E2E6EE] bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#E2E6EE] px-3 py-1.5 text-[11px] font-semibold text-[#637083]">
                    <span>Saved Khata Parties</span>
                    <button
                      type="button"
                      onClick={() => setShowPartyDropdown(false)}
                      className="text-[#3B5BDB] hover:underline"
                    >
                      Close
                    </button>
                  </div>
                  {filteredParties.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPartyId(p.id);
                        setPartyName(p.name);
                        setShowPartyDropdown(false);
                        if (isCashIn) setCategory('Udhaar Recovery');
                        else if (paymentMode === 'Khata') setCategory('Udhaar Given');
                        else setCategory('Vendor Payout');
                      }}
                      className="flex min-h-[44px] w-full items-center justify-between border-b border-[#E2E6EE]/60 px-3.5 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-[#F2F4F8]"
                    >
                      <span className="font-medium text-[#141B2D]">{p.name}</span>
                      <span className="tnum text-xs text-[#637083]">
                        {p.role === 'customer' ? 'Customer' : 'Supplier'} · {p.phone}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Interactive Filter Chips */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[#637083]">
                Category
              </span>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`h-[34px] rounded-full border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        active
                          ? 'border-[#3B5BDB] bg-[#EEF2FF] text-[#3B5BDB]'
                          : 'border-[#E2E6EE] bg-white text-[#637083] hover:text-[#141B2D]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note, Bill No, Date & Time */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="entry-note-input" className="mb-1 block text-xs font-semibold text-[#637083]">
                  Remark / Item Details (Optional)
                </label>
                <div className="flex items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3 focus-within:border-[#3B5BDB]">
                  <FileText className="mr-2 h-4 w-4 shrink-0 text-[#637083]" />
                  <input
                    id="entry-note-input"
                    type="text"
                    placeholder="e.g., 5 bags basmati rice, GPay ref..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-[46px] w-full bg-transparent text-sm text-[#141B2D] outline-none placeholder:text-[#94A3B8]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="entry-date-input" className="mb-1 block text-xs font-semibold text-[#637083]">
                  Date
                </label>
                <div className="flex items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3 focus-within:border-[#3B5BDB]">
                  <Calendar className="mr-2 h-4 w-4 shrink-0 text-[#637083]" />
                  <input
                    id="entry-date-input"
                    type="date"
                    max={getLocalDateString(0)}
                    value={date}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val || val <= getLocalDateString(0)) {
                        setDate(val);
                      }
                    }}
                    className="tnum h-[46px] w-full bg-transparent text-sm font-medium text-[#141B2D] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="entry-time-input" className="mb-1 block text-xs font-semibold text-[#637083]">
                    Time
                  </label>
                  <div className="flex items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-2.5 focus-within:border-[#3B5BDB]">
                    <Clock className="mr-1.5 h-3.5 w-3.5 shrink-0 text-[#637083]" />
                    <input
                      id="entry-time-input"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="tnum h-[46px] w-full bg-transparent text-xs font-medium text-[#141B2D] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="entry-bill-input" className="mb-1 block text-xs font-semibold text-[#637083]">
                    Bill No.
                  </label>
                  <input
                    id="entry-bill-input"
                    type="text"
                    placeholder="INV-885"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    className="tnum h-[46px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3 text-xs font-medium text-[#141B2D] outline-none focus:border-[#3B5BDB]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Submit Footer */}
          <div className="sticky bottom-0 flex items-center gap-3 border-t border-[#E2E6EE] bg-white px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[52px] items-center justify-center rounded-[12px] border-[1.5px] border-[#E2E6EE] px-4 text-sm font-semibold text-[#141B2D] transition-colors hover:bg-[#141B2D]/[0.03]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-[12px] px-5 text-sm font-bold text-white transition-transform active:scale-[0.98] ${
                isCashIn
                  ? 'bg-[#0C9B6A] hover:bg-[#0A875C]'
                  : 'bg-[#D6453D] hover:bg-[#BE342E]'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>
                {editingTransaction
                  ? 'Update Entry'
                  : isCashIn
                    ? showBilingualTerms
                      ? 'Save Cash In (Aaya)'
                      : 'Save Cash In'
                    : showBilingualTerms
                      ? 'Save Cash Out (Gaya)'
                      : 'Save Cash Out'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
