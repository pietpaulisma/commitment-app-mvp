'use client'

import { supabase } from '@/lib/supabase'

export interface NotificationSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export interface NotificationPreferences {
  chat_messages: boolean
  workout_completions: boolean
  system_messages: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
}

export class NotificationService {
  private static vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  
  static {
    console.log('🔍 NotificationService Debug:', {
      vapidKeyExists: !!this.vapidPublicKey,
      vapidKeyStart: this.vapidPublicKey.substring(0, 20),
      vapidKeyLength: this.vapidPublicKey.length,
      isNewKey: this.vapidPublicKey.startsWith('BPIHMJQrnNO_PAUBozL5jkkz3qjniK'),
      isOldKey: this.vapidPublicKey.startsWith('BOIUu2kxFhRD9dsliKGe'),
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * Check if push notifications are supported by the browser
   */
  static isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  }

  /**
   * Get current notification permission status
   */
  static getPermissionStatus(): NotificationPermission {
    return Notification.permission
  }

  /**
   * Request notification permission from user
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported by this browser')
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  /**
   * Subscribe user to push notifications
   */
  static async subscribe(userId: string): Promise<PushSubscription | null> {
    console.log('🔔 Starting notification subscription process for user:', userId)
    
    const isIOS = /iPhone|iPad/.test(navigator.userAgent)
    const isInPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true ||
                    document.referrer.includes('android-app://')
    
    console.log('📱 Device info:', {
      userAgent: navigator.userAgent,
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      isIOS: isIOS,
      isAndroid: /Android/.test(navigator.userAgent),
      platform: navigator.platform,
      isInPWA: isInPWA,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
      standalone: (window.navigator as any).standalone
    })
    
    // iOS PWA debugging
    if (isIOS) {
      console.log('🍎 iOS PWA Detection:', {
        isInPWA: isInPWA,
        notificationPermission: Notification.permission,
        serviceWorkerSupported: 'serviceWorker' in navigator
      })
      
      if (!isInPWA) {
        console.warn('⚠️ iOS notifications only work in installed PWA mode')
        throw new Error('On iOS, notifications only work when the app is installed to your home screen. Please add this app to your home screen first.')
      }
    }
    
    if (!this.isSupported()) {
      console.error('❌ Push notifications not supported by browser')
      throw new Error('Push notifications are not supported')
    }
    console.log('✅ Browser supports push notifications')

    if (Notification.permission !== 'granted') {
      console.log('🔐 Requesting notification permission...')
      const permission = await this.requestPermission()
      console.log('🔐 Permission result:', permission)
      if (permission !== 'granted') {
        throw new Error('Permission not granted for notifications')
      }
    }
    console.log('✅ Notification permission granted')

    try {
      console.log('🔧 Getting service worker registration...')
      const registration = await navigator.serviceWorker.ready
      console.log('✅ Service worker ready:', registration)
      
      // Check if already subscribed
      console.log('🔍 Checking existing subscription...')
      let subscription = await registration.pushManager.getSubscription()
      console.log('📋 Existing subscription:', subscription ? 'Found' : 'None')
      
      if (!subscription) {
        console.log('🔑 VAPID public key:', this.vapidPublicKey ? this.vapidPublicKey.substring(0, 20) + '...' : 'MISSING')
        if (!this.vapidPublicKey) {
          throw new Error('VAPID public key not configured')
        }
        
        // Create new subscription
        console.log('📝 Creating new push subscription...')
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        })
        console.log('✅ New subscription created:', subscription.endpoint)
      }

      if (subscription) {
        // Save subscription to database
        console.log('💾 Saving subscription to database...')
        await this.saveSubscription(userId, subscription)
        console.log('✅ Push notification subscription successful:', subscription.endpoint)
      }

      return subscription
    } catch (error) {
      console.error('❌ Error subscribing to push notifications:', error)
      throw error
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  static async unsubscribe(userId: string): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
        await this.removeSubscription(userId, subscription.endpoint)
        console.log('Successfully unsubscribed from push notifications')
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }

  /**
   * Save subscription to database
   */
  private static async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    console.log('💾 Converting subscription to JSON...')
    const subscriptionData = subscription.toJSON()
    console.log('📋 Subscription data keys:', Object.keys(subscriptionData))
    
    if (!subscriptionData.endpoint || !subscriptionData.keys?.p256dh || !subscriptionData.keys?.auth) {
      console.error('❌ Invalid subscription data:', subscriptionData)
      throw new Error('Invalid subscription data')
    }
    console.log('✅ Subscription data is valid')

    // Check if subscription already exists
    console.log('🔍 Checking if subscription already exists in database...')
    const { data: existingSub, error: checkError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', subscriptionData.endpoint)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing subscription:', checkError)
      throw checkError
    }

