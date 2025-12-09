import React from 'react';
import { Plus, LucideIcon } from 'lucide-react';

interface StandardExerciseCardProps {
    name: string;
    type?: 'standard' | 'recovery' | 'fav';
    defaultVal: string;
    icon: LucideIcon;
    onClick?: () => void;
}

export const StandardExerciseCard = ({ name, type = 'standard', defaultVal, icon: Icon, onClick }: StandardExerciseCardProps) => {
    const isRecovery = type === 'recovery';
    const isFav = type === 'fav';

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between py-3 px-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors group"
        >
            <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isFav
                    ? 'bg-blue-500/20 text-blue-400'
                    : isRecovery
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-zinc-300'
                    }`}>
                    <Icon size={14} />
                </div>

                {/* Name */}
                <div className="text-left">
                    <div className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{name}</div>
                    {isRecovery && (
                        <div className="text-[9px] font-bold text-green-500/60 uppercase tracking-wider">Recovery</div>
                    )}
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-400 transition-colors tabular-nums">{defaultVal}</span>
                <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-white/10 transition-all">
                    <Plus size={14} />
                </div>
            </div>
        </button>
    );
};
