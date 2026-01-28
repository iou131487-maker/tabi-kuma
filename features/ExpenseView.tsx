
import React, { useState, useEffect } from 'react';
import { TrendingUp, PieChart, Plus, ArrowRightLeft, X, Send, Loader2, Sparkles } from 'lucide-react';
import { db, isConfigured } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

const ExpenseView: React.FC = () => {
  const [currency, setCurrency] = useState('JPY');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // 新增消費的表單狀態
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  const tripId = 'hokkaido-2024';
  const JPY_TO_HKD = 0.0518; // 假設匯率

  // 計算總額
  const totalJPY = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalHKD = Math.round(totalJPY * JPY_TO_HKD);

  // --- onSnapshot 即時監聽 ---
  useEffect(() => {
    if (!isConfigured || !db) {
      setExpenses([
        { title: '示例：拉麵', amount: 1200, payer: '狸克', date: '5/12', category: '美食' }
      ]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'trips', tripId, 'expenses'),
      orderBy('createdAt', 'desc')
    );

    // 這裡就是 onSnapshot！它會一直開著直到組件消失
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExpenses(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 儲存到雲端 ---
  const handleAddExpense = async () => {
    if (!title || !amount || !db) return;

    try {
      await addDoc(collection(db, 'trips', tripId, 'expenses'), {
        title,
        amount: Number(amount),
        currency: 'JPY',
        payer: '你',
        createdAt: serverTimestamp(),
        date: '5/12' // 簡化處理
      });
      setTitle('');
      setAmount('');
      setShowAddForm(false);
    } catch (e) {
      console.error("新增失敗:", e);
    }
  };

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
                <p className="text-[9px] font-black text-white/60 uppercase">人均分攤 (4人)</p>
                <p className="text-xl font-bold">HK$ {Math.round(totalHKD / 4)}</p>
             </div>
          </div>
        </div>
      </div>

      {/* Sync Status Icon */}
      <div className="flex justify-between items-center px-1">
         <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-journey-brown">消費紀錄</h3>
            <div className="flex items-center gap-1 bg-journey-green/20 px-2 py-0.5 rounded-full">
               <div className="w-1.5 h-1.5 bg-journey-green rounded-full animate-pulse"></div>
               <span className="text-[8px] font-bold text-journey-darkGreen uppercase">Live Syncing</span>
            </div>
         </div>
         <span className="text-[10px] text-journey-brown/40 font-bold flex items-center gap-1.5"><PieChart size={12} /> 圖表</span>
      </div>

      {/* Quick Add Button */}
      <button 
        onClick={() => setShowAddForm(true)}
        className="w-full bg-white rounded-3xl p-5 shadow-soft flex items-center justify-between active:scale-95 transition-all"
      >
         <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-journey-accent/40 flex items-center justify-center text-journey-brown">
               <Plus size={22} strokeWidth={3} />
            </div>
            <span className="font-black text-journey-brown tracking-tight">新增一筆消費...</span>
         </div>
         <div className="flex items-center gap-1.5 text-[10px] text-journey-brown/40 font-black">
            <ArrowRightLeft size={12} />
            <span>{JPY_TO_HKD}</span>
         </div>
      </button>

      {/* List Area */}
      {loading ? (
        <div className="flex flex-col items-center py-10 opacity-30">
          <Loader2 className="animate-spin mb-2" />
          <p className="text-[10px] font-black">連線到島嶼銀行...</p>
        </div>
      ) : (
        <div className="space-y-3">
            {expenses.map((ex) => (
              <div key={ex.id} className="bg-white/70 backdrop-blur-sm rounded-4xl p-5 flex items-center justify-between shadow-soft animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-journey-sand flex items-center justify-center text-journey-brown/50">
                    <span className="text-xs font-black">{(ex.category || '食')[0]}</span>
                  </div>
                  <div>
                    <h5 className="font-black text-journey-brown text-sm tracking-tight">{ex.title}</h5>
                    <p className="text-[9px] text-journey-brown/40 font-bold tracking-widest">{ex.payer} 支付</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-journey-brown">¥ {ex.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-journey-brown/30 font-bold">~ HK$ {Math.round(ex.amount * JPY_TO_HKD)}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-journey-brown">記帳</h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 bg-journey-cream rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/40 uppercase">品項</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：藍瓶咖啡"
                  className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/40 uppercase">金額 (JPY)</label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black text-2xl focus:outline-none"
                />
              </div>
            </div>

            <button 
              onClick={handleAddExpense}
              disabled={!title || !amount}
              className="w-full bg-journey-red text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30"
            >
              <Send size={18} /> 紀錄支出
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;
