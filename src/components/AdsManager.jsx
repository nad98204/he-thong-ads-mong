import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, X, 
  ChevronDown, ChevronRight, 
  Link as LinkIcon, Trash2, 
  BarChart3, Lock, PlayCircle, Image as ImageIcon,
  Facebook
} from 'lucide-react';

// --- IMPORT FIREBASE & AUTH ---
import { db } from '../firebase';
import { ref, set, onValue } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';

export default function AdsManager() {
  const { userPermissions, userRole } = useAuth();
  
  // --- KIỂM TRA QUYỀN TRUY CẬP ---
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

  // --- 2. KẾT NỐI FIREBASE ---
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

  const fmt = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);

  // --- LOGIC XỬ LÝ MEDIA (MỚI) ---
  const getEmbedUrl = (url) => {
    if (!url) return null;
    // Xử lý link Facebook để nhúng
    if (url.includes('facebook.com') || url.includes('fb.watch')) {
        // Đây là cách trick để nhúng video FB: dùng plugin page
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&t=0`;
    }
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.split('v=')[1] || url.split('/').pop();
        return `https://www.youtube.com/embed/${videoId}`;
    }
    return url; // Các link ảnh trực tiếp
  };

  // --- LOGIC XỬ LÝ KHÁC ---
  const handleAddCourse = () => {
    if (!canEdit) return;
    const val = prompt("Nhập tên khóa mới (VD: K38):");
    if (val && !config.courses.includes(val)) {
      pushToHistory(null, { ...config, courses: [...config.courses, val] });
      setFilterCourse(val);
    }
  };

  const handleDeleteCourse = (courseToDelete, e) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (confirm(`Bạn chắc chắn muốn xóa tab ${courseToDelete}?`)) {
      pushToHistory(null, { ...config, courses: config.courses.filter(c => c !== courseToDelete) });
      if (filterCourse === courseToDelete) setFilterCourse("ALL");
    }
  };

  const calculateMetrics = (item) => {
    const totalOrders = (Number(item.mong) || 0) + (Number(item.thanh) || 0);
    const revenue = totalOrders * (Number(item.price) || 0);
    const cpm = item.mess > 0 ? Math.round(item.spend / item.mess) : 0;
    const rate = item.mess > 0 ? ((totalOrders / item.mess) * 100).toFixed(1) : 0;
    const profit = revenue - (item.spend || 0) - (item.cost || 0);
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

  const handleAddCampaign = () => {
    if (!canEdit) return;
    const newId = `C${Math.floor(Math.random() * 10000)}`;
    const today = new Date().toISOString().split('T')[0];
    const newItem = {
      id: newId, date: today, course: filterCourse === "ALL" ? config.courses[1] || "K37" : filterCourse,
      name: "Camp mới...", headline: "", format: "Video", link: "", media: "",
      budget: 0, spend: 0, mess: 0, mong: 0, thanh: 0, price: 3500000, cost: 0,
      action: "Chờ", status: "DRAFT", content: ""
    };
    pushToHistory([newItem, ...data], null);
  };

  const handleDelete = (id) => { 
    if (!canEdit) return;
    if(confirm("Xóa dòng này?")) pushToHistory(data.filter(i => i.id !== id), null); 
  };

  const processedData = useMemo(() => {
    let result = data.map(calculateMetrics);
    if (filterCourse !== "ALL") result = result.filter(item => item.course === filterCourse);
    if (searchQuery) result = result.filter(item => item.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    return result;
  }, [data, filterCourse, searchQuery]);

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
               <div key={k} className={`group relative flex items-center px-4 py-2 rounded-md cursor-pointer transition-all whitespace-nowrap ${filterCourse === k ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setFilterCourse(k)}>
                  <span className="text-sm font-bold mr-1">{k === "ALL" ? "TỔNG HỢP" : k}</span>
                  {k !== "ALL" && canEdit && (
                    <button onClick={(e) => handleDeleteCourse(k, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5 rounded-full bg-white/10"><X size={10} /></button>
                  )}
               </div>
            ))}
            {canEdit && <button onClick={handleAddCourse} className="px-3 py-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg ml-1"><Plus size={16}/></button>}
         </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 w-full">
         <div className="relative flex-1 group">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none shadow-sm" placeholder="Tìm kiếm chiến dịch..."/>
            <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16}/>
         </div>
         <button onClick={handleAddCampaign} disabled={!canEdit} className={`bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold shadow flex items-center gap-2 text-sm transition-all ${!canEdit ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-orange-700'}`}><Plus size={18}/> Thêm QC</button>
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
                     <th className="p-3 w-28 sticky top-[40px] bg-slate-100">Ngày</th>
                     <th className="p-3 w-24 text-center sticky top-[40px] bg-slate-100">Khóa</th>
                     <th className="p-3 min-w-[200px] sticky top-[40px] bg-slate-100">Tên Bài</th>
                     <th className="p-3 min-w-[150px] sticky top-[40px] bg-slate-100">Tiêu đề</th>
                     <th className="p-3 w-28 text-center sticky top-[40px] bg-slate-100">Định dạng</th>
                     <th className="p-3 w-20 text-center sticky top-[40px] bg-slate-100">Link</th>
                     <th className="p-3 w-32 text-right border-r border-slate-300 sticky top-[40px] bg-slate-100">Ngân sách</th>
                     <th className="p-3 w-32 text-right bg-blue-50 text-blue-800 sticky top-[40px]">Tiền Tiêu</th>
                     <th className="p-3 w-20 text-center bg-blue-50 text-blue-800 sticky top-[40px]">Mess</th>
                     <th className="p-3 w-28 text-right bg-blue-50 text-blue-800 sticky top-[40px]">Giá Mess</th>
                     <th className="p-3 w-20 text-center bg-blue-50 text-blue-800 border-r border-blue-200 sticky top-[40px]">Rate</th>
                     <th className="p-3 w-20 text-center bg-green-50 sticky top-[40px]">Mong 🔥</th>
                     <th className="p-3 w-20 text-center bg-green-50 sticky top-[40px]">Thành 💧</th>
                     <th className="p-3 w-20 text-center bg-green-50 sticky top-[40px]">TỔNG</th>
                     <th className="p-3 w-20 text-center bg-green-50 sticky top-[40px]">% Chốt</th>
                     <th className="p-3 w-28 text-right bg-green-50 sticky top-[40px]">Giá Bán</th>
                     <th className="p-3 w-32 text-right bg-green-50 text-green-800 font-bold sticky top-[40px]">DOANH THU</th>
                     <th className="p-3 w-28 text-right bg-green-50 sticky top-[40px]">Tiền Gốc</th>
                     <th className="p-3 w-32 text-right bg-green-50 text-green-800 font-bold sticky top-[40px]">LỢI NHUẬN</th>
                     <th className="p-3 w-20 text-center bg-green-50 text-purple-700 font-black border-r border-green-200 sticky top-[40px]">ROAS</th>
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
                           
                           {/* Cột Link Mở Nhanh */}
                           <td className="p-3 text-center text-blue-600">
                             {item.link ? (
                               <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500">
                                  <Facebook size={14} className="mx-auto"/>
                               </a>
                             ) : (
                               <span className="text-slate-300">-</span>
                             )}
                           </td>

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
                        
                        {/* PHẦN MEDIA MỞ RỘNG */}
                        {expandedRow === item.id && (
                           <tr className="bg-slate-50 border-b border-slate-200 animate-in fade-in slide-in-from-top-2">
                              <td className="sticky left-0 bg-slate-50 z-10 border-r border-slate-100"></td>
                              <td colSpan="25" className="p-6">
                                 <div className="flex gap-6">
                                    {/* Cột 1: Nhập liệu Link */}
                                    <div className="w-1/3 space-y-4">
                                       <div>
                                          <div className="font-bold mb-2 text-xs text-slate-500 uppercase flex items-center gap-2">
                                            <Facebook size={14}/> Link Bài Quảng Cáo (Để click xem)
                                          </div>
                                          <input 
                                            readOnly={!canEdit} 
                                            className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 outline-none" 
                                            placeholder="Dán link bài viết Facebook vào đây..." 
                                            value={item.link} 
                                            onChange={(e) => handleUpdate(item.id, 'link', e.target.value)}
                                          />
                                       </div>
                                       <div>
                                          <div className="font-bold mb-2 text-xs text-slate-500 uppercase flex items-center gap-2">
                                            <PlayCircle size={14}/> Link Video/Ảnh (Để xem trực tiếp)
                                          </div>
                                          <input 
                                            readOnly={!canEdit} 
                                            className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-100 outline-none" 
                                            placeholder="Dán link video FB/Youtube hoặc link ảnh..." 
                                            value={item.media} 
                                            onChange={(e) => handleUpdate(item.id, 'media', e.target.value)}
                                          />
                                          <p className="text-[10px] text-slate-400 mt-1 italic">Hỗ trợ link video Facebook, Youtube hoặc link ảnh trực tiếp.</p>
                                       </div>
                                    </div>

                                    {/* Cột 2: Nội dung text */}
                                    <div className="w-1/3">
                                       <div className="font-bold mb-2 text-xs text-slate-500 uppercase">Nội dung Content</div>
                                       <textarea 
                                          readOnly={!canEdit} 
                                          className="w-full h-40 p-3 text-xs border border-slate-300 rounded-lg resize-none bg-white focus:ring-2 focus:ring-blue-100 outline-none" 
                                          placeholder="Viết nội dung quảng cáo ở đây..."
                                          value={item.content} 
                                          onChange={(e) => handleUpdate(item.id, 'content', e.target.value)}
                                       />
                                    </div>

                                    {/* Cột 3: Preview Media */}
                                    <div className="w-1/3">
                                       <div className="font-bold mb-2 text-xs text-slate-500 uppercase flex items-center gap-2">
                                          <ImageIcon size={14}/> Xem trước
                                       </div>
                                       <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-slate-200 relative group">
                                          {item.media ? (
                                             item.media.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                                                <img src={item.media} alt="Preview" className="w-full h-full object-cover"/>
                                             ) : (
                                                <iframe 
                                                  src={getEmbedUrl(item.media)} 
                                                  className="w-full h-full border-none" 
                                                  allowFullScreen 
                                                  title="Preview Video"
                                                  scrolling="no"
                                                />
                                             )
                                          ) : (
                                             <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100">
                                                <PlayCircle size={32} className="mb-2 opacity-50"/>
                                                <span className="text-xs">Chưa có video/ảnh</span>
                                             </div>
                                          )}
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
    </div>
  );
}