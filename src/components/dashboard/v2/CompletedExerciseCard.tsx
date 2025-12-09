import React from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { COLORS } from '@/utils/colors';

interface CompletedExerciseCardProps {
    name: string;
    points: number;
    maxPoints?: number;
    icon: LucideIcon;
    color?: 'opal' | 'orange' | 'green';
    weight?: string;
}

export const CompletedExerciseCard = ({ name, points, maxPoints = 200, icon: Icon, color = "opal", weight }: CompletedExerciseCardProps) => {
    // Calculate fill percentage based on points
    const fillPct = Math.min((points / maxPoints) * 100, 100);

    // Get gradient based on color prop (opal for sane, orange for insane)
    const getGradient = () => {
        if (color === 'orange') return 'bg-gradient-to-r from-orange-500 via-orange-600 to-red-600';
        if (color === 'green') return 'bg-gradient-to-r from-green-500 via-green-600 to-emerald-600';
        return 'bg-gradient-to-r from-blue-400 via-blue-500 to-purple-600';
    };

    // Context-sensitive glow for compact workout cards
    const getShadow = () => {
        if (color === 'orange') return '0 0 20px 3px rgba(249, 115, 22, 0.3), 0 0 10px 0px rgba(249, 115, 22, 0.4)';
        if (color === 'green') return '0 0 20px 3px rgba(34, 197, 94, 0.3), 0 0 10px 0px rgba(34, 197, 94, 0.4)';
        return '0 0 20px 3px rgba(96, 165, 250, 0.25), 0 0 10px 0px rgba(79, 70, 229, 0.3)';
    };

    return (
        <div className="relative w-full rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 transition-all duration-300 flex items-center group cursor-pointer">

            {/* Solid gradient background - matching new design system */}
            <div
                className={`absolute top-0 left-0 h-full transition-all duration-500 ${getGradient()}`}
                style={{
                    width: `${fillPct}%`,
                    boxShadow: fillPct > 0 ? getShadow() : 'none'
                }}
            />

            {/* Content Layer */}
            <div className="relative z-10 w-full px-4 py-2.5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {/* Icon - optional, can be hidden for cleaner look */}
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                        <Icon size={12} className="text-white/80" />
                    </div>

                    {/* Text Info */}
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{name}</span>
                            {weight && (
                                <span className="text-[9px] font-bold bg-black/40 px-1.5 py-0.5 rounded text-zinc-300 border border-white/10">
                                    {weight}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Points */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white tabular-nums">
                        {points}
                    </span>
                    <span className="text-xs text-white/60 font-bold">pts</span>
                </div>
            </div>
        </div>
    );
};
