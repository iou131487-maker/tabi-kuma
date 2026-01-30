
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, isSupabaseConfigured } from './supabase'; 
import { WifiOff, AlertCircle, Cloud, CheckCircle2, XCircle, Settings2, Save, X, Plane, Camera } from 'lucide-react';
import ScheduleView from './features/ScheduleView';
import BookingsView from './features/BookingsView';
import ExpenseView from './features/ExpenseView';
import JournalView from './features/JournalView';
import PlanningView from './features/PlanningView';
import MembersView from './features/MembersView';

const DEFAULT_CONFIG = {
  id: `trip-${Date.now()}`, // 產生初始永久 ID
  title: "我的夢幻行程",
  dateRange: "2025-01-01",
  userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=traveler"
};

const Header = ({ isLive, isError, tripConfig, onOpenSettings }: { isLive: boolean, isError: boolean, tripConfig: any, onOpenSettings: () => void }) => {
  const [showConfigHelper, setShowConfigHelper] = useState(false);

  return (
    <header className="px-6 pt-8 pb-4 flex items-center justify-between relative z-10">
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-black text-journey-brown tracking-tight">{tripConfig.title}</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowConfigHelper(!showConfigHelper)} className="flex items-center">
              {isError ? (
                <div className="bg-journey-red text-white p-1 rounded-full animate-pulse"><AlertCircle size={10} /></div>
              ) : !isLive ? (
                <div className="bg-white/70 backdrop-blur-md text-journey-red px-1.5 py-0.5 rounded-full border border-journey-red/20 flex items-center gap-1">
                  <WifiOff size={8} /><span className="text-[7px] font-black uppercase tracking-tighter">Demo</span>
                </div>
              ) : (
                <div className="bg-white/70 backdrop-blur-md text-journey-darkGreen px-1.5 py-0.5 rounded-full border border-journey-green/20 flex items-center gap-1">
                  <Cloud size={8} className="animate-pulse" /><span className="text-[7px] font-black uppercase tracking-tighter">Live</span>
                </div>
              )}
            </button>
            <button onClick={onOpenSettings} className="p-1 text-journey-brown/20 hover:text-journey-brown transition-colors active:scale-90"><Settings2 size={16} /></button>
          </div>
        </div>
        <p className="text-journey-brown/40 text-[10px] font-bold uppercase tracking-[0.2em]">{tripConfig.dateRange}</p>
      </div>
      
      <button onClick={onOpenSettings} className="w-12 h-12 rounded-3xl bg-white shadow-soft flex items-center justify-center overflow-hidden border-4 border-white transition-transform active:scale-90 relative group">
         <img src={tripConfig.userAvatar || DEFAULT_CONFIG.userAvatar} className="w-full h-full object-cover" alt="User" />
         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={14} className="text-white" /></div>
      </button>

      {showConfigHelper && (
        <div className="absolute top-20 left-6 right-6 bg-white rounded-3xl shadow-2xl z-[60] border-4 border-journey-sand p-6 animate-in zoom-in-95 duration-200">
           <div className="flex justify-between items-center mb-4"><h4 className="text-sm font-black text-journey-brown">連線狀態</h4><button onClick={() => setShowConfigHelper(false)} className="text-journey-brown/20"><X size={16}/></button></div>
           <div className="space-y-3">
             <div className="flex items-center justify-between p-3 bg-journey-cream rounded-2xl"><span className="text-xs font-bold text-journey-brown/60">雲端同步</span>{isSupabaseConfigured ? <CheckCircle2 className="text-journey-green" size={18} /> : <XCircle className="text-journey-red" size={18} />}</div>
             <div className="flex items-center justify-between p-3 bg-journey-cream rounded-2xl"><span className="text-xs font-bold text-journey-brown/60">AI 助理</span>{process.env.API_KEY ? <CheckCircle2 className="text-journey-green" size={18} /> : <XCircle className="text-journey-red" size={18} />}</div>
           </div>
        </div>
      )}
    </header>
  );
};

