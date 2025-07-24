'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import RoleBasedNavigation from '@/components/RoleBasedNavigation'
import { supabase } from '@/lib/supabase'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview')
  const [editingSettings, setEditingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState<Partial<GroupSettings>>({})

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
    }
  }, [isGroupAdmin, isSupremeAdmin, profile])

  const loadGroupData = async () => {
    if (!profile) return

    try {
      // Load the group this admin manages
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
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
            .from('workout_logs')
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
        .from('workout_logs')
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

  const startEditingSettings = () => {
    if (groupSettings) {
      setSettingsForm({
        daily_target_base: groupSettings.daily_target_base,
        daily_increment: groupSettings.daily_increment,
        penalty_amount: groupSettings.penalty_amount,
        recovery_percentage: groupSettings.recovery_percentage
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
      
      const { error } = await supabase
        .from('group_settings')
        .update({
          daily_target_base: settingsForm.daily_target_base,
          daily_increment: settingsForm.daily_increment,
          penalty_amount: settingsForm.penalty_amount,
          recovery_percentage: settingsForm.recovery_percentage,
          updated_at: new Date().toISOString()
        })
        .eq('group_id', group.id)

      if (error) throw error

      // Reload settings to get updated values
      await loadGroupSettings()
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

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || (!isGroupAdmin && !(isSupremeAdmin && profile.group_id))) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Group Admin Dashboard</h1>
            <p className="text-gray-600">
              {group ? `Managing: ${group.name}` : 'No group assigned'}
            </p>
          </div>
          <button
            onClick={signOut}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading group data...</p>
          </div>
        ) : !group ? (
          <div className="text-center py-8">
            <p className="text-gray-500">You are not assigned as admin of any group.</p>
            <p className="text-gray-500">Contact a Supreme Admin to assign you to a group.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'settings'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Group Settings
                  </button>
                </nav>
              </div>
            </div>

            {activeTab === 'overview' ? (
              <>
                {/* Group Summary Cards */}
            {workoutSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Total Members</div>
                  <div className="text-2xl font-bold text-gray-900">{members.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Total Workouts</div>
                  <div className="text-2xl font-bold text-green-600">{workoutSummary.total_workouts}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Total Points</div>
                  <div className="text-2xl font-bold text-blue-600">{workoutSummary.total_points}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-sm font-medium text-gray-500">Avg Points/Workout</div>
                  <div className="text-2xl font-bold text-purple-600">{workoutSummary.avg_points_per_workout.toFixed(1)}</div>
                </div>
              </div>
            )}

            {/* Group Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Group Information</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Group Name</label>
                    <p className="text-lg text-gray-900">{group.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Start Date</label>
                    <p className="text-lg text-gray-900">{new Date(group.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Most Active Day</label>
                    <p className="text-lg text-gray-900">{workoutSummary?.most_active_day || 'No data'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Group Members ({members.length})</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Points</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recent Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{member.email}</div>
                          <div className="text-sm text-gray-500">
                            Joined {new Date(member.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.location}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {member.total_points || 0} pts
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (member.recent_workouts || 0) > 3 ? 'bg-green-100 text-green-800' :
                            (member.recent_workouts || 0) > 0 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {member.recent_workouts || 0} workouts (7 days)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.preferred_weight} kg</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member.is_weekly_mode ? 'Weekly' : 'Daily'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => removeUserFromGroup(member.id)}
                            className="text-red-600 hover:text-red-900"
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
                  <p className="text-gray-500">No members in your group yet</p>
                  <p className="text-gray-500">Contact a Supreme Admin to add members to your group</p>
                </div>
              )}
            </div>
              </>
            ) : (
              /* Settings Tab */
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Group Settings</h3>
                
                {settingsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading settings...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Current Settings Display */}
                    {groupSettings ? (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Current Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Base Target</div>
                            <div className="font-semibold text-lg">{groupSettings.daily_target_base} pts</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Daily Increment</div>
                            <div className="font-semibold text-lg">+{groupSettings.daily_increment} pts/day</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Penalty Amount</div>
                            <div className="font-semibold text-lg">${groupSettings.penalty_amount}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Recovery Percentage</div>
                            <div className="font-semibold text-lg">{groupSettings.recovery_percentage}%</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Rest Days</div>
                            <div className="font-semibold text-lg">
                              {groupSettings.rest_days?.length > 0 
                                ? groupSettings.rest_days.map(day => {
                                    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                    return days[day];
                                  }).join(', ')
                                : 'None'
                              }
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600">Accent Color</div>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: groupSettings.accent_color }}
                              ></div>
                              <div className="font-semibold">{groupSettings.accent_color}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="text-yellow-800">
                          <h4 className="font-medium">No Group Settings Found</h4>
                          <p className="text-sm mt-1">
                            Default settings will be used. You can create custom settings below.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Target Preview */}
                    {groupSettings && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Target Progression Preview</h4>
                        <div className="text-sm text-gray-600 mb-3">
                          Shows how daily targets increase over the first 10 days:
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {Array.from({ length: 10 }, (_, i) => {
                            const day = i + 1;
                            const target = groupSettings.daily_target_base + (groupSettings.daily_increment * i);
                            return (
                              <div key={day} className="text-center p-2 bg-white rounded border">
                                <div className="text-xs text-gray-500">Day {day}</div>
                                <div className="font-medium">{target}pts</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Edit Settings Form */}
                    {groupSettings && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-semibold text-gray-900">Edit Settings</h4>
                          {!editingSettings ? (
                            <button
                              onClick={startEditingSettings}
                              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Edit Settings
                            </button>
                          ) : (
                            <div className="flex space-x-2">
                              <button
                                onClick={cancelEditingSettings}
                                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={saveGroupSettings}
                                disabled={settingsLoading}
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                {settingsLoading ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          )}
                        </div>

                        {editingSettings ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Base Target (points)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={settingsForm.daily_target_base || ''}
                                onChange={(e) => setSettingsForm(prev => ({
                                  ...prev,
                                  daily_target_base: parseInt(e.target.value) || 0
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 100"
                              />
                              <p className="text-sm text-gray-500 mt-1">Starting target for Day 1</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Daily Increment (points)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={settingsForm.daily_increment || ''}
                                onChange={(e) => setSettingsForm(prev => ({
                                  ...prev,
                                  daily_increment: parseInt(e.target.value) || 0
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 25"
                              />
                              <p className="text-sm text-gray-500 mt-1">Points added each day</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Penalty Amount ($)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={settingsForm.penalty_amount || ''}
                                onChange={(e) => setSettingsForm(prev => ({
                                  ...prev,
                                  penalty_amount: parseFloat(e.target.value) || 0
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 10.00"
                              />
                              <p className="text-sm text-gray-500 mt-1">Penalty for missing daily target</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Recovery Percentage (%)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={settingsForm.recovery_percentage || ''}
                                onChange={(e) => setSettingsForm(prev => ({
                                  ...prev,
                                  recovery_percentage: parseInt(e.target.value) || 0
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 25"
                              />
                              <p className="text-sm text-gray-500 mt-1">Recovery exercise bonus percentage</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>Click "Edit Settings" to modify group settings</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}