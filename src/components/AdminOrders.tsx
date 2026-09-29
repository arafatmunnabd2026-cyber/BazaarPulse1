import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Clock, Truck, CheckCircle, XCircle, ChevronDown, Search, Edit, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
  productUrl?: string;
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
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

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

    // Fast poll interval fallback to guarantee instant updates on any system
    const pollInterval = setInterval(() => {
      fetchOrders();
    }, 3000);

    // Enable Realtime for Admin
    if (!supabase) {
      return () => {
        clearInterval(pollInterval);
      };
    }

    const channel = supabase
      .channel('admin-order-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Realtime orders change received:', payload);
          fetchOrders(); // Refresh list on any change
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        (payload) => {
          console.log('Realtime order_items change received:', payload);
          fetchOrders(); // Refresh list on any change
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
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

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    try {
      const res = await fetch(`/api/admin/orders/${editingOrder.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(editingOrder)
      });
      const json = await res.json();
      if (json.success) {
        notify(`✅ Order ${editingOrder.id} details updated!`);
        setEditingOrder(null);
        fetchOrders();
      } else {
        notify(`❌ Update failed: ${json.error}`);
      }
    } catch (err) {
      notify('❌ Network error updating order');
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
                    <p className="text-[10px] text-slate-500 font-black mt-0.5 flex items-center gap-1.5 uppercase tracking-wider">
                      📅 {new Date(order.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      👤 {order.customerName}
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
                    onClick={() => setEditingOrder(order)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    title="Edit Order Details"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow"
                  >
                    <span>{expandedId === order.id ? 'Hide' : 'Details'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedId === order.id ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {expandedId === order.id && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 animate-in slide-in-from-top duration-300 space-y-6 text-left">
                  {/* Ordered Items Section */}
                  <div>
                    <h5 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Ordered Items</h5>
                    <div className="space-y-2 max-w-3xl">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                              {item.image ? (
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              {item.productUrl ? (
                                <a 
                                  href={item.productUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-sm font-bold text-slate-800 hover:text-orange-600 transition-colors leading-tight block hover:underline"
                                >
                                  {item.title}
                                </a>
                              ) : (
                                <p className="text-sm font-bold text-slate-800 leading-tight">{item.title}</p>
                              )}
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                {item.quantity} x ৳{item.price} {item.size && `• Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-slate-900">৳{item.price * item.quantity}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Details Block - Exactly like the Reference Image */}
                  <div className="border-t border-slate-200 pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Column 1: Contact */}
                      <div>
                        <h4 className="text-sm font-bold text-black mb-1">Contact</h4>
                        <p className="text-sm font-medium text-black leading-tight">{order.customerName},</p>
                        <p className="text-sm font-medium text-black leading-tight mt-0.5">{order.phone}</p>
                      </div>

                      {/* Column 2: Shipping Address */}
                      <div>
                        <h4 className="text-sm font-bold text-black mb-1">Shipping Address</h4>
                        <p className="text-sm font-medium text-black leading-relaxed">{order.address}</p>
                      </div>

                      {/* Column 3: Payment Method */}
                      <div>
                        <h4 className="text-sm font-bold text-black mb-1">Payment Method</h4>
                        <p className="text-sm font-medium text-black leading-tight">{order.paymentMethod}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 font-medium">Status:</span>
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

      {/* Edit Order Modal */}
      <AnimatePresence>
        {editingOrder && (
          <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                  <Edit className="w-6 h-6 text-orange-600" /> Edit Order {editingOrder.id}
                </h3>
                <button onClick={() => setEditingOrder(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateOrder} className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={editingOrder.customerName}
                    onChange={e => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:bg-white outline-none ring-orange-500/20 focus:ring-4 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editingOrder.phone}
                    onChange={e => setEditingOrder({ ...editingOrder, phone: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:bg-white outline-none ring-orange-500/20 focus:ring-4 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Shipping Address</label>
                  <textarea
                    required
                    rows={3}
                    value={editingOrder.address}
                    onChange={e => setEditingOrder({ ...editingOrder, address: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:bg-white outline-none ring-orange-500/20 focus:ring-4 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Order Status</label>
                    <select
                      value={editingOrder.status}
                      onChange={e => setEditingOrder({ ...editingOrder, status: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:bg-white outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Payment Status</label>
                    <select
                      value={editingOrder.paymentStatus}
                      onChange={e => setEditingOrder({ ...editingOrder, paymentStatus: e.target.value })}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:bg-white outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl text-xs uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white font-black py-3.5 rounded-xl text-xs uppercase shadow-xl transition-all active:scale-95"
                  >
                    Save Order Updates
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