const TripSettingsModal = ({ isOpen, onClose, config, onSave }: { isOpen: boolean, onClose: () => void, config: any, onSave: (newConfig: any) => void }) => {
  const [title, setTitle] = useState(config.title);
  const [dateRange, setDateRange] = useState(config.dateRange);
  const [userAvatar, setUserAvatar] = useState(config.userAvatar);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3.5rem] p-8 shadow-2xl space-y-8 animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center"><div><h3 className="text-2xl font-black text-journey-brown tracking-tight">手帳設定</h3><p className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-[0.2em] mt-1">Config</p></div><button onClick={onClose} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button></div>
        <div className="space-y-6">
          <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/40 uppercase tracking-widest ml-3">行程名稱</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none ring-journey-green focus:ring-4 transition-all" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/40 uppercase tracking-widest ml-3">出發日期</label><input type="date" value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/40 uppercase tracking-widest ml-3">個人頭像網址</label><input type="text" value={userAvatar} onChange={(e) => setUserAvatar(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none" /></div>
        </div>
        <button onClick={() => onSave({ ...config, title, dateRange, userAvatar })} className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2.5rem] shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all transform border-b-4 border-black/10"><Save size={20} /> 更新設定</button>
      </div>
    </div>
  );
};

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split('/')[1] || 'schedule';
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[220px] bg-white/80 backdrop-blur-2xl px-2 py-3 z-50 rounded-[2.5rem] shadow-2xl border border-white/20">
      <div className="flex justify-around items-center">
        {NAV_ITEMS.map((item) => (
          <button 
            key={item.id} 
            onClick={() => navigate(`/${item.id}`)} 
            className={`flex flex-col items-center transition-all duration-300 ${currentPath === item.id ? 'scale-110' : 'opacity-20 grayscale hover:opacity-40'}`}
          >
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-500 ${currentPath === item.id ? 'bg-journey-green text-white shadow-lg' : 'bg-transparent text-journey-brown'}`}>
              {item.icon}
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
};

const AppContent = () => {
  const location = useLocation();
  const [isLive, setIsLive] = useState(false);
  const [isError, setIsError] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [tripConfig, setTripConfig] = useState(() => {
    const saved = localStorage.getItem('trip_config');
    let config = saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    // 確保一定有穩定 ID
    if (!config.id) config.id = `trip-${Date.now()}`;
    return config;
  });

  const currentPath = location.pathname.split('/')[1] || 'schedule';
  const bgColors = { schedule: '#E0F4FF', bookings: '#FFF0F3', expense: '#E6F7F2', journal: '#F4F0FF', planning: '#FFF9E6', members: '#FFF4E6' };
  const currentBg = bgColors[currentPath as keyof typeof bgColors] || bgColors.schedule;

  useEffect(() => { document.body.style.backgroundColor = initializing ? '#BAE6FD' : currentBg; }, [currentBg, initializing]);
  useEffect(() => {
    const startup = async () => {
      try { await initSupabaseAuth(); if (isSupabaseConfigured) setIsLive(true); } 
      catch (e) { setIsError(true); } finally { setTimeout(() => setInitializing(false), 1200); }
    };
    startup();
  }, []);

  const handleSaveConfig = (newConfig: any) => { 
    setTripConfig(newConfig); 
    localStorage.setItem('trip_config', JSON.stringify(newConfig)); 
    setShowSettings(false); 
  };

  if (initializing) return (
    <div className="h-screen w-screen bg-[#BAE6FD] flex flex-col items-center justify-center space-y-10 overflow-hidden relative">
      <div className="animate-bounce-slow"><Plane className="text-white drop-shadow-lg" size={80} strokeWidth={2.5} /></div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32 transition-colors duration-1000 relative z-10">
      <Header isLive={isLive} isError={isError} tripConfig={tripConfig} onOpenSettings={() => setShowSettings(true)} />
      <main className="px-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
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
      <TripSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={tripConfig} onSave={handleSaveConfig} />
      <Navigation />
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
