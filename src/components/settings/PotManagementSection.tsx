'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type PotMember = {
    id: string
    email: string
    username?: string
    penalty_balance: number
    last_penalty_date: string | null
    recent_transactions?: Array<{
        amount: number
        transaction_type: string
        description: string
        created_at: string
    }>
}

type PotManagementSectionProps = {
    members: PotMember[]
    onAdjustPenalty: (userId: string, amount: number, reason: string) => Promise<void>
}

export function PotManagementSection({ members, onAdjustPenalty }: PotManagementSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [adjustmentAmount, setAdjustmentAmount] = useState('')
    const [adjustmentReason, setAdjustmentReason] = useState('')

    const handleSaveAdjustment = async (userId: string) => {
        if (!adjustmentAmount || !adjustmentReason) {
            alert('Please enter both amount and reason')
            return
        }

        const amount = parseFloat(adjustmentAmount)
        if (isNaN(amount) || amount === 0) {
            alert('Please enter a valid amount (positive for penalty, negative for payment)')
            return
        }

        await onAdjustPenalty(userId, amount, adjustmentReason)
        setEditingId(null)
        setAdjustmentAmount('')
        setAdjustmentReason('')
    }

    const totalPot = members.reduce((sum, m) => sum + (m.penalty_balance || 0), 0)

    return (
        <div>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                        <span className="text-xs font-bold">€</span>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-bold text-white group-hover:text-orange-200 transition-colors">
                            Money Pot
                        </span>
                        <span className="text-[10px] text-zinc-500">€{totalPot.toFixed(2)} total</span>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                ) : (
                    <ChevronDown size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                )}
            </button>

            {isExpanded && (
                <div className="px-4 pb-4">
                    <div className="bg-zinc-900/50 rounded-lg border border-white/5 divide-y divide-white/5">
                        {members.map((member) => (
                            <div key={member.id} className="p-4">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    {/* Member Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h4 className="text-base font-medium text-white">
                                                {member.username || member.email}
                                            </h4>
                                            <span
                                                className={`px-2 py-1 text-xs rounded ${(member.penalty_balance || 0) > 0
                                                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                                        : 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    }`}
                                            >
                                                {(member.penalty_balance || 0) > 0 ? 'Has Penalties' : 'Current'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="text-zinc-500 uppercase tracking-wide text-xs">Penalty Balance</div>
                                                <div className="text-orange-400 font-bold text-xl">
                                                    €{(member.penalty_balance || 0).toFixed(2)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-zinc-500 uppercase tracking-wide text-xs">Last Adjustment</div>
                                                <div className="text-zinc-300 font-medium">
                                                    {member.last_penalty_date || 'No adjustments yet'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Adjustment Controls */}
                                    <div className="flex-shrink-0">
                                        {editingId === member.id ? (
                                            <div className="bg-zinc-800/50 border border-zinc-700 p-4 rounded-lg min-w-full lg:min-w-80">
                                                <h5 className="text-white font-medium mb-3 text-sm">Manual Adjustment</h5>
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs text-zinc-500 uppercase tracking-wide mb-1">
                                                            Amount (+ penalty, - payment)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={adjustmentAmount}
                                                            onChange={(e) => setAdjustmentAmount(e.target.value)}
                                                            placeholder="10.00 or -20.00"
                                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 text-white text-sm rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-zinc-500 uppercase tracking-wide mb-1">
                                                            Reason
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={adjustmentReason}
                                                            onChange={(e) => setAdjustmentReason(e.target.value)}
                                                            placeholder="Phone died, missed check-in"
                                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-600 text-white text-sm rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleSaveAdjustment(member.id)}
                                                            className="bg-green-600 text-white px-3 py-2 text-sm rounded hover:bg-green-700 transition-colors"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(null)
                                                                setAdjustmentAmount('')
                                                                setAdjustmentReason('')
                                                            }}
                                                            className="bg-zinc-600 text-white px-3 py-2 text-sm rounded hover:bg-zinc-700 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setEditingId(member.id)}
                                                className="bg-orange-600 text-white px-4 py-2 text-sm rounded hover:bg-orange-700 transition-colors"
                                            >
                                                Manual Adjustment
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Recent Transactions */}
                                {member.recent_transactions && member.recent_transactions.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <h5 className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">
                                            Recent Adjustments
                                        </h5>
                                        <div className="space-y-1">
                                            {member.recent_transactions.slice(0, 2).map((transaction, index) => (
                                                <div key={index} className="flex justify-between items-center text-xs">
                                                    <span className="text-zinc-300">{transaction.description}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={
                                                                transaction.transaction_type === 'penalty'
                                                                    ? 'text-orange-400'
                                                                    : 'text-green-400'
                                                            }
                                                        >
                                                            {transaction.transaction_type === 'penalty' ? '+' : '-'}€
                                                            {transaction.amount.toFixed(2)}
                                                        </span>
                                                        <span className="text-zinc-500">
                                                            {new Date(transaction.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {members.length === 0 && (
                            <div className="text-center py-8 text-zinc-500">
                                <p>No pot data available</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
