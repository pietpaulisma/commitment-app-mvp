import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    console.log('TEST: Starting test endpoint')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user is admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized', step: 'auth_header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', step: 'auth_user', authError: authError?.message }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, group_id, username')
      .eq('id', user.id)
      .single()

    if (!profile || !['group_admin', 'supreme_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden', step: 'role_check', role: profile?.role }, { status: 403 })
    }

    if (!profile.group_id) {
      return NextResponse.json({ error: 'No group', step: 'group_check' }, { status: 400 })
    }

    // Test: Get members
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('group_id', profile.group_id)

    if (membersError) {
      return NextResponse.json({ error: 'Members query failed', step: 'members', details: membersError.message }, { status: 500 })
    }

    // Test: Get group settings
    const { data: groupSettings, error: settingsError } = await supabase
      .from('group_settings')
      .select('rest_days, recovery_days')
      .eq('group_id', profile.group_id)
      .single()

    if (settingsError) {
      return NextResponse.json({ error: 'Settings query failed', step: 'settings', details: settingsError.message }, { status: 500 })
    }

    // Test: Get groups data
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('start_date')
      .eq('id', profile.group_id)
      .single()

    if (groupError) {
      return NextResponse.json({ error: 'Group query failed', step: 'group_data', details: groupError.message }, { status: 500 })
    }

    // Test: RPC call
    const { error: rpcError } = await supabase.rpc('insert_system_message_to_chat', {
      p_group_id: profile.group_id,
      p_message: 'Test message from test endpoint'
    })

    if (rpcError) {
      return NextResponse.json({ error: 'RPC call failed', step: 'rpc', details: rpcError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        user: user.id,
        profile: profile.username,
        groupId: profile.group_id,
        membersCount: members?.length || 0,
        hasSettings: !!groupSettings,
        hasGroupData: !!groupData,
        rpcWorked: true
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('TEST: Error:', errorMessage, errorStack)
    return NextResponse.json({
      error: 'Internal server error',
      message: errorMessage,
      stack: errorStack
    }, { status: 500 })
  }
}
