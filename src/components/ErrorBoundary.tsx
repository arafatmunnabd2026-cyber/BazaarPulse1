import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[BazaarPulse Critical UI Failure]:', error, errorInfo);
    // In a real app, you might send this to Sentry or another logging service
  }

  private handleReset = () => {
    // Clear potentially corrupted local state if needed
    // localStorage.removeItem('bazaarpulse_some_state');
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen p-6 flex items-center justify-center bg-slate-50">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-2xl p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <AlertTriangle className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">সাময়িক ত্রুটি হয়েছে</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                দুঃখিত, অ্যাপ্লিকেশনটি লোড করার সময় একটি সমস্যা হয়েছে। আমরা এটি সমাধানের চেষ্টা করছি।
              </p>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="bg-red-50 p-4 rounded-xl text-left overflow-auto max-h-40">
                <p className="text-[10px] font-mono text-red-700 whitespace-pre">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 bg-[#f85606] hover:bg-[#e04d05] text-white font-black text-sm px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-orange-200 cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>পুনরায় চেষ্টা করুন (Retry)</span>
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm px-6 py-3 rounded-2xl transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>হোমপেজে ফিরে যান</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              Error ID: {Math.random().toString(36).substring(7).toUpperCase()} • {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
