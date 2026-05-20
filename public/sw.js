/* FisioCareHub Service Worker
 * Corrige falhas de cache/PWA quando a internet cai ou quando um deploy novo
 * deixa o app com chunks antigos em cache.
 */

const CACHE_NAME = 'fisiocarehub-runtime-v2026-05-20-2';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json'
];

const isOk = (response) => response && response.ok;

const getContentType = (response) => {
  return response && response.headers
    ? response.headers.get('content-type') || ''
    : '';
};

const isHtml = (response) => {
  return getContentType(response).includes('text/html');
};

const isJavaScript = (response) => {
  const contentType = getContentType(response);
  return (
    contentType.includes('javascript') ||
    contentType.includes('ecmascript')
  );
};

const isCss = (response) => {
  return getContentType(response).includes('text/css');
};

const isJson = (response) => {
  return getContentType(response).includes('application/json');
};

async function safeCachePut(request, response) {
  if (!isOk(response)) return;

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

async function networkFirst(request, validator) {
  const cachedResponse = await caches.match(request);

  try {
    const response = await fetch(request);

    if (validator && !validator(response)) {
      if (cachedResponse) return cachedResponse;
      return response;
    }

    await safeCachePut(request, response);
    return response;
  } catch (error) {
    if (cachedResponse) return cachedResponse;
    throw error;
  }
}

async function cacheFirst(request, validator) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (!validator || validator(response)) {
    await safeCachePut(request, response);
  }

  return response;
}

function createOfflineHtmlResponse() {
  return new Response(
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FisioCareHub offline</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0b1120;
        color: #ffffff;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 24px;
        text-align: center;
      }

      .card {
        width: 100%;
        max-width: 420px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 32px;
        padding: 32px;
        background: rgba(15, 23, 42, 0.82);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
      }

      .icon {
        width: 72px;
        height: 72px;
        border-radius: 999px;
        margin: 0 auto 20px;
        display: grid;
        place-items: center;
        background: rgba(37, 99, 235, 0.14);
        color: #3b82f6;
        font-size: 36px;
        font-weight: 900;
      }

      h1 {
        font-size: 28px;
        margin: 0 0 12px;
        font-weight: 900;
      }

      p {
        color: #cbd5e1;
        font-size: 16px;
        line-height: 1.5;
        margin: 0;
      }

      button {
        margin-top: 24px;
        border: 0;
        border-radius: 999px;
        background: #2563eb;
        color: #ffffff;
        padding: 16px 24px;
        font-weight: 900;
        font-size: 16px;
        cursor: pointer;
      }
    </style>
  </head>

  <body>
    <div class="card">
      <div class="icon">!</div>
      <h1>Sem conexão</h1>
      <p>A internet caiu ou está instável. Confira sua conexão e tente recarregar o FisioCareHub.</p>
      <button onclick="location.reload()">Recarregar aplicativo</button>
    </div>
  </body>
</html>`,
    {
      headers: {
        'content-type': 'text/html; charset=utf-8'
      }
    }
  );
}

function createOfflineJavaScriptResponse() {
  return new Response(
    'console.warn("FisioCareHub offline: arquivo JavaScript indisponível no momento.");',
    {
      headers: {
        'content-type': 'application/javascript; charset=utf-8'
      }
    }
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.all(
          APP_SHELL.map((url) => {
            return cache.add(url).catch(() => null);
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, (response) => isOk(response) && isHtml(response))
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html');
          return cachedIndex || createOfflineHtmlResponse();
        })
    );
    return;
  }

  if (request.destination === 'script' || request.destination === 'worker') {
    event.respondWith(
      networkFirst(request, (response) => isOk(response) && isJavaScript(response))
        .catch(() => createOfflineJavaScriptResponse())
    );
    return;
  }

  if (request.destination === 'style') {
    event.respondWith(
      networkFirst(request, (response) => isOk(response) && isCss(response))
        .catch(async () => {
          const cachedStyle = await caches.match(request);
          return cachedStyle || new Response('', {
            headers: {
              'content-type': 'text/css; charset=utf-8'
            }
          });
        })
    );
    return;
  }

  if (
    request.destination === '' &&
    (url.pathname.endsWith('.json') || url.pathname.includes('/locales/'))
  ) {
    event.respondWith(
      networkFirst(request, (response) => isOk(response) && isJson(response))
        .catch(async () => {
          const cachedJson = await caches.match(request);
          return cachedJson || new Response('{}', {
            headers: {
              'content-type': 'application/json; charset=utf-8'
            }
          });
        })
    );
    return;
  }

  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'manifest'
  ) {
    event.respondWith(
      cacheFirst(request, (response) => isOk(response))
    );
    return;
  }

  event.respondWith(
    networkFirst(request, (response) => isOk(response))
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        return cachedResponse || createOfflineHtmlResponse();
      })
  );
});
