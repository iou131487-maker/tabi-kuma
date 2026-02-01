
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, supabase } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, Cloud, RefreshCw, Download, CheckCircle2, AlertCircle, Info, Link as LinkIcon, Calendar, ArrowRight, ShieldCheck, Wifi, Database, Search, Smartphone, Layers, Code, Terminal, ExternalLink } from 'lucide-react';
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

// SQL 腳本常數：含自動刷新快取指令
const DATABASE_SQL = `-- 🚀 Tabi-Kuma 核心資料庫架構 v4.8
-- 請在 Supabase -> SQL Editor 執行以下指令

-- 1. 行程主表
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date_range TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 每日行程
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  time TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 預訂資料
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT,
  title TEXT,
  time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 記帳資料
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT,
  amount NUMERIC,
  currency TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 回憶日誌
CREATE TABLE IF NOT EXISTS journals (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  content TEXT,
  location TEXT,
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 成員資料
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 清單項目
CREATE TABLE IF NOT EXISTS planning_items (
  id TEXT PRIMARY KEY,
  trip_id TEXT REFERENCES trips(id) ON DELETE CASCADE,
  text TEXT,
  type TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 🔓 關閉 RLS 確保 Demo 可讀寫
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE journals DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE planning_items DISABLE ROW LEVEL SECURITY;

-- 🔄 告訴 PostgREST 刷新快取
NOTIFY pgrst, 'reload schema';
`;

/**
 * 資料庫安裝指南 Modal (v4.8 教學優化版)
 */
