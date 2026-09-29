import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, HelpCircle, X } from 'lucide-react';

interface OrderConfirmationModalProps {
  order: any;
  onClose: () => void;
  onTrackOrder?: () => void;
  notify: (msg: string) => void;
}

export default function OrderConfirmationModal({
  order,
  onClose,
  onTrackOrder,
  notify
}: OrderConfirmationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const orderNumber = order.id || order.orderId || '17168902806931';
  const customerName = order.customerName || order.name || order.customer_name || 'Customer';
  const phone = order.customerPhone || order.phone || order.customer_phone || '';
  const address = order.shippingAddress || order.address || order.shipping_address || 'ঢাকা, বাংলাদেশ';
  const paymentMethod = (order.paymentMethod === 'cod' || order.paymentMethod === 'Cash on Delivery') 
    ? 'Cash On Delivery' 
    : (order.paymentMethod || 'Cash On Delivery');
  
  const subtotal = order.subtotal || (order.totalAmount - (order.deliveryFee || 80));
  const deliveryFee = order.deliveryFee || 80;
  const payableTotal = order.totalAmount || 935;
  const pointsEarned = order.pointsEarned || Math.floor(payableTotal / 12) || 72;

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(String(orderNumber));
    setCopied(true);
    notify('📋 অর্ডার নম্বর কপি করা হয়েছে!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-50 border border-slate-200 text-black rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
      >
        {/* Top Header Bar */}
        <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-black uppercase tracking-wider">অর্ডার কনফার্মেশন (Order Confirmation)</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-black p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content 2-Column Grid */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          
          {/* LEFT COLUMN: Confirmation Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header: Thank you for your order + Green Checkmark */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-black tracking-tight">Thank you for your order</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-black">Order Number: {orderNumber}</span>
                  <button
                    type="button"
                    onClick={handleCopyOrderNumber}
                    className="border border-blue-400 text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Middle Card: Email/SMS Confirmation notice & Contact/Address/Payment details */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <p className="text-xs font-medium text-black">
                Thank you for purchasing from BazaarPulse! Your order will be shipped for delivery shortly
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                
                {/* Contact */}
                <div>
                  <h4 className="font-bold text-sm text-black mb-1">Contact</h4>
                  <p className="text-xs font-medium text-black leading-relaxed">{customerName},</p>
                  <p className="text-xs font-medium text-black leading-relaxed">{phone}</p>
                </div>

                {/* Shipping Address */}
                <div>
                  <h4 className="font-bold text-sm text-black mb-1">Shipping Address</h4>
                  <p className="text-xs font-medium text-black leading-relaxed">{address}</p>
                </div>

                {/* Payment Method */}
                <div>
                  <h4 className="font-bold text-sm text-black mb-1">Payment Method</h4>
                  <p className="text-xs font-medium text-black leading-relaxed">{paymentMethod}</p>
                </div>

              </div>
            </div>

            {/* Bottom Row: Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial border border-blue-500 text-blue-600 hover:bg-blue-50 font-medium text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Continue Shopping
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onTrackOrder) onTrackOrder();
                  }}
                  className="flex-1 sm:flex-initial bg-[#0092d8] hover:bg-[#0081c2] text-white font-medium text-sm px-6 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Track Your Order
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Order Summary Box */}
          <div className="lg:col-span-1 space-y-5">
            
            {/* Order Summary Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-black">Order Summary</h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-black">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-bold text-black">৳{subtotal}</span>
                </div>

                <div className="flex justify-between items-center text-black">
                  <span className="font-medium">Delivery and Website Service Charge</span>
                  <span className="font-bold text-black">৳{deliveryFee}</span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-black text-sm sm:text-base">
                  <span className="font-bold">Payable Total</span>
                  <span className="font-extrabold text-black text-base sm:text-lg">৳{payableTotal}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </motion.div>
    </div>
  );
}
