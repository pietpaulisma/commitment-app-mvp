import React from 'react';
import { COLORS } from '@/utils/colors';

interface SquadMemberRowProps {
    name: string;
    pct: number;
    mode: 'sane' | 'insane';
    isLive: boolean;
}

export const SquadMemberRow = ({ name, pct, mode, isLive }: SquadMemberRowProps) => {
    const isInsane = mode === "insane";
    const isZero = pct === 0;
    const displayName = name.slice(0, 4).toUpperCase();
    const barGradient = isInsane ? "bg-gradient-to-r from-orange-500 via-orange-600 to-red-600" : "bg-gradient-to-r from-blue-400 via-blue-500 to-purple-600";
    // Smaller glow for compact squad status bars
    const shadowStyle = isZero ? {} : {
        boxShadow: isInsane
            ? '0 0 20px 3px rgba(249, 115, 22, 0.3), 0 0 10px 0px rgba(249, 115, 22, 0.4)'
            : '0 0 20px 3px rgba(96, 165, 250, 0.25), 0 0 10px 0px rgba(79, 70, 229, 0.3)'
    };
    const baseHeight = 24;
    const scaleFactor = Math.max(1, pct / 100);
    const dynamicHeight = Math.min(baseHeight * 3, baseHeight * scaleFactor);

    return (
        <div className="flex items-center gap-3 group transition-all duration-500 my-1">
            <div className="w-14 shrink-0 flex flex-col justify-center">
                <div className="flex items-center">
                    <span className={`text-lg font-black tracking-tighter leading-none transition-colors ${isZero ? 'text-zinc-600' : 'text-white'}`}>
                        {displayName}
                    </span>
                    {isLive && (
                        <div className="ml-0.5 -mt-2 relative">
                            <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-orange-500 opacity-75 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-600"></span>
                        </div>
                    )}
                </div>
                {!isZero && (
                    <span className="text-[6px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-0.5">
                        {isInsane ? 'Insane' : 'Sane'}
                    </span>
                )}
            </div>
            <div className="flex-1 flex items-center relative min-h-[28px]">
                <div className="w-full bg-zinc-800/40 rounded-md h-6 overflow-visible relative flex items-center">
                    {isZero && <span className="absolute left-2 text-xs font-black text-zinc-700 select-none">0%</span>}
                    {!isZero && (
                        <div className={`absolute left-0 rounded-md ${barGradient} transition-all duration-1000 ease-out z-10 flex items-center justify-end px-2 overflow-hidden`}
                            style={{ width: `${Math.min(pct, 100)}%`, height: `${dynamicHeight}px`, zIndex: pct > 100 ? 20 : 10, ...shadowStyle }}>
                            {pct > 100 && <div className="absolute top-[-50%] bottom-[-50%] left-[-50%] right-[-50%] bg-white/20 animate-[shimmer_0.8s_infinite] skew-x-12 origin-center mix-blend-overlay" />}
                            <span className={`relative z-20 text-xs font-black tracking-tight mix-blend-multiply ${isInsane ? 'text-black' : 'text-black/70'}`}>{pct}%</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
