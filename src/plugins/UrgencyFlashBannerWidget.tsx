import React, { useState, useEffect } from 'react';
import { usePlugins } from './PluginContext';
import { Zap, Clock } from 'lucide-react';

export const UrgencyFlashBannerWidget: React.FC = () => {
  const { isPluginActive } = usePlugins();
  const isActive = isPluginActive('urgencyFlashBanner');

  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('bazaarpulse_urgency_banner_config');
      return saved ? JSON.parse(saved) : { text: '⚡ Mega Flash Sale! Up to 50% OFF on Electronics & Fashion.', discount: '50% OFF' };
    } catch {
      return { text: '⚡ Mega Flash Sale! Up to 50% OFF on Electronics & Fashion.', discount: '50% OFF' };
    }
  });

  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 28, seconds: 45 });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('bazaarpulse_urgency_banner_config');
        if (saved) setConfig(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white px-4 py-2.5 shadow-md text-xs sm:text-sm font-medium flex flex-col sm:flex-row items-center justify-between gap-2 z-30 relative">
      <div className="flex items-center gap-2">
        <span className="bg-white/20 px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
          <Zap className="w-3 h-3 fill-yellow-300 text-yellow-300" /> {config.discount}
        </span>
        <span className="truncate">{config.text}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full font-mono text-xs font-bold">
          <Clock className="w-3.5 h-3.5 text-orange-200" />
          <span>{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
};
