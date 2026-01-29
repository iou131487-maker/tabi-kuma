
import React, { useState, useEffect } from 'react';
import { CATEGORY_ICONS, THEME_COLORS } from '../constants';
import { Clock, MapPin, Sparkles, Loader2, Plus, Send, X, Calendar as CalendarIcon, ExternalLink, Edit2, Save, Trash2, Compass } from 'lucide-react';
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

  // Form states for item (地點、時間、類別、備註)
  const [newLocation, setNewLocation] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [newCategory, setNewCategory] = useState('attraction');
  const [newNote, setNewNote] = useState('');

  const days = ['5/12', '5/13', '5/14', '5/15', '5/16', '5/17', '5/18'];
  const tripId = 'hokkaido-2024';

  // 修復後的倒數計時解析邏輯
  const getCountdown = () => {
    try {
      if (!tripConfig.dateRange) return { label: '行程準備中', value: '??', unit: 'DAYS' };
      
      // 支援多種日期格式的解析 (YYYY-MM-DD 或 YYYY MAY DD)
      const dateStr = tripConfig.dateRange.split('-')[0].split(' - ')[0].trim();
      const startDate = new Date(dateStr);
      
      // 如果原生解析失敗，嘗試手動解析
      if (isNaN(startDate.getTime())) {
         const parts = dateStr.split(/[ ,/-]+/);
         // 這裡可以根據需要擴展解析邏輯，目前先假設 YYYY-MM-DD
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      
      const diffTime = startDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) return { label: '期待出發', value: diffDays, unit: 'DAYS TO GO' };
      if (diffDays === 0) return { label: '旅程展開', value: 'Today', unit: 'ENJOY!' };
      return { label: '回味旅行', value: Math.abs(diffDays), unit: 'DAYS AGO' };
    } catch (e) {
      console.error("Countdown Parse Error:", e);
      return { label: '行程準備中', value: '??', unit: 'DAYS' };
    }
  };

  const countdown = getCountdown();

  const fetchSchedule = async () => {
    if (!isSupabaseConfigured || !supabase) {
      const demoData = [
        { id: 'd1', title: '抵達新千歲機場 ✈️', time: '10:00', location: '新千歲機場', category: 'transport', day_index: 0, note: '記得去拿 Wi-Fi 機' },
        { id: 'd2', title: '札幌電視塔散步', time: '14:30', location: '札幌電視塔', category: 'attraction', day_index: 0, note: '可以買烤玉米吃 🌽' },
        { id: 'd3', title: '味噌拉麵名店 🍜', time: '18:00', location: '札幌市區', category: 'food', day_index: 0 }
      ];
      setScheduleData(demoData.filter(item => item.day_index === selectedDay));
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
      if (!apiKey) {
        setAiTip('享受美好的旅行時光！記得多拍些照片喔 🐻');
        return;
      }
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = scheduleData.length > 0 
          ? `今日行程有：${scheduleData.map(d => d.location).join(', ')}。請給出一句日系溫馨的簡短旅遊建議，包含 emoji，30字以內。`
          : "今天還沒安排行程，請用鼓勵的口吻說一句話，包含 emoji。";
          
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
  }, [scheduleData, selectedDay]);

  const handleSaveItem = async () => {
    if (!newLocation.trim()) return;
    
    // 將地點同時存在 title 和 location 欄位以保持簡約
    const payload = {
      title: newLocation,
      location: newLocation,
      time: newTime,
      category: newCategory,
      note: newNote,
      day_index: selectedDay,
      trip_id: tripId
    };

    if (!isSupabaseConfigured || !supabase) {
      if (editingItem) {
        setScheduleData(scheduleData.map(d => d.id === editingItem.id ? { ...d, ...payload } : d));
      } else {
        setScheduleData([...scheduleData, { id: Date.now().toString(), ...payload }]);
      }
      resetForm();
      return;
    }

    try {
      if (editingItem) {
        await supabase.from('schedules').update(payload).eq('id', editingItem.id);
      } else {
        await supabase.from('schedules').insert([payload]);
      }
      fetchSchedule();
      resetForm();
    } catch (e) {
      alert("儲存失敗，請檢查網路。");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這個行程嗎？')) return;
    if (!supabase) {
      setScheduleData(scheduleData.filter(d => d.id !== id));
      resetForm();
      return;
    }
    await supabase.from('schedules').delete().eq('id', id);
    fetchSchedule();
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

  const openMap = (e: React.MouseEvent, location: string) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 行程期待值卡片 (Countdown) */}
      <div className="bg-journey-accent rounded-4xl p-6 shadow-soft flex items-center justify-between overflow-hidden relative border-4 border-white animate-in slide-in-from-top duration-500">
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
           <span className="text-[10px] font-black text-journey-brown uppercase tracking-widest">Ready?</span>
        </div>
      </div>

      {/* 日期切換器 */}
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

      {/* AI 建議氣泡 */}
      <div className="bg-white border-4 border-journey-sand rounded-[2.5rem] p-5 flex gap-4 shadow-soft-sm relative animate-in fade-in zoom-in duration-500">
        <div className="w-12 h-12 bg-journey-accent rounded-2xl shrink-0 flex items-center justify-center animate-float shadow-sm border-2 border-white">
           <Sparkles className="text-white" size={24} />
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em]">Tabi-Kuma Tip</p>
          </div>
          <p className="text-xs text-journey-brown font-black italic leading-relaxed">"{aiTip}"</p>
        </div>
      </div>

      {/* 行程清單 */}
      <div className="relative">
        {loading ? (
          <div className="flex flex-col items-center py-20 opacity-30">
            <Loader2 className="animate-spin mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">正在讀取行程...</p>
          </div>
        ) : scheduleData.length === 0 ? (
          <div className="bg-white/40 rounded-4xl p-16 text-center border-4 border-dashed border-journey-sand">
            <CalendarIcon size={40} className="mx-auto text-journey-sand mb-4" />
            <p className="text-journey-brown/40 text-sm font-black leading-relaxed">這天還沒有行程呢<br/>點擊下方按鈕開始規劃吧 ✨</p>
          </div>
        ) : (
          <div className="space-y-5 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-1 before:bg-journey-sand/50">
            {scheduleData.map((item, i) => (
              <div 
                key={item.id} 
                onClick={() => openEdit(item)}
                className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 group" 
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/*時間軸圖示 */}
                <div className={`z-10 w-11 h-11 rounded-2xl flex items-center justify-center shadow-soft-sm shrink-0 border-4 border-white ${THEME_COLORS[item.category as keyof typeof THEME_COLORS] || 'bg-journey-sand'} text-white transition-transform group-hover:scale-110`}>
                  {CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS] || <Clock size={16} />}
                </div>
                
                {/* 行程卡片 */}
                <div className={`bg-white rounded-[2rem] p-5 flex-grow shadow-soft border-l-8 ${item.category === 'attraction' ? 'border-journey-green' : item.category === 'food' ? 'border-journey-accent' : item.category === 'transport' ? 'border-journey-blue' : item.category === 'lodging' ? 'border-journey-red' : 'border-journey-sand'} active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between`}>
                  <div className="flex-grow pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-journey-brown/40 flex items-center gap-1 bg-journey-cream px-2 py-0.5 rounded-full">
                        <Clock size={10} /> {item.time}
                      </span>
                    </div>
                    
                    <h4 className="font-black text-journey-brown text-lg leading-tight mb-1">{item.location || item.title}</h4>

                    {item.note && (
                       <p className="text-[10px] text-journey-brown/60 leading-relaxed italic mt-2 line-clamp-1">
                         <Sparkles size={10} className="inline mr-1 text-journey-accent" />
                         {item.note}
                       </p>
                    )}
                  </div>

                  {/* 地圖導航按鈕 */}
                  <button 
                    onClick={(e) => openMap(e, item.location || item.title)}
                    className="shrink-0 w-12 h-12 bg-journey-cream hover:bg-journey-blue/20 text-journey-brown/30 hover:text-journey-blue rounded-2xl flex items-center justify-center transition-all shadow-soft-sm active:scale-90"
                  >
                    <MapPin size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新增按鈕 (FAB) */}
      <button 
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-32 right-6 w-16 h-16 bg-journey-green text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-white"
      >
        <Plus size={32} strokeWidth={4} />
      </button>

      {/* 新增/編輯視窗 */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-journey-brown">{editingItem ? '編輯行程' : '新增行程'}</h3>
              <div className="flex gap-2">
                {editingItem && (
                   <button onClick={() => handleDelete(editingItem.id)} className="p-3 bg-journey-red/10 text-journey-red rounded-full hover:bg-journey-red hover:text-white transition-colors">
                     <Trash2 size={20} />
                   </button>
                )}
                <button onClick={resetForm} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex bg-journey-cream p-1.5 rounded-3xl gap-1 overflow-x-auto hide-scrollbar">
                {(['attraction', 'food', 'transport', 'lodging', 'other'] as const).map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className={`shrink-0 px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${newCategory === cat ? 'bg-white text-journey-brown shadow-sm' : 'text-journey-brown/30'}`}
                  >
                    {CATEGORY_ICONS[cat]} {cat === 'attraction' ? '景點' : cat === 'food' ? '美食' : cat === 'transport' ? '交通' : cat === 'lodging' ? '住宿' : '其他'}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em] ml-2">地點</label>
                <input type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="要去哪裡呢？" className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none ring-journey-green focus:ring-4 transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em] ml-2">時間</label>
                <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em] ml-2">私房備註</label>
                <textarea 
                  value={newNote} 
                  onChange={(e) => setNewNote(e.target.value)} 
                  placeholder="寫下一些小提醒..." 
                  className="w-full bg-journey-cream rounded-3xl p-5 text-sm text-journey-brown font-bold focus:outline-none min-h-[100px] ring-journey-green focus:ring-4 transition-all resize-none"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveItem}
              className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2.5rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all transform border-b-4 border-black/10"
            >
              {editingItem ? <Save size={18} /> : <Send size={18} />} 
              {editingItem ? '更新行程紀錄' : '儲存至手帳'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
