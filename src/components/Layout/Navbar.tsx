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
    <div className="sticky top-0 z-40 bg-white shadow-sm transition-all duration-300">
      {/* Top Main Header */}
      <header className="bg-[#f85606] text-white">
        <div className="max-w-[1440px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4 sm:gap-8">
          {/* Logo & Mega Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <div 
              className="text-white font-black text-2xl sm:text-3xl tracking-tighter flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95 group" 
              onClick={() => navigate('/')}
            >
              <img src="/logo.png?v=2" alt="বাজার প্লাস লোগো" className="h-10 w-auto sm:h-12 object-contain" />
              <h1 className="hidden sm:inline-block text-2xl sm:text-3xl font-black m-0 p-0 tracking-tight text-white uppercase italic">বাজার প্লাস</h1>
            </div>

            {/* Desktop Categories Mega Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-bold text-sm border border-white/10 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
              <span>Categories</span>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </button>
            
            {/* Mobile Menu Trigger */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Prominent Search Bar */}
          <div className="flex-1 max-w-3xl">
            <form 
              onSubmit={(e) => { e.preventDefault(); }}
              className="w-full relative flex group shadow-lg shadow-black/5"
            >
              <input
                type="text"
                placeholder="Search products, brands and categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-0 rounded-l-xl py-2.5 sm:py-3.5 px-5 text-sm sm:text-base focus:ring-4 focus:ring-orange-500/20 outline-none text-gray-900 transition-all placeholder:text-gray-400 font-medium"
              />
              <button 
                type="submit"
                className="bg-[#212121] hover:bg-black text-white px-5 sm:px-8 rounded-r-xl flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0"
              >
                <Search className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </form>
          </div>

          {/* Actions: Auth, AI, Cart */}
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            {/* AI Advisor Button */}
            <button
              onClick={() => setIsAiOpen(true)}
              className="hidden md:flex items-center gap-2 bg-white text-[#f85606] px-4 py-2.5 rounded-xl text-sm font-black shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer border-2 border-white"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Advisor</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 text-white hover:bg-white/10 transition-all rounded-xl flex items-center justify-center cursor-pointer group"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-slate-900 text-[10px] sm:text-xs w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-black border-2 border-[#f85606] shadow-md animate-bounce">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>

            <div className="relative">
              {authUser ? (
                <div>
                  <button
                    onClick={() => setIsProfileDropdownOpen(prev => !prev)}
                    className="flex items-center gap-2 p-1 rounded-xl bg-white/10 hover:bg-white/20 transition-all cursor-pointer border border-white/10"
                  >
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-white/50 bg-slate-200 flex items-center justify-center">
                      {authUser.avatar ? (
                        <img src={authUser.avatar} alt={authUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <span className="hidden lg:inline-block text-sm font-bold pr-1">{authUser.name.split(' ')[0]}</span>
                    <ChevronDown className={`hidden lg:block w-4 h-4 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 12, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 12, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden text-left ring-1 ring-black/5"
                        >
                          <div className="p-5 bg-gradient-to-br from-orange-50 to-white border-b border-slate-100">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500/20 shadow-sm bg-white shrink-0 flex items-center justify-center">
                                {authUser.avatar ? <img src={authUser.avatar} alt={authUser.name} className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-slate-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-slate-900 truncate">{authUser.name}</h4>
                                <p className="text-[11px] text-slate-500 truncate font-medium">{authUser.email}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5 space-y-1">
                            <button className="w-full flex items-center justify-between px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-[#f85606] rounded-xl transition-all text-left cursor-pointer group">
                              <div className="flex items-center gap-3">
                                <Heart className={`w-5 h-5 text-pink-500 transition-transform group-hover:scale-110 ${wishlist.length > 0 ? 'fill-pink-500' : ''}`} />
                                <span>আমার পছন্দের তালিকা</span>
                              </div>
                              {wishlist.length > 0 && <span className="bg-pink-100 text-pink-700 text-[10px] font-black px-2 py-0.5 rounded-full">{wishlist.length}</span>}
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all text-left cursor-pointer">
                              <Package className="w-5 h-5 text-orange-600" />
                              <span>আমার অর্ডারসমূহ</span>
                            </button>
                            {authUser.role === 'admin' && (
                              <button onClick={() => { setIsProfileDropdownOpen(false); navigate('/admin'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold text-purple-700 hover:bg-purple-50 rounded-xl transition-all text-left cursor-pointer">
                                <ShieldCheck className="w-5 h-5 text-purple-600" />
                                <span>অ্যাডমিন ড্যাশবোর্ড</span>
                              </button>
                            )}
                            {authUser.role === 'vendor' && (
                              <button onClick={() => { setIsProfileDropdownOpen(false); navigate('/vendor'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all text-left cursor-pointer">
                                <Store className="w-5 h-5 text-emerald-600" />
                                <span>ভেন্ডর ড্যাশবোর্ড</span>
                              </button>
                            )}
                            <div className="border-t border-slate-100 my-2" />
                            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all text-left cursor-pointer">
                              <LogOut className="w-5 h-5 text-red-500" />
                              <span>লগআউট</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button onClick={onOpenLogin} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all border border-white/10 cursor-pointer shadow-lg">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  <span className="hidden md:inline-block text-sm font-black text-white">Login / Register</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Sub-Nav */}
      <div className="hidden lg:block bg-white border-b border-gray-100 py-2">
        <div className="max-w-[1440px] mx-auto px-4 flex items-center gap-8">
          <button 
            onClick={() => handleCategoryChange('all')} 
            className={`text-sm font-extrabold uppercase tracking-wider transition-colors ${selectedCategory === 'all' ? 'text-[#f85606]' : 'text-slate-600 hover:text-[#f85606]'}`}
          >
            All Categories
          </button>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex-1 flex items-center gap-6 overflow-hidden">
            {data?.categories?.slice(0, 8).map((cat: any) => (
              <button 
                key={`subnav-${cat.id}`}
                onClick={() => handleCategoryChange(cat.id)}
                className={`text-[13px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${selectedCategory === cat.id ? 'text-[#f85606]' : 'text-slate-500 hover:text-[#f85606]'}`}
              >
                <CategoryIcon categoryId={cat.id} className="w-3.5 h-3.5 opacity-70" />
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-[13px] font-bold text-slate-500 shrink-0">
             <button className="hover:text-[#f85606] transition-colors font-bold">Become a Seller</button>
             <button className="hover:text-[#f85606] transition-colors font-bold">Help Center</button>
          </div>
        </div>
      </div>

      {/* Mobile Category Scroller */}
      <div className="lg:hidden relative bg-white border-b border-gray-100 py-2 overflow-hidden">
        <div ref={categoryScrollRef} className="flex items-center gap-3 overflow-x-auto px-4 py-1 no-scrollbar scroll-smooth no-scrollbar">
          <button onClick={() => handleCategoryChange('all')} className={`whitespace-nowrap px-4 py-1.5 rounded-full border text-[11px] font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs ${selectedCategory === 'all' ? 'bg-[#f85606] text-white border-[#f85606]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#f85606] hover:text-[#f85606]'}`}><Layers className="w-3 h-3" /><span>All</span></button>
          {data?.categories?.map((cat: any) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button key={`navbar-mob-${cat.id}`} onClick={() => handleCategoryChange(cat.id)} className={`whitespace-nowrap px-4 py-1.5 rounded-full border text-[11px] font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs ${isSelected ? 'bg-[#f85606] text-white border-[#f85606]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#f85606] hover:text-[#f85606]'}`}>
                <CategoryIcon categoryId={cat.id} className="w-3 h-3" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
