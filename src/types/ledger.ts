export type TabId = 'today' | 'udhaar' | 'reports' | 'settings';

export type TransactionDirection = 'in' | 'out';

export type PaymentMode = 'Cash' | 'UPI' | 'Khata';

export type BusinessCategory =
  | 'Kirana & Provision'
  | 'Jewellery & Bullion'
  | 'Sweets & Dairy'
  | 'Textiles & Garments'
  | 'Hardware & Paints';

export const DEFAULT_IN_CATEGORIES = [
  'Counter Sale',
  'Udhaar Recovery',
  'Wholesale Stock',
  'Other Income',
] as const;

export const DEFAULT_OUT_CATEGORIES = [
  'Wholesale Stock',
  'Vendor Payout',
  'Udhaar Given',
  'Shop Expense',
  'Staff & Utility',
] as const;

export const ALL_DEFAULT_CATEGORIES: string[] = Array.from(
  new Set([...DEFAULT_IN_CATEGORIES, ...DEFAULT_OUT_CATEGORIES])
);

export type EntryCategory = string;

export interface Transaction {
  id: string;
  direction: TransactionDirection;
  amount: number;
  paymentMode: PaymentMode;
  partyId?: string;
  partyName: string;
  category: EntryCategory;
  note: string;
  billNo?: string;
  /** YYYY-MM-DD in local shop date */
  date: string;
  /** HH:mm (24h) for chronological sorting */
  time: string;
  createdAt: number;
}

export type PartyRole = 'customer' | 'supplier';

export interface Party {
  id: string;
  name: string;
  phone: string;
  role: PartyRole;
  address?: string;
  /**
   * Opening balance prior to recorded transactions:
   * Positive (+) = Party owes shop (Lena Hai / Receivable)
   * Negative (-) = Shop owes party (Dena Hai / Payable)
   */
  openingBalance: number;
  lastReminderAt?: string;
  createdAt: number;
}

export interface ShopSettings {
  shopName: string;
  proprietorName: string;
  businessType: BusinessCategory;
  phone: string;
  gstin: string;
  address: string;
  openingCashBalance: number;
  customCategories: string[];
  showBilingualTerms: boolean;
  showNumericKeypad: boolean;
  showPaiseDecimals: boolean;
}

export interface CashDenominations {
  500: number;
  200: number;
  100: number;
  50: number;
  20: number;
  10: number;
}
