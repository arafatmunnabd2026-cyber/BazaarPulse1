import React, { useState, useEffect } from 'react';
import { usePlugins } from './PluginContext';
import { X, Gift, Copy, Check } from 'lucide-react';

export const ExitIntentPopupWidget: React.FC = () => {
  const { isPluginActive } = usePlugins();
  const isActive = isPluginActive('exitIntentPopup');

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('bazaarpulse_exit_popup_config');
      return saved ? JSON.parse(saved) : { couponCode: 'BAZAAR20', discountText: '20% OFF Your First Order', minSpend: '৳১০০০ টাকার অর্ডারে' };
    } catch {
      return { couponCode: 'BAZAAR20', discountText: '20% OFF Your First Order', minSpend: '৳১০০০ টাকার অর্ডারে' };
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('bazaarpulse_exit_popup_config');
        if (saved) setConfig(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const dismissed = sessionStorage.getItem('bazaarpulse_exit_popup_dismissed');
    if (dismissed) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 15000);

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 10 && !sessionStorage.getItem('bazaarpulse_exit_popup_dismissed')) {
        setIsOpen(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isActive]);

  const handleClose = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem('bazaarpulse_exit_popup_dismissed', 'true');
    } catch {}
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(config.couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isActive || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-left">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-orange-100 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-gradient-to-br from-orange-600 via-amber-600 to-orange-700 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            Special Exit Offer
          </span>
          <h3 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">{config.discountText}</h3>
          <p className="text-xs sm:text-sm text-orange-100 mt-1">{config.minSpend}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-xs text-slate-600">Use coupon code at checkout to claim your instant discount:</p>
            <div className="flex items-center justify-between bg-orange-50 border-2 border-dashed border-orange-300 rounded-2xl p-3">
              <span className="font-mono font-black text-lg text-orange-700 tracking-wider pl-2">{config.couponCode}</span>
              <button
                onClick={handleCopy}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/25 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl font-bold text-sm transition-all shadow-lg cursor-pointer"
          >
            Claim Discount & Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
