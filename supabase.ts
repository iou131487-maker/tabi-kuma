
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czpkumvaiapqwuvsycgz.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6cGt1bXZhaWFwcXd1dnN5Y2d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NTk4NzYsImV4cCI6MjA4NTIzNTg3Nn0.JfhbSQVBI5ZwtMkTpY7jqSx-cOBUi-GqjaNWsry4DIQ";

const isPlaceholder = 
  !SUPABASE_URL ||
  SUPABASE_URL.includes("your-project-url") || 
  !SUPABASE_URL.startsWith('https://') ||
  (SUPABASE_ANON_KEY as string) === "your-anon-key";

export const supabase = !isPlaceholder 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: { 
        fetch: (input: RequestInfo | URL, init?: RequestInit) => 
          fetch(input, init).catch(err => {
            console.warn("Supabase Network Failure:", (err as any).message);
            throw err;
          })
      }
    })
  : null;

export const isSupabaseConfigured = !!supabase;

export const initSupabaseAuth = async () => {
  if (!supabase) return { id: 'demo-user', name: '狸克 (Demo)', isDemo: true };

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (session?.user) return session.user;

    const { data, error } = await (supabase.auth as any).signInAnonymously();
    if (error) throw error;
    
    return data.user;
  } catch (error) {
    console.warn("Supabase Auth 連結失敗，轉入純離線模式:", error);
    return { id: 'offline-user', name: '離線旅人', isOffline: true };
  }
};
