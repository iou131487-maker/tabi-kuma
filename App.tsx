
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
 * 原子鏡像寫入 v6.0：深度清理並精確重建 LocalStorage
 */
const atomicMirrorWrite = (tripId: string, allData: Record<string, any>) => {
  try {
    const tripInfo = allData.trips?.[0];
    if (!tripInfo) throw new Error("無主行程資料");

    // 1. 安全清理：先獲取所有鍵名，避免迭代中刪除導致的漏刪
    const prefixes = ['sched_', 'plan_', 'book_', 'exp_', 'jrnl_', 'mem_', 'last_day_', 'plan_last_tab_'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(k => {
      if (k.includes(tripId) || prefixes.some(p => k.startsWith(p))) {
        localStorage.removeItem(k);
      }
    });

    // 2. 寫入主行程配置
    localStorage.setItem('trip_config', JSON.stringify({
      id: tripId,
      title: tripInfo.title,
      dateRange: tripInfo.date_range,
      userAvatar: DEFAULT_CONFIG.userAvatar
    }));

    // 3. 恢復行程 (Schedules)：依據 day_index 分組存入對應的 Day 鍵值
    if (Array.isArray(allData.schedules)) {
      const groups: Record<number, any[]> = {};
      allData.schedules.forEach((s: any) => {
        const d = s.day_index ?? 0;
        groups[d] = groups[d] || [];
        groups[d].push(s);
      });
      Object.entries(groups).forEach(([idx, items]) => {
        localStorage.setItem(`sched_${tripId}_day${idx}`, JSON.stringify(items));
      });
    }

    // 4. 恢復準備清單 (Planning)：依據 type 分撥至 todo, packing, shopping
    if (Array.isArray(allData.planning_items)) {
      ['todo', 'packing', 'shopping'].forEach(type => {
        const filtered = allData.planning_items.filter((p: any) => p.type === type);
        localStorage.setItem(`plan_${tripId}_${type}`, JSON.stringify(filtered));
      });
      localStorage.setItem(`plan_last_tab_${tripId}`, 'todo');
    }

    // 5. 恢復其他分頁：預訂、支出、日誌、成員
    const mapping: Record<string, string> = {
      'bookings': `book_${tripId}`,
      'expenses': `exp_${tripId}`,
      'journals': `jrnl_${tripId}`,
      'members': `mem_${tripId}`
    };

    Object.entries(mapping).forEach(([dbKey, localKey]) => {
      const data = allData[dbKey];
      if (data && Array.isArray(data)) {
        localStorage.setItem(localKey, JSON.stringify(data));
      }
    });

    localStorage.setItem(`mirror_sync_at`, new Date().toISOString());
    return true;
  } catch (e) {
    console.error("Critical Sync Error:", e);
    return false;
  }
};

const AutoSyncHandler = () => {
  const params = useParams();
  const location = useLocation();
  const searchId = new URLSearchParams(location.search).get('id');
  const id = searchId || params.id;
  const [status, setStatus] = useState<'check' | 'syncing' | 'success' | 'error'>('check');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const startSync = async () => {
    if (!id) { setErrorMessage("連結遺失行程 ID"); setStatus('error'); return; }
    setStatus('syncing'); setProgress(5);
    try {
      if (!supabase) throw new Error("雲端資料庫未就緒");
      
      const tables = ['trips', 'schedules', 'bookings', 'expenses', 'planning_items', 'members', 'journals'];
      const bundle: Record<string, any> = {};
      
      for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        const { data, error } = await supabase.from(t).select('*').eq(t === 'trips' ? 'id' : 'trip_id', id);
        if (error) throw new Error(`讀取 ${t} 失敗`);
        bundle[t] = data || [];
        setProgress(Math.round(5 + ((i + 1) / tables.length) * 95));
      }

      if (!bundle.trips?.length) throw new Error("找不到行程！請確認電腦端已執行「強力推送」。");
      
      if (atomicMirrorWrite(id, bundle)) {
        setStatus('success');
        setTimeout(() => { 
          window.location.replace(window.location.origin + window.location.pathname + "#/schedule"); 
          window.location.reload(); 
        }, 1500);
      } else {
        throw new Error("同步寫入失敗");
      }
    } catch (e: any) { 
      setErrorMessage(e.message); 
      setStatus('error'); 
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] bg-journey-cream flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl border-4 border-journey-green">
        <div className="w-20 h-20 bg-journey-green/10 rounded-3xl flex items-center justify-center text-journey-green mx-auto mb-6">
          <Download size={40} className={status === 'syncing' ? 'animate-bounce' : ''}/>
        </div>
        <h2 className="text-2xl font-black italic text-journey-brown mb-2">全量同步 v6.0</h2>
        {status === 'check' && (
          <div className="space-y-6">
            <p className="text-[11px] font-black opacity-40 italic leading-relaxed">即將下載：行程、標題、清單、機票、<br/>支出、成員、照片與日誌內容。</p>
            <button onClick={startSync} className="w-full py-6 bg-journey-green text-white rounded-[2rem] font-black shadow-xl active:scale-95 transition-all">開始鏡像克隆</button>
          </div>
        )}
        {status === 'syncing' && <p className="text-sm font-black italic animate-pulse">正在搬運中... {progress}%</p>}
        {status === 'success' && <p className="text-lg font-black text-journey-green animate-bounce">同步大成功 ✨</p>}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="bg-journey-red/5 p-4 rounded-2xl text-[10px] font-black text-journey-red leading-relaxed">{errorMessage}</div>
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
      {dbReady === false && !location.pathname.includes('/sync') && (
        <div className="fixed top-0 left-0 w-full bg-journey-red text-white pt-12 pb-3 px-6 z-[2000] text-[10px] font-black uppercase flex justify-between items-center shadow-xl">
           <span>資料庫未連線</span>
           <button onClick={() => setShowSettings(true)} className="underline">檢查設定</button>
        </div>
      )}

      <header className={`px-6 pt-16 pb-8 flex justify-between items-start relative z-10 ${dbReady === false ? 'mt-10' : ''}`}>
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
          <Route path="/sync/:id" element={<AutoSyncHandler />} />
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
    <p className="mt-8 text-xl font-black italic tracking-tighter">Tabi-Kuma v6.0...</p>
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
    setLog(["開始全量同步..."]);
    const finalDateRange = `${startDate} ~ ${endDate}`;
    const finalConfig = { ...formData, id: config.id, dateRange: finalDateRange };
    
    try {
      // 1. 推送主表
      setLog(prev => [...prev, "📤 上傳主行程配置..."]);
      const { error: tripErr } = await supabase.from('trips').upsert({ id: config.id, title: formData.title, date_range: finalDateRange });
      if (tripErr) throw tripErr;

      // 2. 推送行程細節 (Day 0~31)
      setLog(prev => [...prev, "📤 上傳每日行程..."]);
      for (let d = 0; d < 32; d++) {
        const data = localStorage.getItem(`sched_${config.id}_day${d}`);
        if (data) {
          const parsed = JSON.parse(data).map((item: any) => ({ ...item, trip_id: config.id, day_index: d }));
          if (parsed.length > 0) await supabase.from('schedules').upsert(parsed);
        }
      }

      // 3. 推送準備清單 (Todo/Packing/Shopping)
      setLog(prev => [...prev, "📤 上傳準備清單..."]);
      const planTypes = ['todo', 'packing', 'shopping'] as const;
      for (const pt of planTypes) {
        const data = localStorage.getItem(`plan_${config.id}_${pt}`);
        if (data) {
          const parsed = JSON.parse(data).map((item: any) => ({ ...item, trip_id: config.id, type: pt }));
          if (parsed.length > 0) await supabase.from('planning_items').upsert(parsed);
        }
      }

      // 4. 推送其餘分頁
      const others = [
        { t: 'bookings', k: `book_${config.id}`, n: "機票預訂" },
        { t: 'expenses', k: `exp_${config.id}`, n: "記帳支出" },
        { t: 'journals', k: `jrnl_${config.id}`, n: "照片日誌" },
        { t: 'members', k: `mem_${config.id}`, n: "成員名單" }
      ];

      for (const o of others) {
        setLog(prev => [...prev, `📤 上傳${o.n}...`]);
        const data = localStorage.getItem(o.k);
        if (data) {
          const parsed = JSON.parse(data).map((row: any) => ({ ...row, trip_id: config.id }));
          if (parsed.length > 0) await supabase.from(o.t).upsert(parsed);
        }
      }

      setLog(prev => [...prev, "✅ 所有頁面同步大成功！"]);
      alert("✅ 終極全量同步成功！\n\n您的所有頁面資料（包含照片）已安全上傳至雲端。手機端點擊連結即可同步。");
      onSave(finalConfig);
    } catch (e: any) { 
      setLog(prev => [...prev, "❌ 同步中斷: " + e.message]);
      alert("同步失敗: " + (e.message || "未知錯誤")); 
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
          <h3 className="text-2xl font-black italic text-journey-brown">旅程設定 v6.0</h3>
          <button onClick={onClose} className="p-2 bg-journey-cream rounded-full text-journey-brown/30"><X size={20}/></button>
        </div>

        <div className="flex-grow overflow-y-auto px-10 pb-10 space-y-6">
          <div className="p-6 bg-journey-green/10 rounded-[2.5rem] border-4 border-white shadow-soft-sm space-y-4">
            <p className="text-[10px] font-black text-journey-green uppercase tracking-widest">全量鏡像同步</p>
            <button onClick={handleForcePush} disabled={pushing} className="w-full py-5 rounded-2xl bg-white text-journey-green font-black shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all">
              {pushing ? <Loader2 className="animate-spin text-journey-green"/> : <CloudUpload className="text-journey-green"/>} 
              強力推送所有頁面資料
            </button>
            {log.length > 0 && (
              <div className="bg-white/50 p-4 rounded-xl text-[9px] font-mono text-journey-brown/60 space-y-1">
                {log.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase tracking-widest">行程名稱</label>
                <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none border-4 border-white shadow-inner" />
             </div>

             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase">開始日期</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none border-4 border-white text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase">結束日期</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none border-4 border-white text-xs" />
                </div>
             </div>
          </div>

          <button onClick={copyLink} className={`w-full py-6 rounded-[2rem] font-black text-xs transition-all flex items-center justify-center gap-2 ${copied ? 'bg-journey-green text-white' : 'bg-journey-brown/5 text-journey-brown'}`}>
            <LinkIcon size={18}/> {copied ? '克隆連結已複製！' : '產生手機克隆連結'}
          </button>
        </div>

        <div className="p-10 pt-4 pb-16 sm:pb-10 bg-white border-t border-journey-cream">
           <button onClick={handleForcePush} className="w-full bg-journey-brown text-white py-6 rounded-[2.5rem] font-black shadow-2xl active:scale-95 transition-all">儲存並全量同步</button>
        </div>
      </div>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
