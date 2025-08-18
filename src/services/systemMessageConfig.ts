import { supabase } from '@/lib/supabase'
import { SystemMessageTypeConfig, GlobalSystemMessageConfig, SystemMessageType, SystemMessageRarity, DailySummaryConfig, MilestoneConfig } from '@/types/systemMessages'

export class SystemMessageConfigService {
  
  static async getGlobalConfig(): Promise<GlobalSystemMessageConfig | null> {
    try {
      // Get global settings
      const { data: globalSettings, error: globalError } = await supabase
        .from('global_system_settings')
        .select('*')
        .limit(1)
        .single()

      if (globalError) throw globalError

      // Get message type configs
      const { data: messageConfigs, error: configError } = await supabase
        .from('system_message_configs')
        .select('*')
        .order('message_type')

      if (configError) throw configError

      const messageTypeConfigs: SystemMessageTypeConfig[] = messageConfigs?.map(config => ({
        message_type: config.message_type as SystemMessageType,
        enabled: config.enabled,
        default_rarity: config.default_rarity as SystemMessageRarity,
        description: config.description,
        can_be_automated: config.can_be_automated,
        frequency: config.frequency as 'daily' | 'weekly' | 'on_event' | 'manual'
      })) || []

      return {
        id: globalSettings.id,
        is_globally_enabled: globalSettings.is_globally_enabled,
        created_at: globalSettings.created_at,
        updated_at: globalSettings.updated_at,
        message_type_configs: messageTypeConfigs
      }
    } catch (error) {
      console.error('Error fetching global system message config:', error)
      return null
    }
  }

  static async updateGlobalEnabled(enabled: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('global_system_settings')
        .update({ 
          is_globally_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.from('global_system_settings').select('id').limit(1).single()).data?.id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error updating global system message setting:', error)
      return false
    }
  }

  static async updateMessageTypeConfig(
    messageType: SystemMessageType,
    updates: Partial<Pick<SystemMessageTypeConfig, 'enabled' | 'default_rarity'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_message_configs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('message_type', messageType)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error updating message type config:', error)
      return false
    }
  }

  static async getMessageTypeStats(): Promise<{
    total_messages: number
    messages_by_type: { [key: string]: number }
    messages_by_rarity: { [key: string]: number }
    recent_activity: { date: string; count: number }[]
  } | null> {
    try {
      // Get total messages
      const { count: totalMessages } = await supabase
        .from('system_messages')
        .select('id', { count: 'exact' })

      // Get messages by type
      const { data: typeStats } = await supabase
        .from('system_messages')
        .select('message_type')
        .order('message_type')

      // Get messages by rarity
      const { data: rarityStats } = await supabase
        .from('system_messages')
        .select('rarity')
        .order('rarity')

      // Get recent activity (last 7 days)
      const { data: recentActivity } = await supabase
        .from('system_messages')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      // Process the data
      const messagesByType: { [key: string]: number } = {}
      typeStats?.forEach(item => {
        messagesByType[item.message_type] = (messagesByType[item.message_type] || 0) + 1
      })

      const messagesByRarity: { [key: string]: number } = {}
      rarityStats?.forEach(item => {
        messagesByRarity[item.rarity] = (messagesByRarity[item.rarity] || 0) + 1
      })

      // Process recent activity by day
      const activityByDay: { [key: string]: number } = {}
      recentActivity?.forEach(item => {
        const date = new Date(item.created_at).toDateString()
        activityByDay[date] = (activityByDay[date] || 0) + 1
      })

      const recentActivityArray = Object.entries(activityByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      return {
        total_messages: totalMessages || 0,
        messages_by_type: messagesByType,
        messages_by_rarity: messagesByRarity,
        recent_activity: recentActivityArray
      }
    } catch (error) {
      console.error('Error fetching message type stats:', error)
      return null
    }
  }

  static async testSystemMessage(
    groupId: string,
    messageType: SystemMessageType,
    content: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('insert_system_message_to_chat', {
        p_group_id: groupId,
        p_message_type: messageType,
        p_rarity: null, // Use default
        p_title: `Test ${messageType.replace('_', ' ')}`,
        p_content: content
      })

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error sending test system message:', error)
      return false
    }
  }

  static async isMessageTypeEnabled(messageType: SystemMessageType): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_message_type_enabled', {
        p_message_type: messageType
      })

      if (error) throw error

      return data || false
    } catch (error) {
      console.error('Error checking if message type is enabled:', error)
      return false
    }
  }

  static async getDefaultRarity(messageType: SystemMessageType): Promise<SystemMessageRarity> {
    try {
      const { data, error } = await supabase.rpc('get_default_rarity', {
        p_message_type: messageType
      })

      if (error) throw error

      return (data as SystemMessageRarity) || 'common'
    } catch (error) {
      console.error('Error getting default rarity:', error)
      return 'common'
    }
  }

  static async bulkUpdateMessageTypes(
    updates: Array<{ messageType: SystemMessageType; enabled: boolean; defaultRarity: SystemMessageRarity }>
  ): Promise<boolean> {
    try {
      const promises = updates.map(update =>
        this.updateMessageTypeConfig(update.messageType, {
          enabled: update.enabled,
          default_rarity: update.defaultRarity
        })
      )

      const results = await Promise.all(promises)
      return results.every(result => result === true)
    } catch (error) {
      console.error('Error bulk updating message types:', error)
      return false
    }
  }

  static async getDailySummaryConfig(): Promise<DailySummaryConfig | null> {
    try {
      const { data, error } = await supabase
        .from('daily_summary_config')
        .select('*')
        .limit(1)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching daily summary config:', error)
      return null
    }
  }

  static async getMilestoneConfigs(): Promise<MilestoneConfig[]> {
    try {
      const { data, error } = await supabase
        .from('milestone_config')
        .select('*')
        .order('milestone_type, threshold_value')

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching milestone configs:', error)
      return []
    }
  }

  static async createDeveloperNote(
    groupId: string,
    content: string,
    rarity: SystemMessageRarity = 'common'
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('insert_system_message_to_chat', {
        p_group_id: groupId,
        p_message_type: 'developer_note',
        p_rarity: rarity,
        p_title: 'Developer Note',
        p_content: content,
        p_metadata: JSON.stringify({ priority: 'medium' })
      })

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error creating developer note:', error)
      return false
    }
  }

  static async sendPublicMessage(
    title: string,
    content: string,
    rarity: SystemMessageRarity = 'common'
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('send_public_message', {
        p_title: title,
        p_content: content,
        p_rarity: rarity
      })

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error sending public message:', error)
      return false
    }
  }

  static async updateDailySummaryConfig(config: DailySummaryConfig): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('daily_summary_config')
        .update({
          include_commitment_rate: config.include_commitment_rate,
          include_top_performer: config.include_top_performer,
          include_member_count: config.include_member_count,
          include_motivational_message: config.include_motivational_message,
          include_streak_info: config.include_streak_info,
          include_weekly_progress: config.include_weekly_progress,
          send_time: config.send_time,
          send_days: config.send_days,
          timezone: config.timezone,
          enabled: config.enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error updating daily summary config:', error)
      return false
    }
  }

  static async updateMilestoneConfig(milestoneId: string, updates: Partial<MilestoneConfig>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('milestone_config')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', milestoneId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error updating milestone config:', error)
      return false
    }
  }
}