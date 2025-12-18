'use client'

import { MessageCircle, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface BottomNavigationProps {
    onWorkoutClick: () => void
    onChatClick: () => void
    groupId?: string | null
    progressPercentage?: number
}

export const BottomNavigation = ({ onWorkoutClick, onChatClick, groupId, progressPercentage = 0 }: BottomNavigationProps) => {
    const [hasUnreadMessages, setHasUnreadMessages] = useState(true) // This would be dynamic in production

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-4 pointer-events-none">
            <div className="max-w-2xl mx-auto pointer-events-auto">
                {/* Container with grey outline matching scrollable version */}
                <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-2 shadow-2xl flex items-center gap-3 pr-2">
                    {/* Main Log Workout Button */}
                    <button
                        onClick={onWorkoutClick}
                        className="relative flex-1 h-16 rounded-[2rem] flex items-center justify-between px-8 transition-all group overflow-hidden"
                    >
                        {/* Background - White base */}
                        <div className="absolute inset-0 bg-white group-hover:bg-zinc-200 transition-colors rounded-[2rem]" />

                        {/* Progress bar - Vibrant blue gradient from left */}
                        <div
                            className="absolute top-0 left-0 bottom-0 transition-all duration-500 ease-out rounded-l-[2rem]"
                            style={{
                                width: `${progressPercentage}%`,
                                background: 'linear-gradient(90deg, rgb(29, 78, 216) 0%, rgb(37, 99, 235) 40%, rgb(59, 130, 246) 100%)',
                                boxShadow: progressPercentage > 0
                                    ? 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(29, 78, 216, 0.6), 4px 0 20px rgba(37, 99, 235, 0.5), 8px 0 30px rgba(59, 130, 246, 0.3)'
                                    : 'none'
                            }}
                        />

                        {/* Content */}
                        <div className="relative flex flex-col items-start">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black mb-0.5">
                                Today's Goal
                            </span>
                            <span className="text-xl font-black tracking-tight leading-none text-black">
                                LOG WORKOUT
                            </span>
                        </div>

                        {/* Percentage or Arrow */}
                        <div className="relative">
                            {progressPercentage > 0 ? (
                                <span className="text-sm font-black text-black tabular-nums">
                                    {progressPercentage}%
                                </span>
                            ) : (
                                <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform text-black" />
                            )}
                        </div>
                    </button>

                    {/* Chat Button */}
                    <button
                        onClick={onChatClick}
                        disabled={!groupId}
                        className={`w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all relative ${groupId
                            ? 'bg-[#111] hover:bg-[#222] text-white border border-white/10'
                            : 'bg-[#111]/50 text-zinc-500 border border-white/5 cursor-not-allowed opacity-50'
                            }`}
                    >
                        <MessageCircle size={26} className={groupId ? '' : 'text-zinc-600'} />

                        {/* Unread indicator */}
                        {groupId && hasUnreadMessages && (
                            <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full animate-pulse" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
