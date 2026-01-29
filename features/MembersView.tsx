
import React, { useState, useEffect } from 'react';
import { UserPlus, MessageSquare, Loader2, X, Send, Trash2, Camera, Edit2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const MembersView: React.FC = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');

  const tripId = 'hokkaido-2024';

  const fetchMembers = async () => {
    setLoading(true);
    if (!supabase || !isSupabaseConfigured) {
      const saved = localStorage.getItem(`members_${tripId}`);
      setMembers(saved ? JSON.parse(saved) : [
        { id: '1', name: '狸克', avatar: 'https://picsum.photos/seed/nook/100/100' },
        { id: '2', name: '西施惠', avatar: 'https://picsum.photos/seed/isabelle/100/100' }
      ]);
    } else {
      const { data } = await supabase.from('members').select('*').eq('trip_id', tripId);
      if (data) setMembers(data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleSave = async () => {
    if (!name) return;
    const payload = { 
      id: editingMember?.id || Date.now().toString(),
      name, 
      avatar: avatar || `https://picsum.photos/seed/${name}/100/100`,
      trip_id: tripId 
    };

    if (!supabase || !isSupabaseConfigured) {
      let updated;
      if (editingMember) {
        updated = members.map(m => m.id === editingMember.id ? payload : m);
      } else {
        updated = [...members, payload];
      }
      setMembers(updated);
      localStorage.setItem(`members_${tripId}`, JSON.stringify(updated));
    } else {
      if (editingMember) {
        await supabase.from('members').update(payload).eq('id', editingMember.id);
      } else {
        await supabase.from('members').insert([payload]);
      }
      fetchMembers();
    }
    setShowForm(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要移除這位團員嗎？')) return;
    if (!supabase || !isSupabaseConfigured) {
      const updated = members.filter(m => m.id !== id);
      setMembers(updated);
      localStorage.setItem(`members_${tripId}`, JSON.stringify(updated));
    } else {
      await supabase.from('members').delete().eq('id', id);
      fetchMembers();
    }
  };

  const resetForm = () => { setName(''); setAvatar(''); setEditingMember(null); };
  const openEdit = (m: any) => { setEditingMember(m); setName(m.name); setAvatar(m.avatar); setShowForm(true); };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between mb-2">
        <div><h2 className="text-2xl font-black text-journey-brown">行程夥伴</h2><p className="text-[10px] font-bold text-journey-brown/30 uppercase tracking-widest mt-1">Travel Members ({members.length})</p></div>
        <button onClick={() => setShowForm(true)} className="w-14 h-14 bg-journey-accent text-white rounded-3xl shadow-soft flex items-center justify-center active:scale-90 transition-all border-b-4 border-white/50"><UserPlus size={24} /></button>
      </div>

      {loading ? ( <div className="flex justify-center py-10 opacity-30"><Loader2 className="animate-spin" /></div> ) : (
        <div className="grid grid-cols-1 gap-4">
          {members.map((member) => (
            <div key={member.id} className="bg-white rounded-4xl p-5 flex items-center gap-4 shadow-soft border-2 border-white group animate-in slide-in-from-right">
               <div className="w-16 h-16 rounded-3xl overflow-hidden border-4 border-journey-cream shadow-sm shrink-0">
                 <img src={member.avatar} className="w-full h-full object-cover" alt={member.name} />
               </div>
               <div className="flex-grow">
                 <h4 className="font-black text-journey-brown text-lg">{member.name}</h4>
                 <p className="text-[10px] text-journey-brown/30 font-bold uppercase tracking-widest">行程團員</p>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => openEdit(member)} className="w-10 h-10 rounded-2xl bg-journey-cream flex items-center justify-center text-journey-brown/20 hover:text-journey-green transition-colors"><Edit2 size={16} /></button>
                 <button onClick={() => handleDelete(member.id)} className="w-10 h-10 rounded-2xl bg-journey-cream flex items-center justify-center text-journey-brown/20 hover:text-journey-red transition-colors"><Trash2 size={16} /></button>
               </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[110] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[3.5rem] sm:rounded-[3.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center"><h3 className="text-xl font-black text-journey-brown">{editingMember ? '編輯成員' : '新增成員'}</h3><button onClick={() => { setShowForm(false); resetForm(); }} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button></div>
            <div className="space-y-4">
               <div className="flex flex-col items-center mb-6">
                 <div className="w-24 h-24 bg-journey-cream rounded-4xl overflow-hidden border-4 border-white shadow-soft relative group cursor-pointer">
                    <img src={avatar || `https://picsum.photos/seed/${name || 'new'}/100/100`} className="w-full h-full object-cover" alt="Preview" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={20} className="text-white" /></div>
                 </div>
                 <p className="text-[9px] font-black text-journey-brown/30 mt-3 uppercase tracking-widest">成員頭像</p>
               </div>
               <input placeholder="團員姓名" value={name} onChange={e => setName(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-journey-brown font-black focus:outline-none ring-4 ring-transparent focus:ring-journey-green transition-all" />
               <input placeholder="頭像網址 (可選)" value={avatar} onChange={e => setAvatar(e.target.value)} className="w-full bg-journey-cream rounded-3xl p-5 text-xs text-journey-brown/40 font-bold focus:outline-none" />
            </div>
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2rem] shadow-lg active:scale-95 border-b-4 border-black/10"><Send size={18} /> {editingMember ? '確認修改' : '邀請加入'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersView;
