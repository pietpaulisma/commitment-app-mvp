import React from 'react';
import { COLORS } from '@/utils/colors';

interface SquadMemberRowProps {
    name: string;
    pct: number;
    mode: 'sane' | 'insane' | 'sick';
    isLive: boolean;
    isRecoveryDay?: boolean;
    isFlexibleRestDay?: boolean;
}

export const SquadMemberRow = ({ name, pct, mode, isLive, isRecoveryDay = false, isFlexibleRestDay = false }: SquadMemberRowProps) => {
    const isInsane = mode === "insane";
    const isSick = mode === "sick";
    const isZero = pct === 0;
    const displayName = name.slice(0, 4).toUpperCase();
    
    // Sick mode: grey bar with subtle styling
    // Orange gradient for flexible rest day (flexing on a rest day!), green for recovery day, otherwise mode-based colors
    const barGradient = isSick
        ? "bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-600"
        : isFlexibleRestDay
            ? "bg-gradient-to-r from-orange-500 via-orange-600 to-red-600"
            : isRecoveryDay 
                ? "bg-gradient-to-r from-green-500 via-green-600 to-emerald-600"
                : isInsane 
                    ? "bg-gradient-to-r from-orange-500 via-orange-600 to-red-600" 
                    : "bg-gradient-to-r from-blue-500 to-blue-600";
    
    // Glow style based on mode (no glow for sick mode)
    // Flexible rest day uses orange glow (same as insane) since they're flexing!
    const shadowStyle = isZero || isSick ? {} : isFlexibleRestDay
        ? {
            boxShadow: '0 0 20px 3px rgba(249, 115, 22, 0.3), 0 0 10px 0px rgba(249, 115, 22, 0.4)'
        }
        : isRecoveryDay 
            ? {
                boxShadow: '0 0 20px 3px rgba(34, 197, 94, 0.3), 0 0 10px 0px rgba(34, 197, 94, 0.4)'
            }
            : {
                boxShadow: isInsane
                    ? '0 0 20px 3px rgba(249, 115, 22, 0.3), 0 0 10px 0px rgba(249, 115, 22, 0.4)'
                    : '0 0 20px 3px rgba(37, 99, 235, 0.3), 0 0 10px 0px rgba(59, 130, 246, 0.4)'
            };
    
    const baseHeight = 24;
    
    // Bar height is fixed at 24px - no dynamic scaling to prevent row overlap
    const dynamicHeight = baseHeight;

    // Ensure minimum width for low percentages to prevent cutoff
    // Cap bar width at 100% to prevent overflow
    const barWidth = isSick ? 100 : Math.min(Math.max(pct, 12), 100); // Sick mode shows full width grey bar
    
    // Mode label
    const modeLabel = isSick
        ? 'Sick'
        : isFlexibleRestDay
            ? 'Flexing'
            : isRecoveryDay 
                ? 'Recovery' 
                : isInsane 
                    ? 'Insane' 
                    : 'Sane';

    // Name color: white for sick mode, otherwise based on progress
    const nameColorClass = isSick 
        ? 'text-white' 
        : isZero 
            ? 'text-zinc-600' 
            : 'text-white';
    
    // Label color based on mode
    const labelColorClass = isSick
        ? 'text-zinc-400'
        : isFlexibleRestDay 
            ? 'text-orange-500' 
            : isRecoveryDay 
                ? 'text-green-500' 
                : 'text-zinc-500';

    return (
        <div className="flex items-center gap-3 group transition-all duration-500 my-1">
            <div className="w-14 shrink-0 flex flex-col justify-center">
                <div className="flex items-center">
                    <span className={`text-lg font-black tracking-tighter leading-none transition-colors ${nameColorClass}`}>
                        {displayName}
                    </span>
                    {isLive && !isRecoveryDay && !isSick && (
                        <div className="ml-0.5 -mt-2 relative">
                            <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-orange-500 opacity-75 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-600"></span>
                        </div>
                    )}
                </div>
                {(isSick || !isZero) && (
                    <span className={`text-[6px] font-bold uppercase tracking-widest leading-none mt-0.5 ${labelColorClass}`}>
                        {modeLabel}
                    </span>
                )}
            </div>
            <div className="flex-1 flex items-center relative min-h-[28px]">
                <div className="w-full bg-zinc-800/40 rounded-md h-6 overflow-hidden relative flex items-center">
                    {isSick ? (
                        // Sick mode: show greyed out bar with subtle diagonal stripes
                        <div className={`absolute left-0 rounded-md ${barGradient} transition-all duration-1000 ease-out z-10 overflow-hidden opacity-30`}
                            style={{ width: '100%', height: `${dynamicHeight}px` }}>
                            {/* Diagonal stripe pattern overlay */}
                            <div 
                                className="absolute inset-0 opacity-40"
                                style={{
                                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 8px)'
                                }}
                            />
                        </div>
                    ) : isZero ? (
                        <span className="absolute left-2 text-xs font-black text-zinc-700 select-none">0%</span>
                    ) : (
                        <div className={`absolute left-0 rounded-md ${barGradient} transition-all duration-1000 ease-out z-10 flex items-center justify-end px-2 overflow-hidden`}
                            style={{ width: `${barWidth}%`, height: `${dynamicHeight}px`, ...shadowStyle }}>
                            {pct > 100 && <div className="absolute inset-0 bg-white/20 animate-[shimmer_0.8s_infinite] skew-x-12 origin-center mix-blend-overlay" />}
                            <span className={`relative z-20 text-xs font-black tracking-tight mix-blend-multiply ${isFlexibleRestDay ? 'text-black' : isRecoveryDay ? 'text-black/70' : isInsane ? 'text-black' : 'text-black/70'}`}>{pct}%</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
