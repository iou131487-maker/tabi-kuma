
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, supabase } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, Cloud, RefreshCw, Download, CheckCircle2, AlertCircle, Info, Link as LinkIcon, Calendar, ArrowRight, ShieldCheck, Wifi, Database, Search } from 'lucide-react';
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

// Mirror Protocol v3.1: 深度原子寫入與緩衝檢查
const atomicMirrorWriteV31 = (tripId: string, allData: Record<string, any>) => {
  try {
    const tripInfo = allData.trips?.[0];
    if (!tripInfo) return false;

    // 先在內存中建立完整鏡像，不直接操作 localStorage
    const newMirror: Record<string, string> = {
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
        newMirror[`sched_${tripId}_day${idx}`] = JSON.stringify(data);
      });
    }

    if (allData.planning_items) {
      ['todo', 'packing', 'shopping'].forEach(type => {
        const typeData = allData.planning_items.filter((p: any) => p.type === type);
        newMirror[`plan_${tripId}_${type}`] = JSON.stringify(typeData);
      });
    }

    if (allData.bookings) newMirror[`book_${tripId}`] = JSON.stringify(allData.bookings);
    if (allData.expenses) newMirror[`exp_${tripId}`] = JSON.stringify(allData.expenses);
    if (allData.journals) newMirror[`jrnl_${tripId}`] = JSON.stringify(allData.journals);
    if (allData.members) newMirror[`mem_${tripId}`] = JSON.stringify(allData.members);

    // 確認資料準備完畢，執行毫秒級寫入
    localStorage.clear();
    Object.entries(newMirror).forEach(([k, v]) => localStorage.setItem(k, v));
    localStorage.setItem(`last_mirror_sync_${tripId}`, new Date().toISOString());

    return true;
  } catch (e) {
    console.error("Mirror Write V3.1 Critical Failure:", e);
    return false;
  }
};

