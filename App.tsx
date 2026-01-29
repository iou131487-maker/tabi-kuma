
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, isSupabaseConfigured } from './supabase'; 
import { WifiOff, AlertCircle, Sparkles, Cloud, Info, CheckCircle2, XCircle, Compass, Luggage, Settings2, Save, X, Plane, Heart, Palmtree, MapPin, Stars, Edit3, Calendar, Camera } from 'lucide-react';
import ScheduleView from './features/ScheduleView';
import BookingsView from './features/BookingsView';
import ExpenseView from './features/ExpenseView';
import JournalView from './features/JournalView';
import PlanningView from './features/PlanningView';
import MembersView from './features/MembersView';

const PuffyCloud = ({ size = 60, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size * 0.6} viewBox="0 0 100 60" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="35" r="25" /><circle cx="50" cy="25" r="25" /><circle cx="70" cy="35" r="25" /><rect x="30" y="35" width="40" height="25" />
  </svg>
);

const DEFAULT_CONFIG = {
  title: "北海道．行程手帳",
  dateRange: "2024-05-12",
  loadingQuotes: "正在把夢想塞進背包...\n正在檢查地圖上的祕密景點...\n正在呼喚好天氣精靈...",
  loadingIcon: "plane",
  userAvatar: "https://picsum.photos/seed/traveler/100/100"
};

const Header = ({ isLive, isError, tripConfig, onOpenSettings, onUpdateAvatar }: { isLive: boolean, isError: boolean, tripConfig: any, onOpenSettings: () => void, onUpdateAvatar: () => void }) => {
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
      
      <button onClick={onUpdateAvatar} className="w-12 h-12 rounded-3xl bg-white shadow-soft flex items-center justify-center overflow-hidden border-4 border-white transition-transform active:scale-90 group relative">
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
        <div className="flex justify-between items-center"><div><h3 className="text-2xl font-black text-journey-brown tracking-tight">行程設定</h3><p className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-[0.2em] mt-1">Trip Settings</p></div><button onClick={onClose} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button></div>
        <div className="space-y-6">
          <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/40 uppercase tracking-widest ml-3">行程標題</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none ring-journey-green focus:ring-4 transition-all" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/40 uppercase tracking-widest ml-3">起始日期 (YYYY-MM-DD)</label><input type="text" value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none ring-journey-green focus:ring-4 transition-all" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/40 uppercase tracking-widest ml-3">頭像網址</label><input type="text" value={userAvatar} onChange={(e) => setUserAvatar(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none ring-journey-green focus:ring-4 transition-all" /></div>
        </div>
        <button onClick={() => onSave({ ...config, title, dateRange, userAvatar })} className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2.5rem] shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all transform border-b-4 border-black/10"><Save size={20} /> 更新手帳設定</button>
      </div>
    </div>
  );
};

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split('/')[1] || 'schedule';
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/50 backdrop-blur-2xl border-t border-white/20 px-4 pb-8 pt-4 z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {NAV_ITEMS.map((item) => (
          <button key={item.id} onClick={() => navigate(`/${item.id}`)} className={`flex flex-col items-center gap-1 transition-all duration-300 ${currentPath === item.id ? 'scale-110' : 'opacity-40 grayscale'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${currentPath === item.id ? 'bg-white text-journey-brown shadow-lg' : 'bg-transparent text-journey-brown'}`}>{item.icon}</div>
            <span className={`text-[10px] font-black tracking-tighter ${currentPath === item.id ? 'text-journey-brown' : 'text-journey-brown/50'}`}>{item.label}</span>
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
  const [quote, setQuote] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tripConfig, setTripConfig] = useState(() => {
    const saved = localStorage.getItem('trip_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const currentPath = location.pathname.split('/')[1] || 'schedule';
  const bgColors = { schedule: '#E0F4FF', bookings: '#FFF0F3', expense: '#E6F7F2', journal: '#F4F0FF', planning: '#FFF9E6', members: '#FFF4E6' };
  const currentBg = bgColors[currentPath as keyof typeof bgColors] || bgColors.schedule;

  useEffect(() => { document.body.style.backgroundColor = initializing ? '#BAE6FD' : currentBg; }, [currentBg, initializing]);
  useEffect(() => {
    const quotesArr = tripConfig.loadingQuotes.split('\n').filter((q: string) => q.trim() !== '');
    setQuote(quotesArr[Math.floor(Math.random() * quotesArr.length)] || "正在準備行程...");
    const startup = async () => {
      try { await initSupabaseAuth(); if (isSupabaseConfigured) setIsLive(true); } 
      catch (e) { setIsError(true); } finally { setTimeout(() => setInitializing(false), 2000); }
    };
    startup();
  }, [tripConfig.loadingQuotes]);

  const handleSaveConfig = (newConfig: any) => { setTripConfig(newConfig); localStorage.setItem('trip_config', JSON.stringify(newConfig)); setShowSettings(false); };

  if (initializing) return (
    <div className="h-screen w-screen bg-[#BAE6FD] flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-700 overflow-hidden relative">
      <div className="animate-bounce-slow"><Plane className="text-white drop-shadow-lg" size={80} strokeWidth={2.5} /></div>
      <div className="text-center px-10"><h2 className="text-3xl font-black text-white mb-2">{tripConfig.title}</h2><p className="text-sm text-white/90 font-black italic">"{quote}"</p></div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32 transition-colors duration-1000 relative z-10">
      <Header isLive={isLive} isError={isError} tripConfig={tripConfig} onOpenSettings={() => setShowSettings(true)} onUpdateAvatar={() => setShowSettings(true)} />
      <main className="px-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        <Routes>
          <Route path="/schedule" element={<ScheduleView tripConfig={tripConfig} />} />
          <Route path="/bookings" element={<BookingsView />} />
          <Route path="/expense" element={<ExpenseView />} />
          <Route path="/journal" element={<JournalView />} />
          <Route path="/planning" element={<PlanningView />} />
          <Route path="/members" element={<MembersView />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>
      <TripSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={tripConfig} onSave={handleSaveConfig} />
      <Navigation />
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
