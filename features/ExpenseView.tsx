
import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Utensils, Plane, Hotel, MapPin, Tag, Users } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const ExpenseView: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'JPY' | 'HKD'>('JPY');
  const [payer, setPayer] = useState('');
  const [category, setCategory] = useState('食');
  const [splitCount, setSplitCount] = useState('1');

  const tripId = 'hokkaido-2024';
  const JPY_TO_HKD = 0.0518;

  const CATEGORIES = [
    { name: '食', icon: <Utensils size={14} />, color: 'bg-journey-accent' },
    { name: '行', icon: <Plane size={14} />, color: 'bg-journey-blue' },
    { name: '住', icon: <Hotel size={14} />, color: 'bg-journey-red' },
    { name: '玩', icon: <MapPin size={14} />, color: 'bg-journey-green' },
    { name: '雜', icon: <Tag size={14} />, color: 'bg-journey-sand' },
  ];

  const fetchData = async () => {
    setLoading(true);
    if (!supabase || !isSupabaseConfigured) {
      const savedEx = localStorage.getItem(`expenses_${tripId}`);
      setExpenses(savedEx ? JSON.parse(savedEx) : []);
      const savedMem = localStorage.getItem(`members_${tripId}`);
      setMembers(savedMem ? JSON.parse(savedMem) : [{ name: '狸克' }, { name: '西施惠' }]);
    } else {
      const { data: exData } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
      const { data: memData } = await supabase.from('members').select('*').eq('trip_id', tripId);
      if (exData) setExpenses(exData);
      if (memData) setMembers(memData);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (members.length > 0 && !payer) setPayer(members[0].name); }, [members]);

  const totalHKD = Math.round(expenses.reduce((sum, item) => sum + (item.currency === 'HKD' ? item.amount : item.amount * JPY_TO_HKD), 0));
  const categorySummary = CATEGORIES.map(cat => {
    const total = expenses.filter(e => e.category === cat.name).reduce((sum, item) => sum + (item.currency === 'HKD' ? item.amount : item.amount * JPY_TO_HKD), 0);
    return { ...cat, total, percentage: totalHKD > 0 ? (total / totalHKD) * 100 : 0 };
  });

  const handleSave = async () => {
    if (!title || !amount) return;
    const payload = { 
      id: Date.now().toString(),
      title, amount: Number(amount), currency, payer, trip_id: tripId, category, splitCount: Number(splitCount) || 1,
      created_at: new Date().toISOString()
    };
    if (!supabase || !isSupabaseConfigured) {
      const updated = [payload, ...expenses];
      setExpenses(updated);
      localStorage.setItem(`expenses_${tripId}`, JSON.stringify(updated));
    } else {
      await supabase.from('expenses').insert([payload]);
      fetchData();
    }
    setShowForm(false);
    setTitle(''); setAmount('');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 頂部比例條改為淡綠色 */}
      <div className="bg-journey-green rounded-[3rem] p-8 text-journey-brown shadow-soft relative overflow-hidden border-4 border-white">
        <div className="relative z-10 space-y-6">
          <div><p className="text-[10px] font-black text-journey-brown/40 uppercase tracking-[0.2em]">旅行總預算</p><h2 className="text-4xl font-black mt-1">HK$ {totalHKD.toLocaleString()}</h2></div>
          <div className="space-y-3">
             <div className="flex h-4 w-full bg-white/40 rounded-full overflow-hidden border-2 border-white/20">
                {categorySummary.map(cat => (
                  <div key={cat.name} style={{ width: `${cat.percentage}%` }} className={`${cat.color} h-full transition-all duration-1000`}></div>
                ))}
             </div>
             <div className="flex flex-wrap gap-x-4 gap-y-2">
                {categorySummary.filter(c => c.total > 0).map(cat => (
                  <div key={cat.name} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${cat.color}`}></div><span className="text-[9px] font-black text-journey-brown/60 uppercase">{cat.name} {Math.round(cat.percentage)}%</span></div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <button onClick={() => setShowForm(true)} className="w-full bg-white rounded-4xl p-6 shadow-soft flex items-center justify-between active:scale-95 border-2 border-journey-sand/20">
         <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-journey-green text-white flex items-center justify-center"><Plus size={24} /></div><span className="font-black text-journey-brown">紀錄一筆快樂開銷</span></div>
      </button>

      <div className="space-y-4">
        {loading ? <div className="flex justify-center py-10 opacity-30"><Loader2 className="animate-spin" /></div> : expenses.map((ex) => (
          <div key={ex.id} className="bg-white rounded-3xl p-5 flex items-center justify-between shadow-soft-sm border-l-8 border-journey-sand">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${CATEGORIES.find(c => c.name === ex.category)?.color || 'bg-journey-sand'}`}>{CATEGORIES.find(c => c.name === ex.category)?.icon || <Tag size={14} />}</div>
              <div><h5 className="font-black text-journey-brown text-sm">{ex.title}</h5><p className="text-[10px] text-journey-brown/30 font-bold">{ex.payer} 支付 • {ex.splitCount} 人分擔</p></div>
            </div>
            <div className="text-right">
              <p className="font-black text-journey-brown text-base">{ex.currency === 'JPY' ? '¥' : '$'} {ex.amount.toLocaleString()}</p>
              {ex.currency === 'JPY' && <p className="text-[9px] text-journey-brown/30 font-bold">約 HK$ {Math.round(ex.amount * JPY_TO_HKD)}</p>}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center"><h3 className="text-xl font-black text-journey-brown">新增紀錄</h3><button onClick={() => setShowForm(false)} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button></div>
            <div className="flex bg-journey-cream p-1.5 rounded-3xl gap-1 overflow-x-auto">
              {CATEGORIES.map(cat => (
                <button key={cat.name} onClick={() => setCategory(cat.name)} className={`shrink-0 px-4 py-2 rounded-2xl text-[10px] font-black transition-all flex items-center gap-2 ${category === cat.name ? `${cat.color} text-white shadow-sm` : 'text-journey-brown/40'}`}>{cat.icon} {cat.name}</button>
              ))}
            </div>
            <input placeholder="品項名稱" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none" />
            <div className="flex gap-4">
              <input type="number" placeholder="金額" value={amount} onChange={e => setAmount(e.target.value)} className="flex-grow bg-journey-cream p-5 rounded-3xl text-2xl font-black focus:outline-none" />
              <button onClick={() => setCurrency(currency === 'JPY' ? 'HKD' : 'JPY')} className="bg-journey-accent px-6 rounded-3xl font-black text-journey-brown">{currency}</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-journey-brown/30 ml-2">付款人</label>
                 <select value={payer} onChange={e => setPayer(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl text-xs font-black focus:outline-none border-none">
                   {members.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-journey-brown/30 ml-2">分帳人數</label>
                 <input type="number" value={splitCount} onChange={e => setSplitCount(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl text-xs font-black focus:outline-none" min="1" />
               </div>
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2rem] shadow-lg active:scale-95 border-b-4 border-black/10">儲存這筆開銷</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;
