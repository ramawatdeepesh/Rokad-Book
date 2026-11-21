import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  ShieldCheck,
  X,
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';

const CONSENT_STORAGE_KEY = 'daybook_login_consent_v1';

function readStoredConsent(): boolean {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { accepted?: boolean };
    return parsed?.accepted === true;
  } catch {
    return false;
  }
}

function saveStoredConsent(): void {
  try {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        accepted: true,
        version: '1.0',
        acceptedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore storage write errors in restricted browsing contexts
  }
}

export const LoginScreen: React.FC = () => {
  const [hasPreviouslyConsented] = useState<boolean>(() => readStoredConsent());
  const [consentAccepted, setConsentAccepted] = useState<boolean>(() => readStoredConsent());
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms' | null>(null);

  const handleGoogleLogin = async () => {
    if (!consentAccepted) {
      setAuthError('Please review and accept the consent terms before signing in.');
      return;
    }

    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      saveStoredConsent();
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in window was closed before completing login. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Your browser blocked the Google sign-in popup. Please allow popups and retry.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(
          `This domain (${window.location.hostname}) is not authorized in Firebase Authentication. Add it under Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (code) {
        setAuthError(`Could not sign in with Google (${code}). Please try again.`);
      } else {
        setAuthError('Could not sign in with Google right now. Please try again.');
      }
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#F2F4F8] text-[#141B2D]">
      {/* Simple Top Brand Bar */}
      <header className="border-b border-[#E2E6EE] bg-white">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <span className="text-[20px] font-bold tracking-[-0.02em] text-[#141B2D]">
            Rokad Book
          </span>
          <span className="text-xs font-semibold text-[#637083]">
            Mercantile Cashbook &amp; Udhaar Khata
          </span>
        </div>
      </header>

      {/* Main Auth Container */}
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid w-full max-w-[960px] grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          {/* Left Narrative & Feature Summary */}
          <section className="flex flex-col justify-center space-y-6 lg:col-span-6 lg:pr-4">
            <div>
              <h1 className="text-[28px] font-bold leading-[36px] tracking-[-0.02em] text-[#141B2D] sm:text-[34px] sm:leading-[42px]">
                Daily cashbook &amp; udhaar khata built for clear retail accounting.
              </h1>
              <p className="mt-3 text-[15px] leading-6 text-[#637083]">
                Record Cash, UPI, and Khata entries in seconds, reconcile your closing balance, and track customer accounts across every device.
              </p>
            </div>

            <div className="divide-y divide-[#E2E6EE] border-y border-[#E2E6EE]">
              <div className="flex items-start gap-3.5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#E8F7F1] text-[#0C9B6A]">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#141B2D]">
                    Instant Rojmel Cashbook
                  </p>
                  <p className="mt-0.5 text-xs text-[#637083]">
                    One-handed tactile keypad for fast + In (Aaya) and - Out (Gaya) entries with Indian Rupee grouping.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#FDEEEC] text-[#D6453D]">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#141B2D]">
                    Customer &amp; Supplier Udhaar Khata
                  </p>
                  <p className="mt-0.5 text-xs text-[#637083]">
                    Running party statements, Lena/Dena summaries, WhatsApp reminders, and CSV exports.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#EEF2FF] text-[#3B5BDB]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#141B2D]">
                    Private Cloud Ledger Sync
                  </p>
                  <p className="mt-0.5 text-xs text-[#637083]">
                    Your shop profile and entries are securely tied to your Google ID with zero sample clutter.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Right Sign-In & First-Time Consent Card */}
          <section className="card-ledger flex flex-col justify-between p-6 sm:p-8 lg:col-span-6">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#EEF2FF] text-[#3B5BDB]">
                <BookOpen className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-[22px] font-bold leading-7 text-[#141B2D]">
                Sign in to your Shop Ledger
              </h2>
              <p className="mt-1.5 text-sm leading-5 text-[#637083]">
                Continue with your Google ID. First-time merchants will be prompted to set up their shop profile and opening balance right after sign-in.
              </p>

              {/* First-Time User Consent Section */}
              {!hasPreviouslyConsented ? (
                <div className="mt-5 rounded-[14px] border border-[#E2E6EE] bg-[#F8FAFC] p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#141B2D]">
                    <FileText className="h-4 w-4 text-[#3B5BDB]" />
                    <span>First-Time User Consent</span>
                  </div>

                  <ul className="mt-2.5 space-y-2 text-xs leading-5 text-[#637083]">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B5BDB]" />
                      <span>
                        <strong className="font-semibold text-[#141B2D]">Google Sign-In:</strong>{' '}
                        Your Google name and email are used solely to authenticate and keep your ledger private.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B5BDB]" />
                      <span>
                        <strong className="font-semibold text-[#141B2D]">Private Ledger Storage:</strong>{' '}
                        Shop settings, daily cashbook entries, and customer khata balances are saved securely in your cloud account.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B5BDB]" />
                      <span>
                        <strong className="font-semibold text-[#141B2D]">Merchant Control:</strong>{' '}
                        You are responsible for verifying entries for tax/accounting use and can export CSV backups anytime.
                      </span>
                    </li>
                  </ul>

                  <label
                    htmlFor="login-consent-checkbox"
                    className="mt-3.5 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[10px] border border-[#E2E6EE] bg-white p-3 transition-colors hover:border-[#3B5BDB]/50"
                  >
                    <input
                      id="login-consent-checkbox"
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(e) => {
                        setConsentAccepted(e.target.checked);
                        if (e.target.checked) setAuthError(null);
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#CBD5E1] accent-[#3B5BDB]"
                    />
                    <span className="text-xs leading-5 text-[#141B2D]">
                      I have read and agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setLegalModalTab('terms');
                        }}
                        className="font-semibold text-[#3B5BDB] underline underline-offset-2 hover:text-[#1A40C2]"
                      >
                        Terms of Use
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setLegalModalTab('privacy');
                        }}
                        className="font-semibold text-[#3B5BDB] underline underline-offset-2 hover:text-[#1A40C2]"
                      >
                        Privacy Policy
                      </button>
                      , and consent to securely storing my shop ledger under my Google account.
                    </span>
                  </label>
                </div>
              ) : (
                <div className="mt-5 flex items-center justify-between gap-3 rounded-[12px] border border-[#0C9B6A]/25 bg-[#E8F7F1]/70 px-3.5 py-2.5 text-xs text-[#141B2D]">
                  <span className="flex items-center gap-2 font-medium">
                    <Check className="h-4 w-4 shrink-0 text-[#0C9B6A]" />
                    Consent accepted on this device
                  </span>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setLegalModalTab('terms')}
                      className="font-semibold text-[#3B5BDB] hover:underline"
                    >
                      Terms
                    </button>
                    <span className="text-[#CBD5E1]" aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => setLegalModalTab('privacy')}
                      className="font-semibold text-[#3B5BDB] hover:underline"
                    >
                      Privacy
                    </button>
                  </div>
                </div>
              )}

              {authError && (
                <div
                  role="alert"
                  className="mt-4 rounded-[12px] border border-[#D6453D]/30 bg-[#FDEEEC] px-4 py-3 text-xs font-semibold text-[#9C1A19]"
                >
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={signingIn || !consentAccepted}
                className="mt-5 flex min-h-[54px] w-full items-center justify-center gap-3 rounded-[12px] bg-[#3B5BDB] px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1A40C2] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#94A3B8] disabled:opacity-75"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                </span>
                <span>{signingIn ? 'Signing in with Google...' : 'Continue with Google'}</span>
              </button>

              {!consentAccepted && (
                <p className="mt-2.5 text-center text-xs text-[#637083]">
                  Tick the consent checkbox above to enable Google Sign-In.
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-[#E2E6EE] pt-4 text-xs text-[#637083]">
              Only your verified Google account can read or modify your shop records.
            </div>
          </section>
        </div>
      </main>

      {/* Terms of Use & Privacy Policy Modal */}
      {legalModalTab && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#141B2D]/45 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={legalModalTab === 'privacy' ? 'Privacy Policy' : 'Terms of Use'}
          onClick={(e) => {
            if (e.target === e.currentTarget) setLegalModalTab(null);
          }}
        >
          <div className="sheet-elevated flex max-h-[85dvh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-[22px] sm:rounded-[18px]">
            <div className="flex items-center justify-between border-b border-[#E2E6EE] px-5 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLegalModalTab('terms')}
                  className={`min-h-[36px] rounded-[10px] px-3 text-xs font-bold transition-colors ${
                    legalModalTab === 'terms'
                      ? 'bg-[#EEF2FF] text-[#3B5BDB]'
                      : 'text-[#637083] hover:bg-[#F2F4F8] hover:text-[#141B2D]'
                  }`}
                >
                  Terms of Use
                </button>
                <button
                  type="button"
                  onClick={() => setLegalModalTab('privacy')}
                  className={`min-h-[36px] rounded-[10px] px-3 text-xs font-bold transition-colors ${
                    legalModalTab === 'privacy'
                      ? 'bg-[#EEF2FF] text-[#3B5BDB]'
                      : 'text-[#637083] hover:bg-[#F2F4F8] hover:text-[#141B2D]'
                  }`}
                >
                  Privacy Policy
                </button>
              </div>
              <button
                type="button"
                onClick={() => setLegalModalTab(null)}
                aria-label="Close legal notice"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#637083] hover:bg-[#F2F4F8] hover:text-[#141B2D]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 text-xs leading-6 text-[#475569]">
              {legalModalTab === 'terms' ? (
                <div className="space-y-3.5">
                  <h3 className="text-base font-bold text-[#141B2D]">
                    Rokad Book — Terms of Use
                  </h3>
                  <p>
                    By signing in and using Rokad Book, you agree to use the application for lawful business cashbook and credit (udhaar) record-keeping.
                  </p>
                  <div>
                    <p className="font-semibold text-[#141B2D]">1. Account &amp; Access</p>
                    <p className="mt-0.5">
                      Access is tied to your Google account. You are responsible for maintaining the security of your Google credentials and any device left signed in to your shop ledger.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#141B2D]">2. Accuracy of Financial Records</p>
                    <p className="mt-0.5">
                      Rokad Book is a digital bookkeeping aid and does not replace a Chartered Accountant or statutory GST/tax filing software. Always verify totals and export regular CSV backups for compliance.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#141B2D]">3. Party Details &amp; Reminders</p>
                    <p className="mt-0.5">
                      When storing customer or supplier phone numbers and sending payment reminders, you confirm you have a legitimate business relationship and permission to contact those parties.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <h3 className="text-base font-bold text-[#141B2D]">
                    Rokad Book — Privacy Policy
                  </h3>
                  <p>
                    We respect your privacy and collect only the information needed to operate your private digital cashbook and khata ledger.
                  </p>
                  <div>
                    <p className="font-semibold text-[#141B2D]">1. Data Collected</p>
                    <p className="mt-0.5">
                      We store your Google authentication identifier (UID, display name, and email), your shop profile details (shop name, owner name, phone, opening balance, custom categories), daily transactions, and customer/supplier khata entries you explicitly record.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#141B2D]">2. Isolation &amp; Security</p>
                    <p className="mt-0.5">
                      All ledger documents are stored in Google Cloud Firestore under strict user-scoped security rules so only your authenticated Google account can read or modify your shop records. We never sell or share your financial entries with third parties.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#141B2D]">3. Data Portability &amp; Deletion</p>
                    <p className="mt-0.5">
                      You can export your complete ledger to CSV anytime from Reports or Settings, edit or delete entries individually, and clear your ledger records directly inside Settings.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#E2E6EE] bg-[#F8FAFC] px-5 py-3.5">
              {!consentAccepted && (
                <button
                  type="button"
                  onClick={() => {
                    setConsentAccepted(true);
                    setAuthError(null);
                    setLegalModalTab(null);
                  }}
                  className="min-h-[42px] rounded-[10px] bg-[#3B5BDB] px-4 text-xs font-bold text-white transition-colors hover:bg-[#1A40C2]"
                >
                  Accept &amp; Close
                </button>
              )}
              <button
                type="button"
                onClick={() => setLegalModalTab(null)}
                className="min-h-[42px] rounded-[10px] border border-[#E2E6EE] bg-white px-4 text-xs font-semibold text-[#141B2D] hover:bg-[#F2F4F8]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

