
import React from 'react';
import { MOCK_MEMBERS } from '../constants';
import { UserPlus, Settings, MessageSquare, ShieldCheck } from 'lucide-react';

const MembersView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <h2 className="text-xl font-bold text-journey-brown">旅行團成員 (4)</h2>
         <button className="bg-journey-accent text-white p-2 rounded-2xl shadow-soft active:scale-95 transition-transform">
            <UserPlus size={20} />
         </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {MOCK_MEMBERS.map((member) => (
          <div key={member.id} className="bg-white rounded-4xl p-4 flex items-center gap-4 shadow-soft border-2 border-transparent hover:border-journey-green/10 transition-colors">
             <div className="relative">
                <img src={member.avatar} className="w-16 h-16 rounded-3xl object-cover border-2 border-journey-sand" alt={member.name} />
                {member.id === '1' && (
                  <div className="absolute -top-1 -right-1 bg-journey-accent p-1 rounded-full border-2 border-white text-white">
                    <ShieldCheck size={12} />
                  </div>
                )}
             </div>
             <div className="flex-grow">
                <h4 className="font-bold text-journey-brown text-lg">{member.name}</h4>
                <p className="text-xs text-journey-brown/40 font-bold uppercase tracking-widest">
                  {member.id === '1' ? '團長 (Admin)' : '團員 (Member)'}
                </p>
             </div>
             <div className="flex gap-2">
                <button className="w-10 h-10 rounded-2xl bg-journey-cream flex items-center justify-center text-journey-brown/60 hover:text-journey-darkGreen transition-colors">
                   <MessageSquare size={18} />
                </button>
                <button className="w-10 h-10 rounded-2xl bg-journey-cream flex items-center justify-center text-journey-brown/60 hover:text-journey-red transition-colors">
                   <Settings size={18} />
                </button>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-journey-accent/10 border-2 border-dashed border-journey-accent/40 rounded-4xl p-6 text-center space-y-3">
         <div className="w-16 h-16 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-soft-sm text-journey-accent animate-float">
            <UserPlus size={32} />
         </div>
         <h3 className="font-bold text-journey-brown">邀請更多狸貓？</h3>
         <p className="text-xs text-journey-brown/60 leading-loose">
            發送邀請連結給你的朋友，<br />
            一起加入這次的冒險行程吧！
         </p>
         <button className="bg-journey-accent text-white font-bold py-3 px-8 rounded-2xl shadow-soft text-sm active:scale-95 transition-transform">
            複製邀請連結
         </button>
      </div>
    </div>
  );
};

export default MembersView;
