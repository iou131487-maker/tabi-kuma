
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, supabase } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, MousePointer2, Cloud, RefreshCw, Wifi, WifiOff, Download, ChevronRight, ClipboardPaste, AlertCircle } from 'lucide-react';
import ScheduleView from './features/ScheduleView';
import BookingsView from './features/BookingsView';
import ExpenseView from './features/ExpenseView';
import JournalView from './features/JournalView';
import PlanningView from './features/PlanningView';
import MembersView from './features/MembersView';

const DEFAULT_CONFIG = {
  title: "我的夢幻行程",
  dateRange: "2025-01-01 ~ 2025-01-07",
  userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=traveler",
  id: 'trip-demo-001' 
};

const BACKGROUND_COLORS: Record<string, string> = {
  '/schedule': '#E0F7FA',
  '/bookings': '#FFF9C4',
  '/expense': '#F1F8E9',
  '/journal': '#FCE4EC',
  '/planning': '#E8EAF6',
  '/members': '#FFF3E0',
};

// 強化版本地快取種植器
const plantToLocalCache = (table: string, tripId: string, data: any) => {
  if (!data) return;
  try {
    if (table === 'trips') {
      const tripData = Array.isArray(data) ? data[0] : data;
      if (tripData) {
        const savedConfig = localStorage.getItem('trip_config');
        const currentConfig = savedConfig ? JSON.parse(savedConfig) : {};
        const newConfig = {
          ...currentConfig,
          id: tripId,
          title: tripData.title || currentConfig.title,
          dateRange: tripData.date_range || currentConfig.dateRange,
        };
        localStorage.setItem('trip_config', JSON.stringify(newConfig));
      }
    } else if (table === 'schedules') {
      const days = Array.from(new Set(data.map((d: any) => d.day_index)));
      days.forEach(day => {
        const dayData = data.filter((item: any) => item.day_index === day);
        localStorage.setItem(`sched_${tripId}_day${day}`, JSON.stringify(dayData));
      });
    } else if (table === 'planning_items') {
      ['todo', 'packing', 'shopping'].forEach(type => {
        const typeData = data.filter((item: any) => item.type === type);
        localStorage.setItem(`plan_${tripId}_${type}`, JSON.stringify(typeData));
      });
    } else if (table === 'bookings') {
      localStorage.setItem(`book_${tripId}`, JSON.stringify(data));
    } else if (table === 'expenses') {
      localStorage.setItem(`exp_${tripId}`, JSON.stringify(data));
    } else if (table === 'journals') {
      localStorage.setItem(`jrnl_${tripId}`, JSON.stringify(data));
    } else if (table === 'members') {
      localStorage.setItem(`mem_${tripId}`, JSON.stringify(data));
    }
  } catch (e) {
    console.error(`種植 ${table} 失敗 (可能是手機儲存空間不足):`, e);
    // 拋出錯誤以便 handleSyncAll 捕獲
    throw e;
  }
};

