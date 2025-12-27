import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Settings, 
  ChevronDown, ChevronRight, 
  Trash2, X, Undo, Redo,
  FileText, ExternalLink, Lock,
  Wallet, DollarSign, Clock, CheckCircle, Edit3, 
  Banknote, Coffee, Laptop, Gift, Box, Filter, Download
} from 'lucide-react';

// --- IMPORT FIREBASE & AUTH ---
import { db } from '../firebase';
import { ref, set, onValue } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';

export default function SpendingManager() {
  // --- 0. PHÂN QUYỀN ---
  const { userPermissions, userRole } = useAuth();
  const canView = userRole === 'ADMIN' || userPermissions?.spending?.view;
  const canEdit = userRole === 'ADMIN' || userPermissions?.spending?.edit;

  // --- MỚI: ĐỊNH NGHĨA LABEL TIẾNG VIỆT CHO DROPDOWN ---
  const STATUS_OPTS = [
      { value: "PENDING", label: "⏳ Chờ Duyệt" },
      { value: "APPROVED", label: "🔵 Đã Duyệt" },
      { value: "PAID", label: "💸 Đã Chi" },
      { value: "REJECTED", label: "⚪ Từ Chối" }
  ];

  // --- 1. CẤU HÌNH BAN ĐẦU ---
  const INITIAL_CONFIG = {
    categories: [
      "🏢 Chi Phí Cố Định", 
      "📢 Marketing & Ads", 
      "💻 Mua Sắm Thiết Bị", 
      "🛠️ Tool & Phần Mềm", 
      "🍕 Ăn Uống & Tiếp Khách", 
      "🎁 Thưởng & Phúc Lợi",
      "📦 Khác"
    ],
    approvers: ["Admin", "Manager A"], 
    payers: ["Thủ quỹ A", "Kế toán B"], 
    paymentMethods: ["💰 Tiền mặt", "🏦 Chuyển khoản", "💳 Thẻ Cty"],
    initialFund: 500000000 
  };

  // --- 2. STATE ---
  const [history, setHistory] = useState([{ data: [], config: INITIAL_CONFIG }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const currentState = history[historyIndex] || { data: [], config: INITIAL_CONFIG };
  const data = Array.isArray(currentState.data) ? currentState.data : [];
  const config = currentState.config || INITIAL_CONFIG;

  // Filters State (Nâng cấp)
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterStatus, setFilterStatus] = useState("ALL"); // MỚI: Lọc trạng thái
  const [filterCategory, setFilterCategory] = useState("ALL"); // MỚI: Lọc hạng mục
  const [searchQuery, setSearchQuery] = useState("");
  
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  
  // Modal Config State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempConfig, setTempConfig] = useState(INITIAL_CONFIG);

  const fmt = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);

  // --- 3. KẾT NỐI FIREBASE ---
  useEffect(() => {
    const dataRef = ref(db, 'spending_manager');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const cloudData = snapshot.val();
      if (cloudData) {
        const safeData = Array.isArray(cloudData.data) ? cloudData.data : [];
        const safeConfig = { ...INITIAL_CONFIG, ...cloudData.config };
        setHistory([{ data: safeData, config: safeConfig }]);
        setHistoryIndex(0);
        setTempConfig(safeConfig);
      }
    });
    return () => unsubscribe();
  }, []);

  const saveToCloud = (newData, newConfig) => {
    if (!canEdit) return;
    set(ref(db, 'spending_manager'), { data: newData, config: newConfig }).catch(console.error);
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

  const undo = () => { if (canEdit && historyIndex > 0) setHistoryIndex(historyIndex - 1); };
  const redo = () => { if (canEdit && historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1); };

  // --- 4. LOGIC XỬ LÝ ---

  // MỚI: Hàm kiểm tra hợp lệ (Validate)
  const validateExpense = (item) => {
    if (!item.title || item.title.trim() === "") {
        alert("⚠️ Vui lòng nhập nội dung chi (Tiêu đề)!");
        return false;
    }
    if (!item.amount || item.amount <= 0) {
        alert("⚠️ Số tiền chi phải lớn hơn 0!");
        return false;
    }
    return true;
  };

  const handleUpdate = (id, field, value) => {
    if (!canEdit) return;
    let rawValue = value;
    // Cho phép nhập rỗng để sửa, nhưng lưu vào state vẫn là chuỗi/số
    if (field === 'amount') {
        // Nếu input rỗng thì để rỗng, ngược lại parse số
        if (value === "") rawValue = "";
        else rawValue = parseInt(value.toString().replace(/\D/g, '')) || 0;
    }
    const updatedData = data.map(item => item.id === id ? { ...item, [field]: rawValue } : item);
    pushToHistory(updatedData, null);
  };

  // Logic chuyển trạng thái có Validation
  const handleStatusChange = (id, nextStatus) => {
    if (!canEdit) return;

    // Tìm item hiện tại để check validation trước khi duyệt
    const currentItem = data.find(i => i.id === id);
    if (!currentItem) return;

    // Nếu duyệt hoặc chi, bắt buộc phải validate
    if ((nextStatus === "APPROVED" || nextStatus === "PAID") && !validateExpense(currentItem)) {
        return; // Dừng lại nếu không hợp lệ
    }

    const updatedData = data.map(item => {
      if (item.id === id) {
        // Tự động gán người duyệt nếu chuyển sang Approved
        const approverUpdate = nextStatus === "APPROVED" ? "Admin" : item.approver;
        return { ...item, status: nextStatus, approver: approverUpdate };
      }
      return item;
    });
    pushToHistory(updatedData, null);
  };

  const handleAddExpense = () => {
    if (!canEdit) return;
    const newId = `EXP${Math.floor(Math.random() * 100000)}`;
    const today = new Date().toISOString().split('T')[0];
    const newItem = {
      id: newId, date: today, category: config.categories?.[0] || "Khác", 
      title: "", amount: "", // MỚI: Để trống mặc định thay vì 0
      requester: "Nhân viên", 
      approver: "", payer: "", paymentMethod: "",
      status: "PENDING", evidence: "", note: ""
    };
    pushToHistory([newItem, ...data], null);
    setExpandedRow(newId); // Mở ngay để nhập
  };
  
  const handleDelete = (id) => { 
    if (!canEdit) return;
    if(confirm("Xóa khoản chi này?")) pushToHistory(data.filter(i => i.id !== id), null);
  };

  const saveConfig = () => {
      pushToHistory(null, tempConfig);
      setShowConfigModal(false);
  };

  // --- 5. LOGIC FILTER & EXPORT ---
  const processedData = useMemo(() => {
    let result = data;
    // 1. Filter Month
    if (filterMonth) result = result.filter(item => item && item.date && item.date.startsWith(filterMonth));
    // 2. Filter Search
    if (searchQuery) result = result.filter(item => item && item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    // 3. Filter Status (Mới)
    if (filterStatus !== "ALL") result = result.filter(item => item.status === filterStatus);
    // 4. Filter Category (Mới)
    if (filterCategory !== "ALL") result = result.filter(item => item.category === filterCategory);
    
    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, filterMonth, searchQuery, sortConfig, filterStatus, filterCategory]);

  // MỚI: Export Excel (CSV)
  const exportToCSV = () => {
    if (processedData.length === 0) {
        alert("Không có dữ liệu để xuất!");
        return;
    }
    
    // Header
    const headers = ["ID", "Ngày", "Hạng mục", "Nội dung", "Số tiền", "Trạng thái", "Người đề xuất", "Người duyệt", "Thủ quỹ"];
    
    // Rows
    const rows = processedData.map(item => [
        item.id,
        item.date,
        `"${item.category}"`, // Quote để tránh lỗi dấu phẩy
        `"${item.title}"`,
        item.amount,
        STATUS_OPTS.find(s => s.value === item.status)?.label || item.status,
        item.requester,
        item.approver || "",
        item.payer || ""
    ]);

    // Combine with BOM (\uFEFF) for UTF-8 Tiếng Việt
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Chi_Tieu_${filterMonth}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 6. UI HELPERS ---
  const summary = useMemo(() => processedData.reduce((acc, item) => {
      if (!item) return acc;
      const amt = Number(item.amount) || 0;
      if (item.status === 'PAID') acc.paid += amt;
      if (item.status === 'PENDING') acc.pending += amt;
      return acc;
  }, { paid: 0, pending: 0 }), [processedData]);

  // Icon Mapper
  const getCategoryIcon = (catName) => {
      if (catName.includes("Ăn Uống")) return <Coffee size={14} className="text-orange-500"/>;
      if (catName.includes("Thiết Bị") || catName.includes("Tool")) return <Laptop size={14} className="text-blue-500"/>;
      if (catName.includes("Marketing")) return <DollarSign size={14} className="text-green-500"/>;
      if (catName.includes("Thưởng")) return <Gift size={14} className="text-pink-500"/>;
      if (catName.includes("Cố Định")) return <Banknote size={14} className="text-purple-500"/>;
      return <Box size={14} className="text-slate-400"/>;
  };

  const StatusBadge = ({ status }) => {
      const styles = {
          "PENDING": "bg-yellow-50 text-yellow-700 border-yellow-200",
          "APPROVED": "bg-blue-50 text-blue-700 border-blue-200",
          "PAID": "bg-green-50 text-green-700 border-green-200",
          "REJECTED": "bg-gray-100 text-gray-500 border-gray-200 line-through decoration-gray-400"
      };
      const label = STATUS_OPTS.find(s => s.value === status)?.label || status;
      return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center justify-center gap-1 w-fit mx-auto ${styles[status] || styles["PENDING"]}`}>
              {label}
          </span>
      );
  };

  const ActionButtons = ({ item }) => (
      <div className="flex items-center justify-center gap-2">
          {item.status === 'PENDING' && canEdit && (
              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(item.id, 'APPROVED'); }} title="Duyệt nhanh" className="p-1.5 rounded-md hover:bg-green-100 text-green-600 transition-colors"><CheckCircle size={16}/></button>
          )}
          {item.status === 'APPROVED' && canEdit && (
              <button onClick={(e) => { e.stopPropagation(); setExpandedRow(item.id); }} title="Thực chi" className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 transition-colors animate-pulse"><Wallet size={16}/></button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setExpandedRow(expandedRow === item.id ? null : item.id); }} title="Sửa chi tiết" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"><Edit3 size={16}/></button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} title="Xóa" className="p-1.5 rounded-md hover:bg-red-100 text-red-500 transition-colors"><Trash2 size={16}/></button>
      </div>
  );

  // MỚI: StatCard có Progress Bar
  const BudgetProgressCard = ({ totalPaid, initialFund }) => {
      const remaining = initialFund - totalPaid;
      const percentUsed = initialFund > 0 ? (totalPaid / initialFund) * 100 : 0;
      
      let barColor = "bg-green-500";
      if (percentUsed > 100) barColor = "bg-red-600";
      else if (percentUsed >= 80) barColor = "bg-yellow-500";

      return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Số Dư Quỹ (Thực tế)</p>
                    <h3 className={`text-2xl font-black font-mono ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(remaining)}</h3>
                </div>
                <div className="p-3 rounded-xl bg-green-50 text-green-600"><Wallet size={24} /></div>
            </div>
            
            {/* Thanh Progress */}
            <div className="w-full mt-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                    <span>Đã chi: {fmt(totalPaid)}</span>
                    <span>Quỹ: {fmt(initialFund)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(percentUsed, 100)}%` }}></div>
                </div>
                {percentUsed > 100 && <p className="text-[10px] text-red-500 font-bold mt-1 text-right">⚠️ Đã lố quỹ!</p>}
            </div>
        </div>
      );
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
              <h3 className={`text-2xl font-black font-mono ${colorClass}`}>{value}</h3>
          </div>
          <div className={`p-3 rounded-xl bg-slate-50 ${colorClass.replace('text-', 'text-opacity-80 text-')}`}><Icon size={24} /></div>
      </div>
  );

  if (!canView) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <Lock size={64} className="text-slate-200 mb-4" />
      <h2 className="text-xl font-bold text-slate-400">Bạn không có quyền xem Sổ Chi Tiêu</h2>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-6 font-sans animate-in fade-in duration-500 overflow-x-hidden">
      
      {/* 1. DASHBOARD HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
         <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Wallet className="text-red-500" size={28}/> QUẢN LÝ TÀI CHÍNH
            </h1>
            <p className="text-slate-500 text-sm mt-1">Hệ thống kiểm soát dòng tiền nội bộ</p>
         </div>
         {canEdit && (
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button onClick={undo} disabled={historyIndex === 0} className={`p-2 rounded hover:bg-slate-100 ${historyIndex === 0 ? 'text-slate-300' : 'text-slate-600'}`}><Undo size={18}/></button>
                <div className="w-px h-5 bg-slate-200 mx-1"></div>
                <button onClick={redo} disabled={historyIndex === history.length - 1} className={`p-2 rounded hover:bg-slate-100 ${historyIndex === history.length - 1 ? 'text-slate-300' : 'text-slate-600'}`}><Redo size={18}/></button>
            </div>
         )}
      </div>

      {/* 2. STAT CARDS + BUDGET PROGRESS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Tổng Chi (Đã Lọc)" value={fmt(summary.paid)} icon={DollarSign} colorClass="text-red-600" />
          <StatCard title="Đang Chờ Duyệt" value={fmt(summary.pending)} icon={Clock} colorClass="text-yellow-600" />
          {/* Card Số Dư Quỹ Mới có Progress Bar */}
          <BudgetProgressCard totalPaid={summary.paid} initialFund={config.initialFund || 500000000} />
      </div>

      {/* 3. TOOLBAR NÂNG CẤP */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6 items-start lg:items-center">
         {/* Filter Group */}
         <div className="flex flex-wrap gap-2 w-full lg:w-auto">
             <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center shadow-sm">
                 <span className="text-xs font-bold text-slate-400 mr-2 uppercase">Tháng:</span>
                 <input type="month" className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}/>
             </div>
             
             {/* Dropdown Filter Status */}
             <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center shadow-sm">
                 <Filter size={14} className="text-slate-400 mr-2"/>
                 <select className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer min-w-[100px]" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="ALL">Tất cả Trạng thái</option>
                    {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                 </select>
             </div>

             {/* Dropdown Filter Category */}
             <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-center shadow-sm">
                 <Box size={14} className="text-slate-400 mr-2"/>
                 <select className="text-sm font-bold text-slate-700 bg-transparent outline-none cursor-pointer max-w-[150px]" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="ALL">Tất cả Hạng mục</option>
                    {config.categories?.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
             </div>
         </div>

         {/* Search & Actions */}
         <div className="flex-1 w-full flex gap-3">
             <div className="relative flex-1 group">
                 <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none shadow-sm transition-all" placeholder="Tìm kiếm..."/>
                 <Search className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18}/>
             </div>
             
             {/* Nút Xuất Excel */}
             <button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-green-200 flex items-center gap-2 text-sm transition-all whitespace-nowrap">
                 <Download size={18}/> Xuất Excel
             </button>

             {canEdit && (
                 <button onClick={() => setShowConfigModal(true)} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-2.5 rounded-xl shadow-sm transition-all">
                     <Settings size={20}/>
                 </button>
             )}
             <button onClick={handleAddExpense} disabled={!canEdit} className={`bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-200 flex items-center gap-2 text-sm transition-all active:scale-95 whitespace-nowrap ${!canEdit && 'opacity-50 cursor-not-allowed'}`}>
                 <Plus size={18}/> Tạo Mới
             </button>
         </div>
      </div>

      {/* 4. MAIN TABLE */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-full flex flex-col h-[calc(100vh-380px)]">
         <div className="overflow-auto w-full flex-1 relative custom-scrollbar">
            <table className="min-w-max w-full text-left border-collapse text-xs whitespace-nowrap relative">
               <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                     <th className="p-4 w-12 text-center">#</th>
                     <th className="p-4 w-32 cursor-pointer hover:text-slate-700" onClick={() => setSortConfig({ key: 'date', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Ngày</th>
                     <th className="p-4 w-48">Hạng Mục</th>
                     <th className="p-4 min-w-[200px]">Nội Dung Chi</th>
                     <th className="p-4 w-40 text-right cursor-pointer hover:text-slate-700" onClick={() => setSortConfig({ key: 'amount', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Số Tiền</th>
                     <th className="p-4 w-32">Người Đề Xuất</th>
                     <th className="p-4 w-32 text-center">Trạng Thái</th>
                     <th className="p-4 w-32">Người Duyệt</th>
                     <th className="p-4 w-32 text-center sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)]">Hành động</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 bg-white">
                  {processedData.length === 0 ? (
                     <tr><td colSpan="9" className="p-12 text-center text-slate-400 italic">Không tìm thấy phiếu chi nào phù hợp bộ lọc.</td></tr>
                  ) : processedData.map((item) => (
                     <React.Fragment key={item.id}>
                        <tr className={`hover:bg-slate-50 transition-colors group cursor-pointer ${expandedRow === item.id ? 'bg-slate-50' : ''}`} onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>
                           <td className="p-4 text-center">{expandedRow === item.id ? <ChevronDown size={16} className="text-slate-400 mx-auto"/> : <ChevronRight size={16} className="text-slate-300 mx-auto"/>}</td>
                           <td className="p-4 font-mono text-slate-500">{item.date}</td>
                           <td className="p-4">
                               <div className="flex items-center gap-2 font-medium text-slate-700">
                                   {getCategoryIcon(item.category)}
                                   {item.category}
                               </div>
                           </td>
                           <td className="p-4 font-bold text-slate-800">{item.title || <span className="text-red-300 italic">Chưa nhập nội dung...</span>}</td>
                           <td className="p-4 text-right font-mono font-bold text-red-600 text-sm">{item.amount ? fmt(item.amount) : "-"}</td>
                           <td className="p-4 text-slate-600">{item.requester}</td>
                           <td className="p-4 text-center"><StatusBadge status={item.status} /></td>
                           <td className="p-4 text-slate-500 text-[11px] font-bold">{item.approver || "-"}</td>
                           <td className="p-4 text-center sticky right-0 bg-white group-hover:bg-slate-50 z-20 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)]" onClick={(e) => e.stopPropagation()}>
                               <ActionButtons item={item} />
                           </td>
                        </tr>
                        
                        {/* EXPANDED DETAIL ROW */}
                        {expandedRow === item.id && (
                           <tr className="bg-slate-50 border-b border-slate-200">
                              <td colSpan="9" className="p-6">
                                 <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-5xl mx-auto">
                                     
                                     {/* FORM INPUTS */}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                         <div className="space-y-4">
                                             <h4 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-2">Thông tin cơ bản</h4>
                                             <div className="grid grid-cols-2 gap-4">
                                                 <div><label className="block text-xs font-bold text-slate-500 mb-1">Ngày chi</label><input type="date" readOnly={!canEdit} className="w-full p-2 border rounded-lg text-sm bg-slate-50" value={item.date} onChange={(e) => handleUpdate(item.id, 'date', e.target.value)}/></div>
                                                 <div><label className="block text-xs font-bold text-slate-500 mb-1">Hạng mục</label><select disabled={!canEdit} className="w-full p-2 border rounded-lg text-sm bg-white" value={item.category} onChange={(e) => handleUpdate(item.id, 'category', e.target.value)}>{config.categories?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                             </div>
                                             <div><label className="block text-xs font-bold text-slate-500 mb-1">Tiêu đề / Nội dung <span className="text-red-500">*</span></label><input readOnly={!canEdit} className={`w-full p-2 border rounded-lg text-sm font-bold ${!item.title ? 'border-red-300 bg-red-50' : ''}`} placeholder="Nhập nội dung chi..." value={item.title} onChange={(e) => handleUpdate(item.id, 'title', e.target.value)}/></div>
                                             <div><label className="block text-xs font-bold text-slate-500 mb-1">Số tiền (VNĐ) <span className="text-red-500">*</span></label><input readOnly={!canEdit} className={`w-full p-2 border rounded-lg text-sm font-mono font-bold text-red-600 ${!item.amount ? 'border-red-300 bg-red-50' : ''}`} placeholder="0" value={item.amount ? fmt(item.amount) : ""} onChange={(e) => handleUpdate(item.id, 'amount', e.target.value)}/></div>
                                         </div>

                                         <div className="space-y-4">
                                             <h4 className="text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-2">Quy trình duyệt & Chi</h4>
                                             <div className="grid grid-cols-2 gap-4">
                                                 <div>
                                                     <label className="block text-xs font-bold text-slate-500 mb-1">Trạng thái</label>
                                                     <select 
                                                        disabled={!canEdit} 
                                                        className="w-full p-2 border rounded-lg text-sm font-bold text-blue-600 bg-blue-50" 
                                                        value={item.status} 
                                                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                                     >
                                                        {STATUS_OPTS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                     </select>
                                                 </div>
                                                 <div><label className="block text-xs font-bold text-slate-500 mb-1">Người duyệt</label><select disabled={!canEdit} className="w-full p-2 border rounded-lg text-sm bg-white" value={item.approver} onChange={(e) => handleUpdate(item.id, 'approver', e.target.value)}><option value="">-- Chọn --</option>{config.approvers?.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                                             </div>
                                             
                                             {(item.status === 'APPROVED' || item.status === 'PAID') && (
                                                 <div className="bg-green-50 p-3 rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2">
                                                     <div className="grid grid-cols-2 gap-4">
                                                         <div><label className="block text-xs font-bold text-green-700 mb-1">Người thực chi</label><select disabled={!canEdit} className="w-full p-2 border border-green-200 rounded-lg text-sm bg-white" value={item.payer} onChange={(e) => handleUpdate(item.id, 'payer', e.target.value)}><option value="">-- Chọn Thủ quỹ --</option>{config.payers?.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                                                         <div><label className="block text-xs font-bold text-green-700 mb-1">Phương thức</label><select disabled={!canEdit} className="w-full p-2 border border-green-200 rounded-lg text-sm bg-white" value={item.paymentMethod} onChange={(e) => handleUpdate(item.id, 'paymentMethod', e.target.value)}><option value="">-- Chọn --</option>{config.paymentMethods?.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                     </div>

                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         <div>
                                             <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-1"><FileText size={12}/> Link Chứng từ / Hóa đơn</label>
                                             <div className="flex gap-2"><input readOnly={!canEdit} className="flex-1 p-2 border rounded-lg text-xs" placeholder="Paste link ảnh/drive..." value={item.evidence} onChange={(e) => handleUpdate(item.id, 'evidence', e.target.value)}/>{item.evidence && <a href={item.evidence} target="_blank" className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"><ExternalLink size={16}/></a>}</div>
                                             {item.evidence && item.evidence.match(/\.(jpeg|jpg|png|webp)/) && <img src={item.evidence} alt="Bill" className="mt-2 w-full h-32 object-contain bg-slate-100 rounded border"/>}
                                         </div>
                                         <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ghi chú thêm</label>
                                             <textarea readOnly={!canEdit} className="w-full h-24 p-3 text-sm border rounded-lg resize-none" placeholder="Nhập ghi chú..." value={item.note} onChange={(e) => handleUpdate(item.id, 'note', e.target.value)}/>
                                         </div>
                                     </div>

                                 </div>
                              </td>
                           </tr>
                        )}
                     </React.Fragment>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* 5. MODAL CẤU HÌNH NHÂN SỰ */}
      {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings size={20}/> Cấu Hình Hệ Thống</h3>
                      <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                      
                      {/* Cấu hình Quỹ Đầu Kỳ */}
                      <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                          <label className="block text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
                             <Wallet size={16}/> Tổng Quỹ Đầu Kỳ (VNĐ)
                          </label>
                          <input 
                            type="text" 
                            className="w-full p-3 border border-green-200 rounded-xl text-lg font-mono font-bold text-green-700 focus:ring-2 focus:ring-green-500/20 outline-none"
                            value={fmt(tempConfig.initialFund)}
                            onChange={(e) => {
                                const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                setTempConfig({...tempConfig, initialFund: val});
                            }}
                          />
                          <p className="text-xs text-green-600 mt-2 italic">* Số tiền này dùng để tính % chi tiêu trên thanh Budget Bar.</p>
                      </div>

                      {/* Config Categories */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Danh sách Hạng mục Chi</label>
                          <textarea className="w-full p-3 border rounded-xl text-sm h-24 font-mono" value={tempConfig.categories.join('\n')} onChange={(e) => setTempConfig({...tempConfig, categories: e.target.value.split('\n')})}/>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-bold text-blue-700 mb-2">Danh sách Người Duyệt</label>
                              <textarea className="w-full p-3 border border-blue-200 bg-blue-50 rounded-xl text-sm h-32 font-mono" value={tempConfig.approvers.join('\n')} onChange={(e) => setTempConfig({...tempConfig, approvers: e.target.value.split('\n')})}/>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-green-700 mb-2">Danh sách Thủ Quỹ</label>
                              <textarea className="w-full p-3 border border-green-200 bg-green-50 rounded-xl text-sm h-32 font-mono" value={tempConfig.payers.join('\n')} onChange={(e) => setTempConfig({...tempConfig, payers: e.target.value.split('\n')})}/>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                      <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Hủy</button>
                      <button onClick={saveConfig} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 shadow-lg">Lưu Cấu Hình</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}