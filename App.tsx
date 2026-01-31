
import React, { useEffect, useState } from 'react';
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

const TripSettingsModal = ({ isOpen, onClose, config, onSave }: { isOpen: boolean, onClose: () => void, config: any, onSave: (newConfig: any) => void }) => {
  const [formData, setFormData] = useState(config);
  const [targetId, setTargetId] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneStep, setCloneStep] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => { 
    if (isOpen) setFormData(config); 
    setIsOnline(!!supabase);
  }, [isOpen, config]);

  /**
   * 核心「種植」函式：將雲端抓到的資料精準寫入手機 LocalStorage
   */
  const preheatLocalCache = (table: string, tripId: string, data: any[]) => {
    try {
      if (table === 'schedules') {
        // 分天種植
        for (let i = 0; i < 7; i++) {
          const dayData = data.filter(item => item.day_index === i);
          localStorage.setItem(`sched_${tripId}_day${i}`, JSON.stringify(dayData));
        }
        // 初始化預設查看天數
        localStorage.setItem(`last_day_${tripId}`, '0');
      } else if (table === 'planning_items') {
        // 分類種植
        ['todo', 'packing', 'shopping'].forEach(type => {
          const typeData = data.filter(item => item.type === type);
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
      console.error(`種植表 ${table} 失敗:`, e);
    }
  };

  /**
   * 切換並同步：將他人的行程資料「種植」到自己手機
   */
  const handleSwitchAndSync = async () => {
    if (!targetId || targetId.length < 5) return alert('請輸入有效的行程 ID');
    if (!supabase) return alert('雲端未連線，無法同步');
    
    setCloning(true);
    setCloneStep('正在從雲端下載全量資料...');
    
    try {
      const tables = ['schedules', 'bookings', 'planning_items', 'expenses', 'journals', 'members'];
      for (const table of tables) {
        setCloneStep(`正在同步: ${table}...`);
        const { data, error } = await supabase.from(table).select('*').eq('trip_id', targetId);
        if (!error && data) {
          preheatLocalCache(table, targetId, data);
        }
      }

      // 嘗試推斷一個適合的標題 (例如使用第一個行程的標題，或預設)
      const newConfig = { 
        ...DEFAULT_CONFIG, 
        id: targetId, 
        title: "已載入的行程" 
      };
      
      localStorage.setItem('trip_config', JSON.stringify(newConfig));
      alert('✨ 全量資料已「種植」成功！手機現在可以離線查看了。');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('同步失敗，請檢查網路或 ID。');
    } finally {
      setCloning(false);
    }
  };

  /**
   * 深度克隆並種植：建立雲端副本的同時，同步寫入手機本地
   */
  const performDeepClone = async (sourceId: string, customTitle?: string) => {
    if (!supabase) return alert('雲端未連線');
    setCloning(true);
    
    const newId = `trip-${Math.random().toString(36).substr(2, 9)}`;
    const tables = ['schedules', 'bookings', 'planning_items', 'expenses', 'journals', 'members'];
    
    try {
      for (const table of tables) {
        setCloneStep(`讀取來源: ${table}...`);
        const { data, error } = await supabase.from(table).select('*').eq('trip_id', sourceId);
        if (error) throw error;
        
        if (data && data.length > 0) {
          setCloneStep(`建立副本並種植: ${table}...`);
          
          // ID 映射（解決清單父子項指向問題）
          const idMap = new Map();
          const newData = data.map(item => {
            const oldId = item.id;
            const newRecordId = `${table.slice(0,2)}-${Math.random().toString(36).substr(2, 9)}`;
            idMap.set(oldId, newRecordId);
            
            const { id, ...rest } = item;
            return {
              ...rest,
              id: newRecordId,
              trip_id: newId,
              created_at: new Date().toISOString()
            };
          });

          const finalData = table === 'planning_items' 
            ? newData.map(item => ({
                ...item,
                parent_id: item.parent_id ? (idMap.get(item.parent_id) || null) : null
              }))
            : newData;
          
          // 雙重操作：1. 寫入雲端 2. 種植到手機本地
          await supabase.from(table).insert(finalData);
          preheatLocalCache(table, newId, finalData);
        }
      }

      const newConfig = { 
        ...formData, 
        id: newId, 
        title: customTitle || `${formData.title} (副本)` 
      };
      
      localStorage.setItem('trip_config', JSON.stringify(newConfig));
      alert(`🎉 克隆成功！\n專屬 ID: ${newId}\n資料已同步至手機緩存。`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('克隆過程中發生錯誤。');
    } finally {
      setCloning(false);
      setCloneStep('');
    }
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto relative border-t-8 border-journey-green">
        {cloning && (
          <div className="absolute inset-0 z-[300] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center space-y-6">
             <div className="relative">
               <div className="animate-spin text-journey-green"><RefreshCw size={64} /></div>
               <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-journey-green/20" size={24} />
             </div>
             <div className="text-center px-10">
               <p className="font-black text-journey-brown text-xl mb-1">正在全量同步中...</p>
               <p className="text-sm font-bold text-journey-brown/40 animate-pulse">{cloneStep}</p>
             </div>
          </div>
        )}
        
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">行程同步與模版</h3>
            <div className="flex items-center gap-2 mt-1">
               {isOnline ? <Wifi size={12} className="text-journey-green"/> : <WifiOff size={12} className="text-journey-red"/>}
               <span className={`text-[10px] font-black uppercase ${isOnline ? 'text-journey-green' : 'text-journey-red'}`}>
                 {isOnline ? 'Cloud Sync Active' : 'Offline Mode'}
               </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-journey-cream rounded-full text-journey-brown/20"><X size={20} /></button>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-journey-brown/30 ml-3 uppercase tracking-widest">目前行程名稱</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none border-4 border-transparent focus:border-journey-green/20" />
          </div>

          <div className="p-6 bg-journey-accent/10 rounded-[2.5rem] border-4 border-journey-accent/20 space-y-4">
              <div className="flex items-center gap-2 text-journey-brown">
                <Download size={18} className="text-journey-brown/40" />
                <p className="text-[10px] font-black uppercase tracking-widest">匯入他人行程模版</p>
              </div>
              <input 
                placeholder="貼上模版 ID..." 
                value={targetId} 
                onChange={e => setTargetId(e.target.value)} 
                className="w-full bg-white p-4 rounded-2xl text-xs font-black focus:outline-none border-2 border-journey-accent/10 focus:border-journey-accent/40" 
              />
              <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleSwitchAndSync} className="py-4 bg-white border-2 border-journey-accent text-journey-brown rounded-2xl font-black text-[10px] uppercase tracking-tighter active:scale-95">僅切換查看</button>
                  <button onClick={() => {
                    if (!targetId) return alert('請輸入模版 ID');
                    if (confirm(`確定要匯入並建立您的專屬副本嗎？`)) {
                      performDeepClone(targetId, "匯入的夢幻行程");
                    }
                  }} className="py-4 bg-journey-accent text-journey-brown rounded-2xl font-black text-[10px] uppercase tracking-tighter shadow-soft-sm active:scale-95">建立我的副本</button>
              </div>
          </div>

          <div className="p-6 bg-journey-blue/5 rounded-[2.5rem] border-4 border-journey-blue/10 space-y-4">
            <h4 className="text-xs font-black text-journey-blue flex items-center gap-2 uppercase tracking-wider"><Share2 size={16}/> 分享我的 ID</h4>
            <div className="flex gap-2 bg-white p-2 rounded-2xl border-2 border-journey-blue/5">
                <input readOnly value={config.id} className="flex-grow bg-transparent px-3 py-2 font-mono text-xs font-black text-journey-blue focus:outline-none" />
                <button onClick={() => { navigator.clipboard.writeText(config.id); alert('ID 已複製！'); }} className="p-3 bg-journey-blue text-white rounded-xl active:scale-90 transition-transform"><Copy size={16}/></button>
            </div>
            <button 
              onClick={() => performDeepClone(config.id)}
              disabled={cloning}
              className="w-full bg-white border-2 border-journey-blue/30 text-journey-blue py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <MousePointer2 size={12} /> 備份目前行程為新副本
            </button>
          </div>
        </div>

        <button onClick={() => { onSave(formData); onClose(); }} className="w-full bg-journey-brown text-white font-black py-6 rounded-[2.5rem] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
          <Save size={22} />
          <span className="text-lg">儲存並返回</span>
        </button>
      </div>
    </div>
  );
};

const Header = ({ tripConfig, onOpenSettings }: { tripConfig: any, onOpenSettings: () => void }) => {
  return (
    <header className="px-6 pt-12 pb-8 flex justify-between items-start relative z-10">
      <div className="space-y-1">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-journey-green rounded-[1.5rem] flex items-center justify-center text-white shadow-soft -rotate-6 transition-transform hover:rotate-0 border-4 border-white">
            <Plane size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-journey-brown italic tracking-tighter leading-none mb-1">{tripConfig.title}</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-journey-green rounded-full animate-pulse"></div>
              <p className="text-[10px] font-black text-journey-brown/40 uppercase tracking-[0.2em]">{tripConfig.dateRange}</p>
            </div>
          </div>
        </div>
      </div>
      <button 
        onClick={onOpenSettings}
        className="w-14 h-14 bg-white/80 backdrop-blur-md rounded-[1.5rem] shadow-soft flex items-center justify-center text-journey-brown/30 hover:text-journey-brown transition-all active:scale-90 border-4 border-white group"
      >
        <Settings2 size={26} className="group-hover:rotate-45 transition-transform" />
      </button>
    </header>
  );
};

const LoadingScreen = () => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-sky-400 overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 animate-float opacity-80"><Cloud className="text-white" size={48} fill="white" /></div>
      <div className="absolute top-1/3 right-1/4 animate-bounce-slow opacity-60 scale-75" style={{ animationDelay: '1s' }}><Cloud className="text-white" size={60} fill="white" /></div>
      <div className="absolute bottom-1/4 left-1/3 animate-float opacity-70 scale-50" style={{ animationDelay: '2s' }}><Cloud className="text-white" size={40} fill="white" /></div>
      <div className="absolute top-1/2 right-10 animate-bounce-slow opacity-40 scale-90" style={{ animationDelay: '0.5s' }}><Cloud className="text-white" size={50} fill="white" /></div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="bg-white/20 p-10 rounded-full backdrop-blur-md animate-pulse mb-8 border-4 border-white/10">
           <div className="animate-float">
             <Plane className="text-white rotate-45 drop-shadow-xl" size={100} fill="white" />
           </div>
        </div>
        
        <div className="flex gap-1.5">
          {"快樂旅程準備中。。。".split("").map((char, i) => (
            <span 
              key={i} 
              className="text-white text-2xl font-black italic drop-shadow-lg animate-bounce-slow inline-block"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {char}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute bottom-16 flex flex-col items-center gap-4 opacity-40">
         <div className="flex gap-4">
           <div className="h-1.5 w-24 bg-white rounded-full animate-pulse"></div>
           <div className="h-1.5 w-10 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
           <div className="h-1.5 w-16 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
         </div>
         <p className="text-[10px] text-white font-black uppercase tracking-[0.3em]">Tabi-Kuma Flight 2025</p>
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
      setTimeout(() => setInitializing(false), 2000);
    });
  }, [tripConfig, currentBg]);

  if (initializing) return <LoadingScreen />;

  return (
    <div className="min-h-screen pb-32">
      <Header tripConfig={tripConfig} onOpenSettings={() => setShowSettings(true)} />
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
      <TripSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={tripConfig} onSave={(cfg) => setTripConfig(cfg)} />
      
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[350px] bg-white/90 backdrop-blur-2xl px-2 py-3 z-50 rounded-[3rem] shadow-2xl border-4 border-white flex justify-around items-center">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.includes(item.id);
          return (
            <button key={item.id} onClick={() => window.location.hash = `#/${item.id}`} className={`relative w-12 h-12 rounded-[1.8rem] flex flex-col items-center justify-center transition-all duration-300 ${isActive ? 'bg-journey-green text-white shadow-lg -translate-y-2 rotate-3' : 'text-journey-brown/20 hover:text-journey-brown/40'}`}>
              {item.icon}
              {isActive && <div className="absolute -bottom-1 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
