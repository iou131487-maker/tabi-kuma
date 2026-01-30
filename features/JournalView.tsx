
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Heart, MessageCircle, X, Send, Loader2, Image as ImageIcon, Sparkles, Trash2, MapPin } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { GoogleGenAI } from "@google/genai";

const JournalView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiInspiration, setAiInspiration] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tripId = tripConfig.id;

  const fetchJournals = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    
    // 1. 本地讀取
    const localKey = `journals_${tripId}`;
    const saved = localStorage.getItem(localKey);
    if (saved) setJournals(JSON.parse(saved));

    // 2. 雲端同步
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('journals')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          setJournals(data);
          localStorage.setItem(localKey, JSON.stringify(data));
        }
      } catch (err) { console.error("Journal Sync Error"); }
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => { fetchJournals(); }, [fetchJournals]);

  const handleSave = async () => {
    if (!content.trim()) return;

    const newJournal = {
      id: Date.now().toString(),
      content,
      location,
      images: previewUrl ? [previewUrl] : [],
      trip_id: tripId,
      created_at: new Date().toISOString()
    };

    // 優先同步雲端
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from('journals').insert([newJournal]);
      if (error) return alert("日誌發佈失敗");
    }

    // 更新本地與 UI
    const localKey = `journals_${tripId}`;
    const updated = [newJournal, ...journals];
    setJournals(updated);
    localStorage.setItem(localKey, JSON.stringify(updated));

    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這篇日誌嗎？')) return;
    
    if (supabase && isSupabaseConfigured) {
      await supabase.from('journals').delete().eq('id', id);
    }

    const localKey = `journals_${tripId}`;
    const updated = journals.filter(j => j.id !== id);
    setJournals(updated);
    localStorage.setItem(localKey, JSON.stringify(updated));
  };

  const resetForm = () => { setContent(''); setLocation(''); setPreviewUrl(null); setShowAddModal(false); };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-black text-journey-brown">旅行日誌</h2>
          <p className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-widest mt-1">Collecting Memories</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-14 h-14 bg-journey-red text-white rounded-3xl shadow-soft flex items-center justify-center active:scale-90 transition-all border-b-4 border-black/10">
          <Camera size={24} />
        </button>
      </div>

      <div className="space-y-8">
        {loading && journals.length === 0 ? (
          <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div>
        ) : journals.length === 0 ? (
          <div className="bg-white/40 rounded-[3rem] p-16 text-center border-4 border-dashed border-journey-sand opacity-50"><p className="text-sm font-black text-journey-brown">還沒有任何紀錄喔 ✨</p></div>
        ) : (
          journals.map((item) => (
            <div key={item.id} className="bg-white rounded-[3rem] overflow-hidden shadow-soft border-4 border-white animate-in slide-in-from-bottom-8">
              {item.images && item.images[0] && (<div className="aspect-video w-full overflow-hidden shadow-inner"><img src={item.images[0]} className="w-full h-full object-cover" /></div>)}
              <div className="p-8 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-journey-blue"><MapPin size={14} /><span className="text-[10px] font-black uppercase tracking-widest">{item.location || 'Unknown'}</span></div>
                  <button onClick={() => handleDelete(item.id)} className="text-journey-brown/10 hover:text-journey-red"><Trash2 size={16}/></button>
                </div>
                <p className="text-journey-brown font-bold leading-relaxed whitespace-pre-wrap italic">{item.content}</p>
                <div className="flex items-center justify-between pt-4 border-t border-journey-cream"><span className="text-[10px] font-black text-journey-brown/20 uppercase">{new Date(item.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[110] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center"><h3 className="text-xl font-black text-journey-brown italic">New Memory</h3><button onClick={resetForm} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button></div>
            <div onClick={() => fileInputRef.current?.click()} className="aspect-video bg-journey-cream rounded-[2.5rem] border-4 border-dashed border-journey-sand flex flex-col items-center justify-center cursor-pointer overflow-hidden shadow-inner">{previewUrl ? (<img src={previewUrl} className="w-full h-full object-cover" />) : (<Camera size={32} className="text-journey-sand opacity-30" />)}<input type="file" ref={fileInputRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setPreviewUrl(r.result as string); r.readAsDataURL(f); } }} accept="image/*" /></div>
            <div className="space-y-4"><input placeholder="地點" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-journey-cream rounded-2xl p-4 text-sm font-black focus:outline-none shadow-inner" /><textarea placeholder="這一刻的心情是..." value={content} onChange={e => setContent(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-sm font-bold min-h-[150px] focus:outline-none shadow-inner resize-none" /></div>
            <button onClick={handleSave} className="w-full bg-journey-red text-white font-black py-5 rounded-[2.5rem] shadow-lg flex items-center justify-center gap-2"><Send size={18} /> 發佈日誌</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalView;
