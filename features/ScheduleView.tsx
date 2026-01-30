
import React, { useState, useEffect, useCallback } from 'react';
import { CATEGORY_ICONS, THEME_COLORS } from '../constants';
import { Plus, X, Trash2, Compass, Save, Loader2, Edit3, Map } from 'lucide-react';
import { supabase } from '../supabase';

const ScheduleView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const tripId = tripConfig.id;
  const [selectedDay, setSelectedDay] = useState(() => Number(localStorage.getItem(`last_day_${tripId}`)) || 0);
  const [items, setItems] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [form, setForm] = useState({ title: '', time: '12:00', category: 'attraction' });

  // 僅在切換天數時從雲端拉取一次，避免頻繁同步導致刪除回溯
  useEffect(() => {
    const saved = localStorage.getItem(`sched_${tripId}_${selectedDay}`);
    if (saved) setItems(JSON.parse(saved));
    localStorage.setItem(`last_day_${tripId}`, selectedDay.toString());
    
    const fetchSync = async () => {
      if (!supabase || !tripId) return;
      setSyncing(true);
      const { data } = await supabase.from('schedules').select('*').eq('trip_id', tripId).eq('day_index', selectedDay).order('time');
      if (data && data.length > 0) {
        setItems(data);
        localStorage.setItem(`sched_${tripId}_${selectedDay}`, JSON.stringify(data));
      }
      setSyncing(false);
    };
    fetchSync();
  }, [selectedDay, tripId]);

  const handleSave = async () => {
    if (!form.title) return;
    
    const payload = {
      id: editingItem?.id || `sc-${Date.now()}`,
      ...form, location: form.title, day_index: selectedDay, trip_id: tripId
    };

    // 1. 立即更新 UI (樂觀更新)
    const newItems = editingItem ? items.map(i => i.id === editingItem.id ? payload : i) : [...items, payload];
    const sorted = newItems.sort((a,b) => a.time.localeCompare(b.time));
    setItems(sorted);
    localStorage.setItem(`sched_${tripId}_${selectedDay}`, JSON.stringify(sorted));
    
    // 2. 立即關閉視窗 (不等待非同步)
    setShowForm(false); 
    setEditingItem(null);

    // 3. 背景同步
    try {
      if (supabase) await supabase.from('schedules').upsert(payload);
    } catch (e) { console.error("Sync failed", e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除此行程？')) return;
    
    // 1. 立即從 UI 移除
    const filtered = items.filter(i => i.id !== id);
    setItems(filtered);
    localStorage.setItem(`sched_${tripId}_${selectedDay}`, JSON.stringify(filtered));
    
    // 2. 背景刪除
    if (supabase) await supabase.from('schedules').delete().eq('id', id);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex gap-3 overflow-x-auto hide-scrollbar py-2">
        {[0,1,2,3,4,5,6].map(idx => (
          <button key={idx} onClick={() => setSelectedDay(idx)} className={`flex-shrink-0 w-14 h-16 rounded-2xl flex flex-col items-center justify-center transition-all ${selectedDay === idx ? 'bg-journey-green text-white shadow-lg -translate-y-1' : 'bg-white text-journey-brown/30'}`}>
            <span className="text-[8px] font-black uppercase">Day</span>
            <span className="text-lg font-black leading-none">{idx + 1}</span>
          </button>
        ))}
      </div>

      <div className="space-y-6 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-1 before:bg-journey-cream">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 relative group animate-in slide-in-from-left-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center z-10 border-4 border-white shadow-soft-sm shrink-0 ${THEME_COLORS[item.category as keyof typeof THEME_COLORS] || 'bg-journey-sand'} text-white`}>
              {CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS]}
            </div>
            <div className="bg-white rounded-[2rem] p-5 flex-grow shadow-soft relative">
              <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title)}`, '_blank')} className="absolute right-4 top-4 p-2 bg-journey-blue/10 text-journey-blue rounded-xl"><Map size={18} /></button>
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-black text-journey-brown/40 bg-journey-cream px-2 py-0.5 rounded-full">{item.time}</span>
              </div>
              <h4 className="font-black text-journey-brown text-lg pr-10">{item.title}</h4>
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setEditingItem(item); setForm({ title: item.title, time: item.time, category: item.category }); setShowForm(true); }} className="text-[10px] font-black text-journey-blue uppercase bg-journey-blue/5 px-3 py-1.5 rounded-lg flex items-center gap-1"><Edit3 size={10}/> 編輯</button>
                <button onClick={() => handleDelete(item.id)} className="text-[10px] font-black text-journey-red uppercase bg-journey-red/5 px-3 py-1.5 rounded-lg flex items-center gap-1"><Trash2 size={10}/> 刪除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => { setEditingItem(null); setForm({ title: '', time: '09:00', category: 'attraction' }); setShowForm(true); }} className="fixed bottom-32 right-6 w-16 h-16 bg-journey-green text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-90 transition-transform"><Plus size={32} /></button>

      {showForm && (
        <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3rem] p-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-journey-brown italic">{editingItem ? '修改' : '新增'}行程</h3>
            <div className="space-y-4">
              <input placeholder="地點" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-3xl font-black focus:outline-none" />
              <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full bg-journey-cream p-5 rounded-3xl font-black focus:outline-none" />
              <div className="flex gap-2 overflow-x-auto p-1 hide-scrollbar">
                {Object.keys(CATEGORY_ICONS).map(cat => (
                  <button key={cat} onClick={() => setForm({...form, category: cat})} className={`p-4 rounded-2xl shrink-0 transition-all ${form.category === cat ? (THEME_COLORS[cat as keyof typeof THEME_COLORS] || 'bg-journey-sand') + ' text-white scale-110 shadow-md' : 'bg-journey-cream text-journey-brown/20'}`}>{CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS]}</button>
                ))}
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <Save size={20} /> 儲存
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
