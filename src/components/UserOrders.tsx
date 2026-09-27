import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Clock, Truck, CheckCircle, Search, RefreshCw } from 'lucide-react';

interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

interface Order {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

export default function UserOrders({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyOrders = async () => {
    try {
      const res = await fetch('/api/platform/data');
      const data = await res.json();
      if (data.orders) {
        // Filter for this user in frontend as simplicity for this architecture
        setOrders(data.orders.filter((o: any) => o.customerId === userId || o.user_id === userId));
      }
    } catch (err) {
      console.error('Fetch my orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchMyOrders();

    // Live tracking using Supabase Channel
    if (!supabase) return;

    const channel = supabase
      .channel(`user-orders-${userId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `customer_id=eq.${userId}` 
        },
        (payload) => {
          console.log('Order update received:', payload);
          // Update local state immediately for better UX
          setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: payload.new.status } : o));
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold flex items-center justify-center gap-2">
    <RefreshCw className="w-5 h-5 animate-spin" /> Loading My Orders...
  </div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">My Orders</h2>
        <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold">
          {orders.length} Orders Total
        </span>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-lg font-black text-slate-800">You haven't placed any orders yet</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">Discover amazing deals and start your first purchase today!</p>
            <button 
               onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
               className="mt-6 bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-orange-700 transition-all"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Order ID</span>
                    <span className="text-sm font-black text-slate-900">{order.id}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold">
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                    order.status === 'shipped' ? 'bg-purple-100 text-purple-600' :
                    order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${
                      order.status === 'delivered' ? 'bg-emerald-600' : 'bg-current'
                    }`}></span>
                    {order.status}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Grand Total</p>
                    <p className="text-sm font-black text-orange-600">৳{order.totalAmount}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50/30">
                <div className="flex flex-wrap gap-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100 shadow-sm min-w-[200px]">
                      <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-500 font-bold">৳{item.price} × {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-1.5">
                   {order.status === 'delivered' ? (
                     <CheckCircle className="w-4 h-4 text-emerald-500" />
                   ) : (
                     <Truck className="w-4 h-4 text-orange-500 animate-bounce" />
                   )}
                   <span className="text-[10px] font-bold text-slate-600">
                     {order.status === 'delivered' ? 'Delivered successfully' : 'Live tracking active'}
                   </span>
                </div>
                <button className="text-[10px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">
                  Need Help?
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
