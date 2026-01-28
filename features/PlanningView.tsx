
import React, { useState } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Briefcase, 
  ShoppingBag, 
  ListTodo, 
  User, 
  MoreHorizontal, 
  Plus, 
  Image as ImageIcon,
  X,
  Store
} from 'lucide-react';

interface SubItem {
  id: string;
  text: string;
  completed: boolean;
  image?: string;
  price?: string;
}

interface GroupItem {
  id: string;
  title: string;
  items: SubItem[];
}

const PlanningView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'todo' | 'packing' | 'shopping'>('todo');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Todo & Packing (Flat lists)
  const [simpleItems, setSimpleItems] = useState([
    { id: '1', type: 'todo', text: '預訂美瑛一日遊包車', completed: true, assignedTo: '狸克' },
    { id: '2', type: 'todo', text: '購買旅遊保險', completed: false, assignedTo: '西施惠' },
    { id: '3', type: 'packing', text: '變壓器 & 轉接頭', completed: false, assignedTo: '全員' },
    { id: '4', type: 'packing', text: '保暖發熱衣', completed: true, assignedTo: '全員' },
  ]);

  // Shopping (Nested structure)
  const [shoppingGroups, setShoppingGroups] = useState<GroupItem[]>([
    {
      id: 'g1',
      title: '唐吉訶德 (狸小路店)',
      items: [
        { id: 's1', text: '抹茶 KitKat', completed: false, image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400', price: '¥398' },
        { id: 's2', text: '參天眼藥水', completed: true, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400' },
      ]
    },
    {
      id: 'g2',
      title: '札幌藥妝',
      items: [
        { id: 's3', text: '合利他命 EX Plus', completed: false, image: 'https://images.unsplash.com/photo-1471864190281-ad5f9f33dcf9?auto=format&fit=crop&q=80&w=400' },
      ]
    }
  ]);

  const toggleSimpleItem = (id: string) => {
    setSimpleItems(simpleItems.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const toggleShoppingSubItem = (groupId: string, subId: string) => {
    setShoppingGroups(shoppingGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          items: group.items.map(item => item.id === subId ? { ...item, completed: !item.completed } : item)
        };
      }
      return group;
    }));
  };

  // Image Modal
  const ImageModal = () => (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-300 ${selectedImage ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={() => setSelectedImage(null)}
    >
      <div className="absolute inset-0 bg-journey-brown/40 backdrop-blur-sm"></div>
      <div 
        className="relative bg-white rounded-[3rem] p-3 shadow-2xl max-w-full transform transition-all duration-500 scale-100"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={() => setSelectedImage(null)}
          className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-journey-brown"
        >
          <X size={24} />
        </button>
        <img src={selectedImage || ''} alt="Preview" className="rounded-[2.5rem] max-h-[70vh] object-cover" />
        <div className="p-4 text-center">
          <p className="font-black text-journey-brown">商品圖片預覽</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-journey-brown mb-2 tracking-tight">出發準備</h2>

      {/* Segmented Control */}
      <div className="flex bg-white/50 backdrop-blur-md rounded-4xl p-1.5 shadow-soft-sm">
        <button 
          onClick={() => setActiveTab('todo')}
          className={`flex-1 py-4 flex flex-col items-center gap-1.5 rounded-3xl transition-all duration-500 ${activeTab === 'todo' ? 'bg-journey-green text-white shadow-soft' : 'text-journey-brown/40'}`}
        >
          <ListTodo size={20} />
          <span className="text-[10px] font-black tracking-widest uppercase">待辦事項</span>
        </button>
        <button 
          onClick={() => setActiveTab('packing')}
          className={`flex-1 py-4 flex flex-col items-center gap-1.5 rounded-3xl transition-all duration-500 ${activeTab === 'packing' ? 'bg-journey-green text-white shadow-soft' : 'text-journey-brown/40'}`}
        >
          <Briefcase size={20} />
          <span className="text-[10px] font-black tracking-widest uppercase">行李清單</span>
        </button>
        <button 
          onClick={() => setActiveTab('shopping')}
          className={`flex-1 py-4 flex flex-col items-center gap-1.5 rounded-3xl transition-all duration-500 ${activeTab === 'shopping' ? 'bg-journey-green text-white shadow-soft' : 'text-journey-brown/40'}`}
        >
          <ShoppingBag size={20} />
          <span className="text-[10px] font-black tracking-widest uppercase">購物清單</span>
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-4xl p-6 shadow-soft">
         <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-black text-journey-brown/60 uppercase tracking-widest">完成進度</span>
            <span className="text-sm font-black text-journey-darkGreen">
              {activeTab === 'shopping' 
                ? Math.round((shoppingGroups.flatMap(g => g.items).filter(i => i.completed).length / (shoppingGroups.flatMap(g => g.items).length || 1)) * 100)
                : Math.round((simpleItems.filter(i => i.type === activeTab && i.completed).length / (simpleItems.filter(i => i.type === activeTab).length || 1)) * 100)
              }%
            </span>
         </div>
         <div className="w-full h-4 bg-journey-cream rounded-full overflow-hidden p-1">
            <div 
              className="h-full bg-journey-green rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${
                activeTab === 'shopping' 
                ? (shoppingGroups.flatMap(g => g.items).filter(i => i.completed).length / (shoppingGroups.flatMap(g => g.items).length || 1)) * 100
                : (simpleItems.filter(i => i.type === activeTab && i.completed).length / (simpleItems.filter(i => i.type === activeTab).length || 1)) * 100
              }%` }}
            ></div>
         </div>
      </div>

      {/* List Area */}
      <div className="space-y-6">
         {activeTab === 'shopping' ? (
           // Shopping Nested List
           shoppingGroups.map((group) => (
             <div key={group.id} className="space-y-3">
               <div className="flex items-center gap-2 px-2">
                 <div className="w-8 h-8 rounded-xl bg-journey-accent/30 flex items-center justify-center text-journey-brown">
                   <Store size={16} />
                 </div>
                 <h3 className="font-black text-journey-brown text-sm tracking-tight">{group.title}</h3>
               </div>
               <div className="space-y-2">
                 {group.items.map((subItem) => (
                   <div 
                     key={subItem.id}
                     onClick={() => subItem.image && setSelectedImage(subItem.image)}
                     className={`bg-white rounded-3xl p-4 flex items-center gap-4 shadow-soft-sm border-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${subItem.completed ? 'border-journey-green/20 opacity-60' : 'border-transparent'}`}
                   >
                     <div 
                       onClick={(e) => { e.stopPropagation(); toggleShoppingSubItem(group.id, subItem.id); }}
                       className={`shrink-0 transition-colors ${subItem.completed ? 'text-journey-green' : 'text-journey-brown/20'}`}
                     >
                       {subItem.completed ? <CheckCircle size={24} fill="currentColor" className="text-white" /> : <Circle size={24} />}
                     </div>
                     <div className="flex-grow">
                        <div className="flex items-center justify-between">
                           <p className={`text-sm font-black text-journey-brown ${subItem.completed ? 'line-through opacity-50' : ''}`}>
                             {subItem.text}
                           </p>
                           {subItem.price && <span className="text-[10px] font-bold text-journey-brown/40">{subItem.price}</span>}
                        </div>
                        {subItem.image && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-journey-green uppercase tracking-tighter">
                            <ImageIcon size={10} /> 點擊查看商品圖
                          </div>
                        )}
                     </div>
                     {subItem.image && (
                        <img 
                          src={subItem.image} 
                          className="w-10 h-10 rounded-xl object-cover border-2 border-journey-sand" 
                          alt="thumb" 
                        />
                     )}
                   </div>
                 ))}
                 <button className="w-full py-3 border-2 border-dashed border-journey-sand rounded-3xl text-journey-brown/30 text-[10px] font-black flex items-center justify-center gap-2 active:bg-journey-sand/20 transition-all uppercase tracking-widest">
                   <Plus size={14} /> 在此商店新增品項
                 </button>
               </div>
             </div>
           ))
         ) : (
           // Regular Todo/Packing List
           simpleItems.filter(i => i.type === activeTab).map((item) => (
             <div 
               key={item.id} 
               onClick={() => toggleSimpleItem(item.id)}
               className={`bg-white rounded-3xl p-5 flex items-center gap-4 shadow-soft border-2 transition-all cursor-pointer ${item.completed ? 'border-journey-green/20 opacity-60' : 'border-transparent'}`}
             >
                <div className={`transition-colors ${item.completed ? 'text-journey-green' : 'text-journey-brown/20'}`}>
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
                <button className="text-journey-brown/20 p-2">
                   <MoreHorizontal size={18} />
                </button>
             </div>
           ))
         )}
         
         {activeTab !== 'shopping' && (
           <button className="w-full py-5 border-2 border-dashed border-journey-sand rounded-4xl text-journey-brown/30 text-xs font-black flex items-center justify-center gap-2 active:bg-journey-sand/20 transition-all uppercase tracking-[0.2em]">
              <Plus size={18} /> 新增項目
           </button>
         )}

         {activeTab === 'shopping' && (
           <button className="w-full py-5 bg-journey-accent/20 border-2 border-journey-accent/10 rounded-4xl text-journey-brown text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all shadow-soft uppercase tracking-[0.2em]">
              <Store size={18} /> 新增商店分類
           </button>
         )}
      </div>

      {/* Image Popup Modal */}
      <ImageModal />
    </div>
  );
};

export default PlanningView;
