
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, Utensils, Plane, Hotel, MapPin, Tag, Trash2, Edit2, Coins, User } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const ExpenseView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'JPY' | 'HKD'>('JPY');
  const [payer, setPayer] = useState('');
  const [category, setCategory] = useState('食');
  const [splitCount, setSplitCount] = useState('1');

  const tripId = tripConfig.id;
  const JPY_TO_HKD = 0.0518;

  const CATEGORIES = [
    { name: '食', icon: <Utensils size={14} />, color: 'bg-journey-accent' },
    { name: '行', icon: <Plane size={14} />, color: 'bg-journey-blue' },
    { name: '住', icon: <Hotel size={14} />, color: 'bg-journey-red' },
    { name: '玩', icon: <MapPin size={14} />, color: 'bg-journey-green' },
    { name: '雜', icon: <Tag size={14} />, color: 'bg-journey-sand' },
  ];

  const fetchData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    
    // 1. 本地優先
    const exKey = `expenses_${tripId}`;
    const memKey = `members_${tripId}`;
    setExpenses(localStorage.getItem(exKey) ? JSON.parse(localStorage.getItem(exKey)!) : []);
    const localMem = localStorage.getItem(memKey) ? JSON.parse(localStorage.getItem(memKey)!) : [{ name: '我' }];
    setMembers(localMem);
    if (!payer && localMem.length > 0) setPayer(localMem[0].name);

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
      } catch (e) { console.error("Expense Sync Error"); }
    }
    setLoading(false);
  }, [tripId, payer]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalHKD = Math.round(expenses.reduce((sum, item) => sum + (item.currency === 'HKD' ? item.amount : item.amount * JPY_TO_HKD), 0));

  const handleSave = async () => {
    if (!title || !amount) return;
    const payload = { 
      id: editingExpense?.id || Date.now().toString(),
      title, amount: Number(amount), currency, payer, 
      trip_id: tripId, category, splitCount: Number(splitCount) || 1,
      created_at: editingExpense?.created_at || new Date().toISOString()
    };
    
    // 先同步雲端
    if (supabase && isSupabaseConfigured) {
      if (editingExpense) await supabase.from('expenses').update(payload).eq('id', editingExpense.id);
      else await supabase.from('expenses').insert([payload]);
    }

    // 成功後更新本地
    const exKey = `expenses_${tripId}`;
    const updated = editingExpense ? expenses.map(e => e.id === editingExpense.id ? payload : e) : [payload, ...expenses];
    setExpenses(updated);
    localStorage.setItem(exKey, JSON.stringify(updated));
    closeForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這筆支出紀錄嗎？')) return;
    if (supabase && isSupabaseConfigured) await supabase.from('expenses').delete().eq('id', id);

    const exKey = `expenses_${tripId}`;
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    localStorage.setItem(exKey, JSON.stringify(updated));
  };

  const openEdit = (ex: any) => {
    setEditingExpense(ex);
    setTitle(ex.title);
    setAmount(ex.amount.toString());
    setCurrency(ex.currency);
    setPayer(ex.payer);
    setCategory(ex.category);
    setSplitCount(ex.splitCount.toString());
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingExpense(null); setTitle(''); setAmount(''); setSplitCount('1'); };

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-journey-green rounded-[3rem] p-8 text-journey-brown shadow-soft border-4 border-white relative overflow-hidden animate-in zoom-in-95">
        <div className="relative z-10 space-y-4">
          <p className="text-[10px] font-black opacity-40 tracking-widest uppercase">總支出統計 (HKD)</p>
          <h2 className="text-4xl font-black italic">$ {totalHKD.toLocaleString()}</h2>
        </div>
      </div>

      <button onClick={() => { closeForm(); setShowForm(true); }} className="w-full bg-white rounded-4xl p-6 shadow-soft flex items-center justify-between active:scale-[0.98] border-4 border-white">
         <div className="flex items-center gap-4">
           <div className="w-14 h-14 rounded-2xl bg-journey-green text-white flex items-center justify-center shadow-soft-sm rotate-3"><Plus size={28} strokeWidth={3} /></div>
           <div className="text-left"><span className="font-black text-journey-brown text-lg block">紀錄支出</span><span className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-widest">Add New Expense</span></div>
         </div>
      </button>

      <div className="space-y-5">
        {loading && expenses.length === 0 ? (
          <div className="flex justify-center py-10 opacity-30"><Loader2 className="animate-spin" /></div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 bg-white/20 rounded-[2.5rem] border-4 border-dashed border-journey-sand opacity-40"><p className="font-black text-journey-brown text-sm">還沒有支出紀錄喔 ✨</p></div>
        ) : (
          expenses.map((ex) => (
            <div key={ex.id} className="bg-white rounded-[2.25rem] p-5 flex items-center justify-between shadow-soft border-2 border-journey-sand/5 animate-in slide-in-from-bottom-4 group">
              <div className="flex items-center gap-4 flex-grow overflow-hidden">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${CATEGORIES.find(c => c.name === ex.category)?.color || 'bg-journey-sand'}`}>{CATEGORIES.find(c => c.name === ex.category)?.icon || <Tag size={16} />}</div>
                <div className="overflow-hidden">
                  <h5 className="font-black text-journey-brown text-base truncate">{ex.title}</h5>
                  <div className="flex items-center gap-2 mt-0.5"><span className="text-[9px] font-black text-journey-green uppercase">{ex.payer} · {ex.splitCount} 人</span></div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-black text-journey-brown text-lg">{ex.currency === 'JPY' ? '¥' : '$'} {ex.amount.toLocaleString()}</p>
                <button onClick={() => openEdit(ex)} className="p-2 text-journey-brown/10 hover:text-journey-green"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(ex.id)} className="p-2 text-journey-brown/10 hover:text-journey-red"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-journey-brown italic">New Bill</h3><button onClick={closeForm} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button></div>
            <div className="space-y-6">
              <input placeholder="例如：便利商店零食" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[2rem] text-sm font-black focus:outline-none shadow-inner" />
              <div className="flex gap-3"><input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="flex-grow bg-journey-cream p-5 rounded-[2rem] text-2xl font-black focus:outline-none shadow-inner" /><button onClick={() => setCurrency(currency === 'JPY' ? 'HKD' : 'JPY')} className="bg-journey-accent px-8 rounded-[2rem] font-black text-journey-brown shadow-soft-sm">{currency}</button></div>
              <div className="grid grid-cols-2 gap-4">
                 <select value={payer} onChange={e => setPayer(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[1.5rem] text-xs font-black shadow-inner">{members.map(m => <option key={m.id || m.name} value={m.name}>{m.name}</option>)}</select>
                 <input type="number" value={splitCount} onChange={e => setSplitCount(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[1.5rem] text-xs font-black shadow-inner" min="1" />
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg active:scale-95 border-b-4 border-black/10 flex items-center justify-center gap-3"><Plus size={20} strokeWidth={3} /> Confirm Bill</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;
