import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getReasonLabel } from '@/utils/penaltyHelpers'
import type { PenaltyResponse, RespondToPenaltyResponse } from '@/types/penalties'

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse request body
    const body: PenaltyResponse = await request.json()
    const { penalty_id, action, reason_category, reason_message } = body

    if (!penalty_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch the penalty
    const { data: penalty, error: penaltyError } = await supabase
      .from('pending_penalties')
      .select('*')
      .eq('id', penalty_id)
      .eq('user_id', user.id)
      .single()

    if (penaltyError || !penalty) {
      return NextResponse.json({ error: 'Penalty not found' }, { status: 404 })
    }

    // Verify penalty is still pending
    if (penalty.status !== 'pending') {
      return NextResponse.json({ error: 'Penalty already responded to' }, { status: 400 })
    }

    const isExpired = new Date(penalty.deadline) < new Date()

    // Only block DISPUTES after deadline - accepts should always be allowed
    // (User can always pay the fine, but can't dispute after the deadline)
    if (isExpired && action === 'dispute') {
      return NextResponse.json({ error: 'Deadline has passed - disputes are no longer allowed' }, { status: 400 })
    }

    let chatMessageId = ''

    if (action === 'accept') {
      // ACCEPT PENALTY

      // 1. Update penalty status
      await supabase
        .from('pending_penalties')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', penalty_id)

      // 2. Create payment transaction
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          group_id: penalty.group_id,
          amount: penalty.penalty_amount,
          transaction_type: 'penalty',
          description: `Penalty accepted: Missed target (${penalty.actual_points}/${penalty.target_points} pts) on ${penalty.date}`
        })

      if (transactionError) {
        throw transactionError
      }

      // 3. Update user's total penalty owed
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('total_penalty_owed')
        .eq('id', user.id)
        .single()

      const newTotal = (currentProfile?.total_penalty_owed || 0) + penalty.penalty_amount

      await supabase
        .from('profiles')
        .update({ total_penalty_owed: newTotal })
        .eq('id', user.id)

      // 4. Post to group chat as system message
      const { data: chatData } = await supabase
        .from('chat_messages')
        .insert({
          group_id: penalty.group_id,
          user_id: null,
          message: `${profile.username} accepted penalty: €${penalty.penalty_amount} added to pot`,
          message_type: 'text',
          is_system_message: true
        })
        .select('id')
        .single()

      chatMessageId = chatData?.id || ''

      const response: RespondToPenaltyResponse = {
        success: true,
        action: 'accepted',
        message: 'Penalty accepted',
        chatMessageId
      }

      return NextResponse.json(response)

    } else if (action === 'dispute') {
      // DISPUTE PENALTY

      // Validate reason
      if (!reason_category || !reason_message || reason_message.trim().length === 0) {
        return NextResponse.json({ error: 'Reason category and message required for disputes' }, { status: 400 })
      }

      // 1. Update penalty status
      await supabase
        .from('pending_penalties')
        .update({
          status: 'disputed',
          responded_at: new Date().toISOString(),
          reason_category,
          reason_message: reason_message.trim()
        })
        .eq('id', penalty_id)

      // 2. Post to group chat as system message
      const reasonLabel = getReasonLabel(reason_category)
      const { data: chatData } = await supabase
        .from('chat_messages')
        .insert({
          group_id: penalty.group_id,
          user_id: null,
          message: `${profile.username} disputed penalty (${reasonLabel}): "${reason_message.trim()}"`,
          message_type: 'text',
          is_system_message: true
        })
        .select('id')
        .single()

      chatMessageId = chatData?.id || ''

      const response: RespondToPenaltyResponse = {
        success: true,
        action: 'disputed',
        message: 'Reason submitted to group',
        chatMessageId
      }

      return NextResponse.json(response)

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error responding to penalty:', error)
    return NextResponse.json(
      {
        error: 'Failed to respond to penalty',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
