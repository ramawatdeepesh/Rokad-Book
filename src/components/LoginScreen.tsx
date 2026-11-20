import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowDownLeft, ArrowUpRight, BookOpen, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

export const LoginScreen: React.FC = () => {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
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
            Daybook
          </span>
          <span className="text-xs font-semibold text-[#637083]">
            Mercantile Cashbook &amp; Udhaar Khata
          </span>
        </div>
      </header>

      {/* Main Auth Container */}
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-[920px] grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          {/* Left Narrative & Feature Summary */}
          <section className="flex flex-col justify-center space-y-6 lg:col-span-6 lg:pr-4">
            <div>
              <h1 className="text-[28px] font-bold leading-[36px] tracking-[-0.02em] text-[#141B2D] sm:text-[34px] sm:leading-[42px]">
                Daily cashbook &amp; udhaar khata built for clear retail accounting.
              </h1>
              <p className="mt-3 text-[15px] leading-6 text-[#637083]">
                Record Cash, UPI, and Khata entries in seconds, reconcile your physical Galla drawer, and track customer balances across every device.
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

          {/* Right Sign-In Card */}
          <section className="card-ledger flex flex-col justify-between p-6 sm:p-8 lg:col-span-6">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#EEF2FF] text-[#3B5BDB]">
                <BookOpen className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-[22px] font-bold leading-7 text-[#141B2D]">
                Sign in to your Shop Ledger
              </h2>
              <p className="mt-1.5 text-sm leading-5 text-[#637083]">
                Continue with your Google ID. First-time merchants will be prompted to set up their shop profile and opening cash balance immediately after sign-in.
              </p>

              {authError && (
                <div
                  role="alert"
                  className="mt-5 rounded-[12px] border border-[#D6453D]/30 bg-[#FDEEEC] px-4 py-3 text-xs font-semibold text-[#9C1A19]"
                >
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={signingIn}
                className="mt-6 flex min-h-[54px] w-full items-center justify-center gap-3 rounded-[12px] bg-[#3B5BDB] px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1A40C2] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
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
            </div>

            <div className="mt-8 border-t border-[#E2E6EE] pt-4 text-xs text-[#637083]">
              Only your verified Google account can read or modify your shop records.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
