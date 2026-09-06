/* FitFlow 离线缓存：静态资源缓存优先，页面导航网络优先 */
const CACHE = 'fitflow-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // 带内容哈希的静态资源：缓存优先
  if (url.pathname.includes('/_next/static/')) {
    event.respondWith(cacheFirst(req))
    return
  }
  // 页面导航：网络优先，离线回退缓存
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req))
  }
})

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  const res = await fetch(req)
  if (res.ok) put(req, res.clone())
  return res
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok) put(req, res.clone())
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    return Response.error()
  }
}

async function put(req, res) {
  const cache = await caches.open(CACHE)
  await cache.put(req, res)
}
