
import React, { useState, useEffect, useCallback } from 'react';
import { Plane, Hotel, Ticket, Plus, X, Loader2, Trash2, Edit2, Save } from 'lucide-react';
import { supabase } from '../supabase';

const BookingsView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const tripId = tripConfig.id;
  const [items, setItems] = useState<any[]>(() => {
    const saved = localStorage.getItem(`book_${tripId}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [form, setForm] = useState({ type: 'flight', title: '', from: '', to: '', time: '' });

  useEffect(() => {
    const fetchSync = async () => {
      if (!supabase || !tripId) return;
      const { data } = await supabase.from('bookings').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
      if (data && data.length > 0) { 
          setItems(data); 
          localStorage.setItem(`book_${tripId}`, JSON.stringify(data)); 
      }
    };
    fetchSync();
  }, [tripId]);

  const handleSave = async () => {
    const payload = { 
      id: editingItem?.id || `bk-${Date.now()}`,
      ...form, 
      title: form.type === 'flight' ? `${form.from || '---'} ✈️ ${form.to || '---'}` : form.title,
      trip_id: tripId, created_at: editingItem?.created_at || new Date().toISOString()
    };
    
    // 立即更新與關閉
    const updated = editingItem ? items.map(b => b.id === editingItem.id ? payload : b) : [payload, ...items];
    setItems(updated);
    localStorage.setItem(`book_${tripId}`, JSON.stringify(updated));
    setShowModal(false); 
    setEditingItem(null);

    // 背景同步
    try {
      if (supabase) await supabase.from('bookings').upsert(payload);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除此預訂？')) return;
    const filtered = items.filter(b => b.id !== id);
    setItems(filtered);
    localStorage.setItem(`book_${tripId}`, JSON.stringify(filtered));
    if (supabase) await supabase.from('bookings').delete().eq('id', id);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">機票與預訂</h2>
        <button onClick={() => { setEditingItem(null); setForm({ type: 'flight', title: '', from: '', to: '', time: '' }); setShowModal(true); }} className="w-12 h-12 bg-journey-green text-white rounded-2xl shadow-soft flex items-center justify-center active:scale-90"><Plus size={24} /></button>
      </div>

      <div className="space-y-10">
        {items.map((item) => (
          <div key={item.id} className="relative group animate-in slide-in-from-bottom-5">
            {item.type === 'flight' ? (
              <div className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden border-4 border-white flex flex-col relative transition-all hover:-translate-y-1">
                <div className="absolute -left-5 top-[60%] -translate-y-1/2 w-10 h-10 bg-[#FFF9C4] rounded-full z-10 border-r-4 border-white box-content"></div>
                <div className="absolute -right-5 top-[60%] -translate-y-1/2 w-10 h-10 bg-[#FFF9C4] rounded-full z-10 border-l-4 border-white box-content"></div>
                <div className="absolute left-4 right-4 top-[60%] -translate-y-1/2 border-b-4 border-dashed border-journey-cream z-0"></div>

                <div className="p-8 bg-journey-blue/5 flex justify-between items-center relative z-10">
                  <div className="text-center"><p className="text-[10px] font-black opacity-30 uppercase tracking-widest">FROM</p><h4 className="text-4xl font-black text-journey-blue leading-none tracking-tighter">{item.from || '---'}</h4></div>
                  <Plane className="text-journey-blue/20 rotate-90" size={32} />
                  <div className="text-center"><p className="text-[10px] font-black opacity-30 uppercase tracking-widest">TO</p><h4 className="text-4xl font-black text-journey-blue leading-none tracking-tighter">{item.to || '---'}</h4></div>
                </div>
                
                <div className="p-8 pt-10 flex justify-between items-end bg-white relative z-10">
                   <div>
                       <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">DEPARTURE</p>
                       <p className="font-black text-journey-brown text-xl">{item.time ? new Date(item.time).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '--:--'}</p>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => { setEditingItem(item); setForm(item); setShowModal(true); }} className="p-3 bg-journey-blue/10 text-journey-blue rounded-2xl active:scale-90 transition-all"><Edit2 size={16}/></button>
                     <button onClick={() => handleDelete(item.id)} className="p-3 bg-journey-red/10 text-journey-red rounded-2xl active:scale-90 transition-all"><Trash2 size={16}/></button>
                   </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-7 shadow-soft border-4 border-white flex items-center justify-between transition-all hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-journey-cream rounded-2xl flex items-center justify-center text-journey-brown/40">{item.type === 'hotel' ? <Hotel /> : <Ticket />}</div>
                  <div><h4 className="font-black text-journey-brown text-lg">{item.title}</h4><p className="text-[10px] opacity-40 font-bold mt-1">{item.time ? new Date(item.time).toLocaleString() : '未定時間'}</p></div>
                </div>
                <div className="flex flex-col gap-2 border-l-2 border-dashed border-journey-cream pl-4">
                  <button onClick={() => { setEditingItem(item); setForm(item); setShowModal(true); }} className="text-journey-blue p-1"><Edit2 size={18}/></button>
                  <button onClick={() => handleDelete(item.id)} className="text-journey-red p-1"><Trash2 size={18}/></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-journey-brown italic">預訂詳情</h3>
            <div className="flex gap-2 p-1 bg-journey-cream rounded-[1.5rem]">
              {(['flight', 'hotel', 'ticket'] as const).map(t => (
                <button key={t} onClick={() => setForm({...form, type: t})} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${form.type === t ? 'bg-white text-journey-brown shadow-sm scale-105' : 'text-journey-brown/20'}`}>{t}</button>
              ))}
            </div>
            {form.type === 'flight' ? (
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="出發" value={form.from} onChange={e => setForm({...form, from: e.target.value.toUpperCase()})} className="bg-journey-cream p-4 rounded-2xl font-black uppercase text-center focus:outline-none" />
                <input placeholder="到達" value={form.to} onChange={e => setForm({...form, to: e.target.value.toUpperCase()})} className="bg-journey-cream p-4 rounded-2xl font-black uppercase text-center focus:outline-none" />
                <input type="datetime-local" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="col-span-2 bg-journey-cream p-4 rounded-2xl font-black text-xs" />
              </div>
            ) : (
              <div className="space-y-4">
                <input placeholder="預訂名稱" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[1.5rem] font-black focus:outline-none" />
                <input type="datetime-local" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[1.5rem] font-black text-xs" />
              </div>
            )}
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 active:scale-95">
              <Save size={20} /> 儲存資料
            </button>
            <button onClick={() => setShowModal(false)} className="w-full text-journey-brown/20 font-black py-2">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsView;
