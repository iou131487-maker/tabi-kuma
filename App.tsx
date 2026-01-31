
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, supabase } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, Cloud, RefreshCw, Download, CheckCircle2, AlertCircle, Info, Link as LinkIcon, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
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

// 絕對鏡像對齊：徹底清除並重建
const atomicMirrorWrite = (tripId: string, allData: Record<string, any>) => {
  try {
    const tripInfo = allData.trips?.[0];
    if (!tripInfo) return false;

    // 1. 強制清空所有 localStorage (這是確保不殘留舊資料的關鍵)
    localStorage.clear();

    // 2. 寫入新的核心配置
    localStorage.setItem('trip_config', JSON.stringify({
      id: tripId,
      title: tripInfo.title,
      dateRange: tripInfo.date_range,
      userAvatar: DEFAULT_CONFIG.userAvatar
    }));

    // 3. 寫入日程 (按 Day 分組)
    if (allData.schedules) {
      const dayGroups = allData.schedules.reduce((acc: any, s: any) => {
        acc[s.day_index] = acc[s.day_index] || [];
        acc[s.day_index].push(s);
        return acc;
      }, {});
      Object.entries(dayGroups).forEach(([idx, data]) => {
        localStorage.setItem(`sched_${tripId}_day${idx}`, JSON.stringify(data));
      });
    }

    // 4. 寫入清單
    if (allData.planning_items) {
      ['todo', 'packing', 'shopping'].forEach(type => {
        const typeData = allData.planning_items.filter((p: any) => p.type === type);
        localStorage.setItem(`plan_${tripId}_${type}`, JSON.stringify(typeData));
      });
    }

    // 5. 寫入其他鏡像模塊
    if (allData.bookings) localStorage.setItem(`book_${tripId}`, JSON.stringify(allData.bookings));
    if (allData.expenses) localStorage.setItem(`exp_${tripId}`, JSON.stringify(allData.expenses));
    if (allData.journals) localStorage.setItem(`jrnl_${tripId}`, JSON.stringify(allData.journals));
    if (allData.members) localStorage.setItem(`mem_${tripId}`, JSON.stringify(allData.members));

    // 設定最後同步時間標記
    localStorage.setItem(`last_mirror_sync_${tripId}`, new Date().toISOString());

    return true;
  } catch (e) {
    console.error("Atomic Mirroring Failed:", e);
    return false;
  }
};

