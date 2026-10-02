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
    console.error('[BazaarPulse ErrorBoundary Intercepted Error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] p-6 max-w-2xl mx-auto flex flex-col items-center justify-center text-center my-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">সাময়িক ত্রুটি হয়েছে</h3>
            <p className="text-xs text-slate-500 max-w-md">
              আমরা বিষয়টি ঠিক করার চেষ্টা করছি। অনুগ্রহ করে পেজটি রিফ্রেশ করুন বা হোমপেজে ফিরে যান।
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-[#f85606] hover:bg-[#e04d05] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>পুনরায় চেষ্টা করুন</span>
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>হোমে ফিরুন</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
