import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, ShieldAlert, AlertTriangle } from 'lucide-react';
import { TouchlineLogo } from './TouchlineLogo';

export interface FatalErrorInfo {
  type: '403_FORBIDDEN' | 'DATA_CORRUPTION' | 'UNKNOWN_FATAL';
  message: string;
  detail?: string;
}

interface FatalErrorProps {
  error: FatalErrorInfo;
  onReset?: () => void;
  onRetry?: () => void;
}

/**
 * Full-screen Fatal Error screen displayed only for irrecoverable errors
 * (e.g., HTTP 403 account bans, SQLite/storage data corruption)
 */
export const FatalError: React.FC<FatalErrorProps> = ({ error, onReset, onRetry }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black text-white selection:bg-neutral-800">
      <div className="w-full max-w-md p-8 border border-neutral-800 bg-neutral-950 rounded-2xl flex flex-col items-center text-center shadow-2xl">
        <TouchlineLogo size={48} className="mb-6" />

        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center mb-5">
          {error.type === '403_FORBIDDEN' ? (
            <ShieldAlert className="w-9 h-9 text-white" />
          ) : (
            <AlertOctagon className="w-9 h-9 text-white" />
          )}
        </div>

        <h1 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
          {error.type === '403_FORBIDDEN' ? 'Access Terminated' : 'Fatal System Halt'}
        </h1>

        <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
          {error.message}
        </p>

        {error.detail && (
          <div className="w-full p-3 mb-6 bg-neutral-900 border border-neutral-800 rounded-lg text-left font-mono text-xs text-neutral-400 overflow-x-auto max-h-32">
            <code>{error.detail}</code>
          </div>
        )}

        <div className="w-full flex flex-col gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-3 px-4 bg-white hover:bg-neutral-200 text-black font-bold uppercase tracking-wider text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Retry Connection
            </button>
          )}

          {onReset && (
            <button
              onClick={onReset}
              className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold uppercase tracking-wider text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer"
            >
              Purge Corrupted Cache & Reset
            </button>
          )}
        </div>

        <span className="mt-6 text-[10px] text-neutral-600 uppercase tracking-widest">
          Touchline Coach • Error Code: {error.type}
        </span>
      </div>
    </div>
  );
};

interface BoundaryProps {
  children: ReactNode;
  tabName: string;
}

interface BoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Generic Tab Component Error Boundary
 */
export class TabErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[Error in ${this.props.tabName}]`, error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[360px] text-center">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-black dark:text-white" />
          </div>
          <h2 className="text-lg font-bold text-black dark:text-white mb-1">
            {this.props.tabName} Encountered an Issue
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mb-4">
            A localized component error occurred. Your other coaching tabs, scheduled sessions, and live timer records are safe.
          </p>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold text-xs rounded-lg uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
          >
            Reload {this.props.tabName}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const HomeBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <TabErrorBoundary tabName="Home Calendar">{children}</TabErrorBoundary>
);

export const SquadBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <TabErrorBoundary tabName="My Squad">{children}</TabErrorBoundary>
);

export const SessionsBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <TabErrorBoundary tabName="Sessions & Activities">{children}</TabErrorBoundary>
);

export const LiveTimerBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <TabErrorBoundary tabName="Live Timer">{children}</TabErrorBoundary>
);

export const ReportsBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <TabErrorBoundary tabName="Reports & Exports">{children}</TabErrorBoundary>
);
