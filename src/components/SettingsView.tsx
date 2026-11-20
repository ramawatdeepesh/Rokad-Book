import React, { useEffect, useState } from 'react';
import {
  Check,
  Download,
  LogOut,
  Plus,
  Store,
  Sliders,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import {
  ALL_DEFAULT_CATEGORIES,
  BusinessCategory,
  ShopSettings,
} from '../types/ledger';
import { formatINR } from '../utils/formatters';

interface SettingsViewProps {
  settings: ShopSettings;
  userEmail: string;
  transactionCount: number;
  partyCount: number;
  onUpdateSettings: (next: ShopSettings) => Promise<void> | void;
  onExportBackupJSON: () => void;
  onSignOut: () => void;
  onNotify: (msg: string) => void;
}

const BUSINESS_TYPES: BusinessCategory[] = [
  'Kirana & Provision',
  'Jewellery & Bullion',
  'Sweets & Dairy',
  'Textiles & Garments',
  'Hardware & Paints',
];

const MAX_CUSTOM_CATEGORIES = 25;

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  userEmail,
  transactionCount,
  partyCount,
  onUpdateSettings,
  onExportBackupJSON,
  onSignOut,
  onNotify,
}) => {
  const [draft, setDraft] = useState<ShopSettings>({
    ...settings,
    phone: settings.phone.replace(/\D/g, '').slice(0, 10),
  });
  const [openingInput, setOpeningInput] = useState(String(settings.openingCashBalance));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraft({
      ...settings,
      phone: settings.phone.replace(/\D/g, '').slice(0, 10),
    });
    setOpeningInput(String(settings.openingCashBalance));
  }, [settings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanShop = draft.shopName.trim().slice(0, 120);
    const cleanProp = draft.proprietorName.trim().slice(0, 100);
    const cleanPhone = draft.phone.replace(/\D/g, '').slice(0, 10);
    const cleanGstin = draft.gstin.trim().toUpperCase().slice(0, 20);
    const cleanAddress = draft.address.trim().slice(0, 240);
    const nextOpening = Math.max(
      0,
      Math.min(1000000000, Math.round((Number(openingInput) || 0) * 100) / 100)
    );

    if (cleanShop.length < 1) {
      setErrorMsg('Shop / Firm Name is required.');
      return;
    }
    if (cleanProp.length < 1) {
      setErrorMsg('Proprietor Name is required.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setErrorMsg('Contact number must be exactly 10 digits.');
      return;
    }

    setSaving(true);
    try {
      await onUpdateSettings({
        ...draft,
        shopName: cleanShop,
        proprietorName: cleanProp,
        phone: cleanPhone,
        gstin: cleanGstin,
        address: cleanAddress,
        openingCashBalance: nextOpening,
      });
      onNotify('Shop profile and ledger settings saved');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (
    key: 'showBilingualTerms' | 'showNumericKeypad' | 'showPaiseDecimals'
  ) => {
    const cleanPhone = draft.phone.replace(/\D/g, '').slice(0, 10);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please set a valid 10-digit contact number before updating preferences.');
      return;
    }
    const updated = { ...draft, phone: cleanPhone, [key]: !draft[key] };
    setDraft(updated);
    onUpdateSettings(updated);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    const cleaned = newCategoryName.trim().slice(0, 40);
    if (!cleaned) {
      setCategoryError('Enter a category name first.');
      return;
    }
    if (draft.customCategories.length >= MAX_CUSTOM_CATEGORIES) {
      setCategoryError(`You can add up to ${MAX_CUSTOM_CATEGORIES} custom categories.`);
      return;
    }
    const existsAlready = [
      ...ALL_DEFAULT_CATEGORIES,
      ...draft.customCategories,
    ].some((c) => c.toLowerCase() === cleaned.toLowerCase());

    if (existsAlready) {
      setCategoryError(`"${cleaned}" already exists.`);
      return;
    }

    const cleanPhone = draft.phone.replace(/\D/g, '').slice(0, 10);
    if (cleanPhone.length !== 10) {
      setCategoryError('Please save a valid 10-digit shop phone number first.');
      return;
    }

    const nextCategories = [...draft.customCategories, cleaned];
    const updated: ShopSettings = {
      ...draft,
      phone: cleanPhone,
      customCategories: nextCategories,
    };
    setDraft(updated);
    setNewCategoryName('');
    await onUpdateSettings(updated);
    onNotify(`Added category "${cleaned}"`);
  };

  const handleRemoveCategory = async (catToRemove: string) => {
    const cleanPhone = draft.phone.replace(/\D/g, '').slice(0, 10);
    if (cleanPhone.length !== 10) {
      setCategoryError('Please save a valid 10-digit shop phone number first.');
      return;
    }
    const nextCategories = draft.customCategories.filter((c) => c !== catToRemove);
    const updated: ShopSettings = {
      ...draft,
      phone: cleanPhone,
      customCategories: nextCategories,
    };
    setDraft(updated);
    await onUpdateSettings(updated);
    onNotify(`Removed category "${catToRemove}"`);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
      {/* Left Column: Shop Identity + Ledger Categories */}
      <div className="space-y-4 lg:col-span-7">
        <form onSubmit={handleSaveProfile} className="card-ledger space-y-5 p-5">
          <div className="flex items-center gap-2.5 border-b border-[#E2E6EE] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#EEF2FF] text-[#3B5BDB]">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[#141B2D]">
                Shop Profile &amp; Opening Galla
              </h2>
              <p className="text-xs text-[#637083]">
                Displayed on party statements, WhatsApp reminders, and printed reports
              </p>
            </div>
          </div>

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
              <label htmlFor="shop-name" className="mb-1.5 block text-xs font-semibold text-[#637083]">
                Shop / Firm Name
              </label>
              <input
                id="shop-name"
                type="text"
                maxLength={120}
                required
                value={draft.shopName}
                onChange={(e) => setDraft({ ...draft, shopName: e.target.value })}
                className="h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-sm font-semibold text-[#141B2D] outline-none focus:border-[#3B5BDB]"
              />
            </div>

            <div>
              <label htmlFor="proprietor-name" className="mb-1.5 block text-xs font-semibold text-[#637083]">
                Proprietor Name
              </label>
              <input
                id="proprietor-name"
                type="text"
                maxLength={100}
                required
                value={draft.proprietorName}
                onChange={(e) => setDraft({ ...draft, proprietorName: e.target.value })}
                className="h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-sm font-medium text-[#141B2D] outline-none focus:border-[#3B5BDB]"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="shop-phone" className="block text-xs font-semibold text-[#637083]">
                  Contact Phone (10 digits)
                </label>
                <span
                  className={`tnum text-[11px] font-semibold ${
                    draft.phone.length === 10 ? 'text-[#0C9B6A]' : 'text-[#D6453D]'
                  }`}
                >
                  {draft.phone.length}/10
                </span>
              </div>
              <div className="flex items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 focus-within:border-[#3B5BDB]">
                <span className="tnum mr-2 select-none text-sm font-semibold text-[#637083]">
                  +91
                </span>
                <input
                  id="shop-phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                  placeholder="9820451782"
                  value={draft.phone}
                  onChange={(e) => {
                    setDraft({
                      ...draft,
                      phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                    });
                    setErrorMsg(null);
                  }}
                  className="tnum h-[46px] w-full bg-transparent text-sm font-medium text-[#141B2D] outline-none placeholder:text-[#94A3B8]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="business-type" className="mb-1.5 block text-xs font-semibold text-[#637083]">
                Trade Category
              </label>
              <select
                id="business-type"
                value={draft.businessType}
                onChange={(e) =>
                  setDraft({ ...draft, businessType: e.target.value as BusinessCategory })
                }
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
              <label htmlFor="shop-gstin" className="mb-1.5 block text-xs font-semibold text-[#637083]">
                GSTIN (Optional)
              </label>
              <input
                id="shop-gstin"
                type="text"
                maxLength={20}
                value={draft.gstin}
                onChange={(e) => setDraft({ ...draft, gstin: e.target.value.toUpperCase() })}
                className="tnum h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-sm font-medium text-[#141B2D] outline-none focus:border-[#3B5BDB]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="shop-address" className="mb-1.5 block text-xs font-semibold text-[#637083]">
                Shop Address
              </label>
              <input
                id="shop-address"
                type="text"
                maxLength={240}
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                className="h-[48px] w-full rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-sm text-[#141B2D] outline-none focus:border-[#3B5BDB]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="opening-galla" className="mb-1.5 block text-xs font-semibold text-[#637083]">
                Base Opening Cash Balance (₹)
              </label>
              <div className="flex items-center rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 focus-within:border-[#3B5BDB]">
                <span className="mr-2 text-base font-bold text-[#637083]">₹</span>
                <input
                  id="opening-galla"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="any"
                  value={openingInput}
                  onChange={(e) => setOpeningInput(e.target.value)}
                  className="tnum h-[48px] w-full bg-transparent text-base font-bold text-[#141B2D] outline-none"
                />
              </div>
              <p className="tnum mt-1 text-xs text-[#637083]">
                Currently set to {formatINR(Math.max(0, Number(openingInput) || 0))} prior to recorded history.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#3B5BDB] px-5 text-sm font-bold text-white transition-colors hover:bg-[#1A40C2] disabled:opacity-70 sm:w-auto"
          >
            <Check className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Shop Profile'}</span>
          </button>
        </form>

        {/* Custom Ledger Categories Manager */}
        <section className="card-ledger p-5">
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E6EE] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#EEF2FF] text-[#3B5BDB]">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[18px] font-semibold text-[#141B2D]">
                  Ledger Categories
                </h2>
                <p className="text-xs text-[#637083]">
                  Add custom categories for quick entry selection and reports
                </p>
              </div>
            </div>
            <span className="tnum text-xs font-semibold text-[#637083]">
              {draft.customCategories.length}/{MAX_CUSTOM_CATEGORIES} custom
            </span>
          </div>

          <form onSubmit={handleAddCategory} className="mt-4 flex gap-2">
            <input
              type="text"
              maxLength={40}
              placeholder="e.g., Shop Rent, Transport, Packaging, Chai..."
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                setCategoryError(null);
              }}
              aria-label="New category name"
              className="h-[48px] flex-1 rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-3.5 text-sm font-medium text-[#141B2D] outline-none placeholder:text-[#94A3B8] focus:border-[#3B5BDB]"
            />
            <button
              type="submit"
              className="flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-[12px] bg-[#3B5BDB] px-4 text-sm font-bold text-white transition-colors hover:bg-[#1A40C2] whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </form>

          {categoryError && (
            <p className="mt-2 text-xs font-semibold text-[#D6453D]">{categoryError}</p>
          )}

          {/* Custom Categories List */}
          <div className="mt-5">
            <p className="text-xs font-semibold text-[#637083]">
              Your Custom Categories
            </p>
            {draft.customCategories.length === 0 ? (
              <p className="mt-1.5 text-xs text-[#637083]">
                No custom categories added yet. Add categories above to see them in the entry form.
              </p>
            ) : (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {draft.customCategories.map((cat) => (
                  <div
                    key={cat}
                    className="inline-flex h-[34px] items-center gap-1.5 rounded-full border border-[#3B5BDB] bg-[#EEF2FF] pl-3.5 pr-1.5 text-xs font-semibold text-[#3B5BDB]"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      aria-label={`Remove category ${cat}`}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[#3B5BDB] hover:bg-[#3B5BDB]/15"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Built-in Categories List */}
          <div className="mt-4 border-t border-[#E2E6EE] pt-4">
            <p className="text-xs font-semibold text-[#637083]">
              Default Mercantile Categories
            </p>
            <p className="mt-1.5 text-xs leading-6 text-[#141B2D]">
              {ALL_DEFAULT_CATEGORIES.join('  ·  ')}
            </p>
          </div>
        </section>
      </div>

      {/* Right Column: Preferences & Google Account Sync */}
      <div className="space-y-4 lg:col-span-5">
        <section className="card-ledger p-5">
          <div className="flex items-center gap-2.5 border-b border-[#E2E6EE] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F2F4F8] text-[#141B2D]">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-[#141B2D]">
                Display &amp; Entry Preferences
              </h2>
              <p className="text-xs text-[#637083]">
                Customize ledger vocabulary and numeric entry
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-[#E2E6EE]">
            {[
              {
                key: 'showBilingualTerms' as const,
                title: 'Hindi Mercantile Terms',
                desc: 'Show Aaya/Gaya, Jama/Naam, and Lena/Dena cues',
                checked: draft.showBilingualTerms,
              },
              {
                key: 'showNumericKeypad' as const,
                title: 'Tactile Numeric Keypad',
                desc: 'Display large one-handed keypad in entry drawer',
                checked: draft.showNumericKeypad,
              },
              {
                key: 'showPaiseDecimals' as const,
                title: 'Always Show Paise (.00)',
                desc: 'Format ₹ 1,250 as ₹ 1,250.00 across ledger rows',
                checked: draft.showPaiseDecimals,
              },
            ].map((pref) => (
              <div
                key={pref.key}
                className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-semibold text-[#141B2D]">{pref.title}</p>
                  <p className="mt-0.5 text-xs text-[#637083]">{pref.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pref.checked}
                  aria-label={pref.title}
                  onClick={() => handleToggle(pref.key)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                    pref.checked ? 'bg-[#3B5BDB]' : 'bg-[#CBD5E1]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      pref.checked ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="card-ledger p-5">
          <div className="flex items-center gap-2.5 border-b border-[#E2E6EE] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E8F7F1] text-[#0C9B6A]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold text-[#141B2D]">
                Google Account &amp; Cloud Sync
              </h2>
              <p className="truncate text-xs font-medium text-[#141B2D]">
                {userEmail}
              </p>
              <p className="tnum mt-0.5 text-xs text-[#637083]">
                {transactionCount} entries · {partyCount} khata parties synced
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={onExportBackupJSON}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-4 text-sm font-semibold text-[#141B2D] hover:border-[#3B5BDB] hover:text-[#3B5BDB]"
            >
              <Download className="h-4 w-4" />
              <span>Download Full Backup (JSON)</span>
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#E2E6EE] bg-white px-4 text-sm font-semibold text-[#D6453D] hover:bg-[#FDEEEC]"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
