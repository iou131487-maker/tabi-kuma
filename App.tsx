
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, supabase } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, Cloud, RefreshCw, Download, CheckCircle2, AlertCircle, Info, Link as LinkIcon, Calendar, ArrowRight, ShieldCheck, Wifi, Database, Search, Smartphone, Layers, Code, Terminal, ExternalLink, CloudUpload } from 'lucide-react';
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
 * v6.3 核心：全分頁精密還原邏輯
 * 確保從雲端下載的 Bundle 能精確拆解回 LocalStorage 的各個專屬鍵值
 */
const atomicMirrorWrite = (tripId: string, allData: Record<string, any>) => {
  try {
    const tripInfo = allData.trips?.[0];
    if (!tripInfo) throw new Error("無效的行程配置");

    // 1. 全域清理 (針對此行程 ID)
    const prefixes = ['sched_', 'plan_', 'book_', 'exp_', 'jrnl_', 'mem_', 'last_day_', 'plan_last_tab_', 'trip_config'];
    Object.keys(localStorage).forEach(k => {
      if (k.includes(tripId) || prefixes.some(p => k.startsWith(p))) {
        localStorage.removeItem(k);
      }
    });

    // 2. 寫入主配置
    localStorage.setItem('trip_config', JSON.stringify({
      id: tripId,
      title: tripInfo.title,
      dateRange: tripInfo.date_range,
      userAvatar: DEFAULT_CONFIG.userAvatar
    }));

    // 3. 行程分頁：按 day_index 分拆
    if (Array.isArray(allData.schedules)) {
      const scheduleMap: Record<number, any[]> = {};
      allData.schedules.forEach((s: any) => {
        const d = s.day_index ?? 0;
        scheduleMap[d] = scheduleMap[d] || [];
        scheduleMap[d].push(s);
      });
      Object.entries(scheduleMap).forEach(([day, items]) => {
        localStorage.setItem(`sched_${tripId}_day${day}`, JSON.stringify(items));
      });
    }

    // 4. 清單分頁：按 type (todo/packing/shopping) 分拆
    if (Array.isArray(allData.planning_items)) {
      ['todo', 'packing', 'shopping'].forEach(type => {
        const filtered = allData.planning_items.filter((p: any) => p.type === type);
        localStorage.setItem(`plan_${tripId}_${type}`, JSON.stringify(filtered));
      });
      localStorage.setItem(`plan_last_tab_${tripId}`, 'todo');
    }

    // 5. 其他單一頁面資料還原
    const directKeys: Record<string, string> = {
      'bookings': `book_${tripId}`,
      'expenses': `exp_${tripId}`,
      'journals': `jrnl_${tripId}`,
      'members': `mem_${tripId}`
    };

    Object.entries(directKeys).forEach(([dbKey, localKey]) => {
      const rows = allData[dbKey] || [];
      localStorage.setItem(localKey, JSON.stringify(rows));
    });

    return true;
  } catch (e) {
    console.error("Mirror Write Error:", e);
    return false;
  }
};

