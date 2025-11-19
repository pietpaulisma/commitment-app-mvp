import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase with service role for admin operations
const getSupabaseClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // This is a one-time admin operation
    // You can add authentication here if needed
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET

    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔧 Starting penalty amount corrections...')

    const supabase = getSupabaseClient()

    // Define the correct penalty amounts
    const corrections = [
      { username: 'Stephan', amount: 330 },
      { username: 'Pauli', amount: 310 },
      { username: 'derfriesinger', amount: 340 }, // Sven
      { username: 'Peter', amount: 270 },
      { username: 'Matthijs', amount: 140 },
      { username: 'Marius', amount: 170 },
      { username: 'Harry', amount: 80 },
      { username: 'Roel', amount: 70 }
    ]

    const results = []

    for (const correction of corrections) {
      try {
        // Get user's current penalty amount
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('id, username, total_penalty_owed')
          .eq('username', correction.username)
          .single()

        if (fetchError || !profile) {
          console.error(`❌ User not found: ${correction.username}`)
          results.push({
            username: correction.username,
            success: false,
            error: 'User not found'
          })
          continue
        }

        const oldAmount = profile.total_penalty_owed || 0

        // Update the penalty amount
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ total_penalty_owed: correction.amount })
          .eq('id', profile.id)

        if (updateError) {
          console.error(`❌ Failed to update ${correction.username}:`, updateError)
          results.push({
            username: correction.username,
            success: false,
            error: updateError.message
          })
          continue
        }

        console.log(`✅ ${correction.username}: €${oldAmount} → €${correction.amount}`)
        results.push({
          username: correction.username,
          success: true,
          oldAmount,
          newAmount: correction.amount,
          difference: correction.amount - oldAmount
        })

      } catch (error) {
        console.error(`❌ Error processing ${correction.username}:`, error)
        results.push({
          username: correction.username,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalCorrected = results
      .filter(r => r.success && r.difference)
      .reduce((sum, r) => sum + r.difference, 0)

    return NextResponse.json({
      message: 'Penalty amount corrections completed',
      successCount,
      totalCount: corrections.length,
      totalCorrected,
      results
    })

  } catch (error) {
    console.error('❌ Penalty correction failed:', error)
    return NextResponse.json(
      {
        error: 'Penalty correction failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
