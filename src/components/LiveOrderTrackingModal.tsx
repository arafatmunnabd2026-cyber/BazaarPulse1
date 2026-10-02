import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  AlertCircle, 
  XCircle, 
  RefreshCw, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { usePlugins } from '../plugins/PluginContext';
import { InvoiceModal } from './InvoiceModal';

interface OrderItem {
  productId?: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
  color?: string;
}

export interface TrackableOrder {
  id: string | number;
  customerName?: string;
  customerPhone?: string;
  phone?: string;
  customerEmail?: string;
  shippingAddress?: string;
  address?: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  totalAmount: number;
  subtotal?: number;
  deliveryFee?: number;
  shippingFee?: number;
  discountAmount?: number;
  createdAt: string;
  items: OrderItem[];
}

interface LiveOrderTrackingModalProps {
  isOpen: boolean;
  order: TrackableOrder | null;
  orderId?: string | number;
  onClose: () => void;
  notify?: (msg: string) => void;
  productsCatalog?: any[];
}

export const LiveOrderTrackingModal: React.FC<LiveOrderTrackingModalProps> = ({
  isOpen,
  order: initialOrder,
  orderId: propOrderId,
  onClose,
  notify = () => {},
  productsCatalog = []
}) => {
  const [currentOrder, setCurrentOrder] = useState<TrackableOrder | null>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const { isPluginActive } = usePlugins();
  const isInvoiceActive = isPluginActive('automated-invoice');

  const effectiveOrderId = initialOrder?.id || propOrderId || '';

  const fetchLiveStatus = async (showToast = false) => {
    if (!effectiveOrderId) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(effectiveOrderId)}`);
      const json = await res.json();
      if (json.success && json.order) {
        setCurrentOrder(json.order);
        if (showToast) {
          notify(`🔄 অর্ডার #${effectiveOrderId} এর লাইভ স্ট্যাটাস আপডেট হয়েছে: ${json.order.status}`);
        }
      }
    } catch (e) {
      console.warn('Live tracking fetch note:', e);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (initialOrder) {
      setCurrentOrder(initialOrder);
      fetchLiveStatus();
    } else if (propOrderId) {
      setLoading(true);
      fetchLiveStatus();
    }

    const interval = setInterval(() => {
      fetchLiveStatus(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [initialOrder, propOrderId, isOpen]);

  // Listen to live broadcast updates
  useEffect(() => {
    const handleStatusBroadcast = (e: any) => {
      if (e.detail?.orderId && String(e.detail.orderId) === String(effectiveOrderId)) {
        fetchLiveStatus(true);
      }
    };
    window.addEventListener('bazaarpulse-order-status-updated', handleStatusBroadcast);
    return () => {
      window.removeEventListener('bazaarpulse-order-status-updated', handleStatusBroadcast);
    };
  }, [effectiveOrderId]);

  if (!isOpen) return null;

  const order = currentOrder || initialOrder;

  if (!order && loading) {
    return (
      <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full space-y-4 shadow-2xl">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-800">অর্ডার ট্র্যাকিং তথ্য লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-md w-full space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">অর্ডার খুঁজে পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500">
            অর্ডার আইডি #{String(effectiveOrderId)} এর কোনো তথ্য পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর দিন।
          </p>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    );
  }

  const rawStatus = (order.status || 'pending').toLowerCase().trim();
  const isCancelled = rawStatus === 'cancelled' || rawStatus === 'canceled';

  // Determine active step index (0: Placed, 1: Processing, 2: Shipped, 3: Delivered)
  let activeStep = 0;
  if (rawStatus === 'confirmed' || rawStatus === 'processing') activeStep = 1;
  else if (rawStatus === 'shipped' || rawStatus === 'in_transit' || rawStatus === 'on_the_way') activeStep = 2;
  else if (rawStatus === 'delivered' || rawStatus === 'completed') activeStep = 3;

  const steps = [
    {
      title: 'অর্ডার গৃহীত হয়েছে',
      subtitle: 'Order Placed & Verified',
      desc: 'আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে এবং পেমেন্ট ভেরিফাই হয়েছে।',
      icon: CheckCircle2,
      time: order.createdAt 
        ? new Date(order.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date(order.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })
        : 'এইমাত্র'
    },
    {
      title: 'প্যাকেজিং ও যাচাইকরণ',
      subtitle: 'Processing & Quality Check',
      desc: 'পণ্যগুলোর কোয়ালিটি যাচাই করে ইকো-ফ্রেন্ডলি বক্সে সিল করা হচ্ছে।',
      icon: Package,
      time: activeStep >= 1 ? 'সম্পন্ন' : 'প্রক্রিয়াধীন'
    },
    {
      title: 'ডেলিভারির পথে (কুরিয়ার)',
      subtitle: 'Shipped & Out for Delivery',
      desc: 'Steadfast / Pathao Express কুরিয়ার এজেন্টের কাছে হস্তান্তর করা হয়েছে।',
      icon: Truck,
      time: activeStep >= 2 ? 'ডেলিভারির পথে' : 'অপেক্ষমাণ'
    },
    {
      title: 'ডেলিভারি সম্পন্ন',
      subtitle: 'Delivered to Destination',
      desc: 'পণ্য নিরাপদে আপনার ঠিকানায় হস্তান্তর করা হয়েছে।',
      icon: ShieldCheck,
      time: activeStep >= 3 ? 'ডেলিভারি সম্পন্ন' : 'শিগগিরই'
    }
  ];

  const orderNumber = String(order.id || effectiveOrderId);
  const customerName = typeof order.customerName === 'string' ? order.customerName : 'সম্মানিত গ্রাহক';
  const phone = typeof order.customerPhone === 'string' ? order.customerPhone : (order.phone || 'N/A');
  const address = typeof order.shippingAddress === 'string' 
    ? order.shippingAddress 
    : (typeof order.address === 'string' ? order.address : 'ঢাকা, বাংলাদেশ');

  const items = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];

  const getItemImage = (item: any) => {
    if (item.image) return item.image;
    if (item.images && Array.isArray(item.images) && item.images.length > 0) return item.images[0];
    const catMatch = productsCatalog.find(p => p.id === item.productId || p.title === item.title);
    if (catMatch) {
      if (catMatch.image_url) return catMatch.image_url;
      if (Array.isArray(catMatch.images) && catMatch.images.length > 0) return catMatch.images[0];
    }
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
  };

  return (
    <>
      <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-slate-50 border border-slate-200 text-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col text-left"
        >
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md">
                <Truck className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight">লাইভ অর্ডার ট্র্যাকার (Live Order Tracker)</h3>
                  <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    রিয়েল-টাইম
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  অর্ডার আইডি: <span className="font-mono text-white font-bold">#{orderNumber}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchLiveStatus(true)}
                disabled={refreshing}
                title="লাইভ স্ট্যাটাস রিফ্রেশ করুন"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
                <span className="hidden sm:inline">রিফ্রেশ</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body */}
          <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6">
            
            {/* Cancelled Banner if cancelled */}
            {isCancelled && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-rose-900">
                <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">অর্ডারটি বাতিল করা হয়েছে (Order Cancelled)</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    এই অর্ডারটি সিস্টেমে বাতিল হিসেবে নথিভুক্ত রয়েছে। প্রয়োজনে আমাদের হেল্পলাইন নম্বরে যোগাযোগ করুন।
                  </p>
                </div>
              </div>
            )}

            {/* Live Progress Bar Card */}
            {!isCancelled && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">বর্তমান স্ট্যাটাস</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <h4 className="text-lg font-black text-slate-900 capitalize">
                        {rawStatus === 'pending' && 'অপেক্ষমাণ (Pending)'}
                        {rawStatus === 'processing' && 'প্রক্রিয়াধীন (Processing)'}
                        {rawStatus === 'shipped' && 'ডেলিভারির পথে (Shipped / Out for Delivery)'}
                        {rawStatus === 'delivered' && 'ডেলিভারি সম্পন্ন (Delivered)'}
                        {!['pending', 'processing', 'shipped', 'delivered'].includes(rawStatus) && rawStatus}
                      </h4>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 px-3.5 py-1.5 rounded-2xl flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-orange-950">
                      আনুমানিক ডেলিভারি: ২৪-৪৮ ঘণ্টার মধ্যে
                    </span>
                  </div>
                </div>

                {/* Progress Visual Timeline */}
                <div className="relative pt-2 pb-2">
                  {/* Desktop Connecting Progress Line */}
                  <div className="hidden sm:block absolute top-6 left-[12.5%] right-[12.5%] h-1.5 bg-slate-100 rounded-full overflow-hidden z-0">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-700 ease-out"
                      style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
                    />
                  </div>

                  {/* Desktop Step Nodes Grid */}
                  <div className="hidden sm:grid sm:grid-cols-4 gap-3 lg:gap-4 relative z-10">
                    {steps.map((step, idx) => {
                      const Icon = step.icon;
                      const isCompleted = activeStep >= idx;
                      const isCurrent = activeStep === idx;

                      return (
                        <div 
                          key={idx} 
                          className="flex flex-col items-center text-center p-2 rounded-2xl transition-all"
                        >
                          {/* Icon with white ring backdrop so line passes cleanly behind */}
                          <div className="p-1 bg-white rounded-2xl mb-2.5 shadow-2xs">
                            <div 
                              className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 transition-all duration-300 shadow-sm ${
                                isCurrent
                                  ? 'bg-orange-600 text-white ring-4 ring-orange-100 scale-105'
                                  : isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                          </div>

                          {/* Step Text Container with proper break-words & margins */}
                          <div className="w-full max-w-full flex flex-col items-center space-y-1 px-1">
                            <h5 
                              className={`text-xs font-bold leading-tight break-words max-w-full text-center ${
                                isCurrent 
                                  ? 'text-orange-600 font-extrabold' 
                                  : isCompleted 
                                  ? 'text-slate-900' 
                                  : 'text-slate-500'
                              }`}
                            >
                              {step.title}
                            </h5>
                            
                            <p className="text-[10px] text-slate-500 leading-snug break-words max-w-full text-center">
                              {step.subtitle}
                            </p>

                            <div className="pt-1 w-full flex justify-center">
                              <span 
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border leading-tight break-words shadow-2xs ${
                                  isCurrent
                                    ? 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse'
                                    : isCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                              >
                                {step.time}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mobile Vertical Timeline Flow */}
                  <div className="sm:hidden space-y-2.5 relative">
                    {steps.map((step, idx) => {
                      const Icon = step.icon;
                      const isCompleted = activeStep >= idx;
                      const isCurrent = activeStep === idx;

                      return (
                        <div 
                          key={idx} 
                          className={`relative flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all ${
                            isCurrent
                              ? 'bg-orange-50/70 border-orange-200 ring-1 ring-orange-200'
                              : isCompleted
                              ? 'bg-emerald-50/40 border-emerald-100'
                              : 'bg-slate-50/70 border-slate-200/80 opacity-80'
                          }`}
                        >
                          {/* Step Icon */}
                          <div 
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-sm mt-0.5 ${
                              isCurrent
                                ? 'bg-orange-600 text-white ring-3 ring-orange-200 scale-105'
                                : isCompleted
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Step Content */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <h5 
                                className={`text-xs font-bold leading-tight break-words ${
                                  isCurrent 
                                    ? 'text-orange-600 font-extrabold' 
                                    : isCompleted 
                                    ? 'text-slate-900' 
                                    : 'text-slate-500'
                                }`}
                              >
                                {step.title}
                              </h5>
                              <span 
                                className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md border leading-tight ${
                                  isCurrent
                                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                                    : isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                {step.time}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 leading-snug break-words">
                              {step.subtitle}
                            </p>
                            
                            <p className="text-[10px] text-slate-400 leading-relaxed break-words pt-0.5">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Logistics Badge */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">কুরিয়ার পার্টনার: Steadfast Express</span>
                      <p className="text-[11px] text-slate-500">ট্র্যাকিং কোড: <span className="font-mono font-bold text-slate-700">BP-TRK-{String(orderNumber).slice(-6)}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2.5 py-1 rounded-xl">
                      ✓ এক্সপ্রেস ডেলিভারি সক্রিয়
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2-Column Details: Left Address / Right Order Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Customer & Delivery Address Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3.5">
                <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    ডেলিভারি ঠিকানা ও গ্রাহক তথ্য
                  </h4>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>গ্রাহকের নাম: <strong className="text-slate-900">{customerName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>মোবাইল: <strong className="text-slate-900">{phone}</strong></span>
                  </div>
                  <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">সম্পূর্ণ ঠিকানা: <strong className="text-slate-900">{address}</strong></span>
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-slate-500">পেমেন্ট মেথড:</span>
                    <span className="font-bold text-slate-900">{order.paymentMethod || 'Cash on Delivery'}</span>
                  </div>
                </div>
              </div>

              {/* Items in this Order */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3.5">
                <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-600" />
                    অর্ডারকৃত পণ্যসমূহ ({items.length})
                  </h4>
                  <span className="text-xs font-extrabold text-orange-600">
                    মোট: ৳{order.totalAmount}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <div key={idx} className="pt-2 first:pt-0 flex items-center gap-3">
                      <img
                        src={getItemImage(it)}
                        alt={it.title}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-bold text-slate-800 truncate">{it.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ৳{it.price} × {it.quantity}টি
                          {it.size && <span className="ml-1 bg-slate-100 px-1 py-0.5 rounded text-[10px]">সাইজ: {it.size}</span>}
                          {it.color && <span className="ml-1 bg-slate-100 px-1 py-0.5 rounded text-[10px]">কালার: {it.color}</span>}
                        </p>
                      </div>
                      <div className="text-right font-bold text-xs text-slate-900">
                        ৳{it.price * it.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* Modal Footer Actions */}
          <div className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>যেকোনো সহায়তায় হেল্পলাইন: <strong>+880 1756-482001</strong></span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {isInvoiceActive && (
                <button
                  type="button"
                  onClick={() => setIsInvoiceOpen(true)}
                  className="flex-1 sm:flex-initial bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-orange-600" />
                  <span>ইনভয়েস রশিদ (PDF)</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Invoice Modal Integration */}
      {isInvoiceOpen && (
        <InvoiceModal
          isOpen={isInvoiceOpen}
          order={order}
          onClose={() => setIsInvoiceOpen(false)}
          notify={notify}
        />
      )}
    </>
  );
};

export default LiveOrderTrackingModal;
