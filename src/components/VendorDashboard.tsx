import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingBag, LogOut, Plus, Star, Package, X, Sparkles, TrendingUp, DollarSign,
  Settings, Upload, Image, Store, Check, Camera
} from 'lucide-react';
import { addOrderStatusNotification } from '../lib/notificationStore';

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
  const currentVendor = (data.vendors || []).find((v: any) => v.id === currentVendorId || v.id === authUser?.vendorId || v.email === authUser?.email) || 
    (data.vendors || [])[0] || 
    (authUser?.role === 'vendor' ? { 
      id: authUser.vendorId || 'v_me', 
      storeName: authUser.storeName || authUser.name || 'My Vendor Store', 
      ownerName: authUser.name, 
      email: authUser.email, 
      balance: 0, 
      totalSales: 0 
    } : null);
  const [vendorOrdersState, setVendorOrdersState] = useState<any[]>([]);

  useEffect(() => {
    const fetchVendorOrders = async () => {
      try {
        const activeToken = authToken || localStorage.getItem('bazaarpulse_token') || '';
        const res = await fetch('/api/vendor/orders', {
          headers: activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {}
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.orders)) {
          setVendorOrdersState(json.orders);
        }
      } catch (e) {}
    };
    fetchVendorOrders();
    const interval = setInterval(fetchVendorOrders, 5000);
    return () => clearInterval(interval);
  }, [authToken]);

  const vendorProducts = (data.products || []).filter((p: any) => p.vendorId === currentVendor?.id);
  const vendorOrders = vendorOrdersState.length > 0 ? vendorOrdersState : (data.orders || []).filter((o: any) => (o.items || []).some((i: any) => String(i.vendorId) === String(currentVendor?.id)));
  const vendorWithdrawals = (data.withdrawals || []).filter((w: any) => w.vendorId === currentVendor?.id);

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'payouts' | 'settings'>('overview');
  const [loading, setLoading] = useState(false);

  // Store Profile & Photos Form State
  const [storeForm, setStoreForm] = useState({
    storeName: currentVendor?.storeName || '',
    ownerName: currentVendor?.ownerName || '',
    phone: currentVendor?.phone || '',
    logo: currentVendor?.logo || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=150',
    banner: currentVendor?.banner || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
    paymentMethod: currentVendor?.paymentMethod || 'bkash',
    paymentNumber: currentVendor?.paymentNumber || ''
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentVendor) {
      setStoreForm({
        storeName: currentVendor.storeName || '',
        ownerName: currentVendor.ownerName || '',
        phone: currentVendor.phone || '',
        logo: currentVendor.logo || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=150',
        banner: currentVendor.banner || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
        paymentMethod: currentVendor.paymentMethod || 'bkash',
        paymentNumber: currentVendor.paymentNumber || ''
      });
    }
  }, [currentVendor?.id, currentVendor?.logo, currentVendor?.banner]);

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setStoreForm(prev => ({ ...prev, logo: e.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setStoreForm(prev => ({ ...prev, banner: e.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStoreProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const vendorTargetId = currentVendor?.id || authUser?.vendorId || authUser?.id || 'v_me';
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors/${vendorTargetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify(storeForm)
      });
      const data = await res.json();
      if (data.success) {
        notify('🎉 স্টোর ছবি ও প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!');
        refreshData();
      } else {
        notify('❌ ' + (data.error || 'Failed to update store profile'));
      }
    } catch (err: any) {
      notify('❌ Error updating store profile');
    } finally {
      setLoading(false);
    }
  };
  
  // New Product Modal & AI description generator
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    discountPrice: '',
    stock: '',
    categoryId: data.categories?.[0]?.id || '',
    images: [] as string[],
    description: ''
  });
  const [productImageUrlInput, setProductImageUrlInput] = useState('');
  const productImageFileInputRef = useRef<HTMLInputElement>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleAddProductImages = (files: FileList) => {
    const currentLength = newProduct.images.length;
    const remainingSlots = 5 - currentLength;
    if (remainingSlots <= 0) {
      notify('⚠️ সর্বোচ্চ ৫টি প্রডাক্ট ছবি আপলোড করা যাবে');
      return;
    }
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setNewProduct(prev => {
            if (prev.images.length >= 5) return prev;
            return { ...prev, images: [...prev.images, e.target!.result as string] };
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddImageUrl = () => {
    if (!productImageUrlInput.trim()) return;
    if (newProduct.images.length >= 5) {
      notify('⚠️ সর্বোচ্চ ৫টি প্রডাক্ট ছবি আপলোড করা যাবে');
      return;
    }
    setNewProduct(prev => ({ ...prev, images: [...prev.images, productImageUrlInput.trim()] }));
    setProductImageUrlInput('');
  };

  const handleRemoveProductImage = (indexToRemove: number) => {
    setNewProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

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
        body: JSON.stringify({ title: newProduct.title, categoryName: cat })
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
    if (!newProduct.images || newProduct.images.length === 0) {
      notify('⚠️ অনুগ্রহ করে সর্বনিম্ন ১টি প্রোডাক্ট ছবি আপলোড বা যুক্ত করুন (সর্বোচ্চ ৫টি)');
      return;
    }
    if (newProduct.images.length > 5) {
      notify('⚠️ সর্বোচ্চ ৫টি প্রডাক্ট ছবি নির্বাচন করা যাবে');
      return;
    }

    const cat = data.categories.find((c: any) => c.id === newProduct.categoryId);
    const vendorTargetId = currentVendor?.id || authUser?.vendorId || authUser?.id || 'v_me';

    const payload = {
      title: newProduct.title,
      price: parseFloat(newProduct.price),
      discountPrice: newProduct.discountPrice ? parseFloat(newProduct.discountPrice) : null,
      stock: parseInt(newProduct.stock) || 10,
      categoryId: newProduct.categoryId,
      categoryName: cat ? cat.name : 'General',
      vendorId: vendorTargetId,
      vendorName: currentVendor?.storeName || 'Vendor Store',
      images: newProduct.images,
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
    if (!amt || amt <= 0) {
      notify('⚠️ অনুগ্রহ করে সঠিক উত্তোলনের পরিমাণ লিখুন');
      return;
    }
    const currentBal = Number(currentVendor?.balance || 0);
    if (currentBal < amt) {
      notify(`⚠️ অপর্যাপ্ত ব্যালেন্স! আপনার বর্তমান ব্যালেন্স ৳${currentBal}`);
      return;
    }

    try {
      const vendorTargetId = currentVendor?.id || authUser?.vendorId || authUser?.id || 'v_me';
      const res = await fetch('/api/vendor/withdrawals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ vendorId: vendorTargetId, amount: amt, bankDetails })
      });
      const json = await res.json();
      if (res.status === 403 || res.status === 401) {
        notify(`🛡️ RBAC Blocked (${res.status}): ${json.error || 'Access Denied'}`);
        return;
      }
      if (json.success) {
        notify('💸 পেআউট আবেদনের অনুরোধ সফলভাবে জমা দেওয়া হয়েছে!');
        setWithdrawAmount('');
        setBankDetails('');
        refreshData();
      } else {
        notify('❌ ' + (json.error || 'Withdrawal request failed'));
      }
    } catch (err) {
      notify('❌ Failed to request withdrawal');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const targetOrder = (vendorOrders || []).find((o: any) => String(o.id) === String(orderId));
      const fallbackUserId = targetOrder?.customerId || targetOrder?.user_id || (targetOrder as any)?.userId;

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
      const orderOwnerId = json.order?.user_id || json.order?.customerId || fallbackUserId;
      if (orderOwnerId) {
        addOrderStatusNotification(orderId, status, orderOwnerId);
      }
      window.dispatchEvent(new CustomEvent('bazaarpulse-order-status-updated', { detail: { orderId, status, userId: orderOwnerId } }));
      notify('Order status updated');
      refreshData();
    } catch (err) {
      notify('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Fixed Clean Vendor Header & Navigation Panel */}
      <div className="bg-white border-b border-slate-200 shadow-sm relative z-20">
        <div className="max-w-7xl mx-auto px-4 pt-5 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            {/* Store Branding */}
            <div className="flex items-center gap-3.5">
              <img 
                src={currentVendor?.logo || 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=150'} 
                alt={currentVendor?.storeName || 'Vendor Store'} 
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0 bg-slate-100" 
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">
                    {currentVendor?.storeName || 'Vendor Portal'}
                  </h2>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                    currentVendor?.status === 'approved' 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                      : currentVendor?.status === 'pending'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {currentVendor?.status === 'approved' ? 'APPROVED (অনুমোদিত)' : currentVendor?.status?.toUpperCase() || 'APPROVED'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Commission Rate: <strong className="text-orange-600 font-bold">{currentVendor?.commissionRate || 10}%</strong></span>
                  <span>•</span>
                  <span>Available Balance: <strong className="text-emerald-700 font-bold">৳{currentVendor?.balance || 0}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Actions & Store Switcher */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
              {data?.vendors && data.vendors.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-600 font-medium">Switch Store:</span>
                  <select
                    value={currentVendorId}
                    onChange={e => setCurrentVendorId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    {data.vendors.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.storeName} ({v.status})</option>
                    ))}
                  </select>
                </div>
              )}

              {navigateTo && (
                <button
                  onClick={() => navigateTo('/')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 transition-all shadow-xs cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-orange-600" />
                  <span>Storefront (স্টোরফ্রন্ট)</span>
                </button>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-red-200 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>

          {/* Clean Navigation Tabs inside Header Area */}
          <div className="pt-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'overview' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Analytics & Earnings</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'products' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products ({vendorProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'orders' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Orders ({vendorOrders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'payouts' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Payouts & Withdrawals</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                activeTab === 'settings' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Store Profile & Photos (স্টোর ছবি ও তথ্য)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 mt-6">

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
                    min="1"
                    placeholder="উত্তোলনের পরিমাণ লিখুন (টাকা)"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900"
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

        {/* Store Settings & Photo Upload Tab */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveStoreProfile} className="mt-6 space-y-6 text-left">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Store className="w-6 h-6 text-orange-600" />
                    <span>স্টোর ছবি ও প্রোফাইল সেটিংস (Store Profile & Photo Upload)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    আপনার দোকানের লোগো, ব্যানার ফটো এবং পেআউট তথ্য আপডেট করুন
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'স্টোর তথ্য সেভ করুন'}</span>
                </button>
              </div>

              {/* 1. Banner Photo Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                  🖼️ স্টোর ব্যানার ফটো (Store Cover Banner Photo)
                </label>

                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && handleBannerUpload(e.target.files[0])}
                  className="hidden"
                  id="store-banner-file"
                />

                <div className="relative h-44 sm:h-56 w-full rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-900 group shadow-inner">
                  <img 
                    src={storeForm.banner} 
                    alt="Store Banner Preview" 
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <label
                      htmlFor="store-banner-file"
                      className="bg-white hover:bg-slate-100 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs shadow-lg cursor-pointer flex items-center gap-1.5 transition-transform hover:scale-105"
                    >
                      <Camera className="w-4 h-4 text-orange-600" />
                      <span>গ্যালারি থেকে ব্যানার ছবি আপলোড করুন</span>
                    </label>
                  </div>
                  <label
                    htmlFor="store-banner-file"
                    className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-950 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <Upload className="w-3.5 h-3.5 text-orange-400" />
                    <span>Upload Banner Image</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">অথবা ব্যানার লিংক (Image URL):</span>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={storeForm.banner}
                    onChange={e => setStoreForm(prev => ({ ...prev, banner: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* 2. Store Logo Avatar Upload */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                  🏬 স্টোর লোগো ছবি (Store Logo Avatar)
                </label>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                  className="hidden"
                  id="store-logo-file"
                />

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-300 bg-white shrink-0 group shadow-md">
                    <img 
                      src={storeForm.logo} 
                      alt="Store Logo Preview" 
                      className="w-full h-full object-cover" 
                    />
                    <label
                      htmlFor="store-logo-file"
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                    >
                      <Camera className="w-6 h-6 text-orange-400" />
                    </label>
                  </div>

                  <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <label
                        htmlFor="store-logo-file"
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Upload className="w-4 h-4" />
                        <span>লোগো ছবি আপলোড করুন</span>
                      </label>
                      <span className="text-[11px] text-slate-400">(Square Image PNG/JPG Max 5MB)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">অথবা লোগো লিংক:</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={storeForm.logo}
                        onChange={e => setStoreForm(prev => ({ ...prev, logo: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Store Info Text Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">দোকানের নাম (Store Name) *</label>
                  <input
                    type="text"
                    required
                    value={storeForm.storeName}
                    onChange={e => setStoreForm(prev => ({ ...prev, storeName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">স্বত্বাধিকারীর নাম (Owner Name) *</label>
                  <input
                    type="text"
                    required
                    value={storeForm.ownerName}
                    onChange={e => setStoreForm(prev => ({ ...prev, ownerName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">যোগাযোগ নম্বর (Phone) *</label>
                  <input
                    type="tel"
                    required
                    value={storeForm.phone}
                    onChange={e => setStoreForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">পেমেন্ট গেটওয়ে ও নম্বর (Payout Mobile Number)</label>
                  <div className="flex gap-2">
                    <select
                      value={storeForm.paymentMethod}
                      onChange={e => setStoreForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    >
                      <option value="bkash">বিকাশ</option>
                      <option value="nagad">নগদ</option>
                      <option value="rocket">রকেট</option>
                      <option value="bank">ব্যাংক</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="017XXXXXXXX"
                      value={storeForm.paymentNumber}
                      onChange={e => setStoreForm(prev => ({ ...prev, paymentNumber: e.target.value }))}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-black px-8 py-3 rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'স্টোর ছবি ও তথ্য সংরক্ষণ করুন (Save Profile & Photos)'}</span>
                </button>
              </div>
            </div>
          </form>
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
                    placeholder=""
                    autoComplete="off"
                    spellCheck={false}
                    value={newProduct.title}
                    onChange={e => setNewProduct({ ...newProduct, title: e.target.value })}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
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

              {/* Product Multi-Image Upload (Min 1, Max 5) */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase text-slate-800 tracking-wider">
                    🖼️ প্রডাক্ট ছবি আপলোড (Product Images) *
                  </label>
                  <span className="text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                    ({newProduct.images.length}/5 টি ছবি নির্বাচিত)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  সর্বনিম্ন ১টি এবং সর্বোচ্চ ৫টি প্রোডাক্ট ছবি আপলোড করতে পারবেন।
                </p>

                {/* Hidden File Input for Multi Upload */}
                <input
                  ref={productImageFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => e.target.files && handleAddProductImages(e.target.files)}
                  className="hidden"
                  id="product-images-file-input"
                />

                {/* Image Previews Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                  {newProduct.images.map((imgUrl, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-300 bg-white group shadow-xs">
                      <img src={imgUrl} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                      
                      <span className="absolute top-1 left-1 bg-black/70 backdrop-blur-md text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                        {idx === 0 ? 'Main Photo' : `Photo ${idx + 1}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveProductImage(idx)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow transition-transform hover:scale-110 cursor-pointer"
                        title="ছবিটি রিমুভ করুন"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add More Button slot if < 5 */}
                  {newProduct.images.length < 5 && (
                    <label
                      htmlFor="product-images-file-input"
                      className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-orange-500 bg-white hover:bg-orange-50/50 cursor-pointer p-2 text-center transition-all group"
                    >
                      <Plus className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-[10px] font-bold text-slate-700">ছবি আপলোড</span>
                      <span className="text-[8px] text-slate-400">({5 - newProduct.images.length}টি ফাঁকা)</span>
                    </label>
                  )}
                </div>

                {/* Optional URL Input Alternative */}
                {newProduct.images.length < 5 && (
                  <div className="flex gap-2 pt-2">
                    <input
                      type="url"
                      placeholder="অথবা সরাসরি ইমেজ লিংক (URL) পেস্ট করুন..."
                      value={productImageUrlInput}
                      onChange={e => setProductImageUrlInput(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-xl text-xs shrink-0 cursor-pointer"
                    >
                      + লিংক যোগ করুন
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Product Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write detailed specifications or descriptions about this product..."
                  value={newProduct.description}
                  onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
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
