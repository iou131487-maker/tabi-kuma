
import React, { useState, useEffect } from 'react';
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

  // 使用穩定 ID
  const tripId = tripConfig.id || 'default-trip';
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
    
    // 1. 優先讀取本地成員
    const savedMem = localStorage.getItem(`members_${tripId}`);
    const localMem = savedMem ? JSON.parse(savedMem) : [{ name: '我' }];
    setMembers(localMem);
    if (!payer && localMem.length > 0) setPayer(localMem[0].name);

    // 2. 優先讀取本地支出
    const savedEx = localStorage.getItem(`expenses_${tripId}`);
    const localEx = savedEx ? JSON.parse(savedEx) : [];
    setExpenses(localEx);

    // 3. 異步同步雲端
    if (supabase && isSupabaseConfigured) {
      try {
        // 同步成員 (避免其他頁面改了成員這裡沒更新)
        const { data: memData } = await supabase.from('members').select('*').eq('trip_id', tripId);
        if (memData && memData.length > 0) {
          setMembers(memData);
          localStorage.setItem(`members_${tripId}`, JSON.stringify(memData));
        }

        // 同步支出
        const { data: exData } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
        if (exData && exData.length > 0) {
          setExpenses(exData);
          localStorage.setItem(`expenses_${tripId}`, JSON.stringify(exData));
        }
      } catch (e) { console.warn("Cloud sync paused"); }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tripId]);

  const totalHKD = Math.round(expenses.reduce((sum, item) => sum + (item.currency === 'HKD' ? item.amount : item.amount * JPY_TO_HKD), 0));
  
  const categorySummary = CATEGORIES.map(cat => {
    const total = expenses.filter(e => e.category === cat.name).reduce((sum, item) => sum + (item.currency === 'HKD' ? item.amount : item.amount * JPY_TO_HKD), 0);
    return { ...cat, total, percentage: totalHKD > 0 ? (total / totalHKD) * 100 : 0 };
  });

  const handleSave = async () => {
    if (!title || !amount) return;
    
    const payload = { 
      id: editingExpense?.id || Date.now().toString(),
      title, 
      amount: Number(amount), 
      currency, 
      payer, 
      trip_id: tripId, 
      category, 
      splitCount: Number(splitCount) || 1,
      created_at: editingExpense?.created_at || new Date().toISOString()
    };
    
    // 即時寫入本地防止 Reload 遺失
    let updated;
    if (editingExpense) {
      updated = expenses.map(e => e.id === editingExpense.id ? payload : e);
    } else {
      updated = [payload, ...expenses];
    }
    setExpenses(updated);
    localStorage.setItem(`expenses_${tripId}`, JSON.stringify(updated));

    // 非同步推送到雲端
    if (supabase && isSupabaseConfigured) {
      if (editingExpense) {
        supabase.from('expenses').update(payload).eq('id', editingExpense.id).then();
      } else {
        supabase.from('expenses').insert([payload]).then();
      }
    }
    closeForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這筆支出紀錄嗎？')) return;
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    localStorage.setItem(`expenses_${tripId}`, JSON.stringify(updated));

    if (supabase && isSupabaseConfigured) {
      supabase.from('expenses').delete().eq('id', id).then();
    }
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

  const closeForm = () => {
    setShowForm(false);
    setEditingExpense(null);
    setTitle('');
    setAmount('');
    setSplitCount('1');
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-journey-green rounded-[3rem] p-8 text-journey-brown shadow-soft border-4 border-white relative overflow-hidden animate-in zoom-in-95">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Coins size={120} /></div>
        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-[10px] font-black opacity-40 tracking-widest uppercase">總支出統計 (HKD)</p>
            <h2 className="text-4xl font-black mt-1">$ {totalHKD.toLocaleString()}</h2>
          </div>
          <div className="space-y-3">
             <div className="flex h-5 w-full bg-white/40 rounded-full overflow-hidden border-2 border-white/20 p-0.5">
                {categorySummary.map(cat => (
                  <div key={cat.name} style={{ width: `${cat.percentage}%` }} className={`${cat.color} h-full transition-all duration-1000 first:rounded-l-full last:rounded-r-full`}></div>
                ))}
             </div>
             <div className="flex flex-wrap gap-x-4 gap-y-2">
                {categorySummary.filter(c => c.total > 0).map(cat => (
                  <div key={cat.name} className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${cat.color} border border-white/50`}></div><span className="text-[9px] font-black opacity-60 uppercase">{cat.name} {Math.round(cat.percentage)}%</span></div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <button onClick={() => { closeForm(); setShowForm(true); }} className="w-full bg-white rounded-4xl p-6 shadow-soft flex items-center justify-between active:scale-[0.98] border-4 border-white transition-all group">
         <div className="flex items-center gap-4">
           <div className="w-14 h-14 rounded-2xl bg-journey-green text-white flex items-center justify-center shadow-soft-sm group-hover:rotate-6 transition-transform"><Plus size={28} strokeWidth={3} /></div>
           <div className="text-left"><span className="font-black text-journey-brown text-lg block">紀錄支出</span><span className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-widest">Add New Expense</span></div>
         </div>
      </button>

      <div className="space-y-5">
        {loading && expenses.length === 0 ? (
          <div className="flex justify-center py-10 opacity-30"><Loader2 className="animate-spin" /></div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 bg-white/20 rounded-[2.5rem] border-4 border-dashed border-journey-sand opacity-40"><p className="font-black text-journey-brown text-sm">還沒有支出紀錄喔 ✨</p></div>
        ) : expenses.map((ex) => (
          <div key={ex.id} className="bg-white rounded-[2.25rem] p-5 flex items-center justify-between shadow-soft border-2 border-journey-sand/5 animate-in slide-in-from-bottom-4 group">
            <div className="flex items-center gap-4 flex-grow overflow-hidden">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm ${CATEGORIES.find(c => c.name === ex.category)?.color || 'bg-journey-sand'}`}>{CATEGORIES.find(c => c.name === ex.category)?.icon || <Tag size={16} />}</div>
              <div className="overflow-hidden">
                <h5 className="font-black text-journey-brown text-base truncate">{ex.title}</h5>
                <div className="flex items-center gap-2 mt-0.5">
                   <div className="flex items-center gap-1 text-[9px] font-bold text-journey-brown/40 uppercase"><User size={10} /> <span>{ex.payer}</span></div>
                   <div className="w-1 h-1 rounded-full bg-journey-sand"></div>
                   <span className="text-[9px] font-black text-journey-green uppercase tracking-widest">{ex.splitCount} 人分擔</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 ml-4">
              <div className="text-right">
                <p className="font-black text-journey-brown text-lg leading-none">{ex.currency === 'JPY' ? '¥' : '$'} {ex.amount.toLocaleString()}</p>
                {ex.splitCount > 1 && <p className="text-[10px] font-black text-journey-red mt-1 uppercase tracking-tighter">每人 {ex.currency === 'JPY' ? '¥' : '$'} {Math.round(ex.amount / ex.splitCount).toLocaleString()}</p>}
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(ex)} className="p-2 text-journey-brown/20 hover:text-journey-green transition-colors"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(ex.id)} className="p-2 text-journey-brown/20 hover:text-journey-red transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8 animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div><h3 className="text-2xl font-black text-journey-brown uppercase tracking-tighter leading-none">{editingExpense ? 'Edit Bill' : 'New Bill'}</h3><p className="text-[10px] font-bold text-journey-brown/30 uppercase mt-2 tracking-[0.2em]">Expense Records</p></div>
              <button onClick={closeForm} className="p-3 bg-journey-cream rounded-full text-journey-brown/30 active:scale-90 transition-all"><X size={20} /></button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-4">Title</label><input placeholder="例如：便利商店零食" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[2rem] text-sm font-black focus:outline-none ring-journey-green/20 focus:ring-8 transition-all" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-4">Amount & Currency</label><div className="flex gap-3"><input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="flex-grow bg-journey-cream p-5 rounded-[2rem] text-2xl font-black focus:outline-none ring-journey-green/20 focus:ring-8 transition-all" /><button onClick={() => setCurrency(currency === 'JPY' ? 'HKD' : 'JPY')} className="bg-journey-accent px-8 rounded-[2rem] font-black text-journey-brown shadow-soft-sm active:scale-90 transition-transform">{currency}</button></div></div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-4">Paid By</label><select value={payer} onChange={e => setPayer(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[1.5rem] text-xs font-black border-none focus:outline-none cursor-pointer">{members.map(m => <option key={m.id || m.name} value={m.name}>{m.name}</option>)}</select></div>
                 <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-4">Split With</label><div className="relative"><input type="number" value={splitCount} onChange={e => setSplitCount(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[1.5rem] text-xs font-black focus:outline-none ring-journey-green/20 focus:ring-4 transition-all" min="1" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black opacity-20">PEOPLE</span></div></div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-4">Category</label>
                <div className="flex bg-journey-cream p-1.5 rounded-[1.8rem] gap-1 overflow-x-auto hide-scrollbar">
                  {CATEGORIES.map(cat => (<button key={cat.name} onClick={() => setCategory(cat.name)} className={`shrink-0 px-5 py-3 rounded-[1.25rem] text-[10px] font-black transition-all flex items-center gap-2 ${category === cat.name ? 'bg-white text-journey-brown shadow-sm' : 'text-journey-brown/30'}`}>{cat.icon} {cat.name}</button>))}
                </div>
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg active:scale-95 border-b-4 border-black/10 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3"><Plus size={20} strokeWidth={3} /> {editingExpense ? 'Update Record' : 'Confirm Bill'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;
