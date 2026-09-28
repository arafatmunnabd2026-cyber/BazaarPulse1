import React from 'react';
import { X, Star, Heart, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

export const ProductQuickView = ({ 
  selectedProduct, 
  setSelectedProduct, 
  activeImageIdx, 
  setActiveImageIdx, 
  selectedSize, 
  setSelectedSize, 
  selectedColor, 
  setSelectedColor, 
  productQty, 
  setProductQty, 
  handleAddToCart, 
  notify 
}: any) => {
  if (!selectedProduct) return null;

  return (
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
          {/* Left Column: Gallery & Thumbnails */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="aspect-square bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden relative shadow-inner">
              <img 
                src={selectedProduct?.images?.[activeImageIdx] || selectedProduct?.images?.[0] || selectedProduct?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} 
                alt={selectedProduct?.title} 
                className="w-full h-full object-cover" 
              />
              {selectedProduct?.discountPrice && (
                <div className="absolute top-4 left-4 z-10 w-16 h-16 flex flex-col items-center justify-center text-white font-bold leading-none select-none">
                  <div 
                    className="absolute inset-0 bg-[#e53e3e]"
                    style={{
                      clipPath: 'polygon(50% 0%, 61% 0.5%, 72% 3%, 82% 7%, 89% 12%, 95% 19%, 98% 27%, 99% 36%, 100% 50%, 99% 64%, 98% 73%, 95% 81%, 89% 88%, 82% 93%, 72% 97%, 61% 99%, 50% 100%, 39% 99%, 28% 97%, 18% 93%, 11% 88%, 5% 81%, 2% 73%, 1% 64%, 0% 50%, 1% 36%, 2% 27%, 5% 19%, 11% 12%, 18% 7%, 28% 3%, 39% 0.5%)'
                    }}
                  />
                  <div className="relative z-10 text-center">
                    <div className="text-lg">{Math.round(((selectedProduct.price - selectedProduct.discountPrice) / selectedProduct.price) * 100)}%</div>
                    <div className="text-[10px] uppercase">OFF</div>
                  </div>
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
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${
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
            {( (Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0) || 
               (Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0) ) && (
              <div className="space-y-4 py-2 border-b border-gray-100">
                {/* Size Selector */}
                {Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0 && (
                  <div>
                    <span className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider mb-2 block">Select Size</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.sizes.map((size: string) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-[45px] h-[35px] px-2.5 border rounded-lg text-xs font-bold transition-all ${
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
                )}

                {/* Color Selector */}
                {Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0 && (
                  <div>
                    <span className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider block mb-2">Select Color</span>
                    <div className="flex flex-wrap gap-3">
                      {selectedProduct.colors.map((colorName: string) => {
                        const lowerColor = colorName.toLowerCase();
                        const isStandard = ['black', 'white', 'blue', 'red'].includes(lowerColor);
                        const style = isStandard ? {} : { backgroundColor: colorName };
                        return (
                          <button
                            key={colorName}
                            onClick={() => setSelectedColor(colorName)}
                            className={`group relative flex flex-col items-center gap-1 transition-all ${
                              selectedColor === colorName ? 'scale-110' : 'hover:scale-105'
                            }`}
                          >
                            <div 
                              style={style}
                              className={`w-8 h-8 rounded-full border-2 ${isStandard ? '' : ''} ${
                                selectedColor === colorName ? 'border-[#f85606] ring-2 ring-orange-100' : 'border-transparent'
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

            {/* Quantity Selector */}
            <div className="flex flex-col gap-2 py-2">
              <div className="flex items-center gap-6">
                <span className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider">Quantity</span>
                <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button onClick={() => setProductQty(Math.max(1, productQty - 1))} className="px-4 py-2 text-black hover:bg-gray-100 font-bold transition-colors">-</button>
                  <span className="px-5 py-2 font-extrabold text-sm text-black min-w-[50px] text-center">{productQty}</span>
                  <button onClick={() => setProductQty(productQty + 1)} className="px-4 py-2 text-black hover:bg-gray-100 font-bold transition-colors">+</button>
                </div>
              </div>

              {/* Stock Status Note */}
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
              {selectedProduct.stock > 0 && selectedProduct.stock <= 5 && (
                <p className="text-[10px] text-gray-500">* স্টক আউট হওয়ার আগেই অর্ডার করুন</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => {
                  const hasSizes = Array.isArray(selectedProduct.sizes) && selectedProduct.sizes.length > 0;
                  const hasColors = Array.isArray(selectedProduct.colors) && selectedProduct.colors.length > 0;
                  if (hasSizes && !selectedSize) { notify('⚠️ Please select a size'); return; }
                  if (hasColors && !selectedColor) { notify('⚠️ Please select a color'); return; }
                  handleAddToCart(selectedProduct, productQty, selectedSize, selectedColor);
                }}
                className="bg-[#f85606] hover:bg-[#e64d05] text-white font-black py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" /> Add to Cart
              </button>
              <button className="border border-gray-300 hover:border-gray-400 text-gray-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
                <Heart className="w-5 h-5" /> Wishlist
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
