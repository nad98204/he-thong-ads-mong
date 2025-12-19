import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Settings, 
  ChevronDown, ChevronRight, 
  Trash2, X, Undo, Redo,
  FileText, ExternalLink, Cloud
} from 'lucide-react';

// --- IMPORT FIREBASE ---
import { db } from '../firebase';
import { ref, set, onValue } from "firebase/database";

export default function SpendingManager() {
  // --- 1. CẤU HÌNH ---
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
    statuses: ["PENDING", "APPROVED", "PAID", "REJECTED"]
  };

  // [FIX] XÓA DỮ LIỆU MẪU - ĐỂ MẢNG RỖNG
  const DEFAULT_DATA = [];

  // --- 2. STATE ---
  const [history, setHistory] = useState([{ data: [], config: INITIAL_CONFIG }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const currentState = history[historyIndex] || { data: [], config: INITIAL_CONFIG };
  const data = Array.isArray(currentState.data) ? currentState.data : [];
  const config = currentState.config || INITIAL_CONFIG;

  const [filterMonth, setFilterMonth] = useState("2025-12");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [showConfigModal, setShowConfigModal] = useState(false);

  const fmt = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);

  // --- 3. KẾT NỐI FIREBASE ---
  useEffect(() => {
    const dataRef = ref(db, 'spending_manager');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const cloudData = snapshot.val();
      if (cloudData) {
        // [FIX] Nếu có data trên mây thì lấy, không thì lấy mảng rỗng []
        const safeData = Array.isArray(cloudData.data) ? cloudData.data : [];
        const safeConfig = cloudData.config || INITIAL_CONFIG;
        
        setHistory([{ data: safeData, config: safeConfig }]);
        setHistoryIndex(0);
      } else {
        // Nếu trên mây chưa có gì, khởi tạo rỗng
        setHistory([{ data: [], config: INITIAL_CONFIG }]);
      }
    });
    return () => unsubscribe();
  }, []);

  const saveToCloud = (newData, newConfig) => {
    set(ref(db, 'spending_manager'), { 
      data: newData, 
      config: newConfig 
    }).catch(err => console.error("Lỗi lưu chi tiêu:", err));
  };

  // --- 4. ENGINE ---
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

  // --- 5. LOGIC ---
  const handleUpdate = (id, field, value) => {
    let rawValue = value;
    if (field === 'amount') rawValue = parseInt(value.replace(/\D/g, '')) || 0;
    const updatedData = data.map(item => item.id === id ? { ...item, [field]: rawValue } : item);
    pushToHistory(updatedData, null);
  };

  const handleStatusClick = (id, currentStatus) => {
    const statusFlow = {
      "PENDING": "APPROVED",
      "APPROVED": "PAID",
      "PAID": "REJECTED",
      "REJECTED": "PENDING"
    };
    const nextStatus = statusFlow[currentStatus] || "PENDING";
    const updatedData = data.map(item => 
      item.id === id ? { ...item, status: nextStatus, approver: nextStatus === "APPROVED" ? "Admin" : item.approver } : item
    );
    pushToHistory(updatedData, null);
  };

  const handleAddExpense = () => {
    const newId = `EXP${Math.floor(Math.random() * 100000)}`;
    const today = new Date().toISOString().split('T')[0];
    const newItem = {
      id: newId, 
      date: today, 
      category: config.categories?.[0] || "Khác", 
      title: "Chi mới...", 
      amount: 0, 
      requester: "Nhân viên", 
      approver: "", 
      status: "PENDING", 
      evidence: "", 
      note: ""
    };
    pushToHistory([newItem, ...data], null);
  };
  
  const handleDelete = (id) => { 
      if(confirm("Xóa khoản chi này?")) {
          const newData = data.filter(i => i.id !== id);
          pushToHistory(newData, null); 
      }
  };

  // --- 6. RENDER ---
  const processedData = useMemo(() => {
    let result = data;
    if (filterMonth) result = result.filter(item => item && item.date && item.date.startsWith(filterMonth));
    if (searchQuery) result = result.filter(item => item && item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (!a || !b) return 0;
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, filterMonth, searchQuery, sortConfig]);

  const summary = useMemo(() => processedData.reduce((acc, item) => {
      if (!item) return acc;
      if (item.status === 'PAID') acc.paid += (item.amount || 0);
      if (item.status === 'PENDING') acc.pending += (item.amount || 0);
      return acc;
  }, { paid: 0, pending: 0 }), [processedData]);

  const requestSort = (key) => { setSortConfig({ key, direction: (sortConfig.key === key && sortConfig.direction === 'ascending') ? 'descending' : 'ascending' }); };
  const SortIcon = ({ columnKey }) => sortConfig.key === columnKey ? (sortConfig.direction === 'ascending' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null;

  // --- COMPONENT CON ---
  const StatusButton = ({ status, onClick }) => {
    const configs = {
      "PENDING": { label: "⏳ Chờ Duyệt", color: "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200" },
      "APPROVED": { label: "🔵 Đã Duyệt", color: "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200" },
      "PAID": { label: "💸 Đã Chi", color: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200" },
      "REJECTED": { label: "🔴 Từ Chối", color: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200" }
    };
    const cfg = configs[status] || configs["PENDING"];
    return <button onClick={onClick} className={`w-full py-1.5 px-3 rounded-lg font-bold text-xs border shadow-sm transition-all transform active:scale-95 ${cfg.color}`}>{cfg.label}</button>;
  };

  const ConfigModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-[500px] p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
           <h2 className="text-lg font-bold flex items-center gap-2"><Settings className="text-slate-600"/> Cấu Hình Hạng Mục</h2>
           <button onClick={() => setShowConfigModal(false)}><X size={20}/></button>
        </div>
        <div className="space-y-4">
           <div>
              <h3 className="font-bold text-sm mb-2 text-slate-600">Danh mục Chi tiêu</h3>
              <div className="flex gap-2 mb-2">
                 <input id="newCat" className="border rounded px-2 py-1 text-sm flex-1" placeholder="Ví dụ: Thuế, Phí ngân hàng..." />
                 <button onClick={() => { const val = document.getElementById('newCat').value; if(val) { pushToHistory(null, { ...config, categories: [...config.categories, val] }); document.getElementById('newCat').value = ''; }}} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">Thêm</button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                 {config.categories?.map(c => (
                    <span key={c} className="bg-slate-100 px-2 py-1 rounded text-xs border flex items-center gap-1">
                       {c} <X size={10} className="cursor-pointer hover:text-red-500" onClick={() => pushToHistory(null, { ...config, categories: config.categories.filter(i => i !== c) })}/>
                    </span>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-6 font-sans animate-in fade-in duration-500 overflow-x-hidden">
      {showConfigModal && <ConfigModal />}

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-800"><span className="text-slate-600">QUẢN LÝ CHI TIÊU</span></h1>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button onClick={undo} disabled={historyIndex === 0} className={`p-1.5 rounded ${historyIndex === 0 ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}`}><Undo size={16}/></button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button onClick={redo} disabled={historyIndex === history.length - 1} className={`p-1.5 rounded ${historyIndex === history.length - 1 ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}`}><Redo size={16}/></button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-200">
               <Cloud size={14}/> Cloud Sync
            </div>
         </div>
         <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-lg border shadow-sm text-right"><span className="text-[10px] font-bold text-slate-400 uppercase block">Thực Chi</span><span className="text-lg font-black text-green-600">{fmt(summary.paid)}</span></div>
            <div className="bg-white px-4 py-2 rounded-lg border shadow-sm text-right"><span className="text-[10px] font-bold text-slate-400 uppercase block">Chờ Duyệt</span><span className="text-lg font-black text-yellow-600">{fmt(summary.pending)}</span></div>
         </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex gap-2 mb-4">
         <div className="bg-white border rounded-lg px-3 flex items-center"><span className="text-xs font-bold text-slate-500 mr-2">Tháng:</span><input type="month" className="text-sm font-bold text-slate-700 bg-transparent outline-none py-2 cursor-pointer" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}/></div>
         <div className="relative flex-1"><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-slate-500 outline-none" placeholder="Tìm kiếm..."/><Search className="absolute left-3 top-3 text-slate-400" size={16}/></div>
         <button onClick={() => setShowConfigModal(true)} className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2 text-sm"><Settings size={16}/> Hạng mục</button>
         <button onClick={handleAddExpense} className="bg-slate-800 text-white px-4 py-2.5 rounded-lg font-bold shadow flex items-center gap-2 text-sm"><Plus size={18}/> Tạo Phiếu Chi</button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden w-full">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap table-fixed">
               <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold">
                  <tr>
                     <th className="p-3 w-10 text-center">#</th>
                     <th className="p-3 w-32" onClick={() => requestSort('date')}>Ngày <SortIcon columnKey="date"/></th>
                     <th className="p-3 w-48">Hạng Mục</th>
                     <th className="p-3 w-auto">Nội Dung Chi</th>
                     <th className="p-3 w-40 text-right" onClick={() => requestSort('amount')}>Số Tiền <SortIcon columnKey="amount"/></th>
                     <th className="p-3 w-32">Người Đề Xuất</th>
                     <th className="p-3 w-32 text-center">Trạng Thái</th>
                     <th className="p-3 w-32">Người Duyệt</th>
                     <th className="p-3 w-16 text-center">Xóa</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-200 bg-white">
                  {processedData.length === 0 ? (
                     <tr><td colSpan="9" className="p-8 text-center text-slate-400 italic">Chưa có dữ liệu chi tiêu nào. Bấm "Tạo Phiếu Chi" để bắt đầu.</td></tr>
                  ) : processedData.map((item) => (
                     <React.Fragment key={item.id}>
                        <tr className={`hover:bg-slate-50 transition-colors ${expandedRow === item.id ? 'bg-slate-50' : ''}`}>
                           <td className="p-3 text-center cursor-pointer" onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>{expandedRow === item.id ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</td>
                           <td className="p-3"><input type="date" className="bg-transparent outline-none text-slate-600 w-full" value={item.date} onChange={(e) => handleUpdate(item.id, 'date', e.target.value)}/></td>
                           <td className="p-3"><select className="bg-transparent outline-none cursor-pointer w-full text-xs truncate" value={item.category} onChange={(e) => handleUpdate(item.id, 'category', e.target.value)}>{config.categories?.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                           <td className="p-3"><input className="w-full bg-transparent outline-none font-bold text-slate-700" value={item.title} onChange={(e) => handleUpdate(item.id, 'title', e.target.value)}/></td>
                           <td className="p-3 text-right"><input className="w-full text-right bg-transparent outline-none font-black text-red-600" value={fmt(item.amount)} onChange={(e) => handleUpdate(item.id, 'amount', e.target.value)}/></td>
                           <td className="p-3"><input className="w-full bg-transparent outline-none text-slate-600" value={item.requester} onChange={(e) => handleUpdate(item.id, 'requester', e.target.value)}/></td>
                           <td className="p-3 text-center"><StatusButton status={item.status} onClick={() => handleStatusClick(item.id, item.status)} /></td>
                           <td className="p-3 font-bold text-slate-500 text-xs">{item.approver || "-"}</td>
                           <td className="p-3 text-center"><button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button></td>
                        </tr>
                        {expandedRow === item.id && (
                           <tr className="bg-slate-50 border-b border-slate-200">
                              <td colSpan="9" className="p-4"><div className="flex gap-4"><div className="w-1/2"><div className="font-bold mb-1 text-xs text-slate-500 uppercase flex items-center gap-2"><FileText size={12}/> Link Hóa Đơn / Chứng Từ</div><div className="flex gap-2"><input className="w-full p-2 text-sm border rounded bg-white" placeholder="Link ảnh/drive..." value={item.evidence} onChange={(e) => handleUpdate(item.id, 'evidence', e.target.value)}/>{item.evidence && <a href={item.evidence} target="_blank" rel="noreferrer" className="p-2 bg-blue-100 text-blue-600 rounded"><ExternalLink size={16}/></a>}</div>{item.evidence && item.evidence.match(/\.(jpeg|jpg|png)$/) && <div className="mt-2 h-32 w-full bg-slate-200 rounded overflow-hidden"><img src={item.evidence} alt="Bill" className="w-full h-full object-contain"/></div>}</div><div className="w-1/2"><div className="font-bold mb-1 text-xs text-slate-500 uppercase">Ghi chú chi tiết</div><textarea className="w-full h-20 p-2 text-sm border rounded bg-white resize-none" placeholder="Nhập lý do chi tiết..." value={item.note} onChange={(e) => handleUpdate(item.id, 'note', e.target.value)}/></div></div></td>
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