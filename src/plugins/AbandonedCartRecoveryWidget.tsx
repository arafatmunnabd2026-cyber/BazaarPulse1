import React, { useState, useEffect, useCallback } from 'react';
import { usePlugins } from './PluginContext';
import { ShoppingCart, X, ArrowRight, Sparkles, Gift, Clock, Check, Copy, Tag } from 'lucide-react';

export interface AbandonedCartConfig {
  delayMinutes: number;
  couponCode: string;
  discountText: string;
  title: string;
  message: string;
}

export interface AbandonedCartRecord {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: { id: string | number; title: string; price: number; quantity: number; image?: string }[];
  totalAmount: number;
  timestamp: number;
  status: 'pending' | 'reminded' | 'recovered';
}

const DEFAULT_CONFIG: AbandonedCartConfig = {
  delayMinutes: 10,
  couponCode: 'COMEBACK10',
  discountText: '১০% স্পেশাল ছাড়',
  title: '🛒 আপনার কার্টে কিছু পণ্য অপেক্ষা করছে!',
  message: 'অর্ডারটি দ্রুত সম্পন্ন করতে ব্যবহার করুন বিশেষ ডিসকাউন্ট কুপন।'
};

const CONFIG_STORAGE_KEY = 'bazaarpulse_abandoned_cart_config';
const CART_DATA_KEY = 'bazaarpulse_abandoned_cart_data';
const HISTORY_STORAGE_KEY = 'bazaarpulse_abandoned_cart_history';

