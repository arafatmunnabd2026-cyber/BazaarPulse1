import React, { useState } from 'react';
import { Menu, Search, Bell, ChevronDown, LayoutDashboard, ShoppingBag, Users, Package, Settings, ChevronRight } from 'lucide-react';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex">
      {/* Sidebar */}
      <aside className={`bg-[#212529] text-slate-300 w-64 transition-all duration-300 flex flex-col ${isSidebarOpen ? '' : '-ml-64'}`}>
        <div className="p-5 bg-yellow-500 flex items-center justify-between">
          <h1 className="font-bold text-lg text-black">BazaarPulse <span className="text-black/70">Admin</span></h1>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-black hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-8 flex-1">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 px-2">APPLICATION</p>
            <ul className="space-y-1">
              <NavItem icon={<LayoutDashboard />} label="Dashboard" active />
              <NavItem icon={<ShoppingBag />} label="Catalog" />
              <NavItem icon={<Package />} label="Orders" />
              <NavItem icon={<Users />} label="Customers" />
            </ul>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 px-2">PAGES</p>
            <ul className="space-y-1">
              <NavItem icon={<Settings />} label="Settings" />
            </ul>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative p-2 rounded-full hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </div>
            <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
              <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center font-bold text-black text-xs">AM</div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-700">Arafat Munna</p>
                <p className="text-xs text-gray-400">Admin</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean }> = ({ icon, label, active }) => (
  <li className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${active ? 'bg-yellow-500 text-black' : 'hover:bg-[#343a40] text-slate-300 hover:text-white'}`}>
    {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
    {label}
    <ChevronRight className={`w-3 h-3 ml-auto ${active ? 'text-black' : 'text-slate-500'}`} />
  </li>
);
