import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SystemMessageService } from '@/services/systemMessages'

// Initialize Supabase with service role for admin operations
const getSupabaseClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!authHeader || authHeader !== expectedAuth) {
      console.log('Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting daily summary generation...')

    // Initialize Supabase client at runtime
    const supabase = getSupabaseClient()

    // Get daily summary configuration
    const { data: config, error: configError } = await supabase
      .from('daily_summary_config')
      .select('*')
      .limit(1)
      .single()

    if (configError || !config) {
      console.log('Daily summary config not found or disabled')
      return NextResponse.json({ message: 'Daily summary not configured' })
    }

    // Check if daily summaries are enabled
    if (!config.enabled) {
      console.log('Daily summaries are disabled')
      return NextResponse.json({ message: 'Daily summaries disabled' })
    }

    // Get current day of week (1=Monday, 7=Sunday)
    const today = new Date()
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay() // Convert Sunday from 0 to 7

    // Check if today is a configured send day
    if (!config.send_days || !config.send_days.includes(dayOfWeek)) {
      console.log(`Daily summary not scheduled for day ${dayOfWeek}`)
      return NextResponse.json({ message: `Daily summary not scheduled for today (day ${dayOfWeek})` })
    }

    // Get all active groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name')
      .not('id', 'is', null)

    if (groupsError) {
      throw groupsError
    }

    if (!groups || groups.length === 0) {
      console.log('No active groups found')
      return NextResponse.json({ message: 'No active groups to send summaries to' })
    }

    console.log(`Generating daily summaries for ${groups.length} groups...`)

    let totalSummariesSent = 0
    const summaryResults = []

    for (const group of groups) {
      try {
        console.log(`Generating daily summary for group: ${group.name} (${group.id})`)

        // Generate daily summary for this group
        const systemMessage = await SystemMessageService.generateDailySummary(group.id)

        if (systemMessage) {
          totalSummariesSent++
          summaryResults.push({
            groupId: group.id,
            groupName: group.name,
            messageId: systemMessage.id,
            success: true
          })

          console.log(`Daily summary sent to group: ${group.name}`)
        } else {
          console.log(`Failed to generate daily summary for group: ${group.name}`)
          summaryResults.push({
            groupId: group.id,
            groupName: group.name,
            success: false,
            error: 'Failed to generate summary'
          })
        }

      } catch (error) {
        console.error(`Error generating summary for group ${group.name}:`, error)
        summaryResults.push({
          groupId: group.id,
          groupName: group.name,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const result = {
      message: 'Daily summary generation completed',
      date: today.toISOString().split('T')[0],
      groupsProcessed: groups.length,
      summariesSent: totalSummariesSent,
      results: summaryResults
    }

    console.log('Daily summary result:', result)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Daily summary generation failed:', error)
    return NextResponse.json(
      { 
        error: 'Daily summary generation failed',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    )
  }
}