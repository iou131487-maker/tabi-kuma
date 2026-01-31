
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, supabase } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, Cloud, RefreshCw, Download, CheckCircle2, AlertCircle, Info, Link as LinkIcon, Calendar } from 'lucide-react';
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

// 絕對成功的寫入邏輯
const atomicWriteToLocal = (tripId: string, allData: Record<string, any>) => {
  try {
    const tripInfo = allData.trips?.[0];
    if (tripInfo) {
      localStorage.setItem('trip_config', JSON.stringify({
        id: tripId,
        title: tripInfo.title,
        dateRange: tripInfo.date_range,
        userAvatar: DEFAULT_CONFIG.userAvatar
      }));
    }

    // 清除舊行程緩存 (重要：防止 ID 切換後殘留舊資料)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sched_') || key.startsWith('plan_') || key.startsWith('book_') || key.startsWith('exp_') || key.startsWith('jrnl_') || key.startsWith('mem_')) {
        localStorage.removeItem(key);
      }
    });

    if (allData.schedules) {
      const dayIndices = Array.from(new Set(allData.schedules.map((s: any) => s.day_index)));
      dayIndices.forEach(idx => {
        const dayData = allData.schedules.filter((s: any) => s.day_index === idx);
        localStorage.setItem(`sched_${tripId}_day${idx}`, JSON.stringify(dayData));
      });
    }

    if (allData.planning_items) {
      ['todo', 'packing', 'shopping'].forEach(type => {
        const typeData = allData.planning_items.filter((p: any) => p.type === type);
        localStorage.setItem(`plan_${tripId}_${type}`, JSON.stringify(typeData));
      });
    }

    if (allData.bookings) localStorage.setItem(`book_${tripId}`, JSON.stringify(allData.bookings));
    if (allData.expenses) localStorage.setItem(`exp_${tripId}`, JSON.stringify(allData.expenses));
    if (allData.journals) localStorage.setItem(`jrnl_${tripId}`, JSON.stringify(allData.journals));
    if (allData.members) localStorage.setItem(`mem_${tripId}`, JSON.stringify(allData.members));

    return true;
  } catch (e) {
    return false;
  }
};

