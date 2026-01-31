
import React, { useState, useEffect } from 'react';
import { CATEGORY_ICONS, THEME_COLORS } from '../constants';
import { Plus, X, Trash2, Save, Edit3, Map, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';

const ScheduleView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const tripId = tripConfig.id;
  const [selectedDay, setSelectedDay] = useState(() => Number(localStorage.getItem(`last_day_${tripId}`)) || 0);
  const [items, setItems] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [form, setForm] = useState({ title: '', time: '12:00', category: 'attraction' });

  // 1. 生命週期：優先載入本機快取
  useEffect(() => {
    const localKey = `sched_${tripId}_day${selectedDay}`;
    const localData = localStorage.getItem(localKey);
    
    if (localData) {
      setItems(JSON.parse(localData));
    } else {
      setItems([]);
    }
    
    localStorage.setItem(`last_day_${tripId}`, selectedDay.toString());
    
    // 2. 背景同步
    const fetchSync = async () => {
      if (!supabase || !tripId) return;
      setSyncing(true);
      try {
        const { data, error } = await supabase
          .from('schedules')
          .select('*')
          .eq('trip_id', tripId)
          .eq('day_index', selectedDay)
          .order('time', { ascending: true });
        
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
  }, [selectedDay, tripId]);

  const handleSave = async () => {
    if (!form.title) return;
    
    const payload = {
      id: editingItem?.id || `sc-${Date.now()}`,
      title: form.title,
      time: form.time,
      category: form.category,
      location: form.title,
      day_index: selectedDay,
      trip_id: tripId,
      created_at: editingItem?.created_at || new Date().toISOString()
    };

    // 強制立即更新本機
    const newItems = editingItem 
      ? items.map(i => i.id === editingItem.id ? payload : i) 
      : [...items, payload];
    
    const sorted = newItems.sort((a, b) => a.time.localeCompare(b.time));
    setItems(sorted);
    localStorage.setItem(`sched_${tripId}_day${selectedDay}`, JSON.stringify(sorted));
    
    setShowForm(false);
    setEditingItem(null);

    // 背景同步 (修復報錯)
    if (supabase) {
      try {
        await supabase.from('schedules').upsert(payload);
      } catch (e) {
        console.error("Supabase upsert failed", e);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除此行程？')) return;
    
    const filtered = items.filter(i => i.id !== id);
    setItems(filtered);
    localStorage.setItem(`sched_${tripId}_day${selectedDay}`, JSON.stringify(filtered));
    
    if (supabase) {
      try {
        await supabase.from('schedules').delete().eq('id', id);
      } catch (e) {
        console.error("Supabase delete failed", e);
      }
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex gap-3 overflow-x-auto hide-scrollbar py-4 px-1">
        {[0, 1, 2, 3, 4, 5, 6].map(idx => (
          <button 
            key={idx} 
            onClick={() => setSelectedDay(idx)} 
            className={`flex-shrink-0 w-16 h-20 rounded-3xl flex flex-col items-center justify-center transition-all ${selectedDay === idx ? 'bg-journey-green text-white shadow-lg -translate-y-2' : 'bg-white text-journey-brown/30'}`}
          >
            <span className="text-[10px] font-black uppercase">Day</span>
            <span className="text-2xl font-black leading-none">{idx + 1}</span>
          </button>
        ))}
      </div>

      <div className="space-y-6 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-1.5 before:bg-journey-cream before:rounded-full">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 relative animate-in slide-in-from-left-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center z-10 border-4 border-white shadow-soft-sm shrink-0 ${THEME_COLORS[item.category as keyof typeof THEME_COLORS] || 'bg-journey-sand'} text-white`}>
              {CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS]}
            </div>
            <div className="bg-white rounded-[2rem] p-6 flex-grow shadow-soft border-4 border-white relative group">
              <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title)}`, '_blank')} className="absolute right-4 top-4 p-2.5 bg-journey-blue/10 text-journey-blue rounded-xl active:scale-90 transition-transform"><Map size={18} /></button>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-black text-journey-brown/40 bg-journey-cream px-3 py-1 rounded-full">{item.time}</span>
              </div>
              <h4 className="font-black text-journey-brown text-lg pr-10 leading-tight">{item.title}</h4>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setEditingItem(item); setForm({ title: item.title, time: item.time, category: item.category }); setShowForm(true); }} className="text-[10px] font-black text-journey-blue uppercase bg-journey-blue/5 px-4 py-2 rounded-xl flex items-center gap-1.5 active:scale-95"><Edit3 size={12}/> 編輯</button>
                <button onClick={() => handleDelete(item.id)} className="text-[10px] font-black text-journey-red uppercase bg-journey-red/5 px-4 py-2 rounded-xl flex items-center gap-1.5 active:scale-95"><Trash2 size={12}/> 刪除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => { setEditingItem(null); setForm({ title: '', time: '09:00', category: 'attraction' }); setShowForm(true); }} className="fixed bottom-32 right-6 w-16 h-16 bg-journey-green text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-90 transition-transform"><Plus size={32} /></button>

      {showForm && (
        <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3rem] p-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setShowForm(false)} className="absolute right-10 top-10 text-journey-brown/20"><X size={24} /></button>
            <h3 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">{editingItem ? '修改行程' : '新增行程'}</h3>
            <div className="space-y-4">
              <input placeholder="地點" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none" />
              <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none" />
              <div className="flex gap-2 overflow-x-auto p-1 hide-scrollbar">
                {Object.keys(CATEGORY_ICONS).map(cat => (
                  <button key={cat} onClick={() => setForm({...form, category: cat})} className={`p-5 rounded-2xl shrink-0 transition-all border-4 ${form.category === cat ? (THEME_COLORS[cat as keyof typeof THEME_COLORS] || 'bg-journey-sand') + ' text-white border-white' : 'bg-journey-cream text-journey-brown/20 border-transparent'}`}>{CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS]}</button>
                ))}
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all mt-4"><Save size={20} /> 確認儲存</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
