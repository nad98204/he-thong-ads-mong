import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Settings, 
  ChevronDown, ChevronRight, 
  Trash2, CheckCircle, AlertCircle, Edit, 
  Lock, Unlock, Calendar, XCircle, X, Users, LayoutList
} from 'lucide-react';

// --- IMPORT FIREBASE & AUTH ---
import { db } from '../firebase';
import { ref, set, onValue, update } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';

// --- UTILS ---
const safeFmt = (val) => {
    try {
        if (val === null || val === undefined) return '0';
        if (typeof val === 'object') return '0';
        const num = Number(val);
        if (isNaN(num)) return '0';
        return new Intl.NumberFormat('vi-VN').format(num);
    } catch (e) {
        return '0';
    }
};

// --- SETTINGS MANAGER (CONFIG MODAL) ---
const ConfigModal = ({ show, onClose, kpiConfig, rolesList, onSaveKPI, onSaveRoles }) => {
    // Separate Mode: Managing Roles vs Managing KPIs
    const [mode, setMode] = useState('KPIS'); // 'KPIS' or 'ROLES'
    const [activeRoleTab, setActiveRoleTab] = useState('SALE');
    
    // Local State for KPI Config
    const [localKPIConfig, setLocalKPIConfig] = useState({});
    const [newKPI, setNewKPI] = useState("");

    // Local State for Role Management
    const [localRoles, setLocalRoles] = useState([]);
    const [newRoleInput, setNewRoleInput] = useState("");

    // Initialize/Sync Data
    useEffect(() => { 
        if (show) {
            // Defensive Copy for KPIs
            setLocalKPIConfig(JSON.parse(JSON.stringify(kpiConfig || {})));
            // Defensive Copy for Roles
            setLocalRoles([...(rolesList || [])]);
            
            // Set default tab if current doesn't exist
            if (rolesList && rolesList.length > 0 && !rolesList.includes(activeRoleTab)) {
                setActiveRoleTab(rolesList[0]);
            }
        }
    }, [show, kpiConfig, rolesList]);

    // --- KPI LOGIC ---
    const handleAddCourse = () => {
        const val = prompt("Nhập tên khóa học (VD: K38):");
        if (val) {
            const currentRoleConfig = localKPIConfig.SALE || { courses: [] };
            const currentCourses = currentRoleConfig.courses || [];
            
            if (!currentCourses.includes(val)) {
                setLocalKPIConfig({ 
                    ...localKPIConfig, 
                    SALE: { ...currentRoleConfig, courses: [...currentCourses, val] } 
                });
            }
        }
    };

    const handleAddCustomKPI = () => {
        if (!newKPI.trim()) return;
        const currentRoleConfig = localKPIConfig[activeRoleTab] || { customKPI: [] };
        const currentKPIs = currentRoleConfig.customKPI || [];
        
        if (!currentKPIs.includes(newKPI.trim())) {
            setLocalKPIConfig({ 
                ...localKPIConfig, 
                [activeRoleTab]: { ...currentRoleConfig, customKPI: [...currentKPIs, newKPI.trim()] } 
            });
        }
        setNewKPI("");
    };

    const handleRemoveKPIItem = (type, item) => {
        if (type === 'course') {
            const currentRoleConfig = localKPIConfig.SALE || { courses: [] };
            const currentCourses = currentRoleConfig.courses || [];
            setLocalKPIConfig({ 
                ...localKPIConfig, 
                SALE: { ...currentRoleConfig, courses: currentCourses.filter(c => c !== item) } 
            });
        } else {
            const currentRoleConfig = localKPIConfig[activeRoleTab] || { customKPI: [] };
            const currentKPIs = currentRoleConfig.customKPI || [];
            setLocalKPIConfig({ 
                ...localKPIConfig, 
                [activeRoleTab]: { ...currentRoleConfig, customKPI: currentKPIs.filter(k => k !== item) } 
            });
        }
    };

    // --- ROLE MANAGEMENT LOGIC ---
    const handleAddRole = () => {
        const val = newRoleInput.trim().toUpperCase();
        if (!val) return;
        if (localRoles.includes(val)) {
            alert("Role này đã tồn tại!");
            return;
        }
        const updatedRoles = [...localRoles, val];
        setLocalRoles(updatedRoles);
        setNewRoleInput("");
    };

    const handleDeleteRole = (roleToDelete) => {
        if (roleToDelete === 'SALE') {
            alert("Không thể xóa role SALE mặc định.");
            return;
        }
        if (confirm(`Bạn có chắc muốn xóa phòng ban ${roleToDelete}?`)) {
            setLocalRoles(localRoles.filter(r => r !== roleToDelete));
        }
    };

    const handleSaveAll = () => {
        onSaveKPI(localKPIConfig);
        onSaveRoles(localRoles);
        onClose();
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={18}/> Cấu Hình Hệ Thống</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-white"/></button>
                </div>

                {/* Main Navigation (Roles vs KPIs) */}
                <div className="flex bg-slate-100 p-1 gap-1">
                     <button onClick={() => setMode('KPIS')} className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${mode === 'KPIS' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:bg-slate-200'}`}>
                        <LayoutList size={16}/> Cấu Hình KPI
                     </button>
                     <button onClick={() => setMode('ROLES')} className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${mode === 'ROLES' ? 'bg-white shadow text-purple-700' : 'text-slate-500 hover:bg-slate-200'}`}>
                        <Users size={16}/> Quản Lý Phòng Ban
                     </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    {mode === 'ROLES' ? (
                        // --- ROLE EDITOR UI ---
                        <div className="space-y-6">
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <label className="block text-xs font-bold text-purple-800 mb-2 uppercase">Thêm Phòng Ban Mới</label>
                                <div className="flex gap-2">
                                    <input 
                                        value={newRoleInput}
                                        onChange={(e) => setNewRoleInput(e.target.value)}
                                        placeholder="VD: MEDIA, HR, DESIGN..."
                                        className="flex-1 border border-purple-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                    <button onClick={handleAddRole} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700">Thêm</button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-3 uppercase">Danh sách hiện tại</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(localRoles || []).map(role => (
                                        <div key={role} className="flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm hover:border-blue-300 transition-all">
                                            <span className="font-bold text-slate-700 text-sm">{role}</span>
                                            {role !== 'SALE' && (
                                                <button onClick={() => handleDeleteRole(role)} className="text-slate-300 hover:text-red-500 p-1">
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // --- KPI EDITOR UI ---
                        <>
                            {/* Role Tabs */}
                            <div className="flex border-b overflow-x-auto no-scrollbar mb-4">
                                {(localRoles || []).map(role => (
                                    <button key={role} onClick={() => setActiveRoleTab(role)} className={`px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${activeRoleTab === role ? 'border-b-2 border-blue-500 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
                                        {role}
                                    </button>
                                ))}
                            </div>

                            {activeRoleTab === 'SALE' ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Danh sách Khóa (Tính Hoa Hồng)</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {((localKPIConfig.SALE?.courses) || []).map(c => (
                                            <span key={c} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100 flex items-center gap-2">
                                                {c} <button onClick={() => handleRemoveKPIItem('course', c)} className="hover:text-red-500 text-blue-400"><X size={12}/></button>
                                            </span>
                                        ))}
                                        <button onClick={handleAddCourse} className="bg-white text-slate-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-slate-300 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600 transition-all">+ Thêm</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">KPI Tùy Chỉnh cho {activeRoleTab}</label>
                                    <div className="flex gap-2 mb-4">
                                        <input className="flex-1 border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: Views, Leads..." value={newKPI} onChange={e => setNewKPI(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCustomKPI()} />
                                        <button onClick={handleAddCustomKPI} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700">Thêm</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {((localKPIConfig[activeRoleTab]?.customKPI) || []).map(k => (
                                            <span key={k} className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-100 flex items-center gap-2">
                                                {k} <button onClick={() => handleRemoveKPIItem('kpi', k)} className="hover:text-red-500 text-purple-400"><X size={12}/></button>
                                            </span>
                                        ))}
                                        {(localKPIConfig[activeRoleTab]?.customKPI || []).length === 0 && <span className="text-xs text-slate-400 italic">Chưa có KPI nào.</span>}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 border-t bg-slate-50 flex justify-end">
                    <button onClick={handleSaveAll} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all">Lưu Cấu Hình</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function SalaryManager() {
  const { userPermissions, userRole } = useAuth();
  
  const canView = userRole === 'ADMIN' || userPermissions?.salary?.view;
  const baseCanEdit = userRole === 'ADMIN' || userPermissions?.salary?.edit; 

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  
  // Dynamic Configuration State
  const [roleKPIConfig, setRoleKPIConfig] = useState({}); // Stores KPI details per role
  const [dynamicRoles, setDynamicRoles] = useState(['SALE', 'MARKETING', 'ADMIN']); // Stores list of role names
  
  const [globalPrice, setGlobalPrice] = useState(3500000);
  const [lockedMonths, setLockedMonths] = useState({});
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [activeRoleTab, setActiveRoleTab] = useState('ALL'); 

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  const currentFilterKey = `Tháng ${String(selectedMonth).padStart(2, '0')}/${selectedYear}`;
  const isMonthLocked = lockedMonths?.[currentFilterKey] === true;
  const canEdit = baseCanEdit && !isMonthLocked;

  // --- DATA LOADING (DEFENSIVE) ---
  useEffect(() => {
    let loadedCount = 0;
    const totalSources = 5; // Config Roles, Config KPIs, Data, Price, Locks
    const checkLoading = () => {
        loadedCount++;
        if (loadedCount >= totalSources) setLoading(false);
    };

    // 1. Fetch Dynamic Roles List
    onValue(ref(db, 'salary_manager/config/roles'), (snap) => {
        const val = snap.val();
        if (val && Array.isArray(val)) {
            setDynamicRoles(val);
        } else {
            // Default fallback if DB is empty
            setDynamicRoles(['SALE', 'MARKETING', 'ADMIN']); 
        }
        checkLoading();
    });

    // 2. Fetch KPI Configurations
    onValue(ref(db, 'salary_manager/role_config'), (snap) => {
        if(snap.val()) setRoleKPIConfig(snap.val());
        else setRoleKPIConfig({});
        checkLoading();
    });
    
    // 3. Global Settings
    onValue(ref(db, 'system_settings/global/coursePrice'), (snap) => {
        setGlobalPrice(Number(snap.val()) || 3500000);
        checkLoading();
    });

    // 4. Employee Data
    onValue(ref(db, 'salary_manager/data'), (snap) => {
        const val = snap.val();
        if (!val) setData([]);
        else if (Array.isArray(val)) setData(val);
        else setData(Object.values(val)); 
        checkLoading();
    });

    // 5. Locks
    onValue(ref(db, 'salary_manager/locked_months'), (snap) => {
        setLockedMonths(snap.val() || {});
        checkLoading();
    });
  }, []);

  const syncDataToFirebase = (newData) => { 
      if (canEdit) set(ref(db, 'salary_manager/data'), newData).catch(console.error); 
  };
  
  // Save KPI Configuration
  const saveKPIConfig = (newConfig) => {
      set(ref(db, 'salary_manager/role_config'), newConfig);
  };

  // Save Role List Configuration
  const saveRoleList = (newRoleList) => {
      set(ref(db, 'salary_manager/config/roles'), newRoleList);
      setDynamicRoles(newRoleList); // Optimistic update
  };

  // --- CALCULATION LOGIC ---
  const calculateRow = (item) => {
    if (!item) return {};
    const workDays = Number(item.workDays) || 0;
    const standardDays = Number(item.standardDays) || 26;
    const baseSalary = Number(item.baseSalary) || 0;
    const realBase = standardDays > 0 ? (baseSalary / standardDays) * workDays : 0;
    
    let totalKpi = 0;
    // Defensive access to role
    const roleKey = item.role ? item.role.toUpperCase() : 'SALE';
    const config = roleKPIConfig?.[roleKey] || {};

    if (roleKey === 'SALE' || roleKey === 'SALE_LEADER') {
        // Special logic for SALE (Commission based on Course Price)
        (config.courses || []).forEach(k => {
            const details = item.kpiDetails?.[k];
            const safeDetails = (details && typeof details === 'object') ? details : { orders: 0, percent: 0 };
            const revenue = (Number(safeDetails.orders) || 0) * globalPrice; 
            const commission = revenue * ((Number(safeDetails.percent) || 0) / 100); 
            totalKpi += commission;
        });
    } else {
        // General logic for all other roles (Dynamic Custom KPIs)
        (config.customKPI || []).forEach(k => {
            const raw = item.kpiDetails?.[k];
            const val = (raw && typeof raw !== 'object') ? Number(raw) : 0;
            totalKpi += val || 0;
        });
    }

    const total = realBase + totalKpi + (Number(item.bonus) || 0) + (Number(item.allowance) || 0);
    const final = total - (Number(item.fine) || 0) - (Number(item.advance) || 0);

    return { ...item, realSalary: Math.round(realBase), totalKpi: Math.round(totalKpi), finalPayment: Math.round(final) };
  };

  const handleUpdate = (id, field, value) => {
    if (!canEdit) return;
    let rawValue = value;
    const numericFields = ['workDays', 'standardDays', 'baseSalary', 'bonus', 'allowance', 'advance', 'fine'];
    if (numericFields.includes(field)) rawValue = parseInt(value.toString().replace(/\D/g, '')) || 0;
    const updatedData = (data || []).map(item => item.id === id ? calculateRow({ ...item, [field]: rawValue }) : item);
    syncDataToFirebase(updatedData);
  };

  const handleKpiUpdate = (id, k, field, value) => {
    if (!canEdit) return;
    const rawValue = parseInt(value.toString().replace(/\D/g, '')) || 0;
    const updatedData = (data || []).map(item => {
      if (item.id === id) {
        let newDetails = { ...(item.kpiDetails || {}) };
        const roleKey = item.role ? item.role.toUpperCase() : 'SALE';

        if (roleKey === 'SALE' || roleKey === 'SALE_LEADER') {
            const current = (newDetails[k] && typeof newDetails[k] === 'object') ? newDetails[k] : { orders: 0, percent: 0 };
            newDetails[k] = { ...current, [field]: rawValue };
        } else {
            newDetails[k] = rawValue;
        }
        return calculateRow({ ...item, kpiDetails: newDetails });
      }
      return item;
    });
    syncDataToFirebase(updatedData);
  };

  const handleAddEmployee = () => {
    if (!canEdit) return;
    // Default to the currently selected tab, or SALE if 'ALL' is selected
    const defaultRole = activeRoleTab === 'ALL' ? 'SALE' : activeRoleTab;
    const newItem = calculateRow({
      id: `NV${Date.now()}`, month: currentFilterKey, name: "Nhân viên mới...", role: defaultRole,
      workDays: 26, standardDays: 26, baseSalary: 5000000, kpiDetails: {}, 
      bonus: 0, allowance: 0, advance: 0, fine: 0, status: "PENDING", note: ""
    });
    const safeData = Array.isArray(data) ? data : [];
    syncDataToFirebase([newItem, ...safeData]);
  };

  const handleDelete = (id) => { if (canEdit && confirm("Xóa nhân sự này?")) syncDataToFirebase(data.filter(i => i.id !== id)); };
  
  const handleStatusToggle = (id) => {
    if (!canEdit) return;
    const updatedData = (data || []).map(item => item.id === id ? { ...item, status: item.status === "PAID" ? "PENDING" : "PAID" } : item);
    syncDataToFirebase(updatedData);
  };

  const toggleLockMonth = async () => {
      if (userRole !== 'ADMIN') return;
      const newStatus = !isMonthLocked;
      await update(ref(db, 'salary_manager/locked_months'), { [currentFilterKey]: newStatus });
  };

  // --- RENDER PREP ---
  const processedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    let result = data.filter(item => item.month === currentFilterKey);
    
    // Defensive Filter Logic
    if (activeRoleTab !== 'ALL') {
        if (activeRoleTab === 'SALE') {
            // Include both SALE and SALE_LEADER if tab is SALE
            result = result.filter(i => {
                const r = i.role ? i.role.toUpperCase() : '';
                return r === 'SALE' || r === 'SALE_LEADER';
            });
        } else {
            result = result.filter(i => i.role?.toUpperCase() === activeRoleTab);
        }
    }
    
    if (searchQuery) result = result.filter(item => item.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return result.map(item => calculateRow(item));
  }, [data, currentFilterKey, searchQuery, roleKPIConfig, activeRoleTab, globalPrice]);

  if (!canView) return <div className="p-10 text-center text-slate-400 font-bold">Bạn không có quyền xem bảng lương.</div>;
  
  // Loading State to prevent White Screen
  if (loading) return (
      <div className="flex flex-col items-center justify-center h-screen text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold">Đang tải dữ liệu...</p>
      </div>
  );

  // Determine Columns for current view
  const currentKPICols = activeRoleTab === 'ALL' ? [] : (
      (activeRoleTab === 'SALE' || activeRoleTab === 'SALE_LEADER')
        ? (roleKPIConfig?.SALE?.courses || []).map(c => ({ key: c, type: 'SALE' })) 
        : (roleKPIConfig?.[activeRoleTab]?.customKPI || []).map(k => ({ key: k, type: 'OTHER' }))
  );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-6 font-sans overflow-x-hidden animate-in fade-in duration-500">
      <ConfigModal 
        show={showConfigModal} 
        onClose={() => setShowConfigModal(false)} 
        kpiConfig={roleKPIConfig} 
        rolesList={dynamicRoles}
        onSaveKPI={saveKPIConfig}
        onSaveRoles={saveRoleList}
      />

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
         <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
               <span className="text-purple-700">QUẢN LÝ LƯƠNG</span>
               {isMonthLocked && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded border border-red-200 flex items-center gap-1"><Lock size={10}/> ĐÃ CHỐT SỔ</span>}
            </h1>
         </div>
         <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm flex items-center gap-2">
                <Calendar size={14} className="text-slate-400"/>
                <select className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>{[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">THÁNG</span>
                <select className="bg-transparent text-sm font-bold text-blue-600 outline-none cursor-pointer" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>{[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}</select>
            </div>
            {userRole === 'ADMIN' && (
                <>
                    <button onClick={() => setShowConfigModal(true)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50"><Settings size={18}/></button>
                    <button onClick={toggleLockMonth} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all ${isMonthLocked ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100'}`}>{isMonthLocked ? <><Lock size={14}/> MỞ KHÓA</> : <><Unlock size={14}/> CHỐT LƯƠNG</>}</button>
                </>
            )}
         </div>
      </div>

      <div className="mb-4 space-y-4">
          {/* DYNAMIC TABS RENDER */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button 
                  onClick={() => setActiveRoleTab('ALL')} 
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeRoleTab === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
              >
                  Tất Cả
              </button>
              {(dynamicRoles || []).map(role => (
                  <button key={role} onClick={() => setActiveRoleTab(role)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeRoleTab === role ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>{role}</button>
              ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 outline-none shadow-sm" placeholder="Tìm tên nhân sự..."/>
                <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
            </div>
            <button onClick={handleAddEmployee} disabled={!canEdit} className={`bg-purple-600 text-white px-4 py-2.5 rounded-xl font-bold shadow flex items-center gap-2 text-sm transition-all ${!canEdit ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-purple-700 hover:shadow-lg'}`}><Plus size={18}/> Thêm Nhân Sự</button>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden w-full">
         <div className="overflow-x-auto w-full">
            <table className="min-w-max w-full text-left border-collapse text-xs whitespace-nowrap">
               <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold">
                  <tr>
                     <th className="p-3 w-8">#</th>
                     <th colSpan="3" className="p-3 border-r border-slate-600 text-center bg-slate-900">THÔNG TIN</th>
                     <th colSpan="3" className="p-3 border-r border-slate-600 text-center bg-blue-900">LƯƠNG CỨNG</th>
                     {/* Dynamic KPI Columns */}
                     {currentKPICols.map(col => (
                         <th key={col.key} className="p-3 border-r border-slate-600 text-center bg-purple-900 min-w-[140px]">
                             {col.key} {col.type === 'SALE' && <span className="opacity-50 font-normal block text-[8px] mt-0.5">(Giá: {safeFmt(globalPrice)})</span>}
                         </th>
                     ))}
                     <th colSpan="2" className="p-3 border-r border-slate-600 text-center bg-sky-700">THU NHẬP THÊM</th>
                     <th colSpan="2" className="p-3 border-r border-slate-600 text-center bg-orange-800">KHẤU TRỪ</th>
                     <th colSpan="3" className="p-3 text-center bg-green-900">THỰC LĨNH</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-200 bg-white">
                  {processedData.length === 0 ? (
                      <tr><td colSpan="100%" className="p-8 text-center text-slate-400 italic">Không có dữ liệu cho bộ lọc này.</td></tr>
                  ) : (
                      processedData.map((item) => {
                         const isPaid = item.status === "PAID";
                         return (
                            <React.Fragment key={item.id}>
                                <tr className={`transition-colors ${isPaid ? 'bg-green-50/60' : 'hover:bg-blue-50/30'} ${expandedRow === item.id ? 'bg-blue-50/50' : ''}`}>
                                <td className="p-3 text-center cursor-pointer" onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>{expandedRow === item.id ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronRight size={14} className="text-slate-300"/>}</td>
                                <td className="p-3"><input readOnly={!canEdit} className={`w-full bg-transparent outline-none font-bold ${isPaid ? 'text-green-800' : 'text-slate-700'}`} value={item.name} onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}/></td>
                                <td className="p-3"><input readOnly={!canEdit} className="w-20 bg-transparent outline-none text-[11px]" value={item.role} onChange={(e) => handleUpdate(item.id, 'role', e.target.value)} /></td>
                                
                                <td className="p-3 text-center border-r border-slate-200"><input readOnly={!canEdit} className="w-8 text-center bg-transparent outline-none font-bold text-blue-600" value={item.workDays} onChange={(e) => handleUpdate(item.id, 'workDays', e.target.value)}/></td>
                                <td className="p-3 text-right font-medium text-blue-800 bg-blue-50/10"><input readOnly={!canEdit} className="w-20 text-right bg-transparent outline-none" value={safeFmt(item.baseSalary)} onChange={(e) => handleUpdate(item.id, 'baseSalary', e.target.value)}/></td>
                                <td className="p-3 text-center text-blue-800 bg-blue-50/10"><input readOnly={!canEdit} className="w-8 text-center bg-transparent outline-none text-slate-400" value={item.standardDays} onChange={(e) => handleUpdate(item.id, 'standardDays', e.target.value)}/></td>
                                <td className="p-3 text-right text-blue-600 bg-blue-50/10 border-r border-blue-100 font-bold italic">{safeFmt(item.realSalary)}</td>

                                {currentKPICols.map(col => {
                                    if (col.type === 'SALE') {
                                        const details = (item.kpiDetails && typeof item.kpiDetails[col.key] === 'object') ? item.kpiDetails[col.key] : { orders: 0, percent: 0 };
                                        const revenueGenerated = (Number(details.orders) || 0) * globalPrice;
                                        const commission = revenueGenerated * ((Number(details.percent) || 0) / 100);
                                        return (
                                            <td key={col.key} className="p-2 border-r border-purple-100 bg-purple-50/10">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-end gap-1"><input readOnly={!canEdit} className="w-8 text-right font-bold text-slate-700 bg-white border border-slate-100 rounded px-1" value={details.orders || ''} onChange={(e) => handleKpiUpdate(item.id, col.key, 'orders', e.target.value)}/><span className="text-[9px] text-slate-400">Đơn</span></div>
                                                    <div className="flex items-center justify-end gap-1"><input readOnly={!canEdit} className="w-8 text-right font-bold text-purple-600 bg-white border border-purple-100 rounded px-1" value={details.percent || ''} onChange={(e) => handleKpiUpdate(item.id, col.key, 'percent', e.target.value)}/><span className="text-[9px] text-purple-400">%</span></div>
                                                    <div className="text-right text-[10px] font-bold text-green-600 pt-1 border-t border-purple-100/50">{safeFmt(commission)}</div>
                                                </div>
                                            </td>
                                        );
                                    } else {
                                        const raw = item.kpiDetails?.[col.key];
                                        const val = (raw && typeof raw !== 'object') ? raw : 0;
                                        return (
                                            <td key={col.key} className="p-2 border-r border-purple-100 bg-purple-50/10">
                                                <div className="flex items-center justify-end gap-1">
                                                    <input readOnly={!canEdit} className="w-24 text-right font-bold text-green-600 bg-white border border-slate-100 rounded px-2 py-1" value={safeFmt(val)} onChange={(e) => handleKpiUpdate(item.id, col.key, null, e.target.value.replace(/\D/g, ''))}/>
                                                </div>
                                            </td>
                                        )
                                    }
                                })}

                                <td className="p-3 text-right border-r border-slate-100 bg-sky-50/30"><div className="flex items-center justify-end gap-1"><span className="text-[9px] text-slate-400 uppercase">Thưởng</span><input readOnly={!canEdit} className="w-20 text-right bg-transparent outline-none text-green-600 font-bold hover:border-b border-green-200" value={safeFmt(item.bonus)} onChange={(e) => handleUpdate(item.id, 'bonus', e.target.value)}/></div></td>
                                <td className="p-3 text-right border-r border-slate-200 bg-sky-50/30"><div className="flex items-center justify-end gap-1"><span className="text-[9px] text-slate-400 uppercase">P.Cấp</span><input readOnly={!canEdit} className="w-20 text-right bg-transparent outline-none text-green-600 font-bold hover:border-b border-green-200" value={safeFmt(item.allowance)} onChange={(e) => handleUpdate(item.id, 'allowance', e.target.value)}/></div></td>
                                <td className="p-3 text-right border-r border-slate-100 bg-orange-50/30"><div className="flex items-center justify-end gap-1"><span className="text-[9px] text-slate-400 uppercase">Ứng</span><input readOnly={!canEdit} className="w-20 text-right bg-transparent outline-none text-red-500 font-bold hover:border-b border-red-200" value={safeFmt(item.advance)} onChange={(e) => handleUpdate(item.id, 'advance', e.target.value)}/></div></td>
                                <td className="p-3 text-right border-r border-orange-100 bg-orange-50/30"><div className="flex items-center justify-end gap-1"><span className="text-[9px] text-slate-400 uppercase">Phạt</span><input readOnly={!canEdit} className="w-16 text-right bg-transparent outline-none text-red-500 font-bold hover:border-b border-red-200" value={safeFmt(item.fine)} onChange={(e) => handleUpdate(item.id, 'fine', e.target.value)}/></div></td>

                                <td className={`p-3 text-right font-black text-sm border-l-2 border-white ${isPaid ? 'text-white bg-green-600' : 'text-green-700 bg-green-50'}`}>{safeFmt(item.finalPayment)}</td>
                                <td className={`p-3 text-center ${isPaid ? 'bg-green-600' : 'bg-green-50'}`}><div onClick={() => handleStatusToggle(item.id)} className={`px-2 py-1 rounded-full text-[10px] font-bold border flex items-center justify-center gap-1 transition-all ${canEdit ? 'cursor-pointer' : 'cursor-default'} ${isPaid ? "bg-white text-green-700 border-white shadow-sm" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>{isPaid ? <><CheckCircle size={10}/> XONG</> : <><AlertCircle size={10}/> CHƯA</>}</div></td>
                                <td className="p-3 text-center bg-white"><button disabled={!canEdit} onClick={() => handleDelete(item.id)} className={`transition-colors ${canEdit ? 'text-slate-300 hover:text-red-500' : 'text-slate-100'}`}><Trash2 size={14}/></button></td>
                                </tr>
                                
                                {expandedRow === item.id && (
                                <tr className="bg-slate-50 border-b border-slate-200"><td colSpan={17 + currentKPICols.length} className="p-4"><div className="font-bold mb-1 text-xs text-slate-500 uppercase flex items-center gap-2"><Edit size={12}/> Ghi chú nhân sự</div><textarea readOnly={!canEdit} className="w-full h-20 p-2 text-sm border rounded bg-white resize-none focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nhập ghi chú chi tiết..." value={item.note} onChange={(e) => handleUpdate(item.id, 'note', e.target.value)}/></td></tr>
                                )}
                            </React.Fragment>
                         );
                      })
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}