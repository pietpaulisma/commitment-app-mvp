import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase with service role for admin operations
const getSupabaseClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking current penalty amounts...')

    const supabase = getSupabaseClient()

    // Get all users with their penalty amounts
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, email, total_penalty_owed, group_id')
      .not('group_id', 'is', null)
      .order('username')

    if (error) {
      console.error('❌ Error fetching profiles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const usernames = ['Stephan', 'Pauli', 'derfriesinger', 'Peter', 'Matthijs', 'Marius', 'Harry', 'Roel']
    const filteredProfiles = profiles?.filter(p =>
      usernames.includes(p.username) ||
      p.username.toLowerCase().includes('sven') ||
      p.username.toLowerCase().includes('fries')
    )

    return NextResponse.json({
      message: 'Current penalty amounts',
      count: filteredProfiles?.length || 0,
      users: filteredProfiles?.map(p => ({
        username: p.username,
        email: p.email,
        penaltyOwed: p.total_penalty_owed || 0,
        groupId: p.group_id
      })),
      allUsers: profiles?.map(p => ({
        username: p.username,
        penaltyOwed: p.total_penalty_owed || 0
      }))
    })

  } catch (error) {
    console.error('❌ Check penalties failed:', error)
    return NextResponse.json(
      {
        error: 'Check penalties failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
