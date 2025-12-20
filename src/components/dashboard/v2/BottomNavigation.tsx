'use client'

import { MessageCircle, ChevronRight } from 'lucide-react'

interface BottomNavigationProps {
    onWorkoutClick: () => void
    onChatClick: () => void
    groupId?: string | null
    progressPercentage?: number
    hasUnreadMessages?: boolean
    isRecoveryDay?: boolean
}

export const BottomNavigation = ({ onWorkoutClick, onChatClick, groupId, progressPercentage = 0, hasUnreadMessages = false, isRecoveryDay = false }: BottomNavigationProps) => {
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
                        {/* Background - Changes based on completion and recovery day */}
                        <div 
                            className={`absolute inset-0 rounded-[2rem] transition-all duration-500 ${
                                progressPercentage >= 100 
                                    ? isRecoveryDay
                                        ? 'bg-gradient-to-r from-green-700 via-green-600 to-green-500'
                                        : 'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500'
                                    : isRecoveryDay
                                        ? 'bg-green-900/30 group-hover:bg-green-900/40 border border-green-500/30'
                                        : 'bg-white group-hover:bg-zinc-200'
                            }`}
                            style={{
                                boxShadow: progressPercentage >= 100
                                    ? isRecoveryDay
                                        ? 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(22, 101, 52, 0.6)'
                                        : 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(29, 78, 216, 0.6)'
                                    : 'none'
                            }}
                        />

                        {/* Progress bar - Only show when not complete */}
                        {progressPercentage < 100 && progressPercentage > 0 && (
                            <div
                                className="absolute top-0 left-0 bottom-0 transition-all duration-500 ease-out rounded-l-[2rem]"
                                style={{
                                    width: `${progressPercentage}%`,
                                    background: isRecoveryDay
                                        ? 'linear-gradient(90deg, rgb(22, 101, 52) 0%, rgb(34, 197, 94) 40%, rgb(74, 222, 128) 100%)'
                                        : 'linear-gradient(90deg, rgb(29, 78, 216) 0%, rgb(37, 99, 235) 40%, rgb(59, 130, 246) 100%)',
                                    boxShadow: isRecoveryDay
                                        ? 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(22, 101, 52, 0.6), 4px 0 20px rgba(34, 197, 94, 0.5), 8px 0 30px rgba(74, 222, 128, 0.3)'
                                        : 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(29, 78, 216, 0.6), 4px 0 20px rgba(37, 99, 235, 0.5), 8px 0 30px rgba(59, 130, 246, 0.3)'
                                }}
                            />
                        )}

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-start">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-0.5 ${
                                progressPercentage >= 100 
                                    ? 'text-white/80' 
                                    : isRecoveryDay 
                                        ? 'text-green-300/80' 
                                        : 'text-black'
                            }`}>
                                {isRecoveryDay ? 'Recovery Day' : "Today's Goal"}
                            </span>
                            <span className={`text-xl font-black tracking-tight leading-none ${
                                progressPercentage >= 100 
                                    ? 'text-white' 
                                    : isRecoveryDay 
                                        ? 'text-green-100' 
                                        : 'text-black'
                            }`}>
                                {isRecoveryDay ? 'RECOVERY' : 'LOG WORKOUT'}
                            </span>
                        </div>

                        {/* Percentage or Arrow */}
                        <div className="relative z-10">
                            {progressPercentage > 0 ? (
                                <span className={`text-sm font-black tabular-nums ${
                                    progressPercentage >= 100 
                                        ? 'text-white' 
                                        : isRecoveryDay 
                                            ? 'text-green-100' 
                                            : 'text-black'
                                }`}>
                                    {Math.round(progressPercentage)}%
                                </span>
                            ) : (
                                <ChevronRight size={24} className={`group-hover:translate-x-1 transition-transform ${isRecoveryDay ? 'text-green-100' : 'text-black'}`} />
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
                        style={groupId && hasUnreadMessages ? {
                            boxShadow: '0 0 20px 4px rgba(34, 197, 94, 0.4), 0 0 40px 8px rgba(34, 197, 94, 0.2), inset 0 0 20px rgba(34, 197, 94, 0.1)',
                            borderColor: 'rgba(34, 197, 94, 0.5)'
                        } : undefined}
                    >
                        <MessageCircle size={26} className={groupId && hasUnreadMessages ? 'text-green-400' : groupId ? '' : 'text-zinc-600'} />

                        {/* Unread dot indicator */}
                        {groupId && hasUnreadMessages && (
                            <span className="absolute top-3 right-3 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_8px_2px_rgba(34,197,94,0.6)]" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