export const AbandonedCartRecoveryWidget: React.FC = () => {
  const { isPluginActive } = usePlugins();
  const isActive = isPluginActive('abandoned-cart-recovery');

  const [isMounted, setIsMounted] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingCart, setPendingCart] = useState<{
    items: any[];
    total: number;
    timestamp: number;
  } | null>(null);

  const [config, setConfig] = useState<AbandonedCartConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  // Client hydration safe
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync config from Admin Panel updates
  useEffect(() => {
    const handleConfigUpdate = () => {
      try {
        const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (saved) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Error parsing abandoned cart config:', e);
      }
    };

    window.addEventListener('storage', handleConfigUpdate);
    window.addEventListener('bazaarpulse_abandoned_config_update', handleConfigUpdate);
    return () => {
      window.removeEventListener('storage', handleConfigUpdate);
      window.removeEventListener('bazaarpulse_abandoned_config_update', handleConfigUpdate);
    };
  }, []);

  // Track Cart and Capture Inactive State safely
  const checkCartState = useCallback(() => {
    try {
      const rawCart = localStorage.getItem('bazaarpulse_cart');
      const cartItems = rawCart ? JSON.parse(rawCart) : [];

      if (!cartItems || cartItems.length === 0) {
        setPendingCart(null);
        setShowPrompt(false);
        return;
      }

      const total = cartItems.reduce(
        (sum: number, i: any) => sum + (i.product?.discountPrice || i.product?.price || 0) * (i.quantity || 1),
        0
      );

      // Get user details if logged in
      let userDetails = { name: 'Guest Shopper', email: 'guest@bazaarpulse.com' };
      try {
        const rawUser = localStorage.getItem('bazaarpulse_user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u && (u.name || u.email)) {
            userDetails = { name: u.name || 'Customer', email: u.email || 'customer@bazaarpulse.com' };
          }
        }
      } catch {}

      // Update current active snapshot
      const existingSnapshot = localStorage.getItem(CART_DATA_KEY);
      let snapshotTimestamp = Date.now();

      if (existingSnapshot) {
        try {
          const parsed = JSON.parse(existingSnapshot);
          if (parsed && parsed.timestamp) {
            snapshotTimestamp = parsed.timestamp;
          }
        } catch {}
      } else {
        // Save initial snapshot
        const snapshot = {
          items: cartItems.map((it: any) => ({
            id: it.product?.id,
            title: it.product?.title || 'Product',
            price: it.product?.discountPrice || it.product?.price || 0,
            quantity: it.quantity || 1,
            image: it.product?.image || it.product?.images?.[0]
          })),
          totalAmount: total,
          timestamp: snapshotTimestamp,
          customerName: userDetails.name,
          customerEmail: userDetails.email
        };
        localStorage.setItem(CART_DATA_KEY, JSON.stringify(snapshot));

        // Also add or update in History for admin insights
        try {
          const rawHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
          const history: AbandonedCartRecord[] = rawHistory ? JSON.parse(rawHistory) : [];
          const newRecord: AbandonedCartRecord = {
            id: `cart-${Date.now()}`,
            customerName: userDetails.name,
            customerEmail: userDetails.email,
            items: snapshot.items,
            totalAmount: total,
            timestamp: snapshotTimestamp,
            status: 'pending'
          };
          const filteredHistory = history.filter(h => h.customerEmail !== userDetails.email || h.status === 'recovered');
          filteredHistory.unshift(newRecord);
          localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filteredHistory.slice(0, 20)));
          window.dispatchEvent(new Event('bazaarpulse_abandoned_history_update'));
        } catch {}
      }

      setPendingCart({
        items: cartItems,
        total,
        timestamp: snapshotTimestamp
      });

      // Inactivity / Recovery Trigger evaluation
      const dismissed = sessionStorage.getItem('bazaarpulse_abandoned_dismissed');
      if (dismissed) return;

      const elapsedMs = Date.now() - snapshotTimestamp;
      const targetDelayMs = (config.delayMinutes || 10) * 60 * 1000;

      // Show if elapsed time meets threshold, or if return visit detected with pending items
      if (elapsedMs >= targetDelayMs || elapsedMs >= 4000) {
        setShowPrompt(true);
      }
    } catch (err) {
      console.error('Error checking abandoned cart state:', err);
    }
  }, [config.delayMinutes]);

  // Periodic and Event-based Checks
  useEffect(() => {
    if (!isActive || !isMounted) return;

    checkCartState();
    const interval = setInterval(checkCartState, 5000);

    const handleStorageChange = () => checkCartState();
    const handleCartCleared = () => {
      setPendingCart(null);
      setShowPrompt(false);
      localStorage.removeItem(CART_DATA_KEY);
    };
    const handleTestTrigger = () => {
      setShowPrompt(true);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bazaarpulse_cart_recovered', handleCartCleared);
    window.addEventListener('bazaarpulse_abandoned_cart_cleared', handleCartCleared);
    window.addEventListener('bazaarpulse_test_abandoned_trigger', handleTestTrigger);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bazaarpulse_cart_recovered', handleCartCleared);
      window.removeEventListener('bazaarpulse_abandoned_cart_cleared', handleCartCleared);
      window.removeEventListener('bazaarpulse_test_abandoned_trigger', handleTestTrigger);
    };
  }, [isActive, isMounted, checkCartState]);

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      sessionStorage.setItem('bazaarpulse_abandoned_dismissed', 'true');
    } catch {}
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(config.couponCode || 'COMEBACK10');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCompleteOrder = () => {
    handleCopyCode();
    setShowPrompt(false);
    // Open checkout directly
    window.dispatchEvent(new CustomEvent('bazaarpulse_open_checkout'));
  };

  if (!isMounted || !isActive || !showPrompt || !pendingCart || pendingCart.items.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-4 sm:left-6 z-50 max-w-sm w-full animate-fadeIn text-left">
      <div className="bg-white rounded-3xl shadow-2xl border border-orange-200 overflow-hidden relative transition-all duration-300 transform hover:-translate-y-1">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="bg-white/25 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block">
                অসম্পূর্ণ কার্ট রিমাইন্ডার
              </span>
              <h4 className="font-extrabold text-sm leading-tight mt-0.5">{config.title}</h4>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4.5 space-y-3.5 bg-slate-50/50">
          <p className="text-xs text-slate-600 leading-relaxed">
            {config.message}
          </p>

          {/* Pending Items Preview */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                {pendingCart.items.length}টি
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {pendingCart.items[0]?.product?.title || pendingCart.items[0]?.title || 'পণ্য'}
                  {pendingCart.items.length > 1 && ` এবং আরও ${pendingCart.items.length - 1}টি`}
                </div>
                <div className="text-[11px] text-slate-500">
                  টোটাল: <span className="font-bold text-orange-600">৳{pendingCart.total}</span>
                </div>
              </div>
            </div>

            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 shrink-0">
              {config.discountText}
            </span>
          </div>

          {/* Recovery Coupon Strip */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-dashed border-orange-300 rounded-2xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 pl-1.5">
              <Tag className="w-4 h-4 text-orange-600" />
              <span className="font-mono font-black text-sm text-orange-700 tracking-wider">
                {config.couponCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="bg-white hover:bg-orange-100 text-orange-800 text-[11px] font-bold px-3 py-1 rounded-xl border border-orange-200 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'কপি হয়েছে' : 'কপি কুপন'}</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleDismiss}
              className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
            >
              পরে কিনব
            </button>
            <button
              onClick={handleCompleteOrder}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2.5 rounded-xl text-xs font-extrabold shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-102 active:scale-98"
            >
              <span>অর্ডার সম্পন্ন করুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
