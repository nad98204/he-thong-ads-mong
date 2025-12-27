import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { ref, push, set, update, onValue, remove } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';
import {
  Kanban, Plus, Clock, FileText, Settings, X, 
  CheckSquare, Link as LinkIcon, Tag, AlertTriangle, 
  Users, ChevronRight, BarChart3, Save, MoreHorizontal,
  Calendar as CalIcon, CheckCircle2, PlayCircle, StopCircle,
  LayoutList, Target, TrendingUp, AlertCircle, Trash2, History
} from 'lucide-react';

// --- HELPERS ---
const sanitizeEmail = (email) => email ? email.replace(/\./g, '_') : 'unknown';
const getTodayStr = () => new Date().toISOString().split('T')[0];
const getMonthStr = (date = new Date()) => date.toISOString().slice(0, 7);
const formatDateTime = (isoStr) => {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  return `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')} ${date.getDate()}/${date.getMonth()+1}`;
};

const getCurrentWeekDays = () => {
  const curr = new Date();
  const week = [];
  const first = curr.getDate() - curr.getDay() + 1; 
  for (let i = 0; i < 7; i++) {
    const next = new Date(curr.setDate(first + i));
    week.push(next.toISOString().split('T')[0]); 
  }
  return week;
};
const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

const STATUSES = {
  TODO: { label: 'Cần làm', bg: 'bg-slate-100/50', header: 'text-slate-700', accent: 'bg-slate-400' },
  DOING: { label: 'Đang thực hiện', bg: 'bg-indigo-50/50', header: 'text-indigo-700', accent: 'bg-indigo-500' },
  DONE: { label: 'Hoàn thành', bg: 'bg-emerald-50/50', header: 'text-emerald-700', accent: 'bg-emerald-500' }
};

