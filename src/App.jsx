import React, { useState } from 'react';
import { LayoutDashboard, Megaphone, Users, Receipt } from 'lucide-react';

// Vì cùng là .jsx nên import rất dễ, không lo lỗi
import AdsManager from './components/AdsManager';
import SalaryManager from './components/SalaryManager';
import SpendingManager from './components/SpendingManager';

export default function App() {
  const [tab, setTab] = useState('ads');

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans">
      <aside className="w-56 bg-slate-900 text-white flex flex-col z-20 shadow-xl">
        <div className="p-5 font-bold text-lg text-blue-400 border-b border-slate-700">
          SYSTEM V1
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <button
            onClick={() => setTab('ads')}
            className={`w-full flex gap-3 px-3 py-3 rounded text-sm font-bold ${
              tab === 'ads' ? 'bg-blue-600' : 'hover:bg-slate-800 text-gray-400'
            }`}
          >
            <Megaphone size={18} /> QUẢN LÝ ADS
          </button>
          <button
            onClick={() => setTab('salary')}
            className={`w-full flex gap-3 px-3 py-3 rounded text-sm font-bold ${
              tab === 'salary'
                ? 'bg-blue-600'
                : 'hover:bg-slate-800 text-gray-400'
            }`}
          >
            <Users size={18} /> LƯƠNG SALE
          </button>
          <button
            onClick={() => setTab('spending')}
            className={`w-full flex gap-3 px-3 py-3 rounded text-sm font-bold ${
              tab === 'spending'
                ? 'bg-blue-600'
                : 'hover:bg-slate-800 text-gray-400'
            }`}
          >
            <Receipt size={18} /> SỔ CHI TIÊU
          </button>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-white">
        {tab === 'ads' && <AdsManager />}
        {tab === 'salary' && <SalaryManager />}
        {tab === 'spending' && <SpendingManager />}
      </main>
    </div>
  );
}
