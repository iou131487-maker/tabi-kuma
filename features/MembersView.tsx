
import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Loader2, X, Send, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const MembersView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const tripId = tripConfig.id;

  const fetchMembers = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    
    const localKey = `members_${tripId}`;
    const saved = localStorage.getItem(localKey);
    if (saved) setMembers(JSON.parse(saved));
    else setMembers([{ id: '1', name: '我', avatar: tripConfig.userAvatar }]);

    if (supabase && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('members').select('*').eq('trip_id', tripId);
        if (data && data.length > 0) {
          setMembers(data);
          localStorage.setItem(localKey, JSON.stringify(data));
        }
      } catch { console.error("Sync Error"); }
    }
    setLoading(false);
  }, [tripId, tripConfig.userAvatar]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleSave = async () => {
    if (!name) return;
    const payload = { id: Date.now().toString(), name, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`, trip_id: tripId };
    
    if (supabase && isSupabaseConfigured) {
      await supabase.from('members').insert([payload]);
    }

    const updated = [...members, payload];
    setMembers(updated);
    localStorage.setItem(`members_${tripId}`, JSON.stringify(updated));
    setName('');
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (members.find(m => m.id === id)?.name === '我') return alert('不可刪除自己');
    if (!confirm('移除成員？')) return;
    if (supabase && isSupabaseConfigured) {
      await supabase.from('members').delete().eq('id', id);
    }
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    localStorage.setItem(`members_${tripId}`, JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black text-journey-brown uppercase italic">Partners</h2>
        <button onClick={() => setShowForm(true)} className="w-14 h-14 bg-journey-accent text-white rounded-3xl shadow-soft flex items-center justify-center active:scale-90"><UserPlus size={24} /></button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {members.map((member) => (
          <div key={member.id} className="bg-white rounded-4xl p-5 flex items-center gap-4 shadow-soft border-2 border-white group">
             <div className="w-16 h-16 rounded-3xl overflow-hidden border-4 border-journey-cream shadow-sm shrink-0"><img src={member.avatar} className="w-full h-full object-cover" /></div>
             <div className="flex-grow"><h4 className="font-black text-journey-brown text-lg">{member.name}</h4></div>
             <button onClick={() => handleDelete(member.id)} className="w-10 h-10 rounded-2xl bg-journey-cream flex items-center justify-center text-journey-brown/10 hover:text-journey-red"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[110] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-journey-brown italic">New Friend</h3>
            <input placeholder="夥伴姓名" value={name} onChange={e => setName(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 font-black focus:outline-none shadow-inner" />
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2rem] shadow-lg active:scale-95">儲存</button>
            <button onClick={() => setShowForm(false)} className="w-full text-journey-brown/30 font-black">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersView;
