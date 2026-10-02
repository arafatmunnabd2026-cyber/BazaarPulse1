import React from 'react';

export interface PluginDefinition {
  key: string;
  name: string;
  description: string;
  category: 'Marketing' | 'Navigation' | 'Storefront' | 'AI & Tools';
  defaultEnabled: boolean;
  version: string;
  author: string;
}

export const AVAILABLE_PLUGINS: PluginDefinition[] = [
  {
    key: 'heroBanner',
    name: 'Hero Banner Slider',
    description: 'Main promotional slider and banner carousel at the top of the homepage.',
    category: 'Storefront',
    defaultEnabled: true,
    version: '1.0.0',
    author: 'BazaarPulse Core'
  },
  {
    key: 'campaignBanner',
    name: 'Campaign Discount Strip',
    description: 'Top notification strip or campaign announcement bar for ongoing sales.',
    category: 'Marketing',
    defaultEnabled: true,
    version: '1.2.0',
    author: 'BazaarPulse Core'
  },
  {
    key: 'topCategories',
    name: 'Browse Categories Bar',
    description: 'Horizontal quick-navigation category selector with icons and badges.',
    category: 'Navigation',
    defaultEnabled: true,
    version: '1.0.1',
    author: 'BazaarPulse Core'
  },
  {
    key: 'flashSale',
    name: 'Flash Sale & Countdown',
    description: 'Time-limited lightning deals widget with real-time countdown timer.',
    category: 'Marketing',
    defaultEnabled: true,
    version: '2.0.0',
    author: 'BazaarPulse Core'
  },
  {
    key: 'featuredProducts',
    name: 'Featured Products Grid',
    description: 'Main product grid showcasing popular items, discounts, and ratings.',
    category: 'Storefront',
    defaultEnabled: true,
    version: '1.1.0',
    author: 'BazaarPulse Core'
  },
  {
    key: 'vendorMarketplace',
    name: 'Verified Vendors Showcase',
    description: 'Highlights top trusted multi-vendor stores and merchants on the platform.',
    category: 'Storefront',
    defaultEnabled: true,
    version: '1.0.0',
    author: 'BazaarPulse Core'
  },
  {
    key: 'aiAdvisorWidget',
    name: 'AI Shopping Assistant',
    description: 'Gemini-powered smart shopping advisor popup and floating recommendation bar.',
    category: 'AI & Tools',
    defaultEnabled: true,
    version: '1.5.0',
    author: 'Google AI Studio'
  },
  {
    key: 'facebook-pixel',
    name: 'Facebook Meta Pixel',
    description: 'Tracks visitor traffic, conversions, and page views across the e-commerce platform using Meta Pixel ID.',
    category: 'Marketing',
    defaultEnabled: true,
    version: '1.0.0',
    author: 'Meta Business'
  },
  {
    key: 'urgencyFlashBanner',
    name: 'Urgency & Flash Sale Banner',
    description: 'Top or hero countdown timer and urgent discount announcement strip to drive fast conversions.',
    category: 'Marketing',
    defaultEnabled: true,
    version: '1.1.0',
    author: 'BazaarPulse Boosters'
  },
  {
    key: 'exitIntentPopup',
    name: 'Exit-Intent Lead Magnet Popup',
    description: 'Smart popup offering discount coupon or lead magnet when visitors show exit intent.',
    category: 'Marketing',
    defaultEnabled: true,
    version: '1.0.0',
    author: 'BazaarPulse Boosters'
  },
  {
    key: 'floatingWhatsApp',
    name: 'Floating WhatsApp Support',
    description: 'Floating instant chat and customer support widget connected directly to WhatsApp.',
    category: 'Marketing',
    defaultEnabled: true,
    version: '1.2.0',
    author: 'BazaarPulse Boosters'
  },
  {
    key: 'flash-sale-timer',
    name: 'Flash Sale & Countdown Timer',
    description: 'Dynamic countdown banner and promotional flash sale section with real-time timers and customizable theme colors.',
    category: 'Marketing',
    defaultEnabled: true,
    version: '2.5.0',
    author: 'BazaarPulse Core'
  },
  {
    key: 'abandoned-cart-recovery',
    name: 'Abandoned Cart Recovery & Reminders',
    description: 'Tracks uncompleted carts, triggers automatic reminder alerts, and presents special return coupons to boost conversions.',
    category: 'Marketing',
    defaultEnabled: true,
    version: '1.0.0',
    author: 'BazaarPulse Boosters'
  },
  {
    key: 'product-reviews',
    name: 'Product Reviews & Ratings',
    description: 'Authentic 1-5 star ratings, photo reviews, verified buyer badges, and admin moderation.',
    category: 'Storefront',
    defaultEnabled: true,
    version: '1.5.0',
    author: 'BazaarPulse Core'
  },
  {
    key: 'referral-affiliate',
    name: 'Referral & Affiliate Marketing System',
    description: 'Generates unique referral links, tracks affiliate traffic & conversions, and manages commissions and payout requests.',
    category: 'Marketing',
    defaultEnabled: true,
    version: '1.0.0',
    author: 'BazaarPulse Boosters'
  },
  {
    key: 'automated-invoice',
    name: 'Automated Invoice & PDF Generator',
    description: 'Generates branded PDF invoices upon order confirmation, enables one-click download, and automatically triggers email invoice receipts to customers.',
    category: 'Storefront',
    defaultEnabled: true,
    version: '1.0.0',
    author: 'BazaarPulse Core'
  },
  {
    key: 'browser-push-notifications',
    name: 'Browser Push Notifications',
    description: 'Sends instant web push notifications and promotional alerts to customer devices even when offline or outside the site.',
    category: 'Marketing',
    defaultEnabled: true,
    version: '1.0.0',
    author: 'BazaarPulse Boosters'
  },
  {
    key: 'advanced-product-filter',
    name: 'Advanced Product Filter & Sidebar',
    description: 'Comprehensive real-time product filtering by price range slider, brands, sizes, colors, star ratings, and stock status.',
    category: 'Storefront',
    defaultEnabled: true,
    version: '1.0.0',
    author: 'BazaarPulse Core'
  }
];
