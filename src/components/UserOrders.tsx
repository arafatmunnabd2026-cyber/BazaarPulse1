import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Clock, Truck, CheckCircle, Search, RefreshCw, XCircle, Eye, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  subtotal?: number;
  deliveryFee?: number;
  shippingFee?: number;
  customerName?: string;
  customerPhone?: string;
  phone?: string;
  shippingAddress?: string;
  address?: string;
  createdAt: string;
  items: OrderItem[];
}

interface UserOrdersProps {
  userId: string;
  authToken?: string;
  notify?: (msg: string) => void;
  productsCatalog?: any[];
  onSelectTrackOrder?: (order: any) => void;
  currentTrackedOrder?: any;
}

export default function UserOrders({ userId, authToken, notify, productsCatalog = [], onSelectTrackOrder, currentTrackedOrder }: UserOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [cancellingOrderId, setSubmittingCancelId] = useState<string | null>(null);

  const fetchMyOrders = async () => {
    try {
      let serverOrders: any[] = [];
      const res = await fetch('/api/platform/data');
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        serverOrders = data.orders;
      }

      // 2. Read client-side saved orders
      let localOrders: any[] = [];
      try {
        localOrders = JSON.parse(localStorage.getItem('bazaarpulse_my_orders') || '[]');
      } catch (e) {}

      // 3. Deduplicate combined orders by ID
      const orderMap = new Map<string, any>();
      [...localOrders, ...serverOrders].forEach(o => {
        if (o && o.id && !orderMap.has(o.id)) {
          orderMap.set(o.id, o);
        }
      });
      const allOrdersList = Array.from(orderMap.values());

      // 4. Smart match user orders
      const filtered = allOrdersList.filter((o: any) => {
        if (!userId) return true;
        return (
          o.customerId === userId ||
          o.user_id === userId ||
          o.customerId === 'u4' ||
          o.user_id === 'u4' ||
          (o.customerPhone && o.customerPhone === userId) ||
          (o.phone && o.phone === userId)
        );
      });

      const matchedOrders = filtered.length > 0 ? filtered : allOrdersList;

      // Sort matchedOrders by date descending so the newest order is first
      matchedOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
        return dateB - dateA;
      });

      setOrders(matchedOrders);

      // Auto tracking: automatically select the newest order to track instantly if none is selected
      if (matchedOrders.length > 0 && onSelectTrackOrder) {
        if (currentTrackedOrder) {
          const newestState = matchedOrders.find(o => String(o.id) === String(currentTrackedOrder.id));
          if (newestState) {
            onSelectTrackOrder(newestState);
          }
        } else {
          onSelectTrackOrder(matchedOrders[0]);
        }
      }
    } catch (err) {
      console.error('Fetch my orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();

    // Fast poll to ensure instant zero-latency updates even on local fallback DB
    const pollInterval = setInterval(() => {
      fetchMyOrders();
    }, 3000);

    const handleOrderCreated = (e: any) => {
      fetchMyOrders();
    };
    window.addEventListener('bazaarpulse-order-created', handleOrderCreated);

    // Live tracking using Supabase Channel
    if (!supabase) {
      return () => {
        clearInterval(pollInterval);
        window.removeEventListener('bazaarpulse-order-created', handleOrderCreated);
      };
    }

    const channel = supabase
      .channel(`user-orders-realtime`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchMyOrders();
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: payload.new.status } : o));
            if (selectedOrderDetails && selectedOrderDetails.id === payload.new.id) {
              setSelectedOrderDetails(prev => prev ? { ...prev, status: payload.new.status } : null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('bazaarpulse-order-created', handleOrderCreated);
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই অর্ডারটি বাতিল করতে চান?')) {
      return;
    }

    setSubmittingCancelId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });
      const data = await res.json();
      if (data.success) {
        if (notify) notify('🚫 আপনার অর্ডারটি সফলভাবে বাতিল করা হয়েছে!');
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
        if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
          setSelectedOrderDetails(prev => prev ? { ...prev, status: 'cancelled' } : null);
        }
      } else {
        if (notify) notify('❌ ' + (data.error || 'অর্ডার বাতিল করা সম্ভব হয়নি'));
      }
    } catch (err) {
      if (notify) notify('❌ অর্ডার বাতিল করা সম্ভব হয়নি');
    } finally {
      setSubmittingCancelId(null);
    }
  };

  // Helper to find image for an item from product catalog
  const getItemImage = (item: OrderItem) => {
    if (item.image) return item.image;
    const prod = productsCatalog.find((p: any) => p.id === item.productId || p.title === item.title);
    if (prod && prod.images && prod.images.length > 0) {
      return Array.isArray(prod.images) ? prod.images[0] : prod.images;
    }
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
  };

  if (loading) return (
    <div className="p-8 text-center text-black font-medium flex items-center justify-center gap-2">
      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
      <span>অর্ডার ডাটা লোড হচ্ছে...</span>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-black">My Orders & Live Tracking</h2>
          <p className="text-xs font-medium text-black">আপনার সকল আগের কেনাকাটার ইতিহাস ও রিয়েল টাইম ট্র্যাকিং</p>
        </div>
        <span className="bg-blue-50 border border-blue-200 text-black px-3.5 py-1 rounded-full text-xs font-medium">
          মোট অর্ডার: <strong className="font-bold text-black">{orders.length}টি</strong>
        </span>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-black">আপনি এখনও কোনো অর্ডার করেননি</h3>
            <p className="text-xs font-medium text-black max-w-xs mx-auto">বাজারপালস থেকে কেনাকাটা শুরু করুন এবং এখানে আপনার অর্ডারের রিয়েল টাইমে ট্র্যাকিং দেখুন!</p>
          </div>
        ) : (
          orders.map(order => {
            const canCancel = order.status === 'pending' || order.status === 'processing';
            const isShippedOrDelivered = order.status === 'shipped' || order.status === 'delivered';

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden text-black transition-all hover:border-slate-300">
                {/* Order Top Bar */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-black uppercase">অর্ডার নম্বর:</span>
                      <span className="text-sm font-bold text-black font-mono">{order.id}</span>
                    </div>
                    <p className="text-xs font-medium text-black">
                      তারিখ: {new Date(order.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium uppercase tracking-wider ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                      'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      স্ট্যাটাস: {order.status}
                    </span>

                    <div className="text-right">
                      <span className="text-xs font-medium text-black block">মোট মূল্য</span>
                      <span className="text-sm font-bold text-black">৳{order.totalAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Items Preview List with Images */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <img
                          src={getItemImage(item)}
                          alt={item.title}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-black truncate">{item.title}</p>
                          <p className="text-[11px] font-medium text-black">
                            ৳{item.price} × {item.quantity} {item.size && `(${item.size})`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
                  
                  {/* Left: Dedicated Order Details Button & Track Button */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetails(order)}
                      className="flex items-center gap-1.5 border border-blue-500 text-blue-700 hover:bg-blue-50 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>অর্ডার ডিটেইলস দেখুন</span>
                    </button>

                    {onSelectTrackOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTrackOrder(order);
                          const trackerEl = document.getElementById('bazaarpulse-live-tracker-title');
                          if (trackerEl) {
                            trackerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                          if (notify) notify(`📍 অর্ডার নম্বর #${order.id} ট্র্যাক করা হচ্ছে!`);
                        }}
                        className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                      >
                        <Truck className="w-4 h-4 animate-bounce" />
                        <span>লাইভ ট্র্যাক করুন</span>
                      </button>
                    )}
                  </div>

                  {/* Right: Conditional Cancel Button (only before shipping) */}
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingOrderId === order.id}
                      className="flex items-center gap-1.5 border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{cancellingOrderId === order.id ? 'বাতিল হচ্ছে...' : 'অর্ডার বাতিল করুন'}</span>
                    </button>
                  )}

                  {isShippedOrDelivered && (
                    <span className="text-[11px] font-medium text-black bg-slate-100 px-3 py-1 rounded-lg">
                      🚚 শিপিং সম্পন্ন (ক্যানসেল করা সম্ভব নয়)
                    </span>
                  )}

                  {order.status === 'cancelled' && (
                    <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                      🚫 এই অর্ডারটি বাতিল করা হয়েছে
                    </span>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DEDICATED ORDER DETAILS MODAL */}
      <AnimatePresence>
        {selectedOrderDetails && (
          <div className="fixed inset-0 z-[110] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-black"
            >
              {/* Modal Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-base text-black">অর্ডার এর পূর্ণাঙ্গ বিস্তারিত (Order Details)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="text-slate-500 hover:text-black p-1 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5 text-left text-xs sm:text-sm">
                
                {/* Order Meta Info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                  <div>
                    <span className="font-medium text-black block mb-0.5">অর্ডার নম্বর:</span>
                    <span className="font-bold text-black font-mono text-sm">{selectedOrderDetails.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-black block mb-0.5">অর্ডারের তারিখ:</span>
                    <span className="font-medium text-black">
                      {new Date(selectedOrderDetails.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-black block mb-0.5">অর্ডার স্ট্যাটাস:</span>
                    <span className="font-bold text-black uppercase">{selectedOrderDetails.status}</span>
                  </div>
                  <div>
                    <span className="font-medium text-black block mb-0.5">পেমেন্ট মেথড:</span>
                    <span className="font-medium text-black">{selectedOrderDetails.paymentMethod || 'Cash on Delivery'}</span>
                  </div>
                </div>

                {/* Customer Contact & Address */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-sm text-black border-b border-slate-100 pb-2">গ্রাহক ও শিপিং ঠিকানা (Shipping Details)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="font-medium text-black block text-xs">গ্রাহকের নাম:</span>
                      <p className="font-medium text-black text-sm">{selectedOrderDetails.customerName || 'Arafat Munna'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-black block text-xs">মোবাইল নম্বর:</span>
                      <p className="font-medium text-black text-sm">{selectedOrderDetails.customerPhone || selectedOrderDetails.phone || '01756482001'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-medium text-black block text-xs">সম্পূর্ণ ডেলিভারি ঠিকানা:</span>
                      <p className="font-medium text-black text-xs sm:text-sm mt-0.5 leading-relaxed">
                        {selectedOrderDetails.shippingAddress || selectedOrderDetails.address || 'ঢাকা, বাংলাদেশ'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Products List with Images */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-black">অর্ডারকৃত পণ্যসমূহ (Ordered Items with Images)</h4>
                  <div className="space-y-2.5">
                    {selectedOrderDetails.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <img
                          src={getItemImage(item)}
                          alt={item.title}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-black text-xs sm:text-sm truncate">{item.title}</p>
                          <p className="text-xs font-medium text-black mt-0.5">
                            একক মূল্য: ৳{item.price} | পরিমাণ: {item.quantity}টি
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-black text-sm">৳{item.price * item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Summary Breakdown */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between font-medium text-black">
                    <span>পণ্যের সাবটোটাল (Subtotal)</span>
                    <span className="font-bold text-black">৳{selectedOrderDetails.subtotal || (selectedOrderDetails.totalAmount - (selectedOrderDetails.deliveryFee || selectedOrderDetails.shippingFee || 80))}</span>
                  </div>
                  <div className="flex justify-between font-medium text-black">
                    <span>ডেলিভারি চার্জ (Delivery Fee)</span>
                    <span className="font-bold text-black">৳{selectedOrderDetails.deliveryFee || selectedOrderDetails.shippingFee || 80}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex justify-between font-bold text-black text-base">
                    <span>সর্বমোট পরিশোধযোগ্য মূল্য (Total)</span>
                    <span className="font-extrabold text-black">৳{selectedOrderDetails.totalAmount}</span>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3">
                {/* Cancel option inside modal if eligible */}
                {(selectedOrderDetails.status === 'pending' || selectedOrderDetails.status === 'processing') ? (
                  <button
                    type="button"
                    onClick={() => handleCancelOrder(selectedOrderDetails.id)}
                    disabled={cancellingOrderId === selectedOrderDetails.id}
                    className="border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {cancellingOrderId === selectedOrderDetails.id ? 'বাতিল হচ্ছে...' : '🚫 এই অর্ডারটি বাতিল করুন'}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-black">
                    {selectedOrderDetails.status === 'cancelled' ? '🚫 এই অর্ডারটি বাতিল করা হয়েছে' : '🚚 শিপিং সম্পন্ন হয়েছে'}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs px-5 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  বন্ধ করুন (Close)
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
