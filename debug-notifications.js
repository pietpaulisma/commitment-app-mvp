// Debug script to test workout completion notifications
// Run this in browser console after logging a workout

async function debugWorkoutNotifications() {
  console.log('🔍 Debugging workout completion notifications...')
  
  try {
    // Check current user and group
    const { data: { user } } = await window.supabase.auth.getUser()
    if (!user) {
      console.error('❌ No authenticated user')
      return
    }
    
    const { data: profile } = await window.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    console.log('👤 Current user:', {
      id: user.id,
      email: user.email,
      username: profile?.username,
      group_id: profile?.group_id
    })
    
    // Check notification preferences
    const { data: prefs } = await window.supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    console.log('🔔 Notification preferences:', prefs)
    
    // Check notification subscriptions
    const { data: subscriptions } = await window.supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', user.id)
    
    console.log('📱 Notification subscriptions:', subscriptions)
    
    // Check recent workout completion messages
    const { data: workoutMessages } = await window.supabase
      .from('chat_messages')
      .select('*')
      .eq('group_id', profile.group_id)
      .eq('message_type', 'workout_completion')
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log('🏋️ Recent workout completion messages:', workoutMessages)
    
    // Test notification API directly
    console.log('🧪 Testing notification API...')
    const testResponse = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds: [user.id],
        title: '🧪 Debug Test',
        body: 'Testing workout completion notifications',
        data: { type: 'debug_test' }
      })
    })
    
    const testResult = await testResponse.json()
    console.log('📡 Test notification result:', {
      status: testResponse.status,
      ok: testResponse.ok,
      result: testResult
    })
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

// Auto-run the debug
debugWorkoutNotifications()