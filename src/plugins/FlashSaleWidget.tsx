import React, { useState, useEffect } from 'react';
import { usePlugins } from './PluginContext';
import { Zap, Clock, ArrowRight, Flame, Sparkles } from 'lucide-react';

export interface FlashSaleConfig {
  title: string;
  subtitle: string;
  discount: string;
  endTime: string;
  themeColor: 'fire' | 'purple' | 'emerald' | 'midnight' | 'blue' | 'custom';
  customColor1: string;
  customColor2: string;
  buttonText: string;
}

const DEFAULT_CONFIG: FlashSaleConfig = {
  title: '⚡ ধামাকা ফ্ল্যাশ সেল! সীমিত সময়ের সেরা সুযোগ',
  subtitle: 'নির্বাচিত সেরা ব্র্যান্ডের জনপ্রিয় পণ্যে সর্বোচ্চ মূল্যছাড়। সময় শেষ হওয়ার আগেই লুফে নিন!',
  discount: '৭০% পর্যন্ত ছাড়',
  endTime: new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 16), // Default 14 hours ahead
  themeColor: 'fire',
  customColor1: '#ea580c',
  customColor2: '#dc2626',
  buttonText: 'Shop Now'
};

const STORAGE_KEY = 'bazaarpulse_flash_sale_config';

export const FlashSaleWidget: React.FC = () => {
  const { isPluginActive } = usePlugins();
  const isActive = isPluginActive('flash-sale-timer');

  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [config, setConfig] = useState<FlashSaleConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load flash sale config:', e);
    }
    return DEFAULT_CONFIG;
  });

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 1 });

  // Hydration safety: ensure client-only mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync with Admin Panel updates in real-time
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
        }
      } catch (e) {
        console.error('Error updating flash sale config:', e);
      }
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('bazaarpulse_flash_sale_update', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('bazaarpulse_flash_sale_update', handleUpdate);
    };
  }, []);

  // Real-time Countdown Timer logic
  useEffect(() => {
    if (!isActive || !isMounted) return;

    const calculateTime = () => {
      const target = new Date(config.endTime).getTime();
      const now = Date.now();
      const difference = target - now;

      if (isNaN(target) || difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, total: difference });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [isActive, isMounted, config.endTime]);

  // Zero-damage rule: If not mounted, not active, or time has completely expired, hide safely
  if (!isMounted || !isActive || timeLeft.total <= 0) {
    return null;
  }

  // Determine Background Gradient based on themeColor
  const getGradientStyle = () => {
    switch (config.themeColor) {
      case 'purple':
        return { background: 'linear-gradient(135deg, #6d28d9 0%, #db2777 50%, #9333ea 100%)' };
      case 'emerald':
        return { background: 'linear-gradient(135deg, #047857 0%, #0d9488 50%, #059669 100%)' };
      case 'midnight':
        return { background: 'linear-gradient(135deg, #0f172a 0%, #451a03 50%, #1e1b4b 100%)' };
      case 'blue':
        return { background: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 50%, #2563eb 100%)' };
      case 'custom':
        return {
          background: `linear-gradient(135deg, ${config.customColor1 || '#ea580c'} 0%, ${config.customColor2 || '#dc2626'} 100%)`
        };
      case 'fire':
      default:
        return { background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 50%, #b91c1c 100%)' };
    }
  };

  const handleScrollToProducts = () => {
    const el = document.getElementById('products-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 mt-6">
      <div 
        style={getGradientStyle()}
        className="rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl border border-white/15"
      >
        {/* Background decorative glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left Side: Campaign details */}
          <div className="space-y-2.5 text-center lg:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 bg-black/25 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/20">
              <Flame className="w-4 h-4 text-yellow-300 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-yellow-200">
                LIMITED TIME FLASH SALE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
              <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                {config.discount}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight text-white drop-shadow-xs">
              {config.title}
            </h2>

            <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
              {config.subtitle}
            </p>

            {/* Quick Deal Tags */}
            <div className="flex items-center justify-center lg:justify-start gap-1.5 pt-1 flex-wrap">
              {['স্মার্টফোন', 'ফ্যাশন', 'লাইফস্টাইল', 'ইলেকট্রনিক্স'].map(tag => (
                <span 
                  key={tag}
                  className="text-[11px] font-semibold bg-white/15 hover:bg-white/25 backdrop-blur-xs px-2.5 py-0.5 rounded-lg border border-white/10 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right Side: Countdown Boxes & Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6 bg-black/20 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/15 shadow-inner">
            <div className="flex items-center gap-2 text-center">
              {timeLeft.days > 0 && (
                <>
                  <div className="flex flex-col items-center bg-white/10 rounded-xl px-2.5 sm:px-3 py-2 min-w-[50px] border border-white/20">
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-yellow-300">
                      {String(timeLeft.days).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-white/75 mt-0.5">দিন</span>
                  </div>
                  <span className="text-xl font-black text-yellow-300/80 -mt-3">:</span>
                </>
              )}

              <div className="flex flex-col items-center bg-white/10 rounded-xl px-2.5 sm:px-3 py-2 min-w-[50px] border border-white/20 shadow-xs">
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-bold text-white/75 mt-0.5">ঘন্টা</span>
              </div>

              <span className="text-xl font-black text-white/60 -mt-3 animate-pulse">:</span>

              <div className="flex flex-col items-center bg-white/10 rounded-xl px-2.5 sm:px-3 py-2 min-w-[50px] border border-white/20 shadow-xs">
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-bold text-white/75 mt-0.5">মিনিট</span>
              </div>

              <span className="text-xl font-black text-white/60 -mt-3 animate-pulse">:</span>

              <div className="flex flex-col items-center bg-white/10 rounded-xl px-2.5 sm:px-3 py-2 min-w-[50px] border border-white/20 shadow-xs">
                <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-yellow-300">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-bold text-white/75 mt-0.5">সেকেন্ড</span>
              </div>
            </div>

            {/* Shop Now CTA Button */}
            <button
              onClick={handleScrollToProducts}
              className="w-full sm:w-auto bg-white hover:bg-yellow-300 text-slate-900 font-black px-5 py-3 rounded-xl text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>{config.buttonText || 'Shop Now'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
