import { supabase } from '@/lib/supabase'
import { 
  SystemMessage, 
  SystemMessageType, 
  SystemMessageRarity,
  DailySummaryMetadata,
  MilestoneMetadata,
  DeveloperNoteMetadata,
  PublicMessageMetadata
} from '@/types/systemMessages'

export class SystemMessageService {
  
  static async createSystemMessage(
    groupId: string,
    messageType: SystemMessageType,
    rarity: SystemMessageRarity,
    title: string,
    content: string,
    metadata: Record<string, any> = {},
    senderName?: string
  ): Promise<SystemMessage | null> {
    try {
      const { data, error } = await supabase.rpc('insert_system_message_to_chat', {
        p_group_id: groupId,
        p_message_type: messageType,
        p_rarity: rarity,
        p_title: title,
        p_content: content,
        p_metadata: metadata,
        p_sender_name: senderName
      })

      if (error) throw error

      // Fetch the created system message
      const { data: systemMessage, error: fetchError } = await supabase
        .from('system_messages')
        .select('*')
        .eq('id', data)
        .single()

      if (fetchError) throw fetchError

      return systemMessage
    } catch (error) {
      console.error('Error creating system message:', error)
      return null
    }
  }

  static async generateDailySummary(groupId: string): Promise<SystemMessage | null> {
    try {
      const { data, error } = await supabase.rpc('generate_daily_summary', {
        p_group_id: groupId
      })

      if (error) throw error

      // Fetch the created system message
      const { data: systemMessage, error: fetchError } = await supabase
        .from('system_messages')
        .select('*')
        .eq('id', data)
        .single()

      if (fetchError) throw fetchError

      return systemMessage
    } catch (error) {
      console.error('Error generating daily summary:', error)
      return null
    }
  }

  // Challenge functionality has been removed - use public messages or developer notes instead

  static async createMilestone(
    groupId: string,
    milestoneType: 'pot_amount' | 'group_streak' | 'total_points' | 'member_count',
    value: number,
    previousValue?: number,
    rarity: SystemMessageRarity = 'legendary'
  ): Promise<SystemMessage | null> {
    const metadata: MilestoneMetadata = {
      milestone_type: milestoneType,
      milestone_value: value,
      previous_value: previousValue
    }

    let title = ''
    let content = ''

    switch (milestoneType) {
      case 'pot_amount':
        title = `Pot Alert! €${value} Reached! 🚨`
        content = `💰 **MILESTONE REACHED!** 💰

The group pot has hit €${value}! 🎉

${value >= 1000 ? 
  'This is a LEGENDARY milestone! You\'ve all been absolutely crushing your commitments!' :
  value >= 500 ?
  'This is an incredible achievement - you\'ve all been smashing your goals!' :
  'Great progress everyone! The pot is growing strong!'
}

Keep up the amazing work, team! 💪`
        break

      case 'group_streak':
        title = `${value} Day Group Streak! 🔥`
        content = `🔥 **STREAK MILESTONE!** 🔥

The group has maintained a ${value}-day commitment streak! 

${value >= 30 ? 
  'This is LEGENDARY dedication! A full month of crushing goals!' :
  value >= 14 ?
  'Two weeks of pure commitment! You\'re all unstoppable!' :
  value >= 7 ?
  'One week strong! The momentum is real!' :
  'The streak is building! Keep it going!'
}

Don't break the chain! 🏆`
        break

      case 'total_points':
        title = `${value.toLocaleString()} Total Points! ⭐`
        content = `⭐ **POINTS MILESTONE!** ⭐

The group has collectively earned ${value.toLocaleString()} points! 

${value >= 10000 ? 
  'LEGENDARY achievement! Over 10K points of pure dedication!' :
  value >= 5000 ?
  'Incredible! 5K+ points shows serious commitment!' :
  value >= 1000 ?
  'Amazing milestone! Over 1K points earned together!' :
  'Great progress! The points are adding up!'
}

Every point counts! 💪`
        break

      case 'member_count':
        title = `${value} Members Strong! 👥`
        content = `👥 **GROWTH MILESTONE!** 👥

The group now has ${value} committed members! 

${value >= 20 ? 
  'LEGENDARY community! 20+ dedicated individuals!' :
  value >= 10 ?
  'Double digits! This community is growing strong!' :
  value >= 5 ?
  'Great group size! More motivation, more success!' :
  'The team is growing!'
}

Welcome to all our new members! 🎉`
        break
    }

    return this.createSystemMessage(
      groupId,
      'milestone',
      rarity,
      title,
      content,
      metadata
    )
  }

  static async createDeveloperNote(
    groupId: string,
    note: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    category?: string
  ): Promise<SystemMessage | null> {
    const metadata: DeveloperNoteMetadata = {
      priority,
      category
    }

    const priorityEmoji = priority === 'high' ? '🚨' : priority === 'medium' ? '📢' : '💭'
    const title = `Developer Note${category ? ` - ${category}` : ''}`
    
    const content = `${priorityEmoji} **Developer Update** ${priorityEmoji}

${note}

${priority === 'high' ? 
  '⚠️ This is a high priority update that may affect your experience.' :
  priority === 'medium' ?
  'ℹ️ Important information for all group members.' :
  '💡 Just a friendly update from the development team.'
}

Thanks for your attention! 🙏`

    return this.createSystemMessage(
      groupId,
      'developer_note',
      'common',
      title,
      content,
      metadata
    )
  }

  static async getSystemMessages(
    groupId: string,
    messageType?: SystemMessageType,
    rarity?: SystemMessageRarity,
    limit: number = 50
  ): Promise<SystemMessage[]> {
    try {
      let query = supabase
        .from('system_messages')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (messageType) {
        query = query.eq('message_type', messageType)
      }

      if (rarity) {
        query = query.eq('rarity', rarity)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching system messages:', error)
      return []
    }
  }

  static async updateSystemSenderName(groupId: string, senderName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('groups')
        .update({ system_sender_name: senderName })
        .eq('id', groupId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error updating system sender name:', error)
      return false
    }
  }

  static async getSystemSenderName(groupId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('system_sender_name')
        .eq('id', groupId)
        .single()

      if (error) throw error

      return data?.system_sender_name || 'Barry'
    } catch (error) {
      console.error('Error fetching system sender name:', error)
      return 'Barry'
    }
  }

  static async deleteSystemMessage(messageId: string): Promise<boolean> {
    try {
      // First delete the chat message
      const { error: chatError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('system_message_id', messageId)

      if (chatError) throw chatError

      // Then delete the system message
      const { error } = await supabase
        .from('system_messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error deleting system message:', error)
      return false
    }
  }
}