/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { 
  ShoppingBag, Store, ShieldCheck, Search, ShoppingCart, Heart, User, 
  TrendingUp, DollarSign, Package, Users, CheckCircle, Clock, XCircle, 
  Sparkles, Bot, Send, ArrowRight, Star, Plus, Edit, Trash2, Check, AlertCircle,
  Menu, X, Filter, RefreshCw, ChevronRight, Settings, Layers, CreditCard,
  Truck, MapPin, Key, Lock, Shield, Terminal, Copy, CheckCheck,
  ShieldAlert, LogOut, LogIn, ExternalLink, ChevronDown, ShieldOff,
  Upload, Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, getActiveSupabase } from './lib/supabase';
import { ProductQuickView } from './components/ProductQuickView';
import AdminOrders from './components/AdminOrders';
import UserOrders from './components/UserOrders';
import AdminDashboard from '../AdminDashboard';

// Category slug mapping and safe helpers
const CATEGORY_SLUG_TO_ID: Record<string, string> = {
  'electronics': 'c1',
  'fashion': 'c2',
  'fashion-apparel': 'c2',
  'fashion & apparel': 'c2',
  'home-living': 'c3',
  'home': 'c3',
  'home & living': 'c3',
  'beauty': 'c4',
  'beauty-health': 'c4',
  'beauty & health': 'c4',
  'groceries': 'c5',
  'sports': 'c6',
  'sports-outdoors': 'c6',
  'sports & outdoors': 'c6'
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

const compressImageFile = async (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
};

export default function App() {
  // Global Auth State (Defaults to Customer Rahim Ahmed for realistic storefront browsing)
  const [authUser, setAuthUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('bazaarpulse_user');
      return saved ? JSON.parse(saved) : {
        id: 'u4',
        name: 'Rahim Ahmed',
        email: 'customer@gmail.com',
        role: 'customer',
        status: 'active'
      };
    } catch {
      return {
        id: 'u4',
        name: 'Rahim Ahmed',
        email: 'customer@gmail.com',
        role: 'customer',
        status: 'active'
      };
    }
  });

  const [authToken, setAuthToken] = useState<string>(() => {
    return localStorage.getItem('bazaarpulse_token') || '';
  });

  // Current Route Navigation: '/' (Storefront), '/vendor' (Vendor Dashboard), '/admin' (Admin Control), '/admin-dashboard' (Standalone Admin)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // Check both hash and pathname to support direct hits/refreshes on Render
    const hash = window.location.hash.replace('#', '');
    const pathname = window.location.pathname;

    if (hash === 'admin' || hash === 'vendor' || hash === 'admin/login' || hash === 'admin-dashboard') {
      return `/${hash}`;
    }
    if (pathname === '/admin' || pathname === '/vendor' || pathname === '/admin/login' || pathname === '/admin-dashboard') {
      return pathname;
    }
    return '/';
  });

  // Access Denied (403) Security Alert State
  const [accessDeniedAlert, setAccessDeniedAlert] = useState<{
    attemptedPath: string;
    reason: string;
    code: number;
    timestamp: string;
  } | null>(null);

  const [currentVendorId, setCurrentVendorId] = useState('v1');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'quick_roles' | 'security_test'>('login');
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Fetch initial data with full two-way merging
  const loadData = async () => {
    try {
      const res = await fetch('/api/platform/data');
      const json = await res.json();

      // Direct client-side Supabase sync to guarantee instant zero-delay updates
      if (supabase) {
        try {
          const { data: supaProducts, error: supaErr } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

          if (!supaErr && Array.isArray(supaProducts)) {
            const mapped = supaProducts.map((p: any) => {
              let resolvedImages: string[] = [];
              const parsedImages = parseJsonSafe(p.images, []);
              if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                resolvedImages = parsedImages.filter(Boolean);
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
                flashSaleEnds: p.flash_sale_ends,
                status: p.status || 'active',
                sizes: parseJsonSafe(p.sizes, []),
                colors: parseJsonSafe(p.colors, [])
              };
            });

            // Safe Merge: Supabase products + any products returned from /api/platform/data
            const supaMap = new Map<string, any>(mapped.map((p: any) => [String(p.id), p]));
            const backendProducts = Array.isArray(json?.products) ? json.products : [];
            const mergedList = [...mapped];
            
            backendProducts.forEach((bp: any) => {
              if (bp && bp.id && !supaMap.has(String(bp.id))) {
                mergedList.push({
                  ...bp,
                  categoryId: normalizeCategoryId(bp.categoryId, bp.categoryName)
                });
              }
            });

            json.products = mergedList;
          }
        } catch (supaEx) {
          console.warn('Client Supabase fetch note:', supaEx);
        }
      }

      // Ensure all products have normalized category IDs
      if (Array.isArray(json?.products)) {
        json.products = json.products.map((p: any) => ({
          ...p,
          categoryId: normalizeCategoryId(p.categoryId, p.categoryName)
        }));
      }

      setData(json);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load platform data', err);
      setLoading(false);
    }
  };

  const fetchAuthTokenForUser = async (userPayload: any) => {
    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: userPayload.role,
          status: userPayload.status,
          vendorId: userPayload.vendorId || currentVendorId,
          name: userPayload.name,
          email: userPayload.email
        })
      });
      const json = await res.json();
      if (json.token) {
        setAuthToken(json.token);
        localStorage.setItem('bazaarpulse_token', json.token);
      }
    } catch (e) {
      console.error('Failed to get token', e);
    }
  };

  useEffect(() => {
    loadData();

    const handleProductAdded = () => {
      console.log('supabase-product-added event received!');
      loadData();
    };
    window.addEventListener('supabase-product-added', handleProductAdded);

    // Enable Supabase Realtime for instant Home Page updates
    if (!supabase) {
      return () => {
        window.removeEventListener('supabase-product-added', handleProductAdded);
      };
    }

    const channel = supabase
      .channel('public-platform-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          console.log('Realtime product update received!');
          loadData(); // Re-fetch entire dataset to ensure consistency
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_settings' },
        () => {
          console.log('Realtime settings update received!');
          loadData();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('supabase-product-added', handleProductAdded);
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Sync token whenever auth user changes
  useEffect(() => {
    if (authUser) {
      localStorage.setItem('bazaarpulse_user', JSON.stringify(authUser));
      if (!authToken) {
        fetchAuthTokenForUser(authUser);
      }
    } else {
      localStorage.removeItem('bazaarpulse_user');
      localStorage.removeItem('bazaarpulse_token');
      setAuthToken('');
    }
  }, [authUser]);

  // Auto-redirect from /admin/login to /admin if already admin
  useEffect(() => {
    if (authUser?.role === 'admin' && currentPath === '/admin/login') {
      navigateTo('/admin');
    }
  }, [authUser, currentPath]);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  /**
   * Central Route Protection & Guard Function
   * Intercepts navigation attempts to protected routes (/admin, /vendor)
   * and blocks regular customers with a 403 Forbidden alert & redirection.
   */
  const navigateTo = (targetPath: string) => {
    // 1. Guard check for /admin removed (direct access allowed)

    // 2. Guard check for /vendor/*
    if (targetPath === '/vendor' || targetPath.startsWith('/vendor')) {
      if (!authUser) {
        setAccessDeniedAlert({
          attemptedPath: targetPath,
          reason: 'Vendor authentication required. Please sign in with an approved seller account.',
          code: 401,
          timestamp: new Date().toLocaleTimeString()
        });
        notify('⛔ 401 Unauthorized: Vendor login required.');
        setCurrentPath('/');
        window.location.hash = '';
        setIsAuthModalOpen(true);
        return;
      }

      if (authUser.role === 'customer') {
        setAccessDeniedAlert({
          attemptedPath: targetPath,
          reason: 'Access Denied (403): Regular customer accounts are strictly blocked from accessing the Vendor Dashboard. Please apply or sign in as an approved vendor.',
          code: 403,
          timestamp: new Date().toLocaleTimeString()
        });
        notify('⛔ 403 Forbidden: Access Denied. Customers cannot access Vendor Dashboard.');
        setCurrentPath('/');
        window.location.hash = '';
        return;
      }

      if (authUser.role === 'vendor' && authUser.status !== 'approved') {
        notify(`⏳ Note: Your vendor account is currently ${authUser.status}. Features are restricted until admin approval.`);
      }
    }

    // Access granted
    setAccessDeniedAlert(null);
    setCurrentPath(targetPath);
    
    // Use History API for clean URLs (no hash) to support Render refreshes
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ path: targetPath }, '', targetPath);
    }
    
    // Scroll to top on navigation
    window.scrollTo(0, 0);
  };

  // Listen to browser URL changes (back/forward and hash changes)
  useEffect(() => {
    const handleUrlChange = () => {
      const hash = window.location.hash.replace('#', '');
      const pathname = window.location.pathname;
      
      let targetPath = '/';
      
      // Prioritize pathname for clean URLs, fallback to hash for legacy links
      if (pathname === '/admin' || pathname === '/vendor' || pathname === '/admin/login') {
        targetPath = pathname;
      } else if (hash === 'admin' || hash === 'vendor' || hash === 'admin/login') {
        targetPath = `/${hash}`;
      }
      
      if (targetPath !== currentPath) {
        navigateTo(targetPath);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [authUser, currentPath]);

  const handleLoginUser = async (user: any, token: string) => {
    setAuthUser(user);
    setAuthToken(token);
    localStorage.setItem('bazaarpulse_user', JSON.stringify(user));
    localStorage.setItem('bazaarpulse_token', token);
    setIsAuthModalOpen(false);
    setAccessDeniedAlert(null);
    notify(`👋 Welcome back, ${user.name}! (Role: ${user.role})`);
    
    // Sync login info to Supabase automatically using the active dynamically resolved client
    const activeSupabase = getActiveSupabase();
    if (activeSupabase) {
      try {
        const { error } = await activeSupabase
          .from('user_logins')
          .upsert({
            id: user.id || String(user.email),
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            last_login: new Date().toISOString()
          });

        if (error) {
          console.error('Supabase Sync Error:', error);
          notify(`⚠️ Supabase Error: ${error.message}. Please make sure to run the SQL schema to create the 'user_logins' table in Supabase.`);
        } else {
          console.log('Successfully saved user login info to Supabase database!');
          notify('✅ Login info successfully saved to Supabase!');
        }
      } catch (err: any) {
        console.error('Supabase execution error:', err);
        notify(`❌ Supabase Sync failed: ${err.message || err}`);
      }
    } else {
      notify('⚠️ Supabase client is not initialized. Please check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.');
    }
    
    // Automatically route to appropriate view
    if (user.role === 'admin') {
      navigateTo('/admin');
    } else if (user.role === 'vendor') {
      navigateTo('/vendor');
    } else {
      navigateTo('/');
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    setAuthToken('');
    localStorage.removeItem('bazaarpulse_user');
    localStorage.removeItem('bazaarpulse_token');
    navigateTo('/');
    notify('👋 Logged out successfully. You are now browsing as a guest.');
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-medium tracking-wide">Loading BazaarPulse Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping"></div>
            <span className="text-sm font-medium">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 403 Forbidden Access Denied Alert Banner */}
      <AnimatePresence>
        {accessDeniedAlert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-950 border-b-2 border-red-500 text-white px-4 py-3 sticky top-0 z-50 shadow-2xl"
          >
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 text-white p-2 rounded-xl flex items-center justify-center animate-pulse">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold flex items-center gap-2 text-red-200">
                    <span className="bg-red-600/80 px-2 py-0.5 rounded text-[11px] font-mono uppercase">
                      HTTP {accessDeniedAlert.code} Forbidden
                    </span>
                    <span>Route Guard Intercepted: Attempted to access '{accessDeniedAlert.attemptedPath}'</span>
                  </div>
                  <p className="text-red-300 text-xs mt-0.5">
                    {accessDeniedAlert.reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-600"
                >
                  Switch / Login with Authorized Account
                </button>
                <button
                  onClick={() => setAccessDeniedAlert(null)}
                  className="text-red-400 hover:text-white p-1.5 rounded-lg hover:bg-red-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Protected Routes & Dynamic View Rendering */}
      {currentPath === '/' && (
        <CustomerView 
          data={data} 
          refreshData={loadData} 
          notify={notify}
          authUser={authUser}
          onOpenLogin={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          navigateTo={navigateTo}
        />
      )}

      {currentPath === '/vendor' && (
        <ProtectedRoute
          requiredRole="vendor"
          requireApprovedVendor={true}
          authUser={authUser}
          onNavigateHome={() => navigateTo('/')}
          onOpenLogin={() => setIsAuthModalOpen(true)}
        >
          <VendorDashboard 
            data={data} 
            currentVendorId={currentVendorId} 
            setCurrentVendorId={setCurrentVendorId} 
            refreshData={loadData} 
            notify={notify} 
            authToken={authToken}
            authUser={authUser}
            navigateTo={navigateTo}
            onLogout={handleLogout}
          />
        </ProtectedRoute>
      )}

      {currentPath === '/admin' && (
        <AdminControlCenter 
          data={data} 
          refreshData={loadData} 
          notify={notify} 
          authToken={authToken}
          authUser={authUser}
          navigateTo={navigateTo}
          onLogout={handleLogout}
        />
      )}

      {currentPath === '/admin-dashboard' && (
        <div>
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            <button 
              onClick={() => navigateTo('/')} 
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              ← Back to Storefront
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider hidden sm:inline">Direct Supabase Admin Mode</span>
              <button 
                onClick={() => navigateTo('/admin')} 
                className="text-xs font-bold text-slate-700 hover:text-black bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Go to Admin Control Center →
              </button>
            </div>
          </div>
          <AdminDashboard />
        </div>
      )}

      {currentPath === '/admin/login' && (
        <AdminLoginView 
          onLoginSuccess={handleLoginUser}
          onNavigateHome={() => navigateTo('/')}
          notify={notify}
        />
      )}

      {/* Auth & Role Switcher Modal */}
      {isAuthModalOpen && (
        <AuthModal
          authUser={authUser}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginUser={handleLoginUser}
          onSimulateRouteAttack={(attemptedPath: string) => {
            setIsAuthModalOpen(false);
            navigateTo(attemptedPath);
          }}
          notify={notify}
        />
      )}

      {/* RBAC Security Inspector Modal */}
      {isSecurityModalOpen && (
        <RbacSecurityConsoleModal
          authToken={authToken}
          authUser={authUser}
          onClose={() => setIsSecurityModalOpen(false)}
          onApplyToken={(token: string, user: any) => {
            setAuthToken(token);
            setAuthUser(user);
            localStorage.setItem('bazaarpulse_token', token);
            localStorage.setItem('bazaarpulse_user', JSON.stringify(user));
            notify(`🔐 Applied session token for role: ${user?.role}`);
          }}
          onTestRoute={(path: string) => {
            setIsSecurityModalOpen(false);
            navigateTo(path);
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

// ==========================================
// ADMIN LOGIN VIEW
// ==========================================
function AdminLoginView({ 
  onLoginSuccess, 
  onNavigateHome,
  notify 
}: { 
  onLoginSuccess: (user: any, token: string) => void;
  onNavigateHome: () => void;
  notify: (msg: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim(), role: 'admin' })
      });
      const json = await res.json();
      
      if (json.success && json.user.role === 'admin') {
        onLoginSuccess(json.user, json.token);
      } else {
        notify('⛔ Access Denied: Invalid admin credentials.');
      }
    } catch (err) {
      notify('⚠️ Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-600/20 rotate-3">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Admin Control Center</h2>
          <p className="text-slate-400 text-sm mt-2">Platform Governance & Security Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Administrative Email</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-orange-600 focus:ring-1 focus:ring-orange-600 transition-all"
                placeholder="Enter admin email address"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Security Credential</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3.5 pl-11 pr-4 text-sm focus:border-orange-600 focus:ring-1 focus:ring-orange-600 transition-all"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl shadow-orange-600/10 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" /> Authenticate & Access
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col gap-3">
          <button 
            onClick={onNavigateHome}
            className="text-slate-500 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Return to Public Storefront
          </button>
        </div>

        <div className="mt-6 bg-orange-950/30 border border-orange-900/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0" />
            <p className="text-[10px] text-orange-200/70 leading-relaxed font-medium">
              Access to this portal is restricted to authorized personnel. All login attempts are logged and monitored. Unauthorized access is strictly prohibited.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// HERO SLIDER COMPONENT
// ==========================================
function HeroSlider({ banners }: { banners: any[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

  if (!banners || banners.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 mt-4">
      <div className="relative rounded-2xl overflow-hidden h-[220px] md:h-[280px] shadow-lg bg-slate-900 group">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
          >
            {/* Background Image with Overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[10000ms] group-hover:scale-110" 
              style={{ backgroundImage: `url(${banners[current].image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/60 to-transparent" />
            </div>

            {/* Content */}
            <div className="relative h-full flex flex-col justify-center px-8 md:px-16 max-w-2xl text-white">
              <motion.span 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-[#f85606] text-white text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider w-fit"
              >
                {banners[current].badge || 'Exclusive Offer'}
              </motion.span>
              <motion.h1 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl md:text-3xl font-black mt-4 leading-tight tracking-tighter"
              >
                {banners[current].title}
              </motion.h1>
              <motion.p 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-200 mt-3 text-xs md:text-sm max-w-lg line-clamp-2 font-medium"
              >
                {banners[current].subtitle}
              </motion.p>
              <motion.div 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6"
              >
                <a 
                  href={banners[current].link || '#'} 
                  className="bg-[#f85606] hover:bg-[#e04d05] text-white font-bold px-8 py-2.5 rounded-xl shadow-xl transition-all inline-flex items-center gap-2 text-[11px] md:text-xs hover:scale-105 active:scale-95"
                >
                  Shop Now <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1 transition-all rounded-full ${current === i ? 'w-6 bg-[#f85606]' : 'w-1.5 bg-white/40 hover:bg-white/60'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Arrows */}
        {banners.length > 1 && (
          <>
            <button 
              onClick={() => setCurrent((prev) => (prev - 1 + banners.length) % banners.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <button 
              onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// ROUTE PROTECTION GUARD COMPONENT
// ==========================================
function ProtectedRoute({
  requiredRole,
  requireApprovedVendor = false,
  authUser,
  onNavigateHome,
  onOpenLogin,
  children
}: {
  requiredRole: 'admin' | 'vendor';
  requireApprovedVendor?: boolean;
  authUser: any;
  onNavigateHome: () => void;
  onOpenLogin: () => void;
  children: React.ReactNode;
}) {
  // Auto-redirect effect after 3.5 seconds if unauthorized
  useEffect(() => {
    if (!authUser || (requiredRole === 'admin' && authUser.role !== 'admin') || (requiredRole === 'vendor' && authUser.role === 'customer')) {
      const timer = setTimeout(() => {
        onNavigateHome();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [authUser, requiredRole]);

  // 1. Unauthenticated Guest
  if (!authUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-red-200 text-center"
        >
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-xs bg-red-100 text-red-700 font-mono font-bold px-3 py-1 rounded-full uppercase">
            HTTP 401 Unauthorized
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-3">Authentication Required</h2>
          <p className="text-sm text-slate-600 mt-2">
            You must be signed in with {requiredRole === 'admin' ? 'Administrator' : 'Vendor'} credentials to view this area.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={onOpenLogin}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow transition-all text-sm"
            >
              Sign In with Authorized Account
            </button>
            <button
              onClick={onNavigateHome}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all text-sm"
            >
              Return to Storefront
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. Customer Trying to Access Admin Panel (Strict 403 Forbidden)
  if (requiredRole === 'admin' && authUser.role !== 'admin') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-lg w-full bg-white rounded-3xl p-8 shadow-2xl border-2 border-red-500 text-center"
        >
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <span className="text-xs bg-red-600 text-white font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            HTTP 403 Forbidden • Access Denied
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-3">Admin Privileges Required</h2>
          <p className="text-sm text-slate-600 mt-2">
            Your current account (<span className="font-semibold text-slate-900">{authUser.email}</span>) holds the role of <span className="text-orange-600 font-extrabold uppercase">{authUser.role}</span>.
          </p>
          <div className="bg-red-50 text-red-800 text-xs p-3.5 rounded-xl border border-red-200 mt-4 text-left font-mono">
            <strong>Security Architecture Rule:</strong> verifyAdmin middleware strictly restricts `/admin/*` to administrative roles. Regular customers and standard vendors are permanently forbidden from accessing platform governance and financials.
          </div>
          <p className="text-xs text-slate-400 mt-3">Auto-redirecting back to storefront in 3 seconds...</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={onNavigateHome}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow transition-all text-sm"
            >
              Return to Homepage
            </button>
            <button
              onClick={onOpenLogin}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all text-xs"
            >
              Switch Account (Login as Admin)
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. Customer Trying to Access Vendor Dashboard (Strict 403 Forbidden)
  if (requiredRole === 'vendor') {
    if (authUser.role === 'customer') {
      return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-lg w-full bg-white rounded-3xl p-8 shadow-2xl border-2 border-amber-500 text-center"
          >
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8" />
            </div>
            <span className="text-xs bg-amber-500 text-white font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              HTTP 403 Forbidden • Access Denied
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-3">Vendor Portal Only</h2>
            <p className="text-sm text-slate-600 mt-2">
              Customer accounts cannot access the Vendor Dashboard. You must be an approved registered vendor to manage products and view payouts.
            </p>
            <p className="text-xs text-slate-400 mt-3">Auto-redirecting back to storefront in 3 seconds...</p>
            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <button
                onClick={onNavigateHome}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow transition-all text-sm"
              >
                Back to Shopping
              </button>
              <button
                onClick={onOpenLogin}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-all text-xs"
              >
                Sign In with Seller Account
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // Pending Vendor Notification Screen
    if (requireApprovedVendor && authUser.status !== 'approved') {
      return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-lg w-full bg-white rounded-3xl p-8 shadow-2xl border border-amber-300 text-center"
          >
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <span className="text-xs bg-amber-500 text-white font-mono font-bold px-3 py-1 rounded-full uppercase">
              Vendor Status: {authUser.status}
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-3">Store Pending Admin Review</h2>
            <p className="text-sm text-slate-600 mt-2">
              Your vendor application for <span className="font-bold">{authUser.name}</span> is currently <span className="text-amber-600 font-bold uppercase">{authUser.status}</span>. The platform administrator must review and approve your seller credentials before store management features are enabled.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onNavigateHome}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow transition-all text-sm"
              >
                Browse Storefront
              </button>
              <button
                onClick={onOpenLogin}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all text-sm"
              >
                Switch Account
              </button>
            </div>
          </motion.div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// ==========================================
// 1. CUSTOMER STOREFRONT VIEW
// ==========================================
function CustomerView({ 
  data, 
  refreshData, 
  notify, 
  authUser,
  onOpenLogin,
  onLogout,
  navigateTo 
}: { 
  data: any; 
  refreshData: () => void; 
  notify: (msg: string) => void; 
  authUser: any;
  onOpenLogin: () => void;
  onLogout: () => void;
  navigateTo: (path: string) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // My Orders & Tracking Modal States
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [trackOrderIdInput, setTrackOrderIdInput] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  
  // Initialize cart from localStorage for persistence
  const [cart, setCart] = useState<{ product: any; quantity: number; size?: string; color?: string; isSelected?: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem('bazaarpulse_cart');
      return saved ? JSON.parse(saved).map((i: any) => ({ ...i, isSelected: i.isSelected !== false })) : [];
    } catch {
      return [];
    }
  });

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bazaarpulse_cart', JSON.stringify(cart));
  }, [cart]);

  // Rokomari-inspired multi-selection & cart helpers
  const selectedItems = cart.filter(i => i.isSelected !== false);
  const selectedCount = selectedItems.length;
  const totalCartCount = cart.length;

  const originalTotal = cart.reduce((sum, i) => sum + (i.product.price || 0) * i.quantity, 0);
  const selectedOriginalTotal = selectedItems.reduce((sum, i) => sum + (i.product.price || 0) * i.quantity, 0);
  const selectedDiscountedTotal = selectedItems.reduce((sum, i) => sum + (i.product.discountPrice || i.product.price || 0) * i.quantity, 0);

  const toggleSelectAll = async (checked: boolean) => {
    setCart(prev => prev.map(i => ({ ...i, isSelected: checked })));
    if (authUser) {
      try {
        await fetch('/api/cart/select', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('bazaarpulse_token')}`
          },
          body: JSON.stringify({ selectAll: checked })
        });
      } catch (e) {}
    }
  };

  const toggleSelectItem = async (index: number) => {
    const item = cart[index];
    const newSelection = item.isSelected === false ? true : false;
    setCart(prev => prev.map((it, idx) => idx === index ? { ...it, isSelected: newSelection } : it));
    if (authUser && item?.product?.id) {
      try {
        await fetch('/api/cart/select', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('bazaarpulse_token')}`
          },
          body: JSON.stringify({ productId: item.product.id, isSelected: newSelection })
        });
      } catch (e) {}
    }
  };

  const updateQuantity = async (index: number, newQty: number) => {
    if (newQty < 1) return;
    const item = cart[index];
    const maxStock = item.product.stock || 100;
    if (newQty > maxStock) {
      notify(`⚠️ Only ${maxStock} pieces available in stock`);
      return;
    }

    if (authUser && item?.product?.id) {
      try {
        const res = await fetch('/api/cart/quantity', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('bazaarpulse_token')}`
          },
          body: JSON.stringify({ productId: item.product.id, quantity: newQty, size: item.size, color: item.color })
        });
        const json = await res.json();
        if (!json.success) {
          notify(`⚠️ ${json.message || 'Stock validation failed'}`);
          return;
        }
      } catch (e) {}
    }

    setCart(prev => prev.map((it, idx) => idx === index ? { ...it, quantity: newQty } : it));
  };

  const deleteSelectedItems = async () => {
    const toDelete = cart.filter(i => i.isSelected !== false);
    if (toDelete.length === 0) {
      notify('⚠️ Please select at least one item to delete');
      return;
    }
    if (!confirm('Are you sure you want to delete selected items from cart?')) return;
    
    const productIdsToDelete = toDelete.map(i => i.product.id);
    setCart(prev => prev.filter(i => i.isSelected === false));
    notify('🗑️ Selected items deleted from cart');

    if (authUser) {
      try {
        await fetch('/api/cart/batch', {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('bazaarpulse_token')}`
          },
          body: JSON.stringify({ productIds: productIdsToDelete })
        });
      } catch (e) {}
    }
  };

  const moveToWishlist = (item: any) => {
    notify(`❤️ Moved "${item.product.title.substring(0, 22)}..." to wishlist`);
    removeFromCart(item.product.id, item.size, item.color);
  };

  // Sync cart with database when user logs in
  useEffect(() => {
    if (authUser) {
      const syncCart = async () => {
        try {
          const res = await fetch('/api/cart/sync', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('bazaarpulse_token')}`
            },
            body: JSON.stringify({ 
              items: cart.map(i => ({
                productId: i.product.id,
                quantity: i.quantity,
                size: i.size,
                color: i.color
              }))
            })
          });
          const json = await res.json();
          if (json.success && Array.isArray(json.cart)) {
            // Map backend cart back to frontend structure (including product details)
            const syncedCart = json.cart.map((item: any) => {
              const product = data?.products?.find((p: any) => p.id === item.productId);
              return product ? { product, quantity: item.quantity, size: item.size, color: item.color } : null;
            }).filter(Boolean);
            
            setCart(syncedCart as any);
          }
        } catch (e) {
          console.error('Failed to sync cart with database', e);
        }
      };
      syncCart();
    }
  }, [authUser]);

  // Clear cart state and localStorage if no user is authenticated (guest session)
  useEffect(() => {
    if (!authUser) {
      setCart([]);
      localStorage.removeItem('bazaarpulse_cart');
    }
  }, [authUser]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState({ 
    name: authUser?.name || '', 
    phone: '', 
    district: '',
    area: '',
    houseRoad: '',
    paymentMethod: 'Cash on Delivery' 
  });
  
  // PDP Modal state
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productQty, setProductQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // AI Assistant Chat state
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([
    { sender: 'ai', text: 'Hello! I am your BazaarPulse AI shopping advisor. Looking for electronics, fashion deals, or help finding something specific?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const filteredProducts = (data?.products || []).filter((p: any) => {
    const normP = normalizeCategoryId(p.categoryId, p.categoryName);
    const matchesCat = selectedCategory === 'all' || normP === selectedCategory || p.categoryId === selectedCategory;
    const cleanQuery = searchQuery.toLowerCase().replace(/[,/#!$%\^&\*;:{}=\-_`~()?]/g, ' ').trim();
    const matchesSearch = !cleanQuery || 
      p.title?.toLowerCase().includes(cleanQuery) || 
      (p.categoryName && p.categoryName.toLowerCase().includes(cleanQuery)) ||
      (p.description && p.description.toLowerCase().includes(cleanQuery)) ||
      cleanQuery.split(/\s+/).some((word: string) => word.length > 1 && (p.title?.toLowerCase().includes(word) || (p.categoryName && p.categoryName.toLowerCase().includes(word))));
    const isActive = p.status === 'active' || !p.status || p.status === 'Active';
    return matchesCat && matchesSearch && isActive;
  });

  const addToCart = async (product: any, qty: number = 1, size?: string, color?: string) => {
    if (!authUser) {
      notify('⚠️ Please log in to add products to your cart!');
      onOpenLogin();
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => 
        item.product.id === product.id && 
        item.size === size && 
        item.color === color
      );
      if (existing) {
        return prev.map(item => 
          (item.product.id === product.id && item.size === size && item.color === color) 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { product, quantity: qty, size, color }];
    });

    // Sync with database if logged in
    if (authUser) {
      try {
        await fetch('/api/cart', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('bazaarpulse_token')}`
          },
          body: JSON.stringify({ productId: product.id, quantity: qty, size, color })
        });
      } catch (e) {
        console.error('Failed to sync add item to database', e);
      }
    }
  };

  const removeFromCart = async (productId: string, size?: string, color?: string) => {
    if (!productId) return;
    
    // 1. Update local state
    setCart(prev => (prev || []).filter(item => 
      !(item?.product?.id === productId && item?.size === size && item?.color === color)
    ));
    
    // 2. Sync with database if logged in
    if (authUser) {
      try {
        await fetch('/api/cart', {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('bazaarpulse_token')}`
          },
          body: JSON.stringify({ productId, size, color })
        });
      } catch (e) {
        console.error('Failed to remove item from database', e);
      }
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const items = cart.map(i => ({
      productId: i.product.id,
      title: i.product.title,
      price: i.product.discountPrice || i.product.price,
      quantity: i.quantity,
      size: i.size,
      color: i.color,
      vendorId: i.product.vendorId,
      vendorName: i.product.vendorName
    }));

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingFee = 150;

    const orderPayload = {
      customerId: authUser?.id || 'u4',
      customerName: shippingInfo.name || authUser?.name || 'Guest Customer',
      customerPhone: shippingInfo.phone,
      shippingAddress: `${shippingInfo.houseRoad}, ${shippingInfo.area}, ${shippingInfo.district}`,
      items,
      totalAmount: subtotal + shippingFee,
      shippingFee,
      paymentMethod: shippingInfo.paymentMethod
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const json = await res.json();
      if (json.success) {
        setOrderConfirmation(json.order);
        setIsCheckoutOpen(false);
        setIsCartOpen(false);
        refreshData();
      }
    } catch (err) {
      notify('Failed to place order');
    }
  };

  const sendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/shopping-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, productsContext: data.products })
      });
      const json = await res.json();
      setChatMessages(prev => [...prev, { sender: 'ai', text: json.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I am having trouble answering right now.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* 2. Main Header & Search Bar */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-[#f85606] font-black text-2xl tracking-tighter flex items-center gap-1 cursor-pointer" onClick={() => navigateTo('/')}>
              <ShoppingBag className="w-7 h-7" />
              <span>BazaarPulse</span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl flex items-center">
            <div className="w-full relative flex">
              <input
                type="text"
                placeholder="Search in BazaarPulse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg py-2.5 px-4 text-sm focus:outline-none focus:bg-white text-gray-900"
              />
              <button className="bg-[#f85606] hover:bg-[#e04d05] text-white px-6 rounded-r-lg flex items-center justify-center transition-colors">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-700 hover:text-[#f85606] transition-colors flex items-center gap-1"
            >
              <ShoppingCart className="w-7 h-7" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#f85606] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsAiOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Advisor</span>
            </button>

            {/* Profile / Account Action Button */}
            <div className="relative">
              {authUser ? (
                <div
                  className="flex items-center gap-2 p-1.5 rounded-full border border-slate-200 bg-white"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-orange-500/20 shadow-sm bg-slate-100 flex items-center justify-center">
                    {authUser.avatar ? (
                      <img src={authUser.avatar} alt={authUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="hidden md:flex flex-col items-start leading-tight pr-2">
                    <span className="text-[11px] font-black text-slate-900 truncate max-w-[120px]">{authUser.name}</span>
                    <div className="flex gap-2 items-center">
                      <span className="text-[9px] text-slate-500 truncate max-w-[80px]">{authUser.email}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-2 hover:bg-slate-100 p-1.5 rounded-full transition-all border border-slate-200 bg-white"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="hidden md:flex flex-col items-start leading-tight pr-2 text-left">
                    <span className="text-[11px] font-black text-slate-900">Guest User</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-tighter font-bold">Login / Sign Up</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 3. Hero Banner Slider Section */}
      <HeroSlider banners={data.adminSettings.banners} />

      {/* 4. Promotional Campaign Strip */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div 
          style={{ 
            backgroundColor: data.adminSettings.campaignBanner?.bgColor || '#f85606',
            color: data.adminSettings.campaignBanner?.textColor || '#ffffff'
          }}
          className="rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="bg-white text-[#f85606] font-black px-3 py-1 rounded-lg text-sm uppercase">
              {data.adminSettings.campaignBanner?.badge || 'PAYDAY SALE'}
            </span>
            <span className="font-bold text-sm md:text-base">
              {data.adminSettings.campaignBanner?.title || 'Mega Discounts up to 70% Off'} — <span className="font-normal opacity-90">{data.adminSettings.campaignBanner?.subtitle || 'Grab top deals across all categories'}</span>
            </span>
          </div>
          <a 
            href={data.adminSettings.campaignBanner?.linkText || '#products-section'} 
            style={{ 
              backgroundColor: data.adminSettings.campaignBanner?.buttonBgColor || '#ffffff',
              color: data.adminSettings.campaignBanner?.buttonTextColor || '#111827'
            }}
            className="font-bold px-4 py-2 rounded-lg text-xs shadow transition-colors flex items-center gap-1 hover:opacity-90"
          >
            {data.adminSettings.campaignBanner?.buttonText || 'Grab Deals'} <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#f85606]" /> Categories
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`p-4 rounded-xl border text-center transition-all bg-white shadow-sm ${
              selectedCategory === 'all' 
                ? 'border-[#f85606] ring-1 ring-[#f85606]' 
                : 'border-gray-200 hover:border-[#f85606]'
            }`}
          >
            <div className="font-semibold text-gray-900 text-sm">All Products</div>
            <div className="text-xs text-gray-500 mt-1">
              {(data?.products || []).filter((p: any) => p.status === 'active' || !p.status || p.status === 'Active').length} items
            </div>
          </button>
          {data.categories.map((cat: any) => {
            const activeCount = (data?.products || []).filter((p: any) => 
              (normalizeCategoryId(p.categoryId, p.categoryName) === cat.id || p.categoryId === cat.id) && 
              (p.status === 'active' || !p.status || p.status === 'Active')
            ).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-4 rounded-xl border text-center transition-all bg-white shadow-sm ${
                  selectedCategory === cat.id 
                    ? 'border-[#f85606] ring-1 ring-[#f85606]' 
                    : 'border-gray-200 hover:border-[#f85606]'
                }`}
              >
                <div className="font-semibold text-gray-900 text-sm truncate">{cat.name}</div>
                <div className="text-xs text-gray-500 mt-1">{activeCount} items</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      <div id="products-section" className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {selectedCategory === 'all' ? 'Just For You' : 'Category Products'}
          </h3>
          <span className="text-sm text-gray-500">{filteredProducts.length} items found</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="font-bold text-gray-800 text-lg">No products found</h4>
            <p className="text-sm text-gray-500 mt-1">Try searching for something else or change category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredProducts.map((product: any) => {
              const discountPercent = product.discountPrice 
                ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
                : 0;

              return (
                <div 
                  key={product.id} 
                  onClick={() => { setSelectedProduct(product); setProductQty(1); setActiveImageIdx(0); }}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group cursor-pointer"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    <img 
                      src={product.images?.[0] || product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} 
                      alt={product.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    {product.discountPrice && (
                      <div className="absolute top-2 left-2 z-10 w-12 h-12 flex flex-col items-center justify-center text-white font-bold leading-none select-none">
                        <div 
                          className="absolute inset-0 bg-[#e53e3e]"
                          style={{
                            clipPath: 'polygon(50% 0%, 61% 0.5%, 72% 3%, 82% 7%, 89% 12%, 95% 19%, 98% 27%, 99% 36%, 100% 50%, 99% 64%, 98% 73%, 95% 81%, 89% 88%, 82% 93%, 72% 97%, 61% 99%, 50% 100%, 39% 99%, 28% 97%, 18% 93%, 11% 88%, 5% 81%, 2% 73%, 1% 64%, 0% 50%, 1% 36%, 2% 27%, 5% 19%, 11% 12%, 18% 7%, 28% 3%, 39% 0.5%)'
                          }}
                        />
                        <div className="relative z-10 text-center">
                          <div className="text-sm">{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%</div>
                          <div className="text-[8px] uppercase">OFF</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-normal text-gray-900 text-sm line-clamp-2 group-hover:text-[#f85606] transition-colors leading-snug">
                        {product.title}
                      </h4>
                      <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                        <Store className="w-3 h-3" /> {product.vendorName}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <div>
                        <div className="text-[#f85606] font-bold text-lg">
                          ৳{product.discountPrice || product.price}
                        </div>
                        {product.discountPrice && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400 line-through">
                              ৳{product.price}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Optional sizes/colors preview inside product card */}
                      {((Array.isArray(product.sizes) && product.sizes.length > 0) || 
                        (Array.isArray(product.colors) && product.colors.length > 0)) && (
                        <div className="mt-2 space-y-1 text-[10px] text-gray-500 border-t border-dashed border-gray-100 pt-1.5">
                          {Array.isArray(product.sizes) && product.sizes.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="font-semibold text-gray-400">Sizes:</span>
                              <span className="text-gray-600 font-bold">{product.sizes.join(', ')}</span>
                            </div>
                          )}
                          {Array.isArray(product.colors) && product.colors.length > 0 && (
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="font-semibold text-gray-400">Colors:</span>
                              <span className="text-gray-600 font-bold">{product.colors.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-amber-500 text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-500" />
                          <span className="text-gray-600 font-medium">{product.rating}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-500 font-bold">Sold: {product.totalSold || 0}</span>
                          <span className={`text-[9px] font-black uppercase ${product.stock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {product.stock > 0 ? `${product.stock} In Stock` : 'Out of Stock'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        className="w-full mt-3 bg-gray-900 hover:bg-[#f85606] text-white font-medium py-2 rounded-lg text-xs transition-all shadow flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Drawer Modal - Rokomari Inspired Multi-Selection System */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900">
                <ShoppingCart className="w-5 h-5 text-orange-600" /> Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Promotional Banner (Conditionally Rendered based on Admin isActive setting) */}
            {data?.adminSettings?.cartBanner?.isActive === true && (
              <div className="bg-orange-50 border-b border-orange-100 p-2.5 px-4 text-xs text-orange-900 font-bold flex items-center justify-between">
                <span>📦 {data?.adminSettings?.cartBanner?.bannerText || '৯৯৯ টাকার ইসলামিক বই কিনলেই পাচ্ছেন ফ্রি ডেলিভারি'}</span>
                <span className="text-orange-600 underline cursor-pointer text-[11px]">{data?.adminSettings?.cartBanner?.termsText || 'শর্ত প্রযোজ্য'}</span>
              </div>
            )}

            {/* Master Select All Bar & Counter */}
            {cart.length > 0 && (
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <label className="flex items-center gap-2.5 text-xs font-extrabold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCount === totalCartCount && totalCartCount > 0}
                    onChange={e => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <span>Select All ({selectedCount}/{totalCartCount} Items)</span>
                </label>
                <button
                  onClick={deleteSelectedItems}
                  className="text-red-500 hover:text-red-700 text-xs font-extrabold flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete Selected
                </button>
              </div>
            )}

            {/* User & Total Summary Bar */}
            {cart.length > 0 && (
              <div className="px-4 py-2 bg-slate-900 text-white text-xs flex justify-between items-center font-bold">
                <span>{authUser?.name || 'Customer'}</span>
                <span>Your total: <span className="line-through text-slate-400 mr-1">৳{selectedOriginalTotal}</span> <span className="text-orange-400 font-black text-sm">৳{selectedDiscountedTotal}</span></span>
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-30 text-orange-500" />
                  <p className="font-bold text-slate-600">Your cart is empty</p>
                  <p className="text-xs text-slate-400 mt-1">Explore our store and add items to your cart</p>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const isChecked = item.isSelected !== false;
                  const itemStock = item.product.stock || 10;
                  const origPrice = item.product.price || 0;
                  const discPrice = item.product.discountPrice || origPrice;

                  return (
                    <div key={idx} className={`flex gap-3 p-3 rounded-xl border transition-all items-start ${isChecked ? 'bg-white border-orange-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-75'}`}>
                      {/* Item Checkbox */}
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectItem(idx)}
                        className="mt-2 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />

                      <img src={item.product?.images?.[0] || item.product?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-100 flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{item.product.title}</h4>
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.product.vendorName}</div>
                        
                        {/* Low stock warning */}
                        {itemStock <= 5 && (
                          <div className="text-[10px] text-red-500 font-extrabold mt-0.5">
                            ⚠️ Only {itemStock} pieces available
                          </div>
                        )}

                        {/* Pricing */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-orange-600 font-extrabold text-sm">৳{discPrice}</span>
                          {discPrice < origPrice && (
                            <span className="text-xs text-slate-400 line-through">৳{origPrice}</span>
                          )}
                        </div>

                        {(item.size || item.color) && (
                          <div className="flex gap-2 mt-1 text-[10px] font-bold">
                            {item.size && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Size: {item.size}</span>}
                            {item.color && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Color: {item.color}</span>}
                          </div>
                        )}

                        {/* Quantity Controls & Actions */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                            <button
                              onClick={() => updateQuantity(idx, item.quantity - 1)}
                              className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 text-xs font-black transition-colors"
                            >
                              -
                            </button>
                            <span className="px-3 text-xs font-extrabold text-slate-800">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(idx, item.quantity + 1)}
                              className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 text-xs font-black transition-colors"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => moveToWishlist(item)}
                              title="Move to Wishlist"
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => item?.product?.id && removeFromCart(item.product.id, item.size, item.color)}
                              title="Delete Item"
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Selected Subtotal ({selectedCount} items)</span>
                  <span className="font-bold">৳{selectedDiscountedTotal}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Shipping Fee</span>
                  <span className="font-bold">৳150</span>
                </div>
                <div className="flex justify-between text-base font-black border-t border-slate-200 pt-2 text-slate-900">
                  <span>Total Payable</span>
                  <span className="text-orange-600">৳{selectedCount > 0 ? selectedDiscountedTotal + 150 : 0}</span>
                </div>
                <button
                  onClick={() => {
                    if (selectedCount === 0) {
                      notify('⚠️ Please select at least one item to proceed to checkout');
                      return;
                    }
                    setIsCheckoutOpen(true);
                  }}
                  disabled={selectedCount === 0}
                  className="w-full mt-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black py-3.5 rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider"
                >
                  Proceed to Checkout ({selectedCount} Items)
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" /> Secure Checkout
              </h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahim Ahmed"
                    value={shippingInfo.name}
                    onChange={e => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 01700000000"
                    value={shippingInfo.phone}
                    onChange={e => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">District</label>
                  <select
                    required
                    value={shippingInfo.district}
                    onChange={e => setShippingInfo({ ...shippingInfo, district: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select District</option>
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chattogram">Chattogram</option>
                    <option value="Sylhet">Sylhet</option>
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Khulna">Khulna</option>
                    <option value="Barishal">Barishal</option>
                    <option value="Rangpur">Rangpur</option>
                    <option value="Mymensingh">Mymensingh</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Area / Thana</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Banani"
                    value={shippingInfo.area}
                    onChange={e => setShippingInfo({ ...shippingInfo, area: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">House / Road / Street</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. House 42, Road 11"
                  value={shippingInfo.houseRoad}
                  onChange={e => setShippingInfo({ ...shippingInfo, houseRoad: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {['Cash on Delivery', 'bKash', 'Nagad', 'Card'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: method })}
                      className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-1 transition-all ${
                        shippingInfo.paymentMethod === method 
                          ? 'border-orange-600 bg-orange-50 text-orange-600' 
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {method === 'Cash on Delivery' && <span className="text-[10px] uppercase opacity-60">COD</span>}
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                <div className="flex justify-between mb-4 text-lg font-black text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-orange-600">৳{cart.reduce((sum, i) => sum + (i.product.discountPrice || i.product.price) * i.quantity, 0) + 150}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white font-black py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    Place Order Now
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* AI Advisor Chat Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full h-[600px] shadow-2xl flex flex-col border border-slate-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6" />
                <div>
                  <h3 className="font-bold">BazaarPulse AI Shopping Assistant</h3>
                  <p className="text-xs text-purple-200">Powered by Gemini AI</p>
                </div>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-orange-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl text-sm border border-slate-200 shadow-sm flex items-center gap-2 text-slate-500">
                    <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce delay-100"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce delay-200"></div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={sendAiMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
              <input
                type="text"
                placeholder="Ask for gift ideas, best headphones, fashion..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-purple-500"
              />
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl transition-all shadow">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Daraz Product Details Page (PDP) Modal */}
      <ProductQuickView 
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        activeImageIdx={activeImageIdx}
        setActiveImageIdx={setActiveImageIdx}
        selectedSize={selectedSize}
        setSelectedSize={setSelectedSize}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        productQty={productQty}
        setProductQty={setProductQty}
        addToCart={(p: any, q: number, s: string, c: string) => {
          addToCart(p, q, s, c);
          setSelectedProduct(null);
          setIsCartOpen(true);
        }}
        notify={notify}
      />

      {/* Mobile Hamburger Menu Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
            />
            {/* Sidebar Content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-2xl flex flex-col"
            >
              {/* Sidebar Header with Profile Section */}
              <div className="p-6 bg-white border-b border-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <div className="text-orange-600 font-black text-xl tracking-tighter flex items-center gap-1">
                    <ShoppingBag className="w-6 h-6" />
                    <span>BazaarPulse</span>
                  </div>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Profile Section */}
                <div className="mt-4">
                  {authUser ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500/20 shadow-sm">
                          {authUser.avatar ? (
                            <img src={authUser.avatar} alt={authUser.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                              <User className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-900 truncate">{authUser.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{authUser.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onLogout();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all border border-red-100"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout Account</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-slate-500 font-medium">Welcome to BazaarPulse</p>
                      <button
                        onClick={() => {
                          onOpenLogin();
                          setIsMenuOpen(false);
                        }}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign In / Register</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Navigation Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <div className="px-3 py-2 text-[10px] font-black text-black uppercase tracking-widest">Main Menu</div>
                <button 
                  onClick={() => { navigateTo('/'); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-black hover:bg-slate-50 rounded-xl text-sm font-bold transition-all"
                >
                  <Search className="w-4 h-4 text-slate-400" />
                  <span>Home & Explore</span>
                </button>
                <button 
                  onClick={() => { setIsCartOpen(true); setIsMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-black hover:bg-slate-50 rounded-xl text-sm font-bold transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-4 h-4 text-slate-400" />
                    <span>My Shopping Cart</span>
                  </div>
                  {cart.length > 0 && (
                    <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">{cart.length}</span>
                  )}
                </button>

                <button 
                  onClick={() => { setIsMyOrdersOpen(true); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-black hover:bg-slate-50 rounded-xl text-sm font-bold transition-all"
                >
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>Track & View Orders</span>
                </button>
                
                <div className="pt-4 px-3 py-2 text-[10px] font-black text-black uppercase tracking-widest border-t border-slate-100 mt-2">Browse Categories</div>
                <div className="grid grid-cols-1 gap-1">
                  {data.categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                        selectedCategory === cat.id ? 'bg-orange-50 text-orange-600' : 'text-black hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedCategory === cat.id ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-slate-300'}`} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="p-3.5 border-t border-slate-100 bg-slate-50">
                <div className="flex items-center justify-center gap-2.5 opacity-30 grayscale pointer-events-none">
                  <div className="w-3 h-3 bg-slate-400 rounded-sm" />
                  <div className="w-3 h-3 bg-slate-400 rounded-sm" />
                  <div className="w-3 h-3 bg-slate-400 rounded-sm" />
                </div>
                <p className="text-center text-[9px] text-black font-bold mt-2">BazaarPulse v2.0 • 2026</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Order Confirmation Success Modal */}
      {orderConfirmation && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl border border-slate-200"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Order Confirmed!</h2>
            <p className="text-slate-600 mb-6 text-sm text-center">
              Thank you for shopping with BazaarPulse! Your order has been successfully placed and is now being processed.
            </p>
            
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Order ID</span>
                <span className="text-sm font-black text-orange-600">{orderConfirmation.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</span>
                <span className="text-sm font-black text-slate-900">৳{orderConfirmation.totalAmount}</span>
              </div>
            </div>

            <button
              onClick={() => setOrderConfirmation(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg"
            >
              Continue Shopping
            </button>
          </motion.div>
        </div>
      )}

      {/* Robust My Orders & Live Tracking Modal */}
      {isMyOrdersOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 text-slate-900"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">My Orders & Live Tracking</h3>
                  <p className="text-xs text-slate-500 font-medium">Track your packages & browse your order history</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsMyOrdersOpen(false);
                  setTrackedOrder(null);
                  setTrackOrderIdInput('');
                }} 
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tracker Input search box */}
              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 sm:p-5">
                <h4 className="text-xs font-black uppercase text-orange-800 mb-2.5 tracking-wider">Track any Order instantly</h4>
                <div className="flex gap-2.5 font-sans">
                  <input
                    type="text"
                    placeholder="Enter Order ID (e.g. ord-1234)..."
                    value={trackOrderIdInput}
                    onChange={e => setTrackOrderIdInput(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                  <button
                    onClick={() => {
                      const found = (data.orders || []).find((o: any) => o.id?.toLowerCase().trim() === trackOrderIdInput.toLowerCase().trim());
                      if (found) {
                        setTrackedOrder(found);
                      } else {
                        setTrackedOrder(null);
                        notify('❌ Order not found! Please check the ID and try again.');
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-3 rounded-xl shadow transition-colors text-sm flex items-center gap-1.5"
                  >
                    <Search className="w-4 h-4" />
                    <span>Track</span>
                  </button>
                </div>
              </div>

              {/* Tracked Order Progress Visual Tracker */}
              {trackedOrder && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-sm text-left">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracking Order</span>
                      <h4 className="font-extrabold text-base text-orange-600 font-mono">{trackedOrder.id}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Status</span>
                      <span className={`text-xs font-extrabold uppercase px-2.5 py-1 rounded-lg ${
                        trackedOrder.status === 'processing' || trackedOrder.status === 'pending'
                          ? 'bg-blue-100 text-blue-700'
                          : trackedOrder.status === 'shipped'
                          ? 'bg-purple-100 text-purple-700'
                          : trackedOrder.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {trackedOrder.status}
                      </span>
                    </div>
                  </div>

                  {/* Status Progress Stepper */}
                  {trackedOrder.status === 'cancelled' ? (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-center text-rose-700">
                      <p className="font-extrabold text-sm flex items-center justify-center gap-1.5">
                        🚫 This order was cancelled.
                      </p>
                      <p className="text-xs text-rose-600 mt-1 font-medium">Please contact our support for more information or place a new order.</p>
                    </div>
                  ) : (
                    <div className="relative py-4">
                      {/* Stepper Lines */}
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 w-[80%] h-0.5 bg-slate-100 -z-10 hidden sm:block" />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 sm:gap-4">
                        {/* Step 1: Order Placed */}
                        <div className="flex sm:flex-col items-center gap-3 sm:text-center">
                          <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black shadow-lg">
                            <Check className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900">Order Placed</p>
                            <p className="text-[10px] text-slate-400">Order confirmed successfully</p>
                          </div>
                        </div>

                        {/* Step 2: Processing */}
                        {(() => {
                          const active = ['processing', 'shipped', 'delivered'].includes(trackedOrder.status);
                          return (
                            <div className="flex sm:flex-col items-center gap-3 sm:text-center">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black shadow transition-all ${
                                active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {active ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />}
                              </div>
                              <div>
                                <p className={`font-bold text-xs ${active ? 'text-slate-900' : 'text-slate-400'}`}>Processing</p>
                                <p className="text-[10px] text-slate-400">Items being packaged</p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Step 3: Shipped */}
                        {(() => {
                          const active = ['shipped', 'delivered'].includes(trackedOrder.status);
                          return (
                            <div className="flex sm:flex-col items-center gap-3 sm:text-center">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black shadow transition-all ${
                                active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {active ? <Check className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className={`font-bold text-xs ${active ? 'text-slate-900' : 'text-slate-400'}`}>Shipped</p>
                                <p className="text-[10px] text-slate-400">In transit to your city</p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Step 4: Delivered */}
                        {(() => {
                          const active = trackedOrder.status === 'delivered';
                          return (
                            <div className="flex sm:flex-col items-center gap-3 sm:text-center">
                              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black shadow transition-all ${
                                active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {active ? <Check className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                              </div>
                              <div>
                                <p className={`font-bold text-xs ${active ? 'text-slate-900' : 'text-slate-400'}`}>Delivered</p>
                                <p className="text-[10px] text-slate-400">Package received safely</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Order Details summary */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3.5 text-left">
                    <div>
                      <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ordered Items</h5>
                      <div className="space-y-2 mt-1.5">
                        {(trackedOrder.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-slate-700 max-w-[80%] truncate">
                              <span className="font-extrabold text-slate-900 mr-1">×{item.quantity}</span> {item.title} 
                              {(item.size || item.color) && ` (${item.size || ''}${item.size && item.color ? ', ' : ''}${item.color || ''})`}
                            </span>
                            <span className="font-bold text-slate-900">৳{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Shipping Charge</span>
                      <span className="font-bold text-slate-900">৳{trackedOrder.shippingFee || 150}</span>
                    </div>

                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                      <span>Total Price</span>
                      <span className="text-orange-600">৳{trackedOrder.totalAmount}</span>
                    </div>

                    <div className="border-t border-slate-200 pt-2 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Deliver to:</span>
                        <p className="font-bold text-slate-800">{trackedOrder.customerName}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium leading-relaxed">{trackedOrder.shippingAddress}</p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Payment Method:</span>
                        <p className="font-bold text-slate-800">{trackedOrder.paymentMethod || 'Cash on Delivery'}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">
                          Status: <span className="text-orange-600 font-extrabold">{trackedOrder.paymentStatus || 'pending'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Past Order History Section (only if authenticated user) */}
              {authUser ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Your Order History</h4>
                  {(() => {
                    const myOrders = (data.orders || []).filter((o: any) => o.customerId === authUser.id);
                    if (myOrders.length === 0) {
                      return (
                        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs font-medium">
                          You haven't placed any orders yet. Place your first order today!
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {myOrders.map((o: any) => (
                          <div 
                            key={o.id} 
                            onClick={() => {
                              setTrackOrderIdInput(o.id);
                              setTrackedOrder(o);
                            }}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                              trackedOrder?.id === o.id 
                                ? 'bg-orange-50 border-orange-500/30' 
                                : 'bg-white hover:bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs font-mono text-slate-900">{o.id}</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                  o.status === 'processing' || o.status === 'pending'
                                    ? 'bg-blue-50 text-blue-600'
                                    : o.status === 'shipped'
                                    ? 'bg-purple-50 text-purple-600'
                                    : o.status === 'delivered'
                                    ? 'bg-emerald-50 text-emerald-600'
                                    : 'bg-rose-50 text-rose-600'
                                }`}>
                                  {o.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold mt-1 text-left">
                                {new Date(o.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })} • ৳{o.totalAmount}
                              </p>
                            </div>
                            <button className="text-orange-600 font-extrabold text-xs hover:underline flex items-center gap-0.5">
                              <span>Track Live</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center text-xs">
                  <p className="text-slate-500 font-bold">💡 Tip: Log in to save your orders to your account</p>
                  <button 
                    onClick={() => {
                      setIsMyOrdersOpen(false);
                      onOpenLogin();
                    }}
                    className="text-orange-600 font-black mt-1 hover:underline"
                  >
                    Click here to Sign In / Register
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                onClick={() => {
                  setIsMyOrdersOpen(false);
                  setTrackedOrder(null);
                  setTrackOrderIdInput('');
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow"
              >
                Close Tracking
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. VENDOR DASHBOARD VIEW
// ==========================================
function VendorDashboard({ 
  data, 
  currentVendorId, 
  setCurrentVendorId, 
  refreshData, 
  notify, 
  authToken = '', 
  authUser, 
  navigateTo, 
  onLogout 
}: { 
  data: any; 
  currentVendorId: string; 
  setCurrentVendorId: (id: string) => void; 
  refreshData: () => void; 
  notify: (msg: string) => void; 
  authToken?: string;
  authUser?: any;
  navigateTo?: (path: string) => void;
  onLogout?: () => void;
}) {
  const currentVendor = data.vendors?.find((v: any) => v.id === currentVendorId) || data.vendors?.[0] || { id: 'v1', storeName: 'Vendor Store', balance: 0, totalSales: 0 };
  const vendorProducts = (data.products || []).filter((p: any) => p.vendorId === currentVendor?.id);
  const vendorOrders = (data.orders || []).filter((o: any) => (o.items || []).some((i: any) => i.vendorId === currentVendor?.id));
  const vendorWithdrawals = (data.withdrawals || []).filter((w: any) => w.vendorId === currentVendor?.id);

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'payouts'>('overview');
  
  // New Product Modal & AI description generator
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    discountPrice: '',
    stock: '',
    categoryId: data.categories?.[0]?.id || '',
    images: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
    description: '',
    keyFeatures: ''
  });
  const [aiGenerating, setAiGenerating] = useState(false);

  // Withdrawal request amount
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  const handleGenerateAiDescription = async () => {
    if (!newProduct.title) {
      notify('Please enter a product title first');
      return;
    }
    setAiGenerating(true);
    try {
      const cat = data.categories.find((c: any) => c.id === newProduct.categoryId)?.name || 'General';
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProduct.title, categoryName: cat, keyFeatures: newProduct.keyFeatures })
      });
      const json = await res.json();
      if (json.description) {
        setNewProduct(prev => ({ ...prev, description: json.description }));
        notify('✨ AI generated professional product description!');
      }
    } catch (err) {
      notify('AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = data.categories.find((c: any) => c.id === newProduct.categoryId);

    const payload = {
      title: newProduct.title,
      price: parseFloat(newProduct.price),
      discountPrice: newProduct.discountPrice ? parseFloat(newProduct.discountPrice) : null,
      stock: parseInt(newProduct.stock) || 10,
      categoryId: newProduct.categoryId,
      categoryName: cat ? cat.name : 'General',
      vendorId: currentVendor.id,
      vendorName: currentVendor.storeName,
      images: [newProduct.images],
      description: newProduct.description
    };

    try {
      const res = await fetch('/api/vendor/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }
      if (json.success) {
        notify('🚀 Product created successfully!');
        setIsProductModalOpen(false);
        refreshData();
      }
    } catch (err) {
      notify('Failed to create product');
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (amt <= 0 || amt > currentVendor.balance) {
      notify('Invalid withdrawal amount or insufficient balance');
      return;
    }

    try {
      const res = await fetch('/api/vendor/withdrawals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ vendorId: currentVendor.id, amount: amt, bankDetails })
      });
      const json = await res.json();
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }
      if (json.success) {
        notify('💸 Withdrawal request submitted to admin!');
        setWithdrawAmount('');
        setBankDetails('');
        refreshData();
      }
    } catch (err) {
      notify('Failed to request withdrawal');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }
      notify('Order status updated');
      refreshData();
    } catch (err) {
      notify('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Vendor Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-[41px] z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={currentVendor.logo} alt="" className="w-12 h-12 rounded-xl object-cover border" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-slate-900">{currentVendor.storeName}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  currentVendor.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {currentVendor.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500">Commission Rate: {currentVendor.commissionRate}% • Balance: ৳{currentVendor.balance}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Switch Store:</span>
            <select
              value={currentVendorId}
              onChange={e => setCurrentVendorId(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
            >
              {data.vendors.map((v: any) => (
                <option key={v.id} value={v.id}>{v.storeName} ({v.status})</option>
              ))}
            </select>

            {navigateTo && (
              <button
                onClick={() => navigateTo('/')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-all shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                <span>Storefront</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-200 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'overview' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            📊 Analytics & Earnings
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'products' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            📦 Products ({vendorProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'orders' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            📋 Orders ({vendorOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'payouts' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            💰 Payouts & Withdrawals
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Available Balance</div>
                <div className="text-3xl font-extrabold text-emerald-600 mt-2">৳{currentVendor.balance}</div>
                <div className="text-xs text-slate-400 mt-1">Ready for withdrawal</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Total Lifetime Sales</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-2">৳{currentVendor.totalSales}</div>
                <div className="text-xs text-slate-400 mt-1">Across all orders</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Active Products</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-2">{vendorProducts.length}</div>
                <div className="text-xs text-slate-400 mt-1">Listed in store</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Store Rating</div>
                <div className="text-3xl font-extrabold text-amber-500 mt-2 flex items-center gap-1">
                  <Star className="w-6 h-6 fill-amber-500" /> {currentVendor.rating || '5.0'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Based on buyer reviews</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-3">Vendor Guidelines & Commission Policy</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Welcome to BazaarPulse multi-vendor portal. As a verified vendor, you keep {100 - currentVendor.commissionRate}% of every sale. 
                Platform commission is automatically deducted upon order settlement. You can request payouts anytime once your balance exceeds ৳1,000.
              </p>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Your Store Products</h3>
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Add New Product
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {vendorProducts.map((p: any) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <img src={p.images?.[0] || p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />
                    <h4 className="font-bold text-slate-900 line-clamp-1">{p.title}</h4>
                    <div className="text-orange-600 font-extrabold text-sm mt-1">৳{p.discountPrice || p.price} <span className="text-xs text-slate-400 font-normal">Stock: {p.stock}</span></div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">{p.categoryName}</span>
                    <span className="text-emerald-600 font-bold">Sold: {p.totalSold}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-bold mb-4">Customer Orders for Your Store</h3>
            {vendorOrders.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border text-slate-400">
                No orders received yet.
              </div>
            ) : (
              vendorOrders.map((ord: any) => (
                <div key={ord.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{ord.id}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ord.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Customer: <span className="font-medium text-slate-800">{ord.customerName}</span> ({ord.customerPhone})</div>
                    <div className="text-xs text-slate-400 mt-0.5">Address: {ord.shippingAddress}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Payment: {ord.paymentMethod}</div>
                      <div className="font-extrabold text-orange-600 text-lg">৳{ord.totalAmount}</div>
                    </div>
                    <select
                      value={ord.status}
                      onChange={e => updateOrderStatus(ord.id, e.target.value)}
                      className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    >
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm md:col-span-1">
              <h3 className="font-bold text-lg mb-4">Request Withdrawal</h3>
              <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Amount (BDT)</label>
                  <input
                    type="number"
                    required
                    max={currentVendor.balance}
                    placeholder={`Max ৳${currentVendor.balance}`}
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Bank / Mobile Wallet Details</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bKash Merchant 01712..."
                    value={bankDetails}
                    onChange={e => setBankDetails(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow transition-all"
                >
                  Submit Payout Request
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm md:col-span-2">
              <h3 className="font-bold text-lg mb-4">Payout History</h3>
              <div className="space-y-3">
                {vendorWithdrawals.length === 0 ? (
                  <p className="text-slate-400 text-sm">No payout requests submitted.</p>
                ) : (
                  vendorWithdrawals.map((w: any) => (
                    <div key={w.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">৳{w.amount}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{w.bankDetails}</div>
                        <div className="text-[10px] text-slate-400 mt-1">Requested: {w.requestedAt ? w.requestedAt.split('T')[0] : 'N/A'}</div>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                        w.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        w.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {w.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal with AI Generator */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" /> Add New Store Product
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Product Title</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wireless Mechanical Gaming Keyboard"
                    value={newProduct.title}
                    onChange={e => setNewProduct({ ...newProduct, title: e.target.value })}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={aiGenerating}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all shrink-0"
                  >
                    <Sparkles className="w-4 h-4" /> {aiGenerating ? 'Generating...' : 'AI Writer'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Regular Price (৳)</label>
                  <input
                    type="number"
                    required
                    value={newProduct.price}
                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Discount Price (৳)</label>
                  <input
                    type="number"
                    value={newProduct.discountPrice}
                    onChange={e => setNewProduct({ ...newProduct, discountPrice: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock}
                    onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Category</label>
                  <select
                    value={newProduct.categoryId}
                    onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  >
                    {data.categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  value={newProduct.images}
                  onChange={e => setNewProduct({ ...newProduct, images: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Key Features (for AI Writer)</label>
                <input
                  type="text"
                  placeholder="RGB backlit, blue switches, 2.4G wireless..."
                  value={newProduct.keyFeatures}
                  onChange={e => setNewProduct({ ...newProduct, keyFeatures: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow"
                >
                  Publish Product
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. ADMIN CONTROL CENTER VIEW
// ==========================================
function AdminControlCenter({ 
  data, 
  refreshData, 
  notify, 
  authToken = '', 
  authUser, 
  navigateTo, 
  onLogout 
}: { 
  data: any; 
  refreshData: () => void; 
  notify: (msg: string) => void; 
  authToken?: string;
  authUser?: any;
  navigateTo?: (path: string) => void;
  onLogout?: () => void;
}) {
  const [adminTab, setAdminTab] = useState<'overview' | 'vendors' | 'withdrawals' | 'products' | 'settings' | 'orders'>('overview');
  const [adminOrderSearch, setAdminOrderSearch] = useState('');
  const [adminOrderStatusFilter, setAdminOrderStatusFilter] = useState<'all' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [expandedAdminOrderId, setExpandedAdminOrderId] = useState<string | null>(null);
  const [isBannerActive, setIsBannerActive] = useState<boolean>(Boolean(data?.adminSettings?.cartBanner?.isActive));

  useEffect(() => {
    if (data?.adminSettings?.cartBanner?.isActive !== undefined) {
      setIsBannerActive(Boolean(data.adminSettings.cartBanner.isActive));
    }
  }, [data?.adminSettings?.cartBanner?.isActive]);
  
  const [newAdminProduct, setNewAdminProduct] = useState({
    title: '',
    price: '',
    discountPrice: '',
    stock: '',
    image: '',
    galleryImages: [] as string[],
    categoryId: data.categories?.[0]?.id || 'c1',
    sizes: [] as string[],
    colors: [] as string[]
  });
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [customSizesText, setCustomSizesText] = useState('');
  const [customColorsText, setCustomColorsText] = useState('');

  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);

  // Helper to upload a single image to Supabase Storage with graceful fallback
  const uploadProductImageFile = async (file: File): Promise<string> => {
    try {
      if (supabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (!uploadErr && uploadData) {
          const { data: pubData } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          if (pubData?.publicUrl) return pubData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Storage upload note, compressing to data URL:', err);
    }

    return await compressImageFile(file);
  };

  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMain(true);
    try {
      const url = await uploadProductImageFile(file);
      setNewAdminProduct(prev => ({ ...prev, image: url }));
      notify('✅ Main product image uploaded!');
    } catch (err: any) {
      notify('❌ Failed to upload main image: ' + err.message);
    } finally {
      setUploadingMain(false);
    }
  };

  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 8 - newAdminProduct.galleryImages.length;
    if (remainingSlots <= 0) {
      notify('⚠️ Maximum 8 gallery images allowed.');
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      notify(`ℹ️ Maximum 8 gallery photos. Uploading first ${remainingSlots} photo(s).`);
    }

    setUploadingGallery(true);
    try {
      const uploadPromises = filesToUpload.map(f => uploadProductImageFile(f));
      const uploadedUrls = await Promise.all(uploadPromises);

      setNewAdminProduct(prev => ({
        ...prev,
        galleryImages: [...prev.galleryImages, ...uploadedUrls]
      }));
      notify(`✅ Uploaded ${uploadedUrls.length} gallery image(s)!`);
    } catch (err: any) {
      notify('❌ Error uploading gallery images: ' + err.message);
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
    setNewAdminProduct(prev => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Stats calculation
  const totalGMV = (data?.orders || []).reduce((sum: number, o: any) => sum + o.totalAmount, 0);
  const totalCommission = Math.round(totalGMV * ((data?.adminSettings?.globalCommissionRate || 10) / 100));
  const activeVendorsCount = (data?.vendors || []).filter((v: any) => v.status === 'approved').length;
  const pendingVendorsCount = (data?.vendors || []).filter((v: any) => v.status === 'pending').length;

  const handleVendorStatus = async (vendorId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }
      notify(`Vendor status updated to ${status}`);
      refreshData();
    } catch (err) {
      notify('Failed to update vendor status');
    }
  };

  const handleWithdrawalStatus = async (withdrawalId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }
      notify(`Withdrawal request ${status}`);
      refreshData();
    } catch (err) {
      notify('Failed to update withdrawal');
    }
  };

  const handleAddAdminProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const allImages = [newAdminProduct.image, ...newAdminProduct.galleryImages].filter(Boolean);
      const priceVal = Number(newAdminProduct.price);
      const discVal = newAdminProduct.discountPrice ? Number(newAdminProduct.discountPrice) : null;
      const stockVal = Number(newAdminProduct.stock) || 0;
      const selectedCat = data?.categories?.find((c: any) => c.id === newAdminProduct.categoryId);
      const normCatId = normalizeCategoryId(newAdminProduct.categoryId, selectedCat?.name);
      const newId = 'p-' + Date.now();
      const slug = (newAdminProduct.title || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-') || ('product-' + Date.now());

      const productPayload = {
        id: newId,
        title: newAdminProduct.title,
        slug: slug,
        price: priceVal,
        current_price: priceVal,
        currentPrice: priceVal,
        discount_price: discVal,
        discountPrice: discVal,
        stock: stockVal,
        stock_quantity: stockVal,
        stockQuantity: stockVal,
        category_id: normCatId,
        categoryId: normCatId,
        category_name: selectedCat?.name || 'General',
        categoryName: selectedCat?.name || 'General',
        image_url: newAdminProduct.image || allImages[0] || '',
        imageUrl: newAdminProduct.image || allImages[0] || '',
        images: allImages.length > 0 ? allImages : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'],
        gallery_images: newAdminProduct.galleryImages,
        galleryImages: newAdminProduct.galleryImages,
        sizes: newAdminProduct.sizes,
        colors: newAdminProduct.colors,
        status: 'active',
        vendor_id: 'v1',
        vendor_name: 'Platform Administrator',
        vendorId: 'v1',
        vendorName: 'Platform Administrator'
      };

      // 1. Direct Supabase Client Upsert
      let supaOk = false;
      let supaErrDetail = '';
      if (supabase) {
        try {
          const { error: supaErr } = await supabase
            .from('products')
            .upsert([
              {
                id: productPayload.id,
                title: productPayload.title,
                slug: productPayload.slug,
                price: productPayload.price,
                current_price: productPayload.current_price,
                discount_price: productPayload.discount_price,
                stock: productPayload.stock,
                stock_quantity: productPayload.stock_quantity,
                category_id: normCatId,
                category_name: productPayload.category_name,
                image_url: productPayload.image_url,
                images: productPayload.images,
                gallery_images: productPayload.gallery_images,
                sizes: productPayload.sizes,
                colors: productPayload.colors,
                status: 'active',
                vendor_id: 'v1',
                vendor_name: 'Platform Administrator'
              }
            ], { onConflict: 'id' });
          if (!supaErr) {
            supaOk = true;
          } else {
            supaErrDetail = supaErr.message;
            console.warn('Direct Supabase insert note:', supaErr.message);
          }
        } catch (supaEx: any) {
          supaErrDetail = supaEx.message;
          console.warn('Direct Supabase insert error:', supaEx);
        }
      }

      // 2. Also call backend endpoint to guarantee state consistency (with fallback to /api/sync/product)
      let backendOk = false;
      try {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
          },
          body: JSON.stringify(productPayload)
        });
        const json = await res.json();
        if (json.success) {
          backendOk = true;
        } else {
          // Fallback sync to guarantee backend saves
          const fallbackRes = await fetch('/api/sync/product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productPayload)
          });
          const fbJson = await fallbackRes.json();
          if (fbJson.success) backendOk = true;
        }
      } catch (backendEx) {
        try {
          const fallbackRes = await fetch('/api/sync/product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productPayload)
          });
          const fbJson = await fallbackRes.json();
          if (fbJson.success) backendOk = true;
        } catch (e) {}
      }

      if (!supaOk && !backendOk) {
        throw new Error(supaErrDetail || 'Failed to save product to database.');
      }

      notify('🎉 Product published & synced with Supabase successfully!');
      setNewAdminProduct({ 
        title: '', 
        price: '', 
        discountPrice: '', 
        stock: '', 
        image: '', 
        galleryImages: [],
        categoryId: data?.categories?.[0]?.id || 'c1',
        sizes: [],
        colors: []
      });
      if (mainImageInputRef.current) mainImageInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      setCustomSizesText('');
      setCustomColorsText('');
      refreshData();
    } catch (err: any) {
      notify('Failed to add product: ' + err.message);
    }
  };

  const handleUpdateAdminProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      // 1. Supabase client update
      if (supabase) {
        try {
          await supabase.from('products').upsert([{
            id: String(editingProduct.id),
            title: editingProduct.title,
            price: Number(editingProduct.price || 0),
            current_price: Number(editingProduct.price || 0),
            discount_price: editingProduct.discountPrice ? Number(editingProduct.discountPrice) : null,
            stock: Number(editingProduct.stock || 0),
            stock_quantity: Number(editingProduct.stock || 0),
            category_id: normalizeCategoryId(editingProduct.categoryId, editingProduct.categoryName),
            category_name: editingProduct.categoryName || 'General',
            image_url: (editingProduct.images && editingProduct.images[0]) || editingProduct.image || '',
            images: editingProduct.images || [],
            gallery_images: editingProduct.galleryImages || [],
            sizes: editingProduct.sizes || [],
            colors: editingProduct.colors || [],
            description: editingProduct.description || '',
            status: editingProduct.status || 'active'
          }], { onConflict: 'id' });
        } catch (supaErr) {}
      }

      // 2. Backend update
      const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify(editingProduct)
      });
      const json = await res.json();
      if (!json.success && (res.status === 403 || res.status === 401)) {
        await fetch('/api/sync/product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingProduct)
        });
      }
      notify('✅ Product updated successfully!');
      setEditingProduct(null);
      refreshData();
    } catch (err) {
      notify('Failed to update product');
    }
  };

  const handleDeleteAdminProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      // Delete from Supabase client
      if (supabase) {
        try {
          await supabase.from('products').delete().eq('id', String(productId));
        } catch (e) {}
      }

      // Delete from backend
      await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });
      
      notify('🗑️ Product deleted successfully!');
      refreshData();
    } catch (err) {
      console.error('Delete product error:', err);
      notify('Failed to delete product');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2.5 rounded-xl text-white font-black text-lg">🛡️</div>
            <div>
              <h2 className="font-extrabold text-xl tracking-tight text-white">BazaarPulse Admin Control Center</h2>
              <p className="text-xs text-slate-400 font-medium">Platform Governance & Financial Oversight</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigateTo && navigateTo('/admin-dashboard')}
              className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-3.5 py-2 rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer"
            >
              <span>📦</span>
              <span>Open AdminDashboard.tsx View</span>
            </button>
            <div className="text-xs bg-slate-800 text-slate-300 px-3.5 py-2 rounded-xl border border-slate-700 self-start sm:self-auto shadow-inner">
              Commission Rate: <span className="font-extrabold text-orange-400 text-sm ml-1">{data.adminSettings.globalCommissionRate}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs with proper vertical margin and structure */}
      <div className="max-w-7xl mx-auto px-4 mt-10 sm:mt-12">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
          <button
            onClick={() => setAdminTab('overview')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              adminTab === 'overview' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            📈 Platform Overview
          </button>
          <button
            onClick={() => setAdminTab('vendors')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              adminTab === 'vendors' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            🏪 Vendor Approvals ({pendingVendorsCount} pending)
          </button>
          <button
            onClick={() => setAdminTab('withdrawals')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              adminTab === 'withdrawals' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            💸 Payout Requests
          </button>
          <button
            onClick={() => setAdminTab('products')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              adminTab === 'products' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            📦 Manage Products
          </button>
          <button
            onClick={() => setAdminTab('settings')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              adminTab === 'settings' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⚙️ Platform Settings
          </button>
          <button
            onClick={() => setAdminTab('orders')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              adminTab === 'orders' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            📋 Orders History
          </button>
        </div>

        {/* Products Tab */}
        {adminTab === 'products' && (
          <div className="mt-6 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-2xl">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" /> Add New Store Product
              </h3>
              <form onSubmit={handleAddAdminProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smart LED TV 43 inch"
                    value={newAdminProduct.title}
                    onChange={e => setNewAdminProduct({ ...newAdminProduct, title: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Current Price (৳) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 24000"
                      value={newAdminProduct.price}
                      onChange={e => setNewAdminProduct({ ...newAdminProduct, price: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Discount Price (৳)</label>
                    <input
                      type="number"
                      placeholder="e.g. 19999 (Special offer)"
                      value={newAdminProduct.discountPrice}
                      onChange={e => setNewAdminProduct({ ...newAdminProduct, discountPrice: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Optional discounted sale price</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 25"
                      value={newAdminProduct.stock}
                      onChange={e => setNewAdminProduct({ ...newAdminProduct, stock: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Category *</label>
                    <select
                      value={newAdminProduct.categoryId}
                      onChange={e => setNewAdminProduct({ ...newAdminProduct, categoryId: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white outline-none"
                    >
                      {data.categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Main Product Image with Device File Picker & URL */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold uppercase text-slate-700">Main Product Image *</label>
                  
                  <div className="flex items-center gap-2">
                    <input
                      ref={mainImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleMainImageChange}
                      className="hidden"
                      id="admin-main-file-input"
                    />
                    <label
                      htmlFor="admin-main-file-input"
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5 text-orange-600" />
                      <span>{uploadingMain ? 'Uploading...' : 'Choose from Device'}</span>
                    </label>
                    <span className="text-xs text-slate-400">or enter image URL:</span>
                  </div>

                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={newAdminProduct.image}
                    onChange={e => setNewAdminProduct({ ...newAdminProduct, image: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                  />

                  {newAdminProduct.image && (
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200">
                      <img src={newAdminProduct.image} alt="Main Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                      <span className="text-xs text-emerald-600 font-bold">✓ Main image uploaded & ready</span>
                    </div>
                  )}
                </div>

                {/* Multiple Gallery Image Upload: Device File Picker (Up to 8 Images) */}
                <div className="bg-orange-50/60 p-4 rounded-xl border border-orange-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold uppercase text-orange-950">
                        Additional Gallery Photos (Max 8)
                      </label>
                      <p className="text-[11px] text-orange-800/80">
                        Select multiple product photos from your phone or device gallery
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-md">
                      {newAdminProduct.galleryImages.length} / 8 Selected
                    </span>
                  </div>

                  {newAdminProduct.galleryImages.length < 8 && (
                    <div>
                      <input
                        ref={galleryInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleGalleryFilesChange}
                        disabled={uploadingGallery}
                        className="hidden"
                        id="admin-gallery-file-input"
                      />
                      <label
                        htmlFor="admin-gallery-file-input"
                        className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-orange-200 rounded-xl bg-white hover:bg-orange-50/30 transition-all ${
                          uploadingGallery ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        }`}
                      >
                        <Upload className="w-6 h-6 text-orange-500 mb-1" />
                        <span className="text-xs font-bold text-slate-800">
                          {uploadingGallery ? 'Uploading Gallery Photos...' : 'Click to Pick Photos from Device / Gallery'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Select up to {8 - newAdminProduct.galleryImages.length} more images (JPG, PNG, WebP)
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Gallery Thumbnails Grid with Delete Buttons */}
                  {newAdminProduct.galleryImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {newAdminProduct.galleryImages.map((url, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-orange-200 bg-white aspect-square group shadow-sm">
                          <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(idx)}
                            title="Remove image"
                            className="absolute top-1 right-1 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs font-bold shadow transition-transform hover:scale-110"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Sizes Selection */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="block text-xs font-bold uppercase text-slate-700">Select Sizes (Optional)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['S', 'M', 'L', 'XL', 'XXL'].map(sz => {
                      const isSelected = newAdminProduct.sizes.includes(sz);
                      return (
                        <button
                          type="button"
                          key={sz}
                          onClick={() => {
                            const nextSizes = isSelected
                              ? newAdminProduct.sizes.filter(s => s !== sz)
                              : [...newAdminProduct.sizes, sz];
                            setNewAdminProduct({ ...newAdminProduct, sizes: nextSizes });
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                            isSelected 
                              ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1">
                    <input
                      type="text"
                      placeholder="Or type custom sizes (comma separated, e.g. 38, 40, 42)"
                      value={customSizesText}
                      onChange={e => {
                        setCustomSizesText(e.target.value);
                        const customVals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        const standardsSelected = newAdminProduct.sizes.filter(s => ['S', 'M', 'L', 'XL', 'XXL'].includes(s));
                        setNewAdminProduct({ ...newAdminProduct, sizes: [...standardsSelected, ...customVals] });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Optional Colors Selection */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <label className="block text-xs font-bold uppercase text-slate-700">Select Colors (Optional)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Black', 'White', 'Blue', 'Red'].map(col => {
                      const isSelected = newAdminProduct.colors.includes(col);
                      return (
                        <button
                          type="button"
                          key={col}
                          onClick={() => {
                            const nextColors = isSelected
                              ? newAdminProduct.colors.filter(c => c !== col)
                              : [...newAdminProduct.colors, col];
                            setNewAdminProduct({ ...newAdminProduct, colors: nextColors });
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                            isSelected 
                              ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {col}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1">
                    <input
                      type="text"
                      placeholder="Or type custom colors (comma separated, e.g. Green, Yellow, Orange)"
                      value={customColorsText}
                      onChange={e => {
                        setCustomColorsText(e.target.value);
                        const customVals = e.target.value.split(',').map(c => c.trim()).filter(Boolean);
                        const standardsSelected = newAdminProduct.colors.filter(c => ['Black', 'White', 'Blue', 'Red'].includes(c));
                        setNewAdminProduct({ ...newAdminProduct, colors: [...standardsSelected, ...customVals] });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploadingMain || uploadingGallery}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3.5 rounded-xl shadow-lg transition-all text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  <span>{uploadingMain || uploadingGallery ? 'Uploading Media Files...' : 'Publish Product to Store'}</span>
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4">All Current Store Products ({data.products.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {data.products.map((p: any) => (
                  <div key={p.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <img src={p.images?.[0] || p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
                      <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{p.title}</h4>
                      <div className="text-xs text-orange-600 font-bold mt-1">৳{p.discountPrice || p.price} <span className="text-gray-400 font-normal">Stock: {p.stock}</span></div>
                      <div className="text-[11px] text-slate-500 mt-1">Store: {p.vendorName}</div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setEditingProduct({
                          ...p,
                          image: p.images?.[0] || p.image || '',
                          originalPrice: p.discountPrice || p.originalPrice || ''
                        })}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-lg text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAdminProduct(p.id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit Product Modal */}
            <AnimatePresence>
              {editingProduct && (
                <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
                  >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                      <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                        <Edit className="w-6 h-6 text-orange-600" /> Edit Store Product
                      </h3>
                      <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                      </button>
                    </div>

                    <form onSubmit={handleUpdateAdminProduct} className="p-6 space-y-5">
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-500 mb-1.5 ml-1">Product Title</label>
                        <input
                          type="text"
                          required
                          value={editingProduct.title}
                          onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-black uppercase text-slate-500 mb-1.5 ml-1">Current Price (৳)</label>
                          <input
                            type="number"
                            required
                            value={editingProduct.price}
                            onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase text-slate-500 mb-1.5 ml-1">Discount Price (৳)</label>
                          <input
                            type="number"
                            value={editingProduct.originalPrice}
                            onChange={e => setEditingProduct({ ...editingProduct, originalPrice: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-black uppercase text-slate-500 mb-1.5 ml-1">Stock Quantity</label>
                          <input
                            type="number"
                            required
                            value={editingProduct.stock}
                            onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase text-slate-500 mb-1.5 ml-1">Category</label>
                          <select
                            value={editingProduct.categoryId}
                            onChange={e => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                          >
                            {data.categories.map((c: any) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase text-slate-500 mb-1.5 ml-1">Product Description</label>
                        <textarea
                          value={editingProduct.description || ''}
                          onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase text-slate-500 mb-1.5 ml-1">Product Image URL</label>
                        <input
                          type="url"
                          required
                          value={editingProduct.image}
                          onChange={e => setEditingProduct({ ...editingProduct, image: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                        />
                      </div>

                      <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(null)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl text-xs uppercase transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl text-xs uppercase shadow-xl transition-all hover:scale-[1.01]"
                        >
                          Save Product Changes
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Overview Tab */}
        {adminTab === 'overview' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Total Platform GMV</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-2">৳{totalGMV}</div>
                <div className="text-xs text-slate-400 mt-1">Gross merchandise volume</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Platform Commission Earned</div>
                <div className="text-3xl font-extrabold text-orange-600 mt-2">৳{totalCommission}</div>
                <div className="text-xs text-slate-400 mt-1">Platform revenue share</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Active Vendors</div>
                <div className="text-3xl font-extrabold text-emerald-600 mt-2">{activeVendorsCount}</div>
                <div className="text-xs text-slate-400 mt-1">Verified store owners</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Total Orders</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-2">{data.orders.length}</div>
                <div className="text-xs text-slate-400 mt-1">Processed securely</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-4">Recent Platform Orders</h3>
                <div className="space-y-3">
                  {data.orders.slice(0, 5).map((o: any) => (
                    <div key={o.id} className="p-3 bg-slate-50 rounded-xl border flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold">{o.id}</span> • {o.customerName}
                        <div className="text-xs text-slate-500">{o.items.length} items • ৳{o.totalAmount}</div>
                      </div>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">{o.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-4">Pending Vendor Applications</h3>
                <div className="space-y-3">
                  {data.vendors.filter((v: any) => v.status === 'pending').length === 0 ? (
                    <p className="text-slate-400 text-sm">No pending vendor applications.</p>
                  ) : (
                    data.vendors.filter((v: any) => v.status === 'pending').map((v: any) => (
                      <div key={v.id} className="p-4 bg-slate-50 rounded-xl border flex items-center justify-between">
                        <div>
                          <div className="font-bold">{v.storeName}</div>
                          <div className="text-xs text-slate-500">{v.ownerName} ({v.email})</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVendorStatus(v.id, 'approved')}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vendors Tab */}
        {adminTab === 'vendors' && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-bold mb-4">All Registered Vendors ({data.vendors.length})</h3>
            <div className="space-y-4">
              {data.vendors.map((v: any) => (
                <div key={v.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img src={v.logo} alt="" className="w-14 h-14 rounded-xl object-cover border" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg text-slate-900">{v.storeName}</h4>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          v.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          v.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {v.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Owner: {v.ownerName} ({v.email}) • Phone: {v.phone}</p>
                      <p className="text-xs text-slate-400 mt-1">Total Sales: ৳{v.totalSales} • Commission: {v.commissionRate}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {v.status !== 'approved' && (
                      <button
                        onClick={() => handleVendorStatus(v.id, 'approved')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
                      >
                        Approve
                      </button>
                    )}
                    {v.status !== 'suspended' && (
                      <button
                        onClick={() => handleVendorStatus(v.id, 'suspended')}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdrawals Tab */}
        {adminTab === 'withdrawals' && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-bold mb-4">Vendor Payout Requests</h3>
            <div className="space-y-4">
              {data.withdrawals.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border text-slate-400">
                  No withdrawal requests found.
                </div>
              ) : (
                data.withdrawals.map((w: any) => (
                  <div key={w.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-lg text-slate-900">{w.vendorName}</h4>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          w.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          w.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {w.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-orange-600 mt-1">Amount: ৳{w.amount}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Details: {w.bankDetails}</div>
                      <div className="text-[10px] text-slate-400 mt-1">Requested: {w.requestedAt ? w.requestedAt.split('T')[0] : 'N/A'}</div>
                    </div>

                    {w.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleWithdrawalStatus(w.id, 'approved')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
                        >
                          Approve Payout
                        </button>
                        <button
                          onClick={() => handleWithdrawalStatus(w.id, 'rejected')}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {adminTab === 'settings' && (
          <div className="mt-6 space-y-6 max-w-4xl">
            {/* Cart Promotional Banner Control Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-900">
                <Package className="w-5 h-5 text-[#f85606]" /> Cart Promotional Banner Control (Rokomari Style)
              </h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const bannerText = (form.elements.namedItem('bannerText') as HTMLInputElement).value;
                const termsText = (form.elements.namedItem('termsText') as HTMLInputElement).value;

                try {
                  const res = await fetch('/api/admin/banner', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({ isActive: isBannerActive, bannerText, termsText })
                  });
                  if (res.ok) {
                    notify('✅ Cart promotional banner settings updated successfully!');
                    refreshData();
                  } else {
                    notify('Failed to update banner settings');
                  }
                } catch (err) {
                  notify('Failed to update banner settings');
                }
              }} className="space-y-4">
                <div className="flex items-center justify-between bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">Promotional Banner Status</div>
                    <div className="text-xs text-slate-500">Toggle ON to show or OFF to hide the banner in cart drawer</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBannerActive(!isBannerActive)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none shadow-inner cursor-pointer ${
                      isBannerActive ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span className="sr-only">Toggle banner status</span>
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                        isBannerActive ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                    <span className={`absolute text-[10px] font-black uppercase ${isBannerActive ? 'left-2 text-white' : 'right-2 text-slate-700'}`}>
                      {isBannerActive ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">Banner Notice Text</label>
                  <input
                    type="text"
                    name="bannerText"
                    required
                    defaultValue={data.adminSettings?.cartBanner?.bannerText || '৯৯৯ টাকার ইসলামিক বই কিনলেই পাচ্ছেন ফ্রি ডেলিভারি'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">Terms & Conditions Link Text</label>
                  <input
                    type="text"
                    name="termsText"
                    required
                    defaultValue={data.adminSettings?.cartBanner?.termsText || 'শর্ত প্রযোজ্য'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:bg-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-black px-6 py-3 rounded-xl text-xs uppercase shadow transition-all cursor-pointer"
                >
                  Save Banner Changes
                </button>
              </form>
            </div>

            {/* Dynamic Hero Banners Management */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#f85606]" /> Dynamic Hero Banners (Max 10)
              </h3>
              
              <div className="space-y-6">
                {/* List of existing banners */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(data.adminSettings.banners || []).map((banner: any, idx: number) => (
                    <div key={banner.id} className="relative p-4 rounded-xl border border-slate-200 bg-slate-50 group overflow-hidden shadow-sm">
                      <img src={banner.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">Banner {idx + 1}</span>
                          <button 
                            onClick={async () => {
                              if (!confirm('Remove this banner from homepage?')) return;
                              const updatedBanners = data.adminSettings.banners.filter((b: any) => b.id !== banner.id);
                              try {
                                const res = await fetch('/api/admin/settings', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                                  body: JSON.stringify({ banners: updatedBanners })
                                });
                                if (res.ok) { notify('🗑️ Banner removed successfully!'); refreshData(); }
                              } catch (e) { notify('Failed to remove banner'); }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{banner.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{banner.subtitle}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 truncate flex-1">{banner.link}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Banner Form */}
                {(data.adminSettings.banners || []).length < 10 && (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-sm">
                        +
                      </div>
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Add New Hero Banner</h4>
                    </div>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const newBanner = {
                        id: 'b-' + Date.now(),
                        badge: (form.elements.namedItem('badge') as HTMLInputElement).value,
                        title: (form.elements.namedItem('title') as HTMLInputElement).value,
                        subtitle: (form.elements.namedItem('subtitle') as HTMLInputElement).value,
                        image: (form.elements.namedItem('image') as HTMLInputElement).value,
                        link: (form.elements.namedItem('link') as HTMLInputElement).value,
                      };
                      
                      const updatedBanners = [...(data.adminSettings.banners || []), newBanner];
                      try {
                        const res = await fetch('/api/admin/settings', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                          body: JSON.stringify({ banners: updatedBanners })
                        });
                        if (res.ok) { 
                          notify('✨ New banner published to homepage!'); 
                          form.reset();
                          refreshData(); 
                        }
                      } catch (e) { notify('Failed to add banner'); }
                    }} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Badge Text</label>
                          <input name="badge" placeholder="e.g. LIMITED TIME" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold shadow-sm focus:ring-2 focus:ring-orange-500 outline-none" required />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Button Link</label>
                          <input name="link" placeholder="e.g. #flash-sale" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold shadow-sm focus:ring-2 focus:ring-orange-500 outline-none" required />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Main Heading</label>
                        <input name="title" placeholder="e.g. Eid Mega Flash Sale 2026" className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold shadow-sm focus:ring-2 focus:ring-orange-500 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Description / Subtitle</label>
                        <textarea name="subtitle" placeholder="Enter short banner description..." className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold shadow-sm focus:ring-2 focus:ring-orange-500 outline-none" required rows={2}></textarea>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 ml-1">Background Image URL</label>
                        <input name="image" placeholder="https://images.unsplash.com/..." className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold shadow-sm focus:ring-2 focus:ring-orange-500 outline-none font-mono" required />
                      </div>
                      <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl text-xs uppercase shadow-xl transition-all hover:scale-[1.01] active:scale-95">
                        Publish Banner to Storefront
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4">Platform Commission Settings</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const newRate = parseFloat((e.currentTarget.elements.namedItem('commissionRate') as HTMLInputElement).value);
                
                try {
                  const res = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': authToken ? `Bearer ${authToken}` : ''
                    },
                    body: JSON.stringify({
                      globalCommissionRate: newRate
                    })
                  });
                  if (res.ok) {
                    notify('✅ Global commission updated!');
                    refreshData();
                  }
                } catch (err) {
                  notify('Failed to update settings');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Global Commission Rate (%)</label>
                  <input
                    name="commissionRate"
                    type="number"
                    defaultValue={data.adminSettings.globalCommissionRate}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm focus:bg-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl shadow transition-all text-sm"
                >
                  Save Commission Rate
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-4">📢 Promotional Campaign Strip Control</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const badge = (form.elements.namedItem('badge') as HTMLInputElement).value;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const subtitle = (form.elements.namedItem('subtitle') as HTMLInputElement).value;
                const buttonText = (form.elements.namedItem('buttonText') as HTMLInputElement).value;
                const linkText = (form.elements.namedItem('linkText') as HTMLInputElement).value;

                try {
                  const res = await fetch('/api/admin/campaign-banner', {
                    method: 'PUT',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': authToken ? `Bearer ${authToken}` : ''
                    },
                    body: JSON.stringify({ badge, title, subtitle, buttonText, linkText })
                  });
                  const json = await res.json();
                  if (res.status === 403 || res.status === 401) {
                    notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
                    return;
                  }
                  if (json.success) {
                    notify('✨ Campaign banner strip updated live!');
                    refreshData();
                  }
                } catch (err) {
                  notify('Failed to update campaign banner');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Badge Text (e.g. PAYDAY SALE)</label>
                  <input
                    name="badge"
                    type="text"
                    defaultValue={data.adminSettings.campaignBanner?.badge || 'PAYDAY SALE'}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Main Campaign Title</label>
                  <input
                    name="title"
                    type="text"
                    defaultValue={data.adminSettings.campaignBanner?.title || 'Mega Discounts up to 70% Off'}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Subtitle Message</label>
                  <input
                    name="subtitle"
                    type="text"
                    defaultValue={data.adminSettings.campaignBanner?.subtitle || 'Grab top deals across all categories'}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        name="bgColor"
                        type="color"
                        defaultValue={data.adminSettings.campaignBanner?.bgColor || '#f85606'}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-1 bg-white"
                      />
                      <input
                        name="bgColorText"
                        type="text"
                        defaultValue={data.adminSettings.campaignBanner?.bgColor || '#f85606'}
                        onChange={(e) => {
                          const input = e.currentTarget.form?.elements.namedItem('bgColor') as HTMLInputElement;
                          if (input) input.value = e.target.value;
                        }}
                        className="flex-1 bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        name="textColor"
                        type="color"
                        defaultValue={data.adminSettings.campaignBanner?.textColor || '#ffffff'}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-1 bg-white"
                      />
                      <input
                        name="textColorText"
                        type="text"
                        defaultValue={data.adminSettings.campaignBanner?.textColor || '#ffffff'}
                        onChange={(e) => {
                          const input = e.currentTarget.form?.elements.namedItem('textColor') as HTMLInputElement;
                          if (input) input.value = e.target.value;
                        }}
                        className="flex-1 bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Button BG Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        name="buttonBgColor"
                        type="color"
                        defaultValue={data.adminSettings.campaignBanner?.buttonBgColor || '#ffffff'}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-1 bg-white"
                      />
                      <input
                        name="buttonBgColorText"
                        type="text"
                        defaultValue={data.adminSettings.campaignBanner?.buttonBgColor || '#ffffff'}
                        onChange={(e) => {
                          const input = e.currentTarget.form?.elements.namedItem('buttonBgColor') as HTMLInputElement;
                          if (input) input.value = e.target.value;
                        }}
                        className="flex-1 bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Button Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        name="buttonTextColor"
                        type="color"
                        defaultValue={data.adminSettings.campaignBanner?.buttonTextColor || '#111827'}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-1 bg-white"
                      />
                      <input
                        name="buttonTextColorText"
                        type="text"
                        defaultValue={data.adminSettings.campaignBanner?.buttonTextColor || '#111827'}
                        onChange={(e) => {
                          const input = e.currentTarget.form?.elements.namedItem('buttonTextColor') as HTMLInputElement;
                          if (input) input.value = e.target.value;
                        }}
                        className="flex-1 bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Button Text</label>
                    <input
                      name="buttonText"
                      type="text"
                      defaultValue={data.adminSettings.campaignBanner?.buttonText || 'Grab Deals'}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Target Link / Anchor</label>
                    <input
                      name="linkText"
                      type="text"
                      defaultValue={data.adminSettings.campaignBanner?.linkText || '#products-section'}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  onClick={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget.form;
                    if (!form) return;
                    const badge = (form.elements.namedItem('badge') as HTMLInputElement).value;
                    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                    const subtitle = (form.elements.namedItem('subtitle') as HTMLInputElement).value;
                    const buttonText = (form.elements.namedItem('buttonText') as HTMLInputElement).value;
                    const linkText = (form.elements.namedItem('linkText') as HTMLInputElement).value;
                    const bgColor = (form.elements.namedItem('bgColor') as HTMLInputElement).value;
                    const textColor = (form.elements.namedItem('textColor') as HTMLInputElement).value;
                    const buttonBgColor = (form.elements.namedItem('buttonBgColor') as HTMLInputElement).value;
                    const buttonTextColor = (form.elements.namedItem('buttonTextColor') as HTMLInputElement).value;

                    try {
                      const res = await fetch('/api/admin/campaign-banner', {
                        method: 'PUT',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Authorization': authToken ? `Bearer ${authToken}` : ''
                        },
                        body: JSON.stringify({ badge, title, subtitle, buttonText, linkText, bgColor, textColor, buttonBgColor, buttonTextColor })
                      });
                      const json = await res.json();
                      if (res.status === 403 || res.status === 401) {
                        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
                        return;
                      }
                      if (json.success) {
                        notify('✨ Campaign banner colors & content updated live!');
                        refreshData();
                      }
                    } catch (err) {
                      notify('Failed to update campaign banner');
                    }
                  }}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl shadow transition-all text-sm"
                >
                  Publish Campaign Banner Live
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {adminTab === 'orders' && (
          <AdminOrders authToken={authToken} notify={notify} />
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3.5. AUTHENTICATION & ROLE ACCESS MODAL
// ==========================================
interface AuthModalProps {
  authUser: any;
  onClose: () => void;
  onLoginUser: (user: any, token: string) => void;
  onSimulateRouteAttack: (attemptedPath: string) => void;
  notify: (msg: string) => void;
}

function AuthModal({
  authUser,
  onClose,
  onLoginUser,
  onSimulateRouteAttack,
  notify
}: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom Supabase Client Connection Settings
  const [showDbConfig, setShowDbConfig] = useState(false);
  const [dbUrl, setDbUrl] = useState(() => localStorage.getItem('custom_supabase_url') || '');
  const [dbKey, setDbKey] = useState(() => localStorage.getItem('custom_supabase_key') || '');

  const handleSaveDbConfig = () => {
    if (!dbUrl.trim() || !dbKey.trim()) {
      notify('⚠️ Please provide both URL and Key');
      return;
    }
    localStorage.setItem('custom_supabase_url', dbUrl.trim());
    localStorage.setItem('custom_supabase_key', dbKey.trim());
    notify('🔌 Custom Supabase configuration saved! Reconnecting...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleClearDbConfig = () => {
    localStorage.removeItem('custom_supabase_url');
    localStorage.removeItem('custom_supabase_key');
    setDbUrl('');
    setDbKey('');
    notify('🔄 Supabase configuration reset to defaults! Reconnecting...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Google authentication failed');
        notify(`❌ Google Login Failed: ${data.error || 'Unknown error'}`);
      } else {
        onLoginUser(data.user, data.token);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error during Google login');
      notify('❌ Google Login failed due to network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-950 border border-slate-800 text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="relative border-b border-slate-900 pb-5 mb-5 text-center">
          <div className="inline-flex items-center justify-center gap-2 mb-4 bg-white px-4 py-2 rounded-xl shadow-sm">
            <div className="text-orange-600">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-orange-600 tracking-tighter">BazaarPulse</h1>
          </div>
          <h3 className="font-extrabold text-lg text-white mt-1">Sign In</h3>
          <p className="text-xs text-slate-400 mt-0.5">Use Google to sign in</p>
          <button 
            onClick={onClose}
            className="absolute top-0 right-0 text-slate-500 hover:text-white p-2 rounded-xl hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5">
          {errorMessage && (
            <div className="bg-red-950/70 border border-red-500/50 text-red-200 p-3 rounded-xl text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <GoogleLogin 
            onSuccess={handleGoogleSuccess}
            onError={() => notify('Google Login failed')}
            theme="filled_black"
            width="100%"
          />
        </div>

        {/* Custom Supabase DB Settings Panel */}
        <div className="mt-6 pt-5 border-t border-slate-900">
          <button 
            onClick={() => setShowDbConfig(!showDbConfig)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white font-bold transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-orange-500 animate-spin" />
              Connect your own Supabase DB
            </span>
            <span>{showDbConfig ? '▼' : '▶'}</span>
          </button>
          
          {showDbConfig && (
            <div className="mt-3 space-y-3 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-800 text-left">
              <p className="text-[10px] text-slate-400 leading-relaxed mb-1">
                If logins are not saving, paste your own Supabase project credentials below to connect your personal database instantly!
              </p>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Supabase URL</label>
                <input 
                  type="text" 
                  value={dbUrl} 
                  onChange={(e) => setDbUrl(e.target.value)}
                  placeholder="https://your-project-id.supabase.co" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Anon / Publishable Key</label>
                <input 
                  type="password" 
                  value={dbKey} 
                  onChange={(e) => setDbKey(e.target.value)}
                  placeholder="Paste anon publishable key here" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500 text-white font-mono"
                />
              </div>
              <button 
                onClick={handleSaveDbConfig}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-black py-2 rounded-lg transition-colors shadow-md cursor-pointer"
              >
                Save & Connect My DB
              </button>
              {localStorage.getItem('custom_supabase_url') && (
                <button 
                  onClick={handleClearDbConfig}
                  className="w-full bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 text-[10px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Reset to Default Platform DB
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// 4. RBAC & JWT SECURITY CONSOLE MODAL
// ==========================================
function RbacSecurityConsoleModal({
  authToken,
  authUser,
  onClose,
  onApplyToken,
  onTestRoute,
  notify
}: {
  authToken: string;
  authUser: any;
  onClose: () => void;
  onApplyToken: (token: string, user: any) => void;
  onTestRoute?: (path: string) => void;
  notify: (msg: string) => void;
}) {
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Quick switch token presets
  const handleQuickSwitch = async (role: string, status: string = 'approved', vendorId?: string) => {
    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, status, vendorId })
      });
      const data = await res.json();
      if (data.token) {
        onApplyToken(data.token, data.user);
      }
    } catch (e) {
      notify('Failed to switch token');
    }
  };

  const handleSimulateTamperedToken = () => {
    onApplyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered_payload_fake.invalid_signature', {
      id: 'hacker-99',
      role: 'admin',
      status: 'forged',
      name: 'Tampered Hacker Session'
    });
    notify('⚠️ Injected forged/invalid signature JWT!');
  };

  const handleClearToken = () => {
    onApplyToken('', null);
    notify('🚫 Cleared Authorization header (Unauthenticated)');
  };

  // Run RBAC live endpoint test
  const runTest = async (testName: string, endpoint: string, method: string = 'GET', bodyPayload?: any, customToken?: string) => {
    setTesting(true);
    const tokenToUse = customToken !== undefined ? customToken : authToken;
    const startTime = performance.now();

    try {
      const headers: any = {
        'Content-Type': 'application/json'
      };
      if (tokenToUse) {
        headers['Authorization'] = `Bearer ${tokenToUse}`;
      }

      const res = await fetch(endpoint, {
        method,
        headers,
        body: bodyPayload ? JSON.stringify(bodyPayload) : undefined
      });

      const latency = Math.round(performance.now() - startTime);
      const json = await res.json().catch(() => ({ raw: 'Non-JSON response' }));

      setTestResult({
        testName,
        endpoint,
        method,
        status: res.status,
        statusText: res.statusText,
        latency,
        tokenSent: tokenToUse ? `${tokenToUse.substring(0, 18)}...` : 'None (Missing Authorization Header)',
        response: json,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      setTestResult({
        testName,
        endpoint,
        method,
        status: 500,
        statusText: 'Client Network Error',
        latency: 0,
        tokenSent: tokenToUse ? `${tokenToUse.substring(0, 18)}...` : 'None',
        response: { error: err.message },
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = () => {
    if (!authToken) return;
    navigator.clipboard.writeText(authToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/30 p-2.5 rounded-2xl border border-indigo-500/40 text-yellow-300">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-white flex items-center gap-2">
                RBAC & JWT Security Inspector
                <span className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                  HMAC-SHA256
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Role-Based Access Control Architecture & Real-Time Endpoint Enforcement
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Architecture Rules Overview */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl">
            <div className="font-bold text-orange-400 flex items-center gap-1.5 mb-1">
              <Shield className="w-4 h-4" /> 1. verifyAdmin
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Strictly restricts access to <code className="text-orange-300">role === 'admin'</code>. Guards <code className="text-slate-400">/api/admin/*</code>, vendor approvals, platform commission.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4" /> 2. verifyVendor
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Restricts access strictly to <code className="text-emerald-300">role === 'vendor' && status === 'approved'</code>. Guards <code className="text-slate-400">/api/vendor/*</code>, products & withdrawals.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl">
            <div className="font-bold text-indigo-400 flex items-center gap-1.5 mb-1">
              <Lock className="w-4 h-4" /> 3. authMiddleware
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Validates Bearer token format, verifies cryptographic signature, checks expiration, and attaches payload to <code className="text-indigo-300">req.user</code>.
            </p>
          </div>
        </div>

        {/* 2. Active Session Token & Decoded Claims */}
        <div className="mt-6 bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Active Decoded JWT Payload (req.user)
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                !authToken ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                authUser?.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                authUser?.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {authToken ? `ROLE: ${authUser?.role?.toUpperCase()} (${authUser?.status || 'active'})` : 'UNAUTHENTICATED (NO TOKEN)'}
              </span>
              {authToken && (
                <button
                  onClick={copyToClipboard}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                >
                  {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Token'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono mb-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-slate-500 block text-[10px]">User ID</span>
              <span className="text-white font-bold">{authUser?.id || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Role</span>
              <span className="text-indigo-300 font-bold">{authUser?.role || 'None'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Status</span>
              <span className={`font-bold ${authUser?.status === 'approved' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {authUser?.status || 'None'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Vendor Scope</span>
              <span className="text-slate-300 font-bold">{authUser?.vendorId || 'N/A'}</span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 truncate bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-500 select-none">Bearer </span>
            {authToken || <span className="text-red-400 italic">No token present in session</span>}
          </div>
        </div>

        {/* 3. Role Preset Simulator */}
        <div className="mt-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Switch Simulation Token (Instant RBAC Role Impersonation):
          </label>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => handleQuickSwitch('admin')}
              className={`px-3 py-2 rounded-xl font-bold transition-all border ${
                authUser?.role === 'admin' 
                  ? 'bg-purple-600 border-purple-400 text-white shadow-lg' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🛡️ Admin Token
            </button>
            <button
              onClick={() => handleQuickSwitch('vendor', 'approved', 'v1')}
              className={`px-3 py-2 rounded-xl font-bold transition-all border ${
                authUser?.role === 'vendor' && authUser?.status === 'approved'
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🏪 Approved Vendor (v1)
            </button>
            <button
              onClick={() => handleQuickSwitch('vendor', 'pending', 'v3')}
              className={`px-3 py-2 rounded-xl font-bold transition-all border ${
                authUser?.role === 'vendor' && authUser?.status === 'pending'
                  ? 'bg-amber-600 border-amber-400 text-white shadow-lg' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ⏳ Pending Vendor (v3)
            </button>
            <button
              onClick={() => handleQuickSwitch('customer')}
              className={`px-3 py-2 rounded-xl font-bold transition-all border ${
                authUser?.role === 'customer'
                  ? 'bg-orange-600 border-orange-400 text-white shadow-lg' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🛍️ Customer Token
            </button>
            <button
              onClick={handleSimulateTamperedToken}
              className="px-3 py-2 rounded-xl font-bold bg-rose-950/80 border border-rose-800/80 text-rose-300 hover:bg-rose-900 transition-colors"
            >
              ⚠️ Forged Signature
            </button>
            <button
              onClick={handleClearToken}
              className="px-3 py-2 rounded-xl font-bold bg-slate-800 border border-slate-700 text-red-400 hover:bg-slate-700 transition-colors"
            >
              🚫 Clear Token (Guest)
            </button>
          </div>
        </div>

        {/* 4. Live Verification & Penetration Tests */}
        <div className="mt-6 border-t border-slate-800 pt-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Execute Live Backend RBAC Security Tests:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
            <button
              disabled={testing}
              onClick={() => runTest('Admin Stats Endpoint', '/api/admin/stats', 'GET')}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all"
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>GET /api/admin/stats</span>
                <span className="text-[10px] text-orange-400">Admin Only</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1">Tests verifyAdmin middleware with active token.</p>
            </button>

            <button
              disabled={testing}
              onClick={() => runTest('Vendor Product Creation', '/api/vendor/products', 'POST', {
                title: 'Test Protected Item',
                price: 999,
                stock: 10
              })}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all"
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>POST /api/vendor/products</span>
                <span className="text-[10px] text-emerald-400">Approved Vendor</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1">Tests verifyVendor middleware enforcement.</p>
            </button>

            <button
              disabled={testing}
              onClick={() => runTest('Authenticated User Profile', '/api/auth/me', 'GET')}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left transition-all"
            >
              <div className="font-bold text-white flex items-center justify-between">
                <span>GET /api/auth/me</span>
                <span className="text-[10px] text-indigo-400">authMiddleware</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1">Verifies Bearer token decryption & req.user.</p>
            </button>

            <button
              disabled={testing}
              onClick={() => runTest('Unauthorized Admin Attempt', '/api/admin/stats', 'GET', undefined, '')}
              className="p-3 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/50 text-left transition-all"
            >
              <div className="font-bold text-rose-300 flex items-center justify-between">
                <span>Simulate Missing Token</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">Expect 401</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1">Expects 401 No authorization token provided.</p>
            </button>

            <button
              disabled={testing}
              onClick={async () => {
                // Fetch customer token directly and attack admin endpoint
                const res = await fetch('/api/auth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'customer' }) });
                const json = await res.json();
                runTest('Customer Attacking Admin Endpoint', '/api/admin/stats', 'GET', undefined, json.token);
              }}
              className="p-3 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/50 text-left transition-all"
            >
              <div className="font-bold text-rose-300 flex items-center justify-between">
                <span>Customer Calling Admin</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">Expect 403</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1">Expects 403 Access denied. Admins only.</p>
            </button>

            <button
              disabled={testing}
              onClick={async () => {
                // Fetch pending vendor token and attack vendor creation
                const res = await fetch('/api/auth/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'vendor', status: 'pending', vendorId: 'v3' }) });
                const json = await res.json();
                runTest('Pending Vendor Product Creation', '/api/vendor/products', 'POST', { title: 'Unapproved Item', price: 500 }, json.token);
              }}
              className="p-3 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/50 text-left transition-all"
            >
              <div className="font-bold text-rose-300 flex items-center justify-between">
                <span>Pending Vendor Calling Vendor API</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">Expect 403</span>
              </div>
              <p className="text-slate-400 text-[11px] mt-1">Expects 403 Vendor account is pending.</p>
            </button>

            {onTestRoute && (
              <>
                <button
                  onClick={() => onTestRoute('/admin')}
                  className="p-3 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60 text-left transition-all"
                >
                  <div className="font-bold text-purple-300 flex items-center justify-between">
                    <span>Navigate to '/admin'</span>
                    <span className="text-[10px] text-purple-400">Frontend Guard</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">Tests ProtectedRoute guard with active role.</p>
                </button>

                <button
                  onClick={() => onTestRoute('/vendor')}
                  className="p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 text-left transition-all"
                >
                  <div className="font-bold text-emerald-300 flex items-center justify-between">
                    <span>Navigate to '/vendor'</span>
                    <span className="text-[10px] text-emerald-400">Frontend Guard</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">Tests ProtectedRoute guard for vendor portal.</p>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 5. Live Test Result Console Output */}
        {testResult && (
          <div className="mt-6 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  testResult.status === 200 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  testResult.status === 403 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  HTTP {testResult.status} {testResult.statusText}
                </span>
                <span className="text-slate-300 font-bold">{testResult.testName}</span>
              </div>
              <span className="text-slate-500 text-[10px]">{testResult.latency}ms • {testResult.timestamp}</span>
            </div>

            <div className="space-y-1 text-slate-400 text-[11px] mb-2">
              <div>Request: <span className="text-indigo-400">{testResult.method}</span> <span className="text-slate-200">{testResult.endpoint}</span></div>
              <div>Authorization Token Sent: <span className="text-slate-300">{testResult.tokenSent}</span></div>
            </div>

            <pre className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-slate-200 text-[11px] overflow-x-auto max-h-48">
              {JSON.stringify(testResult.response, null, 2)}
            </pre>
          </div>
        )}
      </motion.div>
    </div>
  );
}
