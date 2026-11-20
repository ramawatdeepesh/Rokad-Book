import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Smartphone,
  BookOpen,
  Trash2,
  X,
  FileText,
  Clock,
} from 'lucide-react';
import {
  PaymentMode,
  ShopSettings,
  Transaction,
  TransactionDirection,
} from '../types/ledger';
import {
  formatDisplayDate,
  formatDisplayTime,
  formatINR,
  formatShortDate,
  getLocalDateString,
} from '../utils/formatters';
import { computeDailySummary } from '../utils/ledgerMath';
import { CalendarPicker } from './CalendarPicker';

interface TodayViewProps {
  transactions: Transaction[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  settings: ShopSettings;
  onOpenEntrySheet: (direction: TransactionDirection, paymentMode?: PaymentMode) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onNavigateToParty?: (partyId: string) => void;
}

type ModeFilter = 'all' | 'Cash' | 'UPI' | 'Khata';
type LayoutFocus = 'both' | 'in' | 'out';

export const TodayView: React.FC<TodayViewProps> = ({
  transactions,
  selectedDate,
  onSelectDate,
  settings,
  onOpenEntrySheet,
  onEditTransaction,
  onDeleteTransaction,
  onNavigateToParty,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all');
  const [layoutFocus, setLayoutFocus] = useState<LayoutFocus>('both');
  const [showCalendar, setShowCalendar] = useState(false);
  const [inspectingTx, setInspectingTx] = useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const todayStr = getLocalDateString(0);

  const activeDates = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) {
      set.add(tx.date);
    }
    return set;
  }, [transactions]);

  const recentDates = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => getLocalDateString(-i));
  }, []);

  const summary = useMemo(
    () =>
      computeDailySummary(
        transactions,
        selectedDate,
        settings.openingCashBalance
      ),
    [transactions, selectedDate, settings.openingCashBalance]
  );

  const dayFilteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions
      .filter((tx) => tx.date === selectedDate)
      .filter((tx) => {
        if (modeFilter !== 'all') return tx.paymentMode === modeFilter;
        return true;
      })
      .filter((tx) => {
        if (!q) return true;
        return (
          tx.partyName.toLowerCase().includes(q) ||
          tx.note.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          (tx.billNo && tx.billNo.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (a.time !== b.time) return b.time.localeCompare(a.time);
        return b.createdAt - a.createdAt;
      });
  }, [transactions, selectedDate, modeFilter, searchQuery]);

  const inTransactions = useMemo(
    () => dayFilteredTransactions.filter((tx) => tx.direction === 'in'),
    [dayFilteredTransactions]
  );

  const outTransactions = useMemo(
    () => dayFilteredTransactions.filter((tx) => tx.direction === 'out'),
    [dayFilteredTransactions]
  );

  const filteredInTotal = useMemo(
    () => inTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    [inTransactions]
  );

  const filteredOutTotal = useMemo(
    () => outTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    [outTransactions]
  );

  const stepDate = (deltaDays: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setDate(dt.getDate() + deltaDays);
    const nextStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (nextStr <= todayStr) {
      onSelectDate(nextStr);
    }
  };

  const dec = settings.showPaiseDecimals;

  const modeFilters: { id: ModeFilter; label: string }[] = [
    { id: 'all', label: 'All Modes' },
    { id: 'Cash', label: 'Cash' },
    { id: 'UPI', label: 'UPI' },
    { id: 'Khata', label: 'Khata' },
  ];

  const renderLedgerRow = (tx: Transaction, idx: number) => {
    const isIn = tx.direction === 'in';
    return (
      <div key={tx.id}>
        {idx > 0 && <div className="ml-[64px] mr-5 h-px bg-[#E2E6EE]" />}
        <button
          type="button"
          onClick={() => {
            setInspectingTx(tx);
            setConfirmDeleteId(null);
          }}
          className="flex min-h-[68px] w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#F2F4F8]/65 active:bg-[#EEF2FF]/50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                isIn
                  ? 'bg-[#E8F7F1] text-[#0C9B6A]'
                  : 'bg-[#FDEEEC] text-[#D6453D]'
              }`}
            >
              {isIn ? (
                <ArrowDownLeft className="h-4 w-4" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-5 text-[#141B2D]">
                {tx.partyName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#637083]">
                <span
                  className={`font-semibold ${
                    tx.paymentMode === 'UPI'
                      ? 'text-[#3B5BDB]'
                      : tx.paymentMode === 'Khata'
                        ? 'text-[#D6453D]'
                        : 'text-[#141B2D]'
                  }`}
                >
                  {tx.paymentMode}
                </span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{tx.note || tx.category}</span>
                <span aria-hidden="true">·</span>
                <span className="tnum shrink-0">{formatDisplayTime(tx.time)}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p
              className={`tnum text-[16px] font-bold leading-[22px] ${
                isIn ? 'text-[#0C9B6A]' : 'text-[#D6453D]'
              }`}
            >
              {formatINR(tx.amount, {
                direction: tx.direction,
                showDecimals: dec,
              })}
            </p>
            <p className="tnum mt-0.5 text-[11px] font-medium text-[#637083]">
              {tx.billNo ? tx.billNo : tx.category}
            </p>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Date Selector & Interactive Calendar Trigger Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => stepDate(-1)}
            aria-label="Previous day"
            className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#E2E6EE] bg-white text-[#141B2D] transition-colors hover:border-[#3B5BDB] hover:text-[#3B5BDB]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowCalendar(true)}
            aria-label="Open calendar to pick a date"
            className="flex min-h-[44px] items-center gap-2 rounded-[12px] border border-[#E2E6EE] bg-white px-3.5 text-sm font-semibold text-[#141B2D] transition-colors hover:border-[#3B5BDB] hover:text-[#3B5BDB]"
          >
            <Calendar className="h-4 w-4 text-[#3B5BDB]" />
            <span className="tnum whitespace-nowrap">{formatDisplayDate(selectedDate)}</span>
            <span className="tnum hidden text-xs font-medium text-[#637083] sm:inline">
              · {selectedDate}
            </span>
          </button>

          <button
            type="button"
            onClick={() => stepDate(1)}
            disabled={selectedDate >= todayStr}
            aria-label="Next day"
            className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#E2E6EE] bg-white text-[#141B2D] transition-colors hover:border-[#3B5BDB] hover:text-[#3B5BDB] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Recent Date Pills */}
        <div className="no-scrollbar hidden items-center gap-1.5 overflow-x-auto md:flex">
          {recentDates.map((dStr) => {
            const active = dStr === selectedDate;
            return (
              <button
                key={dStr}
                type="button"
                onClick={() => onSelectDate(dStr)}
                className={`tnum h-[34px] rounded-full border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[#3B5BDB] bg-[#EEF2FF] text-[#3B5BDB]'
                    : 'border-[#E2E6EE] bg-white text-[#637083] hover:text-[#141B2D]'
                }`}
              >
                {dStr === todayStr ? 'Today' : formatShortDate(dStr)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Symmetrical Top Summary Row: Balance Card (Left) & Day's Mode Split (Right) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-5">
        {/* Hero Cashbook Summary Card */}
        <section className="card-ledger flex flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#637083]">
                {settings.showBilingualTerms
                  ? 'Net Closing Balance (Rokad Baki)'
                  : 'Net Closing Balance'}
              </p>
              <p className="tnum mt-1.5 text-[30px] font-bold leading-[38px] tracking-[-0.02em] text-[#141B2D] sm:text-[34px]">
                {formatINR(summary.closingBalance, { showDecimals: dec })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-[#637083]">Opening Balance</p>
              <p className="tnum mt-0.5 text-sm font-semibold text-[#141B2D]">
                {formatINR(summary.openingBalance, { showDecimals: dec })}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 divide-x divide-[#E2E6EE] border-t border-[#E2E6EE] pt-4">
            <div className="pr-3">
              <p className="text-xs font-semibold text-[#637083]">
                {settings.showBilingualTerms ? 'Total In (Jama)' : 'Total Cash In'}
              </p>
              <p className="tnum mt-1 text-[20px] font-bold leading-7 text-[#0C9B6A]">
                {formatINR(summary.cashIn, { direction: 'in', showDecimals: dec })}
              </p>
            </div>
            <div className="pl-4">
              <p className="text-xs font-semibold text-[#637083]">
                {settings.showBilingualTerms ? 'Total Out (Naam)' : 'Total Cash Out'}
              </p>
              <p className="tnum mt-1 text-[20px] font-bold leading-7 text-[#D6453D]">
                {formatINR(summary.cashOut, { direction: 'out', showDecimals: dec })}
              </p>
            </div>
          </div>
        </section>

        {/* Day's Mode Split Card */}
        <section className="card-ledger flex flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#141B2D]">
              Day&apos;s Mode Split
            </h2>
            <span className="tnum text-xs font-medium text-[#637083]">
              Net {formatINR(summary.netDayFlow, { signed: true, showDecimals: dec })}
            </span>
          </div>

          <div className="mt-3.5 divide-y divide-[#E2E6EE]">
            <div className="flex items-center justify-between py-2.5 first:pt-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F2F4F8] text-[#141B2D]">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#141B2D]">Cash Drawer</p>
                  <p className="tnum text-xs text-[#637083]">
                    In {formatINR(summary.dayCashInOnly)} · Out {formatINR(summary.dayCashOutOnly)}
                  </p>
                </div>
              </div>
              <p className="tnum text-sm font-bold text-[#141B2D]">
                {formatINR(summary.physicalCashInHand, { showDecimals: dec })}
              </p>
            </div>

            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#EEF2FF] text-[#3B5BDB]">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#141B2D]">UPI &amp; Bank QR</p>
                  <p className="tnum text-xs text-[#637083]">
                    In {formatINR(summary.dayUpiInOnly)} · Out {formatINR(summary.dayUpiOutOnly)}
                  </p>
                </div>
              </div>
              <p
                className={`tnum text-sm font-bold ${
                  summary.upiNet >= 0 ? 'text-[#0C9B6A]' : 'text-[#D6453D]'
                }`}
              >
                {formatINR(summary.upiNet, { signed: true, showDecimals: dec })}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#FDEEEC] text-[#D6453D]">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#141B2D]">
                    {settings.showBilingualTerms ? 'Khata Credit (Udhaar)' : 'Credit Sales'}
                  </p>
                  <p className="text-xs text-[#637083]">Recorded to party accounts</p>
                </div>
              </div>
              <p className="tnum text-sm font-bold text-[#141B2D]">
                {formatINR(summary.khataIssued, { showDecimals: dec })}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Shared Search, Mode Filter & Layout Focus Toolbar */}
      <div className="card-ledger flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 focus-within:border-[#3B5BDB]">
          <Search className="mr-2 h-4 w-4 shrink-0 text-[#637083]" />
          <input
            type="text"
            placeholder="Search party, category, note, or bill no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search daybook transactions"
            className="h-[44px] w-full bg-transparent text-sm text-[#141B2D] outline-none placeholder:text-[#94A3B8]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="flex h-8 w-8 items-center justify-center text-[#637083] hover:text-[#141B2D]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
            {modeFilters.map((f) => {
              const active = modeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setModeFilter(f.id)}
                  className={`h-[34px] shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[#3B5BDB] bg-[#EEF2FF] text-[#3B5BDB]'
                      : 'border-[#E2E6EE] bg-white text-[#637083] hover:text-[#141B2D]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center rounded-[10px] bg-[#F2F4F8] p-1 lg:hidden">
            {(
              [
                { id: 'both', label: 'Both' },
                { id: 'in', label: 'In' },
                { id: 'out', label: 'Out' },
              ] as { id: LayoutFocus; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLayoutFocus(opt.id)}
                className={`min-h-[32px] rounded-[8px] px-2.5 text-xs font-semibold transition-colors ${
                  layoutFocus === opt.id
                    ? 'bg-white text-[#141B2D] shadow-sm'
                    : 'text-[#637083]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Separate Layout for Cash In & Cash Out Entries */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
        {/* LEFT COLUMN: CASH IN (AAYA / JAMA) LEDGER */}
        <section
          className={`card-ledger overflow-hidden ${
            layoutFocus === 'out' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#E2E6EE] bg-[#E8F7F1]/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0C9B6A] text-white">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold leading-6 text-[#141B2D]">
                  {settings.showBilingualTerms ? 'Cash In (Aaya / Jama)' : 'Cash In Entries'}
                </h2>
                <p className="tnum text-xs font-medium text-[#637083]">
                  {inTransactions.length}{' '}
                  {inTransactions.length === 1 ? 'entry' : 'entries'} ·{' '}
                  <span className="font-bold text-[#0C9B6A]">
                    {formatINR(filteredInTotal, { direction: 'in', showDecimals: dec })}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenEntrySheet('in')}
              className="flex min-h-[42px] shrink-0 items-center gap-1 rounded-[10px] bg-[#0C9B6A] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#0A875C] whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add In</span>
            </button>
          </div>

          {inTransactions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-[#141B2D]">
                No Cash In entries for {formatDisplayDate(selectedDate)}
              </p>
              <p className="mt-1 text-xs text-[#637083]">
                {searchQuery || modeFilter !== 'all'
                  ? 'No incoming entries match your active search or payment mode.'
                  : 'Use Add In above to log counter sales, UPI receipts, or customer udhaar recoveries.'}
              </p>
            </div>
          ) : (
            <div>{inTransactions.map((tx, idx) => renderLedgerRow(tx, idx))}</div>
          )}
        </section>

        {/* RIGHT COLUMN: CASH OUT (GAYA / NAAM) LEDGER */}
        <section
          className={`card-ledger overflow-hidden ${
            layoutFocus === 'in' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#E2E6EE] bg-[#FDEEEC]/55 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#D6453D] text-white">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold leading-6 text-[#141B2D]">
                  {settings.showBilingualTerms ? 'Cash Out (Gaya / Naam)' : 'Cash Out Entries'}
                </h2>
                <p className="tnum text-xs font-medium text-[#637083]">
                  {outTransactions.length}{' '}
                  {outTransactions.length === 1 ? 'entry' : 'entries'} ·{' '}
                  <span className="font-bold text-[#D6453D]">
                    {formatINR(filteredOutTotal, { direction: 'out', showDecimals: dec })}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenEntrySheet('out')}
              className="flex min-h-[42px] shrink-0 items-center gap-1 rounded-[10px] bg-[#D6453D] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#BE342E] whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Out</span>
            </button>
          </div>

          {outTransactions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-[#141B2D]">
                No Cash Out entries for {formatDisplayDate(selectedDate)}
              </p>
              <p className="mt-1 text-xs text-[#637083]">
                {searchQuery || modeFilter !== 'all'
                  ? 'No outgoing entries match your active search or payment mode.'
                  : 'Use Add Out above to log stock purchases, vendor payouts, credit given, or expenses.'}
              </p>
            </div>
          ) : (
            <div>{outTransactions.map((tx, idx) => renderLedgerRow(tx, idx))}</div>
          )}
        </section>
      </div>

      {/* Interactive Calendar Modal (Future Dates Disabled) */}
      <CalendarPicker
        isOpen={showCalendar}
        selectedDate={selectedDate}
        activeDates={activeDates}
        onSelectDate={onSelectDate}
        onClose={() => setShowCalendar(false)}
      />

      {/* Transaction Inspection / Edit / Delete Modal */}
      {inspectingTx && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#141B2D]/45 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Transaction details"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setInspectingTx(null);
              setConfirmDeleteId(null);
            }
          }}
        >
          <div className="sheet-elevated w-full max-w-[440px] overflow-hidden rounded-t-[22px] sm:rounded-[18px]">
            <div className="flex items-center justify-between border-b border-[#E2E6EE] px-5 py-4">
              <h3 className="text-[17px] font-semibold text-[#141B2D]">
                Entry Voucher
              </h3>
              <button
                type="button"
                onClick={() => {
                  setInspectingTx(null);
                  setConfirmDeleteId(null);
                }}
                aria-label="Close voucher"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#637083] hover:bg-[#F2F4F8] hover:text-[#141B2D]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-[14px] bg-[#F2F4F8]/75 p-4 text-center">
                <p className="text-xs font-semibold text-[#637083]">
                  {inspectingTx.direction === 'in'
                    ? settings.showBilingualTerms
                      ? 'Cash In · Jama'
                      : 'Cash In'
                    : settings.showBilingualTerms
                      ? 'Cash Out · Naam'
                      : 'Cash Out'}
                </p>
                <p
                  className={`tnum mt-1 text-[30px] font-bold leading-9 ${
                    inspectingTx.direction === 'in'
                      ? 'text-[#0C9B6A]'
                      : 'text-[#D6453D]'
                  }`}
                >
                  {formatINR(inspectingTx.amount, {
                    direction: inspectingTx.direction,
                    showDecimals: dec,
                  })}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#141B2D]">
                  {inspectingTx.partyName}
                </p>
              </div>

              <dl className="mt-4 divide-y divide-[#E2E6EE] text-sm">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-[#637083]">Payment Mode</dt>
                  <dd className="font-semibold text-[#141B2D]">
                    {inspectingTx.paymentMode}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-[#637083]">Category</dt>
                  <dd className="font-semibold text-[#141B2D]">
                    {inspectingTx.category}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="flex items-center gap-1.5 text-[#637083]">
                    <Clock className="h-3.5 w-3.5" />
                    Date &amp; Time
                  </dt>
                  <dd className="tnum font-medium text-[#141B2D]">
                    {formatShortDate(inspectingTx.date)} · {formatDisplayTime(inspectingTx.time)}
                  </dd>
                </div>
                {inspectingTx.billNo && (
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-[#637083]">Bill Reference</dt>
                    <dd className="tnum font-semibold text-[#141B2D]">
                      {inspectingTx.billNo}
                    </dd>
                  </div>
                )}
                {inspectingTx.note && (
                  <div className="py-2.5">
                    <dt className="flex items-center gap-1.5 text-[#637083]">
                      <FileText className="h-3.5 w-3.5" />
                      Remark
                    </dt>
                    <dd className="mt-1 text-sm text-[#141B2D]">
                      {inspectingTx.note}
                    </dd>
                  </div>
                )}
              </dl>

              {inspectingTx.partyId && onNavigateToParty && (
                <button
                  type="button"
                  onClick={() => {
                    const pid = inspectingTx.partyId!;
                    setInspectingTx(null);
                    onNavigateToParty(pid);
                  }}
                  className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-[12px] bg-[#EEF2FF] px-4 text-xs font-semibold text-[#3B5BDB] hover:bg-[#E0E7FF]"
                >
                  Open {inspectingTx.partyName} Khata Statement
                </button>
              )}

              {confirmDeleteId === inspectingTx.id ? (
                <div className="mt-4 rounded-[12px] border border-[#D6453D]/30 bg-[#FDEEEC] p-3">
                  <p className="text-xs font-semibold text-[#9C1A19]">
                    Delete this ledger entry permanently?
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="min-h-[44px] flex-1 rounded-[10px] border border-[#E2E6EE] bg-white text-xs font-semibold text-[#141B2D]"
                    >
                      Keep Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteTransaction(inspectingTx);
                        setInspectingTx(null);
                        setConfirmDeleteId(null);
                      }}
                      className="min-h-[44px] flex-1 rounded-[10px] bg-[#D6453D] text-xs font-bold text-white"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(inspectingTx.id)}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#E2E6EE] text-sm font-semibold text-[#D6453D] hover:bg-[#FDEEEC]"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const txToEdit = inspectingTx;
                      setInspectingTx(null);
                      onEditTransaction(txToEdit);
                    }}
                    className="flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] bg-[#3B5BDB] text-sm font-bold text-white hover:bg-[#1A40C2]"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Edit Entry</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
