
import React, { useState } from 'react';
import { TrendingUp, PieChart, Plus, ArrowRightLeft } from 'lucide-react';

const ExpenseView: React.FC = () => {
  const [currency, setCurrency] = useState('JPY');
  const totalHKD = 3280;
  const totalJPY = 61200;

  const expenses = [
    { date: '5/12', title: '札幌拉麵', category: '美食', amount: 1400, currency: 'JPY', payer: '狸克' },
    { date: '5/12', title: '機場巴士', category: '交通', amount: 1100, currency: 'JPY', payer: '西施惠' },
    { date: '5/13', title: '伴手禮', category: '購物', amount: 8500, currency: 'JPY', payer: '狸克' },
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard */}
      <div className="bg-journey-red rounded-5xl p-7 text-white shadow-soft relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/20 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">總預算支出</p>
              <h2 className="text-4xl font-black mt-1 tracking-tight">HK$ {totalHKD.toLocaleString()}</h2>
            </div>
            <div className="bg-white/30 p-3 rounded-2xl backdrop-blur-md">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/15 p-4 rounded-3xl backdrop-blur-sm">
                <p className="text-[9px] font-black text-white/60 uppercase">日圓累計</p>
                <p className="text-xl font-bold">¥ {totalJPY.toLocaleString()}</p>
             </div>
             <div className="bg-white/15 p-4 rounded-3xl backdrop-blur-sm">
                <p className="text-[9px] font-black text-white/60 uppercase">人均分攤</p>
                <p className="text-xl font-bold">HK$ 820</p>
             </div>
          </div>
        </div>
      </div>

      {/* Currency Select */}
      <div className="flex bg-white/50 backdrop-blur-md rounded-3xl p-1 shadow-soft-sm">
         <button 
           onClick={() => setCurrency('HKD')}
           className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all ${currency === 'HKD' ? 'bg-journey-blue text-white shadow-soft-sm' : 'text-journey-brown/40'}`}
         >
           HKD 港幣
         </button>
         <button 
           onClick={() => setCurrency('JPY')}
           className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all ${currency === 'JPY' ? 'bg-journey-blue text-white shadow-soft-sm' : 'text-journey-brown/40'}`}
         >
           JPY 日圓
         </button>
      </div>

      {/* Add Button */}
      <div className="bg-white rounded-3xl p-5 shadow-soft flex items-center justify-between active:scale-95 transition-all cursor-pointer">
         <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-journey-accent/40 flex items-center justify-center text-journey-brown">
               <Plus size={22} strokeWidth={3} />
            </div>
            <span className="font-black text-journey-brown tracking-tight">記下一筆消費...</span>
         </div>
         <div className="flex items-center gap-1.5 text-[10px] text-journey-brown/40 font-black">
            <ArrowRightLeft size={12} />
            <span>0.0518</span>
         </div>
      </div>

      {/* List */}
      <div className="space-y-4">
         <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-black text-journey-brown">消費紀錄</h3>
            <span className="text-[10px] text-journey-brown/40 font-bold flex items-center gap-1.5"><PieChart size={12} /> 圖表分析</span>
         </div>
         <div className="space-y-3">
            {expenses.map((ex, i) => (
              <div key={i} className="bg-white/70 backdrop-blur-sm rounded-4xl p-5 flex items-center justify-between shadow-soft">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-journey-sand flex flex-col items-center justify-center text-journey-brown/50">
                    <span className="text-xs font-black">{ex.date.split('/')[1]}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest">{ex.date.split('/')[0]}月</span>
                  </div>
                  <div>
                    <h5 className="font-black text-journey-brown text-sm tracking-tight">{ex.title}</h5>
                    <p className="text-[9px] text-journey-brown/40 font-bold tracking-widest">{ex.category} · {ex.payer} 支付</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-journey-brown">¥ {ex.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-journey-brown/30 font-bold">~ HK$ {Math.round(ex.amount * 0.0518).toLocaleString()}</p>
                </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default ExpenseView;
