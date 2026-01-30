
import React, { useState, useEffect } from 'react';
import { CATEGORY_ICONS, THEME_COLORS } from '../constants';
import { Clock, MapPin, Sparkles, Loader2, Plus, Send, X, Calendar as CalendarIcon, Save, Trash2, Compass, ExternalLink } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { supabase, isSupabaseConfigured } from '../supabase';

const ScheduleView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiTip, setAiTip] = useState<string>('旅人，今天想去哪裡旅行呢？🌸');
  
  // Modals state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form states
  const [newLocation, setNewLocation] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [newCategory, setNewCategory] = useState('attraction');
  const [newNote, setNewNote] = useState('');

  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  
  const tripId = tripConfig.title ? `trip-${tripConfig.title.replace(/\s+/g, '-').toLowerCase()}` : 'default-trip';

  const getCountdown = () => {
    try {
      if (!tripConfig.dateRange) return { label: '行程準備中', value: '??', unit: 'DAYS' };
      const dateStr = tripConfig.dateRange.split('-')[0].trim();
      const startDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      const diffTime = startDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) return { label: '期待出發', value: diffDays, unit: 'DAYS TO GO' };
      if (diffDays === 0) return { label: '旅程展開', value: 'Today', unit: 'ENJOY!' };
      return { label: '回味旅行', value: Math.abs(diffDays), unit: 'DAYS AGO' };
    } catch (e) {
      return { label: '行程準備中', value: '??', unit: 'DAYS' };
    }
  };

  const countdown = getCountdown();

  const fetchSchedule = async () => {
    setLoading(true);
    const saved = localStorage.getItem(`schedule_${tripId}_day_${selectedDay}`);
    let dataToSet = saved ? JSON.parse(saved) : [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('schedules')
          .select('*')
          .eq('trip_id', tripId)
          .eq('day_index', selectedDay)
          .order('time', { ascending: true });

        if (!error && data && data.length > 0) {
          dataToSet = data;
          localStorage.setItem(`schedule_${tripId}_day_${selectedDay}`, JSON.stringify(data));
        }
      } catch (e) {
        console.warn("Cloud fetch failed, using local/demo data");
      }
    }
    
    setScheduleData(dataToSet);
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedule();
  }, [selectedDay, tripId]);

  useEffect(() => {
    const fetchAiTip = async () => {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        setAiTip(`準備好開始你的「${tripConfig.title}」了嗎？記得多拍些照片喔 🐻`);
        return;
      }
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = scheduleData.length > 0 
          ? `今日行程有：${scheduleData.map(d => d.location).join(', ')}。請給出一句日系溫馨的簡短旅遊建議，包含 emoji，30字以內。`
          : `正在計畫「${tripConfig.title}」，請說一句溫馨的鼓勵。`;
          
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });
        setAiTip(response.text || '今天也是適合旅行的好日子！🍃');
      } catch (e) {
        setAiTip('今天也要帶著開心的心情出發喔！✨');
      }
    };
    fetchAiTip();
  }, [scheduleData, selectedDay, tripConfig.title]);

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

    let updatedData;
    if (editingItem) {
      updatedData = scheduleData.map(d => d.id === editingItem.id ? payload : d);
    } else {
      updatedData = [...scheduleData, payload].sort((a, b) => a.time.localeCompare(b.time));
    }
    
    setScheduleData(updatedData);
    localStorage.setItem(`schedule_${tripId}_day_${selectedDay}`, JSON.stringify(updatedData));

    if (isSupabaseConfigured && supabase) {
      if (editingItem) {
        supabase.from('schedules').update(payload).eq('id', editingItem.id).then();
      } else {
        supabase.from('schedules').insert([payload]).then();
      }
    }

    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這個行程嗎？')) return;
    
    const updatedData = scheduleData.filter(d => d.id !== id);
    setScheduleData(updatedData);
    localStorage.setItem(`schedule_${tripId}_day_${selectedDay}`, JSON.stringify(updatedData));

    if (isSupabaseConfigured && supabase) {
      supabase.from('schedules').delete().eq('id', id).then();
    }
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

  const openEdit = (item: any) => {
    setEditingItem(item);
    setNewLocation(item.location || item.title);
    setNewTime(item.time);
    setNewCategory(item.category);
    setNewNote(item.note || '');
    setShowAddForm(true);
  };

  const openInGoogleMaps = (e: React.MouseEvent, location: string) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-journey-accent rounded-4xl p-6 shadow-soft flex items-center justify-between overflow-hidden relative border-4 border-white animate-in slide-in-from-top">
        <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12">
           <Compass size={120} className="text-journey-brown" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black text-journey-brown/40 uppercase tracking-[0.2em]">{countdown.label}</p>
          <h2 className="text-4xl font-black text-journey-brown mt-1 tracking-tight">{countdown.value}</h2>
          <p className="text-[8px] font-black text-journey-brown/60 tracking-[0.3em] mt-1">{countdown.unit}</p>
        </div>
        <div className="relative z-10 bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/40 flex flex-col items-center justify-center min-w-[80px]">
           <Sparkles className="text-journey-brown/30 mb-1" size={16} />
           <span className="text-[10px] font-black text-journey-brown uppercase tracking-widest">Go!</span>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pt-1 -mx-2 px-2">
        {days.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx)}
            className={`flex-shrink-0 w-16 h-20 rounded-3xl flex flex-col items-center justify-center transition-all ${
              selectedDay === idx 
                ? 'bg-journey-green text-white shadow-soft transform -translate-y-1 border-b-4 border-journey-darkGreen' 
                : 'bg-white text-journey-brown/40'
            }`}
          >
            <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">DAY</span>
            <span className="text-xl font-black leading-none">{idx + 1}</span>
          </button>
        ))}
      </div>

      <div className="bg-white border-4 border-journey-sand rounded-[2.5rem] p-5 flex gap-4 shadow-soft-sm relative animate-in fade-in">
        <div className="w-12 h-12 bg-journey-accent rounded-2xl shrink-0 flex items-center justify-center animate-float shadow-sm border-2 border-white">
           <Sparkles className="text-white" size={24} />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[9px] font-black text-journey-brown/30 uppercase tracking-[0.2em]">Travel Tip</p>
          <p className="text-xs text-journey-brown font-black italic leading-relaxed">"{aiTip}"</p>
        </div>
      </div>

      <div className="relative">
        {loading ? (
          <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div>
        ) : scheduleData.length === 0 ? (
          <div className="bg-white/40 rounded-4xl p-16 text-center border-4 border-dashed border-journey-sand">
            <CalendarIcon size={40} className="mx-auto text-journey-sand mb-4" />
            <p className="text-journey-brown/40 text-sm font-black leading-relaxed">開始規劃你的「{tripConfig.title}」吧 ✨</p>
          </div>
        ) : (
          <div className="space-y-5 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-1 before:bg-journey-sand/50">
            {scheduleData.map((item, i) => (
              <div key={item.id} onClick={() => openEdit(item)} className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 group">
                <div className={`z-10 w-11 h-11 rounded-2xl flex items-center justify-center shadow-soft-sm shrink-0 border-4 border-white ${THEME_COLORS[item.category as keyof typeof THEME_COLORS] || 'bg-journey-sand'} text-white`}>
                  {CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS] || <Clock size={16} />}
                </div>
                <div className={`bg-white rounded-[2rem] p-5 flex-grow shadow-soft border-l-8 ${item.category === 'attraction' ? 'border-journey-green' : 'border-journey-sand'} active:scale-[0.98] transition-all cursor-pointer relative group/card`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-journey-brown/40 px-2 py-0.5 rounded-full bg-journey-cream">{item.time}</span>
                    <button 
                      onClick={(e) => openInGoogleMaps(e, item.location || item.title)}
                      className="w-8 h-8 rounded-full bg-journey-blue/20 text-journey-blue flex items-center justify-center hover:bg-journey-blue hover:text-white transition-all active:scale-90"
                      title="在地圖中開啟"
                    >
                      <MapPin size={14} />
                    </button>
                  </div>
                  <h4 className="font-black text-journey-brown text-lg leading-tight pr-8">{item.location || item.title}</h4>
                  {item.note && <p className="text-[10px] text-journey-brown/60 italic mt-2 line-clamp-1">{item.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setShowAddForm(true)} className="fixed bottom-32 right-6 w-16 h-16 bg-journey-green text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-white"><Plus size={32} strokeWidth={4} /></button>

      {showAddForm && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center"><h3 className="text-xl font-black text-journey-brown">{editingItem ? '編輯紀錄' : '新增紀錄'}</h3><div className="flex gap-2">{editingItem && <button onClick={() => handleDelete(editingItem.id)} className="p-3 bg-journey-red/10 text-journey-red rounded-full"><Trash2 size={20} /></button>}<button onClick={resetForm} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button></div></div>
            <div className="space-y-5">
              <div className="flex bg-journey-cream p-1.5 rounded-3xl gap-1 overflow-x-auto hide-scrollbar">
                {(['attraction', 'food', 'transport', 'lodging', 'other'] as const).map(cat => (
                  <button key={cat} onClick={() => setNewCategory(cat)} className={`shrink-0 px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase ${newCategory === cat ? 'bg-white text-journey-brown' : 'text-journey-brown/30'}`}>{cat}</button>
                ))}
              </div>
              <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="要去哪裡呢？" className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none" />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" />
              <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="寫下一些小提醒..." className="w-full bg-journey-cream rounded-3xl p-5 text-sm text-journey-brown font-bold min-h-[100px] resize-none" />
            </div>
            <button onClick={handleSaveItem} className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2.5rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 border-b-4 border-black/10 transition-all">{editingItem ? <Save size={18} /> : <Send size={18} />} 儲存行程</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
