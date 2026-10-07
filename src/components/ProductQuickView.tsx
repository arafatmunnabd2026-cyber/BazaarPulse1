import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Search, ShoppingCart, Sparkles, Star, Package, Heart, Minus, Plus, Check, Menu, Bell, User, Layers, Cpu, Shirt, Home as HomeIcon, Trophy, ChevronLeft, ChevronRight, ChevronDown, LogOut, ShieldCheck, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ProductReviewWidget } from '../plugins/ProductReviewWidget';

// Helper to normalize variation data whether it's an array, JSON string, or comma-separated string
const normalizeList = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((x: any) => String(x).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((x: any) => String(x).trim()).filter(Boolean);
        }
      } catch {
        // fallback to split
      }
    }
    return trimmed.split(',').map((x: string) => x.trim()).filter(Boolean);
  }
  return [];
};

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
    case 'c1':
      return <Cpu className={className} />;
    case 'c2':
      return <Shirt className={className} />;
    case 'c3':
      return <HomeIcon className={className} />;
    case 'c4':
      return <Sparkles className={className} />;
    case 'c7':
      return <Heart className={className} />;
    case 'c5':
      return <ShoppingBag className={className} />;
    case 'c6':
      return <Trophy className={className} />;
    default:
      return <Layers className={className} />;
  }
}

