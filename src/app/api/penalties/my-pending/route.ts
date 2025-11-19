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

    // Enrich penalties with computed fields
    const enrichedPenalties = (penalties || []).map(p => enrichPenalty(p as PendingPenalty))

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
