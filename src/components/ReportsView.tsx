import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
  Banknote,
  Smartphone,
  BookOpen,
  Wallet,
  X,
} from 'lucide-react';
import { ShopSettings, Transaction } from '../types/ledger';
import {
  downloadCSV,
  formatDisplayDate,
  formatDisplayTime,
  formatINR,
  formatINRCompact,
  formatPhoneIndian,
  formatShortDate,
  getLocalDateString,
} from '../utils/formatters';
import { computeDailySummary } from '../utils/ledgerMath';
import { CalendarPicker } from './CalendarPicker';

interface ReportsViewProps {
  transactions: Transaction[];
  settings: ShopSettings;
  onNotify: (msg: string) => void;
}

type RangeFilter = 'daily' | '7d' | '14d' | '30d' | 'all';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  settings,
  onNotify,
}) => {
  const todayStr = getLocalDateString(0);
  const [range, setRange] = useState<RangeFilter>('daily');
  const [reportDate, setReportDate] = useState<string>(todayStr);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const dec = settings.showPaiseDecimals;

  const activeDates = useMemo(() => {
    const set = new Set<string>();
    for (const tx of transactions) {
      set.add(tx.date);
    }
    return set;
  }, [transactions]);

  const stepReportDate = (deltaDays: number) => {
    const [y, m, d] = reportDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setDate(dt.getDate() + deltaDays);
    const nextStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (nextStr <= todayStr) {
      setReportDate(nextStr);
    }
  };

  const periodLabel = useMemo(() => {
    if (range === 'daily') {
      return `Daily Report · ${formatDisplayDate(reportDate)} (${reportDate})`;
    }
    if (range === '7d') return 'Last 7 Days';
    if (range === '14d') return 'Last 14 Days';
    if (range === '30d') return 'Last 30 Days';
    return 'All Recorded Entries';
  }, [range, reportDate]);

  const dailySummary = useMemo(
    () =>
      computeDailySummary(
        transactions,
        reportDate,
        settings.openingCashBalance
      ),
    [transactions, reportDate, settings.openingCashBalance]
  );

  const filteredTx = useMemo(() => {
    const base =
      range === 'daily'
        ? transactions.filter((tx) => tx.date === reportDate)
        : range === 'all'
          ? transactions
          : transactions.filter((tx) => {
              const days = range === '7d' ? 6 : range === '14d' ? 13 : 29;
              return tx.date >= getLocalDateString(-days);
            });
    return [...base].sort(
      (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)
    );
  }, [transactions, range, reportDate]);

  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let cashVolume = 0;
    let upiVolume = 0;
    let khataVolume = 0;
    let cashCount = 0;
    let upiCount = 0;
    let khataCount = 0;

    for (const tx of filteredTx) {
      if (tx.paymentMode === 'Cash') {
        cashVolume += tx.amount;
        cashCount += 1;
      } else if (tx.paymentMode === 'UPI') {
        upiVolume += tx.amount;
        upiCount += 1;
      } else {
        khataVolume += tx.amount;
        khataCount += 1;
      }

      if (tx.paymentMode !== 'Khata') {
        if (tx.direction === 'in') totalIn += tx.amount;
        else totalOut += tx.amount;
      }
    }

    const totalVolume = cashVolume + upiVolume + khataVolume || 1;
    return {
      totalIn,
      totalOut,
      netSurplus: totalIn - totalOut,
      cashVolume,
      upiVolume,
      khataVolume,
      cashCount,
      upiCount,
      khataCount,
      cashPct: Math.round((cashVolume / totalVolume) * 100),
      upiPct: Math.round((upiVolume / totalVolume) * 100),
      khataPct: Math.round((khataVolume / totalVolume) * 100),
    };
  }, [filteredTx]);

  const dailySeries = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => getLocalDateString(-(6 - i)));
    return days.map((dateStr) => {
      let cashIn = 0;
      let cashOut = 0;
      for (const tx of transactions) {
        if (tx.date === dateStr && tx.paymentMode !== 'Khata') {
          if (tx.direction === 'in') cashIn += tx.amount;
          else cashOut += tx.amount;
        }
      }
      return {
        date: dateStr,
        label: formatShortDate(dateStr),
        cashIn,
        cashOut,
        net: cashIn - cashOut,
      };
    });
  }, [transactions]);

  const maxChartVal = useMemo(() => {
    const peak = Math.max(
      ...dailySeries.map((d) => Math.max(d.cashIn, d.cashOut)),
      10000
    );
    return Math.ceil(peak / 5000) * 5000;
  }, [dailySeries]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { category: string; inAmt: number; outAmt: number; count: number }
    >();
    for (const tx of filteredTx) {
      const existing = map.get(tx.category) ?? {
        category: tx.category,
        inAmt: 0,
        outAmt: 0,
        count: 0,
      };
      if (tx.direction === 'in') existing.inAmt += tx.amount;
      else existing.outAmt += tx.amount;
      existing.count += 1;
      map.set(tx.category, existing);
    }
    return Array.from(map.values()).sort(
      (a, b) => b.inAmt + b.outAmt - (a.inAmt + a.outAmt)
    );
  }, [filteredTx]);

  const activeTooltipDay = useMemo(() => {
    if (!hoveredDay) return dailySeries[dailySeries.length - 1];
    return dailySeries.find((d) => d.date === hoveredDay) ?? dailySeries[dailySeries.length - 1];
  }, [hoveredDay, dailySeries]);

  const buildPrintableReportHTML = () => {
    const generatedOn = new Date().toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const categoryRowsHtml =
      categoryBreakdown.length === 0
        ? `<tr><td colspan="4" style="text-align:center;color:#637083;padding:16px;">No entries in this period.</td></tr>`
        : categoryBreakdown
            .map(
              (r) => `
            <tr>
              <td style="font-weight:600;">${escapeHtml(r.category)}</td>
              <td class="num">${r.count}</td>
              <td class="num in">${r.inAmt > 0 ? escapeHtml(formatINR(r.inAmt, { showDecimals: dec })) : '—'}</td>
              <td class="num out">${r.outAmt > 0 ? escapeHtml(formatINR(r.outAmt, { showDecimals: dec })) : '—'}</td>
            </tr>`
            )
            .join('');

    const txRowsHtml =
      filteredTx.length === 0
        ? `<tr><td colspan="6" style="text-align:center;color:#637083;padding:16px;">No transactions recorded for this range.</td></tr>`
        : filteredTx
            .map(
              (tx) => `
            <tr>
              <td class="num">${escapeHtml(tx.date)} ${escapeHtml(formatDisplayTime(tx.time))}</td>
              <td style="font-weight:600;">${escapeHtml(tx.partyName)}</td>
              <td>${escapeHtml(tx.category)}</td>
              <td>${escapeHtml(tx.paymentMode)}</td>
              <td>${escapeHtml(tx.note || tx.billNo || '—')}</td>
              <td class="num ${tx.direction === 'in' ? 'in' : 'out'}" style="font-weight:700;">
                ${escapeHtml(formatINR(tx.amount, { direction: tx.direction, showDecimals: dec }))}
              </td>
            </tr>`
            )
            .join('');

    const printKpisHtml =
      range === 'daily'
        ? `
  <div class="kpis kpis-4">
    <div class="kpi">
      <div class="kpi-label">Opening Balance</div>
      <div class="kpi-val">${escapeHtml(formatINR(dailySummary.openingBalance, { showDecimals: dec }))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Cash In (Jama)</div>
      <div class="kpi-val in">${escapeHtml(formatINR(dailySummary.cashIn, { direction: 'in', showDecimals: dec }))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Cash Out (Naam)</div>
      <div class="kpi-val out">${escapeHtml(formatINR(dailySummary.cashOut, { direction: 'out', showDecimals: dec }))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Closing Balance (Rokad Baki)</div>
      <div class="kpi-val">${escapeHtml(formatINR(dailySummary.closingBalance, { showDecimals: dec }))}</div>
    </div>
  </div>`
        : `
  <div class="kpis">
    <div class="kpi">
      <div class="kpi-label">Total Cash In (Jama)</div>
      <div class="kpi-val in">${escapeHtml(formatINR(metrics.totalIn, { direction: 'in', showDecimals: dec }))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Cash Out (Naam)</div>
      <div class="kpi-val out">${escapeHtml(formatINR(metrics.totalOut, { direction: 'out', showDecimals: dec }))}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Net Cash Surplus</div>
      <div class="kpi-val">${escapeHtml(formatINR(metrics.netSurplus, { signed: true, showDecimals: dec }))}</div>
    </div>
  </div>`;

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(settings.shopName)} — Rokad Book Statement (${escapeHtml(periodLabel)})</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #141B2D;
      background: #FFFFFF;
      margin: 0;
      padding: 28px;
      font-size: 13px;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #141B2D;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .shop-name { font-size: 22px; font-weight: 700; margin: 0 0 4px 0; }
    .meta { color: #637083; font-size: 12px; margin: 2px 0; }
    .kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .kpis-4 {
      grid-template-columns: repeat(4, 1fr);
    }
    .kpi {
      border: 1px solid #E2E6EE;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .kpi-label { font-size: 11px; font-weight: 600; color: #637083; text-transform: uppercase; letter-spacing: 0.04em; }
    .kpi-val { font-size: 18px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
    .in { color: #0C9B6A; }
    .out { color: #D6453D; }
    h2 { font-size: 15px; font-weight: 700; margin: 20px 0 8px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    th, td { border-bottom: 1px solid #E2E6EE; padding: 8px 10px; text-align: left; }
    th { background: #F2F4F8; font-size: 11px; font-weight: 700; color: #637083; text-transform: uppercase; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #E2E6EE; font-size: 11px; color: #637083; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 12px; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="shop-name">${escapeHtml(settings.shopName)}</h1>
      <p class="meta">${escapeHtml(settings.businessType)} · Prop: ${escapeHtml(settings.proprietorName)}</p>
      <p class="meta">${escapeHtml(formatPhoneIndian(settings.phone))}${settings.gstin ? ` · GSTIN: ${escapeHtml(settings.gstin)}` : ''}</p>
      ${settings.address ? `<p class="meta">${escapeHtml(settings.address)}</p>` : ''}
    </div>
    <div style="text-align:right;">
      <div style="font-weight:700;font-size:15px;">${range === 'daily' ? 'Daily Rojmel Report' : 'Rokad Book Ledger Report'}</div>
      <div class="meta">${escapeHtml(periodLabel)}</div>
      <div class="meta">Generated: ${escapeHtml(generatedOn)}</div>
    </div>
  </div>

  ${printKpisHtml}

  <h2>Category Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th class="num">Entries</th>
        <th class="num">Inflow (Jama)</th>
        <th class="num">Outflow (Naam)</th>
      </tr>
    </thead>
    <tbody>${categoryRowsHtml}</tbody>
  </table>

  <h2>Itemized Ledger Entries (${filteredTx.length})</h2>
  <table>
    <thead>
      <tr>
        <th>Date &amp; Time</th>
        <th>Party</th>
        <th>Category</th>
        <th>Mode</th>
        <th>Note / Bill</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${txRowsHtml}</tbody>
  </table>

  <div class="footer">
    <span>Rokad Book</span>
    <span>Opening Cash Base: ${escapeHtml(formatINR(settings.openingCashBalance, { showDecimals: dec }))}</span>
  </div>
</body>
</html>`;
  };

  const handleTriggerIframePrint = () => {
    const html = buildPrintableReportHTML();
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
          } catch {
            window.print();
          }
          setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          }, 1500);
        }, 120);
        onNotify('Opened print dialog — or use Download Printable Report below');
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const handleDownloadPrintableHTML = () => {
    const html = buildPrintableReportHTML();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      range === 'daily'
        ? `rokad-book-daily-statement-${reportDate}.html`
        : `rokad-book-statement-${range}-${todayStr}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('Downloaded printable report file (.html)');
  };

  const handleExportCSV = () => {
    const rows = filteredTx.map((tx) => [
      tx.date,
      tx.time,
      tx.direction === 'in' ? 'Cash In (Jama)' : 'Cash Out (Naam)',
      tx.paymentMode,
      tx.partyName,
      tx.category,
      tx.billNo || '',
      tx.note || '',
      tx.amount,
    ]);
    downloadCSV(
      range === 'daily'
        ? `rokad-book-daily-report-${reportDate}.csv`
        : `rokad-book-report-${range}-${todayStr}.csv`,
      [
        'Date',
        'Time',
        'Direction',
        'Mode',
        'Party',
        'Category',
        'Bill No',
        'Note',
        'Amount (INR)',
      ],
      rows
    );
    onNotify(`Exported ${rows.length} entries to CSV`);
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Range Chips + Export & Print Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {(
            [
              { id: 'daily', label: 'Daily Report' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '14d', label: 'Last 14 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'all', label: 'All Entries' },
            ] as { id: RangeFilter; label: string }[]
          ).map((chip) => {
            const active = range === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setRange(chip.id)}
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

        <div className="no-print flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrintPreview(true)}
            className="flex min-h-[44px] items-center gap-1.5 rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-xs font-semibold text-[#141B2D] hover:border-[#3B5BDB] hover:text-[#3B5BDB] whitespace-nowrap"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex min-h-[44px] items-center gap-1.5 rounded-[12px] bg-[#3B5BDB] px-4 text-xs font-bold text-white hover:bg-[#1A40C2] whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Daily Report Date Selector Strip */}
      {range === 'daily' && (
        <div className="card-ledger flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => stepReportDate(-1)}
              aria-label="Previous day report"
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#E2E6EE] bg-white text-[#141B2D] transition-colors hover:border-[#3B5BDB] hover:text-[#3B5BDB]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowCalendar(true)}
              aria-label="Select daily report date"
              className="flex min-h-[40px] items-center gap-2 rounded-[10px] border border-[#E2E6EE] bg-white px-3.5 text-sm font-semibold text-[#141B2D] transition-colors hover:border-[#3B5BDB] hover:text-[#3B5BDB]"
            >
              <Calendar className="h-4 w-4 text-[#3B5BDB]" />
              <span className="tnum whitespace-nowrap">
                {formatDisplayDate(reportDate)}
              </span>
              <span className="tnum hidden text-xs font-medium text-[#637083] sm:inline">
                · {reportDate}
              </span>
            </button>

            <button
              type="button"
              onClick={() => stepReportDate(1)}
              disabled={reportDate >= todayStr}
              aria-label="Next day report"
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#E2E6EE] bg-white text-[#141B2D] transition-colors hover:border-[#3B5BDB] hover:text-[#3B5BDB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {reportDate !== todayStr && (
              <button
                type="button"
                onClick={() => setReportDate(todayStr)}
                className="ml-1 min-h-[36px] rounded-full border border-[#3B5BDB]/30 bg-[#EEF2FF] px-3 text-xs font-semibold text-[#3B5BDB] transition-colors hover:bg-[#E0E7FF]"
              >
                Today
              </button>
            )}
          </div>

          <p className="tnum text-xs font-medium text-[#637083]">
            {filteredTx.length} {filteredTx.length === 1 ? 'entry' : 'entries'} · Day Net{' '}
            <span
              className={`font-bold ${
                dailySummary.netDayFlow >= 0 ? 'text-[#0C9B6A]' : 'text-[#D6453D]'
              }`}
            >
              {formatINR(dailySummary.netDayFlow, { signed: true, showDecimals: dec })}
            </span>
          </p>
        </div>
      )}

      {/* Period Summary KPIs */}
      {range === 'daily' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-ledger p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#637083]">
                Opening Balance
              </p>
              <Wallet className="h-4 w-4 text-[#637083]" />
            </div>
            <p className="tnum mt-2 text-[22px] font-bold leading-[28px] text-[#141B2D]">
              {formatINR(dailySummary.openingBalance, { showDecimals: dec })}
            </p>
            <p className="mt-1 text-xs text-[#637083]">
              Carried forward before {formatShortDate(reportDate)}
            </p>
          </div>

          <div className="card-ledger p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#637083]">
                {settings.showBilingualTerms ? 'Total Cash In (Jama)' : 'Day Inflow'}
              </p>
              <TrendingUp className="h-4 w-4 text-[#0C9B6A]" />
            </div>
            <p className="tnum mt-2 text-[22px] font-bold leading-[28px] text-[#0C9B6A]">
              {formatINR(dailySummary.cashIn, { direction: 'in', showDecimals: dec })}
            </p>
            <p className="tnum mt-1 text-xs text-[#637083]">
              Cash {formatINR(dailySummary.dayCashInOnly)} · UPI {formatINR(dailySummary.dayUpiInOnly)}
            </p>
          </div>

          <div className="card-ledger p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#637083]">
                {settings.showBilingualTerms ? 'Total Cash Out (Naam)' : 'Day Outflow'}
              </p>
              <TrendingDown className="h-4 w-4 text-[#D6453D]" />
            </div>
            <p className="tnum mt-2 text-[22px] font-bold leading-[28px] text-[#D6453D]">
              {formatINR(dailySummary.cashOut, { direction: 'out', showDecimals: dec })}
            </p>
            <p className="tnum mt-1 text-xs text-[#637083]">
              Cash {formatINR(dailySummary.dayCashOutOnly)} · UPI {formatINR(dailySummary.dayUpiOutOnly)}
            </p>
          </div>

          <div className="card-ledger p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#637083]">
                {settings.showBilingualTerms ? 'Closing Balance (Rokad Baki)' : 'Closing Balance'}
              </p>
              <Banknote className="h-4 w-4 text-[#3B5BDB]" />
            </div>
            <p
              className={`tnum mt-2 text-[22px] font-bold leading-[28px] ${
                dailySummary.closingBalance >= 0 ? 'text-[#141B2D]' : 'text-[#D6453D]'
              }`}
            >
              {formatINR(dailySummary.closingBalance, { showDecimals: dec })}
            </p>
            <p className="tnum mt-1 text-xs text-[#637083]">
              Net flow {formatINR(dailySummary.netDayFlow, { signed: true, showDecimals: dec })}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card-ledger p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#637083]">
                {settings.showBilingualTerms ? 'Total Cash In (Jama)' : 'Total Inflow'}
              </p>
              <TrendingUp className="h-4 w-4 text-[#0C9B6A]" />
            </div>
            <p className="tnum mt-2 text-[24px] font-bold leading-[30px] text-[#0C9B6A]">
              {formatINR(metrics.totalIn, { direction: 'in', showDecimals: dec })}
            </p>
            <p className="tnum mt-1 text-xs text-[#637083]">
              Cash + UPI inflows received
            </p>
          </div>

          <div className="card-ledger p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#637083]">
                {settings.showBilingualTerms ? 'Total Cash Out (Naam)' : 'Total Outflow'}
              </p>
              <TrendingDown className="h-4 w-4 text-[#D6453D]" />
            </div>
            <p className="tnum mt-2 text-[24px] font-bold leading-[30px] text-[#D6453D]">
              {formatINR(metrics.totalOut, { direction: 'out', showDecimals: dec })}
            </p>
            <p className="tnum mt-1 text-xs text-[#637083]">
              Stock, payouts &amp; shop expenses
            </p>
          </div>

          <div className="card-ledger p-5">
            <p className="text-xs font-semibold text-[#637083]">
              {settings.showBilingualTerms ? 'Net Cash Surplus (Bachat)' : 'Net Cash Surplus'}
            </p>
            <p
              className={`tnum mt-2 text-[24px] font-bold leading-[30px] ${
                metrics.netSurplus >= 0 ? 'text-[#141B2D]' : 'text-[#D6453D]'
              }`}
            >
              {formatINR(metrics.netSurplus, { signed: true, showDecimals: dec })}
            </p>
            <p className="tnum mt-1 text-xs text-[#637083]">
              Across {filteredTx.length} recorded entries
            </p>
          </div>
        </div>
      )}

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        {range === 'daily' ? (
          /* Daily Itemized Rojmel Register */
          <section className="card-ledger overflow-hidden lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E6EE] p-5">
              <div>
                <h2 className="text-[18px] font-semibold text-[#141B2D]">
                  {settings.showBilingualTerms
                    ? 'Daily Rojmel Register'
                    : 'Daily Itemized Register'}
                </h2>
                <p className="mt-0.5 text-xs text-[#637083]">
                  All inflows and outflows recorded on {formatDisplayDate(reportDate)}
                </p>
              </div>
              <span className="tnum rounded-full bg-[#F2F4F8] px-3 py-1 text-xs font-semibold text-[#141B2D]">
                {filteredTx.length} {filteredTx.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E6EE] bg-[#F2F4F8]/60 font-semibold text-[#637083]">
                    <th className="px-4 py-3">Time</th>
                    <th className="px-3 py-3">Party &amp; Note</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Mode</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6EE]">
                  {filteredTx.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-[#637083]">
                        No entries recorded for {formatDisplayDate(reportDate)}.
                      </td>
                    </tr>
                  ) : (
                    filteredTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#F2F4F8]/40">
                        <td className="tnum whitespace-nowrap px-4 py-3 text-[#637083]">
                          {formatDisplayTime(tx.time)}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-[#141B2D]">{tx.partyName}</p>
                          {(tx.note || tx.billNo) && (
                            <p className="mt-0.5 text-[11px] text-[#637083]">
                              {[tx.billNo, tx.note].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-[#637083]">{tx.category}</td>
                        <td className="px-3 py-3 font-semibold text-[#141B2D]">
                          {tx.paymentMode}
                        </td>
                        <td
                          className={`tnum whitespace-nowrap px-4 py-3 text-right font-bold ${
                            tx.direction === 'in' ? 'text-[#0C9B6A]' : 'text-[#D6453D]'
                          }`}
                        >
                          {formatINR(tx.amount, {
                            direction: tx.direction,
                            showDecimals: dec,
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          /* 7-Day Cash In vs Cash Out Chart */
          <section className="card-ledger p-5 lg:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold text-[#141B2D]">
                  7-Day Cashflow Comparison
                </h2>
                <p className="mt-0.5 text-xs text-[#637083]">
                  Tap or hover any day to inspect inflows and outflows
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-[#637083]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#0C9B6A]" />
                  Cash In
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#D6453D]" />
                  Cash Out
                </span>
              </div>
            </div>

            {activeTooltipDay && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-[#F2F4F8]/80 px-3.5 py-2.5 text-xs">
                <span className="font-semibold text-[#141B2D]">
                  {activeTooltipDay.label}
                </span>
                <div className="tnum flex flex-wrap items-center gap-3 font-semibold">
                  <span className="text-[#0C9B6A]">
                    In: {formatINR(activeTooltipDay.cashIn)}
                  </span>
                  <span className="text-[#D6453D]">
                    Out: {formatINR(activeTooltipDay.cashOut)}
                  </span>
                  <span className="text-[#141B2D]">
                    Net: {formatINR(activeTooltipDay.net, { signed: true })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReportDate(activeTooltipDay.date);
                      setRange('daily');
                    }}
                    className="font-bold text-[#3B5BDB] hover:underline"
                  >
                    Open Daily Report →
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 w-full overflow-x-auto">
              <svg
                viewBox="0 0 560 220"
                className="h-auto w-full min-w-[340px]"
                role="img"
                aria-label="7-day cash inflow and outflow bar chart"
              >
                {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                  const y = 180 - step * 150;
                  const val = maxChartVal * step;
                  return (
                    <g key={step}>
                      <line
                        x1="58"
                        y1={y}
                        x2="548"
                        y2={y}
                        stroke="#E2E6EE"
                        strokeWidth="1"
                        strokeDasharray={step === 0 ? undefined : '3 3'}
                      />
                      <text
                        x="50"
                        y={y + 4}
                        textAnchor="end"
                        fill="#637083"
                        fontSize="10"
                        fontWeight="500"
                        className="tnum"
                      >
                        {formatINRCompact(val)}
                      </text>
                    </g>
                  );
                })}

                {dailySeries.map((day, idx) => {
                  const groupWidth = (548 - 64) / 7;
                  const centerX = 64 + groupWidth * idx + groupWidth / 2;
                  const barW = 16;
                  const inH = Math.max(2, (day.cashIn / maxChartVal) * 150);
                  const outH = Math.max(2, (day.cashOut / maxChartVal) * 150);
                  const isSelected = activeTooltipDay?.date === day.date;

                  return (
                    <g
                      key={day.date}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredDay(day.date)}
                      onClick={() => setHoveredDay(day.date)}
                    >
                      {isSelected && (
                        <rect
                          x={centerX - 24}
                          y={22}
                          width={48}
                          height={162}
                          rx="8"
                          fill="#EEF2FF"
                          opacity="0.7"
                        />
                      )}
                      <rect
                        x={centerX - barW - 2}
                        y={180 - inH}
                        width={barW}
                        height={inH}
                        rx="4"
                        fill="#0C9B6A"
                      />
                      <rect
                        x={centerX + 2}
                        y={180 - outH}
                        width={barW}
                        height={outH}
                        rx="4"
                        fill="#D6453D"
                      />
                      <text
                        x={centerX}
                        y="202"
                        textAnchor="middle"
                        fill={isSelected ? '#3B5BDB' : '#637083'}
                        fontSize="11"
                        fontWeight={isSelected ? '700' : '500'}
                      >
                        {day.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>
        )}

        {/* Payment Mode Distribution */}
        <section className="card-ledger p-5 lg:col-span-5">
          <h2 className="text-[18px] font-semibold text-[#141B2D]">
            Payment Mode Mix
          </h2>
          <p className="mt-0.5 text-xs text-[#637083]">
            Total mercantile turnover by settlement channel
          </p>

          <div className="mt-5 space-y-5">
            {[
              {
                label: 'Cash Drawer (Galla)',
                amount: metrics.cashVolume,
                count: metrics.cashCount,
                pct: metrics.cashPct,
                barColor: 'bg-[#0C9B6A]',
                icon: Banknote,
              },
              {
                label: 'UPI / QR Digital',
                amount: metrics.upiVolume,
                count: metrics.upiCount,
                pct: metrics.upiPct,
                barColor: 'bg-[#3B5BDB]',
                icon: Smartphone,
              },
              {
                label: 'Khata Credit (Udhaar)',
                amount: metrics.khataVolume,
                count: metrics.khataCount,
                pct: metrics.khataPct,
                barColor: 'bg-[#D6453D]',
                icon: BookOpen,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-semibold text-[#141B2D]">
                      <Icon className="h-4 w-4 text-[#637083]" />
                      <span>{item.label}</span>
                    </div>
                    <span className="tnum font-bold text-[#141B2D]">
                      {formatINR(item.amount, { showDecimals: dec })}
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#F2F4F8]">
                    <div
                      className={`h-full rounded-full ${item.barColor}`}
                      style={{ width: `${Math.max(item.pct, item.amount > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <div className="tnum mt-1 flex items-center justify-between text-xs text-[#637083]">
                    <span>{item.count} transactions</span>
                    <span>{item.pct}% of volume</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Category Breakdown Ledger Table */}
      <section className="card-ledger overflow-hidden">
        <div className="border-b border-[#E2E6EE] p-5">
          <h2 className="text-[18px] font-semibold text-[#141B2D]">
            Category Ledger Summary
          </h2>
          <p className="mt-0.5 text-xs text-[#637083]">
            Consolidated inflows and outflows grouped by mercantile head
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#E2E6EE] bg-[#F2F4F8]/60 text-xs font-semibold text-[#637083]">
                <th className="px-5 py-3">Category</th>
                <th className="px-4 py-3 text-right">Entries</th>
                <th className="px-4 py-3 text-right">Inflow (Jama)</th>
                <th className="px-5 py-3 text-right">Outflow (Naam)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6EE]">
              {categoryBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-[#637083]">
                    No entries recorded in this period yet. Record your first Cash In or Cash Out entry on the Today screen.
                  </td>
                </tr>
              ) : (
                categoryBreakdown.map((row) => (
                  <tr key={row.category} className="hover:bg-[#F2F4F8]/40">
                    <td className="px-5 py-3.5 font-semibold text-[#141B2D]">
                      {row.category}
                    </td>
                    <td className="tnum px-4 py-3.5 text-right text-[#637083]">
                      {row.count}
                    </td>
                    <td className="tnum px-4 py-3.5 text-right font-semibold text-[#0C9B6A]">
                      {row.inAmt > 0 ? formatINR(row.inAmt, { showDecimals: dec }) : '—'}
                    </td>
                    <td className="tnum px-5 py-3.5 text-right font-semibold text-[#D6453D]">
                      {row.outAmt > 0 ? formatINR(row.outAmt, { showDecimals: dec }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dedicated Print Report Preview Modal (iframe-safe print + printable HTML download) */}
      {showPrintPreview && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-[#141B2D]/50 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Print Rokad Book Report Preview"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrintPreview(false);
          }}
        >
          <div className="sheet-elevated flex max-h-[92dvh] w-full max-w-[780px] flex-col overflow-hidden rounded-t-[22px] sm:rounded-[18px]">
            <div className="flex items-center justify-between border-b border-[#E2E6EE] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Printer className="h-5 w-5 text-[#3B5BDB]" />
                <div>
                  <h3 className="text-[17px] font-semibold text-[#141B2D]">
                    Print Statement Preview
                  </h3>
                  <p className="text-xs text-[#637083]">
                    {periodLabel} · {filteredTx.length} entries
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintPreview(false)}
                aria-label="Close print preview"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#637083] hover:bg-[#F2F4F8] hover:text-[#141B2D]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Paper Statement Preview */}
            <div className="flex-1 overflow-y-auto bg-[#F2F4F8] p-4 sm:p-6">
              <div className="mx-auto max-w-[680px] rounded-[12px] border border-[#E2E6EE] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#141B2D] pb-4">
                  <div>
                    <h4 className="text-xl font-bold text-[#141B2D]">
                      {settings.shopName}
                    </h4>
                    <p className="mt-0.5 text-xs text-[#637083]">
                      {settings.businessType} · Prop: {settings.proprietorName}
                    </p>
                    <p className="tnum mt-0.5 text-xs text-[#637083]">
                      {formatPhoneIndian(settings.phone)}
                      {settings.gstin ? ` · GSTIN ${settings.gstin}` : ''}
                    </p>
                    {settings.address && (
                      <p className="mt-0.5 text-xs text-[#637083]">{settings.address}</p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-[#141B2D]">
                      {range === 'daily' ? 'Daily Rojmel Statement' : 'Rokad Book Statement'}
                    </p>
                    <p className="text-xs text-[#637083]">{periodLabel}</p>
                    <p className="tnum text-xs text-[#637083]">
                      Generated: {todayStr}
                    </p>
                  </div>
                </div>

                {/* Statement KPIs */}
                {range === 'daily' ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-[10px] border border-[#E2E6EE] p-3">
                      <p className="text-[11px] font-semibold text-[#637083]">Opening</p>
                      <p className="tnum mt-1 text-base font-bold text-[#141B2D]">
                        {formatINR(dailySummary.openingBalance, { showDecimals: dec })}
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-[#E2E6EE] p-3">
                      <p className="text-[11px] font-semibold text-[#637083]">Cash In</p>
                      <p className="tnum mt-1 text-base font-bold text-[#0C9B6A]">
                        {formatINR(dailySummary.cashIn, { direction: 'in', showDecimals: dec })}
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-[#E2E6EE] p-3">
                      <p className="text-[11px] font-semibold text-[#637083]">Cash Out</p>
                      <p className="tnum mt-1 text-base font-bold text-[#D6453D]">
                        {formatINR(dailySummary.cashOut, { direction: 'out', showDecimals: dec })}
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-[#E2E6EE] p-3">
                      <p className="text-[11px] font-semibold text-[#637083]">Closing</p>
                      <p className="tnum mt-1 text-base font-bold text-[#141B2D]">
                        {formatINR(dailySummary.closingBalance, { showDecimals: dec })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-[10px] border border-[#E2E6EE] p-3">
                      <p className="text-[11px] font-semibold text-[#637083]">Total Cash In</p>
                      <p className="tnum mt-1 text-lg font-bold text-[#0C9B6A]">
                        {formatINR(metrics.totalIn, { direction: 'in', showDecimals: dec })}
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-[#E2E6EE] p-3">
                      <p className="text-[11px] font-semibold text-[#637083]">Total Cash Out</p>
                      <p className="tnum mt-1 text-lg font-bold text-[#D6453D]">
                        {formatINR(metrics.totalOut, { direction: 'out', showDecimals: dec })}
                      </p>
                    </div>
                    <div className="rounded-[10px] border border-[#E2E6EE] p-3">
                      <p className="text-[11px] font-semibold text-[#637083]">Net Surplus</p>
                      <p className="tnum mt-1 text-lg font-bold text-[#141B2D]">
                        {formatINR(metrics.netSurplus, { signed: true, showDecimals: dec })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Itemized Table Preview */}
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E6EE] bg-[#F2F4F8] font-semibold text-[#637083]">
                        <th className="px-2.5 py-2">Date</th>
                        <th className="px-2.5 py-2">Party</th>
                        <th className="px-2.5 py-2">Category</th>
                        <th className="px-2.5 py-2">Mode</th>
                        <th className="px-2.5 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E6EE]">
                      {filteredTx.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-[#637083]">
                            No transactions in this period.
                          </td>
                        </tr>
                      ) : (
                        filteredTx.map((tx) => (
                          <tr key={tx.id}>
                            <td className="tnum whitespace-nowrap px-2.5 py-2 text-[#637083]">
                              {formatShortDate(tx.date)}
                            </td>
                            <td className="px-2.5 py-2 font-semibold text-[#141B2D]">
                              {tx.partyName}
                            </td>
                            <td className="px-2.5 py-2 text-[#637083]">{tx.category}</td>
                            <td className="px-2.5 py-2 font-medium text-[#141B2D]">
                              {tx.paymentMode}
                            </td>
                            <td
                              className={`tnum whitespace-nowrap px-2.5 py-2 text-right font-bold ${
                                tx.direction === 'in'
                                  ? 'text-[#0C9B6A]'
                                  : 'text-[#D6453D]'
                              }`}
                            >
                              {formatINR(tx.amount, {
                                direction: tx.direction,
                                showDecimals: dec,
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Print Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#E2E6EE] bg-white px-5 py-3.5">
              <button
                type="button"
                onClick={handleDownloadPrintableHTML}
                className="flex min-h-[46px] items-center gap-1.5 rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-4 text-xs font-semibold text-[#141B2D] hover:border-[#3B5BDB] hover:text-[#3B5BDB] whitespace-nowrap"
              >
                <FileText className="h-4 w-4" />
                <span>Download Printable File</span>
              </button>
              <button
                type="button"
                onClick={handleTriggerIframePrint}
                className="flex min-h-[46px] items-center gap-1.5 rounded-[12px] bg-[#3B5BDB] px-5 text-xs font-bold text-white hover:bg-[#1A40C2] whitespace-nowrap"
              >
                <Printer className="h-4 w-4" />
                <span>Print Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Picker for Daily Report Date Selection (Future Dates Disabled) */}
      <CalendarPicker
        isOpen={showCalendar}
        selectedDate={reportDate}
        activeDates={activeDates}
        onSelectDate={(d) => setReportDate(d)}
        onClose={() => setShowCalendar(false)}
      />
    </div>
  );
};
