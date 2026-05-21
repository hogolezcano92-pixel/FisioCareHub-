/**
 * FisioCareHub Service Worker - PWA seguro
 *
 * Objetivo:
 * - Manter o app instalável como PWA.
 * - Não interferir nas imagens/vídeos do onboarding.
 * - Não cachear JS/CSS dinâmicos do Vite/Vercel.
 * - Não interceptar Supabase, Firebase, Stripe, Asaas ou APIs externas.
 * - Evitar erro: "text/html is not a valid JavaScript MIME type".
 */

const CACHE_NAME = 'fisiocarehub-pwa-safe-v1';

const STATIC_FILES = [
  '/manifest.webmanifest',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /**
   * Não interceptar nada externo:
   * Supabase Storage, Firebase, Stripe, Asaas, Google, APIs externas etc.
   */
  if (url.origin !== self.location.origin) return;

  /**
   * Não interceptar APIs internas.
   */
  if (url.pathname.startsWith('/api/')) return;

  /**
   * Não cachear arquivos dinâmicos gerados pelo Vite/Vercel.
   * Isso evita app quebrado após novo deploy.
   */
  if (url.pathname.startsWith('/assets/')) return;

  /**
   * Não cachear imagens, vídeos, fontes ou mídia.
   * Isso protege o onboarding e fundos visuais.
   */
  const isMediaOrFontFile = /\.(png|jpg|jpeg|webp|gif|svg|mp4|webm|mov|avi|m4v|woff|woff2|ttf|otf)$/i.test(
    url.pathname
  );

  if (isMediaOrFontFile) return;

  /**
   * Navegação SPA:
   * - tenta internet primeiro;
   * - se estiver offline, tenta abrir o index salvo.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put('/index.html', responseClone);
          });

          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );

    return;
  }

  /**
   * Cache seguro apenas para manifest e ícones.
   */
  const isSafeStaticFile = STATIC_FILES.includes(url.pathname);

  if (isSafeStaticFile) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((networkResponse) => {
          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return networkResponse;
        });
      })
    );
  }
});
