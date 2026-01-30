
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, Circle, Briefcase, ShoppingBag, ListTodo, Plus, X, Loader2, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const PlanningView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const [activeTab, setActiveTab] = useState<'todo' | 'packing' | 'shopping'>('todo');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [text, setText] = useState('');

  const tripId = tripConfig.id;

  const fetchData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    
    const localKey = `planning_${tripId}_${activeTab}`;
    const saved = localStorage.getItem(localKey);
    if (saved) setItems(JSON.parse(saved));

    if (supabase && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('planning_items').select('*').eq('trip_id', tripId).eq('type', activeTab).order('created_at', { ascending: true });
        if (data) {
          setItems(data);
          localStorage.setItem(localKey, JSON.stringify(data));
        }
      } catch { console.error("Sync Error"); }
    }
    setLoading(false);
  }, [activeTab, tripId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!text) return;
    const payload = { id: Date.now().toString(), trip_id: tripId, text, completed: false, type: activeTab, created_at: new Date().toISOString() };

    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from('planning_items').insert([payload]);
      if (error) return alert("儲存失敗");
    }

    const updated = [...items, payload];
    setItems(updated);
    localStorage.setItem(`planning_${tripId}_${activeTab}`, JSON.stringify(updated));
    setText('');
    setShowAddModal(false);
  };

  const toggleStatus = async (id: string, current: boolean) => {
    const updated = items.map(i => i.id === id ? { ...i, completed: !current } : i);
    setItems(updated);
    localStorage.setItem(`planning_${tripId}_${activeTab}`, JSON.stringify(updated));
    if (supabase && isSupabaseConfigured) {
      await supabase.from('planning_items').update({ completed: !current }).eq('id', id);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('刪除項目？')) return;
    if (supabase && isSupabaseConfigured) {
      await supabase.from('planning_items').delete().eq('id', id);
    }
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    localStorage.setItem(`planning_${tripId}_${activeTab}`, JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="flex bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-2 shadow-soft-sm border border-white/40">
        {(['todo', 'packing', 'shopping'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-5 flex flex-col items-center gap-1.5 rounded-[2rem] transition-all ${activeTab === tab ? 'bg-journey-green text-white shadow-soft' : 'text-journey-brown/30'}`}>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tab === 'todo' ? '待辦' : tab === 'packing' ? '行李' : '清單'}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className={`bg-white rounded-[2rem] p-5 flex items-center gap-4 shadow-soft transition-all ${item.completed ? 'opacity-40 grayscale' : ''}`}>
             <div onClick={() => toggleStatus(item.id, item.completed)} className="cursor-pointer">
               {item.completed ? <CheckCircle size={28} className="text-journey-green" /> : <Circle size={28} className="text-journey-brown/10" />}
             </div>
             <p className={`flex-grow font-black text-journey-brown ${item.completed ? 'line-through' : ''}`}>{item.text}</p>
             <button onClick={() => handleDelete(item.id)} className="text-journey-brown/10 hover:text-journey-red"><Trash2 size={18}/></button>
          </div>
        ))}
        <button onClick={() => setShowAddModal(true)} className="w-full py-7 border-4 border-dashed border-journey-sand rounded-[2.5rem] text-journey-brown/30 font-black flex items-center justify-center gap-2">
          <Plus size={24} /> 新增項目
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[120] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8">
            <h3 className="text-2xl font-black text-journey-brown italic">New Planning</h3>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="要做什麼呢..." className="w-full bg-journey-cream rounded-[2rem] p-6 font-black focus:outline-none shadow-inner" />
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg">儲存項目</button>
            <button onClick={() => setShowAddModal(false)} className="w-full text-journey-brown/30 font-black">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningView;
