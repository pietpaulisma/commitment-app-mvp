// Types for the user-triggered penalty system

export type PenaltyStatus = 'pending' | 'accepted' | 'disputed' | 'waived' | 'auto_accepted'

export type ReasonCategory = 'sick' | 'work' | 'family' | 'training_rest' | 'other'

export interface PendingPenalty {
  id: string
  user_id: string
  group_id: string
  date: string // ISO date (YYYY-MM-DD)
  target_points: number
  actual_points: number
  penalty_amount: number
  status: PenaltyStatus
  reason_category?: ReasonCategory
  reason_message?: string
  created_at: string // ISO timestamp
  responded_at?: string | null
  deadline: string // ISO timestamp
  auto_accepted_at?: string | null

  // Computed fields (not in DB, calculated client-side)
  hours_remaining?: number
  is_expired?: boolean
}

export interface PenaltyStats {
  totalMembers: number
  completed: number
  penaltiesCreated: number
  pending: number
  disputed: number
  autoAccepted: number
  flexRestDays: number
  sickMode: number
  restDays: number
}

export interface PenaltyResponse {
  penalty_id: string
  action: 'accept' | 'dispute'
  reason_category?: ReasonCategory
  reason_message?: string
}

export interface PendingMemberInfo {
  username: string
  userId: string
  actual: number
  target: number
  hours_remaining: number
  penaltyId: string
}

export interface DisputedMemberInfo {
  username: string
  userId: string
  reason_category: ReasonCategory
  reason_message: string
  penaltyId: string
}

export interface DailyRecapData {
  date: string // ISO date
  stats: {
    total: number
    completed: number
    pending: number
    disputed: number
    autoAccepted: number
  }
  completedMembers: string[] // Array of usernames
  pendingMembers: PendingMemberInfo[]
  disputedMembers: DisputedMemberInfo[]
  groupStreak: number
  totalPot: number
}

export interface CheckPenaltiesResponse {
  success: boolean
  stats: PenaltyStats
  summaryMessageId: string
  pendingPenalties: PendingMemberInfo[]
  disputedPenalties: DisputedMemberInfo[]
  recapData: DailyRecapData
}

export interface MyPendingResponse {
  penalties: PendingPenalty[]
}

export interface RespondToPenaltyResponse {
  success: boolean
  action: 'accepted' | 'disputed'
  message: string
  chatMessageId?: string
}
