import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingBag, LogOut, Plus, Star, Package, X, Sparkles 
} from 'lucide-react';

export default function VendorDashboard({ 
  data, 
  currentVendorId, 
  setCurrentVendorId, 
  refreshData, 
  notify, 
  authToken = '', 
  authUser, 
  navigateTo, 
  onLogout 
}: { 
  data: any; 
  currentVendorId: string; 
  setCurrentVendorId: (id: string) => void; 
  refreshData: () => void; 
  notify: (msg: string) => void; 
  authToken?: string;
  authUser?: any;
  navigateTo?: (path: string) => void;
  onLogout?: () => void;
}) {
  const currentVendor = data.vendors?.find((v: any) => v.id === currentVendorId) || data.vendors?.[0] || { id: 'v1', storeName: 'Vendor Store', balance: 0, totalSales: 0 };
  const vendorProducts = (data.products || []).filter((p: any) => p.vendorId === currentVendor?.id);
  const vendorOrders = (data.orders || []).filter((o: any) => (o.items || []).some((i: any) => i.vendorId === currentVendor?.id));
  const vendorWithdrawals = (data.withdrawals || []).filter((w: any) => w.vendorId === currentVendor?.id);

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'payouts'>('overview');
  
  // New Product Modal & AI description generator
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    discountPrice: '',
    stock: '',
    categoryId: data.categories?.[0]?.id || '',
    images: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
    description: '',
    keyFeatures: ''
  });
  const [aiGenerating, setAiGenerating] = useState(false);

  // Withdrawal request amount
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  const handleGenerateAiDescription = async () => {
    if (!newProduct.title) {
      notify('Please enter a product title first');
      return;
    }
    setAiGenerating(true);
    try {
      const cat = data.categories.find((c: any) => c.id === newProduct.categoryId)?.name || 'General';
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newProduct.title, categoryName: cat, keyFeatures: newProduct.keyFeatures })
      });
      const json = await res.json();
      if (json.description) {
        setNewProduct(prev => ({ ...prev, description: json.description }));
        notify('✨ AI generated professional product description!');
      }
    } catch (err) {
      notify('AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = data.categories.find((c: any) => c.id === newProduct.categoryId);

    const payload = {
      title: newProduct.title,
      price: parseFloat(newProduct.price),
      discountPrice: newProduct.discountPrice ? parseFloat(newProduct.discountPrice) : null,
      stock: parseInt(newProduct.stock) || 10,
      categoryId: newProduct.categoryId,
      categoryName: cat ? cat.name : 'General',
      vendorId: currentVendor.id,
      vendorName: currentVendor.storeName,
      images: [newProduct.images],
      description: newProduct.description
    };

    try {
      const res = await fetch('/api/vendor/products', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }
      if (json.success) {
        notify('🚀 Product created successfully!');
        setIsProductModalOpen(false);
        refreshData();
      }
    } catch (err) {
      notify('Failed to create product');
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (amt <= 0 || amt > currentVendor.balance) {
      notify('Invalid withdrawal amount or insufficient balance');
      return;
    }

    try {
      const res = await fetch('/api/vendor/withdrawals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ vendorId: currentVendor.id, amount: amt, bankDetails })
      });
      const json = await res.json();
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }
      if (json.success) {
        notify('💸 Withdrawal request submitted to admin!');
        setWithdrawAmount('');
        setBankDetails('');
        refreshData();
      }
    } catch (err) {
      notify('Failed to request withdrawal');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }
      notify('Order status updated');
      refreshData();
    } catch (err) {
      notify('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Vendor Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-[41px] z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={currentVendor.logo} alt="" className="w-12 h-12 rounded-xl object-cover border" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-slate-900">{currentVendor.storeName}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  currentVendor.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {currentVendor.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500">Commission Rate: {currentVendor.commissionRate}% • Balance: ৳{currentVendor.balance}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">Switch Store:</span>
            <select
              value={currentVendorId}
              onChange={e => setCurrentVendorId(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-orange-500"
            >
              {data.vendors.map((v: any) => (
                <option key={v.id} value={v.id}>{v.storeName} ({v.status})</option>
              ))}
            </select>

            {navigateTo && (
              <button
                onClick={() => navigateTo('/')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-all shadow-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                <span>Storefront</span>
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-200 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'overview' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            📊 Analytics & Earnings
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'products' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            📦 Products ({vendorProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'orders' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            📋 Orders ({vendorOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'payouts' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            💰 Payouts & Withdrawals
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Available Balance</div>
                <div className="text-3xl font-extrabold text-emerald-600 mt-2">৳{currentVendor.balance}</div>
                <div className="text-xs text-slate-400 mt-1">Ready for withdrawal</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Total Lifetime Sales</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-2">৳{currentVendor.totalSales}</div>
                <div className="text-xs text-slate-400 mt-1">Across all orders</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Active Products</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-2">{vendorProducts.length}</div>
                <div className="text-xs text-slate-400 mt-1">Listed in store</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-500 text-xs font-bold uppercase">Store Rating</div>
                <div className="text-3xl font-extrabold text-amber-500 mt-2 flex items-center gap-1">
                  <Star className="w-6 h-6 fill-amber-500" /> {currentVendor.rating || '5.0'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Based on buyer reviews</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="font-bold text-lg mb-3">Vendor Guidelines & Commission Policy</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Welcome to BazaarPulse multi-vendor portal. As a verified vendor, you keep {100 - currentVendor.commissionRate}% of every sale. 
                Platform commission is automatically deducted upon order settlement. You can request payouts anytime once your balance exceeds ৳1,000.
              </p>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Your Store Products</h3>
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl shadow transition-all flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Add New Product
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {vendorProducts.map((p: any) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <img src={p.images?.[0] || p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'} alt="" className="w-full h-40 object-cover rounded-xl mb-3" />
                    <h4 className="font-bold text-slate-900 line-clamp-1">{p.title}</h4>
                    <div className="text-orange-600 font-extrabold text-sm mt-1">৳{p.discountPrice || p.price} <span className="text-xs text-slate-400 font-normal">Stock: {p.stock}</span></div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">{p.categoryName}</span>
                    <span className="text-emerald-600 font-bold">Sold: {p.totalSold}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-bold mb-4">Customer Orders for Your Store</h3>
            {vendorOrders.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border text-slate-400">
                No orders received yet.
              </div>
            ) : (
              vendorOrders.map((ord: any) => (
                <div key={ord.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900">{ord.id}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ord.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Customer: <span className="font-medium text-slate-800">{ord.customerName}</span> ({ord.customerPhone})</div>
                    <div className="text-xs text-slate-400 mt-0.5">Address: {ord.shippingAddress}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Payment: {ord.paymentMethod}</div>
                      <div className="font-extrabold text-orange-600 text-lg">৳{ord.totalAmount}</div>
                    </div>
                    <select
                      value={ord.status}
                      onChange={e => updateOrderStatus(ord.id, e.target.value)}
                      className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    >
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm md:col-span-1">
              <h3 className="font-bold text-lg mb-4">Request Withdrawal</h3>
              <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Amount (BDT)</label>
                  <input
                    type="number"
                    required
                    max={currentVendor.balance}
                    placeholder={`Max ৳${currentVendor.balance}`}
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Bank / Mobile Wallet Details</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bKash Merchant 01712..."
                    value={bankDetails}
                    onChange={e => setBankDetails(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow transition-all cursor-pointer"
                >
                  Submit Payout Request
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm md:col-span-2">
              <h3 className="font-bold text-lg mb-4">Payout History</h3>
              <div className="space-y-3">
                {vendorWithdrawals.length === 0 ? (
                  <p className="text-slate-400 text-sm">No payout requests submitted.</p>
                ) : (
                  vendorWithdrawals.map((w: any) => (
                    <div key={w.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">৳{w.amount}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{w.bankDetails}</div>
                        <div className="text-[10px] text-slate-400 mt-1">Requested: {w.requestedAt ? w.requestedAt.split('T')[0] : 'N/A'}</div>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                        w.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        w.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {w.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal with AI Generator */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-600" /> Add New Store Product
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Product Title</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wireless Mechanical Gaming Keyboard"
                    value={newProduct.title}
                    onChange={e => setNewProduct({ ...newProduct, title: e.target.value })}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAiDescription}
                    disabled={aiGenerating}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> {aiGenerating ? 'Generating...' : 'AI Writer'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Regular Price (৳)</label>
                  <input
                    type="number"
                    required
                    value={newProduct.price}
                    onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Discount Price (৳)</label>
                  <input
                    type="number"
                    value={newProduct.discountPrice}
                    onChange={e => setNewProduct({ ...newProduct, discountPrice: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock}
                    onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Category</label>
                  <select
                    value={newProduct.categoryId}
                    onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                  >
                    {data.categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Image URL</label>
                <input
                  type="url"
                  required
                  value={newProduct.images}
                  onChange={e => setNewProduct({ ...newProduct, images: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Key Features (for AI Writer)</label>
                <input
                  type="text"
                  placeholder="RGB backlit, blue switches, 2.4G wireless..."
                  value={newProduct.keyFeatures}
                  onChange={e => setNewProduct({ ...newProduct, keyFeatures: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow cursor-pointer"
                >
                  Publish Product
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
