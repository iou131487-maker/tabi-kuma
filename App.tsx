
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import { initSupabaseAuth, isSupabaseConfigured } from './supabase'; 
import { Settings2, Save, X, Plane, Edit3, Camera, Copy, Loader2, Link, LogIn, Database, AlertTriangle, RefreshCw } from 'lucide-react';
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

const SQL_INSTRUCTIONS = `
-- 建立資料表指令 --
create table if not exists schedules ( id text primary key, trip_id text, day_index int, title text, time text, category text, location text, created_at timestamptz default now() );
create table if not exists expenses ( id text primary key, trip_id text, title text, amount numeric, currency text, payer text, category text, split_count int default 1, created_at timestamptz default now() );
create table if not exists members ( id text primary key, trip_id text, name text, avatar text, created_at timestamptz default now() );
create table if not exists bookings ( id text primary key, trip_id text, type text, title text, "from" text, "to" text, time text, created_at timestamptz default now() );
create table if not exists planning_items ( id text primary key, trip_id text, type text, text text, completed boolean, parent_id text, imageUrl text, created_at timestamptz default now() );
create table if not exists journals ( id text primary key, trip_id text, content text, location text, images text[], created_at timestamptz default now() );

-- 開啟權限 --
alter table schedules enable row level security; create policy "Public" on schedules for all using (true) with check (true);
alter table expenses enable row level security; create policy "Public" on expenses for all using (true) with check (true);
alter table members enable row level security; create policy "Public" on members for all using (true) with check (true);
alter table bookings enable row level security; create policy "Public" on bookings for all using (true) with check (true);
alter table planning_items enable row level security; create policy "Public" on planning_items for all using (true) with check (true);
alter table journals enable row level security; create policy "Public" on journals for all using (true) with check (true);
`;

