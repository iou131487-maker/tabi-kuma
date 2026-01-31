
import React, { useState, useEffect } from 'react';
import { 
  Plus, X, Trash2, Edit2, Save, RefreshCw, 
  Calculator, TrendingUp, Utensils, Shirt, 
  Home, Bus, Gamepad2, Package, Search 
} from 'lucide-react';
import { supabase } from '../supabase';

// 動森風格分類配色與圖標定義
const EXPENSE_CATEGORIES = [
  { id: '食', label: '美食', color: 'bg-[#FFDAC1]', text: 'text-[#8D6E63]', icon: <Utensils size={18} /> },
  { id: '衣', label: '購物', color: 'bg-[#FF9AA2]', text: 'text-white', icon: <Shirt size={18} /> },
  { id: '住', label: '住宿', color: 'bg-[#C7CEEA]', text: 'text-[#5C6BC0]', icon: <Home size={18} /> },
  { id: '行', label: '交通', color: 'bg-[#B5EAD7]', text: 'text-[#2E7D32]', icon: <Bus size={18} /> },
  { id: '玩', label: '玩樂', color: 'bg-[#FFB7B2]', text: 'text-white', icon: <Gamepad2 size={18} /> },
  { id: '雜', label: '雜項', color: 'bg-[#E2F0CB]', text: 'text-[#827717]', icon: <Package size={18} /> },
];

