import React, { useState, useEffect, useRef } from 'react';
import { Camera, Heart, MessageCircle, X, Send, Loader2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

const JournalView: React.FC = () => {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tripId = 'hokkaido-2024';

  const fetchJournals = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setJournals([
        {
          id: 'demo-j1',
          author: '西施惠',
          avatar: 'https://picsum.photos/seed/isabelle/100/100',
          location: '小樽運河',
          image_url: 'https://picsum.photos/seed/otaru/600/600',
          content: '今天的運河好美喔！散步起來非常舒服 ✨',
          likes: 12
        }
      ]);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setJournals(data || []);
    } catch (err) {
      console.error("Journal Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
    if (supabase && isSupabaseConfigured) {
      const channel = supabase.channel('journal-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'journals' }, () => fetchJournals())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("圖片太大了，請選擇 5MB 以下的圖片喔！");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!content || !selectedFile) return;
    
    if (!isSupabaseConfigured || !supabase) {
      alert("目前為預覽模式，照片無法真正上傳至雲端。");
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('journals')
        .upload(`${tripId}/${fileName}`, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('journals')
        .getPublicUrl(`${tripId}/${fileName}`);

      await supabase.from('journals').insert([{
        trip_id: tripId,
        content,
        location: location || '祕密景點',
        image_url: publicUrl,
        author: '狸克',
        avatar: 'https://picsum.photos/seed/nook/100/100',
        likes: 0
      }]);

      setShowAddModal(false);
      setContent(''); setLocation(''); setSelectedFile(null); setPreviewUrl(null);
      fetchJournals();
    } catch (err: any) {
      console.error("Upload Error:", err);
      alert(`上傳失敗：${err.message || '請檢查 Storage Bucket 權限'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between px-2">
         <h2 className="text-2xl font-black text-journey-brown">回憶相簿</h2>
         <button 
           onClick={() => setShowAddModal(true)} 
           className="bg-journey-green text-white px-6 py-3 rounded-2xl shadow-soft font-black flex items-center gap-2 active:scale-95 transition-all border-b-4 border-journey-darkGreen"
         >
            <Camera size={18} /> 紀錄當下
         </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 opacity-30"><Loader2 className="animate-spin mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">正在沖洗照片...</p></div>
      ) : journals.length === 0 ? (
        <div className="bg-white/40 rounded-4xl p-16 text-center border-4 border-dashed border-journey-sand">
          <ImageIcon size={48} className="mx-auto text-journey-sand mb-4 opacity-50" />
          <p className="text-journey-brown/40 text-sm font-black">還沒有任何回憶...📸<br/>快來分享第一張拍立得吧！</p>
        </div>
      ) : (
        <div className="space-y-10">
          {journals.map((post, i) => (
            <div key={post.id} className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="p-6 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <img src={post.avatar} className="w-12 h-12 rounded-2xl border-2 border-journey-sand object-cover shadow-sm" alt={post.author} />
                    <div>
                      <h4 className="text-sm font-black text-journey-brown leading-tight">{post.author}</h4>
                      <p className="text-[10px] font-bold text-journey-green uppercase tracking-wider mt-0.5">{post.location}</p>
                    </div>
                 </div>
                 <div className="bg-journey-cream p-2 rounded-xl text-journey-brown/20"><Sparkles size={16} /></div>
              </div>
              <div className="mx-4 mb-2 rounded-3xl overflow-hidden aspect-square bg-journey-cream shadow-inner border-4 border-white">
                 <img src={post.image_url} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" alt="Journal" />
              </div>
              <div className="p-7">
                 <div className="flex items-center gap-5 mb-4">
                    <button className="flex items-center gap-1 text-journey-red transition-transform active:scale-125">
                      <Heart size={22} fill={post.likes > 0 ? "currentColor" : "none"} />
                      <span className="text-xs font-black">{post.likes || 0}</span>
                    </button>
                    <button className="text-journey-brown/20"><MessageCircle size={22} /></button>
                 </div>
                 <p className="text-sm text-journey-brown font-medium leading-relaxed bg-journey-cream/50 p-4 rounded-2xl italic">
                   「 {post.content} 」
                 </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[110] bg-journey-brown/70 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-journey-brown">撰寫旅行日誌</h3>
              <button onClick={() => setShowAddModal(false)} className="p-3 bg-journey-cream rounded-full text-journey-brown/30"><X size={20} /></button>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className="aspect-square bg-journey-cream rounded-4xl border-4 border-dashed border-journey-sand flex flex-col items-center justify-center cursor-pointer overflow-hidden group relative"
            >
               {previewUrl ? (
                 <img src={previewUrl} className="w-full h-full object-cover transition-opacity group-hover:opacity-80" />
               ) : (
                 <div className="flex flex-col items-center">
                   <div className="w-16 h-16 bg-white rounded-3xl shadow-soft flex items-center justify-center text-journey-green mb-4 transform group-hover:rotate-6 transition-transform">
                     <Camera size={32} />
                   </div>
                   <p className="text-xs font-black text-journey-brown/40 uppercase tracking-widest">點擊上傳照片</p>
                 </div>
               )}
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>

            <div className="space-y-4">
              <input 
                type="text" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="在哪裡拍的？📍" 
                className="w-full bg-journey-cream rounded-2xl p-4 text-sm text-journey-brown font-black focus:outline-none ring-journey-green focus:ring-4 transition-all"
              />
              <textarea 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                placeholder="紀錄一下當下的心情吧...✍️" 
                className="w-full bg-journey-cream rounded-3xl p-5 text-sm text-journey-brown font-bold focus:outline-none min-h-[120px] ring-journey-green focus:ring-4 transition-all resize-none"
              />
            </div>

            <button 
              onClick={handleSubmit} 
              disabled={isUploading || !selectedFile || !content} 
              className="w-full bg-journey-darkGreen text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale transition-all transform active:scale-95 border-b-4 border-black/10"
            >
              {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />} 
              {isUploading ? '正在同步雲端...' : '分享這份喜悅'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalView;