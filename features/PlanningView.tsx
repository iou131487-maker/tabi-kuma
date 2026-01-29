import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Briefcase, ShoppingBag, ListTodo, User, Plus, X, Trash2, Loader2, Send } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const PlanningView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'todo' | 'packing' | 'shopping'>('todo');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [text, setText] = useState('');

  const tripId = 'hokkaido-2024';
  const tableName = activeTab === 'shopping' ? 'shopping' : 'planning_items';

  const fetchData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const query = supabase.from(tableName).select('*').eq('trip_id', tripId);
    if (activeTab !== 'shopping') query.eq('type', activeTab);
    
    const { data, error } = await query.order('created_at', { ascending: true });
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    if (supabase) {
      const channel = supabase.channel('planning-sync').on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => fetchData()).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeTab]);

  const toggleStatus = async (id: string, current: boolean) => {
    if (!supabase) return;
    await supabase.from(tableName).update({ completed: !current }).eq('id', id);
    fetchData();
  };

  const handleAdd = async () => {
    if (!text || !supabase) return;
    const payload: any = { trip_id: tripId, text, completed: false };
    if (activeTab !== 'shopping') payload.type = activeTab;
    
    await supabase.from(tableName).insert([payload]);
    setText(''); setShowAddModal(false); fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex bg-white/50 backdrop-blur-md rounded-4xl p-1.5 shadow-soft-sm">
        {(['todo', 'packing', 'shopping'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 flex flex-col items-center gap-1 rounded-3xl transition-all ${activeTab === tab ? 'bg-journey-green text-white shadow-soft' : 'text-journey-brown/40'}`}>
            {tab === 'todo' ? <ListTodo size={20} /> : tab === 'packing' ? <Briefcase size={20} /> : <ShoppingBag size={20} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{tab === 'todo' ? '待辦' : tab === 'packing' ? '行李' : '購物'}</span>
          </button>
        ))}
      </div>

      {loading ? ( <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div> ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className={`bg-white rounded-3xl p-5 flex items-center gap-4 shadow-soft transition-all ${item.completed ? 'opacity-40 grayscale' : ''}`}>
               <div onClick={() => toggleStatus(item.id, item.completed)} className="cursor-pointer">
                  {item.completed ? <CheckCircle size={24} className="text-journey-green" /> : <Circle size={24} className="text-journey-brown/20" />}
               </div>
               <p className={`flex-grow font-black text-journey-brown text-sm ${item.completed ? 'line-through' : ''}`}>{item.text}</p>
               <button onClick={async () => { await supabase?.from(tableName).delete().eq('id', item.id); fetchData(); }} className="text-journey-red/20"><Trash2 size={16} /></button>
            </div>
          ))}
          <button onClick={() => setShowAddModal(true)} className="w-full py-5 border-2 border-dashed border-journey-sand rounded-4xl text-journey-brown/30 text-xs font-black flex items-center justify-center gap-2 uppercase tracking-widest"><Plus size={18} /> 新增項目</button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-journey-brown">新增項目</h3>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="請輸入..." className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none" />
            <button onClick={handleAdd} className="w-full bg-journey-darkGreen text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"><Send size={18} /> 加入</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningView;