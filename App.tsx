
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, supabase } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, MousePointer2, Cloud, RefreshCw, Wifi, WifiOff, Download } from 'lucide-react';
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

const plantToLocalCache = (table: string, tripId: string, data: any) => {
  if (!data || (Array.isArray(data) && data.length === 0)) return; // 禁止空資料種植
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
        if (typeData.length > 0) localStorage.setItem(`plan_${tripId}_${type}`, JSON.stringify(typeData));
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
    console.error(`種植 ${table} 失敗:`, e);
  }
};

const AppContent = () => {
  const [initializing, setInitializing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
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
    // 儲存設定到本地
    localStorage.setItem('trip_config', JSON.stringify(tripConfig));
    
    // 初始化連線與資料種植
    const initApp = async () => {
      await initSupabaseAuth();
      if (!hasSyncRef.current && supabase && tripConfig.id) {
        const tables = ['trips', 'schedules', 'bookings', 'planning_items', 'expenses', 'journals', 'members'];
        for (const table of tables) {
          try {
            const { data } = await supabase.from(table).select('*').eq(table === 'trips' ? 'id' : 'trip_id', tripConfig.id);
            if (data && data.length > 0) plantToLocalCache(table, tripConfig.id, data);
          } catch (e) {}
        }
        hasSyncRef.current = true;
      }
      setInitializing(false);
    };
    initApp();
  }, [tripConfig.id]);

  if (initializing) return <LoadingScreen />;

  return (
    <div className="min-h-screen pb-32">
      <header className="px-6 pt-12 pb-8 flex justify-between items-start relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-journey-green rounded-[1.5rem] flex items-center justify-center text-white shadow-soft -rotate-6 border-4 border-white transition-transform hover:rotate-0"><Plane size={28} /></div>
          <div><h1 className="text-3xl font-black text-journey-brown italic tracking-tighter leading-none mb-1">{tripConfig.title}</h1><p className="text-[10px] font-black text-journey-brown/40 uppercase tracking-[0.2em]">{tripConfig.dateRange}</p></div>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-14 h-14 bg-white/80 backdrop-blur-md rounded-[1.5rem] shadow-soft flex items-center justify-center text-journey-brown/30 hover:text-journey-brown active:scale-90 border-4 border-white transition-all"><Settings2 size={26} /></button>
      </header>

      <main className="px-6 relative z-0">
        <Routes>
          <Route path="/schedule" element={<ScheduleView tripConfig={tripConfig} />} />
          <Route path="/bookings" element={<BookingsView tripConfig={tripConfig} />} />
          <Route path="/expense" element={<ExpenseView tripConfig={tripConfig} />} />
          <Route path="/journal" element={<JournalView tripConfig={tripConfig} />} />
          <Route path="/planning" element={<PlanningView tripConfig={tripConfig} />} />
          <Route path="/members" element={<MembersView tripConfig={tripConfig} />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>

      <TripSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={tripConfig} onSave={setTripConfig} />
      
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[350px] bg-white/90 backdrop-blur-2xl px-2 py-3 z-50 rounded-[3rem] shadow-2xl border-4 border-white flex justify-around items-center">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.includes(item.id);
          return (
            <button key={item.id} onClick={() => window.location.hash = `#/${item.id}`} className={`relative w-12 h-12 rounded-[1.8rem] flex flex-col items-center justify-center transition-all duration-300 ${isActive ? 'bg-journey-green text-white shadow-lg -translate-y-2 rotate-3 scale-110' : 'text-journey-brown/20 hover:text-journey-brown/40'}`}>
              {item.icon}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-sky-400 overflow-hidden relative text-white">
    <div className="relative z-10 flex flex-col items-center">
      <div className="bg-white/20 p-10 rounded-full backdrop-blur-md animate-pulse mb-8 border-4 border-white/10"><Plane className="rotate-45" size={100} fill="white" /></div>
      <p className="text-2xl font-black italic animate-bounce-slow px-10 text-center">正在同步您的夢幻旅程...</p>
    </div>
  </div>
);

const TripSettingsModal = ({ isOpen, onClose, config, onSave }: any) => {
  const [formData, setFormData] = useState(config);
  const [targetId, setTargetId] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  const handleSyncAll = async (id: string) => {
    if (!supabase) return;
    setIsCloning(true);
    const tables = ['trips', 'schedules', 'bookings', 'planning_items', 'expenses', 'journals', 'members'];
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*').eq(table === 'trips' ? 'id' : 'trip_id', id);
      if (data && data.length > 0) plantToLocalCache(table, id, data);
    }
    window.location.reload();
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl space-y-6 relative border-t-8 border-journey-green">
        <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">設定與同步</h3><button onClick={onClose}><X size={24} className="text-journey-brown/20" /></button></div>
        <div className="space-y-4">
          <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-4 rounded-2xl font-black focus:outline-none" placeholder="行程標題" />
          <div className="p-4 bg-journey-blue/5 rounded-2xl space-y-3">
             <p className="text-[10px] font-black uppercase text-journey-blue">載入雲端行程 ID</p>
             <input value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-white p-3 rounded-xl text-xs font-black focus:outline-none" />
             <button onClick={() => handleSyncAll(targetId)} className="w-full bg-journey-blue text-white py-3 rounded-xl font-black text-xs active:scale-95">下載資料</button>
          </div>
          <div className="p-4 bg-journey-cream rounded-2xl flex justify-between items-center">
            <div><p className="text-[10px] font-black uppercase opacity-20">我的行程 ID</p><p className="font-mono text-xs font-black">{config.id}</p></div>
            <button onClick={() => { navigator.clipboard.writeText(config.id); alert('ID 已複製'); }} className="p-2 bg-white rounded-lg shadow-sm"><Copy size={16}/></button>
          </div>
        </div>
        <button onClick={() => { onSave(formData); onClose(); }} className="w-full bg-journey-brown text-white py-5 rounded-[2rem] font-black active:scale-95">儲存變更</button>
      </div>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
