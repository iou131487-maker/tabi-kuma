
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, supabase } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, Cloud, RefreshCw, Download, CheckCircle2, AlertCircle, Info, Link as LinkIcon, Calendar, ArrowRight, ShieldCheck, Wifi, Database, Search, Smartphone, Layers } from 'lucide-react';
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

/**
 * Mirror Protocol v4.6: 原子寫入機制
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

    if (allData.planning_items) {
      ['todo', 'packing', 'shopping'].forEach(type => {
        const typeData = allData.planning_items.filter((p: any) => p.type === type);
        snapshot[`plan_${tripId}_${type}`] = JSON.stringify(typeData);
      });
    }

    if (allData.bookings) snapshot[`book_${tripId}`] = JSON.stringify(allData.bookings);
    if (allData.expenses) snapshot[`exp_${tripId}`] = JSON.stringify(allData.expenses);
    if (allData.journals) snapshot[`jrnl_${tripId}`] = JSON.stringify(allData.journals);
    if (allData.members) snapshot[`mem_${tripId}`] = JSON.stringify(allData.members);

    localStorage.clear();
    Object.entries(snapshot).forEach(([k, v]) => localStorage.setItem(k, v));
    localStorage.setItem(`last_mirror_sync_${tripId}`, new Date().toISOString());

    return true;
  } catch (e) {
    console.error("Mirror Write Failure:", e);
    return false;
  }
};

/**
 * 自動鏡像處理器 (手機端) - 具備 Schema 自動適應功能
 */
