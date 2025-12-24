import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, push, remove } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, 
  MapPin, Clock, Trash2, Edit, BookOpen, 
  Users, Mic, Star, Bot, Link as LinkIcon, 
  FileText, Video, Folder, X, ExternalLink, 
  Home, ChevronRight as ArrowRight, ArrowLeft,
  Settings, Copy, Layers, Tag, CalendarDays, Eye, ArrowUpRight, GraduationCap, CheckSquare, Palette, List, ChevronDown, ChevronUp, Search, Grid, LayoutList, Upload, Download, File, FileText as FileTextIcon, Image as ImageIcon, XCircle, Save, Type
} from 'lucide-react';

// --- RICH TEXT EDITOR COMPONENT (SIMPLE VERSION) ---
// Một editor đơn giản sử dụng contentEditable để không phụ thuộc vào thư viện ngoài nặng nề
const SimpleRichTextEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCmd = (command, value = null) => {
    document.execCommand(command, false, value);
    handleInput(); // Cập nhật state sau khi thực hiện lệnh
  };

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden flex flex-col h-full bg-white">
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-1 flex-wrap">
        <button onClick={() => execCmd('bold')} className="p-1.5 hover:bg-slate-200 rounded font-bold" title="In đậm">B</button>
        <button onClick={() => execCmd('italic')} className="p-1.5 hover:bg-slate-200 rounded italic" title="In nghiêng">I</button>
        <button onClick={() => execCmd('underline')} className="p-1.5 hover:bg-slate-200 rounded underline" title="Gạch chân">U</button>
        <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
        <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 hover:bg-slate-200 rounded" title="Danh sách">List</button>
        <button onClick={() => execCmd('justifyLeft')} className="p-1.5 hover:bg-slate-200 rounded" title="Căn trái">Left</button>
        <button onClick={() => execCmd('justifyCenter')} className="p-1.5 hover:bg-slate-200 rounded" title="Căn giữa">Center</button>
        <div className="w-px h-6 bg-slate-300 mx-1 self-center"></div>
        <button onClick={() => execCmd('formatBlock', 'H3')} className="p-1.5 hover:bg-slate-200 rounded font-bold text-sm" title="Tiêu đề">H3</button>
        <button onClick={() => execCmd('formatBlock', 'P')} className="p-1.5 hover:bg-slate-200 rounded text-sm" title="Đoạn văn">P</button>
      </div>
      <div 
        ref={editorRef}
        className="flex-1 p-4 outline-none overflow-y-auto prose max-w-none"
        contentEditable
        onInput={handleInput}
        style={{ minHeight: '300px' }}
      />
    </div>
  );
};

