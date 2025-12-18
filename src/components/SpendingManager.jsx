import React, { useState, useEffect } from 'react';
import { Receipt, Trash2, Check, Wifi } from 'lucide-react';

// --- IMPORT FIREBASE ---
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
// -----------------------

const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(val);

export default function SpendingManager() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- KẾT NỐI DATABASE ---
  useEffect(() => {
    const spendingRef = ref(db, 'spending_data');
    onValue(spendingRef, (snapshot) => {
      const val = snapshot.val();
      setData(val || []);
      setLoading(false);
    });
  }, []);

  // --- HÀM LƯU ---
  const saveToCloud = (newData) => {
    set(ref(db, 'spending_data'), newData);
  };

  const [newRow, setNewRow] = useState({
    date: new Date().toISOString().split('T')[0],
    cate: 'Khác',
    text: '',
    amount: '',
  });

  const add = () => {
    if (!newRow.text) return;
    const newData = [
      { id: Date.now(), ...newRow, amount: Number(newRow.amount) },
      ...data,
    ];
    saveToCloud(newData);
    setNewRow({ ...newRow, text: '', amount: '' }); // Reset form
  };

  const remove = (id) => {
    if (window.confirm('Xóa dòng chi tiêu này?')) {
      const newData = data.filter((x) => x.id !== id);
      saveToCloud(newData);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-orange-600">
        ⏳ Đang tải sổ chi tiêu...
      </div>
    );

  return (
    <div className="p-4 bg-orange-50 min-h-screen font-sans text-sm">
      <div className="flex justify-between mb-4 bg-white p-3 rounded shadow border-l-4 border-orange-500">
        <h2 className="font-bold flex gap-2 items-center">
          <Receipt /> SỔ CHI TIÊU
        </h2>
        <div className="flex gap-2 items-center">
          <div className="flex items-center text-green-600 text-[10px] font-bold bg-green-50 px-2 py-1 rounded border border-green-200 animate-pulse">
            <Wifi size={12} className="mr-1" /> Online
          </div>
          <div className="text-red-600 font-bold text-xl px-2">
            Total: -{formatNumber(data.reduce((a, c) => a + c.amount, 0))} ₫
          </div>
        </div>
      </div>

      {/* Form nhập liệu */}
      <div className="bg-white p-3 rounded shadow mb-4 grid grid-cols-5 gap-2 border border-orange-200">
        <input
          type="date"
          value={newRow.date}
          onChange={(e) => setNewRow({ ...newRow, date: e.target.value })}
          className="border p-2 rounded text-xs"
        />
        <select
          value={newRow.cate}
          onChange={(e) => setNewRow({ ...newRow, cate: e.target.value })}
          className="border p-2 rounded text-xs font-bold text-gray-700"
        >
          <option>Ads</option>
          <option>Tool</option>
          <option>Lương</option>
          <option>Khác</option>
        </select>
        <input
          placeholder="Nội dung..."
          value={newRow.text}
          onChange={(e) => setNewRow({ ...newRow, text: e.target.value })}
          className="border p-2 rounded col-span-2 text-xs"
        />
        <div className="flex gap-1">
          <input
            type="number"
            placeholder="Số tiền..."
            value={newRow.amount}
            onChange={(e) => setNewRow({ ...newRow, amount: e.target.value })}
            className="border p-2 rounded w-full font-bold text-red-600 text-xs"
          />
          <button
            onClick={add}
            className="bg-orange-600 text-white px-4 rounded font-bold hover:bg-orange-700 shadow text-xs"
          >
            LƯU
          </button>
        </div>
      </div>

      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Ngày</th>
            <th className="p-3">Loại</th>
            <th className="p-3">Nội dung</th>
            <th className="p-3 text-right">Số tiền</th>
            <th className="p-3 text-center">Xóa</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id} className="border-b hover:bg-orange-50 group">
              <td className="p-3">{r.date}</td>
              <td className="p-3">
                <span className="bg-gray-200 px-2 py-1 rounded text-xs font-bold">
                  {r.cate}
                </span>
              </td>
              <td className="p-3 font-medium">{r.text}</td>
              <td className="p-3 text-right text-red-600 font-bold">
                -{formatNumber(r.amount)}
              </td>
              <td className="p-3 text-center">
                <button
                  onClick={() => remove(r.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-gray-400 italic">
                Chưa có chi tiêu nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
