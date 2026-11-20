/**
 * Strict Indian Currency Formatting Standard:
 * - Prefixed with Rupee symbol (₹) + non-breaking space (\u00A0)
 * - Uses Indian numbering grouping system (en-IN): ₹ 1,25,000 / ₹ 12,45,670.50
 */
export function formatINR(
  amount: number,
  options?: {
    showDecimals?: boolean;
    signed?: boolean;
    direction?: 'in' | 'out';
  }
): string {
  const showDecimals = options?.showDecimals ?? false;
  const absVal = Math.abs(amount);
  const hasFraction = Math.round((absVal % 1) * 100) !== 0;

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: showDecimals || hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(absVal);

  const prefix =
    options?.direction === 'in'
      ? '+ '
      : options?.direction === 'out'
        ? '- '
        : options?.signed
          ? amount > 0
            ? '+ '
            : amount < 0
              ? '- '
              : ''
          : amount < 0
            ? '- '
            : '';

  return `${prefix}₹\u00A0${formatted}`;
}

/**
 * Compact Indian currency formatting for chart axes (e.g. ₹ 45k, ₹ 1.2L)
 */
export function formatINRCompact(amount: number): string {
  const absVal = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (absVal >= 10000000) {
    return `${sign}₹\u00A0${(absVal / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  }
  if (absVal >= 100000) {
    return `${sign}₹\u00A0${(absVal / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  }
  if (absVal >= 1000) {
    return `${sign}₹\u00A0${(absVal / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return `${sign}₹\u00A0${Math.round(absVal)}`;
}

export function getLocalDateString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTime24(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatDisplayTime(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr || '00'} ${period}`;
}

export function formatDisplayDate(dateStr: string): string {
  const today = getLocalDateString(0);
  const yesterday = getLocalDateString(-1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

export function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function getInitials(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'DM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatPhoneIndian(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvBody = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\n');

  // Prepend UTF-8 BOM so Microsoft Excel properly renders ₹ symbol
  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildPaymentReminderText(params: {
  partyName: string;
  shopName: string;
  amountDue: number;
  shopPhone: string;
  bilingual: boolean;
}): string {
  const formattedAmt = formatINR(params.amountDue);
  if (params.bilingual) {
    return `Namaste ${params.partyName} ji,\n\nAapka ${formattedAmt} ka khata balance ${params.shopName} par pending hai. Kripya suvidha anusar UPI ya Cash dwara bhugtan karein.\n\nDhanyavaad,\n${params.shopName} (${params.shopPhone})`;
  }
  return `Dear ${params.partyName},\n\nThis is a gentle reminder that your pending balance of ${formattedAmt} is due at ${params.shopName}. Kindly settle at your earliest convenience via UPI or Cash.\n\nThank you,\n${params.shopName} (${params.shopPhone})`;
}
