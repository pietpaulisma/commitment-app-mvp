import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Initialize Supabase with service role for admin operations
const getSupabaseClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Configure web-push with VAPID keys at runtime
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
      const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
      
      // Fix VAPID email format - ensure no spaces after mailto: (Apple requirement)
      const vapidEmail = (process.env.VAPID_EMAIL || 'admin@commitment-app.com').trim()
      const vapidSubject = `mailto:${vapidEmail}`
      
      console.log('🍎 VAPID Details for Apple test:', {
        vapidEmail: vapidEmail,
        vapidSubject: vapidSubject,
        hasSpaceAfterMailto: vapidSubject.includes('mailto: '), // Should be false
        vapidSubjectLength: vapidSubject.length
      })
      
      webpush.setVapidDetails(
        vapidSubject,
        publicKey,
        privateKey
      )
    } else {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Get only Apple push subscriptions for the user
    const supabase = getSupabaseClient()
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .eq('user_id', userId)
      .ilike('endpoint', '%web.push.apple.com%')

    if (subError) {
      console.error('Error fetching Apple subscriptions:', subError)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No Apple subscriptions found', sent: 0 })
    }

    console.log(`🍎 Testing ${subscriptions.length} Apple subscriptions`)

    // Very minimal payload for Apple compatibility testing
    const payload = JSON.stringify({
      title: 'Apple Direct Test',
      body: 'Minimal Apple notification test'
    })

    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        }

        console.log(`🍎 Sending to Apple endpoint: ${subscription.endpoint.substring(0, 60)}...`)

        await webpush.sendNotification(pushSubscription, payload, {
          TTL: 3600, // 1 hour for Apple
          urgency: 'high' // High urgency for immediate delivery
          // No topic for Apple
        })

        console.log(`✅ Apple notification sent successfully`)
        return { userId: subscription.user_id, success: true, endpoint: 'Apple' }
      } catch (error: any) {
        console.error(`❌ Apple notification failed:`, {
          error: error.message,
          statusCode: error.statusCode,
          endpoint: subscription.endpoint.substring(0, 60) + '...'
        })
        return { userId: subscription.user_id, success: false, error: error.message, endpoint: 'Apple' }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`🍎 Apple notification test complete: ${successCount} successful, ${failureCount} failed`)

    return NextResponse.json({
      message: 'Apple notifications processed',
      sent: successCount,
      failed: failureCount,
      total_apple_subscriptions: subscriptions.length,
      results: results
    })

  } catch (error) {
    console.error('Error in Apple notification test:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}