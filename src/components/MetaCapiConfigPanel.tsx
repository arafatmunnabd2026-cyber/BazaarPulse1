import React, { useState, useEffect } from 'react';
import { Target, ShieldCheck, CheckCircle2, XCircle, RefreshCcw, Save, Radio, Key, Zap, AlertCircle } from 'lucide-react';
import { generateCanonicalEventId, trackMetaEvent } from '../utils/metaTracking';

export function MetaCapiConfigPanel({ notify }: { notify: (msg: string) => void }) {
  const [pixelId, setPixelId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [testEventCode, setTestEventCode] = useState('');
  const [metaTrackingEnabled, setMetaTrackingEnabled] = useState(true);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/meta-settings');
      const data = await res.json();
      if (data.success && data.metaSettings) {
        setPixelId(data.metaSettings.metaPixelId || '');
        setAccessToken(data.metaSettings.metaCapiAccessToken || '');
        setTestEventCode(data.metaSettings.metaTestEventCode || '');
        setMetaTrackingEnabled(data.metaSettings.metaTrackingEnabled ?? true);
        setRecentEvents(data.recentEvents || []);
      }
    } catch (err: any) {
      console.error('Failed to load Meta settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/meta-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaPixelId: pixelId,
          metaCapiAccessToken: accessToken.includes('••••••••') ? undefined : accessToken,
          metaTestEventCode: testEventCode,
          metaTrackingEnabled
        })
      });
      const data = await res.json();
      if (data.success) {
        notify('✓ Meta CAPI সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!');
        fetchSettings();
      } else {
        notify('✕ সংরক্ষণ করতে সমস্যা হয়েছে: ' + (data.error || 'অজানা ত্রুটি'));
      }
    } catch (err: any) {
      notify('✕ সংযোগ ত্রুটি: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEvent = async () => {
    setIsTesting(true);
    try {
      const eventId = generateCanonicalEventId('ViewContent');
      // Trigger client tracking as well
      trackMetaEvent({
        eventName: 'ViewContent',
        customData: {
          content_ids: ['test_product_1'],
          content_type: 'product',
          value: 550,
          currency: 'BDT'
        },
        eventId
      });

      // Trigger server CAPI test event
      const res = await fetch('/api/v1/tracking/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: 'ViewContent',
          event_id: eventId,
          event_source_url: window.location.href,
          custom_data: {
            content_ids: ['test_product_1'],
            content_type: 'product',
            value: 550,
            currency: 'BDT'
          },
          user_data: {
            email: 'test@bazaarpulse.com',
            phone: '8801700000000',
            first_name: 'Test',
            last_name: 'User'
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        notify('✓ টেস্ট ইভেন্ট সফলভাবে পাঠানো হয়েছে! Meta Events Manager-এ চেক করুন।');
        fetchSettings();
      } else {
        notify('✕ টেস্ট ইভেন্ট ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      notify('✕ টেস্ট ইভেন্ট ত্রুটি: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <RefreshCcw className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#451086] via-purple-900 to-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <Target className="w-4 h-4 text-orange-400" /> Advanced Analytics & CAPI
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Meta Pixel & Conversions API (CAPI)</h2>
            <p className="text-purple-200 text-sm mt-1 max-w-2xl">
              ম্যাচিং রেট বাড়াতে এবং iOS 14+ ট্র্যাকিং ব্লকার এড়াতে ব্রাউজার পিক্সেল ও সার্ভার সাইড CAPI একযোগে কাজ করবে। Canonical Event ID এর মাধ্যমে অটোমেটিক ডিডুপ্লিকেশন নিশ্চিত করা হয়েছে।
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
            <div className={`w-3 h-3 rounded-full animate-pulse ${metaTrackingEnabled ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="text-sm font-bold">{metaTrackingEnabled ? 'Active & Tracking' : 'Tracking Paused'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
            <Key className="w-5 h-5 text-orange-600" /> Meta API Credentials & Settings
          </h3>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase text-slate-700">Meta Pixel ID *</label>
                <span className="text-[11px] text-slate-400">e.g. 123456789012345</span>
              </div>
              <input
                type="text"
                required
                value={pixelId}
                onChange={e => setPixelId(e.target.value)}
                placeholder="Enter 15-digit Meta Pixel ID"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase text-slate-700">Meta CAPI Access Token *</label>
                <span className="text-[11px] text-slate-400">Graph API System User Token</span>
              </div>
              <input
                type="password"
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder="EAA... (Paste System User Access Token)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                {accessToken.includes('••••••••') ? '🔒 Token securely stored on server.' : 'Token will be encrypted and stored securely in backend environment.'}
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase text-slate-700">Test Event Code (Optional)</label>
                <span className="text-[11px] text-slate-400">For live testing in Events Manager</span>
              </div>
              <input
                type="text"
                value={testEventCode}
                onChange={e => setTestEventCode(e.target.value)}
                placeholder="e.g. TEST12345"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono uppercase"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Enable Meta Tracking</h4>
                <p className="text-xs text-slate-500">Turn on/off browser Pixel and server CAPI event dispatch.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={metaTrackingEnabled}
                  onChange={e => setMetaTrackingEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSaving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <span>Save CAPI Settings</span>
              </button>

              <button
                type="button"
                onClick={handleSendTestEvent}
                disabled={isTesting}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isTesting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-amber-400" />}
                <span>Send Test Event</span>
              </button>
            </div>
          </form>
        </div>

        {/* Diagnostic & Guidelines Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" /> CAPI Architecture Features
            </h3>
            <ul className="space-y-3 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>SHA-256 Hashing:</strong> Customer email, phone, and names are legally normalized and hashed prior to transmission.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Event Deduplication:</strong> Unique canonical `event_id` ensures Meta deduplicates browser Pixel & CAPI.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Authoritative Purchase:</strong> Order totals and items are verified directly from backend orders.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Exponential Backoff:</strong> Automatic retries for transient Graph API connection drops.</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-sm">
            <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
              <Radio className="w-4 h-4 text-orange-400" /> Live Verification
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Enter your test event code above and click <strong>Send Test Event</strong> to verify real-time event delivery in Meta Events Manager &gt; Test Events tab.
            </p>
            <div className="bg-white/10 rounded-xl p-3 text-[11px] font-mono text-orange-300">
              Status: {metaTrackingEnabled ? '🟢 Ready for CAPI dispatch' : '⏸️ Tracking paused'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Dispatched Events Log */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-600" /> Recent CAPI Event Delivery Log
          </h3>
          <button
            onClick={fetchSettings}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            title="Refresh logs"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        {recentEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            কোনো ইভেন্ট লগ পাওয়া যায়নি। ওয়েবসাইট ব্রাউজ করুন অথবা টেস্ট ইভেন্ট পাঠান।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold">
                  <th className="pb-3 px-4">Event Name</th>
                  <th className="pb-3 px-4">Event ID</th>
                  <th className="pb-3 px-4">Delivery Status</th>
                  <th className="pb-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentEvents.map((ev, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{ev.eventName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{ev.eventId}</td>
                    <td className="py-3 px-4">
                      {ev.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{new Date(ev.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
