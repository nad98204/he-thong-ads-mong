import React from 'react';
import { Receipt, Calendar, User } from 'lucide-react';

export default function SpendingManager() {
  const expenses = [
    { date: "16/12/2025", type: "Tool", content: "Mua gói Zoom Pro", amount: "350.000", user: "Đăng", note: "Thanh toán VISA" },
    { date: "17/12/2025", type: "Ads", content: "Nạp tiền Facebook Ads", amount: "5.000.000", user: "Nghĩa", note: "Chiến dịch Tết" },
    { date: "18/12/2025", type: "Tool", content: "Gia hạn Canva Pro", amount: "150.000", user: "Media", note: "Thiết kế ảnh K37" },
    { date: "19/12/2025", type: "Khác", content: "Tiền điện văn phòng", amount: "2.100.000", user: "Admin", note: "Tháng 11" },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
         <h2 className="text-2xl font-bold text-slate-800 border-l-4 border-red-500 pl-3">SỔ CHI TIÊU</h2>
         <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 text-sm shadow-lg shadow-red-200">
            + Thêm Khoản Chi
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Danh sách chi tiêu */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 font-bold text-slate-600 text-sm border-b border-slate-200 flex justify-between">
               <span>Lịch Sử Gần Đây</span>
               <span>Tháng 12/2025</span>
            </div>
            <div className="divide-y divide-slate-100">
               {expenses.map((e, i) => (
                  <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                     <div>
                        <div className="font-bold text-slate-800">{e.content}</div>
                        <div className="text-xs text-slate-400 flex gap-3 mt-1">
                           <span className="flex items-center gap-1"><Calendar size={12}/> {e.date}</span>
                           <span className="flex items-center gap-1"><User size={12}/> {e.user}</span>
                           <span className="bg-slate-100 px-1.5 rounded text-[10px]">{e.type}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="font-bold text-red-600">-{e.amount} đ</div>
                        <div className="text-[10px] text-slate-400 italic">{e.note}</div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Tổng kết (Lấy từ file Tài Chính) */}
         <div className="space-y-6">
            <div className="bg-gradient-to-br from-red-500 to-pink-600 p-8 rounded-2xl text-white shadow-xl shadow-red-200">
               <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider">Tổng Tiền Tool & Phần Mềm</h3>
               <div className="text-4xl font-extrabold mt-2 mb-4">10.000.000 đ</div>
               <p className="text-sm bg-white/20 inline-block px-3 py-1 rounded-full">Gồm: Chat GPT, Canva, Zoom...</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <h3 className="font-bold text-slate-800 mb-4">Phân Bổ Chi Phí (Ngoài Lương)</h3>
               <div className="space-y-3">
                  <div>
                     <div className="flex justify-between text-sm mb-1"><span>Ads (Marketing)</span><span className="font-bold">71%</span></div>
                     <div className="h-2 bg-slate-100 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{width: '71%'}}></div></div>
                  </div>
                  <div>
                     <div className="flex justify-between text-sm mb-1"><span>Tool & Phần mềm</span><span className="font-bold">29%</span></div>
                     <div className="h-2 bg-slate-100 rounded-full"><div className="h-2 bg-red-500 rounded-full" style={{width: '29%'}}></div></div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}