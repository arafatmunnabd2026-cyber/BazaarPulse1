import React from 'react';
import { X, Heart, ShoppingCart, Trash2, ArrowRight, Package, Store, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: any[];
  onRemoveFromWishlist: (productId: string) => void;
  onAddToCart: (product: any, qty?: number) => void;
  onViewProduct: (product: any) => void;
  onClearWishlist: () => void;
  onMoveAllToCart: () => void;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  onClose,
  wishlist = [],
  onRemoveFromWishlist,
  onAddToCart,
  onViewProduct,
  onClearWishlist,
  onMoveAllToCart
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-pink-50/70 via-white to-orange-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-xs">
              <Heart className="w-5 h-5 fill-pink-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                আমার পছন্দের তালিকা (My Wishlist)
                <span className="text-xs font-extrabold bg-pink-100 text-pink-700 px-2.5 py-0.5 rounded-full border border-pink-200">
                  {wishlist.length} {wishlist.length === 1 ? 'আইটেম' : 'আইটেমসমূহ'}
                </span>
              </h2>
              <p className="text-xs text-gray-500 font-medium">আপনার সংরক্ষিত পছন্দের পণ্যগুলো এখানে দেখতে পাবেন</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close Wishlist Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {wishlist.length === 0 ? (
            <div className="py-14 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center mb-4 text-pink-400">
                <Heart className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 mb-1">
                আপনার পছন্দের তালিকা বর্তমানে খালি!
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
                পণ্য ব্রাউজ করার সময় হার্ট (Heart) আইকনে ক্লিক করে আপনার পছন্দের পণ্যগুলো এখানে সেভ করে রাখতে পারেন।
              </p>
              <button
                onClick={onClose}
                className="bg-[#f85606] hover:bg-[#e04d05] text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                পণ্য ব্রাউজ করুন (Start Shopping) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              {/* Batch action bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-600">
                  মোট সংরক্ষিত পণ্য: <strong className="text-pink-600">{wishlist.length}টি</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onMoveAllToCart}
                    className="bg-[#f85606] hover:bg-[#e04d05] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> সব কার্টে যোগ করুন
                  </button>
                  <button
                    onClick={onClearWishlist}
                    className="border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> তালিকা খালি করুন
                  </button>
                </div>
              </div>

              {/* Wishlist Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlist.map((prod: any) => {
                  const price = prod.discountPrice || prod.price;
                  const originalPrice = prod.price;
                  const hasDiscount = prod.discountPrice && prod.discountPrice < prod.price;
                  const savings = hasDiscount ? originalPrice - prod.discountPrice : 0;
                  const isOutOfStock = !prod.stock || prod.stock <= 0;

                  return (
                    <div
                      key={prod.id}
                      className="group bg-white rounded-xl border border-gray-200 hover:border-pink-300 p-3.5 hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative"
                    >
                      {/* Top Remove Badge */}
                      <button
                        onClick={() => onRemoveFromWishlist(prod.id)}
                        className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                        title="পছন্দের তালিকা থেকে মুছুন"
                        aria-label="Remove item from wishlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Product Media & Details */}
                      <div>
                        <div 
                          className="aspect-square bg-gray-50 rounded-lg overflow-hidden relative mb-3 cursor-pointer"
                          onClick={() => {
                            onClose();
                            onViewProduct(prod);
                          }}
                        >
                          <img
                            src={prod.images?.[0] || prod.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'}
                            alt={prod.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {hasDiscount && (
                            <div className="absolute top-2 left-2 z-10 bg-[#e53935] text-white rounded-xl w-10 h-10 flex flex-col items-center justify-center shadow-md select-none border border-red-400/20">
                              <span className="text-[11px] font-black leading-none">
                                {Math.round(((originalPrice - prod.discountPrice) / originalPrice) * 100)}%
                              </span>
                              <span className="text-[8px] font-black tracking-wider uppercase mt-0.5 leading-none">
                                OFF
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title & Shop */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                            <Store className="w-3 h-3 text-gray-400" />
                            {prod.vendorName || prod.brand || 'Bazaar Store'}
                          </span>
                          <h4 
                            onClick={() => {
                              onClose();
                              onViewProduct(prod);
                            }}
                            className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-[#f85606] transition-colors cursor-pointer"
                          >
                            {prod.title}
                          </h4>

                          {/* Price & Savings */}
                          <div className="pt-1 flex items-baseline gap-2 flex-wrap">
                            <span className="text-[#f85606] font-black text-base sm:text-lg">৳{price}</span>
                            {hasDiscount && (
                              <span className="text-xs font-bold text-red-500 line-through">৳{originalPrice}</span>
                            )}
                          </div>
                          {savings > 0 && (
                            <div>
                              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                                Save ৳{savings}
                              </span>
                            </div>
                          )}

                          {/* Stock indicator */}
                          <div className="pt-1">
                            {isOutOfStock ? (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                Out of Stock
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> In Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                        <button
                          onClick={() => onAddToCart(prod, 1)}
                          disabled={isOutOfStock}
                          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                            isOutOfStock
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-[#f85606] hover:bg-[#e04d05] text-white'
                          }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                        </button>
                        <button
                          onClick={() => {
                            onClose();
                            onViewProduct(prod);
                          }}
                          className="p-2 border border-gray-200 hover:border-gray-400 text-gray-600 hover:text-gray-900 rounded-xl transition-colors cursor-pointer"
                          title="বিস্তারিত দেখুন (Quick View)"
                          aria-label="View product details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