const AutoSyncHandler = () => {
  const location = useLocation();
  const [status, setStatus] = useState<'check' | 'syncing' | 'success' | 'error'>('check');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<Record<string, number>>({});

  const getTripId = () => {
    const hash = window.location.hash;
    const match = hash.match(/[?&]id=([^&/]+)/);
    if (match) return match[1];
    return new URLSearchParams(location.search).get('id');
  };

  const startSync = async () => {
    const id = getTripId();
    if (!id) { setErrorMessage("連結遺失 ID，請重新從電腦端複製。"); setStatus('error'); return; }
    
    setStatus('syncing'); setProgress(5);
    try {
      if (!supabase) throw new Error("資料庫未就緒");
      
      const tables = ['trips', 'schedules', 'bookings', 'expenses', 'planning_items', 'members', 'journals'];
      const bundle: Record<string, any> = {};
      const counts: Record<string, number> = {};

      for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        const { data, error } = await supabase.from(t).select('*').eq(t === 'trips' ? 'id' : 'trip_id', id);
        if (error) throw new Error(`${t} 下載失敗`);
        bundle[t] = data || [];
        counts[t] = bundle[t].length;
        setProgress(Math.round(5 + ((i + 1) / tables.length) * 85));
      }

      setStats(counts);
      if (!bundle.trips?.length) throw new Error("雲端找不到此行程，請確認電腦端已點擊「推送」。");

      if (atomicMirrorWrite(id, bundle)) {
        setProgress(100);
        setStatus('success');
        setTimeout(() => { 
          window.location.replace(window.location.origin + window.location.pathname + "#/schedule"); 
          window.location.reload(); 
        }, 2000);
      } else {
        throw new Error("本地存儲寫入異常");
      }
    } catch (e: any) { 
      setErrorMessage(e.message); 
      setStatus('error'); 
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-journey-cream flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl border-4 border-journey-green">
        <div className="w-20 h-20 bg-journey-green/10 rounded-3xl flex items-center justify-center text-journey-green mx-auto mb-6">
          <Download size={40} className={status === 'syncing' ? 'animate-bounce' : ''}/>
        </div>
        <h2 className="text-2xl font-black italic text-journey-brown mb-2">全頁面同步 v6.3</h2>
        
        {status === 'check' && (
          <div className="space-y-6">
            <p className="text-[11px] font-black opacity-40 px-4">
              即將克隆電腦端所有頁面資料：<br/>機票、支出、成員、清單、行程、日誌。
            </p>
            <button onClick={startSync} className="w-full py-6 bg-journey-green text-white rounded-[2rem] font-black shadow-xl active:scale-95 transition-all">開始 100% 鏡像克隆</button>
          </div>
        )}

        {status === 'syncing' && (
          <div className="space-y-4">
            <div className="w-full h-3 bg-journey-cream rounded-full overflow-hidden">
              <div className="h-full bg-journey-green transition-all" style={{width: `${progress}%`}} />
            </div>
            <p className="text-xs font-black italic">正在搬運雲端數據 {progress}%...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle2 size={40} className="text-journey-green mx-auto" />
            <p className="text-lg font-black text-journey-green">克隆成功！</p>
            <div className="bg-journey-cream p-4 rounded-2xl text-[9px] font-black text-journey-brown/50 text-left grid grid-cols-2 gap-y-1">
               <span>🗓️ 行程: {stats.schedules} 筆</span>
               <span>🎫 預訂: {stats.bookings} 筆</span>
               <span>💰 支出: {stats.expenses} 筆</span>
               <span>📝 清單: {stats.planning_items} 筆</span>
               <span>👥 成員: {stats.members} 筆</span>
               <span>📸 日誌: {stats.journals} 筆</span>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle size={40} className="text-journey-red mx-auto" />
            <p className="bg-journey-red/5 p-4 rounded-2xl text-[10px] font-black text-journey-red">{errorMessage}</p>
            <button onClick={() => setStatus('check')} className="w-full bg-journey-brown text-white py-4 rounded-3xl font-black">重新嘗試</button>
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
    const saved = localStorage.getItem('trip_config');
    return saved ? JSON.parse(saved) : { ...DEFAULT_CONFIG, id: `trip-${Math.random().toString(36).substr(2, 9)}` };
  });
  const location = useLocation();

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
    <div className="min-h-screen pb-44 flex flex-col">
      <header className={`px-6 pt-16 pb-8 flex justify-between items-start relative z-10`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-journey-green rounded-[1.5rem] flex items-center justify-center text-white shadow-soft -rotate-6 border-4 border-white"><Plane size={28} /></div>
          <div onClick={() => setShowSettings(true)} className="cursor-pointer">
            <h1 className="text-3xl font-black text-journey-brown italic tracking-tighter leading-none mb-1">{tripConfig.title}</h1>
            <p className="text-[9px] font-black text-journey-brown/40 uppercase tracking-[0.1em]">{tripConfig.dateRange}</p>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-14 h-14 bg-white/80 backdrop-blur-md rounded-[1.5rem] shadow-soft flex items-center justify-center text-journey-brown/30 border-4 border-white active:scale-90 transition-all"><Settings2 size={26} /></button>
      </header>

      <main className="px-6 flex-grow">
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
    <p className="mt-8 text-xl font-black italic tracking-tighter">Tabi-Kuma v6.3...</p>
  </div>
);

const TripSettingsModal = ({ isOpen, onClose, config, dbReady, onSave }: any) => {
  const [formData, setFormData] = useState(config);
  const [pushing, setPushing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const dates = config.dateRange.split(' ~ ');
  const [startDate, setStartDate] = useState(dates[0] || '2025-01-01');
  const [endDate, setEndDate] = useState(dates[1] || '2025-01-07');

  const handleForcePush = async () => {
    if (!supabase || dbReady === false) return alert("資料庫未連線");
    setPushing(true);
    setLog(["🚀 啟動 100% 全分頁強力同步..."]);
    const finalDateRange = `${startDate} ~ ${endDate}`;
    const finalConfig = { ...formData, id: config.id, dateRange: finalDateRange };
    
    try {
      // 1. 上傳配置
      setLog(prev => [...prev, "📦 [1/7] 上傳主行程配置..."]);
      await supabase.from('trips').upsert({ id: config.id, title: formData.title, date_range: finalDateRange });

      // 2. 行程 (Schedules) - 強制注入 trip_id 與 day_index
      setLog(prev => [...prev, "📦 [2/7] 強制注入『行程』數據..."]);
      const schedKeys = Object.keys(localStorage).filter(k => k.startsWith(`sched_${config.id}_day`));
      for (const k of schedKeys) {
        const dIdx = parseInt(k.split('_day')[1]);
        const data = JSON.parse(localStorage.getItem(k) || "[]");
        if (data.length > 0) {
          await supabase.from('schedules').upsert(data.map((i: any) => ({ ...i, trip_id: config.id, day_index: dIdx })));
        }
      }

      // 3. 清單 (Planning) - 強制注入 trip_id 與 type
      setLog(prev => [...prev, "📦 [3/7] 強制注入『準備清單』數據..."]);
      const planTypes = ['todo', 'packing', 'shopping'] as const;
      for (const pt of planTypes) {
        const data = JSON.parse(localStorage.getItem(`plan_${config.id}_${pt}`) || "[]");
        if (data.length > 0) {
          await supabase.from('planning_items').upsert(data.map((i: any) => ({ ...i, trip_id: config.id, type: pt })));
        }
      }

      // 4. 其餘頁面 - 強制注入 trip_id
      const pages = [
        { t: 'bookings', k: `book_${config.id}`, n: "預訂", s: "4/7" },
        { t: 'expenses', k: `exp_${config.id}`, n: "記帳", s: "5/7" },
        { t: 'journals', k: `jrnl_${config.id}`, n: "日誌", s: "6/7" },
        { t: 'members', k: `mem_${config.id}`, n: "成員", s: "7/7" }
      ];

      for (const p of pages) {
        setLog(prev => [...prev, `📦 [${p.s}] 強制注入『${p.n}』頁面數據...`]);
        const data = JSON.parse(localStorage.getItem(p.k) || "[]");
        if (data.length > 0) {
          await supabase.from(p.t).upsert(data.map((i: any) => ({ ...i, trip_id: config.id })));
        }
      }

      setLog(prev => [...prev, "✨ 所有頁面推送完成！"]);
      alert("✅ 電腦端資料已全量上傳！\n手機端現在可以完美克隆機票、記帳、成員與日誌。");
      onSave(finalConfig);
    } catch (e: any) { 
      setLog(prev => [...prev, "❌ 異常: " + e.message]);
      alert("同步異常: " + e.message); 
    } finally { 
      setPushing(false); 
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/sync?id=${config.id}`;
    navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[6000] bg-journey-brown/80 backdrop-blur-xl flex items-end sm:items-center justify-center animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[4rem] sm:rounded-[3.5rem] shadow-2xl flex flex-col max-h-[90vh] border-t-8 border-journey-green overflow-hidden">
        <div className="p-10 pb-6 flex justify-between items-center bg-white">
          <h3 className="text-2xl font-black italic text-journey-brown">同步中心 v6.3</h3>
          <button onClick={onClose} className="p-2 bg-journey-cream rounded-full text-journey-brown/30"><X size={20}/></button>
        </div>

        <div className="flex-grow overflow-y-auto px-10 pb-10 space-y-6">
          <div className="p-6 bg-journey-green/10 rounded-[2.5rem] border-4 border-white shadow-soft-sm space-y-4">
            <p className="text-[10px] font-black text-journey-green uppercase tracking-widest text-center">讓手機鏡像電腦數據</p>
            <button onClick={handleForcePush} disabled={pushing} className="w-full py-5 rounded-2xl bg-white text-journey-green font-black shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all">
              {pushing ? <Loader2 className="animate-spin"/> : <CloudUpload/>} 
              強力推送所有頁面數據
            </button>
            {log.length > 0 && (
              <div className="bg-white/50 p-4 rounded-xl text-[9px] font-mono text-journey-brown/60 space-y-1">
                {log.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase">行程名稱</label>
                <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none border-4 border-white" />
             </div>
             <div className="grid grid-cols-2 gap-3">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black border-4 border-white text-xs" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black border-4 border-white text-xs" />
             </div>
          </div>

          <button onClick={copyLink} className={`w-full py-6 rounded-[2rem] font-black text-xs transition-all flex items-center justify-center gap-2 ${copied ? 'bg-journey-green text-white' : 'bg-journey-brown/5 text-journey-brown'}`}>
            <LinkIcon size={18}/> {copied ? '克隆連結已複製！' : '產生手機克隆連結'}
          </button>
        </div>

        <div className="p-10 pt-4 pb-16 sm:pb-10 bg-white border-t border-journey-cream">
           <button onClick={onClose} className="w-full bg-journey-brown text-white py-6 rounded-[2.5rem] font-black shadow-2xl active:scale-95 transition-all">關閉中心</button>
        </div>
      </div>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
