
import React, { useState, useEffect, useCallback } from 'react';
import { CATEGORY_ICONS, THEME_COLORS } from '../constants';
import { Clock, MapPin, Sparkles, Loader2, Plus, Send, X, Calendar as CalendarIcon, Save, Trash2, Compass } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const ScheduleView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const [selectedDay, setSelectedDay] = useState(() => {
    return Number(localStorage.getItem(`last_selected_day_${tripConfig.id}`)) || 0;
  });
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [newLocation, setNewLocation] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [newCategory, setNewCategory] = useState('attraction');
  const [newNote, setNewNote] = useState('');

  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  const tripId = tripConfig.id;

  const fetchSchedule = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    
    // 1. 優先從本地讀取 (F5 瞬間顯示)
    const localKey = `schedule_${tripId}_day_${selectedDay}`;
    const saved = localStorage.getItem(localKey);
    if (saved) setScheduleData(JSON.parse(saved));

    // 2. 雲端同步
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('schedules')
          .select('*')
          .eq('trip_id', tripId)
          .eq('day_index', selectedDay)
          .order('time', { ascending: true });

        if (!error && data) {
          setScheduleData(data);
          localStorage.setItem(localKey, JSON.stringify(data));
        }
      } catch (e) {
        console.error("Cloud Fetch Failed:", e);
      }
    }
    setLoading(false);
  }, [selectedDay, tripId]);

  useEffect(() => {
    fetchSchedule();
    localStorage.setItem(`last_selected_day_${tripId}`, selectedDay.toString());
  }, [fetchSchedule, selectedDay, tripId]);

  const handleSaveItem = async () => {
    if (!newLocation.trim()) return;
    
    const payload = {
      id: editingItem?.id || Date.now().toString(),
      title: newLocation,
      location: newLocation,
      time: newTime,
      category: newCategory,
      note: newNote,
      day_index: selectedDay,
      trip_id: tripId
    };

    // [核心修復] 先 Await 雲端儲存
    if (isSupabaseConfigured && supabase) {
      const { error } = editingItem 
        ? await supabase.from('schedules').update(payload).eq('id', editingItem.id)
        : await supabase.from('schedules').insert([payload]);
      
      if (error) {
        alert("同步到雲端失敗，請檢查網路！");
        return;
      }
    }

    // 雲端成功後才更新本地
    const localKey = `schedule_${tripId}_day_${selectedDay}`;
    const updatedData = editingItem 
      ? scheduleData.map(d => d.id === editingItem.id ? payload : d)
      : [...scheduleData, payload].sort((a, b) => a.time.localeCompare(b.time));
    
    setScheduleData(updatedData);
    localStorage.setItem(localKey, JSON.stringify(updatedData));
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除嗎？')) return;
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) return alert("刪除失敗");
    }
    const updatedData = scheduleData.filter(d => d.id !== id);
    setScheduleData(updatedData);
    localStorage.setItem(`schedule_${tripId}_day_${selectedDay}`, JSON.stringify(updatedData));
    resetForm();
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingItem(null);
    setNewLocation('');
    setNewTime('12:00');
    setNewCategory('attraction');
    setNewNote('');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-journey-accent rounded-4xl p-6 shadow-soft flex items-center justify-between overflow-hidden relative border-4 border-white">
        <div className="relative z-10">
          <p className="text-[10px] font-black text-journey-brown/40 uppercase tracking-[0.2em]">行程準備中</p>
          <h2 className="text-4xl font-black text-journey-brown mt-1 tracking-tight italic">Enjoy!</h2>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pt-1 -mx-2 px-2">
        {days.map((day, idx) => (
          <button key={day} onClick={() => setSelectedDay(idx)} className={`flex-shrink-0 w-16 h-20 rounded-3xl flex flex-col items-center justify-center transition-all ${selectedDay === idx ? 'bg-journey-green text-white shadow-soft transform -translate-y-1' : 'bg-white text-journey-brown/40'}`}>
            <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">DAY</span>
            <span className="text-xl font-black leading-none">{idx + 1}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        {loading && scheduleData.length === 0 ? (
          <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div>
        ) : scheduleData.length === 0 ? (
          <div className="bg-white/40 rounded-4xl p-16 text-center border-4 border-dashed border-journey-sand"><p className="text-journey-brown/40 text-sm font-black">這天還沒有行程 ✨</p></div>
        ) : (
          <div className="space-y-5 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-1 before:bg-journey-sand/50">
            {scheduleData.map((item) => (
              <div key={item.id} onClick={() => { setEditingItem(item); setNewLocation(item.location); setNewTime(item.time); setNewCategory(item.category); setNewNote(item.note); setShowAddForm(true); }} className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 group cursor-pointer">
                <div className={`z-10 w-11 h-11 rounded-2xl flex items-center justify-center shadow-soft-sm shrink-0 border-4 border-white ${THEME_COLORS[item.category as keyof typeof THEME_COLORS] || 'bg-journey-sand'} text-white`}>
                  {CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS] || <Clock size={16} />}
                </div>
                <div className="bg-white rounded-[2rem] p-5 flex-grow shadow-soft border-l-8 border-journey-green">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-journey-brown/40 px-2 py-0.5 rounded-full bg-journey-cream">{item.time}</span>
                  </div>
                  <h4 className="font-black text-journey-brown text-lg leading-tight">{item.location}</h4>
                  {item.note && <p className="text-[10px] text-journey-brown/60 italic mt-2">{item.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setShowAddForm(true)} className="fixed bottom-32 right-6 w-16 h-16 bg-journey-green text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 z-40 border-4 border-white"><Plus size={32} strokeWidth={4} /></button>

      {showAddForm && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center"><h3 className="text-xl font-black text-journey-brown">{editingItem ? '編輯行程' : '新增行程'}</h3><div className="flex gap-2">{editingItem && <button onClick={() => handleDelete(editingItem.id)} className="p-3 bg-journey-red/10 text-journey-red rounded-full"><Trash2 size={20} /></button>}<button onClick={resetForm} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button></div></div>
            <div className="space-y-5">
              <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="要去哪裡呢？" className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none" />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" />
              <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="備註..." className="w-full bg-journey-cream rounded-3xl p-5 text-sm text-journey-brown font-bold min-h-[100px] resize-none" />
            </div>
            <button onClick={handleSaveItem} className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2.5rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 border-b-4 border-black/10 transition-all">儲存行程</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
