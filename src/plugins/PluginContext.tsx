import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AVAILABLE_PLUGINS, PluginDefinition } from './registry';
import { FacebookPixelWidget } from './FacebookPixelWidget';
import { UrgencyFlashBannerWidget } from './UrgencyFlashBannerWidget';
import { ExitIntentPopupWidget } from './ExitIntentPopupWidget';
import { FloatingWhatsAppWidget } from './FloatingWhatsAppWidget';
import { AbandonedCartRecoveryWidget } from './AbandonedCartRecoveryWidget';
import { ReferralAffiliateTracker } from './ReferralAffiliateTracker';
import { BrowserPushWidget } from './BrowserPushWidget';

interface PluginContextType {
  plugins: Record<string, boolean>;
  isPluginActive: (key: string) => boolean;
  togglePlugin: (key: string) => void;
  setPluginState: (key: string, active: boolean) => void;
  resetPlugins: () => void;
  definitions: PluginDefinition[];
}

const STORAGE_KEY = 'bazaarpulse_marketplace_plugins';

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const PluginProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from localStorage or default definitions
  const [plugins, setPlugins] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged: Record<string, boolean> = {};
        AVAILABLE_PLUGINS.forEach(p => {
          merged[p.key] = parsed[p.key] !== undefined ? !!parsed[p.key] : p.defaultEnabled;
        });
        return merged;
      }
    } catch (e) {
      console.error('Failed to load plugin states:', e);
    }
    
    // Default fallback
    const defaults: Record<string, boolean> = {};
    AVAILABLE_PLUGINS.forEach(p => {
      defaults[p.key] = p.defaultEnabled;
    });
    return defaults;
  });

  // Persist changes and dispatch sync event
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins));
      window.dispatchEvent(new CustomEvent('bazaarpulse_plugin_sync', { detail: plugins }));
    } catch (e) {
      console.error('Failed to save plugin states:', e);
    }
  }, [plugins]);

  // Cross-tab and window sync listener
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setPlugins(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Error parsing storage plugin update:', err);
        }
      }
    };

    const handleCustomSync = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail) {
        setPlugins(ce.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('bazaarpulse_plugin_sync', handleCustomSync);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('bazaarpulse_plugin_sync', handleCustomSync);
    };
  }, []);

  const isPluginActive = useCallback((key: string): boolean => {
    if (plugins[key] !== undefined) {
      return plugins[key];
    }
    const def = AVAILABLE_PLUGINS.find(p => p.key === key);
    return def ? def.defaultEnabled : true;
  }, [plugins]);

  const togglePlugin = useCallback((key: string) => {
    setPlugins(prev => ({
      ...prev,
      [key]: !isPluginActive(key)
    }));
  }, [isPluginActive]);

  const setPluginState = useCallback((key: string, active: boolean) => {
    setPlugins(prev => ({
      ...prev,
      [key]: active
    }));
  }, []);

  const resetPlugins = useCallback(() => {
    const defaults: Record<string, boolean> = {};
    AVAILABLE_PLUGINS.forEach(p => {
      defaults[p.key] = p.defaultEnabled;
    });
    setPlugins(defaults);
  }, []);

  return (
    <PluginContext.Provider value={{
      plugins,
      isPluginActive,
      togglePlugin,
      setPluginState,
      resetPlugins,
      definitions: AVAILABLE_PLUGINS
    }}>
      {children}
      <FacebookPixelWidget />
      <UrgencyFlashBannerWidget />
      <ExitIntentPopupWidget />
      <FloatingWhatsAppWidget />
      <AbandonedCartRecoveryWidget />
      <ReferralAffiliateTracker />
      <BrowserPushWidget />
    </PluginContext.Provider>
  );
};

export const usePlugins = (): PluginContextType => {
  const context = useContext(PluginContext);
  if (!context) {
    // Safe fallback if used outside provider
    const defaults: Record<string, boolean> = {};
    AVAILABLE_PLUGINS.forEach(p => {
      defaults[p.key] = p.defaultEnabled;
    });
    return {
      plugins: defaults,
      isPluginActive: (key: string) => {
        const p = AVAILABLE_PLUGINS.find(x => x.key === key);
        return p ? p.defaultEnabled : true;
      },
      togglePlugin: () => {},
      setPluginState: () => {},
      resetPlugins: () => {},
      definitions: AVAILABLE_PLUGINS
    };
  }
  return context;
};
