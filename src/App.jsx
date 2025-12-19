import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, Megaphone, Users, CreditCard, Settings, 
  LogOut, Menu, X, Bell, Search
} from 'lucide-react';

// --- IMPORT CONTEXT & AUTH ---
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Import Provider
import Login from './pages/Login'; // Import trang Login

// --- IMPORT CÁC TRANG ---
import Dashboard from './pages/Dashboard';
import AdsManager from './components/AdsManager';
import SalaryManager from './components/SalaryManager';
import SpendingManager from './components/SpendingManager';
import SettingsManager from './components/SettingsManager';

// --- COMPONENT BẢO VỆ (WRAPPER) ---
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return children;
};

// --- COMPONENT NỘI DUNG CHÍNH ---
const MainLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { logout, currentUser, userRole } = useAuth(); // Lấy thông tin user & role

  const menuItems = [
    { path: '/', name: 'Tổng Quan (CRM)', icon: LayoutDashboard },
    { path: '/ads', name: 'Quản Lý Ads', icon: Megaphone },
    { path: '/salary', name: 'Lương Nhân Sự', icon: Users },
    { path: '/spending', name: 'Sổ Chi Tiêu', icon: CreditCard },
    // CHỈ ADMIN MỚI THẤY MENU SETTINGS
    ...(userRole === 'ADMIN' ? [{ path: '/settings', name: 'Cấu Hình Hệ Thống', icon: Settings }] : []),
  ];

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-[#1e293b] text-white flex flex-col shadow-2xl transition-all duration-300 z-50 h-full shrink-0`}>
        <div className="h-16 flex items-center justify-center border-b border-slate-700/50 relative shrink-0">
          {isSidebarOpen ? <div className="text-center animate-in fade-in"><h1 className="font-black text-2xl tracking-wider text-orange-500">MONG GROUP</h1></div> : <span className="font-black text-3xl text-orange-500">M</span>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center border-2 border-[#1e293b] text-white hover:bg-orange-700 transition-transform hover:scale-110 z-50">{isSidebarOpen ? <X size={12}/> : <Menu size={12}/>}</button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all whitespace-nowrap group ${isActive ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <item.icon size={22} className={`shrink-0 transition-colors ${isActive ? "text-white" : "group-hover:text-orange-400"}`} />
                <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-700/50 bg-[#16202e] shrink-0">
          <div className={`flex items-center gap-3 ${isSidebarOpen ? '' : 'justify-center'}`}>
            {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Ava" className="w-10 h-10 rounded-full border border-white/20"/>
            ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">U</div>
            )}
            
            {isSidebarOpen && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-bold truncate">{currentUser?.displayName || "User"}</p>
                <div className="flex items-center gap-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${userRole === 'ADMIN' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'} truncate`}>{userRole}</span>
                </div>
              </div>
            )}
            {isSidebarOpen && <button onClick={logout} className="text-slate-400 hover:text-red-500 p-2" title="Đăng xuất"><LogOut size={18}/></button>}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 w-full z-40">
           <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="text-orange-600 font-bold uppercase tracking-wider">{menuItems.find(i => i.path === location.pathname)?.name}</span>
           </div>
           <div className="flex items-center gap-4">
              <button className="p-2 text-slate-400 hover:text-orange-600 relative transition-colors"><Bell size={20}/></button>
           </div>
        </header>

        <div className="flex-1 overflow-auto p-0 w-full relative bg-[#f1f5f9]"> 
           <div className="min-h-full w-full">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/ads" element={<AdsManager />} />
                <Route path="/salary" element={<SalaryManager />} />
                <Route path="/spending" element={<SpendingManager />} />
                
                {/* Chỉ ADMIN mới vào được Settings */}
                <Route path="/settings" element={userRole === 'ADMIN' ? <SettingsManager /> : <Navigate to="/" />} />
                
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- APP COMPONENT CHÍNH ---
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Tất cả route khác đều được bảo vệ */}
        <Route path="/*" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}