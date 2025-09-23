'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationService, NotificationPreferences } from '@/services/notificationService'
import { Button } from './ui/button'
import { 
  BellIcon, 
  BellSlashIcon, 
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  StarIcon,
  MoonIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface NotificationSettingsProps {
  onClose?: () => void
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    chat_messages: true,
    workout_completions: true,
    system_messages: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')
  const [error, setError] = useState<string | null>(null)
  const [testingNotification, setTestingNotification] = useState(false)

  useEffect(() => {
    if (user) {
      loadPreferences()
      checkNotificationStatus()
    }
  }, [user])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      if (!user) return

      const userPreferences = await NotificationService.getPreferences(user.id)
      setPreferences(userPreferences)
    } catch (error) {
      console.error('Error loading notification preferences:', error)
      setError('Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const checkNotificationStatus = async () => {
    if (!NotificationService.isSupported()) {
      setError('Push notifications are not supported by your browser')
      return
    }

    try {
      const permission = NotificationService.getPermissionStatus()
      setPermissionStatus(permission)

      if (user) {
        const hasSubscription = await NotificationService.hasActiveSubscription(user.id)
        setIsSubscribed(hasSubscription)
      }
    } catch (error) {
      console.error('Error checking notification status:', error)
    }
  }

  const handleEnableNotifications = async () => {
    if (!user) return

    try {
      setSaving(true)
      setError(null)
      console.log('🔄 Starting notification enable process...')

      const subscription = await NotificationService.subscribe(user.id)
      if (subscription) {
        setIsSubscribed(true)
        setPermissionStatus('granted')
        console.log('✅ UI state updated: notifications enabled')
        
        // Force a small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 100))
      } else {
        throw new Error('Failed to create subscription')
      }
    } catch (error) {
      console.error('❌ Error enabling notifications:', error)
      setError(`Failed to enable notifications: ${error instanceof Error ? error.message : error}`)
    } finally {
      setSaving(false)
      console.log('🔄 Enable process completed, saving state reset')
    }
  }

  const handleDisableNotifications = async () => {
    if (!user) return

    try {
      setSaving(true)
      const success = await NotificationService.unsubscribe(user.id)
      if (success) {
        setIsSubscribed(false)
      }
    } catch (error) {
      console.error('Error disabling notifications:', error)
      setError('Failed to disable notifications')
    } finally {
      setSaving(false)
    }
  }

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!user) return

    try {
      const updatedPreferences = { ...preferences, [key]: value }
      setPreferences(updatedPreferences)

      await NotificationService.updatePreferences(user.id, { [key]: value })
    } catch (error) {
      console.error('Error updating preference:', error)
      setError('Failed to update preference')
      // Revert the change
      loadPreferences()
    }
  }

  const handleSavePreferences = async () => {
    if (!user) return

    try {
      setSaving(true)
      setError(null)

      await NotificationService.updatePreferences(user.id, preferences)
      
      // Show success feedback
      const successDiv = document.createElement('div')
      successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white p-3 rounded-lg z-50'
      successDiv.textContent = 'Preferences saved!'
      document.body.appendChild(successDiv)
      
      setTimeout(() => {
        document.body.removeChild(successDiv)
      }, 3000)
    } catch (error) {
      console.error('Error saving preferences:', error)
      setError('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotification = async () => {
    if (!user || !isSubscribed) return

    try {
      setTestingNotification(true)
      setError(null)
      console.log('🧪 Sending test notification...')

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: [user.id],
          title: '🧪 Test Notification',
          body: 'This is a test notification! If you see this, push notifications are working correctly.',
          data: {
            type: 'test',
            timestamp: Date.now()
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to send test notification: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Test notification result:', result)

      if (result.sent > 0) {
        // Show success feedback
        const successDiv = document.createElement('div')
        successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg z-50 shadow-lg'
        successDiv.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="text-2xl">✅</div>
            <div>
              <div class="font-medium">Test notification sent!</div>
              <div class="text-sm opacity-90">Check if it appeared on your device</div>
            </div>
          </div>
        `
        document.body.appendChild(successDiv)
        
        setTimeout(() => {
          if (document.body.contains(successDiv)) {
            document.body.removeChild(successDiv)
          }
        }, 5000)
      } else {
        throw new Error('No notifications were sent - check console for details')
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error)
      setError(`Failed to send test notification: ${error instanceof Error ? error.message : error}`)
    } finally {
      setTestingNotification(false)
    }
  }

  const getNotificationStatusIcon = () => {
    if (permissionStatus === 'granted' && isSubscribed) {
      return <CheckCircleIcon className="w-6 h-6 text-green-400" />
    } else if (permissionStatus === 'denied') {
      return <XCircleIcon className="w-6 h-6 text-red-400" />
    } else {
      return <BellSlashIcon className="w-6 h-6 text-gray-400" />
    }
  }

  const getNotificationStatusText = () => {
    if (permissionStatus === 'granted' && isSubscribed) {
      return 'Notifications enabled'
    } else if (permissionStatus === 'denied') {
      return 'Notifications blocked - Please enable in browser settings'
    } else if (permissionStatus === 'granted' && !isSubscribed) {
      return 'Notifications permission granted but not subscribed'
    } else {
      return 'Notifications disabled'
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 max-w-md mx-auto">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 max-w-md mx-auto text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BellIcon className="w-6 h-6" />
          Notification Settings
        </h2>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XCircleIcon className="w-5 h-5" />
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Notification Status */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          {getNotificationStatusIcon()}
          <div>
            <h3 className="font-medium text-white">Push Notifications</h3>
            <p className="text-sm text-gray-400">{getNotificationStatusText()}</p>
          </div>
        </div>
        
        {permissionStatus !== 'granted' || !isSubscribed ? (
          <Button
            onClick={handleEnableNotifications}
            disabled={saving || permissionStatus === 'denied'}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? 'Enabling...' : 'Enable Notifications'}
          </Button>
        ) : (
          <div className="space-y-3">
            <Button
              onClick={handleDisableNotifications}
              disabled={saving}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              {saving ? 'Disabling...' : 'Disable Notifications'}
            </Button>
            
            <Button
              onClick={handleTestNotification}
              disabled={testingNotification || saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {testingNotification ? 'Sending Test...' : '🧪 Send Test Notification'}
            </Button>
          </div>
        )}
      </div>

      {/* Notification Types */}
      {isSubscribed && (
        <div className="space-y-4 mb-6">
          <h3 className="font-medium text-white mb-3">Notification Types</h3>
          
          {/* Chat Messages */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium text-white">Chat Messages</p>
                <p className="text-xs text-gray-400">When someone sends a message</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.chat_messages}
                onChange={(e) => handlePreferenceChange('chat_messages', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Workout Completions */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <TrophyIcon className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="font-medium text-white">Workout Completions</p>
                <p className="text-xs text-gray-400">When members finish workouts</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.workout_completions}
                onChange={(e) => handlePreferenceChange('workout_completions', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
            </label>
          </div>

          {/* System Messages */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <StarIcon className="w-5 h-5 text-purple-400" />
              <div>
                <p className="font-medium text-white">System Messages</p>
                <p className="text-xs text-gray-400">Daily summaries, challenges, and updates</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.system_messages}
                onChange={(e) => handlePreferenceChange('system_messages', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* Quiet Hours */}
      {isSubscribed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              <MoonIcon className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="font-medium text-white">Quiet Hours</p>
                <p className="text-xs text-gray-400">Pause notifications during these hours</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.quiet_hours_enabled}
                onChange={(e) => handlePreferenceChange('quiet_hours_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="p-3 bg-gray-800 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_start}
                    onChange={(e) => handlePreferenceChange('quiet_hours_start', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={preferences.quiet_hours_end}
                    onChange={(e) => handlePreferenceChange('quiet_hours_end', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                No notifications will be sent between {preferences.quiet_hours_start} and {preferences.quiet_hours_end}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      {isSubscribed && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <Button
            onClick={handleSavePreferences}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      )}

      {/* Browser Settings Help */}
      {permissionStatus === 'denied' && (
        <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm mb-2 font-medium">Need to enable notifications?</p>
          <p className="text-yellow-300 text-xs">
            1. Click the lock icon in your address bar<br/>
            2. Change notifications from "Block" to "Allow"<br/>
            3. Reload the page and try again
          </p>
        </div>
      )}
    </div>
  )
}