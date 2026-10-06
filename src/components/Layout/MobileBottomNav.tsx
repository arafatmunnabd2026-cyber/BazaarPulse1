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
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 px-2 py-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around">
        <button
          onClick={() => onNavigate('/')}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors ${
            currentPath === '/' || currentPath === '' ? 'text-[#f85606]' : 'text-slate-500'
          }`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">হোম</span>
        </button>

        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center gap-1 p-2 min-w-[64px] text-slate-500"
        >
          <Grid className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">ক্যাটাগরি</span>
        </button>

        <button
          onClick={onOpenCart}
          className="flex flex-col items-center gap-1 p-2 min-w-[64px] text-slate-500 relative"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 bg-[#f85606] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white"
              >
                {cartCount}
              </motion.span>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">কার্ট</span>
        </button>

        <button
          onClick={onOpenProfile}
          className="flex flex-col items-center gap-1 p-2 min-w-[64px] text-slate-500"
        >
          <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
            {authUser?.avatar ? (
              <img src={authUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">প্রোফাইল</span>
        </button>
      </div>
    </div>
  );
};
