
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, Utensils, Plane, Hotel, MapPin, Tag, Trash2, Edit2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const ExpenseView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'JPY' | 'HKD'>('JPY');
  const [payer, setPayer] = useState('');

  const tripId = tripConfig.id;
  const JPY_TO_HKD = 0.0518;

  const fetchData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    
    // 1. 本地優先
    const exKey = `expenses_${tripId}`;
    const memKey = `members_${tripId}`;
    const savedEx = localStorage.getItem(exKey);
    const savedMem = localStorage.getItem(memKey);
    if (savedEx) setExpenses(JSON.parse(savedEx));
    if (savedMem) setMembers(JSON.parse(savedMem));

    // 2. 雲端同步
    if (supabase && isSupabaseConfigured) {
      try {
        const { data: memData } = await supabase.from('members').select('*').eq('trip_id', tripId);
        if (memData && memData.length > 0) {
          setMembers(memData);
          localStorage.setItem(memKey, JSON.stringify(memData));
        }

        const { data: exData } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
        if (exData) {
          setExpenses(exData);
          localStorage.setItem(exKey, JSON.stringify(exData));
        }
      } catch (e) { console.error("Sync Error"); }
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!title || !amount) return;
    const payload = { 
      id: Date.now().toString(),
      title, amount: Number(amount), currency, payer: payer || '我', 
      trip_id: tripId,
      created_at: new Date().toISOString()
    };
    
    // [鎖定寫入]
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from('expenses').insert([payload]);
      if (error) return alert("儲存失敗");
    }

    const updated = [payload, ...expenses];
    setExpenses(updated);
    localStorage.setItem(`expenses_${tripId}`, JSON.stringify(updated));
    setShowForm(false);
    setTitle(''); setAmount('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除嗎？')) return;
    if (supabase && isSupabaseConfigured) {
      await supabase.from('expenses').delete().eq('id', id);
    }
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    localStorage.setItem(`expenses_${tripId}`, JSON.stringify(updated));
  };

  const totalHKD = Math.round(expenses.reduce((sum, item) => sum + (item.currency === 'HKD' ? item.amount : item.amount * JPY_TO_HKD), 0));

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-journey-green rounded-[3rem] p-8 text-journey-brown shadow-soft border-4 border-white animate-in zoom-in-95">
        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Total Spent (HKD)</p>
        <h2 className="text-4xl font-black italic">$ {totalHKD.toLocaleString()}</h2>
      </div>

      <button onClick={() => setShowForm(true)} className="w-full bg-white rounded-4xl p-6 shadow-soft flex items-center justify-between border-4 border-white active:scale-95 transition-all">
         <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-xl bg-journey-green text-white flex items-center justify-center"><Plus /></div>
           <span className="font-black text-journey-brown">新增支出紀錄</span>
         </div>
      </button>

      <div className="space-y-4">
        {expenses.map((ex) => (
          <div key={ex.id} className="bg-white rounded-[2rem] p-5 flex items-center justify-between shadow-soft border-2 border-journey-sand/5">
            <div className="overflow-hidden">
              <h5 className="font-black text-journey-brown text-base truncate">{ex.title}</h5>
              <p className="text-[9px] font-black text-journey-green uppercase">{ex.payer}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-black text-journey-brown text-lg">{ex.currency === 'JPY' ? '¥' : '$'} {ex.amount.toLocaleString()}</p>
              <button onClick={() => handleDelete(ex.id)} className="text-journey-brown/10 hover:text-journey-red"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8">
            <h3 className="text-2xl font-black text-journey-brown italic">New Expense</h3>
            <div className="space-y-6">
              <input placeholder="消費項目" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none shadow-inner" />
              <div className="flex gap-3">
                <input type="number" placeholder="金額" value={amount} onChange={e => setAmount(e.target.value)} className="flex-grow bg-journey-cream p-5 rounded-[2rem] text-2xl font-black focus:outline-none shadow-inner" />
                <button onClick={() => setCurrency(currency === 'JPY' ? 'HKD' : 'JPY')} className="bg-journey-accent px-6 rounded-[2rem] font-black">{currency}</button>
              </div>
              <select value={payer} onChange={e => setPayer(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[1.5rem] font-black shadow-inner">
                {members.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg active:scale-95">確認送出</button>
            <button onClick={() => setShowForm(false)} className="w-full text-journey-brown/30 font-black">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;
