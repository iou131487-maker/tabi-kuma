import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, isSupabaseConfigured } from './supabase'; 
import { WifiOff, AlertCircle, Sparkles, Cloud, Info, CheckCircle2, XCircle, Compass, Luggage, Settings2, Save, X, Plane, Heart, Palmtree, MapPin, Stars } from 'lucide-react';
import ScheduleView from './features/ScheduleView';
import BookingsView from './features/BookingsView';
import ExpenseView from './features/ExpenseView';
import JournalView from './features/JournalView';
import PlanningView from './features/PlanningView';
import MembersView from './features/MembersView';

// ==========================================
// 🎨 自定義可愛蓬蓬雲 (Cute Puffy Cloud)
// ==========================================
const PuffyCloud = ({ size = 60, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size * 0.6} 
    viewBox="0 0 100 60" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="30" cy="35" r="25" />
    <circle cx="50" cy="25" r="25" />
    <circle cx="70" cy="35" r="25" />
    <rect x="30" y="35" width="40" height="25" />
  </svg>
);

// ==========================================
// 🎨 預設配置
// ==========================================
const DEFAULT_CONFIG = {
  title: "北海道．春之冒險",
  dateRange: "2024 MAY 12 - MAY 18",
  loadingQuotes: "正在把夢想塞進背包...\n正在檢查地圖上的祕密景點...\n正在整理旅行的心情...\n正在呼喚好天氣精靈...\n別忘了帶上相機喔！📸",
  loadingIcon: "plane"
};