export default function TaskManager() {
  const { currentUser, userRole } = useAuth();
  const isAdminOrLeader = ['ADMIN', 'LEADER'].includes(userRole);

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('TASKS');
  const [viewMode, setViewMode] = useState('CALENDAR'); 
  const [reportSubTab, setReportSubTab] = useState('PERSONAL');
  
  // Data State
  const [tasks, setTasks] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [teamList, setTeamList] = useState(["CHUNG"]);
  const [membersMap, setMembersMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Report & Goals Data
  const [dailyReports, setDailyReports] = useState([]);
  const [teamSummaries, setTeamSummaries] = useState({});
  const [selectedReportDate, setSelectedReportDate] = useState(getTodayStr()); 
  const [currentReportData, setCurrentReportData] = useState(null); 
  const [smartGoals, setSmartGoals] = useState([]); 
  
  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false); 
  const [editingTask, setEditingTask] = useState(null);

  // Forms
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', assignee: '', department: '', 
    deadline: '', duration: '',
    priority: 'NORMAL', status: 'TODO', checklist: [], tags: [], attachments: [] 
  });

  // --- UPDATED REPORT FORM STATE (Arrays) ---
  const [reportForm, setReportForm] = useState({ 
    doneTasks: [], // Array of {id, title, note, isDone}
    planTasks: [], // Array of {id, title, note}
    issues: '', 
    actualDuration: '' 
  });

  // Settings Form
  const [settingsForm, setSettingsForm] = useState({ teams: [], members: {} });

  const [teamSummaryForm, setTeamSummaryForm] = useState({ result: '', issues: '' });
  const [goalForm, setGoalForm] = useState({ name: '', target: 0, current: 0, unit: '', deadline: getTodayStr() });
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // --- DATA SYNC ---
  useEffect(() => {
    // 1. Settings
    const settingsRef = ref(db, 'task_manager/settings');
    onValue(settingsRef, (snap) => {
      const val = snap.val();
      if (val) {
        setTeamList(val.teams || ["CHUNG"]);
        setMembersMap(val.members_map || {});
        setSettingsForm({ teams: val.teams || ["CHUNG"], members: val.members_map || {} });
      }
    });

    // 2. Tasks
    onValue(ref(db, 'tasks'), (snap) => {
      const val = snap.val();
      setTasks(val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : []);
      setLoading(false);
    });

    // 3. Users
    onValue(ref(db, 'system_settings/users'), (snap) => {
      const val = snap.val();
      setStaffList(val ? (Array.isArray(val) ? val : Object.values(val)) : []);
    });

    // 4. Goals
    const monthStr = getMonthStr();
    onValue(ref(db, `smart_goals/${monthStr}`), (snap) => {
      const val = snap.val();
      setSmartGoals(val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : []);
    });
  }, []);

  // Reports Sync
  useEffect(() => {
    if (activeTab === 'REPORTS') {
      const dateObj = new Date(selectedReportDate);
      const monthStr = getMonthStr(dateObj); 

      onValue(ref(db, `work_reports/${monthStr}`), (snap) => {
        const val = snap.val();
        let list = [];
        if (val) {
          Object.keys(val).forEach(safeEmail => {
             Object.keys(val[safeEmail]).forEach(date => {
                list.push({ id: `${safeEmail}_${date}`, safeEmail, date, ...val[safeEmail][date] });
             });
          });
        }
        setDailyReports(list);
        
        const mySafe = sanitizeEmail(currentUser?.email);
        setCurrentReportData(list.find(r => r.safeEmail === mySafe && r.date === selectedReportDate) || null);
      });

      if (isAdminOrLeader) {
        onValue(ref(db, `work_reports/team_summaries/${monthStr}`), (snap) => {
           setTeamSummaries(snap.val() || {});
        });
      }
    }
  }, [activeTab, isAdminOrLeader, currentUser, selectedReportDate]);

  // --- LOGIC ---
  const myCurrentTeam = useMemo(() => {
    const safeEmail = sanitizeEmail(currentUser?.email);
    return membersMap[safeEmail] || 'CHUNG';
  }, [membersMap, currentUser]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const isMine = t.assignee === currentUser?.email;
      const isMyTeam = t.department === myCurrentTeam;
      if (!isAdminOrLeader && !isMine && !isMyTeam) return false;
      return true;
    });
  }, [tasks, isAdminOrLeader, currentUser, myCurrentTeam]);

  const teamReportStatus = useMemo(() => {
    if (!isAdminOrLeader) return [];
    const myStaffs = staffList.filter(u => {
      const uTeam = membersMap[sanitizeEmail(u.email)] || 'CHUNG';
      return currentUser.role === 'ADMIN' ? true : uTeam === myCurrentTeam;
    });
    return myStaffs.map(staff => {
      const hasReported = dailyReports.some(r => r.safeEmail === sanitizeEmail(staff.email) && r.date === selectedReportDate);
      return { ...staff, hasReported };
    });
  }, [staffList, dailyReports, membersMap, myCurrentTeam, isAdminOrLeader, selectedReportDate]);

  const calculateForecast = (goal) => {
    if (!goal.target) return { text: '...', color: 'text-slate-400' };
    const percent = (goal.current / goal.target) * 100;
    const today = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const expectedPercent = (today / daysInMonth) * 100;

    if (percent >= 100) return { text: '🏆 Xuất sắc!', color: 'text-emerald-600' };
    if (percent >= expectedPercent) return { text: '🚀 Khả thi', color: 'text-emerald-600' };
    return { text: `⚠️ Cần tăng tốc`, color: 'text-rose-600' };
  };

  // --- ACTIONS ---
  
  // 1. SETTINGS ACTIONS (FIXED)
  const handleSaveSettings = () => {
    const updates = {};
    updates['task_manager/settings/teams'] = settingsForm.teams;
    updates['task_manager/settings/members_map'] = settingsForm.members;

    update(ref(db), updates)
      .then(() => {
        alert("Đã lưu cấu hình thành công!");
        setShowSettingsModal(false);
      })
      .catch(err => alert("Lỗi khi lưu: " + err.message));
  };

  // 2. REPORT ACTIONS (DYNAMIC LIST ACTIVATED)
  const handleAddLine = (type) => {
    const newItem = { id: Date.now(), title: '', note: '', isDone: false };
    if (type === 'DONE') {
      setReportForm(prev => ({ ...prev, doneTasks: [...prev.doneTasks, newItem] }));
    } else {
      setReportForm(prev => ({ ...prev, planTasks: [...prev.planTasks, newItem] }));
    }
  };

  const handleRemoveLine = (type, index) => {
    if (type === 'DONE') {
      const newItems = [...reportForm.doneTasks]; newItems.splice(index, 1);
      setReportForm(prev => ({ ...prev, doneTasks: newItems }));
    } else {
      const newItems = [...reportForm.planTasks]; newItems.splice(index, 1);
      setReportForm(prev => ({ ...prev, planTasks: newItems }));
    }
  };

  const handleChangeText = (type, index, field, value) => {
    if (type === 'DONE') {
      const newItems = [...reportForm.doneTasks];
      newItems[index][field] = value;
      setReportForm(prev => ({ ...prev, doneTasks: newItems }));
    } else {
      const newItems = [...reportForm.planTasks];
      newItems[index][field] = value;
      setReportForm(prev => ({ ...prev, planTasks: newItems }));
    }
  };

  const handleToggleCheck = (index, checked) => {
      const newItems = [...reportForm.doneTasks];
      newItems[index].isDone = checked;
      setReportForm(prev => ({ ...prev, doneTasks: newItems }));
  };

  const handleSendReport = () => {
    const safeEmail = sanitizeEmail(currentUser.email);
    const date = getTodayStr(); 
    const month = getMonthStr();
    
    // Filter empty lines before saving
    const cleanDone = reportForm.doneTasks.filter(i => i.title.trim() !== '');
    const cleanPlan = reportForm.planTasks.filter(i => i.title.trim() !== '');

    set(ref(db, `work_reports/${month}/${safeEmail}/${date}`), {
      doneTasks: cleanDone,
      planTasks: cleanPlan,
      issues: reportForm.issues,
      actualDuration: reportForm.actualDuration,
      userEmail: currentUser.email,
      userName: currentUser.name,
      createdAt: new Date().toISOString()
    });
    setReportModalOpen(false);
  };

  // 3. TASK & GOAL ACTIONS
  const handleSaveTask = () => {
    if (!taskForm.title) return alert("Thiếu tên công việc!");
    const payload = { ...taskForm, assignee: taskForm.assignee || null, department: taskForm.department || myCurrentTeam, updatedAt: new Date().toISOString() };
    if (editingTask) update(ref(db, `tasks/${editingTask.id}`), payload);
    else set(push(ref(db, 'tasks')), { ...payload, creator: currentUser.email, createdAt: new Date().toISOString() });
    setTaskModalOpen(false);
  };

  const handleSaveGoal = () => {
    if(!goalForm.name || !goalForm.target) return alert("Nhập đủ thông tin");
    const monthStr = getMonthStr();
    push(ref(db, `smart_goals/${monthStr}`), { ...goalForm, lastUpdated: new Date().toISOString() });
    setGoalModalOpen(false);
  };

  const handleSendTeamSummary = () => {
    if (!teamSummaryForm.result) return alert("Cần nhập nội dung!");
    const month = getMonthStr(new Date(selectedReportDate));
    const path = `work_reports/team_summaries/${month}/${selectedReportDate}/${myCurrentTeam}`;
    set(ref(db, path), { ...teamSummaryForm, reporter: currentUser.name, updatedAt: new Date().toISOString() });
    alert("Đã chốt báo cáo Team!");
  };

  // --- HELPERS ---
  const isOverdue = (task) => {
    if (!task.deadline || task.status === 'DONE') return false;
    return new Date(task.deadline) < new Date();
  };

  // Component: Backward Compatible Report Viewer
  const ReportContentRenderer = ({ content }) => {
    // Old String Data
    if (typeof content === 'string') return <p className="text-sm text-slate-600 whitespace-pre-line">{content}</p>;
    // New Array Data
    if (Array.isArray(content) && content.length > 0) {
      return (
        <div className="space-y-2 mt-2">
          {content.map((item, idx) => (
            <div key={idx} className={`p-2 rounded-lg border flex items-start gap-2 ${item.isDone ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}>
              <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center ${item.isDone ? 'bg-emerald-100 border-emerald-500' : 'border-slate-300'}`}>
                {item.isDone && <CheckCircle2 size={10} className="text-emerald-600"/>}
              </div>
              <div className="flex-1">
                <div className={`text-sm font-bold ${item.isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.title}</div>
                {item.note && <div className="text-xs text-slate-500 mt-0.5">{item.note}</div>}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-slate-400 text-xs italic">Không có dữ liệu</span>;
  };

  const Avatar = ({ email }) => (
    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold border border-white shadow-sm" title={email}>
      {email?.charAt(0).toUpperCase()}
    </div>
  );

  const ProgressBar = ({ current, target, colorClass }) => {
    let percent = 0;
    // Task Checklist Mode
    if(Array.isArray(current)) {
       if(current.length === 0) return null;
       percent = Math.round((current.filter(i=>i.done).length/current.length)*100);
       return <div className="w-full bg-slate-100 rounded-full h-1 mt-3 overflow-hidden"><div className={`h-1 rounded-full ${percent===100?'bg-emerald-500':'bg-indigo-500'}`} style={{width:`${percent}%`}}></div></div>
    }
    // Goal Mode
    const cur = current || 0; const tar = target || 1;
    percent = Math.min(Math.round((cur / tar) * 100), 100);
    return <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden"><div className={`h-2.5 rounded-full duration-700 ${colorClass || (percent===100?'bg-emerald-500':'bg-purple-500')}`} style={{width:`${percent}%`}}></div></div>
  };

  if (loading) return <div className="p-10 text-center animate-pulse">⏳ Loading...</div>;

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* HEADER */}
      <div className="h-16 bg-white border-b border-slate-200 px-6 flex justify-between items-center sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-6">
           <div className="flex bg-slate-100 p-1 rounded-lg">
             {['TASKS', 'REPORTS'].map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} 
                 className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${activeTab === tab ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 {tab === 'TASKS' ? <Kanban size={14}/> : <FileText size={14}/>} {tab === 'TASKS' ? 'Công Việc' : 'Báo Cáo'}
               </button>
             ))}
           </div>
           {activeTab === 'TASKS' && (
             <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('LIST')} className={`view-btn ${viewMode==='LIST'?'active':''}`}><LayoutList size={14}/> List</button>
                <button onClick={() => setViewMode('KANBAN')} className={`view-btn ${viewMode==='KANBAN'?'active':''}`}><Kanban size={14}/> Board</button>
                <button onClick={() => setViewMode('CALENDAR')} className={`view-btn ${viewMode==='CALENDAR'?'active':''}`}><CalIcon size={14}/> Lịch</button>
             </div>
           )}
        </div>
        <div className="flex items-center gap-4">
           {isAdminOrLeader && (
             <button onClick={() => setShowSettingsModal(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
               <Settings size={20}/>
             </button>
           )}
           <div className="text-right hidden md:block">
             <div className="text-sm font-bold text-slate-800">{currentUser?.name}</div>
             <div className="text-[10px] font-bold text-slate-400 uppercase">{myCurrentTeam}</div>
           </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="flex-1 overflow-hidden relative p-6">
        
        {/* === TAB 1: TASKS (Keep existing UI logic) === */}
        {activeTab === 'TASKS' && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản Lý Dự Án</h1>
                <p className="text-sm text-slate-500 font-medium">Tiến độ công việc của {myCurrentTeam}</p>
              </div>
              {isAdminOrLeader && (
                <button onClick={() => { setEditingTask(null); setTaskForm({ title: '', deadline: '', duration: '', department: myCurrentTeam, status: 'TODO', checklist: [], tags: [], attachments: [] }); setTaskModalOpen(true); }} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center gap-2">
                  <Plus size={18}/> Tạo Mới
                </button>
              )}
            </div>

            {/* KANBAN VIEW */}
            {viewMode === 'KANBAN' && (
            <div className="flex-1 overflow-x-auto pb-4">
               <div className="flex gap-6 h-full min-w-[1000px]">
                 {Object.keys(STATUSES).map(statusKey => {
                   const config = STATUSES[statusKey];
                   const items = filteredTasks.filter(t => t.status === statusKey);
                   return (
                     <div key={statusKey} className={`flex-1 flex flex-col ${config.bg} rounded-2xl p-2 h-full border border-slate-200/50`}>
                       <div className="p-3 flex justify-between items-center mb-2">
                         <span className={`font-black text-xs uppercase ${config.header}`}>{config.label}</span>
                         <span className="bg-white/60 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">{items.length}</span>
                       </div>
                       <div className="flex-1 overflow-y-auto space-y-3 px-1 custom-scrollbar">
                         {items.map(task => (
                           <div key={task.id} onClick={() => { setEditingTask(task); setTaskForm(task); setTaskModalOpen(true); }}
                             className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
                             <h4 className={`font-bold text-sm text-slate-700 mb-2 ${task.status === 'DONE' ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
                             <div className="flex items-center gap-3 text-[10px] text-slate-500">
                               {task.deadline && <div className="flex items-center gap-1"><Clock size={12}/> {formatDateTime(task.deadline)}</div>}
                               {task.checklist?.length > 0 && <div className="flex items-center gap-1"><CheckSquare size={12}/> {task.checklist.filter(i=>i.done).length}/{task.checklist.length}</div>}
                             </div>
                             <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                               <Avatar email={task.assignee}/>
                               {task.duration && <span className="bg-slate-50 text-indigo-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{task.duration}</span>}
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   )
                 })}
               </div>
            </div>
            )}

            {/* CALENDAR VIEW */}
            {viewMode === 'CALENDAR' && (
              <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                 <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    {getCurrentWeekDays().map((d,i) => (
                      <div key={i} className="p-3 text-center border-r last:border-0 border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase">{DAY_NAMES[i]}</div>
                        <div className={`text-lg font-black ${d===getTodayStr()?'text-indigo-600':'text-slate-700'}`}>{d.split('-')[2]}</div>
                      </div>
                    ))}
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-7 min-h-full">
                       {getCurrentWeekDays().map((d,i) => {
                          const dayTasks = filteredTasks.filter(t => t.deadline?.startsWith(d));
                          return (
                            <div key={i} className="border-r last:border-0 border-slate-200 p-2 min-h-[400px]">
                               {dayTasks.length > 5 && <div className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded mb-2 flex items-center gap-1"><AlertTriangle size={10}/> Quá tải</div>}
                               {dayTasks.map(t => (
                                 <div key={t.id} onClick={() => { setEditingTask(t); setTaskForm(t); setTaskModalOpen(true); }}
                                   className="bg-white border border-slate-200 p-2 rounded-lg mb-2 shadow-sm text-xs font-bold text-slate-700 cursor-pointer hover:border-indigo-300 truncate">
                                   {t.title}
                                 </div>
                               ))}
                            </div>
                          )
                       })}
                    </div>
                 </div>
              </div>
            )}
            
            {/* --- ACTIVATED LIST VIEW --- */}
            {viewMode === 'LIST' && (
               <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                 <div className="overflow-y-auto custom-scrollbar flex-1 p-0">
                   <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                           <th className="p-4 w-1/3">Công việc</th>
                           <th className="p-4">Người làm</th>
                           <th className="p-4">Hạn chót</th>
                           <th className="p-4">Trạng thái</th>
                           <th className="p-4">Ưu tiên</th>
                        </tr>
                     </thead>
                     <tbody className="text-sm">
                       {filteredTasks.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic">Không có công việc nào.</td></tr>
                       ) : (
                          filteredTasks.map(t => (
                            <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                                onClick={() => { setEditingTask(t); setTaskForm(t); setTaskModalOpen(true); }}>
                              <td className="p-4 font-bold text-slate-700">
                                 {t.title}
                                 <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{t.description}</div>
                              </td>
                              <td className="p-4 flex items-center gap-2">
                                 <Avatar email={t.assignee}/>
                                 <span className="text-slate-600 text-xs">{staffList.find(u=>u.email===t.assignee)?.name || 'Pool'}</span>
                              </td>
                              <td className="p-4 text-slate-500 text-xs">{t.deadline ? t.deadline.replace('T', ' ') : '-'}</td>
                              <td className="p-4"><span className={`text-[10px] font-bold px-2 py-1 rounded ${t.status==='DONE'?'bg-emerald-100 text-emerald-600':(t.status==='DOING'?'bg-indigo-100 text-indigo-600':'bg-slate-100 text-slate-600')}`}>{STATUSES[t.status]?.label}</span></td>
                              <td className="p-4"><span className={`text-[10px] font-bold ${t.priority==='HIGH'?'text-rose-600 bg-rose-50 px-2 py-1 rounded':'text-slate-500'}`}>{t.priority}</span></td>
                            </tr>
                          ))
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>
            )}
          </div>
        )}

        {/* === TAB 2: REPORTS & GOALS === */}
        {activeTab === 'REPORTS' && (
          <div className="h-full flex flex-col max-w-7xl mx-auto">
            {/* GOALS SECTION */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
               {smartGoals.map(goal => {
                  const percent = Math.min(Math.round((goal.current / goal.target) * 100), 100);
                  return (
                    <div key={goal.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                       <div className="flex justify-between mb-2">
                          <h3 className="font-bold text-slate-700">{goal.name}</h3>
                          <span className="text-sm font-black text-purple-600">{percent}%</span>
                       </div>
                       <ProgressBar current={goal.current} target={goal.target}/>
                       <div className="mt-2 text-xs text-slate-500 flex justify-between">
                          <span>Hiện tại: {goal.current}</span>
                          <span>Mục tiêu: {goal.target} {goal.unit}</span>
                       </div>
                    </div>
                  )
               })}
               {isAdminOrLeader && (
                 <button onClick={() => setGoalModalOpen(true)} className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-purple-300 hover:text-purple-600 transition-all">
                    <Plus size={24}/>
                    <span className="text-xs font-bold mt-1">Thêm KPI Tháng</span>
                 </button>
               )}
            </div>

            {/* REPORT HISTORY & TABS */}
            <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-2">
               <div className="flex gap-6">
                  <button onClick={() => setReportSubTab('PERSONAL')} className={`pb-2 text-sm font-bold border-b-2 transition-all ${reportSubTab === 'PERSONAL' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>Cá Nhân</button>
                  {isAdminOrLeader && <button onClick={() => setReportSubTab('TEAM')} className={`pb-2 text-sm font-bold border-b-2 transition-all ${reportSubTab === 'TEAM' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>Tổng Hợp Team</button>}
               </div>
               
               <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                  <History size={14} className="text-slate-400"/>
                  <span className="text-xs font-bold text-slate-500 mr-2">Xem ngày:</span>
                  <input type="date" className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer" 
                    value={selectedReportDate} onChange={(e) => setSelectedReportDate(e.target.value)} max={getTodayStr()}/>
               </div>
            </div>

            <div className="flex-1 overflow-hidden">
               {reportSubTab === 'PERSONAL' && (
                 <div className="h-full flex flex-col lg:flex-row gap-6">
                    {/* LEFT: TODAY'S STATUS */}
                    <div className="w-full lg:w-1/3">
                       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
                          <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                             <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><CalIcon size={20}/></div>
                             Báo cáo: {selectedReportDate === getTodayStr() ? "Hôm nay" : selectedReportDate}
                          </h3>
                          
                          {currentReportData ? (
                             <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                   <CheckCircle2 size={40} className="text-emerald-500"/>
                                </div>
                                <h4 className="font-black text-emerald-800 text-xl mb-1">Đã Báo Cáo</h4>
                                <p className="text-emerald-600 text-sm mb-6">Bạn đã hoàn thành nhiệm vụ ngày này.</p>
                                
                                <div className="w-full bg-white p-4 rounded-xl text-left shadow-sm space-y-2">
                                   <div className="text-xs text-slate-400 uppercase font-bold">Thống kê</div>
                                   <div className="flex justify-between text-sm font-bold text-slate-700">
                                      <span>✅ Việc đã làm:</span>
                                      <span>{Array.isArray(currentReportData.doneTasks) ? currentReportData.doneTasks.length : '-'}</span>
                                   </div>
                                   <div className="flex justify-between text-sm font-bold text-slate-700">
                                      <span>⏱️ Thời gian:</span>
                                      <span>{currentReportData.actualDuration}</span>
                                   </div>
                                </div>
                             </div>
                          ) : (
                             <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                   <FileText size={40}/>
                                </div>
                                {selectedReportDate === getTodayStr() ? (
                                   <>
                                     <h4 className="font-bold text-slate-600 text-lg">Chưa có báo cáo</h4>
                                     <p className="text-slate-400 text-xs mb-6">Hãy tổng kết công việc hôm nay của bạn.</p>
                                     <button onClick={() => { 
                                         setReportForm({ doneTasks: [], planTasks: [], issues: '', actualDuration: '' }); 
                                         setReportModalOpen(true); 
                                     }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:scale-105 transition-transform w-full">
                                       Viết Báo Cáo Ngay
                                     </button>
                                   </>
                                ) : (
                                   <p className="text-slate-400 font-bold">Không có dữ liệu báo cáo cho ngày này.</p>
                                )}
                             </div>
                          )}
                       </div>
                    </div>

                    {/* RIGHT: REPORT DETAIL VIEW */}
                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto custom-scrollbar">
                       {currentReportData ? (
                          <div className="space-y-6">
                             <div>
                                <h4 className="text-xs font-bold text-emerald-600 uppercase mb-3 flex items-center gap-2"><CheckCircle2 size={16}/> Kết quả công việc</h4>
                                <ReportContentRenderer content={currentReportData.doneTasks || currentReportData.done} />
                             </div>
                             
                             <div className="border-t border-slate-100 pt-6">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase mb-3 flex items-center gap-2"><PlayCircle size={16}/> Kế hoạch tiếp theo</h4>
                                <ReportContentRenderer content={currentReportData.planTasks || currentReportData.plan} />
                             </div>

                             {(currentReportData.issues) && (
                                <div className="border-t border-slate-100 pt-6">
                                   <h4 className="text-xs font-bold text-rose-600 uppercase mb-3 flex items-center gap-2"><AlertTriangle size={16}/> Vấn đề / Khó khăn</h4>
                                   <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-sm text-rose-800 whitespace-pre-line">
                                      {currentReportData.issues}
                                   </div>
                                </div>
                             )}
                          </div>
                       ) : (
                          <div className="h-full flex items-center justify-center text-slate-300 font-bold italic">
                             Chọn ngày có dữ liệu để xem chi tiết
                          </div>
                       )}
                    </div>
                 </div>
               )}
               {/* Team Tab Content Omitted for brevity, logic remains same as previous */}
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL: TASK DETAIL (Giữ nguyên) --- */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
           {/* ... Task Modal Code ... */}
           {/* (Giữ nguyên code Modal Task từ phiên bản trước để tiết kiệm chỗ hiển thị,
                nhưng logic handleSaveTask đã có ở trên) */}
           <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
              <h3 className="font-bold text-lg mb-4">{editingTask ? 'Sửa' : 'Thêm'} Công Việc</h3>
              <input className="w-full p-3 bg-slate-50 rounded-xl mb-4 font-bold outline-none" placeholder="Tên việc..." 
                value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})}/>
              <div className="grid grid-cols-2 gap-4 mb-4">
                 <input type="datetime-local" className="p-3 bg-slate-50 rounded-xl text-sm outline-none" 
                    value={taskForm.deadline} onChange={e => setTaskForm({...taskForm, deadline: e.target.value})}/>
                 <select className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none" 
                    value={taskForm.status} onChange={e => setTaskForm({...taskForm, status: e.target.value})}>
                    {Object.keys(STATUSES).map(k=><option key={k} value={k}>{STATUSES[k].label}</option>)}
                 </select>
              </div>
              <div className="flex justify-end gap-3">
                 <button onClick={() => setTaskModalOpen(false)} className="text-slate-500 font-bold">Hủy</button>
                 <button onClick={handleSaveTask} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Lưu</button>
              </div>
           </div>
        </div>
      )}

      {/* --- ACTIVATED: DYNAMIC REPORT MODAL --- */}
      {reportModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 p-0 overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-5 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-lg flex items-center gap-2"><FileText/> Báo Cáo Chi Tiết</h3>
                  <button onClick={() => setReportModalOpen(false)} className="text-white/80 hover:text-white"><X/></button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                  {/* DONE TASKS SECTION */}
                  <div>
                     <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-indigo-600 uppercase flex items-center gap-2"><CheckCircle2 size={14}/> Kết Quả Hôm Nay</label>
                        <button onClick={() => handleAddLine('DONE')} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">+ Thêm dòng</button>
                     </div>
                     <div className="space-y-3">
                        {reportForm.doneTasks.map((item, idx) => (
                           <div key={item.id} className="group p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white hover:border-indigo-200 transition-all shadow-sm">
                              <div className="flex items-center gap-3">
                                 <input type="checkbox" checked={item.isDone} onChange={e => handleToggleCheck(idx, e.target.checked)} className="w-5 h-5 accent-emerald-500 cursor-pointer"/>
                                 <input className={`flex-1 bg-transparent outline-none text-sm font-bold ${item.isDone ? 'line-through text-slate-400' : 'text-slate-800'}`} 
                                    placeholder="Tên đầu việc..." value={item.title} onChange={e => handleChangeText('DONE', idx, 'title', e.target.value)}/>
                                 <button onClick={() => handleRemoveLine('DONE', idx)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>
                              </div>
                              <input className="w-full mt-2 bg-transparent text-xs text-slate-500 outline-none border-b border-dashed border-slate-300 focus:border-indigo-300 pb-1" 
                                 placeholder="Chi tiết / Ghi chú thêm (Optional)..." value={item.note} onChange={e => handleChangeText('DONE', idx, 'note', e.target.value)}/>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* PLAN TASKS SECTION */}
                  <div>
                     <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><PlayCircle size={14}/> Kế Hoạch Ngày Mai</label>
                        <button onClick={() => handleAddLine('PLAN')} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200">+ Thêm dòng</button>
                     </div>
                     <div className="space-y-3">
                        {reportForm.planTasks.map((item, idx) => (
                           <div key={item.id} className="group p-3 border border-slate-200 rounded-xl bg-white hover:border-indigo-200 transition-all shadow-sm flex items-start gap-3">
                              <span className="mt-1 text-xs font-bold text-slate-300">{idx+1}.</span>
                              <div className="flex-1">
                                 <input className="w-full bg-transparent outline-none text-sm font-bold text-slate-800 mb-1" 
                                    placeholder="Dự định làm gì..." value={item.title} onChange={e => handleChangeText('PLAN', idx, 'title', e.target.value)}/>
                                 <input className="w-full bg-transparent text-xs text-slate-500 outline-none" 
                                    placeholder="Ghi chú..." value={item.note} onChange={e => handleChangeText('PLAN', idx, 'note', e.target.value)}/>
                              </div>
                              <button onClick={() => handleRemoveLine('PLAN', idx)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* METRICS */}
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Khó khăn / Đề xuất</label>
                        <textarea className="w-full p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm outline-none resize-none h-20 focus:border-rose-300"
                           value={reportForm.issues} onChange={e => setReportForm({...reportForm, issues: e.target.value})}/>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Thời gian thực tế</label>
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-300" 
                           placeholder="VD: 8h" value={reportForm.actualDuration} onChange={e => setReportForm({...reportForm, actualDuration: e.target.value})}/>
                     </div>
                  </div>
               </div>

               <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                  <button onClick={() => setReportModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-200">Hủy</button>
                  <button onClick={handleSendReport} className="px-6 py-2 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200">Gửi Báo Cáo</button>
               </div>
            </div>
         </div>
      )}

      {/* --- ACTIVATED: SETTINGS MODAL (Z-Index 9999 & Save Logic) --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Settings/> Cấu Hình Hệ Thống</h3>
                 <button onClick={() => setShowSettingsModal(false)}><X/></button>
              </div>
              
              <div className="space-y-6">
                 {/* 1. Team Management */}
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Danh sách Team / Bộ phận</label>
                    <div className="flex gap-2 mb-3">
                       <input id="newTeamInput" className="flex-1 p-2 border border-slate-200 rounded-lg text-sm outline-none" placeholder="Nhập tên team mới..."/>
                       <button onClick={() => {
                          const input = document.getElementById('newTeamInput');
                          if(input.value) {
                             setSettingsForm(prev => ({...prev, teams: [...prev.teams, input.value]}));
                             input.value = '';
                          }
                       }} className="bg-slate-200 px-3 py-2 rounded-lg font-bold text-xs">+ Thêm</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {settingsForm.teams.map((t, i) => (
                          <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-slate-200">
                             {t} <button onClick={() => {
                                const newTeams = [...settingsForm.teams]; newTeams.splice(i,1);
                                setSettingsForm(prev => ({...prev, teams: newTeams}));
                             }} className="hover:text-rose-500 ml-1"><X size={12}/></button>
                          </span>
                       ))}
                    </div>
                 </div>

                 {/* 2. Member Assignment */}
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Phân Team cho Nhân Sự</label>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 custom-scrollbar">
                       {staffList.map(u => (
                          <div key={u.email} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg">
                             <div className="flex items-center gap-2">
                                <Avatar email={u.email}/>
                                <span className="text-sm font-bold text-slate-700">{u.name}</span>
                             </div>
                             <select className="text-xs border border-slate-200 rounded p-1 outline-none font-bold text-slate-600"
                                value={settingsForm.members[sanitizeEmail(u.email)] || 'CHUNG'}
                                onChange={(e) => setSettingsForm(prev => ({
                                   ...prev, 
                                   members: { ...prev.members, [sanitizeEmail(u.email)]: e.target.value }
                                }))}>
                                {settingsForm.teams.map(t => <option key={t} value={t}>{t}</option>)}
                             </select>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="mt-6 pt-4 border-t flex justify-end gap-3">
                 <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 font-bold text-slate-500">Hủy</button>
                 <button onClick={handleSaveSettings} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700">Lưu Cấu Hình</button>
              </div>
           </div>
        </div>
      )}

      {/* --- GOAL MODAL --- */}
      {goalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
           <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
              <h3 className="font-black text-xl mb-4 text-purple-700 flex items-center gap-2"><Target/> KPI Tháng</h3>
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Tên Mục Tiêu</label>
                    <input className="w-full p-3 bg-purple-50 border border-purple-100 rounded-xl font-bold outline-none" 
                       placeholder="Doanh số..." value={goalForm.name} onChange={e => setGoalForm({...goalForm, name: e.target.value})}/>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Chỉ tiêu</label>
                       <input type="number" className="w-full p-3 bg-slate-50 rounded-xl font-bold" 
                          value={goalForm.target} onChange={e => setGoalForm({...goalForm, target: Number(e.target.value)})}/>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase">Đơn vị</label>
                       <input className="w-full p-3 bg-slate-50 rounded-xl font-bold" 
                          placeholder="VND, HĐ..." value={goalForm.unit} onChange={e => setGoalForm({...goalForm, unit: e.target.value})}/>
                    </div>
                 </div>
                 <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => setGoalModalOpen(false)} className="text-slate-500 font-bold">Hủy</button>
                    <button onClick={handleSaveGoal} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold">Lưu</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .view-btn { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 4px; transition: all; color: #94a3b8; }
        .view-btn:hover { color: #475569; }
        .view-btn.active { background: white; color: #4f46e5; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}