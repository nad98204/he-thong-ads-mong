import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Calculator, Save, ExternalLink, Link, ChevronDown, Check, Layers, FolderPlus, Download, Upload, Eye, X, FileText, Image as ImageIcon, PlayCircle, MonitorPlay, Facebook, Video, Search } from 'lucide-react';

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

  // --- XỬ LÝ MEDIA FACEBOOK & CÁC NGUỒN KHÁC (CỰC MẠNH) ---
  const renderMediaContent = (url) => {
    if (!url) return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
         <div className="bg-slate-800 p-4 rounded-full mb-3"><ImageIcon size={40} className="opacity-50"/></div>
         <p className="text-sm font-medium">Chưa có nội dung Media</p>
         <p className="text-xs opacity-50">Dán link ảnh/video vào bên dưới</p>
      </div>
    );

    // 1. Xử lý FACEBOOK (Video & Post)
    if (url.includes('facebook.com') || url.includes('fb.watch')) {
        const encodedUrl = encodeURIComponent(url);
        // Nếu là Video
        if (url.includes('/videos/') || url.includes('/watch') || url.includes('fb.watch')) {
            return (
                <iframe 
                    src={`https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&t=0`} 
                    className="w-full h-full rounded-lg shadow-2xl bg-black" 
                    style={{border: 'none', overflow: 'hidden'}} 
                    allowFullScreen={true} 
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
                </iframe>
            );
        }
        // Nếu là Bài viết (Ảnh)
        return (
            <iframe 
                src={`https://www.facebook.com/plugins/post.php?href=${encodedUrl}&show_text=true`} 
                className="w-full h-full rounded-lg shadow-2xl bg-white" 
                style={{border: 'none', overflow: 'hidden'}} 
                allowFullScreen={true} 
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
            </iframe>
        );
    }

    // 2. YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let embedUrl = url;
      if (url.includes('watch?v=')) embedUrl = url.replace('watch?v=', 'embed/');
      else if (url.includes('youtu.be/')) embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
      embedUrl = embedUrl.split('&')[0]; 
      return <iframe src={embedUrl} className="w-full h-full rounded-lg bg-black shadow-2xl" allowFullScreen></iframe>;
    }

    // 3. Google Drive
    if (url.includes('drive.google.com') && url.includes('/view')) {
        return <iframe src={url.replace('/view', '/preview')} className="w-full h-full rounded-lg bg-black shadow-2xl" allowFullScreen></iframe>;
    }

    // 4. Video trực tiếp (.mp4)
    if (url.match(/\.(mp4|webm|mov)$/i)) {
       return <video src={url} controls className="w-full h-full rounded-lg bg-black shadow-2xl" />;
    }

    // 5. Ảnh trực tiếp
    if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i)) {
       return <img src={url} alt="Media" className="w-full h-full object-contain rounded-lg bg-slate-900 shadow-2xl"/>;
    }

    // 6. Link khác
    return (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8 text-center rounded-lg border border-slate-700">
            <MonitorPlay size={48} className="mb-4 text-blue-400 animate-pulse"/>
            <h3 className="text-lg font-bold mb-2">Nguồn Bên Ngoài</h3>
            <p className="text-slate-400 text-xs mb-6 max-w-xs">Link này không hỗ trợ xem trước trực tiếp.</p>
            <a href={url} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/30">
                <ExternalLink size={16}/> MỞ LIÊN KẾT
            </a>
        </div>
    );
  };

  // --- LOGIC GỢI Ý ---
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

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600 font-bold bg-gray-50">⏳ Đang tải dữ liệu...</div>;

  return (
    <div className="p-4 bg-gray-50 min-h-screen font-sans text-xs text-gray-700" onClick={() => setIsMenuOpen(false)}>
      
      {/* --- MODAL CINEMA MODE (PREMIUM UI) --- */}
      {previewItem && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0" onClick={() => setPreviewItem(null)}></div>
           <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-[1400px] h-[90vh] flex overflow-hidden relative z-10 border border-slate-700 animate-in zoom-in-95 duration-300">
              
              <button onClick={() => setPreviewItem(null)} className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-red-600 text-white p-2 rounded-full transition-all backdrop-blur"><X size={20}/></button>

              <div className="flex w-full h-full flex-col lg:flex-row">
                  {/* CỘT TRÁI: MEDIA VIEWER (RẠP CHIẾU PHIM) */}
                  <div className="w-full lg:w-2/3 bg-black flex flex-col relative group justify-center items-center">
                      <div className="flex-1 w-full h-full flex items-center justify-center p-4 overflow-hidden">
                          {renderMediaContent(previewItem.mediaUrl)}
                      </div>
                      
                      {/* Thanh nhập link mờ ảo bên dưới */}
                      <div className="w-full p-4 bg-gradient-to-t from-black to-transparent absolute bottom-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <div className="flex items-center gap-2 max-w-2xl mx-auto bg-slate-800/80 backdrop-blur rounded-full px-4 py-2 border border-slate-600">
                             <Link size={14} className="text-blue-400"/>
                             <input 
                                value={previewItem.mediaUrl || ""}
                                onChange={(e) => update(previewItem.id, 'mediaUrl', e.target.value)}
                                placeholder="Dán link Facebook / YouTube / Ảnh vào đây..."
                                className="flex-1 bg-transparent text-white text-xs outline-none placeholder-slate-400"
                             />
                         </div>
                      </div>
                  </div>

                  {/* CỘT PHẢI: NỘI DUNG (GIẤY TRẮNG) */}
                  <div className="w-full lg:w-1/3 flex flex-col bg-white border-l border-slate-700">
                      <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                          <div>
                              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-1"><FileText size={20} className="text-blue-600"/> Soạn Thảo Content</h3>
                              <p className="text-xs text-gray-500">Chiến dịch: <span className="font-bold text-blue-600">{previewItem.contentName || "Chưa đặt tên"}</span></p>
                          </div>
                          <span className="text-[10px] font-bold px-3 py-1 bg-slate-200 text-slate-600 rounded-full">{previewItem.format}</span>
                      </div>
                      <div className="flex-1 relative">
                          <textarea 
                             value={previewItem.contentFull || ""}
                             onChange={(e) => update(previewItem.id, 'contentFull', e.target.value)}
                             placeholder="Viết nội dung quảng cáo, tiêu đề, hastag... (Dữ liệu sẽ tự động lưu)"
                             className="w-full h-full bg-white outline-none text-slate-700 text-sm leading-7 resize-none p-6 focus:bg-blue-50/10 transition-colors"
                          ></textarea>
                      </div>
                      <div className="p-4 bg-gray-50 border-t text-xs text-gray-400 text-center">
                          Tự động lưu vào hệ thống đám mây
                      </div>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* --- MAIN HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Menu Dropdown Đẹp */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-3 bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-bold border border-slate-200 hover:bg-white hover:shadow-md transition-all min-w-[220px] justify-between group">
              <span className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${currentView === 'ALL' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                    {currentView === 'ALL' ? <Layers size={18}/> : <Calculator size={18}/>}
                  </div>
                  {currentView === 'ALL' ? 'TỔNG HỢP (ALL)' : `KHÓA: ${currentView}`}
              </span>
              <ChevronDown size={16} className={`transition-transform duration-300 text-gray-400 group-hover:text-gray-600 ${isMenuOpen ? 'rotate-180' : ''}`}/>
            </button>
            
            {/* Dropdown Content */}
            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div onClick={() => { setCurrentView('ALL'); setIsMenuOpen(false); }} className={`px-5 py-4 cursor-pointer flex items-center justify-between hover:bg-slate-50 border-b border-gray-100 transition-colors ${currentView === 'ALL' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-600'}`}>
                    <span className="font-bold flex items-center gap-3"><Layers size={18}/> Xem Tổng Hợp</span>
                    {currentView === 'ALL' && <Check size={18} className="text-blue-600"/>}
                </div>
                <div className="max-h-[300px] overflow-y-auto py-2">
                  <div className="px-5 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Danh sách khóa</div>
                  {courses.map(course => (
                    <div key={course} onClick={() => { setCurrentView(course); setIsMenuOpen(false); }} className={`px-5 py-3 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${currentView === course ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-gray-600'}`}>
                        <span className="flex items-center gap-2">🔥 {course}</span>
                        {currentView === course && <Check size={16}/>}
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-slate-50 border-t border-gray-100">
                   <div className="flex gap-2 bg-white border border-gray-200 rounded-lg p-1 focus-within:ring-2 ring-blue-100 transition-all">
                      <input type="text" placeholder="Tên khóa mới (VD: K39)..." value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} className="w-full px-3 py-1 outline-none text-sm bg-transparent" onKeyDown={(e) => e.key === 'Enter' && handleAddCourse()}/>
                      <button onClick={handleAddCourse} className="bg-blue-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-blue-700 shadow-sm"><Plus size={16}/></button>
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
             {filteredData.length} Chiến dịch
          </div>
        </div>

        <div className="flex gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 bg-white text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"><Download size={14}/> Backup</button>
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-white text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"><Upload size={14}/> Restore</button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json"/>
            <button onClick={addNew} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5"><Plus size={18}/> Thêm Mới</button>
        </div>
      </div>

      <div className="overflow-hidden bg-white rounded-xl shadow-lg border border-slate-200 pb-20">
        <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[2000px]">
            <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-center tracking-wider text-[10px] border-b border-slate-200">
                    <th className="p-3 border-r border-slate-100" colSpan={6}>THÔNG TIN CƠ BẢN</th>
                    <th className="p-3 border-r border-slate-100 bg-yellow-50/50 text-yellow-700" colSpan={4}>HIỆU QUẢ QUẢNG CÁO</th>
                    <th className="p-3 border-r border-slate-100 bg-green-50/50 text-green-700" colSpan={8}>KẾT QUẢ KINH DOANH</th>
                    <th className="p-3 bg-blue-50/50 text-blue-700" colSpan={5}>HÀNH ĐỘNG & STATUS</th>
                </tr>
                <tr className="bg-white text-slate-700 font-bold text-center whitespace-nowrap text-[11px] border-b border-slate-200 shadow-sm">
                <th className="p-3 border-r border-slate-100 w-24">Ngày</th>
                <th className="p-3 border-r border-slate-100 w-16">Khóa</th>
                <th className="p-3 border-r border-slate-100 w-40 text-left pl-4">ID / Tên Bài (Gợi ý)</th>
                <th className="p-3 border-r border-slate-100 w-28">Content & Media</th> 
                <th className="p-3 border-r border-slate-100 w-40 text-left pl-4">Tiêu đề chính</th>
                <th className="p-3 border-r border-slate-100 w-24">Định dạng</th>
                <th className="p-3 border-r border-slate-100 bg-yellow-50 w-28">Ngân sách</th>
                <th className="p-3 border-r border-slate-100 bg-yellow-50 w-28">Tiền Tiêu</th>
                <th className="p-3 border-r border-slate-100 bg-yellow-50 w-20">Mess</th>
                <th className="p-3 border-r border-slate-100 bg-yellow-50 w-24">Giá Mess</th>
                <th className="p-3 border-r border-slate-100 bg-green-50 w-20 text-red-600">Đơn Mong 🔥</th>
                <th className="p-3 border-r border-slate-100 bg-green-50 w-20 text-blue-600">Đơn Thành 💧</th>
                <th className="p-3 border-r border-slate-100 bg-green-50 w-24">TỔNG ĐƠN</th>
                <th className="p-3 border-r border-slate-100 bg-green-50 w-20">Chốt %</th>
                <th className="p-3 border-r border-slate-100 bg-green-50 w-28">Doanh Thu</th>
                <th className="p-3 border-r border-slate-100 bg-green-50 w-24 text-gray-400">Tiền Gốc</th>
                <th className="p-3 border-r border-slate-100 bg-green-50 w-28">Lợi Nhuận</th>
                <th className="p-3 border-r border-slate-100 bg-green-50 w-20 text-purple-700">ROAS</th>
                <th className="p-3 border-r border-slate-100 w-32">Đánh giá</th>
                <th className="p-3 border-r border-slate-100 w-32">Hành động</th>
                <th className="p-3 border-r border-slate-100 w-32">Trạng thái</th>
                <th className="p-3 border-r border-slate-100 w-24">Link Ads</th>
                <th className="p-3 w-12">Xóa</th>
                </tr>
            </thead>
            <tbody>
                <tr className="bg-slate-100 font-bold border-b border-slate-300 sticky top-0 z-10 shadow-md text-slate-700 text-xs">
                    <td className="p-3 text-center text-red-600" colSpan={6}>📊 TỔNG KẾT ({currentView})</td>
                    <td className="p-3 text-right text-slate-400">-</td>
                    <td className="p-3 text-right text-red-600">{formatNumber(summary.spent)}</td>
                    <td className="p-3 text-center">{summary.mess}</td>
                    <td className="p-3 text-right text-slate-500 italic">{formatNumber(summaryPricePerMess)}</td>
                    <td className="p-3 text-center text-red-600">{summary.ordersMong}</td>
                    <td className="p-3 text-center text-blue-600">{summary.ordersThanh}</td>
                    <td className="p-3 text-center text-lg text-slate-800">{summaryTotalOrders}</td>
                    <td className="p-3 text-center italic">{summaryCloseRate.toFixed(1)}%</td>
                    <td className="p-3 text-right text-green-700">{formatNumber(summary.revenue)}</td>
                    <td className="p-3 bg-slate-200"></td>
                    <td className="p-3 text-right text-blue-700">{formatNumber(summary.profit)}</td>
                    <td className={`p-3 text-center text-lg ${summaryRoas > 4 ? 'text-green-600' : 'text-red-500'}`}>{summaryRoas.toFixed(2)}</td>
                    <td className="p-3" colSpan={5}></td>
                </tr>
                {filteredData.map((row, index) => {
                const c = calculateRow(row);
                let roasColor = c.roas > 4 ? "text-green-600 font-bold" : (c.roas < 1.5 && c.spent > 0 ? "text-red-600 font-bold" : "text-slate-600");
                return (
                    <tr key={row.id} className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50 transition-colors group border-b border-slate-100`}>
                    <td className="p-1 border-r border-slate-100"><input type="date" value={row.date} onChange={e => update(row.id, 'date', e.target.value)} className="w-full bg-transparent outline-none text-[10px] text-slate-500 text-center"/></td>
                    <td className="p-1 border-r border-slate-100 text-center"><span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 rounded text-slate-600">{row.course}</span></td>
                    
                    <td className="p-1 border-r border-slate-100 relative">
                        <div className="flex items-center">
                            <Search size={12} className="text-gray-300 absolute left-2"/>
                            <input list={`list-${row.id}`} value={row.contentName} onChange={e => update(row.id, 'contentName', e.target.value)} className="w-full bg-transparent outline-none pl-6 pr-1 text-blue-700 font-bold placeholder-slate-300" placeholder="Tìm bài cũ..." />
                        </div>
                        <datalist id={`list-${row.id}`}>{uniqueCampaigns.map(uc => <option key={uc.id} value={uc.contentName}/>)}</datalist>
                    </td>

                    <td className="p-1 border-r border-slate-100 text-center">
                        <button onClick={() => setPreviewItem(row)} className={`flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[10px] font-bold border transition-all ${row.mediaUrl || row.contentFull ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}>
                            {row.mediaUrl && (row.mediaUrl.includes('facebook') ? <Facebook size={12}/> : <Video size={12}/>)}
                            {(!row.mediaUrl && !row.contentFull) ? 'Trống' : 'Xem Ads'}
                        </button>
                    </td>
                    
                    <td className="p-1 border-r border-slate-100"><input value={row.contentMain} onChange={e => update(row.id, 'contentMain', e.target.value)} className="w-full bg-transparent outline-none px-2" placeholder="..." /></td>
                    <td className="p-1 border-r border-slate-100"><select value={row.format} onChange={e => update(row.id, 'format', e.target.value)} className="w-full bg-transparent outline-none text-center text-xs text-slate-600"><option>Video</option><option>Image</option><option>Reels</option></select></td>

                    <td className="p-1 border-r border-slate-100 bg-yellow-50/30"><input value={row.budget === 0 ? '' : formatNumber(row.budget)} onChange={e => update(row.id, 'budget', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-right px-2 text-slate-400 focus:text-black font-medium" placeholder="0" /></td>
                    <td className="p-1 border-r border-slate-100 bg-yellow-50/30"><input value={row.spent === 0 ? '' : formatNumber(row.spent)} onChange={e => update(row.id, 'spent', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-right px-2 font-bold text-slate-800" /></td>
                    <td className="p-1 border-r border-slate-100 bg-yellow-50/30"><input value={row.mess === 0 ? '' : row.mess} type="number" onChange={e => update(row.id, 'mess', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-center px-1" /></td>
                    <td className="p-1 border-r border-slate-100 bg-yellow-50/30 text-right text-slate-500 text-[10px] px-2 font-medium">{formatNumber(c.pricePerMess)}</td>
                    <td className="p-1 border-r border-slate-100 bg-green-50/30"><input value={row.ordersMong === 0 ? '' : row.ordersMong} type="number" onChange={e => update(row.id, 'ordersMong', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-center px-1 text-red-600 font-bold" /></td>
                    <td className="p-1 border-r border-slate-100 bg-green-50/30"><input value={row.ordersThanh === 0 ? '' : row.ordersThanh} type="number" onChange={e => update(row.id, 'ordersThanh', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-center px-1 text-blue-600 font-bold" /></td>
                    <td className="p-1 border-r border-slate-100 bg-green-50/30 text-center font-bold text-lg text-slate-700">{c.totalOrders}</td>
                    <td className="p-1 border-r border-slate-100 bg-green-50/30 text-center text-[10px] text-slate-500">{c.closeRate.toFixed(1)}%</td>
                    <td className="p-1 border-r border-slate-100 bg-green-50/30 text-right font-medium text-green-700 px-2">{formatNumber(c.revenue)}</td>
                    <td className="p-1 border-r border-slate-100 bg-green-50/30"><input value={row.baseCost === 0 ? '' : formatNumber(row.baseCost)} onChange={e => update(row.id, 'baseCost', parseNumber(e.target.value))} className="w-full bg-transparent outline-none text-right px-2 text-gray-300 text-[10px] focus:text-red-500" placeholder="0" /></td>
                    <td className="p-1 border-r border-slate-100 bg-green-50/30 text-right font-bold text-blue-700 px-2">{formatNumber(c.profit)}</td>
                    <td className={`p-1 border-r border-slate-100 bg-green-50/30 text-center text-sm ${roasColor}`}>{c.roas.toFixed(2)}</td>
                    
                    <td className="p-1 border-r border-slate-100"><select value={row.evaluation} onChange={e => update(row.id, 'evaluation', e.target.value)} className="w-full bg-transparent outline-none text-center text-[10px] cursor-pointer text-slate-600"><option value="good">🌟 Tốt</option><option value="normal">✅ Ổn</option><option value="warn">⚠️ Kém</option><option value="bad">💸 Lỗ</option></select></td>
                    <td className="p-1 border-r border-slate-100"><select value={row.action} onChange={e => update(row.id, 'action', e.target.value)} className={`w-full outline-none text-center text-[10px] cursor-pointer rounded-full px-1 py-0.5 ${row.action === 'scale' ? 'bg-purple-100 text-purple-700 font-bold' : (row.action === 'stop' ? 'bg-red-100 text-red-600 font-bold' : 'text-slate-600')}`}><option value="scale">🚀 Tăng</option><option value="monitor">👀 Xem</option><option value="optimize">🔧 Sửa</option><option value="stop">🛑 Tắt</option></select></td>
                    <td className="p-1 border-r border-slate-100"><select value={row.status} onChange={e => update(row.id, 'status', e.target.value)} className={`w-full outline-none text-center uppercase text-[10px] cursor-pointer font-bold ${row.status === 'active' ? 'text-green-600' : 'text-slate-400'}`}><option value="active">ON</option><option value="paused">OFF</option><option value="new">NEW</option></select></td>
                    
                    <td className="p-1 border-r border-slate-100 text-center">{row.link ? (<a href={row.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold border border-blue-100 hover:bg-blue-100"><ExternalLink size={10}/> Ads</a>) : (<input type="text" value={row.link} onChange={e => update(row.id, 'link', e.target.value)} placeholder="Link..." className="w-full bg-transparent outline-none text-[10px] text-slate-300 focus:text-blue-600 text-center"/>)}</td>
                    <td className="p-1 text-center"><button onClick={() => remove(row.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={14}/></button></td>
                    </tr>
                );
                })}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}