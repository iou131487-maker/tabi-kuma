
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Circle, Plus, X, Trash2, Edit2, Save, RefreshCw, Camera } from 'lucide-react';
import { supabase } from '../supabase';

const PlanningView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const tripId = tripConfig.id;
  const [activeTab, setActiveTab] = useState<'todo' | 'packing' | 'shopping'>(() => {
    return (localStorage.getItem(`plan_last_tab_${tripId}`) as any) || 'todo';
  });

  const [items, setItems] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [form, setForm] = useState({ text: '', imageUrl: null as string | null });
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const localKey = `plan_${tripId}_${activeTab}`;
    const localData = localStorage.getItem(localKey);
    if (localData) {
      setItems(JSON.parse(localData));
    } else {
      setItems([]);
    }
    
    localStorage.setItem(`plan_last_tab_${tripId}`, activeTab);
    
    const fetchSync = async () => {
      if (!supabase || !tripId) return;
      setSyncing(true);
      try {
        const { data, error } = await supabase
          .from('planning_items')
          .select('*')
          .eq('trip_id', tripId)
          .eq('type', activeTab)
          .order('created_at', { ascending: true });
        
        if (!error && data && data.length > 0) {
          setItems(data);
          localStorage.setItem(localKey, JSON.stringify(data));
        }
      } catch (e) { 
        console.warn("Sync Offline"); 
      } finally { 
        setSyncing(false); 
      }
    };
    fetchSync();
  }, [activeTab, tripId]);

  const handleSave = async () => {
    if (!form.text.trim()) return;
    
    const newItem = { 
      id: editingItem?.id || `pl-${Date.now()}`, 
      text: form.text,
      imageUrl: form.imageUrl,
      parent_id: parentId,
      completed: editingItem?.completed || false, 
      type: activeTab, 
      trip_id: tripId, 
      created_at: editingItem?.created_at || new Date().toISOString() 
    };
    
    const updated = editingItem 
      ? items.map(i => i.id === editingItem.id ? newItem : i) 
      : [...items, newItem];
    
    setItems(updated);
    localStorage.setItem(`plan_${tripId}_${activeTab}`, JSON.stringify(updated));
    
    setShowModal(false); 
    setEditingItem(null);
    setParentId(null);

    if (supabase) {
      try {
        await supabase.from('planning_items').upsert(newItem);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const toggle = async (id: string, cur: boolean) => {
    const updated = items.map(i => i.id === id ? { ...i, completed: !cur } : i);
    setItems(updated);
    localStorage.setItem(`plan_${tripId}_${activeTab}`, JSON.stringify(updated));
    
    if (supabase) {
      try {
        await supabase.from('planning_items').update({ completed: !cur }).eq('id', id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除這個項目？')) return;
    
    const filtered = items.filter(i => i.id !== id && i.parent_id !== id);
    setItems(filtered);
    localStorage.setItem(`plan_${tripId}_${activeTab}`, JSON.stringify(filtered));
    
    if (supabase) {
      try {
        await supabase.from('planning_items').delete().eq('id', id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const renderItem = (item: any, isChild = false) => (
    <div key={item.id} className={`${isChild ? 'ml-8 border-l-4 border-journey-brown/10 pl-4 py-2 mt-2 bg-white/40 rounded-r-2xl' : 'bg-white rounded-[2rem] p-5 shadow-soft border-4 border-white mb-4'} group relative transition-all ${item.completed ? 'opacity-40' : 'hover:border-journey-green'}`}>
       <div className="flex items-start gap-4">
         <div onClick={() => toggle(item.id, item.completed)} className="cursor-pointer pt-1">
            {item.completed ? <CheckCircle size={isChild ? 20 : 28} className="text-journey-green" /> : <Circle size={isChild ? 20 : 28} className="text-journey-brown/10" />}
         </div>
         <div className="flex-grow">
             <div className="flex items-center justify-between">
                <p className={`font-black text-journey-brown transition-all ${isChild ? 'text-sm' : 'text-lg'} ${item.completed ? 'line-through font-normal text-journey-brown/40' : ''}`}>{item.text}</p>
                <div className="flex gap-1">
                    {!isChild && <button onClick={() => { setParentId(item.id); setEditingItem(null); setForm({text: '', imageUrl: null}); setShowModal(true); }} className="p-2 text-journey-green active:scale-90"><Plus size={16}/></button>}
                    <button onClick={() => { setEditingItem(item); setParentId(item.parent_id); setForm({ text: item.text, imageUrl: item.imageUrl }); setShowModal(true); }} className="p-2 text-journey-blue active:scale-90"><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-journey-red active:scale-90"><Trash2 size={16}/></button>
                </div>
             </div>
             {item.imageUrl && activeTab === 'shopping' && (
                <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border-2 border-journey-cream cursor-zoom-in" onClick={() => setZoomImage(item.imageUrl)}>
                  <img src={item.imageUrl} className="w-full h-full object-cover" alt="Item" />
                </div>
             )}
         </div>
       </div>
       {!isChild && items.filter(i => i.parent_id === item.id).map(child => renderItem(child, true))}
    </div>
  );

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">{activeTab === 'todo' ? '待辦' : activeTab === 'packing' ? '行李' : '購物'}清單</h2>
        {syncing && <RefreshCw size={16} className="text-journey-green animate-spin opacity-30" />}
      </div>

      <div className="flex bg-white/60 backdrop-blur-xl rounded-3xl p-1.5 shadow-soft border-4 border-white">
        {(['todo', 'packing', 'shopping'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === tab ? 'bg-journey-green text-white shadow-md' : 'text-journey-brown/30'}`}>
            {tab === 'todo' ? '待辦' : tab === 'packing' ? '行李' : '購物'}
          </button>
        ))}
      </div>

      <div className="min-h-[300px]">
        {items.filter(i => !i.parent_id).map(item => renderItem(item))}
        <button onClick={() => { setParentId(null); setEditingItem(null); setForm({text: '', imageUrl: null}); setShowModal(true); }} className="w-full py-6 border-4 border-dashed border-journey-brown/10 rounded-[2.5rem] text-journey-brown/30 font-black flex items-center justify-center gap-2 bg-white/30 mt-4 active:scale-95 transition-all">
          <Plus size={24} /> 新增項目
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3rem] p-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowModal(false)} className="absolute right-10 top-10 text-journey-brown/20"><X size={24} /></button>
            <h3 className="text-xl font-black text-journey-brown italic uppercase tracking-tight">{editingItem ? '編輯項目' : '新增項目'}</h3>
            <div className="space-y-4">
              <input value={form.text} onChange={e => setForm({...form, text: e.target.value})} placeholder="記錄項目..." className="w-full bg-journey-cream rounded-[1.8rem] p-5 font-black focus:outline-none" />
              {activeTab === 'shopping' && (
                <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-journey-cream rounded-[1.8rem] border-4 border-dashed border-journey-brown/5 flex items-center justify-center cursor-pointer overflow-hidden relative">
                  {form.imageUrl ? <img src={form.imageUrl} className="w-full h-full object-cover" alt="Preview" /> : <Camera size={48} className="opacity-10" />}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setForm({...form, imageUrl: r.result as string}); r.readAsDataURL(f); } }} />
                </div>
              )}
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.2rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all mt-4"><Save size={20} /> 確認儲存</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningView;
