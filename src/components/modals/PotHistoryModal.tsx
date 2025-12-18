'use client'

import { useState, useEffect } from 'react'
import { X, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PotHistoryModalProps {
  groupId: string
  onClose: () => void
}

interface Transaction {
  id: string
  user_id: string
  amount: number
  transaction_type: string
  description: string
  created_at: string
  username?: string
}

export function PotHistoryModal({ groupId, onClose }: PotHistoryModalProps) {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    loadTransactionHistory()
  }, [groupId])

  const loadTransactionHistory = async () => {
    try {
      setLoading(true)

      // Get all payment transactions for this group
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          profile:profiles!payment_transactions_user_id_fkey(username)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      // Transform data to include username
      const transformedData = data?.map(tx => ({
        ...tx,
        username: (tx as any).profile?.username || 'Unknown'
      })) || []

      setTransactions(transformedData)
    } catch (error) {
      console.error('Error loading transaction history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative bg-zinc-950/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl max-w-2xl w-full"
        style={{
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header - Modern glass design */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Pot History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content - Condensed, modern styling */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
              <p className="text-sm text-zinc-500">Loading history...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="group px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    {/* Left side - User and type */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-zinc-300 truncate">
                          {tx.username}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          tx.transaction_type === 'penalty'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {tx.transaction_type === 'penalty' ? 'PENALTY' : 'PAID'}
                        </span>
                      </div>
                      {tx.description && (
                        <p className="text-xs text-zinc-600 mb-1 truncate">{tx.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                        <span>{formatDate(tx.created_at)}</span>
                        <span>•</span>
                        <span>{formatTime(tx.created_at)}</span>
                      </div>
                    </div>

                    {/* Right side - Amount */}
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className={`text-lg font-black ${
                        tx.transaction_type === 'penalty' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {tx.transaction_type === 'penalty' ? '+' : '-'}€{tx.amount.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Condensed */}
        <div className="px-6 py-3 border-t border-white/10">
          <p className="text-[10px] text-zinc-600 text-center uppercase tracking-wider font-bold">
            {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>
      </div>
    </div>
  )
}
