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

export const recordAffiliateOrderConversion = (_order: any) => null;

export const ReferralAffiliateTracker: React.FC = () => {
  return null;
};
