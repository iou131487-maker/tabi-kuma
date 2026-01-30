
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
    
    // 1. 本地讀取
    const localKey = `bookings_${tripId}`;
    const saved = localStorage.getItem(localKey);
    if (saved) setBookings(JSON.parse(saved));

    // 2. 雲端同步
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('bookings').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
        if (!error && data) {
          setBookings(data);
          localStorage.setItem(localKey, JSON.stringify(data));
        }
      } catch (e) { console.error("Fetch failed"); }
    }
    setLoading(false);
  }, [tripId]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleSave = async () => {
    const finalTitle = type === 'flight' ? `${details.from} → ${details.to}` : title;
    if (!finalTitle && type !== 'flight') return alert("請填寫標題");

    const payload = { 
      id: Date.now().toString(),
      type, title: finalTitle, 
      details: { ...details, time: `${bookingDate} ${bookingTime}`.trim() }, 
      trip_id: tripId,
      created_at: new Date().toISOString()
    };

    // [寫入鎖定]
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from('bookings').insert([payload]);
      if (error) return alert("儲存失敗");
    }

    const updated = [payload, ...bookings];
    setBookings(updated);
    localStorage.setItem(`bookings_${tripId}`, JSON.stringify(updated));
    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('要刪除嗎？')) return;
    if (supabase && isSupabaseConfigured) {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (error) return alert("刪除失敗");
    }
    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    localStorage.setItem(`bookings_${tripId}`, JSON.stringify(updated));
  };

  const resetForm = () => { setTitle(''); setBookingDate(''); setBookingTime(''); setDetails({ from: '', to: '', flightNo: '', address: '', note: '' }); };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center px-2 pt-2">
        <h2 className="text-2xl font-black text-journey-brown uppercase italic">Bookings</h2>
        <button onClick={() => setShowAddModal(true)} className="w-16 h-16 bg-journey-green text-white rounded-[1.5rem] shadow-soft flex items-center justify-center active:scale-90"><Plus size={28} strokeWidth={3} /></button>
      </div>

      {loading && bookings.length === 0 ? (
        <div className="flex justify-center py-20 opacity-30"><Loader2 className="animate-spin" /></div>
      ) : bookings.length === 0 ? (
        <div className="bg-white/40 rounded-[3rem] p-16 text-center border-4 border-dashed border-journey-sand opacity-50"><p className="text-sm font-black text-journey-brown uppercase tracking-widest">No Bookings Yet ✨</p></div>
      ) : (
        <div className="space-y-6">
          {bookings.map((item) => (
            <div key={item.id} className="bg-white rounded-[2rem] p-6 shadow-soft flex items-center justify-between border-2 border-journey-sand/10 animate-in fade-in">
              <div className="flex items-center gap-4">
                 <div className="p-4 bg-journey-cream rounded-2xl text-journey-brown/40">{item.type === 'flight' ? <Plane /> : <Hotel />}</div>
                 <div><h4 className="font-black text-journey-brown">{item.title}</h4><p className="text-[10px] font-bold opacity-30 uppercase">{item.details?.time}</p></div>
              </div>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-journey-brown/10 hover:text-journey-red"><Trash2 size={20}/></button>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-journey-brown italic">New Booking</h3>
            <div className="space-y-5">
              <input placeholder="預訂名稱 (例如: 飯店名稱)" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-journey-cream p-5 rounded-3xl text-sm font-black focus:outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full bg-journey-cream p-5 rounded-3xl text-xs font-black" />
                <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full bg-journey-cream p-5 rounded-3xl text-xs font-black" />
              </div>
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2.5rem] shadow-lg active:scale-95 border-b-4 border-black/10">儲存預訂</button>
            <button onClick={() => setShowAddModal(false)} className="w-full text-journey-brown/30 font-black py-2">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsView;
