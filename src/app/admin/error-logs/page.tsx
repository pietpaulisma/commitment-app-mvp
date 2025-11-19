'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeftIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { ErrorLog } from '@/types/errorLogs'

export default function ErrorLogsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved')

  useEffect(() => {
    if (user) {
      loadErrorLogs()
    }
  }, [user, filter])

  const loadErrorLogs = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('error_logs')
        .select(`
          *,
          user:profiles!error_logs_user_id_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filter === 'unresolved') {
        query = query.eq('resolved', false)
      }

      const { data, error } = await query

      if (error) throw error

      setErrorLogs(data || [])
    } catch (error) {
      console.error('Error loading error logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsResolved = async (logId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          notes: notes || null
        })
        .eq('id', logId)

      if (error) throw error

      // Reload logs
      await loadErrorLogs()
    } catch (error) {
      console.error('Error marking as resolved:', error)
      alert('Failed to mark as resolved')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getErrorTypeColor = (errorType: string) => {
    const colors: Record<string, string> = {
      workout_logging: 'text-red-400 bg-red-900/20 border-red-600/30',
      navigation: 'text-blue-400 bg-blue-900/20 border-blue-600/30',
      penalty_system: 'text-orange-400 bg-orange-900/20 border-orange-600/30',
      authentication: 'text-purple-400 bg-purple-900/20 border-purple-600/30',
      data_sync: 'text-yellow-400 bg-yellow-900/20 border-yellow-600/30',
      notification: 'text-pink-400 bg-pink-900/20 border-pink-600/30',
      ui_rendering: 'text-green-400 bg-green-900/20 border-green-600/30',
      api_error: 'text-cyan-400 bg-cyan-900/20 border-cyan-600/30',
      unknown: 'text-gray-400 bg-gray-900/20 border-gray-600/30'
    }
    return colors[errorType] || colors.unknown
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-bold">Error Logs</h1>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('unresolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unresolved'
                  ? 'bg-red-600 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              Unresolved
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Error Logs List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
            <p className="text-white/60">Loading error logs...</p>
          </div>
        ) : errorLogs.length === 0 ? (
          <div className="text-center py-12">
            <CheckIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-white/60">No {filter === 'unresolved' ? 'unresolved' : ''} errors found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {errorLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-md border ${getErrorTypeColor(log.error_type)}`}>
                      {log.error_type}
                    </span>
                    <span className="text-xs text-white/40">
                      {formatDate(log.created_at)}
                    </span>
                    {(log as any).user && (
                      <span className="text-xs text-white/60">
                        User: {(log as any).user.username}
                      </span>
                    )}
                  </div>

                  {!log.resolved && (
                    <button
                      onClick={() => {
                        const notes = prompt('Add resolution notes (optional):')
                        markAsResolved(log.id, notes || undefined)
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors flex items-center gap-1"
                    >
                      <CheckIcon className="w-3 h-3" />
                      Mark Resolved
                    </button>
                  )}
                </div>

                {/* Error Message */}
                <div className="mb-2">
                  <p className="text-white font-medium">{log.error_message}</p>
                  {log.component_name && (
                    <p className="text-xs text-white/40 mt-1">Component: {log.component_name}</p>
                  )}
                </div>

                {/* URL */}
                {log.url && (
                  <div className="mb-2">
                    <p className="text-xs text-white/40">URL: {log.url}</p>
                  </div>
                )}

                {/* Stack Trace (Collapsible) */}
                {log.stack_trace && (
                  <details className="mb-2">
                    <summary className="text-xs text-white/60 cursor-pointer hover:text-white/80">
                      View Stack Trace
                    </summary>
                    <pre className="mt-2 p-2 bg-black/50 rounded text-xs text-white/60 overflow-x-auto">
                      {log.stack_trace}
                    </pre>
                  </details>
                )}

                {/* Metadata */}
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <details className="mb-2">
                    <summary className="text-xs text-white/60 cursor-pointer hover:text-white/80">
                      View Metadata
                    </summary>
                    <pre className="mt-2 p-2 bg-black/50 rounded text-xs text-white/60 overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </details>
                )}

                {/* Resolution Notes */}
                {log.resolved && log.notes && (
                  <div className="mt-2 p-2 bg-green-900/20 border border-green-600/30 rounded">
                    <p className="text-xs text-green-300">
                      <strong>Resolution Notes:</strong> {log.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