const Header = ({ isLive, isError, tripConfig, onOpenSettings }: { isLive: boolean, isError: boolean, tripConfig: any, onOpenSettings: () => void }) => {
  const [showConfigHelper, setShowConfigHelper] = useState(false);

  return (
    <header className="px-6 pt-8 pb-4 flex items-center justify-between relative z-10">
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-black text-journey-brown tracking-tight">
            {tripConfig.title}
          </h1>
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
            <button onClick={onOpenSettings} className="p-1 text-journey-brown/20 hover:text-journey-brown transition-colors active:scale-90">
              <Settings2 size={16} />
            </button>
          </div>
        </div>
        <p className="text-journey-brown/40 text-[10px] font-bold uppercase tracking-[0.2em]">
          {tripConfig.dateRange}
        </p>
      </div>
      
      <div className="w-12 h-12 rounded-3xl bg-white shadow-soft flex items-center justify-center overflow-hidden border-4 border-white transition-transform active:scale-90">
         <img src="https://picsum.photos/seed/traveler/100/100" className="w-full h-full object-cover" alt="User" />
      </div>

      {showConfigHelper && (
        <div className="absolute top-20 left-6 right-6 bg-white rounded-3xl shadow-2xl z-[60] border-4 border-journey-sand p-6 animate-in zoom-in-95 duration-200">
           <div className="flex justify-between items-center mb-4">
             <h4 className="text-sm font-black text-journey-brown">連線狀態</h4>
             <button onClick={() => setShowConfigHelper(false)} className="text-journey-brown/20"><X size={16}/></button>
           </div>
           <div className="space-y-3">
             <div className="flex items-center justify-between p-3 bg-journey-cream rounded-2xl">
               <span className="text-xs font-bold text-journey-brown/60">雲端同步 (Supabase)</span>
               {isSupabaseConfigured ? <CheckCircle2 className="text-journey-green" size={18} /> : <XCircle className="text-journey-red" size={18} />}
             </div>
             <div className="flex items-center justify-between p-3 bg-journey-cream rounded-2xl">
               <span className="text-xs font-bold text-journey-brown/60">AI 助理 (Gemini)</span>
               {process.env.API_KEY ? <CheckCircle2 className="text-journey-green" size={18} /> : <XCircle className="text-journey-red" size={18} />}
             </div>
           </div>
        </div>
      )}
    </header>
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
          <button
            key={item.id}
            onClick={() => navigate(`/${item.id}`)}
            className={`flex flex-col items-center gap-1 group transition-all duration-300 ${
              currentPath === item.id ? 'scale-110' : 'opacity-40 grayscale'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
              currentPath === item.id ? 'bg-white text-journey-brown shadow-lg rotate-0' : 'bg-transparent text-journey-brown rotate-3'
            }`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-black tracking-tighter ${currentPath === item.id ? 'text-journey-brown' : 'text-journey-brown/50'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLive, setIsLive] = useState(false);
  const [isError, setIsError] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [quote, setQuote] = useState("");
  
  const [tripConfig] = useState(() => {
    const saved = localStorage.getItem('trip_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  const bgColors = {
    schedule: '#E0F4FF', // 奶霜蘇打藍
    bookings: '#FFF0F3', // 草莓奶昔粉
    expense: '#E6F7F2',  // 薄荷奶油綠
    journal: '#F4F0FF',  // 香芋奶凍紫
    planning: '#FFF9E6', // 焦糖布丁黃
    members: '#FFF4E6',  // 蜜桃奶蓋橘
  };

  const currentPath = location.pathname.split('/')[1] || 'schedule';
  const currentBg = bgColors[currentPath as keyof typeof bgColors] || bgColors.schedule;

  useEffect(() => {
    document.body.style.backgroundColor = initializing ? '#BAE6FD' : currentBg;
  }, [currentBg, initializing]);

  useEffect(() => {
    const quotesArr = tripConfig.loadingQuotes.split('\n').filter((q: string) => q.trim() !== '');
    setQuote(quotesArr[Math.floor(Math.random() * quotesArr.length)] || "正在準備冒險...");
    
    const startup = async () => {
      try {
        const user = await initSupabaseAuth();
        if (isSupabaseConfigured && user && !(user as any).isDemo) {
          setIsLive(true);
        }
      } catch (e) {
        setIsError(true);
      } finally {
        setTimeout(() => setInitializing(false), 2400);
      }
    };
    startup();
  }, [tripConfig.loadingQuotes]);

  if (initializing) {
    return (
      <div className="h-screen w-screen bg-[#BAE6FD] flex flex-col items-center justify-center space-y-10 animate-in fade-in duration-700 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="absolute animate-float opacity-30"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${7 + Math.random() * 7}s`
              }}
            >
              <PuffyCloud size={50 + Math.random() * 120} className="text-white" />
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="w-44 h-44 bg-white/40 backdrop-blur-sm rounded-[5xl] flex items-center justify-center relative z-10 animate-in zoom-in-50 duration-700 border-4 border-white/60">
             <div className="animate-bounce-slow transform rotate-[-5deg]">
                <Plane className="text-white drop-shadow-lg" size={80} strokeWidth={2.5} />
             </div>
          </div>
          <div className="absolute -top-4 -right-4 bg-journey-accent p-4 rounded-full shadow-lg animate-pulse z-20 border-4 border-white">
            <Sparkles className="text-white" size={24} />
          </div>
          <div className="absolute -bottom-2 -left-6 bg-journey-red p-3.5 rounded-[2rem] shadow-md z-20 border-4 border-white">
            <Heart className="text-white" size={24} fill="white" />
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-6 text-center px-10 relative z-10">
          <div className="space-y-2">
             <p className="text-[10px] font-black text-white uppercase tracking-[0.5em] animate-pulse">Taking off to the clouds</p>
             <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">{tripConfig.title}</h2>
          </div>
          <p className="text-sm text-white/90 font-black italic max-w-[260px] leading-relaxed drop-shadow-sm">
            "{quote}"
          </p>
          <div className="flex gap-3 pt-4">
             <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
             <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
             <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 transition-colors duration-1000 relative z-10">
      <Header 
        isLive={isLive} 
        isError={isError} 
        tripConfig={tripConfig} 
        onOpenSettings={() => {}}
      />
      
      <main className="px-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        <Routes>
          <Route path="/schedule" element={<ScheduleView />} />
          <Route path="/bookings" element={<BookingsView />} />
          <Route path="/expense" element={<ExpenseView />} />
          <Route path="/journal" element={<JournalView />} />
          <Route path="/planning" element={<PlanningView />} />
          <Route path="/members" element={<MembersView />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>

      <Navigation />
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}