import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  X, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  Check, 
  SlidersHorizontal, 
  Sparkles,
  Tag,
  Store,
  Layers,
  Palette,
  PackageCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FilterState {
  minPrice: number;
  maxPrice: number;
  brands: string[];
  sizes: string[];
  colors: string[];
  minRating: number;
  inStockOnly: boolean;
  discountedOnly: boolean;
  sortBy: 'default' | 'price_low' | 'price_high' | 'rating' | 'newest';
}

export const DEFAULT_FILTER_STATE: FilterState = {
  minPrice: 0,
  maxPrice: 50000,
  brands: [],
  sizes: [],
  colors: [],
  minRating: 0,
  inStockOnly: false,
  discountedOnly: false,
  sortBy: 'default'
};

const POPULAR_COLORS: { name: string; hex: string; border?: boolean }[] = [
  { name: 'Black', hex: '#0f172a' },
  { name: 'White', hex: '#ffffff', border: true },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Navy', hex: '#1e3a8a' },
  { name: 'Green', hex: '#10b981' },
  { name: 'Grey', hex: '#64748b' },
  { name: 'Gold', hex: '#f59e0b' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' }
];

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size', '32GB', '64GB', '128GB', '256GB'];

interface AdvancedFilterSidebarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  allProducts: any[];
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  maxPriceCeiling?: number;
}

