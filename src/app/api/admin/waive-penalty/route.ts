import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Admin endpoint to waive (approve) a disputed penalty
 * Sets status to 'waived' and posts a system message to chat
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, group_id, username')
      .eq('id', user.id)
      .single()

    if (!profile || !['group_admin', 'supreme_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Get penalty ID from request
    const { penalty_id } = await request.json()

    if (!penalty_id) {
      return NextResponse.json({ error: 'penalty_id is required' }, { status: 400 })
    }

    // Get the penalty to waive
    const { data: penalty, error: penaltyError } = await supabase
      .from('pending_penalties')
      .select('*, profiles!inner(username)')
      .eq('id', penalty_id)
      .single()

    if (penaltyError || !penalty) {
      return NextResponse.json({ error: 'Penalty not found' }, { status: 404 })
    }

    // Verify penalty is in the admin's group
    if (penalty.group_id !== profile.group_id) {
      return NextResponse.json({ error: 'Cannot waive penalty from another group' }, { status: 403 })
    }

    // Verify penalty is disputed (can only waive disputed penalties)
    if (penalty.status !== 'disputed') {
      return NextResponse.json({ error: 'Can only waive disputed penalties' }, { status: 400 })
    }

    // Update penalty status to waived
    const { error: updateError } = await supabase
      .from('pending_penalties')
      .update({ 
        status: 'waived',
        waived_at: new Date().toISOString(),
        waived_by: user.id
      })
      .eq('id', penalty_id)

    if (updateError) {
      console.error('Error waiving penalty:', updateError)
      return NextResponse.json({ error: 'Failed to waive penalty' }, { status: 500 })
    }

    // Post system message to chat
    const penaltyUsername = (penalty.profiles as any).username
    await supabase
      .from('chat_messages')
      .insert({
        group_id: penalty.group_id,
        user_id: null,
        message: `✅ ${profile.username} approved ${penaltyUsername}'s dispute - penalty waived`,
        message_type: 'text',
        is_system_message: true
      })

    return NextResponse.json({
      success: true,
      message: `Penalty waived for ${penaltyUsername}`
    })

  } catch (error) {
    console.error('Error in waive-penalty:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

