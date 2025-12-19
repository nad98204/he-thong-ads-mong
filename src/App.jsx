import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Bell,
  Search
} from 'lucide-react';

// --- IMPORT CÁC TRANG (PAGES & COMPONENTS) ---
import Dashboard from './pages/Dashboard';           // Trang Tổng Quan (CRM)
import AdsManager from './components/AdsManager';    // Trang Quản Lý Ads
import SalaryManager from './components/SalaryManager'; // Trang Lương
import SpendingManager from './components/SpendingManager'; // Trang Chi Tiêu

export default function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // CẤU HÌNH MENU (Thêm mục mới ở đây là tự động hiện)
  const menuItems = [
    { path: '/', name: 'Tổng Quan (CRM)', icon: LayoutDashboard },
    { path: '/ads', name: 'Quản Lý Ads', icon: Megaphone },
    { path: '/salary', name: 'Lương Nhân Sự', icon: Users },
    { path: '/spending', name: 'Sổ Chi Tiêu', icon: CreditCard },
    { path: '/settings', name: 'Cấu Hình Hệ Thống', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#f1f5f9] font-sans text-slate-900 overflow-hidden">
      
      {/* 1. SIDEBAR (THANH MENU TRÁI) */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-72' : 'w-20'
        } bg-[#1e293b] text-white transition-all duration-300 flex flex-col shadow-2xl relative shrink-0 z-50`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-center border-b border-slate-700/50 relative">
          {isSidebarOpen ? (
            <div className="text-center animate-in fade-in">
              <h1 className="font-black text-2xl tracking-wider text-orange-500">MONG GROUP</h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-[0.2em] opacity-70">Enterprise System</p>
            </div>
          ) : (
            <span className="font-black text-3xl text-orange-500">M</span>
          )}
          
          {/* Nút Toggle Sidebar */}
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)} 
            className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center shadow-lg border-2 border-[#1e293b] text-white hover:bg-orange-700 z-50 transition-transform hover:scale-110"
          >
            {isSidebarOpen ? <X size={12}/> : <Menu size={12}/>}
          </button>
        </div>
        
        {/* Menu List */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group relative overflow-hidden ${
                  isActive 
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-900/20 font-bold' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon size={22} className={`shrink-0 transition-colors ${isActive ? "text-white" : "group-hover:text-orange-400"}`} />
                
                {/* Text (Ẩn khi thu nhỏ) */}
                <span className={`whitespace-nowrap transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                  {item.name}
                </span>

                {/* Dấu chấm active (Khi thu nhỏ sidebar) */}
                {!isSidebarOpen && isActive && (
                  <div className="absolute right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Profile (Footer Sidebar) */}
        <div className="p-4 border-t border-slate-700/50 bg-[#16202e]">
          <div className={`flex items-center gap-3 ${isSidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner border border-white/10">
              AD
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0 animate-in fade-in">
                <p className="text-sm font-bold text-white truncate">Admin Mong</p>
                <p className="text-[10px] text-slate-400 truncate">admin@monggroup.com</p>
              </div>
            )}
            {isSidebarOpen && (
              <button className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-white/5" title="Đăng Xuất">
                <LogOut size={18}/>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT (NỘI DUNG CHÍNH) */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#f1f5f9]">
        
        {/* TOP BAR (Header nhỏ phía trên) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
           <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="opacity-50">Hệ thống quản trị</span>
              <span>/</span>
              <span className="text-orange-600 font-bold uppercase tracking-wide">{
                menuItems.find(i => i.path === location.pathname)?.name || 'Chi tiết'
              }</span>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center bg-slate-100 rounded-full px-3 py-1.5 border border-transparent focus-within:border-orange-300 focus-within:bg-white transition-all">
                 <Search size={16} className="text-slate-400"/>
                 <input className="bg-transparent border-none outline-none text-sm ml-2 w-48" placeholder="Tìm kiếm nhanh..."/>
              </div>
              <button className="p-2 text-slate-400 hover:bg-slate-50 hover:text-orange-600 rounded-full relative transition-colors">
                 <Bell size={20}/>
                 <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                 <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
           </div>
        </header>

        {/* KHU VỰC HIỂN THỊ TRANG CON */}
        <div className="flex-1 overflow-y-auto p-2 md:p-6 scroll-smooth">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ads" element={<AdsManager />} />
            <Route path="/salary" element={<SalaryManager />} />
            <Route path="/spending" element={<SpendingManager />} />
            <Route path="/settings" element={
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <Settings size={48} className="mx-auto mb-4 opacity-50"/>
                  <p>Tính năng Cấu Hình đang được phát triển...</p>
                </div>
              </div>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>

    </div>
  );
}