
import React, { useState, useEffect } from 'react';
import { MOCK_MEMBERS } from '../constants';
import { UserPlus, Settings, MessageSquare, ShieldCheck, X, Camera, Save, Loader2 } from 'lucide-react';
import { db, isConfigured } from '../firebase';
import { collection, onSnapshot, query, doc, updateDoc, setDoc } from 'firebase/firestore';

const MembersView: React.FC = () => {
  const [members, setMembers] = useState(MOCK_MEMBERS);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // 表單暫存狀態
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const tripId = 'hokkaido-2024';

  // --- 監聽雲端成員資料 ---
  useEffect(() => {
    if (!isConfigured || !db) return;

    const q = query(collection(db, 'trips', tripId, 'members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // 如果雲端是空的，可以初始化預設成員（可選）
        return;
      }
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMembers(items as any);
    });

    return () => unsubscribe();
  }, []);

  // 開啟編輯視窗
  const openEdit = (member: any) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditAvatar(member.avatar);
  };

  // 儲存修改
  const handleSave = async () => {
    if (!editName.trim()) return;
    setLoading(true);

    const updatedData = {
      name: editName,
      avatar: editAvatar || `https://picsum.photos/seed/${editName}/100/100`
    };

    if (isConfigured && db) {
      try {
        const memberRef = doc(db, 'trips', tripId, 'members', editingMember.id);
        await setDoc(memberRef, updatedData, { merge: true });
      } catch (e) {
        console.error("更新失敗:", e);
      }
    } else {
      // 本地 Demo 模式更新
      setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...updatedData } : m));
    }

    setLoading(false);
    setEditingMember(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <h2 className="text-xl font-bold text-journey-brown">旅行團成員 ({members.length})</h2>
         <button className="bg-journey-accent text-white p-2 rounded-2xl shadow-soft active:scale-95 transition-transform">
            <UserPlus size={20} />
         </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {members.map((member) => (
          <div key={member.id} className="bg-white rounded-4xl p-4 flex items-center gap-4 shadow-soft border-2 border-transparent hover:border-journey-green/10 transition-colors animate-in fade-in slide-in-from-bottom-2">
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
                <button 
                  onClick={() => openEdit(member)}
                  className="w-10 h-10 rounded-2xl bg-journey-cream flex items-center justify-center text-journey-brown/60 hover:text-journey-red transition-colors"
                >
                   <Settings size={18} />
                </button>
             </div>
          </div>
        ))}
      </div>

      {/* 編輯 Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-journey-brown">修改個人資料</h3>
              <button onClick={() => setEditingMember(null)} className="p-2 bg-journey-cream rounded-full"><X size={20} /></button>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <img src={editAvatar} className="w-24 h-24 rounded-4xl object-cover border-4 border-journey-cream shadow-soft" alt="preview" />
                <div className="absolute inset-0 bg-black/20 rounded-4xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              <p className="text-[10px] font-bold text-journey-brown/40 uppercase">點擊修改頭像 URL (或留空自動產生)</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/40 uppercase">成員暱稱</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none ring-journey-green focus:ring-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-journey-brown/40 uppercase">頭像圖片網址</label>
                <input 
                  type="text" 
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown text-xs focus:outline-none"
                />
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-journey-darkGreen text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              更新資料
            </button>
          </div>
        </div>
      )}

      {/* 底部邀請卡 */}
      <div className="bg-journey-accent/10 border-2 border-dashed border-journey-accent/40 rounded-4xl p-6 text-center space-y-3">
         <div className="w-16 h-16 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-soft-sm text-journey-accent animate-float">
            <UserPlus size={32} />
         </div>
         <h3 className="font-bold text-journey-brown">邀請更多狸貓？</h3>
         <p className="text-xs text-journey-brown/60 leading-loose">
            發送邀請連結給你的朋友，一起加入冒險！
         </p>
         <button className="bg-journey-accent text-white font-bold py-3 px-8 rounded-2xl shadow-soft text-sm active:scale-95 transition-transform">
            複製邀請連結
         </button>
      </div>
    </div>
  );
};

export default MembersView;