    if (existingSub) {
      console.log('✅ Subscription already exists in database')
      return
    }

    // Insert new subscription
    console.log('📝 Inserting new subscription into database...')
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: userId,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth
      })

    if (error) {
      console.error('❌ Error saving subscription to database:', error)
      console.error('Database error details:', error)
      throw error
    }
    console.log('✅ Subscription saved to database successfully')
  }

  /**
   * Remove subscription from database
   */
  private static async removeSubscription(userId: string, endpoint: string): Promise<void> {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    if (error) {
      console.error('Error removing subscription from database:', error)
      throw error
    }
  }

  /**
   * Get user's notification preferences
   */
  static async getPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching notification preferences:', error)
      throw error
    }

    // Return default preferences if none exist
    if (!data) {
      return {
        chat_messages: true,
        workout_completions: true,
        system_messages: true,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00'
      }
    }

    return {
      chat_messages: data.chat_messages,
      workout_completions: data.workout_completions,
      system_messages: data.system_messages !== undefined ? data.system_messages : true, // Default to true for existing users
      quiet_hours_enabled: data.quiet_hours_enabled,
      quiet_hours_start: data.quiet_hours_start,
      quiet_hours_end: data.quiet_hours_end
    }
  }

  /**
   * Update user's notification preferences
   */
  static async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      })

    if (error) {
      console.error('Error updating notification preferences:', error)
      throw error
    }
  }

  /**
   * Check if notifications should be sent during quiet hours
   */
  static shouldSendDuringQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours_enabled) {
      return true
    }

    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format

    const startTime = preferences.quiet_hours_start
    const endTime = preferences.quiet_hours_end

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime < startTime && currentTime > endTime
    }

    // Handle same-day quiet hours (e.g., 13:00 to 15:00)
    return currentTime < startTime || currentTime > endTime
  }

  /**
   * Send a notification to specific users
   */
  static async sendNotification(
    userIds: string[],
    title: string,
    body: string,
    data?: any,
    notificationType?: keyof NotificationPreferences
  ): Promise<void> {
    try {
      // Filter users based on their preferences
      const eligibleUserIds = await this.filterUsersByPreferences(userIds, notificationType)

      if (eligibleUserIds.length === 0) {
        console.log('No eligible users for notification')
        return
      }

      // Send to backend API route to handle the actual push
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: eligibleUserIds,
          title,
          body,
          data
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.statusText}`)
      }

      console.log(`Notification sent to ${eligibleUserIds.length} users`)
    } catch (error) {
      console.error('Error sending notification:', error)
      throw error
    }
  }

  /**
   * Filter users based on their notification preferences
   */
  private static async filterUsersByPreferences(
    userIds: string[], 
    notificationType?: keyof NotificationPreferences
  ): Promise<string[]> {
    if (!notificationType) {
      return userIds // No filtering if no type specified
    }

    try {
      const eligibleUsers: string[] = []

      for (const userId of userIds) {
        const preferences = await this.getPreferences(userId)
        
        // Check if user has this notification type enabled
        if (!preferences[notificationType]) {
          continue
        }

        // Check quiet hours
        if (!this.shouldSendDuringQuietHours(preferences)) {
          continue
        }

        eligibleUsers.push(userId)
      }

      return eligibleUsers
    } catch (error) {
      console.error('Error filtering users by preferences:', error)
      return userIds // Return all users if filtering fails
    }
  }

  /**
   * Utility function to convert VAPID key
   */
  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Test if user has any active subscriptions
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .limit(1)

      if (error) {
        console.error('Error checking subscription status:', error)
        return false
      }

      return data && data.length > 0
    } catch (error) {
      console.error('Error checking active subscription:', error)
      return false
    }
  }
}