export const ProductQuickView = ({ 
  selectedProduct, 
  setSelectedProduct, 
  setIsCheckoutOpen, 
  handleAddToCart,
  onBuyNow,
  onOpenCart,
  onOpenAiAdvisor,
  onOpenLogin,
  onOpenMenu,
  searchQuery,
  setSearchQuery,
  addToCart,
  selectedCategory,
  setSelectedCategory,
  categories: dynamicCategories = [],
  onToggleWishlist,
  isWishlisted: propIsWishlisted,
  authUser: propAuthUser,
  onLogout: propOnLogout,
  onOpenWishlist,
  onOpenMyOrders,
  cart: propCart = [],
  wishlist: propWishlist = []
}: any) => {
  const navigate = useNavigate();
  const auth = useAuth();
  const authUser = propAuthUser !== undefined ? propAuthUser : auth.authUser;
  const onLogout = propOnLogout || auth.logout;
  const onOpenLoginHandler = onOpenLogin || auth.openLoginModal;
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const cartCount = useMemo(() => {
    if (!Array.isArray(propCart)) return 0;
    return propCart.reduce((total: number, item: any) => total + (item?.quantity || 1), 0);
  }, [propCart]);

  const wishlistCount = useMemo(() => {
    if (Array.isArray(propWishlist)) return propWishlist.length;
    return 0;
  }, [propWishlist]);

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isWishlisted, setIsWishlisted] = useState(!!propIsWishlisted);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const pdpCategoryScrollRef = React.useRef<HTMLDivElement>(null);

  const availableColors = useMemo(() => normalizeList(selectedProduct?.colors), [selectedProduct?.colors]);
  const availableSizes = useMemo(() => normalizeList(selectedProduct?.sizes), [selectedProduct?.sizes]);

  // Reset quantity and state when product changes
  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1);
      const colors = normalizeList(selectedProduct.colors);
      const sizes = normalizeList(selectedProduct.sizes);
      setSelectedColor(colors.length > 0 ? colors[0] : '');
      setSelectedSize(sizes.length > 0 ? sizes[0] : '');
      setActiveImageIdx(0);
      setIsWishlisted(!!propIsWishlisted);
      setIsDescExpanded(false);
      // Set scroll lock
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedProduct, propIsWishlisted]);

  if (!selectedProduct) return null;

  const productImages = selectedProduct.images || [selectedProduct.image];
  const stockNum = typeof selectedProduct.stock === 'number' ? selectedProduct.stock : Number(selectedProduct.stock || 0);
  const maxStock = stockNum > 0 ? stockNum : 99;
  const isOutOfStock = stockNum <= 0;
  const isLowStock = stockNum > 0 && stockNum <= 5;

  const handleIncrement = () => {
    setQuantity(prev => (prev < maxStock ? prev + 1 : prev));
  };

  const handleDecrement = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    if (window.location.pathname.startsWith('/product/')) {
      navigate('/');
    }
  };

  const handleBuyNow = () => {
    if (onBuyNow) {
      onBuyNow(selectedProduct, quantity, selectedSize, selectedColor);
    } else {
      setSelectedProduct(null);
      setIsCheckoutOpen(true);
      navigate('/checkout');
    }
  };

  const handleAddToCartClick = () => {
    handleAddToCart(selectedProduct, quantity, selectedSize, selectedColor);
  };

  const handleCategoryClick = (catId: string) => {
    if (setSelectedCategory) {
      setSelectedCategory(catId);
    }
    let targetPath = '/';
    if (catId && catId !== 'all') {
      const catObj = Array.isArray(dynamicCategories) ? dynamicCategories.find((c: any) => c.id === catId) : null;
      const slug = catObj?.slug || (catObj?.name ? catObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : catId);
      targetPath = `/${slug}`;
    }
    navigate(targetPath);
    setSelectedProduct(null);
    setTimeout(() => {
      const section = document.getElementById('products-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const displayCategories = [
    { id: 'all', name: 'All' },
    ...(Array.isArray(dynamicCategories) ? dynamicCategories : [])
  ];

  const originalPrice = selectedProduct.price || 0;
  const currentPrice = selectedProduct.discountPrice || originalPrice;
  const discountPercent = originalPrice > currentPrice 
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) 
    : 0;
  const savings = originalPrice - currentPrice;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-white overflow-y-auto overflow-x-hidden"
      >
        <div className="sticky top-0 z-[101] bg-white shadow-xs hover:shadow-md transition-shadow duration-500">
          {/* Identical Sticky Header and Categories Navigation Bar */}
          <header className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2">
            {/* Top Single Row: Hamburger + Logo on Left, Search in Center (Desktop), Action Icons on Right */}
            <div className="flex items-center justify-between gap-1 sm:gap-4 w-full">
              <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMenu && onOpenMenu();
                  }}
                  className="p-1.5 -ml-1 text-slate-700 hover:bg-orange-50 hover:text-[#f85606] rounded-full transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer shrink-0"
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div className="text-[#f85606] font-black text-lg sm:text-2xl tracking-tighter flex items-center gap-1 sm:gap-1.5 cursor-pointer transition-all duration-300 ease-out hover:scale-105 active:scale-95 group shrink-0" onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryClick('all');
                }}>
                  <ShoppingBag className="w-5 h-5 sm:w-7 sm:h-7 text-[#f85606] transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110 shrink-0" />
                  <h1 className="text-base sm:text-2xl font-black m-0 p-0 inline text-[#f85606]">BazaarPulse</h1>
                </div>
              </div>

              {/* Desktop Search Bar */}
              <div className="hidden sm:flex flex-1 max-w-2xl items-center mx-2">
                <div className="w-full relative flex">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSelectedProduct(null);
                        navigate('/');
                        setTimeout(() => {
                          const section = document.getElementById('products-section');
                          if (section) section.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }
                    }}
                    className="w-full bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg py-2 px-3 text-sm focus:outline-none focus:bg-white text-gray-900"
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(null);
                      navigate('/');
                      setTimeout(() => {
                        const section = document.getElementById('products-section');
                        if (section) section.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="bg-[#f85606] hover:bg-[#e04d05] text-white px-6 rounded-r-lg flex items-center justify-center transition-all duration-300 ease-out active:scale-95 cursor-pointer"
                  >
                    <Search className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  </button>
                </div>
              </div>

              {/* Right Action Icons */}
              <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCart && onOpenCart();
                  }}
                  className="relative p-1.5 sm:p-2 text-gray-700 hover:text-[#f85606] transition-all duration-300 ease-out hover:bg-orange-50 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 rounded-full flex items-center justify-center cursor-pointer shrink-0"
                  title="Shopping Cart"
                >
                  <ShoppingCart className="w-5 h-5 sm:w-7 sm:h-7" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#f85606] text-white text-[10px] w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center font-bold border-2 border-white sm:border-0">
                      {cartCount}
                    </span>
                  )}
                </button>
                <div className="relative shrink-0">
                  {authUser ? (
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsProfileDropdownOpen(prev => !prev);
                        }}
                        className="flex items-center gap-1 p-0.5 sm:p-1.5 rounded-full border border-slate-200 hover:border-orange-500/50 bg-white hover:bg-orange-50/40 transition-all duration-300 ease-out shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 hover:scale-105 group cursor-pointer shrink-0"
                        title={authUser.name}
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-orange-500/30 shadow-xs bg-slate-100 flex items-center justify-center">
                          {authUser.avatar ? (
                            <img src={authUser.avatar} alt={authUser.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                          )}
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-orange-600 transition-transform duration-200 pr-0.5 ${isProfileDropdownOpen ? 'rotate-180 text-orange-600' : ''}`} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLoginHandler();
                      }}
                      className="flex items-center gap-1.5 hover:bg-orange-50/40 p-1 sm:p-1.5 rounded-full transition-all duration-300 ease-out border border-slate-200 hover:border-orange-500/50 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 hover:scale-105 cursor-pointer shrink-0"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" /></div>
                    </button>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseModal();
                  }}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200 cursor-pointer shrink-0"
                  title="Close"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* Mobile Search Bar Row */}
            <div className="sm:hidden w-full mt-2 pt-0.5 px-0.5">
              <div className="w-full relative flex">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSelectedProduct(null);
                      navigate('/');
                      setTimeout(() => {
                        const section = document.getElementById('products-section');
                        if (section) section.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                  }}
                  className="w-full bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg py-1.5 px-3 text-xs focus:outline-none focus:bg-white text-gray-900"
                />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProduct(null);
                    navigate('/');
                    setTimeout(() => {
                      const section = document.getElementById('products-section');
                      if (section) section.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="bg-[#f85606] hover:bg-[#e04d05] text-white px-3.5 rounded-r-lg flex items-center justify-center transition-all duration-300 ease-out active:scale-95 cursor-pointer"
                >
                  <Search className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                </button>
              </div>
            </div>
          </div>
        </header>

          {/* Categories Bar */}
          <div className="relative bg-white border-b border-gray-100 py-1.5 group/pbar">
          <button 
            onClick={() => pdpCategoryScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' })} 
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/95 border border-slate-100 shadow-md text-slate-700 hover:text-[#f85606] transition-all opacity-0 group-hover/pbar:opacity-100 scale-90 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button 
            onClick={() => pdpCategoryScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' })} 
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/95 border border-slate-100 shadow-md text-slate-700 hover:text-[#f85606] transition-all opacity-0 group-hover/pbar:opacity-100 scale-90 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div ref={pdpCategoryScrollRef} className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center gap-3 sm:gap-4 overflow-x-auto py-1 scrollbar-none scroll-smooth">
            {displayCategories.map((cat: any, index: number) => (
              <button
                key={`pdp-${cat.id}-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCategoryClick(cat.id);
                }}
                className={`whitespace-nowrap px-4 sm:px-5.5 py-2 rounded-full border text-xs sm:text-sm font-semibold transition-all duration-300 ease-out inline-flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${selectedCategory === cat.id ? 'bg-[#f85606] text-white border-[#f85606] shadow-md shadow-orange-500/20 scale-105' : 'bg-white text-gray-700 border-gray-100 hover:border-[#f85606] hover:text-[#f85606]'}`}
              >
                {cat.id !== 'all' && <CategoryIcon categoryId={cat.id} className="w-3.5 h-3.5 sm:w-4 h-4" />}
                {cat.id === 'all' && <Layers className="w-3.5 h-3.5 sm:w-4 h-4" />}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Content */}
        <div className="max-w-7xl mx-auto p-4 sm:p-8 pb-32 sm:pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12">
            <div className="space-y-4">
              <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden relative border border-gray-100 shadow-inner">
                <img 
                  src={productImages[activeImageIdx] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} 
                  alt={selectedProduct.title} 
                  className="w-full h-full object-cover transition-all duration-300" 
                  onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'; }}
                />
                {discountPercent > 0 && (
                  <div className="absolute top-4 left-4 z-10 bg-[#e53935] text-white rounded-2xl w-12 h-12 sm:w-14 sm:h-14 flex flex-col items-center justify-center shadow-md select-none border border-red-400/30">
                    <span className="text-sm sm:text-base font-black leading-none">
                      {discountPercent}%
                    </span>
                    <span className="text-[9px] sm:text-[11px] font-black tracking-wider uppercase mt-0.5 leading-none">
                      OFF
                    </span>
                  </div>
                )}
              </div>
              {productImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {productImages.map((img: string, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${activeImageIdx === idx ? 'border-[#f85606] shadow-sm' : 'border-transparent'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2.5 sm:gap-3">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {selectedProduct.title}
              </h1>
              <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500 font-medium">
                <div className="flex items-center gap-1 text-yellow-500 font-bold"><Star className="w-3.5 h-3.5 fill-current" /> 4.8 (128 Reviews)</div>
                <div className="text-gray-900 font-bold flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> <span className="text-[#f85606] underline cursor-pointer">{selectedProduct.vendorName || 'Bazaar Pulse Official'}</span></div>
              </div>
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <span className="text-3xl sm:text-4xl font-black text-[#f85606] tracking-tighter">৳{currentPrice}</span>
                {originalPrice > currentPrice && (
                  <span className="text-lg sm:text-xl text-gray-400 line-through font-medium">৳{originalPrice}</span>
                )}
                {savings > 0 && (
                  <span className="text-[10px] sm:text-sm text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 inline-flex items-center">
                    You Save ৳{savings}
                  </span>
                )}
              </div>
              <div className="space-y-1 pb-1">
                {isOutOfStock ? (
                  <p className="text-red-500 font-bold text-sm flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white shrink-0 text-[10px] font-bold">✕</span>
                    <span>Out of Stock</span>
                  </p>
                ) : isLowStock ? (
                  <p className="font-semibold text-sm flex items-center gap-1.5 flex-wrap">
                    <span className="w-4 h-4 rounded-full bg-[#22c55e] flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                    </span>
                    <span className="text-slate-900 font-bold">In Stock</span>
                    <span className="text-slate-400 font-normal">-</span>
                    <span className="text-red-600 font-black">only {stockNum} pieces left</span>
                  </p>
                ) : (
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#22c55e] flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                    </span>
                    <span className="text-slate-900 font-bold text-xs sm:text-sm">In Stock - Ready to Ship</span>
                  </p>
                )}
              </div>
              
              {/* Variation Selectors */}
              <div className="space-y-4 pt-2">
                {availableColors.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wider">Color: <span className="text-orange-600">{selectedColor}</span></p>
                    <div className="flex gap-2 flex-wrap">
                      {availableColors.map((color: string) => (
                        <button 
                          key={color} 
                          onClick={() => setSelectedColor(color)}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 border-2 rounded-xl text-xs sm:text-sm font-black transition-all ${selectedColor === color ? 'border-[#f85606] bg-orange-50 text-[#f85606] shadow-sm' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'}`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {availableSizes.length > 0 && (
                  <div className="space-y-2">
                    <p className="font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wider">Size: <span className="text-orange-600">{selectedSize}</span></p>
                    <div className="flex gap-2 flex-wrap">
                      {availableSizes.map((size: string) => (
                        <button 
                          key={size} 
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-[44px] sm:min-w-[50px] h-10 sm:h-11 border-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center ${selectedSize === size ? 'border-[#f85606] bg-orange-50 text-[#f85606] shadow-sm' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity and Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
                <div className="flex flex-col gap-2">
                  <p className="font-bold text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest">Quantity:</p>
                  <div className="inline-flex items-center border-2 border-gray-100 rounded-2xl overflow-hidden bg-gray-50 shadow-inner">
                    <button 
                      onClick={handleDecrement} 
                      className="p-2.5 sm:p-3 hover:bg-white text-slate-600 transition-all disabled:opacity-40"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-5 sm:px-6 font-black text-base sm:text-lg min-w-[3rem] text-center text-slate-900 select-none">{quantity}</span>
                    <button 
                      onClick={handleIncrement} 
                      className="p-2.5 sm:p-3 hover:bg-white text-slate-600 transition-all disabled:opacity-40"
                      disabled={quantity >= maxStock}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="hidden sm:flex flex-1 items-center gap-3 w-full self-end">
                  <button 
                    onClick={handleBuyNow} 
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 cursor-pointer uppercase tracking-wider text-sm"
                  >
                    Buy Now
                  </button>
                  <button 
                    onClick={handleAddToCartClick} 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer uppercase tracking-wider text-sm"
                  >
                    <ShoppingCart className="w-5 h-5" /> Add to Cart
                  </button>
                </div>
              </div>

              {/* Mobile Sticky Actions */}
              <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[110] bg-white border-t border-gray-100 p-4 flex gap-3 shadow-[0_-8px_20px_rgba(0,0,0,0.08)]">
                <button 
                  onClick={handleAddToCartClick} 
                  className="flex-1 bg-white border-2 border-blue-600 text-blue-600 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs uppercase tracking-wider"
                >
                  <ShoppingCart className="w-4 h-4" /> Cart
                </button>
                <button 
                  onClick={handleBuyNow} 
                  className="flex-[1.5] bg-orange-500 text-white font-black py-3.5 rounded-xl active:scale-95 transition-all text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25"
                >
                  Buy Now
                </button>
              </div>

              {/* Wishlist Button */}
              <div className="pt-2">
                <button 
                  onClick={() => {
                    setIsWishlisted(!isWishlisted);
                    if (onToggleWishlist && selectedProduct) {
                      onToggleWishlist(selectedProduct);
                    }
                  }} 
                  className="inline-flex items-center gap-2.5 py-2.5 px-4 text-slate-700 hover:text-red-600 transition-all duration-300 ease-out border border-slate-100 hover:border-red-100 bg-slate-50/50 hover:bg-red-50/40 rounded-xl hover:scale-105 active:scale-95 group cursor-pointer select-none"
                >
                  <Heart className={`w-5 h-5 transition-transform duration-300 ease-out group-hover:scale-115 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-slate-400 group-hover:text-red-500'}`} />
                  <span className={`text-sm font-black transition-colors ${isWishlisted ? 'text-red-600' : 'text-slate-800'}`}>
                    {isWishlisted ? 'পছন্দের তালিকায় যুক্ত রয়েছে' : 'পছন্দের তালিকায় রাখুন'}
                  </span>
                </button>
              </div>

              {/* Description */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest mb-2">Product Description</h3>
                <div className={`text-[13px] sm:text-base text-slate-700 transition-all leading-relaxed ${isDescExpanded ? '' : 'line-clamp-3'}`}>
                  {selectedProduct.description || `${selectedProduct.title} - এটি একটি প্রিমিয়াম কোয়ালিটিসম্পন্ন এবং দীর্ঘস্থায়ী পণ্য। আমাদের বিশেষ কালেকশন থেকে এটি আকর্ষণীয় মূল্যে সংগ্রহ করতে পারেন। এটি আপনার দৈনন্দিন জীবনে আরামদায়ক অভিজ্ঞতা ও আভিজাত্য এনে দেবে। আজই অর্ডার করুন বাজার প্লাস থেকে এবং উপভোগ করুন দ্রুততম ক্যাশ অন ডেলিভারি সুবিধা!`}
                </div>
                <button
                  type="button"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="mt-2 text-blue-600 hover:text-blue-800 font-black text-xs sm:text-sm cursor-pointer flex items-center gap-1"
                >
                  {isDescExpanded ? 'See less' : 'Read full description...'}
                </button>
              </div>
            </div>
          </div>

          {/* Product Reviews Section */}
          <div className="mt-12 sm:mt-16">
            <ProductReviewWidget 
              productId={selectedProduct.id} 
              productTitle={selectedProduct.title} 
              authUser={authUser} 
              onOpenLogin={onOpenLogin} 
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
