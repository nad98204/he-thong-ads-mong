import React from 'react';
import { Users, Award, Briefcase } from 'lucide-react';

export default function SalaryManager() {
  const salaries = [
    { name: "Yến Nghi", role: "Sale Chính", sales: "70.000.000", orders: 20, comm: "2.100.000 (3%)", base: "5.000.000", total: "7.100.000", note: "Top Seller 🔥" },
    { name: "Nghĩa", role: "Support", sales: "7.000.000", orders: 2, comm: "210.000 (3%)", base: "5.000.000", total: "5.210.000", note: "Cần cố gắng" },
    { name: "Team Media", role: "Marketing", sales: "-", orders: "-", comm: "-", base: "8.000.000", total: "8.000.000", note: "Lương cứng" },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
         <h2 className="text-2xl font-bold text-slate-800 border-l-4 border-purple-600 pl-3">BẢNG LƯƠNG NHÂN SỰ (K36)</h2>
         <div className="flex gap-2">
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">Tổng chi lương: 20.310.000 đ</span>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="p-4">Nhân Sự</th>
              <th className="p-4">Doanh Số Mang Về</th>
              <th className="p-4">Đơn Chốt</th>
              <th className="p-4">Hoa Hồng</th>
              <th className="p-4">Lương Cứng</th>
              <th className="p-4 text-purple-700">TỔNG THỰC LĨNH</th>
              <th className="p-4">Ghi Chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {salaries.map((s, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                   <div className="font-bold text-slate-800 text-base">{s.name}</div>
                   <div className="text-xs text-slate-400">{s.role}</div>
                </td>
                <td className="p-4 font-medium">{s.sales}</td>
                <td className="p-4 font-medium">{s.orders}</td>
                <td className="p-4 text-green-600 font-bold">{s.comm}</td>
                <td className="p-4">{s.base}</td>
                <td className="p-4">
                   <span className="text-lg font-extrabold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg">{s.total}</span>
                </td>
                <td className="p-4">
                   {s.note.includes("Top") ? <span className="flex items-center gap-1 text-xs font-bold text-orange-500"><Award size={14}/> {s.note}</span> : <span className="text-xs text-slate-400">{s.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}