const AutoSyncHandler = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const findIdFromAnywhere = () => {
    if (params.id && params.id.length >= 8) return params.id.trim();
    const searchId = new URLSearchParams(location.search).get('id') || new URLSearchParams(location.search).get('sync');
    if (searchId) return searchId.trim();
    const urlMatches = window.location.href.match(/trip-[a-z0-9]+/i);
    return urlMatches ? urlMatches[0] : '';
  };

  const [id, setId] = useState(findIdFromAnywhere());
  const [status, setStatus] = useState<'check' | 'syncing' | 'success' | 'error'>('check');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const startSync = async (targetId: string = id) => {
    const cleanId = targetId.trim();
    if (!cleanId) {
      setErrorMessage("行程 ID 格式不正確");
      setStatus('error');
      return;
    }

    setStatus('syncing');
    setErrorMessage('');
    setProgress(5);

    try {
      if (!supabase) throw new Error("資料庫模組未載入");
      
      // 1. Schema 探測：嘗試找出正確的 Trip 表名 (trips 或 trip)
      let tripTableKey = 'trips';
      const { error: pluralError } = await supabase.from('trips').select('id').limit(1);
      
      if (pluralError && (pluralError.message.includes('not find') || pluralError.code === 'PGRST116')) {
        const { error: singularError } = await supabase.from('trip').select('id').limit(1);
        if (!singularError) {
          tripTableKey = 'trip';
        } else {
          throw new Error("找不到資料庫表 'trips' 或 'trip'，請檢查 Supabase 設定。");
        }
      }
      setProgress(20);

      const diagTables = [
        { key: tripTableKey, label: '行程核心' },
        { key: 'schedules', label: '每日計畫' },
        { key: 'bookings', label: '預訂資料' },
        { key: 'expenses', label: '財務對帳' },
        { key: 'planning_items', label: '清單清點' },
        { key: 'members', label: '成員權限' }
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
        
        setProgress(Math.round(20 + ((i + 1) / diagTables.length) * 80));
        await new Promise(r => setTimeout(r, 100));
      }

      if (!bundle[tripTableKey] || bundle[tripTableKey].length === 0) {
        throw new Error("雲端找不到此行程 ID，請確保電腦端已按『儲存並推送』");
      }

      const success = atomicMirrorWrite(cleanId, bundle, tripTableKey);
      if (success) {
        setStatus('success');
        setTimeout(() => {
          window.location.replace(window.location.origin + window.location.pathname + "#/schedule");
          window.location.reload();
        }, 1200);
      } else {
        throw new Error("本地寫入失敗，請確認手機空間是否充足");
      }
    } catch (e: any) {
      console.error("Sync Error:", e);
      setErrorMessage(e.message || "同步發生未知錯誤");
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-journey-cream flex flex-col items-center justify-center p-6 animate-in fade-in">
      <div className="w-full max-w-sm bg-white rounded-[4.5rem] p-10 shadow-2xl border-4 border-journey-green relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-2 bg-journey-cream overflow-hidden">
           <div className="h-full bg-journey-green transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        
        <div className="w-20 h-20 bg-journey-green/10 rounded-[2.2rem] flex items-center justify-center text-journey-green mx-auto mb-6">
          {status === 'success' ? <CheckCircle2 size={40} className="animate-bounce" /> : <Layers size={40} className={status === 'syncing' ? 'animate-pulse' : ''} />}
        </div>

        <h2 className="text-3xl font-black italic text-journey-brown mb-2 tracking-tighter">鏡像同步 v4.6</h2>
        <p className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em] mb-8">
           {status === 'syncing' ? '正在對齊雲端 Schema...' : '絕對同步・無損鏡像'}
        </p>

        {status === 'check' && (
          <div className="space-y-6">
            <div className="bg-journey-cream/50 p-6 rounded-[2.5rem] border-2 border-dashed border-journey-brown/10">
               {id ? (
                 <p className="text-[11px] font-bold text-journey-brown/60 leading-relaxed italic">
                   準備同步 ID: <span className="text-journey-green font-black">{id}</span><br/>
                   將自動探測資料庫結構並完成克隆。
                 </p>
               ) : (
                 <p className="text-[11px] font-bold text-journey-brown/60 leading-relaxed italic">
                   未偵測到 ID，請手動輸入。<br/>(ID 可在電腦端的設定中找到)
                 </p>
               )}
            </div>

            {!id && (
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="輸入行程 ID (trip-xxxx)" 
                  className="w-full bg-journey-cream p-5 rounded-2xl font-black text-center focus:outline-none border-4 border-white shadow-inner text-sm"
                  onChange={(e) => setId(e.target.value)}
                />
              </div>
            )}

            <button 
              onClick={() => startSync()} 
              disabled={!id}
              className={`w-full py-6 rounded-[2.2rem] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${id ? 'bg-journey-green text-white shadow-journey-green/20' : 'bg-journey-brown/10 text-journey-brown/20'}`}
            >
              開始鏡像對齊 <ArrowRight size={20}/>
            </button>
            <button onClick={() => navigate('/schedule')} className="text-journey-brown/20 font-black text-[10px] uppercase tracking-widest">取消同步</button>
          </div>
        )}

        {status === 'syncing' && (
          <div className="space-y-4">
             <div className="w-16 h-16 border-8 border-journey-green/20 border-t-journey-green rounded-full animate-spin mx-auto mb-4" />
             <p className="text-sm font-black text-journey-brown italic">同步進度: {progress}%</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
             <p className="text-lg font-black text-journey-green italic">✨ 鏡像克隆成功！</p>
             <p className="text-[11px] font-bold text-journey-brown/40">正在進入行程...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="p-8 bg-journey-red/5 rounded-[3rem] border-2 border-journey-red/10 animate-in shake-in">
               <AlertCircle size={40} className="text-journey-red mx-auto mb-3" />
               <p className="text-[11px] font-black text-journey-red leading-relaxed uppercase tracking-wider">
                 {errorMessage}
               </p>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                value={id}
                placeholder="重新輸入 ID" 
                className="w-full bg-journey-cream p-5 rounded-2xl font-black text-center focus:outline-none border-4 border-white shadow-inner"
                onChange={(e) => setId(e.target.value)}
              />
              <button onClick={() => startSync()} className="w-full bg-journey-brown text-white py-5 rounded-3xl font-black shadow-lg">嘗試重新同步</button>
              <button onClick={() => setStatus('check')} className="w-full text-journey-brown/20 font-black py-2">回上一步</button>
            </div>
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
        // 靜默偵測與更新 (同樣使用動態表名探測邏輯)
        const checkUpdate = async () => {
          try {
            let res = await supabase.from('trips').select('*').eq('id', tripConfig.id);
            if (res.error && res.error.message.includes('not find')) {
              res = await supabase.from('trip').select('*').eq('id', tripConfig.id);
            }
            if (res.data && res.data.length > 0) {
              const updated = { ...tripConfig, title: res.data[0].title, dateRange: res.data[0].date_range };
              setTripConfig(updated);
              localStorage.setItem('trip_config', JSON.stringify(updated));
            }
          } catch(e) {}
        };
        checkUpdate();
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
      <header className="px-6 pt-12 pb-8 flex justify-between items-start relative z-10">
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
    <p className="mt-10 text-2xl font-black italic tracking-tighter">旅程即將開啟...</p>
    <p className="mt-2 text-xs font-bold opacity-30 uppercase tracking-[0.4em]">Tabi-Kuma Mirror v4.6</p>
  </div>
);

const TripSettingsModal = ({ isOpen, onClose, config, onSave }: any) => {
  const [formData, setFormData] = useState(config);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const dates = config.dateRange.split(' ~ ');
  const [startDate, setStartDate] = useState(dates[0] || '');
  const [endDate, setEndDate] = useState(dates[1] || '');

  useEffect(() => {
    setFormData(prev => ({ ...prev, dateRange: `${startDate} ~ ${endDate}` }));
  }, [startDate, endDate]);

  const copySyncLink = () => {
    const base = window.location.origin + window.location.pathname;
    const syncUrl = `${base}#/sync/${config.id}?id=${config.id}`;
    navigator.clipboard.writeText(syncUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleUpdateTrip = async () => {
    setIsProcessing(true);
    try {
      const payload = { id: config.id, title: formData.title, date_range: formData.dateRange };
      if (supabase) {
        // 嘗試複數，失敗則嘗試單數
        let res = await supabase.from('trips').upsert(payload);
        if (res.error && res.error.message.includes('not find')) {
          await supabase.from('trip').upsert(payload);
        }
      }
      onSave(formData);
      onClose();
    } catch (e) {
      alert("儲存失敗，請檢查連線。");
    } finally {
      setIsProcessing(false);
    }
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[1999] bg-journey-brown/70 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[4rem] sm:rounded-[3.5rem] p-10 pb-32 shadow-2xl space-y-8 relative overflow-y-auto max-h-[95vh] border-t-8 border-journey-green">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black italic text-journey-brown tracking-tighter">旅程設定</h3>
          <button onClick={onClose} className="p-2 bg-journey-cream rounded-full active:scale-75 transition-transform"><X size={20} className="text-journey-brown/30" /></button>
        </div>

        <div className="p-7 bg-journey-green/10 rounded-[2.5rem] border-4 border-white shadow-soft-sm space-y-4">
           <div>
             <p className="text-[10px] font-black text-journey-green uppercase tracking-widest">究極鏡像連結 (v4.6)</p>
             <p className="text-[8px] font-bold text-journey-brown/40 italic leading-tight">支援 Schema 自適應。手機端點開即可完成數據鏡像。</p>
           </div>
           <button onClick={copySyncLink} className={`w-full py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all ${shareCopied ? 'bg-journey-darkGreen text-white' : 'bg-white text-journey-green shadow-sm border-2 border-journey-green/10 active:scale-95'}`}>
             {shareCopied ? <><CheckCircle2 size={18}/> 連結複製成功！</> : <><LinkIcon size={18}/> 產生克隆連結</>}
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
               <div className="relative">
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl font-black text-[10px] border-4 border-white focus:outline-none" />
               </div>
               <div className="relative">
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl font-black text-[10px] border-4 border-white focus:outline-none" />
               </div>
            </div>
          </div>
        </div>

        <button onClick={handleUpdateTrip} disabled={isProcessing} className="w-full bg-journey-brown text-white py-6 rounded-[2.5rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
          {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> 儲存並推送到雲端</>}
        </button>

        <div className="pt-4 text-center">
          <p className="text-[8px] font-black text-journey-brown/10 uppercase tracking-[0.4em]">UNIQUE TRIP ID: {config.id}</p>
        </div>
      </div>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
