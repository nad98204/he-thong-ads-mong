import React, { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../firebase';
import { Lock, LogIn, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      setError("Sai email hoặc mật khẩu!");
      setLoading(false);
    }
  };

  return (
    // Dùng 'fixed inset-0' để phủ kín màn hình và 'flex items-center justify-center' để căn giữa
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
      
      {/* Hiệu ứng nền mờ trang trí */}
      <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>

      {/* Hộp đăng nhập chính */}
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-[400px] border border-gray-200 relative z-10 mx-4 animate-in zoom-in-95 duration-300">
        
        <div className="text-center mb-8">
          <div className="bg-blue-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-blue-500/30">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">CỔNG BẢO MẬT</h1>
          <p className="text-gray-500 text-sm mt-2">Hệ thống quản lý nội bộ</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Truy Cập</label>
            <input 
              type="email" 
              required
              className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all text-gray-800 font-medium"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Mật Khẩu</label>
            <input 
              type="password" 
              required
              className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all text-gray-800 font-medium"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center font-bold bg-red-50 p-3 rounded-lg border border-red-100 flex items-center justify-center gap-2 animate-pulse">
              <Lock size={14}/> {error}
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 text-base"
          >
            {loading ? "Đang xác thực..." : <><LogIn size={20} /> ĐĂNG NHẬP NGAY</>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-medium">
              &copy; 2025 Powered by Mong Coaching
            </p>
        </div>
      </div>
    </div>
  );
}