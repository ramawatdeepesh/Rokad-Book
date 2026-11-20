import React, { useState } from 'react';
import { Check, LogOut, Store } from 'lucide-react';
import { BusinessCategory, ShopSettings } from '../types/ledger';
import { formatINR } from '../utils/formatters';

interface ProfileSetupModalProps {
  userEmail: string;
  userDisplayName: string;
  onComplete: (profile: ShopSettings) => Promise<void>;
  onSignOut: () => void;
}

const BUSINESS_TYPES: BusinessCategory[] = [
  'Kirana & Provision',
  'Jewellery & Bullion',
  'Sweets & Dairy',
  'Textiles & Garments',
  'Hardware & Paints',
];

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  userEmail,
  userDisplayName,
  onComplete,
  onSignOut,
}) => {
  const [shopName, setShopName] = useState('');
  const [proprietorName, setProprietorName] = useState(userDisplayName.slice(0, 100));
  const [businessType, setBusinessType] = useState<BusinessCategory>('Kirana & Provision');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [openingCashStr, setOpeningCashStr] = useState('0');
  const [showBilingualTerms, setShowBilingualTerms] = useState(true);
  const [showNumericKeypad, setShowNumericKeypad] = useState(true);
  const [showPaiseDecimals, setShowPaiseDecimals] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanShop = shopName.trim().slice(0, 120);
    const cleanProp = proprietorName.trim().slice(0, 100);
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
    const cleanGstin = gstin.trim().toUpperCase().slice(0, 20);
    const cleanAddress = address.trim().slice(0, 240);
    const openingCash = Math.max(
      0,
      Math.min(1000000000, Math.round((Number(openingCashStr) || 0) * 100) / 100)
    );

    if (cleanShop.length < 1) {
      setErrorMsg('Please enter your Shop or Firm Name.');
      return;
    }
    if (cleanProp.length < 1) {
      setErrorMsg('Please enter the Proprietor Name.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setErrorMsg('Contact number must be exactly 10 digits.');
      return;
    }

    setSubmitting(true);
    try {
      await onComplete({
        shopName: cleanShop,
        proprietorName: cleanProp,
        businessType,
        phone: cleanPhone,
        gstin: cleanGstin,
        address: cleanAddress,
        openingCashBalance: openingCash,
        customCategories: [],
        showBilingualTerms,
        showNumericKeypad,
        showPaiseDecimals,
      });
    } catch {
      setErrorMsg('Could not save your profile right now. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#141B2D]/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Set up your shop profile"
    >
      <div className="sheet-elevated flex max-h-[94dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[22px] sm:rounded-[18px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#E2E6EE] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#EEF2FF] text-[#3B5BDB]">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[19px] font-bold leading-6 text-[#141B2D]">
                Set Up Your Shop Profile
              </h2>
              <p className="mt-0.5 text-xs text-[#637083]">
                Signed in as <span className="font-semibold text-[#141B2D]">{userEmail}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="flex min-h-[40px] items-center gap-1.5 rounded-[10px] border border-[#E2E6EE] px-3 text-xs font-semibold text-[#637083] hover:text-[#141B2D]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="space-y-4 p-5 sm:p-6">
            <p className="text-sm leading-5 text-[#637083]">
              Enter your store details and current cash-in-hand to initialize your clean, private Daybook ledger.
            </p>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-[12px] border border-[#D6453D]/30 bg-[#FDEEEC] px-4 py-3 text-xs font-semibold text-[#9C1A19]"
              >
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="setup-shop-name"
                  className="mb-1.5 block text-xs font-semibold text-[#637083]"
                >
                  Shop / Firm Name *
                </label>
                <input
                  id="setup-shop-name"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g., Shree Balaji Kirana & Provision"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-sm font-semibold text-[#141B2D] outline-none placeholder:font-normal placeholder:text-[#94A3B8] focus:border-[#3B5BDB]"
                />
              </div>

              <div>
                <label
                  htmlFor="setup-proprietor"
                  className="mb-1.5 block text-xs font-semibold text-[#637083]"
                >
                  Proprietor Name *
                </label>
                <input
                  id="setup-proprietor"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Your full name"
                  value={proprietorName}
                  onChange={(e) => setProprietorName(e.target.value)}
                  className="h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-sm font-medium text-[#141B2D] outline-none placeholder:text-[#94A3B8] focus:border-[#3B5BDB]"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="setup-phone"
                    className="block text-xs font-semibold text-[#637083]"
                  >
                    Business Phone (10 digits) *
                  </label>
                  <span
                    className={`tnum text-[11px] font-semibold ${
                      phone.length === 10 ? 'text-[#0C9B6A]' : 'text-[#637083]'
                    }`}
                  >
                    {phone.length}/10
                  </span>
                </div>
                <div className="flex items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 focus-within:border-[#3B5BDB]">
                  <span className="tnum mr-2 select-none text-sm font-semibold text-[#637083]">
                    +91
                  </span>
                  <input
                    id="setup-phone"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    required
                    maxLength={10}
                    placeholder="9820451782"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    className="tnum h-[46px] w-full bg-transparent text-sm font-medium text-[#141B2D] outline-none placeholder:text-[#94A3B8]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="setup-trade"
                  className="mb-1.5 block text-xs font-semibold text-[#637083]"
                >
                  Trade Category
                </label>
                <select
                  id="setup-trade"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as BusinessCategory)}
                  className="h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-sm font-medium text-[#141B2D] outline-none focus:border-[#3B5BDB]"
                >
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="setup-gstin"
                  className="mb-1.5 block text-xs font-semibold text-[#637083]"
                >
                  GSTIN (Optional)
                </label>
                <input
                  id="setup-gstin"
                  type="text"
                  maxLength={20}
                  placeholder="e.g., 27AABCM4921K1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="tnum h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-sm font-medium text-[#141B2D] outline-none placeholder:text-[#94A3B8] focus:border-[#3B5BDB]"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="setup-address"
                  className="mb-1.5 block text-xs font-semibold text-[#637083]"
                >
                  Shop Address (Optional)
                </label>
                <input
                  id="setup-address"
                  type="text"
                  maxLength={240}
                  placeholder="Shop No., Market Road, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-sm text-[#141B2D] outline-none placeholder:text-[#94A3B8] focus:border-[#3B5BDB]"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="setup-opening-cash"
                  className="mb-1.5 block text-xs font-semibold text-[#637083]"
                >
                  Opening Cash in Drawer / Galla (₹)
                </label>
                <div className="flex items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 focus-within:border-[#3B5BDB]">
                  <span className="mr-2 text-lg font-bold text-[#637083]">₹</span>
                  <input
                    id="setup-opening-cash"
                    type="number"
                    min="0"
                    max="1000000000"
                    step="any"
                    value={openingCashStr}
                    onChange={(e) => setOpeningCashStr(e.target.value)}
                    className="tnum h-[48px] w-full bg-transparent text-lg font-bold text-[#141B2D] outline-none"
                  />
                </div>
                <p className="tnum mt-1 text-xs text-[#637083]">
                  Starting balance: {formatINR(Math.max(0, Number(openingCashStr) || 0))} (can be updated anytime in Settings)
                </p>
              </div>
            </div>

            {/* Compact Preferences */}
            <div className="divide-y divide-[#E2E6EE] rounded-[14px] border border-[#E2E6EE] bg-[#F2F4F8]/55 px-4">
              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs font-semibold text-[#141B2D]">
                    Hindi Mercantile Cues
                  </p>
                  <p className="text-[11px] text-[#637083]">
                    Show Aaya/Gaya, Jama/Naam &amp; Lena/Dena labels
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showBilingualTerms}
                  onClick={() => setShowBilingualTerms((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    showBilingualTerms ? 'bg-[#3B5BDB]' : 'bg-[#CBD5E1]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      showBilingualTerms ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs font-semibold text-[#141B2D]">
                    Tactile Numeric Keypad
                  </p>
                  <p className="text-[11px] text-[#637083]">
                    Show built-in thumb keypad when recording entries
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showNumericKeypad}
                  onClick={() => setShowNumericKeypad((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    showNumericKeypad ? 'bg-[#3B5BDB]' : 'bg-[#CBD5E1]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      showNumericKeypad ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-xs font-semibold text-[#141B2D]">
                    Always Show Paise (.00)
                  </p>
                  <p className="text-[11px] text-[#637083]">
                    Display decimal paise on every ledger amount
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showPaiseDecimals}
                  onClick={() => setShowPaiseDecimals((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    showPaiseDecimals ? 'bg-[#3B5BDB]' : 'bg-[#CBD5E1]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      showPaiseDecimals ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 border-t border-[#E2E6EE] bg-white px-5 py-4 sm:px-6">
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#3B5BDB] px-5 text-sm font-bold text-white transition-all hover:bg-[#1A40C2] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Check className="h-4 w-4" />
              <span>{submitting ? 'Creating Your Ledger...' : 'Complete Setup & Open Daybook'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
