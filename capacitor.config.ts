import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bazaarpulse.app',
  appName: 'BazaarPulse',
  webDir: 'dist',
  server: {
    // Points to the live production deployment so updates reflect instantly
    url: 'https://bazaarpulse-1ty4.onrender.com',
    cleartext: false,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