// 自動同步頁面元件
const AutoSyncHandler = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'confirm' | 'syncing' | 'error'>('confirm');

  const startSync = async () => {
    if (!id || !supabase) return;
    setStatus('syncing');
    try {
      const tables = ['trips', 'schedules', 'bookings', 'planning_items', 'expenses', 'journals', 'members'];
      const bundle: Record<string, any> = {};
      for (const table of tables) {
        const { data } = await supabase.from(table).select('*').eq(table === 'trips' ? 'id' : 'trip_id', id);
        bundle[table] = data || [];
      }
      if (!bundle.trips.length) throw new Error("找不到該行程");
      atomicWriteToLocal(id, bundle);
      window.location.href = window.location.pathname + "#/schedule";
      window.location.reload();
    } catch (e) {
      alert("同步失敗，請確認 ID 是否正確");
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-journey-green flex flex-col items-center justify-center p-10 text-center text-white">
      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-bounce-slow">
        <Download size={48} />
      </div>
      <h2 className="text-3xl font-black italic mb-4">發現分享行程！</h2>
      <p className="text-sm opacity-80 mb-10 font-bold leading-relaxed">這將會覆蓋您手機目前的本地資料，<br/>並克隆與電腦端完全一致的行程。</p>
      
      {status === 'confirm' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={startSync} className="bg-white text-journey-green py-6 rounded-3xl font-black shadow-xl active:scale-95">立即開始克隆</button>
          <button onClick={() => navigate('/schedule')} className="text-white/60 font-black py-4">先不用，謝謝</button>
        </div>
      )}
      
      {status === 'syncing' && (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin" size={40} />
          <p className="font-black italic">雲端下載中...</p>
        </div>
      )}
    </div>
  );
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
    const initApp = async () => {
      await initSupabaseAuth();
      if (!hasSyncRef.current && supabase && tripConfig.id) {
        const { data } = await supabase.from('trips').select('*').eq('id', tripConfig.id);
        if (data && data.length > 0) {
          setTripConfig({
            ...tripConfig,
            title: data[0].title,
            dateRange: data[0].date_range
          });
        }
        hasSyncRef.current = true;
      }
      setInitializing(false);
    };
    initApp();
  }, [tripConfig.id]);

  useEffect(() => {
    setIsAnyModalOpen(showSettings || location.pathname.includes('/sync/'));
  }, [showSettings, location.pathname]);

  if (initializing) return <LoadingScreen />;

  return (
    <div className="min-h-screen pb-44">
      <header className="px-6 pt-12 pb-8 flex justify-between items-start relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-journey-green rounded-[1.5rem] flex items-center justify-center text-white shadow-soft -rotate-6 border-4 border-white"><Plane size={28} /></div>
          <div onClick={() => setShowSettings(true)} className="cursor-pointer">
            <h1 className="text-3xl font-black text-journey-brown italic tracking-tighter leading-none mb-1">{tripConfig.title}</h1>
            <div className="flex items-center gap-1">
              <Calendar size={10} className="text-journey-brown/40" />
              <p className="text-[9px] font-black text-journey-brown/40 uppercase tracking-[0.1em]">{tripConfig.dateRange}</p>
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-14 h-14 bg-white/80 backdrop-blur-md rounded-[1.5rem] shadow-soft flex items-center justify-center text-journey-brown/30 hover:text-journey-brown active:scale-90 border-4 border-white transition-all"><Settings2 size={26} /></button>
      </header>

      <main className="px-6 relative z-0">
        <Routes>
          <Route path="/sync/:id" element={<AutoSyncHandler />} />
          <Route path="/schedule" element={<ScheduleView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/bookings" element={<BookingsView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/expense" element={<ExpenseView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/journal" element={<JournalView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/planning" element={<PlanningView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/members" element={<MembersView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>

      <TripSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={tripConfig} onSave={(newConfig: any) => {
        setTripConfig(newConfig);
        localStorage.setItem('trip_config', JSON.stringify(newConfig));
      }} />
      
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
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-journey-cream text-journey-brown text-center p-10 overflow-hidden">
    <div className="relative">
      <div className="w-32 h-32 bg-journey-green rounded-[3rem] rotate-12 flex items-center justify-center shadow-xl animate-bounce-slow">
        <Plane size={64} className="text-white -rotate-12" />
      </div>
    </div>
    <p className="mt-10 text-2xl font-black italic tracking-tighter">準備您的旅程中...</p>
    <p className="mt-2 text-xs font-bold opacity-30 uppercase tracking-[0.4em]">Tabi-Kuma: Dream Traveler</p>
  </div>
);

const TripSettingsModal = ({ isOpen, onClose, config, onSave }: any) => {
  const [formData, setFormData] = useState(config);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // 修改日期處理邏輯
  const startDate = config.dateRange.split(' ~ ')[0] || '';
  const endDate = config.dateRange.split(' ~ ')[1] || '';

  const copySyncLink = () => {
    const syncUrl = `${window.location.origin}${window.location.pathname}#/sync/${config.id}`;
    navigator.clipboard.writeText(syncUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleUpdateTrip = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        id: config.id,
        title: formData.title,
        date_range: formData.dateRange
      };
      if (supabase) {
        await supabase.from('trips').upsert(payload);
      }
      onSave(formData);
      onClose();
    } catch (e) {
      alert("儲存失敗");
    } finally {
      setIsProcessing(false);
    }
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[999] bg-journey-brown/70 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[4rem] sm:rounded-5xl p-10 pb-32 shadow-2xl space-y-8 relative overflow-y-auto max-h-[95vh] border-t-8 border-journey-green">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black italic">旅程設定</h3>
          <button onClick={onClose} className="p-2 bg-journey-cream rounded-full"><X size={20} className="text-journey-brown/30" /></button>
        </div>

        {/* 懶人同步連結區 */}
        <div className="p-6 bg-journey-blue/10 rounded-[2.5rem] border-4 border-white shadow-soft-sm space-y-4">
           <div>
             <p className="text-[10px] font-black text-journey-blue uppercase tracking-widest">懶人同步法 (最推薦！)</p>
             <p className="text-[8px] font-bold text-journey-blue/50 italic leading-tight">在電腦點擊複製連結，傳到手機點開，App 會自動克隆所有資料。</p>
           </div>
           <button onClick={copySyncLink} className={`w-full py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all ${shareCopied ? 'bg-journey-darkGreen text-white' : 'bg-white text-journey-blue shadow-sm border-2 border-journey-blue/10 active:scale-95'}`}>
             {shareCopied ? <><CheckCircle2 size={18}/> 連結已複製，快傳給手機！</> : <><LinkIcon size={18}/> 複製全自動同步連結</>}
           </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase tracking-widest">行程名稱</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none border-4 border-white shadow-inner" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase tracking-widest">行程日期範圍 (起 ~ 訖)</label>
            <div className="flex items-center gap-2">
               <input type="date" value={startDate} onChange={e => setFormData({...formData, dateRange: `${e.target.value} ~ ${endDate}`})} className="flex-1 bg-journey-cream p-4 rounded-2xl font-black text-xs border-4 border-white" />
               <span className="text-journey-brown/20 font-black">~</span>
               <input type="date" value={endDate} onChange={e => setFormData({...formData, dateRange: `${startDate} ~ ${e.target.value}`})} className="flex-1 bg-journey-cream p-4 rounded-2xl font-black text-xs border-4 border-white" />
            </div>
          </div>
        </div>

        <button onClick={handleUpdateTrip} disabled={isProcessing} className="w-full bg-journey-brown text-white py-6 rounded-[2.5rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
          {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> 儲存並同步至雲端</>}
        </button>

        <div className="pt-4 text-center">
          <p className="text-[8px] font-black text-journey-brown/20 uppercase tracking-[0.3em]">Device ID: {config.id}</p>
        </div>
      </div>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
