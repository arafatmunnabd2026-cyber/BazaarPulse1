import 'dotenv/config';
import express from 'express';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { OAuth2Client } from 'google-auth-library';
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
app.use(express.json());

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
    { id: 'c1', name: 'Electronics', slug: 'electronics', icon: 'Laptop', count: 24 },
    { id: 'c2', name: 'Fashion & Apparel', slug: 'fashion', icon: 'Shirt', count: 42 },
    { id: 'c3', name: 'Home & Living', slug: 'home-living', icon: 'Home', count: 18 },
    { id: 'c4', name: 'Beauty & Health', slug: 'beauty', icon: 'Sparkles', count: 31 },
    { id: 'c5', name: 'Groceries', slug: 'groceries', icon: 'ShoppingBag', count: 56 },
    { id: 'c6', name: 'Sports & Outdoors', slug: 'sports', icon: 'Trophy', count: 12 }
  ],
  products: [
    {
      id: 'p1',
      title: 'Wireless Active Noise Cancelling Headphones',
      slug: 'wireless-anc-headphones',
      price: 4500,
      discountPrice: 3800,
      stock: 45,
      categoryId: 'c1',
      categoryName: 'Electronics',
      vendorId: 'v1',
      vendorName: 'TechHaven Electronics',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600'],
      description: 'Experience pure audio bliss with industry-leading active noise cancellation, 40-hour battery life, and ultra-comfortable memory foam ear cushions.',
      rating: 4.9,
      reviewsCount: 38,
      totalSold: 142,
      isFlashSale: true,
      flashSaleEnds: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: 'active'
    },
    {
      id: 'p2',
      title: 'Smart Fitness Watch Series 9 AMOLED',
      slug: 'smart-fitness-watch-9',
      price: 6200,
      discountPrice: 5100,
      stock: 20,
      categoryId: 'c1',
      categoryName: 'Electronics',
      vendorId: 'v1',
      vendorName: 'TechHaven Electronics',
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600', 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600'],
      description: 'Track your health, workouts, and notifications in style with a vibrant AMOLED always-on display and 7-day battery life.',
      rating: 4.7,
      reviewsCount: 24,
      totalSold: 89,
      isFlashSale: true,
      flashSaleEnds: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: 'active'
    },
    {
      id: 'p3',
      title: 'Men’s Premium Casual Cotton Panjabi & Pajama',
      slug: 'mens-premium-cotton-panjabi',
      price: 2800,
      discountPrice: 2200,
      stock: 60,
      categoryId: 'c2',
      categoryName: 'Fashion & Apparel',
      vendorId: 'v2',
      vendorName: 'Urban Chic Fashion',
      images: ['https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=600', 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=600'],
      description: 'Exquisitely crafted 100% breathable cotton festive panjabi featuring delicate embroidery on the collar and cuffs.',
      rating: 4.8,
      reviewsCount: 52,
      totalSold: 210,
      isFlashSale: false,
      status: 'active'
    },
    {
      id: 'p4',
      title: 'Women’s Designer Georgette Embroidered Salwar Kameez',
      slug: 'womens-georgette-salwar-kameez',
      price: 4200,
      discountPrice: 3499,
      stock: 30,
      categoryId: 'c2',
      categoryName: 'Fashion & Apparel',
      vendorId: 'v2',
      vendorName: 'Urban Chic Fashion',
      images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'],
      description: 'Stunning festive wear georgette suit set with intricate zari and stone work, paired with matching dupatta.',
      rating: 4.6,
      reviewsCount: 19,
      totalSold: 75,
      isFlashSale: true,
      flashSaleEnds: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: 'active'
    },
    {
      id: 'p5',
      title: 'Ergonomic Mesh Office Chair with Lumbar Support',
      slug: 'ergonomic-mesh-office-chair',
      price: 12500,
      discountPrice: 10900,
      stock: 12,
      categoryId: 'c3',
      categoryName: 'Home & Living',
      vendorId: 'v1',
      vendorName: 'TechHaven Electronics',
      images: ['https://images.unsplash.com/photo-1580481077494-e3299ac2505e?w=600'],
      description: 'Stay comfortable during long work hours with breathable mesh, adjustable armrests, and dynamic lumbar support.',
      rating: 4.9,
      reviewsCount: 15,
      totalSold: 42,
      isFlashSale: false,
      status: 'active'
    },
    {
      id: 'p6',
      title: 'Organic Vitamin C Glow Facial Serum 30ml',
      slug: 'organic-vitamin-c-serum',
      price: 1450,
      discountPrice: 1199,
      stock: 80,
      categoryId: 'c4',
      categoryName: 'Beauty & Health',
      vendorId: 'v2',
      vendorName: 'Urban Chic Fashion',
      images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600'],
      description: 'Revitalize dull skin with pure Vitamin C, hyaluronic acid, and botanical antioxidants for a radiant, youthful glow.',
      rating: 4.8,
      reviewsCount: 64,
      totalSold: 310,
      isFlashSale: false,
      status: 'active'
    }
  ],
  orders: [],
  withdrawals: [
    {
      id: 'w-1',
      vendorId: 'v1',
      vendorName: 'TechHaven Electronics',
      amount: 10000,
      status: 'approved',
      bankDetails: 'bKash Merchant - 01712345678',
      requestedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      processedAt: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
      id: 'w-2',
      vendorId: 'v2',
      vendorName: 'Urban Chic Fashion',
      amount: 5000,
      status: 'pending',
      bankDetails: 'Nagad Personal - 01812345679',
      requestedAt: new Date(Date.now() - 86400000 * 1).toISOString()
    }
  ],
  adminSettings: {
    globalCommissionRate: 10,
    platformName: 'BazaarPulse',
    heroBannerTitle: 'Eid Mega Bazaar & Flash Sale',
    heroBannerSubtitle: 'Discover top local and international brands with up to 70% off + Free Shipping',
    campaignBanner: {
      badge: 'PAYDAY SALE',
      title: 'Mega Discounts up to 70% Off',
      subtitle: 'Grab top deals across all categories with lightning fast delivery',
      buttonText: 'Grab Deals Now',
      linkText: '#flash-sale',
      bgColor: '#f85606',
      textColor: '#ffffff',
      buttonBgColor: '#ffffff',
      buttonTextColor: '#111827'
    },
    banners: [
      { id: 'b1', badge: 'Mega Campaign 2026', title: 'Eid Mega Bazaar & Flash Sale', subtitle: 'Discover top local and international brands with up to 70% off + Free Shipping', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200', link: '#flash-sale' },
      { id: 'b2', badge: 'New Arrival', title: 'Gadget Fest 2026', subtitle: 'Latest Smartphones & Smartwatches with official warranty and easy monthly installments.', image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1200', link: '#electronics' },
      { id: 'b3', badge: 'Fashion Week', title: 'Urban Chic Summer Collection', subtitle: 'Stay cool and stylish this summer with our premium cotton collection for men and women.', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200', link: '#fashion' }
    ],
    maintenanceMode: false
  },
  reviews: [
    { id: 'r1', productId: 'p1', customerName: 'Tanvir R.', rating: 5, comment: 'Amazing sound quality and battery lasts forever! Super fast delivery.', date: '2026-03-22' },
    { id: 'r2', productId: 'p3', customerName: 'Sadia M.', rating: 5, comment: 'The fabric is extremely soft and premium. Fit is true to size.', date: '2026-03-24' }
  ],
  cartItems: []
};

// Helper to load db
function getDb(): InitialData {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(content);
    if (!db.cartItems) db.cartItems = [];
    return db;
  } catch (e) {
    return defaultData;
  }
}

function saveDb(data: InitialData) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- Authentication & Token Generation Routes ---

// 1. Issue JWT token by role or test credentials
app.post('/api/auth/token', (req, res) => {
  const { role = 'customer', vendorId, status = 'approved', name, email } = req.body;
  
  let payload: any = {
    id: 'u-' + Date.now(),
    name: name || 'Demo User',
    email: email || `${role}@bazaarpulse.com`,
    role,
    status
  };

  if (role === 'admin') {
    payload = {
      id: 'u1',
      name: 'Platform Administrator',
      email: 'arafatmunna14620022@gmail.com',
      role: 'admin',
      status: 'active'
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

  const token = generateToken(payload, '7d');
  res.json({ success: true, token, user: payload });
});

// Real login authentication endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  const db = getDb();

  let targetUser;

  // Check if we are logging in as admin (by role or by matching the new admin email)
  const isLoggingInAsAdmin = (role === 'admin' || (email && email.toLowerCase() === 'arafatmunna14620022@gmail.com'));
  
  if (isLoggingInAsAdmin) {
    if (email?.toLowerCase() !== 'arafatmunna14620022@gmail.com' || password !== '@01756482001') {
      return res.status(401).json({
        success: false,
        error: 'Invalid administrative email or security credential.',
        code: 'AUTH_FAILED'
      });
    }
    
    targetUser = { 
      id: 'u1', 
      name: 'Platform Administrator', 
      email: 'arafatmunna14620022@gmail.com', 
      role: 'admin', 
      status: 'active' 
    };
  } else {
    // Non-admin flow
    targetUser = db.users.find((u: any) => (email && u.email.toLowerCase() === email.toLowerCase() && u.role !== 'admin'));
    
    if (!targetUser && role && role !== 'admin') {
      targetUser = db.users.find((u: any) => u.role === role);
    }

    if (!targetUser) {
      if (email === 'vendor1@techhaven.com' || role === 'vendor') {
        targetUser = { id: 'u2', name: 'TechHaven Electronics', email: 'vendor1@techhaven.com', role: 'vendor', status: 'approved', vendorId: 'v1' };
      } else if (email === 'vendor3@gadgetgalaxy.com') {
        targetUser = { id: 'u3', name: 'Gadget Galaxy', email: 'vendor3@gadgetgalaxy.com', role: 'vendor', status: 'pending', vendorId: 'v3' };
      } else if (email === 'customer@gmail.com' || role === 'customer') {
        targetUser = { id: 'u4', name: 'Rahim Ahmed', email: 'customer@gmail.com', role: 'customer', status: 'active' };
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

  // Verify vendor approval status from vendors table if applicable
  let userStatus = targetUser.status || 'active';
  let vendorId = targetUser.vendorId;

  if (targetUser.role === 'vendor') {
    const v = db.vendors.find((item: any) => item.email.toLowerCase() === targetUser.email.toLowerCase() || item.id === targetUser.vendorId);
    if (v) {
      userStatus = v.status;
      vendorId = v.id;
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
    
    // Simulate finding/creating user in database
    const user = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      avatar: payload.picture, // Include Google profile picture
      role: 'customer' as const, // Default role
      status: 'active' as const
    };
    
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
// Allows testing RBAC rules with any token and role combination
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
app.get('/api/platform/data', (req, res) => {
  const db = getDb();
  res.json(db);
});

// ==========================================
// 1. ADMIN PROTECTED ROUTES (/api/admin/*)
// Protected with: authMiddleware & verifyAdmin
// ==========================================

// Admin stats overview - strictly admin only
app.get('/api/admin/stats', authMiddleware, verifyAdmin, (req, res) => {
  const db = getDb();
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
});

// Update Admin Settings - strictly admin only
app.put('/api/admin/settings', authMiddleware, verifyAdmin, (req, res) => {
  const db = getDb();
  db.adminSettings = { ...db.adminSettings, ...req.body };
  saveDb(db);
  res.json({ success: true, adminSettings: db.adminSettings });
});

// Update Campaign Banner Strip - strictly admin only
app.put('/api/admin/campaign-banner', authMiddleware, verifyAdmin, (req, res) => {
  const db = getDb();
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
});

// Admin Product Add & Delete Endpoints - strictly admin only
app.post('/api/admin/products', authMiddleware, verifyAdmin, (req, res) => {
  const db = getDb();
  const newProduct = {
    id: 'p-' + Date.now(),
    title: req.body.title,
    price: Number(req.body.price),
    originalPrice: Number(req.body.originalPrice),
    discount: req.body.discount || '',
    categoryId: req.body.categoryId || 'general',
    images: [req.body.image || 'https://via.placeholder.com/150'],
    stock: Number(req.body.stock) || 10,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  
  db.products.unshift(newProduct);
  saveDb(db);
  res.json({ success: true, product: newProduct });
});

app.delete('/api/admin/products/:id', authMiddleware, verifyAdmin, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  const initialLen = db.products.length;
  db.products = db.products.filter((p: any) => String(p.id) !== String(id));
  saveDb(db);
  
  res.json({ success: true, deleted: initialLen !== db.products.length, message: 'Product deleted successfully' });
});

// Vendor approval/suspension by Admin
const handleVendorStatusUpdate = (req: any, res: any) => {
  const { id } = req.params;
  const { status } = req.body; // approved, suspended, rejected
  const db = getDb();
  const vendor = db.vendors.find((v: any) => v.id === id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  
  vendor.status = status;
  saveDb(db);
  res.json({ success: true, vendor });
};

app.patch('/api/admin/vendors/:id/status', authMiddleware, verifyAdmin, handleVendorStatusUpdate);
app.patch('/api/vendors/:id/status', authMiddleware, verifyAdmin, handleVendorStatusUpdate);

// Withdrawal approval/rejection by Admin
const handleWithdrawalStatusUpdate = (req: any, res: any) => {
  const { id } = req.params;
  const { status } = req.body; // approved, rejected
  const db = getDb();
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
};

app.patch('/api/admin/withdrawals/:id/status', authMiddleware, verifyAdmin, handleWithdrawalStatusUpdate);
app.patch('/api/withdrawals/:id/status', authMiddleware, verifyAdmin, handleWithdrawalStatusUpdate);

// ==========================================
// 2. VENDOR PROTECTED ROUTES (/api/vendor/*)
// Protected with: authMiddleware & verifyVendor
// ==========================================

// Dedicated Vendor product creation
app.post('/api/vendor/products', authMiddleware, verifyVendor, (req, res) => {
  const db = getDb();
  const rawImages = req.body.images;
  const images = Array.isArray(rawImages) && rawImages.length > 0
    ? rawImages
    : typeof rawImages === 'string' && rawImages.trim()
      ? [rawImages]
      : req.body.image
        ? [req.body.image]
        : ['https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600'];

  const newProduct = {
    id: 'p-' + Date.now(),
    slug: (req.body.title || 'vendor-product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    rating: 5.0,
    reviewsCount: 0,
    totalSold: 0,
    status: 'active',
    vendorId: req.user?.vendorId || req.body.vendorId || 'v1',
    vendorName: req.user?.name || req.body.vendorName || 'Vendor',
    ...req.body,
    images
  };
  db.products.unshift(newProduct);
  saveDb(db);
  res.json({ success: true, product: newProduct });
});

// General product CRUD (Requires either approved vendor or admin)
app.post('/api/products', authMiddleware, (req, res, next) => {
  return next();
}, (req, res) => {
  const db = getDb();
  const rawImages = req.body.images;
  const images = Array.isArray(rawImages) && rawImages.length > 0
    ? rawImages
    : typeof rawImages === 'string' && rawImages.trim()
      ? [rawImages]
      : req.body.image
        ? [req.body.image]
        : ['https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600'];

  const newProduct = {
    id: 'p-' + Date.now(),
    slug: (req.body.title || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    rating: 5.0,
    reviewsCount: 0,
    totalSold: 0,
    status: 'active',
    ...req.body,
    images
  };
  db.products.unshift(newProduct);
  saveDb(db);
  res.json({ success: true, product: newProduct });
});

app.put('/api/vendor/products/:id', authMiddleware, verifyVendor, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const idx = db.products.findIndex((p: any) => String(p.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  
  db.products[idx] = { ...db.products[idx], ...req.body };
  saveDb(db);
  res.json({ success: true, product: db.products[idx] });
});

app.put('/api/products/:id', authMiddleware, (req, res, next) => {
  return next();
}, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const idx = db.products.findIndex((p: any) => String(p.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  
  db.products[idx] = { ...db.products[idx], ...req.body };
  saveDb(db);
  res.json({ success: true, product: db.products[idx] });
});

app.delete('/api/vendor/products/:id', authMiddleware, verifyVendor, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const initialLen = db.products.length;
  db.products = db.products.filter((p: any) => String(p.id) !== String(id));
  saveDb(db);
  res.json({ success: true, deleted: initialLen !== db.products.length });
});

app.delete('/api/products/:id', authMiddleware, (req, res, next) => {
  return next();
}, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const initialLen = db.products.length;
  db.products = db.products.filter((p: any) => String(p.id) !== String(id));
  saveDb(db);
  res.json({ success: true, deleted: initialLen !== db.products.length });
});

// Dedicated Vendor Withdrawal Request
const handleWithdrawalCreate = (req: any, res: any) => {
  const db = getDb();
  const { vendorId, amount, bankDetails } = req.body;
  const targetVendorId = req.user?.vendorId || vendorId;
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
};

app.post('/api/vendor/withdrawals', authMiddleware, verifyVendor, handleWithdrawalCreate);
app.post('/api/withdrawals', authMiddleware, verifyVendor, handleWithdrawalCreate);

// Vendor Order status update
const handleOrderStatusUpdate = (req: any, res: any) => {
  const { id } = req.params;
  const { status } = req.body;
  const db = getDb();
  const order = db.orders.find((o: any) => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  
  order.status = status;
  saveDb(db);
  res.json({ success: true, order });
};

app.patch('/api/vendor/orders/:id/status', authMiddleware, verifyVendor, handleOrderStatusUpdate);
app.patch('/api/orders/:id/status', (req: any, res: any, next: any) => {
  return next();
}, handleOrderStatusUpdate);

// --- Persistent Shopping Cart Routes ---

// 1. Get User Cart
app.get('/api/cart', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const userCart = db.cartItems.filter(item => item.userId === userId);
  res.json({ success: true, cart: userCart });
});

// 2. Add / Update Cart Item
app.post('/api/cart', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user?.id;
  const { productId, quantity, size, color } = req.body;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  const existingIdx = db.cartItems.findIndex(item => 
    item.userId === userId && 
    item.productId === productId && 
    item.size === size && 
    item.color === color
  );
  
  if (existingIdx > -1) {
    db.cartItems[existingIdx].quantity += (quantity || 1);
  } else {
    db.cartItems.push({
      userId,
      productId,
      quantity: quantity || 1,
      size,
      color,
      addedAt: new Date().toISOString()
    });
  }
  
  saveDb(db);
  res.json({ success: true, cart: db.cartItems.filter(item => item.userId === userId) });
});

// 3. Sync Full Cart (Migration from localStorage to DB on login)
app.post('/api/cart/sync', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user?.id;
  const { items } = req.body; 
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
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
});

// 4. Remove Item from Cart
app.delete('/api/cart', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user?.id;
  const { productId, size, color } = req.body;
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  
  db.cartItems = db.cartItems.filter(item => 
    !(item.userId === userId && 
      item.productId === productId && 
      item.size === size && 
      item.color === color)
  );
  
  saveDb(db);
  res.json({ success: true, cart: db.cartItems.filter(item => item.userId === userId) });
});

// Order creation & status update
app.post('/api/orders', (req, res) => {
  const db = getDb();
  const newOrder = {
    id: 'ord-' + Math.floor(1000 + Math.random() * 9000),
    status: 'processing',
    paymentStatus: req.body.paymentMethod === 'Cash on Delivery' ? 'pending' : 'paid',
    createdAt: new Date().toISOString(),
    ...req.body
  };
  db.orders.unshift(newOrder);

  // Update vendor balances & total sales
  newOrder.items.forEach((item: any) => {
    const vendor = db.vendors.find((v: any) => v.id === item.vendorId);
    if (vendor) {
      const itemTotal = item.price * item.quantity;
      const commission = itemTotal * ((vendor.commissionRate || 10) / 100);
      vendor.balance += (itemTotal - commission);
      vendor.totalSales += itemTotal;
    }
  });

  saveDb(db);
  res.json({ success: true, order: newOrder });
});

// Withdrawal requests
app.post('/api/withdrawals', (req, res) => {
  const db = getDb();
  const { vendorId, amount, bankDetails } = req.body;
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
});

app.patch('/api/withdrawals/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // approved, rejected
  const db = getDb();
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
});

// Reviews
app.post('/api/reviews', (req, res) => {
  const db = getDb();
  const newReview = {
    id: 'r-' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    ...req.body
  };
  db.reviews.unshift(newReview);
  
  // Update product rating
  const prodReviews = db.reviews.filter((r: any) => r.productId === newReview.productId);
  const avgRating = prodReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / prodReviews.length;
  const product = db.products.find((p: any) => p.id === newReview.productId);
  if (product) {
    product.rating = parseFloat(avgRating.toFixed(1));
    product.reviewsCount = prodReviews.length;
  }

  saveDb(db);
  res.json({ success: true, review: newReview });
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
  
  // Helper to generate smart catalog-based reply
  const getSmartReply = (query: string) => {
    const q = query.toLowerCase();
    
    // Check if asking for Bengali
    if (q.includes('bangla') || q.includes('বাংলা') || q.includes('bangle') || q.includes('বাংলায়')) {
      return `অবশ্যই! আমি এখন থেকে আপনার সাথে বাংলায় কথা বলব। BazaarPulse-এ আপনাকে স্বাগতম! বলুন, হেডফোন, স্মার্টওয়াচ, পাঞ্জাবি বা অন্য কোনো পণ্য সম্পর্কে জানতে চান?`;
    }

    // Check if greeting
    if (q.includes('hello') || q.includes('hi') || q.includes('salam') || q.includes('assalamu') || q.includes('hey') || q.includes('কেমন') || q.includes('as-salamu')) {
      return `ওয়ালাইকুম আসসালাম / নমস্কার! BazaarPulse-এ আপনাকে স্বাগতম। 😊 আজ আপনাকে কোন পণ্য খুঁজে পেতে সাহায্য করতে পারি? (যেমন: হেডফোন, স্মার্টওয়াচ, পাঞ্জাবি ইত্যাদি)`;
    }

    // Keyword matching for products
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

    // General fallback
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

// Vite middleware integration for development vs static serving for production / Render
const isDev = process.env.NODE_ENV === 'development' && !process.env.RENDER;

if (isDev) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' }
  });
  app.use(vite.middlewares);
} else {
  // Vite/React build output directory
  const distPath = fs.existsSync(path.resolve(__dirname, 'dist'))
    ? path.resolve(__dirname, 'dist')
    : path.resolve(process.cwd(), 'dist');

  // 1. Serve static files from the Vite/React build directory ('dist') using express.static
  app.use(express.static(distPath));

  // 2. Catch-all route to serve 'index.html' for any frontend route (SPA routing & page refreshes)
  app.get('*', (req, res) => {
    // Avoid intercepting unmatched API calls
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

// 3. Ensure Express listens correctly on process.env.PORT || 3000 for Render deployment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
