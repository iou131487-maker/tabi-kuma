
import React from 'react';
import { Camera, Heart, MessageCircle, MapPin, Share2 } from 'lucide-react';

const JournalView: React.FC = () => {
  const journals = [
    {
      id: '1',
      author: '西施惠',
      avatar: 'https://picsum.photos/seed/isabelle/100/100',
      content: '今天在札幌吃到的拉麵超讚！湯頭濃郁但不會太鹹，麵條很有彈性。',
      location: '札幌拉麵共和國',
      images: ['https://picsum.photos/seed/ramen/600/600'],
      likes: 12,
      date: '5/12 14:30'
    },
    {
      id: '2',
      author: '狸克',
      avatar: 'https://picsum.photos/seed/nook/100/100',
      content: '終於看到這棵著名的聖誕樹了。雖然是春天但還是很有氣氛，大家一起拍照真開心！',
      location: '美瑛 聖誕樹之木',
      images: ['https://picsum.photos/seed/tree/600/400', 'https://picsum.photos/seed/biei/600/400'],
      likes: 8,
      date: '5/13 11:20'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <h2 className="text-xl font-bold text-journey-brown">旅途日誌</h2>
         <button className="bg-journey-green text-white px-4 py-2 rounded-2xl shadow-soft text-xs font-bold flex items-center gap-2 active:scale-95 transition-all">
            <Camera size={16} /> 寫日誌
         </button>
      </div>

      {journals.map((post) => (
        <div key={post.id} className="bg-white rounded-4xl shadow-soft overflow-hidden">
          {/* Post Header */}
          <div className="p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <img src={post.avatar} className="w-10 h-10 rounded-2xl border-2 border-journey-sand object-cover" alt="avatar" />
                <div>
                   <h4 className="text-sm font-bold text-journey-brown">{post.author}</h4>
                   <p className="text-[10px] text-journey-brown/40 flex items-center gap-1">
                      <MapPin size={10} /> {post.location}
                   </p>
                </div>
             </div>
             <span className="text-[10px] text-journey-brown/40 font-bold">{post.date}</span>
          </div>
          
          {/* Post Images */}
          <div className="relative aspect-square overflow-hidden bg-journey-cream">
             {post.images.length > 1 && (
               <div className="absolute top-4 right-4 bg-black/40 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-md z-10">
                 1 / {post.images.length}
               </div>
             )}
             <img src={post.images[0]} className="w-full h-full object-cover" alt="journal" />
          </div>

          {/* Post Content */}
          <div className="p-5">
             <div className="flex items-center gap-4 mb-4">
                <button className="text-journey-red flex items-center gap-1 active:scale-125 transition-transform">
                   <Heart size={20} /> <span className="text-xs font-bold">{post.likes}</span>
                </button>
                <button className="text-journey-brown/60 flex items-center gap-1">
                   <MessageCircle size={20} /> <span className="text-xs font-bold">2</span>
                </button>
                <button className="text-journey-brown/60 ml-auto">
                   <Share2 size={20} />
                </button>
             </div>
             <p className="text-sm text-journey-brown leading-relaxed mb-1">
                <span className="font-bold mr-2">{post.author}</span>
                {post.content}
             </p>
             <div className="flex gap-2 mt-3">
                <span className="text-[10px] text-journey-green font-bold">#北海道</span>
                <span className="text-[10px] text-journey-green font-bold">#自由行</span>
                <span className="text-[10px] text-journey-green font-bold">#2024旅行</span>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JournalView;
