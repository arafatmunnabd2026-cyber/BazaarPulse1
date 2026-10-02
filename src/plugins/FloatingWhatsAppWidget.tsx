import React, { useState, useEffect } from 'react';
import { usePlugins } from './PluginContext';
import { MessageCircle, X } from 'lucide-react';

export const FloatingWhatsAppWidget: React.FC = () => {
  const { isPluginActive } = usePlugins();
  const isActive = isPluginActive('floatingWhatsApp');

  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('bazaarpulse_whatsapp_config');
      return saved ? JSON.parse(saved) : { phone: '8801700000000', message: 'হ্যালো! বাজার প্লাস সাপোর্ট থেকে সাহায্য চাচ্ছি।', title: 'Customer Support' };
    } catch {
      return { phone: '8801700000000', message: 'হ্যালো! বাজার প্লাস সাপোর্ট থেকে সাহায্য চাচ্ছি।', title: 'Customer Support' };
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('bazaarpulse_whatsapp_config');
        if (saved) setConfig(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!isActive) return null;

  const handleWhatsAppClick = () => {
    const url = `https://wa.me/${config.phone}?text=${encodeURIComponent(config.message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-72 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-left">
          <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm">{config.title}</h4>
                <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span> Online Now
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-3 bg-slate-50 text-xs">
            <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200 text-slate-700">
              👋 আসসালামু আলাইকুম! বাজার প্লাস (BazaarPulse) সাপোর্টে আপনাকে স্বাগতম। কীভাবে সাহায্য করতে পারি?
            </div>
            <button
              onClick={handleWhatsAppClick}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/25 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Start WhatsApp Chat</span>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 cursor-pointer relative group"
        aria-label="Live Chat Support"
      >
        <MessageCircle className="w-7 h-7 fill-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black">1</span>
        <span className="absolute right-full mr-3 bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Chat with Support 💬
        </span>
      </button>
    </div>
  );
};
