
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, isSupabaseConfigured } from './supabase'; 
import { WifiOff, AlertCircle, Cloud, CheckCircle2, XCircle, Settings2, Save, X, Plane, Camera, Copy, Link, RefreshCcw, Share2, Smartphone, CloudRain } from 'lucide-react';
import ScheduleView from './features/ScheduleView';
import BookingsView from './features/BookingsView';
import ExpenseView from './features/ExpenseView';
import JournalView from './features/JournalView';
import PlanningView from './features/PlanningView';
import MembersView from './features/MembersView';

const DEFAULT_CONFIG = {
  title: "我的夢幻行程",
  dateRange: "2025-01-01",
  userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=traveler"
};

const Header = ({ isLive, isError, tripConfig, onOpenSettings }: { isLive: boolean, isError: boolean, tripConfig: any, onOpenSettings: () => void }) => {
  const [showConfigHelper, setShowConfigHelper] = useState(false);

  return (
    <header className="px-6 pt-10 pb-4 flex items-center justify-between relative z-10">
      <div className="relative">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-black text-journey-brown tracking-tight">{tripConfig.title}</h1>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onOpenSettings} 
              className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-xl shadow-soft-sm border-2 border-white flex items-center justify-center text-journey-brown hover:bg-journey-accent hover:text-white transition-all active:scale-90 group"
            >
              <Settings2 size={20} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>
            
            <button onClick={() => setShowConfigHelper(!showConfigHelper)} className="flex items-center">
              {isError ? (
                <div className="bg-journey-red text-white px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /><span className="text-[7px] font-black uppercase">Error</span></div>
              ) : !isLive ? (
                <div className="bg-journey-sand text-journey-brown/40 px-2 py-0.5 rounded-full border border-journey-brown/10 flex items-center gap-1">
                  <WifiOff size={8} /><span className="text-[7px] font-black uppercase tracking-tighter">Offline (Demo)</span>
                </div>
              ) : (
                <div className="bg-journey-green text-journey-darkGreen px-2 py-0.5 rounded-full border border-journey-darkGreen/20 flex items-center gap-1 shadow-sm">
                  <Cloud size={8} className="animate-pulse" /><span className="text-[7px] font-black uppercase tracking-tighter">Synced (Live)</span>
                </div>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-journey-brown/40 text-[10px] font-bold uppercase tracking-[0.2em]">{tripConfig.dateRange}</p>
          <div className="w-1 h-1 rounded-full bg-journey-brown/20"></div>
          <button onClick={onOpenSettings} className="text-[9px] font-black text-journey-blue uppercase hover:underline">同步設定</button>
        </div>
      </div>
      
      <button onClick={onOpenSettings} className="w-14 h-14 rounded-[1.8rem] bg-white shadow-soft flex items-center justify-center overflow-hidden border-4 border-white transition-transform active:scale-90 relative group">
         <img src={tripConfig.userAvatar || DEFAULT_CONFIG.userAvatar} className="w-full h-full object-cover" alt="User" />
         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={16} className="text-white" /></div>
      </button>

      {showConfigHelper && (
        <div className="absolute top-24 left-6 right-6 bg-white rounded-[2.5rem] shadow-2xl z-[60] border-4 border-journey-sand p-8 animate-in zoom-in-95 duration-200">
           <div className="flex justify-between items-center mb-6"><h4 className="text-sm font-black text-journey-brown">連線狀態說明</h4><button onClick={() => setShowConfigHelper(false)} className="text-journey-brown/20"><X size={16}/></button></div>
           <div className="space-y-4">
             <div className={`p-4 rounded-2xl border-2 ${isLive ? 'bg-journey-green/10 border-journey-green/20' : 'bg-journey-red/10 border-journey-red/20'}`}>
               <p className="text-xs font-black text-journey-brown mb-1">{isLive ? '✅ 已連網' : '❌ 未連網 (Demo)'}</p>
               <p className="text-[10px] text-journey-brown/60 leading-relaxed">
                 {isLive 
                   ? '你的所有修改都會即時同步到雲端，隊友輸入邀請碼後即可看到你的資料。' 
                   : '目前僅儲存在這台設備。請檢查 Supabase 設定以啟用雲端同步功能，否則手機無法抓到這台電腦的資料。'}
               </p>
             </div>
             <div className="p-4 bg-journey-cream rounded-2xl">
               <span className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest">目前行程 ID</span>
               <div className="flex items-center justify-between mt-1">
                 <span className="text-xs font-black text-journey-brown font-mono">{tripConfig.id}</span>
                 <button onClick={() => { navigator.clipboard.writeText(tripConfig.id); alert('代碼已複製！'); }} className="text-journey-blue"><Copy size={16} /></button>
               </div>
             </div>
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
  const [joinId, setJoinId] = useState('');
  const [showJoinField, setShowJoinField] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(config.title);
      setDateRange(config.dateRange);
      setUserAvatar(config.userAvatar);
    }
  }, [isOpen, config]);

  const handleJoin = () => {
    const cleanId = joinId.trim();
    if (!cleanId.startsWith('trip-')) return alert('格式不正確！請輸入包含 trip- 開頭的完整代碼。');
    
    if (confirm('確定要切換到此行程嗎？\n\n這會將你目前的手機資料替換成對方的行程資料喔！')) {
      const newConfig = { ...DEFAULT_CONFIG, id: cleanId };
      // 關鍵修復：先確保寫入 LocalStorage 再重新整理
      localStorage.setItem('trip_config', JSON.stringify(newConfig));
      alert('同步成功！正在為您重新載入資料...');
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8 animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-journey-brown italic flex items-center gap-2">Settings <Settings2 size={20} className="text-journey-accent" /></h3>
          <button onClick={onClose} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button>
        </div>

        <div className="p-6 bg-gradient-to-br from-journey-blue/20 to-white rounded-[2.5rem] border-4 border-journey-blue/20 space-y-4 shadow-inner">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-journey-blue shadow-sm"><Smartphone size={20} /></div>
             <h4 className="text-sm font-black text-journey-brown">跨設備同步</h4>
           </div>

           <div className="space-y-1">
             <p className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-1">你的專屬邀請碼</p>
             <div className="flex gap-2">
               <div className="flex-grow bg-white p-4 rounded-2xl font-mono text-xs font-black text-journey-brown border border-journey-blue/10 truncate">{config.id}</div>
               <button onClick={() => { navigator.clipboard.writeText(config.id); alert('代碼已複製！'); }} className="px-4 bg-journey-blue text-white rounded-2xl shadow-sm"><Copy size={16} /></button>
             </div>
           </div>

           <button onClick={() => setShowJoinField(!showJoinField)} className="w-full py-3 border-2 border-dashed border-journey-blue/30 rounded-2xl text-[10px] font-black text-journey-blue">
             {showJoinField ? '關閉輸入' : '輸入隊友代碼以加入行程...'}
           </button>
           
           {showJoinField && (
             <div className="flex gap-2 mt-2 animate-in slide-in-from-top-4">
               <input placeholder="trip-xxxx..." value={joinId} onChange={e => setJoinId(e.target.value)} className="flex-grow bg-white p-4 rounded-2xl text-xs font-black focus:outline-none ring-2 ring-journey-blue/20" />
               <button onClick={handleJoin} className="px-5 bg-journey-darkGreen text-white rounded-2xl shadow-lg"><RefreshCcw size={16} /></button>
             </div>
           )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/40 uppercase tracking-widest ml-4">行程名稱</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none ring-journey-green focus:ring-4 transition-all" /></div>
          <div className="space-y-2"><label className="text-[10px] font-black text-journey-brown/40 uppercase tracking-widest ml-4">個人頭像網址</label><input type="text" value={userAvatar} onChange={(e) => setUserAvatar(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none" /></div>
        </div>

        <button onClick={() => onSave({ ...config, title, dateRange, userAvatar })} className="w-full bg-journey-brown text-white font-black py-6 rounded-[2.5rem] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all transform border-b-4 border-black/20 uppercase tracking-[0.2em]"><Save size={20} /> Save Changes</button>
      </div>
    </div>
  );
};

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split('/')[1] || 'schedule';

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[240px] bg-white/90 backdrop-blur-2xl px-2 py-3 z-50 rounded-[2.5rem] shadow-2xl border-4 border-white">
      <div className="flex justify-around items-center">
        {NAV_ITEMS.map((item) => (
          <button 
            key={item.id} 
            onClick={() => navigate(`/${item.id}`)} 
            className={`flex flex-col items-center transition-all duration-300 ${currentPath === item.id ? 'scale-110' : 'opacity-20 grayscale hover:opacity-40'}`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${currentPath === item.id ? 'bg-journey-green text-white shadow-lg rotate-[5deg]' : 'bg-transparent text-journey-brown'}`}>
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
    try {
      const saved = localStorage.getItem('trip_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const newConfig = { ...DEFAULT_CONFIG, id: `trip-${Date.now()}` };
    localStorage.setItem('trip_config', JSON.stringify(newConfig));
    return newConfig;
  });

  const currentPath = location.pathname.split('/')[1] || 'schedule';
  const bgColors = { schedule: '#E0F4FF', bookings: '#FFF0F3', expense: '#E6F7F2', journal: '#F4F0FF', planning: '#FFF9E6', members: '#FFF4E6' };
  const currentBg = bgColors[currentPath as keyof typeof bgColors] || bgColors.schedule;

  useEffect(() => { document.body.style.backgroundColor = currentBg; }, [currentBg]);
  
  useEffect(() => {
    const startup = async () => {
      try { 
        await initSupabaseAuth(); 
        if (isSupabaseConfigured) setIsLive(true); 
      } catch (e) { setIsError(true); } 
      finally { setTimeout(() => setInitializing(false), 1200); }
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
