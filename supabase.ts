import { createClient } from '@supabase/supabase-js';

/**
 * 🔑 配置導航圖：
 * ---------------------------------------------------------
 * 1. 齒輪圖示 (Settings) -> API
 * 2. Project URL => SUPABASE_URL (例如: https://abc.supabase.co)
 * 3. Project API keys -> 'anon / public' => SUPABASE_ANON_KEY
 * ---------------------------------------------------------
 */
const SUPABASE_URL = "https://czpkumvaiapqwuvsycgz.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6cGt1bXZhaWFwcXd1dnN5Y2d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NTk4NzYsImV4cCI6MjA4NTIzNTg3Nn0.JfhbSQVBI5ZwtMkTpY7jqSx-cOBUi-GqjaNWsry4DIQ";

// 自動檢測是否填寫
const isPlaceholder = 
  !SUPABASE_URL ||
  SUPABASE_URL.includes("your-project-url") || 
  !SUPABASE_URL.startsWith('https://') ||
  (SUPABASE_ANON_KEY as string) === "your-anon-key";

export const supabase = !isPlaceholder 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    })
  : null;

export const isSupabaseConfigured = !!supabase;

export const initSupabaseAuth = async () => {
  if (!supabase) return { id: 'demo-user', name: '狸克 (Demo)', isDemo: true };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return session.user;

    const { data, error } = await (supabase.auth as any).signInAnonymously();
    if (error) throw error;
    
    return data.user;
  } catch (error) {
    console.error("Supabase Auth 錯誤:", error);
    return { id: 'fallback-user', name: '旅人', isDemo: true };
  }
};