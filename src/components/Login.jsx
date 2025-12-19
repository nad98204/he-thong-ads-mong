// src/components/Login.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Giả lập đăng nhập thành công
    localStorage.setItem('isLoggedIn', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-600 rounded-xl mx-auto flex items-center justify-center text-3xl font-bold mb-4 shadow-lg shadow-orange-500/20">M</div>
          <h1 className="text-2xl font-bold">Đăng Nhập Hệ Thống</h1>
          <p className="text-slate-400 text-sm mt-2">Hệ thống quản trị nội bộ Mong Group</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3 text-slate-500" size={20} />
              <input type="email" placeholder="admin@monggroup.com" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3 text-slate-500" size={20} />
              <input type="password" placeholder="••••••••" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 focus:outline-none focus:border-orange-500 transition-colors" />
            </div>
          </div>
          <button className="w-full bg-gradient-to-r from-orange-600 to-red-600 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/20 transition-all transform hover:-translate-y-1">
            ĐĂNG NHẬP NGAY
          </button>
        </form>
      </div>
    </div>
  );
}