const DatabaseSetupGuide = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [copied, setCopied] = useState(false);

  const copySQL = () => {
    navigator.clipboard.writeText(DATABASE_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-journey-brown/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-[4rem] p-8 sm:p-10 shadow-2xl border-4 border-journey-red relative overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-journey-red/10 rounded-2xl flex items-center justify-center text-journey-red"><Database size={24}/></div>
             <div>
               <h3 className="text-xl font-black text-journey-brown italic leading-tight">資料庫初始化指南</h3>
               <p className="text-[9px] font-bold text-journey-brown/30 uppercase tracking-[0.2em]">Tabi-Kuma Setup v4.8</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-journey-cream rounded-full active:scale-75 transition-transform"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-grow">
          <div className="bg-journey-red/5 p-6 rounded-[2.5rem] border-2 border-dashed border-journey-red/20">
             <p className="text-[11px] font-bold text-journey-brown/80 leading-relaxed">
               ⚠️ 系統偵測到您的 Supabase 專案中尚未建立任何資料表。別擔心！跟著以下步驟，1 分鐘內即可完成：
             </p>
          </div>

          <div className="space-y-4">
             <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-journey-brown text-white flex items-center justify-center font-black text-xs shrink-0 mt-1 shadow-sm">1</div>
                <div>
                  <p className="text-xs font-black text-journey-brown mb-1">開啟 Supabase 控制台</p>
                  <a href="https://supabase.com/dashboard" target="_blank" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-journey-blue underline bg-journey-blue/5 px-2 py-1 rounded-lg">
                    點我前往 Dashboard <ExternalLink size={10}/>
                  </a>
                </div>
             </div>
             
             <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-journey-brown text-white flex items-center justify-center font-black text-xs shrink-0 mt-1 shadow-sm">2</div>
                <div>
                  <p className="text-xs font-black text-journey-brown mb-1">進入 SQL Editor</p>
                  <p className="text-[10px] font-medium text-journey-brown/50">在左側選單中尋找像 <span className="font-mono bg-journey-cream px-1 border rounded">>_</span> 的圖示。</p>
                </div>
             </div>

             <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-journey-brown text-white flex items-center justify-center font-black text-xs shrink-0 mt-1 shadow-sm">3</div>
                <div>
                  <p className="text-xs font-black text-journey-brown mb-1">複製並貼上指令</p>
                  <p className="text-[10px] font-medium text-journey-brown/50">點擊下方按鈕複製，貼到 SQL Editor 後按下「Run」。</p>
                </div>
             </div>
          </div>

          {/* SQL Block */}
          <div className="relative group mt-2">
            <div className="absolute -top-3 left-6 px-3 py-1 bg-journey-brown rounded-full text-[8px] font-black text-white uppercase tracking-widest z-10">Tabi-Kuma.sql</div>
            <pre className="bg-journey-brown text-white/90 p-6 pt-8 rounded-[2rem] text-[10px] font-mono overflow-x-auto h-48 border-4 border-journey-brown shadow-inner leading-relaxed">
              {DATABASE_SQL}
            </pre>
            <button 
              onClick={copySQL}
              className={`absolute top-4 right-4 px-5 py-2.5 rounded-xl font-black text-[10px] transition-all flex items-center gap-2 shadow-2xl ${copied ? 'bg-journey-green text-white scale-105' : 'bg-white text-journey-brown hover:bg-journey-cream'}`}
            >
              {copied ? <CheckCircle2 size={14}/> : <Copy size={14}/>} {copied ? '已複製指令！' : '複製指令'}
            </button>
          </div>
        </div>

        {/* Footer Action */}
        <div className="mt-8 pt-4 border-t-2 border-journey-cream">
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-journey-green text-white py-6 rounded-[2.5rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:brightness-105"
          >
            <RefreshCw size={24} /> 執行完畢，立即重新整理
          </button>
          <p className="text-center text-[9px] font-bold text-journey-brown/30 mt-4 italic">※ 若執行後仍未消失，請等待約 10 秒後再次重新整理</p>
        </div>
      </div>
    </div>
  );
};

/**
 * 自動鏡像同步處理器
 */
const AutoSyncHandler = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [showSetup, setShowSetup] = useState(false);
  
  const findId = () => {
    if (params.id && params.id.length >= 8) return params.id.trim();
    const searchId = new URLSearchParams(location.search).get('id') || new URLSearchParams(location.search).get('sync');
    if (searchId) return searchId.trim();
    const urlMatches = window.location.href.match(/trip-[a-z0-9]+/i);
    return urlMatches ? urlMatches[0] : '';
  };

  const [id, setId] = useState(findId());
  const [status, setStatus] = useState<'check' | 'syncing' | 'success' | 'error'>('check');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const startSync = async (targetId: string = id) => {
    const cleanId = targetId.trim();
    if (!cleanId) {
      setErrorMessage("請輸入正確的行程 ID");
      setStatus('error');
      return;
    }

    setStatus('syncing');
    setErrorMessage('');
    setProgress(10);

    try {
      if (!supabase) throw new Error("Supabase 未能初始化");
      
      let tripTableKey = 'trips';
      const { error: pluralError } = await supabase.from('trips').select('id').limit(1);
      
      if (pluralError && (pluralError.message.includes('not find') || pluralError.code === 'PGRST116')) {
        const { error: singularError } = await supabase.from('trip').select('id').limit(1);
        if (!singularError) {
          tripTableKey = 'trip';
        } else {
          setShowSetup(true);
          throw new Error("找不到資料庫表 'trips'，請先執行初始化 SQL。");
        }
      }
      setProgress(30);

      const diagTables = [
        { key: tripTableKey, label: '行程核心' },
        { key: 'schedules', label: '計畫安排' },
        { key: 'bookings', label: '預訂資料' },
        { key: 'expenses', label: '財務帳本' },
        { key: 'planning_items', label: '準備清單' },
        { key: 'members', label: '夥伴權限' }
      ];

      const bundle: Record<string, any> = {};
      
      for (let i = 0; i < diagTables.length; i++) {
        const table = diagTables[i];
        const { data, error } = await supabase
          .from(table.key)
          .select('*')
          .eq(table.key === tripTableKey ? 'id' : 'trip_id', cleanId);
        
        if (error) throw new Error(`${table.label} 同步失敗: ${error.message}`);
        bundle[table.key] = data || [];
        
        setProgress(Math.round(30 + ((i + 1) / diagTables.length) * 70));
        await new Promise(r => setTimeout(r, 100));
      }

      if (!bundle[tripTableKey] || bundle[tripTableKey].length === 0) {
        throw new Error("雲端找不到此 ID。請確定電腦端已儲存並推送資料。");
      }

      const success = atomicMirrorWrite(cleanId, bundle, tripTableKey);
      if (success) {
        setStatus('success');
        setTimeout(() => {
          window.location.replace(window.location.origin + window.location.pathname + "#/schedule");
          window.location.reload();
        }, 1200);
      } else {
        throw new Error("手機本地儲存失敗");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "同步失敗");
      setStatus('error');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[2000] bg-journey-cream flex flex-col items-center justify-center p-6 animate-in fade-in">
        <div className="w-full max-w-sm bg-white rounded-[4.5rem] p-10 shadow-2xl border-4 border-journey-green relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-2 bg-journey-cream overflow-hidden">
             <div className="h-full bg-journey-green transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          
          <div className="w-20 h-20 bg-journey-green/10 rounded-[2.2rem] flex items-center justify-center text-journey-green mx-auto mb-6">
            {status === 'success' ? <CheckCircle2 size={40} className="animate-bounce" /> : <Layers size={40} className={status === 'syncing' ? 'animate-pulse' : ''} />}
          </div>

          <h2 className="text-3xl font-black italic text-journey-brown mb-2 tracking-tighter">鏡像同步 v4.8</h2>
          <p className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em] mb-8 italic">
             Connecting to your dream...
          </p>

          {status === 'check' && (
            <div className="space-y-6">
              <div className="bg-journey-cream/50 p-6 rounded-[2.5rem] border-2 border-dashed border-journey-brown/10">
                 <p className="text-[11px] font-black text-journey-brown/60 leading-relaxed italic">
                   目標 ID: <span className="text-journey-green font-black">{id || '未偵測到 ID'}</span>
                 </p>
              </div>
              <button onClick={() => startSync()} className="w-full py-6 rounded-[2.2rem] bg-journey-green text-white font-black shadow-xl active:scale-95 transition-all">
                啟動同步對齊 <ArrowRight size={20} className="inline ml-2"/>
              </button>
              <button onClick={() => navigate('/schedule')} className="text-journey-brown/20 font-black text-[10px] uppercase tracking-widest">暫時跳過</button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-6 bg-journey-red/5 rounded-[2.5rem] border-2 border-journey-red/10">
                 <p className="text-[10px] font-black text-journey-red uppercase leading-relaxed">{errorMessage}</p>
              </div>
              <button onClick={() => setStatus('check')} className="w-full bg-journey-brown text-white py-4 rounded-[1.8rem] font-black shadow-lg">再試一次</button>
              {errorMessage.includes('not find') && (
                 <button onClick={() => setShowSetup(true)} className="w-full py-4 text-journey-blue font-black text-[11px] underline flex items-center justify-center gap-1">
                   <Code size={14}/> 顯示安裝教學
                 </button>
              )}
            </div>
          )}

          {status === 'syncing' && (
            <div className="py-4">
              <div className="w-12 h-12 border-4 border-journey-green/20 border-t-journey-green rounded-full animate-spin mx-auto mb-4"/>
              <p className="text-sm font-black text-journey-brown italic animate-pulse">正在寫入本地鏡像... {progress}%</p>
            </div>
          )}
          {status === 'success' && <p className="text-lg font-black text-journey-green italic animate-bounce">克隆完成 ✨ 即將載入</p>}
        </div>
      </div>
      <DatabaseSetupGuide isOpen={showSetup} onClose={() => setShowSetup(false)} />
    </>
  );
};

