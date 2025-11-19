import { supabase } from '@/lib/supabase'
import type { LogErrorParams } from '@/types/errorLogs'

/**
 * Log an error to the database for admin review
 * This helps track bugs and issues users are experiencing
 */
export async function logError({
  errorType,
  errorMessage,
  componentName,
  error,
  metadata = {}
}: LogErrorParams): Promise<void> {
  try {
    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser()

    // Get current URL
    const url = typeof window !== 'undefined' ? window.location.href : undefined

    // Get user agent
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined

    // Extract stack trace from error if available
    const stackTrace = error?.stack

    // Prepare error log entry
    const errorLog = {
      user_id: user?.id || null,
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: stackTrace || null,
      component_name: componentName || null,
      url: url || null,
      user_agent: userAgent || null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null
    }

    // Insert into database
    const { error: insertError } = await supabase
      .from('error_logs')
      .insert(errorLog)

    if (insertError) {
      // Log to console if database insert fails
      console.error('Failed to log error to database:', insertError)
    }

    // Also log to console for immediate debugging
    console.error(`[${errorType}] ${errorMessage}`, {
      component: componentName,
      error,
      metadata
    })
  } catch (err) {
    // Silently fail - don't break the app if error logging fails
    console.error('Error logger failed:', err)
  }
}

/**
 * Quick wrapper for logging errors with try/catch
 * Usage: await logErrorSafe({ ... })
 */
export async function logErrorSafe(params: LogErrorParams): Promise<void> {
  try {
    await logError(params)
  } catch {
    // Silently fail
  }
}
