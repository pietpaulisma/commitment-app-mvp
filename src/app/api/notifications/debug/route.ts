import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase with service role for admin operations
const getSupabaseClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
    }

    // Get push subscriptions for the user
    const supabase = getSupabaseClient()
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    // Analyze subscriptions
    const analysis = subscriptions?.map(sub => ({
      id: sub.id,
      created_at: sub.created_at,
      endpoint_type: getEndpointType(sub.endpoint),
      endpoint_preview: sub.endpoint.substring(0, 60) + '...',
      has_auth: !!sub.auth,
      has_p256dh: !!sub.p256dh,
      auth_length: sub.auth?.length || 0,
      p256dh_length: sub.p256dh?.length || 0
    })) || []

    const summary = {
      total_subscriptions: subscriptions?.length || 0,
      by_type: {
        google_fcm: analysis.filter(s => s.endpoint_type === 'Google FCM').length,
        mozilla: analysis.filter(s => s.endpoint_type === 'Mozilla').length,
        apple: analysis.filter(s => s.endpoint_type === 'Apple').length,
        other: analysis.filter(s => s.endpoint_type === 'Other').length
      },
      oldest_subscription: subscriptions?.[0]?.created_at,
      newest_subscription: subscriptions?.[subscriptions.length - 1]?.created_at
    }

    return NextResponse.json({
      userId,
      summary,
      subscriptions: analysis,
      debug_info: {
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
      }
    })

  } catch (error) {
    console.error('Error in notification debug API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

function getEndpointType(endpoint: string): string {
  if (endpoint.includes('fcm.googleapis.com')) return 'Google FCM'
  if (endpoint.includes('mozilla.com')) return 'Mozilla'
  if (endpoint.includes('apple.com')) return 'Apple'
  return 'Other'
}