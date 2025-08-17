export type SystemMessageType = 'daily_summary' | 'challenge' | 'milestone' | 'developer_note'
export type SystemMessageRarity = 'common' | 'rare' | 'legendary'

export interface SystemMessage {
  id: string
  group_id: string
  message_type: SystemMessageType
  rarity: SystemMessageRarity
  title: string
  content: string
  metadata: Record<string, any>
  sender_name: string
  created_by?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DailySummaryMetadata {
  commitment_rate: number
  committed_members: number
  total_members: number
  top_performer?: string
  top_points?: number
}

export interface ChallengeMetadata {
  challenge_id: string
  challenge_name: string
  start_date: string
  end_date: string
  participants?: string[]
}

export interface MilestoneMetadata {
  milestone_type: 'pot_amount' | 'group_streak' | 'total_points' | 'member_count'
  milestone_value: number
  previous_value?: number
}

export interface DeveloperNoteMetadata {
  priority: 'low' | 'medium' | 'high'
  category?: string
}

export interface SystemMessageTypeConfig {
  message_type: SystemMessageType
  enabled: boolean
  default_rarity: SystemMessageRarity
  description: string
  can_be_automated: boolean
  frequency?: 'daily' | 'weekly' | 'on_event' | 'manual'
}

export interface GlobalSystemMessageConfig {
  id: string
  is_globally_enabled: boolean
  created_at: string
  updated_at: string
  message_type_configs: SystemMessageTypeConfig[]
}

export interface SystemMessageConfig {
  daily_summaries_enabled: boolean
  challenges_enabled: boolean
  milestones_enabled: boolean
  sender_name: string
  rarity_filters: SystemMessageRarity[]
}