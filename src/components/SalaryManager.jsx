import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Check, Wifi } from 'lucide-react';

// --- IMPORT FIREBASE ---
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
// -----------------------

const formatNumber = (val) => new Intl.NumberFormat('vi-VN').format(val);
const parseNumber = (val) =>
  parseInt(val.toString().replace(/\D/g, ''), 10) || 0;

export default function SalaryManager() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- KẾT NỐI DATABASE ---
  useEffect(() => {
    const salaryRef = ref(db, 'salary_data');
    onValue(salaryRef, (snapshot) => {
      const val = snapshot.val();
      setData(val || []);
      setLoading(false);
    });
  }, []);

  // --- HÀM LƯU ---
  const saveToCloud = (newData) => {
    set(ref(db, 'salary_data'), newData);
  };

  const update = (id, field, val) => {
    const newData = data.map((r) => (r.id === id ? { ...r, [field]: val } : r));
    // setData(newData); // Firebase tự update lại state nên không cần set thủ công ở đây cũng được, nhưng set để giao diện mượt hơn
    saveToCloud(newData);
  };

  const remove = (id) => {
    if (window.confirm('Xóa nhân sự này?')) {
      const newData = data.filter((x) => x.id !== id);
      saveToCloud(newData);
    }
  };

  const addNew = () => {
    const newData = [
      ...data,
      {
        id: Date.now(),
        name: '',
        revenue: 0,
        percent: 3,
        salary: 5000000,
        bonus: 0,
      },
    ];
    saveToCloud(newData);
  };

  const calc = (row) => {
    const comm = row.revenue * (row.percent / 100);
    return { ...row, comm, total: comm + row.salary + row.bonus };
  };

  const totalPaid = data.reduce((acc, r) => acc + calc(r).total, 0);

  if (loading)
    return (
      <div className="p-10 text-center text-indigo-600">
        ⏳ Đang tải bảng lương...
      </div>
    );

  return (
    <div className="p-4 bg-indigo-50 min-h-screen font-sans text-sm">
      <div className="flex justify-between mb-4 bg-white p-3 rounded shadow border-indigo-200">
        <h2 className="font-bold text-indigo-800 flex gap-2 items-center">
          <Users /> LƯƠNG SALE
        </h2>

        <div className="flex gap-2 items-center">
          {/* TRẠNG THÁI ONLINE */}
          <div className="flex items-center text-green-600 text-[10px] font-bold bg-green-50 px-2 py-1 rounded border border-green-200 animate-pulse">
            <Wifi size={12} className="mr-1" /> Online
          </div>
          <div className="bg-green-600 text-white px-3 py-1 rounded shadow text-xs font-bold">
            TỔNG CHI: {formatNumber(totalPaid)}
          </div>
          <button
            onClick={addNew}
            className="bg-indigo-600 text-white px-3 py-1 rounded shadow hover:bg-indigo-700 font-bold flex items-center gap-1"
          >
            <Plus size={16} /> Thêm NV
          </button>
        </div>
      </div>

      <table className="w-full bg-white rounded shadow text-sm">
        <thead className="bg-indigo-100 text-indigo-900 font-bold">
          <tr>
            <th className="p-2 border">Tên</th>
            <th className="p-2 border">Doanh số</th>
            <th className="p-2 border">%HH</th>
            <th className="p-2 border">Tiền HH</th>
            <th className="p-2 border">Lương cứng</th>
            <th className="p-2 border">Thưởng</th>
            <th className="p-2 border bg-green-100">Tổng Nhận</th>
            <th className="p-2 border">Xóa</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => {
            const c = calc(r);
            return (
              <tr key={r.id} className="text-center hover:bg-indigo-50 group">
                <td className="border p-1">
                  <input
                    value={r.name}
                    onChange={(e) => update(r.id, 'name', e.target.value)}
                    className="w-full bg-transparent outline-none font-bold text-indigo-900 px-1"
                    placeholder="Tên..."
                  />
                </td>
                <td className="border p-1">
                  <input
                    value={formatNumber(r.revenue)}
                    onChange={(e) =>
                      update(r.id, 'revenue', parseNumber(e.target.value))
                    }
                    className="w-full bg-transparent outline-none text-right text-blue-700 px-1"
                  />
                </td>
                <td className="border p-1">
                  <input
                    value={r.percent}
                    onChange={(e) => update(r.id, 'percent', e.target.value)}
                    className="w-10 bg-transparent outline-none text-center"
                  />
                  %
                </td>
                <td className="border p-1 font-bold text-orange-600">
                  {formatNumber(c.comm)}
                </td>
                <td className="border p-1">
                  <input
                    value={formatNumber(r.salary)}
                    onChange={(e) =>
                      update(r.id, 'salary', parseNumber(e.target.value))
                    }
                    className="w-full bg-transparent outline-none text-right px-1"
                  />
                </td>
                <td className="border p-1">
                  <input
                    value={formatNumber(r.bonus)}
                    onChange={(e) =>
                      update(r.id, 'bonus', parseNumber(e.target.value))
                    }
                    className="w-full bg-transparent outline-none text-right text-green-600 px-1"
                  />
                </td>
                <td className="border p-1 font-extrabold text-green-800 bg-green-50">
                  {formatNumber(c.total)}
                </td>
                <td className="border p-1">
                  <button
                    onClick={() => remove(r.id)}
                    className="text-gray-300 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
          {data.length === 0 && (
            <tr>
              <td colSpan={8} className="p-4 text-center text-gray-400 italic">
                Chưa có nhân sự nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