const AppContent = () => {
  const [initializing, setInitializing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false); 
  
  const [tripConfig, setTripConfig] = useState(() => {
    const saved = localStorage.getItem('trip_config');
    if (saved) return JSON.parse(saved);
    const newId = `trip-${Math.random().toString(36).substr(2, 9)}`;
    return { ...DEFAULT_CONFIG, id: newId };
  });
  
  const location = useLocation();
  const currentBg = BACKGROUND_COLORS[location.pathname] || '#FDFBF7';
  const hasSyncRef = useRef(false);

  useEffect(() => {
    document.body.style.backgroundColor = currentBg;
  }, [currentBg]);

  useEffect(() => {
    // 每次 tripConfig 變動時同步寫入 localStorage
    localStorage.setItem('trip_config', JSON.stringify(tripConfig));
    
    const initApp = async () => {
      await initSupabaseAuth();
      // 如果還沒進行過冷啟動同步，且雲端已連線，則執行一次全域同步
      if (!hasSyncRef.current && supabase && tripConfig.id) {
        const tables = ['trips', 'schedules', 'bookings', 'planning_items', 'expenses', 'journals', 'members'];
        // 在手機端使用並行請求以加快初始化速度
        await Promise.allSettled(tables.map(async (table) => {
          try {
            const { data } = await supabase!.from(table).select('*').eq(table === 'trips' ? 'id' : 'trip_id', tripConfig.id);
            if (data && data.length > 0) plantToLocalCache(table, tripConfig.id, data);
          } catch (e) {}
        }));
        hasSyncRef.current = true;
      }
      setInitializing(false);
    };
    initApp();
  }, [tripConfig.id]);

  useEffect(() => {
    setIsAnyModalOpen(showSettings);
  }, [showSettings]);

  if (initializing) return <LoadingScreen />;

  return (
    <div className="min-h-screen pb-44">
      <header className="px-6 pt-12 pb-8 flex justify-between items-start relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-journey-green rounded-[1.5rem] flex items-center justify-center text-white shadow-soft -rotate-6 border-4 border-white transition-transform hover:rotate-0"><Plane size={28} /></div>
          <div><h1 className="text-3xl font-black text-journey-brown italic tracking-tighter leading-none mb-1">{tripConfig.title}</h1><p className="text-[10px] font-black text-journey-brown/40 uppercase tracking-[0.2em]">{tripConfig.dateRange}</p></div>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-14 h-14 bg-white/80 backdrop-blur-md rounded-[1.5rem] shadow-soft flex items-center justify-center text-journey-brown/30 hover:text-journey-brown active:scale-90 border-4 border-white transition-all"><Settings2 size={26} /></button>
      </header>

      <main className="px-6 relative z-0">
        <Routes>
          <Route path="/schedule" element={<ScheduleView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/bookings" element={<BookingsView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/expense" element={<ExpenseView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/journal" element={<JournalView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/planning" element={<PlanningView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/members" element={<MembersView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>

      <TripSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={tripConfig} onSave={setTripConfig} />
      
      {!isAnyModalOpen && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[350px] bg-white/90 backdrop-blur-2xl px-2 py-3 z-[100] rounded-[3rem] shadow-2xl border-4 border-white flex justify-around items-center animate-in slide-in-from-bottom-10">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.includes(item.id);
            return (
              <button key={item.id} onClick={() => window.location.hash = `#/${item.id}`} className={`relative w-12 h-12 rounded-[1.8rem] flex flex-col items-center justify-center transition-all duration-300 ${isActive ? 'bg-journey-green text-white shadow-lg -translate-y-2 rotate-3 scale-110' : 'text-journey-brown/20 hover:text-journey-brown/40'}`}>
                {item.icon}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

const LoadingScreen = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-sky-400 overflow-hidden relative text-white text-center p-10">
    <div className="relative z-10 flex flex-col items-center">
      <div className="bg-white/20 p-10 rounded-full backdrop-blur-md animate-pulse mb-8 border-4 border-white/10"><Plane className="rotate-45" size={100} fill="white" /></div>
      <p className="text-2xl font-black italic animate-bounce-slow">正在為您同步夢幻旅程...</p>
      <p className="text-xs font-bold opacity-60 mt-4 uppercase tracking-widest">首次載入可能需要較長時間</p>
    </div>
  </div>
);

const TripSettingsModal = ({ isOpen, onClose, config, onSave }: any) => {
  const [formData, setFormData] = useState(config);
  const [targetId, setTargetId] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSyncAll = async () => {
    if (!targetId || targetId.length < 5) return alert('請輸入正確的行程 ID');
    if (!supabase) return alert('雲端未連線，請稍後再試');
    
    setIsProcessing(true);
    setSyncStatus('正在驗證行程 ID...');
    
    const tables = ['trips', 'schedules', 'bookings', 'planning_items', 'expenses', 'journals', 'members'];
    
    try {
      // 1. 先確認主行程是否存在
      const { data: tripData, error: tripError } = await supabase.from('trips').select('*').eq('id', targetId).single();
      if (tripError || !tripData) throw new Error('找不到該行程 ID，請檢查拼字。');
      
      setSyncStatus('連線成功，正在平行下載所有分頁資料...');
      
      // 2. 平行下載所有資料，這在手機端能顯著提升速度並減少單個請求失敗導致的中斷
      const results = await Promise.allSettled(tables.map(async (table) => {
        const { data, error } = await supabase!.from(table).select('*').eq(table === 'trips' ? 'id' : 'trip_id', targetId);
        if (error) throw error;
        if (data) plantToLocalCache(table, targetId, data);
        return { table, count: data?.length || 0 };
      }));

      // 檢查是否所有關鍵請求都完成了
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn('部分資料表下載失敗，但我們仍會嘗試重啟', failures);
      }

      setSyncStatus('同步成功！正在安全寫入緩存...');
      
      // 3. 特別為手機端增加寫入緩衝時間
      await new Promise(r => setTimeout(r, 1500));
      
      // 4. 最後更新 trip_config ID
      const newConfig = { ...config, id: targetId, title: tripData.title, dateRange: tripData.date_range };
      localStorage.setItem('trip_config', JSON.stringify(newConfig));
      
      setSyncStatus('完成！即將重新啟動頁面...');
      setTimeout(() => window.location.reload(), 800);
      
    } catch (err: any) { 
      console.error(err);
      alert('同步失敗: ' + err.message); 
      setIsProcessing(false); 
    }
  };

  const handleCloneTemplate = async () => {
    if (!targetId) return alert('請輸入模板 ID');
    if (!supabase) return alert('雲端未連線');
    
    setIsProcessing(true);
    setSyncStatus('正在獲取模板資訊...');
    const newTripId = `trip-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const { data: sourceTrip } = await supabase!.from('trips').select('*').eq('id', targetId).single();
      if (!sourceTrip) throw new Error('該模板行程不存在');
      
      setSyncStatus('正在雲端建立副本...');
      await supabase!.from('trips').insert({ id: newTripId, title: `${sourceTrip.title} (副本)`, date_range: sourceTrip.date_range });
      
      const tables = ['schedules', 'bookings', 'planning_items', 'expenses', 'journals', 'members'];
      
      // 依序處理克隆，避免手機網路瞬間請求過多導致 429
      for (const table of tables) {
        setSyncStatus(`正在複製資料: ${table}...`);
        const { data } = await supabase!.from(table).select('*').eq('trip_id', targetId);
        if (data && data.length > 0) {
          const newData = data.map(item => {
            const { id, ...rest } = item;
            return { 
              ...rest, 
              id: `${table.slice(0,2)}-${Math.random().toString(36).substr(2,8)}`, 
              trip_id: newTripId,
              created_at: new Date().toISOString()
            };
          });
          await supabase!.from(table).insert(newData);
          plantToLocalCache(table, newTripId, newData);
        }
      }
      
      localStorage.setItem('trip_config', JSON.stringify({ ...config, id: newTripId }));
      setSyncStatus('克隆成功！準備重載...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) { 
      alert('克隆失敗: ' + err.message); 
      setIsProcessing(false); 
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTargetId(text.trim());
    } catch (err) {
      alert('無法讀取剪貼簿，請手動輸入 ID');
    }
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[999] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-white w-full max-w-md rounded-t-[4rem] sm:rounded-[3.5rem] p-10 pb-32 sm:pb-10 shadow-2xl space-y-6 relative border-t-8 border-journey-green overflow-y-auto max-h-[95vh]">
        {isProcessing && (
          <div className="absolute inset-0 bg-white/95 z-[300] flex flex-col items-center justify-center p-10 text-center animate-in fade-in">
            <RefreshCw size={48} className="text-journey-green animate-spin mb-6" />
            <p className="font-black text-journey-brown italic text-lg leading-tight mb-2">{syncStatus}</p>
            <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">請保持螢幕開啟</p>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black italic">旅程設定與同步</h3>
          <button onClick={onClose} className="p-2 active:scale-90"><X size={24} className="text-journey-brown/20" /></button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase tracking-widest">我的行程名稱</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none border-4 border-white shadow-inner" />
          </div>

          <div className="p-6 bg-journey-blue/5 rounded-[2.5rem] border-4 border-journey-blue/10 space-y-4 shadow-soft-sm">
             <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-black text-journey-blue uppercase tracking-widest">載入/克隆 ID</p>
                <button onClick={handlePaste} className="flex items-center gap-1 text-[10px] font-black text-journey-blue bg-white px-3 py-1 rounded-full shadow-sm active:scale-95"><ClipboardPaste size={12}/> 貼上</button>
             </div>
             <input value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-white p-4 rounded-2xl text-sm font-black border-2 border-journey-blue/10 focus:border-journey-blue focus:outline-none placeholder:text-journey-brown/10" placeholder="例如: trip-abcdef..." />
             <div className="grid grid-cols-2 gap-3">
               <button onClick={handleSyncAll} className="bg-white border-4 border-journey-blue text-journey-blue py-4 rounded-2xl font-black text-[11px] active:scale-95 transition-all">直接下載資料</button>
               <button onClick={handleCloneTemplate} className="bg-journey-blue text-white py-4 rounded-2xl font-black text-[11px] active:scale-95 shadow-lg shadow-journey-blue/20 transition-all">克隆為新行程</button>
             </div>
             <p className="text-[9px] font-bold text-center text-journey-brown/20 leading-relaxed italic px-4">「下載資料」會覆蓋目前 ID 的本地數據；<br/>「克隆」會建立一組專屬於您的新 ID。</p>
          </div>
        </div>

        <button onClick={() => { onSave(formData); onClose(); }} className="w-full bg-journey-brown text-white py-6 rounded-[2.5rem] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
          <Save size={24} /> 儲存目前修改
        </button>
      </div>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
