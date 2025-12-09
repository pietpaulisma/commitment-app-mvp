'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationService, NotificationPreferences } from '@/services/notificationService'
import { Button } from './ui/button'
import {
  Bell,
  BellOff,
  MessageCircle,
  Trophy,
  Star,
  Moon,
  CheckCircle,
  XCircle,
  X,
  Loader2
} from 'lucide-react'
import { GlassCard } from './dashboard/v2/GlassCard'
import { CardHeader } from './dashboard/v2/CardHeader'

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
      return <CheckCircle className="w-6 h-6 text-green-400" />
    } else if (permissionStatus === 'denied') {
      return <XCircle className="w-6 h-6 text-red-400" />
    } else {
      return <BellOff className="w-6 h-6 text-gray-400" />
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
      <GlassCard className="w-full max-w-md mx-auto">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-zinc-500 animate-spin mb-4" />
          <span className="text-zinc-500 text-sm">Loading settings...</span>
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto relative">
      <GlassCard noPadding className="w-full overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-black italic tracking-tighter text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-zinc-400" />
            NOTIFICATION SETTINGS
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Notification Status */}
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              {getNotificationStatusIcon()}
              <div>
                <h3 className="font-bold text-white text-sm">Push Notifications</h3>
                <p className="text-xs text-zinc-500">{getNotificationStatusText()}</p>
              </div>
            </div>

            {permissionStatus !== 'granted' || !isSubscribed ? (
              <Button
                onClick={handleEnableNotifications}
                disabled={saving || permissionStatus === 'denied'}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold"
              >
                {saving ? 'Enabling...' : 'Enable Notifications'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleTestNotification}
                    disabled={testingNotification || saving}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    {testingNotification ? 'Sending...' : 'Test Notification'}
                  </Button>
                  <Button
                    onClick={handleDisableNotifications}
                    disabled={saving}
                    variant="outline"
                    className="bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 font-bold text-xs"
                  >
                    {saving ? 'Disabling...' : 'Disable'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Notification Types */}
          {isSubscribed && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Notification Types</h3>

              <div className="space-y-2">
                <ToggleOption
                  icon={MessageCircle}
                  iconColor="text-blue-400"
                  title="Chat Messages"
                  description="When someone sends a message"
                  checked={preferences.chat_messages}
                  onChange={(val) => handlePreferenceChange('chat_messages', val)}
                />
                <ToggleOption
                  icon={Trophy}
                  iconColor="text-yellow-400"
                  title="Workout Completions"
                  description="When members finish workouts"
                  checked={preferences.workout_completions}
                  onChange={(val) => handlePreferenceChange('workout_completions', val)}
                />
                <ToggleOption
                  icon={Star}
                  iconColor="text-purple-400"
                  title="System Messages"
                  description="Daily summaries and updates"
                  checked={preferences.system_messages}
                  onChange={(val) => handlePreferenceChange('system_messages', val)}
                />
              </div>
            </div>
          )}

          {/* Quiet Hours */}
          {isSubscribed && (
            <div className="space-y-4">
              <ToggleOption
                icon={Moon}
                iconColor="text-indigo-400"
                title="Quiet Hours"
                description="Pause notifications during these hours"
                checked={preferences.quiet_hours_enabled}
                onChange={(val) => handlePreferenceChange('quiet_hours_enabled', val)}
              />

              {preferences.quiet_hours_enabled && (
                <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase">Start Time</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_start}
                      onChange={(e) => handlePreferenceChange('quiet_hours_start', e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase">End Time</label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_end}
                      onChange={(e) => handlePreferenceChange('quiet_hours_end', e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          {isSubscribed && (
            <div className="pt-2">
              <Button
                onClick={handleSavePreferences}
                disabled={saving}
                className="w-full bg-white text-black hover:bg-zinc-200 font-black h-12 rounded-xl"
              >
                {saving ? 'SAVING...' : 'SAVE PREFERENCES'}
              </Button>
            </div>
          )}

          {/* Browser Settings Help */}
          {permissionStatus === 'denied' && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-yellow-400 text-sm mb-2 font-bold">Need to enable notifications?</p>
              <p className="text-yellow-500/80 text-xs leading-relaxed">
                1. Click the lock icon in your address bar<br />
                2. Change notifications from "Block" to "Allow"<br />
                3. Reload the page and try again
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  )
}

function ToggleOption({ icon: Icon, iconColor, title, description, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <div>
          <p className="font-bold text-sm text-white">{title}</p>
          <p className="text-[10px] text-zinc-500">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 ${checked ? 'bg-green-500' : 'bg-zinc-700'
          }`}
      >
        <div
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
      </button>
    </div>
  )
}