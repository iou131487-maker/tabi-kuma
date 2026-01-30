
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, Trash2, Edit2, Users, Save, DollarSign, Calculator, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';

const CAT_STYLES = {
  衣: 'bg-[#FF9AA2] text-white',
  食: 'bg-[#FFDAC1] text-journey-brown',
  行: 'bg-[#B5EAD7] text-journey-brown',
  住: 'bg-[#C7CEEA] text-journey-brown',
  玩: 'bg-[#FFB7B2] text-white',
  雜: 'bg-[#E2F0CB] text-journey-brown'
};

const ExpenseView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const tripId = tripConfig.id;
  const RATE = 0.0515;

  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [form, setForm] = useState({ title: '', amount: '', currency: 'JPY', payer: '我', category: '食', splitCount: 1 });

  useEffect(() => {
    const savedExp = localStorage.getItem(`exp_${tripId}`);
    const savedMem = localStorage.getItem(`mem_${tripId}`);
    if (savedExp) setExpenses(JSON.parse(savedExp));
    if (savedMem) setMembers(JSON.parse(savedMem));

    const fetchSync = async () => {
      if (!supabase || !tripId) return;
      setSyncing(true);
      const { data: m } = await supabase.from('members').select('*').eq('trip_id', tripId);
      if (m && m.length > 0) {
        setMembers(m);
        localStorage.setItem(`mem_${tripId}`, JSON.stringify(m));
      }
      const { data: e } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
      if (e && e.length > 0) {
        setExpenses(e);
        localStorage.setItem(`exp_${tripId}`, JSON.stringify(e));
      }
      setSyncing(false);
    };
    fetchSync();
  }, [tripId]);

  const handleSave = async () => {
    if (!form.title || !form.amount) return;
    
    const payload = {
      id: editingItem?.id || `ex-${Date.now()}`,
      ...form, amount: Number(form.amount), split_count: Number(form.splitCount) || 1,
      trip_id: tripId, created_at: editingItem?.created_at || new Date().toISOString()
    };
    
    // 立即更新與關閉
    const updated = editingItem ? expenses.map(e => e.id === editingItem.id ? payload : e) : [payload, ...expenses];
    setExpenses(updated);
    localStorage.setItem(`exp_${tripId}`, JSON.stringify(updated));
    setShowForm(false);
    setEditingItem(null);

    // 背景同步
    try {
      if (supabase) await supabase.from('expenses').upsert(payload);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？')) return;
    const filtered = expenses.filter(e => e.id !== id);
    setExpenses(filtered);
    localStorage.setItem(`exp_${tripId}`, JSON.stringify(filtered));
    if (supabase) await supabase.from('expenses').delete().eq('id', id);
  };

  const totalHKD = Math.round(expenses.reduce((s, i) => s + (i.currency === 'HKD' ? i.amount : i.amount * RATE), 0));

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-journey-green rounded-[3rem] p-8 text-journey-brown shadow-soft border-4 border-white relative overflow-hidden">
        <div className="flex flex-col gap-1 relative z-10">
          <div className="flex justify-between items-center">
             <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">總支出 (HKD)</p>
             {syncing && <RefreshCw size={14} className="animate-spin opacity-30"/>}
          </div>
          <h2 className="text-5xl font-black italic tracking-tighter leading-none">$ {totalHKD.toLocaleString()}</h2>
        </div>
      </div>

      <div className="space-y-4">
        {expenses.map((ex) => {
          const count = ex.split_count || members.length || 1;
          const splitVal = (ex.amount / count).toFixed(ex.currency === 'JPY' ? 0 : 1);
          return (
            <div key={ex.id} className="bg-white rounded-[2rem] p-5 shadow-soft border-4 border-white flex justify-between items-start animate-in zoom-in-95">
              <div className="flex-grow pr-10">
                <div className="flex gap-2 items-center mb-1">
                  <div className={`px-2 py-0.5 rounded-lg font-black text-[10px] ${CAT_STYLES[ex.category as keyof typeof CAT_STYLES] || 'bg-gray-200'}`}>{ex.category}</div>
                  <h5 className="font-black text-journey-brown">{ex.title}</h5>
                </div>
                <p className="font-black text-journey-brown text-2xl">{ex.currency === 'JPY' ? '¥' : '$'}{ex.amount.toLocaleString()}</p>
                <div className="mt-2 text-[10px] font-black text-journey-brown/40 bg-journey-cream px-2 py-1 rounded-lg inline-block">
                  {ex.payer} 付款 • {count} 人平分 ({ex.currency === 'JPY' ? '¥' : '$'}{splitVal})
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setEditingItem(ex); setForm({ ...ex, amount: ex.amount.toString(), splitCount: ex.split_count || members.length }); setShowForm(true); }} className="p-2 text-journey-blue"><Edit2 size={16}/></button>
                <button onClick={() => handleDelete(ex.id)} className="p-2 text-journey-red"><Trash2 size={16}/></button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => { setEditingItem(null); setForm({ title: '', amount: '', currency: 'JPY', payer: members[0]?.name || '我', category: '食', splitCount: members.length }); setShowForm(true); }} className="fixed bottom-32 right-6 w-16 h-16 bg-journey-green text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-90 transition-transform"><Plus size={32} /></button>

      {showForm && (
        <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3rem] p-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowForm(false)} className="absolute right-10 top-10 text-journey-brown/20"><X /></button>
            <h3 className="text-2xl font-black text-journey-brown italic">新增開支</h3>
            <div className="space-y-4">
              <input placeholder="消費內容" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[1.5rem] font-black focus:outline-none" />
              <div className="flex gap-2">
                <input type="number" placeholder="金額" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="flex-grow bg-journey-cream p-5 rounded-[1.5rem] text-2xl font-black focus:outline-none" />
                <button onClick={() => setForm({...form, currency: form.currency === 'JPY' ? 'HKD' : 'JPY'})} className="bg-journey-accent px-4 rounded-[1.5rem] font-black text-xs">{form.currency}</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                  <select value={form.payer} onChange={e => setForm({...form, payer: e.target.value})} className="w-full bg-journey-cream p-4 rounded-xl font-black text-xs outline-none">
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                  <input type="number" min="1" value={form.splitCount} onChange={e => setForm({...form, splitCount: Number(e.target.value)})} className="w-full bg-journey-cream p-4 rounded-xl font-black text-xs outline-none" placeholder="人數" />
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Save size={20} /> 儲存
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;
