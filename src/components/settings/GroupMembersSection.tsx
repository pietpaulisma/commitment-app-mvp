'use client'

import { useState } from 'react'
import { GlassCard } from '../dashboard/v2/GlassCard'
import { ChevronDown, ChevronUp } from 'lucide-react'

type Member = {
    id: string
    email: string
    username?: string
    role: string
    group_id: string | null
    preferred_weight: number
    is_weekly_mode: boolean
    location: string
    created_at: string
    total_points?: number
    recent_workouts?: number
}

type GroupMembersSectionProps = {
    members: Member[]
    onRemoveMember: (userId: string) => void
}

export function GroupMembersSection({ members, onRemoveMember }: GroupMembersSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <span className="text-sm font-bold">{members.length}</span>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                            Group Members
                        </span>
                        <span className="text-[10px] text-zinc-500">{members.length} members</span>
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
                    <div className="bg-zinc-900/50 rounded-lg border border-white/5 overflow-hidden">
                        {/* Mobile Card View */}
                        <div className="block md:hidden divide-y divide-white/5">
                            {members.map((member) => (
                                <div key={member.id} className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-white">
                                                {member.username || member.email}
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                                {new Date(member.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onRemoveMember(member.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors text-sm ml-4"
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <div className="text-zinc-500 text-xs uppercase tracking-wide">Location</div>
                                            <div className="text-white">{member.location}</div>
                                        </div>
                                        <div>
                                            <div className="text-zinc-500 text-xs uppercase tracking-wide">Points</div>
                                            <div className="text-green-400 font-medium">{member.total_points || 0} pts</div>
                                        </div>
                                        <div>
                                            <div className="text-zinc-500 text-xs uppercase tracking-wide">Weight</div>
                                            <div className="text-white">{member.preferred_weight} kg</div>
                                        </div>
                                        <div>
                                            <div className="text-zinc-500 text-xs uppercase tracking-wide">Mode</div>
                                            <div className="text-white">{member.is_weekly_mode ? 'Weekly' : 'Daily'}</div>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <div className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Recent Activity</div>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded ${(member.recent_workouts || 0) > 3
                                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    : (member.recent_workouts || 0) > 0
                                                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}
                                        >
                                            {member.recent_workouts || 0} workouts (7 days)
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-zinc-800/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Member
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Location
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Points
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Activity
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Weight
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Mode
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {members.map((member) => (
                                        <tr key={member.id} className="hover:bg-white/5">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-white">
                                                    {member.username || member.email}
                                                </div>
                                                <div className="text-xs text-zinc-500">
                                                    {new Date(member.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-white">{member.location}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-400">
                                                {member.total_points || 0} pts
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded ${(member.recent_workouts || 0) > 3
                                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                            : (member.recent_workouts || 0) > 0
                                                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                        }`}
                                                >
                                                    {member.recent_workouts || 0} workouts (7d)
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                                                {member.preferred_weight} kg
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                                                {member.is_weekly_mode ? 'Weekly' : 'Daily'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => onRemoveMember(member.id)}
                                                    className="text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {members.length === 0 && (
                            <div className="text-center py-8 text-zinc-500">
                                <p>No members in your group yet</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
