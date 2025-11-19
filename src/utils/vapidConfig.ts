import webpush from 'web-push'

/**
 * Configure web-push VAPID details with proper key formatting
 * Removes Base64 padding (=) characters that cause validation errors
 */
export function configureVapid() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
  const vapidEmail = (process.env.VAPID_EMAIL || 'admin@commitment-app.com').trim()

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured - push notifications will not work')
    return false
  }

  // Remove Base64 padding (=) characters - web-push library requires URL-safe base64 without padding
  const cleanPublicKey = vapidPublicKey.replace(/=/g, '')
  const cleanPrivateKey = vapidPrivateKey.replace(/=/g, '')
  const vapidSubject = `mailto:${vapidEmail}`

  try {
    webpush.setVapidDetails(vapidSubject, cleanPublicKey, cleanPrivateKey)
    return true
  } catch (error) {
    console.error('Failed to configure VAPID:', error)
    return false
  }
}
