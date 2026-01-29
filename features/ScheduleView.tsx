import React, { useState, useEffect } from 'react';
import { CATEGORY_ICONS, THEME_COLORS } from '../constants';
import { Clock, MapPin, Sparkles, Loader2, Plus, Send, X, Calendar as CalendarIcon } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { supabase, isSupabaseConfigured } from '../supabase';

const ScheduleView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiTip, setAiTip] = useState<string>('旅人，今天想去哪裡冒險呢？🌸');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('12:00');

  const days = ['5/12', '5/13', '5/14', '5/15', '5/16', '5/17', '5/18'];
  const tripId = 'hokkaido-2024';

  const fetchSchedule = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setScheduleData([
        { id: 'd1', title: '抵達新千歲機場 ✈️', time: '10:00', location: 'CTS Airport', category: 'transport', day_index: 0 },
        { id: 'd2', title: '札幌電視塔散步', time: '14:30', location: '大通公園', category: 'attraction', day_index: 0 },
        { id: 'd3', title: '味噌拉麵名店 🍜', time: '18:00', location: '札幌市區', category: 'food', day_index: 0 }
      ].filter(item => item.day_index === selectedDay));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('trip_id', tripId)
        .eq('day_index', selectedDay)
        .order('time', { ascending: true });

      if (error) throw error;
      setScheduleData(data || []);
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    if (supabase && isSupabaseConfigured) {
      const channel = supabase.channel(`schedule-${selectedDay}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => fetchSchedule())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedDay]);

  useEffect(() => {
    const fetchAiTip = async () => {
      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === 'undefined' || apiKey === '') {
        // 如果沒有 API KEY，給出一組溫馨的隨機預設詞
        const fallbackTips = [
          '享受美好的旅行時光！記得多拍些照片喔 🐻',
          '北海道的風很舒服，記得多穿一件外套 🧥',
          '今天的冒險一定會很精彩的，出發吧！✨',
          '別忘了在路邊的小店買支薰衣草霜淇淋 🍦'
        ];
        setAiTip(fallbackTips[Math.floor(Math.random() * fallbackTips.length)]);
        return;
      }
      
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = scheduleData.length > 0 
          ? `今日行程有：${scheduleData.map(d => d.title).join(', ')}。請給出一句日系溫暖的簡短旅遊建議，包含 emoji，30字以內。`
          : "今天還沒安排行程，請用鼓勵的口吻說一句話，包含 emoji。";
          
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });
        setAiTip(response.text || '今天也是適合冒險的好日子！🍃');
      } catch (e) {
        setAiTip('今天也要帶著開心的心情出發喔！✨');
      }
    };
    fetchAiTip();
  }, [scheduleData, selectedDay]);

  const handleSaveItem = async () => {
    if (!newTitle.trim()) return;
    if (!isSupabaseConfigured || !supabase) {
      alert("目前為預覽模式，資料將不會永久儲存。");
      setScheduleData([...scheduleData, { id: Date.now().toString(), title: newTitle, time: newTime, category: 'attraction', location: '北海道' }]);
      setShowAddForm(false);
      return;
    }

    const { error } = await supabase.from('schedules').insert([{
      title: newTitle,
      time: newTime,
      location: '北海道',
      category: 'attraction',
      day_index: selectedDay,
      trip_id: tripId
    }]);

    if (!error) {
      setNewTitle('');
      setShowAddForm(false);
      fetchSchedule();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Date Selector */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pt-1 -mx-2 px-2">
        {days.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx)}
            className={`flex-shrink-0 w-16 h-20 rounded-3xl flex flex-col items-center justify-center transition-all duration-500 ${
              selectedDay === idx 
                ? 'bg-journey-green text-white shadow-soft transform -translate-y-1 border-b-4 border-journey-darkGreen' 
                : 'bg-white text-journey-brown/40 hover:bg-journey-cream'
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Day</span>
            <span className="text-xl font-black">{idx + 1}</span>
            <span className="text-[10px] font-bold">{day}</span>
          </button>
        ))}
      </div>

      {/* AI Message Bubble */}
      <div className="bg-white border-4 border-journey-sand rounded-[2.5rem] p-5 flex gap-4 shadow-soft-sm relative animate-in fade-in zoom-in duration-500">
        <div className="w-12 h-12 bg-journey-accent rounded-2xl shrink-0 flex items-center justify-center animate-float shadow-sm border-2 border-white">
           <Sparkles className="text-white" size={24} />
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em]">Tabi-Kuma Advice</p>
            {!process.env.API_KEY && <span className="bg-journey-sand text-[8px] px-1 rounded text-journey-brown/40 font-bold tracking-tighter">PRESET</span>}
          </div>
          <p className="text-xs text-journey-brown font-black italic leading-relaxed">"{aiTip}"</p>
        </div>
      </div>

      {/* Schedule List */}
      <div className="relative">
        {loading ? (
          <div className="flex flex-col items-center py-20 opacity-30">
            <Loader2 className="animate-spin mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">正在讀取手帳...</p>
          </div>
        ) : scheduleData.length === 0 ? (
          <div className="bg-white/40 rounded-4xl p-16 text-center border-4 border-dashed border-journey-sand">
            <CalendarIcon size={40} className="mx-auto text-journey-sand mb-4" />
            <p className="text-journey-brown/40 text-sm font-black leading-relaxed">這天還沒有計畫呢<br/>點擊下方按鈕開始吧 ✨</p>
          </div>
        ) : (
          <div className="space-y-5 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-1 before:bg-journey-sand/50">
            {scheduleData.map((item, i) => (
              <div key={item.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 100}ms` }}>
                <div className={`z-10 w-11 h-11 rounded-2xl flex items-center justify-center shadow-soft-sm shrink-0 border-4 border-white ${THEME_COLORS[item.category as keyof typeof THEME_COLORS] || 'bg-journey-sand'} text-white`}>
                  {CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS] || <Clock size={16} />}
                </div>
                <div className="bg-white rounded-[2rem] p-5 flex-grow shadow-soft border border-journey-sand/10 active:scale-[0.98] transition-transform">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-journey-darkGreen flex items-center gap-1 bg-journey-green/10 px-2 py-0.5 rounded-full">
                      <Clock size={10} /> {item.time}
                    </span>
                  </div>
                  <h4 className="font-black text-journey-brown text-lg leading-tight mb-2">{item.title}</h4>
                  <div className="flex items-center gap-1 text-journey-brown/40 text-[11px] font-bold">
                    <MapPin size={12} className="text-journey-blue" />
                    <span>{item.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-32 right-6 w-16 h-16 bg-journey-green text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-white"
      >
        <Plus size={32} strokeWidth={4} />
      </button>

      {/* Add Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-journey-brown">新增行程</h3>
              <button onClick={() => setShowAddForm(false)} className="p-3 bg-journey-cream rounded-full text-journey-brown/40 hover:text-journey-brown"><X size={20} /></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em] ml-2">行程名稱</label>
                <input 
                  type="text" 
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例如：去看函館夜景 🌙"
                  className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none ring-journey-green focus:ring-4 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em] ml-2">出發時間</label>
                <input 
                  type="time" 
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none ring-journey-green focus:ring-4 transition-all"
                />
              </div>
            </div>
            <button 
              onClick={handleSaveItem}
              className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all transform border-b-4 border-journey-brown/20"
            >
              <Send size={18} /> 儲存至雲端手帳
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;