/**
 * 原子化寫入邏輯
 */
const atomicMirrorWrite = (tripId: string, allData: Record<string, any>, tripTableKey: string) => {
  try {
    const tripInfo = allData[tripTableKey]?.[0];
    if (!tripInfo) return false;

    const snapshot: Record<string, string> = {
      'trip_config': JSON.stringify({
        id: tripId,
        title: tripInfo.title,
        dateRange: tripInfo.date_range,
        userAvatar: DEFAULT_CONFIG.userAvatar
      })
    };

    if (allData.schedules) {
      const dayGroups = allData.schedules.reduce((acc: any, s: any) => {
        acc[s.day_index] = acc[s.day_index] || [];
        acc[s.day_index].push(s);
        return acc;
      }, {});
      Object.entries(dayGroups).forEach(([idx, data]) => {
        snapshot[`sched_${tripId}_day${idx}`] = JSON.stringify(data);
      });
    }

    const tableMappings: Record<string, string> = {
      'bookings': `book_${tripId}`,
      'expenses': `exp_${tripId}`,
      'journals': `jrnl_${tripId}`,
      'members': `mem_${tripId}`
    };

    Object.entries(tableMappings).forEach(([dbKey, localKey]) => {
      if (allData[dbKey]) snapshot[localKey] = JSON.stringify(allData[dbKey]);
    });

    if (allData.planning_items) {
      ['todo', 'packing', 'shopping'].forEach(type => {
        const typeData = allData.planning_items.filter((p: any) => p.type === type);
        snapshot[`plan_${tripId}_${type}`] = JSON.stringify(typeData);
      });
    }

    localStorage.clear();
    Object.entries(snapshot).forEach(([k, v]) => localStorage.setItem(k, v));
    localStorage.setItem(`last_mirror_sync_${tripId}`, new Date().toISOString());

    return true;
  } catch (e) {
    console.error("Mirror Write Failure:", e);
    return false;
  }
};

