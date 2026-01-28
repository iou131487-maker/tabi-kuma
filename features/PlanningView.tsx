
import React, { useState, useEffect } from 'react';
import { CATEGORY_ICONS, THEME_COLORS } from '../constants';
import { Sun, MapPin, Clock, Map as MapIcon, Sparkles, Loader2, Plus, Send, X } from 'lucide-react';
// Fix: Use correct import for GoogleGenAI as per guidelines
import { GoogleGenAI } from "@google/genai";
import { db, isConfigured } from '../firebase';
import { collection, onSnapshot, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

const ScheduleView: React.FC = () => {
  // --- 狀態管理 ---
  const [selectedDay, setSelectedDay] = useState(0);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiTip, setAiTip] = useState<string>('旅人，今天想去哪裡冒險呢？');
  
  // 表單控制
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('12:00');

  const days = ['5/12', '5/13', '5/14', '5/15', '5/16', '5/17', '5/18'];
  const tripId = 'hokkaido-2024'; // 這是我們的旅程 ID

  // --- 步驟 A：從雲端讀取資料 ---
  useEffect(() => {
    if (!isConfigured || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // 建立查詢：去 trips/hokkaido-2024/schedule 找資料
    const q = query(
      collection(db, 'trips', tripId, 'schedule'),
      where('dayIndex', '==', selectedDay), // 只找選定那一天的
      orderBy('time', 'asc') // 按時間排序
    );

    // 啟動即時監聽 (Snapshot)
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setScheduleData(items);
      setLoading(false);
    });

    return () => unsubscribe(); // 組件卸載時停止監聽
  }, [selectedDay]);

  // --- 步驟 B：AI 根據雲端資料給建議 ---
  useEffect(() => {
    const fetchAiTip = async () => {
      if (scheduleData.length === 0) return;
      try {
        // Fix: Use correct initialization and persona as systemInstruction in config
        const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `今日行程有：${scheduleData.map(d => d.title).join(', ')}。請給一句簡短建議（帶有可愛 emoji）。`,
          config: {
            systemInstruction: "你是一位專業導遊。請根據當天行程給予一段簡短且親切可愛的建議（帶有可愛 emoji）。"
          }
        });
        // Fix: Access response.text directly (property, not method)
        setAiTip(response.text || '準備出發囉！✨');
      } catch (e) {
        setAiTip('享受美好的旅行時光！🐻');
      }
    };
    fetchAiTip();
  }, [scheduleData]);

  // --- 步驟 C：新增行程到雲端 ---
  const handleSaveItem = async () => {
    if (!newTitle.trim()) return;
    if (!isConfigured || !db) {
      alert("請配置 Firebase API Key 以儲存資料！");
      return;
    }

    try {
      await addDoc(collection(db, 'trips', tripId, 'schedule'), {
        title: newTitle,
        time: newTime,
        location: '北海道某處',
        category: 'attraction',
        dayIndex: selectedDay,
        createdAt: serverTimestamp() // 使用伺服器時間確保一致性
      });
      setNewTitle('');
      setShowAddForm(false);
    } catch (e) {
      console.error("儲存失敗:", e);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. 日期選擇器 */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pt-1">
        {days.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx)}
            className={`flex-shrink-0 w-16 h-20 rounded-3xl flex flex-col items-center justify-center transition-all ${
              selectedDay === idx 
                ? 'bg-journey-green text-white shadow-soft transform -translate-y-1' 
                : 'bg-white text-journey-brown/60'
            }`}
          >
            <span className="text-[10px] font-bold">Day</span>
            <span className="text-xl font-bold">{idx + 1}</span>
            <span className="text-[10px]">{day}</span>
          </button>
        ))}
      </div>

      {/* 2. AI 建議卡片 */}
      <div className="bg-journey-accent/20 border-2 border-journey-accent/40 rounded-3xl p-4 flex gap-3 shadow-soft-sm">
        <Sparkles className="text-journey-accent shrink-0" size={20} />
        <p className="text-xs text-journey-brown font-bold italic">"{aiTip}"</p>
      </div>

      {/* 3. 行程列表 (從雲端獲取) */}
      {loading ? (
        <div className="flex flex-col items-center py-20 opacity-30">
          <Loader2 className="animate-spin mb-2" />
          <p className="text-[10px] font-bold uppercase tracking-widest">雲端同步中...</p>
        </div>
      ) : scheduleData.length === 0 ? (
        <div className="bg-white/40 rounded-4xl p-12 text-center border-2 border-dashed border-journey-sand">
          <p className="text-journey-brown/40 text-sm font-bold">點擊下方按鈕新增行程吧 ✨</p>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-0.5 before:bg-journey-brown/10">
          {scheduleData.map((item) => (
            <div key={item.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className={`z-10 w-11 h-11 rounded-2xl flex items-center justify-center shadow-soft-sm shrink-0 border-2 border-white ${THEME_COLORS[item.category as keyof typeof THEME_COLORS] || 'bg-journey-sand'} text-white`}>
                {CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS] || <Clock size={16} />}
              </div>
              <div className="bg-white rounded-3xl p-4 flex-grow shadow-soft">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-journey-darkGreen flex items-center gap-1">
                    <Clock size={12} /> {item.time}
                  </span>
                </div>
                <h4 className="font-bold text-journey-brown">{item.title}</h4>
                <div className="flex items-center gap-1 mt-2 text-journey-brown/60 text-[11px] font-bold">
                  <MapPin size={12} className="text-journey-blue" />
                  <span>{item.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. 新增表單彈窗 (設計成可愛圓角) */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-journey-brown">新增冒險項目</h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 bg-journey-cream rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-journey-brown/40 uppercase">行程名稱</label>
              <input 
                type="text" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例如：看羊蹄山日落"
                className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none focus:ring-2 ring-journey-green"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-journey-brown/40 uppercase">預計時間</label>
              <input 
                type="time" 
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none"
              />
            </div>
            <button 
              onClick={handleSaveItem}
              className="w-full bg-journey-darkGreen text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Send size={18} /> 儲存至雲端
            </button>
          </div>
        </div>
      )}
      
      {/* 5. 懸浮按鈕 */}
      <button 
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-journey-darkGreen text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-white"
      >
        <Plus size={32} strokeWidth={3} />
      </button>
    </div>
  );
};

export default ScheduleView;
