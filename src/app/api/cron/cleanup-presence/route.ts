import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Only allow cron jobs or requests with proper authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create Supabase client with environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate cutoff time (5 minutes ago)
    const cutoffTime = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // Update users who haven't been seen in 5+ minutes to offline
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_online: false })
      .lt('last_seen', cutoffTime)
      .eq('is_online', true)
      .select('id, username')

    if (error) {
      console.error('Error cleaning up presence:', error)
      return NextResponse.json({ error: 'Failed to cleanup presence' }, { status: 500 })
    }

    const cleanedUpCount = data?.length || 0
    console.log(`Cleaned up ${cleanedUpCount} stale online users`)

    return NextResponse.json({
      success: true,
      cleaned_up_users: cleanedUpCount,
      cutoff_time: cutoffTime
    })

  } catch (error) {
    console.error('Presence cleanup cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}