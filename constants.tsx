
import React from 'react';
import { 
  MapPin, 
  Utensils, 
  Plane, 
  Hotel, 
  Car, 
  Tag, 
  Circle, 
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
  { id: 'expense', label: '記帳', icon: <Circle size={20} /> },
  { id: 'journal', label: '日誌', icon: <BookOpen size={20} /> },
  { id: 'planning', label: '準備', icon: <CheckSquare size={20} /> },
  { id: 'members', label: '成員', icon: <Users size={20} /> },
];

export const MOCK_MEMBERS = [
  { id: '1', name: '狸克', avatar: 'https://picsum.photos/seed/nook/100/100' },
  { id: '2', name: '西施惠', avatar: 'https://picsum.photos/seed/isabelle/100/100' },
  { id: '3', name: '豆狸', avatar: 'https://picsum.photos/seed/timmy/100/100' },
];
