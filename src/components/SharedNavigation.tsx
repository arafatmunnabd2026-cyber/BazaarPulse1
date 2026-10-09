import React from 'react';
import { ShoppingBag, Search, ShoppingCart, Bell, Sparkles, User, Menu, X, ChevronLeft, ChevronRight, Layers, Cpu, Shirt, Home as HomeIcon, Trophy, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Simplified Category Mapping to be reused
const CATEGORY_SLUG_TO_ID: Record<string, string> = {
  'electronics': 'c1', 'gadgets': 'c1',
  'fashion': 'c2', 'fashion-apparel': 'c2', 'fashion & apparel': 'c2',
  'home-living': 'c3', 'home': 'c3', 'home & living': 'c3',
  'beauty': 'c4', 'beauty-health': 'c4', 'beauty & health': 'c4',
  'health': 'c7', 'groceries': 'c5', 'sports': 'c6', 'sports-outdoors': 'c6', 'sports & outdoors': 'c6'
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
    case 'c3': return <HomeIcon className={className} />;
    case 'c4': return <Sparkles className={className} />;
    case 'c7': return <Heart className={className} />;
    case 'c5': return <ShoppingBag className={className} />;
    case 'c6': return <Trophy className={className} />;
    default: return <Layers className={className} />;
  }
}

export const SharedNavigation = ({
  data,
  selectedCategory,
  handleCategoryChange,
  searchQuery,
  setSearchQuery,
  authUser: propAuthUser,
  onOpenLogin,
  isMenuOpen,
  setIsMenuOpen,
  onCartClick,
  onNotificationClick,
  onAiAdvisorClick,
  onProfileClick,
  onClose,
  isPDP = false
}: any) => {
  const auth = useAuth();
  const effectiveAuthUser = propAuthUser !== undefined ? propAuthUser : auth.authUser;
  const effectiveOnOpenLogin = onOpenLogin || auth.openLoginModal;
  const scrollRef = React.useRef<HTMLDivElement>(null);
  
  const displayCategories = [
    { id: 'all', name: 'All' },
    ...(Array.isArray(data?.categories) ? data.categories : [])
  ];

  return (
    <header className="bg-white shadow-xs hover:shadow-md transition-shadow duration-500 sticky top-0 z-[101] border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2">
        {/* Top Single Row: Hamburger/Back + Logo on Left, Search in Center (Desktop), Action Icons on Right */}
        <div className="flex items-center justify-between gap-1 sm:gap-4 w-full">
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <button 
              onClick={() => isPDP ? onClose() : setIsMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-700 hover:bg-orange-50 hover:text-[#f85606] rounded-full transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer shrink-0"
              title={isPDP ? "Back to Storefront" : "Menu"}
            >
              {isPDP ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
            <div className="text-[#f85606] font-black text-lg sm:text-2xl tracking-tighter flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-all duration-300 ease-out hover:scale-105 active:scale-95 group shrink-0" onClick={() => !isPDP && window.location.reload()}>
              <ShoppingBag className="w-5 h-5 sm:w-7 sm:h-7 text-[#f85606] transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110 shrink-0" />
              <span className="text-base sm:text-2xl font-black m-0 p-0 inline text-[#f85606]">BazaarPulse</span>
            </div>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden sm:flex flex-1 max-w-2xl items-center mx-2">
            <div className="w-full relative flex">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg py-2 px-3 text-sm text-gray-900 focus:outline-none"
              />
              <button className="bg-[#f85606] hover:bg-[#e04d05] text-white px-6 rounded-r-lg flex items-center justify-center transition-all duration-300 ease-out active:scale-95 cursor-pointer">
                <Search className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              </button>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <button onClick={onCartClick} className="relative p-1.5 sm:p-2 text-gray-700 hover:text-[#f85606] transition-all duration-300 ease-out hover:bg-orange-50 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 rounded-full flex items-center justify-center cursor-pointer shrink-0" title="Shopping Cart">
              <ShoppingCart className="w-5 h-5 sm:w-7 sm:h-7" />
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={onNotificationClick} className="relative p-1.5 sm:p-2 text-gray-700 hover:text-[#f85606] transition-all duration-300 ease-out flex items-center justify-center rounded-full hover:bg-orange-50 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer shrink-0" title="Notifications">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <button onClick={onAiAdvisorClick} className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white p-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-all duration-300 ease-out hover:shadow-lg hover:shadow-orange-500/25 hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer shrink-0" title="AI Advisor">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">AI Advisor</span>
              </button>
            </div>
            {effectiveAuthUser ? (
              <div onClick={onProfileClick} className="flex items-center gap-1 p-0.5 sm:p-1.5 rounded-full border border-slate-200 bg-white shadow-xs cursor-pointer shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                  {effectiveAuthUser.avatar ? <img src={effectiveAuthUser.avatar} alt={effectiveAuthUser.name} className="w-full h-full object-cover" /> : <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />}
                </div>
                <div className="hidden md:flex flex-col items-start leading-tight pr-2 text-left">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[100px]">{effectiveAuthUser.name}</span>
                  <span className="text-[10px] text-slate-500 capitalize">{effectiveAuthUser.role}</span>
                </div>
              </div>
            ) : (
              <button onClick={effectiveOnOpenLogin} className="flex items-center gap-1.5 hover:bg-orange-50/40 p-1 sm:p-1.5 rounded-full transition-all duration-300 ease-out border border-slate-200 hover:border-orange-500/50 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 hover:scale-105 cursor-pointer shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" /></div>
                <div className="hidden md:flex flex-col items-start leading-tight pr-2 text-left"><span className="text-sm font-semibold text-slate-600">Login / Sign Up</span></div>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden w-full mt-2 pt-0.5 px-0.5">
          <div className="w-full relative flex">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg py-1.5 px-3 text-xs text-gray-900 focus:outline-none"
            />
            <button className="bg-[#f85606] hover:bg-[#e04d05] text-white px-3.5 rounded-r-lg flex items-center justify-center transition-all duration-300 ease-out active:scale-95 cursor-pointer">
              <Search className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 py-1.5 shadow-xs relative group/pbar">
        <button onClick={() => scrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/95 border border-slate-100 shadow-md text-slate-700 hover:text-[#f85606] transition-all opacity-0 group-hover/pbar:opacity-100 scale-90 hover:scale-105 active:scale-95 cursor-pointer">
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
        </button>
        <button onClick={() => scrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/95 border border-slate-100 shadow-md text-slate-700 hover:text-[#f85606] transition-all opacity-0 group-hover/pbar:opacity-100 scale-90 hover:scale-105 active:scale-95 cursor-pointer">
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
        <div ref={scrollRef} className="max-w-7xl mx-auto px-8 flex items-center gap-4 overflow-x-auto py-1 scrollbar-none scroll-smooth">
          {displayCategories.map((cat: any, index: number) => (
              <button 
              key={`nav-${cat.id}-${index}`}
              onClick={(e) => {
                e.preventDefault();
                handleCategoryChange(cat.id);
              }}
              className={`whitespace-nowrap px-5.5 py-2 rounded-full border text-sm font-semibold transition-all duration-300 ease-out inline-flex items-center gap-2 cursor-pointer select-none shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${selectedCategory === cat.id ? 'bg-[#f85606] text-white border-[#f85606] shadow-md shadow-orange-500/20 scale-105' : 'bg-white text-gray-700 border-gray-100 hover:border-[#f85606] hover:text-[#f85606]'}`}
            >
              {cat.id !== 'all' && <CategoryIcon categoryId={cat.id} className="w-4 h-4" />}
              {cat.id === 'all' && <Layers className="w-4 h-4" />}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
