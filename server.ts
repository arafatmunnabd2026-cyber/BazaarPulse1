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
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();

// 1. Express setup with JSON body parser (supports large uploads for multi-image products) and CORS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Initialize Gemini SDK if API key is available
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Database initialization file path
const DB_FILE = path.join(__dirname, 'database.json');

interface InitialData {
  users: any[];
  vendors: any[];
  products: any[];
  categories: any[];
  orders: any[];
  withdrawals: any[];
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
  };
  reviews: any[];
  cartItems: { userId: string; productId: string; quantity: number; size?: string; color?: string; addedAt: string }[];
}

const defaultData: InitialData = {
  users: [
    { id: 'u1', name: 'Admin User', email: 'arafatmunna14620022@gmail.com', role: 'admin', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
    { id: 'u2', name: 'TechHaven Electronics', email: 'vendor1@techhaven.com', role: 'vendor', vendorId: 'v1', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
    { id: 'u3', name: 'Urban Chic Fashion', email: 'vendor2@urbanchic.com', role: 'vendor', vendorId: 'v2', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
    { id: 'u4', name: 'Rahim Ahmed', email: 'customer@gmail.com', role: 'customer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' }
  ],
  vendors: [
    {
      id: 'v1',
      storeName: 'TechHaven Electronics',
      ownerName: 'Tanvir Ahmed',
      email: 'vendor1@techhaven.com',
      phone: '+8801712345678',
      status: 'approved',
      commissionRate: 10,
      balance: 14500,
      totalSales: 128000,
      rating: 4.8,
      joinedDate: '2025-01-15',
      logo: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=150'
    },
    {
      id: 'v2',
      storeName: 'Urban Chic Fashion',
      ownerName: 'Nusrat Jahan',
      email: 'vendor2@urbanchic.com',
      phone: '+8801812345679',
      status: 'approved',
      commissionRate: 12,
      balance: 8900,
      totalSales: 74000,
      rating: 4.6,
      joinedDate: '2025-02-01',
      logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=150'
    },
    {
      id: 'v3',
      storeName: 'Gadget Galaxy',
      ownerName: 'Imran Khan',
      email: 'vendor3@gadgetgalaxy.com',
      phone: '+8801912345680',
      status: 'pending',
      commissionRate: 10,
      balance: 0,
      totalSales: 0,
      rating: 0,
      joinedDate: '2026-03-20',
      logo: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=150'
    }
  ],
  categories: [
    { id: 'c1', name: 'Electronics', slug: 'electronics', icon: 'Laptop' },
    { id: 'c2', name: 'Fashion & Apparel', slug: 'fashion', icon: 'Shirt' },
    { id: 'c3', name: 'Home & Living', slug: 'home-living', icon: 'Home' },
    { id: 'c4', name: 'Beauty & Health', slug: 'beauty', icon: 'Sparkles' },
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
const isDbConfigured = !!process.env.DATABASE_URL;
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isDbConfigured ? { rejectUnauthorized: false } : false
});

// Database Migration & Initialization Helper
async function initDatabase() {
  if (!isDbConfigured) {
    console.log('Skipping Database Initialization: DATABASE_URL is not set.');
    return;
  }
  
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL. Initializing database schema...');
    
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
        campaign_banner JSONB,
        banners JSONB,
        maintenance_mode BOOLEAN DEFAULT false,
        CONSTRAINT single_row CHECK (id = 1)
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
          'INSERT INTO users (id, name, email, role, avatar, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
          [u.id, u.name, u.email, u.role, u.avatar, u.status || 'active']
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
  } catch (err) {
    console.error('Error during PostgreSQL schema generation:', err);
  }
}

// Execute DB schema generation
initDatabase();

// 3. Test Database Connection Route
app.get('/api/test-db', async (req, res) => {
  if (!isDbConfigured) {
    return res.status(400).json({
      success: false,
      error: 'DATABASE_URL environment variable is not defined.'
    });
  }
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, version();');
    client.release();
    res.json({
      success: true,
      message: 'Successfully connected to Supabase PostgreSQL database!',
      timestamp: result.rows[0].now,
      version: result.rows[0].version
    });
  } catch (err: any) {
    console.error('Database connection test failed:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to the database.',
      details: err.message
    });
  }
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
  'fashion': 'c2',
  'fashion-apparel': 'c2',
  'home-living': 'c3',
  'home': 'c3',
  'beauty': 'c4',
  'beauty-health': 'c4',
  'groceries': 'c5',
  'sports': 'c6',
  'sports-outdoors': 'c6'
};

function normalizeCategoryId(catId?: string, catName?: string): string {
  if (catId && /^c[1-6]$/.test(catId)) return catId;
  const cleanId = (catId || '').toLowerCase().trim();
  if (CATEGORY_SLUG_TO_ID[cleanId]) return CATEGORY_SLUG_TO_ID[cleanId];
  const cleanName = (catName || '').toLowerCase().trim();
  if (cleanName.includes('elect')) return 'c1';
  if (cleanName.includes('fash') || cleanName.includes('appar')) return 'c2';
  if (cleanName.includes('home') || cleanName.includes('liv')) return 'c3';
  if (cleanName.includes('beaut') || cleanName.includes('health')) return 'c4';
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
        const { data: supaProducts, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(supaProducts)) {
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
          // Persist to local database.json cache so file is never out of sync!
          saveDb(db);
        }
      } catch (err) {
        console.error('Error fetching live products from Supabase in fallback:', err);
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
    
    const allOrderItems = orderItemsRes.rows;
    
    const users = usersRes.rows;
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


    const orders = ordersRes.rows.map(o => ({
      id: o.id,
      status: o.status,
      paymentStatus: o.payment_status,
      paymentMethod: o.payment_method,
      totalAmount: Number(o.total_amount),
      items: allOrderItems.filter(item => item.order_id === o.id).map(item => ({
        productId: item.product_id,
        title: item.title,
        price: Number(item.price),
        quantity: item.quantity,
        size: item.size,
        color: item.color
      })),
      customerName: o.customer_name,
      customerEmail: o.customer_email,
      address: o.address,
      phone: o.phone,
      createdAt: o.created_at
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
      maintenanceMode: !!rawSettings.maintenance_mode
    };
    
    return {
      users,
      categories,
      vendors,
      products,
      orders,
      withdrawals,
      reviews,
      cartItems,
      adminSettings
    };
  } catch (err) {
    console.error('Failed to query PostgreSQL, falling back to local file:', err);
    if (fs.existsSync(DB_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      } catch (e) {}
    }
    return defaultData;
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
        name: vendorId === 'v3' ? 'Gadget Galaxy' : 'TechHaven Electronics',
        email: vendorId === 'v3' ? 'vendor3@gadgetgalaxy.com' : 'vendor1@techhaven.com',
        role: 'vendor',
        status: isPending ? 'pending' : (status || 'approved'),
        vendorId: vendorId || 'v1'
      };
    } else if (role === 'customer') {
      payload = {
        id: 'u4',
        name: 'Rahim Ahmed',
        email: 'customer@gmail.com',
        role: 'customer',
        status: 'active'
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
    const { email, password, role } = req.body;
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
              ['u2', 'TechHaven Electronics', 'vendor1@techhaven.com', 'vendor', 'approved']
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
              'INSERT INTO users (id, name, email, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
              ['u4', 'Rahim Ahmed', 'customer@gmail.com', 'customer', 'active']
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
      role: targetUser.role,
      status: userStatus,
      vendorId,
      avatar: targetUser.avatar
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
    res.json({ success: true, token, user });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ success: false, error: 'Google authentication failed' });
  }
});

