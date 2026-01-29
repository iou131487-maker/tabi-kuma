import React, { useState, useEffect } from 'react';
import { UserPlus, MessageSquare, ShieldCheck, Settings, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const MembersView: React.FC = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const tripId = 'hokkaido-2024';

  const fetchMembers = async () => {
    if (!supabase) {
      setMembers([
        { id: '1', name: '狸克', avatar: 'https://picsum.photos/seed/nook/100/100' },
        { id: '2', name: '西施惠', avatar: 'https://picsum.photos/seed/isabelle/100/100' }
      ]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('members').select('*').eq('trip_id', tripId);
    if (!error && data?.length) setMembers(data);
    else if (!data?.length) {
       // 初始化 Mock 資料
       const mock = [
         { trip_id: tripId, name: '狸克', avatar: 'https://picsum.photos/seed/nook/100/100' },
         { trip_id: tripId, name: '西施惠', avatar: 'https://picsum.photos/seed/isabelle/100/100' }
       ];
       await supabase.from('members').insert(mock);
       setMembers(mock);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2"><h2 className="text-xl font-bold text-journey-brown">旅行團成員 ({members.length})</h2><button className="bg-journey-accent text-white p-2 rounded-2xl shadow-soft"><UserPlus size={20} /></button></div>
      {loading ? ( <div className="flex justify-center py-10 opacity-30"><Loader2 className="animate-spin" /></div> ) : (
        <div className="grid grid-cols-1 gap-4">
          {members.map((member) => (
            <div key={member.id} className="bg-white rounded-4xl p-4 flex items-center gap-4 shadow-soft">
               <img src={member.avatar} className="w-16 h-16 rounded-3xl object-cover border-2 border-journey-sand" />
               <div className="flex-grow"><h4 className="font-bold text-journey-brown text-lg">{member.name}</h4><p className="text-xs text-journey-brown/40 font-bold uppercase tracking-widest">團員</p></div>
               <div className="flex gap-2"><button className="w-10 h-10 rounded-2xl bg-journey-cream flex items-center justify-center text-journey-brown/60"><MessageSquare size={18} /></button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MembersView;