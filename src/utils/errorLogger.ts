import { supabase } from '@/lib/supabase'
import type { ErrorType, LogErrorParams } from '@/types/errorLogs'

/**
 * Log an error to the error_logs table
 */
export async function logError({
  errorType,
  errorMessage,
  componentName,
  error,
  metadata = {}
}: LogErrorParams): Promise<boolean> {
  try {
    // Get current user if available
    const { data: { user } } = await supabase.auth.getUser()

    // Prepare error data
    const errorData = {
      user_id: user?.id || null,
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: error?.stack || null,
      component_name: componentName || null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        // Include useful device info
        screenWidth: typeof window !== 'undefined' ? window.innerWidth : null,
        screenHeight: typeof window !== 'undefined' ? window.innerHeight : null,
        platform: typeof navigator !== 'undefined' ? (navigator as any).platform : null,
        standalone: typeof window !== 'undefined' ? (window.navigator as any).standalone : null,
      },
      resolved: false
    }

    const { error: insertError } = await supabase
      .from('error_logs')
      .insert(errorData)

    if (insertError) {
      console.error('Failed to log error to database:', insertError)
      return false
    }

    return true
  } catch (err) {
    console.error('Error in logError:', err)
    return false
  }
}

/**
 * Capture and log console errors
 */
export function captureConsoleErrors(): string[] {
  const errors: string[] = []
  
  if (typeof window === 'undefined') return errors

  // Get any errors stored in sessionStorage from before crash
  const storedErrors = sessionStorage.getItem('console_errors')
  if (storedErrors) {
    try {
      errors.push(...JSON.parse(storedErrors))
    } catch (e) {
      // Ignore parse errors
    }
  }

  return errors
}

/**
 * Store console errors for later retrieval
 */
export function setupErrorCapture(): void {
  if (typeof window === 'undefined') return

  const errors: string[] = []

  // Capture console.error
  const originalConsoleError = console.error
  console.error = (...args) => {
    const errorMessage = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    
    errors.push(`[${new Date().toISOString()}] ${errorMessage}`)
    
    // Keep only last 20 errors
    while (errors.length > 20) errors.shift()
    
    // Store in sessionStorage for crash recovery
    try {
      sessionStorage.setItem('console_errors', JSON.stringify(errors))
    } catch (e) {
      // Storage might be full, ignore
    }
    
    originalConsoleError.apply(console, args)
  }

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    const errorMessage = `[UNHANDLED] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`
    errors.push(`[${new Date().toISOString()}] ${errorMessage}`)
    
    try {
      sessionStorage.setItem('console_errors', JSON.stringify(errors))
    } catch (e) {
      // Ignore storage errors
    }
  })

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = `[UNHANDLED PROMISE] ${event.reason}`
    errors.push(`[${new Date().toISOString()}] ${errorMessage}`)
    
    try {
      sessionStorage.setItem('console_errors', JSON.stringify(errors))
    } catch (e) {
      // Ignore storage errors
    }
  })
}

/**
 * Clear stored console errors
 */
export function clearStoredErrors(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('console_errors')
  }
}


