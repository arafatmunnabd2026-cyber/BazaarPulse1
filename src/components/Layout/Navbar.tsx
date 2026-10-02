import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Search, ShoppingCart, Menu, Sparkles, User, 
  ChevronDown, Heart, Package, ShieldCheck, Store, LogOut,
  ChevronLeft, ChevronRight, Layers, Cpu, Shirt, Home, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop } from '../../context/ShopContext';
import { NotificationDropdown } from '../NotificationDropdown';

const CATEGORY_SLUG_TO_ID: Record<string, string> = {
  'electronics': 'c1',
  'gadgets': 'c1',
  'fashion': 'c2',
  'fashion-apparel': 'c2',
  'fashion & apparel': 'c2',
  'home-living': 'c3',
  'home': 'c3',
  'home & living': 'c3',
  'beauty': 'c4',
  'beauty-health': 'c4',
  'beauty & health': 'c4',
  'health': 'c7',
  'groceries': 'c5',
  'sports': 'c6',
  'sports-outdoors': 'c6',
  'sports & outdoors': 'c6'
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

function CategoryIcon({ categoryId, className = "w-4 h-4" }: { categoryId: string; className?: string }) {
  const id = normalizeCategoryId(categoryId);
  switch (id) {
    case 'c1': return <Cpu className={className} />;
    case 'c2': return <Shirt className={className} />;
    case 'c3': return <Home className={className} />;
    case 'c4': return <Sparkles className={className} />;
    case 'c7': return <Heart className={className} />;
    case 'c5': return <ShoppingBag className={className} />;
    case 'c6': return <Trophy className={className} />;
    default: return <Layers className={className} />;
  }
}

export function Navbar() {
  const { 
    authUser, onOpenLogin, onLogout, data, notify, 
    cart, setIsCartOpen, wishlist, handleCategoryChange, 
    selectedCategory, searchQuery, setSearchQuery, 
    setIsMenuOpen, setIsAiOpen
  } = useShop();

  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const getCategorySlug = (cat: any) => {
    if (!cat) return '';
    if (cat.id === 'all') return '';
    if (cat.slug) return cat.slug;
    if (cat.name) {
      return cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    return String(cat.id || '');
  };

  return (
    <div className="sticky top-0 z-40 bg-white shadow-xs hover:shadow-md transition-shadow duration-500">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2 text-slate-700 hover:bg-orange-50 hover:text-[#f85606] rounded-full transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-[#f85606] font-black text-2xl tracking-tighter flex items-center gap-1.5 cursor-pointer transition-all duration-300 ease-out hover:scale-105 active:scale-95 group" onClick={() => navigate('/')}>
              <ShoppingBag className="w-7 h-7 text-[#f85606] transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110" />
              <h1 className="text-2xl font-black m-0 p-0 inline text-[#f85606]">BazaarPulse</h1>
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
              <button className="bg-[#f85606] hover:bg-[#e04d05] text-white px-6 rounded-r-lg flex items-center justify-center transition-all duration-300 ease-out active:scale-95 cursor-pointer">
                <Search className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-700 hover:text-[#f85606] transition-all duration-300 ease-out hover:bg-orange-50 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 rounded-full flex items-center justify-center cursor-pointer"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#f85606] text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>

            <NotificationDropdown
              userId={authUser?.id}
              onOpenOrders={() => {}} // Handle this in shop context or layout
              notify={notify}
            />

            <button
              onClick={() => setIsAiOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-all duration-300 ease-out hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Advisor</span>
            </button>

            <div className="relative">
              {authUser ? (
                <div>
                  <button
                    onClick={() => setIsProfileDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-full border border-slate-200 hover:border-orange-500/50 bg-white hover:bg-orange-50/40 transition-all duration-300 ease-out shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 hover:scale-105 group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-orange-500/30 shadow-xs bg-slate-100 flex items-center justify-center">
                      {authUser.avatar ? (
                        <img src={authUser.avatar} alt={authUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 group-hover:text-orange-600 transition-transform duration-200 pr-0.5 ${isProfileDropdownOpen ? 'rotate-180 text-orange-600' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden text-left"
                        >
                          <div className="p-4 bg-gradient-to-br from-orange-50/80 via-white to-slate-50 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-orange-500/20 shadow-sm bg-white flex items-center justify-center shrink-0">
                                {authUser.avatar ? <img src={authUser.avatar} alt={authUser.name} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-slate-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-slate-900 truncate">{authUser.name}</h4>
                                <p className="text-xs text-slate-500 truncate">{authUser.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 space-y-1">
                            <button className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 hover:bg-pink-50 hover:text-pink-600 rounded-xl transition-colors text-left cursor-pointer group">
                              <div className="flex items-center gap-2.5">
                                <Heart className={`w-4 h-4 text-pink-500 ${wishlist.length > 0 ? 'fill-pink-500' : ''}`} />
                                <span>আমার পছন্দের তালিকা</span>
                              </div>
                              {wishlist.length > 0 && <span className="bg-pink-100 text-pink-700 text-[10px] font-black px-2 py-0.5 rounded-full">{wishlist.length}</span>}
                            </button>
                            <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-left cursor-pointer">
                              <Package className="w-4 h-4 text-orange-600" />
                              <span>আমার অর্ডারসমূহ</span>
                            </button>
                            {authUser.role === 'admin' && (
                              <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 rounded-xl transition-colors text-left cursor-pointer">
                                <ShieldCheck className="w-4 h-4 text-purple-600" />
                                <span>অ্যাডমিন ড্যাশবোর্ড</span>
                              </button>
                            )}
                            {authUser.role === 'vendor' && (
                              <button onClick={() => navigate('/vendor')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-left cursor-pointer">
                                <Store className="w-4 h-4 text-emerald-600" />
                                <span>ভেন্ডর ড্যাশবোর্ড</span>
                              </button>
                            )}
                            <div className="border-t border-slate-100 my-1" />
                            <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left cursor-pointer">
                              <LogOut className="w-4 h-4 text-red-500" />
                              <span>লগআউট</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button onClick={onOpenLogin} className="flex items-center gap-2 hover:bg-orange-50/40 p-1.5 rounded-full transition-all duration-300 ease-out border border-slate-200 hover:border-orange-500/50 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 hover:scale-105 cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><User className="w-5 h-5 text-slate-400" /></div>
                  <div className="hidden md:flex flex-col items-start leading-tight pr-2 text-left"><span className="text-sm font-semibold text-slate-600">Login / Sign Up</span></div>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="relative bg-white border-b border-gray-100 py-1.5 group/pbar">
        <button onClick={() => categoryScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/95 border border-slate-100 shadow-md text-slate-700 hover:text-[#f85606] transition-all opacity-0 group-hover/pbar:opacity-100 scale-90 hover:scale-105 active:scale-95 cursor-pointer"><ChevronLeft className="w-4 h-4 stroke-[2.5]" /></button>
        <button onClick={() => categoryScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/95 border border-slate-100 shadow-md text-slate-700 hover:text-[#f85606] transition-all opacity-0 group-hover/pbar:opacity-100 scale-90 hover:scale-105 active:scale-95 cursor-pointer"><ChevronRight className="w-4 h-4 stroke-[2.5]" /></button>
        <div ref={categoryScrollRef} className="max-w-7xl mx-auto px-8 flex items-center gap-4 overflow-x-auto py-1 scrollbar-none scroll-smooth">
          <button onClick={() => handleCategoryChange('all')} className={`whitespace-nowrap px-5.5 py-2 rounded-full border text-sm font-semibold transition-all duration-300 ease-out inline-flex items-center gap-2 cursor-pointer select-none shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${selectedCategory === 'all' ? 'bg-[#f85606] text-white border-[#f85606] shadow-md shadow-orange-500/20 scale-105' : 'bg-white text-gray-700 border-gray-100 hover:border-[#f85606] hover:text-[#f85606]'}`}><Layers className="w-4 h-4" /><span>All</span></button>
          {data?.categories?.map((cat: any) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button key={`navbar-${cat.id}`} onClick={() => handleCategoryChange(cat.id)} className={`whitespace-nowrap px-5.5 py-2 rounded-full border text-sm font-semibold transition-all duration-300 ease-out inline-flex items-center gap-2 cursor-pointer select-none shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${isSelected ? 'bg-[#f85606] text-white border-[#f85606] shadow-md shadow-orange-500/20 scale-105' : 'bg-white text-gray-700 border-gray-100 hover:border-[#f85606] hover:text-[#f85606]'}`}>
                <CategoryIcon categoryId={cat.id} className="w-4 h-4" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
