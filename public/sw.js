const CACHE_NAME = 'commitment-app-v2'
const STATIC_CACHE = 'commitment-static-v2'
const RUNTIME_CACHE = 'commitment-runtime-v2'

const urlsToCache = [
  '/',
  '/dashboard',
  '/workout',
  '/targets',
  '/leaderboard', 
  '/profile',
  '/admin',
  '/login',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png'
]

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  self.skipWaiting() // Activate immediately
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(urlsToCache)),
      caches.open(RUNTIME_CACHE)
    ])
  )
})

// Activate service worker immediately and take control
self.addEventListener('activate', (event) => {
  self.clients.claim() // Take control immediately
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Advanced fetch strategy for better caching
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) return
  
  // Handle navigation requests (app pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version immediately, then fetch update in background
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, response.clone())
              })
            }
          }).catch(() => {}) // Silently fail background updates
          
          return cachedResponse
        }
        
        // No cache, try network
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        }).catch(() => {
          // Network failed, return offline fallback
          return caches.match('/dashboard')
        })
      })
    )
    return
  }
  
  // Handle API and other requests
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // For API calls, try network first, fallback to cache
        if (url.pathname.includes('/api/') || url.hostname.includes('supabase')) {
          return fetch(request).then((response) => {
            if (response.ok) {
              const responseClone = response.clone()
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseClone)
              })
            }
            return response
          }).catch(() => {
            return cachedResponse || new Response('Offline', { status: 503 })
          })
        }
        
        // For static assets, use cache-first strategy
        if (cachedResponse) {
          return cachedResponse
        }
        
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
      })
    )
  }
})