import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Search, X, 
  ChevronDown, ChevronRight, 
  Link as LinkIcon, Trash2, 
  BarChart3, Lock, PlayCircle, Image as ImageIcon,
  Facebook, ExternalLink,
  Copy, Edit3, CheckSquare,
  ArrowUpDown, ArrowUp, ArrowDown // Icon mới cho tính năng Sort
} from 'lucide-react';

// --- GIỮ NGUYÊN IMPORT GỐC CỦA BẠN ---
import { db } from '../firebase';
import { ref, set, onValue } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';

export default function AdsManager() {
  const { userPermissions, userRole } = useAuth();
  const canView = userRole === 'ADMIN' || userPermissions?.ads?.view;
  const canEdit = userRole === 'ADMIN' || userPermissions?.ads?.edit;

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
  
  const currentState = history[historyIndex] || INITIAL_STATE;
  const data = currentState.data || [];
  const config = currentState.config || INITIAL_STATE.config;

  // --- 2. KẾT NỐI FIREBASE (GIỮ NGUYÊN) ---
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
    if (!canEdit) return; 
    set(ref(db, 'ads_manager'), { data: newData, config: newConfig }).catch(console.error);
  };

  const pushToHistory = (newData, newConfig) => {
    if (!canEdit) return;
    const nextData = newData || data;
    const nextConfig = newConfig || config;
    const nextState = { data: nextData, config: nextConfig };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(nextState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    saveToCloud(nextData, nextConfig);
  };

  // --- STATE CỤC BỘ ---
  const [filterCourse, setFilterCourse] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);

  // --- STATE MỚI: SORTING ---
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // --- STATE MỚI CHO TÍNH NĂNG CONTEXT MENU & IMPORT ---
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, course: null });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('new'); // 'new' | 'import'
  const [importSearch, setImportSearch] = useState("");
  const [selectedImportIds, setSelectedImportIds] = useState([]);
  
  // Form tạo nhanh
  const [newAdForm, setNewAdForm] = useState({ name: "QC Mới", budget: 0, format: "Video" });

  const contextMenuRef = useRef(null);
  const fmt = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);

  // --- LOGIC MEDIA ---
  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes('facebook.com') || url.includes('fb.watch')) {
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&t=0`;
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.split('v=')[1] || url.split('/').pop();
        return `https://www.youtube.com/embed/${videoId}`;
    }
    return url; 
  };

  const isImage = (url) => {
      if (!url) return false;
      const lower = url.toLowerCase();
      if (lower.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)/)) return true;
      if ((lower.includes('fbcdn') || lower.includes('scontent')) && !lower.includes('video')) return true;
      return false;
  };

  // --- LOGIC MỚI: QUẢN LÝ TAB (CONTEXT MENU) ---
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
            setContextMenu({ ...contextMenu, visible: false });
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  const handleTabContextMenu = (e, course) => {
      e.preventDefault();
      if (!canEdit || course === "ALL") return;
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, course: course });
  };

  const handleAddCourse = () => {
    if (!canEdit) return;
    const val = prompt("Nhập tên khóa mới (VD: K38):");
    if (val && !config.courses.includes(val)) {
      pushToHistory(null, { ...config, courses: [...config.courses, val] });
      setFilterCourse(val);
    }
  };

  const handleRenameCourse = () => {
      const oldName = contextMenu.course;
      const newName = prompt(`Đổi tên khóa ${oldName} thành:`, oldName);
      if (newName && newName !== oldName) {
          const newCourses = config.courses.map(c => c === oldName ? newName : c);
          const updatedData = data.map(item => item.course === oldName ? { ...item, course: newName } : item);
          pushToHistory(updatedData, { ...config, courses: newCourses });
          if (filterCourse === oldName) setFilterCourse(newName);
      }
      setContextMenu({ ...contextMenu, visible: false });
  };

  const handleDeleteCourse = () => {
      const target = contextMenu.course;
      if (confirm(`⚠️ Bạn có chắc muốn xóa tab [${target}]?`)) {
          const newCourses = config.courses.filter(c => c !== target);
          pushToHistory(null, { ...config, courses: newCourses });
          if (filterCourse === target) setFilterCourse("ALL");
      }
      setContextMenu({ ...contextMenu, visible: false });
  };

  // --- LOGIC MỚI: IMPORT & CREATE MODAL ---
  const openModal = () => {
      if (!canEdit) return;
      if (filterCourse === "ALL") {
          alert("Vui lòng chọn một Khóa cụ thể (ví dụ: K38) để thêm quảng cáo!");
          return;
      }
      setNewAdForm({ name: "QC Mới", budget: 0, format: "Video" });
      setSelectedImportIds([]);
      setImportSearch("");
      setModalTab('new');
      setIsModalOpen(true);
  };

  const handleCreateNew = () => {
      const newId = `C${Math.floor(Math.random() * 10000)}`;
      const today = new Date().toISOString().split('T')[0];
      const newItem = {
        id: newId, 
        date: today, 
        course: filterCourse,
        name: newAdForm.name, 
        headline: "", 
        format: newAdForm.format, 
        link: "", media: "",
        budget: Number(newAdForm.budget), 
        spend: 0, mess: 0, mong: 0, thanh: 0, price: 3500000, cost: 0,
        action: "Chờ", status: "DRAFT", content: ""
      };
      pushToHistory([newItem, ...data], null);
      setIsModalOpen(false);
  };

  const handleExecuteImport = () => {
      if (selectedImportIds.length === 0) return;
      
      const today = new Date().toISOString().split('T')[0];
      const itemsToImport = data.filter(item => selectedImportIds.includes(item.id));
      
      const newImportedItems = itemsToImport.map(item => ({
          ...item,
          id: `C${Math.floor(Math.random() * 10000000)}`,
          course: filterCourse,
          date: today,
          spend: 0, mess: 0, mong: 0, thanh: 0, cost: 0,
          action: "Chờ", status: "DRAFT", eval: "🆕 New", manualEval: null
      }));

      pushToHistory([...newImportedItems, ...data], null);
      setIsModalOpen(false);
  };

  // --- LOGIC TÍNH TOÁN METRICS ---
  const calculateMetrics = (item) => {
    const totalOrders = (Number(item.mong) || 0) + (Number(item.thanh) || 0);
    const revenue = totalOrders * (Number(item.price) || 0);
    const cpm = item.mess > 0 ? Math.round(item.spend / item.mess) : 0;
    const rate = item.mess > 0 ? ((totalOrders / item.mess) * 100).toFixed(1) : 0;
    const profit = revenue - (Number(item.spend) || 0) - (Number(item.cost) || 0);
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
    if (!canEdit) return;
    let rawValue = value;
    const numericFields = ['budget', 'spend', 'mess', 'mong', 'thanh', 'price', 'cost'];
    if (numericFields.includes(field)) rawValue = parseInt(value.toString().replace(/\D/g, '')) || 0;

    const updatedData = data.map(item => {
      if (item.id === id) {
        if (field === 'eval') return { ...item, eval: rawValue, manualEval: rawValue };
        return { ...item, [field]: rawValue };
      }
      return item;
    });
    pushToHistory(updatedData, null);
  };

  const handleDelete = (id) => { 
    if (!canEdit) return;
    if(confirm("Xóa dòng này?")) pushToHistory(data.filter(i => i.id !== id), null); 
  };

  // --- XỬ LÝ SẮP XẾP (SORTING) ---
  const handleSort = (key) => {
      let direction = 'desc';
      if (sortConfig.key === key && sortConfig.direction === 'desc') {
          direction = 'asc';
      }
      setSortConfig({ key, direction });
  };

  const processedData = useMemo(() => {
    // 1. Tính toán
    let result = data.map(calculateMetrics);
    
    // 2. Lọc
    if (filterCourse !== "ALL") result = result.filter(item => item.course === filterCourse);
    if (searchQuery) result = result.filter(item => item.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    // 3. Sắp xếp (Sorting)
    if (sortConfig.key) {
        result.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Xử lý số và chuỗi
            if (typeof valA === 'string' && !isNaN(Date.parse(valA)) && sortConfig.key === 'date') {
                 // Sort ngày tháng
                 valA = new Date(valA).getTime();
                 valB = new Date(valB).getTime();
            } else if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
                 // Sort số
                 valA = Number(valA);
                 valB = Number(valB);
            } else {
                 // Sort text thường
                 valA = valA ? valA.toString().toLowerCase() : '';
                 valB = valB ? valB.toString().toLowerCase() : '';
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
  }, [data, filterCourse, searchQuery, sortConfig]);

  // --- TÍNH TOÁN HÀNG TỔNG (SUMMARY) ---
  const summary = useMemo(() => {
      if (processedData.length === 0) return null;

      const sum = processedData.reduce((acc, item) => {
          acc.budget += Number(item.budget) || 0;
          acc.spend += Number(item.spend) || 0;
          acc.mess += Number(item.mess) || 0;
          acc.mong += Number(item.mong) || 0;
          acc.thanh += Number(item.thanh) || 0;
          acc.orders += Number(item.orders) || 0;
          acc.rev += Number(item.rev) || 0;
          acc.cost += Number(item.cost) || 0;
          acc.profit += Number(item.profit) || 0;
          return acc;
      }, { budget: 0, spend: 0, mess: 0, mong: 0, thanh: 0, orders: 0, rev: 0, cost: 0, profit: 0 });

      // Tính lại các chỉ số trung bình (Recalculate)
      const avgCpm = sum.mess > 0 ? Math.round(sum.spend / sum.mess) : 0;
      const avgRate = sum.mess > 0 ? ((sum.orders / sum.mess) * 100).toFixed(1) : 0;
      const avgRoas = sum.spend > 0 ? (sum.rev / sum.spend).toFixed(2) : 0;
      const avgPrice = sum.orders > 0 ? Math.round(sum.rev / sum.orders) : 0;

      return { ...sum, avgCpm, avgRate, avgRoas, avgPrice };
  }, [processedData]);

  // Data cho Import Tab
  const importDataList = useMemo(() => {
      let result = data.map(calculateMetrics);
      if (importSearch) {
          result = result.filter(item => item.name?.toLowerCase().includes(importSearch.toLowerCase()));
      }
      return result.sort((a,b) => b.roas - a.roas);
  }, [data, importSearch]);

  // Helper render Header có Sort Icon
  const SortableHeader = ({ label, sortKey, align = 'left', className = '' }) => (
      <th 
        className={`p-3 cursor-pointer hover:bg-slate-700 transition-colors select-none ${className}`}
        onClick={() => handleSort(sortKey)}
        style={{ textAlign: align }}
      >
          <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
              {label}
              {sortConfig.key === sortKey ? (
                  sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-orange-400"/> : <ArrowDown size={12} className="text-orange-400"/>
              ) : (
                  <ArrowUpDown size={12} className="text-slate-500 opacity-0 group-hover/th:opacity-50"/>
              )}
          </div>
      </th>
  );

  if (!canView) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <Lock size={64} className="text-slate-200 mb-4" />
      <h2 className="text-xl font-bold text-slate-400">Bạn không có quyền xem bảng Ads.</h2>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-6 font-sans animate-in fade-in duration-500 overflow-x-hidden">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 w-full">
         <div className="flex items-center gap-4">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><BarChart3 size={24}/></div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 whitespace-nowrap">ADS MANAGER</h1>
            {!canEdit && <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-100 flex items-center gap-1"><Lock size={10}/> CHẾ ĐỘ XEM</span>}
         </div>

         <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto max-w-full">
            {config.courses.map(k => (
               <div 
                    key={k} 
                    onContextMenu={(e) => handleTabContextMenu(e, k)} 
                    className={`group relative flex items-center px-4 py-2 rounded-md cursor-pointer transition-all whitespace-nowrap select-none ${filterCourse === k ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`} 
                    onClick={() => setFilterCourse(k)}
               >
                  <span className="text-sm font-bold mr-1">{k === "ALL" ? "TỔNG HỢP" : k}</span>
               </div>
            ))}
            {canEdit && <button onClick={handleAddCourse} className="px-3 py-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg ml-1"><Plus size={16}/></button>}
         </div>
      </div>

      {/* CONTEXT MENU */}
      {contextMenu.visible && (
          <div ref={contextMenuRef} className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 py-1 w-40 animate-in fade-in zoom-in-95 duration-100" style={{ top: contextMenu.y, left: contextMenu.x }}>
              <div className="px-3 py-2 text-xs font-bold text-slate-400 border-b border-slate-100 mb-1 uppercase">Tab: {contextMenu.course}</div>
              <button onClick={handleRenameCourse} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"><Edit3 size={14}/> Đổi tên</button>
              <button onClick={handleDeleteCourse} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Xóa Tab</button>
          </div>
      )}

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 w-full">
         <div className="relative flex-1 group">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none shadow-sm" placeholder="Tìm kiếm chiến dịch..."/>
            <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16}/>
         </div>
         <button onClick={openModal} disabled={!canEdit} className={`bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold shadow flex items-center gap-2 text-sm transition-all ${!canEdit ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-orange-700'}`}><Plus size={18}/> Thêm QC</button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-300 w-full overflow-hidden flex flex-col h-[calc(100vh-220px)]">
         <div className="overflow-auto w-full flex-1 relative custom-scrollbar">
            <table className="min-w-max w-full text-left border-collapse text-xs whitespace-nowrap relative">
               <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold sticky top-0 z-30 shadow-md">
                  <tr>
                     <th className="p-3 w-12 text-center sticky left-0 top-0 z-40 bg-slate-800 border-r border-slate-700">#</th>
                     <th colSpan="7" className="p-3 border-r border-slate-600 text-center bg-slate-900">THÔNG TIN</th>
                     <th colSpan="4" className="p-3 border-r border-slate-600 text-center bg-blue-900">QUẢNG CÁO</th>
                     <th colSpan="9" className="p-3 border-r border-slate-600 text-center bg-green-900">KINH DOANH</th>
                     <th colSpan="4" className="p-3 text-center bg-orange-900">TRẠNG THÁI</th>
                  </tr>
                  <tr className="bg-slate-100 text-slate-600 border-b-2 border-slate-300">
                     <th className="p-3 sticky left-0 top-[40px] z-40 bg-slate-100 border-r border-slate-200"></th>
                     
                     {/* UPDATE: Header có thể Sort */}
                     <SortableHeader label="Ngày" sortKey="date" className="w-28 sticky top-[40px] bg-slate-100 group/th"/>
                     <SortableHeader label="Khóa" sortKey="course" align="center" className="w-24 sticky top-[40px] bg-slate-100 group/th"/>
                     <SortableHeader label="Tên Bài" sortKey="name" className="min-w-[200px] sticky top-[40px] bg-slate-100 group/th"/>
                     
                     <th className="p-3 min-w-[150px] sticky top-[40px] bg-slate-100">Tiêu đề</th>
                     <th className="p-3 w-28 text-center sticky top-[40px] bg-slate-100">Định dạng</th>
                     <th className="p-3 w-20 text-center sticky top-[40px] bg-slate-100">Link</th>

                     <SortableHeader label="Ngân sách" sortKey="budget" align="right" className="w-32 border-r border-slate-300 sticky top-[40px] bg-slate-100 group/th"/>
                     
                     <SortableHeader label="Tiền Tiêu" sortKey="spend" align="right" className="w-32 bg-blue-50 text-blue-800 sticky top-[40px] group/th"/>
                     <SortableHeader label="Mess" sortKey="mess" align="center" className="w-20 bg-blue-50 text-blue-800 sticky top-[40px] group/th"/>
                     <SortableHeader label="Giá Mess" sortKey="cpm" align="right" className="w-28 bg-blue-50 text-blue-800 sticky top-[40px] group/th"/>
                     <SortableHeader label="Rate" sortKey="rate" align="center" className="w-20 bg-blue-50 text-blue-800 border-r border-blue-200 sticky top-[40px] group/th"/>

                     <SortableHeader label="Mong 🔥" sortKey="mong" align="center" className="w-20 bg-green-50 sticky top-[40px] group/th"/>
                     <SortableHeader label="Thành 💧" sortKey="thanh" align="center" className="w-20 bg-green-50 sticky top-[40px] group/th"/>
                     <SortableHeader label="TỔNG" sortKey="orders" align="center" className="w-20 bg-green-50 sticky top-[40px] group/th"/>
                     <SortableHeader label="% Chốt" sortKey="rate" align="center" className="w-20 bg-green-50 sticky top-[40px] group/th"/>
                     
                     <SortableHeader label="Giá Bán" sortKey="price" align="right" className="w-28 bg-green-50 sticky top-[40px] group/th"/>
                     <SortableHeader label="DOANH THU" sortKey="rev" align="right" className="w-32 bg-green-50 text-green-800 font-bold sticky top-[40px] group/th"/>
                     <SortableHeader label="Tiền Gốc" sortKey="cost" align="right" className="w-28 bg-green-50 sticky top-[40px] group/th"/>
                     <SortableHeader label="LỢI NHUẬN" sortKey="profit" align="right" className="w-32 bg-green-50 text-green-800 font-bold sticky top-[40px] group/th"/>
                     <SortableHeader label="ROAS" sortKey="roas" align="center" className="w-20 bg-green-50 text-purple-700 font-black border-r border-green-200 sticky top-[40px] group/th"/>
                     
                     <th className="p-3 w-28 text-center bg-orange-50 sticky top-[40px]">Đánh giá</th>
                     <th className="p-3 w-28 text-center bg-orange-50 sticky top-[40px]">Hành động</th>
                     <th className="p-3 w-20 text-center bg-orange-50 sticky top-[40px]">Status</th>
                     <th className="p-3 w-16 text-center bg-orange-50 sticky top-[40px]">Xóa</th>
                  </tr>
               </thead>

               <tbody className="divide-y divide-slate-200 bg-white">
                  {processedData.map((item) => (
                     <React.Fragment key={item.id}>
                        <tr className="hover:bg-blue-50/30 group">
                           <td className="p-3 text-center cursor-pointer sticky left-0 bg-white z-10 border-r border-slate-100" onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>
                              {expandedRow === item.id ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                           </td>
                           <td className="p-3"><input type="date" readOnly={!canEdit} className="bg-transparent outline-none w-full" value={item.date} onChange={(e) => handleUpdate(item.id, 'date', e.target.value)}/></td>
                           <td className="p-3 text-center font-bold text-slate-500">{item.course}</td>
                           <td className="p-3"><input readOnly={!canEdit} className="w-full bg-transparent outline-none font-bold text-slate-700" value={item.name} onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}/></td>
                           <td className="p-3"><input readOnly={!canEdit} className="w-full bg-transparent outline-none text-slate-500" value={item.headline} onChange={(e) => handleUpdate(item.id, 'headline', e.target.value)}/></td>
                           <td className="p-3 text-center"><select disabled={!canEdit} className="bg-transparent outline-none cursor-pointer" value={item.format} onChange={(e) => handleUpdate(item.id, 'format', e.target.value)}>{config.formats.map(f => <option key={f} value={f}>{f}</option>)}</select></td>
                           <td className="p-3 text-center text-blue-600">{item.link ? (<a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500"><Facebook size={14} className="mx-auto"/></a>) : (<span className="text-slate-300">-</span>)}</td>
                           <td className="p-3 text-right"><input readOnly={!canEdit} className="w-full text-right bg-transparent outline-none" value={fmt(item.budget)} onChange={(e) => handleUpdate(item.id, 'budget', e.target.value)}/></td>
                           <td className="p-3 text-right font-medium bg-blue-50/10 text-blue-800"><input readOnly={!canEdit} className="w-full text-right bg-transparent outline-none font-bold" value={fmt(item.spend)} onChange={(e) => handleUpdate(item.id, 'spend', e.target.value)}/></td>
                           <td className="p-3 text-center font-bold bg-blue-50/10 text-blue-600"><input readOnly={!canEdit} className="w-full text-center bg-transparent outline-none" value={fmt(item.mess)} onChange={(e) => handleUpdate(item.id, 'mess', e.target.value)}/></td>
                           <td className="p-3 text-right text-slate-500 bg-blue-50/10">{fmt(item.cpm)}</td>
                           <td className="p-3 text-center text-slate-500 border-r border-blue-100">{item.rate}%</td>
                           <td className="p-3 text-center"><input readOnly={!canEdit} className="w-full text-center bg-transparent outline-none" value={item.mong} onChange={(e) => handleUpdate(item.id, 'mong', e.target.value)}/></td>
                           <td className="p-3 text-center"><input readOnly={!canEdit} className="w-full text-center bg-transparent outline-none" value={item.thanh} onChange={(e) => handleUpdate(item.id, 'thanh', e.target.value)}/></td>
                           <td className="p-3 text-center font-bold text-slate-400">{item.orders}</td>
                           <td className="p-3 text-center font-bold text-green-600">{item.rate}%</td>
                           <td className="p-3 text-right"><input readOnly={!canEdit} className="w-full text-right bg-transparent outline-none text-slate-600" value={fmt(item.price)} onChange={(e) => handleUpdate(item.id, 'price', e.target.value)}/></td>
                           <td className="p-3 text-right font-bold text-green-700">{fmt(item.rev)}</td>
                           <td className="p-3 text-right text-slate-400"><input readOnly={!canEdit} className="w-full text-right bg-transparent outline-none" value={fmt(item.cost)} onChange={(e) => handleUpdate(item.id, 'cost', e.target.value)}/></td>
                           <td className={`p-3 text-right font-bold ${item.profit > 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(item.profit)}</td>
                           <td className="p-3 text-center font-black border-r border-slate-200">{item.roas}x</td>
                           <td className="p-3 text-center"><select disabled={!canEdit} className="bg-transparent text-[10px] font-bold" value={item.eval} onChange={(e) => handleUpdate(item.id, 'eval', e.target.value)}>{config.evals.map(a => <option key={a} value={a}>{a}</option>)}</select></td>
                           <td className="p-3 text-center"><select disabled={!canEdit} className="bg-transparent text-[10px] font-bold text-orange-600" value={item.action} onChange={(e) => handleUpdate(item.id, 'action', e.target.value)}>{config.actions.map(a => <option key={a} value={a}>{a}</option>)}</select></td>
                           <td className="p-3 text-center"><div className={`w-8 h-4 rounded-full relative transition-colors ${canEdit ? 'cursor-pointer' : 'cursor-default'} ${item.status === 'ON' ? 'bg-green-500' : 'bg-slate-300'}`} onClick={() => canEdit && handleUpdate(item.id, 'status', item.status === 'ON' ? 'OFF' : 'ON')}><div className={`w-2 h-2 bg-white rounded-full absolute top-1 transition-all ${item.status === 'ON' ? 'left-5' : 'left-1'}`}></div></div></td>
                           <td className="p-3 text-center"><button disabled={!canEdit} onClick={() => handleDelete(item.id)} className={`transition-colors ${canEdit ? 'text-slate-300 hover:text-red-500' : 'text-slate-50'}`}><Trash2 size={14}/></button></td>
                        </tr>
                        
                        {expandedRow === item.id && (
                           <tr className="bg-slate-50 border-b border-slate-200 animate-in fade-in slide-in-from-top-2">
                              <td className="sticky left-0 bg-slate-50 z-10 border-r border-slate-100"></td>
                              <td colSpan="25" className="p-6 bg-slate-50">
                                 <div className="flex gap-6 items-start">
                                    <div className="shrink-0 flex flex-col gap-2">
                                       <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><ImageIcon size={10}/> Preview (Mobile)</div>
                                       <div className="w-[250px] h-[450px] bg-black rounded-2xl border-4 border-slate-300 overflow-hidden flex items-center justify-center relative shadow-2xl">
                                          {item.media ? (
                                             isImage(item.media) ? (<img src={item.media} alt="Preview" className="w-full h-full object-contain"/>) : (<iframe src={getEmbedUrl(item.media)} className="w-full h-full border-none" allowFullScreen title="Preview" scrolling="no"/>)
                                          ) : (<div className="text-center text-slate-500"><PlayCircle size={32} className="mx-auto mb-2 opacity-50"/><span className="text-xs">Chưa có media</span></div>)}
                                       </div>
                                    </div>
                                    <div className="flex-1 flex flex-col gap-4 h-[450px]">
                                       <div className="grid grid-cols-2 gap-4">
                                           <div className="space-y-3">
                                               <div>
                                                  <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-slate-400 uppercase"><Facebook size={10}/> Link Bài Viết</div>
                                                  <div className="flex gap-1"><input readOnly={!canEdit} className="flex-1 p-2 text-xs border rounded bg-white outline-none focus:ring-1 focus:ring-blue-400" placeholder="Link FB..." value={item.link} onChange={(e) => handleUpdate(item.id, 'link', e.target.value)}/>{item.link && <a href={item.link} target="_blank" className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"><ExternalLink size={14}/></a>}</div>
                                               </div>
                                               <div>
                                                  <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-slate-400 uppercase"><PlayCircle size={10}/> Link Media</div>
                                                  <input readOnly={!canEdit} className="w-full p-2 text-xs border rounded bg-white outline-none focus:ring-1 focus:ring-orange-400" placeholder="Link video/ảnh..." value={item.media} onChange={(e) => handleUpdate(item.id, 'media', e.target.value)}/>
                                               </div>
                                           </div>
                                           <div><div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tiêu đề</div><textarea readOnly={!canEdit} className="w-full p-2 text-xs border rounded bg-white font-bold text-slate-700 h-24 resize-none" placeholder="Tiêu đề..." value={item.headline} onChange={(e) => handleUpdate(item.id, 'headline', e.target.value)}/></div>
                                       </div>
                                       <div className="flex-1 flex flex-col"><div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nội dung Content</div><textarea readOnly={!canEdit} className="w-full flex-1 p-3 text-xs border rounded bg-white resize-none outline-none leading-relaxed" placeholder="Nội dung..." value={item.content} onChange={(e) => handleUpdate(item.id, 'content', e.target.value)}/></div>
                                    </div>
                                 </div>
                              </td>
                           </tr>
                        )}
                     </React.Fragment>
                  ))}
               </tbody>

               {/* --- UPDATE: STICKY FOOTER TỔNG KẾT --- */}
               {summary && (
                   <tfoot className="sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                       <tr className="bg-yellow-100 text-slate-900 font-bold border-t-2 border-slate-400 text-xs">
                           <td className="p-3 text-center border-r border-slate-300 sticky left-0 bg-yellow-100">SUM</td>
                           <td colSpan="6" className="p-3 text-right uppercase tracking-wider text-slate-500">Tổng Kết Chiến Dịch</td>
                           
                           <td className="p-3 text-right">{fmt(summary.budget)}</td>
                           
                           {/* Nhóm Tiền Tiêu */}
                           <td className="p-3 text-right text-blue-800">{fmt(summary.spend)}</td>
                           <td className="p-3 text-center text-blue-800">{fmt(summary.mess)}</td>
                           <td className="p-3 text-right text-blue-800">{fmt(summary.avgCpm)}</td>
                           <td className="p-3 text-center text-blue-800 border-r border-blue-300">{summary.avgRate}%</td>

                           {/* Nhóm Đơn Hàng */}
                           <td className="p-3 text-center">{summary.mong}</td>
                           <td className="p-3 text-center">{summary.thanh}</td>
                           <td className="p-3 text-center text-red-600 text-sm">{summary.orders}</td>
                           <td className="p-3 text-center text-green-700">{summary.avgRate}%</td>

                           {/* Nhóm Doanh Thu & Lợi Nhuận */}
                           <td className="p-3 text-right">{fmt(summary.avgPrice)}</td>
                           <td className="p-3 text-right text-green-800 text-sm">{fmt(summary.rev)}</td>
                           <td className="p-3 text-right text-slate-500">{fmt(summary.cost)}</td>
                           <td className={`p-3 text-right text-sm ${summary.profit > 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(summary.profit)}</td>
                           
                           <td className="p-3 text-center text-purple-800 border-r border-slate-300">{summary.avgRoas}x</td>
                           <td colSpan="4" className="bg-yellow-50"></td>
                       </tr>
                   </tfoot>
               )}
            </table>
         </div>
      </div>

      {/* --- IMPORT MODAL (GIỮ NGUYÊN) --- */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <div><h2 className="text-xl font-bold text-slate-800">Thêm Quảng Cáo Vào {filterCourse}</h2><p className="text-slate-500 text-sm">Tạo mới hoặc tái sử dụng quảng cáo cũ hiệu quả</p></div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="flex border-b border-slate-200 px-6">
                      <button onClick={() => setModalTab('new')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'new' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>✨ Tạo mới tinh</button>
                      <button onClick={() => setModalTab('import')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'import' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>♻️ Chọn từ lịch sử</button>
                  </div>
                  <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
                      {modalTab === 'new' && (
                          <div className="max-w-md mx-auto space-y-4 pt-4">
                              <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên bài quảng cáo</label><input autoFocus className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-400 font-medium" value={newAdForm.name} onChange={e => setNewAdForm({...newAdForm, name: e.target.value})}/></div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngân sách dự kiến</label><input type="number" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-400" value={newAdForm.budget} onChange={e => setNewAdForm({...newAdForm, budget: e.target.value})}/></div>
                                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Định dạng</label><select className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-400 bg-white" value={newAdForm.format} onChange={e => setNewAdForm({...newAdForm, format: e.target.value})}>{config.formats.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                              </div>
                              <button onClick={handleCreateNew} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-200 transition-all mt-4">Tạo Quảng Cáo</button>
                          </div>
                      )}
                      {modalTab === 'import' && (
                          <div className="space-y-4">
                              <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-400" placeholder="Tìm theo tên bài cũ..." value={importSearch} onChange={e => setImportSearch(e.target.value)}/></div></div>
                              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar">
                                  <table className="w-full text-left text-sm">
                                      <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10">
                                          <tr><th className="p-3 w-10 text-center"><input type="checkbox" className="w-4 h-4 rounded cursor-pointer" onChange={() => { if (selectedImportIds.length === importDataList.length) setSelectedImportIds([]); else setSelectedImportIds(importDataList.map(i => i.id)); }} checked={selectedImportIds.length > 0 && selectedImportIds.length === importDataList.length}/></th><th className="p-3">Khóa cũ</th><th className="p-3">Tên bài</th><th className="p-3 text-center">Định dạng</th><th className="p-3 text-center">Hiệu quả cũ (ROAS)</th><th className="p-3 text-right">Giá Mess cũ</th></tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {importDataList.map(item => (
                                              <tr key={item.id} className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedImportIds.includes(item.id) ? 'bg-blue-50/60' : ''}`} onClick={() => { if (selectedImportIds.includes(item.id)) setSelectedImportIds(selectedImportIds.filter(i => i !== item.id)); else setSelectedImportIds([...selectedImportIds, item.id]); }}>
                                                  <td className="p-3 text-center"><input type="checkbox" checked={selectedImportIds.includes(item.id)} onChange={() => {}} className="w-4 h-4 rounded cursor-pointer pointer-events-none"/></td>
                                                  <td className="p-3 text-slate-500 font-medium">{item.course}</td><td className="p-3 font-bold text-slate-700">{item.name}</td><td className="p-3 text-center text-xs bg-slate-100 rounded-full px-2 py-1 w-fit mx-auto">{item.format}</td><td className={`p-3 text-center font-bold ${item.roas >= 2.5 ? 'text-green-600' : 'text-slate-400'}`}>{item.roas}x</td><td className="p-3 text-right text-slate-500">{fmt(item.cpm)}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                              <div className="flex justify-between items-center pt-2"><span className="text-sm font-medium text-slate-600">Đã chọn: <b className="text-blue-600">{selectedImportIds.length}</b> bài</span><button onClick={handleExecuteImport} disabled={selectedImportIds.length === 0} className={`px-6 py-2.5 rounded-xl font-bold text-white shadow transition-all flex items-center gap-2 ${selectedImportIds.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'}`}><Copy size={16}/> Import vào {filterCourse}</button></div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}