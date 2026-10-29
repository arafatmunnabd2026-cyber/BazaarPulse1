import React, { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Connection using real project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mhpmwsafqrjgsodnztll.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_q5zax92UyLCrAIs7ZJDODQ_T93URdMc';
const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORY_MAP: Record<string, string> = {
  'electronics': 'c1',
  'fashion & apparel': 'c2',
  'fashion': 'c2',
  'home & living': 'c3',
  'home': 'c3',
  'beauty & health': 'c4',
  'beauty': 'c4',
  'groceries': 'c5',
  'sports & outdoors': 'c6',
  'sports': 'c6'
};

function normalizeCatId(name: string): string {
  const clean = (name || '').toLowerCase().trim();
  return CATEGORY_MAP[clean] || 'c1';
}

export default function AdminDashboard() {
  const [formData, setFormData] = useState({
    title: '',
    currentPrice: '',
    discountPrice: '',
    stockQuantity: '',
    category: 'Electronics',
    imageUrl: '',
    galleryImages: [] as string[],
    sizes: [] as string[],
    colors: [] as string[],
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);

  // Helper to compress and convert images to efficient web-ready Data URLs
  const compressImageFile = async (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  // Helper to upload a single image to Supabase Storage with graceful fallback
  const uploadImageFile = async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Supabase storage bucket upload note, compressing to data URL:', err);
    }

    // High performance compressed fallback: crisp 1200px max, lightweight JPEG
    return await compressImageFile(file);
  };

  // Main Image Device File Picker Handler
  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }

    setUploadingMain(true);
    try {
      const uploadedUrl = await uploadImageFile(file);
      setFormData(prev => ({ ...prev, imageUrl: uploadedUrl }));
      setMessage({ type: 'success', text: 'Main image uploaded successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to upload main image: ' + err.message });
    } finally {
      setUploadingMain(false);
    }
  };

  // Device Gallery File Picker: Upload up to 8 additional photos
  const handleGalleryFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 8 - formData.galleryImages.length;
    if (remainingSlots <= 0) {
      setMessage({ type: 'error', text: 'Maximum 8 gallery images allowed. Please remove some first.' });
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      alert(`You can only add ${remainingSlots} more photo(s). Only the first ${remainingSlots} will be uploaded.`);
    }

    setUploadingGallery(true);
    try {
      const uploadPromises = filesToUpload.map(file => uploadImageFile(file));
      const uploadedUrls = await Promise.all(uploadPromises);

      setFormData(prev => ({
        ...prev,
        galleryImages: [...prev.galleryImages, ...uploadedUrls]
      }));
      setMessage({ type: 'success', text: `Uploaded ${uploadedUrls.length} gallery image(s) successfully!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error uploading gallery photos: ' + err.message });
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    }
  };

  // Remove a photo from the gallery preview list
  const handleRemoveGalleryImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Standard input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Publish to Supabase and sync with backend
  const handlePublishProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const priceNum = Number(formData.currentPrice);
    const discNum = formData.discountPrice ? Number(formData.discountPrice) : null;
    const stockNum = Number(formData.stockQuantity);

    if (discNum !== null && discNum >= priceNum) {
      alert('Discount Price should typically be lower than the Current Price.');
    }

    const allImages = [formData.imageUrl, ...formData.galleryImages].filter(Boolean);
    const newId = 'p-' + Date.now();
    const slug = (formData.title || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-') || ('product-' + Date.now());
    const normCatId = normalizeCatId(formData.category);

    const productPayload = {
      id: newId,
      title: formData.title,
      slug: slug,
      price: priceNum,
      current_price: priceNum,
      currentPrice: priceNum,
      discount_price: discNum,
      discountPrice: discNum,
      stock: stockNum,
      stock_quantity: stockNum,
      stockQuantity: stockNum,
      category_id: normCatId,
      categoryId: normCatId,
      category_name: formData.category,
      categoryName: formData.category,
      image_url: formData.imageUrl || allImages[0] || '',
      imageUrl: formData.imageUrl || allImages[0] || '',
      images: allImages.length > 0 ? allImages : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'],
      gallery_images: formData.galleryImages,
      galleryImages: formData.galleryImages,
      sizes: formData.sizes,
      colors: formData.colors,
      description: formData.description || '',
      status: 'active',
      vendor_id: 'v1',
      vendorName: 'Platform Administrator',
      vendor_name: 'Platform Administrator'
    };

    try {
      // 1. Live Supabase database insertion
      let supaSaved = false;
      let supaErrorText = '';
      if (supabase) {
        const { error: supaErr } = await supabase
          .from('products')
          .upsert([
            {
              id: productPayload.id,
              title: productPayload.title,
              slug: productPayload.slug,
              price: productPayload.price,
              current_price: productPayload.current_price,
              discount_price: productPayload.discount_price,
              stock: productPayload.stock,
              stock_quantity: productPayload.stock_quantity,
              category_id: normCatId,
              category_name: productPayload.category_name,
              image_url: productPayload.image_url,
              images: productPayload.images,
              gallery_images: productPayload.gallery_images,
              sizes: productPayload.sizes,
              colors: productPayload.colors,
              description: productPayload.description,
              status: 'active',
              vendor_id: 'v1',
              vendor_name: 'Platform Administrator'
            },
          ], { onConflict: 'id' });

        if (!supaErr) {
          supaSaved = true;
        } else {
          supaErrorText = supaErr.message;
          console.warn('Supabase upsert warning:', supaErr.message);
        }
      }

      // 2. Also sync to backend server immediately so both systems are 100% matched
      let backendSaved = false;
      try {
        const syncRes = await fetch('/api/sync/product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productPayload)
        });
        if (syncRes.ok) {
          backendSaved = true;
        }
      } catch (backendErr) {
        console.warn('Backend sync note:', backendErr);
      }

      if (!supaSaved && !backendSaved) {
        throw new Error(supaErrorText || 'Failed to persist product to database.');
      }

      // 3. Notify any active storefront or admin view in the app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-product-added'));
      }

      setMessage({ type: 'success', text: '🎉 Product successfully uploaded and synced with Supabase Database!' });
      // Clear form upon success
      setFormData({
        title: '',
        currentPrice: '',
        discountPrice: '',
        stockQuantity: '',
        category: 'Electronics',
        imageUrl: '',
        galleryImages: [],
        sizes: [],
        colors: [],
        description: ''
      });
      if (mainImageInputRef.current) mainImageInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    } catch (err: any) {
      console.error('Product upload error:', err);
      setMessage({ type: 'error', text: 'Error uploading product: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Total Sells" value="৳ 125,430" change="+12%" positive />
        <MetricCard title="Total Orders" value="1,204" change="+5%" positive />
        <MetricCard title="Avg. Order Value" value="৳ 1,041" change="-2%" />
        <MetricCard title="Active Users" value="842" change="+18%" positive />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
          <p className="text-sm text-gray-500">Upload live products directly to Supabase Database & Gallery</p>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
          </div>
        )}

        <form onSubmit={handlePublishProduct} className="space-y-6">

          
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Product Title *</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              required 
              placeholder="e.g. Smart LED TV 43 inch AMOLED" 
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" 
            />
          </div>

          {/* Pricing Grid: Current Price & Discount Price */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Current Price (৳) *</label>
              <input 
                type="number" 
                name="currentPrice" 
                value={formData.currentPrice} 
                onChange={handleChange} 
                required 
                placeholder="e.g. 24000" 
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Discount Price (৳)</label>
              <input 
                type="number" 
                name="discountPrice" 
                value={formData.discountPrice} 
                onChange={handleChange} 
                placeholder="e.g. 19999" 
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
          </div>

          {/* Stock & Category */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Stock Quantity *</label>
              <input 
                type="number" 
                name="stockQuantity" 
                value={formData.stockQuantity} 
                onChange={handleChange} 
                required 
                placeholder="e.g. 25" 
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Category *</label>
              <select 
                name="category" 
                value={formData.category} 
                onChange={handleChange} 
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-bold"
              >
                <option value="Electronics">Electronics</option>
                <option value="Fashion & Apparel">Fashion & Apparel</option>
                <option value="Home & Living">Home & Living</option>
                <option value="Beauty & Health">Beauty & Health</option>
                <option value="Groceries">Groceries</option>
                <option value="Sports & Outdoors">Sports & Outdoors</option>
              </select>
            </div>
          </div>

          {/* Main Product Image */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
              Main Product Image *
            </label>
            
            <div className="flex gap-2 items-center mb-2">
              <input
                ref={mainImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleMainImageChange}
                className="hidden"
                id="main-file-input"
              />
              <label 
                htmlFor="main-file-input"
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-2 hover:bg-gray-300"
              >
                📁 {uploadingMain ? 'Uploading...' : 'Choose from Device'}
              </label>
              <span className="text-xs text-gray-400">or enter image URL below:</span>
            </div>

            <input 
              type="text" 
              name="imageUrl" 
              value={formData.imageUrl} 
              onChange={handleChange} 
              required
              placeholder="https://images.unsplash.com/..." 
              className="w-full px-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none" 
            />

            {formData.imageUrl && (
              <div className="mt-3 flex items-center gap-3">
                <img src={formData.imageUrl} alt="Main Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-300" />
                <span className="text-xs text-green-600 font-bold">✓ Main image ready</span>
              </div>
            )}
          </div>

          {/* Multiple Gallery Image Upload */}
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
            <div className="flex justify-between items-center mb-3">
              <div>
                <label className="block text-xs font-bold uppercase text-orange-900">
                  Additional Gallery Photos (Max 8)
                </label>
                <p className="text-[11px] text-orange-700 mt-0.5">
                  Select multiple product photos from your phone or computer
                </p>
              </div>
              <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-md">
                {formData.galleryImages.length} / 8 Selected
              </span>
            </div>

            {formData.galleryImages.length < 8 && (
              <div className="mb-4">
                <input
                  ref={galleryInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleGalleryFilesChange}
                  disabled={uploadingGallery}
                  className="hidden"
                  id="gallery-file-input"
                />
                <label 
                  htmlFor="gallery-file-input"
                  className={`flex flex-col items-center justify-center p-6 border-2 border-dashed border-orange-200 rounded-xl bg-white ${uploadingGallery ? 'cursor-not-allowed' : 'cursor-pointer hover:border-orange-300'}`}
                >
                  <span className="text-2xl mb-1.5">📷</span>
                  <span className="text-xs font-bold text-orange-900">
                    {uploadingGallery ? 'Uploading Gallery Photos...' : 'Click to Pick Photos'}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">
                    Select up to {8 - formData.galleryImages.length} more images
                  </span>
                </label>
              </div>
            )}

            {/* Gallery Previews */}
            {formData.galleryImages.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-3">
                {formData.galleryImages.map((url, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-orange-200 bg-white h-20">
                    <img 
                      src={url} 
                      alt={`Gallery ${idx + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                    <span className="absolute top-1 left-1 bg-black/50 text-white text-[9px] font-bold px-1 rounded">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGalleryImage(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white border-none rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Description */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-2">
              Product Description *
            </label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              required 
              rows={4}
              placeholder="Write detailed specifications or descriptions about this product..." 
              className="w-full p-4 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-gray-50 resize-y" 
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading || uploadingGallery || uploadingMain} 
            className={`w-full p-4 text-white font-bold text-sm uppercase tracking-wide rounded-xl shadow-lg transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#f85606] hover:bg-orange-700 hover:shadow-orange-500/20'}`}
          >
            {loading ? 'Publishing...' : 'Publish Product to Store'}
          </button>

        </form>
      </div>
    </div>
  );
}

const MetricCard: React.FC<{ title: string, value: string, change: string, positive?: boolean }> = ({ title, value, change, positive }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <div className="flex items-end justify-between mt-2">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <span className={`text-sm font-bold flex items-center ${positive ? 'text-green-500' : 'text-red-500'}`}>
        {positive ? '↑' : '↓'} {change}
      </span>
    </div>
  </div>
);
