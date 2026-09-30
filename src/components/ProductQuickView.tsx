import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Search, ShoppingCart, Sparkles, Star, Package, Heart, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categories = ['All', 'Electronics', 'Fashion', 'Home & Living', 'Beauty & Health', 'Groceries', 'Sports & Outdoors'];

export const ProductQuickView = ({ selectedProduct, setSelectedProduct, setIsCheckoutOpen, handleAddToCart, selectedSize, selectedColor, quantity }: any) => {
  const [quantityLocal, setQuantityLocal] = useState(quantity || 1);
  const [selectedSizeLocal, setSelectedSizeLocal] = useState(selectedSize || 'M');
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleBuyNow = () => {
    handleAddToCart(selectedProduct, quantityLocal, selectedSizeLocal, '');
    setSelectedProduct(null); // Close modal
    setIsCheckoutOpen(true);  // Open checkout
  };

  const handleAddToCartClick = () => {
    handleAddToCart(selectedProduct, quantityLocal, selectedSizeLocal, '');
  };

  useEffect(() => {
    if (selectedProduct) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const discountPercent = 33;
  const originalPrice = Math.round(selectedProduct.price / (1 - discountPercent / 100));
  const savings = originalPrice - selectedProduct.price;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-white overflow-y-auto"
      >
        {/* Sticky Header Stack */}
        <div className="sticky top-0 z-[101] bg-white shadow-sm border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2"><ShoppingBag className="w-7 h-7 text-[#f85606]" /><span className="font-black text-2xl text-[#f85606] tracking-tighter">BazaarPulse</span></div>
            <div className="flex-1 max-w-2xl"><div className="relative flex"><input type="text" placeholder="Search..." className="w-full bg-gray-100 border border-gray-200 rounded-l-lg py-2.5 px-4 text-sm" /><button className="bg-[#f85606] text-white px-6 rounded-r-lg"><Search className="w-5 h-5" /></button></div></div>
            <div className="flex items-center gap-4"><ShoppingCart className="w-7 h-7 text-gray-700 cursor-pointer" /><button className="bg-purple-600 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> AI Advisor</button><button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6 text-gray-500" /></button></div>
          </div>
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto border-t border-gray-100">
            {categories.map(cat => (<button key={cat} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold border ${cat === 'All' ? 'bg-[#f85606] text-white border-[#f85606]' : 'border-gray-200 text-gray-700'}`}>{cat}</button>))}
          </div>
        </div>

        {/* Modal Content */}
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
          <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest mb-6">Product Quick View</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
                <img 
                  src={selectedProduct.image || selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} 
                  alt={selectedProduct.title} 
                  className="w-full h-full object-cover"
                  onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'; }}
                />
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg font-black text-sm">-{discountPercent}% OFF</div>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map(i => <div key={i} className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-transparent hover:border-[#f85606] cursor-pointer"></div>)}
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <h1 className="text-3xl font-extrabold text-gray-900">{selectedProduct.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1 text-yellow-500"><Star className="w-4 h-4 fill-current" /> 4.8 (128 Reviews)</div>
                <div className="text-gray-900 font-bold">Vendor: <span className="text-[#f85606] underline cursor-pointer">{selectedProduct.vendorName || 'Bazaar Store'}</span></div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-[#f85606]">৳{selectedProduct.price}</span>
                <span className="text-xl text-gray-400 line-through">৳{originalPrice}</span>
              </div>
              <div className="text-sm text-emerald-600 font-bold bg-emerald-50 p-3 rounded-lg border border-emerald-100">You Save ৳{savings}</div>
              <p className="text-emerald-600 font-bold text-sm"><Package className="w-4 h-4 inline" /> In stock - only 5 pieces left</p>
              
              <div className="space-y-2">
                <p className="font-bold text-sm">Size:</p>
                <div className="flex gap-2">{['S', 'M', 'L', 'XL'].map(s => <button key={s} onClick={() => setSelectedSize(s)} className={`px-4 py-2 border rounded-lg ${selectedSize === s ? 'border-[#f85606] bg-orange-50' : 'border-gray-200'}`}>{s}</button>)}</div>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center border rounded-lg">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3"><Minus className="w-4 h-4" /></button>
                  <span className="px-4 font-bold">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-3"><Plus className="w-4 h-4" /></button>
                </div>
                <button onClick={handleBuyNow} className="flex-1 bg-[#f8981d] hover:bg-[#e68a1a] text-white font-bold py-3 rounded-lg shadow-sm">Buy Now</button>
                <button className="flex-1 bg-[#007bff] hover:bg-[#0069d9] text-white font-bold py-3 rounded-lg shadow-sm flex items-center justify-center gap-2"><ShoppingCart className="w-5 h-5" /> Add to Cart</button>
                <button onClick={() => setIsWishlisted(!isWishlisted)} className={`p-3 border rounded-lg ${isWishlisted ? 'text-red-500' : 'text-gray-400'}`}><Heart className="w-6 h-6" /></button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
