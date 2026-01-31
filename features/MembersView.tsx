
import React, { useState, useEffect } from 'react';
import { UserPlus, X, Trash2, Edit2, Save } from 'lucide-react';
import { supabase } from '../supabase';

const MembersView: React.FC<{ tripConfig: any }> = ({ tripConfig }) => {
  const tripId = tripConfig.id;
  const localKey = `mem_${tripId}`;
  
  const [members, setMembers] = useState<any[]>(() => {
    const saved = localStorage.getItem(localKey);
    return saved ? JSON.parse(saved) : [{ id: 'me', name: '我', avatar: tripConfig.userAvatar }];
  });
  
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchSync = async () => {
      if (!supabase || !tripId) return;
      try {
        const { data, error } = await supabase.from('members').select('*').eq('trip_id', tripId);
        if (!error && data && data.length > 0) { 
          setMembers(data); 
          localStorage.setItem(localKey, JSON.stringify(data)); 
        }
      } catch (e) {
        console.warn("Sync Offline");
      }
    };
    fetchSync();
  }, [tripId]);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    const payload = { 
      id: editingItem?.id || `me-${Date.now()}`, 
      name, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`, 
      trip_id: tripId 
    };
    
    const updated = editingItem ? members.map(m => m.id === editingItem.id ? payload : m) : [...members, payload];
    setMembers(updated);
    localStorage.setItem(localKey, JSON.stringify(updated));
    setShowForm(false); 
    setEditingItem(null); 
    setName('');

    if (supabase) {
      try {
        await supabase.from('members').upsert(payload);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const m = members.find(m => m.id === id);
    if (id === 'me' || m?.name === '我') return alert('不可刪除自己');
    if (!confirm('移除夥伴？')) return;
    
    const filtered = members.filter(m => m.id !== id);
    setMembers(filtered);
    localStorage.setItem(localKey, JSON.stringify(filtered));
    
    if (supabase) {
      try {
        await supabase.from('members').delete().eq('id', id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black text-journey-brown italic uppercase tracking-tighter">Partners</h2>
        <button onClick={() => { setEditingItem(null); setName(''); setShowForm(true); }} className="w-12 h-12 bg-journey-accent text-white rounded-2xl shadow-soft flex items-center justify-center active:scale-90 transition-transform"><UserPlus size={24} /></button>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {members.map((m) => (
          <div key={m.id} className="bg-white rounded-[2.5rem] p-6 flex items-center gap-6 shadow-soft border-4 border-white transition-all hover:border-journey-accent">
             <div className="w-20 h-20 rounded-[1.8rem] overflow-hidden border-4 border-journey-cream shadow-inner shrink-0"><img src={m.avatar} className="w-full h-full object-cover" alt="Avatar" /></div>
             <div className="flex-grow"><h4 className="font-black text-journey-brown text-xl leading-none">{m.name}</h4><p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em] mt-2">Dream Partner</p></div>
             <div className="flex flex-col gap-2">
               <button onClick={() => { setEditingItem(m); setName(m.name); setShowForm(true); }} className="p-2 text-journey-blue"><Edit2 size={18}/></button>
               <button onClick={() => handleDelete(m.id)} className="p-2 text-journey-red"><Trash2 size={18}/></button>
             </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[200] bg-journey-brown/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-t-[4rem] sm:rounded-[3.5rem] p-10 shadow-2xl space-y-8 animate-in slide-in-from-bottom-10">
            <h3 className="text-xl font-black text-journey-brown italic">{editingItem ? 'Edit' : 'Add'} Partner</h3>
            <input placeholder="夥伴姓名" value={name} onChange={e => setName(e.target.value)} className="w-full bg-journey-cream rounded-2xl p-6 font-black focus:outline-none" />
            <button onClick={handleSave} className="w-full bg-journey-darkGreen text-white font-black py-6 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 active:scale-95"><Save size={20} /> 確認儲存</button>
            <button onClick={() => setShowForm(false)} className="w-full text-journey-brown/20 font-black py-2">取消</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersView;
