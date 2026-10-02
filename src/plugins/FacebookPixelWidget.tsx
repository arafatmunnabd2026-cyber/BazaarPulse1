import React, { useEffect, useState } from 'react';
import { usePlugins } from './PluginContext';

interface FacebookPixelWidgetProps {
  defaultPixelId?: string;
}

export const FacebookPixelWidget: React.FC<FacebookPixelWidgetProps> = ({ defaultPixelId = '123456789012345' }) => {
  const { isPluginActive } = usePlugins();
  const isActive = isPluginActive('facebook-pixel');

  const [pixelId, setPixelId] = useState<string>(() => {
    try {
      return localStorage.getItem('bazaarpulse_fb_pixel_id') || defaultPixelId;
    } catch {
      return defaultPixelId;
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const savedId = localStorage.getItem('bazaarpulse_fb_pixel_id');
        if (savedId) setPixelId(savedId);
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!isActive || !pixelId) return;

    // Zero-damage & client-safe Meta Pixel injection
    if (typeof window !== 'undefined') {
      try {
        const win = window as any;
        if (!win.fbq) {
          (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
            if (f.fbq) return;
            n = f.fbq = function () {
              n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n;
            n.loaded = !0;
            n.version = '2.0';
            n.queue = [];
            t = b.createElement(e);
            t.async = !0;
            t.src = v;
            s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
          })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        }

        win.fbq('init', pixelId);
        win.fbq('track', 'PageView');
      } catch (err) {
        console.error('Meta Pixel script injection error:', err);
      }
    }
  }, [isActive, pixelId]);

  // Background component with zero visual UI rendering
  return null;
};
