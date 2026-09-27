import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Connection (আপনার দেওয়া রিয়েল ক্রিপডেনশিয়াল দিয়ে কানেক্ট করা হলো)
const supabaseUrl = 'https://mhpmwsafqrjgsodnztll.supabase.co';
const supabaseKey = 'sb_publishable_q5zax92UyLCrAIs7ZJDODQ_T93URdMc';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminDashboard() {
  const [formData, setFormData] = useState({
    title: '',
    currentPrice: '',
    originalPrice: '',
    stockQuantity: '',
    category: 'Electronics',
    imageUrl: '',
    sizes: [] as string[],
    colors: [] as string[]
  });

  const [loading, setLoading] = useState(false);

  // ইনপুট পরিবর্তনের হ্যান্ডলার
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ডাটাবেজে প্রোডাক্ট পাঠানোর ফাংশন
  const handlePublishProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          title: formData.title,
          current_price: Number(formData.currentPrice),
          original_price: Number(formData.originalPrice),
          stock_quantity: Number(formData.stockQuantity),
          category: formData.category,
          image_url: formData.imageUrl,
          sizes: formData.sizes,
          colors: formData.colors
        },
      ]);

    setLoading(false);

    if (error) {
      console.error('Product upload error:', error.message);
      alert('প্রোডাক্ট আপলোড করতে সমস্যা হয়েছে: ' + error.message);
    } else {
      alert('Product successfully Supabase-এ আপলোড হয়ে গেছে!');
      // সফলভাবে আপলোড হওয়ার পর ফর্ম খালি করে দেওয়া
      setFormData({
        title: '',
        currentPrice: '',
        originalPrice: '',
        stockQuantity: '',
        category: 'Electronics',
        imageUrl: '',
        sizes: [],
        colors: []
      });
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2>Admin Dashboard - Add New Product</h2>
      <form onSubmit={handlePublishProduct} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div>
          <label style={{ fontWeight: 'bold' }}>Product Title:</label>
          <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Smart LED TV 43 inch" style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Current Price (৳):</label>
          <input type="number" name="currentPrice" value={formData.currentPrice} onChange={handleChange} required placeholder="e.g. 24000" style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Original Price / Strikethrough (৳):</label>
          <input type="number" name="originalPrice" value={formData.originalPrice} onChange={handleChange} placeholder="e.g. 28000" style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Stock Quantity:</label>
          <input type="number" name="stockQuantity" value={formData.stockQuantity} onChange={handleChange} required placeholder="e.g. 25" style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Category:</label>
          <select name="category" value={formData.category} onChange={handleChange} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
            <option value="Electronics">Electronics</option>
            <option value="Fashion & Apparel">Fashion & Apparel</option>
            <option value="Home & Living">Home & Living</option>
            <option value="Beauty & Health">Beauty & Health</option>
            <option value="Groceries">Groceries</option>
            <option value="Sports & Outdoors">Sports & Outdoors</option>
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 'bold' }}>Product Image URL:</label>
          <input type="text" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://images.unsplash.com/..." style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '12px', background: '#ff5722', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}>
          {loading ? 'Uploading to Supabase...' : 'Publish Product to Store'}
        </button>

      </form>
    </div>
  );
}