const TripSettingsModal = ({ isOpen, onClose, config, onSave }: { isOpen: boolean, onClose: () => void, config: any, onSave: (newConfig: any) => void }) => {
  const [formData, setFormData] = useState(config);
  const [joinId, setJoinId] = useState('');

  useEffect(() => { if (isOpen) setFormData(config); }, [isOpen, config]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return !isOpen ? null : (
    <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[3.5rem] sm:rounded-[3rem] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center"><h3 className="text-xl font-black text-journey-brown italic">同步 & 行程設定</h3><button onClick={onClose}><X className="text-journey-brown/20" /></button></div>
        
        <div className="bg-journey-red/10 p-5 rounded-3xl border-2 border-journey-red/20 space-y-3">
             <h4 className="text-sm font-black text-journey-red flex items-center gap-2"><Database size={16}/> 同步失敗修復</h4>
             <p className="text-[10px] text-journey-brown/60">若 F5 資料消失，請在電腦端複製 SQL 指令並到 Supabase SQL Editor 貼上執行。</p>
             <button onClick={() => { navigator.clipboard.writeText(SQL_INSTRUCTIONS); alert('SQL 指令已複製！'); }} className="w-full bg-white py-3 rounded-xl text-xs font-black text-journey-red shadow-sm border border-journey-red/20 active:scale-95">
                複製 SQL 修復指令
             </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1"><label className="text-[10px] font-black text-journey-brown/30 ml-2">行程標題</label><input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-journey-cream p-4 rounded-2xl font-black focus:outline-none" /></div>
          <div className="space-y-1"><label className="text-[10px] font-black text-journey-brown/30 ml-2">此裝置代碼 (分享給隊友)</label>
            <div className="flex gap-2">
                <input readOnly value={config.id} className="flex-grow bg-journey-blue/10 p-4 rounded-2xl font-mono text-xs font-black text-journey-blue" />
                <button onClick={() => { navigator.clipboard.writeText(config.id); alert('代碼已複製！'); }} className="px-4 bg-journey-blue text-white rounded-2xl"><Copy size={16}/></button>
            </div>
          </div>
        </div>

        <div className="p-5 bg-journey-green/10 rounded-3xl space-y-3">
            <p className="text-[10px] font-black text-journey-darkGreen uppercase opacity-60">加入隊友的行程</p>
            <div className="flex gap-2">
                <input placeholder="貼上代碼..." value={joinId} onChange={e => setJoinId(e.target.value)} className="flex-grow bg-white p-3 rounded-xl text-xs font-black focus:outline-none" />
                <button onClick={() => { 
                    if(!joinId) return;
                    if(confirm('確定要切換行程？這將同步隊友的雲端資料。')) { 
                        localStorage.setItem('trip_config', JSON.stringify({...config, id: joinId})); 
                        window.location.reload(); 
                    } 
                }} className="px-4 bg-journey-darkGreen text-white rounded-xl font-black text-xs">加入行程</button>
            </div>
        </div>

        <button onClick={handleSave} className="w-full bg-journey-brown text-white font-black py-5 rounded-[2rem] shadow-lg active:scale-95 transition-transform"><Save size={20} className="inline mr-2" /> 儲存變更</button>
      </div>
    </div>
  );
};

// Fix: Add the missing Header component
const Header = ({ tripConfig, onOpenSettings }: { tripConfig: any, onOpenSettings: () => void }) => {
  return (
    <header className="px-6 pt-12 pb-8 flex justify-between items-start">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-journey-green rounded-2xl flex items-center justify-center text-white shadow-soft-sm -rotate-6 transition-transform hover:rotate-0">
            <Plane size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-journey-brown italic tracking-tighter leading-none">{tripConfig.title}</h1>
            <p className="text-[10px] font-black text-journey-brown/30 uppercase tracking-[0.2em] mt-1">{tripConfig.dateRange}</p>
          </div>
        </div>
      </div>
      <button 
        onClick={onOpenSettings}
        className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-soft flex items-center justify-center text-journey-brown/20 hover:text-journey-brown transition-all active:scale-90 border-2 border-white"
      >
        <Settings2 size={24} />
      </button>
    </header>
  );
};

const AppContent = () => {
  const [initializing, setInitializing] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [tripConfig, setTripConfig] = useState(() => {
    const saved = localStorage.getItem('trip_config');
    if (saved) return JSON.parse(saved);
    const newId = `trip-${Math.random().toString(36).substr(2, 9)}`;
    return { ...DEFAULT_CONFIG, id: newId };
  });
  
  const location = useLocation();
  const currentBg = BACKGROUND_COLORS[location.pathname] || '#FDFBF7';

  useEffect(() => {
    document.body.style.backgroundColor = currentBg;
    localStorage.setItem('trip_config', JSON.stringify(tripConfig));
    initSupabaseAuth().then(() => setInitializing(false));
  }, [tripConfig, currentBg]);

  if (initializing) return <div className="h-screen w-screen flex items-center justify-center bg-journey-cream"><Loader2 className="text-journey-green animate-spin" size={48} /></div>;

  return (
    <div className="min-h-screen pb-32">
      <Header tripConfig={tripConfig} onOpenSettings={() => setShowSettings(true)} />
      <main className="px-6">
        <Routes>
          <Route path="/schedule" element={<ScheduleView tripConfig={tripConfig} />} />
          <Route path="/bookings" element={<BookingsView tripConfig={tripConfig} />} />
          <Route path="/expense" element={<ExpenseView tripConfig={tripConfig} />} />
          <Route path="/journal" element={<JournalView tripConfig={tripConfig} />} />
          <Route path="/planning" element={<PlanningView tripConfig={tripConfig} />} />
          <Route path="/members" element={<MembersView tripConfig={tripConfig} />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>
      <TripSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={tripConfig} onSave={(cfg) => setTripConfig(cfg)} />
      
      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[340px] bg-white/90 backdrop-blur-2xl px-2 py-3 z-50 rounded-[2.5rem] shadow-2xl border-4 border-white flex justify-around items-center">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname.includes(item.id);
          return (
            <button key={item.id} onClick={() => window.location.hash = `#/${item.id}`} className={`relative w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${isActive ? 'bg-journey-green text-white shadow-lg -translate-y-1' : 'text-journey-brown/20'}`}>
              {item.icon}
              {isActive && <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default function App() { return <Router><AppContent /></Router>; }
