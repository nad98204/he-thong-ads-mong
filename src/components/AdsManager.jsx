import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Download, Filter, Eye, Edit, 
  ChevronDown, ChevronUp, ChevronRight, 
  Video, Image, ExternalLink, Save, Trash2, Link as LinkIcon, Calendar,
  Undo, Redo, X, Settings, Check
} from 'lucide-react';

export default function AdsManager() {
  // --- 1. CẤU HÌNH MẶC ĐỊNH ---
  const INITIAL_CONFIG = {
    courses: ["ALL", "K35", "K36", "K37"],
    actions: ["Tăng", "Giữ", "Tắt", "Chờ", "Scale"],
    evals: ["🌟 Tốt", "✅ Ổn", "💸 Lỗ", "⚠️ Kém", "🆕 New"],
    formats: ["Video", "Image", "Reels", "Album"]
  };

  // --- 2. DỮ LIỆU MẪU ---
  const initialData = [
    { 
      id: "C01", 
      date: "2025-12-19",
      course: "K36", 
      name: "Video Viral - Luật Hấp Dẫn", 
      headline: "Bí mật thu hút tiền bạc",
      content: "Nội dung...", format: "Video", link: "", media: "",
      
      budget: 5000000, 
      spend: 1799981, 
      mess: 55, 
      
      mong: 12, thanh: 5, 
      price: 3500000, cost: 0,

      orders: 0, rev: 0, rate: 0, cpm: 0, profit: 0, roas: 0, eval: "",
      action: "Tăng", status: "ON"
    }
  ];

  // --- 3. STATE ---
  const [history, setHistory] = useState([initialData]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const data = history[historyIndex];

  // State cho Cấu hình (List tùy chỉnh)
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [showConfigModal, setShowConfigModal] = useState(false); // Bật tắt bảng cấu hình

  const [filterCourse, setFilterCourse] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const fmt = (num) => new Intl.NumberFormat('vi-VN').format(num || 0);

  // --- 4. HÀM QUẢN LÝ LỊCH SỬ (UNDO/REDO) ---
  const updateDataWithHistory = (newData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => { if (historyIndex > 0) setHistoryIndex(historyIndex - 1); };
  const redo = () => { if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1); };

  // --- 5. LOGIC QUẢN LÝ LIST (THÊM/XÓA KHÓA, ACTION, EVAL) ---
  
  // Thêm item vào danh sách cấu hình
  const addItemToConfig = (key, value) => {
    if (value && !config[key].includes(value)) {
      setConfig({ ...config, [key]: [...config[key], value] });
      // Nếu thêm khóa mới, chuyển tab sang khóa đó luôn
      if (key === 'courses') setFilterCourse(value);
    }
  };

  // Xóa item khỏi danh sách
  const removeItemFromConfig = (key, value) => {
    if (confirm(`Bạn chắc chắn muốn xóa "${value}"?`)) {
      const newList = config[key].filter(item => item !== value);
      setConfig({ ...config, [key]: newList });
      // Nếu xóa khóa đang chọn, về ALL
      if (key === 'courses' && filterCourse === value) setFilterCourse("ALL");
    }
  };

  // --- 6. LOGIC TÍNH TOÁN ---
  const calculateMetrics = (item) => {
    const totalOrders = (Number(item.mong) || 0) + (Number(item.thanh) || 0);
    const revenue = totalOrders * (Number(item.price) || 0);
    const cpm = item.mess > 0 ? Math.round(item.spend / item.mess) : 0;
    const rate = item.mess > 0 ? ((totalOrders / item.mess) * 100).toFixed(1) : 0;
    const profit = revenue - (item.spend || 0) - (item.cost || 0);
    const roas = item.spend > 0 ? (revenue / item.spend).toFixed(2) : 0;
    
    // Gợi ý đánh giá (Chỉ gợi ý nếu chưa có giá trị)
    let evaluation = item.eval || "🆕 New";
    // Nếu chưa có đánh giá thủ công, dùng logic tự động
    if (!item.manualEval && item.spend > 0) {
        if (roas >= 4) evaluation = "🌟 Tốt";
        else if (roas >= 2.5) evaluation = "✅ Ổn";
        else evaluation = "💸 Lỗ";
    }

    return { ...item, orders: totalOrders, rev: revenue, cpm, rate, profit, roas, eval: item.manualEval || evaluation };
  };

  const handleUpdate = (id, field, value) => {
    let rawValue = value;
    const numericFields = ['budget', 'spend', 'mess', 'mong', 'thanh', 'price', 'cost'];
    if (numericFields.includes(field)) rawValue = parseInt(value.replace(/\D/g, '')) || 0;

    const updatedData = data.map(item => {
      if (item.id === id) {
        // Nếu người dùng chọn dropdown Đánh giá -> Ghi nhận là thủ công (manual)
        if (field === 'eval') return { ...item, eval: rawValue, manualEval: rawValue };
        return { ...item, [field]: rawValue };
      }
      return item;
    });
    updateDataWithHistory(updatedData);
  };

  // --- 7. FILTER & SORT & SUMMARY ---
  const processedData = useMemo(() => {
    let result = data.map(calculateMetrics);
    if (filterCourse !== "ALL") result = result.filter(item => item.course === filterCourse);
    if (searchQuery) result = result.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, filterCourse, searchQuery, sortConfig, config]); // Re-run khi config thay đổi

  const summary = useMemo(() => {
    return processedData.reduce((acc, item) => ({
      spend: acc.spend + (item.spend || 0),
      mess: acc.mess + (item.mess || 0),
      orders: acc.orders + (item.orders || 0),
      rev: acc.rev + (item.rev || 0),
      cost: acc.cost + (item.cost || 0),
      profit: acc.profit + (item.profit || 0)
    }), { spend: 0, mess: 0, orders: 0, rev: 0, cost: 0, profit: 0 });
  }, [processedData]);

  // --- ACTIONS ---
  const handleAddCampaign = () => {
    const newId = `C${Math.floor(Math.random() * 10000)}`;
    const today = new Date().toISOString().split('T')[0];
    const newItem = {
      id: newId, date: today, course: filterCourse === "ALL" ? config.courses[1] || "K37" : filterCourse,
      name: "Camp mới...", headline: "", format: "Video", link: "", media: "",
      budget: 0, spend: 0, mess: 0, mong: 0, thanh: 0, price: 3500000, cost: 0,
      action: config.actions[3] || "Chờ", status: "DRAFT", content: ""
    };
    updateDataWithHistory([newItem, ...data]);
  };

  const handleDelete = (id) => { if(confirm("Xóa dòng này?")) updateDataWithHistory(data.filter(i => i.id !== id)); };
  const requestSort = (key) => { setSortConfig({ key, direction: (sortConfig.key === key && sortConfig.direction === 'ascending') ? 'descending' : 'ascending' }); };
  const SortIcon = ({ columnKey }) => { return sortConfig.key === columnKey ? (sortConfig.direction === 'ascending' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null; };

  // --- MODAL CẤU HÌNH ---
  const ConfigModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="text-orange-600"/> Cấu Hình Danh Sách</h2>
          <button onClick={() => setShowConfigModal(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
        </div>

        <div className="space-y-8">
          {/* Quản lý Khóa */}
          <div>
            <h3 className="font-bold text-slate-700 mb-2">1. Danh sách Khóa học (K)</h3>
            <div className="flex gap-2 mb-3">
              <input id="newCourseInput" className="border rounded px-3 py-2 text-sm flex-1" placeholder="Ví dụ: K38" />
              <button onClick={() => {
                const val = document.getElementById('newCourseInput').value;
                if(val) { addItemToConfig('courses', val); document.getElementById('newCourseInput').value = ''; }
              }} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold">Thêm</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.courses.map(item => item !== "ALL" && (
                <span key={item} className="bg-slate-100 px-3 py-1 rounded-full text-sm flex items-center gap-2 border">
                  {item} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItemFromConfig('courses', item)}/>
                </span>
              ))}
            </div>
          </div>

          {/* Quản lý Đánh giá */}
          <div>
            <h3 className="font-bold text-slate-700 mb-2">2. Danh sách Đánh giá (Labels)</h3>
            <div className="flex gap-2 mb-3">
              <input id="newEvalInput" className="border rounded px-3 py-2 text-sm flex-1" placeholder="Ví dụ: 🔥 Siêu Win" />
              <button onClick={() => {
                const val = document.getElementById('newEvalInput').value;
                if(val) { addItemToConfig('evals', val); document.getElementById('newEvalInput').value = ''; }
              }} className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold">Thêm</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.evals.map(item => (
                <span key={item} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-green-200">
                  {item} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItemFromConfig('evals', item)}/>
                </span>
              ))}
            </div>
          </div>

          {/* Quản lý Hành động */}
          <div>
            <h3 className="font-bold text-slate-700 mb-2">3. Danh sách Hành động</h3>
            <div className="flex gap-2 mb-3">
              <input id="newActionInput" className="border rounded px-3 py-2 text-sm flex-1" placeholder="Ví dụ: Tăng ngân sách" />
              <button onClick={() => {
                const val = document.getElementById('newActionInput').value;
                if(val) { addItemToConfig('actions', val); document.getElementById('newActionInput').value = ''; }
              }} className="bg-orange-600 text-white px-4 py-2 rounded text-sm font-bold">Thêm</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.actions.map(item => (
                <span key={item} className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-orange-200">
                  {item} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItemFromConfig('actions', item)}/>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 text-right">
           <button onClick={() => setShowConfigModal(false)} className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-900">Đã Xong</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-[#f8fafc] min-h-screen font-sans animate-in fade-in duration-500">
      
      {/* MODAL CONFIG */}
      {showConfigModal && <ConfigModal />}

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4 gap-4">
         <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2"><span className="text-orange-600">ADS MANAGER</span></h1>
            
            {/* UNDO/REDO */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button onClick={undo} disabled={historyIndex === 0} className={`p-1.5 rounded ${historyIndex === 0 ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}`}><Undo size={16}/></button>
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <button onClick={redo} disabled={historyIndex === history.length - 1} className={`p-1.5 rounded ${historyIndex === history.length - 1 ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-100'}`}><Redo size={16}/></button>
            </div>
         </div>

         {/* TAB KHÓA (CÓ THỂ XÓA/THÊM) */}
         <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            {config.courses.map(k => (
               <div key={k} className={`group relative flex items-center px-3 py-1.5 rounded-md cursor-pointer transition-all ${filterCourse === k ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setFilterCourse(k)}>
                  <span className="text-xs font-bold mr-1">{k === "ALL" ? "TỔNG HỢP" : k}</span>
                  {k !== "ALL" && (
                    <button onClick={(e) => { e.stopPropagation(); removeItemFromConfig('courses', k); }} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5 rounded-full bg-white/10">
                       <X size={10} />
                    </button>
                  )}
               </div>
            ))}
            <button onClick={() => { 
                const val = prompt("Tên khóa mới:"); 
                if(val) addItemToConfig('courses', val); 
            }} className="px-2 py-1 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg ml-1"><Plus size={14}/></button>
         </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex gap-2 mb-4">
         <div className="relative flex-1">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Tìm kiếm..."/>
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14}/>
         </div>
         {/* Nút Cấu Hình */}
         <button onClick={() => setShowConfigModal(true)} className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2 text-sm">
            <Settings size={16}/> Cấu hình List
         </button>
         <button onClick={handleAddCampaign} className="bg-orange-600 text-white px-3 py-2 rounded-lg font-bold shadow hover:bg-orange-700 flex items-center gap-1 text-sm"><Plus size={16}/> Thêm QC</button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow border border-slate-300 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
               <thead className="bg-slate-800 text-white uppercase text-[10px] font-bold">
                  <tr>
                     <th className="p-2 w-8 text-center">#</th>
                     <th colSpan="7" className="p-2 border-r border-slate-600 text-center bg-slate-900">THÔNG TIN CƠ BẢN</th>
                     <th colSpan="4" className="p-2 border-r border-slate-600 text-center bg-blue-900">QUẢNG CÁO</th>
                     <th colSpan="9" className="p-2 border-r border-slate-600 text-center bg-green-900">KINH DOANH</th>
                     <th colSpan="4" className="p-2 text-center bg-orange-900">TRẠNG THÁI</th>
                  </tr>
                  <tr className="bg-slate-100 text-slate-600 border-b-2 border-slate-300 cursor-pointer">
                     <th className="p-2"></th>
                     <th className="p-2 min-w-[80px]">Ngày</th>
                     <th className="p-2 text-center" onClick={() => requestSort('course')}>Khóa <SortIcon columnKey="course"/></th>
                     <th className="p-2 min-w-[150px]" onClick={() => requestSort('name')}>Tên Bài <SortIcon columnKey="name"/></th>
                     <th className="p-2 min-w-[120px]">Tiêu đề</th>
                     <th className="p-2 text-center">Định dạng</th>
                     <th className="p-2 text-center">Link</th>
                     <th className="p-2 text-right border-r border-slate-300">Ngân sách</th>

                     <th className="p-2 text-right bg-blue-50 text-blue-800" onClick={() => requestSort('spend')}>Tiền Tiêu <SortIcon columnKey="spend"/></th>
                     <th className="p-2 text-center bg-blue-50 text-blue-800" onClick={() => requestSort('mess')}>Mess <SortIcon columnKey="mess"/></th>
                     <th className="p-2 text-right bg-blue-50 text-blue-800">Giá Mess</th>
                     <th className="p-2 text-center bg-blue-50 text-blue-800 border-r border-blue-200">Rate</th>

                     <th className="p-2 text-center bg-green-50 border-l border-green-100">Mong 🔥</th>
                     <th className="p-2 text-center bg-green-50">Thành 💧</th>
                     <th className="p-2 text-center bg-green-50 font-black text-slate-600">TỔNG</th>
                     <th className="p-2 text-center bg-green-50 text-green-700 font-bold">% Chốt</th>
                     <th className="p-2 text-right bg-green-50 text-slate-600">Giá Bán</th>
                     <th className="p-2 text-right bg-green-50 text-green-800 font-bold" onClick={() => requestSort('rev')}>DOANH THU <SortIcon columnKey="rev"/></th>
                     <th className="p-2 text-right bg-green-50 text-slate-500">Tiền Gốc</th>
                     <th className="p-2 text-right bg-green-50 text-green-800 font-bold" onClick={() => requestSort('profit')}>LỢI NHUẬN <SortIcon columnKey="profit"/></th>
                     <th className="p-2 text-center bg-green-50 text-purple-700 font-black border-r border-green-200">ROAS</th>

                     <th className="p-2 text-center bg-orange-50">Đánh giá</th>
                     <th className="p-2 text-center bg-orange-50">Hành động</th>
                     <th className="p-2 text-center bg-orange-50">Status</th>
                     <th className="p-2 text-center bg-orange-50">Xóa</th>
                  </tr>
               </thead>

               <tbody className="bg-yellow-50 font-bold text-slate-800 border-b-2 border-yellow-200">
                  <tr>
                     <td colSpan="8" className="p-2 text-right uppercase text-[10px]">📊 TỔNG ({filterCourse}):</td>
                     <td className="p-2 text-right text-red-600">-{fmt(summary.spend)}</td>
                     <td className="p-2 text-center">{fmt(summary.mess)}</td>
                     <td colSpan="2" className="p-2"></td>
                     <td colSpan="2" className="p-2"></td>
                     <td className="p-2 text-center text-green-600 text-sm">{fmt(summary.orders)}</td>
                     <td className="p-2 text-center">{(summary.spend > 0 ? ((summary.orders/summary.mess)*100).toFixed(1) : 0)}%</td>
                     <td className="p-2"></td>
                     <td className="p-2 text-right text-green-700 text-sm">{fmt(summary.rev)}</td>
                     <td className="p-2 text-right text-slate-500 text-xs">-{fmt(summary.cost)}</td>
                     <td className="p-2 text-right text-green-700 text-sm">{fmt(summary.profit)}</td>
                     <td className="p-2 text-center text-purple-700">{(summary.spend > 0 ? (summary.rev / summary.spend).toFixed(2) : 0)}x</td>
                     <td colSpan="4"></td>
                  </tr>
               </tbody>

               <tbody className="divide-y divide-slate-200 bg-white">
                  {processedData.map((item) => (
                     <React.Fragment key={item.id}>
                        <tr className={`hover:bg-blue-50/30 transition-colors ${expandedRow === item.id ? 'bg-blue-50/50' : ''}`}>
                           <td className="p-2 text-center cursor-pointer" onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}>
                              {expandedRow === item.id ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                           </td>

                           <td className="p-2"><input type="date" className="bg-transparent outline-none w-20 text-[10px]" value={item.date} onChange={(e) => handleUpdate(item.id, 'date', e.target.value)}/></td>
                           <td className="p-2 font-bold text-slate-500 text-center">{item.course}</td>
                           <td className="p-2"><input className="w-full bg-transparent outline-none font-bold text-slate-700" value={item.name} onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}/></td>
                           <td className="p-2"><input className="w-24 bg-transparent outline-none" value={item.headline} onChange={(e) => handleUpdate(item.id, 'headline', e.target.value)}/></td>
                           
                           {/* DROPDOWN FORMAT (Lấy từ Config) */}
                           <td className="p-2 text-center">
                              <select className="bg-transparent outline-none cursor-pointer text-[10px]" value={item.format} onChange={(e) => handleUpdate(item.id, 'format', e.target.value)}>{config.formats.map(f => <option key={f} value={f}>{f}</option>)}</select>
                           </td>
                           <td className="p-2 text-center text-blue-600 cursor-pointer"><LinkIcon size={14} onClick={() => {if(item.link) window.open(item.link, '_blank')}}/></td>
                           <td className="p-2 text-right border-r border-slate-200"><input className="w-20 text-right bg-transparent outline-none" value={fmt(item.budget)} onChange={(e) => handleUpdate(item.id, 'budget', e.target.value)}/></td>

                           <td className="p-2 text-right font-medium bg-blue-50/10"><input className="w-20 text-right bg-transparent outline-none font-bold text-blue-800" value={fmt(item.spend)} onChange={(e) => handleUpdate(item.id, 'spend', e.target.value)}/></td>
                           <td className="p-2 text-center font-bold bg-blue-50/10"><input className="w-10 text-center bg-transparent outline-none text-blue-600" value={fmt(item.mess)} onChange={(e) => handleUpdate(item.id, 'mess', e.target.value)}/></td>
                           <td className="p-2 text-right text-slate-500 bg-blue-50/10">{fmt(item.cpm)}</td>
                           <td className="p-2 text-center text-slate-500 border-r border-blue-100">{item.rate}%</td>

                           <td className="p-2 text-center border-l border-slate-100"><input className="w-8 text-center bg-transparent outline-none" value={item.mong} onChange={(e) => handleUpdate(item.id, 'mong', e.target.value)}/></td>
                           <td className="p-2 text-center"><input className="w-8 text-center bg-transparent outline-none" value={item.thanh} onChange={(e) => handleUpdate(item.id, 'thanh', e.target.value)}/></td>
                           <td className="p-2 text-center font-bold text-slate-400">{item.total}</td>
                           <td className="p-2 text-center font-bold text-green-600">{item.rate}%</td>
                           <td className="p-2 text-right"><input className="w-16 text-right bg-transparent outline-none text-slate-600" value={fmt(item.price)} onChange={(e) => handleUpdate(item.id, 'price', e.target.value)}/></td>
                           <td className="p-2 text-right font-bold text-green-700">{fmt(item.rev)}</td>
                           <td className="p-2 text-right text-slate-400"><input className="w-16 text-right bg-transparent outline-none" value={fmt(item.cost)} onChange={(e) => handleUpdate(item.id, 'cost', e.target.value)}/></td>
                           <td className={`p-2 text-right font-bold ${item.profit > 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(item.profit)}</td>
                           <td className="p-2 text-center font-black border-r border-slate-200">{item.roas}x</td>

                           {/* DROPDOWN ĐÁNH GIÁ (CUSTOM) */}
                           <td className="p-2 text-center">
                              <select className="bg-transparent text-[10px] font-bold outline-none cursor-pointer" value={item.eval} onChange={(e) => handleUpdate(item.id, 'eval', e.target.value)}>
                                 {config.evals.map(a => <option key={a} value={a}>{a}</option>)}
                              </select>
                           </td>
                           
                           {/* DROPDOWN HÀNH ĐỘNG (CUSTOM) */}
                           <td className="p-2 text-center">
                              <select className="bg-transparent text-[10px] font-bold outline-none cursor-pointer" value={item.action} onChange={(e) => handleUpdate(item.id, 'action', e.target.value)}>
                                 {config.actions.map(a => <option key={a} value={a}>{a}</option>)}
                              </select>
                           </td>
                           <td className="p-2 text-center">
                              <div className={`w-8 h-4 rounded-full relative cursor-pointer mx-auto transition-colors ${item.status === 'ON' ? 'bg-green-500' : 'bg-slate-300'}`} onClick={() => handleUpdate(item.id, 'status', item.status === 'ON' ? 'OFF' : 'ON')}>
                                 <div className={`w-2 h-2 bg-white rounded-full absolute top-1 transition-all ${item.status === 'ON' ? 'left-5' : 'left-1'}`}></div>
                              </div>
                           </td>
                           <td className="p-2 text-center"><button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button></td>
                        </tr>

                        {expandedRow === item.id && (
                           <tr className="bg-slate-50 border-b border-slate-200">
                              <td colSpan="21" className="p-4">
                                 <div className="flex gap-4">
                                    <div className="w-1/3">
                                       <div className="font-bold mb-1 text-xs text-slate-500 uppercase">Link & Media</div>
                                       <input className="w-full p-2 text-xs border rounded mb-2 bg-white" placeholder="Link Ads..." value={item.link} onChange={(e) => handleUpdate(item.id, 'link', e.target.value)}/>
                                       <input className="w-full p-2 text-xs border rounded bg-white" placeholder="Link Embed..." value={item.media} onChange={(e) => handleUpdate(item.id, 'media', e.target.value)}/>
                                    </div>
                                    <div className="w-1/3">
                                       <div className="font-bold mb-1 text-xs text-slate-500 uppercase">Nội dung</div>
                                       <textarea className="w-full h-24 p-2 text-xs border rounded resize-none bg-white break-words" value={item.content} onChange={(e) => handleUpdate(item.id, 'content', e.target.value)}/>
                                    </div>
                                    <div className="w-1/3">
                                       <div className="font-bold mb-1 text-xs text-slate-500 uppercase">Preview</div>
                                       <div className="aspect-video bg-black rounded overflow-hidden flex items-center justify-center text-white text-xs">
                                          {item.media ? <iframe src={item.media} className="w-full h-full" title="preview"/> : "Chưa có media"}
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