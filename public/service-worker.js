const CACHE_NAME = 'invoicy-v2'
const APP_PATH = '/invoicy/'
const INDEX_PATH = '/invoicy/index.html'
const ASSETS_PATH = '/invoicy/assets/'

// Service Workerのインストール
self.addEventListener('install', (event) => {
  // 更新版を待機状態にせず、旧キャッシュから早く切り替える
  event.waitUntil(self.skipWaiting())
})

// Service Workerのアクティベート
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('invoicy-') && cacheName !== CACHE_NAME) {
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((windowClients) => {
        // 古いindex.htmlで白画面になっているタブも一度だけ再読込する
        return Promise.all(
          windowClients.map((client) => client.navigate(client.url).catch(() => undefined))
        )
      })
  )
})

const fetchAndCache = async (request) => {
  const response = await fetch(request)

  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, response.clone())
  }

  return response
}

const networkFirst = async (request) => {
  try {
    return await fetchAndCache(request)
  } catch (error) {
    const cachedResponse = await caches.match(request)
      || await caches.match(APP_PATH)
      || await caches.match(INDEX_PATH)

    if (cachedResponse) {
      return cachedResponse
    }

    throw error
  }
}

const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request)
  return cachedResponse || fetchAndCache(request)
}

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)

  // Google APIなど別オリジンの通信には介入しない
  if (requestUrl.origin !== self.location.origin) {
    return
  }

  // HTMLは必ずネットワークを先に確認し、デプロイ後の最新版を取得する
  if (request.mode === 'navigate' || requestUrl.pathname === INDEX_PATH) {
    event.respondWith(networkFirst(request))
    return
  }

  // Viteのハッシュ付き静的ファイルはURLが変わるため、安全にキャッシュできる
  if (requestUrl.pathname.startsWith(ASSETS_PATH)) {
    event.respondWith(cacheFirst(request))
  }
})
