'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Settings,
  Users,
  ClipboardList,
  Sliders,
  LogOut,
  X,
  Sparkles,
  Bell,
  Heart,
  Play,
  Zap,
  ChevronRight,
  ShieldCheck,
  Bug,
  Dumbbell
} from 'lucide-react'
import { SystemMessageConfigAdmin } from './SystemMessageConfigAdmin'
import NotificationSettings from './NotificationSettings'
import { PenaltyResponseModal } from './modals/PenaltyResponseModal'
import { GroupMembersSection } from './settings/GroupMembersSection'
import { PotManagementSection } from './settings/PotManagementSection'
import { GroupSettingsSection } from './settings/GroupSettingsSection'
import { ChatSettingsSection } from './settings/ChatSettingsSection'
import { supabase } from '@/lib/supabase'
import packageJson from '../../package.json'
import { GlassCard } from './dashboard/v2/GlassCard'
import { CardHeader } from './dashboard/v2/CardHeader'
import { COLORS } from '@/utils/colors'
import { SystemMessageService } from '@/services/systemMessages'

export default function NewMobileProfile() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const [showSystemMessageConfig, setShowSystemMessageConfig] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showTestPenaltyModal, setShowTestPenaltyModal] = useState(false)
  const [isSickMode, setIsSickMode] = useState(false)
  const [isUpdatingSickMode, setIsUpdatingSickMode] = useState(false)
  const [isRunningCheck, setIsRunningCheck] = useState(false)

  // Group admin state
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [potMembers, setPotMembers] = useState<any[]>([])
  const [groupSettings, setGroupSettings] = useState<any>(null)
  const [systemSenderName, setSystemSenderName] = useState('Barry')
  const [groupDataLoading, setGroupDataLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Load sick mode state from profile
  useEffect(() => {
    if (profile) {
      // Cast to any to access is_sick_mode if it's not on the type yet
      setIsSickMode((profile as any).is_sick_mode || false)
    }
  }, [profile])

  // Cleanup effect to prevent state corruption when navigating away
  useEffect(() => {
    return () => {
      setShowSystemMessageConfig(false)
      setShowNotificationSettings(false)
      setShowTestPenaltyModal(false)
    }
  }, [])

  // Toggle sick mode function
  const toggleSickMode = async () => {
    if (!user || isUpdatingSickMode) return

    setIsUpdatingSickMode(true)
    try {
      const newSickMode = !isSickMode

      const { error } = await supabase
        .from('profiles')
        .update({ is_sick_mode: newSickMode })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating sick mode:', error)
        return
      }

      setIsSickMode(newSickMode)
    } catch (error) {
      console.error('Error toggling sick mode:', error)
    } finally {
      setIsUpdatingSickMode(false)
    }
  }

  const runPenaltyCheck = async () => {
    if (!profile?.group_id || isRunningCheck) return

    if (!confirm('Run yesterday\'s penalty check for all members? This will check who missed their targets and post a summary to the group chat.')) {
      return
    }

    setIsRunningCheck(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Session expired. Please refresh and try again.')
        return
      }

      const response = await fetch('/api/admin/send-daily-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error Response:', error)
        const details = typeof error.details === 'object' ? JSON.stringify(error.details, null, 2) : error.details
        const errorMsg = details ? `${error.error}:\n${details}` : (error.error || 'Failed to send daily summary')
        throw new Error(errorMsg)
      }

      const result = await response.json()

      alert(`✅ Daily summary sent!\n\n` +
        `Total members: ${result.stats.totalMembers}\n` +
        `Completed: ${result.stats.completed}\n` +
        `To be confirmed: ${result.stats.toBeConfirmed}\n` +
        `Pending response: ${result.stats.pending}\n` +
        `Auto-accepted expired: ${result.stats.autoAccepted}\n` +
        `Notifications sent: ${result.stats.notificationsSent}\n\n` +
        `Daily summary posted to group chat.`)

    } catch (error) {
      console.error('Error running penalty check:', error)
      alert(`❌ Failed to run penalty check:\n${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunningCheck(false)
    }
  }

  // Load group admin data
  const loadGroupData = useCallback(async () => {
    if (!profile || (profile.role !== 'group_admin' && profile.role !== 'supreme_admin')) return
    if (profile.role === 'group_admin' || (profile.role === 'supreme_admin' && profile.group_id)) {
      setGroupDataLoading(true)
      try {
        // Load group
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*, invite_code')
          .eq('admin_id', profile.id)
          .single()

        if (groupError) throw groupError
        setGroup(groupData)

        // Load members with stats
        const { data: membersData, error: membersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('group_id', groupData.id)
          .order('email')

        if (membersError) throw membersError

        // Calculate stats for each member
        const membersWithStats = await Promise.all(
          (membersData || []).map(async (member) => {
            const { data: pointsData } = await supabase
              .from('logs')
              .select('points, created_at')
              .eq('user_id', member.id)

            const totalPoints = pointsData?.reduce((sum, log) => sum + (log.points || 0), 0) || 0
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
            const recentWorkouts = pointsData?.filter(log => new Date(log.created_at) >= sevenDaysAgo).length || 0

            return { ...member, total_points: totalPoints, recent_workouts: recentWorkouts }
          })
        )
        setMembers(membersWithStats)

        // Load pot data
        const potMembersData = await Promise.all(
          (membersData || []).map(async (member) => {
            const { data: transactions } = await supabase
              .from('payment_transactions')
              .select('amount, transaction_type, description, created_at')
              .eq('user_id', member.id)
              .order('created_at', { ascending: false })
              .limit(5)

            const lastPenalty = (transactions || []).filter(t => t.transaction_type === 'penalty')[0]
            return {
              ...member,
              penalty_balance: member.total_penalty_owed || 0,
              last_penalty_date: lastPenalty ? new Date(lastPenalty.created_at).toLocaleDateString() : null,
              recent_transactions: transactions || []
            }
          })
        )
        setPotMembers(potMembersData)

        // Load group settings
        const { data: settingsData } = await supabase
          .from('group_settings')
          .select('*')
          .eq('group_id', groupData.id)
          .maybeSingle()
        setGroupSettings(settingsData)

        // Load chat settings
        const senderName = await SystemMessageService.getSystemSenderName(groupData.id)
        setSystemSenderName(senderName)
      } catch (error) {
        console.error('Error loading group data:', error)
      } finally {
        setGroupDataLoading(false)
      }
    }
  }, [profile])

  useEffect(() => {
    if (profile && (profile.role === 'group_admin' || profile.role === 'supreme_admin')) {
      loadGroupData()
    }
  }, [profile, loadGroupData])

  // Avatar Upload Logic
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(Date.now())

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0]
      if (!file || !user) return

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }

      setUploadingAvatar(true)

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setAvatarCacheBuster(Date.now())
      window.location.reload()

    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Error uploading avatar. Please try again.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  // Use actual username from profile
  const username = profile.username || 'User'

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 selection:text-blue-100 overflow-x-hidden relative">

      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[140px] opacity-20" />
        <div className="absolute bottom-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[140px] opacity-20" />
      </div>

      <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col pb-20">

        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-gradient-to-b from-black via-black/90 to-transparent sticky top-0 z-50 backdrop-blur-md">
          <h1 className="text-2xl font-black italic tracking-tighter text-white">SETTINGS</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <X size={20} className="text-zinc-400" />
          </button>
        </header>

        <div className="px-5 flex flex-col gap-6">

          {/* Profile Info */}
          <div className="flex flex-col items-center mb-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div
              onClick={handleAvatarClick}
              className="group relative w-24 h-24 rounded-full border border-white/10 flex items-center justify-center mb-4 shadow-2xl cursor-pointer overflow-hidden bg-zinc-900"
            >
              {profile.avatar_url ? (
                <img
                  src={`${profile.avatar_url}?v=${avatarCacheBuster}`}
                  alt={username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  <span className="text-3xl font-black text-zinc-500 uppercase">{username.substring(0, 2)}</span>
                </div>
              )}

              {/* Upload Overlay */}
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {uploadingAvatar ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                ) : (
                  <>
                    <div className="bg-white/20 p-2 rounded-full mb-1 backdrop-blur-sm">
                      <Settings size={16} className="text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                  </>
                )}
              </div>

              {/* Online Status */}
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-black rounded-full z-10" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">{username}</h2>
            <div className="px-3 py-1 bg-zinc-900 rounded-full border border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {profile.role === 'supreme_admin' ? 'Supreme Admin' : profile.role === 'group_admin' ? 'Group Admin' : 'Member'}
            </div>
          </div>

          {/* Settings Section */}
          <section>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">Preferences</h3>
            <GlassCard noPadding className="overflow-hidden">
              <div className="flex flex-col divide-y divide-white/5">

                {/* Notification Settings */}
                <button
                  onClick={() => setShowNotificationSettings(true)}
                  className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Bell size={16} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors">Notifications</span>
                      <span className="text-[10px] text-zinc-500">Push, email, alerts</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                </button>

                {/* Sick Mode */}
                <div className="flex items-center justify-between p-4 bg-zinc-900/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSickMode ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                      <Heart size={16} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold text-white">Sick Mode</span>
                      <span className="text-[10px] text-zinc-500">{isSickMode ? 'Pausing penalties' : 'Active'}</span>
                    </div>
                  </div>

                  <button
                    onClick={toggleSickMode}
                    disabled={isUpdatingSickMode}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${isSickMode ? 'bg-red-500' : 'bg-zinc-700'} ${isUpdatingSickMode ? 'opacity-50' : ''}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isSickMode ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

              </div>
            </GlassCard>
          </section>

          {/* Admin Tools */}
          {(profile.role === 'supreme_admin' || profile.role === 'group_admin') && (
            <section>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">Admin Consortium</h3>
              <GlassCard noPadding className="overflow-hidden">
                <div className="flex flex-col divide-y divide-white/5">

                  {profile.role === 'supreme_admin' && (
                    <>
                      <AdminLink href="/admin/groups" icon={Users} iconColor="text-green-400" bgColor="bg-green-500/10" title="Manage All Groups" />
                      <AdminLink href="/admin/users" icon={Users} iconColor="text-purple-400" bgColor="bg-purple-500/10" title="Manage Users" />
                      <AdminLink href="/admin/exercises" icon={ClipboardList} iconColor="text-orange-400" bgColor="bg-orange-500/10" title="Manage Exercises" />
                      <AdminLink href="/admin/sports" icon={Zap} iconColor="text-yellow-400" bgColor="bg-yellow-500/10" title="Manage Sports" />
                      <AdminLink href="/admin/error-logs" icon={Bug} iconColor="text-red-400" bgColor="bg-red-500/10" title="Error Logs" />
                      <AdminLink href="/admin/group-exercises" icon={Sliders} iconColor="text-cyan-400" bgColor="bg-cyan-500/10" title="Group Exercises" />

                      <AdminAction onClick={() => setShowSystemMessageConfig(true)} icon={Sparkles} iconColor="text-pink-400" bgColor="bg-pink-500/10" title="System Messages" />
                      <AdminAction onClick={() => setShowTestPenaltyModal(true)} icon={Play} iconColor="text-lime-400" bgColor="bg-lime-500/10" title="Test Penalty Modal" />
                    </>
                  )}

                  {/* Run Daily Summary */}
                  <button
                    onClick={runPenaltyCheck}
                    disabled={isRunningCheck}
                    className="flex items-center justify-between p-4 hover:bg-orange-900/10 transition-colors group w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                        <Play size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-orange-500 group-hover:text-orange-400 transition-colors">
                          {isRunningCheck ? 'Processing...' : 'Run Daily Summary'}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </GlassCard>
            </section>
          )}

          {/* Group Administration - For Group Admins and Supreme Admins with a group */}
          {(profile.role === 'group_admin' || (profile.role === 'supreme_admin' && profile.group_id)) && group && (
            <section>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">Group Administration</h3>
              <GlassCard noPadding className="overflow-hidden">
                <div className="flex flex-col divide-y divide-white/5">
                  {/* Group Overview Stats */}
                  <div className="p-4 bg-zinc-900/30">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">{group.name}</div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-xs text-zinc-500">Members</div>
                        <div className="text-lg font-bold text-white">{members.length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Start Date</div>
                        <div className="text-sm font-bold text-white">{new Date(group.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Pot</div>
                        <div className="text-lg font-bold text-orange-400">€{potMembers.reduce((sum, m) => sum + (m.penalty_balance || 0), 0).toFixed(0)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Group Members */}
                  <GroupMembersSection
                    members={members}
                    onRemoveMember={async (userId) => {
                      if (!confirm('Are you sure you want to remove this member from your group?')) return
                      try {
                        const { error } = await supabase
                          .from('profiles')
                          .update({ group_id: null })
                          .eq('id', userId)
                        if (error) throw error
                        await loadGroupData()
                        alert('Member removed successfully!')
                      } catch (error) {
                        console.error('Error removing member:', error)
                        alert('Failed to remove member')
                      }
                    }}
                  />

                  {/* Pot Management */}
                  <PotManagementSection
                    members={potMembers}
                    onAdjustPenalty={async (userId, amount, reason) => {
                      try {
                        const transactionType = amount > 0 ? 'penalty' : 'payment'
                        const absoluteAmount = Math.abs(amount)

                        const { error: transactionError } = await supabase
                          .from('payment_transactions')
                          .insert({
                            user_id: userId,
                            group_id: group.id,
                            amount: absoluteAmount,
                            transaction_type: transactionType,
                            description: `Admin adjustment: ${reason}`
                          })

                        if (transactionError) throw transactionError

                        const { data: currentProfile } = await supabase
                          .from('profiles')
                          .select('total_penalty_owed')
                          .eq('id', userId)
                          .single()

                        if (currentProfile) {
                          const currentTotal = currentProfile.total_penalty_owed || 0
                          const newTotal = transactionType === 'penalty'
                            ? currentTotal + absoluteAmount
                            : Math.max(0, currentTotal - absoluteAmount)

                          await supabase
                            .from('profiles')
                            .update({ total_penalty_owed: newTotal })
                            .eq('id', userId)
                        }

                        await loadGroupData()
                        alert('Adjustment recorded successfully!')
                      } catch (error) {
                        console.error('Error adjusting penalty:', error)
                        alert('Failed to record adjustment')
                        throw error
                      }
                    }}
                  />

                  {/* Group Settings */}
                  <GroupSettingsSection
                    group={group}
                    groupSettings={groupSettings}
                    onSaveSettings={async (startDate, recoveryDays) => {
                      try {
                        const { error: groupError } = await supabase
                          .from('groups')
                          .update({ start_date: startDate })
                          .eq('id', group.id)

                        if (groupError) throw groupError

                        const { data: existingSettings } = await supabase
                          .from('group_settings')
                          .select('id')
                          .eq('group_id', group.id)
                          .maybeSingle()

                        if (existingSettings) {
                          await supabase
                            .from('group_settings')
                            .update({ recovery_days: recoveryDays, updated_at: new Date().toISOString() })
                            .eq('group_id', group.id)
                        } else {
                          await supabase
                            .from('group_settings')
                            .insert({
                              group_id: group.id,
                              daily_target_base: 1,
                              daily_increment: 1,
                              penalty_amount: 10,
                              recovery_percentage: 25,
                              rest_days: [1],
                              recovery_days: recoveryDays,
                              accent_color: 'blue'
                            })
                        }

                        await loadGroupData()
                        alert('Group settings updated successfully!')
                      } catch (error) {
                        console.error('Error saving group settings:', error)
                        alert('Failed to save settings')
                        throw error
                      }
                    }}
                  />

                  {/* Chat Settings */}
                  {group?.id && (
                    <ChatSettingsSection
                      groupId={group.id}
                      initialSenderName={systemSenderName}
                      onSave={loadGroupData}
                    />
                  )}

                  {/* Bot Message Configuration */}
                  <button
                    onClick={() => setShowSystemMessageConfig(true)}
                    className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400">
                        <Sparkles size={16} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-bold text-white group-hover:text-pink-200 transition-colors">Bot Message Templates</span>
                        <span className="text-[10px] text-zinc-500">Configure automated messages</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                  </button>
                </div>
              </GlassCard>
            </section>
          )}

          {/* Account Actions */}
          <section className="mb-4">
            <GlassCard noPadding className="overflow-hidden">
              <button
                onClick={signOut}
                className="flex items-center justify-between p-4 w-full hover:bg-red-900/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                    <LogOut size={16} />
                  </div>
                  <span className="text-sm font-bold text-red-500 group-hover:text-red-400">Sign Out</span>
                </div>
              </button>
            </GlassCard>
          </section>

          <div className="text-center pb-8">
            <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">v{packageJson.version}</p>
          </div>

        </div>
      </div>

      {/* Modals */}
      {showSystemMessageConfig && (
        <SystemMessageConfigAdmin
          isOpen={showSystemMessageConfig}
          onClose={() => setShowSystemMessageConfig(false)}
        />
      )}

      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <NotificationSettings
            onClose={() => setShowNotificationSettings(false)}
          />
        </div>
      )}

      {showTestPenaltyModal && (
        <PenaltyResponseModal
          penalties={[
            {
              id: 'test-penalty-1',
              user_id: user?.id || '',
              group_id: profile?.group_id || '',
              date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
              target_points: 100,
              actual_points: 45,
              penalty_amount: 10,
              status: 'pending',
              created_at: new Date(Date.now() - 43200000).toISOString(),
              deadline: new Date(Date.now() + 43200000).toISOString(),
              is_expired: false,
              hours_remaining: 12
            }
          ]}
          onComplete={() => setShowTestPenaltyModal(false)}
          isTestMode={true}
        />
      )}
    </div>
  )
}

// Helper components for Admin list
function AdminLink({ href, icon: Icon, iconColor, bgColor, title }: any) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center ${iconColor}`}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">{title}</span>
      </div>
      <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400" />
    </Link>
  )
}

function AdminAction({ onClick, icon: Icon, iconColor, bgColor, title }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group w-full"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center ${iconColor}`}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-bold text-white group-hover:text-zinc-200 transition-colors">{title}</span>
      </div>
      <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400" />
    </button>
  )
}