
import React, { useState, useEffect, useRef } from 'react';
import { Plane, Hotel, Ticket, Lock, Unlock, Plus, X, Send, Trash2, MapPin, Loader2, Calendar, Car, Camera, Info, DollarSign, Clock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const BookingsView: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form states
  const [type, setType] = useState<'flight' | 'hotel' | 'car' | 'ticket'>('flight');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState<any>({
    from: '', to: '', flightNo: '', time: '',
    address: '', checkIn: '', checkOut: '', cost: '',
    pickup: '', return: '',
    note: ''
  });
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const tripId = 'hokkaido-2024';

  const fetchBookings = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setBookings([
        { id: 'demo-1', type: 'flight', details: { from: 'TPE', to: 'CTS', flightNo: 'JL812', time: '5/12 08:30' } },
        { id: 'demo-2', type: 'hotel', title: '札幌格拉斯麗飯店', details: { address: '札幌市中央區', checkIn: '5/12', checkOut: '5/15', cost: '12000' } },
        { id: 'demo-3', type: 'car', title: 'Toyota Rent-a-car', details: { pickup: '千歲機場', return: '札幌站前', time: '5/15 10:00' } }
      ]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('bookings').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
    if (!error) setBookings(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleSave = async () => {
    if (!supabase) return;
    const payload = { type, title: type === 'flight' ? `${details.from} → ${details.to}` : title, details, trip_id: tripId, image_url: previewImg };
    const { error } = await supabase.from('bookings').insert([payload]);
    if (!error) { setShowAddModal(false); fetchBookings(); resetForm(); }
  };

  const resetForm = () => {
    setTitle(''); setDetails({}); setPreviewImg(null);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-2xl font-black text-journey-brown tracking-tight">預訂憑證</h2>
          <p className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-[0.2em] mt-1">Bookings & Vouchers</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-14 h-14 bg-journey-green text-white rounded-3xl shadow-soft flex items-center justify-center active:scale-90 transition-transform border-b-4 border-journey-darkGreen">
          <Plus size={24} strokeWidth={3} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 opacity-30"><Loader2 className="animate-spin mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">同步手記中...</p></div>
      ) : (
        <div className="space-y-8">
          {bookings.map((item) => (
            <div key={item.id} className="relative animate-in fade-in slide-in-from-bottom-4">
              {item.type === 'flight' && (
                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-soft border-4 border-white">
                  <div className="bg-journey-blue/20 p-6 border-b-4 border-dashed border-white relative">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-journey-cream rounded-full"></div>
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-journey-cream rounded-full"></div>
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-journey-brown"><h3 className="text-3xl font-black">{item.details?.from || 'TPE'}</h3><p className="text-[9px] font-black opacity-30 uppercase tracking-widest">Departure</p></div>
                      <div className="flex flex-col items-center flex-grow px-4"><Plane size={24} className="text-journey-blue transform rotate-45 mb-2" /><div className="w-full h-[2px] bg-journey-blue/30 rounded-full"></div><p className="text-[10px] mt-2 font-black text-journey-blue">{item.details?.flightNo || 'JL 812'}</p></div>
                      <div className="text-right text-journey-brown"><h3 className="text-3xl font-black">{item.details?.to || 'CTS'}</h3><p className="text-[9px] font-black opacity-30 uppercase tracking-widest">Arrival</p></div>
                    </div>
                  </div>
                  <div className="p-6 bg-white flex justify-between items-center">
                    <div className="flex items-center gap-3"><Calendar size={18} className="text-journey-blue" /><span className="text-sm font-black text-journey-brown">{item.details?.time || '5/12 08:30'}</span></div>
                    <div className="w-12 h-12 bg-journey-cream rounded-2xl flex items-center justify-center opacity-40"><Ticket size={24} /></div>
                  </div>
                </div>
              )}

              {item.type === 'hotel' && (
                <div className="bg-white rounded-[2.5rem] p-6 shadow-soft border-l-[12px] border-journey-red">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-black text-journey-brown mb-1">{item.title}</h4>
                      <div className="flex items-center gap-1 text-journey-brown/40 text-[10px] font-bold"><MapPin size={10} /><span>{item.details?.address}</span></div>
                    </div>
                    <div className="bg-journey-red/10 p-3 rounded-2xl text-journey-red"><Hotel size={24} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-journey-cream/50 p-4 rounded-3xl">
                     <div className="space-y-1"><p className="text-[8px] font-black text-journey-brown/30 uppercase tracking-widest">Check-In</p><p className="text-xs font-black text-journey-brown">{item.details?.checkIn}</p></div>
                     <div className="space-y-1 text-right"><p className="text-[8px] font-black text-journey-brown/30 uppercase tracking-widest">Check-Out</p><p className="text-xs font-black text-journey-brown">{item.details?.checkOut}</p></div>
                  </div>
                </div>
              )}

              {item.type === 'car' && (
                <div className="bg-white rounded-[2.5rem] p-6 shadow-soft border-l-[12px] border-journey-accent">
                  <div className="flex justify-between items-center mb-4">
                    <div><h4 className="text-lg font-black text-journey-brown">{item.title}</h4><p className="text-[10px] font-bold text-journey-accent uppercase tracking-widest">Rental Car</p></div>
                    <div className="bg-journey-accent/20 p-3 rounded-2xl text-journey-brown"><Car size={24} /></div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-journey-brown/60 mb-2"><MapPin size={14} className="text-journey-accent" /><span>{item.details?.pickup} → {item.details?.return}</span></div>
                  <div className="flex items-center gap-3 text-xs font-bold text-journey-brown/60"><Clock size={14} className="text-journey-accent" /><span>{item.details?.time}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-journey-brown">新增預訂</h3>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button>
            </div>
            
            <div className="flex bg-journey-cream p-1.5 rounded-3xl gap-1 overflow-x-auto">
              {(['flight', 'hotel', 'car', 'ticket'] as const).map(t => (
                <button key={t} onClick={() => setType(t)} className={`shrink-0 px-4 py-2 rounded-2xl text-[10px] font-black transition-all ${type === t ? 'bg-white text-journey-brown shadow-sm' : 'text-journey-brown/40'}`}>
                  {t === 'flight' ? '機票' : t === 'hotel' ? '住宿' : t === 'car' ? '租車' : '票券'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {type === 'flight' ? (
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="From (TPE)" value={details.from} onChange={e => setDetails({...details, from: e.target.value.toUpperCase()})} className="bg-journey-cream p-4 rounded-2xl text-sm font-black focus:outline-none" />
                  <input placeholder="To (CTS)" value={details.to} onChange={e => setDetails({...details, to: e.target.value.toUpperCase()})} className="bg-journey-cream p-4 rounded-2xl text-sm font-black focus:outline-none" />
                </div>
              ) : (
                <input placeholder="名稱 (例如: 札幌大飯店)" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-journey-cream p-4 rounded-2xl text-sm font-black focus:outline-none" />
              )}
              <input placeholder="日期與時間" value={details.time} onChange={e => setDetails({...details, time: e.target.value})} className="w-full bg-journey-cream p-4 rounded-2xl text-sm font-black focus:outline-none" />
              {type === 'hotel' && <input placeholder="詳細地址" value={details.address} onChange={e => setDetails({...details, address: e.target.value})} className="w-full bg-journey-cream p-4 rounded-2xl text-sm font-black focus:outline-none" />}
            </div>

            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 active:scale-95 border-b-4 border-black/10"><Send size={18} /> 儲存至憑證中心</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsView;
