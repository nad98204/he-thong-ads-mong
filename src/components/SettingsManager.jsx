import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Plus, X, Trash2, Database, RefreshCw, 
  Layers, Users, DollarSign, Tag, CheckCircle, AlertTriangle, 
  History, RotateCcw, Shield, Mail, Lock
} from 'lucide-react';

// --- IMPORT FIREBASE ---
import { db } from '../firebase';
import { ref, onValue, set, remove, get } from "firebase/database";

export default function SettingsManager() {
  // --- 1. CONFIG DEFAULT ---
  const DEFAULT_CONFIG = {
    global: {
      courses: ["K35", "K36", "K37", "K38"],
      months: ["Tháng 12/2025", "Tháng 01/2026", "Tháng 02/2026"]
    },
    ads: {
      actions: ["Tăng", "Giữ", "Tắt", "Chờ", "Scale"],
      evals: ["🌟 Tốt", "✅ Ổn", "💸 Lỗ", "⚠️ Kém", "🆕 New"],
      formats: ["Video", "Image", "Reels", "Album"]
    },
    salary: {
      roles: ["Sale", "Marketing", "Content", "Dev", "Admin", "Intern"],
      baseSalaryDefault: 5000000
    },
    spending: {
      categories: [
        "🏢 Chi Phí Cố Định", "📢 Marketing & Ads", "💻 Mua Sắm Thiết Bị", 
        "🛠️ Tool & Phần Mềm", "🍕 Ăn Uống & Tiếp Khách", "🎁 Thưởng & Phúc Lợi", "📦 Khác"
      ]
    },
    // [NEW] USER MANAGEMENT
    users: [
      { email: "admin@monggroup.com", role: "ADMIN", name: "Super Admin" },
      { email: "staff@monggroup.com", role: "STAFF", name: "Nhân Viên Mẫu" }
    ]
  };

  // --- 2. STATE ---
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [backups, setBackups] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("global");

  // --- 3. SYNC FIREBASE ---
  useEffect(() => {
    // Sync Settings
    const configRef = ref(db, 'system_settings');
    onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setConfig(data);
    });

    // Sync Backups List
    const backupsRef = ref(db, 'system_backups_log');
    onValue(backupsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Chuyển object thành mảng và sort mới nhất lên đầu
        const list = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));
        setBackups(list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    });
  }, []);

  // --- 4. ACTIONS: SAVE & CONFIG ---
  const handleSave = () => {
    setIsSaving(true);
    set(ref(db, 'system_settings'), config)
      .then(() => {
        setTimeout(() => setIsSaving(false), 800);
      })
      .catch(err => { console.error(err); setIsSaving(false); });
  };

  const updateList = (section, key, newList) => {
    setConfig(prev => ({ ...prev, [section]: { ...prev[section], [key]: newList } }));
  };

  const addItem = (section, key) => {
    const val = prompt(`Thêm mới vào ${key}:`);
    if (val) {
      const currentList = config[section][key] || [];
      if (!currentList.includes(val)) updateList(section, key, [...currentList, val]);
    }
  };

  const removeItem = (section, key, itemToRemove) => {
    if (confirm(`Xóa "${itemToRemove}"?`)) {
      const currentList = config[section][key] || [];
      updateList(section, key, currentList.filter(i => i !== itemToRemove));
    }
  };

  // --- 5. ACTIONS: BACKUP & RESTORE ---
  const handleCreateBackup = async () => {
    const confirmBackup = confirm("Tạo bản sao lưu toàn bộ hệ thống ngay bây giờ?");
    if (!confirmBackup) return;

    try {
      // 1. Lấy toàn bộ dữ liệu hiện tại
      const adsData = (await get(ref(db, 'ads_manager'))).val();
      const salaryData = (await get(ref(db, 'salary_manager'))).val();
      const spendingData = (await get(ref(db, 'spending_manager'))).val();
      const settingsData = (await get(ref(db, 'system_settings'))).val();

      const backupPackage = {
        timestamp: new Date().toISOString(),
        note: prompt("Ghi chú cho bản backup này (VD: Trước khi reset tháng mới):") || "Backup thủ công",
        data: {
          ads_manager: adsData,
          salary_manager: salaryData,
          spending_manager: spendingData,
          system_settings: settingsData
        }
      };

      // 2. Lưu vào nhánh backups (Dùng push để tạo ID unique)
      const newBackupRef = ref(db, `system_backups/${Date.now()}`); 
      await set(newBackupRef, backupPackage);

      // 3. Lưu log gọn nhẹ để hiển thị danh sách (không chứa full data cho nhẹ)
      const logRef = ref(db, `system_backups_log/${Date.now()}`);
      await set(logRef, { 
        timestamp: backupPackage.timestamp, 
        note: backupPackage.note,
        fullPath: `system_backups/${Date.now()}`
      });

      alert("✅ Đã tạo sao lưu thành công!");
    } catch (e) {
      console.error(e);
      alert("❌ Lỗi khi tạo backup: " + e.message);
    }
  };

  const handleRestore = async (backupLog) => {
    const code = Math.floor(1000 + Math.random() * 9000);
    const confirmRestore = prompt(`CẢNH BÁO: Khôi phục sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại bằng bản sao lưu ngày ${new Date(backupLog.timestamp).toLocaleString()}.\n\nNhập mã "${code}" để xác nhận:`);
    
    if (confirmRestore !== String(code)) {
      if (confirmRestore !== null) alert("Mã xác nhận sai!");
      return;
    }

    try {
      // 1. Lấy full data từ nhánh backup chi tiết
      const fullBackupSnap = await get(ref(db, backupLog.fullPath));
      const fullData = fullBackupSnap.val();

      if (!fullData || !fullData.data) {
        alert("Bản sao lưu bị lỗi hoặc không tồn tại!");
        return;
      }

      // 2. Ghi đè lại vào các nhánh chính
      if(fullData.data.ads_manager) await set(ref(db, 'ads_manager'), fullData.data.ads_manager);
      if(fullData.data.salary_manager) await set(ref(db, 'salary_manager'), fullData.data.salary_manager);
      if(fullData.data.spending_manager) await set(ref(db, 'spending_manager'), fullData.data.spending_manager);
      if(fullData.data.system_settings) await set(ref(db, 'system_settings'), fullData.data.system_settings);

      alert("✅ Đã khôi phục dữ liệu thành công! Hãy F5 lại trang.");
      window.location.reload();
    } catch (e) {
      alert("❌ Lỗi khôi phục: " + e.message);
    }
  };

  // --- 6. ACTIONS: USER MANAGEMENT ---
  const handleAddUser = () => {
    const email = prompt("Nhập Email nhân viên (Gmail):");
    if (!email) return;
    const name = prompt("Nhập Tên nhân viên:");
    const role = confirm("Người này là ADMIN (Toàn quyền)?\nOK = Admin\nCancel = Nhân viên (Chỉ xem)") ? "ADMIN" : "STAFF";
    
    const newUser = { email, name, role };
    const currentUsers = config.users || [];
    
    // Check trùng
    if (currentUsers.find(u => u.email === email)) {
      alert("Email này đã tồn tại!");
      return;
    }

    setConfig(prev => ({ ...prev, users: [...currentUsers, newUser] }));
  };

  const handleRemoveUser = (email) => {
    if (confirm(`Xóa quyền truy cập của ${email}?`)) {
      setConfig(prev => ({ ...prev, users: prev.users.filter(u => u.email !== email) }));
    }
  };

  // --- 7. ACTIONS: RESET DATA ---
  const handleResetData = (path, name) => {
    const confirmCode = Math.floor(1000 + Math.random() * 9000);
    const input = prompt(`CẢNH BÁO: Xóa sạch dữ liệu ${name}!\nNhập mã "${confirmCode}" để tiếp tục:`);
    if (input === String(confirmCode)) {
      remove(ref(db, path)).then(() => alert(`Đã xóa sạch ${name}!`));
    }
  };

  // --- UI COMPONENTS ---
  const ConfigSection = ({ title, icon: Icon, section, listKey, color = "blue" }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-bold text-lg flex items-center gap-2 text-${color}-600`}><Icon size={20}/> {title}</h3>
        <button onClick={() => addItem(section, listKey)} className={`p-2 bg-${color}-50 text-${color}-600 rounded-lg hover:bg-${color}-100`}><Plus size={18}/></button>
      </div>
      <div className="flex flex-wrap gap-2">
        {config[section]?.[listKey]?.map((item, idx) => (
          <span key={idx} className={`px-3 py-1.5 rounded-lg text-sm font-bold border flex items-center gap-2 bg-slate-50 border-slate-200 text-slate-700 group hover:border-${color}-300`}>
            {item} <button onClick={() => removeItem(section, listKey, item)} className="text-slate-400 hover:text-red-500 opacity-50 group-hover:opacity-100"><X size={14}/></button>
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] p-6 font-sans animate-in fade-in duration-500 overflow-x-hidden">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-0 z-30">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-xl text-white"><Settings size={24}/></div>
            <div><h1 className="text-2xl font-black text-slate-800">SYSTEM SETTINGS</h1><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Trung tâm điều khiển hệ thống</p></div>
         </div>
         <button onClick={handleSave} disabled={isSaving} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all transform active:scale-95 ${isSaving ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
            {isSaving ? <><RefreshCw size={18} className="animate-spin"/> Saving...</> : <><Save size={18}/> LƯU CẤU HÌNH</>}
         </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        
        {/* SIDEBAR TABS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-32">
          {[
            { id: "global", label: "Cấu Hình Chung", icon: Layers, color: "text-blue-600" },
            { id: "ads", label: "Cấu Hình Ads", icon: Tag, color: "text-orange-600" },
            { id: "salary", label: "Cấu Hình Lương", icon: Users, color: "text-purple-600" },
            { id: "spending", label: "Cấu Hình Chi Tiêu", icon: DollarSign, color: "text-green-600" },
            { id: "users", label: "Quản Lý Tài Khoản", icon: Shield, color: "text-indigo-600" }, // NEW
            { id: "backup", label: "Sao Lưu & Khôi Phục", icon: History, color: "text-cyan-600" }, // NEW
            { id: "data", label: "Reset Dữ Liệu (Danger)", icon: Database, color: "text-red-600" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full text-left px-6 py-4 font-bold text-sm flex items-center gap-3 transition-colors border-l-4 ${activeTab === tab.id ? 'bg-slate-50 border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <tab.icon size={18} className={activeTab === tab.id ? tab.color : "text-slate-400"}/> {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* TAB 1-4: CONFIG (GIỮ NGUYÊN) */}
          {activeTab === "global" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ConfigSection title="Danh Sách Khóa Học" icon={Layers} section="global" listKey="courses" color="blue"/>
              <ConfigSection title="Danh Sách Tháng" icon={Layers} section="global" listKey="months" color="indigo"/>
            </div>
          )}
          {activeTab === "ads" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ConfigSection title="Hành Động" icon={Tag} section="ads" listKey="actions" color="orange"/>
              <ConfigSection title="Nhãn Đánh Giá" icon={CheckCircle} section="ads" listKey="evals" color="green"/>
              <ConfigSection title="Định Dạng" icon={Layers} section="ads" listKey="formats" color="purple"/>
            </div>
          )}
          {activeTab === "salary" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ConfigSection title="Vị Trí Nhân Sự" icon={Users} section="salary" listKey="roles" color="purple"/>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><h3 className="font-bold text-lg mb-4 text-slate-700 flex items-center gap-2"><DollarSign size={20}/> Lương Cứng Mặc Định</h3><div className="flex gap-4 items-center"><input type="number" value={config.salary?.baseSalaryDefault || 0} onChange={(e) => setConfig({...config, salary: {...config.salary, baseSalaryDefault: Number(e.target.value)}})} className="border border-slate-300 rounded-lg px-4 py-2 w-full max-w-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"/><span className="text-slate-500 font-medium">VNĐ / Tháng</span></div></div>
            </div>
          )}
          {activeTab === "spending" && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><ConfigSection title="Hạng Mục Chi Tiêu" icon={DollarSign} section="spending" listKey="categories" color="green"/></div>}

          {/* TAB 5: USER MANAGEMENT [NEW] */}
          {activeTab === "users" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-indigo-700 flex items-center gap-2"><Shield size={20}/> Quản Lý Tài Khoản & Phân Quyền</h3>
                    <p className="text-xs text-slate-500 mt-1">Danh sách Email được phép truy cập vào hệ thống.</p>
                  </div>
                  <button onClick={handleAddUser} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 flex items-center gap-2 text-sm"><Plus size={16}/> Thêm User</button>
                </div>
                
                <div className="space-y-3">
                  {config.users?.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${user.role === 'ADMIN' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-400'}`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{user.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Mail size={12}/> {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                          {user.role}
                        </span>
                        <button onClick={() => handleRemoveUser(user.email)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {(!config.users || config.users.length === 0) && <div className="text-center py-8 text-slate-400 italic">Chưa có nhân viên nào.</div>}
                </div>
                
                <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800">
                  <p className="font-bold flex items-center gap-2 mb-1"><Lock size={12}/> Quyền hạn:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>ADMIN:</strong> Toàn quyền xem, sửa, xóa, cấu hình hệ thống.</li>
                    <li><strong>STAFF:</strong> Chỉ xem và nhập liệu Ads/Lương/Chi tiêu. Không vào được trang Cấu Hình này.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BACKUP & RESTORE [NEW] */}
          {activeTab === "backup" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-cyan-700 flex items-center gap-2"><History size={20}/> Sao Lưu & Khôi Phục</h3>
                    <p className="text-xs text-slate-500 mt-1">Tạo điểm khôi phục an toàn trước khi thay đổi lớn.</p>
                  </div>
                  <button onClick={handleCreateBackup} className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-lg shadow hover:bg-cyan-700 flex items-center gap-2 text-sm"><Database size={16}/> Tạo Backup Mới</button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {backups.map((bk) => (
                    <div key={bk.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-cyan-300 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white border border-slate-200 rounded-lg text-cyan-600"><Database size={20}/></div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{bk.note}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1"><History size={10}/> {new Date(bk.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <button onClick={() => handleRestore(bk)} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors flex items-center gap-1">
                        <RotateCcw size={12}/> Khôi Phục
                      </button>
                    </div>
                  ))}
                  {backups.length === 0 && <div className="text-center py-8 text-slate-400 italic">Chưa có bản sao lưu nào.</div>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DANGER ZONE (GIỮ NGUYÊN) */}
          {activeTab === "data" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
                <h3 className="text-2xl font-black text-red-700 mb-2 flex items-center gap-2"><AlertTriangle/> DANGER ZONE</h3>
                <p className="text-red-600/80 mb-8 font-medium">Hành động dưới đây không thể hoàn tác.</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                    <div><h4 className="font-bold text-slate-800">Xóa dữ liệu ADS</h4><p className="text-xs text-slate-500">Xóa toàn bộ chiến dịch.</p></div>
                    <button onClick={() => handleResetData('ads_manager', 'ADS')} className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg border border-red-200">Reset Ads</button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                    <div><h4 className="font-bold text-slate-800">Xóa dữ liệu LƯƠNG</h4><p className="text-xs text-slate-500">Xóa toàn bộ nhân sự.</p></div>
                    <button onClick={() => handleResetData('salary_manager', 'LƯƠNG')} className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg border border-red-200">Reset Lương</button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                    <div><h4 className="font-bold text-slate-800">Xóa dữ liệu CHI TIÊU</h4><p className="text-xs text-slate-500">Xóa toàn bộ phiếu chi.</p></div>
                    <button onClick={() => handleResetData('spending_manager', 'CHI TIÊU')} className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg border border-red-200">Reset Chi Tiêu</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}