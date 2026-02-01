
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
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

// 工具：移除物件中的 undefined 屬性
const sanitizeForUpload = (data: any[]) => {
  return data.map(item => JSON.parse(JSON.stringify(item, (key, value) => 
    value === undefined ? null : value
  )));
};

/**
 * v7.2 終極鏡像寫入引擎
 * 確保 6 個分頁的所有 Key 被手機端強制覆蓋，並建立緊急還原點
 */
const atomicMirrorWrite = (tripId: string, allData: Record<string, any>) => {
  try {
    const tripInfo = allData.trips?.[0];
    const safeTitle = tripInfo?.title || "已克隆的行程";
    const safeDate = tripInfo?.date_range || "2025-01-01 ~ 2025-01-07";

    console.log(`[Mirror] Writing data for Trip ID: ${tripId}`);

    // 0. 建立完整備份還原點 (Emergency Restore Point)
    localStorage.setItem(`backup_full_bundle_${tripId}`, JSON.stringify(allData));

    // 1. 寫入主配置
    localStorage.setItem('trip_config', JSON.stringify({
      id: tripId,
      title: safeTitle,
      dateRange: safeDate,
      userAvatar: DEFAULT_CONFIG.userAvatar
    }));
    
    // 設定強力克隆鎖：20 分鐘內禁止任何元件執行「空覆蓋」
    const expiry = Date.now() + 1200000;
    localStorage.setItem(`cloned_lock_${tripId}`, expiry.toString());

    // 2. 行程 (Schedule) - 清除舊資料並寫入新資料
    // 清除舊天數
    Object.keys(localStorage).filter(k => k.startsWith(`sched_${tripId}_day`)).forEach(k => localStorage.removeItem(k));
    
    const schedules = Array.isArray(allData.schedules) ? allData.schedules : [];
    const scheduleMap: Record<number, any[]> = {};
    
    // 即使是空資料，也需要確保組件讀取到空陣列而不是 null
    // 預先找出最大天數，避免中間斷層
    const maxDay = schedules.reduce((max: number, curr: any) => Math.max(max, Number(curr.day_index || 0)), 6);
    
    schedules.forEach((s: any) => {
      const d = Number(s.day_index || 0);
      scheduleMap[d] = scheduleMap[d] || [];
      scheduleMap[d].push(s);
    });

    for (let i = 0; i <= maxDay; i++) {
        localStorage.setItem(`sched_${tripId}_day${i}`, JSON.stringify(scheduleMap[i] || []));
    }
    localStorage.setItem(`last_day_${tripId}`, '0'); // 重置到第一天

    // 3. 清單 (Planning) - 處理三種 Tab
    const plans = Array.isArray(allData.planning_items) ? allData.planning_items : [];
    ['todo', 'packing', 'shopping'].forEach(t => {
      const filtered = plans.filter((p: any) => p.type === t);
      localStorage.setItem(`plan_${tripId}_${t}`, JSON.stringify(filtered));
    });

    // 4. 其餘分頁 (Bookings, Expenses, Journals, Members)
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
    console.error("Mirror Write Final Error:", e);
    return false;
  }
};

