
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initAuth, isConfigured } from './firebase'; 
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import ScheduleView from './features/ScheduleView';
import BookingsView from './features/BookingsView';
import ExpenseView from './features/ExpenseView';
import JournalView from './features/JournalView';
import PlanningView from './features/PlanningView';
import MembersView from './features/MembersView';

// --- 在這裡修改開屏畫面設定 ---
const SPLASH_CONFIG = {
  icon: '🌸', // 可以換成 ✈️, 🏕️, 🐰 等任何 Emoji 或 <img> 標籤
  title: 'Tabi-Kuma', // 你的 App 名字
  subTitle: '夢幻旅人．冒險開始'
};

const Header = () => (
  <header className="px-6 pt-8 pb-4 flex items-center justify-between">
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-black text-journey-brown tracking-tight">北海道．春櫻之旅</h1>
        {!isConfigured ? (
          <div className="flex items-center gap-1 bg-journey-red/10 text-journey-red px-2 py-0.5 rounded-full border border-journey-red/20 shadow-soft-sm">
            <WifiOff size={10} />
            <span className="text-[8px] font-black uppercase">Demo Mode</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-journey-green/20 text-journey-darkGreen px-2 py-0.5 rounded-full border border-journey-green/20">
            <Wifi size={10} className="animate-pulse" />
            <span className="text-[8px] font-black uppercase">Live Sync</span>
          </div>
        )}
      </div>
      <p className="text-journey-brown/40 text-[10px] font-bold uppercase tracking-[0.2em]">2024 MAY 12 - MAY 18</p>
    </div>
    <div className="w-12 h-12 rounded-3xl bg-white shadow-soft flex items-center justify-center overflow-hidden border-4 border-white transition-transform active:scale-90">
       <img src="https://picsum.photos/seed/traveler/100/100" className="w-full h-full object-cover" alt="user" />
    </div>
  </header>
);

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.substring(1) || 'schedule';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-t border-white/20 h-24 px-6 flex items-center justify-around pb-6 z-50">
      {NAV_ITEMS.map((item) => {
        const isActive = currentPath === item.id;
        return (
          <button
            key={item.id}
            onClick={() => navigate(`/${item.id}`)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-500 active:scale-75 ${
              isActive ? 'text-journey-brown' : 'text-journey-brown/30'
            }`}
          >
            <div className={`p-2.5 rounded-2xl transition-all duration-500 ${isActive ? 'bg-white shadow-soft-sm scale-110' : 'bg-transparent'}`}>
              {React.cloneElement(item.icon as React.ReactElement<any>, { 
                size: 22, 
                strokeWidth: isActive ? 2.8 : 2 
              })}
            </div>
            <span className={`text-[9px] font-black tracking-widest transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    initAuth().finally(() => {
      const timer = setTimeout(() => setShowWelcome(false), 2000);
      return () => clearTimeout(timer);
    });
  }, []);

  return (
    <Router>
      {showWelcome && (
        <div className="fixed inset-0 z-[100] bg-journey-cream flex flex-col items-center justify-center transition-opacity duration-1000">
           <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-soft flex items-center justify-center mb-4 animate-bounce">
              <span className="text-4xl">{SPLASH_CONFIG.icon}</span>
           </div>
           <h2 className="text-journey-brown font-black text-xl tracking-widest animate-pulse">{SPLASH_CONFIG.title}</h2>
           <p className="text-journey-brown/40 text-[10px] mt-2 font-bold uppercase tracking-widest text-center">
             {SPLASH_CONFIG.subTitle}<br/>
             <span className="opacity-50 mt-1 block">
               {isConfigured ? '正在同步雲端冒險...' : '啟動預覽模式...'}
             </span>
           </p>
        </div>
      )}

      <div className="min-h-screen pb-28 max-w-md mx-auto relative overflow-x-hidden">
        <Header />
        
        {!isConfigured && (
          <div className="mx-6 mb-4 bg-journey-red/10 border-2 border-dashed border-journey-red/30 rounded-3xl p-3 flex items-center gap-3">
            <AlertCircle className="text-journey-red shrink-0" size={16} />
            <p className="text-[10px] font-bold text-journey-brown/60 leading-tight">
              目前為預覽模式。請在 <code className="bg-white px-1">firebase.ts</code> 配置您的 API Key 以啟用雲端同步。
            </p>
          </div>
        )}

        <main className="px-5 transition-all duration-500 min-h-[60vh]">
          <Routes>
            <Route path="/" element={<Navigate to="/schedule" replace />} />
            <Route path="/schedule" element={<ScheduleView />} />
            <Route path="/bookings" element={<BookingsView />} />
            <Route path="/expense" element={<ExpenseView />} />
            <Route path="/journal" element={<JournalView />} />
            <Route path="/planning" element={<PlanningView />} />
            <Route path="/members" element={<MembersView />} />
          </Routes>
        </main>

        <BottomNav />
      </div>
    </Router>
  );
};

export default App;
