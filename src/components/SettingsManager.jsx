import React, { useState, useEffect } from 'react';
import { 
  Shield, Plus, Trash2, Save, X, 
  Lock, Eye, Edit3, Power, 
  Database, Users, Settings, Briefcase, 
  CreditCard, Megaphone, Tag, CheckCircle
} from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, set } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';

// --- SUB-COMPONENT: QUẢN LÝ DANH SÁCH TAG (Generic) ---
const ConfigList = ({ title, items = [], onAdd, onRemove, placeholder, icon: Icon }) => {
  const [inputVal, setInputVal] = useState("");

  const handleAdd = () => {
    if (!inputVal.trim()) return;
    if (items.includes(inputVal.trim())) return alert("Mục này đã tồn tại!");
    onAdd(inputVal.trim());
    setInputVal("");
  };

  return (
    <div className="mb-4">
      <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={12}/>} {title}
      </label>
      <div className="flex gap-2 mb-2">
        <input 
          className="flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200">
          Thêm
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span key={idx} className="bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 flex items-center gap-1.5 group">
            {item}
            <button onClick={() => onRemove(item)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={12}/></button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default function SettingsManager() {
  const { userRole } = useAuth();

  // --- 1. STATE & CONFIG ---
  const [activeTab, setActiveTab] = useState('USERS'); // 'USERS' | 'SYSTEM'
  
  const [config, setConfig] = useState({ 
    users: [], 
    global: { 
      // Mặc định nếu chưa có data
      courses: ["K35", "K36", "K37"],
      coursePrice: 3500000,
      
      customerStatuses: ["Mới", "Đang gọi", "Hẹn lại", "Đã cọc", "Hủy"],
      defaultCommission: 5,
      
      expenseCategories: ["Marketing", "Lương", "Thuê nhà", "Ăn uống", "Tool & Soft"],
      initialFund: 0,
      
      adsBudgetCap: 50000000
    }
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);

  // Mặc định tạo user mới
  const [newUser, setNewUser] = useState({
    email: "", name: "", password: "", role: "SALE", isActive: false,
    permissions: {
      sales_crm: { view: true, edit: true },
      leads: { view: true, edit: true },
      training: { view: true, edit: false },
      ads: { view: false, edit: false },
      salary: { view: false, edit: false },
      spending: { view: false, edit: false },
      dashboard: { view: false },
    }
  });

  // --- 2. BẢO VỆ TRANG ---
  if (userRole !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-6 text-center">
        <Lock size={80} className="text-orange-500 mb-6 animate-bounce" />
        <h1 className="text-3xl font-black italic">TRUY CẬP BỊ CHẶN!</h1>
        <p className="text-slate-400 mt-2">Khu vực này chỉ dành cho Quản Trị Viên (Admin).</p>
      </div>
    );
  }

  // --- 3. SYNC DATA ---
  useEffect(() => {
    const configRef = ref(db, 'system_settings');
    const unsub = onValue(configRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        let safeUsers = val.users ? (Array.isArray(val.users) ? val.users : Object.values(val.users)) : [];
        
        // Merge data cũ với cấu trúc mới để tránh lỗi
        const safeGlobal = {
            courses: val.global?.courses || ["K35", "K36"],
            coursePrice: val.global?.coursePrice || 3500000,
            customerStatuses: val.global?.customerStatuses || ["Mới", "Đã chốt", "Hủy"],
            defaultCommission: val.global?.defaultCommission || 5,
            expenseCategories: val.global?.expenseCategories || ["Marketing", "Khác"],
            initialFund: val.global?.initialFund || 0,
            adsBudgetCap: val.global?.adsBudgetCap || 50000000,
        };

        safeUsers = safeUsers.map(u => ({
            ...u,
            permissions: {
                sales_crm: { view: true, edit: true },
                leads: { view: true, edit: true },
                training: { view: true, edit: false },
                ads: { view: false, edit: false },
                salary: { view: false, edit: false },
                spending: { view: false, edit: false },
                dashboard: { view: false },
                ...(u.permissions || {})
            }
        }));
        
        setConfig({ users: safeUsers, global: safeGlobal });
      }
    });
    return unsub;
  }, []);

  const syncToFirebase = (targetConfig) => {
    set(ref(db, 'system_settings'), targetConfig).catch(console.error);
  };

  // --- 4. HANDLERS CHO TAB USERS ---
  const submitUserForm = () => {
    if (!newUser.email || !newUser.password) return alert("Vui lòng nhập Email và Mật khẩu!");
    let updatedUsers = [...config.users];
    
    if (editingIndex !== null) {
      updatedUsers[editingIndex] = newUser;
    } else {
      if (updatedUsers.find(u => u.email === newUser.email.toLowerCase())) return alert("Email này đã tồn tại!");
      updatedUsers.push({ ...newUser, email: newUser.email.toLowerCase().trim() });
    }

    const newConfig = { ...config, users: updatedUsers };
    setConfig(newConfig);
    syncToFirebase(newConfig);
    resetForm();
  };

  const resetForm = () => {
    setNewUser({
      email: "", name: "", password: "", role: "SALE", isActive: false,
      permissions: { 
          sales_crm: { view: true, edit: true },
          leads: { view: true, edit: true },
          training: { view: true, edit: false },
          ads: { view: false, edit: false }, 
          salary: { view: false, edit: false }, 
          spending: { view: false, edit: false }, 
          dashboard: { view: false },
      }
    });
    setEditingIndex(null);
    setShowAddModal(false);
  };

  const togglePerm = (e, email, page, type) => {
    if (e) e.stopPropagation();
    const updated = config.users.map(u => {
      if (u.email === email) {
        const perms = { ...u.permissions };
        if (page === 'dashboard') perms.dashboard.view = !perms.dashboard.view;
        else perms[page][type] = !perms[page][type];
        return { ...u, permissions: perms };
      }
      return u;
    });
    syncToFirebase({ ...config, users: updated });
  };

  const handleDeleteUser = (email) => {
      if(window.confirm("Bạn có chắc muốn xóa nhân sự này?")) {
          const updatedUsers = config.users.filter(u => u.email !== email);
          const newConfig = { ...config, users: updatedUsers };
          setConfig(newConfig);
          syncToFirebase(newConfig);
      }
  }

  // --- 5. HANDLERS CHO TAB SYSTEM (GLOBAL) ---
  const updateGlobal = (field, value) => {
    const newGlobal = { ...config.global, [field]: value };
    setConfig({ ...config, global: newGlobal });
  };

  const handleListAction = (listName, action, value) => {
    let currentList = config.global[listName] || [];
    let newList = [...currentList];

    if (action === 'add') newList.push(value);
    if (action === 'remove') newList = newList.filter(item => item !== value);

    updateGlobal(listName, newList);
  };

  const saveSystemConfig = () => {
    syncToFirebase(config);
    alert("Đã lưu cấu hình hệ thống thành công!");
  };

  // Formatter
  const fmt = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);

  // --- UI COMPONENTS ---
  const PermissionCell = ({ u, page, colorClass }) => (
    <td className={`p-4 text-center border-l ${colorClass}`}>
       <div className="flex justify-center gap-3">
          <button 
            onClick={(e) => togglePerm(e, u.email, page, 'view')}
            className={`p-1.5 rounded transition-all ${u.permissions[page]?.view ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:bg-white/50'}`}
            title="Quyền Xem"
          >
            <Eye size={14}/>
          </button>
          <button 
            onClick={(e) => togglePerm(e, u.email, page, 'edit')}
            className={`p-1.5 rounded transition-all ${u.permissions[page]?.edit ? 'bg-white text-red-500 shadow-sm' : 'text-slate-400 hover:bg-white/50'}`}
            title="Quyền Sửa"
          >
            <Edit3 size={14}/>
          </button>
       </div>
    </td>
  );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-4 md:p-6 font-sans">
      
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 sticky top-0 z-30 bg-[#f8fafc]/90 backdrop-blur-sm py-2">
        <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button 
                onClick={() => setActiveTab('USERS')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'USERS' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                <Users size={18}/> QUẢN LÝ NHÂN SỰ
            </button>
            <button 
                onClick={() => setActiveTab('SYSTEM')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'SYSTEM' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                <Settings size={18}/> THAM SỐ HỆ THỐNG
            </button>
        </div>

        {activeTab === 'USERS' && (
            <button onClick={() => { setEditingIndex(null); setShowAddModal(true); }} className="bg-orange-600 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-orange-700 shadow-lg shadow-orange-200">
            <Plus size={18}/> THÊM NHÂN SỰ
            </button>
        )}
        {activeTab === 'SYSTEM' && (
            <button onClick={saveSystemConfig} className="bg-green-600 text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-green-700 shadow-lg shadow-green-200">
            <Save size={18}/> LƯU CẤU HÌNH
            </button>
        )}
      </div>

      {/* --- TAB 1: QUẢN LÝ NHÂN SỰ --- */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                <tr>
                    <th className="p-4">Nhân sự</th>
                    <th className="p-4 text-center">Vai trò</th>
                    <th className="p-4 text-center border-l bg-orange-50/50">Tổng Quan</th>
                    <th className="p-4 text-center border-l bg-teal-50/50 text-teal-700">Doanh Số</th> 
                    <th className="p-4 text-center border-l bg-yellow-50/50">Khách Hàng</th> 
                    <th className="p-4 text-center border-l bg-pink-50/50">Đào Tạo</th>
                    <th className="p-4 text-center border-l bg-blue-50/50">Quảng Cáo</th>
                    <th className="p-4 text-center border-l bg-purple-50/50">Lương</th>
                    <th className="p-4 text-center border-l bg-green-50/50">Chi Tiêu</th>
                    <th className="p-4 text-center">Thao Tác</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                {(config.users || []).map((u, i) => (
                    <tr key={i} className={`transition-all hover:bg-slate-50 ${u.isActive ? '' : 'opacity-60 grayscale'}`}>
                    <td className="p-4">
                        <div className="font-bold text-slate-700 flex items-center gap-2">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="p-4 text-center">
                        <span className={`text-[9px] font-black px-2 py-1 rounded border ${
                            u.role === 'ADMIN' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                            u.role === 'SALE_LEADER' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                            {u.role}
                        </span>
                    </td>

                    {/* DASHBOARD (View Only) */}
                    <td className="p-4 text-center border-l bg-orange-50/20">
                        <input type="checkbox" className="accent-orange-500 w-4 h-4 cursor-pointer" checked={!!u.permissions?.dashboard?.view} onChange={(e) => togglePerm(e, u.email, 'dashboard', 'view')} />
                    </td>

                    {/* PERMISSION COLUMNS (VIỆT HÓA) */}
                    <PermissionCell u={u} page="sales_crm" colorClass="bg-teal-50/20" />
                    <PermissionCell u={u} page="leads" colorClass="bg-yellow-50/20" />
                    <PermissionCell u={u} page="training" colorClass="bg-pink-50/20" />
                    <PermissionCell u={u} page="ads" colorClass="bg-blue-50/20" />
                    <PermissionCell u={u} page="salary" colorClass="bg-purple-50/20" />
                    <PermissionCell u={u} page="spending" colorClass="bg-green-50/20" />

                    <td className="p-4 text-center border-l">
                        <div className="flex justify-center gap-2">
                            <button onClick={() => { setEditingIndex(i); setNewUser({...u}); setShowAddModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/></button>
                            <button onClick={() => handleDeleteUser(u.email)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
      )}

      {/* --- TAB 2: THAM SỐ HỆ THỐNG (4 KHỐI) --- */}
      {activeTab === 'SYSTEM' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* KHỐI 1: CẤU HÌNH SẢN PHẨM */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Database size={20}/></div>
                    <h3 className="font-bold text-base text-slate-800">Cấu Hình Sản Phẩm (Khóa Học)</h3>
                </div>
                
                <div className="space-y-6">
                    <ConfigList 
                        title="Danh sách Mã Khóa" 
                        items={config.global.courses} 
                        placeholder="VD: K38" 
                        icon={Tag}
                        onAdd={(val) => handleListAction('courses', 'add', val)}
                        onRemove={(val) => handleListAction('courses', 'remove', val)}
                    />
                    
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block">Giá Niêm Yết (Mặc định)</label>
                        <div className="relative">
                            <input 
                                type="text"
                                className="w-full border rounded-xl px-4 py-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                                value={fmt(config.global.coursePrice)}
                                onChange={(e) => updateGlobal('coursePrice', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                            />
                            <span className="absolute right-4 top-2.5 text-sm font-bold text-slate-400">VNĐ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KHỐI 2: CẤU HÌNH CRM & SALE */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="p-2 bg-teal-100 text-teal-600 rounded-lg"><Briefcase size={20}/></div>
                    <h3 className="font-bold text-base text-slate-800">Cấu Hình CRM & Sale</h3>
                </div>

                <div className="space-y-6">
                    <ConfigList 
                        title="Trạng Thái Khách Hàng (Pipeline)" 
                        items={config.global.customerStatuses} 
                        placeholder="VD: Hẹn gọi lại" 
                        icon={CheckCircle}
                        onAdd={(val) => handleListAction('customerStatuses', 'add', val)}
                        onRemove={(val) => handleListAction('customerStatuses', 'remove', val)}
                    />

                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block">% Hoa Hồng Sale (Mặc định)</label>
                        <div className="relative">
                            <input 
                                type="number"
                                className="w-full border rounded-xl px-4 py-2.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 pr-12"
                                value={config.global.defaultCommission}
                                onChange={(e) => updateGlobal('defaultCommission', Number(e.target.value))}
                            />
                            <span className="absolute right-4 top-2.5 text-sm font-bold text-slate-400">%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KHỐI 3: CẤU HÌNH CHI TIÊU */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg"><CreditCard size={20}/></div>
                    <h3 className="font-bold text-base text-slate-800">Cấu Hình Sổ Chi Tiêu</h3>
                </div>

                <div className="space-y-6">
                    <ConfigList 
                        title="Hạng Mục Chi Tiêu" 
                        items={config.global.expenseCategories} 
                        placeholder="VD: Thuê văn phòng" 
                        icon={Tag}
                        onAdd={(val) => handleListAction('expenseCategories', 'add', val)}
                        onRemove={(val) => handleListAction('expenseCategories', 'remove', val)}
                    />

                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block">Quỹ Đầu Kỳ (Số dư ban đầu)</label>
                        <div className="relative">
                            <input 
                                type="text"
                                className="w-full border rounded-xl px-4 py-2.5 font-bold text-green-600 outline-none focus:ring-2 focus:ring-green-500 pr-12"
                                value={fmt(config.global.initialFund)}
                                onChange={(e) => updateGlobal('initialFund', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                            />
                            <span className="absolute right-4 top-2.5 text-sm font-bold text-slate-400">VNĐ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* KHỐI 4: CẤU HÌNH QUẢNG CÁO */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Megaphone size={20}/></div>
                    <h3 className="font-bold text-base text-slate-800">Cấu Hình Quảng Cáo (Ads)</h3>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase mb-2 block">Ngân sách Giới hạn (Budget Cap)</label>
                        <div className="relative">
                            <input 
                                type="text"
                                className="w-full border rounded-xl px-4 py-2.5 font-bold text-purple-600 outline-none focus:ring-2 focus:ring-purple-500 pr-12"
                                value={fmt(config.global.adsBudgetCap)}
                                onChange={(e) => updateGlobal('adsBudgetCap', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                            />
                            <span className="absolute right-4 top-2.5 text-sm font-bold text-slate-400">VNĐ</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 italic">* Dashboard sẽ hiện cảnh báo đỏ nếu chi tiêu vượt mức này.</p>
                    </div>
                </div>
            </div>

        </div>
      )}

      {/* MODAL THÊM USER (GIỮ NGUYÊN LOGIC, CHỈ CẬP NHẬT TEXT TIẾNG VIỆT) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <h3 className="font-bold text-lg text-slate-800">{editingIndex !== null ? "SỬA NHÂN SỰ" : "THÊM NHÂN SỰ"}</h3>
              <button onClick={resetForm}><X size={24}/></button>
            </div>
            <div className="p-6 space-y-4">
              <input className="w-full border rounded-xl px-4 py-2 outline-none" placeholder="Họ tên hiển thị" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}/>
              <input className="w-full border rounded-xl px-4 py-2 outline-none" placeholder="Email đăng nhập" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}/>
              <input className="w-full border rounded-xl px-4 py-2 outline-none" placeholder="Mật khẩu" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
              
              <div className="flex gap-4">
                 <select className="flex-1 border rounded-xl px-4 py-2 outline-none font-bold" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="SALE">SALE (Nhân viên)</option>
                    <option value="SALE_LEADER">SALE LEADER (Trưởng nhóm)</option>
                    <option value="ADMIN">ADMIN (Quản trị)</option>
                    <option value="STAFF">STAFF (Chỉ xem)</option>
                 </select>
                 <label className="flex items-center gap-2 cursor-pointer border px-3 rounded-xl hover:bg-slate-50 select-none">
                    <input type="checkbox" className="accent-green-500 w-5 h-5" checked={newUser.isActive} onChange={e => setNewUser({...newUser, isActive: e.target.checked})}/>
                    <span className="text-xs font-bold text-slate-600">Hoạt động</span>
                 </label>
              </div>

              <button onClick={submitUserForm} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all">LƯU TÀI KHOẢN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}