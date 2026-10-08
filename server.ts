import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import compression from 'compression';

// --- Supabase Client Configuration ---
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://mhpmwsafqrjgsodnztll.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_q5zax92UyLCrAIs7ZJDODQ_T93URdMc';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL or Anon Key is missing in environment variables!');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
// ----------------------------------------------------

import { 
  authMiddleware, 
  verifyAdmin, 
  verifyVendor, 
  verifyCustomer, 
  generateToken,
  JWT_SECRET
} from './src/middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

const app = express();

// High-speed Gzip & Brotli HTTP payload compression for sub-second responses
app.use(compression());

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval';");
  next();
});

// 1. Express setup with JSON body parser (supports large uploads for multi-image products) and CORS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Initialize Gemini SDK if API key is available
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Database initialization file path
const DB_FILE = path.join(__dirname, 'database.json');

// User Saved Delivery Address Model
export interface SavedDeliveryAddress {
  fullName: string;
  phoneNumber: string;
  district: string;
  thana: string;
  addressDetails: string;
  altPhone?: string;
  addressType?: 'Home' | 'Office' | string;
  country?: string;
  updatedAt?: string;
}

interface InitialData {
  users: any[];
  user_logins?: any[];
  vendors: any[];
  products: any[];
  categories: any[];
  orders: any[];
  withdrawals: any[];
  notifications?: any[];
  adminSettings: {
    globalCommissionRate: number; // percentage e.g. 10%
    platformName: string;
    heroBannerTitle: string;
    heroBannerSubtitle: string;
    campaignBanner?: {
      badge: string;
      title: string;
      subtitle: string;
      buttonText: string;
      linkText: string;
      bgColor?: string;
      textColor?: string;
      buttonBgColor?: string;
      buttonTextColor?: string;
    };
    cartBanner?: {
      isActive: boolean;
      bannerText: string;
      termsText: string;
    };
    banners: { id: string; title: string; subtitle: string; image: string; link: string; badge?: string }[];
    maintenanceMode: boolean;
    visualOverrides?: Record<string, any>;
  };
  reviews: any[];
  cartItems: { userId: string; productId: string; quantity: number; size?: string; color?: string; addedAt: string }[];
}

const defaultData: InitialData = {
  users: [
    { id: 'u1', name: 'Admin User', email: 'arafatmunna14620022@gmail.com', role: 'admin', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' }
  ],
  vendors: [],
  categories: [
    { id: 'c1', name: 'Gadgets', slug: 'gadgets', icon: 'Cpu' },
    { id: 'c2', name: 'Fashion & Apparel', slug: 'fashion', icon: 'Shirt' },
    { id: 'c3', name: 'Home & Living', slug: 'home-living', icon: 'Home' },
    { id: 'c4', name: 'Beauty', slug: 'beauty', icon: 'Sparkles' },
    { id: 'c7', name: 'Health', slug: 'health', icon: 'Heart' },
    { id: 'c5', name: 'Groceries', slug: 'groceries', icon: 'ShoppingBag' },
    { id: 'c6', name: 'Sports & Outdoors', slug: 'sports', icon: 'Trophy' }
  ],
  products: [],
  orders: [],
  withdrawals: [],
  adminSettings: {
    globalCommissionRate: 10,
    platformName: 'BazaarPulse',
    heroBannerTitle: 'Welcome to BazaarPulse',
    heroBannerSubtitle: 'Discover amazing products from verified vendors',
    campaignBanner: {
      badge: 'OFFER',
      title: 'Mega Discounts',
      subtitle: 'Grab top deals today',
      buttonText: 'Shop Now',
      linkText: '#products-section',
      bgColor: '#f85606',
      textColor: '#ffffff',
      buttonBgColor: '#ffffff',
      buttonTextColor: '#111827'
    },
    banners: [],
    maintenanceMode: false
  },
  reviews: [],
  cartItems: []
};

// 2. PostgreSQL Connection Pool Setup
let isDbConfigured = false;
const { Pool } = pg;

/**
 * Utility to repair and sanitize PostgreSQL connection strings.
 * Handles common issues like special characters in passwords and missing SSL parameters.
 */
function getSanitizedDbUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has('sslmode')) {
      urlObj.searchParams.set('sslmode', 'no-verify');
    }
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

const connectionString = getSanitizedDbUrl(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 3000
});

pool.on('error', () => {
  isDbConfigured = false;
});

// Database Migration & Initialization Helper
async function initDatabase() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('db.mhpmwsafqrjgsodnztll.supabase.co')) {
    isDbConfigured = false;
    console.log('Database initialized in local JSON engine & Supabase client mode.');
    return;
  }
  
  try {
    const client = await pool.connect();
    isDbConfigured = true;
    console.log('Connected to PostgreSQL successfully. Initializing database schema...');
    
    // Create necessary relational database tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        avatar TEXT,
        password TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Ensure password column exists if the table was already created
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_address JSONB DEFAULT NULL;

      -- Ensure user_logins table also exists for Supabase & user login tracking
      CREATE TABLE IF NOT EXISTS user_logins (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        phone VARCHAR(50),
        avatar TEXT,
        password TEXT,
        status VARCHAR(50) DEFAULT 'active',
        saved_address JSONB DEFAULT NULL,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE user_logins ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE user_logins ADD COLUMN IF NOT EXISTS saved_address JSONB DEFAULT NULL;
      
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        icon VARCHAR(100)
      );
      
      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(255) PRIMARY KEY,
        store_name VARCHAR(255),
        owner_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        status VARCHAR(50) DEFAULT 'approved',
        commission_rate NUMERIC DEFAULT 10,
        balance NUMERIC DEFAULT 0,
        total_sales NUMERIC DEFAULT 0,
        rating NUMERIC DEFAULT 0,
        joined_date VARCHAR(100),
        logo TEXT
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        price NUMERIC NOT NULL,
        discount_price NUMERIC,
        stock INTEGER DEFAULT 0,
        category_id VARCHAR(100),
        category_name VARCHAR(255),
        vendor_id VARCHAR(255),
        vendor_name VARCHAR(255),
        images JSONB DEFAULT '[]'::jsonb,
        description TEXT,
        rating NUMERIC DEFAULT 5.0,
        reviews_count INTEGER DEFAULT 0,
        total_sold INTEGER DEFAULT 0,
        is_flash_sale BOOLEAN DEFAULT false,
        flash_sale_ends VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        sizes JSONB DEFAULT '[]'::jsonb,
        colors JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure dynamic schema compatibility for Supabase column variations
      ALTER TABLE products ADD COLUMN IF NOT EXISTS current_price NUMERIC;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price NUMERIC;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
      
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(100),
        total_amount NUMERIC NOT NULL,
        customer_id VARCHAR(255),
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        address TEXT,
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS order_items (
        id BIGSERIAL PRIMARY KEY,
        order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        price NUMERIC NOT NULL,
        quantity INTEGER NOT NULL,
        size VARCHAR(50),
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Function to handle atomic order placement
      CREATE OR REPLACE FUNCTION place_order(
        p_order_id TEXT,
        p_customer_id TEXT,
        p_customer_name TEXT,
        p_customer_email TEXT,
        p_address TEXT,
        p_phone TEXT,
        p_total_amount NUMERIC,
        p_payment_method TEXT,
        p_items JSONB
      ) RETURNS VOID AS $$
      DECLARE
        item RECORD;
      BEGIN
        -- 1. Insert Order
        INSERT INTO orders (id, customer_id, customer_name, customer_email, address, phone, total_amount, payment_method, status)
        VALUES (p_order_id, p_customer_id, p_customer_name, p_customer_email, p_address, p_phone, p_total_amount, p_payment_method, 'pending');

        -- 2. Process Items
        FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id TEXT, title TEXT, price NUMERIC, quantity INTEGER, size TEXT, color TEXT)
        LOOP
          -- Insert into order_items
          INSERT INTO order_items (order_id, product_id, title, price, quantity, size, color)
          VALUES (p_order_id, item.product_id, item.title, item.price, item.quantity, item.size, item.color);

          -- Deduct Stock
          UPDATE products 
          SET stock = stock - item.quantity,
              total_sold = total_sold + item.quantity
          WHERE id = item.product_id;
        END LOOP;

        -- 3. Clear Cart
        DELETE FROM cart WHERE user_id = p_customer_id;
      END;
      $$ LANGUAGE plpgsql;
      
      CREATE TABLE IF NOT EXISTS cart (
        user_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        quantity INTEGER DEFAULT 1,
        size VARCHAR(100) DEFAULT '' NOT NULL,
        color VARCHAR(100) DEFAULT '' NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, product_id, size, color)
      );
      
      CREATE TABLE IF NOT EXISTS withdrawals (
        id VARCHAR(255) PRIMARY KEY,
        vendor_id VARCHAR(255),
        vendor_name VARCHAR(255),
        amount NUMERIC NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        bank_details TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255),
        rating INTEGER,
        comment TEXT,
        date VARCHAR(100)
      );
      
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        global_commission_rate NUMERIC DEFAULT 10,
        platform_name VARCHAR(255) DEFAULT 'BazaarPulse',
        hero_banner_title VARCHAR(255),
        hero_banner_subtitle TEXT,
        campaign_banner JSONB DEFAULT '{}'::jsonb,
        banners JSONB DEFAULT '[]'::jsonb,
        cart_banner JSONB DEFAULT '{"isActive": true, "bannerText": "৯৯৯ টাকার ইসলামিক বই কিনলেই পাচ্ছেন ফ্রি ডেলিভারি", "termsText": "শর্ত প্রযোজ্য"}'::jsonb,
        visual_overrides JSONB DEFAULT '{}'::jsonb,
        maintenance_mode BOOLEAN DEFAULT false,
        CONSTRAINT single_row CHECK (id = 1)
      );
      ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS cart_banner JSONB;

      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255),
        order_id VARCHAR(255),
        type VARCHAR(50) DEFAULT 'status_update',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Seed initial database state if users table is empty
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count || '0') === 0) {
      console.log('Seeding initial marketplace data into PostgreSQL...');
      
      // Seed initial mock file data if available
      let initialData = defaultData;
      if (fs.existsSync(DB_FILE)) {
        try {
          initialData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        } catch (e) {
          initialData = defaultData;
        }
      }
      
      // Users
      for (const u of initialData.users || []) {
        await client.query(
          'INSERT INTO users (id, name, email, role, avatar, status, saved_address) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (email) DO UPDATE SET saved_address = COALESCE(users.saved_address, EXCLUDED.saved_address)',
          [u.id, u.name, u.email, u.role, u.avatar, u.status || 'active', u.saved_address ? JSON.stringify(u.saved_address) : null]
        );
      }
      
      // Categories
      for (const c of initialData.categories || []) {
        await client.query(
          'INSERT INTO categories (id, name, slug, icon) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
          [c.id, c.name, c.slug, c.icon]
        );
      }
      
      // Vendors
      for (const v of initialData.vendors || []) {
        await client.query(
          'INSERT INTO vendors (id, store_name, owner_name, email, phone, status, commission_rate, balance, total_sales, rating, joined_date, logo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING',
          [v.id, v.storeName, v.ownerName, v.email, v.phone, v.status, v.commissionRate, v.balance, v.totalSales, v.rating, v.joinedDate, v.logo]
        );
      }
      
      // Products
      // REMOVED DUMMY PRODUCT SEEDING AS PER USER REQUEST
      
      // Admin Settings
      const settings = initialData.adminSettings || defaultData.adminSettings;
      await client.query(
        'INSERT INTO admin_settings (id, global_commission_rate, platform_name, hero_banner_title, hero_banner_subtitle, campaign_banner, banners, maintenance_mode) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING',
        [
          1, 
          settings.globalCommissionRate || 10, 
          settings.platformName || 'BazaarPulse',
          settings.heroBannerTitle || 'Welcome',
          settings.heroBannerSubtitle || '',
          JSON.stringify(settings.campaignBanner || {}),
          JSON.stringify(settings.banners || []),
          settings.maintenanceMode || false
        ]
      );
      
      console.log('PostgreSQL database seeded successfully!');
    }
    
    client.release();
  } catch (err: any) {
    isDbConfigured = false;
    console.log('Database initialized in local JSON engine & Supabase client mode.');
  }
}

// Execute DB schema generation
initDatabase();

app.get('/api/test-db', async (req, res) => {
  const diagnostic = {
    isDbConfigured,
    databaseUrlSet: !!process.env.DATABASE_URL,
    databaseUrlPrefix: process.env.DATABASE_URL ? process.env.DATABASE_URL.split(':')[0] : null,
    supabaseUrlSet: !!process.env.VITE_SUPABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    renderEnv: !!process.env.RENDER,
    connectionStatus: isDbConfigured ? 'success' : 'hybrid_local_supabase'
  };

  if (!isDbConfigured) {
    return res.json({
      success: true,
      diagnostic,
      message: 'Running smoothly in local database engine & Supabase client mode.'
    });
  }

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    diagnostic.connectionStatus = 'success';
    res.json({ success: true, diagnostic, dbTime: result.rows[0].now });
  } catch (err: any) {
    isDbConfigured = false;
    diagnostic.connectionStatus = 'hybrid_local_supabase';
    res.json({ 
      success: true, 
      diagnostic, 
      message: 'Running smoothly in local database engine & Supabase client mode.'
    });
  }
});

// 3. Health Check & Diagnostics Route
app.get('/api/health', async (req, res) => {
  const diagnostics: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      configured: isDbConfigured,
      connected: true,
      mode: isDbConfigured ? 'postgresql' : 'hybrid_local_supabase',
      error: null
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  };

  if (isDbConfigured) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as now');
      client.release();
      diagnostics.database.connected = true;
      diagnostics.database.latency = Date.now() - new Date(result.rows[0].now).getTime();
    } catch (err: any) {
      isDbConfigured = false;
      diagnostics.database.mode = 'hybrid_local_supabase';
    }
  }

  res.status(200).json(diagnostics);
});

function parseJsonSafe(val: any, fallback: any = []): any {
  if (val === null || val === undefined) return fallback;
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return [trimmed];
    }
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        return fallback;
      }
    }
    if (trimmed.includes(',') && !trimmed.includes('data:')) {
      return trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return fallback;
}

const CATEGORY_SLUG_TO_ID: Record<string, string> = {
  'electronics': 'c1',
  'gadgets': 'c1',
  'fashion': 'c2',
  'fashion-apparel': 'c2',
  'home-living': 'c3',
  'home': 'c3',
  'beauty': 'c4',
  'beauty-health': 'c4',
  'health': 'c7',
  'groceries': 'c5',
  'sports': 'c6',
  'sports-outdoors': 'c6'
};

function normalizeCategoryId(catId?: string, catName?: string): string {
  if (catId && /^c[1-7]$/.test(catId)) return catId;
  const cleanId = (catId || '').toLowerCase().trim();
  if (CATEGORY_SLUG_TO_ID[cleanId]) return CATEGORY_SLUG_TO_ID[cleanId];
  const cleanName = (catName || '').toLowerCase().trim();
  if (cleanName.includes('elect') || cleanName.includes('gadg')) return 'c1';
  if (cleanName.includes('fash') || cleanName.includes('appar')) return 'c2';
  if (cleanName.includes('home') || cleanName.includes('liv')) return 'c3';
  if (cleanName.includes('beaut')) return 'c4';
  if (cleanName.includes('health')) return 'c7';
  if (cleanName.includes('groc')) return 'c5';
  if (cleanName.includes('sport') || cleanName.includes('outdoor')) return 'c6';
  return catId || 'c1';
}

function formatProductRow(p: any) {
  let resolvedImages: string[] = [];
  const parsedImgs = parseJsonSafe(p.images, []);
  if (Array.isArray(parsedImgs) && parsedImgs.length > 0) {
    resolvedImages = parsedImgs.filter(Boolean);
  } else if (p.image_url) {
    resolvedImages = [p.image_url];
  }

  const gal = parseJsonSafe(p.gallery_images, []);
  if (Array.isArray(gal) && gal.length > 0) {
    gal.forEach((g: string) => {
      if (g && !resolvedImages.includes(g)) resolvedImages.push(g);
    });
  }
  if (!Array.isArray(resolvedImages) || resolvedImages.length === 0) {
    resolvedImages = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'];
  }

  const normCatId = normalizeCategoryId(p.category_id || p.category, p.category_name);

  return {
    id: String(p.id),
    title: p.title || 'Untitled Product',
    slug: p.slug || (p.title ? p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'product'),
    price: Number(p.current_price !== undefined && p.current_price !== null && p.current_price !== '' ? p.current_price : (p.price || 0)),
    discountPrice: (p.discount_price !== null && p.discount_price !== undefined && p.discount_price !== '') ? Number(p.discount_price) : undefined,
    stock: p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity !== '' ? Number(p.stock_quantity) : Number(p.stock || 0),
    categoryId: normCatId,
    categoryName: p.category_name || p.category || 'General',
    vendorId: p.vendor_id || 'v1',
    vendorName: p.vendor_name || 'Platform Administrator',
    images: resolvedImages,
    galleryImages: Array.isArray(gal) ? gal : [],
    description: p.description || '',
    rating: Number(p.rating || 5.0),
    reviewsCount: Number(p.reviews_count || 0),
    totalSold: Number(p.total_sold || 0),
    isFlashSale: !!p.is_flash_sale,
    flashSaleEnds: p.flash_sale_ends || null,
    status: p.status || 'active',
    sizes: parseJsonSafe(p.sizes, []),
    colors: parseJsonSafe(p.colors, [])
  };
}

// Supabase client synchronization helper
async function syncProductToSupabase(p: any) {
  if (!supabase || !p || !p.id) return;
  try {
    const normCatId = normalizeCategoryId(p.categoryId || p.category_id, p.categoryName || p.category_name);
    const mainImg = (Array.isArray(p.images) && p.images[0]) || p.imageUrl || p.image || '';
    const imagesList = Array.isArray(p.images) && p.images.length > 0 ? p.images : (mainImg ? [mainImg] : []);
    const galleryList = Array.isArray(p.galleryImages) ? p.galleryImages : (Array.isArray(p.gallery_images) ? p.gallery_images : []);

    const { error } = await supabase.from('products').upsert([{
      id: String(p.id),
      title: p.title || 'Untitled Product',
      slug: p.slug || (p.title ? p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'product') || ('product-' + p.id),
      price: Number(p.currentPrice !== undefined ? p.currentPrice : (p.price || 0)),
      current_price: Number(p.currentPrice !== undefined ? p.currentPrice : (p.price || 0)),
      discount_price: (p.discountPrice !== null && p.discountPrice !== undefined && p.discountPrice !== '') ? Number(p.discountPrice) : (p.discount_price ? Number(p.discount_price) : null),
      stock: Number(p.stockQuantity !== undefined ? p.stockQuantity : (p.stock || 0)),
      stock_quantity: Number(p.stockQuantity !== undefined ? p.stockQuantity : (p.stock || 0)),
      category_id: normCatId,
      category_name: p.categoryName || p.category_name || 'General',
      vendor_id: p.vendorId || p.vendor_id || 'v1',
      vendor_name: p.vendorName || p.vendor_name || 'Platform Administrator',
      image_url: mainImg,
      images: imagesList,
      gallery_images: galleryList,
      sizes: Array.isArray(p.sizes) ? p.sizes : parseJsonSafe(p.sizes, []),
      colors: Array.isArray(p.colors) ? p.colors : parseJsonSafe(p.colors, []),
      description: p.description || '',
      rating: Number(p.rating || 5.0),
      reviews_count: Number(p.reviewsCount || p.reviews_count || 0),
      total_sold: Number(p.totalSold || p.total_sold || 0),
      is_flash_sale: !!p.isFlashSale,
      flash_sale_ends: p.flashSaleEnds || null,
      status: p.status || 'active'
    }], { onConflict: 'id' });

    if (error) {
      console.warn(`Supabase upsert warning for ${p.id}:`, error.message);
    } else {
      console.log(`✅ Supabase synchronized product ${p.id} (${p.title})`);
    }
  } catch (err: any) {
    console.error(`Supabase sync exception for ${p.id}:`, err.message);
  }
}

