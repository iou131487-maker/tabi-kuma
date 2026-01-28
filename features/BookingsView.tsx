
import React, { useState, useEffect } from 'react';
import { Plane, Hotel, Car, Ticket, Lock, Unlock, Plus, X, Send, Trash2, MapPin, Loader2, Calendar } from 'lucide-react';
import { db, isConfigured } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const BookingsView: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // 表單狀態
  const [type, setType] = useState<'flight' | 'hotel' | 'ticket'>('flight');
  const [title, setTitle] = useState('');
  
  // 航班專用欄位
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [flightNo, setFlightNo] = useState('');
  const [time, setTime] = useState('');
  
  // 住宿專用欄位
  const [address, setAddress] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [cost, setCost] = useState('');

  const tripId = 'hokkaido-2024';

  // --- 監聽雲端預訂資料 ---
  useEffect(() => {
    if (!isConfigured || !db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'trips', tripId, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 處理隱私鎖 ---
  const toggleLock = () => {
    if (isUnlocked) {
      setIsUnlocked(false);
    } else {
      const pin = prompt('請輸入 PIN 碼 (預設 007)');
      if (pin === '007') {
        setIsUnlocked(true);
      } else {
        alert('PIN 碼錯誤！');
      }
    }
  };

  // --- 新增預訂 ---
  const handleAdd = async () => {
    if (!title && type !== 'flight') return;
    if (!db) return;

    try {
      const payload: any = {
        type,
        title: type === 'flight' ? `${from} → ${to}` : title,
        createdAt: serverTimestamp(),
      };

      if (type === 'flight') {
        payload.details = { from, to, flightNo, time };
      } else if (type === 'hotel') {
        payload.details = { address, checkIn, cost };
      } else {
        payload.details = { note: '一般票券' };
      }

      await addDoc(collection(db, 'trips', tripId, 'bookings'), payload);
      
      // 重置並關閉
      setShowAddModal(false);
      setTitle(''); setFrom(''); setTo(''); setFlightNo(''); setTime(''); setAddress(''); setCheckIn(''); setCost('');
    } catch (e) {
      console.error("新增失敗:", e);
    }
  };

  // --- 刪除預訂 ---
  const handleDelete = async (id: string) => {
    if (!db || !confirm('確定要刪除這筆預訂嗎？')) return;
    await deleteDoc(doc(db, 'trips', tripId, 'bookings', id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black text-journey-brown tracking-tight">預訂與憑證</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="p-2.5 bg-journey-green text-white rounded-2xl shadow-soft active:scale-90 transition-transform"
          >
            <Plus size={20} />
          </button>
          <button 
            onClick={toggleLock}
            className={`p-2.5 rounded-2xl flex items-center gap-2 transition-all ${isUnlocked ? 'bg-journey-accent text-journey-brown shadow-soft' : 'bg-white shadow-soft text-journey-brown/20'}`}
          >
            {isUnlocked ? <Unlock size={20} /> : <Lock size={20} />}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 opacity-30">
          <Loader2 className="animate-spin mb-2" />
          <p className="text-[10px] font-black uppercase">同步清單中...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white/40 rounded-4xl p-12 text-center border-2 border-dashed border-journey-sand">
          <p className="text-journey-brown/40 text-sm font-bold">還沒有任何預訂資料...✨</p>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((item) => (
            <div key={item.id} className="relative group animate-in fade-in slide-in-from-bottom-4">
              {/* 刪除按鈕 (解鎖後顯示) */}
              {isUnlocked && (
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="absolute -top-2 -right-2 z-20 bg-white shadow-soft text-journey-red p-2 rounded-full active:scale-75 transition-transform"
                >
                  <Trash2 size={14} />
                </button>
              )}

              {/* 根據類別渲染不同的卡片 */}
              {item.type === 'flight' ? (
                /* --- 飛機票卡片 (登機證設計) --- */
                <div className="relative overflow-visible">
                  <div className="bg-white rounded-t-3xl p-6 border-b-2 border-dashed border-journey-sand shadow-soft">
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-journey-brown">
                        <h3 className="text-2xl font-black">{item.details?.from || '---'}</h3>
                        <p className="text-[10px] font-bold opacity-30 uppercase">Origin</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <Plane size={24} className="text-journey-blue transform rotate-45 mb-1" />
                        <div className="w-16 h-[1.5px] bg-journey-sand"></div>
                        <p className="text-[9px] mt-1 font-black text-journey-brown/40">{item.details?.flightNo || 'FLIGHT'}</p>
                      </div>
                      <div className="text-right text-journey-brown">
                        <h3 className="text-2xl font-black">{item.details?.to || '---'}</h3>
                        <p className="text-[10px] font-bold opacity-30 uppercase">Dest</p>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2 text-journey-brown">
                         <Calendar size={14} className="text-journey-blue" />
                         <span className="text-xs font-black">{item.details?.time || '時間未定'}</span>
                      </div>
                    </div>
                  </div>
                  {/* Notch 造型 */}
                  <div className="absolute left-0 bottom-[54px] w-4 h-4 bg-journey-cream rounded-full -translate-x-1/2 z-10"></div>
                  <div className="absolute right-0 bottom-[54px] w-4 h-4 bg-journey-cream rounded-full translate-x-1/2 z-10"></div>
                  
                  <div className="bg-white rounded-b-3xl p-5 shadow-soft flex items-center justify-between border-t border-journey-sand/10">
                    <p className="text-[10px] font-black text-journey-brown/30 uppercase tracking-widest">Boarding Pass Verified</p>
                    <div className="w-8 h-8 bg-journey-sand/30 rounded-lg flex items-center justify-center opacity-40">
                       <Ticket size={16} />
                    </div>
                  </div>
                </div>
              ) : item.type === 'hotel' ? (
                /* --- 住宿卡片 --- */
                <div className="bg-white rounded-4xl p-1 shadow-soft overflow-hidden">
                  <img src={`https://picsum.photos/seed/${item.id}/400/200`} className="w-full h-32 object-cover rounded-t-3xl" alt="hotel" />
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-journey-brown">{item.title}</h4>
                      <div className="bg-journey-red/10 p-2 rounded-xl text-journey-red">
                        <Hotel size={18} />
                      </div>
                    </div>
                    <p className="text-[10px] text-journey-brown/50 font-bold mb-4 flex items-center gap-1">
                      <MapPin size={10} className="text-journey-red" /> {item.details?.address || '未提供地址'}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-journey-sand">
                      <div className="flex items-center gap-1.5 text-journey-brown">
                         <Calendar size={12} className="opacity-30" />
                         <span className="text-[10px] font-black">{item.details?.checkIn || '未定'} 入住</span>
                      </div>
                      <span className="text-xs font-black text-journey-red">
                        {isUnlocked ? `¥ ${Number(item.details?.cost).toLocaleString()}` : '¥ ****'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* --- 一般票券卡片 --- */
                <div className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-soft">
                  <div className="w-12 h-12 bg-journey-blue/10 rounded-2xl flex items-center justify-center text-journey-blue">
                     <Ticket size={24} />
                  </div>
                  <div className="flex-grow">
                     <h5 className="font-black text-journey-brown text-sm">{item.title}</h5>
                     <p className="text-[10px] text-journey-brown/40 font-bold uppercase tracking-widest">電子憑證已儲存</p>
                  </div>
                  <div className="text-[10px] font-black bg-journey-cream px-3 py-1.5 rounded-full text-journey-brown/40">
                     {isUnlocked ? 'VERIFIED' : 'LOCKED'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-journey-brown">新增預訂項目</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-journey-cream rounded-full"><X size={20} /></button>
            </div>

            {/* Type Selector */}
            <div className="flex bg-journey-cream p-1 rounded-2xl">
               {(['flight', 'hotel', 'ticket'] as const).map(t => (
                 <button 
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${type === t ? 'bg-white text-journey-brown shadow-sm' : 'text-journey-brown/30'}`}
                 >
                   {t === 'flight' ? '機票' : t === 'hotel' ? '住宿' : '票券'}
                 </button>
               ))}
            </div>
            
            <div className="space-y-4">
              {type === 'flight' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-journey-brown/40 uppercase">出發地 (三字碼)</label>
                      <input type="text" value={from} onChange={e => setFrom(e.target.value.toUpperCase())} placeholder="TPE" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" maxLength={3} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-journey-brown/40 uppercase">目的地 (三字碼)</label>
                      <input type="text" value={to} onChange={e => setTo(e.target.value.toUpperCase())} placeholder="CTS" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" maxLength={3} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-journey-brown/40 uppercase">航班編號</label>
                    <input type="text" value={flightNo} onChange={e => setFlightNo(e.target.value.toUpperCase())} placeholder="JL 096" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-journey-brown/40 uppercase">出發日期/時間</label>
                    <input type="text" value={time} onChange={e => setTime(e.target.value)} placeholder="5/12 08:30" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" />
                  </div>
                </>
              ) : type === 'hotel' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-journey-brown/40 uppercase">飯店名稱</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：札幌三井飯店" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-journey-brown/40 uppercase">飯店地址</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="北海道札幌市..." className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-journey-brown/40 uppercase">入住時間</label>
                      <input type="text" value={checkIn} onChange={e => setCheckIn(e.target.value)} placeholder="5/12 15:00" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-journey-brown/40 uppercase">分攤金額 (¥)</label>
                      <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="4500" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-journey-brown/40 uppercase">票券名稱</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：JR Pass 七日券" className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-black focus:outline-none" />
                </div>
              )}
            </div>

            <button 
              onClick={handleAdd}
              className="w-full bg-journey-darkGreen text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Send size={18} /> 儲存至雲端
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsView;
