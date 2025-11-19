import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

export async function GET(request: NextRequest) {
  try {
    // Test VAPID key format and compatibility
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
    const vapidEmail = (process.env.VAPID_EMAIL || 'admin@commitment-app.com').trim()

    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    const analysis = {
      publicKey: {
        length: publicKey.length,
        startsWithB: publicKey.startsWith('B'),
        format: publicKey.length === 87 ? 'Likely P-256 ECDSA (base64url)' : 'Unknown format',
        preview: publicKey.substring(0, 20) + '...'
      },
      privateKey: {
        length: privateKey.length,
        format: privateKey.length === 43 ? 'Likely P-256 ECDSA (base64url)' : 'Unknown format',
        preview: privateKey.substring(0, 20) + '...'
      },
      vapidEmail: {
        email: vapidEmail,
        formatCheck: vapidEmail.includes('@') && vapidEmail.includes('.'),
        length: vapidEmail.length
      }
    }

    // Test VAPID setup
    let vapidTestResult = null
    try {
      const vapidSubject = `mailto:${vapidEmail}`
      webpush.setVapidDetails(vapidSubject, publicKey, privateKey)
      vapidTestResult = { success: true, message: 'VAPID setup successful' }
    } catch (error: any) {
      vapidTestResult = { success: false, error: error.message }
    }

    // Check if keys look like Apple-compatible P-256 ECDSA
    const appleCompatibility = {
      publicKeyFormat: publicKey.length === 87 && publicKey.startsWith('B'),
      privateKeyFormat: privateKey.length === 43,
      emailFormat: vapidEmail.includes('@'),
      overallCompatible: publicKey.length === 87 && privateKey.length === 43 && vapidEmail.includes('@')
    }

    return NextResponse.json({
      analysis,
      vapidTestResult,
      appleCompatibility,
      recommendations: appleCompatibility.overallCompatible ?
        ['Keys appear Apple-compatible'] :
        [
          !appleCompatibility.publicKeyFormat ? 'Public key should be 87 chars P-256 ECDSA' : '',
          !appleCompatibility.privateKeyFormat ? 'Private key should be 43 chars P-256 ECDSA' : '',
          !appleCompatibility.emailFormat ? 'Email should be valid email address' : ''
        ].filter(Boolean),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in VAPID test:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}