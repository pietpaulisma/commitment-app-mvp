export type SystemMessageType = 'daily_summary' | 'milestone' | 'developer_note' | 'public_message' | 'weekly_challenge'
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

export interface PublicMessageMetadata {
  sent_at: string
  target_groups?: 'all' | string[]
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

export interface DailySummaryConfig {
  id: string
  include_commitment_rate: boolean
  include_top_performer: boolean
  include_member_count: boolean
  include_motivational_message: boolean
  include_streak_info: boolean
  include_weekly_progress: boolean
  send_time: string // HH:MM:SS format
  send_days: number[] // 1=Monday, 7=Sunday
  timezone: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface MilestoneConfig {
  id: string
  milestone_type: 'pot_amount' | 'group_streak' | 'total_points' | 'member_count'
  milestone_name: string
  threshold_value: number
  enabled: boolean
  rarity: SystemMessageRarity
  description?: string
  created_at: string
  updated_at: string
}

export interface SystemMessageConfig {
  daily_summaries_enabled: boolean
  milestones_enabled: boolean
  sender_name: string
  rarity_filters: SystemMessageRarity[]
}

// New interfaces for redesigned system

export interface TimingConfig {
  type: 'end_of_day' | 'custom'
  customTime?: string
}

export interface WeeklyChallengeConfig {
  id: string
  enabled: boolean
  message?: string
  timing_type: 'end_of_day' | 'custom'
  custom_time?: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface WeeklySummaryConfig {
  id: string
  include_weekly_stats: boolean
  include_member_spotlight: boolean
  include_group_achievements: boolean
  include_progress_comparison: boolean
  enabled: boolean
  send_day: number // 1-7, where 7 = Sunday
  send_time: string // HH:MM:SS format
  timezone: string
  created_at: string
  updated_at: string
}

export interface PersonalSummaryConfig {
  id: string
  include_personal_streak: boolean
  include_goal_progress: boolean
  include_achievements: boolean
  include_encouragement: boolean
  enabled: boolean
  send_frequency: 'daily' | 'weekly' | 'monthly'
  send_day: number // For weekly/monthly frequency
  send_time: string // HH:MM:SS format
  timezone: string
  created_at: string
  updated_at: string
}

export interface MilestoneProgress {
  id: string
  milestone_config_id: string
  group_id: string
  current_value: number
  is_completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface EnhancedMilestoneConfig extends MilestoneConfig {
  current_progress?: number
  target: number
  unit: string
  percentage?: number
  is_completed?: boolean
  preview_message: string
}

// UI-specific interfaces for the new design
export interface MessagePreview {
  id: string
  type: string
  content: string
  rarity: SystemMessageRarity
  timestamp?: string
}

export interface SectionConfig {
  id: string
  title: string
  description: string
  icon: string
  enabled: boolean
  count: number
}

export interface SummaryOption {
  id: string
  title: string
  description: string
  enabled: boolean
  preview: string
}

export interface ChallengeOption {
  id: string
  title: string
  description: string
  enabled: boolean
  rarity: SystemMessageRarity
  preview: string
}

export interface AdminMessageConfig {
  message: string
  timing: TimingConfig
  rarity: SystemMessageRarity
}