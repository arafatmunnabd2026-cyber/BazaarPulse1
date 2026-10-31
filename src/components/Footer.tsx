import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, MessageSquare, Facebook, Instagram, Youtube, Linkedin, Send, CheckCircle, ShieldCheck } from 'lucide-react';

export const PAYMENT_LOGO_MAP: Record<string, { image: string; name: string }> = {
  bkash: { image: '/payments/bkash.png', name: 'bKash' },
  nagad: { image: '/payments/nagad.png', name: 'Nagad' },
  rocket: { image: '/payments/rocket.png', name: 'Rocket' },
  visa: { image: '/payments/visa.png', name: 'VISA' },
  mastercard: { image: '/payments/mastercard.svg', name: 'Mastercard' },
  upay: { image: '/payments/upay.svg', name: 'upay' },
  cellfin: { image: '/payments/cellfin.svg', name: 'CellFin' },
  cod: { image: '/payments/cod.svg', name: 'Cash on Delivery' },
  qcash: { image: '/payments/qcash.png', name: 'Q-Cash' }
};

export const resolvePaymentItem = (item: any): { image: string; name: string } | null => {
  if (!item) return null;
  if (typeof item === 'object') {
    return {
      image: item.image || item.src || '/payments/cod.svg',
      name: item.name || item.alt || 'Payment Method'
    };
  }
  const key = String(item).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (PAYMENT_LOGO_MAP[key]) {
    return PAYMENT_LOGO_MAP[key];
  }
  if (String(item).startsWith('/')) {
    return { image: String(item), name: 'Payment' };
  }
  return { image: `/payments/${key}.png`, name: String(item) };
};

