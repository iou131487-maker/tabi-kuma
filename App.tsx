
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, supabase } from './supabase'; 
import { Settings2, Save, X, Plane, Copy, Loader2, Share2, MousePointer2, Cloud, RefreshCw, Wifi, WifiOff, Download, ChevronRight, ClipboardPaste, AlertCircle, CheckCircle2, Info } from 'lucide-react';
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

// 核心功能：原子化寫入本地 (確保不會寫到一半失敗)
const atomicWriteToLocal = (tripId: string, allData: Record<string, any>) => {
  try {
    // 1. 行程基本設定
    const tripInfo = allData.trips?.[0];
    if (tripInfo) {
      localStorage.setItem('trip_config', JSON.stringify({
        id: tripId,
        title: tripInfo.title,
        dateRange: tripInfo.date_range,
        userAvatar: DEFAULT_CONFIG.userAvatar
      }));
    }

    // 2. 日程表 (按天拆分儲存)
    if (allData.schedules) {
      const dayIndices = Array.from(new Set(allData.schedules.map((s: any) => s.day_index)));
      dayIndices.forEach(idx => {
        const dayData = allData.schedules.filter((s: any) => s.day_index === idx);
        localStorage.setItem(`sched_${tripId}_day${idx}`, JSON.stringify(dayData));
      });
    }

    // 3. 準備清單 (按類型拆分)
    if (allData.planning_items) {
      ['todo', 'packing', 'shopping'].forEach(type => {
        const typeData = allData.planning_items.filter((p: any) => p.type === type);
        localStorage.setItem(`plan_${tripId}_${type}`, JSON.stringify(typeData));
      });
    }

    // 4. 其他模組 (直接儲存陣列)
    if (allData.bookings) localStorage.setItem(`book_${tripId}`, JSON.stringify(allData.bookings));
    if (allData.expenses) localStorage.setItem(`exp_${tripId}`, JSON.stringify(allData.expenses));
    if (allData.journals) localStorage.setItem(`jrnl_${tripId}`, JSON.stringify(allData.journals));
    if (allData.members) localStorage.setItem(`mem_${tripId}`, JSON.stringify(allData.members));

    return true;
  } catch (e) {
    console.error("寫入緩存失敗", e);
    return false;
  }
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
      // 冷啟動同步：確保本地始終有雲端最新資料
      if (!hasSyncRef.current && supabase && tripConfig.id) {
        const tables = ['trips', 'schedules', 'bookings', 'planning_items', 'expenses', 'journals', 'members'];
        const collected: Record<string, any> = {};
        for (const table of tables) {
          const { data } = await supabase.from(table).select('*').eq(table === 'trips' ? 'id' : 'trip_id', tripConfig.id);
          if (data) collected[table] = data;
        }
        atomicWriteToLocal(tripConfig.id, collected);
        hasSyncRef.current = true;
      }
      setInitializing(false);
    };
    initApp();
  }, [tripConfig.id]);

  useEffect(() => {
    setIsAnyModalOpen(showSettings);
  }, [showSettings]);

  if (initializing) return <LoadingScreen />;

  return (
    <div className="min-h-screen pb-44">
      <header className="px-6 pt-12 pb-8 flex justify-between items-start relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-journey-green rounded-[1.5rem] flex items-center justify-center text-white shadow-soft -rotate-6 border-4 border-white"><Plane size={28} /></div>
          <div><h1 className="text-3xl font-black text-journey-brown italic tracking-tighter leading-none mb-1">{tripConfig.title}</h1><p className="text-[10px] font-black text-journey-brown/40 uppercase tracking-[0.2em]">{tripConfig.dateRange}</p></div>
        </div>
        <button onClick={() => setShowSettings(true)} className="w-14 h-14 bg-white/80 backdrop-blur-md rounded-[1.5rem] shadow-soft flex items-center justify-center text-journey-brown/30 hover:text-journey-brown active:scale-90 border-4 border-white transition-all"><Settings2 size={26} /></button>
      </header>

      <main className="px-6 relative z-0">
        <Routes>
          <Route path="/schedule" element={<ScheduleView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/bookings" element={<BookingsView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/expense" element={<ExpenseView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/journal" element={<JournalView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/planning" element={<PlanningView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="/members" element={<MembersView tripConfig={tripConfig} onModalToggle={setIsAnyModalOpen} />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>

      <TripSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={tripConfig} onSave={setTripConfig} />
      
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
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-sky-400 text-white text-center p-10">
    <div className="relative z-10">
      <div className="bg-white/20 p-10 rounded-full animate-pulse mb-8"><Plane size={80} fill="white" className="rotate-45" /></div>
      <p className="text-2xl font-black italic">旅程同步中...</p>
      <p className="text-xs font-bold opacity-60 mt-4 uppercase tracking-[0.3em]">請確保手機網路通暢</p>
    </div>
  </div>
);

const TripSettingsModal = ({ isOpen, onClose, config, onSave }: any) => {
  const [formData, setFormData] = useState(config);
  const [targetId, setTargetId] = useState('');
  const [diagLog, setDiagLog] = useState<{table: string, count: number, status: 'wait'|'sync'|'done'|'error'}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSyncAll = async () => {
    const cleanId = targetId.trim();
    if (!cleanId || cleanId.length < 5) return alert('請輸入行程 ID');
    if (!supabase) return alert('網路連線失敗，請檢查網路狀態');
    
    setIsProcessing(true);
    const tables = ['trips', 'schedules', 'bookings', 'planning_items', 'expenses', 'journals', 'members'];
    setDiagLog(tables.map(t => ({ table: t, count: 0, status: 'wait' })));

    try {
      // 1. 下載所有資料到暫存物件
      const bundle: Record<string, any> = {};
      let tripFound = false;

      for (const table of tables) {
        setDiagLog(prev => prev.map(l => l.table === table ? { ...l, status: 'sync' } : l));
        
        const { data, error } = await supabase.from(table).select('*').eq(table === 'trips' ? 'id' : 'trip_id', cleanId);
        
        if (error) {
          console.error(`下載 ${table} 出錯:`, error);
          setDiagLog(prev => prev.map(l => l.table === table ? { ...l, status: 'error' } : l));
          throw new Error(`${table} 下載失敗，請檢查資料庫 RLS 權限。`);
        }

        if (table === 'trips' && data && data.length > 0) tripFound = true;
        
        bundle[table] = data || [];
        setDiagLog(prev => prev.map(l => l.table === table ? { ...l, status: 'done', count: data?.length || 0 } : l));
        
        // 給手機端一點點喘息時間，避免連發請求被阻擋
        await new Promise(r => setTimeout(r, 100));
      }

      if (!tripFound) throw new Error('雲端找不到該 ID 的主行程，請確認電腦端的 ID 是否正確。');

      // 2. 全部成功後，才執行原子寫入本地
      const success = atomicWriteToLocal(cleanId, bundle);
      if (!success) throw new Error('手機儲存空間寫入失敗，請嘗試清除瀏覽器快取。');

      setDiagLog(prev => [...prev]); // 觸發最後一次渲染
      alert('同步成功！即將為您載入新行程。');
      window.location.reload();
      
    } catch (err: any) { 
      console.error("同步終斷", err);
      alert(`❌ 同步失敗: ${err.message}`); 
      setIsProcessing(false); 
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTargetId(text.trim());
    } catch (err) {
      alert('請長按輸入框手動貼上 ID');
    }
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[999] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-white w-full max-w-md rounded-t-[4xl] sm:rounded-5xl p-10 pb-32 shadow-2xl space-y-6 relative overflow-y-auto max-h-[95vh] border-t-8 border-journey-green">
        {isProcessing && (
          <div className="absolute inset-0 bg-white/98 z-[300] flex flex-col p-10 animate-in fade-in">
             <div className="flex items-center justify-between mb-8">
                <div>
                  <h4 className="text-2xl font-black italic">雲端下載中</h4>
                  <p className="text-[10px] font-black text-journey-green uppercase tracking-widest">請勿關閉視窗</p>
                </div>
                <RefreshCw className="animate-spin text-journey-green" size={32} />
             </div>
             <div className="space-y-2 flex-grow overflow-y-auto pr-2">
                {diagLog.map(log => (
                  <div key={log.table} className="flex justify-between items-center p-4 bg-journey-cream rounded-2xl border-2 border-white">
                    <span className="font-black text-[10px] uppercase tracking-widest text-journey-brown/60">{log.table}</span>
                    <div className="flex items-center gap-2">
                       {log.status === 'sync' && <Loader2 size={16} className="animate-spin text-journey-blue" />}
                       {log.status === 'done' && <span className="text-journey-darkGreen font-black text-xs">{log.count} 筆 <CheckCircle2 size={14} className="inline ml-1"/></span>}
                       {log.status === 'error' && <AlertCircle size={16} className="text-journey-red" />}
                       {log.status === 'wait' && <div className="w-4 h-4 rounded-full bg-journey-brown/5" />}
                    </div>
                  </div>
                ))}
             </div>
             <div className="mt-6 p-4 bg-journey-blue/10 rounded-2xl flex gap-3 items-center">
                <Info size={16} className="text-journey-blue shrink-0" />
                <p className="text-[9px] font-bold text-journey-blue leading-tight italic">若所有項目均為 0 筆，請檢查 Supabase 的 RLS 權限是否設為 Everyone Read。</p>
             </div>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black italic">行程設定與同步</h3>
          <button onClick={onClose} className="p-2 active:scale-90"><X size={24} className="text-journey-brown/20" /></button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-journey-brown/30 ml-4 uppercase tracking-widest">目前行程名稱</label>
            <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-5 rounded-[2rem] font-black focus:outline-none border-4 border-white shadow-inner" />
          </div>

          <div className="p-8 bg-journey-blue/5 rounded-[2.5rem] border-4 border-journey-blue/10 space-y-5 shadow-soft-sm">
             <div className="flex justify-between items-center px-1">
                <div>
                  <p className="text-[10px] font-black text-journey-blue uppercase tracking-[0.2em]">同步其他裝置資料</p>
                  <p className="text-[8px] font-bold text-journey-blue/50 italic">輸入電腦端的 ID 以載入完整行程</p>
                </div>
                <button onClick={handlePaste} className="text-[10px] font-black text-journey-blue bg-white px-4 py-2 rounded-full shadow-sm active:scale-95">點擊貼上 ID</button>
             </div>
             <input value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-white p-5 rounded-2xl text-sm font-black border-2 border-journey-blue/10 focus:border-journey-blue focus:outline-none placeholder:text-journey-brown/10" placeholder="在此處輸入或貼上 ID..." />
             <button onClick={handleSyncAll} className="w-full bg-journey-blue text-white py-6 rounded-2xl font-black text-sm shadow-lg shadow-journey-blue/30 active:scale-95 transition-all flex items-center justify-center gap-2">
               <Download size={20} /> 立即下載雲端資料
             </button>
          </div>
        </div>

        <button onClick={() => { onSave(formData); onClose(); }} className="w-full bg-journey-brown text-white py-6 rounded-[2.5rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
          <Save size={24} /> 儲存本地修改
        </button>
      </div>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
