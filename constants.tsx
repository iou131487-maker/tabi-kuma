
import React from 'react';
import { 
  MapPin, 
  Utensils, 
  Plane, 
  Hotel, 
  Car, 
  Tag, 
  Coins, 
  Calendar, 
  CreditCard, 
  BookOpen, 
  CheckSquare, 
  Users 
} from 'lucide-react';

export const THEME_COLORS = {
  attraction: 'bg-journey-green',
  food: 'bg-journey-accent',
  transport: 'bg-journey-blue',
  lodging: 'bg-journey-red',
  other: 'bg-journey-sand'
};

/**
 * 少女馬卡龍色系映射表 (Maiden Macaron Palette)
 * 確保 6 個分頁擁有完全不同的溫柔色調
 */
export const PAGE_BACKGROUNDS: Record<string, string> = {
  '/schedule': 'bg-[#E8F8F5]', // 蘇打薄荷
  '/bookings': 'bg-[#EBF5FB]', // 晴空粉藍
  '/expense': 'bg-[#FEF9E7]',  // 奶油檸檬
  '/planning': 'bg-[#F5EEF8]', // 薰衣草紫
  '/journal': 'bg-[#FDEDEC]',  // 玫瑰粉紅
  '/members': 'bg-[#FEF5E7]',  // 杏桃甜橙
  '/sync': 'bg-[#FDFBF7]'      // 奶油白 (同步頁面)
};

export const CATEGORY_ICONS = {
  attraction: <MapPin size={16} />,
  food: <Utensils size={16} />,
  transport: <Plane size={16} />,
  lodging: <Hotel size={16} />,
  other: <Tag size={16} />
};

export const NAV_ITEMS = [
  { id: 'schedule', label: '行程', icon: <Calendar size={20} /> },
  { id: 'bookings', label: '預訂', icon: <CreditCard size={20} /> },
  { id: 'expense', label: '記帳', icon: <Coins size={20} /> },
  { id: 'journal', label: '日誌', icon: <BookOpen size={20} /> },
  { id: 'planning', label: '準備', icon: <CheckSquare size={20} /> },
  { id: 'members', label: '成員', icon: <Users size={20} /> },
];

/**
 * 終極安全 JSON 解析函數 (v7.3.3)
 * 自動移除結尾逗號，防止 Unexpected token ] 錯誤
 */
export const tryParseJSON = (jsonString: string | null | undefined, fallback: any = null) => {
  if (!jsonString || typeof jsonString !== 'string') return fallback;
  let cleaned = jsonString.trim();
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) return fallback;
  // 修正結尾逗號
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  try {
    const result = JSON.parse(cleaned);
    return result === null ? fallback : result;
  } catch (e) {
    console.warn("[JSON Parse Error]", e);
    return fallback;
  }
};

export const safeJSONParse = (key: string, fallback: any) => {
  try {
    const item = localStorage.getItem(key);
    return tryParseJSON(item, fallback);
  } catch (e) {
    return fallback;
  }
};
