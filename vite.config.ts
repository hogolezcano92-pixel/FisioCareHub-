import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

// Simulação do __dirname para módulos ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    // Definimos a base como '/' para garantir que o Vercel ache os arquivos
    base: '/',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist', // Garante que a saída seja na pasta dist
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ui': ['lucide-react', 'motion', 'sonner', 'clsx', 'tailwind-merge'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas', 'docx', 'file-saver'],
            'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          }
        }
      }
    },
    optimizeDeps: {
      include: ['docx', 'file-saver', 'jspdf-autotable']
    },
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID),
    },
    resolve: {
      alias: {
        // Alterado para apontar para 'src', que é o padrão mais seguro
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
