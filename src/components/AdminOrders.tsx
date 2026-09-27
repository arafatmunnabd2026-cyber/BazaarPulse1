import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Clock, Truck, CheckCircle, XCircle, ChevronDown, Search } from 'lucide-react';

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
  customerName: string;
  customerEmail: string;
  address: string;
  phone: string;
  createdAt: string;
  items: OrderItem[];
}

export default function AdminOrders({ authToken, notify }: { authToken: string, notify: (m: string) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/platform/data');
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Enable Realtime for Admin
    if (!supabase) return;

    const channel = supabase
      .channel('admin-order-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Realtime change received:', payload);
          fetchOrders(); // Refresh list on any change
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        notify(`📦 Order ${orderId} updated to ${newStatus}`);
        fetchOrders();
      } else {
        notify(`❌ Update failed: ${json.error}`);
      }
    } catch (err) {
      notify('❌ Network error updating status');
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) || 
                          o.customerName.toLowerCase().includes(search.toLowerCase()) ||
                          o.phone.includes(search);
    return matchesFilter && matchesSearch;
  });

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading Real Orders...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order ID, Name, or Phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                filter === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No real orders found matching your criteria.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300">
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                    order.status === 'shipped' ? 'bg-purple-100 text-purple-600' :
                    order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-rose-100 text-rose-600'
                  }`}>
                    {order.status === 'delivered' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 flex items-center gap-2">
                      {order.id}
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        {order.paymentMethod}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                      {new Date(order.createdAt).toLocaleString()} • {order.customerName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Amount</p>
                    <p className="text-sm font-black text-orange-600">৳{order.totalAmount}</p>
                  </div>
                  
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <button
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedId === order.id ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {expandedId === order.id && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 animate-in slide-in-from-top duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Ordered Items</h5>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-slate-400" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800 leading-tight">{item.title}</p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  {item.quantity} x ৳{item.price} {item.size && `• Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm font-black text-slate-900">৳{item.price * item.quantity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Delivery Details</h5>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-start gap-3">
                          <Truck className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-slate-900">Shipping Address</p>
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{order.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600">P</div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">Contact Number</p>
                            <p className="text-xs text-slate-600 mt-0.5">{order.phone}</p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500">Payment Status</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
