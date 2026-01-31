
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, MousePointer2, Cloud } from 'lucide-react';
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

const TripSettingsModal = ({ isOpen, onClose, config, onSave }: { isOpen: boolean, onClose: () => void, config: any, onSave: (newConfig: any) => void }) => {
  const [formData, setFormData] = useState(config);
  const [joinId, setJoinId] = useState('');

  useEffect(() => { if (isOpen) setFormData(config); }, [isOpen, config]);

  const handleClone = () => {
    if (!confirm('將複製目前所有資料（行程、開支等）並建立一個新的 ID。這將使此裝置擁有獨立的版本，確定嗎？')) return;
    
    const newId = `trip-${Math.random().toString(36).substr(2, 9)}`;
    const keysToClone = [
      `mem_${config.id}`, 
      `exp_${config.id}`, 
      `book_${config.id}`, 
      `jrnl_${config.id}`
    ];
    
    keysToClone.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        const newKey = key.replace(config.id, newId);
        localStorage.setItem(newKey, data);
      }
    });

    for (let i = 0; i < 10; i++) {
      const sched = localStorage.getItem(`sched_${config.id}_day${i}`);
      if (sched) localStorage.setItem(`sched_${newId}_day${i}`, sched);
    }
    
    ['todo', 'packing', 'shopping'].forEach(type => {
      const plan = localStorage.getItem(`plan_${config.id}_${type}`);
      if (plan) localStorage.setItem(`plan_${newId}_${type}`, plan);
    });

    onSave({ ...formData, id: newId });
    alert(`克隆成功！新行程 ID: ${newId}`);
    window.location.reload();
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[3.5rem] sm:rounded-[3rem] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black text-journey-brown italic">同步與模板設定</h3>
          <button onClick={onClose}><X className="text-journey-brown/20" /></button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-journey-brown/30 ml-2 uppercase">行程標題</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-4 rounded-2xl font-black focus:outline-none" />
          </div>

          <div className="p-5 bg-journey-blue/5 rounded-3xl border-2 border-journey-blue/10 space-y-4">
            <h4 className="text-sm font-black text-journey-blue flex items-center gap-2"><Share2 size={16}/> 行程 ID (目前裝置)</h4>
            <div className="flex gap-2">
                <input readOnly value={config.id} className="flex-grow bg-white p-4 rounded-2xl font-mono text-xs font-black text-journey-blue border border-journey-blue/10" />
                <button onClick={() => { navigator.clipboard.writeText(config.id); alert('代碼已複製！'); }} className="px-4 bg-journey-blue text-white rounded-2xl active:scale-90 transition-transform"><Copy size={16}/></button>
            </div>
            <button onClick={handleClone} className="w-full bg-white border-2 border-journey-blue text-journey-blue py-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
              <MousePointer2 size={14} /> 複製目前行程為獨立版本
            </button>
          </div>
        </div>

        <div className="p-5 bg-journey-green/10 rounded-3xl space-y-3">
            <p className="text-[10px] font-black text-journey-darkGreen uppercase opacity-60">切換至其他行程 ID</p>
            <div className="flex gap-2">
                <input placeholder="貼上 ID..." value={joinId} onChange={e => setJoinId(e.target.value)} className="flex-grow bg-white p-3 rounded-xl text-xs font-black focus:outline-none" />
                <button onClick={() => { 
                    if(!joinId) return;
                    if(confirm('確定要切換？這將改為同步該 ID 的雲端資料。')) { 
                        localStorage.setItem('trip_config', JSON.stringify({...config, id: joinId})); 
                        window.location.reload(); 
                    } 
                }} className="px-4 bg-journey-darkGreen text-white rounded-xl font-black text-xs active:scale-90">切換</button>
            </div>
        </div>

        <button onClick={() => { onSave(formData); onClose(); }} className="w-full bg-journey-brown text-white font-black py-5 rounded-[2rem] shadow-lg active:scale-95 transition-transform">
          <Save size={20} className="inline mr-2" /> 儲存設定
        </button>
      </div>
    </div>
  );
};

