
import React, { useState, useEffect } from 'react';
import { Plane, Hotel, Ticket, Plus, X, Trash2, Edit2, Save, Hash } from 'lucide-react';
import { supabase } from '../supabase';

const BookingsView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const tripId = tripConfig.id;
  const localKey = `book_${tripId}`;
  
  // 1. 初始化立即從本機讀取，確保不消失
  const [items, setItems] = useState<any[]>(() => {
    const saved = localStorage.getItem(localKey);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [form, setForm] = useState({ type: 'flight', title: '', from: '', to: '', time: '', flightNo: '' });

  // 2. 背景靜默同步雲端
  useEffect(() => {
    const fetchSync = async () => {
      if (!supabase || !tripId) return;
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false });
        
        // 只有在雲端有資料時才更新，避免清空本機
        if (!error && data && data.length > 0) { 
          setItems(data); 
          localStorage.setItem(localKey, JSON.stringify(data)); 
        }
      } catch (e) {
        console.warn("Sync Offline - Using Local Cache");
      }
    };
    fetchSync();
  }, [tripId, localKey]);

  const handleSave = async () => {
    const payload = { 
      id: editingItem?.id || `bk-${Date.now()}`,
      ...form, 
      title: form.type === 'flight' ? `${form.from || '---'} ✈️ ${form.to || '---'}` : form.title,
      trip_id: tripId, 
      created_at: editingItem?.created_at || new Date().toISOString()
    };
    
    // 【關鍵】立即寫入本機，確保切換頁面不消失
    const updated = editingItem 
      ? items.map(b => b.id === editingItem.id ? payload : b) 
      : [payload, ...items];
    
    setItems(updated);
    localStorage.setItem(localKey, JSON.stringify(updated));
    
    setShowModal(false); 
    setEditingItem(null);

    // 背景同步至雲端 (修復 .catch 報錯)
    if (supabase) {
      try {
        await supabase.from('bookings').upsert(payload);
      } catch (e) {
        console.error("Cloud sync error:", e);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除此預訂？')) return;
    
    // 【關鍵】立即從本機與 State 移除
    const filtered = items.filter(b => b.id !== id);
    setItems(filtered);
    localStorage.setItem(localKey, JSON.stringify(filtered));
    
    if (supabase) {
      try {
        await supabase.from('bookings').delete().eq('id', id);
      } catch (e) {
        console.error("Cloud delete error:", e);
      }
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">機票與預訂</h2>
        <button 
          onClick={() => { 
            setEditingItem(null); 
            setForm({ type: 'flight', title: '', from: '', to: '', time: '', flightNo: '' }); 
            setShowModal(true); 
          }} 
          className="w-12 h-12 bg-journey-green text-white rounded-2xl shadow-soft flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="space-y-8">
        {items.length === 0 && (
          <div className="text-center py-20 opacity-20 font-black italic">尚無預訂資料</div>
        )}
        {items.map((item) => (
          <div key={item.id} className="relative group animate-in slide-in-from-bottom-4">
            {item.type === 'flight' ? (
              <div className="bg-white rounded-[3rem] shadow-soft overflow-hidden border-4 border-white flex flex-col">
                <div className="p-8 bg-journey-blue/5 flex justify-between items-center relative overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 scale-150 rotate-12"><Plane size={120}/></div>
                  <div className="text-center z-10">
                    <p className="text-[10px] font-black opacity-30 tracking-widest">FROM</p>
                    <h4 className="text-4xl font-black text-journey-blue leading-none">{item.from || '---'}</h4>
                  </div>
                  <Plane className="text-journey-blue/20 rotate-90 z-10" size={32} />
                  <div className="text-center z-10">
                    <p className="text-[10px] font-black opacity-30 tracking-widest">TO</p>
                    <h4 className="text-4xl font-black text-journey-blue leading-none">{item.to || '---'}</h4>
                  </div>
                </div>
                <div className="p-8 bg-white flex justify-between items-end relative border-t-4 border-dashed border-journey-blue/10">
                   <div className="space-y-4">
                      {item.flightNo && (
                        <div className="flex items-center gap-2 bg-journey-blue/10 px-3 py-1 rounded-full w-fit">
                          <Hash size={12} className="text-journey-blue" />
                          <span className="text-[11px] font-black text-journey-blue uppercase">{item.flightNo}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-black opacity-30 tracking-widest">DEPARTURE</p>
                        <p className="font-black text-journey-brown text-xl leading-none">
                          {item.time ? new Date(item.time).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '--:--'}
                        </p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => { setEditingItem(item); setForm(item); setShowModal(true); }} className="p-4 bg-journey-blue/5 text-journey-blue rounded-[1.5rem] active:scale-90 transition-all hover:bg-journey-blue/10"><Edit2 size={18}/></button>
                     <button onClick={() => handleDelete(item.id)} className="p-4 bg-journey-red/5 text-journey-red rounded-[1.5rem] active:scale-90 transition-all hover:bg-journey-red/10"><Trash2 size={18}/></button>
                   </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-7 shadow-soft border-4 border-white flex items-center justify-between group hover:border-journey-green transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-journey-cream rounded-2xl flex items-center justify-center text-journey-brown/30 shadow-inner">
                    {item.type === 'hotel' ? <Hotel size={28}/> : <Ticket size={28}/>}
                  </div>
                  <div>
                    <h4 className="font-black text-journey-brown text-lg leading-tight">{item.title}</h4>
                    <p className="text-[10px] opacity-40 font-black uppercase tracking-widest mt-1">
                      {item.time ? new Date(item.time).toLocaleString() : '未排定時間'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 border-l-4 border-dashed border-journey-cream pl-5">
                  <button onClick={() => { setEditingItem(item); setForm(item); setShowModal(true); }} className="text-journey-blue p-2 active:scale-90 transition-transform"><Edit2 size={20}/></button>
                  <button onClick={() => handleDelete(item.id)} className="text-journey-red p-2 active:scale-90 transition-transform"><Trash2 size={20}/></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative animate-in slide-in-from-bottom-10">
            <button onClick={() => setShowModal(false)} className="absolute right-10 top-10 text-journey-brown/20 hover:text-journey-brown transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">預訂詳情</h3>
            
            <div className="flex gap-2 p-1.5 bg-journey-cream rounded-[1.8rem]">
              {(['flight', 'hotel', 'ticket'] as const).map(t => (
                <button 
                  key={t} 
                  onClick={() => setForm({...form, type: t})} 
                  className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${form.type === t ? 'bg-white text-journey-brown shadow-sm scale-[1.02]' : 'text-journey-brown/20'}`}
                >
                  {t === 'flight' ? '機票' : t === 'hotel' ? '住宿' : '門票'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
               {form.type === 'flight' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-journey-brown/30 ml-3 uppercase">Departure</label>
                        <input placeholder="HND" value={form.from} onChange={e => setForm({...form, from: e.target.value.toUpperCase()})} className="w-full bg-journey-cream p-4 rounded-2xl font-black uppercase text-center focus:outline-none focus:ring-2 ring-journey-blue" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-journey-brown/30 ml-3 uppercase">Arrival</label>
                        <input placeholder="HKG" value={form.to} onChange={e => setForm({...form, to: e.target.value.toUpperCase()})} className="w-full bg-journey-cream p-4 rounded-2xl font-black uppercase text-center focus:outline-none focus:ring-2 ring-journey-blue" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-journey-brown/30 ml-3 uppercase">Flight No.</label>
                      <input placeholder="例如：JL029" value={form.flightNo} onChange={e => setForm({...form, flightNo: e.target.value.toUpperCase()})} className="w-full bg-journey-cream p-5 rounded-[1.5rem] font-black focus:outline-none focus:ring-2 ring-journey-blue" />
                    </div>
                  </div>
               ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-journey-brown/30 ml-3 uppercase">名稱</label>
                    <input placeholder="輸入酒店或景點名稱" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[1.5rem] font-black focus:outline-none" />
                  </div>
               )}
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-journey-brown/30 ml-3 uppercase">時間點</label>
                  <input type="datetime-local" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[1.5rem] font-black text-xs focus:outline-none" />
               </div>
            </div>

            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.2rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all mt-2">
              <Save size={22} />
              <span className="text-lg">儲存預訂</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsView;