export default function TrainingManager() {
  const { userRole, userPermissions } = useAuth();
  const canEdit = userRole === 'ADMIN' || userRole === 'SALE_LEADER' || userPermissions?.training?.edit;

  const [activeTab, setActiveTab] = useState('CALENDAR'); 
  const [loading, setLoading] = useState(true);
  
  // --- STATE DATA ---
  const [events, setEvents] = useState({});
  const [docs, setDocs] = useState({});
  const [tools, setTools] = useState({});
  const [templates, setTemplates] = useState({}); 

  // State cho Lịch Tháng
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  
  // State cho Lịch Tuần
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
      const d = new Date();
      const day = d.getDay() || 7; 
      d.setHours(0, 0, 0, 0); 
      d.setDate(d.getDate() - day + 1); 
      return d;
  });

  const [currentPath, setCurrentPath] = useState([]); 
  const [selectedTemplateId, setSelectedTemplateId] = useState(null); 
  const [expandedBatch, setExpandedBatch] = useState(null); 
  
  // State mới cho Resource View & Document Viewer
  const [viewMode, setViewMode] = useState('GRID'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingDoc, setViewingDoc] = useState(null); // State để lưu tài liệu đang xem

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('EVENT'); 
  const [eventMode, setEventMode] = useState('SINGLE'); 
  
  const [formData, setFormData] = useState({});
  const [batchSchedule, setBatchSchedule] = useState([]); 
  const [editingId, setEditingId] = useState(null);

  const EVENT_COLORS = [
      { id: 'blue',   label: 'Xanh Dương', class: 'bg-blue-100 text-blue-700 border-blue-200' },
      { id: 'green',  label: 'Xanh Lá',    class: 'bg-green-100 text-green-700 border-green-200' },
      { id: 'purple', label: 'Tím',        class: 'bg-purple-100 text-purple-700 border-purple-200' },
      { id: 'orange', label: 'Cam',        class: 'bg-orange-100 text-orange-700 border-orange-200' },
      { id: 'red',    label: 'Đỏ',         class: 'bg-red-100 text-red-700 border-red-200' },
      { id: 'slate',  label: 'Xám',        class: 'bg-slate-100 text-slate-700 border-slate-200' },
  ];

  const DAYS_OF_WEEK = [
      { id: 1, label: 'T2' }, { id: 2, label: 'T3' }, { id: 3, label: 'T4' },
      { id: 4, label: 'T5' }, { id: 5, label: 'T6' }, { id: 6, label: 'T7' }, { id: 0, label: 'CN' },
  ];

  const EVENT_TYPES = {
    CHUYEN_MON: { label: "Chuyên Môn", color: "bg-blue-100 text-blue-700 border-blue-200" },
    KY_NANG:    { label: "Kỹ Năng Mềm", color: "bg-orange-100 text-orange-700 border-orange-200" },
    NOI_BO:     { label: "Họp Nội Bộ", color: "bg-slate-100 text-slate-700 border-slate-200" },
    EVENT:      { label: "Sự Kiện", color: "bg-purple-100 text-purple-700 border-purple-200" },
  };

  useEffect(() => {
    const trainingRef = ref(db, 'training_data');
    const unsub = onValue(trainingRef, (snapshot) => {
      const val = snapshot.val() || {};
      setEvents(val.schedule || {});
      setDocs(val.docs || {});
      setTools(val.tools || {});
      setTemplates(val.templates || {});
      setLoading(false);
    });
    return unsub;
  }, []);

  const nextWeek = () => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + 7);
      setCurrentWeekStart(d);
  };

  const prevWeek = () => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() - 7);
      setCurrentWeekStart(d);
  };

  const goToThisWeek = () => {
      const d = new Date();
      const day = d.getDay() || 7;
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - day + 1);
      setCurrentWeekStart(d);
  };

  const generateSmartSchedule = (template, startDateStr) => {
      const count = parseInt(template.sessions) || 1;
      const start = new Date(startDateStr);
      const schedule = [];
      let currentDate = new Date(start);
      const preferredDays = template.preferredDays || []; 
      const useSmart = preferredDays.length > 0;

      while (schedule.length < count) {
          const currentDayOfWeek = currentDate.getDay(); 
          if (!useSmart || preferredDays.includes(currentDayOfWeek)) {
              schedule.push({
                  date: currentDate.toISOString().split('T')[0],
                  time: template.time || "20:00",
                  trainer: template.trainer || "",
                  title_suffix: `(Buổi ${schedule.length + 1})`
              });
          }
          currentDate.setDate(currentDate.getDate() + 1);
          if (currentDate - new Date(start) > 1000 * 86400 * 365) break; 
      }
      return schedule;
  };

  useEffect(() => {
    if (eventMode === 'BATCH' && formData.selectedTemplate && formData.startDate && templates[formData.selectedTemplate]) {
        if (batchSchedule.length === 0) {
            const tpl = templates[formData.selectedTemplate];
            const newSchedule = generateSmartSchedule(tpl, formData.startDate);
            setBatchSchedule(newSchedule);
            if (tpl.color) {
                setFormData(prev => ({ ...prev, color: tpl.color }));
            }
        }
    }
  }, [formData.selectedTemplate, formData.startDate, eventMode, templates]);

  // --- HELPERS ---
  const getClassesFromTemplate = (templateId) => {
      const classes = {};
      const tpl = templates[templateId];
      if (!tpl) return [];
      Object.values(events).forEach(ev => {
          const isMatch = ev.templateId === templateId || (ev.title && ev.title.startsWith(tpl.title));
          if (isMatch) {
              const batchKey = ev.batchCode || `${ev.title.split('(')[0].trim()}_${ev.date}`; 
              if (!classes[batchKey]) {
                  classes[batchKey] = {
                      batchCode: ev.batchCode || "Không mã",
                      title: ev.title.split('(')[0].trim(), 
                      startDate: ev.date, 
                      endDate: ev.date, 
                      trainer: ev.trainer, count: 0, sessions: [] 
                  };
              }
              if (new Date(ev.date) < new Date(classes[batchKey].startDate)) classes[batchKey].startDate = ev.date;
              if (new Date(ev.date) > new Date(classes[batchKey].endDate)) classes[batchKey].endDate = ev.date;
              classes[batchKey].count++;
              classes[batchKey].sessions.push(ev);
          }
      });
      Object.keys(classes).forEach(key => {
          classes[key].sessions.sort((a,b) => new Date(a.date) - new Date(b.date));
      });
      return Object.values(classes).sort((a,b) => new Date(b.startDate) - new Date(a.startDate)); 
  };

  const jumpToDate = (dateStr) => {
      const d = new Date(dateStr);
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
      setActiveTab('CALENDAR');
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
             console.log("Copied to clipboard!");
        }).catch(err => {
             console.error('Failed to copy: ', err);
             fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
  };

  const fallbackCopyTextToClipboard = (text) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed"; 
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
          document.execCommand('copy');
          console.log("Copied via fallback!");
      } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
  }

  // --- CRUD HANDLERS ---
  const handleSave = () => {
    if (modalType === 'EVENT') {
        let jumpDate = null; 
        const eventColor = formData.color || 'blue'; 

        if (eventMode === 'BATCH') {
            if (!formData.selectedTemplate) return alert("Chưa chọn mẫu!");
            if (!batchSchedule.length) return alert("Lỗi lịch học!");
            const tpl = templates[formData.selectedTemplate];
            const batchSuffix = formData.batchCode ? ` - ${formData.batchCode}` : '';

            batchSchedule.forEach((session) => {
                const newEvent = {
                    title: `${tpl.title}${batchSuffix} ${session.title_suffix}`,
                    date: session.date,
                    time: session.time,
                    trainer: session.trainer, 
                    location: tpl.location,
                    color: eventColor, 
                    templateId: formData.selectedTemplate,
                    batchCode: formData.batchCode || ''
                };
                push(ref(db, 'training_data/schedule'), newEvent);
                if (!jumpDate) jumpDate = new Date(session.date);
            });
        }
        else {
            if (!formData.title) return alert("Thiếu tên sự kiện!");
            if (!formData.date) return alert("Thiếu ngày!");
            const newEvent = { ...formData, color: eventColor };
            const pathRef = `training_data/schedule/${editingId || push(ref(db, 'training_data/schedule')).key}`;
            set(ref(db, pathRef), newEvent);
            jumpDate = new Date(formData.date);
        }
        if (jumpDate) {
            setCurrentMonth(jumpDate.getMonth());
            setCurrentYear(jumpDate.getFullYear());
        }
        setShowModal(false);
    } 
    else if (modalType === 'TEMPLATE') {
        if (!formData.title) return alert("Thiếu tên mẫu!");
        const pathRef = `training_data/templates/${editingId || push(ref(db, 'training_data/templates')).key}`;
        const templateData = { ...formData, color: formData.color || 'blue' };
        set(ref(db, pathRef), templateData).then(() => setShowModal(false));
    }
    else {
        // Xử lý lưu File/Folder/Doc
        if (!formData.name) return alert("Thiếu tên!");
        const rootKey = activeTab === 'DOCS' ? 'docs' : 'tools';
        let basePath = `training_data/${rootKey}`;
        currentPath.forEach(fid => basePath += `/${fid}/children`);
        const newId = editingId || push(ref(db, basePath)).key;
        let pathRef = `${basePath}/${newId}`;
        
        if (modalType === 'FOLDER' && !editingId) { 
            formData.children = {}; 
            formData.type = 'FOLDER'; 
        }

        // Đối với tài liệu soạn thảo trực tuyến, nội dung HTML đã được lưu trong formData.content
        // Firebase sẽ lưu trữ nó như một chuỗi string.
        
        set(ref(db, pathRef), formData).then(() => setShowModal(false));
    }
  };

  const handleDelete = (id, type) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa?")) return;
    let pathRef = '';
    if (type === 'EVENT') pathRef = `training_data/schedule/${id}`;
    else if (type === 'TEMPLATE') pathRef = `training_data/templates/${id}`;
    else {
        const rootKey = activeTab === 'DOCS' ? 'docs' : 'tools';
        let basePath = `training_data/${rootKey}`;
        currentPath.forEach(fid => basePath += `/${fid}/children`);
        pathRef = `${basePath}/${id}`;
    }
    remove(ref(db, pathRef));
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingId(item?.id || null);
    setEventMode('SINGLE'); 
    setBatchSchedule([]); 

    if (type === 'EVENT') {
        const defaultColor = item?.color || 'blue';
        setFormData(item || { 
            title: "", date: new Date().toISOString().split('T')[0], 
            time: "20:00", trainer: "", location: "Zoom",
            batchCode: "", color: defaultColor 
        });
    } else if (type === 'TEMPLATE') { 
        const defaultColor = item?.color || 'blue';
        setFormData(item || { 
            title: "", sessions: 1, time: "20:00", 
            trainer: "", location: "Zoom", preferredDays: [], color: defaultColor
        });
    } else if (type === 'FOLDER') {
        setFormData(item || { name: "", type: 'FOLDER', icon: 'Folder' });
    } else if (type === 'DOC') { // Mở editor soạn thảo
        setFormData(item || { name: "", type: 'DOC', content: "<h1>Tiêu đề tài liệu</h1><p>Nội dung bắt đầu tại đây...</p>" });
    } else { 
        const defaultFileType = activeTab === 'TOOLS' ? 'BOT' : 'LINK'; 
        setFormData(item || { name: "", link: "", type: 'FILE', fileType: defaultFileType, desc: "" });
    }
    setShowModal(true);
  };

  const togglePreferredDay = (dayId) => {
      const currentDays = formData.preferredDays || [];
      if (currentDays.includes(dayId)) setFormData({...formData, preferredDays: currentDays.filter(d => d !== dayId)});
      else setFormData({...formData, preferredDays: [...currentDays, dayId]});
  };

  // --- RENDERERS ---
  const getCurrentRoot = () => activeTab === 'DOCS' ? docs : tools;
  const getCurrentItems = () => {
    let currentLevel = getCurrentRoot();
    for (const folderId of currentPath) {
        if (currentLevel[folderId] && currentLevel[folderId].children) currentLevel = currentLevel[folderId].children;
        else return {}; 
    }
    return currentLevel;
  };

  // --- COMPONENT: DOCUMENT VIEWER MODAL ---
  const renderDocumentViewer = () => {
    if (!viewingDoc) return null;

    const isOffice = (link) => {
       const lower = link.toLowerCase();
       return lower.includes('.doc') || lower.includes('.ppt') || lower.includes('.xls');
    };
    
    // Nếu là DOC (soạn thảo), hiển thị nội dung HTML
    // Nếu là FILE, check loại để render
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-lg ${viewingDoc.type === 'DOC' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                          {viewingDoc.type === 'DOC' ? <FileTextIcon size={20}/> : <File size={20}/>}
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 truncate max-w-md">{viewingDoc.name}</h3>
                  </div>
                  <div className="flex gap-2">
                     {canEdit && viewingDoc.type === 'DOC' && (
                         <button onClick={() => { setViewingDoc(null); openModal('DOC', viewingDoc); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 flex items-center gap-2">
                            <Edit size={16}/> Sửa
                         </button>
                     )}
                     <button onClick={() => setViewingDoc(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X/></button>
                  </div>
              </div>
              
              <div className="flex-1 bg-slate-100 overflow-hidden relative">
                  {viewingDoc.type === 'DOC' ? (
                      <div className="h-full overflow-y-auto p-8 md:p-12 bg-white max-w-4xl mx-auto shadow-sm prose prose-slate">
                          <div dangerouslySetInnerHTML={{ __html: viewingDoc.content }} />
                      </div>
                  ) : (
                      // Xử lý File Viewer
                      <div className="w-full h-full flex items-center justify-center">
                          {isOffice(viewingDoc.link) ? (
                              <iframe 
                                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewingDoc.link)}`} 
                                className="w-full h-full border-none"
                                title="Office Viewer"
                              />
                          ) : viewingDoc.link.toLowerCase().endsWith('.pdf') ? (
                              <iframe src={viewingDoc.link} className="w-full h-full border-none" title="PDF Viewer"/>
                          ) : viewingDoc.fileType === 'VIDEO' ? (
                              <video controls className="max-w-full max-h-full" src={viewingDoc.link}/>
                          ) : (
                              // Ảnh hoặc mặc định
                              <img src={viewingDoc.link} alt="Preview" className="max-w-full max-h-full object-contain" onError={(e) => { e.target.style.display='none'; }}/>
                          )}
                      </div>
                  )}
              </div>
           </div>
        </div>
    );
  };

  // --- COMPONENT: LỊCH TUẦN ---
  const renderWeeklyBoard = () => {
      // ... (Giữ nguyên code renderWeeklyBoard như cũ) ...
      const weekDays = [];
      const start = new Date(currentWeekStart); 
      start.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          weekDays.push(d);
      }

      return (
          <div className="flex-1 flex flex-col bg-white rounded-2xl border shadow-sm h-[calc(100vh-180px)] overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-3">
                      <h3 className="font-black text-slate-700 flex items-center gap-2 text-lg"><List size={20}/> LỊCH TUẦN</h3>
                      <div className="flex items-center bg-white border rounded-lg p-1 shadow-sm">
                          <button onClick={prevWeek} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={18}/></button>
                          <button onClick={goToThisWeek} className="px-3 text-xs font-bold hover:bg-slate-100 rounded py-1">Hôm nay</button>
                          <button onClick={nextWeek} className="p-1 hover:bg-slate-100 rounded"><ChevronRight size={18}/></button>
                      </div>
                  </div>
                  <div className="text-sm font-bold text-slate-500">
                      {weekDays[0].getDate()}/{weekDays[0].getMonth()+1} - {weekDays[6].getDate()}/{weekDays[6].getMonth()+1}
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-7 min-h-full divide-x">
                      {weekDays.map((date, idx) => {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          const dateStr = `${y}-${m}-${d}`;
                          const dayEvents = Object.values(events).filter(ev => ev.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
                          const isToday = date.getDate() === new Date().getDate() && date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();

                          return (
                              <div key={idx} className={`flex flex-col group/day ${isToday ? 'bg-blue-50/50' : ''}`}>
                                  <div className={`p-3 text-center border-b sticky top-0 z-10 backdrop-blur-sm ${isToday ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-500'}`}>
                                      <span className="block text-[10px] uppercase font-bold tracking-wider">{DAYS_OF_WEEK.find(d=>d.id===date.getDay())?.label}</span>
                                      <span className={`text-2xl font-black ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>{date.getDate()}</span>
                                  </div>
                                  <div className="flex-1 p-2 space-y-2 relative min-h-[100px]">
                                      {dayEvents.map((ev, evIdx) => {
                                          const colorClass = EVENT_COLORS.find(c => c.id === ev.color)?.class || EVENT_COLORS[0].class;
                                          return (
                                              <div key={evIdx} className={`p-2 rounded-lg border text-xs shadow-sm cursor-pointer hover:brightness-95 transition-all ${colorClass}`}
                                                   onClick={() => openModal('EVENT', ev)}>
                                                  <div className="font-bold flex items-center gap-1 mb-1 opacity-70">
                                                      <Clock size={10}/> {ev.time}
                                                  </div>
                                                  <div className="font-bold line-clamp-3 leading-tight">{ev.title}</div>
                                                  {ev.trainer && <div className="mt-1 opacity-80 flex items-center gap-1"><Users size={10}/> {ev.trainer}</div>}
                                              </div>
                                          )
                                      })}
                                      <div className="absolute bottom-2 right-2 opacity-0 group-hover/day:opacity-100 transition-opacity">
                                          <button onClick={() => { setFormData({date: dateStr, time: "09:00", color: 'blue', title: '', trainer: '', location: 'Zoom'}); setEventMode('SINGLE'); openModal('EVENT'); }} className="bg-blue-500 text-white p-1.5 rounded-full shadow hover:bg-blue-600" title="Thêm lịch lẻ">
                                              <Plus size={16}/>
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>
          </div>
      );
  };

  // 1. CALENDAR MONTH VIEW
  const renderMonthCalendar = () => {
    const months = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
    const monthEvents = Object.keys(events).map(k => ({id: k, ...events[k]})).filter(ev => {
        if (!ev.date) return false;
        const [y, m, d] = ev.date.split('-').map(Number);
        return (m - 1) === currentMonth && y === currentYear;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] overflow-y-auto">
            <div className="flex bg-white p-2 rounded-xl border mb-4 overflow-x-auto shadow-sm shrink-0 items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentYear(currentYear-1)}><ChevronLeft/></button>
                    <span className="font-black text-xl px-2">{currentYear}</span>
                    <button onClick={() => setCurrentYear(currentYear+1)}><ChevronRight/></button>
                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                    {months.map((m, idx) => (
                        <button key={idx} onClick={() => setCurrentMonth(idx)} className={`hidden md:block px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${currentMonth === idx ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>
                            {m}
                        </button>
                    ))}
                    <select className="md:hidden border p-2 rounded-lg font-bold" value={currentMonth} onChange={(e)=>setCurrentMonth(parseInt(e.target.value))}>
                        {months.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl border shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Calendar className="text-blue-600"/> LỊCH {months[currentMonth].toUpperCase()}
                    </h2>
                    {canEdit && (
                        <div className="flex gap-2">
                            <button onClick={() => openModal('EVENT')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                                <Plus size={18}/> Tạo Lịch
                            </button>
                        </div>
                    )}
                </div>

                {monthEvents.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 italic">Tháng này chưa có lịch đào tạo nào.</div>
                ) : (
                    <div className="space-y-4">
                        {monthEvents.map(ev => {
                            const colorClass = EVENT_COLORS.find(c => c.id === ev.color)?.class || EVENT_COLORS[0].class;
                            return (
                                <div key={ev.id} className={`flex group rounded-2xl p-4 border hover:shadow-md transition-all relative bg-white ${colorClass.split(' ')[2]}`}>
                                    <div className="flex flex-col items-center justify-center bg-white border rounded-xl p-3 w-20 shrink-0 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400">NGÀY</span>
                                        <span className="text-2xl font-black text-slate-800">{ev.date.split('-')[2]}</span>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colorClass}`}>
                                                {ev.time}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">{ev.title}</h3>
                                        <div className="flex gap-4 mt-2 text-sm text-slate-600">
                                            {ev.trainer && <span className="flex items-center gap-1"><Users size={14}/> {ev.trainer}</span>}
                                            <span className="flex items-center gap-1"><MapPin size={14}/> {ev.location}</span>
                                        </div>
                                    </div>
                                    {canEdit && (
                                        <div className="flex flex-col gap-2 justify-center ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openModal('EVENT', ev)} className="p-2 bg-white text-blue-600 rounded-lg hover:shadow"><Edit size={16}/></button>
                                            <button onClick={() => handleDelete(ev.id, 'EVENT')} className="p-2 bg-white text-red-500 rounded-lg hover:shadow"><Trash2 size={16}/></button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
  };

  // 2. COURSES TAB
  const renderCourseManager = () => {
      const templateList = Object.keys(templates).map(k => ({id: k, ...templates[k]}));
      return (
          <div className="flex flex-col md:flex-row h-[calc(100vh-180px)] gap-4">
              <div className="w-full md:w-1/3 bg-white rounded-2xl border shadow-sm flex flex-col">
                  <div className="p-4 border-b">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2"><Layers size={18}/> Danh sách Khóa</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {templateList.map(tpl => (
                          <div key={tpl.id} onClick={() => setSelectedTemplateId(tpl.id)} className={`p-3 rounded-xl cursor-pointer border transition-all flex justify-between items-center group ${selectedTemplateId === tpl.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-slate-50 border-transparent hover:border-slate-100'}`}>
                              <div>
                                  <h4 className={`font-bold text-sm ${selectedTemplateId === tpl.id ? 'text-blue-700' : 'text-slate-700'}`}>{tpl.title}</h4>
                                  <p className="text-xs text-slate-400 mt-1">{tpl.sessions} buổi • {tpl.trainer}</p>
                              </div>
                              {canEdit && (
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={(e) => {e.stopPropagation(); openModal('TEMPLATE', tpl)}} className="p-1.5 text-blue-500 hover:bg-white rounded"><Edit size={14}/></button>
                                      <button onClick={(e) => {e.stopPropagation(); handleDelete(tpl.id, 'TEMPLATE')}} className="p-1.5 text-red-500 hover:bg-white rounded"><Trash2 size={14}/></button>
                                  </div>
                              )}
                          </div>
                      ))}
                      {canEdit && (
                          <button onClick={() => openModal('TEMPLATE')} className="w-full py-3 mt-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-bold hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                              <Plus size={16}/> Thêm Mẫu Khóa Học
                          </button>
                      )}
                  </div>
              </div>

              <div className="flex-1 bg-white rounded-2xl border shadow-sm p-6 flex flex-col">
                  {!selectedTemplateId ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                          <GraduationCap size={64} className="mb-4 text-slate-200"/>
                          <p className="font-bold">Chọn một khóa học bên trái để xem lịch sử mở lớp</p>
                      </div>
                  ) : (
                      <>
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h2 className="text-2xl font-black text-slate-800">{templates[selectedTemplateId]?.title}</h2>
                                  <div className="flex gap-4 mt-2 text-sm text-slate-500">
                                      <span className="flex items-center gap-1"><Layers size={14}/> {templates[selectedTemplateId]?.sessions} buổi</span>
                                      <span className="flex items-center gap-1"><Users size={14}/> {templates[selectedTemplateId]?.trainer}</span>
                                  </div>
                                  {templates[selectedTemplateId]?.preferredDays && templates[selectedTemplateId].preferredDays.length > 0 && (
                                      <div className="flex gap-2 mt-2">
                                          {templates[selectedTemplateId].preferredDays.sort().map(d => (
                                              <span key={d} className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{DAYS_OF_WEEK.find(x => x.id === d)?.label}</span>
                                          ))}
                                      </div>
                                  )}
                              </div>
                              <button onClick={() => { setFormData({selectedTemplate: selectedTemplateId}); openModal('EVENT'); setEventMode('BATCH'); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow hover:bg-blue-700">
                                  + Mở Lớp Mới
                              </button>
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-4">
                              <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Lịch sử các lớp đã mở</h4>
                              {getClassesFromTemplate(selectedTemplateId).length === 0 ? (
                                  <div className="text-center py-10 bg-slate-50 rounded-xl text-slate-400 italic">Chưa có lớp nào được mở từ mẫu này.</div>
                              ) : (
                                  getClassesFromTemplate(selectedTemplateId).map((cls, idx) => {
                                      const tplColor = templates[selectedTemplateId]?.color || 'blue';
                                      const colorClass = EVENT_COLORS.find(c => c.id === tplColor)?.class || EVENT_COLORS[0].class;
                                      
                                      const isExpanded = expandedBatch === idx;

                                      return (
                                          <div key={idx} className={`border rounded-xl transition-all bg-white group overflow-hidden ${isExpanded ? 'shadow-md ring-1 ring-blue-200' : 'hover:shadow-sm'}`}>
                                              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer" 
                                                   onClick={() => setExpandedBatch(isExpanded ? null : idx)}>
                                                  <div className="flex items-start gap-4">
                                                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${colorClass}`}>
                                                          {cls.batchCode || `#${idx+1}`}
                                                      </div>
                                                      <div>
                                                          <h5 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                                              {cls.title}
                                                              {isExpanded ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                                                          </h5>
                                                          <div className="text-sm text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                                              <span className="flex items-center gap-1"><CalendarDays size={14}/> {cls.startDate.split('-').reverse().join('/')} ➔ {cls.endDate.split('-').reverse().join('/')}</span>
                                                              <span className="flex items-center gap-1"><Users size={14}/> {cls.trainer || 'Đa dạng'}</span>
                                                          </div>
                                                      </div>
                                                  </div>
                                                  
                                                  <button onClick={(e) => { e.stopPropagation(); jumpToDate(cls.startDate); }} 
                                                          className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-all whitespace-nowrap self-start sm:self-center">
                                                      Xem trên Lịch <ArrowUpRight size={14}/>
                                                  </button>
                                              </div>
                                              {isExpanded && (
                                                  <div className="bg-slate-50 border-t p-4 space-y-2 animate-in slide-in-from-top-2">
                                                      <h6 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Chi tiết lịch học</h6>
                                                      {cls.sessions.map((sess, sIdx) => (
                                                          <div key={sIdx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100 text-sm">
                                                              <div className="flex items-center gap-3">
                                                                  <span className="text-xs font-bold w-16 text-slate-400">Buổi {sIdx+1}</span>
                                                                  <span className="font-bold text-slate-700">{sess.date.split('-').reverse().join('/')}</span>
                                                                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">{sess.time}</span>
                                                              </div>
                                                              <div className="text-slate-500 text-xs flex items-center gap-1">
                                                                  <Users size={12}/> {sess.trainer}
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                      )
                                  })
                              )}
                          </div>
                      </>
                  )}
              </div>
          </div>
      );
  };

  // 3. RESOURCE VIEW (NÂNG CẤP GIAO DIỆN & TÍNH NĂNG TẠO DOC)
  const renderResources = () => {
    const items = getCurrentItems();
    const listItems = items ? Object.keys(items).map(k => ({id: k, ...items[k]})) : [];
    
    const folders = listItems.filter(i => i.type === 'FOLDER');
    // Phân loại: File thường, Link, và Doc (tài liệu soạn thảo)
    const files = listItems.filter(i => i.type !== 'FOLDER');
    const isTools = activeTab === 'TOOLS';
    const btnColor = isTools ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-orange-600 hover:bg-orange-700';

    const filteredFolders = folders.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredFiles = files.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Hàm xử lý upload file giả lập
    const handleFileUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const fakeLink = URL.createObjectURL(file);
                setFormData({
                    name: file.name,
                    link: fakeLink,
                    type: 'FILE',
                    fileType: 'LINK', 
                    desc: `File uploaded: ${file.name}`
                });
                setModalType('FILE'); 
                setShowModal(true);
            }
        };
        input.click();
    };

    return (
        <div className="flex flex-col h-[calc(100vh-180px)]">
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-2xl border shadow-sm gap-4">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button onClick={() => setCurrentPath([])} className="hover:bg-slate-100 p-2 rounded-lg flex items-center gap-2 text-slate-600 font-bold text-sm transition-all"><Home size={18}/> Home</button>
                    {currentPath.map((fid, idx) => (
                        <div key={fid} className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                            <ArrowRight size={14} className="text-slate-300"/>
                            <span className="truncate max-w-[100px] px-2 py-1 bg-slate-50 border rounded-lg text-xs font-bold text-slate-500">{fid.substring(0, 8)}...</span> 
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input 
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 ring-blue-100 transition-all" 
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                        <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'GRID' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}><Grid size={16}/></button>
                        <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}><LayoutList size={16}/></button>
                    </div>
                    {canEdit && (
                        <div className="flex gap-2 shrink-0">
                             {/* Nút Upload File cho Tab Tài Liệu */}
                            {!isTools && (
                                <>
                                  <button onClick={() => openModal('DOC')} className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-orange-100">
                                      <FileTextIcon size={16}/> Tạo Doc
                                  </button>
                                  <button onClick={handleFileUpload} className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-slate-50">
                                      <Upload size={16}/> Upload
                                  </button>
                                </>
                            )}
                            <button onClick={() => openModal('FOLDER')} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-slate-200"><Folder size={16}/> + Thư mục</button>
                            <button onClick={() => openModal('FILE')} className={`${btnColor} text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg shadow-blue-100`}>
                                {isTools ? <Bot size={16}/> : <Plus size={16}/>} {isTools ? '+ Tool' : '+ Link'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-10 space-y-8">
                {/* BACK BUTTON */}
                {currentPath.length > 0 && (
                     <button onClick={() => setCurrentPath(currentPath.slice(0, -1))} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 mb-4 px-2">
                        <ArrowLeft size={18}/> Quay lại thư mục trước
                    </button>
                )}

                {/* SECTION: THƯ MỤC */}
                {filteredFolders.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2"><Folder size={14}/> Thư mục</h4>
                        <div className={`grid gap-4 ${viewMode === 'GRID' ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-1'}`}>
                            {filteredFolders.map(item => (
                                <div key={item.id} onClick={() => setCurrentPath([...currentPath, item.id])}
                                    className={`group cursor-pointer bg-white border border-slate-200 rounded-2xl hover:shadow-md hover:border-blue-300 transition-all relative ${viewMode === 'GRID' ? 'p-4 flex flex-col items-center text-center aspect-square justify-center' : 'p-3 flex items-center gap-4'}`}>
                                    
                                    <div className={`rounded-2xl flex items-center justify-center text-white shadow-sm ${viewMode === 'GRID' ? 'w-14 h-14 mb-3' : 'w-10 h-10'} ${isTools ? 'bg-indigo-400' : 'bg-amber-400'}`}>
                                        <Folder size={viewMode === 'GRID' ? 28 : 20}/>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <h5 className="font-bold text-slate-700 truncate w-full">{item.name}</h5>
                                        <p className="text-[10px] text-slate-400">{Object.keys(item.children || {}).length} items</p>
                                    </div>

                                    {canEdit && (
                                        <button onClick={(e) => {e.stopPropagation(); handleDelete(item.id, 'RES')}} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-50">
                                            <X size={14}/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SECTION: FILES / TOOLS / DOCS */}
                {filteredFiles.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2 mt-4">
                            {isTools ? <Bot size={14}/> : <FileText size={14}/>} {isTools ? 'Công cụ & Bot' : 'Tài liệu & Links'}
                        </h4>
                        <div className={`grid gap-4 ${viewMode === 'GRID' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
                            {filteredFiles.map(item => (
                                <div key={item.id} 
                                    className={`group bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all relative flex ${viewMode === 'GRID' ? 'flex-col p-4' : 'flex-row items-center p-3 gap-4'}`}>
                                    
                                    <div className={`rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 ${viewMode === 'GRID' ? 'w-12 h-12 mb-3' : 'w-10 h-10'} 
                                        ${item.type === 'DOC' ? 'bg-orange-500' : item.fileType === 'BOT' ? 'bg-indigo-500' : item.fileType === 'VIDEO' ? 'bg-red-500' : 'bg-blue-500'}`}
                                        onClick={() => {
                                            // Nếu là DOC hoặc FILE upload thì mở viewer
                                            if(item.type === 'DOC' || item.fileType === 'LINK') {
                                                setViewingDoc(item);
                                            }
                                        }}
                                        style={{cursor: (item.type === 'DOC' || item.fileType === 'LINK') ? 'pointer' : 'default'}}
                                    >
                                        {item.type === 'DOC' ? <FileTextIcon size={24}/> : item.fileType === 'BOT' ? <Bot size={24}/> : item.fileType === 'VIDEO' ? <Video size={24}/> : <LinkIcon size={24}/>}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h5 className="font-bold text-slate-800 text-sm truncate cursor-pointer hover:text-blue-600" onClick={() => setViewingDoc(item)}>{item.name}</h5>
                                        {item.desc && <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.desc}</p>}
                                        
                                        <div className="mt-3 flex items-center gap-2">
                                            {item.type === 'DOC' ? (
                                                <button onClick={() => setViewingDoc(item)} 
                                                    className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all w-fit bg-orange-50 text-orange-600 hover:bg-orange-100">
                                                    Xem/Sửa <Edit size={10}/>
                                                </button>
                                            ) : (
                                                <>
                                                  {/* Nút Truy cập chính */}
                                                  <a href={item.link} target="_blank" rel="noopener noreferrer" 
                                                      className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all w-fit
                                                      ${isTools ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                                                      {isTools ? 'Mở Tool' : 'Truy cập'} <ExternalLink size={10}/>
                                                  </a>
                                                  {/* Nút Xem trước (Preview) cho file */}
                                                  {!isTools && (
                                                      <button onClick={() => setViewingDoc(item)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 hover:text-slate-800" title="Xem trước">
                                                          <Eye size={14}/>
                                                      </button>
                                                  )}
                                                  {/* Nút Copy Link */}
                                                  <button onClick={() => copyToClipboard(item.link)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 hover:text-slate-800" title="Sao chép liên kết">
                                                      <Copy size={14}/>
                                                  </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {canEdit && (
                                        <button onClick={(e) => {e.stopPropagation(); handleDelete(item.id, 'RES')}} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-50">
                                            <X size={14}/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {listItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl">
                        <Folder size={48} className="mb-2 opacity-50"/>
                        <p>Thư mục trống</p>
                    </div>
                )}
            </div>
        </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-bold animate-pulse">⏳ Đang tải dữ liệu...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex w-fit overflow-x-auto gap-1">
             <button onClick={() => setActiveTab('CALENDAR')} className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${activeTab === 'CALENDAR' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><Calendar size={16}/> LỊCH THÁNG</button>
             <button onClick={() => setActiveTab('WEEKLY')} className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${activeTab === 'WEEKLY' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><List size={16}/> LỊCH TUẦN</button>
             <button onClick={() => setActiveTab('COURSES')} className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${activeTab === 'COURSES' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><GraduationCap size={16}/> QUẢN LÝ KHÓA</button>
             <button onClick={() => { setActiveTab('DOCS'); setCurrentPath([]); }} className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${activeTab === 'DOCS' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><BookOpen size={16}/> TÀI LIỆU</button>
             <button onClick={() => { setActiveTab('TOOLS'); setCurrentPath([]); }} className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 ${activeTab === 'TOOLS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><Bot size={16}/> CÔNG CỤ</button>
          </div>
      </div>

      {activeTab === 'CALENDAR' ? renderMonthCalendar() : 
       activeTab === 'WEEKLY' ? renderWeeklyBoard() :
       activeTab === 'COURSES' ? renderCourseManager() : renderResources()}

      {/* RENDER DOCUMENT VIEWER MODAL (NẾU CÓ) */}
      {renderDocumentViewer()}

      {/* MODAL MAIN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className={`bg-white rounded-3xl w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto ${modalType === 'EVENT' ? 'max-w-4xl' : modalType === 'DOC' ? 'max-w-5xl h-[80vh]' : 'max-w-md'}`}>
              <div className="p-5 border-b bg-slate-50 rounded-t-3xl flex justify-between items-center sticky top-0 bg-white z-10">
                 <h3 className="font-black text-lg text-slate-800 uppercase">
                    {modalType === 'EVENT' ? 'Tạo Lịch Đào Tạo' : modalType === 'TEMPLATE' ? 'Tạo Mẫu Khóa Học' : modalType === 'DOC' ? 'Soạn Thảo Tài Liệu' : 'Thêm Dữ Liệu'}
                 </h3>
                 <button onClick={() => setShowModal(false)}><X/></button>
              </div>
              <div className={`p-6 space-y-4 ${modalType === 'DOC' ? 'h-full flex flex-col' : ''}`}>
                 
                 {modalType === 'EVENT' ? (
                    // ... (Form EVENT cũ)
                    <>
                       <div className="flex bg-slate-100 p-1 rounded-xl mb-4 max-w-sm">
                           <button onClick={() => setEventMode('SINGLE')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${eventMode === 'SINGLE' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>TẠO LẺ</button>
                           <button onClick={() => setEventMode('BATCH')} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${eventMode === 'BATCH' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}>CHỌN TỪ MẪU</button>
                       </div>

                       {eventMode === 'SINGLE' ? (
                           <>
                               <input className="w-full border p-3 rounded-xl font-bold outline-none focus:ring-2 ring-blue-100" placeholder="Tên sự kiện..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}/>
                               <div className="flex gap-2 items-center">
                                   <span className="text-xs font-bold text-slate-500 uppercase">Màu sắc:</span>
                                   {EVENT_COLORS.map(c => (
                                       <button 
                                           key={c.id} 
                                           onClick={() => setFormData({...formData, color: c.id})}
                                           className={`w-6 h-6 rounded-full border-2 transition-all ${c.class.split(' ')[0]} ${formData.color === c.id ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : 'border-transparent'}`}
                                           title={c.label}
                                       />
                                   ))}
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                  <input type="date" className="w-full border p-3 rounded-xl outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}/>
                                  <input type="time" className="w-full border p-3 rounded-xl outline-none" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}/>
                               </div>
                               <input className="w-full border p-3 rounded-xl outline-none" placeholder="Người đào tạo" value={formData.trainer} onChange={e => setFormData({...formData, trainer: e.target.value})}/>
                               <input className="w-full border p-3 rounded-xl outline-none" placeholder="Địa điểm" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}/>
                           </>
                       ) : (
                           <div className="flex flex-col md:flex-row gap-6">
                               <div className="flex-1 space-y-4">
                                   <div>
                                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Chọn mẫu có sẵn</label>
                                       <select className="w-full border p-3 rounded-xl outline-none font-bold" value={formData.selectedTemplate || ""} onChange={e => setFormData({...formData, selectedTemplate: e.target.value})}>
                                          <option value="">-- Chọn khóa học --</option>
                                          {Object.keys(templates).map(k => (
                                              <option key={k} value={k}>{templates[k].title} ({templates[k].sessions} buổi)</option>
                                          ))}
                                       </select>
                                   </div>
                                   <div className="flex gap-2 items-center">
                                       <span className="text-xs font-bold text-slate-500 uppercase">Màu hiển thị:</span>
                                       <div className={`w-6 h-6 rounded-full ${EVENT_COLORS.find(c => c.id === formData.color)?.class.split(' ')[0] || 'bg-blue-100'}`}></div>
                                       <span className="text-xs font-bold text-slate-600">{EVENT_COLORS.find(c => c.id === formData.color)?.label || 'Mặc định'}</span>
                                   </div>
                                   <div className="grid grid-cols-2 gap-4">
                                       <div>
                                           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mã khóa (K...)</label>
                                           <input className="w-full border p-3 rounded-xl outline-none font-bold text-purple-600" placeholder="VD: K15" value={formData.batchCode || ""} onChange={e => setFormData({...formData, batchCode: e.target.value})}/>
                                       </div>
                                       <div>
                                           <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ngày bắt đầu</label>
                                           <input type="date" className="w-full border p-3 rounded-xl outline-none" value={formData.startDate || ""} onChange={e => setFormData({...formData, startDate: e.target.value})}/>
                                       </div>
                                   </div>
                               </div>
                               {batchSchedule.length > 0 && (
                                   <div className="flex-1 border-l pl-6">
                                       <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Danh sách buổi học (Tự động)</label>
                                       <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                           {batchSchedule.map((session, idx) => (
                                               <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                                                   <span className="text-xs font-bold w-10 shrink-0 text-slate-500 text-center">B{idx+1}</span>
                                                   <input type="date" className="w-32 border p-1.5 rounded text-sm font-bold" value={session.date} 
                                                        onChange={(e) => {
                                                            const newSch = [...batchSchedule];
                                                            newSch[idx].date = e.target.value;
                                                            setBatchSchedule(newSch);
                                                        }}
                                                   />
                                                   <input type="time" className="w-20 border p-1.5 rounded text-sm" value={session.time}
                                                        onChange={(e) => {
                                                            const newSch = [...batchSchedule];
                                                            newSch[idx].time = e.target.value;
                                                            setBatchSchedule(newSch);
                                                        }}
                                                   />
                                                   <input className="flex-1 border p-1.5 rounded text-sm min-w-[100px]" placeholder="Giảng viên" value={session.trainer}
                                                        onChange={(e) => {
                                                            const newSch = [...batchSchedule];
                                                            newSch[idx].trainer = e.target.value;
                                                            setBatchSchedule(newSch);
                                                        }}
                                                   />
                                               </div>
                                           ))}
                                       </div>
                                   </div>
                               )}
                           </div>
                       )}
                    </>
                 ) : modalType === 'TEMPLATE' ? (
                    // ... (Form TEMPLATE cũ)
                    <>
                       <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-sm text-blue-800 mb-2">
                           Tạo 1 lần dùng mãi mãi. Ví dụ: "Khóa Ads Cơ Bản" gồm 3 buổi.
                       </div>
                       <input className="w-full border p-3 rounded-xl font-bold outline-none" placeholder="Tên mẫu (VD: Khóa Ads Cơ Bản)..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}/>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="text-xs font-bold text-slate-400">Số buổi</label>
                               <input type="number" min="1" className="w-full border p-3 rounded-xl outline-none" placeholder="Số buổi" value={formData.sessions} onChange={e => setFormData({...formData, sessions: e.target.value})}/>
                           </div>
                           <div>
                               <label className="text-xs font-bold text-slate-400">Giờ mặc định</label>
                               <input type="time" className="w-full border p-3 rounded-xl outline-none" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}/>
                           </div>
                       </div>
                       <div>
                           <label className="text-xs font-bold text-slate-400 mb-2 block">Màu sắc mặc định</label>
                           <div className="flex gap-2">
                               {EVENT_COLORS.map(c => (
                                   <button 
                                       key={c.id} 
                                       onClick={() => setFormData({...formData, color: c.id})}
                                       className={`w-8 h-8 rounded-full border-2 transition-all ${c.class.split(' ')[0]} ${formData.color === c.id ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : 'border-transparent'}`}
                                       title={c.label}
                                   />
                               ))}
                           </div>
                       </div>
                       <div>
                           <label className="text-xs font-bold text-slate-400 mb-2 block">Lịch dạy cố định (Tùy chọn)</label>
                           <div className="flex gap-2">
                               {DAYS_OF_WEEK.map(day => (
                                   <button 
                                       key={day.id}
                                       onClick={() => togglePreferredDay(day.id)}
                                       className={`w-10 h-10 rounded-lg font-bold text-sm transition-all border 
                                           ${(formData.preferredDays || []).includes(day.id) 
                                           ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                           : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'}`}
                                   >
                                       {day.label}
                                   </button>
                               ))}
                           </div>
                           <p className="text-[10px] text-slate-400 mt-1 italic">Chọn các ngày dạy cố định (VD: T3, T6) để hệ thống tự xếp lịch thông minh.</p>
                       </div>
                       <input className="w-full border p-3 rounded-xl outline-none" placeholder="Người đào tạo mặc định" value={formData.trainer} onChange={e => setFormData({...formData, trainer: e.target.value})}/>
                    </>
                 ) : modalType === 'DOC' ? (
                     // FORM SOẠN THẢO DOC
                     <div className="flex flex-col h-full gap-4">
                         <input className="w-full border p-3 rounded-xl font-bold text-xl outline-none focus:ring-2 ring-orange-100" placeholder="Tiêu đề tài liệu..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                         <div className="flex-1 overflow-hidden">
                            <SimpleRichTextEditor 
                                value={formData.content} 
                                onChange={(val) => setFormData({...formData, content: val})} 
                            />
                         </div>
                     </div>
                 ) : (
                    // FORM FOLDER/FILE
                    <>
                       <input className="w-full border p-3 rounded-xl font-bold outline-none" placeholder={modalType === 'FOLDER' ? "Tên thư mục..." : "Tên file/bot..."} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
                       {modalType === 'FILE' && (
                           <>
                             <select className="w-full border p-3 rounded-xl outline-none mb-2" value={formData.fileType} onChange={e => setFormData({...formData, fileType: e.target.value})}>
                                <option value="LINK">🔗 Link</option>
                                <option value="BOT">🤖 Chatbot</option>
                                <option value="VIDEO">🎥 Video</option>
                             </select>
                             <input className="w-full border p-3 rounded-xl outline-none text-blue-600" placeholder="Link..." value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})}/>
                           </>
                       )}
                    </>
                 )}
                 <button onClick={handleSave} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-800 transition-all">LƯU LẠI</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}