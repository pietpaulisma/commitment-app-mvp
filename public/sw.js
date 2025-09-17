const CACHE_NAME = 'commitment-app-v5'
const STATIC_CACHE = 'commitment-static-v5'
const RUNTIME_CACHE = 'commitment-runtime-v5'

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
  // Don't skipWaiting - let it activate naturally to avoid page refreshes
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(urlsToCache)),
      caches.open(RUNTIME_CACHE)
    ])
  )
})

// Activate service worker and clean old caches
self.addEventListener('activate', (event) => {
  // Don't claim immediately - this can cause page refreshes
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
  
  // Handle navigation requests (app pages) - simplified for PWA reliability
  if (request.mode === 'navigate') {
    event.respondWith(
      // Network-first strategy for all navigation (simpler, more predictable)
      fetch(request).then((response) => {
        if (response.ok) {
          // Cache successful responses
          const responseClone = response.clone()
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        }
        // Network response not ok, try cache
        return caches.match(request) || caches.match('/')
      }).catch(() => {
        // Network error, try cache first, then fallback to root
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          // No cached version, return root page for auth handling
          return caches.match('/') || new Response(
            '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>Offline</h1><p>Please check your connection and try again.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          )
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

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('Push event received:', event)

  if (!event.data) {
    console.log('Push event has no data')
    return
  }

  try {
    const data = event.data.json()
    console.log('Push data:', data)

    const title = data.title || 'Commitment App'
    const options = {
      body: data.body || 'New notification',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      image: data.image,
      data: data.data || {},
      tag: data.tag || 'general',
      renotify: true,
      requireInteraction: data.requireInteraction || false,
      actions: generateActions(data),
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
      silent: false
    }

    // Show notification with app-specific styling
    event.waitUntil(
      self.registration.showNotification(title, options)
    )
  } catch (error) {
    console.error('Error handling push event:', error)
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Commitment App', {
        body: 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'fallback'
      })
    )
  }
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)

  const notification = event.notification
  const data = notification.data || {}
  
  // Close the notification
  notification.close()

  // Handle action clicks
  if (event.action) {
    handleNotificationAction(event.action, data)
    return
  }

  // Default click behavior - open the app
  const urlToOpen = getUrlFromNotification(data)
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        const clientUrl = new URL(client.url)
        
        if (clientUrl.origin === location.origin) {
          // App is already open, focus it and navigate if needed
          if (urlToOpen && urlToOpen !== '/') {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: urlToOpen,
              data: data
            })
          }
          return client.focus()
        }
      }
      
      // App is not open, open it
      return clients.openWindow(urlToOpen)
    })
  )
})

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag)
  
  // Track notification close events if needed
  const data = event.notification.data || {}
  if (data.trackClose) {
    // Could send analytics or update read status
    console.log('Tracking notification close for:', data.type)
  }
})

// Helper function to generate notification actions based on type
function generateActions(data) {
  const actions = []
  
  if (data.type === 'chat_message') {
    actions.push(
      { action: 'reply', title: '💬 Reply', icon: '/icon-192.png' },
      { action: 'view_chat', title: '👥 Open Chat', icon: '/icon-192.png' }
    )
  } else if (data.type === 'workout_completion') {
    actions.push(
      { action: 'view_workout', title: '🏋️ View Workout', icon: '/icon-192.png' },
      { action: 'add_reaction', title: '👏 React', icon: '/icon-192.png' }
    )
  } else if (data.type === 'group_achievement') {
    actions.push(
      { action: 'view_dashboard', title: '📊 View Dashboard', icon: '/icon-192.png' }
    )
  }
  
  return actions.slice(0, 2) // Maximum 2 actions on most platforms
}

// Helper function to determine URL from notification data
function getUrlFromNotification(data) {
  switch (data.type) {
    case 'chat_message':
      return '/dashboard' // Chat opens within dashboard
    case 'workout_completion':
      return '/dashboard' // Workout summaries are in dashboard/chat
    case 'group_achievement':
      return '/dashboard'
    case 'penalty':
      return '/dashboard'
    default:
      return '/dashboard'
  }
}

// Handle notification action clicks
function handleNotificationAction(action, data) {
  console.log('Notification action clicked:', action, data)
  
  switch (action) {
    case 'reply':
      // Open chat with reply context
      clients.openWindow('/dashboard').then((client) => {
        if (client) {
          client.postMessage({
            type: 'OPEN_CHAT_REPLY',
            messageId: data.messageId,
            groupId: data.groupId
          })
        }
      })
      break
      
    case 'view_chat':
      clients.openWindow('/dashboard').then((client) => {
        if (client) {
          client.postMessage({
            type: 'OPEN_CHAT',
            groupId: data.groupId
          })
        }
      })
      break
      
    case 'view_workout':
      clients.openWindow('/dashboard').then((client) => {
        if (client) {
          client.postMessage({
            type: 'VIEW_WORKOUT_SUMMARY',
            workoutId: data.workoutId,
            userId: data.userId
          })
        }
      })
      break
      
    case 'add_reaction':
      // Could open a quick reaction interface or auto-add a default reaction
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].postMessage({
            type: 'ADD_WORKOUT_REACTION',
            workoutId: data.workoutId,
            reaction: '👏'
          })
        }
      })
      break
      
    case 'view_dashboard':
      clients.openWindow('/dashboard')
      break
      
    default:
      console.log('Unknown notification action:', action)
  }
}

// Background sync for offline notification handling
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag)
  
  if (event.tag === 'notification-queue') {
    event.waitUntil(processNotificationQueue())
  }
})

// Process queued notifications when back online
async function processNotificationQueue() {
  try {
    // Get queued notifications from IndexedDB or cache
    const queuedNotifications = await getQueuedNotifications()
    
    for (const notification of queuedNotifications) {
      await self.registration.showNotification(notification.title, notification.options)
      await removeFromQueue(notification.id)
    }
    
    console.log(`Processed ${queuedNotifications.length} queued notifications`)
  } catch (error) {
    console.error('Error processing notification queue:', error)
  }
}

// Helper functions for notification queue management
async function getQueuedNotifications() {
  // Implement IndexedDB or cache storage for offline notifications
  return []
}

async function removeFromQueue(notificationId) {
  // Remove processed notification from queue
  console.log('Removing notification from queue:', notificationId)
}