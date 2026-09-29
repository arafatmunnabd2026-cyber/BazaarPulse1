import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Check, MapPin, Tag, ShoppingBag, Truck, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

interface CartItem {
  product: any;
  quantity: number;
  size?: string;
  color?: string;
  selected?: boolean;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  authUser: any;
  onSubmitOrder: (orderPayload: any) => Promise<void>;
  notify: (msg: string) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  authUser,
  onSubmitOrder,
  notify
}: CheckoutModalProps) {
  const [shippingInfo, setShippingInfo] = useState({
    name: authUser?.name || '',
    phone: authUser?.phone || '',
    district: 'Dhaka',
    area: '',
    houseRoad: '',
    paymentMethod: 'card', // default selected as in reference image (Debit/Credit Card)
    savePaymentMethod: true
  });

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  if (!isOpen) return null;

  // Selected cart items or all cart items if non-selected
  const activeItems = cart.filter(i => i.selected !== false);
  const itemsToCheckout = activeItems.length > 0 ? activeItems : cart;

  // Financial calculations
  const rawSubtotal = itemsToCheckout.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discountedSubtotal = itemsToCheckout.reduce((sum, item) => sum + ((item.product.discountPrice || item.product.price) * item.quantity), 0);
  const savings = Math.max(0, rawSubtotal - discountedSubtotal);

  // Delivery Charge calculation based on selected district
  const isInsideDhaka = shippingInfo.district === 'Dhaka' || shippingInfo.district === 'ঢাকা';
  const deliveryCharge = isInsideDhaka ? 80 : 150;
  const totalDeliveryAndService = deliveryCharge;

  // Promo Discount
  const promoDiscountAmount = appliedPromo ? appliedPromo.discount : 0;

  // Final Total & Payable
  const subtotalForCalc = discountedSubtotal;
  const payableTotal = Math.max(0, subtotalForCalc + totalDeliveryAndService - promoDiscountAmount);

  // Points earned (e.g. 1 point for every 10 BDT)
  const pointsEarned = Math.floor(payableTotal / 12);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    const cleanCode = promoCode.trim().toUpperCase();
    if (cleanCode === 'BAZAAR10' || cleanCode === 'DISCOUNT10') {
      const discount = Math.round(subtotalForCalc * 0.1);
      setAppliedPromo({ code: cleanCode, discount });
      setPromoError('');
      notify(`🎉 প্রোমো কোড "${cleanCode}" সফলভাবে প্রপ্রয়োগ করা হয়েছে! (৳${discount} ছাড়)`);
    } else if (cleanCode === 'EID2026' || cleanCode === 'PROMO50') {
      const discount = 50;
      setAppliedPromo({ code: cleanCode, discount });
      setPromoError('');
      notify(`🎉 প্রোমো কোড "${cleanCode}" সফলভাবে প্রয়োগ করা হয়েছে! (৳৫০ ছাড়)`);
    } else {
      setPromoError('অবৈধ প্রোমো কোড। অনুগ্রহ করে সঠিক কোড দিন (e.g. BAZAAR10)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingInfo.name.trim() || !shippingInfo.phone.trim()) {
      notify('⚠️ অনুগ্রহ করে আপনার নাম ও ফোন নম্বর প্রদান করুন');
      setShowAddressForm(true);
      return;
    }

    if (!shippingInfo.area.trim() && !shippingInfo.houseRoad.trim()) {
      notify('⚠️ অনুগ্রহ করে আপনার সম্পূর্ণ ঠিকানা প্রদান করুন');
      setShowAddressForm(true);
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        items: itemsToCheckout.map(i => ({
          productId: i.product.id,
          title: i.product.title,
          price: i.product.discountPrice || i.product.price,
          quantity: i.quantity,
          vendorId: i.product.vendorId,
          size: i.size,
          color: i.color
        })),
        customerName: shippingInfo.name,
        customerEmail: authUser?.email || `${shippingInfo.phone}@customer.com`,
        phone: shippingInfo.phone,
        address: `${shippingInfo.houseRoad}, ${shippingInfo.area}, ${shippingInfo.district}`,
        paymentMethod: shippingInfo.paymentMethod,
        paymentStatus: shippingInfo.paymentMethod === 'cod' ? 'unpaid' : 'paid',
        subtotal: subtotalForCalc,
        deliveryFee: totalDeliveryAndService,
        discountAmount: promoDiscountAmount,
        totalAmount: payableTotal,
        pointsEarned
      };

      await onSubmitOrder(orderPayload);
    } catch (err: any) {
      notify('❌ অর্ডার সম্পন্ন করা সম্ভব হয়নি: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl max-w-6xl w-full shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              BazaarPulse Secure Checkout (পেমেন্ট ও অর্ডার নিশ্চিতকরণ)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Grid: Left Column Payment Options, Right Column Summary */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Payment Methods & Shipping Info */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Payment Method Header Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-left">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-800">Payment Method</h3>
                <p className="text-xs text-slate-500">(Please select a payment method)</p>
              </div>

              {/* CATEGORY 1: ক্যাশ অন ডেলিভারি (Cash on Delivery) */}
              <div className="mb-6 space-y-2">
                <div className="text-left">
                  <h4 className="font-bold text-sm text-slate-900">ক্যাশ অন ডেলিভারি</h4>
                  <p className="text-xs text-slate-500">পণ্য হাতে পেয়ে টাকা পরিশোধ করুন</p>
                </div>

                <div 
                  onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'cod' })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 bg-white ${
                    shippingInfo.paymentMethod === 'cod'
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    shippingInfo.paymentMethod === 'cod' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}>
                    {shippingInfo.paymentMethod === 'cod' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  {/* Cash Icon */}
                  <div className="flex items-center gap-2">
                    <svg className="w-7 h-7 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M6 12h0.01M18 12h0.01" />
                    </svg>
                    <span className="text-sm font-extrabold text-slate-800">ক্যাশ অন ডেলিভারি</span>
                  </div>
                </div>
              </div>

              {/* CATEGORY 2: মোবাইল ওয়ালেট (Mobile Wallet) */}
              <div className="mb-6 space-y-2">
                <div className="text-left">
                  <h4 className="font-bold text-sm text-slate-900">মোবাইল ওয়ালেট</h4>
                  <p className="text-xs text-slate-500">মোবাইল ওয়ালেট মাধ্যমে টাকা পরিশোধ করুন</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* bKash */}
                  <div
                    onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'bkash' })}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 bg-white ${
                      shippingInfo.paymentMethod === 'bkash'
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      shippingInfo.paymentMethod === 'bkash' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {shippingInfo.paymentMethod === 'bkash' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    {/* bKash Badge Logo */}
                    <div className="flex items-center gap-1.5">
                      <div className="bg-[#e2136e] text-white px-2 py-0.5 rounded font-black text-xs tracking-tight shadow-xs">
                        bKash
                      </div>
                      <span className="text-xs font-bold text-slate-800">বিকাশ</span>
                    </div>
                  </div>

                  {/* Nagad */}
                  <div
                    onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'nagad' })}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 bg-white ${
                      shippingInfo.paymentMethod === 'nagad'
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      shippingInfo.paymentMethod === 'nagad' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {shippingInfo.paymentMethod === 'nagad' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    {/* Nagad Badge Logo */}
                    <div className="flex items-center gap-1.5">
                      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 py-0.5 rounded font-black text-xs tracking-tight shadow-xs">
                        নগদ
                      </div>
                      <span className="text-xs font-bold text-slate-800">Nagad</span>
                    </div>
                  </div>

                  {/* Rocket */}
                  <div
                    onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'rocket' })}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 bg-white ${
                      shippingInfo.paymentMethod === 'rocket'
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      shippingInfo.paymentMethod === 'rocket' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {shippingInfo.paymentMethod === 'rocket' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    {/* Rocket Badge Logo */}
                    <div className="flex items-center gap-1.5">
                      <div className="bg-[#8c3494] text-white px-2 py-0.5 rounded font-black text-xs tracking-tight shadow-xs">
                        রকেট
                      </div>
                      <span className="text-xs font-bold text-slate-800">Rocket</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* CATEGORY 3: ডেবিট / ক্রেডিট কার্ড (Debit / Credit Card) */}
              <div className="space-y-2">
                <div className="text-left">
                  <h4 className="font-bold text-sm text-slate-900">ডেবিট / ক্রেডিট কার্ড</h4>
                  <p className="text-xs text-slate-500">কার্ড এর মাধ্যমে টাকা পরিশোধ করুন</p>
                </div>

                <div 
                  onClick={() => setShippingInfo({ ...shippingInfo, paymentMethod: 'card' })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between flex-wrap gap-3 bg-white ${
                    shippingInfo.paymentMethod === 'card'
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      shippingInfo.paymentMethod === 'card' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {shippingInfo.paymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    {/* Bank Operator Logos */}
                    <div className="flex items-center flex-wrap gap-1.5">
                      {/* VISA */}
                      <div className="bg-[#1a1f71] text-white px-2 py-1 rounded font-black text-xs italic tracking-tighter shadow-xs border border-blue-900">
                        VISA
                      </div>
                      
                      {/* Mastercard */}
                      <div className="bg-slate-900 text-white px-2 py-1 rounded font-extrabold text-xs flex items-center gap-1 shadow-xs border border-slate-800">
                        <span className="flex shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block -mr-1" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block opacity-90" />
                        </span>
                        <span className="text-[10px]">mastercard</span>
                      </div>

                      {/* AMEX */}
                      <div className="bg-[#006fcf] text-white px-2 py-1 rounded font-black text-[10px] tracking-tighter uppercase shadow-xs">
                        AMEX
                      </div>

                      {/* UnionPay */}
                      <div className="bg-emerald-800 text-white px-1.5 py-1 rounded font-bold text-[10px] flex items-center gap-0.5 shadow-xs">
                        <span className="bg-red-500 px-0.5 text-[8px]">Union</span>
                        <span className="bg-blue-600 px-0.5 text-[8px]">Pay</span>
                      </div>

                      {/* QCash */}
                      <div className="bg-red-600 text-white px-2 py-1 rounded font-black text-[10px] italic shadow-xs">
                        QCash
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkbox: Save Payment Method */}
                <div className="pt-2 flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    id="save-payment"
                    checked={shippingInfo.savePaymentMethod}
                    onChange={e => setShippingInfo({ ...shippingInfo, savePaymentMethod: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="save-payment" className="cursor-pointer font-medium">Save Payment Method</label>
                </div>
              </div>
            </div>

            {/* Recipient Shipping Address Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-sm text-slate-900">ডেলিভারি ঠিকানা ও গ্রাহক তথ্য (Shipping Address)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(!showAddressForm)}
                  className="text-xs text-orange-600 hover:underline font-bold cursor-pointer"
                >
                  {showAddressForm ? 'সংক্ষিপ্ত ফর্ম' : 'সম্পূর্ণ ফর্ম সম্পাদন করুন'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">গ্রাহকের নাম (Full Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="আপনার নাম লিখুন"
                    value={shippingInfo.name}
                    onChange={e => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর (Phone) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="017XXXXXXXX"
                    value={shippingInfo.phone}
                    onChange={e => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">জেলা (District) *</label>
                  <select
                    value={shippingInfo.district}
                    onChange={e => setShippingInfo({ ...shippingInfo, district: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Dhaka">ঢাকা (Dhaka - ৳80 Delivery)</option>
                    <option value="Chattogram">চট্টগ্রাম (Chattogram - ৳150 Delivery)</option>
                    <option value="Sylhet">সিলেট (Sylhet - ৳150 Delivery)</option>
                    <option value="Rajshahi">রাজশাহী (Rajshahi - ৳150 Delivery)</option>
                    <option value="Khulna">খুলনা (Khulna - ৳150 Delivery)</option>
                    <option value="Barishal">বরিশাল (Barishal - ৳150 Delivery)</option>
                    <option value="Rangpur">রংপুর (Rangpur - ৳150 Delivery)</option>
                    <option value="Mymensingh">ময়মনসিংহ (Mymensingh - ৳150 Delivery)</option>
                    <option value="Cumilla">কুমিল্লা (Cumilla - ৳150 Delivery)</option>
                    <option value="Gazipur">গাজীপুর (Gazipur - ৳150 Delivery)</option>
                    <option value="Narayanganj">নারায়ণগঞ্জ (Narayanganj - ৳150 Delivery)</option>
                    <option value="Bogura">বগুড়া (Bogura - ৳150 Delivery)</option>
                    <option value="Outside Dhaka">অন্যান্য জেলা (Outside Dhaka - ৳150 Delivery)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">থানা / এলাকা (Area/Thana) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ধানমন্ডি / মিরপুর / গুলশান"
                    value={shippingInfo.area}
                    onChange={e => setShippingInfo({ ...shippingInfo, area: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">বাসা নং / রোড নং / সম্পূর্ণ ঠিকানা (Address) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. বাসা #৪৫, রোড #১১, ব্লক-সি"
                    value={shippingInfo.houseRoad}
                    onChange={e => setShippingInfo({ ...shippingInfo, houseRoad: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Checkout Summary Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-left space-y-4 sticky top-4">
              
              {/* Summary Header */}
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-extrabold text-slate-800">Checkout Summary</h3>
              </div>

              {/* Price Breakdown List */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">৳{subtotalForCalc}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charge ({isInsideDhaka ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'})</span>
                  <span className="font-bold text-slate-900">৳{totalDeliveryAndService}</span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Voucher Discount ({appliedPromo.code})</span>
                    <span>-৳{appliedPromo.discount}</span>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-800">
                  <span>Total</span>
                  <span className="font-extrabold text-slate-900">৳{payableTotal}</span>
                </div>

                <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-sm text-slate-900">
                  <span>Payable Total</span>
                  <span className="font-black text-slate-900 text-base">৳{payableTotal}</span>
                </div>
              </div>

              {/* Primary Action Button: "অর্ডার নিশ্চিত করুন ৳..." */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{submitting ? 'অর্ডার জমা হচ্ছে...' : `অর্ডার নিশ্চিত করুন ৳${payableTotal}`}</span>
              </button>

              {/* Savings Banner */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl py-2.5 px-3 text-center text-emerald-800 font-bold text-xs">
                <span>Your are saving ৳{savings > 0 ? savings : 80}</span>
              </div>

            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
