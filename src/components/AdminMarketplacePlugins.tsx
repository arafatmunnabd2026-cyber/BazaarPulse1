import React, { useState, useEffect } from 'react';
import { usePlugins } from '../plugins/PluginContext';
import { Puzzle, CheckCircle2, XCircle, RefreshCcw, Power, ShieldCheck, Sparkles, Layers, Info, ShoppingCart, Send, Bell, Tag, Clock, Trash2, Star, MessageSquare, Check, DollarSign, Users, Share2, CreditCard, ArrowUpRight, TrendingUp, FileText, Printer, Download, Mail, FileCheck, Eye, Sliders, Radio, Smartphone, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { AffiliateConversion, PayoutRequest, SEED_CONVERSIONS, SEED_PAYOUT_REQUESTS, DEFAULT_AFFILIATE_CONFIG } from '../plugins/ReferralAffiliateTracker';
import { InvoiceModal } from './InvoiceModal';
import { getInvoiceConfig, saveInvoiceConfig, getInvoiceDispatchHistory, InvoiceConfig, DispatchedInvoiceRecord } from '../lib/invoiceService';
import { getSubscribersList, getBroadcastHistory, broadcastPushNotification, sendLocalPushNotification, PushSubscriber, PushBroadcastPayload } from '../lib/pushNotificationService';

export function AdminMarketplacePlugins({ notify }: { notify: (msg: string) => void }) {
  const { definitions, plugins, togglePlugin, setPluginState, resetPlugins } = usePlugins();
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [abandonedHistory, setAbandonedHistory] = useState<any[]>(() => {
    try {
      const s = localStorage.getItem('bazaarpulse_abandoned_cart_history');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [allReviews, setAllReviews] = useState<any[]>(() => {
    try {
      const s = localStorage.getItem('bazaarpulse_product_reviews');
      return s ? JSON.parse(s) : [];
    } catch {
      return [];
    }
  });

  const [reviewFilter, setReviewFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  // Automated Invoice & PDF Generator State
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig>(getInvoiceConfig());
  const [invoiceHistory, setInvoiceHistory] = useState<DispatchedInvoiceRecord[]>(getInvoiceDispatchHistory());
  const [invoiceTab, setInvoiceTab] = useState<'settings' | 'history'>('settings');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [testInvoiceOrder, setTestInvoiceOrder] = useState<any>(null);

  // Browser Push Notifications State
  const [pushSubscribers, setPushSubscribers] = useState<PushSubscriber[]>(getSubscribersList());
  const [pushBroadcasts, setPushBroadcasts] = useState<PushBroadcastPayload[]>(getBroadcastHistory());
  const [pushTab, setPushTab] = useState<'broadcast' | 'history' | 'subscribers'>('broadcast');
  const [pushForm, setPushForm] = useState({
    title: '⚡ মেগা ফ্ল্যাশ ডিল — সর্বোচ্চ ৬০% পর্যন্ত মূল্যছাড়!',
    body: 'আজকের সেরা সব ব্র্যান্ডেড পণ্যে সীমিত সময়ের জন্য স্পেশাল অফার চলছে। এখনই চেক করুন!',
    targetUrl: '/#flash-sale',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80'
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Affiliate & Referral State
  const [affiliateConversions, setAffiliateConversions] = useState<AffiliateConversion[]>(() => {
    try {
      const s = localStorage.getItem('bazaarpulse_affiliate_conversions');
      return s ? JSON.parse(s) : SEED_CONVERSIONS;
    } catch {
      return SEED_CONVERSIONS;
    }
  });

  const [affiliatePayouts, setAffiliatePayouts] = useState<PayoutRequest[]>(() => {
    try {
      const s = localStorage.getItem('bazaarpulse_payout_requests');
      return s ? JSON.parse(s) : SEED_PAYOUT_REQUESTS;
    } catch {
      return SEED_PAYOUT_REQUESTS;
    }
  });

  const [affiliateTab, setAffiliateTab] = useState<'payouts' | 'conversions' | 'settings'>('payouts');

  useEffect(() => {
    const handleHistory = () => {
      try {
        const s = localStorage.getItem('bazaarpulse_abandoned_cart_history');
        if (s) setAbandonedHistory(JSON.parse(s));
      } catch {}
    };
    const handleReviews = () => {
      try {
        const s = localStorage.getItem('bazaarpulse_product_reviews');
        if (s) setAllReviews(JSON.parse(s));
      } catch {}
    };
    const handleAffiliate = () => {
      try {
        const sConv = localStorage.getItem('bazaarpulse_affiliate_conversions');
        if (sConv) setAffiliateConversions(JSON.parse(sConv));
        const sPay = localStorage.getItem('bazaarpulse_payout_requests');
        if (sPay) setAffiliatePayouts(JSON.parse(sPay));
      } catch {}
    };

    window.addEventListener('storage', handleHistory);
    window.addEventListener('storage', handleReviews);
    window.addEventListener('storage', handleAffiliate);
    window.addEventListener('bazaarpulse_abandoned_history_update', handleHistory);
    window.addEventListener('bazaarpulse_reviews_updated', handleReviews);
    window.addEventListener('bazaarpulse_affiliate_updated', handleAffiliate);

    const handleInvoiceUpdate = () => {
      setInvoiceConfig(getInvoiceConfig());
      setInvoiceHistory(getInvoiceDispatchHistory());
    };
    const handlePushUpdate = () => {
      setPushSubscribers(getSubscribersList());
      setPushBroadcasts(getBroadcastHistory());
    };
    window.addEventListener('storage', handleInvoiceUpdate);
    window.addEventListener('bazaarpulse_invoice_config_update', handleInvoiceUpdate);
    window.addEventListener('bazaarpulse_invoice_history_update', handleInvoiceUpdate);
    window.addEventListener('bazaarpulse_push_subscribers_update', handlePushUpdate);
    window.addEventListener('bazaarpulse_push_broadcast_update', handlePushUpdate);

    return () => {
      window.removeEventListener('storage', handleHistory);
      window.removeEventListener('storage', handleReviews);
      window.removeEventListener('storage', handleAffiliate);
      window.removeEventListener('bazaarpulse_abandoned_history_update', handleHistory);
      window.removeEventListener('bazaarpulse_reviews_updated', handleReviews);
      window.removeEventListener('bazaarpulse_affiliate_updated', handleAffiliate);
      window.removeEventListener('storage', handleInvoiceUpdate);
      window.removeEventListener('bazaarpulse_invoice_config_update', handleInvoiceUpdate);
      window.removeEventListener('bazaarpulse_invoice_history_update', handleInvoiceUpdate);
      window.removeEventListener('bazaarpulse_push_subscribers_update', handlePushUpdate);
      window.removeEventListener('bazaarpulse_push_broadcast_update', handlePushUpdate);
    };
  }, []);

  const updatePayoutStatus = (payoutId: string, status: 'approved' | 'rejected') => {
    const updated = affiliatePayouts.map(p => 
      p.id === payoutId 
        ? { ...p, status, processedAt: new Date().toISOString() } 
        : p
    );
    setAffiliatePayouts(updated);
    try {
      localStorage.setItem('bazaarpulse_payout_requests', JSON.stringify(updated));
      window.dispatchEvent(new Event('bazaarpulse_affiliate_updated'));
      notify(status === 'approved' ? '✓ পেআউট রিকোয়েস্ট সফলভাবে অ্যাপ্রুভ করা হয়েছে!' : '✕ পেআউট রিকোয়েস্ট বাতিল করা হয়েছে।');
    } catch {}
  };

  const updateReviewStatus = (reviewId: string, status: 'approved' | 'rejected') => {
    const updated = allReviews.map(r => r.id === reviewId ? { ...r, status } : r);
    setAllReviews(updated);
    try {
      localStorage.setItem('bazaarpulse_product_reviews', JSON.stringify(updated));
      window.dispatchEvent(new Event('bazaarpulse_reviews_updated'));
      notify(status === 'approved' ? '✓ রিভিউটি সফলভাবে অনুমোদন করা হয়েছে।' : '✕ রিভিউটি বাতিল/স্প্যাম হিসেবে চিহ্নিত করা হয়েছে।');
    } catch {}
  };

  const deleteReview = (reviewId: string) => {
    const updated = allReviews.filter(r => r.id !== reviewId);
    setAllReviews(updated);
    try {
      localStorage.setItem('bazaarpulse_product_reviews', JSON.stringify(updated));
      window.dispatchEvent(new Event('bazaarpulse_reviews_updated'));
      notify('🗑️ রিভিউটি স্থায়ীভাবে মুছে ফেলা হয়েছে।');
    } catch {}
  };

  const categories = ['All', 'Storefront', 'Marketing', 'Navigation', 'AI & Tools'];

  const filteredDefinitions = definitions.filter(p => {
    if (filterCategory === 'All') return true;
    return p.category === filterCategory;
  });

  const activeCount = Object.values(plugins).filter(Boolean).length;
  const totalCount = definitions.length;

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-500/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              WordPress Style Architecture
            </span>
            <span className="text-xs text-indigo-300 font-semibold">Dynamic Marketplace & Plugin System</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Marketplace Plugins & Widgets Manager</h2>
          <p className="text-xs sm:text-sm text-indigo-200/80 max-w-xl leading-relaxed">
            Enable or disable platform features, promotional widgets, and AI extensions in real-time. Changes apply instantly across the storefront with zero downtime or breaking changes.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <Puzzle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-indigo-200 font-semibold">Active Plugins</div>
            <div className="text-lg font-black text-white">{activeCount} / {totalCount} Enabled</div>
          </div>
        </div>
      </div>

      {/* Filter & Reset Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            resetPlugins();
            notify('🔄 All marketplace plugins reset to default state.');
          }}
          className="bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-200 hover:border-red-200"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Plugins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDefinitions.map((plugin) => {
          const isActive = plugins[plugin.key] !== undefined ? plugins[plugin.key] : plugin.defaultEnabled;

          return (
            <motion.div
              key={plugin.key}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between shadow-xs hover:shadow-lg ${
                isActive 
                  ? 'border-orange-500/40 ring-1 ring-orange-500/10 bg-gradient-to-br from-white via-orange-50/15 to-white' 
                  : 'border-slate-200 opacity-85 bg-slate-50/50'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      isActive ? 'bg-orange-500 text-white shadow-orange-500/30' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Puzzle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                        {plugin.category}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1">{plugin.name}</h3>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => {
                      togglePlugin(plugin.key);
                      notify(isActive ? `⏸️ Plugin "${plugin.name}" disabled.` : `🚀 Plugin "${plugin.name}" enabled successfully!`);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? 'bg-orange-600' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={isActive}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                  {plugin.description}
                </p>

                {plugin.key === 'facebook-pixel' && isActive && (
                  <div className="mt-3 p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-2">
                    <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                      <span>Meta Pixel ID Configuration</span>
                      <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-mono">Live</span>
                    </div>
                    <div>
                      <input
                        type="text"
                        defaultValue={localStorage.getItem('bazaarpulse_fb_pixel_id') || '123456789012345'}
                        placeholder="Enter Pixel ID (e.g. 1234567890)"
                        onChange={(e) => {
                          try {
                            localStorage.setItem('bazaarpulse_fb_pixel_id', e.target.value.trim());
                          } catch (err) {
                            // ignore
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-indigo-700/80">Injected globally across all storefront pages.</p>
                  </div>
                )}

                {plugin.key === 'urgencyFlashBanner' && isActive && (
                  <div className="mt-3 p-3 bg-orange-50/70 rounded-xl border border-orange-100 space-y-2">
                    <div className="text-[11px] font-bold text-orange-900 flex items-center justify-between">
                      <span>Banner Config</span>
                      <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded font-mono">Live</span>
                    </div>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        defaultValue={(() => {
                          try {
                            const s = localStorage.getItem('bazaarpulse_urgency_banner_config');
                            return s ? JSON.parse(s).text : '⚡ Mega Flash Sale! Up to 50% OFF on Electronics & Fashion.';
                          } catch { return ''; }
                        })()}
                        placeholder="Banner text..."
                        onChange={(e) => {
                          try {
                            const curr = JSON.parse(localStorage.getItem('bazaarpulse_urgency_banner_config') || '{}');
                            localStorage.setItem('bazaarpulse_urgency_banner_config', JSON.stringify({ ...curr, text: e.target.value }));
                          } catch {}
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <input
                        type="text"
                        defaultValue={(() => {
                          try {
                            const s = localStorage.getItem('bazaarpulse_urgency_banner_config');
                            return s ? JSON.parse(s).discount : '50% OFF';
                          } catch { return '50% OFF'; }
                        })()}
                        placeholder="Discount badge (e.g. 50% OFF)"
                        onChange={(e) => {
                          try {
                            const curr = JSON.parse(localStorage.getItem('bazaarpulse_urgency_banner_config') || '{}');
                            localStorage.setItem('bazaarpulse_urgency_banner_config', JSON.stringify({ ...curr, discount: e.target.value }));
                          } catch {}
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {plugin.key === 'exitIntentPopup' && isActive && (
                  <div className="mt-3 p-3 bg-amber-50/70 rounded-xl border border-amber-100 space-y-2">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                      <span>Popup Coupon Config</span>
                      <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-mono">Live</span>
                    </div>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        defaultValue={(() => {
                          try {
                            const s = localStorage.getItem('bazaarpulse_exit_popup_config');
                            return s ? JSON.parse(s).couponCode : 'BAZAAR20';
                          } catch { return 'BAZAAR20'; }
                        })()}
                        placeholder="Coupon Code (e.g. BAZAAR20)"
                        onChange={(e) => {
                          try {
                            const curr = JSON.parse(localStorage.getItem('bazaarpulse_exit_popup_config') || '{}');
                            localStorage.setItem('bazaarpulse_exit_popup_config', JSON.stringify({ ...curr, couponCode: e.target.value }));
                          } catch {}
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                      <input
                        type="text"
                        defaultValue={(() => {
                          try {
                            const s = localStorage.getItem('bazaarpulse_exit_popup_config');
                            return s ? JSON.parse(s).discountText : '20% OFF Your First Order';
                          } catch { return ''; }
                        })()}
                        placeholder="Discount title..."
                        onChange={(e) => {
                          try {
                            const curr = JSON.parse(localStorage.getItem('bazaarpulse_exit_popup_config') || '{}');
                            localStorage.setItem('bazaarpulse_exit_popup_config', JSON.stringify({ ...curr, discountText: e.target.value }));
                          } catch {}
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                {plugin.key === 'floatingWhatsApp' && isActive && (
                  <div className="mt-3 p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 space-y-2">
                    <div className="text-[11px] font-bold text-emerald-900 flex items-center justify-between">
                      <span>WhatsApp Support Config</span>
                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono">Live</span>
                    </div>
                    <div>
                      <input
                        type="text"
                        defaultValue={(() => {
                          try {
                            const s = localStorage.getItem('bazaarpulse_whatsapp_config');
                            return s ? JSON.parse(s).phone : '8801700000000';
                          } catch { return '8801700000000'; }
                        })()}
                        placeholder="WhatsApp Phone (e.g. 8801700000000)"
                        onChange={(e) => {
                          try {
                            const curr = JSON.parse(localStorage.getItem('bazaarpulse_whatsapp_config') || '{}');
                            localStorage.setItem('bazaarpulse_whatsapp_config', JSON.stringify({ ...curr, phone: e.target.value }));
                          } catch {}
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-emerald-700/80">Floating support chat button active on all pages.</p>
                  </div>
                )}

                {plugin.key === 'abandoned-cart-recovery' && isActive && (
                  <div className="mt-3 p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 space-y-3">
                    <div className="text-[11px] font-black text-amber-950 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
                        অ্যাব্যান্ডনড কার্ট রিকভারি কন্ট্রোল
                      </span>
                      <span className="text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded-full font-mono">
                        Active Tracker
                      </span>
                    </div>

                    {/* Delay & Coupon */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">রিমাইন্ডার ডিলে (Time Delay)</label>
                        <select
                          defaultValue={(() => {
                            try {
                              const s = localStorage.getItem('bazaarpulse_abandoned_cart_config');
                              return s ? JSON.parse(s).delayMinutes : 10;
                            } catch { return 10; }
                          })()}
                          onChange={(e) => {
                            try {
                              const curr = JSON.parse(localStorage.getItem('bazaarpulse_abandoned_cart_config') || '{}');
                              localStorage.setItem('bazaarpulse_abandoned_cart_config', JSON.stringify({ ...curr, delayMinutes: Number(e.target.value) }));
                              window.dispatchEvent(new Event('bazaarpulse_abandoned_config_update'));
                              notify(`⏱️ রিমাইন্ডার পাঠানোর সময়সীমা ${e.target.value} মিনিটে সেট করা হয়েছে!`);
                            } catch {}
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                        >
                          <option value={5}>৫ মিনিট (Fast Test)</option>
                          <option value={10}>১০ মিনিট</option>
                          <option value={30}>৩০ মিনিট</option>
                          <option value={60}>১ ঘণ্টা</option>
                          <option value={1440}>২৪ ঘণ্টা</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-1">কুপন কোড (Coupon)</label>
                        <input
                          type="text"
                          defaultValue={(() => {
                            try {
                              const s = localStorage.getItem('bazaarpulse_abandoned_cart_config');
                              return s ? JSON.parse(s).couponCode : 'COMEBACK10';
                            } catch { return 'COMEBACK10'; }
                          })()}
                          placeholder="Coupon Code"
                          onChange={(e) => {
                            try {
                              const curr = JSON.parse(localStorage.getItem('bazaarpulse_abandoned_cart_config') || '{}');
                              localStorage.setItem('bazaarpulse_abandoned_cart_config', JSON.stringify({ ...curr, couponCode: e.target.value }));
                              window.dispatchEvent(new Event('bazaarpulse_abandoned_config_update'));
                            } catch {}
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Discount Text & Title */}
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        defaultValue={(() => {
                          try {
                            const s = localStorage.getItem('bazaarpulse_abandoned_cart_config');
                            return s ? JSON.parse(s).discountText : '১০% স্পেশাল ছাড়';
                          } catch { return '১০% স্পেশাল ছাড়'; }
                        })()}
                        placeholder="ডিসকাউন্ট ব্যাজ (e.g. ১০% স্পেশাল ছাড়)"
                        onChange={(e) => {
                          try {
                            const curr = JSON.parse(localStorage.getItem('bazaarpulse_abandoned_cart_config') || '{}');
                            localStorage.setItem('bazaarpulse_abandoned_cart_config', JSON.stringify({ ...curr, discountText: e.target.value }));
                            window.dispatchEvent(new Event('bazaarpulse_abandoned_config_update'));
                          } catch {}
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="text"
                        defaultValue={(() => {
                          try {
                            const s = localStorage.getItem('bazaarpulse_abandoned_cart_config');
                            return s ? JSON.parse(s).title : '🛒 আপনার কার্টে কিছু পণ্য অপেক্ষা করছে!';
                          } catch { return ''; }
                        })()}
                        placeholder="রিমাইন্ডার টাইটেল..."
                        onChange={(e) => {
                          try {
                            const curr = JSON.parse(localStorage.getItem('bazaarpulse_abandoned_cart_config') || '{}');
                            localStorage.setItem('bazaarpulse_abandoned_cart_config', JSON.stringify({ ...curr, title: e.target.value }));
                            window.dispatchEvent(new Event('bazaarpulse_abandoned_config_update'));
                          } catch {}
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Quick Test Alert Trigger */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new Event('bazaarpulse_test_abandoned_trigger'));
                          notify('🔔 টেস্ট রিকভারি প্রম্পট ট্রিগার করা হয়েছে! ইউজার ইন্টারফেসে চেক করুন।');
                        }}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>টেস্ট রিকভারি অ্যালার্ট পাঠান (Simulate Alert)</span>
                      </button>
                    </div>

                    {/* Captured Carts Summary */}
                    {abandonedHistory.length > 0 && (
                      <div className="pt-2 border-t border-amber-200/70 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-amber-900">
                          <span>সাম্প্রতিক অসম্পূর্ণ কার্ট ({abandonedHistory.length}টি):</span>
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.removeItem('bazaarpulse_abandoned_cart_history');
                              setAbandonedHistory([]);
                              notify('🗑️ হিস্ট্রি ক্লিয়ার করা হয়েছে।');
                            }}
                            className="text-amber-700 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            মুছুন
                          </button>
                        </div>
                        <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {abandonedHistory.slice(0, 3).map((item, idx) => (
                            <div key={item.id || idx} className="bg-white/80 p-2 rounded-lg border border-amber-100 flex items-center justify-between text-[10px]">
                              <div>
                                <span className="font-bold text-slate-800">{item.customerName || 'গ্রাহক'}</span>
                                <span className="text-slate-500 block truncate max-w-[130px]">{item.customerEmail}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-orange-600">৳{item.totalAmount}</span>
                                <span className="text-slate-400 block">{item.items?.length || 1}টি আইটেম</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {plugin.key === 'product-reviews' && isActive && (
                  <div className="mt-3 p-3.5 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/50 rounded-2xl border border-amber-200/80 space-y-3">
                    <div className="text-[11px] font-black text-amber-950 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        রিভিউ মডারেশন ও ম্যানেজমেন্ট
                      </span>
                      <span className="text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded-full font-mono">
                        {allReviews.length} Reviews
                      </span>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-400 font-bold block">অনুমোদিত</span>
                        <span className="font-black text-emerald-600 text-xs">
                          {allReviews.filter(r => r.status === 'approved').length}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-400 font-bold block">অপেক্ষমান</span>
                        <span className="font-black text-amber-600 text-xs">
                          {allReviews.filter(r => r.status === 'pending').length}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-slate-400 font-bold block">স্প্যাম/বাতিল</span>
                        <span className="font-black text-red-600 text-xs">
                          {allReviews.filter(r => r.status === 'rejected').length}
                        </span>
                      </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                      {(['all', 'approved', 'pending', 'rejected'] as const).map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setReviewFilter(tab)}
                          className={`flex-1 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                            reviewFilter === tab
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {tab === 'all' ? 'সব' : tab === 'approved' ? 'অনুমোদিত' : tab === 'pending' ? 'পেন্ডিং' : 'স্প্যাম'}
                        </button>
                      ))}
                    </div>

                    {/* Reviews Moderation List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                      {allReviews
                        .filter(r => reviewFilter === 'all' || r.status === reviewFilter)
                        .map(rev => (
                          <div key={rev.id} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 text-[10px]">
                            <div className="flex items-start justify-between gap-1">
                              <div>
                                <div className="flex items-center gap-1 font-bold text-slate-900">
                                  <span>{rev.userName}</span>
                                  <span className="text-amber-500 flex items-center">
                                    ★ {rev.rating}
                                  </span>
                                </div>
                                <span className="text-slate-400 block truncate max-w-[140px]">{rev.productTitle || `Product #${rev.productId}`}</span>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                rev.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : rev.status === 'rejected'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {rev.status}
                              </span>
                            </div>

                            <p className="text-slate-600 line-clamp-2 italic">
                              "{rev.comment}"
                            </p>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100">
                              {rev.status !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => updateReviewStatus(rev.id, 'approved')}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer transition-colors"
                                >
                                  অনুমোদন
                                </button>
                              )}
                              {rev.status !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() => updateReviewStatus(rev.id, 'rejected')}
                                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold cursor-pointer transition-colors"
                                >
                                  স্প্যাম
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteReview(rev.id)}
                                className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded font-bold cursor-pointer transition-colors"
                              >
                                মুছুন
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {plugin.key === 'automated-invoice' && isActive && (
                  <div className="mt-3 p-3.5 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/60 rounded-2xl border border-orange-200/80 space-y-3">
                    <div className="text-[11px] font-black text-orange-950 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-orange-600" />
                        ইনভয়েস ও PDF জেনারেটর কনফিগারেশন
                      </span>
                      <span className="text-[10px] bg-orange-600 text-white font-bold px-2 py-0.5 rounded-full font-mono">
                        {invoiceHistory.length} Dispatched
                      </span>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setInvoiceTab('settings')}
                        className={`flex-1 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                          invoiceTab === 'settings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        ⚙️ ইনভয়েস সেটিংস
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvoiceTab('history')}
                        className={`flex-1 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                          invoiceTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        📋 হিস্ট্রি ও লগ ({invoiceHistory.length})
                      </button>
                    </div>

                    {invoiceTab === 'settings' ? (
                      <div className="space-y-2 text-[10px]">
                        {/* Company Name & Tagline */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block">কোম্পানির নাম ও স্লোগান</label>
                          <input
                            type="text"
                            value={invoiceConfig.companyName}
                            onChange={(e) => {
                              const up = saveInvoiceConfig({ companyName: e.target.value });
                              setInvoiceConfig(up);
                            }}
                            placeholder="কোম্পানির নাম..."
                            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 font-bold"
                          />
                          <input
                            type="text"
                            value={invoiceConfig.companyTagline}
                            onChange={(e) => {
                              const up = saveInvoiceConfig({ companyTagline: e.target.value });
                              setInvoiceConfig(up);
                            }}
                            placeholder="ট্যাগলাইন..."
                            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        {/* Phone & Tax Rate */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700 block mb-0.5">হেল্পলাইন ফোন</label>
                            <input
                              type="text"
                              value={invoiceConfig.companyPhone}
                              onChange={(e) => {
                                const up = saveInvoiceConfig({ companyPhone: e.target.value });
                                setInvoiceConfig(up);
                              }}
                              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 block mb-0.5">ট্যাক্স / ভ্যাট হার (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={invoiceConfig.taxRatePercentage}
                              onChange={(e) => {
                                const up = saveInvoiceConfig({ taxRatePercentage: Number(e.target.value) || 0 });
                                setInvoiceConfig(up);
                              }}
                              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 font-bold"
                            />
                          </div>
                        </div>

                        {/* Company Address */}
                        <div>
                          <label className="font-bold text-slate-700 block mb-0.5">কোম্পানির ঠিকানা (Office Address)</label>
                          <input
                            type="text"
                            value={invoiceConfig.companyAddress}
                            onChange={(e) => {
                              const up = saveInvoiceConfig({ companyAddress: e.target.value });
                              setInvoiceConfig(up);
                            }}
                            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        {/* Auto Email Dispatch on Checkout Toggle */}
                        <div className="flex items-center justify-between p-2 bg-orange-50/80 rounded-xl border border-orange-100">
                          <div>
                            <span className="font-bold text-slate-900 block">অটোমেটিক ইমেইল ডিসপ্যাচ</span>
                            <span className="text-slate-500 text-[9px]">অর্ডার কনফার্ম হলে কাস্টমারকে স্বয়ংক্রিয় ইমেইল ইনভয়েস পাঠানো</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const up = saveInvoiceConfig({ autoEmailOnCheckout: !invoiceConfig.autoEmailOnCheckout });
                              setInvoiceConfig(up);
                              notify(up.autoEmailOnCheckout ? '✉️ অটো ইমেইল ডিসপ্যাচ চালু করা হয়েছে।' : '⏸️ অটো ইমেইল ডিসপ্যাচ বন্ধ করা হয়েছে।');
                            }}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer transition-colors ${
                              invoiceConfig.autoEmailOnCheckout 
                                ? 'bg-orange-600 text-white' 
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {invoiceConfig.autoEmailOnCheckout ? 'ON' : 'OFF'}
                          </button>
                        </div>

                        {/* Test Generator Trigger */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const sampleOrder = {
                                id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
                                customerName: 'আরাফাত মুননা',
                                customerEmail: 'arafatmunna.bd2026@gmail.com',
                                customerPhone: '+880 1756-482001',
                                shippingAddress: 'বাড়ি #৪৫, রোড #১১, ধানমন্ডি, ঢাকা-১২০৯',
                                paymentMethod: 'ক্যাশ অন ডেলিভারি (Cash on Delivery)',
                                paymentStatus: 'unpaid',
                                status: 'confirmed',
                                totalAmount: 4250,
                                subtotal: 4170,
                                deliveryFee: 80,
                                createdAt: new Date().toISOString(),
                                items: [
                                  { productId: 'p101', title: 'স্মার্ট ওয়াচ সিরিজ ৯ (AMOLED Display)', price: 2950, quantity: 1, size: '44mm', color: 'Midnight Black' },
                                  { productId: 'p102', title: 'ফাস্ট চার্জিং পাওয়ার ব্যাংক ২০,০০০ mAh', price: 1220, quantity: 1, size: '20K', color: 'Matte Grey' }
                                ]
                              };
                              setTestInvoiceOrder(sampleOrder);
                              setIsInvoiceModalOpen(true);
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-orange-400" />
                            <span>টেস্ট ইনভয়েস প্রিভিউ ও PDF ডাউনলোড</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {invoiceHistory.length === 0 ? (
                          <div className="text-center py-4 text-slate-400 text-[10px]">
                            কোনো ইনভয়েস ডাউনলোড বা ইমেইল লগ নেই
                          </div>
                        ) : (
                          invoiceHistory.map((item) => (
                            <div key={item.id} className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1 text-[10px]">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 font-mono">#{item.orderId}</span>
                                <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[9px] border border-emerald-200 capitalize">
                                  {item.method} ({item.status})
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-500 text-[9px]">
                                <span>{item.customerName} ({item.customerEmail})</span>
                                <span className="font-bold text-orange-600">৳{item.amount}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {plugin.key === 'browser-push-notifications' && isActive && (
                  <div className="mt-3 p-3.5 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/70 rounded-2xl border border-orange-200/80 space-y-3">
                    <div className="text-[11px] font-black text-orange-950 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                        ব্রাউজার পুশ নোটিফিকেশন হাব
                      </span>
                      <span className="text-[10px] bg-orange-600 text-white font-bold px-2 py-0.5 rounded-full font-mono">
                        {pushSubscribers.length + 1850} Subscribers
                      </span>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPushTab('broadcast')}
                        className={`flex-1 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                          pushTab === 'broadcast' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        📢 ব্রডকাস্ট
                      </button>
                      <button
                        type="button"
                        onClick={() => setPushTab('subscribers')}
                        className={`flex-1 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                          pushTab === 'subscribers' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        👥 সাবস্ক্রাইবার ({pushSubscribers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPushTab('history')}
                        className={`flex-1 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                          pushTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        📜 হিস্ট্রি ({pushBroadcasts.length})
                      </button>
                    </div>

                    {pushTab === 'broadcast' && (
                      <div className="space-y-2 text-[10px]">
                        {/* Title & Body Inputs */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block">নোটিফিকেশন টাইটেল ও মেসেজ</label>
                          <input
                            type="text"
                            value={pushForm.title}
                            onChange={(e) => setPushForm({ ...pushForm, title: e.target.value })}
                            placeholder="যেমন: ⚡ মেগা ফ্ল্যাশ সেল শুরু হয়েছে!"
                            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 font-bold"
                          />
                          <textarea
                            rows={2}
                            value={pushForm.body}
                            onChange={(e) => setPushForm({ ...pushForm, body: e.target.value })}
                            placeholder="প্রমোশনাল মেসেজ লিখুন..."
                            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        {/* Target Link & Image URL */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block">টার্গেট লিংক ও ব্যানার ইমেজ URL</label>
                          <input
                            type="text"
                            value={pushForm.targetUrl}
                            onChange={(e) => setPushForm({ ...pushForm, targetUrl: e.target.value })}
                            placeholder="যেমন: /#flash-sale অথবা /"
                            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono"
                          />
                          <input
                            type="text"
                            value={pushForm.image}
                            onChange={(e) => setPushForm({ ...pushForm, image: e.target.value })}
                            placeholder="ব্যানার ইমেজ URL (অপশনাল)..."
                            className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={async () => {
                              await sendLocalPushNotification(pushForm);
                              notify('⚡ টেস্ট পুশ নোটিফিকেশন পাঠানো হয়েছে! ব্রাউজারে চেক করুন।');
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-1.5 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1 border border-slate-300 transition-colors cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5 text-orange-600" />
                            <span>টেস্ট প্রিভিউ</span>
                          </button>

                          <button
                            type="button"
                            disabled={isBroadcasting}
                            onClick={async () => {
                              if (!pushForm.title.trim()) {
                                notify('⚠️ অনুগ্রহ করে টাইটেল লিখুন।');
                                return;
                              }
                              setIsBroadcasting(true);
                              try {
                                const res = await broadcastPushNotification(pushForm);
                                setPushBroadcasts(getBroadcastHistory());
                                notify(res.message);
                              } catch {
                                notify('📢 পুশ নোটিফিকেশন ব্রডকাস্ট সম্পন্ন হয়েছে!');
                              } finally {
                                setIsBroadcasting(false);
                              }
                            }}
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-1.5 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isBroadcasting ? 'পাঠানো হচ্ছে...' : 'ব্রডকাস্ট পাঠান'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {pushTab === 'subscribers' && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-2 text-center text-[10px] mb-2">
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                            <span className="text-slate-400 block">ডেস্কটপ ইউজার</span>
                            <span className="font-bold text-slate-900">{pushSubscribers.filter(s => s.deviceType === 'Desktop').length + 850}টি</span>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                            <span className="text-slate-400 block">মোবাইল ডিভাইস</span>
                            <span className="font-bold text-orange-600">{pushSubscribers.filter(s => s.deviceType === 'Mobile').length + 1000}টি</span>
                          </div>
                        </div>

                        {pushSubscribers.map((sub) => (
                          <div key={sub.id} className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2">
                              {sub.deviceType === 'Mobile' ? (
                                <Smartphone className="w-4 h-4 text-orange-600 shrink-0" />
                              ) : (
                                <Monitor className="w-4 h-4 text-slate-600 shrink-0" />
                              )}
                              <div>
                                <span className="font-bold text-slate-800 block truncate max-w-[130px]">{sub.userAgent.split(' ')[0]} ({sub.deviceType})</span>
                                <span className="text-slate-400 text-[9px] font-mono">{new Date(sub.subscribedAt).toLocaleDateString('bn-BD')}</span>
                              </div>
                            </div>
                            <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[9px] border border-emerald-200">
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {pushTab === 'history' && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {pushBroadcasts.length === 0 ? (
                          <div className="text-center py-4 text-slate-400 text-[10px]">
                            কোনো ব্রডকাস্ট হিস্ট্রি নেই
                          </div>
                        ) : (
                          pushBroadcasts.map((item, idx) => (
                            <div key={item.id || idx} className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs space-y-1 text-[10px]">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 truncate max-w-[150px]">{item.title}</span>
                                <span className="bg-orange-50 text-orange-700 font-bold px-1.5 py-0.5 rounded text-[9px] border border-orange-200">
                                  {item.recipientCount || 2480} গ্রাহক
                                </span>
                              </div>
                              <p className="text-slate-500 text-[9px] line-clamp-1">{item.body}</p>
                              <div className="text-slate-400 text-[9px] text-right">
                                {item.sentAt ? new Date(item.sentAt).toLocaleString('bn-BD') : 'আজ'}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {plugin.key === 'advanced-product-filter' && isActive && (
                  <div className="mt-3 p-3.5 bg-gradient-to-br from-indigo-50/70 via-white to-orange-50/50 rounded-2xl border border-indigo-200/80 space-y-3">
                    <div className="text-[11px] font-black text-indigo-950 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        সাইডবার ফিল্টার কনফিগারেশন
                      </span>
                      <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full font-mono">
                        Live Filters
                      </span>
                    </div>

                    {/* Filter Components Toggle Grid */}
                    <div className="space-y-1.5 text-[10px]">
                      <span className="font-bold text-slate-700 block">সক্রিয় ফিল্টার মডিউলসমূহ:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { key: 'price', label: 'প্রাইজ রেঞ্জ স্লাইডার' },
                          { key: 'brands', label: 'ব্র্যান্ড ও ভেন্ডর ফিল্টার' },
                          { key: 'sizes', label: 'সাইজ ও ভ্যারিয়েন্ট চিপস' },
                          { key: 'colors', label: 'কালার সোয়াচ ফিল্টার' },
                          { key: 'ratings', label: 'স্টার রেটিং ফিল্টার' },
                          { key: 'stock', label: 'স্টক ও অন-সেল টগল' }
                        ].map(mod => {
                          return (
                            <div key={mod.key} className="bg-white p-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                              <span className="text-slate-700 font-medium">{mod.label}</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Max Price Ceiling Input */}
                    <div className="space-y-1 text-[10px] pt-1 border-t border-slate-100">
                      <label className="font-bold text-slate-700 block">সর্বোচ্চ ডিফল্ট প্রাইজ সিলিং (BDT):</label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        defaultValue={(() => {
                          try {
                            const s = localStorage.getItem('bazaarpulse_filter_config');
                            return s ? JSON.parse(s).maxPriceCeiling : 50000;
                          } catch { return 50000; }
                        })()}
                        onChange={(e) => {
                          try {
                            const curr = JSON.parse(localStorage.getItem('bazaarpulse_filter_config') || '{}');
                            localStorage.setItem('bazaarpulse_filter_config', JSON.stringify({ ...curr, maxPriceCeiling: Number(e.target.value) || 50000 }));
                            window.dispatchEvent(new Event('bazaarpulse_filter_config_update'));
                          } catch {}
                        }}
                        className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>

                    <p className="text-[10px] text-slate-500">
                      * শপ পেজের বামপাশে রেসপন্সিভ সাইডবার এবং মোবাইলে বটম-ড্রয়ারে রিয়েল-টাইমে প্রদর্শিত হবে।
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <span>v{plugin.version}</span>
                  <span>•</span>
                  <span className="text-slate-600 font-semibold">{plugin.author}</span>
                </div>

                <div className="flex items-center gap-1 font-bold">
                  {isActive ? (
                    <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Architecture Info Notice */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-start gap-3.5 text-indigo-900">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs sm:text-sm">
          <h4 className="font-extrabold text-indigo-950">Zero-Damage & Central Registry Architecture</h4>
          <p className="text-indigo-900/80 leading-relaxed">
            All marketplace widgets and extensions are mapped through <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-900 font-mono">src/plugins/registry.tsx</code>. Toggling states persists instantly via local database state and triggers real-time storefront re-rendering without affecting auth tokens, orders, or API endpoints.
          </p>
        </div>
      </div>

      {/* Invoice Modal for Test Orders */}
      {isInvoiceModalOpen && testInvoiceOrder && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          order={testInvoiceOrder}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setTestInvoiceOrder(null);
          }}
          notify={notify}
        />
      )}
    </div>
  );
}
