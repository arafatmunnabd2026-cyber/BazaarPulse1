import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, X, Sparkles, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { usePlugins } from './PluginContext';
import { 
  registerServiceWorker, 
  subscribeUserToPush, 
  getNotificationPermission, 
  PushBroadcastPayload 
} from '../lib/pushNotificationService';

export const BrowserPushWidget: React.FC = () => {
  const { isPluginActive } = usePlugins();
  const isActive = isPluginActive('browser-push-notifications');

  const [showPrompt, setShowPrompt] = useState(false);
  const [activeNotification, setActiveNotification] = useState<PushBroadcastPayload | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    // Register service worker in background
    registerServiceWorker();

    const perm = getNotificationPermission();
    const localPerm = localStorage.getItem('bazaarpulse_push_user_permission');
    const isDismissed = sessionStorage.getItem('bazaarpulse_push_prompt_dismissed');

    if (perm === 'granted' || localPerm === 'granted') {
      setIsSubscribed(true);
    } else if (!isDismissed) {
      // Show polite permission prompt after 3.5 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Listen for broadcast & test push notifications
  useEffect(() => {
    if (!isActive) return;

    const handleInAppPush = (e: CustomEvent<PushBroadcastPayload>) => {
      if (e.detail) {
        setActiveNotification(e.detail);
        // Auto dismiss after 9 seconds
        const timer = setTimeout(() => {
          setActiveNotification(null);
        }, 9000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('bazaarpulse_inapp_push_received', handleInAppPush as EventListener);
    return () => {
      window.removeEventListener('bazaarpulse_inapp_push_received', handleInAppPush as EventListener);
    };
  }, [isActive]);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      const res = await subscribeUserToPush();
      if (res.success) {
        setIsSubscribed(true);
        setShowPrompt(false);
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismissPrompt = () => {
    setShowPrompt(false);
    sessionStorage.setItem('bazaarpulse_push_prompt_dismissed', 'true');
  };

  if (!isActive) return null;

  return (
    <>
      {/* 1. In-App Rich Push Toast Banner */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-4 right-4 sm:right-6 z-[9999] max-w-sm sm:max-w-md w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-orange-500/40 overflow-hidden"
          >
            {/* Top Accent Strip */}
            <div className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 h-1.5 w-full"></div>

            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-md">
                    <BellRing className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                      বাজার প্লাস পুশ নোটিফিকেশন
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-0.5 leading-snug">
                      {activeNotification.title}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveNotification(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeNotification.image && (
                <div className="rounded-xl overflow-hidden h-32 w-full border border-slate-700 bg-slate-800">
                  <img
                    src={activeNotification.image}
                    alt="Promo"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed">
                {activeNotification.body}
              </p>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
                <span className="text-[10px] text-slate-400">এখনই অফারটি উপভোগ করুন</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveNotification(null)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNotification(null);
                      if (activeNotification.targetUrl) {
                        window.location.href = activeNotification.targetUrl;
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>অফার দেখুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Soft Permission Prompt Modal / Card */}
      <AnimatePresence>
        {showPrompt && !isSubscribed && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-5 left-4 sm:left-6 z-50 max-w-sm w-[calc(100vw-2rem)] bg-white border border-orange-200 rounded-3xl shadow-2xl p-5 text-slate-900 overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Bell className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                    সেরা ডিসকাউন্ট ও অফার অ্যালার্ট! 🔔
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ফ্ল্যাশ সেল ও মূল্যছাড় সবার আগে জানতে পুশ নোটিফিকেশন অন করুন।
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismissPrompt}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDismissPrompt}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                পরে (Later)
              </button>
              <button
                type="button"
                disabled={isSubscribing}
                onClick={handleSubscribe}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>অন করুন (Allow)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
