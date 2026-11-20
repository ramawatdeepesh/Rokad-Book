import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    let readable = 'An unexpected error occurred while syncing your ledger.';
    if (error instanceof Error) {
      try {
        const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
        if (parsed.error) {
          if (parsed.error.includes('Quota exceeded')) {
            readable = 'Daily Firestore free tier quota was exceeded. Quota resets tomorrow.';
          } else if (parsed.error.includes('Missing or insufficient permissions')) {
            readable = 'Permission check failed while accessing your private ledger. Please sign in again.';
          } else {
            readable = parsed.error;
          }
        }
      } catch {
        readable = error.message || readable;
      }
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: unknown) {
    console.error('Application boundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-[#F2F4F8] p-4">
          <div className="card-ledger w-full max-w-[440px] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FDEEEC] text-[#D6453D]">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-[20px] font-bold text-[#141B2D]">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-[#637083]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[12px] bg-[#3B5BDB] px-5 text-sm font-bold text-white hover:bg-[#1A40C2]"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reload Daybook</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
