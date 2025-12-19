import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  Activity, Calendar, Filter, PieChart as PieIcon, 
  ArrowUpRight, Target, CreditCard, RefreshCw, BarChart2,
  Settings, X, Wallet
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

// --- IMPORT FIREBASE ---
import { db } from '../firebase';
import { ref, onValue } from "firebase/database";

export default function Dashboard() {
  // --- 1. CONFIG & STATE ---
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [isAutoUpdate, setIsAutoUpdate] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Widget Toggles
  const [widgets, setWidgets] = useState({
    ads: true,
    salary: true,
    spending: true,
    chartFlow: true,
    chartPie: true,
    netProfit: true
  });

  const [rawData, setRawData] = useState({ ads: [], salary: [], spending: [] });

  // --- 2. DATA SYNC (FIREBASE REALTIME) ---
  useEffect(() => {
    if (!isAutoUpdate) return;

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
      } else {
        setRawData(prev => ({ ...prev, ads: [] }));
      }
    });

    // B. Đọc dữ liệu Salary
    const salaryRef = ref(db, 'salary_manager');
    const unsubSalary = onValue(salaryRef, (snapshot) => {
       const val = snapshot.val();
       if (val && val.data && Array.isArray(val.data)) {
          setRawData(prev => ({ ...prev, salary: val.data }));
       } else {
          setRawData(prev => ({ ...prev, salary: [] }));
       }
    });

    // C. Đọc dữ liệu Spending [ĐÃ SỬA]
    const spendingRef = ref(db, 'spending_manager');
    const unsubSpending = onValue(spendingRef, (snapshot) => {
       const val = snapshot.val();
       // Kiểm tra kỹ cấu trúc spending
       if (val && val.data && Array.isArray(val.data)) {
          setRawData(prev => ({ ...prev, spending: val.data }));
       } else {
          setRawData(prev => ({ ...prev, spending: [] }));
       }
    });

    return () => {
      unsubAds();
      unsubSalary();
      unsubSpending();
    };
  }, [isAutoUpdate]);

  // --- 3. LOGIC TÍNH TOÁN ---
  const stats = useMemo(() => {
    const { ads, salary, spending } = rawData;

    // Filter Ads
    const filteredAds = ads.filter(item => {
      if (!item?.date) return false;
      const d = new Date(item.date);
      const matchYear = d.getFullYear() === parseInt(selectedYear);
      const matchMonth = selectedMonth === "ALL" ? true : (d.getMonth() + 1) === parseInt(selectedMonth);
      const matchCourse = selectedCourse === "ALL" ? true : item.course === selectedCourse;
      return matchYear && matchMonth && matchCourse;
    });

    // Filter Salary
    const filteredSalary = salary.filter(item => {
      if (!item?.month) return false;
      const targetSuffix = `/${selectedYear}`;
      const matchYear = item.month.includes(targetSuffix);
      let matchMonth = true;
      if (selectedMonth !== "ALL") {
         const mStr = `Tháng ${selectedMonth}/`;
         const mStrPad = `Tháng ${String(selectedMonth).padStart(2, '0')}/`;
         matchMonth = item.month.includes(mStr) || item.month.includes(mStrPad);
      }
      return matchYear && matchMonth;
    });

    // Filter Spending [CHỈ LẤY ĐÃ CHI]
    const filteredSpending = spending.filter(item => {
      if (!item?.date) return false;
      const d = new Date(item.date);
      const matchYear = d.getFullYear() === parseInt(selectedYear);
      const matchMonth = selectedMonth === "ALL" ? true : (d.getMonth() + 1) === parseInt(selectedMonth);
      // Chỉ tính vào chi phí nếu status là PAID
      return matchYear && matchMonth && item.status === "PAID";
    });

    // Calculate Totals
    const revenue = filteredAds.reduce((sum, item) => sum + (Number(item.rev) || 0), 0);
    const adsCost = filteredAds.reduce((sum, item) => sum + (Number(item.spend) || 0), 0);
    const orders = filteredAds.reduce((sum, item) => sum + (Number(item.orders) || 0), 0);
    
    // Nếu xem ALL thì tính cả chi phí chung
    const isViewAll = selectedCourse === "ALL";
    const salaryCost = isViewAll ? filteredSalary.reduce((sum, item) => sum + (Number(item.finalPayment) || 0), 0) : 0;
    const operatingCost = isViewAll ? filteredSpending.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) : 0;

    const totalCost = adsCost + salaryCost + operatingCost;
    const netProfit = revenue - totalCost;
    const roas = adsCost > 0 ? (revenue / adsCost).toFixed(2) : 0;
    const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;

    // Chart Data
    const chartData = [
       { name: 'Tuần 1', rev: revenue * 0.2, cost: totalCost * 0.25 },
       { name: 'Tuần 2', rev: revenue * 0.3, cost: totalCost * 0.25 },
       { name: 'Tuần 3', rev: revenue * 0.15, cost: totalCost * 0.2 },
       { name: 'Tuần 4', rev: revenue * 0.35, cost: totalCost * 0.3 },
    ];

    return { revenue, adsCost, salaryCost, operatingCost, totalCost, netProfit, roas, orders, profitMargin, chartData };
  }, [rawData, selectedYear, selectedMonth, selectedCourse]);

  const fmt = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

  const pieData = [
    { name: 'Ads', value: stats.adsCost, color: '#3b82f6' },
    { name: 'Lương', value: stats.salaryCost, color: '#a855f7' },
    { name: 'Vận hành', value: stats.operatingCost, color: '#f97316' },
  ].filter(i => i.value > 0);

  // --- 4. CONFIG MODAL ---
  const ConfigModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-[400px] p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
           <h2 className="text-lg font-bold flex items-center gap-2"><Settings className="text-slate-600"/> Cấu Hình Dashboard</h2>
           <button onClick={() => setShowConfig(false)}><X size={20}/></button>
        </div>
        <div className="space-y-3">
           {Object.keys(widgets).map(key => (
              <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded border cursor-pointer hover:bg-slate-100" onClick={() => setWidgets({...widgets, [key]: !widgets[key]})}>
                 <span className="font-bold text-sm uppercase text-slate-600">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                 <div className={`w-10 h-5 rounded-full relative transition-colors ${widgets[key] ? 'bg-green-500' : 'bg-slate-300'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${widgets[key] ? 'left-6' : 'left-1'}`}></div>
                 </div>
              </div>
           ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f1f5f9] p-6 font-sans animate-in fade-in duration-500 overflow-x-hidden">
      {showConfig && <ConfigModal />}

      {/* HEADER & FILTER */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col xl:flex-row justify-between items-center gap-4 w-full">
         <div className="flex items-center gap-4 w-full xl:w-auto">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 whitespace-nowrap">
               <Activity className="text-orange-600"/> DASHBOARD CEO
            </h1>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden xl:block"></div>
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-200">
               <RefreshCw size={12} className={isAutoUpdate ? "animate-spin" : ""}/> {isAutoUpdate ? "Firebase Live" : "Paused"}
            </div>
         </div>
         
         <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto justify-end">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
               <select className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer px-2 py-1" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>Năm {y}</option>)}
               </select>
               <div className="w-px bg-slate-300 my-1"></div>
               <select className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer px-2 py-1" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                  <option value="ALL">Cả Năm</option>
                  {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
               </select>
            </div>
            <div className="bg-orange-50 rounded-xl px-3 py-2 flex items-center border border-orange-100">
               <span className="text-[10px] font-bold text-orange-400 mr-2">KHÓA</span>
               <select className="bg-transparent text-sm font-bold text-orange-700 outline-none cursor-pointer" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                  <option value="ALL">Tất Cả</option>
                  <option value="K35">K35</option>
                  <option value="K36">K36</option>
                  <option value="K37">K37</option>
               </select>
            </div>
            <button onClick={() => setShowConfig(true)} className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 shadow-sm transition-all"><Settings size={18}/></button>
         </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6 w-full">
         
         {/* Card 1: Doanh Thu */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Doanh Thu</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">{fmt(stats.revenue)}</h3>
               </div>
               <div className="p-3 bg-green-50 rounded-xl text-green-600"><DollarSign size={24}/></div>
            </div>
            <div className="mt-4 text-xs font-bold text-green-600 flex items-center gap-1 bg-green-50 w-fit px-2 py-1 rounded">
               <ArrowUpRight size={14}/> {stats.orders} Đơn hàng
            </div>
         </div>

         {/* Card 2: Lợi Nhuận */}
         {widgets.netProfit && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden transform hover:-translate-y-1 transition-transform">
               <div className="relative z-10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lợi Nhuận Ròng</p>
                  <h3 className="text-3xl font-black text-white mt-2">{fmt(stats.netProfit)}</h3>
                  <div className="mt-4 flex items-center gap-2">
                     <span className={`text-xs font-bold px-2 py-1 rounded border ${stats.profitMargin >= 30 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                        Margin: {stats.profitMargin}%
                     </span>
                     <span className="text-[10px] text-slate-400">Thực nhận</span>
                  </div>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            </div>
         )}

         {/* Card 3: Chi Phí */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Chi Phí</p>
                  <h3 className="text-3xl font-black text-red-600 mt-2">{fmt(stats.totalCost)}</h3>
               </div>
               <div className="p-3 bg-red-50 rounded-xl text-red-600"><TrendingDown size={24}/></div>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-5 overflow-hidden">
               <div className="h-full bg-red-500 transition-all duration-1000" style={{width: `${Math.min((stats.totalCost / (stats.revenue || 1)) * 100, 100)}%`}}></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-right">Chiếm {((stats.totalCost / (stats.revenue || 1)) * 100).toFixed(1)}% doanh thu</p>
         </div>

         {/* Card 4: ROAS */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hiệu Quả Ads</p>
                  <h3 className="text-3xl font-black text-blue-600 mt-2">{stats.roas}x</h3>
               </div>
               <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Target size={24}/></div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-500 bg-slate-50 p-2 rounded-lg">
               <span>Spend</span>
               <span className="font-bold text-slate-700">{fmt(stats.adsCost)}</span>
            </div>
         </div>
      </div>

      {/* 3. CHARTS & DETAILS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
         
         {/* CHART FLOW */}
         {widgets.chartFlow && (
            <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[450px]">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><BarChart2 size={20} className="text-slate-400"/> Biểu Đồ Dòng Tiền & Lợi Nhuận</h3>
                  <div className="flex gap-4">
                     <div className="flex items-center gap-1 text-xs font-bold text-slate-600"><div className="w-2 h-2 rounded-full bg-green-500"></div> Thu</div>
                     <div className="flex items-center gap-1 text-xs font-bold text-slate-600"><div className="w-2 h-2 rounded-full bg-red-500"></div> Chi</div>
                  </div>
               </div>
               <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={stats.chartData}>
                        <defs>
                           <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                           <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10}/>
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(value) => `${value/1000000}M`}/>
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} formatter={(value) => fmt(value)}/>
                        <Area type="monotone" dataKey="rev" stroke="#22c55e" strokeWidth={3} fill="url(#colorRev)" name="Doanh Thu" activeDot={{r: 6}}/>
                        <Area type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={3} fill="url(#colorCost)" name="Chi Phí"/>
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
         )}

         {/* PIE CHART & LIST DETAIL */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
            
            {/* Pie Chart */}
            {widgets.chartPie && (
               <div className="h-[220px] w-full relative border-b border-slate-100 pb-6">
                  <h3 className="font-bold text-xs text-slate-400 uppercase mb-2 tracking-wider">Phân Bổ Chi Phí</h3>
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                           {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value) => fmt(value)} contentStyle={{borderRadius:'8px'}}/>
                     </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-6">
                     <span className="text-[10px] font-bold text-slate-400 uppercase">Tổng Chi</span>
                     <span className="text-lg font-black text-slate-800">{fmt(stats.totalCost)}</span>
                  </div>
               </div>
            )}

            {/* List Chi Tiết */}
            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
               <h3 className="font-bold text-lg text-slate-800">Chi Tiết</h3>
               
               {widgets.ads && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                     <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"><Target size={20}/></div>
                     <div className="flex-1">
                        <div className="flex justify-between text-xs font-bold mb-2"><span className="text-slate-700">Ads / Marketing</span><span className="text-slate-900">{fmt(stats.adsCost)}</span></div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full"><div className="h-full bg-blue-500" style={{width: stats.totalCost > 0 ? `${(stats.adsCost/stats.totalCost)*100}%` : '0%'}}></div></div>
                     </div>
                  </div>
               )}
               
               {widgets.salary && selectedCourse === "ALL" && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                     <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600"><Users size={20}/></div>
                     <div className="flex-1">
                        <div className="flex justify-between text-xs font-bold mb-2"><span className="text-slate-700">Lương & HR</span><span className="text-slate-900">{fmt(stats.salaryCost)}</span></div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full"><div className="h-full bg-purple-500" style={{width: stats.totalCost > 0 ? `${(stats.salaryCost/stats.totalCost)*100}%` : '0%'}}></div></div>
                     </div>
                  </div>
               )}
               
               {widgets.spending && selectedCourse === "ALL" && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                     <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600"><Wallet size={20}/></div>
                     <div className="flex-1">
                        <div className="flex justify-between text-xs font-bold mb-2"><span className="text-slate-700">Vận Hành</span><span className="text-slate-900">{fmt(stats.operatingCost)}</span></div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full"><div className="h-full bg-orange-500" style={{width: stats.totalCost > 0 ? `${(stats.operatingCost/stats.totalCost)*100}%` : '0%'}}></div></div>
                     </div>
                  </div>
               )}

               {selectedCourse !== "ALL" && (
                  <div className="p-3 bg-yellow-50 text-yellow-700 text-xs rounded-lg border border-yellow-200 text-center font-medium">
                     Đang xem riêng <strong>{selectedCourse}</strong>. Chi phí chung (Lương, Vận hành) được ẩn để tính lãi gộp khóa.
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}