const AppContent = () => {
  const [initializing, setInitializing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false); 
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  
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
        const checkDb = async () => {
          try {
            const { error } = await supabase.from('trips').select('id').limit(1);
            if (error && (error.message.includes('not find') || error.code === 'PGRST116')) {
               setDbReady(false);
            } else {
               setDbReady(true);
               const { data } = await supabase.from('trips').select('*').eq('id', tripConfig.id);
               if (data?.[0]) {
                 const updated = { ...tripConfig, title: data[0].title, dateRange: data[0].date_range };
                 setTripConfig(updated);
                 localStorage.setItem('trip_config', JSON.stringify(updated));
               }
            }
          } catch(e) { setDbReady(false); }
        };
        checkDb();
        hasSyncRef.current = true;
      }
      setInitializing(false);
    };
    initApp();
  }, [tripConfig.id]);

  useEffect(() => {
    setIsAnyModalOpen(showSettings || location.pathname.includes('/sync'));
  }, [showSettings, location.pathname]);

  if (initializing) return <LoadingScreen />;

  return (
    <div className="min-h-screen pb-44">
      {dbReady === false && !location.pathname.includes('/sync') && (
        <div className="fixed top-0 left-0 w-full bg-journey-red text-white py-2.5 px-6 z-[2000] text-[10px] font-black uppercase tracking-widest flex justify-between items-center shadow-xl animate-in slide-in-from-top-10">
           <div className="flex items-center gap-2"><AlertCircle size={14} className="animate-pulse"/> 偵測到雲端資料庫未設定</div>
           <button onClick={() => setShowSettings(true)} className="bg-white/20 px-3 py-1 rounded-full underline hover:bg-white/30 transition-all">獲取安裝指南</button>
        </div>
      )}

      <header className={`px-6 pt-16 pb-8 flex justify-between items-start relative z-10 ${dbReady === false ? 'mt-8' : ''}`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-journey-green rounded-[1.5rem] flex items-center justify-center text-white shadow-soft -rotate-6 border-4 border-white"><Plane size={28} /></div>
          <div onClick={() => setShowSettings(true)} className="cursor-pointer group">
            <h1 className="text-3xl font-black text-journey-brown italic tracking-tighter leading-none mb-1 group-hover:text-journey-green transition-colors">{tripConfig.title}</h1>
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
    <p className="mt-10 text-2xl font-black italic tracking-tighter">旅程即將開啟...</p>
    <p className="mt-2 text-xs font-bold opacity-30 uppercase tracking-[0.4em]">Tabi-Kuma Mirror v4.8</p>
  </div>
);

const TripSettingsModal = ({ isOpen, onClose, config, dbReady, onSave }: any) => {
  const [formData, setFormData] = useState(config);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showSQL, setShowSQL] = useState(false);

  const dates = config.dateRange.split(' ~ ');
  const [startDate, setStartDate] = useState(dates[0] || '');
  const [endDate, setEndDate] = useState(dates[1] || '');

  useEffect(() => {
    setFormData(prev => ({ ...prev, dateRange: `${startDate} ~ ${endDate}` }));
  }, [startDate, endDate]);

  const handleUpdateTrip = async () => {
    setIsProcessing(true);
    try {
      const payload = { id: config.id, title: formData.title, date_range: formData.dateRange };
      if (supabase && dbReady !== false) {
        let res = await supabase.from('trips').upsert(payload);
        if (res.error && (res.error.message.includes('not find') || res.error.code === 'PGRST116')) {
           setShowSQL(true);
        }
      }
      onSave(formData);
      if (dbReady !== false) onClose();
    } catch (e) {
      alert("儲存失敗，請檢查連線。");
    } finally {
      setIsProcessing(false);
    }
  };

  return !isOpen ? null : (
    <>
      <div className="fixed inset-0 z-[1999] bg-journey-brown/70 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
        <div className="bg-white w-full max-w-md rounded-t-[4rem] sm:rounded-[3.5rem] p-10 pb-32 shadow-2xl space-y-8 relative overflow-y-auto max-h-[95vh] border-t-8 border-journey-green">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black italic text-journey-brown tracking-tighter">旅程設定</h3>
            <button onClick={onClose} className="p-2 bg-journey-cream rounded-full active:scale-75 transition-transform"><X size={20} className="text-journey-brown/30" /></button>
          </div>

          {dbReady === false && (
            <div className="p-6 bg-journey-red/10 rounded-[2.5rem] border-4 border-white shadow-soft-sm space-y-3">
               <div className="flex items-center gap-3 text-journey-red">
                 <AlertCircle size={20} className="shrink-0"/>
                 <p className="text-[10px] font-black uppercase tracking-widest">資料庫表缺失 (Missing Schema)</p>
               </div>
               <button onClick={() => setShowSQL(true)} className="w-full py-4 bg-journey-red text-white rounded-2xl font-black text-[10px] shadow-lg flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all">
                 <Terminal size={14}/> 獲取初始化教學與指令
               </button>
            </div>
          )}

          <div className="p-7 bg-journey-green/10 rounded-[2.5rem] border-4 border-white shadow-soft-sm space-y-4">
             <div>
               <p className="text-[10px] font-black text-journey-green uppercase tracking-widest">產生鏡像連結</p>
               <p className="text-[8px] font-bold text-journey-brown/40 italic leading-tight">同步至手機端，實現雲端鏡像克隆體驗。</p>
             </div>
             <button onClick={() => {
               const syncUrl = `${window.location.origin + window.location.pathname}#/sync/${config.id}?id=${config.id}`;
               navigator.clipboard.writeText(syncUrl);
               setShareCopied(true);
               setTimeout(() => setShareCopied(false), 2000);
             }} className={`w-full py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all ${shareCopied ? 'bg-journey-darkGreen text-white shadow-journey-green/20 scale-105' : 'bg-white text-journey-green shadow-sm active:scale-95'}`}>
               {shareCopied ? <><CheckCircle2 size={18}/> 連結複製成功！</> : <><LinkIcon size={18}/> 複製克隆連結</>}
             </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase tracking-widest">行程名稱</label>
              <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none border-4 border-white shadow-inner" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase tracking-widest">起訖日期</label>
              <div className="grid grid-cols-2 gap-3">
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl font-black text-[10px] border-4 border-white focus:outline-none" />
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl font-black text-[10px] border-4 border-white focus:outline-none" />
              </div>
            </div>
          </div>

          <button onClick={handleUpdateTrip} disabled={isProcessing} className="w-full bg-journey-brown text-white py-6 rounded-[2.5rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> 儲存並推送到雲端</>}
          </button>
        </div>
      </div>
      <DatabaseSetupGuide isOpen={showSQL} onClose={() => setShowSQL(false)} />
    </>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
