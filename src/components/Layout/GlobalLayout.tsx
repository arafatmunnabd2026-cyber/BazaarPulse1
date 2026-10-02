import React from 'react';
import { Navbar } from './Navbar';
import { useShop } from '../../context/ShopContext';

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
