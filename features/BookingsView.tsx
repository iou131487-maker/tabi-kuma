
import React, { useState } from 'react';
import { Plane, Hotel, Car, Ticket, Lock, Unlock } from 'lucide-react';

const BookingsView: React.FC = () => {
  const [pinMode, setPinMode] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-journey-brown">預訂與憑證</h2>
        <button 
          onClick={toggleLock}
          className={`p-2 rounded-xl flex items-center gap-2 transition-colors ${isUnlocked ? 'bg-journey-green/20 text-journey-darkGreen' : 'bg-white shadow-soft text-journey-brown/40'}`}
        >
          {isUnlocked ? <Unlock size={18} /> : <Lock size={18} />}
          <span className="text-xs font-bold">{isUnlocked ? '已解鎖' : '隱私鎖'}</span>
        </button>
      </div>

      {/* Boarding Pass Design */}
      <div className="relative group">
        <div className="bg-white rounded-t-3xl p-6 border-b-2 border-dashed border-journey-sand shadow-[4px_0px_0px_#F3E5F5]">
          <div className="flex justify-between items-center mb-6">
            <div className="text-journey-brown">
              <p className="text-[10px] font-bold opacity-50 uppercase">Flight</p>
              <h3 className="text-2xl font-black">TPE</h3>
              <p className="text-xs">Taipei</p>
            </div>
            <div className="flex flex-col items-center">
              <Plane size={24} className="text-journey-blue transform rotate-45 mb-1" />
              <div className="w-20 h-[1px] bg-journey-sand"></div>
              <p className="text-[10px] mt-1 font-bold text-journey-brown/40">JL 096</p>
            </div>
            <div className="text-right text-journey-brown">
              <p className="text-[10px] font-bold opacity-50 uppercase">Destination</p>
              <h3 className="text-2xl font-black">CTS</h3>
              <p className="text-xs">Chitose</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold opacity-50 uppercase">Boarding Time</p>
              <p className="font-bold text-journey-brown">08:15 AM</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold opacity-50 uppercase">Gate / Seat</p>
              <p className="font-bold text-journey-brown">D5 / 22K</p>
            </div>
          </div>
        </div>
        {/* Notch elements */}
        <div className="absolute left-0 bottom-[-10px] w-5 h-5 bg-journey-cream rounded-full -translate-x-1/2 z-10"></div>
        <div className="absolute right-0 bottom-[-10px] w-5 h-5 bg-journey-cream rounded-full translate-x-1/2 z-10"></div>
        
        <div className="bg-white rounded-b-3xl p-6 shadow-[4px_4px_0px_#F3E5F5] flex items-center justify-between">
          <div className="flex-1">
             <p className="text-[10px] font-bold opacity-50 uppercase">Passenger</p>
             <p className="font-bold text-journey-brown uppercase">Tanuki Nook / MR</p>
          </div>
          <div className="w-12 h-12 bg-journey-sand/30 rounded-lg flex items-center justify-center border border-journey-sand overflow-hidden">
             <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BOARDING-PASS-123" alt="qr" className="w-10 h-10 grayscale opacity-70" />
          </div>
        </div>
      </div>

      {/* Accommodation Card */}
      <div className="bg-white rounded-4xl p-1 shadow-soft overflow-hidden border-2 border-transparent">
        <img src="https://picsum.photos/seed/hotel/400/200" className="w-full h-32 object-cover rounded-t-3xl" alt="hotel" />
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-journey-red/20 text-journey-red uppercase">住宿 - 5/12</span>
              <h4 className="font-bold text-journey-brown mt-1">札幌三井花園飯店</h4>
            </div>
            <Hotel className="text-journey-red" size={20} />
          </div>
          <p className="text-xs text-journey-brown/60 mb-4">北海道札幌市中央区北５条西６丁目１８−３</p>
          
          <div className="grid grid-cols-2 gap-2 p-3 bg-journey-sand/30 rounded-2xl mb-4">
             <div>
                <p className="text-[9px] font-bold text-journey-brown/40 uppercase">Check-in</p>
                <p className="text-xs font-bold text-journey-brown">15:00 後</p>
             </div>
             <div>
                <p className="text-[9px] font-bold text-journey-brown/40 uppercase">Check-out</p>
                <p className="text-xs font-bold text-journey-brown">11:00 前</p>
             </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-journey-sand">
             <span className="text-xs text-journey-brown font-bold">預估分攤金額 (4人)</span>
             <span className="text-sm font-black text-journey-red">¥ 4,500 / 人</span>
          </div>
        </div>
      </div>

      {/* Transport Ticket List */}
      <div className="space-y-3">
         <h3 className="text-sm font-bold text-journey-brown px-1">電子票券</h3>
         <div className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-soft">
            <div className="w-12 h-12 bg-journey-blue/20 rounded-2xl flex items-center justify-center text-journey-blue">
               <Ticket size={24} />
            </div>
            <div className="flex-grow">
               <h5 className="font-bold text-journey-brown text-sm">JR Pass 7日券 (兌換序號)</h5>
               <p className="text-[10px] text-journey-brown/60">兌換地點：新千歲機場</p>
            </div>
            <div className="font-black text-journey-brown text-sm">
               {isUnlocked ? 'JP99-281-22' : '****-***'}
            </div>
         </div>
      </div>
    </div>
  );
};

export default BookingsView;
