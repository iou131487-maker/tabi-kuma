
import React, { useEffect, useState, useCallback, useRef } from 'react';
// Updated imports from react-router-dom to match v6.x standard exports and remove unused useParams/useNavigate
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS, safeJSONParse, tryParseJSON, PAGE_BACKGROUNDS } from './constants';
import { initSupabaseAuth, supabase } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, Cloud, RefreshCw, Download, CheckCircle2, AlertCircle, Info, Link as LinkIcon, Calendar, ArrowRight, ShieldCheck, Wifi, Database, Search, Smartphone, Layers, Code, Terminal, ExternalLink, CloudUpload, RotateCcw } from 'lucide-react';
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

/**
 * v7.3.5 鏡像寫入引擎
 * 確保下載時完全覆蓋本地所有分頁資料
 */
const atomicMirrorWrite = (tripId: string, allData: Record<string, any>) => {
  if (!tripId || !allData) return false;
  try {
    const tripInfo = allData.trips?.[0];
    const safeTitle = tripInfo?.title || "已同步模版";
    const safeDate = tripInfo?.date_range || "2025-01-01 ~ 2025-01-07";

    localStorage.setItem('trip_config', JSON.stringify({
      id: tripId, title: safeTitle, dateRange: safeDate, userAvatar: DEFAULT_CONFIG.userAvatar
    }));
    
    localStorage.setItem(`cloned_lock_${tripId}`, (Date.now() + 600000).toString());

    // 行程
    const schedules = Array.isArray(allData.schedules) ? allData.schedules : [];
    const scheduleMap: Record<string, any[]> = {};
    schedules.forEach((s: any) => {
      const key = `sched_${tripId}_day${s.day_index || 0}`;
      scheduleMap[key] = scheduleMap[key] || [];
      scheduleMap[key].push(s);
    });
    Object.keys(localStorage).filter(k => k.startsWith(`sched_${tripId}_day`)).forEach(k => localStorage.removeItem(k));
    Object.entries(scheduleMap).forEach(([key, val]) => localStorage.setItem(key, JSON.stringify(val)));

    // 清單
    const plans = Array.isArray(allData.planning_items) ? allData.planning_items : [];
    ['todo', 'packing', 'shopping'].forEach(type => {
      const filtered = plans.filter((p: any) => p.type === type);
      localStorage.setItem(`plan_${tripId}_${type}`, JSON.stringify(filtered));
    });

    // 預訂、開支、日記、成員
    const mappings: Record<string, string> = {
      'bookings': `book_${tripId}`,
      'expenses': `exp_${tripId}`,
      'journals': `jrnl_${tripId}`,
      'members': `mem_${tripId}`
    };
    Object.entries(mappings).forEach(([dbKey, localKey]) => {
      const items = Array.isArray(allData[dbKey]) ? allData[dbKey] : [];
      localStorage.setItem(localKey, JSON.stringify(items));
    });

    return true;
  } catch (e) {
    console.error("[Mirror Write Error]", e);
    return false;
  }
};

const AutoSyncHandler = () => {
  const [status, setStatus] = useState<'check' | 'syncing' | 'success' | 'error'>('check');
  const [errorMessage, setErrorMessage] = useState('');

  const getTripId = () => {
    try {
      const hash = window.location.hash || "";
      const queryString = hash.includes('?') ? hash.split('?')[1] : "";
      const params = new URLSearchParams(queryString || window.location.search);
      return params.get('id');
    } catch(e) { return null; }
  };

  const startSync = async () => {
    const id = getTripId();
    if (!id) { setErrorMessage("URL 參數錯誤"); setStatus('error'); return; }
    setStatus('syncing');
    try {
      if (!supabase) throw new Error("資料庫連結失敗");
      const tables = ['trips', 'schedules', 'bookings', 'expenses', 'planning_items', 'members', 'journals'];
      const bundle: Record<string, any> = {};
      for (const t of tables) {
        const queryField = t === 'trips' ? 'id' : 'trip_id';
        const { data, error } = await supabase.from(t).select('*').eq(queryField, id);
        if (error) throw error;
        bundle[t] = data || [];
      }
      if (bundle.trips.length === 0) throw new Error("雲端找不到此行程");
      if (atomicMirrorWrite(id, bundle)) {
        setStatus('success');
        setTimeout(() => { 
          window.location.href = window.location.origin + window.location.pathname + "#/schedule";
          window.location.reload(); 
        }, 1500);
      } else {
        throw new Error("寫入失敗");
      }
    } catch (e: any) { setErrorMessage(e.message); setStatus('error'); }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-journey-cream flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl border-4 border-journey-green animate-in zoom-in-90 duration-300">
        <div className="w-24 h-24 bg-journey-green/10 rounded-[2.5rem] flex items-center justify-center text-journey-green mx-auto mb-8">
          <Download size={48} className="animate-bounce" />
        </div>
        <h2 className="text-3xl font-black italic text-journey-brown mb-4 tracking-tighter">開始同步</h2>
        <p className="text-[10px] font-black text-journey-brown/30 mb-8 uppercase">準備將電腦資料克隆至手機</p>
        {status === 'check' && (
          <button onClick={startSync} className="w-full py-6 bg-journey-green text-white rounded-[2rem] font-black shadow-xl active:scale-95 transition-all text-lg">確認下載並覆蓋</button>
        )}
        {status === 'syncing' && <p className="text-journey-green font-black animate-pulse">正在同步雲端模版...</p>}
        {status === 'success' && <p className="text-journey-green font-black">✨ 同步成功！即刻進入</p>}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-journey-red/5 p-4 rounded-2xl text-journey-red font-black text-[10px]">{errorMessage}</div>
            <button onClick={() => setStatus('check')} className="w-full bg-journey-brown text-white py-4 rounded-3xl font-black">重試</button>
          </div>
        )}
      </div>
    </div>
  );
};

