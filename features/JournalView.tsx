
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Heart, MessageCircle, MapPin, Share2, X, Send, Loader2, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { db, storage, isConfigured } from '../firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const JournalView: React.FC = () => {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Modal & Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tripId = 'hokkaido-2024';

  // --- 監聽雲端日誌 ---
  useEffect(() => {
    if (!isConfigured || !db) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'trips', tripId, 'journals'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setJournals(items);
      setLoading(false);
    }, (err) => {
      console.error("Firestore 監聽失敗:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 圖片壓縮工具 (確保 Base64 備援方案不會超過 Firestore 1MB 限制) ---
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          // 壓縮品質設為 0.6
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  // --- 處理圖片選擇 ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  // --- 執行上傳與儲存 (含 Storage 失敗備援) ---
  const handleSubmit = async () => {
    if (!content || !selectedFile || !db) return;

    setIsUploading(true);
    setErrorMsg(null);
    
    try {
      const compressedBase64 = await compressImage(selectedFile);
      let finalImageUrl = compressedBase64;
      let usedStorage = false;

      // 嘗試使用 Storage (如果可用且未報錯)
      if (storage) {
        try {
          const fileName = `${Date.now()}_journal.jpg`;
          const storageRef = ref(storage, `trips/${tripId}/journals/${fileName}`);
          
          // 將 Base64 轉回 Blob 進行上傳
          const response = await fetch(compressedBase64);
          const blob = await response.blob();
          
          const uploadTask = uploadBytesResumable(storageRef, blob);

          await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
              (snap) => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
              (err) => reject(err),
              async () => {
                finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                usedStorage = true;
                resolve(true);
              }
            );
          });
        } catch (storageErr: any) {
          console.warn("Storage 上傳失敗 (可能是計費方案限制)，改用 Firestore 備援方案:", storageErr);
          // 如果是因為計費方案 (quota exceeded / 402 / 403)，我們就用 Base64
          usedStorage = false;
        }
      }

      // 儲存資料到 Firestore
      await addDoc(collection(db, 'trips', tripId, 'journals'), {
        content,
        location: location || '未設定地點',
        imageUrl: finalImageUrl,
        isBase64: !usedStorage, // 標記是否為備援模式
        author: '你',
        avatar: 'https://picsum.photos/seed/me/100/100',
        likes: 0,
        createdAt: serverTimestamp(),
        date: new Date().toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });

      // 重置
      setIsUploading(false);
      setShowAddModal(false);
      setContent('');
      setLocation('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
    } catch (e: any) {
      console.error("日誌儲存最終失敗:", e);
      setErrorMsg("儲存失敗：或是圖片太大了。請稍後再試。");
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <h2 className="text-xl font-black text-journey-brown tracking-tight">旅途日誌</h2>
         <button 
           onClick={() => { setShowAddModal(true); setErrorMsg(null); }}
           className="bg-journey-green text-white px-5 py-2.5 rounded-2xl shadow-soft text-xs font-black flex items-center gap-2 active:scale-95 transition-all uppercase tracking-widest"
         >
            <Camera size={16} /> 寫日誌
         </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-20 opacity-30">
          <Loader2 className="animate-spin mb-2 text-journey-brown" />
          <p className="text-[10px] font-black uppercase">回憶讀取中...</p>
        </div>
      ) : journals.length === 0 ? (
        <div className="bg-white/40 rounded-4xl p-16 text-center border-2 border-dashed border-journey-sand">
          <p className="text-journey-brown/40 text-sm font-bold">還沒有任何回憶...<br/>快來拍第一張照片吧！📸</p>
        </div>
      ) : (
        <div className="space-y-8">
          {journals.map((post) => (
            <div key={post.id} className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header */}
              <div className="p-5 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <img src={post.avatar} className="w-10 h-10 rounded-2xl border-2 border-journey-sand object-cover shadow-soft-sm" alt="avatar" />
                    <div>
                       <h4 className="text-sm font-black text-journey-brown leading-tight">{post.author}</h4>
                       <p className="text-[10px] font-bold text-journey-brown/30 flex items-center gap-1">
                          <MapPin size={10} className="text-journey-blue" /> {post.location}
                          {post.isBase64 && <span className="text-[8px] bg-journey-accent/20 px-1 rounded ml-1 text-journey-brown/40">Offline Mode</span>}
                       </p>
                    </div>
                 </div>
                 <span className="text-[9px] font-black text-journey-brown/20 tracking-tighter">{post.date}</span>
              </div>
              
              {/* Photo */}
              <div className="relative aspect-square overflow-hidden bg-journey-cream mx-2 rounded-3xl group">
                 <img src={post.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="journal" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* Actions & Content */}
              <div className="p-6">
                 <div className="flex items-center gap-5 mb-4">
                    <button className="text-journey-red flex items-center gap-1.5 active:scale-125 transition-transform">
                       <Heart size={22} strokeWidth={2.5} /> <span className="text-xs font-black">{post.likes}</span>
                    </button>
                    <button className="text-journey-brown/30 flex items-center gap-1.5">
                       <MessageCircle size={22} strokeWidth={2.5} /> <span className="text-xs font-black">0</span>
                    </button>
                    <button className="text-journey-brown/20 ml-auto active:scale-90 transition-transform">
                       <Share2 size={20} />
                    </button>
                 </div>
                 <p className="text-sm text-journey-brown leading-relaxed font-medium">
                    <span className="font-black mr-2 text-journey-brown">{post.author}</span>
                    {post.content}
                 </p>
                 <div className="flex gap-2 mt-4">
                    <span className="text-[9px] font-black px-2 py-1 bg-journey-green/10 text-journey-darkGreen rounded-lg uppercase tracking-widest">#HOKKAIDO</span>
                    <span className="text-[9px] font-black px-2 py-1 bg-journey-blue/10 text-journey-blue rounded-lg uppercase tracking-widest">#TRAVEL</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-journey-brown">紀錄此刻回憶</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-journey-cream rounded-full"><X size={20} /></button>
            </div>
            
            {errorMsg && (
              <div className="bg-journey-red/10 border border-journey-red/20 p-3 rounded-2xl flex items-center gap-2 text-journey-red text-[10px] font-bold">
                <AlertTriangle size={14} /> {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {/* Image Uploader */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-video w-full bg-journey-cream rounded-3xl border-4 border-dashed border-journey-sand flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group"
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                       <Camera className="text-white" size={32} />
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="text-journey-brown/20 mb-2" size={40} />
                    <p className="text-[10px] font-black text-journey-brown/40 uppercase tracking-widest">點擊上傳照片</p>
                  </>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-journey-brown/40 uppercase tracking-widest">想說的話...</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="今天的冒險如何？"
                  className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-journey-brown/40 uppercase tracking-widest">地點</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="例如：小樽運河"
                  className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none"
                />
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-journey-darkGreen uppercase">
                  <span>正在同步回憶...</span>
                  <span>{Math.round(uploadProgress) || '處理中'}%</span>
                </div>
                <div className="w-full h-2 bg-journey-cream rounded-full overflow-hidden">
                  <div className="h-full bg-journey-green transition-all" style={{ width: `${uploadProgress || 100}%` }}></div>
                </div>
              </div>
            )}

            <button 
              onClick={handleSubmit}
              disabled={isUploading || !content || !selectedFile}
              className="w-full bg-journey-darkGreen text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30"
            >
              {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              分享日誌
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalView;