export const Footer: React.FC = () => {
  const [footerData, setFooterData] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchFooterData();

    // Real-time window custom event listener triggered upon Admin save
    const handleFooterUpdate = (e: any) => {
      if (e?.detail) {
        setFooterData(e.detail);
      } else {
        fetchFooterData();
      }
    };
    window.addEventListener('bazaarpulse_footer_updated', handleFooterUpdate);

    return () => {
      window.removeEventListener('bazaarpulse_footer_updated', handleFooterUpdate);
    };
  }, []);

  const fetchFooterData = async () => {
    try {
      const res = await fetch('/api/footer');
      const json = await res.json();
      if (json.success && json.footer) {
        setFooterData(json.footer);
      }
    } catch (e) {
      console.error('Failed to fetch footer config:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('দয়া করে একটি সঠিক ইমেইল ঠিকানা দিন');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (json.success) {
        setSubscribed(true);
        setEmail('');
      } else {
        setErrorMsg(json.error || 'সাবস্ক্রিপশন ব্যর্থ হয়েছে');
      }
    } catch (err) {
      setErrorMsg('সার্ভার ত্রুটি, আবার চেষ্টা করুন');
    } finally {
      setLoading(false);
    }
  };

  // Skeleton loading while live database data is fetching (Zero mock/demo data shown)
  if (!footerData && loading) {
    return (
      <footer className="hidden md:block bg-slate-900 text-slate-300 py-8 border-t border-slate-800 text-xs font-sans mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-7 mb-6 animate-pulse">
            {[1, 2, 3, 4, 5].map((col) => (
              <div key={col} className="space-y-3">
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="space-y-2 pt-1">
                  <div className="h-3 bg-slate-800/60 rounded w-full"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-5/6"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-4/6"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800/80 pt-4 flex justify-between items-center">
            <div className="h-3 bg-slate-800/60 rounded w-48"></div>
            <div className="h-3 bg-slate-800/60 rounded w-32"></div>
          </div>
        </div>
      </footer>
    );
  }

  // If no database data could be loaded, do not pop demo data
  if (!footerData) {
    return null;
  }

  const contact = footerData.contact || {};
  const policyLinks = footerData.policyLinks || footerData.policies || [];
  const quickLinks = footerData.quickLinks || footerData.navigation || [];
  const social = footerData.social || footerData.socials || {};
  const paymentMethods = footerData.paymentMethods || footerData.payments || [];

  return (
    <footer className="hidden md:block bg-slate-900 text-slate-300 py-8 border-t border-slate-800 text-xs font-sans mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 5-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-7 mb-6">
          
          {/* Column 1: Customer Support & Contact */}
          <div className="space-y-2.5">
            <h3 className="text-white font-black text-sm tracking-wide uppercase border-b border-slate-800 pb-1.5">
              কাস্টমার সাপোর্ট ও যোগাযোগ
            </h3>
            <ul className="space-y-2">
              <li>
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-[#f85606] transition-colors">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-[#f85606]">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">{contact.email}</span>
                </a>
              </li>
              <li>
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-[#f85606] transition-colors">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-[#f85606]">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <span>{contact.phone}</span>
                </a>
              </li>
              <li>
                <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 hover:text-[#f85606] transition-colors">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-[#f85606] mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="leading-relaxed">{contact.address}</span>
                </a>
              </li>
              <li>
                <a href={contact.liveChatUrl} className="flex items-center gap-2 hover:text-[#f85606] transition-colors">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-[#f85606]">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold underline">লাইভ চ্যাট / সাপোর্ট টিকিট</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Policy & Terms */}
          <div className="space-y-2.5">
            <h3 className="text-white font-black text-sm tracking-wide uppercase border-b border-slate-800 pb-1.5">
              নীতি ও শর্তাবলী
            </h3>
            <ul className="space-y-1.5">
              {policyLinks.map((link: any, idx: number) => (
                <li key={idx}>
                  <a href={link.url} className="hover:text-[#f85606] transition-colors block py-0.5">
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Navigation & Quick Links */}
          <div className="space-y-2.5">
            <h3 className="text-white font-black text-sm tracking-wide uppercase border-b border-slate-800 pb-1.5">
              নেভিগেশন ও কুইক লিংক
            </h3>
            <ul className="space-y-1.5">
              {quickLinks.map((link: any, idx: number) => (
                <li key={idx}>
                  <a href={link.url} className="hover:text-[#f85606] transition-colors block py-0.5">
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Social Media & Newsletter */}
          <div className="space-y-2.5">
            <h3 className="text-white font-black text-sm tracking-wide uppercase border-b border-slate-800 pb-1.5">
              সোশ্যাল মিডিয়া ও নিউজলেটার
            </h3>
            <div className="flex items-center gap-2 pt-1">
              {social.enabled?.facebook && social.facebook && (
                <a 
                  href={social.facebook} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="Facebook"
                  className="w-9 h-9 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-md hover:scale-105 hover:shadow-blue-500/30 transition-transform duration-200 active:scale-95"
                >
                  <Facebook className="w-4.5 h-4.5 text-white" />
                </a>
              )}
              {social.enabled?.instagram && social.instagram && (
                <a 
                  href={social.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="Instagram"
                  style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' }}
                  className="w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-md hover:scale-105 hover:shadow-pink-500/30 transition-transform duration-200 active:scale-95"
                >
                  <Instagram className="w-4.5 h-4.5 text-white" />
                </a>
              )}
              {social.enabled?.youtube && social.youtube && (
                <a 
                  href={social.youtube} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="YouTube"
                  className="w-9 h-9 rounded-xl bg-[#FF0000] text-white flex items-center justify-center shadow-md hover:scale-105 hover:shadow-red-500/30 transition-transform duration-200 active:scale-95"
                >
                  <Youtube className="w-4.5 h-4.5 text-white" />
                </a>
              )}
              {social.enabled?.linkedin && social.linkedin && (
                <a 
                  href={social.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="LinkedIn"
                  className="w-9 h-9 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center shadow-md hover:scale-105 hover:shadow-blue-600/30 transition-transform duration-200 active:scale-95"
                >
                  <Linkedin className="w-4.5 h-4.5 text-white" />
                </a>
              )}
            </div>

            <div className="pt-1">
              <p className="text-slate-400 text-[11px] mb-1.5 font-medium">এক্সক্লুসিভ অফার পেতে সাবস্ক্রাইব করুন:</p>
              {subscribed ? (
                <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 p-2 rounded-xl flex items-center gap-2 text-xs">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>ধন্যবাদ! আপনি সফলভাবে সাবস্ক্রাইব করেছেন।</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-1.5">
                  <div className="flex items-center">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="আপনার ইমেইল ঠিকানা..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-l-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#f85606]"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#f85606] hover:bg-orange-600 text-white px-3 py-1.5 rounded-r-xl font-bold transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {errorMsg && <p className="text-rose-400 text-[10px]">{errorMsg}</p>}
                </form>
              )}
            </div>
          </div>

          {/* Column 5: Trust Elements & Payment */}
          <div className="space-y-2.5">
            <h3 className="text-white font-black text-sm tracking-wide uppercase border-b border-slate-800 pb-1.5">
              সিকিউর পেমেন্ট ও ট্রাস্ট
            </h3>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>১০০% নিরাপদ ও ভেরিফাইড চেকআউট</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {paymentMethods.map((method: any, idx: number) => {
                const resolved = resolvePaymentItem(method);
                if (!resolved) return null;
                return (
                  <div 
                    key={idx} 
                    className="bg-white rounded-lg p-1.5 flex items-center justify-center h-10 sm:h-11 shadow-xs border border-slate-700/40 hover:border-[#f85606] hover:shadow-sm hover:scale-105 transition-all"
                    title={resolved.name}
                  >
                    <img 
                      src={resolved.image} 
                      alt={resolved.name} 
                      className="h-6 sm:h-6.5 w-auto max-w-[85%] object-contain"
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Bottom Copyright Bar */}
        <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <p>© {new Date().getFullYear()} BazaarPulse Bangladesh. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Privacy</span>
            <span>•</span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Terms</span>
            <span>•</span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
