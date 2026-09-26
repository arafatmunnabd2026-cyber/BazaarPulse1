/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { 
  ShoppingBag, Store, ShieldCheck, Search, ShoppingCart, Heart, User, 
  TrendingUp, DollarSign, Package, Users, CheckCircle, Clock, XCircle, 
  Sparkles, Bot, Send, ArrowRight, Star, Plus, Edit, Trash2, Check, AlertCircle,
  Menu, X, Filter, RefreshCw, ChevronRight, Settings, Layers, CreditCard,
  Truck, MapPin, Key, Lock, Shield, Terminal, Copy, CheckCheck,
  ShieldAlert, LogOut, LogIn, ExternalLink, ChevronDown, ShieldOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  // Current Route Navigation: '/' (Storefront), '/vendor' (Vendor Dashboard), '/admin' (Admin Control)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    // Check both hash and pathname to support direct hits/refreshes on Render
    const hash = window.location.hash.replace('#', '');
    const pathname = window.location.pathname;

    if (hash === 'admin' || hash === 'vendor' || hash === 'admin/login') {
      return `/${hash}`;
    }
    if (pathname === '/admin' || pathname === '/vendor' || pathname === '/admin/login') {
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

  // Fetch initial data
  const loadData = async () => {
    try {
      const res = await fetch('/api/platform/data');
      const json = await res.json();
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

  const handleLoginUser = (user: any, token: string) => {
    setAuthUser(user);
    setAuthToken(token);
    localStorage.setItem('bazaarpulse_user', JSON.stringify(user));
    localStorage.setItem('bazaarpulse_token', token);
    setIsAuthModalOpen(false);
    setAccessDeniedAlert(null);
    notify(`👋 Welcome back, ${user.name}! (Role: ${user.role})`);
    
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
        body: JSON.stringify({ email, password, role: 'admin' })
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
  
  // Initialize cart from localStorage for persistence
  const [cart, setCart] = useState<{ product: any; quantity: number; size?: string; color?: string }[]>(() => {
    try {
      const saved = localStorage.getItem('bazaarpulse_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bazaarpulse_cart', JSON.stringify(cart));
  }, [cart]);

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

  const filteredProducts = data.products.filter((p: any) => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const cleanQuery = searchQuery.toLowerCase().replace(/[,/#!$%\^&\*;:{}=\-_`~()?]/g, ' ').trim();
    const matchesSearch = !cleanQuery || 
      p.title.toLowerCase().includes(cleanQuery) || 
      p.categoryName.toLowerCase().includes(cleanQuery) ||
      (p.description && p.description.toLowerCase().includes(cleanQuery)) ||
      cleanQuery.split(/\s+/).some(word => word.length > 1 && (p.title.toLowerCase().includes(word) || p.categoryName.toLowerCase().includes(word)));
    return matchesCat && matchesSearch && p.status === 'active';
  });

  const addToCart = async (product: any, qty: number = 1, size?: string, color?: string) => {
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
    
    notify(`Added "${product.title.substring(0, 25)}..." to cart`);

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
                    <span className="text-[9px] text-slate-500 truncate max-w-[120px]">{authUser.email}</span>
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
            <div className="text-xs text-gray-500 mt-1">{data.products.length} items</div>
          </button>
          {data.categories.map((cat: any) => (
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
              <div className="text-xs text-gray-500 mt-1">{cat.count} items</div>
            </button>
          ))}
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
                      <span className="absolute top-2 left-2 bg-[#f85606] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                        -{discountPercent}%
                      </span>
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

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-amber-500 text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-500" />
                          <span className="text-gray-600 font-medium">{product.rating}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">Sold ({product.totalSold})</span>
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

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-600" /> Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 items-center">
                    <img src={item.product?.images?.[0] || item.product?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm line-clamp-1">{item.product.title}</h4>
                      <div className="text-xs text-slate-500">{item.product.vendorName}</div>
                      <div className="text-orange-600 font-bold text-sm mt-1">৳{item.product.discountPrice || item.product.price} × {item.quantity}</div>
                      {(item.size || item.color) && (
                        <div className="flex gap-2 mt-1 text-[10px] font-bold">
                          {item.size && <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">Size: {item.size}</span>}
                          {item.color && <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">Color: {item.color}</span>}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => item?.product?.id && removeFromCart(item.product.id, item.size, item.color)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-bold">৳{cart.reduce((sum, i) => sum + (i.product.discountPrice || i.product.price) * i.quantity, 0)}</span>
                </div>
                <div className="flex justify-between mb-4 text-sm">
                  <span className="text-slate-600">Shipping</span>
                  <span className="font-bold">৳150</span>
                </div>
                <div className="flex justify-between mb-4 text-lg font-extrabold border-t border-slate-200 pt-2">
                  <span>Total</span>
                  <span className="text-orange-600">৳{cart.reduce((sum, i) => sum + (i.product.discountPrice || i.product.price) * i.quantity, 0) + 150}</span>
                </div>
                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                >
                  Proceed to Checkout
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
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white w-full h-full sm:h-[90vh] sm:max-w-7xl sm:rounded-2xl shadow-2xl flex flex-col overflow-y-auto"
          >
            {/* PDP Sticky Header Bar */}
            <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="bg-[#f85606] text-white text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">Daraz Verified</span>
                <h3 className="font-extrabold text-black text-base sm:text-lg line-clamp-1">{selectedProduct.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="p-2.5 text-gray-500 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close Modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* PDP Main Content Grid */}
            <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
              {/* Left Column: Gallery & Thumbnails (4 cols on lg) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="aspect-square bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden relative shadow-inner">
                  <img 
                    src={selectedProduct?.images?.[activeImageIdx] || selectedProduct?.images?.[0] || selectedProduct?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} 
                    alt={selectedProduct?.title} 
                    className="w-full h-full object-cover" 
                  />
                  {selectedProduct?.discountPrice && (
                    <span className="absolute top-4 left-4 bg-[#f85606] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow">
                      -{Math.round(((selectedProduct.price - selectedProduct.discountPrice) / selectedProduct.price) * 100)}% Off
                    </span>
                  )}
                </div>

                {/* Thumbnails */}
                {Array.isArray(selectedProduct?.images) && selectedProduct.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedProduct.images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${
                          activeImageIdx === idx ? 'border-[#f85606] ring-2 ring-[#f85606]/20' : 'border-gray-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Campaign Banner Highlight */}
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
                  <div className="text-xs font-bold text-[#f85606] uppercase tracking-wider">⚡ Eid Mega Campaign Sale</div>
                  <div className="text-xs text-gray-700 mt-1">Extra 10% cashback via bKash & Free Shipping on orders over ৳1,500</div>
                </div>
              </div>

              {/* Middle Column: Pricing, Details & Actions (5 cols on lg) */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                <div>
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1 font-medium">
                    Store Brand: <span className="text-[#f85606] font-bold">{selectedProduct.vendorName}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-black leading-snug">
                    {selectedProduct.title}
                  </h1>
                </div>

                {/* Ratings & Sold */}
                <div className="flex items-center gap-4 text-xs pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <span className="text-black font-bold">{selectedProduct.rating}</span>
                    <span className="text-gray-500 font-normal">({selectedProduct.reviewsCount || 24} Ratings)</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-700 font-medium">{selectedProduct.totalSold || 150}+ Sold</span>
                </div>

                {/* Price Section */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#f85606]">
                    ৳{selectedProduct.discountPrice || selectedProduct.price}
                  </div>
                  {selectedProduct.discountPrice && (
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-sm text-gray-500 line-through">
                        ৳{selectedProduct.price}
                      </span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">You Save ৳{selectedProduct.price - selectedProduct.discountPrice}</span>
                    </div>
                  )}
                </div>

                {/* Variation Selectors */}
                <div className="space-y-4 py-2 border-b border-gray-100">
                  {/* Size Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider">Select Size</span>
                      <span className="text-[10px] text-blue-600 font-bold cursor-pointer hover:underline">Size Guide</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-[45px] h-[35px] border rounded-lg text-xs font-bold transition-all ${
                            selectedSize === size 
                              ? 'border-[#f85606] bg-orange-50 text-[#f85606] ring-1 ring-[#f85606]' 
                              : 'border-gray-200 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selector */}
                  <div>
                    <span className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider block mb-2">Select Color</span>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { name: 'Black', class: 'bg-black' },
                        { name: 'White', class: 'bg-white border-gray-200' },
                        { name: 'Blue', class: 'bg-blue-600' },
                        { name: 'Red', class: 'bg-red-600' }
                      ].map(color => (
                        <button
                          key={color.name}
                          onClick={() => setSelectedColor(color.name)}
                          className={`group relative flex flex-col items-center gap-1 transition-all ${
                            selectedColor === color.name ? 'scale-110' : 'hover:scale-105'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full border-2 ${color.class} ${
                            selectedColor === color.name ? 'border-[#f85606] ring-2 ring-orange-100' : 'border-transparent'
                          }`} />
                          <span className={`text-[10px] font-bold ${selectedColor === color.name ? 'text-[#f85606]' : 'text-gray-400'}`}>
                            {color.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center gap-6 py-2">
                  <span className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider">Quantity</span>
                  <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button 
                      onClick={() => setProductQty(Math.max(1, productQty - 1))}
                      className="px-4 py-2 text-black hover:bg-gray-100 font-bold transition-colors"
                    >
                      -
                    </button>
                    <span className="px-5 py-2 font-extrabold text-sm text-black min-w-[50px] text-center">{productQty}</span>
                    <button 
                      onClick={() => setProductQty(productQty + 1)}
                      className="px-4 py-2 text-black hover:bg-gray-100 font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Available: {selectedProduct.stock}</span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() => {
                      if (!selectedSize || !selectedColor) {
                        notify('Please select size and color');
                        return;
                      }
                      addToCart(selectedProduct, productQty, selectedSize, selectedColor);
                      setSelectedProduct(null);
                      setIsCartOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    Buy Now
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedSize || !selectedColor) {
                        notify('Please select size and color');
                        return;
                      }
                      addToCart(selectedProduct, productQty, selectedSize, selectedColor);
                      setSelectedProduct(null);
                      setSelectedSize('');
                      setSelectedColor('');
                    }}
                    className="bg-[#f85606] hover:bg-[#e04d05] text-white font-black py-4 rounded-xl text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    <ShoppingCart className="w-5 h-5" /> Add to Cart
                  </button>
                </div>
              </div>

              {/* Right Column: Delivery & Seller Sidebar (3 cols on lg) */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                {/* Delivery Box */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="font-extrabold text-black uppercase tracking-wide flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#f85606]" /> Delivery & Shipping
                  </div>
                  <div className="text-gray-700 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-black">Dhaka, Banani, Road 11</div>
                      <div className="text-blue-600 cursor-pointer hover:underline font-semibold mt-0.5">CHANGE LOCATION</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-black">Standard Delivery</div>
                      <div className="text-gray-500">Guaranteed by 3-5 days</div>
                    </div>
                    <span className="font-extrabold text-black">৳150</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex items-center gap-2 text-emerald-700 font-extrabold">
                    <span>💵 Cash on Delivery Available</span>
                  </div>
                </div>

                {/* Service & Return */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="font-extrabold text-black uppercase tracking-wide">Service & Warranty</div>
                  <div className="text-gray-700 font-medium">🛡️ 7 Days Easy Returns & Exchange</div>
                  <div className="text-gray-700 font-medium">📜 1 Year Official Brand Warranty</div>
                  <div className="text-gray-700 font-medium">🔒 100% Authentic Guaranteed</div>
                </div>

                {/* Seller Box */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider font-extrabold">Sold by</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-black text-sm">{selectedProduct.vendorName}</div>
                      <div className="text-xs text-emerald-700 font-extrabold mt-0.5">96% Positive Seller Rating</div>
                    </div>
                    <button className="text-xs bg-orange-50 text-[#f85606] font-extrabold px-3 py-1.5 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors">
                      Follow
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center text-xs">
                    <div>
                      <div className="text-gray-400 text-[10px]">Store Rating</div>
                      <div className="font-extrabold text-black mt-0.5">4.8 / 5</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-[10px]">Ship on Time</div>
                      <div className="font-extrabold text-emerald-700 mt-0.5">99%</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-[10px]">Chat Response</div>
                      <div className="font-extrabold text-black mt-0.5">95%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sections: Specs, Reviews & Recommendations */}
            <div className="bg-gray-50 p-4 sm:p-8 border-t border-gray-200 space-y-6">
              {/* Product Description & Specifications */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="font-extrabold text-black text-base sm:text-lg mb-3 pb-2 border-b border-gray-100">Product Details & Specifications</h3>
                <p className="text-sm text-gray-700 leading-relaxed mb-4">{selectedProduct.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                    <span className="text-gray-500 font-medium block">Category</span>
                    <span className="font-extrabold text-black mt-0.5 block">{selectedProduct.categoryName || 'Electronics & Fashion'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">Stock Status</span>
                    <span className="font-extrabold text-emerald-700 mt-0.5 block">In Stock ({selectedProduct.stock} items)</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">Warranty</span>
                    <span className="font-extrabold text-black mt-0.5 block">1 Year Brand Warranty</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">SKU / ID</span>
                    <span className="font-extrabold text-black mt-0.5 block">{selectedProduct.id}</span>
                  </div>
                </div>
              </div>

              {/* Ratings & Reviews Section */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="font-extrabold text-black text-base sm:text-lg mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                  <span>Ratings & Reviews ({selectedProduct.reviewsCount || 24})</span>
                  <div className="flex items-center gap-1 text-amber-500 text-sm">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <span className="font-extrabold text-black">{selectedProduct.rating} / 5.0</span>
                  </div>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center border-b border-gray-100 pb-6 mb-6">
                  <div className="text-center md:text-left bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                    <div className="text-4xl font-extrabold text-[#f85606]">{selectedProduct.rating}</div>
                    <div className="flex justify-center md:justify-start gap-1 text-amber-500 my-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-500" />
                      ))}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Based on 24 verified customer reviews</div>
                  </div>
                  <div className="space-y-1.5 md:col-span-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">5 Star</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="w-[85%] h-full bg-amber-500"></div></div>
                      <span className="text-gray-500 font-bold">20</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">4 Star</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="w-[12%] h-full bg-amber-500"></div></div>
                      <span className="text-gray-500 font-bold">3</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">3 Star</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="w-[3%] h-full bg-amber-500"></div></div>
                      <span className="text-gray-500 font-bold">1</span>
                    </div>
                  </div>
                </div>

                {/* Customer Review Feed */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-sm text-black">Tanvir Ahmed</div>
                      <span className="text-xs text-gray-500 font-medium">22 Mar 2026</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 my-1">
                      {[...Array(5)].map((_, i) => (<Star key={i} className="w-3.5 h-3.5 fill-amber-500" />))}
                    </div>
                    <p className="text-xs text-gray-800 mt-1 font-medium">Awesome product! Exactly as described in the pictures. Super fast delivery by BazaarPulse.</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="font-extrabold text-sm text-black">Sadia Islam</div>
                      <span className="text-xs text-gray-500 font-medium">24 Mar 2026</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 my-1">
                      {[...Array(5)].map((_, i) => (<Star key={i} className="w-3.5 h-3.5 fill-amber-500" />))}
                    </div>
                    <p className="text-xs text-gray-800 mt-1 font-medium">Very premium quality packaging and genuine product with warranty card. Highly recommended!</p>
                  </div>
                </div>
              </div>

              {/* Related Products / Recommendations */}
              <div>
                <h3 className="font-extrabold text-black text-lg mb-4">You May Also Like</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {data.products.filter((p: any) => p.id !== selectedProduct.id).slice(0, 5).map((rec: any) => (
                    <div 
                      key={rec.id}
                      onClick={() => { setSelectedProduct(rec); setProductQty(1); setActiveImageIdx(0); }}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all p-3 cursor-pointer flex flex-col justify-between group"
                    >
                      <img src={rec.images?.[0] || rec.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} alt="" className="w-full aspect-square object-cover rounded-lg mb-2 group-hover:scale-105 transition-transform" />
                      <div>
                        <h4 className="font-bold text-xs text-black line-clamp-2">{rec.title}</h4>
                        <div className="text-[#f85606] font-extrabold text-sm mt-1">৳{rec.discountPrice || rec.price}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

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
  const [adminTab, setAdminTab] = useState<'overview' | 'vendors' | 'withdrawals' | 'products' | 'settings'>('overview');
  
  const [newAdminProduct, setNewAdminProduct] = useState({
    title: '',
    price: '',
    originalPrice: '',
    stock: '',
    image: '',
    categoryId: data.categories?.[0]?.id || 'c1'
  });

  // Stats calculation
  const totalGMV = data.orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
  const totalCommission = Math.round(totalGMV * (data.adminSettings.globalCommissionRate / 100));
  const activeVendorsCount = data.vendors.filter((v: any) => v.status === 'approved').length;
  const pendingVendorsCount = data.vendors.filter((v: any) => v.status === 'pending').length;

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
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify(newAdminProduct)
      });
      const json = await res.json();
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }
      if (json.success) {
        notify('📦 Product added successfully by Admin!');
        setNewAdminProduct({ title: '', price: '', originalPrice: '', stock: '', image: '', categoryId: data.categories?.[0]?.id || 'c1' });
        refreshData();
      }
    } catch (err) {
      notify('Failed to add product');
    }
  };

  const handleDeleteAdminProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });
      const json = await res.json();
      
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }

      if (json.success) {
        notify('🗑️ Product deleted successfully!');
        refreshData();
      } else {
        notify('Failed to delete product');
      }
    } catch (err) {
      console.error('Delete product error:', err);
      notify('Failed to delete product');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-[41px] z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-white font-black text-lg">🛡️</div>
            <div>
              <h2 className="font-bold text-lg">BazaarPulse Admin Control Center</h2>
              <p className="text-xs text-slate-400">Platform Governance & Financial Oversight</p>
            </div>
          </div>
          <div className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
            Global Commission: <span className="font-bold text-orange-400">{data.adminSettings.globalCommissionRate}%</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex gap-2 border-b border-slate-200 pb-3">
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
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Current Price (৳)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 24000"
                      value={newAdminProduct.price}
                      onChange={e => setNewAdminProduct({ ...newAdminProduct, price: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Original Price / Strikethrough (৳)</label>
                    <input
                      type="number"
                      placeholder="e.g. 28000"
                      value={newAdminProduct.originalPrice}
                      onChange={e => setNewAdminProduct({ ...newAdminProduct, originalPrice: e.target.value })}
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
                      placeholder="e.g. 25"
                      value={newAdminProduct.stock}
                      onChange={e => setNewAdminProduct({ ...newAdminProduct, stock: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Category</label>
                    <select
                      value={newAdminProduct.categoryId}
                      onChange={e => setNewAdminProduct({ ...newAdminProduct, categoryId: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                    >
                      {data.categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Product Image URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={newAdminProduct.image}
                    onChange={e => setNewAdminProduct({ ...newAdminProduct, image: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow transition-all text-sm"
                >
                  Publish Product to Store
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
                    <button
                      onClick={() => handleDeleteAdminProduct(p.id)}
                      className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Product
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
