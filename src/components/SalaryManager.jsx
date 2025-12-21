import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Settings, 
  ChevronDown, ChevronUp, ChevronRight, 
  Calendar, Undo, Redo, Trash2, X, CheckCircle, AlertCircle, Edit, DollarSign, Cloud, Lock
} from 'lucide-react';

// --- IMPORT FIREBASE & AUTH ---
import { db } from '../firebase';
import { ref, set, onValue } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';

export default function SalaryManager() {
  // --- 0. PHÂN QUYỀN ---
  const { userPermissions, userRole } = useAuth();
  
  // Kiểm tra quyền an toàn
  const canView = userRole === 'ADMIN' || userPermissions?.salary?.view;
  const canEdit = userRole === 'ADMIN' || userPermissions?.salary?.edit;

  // --- 1. CẤU HÌNH ---
  const COURSE_PRICE = 3500000; 
  
  const INITIAL_CONFIG = {
    roles: ["Sale", "Marketing", "Content", "Dev", "Admin"],
    months: ["Tháng 12/2025", "Tháng 01/2026"],
    courses: ["K36", "K37"] 
  };

  // --- 2. STATE ---
  const [history, setHistory] = useState([{ data: [], config: INITIAL_CONFIG }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const currentState = history[historyIndex] || { data: [], config: INITIAL_CONFIG };
  const data = Array.isArray(currentState.data) ? currentState.data : [];
  const config = currentState.config || INITIAL_CONFIG;

  const [filterMonth, setFilterMonth] = useState("Tháng 12/2025");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showConfigModal, setShowConfigModal] = useState(false);

  const fmt = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);

  // --- 3. KẾT NỐI FIREBASE ---
  useEffect(() => {
    const dataRef = ref(db, 'salary_manager');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const cloudData = snapshot.val();
      if (cloudData) {
        const safeData = Array.isArray(cloudData.data) ? cloudData.data : [];
        const safeConfig = cloudData.config || INITIAL_CONFIG;
        setHistory([{ data: safeData, config: safeConfig }]);
        setHistoryIndex(0);
      }
    });
    return () => unsubscribe();
  }, []);

  const saveToCloud = (newData, newConfig) => {
    if (!canEdit) return; // Chặn ghi nếu không có quyền
    set(ref(db, 'salary_manager'), { data: newData, config: newConfig }).catch(console.error);
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

  // --- 4. LOGIC TÍNH TOÁN ---
  const calculateRow = (item, currentConfig = config) => {
    const safeItem = item || {};
    const workDays = Number(safeItem.workDays) || 0;
    const standardDays = Number(safeItem.standardDays) || 26;
    const baseSalary = Number(safeItem.baseSalary) || 0;
    const realBase = standardDays > 0 ? (baseSalary / standardDays) * workDays : 0;
    
    let totalKpi = 0;
    if (currentConfig && Array.isArray(currentConfig.courses)) {
        currentConfig.courses.forEach(k => {
          const details = (safeItem.kpiDetails && safeItem.kpiDetails[k]) ? safeItem.kpiDetails[k] : { orders: 0, percent: 0 };
          const revenue = (Number(details.orders) || 0) * COURSE_PRICE; 
          const commission = revenue * ((Number(details.percent) || 0) / 100); 
          totalKpi += commission;
        });
    }

    const total = realBase + totalKpi + (Number(safeItem.bonus) || 0) + (Number(safeItem.allowance) || 0);
    const final = total - (Number(safeItem.fine) || 0) - (Number(safeItem.advance) || 0);

    return { 
      ...safeItem, 
      realSalary: Math.round(realBase), 
      totalKpi: Math.round(totalKpi),
      totalIncome: Math.round(total), 
      finalPayment: Math.round(final) 
    };
  };

  const handleUpdate = (id, field, value) => {
    if (!canEdit) return;
    let rawValue = value;
    const numericFields = ['workDays', 'standardDays', 'baseSalary', 'bonus', 'allowance', 'advance', 'fine'];
    if (numericFields.includes(field)) rawValue = parseInt(value.toString().replace(/\D/g, '')) || 0;

    const updatedData = data.map(item => item.id === id ? calculateRow({ ...item, [field]: rawValue }) : item);
    pushToHistory(updatedData, null);
  };

  const handleKpiUpdate = (id, k, field, value) => {
    if (!canEdit) return;
    const rawValue = parseInt(value.toString().replace(/\D/g, '')) || 0;
    const updatedData = data.map(item => {
      if (item.id === id) {
        const currentDetails = (item.kpiDetails && item.kpiDetails[k]) ? item.kpiDetails[k] : { orders: 0, percent: 0 };
        const newDetails = { ...(item.kpiDetails || {}), [k]: { ...currentDetails, [field]: rawValue } };
        return calculateRow({ ...item, kpiDetails: newDetails });
      }
      return item;
    });
    pushToHistory(updatedData, null);
  };

  const handleAddEmployee = () => {
    if (!canEdit) return;
    const newId = `NV${Math.floor(Math.random() * 10000) + 100}`;
    const newItem = calculateRow({
      id: newId, month: filterMonth, name: "Nhân viên mới...", role: "Sale",
      workDays: 26, standardDays: 26, baseSalary: 5000000, kpiDetails: {}, 
      bonus: 0, allowance: 0, advance: 0, fine: 0, status: "PENDING", note: ""
    });
    pushToHistory([newItem, ...data], null);
  };

  const handleDelete = (id) => { 
    if (!canEdit) return;
    if(confirm("Xóa nhân sự này?")) pushToHistory(data.filter(i => i.id !== id), null); 
  };
  
  const handleStatusToggle = (id) => {
    if (!canEdit) return;
    const updatedData = data.map(item => item.id === id ? { ...item, status: item.status === "PAID" ? "PENDING" : "PAID" } : item);
    pushToHistory(updatedData, null);
  };

  // --- RENDER ---
  const processedData = useMemo(() => {
    let result = data.filter(item => item.month === filterMonth);
    if (searchQuery) result = result.filter(item => item.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    result = result.map(item => calculateRow(item, config));
    return result;
  }, [data, filterMonth, searchQuery, config]);

  const summary = useMemo(() => {
    return processedData.reduce((acc, item) => ({
      base: acc.base + (item.realSalary || 0),
      kpi: acc.kpi + (item.totalKpi || 0),
      bonus: acc.bonus + (item.bonus || 0) + (item.allowance || 0),
      deduct: acc.deduct + (item.fine || 0) + (item.advance || 0),
      final: acc.final + (item.finalPayment || 0)
    }), { base: 0, kpi: 0, bonus: 0, deduct: 0, final: 0 });
  }, [processedData]);

  // CHẶN QUYỀN XEM
  if (!canView) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <Lock size={64} className="text-slate-200 mb-4" />
      <h2 className="text-xl font-bold text-slate-400 text-center px-10">Bạn không có quyền xem bảng lương nhân sự.</h2>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-6 font-sans overflow-x-hidden">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
               <span className="text-blue-600">SALARY MANAGER</span>
               {!canEdit && <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-1 rounded border border-blue-100 flex items-center gap-1 ml-2"><Lock size={10}/> CHẾ ĐỘ XEM</span>}
            </h1>
            {canEdit && (
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                    <button onClick={undo} disabled={historyIndex === 0} className={`p-1.5 rounded ${historyIndex === 0 ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}`}><Undo size={16}/></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button onClick={redo} disabled={historyIndex === history.length - 1} className={`p-1.5 rounded ${historyIndex === history.length - 1 ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}`}><Redo size={16}/></button>
                </div>
            )}
         </div>
         <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded border border-orange-200 uppercase tracking-tighter">Giá Khóa: {fmt(COURSE_PRICE)}</div>
            <div className="relative group">
               <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50">
                  <Calendar size={16} className="text-slate-500"/><span className="text-sm font-bold text-slate-700">{filterMonth}</span><ChevronDown size={14} className="text-slate-400"/>
               </div>
               <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl hidden group-hover:block z-20 overflow-hidden">
                  {config.months.map(m => (<div key={m} onClick={() => setFilterMonth(m)} className={`px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer ${filterMonth === m ? 'font-bold text-blue-600' : 'text-slate-600'}`}>{m}</div>))}
               </div>
            </div>
            {canEdit && <button onClick={() => setShowConfigModal(true)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"><Settings size={20}/></button>}
         </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex gap-2 mb-4">
         <div className="relative flex-1">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" placeholder="Tìm tên nhân sự..."/>
            <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
         </div>
         <button onClick={handleAddEmployee} disabled={!canEdit} className={`bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold shadow flex items-center gap-2 text-sm transition-all ${!canEdit ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-blue-700 hover:shadow-lg'}`}>
            <Plus size={18}/> Thêm Nhân Sự
         </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden w-full">
         <div className="overflow-x-auto w-full">
            <table className="min-w-max w-full text-left border-collapse text-xs whitespace-nowrap">
               <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold">
                  <tr>
                     <th className="p-3 w-8"></th>
                     <th colSpan="3" className="p-3 border-r border-slate-600 text-center bg-slate-900">THÔNG TIN</th>
                     <th colSpan="3" className="p-3 border-r border-slate-600 text-center bg-blue-900">LƯƠNG CỨNG</th>
                     {config.courses.map(k => (<th key={k} className="p-3 border-r border-slate-600 text-center bg-purple-900 min-w-[120px]">{k} <span className="opacity-50 font-normal block text-[9px]">(Đơn | %)</span></th>))}
                     <th colSpan="3" className="p-3 border-r border-slate-600 text-center bg-orange-900">PHỤ CẤP & PHẠT</th>
                     <th colSpan="3" className="p-3 text-center bg-green-900">THỰC LĨNH</th>
                  </tr>
               </thead>

               {/* TOTAL SUMMARY */}
               <tbody className="bg-yellow-50 font-bold text-slate-800 border-b-2 border-yellow-200">
                  <tr>
                     <td colSpan="4" className="p-3 text-right uppercase text-[10px]">📊 TỔNG CHI:</td>
                     <td className="p-3 text-right text-slate-500">{fmt(summary.base)}</td>
                     <td colSpan="2" className="p-3"></td>
                     {config.courses.map(k => {
                        const totalK = processedData.reduce((sum, item) => {
                           const details = (item.kpiDetails && item.kpiDetails[k]) ? item.kpiDetails[k] : { orders: 0, percent: 0 };
                           return sum + ((Number(details.orders) || 0) * COURSE_PRICE * (Number(details.percent) || 0) / 100);
                        }, 0);
                        return <td key={k} className="p-3 text-right text-purple-700">{fmt(totalK)}</td>
                     })}
                     <td className="p-3 text-right text-orange-700">{fmt(summary.bonus)}</td>
                     <td className="p-3 text-right text-red-600">-{fmt(summary.deduct)}</td>
                     <td className="p-3"></td>
                     <td className="p-3 text-right text-xl text-green-700">{fmt(summary.final)}</td>
                     <td colSpan="2"></td>
                  </tr>
               </tbody>

               <tbody className="divide-y divide-slate-200 bg-white">
                  {processedData.map((item) => (
                     <React.Fragment key={item.id}>
                        <tr className={`hover:bg-blue-50/30 transition-colors ${expandedRow === item.id ? 'bg-blue-50/50' : ''}`}>
                           <td className="p-3 text-center cursor-pointer" onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>{expandedRow === item.id ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-300"/>}</td>
                           <td className="p-3"><input readOnly={!canEdit} className="w-full bg-transparent outline-none font-bold text-slate-700" value={item.name} onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}/></td>
                           <td className="p-3"><select disabled={!canEdit} className="bg-transparent outline-none cursor-pointer text-[11px]" value={item.role} onChange={(e) => handleUpdate(item.id, 'role', e.target.value)}>{config.roles.map(r => <option key={r} value={r}>{r}</option>)}</select></td>
                           <td className="p-3 text-center border-r border-slate-200"><input readOnly={!canEdit} className="w-8 text-center bg-transparent outline-none font-bold text-blue-600" value={item.workDays} onChange={(e) => handleUpdate(item.id, 'workDays', e.target.value)}/></td>
                           <td className="p-3 text-right font-medium text-blue-800 bg-blue-50/10"><input readOnly={!canEdit} className="w-20 text-right bg-transparent outline-none" value={fmt(item.baseSalary)} onChange={(e) => handleUpdate(item.id, 'baseSalary', e.target.value)}/></td>
                           <td className="p-3 text-center text-blue-800 bg-blue-50/10"><input readOnly={!canEdit} className="w-8 text-center bg-transparent outline-none text-slate-400" value={item.standardDays} onChange={(e) => handleUpdate(item.id, 'standardDays', e.target.value)}/></td>
                           <td className="p-3 text-right text-blue-600 bg-blue-50/10 border-r border-blue-100 font-bold italic">{fmt(item.realSalary)}</td>

                           {config.courses.map(k => {
                              const details = (item.kpiDetails && item.kpiDetails[k]) ? item.kpiDetails[k] : { orders: 0, percent: 0 };
                              const kpiMoney = (Number(details.orders) || 0) * COURSE_PRICE * ((Number(details.percent) || 0) / 100);
                              return (
                                 <td key={k} className="p-2 border-r border-purple-100 bg-purple-50/10">
                                    <div className="flex flex-col gap-1">
                                       <div className="flex items-center justify-end gap-1">
                                          <input readOnly={!canEdit} className="w-8 text-right font-bold text-slate-700 bg-white border border-slate-100 rounded px-1" value={details.orders || ''} onChange={(e) => handleKpiUpdate(item.id, k, 'orders', e.target.value)}/>
                                          <span className="text-[9px] text-slate-400">Đơn</span>
                                       </div>
                                       <div className="flex items-center justify-end gap-1">
                                          <input readOnly={!canEdit} className="w-8 text-right font-bold text-purple-600 bg-white border border-purple-100 rounded px-1" value={details.percent || ''} onChange={(e) => handleKpiUpdate(item.id, k, 'percent', e.target.value)}/>
                                          <span className="text-[9px] text-purple-400">%</span>
                                       </div>
                                       <div className="text-right text-[10px] font-bold text-green-600 pt-1 border-t border-purple-100">
                                          {fmt(kpiMoney)}
                                       </div>
                                    </div>
                                 </td>
                              );
                           })}

                           <td className="p-3 text-right"><div className="flex flex-col"><input readOnly={!canEdit} className="w-20 text-right bg-transparent outline-none text-orange-600 font-bold" placeholder="Thưởng" value={fmt(item.bonus)} onChange={(e) => handleUpdate(item.id, 'bonus', e.target.value)}/><input readOnly={!canEdit} className="w-20 text-right bg-transparent outline-none text-[10px] text-slate-400" placeholder="Phụ cấp" value={fmt(item.allowance)} onChange={(e) => handleUpdate(item.id, 'allowance', e.target.value)}/></div></td>
                           <td className="p-3 text-right"><input readOnly={!canEdit} className="w-20 text-right bg-transparent outline-none text-red-500 font-bold" value={fmt(item.advance)} onChange={(e) => handleUpdate(item.id, 'advance', e.target.value)}/></td>
                           <td className="p-3 text-right border-r border-orange-100"><input readOnly={!canEdit} className="w-16 text-right bg-transparent outline-none text-red-400" value={fmt(item.fine)} onChange={(e) => handleUpdate(item.id, 'fine', e.target.value)}/></td>
                           <td className="p-3 text-right font-black text-green-700 text-sm bg-green-50">{fmt(item.finalPayment)}</td>
                           <td className="p-3 text-center bg-green-50"><div onClick={() => handleStatusToggle(item.id)} className={`px-2 py-1 rounded-full text-[10px] font-bold border flex items-center justify-center gap-1 transition-all ${canEdit ? 'cursor-pointer' : 'cursor-default'} ${item.status === "PAID" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>{item.status === "PAID" ? <><CheckCircle size={10}/> XONG</> : <><AlertCircle size={10}/> CHƯA</>}</div></td>
                           <td className="p-3 text-center bg-green-50"><button disabled={!canEdit} onClick={() => handleDelete(item.id)} className={`transition-colors ${canEdit ? 'text-slate-300 hover:text-red-500' : 'text-slate-100'}`}><Trash2 size={14}/></button></td>
                        </tr>
                        {expandedRow === item.id && (
                           <tr className="bg-slate-50 border-b border-slate-200">
                              <td colSpan={13 + config.courses.length} className="p-4"><div className="font-bold mb-1 text-xs text-slate-500 uppercase flex items-center gap-2"><Edit size={12}/> Ghi chú nhân sự</div><textarea readOnly={!canEdit} className="w-full h-20 p-2 text-sm border rounded bg-white resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nhập ghi chú chi tiết..." value={item.note} onChange={(e) => handleUpdate(item.id, 'note', e.target.value)}/></td>
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