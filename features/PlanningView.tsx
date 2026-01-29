
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Circle, Briefcase, ShoppingBag, ListTodo, Plus, X, Trash2, Loader2, Send, ChevronRight, ChevronDown, Camera, Image as ImageIcon } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const PlanningView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'todo' | 'packing' | 'shopping'>('todo');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [text, setText] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tripId = 'hokkaido-2024';

  const fetchData = async () => {
    if (!supabase) { setLoading(false); return; }
    const { data, error } = await supabase.from('planning_items').select('*').eq('trip_id', tripId).eq('type', activeTab).order('created_at', { ascending: true });
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedItems);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedItems(next);
  };

  const handleAdd = async (parentId: string | null = null) => {
    if (!text || !supabase) return;
    const payload = { trip_id: tripId, text, completed: false, type: activeTab, parent_id: parentId, image_url: activeTab === 'shopping' ? previewImg : null };
    await supabase.from('planning_items').insert([payload]);
    setText(''); setPreviewImg(null); setShowAddModal(false); fetchData();
  };

  const toggleStatus = async (id: string, current: boolean) => {
    if (!supabase) return;
    await supabase.from('planning_items').update({ completed: !current }).eq('id', id);
    fetchData();
  };

  const renderItem = (item: any, depth = 0) => {
    const children = items.filter(child => child.parent_id === item.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <div key={item.id} className="space-y-2">
        <div className={`bg-white rounded-3xl p-5 flex items-center gap-4 shadow-soft-sm transition-all ${item.completed ? 'opacity-40 grayscale' : ''}`} style={{ marginLeft: `${depth * 20}px` }}>
           <div onClick={() => toggleStatus(item.id, item.completed)} className="cursor-pointer">
              {item.completed ? <CheckCircle size={24} className="text-journey-green" /> : <Circle size={24} className="text-journey-brown/20" />}
           </div>
           
           <div className="flex-grow">
             <div className="flex items-center gap-2">
               <p className={`font-black text-journey-brown text-sm ${item.completed ? 'line-through' : ''}`}>{item.text}</p>
               {item.image_url && <ImageIcon size={14} className="text-journey-blue" />}
             </div>
           </div>

           <div className="flex items-center gap-2">
             <button onClick={() => toggleExpand(item.id)} className={`p-2 rounded-xl bg-journey-cream text-journey-brown/40 ${!hasChildren && 'opacity-0'}`}>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
             </button>
             <button onClick={() => { setText(''); setShowAddModal(true); /* Logic for child add can go here */ }} className="p-2 text-journey-green hover:bg-journey-green/10 rounded-xl transition-colors"><Plus size={16} /></button>
           </div>
        </div>
        {isExpanded && children.map(child => renderItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex bg-white/50 backdrop-blur-md rounded-4xl p-2 shadow-soft-sm border border-white/20">
        {(['todo', 'packing', 'shopping'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 flex flex-col items-center gap-1 rounded-3xl transition-all duration-500 ${activeTab === tab ? 'bg-journey-green text-white shadow-soft' : 'text-journey-brown/30'}`}>
            {tab === 'todo' ? <ListTodo size={20} /> : tab === 'packing' ? <Briefcase size={20} /> : <ShoppingBag size={20} />}
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{tab === 'todo' ? '待辦' : tab === 'packing' ? '行李' : '購物'}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? ( <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div> ) : (
          items.filter(i => !i.parent_id).map(item => renderItem(item))
        )}
        <button onClick={() => setShowAddModal(true)} className="w-full py-6 border-4 border-dashed border-journey-sand rounded-[2.5rem] text-journey-brown/30 text-xs font-black flex items-center justify-center gap-3 uppercase tracking-widest hover:bg-white/40 transition-colors"><Plus size={20} /> 新增冒險準備</button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-journey-brown">新增項目</h3>
            {activeTab === 'shopping' && (
              <div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-journey-cream rounded-3xl border-2 border-dashed border-journey-sand flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group">
                 {previewImg ? <img src={previewImg} className="w-full h-full object-cover" /> : <div className="text-center"><Camera size={24} className="mx-auto text-journey-sand mb-2" /><p className="text-[10px] font-black text-journey-sand uppercase tracking-widest">附上購物清單照片</p></div>}
                 <input type="file" ref={fileInputRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f) setPreviewImg(URL.createObjectURL(f)); }} />
              </div>
            )}
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="請輸入項目名稱..." className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none ring-4 ring-transparent focus:ring-journey-green transition-all" />
            <button onClick={() => handleAdd(null)} className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 border-b-4 border-black/10"><Send size={18} /> 加入清單</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningView;