const AppContent = () => {
  const [initializing, setInitializing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false); 
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [tripConfig, setTripConfig] = useState(() => {
    return safeJSONParse('trip_config', { ...DEFAULT_CONFIG, id: `trip-${Math.random().toString(36).substr(2, 9)}` });
  });
  const location = useLocation();

  const currentBg = PAGE_BACKGROUNDS[Object.keys(PAGE_BACKGROUNDS).find(path => location.pathname.startsWith(path)) || ''] || 'bg-journey-cream';

  // [重整即更新核心]：當手機重新整理，檢查雲端是否有更新的主行程資訊
  useEffect(() => {
    const syncGlobalConfig = async () => {
      if (!supabase || !tripConfig.id) return;
      try {
        const { data, error } = await supabase.from('trips').select('*').eq('id', tripConfig.id).single();
        if (data && !error) {
          const newConfig = { ...tripConfig, title: data.title, dateRange: data.date_range };
          if (JSON.stringify(newConfig) !== JSON.stringify(tripConfig)) {
            setTripConfig(newConfig);
            localStorage.setItem('trip_config', JSON.stringify(newConfig));
            console.log("Trip Config Auto-Updated from Cloud.");
          }
        }
      } catch(e) {}
    };
    if (!initializing) syncGlobalConfig();
  }, [initializing, tripConfig.id]);

  useEffect(() => {
    const initApp = async () => {
      await initSupabaseAuth();
      if (supabase && tripConfig.id) {
        try {
          const { error } = await supabase.from('trips').select('id').limit(1);
          setDbReady(!(error && error.message.includes('not find')));
        } catch(e) { setDbReady(false); }
      }
      setInitializing(false);
    };
    initApp();
  }, [tripConfig.id]);

  useEffect(() => { setIsAnyModalOpen(showSettings || location.pathname.includes('/sync')); }, [showSettings, location.pathname]);

  if (initializing) return <LoadingScreen />;

  return (
    <div className={`min-h-screen pb-44 flex flex-col relative z-0 transition-colors duration-1000 ${currentBg}`}>
      <header className="px-6 pt-16 pb-8 flex justify-between items-start relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-journey-green rounded-[1.5rem] flex items-center justify-center text-white shadow-soft -rotate-6 border-4 border-white"><Plane size={28} /></div>
          <div onClick={() => setShowSettings(true)} className="cursor-pointer">
            <h1 className="text-3xl font-black text-journey-brown italic tracking-tighter mb-1">{tripConfig.title}</h1>
            <p className="text-[9px] font-black text-journey-brown/40 uppercase tracking-[0.1em]">{tripConfig.dateRange}</p>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-14 h-14 bg-white/80 backdrop-blur-md rounded-[1.5rem] shadow-soft flex items-center justify-center text-journey-brown/30 border-4 border-white active:scale-90 transition-all"><Settings2 size={26} /></button>
      </header>

      <main className="px-6 flex-grow relative z-10">
        <Routes>
          <Route path="/sync" element={<AutoSyncHandler />} />
          <Route path="/schedule" element={<ScheduleView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/bookings" element={<BookingsView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/expense" element={<ExpenseView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/journal" element={<JournalView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/planning" element={<PlanningView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/members" element={<MembersView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>

      <TripSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={tripConfig} dbReady={dbReady} onSave={(newConfig: any) => {
        setTripConfig(newConfig);
        localStorage.setItem('trip_config', JSON.stringify(newConfig));
      }} />
      
      {!isAnyModalOpen && (
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[350px] bg-white/90 backdrop-blur-2xl px-2 py-3 z-[100] rounded-[3rem] shadow-2xl border-4 border-white flex justify-around items-center">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.includes(item.id);
            return (
              <button key={item.id} onClick={() => window.location.hash = `#/${item.id}`} className={`relative w-12 h-12 rounded-[1.8rem] flex flex-col items-center justify-center transition-all ${isActive ? 'bg-journey-green text-white shadow-lg -translate-y-2 scale-110' : 'text-journey-brown/20'}`}>{item.icon}</button>
            );
          })}
        </nav>
      )}
    </div>
  );
};

