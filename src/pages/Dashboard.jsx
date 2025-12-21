import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  Activity, Calendar, Filter, PieChart as PieIcon, 
  ArrowUpRight, Target, CreditCard, RefreshCw, BarChart2,
  Settings, X, Wallet, Lock
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

// --- IMPORT FIREBASE & AUTH ---
import { db } from '../firebase';
import { ref, onValue } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  // --- 0. PHÂN QUYỀN ---
  const { userPermissions, userRole } = useAuth();
  // Quyền xem Dashboard (Dành cho Admin hoặc User được tick quyền dashboard.view)
  const canViewDashboard = userRole === 'ADMIN' || userPermissions?.dashboard?.view;

  // --- 1. CONFIG & STATE ---
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [isAutoUpdate, setIsAutoUpdate] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const [widgets, setWidgets] = useState({
    ads: true, salary: true, spending: true, chartFlow: true, chartPie: true, netProfit: true
  });

  const [rawData, setRawData] = useState({ ads: [], salary: [], spending: [] });

  // --- 2. DATA SYNC (FIREBASE REALTIME) ---
  useEffect(() => {
    if (!isAutoUpdate || !canViewDashboard) return;

    // A. Đọc dữ liệu Ads
    const adsRef = ref(db, 'ads_manager');
    const unsubAds = onValue(adsRef, (snapshot) => {
      const val = snapshot.val();
      if (val && val.data && Array.isArray(val.data)) {
        const formattedAds = val.data.map(item => {
          const totalOrders = (Number(item.mong) || 0) + (Number(item.thanh) || 0);
          const revenue = totalOrders * (Number(item.price) || 0);
          const profit = revenue - (Number(item.spend) || 0) - (Number(item.cost) || 0);
          return { ...item, rev: revenue, orders: totalOrders, profit: profit };
        });
        setRawData(prev => ({ ...prev, ads: formattedAds }));
      }
    });

    // B. Đọc dữ liệu Salary
    const salaryRef = ref(db, 'salary_manager');
    const unsubSalary = onValue(salaryRef, (snapshot) => {
       const val = snapshot.val();
       if (val && val.data && Array.isArray(val.data)) setRawData(prev => ({ ...prev, salary: val.data }));
    });

    // C. Đọc dữ liệu Spending
    const spendingRef = ref(db, 'spending_manager');
    const unsubSpending = onValue(spendingRef, (snapshot) => {
       const val = snapshot.val();
       if (val && val.data && Array.isArray(val.data)) setRawData(prev => ({ ...prev, spending: val.data }));
    });

    return () => { unsubAds(); unsubSalary(); unsubSpending(); };
  }, [isAutoUpdate, canViewDashboard]);

  // --- 3. LOGIC TÍNH TOÁN ---
  const stats = useMemo(() => {
    const { ads, salary, spending } = rawData;

    const filteredAds = ads.filter(item => {
      if (!item?.date) return false;
      const d = new Date(item.date);
      const matchYear = d.getFullYear() === parseInt(selectedYear);
      const matchMonth = selectedMonth === "ALL" ? true : (d.getMonth() + 1) === parseInt(selectedMonth);
      const matchCourse = selectedCourse === "ALL" ? true : item.course === selectedCourse;
      return matchYear && matchMonth && matchCourse;
    });

    const filteredSalary = salary.filter(item => {
      if (!item?.month) return false;
      const matchYear = item.month.includes(`/${selectedYear}`);
      let matchMonth = true;
      if (selectedMonth !== "ALL") {
         const mStr = `Tháng ${selectedMonth}/`;
         const mStrPad = `Tháng ${String(selectedMonth).padStart(2, '0')}/`;
         matchMonth = item.month.includes(mStr) || item.month.includes(mStrPad);
      }
      return matchYear && matchMonth;
    });

    const filteredSpending = spending.filter(item => {
      if (!item?.date) return false;
      const d = new Date(item.date);
      const matchYear = d.getFullYear() === parseInt(selectedYear);
      const matchMonth = selectedMonth === "ALL" ? true : (d.getMonth() + 1) === parseInt(selectedMonth);
      return matchYear && matchMonth && item.status === "PAID";
    });

    const revenue = filteredAds.reduce((sum, item) => sum + (Number(item.rev) || 0), 0);
    const adsCost = filteredAds.reduce((sum, item) => sum + (Number(item.spend) || 0), 0);
    const orders = filteredAds.reduce((sum, item) => sum + (Number(item.orders) || 0), 0);
    
    const isViewAll = selectedCourse === "ALL";
    const salaryCost = isViewAll ? filteredSalary.reduce((sum, item) => sum + (Number(item.finalPayment) || 0), 0) : 0;
    const operatingCost = isViewAll ? filteredSpending.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : 0;

    const totalCost = adsCost + salaryCost + operatingCost;
    const netProfit = revenue - totalCost;
    const roas = adsCost > 0 ? (revenue / adsCost).toFixed(2) : 0;
    const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;

    // Giả lập dữ liệu đồ thị dựa trên tổng (có thể cải tiến theo ngày/tháng thực)
    const chartData = [
       { name: 'Tuần 1', rev: revenue * 0.22, cost: totalCost * 0.25 },
       { name: 'Tuần 2', rev: revenue * 0.28, cost: totalCost * 0.24 },
       { name: 'Tuần 3', rev: revenue * 0.20, cost: totalCost * 0.21 },
       { name: 'Tuần 4', rev: revenue * 0.30, cost: totalCost * 0.30 },
    ];

    return { revenue, adsCost, salaryCost, operatingCost, totalCost, netProfit, roas, orders, profitMargin, chartData };
  }, [rawData, selectedYear, selectedMonth, selectedCourse]);

  const fmt = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

  const pieData = [
    { name: 'Ads', value: stats.adsCost, color: '#3b82f6' },
    { name: 'Lương', value: stats.salaryCost, color: '#a855f7' },
    { name: 'Vận hành', value: stats.operatingCost, color: '#f97316' },
  ].filter(i => i.value > 0);

  // CHẶN XEM Dashboard
  if (!canViewDashboard) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-400">
      <div className="p-6 bg-white rounded-3xl shadow-xl border border-slate-200 flex flex-col items-center max-w-sm text-center">
         <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4 ring-8 ring-red-50/50">
            <Lock size={40}/>
         </div>
         <h2 className="text-xl font-black text-slate-800 mb-2">TRUY CẬP BỊ TỪ CHỐI</h2>
         <p className="text-sm font-medium mb-6">Chỉ Admin hoặc người được cấp quyền mới có thể xem báo cáo tài chính tổng hợp.</p>
         <div className="text-[10px] uppercase font-bold text-slate-300 tracking-widest border-t pt-4 w-full">Mong Group Internal System</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f1f5f9] p-4 md:p-6 font-sans overflow-x-hidden animate-in fade-in duration-500">
      
      {/* HEADER & FILTER */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col xl:flex-row justify-between items-center gap-4 w-full">
         <div className="flex items-center gap-4 w-full xl:w-auto">
            <div className="p-3 bg-slate-900 rounded-xl text-white shadow-lg"><Activity size={24}/></div>
            <div>
               <h1 className="text-xl font-black text-slate-800 leading-tight">CEO DASHBOARD</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Báo cáo tài chính Live</p>
            </div>
         </div>
         
         <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto justify-end">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
               <select className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer px-2 py-1" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
               </select>
               <div className="w-px bg-slate-300 my-1"></div>
               <select className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer px-2 py-1" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                  <option value="ALL">Cả Năm</option>
                  {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
               </select>
            </div>
            <div className="bg-orange-50 rounded-xl px-3 py-2 flex items-center border border-orange-100">
               <span className="text-[9px] font-bold text-orange-400 mr-2 uppercase">Khóa:</span>
               <select className="bg-transparent text-xs font-bold text-orange-700 outline-none cursor-pointer" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                  <option value="ALL">TẤT CẢ</option>
                  <option value="K35">K35</option>
                  <option value="K36">K36</option>
                  <option value="K37">K37</option>
               </select>
            </div>
         </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tổng Doanh Thu</p>
            <h3 className="text-2xl font-black text-slate-800">{fmt(stats.revenue)}</h3>
            <div className="mt-4 text-[10px] font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-md flex items-center gap-1">
               <TrendingUp size={12}/> {stats.orders} ĐƠN HÀNG
            </div>
            <DollarSign className="absolute -right-2 -bottom-2 text-slate-50 size-20" />
         </div>

         <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lợi Nhuận Ròng</p>
            <h3 className="text-2xl font-black text-white">{fmt(stats.netProfit)}</h3>
            <div className="mt-4 flex items-center gap-2">
               <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">Margin: {stats.profitMargin}%</span>
            </div>
            <TrendingUp className="absolute -right-2 -bottom-2 text-white/5 size-20" />
         </div>

         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tổng Chi Phí</p>
            <h3 className="text-2xl font-black text-red-600">{fmt(stats.totalCost)}</h3>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-5 overflow-hidden">
               <div className="h-full bg-red-500" style={{width: `${Math.min((stats.totalCost / (stats.revenue || 1)) * 100, 100)}%`}}></div>
            </div>
            <p className="text-[9px] text-slate-400 mt-2 text-right">Chiếm {((stats.totalCost / (stats.revenue || 1)) * 100).toFixed(1)}% doanh thu</p>
         </div>

         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Chỉ số ROAS</p>
            <h3 className="text-2xl font-black text-blue-600">{stats.roas}x</h3>
            <div className="mt-4 text-[10px] font-bold text-slate-500 flex justify-between bg-slate-50 p-2 rounded-lg">
               <span>Chi Ads:</span>
               <span className="text-slate-800">{fmt(stats.adsCost)}</span>
            </div>
         </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
         <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
            <h3 className="font-bold text-sm text-slate-800 mb-6 flex items-center gap-2"><BarChart2 size={18} className="text-slate-400"/> Dòng tiền Thu & Chi</h3>
            <div className="flex-1">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData}>
                     <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}}/>
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `${v/1000000}M`}/>
                     <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} formatter={(v) => fmt(v)}/>
                     <Area type="monotone" dataKey="rev" stroke="#22c55e" strokeWidth={3} fill="url(#colorRev)" name="Thu"/>
                     <Area type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={3} fill="url(#colorCost)" name="Chi"/>
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-xs text-slate-400 uppercase mb-6">Phân bổ chi phí</h3>
            <div className="h-[200px] w-full relative mb-6">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                     </Pie>
                     <Tooltip formatter={(v) => fmt(v)}/>
                  </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Tổng chi</span>
                  <span className="text-sm font-black text-slate-800">{fmt(stats.totalCost)}</span>
               </div>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto">
               <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center gap-2"><Target size={14} className="text-blue-600"/><span className="text-xs font-bold text-slate-600">Quảng cáo</span></div>
                  <span className="text-xs font-black text-slate-800">{fmt(stats.adsCost)}</span>
               </div>
               <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                  <div className="flex items-center gap-2"><Users size={14} className="text-purple-600"/><span className="text-xs font-bold text-slate-600">Nhân sự</span></div>
                  <span className="text-xs font-black text-slate-800">{fmt(stats.salaryCost)}</span>
               </div>
               <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                  <div className="flex items-center gap-2"><Wallet size={14} className="text-orange-600"/><span className="text-xs font-bold text-slate-600">Vận hành</span></div>
                  <span className="text-xs font-black text-slate-800">{fmt(stats.operatingCost)}</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}