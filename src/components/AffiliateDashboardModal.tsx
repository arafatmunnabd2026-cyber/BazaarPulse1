import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Users, DollarSign, MousePointerClick, Share2, Copy, Check, 
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, Sparkles, 
  CreditCard, Send, TrendingUp, HelpCircle, ExternalLink, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AffiliateConversion, PayoutRequest, AffiliateConfig, 
  DEFAULT_AFFILIATE_CONFIG, SEED_CONVERSIONS, SEED_PAYOUT_REQUESTS 
} from '../plugins/ReferralAffiliateTracker';

interface AffiliateDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser: any;
  notify: (msg: string) => void;
}

export const AffiliateDashboardModal: React.FC<AffiliateDashboardModalProps> = ({
  isOpen,
  onClose,
  authUser,
  notify
}) => {
  const [copied, setCopied] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank Transfer'>('bKash');
  const [accountNumber, setAccountNumber] = useState('');
  const [payoutAmount, setPayoutAmount] = useState<number>(500);
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'conversions' | 'payouts'>('overview');

  // Load Config
  const [config, setConfig] = useState<AffiliateConfig>(() => {
    try {
      const s = localStorage.getItem('bazaarpulse_affiliate_config');
      return s ? { ...DEFAULT_AFFILIATE_CONFIG, ...JSON.parse(s) } : DEFAULT_AFFILIATE_CONFIG;
    } catch {
      return DEFAULT_AFFILIATE_CONFIG;
    }
  });

  // Unique Referral Code for current user
  const userReferralCode = useMemo(() => {
    if (!authUser) return 'GUEST2026';
    if (authUser.referralCode) return authUser.referralCode;
    const cleanName = (authUser.name || 'USER').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    return `${cleanName || 'USER'}${String(authUser.id || '26').slice(-2)}`;
  }, [authUser]);

  // Generate Referral URL
  const referralUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bazaarpulse.com';
    return `${origin}/?ref=${userReferralCode}`;
  }, [userReferralCode]);

  // Conversions State
  const [conversions, setConversions] = useState<AffiliateConversion[]>(() => {
    try {
      const s = localStorage.getItem('bazaarpulse_affiliate_conversions');
      return s ? JSON.parse(s) : SEED_CONVERSIONS;
    } catch {
      return SEED_CONVERSIONS;
    }
  });

  // Payout Requests State
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>(() => {
    try {
      const s = localStorage.getItem('bazaarpulse_payout_requests');
      return s ? JSON.parse(s) : SEED_PAYOUT_REQUESTS;
    } catch {
      return SEED_PAYOUT_REQUESTS;
    }
  });

  // Clicks state
  const [clicks, setClicks] = useState<number>(() => {
    try {
      const s = localStorage.getItem('bazaarpulse_affiliate_clicks');
      if (s) {
        const map = JSON.parse(s);
        return map[userReferralCode] || 38;
      }
      return 38;
    } catch {
      return 38;
    }
  });

  // Sync data on changes
  useEffect(() => {
    const handleSync = () => {
      try {
        const sConv = localStorage.getItem('bazaarpulse_affiliate_conversions');
        if (sConv) setConversions(JSON.parse(sConv));

        const sPay = localStorage.getItem('bazaarpulse_payout_requests');
        if (sPay) setPayoutRequests(JSON.parse(sPay));

        const sClicks = localStorage.getItem('bazaarpulse_affiliate_clicks');
        if (sClicks) {
          const map = JSON.parse(sClicks);
          setClicks(map[userReferralCode] || 38);
        }

        const sConf = localStorage.getItem('bazaarpulse_affiliate_config');
        if (sConf) setConfig({ ...DEFAULT_AFFILIATE_CONFIG, ...JSON.parse(sConf) });
      } catch (e) {}
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('bazaarpulse_affiliate_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('bazaarpulse_affiliate_updated', handleSync);
    };
  }, [userReferralCode]);

  // Calculate User Affiliate Metrics
  const userConversions = useMemo(() => {
    return conversions.filter(c => 
      c.referralCode === userReferralCode || 
      c.referrerName?.toLowerCase() === authUser?.name?.toLowerCase()
    );
  }, [conversions, userReferralCode, authUser]);

  const userPayouts = useMemo(() => {
    return payoutRequests.filter(p => 
      p.referralCode === userReferralCode || 
      p.userEmail === authUser?.email
    );
  }, [payoutRequests, userReferralCode, authUser]);

  const totalEarnings = useMemo(() => {
    return userConversions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  }, [userConversions]);

  const totalWithdrawn = useMemo(() => {
    return userPayouts
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [userPayouts]);

  const pendingWithdrawal = useMemo(() => {
    return userPayouts
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [userPayouts]);

  const availableBalance = Math.max(0, totalEarnings - totalWithdrawn - pendingWithdrawal);

  // Copy Referral Link Helper
  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    notify('📋 রেফারেল লিংক কপি হয়েছে! বন্ধুদের সাথে শেয়ার করে আয় করুন।');
    setTimeout(() => setCopied(false), 2500);
  };

  // Social Share Helpers
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`বাজার প্লাস (BazaarPulse)-এ আকর্ষণীয় মূল্যছাড়ে কেনাকাটা করুন এবং সেরা অফার উপভোগ করুন! ভিজিট করুন: ${referralUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(referralUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  // Submit Payout Request
  const handleSubmitPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) {
      notify('❌ অনুগ্রহ করে সঠিক মোবাইল ব্যাংকিং বা অ্যাকাউন্ট নম্বর লিখুন।');
      return;
    }

    if (payoutAmount < config.minPayoutAmount) {
      notify(`❌ সর্বনিম্ন উত্তোলনের পরিমাণ ৳${config.minPayoutAmount}।`);
      return;
    }

    if (payoutAmount > availableBalance) {
      notify('❌ পর্যাপ্ত উত্তোলনযোগ্য ব্যালেন্স নেই।');
      return;
    }

    setSubmittingPayout(true);

    const newRequest: PayoutRequest = {
      id: `pay-${Date.now()}`,
      referralCode: userReferralCode,
      userName: authUser?.name || 'Affiliate Partner',
      userEmail: authUser?.email || 'affiliate@bazaarpulse.com',
      paymentMethod: payoutMethod,
      accountNumber: accountNumber.trim(),
      amount: Number(payoutAmount),
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    const updated = [newRequest, ...payoutRequests];
    setPayoutRequests(updated);
    try {
      localStorage.setItem('bazaarpulse_payout_requests', JSON.stringify(updated));
      window.dispatchEvent(new Event('bazaarpulse_affiliate_updated'));
    } catch (e) {}

    setSubmittingPayout(false);
    setAccountNumber('');
    notify('🎉 পেআউট রিকোয়েস্ট সফলভাবে জমা হয়েছে! এডমিন যাচাই করে দ্রুত পেমেন্ট পাঠাবেন।');
    setActiveTab('payouts');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs text-left">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
        >
          {/* Top Banner Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative shrink-0">
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Referral & Affiliate Program
              </span>
              <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> {config.commissionRate}% লাইফটাইম কমিশন
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              অ্যাফিলিয়েট ও রেফারেল ড্যাশবোর্ড
            </h2>
            <p className="text-xs text-indigo-200/80 mt-1 max-w-xl">
              আপনার বন্ধুদের সাথে রেফারেল লিংক শেয়ার করুন এবং প্রতিটি সফল অর্ডারে জিতে নিন আকর্ষণীয় নগদ কমিশন।
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
            {[
              { id: 'overview', label: 'ওভারভিউ ও লিংক', icon: Share2 },
              { id: 'conversions', label: `অর্ডার কনভার্সন (${userConversions.length})`, icon: TrendingUp },
              { id: 'payouts', label: `পেআউট হিস্ট্রি (${userPayouts.length})`, icon: CreditCard }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 px-3 text-xs font-extrabold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Content Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-emerald-800 block">মোট অর্জিত কমিশন</span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                      ৳{totalEarnings}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold">{userConversions.length}টি সফল সেল</span>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-orange-800 block">উত্তোলনযোগ্য ব্যালেন্স</span>
                    <div className="text-xl sm:text-2xl font-black text-orange-600 mt-1">
                      ৳{availableBalance}
                    </div>
                    <span className="text-[10px] text-orange-500 font-semibold">মিনিমাম ৳{config.minPayoutAmount}</span>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-blue-800 block">লিংক ক্লিক সংখ্যা</span>
                    <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                      {clicks}
                    </div>
                    <span className="text-[10px] text-blue-600 font-semibold">ট্র্যাকিং অ্যাক্টিভ</span>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-purple-800 block">কমিশন পার্সেন্টেজ</span>
                    <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">
                      {config.commissionRate}%
                    </div>
                    <span className="text-[10px] text-purple-600 font-semibold">{config.cookieDays} দিন কুকি ভ্যালিডিটি</span>
                  </div>
                </div>

                {/* Unique Referral Link Box */}
                <div className="bg-gradient-to-r from-orange-50/70 via-white to-amber-50/70 p-5 rounded-3xl border border-orange-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <Share2 className="w-4 h-4 text-orange-600" />
                        আপনার পার্সোনাল রেফারেল লিংক
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        এই লিংকে ক্লিক করে কেউ যেকোনো প্রোডাক্ট কিনলেই আপনি {config.commissionRate}% কমিশন পাবেন।
                      </p>
                    </div>
                    <span className="font-mono text-xs font-black bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg border border-orange-200">
                      Code: {userReferralCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-orange-300 shadow-xs">
                    <input
                      type="text"
                      readOnly
                      value={referralUrl}
                      className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-transparent border-0 font-mono text-slate-800 focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'কপি হয়েছে!' : 'লিংক কপি করুন'}</span>
                    </button>
                  </div>

                  {/* Social Share Buttons */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="text-xs font-bold text-slate-600">সোশ্যাল মিডিয়ায় শেয়ার:</span>
                    <button
                      onClick={handleShareWhatsApp}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>WhatsApp Share</span>
                    </button>
                    <button
                      onClick={handleShareFacebook}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Facebook Share</span>
                    </button>
                  </div>
                </div>

                {/* Request Payout Form */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">কমিশন উইথড্র / পেআউট রিকোয়েস্ট</h4>
                        <p className="text-[11px] text-slate-500">বিকাশ, নগদ বা ব্যাংকের মাধ্যমে ক্যাশআউট করুন</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block font-semibold">উত্তোলনযোগ্য</span>
                      <span className="text-sm font-black text-emerald-600">৳{availableBalance}</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmitPayout} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">পেমেন্ট মাধ্যম</label>
                        <select
                          value={payoutMethod}
                          onChange={(e) => setPayoutMethod(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
                        >
                          <option value="bKash">bKash (বিকাশ পার্সোনাল)</option>
                          <option value="Nagad">Nagad (নগদ)</option>
                          <option value="Rocket">Rocket (রকেট)</option>
                          <option value="Bank Transfer">Bank Transfer (ব্যাংক একাউন্ট)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">অ্যাকাউন্ট / মোবাইল নম্বর</label>
                        <input
                          type="text"
                          required
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="যেমন: 01712345678"
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">টাকার পরিমাণ (৳)</label>
                        <input
                          type="number"
                          min={config.minPayoutAmount}
                          max={availableBalance || config.minPayoutAmount}
                          value={payoutAmount}
                          onChange={(e) => setPayoutAmount(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        * সর্বনিম্ন উইথড্র ৳{config.minPayoutAmount}। ২৪ ঘণ্টার মধ্যে পেমেন্ট প্রসেস করা হবে।
                      </span>
                      <button
                        type="submit"
                        disabled={submittingPayout || availableBalance < config.minPayoutAmount}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>উইথড্র রিকোয়েস্ট পাঠান</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 2. CONVERSIONS TAB */}
            {activeTab === 'conversions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900">রেফারেলের মাধ্যমে হওয়া সফল সেলস</h4>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                    মোট সেলস: {userConversions.length}টি
                  </span>
                </div>

                {userConversions.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
                    <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h5 className="font-bold text-slate-700 text-sm">এখনো কোনো রেফারেল সেল রেকর্ড হয়নি</h5>
                    <p className="text-xs text-slate-500 mt-1">আপনার বন্ধুদের সাথে রেফারেল লিংক শেয়ার করে প্রথম কমিশন অর্জন করুন!</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">অর্ডার আইডি</th>
                            <th className="p-3">ক্রেতা</th>
                            <th className="p-3">তারিখ</th>
                            <th className="p-3">অর্ডার মূল্য</th>
                            <th className="p-3">অর্জিত কমিশন</th>
                            <th className="p-3 text-right">স্ট্যাটাস</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {userConversions.map((conv) => (
                            <tr key={conv.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono font-bold text-slate-900">{conv.orderId}</td>
                              <td className="p-3 text-slate-700">{conv.customerName}</td>
                              <td className="p-3 text-slate-500">
                                {new Date(conv.createdAt).toLocaleDateString('bn-BD')}
                              </td>
                              <td className="p-3 font-bold text-slate-800">৳{conv.orderTotal}</td>
                              <td className="p-3 font-black text-emerald-600">+৳{conv.commissionAmount}</td>
                              <td className="p-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  conv.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {conv.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. PAYOUTS TAB */}
            {activeTab === 'payouts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900">পেআউট ও উইথড্র হিস্ট্রি</h4>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    মোট ক্যাশআউট: ৳{totalWithdrawn}
                  </span>
                </div>

                {userPayouts.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
                    <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h5 className="font-bold text-slate-700 text-sm">কোনো পেআউট রিকোয়েস্ট পাওয়া যায়নি</h5>
                    <p className="text-xs text-slate-500 mt-1">ব্যালেন্স ৳{config.minPayoutAmount} বা তার বেশি হলে উইথড্র রিকোয়েস্ট করতে পারবেন।</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">রিকোয়েস্ট আইডি</th>
                            <th className="p-3">মাধ্যম</th>
                            <th className="p-3">অ্যাকাউন্ট</th>
                            <th className="p-3">পরিমাণ</th>
                            <th className="p-3">তারিখ</th>
                            <th className="p-3 text-right">স্ট্যাটাস</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {userPayouts.map((pay) => (
                            <tr key={pay.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono font-bold text-slate-900">{pay.id}</td>
                              <td className="p-3 text-slate-700 font-bold">{pay.paymentMethod}</td>
                              <td className="p-3 font-mono text-slate-600">{pay.accountNumber}</td>
                              <td className="p-3 font-black text-orange-600">৳{pay.amount}</td>
                              <td className="p-3 text-slate-500">
                                {new Date(pay.requestedAt).toLocaleDateString('bn-BD')}
                              </td>
                              <td className="p-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  pay.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : pay.status === 'rejected'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {pay.status === 'approved' ? 'পরিশোধিত' : pay.status === 'rejected' ? 'বাতিল' : 'প্রসেসিং'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
