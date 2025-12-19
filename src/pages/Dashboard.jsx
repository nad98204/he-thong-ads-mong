import React from 'react';
import { 
  TrendingUp, DollarSign, Users, Activity, BarChart2, 
  ArrowUpRight, ArrowDownRight, Calendar, Target, ShoppingBag 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// --- DỮ LIỆU THỰC TẾ (Từ file Excel K36 & Tài Chính) ---
// Dữ liệu xu hướng tuần
const trendData = [
  { name: 'Tuần 1', ads: 5500000, rev: 18000000, profit: 9500000 },
  { name: 'Tuần 2', ads: 7200000, rev: 25000000, profit: 13800000 },
  { name: 'Tuần 3', ads: 4800000, rev: 22000000, profit: 12200000 },
  { name: 'Tuần 4', ads: 7500000, rev: 35000000, profit: 19500000 },
];

// Dữ liệu Phễu CRM (Funnel)
const funnelData = [
  { name: 'Tiếp cận (Reach)', value: 45000 },
  { name: 'Quan tâm (Mess)', value: 1450 },
  { name: 'Chốt đơn (Sale)', value: 120 },
];

// Dữ liệu Chiến dịch hiệu quả
const campaignData = [
  { id: 1, name: "🧲 Luật Hấp Dẫn (Video)", spend: 1505766, mess: 37, orders: 3, rev: 10500000, roas: 6.97, status: "Active" },
  { id: 2, name: "🎯 Khơi Thông Dòng Tiền", spend: 5200000, mess: 120, orders: 15, rev: 45000000, roas: 8.65, status: "Active" },
  { id: 3, name: "🚀 Vút Tốc Mục Tiêu", spend: 3100000, mess: 85, orders: 8, rev: 24000000, roas: 7.74, status: "Scaling" },
  { id: 4, name: "♻️ Re-marketing K35", spend: 1200000, mess: 40, orders: 5, rev: 15000000, roas: 12.5, status: "Active" },
];

export default function Dashboard() {
  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen font-sans text-slate-800 animate-in fade-in duration-700">
      
      {/* 1. HEADER CRM */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
         <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">HỆ THỐNG QUẢN TRỊ TỔNG (CRM)</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
               <Calendar size={16}/> Báo cáo tài chính tháng 12/2025 • <span className="text-green-600 font-bold bg-green-50 px-2 rounded">Đang hoạt động</span>
            </p>
         </div>
         <div className="flex gap-3">
            <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
               <Calendar size={18}/> Chọn Ngày
            </button>
            <button className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all flex items-center gap-2">
               <ArrowDownRight size={18}/> Xuất Báo Cáo
            </button>
         </div>
      </div>

      {/* 2. CÁC CHỈ SỐ CHÍNH (KEY METRICS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
         {/* Doanh Thu */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <DollarSign size={16} className="text-green-500"/> Tổng Doanh Thu
               </p>
               <h3 className="text-3xl font-black text-slate-800 mb-2">100.0M</h3>
               <div className="flex items-center gap-2 text-sm font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-lg">
                  <ArrowUpRight size={16}/> +24.5% <span className="text-slate-400 font-normal">vs tháng trước</span>
               </div>
            </div>
         </div>

         {/* Chi Phí Ads */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Target size={16} className="text-blue-500"/> Chi Phí Ads
               </p>
               <h3 className="text-3xl font-black text-slate-800 mb-2">25.0M</h3>
               <div className="flex items-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded-lg">
                  <Activity size={16}/> 25% <span className="text-slate-400 font-normal">tỷ lệ chi tiêu</span>
               </div>
            </div>
         </div>

         {/* Lợi Nhuận Ròng */}
         <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl shadow-lg shadow-orange-200 text-white relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 text-white/10"><DollarSign size={120}/></div>
            <div className="relative z-10">
               <p className="text-sm font-bold text-orange-100 uppercase tracking-wider mb-2">Lợi Nhuận Ròng</p>
               <h3 className="text-3xl font-black mb-2">55.0M</h3>
               <p className="text-sm text-orange-100 opacity-90">Đã trừ Lương & Tool (20M)</p>
            </div>
         </div>

         {/* ROAS */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <BarChart2 size={16} className="text-purple-500"/> Hiệu Quả (ROAS)
               </p>
               <h3 className="text-3xl font-black text-slate-800 mb-2">4.0x</h3>
               <div className="flex items-center gap-2 text-sm font-bold text-purple-600 bg-purple-50 w-fit px-2 py-1 rounded-lg">
                  <TrendingUp size={16}/> Tuyệt vời <span className="text-slate-400 font-normal">(Mục tiêu >3.0)</span>
               </div>
            </div>
         </div>
      </div>

      {/* 3. BIỂU ĐỒ PHÂN TÍCH CHUYÊN SÂU */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         
         {/* Biểu đồ dòng tiền (Area Chart) */}
         <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg text-slate-800">Xu Hướng Dòng Tiền (Thực Tế)</h3>
               <div className="flex gap-2">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-500"><span className="w-2 h-2 rounded-full bg-green-500"></span> Doanh thu</div>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-500"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Lợi nhuận</div>
               </div>
            </div>
            <div className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                     <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}}/>
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}}/>
                     <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}/>
                     <Area type="monotone" dataKey="rev" stroke="#22c55e" strokeWidth={3} fill="url(#colorRev)" name="Doanh Thu" />
                     <Area type="monotone" dataKey="profit" stroke="#f97316" strokeWidth={3} fill="url(#colorProfit)" name="Lợi Nhuận" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Biểu đồ Phễu (Funnel) */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg mb-6 text-slate-800">Phễu Chuyển Đổi (Funnel)</h3>
            <div className="h-80 flex flex-col justify-center space-y-6">
                {funnelData.map((item, index) => (
                   <div key={index}>
                      <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                         <span>{item.name}</span>
                         <span>{item.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                         <div 
                           className={`h-full rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-purple-500' : 'bg-green-500'}`} 
                           style={{ width: `${(item.value / funnelData[0].value) * 100}%` }}
                         ></div>
                      </div>
                      <div className="text-right text-xs text-slate-400 mt-1 font-medium">
                         {index === 0 ? '100%' : `${((item.value / funnelData[index-1].value) * 100).toFixed(1)}% chuyển đổi`}
                      </div>
                   </div>
                ))}
            </div>
         </div>
      </div>

      {/* 4. BẢNG CHIẾN DỊCH HIỆU QUẢ NHẤT */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-800">Top Chiến Dịch Hiệu Quả (K36)</h3>
            <button className="text-orange-600 text-sm font-bold hover:underline">Xem tất cả</button>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                     <th className="p-4">Tên Chiến Dịch</th>
                     <th className="p-4">Trạng Thái</th>
                     <th className="p-4 text-right">Chi Tiêu</th>
                     <th className="p-4 text-center">Mess</th>
                     <th className="p-4 text-center">Đơn</th>
                     <th className="p-4 text-right">Doanh Thu</th>
                     <th className="p-4 text-center">ROAS</th>
                  </tr>
               </thead>
               <tbody className="text-sm divide-y divide-slate-100">
                  {campaignData.map((camp) => (
                     <tr key={camp.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4 font-bold text-slate-800">{camp.name}</td>
                        <td className="p-4">
                           <span className={`px-3 py-1 rounded-full text-xs font-bold ${camp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {camp.status === 'Active' ? 'Đang chạy' : 'Đang Scale'}
                           </span>
                        </td>
                        <td className="p-4 text-right font-medium text-slate-600">{camp.spend.toLocaleString()} đ</td>
                        <td className="p-4 text-center font-bold text-blue-600">{camp.mess}</td>
                        <td className="p-4 text-center font-bold text-purple-600">{camp.orders}</td>
                        <td className="p-4 text-right font-bold text-slate-800">{camp.rev.toLocaleString()} đ</td>
                        <td className="p-4 text-center">
                           <span className={`font-extrabold ${camp.roas >= 8 ? 'text-green-600' : 'text-orange-500'}`}>
                              {camp.roas}x
                           </span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
}