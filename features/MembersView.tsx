
import React, { useState, useEffect } from 'react';
import { UserPlus, Loader2, X, Send, Trash2, Camera, Edit2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const MembersView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');

  const tripId = tripConfig.id || 'default-trip';

  const fetchMembers = async () => {
    setLoading(true);
    // 1. 本地讀取
    const saved = localStorage.getItem(`members_${tripId}`);
    setMembers(saved ? JSON.parse(saved) : [{ id: '1', name: '我', avatar: tripConfig.userAvatar }]);

    // 2. 雲端同步
    if (supabase && isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('members').select('*').eq('trip_id', tripId);
        if (data) {
          const finalMem = data.length > 0 ? data : [{ id: '1', name: '我', avatar: tripConfig.userAvatar }];
          setMembers(finalMem);
          localStorage.setItem(`members_${tripId}`, JSON.stringify(finalMem));
        }
      } catch { console.warn("Cloud Sync offline"); }
    }
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, [tripId]);

  const handleSave = async () => {
    if (!name) return;
    const payload = { id: editingMember?.id || Date.now().toString(), name, avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`, trip_id: tripId };
    const updated = editingMember ? members.map(m => m.id === editingMember.id ? payload : m) : [...members, payload];
    setMembers(updated);
    localStorage.setItem(`members_${tripId}`, JSON.stringify(updated));

    if (supabase && isSupabaseConfigured) {
      if (editingMember) supabase.from('members').update(payload).eq('id', editingMember.id).then();
      else supabase.from('members').insert([payload]).then();
    }
    setShowForm(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const memberToDelete = members.find(m => m.id === id);
    if (memberToDelete?.name === '我') return alert('不能刪除自己喔！');
    if (!confirm('確定要移除成員嗎？')) return;
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    localStorage.setItem(`members_${tripId}`, JSON.stringify(updated));
    if (supabase && isSupabaseConfigured) supabase.from('members').delete().eq('id', id).then();
  };

  const resetForm = () => { setName(''); setAvatar(''); setEditingMember(null); };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between mb-2 px-2">
        <div><h2 className="text-2xl font-black text-journey-brown">行程夥伴</h2><p className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-widest mt-1">Travelers ({members.length})</p></div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="w-14 h-14 bg-journey-accent text-white rounded-3xl shadow-soft flex items-center justify-center active:scale-90 transition-all"><UserPlus size={24} /></button>
      </div>

      {loading && members.length === 0 ? ( <div className="flex justify-center py-10 opacity-30"><Loader2 className="animate-spin" /></div> ) : (
        <div className="grid grid-cols-1 gap-4">
          {members.map((member) => (
            <div key={member.id} className="bg-white rounded-4xl p-5 flex items-center gap-4 shadow-soft border-2 border-white group">
               <div className="w-16 h-16 rounded-3xl overflow-hidden border-4 border-journey-cream shadow-sm shrink-0"><img src={member.avatar} className="w-full h-full object-cover" /></div>
               <div className="flex-grow"><h4 className="font-black text-journey-brown text-lg">{member.name}</h4><p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Traveler</p></div>
               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => handleDelete(member.id)} className="w-10 h-10 rounded-2xl bg-journey-cream flex items-center justify-center text-journey-brown/10 hover:text-journey-red"><Trash2 size={16} /></button>
               </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[110] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3rem] p-8 shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-journey-brown">新增夥伴</h3>
            <input placeholder="姓名" value={name} onChange={e => setName(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none" />
            <input placeholder="頭像網址" value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-xs text-journey-brown/40 font-bold focus:outline-none" />
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2rem] shadow-lg active:scale-95 border-b-4 border-black/10 transition-all uppercase tracking-[0.2em]">儲存</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersView;
