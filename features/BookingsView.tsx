import React, { useState, useEffect } from 'react';
import { Plane, Hotel, Ticket, Lock, Unlock, Plus, X, Send, Trash2, MapPin, Loader2, Calendar } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const BookingsView: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [type, setType] = useState<'flight' | 'hotel' | 'ticket'>('flight');
  const [title, setTitle] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [flightNo, setFlightNo] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [cost, setCost] = useState('');

  const tripId = 'hokkaido-2024';

  const fetchBookings = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setBookings([
        { id: 'demo-1', type: 'flight', details: { from: 'TPE', to: 'CTS', flightNo: 'JL812', time: '5/12 08:30' } }
      ]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (!error) setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
    if (supabase) {
      const channel = supabase.channel('bookings-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchBookings())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  const toggleLock = () => {
    if (isUnlocked) {
      setIsUnlocked(false);
    } else {
      const pin = prompt('請輸入 PIN 碼 (預設 007)');
      if (pin === '007') setIsUnlocked(true);
      else alert('PIN 碼錯誤！');
    }
  };

  const handleAdd = async () => {
    if (!supabase) {
      alert("Demo 模式不支援儲存");
      return;
    }

    const payload: any = {
      type,
      title: type === 'flight' ? `${from} → ${to}` : title,
      trip_id: tripId,
      details: type === 'flight' ? { from, to, flightNo, time } : type === 'hotel' ? { address, checkIn, cost } : { note: '一般票券' }
    };

    const { error } = await supabase.from('bookings').insert([payload]);
    if (!error) {
      setShowAddModal(false);
      fetchBookings();
    }
  };

  const handleDelete = async (id: string) => {
    if (!supabase || !confirm('確定要刪除嗎？')) return;
    await supabase.from('bookings').delete().eq('id', id);
    fetchBookings();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black text-journey-brown tracking-tight">預訂與憑證</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowAddModal(true)} className="p-2.5 bg-journey-green text-white rounded-2xl shadow-soft active:scale-90 transition-transform"><Plus size={20} /></button>
          <button onClick={toggleLock} className={`p-2.5 rounded-2xl flex items-center gap-2 transition-all ${isUnlocked ? 'bg-journey-accent text-journey-brown shadow-soft' : 'bg-white shadow-soft text-journey-brown/20'}`}>{isUnlocked ? <Unlock size={20} /> : <Lock size={20} />}</button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 opacity-30"><Loader2 className="animate-spin mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">同步中...</p></div>
      ) : bookings.length === 0 ? (
        <div className="bg-white/40 rounded-4xl p-12 text-center border-2 border-dashed border-journey-sand"><p className="text-journey-brown/40 text-sm font-bold">還沒有任何預訂...✨</p></div>
      ) : (
        <div className="space-y-6">
          {bookings.map((item) => (
            <div key={item.id} className="relative animate-in fade-in slide-in-from-bottom-4">
              {isUnlocked && <button onClick={() => handleDelete(item.id)} className="absolute -top-2 -right-2 z-20 bg-white shadow-soft text-journey-red p-2 rounded-full"><Trash2 size={14} /></button>}
              {item.type === 'flight' ? (
                <div className="relative overflow-visible">
                  <div className="bg-white rounded-t-3xl p-6 border-b-2 border-dashed border-journey-sand shadow-soft">
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-journey-brown"><h3 className="text-2xl font-black">{item.details?.from || '---'}</h3><p className="text-[10px] font-bold opacity-30 uppercase">Origin</p></div>
                      <div className="flex flex-col items-center"><Plane size={24} className="text-journey-blue transform rotate-45 mb-1" /><div className="w-16 h-[1.5px] bg-journey-sand"></div><p className="text-[9px] mt-1 font-black text-journey-brown/40">{item.details?.flightNo || 'FLIGHT'}</p></div>
                      <div className="text-right text-journey-brown"><h3 className="text-2xl font-black">{item.details?.to || '---'}</h3><p className="text-[10px] font-bold opacity-30 uppercase">Dest</p></div>
                    </div>
                    <div className="flex items-center gap-2 text-journey-brown"><Calendar size={14} className="text-journey-blue" /><span className="text-xs font-black">{item.details?.time || '時間未定'}</span></div>
                  </div>
                  <div className="bg-white rounded-b-3xl p-5 shadow-soft flex items-center justify-between border-t border-journey-sand/10"><p className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest">Boarding Pass Verified</p><div className="w-8 h-8 bg-journey-sand/30 rounded-lg flex items-center justify-center opacity-40"><Ticket size={16} /></div></div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-soft">
                  <div className="w-12 h-12 bg-journey-blue/10 rounded-2xl flex items-center justify-center text-journey-blue"><Ticket size={24} /></div>
                  <div className="flex-grow"><h5 className="font-black text-journey-brown text-sm">{item.title}</h5><p className="text-[10px] text-journey-brown/40 font-bold uppercase tracking-widest">電子憑證</p></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-lg font-black text-journey-brown">新增預訂</h3><button onClick={() => setShowAddModal(false)} className="p-2 bg-journey-cream rounded-full"><X size={20} /></button></div>
            <div className="flex bg-journey-cream p-1 rounded-2xl">{(['flight', 'hotel', 'ticket'] as const).map(t => (
              <button key={t} onClick={() => setType(t)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${type === t ? 'bg-white text-journey-brown shadow-sm' : 'text-journey-brown/30'}`}>{t === 'flight' ? '機票' : t === 'hotel' ? '住宿' : '票券'}</button>
            ))}</div>
            <div className="space-y-4">
              {type === 'flight' ? (
                <><div className="grid grid-cols-2 gap-3">
                  <input type="text" value={from} onChange={e => setFrom(e.target.value.toUpperCase())} placeholder="TPE" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" maxLength={3} />
                  <input type="text" value={to} onChange={e => setTo(e.target.value.toUpperCase())} placeholder="CTS" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" maxLength={3} />
                </div>
                <input type="text" value={flightNo} onChange={e => setFlightNo(e.target.value.toUpperCase())} placeholder="JL 096" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" />
                <input type="text" value={time} onChange={e => setTime(e.target.value)} placeholder="5/12 08:30" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" /></>
              ) : <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="名稱" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" />}
            </div>
            <button onClick={handleAdd} className="w-full bg-journey-darkGreen text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"><Send size={18} /> 儲存</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsView;