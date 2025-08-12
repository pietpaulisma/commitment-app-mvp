import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Create supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await request.json()
    
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 })
    }

    // Get current user's penalty debt
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('total_penalty_owed')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const currentDebt = profile.total_penalty_owed || 0
    const paymentAmount = Math.min(amount, currentDebt) // Don't overpay
    const newDebt = Math.max(0, currentDebt - paymentAmount)

    // Update profile with payment
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        total_penalty_owed: newDebt,
        last_donation_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      paymentRecorded: paymentAmount,
      remainingDebt: newDebt,
      message: paymentAmount < amount 
        ? `Payment of €${paymentAmount} recorded (limited to current debt)`
        : `Payment of €${paymentAmount} recorded successfully`
    })

  } catch (error) {
    console.error('Payment recording error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}