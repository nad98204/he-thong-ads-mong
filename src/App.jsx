import React, { useState, useEffect } from 'react';
import { Megaphone, Users, Receipt, LogOut, UserCircle } from 'lucide-react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from './firebase';

// Import các màn hình
import AdsManager from './components/AdsManager';
import SalaryManager from './components/SalaryManager';
import SpendingManager from './components/SpendingManager';
import Login from './components/Login'; // Import màn hình đăng nhập

export default function App() {
  const [user, setUser] = useState(null); // Lưu thông tin người dùng
  const [loading, setLoading] = useState(true); // Trạng thái đang tải
  const [tab, setTab] = useState('ads');

  // --- LẮNG NGHE TRẠNG THÁI ĐĂNG NHẬP ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- HÀM ĐĂNG XUẤT ---
  const handleLogout = async () => {
    if(window.confirm("Bạn muốn đăng xuất?")) {
        await signOut(auth);
    }
  };

  // --- GIAO DIỆN ---
  
  // 1. Nếu đang kiểm tra (Load trang)
  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600 font-bold">⏳ Đang tải hệ thống...</div>;

  // 2. Nếu CHƯA đăng nhập -> Hiện màn hình Login
  if (!user) return <Login />;

  // 3. Nếu ĐÃ đăng nhập -> Hiện hệ thống chính
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
       <aside className="w-56 bg-slate-900 text-white flex flex-col z-20 shadow-xl">
          <div className="p-5 font-bold text-lg text-blue-400 border-b border-slate-700 tracking-wider">MONG ERP PRO</div>
          
          <nav className="flex-1 p-2 space-y-1">
             <button onClick={()=>setTab('ads')} className={`w-full flex gap-3 px-3 py-3 rounded text-sm font-bold transition-all ${tab==='ads'?'bg-blue-600 text-white shadow':'hover:bg-slate-800 text-slate-400'}`}><Megaphone size={18}/> QUẢN LÝ ADS</button>
             <button onClick={()=>setTab('salary')} className={`w-full flex gap-3 px-3 py-3 rounded text-sm font-bold transition-all ${tab==='salary'?'bg-blue-600 text-white shadow':'hover:bg-slate-800 text-slate-400'}`}><Users size={18}/> LƯƠNG SALE</button>
             <button onClick={()=>setTab('spending')} className={`w-full flex gap-3 px-3 py-3 rounded text-sm font-bold transition-all ${tab==='spending'?'bg-blue-600 text-white shadow':'hover:bg-slate-800 text-slate-400'}`}><Receipt size={18}/> SỔ CHI TIÊU</button>
          </nav>

          {/* KHU VỰC USER & ĐĂNG XUẤT */}
          <div className="p-4 bg-slate-800 border-t border-slate-700">
             <div className="flex items-center gap-2 mb-3 text-xs text-slate-300">
                <UserCircle size={16}/>
                <span className="truncate">{user.email}</span>
             </div>
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-xs font-bold transition-colors">
                <LogOut size={14}/> Đăng Xuất
             </button>
          </div>
       </aside>

       <main className="flex-1 overflow-auto bg-white relative">
          {tab === 'ads' && <AdsManager/>}
          {tab === 'salary' && <SalaryManager/>}
          {tab === 'spending' && <SpendingManager/>}
       </main>
    </div>
  );
}