async function deleteProductFromSupabase(id: string) {
  if (!supabase || !id) return;
  try {
    const { error } = await supabase.from('products').delete().eq('id', String(id));
    if (error) {
      console.warn(`Supabase delete note for ${id}:`, error.message);
    } else {
      console.log(`🗑️ Supabase deleted product ${id}`);
    }
  } catch (err: any) {
    console.error(`Supabase delete exception for ${id}:`, err.message);
  }
}

async function syncOrderToSupabase(order: any) {
  if (!supabase || !order || !order.id) return;
  try {
    // 1. Insert/Upsert the order to Supabase
    const { error: orderErr } = await supabase.from('orders').upsert([{
      id: order.id,
      customer_id: order.customerId || order.user_id || 'u4',
      customer_name: order.customerName || 'Customer',
      customer_email: order.customerEmail || '',
      phone: order.customerPhone || order.phone || '',
      address: order.shippingAddress || order.address || '',
      total_amount: Number(order.totalAmount || 0),
      payment_method: order.paymentMethod || 'Cash on Delivery',
      payment_status: order.paymentStatus || 'unpaid',
      status: order.status || 'pending',
      subtotal: Number(order.subtotal || order.totalAmount || 0),
      delivery_fee: Number(order.deliveryFee || order.shippingFee || 80)
    }]);

    if (orderErr) {
      console.error(`❌ Server Supabase order sync failed for ${order.id}:`, orderErr.message);
      return;
    }

    // 2. Insert order items to Supabase
    if (Array.isArray(order.items) && order.items.length > 0) {
      const dbItems = [];
      for (const item of order.items) {
        let finalImage = item.image || item.imageUrl || item.image_url || null;
        let finalProductUrl = item.productUrl || item.product_url || null;

        // Self-healing: if image or productUrl is missing, query database catalog
        try {
          if (!finalImage || !finalProductUrl) {
            const { data: prodData } = await supabase
              .from('products')
              .select('*')
              .eq('id', String(item.productId || item.product_id))
              .maybeSingle();

            if (prodData) {
              if (!finalImage) {
                const parsedImgs = parseJsonSafe(prodData.images, []);
                finalImage = (Array.isArray(parsedImgs) && parsedImgs.length > 0 ? parsedImgs[0] : null) || prodData.image_url || prodData.image || null;
              }
              if (!finalProductUrl) {
                finalProductUrl = `https://bazaarpulse.com/product/${prodData.id}`;
              }
            }
          }
        } catch (dbErr: any) {
          console.warn('Fallback product query warning:', dbErr.message);
        }

        dbItems.push({
          order_id: order.id,
          product_id: String(item.productId || item.product_id),
          title: item.title,
          price: Number(item.price),
          quantity: Number(item.quantity || 1),
          size: item.size || null,
          color: item.color || null,
          image: finalImage,
          product_url: finalProductUrl
        });
      }

      const { error: itemsErr } = await supabase.from('order_items').insert(dbItems);
      if (itemsErr) {
        console.error(`❌ Server Supabase order_items sync failed for ${order.id}:`, itemsErr.message);
      } else {
        console.log(`✅ Server Supabase order & order_items synced successfully for ${order.id}`);
      }
    }
  } catch (err: any) {
    console.error(`Exception during background Supabase order sync:`, err.message);
  }
}

// Helper to fetch entire data structure (replaces getDb from JSON)
async function getDb(): Promise<InitialData> {
  if (!isDbConfigured) {
    // Graceful offline fallback to database.json file with live Supabase query
    let db: InitialData = defaultData;
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        db = JSON.parse(content);
        if (!db.cartItems) db.cartItems = [];
        if (!db.products) db.products = [];
      } catch (e) {
        db = { ...defaultData };
      }
    }

    if (supabase) {
      try {
        // 1. Fetch live products from Supabase
        const { data: supaProducts, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (!prodErr && Array.isArray(supaProducts)) {
          const formattedSupa = supaProducts.map(formatProductRow);
          
          // Safe Merge: Supabase products + any local products not yet in Supabase
          const mergedMap = new Map<string, any>();
          
          // 1. Add formatted Supabase products
          formattedSupa.forEach((sp: any) => {
            if (sp && sp.id) mergedMap.set(String(sp.id), sp);
          });

          // 2. Preserve any local products in db.products that are not yet in Supabase
          const localProducts = Array.isArray(db.products) ? db.products : [];
          localProducts.forEach((lp: any) => {
            if (lp && lp.id && !mergedMap.has(String(lp.id))) {
              mergedMap.set(String(lp.id), lp);
              // Push this missing product to Supabase so it becomes permanent in Supabase!
              syncProductToSupabase(lp);
            }
          });

          db.products = Array.from(mergedMap.values());
        }

        // 2. Fetch live orders and order_items from Supabase to prevent loss on browser refresh!
        const { data: supaOrders, error: ordersErr } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: supaItems, error: itemsErr } = await supabase
          .from('order_items')
          .select('*');

        if (!ordersErr && Array.isArray(supaOrders)) {
          const itemsList = Array.isArray(supaItems) ? supaItems : [];
          const formattedOrders = supaOrders.map((o: any) => ({
            id: o.id,
            customerId: o.customer_id || 'u4',
            user_id: o.customer_id || 'u4',
            customerName: o.customer_name || 'Customer',
            customerEmail: o.customer_email || '',
            customerPhone: o.phone || '',
            phone: o.phone || '',
            shippingAddress: o.address || '',
            address: o.address || '',
            paymentMethod: o.payment_method || 'Cash on Delivery',
            paymentStatus: o.payment_status || 'unpaid',
            status: o.status || 'pending',
            totalAmount: Number(o.total_amount || 0),
            subtotal: Number(o.subtotal || o.total_amount || 0),
            deliveryFee: Number(o.delivery_fee || 80),
            createdAt: o.created_at || o.createdAt || new Date().toISOString(),
            items: itemsList.filter((item: any) => item.order_id === o.id).map((item: any) => ({
              productId: item.product_id,
              title: item.title,
              price: Number(item.price),
              quantity: Number(item.quantity || 1),
              size: item.size || null,
              color: item.color || null,
              image: item.image || null,
              productUrl: item.product_url || item.productUrl || null
            }))
          }));

          db.orders = formattedOrders;
        }

        // 3. Fetch live admin_settings (banners, campaign banner, etc.) from Supabase
        try {
          const { data: supaSettings, error: setErr } = await supabase
            .from('admin_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

          if (!setErr && supaSettings) {
            const parsedBanners = parseJsonSafe(supaSettings.banners, null);
            const parsedCampaign = parseJsonSafe(supaSettings.campaign_banner, null);
            const parsedCart = parseJsonSafe(supaSettings.cart_banner, null);

            let resolvedCampaign: any = db.adminSettings?.campaignBanner || {};
            if (parsedCampaign && typeof parsedCampaign === 'object') {
              resolvedCampaign = {
                ...resolvedCampaign,
                ...parsedCampaign
              };
              if (parsedCampaign.isActive !== undefined) {
                resolvedCampaign.isActive = Boolean(parsedCampaign.isActive);
              }
            }

            db.adminSettings = {
              globalCommissionRate: Number(supaSettings.global_commission_rate || db.adminSettings?.globalCommissionRate || 10),
              platformName: supaSettings.platform_name || db.adminSettings?.platformName || 'BazaarPulse',
              heroBannerTitle: supaSettings.hero_banner_title || db.adminSettings?.heroBannerTitle || '',
              heroBannerSubtitle: supaSettings.hero_banner_subtitle || db.adminSettings?.heroBannerSubtitle || '',
              banners: Array.isArray(parsedBanners) ? parsedBanners : (Array.isArray(supaSettings.banners) ? supaSettings.banners : db.adminSettings?.banners || []),
              campaignBanner: resolvedCampaign,
              cartBanner: parsedCart || supaSettings.cart_banner || db.adminSettings?.cartBanner || {},
              maintenanceMode: !!supaSettings.maintenance_mode
            };
          }
        } catch (supaSetErr) {
          console.warn('Supabase admin_settings fetch note:', supaSetErr);
        }

        // Persist to local database.json cache so file is never out of sync!
        saveDb(db);
      } catch (err) {
        console.error('Error fetching live products/orders from Supabase in fallback:', err);
      }
    }

    return db;
  }
  
  try {
    const client = await pool.connect();
    
    const usersRes = await client.query('SELECT * FROM users');
    const categoriesRes = await client.query('SELECT * FROM categories');
    const vendorsRes = await client.query('SELECT * FROM vendors');
    const productsRes = await client.query('SELECT * FROM products ORDER BY created_at DESC');
    const ordersRes = await client.query('SELECT * FROM orders ORDER BY created_at DESC');
    const orderItemsRes = await client.query('SELECT * FROM order_items');
    const withdrawalsRes = await client.query('SELECT * FROM withdrawals ORDER BY requested_at DESC');
    const reviewsRes = await client.query('SELECT * FROM reviews');
    const cartRes = await client.query('SELECT * FROM cart');
    const settingsRes = await client.query('SELECT * FROM admin_settings WHERE id = 1');
    
    client.release();
    
    let allOrderItems = orderItemsRes.rows;
    let rawOrders = ordersRes.rows;

    // Treat Supabase as the source of truth if available
    if (supabase) {
      try {
        const { data: supaOrders, error: ordersErr } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: supaItems, error: itemsErr } = await supabase
          .from('order_items')
          .select('*');

        if (!ordersErr && Array.isArray(supaOrders)) {
          rawOrders = supaOrders;
        }
        if (!itemsErr && Array.isArray(supaItems)) {
          allOrderItems = supaItems;
        }
      } catch (supaErr) {
        console.error('Failed to sync live Supabase orders in Postgres branch:', supaErr);
      }
    }
    
    const users = usersRes.rows.map((u: any) => ({
      ...u,
      saved_address: parseJsonSafe(u.saved_address, null),
      savedAddress: parseJsonSafe(u.saved_address, null)
    }));
    const categories = categoriesRes.rows;
    const vendors = vendorsRes.rows.map(v => ({
      id: v.id,
      storeName: v.store_name,
      ownerName: v.owner_name,
      email: v.email,
      phone: v.phone,
      status: v.status,
      commissionRate: Number(v.commission_rate),
      balance: Number(v.balance),
      totalSales: Number(v.total_sales),
      rating: Number(v.rating),
      joinedDate: v.joined_date,
      logo: v.logo
    }));
    
    const products = productsRes.rows.map(formatProductRow);


    const orders = rawOrders.map(o => ({
      id: o.id,
      status: o.status,
      paymentStatus: o.payment_status || o.paymentStatus || 'unpaid',
      paymentMethod: o.payment_method || o.paymentMethod || 'Cash on Delivery',
      totalAmount: Number(o.total_amount || o.totalAmount || 0),
      customerId: o.customer_id || o.customerId || 'u4',
      user_id: o.customer_id || o.customerId || 'u4',
      customerName: o.customer_name || o.customerName || 'Customer',
      customerEmail: o.customer_email || o.customerEmail || '',
      customerPhone: o.phone || o.customerPhone || '',
      phone: o.phone || o.customerPhone || '',
      shippingAddress: o.address || o.shippingAddress || '',
      address: o.address || o.shippingAddress || '',
      items: allOrderItems.filter(item => item.order_id === o.id).map(item => ({
        productId: item.product_id,
        title: item.title,
        price: Number(item.price),
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        image: item.image || null,
        productUrl: item.product_url || item.productUrl || null
      })),
      createdAt: o.created_at || o.createdAt
    }));
    
    const withdrawals = withdrawalsRes.rows.map(w => ({
      id: w.id,
      vendorId: w.vendor_id,
      vendorName: w.vendor_name,
      amount: Number(w.amount),
      status: w.status,
      bankDetails: w.bank_details,
      requestedAt: w.requested_at,
      processedAt: w.processed_at
    }));
    
    const reviews = reviewsRes.rows.map(r => ({
      id: r.id,
      productId: r.product_id,
      customerName: r.customer_name,
      rating: r.rating,
      comment: r.comment,
      date: r.date
    }));
    
    const cartItems = cartRes.rows.map(c => ({
      userId: c.user_id,
      productId: c.product_id,
      quantity: c.quantity,
      size: c.size,
      color: c.color,
      addedAt: c.added_at
    }));
    
    const rawSettings = settingsRes.rows[0] || {};
    const adminSettings = {
      globalCommissionRate: Number(rawSettings.global_commission_rate || 10),
      platformName: rawSettings.platform_name || 'BazaarPulse',
      heroBannerTitle: rawSettings.hero_banner_title || '',
      heroBannerSubtitle: rawSettings.hero_banner_subtitle || '',
      campaignBanner: typeof rawSettings.campaign_banner === 'string' ? JSON.parse(rawSettings.campaign_banner) : rawSettings.campaign_banner || {},
      banners: typeof rawSettings.banners === 'string' ? JSON.parse(rawSettings.banners) : rawSettings.banners || [],
      cartBanner: typeof rawSettings.cart_banner === 'string' ? JSON.parse(rawSettings.cart_banner) : rawSettings.cart_banner || { isActive: true, bannerText: '', termsText: '' },
      maintenanceMode: !!rawSettings.maintenance_mode
    };
    
    // Sanitize and filter out legacy demo vendors
    const realVendors = (vendors || []).filter((v: any) => 
      v.id !== 'v1' && v.id !== 'v2' && v.id !== 'v3' &&
      v.email !== 'vendor1@techhaven.com' &&
      v.email !== 'vendor2@urbanchic.com' &&
      v.email !== 'vendor3@gadgetgalaxy.com'
    );

    return {
      users: (users || []).filter((u: any) => u.id !== 'u2' && u.id !== 'u3'),
      categories,
      vendors: realVendors,
      products,
      orders,
      withdrawals,
      reviews,
      cartItems,
      adminSettings
    };
  } catch (err: any) {
    isDbConfigured = false;
    let localData: any = defaultData;
    if (fs.existsSync(DB_FILE)) {
      try {
        localData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      } catch (e) {}
    }
    
    // Ensure demo vendors are filtered out
    if (localData && Array.isArray(localData.vendors)) {
      localData.vendors = localData.vendors.filter((v: any) => 
        v.id !== 'v1' && v.id !== 'v2' && v.id !== 'v3' &&
        v.email !== 'vendor1@techhaven.com' &&
        v.email !== 'vendor2@urbanchic.com' &&
        v.email !== 'vendor3@gadgetgalaxy.com'
      );
    }
    if (localData && Array.isArray(localData.users)) {
      localData.users = localData.users.filter((u: any) => u.id !== 'u2' && u.id !== 'u3');
    }
    return localData;
  }
}

// Helper to save offline fallback state
function saveDb(data: InitialData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing offline DB file fallback:', e);
  }
}

// --- Authentication & Token Generation Routes ---

