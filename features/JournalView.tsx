
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, Loader2, Trash2, MapPin, Save, Edit3 } from 'lucide-react';
import { supabase } from '../supabase';

const JournalView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const tripId = tripConfig.id;
  const [journals, setJournals] = useState<any[]>(() => {
    const saved = localStorage.getItem(`jrnl_${tripId}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [form, setForm] = useState({ content: '', location: '', imageUrl: null as string | null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSync = async () => {
      if (!supabase || !tripId) return;
      const { data } = await supabase.from('journals').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
      if (data && data.length > 0) { 
          setJournals(data); 
          localStorage.setItem(`jrnl_${tripId}`, JSON.stringify(data)); 
      }
    };
    fetchSync();
  }, [tripId]);

  const handleSave = async () => {
    if (!form.content.trim()) return;
    
    const payload = {
      id: editingItem?.id || `jr-${Date.now()}`,
      ...form, images: form.imageUrl ? [form.imageUrl] : [],
      trip_id: tripId, created_at: editingItem?.created_at || new Date().toISOString()
    };
    
    // 立即更新與關閉
    const updated = editingItem ? journals.map(j => j.id === editingItem.id ? payload : j) : [payload, ...journals];
    setJournals(updated);
    localStorage.setItem(`jrnl_${tripId}`, JSON.stringify(updated));
    setShowModal(false); 
    setEditingItem(null); 
    setForm({ content: '', location: '', imageUrl: null });

    // 背景同步
    try {
      if (supabase) await supabase.from('journals').upsert(payload);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除回憶？')) return;
    const filtered = journals.filter(j => j.id !== id);
    setJournals(filtered);
    localStorage.setItem(`jrnl_${tripId}`, JSON.stringify(filtered));
    if (supabase) await supabase.from('journals').delete().eq('id', id);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">Journal</h2>
        <button onClick={() => { setEditingItem(null); setForm({ content: '', location: '', imageUrl: null }); setShowModal(true); }} className="w-12 h-12 bg-journey-red text-white rounded-2xl shadow-soft flex items-center justify-center active:scale-90 transition-transform"><Camera size={24} /></button>
      </div>

      <div className="space-y-12">
        {journals.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-[2.5rem] shadow-soft border-4 border-white animate-in zoom-in-95">
            {item.images?.[0] && (<div className="aspect-square bg-journey-cream rounded-[1.5rem] overflow-hidden border-2 border-journey-cream mb-6"><img src={item.images[0]} className="w-full h-full object-cover" alt="Memory" /></div>)}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-journey-blue font-black uppercase text-[10px] tracking-widest bg-journey-blue/10 px-3 py-1 rounded-full"><MapPin size={12} /><span>{item.location || 'Somewhere'}</span></div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(item); setForm({ content: item.content, location: item.location, imageUrl: item.images[0] }); setShowModal(true); }} className="p-2 text-journey-blue"><Edit3 size={18}/></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-journey-red"><Trash2 size={18}/></button>
                </div>
              </div>
              <p className="text-journey-brown font-bold leading-relaxed italic text-lg">{item.content}</p>
              <p className="text-[10px] font-black opacity-20 uppercase tracking-widest">{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3rem] p-10 shadow-2xl space-y-6 max-h-[95vh] overflow-y-auto relative">
            <button onClick={() => setShowModal(false)} className="absolute right-10 top-10 text-journey-brown/20"><X /></button>
            <h3 className="text-xl font-black text-journey-brown italic">New Memory</h3>
            <div onClick={() => fileInputRef.current?.click()} className="aspect-square bg-journey-cream rounded-3xl border-4 border-dashed border-journey-sand flex flex-col items-center justify-center cursor-pointer overflow-hidden relative">
              {form.imageUrl ? <img src={form.imageUrl} className="w-full h-full object-cover" alt="Preview" /> : <Camera size={48} className="opacity-10" />}
              <input type="file" ref={fileInputRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setForm({...form, imageUrl: r.result as string}); r.readAsDataURL(f); } }} />
            </div>
            <input placeholder="地點" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-journey-cream rounded-2xl p-4 font-black focus:outline-none" />
            <textarea placeholder="心情感言..." value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="w-full bg-journey-cream rounded-2xl p-5 font-bold min-h-[120px] focus:outline-none resize-none shadow-inner" />
            <button onClick={handleSave} className="w-full bg-journey-red text-white font-black py-6 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 active:scale-95">
              <Save size={20} /> 發佈回憶
            </button>
            <button onClick={() => setShowModal(false)} className="w-full text-journey-brown/20 font-black py-2">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalView;
