
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, Circle, Briefcase, ShoppingBag, ListTodo, Plus, X, Loader2, Send, ChevronRight, ChevronDown, Camera, Image as ImageIcon, Trash2, Edit2, Maximize2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const PlanningView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const [activeTab, setActiveTab] = useState<'todo' | 'packing' | 'shopping'>('todo');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [text, setText] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tripId = tripConfig.id;

  const fetchData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    
    // 1. 本地讀取
    const localKey = `planning_${tripId}_${activeTab}`;
    const saved = localStorage.getItem(localKey);
    setItems(saved ? JSON.parse(saved) : []);

    // 2. 雲端同步
    if (supabase && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('planning_items').select('*').eq('trip_id', tripId).eq('type', activeTab).order('created_at', { ascending: true });
        if (data) {
          setItems(data);
          localStorage.setItem(localKey, JSON.stringify(data));
        }
      } catch { console.error("Planning Sync Error"); }
    }
    setLoading(false);
  }, [activeTab, tripId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!text) return;
    
    const payload = editingId 
      ? { text, image_url: previewImg } 
      : { id: Date.now().toString(), trip_id: tripId, text, completed: false, type: activeTab, parent_id: parentId, image_url: previewImg, created_at: new Date().toISOString() };

    // 優先雲端
    if (supabase && isSupabaseConfigured) {
      if (editingId) await supabase.from('planning_items').update(payload).eq('id', editingId);
      else await supabase.from('planning_items').insert([payload]);
    }

    // 更新本地
    const localKey = `planning_${tripId}_${activeTab}`;
    const updated = editingId 
      ? items.map(i => i.id === editingId ? { ...i, ...payload } : i)
      : [...items, payload];
    
    setItems(updated);
    localStorage.setItem(localKey, JSON.stringify(updated));
    resetModal();
  };

  const toggleStatus = async (id: string, current: boolean) => {
    const updated = items.map(i => i.id === id ? { ...i, completed: !current } : i);
    setItems(updated);
    localStorage.setItem(`planning_${tripId}_${activeTab}`, JSON.stringify(updated));
    
    if (supabase && isSupabaseConfigured) {
      await supabase.from('planning_items').update({ completed: !current }).eq('id', id);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('確定要刪除嗎？')) return;
    
    if (supabase && isSupabaseConfigured) {
      await supabase.from('planning_items').delete().eq('id', id);
    }

    const localKey = `planning_${tripId}_${activeTab}`;
    const updated = items.filter(i => i.id !== id && i.parent_id !== id);
    setItems(updated);
    localStorage.setItem(localKey, JSON.stringify(updated));
  };

  const resetModal = () => { setText(''); setPreviewImg(null); setParentId(null); setEditingId(null); setShowAddModal(false); };

  const renderItem = (item: any, depth = 0) => {
    const children = items.filter(child => child.parent_id === item.id);
    return (
      <div key={item.id} className="space-y-2">
        <div className={`bg-white rounded-[2rem] p-5 flex items-center gap-4 shadow-soft-sm transition-all ${item.completed ? 'opacity-40' : ''}`} style={{ marginLeft: `${depth * 24}px` }}>
           <div onClick={() => toggleStatus(item.id, item.completed)} className="cursor-pointer shrink-0">{item.completed ? <CheckCircle size={28} className="text-journey-green" /> : <Circle size={28} className="text-journey-brown/10" />}</div>
           <div className="flex-grow flex flex-col gap-1 overflow-hidden">
             <p className={`font-black text-journey-brown text-base truncate ${item.completed ? 'line-through' : ''}`}>{item.text}</p>
             {item.image_url && <div onClick={() => setSelectedImage(item.image_url)} className="w-20 h-20 rounded-2xl overflow-hidden mt-2 cursor-pointer shadow-sm border-2 border-white"><img src={item.image_url} className="w-full h-full object-cover" /></div>}
           </div>
           <div className="flex gap-1">
             <button onClick={(e) => handleDelete(e, item.id)} className="p-2 text-journey-brown/10 hover:text-journey-red"><Trash2 size={18} /></button>
             <button onClick={() => { setParentId(item.id); setShowAddModal(true); }} className="p-2 text-journey-green"><Plus size={18} strokeWidth={3} /></button>
           </div>
        </div>
        {children.map(child => renderItem(child, depth + 1))}
      </div>
    );
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
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div>
        ) : (
          <><div className="space-y-4">{items.filter(i => !i.parent_id).length === 0 ? (<div className="text-center py-20 bg-white/20 rounded-[3rem] border-4 border-dashed border-journey-sand opacity-40"><p className="font-black text-journey-brown text-sm">還沒有計畫...✨</p></div>) : items.filter(i => !i.parent_id).map(item => renderItem(item))}</div><button onClick={() => { setParentId(null); setEditingId(null); setShowAddModal(true); }} className="w-full py-7 border-4 border-dashed border-journey-sand rounded-[2.5rem] text-journey-brown/30 text-sm font-black flex items-center justify-center gap-4 hover:text-journey-green transition-all mt-6"><Plus size={24} strokeWidth={3} /> 新增項目</button></>
        )}
      </div>
      {selectedImage && <div className="fixed inset-0 z-[150] bg-journey-brown/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}><img src={selectedImage} className="max-w-full max-h-[80vh] rounded-[3rem] border-8 border-white" /></div>}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-journey-brown italic">New Item</h3><button onClick={resetModal} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button></div>
            {activeTab === 'shopping' && (<div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-journey-cream rounded-[2.5rem] border-4 border-dashed border-journey-sand flex flex-col items-center justify-center cursor-pointer overflow-hidden shadow-inner">{previewImg ? (<img src={previewImg} className="w-full h-full object-cover" />) : (<Camera size={32} className="text-journey-sand opacity-30" />)}<input type="file" ref={fileInputRef} className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { const r = new FileReader(); r.onloadend = () => setPreviewImg(r.result as string); r.readAsDataURL(file); } }} accept="image/*" /></div>)}
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="想要紀錄什麼呢..." className="w-full bg-journey-cream rounded-[2rem] p-6 text-journey-brown font-black focus:outline-none shadow-inner" />
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg flex items-center justify-center gap-3"><Plus size={20} strokeWidth={3} /> Add to List</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningView;
