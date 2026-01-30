
import React, { useState, useEffect, useRef } from 'react';
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tripId = tripConfig.id || 'default-trip';

  const fetchData = async () => {
    setLoading(true);
    // 1. 優先從本地快取
    const saved = localStorage.getItem(`planning_${tripId}_${activeTab}`);
    let localData = saved ? JSON.parse(saved) : [];
    setItems(localData);

    // 2. 異步同步雲端
    if (supabase && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('planning_items').select('*').eq('trip_id', tripId).eq('type', activeTab).order('created_at', { ascending: true });
        // 重要：雲端有資料才覆蓋
        if (data && data.length > 0) {
          setItems(data);
          localStorage.setItem(`planning_${tripId}_${activeTab}`, JSON.stringify(data));
        }
      } catch { console.warn("Planning sync failed"); }
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeTab, tripId]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedItems);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedItems(next);
  };

  const handleSave = async () => {
    if (!text) return;
    
    if (editingId) {
      const updated = items.map(i => i.id === editingId ? { ...i, text, image_url: previewImg || i.image_url } : i);
      setItems(updated);
      localStorage.setItem(`planning_${tripId}_${activeTab}`, JSON.stringify(updated));
      if (supabase && isSupabaseConfigured) {
        supabase.from('planning_items').update({ text, image_url: previewImg }).eq('id', editingId).then();
      }
    } else {
      const newItem = { 
        id: Date.now().toString(),
        trip_id: tripId, 
        text, completed: false, type: activeTab, 
        parent_id: parentId, 
        image_url: previewImg,
        created_at: new Date().toISOString()
      };
      const updated = [...items, newItem];
      setItems(updated);
      localStorage.setItem(`planning_${tripId}_${activeTab}`, JSON.stringify(updated));
      if (supabase && isSupabaseConfigured) {
        supabase.from('planning_items').insert([newItem]).then();
      }
    }
    resetModal();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('確定要刪除這個項目嗎？（這將同時刪除所有子項目喔！）')) return;
    
    const idsToDelete = [id];
    const findChildren = (pid: string) => {
      items.filter(i => i.parent_id === pid).forEach(c => {
        idsToDelete.push(c.id);
        findChildren(c.id);
      });
    };
    findChildren(id);

    const updated = items.filter(i => !idsToDelete.includes(i.id));
    setItems(updated);
    localStorage.setItem(`planning_${tripId}_${activeTab}`, JSON.stringify(updated));

    if (supabase && isSupabaseConfigured) {
      supabase.from('planning_items').delete().in('id', idsToDelete).then();
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    const updated = items.map(i => i.id === id ? { ...i, completed: !current } : i);
    setItems(updated);
    localStorage.setItem(`planning_${tripId}_${activeTab}`, JSON.stringify(updated));

    if (supabase && isSupabaseConfigured) {
      supabase.from('planning_items').update({ completed: !current }).eq('id', id).then();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImg(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetModal = () => { setText(''); setPreviewImg(null); setParentId(null); setEditingId(null); setShowAddModal(false); };

  const openEdit = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setEditingId(item.id);
    setText(item.text);
    setPreviewImg(item.image_url);
    setShowAddModal(true);
  };

  const renderItem = (item: any, depth = 0) => {
    const children = items.filter(child => child.parent_id === item.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedItems.has(item.id);

    return (
      <div key={item.id} className="space-y-2">
        <div className={`bg-white rounded-[2rem] p-5 flex items-center gap-4 shadow-soft-sm group/item transition-all ${item.completed ? 'opacity-40 grayscale' : 'hover:translate-x-1'}`} style={{ marginLeft: `${depth * 24}px` }}>
           <div onClick={() => toggleStatus(item.id, item.completed)} className="cursor-pointer shrink-0 active:scale-125 transition-transform">{item.completed ? <CheckCircle size={28} className="text-journey-green" /> : <Circle size={28} className="text-journey-brown/10" />}</div>
           <div className="flex-grow flex flex-col gap-1 overflow-hidden">
             <div className="flex items-center gap-2"><p className={`font-black text-journey-brown text-base truncate ${item.completed ? 'line-through' : ''}`}>{item.text}</p>{item.image_url && <ImageIcon size={14} className="text-journey-blue shrink-0 animate-pulse" />}</div>
             {item.image_url && (
               <div className="relative group/img cursor-pointer w-fit mt-2" onClick={() => setSelectedImage(item.image_url)}>
                 <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-journey-cream shadow-sm active:scale-95 transition-all"><img src={item.image_url} className="w-full h-full object-cover" /></div>
                 <div className="absolute inset-0 bg-black/10 rounded-2xl opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity"><Maximize2 size={16} className="text-white drop-shadow-md" /></div>
               </div>
             )}
           </div>
           <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
             <button onClick={(e) => openEdit(e, item)} className="p-2.5 text-journey-brown/30 hover:text-journey-green hover:bg-journey-green/5 rounded-xl transition-all"><Edit2 size={18} /></button>
             <button onClick={(e) => handleDelete(e, item.id)} className="p-2.5 text-journey-brown/30 hover:text-journey-red hover:bg-journey-red/5 rounded-xl transition-all"><Trash2 size={18} /></button>
             <button onClick={(e) => { e.stopPropagation(); setParentId(item.id); setEditingId(null); setShowAddModal(true); }} className="p-2.5 text-journey-green bg-journey-green/10 rounded-xl active:scale-90 transition-all"><Plus size={18} strokeWidth={3} /></button>
             {hasChildren && (<button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className="p-2.5 rounded-xl bg-journey-cream text-journey-brown/40 ml-1 active:scale-90 transition-all">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>)}
           </div>
        </div>
        {isExpanded && children.map(child => renderItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="flex bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-2 shadow-soft-sm border border-white/40">
        {(['todo', 'packing', 'shopping'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-5 flex flex-col items-center gap-1.5 rounded-[2rem] transition-all duration-500 ${activeTab === tab ? 'bg-journey-green text-white shadow-soft translate-y-[-2px]' : 'text-journey-brown/30 hover:text-journey-brown/50'}`}>
            {tab === 'todo' ? <ListTodo size={24} /> : tab === 'packing' ? <Briefcase size={24} /> : <ShoppingBag size={24} />}
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{tab === 'todo' ? '待辦' : tab === 'packing' ? '行李' : '購物'}</span>
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div>
        ) : (
          <><div className="space-y-4">{items.filter(i => !i.parent_id).length === 0 ? (<div className="text-center py-20 bg-white/20 rounded-[3rem] border-4 border-dashed border-journey-sand opacity-40"><p className="font-black text-journey-brown text-sm">還沒有任何計畫...✨<br/>點擊下方按鈕開始吧！</p></div>) : items.filter(i => !i.parent_id).map(item => renderItem(item))}</div><button onClick={() => { setParentId(null); setEditingId(null); setShowAddModal(true); }} className="w-full py-7 border-4 border-dashed border-journey-sand rounded-[2.5rem] text-journey-brown/30 text-sm font-black flex items-center justify-center gap-4 uppercase tracking-[0.2em] hover:bg-white/40 hover:border-journey-green/40 hover:text-journey-green transition-all active:scale-[0.98] mt-6"><Plus size={24} strokeWidth={3} /> 新增主項目</button></>
        )}
      </div>
      {selectedImage && (
        <div className="fixed inset-0 z-[150] bg-journey-brown/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-full max-h-[85vh] animate-in zoom-in-95 duration-500">
            <button className="absolute -top-14 right-0 p-4 bg-white/10 rounded-full text-white hover:bg-white/20 active:scale-90 transition-all"><X size={28} /></button>
            <img src={selectedImage} className="w-full h-auto max-h-[80vh] object-contain rounded-[3rem] border-8 border-white shadow-2xl" alt="Preview" /><p className="text-center text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mt-6">Tap anywhere to close</p>
          </div>
        </div>
      )}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8 animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex justify-between items-center">
              <div><h3 className="text-2xl font-black text-journey-brown uppercase tracking-tighter leading-none">{editingId ? 'Edit Item' : (parentId ? 'New Sub' : 'New Main')}</h3><p className="text-[10px] font-bold text-journey-brown/30 uppercase mt-2 tracking-widest">{activeTab === 'todo' ? 'Tasks' : activeTab === 'packing' ? 'Packing' : 'Shopping List'}</p></div>
              <button onClick={resetModal} className="p-3 bg-journey-cream rounded-full text-journey-brown/30 active:scale-90 transition-all"><X size={20} /></button>
            </div>
            {activeTab === 'shopping' && (
              <div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-journey-cream rounded-[2.5rem] border-4 border-dashed border-journey-sand flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all hover:border-journey-green/40">
                 {previewImg ? (<div className="w-full h-full relative"><img src={previewImg} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={32} className="text-white" /></div></div>) : (<div className="text-center group-hover:scale-110 transition-transform"><Camera size={32} className="mx-auto text-journey-sand mb-3" /><p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Add Reference Photo</p></div>)}
                 <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
              </div>
            )}
            <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-4">Content</label><input value={text} onChange={(e) => setText(e.target.value)} placeholder="想要紀錄什麼呢..." className="w-full bg-journey-cream rounded-[2rem] p-6 text-journey-brown font-black focus:outline-none ring-journey-green/30 focus:ring-8 transition-all" autoFocus /></div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg active:scale-95 border-b-4 border-black/10 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3">{editingId ? <Send size={20} /> : <Plus size={20} strokeWidth={3} />}{editingId ? 'Update Item' : 'Add to List'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningView;
