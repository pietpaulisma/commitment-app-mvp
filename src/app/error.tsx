'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Send, CheckCircle, Bug } from 'lucide-react'
import { logError, captureConsoleErrors, clearStoredErrors } from '@/utils/errorLogger'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorBoundaryProps) {
  const [isReporting, setIsReporting] = useState(false)
  const [isReported, setIsReported] = useState(false)
  const [consoleErrors, setConsoleErrors] = useState<string[]>([])
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Capture console errors that were stored before the crash
    const errors = captureConsoleErrors()
    setConsoleErrors(errors)

    // Log to console for debugging
    console.error('Application Error:', error)
  }, [error])

  const handleReportError = async () => {
    setIsReporting(true)

    try {
      const success = await logError({
        errorType: 'ui_rendering',
        errorMessage: error.message || 'Unknown application error',
        componentName: 'Global Error Boundary',
        error: error,
        metadata: {
          digest: error.digest,
          consoleErrors: consoleErrors.slice(-10), // Last 10 errors
          errorName: error.name,
        }
      })

      if (success) {
        setIsReported(true)
        clearStoredErrors()
      } else {
        alert('Failed to send error report. Please try again.')
      }
    } catch (err) {
      console.error('Failed to report error:', err)
      alert('Failed to send error report. Please try again.')
    } finally {
      setIsReporting(false)
    }
  }

  const handleRefresh = () => {
    clearStoredErrors()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            Something went wrong
          </h1>
          <p className="text-zinc-400 text-sm">
            The app encountered an unexpected error. You can try refreshing the page or report this issue to help us fix it.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
          >
            <RefreshCw size={18} />
            Refresh Page
          </button>

          {/* Report Error Button */}
          {!isReported ? (
            <button
              onClick={handleReportError}
              disabled={isReporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReporting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                  Sending Report...
                </>
              ) : (
                <>
                  <Bug size={18} />
                  Report Error to Developers
                </>
              )}
            </button>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600/20 text-green-400 font-bold rounded-xl border border-green-600/30">
              <CheckCircle size={18} />
              Error Reported - Thank you!
            </div>
          )}

          {/* Try Again Button */}
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors border border-zinc-700"
          >
            Try Again Without Refreshing
          </button>
        </div>

        {/* Show Details Toggle */}
        <div className="text-center">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline"
          >
            {showDetails ? 'Hide' : 'Show'} Error Details
          </button>
        </div>

        {/* Error Details */}
        {showDetails && (
          <div className="mt-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Error Message</p>
              <p className="text-sm text-red-400 font-mono break-all">{error.message}</p>
            </div>

            {error.digest && (
              <div className="mb-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Error ID</p>
                <p className="text-sm text-zinc-400 font-mono">{error.digest}</p>
              </div>
            )}

            {consoleErrors.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Recent Console Errors</p>
                <div className="max-h-32 overflow-y-auto">
                  {consoleErrors.slice(-5).map((err, i) => (
                    <p key={i} className="text-[10px] text-zinc-500 font-mono break-all mb-1">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <p className="text-center text-[10px] text-zinc-600 mt-6">
          If this keeps happening, try clearing your browser cache or contact support.
        </p>
      </div>
    </div>
  )
}


