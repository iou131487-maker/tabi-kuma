
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Briefcase, 
  ShoppingBag, 
  ListTodo, 
  User, 
  Plus, 
  Image as ImageIcon,
  X,
  Store,
  Trash2,
  Loader2,
  Send
} from 'lucide-react';
import { db, isConfigured } from '../firebase';
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';

const PlanningView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'todo' | 'packing' | 'shopping'>('todo');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 資料狀態
  const [items, setItems] = useState<any[]>([]); // Todo & Packing
  const [shoppingItems, setShoppingItems] = useState<any[]>([]); // Shopping

  // Modal 狀態
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemAssignee, setNewItemAssignee] = useState('全員');
  const [newShopName, setNewShopName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const tripId = 'hokkaido-2024';

  // --- 監聽資料 ---
  useEffect(() => {
    if (!isConfigured || !db) {
      setLoading(false);
      return;
    }

    // 監聽 Todo & Packing
    const qItems = query(collection(db, 'trips', tripId, 'planning_items'), orderBy('createdAt', 'asc'));
    const unsubItems = onSnapshot(qItems, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // 監聽 Shopping
    const qShop = query(collection(db, 'trips', tripId, 'shopping'), orderBy('createdAt', 'asc'));
    const unsubShop = onSnapshot(qShop, (snap) => {
      setShoppingItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubItems(); unsubShop(); };
  }, []);

  // --- 操作功能 ---
  const toggleItem = async (id: string, currentStatus: boolean, collectionName: string) => {
    if (!isConfigured || !db) return;
    const ref = doc(db, 'trips', tripId, collectionName, id);
    await updateDoc(ref, { completed: !currentStatus });
  };

  const deleteItem = async (id: string, collectionName: string) => {
    if (!isConfigured || !db) return;
    if (confirm('確定要刪除這個項目嗎？')) {
      await deleteDoc(doc(db, 'trips', tripId, collectionName, id));
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim() || !db) return;
    
    const collectionName = activeTab === 'shopping' ? 'shopping' : 'planning_items';
    const payload: any = {
      text: newItemText,
      completed: false,
      createdAt: serverTimestamp(),
    };

    if (activeTab === 'shopping') {
      payload.shopName = newShopName || '其他商店';
      payload.price = newPrice;
      payload.image = newImageUrl;
    } else {
      payload.type = activeTab;
      payload.assignedTo = newItemAssignee;
    }

    await addDoc(collection(db, 'trips', tripId, collectionName), payload);
    
    // 重置
    setNewItemText('');
    setNewPrice('');
    setNewImageUrl('');
    setShowAddModal(false);
  };

  // --- 資料處理 (按商店分組) ---
  const groupedShopping = shoppingItems.reduce((acc: any, item) => {
    const shop = item.shopName || '其他商店';
    if (!acc[shop]) acc[shop] = [];
    acc[shop].push(item);
    return acc;
  }, {});

  // --- 進度計算 ---
  const currentItems = activeTab === 'shopping' ? shoppingItems : items.filter(i => i.type === activeTab);
  const progress = currentItems.length > 0 
    ? Math.round((currentItems.filter(i => i.completed).length / currentItems.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-journey-brown mb-2 tracking-tight">出發準備</h2>

      {/* Segmented Control */}
      <div className="flex bg-white/50 backdrop-blur-md rounded-4xl p-1.5 shadow-soft-sm">
        {(['todo', 'packing', 'shopping'] as const).map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 flex flex-col items-center gap-1.5 rounded-3xl transition-all duration-500 ${activeTab === tab ? 'bg-journey-green text-white shadow-soft' : 'text-journey-brown/40'}`}
          >
            {tab === 'todo' && <ListTodo size={20} />}
            {tab === 'packing' && <Briefcase size={20} />}
            {tab === 'shopping' && <ShoppingBag size={20} />}
            <span className="text-[10px] font-black tracking-widest uppercase">
              {tab === 'todo' ? '待辦' : tab === 'packing' ? '行李' : '購物'}
            </span>
          </button>
        ))}
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-4xl p-6 shadow-soft">
         <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-black text-journey-brown/60 uppercase tracking-widest">完成進度</span>
            <span className="text-sm font-black text-journey-darkGreen">{progress}%</span>
         </div>
         <div className="w-full h-4 bg-journey-cream rounded-full overflow-hidden p-1">
            <div 
              className="h-full bg-journey-green rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
         </div>
      </div>

      {/* List Area */}
      {loading ? (
        <div className="flex flex-col items-center py-10 opacity-30">
          <Loader2 className="animate-spin mb-2" />
          <p className="text-[10px] font-black uppercase">清單讀取中...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'shopping' ? (
            Object.keys(groupedShopping).map((shop) => (
              <div key={shop} className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-8 h-8 rounded-xl bg-journey-accent/30 flex items-center justify-center text-journey-brown">
                    <Store size={16} />
                  </div>
                  <h3 className="font-black text-journey-brown text-sm tracking-tight">{shop}</h3>
                </div>
                <div className="space-y-2">
                  {groupedShopping[shop].map((item: any) => (
                    <div 
                      key={item.id}
                      className={`bg-white rounded-3xl p-4 flex items-center gap-4 shadow-soft-sm border-2 transition-all ${item.completed ? 'border-journey-green/20 opacity-60' : 'border-transparent'}`}
                    >
                      <div 
                        onClick={() => toggleItem(item.id, item.completed, 'shopping')}
                        className={`shrink-0 transition-colors cursor-pointer ${item.completed ? 'text-journey-green' : 'text-journey-brown/20'}`}
                      >
                        {item.completed ? <CheckCircle size={24} fill="currentColor" className="text-white" /> : <Circle size={24} />}
                      </div>
                      <div className="flex-grow" onClick={() => item.image && setSelectedImage(item.image)}>
                        <div className="flex items-center justify-between">
                           <p className={`text-sm font-black text-journey-brown ${item.completed ? 'line-through opacity-50' : ''}`}>
                             {item.text}
                           </p>
                           {item.price && <span className="text-[10px] font-bold text-journey-brown/40">{item.price}</span>}
                        </div>
                        {item.image && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-journey-green uppercase tracking-tighter">
                            <ImageIcon size={10} /> 點擊查看商品圖
                          </div>
                        )}
                      </div>
                      <button onClick={() => deleteItem(item.id, 'shopping')} className="text-journey-red/20 hover:text-journey-red p-2">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            currentItems.map((item) => (
              <div 
                key={item.id} 
                className={`bg-white rounded-3xl p-5 flex items-center gap-4 shadow-soft border-2 transition-all animate-in fade-in slide-in-from-bottom-2 ${item.completed ? 'border-journey-green/20 opacity-60' : 'border-transparent'}`}
              >
                <div 
                  onClick={() => toggleItem(item.id, item.completed, 'planning_items')}
                  className={`transition-colors cursor-pointer ${item.completed ? 'text-journey-green' : 'text-journey-brown/20'}`}
                >
                   {item.completed ? <CheckCircle size={24} fill="currentColor" className="text-white" /> : <Circle size={24} />}
                </div>
                <div className="flex-grow">
                   <p className={`text-sm font-black text-journey-brown tracking-tight ${item.completed ? 'line-through opacity-50' : ''}`}>
                      {item.text}
                   </p>
                   <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-5 h-5 rounded-lg bg-journey-sand flex items-center justify-center">
                         <User size={10} className="text-journey-brown/60" />
                      </div>
                      <span className="text-[9px] font-black text-journey-brown/30 uppercase tracking-[0.1em]">{item.assignedTo}</span>
                   </div>
                </div>
                <button onClick={() => deleteItem(item.id, 'planning_items')} className="text-journey-red/20 hover:text-journey-red p-2">
                   <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
          
          <button 
            onClick={() => {
              if (activeTab === 'shopping') setNewShopName('');
              setShowAddModal(true);
            }}
            className="w-full py-5 border-2 border-dashed border-journey-sand rounded-4xl text-journey-brown/30 text-xs font-black flex items-center justify-center gap-2 active:bg-journey-sand/20 transition-all uppercase tracking-[0.2em]"
          >
             <Plus size={18} /> 新增項目
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-journey-brown/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-journey-brown">
                新增{activeTab === 'todo' ? '待辦' : activeTab === 'packing' ? '行李' : '購物項目'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-journey-cream rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-journey-brown/40 uppercase">名稱</label>
                <input 
                  type="text" 
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="請輸入內容..."
                  className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none"
                />
              </div>

              {activeTab === 'shopping' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-journey-brown/40 uppercase">商店名稱</label>
                    <input 
                      type="text" 
                      value={newShopName}
                      onChange={(e) => setNewShopName(e.target.value)}
                      placeholder="例如：唐吉訶德"
                      className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-journey-brown/40 uppercase">價格 (選填)</label>
                      <input 
                        type="text" 
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="¥ 0"
                        className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-journey-brown/40 uppercase">圖片 URL</label>
                      <input 
                        type="text" 
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-journey-brown/40 uppercase">負責人</label>
                  <select 
                    value={newItemAssignee}
                    onChange={(e) => setNewItemAssignee(e.target.value)}
                    className="w-full bg-journey-cream rounded-2xl p-4 text-journey-brown font-bold focus:outline-none appearance-none"
                  >
                    <option value="全員">全員</option>
                    <option value="狸克">狸克</option>
                    <option value="西施惠">西施惠</option>
                  </select>
                </div>
              )}
            </div>

            <button 
              onClick={handleAddItem}
              className="w-full bg-journey-darkGreen text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Send size={18} /> 加入清單
            </button>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-journey-brown/60 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative bg-white rounded-[3rem] p-3 shadow-2xl max-w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedImage(null)} className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"><X size={24} /></button>
            <img src={selectedImage} alt="Preview" className="rounded-[2.5rem] max-h-[70vh] object-cover" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningView;