const AutoSyncHandler = () => {
  const [status, setStatus] = useState<'check' | 'syncing' | 'success' | 'error'>('check');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<Record<string, number>>({});

  const getTripId = () => {
    try {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
      const searchParams = new URLSearchParams(window.location.search);
      return hashParams.get('id') || searchParams.get('id');
    } catch(e) { return null; }
  };

  const startSync = async () => {
    const id = getTripId();
    if (!id) { setErrorMessage("連結無效：URL 缺少 id 參數"); setStatus('error'); return; }
    
    setStatus('syncing'); setProgress(5);
    try {
      if (!supabase) throw new Error("無法連接到資料庫");
      
      const tables = ['trips', 'schedules', 'bookings', 'expenses', 'planning_items', 'members', 'journals'];
      const bundle: Record<string, any> = {};
      const counts: Record<string, number> = {};

      for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        const queryField = t === 'trips' ? 'id' : 'trip_id';
        const { data, error } = await supabase.from(t).select('*').eq(queryField, id);
        
        if (error) console.warn(`讀取 ${t} 失敗:`, error.message);
        
        bundle[t] = data || [];
        counts[t] = bundle[t].length;
        setProgress(Math.round(5 + ((i + 1) / tables.length) * 85));
      }

      // 檢查是否完全空白 (可能是 ID 錯誤或權限問題)
      const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
      if (totalItems === 0 && counts['trips'] === 0) {
        throw new Error("雲端無資料。請確認電腦端已「強力推送」成功，且連結 ID 正確。");
      }

      if (atomicMirrorWrite(id, bundle)) {
        setStats(counts);
        setProgress(100);
        setStatus('success');
        setTimeout(() => { 
          // 導向到首頁並重整，確保讀取 LocalStorage
          window.location.href = window.location.origin + window.location.pathname + "#/schedule";
          window.location.reload(); 
        }, 2500);
      } else {
        throw new Error("本機寫入失敗 (LocalStorage Error)");
      }
    } catch (e: any) { 
      setErrorMessage(e.message); 
      setStatus('error'); 
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-journey-cream flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl border-4 border-journey-green overflow-hidden">
        <div className="w-24 h-24 bg-journey-green/10 rounded-[2.5rem] flex items-center justify-center text-journey-green mx-auto mb-8 animate-bounce-slow">
          <Download size={48} />
        </div>
        <h2 className="text-3xl font-black italic text-journey-brown mb-4 tracking-tighter">全域鏡像中心 v7.2</h2>
        
        {status === 'check' && (
          <div className="space-y-6">
            <p className="text-[12px] font-black text-journey-brown/40 leading-relaxed px-4">
              準備下載行程 ID: <span className="text-journey-green">{getTripId()?.slice(0,8)}...</span><br/>
              這將完整覆蓋本機資料，建立手機端模版。
            </p>
            <button onClick={startSync} className="w-full py-6 bg-journey-green text-white rounded-[2rem] font-black shadow-xl active:scale-95 transition-all text-lg">開始下載數據</button>
          </div>
        )}

        {status === 'syncing' && (
          <div className="space-y-6">
            <div className="w-full h-4 bg-journey-cream rounded-full overflow-hidden border-2 border-white">
              <div className="h-full bg-journey-green transition-all duration-300" style={{width: `${progress}%`}} />
            </div>
            <p className="text-[11px] font-black text-journey-green animate-pulse">正在從雲端搬運數據... {progress}%</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <CheckCircle2 size={48} className="text-journey-green mx-auto" />
            <p className="text-xl font-black text-journey-green">克隆成功！</p>
            <div className="bg-journey-cream p-5 rounded-[2.5rem] text-[10px] font-black text-journey-brown/50 text-left grid grid-cols-2 gap-y-2 border-2 border-white shadow-inner">
               <span>🗓️ 行程: {stats.schedules}</span>
               <span>🎫 預訂: {stats.bookings}</span>
               <span>💰 支出: {stats.expenses}</span>
               <span>📝 清單: {stats.planning_items}</span>
               <span>👥 成員: {stats.members}</span>
               <span>📸 日誌: {stats.journals}</span>
            </div>
            <p className="text-[9px] font-black opacity-30 animate-pulse">正在重啟應用程式...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <AlertCircle size={48} className="text-journey-red mx-auto" />
            <div className="bg-journey-red/5 p-5 rounded-3xl text-[11px] font-black text-journey-red border-2 border-journey-red/10">
              {errorMessage}
            </div>
            <button onClick={() => setStatus('check')} className="w-full bg-journey-brown text-white py-5 rounded-[2rem] font-black text-lg">重試</button>
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
    <div className="min-h-screen pb-44 flex flex-col relative z-0">
      <header className={`px-6 pt-16 pb-8 flex justify-between items-start relative z-10`}>
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
          <Route path="/schedule" element={<ScheduleView tripConfig={tripConfig} />} />
          <Route path="/bookings" element={<BookingsView tripConfig={tripConfig} />} />
          <Route path="/expense" element={<ExpenseView tripConfig={tripConfig} />} />
          <Route path="/journal" element={<JournalView tripConfig={tripConfig} />} />
          <Route path="/planning" element={<PlanningView tripConfig={tripConfig} />} />
          <Route path="/members" element={<MembersView tripConfig={tripConfig} />} />
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
    <p className="mt-8 text-xl font-black italic tracking-tighter">Tabi-Kuma v7.2...</p>
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
    if (!supabase || dbReady === false) return alert("資料庫尚未就緒");
    setPushing(true);
    setLog(["🚀 啟動強力數據推送引擎 v7.2..."]);
    const finalDateRange = `${startDate} ~ ${endDate}`;
    
    try {
      // 先寫入 Trip
      await supabase.from('trips').upsert({ id: config.id, title: formData.title, date_range: finalDateRange });
      setLog(prev => [...prev, `✅ Trip ID: ${config.id} 確認`]);

      const tables = [
        { name: 'schedules', localPrefix: `sched_${config.id}_day` },
        { name: 'planning_items', localPrefix: `plan_${config.id}_` },
        { name: 'bookings', localKey: `book_${config.id}` },
        { name: 'expenses', localKey: `exp_${config.id}` },
        { name: 'journals', localKey: `jrnl_${config.id}` },
        { name: 'members', localKey: `mem_${config.id}` }
      ];

      for (const t of tables) {
        let allData: any[] = [];
        if (t.localPrefix) {
          // 找出所有符合前綴的 Key
          const keys = Object.keys(localStorage).filter(k => k.startsWith(t.localPrefix!));
          keys.forEach(k => {
            const data = JSON.parse(localStorage.getItem(k) || "[]");
            if (Array.isArray(data)) allData = [...allData, ...data];
          });
        } else if (t.localKey) {
          allData = JSON.parse(localStorage.getItem(t.localKey) || "[]");
        }

        if (allData.length > 0) {
          // 數據消毒與 ID 注入
          const sanitized = sanitizeForUpload(allData.map(item => ({
            ...item,
            trip_id: config.id
          })));
          
          const { error } = await supabase.from(t.name).upsert(sanitized);
          if (error) setLog(prev => [...prev, `⚠️ ${t.name} 上傳失敗: ${error.message}`]);
          else setLog(prev => [...prev, `✅ ${t.name} 上傳成功 (${allData.length} 筆)`]);
        } else {
           setLog(prev => [...prev, `ℹ️ ${t.name} 無本地資料，略過`]);
        }
      }

      alert("✨ 數據已成功封裝並推送到雲端！\n現在請用手機點擊「複製連結」，即可 100% 完整克隆所有分頁。");
      onSave({ ...formData, id: config.id, dateRange: finalDateRange });
    } catch (e: any) { alert("推送中斷: " + e.message); } finally { setPushing(false); }
  };

  const handleRestoreFromBackup = () => {
    if (!confirm('若頁面空白，此功能將嘗試從最近一次下載的備份還原資料。確定執行？')) return;
    try {
      const backup = localStorage.getItem(`backup_full_bundle_${config.id}`);
      if (!backup) throw new Error("找不到備份資料，請重新執行「掃碼/連結下載」。");
      const bundle = JSON.parse(backup);
      if (atomicMirrorWrite(config.id, bundle)) {
        alert("還原成功！正在重整頁面...");
        window.location.reload();
      } else {
        throw new Error("還原寫入失敗");
      }
    } catch (e: any) { alert(e.message); }
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/sync?id=${config.id}`;
    navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[6000] bg-journey-brown/80 backdrop-blur-xl flex items-end sm:items-center justify-center animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[4rem] sm:rounded-[3.5rem] shadow-2xl flex flex-col max-h-[90vh] border-t-8 border-journey-green overflow-hidden">
        <div className="p-10 pb-6 flex justify-between items-center bg-white">
          <h3 className="text-2xl font-black italic text-journey-brown tracking-tighter">同步設定 v7.2</h3>
          <button onClick={onClose} className="p-2 bg-journey-cream rounded-full text-journey-brown/30"><X size={20}/></button>
        </div>

        <div className="flex-grow overflow-y-auto px-10 pb-10 space-y-6">
          <div className="p-8 bg-journey-green/10 rounded-[2.5rem] border-4 border-white shadow-soft-sm space-y-4">
            <h4 className="text-[10px] font-black text-journey-green uppercase tracking-widest text-center">電腦端操作</h4>
            <button onClick={handleForcePush} disabled={pushing} className="w-full py-6 rounded-2xl bg-white text-journey-green font-black shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
              {pushing ? <Loader2 className="animate-spin" size={24}/> : <CloudUpload size={24}/>} 1. 強力推送數據
            </button>
            <button onClick={copyLink} className={`w-full py-6 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all border-4 ${copied ? 'bg-journey-green text-white border-white' : 'bg-journey-cream text-journey-brown border-white'}`}>
              <LinkIcon size={20}/> {copied ? '已複製連結！' : '2. 複製手機下載連結'}
            </button>
            {log.length > 0 && (
              <div className="bg-white/50 p-5 rounded-[2rem] text-[10px] font-mono text-journey-brown/40 space-y-1 border-2 border-white max-h-32 overflow-y-auto">
                {log.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>

          <div className="p-8 bg-journey-red/5 rounded-[2.5rem] border-4 border-white shadow-soft-sm space-y-4">
            <h4 className="text-[10px] font-black text-journey-red uppercase tracking-widest text-center">手機端救援</h4>
            <p className="text-[10px] text-center text-journey-brown/40">若下載後頁面仍顯示空白，請嘗試：</p>
            <button onClick={handleRestoreFromBackup} className="w-full py-5 rounded-2xl bg-white text-journey-red font-black shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
              <RotateCcw size={20}/> 從備份強制還原
            </button>
          </div>
        </div>

        <div className="p-10 pt-4 pb-16 bg-white border-t border-journey-cream">
           <button onClick={onClose} className="w-full bg-journey-brown text-white py-6 rounded-[2.5rem] font-black shadow-2xl active:scale-95 transition-all">完成</button>
        </div>
      </div>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