const Header = ({ tripConfig, onOpenSettings }: { tripConfig: any, onOpenSettings: () => void }) => {
  return (
    <header className="px-6 pt-12 pb-8 flex justify-between items-start">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-journey-green rounded-2xl flex items-center justify-center text-white shadow-soft-sm -rotate-6 transition-transform hover:rotate-0">
            <Plane size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-journey-brown italic tracking-tighter leading-none">{tripConfig.title}</h1>
            <p className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em] mt-1">{tripConfig.dateRange}</p>
          </div>
        </div>
      </div>
      <button 
        onClick={onOpenSettings}
        className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-soft flex items-center justify-center text-journey-brown/20 hover:text-journey-brown transition-all active:scale-90 border-2 border-white"
      >
        <Settings2 size={24} />
      </button>
    </header>
  );
};

// 全新的可愛飛機載入畫面
const LoadingScreen = () => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-sky-400 overflow-hidden relative">
      {/* 漂浮的小雲朵們 */}
      <div className="absolute top-1/4 left-1/4 animate-float opacity-80"><Cloud className="text-white" size={48} fill="white" /></div>
      <div className="absolute top-1/3 right-1/4 animate-bounce-slow opacity-60 scale-75" style={{ animationDelay: '1s' }}><Cloud className="text-white" size={60} fill="white" /></div>
      <div className="absolute bottom-1/4 left-1/3 animate-float opacity-70 scale-50" style={{ animationDelay: '2s' }}><Cloud className="text-white" size={40} fill="white" /></div>
      <div className="absolute top-1/2 right-10 animate-bounce-slow opacity-40 scale-90" style={{ animationDelay: '0.5s' }}><Cloud className="text-white" size={50} fill="white" /></div>

      {/* 飛機中心組件 */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="bg-white/20 p-8 rounded-full backdrop-blur-sm animate-pulse mb-8">
           <div className="animate-float">
             <Plane className="text-white rotate-45 drop-shadow-lg" size={80} fill="white" />
           </div>
        </div>
        
        {/* 會跳動的文字 */}
        <div className="flex gap-1">
          {"快樂旅程準備中。。。".split("").map((char, i) => (
            <span 
              key={i} 
              className="text-white text-xl font-black italic drop-shadow-md animate-bounce-slow inline-block"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {char}
            </span>
          ))}
        </div>
      </div>

      {/* 底部裝飾線條 */}
      <div className="absolute bottom-10 flex gap-4 opacity-20">
         <div className="h-1 w-20 bg-white rounded-full animate-pulse"></div>
         <div className="h-1 w-8 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
         <div className="h-1 w-12 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
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

  useEffect(() => {
    document.body.style.backgroundColor = currentBg;
    localStorage.setItem('trip_config', JSON.stringify(tripConfig));
    initSupabaseAuth().then(() => {
      // 稍微延遲讓動畫感更好
      setTimeout(() => setInitializing(false), 2000);
    });
  }, [tripConfig, currentBg]);

  if (initializing) return <LoadingScreen />;

  return (
    <div className="min-h-screen pb-32">
      <Header tripConfig={tripConfig} onOpenSettings={() => setShowSettings(true)} />
      <main className="px-6">
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
      <TripSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={tripConfig} onSave={(cfg) => setTripConfig(cfg)} />
      
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[340px] bg-white/90 backdrop-blur-2xl px-2 py-3 z-50 rounded-[2.5rem] shadow-2xl border-4 border-white flex justify-around items-center">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.includes(item.id);
          return (
            <button key={item.id} onClick={() => window.location.hash = `#/${item.id}`} className={`relative w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${isActive ? 'bg-journey-green text-white shadow-lg -translate-y-1' : 'text-journey-brown/20'}`}>
              {item.icon}
              {isActive && <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