const LoadingScreen = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-journey-cream text-journey-brown p-10">
    <div className="w-24 h-24 bg-journey-green rounded-[2.5rem] flex items-center justify-center shadow-xl animate-bounce-slow"><Plane size={48} className="text-white"/></div>
    <p className="mt-8 text-xl font-black italic tracking-tighter">Tabi-Kuma v7.3.5...</p>
  </div>
);

const TripSettingsModal = ({ isOpen, onClose, config, dbReady, onSave }: any) => {
  const [formData, setFormData] = useState(config);
  const [pushing, setPushing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const dates = (formData.dateRange || config.dateRange).split(' ~ ');
  const [startDate, setStartDate] = useState(dates[0] || '2025-01-01');
  const [endDate, setEndDate] = useState(dates[1] || '2025-01-07');

  const handleForcePush = async () => {
    if (!supabase || dbReady === false) return alert("資料庫尚未就緒");
    setPushing(true);
    setLog(["🚀 正在封裝 6 個頁面資料..."]);
    const finalDateRange = `${startDate} ~ ${endDate}`;
    try {
      await supabase.from('trips').upsert({ id: config.id, title: formData.title, date_range: finalDateRange });
      const tables = [
        { name: 'schedules', prefix: `sched_${config.id}_day` },
        { name: 'planning_items', prefix: `plan_${config.id}_` },
        { name: 'bookings', key: `book_${config.id}` },
        { name: 'expenses', key: `exp_${config.id}` },
        { name: 'journals', key: `jrnl_${config.id}` },
        { name: 'members', key: `mem_${config.id}` }
      ];
      for (const t of tables) {
        let allData: any[] = [];
        if (t.prefix) {
          Object.keys(localStorage).filter(k => k.startsWith(t.prefix!)).forEach(k => {
            const data = safeJSONParse(k, []);
            if (Array.isArray(data)) allData = [...allData, ...data];
          });
        } else if (t.key) {
          allData = safeJSONParse(t.key, []);
        }
        if (allData.length > 0) {
          const sanitized = allData.map(item => {
             const { created_at, ...rest } = item;
             return { ...rest, trip_id: config.id };
          });
          await supabase.from(t.name).upsert(sanitized);
        }
      }
      alert("✨ 電腦端更新成功！\n現在手機只需重整頁面，即可看到最新內容。");
      onSave({ ...formData, dateRange: finalDateRange });
    } catch (e: any) { alert("同步失敗: " + e.message); } finally { setPushing(false); }
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/sync?id=${config.id}`;
    navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[6000] bg-journey-brown/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-2xl flex flex-col max-h-[85vh] border-t-8 border-journey-green overflow-hidden">
        <div className="p-10 pb-6 flex justify-between items-center">
          <h3 className="text-2xl font-black italic text-journey-brown tracking-tighter">同步與設定</h3>
          <button onClick={onClose} className="p-2 bg-journey-cream rounded-full text-journey-brown/30"><X size={20}/></button>
        </div>
        <div className="flex-grow overflow-y-auto px-10 pb-10 space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-journey-brown/30 ml-3 uppercase">行程名稱</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[1.8rem] font-black focus:outline-none border-4 border-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl font-black text-xs border-4 border-white" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl font-black text-xs border-4 border-white" />
          </div>
          <div className="p-8 bg-journey-green/10 rounded-[2.5rem] border-4 border-white shadow-soft-sm space-y-4">
            <button onClick={handleForcePush} disabled={pushing} className="w-full py-6 rounded-2xl bg-white text-journey-green font-black shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
              {pushing ? <Loader2 className="animate-spin" size={24}/> : <CloudUpload size={24}/>} 上傳電腦資料
            </button>
            <button onClick={copyLink} className={`w-full py-6 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all border-4 ${copied ? 'bg-journey-green text-white border-white shadow-md' : 'bg-journey-cream text-journey-brown border-white'}`}>
              <LinkIcon size={20}/> {copied ? '連結已複製！' : '複製克隆連結'}
            </button>
          </div>
        </div>
        <div className="p-10 pt-4 pb-12 bg-white border-t border-journey-cream">
           <button onClick={onClose} className="w-full bg-journey-brown text-white py-6 rounded-[2.5rem] font-black">完成</button>
        </div>
      </div>
    </div>
  );
};

// Use HashRouter directly instead of aliased Router for better compatibility with downgraded v6.x
export default function App() { return <HashRouter><AppContent /></HashRouter>; }
