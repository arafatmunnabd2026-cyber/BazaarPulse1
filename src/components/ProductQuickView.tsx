import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Search, ShoppingCart, Sparkles, Star, Package, Heart, Minus, Plus, Check, Menu, Bell, User, Layers, Cpu, Shirt, Home as HomeIcon, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  addToCart,
  selectedCategory,
  setSelectedCategory,
  categories: dynamicCategories = [],
  onToggleWishlist,
  isWishlisted: propIsWishlisted
}: any) => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [isWishlisted, setIsWishlisted] = useState(!!propIsWishlisted);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
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
      if (selectedCategory && selectedCategory !== 'all') {
        const catObj = displayCategories.find((c: any) => c.id === selectedCategory);
        const slug = catObj?.slug || (catObj?.name ? catObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : selectedCategory);
        navigate(`/${slug}`);
      } else {
        navigate('/');
      }
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
    setSelectedProduct(null);
    setSelectedCategory(catId);

    let newPath = '/';
    if (catId && catId !== 'all') {
      const catObj = displayCategories.find((c: any) => c.id === catId);
      const slug = catObj?.slug || (catObj?.name ? catObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : catId);
      newPath = `/${slug}`;
    }
    navigate(newPath);

    // Scroll to products section
    const productsSection = document.getElementById('products-section');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
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
        className="fixed inset-0 z-[100] bg-white overflow-y-auto"
      >
        {/* Identical Sticky Header and Categories Navigation Bar */}
        <header className="bg-white shadow-xs hover:shadow-md transition-shadow duration-500 sticky top-0 z-[101] border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleCloseModal}
                className="p-2 -ml-2 text-slate-700 hover:bg-orange-50 hover:text-[#f85606] rounded-full transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer"
                title="Back to Storefront"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="text-[#f85606] font-black text-2xl tracking-tighter flex items-center gap-1.5 cursor-pointer transition-all duration-300 ease-out hover:scale-105 active:scale-95 group" onClick={handleCloseModal}>
                <ShoppingBag className="w-7 h-7 text-[#f85606] transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110" />
                <span className="text-2xl font-black m-0 p-0 inline text-[#f85606]">BazaarPulse</span>
              </div>
            </div>

            <div className="flex-1 max-w-2xl flex items-center">
              <div className="w-full relative flex">
                <input
                  type="text"
                  placeholder="Search in BazaarPulse..."
                  disabled
                  className="w-full bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg py-2.5 px-4 text-sm text-gray-400 cursor-not-allowed select-none"
                />
                <button disabled className="bg-[#f85606]/80 text-white px-6 rounded-r-lg flex items-center justify-center cursor-not-allowed">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Shopping Cart Button */}
              <button
                onClick={handleCloseModal}
                className="relative p-2 text-gray-700 hover:text-[#f85606] transition-all duration-300 ease-out hover:bg-orange-50 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 rounded-full flex items-center justify-center cursor-pointer"
                title="Shopping Cart"
              >
                <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>

              {/* Notification Button */}
              <button
                onClick={handleCloseModal}
                className="relative p-2 text-gray-700 hover:text-[#f85606] transition-all duration-300 ease-out flex items-center justify-center rounded-full hover:bg-orange-50 hover:scale-110 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-6 h-6" />
              </button>

              <button
                onClick={handleCloseModal}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-all duration-300 ease-out hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI Advisor</span>
              </button>

              <button
                onClick={handleCloseModal}
                className="flex items-center gap-2 hover:bg-orange-50/40 p-1.5 rounded-full transition-all duration-300 ease-out border border-slate-200 hover:border-orange-500/50 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 hover:scale-105 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div className="hidden md:flex flex-col items-start leading-tight pr-2 text-left">
                  <span className="text-sm font-semibold text-slate-600">Login / Sign Up</span>
                </div>
              </button>

              {/* PDP Dismissal Button */}
              <button 
                onClick={handleCloseModal} 
                className="p-2 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-full transition-all duration-300 ease-out hover:scale-110 active:scale-95 cursor-pointer"
                aria-label="Close details"
                title="Close"
              >
                <X className="w-5.5 h-5.5" />
              </button>
            </div>
          </div>

          {/* Categories Bar inside PDP */}
          <div className="bg-white border-t border-gray-100 py-1.5 shadow-xs relative group/pbar">
            {/* Left Chevron Button - hidden by default, visible on hover */}
            <button
              onClick={() => {
                pdpCategoryScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' });
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/95 border border-slate-100 shadow-md text-slate-700 hover:text-[#f85606] transition-all opacity-0 group-hover/pbar:opacity-100 scale-90 hover:scale-105 active:scale-95 cursor-pointer"
              title="Scroll Left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Right Chevron Button - hidden by default, visible on hover */}
            <button
              onClick={() => {
                pdpCategoryScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/95 border border-slate-100 shadow-md text-slate-700 hover:text-[#f85606] transition-all opacity-0 group-hover/pbar:opacity-100 scale-90 hover:scale-105 active:scale-95 cursor-pointer"
              title="Scroll Right"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div 
              ref={pdpCategoryScrollRef}
              className="max-w-7xl mx-auto px-8 flex items-center gap-4 overflow-x-auto py-1 scrollbar-none scroll-smooth"
            >
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  handleCategoryClick('all');
                }}
                className={`whitespace-nowrap px-5.5 py-2 rounded-full border text-sm font-semibold transition-all duration-300 ease-out inline-flex items-center gap-2 cursor-pointer select-none shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
                  selectedCategory === 'all' 
                    ? 'bg-[#f85606] text-white border-[#f85606] shadow-md shadow-orange-500/20 scale-105' 
                    : 'bg-white text-gray-700 border-gray-100 hover:border-[#f85606] hover:text-[#f85606]'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>All</span>
              </a>
              {displayCategories.filter((c: any) => c.id !== 'all').map((cat: any) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <a
                    key={cat.id}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleCategoryClick(cat.id);
                    }}
                    className={`whitespace-nowrap px-5.5 py-2 rounded-full border text-sm font-semibold transition-all duration-300 ease-out inline-flex items-center gap-2 cursor-pointer select-none shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
                      isSelected 
                        ? 'bg-[#f85606] text-white border-[#f85606] shadow-md shadow-orange-500/20 scale-105' 
                        : 'bg-white text-gray-700 border-gray-100 hover:border-[#f85606] hover:text-[#f85606]'
                    }`}
                  >
                    <CategoryIcon categoryId={cat.id} className="w-4 h-4" />
                    <span>{cat.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </header>

        {/* Modal Content */}
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative border border-gray-100">
                <img 
                  src={productImages[activeImageIdx] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} 
                  alt={selectedProduct.title} 
                  className="w-full h-full object-cover transition-all duration-300"
                  onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'; }}
                />
                {discountPercent > 0 && (
                  <div className="absolute top-4 left-4 z-10 bg-[#e53935] text-white rounded-2xl w-14 h-14 flex flex-col items-center justify-center shadow-md select-none border border-red-400/30">
                    <span className="text-base font-black leading-none">
                      {discountPercent}%
                    </span>
                    <span className="text-[11px] font-black tracking-wider uppercase mt-0.5 leading-none">
                      OFF
                    </span>
                  </div>
                )}
              </div>
              {productImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {productImages.map((img: string, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-20 h-20 bg-gray-100 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${activeImageIdx === idx ? 'border-[#f85606]' : 'border-transparent'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-4">
              <h1 className="text-3xl font-extrabold text-gray-900">{selectedProduct.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1 text-yellow-500"><Star className="w-4 h-4 fill-current" /> 4.8 (128 Reviews)</div>
                <div className="text-gray-900 font-bold">Vendor: <span className="text-[#f85606] underline cursor-pointer">{selectedProduct.vendorName || 'Bazaar Store'}</span></div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-4xl font-black text-[#f85606]">৳{currentPrice}</span>
                {originalPrice > currentPrice && (
                  <span className="text-xl text-gray-400 line-through font-medium">৳{originalPrice}</span>
                )}
                {savings > 0 && (
                  <span className="text-xs sm:text-sm text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200 inline-flex items-center">
                    You Save ৳{savings}
                  </span>
                )}
              </div>
              <div className="space-y-1">
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
                    <span className="text-slate-900 font-bold">In Stock</span>
                  </p>
                )}
                {!isOutOfStock && (
                  <p className="text-xs text-black font-bold tracking-tight">
                    * স্টক আউট হওয়ার আগেই অর্ডার করুন
                  </p>
                )}
              </div>
              
              {/* Color Selector - only displayed if Admin or Vendor has specified colors */}
              {availableColors.length > 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-sm">Color: <span className="text-gray-500 font-normal">{selectedColor}</span></p>
                  <div className="flex gap-2 flex-wrap">
                    {availableColors.map((color: string) => (
                      <button 
                        key={color} 
                        onClick={() => setSelectedColor(color)}
                        className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-all ${selectedColor === color ? 'border-[#f85606] bg-orange-50 text-[#f85606]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector - only displayed if Admin or Vendor has specified sizes */}
              {availableSizes.length > 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-sm">Size: <span className="text-gray-500 font-normal">{selectedSize}</span></p>
                  <div className="flex gap-2 flex-wrap">
                    {availableSizes.map((size: string) => (
                      <button 
                        key={size} 
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-all ${selectedSize === size ? 'border-[#f85606] bg-orange-50 text-[#f85606]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector - Separate Section */}
              <div className="space-y-2 pt-1">
                <p className="font-bold text-sm text-gray-700">Quantity:</p>
                <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                  <button 
                    onClick={handleDecrement} 
                    className="p-2.5 px-3.5 hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-40"
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-5 font-bold text-base min-w-[2.5rem] text-center text-gray-900 select-none">{quantity}</span>
                  <button 
                    onClick={handleIncrement} 
                    className="p-2.5 px-3.5 hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-40"
                    disabled={quantity >= maxStock}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={handleBuyNow} 
                  className="flex-1 bg-[#f8981d] hover:bg-[#e68a1a] text-white font-bold py-3.5 rounded-lg shadow-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] active:translate-y-0 cursor-pointer"
                >
                  Buy Now
                </button>
                <button 
                  onClick={handleAddToCartClick} 
                  className="flex-1 bg-[#007bff] hover:bg-[#0069d9] text-white font-bold py-3.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] active:translate-y-0 cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                </button>
              </div>

              {/* Wishlist Button - Placed below Buy Now row matching reference image */}
              <div className="pt-2">
                <button 
                  onClick={() => {
                    setIsWishlisted(!isWishlisted);
                    if (onToggleWishlist && selectedProduct) {
                      onToggleWishlist(selectedProduct);
                    }
                  }} 
                  className="inline-flex items-center gap-2.5 py-2.5 px-4 text-slate-700 hover:text-red-600 transition-all duration-300 ease-out border border-transparent hover:border-red-100 hover:bg-red-50/40 rounded-xl hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 group cursor-pointer select-none"
                  aria-label="Wishlist toggle"
                >
                  <Heart className={`w-5 h-5 transition-transform duration-300 ease-out group-hover:scale-115 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-slate-400 group-hover:text-red-500'}`} />
                  <span className={`text-sm font-semibold transition-colors ${isWishlisted ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                    {isWishlisted ? 'পছন্দের তালিকায় যুক্ত রয়েছে' : 'পছন্দের তালিকায় রাখুন'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
