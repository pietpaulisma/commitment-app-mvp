'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import { supabase } from '@/lib/supabase'
import { getDaysSinceStart } from '@/utils/targetCalculation'

type Member = {
  id: string
  email: string
  role: string
  group_id: string | null
  preferred_weight: number
  is_weekly_mode: boolean
  location: string
  created_at: string
  total_points?: number
  recent_workouts?: number
}

type Group = {
  id: string
  name: string
  start_date: string
  admin_id: string
  created_at: string
  invite_code?: string
}

type WorkoutSummary = {
  total_workouts: number
  total_points: number
  avg_points_per_workout: number
  most_active_day: string
}

type GroupSettings = {
  id: string
  group_id: string
  daily_target_base: number
  daily_increment: number
  penalty_amount: number
  recovery_percentage: number
  rest_days: number[]
  recovery_days: number[]
  accent_color: string
}

export default function GroupAdminDashboard() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, isGroupAdmin, isSupremeAdmin } = useProfile()
  const router = useRouter()
  
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary | null>(null)
  const [groupSettings, setGroupSettings] = useState<GroupSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'pot'>('overview')
  const [editingSettings, setEditingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState<Partial<GroupSettings & { start_date?: string }>>({})
  const [potData, setPotData] = useState<any[]>([])
  const [potLoading, setPotLoading] = useState(false)
  const [potError, setPotError] = useState<string | null>(null)
  const [editingPot, setEditingPot] = useState<string | null>(null)
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!profileLoading && profile && !isGroupAdmin && !(isSupremeAdmin && profile.group_id)) {
      router.push('/dashboard')
    }
  }, [profile, profileLoading, isGroupAdmin, isSupremeAdmin, router])

  useEffect(() => {
    if ((isGroupAdmin || (isSupremeAdmin && profile?.group_id)) && profile) {
      loadGroupData()
      loadGroupSettings()
      loadPotData()
    }
  }, [isGroupAdmin, isSupremeAdmin, profile])

  const loadGroupData = async () => {
    if (!profile) return

    try {
      // Load the group this admin manages
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*, invite_code')
        .eq('admin_id', profile.id)
        .single()

      if (groupError) throw groupError

      // Load group members
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('group_id', groupData.id)
        .order('email')

      if (membersError) throw membersError

      // Calculate member stats
      const membersWithStats = await Promise.all(
        (membersData || []).map(async (member) => {
          // Get total points
          const { data: pointsData } = await supabase
            .from('logs')
            .select('points, created_at')
            .eq('user_id', member.id)

          const totalPoints = pointsData?.reduce((sum, log) => sum + (log.points || 0), 0) || 0
          
          // Get recent workouts (last 7 days)
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          
          const recentWorkouts = pointsData?.filter(log => 
            new Date(log.created_at) >= sevenDaysAgo
          ).length || 0
          
          return {
            ...member,
            total_points: totalPoints,
            recent_workouts: recentWorkouts
          }
        })
      )

      // Calculate group workout summary
      const { data: allWorkouts } = await supabase
        .from('logs')
        .select('points, created_at')
        .in('user_id', membersData.map(m => m.id))

      const totalWorkouts = allWorkouts?.length || 0
      const totalPoints = allWorkouts?.reduce((sum, log) => sum + (log.points || 0), 0) || 0
      const avgPointsPerWorkout = totalWorkouts > 0 ? totalPoints / totalWorkouts : 0

      // Find most active day
      const dayCount: Record<string, number> = {}
      allWorkouts?.forEach(workout => {
        const day = new Date(workout.created_at).toLocaleDateString('en-US', { weekday: 'long' })
        dayCount[day] = (dayCount[day] || 0) + 1
      })
      const mostActiveDay = Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b, 'No data')

      setGroup(groupData)
      setMembers(membersWithStats)
      setWorkoutSummary({
        total_workouts: totalWorkouts,
        total_points: totalPoints,
        avg_points_per_workout: avgPointsPerWorkout,
        most_active_day: mostActiveDay
      })
    } catch (error) {
      console.error('Error loading group data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGroupSettings = async () => {
    if (!profile) return

    try {
      setSettingsLoading(true)

      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('admin_id', profile.id)
        .single()

      if (groupError) throw groupError

      const { data: settingsData, error: settingsError } = await supabase
        .from('group_settings')
        .select('*')
        .eq('group_id', groupData.id)
        .maybeSingle()

      if (settingsError) throw settingsError

      setGroupSettings(settingsData)
    } catch (error) {
      console.error('Error loading group settings:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  const loadPotData = async () => {
    console.log('🍯 [POT DEBUG] Starting loadPotData...')
    console.log('🍯 [POT DEBUG] Profile:', profile)
    
    if (!profile) {
      console.log('🍯 [POT DEBUG] No profile, returning early')
      return
    }

    try {
      setPotLoading(true)
      setPotError(null)
      console.log('🍯 [POT DEBUG] Set loading to true')

      // Step 1: Get group data
      console.log('🍯 [POT DEBUG] Fetching group data for admin_id:', profile.id)
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('admin_id', profile.id)
        .single()

      console.log('🍯 [POT DEBUG] Group query result:', { groupData, groupError })
      if (groupError) throw groupError

      // Step 2: Get members data (without total_penalty_owed for now)
      console.log('🍯 [POT DEBUG] Fetching members for group_id:', groupData.id)
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('id, email, username')
        .eq('group_id', groupData.id)
        .order('email')

      console.log('🍯 [POT DEBUG] Members query result:', { membersData, membersError })
      if (membersError) throw membersError

      // Step 3: Check payment_transactions table access
      console.log('🍯 [POT DEBUG] Testing payment_transactions table access...')
      const { data: testTransactions, error: testError } = await supabase
        .from('payment_transactions')
        .select('*')
        .limit(1)

      console.log('🍯 [POT DEBUG] Payment transactions test:', { testTransactions, testError })

      // Step 4: Get transactions for each member (with fallback)
      console.log('🍯 [POT DEBUG] Processing', membersData?.length || 0, 'members...')
      const membersWithTransactions = await Promise.all(
        (membersData || []).map(async (member, index) => {
          console.log(`🍯 [POT DEBUG] Processing member ${index + 1}:`, member.email, 'ID:', member.id)
          
          // Try payment_transactions first
          let transactions = null
          let transactionError = null
          
          try {
            const result = await supabase
              .from('payment_transactions')
              .select('amount, transaction_type, description, created_at')
              .eq('user_id', member.id)
              .order('created_at', { ascending: false })
            
            transactions = result.data
            transactionError = result.error
          } catch (error) {
            console.log(`🍯 [POT DEBUG] Error accessing payment_transactions for ${member.email}:`, error)
            transactionError = error
          }

          console.log(`🍯 [POT DEBUG] Transactions for ${member.email}:`, { transactions, transactionError })

          // Calculate current debt and find last penalty date
          const totalPaid = transactions
            ?.filter(t => t.transaction_type === 'payment')
            .reduce((sum, t) => sum + t.amount, 0) || 0

          const totalPenalties = transactions
            ?.filter(t => t.transaction_type === 'penalty')
            .reduce((sum, t) => sum + t.amount, 0) || 0

          const currentDebt = Math.max(0, totalPenalties - totalPaid)

          // Find last penalty date
          const lastPenalty = transactions
            ?.filter(t => t.transaction_type === 'penalty')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

          const lastPenaltyDate = lastPenalty ? new Date(lastPenalty.created_at).toLocaleDateString() : null

          console.log(`🍯 [POT DEBUG] Calculated for ${member.email}: debt=${currentDebt}, lastPenalty=${lastPenaltyDate}`)

          return {
            ...member,
            total_penalty_owed: currentDebt,
            last_penalty_date: lastPenaltyDate,
            recent_transactions: transactions?.slice(0, 3) || [] // Keep fewer for reference
          }
        })
      )

      console.log('🍯 [POT DEBUG] Final membersWithTransactions:', membersWithTransactions)
      setPotData(membersWithTransactions)
    } catch (error) {
      console.error('🍯 [POT DEBUG] Error loading pot data:', error)
      console.error('🍯 [POT DEBUG] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      setPotError(`Failed to load pot data: ${errorMessage}`)
    } finally {
      console.log('🍯 [POT DEBUG] Setting loading to false')
      setPotLoading(false)
    }
  }

  const startEditingSettings = () => {
    if (group) {
      setSettingsForm({
        start_date: group.start_date,
        recovery_days: groupSettings?.recovery_days || [5] // Default to Friday (5)
      })
    }
    setEditingSettings(true)
  }

  const cancelEditingSettings = () => {
    setEditingSettings(false)
    setSettingsForm({})
  }

  const saveGroupSettings = async () => {
    if (!group || !settingsForm) return

    try {
      setSettingsLoading(true)
      
      // Update the group's start_date
      const { error: groupError } = await supabase
        .from('groups')
        .update({
          start_date: settingsForm.start_date
        })
        .eq('id', group.id)

      if (groupError) throw groupError

      // Update group_settings for recovery_days if needed  
      if (settingsForm.recovery_days) {
        // Check if group_settings exists
        const { data: existingSettings } = await supabase
          .from('group_settings')
          .select('id')
          .eq('group_id', group.id)
          .maybeSingle()

        if (existingSettings) {
          // Update existing settings
          const { error: settingsError } = await supabase
            .from('group_settings')
            .update({
              recovery_days: settingsForm.recovery_days,
              updated_at: new Date().toISOString()
            })
            .eq('group_id', group.id)

          if (settingsError) throw settingsError
        } else {
          // Create new settings record
          const { error: createError } = await supabase
            .from('group_settings')
            .insert({
              group_id: group.id,
              daily_target_base: 1,
              daily_increment: 1,
              penalty_amount: 10,
              recovery_percentage: 25,
              rest_days: [1], // Monday
              recovery_days: settingsForm.recovery_days || [5], // Friday by default
              accent_color: 'blue'
            })

          if (createError) throw createError
        }
      }

      // Reload group data and settings to get updated values
      await Promise.all([loadGroupData(), loadGroupSettings()])
      setEditingSettings(false)
      setSettingsForm({})
      
      alert('Group settings updated successfully!')
    } catch (error) {
      console.error('Error saving group settings:', error)
      alert('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSettingsLoading(false)
    }
  }

  const copyInviteLink = () => {
    if (!group?.invite_code) return
    
    const inviteLink = `${window.location.origin}/onboarding/groups?invite=${group.invite_code}`
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert('Invite link copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy link. Please copy manually.')
    })
  }

  const copyInviteCode = () => {
    if (!group?.invite_code) return
    
    navigator.clipboard.writeText(group.invite_code).then(() => {
      alert('Invite code copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy code. Please copy manually.')
    })
  }

  const removeUserFromGroup = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from your group?')) {
      return
    }

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
      alert('Failed to remove member: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const adjustPenaltyAmount = async (userId: string) => {
    if (!adjustmentAmount || !adjustmentReason) {
      alert('Please enter both amount and reason for the adjustment')
      return
    }

    const amount = parseFloat(adjustmentAmount)
    if (isNaN(amount) || amount === 0) {
      alert('Please enter a valid amount (positive for penalty, negative for payment)')
      return
    }

    try {
      if (!group) return

      const transactionType = amount > 0 ? 'penalty' : 'payment'
      const absoluteAmount = Math.abs(amount)

      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: userId,
          group_id: group.id,
          amount: absoluteAmount,
          transaction_type: transactionType,
          description: `Admin adjustment: ${adjustmentReason}`
        })

      if (transactionError) throw transactionError

      // Note: We don't update profiles.total_penalty_owed since the column doesn't exist
      // The debt will be calculated from payment_transactions on next load
      console.log('🍯 [POT DEBUG] Transaction recorded, debt will be recalculated from transactions')

      await Promise.all([loadPotData(), loadGroupData()])
      setEditingPot(null)
      setAdjustmentAmount('')
      setAdjustmentReason('')
      alert('Adjustment recorded successfully!')
    } catch (error) {
      console.error('Error adjusting penalty:', error)
      alert('Failed to adjust penalty: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || (!isGroupAdmin && !(isSupremeAdmin && profile.group_id))) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      <RoleBasedNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Group Admin Dashboard</h1>
            <p className="text-gray-400">
              {group ? `Managing: ${group.name}` : 'No group assigned'}
            </p>
          </div>
          <button
            onClick={signOut}
            className="bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition-colors self-start sm:self-center"
          >
            Sign Out
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading group data...</p>
          </div>
        ) : !group ? (
          <div className="text-center py-8">
            <p className="text-gray-400">You are not assigned as admin of any group.</p>
            <p className="text-gray-400">Contact a Supreme Admin to assign you to a group.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-gray-900/30 border border-gray-800">
              <div className="border-b border-gray-800">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-orange-500 text-orange-500'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'settings'
                        ? 'border-orange-500 text-orange-500'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    Group Settings
                  </button>
                  <button
                    onClick={() => setActiveTab('pot')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'pot'
                        ? 'border-orange-500 text-orange-500'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                    }`}
                  >
                    Pot
                  </button>
                </nav>
              </div>
            </div>

            {activeTab === 'overview' ? (
              <>
                {/* Group Summary Cards */}
            {workoutSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-900/30 border border-gray-800 p-6">
                  <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">Total Members</div>
                  <div className="text-2xl font-bold text-white">{members.length}</div>
                </div>
                <div className="bg-gray-900/30 border border-gray-800 p-6">
                  <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">Total Workouts</div>
                  <div className="text-2xl font-bold text-green-500">{workoutSummary.total_workouts}</div>
                </div>
                <div className="bg-gray-900/30 border border-gray-800 p-6">
                  <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">Total Points</div>
                  <div className="text-2xl font-bold text-blue-500">{workoutSummary.total_points}</div>
                </div>
                <div className="bg-gray-900/30 border border-gray-800 p-6">
                  <div className="text-sm font-medium text-gray-400 uppercase tracking-wide">Avg Points/Workout</div>
                  <div className="text-2xl font-bold text-orange-500">{workoutSummary.avg_points_per_workout.toFixed(1)}</div>
                </div>
              </div>
            )}

            {/* Group Information */}
            <div className="bg-gray-900/30 border border-gray-800">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">Group Information</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 uppercase tracking-wide">Group Name</label>
                    <p className="text-lg text-white">{group.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 uppercase tracking-wide">Start Date</label>
                    <p className="text-lg text-white">{new Date(group.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 uppercase tracking-wide">Most Active Day</label>
                    <p className="text-lg text-white">{workoutSummary?.most_active_day || 'No data'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Group Invite Code */}
            <div className="bg-gray-900/30 border border-gray-800">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">Invite New Members</h3>
              </div>
              <div className="p-6">
                {group?.invite_code ? (
                  <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg">
                    {/* Invite Code - Large and prominent */}
                    <div className="mb-6">
                      <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Your Group Invite Code</div>
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-3xl text-orange-400 font-bold tracking-wider">
                          {group.invite_code}
                        </div>
                        <button
                          onClick={copyInviteCode}
                          className="px-4 py-2 bg-orange-600/20 border border-orange-600/40 text-orange-300 text-sm hover:bg-orange-600/30 transition-colors rounded"
                        >
                          Copy Code
                        </button>
                      </div>
                    </div>

                    {/* Invite Link */}
                    <div className="mb-4">
                      <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Full Invite Link</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 text-sm text-gray-300 font-mono bg-gray-900/50 px-3 py-2 rounded border border-gray-700 truncate">
                          {`${typeof window !== 'undefined' ? window.location.origin : ''}/onboarding/groups?invite=${group.invite_code}`}
                        </div>
                        <button
                          onClick={copyInviteLink}
                          className="px-4 py-2 bg-blue-600/20 border border-blue-600/40 text-blue-300 text-sm hover:bg-blue-600/30 transition-colors rounded"
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">No invite code available</div>
                    <p className="text-gray-500 text-sm">Contact support if you need an invite code generated</p>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-4">
                  Share the code or link with people you want to invite to your group. They can enter the code during onboarding or click the link directly.
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-gray-900/30 border border-gray-800">
              <div className="px-4 md:px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">Group Members ({members.length})</h3>
              </div>
              
              {/* Mobile Card View */}
              <div className="block md:hidden">
                {members.map((member) => (
                  <div key={member.id} className="p-4 border-b border-gray-800 last:border-b-0">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{member.email}</div>
                        <div className="text-xs text-gray-400">
                          Joined {new Date(member.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => removeUserFromGroup(member.id)}
                        className="text-red-400 hover:text-red-300 transition-colors text-sm ml-4"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-400 text-xs uppercase tracking-wide">Location</div>
                        <div className="text-white">{member.location}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs uppercase tracking-wide">Points</div>
                        <div className="text-green-500 font-medium">{member.total_points || 0} pts</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs uppercase tracking-wide">Weight</div>
                        <div className="text-white">{member.preferred_weight} kg</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs uppercase tracking-wide">Mode</div>
                        <div className="text-white">{member.is_weekly_mode ? 'Weekly' : 'Daily'}</div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Recent Activity</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${
                        (member.recent_workouts || 0) > 3 ? 'bg-green-900/50 text-green-400 border border-green-700' :
                        (member.recent_workouts || 0) > 0 ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700' :
                        'bg-red-900/50 text-red-400 border border-red-700'
                      }`}>
                        {member.recent_workouts || 0} workouts (7 days)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total Points</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Recent Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Weight</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Mode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-800/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{member.email}</div>
                          <div className="text-sm text-gray-400">
                            Joined {new Date(member.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{member.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-500">
                          {member.total_points || 0} pts
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${
                            (member.recent_workouts || 0) > 3 ? 'bg-green-900/50 text-green-400 border border-green-700' :
                            (member.recent_workouts || 0) > 0 ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700' :
                            'bg-red-900/50 text-red-400 border border-red-700'
                          }`}>
                            {member.recent_workouts || 0} workouts (7 days)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{member.preferred_weight} kg</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {member.is_weekly_mode ? 'Weekly' : 'Daily'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => removeUserFromGroup(member.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {members.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">No members in your group yet</p>
                  <p className="text-gray-400">Contact a Supreme Admin to add members to your group</p>
                </div>
              )}
            </div>
              </>
            ) : activeTab === 'settings' ? (
              /* Settings Tab */
              <div className="bg-gray-900/30 border border-gray-800 p-4 md:p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Group Settings</h3>
                
                {settingsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading settings...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Current Group Information */}
                    {group && (
                      <div className="bg-gray-800/50 border border-gray-700 p-4">
                        <h4 className="text-md font-medium text-white mb-3">Group Information</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400 uppercase tracking-wide">Group Name</div>
                            <div className="font-semibold text-lg text-white">{group.name}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 uppercase tracking-wide">Start Date</div>
                            <div className="font-semibold text-lg text-white">{new Date(group.start_date).toLocaleDateString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 uppercase tracking-wide">Challenge Day</div>
                            <div className="font-semibold text-lg text-white">
                              Day {getDaysSinceStart(group.start_date) + 1}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 uppercase tracking-wide">Members</div>
                            <div className="font-semibold text-lg text-white">{members.length} members</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Current Target Information */}
                    {group && (
                      <div className="bg-blue-900/50 border border-blue-700 p-4">
                        <h4 className="text-md font-medium text-white mb-3">Target System</h4>
                        <div className="text-sm text-gray-400 mb-3">
                          Daily targets increase by 1 point each day since group start date
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-gray-800/50 border border-gray-700">
                            <div className="text-xs text-gray-400 uppercase tracking-wide">Today&apos;s Target</div>
                            <div className="font-bold text-xl text-white">
                              {1 + getDaysSinceStart(group.start_date)}pts
                            </div>
                          </div>
                          <div className="text-center p-3 bg-gray-800/50 border border-gray-700">
                            <div className="text-xs text-gray-400 uppercase tracking-wide">Challenge Day</div>
                            <div className="font-bold text-xl text-white">
                              Day {getDaysSinceStart(group.start_date) + 1}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Edit Settings Form */}
                    {group && (
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                          <h4 className="text-lg font-semibold text-white">Edit Group Start Date</h4>
                          {!editingSettings ? (
                            <button
                              onClick={startEditingSettings}
                              className="bg-orange-600 text-white px-4 py-2 hover:bg-orange-700 transition-colors"
                            >
                              Edit Start Date
                            </button>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={cancelEditingSettings}
                                className="bg-gray-600 text-white px-4 py-2 hover:bg-gray-700 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveGroupSettings}
                                disabled={settingsLoading}
                                className="bg-green-600 text-white px-4 py-2 hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                {settingsLoading ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          )}
                        </div>

                        {editingSettings ? (
                          <div className="space-y-6 max-w-md">
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
                                Group Start Date
                              </label>
                              <input
                                type="date"
                                value={settingsForm.start_date || ''}
                                onChange={(e) => setSettingsForm(prev => ({
                                  ...prev,
                                  start_date: e.target.value
                                }))}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                              />
                              <p className="text-sm text-gray-400 mt-1">
                                Changing this will affect the challenge day calculation and daily targets for all members
                              </p>
                            </div>


                            {/* Recovery Day Selection */}
                            <div>
                              <label className="block text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">
                                Recovery Day Configuration
                              </label>
                              <div className="bg-gray-800/50 border border-gray-700 p-4 rounded">
                                <p className="text-sm text-gray-400 mb-4">
                                  Choose which day requires only 25% of the normal target through recovery exercises only
                                </p>
                                <div className="grid grid-cols-7 gap-2">
                                  {[
                                    { day: 0, name: 'Sun' },
                                    { day: 1, name: 'Mon' },
                                    { day: 2, name: 'Tue' },
                                    { day: 3, name: 'Wed' },
                                    { day: 4, name: 'Thu' },
                                    { day: 5, name: 'Fri' },
                                    { day: 6, name: 'Sat' }
                                  ].map(({ day, name }) => (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => setSettingsForm(prev => ({ 
                                        ...prev, 
                                        recovery_days: [day] 
                                      }))}
                                      className={`p-3 text-center border transition-colors ${
                                        (settingsForm.recovery_days || [5]).includes(day)
                                          ? 'border-green-500 bg-green-900/30 text-green-400'
                                          : 'border-gray-600 bg-gray-800/30 text-gray-400 hover:border-gray-500'
                                      }`}
                                    >
                                      <div className="font-bold text-sm">{name}</div>
                                    </button>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                  Recovery Day: 25% of normal daily target, achieved only through recovery exercises (yoga, stretching, meditation)
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            <p>Click &quot;Edit Start Date&quot; to modify when your group&apos;s challenge began</p>
                            <p className="text-sm mt-2">Note: This will affect daily target calculations for all members</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : activeTab === 'pot' ? (
              /* Pot Tab */
              <div className="bg-gray-900/30 border border-gray-800">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h3 className="text-lg font-semibold text-white">Money Pot Management</h3>
                  <p className="text-gray-400 text-sm mt-1">Track member contributions and adjust penalty amounts</p>
                </div>
                
                {potLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading pot data...</p>
                  </div>
                ) : potError ? (
                  <div className="text-center py-8">
                    <div className="bg-red-900/30 border border-red-700 p-6 rounded-lg">
                      <h4 className="text-red-400 font-semibold mb-2">Error Loading Pot Data</h4>
                      <p className="text-red-300 text-sm mb-4">{potError}</p>
                      <button
                        onClick={loadPotData}
                        className="bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700 transition-colors"
                      >
                        Retry
                      </button>
                      <div className="mt-4 text-left">
                        <details className="text-xs text-gray-400">
                          <summary className="cursor-pointer hover:text-gray-300">Debug Info</summary>
                          <div className="mt-2 space-y-1">
                            <div>User ID: {profile?.id}</div>
                            <div>User Role: {profile?.role}</div>
                            <div>Group ID: {profile?.group_id}</div>
                            <div>Check browser console for detailed logs (🍯 [POT DEBUG])</div>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {potData.map((member) => (
                      <div key={member.id} className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          {/* Member Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              <h4 className="text-lg font-medium text-white">{member.email}</h4>
                              <span className={`px-2 py-1 text-xs rounded ${
                                (member.total_penalty_owed || 0) > 0 
                                  ? 'bg-red-900/50 text-red-400 border border-red-700'
                                  : 'bg-green-900/50 text-green-400 border border-green-700'
                              }`}>
                                {(member.total_penalty_owed || 0) > 0 ? 'Owes Money' : 'Paid Up'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-gray-400 uppercase tracking-wide text-xs">Current Debt</div>
                                <div className="text-red-400 font-bold text-2xl">€{(member.total_penalty_owed || 0).toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 uppercase tracking-wide text-xs">Last Penalty</div>
                                <div className="text-orange-400 font-medium">
                                  {member.last_penalty_date || 'No penalties yet'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Button */}
                          <div className="flex-shrink-0">
                            {editingPot === member.id ? (
                              <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg min-w-80">
                                <h5 className="text-white font-medium mb-3">Adjust Amount</h5>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
                                      Amount (+ for penalty, - for payment)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={adjustmentAmount}
                                      onChange={(e) => setAdjustmentAmount(e.target.value)}
                                      placeholder="10.00 or -20.00"
                                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">
                                      Reason
                                    </label>
                                    <input
                                      type="text"
                                      value={adjustmentReason}
                                      onChange={(e) => setAdjustmentReason(e.target.value)}
                                      placeholder="Phone died, missed check-in"
                                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => adjustPenaltyAmount(member.id)}
                                      className="bg-green-600 text-white px-3 py-1 text-sm hover:bg-green-700 transition-colors"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingPot(null)
                                        setAdjustmentAmount('')
                                        setAdjustmentReason('')
                                      }}
                                      className="bg-gray-600 text-white px-3 py-1 text-sm hover:bg-gray-700 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingPot(member.id)}
                                className="bg-orange-600 text-white px-4 py-2 text-sm hover:bg-orange-700 transition-colors"
                              >
                                Adjust Amount
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Recent Activity (only if there are transactions) */}
                        {member.recent_transactions && member.recent_transactions.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-800">
                            <h5 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Recent Activity</h5>
                            <div className="space-y-1">
                              {member.recent_transactions.slice(0, 2).map((transaction: any, index: number) => (
                                <div key={index} className="flex justify-between items-center text-xs">
                                  <span className="text-gray-300">{transaction.description}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={transaction.transaction_type === 'penalty' ? 'text-red-400' : 'text-green-400'}>
                                      {transaction.transaction_type === 'penalty' ? '+' : '-'}€{transaction.amount.toFixed(2)}
                                    </span>
                                    <span className="text-gray-500">
                                      {new Date(transaction.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {potData.length === 0 && (
                      <div className="text-center py-8">
                        <div className="bg-yellow-900/30 border border-yellow-700 p-6 rounded-lg">
                          <h4 className="text-yellow-400 font-semibold mb-2">No Pot Data Found</h4>
                          <p className="text-yellow-300 text-sm mb-4">
                            No members found or no penalty data available. This could mean:
                          </p>
                          <ul className="text-yellow-300 text-sm text-left space-y-1 mb-4">
                            <li>• No members in your group yet</li>
                            <li>• Database permissions issue</li>
                            <li>• Payment transactions table not accessible</li>
                            <li>• No penalty data has been recorded yet</li>
                          </ul>
                          <button
                            onClick={loadPotData}
                            className="bg-yellow-600 text-white px-4 py-2 text-sm hover:bg-yellow-700 transition-colors"
                          >
                            Refresh Data
                          </button>
                          <div className="mt-4 text-left">
                            <details className="text-xs text-gray-400">
                              <summary className="cursor-pointer hover:text-gray-300">Debug Info</summary>
                              <div className="mt-2 space-y-1">
                                <div>User ID: {profile?.id}</div>
                                <div>User Role: {profile?.role}</div>
                                <div>Group ID: {profile?.group_id}</div>
                                <div>Check browser console for detailed logs (🍯 [POT DEBUG])</div>
                              </div>
                            </details>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}