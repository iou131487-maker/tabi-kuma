
import React, { useState, useEffect } from 'react';
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

  // 確保使用穩定 ID
  const tripId = tripConfig.id || 'default-trip';

  const fetchBookings = async () => {
    setLoading(true);
    
    // 1. 優先從本地讀取（最快且最穩定的來源）
    const saved = localStorage.getItem(`bookings_${tripId}`);
    const localData = saved ? JSON.parse(saved) : [];
    setBookings(localData);

    // 2. 異步嘗試從雲端同步
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false });
          
        // 重要：只有雲端有資料時才覆蓋，避免空雲端沖掉本地資料
        if (!error && data && data.length > 0) {
          setBookings(data);
          localStorage.setItem(`bookings_${tripId}`, JSON.stringify(data));
        }
      } catch (e) { 
        console.warn("Supabase Sync Failed"); 
      }
    }
    setLoading(false);
  };

  useEffect(() => { 
    fetchBookings(); 
  }, [tripId]);

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

    // 先更新本地 UI 和 LocalStorage (確保不遺失)
    const updated = [payload, ...bookings];
    setBookings(updated);
    localStorage.setItem(`bookings_${tripId}`, JSON.stringify(updated));

    // 非同步同步到雲端
    if (supabase && isSupabaseConfigured) {
      supabase.from('bookings').insert([payload]).then(({ error }) => {
        if (error) console.error("Cloud Sync failed, but data is saved locally.");
      });
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!confirm('要刪除這張憑證嗎？')) return;
    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    localStorage.setItem(`bookings_${tripId}`, JSON.stringify(updated));
    if (supabase && isSupabaseConfigured) {
      supabase.from('bookings').delete().eq('id', id).then();
    }
  };

  const resetForm = () => { setTitle(''); setBookingDate(''); setBookingTime(''); setDetails({ from: '', to: '', flightNo: '', address: '', note: '' }); };

  const renderBoardingPass = (item: any) => {
    const isFlight = item.type === 'flight';

    if (isFlight) {
      return (
        <div key={item.id} className="relative group animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden flex flex-col sm:flex-row border-2 border-journey-sand/20">
            <div className="flex-grow p-8 relative">
              <button onClick={() => handleDelete(item.id)} className="absolute top-4 right-4 p-2 text-journey-brown/10 hover:text-journey-red opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
              
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-journey-blue text-white rounded-2xl shadow-sm rotate-[-5deg] border-2 border-white/50">
                    <Plane size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-journey-blue uppercase tracking-[0.3em] leading-none mb-1">Dodo Airlines</p>
                    <h4 className="text-2xl font-black text-journey-brown tracking-tighter">BOARDING PASS</h4>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-journey-brown/20 uppercase">Flight No.</p>
                  <p className="text-base font-black text-journey-brown tracking-tighter">{item.details?.flightNo || 'TBA'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-8 px-2">
                <div className="text-left">
                  <h2 className="text-5xl font-black text-journey-brown tracking-tighter leading-none">{item.details?.from || '???'}</h2>
                  <p className="text-[10px] font-bold text-journey-brown/30 mt-1 uppercase tracking-widest">Departure</p>
                </div>
                <div className="flex-grow px-8 flex flex-col items-center">
                   <div className="w-full h-[2px] bg-journey-sand/40 relative">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3">
                        <Plane size={18} className="text-journey-blue fill-current rotate-90 sm:rotate-0" />
                     </div>
                   </div>
                </div>
                <div className="text-right">
                  <h2 className="text-5xl font-black text-journey-brown tracking-tighter leading-none">{item.details?.to || '???'}</h2>
                  <p className="text-[10px] font-bold text-journey-brown/30 mt-1 uppercase tracking-widest">Arrival</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t-4 border-dashed border-journey-cream">
                <div>
                  <p className="text-[9px] font-black text-journey-brown/20 uppercase tracking-widest">Date & Time</p>
                  <p className="text-sm font-black text-journey-brown">{item.details?.time || 'PENDING'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-journey-brown/20 uppercase tracking-widest">Passenger</p>
                  <p className="text-sm font-black text-journey-brown uppercase">Traveler</p>
                </div>
              </div>

              <div className="hidden sm:block absolute right-[-14px] top-[-14px] w-7 h-7 bg-journey-cream rounded-full z-10 shadow-inner"></div>
              <div className="hidden sm:block absolute right-[-14px] bottom-[-14px] w-7 h-7 bg-journey-cream rounded-full z-10 shadow-inner"></div>
            </div>

            <div className="w-full sm:w-40 bg-journey-blue/5 p-8 flex flex-col items-center justify-center gap-4 border-t-4 sm:border-t-0 sm:border-l-4 border-dashed border-journey-cream">
               <div className="p-3 bg-white rounded-2xl shadow-soft-sm border-2 border-journey-sand/10">
                 <QrCode size={64} className="text-journey-brown/40" />
               </div>
               <div className="text-center">
                 <p className="text-[12px] font-black text-journey-brown leading-tight mb-1">{item.details?.flightNo || 'FLIGHT'}</p>
                 <p className="text-[8px] font-black text-journey-brown/30 uppercase tracking-[0.4em]">STUB</p>
               </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={item.id} className="bg-white rounded-[2rem] p-6 shadow-soft flex items-center justify-between border-2 border-journey-sand/10 group relative">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-journey-cream rounded-2xl text-journey-brown/40">
            {item.type === 'hotel' ? <Hotel size={24} /> : item.type === 'car' ? <Car size={24} /> : <Ticket size={24} />}
          </div>
          <div>
            <h4 className="font-black text-journey-brown text-lg">{item.title}</h4>
            <p className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-[0.2em] mt-0.5">{item.details?.time}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => handleDelete(item.id)} className="p-2 text-journey-brown/10 hover:text-journey-red opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button>
           <div className="p-3 bg-journey-cream rounded-2xl"><QrCode size={24} className="text-journey-brown/10" /></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center px-2 pt-2">
        <div>
          <h2 className="text-2xl font-black text-journey-brown tracking-tight">預訂憑證</h2>
          <p className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-[0.3em] mt-1">Ready for departure</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-16 h-16 bg-journey-green text-white rounded-[1.5rem] shadow-soft flex items-center justify-center active:scale-90 transition-transform border-b-4 border-journey-darkGreen">
          <Plus size={28} strokeWidth={3} />
        </button>
      </div>

      {loading && bookings.length === 0 ? (
        <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div>
      ) : bookings.length === 0 ? (
        <div className="bg-white/40 rounded-[3rem] p-16 text-center border-4 border-dashed border-journey-sand opacity-50">
          <Plane size={48} className="mx-auto text-journey-sand mb-4" />
          <p className="text-sm font-black text-journey-brown">準備好要去哪裡冒險了嗎？✨</p>
        </div>
      ) : (
        <div className="space-y-8">
          {bookings.map((item) => renderBoardingPass(item))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-journey-brown tracking-tighter uppercase">New Pass</h3>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-journey-cream rounded-full text-journey-brown/30 active:scale-90 transition-all"><X size={20} /></button>
            </div>
            
            <div className="flex bg-journey-cream p-2 rounded-3xl gap-2">
              {(['flight', 'hotel', 'car', 'ticket'] as const).map(t => (
                <button key={t} onClick={() => setType(t)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all ${type === t ? 'bg-white text-journey-brown shadow-sm' : 'text-journey-brown/40'}`}>
                  {t === 'flight' ? '機票' : t === 'hotel' ? '住宿' : '其他'}
                </button>
              ))}
            </div>

            <div className="space-y-5">
              {type === 'flight' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-3">Origin</label>
                      <input placeholder="HND" value={details.from} onChange={e => setDetails({...details, from: e.target.value.toUpperCase()})} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none ring-journey-green focus:ring-4 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-3">Dest.</label>
                      <input placeholder="CTS" value={details.to} onChange={e => setDetails({...details, to: e.target.value.toUpperCase()})} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none ring-journey-green focus:ring-4 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-3">Flight Number</label>
                    <input placeholder="JL501" value={details.flightNo} onChange={e => setDetails({...details, flightNo: e.target.value.toUpperCase()})} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-3">Title</label>
                    <input placeholder="名稱" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-3">Location</label>
                    <input placeholder="地址/地點" value={details.address} onChange={e => setDetails({...details, address: e.target.value})} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none" />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-3">Date</label>
                   <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full bg-journey-cream p-5 rounded-3xl text-xs font-black focus:outline-none" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest ml-3">Time</label>
                   <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full bg-journey-cream p-5 rounded-3xl text-xs font-black focus:outline-none" />
                </div>
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg active:scale-95 border-b-4 border-black/10 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3">
              <Plus size={20} strokeWidth={3} /> Generate Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsView;
