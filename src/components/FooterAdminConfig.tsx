import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Download, Users, Globe, Shield, Phone, Share2, CreditCard } from 'lucide-react';

export const PAYMENT_OPTIONS = [
  { id: 'bkash', name: 'bKash', image: '/payments/bkash.png' },
  { id: 'nagad', name: 'Nagad', image: '/payments/nagad.png' },
  { id: 'rocket', name: 'Rocket', image: '/payments/rocket.png' },
  { id: 'visa', name: 'VISA', image: '/payments/visa.png' },
  { id: 'mastercard', name: 'Mastercard', image: '/payments/mastercard.svg' },
  { id: 'upay', name: 'upay', image: '/payments/upay.svg' },
  { id: 'cellfin', name: 'CellFin', image: '/payments/cellfin.svg' },
  { id: 'cod', name: 'Cash on Delivery', image: '/payments/cod.svg' },
  { id: 'qcash', name: 'Q-Cash', image: '/payments/qcash.png' }
];

export const FooterAdminConfig: React.FC<{ notify: (msg: string) => void }> = ({ notify }) => {
  const [config, setConfig] = useState<any>({
    contact: { email: '', phone: '', address: '', mapUrl: '', liveChatUrl: '' },
    policyLinks: [],
    quickLinks: [],
    social: { facebook: '', instagram: '', youtube: '', linkedin: '', enabled: { facebook: true, instagram: true, youtube: true, linkedin: true } },
    paymentMethods: []
  });
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFooterConfig();
    loadSubscribers();
  }, []);

  const loadFooterConfig = async () => {
    try {
      const res = await fetch('/api/footer');
      const json = await res.json();
      if (json.success && json.footer) {
        setConfig(json.footer);
      }
    } catch (e) {
      console.error('Error loading footer config:', e);
    }
  };

  const loadSubscribers = async () => {
    try {
      const token = localStorage.getItem('bazaarpulse_admin_token');
      const res = await fetch('/api/admin/subscribers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setSubscribers(json.subscribers || []);
      }
    } catch (e) {
      console.error('Error loading subscribers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('bazaarpulse_admin_token');
      // Direct REST API save to PostgreSQL database
      const res = await fetch('/api/footer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(config)
      });

      const json = await res.json();
      if (json.success) {
        const savedData = json.footer || config;
        notify('✅ ফুটার সেটিংস ডাটাবেসে সফলভাবে সংরক্ষিত হয়েছে!');
        window.dispatchEvent(new CustomEvent('bazaarpulse_footer_updated', { detail: savedData }));
      } else {
        notify('❌ সংরক্ষণ করতে সমস্যা হয়েছে: ' + (json.error || ''));
      }
    } catch (err) {
      notify('❌ সার্ভার ত্রুটি!');
    } finally {
      setSaving(false);
    }
  };

  const exportSubscribersCSV = () => {
    if (subscribers.length === 0) {
      notify('⚠️ কোনো সাবস্ক্রাইবার নেই!');
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["ID,Email,Subscribed At", ...subscribers.map(s => `${s.id},"${s.email}","${s.subscribed_at}"`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bazaarpulse_subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('📥 সাবস্ক্রাইবার লিস্ট সফলভাবে ডাউনলোড হয়েছে!');
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">লোড হচ্ছে...</div>;
  }

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Footer Management & Control</h2>
          <p className="text-xs text-slate-500 mt-1">Manage desktop footer links, contact info, social media, payment badges, and newsletter subscribers.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#f85606] hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তনগুলো সেভ করুন'}</span>
        </button>
      </div>

      {/* 1. Contact Info Editor */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <Phone className="w-4 h-4 text-[#f85606]" />
          <span>কাস্টমার সাপোর্ট ও যোগাযোগের তথ্য (Column 1)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">সাপোর্ট ইমেইল</label>
            <input
              type="email"
              value={config.contact?.email || ''}
              onChange={(e) => setConfig({ ...config, contact: { ...config.contact, email: e.target.value } })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:border-[#f85606]"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">হটলাইন ফোন নম্বর</label>
            <input
              type="text"
              value={config.contact?.phone || ''}
              onChange={(e) => setConfig({ ...config, contact: { ...config.contact, phone: e.target.value } })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:border-[#f85606]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">অফিস ঠিকানা</label>
            <input
              type="text"
              value={config.contact?.address || ''}
              onChange={(e) => setConfig({ ...config, contact: { ...config.contact, address: e.target.value } })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:border-[#f85606]"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">গুগল ম্যাপ লিংক (URL)</label>
            <input
              type="text"
              value={config.contact?.mapUrl || ''}
              onChange={(e) => setConfig({ ...config, contact: { ...config.contact, mapUrl: e.target.value } })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:border-[#f85606]"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">লাইভ চ্যাট লিংক (URL)</label>
            <input
              type="text"
              value={config.contact?.liveChatUrl || ''}
              onChange={(e) => setConfig({ ...config, contact: { ...config.contact, liveChatUrl: e.target.value } })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-800 focus:outline-none focus:border-[#f85606]"
            />
          </div>
        </div>
      </div>

      {/* 2. Policy & Terms Links Manager (Column 2) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#f85606]" />
            <span>নীতি ও শর্তাবলী লিংক ম্যানেজার (Column 2)</span>
          </h3>
          <button
            onClick={() => setConfig({ ...config, policyLinks: [...(config.policyLinks || []), { title: 'নতুন পলিসি', url: '/page/new' }] })}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>লিংক যোগ করুন</span>
          </button>
        </div>
        <div className="space-y-3">
          {(config.policyLinks || []).map((link: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="text"
                value={link.title}
                onChange={(e) => {
                  const updated = [...config.policyLinks];
                  updated[idx].title = e.target.value;
                  setConfig({ ...config, policyLinks: updated });
                }}
                placeholder="লিংক নাম (যেমন: রিটার্ন পলিসি)"
                className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) => {
                  const updated = [...config.policyLinks];
                  updated[idx].url = e.target.value;
                  setConfig({ ...config, policyLinks: updated });
                }}
                placeholder="ইউআরএল (যেমন: /page/return)"
                className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800"
              />
              <button
                onClick={() => {
                  const updated = config.policyLinks.filter((_: any, i: number) => i !== idx);
                  setConfig({ ...config, policyLinks: updated });
                }}
                className="text-rose-500 hover:text-rose-700 p-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Navigation & Quick Links Manager (Column 3) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#f85606]" />
            <span>নেভিগেশন ও কুইক লিংক ম্যানেজার (Column 3)</span>
          </h3>
          <button
            onClick={() => setConfig({ ...config, quickLinks: [...(config.quickLinks || []), { title: 'নতুন লিংক', url: '/page/link' }] })}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>লিংক যোগ করুন</span>
          </button>
        </div>
        <div className="space-y-3">
          {(config.quickLinks || []).map((link: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="text"
                value={link.title}
                onChange={(e) => {
                  const updated = [...config.quickLinks];
                  updated[idx].title = e.target.value;
                  setConfig({ ...config, quickLinks: updated });
                }}
                placeholder="লিংক নাম (যেমন: আমাদের সম্পর্কে)"
                className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) => {
                  const updated = [...config.quickLinks];
                  updated[idx].url = e.target.value;
                  setConfig({ ...config, quickLinks: updated });
                }}
                placeholder="ইউআরএল (যেমন: /page/about)"
                className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800"
              />
              <button
                onClick={() => {
                  const updated = config.quickLinks.filter((_: any, i: number) => i !== idx);
                  setConfig({ ...config, quickLinks: updated });
                }}
                className="text-rose-500 hover:text-rose-700 p-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Social Media Links Editor (Column 4) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <Share2 className="w-4 h-4 text-[#f85606]" />
          <span>সোশ্যাল মিডিয়া লিংক ও টগল (Column 4)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {['facebook', 'instagram', 'youtube', 'linkedin'].map((platform) => (
            <div key={platform} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase text-slate-800">{platform}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.social?.enabled?.[platform] ?? true}
                    onChange={(e) => setConfig({
                      ...config,
                      social: {
                        ...config.social,
                        enabled: { ...(config.social?.enabled || {}), [platform]: e.target.checked }
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#f85606]"></div>
                </label>
              </div>
              <input
                type="text"
                value={config.social?.[platform] || ''}
                onChange={(e) => setConfig({
                  ...config,
                  social: { ...config.social, [platform]: e.target.value }
                })}
                placeholder={`${platform} URL`}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 5. Payment Methods Manager (Column 5) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <CreditCard className="w-4 h-4 text-[#f85606]" />
          <span>পেমেন্ট মেথড ও ট্রাস্ট ব্যাজ লোগো (Column 5)</span>
        </h3>
        <p className="text-xs text-slate-500">যেসব পেমেন্ট লোগো ফুটারে দেখাতে চান সেগুলোর টগল অন করুন (পাবলিক ডিরেক্টরি থেকে সরাসরি লোগো ইমেজ লোড হবে):</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {PAYMENT_OPTIONS.map((opt) => {
            const isSelected = (config.paymentMethods || []).some((m: any) => {
              if (typeof m === 'object') return m.id === opt.id || m.image === opt.image || m.name === opt.name;
              return String(m).toLowerCase().replace(/[^a-z0-9]/g, '') === opt.id;
            });
            return (
              <div
                key={opt.id}
                onClick={() => {
                  let current = [...(config.paymentMethods || [])];
                  const exists = current.some((m: any) => {
                    if (typeof m === 'object') return m.id === opt.id || m.image === opt.image || m.name === opt.name;
                    return String(m).toLowerCase().replace(/[^a-z0-9]/g, '') === opt.id;
                  });
                  if (exists) {
                    current = current.filter((m: any) => {
                      if (typeof m === 'object') return m.id !== opt.id && m.image !== opt.image && m.name !== opt.name;
                      return String(m).toLowerCase().replace(/[^a-z0-9]/g, '') !== opt.id;
                    });
                  } else {
                    current.push({ id: opt.id, name: opt.name, image: opt.image });
                  }
                  setConfig({ ...config, paymentMethods: current });
                }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected ? 'bg-orange-50/50 border-[#f85606] shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 bg-white rounded-lg p-1 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                    <img src={opt.image} alt={opt.name} className="h-5 w-auto max-w-full object-contain" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{opt.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[120px]">{opt.image}</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                  isSelected ? 'bg-[#f85606] text-white' : 'border border-slate-300 bg-white'
                }`}>
                  {isSelected ? '✓' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Newsletter Subscribers List & Export */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-[#f85606]" />
            <span>নিউজলেটার সাবস্ক্রাইবার লিস্ট ({subscribers.length} জন)</span>
          </h3>
          <button
            onClick={exportSubscribersCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>CSV এক্সপোর্ট করুন</span>
          </button>
        </div>
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold sticky top-0">
              <tr>
                <th className="p-3">#ID</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Subscribed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-slate-400">কোনো সাবস্ক্রাইবার পাওয়া যায়নি।</td>
                </tr>
              ) : (
                subscribers.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-slate-500">{sub.id}</td>
                    <td className="p-3 text-slate-900 font-bold">{sub.email}</td>
                    <td className="p-3 text-slate-500">{new Date(sub.subscribed_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
