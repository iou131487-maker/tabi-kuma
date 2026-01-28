
export type Category = 'attraction' | 'food' | 'transport' | 'lodging' | 'other';

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location: string;
  category: Category;
  note?: string;
  date: string; // YYYY-MM-DD
}

export interface Booking {
  id: string;
  type: 'flight' | 'hotel' | 'car' | 'ticket';
  title: string;
  details: any;
  isLocked: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  payer: string;
  description: string;
  date: string;
}

export interface JournalEntry {
  id: string;
  author: string;
  content: string;
  images: string[];
  date: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  assignedTo?: string;
  type: 'todo' | 'packing' | 'shopping';
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
}