// 全自動同步處理器 (診斷式介面)
const AutoSyncHandler = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'confirm' | 'syncing' | 'success' | 'error'>('confirm');
  const [diag, setDiag] = useState<{table: string, status: 'wait' | 'loading' | 'done', count: number}[]>([
    { table: '行程基礎配置', status: 'wait', count: 0 },
    { table: '每日日程細節', status: 'wait', count: 0 },
    { table: '交通機票預訂', status: 'wait', count: 0 },
    { table: '清單與待辦', status: 'wait', count: 0 },
    { table: '記帳與預算', status: 'wait', count: 0 },
    { table: '回憶日誌相簿', status: 'wait', count: 0 },
    { table: '共同旅遊成員', status: 'wait', count: 0 }
  ]);

  const startSync = async () => {
    if (!id || !supabase) return;
    setStatus('syncing');
    
    const tables = [
      { key: 'trips', label: '行程基礎配置' },
      { key: 'schedules', label: '每日日程細節' },
      { key: 'bookings', label: '交通機票預訂' },
      { key: 'planning_items', label: '清單與待辦' },
      { key: 'expenses', label: '記帳與預算' },
      { key: 'journals', label: '回憶日誌相簿' },
      { key: 'members', label: '共同旅遊成員' }
    ];

    try {
      const bundle: Record<string, any> = {};
      
      for (let i = 0; i < tables.length; i++) {
        const t = tables[i];
        setDiag(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'loading' } : d));
        
        const { data, error } = await supabase.from(t.key).select('*').eq(t.key === 'trips' ? 'id' : 'trip_id', id);
        if (error) throw error;
        
        bundle[t.key] = data || [];
        setDiag(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'done', count: data?.length || 0 } : d));
        await new Promise(r => setTimeout(r, 200)); 
      }

      if (!bundle.trips.length) throw new Error("雲端找不到此 ID 的行程，請確認電腦端已儲存。");

      const success = atomicMirrorWrite(id, bundle);
      if (success) {
        setStatus('success');
        setTimeout(() => {
          // 強制重整以套用全新的 localStorage
          window.location.replace(window.location.origin + window.location.pathname + "#/schedule");
          window.location.reload();
        }, 1500);
      } else {
        throw new Error("本地寫入失敗，請檢查手機儲存空間。");
      }
    } catch (e: any) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-[#FDFBF7] flex flex-col items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-sm bg-white rounded-[4rem] p-10 shadow-2xl border-4 border-journey-green relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] -rotate-12"><ShieldCheck size={120} /></div>
        
        <h2 className="text-3xl font-black italic text-journey-brown mb-2 tracking-tighter">鏡像對齊系統</h2>
        <p className="text-[10px] font-black text-journey-green uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
           <span className="w-2 h-2 bg-journey-green rounded-full animate-pulse" />
           MIRROR PROTOCOL V2.5
        </p>
        
        {status === 'confirm' && (
          <div className="space-y-6">
            <div className="bg-journey-cream p-6 rounded-[2.5rem] border-2 border-dashed border-journey-brown/10">
               <p className="text-[11px] font-bold text-journey-brown/60 leading-relaxed italic">
                 此操作將執行<span className="text-journey-red font-black">「全量數據覆蓋」</span>：手機現有的所有本地暫存將被清空，並 1:1 克隆雲端 ID <span className="text-journey-green font-black">{id}</span> 的所有資料。
               </p>
            </div>
            <button onClick={startSync} className="w-full bg-journey-green text-white py-6 rounded-[2rem] font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">確定鏡像對齊 <ArrowRight size={20}/></button>
            <button onClick={() => navigate('/schedule')} className="w-full text-journey-brown/20 font-black py-2 hover:text-journey-brown/40 transition-colors">取消並回主頁</button>
          </div>
        )}

        {(status === 'syncing' || status === 'success') && (
          <div className="space-y-2.5">
            {diag.map((d) => (
              <div key={d.table} className={`flex justify-between items-center px-5 py-3 rounded-2xl transition-all ${d.status === 'done' ? 'bg-journey-green/10 translate-x-1' : d.status === 'loading' ? 'bg-journey-blue/10 animate-pulse' : 'bg-journey-cream/50'}`}>
                <div className="flex items-center gap-3">
                   {d.status === 'done' ? <CheckCircle2 size={14} className="text-journey-green" /> : d.status === 'loading' ? <Loader2 size={14} className="animate-spin text-journey-blue" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-journey-brown/10" />}
                   <span className={`text-[11px] font-black ${d.status === 'done' ? 'text-journey-brown' : 'text-journey-brown/30'}`}>{d.table}</span>
                </div>
                {d.status === 'done' && <span className="text-[10px] font-black text-journey-green">{d.count} 筆</span>}
              </div>
            ))}
            {status === 'success' && (
              <div className="pt-6 text-center animate-in fade-in slide-in-from-bottom-2">
                <div className="inline-flex items-center gap-2 text-journey-green font-black italic">
                   <ShieldCheck size={20} />
                   <span>鏡像完成！正在套用...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="p-8 bg-journey-red/5 rounded-[3rem] flex flex-col items-center gap-4 border-2 border-journey-red/10">
               <AlertCircle size={48} className="text-journey-red" />
               <p className="text-xs font-black text-journey-red text-center leading-relaxed uppercase tracking-widest">
                 同步失敗！<br/>1. 請確保電腦端已按「儲存」<br/>2. 檢查手機網路連線<br/>3. 確認 ID 是否輸入正確
               </p>
            </div>
            <button onClick={() => setStatus('confirm')} className="w-full bg-journey-brown text-white py-5 rounded-3xl font-black shadow-lg">再試一次</button>
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
    <p className="mt-2 text-xs font-bold opacity-30 uppercase tracking-[0.4em]">Tabi-Kuma: Mirror Protocol Active</p>
  </div>
);

const TripSettingsModal = ({ isOpen, onClose, config, onSave }: any) => {
  const [formData, setFormData] = useState(config);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    const time = localStorage.getItem(`last_mirror_sync_${config.id}`);
    if (time) setLastSynced(new Date(time).toLocaleTimeString());
  }, [config.id, isProcessing]);

  const dates = config.dateRange.split(' ~ ');
  const [startDate, setStartDate] = useState(dates[0] || '');
  const [endDate, setEndDate] = useState(dates[1] || '');

  useEffect(() => {
    setFormData(prev => ({ ...prev, dateRange: `${startDate} ~ ${endDate}` }));
  }, [startDate, endDate]);

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
      localStorage.setItem(`last_mirror_sync_${config.id}`, new Date().toISOString());
      onClose();
    } catch (e) {
      alert("儲存失敗，請檢查網路狀態");
    } finally {
      setIsProcessing(false);
    }
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[1999] bg-journey-brown/70 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[4rem] sm:rounded-[3.5rem] p-10 pb-32 shadow-2xl space-y-8 relative overflow-y-auto max-h-[95vh] border-t-8 border-journey-green">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-2xl font-black italic text-journey-brown tracking-tighter">旅程設定</h3>
            {lastSynced && <p className="text-[8px] font-black text-journey-green uppercase tracking-widest mt-1 flex items-center gap-1"><Cloud size={10} /> 最後同步：{lastSynced}</p>}
          </div>
          <button onClick={onClose} className="p-2 bg-journey-cream rounded-full active:scale-75 transition-transform"><X size={20} className="text-journey-brown/30" /></button>
        </div>

        {/* 懶人鏡像連結區 (最推薦) */}
        <div className="p-7 bg-journey-green/10 rounded-[2.5rem] border-4 border-white shadow-soft-sm space-y-4">
           <div>
             <p className="text-[10px] font-black text-journey-green uppercase tracking-widest">全自動鏡像克隆連結</p>
             <p className="text-[8px] font-bold text-journey-brown/40 italic leading-tight">複製後在手機點開，App 會自動重置並與此裝置對齊。</p>
           </div>
           <button onClick={copySyncLink} className={`w-full py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 transition-all ${shareCopied ? 'bg-journey-darkGreen text-white' : 'bg-white text-journey-green shadow-sm border-2 border-journey-green/10 active:scale-95'}`}>
             {shareCopied ? <><CheckCircle2 size={18}/> 鏡像連結複製成功！</> : <><LinkIcon size={18}/> 產生克隆連結</>}
           </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase tracking-widest">行程名稱</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none border-4 border-white shadow-inner" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase tracking-widest">日期範圍修改 (影響 Day 1~N)</label>
            <div className="grid grid-cols-2 gap-3">
               <div className="relative">
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl font-black text-[10px] border-4 border-white focus:outline-none" />
                 <p className="absolute -top-2 left-4 bg-white px-2 text-[8px] font-black text-journey-green">開始</p>
               </div>
               <div className="relative">
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl font-black text-[10px] border-4 border-white focus:outline-none" />
                 <p className="absolute -top-2 left-4 bg-white px-2 text-[8px] font-black text-journey-red">結束</p>
               </div>
            </div>
          </div>
        </div>

        <button onClick={handleUpdateTrip} disabled={isProcessing} className="w-full bg-journey-brown text-white py-6 rounded-[2.5rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
          {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> 強制推送到雲端</>}
        </button>

        <div className="pt-4 text-center">
          <p className="text-[8px] font-black text-journey-brown/10 uppercase tracking-[0.4em]">TRIP ID: {config.id}</p>
        </div>
      </div>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
