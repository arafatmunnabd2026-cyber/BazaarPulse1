import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ShopContextType {
  // Auth
  authUser: any;
  setAuthUser: (user: any) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  
  // Data
  data: any;
  refreshData: () => void;
  notify: (msg: string) => void;

  // Cart
  cart: any[];
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: any, quantity?: number, size?: string, color?: string) => void;
  removeFromCart: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, delta: number, size?: string, color?: string) => void;

  // Wishlist
  wishlist: any[];
  toggleWishlist: (product: any) => void;
  isInWishlist: (productId: string) => boolean;

  // Navigation & Search
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleCategoryChange: (catId: string) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;

  // UI
  isAiOpen: boolean;
  setIsAiOpen: (open: boolean) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ 
  children: React.ReactNode; 
  initialData?: any; 
  authUser?: any; 
  setAuthUser?: (u: any) => void; 
  onOpenLogin?: () => void; 
  onLogout?: () => void; 
  refreshData?: () => void; 
  notify?: (m: string) => void 
}> = ({ 
  children, 
  initialData, 
  authUser: propAuthUser, 
  setAuthUser: propSetAuthUser, 
  onOpenLogin: propOnOpenLogin, 
  onLogout: propOnLogout, 
  refreshData = () => {}, 
  notify = () => {} 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  const authUser = propAuthUser !== undefined ? propAuthUser : auth.authUser;
  const setAuthUser = propSetAuthUser || auth.setAuthUser;
  const onOpenLogin = propOnOpenLogin || auth.openLoginModal;
  const onLogout = propOnLogout || auth.logout;

  // Search & Category
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Cart State
  const [cart, setCart] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('bazaarpulse_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('bazaarpulse_cart', JSON.stringify(cart));
  }, [cart]);

  // Wishlist State
  const [wishlist, setWishlist] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('bazaarpulse_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('bazaarpulse_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const toggleWishlist = (product: any) => {
    if (!product || !product.id) return;
    const exists = wishlist.some(p => p.id === product.id);
    if (exists) {
      setWishlist(prev => prev.filter(p => p.id !== product.id));
      notify(`💔 পছন্দের তালিকা থেকে সরানো হয়েছে`);
    } else {
      setWishlist(prev => [...prev, product]);
      notify(`💖 পছন্দের তালিকায় যুক্ত হয়েছে!`);
    }
  };

  const isInWishlist = (productId: string) => wishlist.some(p => p.id === productId);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    let newPath = '/';
    if (catId && catId !== 'all') {
      const categories = initialData?.categories || [];
      const catObj = categories.find((c: any) => c.id === catId);
      const slug = catObj?.slug || catId;
      newPath = `/${slug}`;
    }
    navigate(newPath);
  };

  const addToCart = (product: any, quantity: number = 1, size?: string, color?: string) => {
    setCart(prev => {
      const existing = prev.find(item => 
        item.product.id === product.id && 
        item.size === size && 
        item.color === color
      );
      if (existing) {
        return prev.map(item => 
          (item.product.id === product.id && item.size === size && item.color === color)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, size, color, isSelected: true }];
    });
    notify('🛍️ কার্টে পণ্য যোগ করা হয়েছে!');
  };

  const removeFromCart = (productId: string, size?: string, color?: string) => {
    setCart(prev => prev.filter(item => 
      !(item.product.id === productId && item.size === size && item.color === color)
    ));
  };

  const updateQuantity = (productId: string, delta: number, size?: string, color?: string) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId && item.size === size && item.color === color) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const value = {
    authUser,
    setAuthUser,
    onOpenLogin,
    onLogout,
    data: initialData,
    refreshData,
    notify,
    cart,
    setCart,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    wishlist,
    toggleWishlist,
    isInWishlist,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    handleCategoryChange,
    isMenuOpen,
    setIsMenuOpen,
    isAiOpen,
    setIsAiOpen
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
