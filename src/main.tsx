import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root não encontrado.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * FisioCareHub
 *
 * Registro seguro do PWA.
 *
 * Importante:
 * - O sw.js novo NÃO deve cachear imagens/vídeos do onboarding.
 * - O sw.js novo NÃO deve cachear /assets/*.js e /assets/*.css.
 * - O sw.js novo NÃO deve interceptar Supabase, Firebase, Stripe, Asaas ou APIs externas.
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log(
          '[FisioCareHub] PWA registrado com segurança:',
          registration.scope,
        );
      })
      .catch((error) => {
        console.warn('[FisioCareHub] Falha ao registrar PWA:', error);
      });
  });
}
