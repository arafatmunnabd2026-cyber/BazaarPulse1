import React from 'react';
import { Home, Grid, ShoppingCart, User } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  cartCount: number;
  onOpenMenu: () => void;
  onOpenCart: () => void;
  onOpenProfile: () => void;
  authUser: any;
}

export const MobileBottomNav: React.FC<BottomNavProps> = ({
  currentPath,
  onNavigate,
  cartCount,
  onOpenMenu,
  onOpenCart,
  onOpenProfile,
  authUser
}) => {
  const isHome = currentPath === '/' || currentPath === '' || currentPath === '/#';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 px-3 py-1 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <button
          onClick={() => onNavigate('/')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
            isHome ? 'text-[#f85606] font-extrabold' : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <Home className={`w-5 h-5 transition-transform ${isHome ? 'scale-110' : ''}`} />
          <span className="text-[9px] mt-0.5 tracking-tight leading-none">হোম</span>
        </button>

        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium transition-all duration-200"
        >
          <Grid className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 tracking-tight leading-none">ক্যাটাগরি</span>
        </button>

        <button
          onClick={onOpenCart}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium relative transition-all duration-200"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-2 bg-[#f85606] text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs"
              >
                {cartCount}
              </motion.span>
            )}
          </div>
          <span className="text-[9px] mt-0.5 tracking-tight leading-none">কার্ট</span>
        </button>

        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 font-medium transition-all duration-200"
        >
          <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
            {authUser?.avatar ? (
              <img src={authUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-slate-500" />
            )}
          </div>
          <span className="text-[9px] mt-0.5 tracking-tight leading-none">প্রোফাইল</span>
        </button>
      </div>
    </div>
  );
};
