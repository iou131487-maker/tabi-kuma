
import React, { useState, useEffect, useCallback } from 'react';
import { Plane, Hotel, Ticket, Plus, X, Send, MapPin, Loader2, Calendar, Car, Tag, QrCode, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const BookingsView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [type, setType] = useState<'flight' | 'hotel' | 'car' | 'ticket'>('flight');
  const [title, setTitle] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [details, setDetails] = useState<any>({ from: '', to: '', flightNo: '', address: '', note: '' });

  const tripId = tripConfig.id;

  const fetchBookings = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    
    // 1. 本地優先
    const localKey = `bookings_${tripId}`;
    const saved = localStorage.getItem(localKey);
    if (saved) setBookings(JSON.parse(saved));
    else setBookings([]);

    // 2. 雲端同步
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false });
          
        if (!error && data) {
          setBookings(data);
          localStorage.setItem(localKey, JSON.stringify(data));
        }
      } catch (e) { console.error("Booking Fetch Error"); }
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleSave = async () => {
    const finalTitle = type === 'flight' ? `${details.from} → ${details.to}` : title;
    if (!finalTitle && type !== 'flight') return alert("請填寫標題喔！");

    const payload = { 
      id: Date.now().toString(),
      type, title: finalTitle, 
      details: { ...details, time: `${bookingDate} ${bookingTime}`.trim() }, 
      trip_id: tripId,
      created_at: new Date().toISOString()
    };

    // 雙重持久化：先寫雲端
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from('bookings').insert([payload]);
      if (error) return alert("儲存失敗");
    }

    // 成功後更新本地與狀態
    const localKey = `bookings_${tripId}`;
    const updated = [payload, ...bookings];
    setBookings(updated);
    localStorage.setItem(localKey, JSON.stringify(updated));

    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('要刪除這張憑證嗎？')) return;
    
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) return alert("刪除失敗");
    }

    const localKey = `bookings_${tripId}`;
    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    localStorage.setItem(localKey, JSON.stringify(updated));
  };

  const resetForm = () => { setTitle(''); setBookingDate(''); setBookingTime(''); setDetails({ from: '', to: '', flightNo: '', address: '', note: '' }); };

  const renderBoardingPass = (item: any) => {
    const isFlight = item.type === 'flight';
    return (
      <div key={item.id} className="relative group animate-in fade-in slide-in-from-bottom-4">
        {isFlight ? (
          <div className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden flex flex-col sm:flex-row border-2 border-journey-sand/20">
            <div className="flex-grow p-8 relative">
              <button onClick={() => handleDelete(item.id)} className="absolute top-4 right-4 p-2 text-journey-brown/10 hover:text-journey-red opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-journey-blue text-white rounded-2xl shadow-sm rotate-[-5deg] border-2 border-white/50"><Plane size={28} strokeWidth={2.5} /></div>
                  <div>
                    <p className="text-[10px] font-black text-journey-blue uppercase tracking-[0.3em] mb-1">Dodo Airlines</p>
                    <h4 className="text-2xl font-black text-journey-brown tracking-tighter">BOARDING PASS</h4>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="text-left"><h2 className="text-5xl font-black text-journey-brown tracking-tighter leading-none">{item.details?.from || '???'}</h2><p className="text-[10px] font-bold text-journey-brown/30 mt-1 uppercase tracking-widest">Departure</p></div>
                <div className="flex-grow px-8"><div className="w-full h-[2px] bg-journey-sand/40 relative"><Plane size={18} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-journey-blue fill-current" /></div></div>
                <div className="text-right"><h2 className="text-5xl font-black text-journey-brown tracking-tighter leading-none">{item.details?.to || '???'}</h2><p className="text-[10px] font-bold text-journey-brown/30 mt-1 uppercase tracking-widest">Arrival</p></div>
              </div>
              <div className="grid grid-cols-2 gap-8 pt-6 border-t-4 border-dashed border-journey-cream">
                <div><p className="text-[9px] font-black text-journey-brown/20 uppercase tracking-widest">Date & Time</p><p className="text-sm font-black text-journey-brown">{item.details?.time || 'PENDING'}</p></div>
                <div><p className="text-[9px] font-black text-journey-brown/20 uppercase tracking-widest">Passenger</p><p className="text-sm font-black text-journey-brown uppercase">Traveler</p></div>
              </div>
            </div>
            <div className="w-full sm:w-40 bg-journey-blue/5 p-8 flex flex-col items-center justify-center gap-4 border-t-4 sm:border-t-0 sm:border-l-4 border-dashed border-journey-cream">
               <div className="p-3 bg-white rounded-2xl shadow-soft-sm"><QrCode size={64} className="text-journey-brown/40" /></div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-6 shadow-soft flex items-center justify-between border-2 border-journey-sand/10">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-journey-cream rounded-2xl text-journey-brown/40">{item.type === 'hotel' ? <Hotel size={24} /> : item.type === 'car' ? <Car size={24} /> : <Ticket size={24} />}</div>
              <div><h4 className="font-black text-journey-brown text-lg">{item.title}</h4><p className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-[0.2em] mt-0.5">{item.details?.time}</p></div>
            </div>
            <button onClick={() => handleDelete(item.id)} className="p-2 text-journey-brown/10 hover:text-journey-red"><Trash2 size={20}/></button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center px-2 pt-2">
        <div><h2 className="text-2xl font-black text-journey-brown">預訂憑證</h2><p className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-[0.3em] mt-1">Ready for departure</p></div>
        <button onClick={() => setShowAddModal(true)} className="w-16 h-16 bg-journey-green text-white rounded-[1.5rem] shadow-soft flex items-center justify-center active:scale-90 transition-transform"><Plus size={28} strokeWidth={3} /></button>
      </div>

      {loading && bookings.length === 0 ? (
        <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div>
      ) : bookings.length === 0 ? (
        <div className="bg-white/40 rounded-[3rem] p-16 text-center border-4 border-dashed border-journey-sand opacity-50">
          <Plane size={48} className="mx-auto text-journey-sand mb-4" />
          <p className="text-sm font-black text-journey-brown">還沒有預訂紀錄喔 ✨</p>
        </div>
      ) : (
        <div className="space-y-8">{bookings.map((item) => renderBoardingPass(item))}</div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-journey-brown italic">New Pass</h3><button onClick={() => setShowAddModal(false)} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button></div>
            <div className="flex bg-journey-cream p-2 rounded-3xl gap-2">{(['flight', 'hotel', 'car', 'ticket'] as const).map(t => (<button key={t} onClick={() => setType(t)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black ${type === t ? 'bg-white text-journey-brown shadow-sm' : 'text-journey-brown/40'}`}>{t === 'flight' ? '機票' : '住宿'}</button>))}</div>
            <div className="space-y-5">
              {type === 'flight' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="HND" value={details.from} onChange={e => setDetails({...details, from: e.target.value.toUpperCase()})} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none" />
                    <input placeholder="CTS" value={details.to} onChange={e => setDetails({...details, to: e.target.value.toUpperCase()})} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none" />
                  </div>
                  <input placeholder="Flight No." value={details.flightNo} onChange={e => setDetails({...details, flightNo: e.target.value.toUpperCase()})} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none" />
                </>
              ) : (
                <input placeholder="名稱" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none" />
              )}
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full bg-journey-cream p-5 rounded-3xl text-xs font-black focus:outline-none" />
                <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full bg-journey-cream p-5 rounded-3xl text-xs font-black focus:outline-none" />
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg flex items-center justify-center gap-3 active:scale-95 border-b-4 border-black/10 uppercase tracking-[0.2em]"><Plus size={20} strokeWidth={3} /> Generate Pass</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsView;
