import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Calculator, Save, ExternalLink, Link, ChevronDown, Check, Layers, FolderPlus, Download, Upload, Eye, X, FileText, Image as ImageIcon, PlayCircle, MonitorPlay, Facebook, Video, Search, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

// --- IMPORT FIREBASE ---
import { db } from '../firebase';
import { ref, onValue, set } from "firebase/database";

const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(val);
const parseNumber = (val) => parseInt(val.toString().replace(/\D/g, ''), 10) || 0;

export default function AdsManager() {
  const [courses, setCourses] = useState(['K36']);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState(null); 

  // --- KẾT NỐI DATABASE ---
  useEffect(() => {
    const adsRef = ref(db, 'ads_data/list');
    onValue(adsRef, (snapshot) => { setData(snapshot.val() || []); setLoading(false); });
    const coursesRef = ref(db, 'ads_data/courses');
    onValue(coursesRef, (snapshot) => { if (snapshot.val()) setCourses(snapshot.val()); });
  }, []);

  const saveToCloud = (newData, newCourses) => {
    if(newData) set(ref(db, 'ads_data/list'), newData);
    if(newCourses) set(ref(db, 'ads_data/courses'), newCourses);
  };

  const [currentView, setCurrentView] = useState('ALL'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const fileInputRef = useRef(null);

  // --- RENDER MEDIA CONTENT ---
  const renderMediaContent = (url) => {
    if (!url) return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
         <div className="bg-slate-800/50 p-6 rounded-full mb-4 ring-1 ring-slate-700"><ImageIcon size={48} className="opacity-50"/></div>
         <p className="text-sm font-medium text-slate-300">Chưa có nội dung Media</p>
         <p className="text-xs opacity-50 mt-1">Chọn bài từ thư viện hoặc dán link</p>
      </div>
    );

    if (url.includes('facebook.com') || url.includes('fb.watch')) {
        const encodedUrl = encodeURIComponent(url);
        if (url.includes('/videos/') || url.includes('/watch') || url.includes('fb.watch')) {
            return <iframe src={`https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&t=0`} className="w-full h-full rounded-xl shadow-2xl bg-black" style={{border: 'none', overflow: 'hidden'}} allowFullScreen={true}></iframe>;
        }
        return <iframe src={`https://www.facebook.com/plugins/post.php?href=${encodedUrl}&show_text=true`} className="w-full h-full rounded-xl shadow-2xl bg-white" style={{border: 'none', overflow: 'hidden'}} allowFullScreen={true}></iframe>;
    }

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let embedUrl = url.includes('watch?v=') ? url.replace('watch?v=', 'embed/') : url.replace('youtu.be/', 'youtube.com/embed/');
      embedUrl = embedUrl.split('&')[0]; 
      return <iframe src={embedUrl} className="w-full h-full rounded-xl bg-black shadow-2xl" allowFullScreen></iframe>;
    }

    if (url.includes('drive.google.com') && url.includes('/view')) {
        return <iframe src={url.replace('/view', '/preview')} className="w-full h-full rounded-xl bg-black shadow-2xl" allowFullScreen></iframe>;
    }

    if (url.match(/\.(mp4|webm|mov)$/i)) {
       return <video src={url} controls className="w-full h-full rounded-xl bg-black shadow-2xl" />;
    }

    if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
       return <img src={url} alt="Media" className="w-full h-full object-contain rounded-xl bg-slate-900/50 shadow-2xl backdrop-blur-sm"/>;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-900/80 text-white p-8 text-center rounded-xl border border-slate-700/50 backdrop-blur-md">
            <MonitorPlay size={56} className="mb-4 text-blue-400 animate-pulse"/>
            <h3 className="text-lg font-bold mb-2">Nguồn Bên Ngoài</h3>
            <a href={url} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/30 text-sm mt-4"><ExternalLink size={16}/> Mở Liên Kết</a>
        </div>
    );
  };

  // --- LOGIC ---
  const uniqueCampaigns = useMemo(() => {
    const map = new Map();
    data.forEach(item => { if (item.contentName && !map.has(item.contentName)) map.set(item.contentName, item); });
    return Array.from(map.values());
  }, [data]);

  const filteredData = useMemo(() => {
    if (currentView === 'ALL') return data;
    return data.filter(item => item.course === currentView);
  }, [data, currentView]);

  const calculateRow = (row) => {
    const totalOrders = row.ordersMong + row.ordersThanh;
    const pricePerMess = row.mess > 0 ? row.spent / row.mess : 0;
    const closeRate = row.mess > 0 ? (totalOrders / row.mess) * 100 : 0;
    const revenue = totalOrders * row.pricePerCourse;
    const profit = revenue - row.spent - row.baseCost; 
    const roas = row.spent > 0 ? revenue / row.spent : 0;
    return { ...row, totalOrders, pricePerMess, closeRate, revenue, profit, roas };
  };

  const summary = useMemo(() => filteredData.reduce((acc, curr) => {
    const row = calculateRow(curr);
    acc.spent += row.spent; acc.mess += row.mess;
    acc.ordersMong += row.ordersMong; acc.ordersThanh += row.ordersThanh;
    acc.revenue += row.revenue; acc.profit += row.profit;
    return acc;
  }, { spent: 0, mess: 0, ordersMong: 0, ordersThanh: 0, revenue: 0, profit: 0 }), [filteredData]);

  const summaryRoas = summary.spent > 0 ? summary.revenue / summary.spent : 0;
  const summaryTotalOrders = summary.ordersMong + summary.ordersThanh;
  const summaryCloseRate = summary.mess > 0 ? (summaryTotalOrders / summary.mess) * 100 : 0;
  const summaryPricePerMess = summary.mess > 0 ? summary.spent / summary.mess : 0;

  // --- ACTIONS ---
  const update = (id, field, value) => {
    let newData = data.map(row => {
      if (row.id === id) {
        if (field === 'contentName') {
           const existItem = uniqueCampaigns.find(c => c.contentName === value);
           if (existItem) {
             return { ...row, [field]: value, contentMain: existItem.contentMain, format: existItem.format, mediaUrl: existItem.mediaUrl || "", contentFull: existItem.contentFull || "" };
           }
        }
        return { ...row, [field]: value };
      }
      return row;
    });
    setData(newData);
    if (previewItem && previewItem.id === id) setPreviewItem(newData.find(r => r.id === id));
    saveToCloud(newData, null);
  };

  const remove = (id) => { if(window.confirm("Xóa dòng này?")) { const newData = data.filter(r => r.id !== id); setData(newData); saveToCloud(newData, null); }};
  
  const addNew = () => {
    const defaultCourse = currentView === 'ALL' ? courses[courses.length-1] : currentView;
    const today = new Date().toISOString().split('T')[0];
    const newRow = { id: Date.now(), date: today, course: defaultCourse, contentName: "", contentMain: "", format: "Video", budget: 0, spent: 0, mess: 0, ordersMong: 0, ordersThanh: 0, pricePerCourse: 3500000, baseCost: 0, evaluation: "normal", action: "monitor", status: "new", link: "", mediaUrl: "", contentFull: "" };
    const newData = [...data, newRow];
    setData(newData);
    saveToCloud(newData, null);
  };

  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;
    if (courses.includes(newCourseName.trim())) return alert("Khóa này đã có!");
    const newCourses = [...courses, newCourseName.trim()];
    setCourses(newCourses); setCurrentView(newCourseName.trim()); setNewCourseName(""); saveToCloud(null, newCourses);
  };

  const handleExport = () => {
    const backupData = { courses, data, timestamp: new Date().toISOString() };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const a = document.createElement('a'); a.href = dataStr; a.download = `ADS_BACKUP_${new Date().toISOString().split('T')[0]}.json`; a.click();
  };

  const handleImport = (e) => {
    const reader = new FileReader();
    if(e.target.files[0]){
      reader.readAsText(e.target.files[0]);
      reader.onload = ev => {
        try {
            const parsed = JSON.parse(ev.target.result);
            if(window.confirm("Dữ liệu hiện tại sẽ bị ghi đè?")) { setCourses(parsed.courses); setData(parsed.data); saveToCloud(parsed.data, parsed.courses); }
        } catch(err) { alert("Lỗi file!"); }
      };
    }
  };

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 font-medium"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>Đang tải dữ liệu...</div>;

  return (
    <div className="bg-[#f8fafc] min-h-screen font-sans text-xs text-slate-700" onClick={() => setIsMenuOpen(false)}>
      {/* GLOBAL STYLE FOR SCROLLBAR */}
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .glass-header { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(8px); }
      `}</style>

      {/* --- MODAL CINEMA MODE (DARK THEME) --- */}
      {previewItem && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
           <div className="absolute inset-0" onClick={() => setPreviewItem(null)}></div>
           <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-[1400px] h-full max-h-[90vh] flex overflow-hidden relative z-10 border border-slate-800 animate-in zoom-in-95 duration-300 flex-col lg:flex-row">
              <button onClick={() => setPreviewItem(null)} className="absolute top-4 right-4 z-50 bg-black/40 hover:bg-red-500 text-white p-2 rounded-full transition-all backdrop-blur border border-white/10"><X size={18}/></button>

              <div className="w-full lg:w-2/3 bg-black flex flex-col relative group justify-center items-center h-[50vh] lg:h-auto border-b lg:border-b-0 lg:border-r border-slate-800">
                  <div className="flex-1 w-full h-full flex items-center justify-center p-2 lg:p-6 overflow-hidden">
                      {renderMediaContent(previewItem.mediaUrl)}
                  </div>
                  <div className="w-full p-4 bg-gradient-to-t from-black via-black/80 to-transparent absolute bottom-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                     <div className="flex items-center gap-2 max-w-2xl mx-auto bg-slate-800/90 backdrop-blur rounded-full px-4 py-2 border border-slate-600 shadow-xl">
                         <Link size={14} className="text-blue-400 shrink-0"/>
                         <input value={previewItem.mediaUrl || ""} onChange={(e) => update(previewItem.id, 'mediaUrl', e.target.value)} placeholder="Dán link Facebook / YouTube / Ảnh..." className="flex-1 bg-transparent text-white text-xs outline-none placeholder-slate-500"/>
                     </div>
                  </div>
              </div>

              <div className="w-full lg:w-1/3 flex flex-col bg-white h-[50vh] lg:h-auto">
                  <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                      <div>
                          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2 mb-1"><FileText size={18} className="text-blue-600"/> Soạn Thảo Content</h3>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-slate-400">Campaign:</span>
                             <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 truncate max-w-[150px]">{previewItem.contentName || "..."}</span>
                          </div>
                      </div>
                      <span className="text-[10px] font-bold px-3 py-1 bg-slate-200 text-slate-600 rounded-full border border-slate-300">{previewItem.format}</span>
                  </div>
                  <div className="flex-1 relative bg-white">
                      <textarea value={previewItem.contentFull || ""} onChange={(e) => update(previewItem.id, 'contentFull', e.target.value)} placeholder="Viết nội dung quảng cáo, tiêu đề, hastag... (Tự động lưu)" className="w-full h-full bg-transparent outline-none text-slate-700 text-sm leading-relaxed resize-none p-6 focus:bg-blue-50/10 transition-colors"></textarea>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* --- HEADER CONTROL CENTER --- */}
      <div className="sticky top-0 z-40 glass-header border-b border-slate-200/60 shadow-sm px-4 py-3 mb-4">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Menu Dropdown Premium */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-3 bg-white text-slate-700 px-4 py-2 rounded-xl font-bold border border-slate-200 hover:border-blue-300 hover:shadow-md hover:text-blue-700 transition-all min-w-[200px] justify-between group active:scale-95">
                <span className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg transition-colors ${currentView === 'ALL' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                      {currentView === 'ALL' ? <Layers size={16}/> : <Calculator size={16}/>}
                    </div>
                    {currentView === 'ALL' ? 'TỔNG HỢP' : `KHÓA: ${currentView}`}
                </span>
                <ChevronDown size={14} className={`transition-transform duration-300 text-slate-400 group-hover:text-blue-500 ${isMenuOpen ? 'rotate-180' : ''}`}/>
              </button>
              
              {isMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                  <div onClick={() => { setCurrentView('ALL'); setIsMenuOpen(false); }} className={`px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-slate-50 border-b border-slate-50 transition-colors ${currentView === 'ALL' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-600'}`}>
                      <span className="font-bold flex items-center gap-3 text-sm"><Layers size={16}/> Xem Tổng Hợp</span>
                      {currentView === 'ALL' && <Check size={16} className="text-blue-600"/>}
                  </div>
                  <div className="max-h-[250px] overflow-y-auto py-2 custom-scrollbar">
                    <div className="px-5 py-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Danh sách khóa</div>
                    {courses.map(course => (
                      <div key={course} onClick={() => { setCurrentView(course); setIsMenuOpen(false); }} className={`px-5 py-2.5 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${currentView === course ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-600'}`}>
                          <span className="flex items-center gap-2">🔥 {course}</span>
                          {currentView === course && <Check size={14}/>}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-slate-50 border-t border-slate-100">
                     <div className="flex gap-2 bg-white border border-slate-200 rounded-lg p-1 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all shadow-sm">
                        <input type="text" placeholder="Tên khóa mới..." value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} className="w-full px-2 py-1 outline-none text-sm bg-transparent placeholder-slate-400" onKeyDown={(e) => e.key === 'Enter' && handleAddCourse()}/>
                        <button onClick={handleAddCourse} className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 transition-colors"><Plus size={16}/></button>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stat Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               {filteredData.length} Camp
            </div>
          </div>

          <div className="flex gap-2">
              <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                <button onClick={handleExport} className="p-2 hover:bg-slate-50 rounded text-slate-500 hover:text-blue-600 transition-colors" title="Backup"><Download size={16}/></button>
                <button onClick={() => fileInputRef.current.click()} className="p-2 hover:bg-slate-50 rounded text-slate-500 hover:text-orange-600 transition-colors" title="Restore"><Upload size={16}/></button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json"/>
              <button onClick={addNew} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 text-sm active:scale-95"><Plus size={18}/> Thêm Mới</button>
          </div>
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="px-4 pb-20">
        <div className="bg-white rounded-xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse min-w-[2000px]">
                <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-bold uppercase text-center tracking-wider text-[10px] border-b border-slate-200">
                        <th className="p-2 border-r border-slate-100" colSpan={6}>THÔNG TIN CƠ BẢN</th>
                        <th className="p-2 border-r border-slate-100 bg-amber-50/50 text-amber-700" colSpan={4}>HIỆU QUẢ QUẢNG CÁO</th>
                        <th className="p-2 border-r border-slate-100 bg-emerald-50/50 text-emerald-700" colSpan={8}>KẾT QUẢ KINH DOANH</th>
                        <th className="p-2 bg-indigo-50/50 text-indigo-700" colSpan={5}>HÀNH ĐỘNG & TRẠNG THÁI</th>
                    </tr>
                    <tr className="bg-white text-slate-600 font-bold text-center whitespace-nowrap text-[11px] border-b border-slate-200">
                        <th className="p-3 border-r border-slate-100 w-24">Ngày</th>
                        <th className="p-3 border-r border-slate-100 w-16">Khóa</th>
                        <th className="p-3 border-r border-slate-100 w-48 text-left pl-4">ID / Tên Bài (Gợi ý)</th>
                        <th className="p-3 border-r border-slate-100 w-28">Content</th> 
                        <th className="p-3 border-r border-slate-100 w-48 text-left pl-4">Tiêu đề chính</th>
                        <th className="p-3 border-r border-slate-100 w-24">Định dạng</th>
                        <th className="p-3 border-r border-slate-100 bg-amber-50/30 w-28">Ngân sách</th>
                        <th className="p-3 border-r border-slate-100 bg-amber-50/30 w-28">Tiền Tiêu</th>
                        <th className="p-3 border-r border-slate-100 bg-amber-50/30 w-16">Mess</th>
                        <th className="p-3 border-r border-slate-100 bg-amber-50/30 w-24">Giá Mess</th>
                        <th className="p-3 border-r border-slate-100 bg-emerald-50/30 w-20 text-rose-600">Mong 🔥</th>
                        <th className="p-3 border-r border-slate-100 bg-emerald-50/30 w-20 text-sky-600">Thành 💧</th>
                        <th className="p-3 border-r border-slate-100 bg-emerald-50/30 w-20">Tổng</th>
                        <th className="p-3 border-r border-slate-100 bg-emerald-50/30 w-16">Chốt</th>
                        <th className="p-3 border-r border-slate-100 bg-emerald-50/30 w-28">Doanh Thu</th>
                        <th className="p-3 border-r border-slate-100 bg-emerald-50/30 w-24 text-slate-400">Tiền Gốc</th>
                        <th className="p-3 border-r border-slate-100 bg-emerald-50/30 w-28">Lợi Nhuận</th>
                        <th className="p-3 border-r border-slate-100 bg-emerald-50/30 w-16 text-purple-700">ROAS</th>
                        <th className="p-3 border-r border-slate-100 w-28">Đánh giá</th>
                        <th className="p-3 border-r border-slate-100 w-28">Hành động</th>
                        <th className="p-3 border-r border-slate-100 w-24">Status</th>
                        <th className="p-3 border-r border-slate-100 w-20">Link</th>
                        <th className="p-3 w-10"></th>
                    </tr>
                </thead>
                <tbody className="text-xs">
                    {/* STICKY SUMMARY ROW */}
                    <tr className="bg-slate-50 font-bold border-b-2 border-slate-200 sticky top-0 z-20 shadow-sm text-slate-700">
                        <td className="p-3 text-center text-rose-600 font-extrabold" colSpan={6}>📊 TỔNG KẾT ({currentView})</td>
                        <td className="p-3 text-right text-slate-400">-</td>
                        <td className="p-3 text-right text-rose-600 font-extrabold bg-rose-50/50">{formatNumber(summary.spent)}</td>
                        <td className="p-3 text-center">{summary.mess}</td>
                        <td className="p-3 text-right text-slate-500 italic">{formatNumber(summaryPricePerMess)}</td>
                        <td className="p-3 text-center text-rose-600">{summary.ordersMong}</td>
                        <td className="p-3 text-center text-sky-600">{summary.ordersThanh}</td>
                        <td className="p-3 text-center text-lg text-slate-900">{summaryTotalOrders}</td>
                        <td className="p-3 text-center italic">{summaryCloseRate.toFixed(1)}%</td>
                        <td className="p-3 text-right text-emerald-700 font-bold bg-emerald-50/50">{formatNumber(summary.revenue)}</td>
                        <td className="p-3 bg-slate-100"></td>
                        <td className="p-3 text-right text-blue-700 font-extrabold bg-blue-50/50">{formatNumber(summary.profit)}</td>
                        <td className={`p-3 text-center text-lg ${summaryRoas > 4 ? 'text-emerald-600' : 'text-rose-500'}`}>{summaryRoas.toFixed(2)}</td>
                        <td className="p-3" colSpan={5}></td>
                    </tr>
                    
                    {filteredData.map((row, index) => {
                    const c = calculateRow(row);
                    let roasColor = c.roas > 4 ? "text-emerald-600 font-bold" : (c.roas < 1.5 && c.spent > 0 ? "text-rose-600 font-bold" : "text-slate-600");
                    const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/30";
                    return (
                        <tr key={row.id} className={`${rowBg} hover:bg-blue-50/60 transition-colors group border-b border-slate-100`}>
                        <td className="p-1 border-r border-slate-100"><input type="date" value={row.date} onChange={e => update(row.id, 'date', e.target.value)} className="w-full bg-transparent outline-none text-[10px] text-slate-500 text-center font-medium"/></td>
                        <td className="p-1 border-r border-slate-100 text-center"><span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 rounded-md text-slate-600 shadow-sm">{row.course}</span></td>
                        
                        <td className="p-1 border-r border-slate-100 relative">
                            <div className="flex items-center group/input">
                                <Search size={12} className="text-slate-300 absolute left-2 group-focus-within/input:text-blue-400"/>
                                <input list={`list-${row.id}`} value={row.contentName} onChange={e => update(row.id, 'contentName', e.target.value)} className="w-full bg-transparent outline-none pl-7 pr-1 text-blue-700 font-bold placeholder-slate-300 py-2 focus:bg-white rounded transition-colors" placeholder="Tìm..." />
                            </div>
                            <datalist id={`list-${row.id}`}>{uniqueCampaigns.map(uc => <option key={uc.id} value={uc.contentName}/>)}</datalist>
                        </td>

                        <td className="p-1 border-r border-slate-100 text-center">
                            <button onClick={() => setPreviewItem(row)} className={`flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[10px] font-bold border transition-all transform active:scale-95 ${row.mediaUrl || row.contentFull ? 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 hover:shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}>
                                {row.mediaUrl && (row.mediaUrl.includes('facebook') ? <Facebook size={12}/> : <Video size={12}/>)}
                                {(!row.mediaUrl && !row.contentFull) ? 'Trống' : 'Xem Ads'}
                            </button>
                        </td>
                        
                        <td className="p-1 border-r border-slate-100"><input value={row.contentMain} onChange={e => update(row.id, 'contentMain', e.target.value)} className="w-full bg-transparent outline-none px-2 py-2 text-slate-700" placeholder="..." /></td>
                        <td className="p-1 border-r border-slate-100"><select value={row.format} onChange={e => update(row.id, 'format', e.target.value)} className="w-full bg-transparent outline-none text-center text-[10px] font-bold text-slate-500 uppercase"><option>Video</option><option>Image</option><option>Reels</option></select></td>

                        <td className="p-1 border-r border-slate-100 bg-amber-50/20"><input value={row.budget === 0 ? '' : formatNumber(row.budget)} onChange={e => update(row.id, 'budget', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-right px-2 py-2 text-slate-400 focus:text-slate-900 font-medium transition-colors" placeholder="0" /></td>
                        <td className="p-1 border-r border-slate-100 bg-amber-50/20"><input value={row.spent === 0 ? '' : formatNumber(row.spent)} onChange={e => update(row.id, 'spent', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-right px-2 py-2 font-bold text-slate-700" /></td>
                        <td className="p-1 border-r border-slate-100 bg-amber-50/20"><input value={row.mess === 0 ? '' : row.mess} type="number" onChange={e => update(row.id, 'mess', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-center px-1 py-2 text-slate-700" /></td>
                        <td className="p-1 border-r border-slate-100 bg-amber-50/20 text-right text-slate-500 text-[10px] px-2 font-medium">{formatNumber(c.pricePerMess)}</td>
                        <td className="p-1 border-r border-slate-100 bg-emerald-50/20"><input value={row.ordersMong === 0 ? '' : row.ordersMong} type="number" onChange={e => update(row.id, 'ordersMong', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-center px-1 py-2 text-rose-500 font-bold" /></td>
                        <td className="p-1 border-r border-slate-100 bg-emerald-50/20"><input value={row.ordersThanh === 0 ? '' : row.ordersThanh} type="number" onChange={e => update(row.id, 'ordersThanh', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-center px-1 py-2 text-sky-600 font-bold" /></td>
                        <td className="p-1 border-r border-slate-100 bg-emerald-50/20 text-center font-bold text-lg text-slate-700">{c.totalOrders}</td>
                        <td className="p-1 border-r border-slate-100 bg-emerald-50/20 text-center text-[10px] text-slate-500">{c.closeRate.toFixed(1)}%</td>
                        <td className="p-1 border-r border-slate-100 bg-emerald-50/20 text-right font-medium text-emerald-700 px-2">{formatNumber(c.revenue)}</td>
                        <td className="p-1 border-r border-slate-100 bg-emerald-50/20"><input value={row.baseCost === 0 ? '' : formatNumber(row.baseCost)} onChange={e => update(row.id, 'baseCost', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-right px-2 py-2 text-slate-300 text-[10px] focus:text-rose-500 transition-colors" placeholder="0" /></td>
                        <td className="p-1 border-r border-slate-100 bg-emerald-50/20 text-right font-bold text-blue-700 px-2">{formatNumber(c.profit)}</td>
                        <td className={`p-1 border-r border-slate-100 bg-emerald-50/20 text-center text-sm ${roasColor}`}>{c.roas.toFixed(2)}</td>
                        
                        <td className="p-1 border-r border-slate-100"><select value={row.evaluation} onChange={e => update(row.id, 'evaluation', e.target.value)} className="w-full bg-transparent outline-none text-center text-[10px] cursor-pointer text-slate-600 font-medium"><option value="good">🌟 Tốt</option><option value="normal">✅ Ổn</option><option value="warn">⚠️ Kém</option><option value="bad">💸 Lỗ</option></select></td>
                        <td className="p-1 border-r border-slate-100 text-center"><select value={row.action} onChange={e => update(row.id, 'action', e.target.value)} className={`w-[90%] outline-none text-center text-[10px] cursor-pointer rounded-full px-1 py-1 font-bold shadow-sm transition-all ${row.action === 'scale' ? 'bg-purple-100 text-purple-700 border border-purple-200' : (row.action === 'stop' ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200')}`}><option value="scale">🚀 Tăng</option><option value="monitor">👀 Xem</option><option value="optimize">🔧 Sửa</option><option value="stop">🛑 Tắt</option></select></td>
                        <td className="p-1 border-r border-slate-100 text-center"><select value={row.status} onChange={e => update(row.id, 'status', e.target.value)} className={`w-auto outline-none text-center uppercase text-[10px] cursor-pointer font-extrabold ${row.status === 'active' ? 'text-emerald-500' : 'text-slate-300'}`}><option value="active">ON</option><option value="paused">OFF</option><option value="new">NEW</option></select></td>
                        
                        <td className="p-1 border-r border-slate-100 text-center">{row.link ? (<a href={row.link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"><ExternalLink size={10}/></a>) : (<input type="text" value={row.link} onChange={e => update(row.id, 'link', e.target.value)} placeholder="Link..." className="w-full bg-transparent outline-none text-[10px] text-slate-300 focus:text-blue-600 text-center"/>)}</td>
                        <td className="p-1 text-center"><button onClick={() => remove(row.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 hover:bg-rose-50 rounded"><Trash2 size={14}/></button></td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </div>
            {filteredData.length === 0 && (
                <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                    <Layers size={48} className="mb-2 opacity-20"/>
                    <p>Chưa có dữ liệu cho khóa này.</p>
                    <button onClick={addNew} className="mt-4 text-blue-600 font-bold hover:underline">Thêm dòng mới ngay</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}