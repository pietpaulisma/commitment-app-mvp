'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationService, NotificationPreferences } from '@/services/notificationService'

export interface NotificationState {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  preferences: NotificationPreferences | null
  loading: boolean
  error: string | null
}

export interface NotificationActions {
  requestPermission: () => Promise<boolean>
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<boolean>
  refreshStatus: () => Promise<void>
  clearError: () => void
}

export function useNotifications(): [NotificationState, NotificationActions] {
  const { user } = useAuth()
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    preferences: null,
    loading: true,
    error: null
  })

  // Initialize notification state
  useEffect(() => {
    if (user) {
      initializeNotifications()
    } else {
      setState(prev => ({
        ...prev,
        loading: false,
        isSubscribed: false,
        preferences: null
      }))
    }
  }, [user])

  const initializeNotifications = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const isSupported = NotificationService.isSupported()
      const permission = NotificationService.getPermissionStatus()
      
      let isSubscribed = false
      let preferences = null

      if (user && isSupported) {
        // Check subscription status
        isSubscribed = await NotificationService.hasActiveSubscription(user.id)
        
        // Load preferences
        preferences = await NotificationService.getPreferences(user.id)
      }

      setState({
        isSupported,
        permission,
        isSubscribed,
        preferences,
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error initializing notifications:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to initialize notifications'
      }))
    }
  }

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !user) {
      return false
    }

    try {
      setState(prev => ({ ...prev, error: null }))
      
      const permission = await NotificationService.requestPermission()
      
      setState(prev => ({ ...prev, permission }))
      
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting permission:', error)
      setState(prev => ({ ...prev, error: 'Failed to request notification permission' }))
      return false
    }
  }, [state.isSupported, user])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user || !state.isSupported) {
      return false
    }

    try {
      setState(prev => ({ ...prev, error: null }))
      
      const subscription = await NotificationService.subscribe(user.id)
      
      if (subscription) {
        setState(prev => ({ 
          ...prev, 
          isSubscribed: true,
          permission: 'granted'
        }))
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to subscribe to notifications'
      }))
      return false
    }
  }, [user, state.isSupported])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      return false
    }

    try {
      setState(prev => ({ ...prev, error: null }))
      
      const success = await NotificationService.unsubscribe(user.id)
      
      if (success) {
        setState(prev => ({ ...prev, isSubscribed: false }))
      }
      
      return success
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error)
      setState(prev => ({ ...prev, error: 'Failed to unsubscribe from notifications' }))
      return false
    }
  }, [user])

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>): Promise<boolean> => {
    if (!user || !state.preferences) {
      return false
    }

    try {
      setState(prev => ({ ...prev, error: null }))
      
      await NotificationService.updatePreferences(user.id, newPreferences)
      
      const updatedPreferences = { ...state.preferences, ...newPreferences }
      setState(prev => ({ ...prev, preferences: updatedPreferences }))
      
      return true
    } catch (error) {
      console.error('Error updating preferences:', error)
      setState(prev => ({ ...prev, error: 'Failed to update notification preferences' }))
      return false
    }
  }, [user, state.preferences])

  const refreshStatus = useCallback(async (): Promise<void> => {
    if (user) {
      await initializeNotifications()
    }
  }, [user])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const actions: NotificationActions = {
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
    refreshStatus,
    clearError
  }

  return [state, actions]
}

// Hook for sending notifications (for components that need to trigger notifications)
export function useSendNotification() {
  return useCallback(async (
    userIds: string[],
    title: string,
    body: string,
    data?: any,
    notificationType?: keyof NotificationPreferences
  ) => {
    try {
      await NotificationService.sendNotification(userIds, title, body, data, notificationType)
      return true
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }, [])
}

// Hook for checking if notifications should be sent (respects user preferences)
export function useNotificationPermissions() {
  const { user } = useAuth()
  
  return useCallback(async (notificationType: keyof NotificationPreferences): Promise<boolean> => {
    if (!user) return false
    
    try {
      const preferences = await NotificationService.getPreferences(user.id)
      
      // Check if this notification type is enabled
      if (!preferences[notificationType]) {
        return false
      }
      
      // Check quiet hours
      return NotificationService.shouldSendDuringQuietHours(preferences)
    } catch (error) {
      console.error('Error checking notification permissions:', error)
      return false
    }
  }, [user])
}