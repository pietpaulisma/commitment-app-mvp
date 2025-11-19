'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'
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
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'penalty':
        return '⚠️'
      case 'payment':
        return '💰'
      default:
        return '📝'
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'penalty':
        return 'text-red-400 bg-red-900/20 border-red-600/30'
      case 'payment':
        return 'text-green-400 bg-green-900/20 border-green-600/30'
      default:
        return 'text-blue-400 bg-blue-900/20 border-blue-600/30'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-black/70 backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl max-w-2xl w-full"
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold text-white">Pot History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-white/20 border-t-white mx-auto mb-4"></div>
              <p className="text-white/60">Loading transaction history...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl">{getTransactionIcon(tx.transaction_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{tx.username}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-md border ${getTransactionColor(tx.transaction_type)}`}>
                            {tx.transaction_type}
                          </span>
                        </div>
                        {tx.description && (
                          <p className="text-sm text-white/60 mb-2">{tx.description}</p>
                        )}
                        <p className="text-xs text-white/40">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-lg font-bold ${
                        tx.transaction_type === 'penalty' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {tx.transaction_type === 'penalty' ? '+' : '-'}€{tx.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">
            Showing last {transactions.length} transactions
          </p>
        </div>
      </div>
    </div>
  )
}
