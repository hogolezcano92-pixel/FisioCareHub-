/* FisioCareHub Service Worker desativado temporariamente.
 * Objetivo:
 * - Parar de interferir nas imagens/vídeos do onboarding.
 * - Limpar caches antigos que podem estar quebrando arquivos JS, imagens ou CSS.
 * - Evitar erro "text/html is not a valid JavaScript MIME type".
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Não intercepta mais nenhuma requisição.
 * Assim o app volta a carregar tudo normalmente da internet:
 * imagens, vídeos, JS, CSS, Supabase Storage, Firebase, Vercel etc.
 */
self.addEventListener('fetch', () => {
  return;
});
