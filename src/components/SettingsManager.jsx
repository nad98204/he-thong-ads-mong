import React, { useState, useEffect } from 'react';
import { 
  Shield, Plus, Trash2, Save, X, RefreshCw, 
  Lock, Eye, EyeOff, Edit, Check, Power, Briefcase
} from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, set } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';

export default function SettingsManager() {
  const { userRole } = useAuth();

  // Thêm dữ liệu mặc định mới: role = STAFF (hoặc SALE), isActive = false
  const [config, setConfig] = useState({ 
    users: [], 
    global: { courses: ["K35", "K36", "K37"] }
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [editingIndex, setEditingIndex] = useState(null);

  // Mặc định tạo user mới là SALE và chưa Active
  const [newUser, setNewUser] = useState({
    email: "", name: "", password: "", role: "SALE", isActive: false,
    permissions: {
      ads: { view: false, edit: false }, // Sale thường không cần xem Ads
      salary: { view: false, edit: false },
      spending: { view: false, edit: false },
      dashboard: { view: false },
      leads: { view: true, edit: true } // Mặc định Sale xem được Leads
    }
  });

  if (userRole !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-6 text-center">
        <Lock size={80} className="text-orange-500 mb-6 animate-bounce" />
        <h1 className="text-3xl font-black italic">TRUY CẬP BỊ CHẶN!</h1>
        <p className="text-slate-400 mt-2">Khu vực này chỉ dành cho Sếp Tổng.</p>
      </div>
    );
  }

  useEffect(() => {
    const configRef = ref(db, 'system_settings');
    const unsub = onValue(configRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        let safeUsers = val.users ? (Array.isArray(val.users) ? val.users : Object.values(val.users)) : [];
        // Đảm bảo user cũ cũng có trường role và isActive
        safeUsers = safeUsers.map(u => ({
            ...u,
            role: u.role || 'STAFF', 
            isActive: u.isActive || false
        }));
        setConfig({ ...val, users: safeUsers });
      }
    });
    return unsub;
  }, []);

  const syncToFirebase = (targetConfig) => {
    set(ref(db, 'system_settings'), targetConfig).catch(console.error);
  };

  const handleOpenEdit = (user, index) => {
    setEditingIndex(index);
    setNewUser({ ...user });
    setShowAddModal(true);
  };

  const submitForm = () => {
    if (!newUser.email || !newUser.password) return alert("Thiếu Email hoặc Mật khẩu!");
    
    let updatedUsers = [...config.users];

    if (editingIndex !== null) {
      updatedUsers[editingIndex] = newUser;
    } else {
      if (updatedUsers.find(u => u.email === newUser.email.toLowerCase())) return alert("Email đã tồn tại!");
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
      permissions: { ads: { view: false, edit: false }, salary: { view: false, edit: false }, spending: { view: false, edit: false }, dashboard: { view: false } }
    });
    setEditingIndex(null);
    setShowAddModal(false);
  };

  const handleDelete = (email) => {
    if (!window.confirm('Xóa nhân viên này?')) return;
    const newConfig = { ...config, users: config.users.filter(u => u.email !== email) };
    setConfig(newConfig);
    syncToFirebase(newConfig);
  };

  const togglePerm = (e, email, page, type) => {
    if (e) e.stopPropagation();
    const updated = config.users.map(u => {
      if (u.email === email) {
        const perms = { 
          ads: { view: false, edit: false },
          salary: { view: false, edit: false },
          spending: { view: false, edit: false },
          dashboard: { view: false },
          ...(u.permissions || {}) 
        };
        if (page === 'dashboard') perms.dashboard.view = !perms.dashboard.view;
        else perms[page][type] = !perms[page][type];
        return { ...u, permissions: perms };
      }
      return u;
    });
    syncToFirebase({ ...config, users: updated });
  };

  // Hàm bật tắt trạng thái nhận khách
  const toggleActive = (index) => {
    const updated = [...config.users];
    updated[index].isActive = !updated[index].isActive;
    setConfig({ ...config, users: updated });
    syncToFirebase({ ...config, users: updated });
  };

  // Hàm đổi Role nhanh
  const changeRole = (index, newRole) => {
    const updated = [...config.users];
    updated[index].role = newRole;
    setConfig({ ...config, users: updated });
    syncToFirebase({ ...config, users: updated });
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-4 md:p-6 font-sans">
      
      {/* MODAL THÊM/SỬA */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <h3 className="font-bold text-lg text-slate-800">
                {editingIndex !== null ? `SỬA: ${newUser.name}` : "THÊM NHÂN SỰ MỚI"}
              </h3>
              <button onClick={resetForm}><X size={24}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Họ tên</label>
                <input className="w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                <input className="w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mật khẩu</label>
                <input className="w-full border rounded-xl px-4 py-2 font-mono outline-none focus:ring-2 focus:ring-blue-500" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
              </div>
              
              <div className="flex gap-4">
                 <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Vai trò</label>
                    <select className="w-full border rounded-xl px-4 py-2 outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="SALE">SALE (Tư vấn)</option>
                        <option value="ADMIN">ADMIN (Quản lý)</option>
                        <option value="STAFF">STAFF (Chỉ xem)</option>
                    </select>
                 </div>
                 <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" className="w-5 h-5 accent-green-500" checked={newUser.isActive} onChange={e => setNewUser({...newUser, isActive: e.target.checked})}/>
                        <span className="font-bold text-sm text-slate-700">Được chia số?</span>
                    </label>
                 </div>
              </div>

              <button onClick={submitForm} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all">
                {editingIndex !== null ? "LƯU THAY ĐỔI" : "TẠO TÀI KHOẢN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-30">
        <h1 className="text-xl font-black text-slate-800 flex items-center gap-2"><Shield className="text-blue-600"/> CẤU HÌNH HỆ THỐNG</h1>
        <button onClick={() => { setEditingIndex(null); setShowAddModal(true); }} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-blue-700 shadow-md">
          <Plus size={18}/> THÊM NHÂN SỰ
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-500 font-bold text-[10px] uppercase">
              <tr>
                <th className="p-4">Nhân sự</th>
                <th className="p-4 text-center">Vai trò & Status</th> {/* Cột mới */}
                <th className="p-4">Mật khẩu</th>
                <th className="p-4 text-center border-l bg-orange-50/30">Dashboard</th>
                <th className="p-4 text-center border-l bg-blue-50/30">Ads (V|E)</th>
                <th className="p-4 text-center border-l bg-purple-50/30">Lương (V|E)</th>
                <th className="p-4 text-center border-l bg-green-50/30">Chi Tiêu (V|E)</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(config.users || []).map((u, i) => (
                <tr key={i} className={`transition-all ${u.isActive ? 'bg-white' : 'bg-slate-50 opacity-70 grayscale-[0.5]'}`}>
                  <td className="p-4">
                    <div className="font-bold text-slate-700 flex items-center gap-2">
                        {u.name} 
                        {u.role === 'ADMIN' && <Shield size={12} className="text-orange-500"/>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono italic">{u.email}</div>
                  </td>
                  
                  {/* CỘT MỚI: QUẢN LÝ ROLE & ACTIVE */}
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <select 
                            value={u.role} 
                            onChange={(e) => changeRole(i, e.target.value)}
                            className={`text-[10px] font-black px-2 py-1 rounded border outline-none ${
                                u.role === 'ADMIN' ? 'bg-orange-100 text-orange-600 border-orange-200' : 
                                u.role === 'SALE' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                            <option value="SALE">SALE</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="STAFF">STAFF</option>
                        </select>

                        {/* Nút bật tắt Active */}
                        {u.role === 'SALE' && (
                            <button 
                                onClick={() => toggleActive(i)}
                                className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full transition-all ${
                                    u.isActive ? 'bg-green-500 text-white shadow-green-200 shadow-md' : 'bg-slate-200 text-slate-400'
                                }`}
                            >
                                <Power size={10}/> {u.isActive ? "ĐANG NHẬN KHÁCH" : "ĐANG NGHỈ"}
                            </button>
                        )}
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <div className="bg-slate-100 px-2 py-1 rounded border font-mono text-xs text-blue-600 min-w-[80px] text-center">
                          {showPasswords[u.email] ? u.password : "••••••••"}
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); setShowPasswords(prev => ({ ...prev, [u.email]: !prev[u.email] })); }} className="text-slate-300 hover:text-blue-500"><Eye size={14}/></button>
                    </div>
                  </td>
                  
                  {/* CÁC CỘT PHÂN QUYỀN CŨ */}
                  <td className="p-4 text-center border-l bg-orange-50/10">
                      <input type="checkbox" checked={!!u.permissions?.dashboard?.view} onChange={(e) => togglePerm(e, u.email, 'dashboard', 'view')} />
                  </td>
                  <td className="p-4 text-center border-l bg-blue-50/10">
                     <div className="flex justify-center gap-3">
                        <label className="flex flex-col items-center"><input type="checkbox" checked={!!u.permissions?.ads?.view} onChange={(e) => togglePerm(e, u.email, 'ads', 'view')} /><span className="text-[8px] text-slate-400">XEM</span></label>
                        <label className="flex flex-col items-center"><input type="checkbox" checked={!!u.permissions?.ads?.edit} onChange={(e) => togglePerm(e, u.email, 'ads', 'edit')} /><span className="text-[8px] text-red-500">SỬA</span></label>
                     </div>
                  </td>
                  <td className="p-4 text-center border-l bg-purple-50/10">
                     <div className="flex justify-center gap-3">
                        <label className="flex flex-col items-center"><input type="checkbox" checked={!!u.permissions?.salary?.view} onChange={(e) => togglePerm(e, u.email, 'salary', 'view')} /><span className="text-[8px] text-slate-400">XEM</span></label>
                        <label className="flex flex-col items-center"><input type="checkbox" checked={!!u.permissions?.salary?.edit} onChange={(e) => togglePerm(e, u.email, 'salary', 'edit')} /><span className="text-[8px] text-red-500">SỬA</span></label>
                     </div>
                  </td>
                  <td className="p-4 text-center border-l bg-green-50/10">
                     <div className="flex justify-center gap-3">
                        <label className="flex flex-col items-center"><input type="checkbox" checked={!!u.permissions?.spending?.view} onChange={(e) => togglePerm(e, u.email, 'spending', 'view')} /><span className="text-[8px] text-slate-400">XEM</span></label>
                        <label className="flex flex-col items-center"><input type="checkbox" checked={!!u.permissions?.spending?.edit} onChange={(e) => togglePerm(e, u.email, 'spending', 'edit')} /><span className="text-[8px] text-red-500">SỬA</span></label>
                     </div>
                  </td>
                  <td className="p-4 text-center border-l">
                     <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenEdit(u, i)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button>
                        <button onClick={() => handleDelete(u.email)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={16}/></button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}