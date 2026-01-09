import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enrichPenalty } from '@/utils/penaltyHelpers'
import type { MyPendingResponse, PendingPenalty } from '@/types/penalties'

export async function GET(request: NextRequest) {
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

    // Fetch all pending penalties for this user
    const { data: penalties, error: penaltiesError } = await supabase
      .from('pending_penalties')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('date', { ascending: true })

    if (penaltiesError) {
      throw penaltiesError
    }

    if (!penalties || penalties.length === 0) {
      return NextResponse.json({ penalties: [] })
    }

    // Get all dates from the penalties
    const penaltyDates = penalties.map(p => p.date)

    // Check which of these dates the user was in sick mode
    const { data: sickDays } = await supabase
      .from('sick_mode')
      .select('date')
      .eq('user_id', user.id)
      .in('date', penaltyDates)

    const sickDaySet = new Set(sickDays?.map(s => s.date) || [])

    // Auto-dismiss penalties for sick days
    const penaltiesToDismiss = penalties.filter(p => sickDaySet.has(p.date))
    const validPenalties = penalties.filter(p => !sickDaySet.has(p.date))

    // Delete the erroneous sick-day penalties
    if (penaltiesToDismiss.length > 0) {
      const idsToDelete = penaltiesToDismiss.map(p => p.id)
      console.log(`[my-pending] Auto-dismissing ${idsToDelete.length} penalties for sick days:`, penaltiesToDismiss.map(p => p.date))
      
      await supabase
        .from('pending_penalties')
        .delete()
        .in('id', idsToDelete)
    }

    // Enrich remaining valid penalties with computed fields
    const enrichedPenalties = validPenalties.map(p => enrichPenalty(p as PendingPenalty))

    const response: MyPendingResponse = {
      penalties: enrichedPenalties
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching pending penalties:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch pending penalties',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
