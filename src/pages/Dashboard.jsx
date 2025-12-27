import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, DollarSign, Users, Activity, Target, 
  BarChart2, Lock, Edit3, X, Save, AlertTriangle, Layers, Filter
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// --- IMPORT FIREBASE & AUTH ---
import { db } from '../firebase';
import { ref, onValue, update } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';

// --- HELPER COMPONENTS ---
const ProgressBar = ({ current, target, colorClass = "bg-blue-500", label }) => {
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const isOver = current > target && target > 0;
  return (
    <div className="w-full mt-3">
      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
        <span>{label}</span>
        <span className={isOver ? "text-red-500" : "text-slate-700"}>
          {percent.toFixed(1)}% {isOver ? "(Vượt mức)" : ""}
        </span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${isOver ? 'bg-red-500' : colorClass}`} 
          style={{width: `${percent}%`}}
        ></div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { userPermissions, userRole } = useAuth();
  const canViewDashboard = userRole === 'ADMIN' || userPermissions?.dashboard?.view;
  const canEditTargets = userRole === 'ADMIN';

  // --- CONFIG STATE ---
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  // Multi-select Course State
  const [selectedCourses, setSelectedCourses] = useState(["ALL"]); 
  const [isAutoUpdate, setIsAutoUpdate] = useState(true);

  // --- DATA STATE ---
  const [rawData, setRawData] = useState({ 
    ads: [], salary: [], spending: [], customers: [] 
  });
  
  const [allTargets, setAllTargets] = useState({});
  const [systemCourses, setSystemCourses] = useState([]); // Khóa từ Cấu hình

  // --- MODAL STATE ---
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetForm, setTargetForm] = useState({ 
    course: "K36", revenue: 0, students: 0, adsBudget: 0 
  });

  const fmt = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

  // --- 1. DATA SYNC ---
  useEffect(() => {
    if (!isAutoUpdate || !canViewDashboard) return;

    // A. Load System Config (Khóa học trong Cấu hình)
    onValue(ref(db, 'system_settings/global/courses'), (snap) => {
        if(snap.val()) setSystemCourses(snap.val());
    });

    // B. Load Data thực tế
    onValue(ref(db, 'ads_manager'), (snap) => setRawData(prev => ({...prev, ads: snap.val()?.data || []})));
    onValue(ref(db, 'salary_manager'), (snap) => setRawData(prev => ({...prev, salary: snap.val()?.data || []})));
    onValue(ref(db, 'spending_manager'), (snap) => setRawData(prev => ({...prev, spending: snap.val()?.data || []})));
    onValue(ref(db, 'sales_crm/customers'), (snap) => {
        const val = snap.val();
        setRawData(prev => ({...prev, customers: val ? Object.values(val) : [] }));
    });

    // C. Load Targets
    const targetKey = `${selectedYear}_${selectedMonth}`;
    onValue(ref(db, `system_targets/${targetKey}`), (snap) => setAllTargets(snap.val() || {}));

  }, [isAutoUpdate, canViewDashboard, selectedYear, selectedMonth]);

  // --- 2. LOGIC TỰ ĐỘNG PHÁT HIỆN KHÓA HỌC (AUTO-SYNC) ---
  // Gộp Khóa từ Cấu hình + Khóa tìm thấy trong Ads + Khóa tìm thấy trong Sale
  const availableCourses = useMemo(() => {
      const fromConfig = systemCourses;
      const fromAds = rawData.ads.map(i => i.course).filter(c => c && c !== 'ALL');
      const fromSales = rawData.customers.map(i => i.course).filter(c => c && c !== 'ALL');
      
      // Dùng Set để loại bỏ trùng lặp
      const combined = new Set([...fromConfig, ...fromAds, ...fromSales]);
      
      // Trả về mảng đã sắp xếp
      return Array.from(combined).sort();
  }, [systemCourses, rawData.ads, rawData.customers]);

  // --- 3. MULTI-SELECT HANDLER ---
  const toggleCourse = (course) => {
    if (course === "ALL") {
        setSelectedCourses(["ALL"]);
        return;
    }
    
    let newSelection;
    if (selectedCourses.includes("ALL")) {
        newSelection = [course]; // Nếu đang chọn ALL thì bỏ ALL, chọn cái mới
    } else {
        if (selectedCourses.includes(course)) {
            newSelection = selectedCourses.filter(c => c !== course); // Bỏ chọn
            if (newSelection.length === 0) newSelection = ["ALL"]; // Nếu bỏ hết -> Về ALL
        } else {
            newSelection = [...selectedCourses, course]; // Thêm chọn
        }
    }
    setSelectedCourses(newSelection);
  };

  // --- 4. TARGET LOGIC (AGGREGATE) ---
  const currentTargetValues = useMemo(() => {
    let totalRev = 0, totalStu = 0, totalAds = 0;
    
    // Nếu chọn ALL thì cộng target của tất cả khóa hiện có
    const coursesToSum = selectedCourses.includes("ALL") ? availableCourses : selectedCourses;

    coursesToSum.forEach(c => {
        const t = allTargets[c] || { revenue: 0, students: 0, adsBudget: 0 };
        totalRev += Number(t.revenue) || 0;
        totalStu += Number(t.students) || 0;
        totalAds += Number(t.adsBudget) || 0;
    });
    
    return { revenue: totalRev, students: totalStu, adsBudget: totalAds };
  }, [allTargets, selectedCourses, availableCourses]);

  // Load target vào Form khi mở modal
  useEffect(() => {
    if (showTargetModal) {
        const t = allTargets[targetForm.course] || { revenue: 0, students: 0, adsBudget: 0 };
        setTargetForm(prev => ({ ...prev, ...t }));
    }
  }, [showTargetModal, targetForm.course, allTargets]);

  const handleSaveTargets = async () => {
    const targetKey = `${selectedYear}_${selectedMonth}`;
    try {
      await update(ref(db, `system_targets/${targetKey}/${targetForm.course}`), {
        revenue: Number(targetForm.revenue),
        students: Number(targetForm.students),
        adsBudget: Number(targetForm.adsBudget)
      });
      setShowTargetModal(false);
    } catch (error) {
      alert("Lỗi lưu: " + error.message);
    }
  };

  // --- 5. CORE LOGIC TÍNH TOÁN TÀI CHÍNH ---
  const stats = useMemo(() => {
    const { ads, salary, spending, customers } = rawData;

    // Helper: Check Date Match
    const checkDate = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const matchYear = d.getFullYear() === parseInt(selectedYear);
        const matchMonth = selectedMonth === "ALL" ? true : (d.getMonth() + 1) === parseInt(selectedMonth);
        return matchYear && matchMonth;
    };

    // Helper: Check Course Match (Multi-select)
    const checkCourse = (course) => selectedCourses.includes("ALL") || selectedCourses.includes(course);

    // --- A. BIẾN ĐỔI (VARIABLE): LỌC THEO KHÓA HỌC ---
    // 1. Doanh thu & Công nợ (Chỉ tính các khóa được chọn)
    const filteredCustomers = customers.filter(c => checkDate(c.createdAt) && checkCourse(c.course) && c.status !== 'CANCEL');
    const realRevenue = filteredCustomers.reduce((sum, c) => sum + (Number(c.paidAmount) || 0), 0);
    const totalDebt = filteredCustomers.reduce((sum, c) => sum + (Number(c.debtAmount) || 0), 0);
    const totalStudents = filteredCustomers.length;

    // 2. Chi phí Ads (Chỉ tính các khóa được chọn)
    const filteredAds = ads.filter(a => checkDate(a.date) && checkCourse(a.course));
    const adsCost = filteredAds.reduce((sum, a) => sum + (Number(a.spend) || 0), 0);

    // --- B. CỐ ĐỊNH (FIXED): KHÔNG LỌC THEO KHÓA (TÍNH TOÀN BỘ TRONG THÁNG) ---
    
    // 3. Chi phí Vận hành (Chỉ lọc theo tháng)
    const filteredSpending = spending.filter(s => checkDate(s.date) && s.status === 'PAID');
    const operatingCost = filteredSpending.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    // 4. Lương (Chỉ lọc theo tháng)
    const filteredSalary = salary.filter(s => {
        if (!s.month) return false;
        const matchYear = s.month.includes(`/${selectedYear}`);
        const mStr = `Tháng ${selectedMonth}/`;
        const mStrPad = `Tháng ${String(selectedMonth).padStart(2, '0')}/`;
        const matchMonth = selectedMonth === "ALL" ? true : (s.month.includes(mStr) || s.month.includes(mStrPad));
        return matchYear && matchMonth;
    });
    const salaryCost = filteredSalary.reduce((sum, s) => sum + (Number(s.finalPayment) || 0), 0);

    // --- C. TỔNG HỢP ---
    const totalCost = adsCost + operatingCost + salaryCost;
    
    // Lợi nhuận ròng = Doanh thu (khóa chọn) - Tổng chi
    const netProfit = realRevenue - totalCost;
    
    const profitMargin = realRevenue > 0 ? ((netProfit / realRevenue) * 100).toFixed(1) : 0;
    const roas = adsCost > 0 ? (realRevenue / adsCost).toFixed(2) : 0;

    // Chart Data Generation
    const chartBuckets = Array(4).fill(0).map((_, i) => ({ name: `Tuần ${i+1}`, rev: 0, cost: 0 }));
    const addToBucket = (dateStr, amount, type) => {
        if (!dateStr || !amount) return;
        const day = new Date(dateStr).getDate();
        const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
        chartBuckets[idx][type] += amount;
    };

    filteredCustomers.forEach(c => addToBucket(c.createdAt, Number(c.paidAmount), 'rev'));
    filteredAds.forEach(a => addToBucket(a.date, Number(a.spend), 'cost'));
    
    // Phân bổ chi phí cố định đều vào 4 tuần
    const fixedCostPerWeek = (operatingCost + salaryCost) / 4;
    chartBuckets.forEach(b => b.cost += fixedCostPerWeek);

    return { 
        realRevenue, totalDebt, totalStudents,
        adsCost, operatingCost, salaryCost, totalCost,
        netProfit, profitMargin, roas, chartData: chartBuckets 
    };
  }, [rawData, selectedYear, selectedMonth, selectedCourses]);

  const pieData = [
    { name: 'Ads', value: stats.adsCost, color: '#3b82f6' },
    { name: 'Lương', value: stats.salaryCost, color: '#a855f7' },
    { name: 'Vận hành', value: stats.operatingCost, color: '#f97316' },
  ].filter(i => i.value > 0);

  if (!canViewDashboard) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-400">
      <Lock size={40} className="mb-2"/> <p>Bạn không có quyền xem Dashboard.</p>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f1f5f9] p-4 md:p-6 font-sans overflow-x-hidden animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col xl:flex-row justify-between items-center gap-4 w-full">
         <div className="flex items-center gap-4 w-full xl:w-auto">
            <div className="p-3 bg-slate-900 rounded-xl text-white shadow-lg"><Activity size={24}/></div>
            <div>
               <h1 className="text-xl font-black text-slate-800 leading-tight">CEO DASHBOARD</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">REAL-TIME CASH FLOW</p>
            </div>
         </div>
         
         <div className="flex flex-col md:flex-row gap-3 items-end md:items-center w-full xl:w-auto justify-end">
            {canEditTargets && (
              <button 
                onClick={() => setShowTargetModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-200 transition-all"
              >
                <Target size={14}/> Đặt KPI
              </button>
            )}

            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
               <select className="bg-transparent text-xs font-bold text-slate-700 outline-none px-2 py-1 cursor-pointer" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
               </select>
               <div className="w-px bg-slate-300 my-1"></div>
               <select className="bg-transparent text-xs font-bold text-slate-700 outline-none px-2 py-1 cursor-pointer" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                  <option value="ALL">Cả Năm</option>
                  {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
               </select>
            </div>
            
            {/* MULTI-SELECT COURSE (ĐÃ ĐỒNG BỘ AUTO) */}
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto max-w-[300px] no-scrollbar">
                <button 
                    onClick={() => toggleCourse("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedCourses.includes("ALL") ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    TẤT CẢ
                </button>
                {availableCourses.map(k => (
                    <button 
                        key={k}
                        onClick={() => toggleCourse(k)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedCourses.includes(k) ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        {k}
                    </button>
                ))}
            </div>
         </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
         
         {/* CARD 1: DOANH THU */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Doanh Thu Thực</p>
            <h3 className="text-2xl font-black text-green-600">{fmt(stats.realRevenue)}</h3>
            <div className="mt-1">
               <span className="text-[10px] text-slate-400">Mục tiêu: {fmt(currentTargetValues.revenue)}</span>
               <ProgressBar current={stats.realRevenue} target={currentTargetValues.revenue} colorClass="bg-green-500" label="Tiến độ" />
            </div>
            {stats.totalDebt > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-50 flex items-center gap-1 text-[10px] font-bold text-red-500">
                    <AlertTriangle size={10} /> Công nợ phải thu: {fmt(stats.totalDebt)}
                </div>
            )}
            <DollarSign className="absolute -right-2 -bottom-2 text-green-50 size-20 group-hover:scale-110 transition-transform" />
         </div>

         {/* CARD 2: HỌC VIÊN */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tiến Độ Học Viên</p>
            <h3 className="text-2xl font-black text-blue-600">{stats.totalStudents} <span className="text-sm font-medium text-slate-400">HV</span></h3>
            <div className="mt-1">
               <span className="text-[10px] text-slate-400">Mục tiêu: {currentTargetValues.students} HV</span>
               <ProgressBar current={stats.totalStudents} target={currentTargetValues.students} colorClass="bg-blue-500" label="Lấp đầy" />
            </div>
            <Users className="absolute -right-2 -bottom-2 text-blue-50 size-20 group-hover:scale-110 transition-transform" />
         </div>

         {/* CARD 3: LỢI NHUẬN RÒNG */}
         <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden group">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lợi Nhuận Ròng (Net)</p>
            <h3 className={`text-2xl font-black ${stats.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>{fmt(stats.netProfit)}</h3>
            <p className="text-[10px] text-slate-400 mt-1 italic opacity-70">* Đã trừ chi phí cố định toàn tháng</p>
            <div className="mt-4 flex items-center gap-2">
               <span className={`text-[10px] font-bold px-2 py-1 rounded border ${stats.netProfit >= 0 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                  Margin: {stats.profitMargin}%
               </span>
            </div>
            <TrendingUp className="absolute -right-2 -bottom-2 text-white/5 size-20 group-hover:rotate-12 transition-transform" />
         </div>

         {/* CARD 4: ADS BUDGET */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ngân Sách Ads</p>
            <h3 className="text-2xl font-black text-slate-800">{fmt(stats.adsCost)}</h3>
            <div className="mt-1">
                <span className="text-[10px] text-slate-400">Giới hạn: {fmt(currentTargetValues.adsBudget)}</span>
                <ProgressBar current={stats.adsCost} target={currentTargetValues.adsBudget} colorClass="bg-purple-500" label="Đã dùng" />
            </div>
            <p className="text-[10px] mt-2 font-bold text-blue-600">ROAS Thực: {stats.roas}x</p>
         </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
         <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
            <h3 className="font-bold text-sm text-slate-800 mb-6 flex items-center gap-2">
                <BarChart2 size={18} className="text-slate-400"/> Dòng Tiền & Hiệu Quả Kinh Doanh
            </h3>
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
                     <Area type="monotone" dataKey="rev" stroke="#22c55e" strokeWidth={3} fill="url(#colorRev)" name="Tiền Về"/>
                     <Area type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={3} fill="url(#colorCost)" name="Tiền Ra (Full)"/>
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="font-bold text-xs text-slate-400 uppercase mb-6">Cơ cấu chi phí (Tháng)</h3>
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
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
               <div className="flex justify-between text-xs border-b pb-2"><span className="text-slate-500">Ads (Biến đổi)</span> <b>{fmt(stats.adsCost)}</b></div>
               <div className="flex justify-between text-xs border-b pb-2"><span className="text-slate-500">Lương (Cố định)</span> <b>{fmt(stats.salaryCost)}</b></div>
               <div className="flex justify-between text-xs border-b pb-2"><span className="text-slate-500">Vận hành (Cố định)</span> <b>{fmt(stats.operatingCost)}</b></div>
            </div>
         </div>
      </div>

      {/* --- MODAL SET TARGETS --- */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Cài Đặt Mục Tiêu (KPI)</h3>
                <p className="text-xs text-slate-500">Tháng {selectedMonth}/{selectedYear}</p>
              </div>
              <button onClick={() => setShowTargetModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                      <Layers size={12}/> Chọn Khóa Áp Dụng
                  </label>
                  <select 
                    className="w-full p-2 bg-white border border-blue-200 rounded-lg text-sm font-bold text-slate-700 outline-none"
                    value={targetForm.course}
                    onChange={(e) => setTargetForm({...targetForm, course: e.target.value})}
                  >
                      {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Mục tiêu Doanh Thu (VNĐ)</label>
                <input 
                  type="number" className="w-full p-3 border rounded-xl font-bold text-green-600 focus:ring-2 focus:ring-green-500 outline-none"
                  value={targetForm.revenue} onChange={(e) => setTargetForm({...targetForm, revenue: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Mục tiêu Học Viên (Người)</label>
                <input 
                  type="number" className="w-full p-3 border rounded-xl font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={targetForm.students} onChange={(e) => setTargetForm({...targetForm, students: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Ngân sách Ads Giới hạn (VNĐ)</label>
                <input 
                  type="number" className="w-full p-3 border rounded-xl font-bold text-purple-600 focus:ring-2 focus:ring-purple-500 outline-none"
                  value={targetForm.adsBudget} onChange={(e) => setTargetForm({...targetForm, adsBudget: e.target.value})}
                />
              </div>
              <button 
                onClick={handleSaveTargets}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 mt-2 flex items-center justify-center gap-2"
              >
                <Save size={18}/> Lưu KPI Cho {targetForm.course}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}