import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { ref, onValue, push, update, remove, set } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, DollarSign, AlertCircle, Search, Filter, Plus, 
  CheckCircle, XCircle, Wallet, MoreHorizontal, Megaphone, 
  History, Loader2, X, Edit, Trash2, UserCheck, 
  LayoutGrid, Table as TableIcon, Eye, Calendar
} from 'lucide-react';

// --- SUB-COMPONENTS ---

// 1. Toast Notification
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-right duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
    }`}>
      {type === 'success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
      <span className="font-bold text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14}/></button>
    </div>
  );
};

// 2. Currency Input Helper
const CurrencyInput = ({ value, onChange, placeholder, className, autoFocus, disabled }) => {
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, ''); 
    onChange(raw ? parseInt(raw, 10) : 0);
  };
  const displayValue = value ? new Intl.NumberFormat('vi-VN').format(value) : '';

  return (
    <div className="relative w-full">
      <input 
        type="text" 
        className={className} 
        placeholder={placeholder} 
        value={displayValue} 
        onChange={handleChange} 
        autoFocus={autoFocus} 
        disabled={disabled}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold pointer-events-none">VND</span>
    </div>
  );
};

// 3. Badge Status Component (New)
const StatusBadge = ({ status }) => {
  switch (status) {
    case 'PAID':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200"><CheckCircle size={12}/> Hoàn thành</span>;
    case 'DEPOSIT':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200"><Wallet size={12}/> Cọc</span>;
    case 'RESERVED':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200"><History size={12}/> Bảo lưu</span>;
    case 'CANCEL':
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200"><XCircle size={12}/> Hủy</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">Mới</span>;
  }
};

// --- MAIN COMPONENT ---
export default function SalesCRM() {
  const { userRole, currentUser } = useAuth();
  
  // Quyền hạn
  const isAdmin = userRole === 'ADMIN';
  const isSaleLeader = userRole === 'SALE_LEADER';
  const canEdit = isAdmin || isSaleLeader || userRole === 'SALE';
  const canAssignSale = isAdmin || isSaleLeader;

  // --- 1. STATE ---
  const [customers, setCustomers] = useState([]);
  const [adsList, setAdsList] = useState([]);
  const [saleTeam, setSaleTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); 
  
  // View Mode: 'card' | 'table'
  const [viewMode, setViewMode] = useState('card');

  // Filters
  const [filterCourse, setFilterCourse] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL"); 
  const [filterSale, setFilterSale] = useState("ALL"); 
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    name: "", phone: "", course: "K36", 
    fullPrice: 5000000, paidAmount: 0, note: "",
    sourceAdId: "",
    saleId: "", saleName: "",
    manualStatus: "AUTO" // AUTO, RESERVED, CANCEL
  });
  
  const [paymentAmount, setPaymentAmount] = useState(0);

  const COURSES = ["K35", "K36", "K37", "K38"];
  const STATUS_OPTIONS = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'DEBT', label: '⚠️ Còn nợ' },
    { value: 'PAID', label: '🟢 Hoàn thành' },
    { value: 'RESERVED', label: '🟣 Bảo lưu' },
    { value: 'CANCEL', label: '⚪ Đã hủy' },
  ];

  const fmt = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

  // --- 2. EFFECT & DATA FETCHING ---
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    // 1. Fetch Customers
    const custRef = ref(db, 'sales_crm/customers');
    const unsubCust = onValue(custRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
        setCustomers(list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        setCustomers([]);
      }
      setLoading(false);
    });

    // 2. Fetch Ads
    const adsRef = ref(db, 'ads_manager/data');
    const unsubAds = onValue(adsRef, (snapshot) => {
      const val = snapshot.val();
      if (val && Array.isArray(val)) setAdsList(val.filter(ad => ad.id && ad.name));
    });

    // 3. Fetch Sale Team
    const usersRef = ref(db, 'system_settings/users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
            const users = Array.isArray(val) ? val : Object.values(val);
            const sales = users.filter(u => ['SALE', 'SALE_LEADER', 'ADMIN'].includes(u.role));
            setSaleTeam(sales);
        }
    });

    return () => { unsubCust(); unsubAds(); unsubUsers(); };
  }, []);

  const adsMap = useMemo(() => {
    const map = {};
    adsList.forEach(ad => { map[ad.id] = ad; });
    return map;
  }, [adsList]);

  // --- 3. FILTER LOGIC ---
  const processedData = useMemo(() => {
    let list = customers;

    // Filter by Course
    if (filterCourse !== "ALL") list = list.filter(c => c.course === filterCourse);
    
    // Filter by Status
    if (filterStatus === "DEBT") list = list.filter(c => c.debtAmount > 0 && c.status !== 'CANCEL');
    else if (filterStatus === "PAID") list = list.filter(c => c.status === 'PAID');
    else if (filterStatus === "RESERVED") list = list.filter(c => c.status === 'RESERVED');
    else if (filterStatus === "CANCEL") list = list.filter(c => c.status === 'CANCEL');
    
    // Filter by Sale
    if (filterSale !== "ALL") list = list.filter(c => c.saleId === filterSale);

    // Filter by Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase().trim();
      list = list.filter(c => c.name?.toLowerCase().includes(lower) || c.phone?.includes(lower));
    }
    return list;
  }, [customers, filterCourse, filterStatus, filterSale, searchTerm]);

  // Mini Stats Calculation
  const stats = useMemo(() => {
    return processedData.reduce((acc, curr) => {
      // Logic: Status Cancel không tính vào doanh thu/công nợ
      if (curr.status !== 'CANCEL') {
        acc.realRevenue += (curr.paidAmount || 0);
        acc.totalDebt += (curr.debtAmount || 0);
        acc.customers += 1;
      }
      return acc;
    }, { realRevenue: 0, totalDebt: 0, customers: 0 });
  }, [processedData]);

  // --- 4. ACTIONS ---
  const showToast = (message, type = 'success') => setToast({ message, type });

  const toggleMenu = (e, id) => {
    e.stopPropagation(); 
    setActiveMenuId(prev => (prev === id ? null : id));
  };

  const openAddModal = () => {
    setIsEditing(false);
    const defaultSaleId = canAssignSale ? "" : (currentUser?.email || "");
    const defaultSaleName = canAssignSale ? "" : (currentUser?.name || "");

    setFormData({
        name: "", phone: "", course: "K36", 
        fullPrice: 5000000, paidAmount: 0, note: "", 
        sourceAdId: "",
        saleId: defaultSaleId,
        saleName: defaultSaleName,
        manualStatus: "AUTO"
    });
    setShowAddModal(true);
  };

  const openEditModal = (e, customer) => {
    e.stopPropagation(); 
    setActiveMenuId(null);
    setIsEditing(true);
    setSelectedCustomer(customer);
    
    // Determine manual status based on current status
    let manStatus = "AUTO";
    if (customer.status === 'RESERVED') manStatus = 'RESERVED';
    if (customer.status === 'CANCEL') manStatus = 'CANCEL';

    setFormData({
      name: customer.name || "",
      phone: customer.phone || "",
      course: customer.course || "K36",
      fullPrice: customer.fullPrice || 5000000,
      paidAmount: customer.paidAmount || 0,
      note: customer.note || "",
      sourceAdId: customer.sourceAdId || "",
      saleId: customer.saleId || "",
      saleName: customer.saleName || "",
      manualStatus: manStatus
    });
    setShowAddModal(true);
  };

  const handleDeleteCustomer = async (e, id) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!isAdmin && !isSaleLeader) return showToast("Bạn không có quyền xóa!", "error");
    if (window.confirm("⚠️ CẢNH BÁO: Bạn có chắc muốn xóa khách hàng này?")) {
       try {
         await remove(ref(db, `sales_crm/customers/${id}`));
         showToast("Đã xóa khách hàng thành công.");
       } catch (err) {
         showToast("Lỗi xóa: " + err.message, "error");
       }
    }
  };

  const handleSaveCustomer = async () => {
    if (!formData.name || !formData.phone) return showToast("Vui lòng nhập tên và SĐT!", "error");
    if (!formData.saleId) return showToast("Vui lòng chọn người phụ trách!", "error");
    
    const fullPrice = Number(formData.fullPrice);
    const paidAmount = Number(formData.paidAmount);
    const debtAmount = fullPrice - paidAmount;

    // --- STATUS LOGIC ---
    let status = "PENDING";
    
    if (formData.manualStatus === 'RESERVED') {
      status = 'RESERVED';
    } else if (formData.manualStatus === 'CANCEL') {
      status = 'CANCEL';
    } else {
      // Auto calculation
      if (paidAmount >= fullPrice) status = "PAID";
      else if (paidAmount > 0) status = "DEPOSIT"; 
      else status = "NEW"; 
    }

    const selectedSale = saleTeam.find(s => s.email === formData.saleId);
    const finalSaleName = selectedSale ? selectedSale.name : (formData.saleName || "Unknown");
    const sourceAdName = adsMap[formData.sourceAdId]?.name || "";

    const customerData = {
      ...formData,
      saleName: finalSaleName,
      sourceAdName,
      fullPrice, paidAmount, debtAmount, status,
    };
    // Remove temporary field
    delete customerData.manualStatus;

    try {
      if (isEditing && selectedCustomer) {
        await update(ref(db, `sales_crm/customers/${selectedCustomer.id}`), customerData);
        showToast("Cập nhật thông tin thành công!");
      } else {
        const newRef = push(ref(db, 'sales_crm/customers'));
        const custId = newRef.key;
        
        const newCustomer = {
            ...customerData,
            createdAt: new Date().toISOString(),
            transactions: []
        };

        // Create transaction log if paid > 0
        if (paidAmount > 0) {
            const transId = `TRX_${Date.now()}`;
            const transaction = {
                id: transId,
                date: new Date().toISOString(),
                amount: paidAmount,
                type: 'INCOME',
                note: 'Thanh toán lần đầu',
                customerId: custId,
                customerName: formData.name,
                course: formData.course
            };
            newCustomer.transactions = [transaction];
            await update(ref(db, `finance_transactions/${transId}`), transaction);
        }
        await set(newRef, newCustomer);
        showToast("Lên đơn mới thành công!");
      }
      setShowAddModal(false);
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    }
  };

  const handleAddPayment = async () => {
    if (!selectedCustomer || paymentAmount <= 0) return showToast("Số tiền không hợp lệ!", "error");
    
    const amount = Number(paymentAmount);
    const currentPaid = Number(selectedCustomer.paidAmount) || 0;
    const currentFull = Number(selectedCustomer.fullPrice) || 0;
    
    if (currentPaid + amount > currentFull) return showToast(`Không thể thu quá số nợ!`, "error");

    const newPaid = currentPaid + amount;
    const newDebt = currentFull - newPaid;
    
    // Auto update status logic on Payment
    let newStatus = selectedCustomer.status;
    if (newStatus !== 'RESERVED' && newStatus !== 'CANCEL') {
       if (newDebt <= 0) newStatus = "PAID";
       else if (newPaid > 0) newStatus = "DEPOSIT";
    }

    const transId = `TRX_${Date.now()}`;
    const newTransaction = {
      id: transId, date: new Date().toISOString(), amount: amount, type: 'INCOME',
      note: 'Thanh toán bổ sung', customerId: selectedCustomer.id,
      customerName: selectedCustomer.name, course: selectedCustomer.course
    };

    const updates = {};
    updates[`sales_crm/customers/${selectedCustomer.id}/paidAmount`] = newPaid;
    updates[`sales_crm/customers/${selectedCustomer.id}/debtAmount`] = newDebt;
    updates[`sales_crm/customers/${selectedCustomer.id}/status`] = newStatus;
    
    const currentHistory = selectedCustomer.transactions || [];
    updates[`sales_crm/customers/${selectedCustomer.id}/transactions`] = [...currentHistory, newTransaction];
    updates[`finance_transactions/${transId}`] = newTransaction;

    try { 
      await update(ref(db), updates); 
      setShowPaymentModal(false); 
      setPaymentAmount(0); 
      showToast(`Đã thu thêm ${fmt(amount)}`); 
    } catch (err) { showToast("Lỗi: " + err.message, "error"); }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-500"/></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 font-sans text-slate-800">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* --- STATS BAR --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase mb-1">Tổng Khách Hàng</p>
                <h3 className="text-2xl font-black text-slate-800">{stats.customers}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24}/></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-slate-500 text-xs font-bold uppercase mb-1">Doanh Thu Thực</p>
                <h3 className="text-2xl font-black text-green-600">{fmt(stats.realRevenue)}</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl"><DollarSign size={24}/></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-red-400 text-xs font-bold uppercase mb-1">Công Nợ Phải Thu</p>
                <h3 className="text-2xl font-black text-red-600">{fmt(stats.totalDebt)}</h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertCircle size={24}/></div>
        </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6 justify-between items-start xl:items-center sticky top-0 z-20 bg-[#f8fafc]/95 backdrop-blur py-2">
        
        {/* Left: Filters */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          {/* View Mode Switcher */}
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex">
            <button onClick={() => setViewMode('card')} className={`p-2 rounded-lg transition-all ${viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid size={18}/>
            </button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <TableIcon size={18}/>
            </button>
          </div>

          <div className="relative">
            <select className="appearance-none bg-white border border-slate-200 pl-4 pr-9 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none hover:border-blue-400 focus:border-blue-500 transition-colors cursor-pointer shadow-sm"
              value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
              <option value="ALL">Khóa học: Tất cả</option>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Filter size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
             <select className="appearance-none bg-white border border-slate-200 pl-4 pr-9 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none hover:border-blue-400 focus:border-blue-500 transition-colors cursor-pointer shadow-sm"
               value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
               {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
             <Filter size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
          </div>

          {canAssignSale && (
             <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 pl-4 pr-9 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none hover:border-blue-400 focus:border-blue-500 transition-colors cursor-pointer shadow-sm"
                  value={filterSale} onChange={(e) => setFilterSale(e.target.value)}>
                  <option value="ALL">Sale: Tất cả</option>
                  {saleTeam.map(s => <option key={s.email} value={s.email}>{s.name}</option>)}
                </select>
                <Users size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
             </div>
          )}
        </div>

        {/* Right: Search & Add */}
        <div className="flex gap-3 w-full xl:w-auto">
          <div className="relative flex-1 xl:w-64 group">
            <input 
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all group-hover:border-blue-300" 
                placeholder="Tìm tên, SĐT..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          
          {canEdit && (
            <button onClick={openAddModal} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-95 whitespace-nowrap">
              <Plus size={18} /> <span className="hidden sm:inline">Chốt Đơn</span>
            </button>
          )}
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      
      {/* VIEW MODE: CARD (KANBAN) */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-20">
            {processedData.map((cust) => {
                const isDebt = cust.debtAmount > 0;
                const percent = cust.fullPrice > 0 ? Math.min(Math.round((cust.paidAmount / cust.fullPrice) * 100), 100) : 0;
                const displayAdName = cust.sourceAdName || adsMap[cust.sourceAdId]?.name;
                const isMenuOpen = activeMenuId === cust.id;

                return (
                    <div key={cust.id} className={`bg-white rounded-2xl p-5 border transition-all hover:-translate-y-1 hover:shadow-lg group relative ${isDebt ? 'border-red-100' : 'border-slate-100'}`}>
                        {/* Status Badge Absolute */}
                        <div className="absolute top-4 right-4">
                            <StatusBadge status={cust.status} />
                        </div>

                        {/* Info */}
                        <div className="mb-4 pr-16">
                            <h3 className="font-bold text-slate-800 text-lg truncate mb-1">{cust.name}</h3>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">{cust.course}</span>
                                <span className="text-slate-500 flex items-center gap-1"><Users size={12}/> {cust.phone}</span>
                            </div>
                        </div>

                        {/* Sale & Source */}
                        <div className="flex items-center gap-2 mb-4 text-[10px] font-bold">
                            <div className="px-2 py-1 bg-purple-50 text-purple-700 rounded border border-purple-100 truncate max-w-[100px]">
                                👮 {cust.saleName || 'N/A'}
                            </div>
                            {displayAdName && (
                                <div className="px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-100 truncate flex-1">
                                    📢 {displayAdName}
                                </div>
                            )}
                        </div>

                        {/* Money Progress */}
                        <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                             <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-500 font-medium">Tiến độ thanh toán</span>
                                <span className="font-bold text-blue-600">{percent}%</span>
                             </div>
                             <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                <div className={`h-full ${percent===100?'bg-green-500':'bg-blue-500'}`} style={{ width: `${percent}%` }}></div>
                             </div>
                             <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100">
                                <div><p className="text-[10px] text-slate-400 uppercase">Đã đóng</p><p className="text-sm font-bold text-slate-700 font-mono">{fmt(cust.paidAmount)}</p></div>
                                <div className="text-right"><p className="text-[10px] text-red-400 uppercase">Còn nợ</p><p className={`text-sm font-black font-mono ${isDebt ? 'text-red-600' : 'text-slate-300'}`}>{fmt(cust.debtAmount)}</p></div>
                             </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            {isDebt && canEdit && cust.status !== 'CANCEL' && (
                                <button onClick={() => { setSelectedCustomer(cust); setShowPaymentModal(true); }} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-green-100">
                                    <Wallet size={14} /> Thu thêm
                                </button>
                            )}
                            <div className="relative ml-auto">
                                <button onClick={(e) => toggleMenu(e, cust.id)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors border border-slate-100"><MoreHorizontal size={16} /></button>
                                {isMenuOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        <button onClick={(e) => openEditModal(e, cust)} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 border-b border-slate-50"><Edit size={14}/> Sửa thông tin</button>
                                        {(isAdmin || isSaleLeader) && <button onClick={(e) => handleDeleteCustomer(e, cust.id)} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Xóa khách</button>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
      )}

      {/* VIEW MODE: TABLE (EXCEL STYLE) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-slate-100 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 font-bold whitespace-nowrap">Ngày nhập</th>
                        <th className="px-6 py-4 font-bold">Họ tên</th>
                        <th className="px-6 py-4 font-bold">SĐT</th>
                        <th className="px-6 py-4 font-bold text-center">Khóa</th>
                        <th className="px-6 py-4 font-bold">Sale phụ trách</th>
                        <th className="px-6 py-4 font-bold text-right">Tổng tiền</th>
                        <th className="px-6 py-4 font-bold text-right">Đã đóng</th>
                        <th className="px-6 py-4 font-bold text-right">Còn nợ</th>
                        <th className="px-6 py-4 font-bold text-center">Trạng thái</th>
                        <th className="px-6 py-4 font-bold text-center">Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {processedData.map((cust, idx) => {
                         const isDebt = cust.debtAmount > 0;
                         return (
                            <tr key={cust.id} className="bg-white border-b border-slate-100 hover:bg-blue-50/50 transition-colors even:bg-slate-50/50">
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                                    {new Date(cust.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">{cust.name}</td>
                                <td className="px-6 py-4 font-mono text-slate-500">{cust.phone}</td>
                                <td className="px-6 py-4 text-center"><span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">{cust.course}</span></td>
                                <td className="px-6 py-4 text-xs font-bold text-purple-600">{cust.saleName}</td>
                                <td className="px-6 py-4 text-right font-mono">{fmt(cust.fullPrice)}</td>
                                <td className="px-6 py-4 text-right font-mono text-green-600">{fmt(cust.paidAmount)}</td>
                                <td className={`px-6 py-4 text-right font-mono font-bold ${isDebt ? 'text-red-600' : 'text-slate-300'}`}>
                                    {fmt(cust.debtAmount)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <StatusBadge status={cust.status} />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={(e) => openEditModal(e, cust)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Sửa"><Edit size={16}/></button>
                                        {isDebt && <button onClick={() => { setSelectedCustomer(cust); setShowPaymentModal(true); }} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-100 rounded transition-colors" title="Thu tiền"><Wallet size={16}/></button>}
                                    </div>
                                </td>
                            </tr>
                         )
                    })}
                    {processedData.length === 0 && (
                        <tr><td colSpan="10" className="text-center py-10 text-slate-400 italic">Không tìm thấy dữ liệu</td></tr>
                    )}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* --- MODAL ADD/EDIT --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                {isEditing ? <Edit size={20} className="text-blue-600"/> : <Plus size={20} className="text-blue-600"/>} 
                {isEditing ? "Cập Nhật Hồ Sơ" : "Chốt Đơn Mới"}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Info Basic */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tên khách hàng</label><input className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nguyễn Văn A" /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Số điện thoại</label><input className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="09xx..." /></div>
              </div>

              {/* Course */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Khóa học quan tâm</label>
                <div className="flex gap-2">
                  {COURSES.map(c => (
                    <button key={c} onClick={() => setFormData({...formData, course: c})} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${formData.course === c ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{c}</button>
                  ))}
                </div>
              </div>

              {/* Status Special (NEW) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase flex items-center gap-1"><History size={14}/> Trạng thái xử lý</label>
                <div className="flex gap-2">
                    <button onClick={() => setFormData({...formData, manualStatus: 'AUTO'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${formData.manualStatus === 'AUTO' ? 'bg-white border-blue-500 text-blue-600 shadow-sm ring-1 ring-blue-500' : 'border-slate-200 text-slate-400'}`}>Tự động (Tiền)</button>
                    <button onClick={() => setFormData({...formData, manualStatus: 'RESERVED'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${formData.manualStatus === 'RESERVED' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' : 'border-slate-200 text-slate-400'}`}>🟣 Bảo lưu</button>
                    <button onClick={() => setFormData({...formData, manualStatus: 'CANCEL'})} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${formData.manualStatus === 'CANCEL' ? 'bg-gray-100 border-gray-400 text-gray-700 shadow-sm' : 'border-slate-200 text-slate-400'}`}>⚪ Hủy / Dừng</button>
                </div>
                {formData.manualStatus === 'RESERVED' && <p className="text-[10px] text-purple-600 mt-2 font-medium italic">* Khách đã đóng tiền nhưng chưa học. Vẫn tính doanh thu.</p>}
              </div>

              {/* Sale & Source */}
              <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Người phụ trách</label>
                    <select className={`w-full p-3 border border-slate-200 rounded-lg text-sm font-medium outline-none ${!canAssignSale ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
                        value={formData.saleId} onChange={(e) => {
                            const selected = saleTeam.find(s => s.email === e.target.value);
                            setFormData({...formData, saleId: e.target.value, saleName: selected ? selected.name : ""});
                        }} disabled={!canAssignSale}>
                        <option value="">-- Chọn Sale --</option>
                        {saleTeam.map(s => <option key={s.email} value={s.email}>{s.name} ({s.role})</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Nguồn quảng cáo</label>
                    <select className="w-full p-3 border border-slate-200 rounded-lg text-sm font-medium bg-white outline-none" value={formData.sourceAdId} onChange={(e) => setFormData({...formData, sourceAdId: e.target.value})}>
                        <option value="">-- Tự nhiên / Không rõ --</option>
                        {adsList.filter(ad => ad.course === formData.course).map(ad => <option key={ad.id} value={ad.id}>[{ad.course}] {ad.name}</option>)}
                    </select>
                 </div>
              </div>

              {/* Money */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                 <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Học phí niêm yết</label><CurrencyInput className="w-full p-3 border border-slate-300 rounded-xl font-mono font-bold text-slate-700 bg-white" value={formData.fullPrice} onChange={val => setFormData({...formData, fullPrice: val})}/></div>
                 <div><label className="block text-xs font-bold text-green-700 mb-1.5 uppercase">{isEditing ? "Tổng tiền đã thu" : "Khách đóng ngay"}</label><CurrencyInput className="w-full p-3 border border-green-300 rounded-xl font-mono font-bold text-green-700 text-lg bg-white" value={formData.paidAmount} onChange={val => setFormData({...formData, paidAmount: val})}/></div>
              </div>
              
              <button onClick={handleSaveCustomer} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-[0.98]">
                {isEditing ? "Lưu Thay Đổi" : "Xác Nhận Đơn Hàng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PAYMENT --- */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center"><div><h3 className="font-bold text-slate-700 text-lg">Thu tiền bổ sung</h3><p className="text-xs text-slate-500">{selectedCustomer.name}</p></div><button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button></div>
              <div className="p-6">
                <div className="text-center mb-6 bg-red-50 py-5 rounded-2xl border border-red-100"><p className="text-red-400 text-xs font-bold uppercase mb-1">Số tiền còn nợ</p><h2 className="text-3xl font-black text-red-600 font-mono tracking-tight">{fmt(selectedCustomer.debtAmount)}</h2></div>
                <div className="mb-6"><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nhập số tiền thu thêm</label><CurrencyInput autoFocus className="w-full p-4 border-2 border-green-100 rounded-xl font-mono text-2xl font-bold text-green-700 focus:border-green-500 focus:ring-0 outline-none text-center bg-green-50/30" value={paymentAmount} onChange={setPaymentAmount}/></div>
                <div className="grid grid-cols-3 gap-2 mb-6"><button onClick={() => setPaymentAmount(selectedCustomer.debtAmount)} className="py-2 bg-green-100 text-green-700 text-xs font-bold rounded-lg hover:bg-green-200">Tất toán</button><button onClick={() => setPaymentAmount(500000)} className="py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200">500k</button><button onClick={() => setPaymentAmount(1000000)} className="py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200">1 Triệu</button></div>
                <button onClick={handleAddPayment} className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 flex items-center justify-center gap-2"><CheckCircle size={18}/> Xác Nhận Thu Tiền</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}