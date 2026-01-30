
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Circle, Plus, X, Trash2, Edit2, Save, Loader2, Camera, Maximize2, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';

const PlanningView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const tripId = tripConfig.id;
  const [activeTab, setActiveTab] = useState<'todo' | 'packing' | 'shopping'>(() => {
    return (localStorage.getItem(`plan_last_tab_${tripId}`) as any) || 'todo';
  });

  const [items, setItems] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [form, setForm] = useState({ text: '', imageUrl: null as string | null });
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 初始化資料 (僅在 Tab 切換或初次進入時執行)
  useEffect(() => {
    const saved = localStorage.getItem(`plan_${tripId}_${activeTab}`);
    setItems(saved ? JSON.parse(saved) : []);
    localStorage.setItem(`plan_last_tab_${tripId}`, activeTab);
    
    // 執行同步
    const fetchSync = async () => {
      if (!supabase || !tripId) return;
      setSyncing(true);
      try {
        const { data } = await supabase.from('planning_items')
          .select('*')
          .eq('trip_id', tripId)
          .eq('type', activeTab)
          .order('created_at', { ascending: true });
        
        if (data && data.length > 0) {
          setItems(data);
          localStorage.setItem(`plan_${tripId}_${activeTab}`, JSON.stringify(data));
        }
      } catch (e) { console.error(e); }
      finally { setSyncing(false); }
    };
    fetchSync();
  }, [activeTab, tripId]);

  const handleSave = async () => {
    if (!form.text.trim()) return;
    setSaving(true);
    
    const newItem = { 
      id: editingItem?.id || `pl-${Date.now()}`, 
      ...form, 
      parent_id: parentId,
      completed: editingItem?.completed || false, 
      type: activeTab, 
      trip_id: tripId, 
      created_at: editingItem?.created_at || new Date().toISOString() 
    };
    
    // 【重點】立即更新 UI 並關閉視窗，不等待後端
    const updated = editingItem ? items.map(i => i.id === editingItem.id ? newItem : i) : [...items, newItem];
    setItems(updated);
    localStorage.setItem(`plan_${tripId}_${activeTab}`, JSON.stringify(updated));
    setShowModal(false); 
    setEditingItem(null);
    setParentId(null);

    // 背景同步
    try {
      if (supabase) await supabase.from('planning_items').upsert(newItem);
    } catch (e) { console.error("Sync error", e); }
    finally { setSaving(false); }
  };

  const toggle = async (id: string, cur: boolean) => {
    const updated = items.map(i => i.id === id ? { ...i, completed: !cur } : i);
    setItems(updated);
    localStorage.setItem(`plan_${tripId}_${activeTab}`, JSON.stringify(updated));
    if (supabase) await supabase.from('planning_items').update({ completed: !cur }).eq('id', id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？')) return;
    // 【重點】立即從本地移除項目及其子項
    const filtered = items.filter(i => i.id !== id && i.parent_id !== id);
    setItems(filtered);
    localStorage.setItem(`plan_${tripId}_${activeTab}`, JSON.stringify(filtered));
    
    if (supabase) {
      // 背景執行刪除
      await supabase.from('planning_items').delete().eq('id', id);
      await supabase.from('planning_items').delete().eq('parent_id', id);
    }
  };

  const renderItem = (item: any, isChild = false) => (
    <div key={item.id} className={`${isChild ? 'ml-8 border-l-4 border-journey-brown/10 pl-4 py-2 mt-2 bg-white/40 rounded-r-2xl' : 'bg-white rounded-[2rem] p-5 shadow-soft border-4 border-white mb-4'} group relative ${item.completed ? 'opacity-40' : ''}`}>
       <div className="flex items-start gap-4">
         <div onClick={() => toggle(item.id, item.completed)} className="cursor-pointer transition-transform active:scale-90 pt-1">
            {item.completed ? <CheckCircle size={isChild ? 20 : 28} className="text-journey-green" /> : <Circle size={isChild ? 20 : 28} className="text-journey-brown/10" />}
         </div>
         <div className="flex-grow">
             <div className="flex items-center justify-between">
                <p className={`font-black text-journey-brown ${isChild ? 'text-sm' : 'text-lg'} ${item.completed ? 'line-through font-normal' : ''}`}>{item.text}</p>
                <div className="flex gap-2">
                    {!isChild && <button onClick={() => { setParentId(item.id); setEditingItem(null); setForm({text: '', imageUrl: null}); setShowModal(true); }} className="p-1.5 text-journey-green bg-journey-green/10 rounded-lg"><Plus size={14}/></button>}
                    <button onClick={() => { setEditingItem(item); setParentId(item.parent_id); setForm({ text: item.text, imageUrl: item.imageUrl }); setShowModal(true); }} className="p-1.5 text-journey-blue bg-journey-blue/10 rounded-lg"><Edit2 size={14}/></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-journey-red bg-journey-red/10 rounded-lg"><Trash2 size={14}/></button>
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
        <h2 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">{activeTab === 'todo' ? '待辦清單' : activeTab === 'packing' ? '行李清單' : '購物清單'}</h2>
        {syncing && <RefreshCw size={16} className="text-journey-green animate-spin" />}
      </div>

      <div className="flex bg-white/60 backdrop-blur-xl rounded-3xl p-1.5 shadow-soft border-4 border-white">
        {(['todo', 'packing', 'shopping'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === tab ? 'bg-journey-green text-white shadow-md -translate-y-0.5' : 'text-journey-brown/30'}`}>
            {tab === 'todo' ? 'TODO' : tab === 'packing' ? 'PACKING' : 'SHOPPING'}
          </button>
        ))}
      </div>

      <div className="min-h-[300px]">
        {items.filter(i => !i.parent_id).map(item => renderItem(item))}
        <button onClick={() => { setParentId(null); setEditingItem(null); setForm({text: '', imageUrl: null}); setShowModal(true); }} className="w-full py-6 border-4 border-dashed border-journey-brown/10 rounded-[2.5rem] text-journey-brown/30 font-black flex items-center justify-center gap-2 bg-white/30 mt-4 active:scale-95 transition-transform">
          <Plus size={24} /> 新增項目
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3rem] p-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowModal(false)} className="absolute right-10 top-10 text-journey-brown/20"><X /></button>
            <h3 className="text-xl font-black text-journey-brown italic">{editingItem ? '編輯' : parentId ? '新增子項' : '新增主項'}</h3>
            <div className="space-y-4">
              <input value={form.text} onChange={e => setForm({...form, text: e.target.value})} placeholder="輸入內容..." className="w-full bg-journey-cream rounded-2xl p-5 font-black focus:outline-none" />
              {activeTab === 'shopping' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-journey-brown/30 ml-3 uppercase tracking-widest">參考圖片</label>
                  <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-journey-cream rounded-2xl border-4 border-dashed border-journey-brown/5 flex items-center justify-center cursor-pointer overflow-hidden relative">
                    {form.imageUrl ? <img src={form.imageUrl} className="w-full h-full object-cover" alt="Preview" /> : <Camera size={48} className="opacity-10" />}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setForm({...form, imageUrl: r.result as string}); r.readAsDataURL(f); } }} />
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} 儲存
            </button>
          </div>
        </div>
      )}

      {zoomImage && (
        <div className="fixed inset-0 z-[300] bg-journey-brown/95 backdrop-blur-lg flex items-center justify-center p-6" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} className="max-w-full max-h-[80vh] rounded-[2rem] object-contain shadow-2xl" alt="Zoom" />
        </div>
      )}
    </div>
  );
};

export default PlanningView;
