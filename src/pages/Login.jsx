import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { LogIn, ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Nếu đã đăng nhập thì chuyển hướng
  if (currentUser) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      // Dịch lỗi Firebase sang tiếng Việt cho dễ hiểu
      let msg = err.message;
      if (msg.includes("auth/invalid-email")) msg = "Email không hợp lệ.";
      else if (msg.includes("auth/user-not-found")) msg = "Tài khoản không tồn tại.";
      else if (msg.includes("auth/wrong-password")) msg = "Sai mật khẩu.";
      else if (msg.includes("auth/invalid-credential")) msg = "Thông tin đăng nhập không đúng.";
      else if (msg.includes("network-request-failed")) msg = "Lỗi kết nối mạng.";
      else msg = "Đăng nhập thất bại: " + msg;
      
      setError(msg);
    }
    setLoading(false);
  };

  return (
    // CONTAINER CHÍNH: Dùng flex, h-screen, items-center, justify-center để căn giữa tuyệt đối
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans">
      
      {/* FORM CARD */}
      <div className="bg-white w-full max-w-md p-8 md:p-10 rounded-3xl shadow-2xl mx-4 transform transition-all hover:scale-[1.005]">
        
        {/* LOGO */}
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-orange-50 rounded-full text-orange-600 shadow-inner ring-4 ring-orange-50/50">
            <ShieldCheck size={48} strokeWidth={1.5} />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">MONG GROUP</h1>
          <p className="text-slate-500 font-medium text-sm">Hệ thống quản lý nội bộ (Enterprise)</p>
        </div>

        {/* THÔNG BÁO LỖI */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0"/> {error}
          </div>
        )}

        {/* FORM NHẬP LIỆU */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase ml-1">Email nhân viên</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
              <input 
                type="email" 
                required
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-medium text-slate-700 placeholder-slate-400" 
                placeholder="nhanvien@monggroup.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase ml-1">Mật khẩu cấp</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
              <input 
                type="password" 
                required
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-medium text-slate-700 placeholder-slate-400" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.98] transition-all duration-200 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <LogIn size={20} />
                ĐĂNG NHẬP HỆ THỐNG
              </>
            )}
          </button>

        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 italic">
            Quên mật khẩu? Vui lòng liên hệ <span className="font-bold text-slate-500">Admin</span> để được cấp lại.
          </p>
        </div>
      </div>
    </div>
  );
}