const ExpenseView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const tripId = tripConfig.id;
  const localExpKey = `exp_${tripId}`;
  const localMemKey = `mem_${tripId}`;
  const RATE = 0.0515; // 假設匯率

  const [expenses, setExpenses] = useState<any[]>(() => {
    const saved = localStorage.getItem(localExpKey);
    return saved ? JSON.parse(saved) : [];
  });
  const [members, setMembers] = useState<any[]>(() => {
    const saved = localStorage.getItem(localMemKey);
    return saved ? JSON.parse(saved) : [{ id: 'me', name: '我' }];
  });
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  const [form, setForm] = useState({ 
    title: '', 
    amount: '', 
    currency: 'JPY', 
    payer: '我', 
    category: '食', 
    splitCount: 1 
  });

  useEffect(() => {
    const fetchSync = async () => {
      if (!supabase || !tripId) return;
      setSyncing(true);
      try {
        const { data: m } = await supabase.from('members').select('*').eq('trip_id', tripId);
        if (m && m.length > 0) {
          setMembers(m);
          localStorage.setItem(localMemKey, JSON.stringify(m));
        }
        const { data: e } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
        if (e && e.length > 0) {
          setExpenses(e);
          localStorage.setItem(localExpKey, JSON.stringify(e));
        }
      } catch (err) { 
        console.warn("Sync Offline");
      } finally { 
        setSyncing(false); 
      }
    };
    fetchSync();
  }, [tripId, localExpKey, localMemKey]);

  const handleSave = async () => {
    if (!form.title || !form.amount) return;
    
    const payload = {
      id: editingItem?.id || `ex-${Date.now()}`,
      ...form, 
      amount: Number(form.amount), 
      split_count: Number(form.splitCount) || 1,
      trip_id: tripId, 
      created_at: editingItem?.created_at || new Date().toISOString()
    };
    
    const updated = editingItem ? expenses.map(e => e.id === editingItem.id ? payload : e) : [payload, ...expenses];
    setExpenses(updated);
    localStorage.setItem(localExpKey, JSON.stringify(updated));
    
    setShowForm(false);
    setEditingItem(null);

    if (supabase) {
      try {
        await supabase.from('expenses').upsert(payload);
      } catch (e) {
        console.error("Cloud save failed", e);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除這筆開支？')) return;
    
    const filtered = expenses.filter(e => e.id !== id);
    setExpenses(filtered);
    localStorage.setItem(localExpKey, JSON.stringify(filtered));
    
    if (supabase) {
      try {
        await supabase.from('expenses').delete().eq('id', id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const totalHKD = Math.round(expenses.reduce((s, i) => s + (i.currency === 'HKD' ? i.amount : i.amount * RATE), 0));
  const totalJPY = Math.round(expenses.reduce((s, i) => s + (i.currency === 'JPY' ? i.amount : i.amount / RATE), 0));

  return (
    <div className="space-y-6 pb-28">
      {/* 總結卡片 */}
      <div className="bg-journey-green rounded-[3.5rem] p-10 text-journey-brown shadow-soft border-4 border-white relative overflow-hidden transition-all hover:scale-[1.02]">
        <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12 scale-150"><TrendingUp size={160} /></div>
        <div className="flex flex-col gap-1 relative z-10">
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-black opacity-50 uppercase tracking-[0.2em]">旅行總預算 (HKD)</p>
            {syncing && <RefreshCw size={14} className="animate-spin opacity-30"/>}
          </div>
          <h2 className="text-6xl font-black italic tracking-tighter leading-none my-2">$ {totalHKD.toLocaleString()}</h2>
          <div className="mt-6 pt-6 border-t-4 border-dashed border-journey-brown/10 flex justify-between items-end">
             <div>
               <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">日圓估算</p>
               <p className="font-black text-2xl">¥ {totalJPY.toLocaleString()}</p>
             </div>
             <div className="bg-white/40 px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/20">
               <Calculator size={14} className="opacity-40" />
               <span className="text-[10px] font-black opacity-60">1 HKD ≈ 19.4 JPY</span>
             </div>
          </div>
        </div>
      </div>

      {/* 支出列表 */}
      <div className="space-y-5">
        {expenses.length === 0 && (
          <div className="text-center py-20 opacity-20 font-black italic flex flex-col items-center gap-4">
            <Search size={48} />
            <p>還沒有任何記帳喔</p>
          </div>
        )}
        {expenses.map((ex) => {
          const cat = EXPENSE_CATEGORIES.find(c => c.id === ex.category) || EXPENSE_CATEGORIES[5];
          const count = ex.split_count || 1;
          const splitVal = (ex.amount / count).toFixed(ex.currency === 'JPY' ? 0 : 1);
          
          return (
            <div key={ex.id} className="bg-white rounded-[2.5rem] p-7 shadow-soft border-4 border-white flex justify-between items-center transition-all hover:border-journey-green animate-in slide-in-from-bottom-4">
              <div className="flex-grow pr-4">
                <div className="flex gap-2 items-center mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 border-white shadow-sm ${cat.color} ${cat.text}`}>
                    {cat.icon}
                  </div>
                  <h5 className="font-black text-journey-brown text-lg truncate max-w-[140px]">{ex.title}</h5>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-journey-brown text-3xl leading-none">{ex.amount.toLocaleString()}</span>
                  <span className="text-[10px] font-black opacity-30 uppercase">{ex.currency}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="text-[9px] font-black text-journey-brown/50 bg-journey-cream px-3 py-1.5 rounded-xl border border-journey-brown/5">
                    {ex.payer} 付款
                  </div>
                  <div className="text-[9px] font-black text-journey-darkGreen bg-journey-green/10 px-3 py-1.5 rounded-xl border border-journey-green/10">
                    每人: {ex.currency === 'JPY' ? '¥' : '$'}{splitVal} ({count}人)
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 shrink-0 border-l-4 border-dashed border-journey-cream pl-5">
                <button onClick={() => { setEditingItem(ex); setForm({ ...ex, amount: ex.amount.toString(), splitCount: ex.split_count || 1 }); setShowForm(true); }} className="text-journey-blue active:scale-90 transition-transform"><Edit2 size={20}/></button>
                <button onClick={() => handleDelete(ex.id)} className="text-journey-red active:scale-90 transition-transform"><Trash2 size={20}/></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 懸浮新增按鈕 */}
      <button 
        onClick={() => { 
          setEditingItem(null); 
          setForm({ title: '', amount: '', currency: 'JPY', payer: members[0]?.name || '我', category: '食', splitCount: 1 }); 
          setShowForm(true); 
        }} 
        className="fixed bottom-32 right-6 w-16 h-16 bg-journey-green text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-90 transition-all hover:rotate-12"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* 新增/編輯彈窗 */}
      {showForm && (
        <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3rem] p-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative animate-in slide-in-from-bottom-10">
            <button onClick={() => setShowForm(false)} className="absolute right-10 top-10 text-journey-brown/20 hover:text-journey-brown transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">{editingItem ? '修改帳目' : '新增帳目'}</h3>
            
            <div className="space-y-5">
              {/* 分類選擇器 - 動森格點風格 */}
              <div className="grid grid-cols-3 gap-3">
                {EXPENSE_CATEGORIES.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setForm({...form, category: cat.id})}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-4 transition-all active:scale-95 ${form.category === cat.id ? `${cat.color} ${cat.text} border-white shadow-md scale-[1.05]` : 'bg-journey-cream text-journey-brown/20 border-transparent opacity-60'}`}
                  >
                    <div className="mb-1">{cat.icon}</div>
                    <span className="text-[10px] font-black">{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <input placeholder="消費了什麼？" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[1.8rem] font-black focus:outline-none focus:ring-4 ring-journey-green/20" />
                
                <div className="flex gap-3">
                  <div className="flex-grow bg-journey-cream rounded-[1.8rem] flex items-center px-6 border-4 border-transparent focus-within:border-journey-green/20">
                    <span className="font-black text-journey-brown/20 mr-2 text-xl">{form.currency === 'JPY' ? '¥' : '$'}</span>
                    <input type="number" placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-transparent py-5 font-black text-2xl focus:outline-none" />
                  </div>
                  <button 
                    onClick={() => setForm({...form, currency: form.currency === 'JPY' ? 'HKD' : 'JPY'})} 
                    className={`px-6 rounded-[1.8rem] font-black text-sm transition-all shadow-sm ${form.currency === 'JPY' ? 'bg-journey-accent text-journey-brown' : 'bg-journey-blue text-journey-brown'}`}
                  >
                    {form.currency}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-journey-brown/30 ml-3 uppercase">付款人</label>
                    <select value={form.payer} onChange={e => setForm({...form, payer: e.target.value})} className="w-full bg-journey-cream p-4 rounded-2xl font-black text-xs appearance-none focus:outline-none">
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-journey-brown/30 ml-3 uppercase">分帳人數</label>
                    <input type="number" min="1" value={form.splitCount} onChange={e => setForm({...form, splitCount: Number(e.target.value)})} className="w-full bg-journey-cream p-4 rounded-2xl font-black text-xs text-center focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.2rem] shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all mt-4">
              <Save size={22} />
              <span className="text-lg">記錄這筆開支</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;
