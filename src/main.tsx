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
 * Correção segura para restaurar as imagens/vídeos de fundo do onboarding.
 *
 * O service worker antigo estava interceptando arquivos estáticos do próprio app
 * e podia manter imagens/vídeos/chunks antigos em cache, principalmente no iPhone.
 * Por isso, neste momento deixamos o app SEM PWA/cache ativo.
 *
 * Resultado:
 * - onboarding volta a carregar imagens e vídeos direto da rede, como antes;
 * - remove service workers antigos;
 * - limpa caches antigos;
 * - evita o erro de MIME type causado por cache antigo entregando HTML como JS.
 */
async function cleanupServiceWorkersAndCaches() {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();

      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName)),
      );
    }

    const alreadyReloaded = sessionStorage.getItem(
      'fisiocarehub-pwa-cache-cleaned-v2',
    );

    if (!alreadyReloaded) {
      sessionStorage.setItem('fisiocarehub-pwa-cache-cleaned-v2', 'true');
      window.location.reload();
    }
  } catch (error) {
    console.warn('[FisioCareHub] Falha ao limpar PWA/cache antigo:', error);
  }
}

cleanupServiceWorkersAndCaches();
