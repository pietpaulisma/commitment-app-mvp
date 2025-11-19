// Types for error logging system

export interface ErrorLog {
  id: string
  created_at: string
  user_id?: string
  error_type: string
  error_message: string
  stack_trace?: string
  component_name?: string
  url?: string
  user_agent?: string
  metadata?: Record<string, any>
  resolved: boolean
  resolved_at?: string
  resolved_by?: string
  notes?: string
}

export type ErrorType =
  | 'workout_logging'
  | 'navigation'
  | 'penalty_system'
  | 'authentication'
  | 'data_sync'
  | 'notification'
  | 'ui_rendering'
  | 'api_error'
  | 'unknown'

export interface LogErrorParams {
  errorType: ErrorType
  errorMessage: string
  componentName?: string
  error?: Error
  metadata?: Record<string, any>
}
