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
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.trim()
      const privateKey = process.env.VAPID_PRIVATE_KEY.trim()
      const vapidEmail = (process.env.VAPID_EMAIL || 'notifications@commitment-app.com').trim()
      
      webpush.setVapidDetails(
        `mailto:${vapidEmail}`,
        publicKey,
        privateKey
      )
    } else {
      console.warn('VAPID keys not configured - push notifications will not work')
      return NextResponse.json({ error: 'Push notifications not configured' }, { status: 500 })
    }

    const requestBody = await request.json()
    const { userIds, title, body: notificationBody, data } = requestBody

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid userIds provided' }, { status: 400 })
    }

    if (!title || !notificationBody) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 })
    }

    // Get push subscriptions for the specified users
    const supabase = getSupabaseClient()
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', userIds)

    if (subError) {
      console.error('Error fetching subscriptions:', subError)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for users:', userIds)
      return NextResponse.json({ message: 'No subscriptions found', sent: 0 })
    }

    // Create base payload for web-push
    const payload = JSON.stringify({
      title,
      body: notificationBody,
      data,
      type: data?.type || 'general',
      timestamp: Date.now()
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

        // Apple push notifications have different requirements
        const isApplePush = subscription.endpoint.includes('web.push.apple.com')
        
        const pushOptions: { TTL: number; urgency: string; topic?: string } = {
          TTL: isApplePush ? 3600 : 86400,
          urgency: isApplePush ? 'high' : 'normal'
        }
        
        // Add topic only for non-Apple endpoints
        if (!isApplePush) {
          pushOptions.topic = data?.type || 'general'
        }
        
        await webpush.sendNotification(pushSubscription, payload, pushOptions)
        console.log(`✅ Notification sent to user: ${subscription.user_id}`)
        return { userId: subscription.user_id, success: true }
      } catch (error: any) {
        console.error(`❌ Failed to send notification to user ${subscription.user_id}:`, error.message)

        // Handle expired/invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Removing invalid subscription for user: ${subscription.user_id}`)
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', subscription.user_id)
            .eq('endpoint', subscription.endpoint)
        }

        return { userId: subscription.user_id, success: false, error: error.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`Notification sending complete: ${successCount} successful, ${failureCount} failed`)

    return NextResponse.json({
      message: 'Notifications processed',
      sent: successCount,
      failed: failureCount,
      results
    })

  } catch (error) {
    console.error('Error in notification send API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// Helper function for sending notifications (can be used by other API routes)
export async function sendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: any
): Promise<{ sent: number; failed: number }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userIds,
        title,
        body,
        data
      })
    })

    const result = await response.json()
    return { sent: result.sent || 0, failed: result.failed || 0 }
  } catch (error) {
    console.error('Error calling notification send API:', error)
    return { sent: 0, failed: userIds.length }
  }
}
