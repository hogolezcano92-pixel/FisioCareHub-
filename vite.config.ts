import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],

    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        // 🔥 ESSENCIAL: impedir o Vite de tentar resolver WebAuthn no build
        external: ['@simplewebauthn/browser'],

        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ui': ['lucide-react', 'motion', 'sonner', 'clsx', 'tailwind-merge'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas', 'docx', 'file-saver'],
            'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],

            // ❌ REMOVIDO: isso quebrava o build
            // 'vendor-auth': ['@simplewebauthn/browser'],
          }
        }
      }
    },

    optimizeDeps: {
      include: ['docx', 'file-saver', 'jspdf-autotable'],

      // 🔥 ESSENCIAL: não pré-bundlar WebAuthn
      exclude: ['@simplewebauthn/browser'],
    },

    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      // HMR controlado por env
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
