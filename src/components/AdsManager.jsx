import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  Save,
  ExternalLink,
  Link,
  ChevronDown,
  Check,
  Layers,
  FolderPlus,
  Wifi,
  WifiOff,
} from 'lucide-react';

// --- IMPORT FIREBASE ---
import { db } from '../firebase'; // Nhớ tạo file firebase.js trước nhé
import { ref, onValue, set } from 'firebase/database';
// -----------------------

const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(val);
const parseNumber = (val) =>
  parseInt(val.toString().replace(/\D/g, ''), 10) || 0;

export default function AdsManager() {
  const [courses, setCourses] = useState(['K36']);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- KẾT NỐI DATABASE (THẦN KỲ LÀ Ở ĐÂY) ---
  useEffect(() => {
    // 1. Lắng nghe dữ liệu Ads
    const adsRef = ref(db, 'ads_data/list');
    onValue(adsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(val);
      } else {
        setData([]); // Nếu chưa có dữ liệu trên mạng
      }
      setLoading(false);
    });

    // 2. Lắng nghe danh sách Khóa học
    const coursesRef = ref(db, 'ads_data/courses');
    onValue(coursesRef, (snapshot) => {
      const val = snapshot.val();
      if (val) setCourses(val);
    });
  }, []);

  // --- HÀM LƯU LÊN MÂY ---
  const saveToCloud = (newData, newCourses) => {
    // Lưu danh sách Ads
    if (newData) {
      set(ref(db, 'ads_data/list'), newData);
    }
    // Lưu danh sách Khóa
    if (newCourses) {
      set(ref(db, 'ads_data/courses'), newCourses);
    }
  };

  // --- STATE GIAO DIỆN ---
  const [currentView, setCurrentView] = useState('ALL');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');

  // --- TÍNH TOÁN ---
  const filteredData = useMemo(() => {
    if (currentView === 'ALL') return data;
    return data.filter((item) => item.course === currentView);
  }, [data, currentView]);

  const calculateRow = (row) => {
    const totalOrders = row.ordersMong + row.ordersThanh;
    const pricePerMess = row.mess > 0 ? row.spent / row.mess : 0;
    const closeRate = row.mess > 0 ? (totalOrders / row.mess) * 100 : 0;
    const revenue = totalOrders * row.pricePerCourse;
    const profit = revenue - row.spent - row.baseCost;
    const roas = row.spent > 0 ? revenue / row.spent : 0;
    return {
      ...row,
      totalOrders,
      pricePerMess,
      closeRate,
      revenue,
      profit,
      roas,
    };
  };

  const summary = useMemo(
    () =>
      filteredData.reduce(
        (acc, curr) => {
          const row = calculateRow(curr);
          acc.spent += row.spent;
          acc.mess += row.mess;
          acc.ordersMong += row.ordersMong;
          acc.ordersThanh += row.ordersThanh;
          acc.revenue += row.revenue;
          acc.profit += row.profit;
          return acc;
        },
        {
          spent: 0,
          mess: 0,
          ordersMong: 0,
          ordersThanh: 0,
          revenue: 0,
          profit: 0,
        }
      ),
    [filteredData]
  );

  const summaryRoas = summary.spent > 0 ? summary.revenue / summary.spent : 0;
  const summaryTotalOrders = summary.ordersMong + summary.ordersThanh;
  const summaryCloseRate =
    summary.mess > 0 ? (summaryTotalOrders / summary.mess) * 100 : 0;
  const summaryPricePerMess =
    summary.mess > 0 ? summary.spent / summary.mess : 0;

  // --- ACTIONS (SỬA LÀ LƯU NGAY) ---
  const update = (id, field, value) => {
    const newData = data.map((row) =>
      row.id === id ? { ...row, [field]: value } : row
    );
    setData(newData); // Cập nhật giao diện ngay cho mượt
    saveToCloud(newData, null); // Bắn lên mây
  };

  const remove = (id) => {
    if (window.confirm('Xóa dòng này?')) {
      const newData = data.filter((r) => r.id !== id);
      setData(newData);
      saveToCloud(newData, null);
    }
  };

  const addNew = () => {
    const defaultCourse =
      currentView === 'ALL' ? courses[courses.length - 1] : currentView;
    const today = new Date().toISOString().split('T')[0];
    const newRow = {
      id: Date.now(),
      date: today,
      course: defaultCourse,
      contentName: '',
      contentMain: '',
      format: 'Video',
      budget: 0,
      spent: 0,
      mess: 0,
      ordersMong: 0,
      ordersThanh: 0,
      pricePerCourse: 3500000,
      baseCost: 0,
      evaluation: 'normal',
      action: 'monitor',
      status: 'new',
      link: '',
    };
    const newData = [...data, newRow];
    setData(newData);
    saveToCloud(newData, null);
  };

  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;
    if (courses.includes(newCourseName.trim())) return alert('Khóa này đã có!');
    const newCourses = [...courses, newCourseName.trim()];
    setCourses(newCourses);
    setCurrentView(newCourseName.trim());
    setNewCourseName('');
    saveToCloud(null, newCourses);
  };

  if (loading)
    return (
      <div className="p-10 text-center text-blue-600">
        ⏳ Đang tải dữ liệu từ Google...
      </div>
    );

  return (
    <div
      className="p-4 bg-gray-100 min-h-screen font-sans text-xs"
      onClick={() => setIsMenuOpen(false)}
    >
      <div className="flex justify-between items-center mb-4 bg-white p-3 rounded shadow border border-gray-200">
        <div className="flex items-center gap-4">
          {/* MENU CHỌN KHÓA */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 bg-blue-50 text-blue-900 px-4 py-2 rounded-lg font-bold border border-blue-200 hover:bg-blue-100 transition-all shadow-sm min-w-[180px] justify-between"
            >
              <span className="flex items-center gap-2">
                {currentView === 'ALL' ? (
                  <Layers size={18} />
                ) : (
                  <Calculator size={18} />
                )}
                {currentView === 'ALL'
                  ? 'TỔNG HỢP (ALL)'
                  : `KHÓA: ${currentView}`}
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${
                  isMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div
                  onClick={() => {
                    setCurrentView('ALL');
                    setIsMenuOpen(false);
                  }}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 ${
                    currentView === 'ALL'
                      ? 'text-blue-600 font-bold bg-blue-50'
                      : 'text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Layers size={16} /> Xem Tổng Hợp
                  </span>
                  {currentView === 'ALL' && <Check size={16} />}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <div className="px-4 py-2 text-[10px] uppercase font-bold text-gray-400">
                    Danh sách khóa học
                  </div>
                  {courses.map((course) => (
                    <div
                      key={course}
                      onClick={() => {
                        setCurrentView(course);
                        setIsMenuOpen(false);
                      }}
                      className={`px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 ${
                        currentView === course
                          ? 'text-blue-600 font-bold bg-blue-50'
                          : 'text-gray-700'
                      }`}
                    >
                      <span>🔥 {course}</span>
                      {currentView === course && <Check size={14} />}
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-200">
                  <div className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                    <FolderPlus size={12} /> Tạo khóa mới
                  </div>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="VD: K38..."
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 outline-none text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCourse()}
                    />
                    <button
                      onClick={handleAddCourse}
                      className="bg-blue-600 text-white px-3 py-1 rounded font-bold hover:bg-blue-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-gray-500 italic hidden md:block">
            Đang hiển thị:{' '}
            <b className="text-gray-800">{filteredData.length}</b> chiến dịch
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {/* TRẠNG THÁI ONLINE */}
          <div className="flex items-center text-green-600 text-[10px] font-bold bg-green-50 px-3 py-1 rounded border border-green-200 animate-pulse">
            <Wifi size={12} className="mr-1" /> Online Sync
          </div>
          <button
            onClick={addNew}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold flex items-center gap-1 shadow"
          >
            <Plus size={16} /> Thêm Ads
          </button>
        </div>
      </div>

      <div className="overflow-x-auto shadow-lg border border-gray-300 rounded bg-white pb-32">
        <table className="w-full border-collapse min-w-[1900px]">
          <thead>
            <tr className="bg-gray-100 text-gray-600 font-bold uppercase text-center tracking-wider text-[11px]">
              <th className="border p-2 bg-gray-200" colSpan={4}>
                THÔNG TIN CƠ BẢN
              </th>
              <th
                className="border p-2 bg-yellow-100 text-yellow-800"
                colSpan={4}
              >
                HIỆU QUẢ QUẢNG CÁO
              </th>
              <th
                className="border p-2 bg-green-100 text-green-800"
                colSpan={8}
              >
                KẾT QUẢ KINH DOANH
              </th>
              <th className="border p-2 bg-blue-100 text-blue-800" colSpan={5}>
                HÀNH ĐỘNG & STATUS
              </th>
            </tr>
            <tr className="bg-gray-50 text-gray-700 font-bold text-center whitespace-nowrap text-[11px]">
              <th className="border p-2 w-24">Ngày</th>
              <th className="border p-2 w-16">Khóa</th>
              <th className="border p-2 w-32">ID / Tên Bài</th>
              <th className="border p-2 w-20">Định dạng</th>
              <th className="border p-2 bg-yellow-50 w-24">Ngân sách</th>
              <th className="border p-2 bg-yellow-50 w-24">Tiền Tiêu</th>
              <th className="border p-2 bg-yellow-50 w-16">Mess</th>
              <th className="border p-2 bg-yellow-50">Giá Mess</th>
              <th className="border p-2 text-red-600 bg-green-50 w-16">
                Đơn Mong 🔥
              </th>
              <th className="border p-2 text-blue-600 bg-green-50 w-16">
                Đơn Thành 💧
              </th>
              <th className="border p-2 bg-green-50">TỔNG ĐƠN</th>
              <th className="border p-2 bg-green-50">Chốt %</th>
              <th className="border p-2 bg-green-50">Doanh Thu</th>
              <th className="border p-2 bg-green-50 text-gray-500 w-24">
                Tiền Gốc
              </th>
              <th className="border p-2 bg-green-50">Lợi Nhuận</th>
              <th className="border p-2 bg-green-50 text-purple-700 text-sm">
                ROAS
              </th>
              <th className="border p-2 w-32">Đánh giá</th>
              <th className="border p-2 w-32">Hành động</th>
              <th className="border p-2 w-32">Trạng thái</th>
              <th className="border p-2 w-24">Link Ads</th>
              <th className="border p-2 w-10">Xóa</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-200 font-bold border-b-2 border-gray-400 sticky top-0 z-10 shadow-md">
              <td className="border p-2 text-center text-red-600" colSpan={4}>
                📊 TỔNG KẾT ({currentView})
              </td>
              <td className="border p-2 text-right text-gray-500">-</td>
              <td className="border p-2 text-right text-red-700 text-sm">
                {formatNumber(summary.spent)}
              </td>
              <td className="border p-2 text-center text-sm">{summary.mess}</td>
              <td className="border p-2 text-right text-gray-600 italic">
                {formatNumber(summaryPricePerMess)}
              </td>
              <td className="border p-2 text-center text-red-600">
                {summary.ordersMong}
              </td>
              <td className="border p-2 text-center text-blue-600">
                {summary.ordersThanh}
              </td>
              <td className="border p-2 text-center text-lg text-gray-800">
                {summaryTotalOrders}
              </td>
              <td className="border p-2 text-center italic">
                {summaryCloseRate.toFixed(1)}%
              </td>
              <td className="border p-2 text-right text-green-700 text-sm">
                {formatNumber(summary.revenue)}
              </td>
              <td className="border p-2 bg-gray-100"></td>
              <td className="border p-2 text-right text-blue-700 text-sm">
                {formatNumber(summary.profit)}
              </td>
              <td
                className={`border p-2 text-center text-lg ${
                  summaryRoas > 4 ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {summaryRoas.toFixed(2)}
              </td>
              <td className="border p-2" colSpan={5}></td>
            </tr>
            {filteredData.map((row, index) => {
              const c = calculateRow(row);
              let roasColor =
                c.roas > 4
                  ? 'text-green-600 font-bold'
                  : c.roas < 1.5 && c.spent > 0
                  ? 'text-red-600 font-bold'
                  : 'text-gray-800';
              return (
                <tr
                  key={row.id}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-50 transition-colors group`}
                >
                  <td className="border p-1">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => update(row.id, 'date', e.target.value)}
                      className="w-full bg-transparent outline-none text-[10px] text-gray-600"
                    />
                  </td>
                  <td className="border p-1 text-center">
                    <select
                      value={row.course}
                      onChange={(e) => update(row.id, 'course', e.target.value)}
                      className="bg-transparent font-bold text-blue-800 outline-none cursor-pointer text-[10px]"
                    >
                      {courses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border p-1">
                    <input
                      value={row.contentName}
                      onChange={(e) =>
                        update(row.id, 'contentName', e.target.value)
                      }
                      className="w-full bg-transparent outline-none px-1 text-blue-800 font-medium"
                      placeholder="ID..."
                    />
                  </td>
                  <td className="border p-1">
                    <select
                      value={row.format}
                      onChange={(e) => update(row.id, 'format', e.target.value)}
                      className="w-full bg-transparent outline-none text-center"
                    >
                      <option>Video</option>
                      <option>Image</option>
                      <option>Reels</option>
                    </select>
                  </td>
                  <td className="border p-1 bg-yellow-50">
                    <input
                      value={row.budget === 0 ? '' : formatNumber(row.budget)}
                      onChange={(e) =>
                        update(row.id, 'budget', parseNumber(e.target.value))
                      }
                      className="w-full bg-transparent outline-none text-right px-1 text-gray-400 focus:text-black"
                      placeholder="0"
                    />
                  </td>
                  <td className="border p-1 bg-yellow-50">
                    <input
                      value={row.spent === 0 ? '' : formatNumber(row.spent)}
                      onChange={(e) =>
                        update(row.id, 'spent', parseNumber(e.target.value))
                      }
                      className="w-full bg-transparent outline-none text-right px-1 font-medium text-black"
                    />
                  </td>
                  <td className="border p-1 bg-yellow-50">
                    <input
                      value={row.mess === 0 ? '' : row.mess}
                      type="number"
                      onChange={(e) =>
                        update(row.id, 'mess', parseNumber(e.target.value))
                      }
                      className="w-full bg-transparent outline-none text-center px-1"
                    />
                  </td>
                  <td className="border p-1 bg-yellow-50 text-right text-gray-500 text-[10px] px-2 font-medium">
                    {formatNumber(c.pricePerMess)}
                  </td>
                  <td className="border p-1 bg-green-50">
                    <input
                      value={row.ordersMong === 0 ? '' : row.ordersMong}
                      type="number"
                      onChange={(e) =>
                        update(
                          row.id,
                          'ordersMong',
                          parseNumber(e.target.value)
                        )
                      }
                      className="w-full bg-transparent outline-none text-center px-1 text-red-600 font-bold"
                    />
                  </td>
                  <td className="border p-1 bg-green-50">
                    <input
                      value={row.ordersThanh === 0 ? '' : row.ordersThanh}
                      type="number"
                      onChange={(e) =>
                        update(
                          row.id,
                          'ordersThanh',
                          parseNumber(e.target.value)
                        )
                      }
                      className="w-full bg-transparent outline-none text-center px-1 text-blue-600 font-bold"
                    />
                  </td>
                  <td className="border p-1 bg-green-50 text-center font-bold text-lg">
                    {c.totalOrders}
                  </td>
                  <td className="border p-1 bg-green-50 text-center text-[10px] text-gray-500">
                    {c.closeRate.toFixed(1)}%
                  </td>
                  <td className="border p-1 bg-green-50 text-right font-medium text-green-800">
                    {formatNumber(c.revenue)}
                  </td>
                  <td className="border p-1 bg-green-50">
                    <input
                      value={
                        row.baseCost === 0 ? '' : formatNumber(row.baseCost)
                      }
                      onChange={(e) =>
                        update(row.id, 'baseCost', parseNumber(e.target.value))
                      }
                      className="w-full bg-transparent outline-none text-right px-1 text-gray-400 text-[10px] focus:text-red-500"
                      placeholder="0"
                    />
                  </td>
                  <td className="border p-1 bg-green-50 text-right font-bold text-blue-700">
                    {formatNumber(c.profit)}
                  </td>
                  <td
                    className={`border p-1 bg-green-50 text-center text-sm ${roasColor}`}
                  >
                    {c.roas.toFixed(2)}
                  </td>
                  <td className="border p-1">
                    <select
                      value={row.evaluation}
                      onChange={(e) =>
                        update(row.id, 'evaluation', e.target.value)
                      }
                      className="w-full bg-transparent outline-none text-center text-[10px] cursor-pointer"
                    >
                      <option value="good">🌟 Hiệu quả</option>
                      <option value="normal">✅ Ổn định</option>
                      <option value="warn">⚠️ Cảnh báo</option>
                      <option value="bad">💸 Đắt/Lỗ</option>
                    </select>
                  </td>
                  <td className="border p-1">
                    <select
                      value={row.action}
                      onChange={(e) => update(row.id, 'action', e.target.value)}
                      className={`w-full outline-none text-center text-[10px] cursor-pointer rounded ${
                        row.action === 'scale'
                          ? 'text-purple-600 font-bold bg-purple-50'
                          : row.action === 'stop'
                          ? 'text-red-600 font-bold bg-red-50'
                          : 'text-blue-600'
                      }`}
                    >
                      <option value="scale">🚀 Tăng</option>
                      <option value="monitor">👀</option>
                      <option value="optimize">🔧</option>
                      <option value="stop">🛑</option>
                    </select>
                  </td>
                  <td className="border p-1">
                    <select
                      value={row.status}
                      onChange={(e) => update(row.id, 'status', e.target.value)}
                      className={`w-full outline-none text-center uppercase text-[10px] cursor-pointer rounded ${
                        row.status === 'active'
                          ? 'text-green-600 font-bold bg-green-50'
                          : 'text-gray-400'
                      }`}
                    >
                      <option value="active">Chạy</option>
                      <option value="paused">Dừng</option>
                      <option value="new">Mới</option>
                    </select>
                  </td>
                  <td className="border p-1 text-center relative group/link">
                    {row.link ? (
                      <div className="flex items-center justify-center gap-1">
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold border border-blue-200 hover:bg-blue-200"
                        >
                          <ExternalLink size={10} /> Ads
                        </a>
                        <button
                          onClick={() => update(row.id, 'link', '')}
                          className="text-gray-400 hover:text-red-500 hidden group-hover/link:block"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center px-1">
                        <Link size={12} className="text-gray-300 mr-1" />
                        <input
                          type="text"
                          value={row.link}
                          onChange={(e) =>
                            update(row.id, 'link', e.target.value)
                          }
                          placeholder="Link..."
                          className="w-full bg-transparent outline-none text-[10px] text-gray-400 focus:text-blue-600"
                        />
                      </div>
                    )}
                  </td>
                  <td className="border p-1 text-center">
                    <button
                      onClick={() => remove(row.id)}
                      className="text-gray-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="p-3 border-t bg-gray-50 flex justify-center">
          <button
            onClick={addNew}
            className="text-blue-600 text-sm font-bold flex items-center gap-2 px-4 py-2 border border-blue-200 rounded-full hover:bg-blue-50 transition-all shadow-sm"
          >
            <Plus size={16} /> Thêm Campaign Mới
          </button>
        </div>
      </div>
    </div>
  );
}
