import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { ref, onValue, update, remove } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';
import { 
  Phone, User, Clock, Trash2, Search, 
  RefreshCw, Calendar, BarChart3, 
  ToggleLeft, ToggleRight, Layers, LayoutDashboard, Lock, Star
} from 'lucide-react';

export default function LeadsManager() {
  const { currentUser, userRole, userPermissions } = useAuth();
  
  // Xác định quyền hạn chi tiết
  const isAdmin = userRole === 'ADMIN';
  const isSaleLeader = userRole === 'SALE_LEADER';
  
  // Quyền xem/sửa cơ bản
  const canView = isAdmin || isSaleLeader || userPermissions?.leads?.view;
  const canEdit = isAdmin || isSaleLeader || userPermissions?.leads?.edit;
  
  // Quyền gán số (Admin & Sale Leader được phép)
  const canAssign = isAdmin || isSaleLeader;

  const [leads, setLeads] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); 
  const [saleFilter, setSaleFilter] = useState("ALL"); 
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const [systemSettings, setSystemSettings] = useState({ autoAssign: false });

  useEffect(() => {
    if (!canView) {
        setLoading(false);
        return;
    }

    const leadsRef = ref(db, 'leads_data');
    const unsubLeads = onValue(leadsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const list = Object.keys(val).map(key => {
          const item = val[key];
          if (!item) return null;
          return { 
            id: key, ...item,
            name: item.name || item.fullname || "Chưa có tên",
            phone: item.phone || item.mobile || "---",
            course: item.course || "Khác", 
            time: item.time || new Date().toISOString()
          };
        }).filter(i => i !== null);
        
        setLeads(list.sort((a, b) => new Date(b.time) - new Date(a.time)));
      } else {
        setLeads([]);
      }
      setLoading(false);
    });

    // Chỉ Admin hoặc Sale Leader mới cần lấy danh sách nhân viên để gán số
    if (canAssign) {
      const settingsRef = ref(db, 'system_settings');
      onValue(settingsRef, (snapshot) => {
        const val = snapshot.val() || {};
        setSystemSettings({ autoAssign: val.autoAssign || false });
        if (val.users) {
            const users = Array.isArray(val.users) ? val.users : Object.values(val.users);
            // Lấy danh sách Sale & Sale Leader đang Active để chia số
            setStaffList(users.filter(u => (u.role === 'SALE' || u.role === 'SALE_LEADER') && u.isActive));
        }
      });
    }

    return () => unsubLeads();
  }, [canAssign, canView]);

  // --- LOGIC LỌC DỮ LIỆU ---
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // 1. Phân quyền xem
      if (!isAdmin && !isSaleLeader) { 
          // Sale thường: Chỉ xem của mình + Khách chưa gán
          if (l.saleId && l.saleId !== currentUser?.email) return false;
          if (!l.saleId) return true; // Cho phép xem khách chưa gán để tự nhận (nếu muốn)
      }
      // (Admin & Sale Leader mặc định xem được hết)

      // 2. Bộ lọc (Dành cho Admin & Sale Leader)
      if (canAssign && saleFilter !== "ALL") {
          if (l.saleId !== saleFilter) return false;
      }

      // 3. Lọc Khóa học
      if (courseFilter !== "ALL" && l.course !== courseFilter) return false;

      // 4. Tìm kiếm
      const term = searchTerm.toLowerCase();
      const matchSearch = l.name.toLowerCase().includes(term) || l.phone.includes(term);
      if (!matchSearch) return false;

      // 5. Thời gian
      const leadDate = new Date(l.time);
      const today = new Date();
      const isSameDay = (d1, d2) => d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
      
      if (dateFilter === 'today') {
        if (!isSameDay(leadDate, today)) return false;
      }
      if (dateFilter === 'week') {
        const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
        firstDayOfWeek.setHours(0,0,0,0);
        if (leadDate < firstDayOfWeek) return false;
      }
      if (dateFilter === 'month') {
        if (leadDate.getMonth() !== new Date().getMonth() || leadDate.getFullYear() !== new Date().getFullYear()) return false;
      }
      if (dateFilter === 'year') {
         if (leadDate.getFullYear() !== new Date().getFullYear()) return false;
      }

      return true;
    });
  }, [leads, searchTerm, dateFilter, saleFilter, courseFilter, isAdmin, isSaleLeader, canAssign, currentUser]);

  const stats = useMemo(() => {
    const data = {
        total: filteredLeads.length,
        byStatus: { "Mới": 0, "Đang gọi": 0, "Đã chốt": 0 },
        byCourse: {} 
    };

    // Tính toán trên tập đã lọc
    filteredLeads.forEach(l => {
        const s = l.status || "Mới";
        data.byStatus[s] = (data.byStatus[s] || 0) + 1;

        const c = l.course || "Chưa phân loại";
        data.byCourse[c] = (data.byCourse[c] || 0) + 1;
    });

    return data;
  }, [filteredLeads]);

  const toggleAutoAssign = () => {
    const newVal = !systemSettings.autoAssign;
    update(ref(db, 'system_settings'), { autoAssign: newVal });
  };

  const autoAssignLeads = () => {
    if (staffList.length === 0) return alert("Không có Sale nào online!");
    let targetLeads = leads.filter(l => !l.saleId);
    
    if (courseFilter !== "ALL") {
        targetLeads = targetLeads.filter(l => l.course === courseFilter);
    }
    
    if (targetLeads.length === 0) return alert("Hết khách mới để chia!");
    if (!window.confirm(`Chia ${targetLeads.length} khách ${courseFilter !== "ALL" ? `khóa ${courseFilter}` : ""} cho ${staffList.length} Sale?`)) return;

    const updates = {};
    let staffIndex = 0;
    targetLeads.forEach((lead) => {
      const sale = staffList[staffIndex];
      if (sale) {
        updates[`leads_data/${lead.id}/saleId`] = sale.email; 
        updates[`leads_data/${lead.id}/saleName`] = sale.name;
        updates[`leads_data/${lead.id}/status`] = "Đang gọi"; 
        staffIndex = (staffIndex + 1) % staffList.length;
      }
    });
    update(ref(db), updates).then(() => alert("Đã chia xong!"));
  };

  const handleUpdate = (id, field, value) => {
    if (!canEdit) return; 
    update(ref(db, `leads_data/${id}`), { [field]: value });
  };

  const deleteLead = (id) => {
    // Chỉ Admin được xóa (Sale Leader không được xóa để tránh rủi ro)
    if (!isAdmin) return; 
    if (window.confirm("Xóa vĩnh viễn?")) remove(ref(db, `leads_data/${id}`));
  };

  if (!canView) return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-400">
      <Lock size={64} className="mb-4" />
      <h2 className="text-xl font-bold">Bạn không có quyền truy cập Data.</h2>
    </div>
  );

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-500">⏳ Đang tải Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <LayoutDashboard className="text-blue-600"/> CRM DASHBOARD
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase mt-1 flex items-center gap-2">
             {isAdmin ? "Quản lý tổng" : `Sale: ${currentUser?.displayName || "Member"}`}
             {isSaleLeader && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Star size={10}/> SALE LEADER</span>}
             {!canEdit && <span className="text-red-500">(Chế độ chỉ xem)</span>}
          </p>
        </div>

        {/* NÚT ĐIỀU KHIỂN (Dành cho Admin & Sale Leader) */}
        {canAssign && (
            <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
                {/* Chỉ Admin mới được bật/tắt Auto (Sale Leader chỉ chia tay) */}
                {isAdmin && (
                    <button 
                        onClick={toggleAutoAssign}
                        className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-all border ${
                            systemSettings.autoAssign 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                    >
                        {systemSettings.autoAssign ? <ToggleRight size={20} className="text-green-600"/> : <ToggleLeft size={20}/>}
                        {systemSettings.autoAssign ? "AUTO: BẬT" : "AUTO: TẮT"}
                    </button>
                )}
                
                {!systemSettings.autoAssign && (
                    <button onClick={autoAssignLeads} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 shadow-md shadow-blue-200">
                        <RefreshCw size={14}/> CHIA SỐ {courseFilter !== "ALL" ? `(${courseFilter})` : ""}
                    </button>
                )}
            </div>
        )}
      </div>

      {/* --- CÁC TAB KHÓA HỌC --- */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        <button 
            onClick={() => setCourseFilter("ALL")}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${
                courseFilter === "ALL" 
                ? "bg-slate-800 text-white shadow-lg" 
                : "bg-white text-slate-500 border hover:bg-slate-100"
            }`}
        >
            Tất cả
        </button>
        {Object.keys(stats.byCourse).map((courseName) => (
            <button 
                key={courseName}
                onClick={() => setCourseFilter(courseName)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all border flex items-center gap-2 ${
                    courseFilter === courseName
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
            >
                {courseName}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    courseFilter === courseName ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                    {stats.byCourse[courseName]}
                </span>
            </button>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <Calendar size={18} className="text-slate-400"/>
            <select 
                className="font-bold text-sm bg-slate-50 border-none rounded-lg py-2 px-3 outline-none cursor-pointer"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
            >
                <option value="all">📅 Tất cả thời gian</option>
                <option value="today">🔥 Hôm nay</option>
                <option value="week">📅 Tuần này</option>
                <option value="month">📅 Tháng này</option>
            </select>
        </div>

        {/* Lọc Nhân Viên (Admin & Sale Leader đều được dùng) */}
        {canAssign && (
            <div className="flex items-center gap-2 w-full md:w-auto border-l md:pl-4">
                <User size={18} className="text-slate-400"/>
                <select 
                    className="font-bold text-sm bg-transparent outline-none cursor-pointer text-blue-700"
                    value={saleFilter}
                    onChange={(e) => setSaleFilter(e.target.value)}
                >
                    <option value="ALL">👥 Tất cả Team</option>
                    {staffList.map((s, idx) => (
                        <option key={idx} value={s.email}>👤 {s.name}</option>
                    ))}
                </select>
            </div>
        )}

        <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
            <input 
              type="text" placeholder="Tìm tên, SĐT..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* DANH SÁCH LEADS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredLeads.map((lead) => (
          <div key={lead.id} className={`bg-white rounded-3xl p-6 shadow-sm border transition-all hover:shadow-md ${lead.status === "Mới" ? "border-blue-200 ring-1 ring-blue-50" : "border-slate-100"}`}>
            
            <div className="flex justify-between items-start mb-4">
               <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
                    <Clock size={10}/> {new Date(lead.time).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md w-fit">
                    {lead.course}
                  </span>
               </div>
               
               <select 
                  value={lead.status || "Mới"} 
                  disabled={!canEdit}
                  onChange={(e) => handleUpdate(lead.id, 'status', e.target.value)}
                  className={`text-[10px] font-black px-2 py-1 rounded-full border outline-none ${
                      !canEdit ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                  } ${
                      lead.status === "Đã chốt" ? "bg-green-100 text-green-700 border-green-200" : 
                      lead.status === "Hủy" ? "bg-red-50 text-red-500 border-red-100" :
                      "bg-slate-50 text-slate-700"
                  }`}
                >
                  <option value="Mới">🔥 MỚI</option>
                  <option value="Đang gọi">📞 GỌI</option>
                  <option value="Đã chốt">✅ CHỐT</option>
                  <option value="Hủy">❌ HỦY</option>
                </select>
            </div>

            <h3 className="text-lg font-black text-slate-800 mb-1 truncate">{lead.name}</h3>
            
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-2 text-xl font-bold text-blue-600 mb-4 hover:underline">
              <Phone size={18} fill="currentColor"/> {lead.phone}
            </a>

            <textarea 
                className={`w-full bg-[#f8fafc] border rounded-lg p-2 text-xs h-16 resize-none outline-none focus:bg-white focus:ring-1 focus:ring-blue-200 ${!canEdit ? 'cursor-not-allowed text-slate-500' : ''}`}
                placeholder={canEdit ? "Ghi chú..." : "Không có quyền sửa ghi chú"}
                readOnly={!canEdit}
                value={lead.note || ""}
                onChange={(e) => handleUpdate(lead.id, 'note', e.target.value)}
            />

            {/* PHẦN GÁN SỐ (Admin & Sale Leader đều thấy) */}
            {canAssign && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  <select 
                    className="flex-1 text-xs border rounded px-2 py-1 outline-none bg-white cursor-pointer hover:border-blue-400"
                    value={lead.saleId || ""}
                    onChange={(e) => {
                        const sale = staffList.find(s => s.email === e.target.value);
                        update(ref(db, `leads_data/${lead.id}`), { 
                            saleId: sale ? sale.email : "", 
                            saleName: sale ? sale.name : "" 
                        });
                    }}
                  >
                    <option value="">-- Chưa gán --</option>
                    {staffList.map((s, idx) => (
                      <option key={idx} value={s.email}>{s.name}</option>
                    ))}
                  </select>
                  
                  {/* Chỉ Admin mới có nút Xóa */}
                  {isAdmin && (
                    <button onClick={() => deleteLead(lead.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                  )}
              </div>
            )}
            
            {/* Nếu không phải Admin/Leader, chỉ hiện tên Sale */}
            {!canAssign && lead.saleName && (
               <div className="mt-3 pt-3 border-t text-[10px] text-slate-400 font-bold flex gap-1">
                 <User size={10}/> Sale: {lead.saleName}
               </div>
            )}
          </div>
        ))}
      </div>
      
      {filteredLeads.length === 0 && (
          <div className="text-center py-20 text-slate-400">Không tìm thấy dữ liệu</div>
      )}
    </div>
  );
}