// 診斷式同步處理器：解決手機 App URL 解析失敗與連接問題
const AutoSyncHandler = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // 多重解析 ID：優先從 URL Params 抓取，失敗則嘗試從 Location Path 手動解析
  const getInitialId = () => {
    if (params.id) return params.id.trim();
    const parts = location.pathname.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart && lastPart !== 'sync' ? lastPart.trim() : '';
  };

  const [id, setId] = useState(getInitialId());
  const [status, setStatus] = useState<'check' | 'syncing' | 'success' | 'error'>('check');
  const [errorMessage, setErrorMessage] = useState('');
  const [diag, setDiag] = useState<{table: string, status: 'wait' | 'loading' | 'done', count: number}[]>([
    { table: 'Supabase 連線測試', status: 'wait', count: 0 },
    { table: '獲取行程基本配置', status: 'wait', count: 0 },
    { table: '獲取行程詳細天數', status: 'wait', count: 0 },
    { table: '交通預訂資料同步', status: 'wait', count: 0 },
    { table: '財務支出數據對齊', status: 'wait', count: 0 },
    { table: '回憶日誌與圖片', status: 'wait', count: 0 },
    { table: '成員與權限驗證', status: 'wait', count: 0 }
  ]);

  const startSync = async (targetId: string = id) => {
    const cleanId = targetId.trim();
    if (!cleanId || !supabase) {
      setStatus('error');
      setErrorMessage(!cleanId ? "請輸入有效的行程 ID" : "雲端模組初始化失敗");
      return;
    }
    
    setStatus('syncing');
    setErrorMessage('');
    
    const tables = [
      { key: 'health', label: 'Supabase 連線測試' },
      { key: 'trips', label: '獲取行程基本配置' },
      { key: 'schedules', label: '獲取行程詳細天數' },
      { key: 'bookings', label: '交通預訂資料同步' },
      { key: 'expenses', label: '財務支出數據對齊' },
      { key: 'journals', label: '回憶日誌與圖片' },
      { key: 'members', label: '成員與權限驗證' }
    ];

    try {
      const bundle: Record<string, any> = {};
      
      for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        setDiag(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'loading' } : d));
        
        if (t.key === 'health') {
          // 強制發送請求測試連線狀態
          const { error } = await supabase.from('trips').select('count', { count: 'exact', head: true }).limit(1);
          if (error) throw new Error("手機網路無法連接資料庫，請檢查是否開啟了擋廣告軟體或 VPN。");
          setDiag(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'done', count: 1 } : d));
          continue;
        }

        const { data, error } = await supabase.from(t.key).select('*').eq(t.key === 'trips' ? 'id' : 'trip_id', cleanId);
        if (error) throw new Error(`${t.label} 抓取失敗: ${error.message}`);
        
        bundle[t.key] = data || [];
        setDiag(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'done', count: data?.length || 0 } : d));
        // 短暫延遲讓視覺更平滑，並防止請求過於密集
        await new Promise(r => setTimeout(r, 100)); 
      }

      if (!bundle.trips || bundle.trips.length === 0) {
        throw new Error("找不到此 ID，請確認電腦端已按『儲存並推送雲端』。");
      }

      const success = atomicMirrorWriteV31(cleanId, bundle);
      if (success) {
        setStatus('success');
        setTimeout(() => {
          window.location.replace(window.location.origin + window.location.pathname + "#/schedule");
          window.location.reload();
        }, 1000);
      } else {
        throw new Error("本地存儲寫入失敗，請確認手機空間是否充足。");
      }
    } catch (e: any) {
      console.error("Sync Error:", e);
      setErrorMessage(e.message);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-journey-cream flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl border-4 border-journey-green relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.05] -rotate-12"><ShieldCheck size={120} /></div>
        
        <h2 className="text-3xl font-black italic text-journey-brown mb-2 tracking-tighter">鏡像同步 v3.1</h2>
        <p className="text-[10px] font-black text-journey-green uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
           <Wifi size={12} className="animate-pulse" />
           Black-Box Mirroring Active
        </p>
        
        {status === 'check' && (
          <div className="space-y-6">
            <div className="bg-journey-cream p-7 rounded-[3rem] border-2 border-dashed border-journey-brown/10">
               <div className="w-12 h-12 bg-journey-green/20 rounded-2xl flex items-center justify-center text-journey-green mb-4"><Download size={24} /></div>
               <p className="text-[11px] font-bold text-journey-brown/70 leading-relaxed italic">
                 {id ? (
                   <>準備鏡像 ID: <span className="text-journey-green font-black">{id}</span><br/></>
                 ) : (
                   <>未偵測到連結中的 ID，請手動輸入。<br/></>
                 )}
                 手機現有的資料將會被完全替換。
               </p>
            </div>
            {!id && (
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="輸入 9 碼行程 ID" 
                  className="w-full bg-journey-cream p-5 rounded-2xl font-black text-center focus:outline-none border-4 border-white shadow-inner"
                  onChange={(e) => setId(e.target.value)}
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10" size={20} />
              </div>
            )}
            <button 
              onClick={() => startSync()} 
              disabled={!id}
              className={`w-full py-6 rounded-[2.2rem] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 ${id ? 'bg-journey-green text-white' : 'bg-journey-brown/10 text-journey-brown/30'}`}
            >
              確定同步行程 <ArrowRight size={20}/>
            </button>
            <button onClick={() => navigate('/schedule')} className="w-full text-journey-brown/20 font-black py-2">略過同步</button>
          </div>
        )}

        {(status === 'syncing' || status === 'success') && (
          <div className="space-y-2">
            {diag.map((d) => (
              <div key={d.table} className={`flex justify-between items-center px-5 py-3 rounded-2xl transition-all ${d.status === 'done' ? 'bg-journey-green/10' : d.status === 'loading' ? 'bg-journey-blue/10 animate-pulse' : 'bg-journey-cream/50'}`}>
                <div className="flex items-center gap-3">
                   {d.status === 'done' ? <CheckCircle2 size={14} className="text-journey-green" /> : d.status === 'loading' ? <Loader2 size={14} className="animate-spin text-journey-blue" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-journey-brown/10" />}
                   <span className={`text-[11px] font-black ${d.status === 'done' ? 'text-journey-brown' : 'text-journey-brown/20'}`}>{d.table}</span>
                </div>
                {d.status === 'done' && <span className="text-[10px] font-black text-journey-green">{d.count}</span>}
              </div>
            ))}
            {status === 'success' && (
              <div className="pt-4 text-center">
                <p className="text-journey-green font-black italic text-sm animate-bounce">✨ 同步成功！即將跳轉...</p>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="p-8 bg-journey-red/5 rounded-[3rem] flex flex-col items-center gap-4 border-2 border-journey-red/10">
               <AlertCircle size={48} className="text-journey-red" />
               <p className="text-[11px] font-black text-journey-red text-center leading-relaxed">
                 {errorMessage}
               </p>
            </div>
            <div className="space-y-3">
               <div className="relative">
                <input 
                  type="text" 
                  value={id}
                  placeholder="重新輸入 ID" 
                  className="w-full bg-journey-cream p-5 rounded-2xl font-black text-center focus:outline-none border-4 border-white shadow-inner"
                  onChange={(e) => setId(e.target.value)}
                />
              </div>
              <button onClick={() => startSync()} className="w-full bg-journey-brown text-white py-5 rounded-3xl font-black shadow-lg">手動 ID 重新同步</button>
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
        // 靜默更新基本資訊，不影響現有行程列表（行程列表在組件內更新）
        const { data } = await supabase.from('trips').select('*').eq('id', tripConfig.id);
        if (data && data.length > 0) {
          const updated = {
            ...tripConfig,
            title: data[0].title,
            dateRange: data[0].date_range
          };
          setTripConfig(updated);
          localStorage.setItem('trip_config', JSON.stringify(updated));
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
    <p className="mt-2 text-xs font-bold opacity-30 uppercase tracking-[0.4em]">Tabi-Kuma Mirror v3.1</p>
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
    const syncUrl = `${base}#/sync/${config.id}`;
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
      alert("雲端同步失敗，請確認網路連線。");
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
             <p className="text-[10px] font-black text-journey-green uppercase tracking-widest">原子化鏡像連結</p>
             <p className="text-[8px] font-bold text-journey-brown/40 italic leading-tight">傳送此連結給隊友，確保所有人資料 100% 鏡像對齊。</p>
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
            <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase tracking-widest">修改起訖日期 (更新後將重新計算天數)</label>
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
