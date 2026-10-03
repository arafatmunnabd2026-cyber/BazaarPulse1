import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, HelpCircle, X, Download, FileText, Printer, Mail, Sparkles, CheckCircle2, Loader2, Eye } from 'lucide-react';
import { usePlugins } from '../plugins/PluginContext';
import { downloadInvoicePDF, sendInvoiceEmail, getInvoiceConfig } from '../lib/invoiceService';
import { InvoiceModal } from './InvoiceModal';

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
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [autoEmailSent, setAutoEmailSent] = useState(false);
  let isInvoiceActive = true;
  try {
    const pluginCtx = usePlugins();
    if (pluginCtx && typeof pluginCtx.isPluginActive === 'function') {
      isInvoiceActive = pluginCtx.isPluginActive('automated-invoice');
    }
  } catch (e) {
    console.warn('Plugin context safe catch:', e);
  }

  if (!order || typeof order !== 'object') return null;

  const orderNumber = String(order.id || order.orderId || '17168902806931');
  const customerName = typeof order.customerName === 'string' 
    ? order.customerName 
    : (typeof order.name === 'string' 
        ? order.name 
        : (typeof order.customer_name === 'string' ? order.customer_name : 'Customer'));
  const phone = typeof order.customerPhone === 'string' 
    ? order.customerPhone 
    : (typeof order.phone === 'string' 
        ? order.phone 
        : (typeof order.customer_phone === 'string' ? order.customer_phone : ''));
  const customerEmail = typeof order.customerEmail === 'string' 
    ? order.customerEmail 
    : (typeof order.email === 'string' ? order.email : '');
  
  const rawAddress = order.shippingAddress || order.address || order.shipping_address;
  const address = typeof rawAddress === 'string' 
    ? rawAddress 
    : (rawAddress && typeof rawAddress === 'object' 
        ? [rawAddress.addressDetails || rawAddress.address, rawAddress.thana, rawAddress.district, rawAddress.country].filter(Boolean).join(', ') 
        : 'ঢাকা, বাংলাদেশ');

  const rawPaymentMethod = order.paymentMethod;
  const paymentMethod = typeof rawPaymentMethod === 'string'
    ? ((rawPaymentMethod === 'cod' || rawPaymentMethod === 'Cash on Delivery') ? 'Cash On Delivery' : rawPaymentMethod)
    : 'Cash On Delivery';
  
  const discountAmount = Number(order.discountAmount || order.discount_amount || 0);
  const deliveryFee = typeof order.deliveryFee !== 'undefined' && order.deliveryFee !== null ? Number(order.deliveryFee) : (typeof order.shippingFee !== 'undefined' && order.shippingFee !== null ? Number(order.shippingFee) : 80);
  const payableTotal = Number(order.totalAmount || order.total_amount || 0);
  const subtotal = Number(order.subtotal || (payableTotal + discountAmount - deliveryFee)) || 0;
  const pointsEarned = Number(order.pointsEarned || Math.floor(payableTotal / 12) || 72);

  // Auto trigger invoice email on successful checkout if configured
  useEffect(() => {
    if (isInvoiceActive && order && customerEmail && !autoEmailSent) {
      const config = getInvoiceConfig();
      if (config.autoEmailOnCheckout) {
        sendInvoiceEmail(order, customerEmail, config)
          .then((res) => {
            if (res.success) {
              setAutoEmailSent(true);
            }
          })
          .catch((err) => {
            console.warn('Auto invoice email dispatch note:', err);
          });
      }
    }
  }, [isInvoiceActive, order, customerEmail, autoEmailSent]);

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(String(orderNumber));
    setCopied(true);
    notify('📋 অর্ডার নম্বর কপি করা হয়েছে!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingInvoice(true);
    notify('⏳ ইনভয়েস পিডিএফ তৈরি হচ্ছে...');
    try {
      const success = await downloadInvoicePDF(order);
      if (success) {
        notify('✅ ডিজিটাল ইনভয়েস পিডিএফ ডাউনলোড সম্পন্ন হয়েছে!');
      }
    } catch (e) {
      console.error(e);
      notify('⚠️ ইনভয়েস প্রক্রিয়া সম্পন্ন হয়েছে।');
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-50 border border-slate-200 text-black rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        >
          {/* Top Header Bar */}
          <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              অর্ডার কনফার্মেশন (Order Confirmation)
            </span>
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
            <div className="lg:col-span-2 space-y-5">
              
              {/* Header: Thank you for your order + Green Checkmark */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
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
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <p className="text-xs font-medium text-black leading-relaxed">
                  Thank you for purchasing from BazaarPulse! Your order will be shipped for delivery shortly.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                  
                  {/* Contact */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">Contact</h4>
                    <p className="text-xs font-bold text-black leading-relaxed">{customerName}</p>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{phone}</p>
                    {customerEmail && <p className="text-[11px] text-slate-500 truncate">{customerEmail}</p>}
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">Shipping Address</h4>
                    <p className="text-xs font-medium text-black leading-relaxed">{address}</p>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">Payment Method</h4>
                    <p className="text-xs font-medium text-black leading-relaxed">{paymentMethod}</p>
                  </div>

                </div>
              </div>

              {/* Automated Invoice Banner & Actions */}
              {isInvoiceActive && (
                <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-200 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">ডিজিটাল ভেরিফায়েড ইনভয়েস (Official PDF Invoice)</h4>
                        <p className="text-xs text-slate-600">আপনার অর্ডারের সম্পূর্ণ রশিদ প্রস্তুত করা হয়েছে।</p>
                      </div>
                    </div>

                    {autoEmailSent && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ইমেইলে রসিদ পাঠানো হয়েছে
                      </span>
                    )}
                  </div>

                  {/* Invoice Quick Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isDownloadingInvoice}
                      onClick={handleDownloadPDF}
                      className="flex-1 sm:flex-initial bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isDownloadingInvoice ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>পিডিএফ তৈরি হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF ইনভয়েস ডাউনলোড করুন</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsInvoiceModalOpen(true)}
                      className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ইনভয়েস প্রিভিউ ও প্রিন্ট</span>
                    </button>
                  </div>
                </div>
              )}

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
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
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

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 font-bold">
                      <span className="font-medium">Voucher Discount</span>
                      <span>-৳{discountAmount}</span>
                    </div>
                  )}

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

      {/* Full Digital Invoice Modal */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          order={order}
          onClose={() => setIsInvoiceModalOpen(false)}
          notify={notify}
        />
      )}
    </>
  );
}
