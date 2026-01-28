
import React, { useState } from 'react';
import { CATEGORY_ICONS, THEME_COLORS } from '../constants';
import { Sun, CloudRain, Thermometer, MapPin, Clock, Map as MapIcon, ExternalLink } from 'lucide-react';

const ScheduleView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(0);
  const days = ['5/12', '5/13', '5/14', '5/15', '5/16', '5/17', '5/18'];

  const scheduleData = [
    { time: '10:30', title: '抵達新千歲機場', location: '新千歲機場', category: 'transport', note: '領取 JR Pass' },
    { time: '13:00', title: '札幌拉麵共和國', location: '札幌車站', category: 'food', note: '推薦梅光軒' },
    { time: '15:30', title: '大通公園散策', location: '大通公園', category: 'attraction', note: '看噴水池' },
    { time: '18:00', title: '三井花園飯店 Check-in', location: '札幌市中心', category: 'lodging', note: '靠近車站' },
  ];

  const handleOpenMap = (e: React.MouseEvent, location: string) => {
    e.stopPropagation(); // 避免觸發卡片的點擊事件
    const encodedLocation = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Horizontal Date Picker */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pt-1">
        {days.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx)}
            className={`flex-shrink-0 w-16 h-20 rounded-3xl flex flex-col items-center justify-center transition-all ${
              selectedDay === idx 
                ? 'bg-journey-green text-white shadow-soft transform -translate-y-1' 
                : 'bg-white text-journey-brown/60'
            }`}
          >
            <span className="text-[10px] font-bold uppercase">Day</span>
            <span className="text-xl font-bold">{idx + 1}</span>
            <span className="text-[10px]">{day}</span>
          </button>
        ))}
      </div>

      {/* Weather Card */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 shadow-soft border-2 border-transparent flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-journey-accent/40 rounded-2xl text-journey-brown animate-float">
            <Sun size={28} />
          </div>
          <div>
            <h3 className="font-bold text-journey-brown">今日天氣：晴朗</h3>
            <p className="text-xs text-journey-brown/60">適合戶外活動唷！</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-journey-brown font-bold justify-end">
            <Thermometer size={14} />
            <span>22°C</span>
          </div>
          <p className="text-[10px] text-journey-brown/40">降雨機率 10%</p>
        </div>
      </div>

      {/* Countdown Card */}
      <div className="bg-white/40 rounded-3xl p-4 flex items-center justify-between border-2 border-dashed border-journey-darkGreen/30">
        <span className="text-sm font-bold text-journey-brown">距離出發還有</span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-journey-brown">12</span>
          <span className="text-xs font-bold text-journey-brown">DAYS</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4 relative before:absolute before:left-[21px] before:top-4 before:bottom-4 before:w-0.5 before:bg-journey-brown/10">
        {scheduleData.map((item, idx) => (
          <div key={idx} className="flex gap-4 group">
            <div className={`z-10 w-11 h-11 rounded-2xl flex items-center justify-center shadow-soft-sm shrink-0 border-2 border-white ${THEME_COLORS[item.category as keyof typeof THEME_COLORS]} text-white`}>
              {CATEGORY_ICONS[item.category as keyof typeof CATEGORY_ICONS]}
            </div>
            <div className="bg-white rounded-3xl p-4 flex-grow shadow-soft active:scale-[0.98] transition-transform cursor-pointer overflow-hidden relative">
              {/* Category Badge */}
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-journey-darkGreen flex items-center gap-1">
                  <Clock size={12} /> {item.time}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-journey-cream text-journey-brown font-bold">
                  {item.category.toUpperCase()}
                </span>
              </div>
              
              <h4 className="font-bold text-journey-brown mb-1 pr-10">{item.title}</h4>
              
              {/* Location with Google Maps Button */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 text-journey-brown/60 text-[11px] font-bold truncate max-w-[160px]">
                  <MapPin size={12} className="shrink-0 text-journey-blue" />
                  <span>{item.location}</span>
                </div>
                
                <button 
                  onClick={(e) => handleOpenMap(e, item.location)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-journey-blue/20 hover:bg-journey-blue/30 text-journey-brown text-[10px] font-black rounded-xl transition-all active:scale-90"
                >
                  <MapIcon size={12} className="text-journey-darkGreen" />
                  <span>地圖</span>
                  <ExternalLink size={10} className="opacity-30" />
                </button>
              </div>

              {item.note && (
                <div className="mt-3 pt-2 border-t border-journey-sand/50 italic text-[10px] text-journey-brown/60 flex gap-1">
                  <span className="not-italic opacity-40">●</span> {item.note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Add Button Floating */}
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-journey-darkGreen text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-white">
        <span className="text-3xl font-bold">+</span>
      </button>
    </div>
  );
};

export default ScheduleView;
