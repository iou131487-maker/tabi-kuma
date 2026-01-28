
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from './constants';
import ScheduleView from './features/ScheduleView';
import BookingsView from './features/BookingsView';
import ExpenseView from './features/ExpenseView';
import JournalView from './features/JournalView';
import PlanningView from './features/PlanningView';
import MembersView from './features/MembersView';

const TAB_COLORS: Record<string, string> = {
  schedule: '#E0F2F1', // 薄荷綠
  bookings: '#E1F5FE', // 蘇打藍
  expense: '#FCE4EC',  // 櫻花粉
  journal: '#F3E5F5',  // 夢幻紫
  planning: '#FFF9C4', // 檸檬黃
  members: '#FFF3E0'   // 蜜桃橘
};

const Header = () => (
  <header className="px-6 pt-8 pb-4 flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-black text-journey-brown tracking-tight">北海道．春櫻之旅</h1>
      <p className="text-journey-brown/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">2024 MAY 12 - MAY 18</p>
    </div>
    <div className="w-12 h-12 rounded-3xl bg-white shadow-soft flex items-center justify-center overflow-hidden border-4 border-white">
       <img src="https://picsum.photos/seed/traveler/100/100" className="w-full h-full object-cover" alt="user" />
    </div>
  </header>
);

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.substring(1) || 'schedule';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-t border-white/20 h-24 px-6 flex items-center justify-around pb-6 z-50">
      {NAV_ITEMS.map((item) => {
        const isActive = currentPath === item.id;
        return (
          <button
            key={item.id}
            onClick={() => navigate(`/${item.id}`)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-500 active:scale-90 ${
              isActive ? 'text-journey-brown' : 'text-journey-brown/30'
            }`}
          >
            <div className={`p-2.5 rounded-2xl transition-all duration-500 ${isActive ? 'bg-white shadow-soft-sm scale-110' : 'bg-transparent'}`}>
              {/* Fix: Casting to React.ReactElement<any> to allow additional props for lucide-react icons */}
              {React.cloneElement(item.icon as React.ReactElement<any>, { size: 22, strokeWidth: isActive ? 2.5 : 2 })}
            </div>
            <span className={`text-[9px] font-black tracking-widest ${isActive ? 'opacity-100' : 'opacity-40'}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

const BackgroundManager = () => {
  const location = useLocation();
  const currentPath = location.pathname.substring(1) || 'schedule';

  useEffect(() => {
    document.body.style.backgroundColor = TAB_COLORS[currentPath] || '#FFF0F5';
  }, [currentPath]);

  return null;
};

const App: React.FC = () => {
  return (
    <Router>
      <BackgroundManager />
      <div className="min-h-screen pb-28 max-w-md mx-auto relative overflow-x-hidden">
        <Header />
        <main className="px-5 transition-all duration-500">
          <Routes>
            <Route path="/" element={<Navigate to="/schedule" replace />} />
            <Route path="/schedule" element={<ScheduleView />} />
            <Route path="/bookings" element={<BookingsView />} />
            <Route path="/expense" element={<ExpenseView />} />
            <Route path="/journal" element={<JournalView />} />
            <Route path="/planning" element={<PlanningView />} />
            <Route path="/members" element={<MembersView />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </Router>
  );
};

export default App;
