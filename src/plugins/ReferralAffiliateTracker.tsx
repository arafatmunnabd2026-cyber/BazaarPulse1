import React, { useEffect } from 'react';
import { usePlugins } from './PluginContext';

export interface AffiliateConfig {
  commissionRate: number; // e.g. 10 (percentage)
  minPayoutAmount: number; // e.g. 500 (BDT)
  cookieDays: number; // e.g. 30 (days)
}

export interface AffiliateConversion {
  id: string;
  referralCode: string;
  referrerName?: string;
  orderId: string | number;
  orderTotal: number;
  commissionAmount: number;
  customerName: string;
  status: 'pending' | 'approved' | 'paid';
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  referralCode: string;
  userName: string;
  userEmail: string;
  paymentMethod: 'bKash' | 'Nagad' | 'Rocket' | 'Bank Transfer';
  accountNumber: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string;
}

const CONFIG_KEY = 'bazaarpulse_affiliate_config';
const ATTRIBUTION_KEY = 'bazaarpulse_active_referral';
const CONVERSIONS_KEY = 'bazaarpulse_affiliate_conversions';
const PAYOUTS_KEY = 'bazaarpulse_payout_requests';
const CLICKS_KEY = 'bazaarpulse_affiliate_clicks';

export const DEFAULT_AFFILIATE_CONFIG: AffiliateConfig = {
  commissionRate: 10, // 10% commission on referral orders
  minPayoutAmount: 500, // 500 BDT minimum withdrawal
  cookieDays: 30
};

// Seed realistic affiliate sample conversions for immediate demo review
export const SEED_CONVERSIONS: AffiliateConversion[] = [
  {
    id: 'conv-101',
    referralCode: 'ARAFAT26',
    referrerName: 'Arafat Rahman',
    orderId: 'ORD-8941',
    orderTotal: 4500,
    commissionAmount: 450,
    customerName: 'Kamrul Hasan',
    status: 'approved',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'conv-102',
    referralCode: 'ARAFAT26',
    referrerName: 'Arafat Rahman',
    orderId: 'ORD-8992',
    orderTotal: 2800,
    commissionAmount: 280,
    customerName: 'Taslima Akter',
    status: 'approved',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'conv-103',
    referralCode: 'PROMO10',
    referrerName: 'Tech Deals BD',
    orderId: 'ORD-9024',
    orderTotal: 6200,
    commissionAmount: 620,
    customerName: 'Siam Chowdhury',
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const SEED_PAYOUT_REQUESTS: PayoutRequest[] = [
  {
    id: 'pay-201',
    referralCode: 'ARAFAT26',
    userName: 'Arafat Rahman',
    userEmail: 'arafat@gmail.com',
    paymentMethod: 'bKash',
    accountNumber: '01712345678',
    amount: 1200,
    status: 'pending',
    requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'pay-202',
    referralCode: 'PROMO10',
    userName: 'Tech Deals BD',
    userEmail: 'techdeals@gmail.com',
    paymentMethod: 'Nagad',
    accountNumber: '01898765432',
    amount: 2500,
    status: 'approved',
    requestedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    processedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to record affiliate conversion upon order completion
export const recordAffiliateOrderConversion = (order: any) => {
  try {
    const rawAttribution = localStorage.getItem(ATTRIBUTION_KEY);
    if (!rawAttribution) return null;

    const attribution = JSON.parse(rawAttribution);
    if (!attribution || !attribution.code) return null;

    // Check expiry
    if (attribution.expiresAt && Date.now() > attribution.expiresAt) {
      localStorage.removeItem(ATTRIBUTION_KEY);
      return null;
    }

    const config: AffiliateConfig = (() => {
      try {
        const s = localStorage.getItem(CONFIG_KEY);
        return s ? { ...DEFAULT_AFFILIATE_CONFIG, ...JSON.parse(s) } : DEFAULT_AFFILIATE_CONFIG;
      } catch {
        return DEFAULT_AFFILIATE_CONFIG;
      }
    })();

    const orderTotal = Number(order.totalAmount || order.total || order.subtotal || 0);
    const commission = Math.round((orderTotal * (config.commissionRate || 10)) / 100);

    const rawConversions = localStorage.getItem(CONVERSIONS_KEY);
    const conversions: AffiliateConversion[] = rawConversions ? JSON.parse(rawConversions) : SEED_CONVERSIONS;

    const newConversion: AffiliateConversion = {
      id: `conv-${Date.now()}`,
      referralCode: attribution.code,
      referrerName: attribution.referrerName || `Affiliate (${attribution.code})`,
      orderId: String(order.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`),
      orderTotal,
      commissionAmount: commission,
      customerName: order.customerName || order.fullName || 'Customer',
      status: 'approved',
      createdAt: new Date().toISOString()
    };

    const updated = [newConversion, ...conversions];
    localStorage.setItem(CONVERSIONS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('bazaarpulse_affiliate_updated'));
    return newConversion;
  } catch (err) {
    console.error('Failed to record affiliate conversion:', err);
    return null;
  }
};

export const ReferralAffiliateTracker: React.FC = () => {
  const { isPluginActive } = usePlugins();
  const isActive = isPluginActive('referral-affiliate');

  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    try {
      // 1. Check URL parameters for referral link (e.g. ?ref=USER123 or ?affiliate=USER123)
      const params = new URLSearchParams(window.location.search);
      const referralCode = params.get('ref') || params.get('affiliate') || params.get('referral');

      if (referralCode && referralCode.trim()) {
        const cleanCode = referralCode.trim().toUpperCase();

        const config: AffiliateConfig = (() => {
          try {
            const s = localStorage.getItem(CONFIG_KEY);
            return s ? { ...DEFAULT_AFFILIATE_CONFIG, ...JSON.parse(s) } : DEFAULT_AFFILIATE_CONFIG;
          } catch {
            return DEFAULT_AFFILIATE_CONFIG;
          }
        })();

        const cookieDays = config.cookieDays || 30;
        const attributionData = {
          code: cleanCode,
          capturedAt: Date.now(),
          expiresAt: Date.now() + cookieDays * 24 * 60 * 60 * 1000,
          landingPage: window.location.pathname
        };

        // Save attribution in localStorage
        localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attributionData));

        // Increment Click Count
        try {
          const rawClicks = localStorage.getItem(CLICKS_KEY);
          const clicksMap: Record<string, number> = rawClicks ? JSON.parse(rawClicks) : { ARAFAT26: 48, PROMO10: 120 };
          clicksMap[cleanCode] = (clicksMap[cleanCode] || 0) + 1;
          localStorage.setItem(CLICKS_KEY, JSON.stringify(clicksMap));
        } catch {}

        window.dispatchEvent(new Event('bazaarpulse_affiliate_updated'));
      }
    } catch (e) {
      console.warn('Affiliate tracker note:', e);
    }
  }, [isActive]);

  // Background headless tracking component with 0 DOM rendering
  return null;
};
