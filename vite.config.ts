
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 確保構建時能正確替換環境變數，避免 'process is not defined' 錯誤
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
  },
  resolve: {
    alias: {
      // 將模組名稱映射到 CDN URL，Vite 會自動將 URL 視為 external
      'react': 'https://esm.sh/react@19.0.0',
      'react-dom': 'https://esm.sh/react-dom@19.0.0',
      'react-dom/client': 'https://esm.sh/react-dom@19.0.0/client',
      'react/jsx-runtime': 'https://esm.sh/react@19.0.0/jsx-runtime',
      'lucide-react': 'https://esm.sh/lucide-react@0.475.0?external=react',
      // Downgrade react-router-dom to v6.28.0 for stability and guaranteed named exports
      'react-router-dom': 'https://esm.sh/react-router-dom@6.28.0?external=react,react-dom',
      '@supabase/supabase-js': 'https://esm.sh/@supabase/supabase-js@2.45.4',
      '@google/genai': 'https://esm.sh/@google/genai@1.3.0',
      'firebase/app': 'https://esm.sh/firebase@11.1.0/app',
      'firebase/auth': 'https://esm.sh/firebase@11.1.0/auth',
      'firebase/firestore': 'https://esm.sh/firebase@11.1.0/firestore',
      'firebase/storage': 'https://esm.sh/firebase@11.1.0/storage'
    }
  },
  build: {
    rollupOptions: {
      // 雖然 alias 已經處理了大部分，但仍顯式標記 external 以保險
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'lucide-react',
        'react-router-dom',
        '@google/genai',
        '@supabase/supabase-js',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage'
      ],
      output: {
        format: 'es'
      }
    }
  }
});
