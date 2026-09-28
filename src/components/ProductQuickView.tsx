import React, { useState, useMemo } from 'react';
import { 
  X, Star, Heart, ShoppingCart, Store, User, Layers, 
  Sparkles, CheckCircle2, Plus, ArrowRight, BookOpen, 
  TrendingUp, Tag, ShieldCheck, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ProductQuickView = ({ 
  selectedProduct, 
  setSelectedProduct, 
  allProducts = [],
  allOrders = [],
  activeImageIdx, 
  setActiveImageIdx, 
  selectedSize, 
  setSelectedSize, 
  selectedColor, 
  setSelectedColor, 
  productQty, 
  setProductQty, 
  handleAddToCart, 
  addToCart,
  notify 
}: any) => {
  const [activeRecTab, setActiveRecTab] = useState<'collaborative' | 'author_brand' | 'category'>('collaborative');
  const [bundleSelected, setBundleSelected] = useState<Record<string, boolean>>({});

  // -------------------------------------------------------------
  // 1. Category & Sub-category Filtering
  // -------------------------------------------------------------
  const categoryRecommendations = useMemo(() => {
    if (!selectedProduct || !Array.isArray(allProducts)) return [];
    
    return allProducts
      .filter((p: any) => {
        if (!p || p.id === selectedProduct.id) return false;
        
        const sameCategory = 
          (selectedProduct.categoryId && p.categoryId === selectedProduct.categoryId) ||
          (selectedProduct.categoryName && p.categoryName && p.categoryName.toLowerCase() === selectedProduct.categoryName.toLowerCase());
          
        const sameSubCategory = 
          Boolean(selectedProduct.subCategory && p.subCategory && p.subCategory.toLowerCase() === selectedProduct.subCategory.toLowerCase()) ||
          Boolean(selectedProduct.subCategoryId && p.subCategoryId === selectedProduct.subCategoryId);

        return sameCategory || sameSubCategory;
      })
      .sort((a: any, b: any) => (b.totalSold || 0) - (a.totalSold || 0) || (b.rating || 0) - (a.rating || 0))
      .slice(0, 8);
  }, [selectedProduct, allProducts]);

  // -------------------------------------------------------------
  // 2. Author / Brand Matching
  // -------------------------------------------------------------
  const authorBrandRecommendations = useMemo(() => {
    if (!selectedProduct || !Array.isArray(allProducts)) return [];
    
    const prodAuthor = selectedProduct.author || selectedProduct.authorName || selectedProduct.writer;
    const prodBrand = selectedProduct.vendorName || selectedProduct.brand || selectedProduct.storeName;

    return allProducts
      .filter((p: any) => {
        if (!p || p.id === selectedProduct.id) return false;

        const pAuthor = p.author || p.authorName || p.writer;
        const pBrand = p.vendorName || p.brand || p.storeName;

        const authorMatch = prodAuthor && pAuthor && prodAuthor.trim().toLowerCase() === pAuthor.trim().toLowerCase();
        const brandMatch = prodBrand && pBrand && prodBrand.trim().toLowerCase() === pBrand.trim().toLowerCase();
        const vendorIdMatch = selectedProduct.vendorId && p.vendorId === selectedProduct.vendorId;

        return authorMatch || brandMatch || vendorIdMatch;
      })
      .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 8);
  }, [selectedProduct, allProducts]);

  // -------------------------------------------------------------
  // 3. User Collaborative Filtering (Advanced)
  // "Customers Who Bought This Also Bought" & Co-occurrence Matrix
  // -------------------------------------------------------------
  const collaborativeRecommendations = useMemo(() => {
    if (!selectedProduct || !Array.isArray(allProducts)) return [];

    const coOccurrenceMap: Record<string, number> = {};

    // Analyze order history for co-purchased items
    if (Array.isArray(allOrders) && allOrders.length > 0) {
      allOrders.forEach((order: any) => {
        const orderItems = order.items || order.orderItems || [];
        const hasCurrentProduct = orderItems.some((item: any) => 
          item.productId === selectedProduct.id || item.product_id === selectedProduct.id || item.id === selectedProduct.id
        );

        if (hasCurrentProduct) {
          orderItems.forEach((item: any) => {
            const otherId = String(item.productId || item.product_id || item.id);
            if (otherId && otherId !== String(selectedProduct.id)) {
              coOccurrenceMap[otherId] = (coOccurrenceMap[otherId] || 0) + 1;
            }
          });
        }
      });
    }

    const coPurchasedProducts = allProducts.filter((p: any) => p && p.id !== selectedProduct.id && coOccurrenceMap[String(p.id)]);
    
    // Sort by real purchase co-occurrence frequency
    coPurchasedProducts.sort((a: any, b: any) => (coOccurrenceMap[String(b.id)] || 0) - (coOccurrenceMap[String(a.id)] || 0));

    // Fallback: If not enough direct co-purchase order history exists,
    // apply algorithmic collaborative affinity scoring (matching complementary categories, price affinity & rating)
    if (coPurchasedProducts.length < 4) {
      const fallbackSet = new Set(coPurchasedProducts.map((p: any) => p.id));
      const currentPrice = selectedProduct.discountPrice || selectedProduct.price || 100;

      const smartAffinityProducts = allProducts
        .filter((p: any) => {
          if (!p || p.id === selectedProduct.id || fallbackSet.has(p.id)) return false;
          return true;
        })
        .map((p: any) => {
          let score = 0;
          const pPrice = p.discountPrice || p.price || 100;
          
          // Same category affinity
          if (p.categoryId === selectedProduct.categoryId || p.categoryName === selectedProduct.categoryName) score += 30;
          
          // Price affinity (within realistic complementary basket range)
          const priceRatio = Math.min(currentPrice, pPrice) / Math.max(currentPrice, pPrice);
          score += priceRatio * 20;

          // Social proof (rating & sold count)
          score += (p.rating || 4) * 4;
          score += Math.min((p.totalSold || 0) / 10, 15);

          return { product: p, score };
        })
        .sort((a, b) => b.score - a.score)
        .map(item => item.product);

      return [...coPurchasedProducts, ...smartAffinityProducts].slice(0, 8);
    }

    return coPurchasedProducts.slice(0, 8);
  }, [selectedProduct, allProducts, allOrders]);

  // Frequently Bought Together Bundle item
  const bundleComplementaryItem = collaborativeRecommendations[0] || categoryRecommendations[0] || null;
  const isBundleItemChecked = bundleComplementaryItem ? (bundleSelected[bundleComplementaryItem.id] ?? true) : false;

  const currentItemPrice = selectedProduct?.discountPrice || selectedProduct?.price || 0;
  const bundleItemPrice = bundleComplementaryItem ? (bundleComplementaryItem.discountPrice || bundleComplementaryItem.price || 0) : 0;
  const totalBundlePrice = currentItemPrice + (isBundleItemChecked && bundleComplementaryItem ? bundleItemPrice : 0);
  const totalOriginalPrice = (selectedProduct?.price || currentItemPrice) + (isBundleItemChecked && bundleComplementaryItem ? (bundleComplementaryItem.price || bundleItemPrice) : 0);
  const bundleSavings = Math.max(0, totalOriginalPrice - totalBundlePrice);

  const switchProductView = (newProduct: any) => {
    setSelectedProduct(newProduct);
    if (setActiveImageIdx) setActiveImageIdx(0);
    if (setSelectedSize) setSelectedSize('');
    if (setSelectedColor) setSelectedColor('');
    if (setProductQty) setProductQty(1);
  };

  const handleAddBundleToCart = () => {
    if (!selectedProduct) return;
    // 1. Add main product
    const hasSizes = Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0;
    const hasColors = Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0;
    if (hasSizes && !selectedSize) { notify('⚠️ অনুগ্রহ করে প্রথমে সাইজ নির্বাচন করুন'); return; }
    if (hasColors && !selectedColor) { notify('⚠️ অনুগ্রহ করে প্রথমে কালার নির্বাচন করুন'); return; }

    if (handleAddToCart) {
      handleAddToCart(selectedProduct, productQty || 1, selectedSize, selectedColor);
    } else if (addToCart) {
      addToCart(selectedProduct, productQty || 1, selectedSize, selectedColor);
    }

    // 2. Add bundle complementary product if selected
    if (bundleComplementaryItem && isBundleItemChecked) {
      const bSizes = Array.isArray(bundleComplementaryItem.sizes) ? bundleComplementaryItem.sizes[0] || '' : '';
      const bColors = Array.isArray(bundleComplementaryItem.colors) ? bundleComplementaryItem.colors[0] || '' : '';
      
      if (addToCart) {
        addToCart(bundleComplementaryItem, 1, bSizes, bColors);
      }
    }

    if (notify) {
      notify(`🛍️ বান্ডেল সফলভাবে কার্টে যুক্ত হয়েছে! মোট সাশ্রয় ৳${bundleSavings}`);
    }
  };

  const currentAuthor = selectedProduct?.author || selectedProduct?.authorName || selectedProduct?.writer;
  const currentBrand = selectedProduct?.vendorName || selectedProduct?.brand || 'Bazaar Store';

  // Active tab recommendation products list
  const activeRecommendations = 
    activeRecTab === 'collaborative' ? collaborativeRecommendations :
    activeRecTab === 'author_brand' ? authorBrandRecommendations :
    categoryRecommendations;

  if (!selectedProduct) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white w-full h-full sm:h-[92vh] sm:max-w-7xl sm:rounded-2xl shadow-2xl flex flex-col overflow-y-auto"
      >
        {/* PDP Sticky Header Bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 200 44" className="h-8 sm:h-9 w-auto select-none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(2, 2)">
                <path d="M6 14H34L37 38H3L6 14Z" stroke="#f85606" strokeWidth="3.5" strokeLinejoin="round" fill="none" />
                <path d="M12 14V10C12 5.58172 15.5817 2 20 2C24.4183 2 28 5.58172 28 10V14" stroke="#f85606" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M14 24C14 24 17 28 20 28C23 28 26 24 26 24" stroke="#f85606" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <text x="48" y="31" fill="#f85606" fontSize="23" fontWeight="900" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letterSpacing="-0.5px">BazaarPulse</text>
            </svg>
          </div>
          <button 
            onClick={() => setSelectedProduct(null)} 
            className="p-2 text-gray-500 hover:text-black rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close Modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PDP Scrollable Main Content Container */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Product Details Grid */}
          <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-gray-100">
            {/* Left Column: Gallery & Thumbnails */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="aspect-square bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden relative shadow-inner">
                <img 
                  src={selectedProduct?.images?.[activeImageIdx] || selectedProduct?.images?.[0] || selectedProduct?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} 
                  alt={selectedProduct?.title} 
                  className="w-full h-full object-cover" 
                />
                {selectedProduct?.discountPrice && (
                  <div className="absolute top-3.5 left-3.5 z-10 bg-[#e53935] text-white rounded-2xl w-14 h-14 flex flex-col items-center justify-center shadow-md select-none border border-red-400/30">
                    <span className="text-base font-black leading-none">
                      {Math.round(((selectedProduct.price - selectedProduct.discountPrice) / selectedProduct.price) * 100)}%
                    </span>
                    <span className="text-[11px] font-black tracking-wider uppercase mt-0.5 leading-none">
                      OFF
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {Array.isArray(selectedProduct?.images) && selectedProduct.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedProduct.images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all cursor-pointer ${
                        activeImageIdx === idx ? 'border-[#f85606] ring-2 ring-[#f85606]/20' : 'border-gray-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Middle Column: Details & Actions */}
            <div className="lg:col-span-7 flex flex-col gap-5 text-left">
              <div>
                {/* Brand / Author / Category Tag Pills */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {currentAuthor ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-900 px-2.5 py-1 rounded-md border border-amber-200">
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      লেখক: {currentAuthor}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-orange-50 text-[#f85606] px-2.5 py-1 rounded-md border border-orange-200">
                      <Store className="w-3.5 h-3.5" />
                      ব্র্যান্ড / শপ: {currentBrand}
                    </span>
                  )}
                  {selectedProduct.categoryName && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                      <Tag className="w-3 h-3 text-slate-500" />
                      {selectedProduct.categoryName}
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-black leading-snug">
                  {selectedProduct.title}
                </h1>
              </div>

              {/* Price Section */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#f85606]">
                    ৳{selectedProduct.discountPrice || selectedProduct.price}
                  </span>
                  {selectedProduct.discountPrice && (
                    <>
                      <span className="text-base text-red-500 line-through font-semibold">
                        ৳{selectedProduct.price}
                      </span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                        You Save ৳{selectedProduct.price - selectedProduct.discountPrice}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Variation Selectors */}
              {((Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0) || 
                (Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0)) && (
                <div className="space-y-4 py-2 border-b border-gray-100">
                  {/* Size Selector */}
                  {Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0 && (
                    <div>
                      <span className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider mb-2 block">
                        Select Size
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.sizes.map((size: string) => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`min-w-[45px] h-[35px] px-2.5 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              selectedSize === size 
                                ? 'border-[#f85606] bg-orange-50 text-[#f85606] ring-1 ring-[#f85606]' 
                                : 'border-gray-200 text-gray-700 hover:border-gray-400 bg-white'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color Selector */}
                  {Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0 && (
                    <div>
                      <span className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider block mb-2">
                        Select Color
                      </span>
                      <div className="flex flex-wrap gap-3">
                        {selectedProduct.colors.map((colorName: string) => {
                          const lowerColor = colorName.toLowerCase();
                          const isStandard = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'purple', 'orange', 'gray'].includes(lowerColor);
                          const style = isStandard ? {} : { backgroundColor: colorName };
                          return (
                            <button
                              key={colorName}
                              onClick={() => setSelectedColor(colorName)}
                              className={`group relative flex flex-col items-center gap-1 transition-all cursor-pointer ${
                                selectedColor === colorName ? 'scale-110' : 'hover:scale-105'
                              }`}
                            >
                              <div 
                                style={style}
                                className={`w-8 h-8 rounded-full border-2 ${
                                  selectedColor === colorName ? 'border-[#f85606] ring-2 ring-orange-100' : 'border-gray-200'
                                }`} 
                              />
                              <span className={`text-[10px] font-bold ${selectedColor === colorName ? 'text-[#f85606]' : 'text-gray-400'}`}>
                                {colorName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity Selector & Stock Status */}
              <div className="flex flex-col gap-2 py-1">
                <div className="flex items-center gap-6">
                  <span className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider">Quantity</span>
                  <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button 
                      onClick={() => setProductQty(Math.max(1, productQty - 1))} 
                      className="px-4 py-2 text-black hover:bg-gray-100 font-bold transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-5 py-2 font-extrabold text-sm text-black min-w-[50px] text-center">
                      {productQty}
                    </span>
                    <button 
                      onClick={() => setProductQty(productQty + 1)} 
                      className="px-4 py-2 text-black hover:bg-gray-100 font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {selectedProduct.stock > 0 ? (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600">
                        In Stock {selectedProduct.stock <= 5 ? `(only ${selectedProduct.stock} ${selectedProduct.stock === 1 ? 'piece' : 'pieces'} left)` : ''}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-red-600">Out of Stock</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <button
                  onClick={() => {
                    const hasSizes = Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0;
                    const hasColors = Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0;
                    if (hasSizes && !selectedSize) { notify('⚠️ Please select a size'); return; }
                    if (hasColors && !selectedColor) { notify('⚠️ Please select a color'); return; }
                    handleAddToCart(selectedProduct, productQty, selectedSize, selectedColor);
                  }}
                  className="bg-[#f85606] hover:bg-[#e64d05] text-white font-black py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                </button>
                <button 
                  onClick={() => notify(`❤️ "${selectedProduct.title.substring(0, 20)}..." added to Wishlist`)}
                  className="border border-gray-300 hover:border-gray-400 text-gray-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <Heart className="w-5 h-5" /> Wishlist
                </button>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Triple-Engine Product Recommendation System Tabs */}
          {/* ---------------------------------------------------------------- */}
          <div className="p-4 sm:p-8 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#f85606]" />
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
                  স্মার্ট প্রোডাক্ট রিকমেন্ডেশন (Recommendations)
                </h2>
              </div>

              {/* Recommendation Category Filter Switcher Tabs */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl overflow-x-auto text-xs font-bold">
                <button
                  onClick={() => setActiveRecTab('collaborative')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeRecTab === 'collaborative'
                      ? 'bg-white text-[#f85606] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  ক্রেতারা যা কিনেছেন
                </button>

                <button
                  onClick={() => setActiveRecTab('author_brand')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeRecTab === 'author_brand'
                      ? 'bg-white text-[#f85606] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  একই {currentAuthor ? 'লেখক' : 'ব্র্যান্ড'}
                </button>

                <button
                  onClick={() => setActiveRecTab('category')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeRecTab === 'category'
                      ? 'bg-white text-[#f85606] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  একই ক্যাটাগরি
                </button>
              </div>
            </div>

            {/* Recommendation Cards Carousel / Grid */}
            <div className="mt-5">
              {activeRecommendations.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <BookOpen className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-500">এই ফিল্টারে আর কোনো সম্পর্কিত পণ্য পাওয়া যায়নি</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {activeRecommendations.map((prod: any) => {
                    const price = prod.discountPrice || prod.price;
                    const originalPrice = prod.price;
                    const hasDiscount = prod.discountPrice && prod.discountPrice < prod.price;
                    const savings = hasDiscount ? originalPrice - prod.discountPrice : 0;
                    const discountPercent = hasDiscount ? Math.round(((originalPrice - prod.discountPrice) / originalPrice) * 100) : 0;

                    return (
                      <div 
                        key={prod.id}
                        className="group bg-white rounded-xl border border-gray-200 p-3 hover:shadow-lg transition-all duration-300 flex flex-col justify-between hover:border-[#f85606]/40 cursor-pointer"
                        onClick={() => switchProductView(prod)}
                      >
                        {/* Image & Discount Badge */}
                        <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden relative mb-2.5">
                          <img 
                            src={prod.images?.[0] || prod.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} 
                            alt={prod.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          {hasDiscount && (
                            <div className="absolute top-2 left-2 z-10 bg-[#e53935] text-white rounded-xl w-10 h-10 flex flex-col items-center justify-center shadow-md select-none border border-red-400/20">
                              <span className="text-[11px] font-black leading-none">
                                {discountPercent}%
                              </span>
                              <span className="text-[8px] font-black tracking-wider uppercase mt-0.5 leading-none">
                                OFF
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title, Brand & Price */}
                        <div>
                          <span className="text-[10px] text-gray-400 font-medium block truncate">
                            {prod.author || prod.vendorName || prod.categoryName}
                          </span>
                          <h4 className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-[#f85606] transition-colors mt-0.5">
                            {prod.title}
                          </h4>

                          {/* Price Row */}
                          <div className="mt-2 flex flex-wrap items-baseline gap-2">
                            <span className="text-[#f85606] font-black text-lg sm:text-xl">৳{price}</span>
                            {hasDiscount && (
                              <span className="text-xs sm:text-sm font-bold text-red-500 line-through">৳{originalPrice}</span>
                            )}
                          </div>
                          {savings > 0 && (
                            <div className="mt-1">
                              <span className="text-[11px] sm:text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 inline-block shadow-xs">
                                Save ৳{savings}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quick Action Button */}
                        <div className="mt-3 pt-2 border-t border-gray-100 flex gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (addToCart) {
                                addToCart(prod, 1);
                                if (notify) notify(`🛒 "${prod.title.substring(0, 18)}..." added to Cart!`);
                              }
                            }}
                            className="w-full py-2 bg-[#f85606] hover:bg-[#e04d05] text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