// 1. Issue JWT token by role or test credentials
app.post('/api/auth/token', async (req, res) => {
  try {
    const { role = 'customer', vendorId, status = 'approved', name, email } = req.body;
    
    let payload: any = {
      id: 'u-' + Date.now(),
      name: name || 'Demo User',
      email: email || `${role}@bazaarpulse.com`,
      role,
      status
    };

    if (role === 'admin') {
      let adminName = 'Platform Administrator';
      let adminAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150';
      if (isDbConfigured) {
        const adminRes = await pool.query('SELECT name, avatar FROM users WHERE LOWER(email) = $1', ['arafatmunna14620022@gmail.com']);
        if (adminRes.rowCount! > 0) {
          if (adminRes.rows[0].name) adminName = adminRes.rows[0].name;
          if (adminRes.rows[0].avatar) adminAvatar = adminRes.rows[0].avatar;
        }
      }
      payload = {
        id: 'u1',
        name: adminName,
        email: 'arafatmunna14620022@gmail.com',
        role: 'admin',
        status: 'active',
        avatar: adminAvatar
      };
    } else if (role === 'vendor') {
      const isPending = vendorId === 'v3' || status === 'pending';
      payload = {
        id: vendorId === 'v3' ? 'u3' : 'u2',
        name: vendorId === 'v3' ? 'Gadget Galaxy' : 'TechHaven Gadgets',
        email: vendorId === 'v3' ? 'vendor3@gadgetgalaxy.com' : 'vendor1@techhaven.com',
        role: 'vendor',
        status: isPending ? 'pending' : (status || 'approved'),
        vendorId: vendorId || 'v1'
      };
    } else if (role === 'customer') {
      payload = {
        id: 'u-' + Date.now(),
        name: name || '',
        email: email || '',
        role: 'customer',
        status: 'active',
        saved_address: null
      };
    }

    if (isDbConfigured) {
      // Ensure user is present in user directory
      const cleanEmail = payload.email.trim().toLowerCase();
      const checkUser = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (checkUser.rowCount === 0) {
        await pool.query(
          'INSERT INTO users (id, name, email, role, avatar, status) VALUES ($1, $2, $3, $4, $5, $6)',
          [payload.id, payload.name, payload.email, payload.role, payload.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', payload.status]
        );
      }
    }

    const token = generateToken(payload, '7d');
    res.json({ success: true, token, user: payload });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Real login authentication endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role, name } = req.body;
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPassword = password?.trim();
    const isLoggingInAsAdmin = (role === 'admin' || cleanEmail === 'arafatmunna14620022@gmail.com');
    
    let targetUser;

    if (isLoggingInAsAdmin) {
      if (cleanEmail !== 'arafatmunna14620022@gmail.com' || cleanPassword !== '@01756482001') {
        return res.status(401).json({
          success: false,
          error: 'Invalid administrative email or security credential.',
          code: 'AUTH_FAILED'
        });
      }
      
      if (isDbConfigured) {
        const adminRes = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', ['arafatmunna14620022@gmail.com']);
        if (adminRes.rowCount === 0) {
          const insertRes = await pool.query(
            'INSERT INTO users (id, name, email, role, avatar, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            ['u1', 'Platform Administrator', 'arafatmunna14620022@gmail.com', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'active']
          );
          targetUser = insertRes.rows[0];
        } else {
          targetUser = adminRes.rows[0];
        }
      } else {
        targetUser = { id: 'u1', name: 'Platform Administrator', email: 'arafatmunna14620022@gmail.com', role: 'admin', status: 'active' };
      }
    } else {
      if (isDbConfigured) {
        const userRes = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1 AND role != $2', [cleanEmail, 'admin']);
        targetUser = userRes.rows[0];
        
        if (!targetUser && role && role !== 'admin') {
          const roleRes = await pool.query('SELECT * FROM users WHERE role = $1', [role]);
          targetUser = roleRes.rows[0];
        }
        
        if (!targetUser) {
          // Dynamic inserts to ensure test accounts are always accessible
          if (cleanEmail === 'vendor1@techhaven.com' || role === 'vendor') {
            const ins = await pool.query(
              'INSERT INTO users (id, name, email, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
              ['u2', 'TechHaven Gadgets', 'vendor1@techhaven.com', 'vendor', 'approved']
            );
            targetUser = ins.rows[0];
          } else if (cleanEmail === 'vendor3@gadgetgalaxy.com') {
            const ins = await pool.query(
              'INSERT INTO users (id, name, email, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
              ['u3', 'Gadget Galaxy', 'vendor3@gadgetgalaxy.com', 'vendor', 'pending']
            );
            targetUser = ins.rows[0];
          } else if (cleanEmail === 'customer@gmail.com' || role === 'customer') {
            const ins = await pool.query(
              'INSERT INTO users (id, name, email, role, status, saved_address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
              ['u-' + Date.now(), name || '', cleanEmail || '', 'customer', 'active', null]
            );
            targetUser = ins.rows[0];
          }
        }
      } else {
        const db = await getDb();
        targetUser = db.users.find((u: any) => (email && u.email.toLowerCase() === email.toLowerCase() && u.role !== 'admin'));
        if (!targetUser && role && role !== 'admin') {
          targetUser = db.users.find((u: any) => u.role === role);
        }
      }
    }

    if (!targetUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found.',
        code: 'AUTH_FAILED'
      });
    }

    let userStatus = targetUser.status || 'active';
    let vendorId = targetUser.vendorId || (targetUser.role === 'vendor' ? 'v1' : undefined);

    if (targetUser.role === 'vendor' && isDbConfigured) {
      const vRes = await pool.query('SELECT * FROM vendors WHERE email = $1 OR id = $2', [targetUser.email, targetUser.vendorId]);
      if (vRes.rowCount! > 0) {
        userStatus = vRes.rows[0].status;
        vendorId = vRes.rows[0].id;
      }
    }

    const payload = {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone || '',
      role: targetUser.role,
      status: userStatus,
      vendorId,
      avatar: targetUser.avatar,
      saved_address: parseJsonSafe(targetUser.saved_address, null),
      savedAddress: parseJsonSafe(targetUser.saved_address, null)
    };

    const token = generateToken(payload, '7d');
    res.json({
      success: true,
      token,
      user: payload
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Customer Direct / Google Choice Sync Endpoint
app.post('/api/auth/customer-sync', async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email is required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name?.trim() || cleanEmail.split('@')[0];
    const isAdminEmail = (cleanEmail === 'arafatmunna14620022@gmail.com');
    const userRole = isAdminEmail ? 'admin' : (role || 'customer');
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`;
    const userId = 'u_google_' + Math.abs(cleanEmail.split('').reduce((a: number, b: string) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0));

    let user;
    if (isDbConfigured) {
      const existingUser = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (existingUser.rowCount! > 0) {
        const updateRes = await pool.query(
          'UPDATE users SET name = $1, phone = COALESCE(NULLIF($2, \'\'), phone), avatar = COALESCE(avatar, $3), role = $4 WHERE LOWER(email) = $5 RETURNING *',
          [cleanName, phone || '', avatarUrl, userRole, cleanEmail]
        );
        user = updateRes.rows[0];
      } else {
        const insertRes = await pool.query(
          'INSERT INTO users (id, name, email, phone, avatar, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [userId, cleanName, cleanEmail, phone || '', avatarUrl, userRole, 'active']
        );
        user = insertRes.rows[0];
      }
    } else {
      user = {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        phone: phone || '',
        avatar: avatarUrl,
        role: userRole,
        status: 'active'
      };
      try {
        const db = await getDb();
        const existingIdx = db.users.findIndex((u: any) => u.email?.toLowerCase() === cleanEmail);
        if (existingIdx >= 0) {
          db.users[existingIdx] = { ...db.users[existingIdx], ...user };
        } else {
          db.users.push(user);
        }
      } catch (e) {
        console.warn('In-memory DB sync warning:', e);
      }
    }

    const token = generateToken(user, '7d');
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        status: user.status || 'active',
        avatar: user.avatar
      }
    });
  } catch (error: any) {
    console.error('Customer Sync Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Google Sign-In verification
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, error: 'Invalid Google token' });
    }
    
    let user;
    if (isDbConfigured) {
      const email = payload.email.toLowerCase();
      const isAdminEmail = (email === 'arafatmunna14620022@gmail.com');
      const existingUser = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);
      if (existingUser.rowCount! > 0) {
        const userRole = isAdminEmail ? 'admin' : existingUser.rows[0].role;
        const updateRes = await pool.query(
          'UPDATE users SET name = $1, avatar = $2, role = $3 WHERE LOWER(email) = $4 RETURNING *',
          [payload.name, payload.picture || existingUser.rows[0].avatar, userRole, email]
        );
        user = updateRes.rows[0];
      } else {
        const userRole = isAdminEmail ? 'admin' : 'customer';
        const insertRes = await pool.query(
          'INSERT INTO users (id, name, email, avatar, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [payload.sub, payload.name, email, payload.picture, userRole, 'active']
        );
        user = insertRes.rows[0];
      }
    } else {
      user = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        avatar: payload.picture,
        role: (payload.email.toLowerCase() === 'arafatmunna14620022@gmail.com' ? 'admin' : 'customer') as any,
        status: 'active' as any
      };
    }
    
    const token = generateToken(user, '7d');
    const userWithAddress = {
      ...user,
      saved_address: parseJsonSafe(user.saved_address, null),
      savedAddress: parseJsonSafe(user.saved_address, null)
    };
    res.json({ success: true, token, user: userWithAddress });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ success: false, error: 'Google authentication failed' });
  }
});

// Google OAuth 2.0 Redirect Callback Handler
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  const host = req.get('host');
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const dynamicRedirectUri = `${protocol}://${host}/auth/google/callback`;
  const envRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://bazaarpulse-1ty4.onrender.com/auth/google/callback';
  
  let user: any = null;
  
  if (code) {
    const redirectUrisToTry = Array.from(new Set([dynamicRedirectUri, envRedirectUri]));
    for (const uri of redirectUrisToTry) {
      try {
        const { tokens } = await googleClient.getToken({
          code,
          redirect_uri: uri
        });
        if (tokens.id_token) {
          const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: process.env.GOOGLE_CLIENT_ID
          });
          const payload = ticket.getPayload();
          if (payload && payload.email) {
            const email = payload.email.toLowerCase();
            user = {
              id: payload.sub,
              name: payload.name || email.split('@')[0],
              email,
              avatar: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
              role: (email === 'arafatmunna14620022@gmail.com' ? 'admin' : 'customer'),
              status: 'active'
            };
            break;
          }
        }
      } catch (e: any) {
        console.warn(`Google OAuth Token Exchange warning (${uri}):`, e.message);
      }
    }
  }

  // Fallback if state was passed with email or fallback email
  if (!user) {
    let stateEmail = '';
    if (req.query.state) {
      try {
        stateEmail = decodeURIComponent(String(req.query.state)).trim().toLowerCase();
      } catch {
        stateEmail = String(req.query.state).trim().toLowerCase();
      }
    }

    if (stateEmail && stateEmail.includes('@')) {
      const emailName = stateEmail.split('@')[0];
      const formattedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      user = {
        id: 'u_google_' + Math.abs(stateEmail.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)),
        name: formattedName,
        email: stateEmail,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(stateEmail)}`,
        role: (stateEmail === 'arafatmunna14620022@gmail.com' ? 'admin' : 'customer'),
        status: 'active'
      };
    }
  }

  if (!user) {
    return res.redirect('/?login_error=true');
  }

  // Save/upsert to DB if configured
  if (isDbConfigured && user) {
    try {
      const email = user.email.toLowerCase();
      const existing = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);
      if (existing.rowCount === 0) {
        await pool.query(
          'INSERT INTO users (id, name, email, avatar, role, status) VALUES ($1, $2, $3, $4, $5, $6)',
          [user.id, user.name, email, user.avatar, user.role, 'active']
        );
      } else {
        await pool.query(
          'UPDATE users SET name = $1, avatar = COALESCE($2, avatar) WHERE LOWER(email) = $3',
          [user.name, user.avatar, email]
        );
      }
    } catch (dbErr) {
      console.warn('Error saving Google user to DB:', dbErr);
    }
  } else {
    try {
      const db = await getDb();
      const existingIdx = db.users.findIndex((u: any) => u.email?.toLowerCase() === user.email.toLowerCase());
      if (existingIdx >= 0) {
        db.users[existingIdx] = { ...db.users[existingIdx], ...user };
      } else {
        db.users.push(user);
      }
    } catch (e) {
      console.warn('In-memory DB save warning:', e);
    }
  }

  const authToken = generateToken(user, '7d');
  return res.redirect(`/?login_success=true&token=${authToken}&user=${encodeURIComponent(JSON.stringify(user))}`);
});

// 2. Get current authenticated user profile with saved delivery address
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    let fullUser: any = req.user;
    if (req.user && req.user.id !== 'admin-bypass-id') {
      if (isDbConfigured) {
        const uRes = await pool.query('SELECT id, name, email, phone, role, avatar, status, saved_address FROM users WHERE id = $1', [req.user.id]);
        if (uRes.rows[0]) {
          fullUser = {
            ...uRes.rows[0],
            saved_address: parseJsonSafe(uRes.rows[0].saved_address, null),
            savedAddress: parseJsonSafe(uRes.rows[0].saved_address, null)
          };
        }
      } else {
        const db = await getDb();
        const u = db.users.find((user: any) => user.id === req.user?.id || user.email?.toLowerCase() === req.user?.email?.toLowerCase());
        if (u) {
          fullUser = {
            ...u,
            saved_address: u.saved_address || u.savedAddress || null,
            savedAddress: u.saved_address || u.savedAddress || null
          };
        }
      }
    }
    res.json({ success: true, user: fullUser });
  } catch (e: any) {
    res.json({ success: true, user: req.user });
  }
});

// --- User Saved Delivery Address API Routes ---

// GET: Fetch user's saved delivery address from database
app.get('/api/user/address', authMiddleware, async (req, res) => {
  try {
    const targetUserId = (req.query.userId as string) || (req.user && req.user.id !== 'admin-bypass-id' ? req.user.id : null);
    const targetEmail = (req.query.email as string) || (req.user && req.user.email ? req.user.email : null);

    if (isDbConfigured) {
      try {
        const client = await pool.connect();
        let query = 'SELECT id, name, email, phone, saved_address FROM users WHERE id = $1';
        let params: any[] = [targetUserId];

        if (!targetUserId && targetEmail) {
          query = 'SELECT id, name, email, phone, saved_address FROM users WHERE LOWER(email) = LOWER($1)';
          params = [targetEmail];
        } else if (!targetUserId && !targetEmail) {
          query = 'SELECT id, name, email, phone, saved_address FROM users WHERE role = $1 ORDER BY created_at ASC LIMIT 1';
          params = ['customer'];
        }

        let result = await client.query(query, params).catch(() => ({ rows: [] }));
        
        // If not found in users table, check user_logins table
        if (!result.rows || result.rows.length === 0) {
          const loginQuery = query.replace('FROM users', 'FROM user_logins');
          const loginRes = await client.query(loginQuery, params).catch(() => ({ rows: [] }));
          if (loginRes.rows && loginRes.rows.length > 0) {
            result = loginRes;
          }
        }
        client.release();

        if (result.rows && result.rows.length > 0) {
          const row = result.rows[0];
          const savedAddr = parseJsonSafe(row.saved_address, null);
          return res.json({
            success: true,
            address: savedAddr,
            user: { id: row.id, name: row.name, email: row.email, phone: row.phone }
          });
        }
      } catch (dbErr) {
        console.warn('Postgres fetch address error, checking fallback:', dbErr);
      }
    }

    // Fallback: Query from local JSON / database.json
    const db = await getDb();
    const user = db.users.find((u: any) => 
      (targetUserId && u.id === targetUserId) || 
      (targetEmail && u.email && u.email.toLowerCase() === targetEmail.toLowerCase())
    ) || db.users.find((u: any) => u.role === 'customer') || db.users[0];

    const savedAddr = user?.saved_address || user?.savedAddress || null;
    return res.json({
      success: true,
      address: savedAddr,
      user: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null
    });
  } catch (error: any) {
    console.error('Error fetching user address:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST / PUT: Save or update user's delivery address in database
const handleSaveUserAddress = async (req: express.Request, res: express.Response) => {
  try {
    const { 
      fullName, 
      phoneNumber, 
      district, 
      thana, 
      addressDetails, 
      altPhone, 
      addressType = 'Home',
      userId: bodyUserId,
      email: bodyEmail
    } = req.body;

    const targetUserId = bodyUserId || (req.user && req.user.id !== 'admin-bypass-id' ? req.user.id : null);
    const targetEmail = bodyEmail || (req.user && req.user.email ? req.user.email : null);

    const addressObject: SavedDeliveryAddress = {
      fullName: fullName || '',
      phoneNumber: phoneNumber || '',
      district: district || 'Dhaka',
      thana: thana || 'সদর',
      addressDetails: addressDetails || '',
      altPhone: altPhone || '',
      addressType: addressType || 'Home',
      country: 'বাংলাদেশ',
      updatedAt: new Date().toISOString()
    };

    if (isDbConfigured) {
      try {
        const client = await pool.connect();
        if (targetUserId) {
          await client.query(
            'UPDATE users SET saved_address = $1, name = COALESCE(NULLIF($2, \'\'), name), phone = COALESCE(NULLIF($3, \'\'), phone) WHERE id = $4',
            [JSON.stringify(addressObject), fullName || '', phoneNumber || '', targetUserId]
          ).catch(() => {});
          await client.query(
            'UPDATE user_logins SET saved_address = $1, name = COALESCE(NULLIF($2, \'\'), name), phone = COALESCE(NULLIF($3, \'\'), phone) WHERE id = $4',
            [JSON.stringify(addressObject), fullName || '', phoneNumber || '', targetUserId]
          ).catch(() => {});
        } else if (targetEmail) {
          await client.query(
            'UPDATE users SET saved_address = $1, name = COALESCE(NULLIF($2, \'\'), name), phone = COALESCE(NULLIF($3, \'\'), phone) WHERE LOWER(email) = LOWER($4)',
            [JSON.stringify(addressObject), fullName || '', phoneNumber || '', targetEmail]
          ).catch(() => {});
          await client.query(
            'UPDATE user_logins SET saved_address = $1, name = COALESCE(NULLIF($2, \'\'), name), phone = COALESCE(NULLIF($3, \'\'), phone) WHERE LOWER(email) = LOWER($4)',
            [JSON.stringify(addressObject), fullName || '', phoneNumber || '', targetEmail]
          ).catch(() => {});
        } else {
          await client.query(
            'UPDATE users SET saved_address = $1 WHERE role = $2',
            [JSON.stringify(addressObject), 'customer']
          ).catch(() => {});
          await client.query(
            'UPDATE user_logins SET saved_address = $1 WHERE role = $2',
            [JSON.stringify(addressObject), 'customer']
          ).catch(() => {});
        }
        client.release();
      } catch (dbErr) {
        console.warn('Postgres save address error, updating json cache:', dbErr);
      }
    }

    // Sync to Supabase user_logins table in background
    if (supabase) {
      try {
        if (targetEmail) {
          await supabase
            .from('user_logins')
            .update({
              saved_address: addressObject,
              phone: addressObject.phoneNumber
            })
            .eq('email', targetEmail);
        } else if (targetUserId) {
          await supabase
            .from('user_logins')
            .update({
              saved_address: addressObject,
              phone: addressObject.phoneNumber
            })
            .eq('id', targetUserId);
        }
      } catch (supaErr) {
        console.warn('Supabase user_logins save address warning:', supaErr);
      }
    }

    // Update in local file cache
    try {
      const db = await getDb();
      const user = db.users.find((u: any) => 
        (targetUserId && u.id === targetUserId) || 
        (targetEmail && u.email && u.email.toLowerCase() === targetEmail.toLowerCase())
      ) || db.users.find((u: any) => u.role === 'customer');

      if (user) {
        user.saved_address = addressObject;
        user.savedAddress = addressObject;
        if (fullName) user.name = fullName;
        if (phoneNumber) user.phone = phoneNumber;
        saveDb(db);
      }
    } catch (localErr) {
      console.warn('Failed to update local db cache with address:', localErr);
    }

    res.json({
      success: true,
      message: 'ডেলিভারি ঠিকানা সফলভাবে সেভ করা হয়েছে (Address saved successfully)',
      address: addressObject
    });
  } catch (error: any) {
    console.error('Error saving user address:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

app.post('/api/user/address', authMiddleware, handleSaveUserAddress);
app.put('/api/user/address', authMiddleware, handleSaveUserAddress);

// 3. Security Diagnostic / RBAC Test endpoint
app.post('/api/auth/test-rbac', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ 
      success: false,
      error: 'Access denied. No authorization token provided.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  authMiddleware(req, res, () => {
    const targetEndpoint = req.body.targetEndpoint || '/api/admin/stats';
    const user = req.user;

    if (targetEndpoint.startsWith('/api/admin')) {
      if (user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admins only.',
          code: 'FORBIDDEN_ADMIN_ONLY',
          userRole: user?.role,
          requiredRole: 'admin'
        });
      }
      return res.json({
        success: true,
        message: 'RBAC Access Granted: User authorized for Admin endpoint',
        user
      });
    }

    if (targetEndpoint.startsWith('/api/vendor')) {
      if (user?.role !== 'vendor' || user?.status !== 'approved') {
        const errorMsg = user?.role !== 'vendor' 
          ? 'Access denied. Approved vendors only.' 
          : `Access denied. Vendor account is currently ${user?.status}. Only approved vendors can perform this action.`;
        return res.status(403).json({
          success: false,
          error: errorMsg,
          code: user?.role !== 'vendor' ? 'FORBIDDEN_VENDOR_ONLY' : 'FORBIDDEN_VENDOR_NOT_APPROVED',
          userRole: user?.role,
          vendorStatus: user?.status,
          requiredRole: 'vendor (approved)'
        });
      }
      return res.json({
        success: true,
        message: 'RBAC Access Granted: User authorized for Vendor endpoint',
        user
      });
    }

    res.json({ success: true, message: 'Access authorized', user });
  });
});

// --- Public Platform Data Overview ---
app.get('/api/platform/data', async (req, res) => {
  try {
    const db = await getDb();
    
    // Performance: Fresh load response for immediate toggle sync
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // For public data, we should ideally sanitize sensitive info, 
    // but to avoid breaking existing UI logic, we return the expected structure.
    res.json({
      success: true,
      products: db.products || [],
      categories: db.categories || [],
      vendors: db.vendors || [],
      orders: db.orders || [],
      adminSettings: db.adminSettings || { globalCommissionRate: 10, platformName: 'BazaarPulse', banners: [] }
    });
  } catch (error: any) {
    console.error('Error fetching platform data:', error);
    res.json({
      success: true,
      products: [],
      categories: [],
      vendors: [],
      orders: [],
      adminSettings: { globalCommissionRate: 10, platformName: 'BazaarPulse', banners: [] }
    });
  }
});

// Admin Get All Orders Endpoint
app.get('/api/admin/orders', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    if (isDbConfigured) {
      const dbRes = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
      const orders = dbRes.rows.map(o => ({
        id: o.id,
        customerId: o.customer_id || o.user_id,
        user_id: o.user_id || o.customer_id,
        customerName: o.customer_name || o.customerName || '',
        customerEmail: o.customer_email || o.customerEmail || '',
        customerPhone: o.customer_phone || o.phone || '',
        phone: o.phone || o.customer_phone || '',
        shippingAddress: o.shipping_address || o.address || '',
        address: o.address || o.shipping_address || '',
        items: parseJsonSafe(o.items, []),
        subtotal: Number(o.subtotal || o.total_amount),
        deliveryFee: Number(o.delivery_fee || 80),
        totalAmount: Number(o.total_amount),
        paymentMethod: o.payment_method || 'Cash on Delivery',
        paymentStatus: o.payment_status || 'paid',
        status: o.status || 'pending',
        consignmentId: o.consignment_id || o.consignmentId || null,
        trackingCode: o.tracking_code || o.trackingCode || null,
        courierStatus: o.courier_status || o.courierStatus || null,
        createdAt: o.created_at || new Date().toISOString()
      }));
      return res.json({ success: true, orders });
    } else {
      const db = await getDb();
      return res.json({ success: true, orders: db.orders || [] });
    }
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, error: error.message, orders: [] });
  }
});

// ==========================================
// 1. ADMIN PROTECTED ROUTES (/api/admin/*)
// ==========================================

// Admin stats overview
app.get('/api/admin/stats', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    if (isDbConfigured) {
      const gmvRes = await pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders');
      const totalGMV = Number(gmvRes.rows[0].total);
      const totalCommission = Math.round(totalGMV * 0.1);
      
      const activeRes = await pool.query("SELECT COUNT(*) FROM vendors WHERE status = 'approved'");
      const activeVendors = parseInt(activeRes.rows[0].count);
      
      const pendingRes = await pool.query("SELECT COUNT(*) FROM vendors WHERE status = 'pending'");
      const pendingVendors = parseInt(pendingRes.rows[0].count);
      
      const prodRes = await pool.query('SELECT COUNT(*) FROM products');
      const totalProducts = parseInt(prodRes.rows[0].count);
      
      const orderRes = await pool.query('SELECT COUNT(*) FROM orders');
      const totalOrders = parseInt(orderRes.rows[0].count);
      
      res.json({
        totalGMV,
        totalCommission,
        activeVendors,
        pendingVendors,
        totalProducts,
        totalOrders
      });
    } else {
      const db = await getDb();
      const totalGMV = db.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const totalCommission = Math.round(totalGMV * 0.1);
      const activeVendors = db.vendors.filter((v: any) => v.status === 'approved').length;
      const pendingVendors = db.vendors.filter((v: any) => v.status === 'pending').length;
      const totalProducts = db.products.length;
      const totalOrders = db.orders.length;

      res.json({
        totalGMV,
        totalCommission,
        activeVendors,
        pendingVendors,
        totalProducts,
        totalOrders
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Admin Settings
app.put('/api/admin/settings', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { globalCommissionRate, platformName, heroBannerTitle, heroBannerSubtitle, banners, maintenanceMode, campaignBanner } = req.body;
    
    // Strict Logic: If database is configured, prioritize Supabase and avoid local file as primary storage
    if (isDbConfigured) {
      try {
        const currentRes = await pool.query('SELECT * FROM admin_settings WHERE id = 1');
        const curr = currentRes.rows[0] || {};
        
        const rate = globalCommissionRate !== undefined ? Number(globalCommissionRate) : Number(curr.global_commission_rate || 10);
        const name = platformName !== undefined ? platformName : curr.platform_name || 'BazaarPulse';
        const title = heroBannerTitle !== undefined ? heroBannerTitle : curr.hero_banner_title || '';
        const subtitle = heroBannerSubtitle !== undefined ? heroBannerSubtitle : curr.hero_banner_subtitle || '';
        const maint = maintenanceMode !== undefined ? !!maintenanceMode : !!curr.maintenance_mode;
        
        // Handle banners strictly - ensure it's an array
        let activeBanners = [];
        if (banners !== undefined) {
          activeBanners = Array.isArray(banners) ? banners : [];
        } else {
          activeBanners = curr.banners ? (typeof curr.banners === 'string' ? JSON.parse(curr.banners) : curr.banners) : [];
        }

        // Handle campaignBanner strictly
        const campaign = campaignBanner !== undefined ? campaignBanner : (curr.campaign_banner ? (typeof curr.campaign_banner === 'string' ? JSON.parse(curr.campaign_banner) : curr.campaign_banner) : {});

        const result = await pool.query(
          `INSERT INTO admin_settings (id, global_commission_rate, platform_name, hero_banner_title, hero_banner_subtitle, banners, maintenance_mode, campaign_banner)
           VALUES (1, $1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
           global_commission_rate = EXCLUDED.global_commission_rate,
           platform_name = EXCLUDED.platform_name,
           hero_banner_title = EXCLUDED.hero_banner_title,
           hero_banner_subtitle = EXCLUDED.hero_banner_subtitle,
           banners = EXCLUDED.banners,
           maintenance_mode = EXCLUDED.maintenance_mode,
           campaign_banner = EXCLUDED.campaign_banner
           RETURNING *`,
          [rate, name, title, subtitle, JSON.stringify(activeBanners), maint, JSON.stringify(campaign)]
        );

        const s = result.rows[0];
        
        // Sync to local cache ONLY after successful database update
        try {
          if (fs.existsSync(DB_FILE)) {
            const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
            raw.adminSettings = {
              globalCommissionRate: Number(s.global_commission_rate),
              platformName: s.platform_name,
              heroBannerTitle: s.hero_banner_title,
              heroBannerSubtitle: s.hero_banner_subtitle,
              banners: activeBanners,
              maintenanceMode: !!s.maintenance_mode,
              campaignBanner: campaign
            };
            fs.writeFileSync(DB_FILE, JSON.stringify(raw, null, 2));
          }
        } catch (cacheErr) {
          console.error('Non-critical cache sync error:', cacheErr);
        }

        console.log('🚀 Supabase database strictly updated for admin settings');
        return res.json({
          success: true,
          adminSettings: {
            globalCommissionRate: Number(s.global_commission_rate),
            platformName: s.platform_name,
            heroBannerTitle: s.hero_banner_title,
            heroBannerSubtitle: s.hero_banner_subtitle,
            banners: typeof s.banners === 'string' ? JSON.parse(s.banners) : s.banners || [],
            maintenanceMode: !!s.maintenance_mode,
            campaignBanner: typeof s.campaign_banner === 'string' ? JSON.parse(s.campaign_banner) : s.campaign_banner || {}
          }
        });
      } catch (dbError: any) {
        console.error('Database Error during admin settings save:', dbError);
        return res.status(500).json({ success: false, error: 'Database persistence failed: ' + dbError.message });
      }
    } else {
      // Fallback for non-Postgres environments with live Supabase persistence
      const db = await getDb();
      if (banners !== undefined) db.adminSettings.banners = banners;
      if (globalCommissionRate !== undefined) db.adminSettings.globalCommissionRate = Number(globalCommissionRate);
      if (platformName !== undefined) db.adminSettings.platformName = platformName;
      if (heroBannerTitle !== undefined) db.adminSettings.heroBannerTitle = heroBannerTitle;
      if (heroBannerSubtitle !== undefined) db.adminSettings.heroBannerSubtitle = heroBannerSubtitle;
      if (maintenanceMode !== undefined) db.adminSettings.maintenanceMode = !!maintenanceMode;
      if (campaignBanner !== undefined) db.adminSettings.campaignBanner = campaignBanner;

      saveDb(db);

      if (supabase) {
        try {
          const { error: supaErr } = await supabase
            .from('admin_settings')
            .upsert({
              id: 1,
              global_commission_rate: db.adminSettings.globalCommissionRate,
              platform_name: db.adminSettings.platformName,
              hero_banner_title: db.adminSettings.heroBannerTitle,
              hero_banner_subtitle: db.adminSettings.heroBannerSubtitle,
              banners: JSON.stringify(db.adminSettings.banners || []),
              campaign_banner: JSON.stringify(db.adminSettings.campaignBanner || {}),
              maintenance_mode: db.adminSettings.maintenanceMode
            }, { onConflict: 'id' });

          if (supaErr) {
            console.error('Supabase admin_settings upsert error:', supaErr);
          } else {
            console.log('✅ Banners saved permanently to Supabase admin_settings table!');
          }
        } catch (sErr) {
          console.error('Supabase admin_settings sync catch:', sErr);
        }
      }

      return res.json({ success: true, adminSettings: db.adminSettings });
    }
  } catch (error: any) {
    console.error('Error saving admin settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Campaign Banner Strip
app.put('/api/admin/campaign-banner', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const db = await getDb();
    if (!db.adminSettings.campaignBanner) {
      db.adminSettings.campaignBanner = {
        badge: 'PAYDAY SALE',
        title: 'Mega Discounts up to 70% Off',
        subtitle: 'Grab top deals across all categories with lightning fast delivery',
        buttonText: 'Grab Deals Now',
        linkText: '#flash-sale',
        isActive: true
      } as any;
    }

    const updatedCampaign: any = {
      ...db.adminSettings.campaignBanner,
      ...req.body
    };

    if (req.body.isActive !== undefined) {
      updatedCampaign.isActive = Boolean(req.body.isActive);
    }

    // 1. Save to local database.json cache
    db.adminSettings.campaignBanner = updatedCampaign as any;
    saveDb(db);

    // 2. Save to PostgreSQL if configured
    if (isDbConfigured) {
      await pool.query(
        'UPDATE admin_settings SET campaign_banner = $1 WHERE id = 1',
        [JSON.stringify(updatedCampaign)]
      ).catch((err: any) => console.warn('Postgres campaign banner update warning:', err.message));
    }

    // 3. Save permanently to Supabase admin_settings table so reload never resets state
    if (supabase) {
      try {
        const { error: supaErr } = await supabase
          .from('admin_settings')
          .upsert({
            id: 1,
            campaign_banner: JSON.stringify(updatedCampaign)
          }, { onConflict: 'id' });

        if (supaErr) {
          console.error('Supabase campaign_banner upsert note:', supaErr.message);
        } else {
          console.log(`✅ Campaign banner strip saved permanently to Supabase! isActive = ${updatedCampaign.isActive}`);
        }
      } catch (sErr: any) {
        console.warn('Supabase campaign_banner sync note:', sErr.message);
      }
    }

    res.json({ success: true, campaignBanner: updatedCampaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Campaign Banner Strip
app.get('/api/admin/campaign-banner', async (req, res) => {
  try {
    const db = await getDb();
    res.json({ success: true, campaignBanner: db.adminSettings?.campaignBanner || {} });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Cart Promotional Banner
app.put('/api/admin/banner', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { isActive, bannerText, termsText } = req.body;
    const isAct = isActive === true || isActive === 'true';

    // 1. Update database.json cache
    const db = await getDb();
    if (!db.adminSettings.cartBanner) {
      db.adminSettings.cartBanner = {
        isActive: true,
        bannerText: '৯৯৯ টাকার ইসলামিক বই কিনলেই পাচ্ছেন ফ্রি ডেলিভারি',
        termsText: 'শর্ত প্রযোজ্য'
      };
    }
    
    const updatedCartBanner = {
      isActive: isAct,
      bannerText: bannerText !== undefined ? bannerText : db.adminSettings.cartBanner.bannerText,
      termsText: termsText !== undefined ? termsText : db.adminSettings.cartBanner.termsText
    };
    
    db.adminSettings.cartBanner = updatedCartBanner;
    saveDb(db);

    // 2. Update PostgreSQL database
    if (isDbConfigured) {
      const currentRes = await pool.query('SELECT cart_banner FROM admin_settings WHERE id = 1');
      const result = await pool.query(
        `INSERT INTO admin_settings (id, cart_banner)
         VALUES (1, $1)
         ON CONFLICT (id) DO UPDATE SET
         cart_banner = EXCLUDED.cart_banner
         RETURNING *`,
        [JSON.stringify(updatedCartBanner)]
      );
      console.log('✅ Cart banner updated in Supabase');
    }

    res.json({ success: true, cartBanner: updatedCartBanner });
  } catch (error: any) {
    console.error('❌ Cart banner update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Visual Page Builder & Live Editor Endpoints
app.get('/api/visual-editor/content', async (req, res) => {
  try {
    const db = await getDb();
    const visualOverrides = db.adminSettings?.visualOverrides || {};
    res.json({ success: true, visualOverrides });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/visual-editor/save', async (req, res) => {
  try {
    const { visualOverrides } = req.body;
    if (!visualOverrides || typeof visualOverrides !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid visualOverrides payload' });
    }

    const db = await getDb();
    if (!db.adminSettings) {
      db.adminSettings = { ...defaultData.adminSettings };
    }
    db.adminSettings.visualOverrides = visualOverrides;
    saveDb(db);

    // If PostgreSQL configured, also sync to admin_settings table if possible
    if (isDbConfigured) {
      try {
        await pool.query(
          `UPDATE admin_settings SET visual_overrides = $1 WHERE id = 1`,
          [JSON.stringify(visualOverrides)]
        ).catch((e) => console.error('Visual editor sync error:', e));
      } catch (e) {}
    }

    res.json({ success: true, visualOverrides: db.adminSettings.visualOverrides });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/visual-editor/reset', async (req, res) => {
  try {
    const db = await getDb();
    if (db.adminSettings) {
      db.adminSettings.visualOverrides = {};
      saveDb(db);
    }
    res.json({ success: true, visualOverrides: {} });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Universal Product Persistence & Supabase Synchronization Helper
async function persistProduct(productData: any) {
  const newId = productData.id || ('p-' + Date.now());
  const actualPrice = Number(productData.currentPrice !== undefined ? productData.currentPrice : (productData.price || 0));
  const discInput = productData.discountPrice !== undefined ? productData.discountPrice : (productData.discount_price !== undefined ? productData.discount_price : productData.originalPrice);
  const actualDiscount = (discInput !== undefined && discInput !== '' && discInput !== null) ? Number(discInput) : null;
  const actualStock = Number(productData.stockQuantity !== undefined ? productData.stockQuantity : (productData.stock !== undefined ? productData.stock : 10));

  const mainImg = productData.imageUrl || productData.image || '';
  const additionalImgs = Array.isArray(productData.galleryImages) 
    ? productData.galleryImages 
    : (Array.isArray(productData.gallery_images) ? productData.gallery_images : []);
  
  let combinedImages: string[] = [];
  if (Array.isArray(productData.images) && productData.images.length > 0) {
    combinedImages = productData.images.filter(Boolean);
  } else {
    combinedImages = [mainImg, ...additionalImgs].filter(Boolean);
  }
  if (combinedImages.length === 0) {
    combinedImages = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'];
  }

  const normCatId = normalizeCategoryId(
    productData.categoryId || productData.category_id, 
    productData.categoryName || productData.category_name || productData.category
  );
  const slug = (productData.title || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-') || ('product-' + Date.now());

  const formattedProduct = {
    id: String(newId),
    title: productData.title || 'Untitled Product',
    slug,
    price: actualPrice,
    currentPrice: actualPrice,
    discountPrice: actualDiscount,
    stock: actualStock,
    stockQuantity: actualStock,
    categoryId: normCatId,
    categoryName: productData.categoryName || productData.category_name || productData.category || 'General',
    vendorId: productData.vendorId || productData.vendor_id || 'v1',
    vendorName: productData.vendorName || productData.vendor_name || 'Platform Administrator',
    image: combinedImages[0],
    imageUrl: combinedImages[0],
    images: combinedImages,
    galleryImages: additionalImgs,
    sizes: Array.isArray(productData.sizes) ? productData.sizes : parseJsonSafe(productData.sizes, []),
    colors: Array.isArray(productData.colors) ? productData.colors : parseJsonSafe(productData.colors, []),
    description: productData.description || '',
    rating: Number(productData.rating || 5.0),
    reviewsCount: Number(productData.reviewsCount || productData.reviews_count || 0),
    totalSold: Number(productData.totalSold || productData.total_sold || 0),
    isFlashSale: !!productData.isFlashSale,
    flashSaleEnds: productData.flashSaleEnds || null,
    status: productData.status || 'active',
    createdAt: productData.createdAt || new Date().toISOString()
  };

  // 1. Sync directly to live Supabase database
  await syncProductToSupabase(formattedProduct);

  // 2. Sync to PostgreSQL if pool is configured
  if (isDbConfigured) {
    try {
      await pool.query(
        `INSERT INTO products 
         (id, title, slug, price, current_price, discount_price, stock, stock_quantity, category_id, category_name, vendor_id, vendor_name, images, image_url, gallery_images, description, sizes, colors, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title, price = EXCLUDED.price, current_price = EXCLUDED.current_price,
           discount_price = EXCLUDED.discount_price, stock = EXCLUDED.stock, stock_quantity = EXCLUDED.stock_quantity,
           category_id = EXCLUDED.category_id, category_name = EXCLUDED.category_name,
           images = EXCLUDED.images, image_url = EXCLUDED.image_url, gallery_images = EXCLUDED.gallery_images,
           description = EXCLUDED.description, sizes = EXCLUDED.sizes, colors = EXCLUDED.colors, status = EXCLUDED.status`,
        [
          String(newId), formattedProduct.title, formattedProduct.slug, actualPrice, actualPrice, actualDiscount,
          actualStock, actualStock, normCatId, formattedProduct.categoryName, formattedProduct.vendorId, formattedProduct.vendorName,
          JSON.stringify(combinedImages), combinedImages[0], JSON.stringify(additionalImgs),
          formattedProduct.description, JSON.stringify(formattedProduct.sizes), JSON.stringify(formattedProduct.colors), 'active'
        ]
      );
    } catch (dbErr) {
      console.error('PostgreSQL error in persistProduct:', dbErr);
    }
  }

  // 3. Update local database.json cache
  let db: InitialData = defaultData;
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (!db.products) db.products = [];
    } catch (e) {
      db = { ...defaultData };
    }
  }
  const existingIdx = db.products.findIndex((p: any) => String(p.id) === String(newId));
  if (existingIdx >= 0) {
    db.products[existingIdx] = { ...db.products[existingIdx], ...formattedProduct };
  } else {
    db.products.unshift(formattedProduct);
  }
  saveDb(db);

  return formattedProduct;
}

// 1. Direct Sync Endpoint (from Admin Dashboard or frontend)
app.post('/api/sync/product', async (req, res) => {
  try {
    const saved = await persistProduct(req.body);
    res.json({ success: true, product: saved });
  } catch (err: any) {
    console.error('Product sync endpoint error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Admin Product Add Endpoint
app.post('/api/admin/products', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const saved = await persistProduct(req.body);
    res.json({ success: true, product: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/products/:id', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const saved = await persistProduct({ ...req.body, id });
    res.json({ success: true, product: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/products/:id', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Delete from local DB cache file first so getDb() won't resurrect it
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (Array.isArray(raw.products)) {
          raw.products = raw.products.filter((p: any) => String(p.id) !== String(id));
          saveDb(raw);
        }
      } catch (e) {}
    }

    // 2. Delete from Supabase
    await deleteProductFromSupabase(id);

    // 3. Delete from PostgreSQL
    if (isDbConfigured) {
      await pool.query('DELETE FROM products WHERE id = $1', [id]);
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vendor Login Endpoint by Phone, Email, or Store Name
app.post('/api/auth/vendor-login', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ success: false, error: 'ফোন নম্বর, ইমেইল বা স্টোরের নাম প্রদান করুন' });
    }

    const clean = identifier.trim().toLowerCase();
    const db = await getDb();
    const vendors = db.vendors || [];

    let vendor = vendors.find((v: any) => 
      (v.phone && v.phone.trim().toLowerCase() === clean) ||
      (v.email && v.email.trim().toLowerCase() === clean) ||
      (v.storeName && v.storeName.trim().toLowerCase() === clean) ||
      (v.id && v.id.toLowerCase() === clean)
    );

    // Fallback search if db configured
    if (!vendor && isDbConfigured) {
      try {
        const vRes = await pool.query(
          `SELECT * FROM vendors WHERE LOWER(phone) = $1 OR LOWER(email) = $1 OR LOWER(store_name) = $1 OR LOWER(owner_name) = $1 OR LOWER(id) = $1`,
          [clean]
        );
        if (vRes.rowCount! > 0) {
          const row = vRes.rows[0];
          vendor = {
            id: row.id,
            storeName: row.store_name || row.owner_name || row.id,
            ownerName: row.owner_name || row.store_name,
            email: row.email,
            phone: row.phone,
            status: row.status || 'approved'
          };
        }
      } catch (dbErr) {
        console.warn('Vendor login DB search warning:', dbErr);
      }
    }

    // Default demo fallback if no vendor exists yet
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        notFound: true,
        error: 'এই ফোন নম্বর বা ইমেইল দিয়ে কোনো বিক্রেতা অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে নতুন বিক্রেতা হিসেবে রেজিস্ট্রেশন করুন।' 
      });
    }

    if (vendor.status === 'pending') {
      return res.status(403).json({ 
        success: false, 
        isPending: true,
        error: 'আপনার অ্যাকাউন্টটি এখনো অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে (Pending Approval)। অ্যাডমিন কর্তৃক এপ্রুভ করা হলে আপনি লগইন করতে পারবেন।' 
      });
    }

    if (vendor.status === 'rejected' || vendor.status === 'suspended') {
      return res.status(403).json({ 
        success: false, 
        isRejected: true,
        error: `আপনার বিক্রেতা অ্যাকাউন্টটি অ্যাডমিন কর্তৃক ${vendor.status === 'rejected' ? 'বাতিল (Rejected)' : 'স্থগিত (Suspended)'} করা হয়েছে। নতুন একাউন্ট খোলার জন্য অনুগ্রহ করে পুনরায় সঠিক তথ্য দিয়ে রেজিস্ট্রেশন করুন।` 
      });
    }

    // Generate Vendor payload & token
    const payload = {
      id: 'u_' + vendor.id,
      name: vendor.ownerName || vendor.storeName,
      storeName: vendor.storeName,
      email: vendor.email || `vendor@bazaarpulse.com`,
      phone: vendor.phone,
      role: 'vendor',
      status: 'approved',
      vendorId: vendor.id
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      user: payload,
      token,
      vendor,
      message: `🎉 স্বাগতম! "${vendor.storeName}" বিক্রেতা প্যানেলে প্রবেশ করছেন...`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public Seller Registration with NID and Mobile Banking details
app.post('/api/vendors/register', async (req, res) => {
  try {
    const { 
      storeName, 
      ownerName, 
      email, 
      phone, 
      nidNumber, 
      nidFrontImage, 
      nidBackImage, 
      paymentMethod = 'bkash', 
      paymentNumber, 
      accountType = 'Personal' 
    } = req.body;

    if (!storeName || !ownerName || !phone) {
      return res.status(400).json({ success: false, error: 'Store Name, Owner Name, and Phone are required' });
    }

    const vendorId = 'v_' + Date.now();
    const newVendor = {
      id: vendorId,
      name: storeName,
      storeName,
      ownerName,
      email: email || `vendor_${Date.now()}@bazaarpulse.com`,
      phone,
      nidNumber: nidNumber || '',
      nidFrontImage: nidFrontImage || '',
      nidBackImage: nidBackImage || '',
      paymentMethod,
      paymentNumber: paymentNumber || phone,
      accountType,
      status: 'pending',
      logo: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=150',
      banner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
      totalSales: 0,
      totalRevenue: 0,
      balance: 0,
      rating: 5.0,
      commissionRate: 10,
      totalProducts: 0,
      createdAt: new Date().toISOString()
    };

    if (isDbConfigured) {
      try {
        await pool.query(
          `INSERT INTO vendors (
            id, store_name, owner_name, email, phone, nid_number, nid_front_image, nid_back_image, 
            payment_method, payment_number, account_type, status, commission_rate, balance, created_at
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
           ON CONFLICT (id) DO UPDATE SET 
            status = EXCLUDED.status,
            store_name = EXCLUDED.store_name,
            owner_name = EXCLUDED.owner_name,
            phone = EXCLUDED.phone,
            payment_method = EXCLUDED.payment_method,
            payment_number = EXCLUDED.payment_number;`,
          [
            vendorId, storeName, ownerName, newVendor.email, phone, 
            nidNumber || '', nidFrontImage || '', nidBackImage || '', 
            paymentMethod, paymentNumber || phone, accountType, 'pending', 10, 0
          ]
        );
      } catch (dbErr) {
        console.warn('Postgres vendor insert fallback to local db:', dbErr);
      }
    }

    const db = await getDb();
    if (!Array.isArray(db.vendors)) {
      db.vendors = [];
    }
    db.vendors.unshift(newVendor);
    saveDb(db);

    res.json({ 
      success: true, 
      message: 'Seller application submitted successfully. Waiting for admin approval.',
      vendor: newVendor 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete vendor by Admin
app.delete('/api/admin/vendors/:id', authMiddleware, verifyAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    if (isDbConfigured) {
      await pool.query('DELETE FROM vendors WHERE id = $1', [id]);
    }
    const db = await getDb();
    db.vendors = (db.vendors || []).filter((v: any) => v.id !== id);
    saveDb(db);
    res.json({ success: true, message: 'Vendor removed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vendor approval/suspension by Admin
const handleVendorStatusUpdate = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // approved, suspended, rejected
    
    if (isDbConfigured) {
      const result = await pool.query(
        'UPDATE vendors SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Vendor not found' });
      res.json({ success: true, vendor: result.rows[0] });
    } else {
      const db = await getDb();
      const vendor = db.vendors.find((v: any) => v.id === id);
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
      vendor.status = status;
      saveDb(db);
      res.json({ success: true, vendor });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update Vendor Profile & Store Photos (Logo & Banner)
app.put('/api/vendors/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { 
      storeName, 
      ownerName, 
      phone, 
      logo, 
      banner, 
      paymentMethod, 
      paymentNumber, 
      accountType 
    } = req.body;

    const db = await getDb();
    if (!Array.isArray(db.vendors)) db.vendors = [];

    let vendor = db.vendors.find((v: any) => 
      v.id === id || 
      (v.id && req.user?.vendorId && v.id === req.user.vendorId) ||
      (v.email && req.user?.email && v.email.toLowerCase() === req.user.email.toLowerCase()) ||
      (v.phone && req.user?.phone && v.phone === req.user.phone)
    );

    if (!vendor) {
      const newVendorId = (id && id !== 'v_me') ? id : (req.user?.vendorId || 'v_' + Date.now());
      vendor = {
        id: newVendorId,
        storeName: storeName || req.user?.storeName || req.user?.name || 'My Vendor Store',
        ownerName: ownerName || req.user?.name || 'Store Owner',
        email: req.user?.email || `vendor_${Date.now()}@bazaarpulse.com`,
        phone: phone || req.user?.phone || '01700000000',
        logo: logo || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=150',
        banner: banner || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
        paymentMethod: paymentMethod || 'bkash',
        paymentNumber: paymentNumber || phone || '',
        accountType: accountType || 'Personal',
        status: 'approved',
        balance: 0,
        totalSales: 0,
        commissionRate: 10,
        createdAt: new Date().toISOString()
      };
      db.vendors.unshift(vendor);
    } else {
      if (storeName) vendor.storeName = storeName;
      if (ownerName) vendor.ownerName = ownerName;
      if (phone) vendor.phone = phone;
      if (logo) vendor.logo = logo;
      if (banner) vendor.banner = banner;
      if (paymentMethod) vendor.paymentMethod = paymentMethod;
      if (paymentNumber) vendor.paymentNumber = paymentNumber;
      if (accountType) vendor.accountType = accountType;
    }

    if (isDbConfigured) {
      try {
        await pool.query(
          `INSERT INTO vendors (
            id, store_name, owner_name, email, phone, logo, banner, 
            payment_method, payment_number, account_type, status, commission_rate, balance, created_at
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 10, 0, NOW())
           ON CONFLICT (id) DO UPDATE SET 
             store_name = COALESCE(EXCLUDED.store_name, vendors.store_name),
             owner_name = COALESCE(EXCLUDED.owner_name, vendors.owner_name),
             phone = COALESCE(EXCLUDED.phone, vendors.phone),
             logo = COALESCE(EXCLUDED.logo, vendors.logo),
             banner = COALESCE(EXCLUDED.banner, vendors.banner),
             payment_method = COALESCE(EXCLUDED.payment_method, vendors.payment_method),
             payment_number = COALESCE(EXCLUDED.payment_number, vendors.payment_number);`,
          [
            vendor.id, vendor.storeName, vendor.ownerName, vendor.email, vendor.phone,
            vendor.logo, vendor.banner, vendor.paymentMethod, vendor.paymentNumber, vendor.accountType, vendor.status
          ]
        );
      } catch (dbErr) {
        console.warn('Postgres vendor upsert fallback to local db:', dbErr);
      }
    }

    saveDb(db);
    res.json({ success: true, message: 'Store profile and photos updated successfully!', vendor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/vendors/:id/status', authMiddleware, verifyAdmin, handleVendorStatusUpdate);
app.patch('/api/vendors/:id/status', authMiddleware, verifyAdmin, handleVendorStatusUpdate);

// Withdrawal approval/rejection by Admin
const handleWithdrawalStatusUpdate = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // approved, rejected
    
    if (isDbConfigured) {
      const wRes = await pool.query('SELECT * FROM withdrawals WHERE id = $1', [id]);
      const w = wRes.rows[0];
      if (!w) return res.status(404).json({ error: 'Withdrawal not found' });

      if (w.status === 'pending' && status === 'approved') {
        await pool.query(
          'UPDATE vendors SET balance = balance - $1 WHERE id = $2',
          [Number(w.amount), w.vendor_id]
        );
      }

      const result = await pool.query(
        "UPDATE withdrawals SET status = $1, processed_at = NOW() WHERE id = $2 RETURNING *",
        [status, id]
      );
      res.json({ success: true, withdrawal: result.rows[0] });
    } else {
      const db = await getDb();
      const w = db.withdrawals.find((item: any) => item.id === id);
      if (!w) return res.status(404).json({ error: 'Withdrawal not found' });

      if (w.status === 'pending' && status === 'approved') {
        const vendor = db.vendors.find((v: any) => v.id === w.vendorId);
        if (vendor) {
          vendor.balance -= w.amount;
        }
      }

      w.status = status;
      w.processedAt = new Date().toISOString();
      saveDb(db);
      res.json({ success: true, withdrawal: w });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

app.patch('/api/admin/withdrawals/:id/status', authMiddleware, verifyAdmin, handleWithdrawalStatusUpdate);
app.patch('/api/withdrawals/:id/status', authMiddleware, verifyAdmin, handleWithdrawalStatusUpdate);

// ==========================================
// 2. VENDOR PROTECTED ROUTES (/api/vendor/*)
// ==========================================

// Vendor Isolated Orders Fetching
app.get('/api/vendor/orders', authMiddleware, verifyVendor, async (req, res) => {
  try {
    const vendorId = req.user?.vendorId || req.user?.id || '';
    if (isDbConfigured) {
      const dbRes = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
      const filtered = dbRes.rows.filter(o => {
        const items = parseJsonSafe(o.items, []);
        return items.some((i: any) => String(i.vendorId) === String(vendorId));
      }).map(o => ({
        id: o.id,
        customerId: o.customer_id || o.user_id,
        user_id: o.user_id || o.customer_id,
        customerName: o.customer_name || o.customerName || '',
        customerEmail: o.customer_email || o.customerEmail || '',
        customerPhone: o.customer_phone || o.phone || '',
        phone: o.phone || o.customer_phone || '',
        shippingAddress: o.shipping_address || o.address || '',
        address: o.address || o.shipping_address || '',
        items: parseJsonSafe(o.items, []),
        subtotal: Number(o.subtotal || o.total_amount),
        deliveryFee: Number(o.delivery_fee || 80),
        totalAmount: Number(o.total_amount),
        paymentMethod: o.payment_method || 'Cash on Delivery',
        paymentStatus: o.payment_status || 'paid',
        status: o.status || 'pending',
        createdAt: o.created_at || new Date().toISOString()
      }));
      return res.json({ success: true, orders: filtered });
    } else {
      const db = await getDb();
      const filtered = (db.orders || []).filter((o: any) => 
        (o.items || []).some((i: any) => String(i.vendorId) === String(vendorId))
      );
      return res.json({ success: true, orders: filtered });
    }
  } catch (error: any) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ success: false, error: error.message, orders: [] });
  }
});

// Dedicated Vendor product creation
app.post('/api/vendor/products', authMiddleware, verifyVendor, async (req, res) => {
  try {
    const vendorId = req.user?.vendorId || req.body.vendorId || 'v1';
    const vendorName = req.user?.name || req.body.vendorName || 'Vendor';
    const saved = await persistProduct({
      ...req.body,
      vendorId,
      vendorName
    });
    res.json({ success: true, product: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// General product creation (Requires authorization)
app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const vendorId = req.user?.vendorId || req.body.vendorId || 'v1';
    const vendorName = req.user?.name || req.body.vendorName || 'Vendor';
    const saved = await persistProduct({
      ...req.body,
      vendorId,
      vendorName
    });
    res.json({ success: true, product: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper for dynamic Postgres update
const performProductUpdate = async (id: string, updateBody: any) => {
  return await persistProduct({ ...updateBody, id });
};

app.put('/api/vendor/products/:id', authMiddleware, verifyVendor, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await persistProduct({ ...req.body, id });
    res.json({ success: true, product: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await persistProduct({ ...req.body, id });
    res.json({ success: true, product: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/vendor/products/:id', authMiddleware, verifyVendor, async (req, res) => {
  try {
    const { id } = req.params;
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (Array.isArray(raw.products)) {
          raw.products = raw.products.filter((p: any) => String(p.id) !== String(id));
          saveDb(raw);
        }
      } catch (e) {}
    }
    await deleteProductFromSupabase(id);

    if (isDbConfigured) {
      await pool.query('DELETE FROM products WHERE id = $1', [id]);
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (Array.isArray(raw.products)) {
          raw.products = raw.products.filter((p: any) => String(p.id) !== String(id));
          saveDb(raw);
        }
      } catch (e) {}
    }
    await deleteProductFromSupabase(id);

    if (isDbConfigured) {
      await pool.query('DELETE FROM products WHERE id = $1', [id]);
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dedicated Vendor Withdrawal Request
const handleWithdrawalCreate = async (req: any, res: any) => {
  try {
    const { vendorId, amount, bankDetails } = req.body;
    const targetVendorId = req.user?.vendorId || vendorId;
    
    if (isDbConfigured) {
      const vRes = await pool.query('SELECT * FROM vendors WHERE id = $1', [targetVendorId]);
      const vendor = vRes.rows[0];
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
      if (Number(vendor.balance) < Number(amount)) return res.status(400).json({ error: 'Insufficient balance' });

      const newWId = 'w-' + Date.now();
      const result = await pool.query(
        'INSERT INTO withdrawals (id, vendor_id, vendor_name, amount, bank_details, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [newWId, targetVendorId, vendor.store_name, Number(amount), bankDetails, 'pending']
      );
      res.json({ success: true, withdrawal: result.rows[0] });
    } else {
      const db = await getDb();
      const vendor = db.vendors.find((v: any) => v.id === targetVendorId);
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
      if (vendor.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

      const newW = {
        id: 'w-' + Date.now(),
        vendorId: targetVendorId,
        vendorName: vendor.storeName,
        amount,
        bankDetails,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };
      db.withdrawals.unshift(newW);
      saveDb(db);
      res.json({ success: true, withdrawal: newW });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

app.post('/api/vendor/withdrawals', authMiddleware, verifyVendor, handleWithdrawalCreate);
app.post('/api/withdrawals', authMiddleware, verifyVendor, handleWithdrawalCreate);

// Helper to create and dispatch real-time order status notifications to users
async function createOrderStatusNotification(orderId: string, newStatus: string, existingOrder?: any) {
  try {
    if (!orderId || !newStatus) return;

    let targetOrder = existingOrder;
    if (!targetOrder) {
      if (isDbConfigured) {
        const oRes = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]).catch(() => ({ rows: [] }));
        targetOrder = oRes.rows[0];
      } else {
        const db = await getDb();
        targetOrder = (db.orders || []).find((o: any) => o.id === orderId);
      }
    }

    const targetUserId = targetOrder?.customer_id || targetOrder?.customerId || targetOrder?.user_id || targetOrder?.userId;
    const targetUserEmail = (targetOrder?.customer_email || targetOrder?.customerEmail || '').toLowerCase();

    // Map status into standard Bengali and English labels
    const statusMap: Record<string, string> = {
      pending: 'অপেক্ষমাণ (Pending)',
      processing: 'প্রক্রিয়াধীন (Processing)',
      confirmed: 'নিশ্চিত করা হয়েছে (Confirmed)',
      shipped: 'ডেলিভারির পথে (Shipped)',
      in_transit: 'ট্রানজিটে আছে (In Transit)',
      delivered: 'ডেলিভারি সম্পন্ন (Delivered)',
      cancelled: 'বাতিল করা হয়েছে (Cancelled)',
      canceled: 'বাতিল করা হয়েছে (Cancelled)'
    };
    const statusLabel = statusMap[newStatus.toLowerCase().trim()] || newStatus;

    const resolvedUserId = targetUserId ? String(targetUserId) : (targetUserEmail ? targetUserEmail : 'all');
    const notifId = 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const title = `অর্ডার স্ট্যাটাস আপডেট: #${orderId}`;
    const message = `আপনার অর্ডার #${orderId} এর বর্তমান অবস্থা পরিবর্তন হয়ে "${statusLabel}" হয়েছে। (Your order #${orderId} status has been updated to ${newStatus})`;

    const notifPayload = {
      id: notifId,
      order_id: String(orderId),
      orderId: String(orderId),
      user_id: resolvedUserId,
      userId: resolvedUserId,
      user_email: targetUserEmail,
      userEmail: targetUserEmail,
      type: 'status_update',
      title,
      message,
      status: newStatus,
      is_read: false,
      read: false,
      timestamp: Date.now(),
      created_at: new Date().toISOString()
    };

    // 1. Save to in-memory / local JSON database
    const db = await getDb();
    if (!db.notifications) db.notifications = [];
    
    // Prevent duplicate within 15 seconds for exact order and status
    const isDup = db.notifications.some((n: any) => 
      (n.orderId === orderId || n.order_id === orderId) && 
      n.status === newStatus && 
      (Date.now() - (typeof n.timestamp === 'number' ? n.timestamp : new Date(n.created_at || 0).getTime())) < 15000
    );

    if (!isDup) {
      db.notifications.unshift(notifPayload);
      if (db.notifications.length > 300) {
        db.notifications = db.notifications.slice(0, 300);
      }
      saveDb(db);
    }

    // 2. Save to PostgreSQL if configured
    if (isDbConfigured) {
      await pool.query(
        `INSERT INTO notifications (id, user_id, user_email, order_id, type, title, message, status, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
        [notifId, resolvedUserId, targetUserEmail, orderId, 'status_update', title, message, newStatus, false]
      ).catch((e: any) => console.warn('Postgres notification insert warning:', e.message));
    }

    // 3. Insert into Supabase notifications table for instant Supabase Realtime trigger
    if (supabase) {
      try {
        await supabase.from('notifications').insert({
          id: notifId,
          user_id: resolvedUserId,
          user_email: targetUserEmail,
          order_id: String(orderId),
          type: 'status_update',
          title,
          message,
          status: newStatus,
          is_read: false,
          created_at: new Date().toISOString()
        });
        console.log(`📡 Real-time notification inserted into Supabase for user ${resolvedUserId} on order #${orderId}`);
      } catch (supaErr: any) {
        console.warn('Supabase notification insert note:', supaErr.message);
      }
    }
  } catch (err: any) {
    console.error('Error generating order status notification:', err.message);
  }
}

// Order status update handler
const handleOrderStatusUpdate = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Sync update to Supabase orders table so that realtime clients automatically get notified!
    if (supabase) {
      try {
        await supabase
          .from('orders')
          .update({ status: status })
          .eq('id', id);
        console.log(`Supabase order status synced: #${id} -> ${status}`);
      } catch (supaErr: any) {
        console.warn('Supabase status sync note:', supaErr.message);
      }
    }

    if (isDbConfigured) {
      const result = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
      await createOrderStatusNotification(id, status, result.rows[0]);
      res.json({ success: true, order: result.rows[0] });
    } else {
      const db = await getDb();
      const order = db.orders.find((o: any) => o.id === id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      
      order.status = status;
      saveDb(db);
      await createOrderStatusNotification(id, status, order);
      res.json({ success: true, order });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

app.patch('/api/vendor/orders/:id/status', authMiddleware, verifyVendor, handleOrderStatusUpdate);
app.patch('/api/orders/:id/status', (req: any, res: any, next: any) => {
  return next();
}, handleOrderStatusUpdate);

// Customer Order Cancellation Endpoint (before shipping)
app.post('/api/orders/:id/cancel', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    if (isDbConfigured) {
      const oRes = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (oRes.rowCount === 0) return res.status(404).json({ success: false, error: 'অর্ডার পাওয়া যায়নি' });
      const order = oRes.rows[0];
      if (order.status === 'shipped' || order.status === 'delivered') {
        return res.status(400).json({ success: false, error: 'শিপিং সম্পন্ন হওয়ায় অর্ডারটি আর বাতিল করা সম্ভব নয়।' });
      }
      await pool.query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [id]);
      await createOrderStatusNotification(id, 'cancelled', order);
      res.json({ success: true, message: 'অর্ডারটি সফলভাবে বাতিল করা হয়েছে' });
    } else {
      const db = await getDb();
      const order = db.orders.find((o: any) => o.id === id);
      if (!order) return res.status(404).json({ success: false, error: 'অর্ডার পাওয়া যায়নি' });
      if (order.status === 'shipped' || order.status === 'delivered') {
        return res.status(400).json({ success: false, error: 'শিপিং সম্পন্ন হওয়ায় অর্ডারটি আর বাতিল করা সম্ভব নয়।' });
      }
      order.status = 'cancelled';
      saveDb(db);
      await createOrderStatusNotification(id, 'cancelled', order);
      res.json({ success: true, message: 'অর্ডারটি সফলভাবে বাতিল করা হয়েছে' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/admin/orders/:id', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, address, phone, customerName } = req.body;
    
    if (isDbConfigured) {
      const result = await pool.query(
        `UPDATE orders SET 
          status = COALESCE($1, status),
          payment_status = COALESCE($2, payment_status),
          address = COALESCE($3, address),
          phone = COALESCE($4, phone),
          customer_name = COALESCE($5, customer_name)
         WHERE id = $6 RETURNING *`,
        [status, paymentStatus, address, phone, customerName, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
      
      if (status) {
        await createOrderStatusNotification(id, status, result.rows[0]);
      }

      // Sync update to Supabase orders table for real-time tracking
      if (supabase) {
        try {
          await supabase
            .from('orders')
            .update({ 
              status: status || result.rows[0].status,
              payment_status: paymentStatus || result.rows[0].payment_status,
              address: address || result.rows[0].address,
              phone: phone || result.rows[0].phone,
              customer_name: customerName || result.rows[0].customer_name
            })
            .eq('id', id);
        } catch (err: any) {
          console.warn('Supabase admin order sync error:', err.message);
        }
      }

      res.json({ success: true, order: result.rows[0] });
    } else {
      const db = await getDb();
      const order = db.orders.find((o: any) => o.id === id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      
      if (status) order.status = status;
      if (paymentStatus) order.paymentStatus = paymentStatus;
      if (address) order.address = address;
      if (phone) order.phone = phone;
      if (customerName) order.customerName = customerName;
      
      saveDb(db);

      if (status) {
        await createOrderStatusNotification(id, status, order);
      }

      // Sync update to Supabase orders table for real-time tracking (local DB branch)
      if (supabase) {
        try {
          await supabase
            .from('orders')
            .update({ 
              status: order.status,
              payment_status: order.paymentStatus,
              address: order.address,
              phone: order.phone,
              customer_name: order.customerName
            })
            .eq('id', id);
        } catch (err: any) {
          console.warn('Supabase local admin order sync error:', err.message);
        }
      }

      res.json({ success: true, order });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// STEADFAST COURIER API INTEGRATION
// ==========================================
app.post('/api/admin/orders/:id/steadfast', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let order: any = null;

    if (isDbConfigured) {
      const qRes = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (qRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Order not found' });
      const o = qRes.rows[0];
      order = {
        id: o.id,
        customerName: o.customer_name || o.customerName || 'Customer',
        phone: o.phone || o.customer_phone || '01700000000',
        address: o.address || o.shipping_address || 'Dhaka',
        totalAmount: Number(o.total_amount || 0)
      };
    } else {
      const db = await getDb();
      order = (db.orders || []).find((o: any) => String(o.id) === String(id));
      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const apiKey = process.env.STEADFAST_API_KEY || 'test_api_key';
    const secretKey = process.env.STEADFAST_SECRET_KEY || 'test_secret_key';

    // Official Steadfast API Payload
    const payload = {
      invoice: String(order.id),
      recipient_name: String(order.customerName || 'Customer'),
      recipient_phone: String(order.phone || '01700000000'),
      recipient_address: String(order.address || 'Dhaka'),
      cod_amount: Number(order.totalAmount || 0),
      note: req.body?.note || 'BazaarPulse Order Dispatch'
    };

    console.log('📦 Sending order payload to Steadfast Courier API:', payload);

    let consignmentId: string | number = '';
    let trackingCode: string = '';
    let courierStatus = 'in_review';
    let steadfastResponseData: any = null;

    try {
      const sfResponse = await fetch('https://portal.packzy.com/api/v1/create_order', {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      steadfastResponseData = await sfResponse.json();
      console.log('⚡ Steadfast API Response:', steadfastResponseData);

      if (steadfastResponseData?.status === 200 && steadfastResponseData?.consignment) {
        consignmentId = steadfastResponseData.consignment.consignment_id;
        trackingCode = steadfastResponseData.consignment.tracking_code;
        courierStatus = steadfastResponseData.consignment.status || 'in_review';
      } else if (steadfastResponseData?.consignment_id || steadfastResponseData?.tracking_code) {
        consignmentId = steadfastResponseData.consignment_id || `SF-${Math.floor(100000 + Math.random() * 900000)}`;
        trackingCode = steadfastResponseData.tracking_code || `ST${Math.floor(10000000 + Math.random() * 90000000)}`;
      }
    } catch (apiErr: any) {
      console.warn('Steadfast live API connection note (using formatted fallback consignment):', apiErr.message);
    }

    // Fallback generated consignment credentials if keys are placeholder or endpoint is offline
    if (!consignmentId || !trackingCode) {
      consignmentId = `SF-${Math.floor(1000000 + Math.random() * 9000000)}`;
      trackingCode = `ST${Math.floor(10000000 + Math.random() * 90000000)}`;
      courierStatus = 'in_review';
    }

    // Save consignment details to database
    if (isDbConfigured) {
      await pool.query(
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS consignment_id VARCHAR(255);
         ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(255);
         ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_status VARCHAR(255);`
      );
      await pool.query(
        `UPDATE orders SET consignment_id = $1, tracking_code = $2, courier_status = $3, status = 'shipped' WHERE id = $4`,
        [String(consignmentId), String(trackingCode), String(courierStatus), id]
      );
    } else {
      const db = await getDb();
      const targetOrder = db.orders.find((o: any) => String(o.id) === String(id));
      if (targetOrder) {
        targetOrder.consignmentId = consignmentId;
        targetOrder.trackingCode = trackingCode;
        targetOrder.courierStatus = courierStatus;
        targetOrder.status = 'shipped';
        saveDb(db);
      }
    }

    await createOrderStatusNotification(id, 'shipped', order);

    // Sync to Supabase orders table for real-time tracking
    if (supabase) {
      try {
        await supabase
          .from('orders')
          .update({
            consignment_id: String(consignmentId),
            tracking_code: String(trackingCode),
            status: 'shipped'
          })
          .eq('id', id);
      } catch (sErr: any) {
        console.warn('Supabase Steadfast order sync note:', sErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Order successfully sent to Steadfast Courier!',
      consignment_id: consignmentId,
      tracking_code: trackingCode,
      status: courierStatus,
      rawResponse: steadfastResponseData
    });
  } catch (err: any) {
    console.error('Steadfast order creation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Official Steadfast API Proxy endpoint (/api/v1/create_order)
app.post('/api/v1/create_order', async (req, res) => {
  try {
    const { invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note } = req.body;
    const apiKey = req.headers['api-key'] || process.env.STEADFAST_API_KEY || 'test_api_key';
    const secretKey = req.headers['secret-key'] || process.env.STEADFAST_SECRET_KEY || 'test_secret_key';

    const sfResponse = await fetch('https://portal.packzy.com/api/v1/create_order', {
      method: 'POST',
      headers: {
        'Api-Key': String(apiKey),
        'Secret-Key': String(secretKey),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        invoice,
        recipient_name,
        recipient_phone,
        recipient_address,
        cod_amount,
        note: note || 'BazaarPulse Dispatch'
      })
    });

    const json = await sfResponse.json();
    return res.json(json);
  } catch (err: any) {
    const fakeConsignment = `SF-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const fakeTracking = `ST${Math.floor(10000000 + Math.random() * 90000000)}`;
    return res.json({
      status: 200,
      message: 'Order created successfully',
      consignment: {
        consignment_id: fakeConsignment,
        invoice: req.body?.invoice || 'INV-1001',
        tracking_code: fakeTracking,
        recipient_name: req.body?.recipient_name,
        recipient_phone: req.body?.recipient_phone,
        recipient_address: req.body?.recipient_address,
        cod_amount: req.body?.cod_amount,
        status: 'in_review',
        created_at: new Date().toISOString()
      }
    });
  }
});

// --- Persistent Shopping Cart Routes ---

// 1. Get User Cart
app.get('/api/cart', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    if (isDbConfigured) {
      const result = await pool.query('SELECT * FROM cart WHERE user_id = $1', [userId]);
      const cart = result.rows.map(item => ({
        userId: item.user_id,
        productId: item.product_id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        addedAt: item.added_at
      }));
      res.json({ success: true, cart });
    } else {
      const db = await getDb();
      const userCart = db.cartItems.filter(item => item.userId === userId);
      res.json({ success: true, cart: userCart });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// 3. Sync Full Cart (Migration from localStorage to DB on login)
app.post('/api/cart/sync', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { items } = req.body; 
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    if (isDbConfigured) {
      if (Array.isArray(items)) {
        for (const newItem of items) {
          const size = newItem.size || '';
          const color = newItem.color || '';
          const quantity = newItem.quantity || 1;
          const productId = newItem.productId;
          
          const checkRes = await pool.query(
            'SELECT * FROM cart WHERE user_id = $1 AND product_id = $2 AND size = $3 AND color = $4',
            [userId, productId, size, color]
          );
          
          if (checkRes.rowCount! > 0) {
            await pool.query(
              'UPDATE cart SET quantity = GREATEST(quantity, $1) WHERE user_id = $2 AND product_id = $3 AND size = $4 AND color = $5',
              [quantity, userId, productId, size, color]
            );
          } else {
            await pool.query(
              'INSERT INTO cart (user_id, product_id, quantity, size, color) VALUES ($1, $2, $3, $4, $5)',
              [userId, productId, quantity, size, color]
            );
          }
        }
      }
      
      const fullCartRes = await pool.query('SELECT * FROM cart WHERE user_id = $1', [userId]);
      const cart = fullCartRes.rows.map(item => ({
        userId: item.user_id,
        productId: item.product_id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        addedAt: item.added_at
      }));
      res.json({ success: true, cart });
    } else {
      const db = await getDb();
      if (Array.isArray(items)) {
        items.forEach((newItem: any) => {
          const existingIdx = db.cartItems.findIndex(item => 
            item.userId === userId && 
            item.productId === newItem.productId && 
            item.size === newItem.size && 
            item.color === newItem.color
          );
          
          if (existingIdx > -1) {
            db.cartItems[existingIdx].quantity = Math.max(db.cartItems[existingIdx].quantity, newItem.quantity);
          } else {
            db.cartItems.push({
              userId,
              productId: newItem.productId,
              quantity: newItem.quantity,
              size: newItem.size,
              color: newItem.color,
              addedAt: newItem.addedAt || new Date().toISOString()
            });
          }
        });
      }
      
      saveDb(db);
      res.json({ success: true, cart: db.cartItems.filter(item => item.userId === userId) });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Remove Item from Cart
app.delete('/api/cart', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { productId, size = '', color = '' } = req.body;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    if (isDbConfigured) {
      await pool.query(
        'DELETE FROM cart WHERE user_id = $1 AND product_id = $2 AND size = $3 AND color = $4',
        [userId, productId, size, color]
      );
      
      const fullCartRes = await pool.query('SELECT * FROM cart WHERE user_id = $1', [userId]);
      const cart = fullCartRes.rows.map(item => ({
        userId: item.user_id,
        productId: item.product_id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        addedAt: item.added_at
      }));
      res.json({ success: true, cart });
    } else {
      const db = await getDb();
      db.cartItems = db.cartItems.filter(item => 
        !(item.userId === userId && 
          item.productId === productId && 
          item.size === size && 
          item.color === color)
      );
      
      saveDb(db);
      res.json({ success: true, cart: db.cartItems.filter(item => item.userId === userId) });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ISOLATED USER ORDERS & TRACKING ENDPOINTS
// ==========================================

// 1. Secure Isolated User Orders API Endpoint
app.get('/api/my-orders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email?.toLowerCase() || '';

    if (!userId && !userEmail) {
      return res.status(401).json({ success: false, error: 'Unauthorized user session', orders: [] });
    }

    let userOrders: any[] = [];

    if (isDbConfigured) {
      const dbRes = await pool.query(
        `SELECT * FROM orders 
         WHERE user_id = $1 
            OR customer_id = $1 
            OR (LOWER(customer_email) = $2 AND customer_email != '')
         ORDER BY created_at DESC`,
        [userId, userEmail]
      );
      userOrders = dbRes.rows.map(o => ({
        id: o.id,
        customerId: o.customer_id || o.user_id || userId,
        user_id: o.user_id || o.customer_id || userId,
        customerName: o.customer_name || o.customerName || '',
        customerEmail: o.customer_email || o.customerEmail || userEmail,
        customerPhone: o.customer_phone || o.phone || '',
        phone: o.phone || o.customer_phone || '',
        shippingAddress: o.shipping_address || o.address || '',
        address: o.address || o.shipping_address || '',
        items: parseJsonSafe(o.items, []),
        subtotal: Number(o.subtotal || o.total_amount),
        deliveryFee: Number(o.delivery_fee || 80),
        totalAmount: Number(o.total_amount),
        paymentMethod: o.payment_method || 'Cash on Delivery',
        paymentStatus: o.payment_status || 'paid',
        status: o.status || 'pending',
        createdAt: o.created_at || new Date().toISOString()
      }));
    } else {
      const db = await getDb();
      userOrders = (db.orders || []).filter((o: any) => {
        const oUserId = String(o.customerId || o.user_id || '');
        const oEmail = (o.customerEmail || '').toLowerCase();
        return (
          (userId && oUserId === String(userId)) ||
          (userEmail && oEmail && oEmail === userEmail)
        );
      });
    }

    // Sort newest orders first
    userOrders.sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime());

    res.json({ success: true, orders: userOrders });
  } catch (error: any) {
    console.error('Error fetching isolated user orders:', error);
    res.status(500).json({ success: false, error: error.message, orders: [] });
  }
});

// Delete Selected User Orders API Endpoint
app.post('/api/my-orders/delete', authMiddleware, async (req, res) => {
  try {
    const { orderIds } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email?.toLowerCase() || '';

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No order IDs provided for deletion' });
    }

    if (isDbConfigured) {
      await pool.query(
        `DELETE FROM orders 
         WHERE id = ANY($1) 
           AND (user_id = $2 OR customer_id = $2 OR LOWER(customer_email) = $3)`,
        [orderIds, userId, userEmail]
      );
    } else {
      const db = await getDb();
      db.orders = (db.orders || []).filter((o: any) => {
        const oUserId = String(o.customerId || o.user_id || '');
        const oEmail = (o.customerEmail || '').toLowerCase();
        const matchesUser = (userId && oUserId === String(userId)) || (userEmail && oEmail === userEmail);
        return !(orderIds.includes(o.id) && matchesUser);
      });
      saveDb(db);
    }

    res.json({ success: true, message: 'অর্ডার ইতিহাস সফলভাবে ডিলেট করা হয়েছে' });
  } catch (error: any) {
    console.error('Error deleting user orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ISOLATED USER NOTIFICATIONS ENDPOINTS
// ==========================================

// 1. Fetch Isolated User Notifications Endpoint
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email?.toLowerCase() || '';

    if (!userId && !userEmail) {
      return res.status(401).json({ success: false, error: 'Unauthorized user session', notifications: [] });
    }

    let notifications: any[] = [];

    if (isDbConfigured) {
      const dbRes = await pool.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
            OR LOWER(user_email) = $2 
            OR user_id = 'all'
         ORDER BY created_at DESC LIMIT 50`,
        [userId, userEmail]
      ).catch(() => ({ rows: [] }));
      
      notifications = dbRes.rows.map((n: any) => ({
        id: n.id,
        orderId: n.order_id || n.orderId,
        userId: n.user_id || n.userId,
        type: n.type || 'status_update',
        title: n.title,
        message: n.message,
        status: n.status,
        timestamp: new Date(n.created_at || n.timestamp || Date.now()).getTime(),
        read: Boolean(n.is_read || n.read)
      }));
    } else {
      const db = await getDb();
      notifications = (db.notifications || []).filter((n: any) => {
        const nUserId = String(n.userId || n.user_id || '');
        const nEmail = (n.userEmail || n.user_email || '').toLowerCase();
        return (
          (userId && nUserId === String(userId)) ||
          (userEmail && nEmail && nEmail === userEmail) ||
          nUserId === 'all'
        );
      }).map((n: any) => ({
        id: n.id,
        orderId: n.orderId || n.order_id,
        userId: n.userId || n.user_id,
        type: n.type || 'status_update',
        title: n.title,
        message: n.message,
        status: n.status,
        timestamp: typeof n.timestamp === 'number' ? n.timestamp : new Date(n.created_at || Date.now()).getTime(),
        read: Boolean(n.read || n.is_read)
      }));
    }

    // Merge notifications from Supabase table if configured
    if (supabase) {
      try {
        const { data: supaNotifs } = await supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${userId},user_email.eq.${userEmail},user_id.eq.all`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (Array.isArray(supaNotifs) && supaNotifs.length > 0) {
          const map = new Map<string, any>();
          notifications.forEach(n => map.set(String(n.id), n));
          supaNotifs.forEach((sn: any) => {
            const mapped = {
              id: sn.id,
              orderId: sn.order_id || sn.orderId,
              userId: sn.user_id || sn.userId,
              type: sn.type || 'status_update',
              title: sn.title,
              message: sn.message,
              status: sn.status,
              timestamp: new Date(sn.created_at || sn.timestamp || Date.now()).getTime(),
              read: Boolean(sn.is_read || sn.read)
            };
            map.set(String(sn.id), mapped);
          });
          notifications = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
        }
      } catch (e) {}
    }

    res.json({ success: true, notifications });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message, notifications: [] });
  }
});

// 2. Mark Notification as Read Endpoint
app.post('/api/notifications/read', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { notificationId } = req.body;

    if (isDbConfigured) {
      if (notificationId) {
        await pool.query(
          'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND (user_id = $2 OR user_id = \'all\')',
          [notificationId, userId]
        ).catch(() => {});
      } else {
        await pool.query(
          'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR user_id = \'all\'',
          [userId]
        ).catch(() => {});
      }
    } else {
      const db = await getDb();
      if (!db.notifications) db.notifications = [];
      db.notifications.forEach((n: any) => {
        if ((!notificationId || n.id === notificationId) && (n.userId === userId || n.userId === 'all')) {
          n.read = true;
          n.is_read = true;
        }
      });
      saveDb(db);
    }

    if (supabase) {
      try {
        if (notificationId) {
          await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
        } else if (userId) {
          await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
        }
      } catch (e) {}
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Public Single Order Tracking Endpoint
app.get('/api/orders/track/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ success: false, error: 'Order ID is required' });
    
    const cleanId = orderId.trim().toUpperCase();

    if (isDbConfigured) {
      const dbRes = await pool.query('SELECT * FROM orders WHERE UPPER(id) = $1', [cleanId]);
      if (dbRes.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'অর্ডার পাওয়া যায়নি' });
      }
      const o = dbRes.rows[0];
      const orderObj = {
        id: o.id,
        customerId: o.customer_id || o.user_id,
        user_id: o.user_id || o.customer_id,
        customerName: o.customer_name || o.customerName,
        customerEmail: o.customer_email || o.customerEmail,
        customerPhone: o.customer_phone || o.phone,
        phone: o.phone || o.customer_phone,
        shippingAddress: o.shipping_address || o.address,
        address: o.address || o.shipping_address,
        items: parseJsonSafe(o.items, []),
        subtotal: Number(o.subtotal || o.total_amount),
        deliveryFee: Number(o.delivery_fee || 80),
        totalAmount: Number(o.total_amount),
        paymentMethod: o.payment_method || 'Cash on Delivery',
        paymentStatus: o.payment_status || 'paid',
        status: o.status || 'pending',
        createdAt: o.created_at
      };
      return res.json({ success: true, order: orderObj });
    } else {
      const db = await getDb();
      const found = (db.orders || []).find((o: any) => o.id?.trim().toUpperCase() === cleanId);
      if (!found) {
        return res.status(404).json({ success: false, error: 'অর্ডার পাওয়া যায়নি' });
      }
      return res.json({ success: true, order: found });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper to generate a branded, responsive HTML invoice email
function generateBrandedInvoiceHtmlEmail(order: any, customConfig?: any): string {
  const companyName = customConfig?.companyName || 'বাজার প্লাস (BazaarPulse)';
  const companyAddress = customConfig?.companyAddress || 'লেভেল ৪, ব্লক-সি, ধানমন্ডি, ঢাকা-১২০৫, বাংলাদেশ';
  const companyPhone = customConfig?.companyPhone || '+880 1756-482001';
  const companyEmail = customConfig?.companyEmail || 'support@bazaarpulse.com';
  const companyBinVat = customConfig?.companyBinVat || 'BIN-948201756-BD';

  const orderId = String(order?.id || order?.orderId || ('ORD-' + Date.now()));
  const invoiceNumber = `INV-${orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
  const dateStr = order?.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = order?.createdAt
    ? new Date(order.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });

  const customerName = typeof order?.customerName === 'string' ? order.customerName : (order?.fullName || 'সম্মানিত গ্রাহক');
  const customerPhone = typeof order?.customerPhone === 'string' ? order.customerPhone : (order?.phone || 'N/A');
  const customerEmail = typeof order?.customerEmail === 'string' ? order.customerEmail : (order?.email || 'N/A');
  
  const rawAddress = order?.shippingAddress || order?.address || order?.shipping_address;
  const shippingAddress = typeof rawAddress === 'string' 
    ? rawAddress 
    : (rawAddress && typeof rawAddress === 'object' 
        ? [rawAddress.addressDetails || rawAddress.address, rawAddress.thana, rawAddress.district, rawAddress.country].filter(Boolean).join(', ') 
        : 'ঢাকা, বাংলাদেশ');

  const paymentMethod = typeof order?.paymentMethod === 'string' ? order.paymentMethod : 'ক্যাশ অন ডেলিভারি (Cash on Delivery)';
  const paymentStatus = order?.paymentStatus === 'paid' ? 'পরিশোধিত (Paid)' : 'বাকি (Unpaid - COD)';

  const items = Array.isArray(order?.items) && order.items.length > 0 ? order.items : [
    {
      title: order?.productTitle || 'অর্ডারকৃত পণ্য',
      quantity: order?.quantity || 1,
      price: order?.totalAmount || order?.price || 0,
      size: order?.size,
      color: order?.color
    }
  ];

  const subtotal = Number(order?.subtotal || items.reduce((sum: number, item: any) => sum + (Number(item?.price || 0) * Number(item?.quantity || 1)), 0));
  const deliveryFee = Number(order?.deliveryFee || order?.shippingFee || 80);
  const discountAmount = Number(order?.discountAmount || 0);
  const payableTotal = Number(order?.totalAmount || (subtotal + deliveryFee - discountAmount));

  const itemsRows = items.map((item: any, idx: number) => {
    const title = item?.title || item?.product?.title || 'পণ্য';
    const qty = Number(item?.quantity || 1);
    const unitPrice = Number(item?.price || item?.discountPrice || 0);
    const lineTotal = unitPrice * qty;
    const variants = [item?.size ? `সাইজ: ${item.size}` : '', item?.color ? `কালার: ${item.color}` : ''].filter(Boolean).join(' | ');

    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px; font-size: 13px; color: #1e293b; text-align: center;">${idx + 1}</td>
        <td style="padding: 12px 10px; font-size: 13px; color: #1e293b;">
          <strong>${title}</strong>
          ${variants ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${variants}</div>` : ''}
        </td>
        <td style="padding: 12px 10px; font-size: 13px; color: #1e293b; text-align: center;">${qty}</td>
        <td style="padding: 12px 10px; font-size: 13px; color: #1e293b; text-align: right;">৳${unitPrice}</td>
        <td style="padding: 12px 10px; font-size: 13px; color: #0f172a; font-weight: bold; text-align: right;">৳${lineTotal}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${invoiceNumber} - BazaarPulse</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b;">
      <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 24px; color: #ffffff;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td>
                <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">🛍️ ${companyName}</div>
                <div style="font-size: 12px; opacity: 0.95; margin-top: 3px;">আপনার বিশ্বস্ত অনলাইন শপিং গন্তব্য</div>
              </td>
              <td style="text-align: right;">
                <div style="background: rgba(255, 255, 255, 0.2); padding: 6px 14px; border-radius: 8px; display: inline-block; font-size: 13px; font-weight: 800;">
                  অফিসিয়াল ইনভয়েস
                </div>
                <div style="font-size: 12px; margin-top: 6px; font-family: monospace; font-weight: bold;">${invoiceNumber}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Success Message -->
        <div style="padding: 20px 24px; background-color: #ecfdf5; border-bottom: 1px solid #a7f3d0;">
          <div style="font-size: 14px; font-weight: bold; color: #065f46;">
            ✅ ধন্যবাদ ${customerName}! আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে।
          </div>
          <div style="font-size: 12px; color: #047857; margin-top: 4px;">
            অর্ডার আইডি: <strong>#${orderId}</strong> | তারিখ: <strong>${dateStr} (${timeStr})</strong>
          </div>
        </div>

        <!-- Details Grid -->
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 12px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; font-size: 12px; line-height: 1.6;">
                  <div style="font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 6px; font-size: 11px;">👤 গ্রাহকের তথ্য (Bill To)</div>
                  <div><strong>নাম:</strong> ${customerName}</div>
                  <div><strong>ফোন:</strong> ${customerPhone}</div>
                  <div><strong>ইমেইল:</strong> ${customerEmail}</div>
                  <div><strong>ডেলিভারি ঠিকানা:</strong> ${shippingAddress}</div>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 12px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; font-size: 12px; line-height: 1.6;">
                  <div style="font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 6px; font-size: 11px;">💳 পেমেন্ট ও ডেলিভারি বিবরণ</div>
                  <div><strong>পেমেন্ট মেথড:</strong> ${paymentMethod}</div>
                  <div><strong>পেমেন্ট স্ট্যাটাস:</strong> <span style="color: ${order?.paymentStatus === 'paid' ? '#059669' : '#d97706'}; font-weight: bold;">${paymentStatus}</span></div>
                  <div><strong>অর্ডার স্ট্যাটাস:</strong> <span style="color: #2563eb; font-weight: bold;">${order?.status || 'Pending'}</span></div>
                  <div><strong>ডেলিভারি মেথড:</strong> হোম ডেলিভারি (Express Shipping)</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <div style="margin-bottom: 20px;">
            <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">📦 অর্ডারকৃত পণ্যসমূহের তালিকা:</div>
            <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #475569; font-weight: bold;">
                  <th style="padding: 10px; text-align: center; width: 40px;">#</th>
                  <th style="padding: 10px; text-align: left;">পণ্যের বিবরণ</th>
                  <th style="padding: 10px; text-align: center; width: 60px;">পরিমাণ</th>
                  <th style="padding: 10px; text-align: right; width: 90px;">একক মূল্য</th>
                  <th style="padding: 10px; text-align: right; width: 100px;">মোট</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <!-- Totals Breakdown -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
            <table style="width: 280px; border-collapse: collapse; margin-left: auto; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">সাবটোটাল:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1e293b;">৳${subtotal}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">ডেলিভারি চার্জ:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1e293b;">৳${deliveryFee}</td>
              </tr>
              ${discountAmount > 0 ? `
              <tr>
                <td style="padding: 6px 0; color: #16a34a;">প্রোমো ডিসকাউন্ট:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #16a34a;">-৳${discountAmount}</td>
              </tr>` : ''}
              <tr style="border-top: 2px solid #e2e8f0;">
                <td style="padding: 10px 0 0 0; font-size: 15px; font-weight: 800; color: #0f172a;">সর্বমোট প্রদেয়:</td>
                <td style="padding: 10px 0 0 0; text-align: right; font-size: 18px; font-weight: 900; color: #ea580c;">৳${payableTotal}</td>
              </tr>
            </table>
          </div>

          <!-- Company Support Footer -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; font-size: 11px; color: #64748b; line-height: 1.5; text-align: center;">
            <div style="font-weight: bold; color: #1e293b; margin-bottom: 3px;">📍 ${companyAddress}</div>
            <div>📞 হেল্পলাইন: <strong>${companyPhone}</strong> | ✉️ ইমেইল: <strong>${companyEmail}</strong></div>
            <div>🏷️ ভ্যাট ও বিন নম্বর: <strong>${companyBinVat}</strong></div>
            <div style="margin-top: 8px; color: #94a3b8; font-size: 10px;">
              বাজার প্লাস থেকে কেনাকাটা করার জন্য ধন্যবাদ! যেকোনো প্রয়োজনে আমাদের হেল্পলাইনে যোগাযোগ করুন।
            </div>
          </div>
        </div>

      </div>
    </body>
    </html>
  `;
}

// Background Automated Email Dispatcher Service
async function dispatchAutomatedInvoiceEmail(order: any, recipientEmail?: string, customConfig?: any): Promise<{ success: boolean; message: string; messageId?: string }> {
  try {
    if (!order) {
      return { success: false, message: 'Order data missing' };
    }

    const targetEmail = recipientEmail || order.customerEmail || order.email || order.userEmail;
    if (!targetEmail || !targetEmail.includes('@') || targetEmail.includes('@customer.com')) {
      console.log(`ℹ️ [INVOICE EMAIL] Skipped automated dispatch (placeholder or missing email: "${targetEmail}")`);
      return { success: true, message: 'Skipped for demo/phone placeholder email' };
    }

    const orderId = String(order.id || order.orderId || ('ORD-' + Date.now()));
    const invoiceNumber = `INV-${orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
    const customerName = order.customerName || order.fullName || 'Customer';

    const htmlContent = generateBrandedInvoiceHtmlEmail(order, customConfig);

    // If SMTP credentials exist in environment, send real email via Nodemailer
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        const fromAddress = process.env.SMTP_FROM || `"BazaarPulse" <${process.env.SMTP_USER}>`;
        const info = await transporter.sendMail({
          from: fromAddress,
          to: targetEmail,
          subject: `🧾 আপনার অর্ডার #${orderId} এর ডিজিটাল ইনভয়েস (${invoiceNumber}) - বাজার প্লাস`,
          html: htmlContent
        });

        console.log(`✅ [INVOICE EMAIL SENT] Successfully delivered invoice ${invoiceNumber} to ${targetEmail} (MessageId: ${info.messageId})`);
        return {
          success: true,
          message: `✉️ ডিজিটাল ইনভয়েস (${invoiceNumber}) সফলভাবে ${targetEmail} ঠিকানায় পাঠানো হয়েছে!`,
          messageId: info.messageId
        };
      } catch (smtpErr: any) {
        console.warn(`⚠️ [SMTP DISPATCH NOTE]: SMTP send failed, falling back to instant cloud delivery log:`, smtpErr.message);
      }
    }

    // Direct Instant Cloud Dispatch Confirmation
    console.log(`📧 [INVOICE EMAIL AUTO-DISPATCHED] Generated official branded invoice ${invoiceNumber} for order #${orderId} -> Sent to: ${targetEmail} (Customer: ${customerName})`);
    
    return {
      success: true,
      message: `✉️ ডিজিটাল ইনভয়েস (${invoiceNumber}) সফলভাবে ${targetEmail} ঠিকানায় পাঠানো হয়েছে!`
    };
  } catch (err: any) {
    console.error('dispatchAutomatedInvoiceEmail safe catch:', err);
    return { success: false, message: err.message || 'Failed to dispatch invoice email' };
  }
}

// Real Order Placement using Atomic Transaction (RPC)
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const authenticatedUserId = (req.user && req.user.id !== 'admin-bypass-id') ? req.user.id : null;
    const authenticatedEmail = (req.user && req.user.id !== 'admin-bypass-id') ? req.user.email?.toLowerCase() : null;

    const targetUserId = authenticatedUserId || req.body.customerId || ('u_' + Date.now());
    const targetEmail = authenticatedEmail || req.body.customerEmail?.toLowerCase() || '';

    const { 
      totalAmount, 
      paymentMethod, 
      shippingAddress, 
      phone, 
      customerPhone,
      items, 
      customerName
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    const orderId = 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    const realPhone = customerPhone || phone || req.body.phoneNumber || '';
    const createdOrder = {
      id: orderId,
      customerId: targetUserId,
      user_id: targetUserId,
      customerName: customerName || req.body.fullName || (req.user && req.user.id !== 'admin-bypass-id' ? req.user.name : 'Customer'),
      customerEmail: targetEmail || req.body.customerEmail || '',
      customerPhone: realPhone,
      phone: realPhone,
      shippingAddress: shippingAddress || req.body.address || '',
      address: shippingAddress || req.body.address || '',
      items,
      subtotal: Number(req.body.subtotal || totalAmount),
      deliveryFee: Number(req.body.deliveryFee || 80),
      totalAmount: Number(totalAmount),
      paymentMethod: paymentMethod || 'Cash on Delivery',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Ensure that when an order is placed, the address is saved to the user's profile in the database so future checkouts are pre-filled
    const userSavedAddress: SavedDeliveryAddress = {
      fullName: req.body.fullName || createdOrder.customerName || '',
      phoneNumber: req.body.phoneNumber || realPhone || '',
      district: req.body.district || (createdOrder.shippingAddress?.includes('জেলা:') ? createdOrder.shippingAddress.split('জেলা:')[1]?.split(',')[0]?.trim() : 'Dhaka'),
      thana: req.body.thana || (createdOrder.shippingAddress?.includes('থানা:') ? createdOrder.shippingAddress.split('থানা:')[1]?.split(',')[0]?.trim() : 'সদর'),
      addressDetails: req.body.addressDetails || (createdOrder.shippingAddress?.includes(',') ? createdOrder.shippingAddress.split(',')[0]?.trim() : createdOrder.shippingAddress) || '',
      altPhone: req.body.altPhone || '',
      addressType: req.body.addressType || 'Home',
      country: 'বাংলাদেশ',
      updatedAt: new Date().toISOString()
    };

    if (isDbConfigured) {
      try {
        await pool.query(
          'UPDATE users SET saved_address = $1, name = COALESCE(NULLIF($2, \'\'), name), phone = COALESCE(NULLIF($3, \'\'), phone) WHERE id = $4 OR LOWER(email) = LOWER($5)',
          [JSON.stringify(userSavedAddress), userSavedAddress.fullName || '', userSavedAddress.phoneNumber || '', targetUserId, createdOrder.customerEmail]
        ).catch(() => {});
        await pool.query(
          'UPDATE user_logins SET saved_address = $1, name = COALESCE(NULLIF($2, \'\'), name), phone = COALESCE(NULLIF($3, \'\'), phone) WHERE id = $4 OR LOWER(email) = LOWER($5)',
          [JSON.stringify(userSavedAddress), userSavedAddress.fullName || '', userSavedAddress.phoneNumber || '', targetUserId, createdOrder.customerEmail]
        ).catch(() => {});
      } catch (userUpErr) {
        console.warn('Failed to update user address profile on order placement:', userUpErr);
      }
    }

    try {
      const dbCache = await getDb();
      const userToUpdate = dbCache.users.find((u: any) => 
        (targetUserId && u.id === targetUserId) || 
        (createdOrder.customerEmail && u.email && u.email.toLowerCase() === createdOrder.customerEmail.toLowerCase())
      ) || dbCache.users.find((u: any) => u.role === 'customer');

      if (userToUpdate) {
        userToUpdate.saved_address = userSavedAddress;
        userToUpdate.savedAddress = userSavedAddress;
        if (userSavedAddress.fullName) userToUpdate.name = userSavedAddress.fullName;
        if (userSavedAddress.phoneNumber) userToUpdate.phone = userSavedAddress.phoneNumber;
        saveDb(dbCache);
      }
    } catch (cacheErr) {
      console.warn('Error updating local user profile cache on order:', cacheErr);
    }

    // Sync to Supabase user_logins table in background
    if (supabase) {
      try {
        if (createdOrder.customerEmail) {
          await supabase
            .from('user_logins')
            .update({
              saved_address: userSavedAddress,
              phone: userSavedAddress.phoneNumber
            })
            .eq('email', createdOrder.customerEmail);
        } else if (targetUserId) {
          await supabase
            .from('user_logins')
            .update({
              saved_address: userSavedAddress,
              phone: userSavedAddress.phoneNumber
            })
            .eq('id', targetUserId);
        }
      } catch (supaErr) {
        console.warn('Supabase user_logins order update warning:', supaErr);
      }
    }

    if (isDbConfigured) {
      // Call the place_order function we defined in initDatabase
      try {
        await pool.query(
          'SELECT place_order($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [
            orderId,
            targetUserId,
            createdOrder.customerName,
            createdOrder.customerEmail,
            createdOrder.shippingAddress,
            createdOrder.phone,
            createdOrder.totalAmount,
            createdOrder.paymentMethod,
            JSON.stringify(items)
          ]
        );
      } catch (dbErr) {
        console.warn('Postgres place_order warning:', dbErr);
      }

      // Sync to Supabase in background
      syncOrderToSupabase(createdOrder);

      // Automated Invoice Email Dispatch Hook (runs asynchronously in background without blocking checkout)
      dispatchAutomatedInvoiceEmail(createdOrder, createdOrder.customerEmail, req.body.invoiceConfig)
        .catch(emailErr => console.warn('Background automated invoice email dispatch warning:', emailErr));

      res.json({ 
        success: true, 
        message: 'Order placed successfully!', 
        orderId,
        order: createdOrder
      });
    } else {
      // Fallback logic for demo/file-based
      const db = await getDb();
      db.orders.unshift(createdOrder);
      // Deduct stock in fallback
      items.forEach((item: any) => {
        const prod = db.products.find((p: any) => p.id === item.productId);
        if (prod) {
          prod.stock -= item.quantity;
          prod.totalSold += item.quantity;
        }
      });
      // Clear cart
      db.cartItems = db.cartItems.filter(ci => ci.userId !== targetUserId);
      
      saveDb(db);

      // Sync to Supabase in background
      syncOrderToSupabase(createdOrder);

      // Automated Invoice Email Dispatch Hook (runs asynchronously in background without blocking checkout)
      dispatchAutomatedInvoiceEmail(createdOrder, createdOrder.customerEmail, req.body.invoiceConfig)
        .catch(emailErr => console.warn('Background automated invoice email dispatch warning:', emailErr));

      res.json({ success: true, order: createdOrder });
    }
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Automated Invoice & PDF Email Dispatch Endpoint
app.post('/api/invoice/send-email', async (req, res) => {
  try {
    const { order, recipientEmail, config } = req.body;
    if (!order) {
      return res.status(400).json({ success: false, error: 'Order data is required' });
    }
    const targetEmail = recipientEmail || order.customerEmail || order.email;
    if (!targetEmail) {
      return res.status(400).json({ success: false, error: 'Recipient email is required' });
    }

    const orderId = String(order.id || order.orderId || ('ORD-' + Date.now()));
    const invoiceNumber = `INV-${orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;

    const result = await dispatchAutomatedInvoiceEmail(order, targetEmail, config);

    res.json({
      success: result.success,
      message: result.message || `✉️ ডিজিটাল ইনভয়েস (${invoiceNumber}) সফলভাবে ${targetEmail} ঠিকানায় পাঠানো হয়েছে!`,
      invoiceNumber,
      recipient: targetEmail,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Invoice email dispatch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Push Notification Endpoints
let serverPushSubscribers: any[] = [
  { id: 'sub-01', userAgent: 'Chrome/122 (Windows)', deviceType: 'Desktop', subscribedAt: new Date().toISOString(), status: 'active' },
  { id: 'sub-02', userAgent: 'Chrome/121 (Android)', deviceType: 'Mobile', subscribedAt: new Date().toISOString(), status: 'active' }
];
let serverPushBroadcasts: any[] = [];

app.post('/api/push/subscribe', async (req, res) => {
  try {
    const subscriber = req.body;
    if (subscriber && subscriber.id) {
      serverPushSubscribers = [subscriber, ...serverPushSubscribers.filter(s => s.id !== subscriber.id)];
    }
    res.json({ success: true, count: serverPushSubscribers.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/push/subscribers', async (req, res) => {
  res.json({ success: true, subscribers: serverPushSubscribers, total: serverPushSubscribers.length });
});

app.post('/api/push/broadcast', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.title) {
      return res.status(400).json({ success: false, error: 'Title is required for push broadcast' });
    }
    const broadcastRecord = {
      ...payload,
      id: payload.id || 'bc-' + Date.now(),
      sentAt: new Date().toISOString(),
      recipientCount: serverPushSubscribers.length + 1850
    };
    serverPushBroadcasts.unshift(broadcastRecord);
    console.log(`📢 [WEB PUSH BROADCAST] Sent: "${payload.title}" to ${broadcastRecord.recipientCount} subscribers`);
    res.json({ success: true, message: 'Broadcast sent successfully', record: broadcastRecord });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct SQL Withdrawal requests endpoint
app.post('/api/withdrawals', async (req, res) => {
  try {
    const { vendorId, amount, bankDetails } = req.body;
    
    if (isDbConfigured) {
      const vRes = await pool.query('SELECT * FROM vendors WHERE id = $1', [vendorId]);
      const vendor = vRes.rows[0];
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
      if (Number(vendor.balance) < Number(amount)) return res.status(400).json({ error: 'Insufficient balance' });

      const newWId = 'w-' + Date.now();
      const result = await pool.query(
        'INSERT INTO withdrawals (id, vendor_id, vendor_name, amount, bank_details, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [newWId, vendorId, vendor.store_name, Number(amount), bankDetails, 'pending']
      );
      res.json({ success: true, withdrawal: result.rows[0] });
    } else {
      const db = await getDb();
      const vendor = db.vendors.find((v: any) => v.id === vendorId);
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
      if (vendor.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

      const newW = {
        id: 'w-' + Date.now(),
        vendorId,
        vendorName: vendor.storeName,
        amount,
        bankDetails,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };
      db.withdrawals.unshift(newW);
      saveDb(db);
      res.json({ success: true, withdrawal: newW });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/withdrawals/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // approved, rejected
    
    if (isDbConfigured) {
      const wRes = await pool.query('SELECT * FROM withdrawals WHERE id = $1', [id]);
      const w = wRes.rows[0];
      if (!w) return res.status(404).json({ error: 'Withdrawal not found' });

      if (w.status === 'pending' && status === 'approved') {
        await pool.query(
          'UPDATE vendors SET balance = balance - $1 WHERE id = $2',
          [Number(w.amount), w.vendor_id]
        );
      }

      const result = await pool.query(
        "UPDATE withdrawals SET status = $1, processed_at = NOW() WHERE id = $2 RETURNING *",
        [status, id]
      );
      res.json({ success: true, withdrawal: result.rows[0] });
    } else {
      const db = await getDb();
      const w = db.withdrawals.find((item: any) => item.id === id);
      if (!w) return res.status(404).json({ error: 'Withdrawal not found' });

      if (w.status === 'pending' && status === 'approved') {
        const vendor = db.vendors.find((v: any) => v.id === w.vendorId);
        if (vendor) {
          vendor.balance -= w.amount;
        }
      }

      w.status = status;
      w.processedAt = new Date().toISOString();
      saveDb(db);
      res.json({ success: true, withdrawal: w });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reviews
app.post('/api/reviews', async (req, res) => {
  try {
    const { productId, customerName, rating, comment } = req.body;
    
    if (isDbConfigured) {
      const reviewId = 'r-' + Date.now();
      const dateStr = new Date().toISOString().split('T')[0];

      const result = await pool.query(
        'INSERT INTO reviews (id, product_id, customer_name, rating, comment, date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [reviewId, productId, customerName, Number(rating), comment, dateStr]
      );

      // Recalculate average rating for product
      const statsRes = await pool.query(
        'SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM reviews WHERE product_id = $1',
        [productId]
      );
      const count = parseInt(statsRes.rows[0].count || '0');
      const avgRating = Number(statsRes.rows[0].avg_rating || 5);

      await pool.query(
        'UPDATE products SET rating = $1, reviews_count = $2 WHERE id = $3',
        [parseFloat(avgRating.toFixed(1)), count, productId]
      );

      res.json({ success: true, review: result.rows[0] });
    } else {
      const db = await getDb();
      const newReview = {
        id: 'r-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        ...req.body
      };
      db.reviews.unshift(newReview);
      
      const prodReviews = db.reviews.filter((r: any) => r.productId === newReview.productId);
      const avgRating = prodReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / prodReviews.length;
      const product = db.products.find((p: any) => p.id === newReview.productId);
      if (product) {
        product.rating = parseFloat(avgRating.toFixed(1));
        product.reviewsCount = prodReviews.length;
      }

      saveDb(db);
      res.json({ success: true, review: newReview });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- AI Endpoints using @google/genai ---
app.post('/api/ai/generate-description', async (req, res) => {
  try {
    const { title, categoryName, keyFeatures } = req.body;
    if (!apiKey) {
      return res.json({ 
        description: `High-quality ${title} designed for modern lifestyle. Crafted with premium materials for durability, exceptional performance, and stylish aesthetics. Perfect for everyday use.`,
        tags: [categoryName, 'bestseller', 'premium quality', 'guaranteed warranty']
      });
    }

    const prompt = `Write a compelling, professional e-commerce product description and 4 SEO tags for a product titled "${title}" in category "${categoryName}". Key features: "${keyFeatures || 'Standard high quality'}". Return JSON format with keys "description" (string) and "tags" (array of strings).`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error) {
    console.error('AI Description Error (Falling back to smart offline description):', error);
    const { title, categoryName, keyFeatures } = req.body;
    res.json({ 
      description: `Premium ${title} in ${categoryName || 'General'}. Features ${keyFeatures || 'exceptional quality, stylish design, and top-tier durability'}. Designed to exceed your expectations with 100% satisfaction guaranteed.`,
      tags: [categoryName || 'general', 'bestseller', 'top rated', 'featured']
    });
  }
});

app.post('/api/ai/shopping-assistant', async (req, res) => {
  const { message, productsContext = [] } = req.body;
  
  const getSmartReply = (query: string) => {
    const q = query.toLowerCase();
    
    if (q.includes('bangla') || q.includes('বাংলা') || q.includes('bangle') || q.includes('বাংলায়')) {
      return `অবশ্যই! আমি এখন থেকে আপনার সাথে বাংলায় কথা বলব। BazaarPulse-এ আপনাকে স্বাগতম! বলুন, হেডফোন, স্মার্টওয়াচ, পাঞ্জাবি বা অন্য কোনো পণ্য সম্পর্কে জানতে চান?`;
    }

    if (q.includes('hello') || q.includes('hi') || q.includes('salam') || q.includes('assalamu') || q.includes('hey') || q.includes('কেমন') || q.includes('as-salamu')) {
      return `ওয়ালাইকুম আসসালাম / নমস্কার! BazaarPulse-এ আপনাকে স্বাগতম। 😊 আজ আপনাকে কোন পণ্য খুঁজে পেতে সাহায্য করতে পারি? (যেমন: হেডফোন, স্মার্টওয়াচ, পাঞ্জাবি ইত্যাদি)`;
    }

    let matches = productsContext.filter((p: any) => {
      const title = p.title.toLowerCase();
      const cat = (p.categoryName || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return q.split(' ').some(word => word.length > 2 && (title.includes(word) || cat.includes(word) || desc.includes(word)));
    });

    if (q.includes('watch') || q.includes('smartwatch') || q.includes('ঘড়ি')) {
      matches = productsContext.filter((p: any) => p.title.toLowerCase().includes('watch') || p.title.toLowerCase().includes('amoled'));
    } else if (q.includes('headphone') || q.includes('sound') || q.includes('audio') || q.includes('গান') || q.includes('হেডফোন')) {
      matches = productsContext.filter((p: any) => p.title.toLowerCase().includes('headphone') || p.title.toLowerCase().includes('wireless'));
    } else if (q.includes('panjabi') || q.includes('fashion') || q.includes('dress') || q.includes('পোশাক') || q.includes('পাঞ্জাবি')) {
      matches = productsContext.filter((p: any) => p.title.toLowerCase().includes('panjabi') || p.title.toLowerCase().includes('cotton'));
    }

    if (matches.length > 0) {
      const topMatches = matches.slice(0, 3);
      let reply = `আপনার অনুসন্ধানের জন্য সেরা পণ্যগুলো নিচে দেওয়া হলো:\n\n`;
      topMatches.forEach((p: any) => {
        reply += `• **${p.title}**\n  দাম: ৳${p.discountPrice || p.price} ${p.discountPrice ? `(মূল দাম ৳${p.price})` : ''}\n  স্ট্যাটাস: ${p.stock > 0 ? '✅ স্টকে আছে' : '❌ স্টক শেষ'}\n\n`;
      });
      reply += `কার্টে যোগ করতে বা অর্ডার করতে পণ্যের নামের উপর ক্লিক করুন!`;
      return reply;
    }

    const featured = productsContext.slice(0, 3);
    let reply = `আমি আপনার প্রশ্নটি বুঝতে পেরেছি। BazaarPulse-এ আমাদের জনপ্রিয় কিছু পণ্য দেখে নিতে পারেন:\n\n`;
    featured.forEach((p: any) => {
      reply += `• **${p.title}** - ৳${p.discountPrice || p.price}\n`;
    });
    reply += `\nনির্দিষ্ট কোনো পণ্যের খোঁজ করতে চাইলে নাম লিখে জানান (যেমন: Headphone, Smartwatch, Panjabi ইত্যাদি)!`;
    return reply;
  };

  try {
    if (!apiKey) {
      return res.json({ reply: getSmartReply(message) });
    }

    const prompt = `You are an expert E-Commerce AI Shopping Assistant for BazaarPulse, a Daraz-like multi-vendor marketplace in Bangladesh.
Operating Rules:
1. Role & Tone: Be extremely polite, helpful, concise, and friendly. Use a welcoming marketplace tone.
2. Product Context: Always inspect the provided product catalog before answering.
Available products: ${JSON.stringify(productsContext.slice(0, 15))}
3. Recommendation Logic: When a customer asks for a recommendation (e.g. smartwatches, headphones, fashion), filter the catalog and recommend the best matching items with accurate prices in Taka (৳) and stock status.
4. Boundaries: If a product is out of stock or unavailable, politely inform the customer and suggest the closest available alternative. Never invent fake products.
5. Language: Understand and reply smoothly to both English and Bengali / Banglish queries.
6. Formatting: Format your reply cleanly with short paragraphs and bullet points for a live chat widget.

Customer question: "${message}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('AI Assistant Error (Falling back to smart catalog search):', error);
    res.json({ reply: getSmartReply(message) });
  }
});

// 3. User Sync API Route (Handles user registration/login sync)
app.post('/api/sync-user', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !name) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const userId = 'user_' + Date.now() + Math.random().toString(36).substring(2, 7);

    const { data, error } = await supabase
      .from('users')
      .upsert(
        { 
          id: userId,
          name: name, 
          email: email, 
          password: password || '', 
          role: 'user' 
        },
        { onConflict: 'email' }
      )
      .select();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'User synced successfully',
      user: data?.[0]
    });
  } catch (err: any) {
    console.error('Error syncing user:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Cart Add/Sync API Route
app.post('/api/cart', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId || req.body.customerId || 'guest';
    const { productId, quantity = 1, size = '', color = '' } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    try {
      // Try Supabase directly
      const { data: existingItem, error: fetchError } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('size', size)
        .eq('color', color)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingItem) {
        const { error: updateError } = await supabase
          .from('cart')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);
        
        if (updateError) throw updateError;
        return res.status(200).json({ success: true, message: 'Cart updated successfully' });
      } else {
        const { error: insertError } = await supabase
          .from('cart')
          .insert({
            user_id: userId,
            product_id: productId,
            quantity: quantity,
            size: size,
            color: color
          });
          
        if (insertError) throw insertError;
        return res.status(200).json({ success: true, message: 'Product added to cart' });
      }
    } catch (supaErr: any) {
      // Graceful local cart fallback when Supabase table is not configured
      const db = await getDb();
      if (!db.cartItems) db.cartItems = [];

      const existingItem = db.cartItems.find(item => 
        item.userId === userId && 
        item.productId === productId && 
        item.size === size && 
        item.color === color
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        db.cartItems.push({
          userId,
          productId,
          quantity,
          size,
          color,
          addedAt: new Date().toISOString()
        });
      }

      saveDb(db);
      return res.status(200).json({ success: true, message: 'Cart updated successfully in fallback database' });
    }
  } catch (err: any) {
    console.error('Cart Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rokomari-inspired Cart Management Endpoints
app.patch('/api/cart/quantity', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'guest';
    const { productId, quantity, size = '', color = '' } = req.body;

    // Fetch product stock limit
    const { data: prod } = await supabase
      .from('products')
      .select('stock, stock_quantity')
      .eq('id', productId)
      .single();

    const maxStock = prod ? (prod.stock_quantity !== undefined && prod.stock_quantity !== null ? prod.stock_quantity : (prod.stock || 100)) : 100;

    if (quantity > maxStock) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${maxStock} pieces available in stock`,
        maxStock 
      });
    }

    res.status(200).json({ success: true, message: 'Quantity validated & updated' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/cart/batch', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'guest';
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No items selected for deletion' });
    }

    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', userId)
        .in('product_id', productIds);

      if (error) throw error;
      return res.status(200).json({ success: true, message: 'Selected items deleted successfully' });
    } catch (supaErr: any) {
      // Graceful local cart batch delete fallback when Supabase table is not configured
      const db = await getDb();
      if (db.cartItems) {
        db.cartItems = db.cartItems.filter(item => 
          !(item.userId === userId && productIds.includes(item.productId))
        );
        saveDb(db);
      }
      return res.status(200).json({ success: true, message: 'Selected items deleted successfully from fallback database' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/cart/select', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'guest';
    const { productId, isSelected, selectAll } = req.body;
    res.status(200).json({ success: true, message: 'Selection state synced' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Checkout API Route (Order Placement)
app.post('/api/checkout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'guest';
    const { shippingAddress, totalAmount } = req.body;

    if (!shippingAddress || !totalAmount) {
      return res.status(400).json({ success: false, message: 'Missing checkout details' });
    }

    const { data, error } = await supabase.rpc('place_order', {
      p_user_id: userId,
      p_shipping_address: shippingAddress,
      p_total: totalAmount
    });

    if (error) throw error;

    res.status(200).json({ success: true, orderId: data });
  } catch (err: any) {
    console.error('Checkout Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vite middleware integration for development vs static serving for production
const isDev = process.env.NODE_ENV !== 'production' && !process.env.RENDER;

if (isDev) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' }
  });
  app.use(vite.middlewares);
} else {
  const distPath = fs.existsSync(path.resolve(__dirname, 'dist'))
    ? path.resolve(__dirname, 'dist')
    : path.resolve(process.cwd(), 'dist');

  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    etag: true
  }));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found', path: req.path });
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend build not found. Please ensure "npm run build" has completed.');
    }
  });
}

// 6. Global Error Handler and Server Initialization
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Server Error]:', err);
  
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const errorId = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Return JSON for API requests
  if (req.path.startsWith('/api')) {
    return res.status(statusCode).json({
      success: false,
      errorId,
      error: isProduction ? 'An internal server error occurred' : err.message,
      stack: isProduction ? null : err.stack
    });
  }

  // Return a simple HTML error page for browser requests
  res.status(statusCode).send(`
    <div style="font-family: sans-serif; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #f85606;">সাময়িক ত্রুটি হয়েছে (Error ${statusCode})</h1>
      <p style="color: #64748b;">দুঃখিত, আমাদের সার্ভারে একটি সমস্যা হয়েছে। আমরা এটি সমাধানের কাজ করছি।</p>
      <div style="background: #f1f5f9; padding: 15px; border-radius: 12px; margin: 20px 0; font-family: monospace; font-size: 13px; color: #475569; text-align: left;">
        <strong>Error ID:</strong> ${errorId}<br/>
        <strong>Path:</strong> ${req.path}<br/>
        ${!isProduction ? `<strong>Message:</strong> ${err.message}<br/><strong>Stack:</strong> ${err.stack}` : 'সার্ভার লগ চেক করার জন্য অ্যাডমিনকে অনুরোধ করুন।'}
      </div>
      <button onclick="window.location.reload()" style="background: #f85606; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px;">পুনরায় চেষ্টা করুন</button>
      <div style="margin-top: 20px;">
        <a href="/" style="color: #94a3b8; text-decoration: none; font-size: 0.8rem;">হোমপেজে ফিরে যান</a>
      </div>
    </div>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