export const AdvancedFilterSidebar: React.FC<AdvancedFilterSidebarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  allProducts,
  isMobileOpen,
  onCloseMobile,
  maxPriceCeiling = 50000
}) => {
  // Collapsible section toggles
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    sort: true,
    price: true,
    brands: true,
    sizes: true,
    colors: true,
    rating: true,
    availability: true
  });

  const toggleSection = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Derive unique brands, sizes, colors and counts from real products
  const { availableBrands, availableSizes, availableColors, maxProductPrice } = useMemo(() => {
    const brandMap: { [key: string]: number } = {};
    const sizeSet = new Set<string>();
    const colorSet = new Set<string>();
    let highestPrice = 1000;

    allProducts.forEach(p => {
      // Brands / Vendors
      const brand = p.vendorName || 'BazaarPulse Store';
      brandMap[brand] = (brandMap[brand] || 0) + 1;

      // Price
      const price = Number(p.discountPrice || p.price || 0);
      if (price > highestPrice) highestPrice = price;

      // Sizes
      if (Array.isArray(p.sizes)) {
        p.sizes.forEach((s: string) => {
          if (s) sizeSet.add(s.trim());
        });
      }

      // Colors
      if (Array.isArray(p.colors)) {
        p.colors.forEach((c: string) => {
          if (c) colorSet.add(c.trim());
        });
      }
    });

    const brands = Object.keys(brandMap).map(name => ({
      name,
      count: brandMap[name]
    })).sort((a, b) => b.count - a.count);

    // Combine standard sizes with product sizes
    const sizes = Array.from(new Set([...Array.from(sizeSet), ...STANDARD_SIZES.slice(1, 6)]));

    // Combine standard colors with product colors
    const customColors = Array.from(colorSet);

    return {
      availableBrands: brands,
      availableSizes: sizes,
      availableColors: customColors.length > 0 ? customColors : POPULAR_COLORS.map(c => c.name),
      maxProductPrice: Math.max(highestPrice, maxPriceCeiling)
    };
  }, [allProducts, maxPriceCeiling]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.minPrice > 0 || filters.maxPrice < maxProductPrice) count++;
    if (filters.brands.length > 0) count += filters.brands.length;
    if (filters.sizes.length > 0) count += filters.sizes.length;
    if (filters.colors.length > 0) count += filters.colors.length;
    if (filters.minRating > 0) count++;
    if (filters.inStockOnly) count++;
    if (filters.discountedOnly) count++;
    if (filters.sortBy !== 'default') count++;
    return count;
  }, [filters, maxProductPrice]);

  const handleBrandToggle = (brandName: string) => {
    const exists = filters.brands.includes(brandName);
    const updated = exists 
      ? filters.brands.filter(b => b !== brandName)
      : [...filters.brands, brandName];
    onFilterChange({ ...filters, brands: updated });
  };

  const handleSizeToggle = (size: string) => {
    const exists = filters.sizes.includes(size);
    const updated = exists 
      ? filters.sizes.filter(s => s !== size)
      : [...filters.sizes, size];
    onFilterChange({ ...filters, sizes: updated });
  };

  const handleColorToggle = (color: string) => {
    const exists = filters.colors.includes(color);
    const updated = exists 
      ? filters.colors.filter(c => c !== color)
      : [...filters.colors, color];
    onFilterChange({ ...filters, colors: updated });
  };

  const sidebarContent = (
    <div className="space-y-6 text-slate-800 text-xs text-left select-none">
      
      {/* Header & Reset Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">ফিল্টার প্যানেল</h3>
            <span className="text-[11px] text-slate-500">
              {activeFilterCount > 0 ? `${activeFilterCount}টি ফিল্টার সক্রিয়` : 'সকল পণ্য প্রদর্শিত'}
            </span>
          </div>
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-orange-200"
          >
            <RotateCcw className="w-3 h-3" />
            <span>রিসেট (Clear)</span>
          </button>
        )}
      </div>

      {/* 1. Sort By Selector */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => toggleSection('sort')}
          className="w-full flex items-center justify-between font-bold text-slate-900 text-xs py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-700">
            <Tag className="w-3.5 h-3.5 text-orange-600" />
            সর্ট করুন (Sort By)
          </span>
          {openSections.sort ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {openSections.sort && (
          <div className="mt-2.5 space-y-1">
            {[
              { key: 'default', label: 'জনপ্রিয়তা ও ডিফল্ট (Featured)' },
              { key: 'price_low', label: 'মূল্য: কম থেকে বেশি (Price: Low to High)' },
              { key: 'price_high', label: 'মূল্য: বেশি থেকে কম (Price: High to Low)' },
              { key: 'rating', label: 'সর্বোচ্চ রেটিং (Highest Rated)' },
              { key: 'newest', label: 'নতুন আগমন (Newest First)' }
            ].map(item => (
              <label 
                key={item.key}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                  filters.sortBy === item.key 
                    ? 'bg-orange-50 text-orange-700 font-bold border border-orange-200' 
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="filter_sort"
                    checked={filters.sortBy === item.key}
                    onChange={() => onFilterChange({ ...filters, sortBy: item.key as any })}
                    className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <span>{item.label}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 2. Price Range Slider */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between font-bold text-slate-900 text-xs py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-700">
            <span>৳</span> প্রাইজ রেঞ্জ (Price Range)
          </span>
          {openSections.price ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {openSections.price && (
          <div className="mt-3 space-y-3">
            {/* Dual Slider / Single Range Slider */}
            <div>
              <input
                type="range"
                min={0}
                max={maxProductPrice}
                step={100}
                value={filters.maxPrice}
                onChange={(e) => onFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
                className="w-full accent-orange-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Min / Max Input Boxes */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">সর্বনিম্ন (Min)</span>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-slate-400 font-bold">৳</span>
                  <input
                    type="number"
                    min={0}
                    max={filters.maxPrice}
                    value={filters.minPrice}
                    onChange={(e) => onFilterChange({ ...filters, minPrice: Math.max(0, Number(e.target.value)) })}
                    className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <span className="text-slate-400 font-bold mt-4">-</span>

              <div className="flex-1">
                <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">সর্বোচ্চ (Max)</span>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-slate-400 font-bold">৳</span>
                  <input
                    type="number"
                    min={filters.minPrice}
                    max={maxProductPrice}
                    value={filters.maxPrice}
                    onChange={(e) => onFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
                    className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Price Pills */}
            <div className="flex flex-wrap gap-1 pt-1">
              {[
                { label: '৳৫০০ নিচে', min: 0, max: 500 },
                { label: '৳৫০০-২,০০০', min: 500, max: 2000 },
                { label: '৳২,০০০-৫,০০০', min: 2000, max: 5000 },
                { label: '৳৫,০০০+', min: 5000, max: maxProductPrice }
              ].map((range, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onFilterChange({ ...filters, minPrice: range.min, maxPrice: range.max })}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    filters.minPrice === range.min && filters.maxPrice === range.max
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Brands / Vendors Filter */}
      {availableBrands.length > 0 && (
        <div className="border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => toggleSection('brands')}
            className="w-full flex items-center justify-between font-bold text-slate-900 text-xs py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-700">
              <Store className="w-3.5 h-3.5 text-orange-600" />
              ব্র্যান্ড ও ভেন্ডর ({availableBrands.length})
            </span>
            {openSections.brands ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.brands && (
            <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {availableBrands.map(brand => {
                const checked = filters.brands.includes(brand.name);
                return (
                  <label
                    key={brand.name}
                    className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                      checked ? 'bg-orange-50/80 font-bold text-orange-800' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleBrandToggle(brand.name)}
                        className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      <span className="truncate text-xs">{brand.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full font-mono">
                      {brand.count}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Sizes Filter */}
      {availableSizes.length > 0 && (
        <div className="border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => toggleSection('sizes')}
            className="w-full flex items-center justify-between font-bold text-slate-900 text-xs py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-700">
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              সাইজ ও ভ্যারিয়েন্ট (Sizes)
            </span>
            {openSections.sizes ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.sizes && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {availableSizes.map(size => {
                const checked = filters.sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSizeToggle(size)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      checked
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Colors Filter */}
      {availableColors.length > 0 && (
        <div className="border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => toggleSection('colors')}
            className="w-full flex items-center justify-between font-bold text-slate-900 text-xs py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-700">
              <Palette className="w-3.5 h-3.5 text-orange-600" />
              কালার (Color Filter)
            </span>
            {openSections.colors ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {openSections.colors && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {availableColors.map(color => {
                const checked = filters.colors.includes(color);
                const colorPreset = POPULAR_COLORS.find(c => c.name.toLowerCase() === color.toLowerCase());
                const bgHex = colorPreset ? colorPreset.hex : '#cbd5e1';

                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorToggle(color)}
                    title={color}
                    className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                      checked
                        ? 'bg-orange-50 border-orange-400 text-orange-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 shadow-2xs flex items-center justify-center"
                      style={{ backgroundColor: bgHex }}
                    >
                      {checked && (
                        <Check className={`w-2.5 h-2.5 ${bgHex === '#ffffff' ? 'text-slate-900' : 'text-white'} stroke-[3]`} />
                      )}
                    </span>
                    <span>{color}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Customer Star Ratings */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => toggleSection('rating')}
          className="w-full flex items-center justify-between font-bold text-slate-900 text-xs py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-700">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            কাস্টমার রেটিং (Rating)
          </span>
          {openSections.rating ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        {openSections.rating && (
          <div className="mt-2 space-y-1">
            {[4, 3, 2, 1].map(star => {
              const selected = filters.minRating === star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => onFilterChange({ ...filters, minRating: selected ? 0 : star })}
                  className={`w-full flex items-center justify-between p-1.5 rounded-xl cursor-pointer transition-colors ${
                    selected 
                      ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200' 
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star 
                        key={idx} 
                        className={`w-3.5 h-3.5 ${idx < star ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                      />
                    ))}
                    <span className="ml-1 text-xs">{star}★ ও তার বেশি</span>
                  </div>
                  {selected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Availability & Deals */}
      <div className="space-y-2">
        <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={(e) => onFilterChange({ ...filters, inStockOnly: e.target.checked })}
              className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800">শুধুমাত্র ইন-স্টক (In Stock Only)</span>
          </div>
          <PackageCheck className="w-4 h-4 text-emerald-600" />
        </label>

        <label className="flex items-center justify-between p-2 rounded-xl bg-rose-50/70 border border-rose-200 hover:bg-rose-100 cursor-pointer transition-colors">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.discountedOnly}
              onChange={(e) => onFilterChange({ ...filters, discountedOnly: e.target.checked })}
              className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-rose-900">ডিসকাউন্ট ও ডিলস (On Sale)</span>
          </div>
          <Sparkles className="w-4 h-4 text-rose-600" />
        </label>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <div className="hidden lg:block w-64 xl:w-72 shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Drawer / Sheet */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            {/* Slide-over Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl z-10 flex flex-col justify-between"
            >
              {/* Mobile Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-orange-600" />
                  <span className="font-extrabold text-sm text-slate-900">ফিল্টার ও সর্টিং</span>
                </div>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                {sidebarContent}
              </div>

              {/* Mobile Footer Apply Button */}
              <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-2">
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  রিসেট
                </button>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  ফলাফল দেখুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