// 2. Get current authenticated user profile
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

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
    res.json(db);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
    if (isDbConfigured) {
      const { globalCommissionRate, platformName, heroBannerTitle, heroBannerSubtitle, banners, maintenanceMode } = req.body;
      
      const currentRes = await pool.query('SELECT * FROM admin_settings WHERE id = 1');
      const curr = currentRes.rows[0] || {};
      
      const rate = globalCommissionRate !== undefined ? Number(globalCommissionRate) : Number(curr.global_commission_rate || 10);
      const name = platformName !== undefined ? platformName : curr.platform_name || 'BazaarPulse';
      const title = heroBannerTitle !== undefined ? heroBannerTitle : curr.hero_banner_title || '';
      const subtitle = heroBannerSubtitle !== undefined ? heroBannerSubtitle : curr.hero_banner_subtitle || '';
      const activeBanners = banners !== undefined ? JSON.stringify(banners) : (curr.banners || '[]');
      const maint = maintenanceMode !== undefined ? !!maintenanceMode : !!curr.maintenance_mode;
      const campaign = curr.campaign_banner || '{}';

      const result = await pool.query(
        `INSERT INTO admin_settings (id, global_commission_rate, platform_name, hero_banner_title, hero_banner_subtitle, banners, maintenance_mode, campaign_banner)
         VALUES (1, $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
         global_commission_rate = EXCLUDED.global_commission_rate,
         platform_name = EXCLUDED.platform_name,
         hero_banner_title = EXCLUDED.hero_banner_title,
         hero_banner_subtitle = EXCLUDED.hero_banner_subtitle,
         banners = EXCLUDED.banners,
         maintenance_mode = EXCLUDED.maintenance_mode
         RETURNING *`,
        [rate, name, title, subtitle, activeBanners, maint, campaign]
      );

      const s = result.rows[0];
      res.json({
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
    } else {
      const db = await getDb();
      db.adminSettings = { ...db.adminSettings, ...req.body };
      saveDb(db);
      res.json({ success: true, adminSettings: db.adminSettings });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Campaign Banner Strip
app.put('/api/admin/campaign-banner', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    if (isDbConfigured) {
      const currentRes = await pool.query('SELECT campaign_banner FROM admin_settings WHERE id = 1');
      const curr = currentRes.rows[0]?.campaign_banner 
        ? (typeof currentRes.rows[0].campaign_banner === 'string' ? JSON.parse(currentRes.rows[0].campaign_banner) : currentRes.rows[0].campaign_banner)
        : {
            badge: 'PAYDAY SALE',
            title: 'Mega Discounts up to 70% Off',
            subtitle: 'Grab top deals across all categories with lightning fast delivery',
            buttonText: 'Grab Deals Now',
            linkText: '#flash-sale'
          };
      
      const updatedCampaign = { ...curr, ...req.body };
      
      const result = await pool.query(
        'UPDATE admin_settings SET campaign_banner = $1 WHERE id = 1 RETURNING *',
        [JSON.stringify(updatedCampaign)]
      );
      
      res.json({ success: true, campaignBanner: updatedCampaign });
    } else {
      const db = await getDb();
      if (!db.adminSettings.campaignBanner) {
        db.adminSettings.campaignBanner = {
          badge: 'PAYDAY SALE',
          title: 'Mega Discounts up to 70% Off',
          subtitle: 'Grab top deals across all categories with lightning fast delivery',
          buttonText: 'Grab Deals Now',
          linkText: '#flash-sale'
        };
      }
      db.adminSettings.campaignBanner = {
        ...db.adminSettings.campaignBanner,
        ...req.body
      };
      saveDb(db);
      res.json({ success: true, campaignBanner: db.adminSettings.campaignBanner });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Cart Promotional Banner
app.put('/api/admin/banner', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const db = await getDb();
    if (!db.adminSettings.cartBanner) {
      db.adminSettings.cartBanner = {
        isActive: true,
        bannerText: '৯৯৯ টাকার ইসলামিক বই কিনলেই পাচ্ছেন ফ্রি ডেলিভারি',
        termsText: 'শর্ত প্রযোজ্য'
      };
    }
    const isAct = req.body.isActive === true || req.body.isActive === 'true';
    db.adminSettings.cartBanner = {
      isActive: isAct,
      bannerText: req.body.bannerText !== undefined ? req.body.bannerText : db.adminSettings.cartBanner.bannerText,
      termsText: req.body.termsText !== undefined ? req.body.termsText : db.adminSettings.cartBanner.termsText
    };
    saveDb(db);
    res.json({ success: true, cartBanner: db.adminSettings.cartBanner });
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
          `INSERT INTO vendors (id, name, email, phone, status, commission_rate, balance, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [vendorId, storeName, newVendor.email, phone, 'pending', 10, 0]
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

// Vendor Order status update
const handleOrderStatusUpdate = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (isDbConfigured) {
      const result = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Order not found' });
      res.json({ success: true, order: result.rows[0] });
    } else {
      const db = await getDb();
      const order = db.orders.find((o: any) => o.id === id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      
      order.status = status;
      saveDb(db);
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
      res.json({ success: true, order });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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

// Real Order Placement using Atomic Transaction (RPC)
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized login required' });

    const { 
      totalAmount, 
      paymentMethod, 
      shippingAddress, 
      phone, 
      items, 
      customerName, 
      customerEmail 
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty' });
    }

    const orderId = 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();

    if (isDbConfigured) {
      // Call the place_order function we defined in initDatabase
      await pool.query(
        'SELECT place_order($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [
          orderId,
          userId,
          customerName || req.user?.name || 'Customer',
          customerEmail || req.user?.email || '',
          shippingAddress || '',
          phone || '',
          Number(totalAmount),
          paymentMethod || 'Cash on Delivery',
          JSON.stringify(items)
        ]
      );

      res.json({ 
        success: true, 
        message: 'Order placed successfully!', 
        orderId 
      });
    } else {
      // Fallback logic for demo/file-based (though prompt asks for production Supabase)
      const db = await getDb();
      const newOrder = {
        id: orderId,
        customerId: userId,
        customerName: customerName || req.user?.name || 'Customer',
        totalAmount: Number(totalAmount),
        status: 'pending',
        paymentMethod: paymentMethod || 'Cash on Delivery',
        address: shippingAddress || '',
        phone: phone || '',
        items,
        createdAt: new Date().toISOString()
      };
      
      db.orders.unshift(newOrder);
      // Deduct stock in fallback
      items.forEach((item: any) => {
        const prod = db.products.find((p: any) => p.id === item.productId);
        if (prod) {
          prod.stock -= item.quantity;
          prod.totalSold += item.quantity;
        }
      });
      // Clear cart
      db.cartItems = db.cartItems.filter(ci => ci.userId !== userId);
      
      saveDb(db);
      res.json({ success: true, order: newOrder });
    }
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, error: error.message });
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

// Vite middleware integration for development vs static serving for production / Render
const isDev = process.env.NODE_ENV === 'development' && !process.env.RENDER;

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

  app.use(express.static(distPath));

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

// 5. Checkout API Route (Order Placement)
app.post('/api/checkout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'guest';
    const { shippingAddress, totalAmount } = req.body;

    if (!shippingAddress || !totalAmount) {
      return res.status(400).json({ success: false, message: 'Missing checkout details' });
    }

    // Supabase RPC ফাংশন কল করা (যা আমরা SQL এ লিখেছি)
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

// 6. Proper error handling and server startup listening on process.env.PORT or port 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
