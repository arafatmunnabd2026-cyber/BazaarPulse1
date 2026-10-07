import React, { useEffect } from 'react';
import { usePlugins } from './PluginContext';

export interface AffiliateConfig {
  commissionRate: number;
  minPayoutAmount: number;
  cookieDays: number;
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

export const DEFAULT_AFFILIATE_CONFIG: AffiliateConfig = {
  commissionRate: 10,
  minPayoutAmount: 500,
  cookieDays: 30
};

export const SEED_CONVERSIONS: AffiliateConversion[] = [];
export const SEED_PAYOUT_REQUESTS: PayoutRequest[] = [];
export const recordAffiliateOrderConversion = (_order: any) => null;
export const ReferralAffiliateTracker: React.FC = () => null;
