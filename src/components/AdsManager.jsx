import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Filter, Settings, 
  ChevronDown, ChevronUp, ChevronRight, 
  Video, Image, Link as LinkIcon, Trash2, X, 
  Undo, Redo, Calendar, BarChart3
} from 'lucide-react';

// --- IMPORT FIREBASE ---
import { db } from '../firebase';
import { ref, set, onValue } from "firebase/database";

export default function AdsManager() {
  // --- 1. KHỞI TẠO DỮ LIỆU ---
  const INITIAL_STATE = {
    data: [],
    config: {
      courses: ["ALL", "K35", "K36", "K37"],
      actions: ["Tăng", "Giữ", "Tắt", "Chờ", "Scale"],
      evals: ["🌟 Tốt", "✅ Ổn", "💸 Lỗ", "⚠️ Kém", "🆕 New"],
      formats: ["Video", "Image", "Reels", "Album"]
    }
  };

  const [history, setHistory] = useState([INITIAL_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const currentState = history[historyIndex];
  const data = currentState.data || [];
  const config = currentState.config || INITIAL_STATE.config;

  // --- 2. KẾT NỐI FIREBASE ---
  useEffect(() => {
    const dataRef = ref(db, 'ads_manager');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const cloudData = snapshot.val();
      if (cloudData) {
        setHistory([{ data: cloudData.data || [], config: cloudData.config || INITIAL_STATE.config }]);
        setHistoryIndex(0);
      }
    });
    return () => unsubscribe();
  }, []);

  const saveToCloud = (newData, newConfig) => {
    set(ref(db, 'ads_manager'), { data: newData, config: newConfig }).catch(console.error);
  };

  const pushToHistory = (newData, newConfig) => {
    const nextData = newData || data;
    const nextConfig = newConfig || config;
    const nextState = { data: nextData, config: nextConfig };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(nextState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    saveToCloud(nextData, nextConfig);
  };

  const undo = () => { if (historyIndex > 0) setHistoryIndex(historyIndex - 1); };
  const redo = () => { if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1); };

  // --- STATE CỤC BỘ ---
  const [filterCourse, setFilterCourse] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showConfigModal, setShowConfigModal] = useState(false);

  const fmt = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);

  // --- LOGIC XỬ LÝ ---
  const handleAddCourse = () => {
    const val = prompt("Nhập tên khóa mới (VD: K38):");
    if (val && !config.courses.includes(val)) {
      pushToHistory(null, { ...config, courses: [...config.courses, val] });
      setFilterCourse(val);
    }
  };

  const handleDeleteCourse = (courseToDelete, e) => {
    e.stopPropagation();
    if (confirm(`Bạn chắc chắn muốn xóa tab ${courseToDelete}?`)) {
      pushToHistory(null, { ...config, courses: config.courses.filter(c => c !== courseToDelete) });
      if (filterCourse === courseToDelete) setFilterCourse("ALL");
    }
  };

  const updateConfigList = (key, newList) => {
    pushToHistory(null, { ...config, [key]: newList });
  };

  const calculateMetrics = (item) => {
    const totalOrders = (Number(item.mong) || 0) + (Number(item.thanh) || 0);
    const revenue = totalOrders * (Number(item.price) || 0);
    const cpm = item.mess > 0 ? Math.round(item.spend / item.mess) : 0;
    const rate = item.mess > 0 ? ((totalOrders / item.mess) * 100).toFixed(1) : 0;
    const profit = revenue - (item.spend || 0) - (item.cost || 0);
    const roas = item.spend > 0 ? (revenue / item.spend).toFixed(2) : 0;
    
    let evaluation = item.eval || "🆕 New";
    if (!item.manualEval && item.spend > 0) {
        if (roas >= 4) evaluation = "🌟 Tốt";
        else if (roas >= 2.5) evaluation = "✅ Ổn";
        else evaluation = "💸 Lỗ";
    }
    return { ...item, orders: totalOrders, rev: revenue, cpm, rate, profit, roas, eval: item.manualEval || evaluation };
  };

  const handleUpdate = (id, field, value) => {
    let rawValue = value;
    const numericFields = ['budget', 'spend', 'mess', 'mong', 'thanh', 'price', 'cost'];
    if (numericFields.includes(field)) rawValue = parseInt(value.replace(/\D/g, '')) || 0;

    const updatedData = data.map(item => {
      if (item.id === id) {
        if (field === 'eval') return { ...item, eval: rawValue, manualEval: rawValue };
        return { ...item, [field]: rawValue };
      }
      return item;
    });
    pushToHistory(updatedData, null);
  };

  const handleAddCampaign = () => {
    const newId = `C${Math.floor(Math.random() * 10000)}`;
    const today = new Date().toISOString().split('T')[0];
    const newItem = {
      id: newId, date: today, course: filterCourse === "ALL" ? config.courses[1] || "K37" : filterCourse,
      name: "Camp mới...", headline: "", format: "Video", link: "", media: "",
      budget: 0, spend: 0, mess: 0, mong: 0, thanh: 0, price: 3500000, cost: 0,
      action: config.actions[3] || "Chờ", status: "DRAFT", content: ""
    };
    pushToHistory([newItem, ...data], null);
  };

  const handleDelete = (id) => { 
    if(confirm("Xóa dòng này?")) pushToHistory(data.filter(i => i.id !== id), null); 
  };

  const processedData = useMemo(() => {
    let result = data.map(calculateMetrics);
    if (filterCourse !== "ALL") result = result.filter(item => item.course === filterCourse);
    if (searchQuery) result = result.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, filterCourse, searchQuery, sortConfig]);

  const summary = useMemo(() => {
    return processedData.reduce((acc, item) => ({
      spend: acc.spend + (item.spend || 0),
      mess: acc.mess + (item.mess || 0),
      orders: acc.orders + (item.orders || 0),
      rev: acc.rev + (item.rev || 0),
      cost: acc.cost + (item.cost || 0),
      profit: acc.profit + (item.profit || 0)
    }), { spend: 0, mess: 0, orders: 0, rev: 0, cost: 0, profit: 0 });
  }, [processedData]);

  const requestSort = (key) => { setSortConfig({ key, direction: (sortConfig.key === key && sortConfig.direction === 'ascending') ? 'descending' : 'ascending' }); };
  const SortIcon = ({ columnKey }) => sortConfig.key === columnKey ? (sortConfig.direction === 'ascending' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null;

  // --- MODAL CONFIG ---
  const ConfigModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-[500px] p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-lg font-bold flex items-center gap-2"><Settings className="text-orange-600"/> Cấu Hình</h2>
          <button onClick={() => setShowConfigModal(false)}><X size={20}/></button>
        </div>
        <div className="space-y-6">
          {/* ... (Giữ nguyên nội dung modal) ... */}
          <div>
            <h3 className="font-bold text-sm mb-2">Nhãn Đánh giá</h3>
            <div className="flex gap-2 mb-2">
              <input id="newEval" className="border rounded px-2 py-1 text-sm flex-1" placeholder="VD: 🔥 Win" />
              <button onClick={() => {
                const val = document.getElementById('newEval').value;
                if(val && !config.evals.includes(val)) { updateConfigList('evals', [...config.evals, val]); document.getElementById('newEval').value = ''; }
              }} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold">Thêm</button>
            </div>
            <div className="flex flex-wrap gap-2">{config.evals.map(item => <span key={item} className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs border border-green-200 flex items-center gap-1">{item} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => updateConfigList('evals', config.evals.filter(i => i !== item))}/></span>)}</div>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-2">Hành động</h3>
            <div className="flex gap-2 mb-2">
               <input id="newAction" className="border rounded px-2 py-1 text-sm flex-1" placeholder="VD: Tắt..." />
               <button onClick={() => {
                  const val = document.getElementById('newAction').value;
                  if(val && !config.actions.includes(val)) { updateConfigList('actions', [...config.actions, val]); document.getElementById('newAction').value = ''; }
               }} className="bg-orange-600 text-white px-3 py-1 rounded text-sm font-bold">Thêm</button>
            </div>
            <div className="flex flex-wrap gap-2">{config.actions.map(item => <span key={item} className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-xs border border-orange-200 flex items-center gap-1">{item} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => updateConfigList('actions', config.actions.filter(i => i !== item))}/></span>)}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-6 font-sans animate-in fade-in duration-500 overflow-x-hidden">
      {showConfigModal && <ConfigModal />}
      
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 w-full">
         <div className="flex items-center gap-4">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><BarChart3 size={24}/></div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 whitespace-nowrap">ADS MANAGER</h1>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm ml-4">
                <button onClick={undo} disabled={historyIndex === 0} className={`p-1.5 rounded ${historyIndex === 0 ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}`}><Undo size={16}/></button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button onClick={redo} disabled={historyIndex === history.length - 1} className={`p-1.5 rounded ${historyIndex === history.length - 1 ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}`}><Redo size={16}/></button>
            </div>
         </div>

         <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto max-w-full">
            {config.courses.map(k => (
               <div key={k} className={`group relative flex items-center px-4 py-2 rounded-md cursor-pointer transition-all whitespace-nowrap ${filterCourse === k ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setFilterCourse(k)}>
                  <span className="text-sm font-bold mr-1">{k === "ALL" ? "TỔNG HỢP" : k}</span>
                  {k !== "ALL" && (
                    <button onClick={(e) => handleDeleteCourse(k, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5 rounded-full bg-white/10"><X size={10} /></button>
                  )}
               </div>
            ))}
            <button onClick={handleAddCourse} className="px-3 py-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg ml-1"><Plus size={16}/></button>
         </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 w-full">
         <div className="relative flex-1 group">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none shadow-sm transition-all" placeholder="Tìm kiếm chiến dịch, nhóm quảng cáo..."/>
            <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16}/>
         </div>
         <div className="flex gap-2">
            <button onClick={() => setShowConfigModal(true)} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2 text-sm whitespace-nowrap"><Settings size={18}/> Cấu hình</button>
            <button onClick={handleAddCampaign} className="bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold shadow hover:bg-orange-700 hover:shadow-lg flex items-center gap-2 text-sm whitespace-nowrap transition-all"><Plus size={18}/> Thêm QC</button>
         </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-300 w-full overflow-hidden flex flex-col h-[calc(100vh-220px)]">
         <div className="overflow-auto w-full flex-1 relative custom-scrollbar">
            <table className="min-w-max w-full text-left border-collapse text-xs whitespace-nowrap relative">
               
               {/* --- HEADER --- */}
               <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold sticky top-0 z-30 shadow-md">
                  <tr>
                     {/* Sticky First Column Header */}
                     <th className="p-3 w-12 text-center sticky left-0 top-0 z-40 bg-slate-800 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">#</th>
                     <th colSpan="7" className="p-3 border-r border-slate-600 text-center bg-slate-900">THÔNG TIN CƠ BẢN</th>
                     <th colSpan="4" className="p-3 border-r border-slate-600 text-center bg-blue-900">QUẢNG CÁO</th>
                     <th colSpan="9" className="p-3 border-r border-slate-600 text-center bg-green-900">KINH DOANH</th>
                     <th colSpan="4" className="p-3 text-center bg-orange-900">TRẠNG THÁI</th>
                  </tr>
                  <tr className="bg-slate-100 text-slate-600 border-b-2 border-slate-300 cursor-pointer">
                     {/* Sticky Header Row 2 */}
                     <th className="p-3 sticky left-0 top-[40px] z-40 bg-slate-100 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.1)]"></th>
                     <th className="p-3 w-28 sticky top-[40px] bg-slate-100">Ngày</th>
                     <th className="p-3 w-24 text-center sticky top-[40px] bg-slate-100" onClick={() => requestSort('course')}>Khóa <SortIcon columnKey="course"/></th>
                     <th className="p-3 min-w-[200px] sticky top-[40px] bg-slate-100" onClick={() => requestSort('name')}>Tên Bài <SortIcon columnKey="name"/></th>
                     <th className="p-3 min-w-[150px] sticky top-[40px] bg-slate-100">Tiêu đề</th>
                     <th className="p-3 w-28 text-center sticky top-[40px] bg-slate-100">Định dạng</th>
                     <th className="p-3 w-20 text-center sticky top-[40px] bg-slate-100">Link</th>
                     <th className="p-3 w-32 text-right border-r border-slate-300 sticky top-[40px] bg-slate-100">Ngân sách</th>
                     <th className="p-3 w-32 text-right bg-blue-50 text-blue-800 sticky top-[40px]" onClick={() => requestSort('spend')}>Tiền Tiêu <SortIcon columnKey="spend"/></th>
                     <th className="p-3 w-20 text-center bg-blue-50 text-blue-800 sticky top-[40px]" onClick={() => requestSort('mess')}>Mess <SortIcon columnKey="mess"/></th>
                     <th className="p-3 w-28 text-right bg-blue-50 text-blue-800 sticky top-[40px]">Giá Mess</th>
                     <th className="p-3 w-20 text-center bg-blue-50 text-blue-800 border-r border-blue-200 sticky top-[40px]">Rate</th>
                     <th className="p-3 w-20 text-center bg-green-50 border-l border-green-100 sticky top-[40px]">Mong 🔥</th>
                     <th className="p-3 w-20 text-center bg-green-50 sticky top-[40px]">Thành 💧</th>
                     <th className="p-3 w-20 text-center bg-green-50 font-black text-slate-600 sticky top-[40px]">TỔNG</th>
                     <th className="p-3 w-20 text-center bg-green-50 text-green-700 font-bold sticky top-[40px]">% Chốt</th>
                     <th className="p-3 w-28 text-right bg-green-50 text-slate-600 sticky top-[40px]">Giá Bán</th>
                     <th className="p-3 w-32 text-right bg-green-50 text-green-800 font-bold sticky top-[40px]" onClick={() => requestSort('rev')}>DOANH THU <SortIcon columnKey="rev"/></th>
                     <th className="p-3 w-28 text-right bg-green-50 text-slate-500 sticky top-[40px]">Tiền Gốc</th>
                     <th className="p-3 w-32 text-right bg-green-50 text-green-800 font-bold sticky top-[40px]" onClick={() => requestSort('profit')}>LỢI NHUẬN <SortIcon columnKey="profit"/></th>
                     <th className="p-3 w-20 text-center bg-green-50 text-purple-700 font-black border-r border-green-200 sticky top-[40px]">ROAS</th>
                     <th className="p-3 w-28 text-center bg-orange-50 sticky top-[40px]">Đánh giá</th>
                     <th className="p-3 w-28 text-center bg-orange-50 sticky top-[40px]">Hành động</th>
                     <th className="p-3 w-20 text-center bg-orange-50 sticky top-[40px]">Status</th>
                     <th className="p-3 w-16 text-center bg-orange-50 sticky top-[40px]">Xóa</th>
                  </tr>
               </thead>

               {/* --- SUMMARY ROW (STICKY TỔNG) --- */}
               {/* FIX: Tách ô TỔNG ra và ghim sticky */}
               <tbody className="bg-yellow-50 font-bold text-slate-800 border-b-2 border-yellow-200 sticky top-[82px] z-20 shadow-sm">
                  <tr>
                     {/* Sticky Label */}
                     <td className="p-3 sticky left-0 z-30 bg-yellow-100 border-r border-yellow-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center text-lg">📊</td>
                     {/* Spacing for non-calc columns */}
                     <td colSpan="7" className="p-3 text-right uppercase text-[10px] text-slate-500 tracking-wider">TỔNG HỢP ({filterCourse}):</td>
                     
                     {/* Metrics */}
                     <td className="p-3 text-right text-red-600">{fmt(summary.spend)}</td>
                     <td className="p-3 text-center">{fmt(summary.mess)}</td>
                     <td colSpan="2" className="p-3"></td>
                     <td colSpan="2" className="p-3"></td>
                     <td className="p-3 text-center text-green-600 text-sm">{fmt(summary.orders)}</td>
                     <td className="p-3 text-center">{(summary.spend > 0 ? ((summary.orders/summary.mess)*100).toFixed(1) : 0)}%</td>
                     <td className="p-3"></td>
                     <td className="p-3 text-right text-green-700 text-sm">{fmt(summary.rev)}</td>
                     <td className="p-3 text-right text-slate-500 text-xs">-{fmt(summary.cost)}</td>
                     <td className="p-3 text-right text-green-700 text-sm">{fmt(summary.profit)}</td>
                     <td className="p-3 text-center text-purple-700">{(summary.spend > 0 ? (summary.rev / summary.spend).toFixed(2) : 0)}x</td>
                     <td colSpan="4"></td>
                  </tr>
               </tbody>

               {/* --- DATA BODY --- */}
               <tbody className="divide-y divide-slate-200 bg-white">
                  {processedData.map((item) => (
                     <React.Fragment key={item.id}>
                        <tr className={`hover:bg-blue-50/30 transition-colors group ${expandedRow === item.id ? 'bg-blue-50/50' : ''}`}>
                           {/* Sticky Chevron */}
                           <td className="p-3 text-center cursor-pointer sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)] group-hover:bg-blue-50/30 transition-colors" onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>
                              {expandedRow === item.id ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-300"/>}
                           </td>
                           
                           <td className="p-3"><input type="date" className="bg-transparent outline-none w-full text-[10px] text-slate-500 focus:text-slate-800" value={item.date} onChange={(e) => handleUpdate(item.id, 'date', e.target.value)}/></td>
                           <td className="p-3 font-bold text-slate-500 text-center">{item.course}</td>
                           <td className="p-3"><input className="w-full bg-transparent outline-none font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1 transition-all" value={item.name} onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}/></td>
                           <td className="p-3"><input className="w-full bg-transparent outline-none text-slate-500 focus:text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1" value={item.headline} onChange={(e) => handleUpdate(item.id, 'headline', e.target.value)}/></td>
                           <td className="p-3 text-center"><select className="bg-transparent outline-none cursor-pointer text-[10px] w-full text-center" value={item.format} onChange={(e) => handleUpdate(item.id, 'format', e.target.value)}>{config.formats.map(f => <option key={f} value={f}>{f}</option>)}</select></td>
                           <td className="p-3 text-center text-blue-600 cursor-pointer"><LinkIcon size={14} className="mx-auto hover:text-blue-800" onClick={() => {if(item.link) window.open(item.link, '_blank')}}/></td>
                           <td className="p-3 text-right border-r border-slate-200"><input className="w-full text-right bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1" value={fmt(item.budget)} onChange={(e) => handleUpdate(item.id, 'budget', e.target.value)}/></td>
                           <td className="p-3 text-right font-medium bg-blue-50/10"><input className="w-full text-right bg-transparent outline-none font-bold text-blue-800 focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1" value={fmt(item.spend)} onChange={(e) => handleUpdate(item.id, 'spend', e.target.value)}/></td>
                           <td className="p-3 text-center font-bold bg-blue-50/10"><input className="w-full text-center bg-transparent outline-none text-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1" value={fmt(item.mess)} onChange={(e) => handleUpdate(item.id, 'mess', e.target.value)}/></td>
                           <td className="p-3 text-right text-slate-500 bg-blue-50/10">{fmt(item.cpm)}</td>
                           <td className="p-3 text-center text-slate-500 border-r border-blue-100">{item.rate}%</td>
                           <td className="p-3 text-center border-l border-slate-100"><input className="w-full text-center bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-green-200 rounded px-1" value={item.mong} onChange={(e) => handleUpdate(item.id, 'mong', e.target.value)}/></td>
                           <td className="p-3 text-center"><input className="w-full text-center bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-green-200 rounded px-1" value={item.thanh} onChange={(e) => handleUpdate(item.id, 'thanh', e.target.value)}/></td>
                           <td className="p-3 text-center font-bold text-slate-400">{item.total}</td>
                           <td className="p-3 text-center font-bold text-green-600">{item.rate}%</td>
                           <td className="p-3 text-right"><input className="w-full text-right bg-transparent outline-none text-slate-600 focus:bg-white focus:ring-1 focus:ring-green-200 rounded px-1" value={fmt(item.price)} onChange={(e) => handleUpdate(item.id, 'price', e.target.value)}/></td>
                           <td className="p-3 text-right font-bold text-green-700">{fmt(item.rev)}</td>
                           <td className="p-3 text-right text-slate-400"><input className="w-full text-right bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-slate-200 rounded px-1" value={fmt(item.cost)} onChange={(e) => handleUpdate(item.id, 'cost', e.target.value)}/></td>
                           <td className={`p-3 text-right font-bold ${item.profit > 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(item.profit)}</td>
                           <td className="p-3 text-center font-black border-r border-slate-200">{item.roas}x</td>
                           <td className="p-3 text-center"><select className={`bg-transparent text-[10px] font-bold outline-none cursor-pointer w-full text-center ${item.eval.includes('Tốt') ? 'text-green-600' : item.eval.includes('Lỗ') ? 'text-red-500' : 'text-slate-600'}`} value={item.eval} onChange={(e) => handleUpdate(item.id, 'eval', e.target.value)}>{config.evals.map(a => <option key={a} value={a}>{a}</option>)}</select></td>
                           <td className="p-3 text-center"><select className="bg-transparent text-[10px] font-bold outline-none cursor-pointer w-full text-center text-orange-600" value={item.action} onChange={(e) => handleUpdate(item.id, 'action', e.target.value)}>{config.actions.map(a => <option key={a} value={a}>{a}</option>)}</select></td>
                           <td className="p-3 text-center"><div className={`w-8 h-4 rounded-full relative cursor-pointer mx-auto transition-colors ${item.status === 'ON' ? 'bg-green-500' : 'bg-slate-300'}`} onClick={() => handleUpdate(item.id, 'status', item.status === 'ON' ? 'OFF' : 'ON')}><div className={`w-2 h-2 bg-white rounded-full absolute top-1 transition-all ${item.status === 'ON' ? 'left-5' : 'left-1'}`}></div></div></td>
                           <td className="p-3 text-center"><button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button></td>
                        </tr>
                        {expandedRow === item.id && (
                           <tr className="bg-slate-50 border-b border-slate-200">
                              <td className="sticky left-0 bg-slate-50 z-10 border-r border-slate-100"></td>
                              <td colSpan="25" className="p-4"><div className="flex gap-4"><div className="w-1/3"><div className="font-bold mb-1 text-xs text-slate-500 uppercase flex items-center gap-2">Link & Media</div><input className="w-full p-2 text-xs border rounded mb-2 bg-white" placeholder="Link Ads..." value={item.link} onChange={(e) => handleUpdate(item.id, 'link', e.target.value)}/><input className="w-full p-2 text-xs border rounded bg-white" placeholder="Link Embed..." value={item.media} onChange={(e) => handleUpdate(item.id, 'media', e.target.value)}/></div><div className="w-1/3"><div className="font-bold mb-1 text-xs text-slate-500 uppercase">Nội dung</div><textarea className="w-full h-24 p-2 text-xs border rounded resize-none bg-white break-words" value={item.content} onChange={(e) => handleUpdate(item.id, 'content', e.target.value)}/></div><div className="w-1/3"><div className="font-bold mb-1 text-xs text-slate-500 uppercase">Preview</div><div className="aspect-video bg-black rounded overflow-hidden flex items-center justify-center text-white text-xs">{item.media ? <iframe src={item.media} className="w-full h-full" title="preview"/> : "Chưa có media"}</div></div></div></td>
                           </tr>
                        )}
                     </React.Fragment>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}