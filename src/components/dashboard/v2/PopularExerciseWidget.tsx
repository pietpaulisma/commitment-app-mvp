'use client'

import React from 'react';
import { Dumbbell } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { CardHeader } from './CardHeader';

interface PopularExerciseWidgetProps {
    exerciseName: string;
    count: number;
    isPersonal?: boolean;
}

export function PopularExerciseWidget({ exerciseName, count, isPersonal = false }: PopularExerciseWidgetProps) {
    const title = isPersonal ? "Your Top Exercise" : "Group Favorite";
    const subtitle = isPersonal ? "Most logged this week" : "Squad's most popular";

    return (
        <GlassCard noPadding className="h-[160px]">
            <CardHeader
                title={title}
                icon={Dumbbell}
                colorClass="text-purple-500"
                rightContent="THIS WEEK"
            />
            <div className="p-6 pt-2 flex flex-col justify-center h-[calc(100%-48px)]">
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-black text-white tracking-tighter truncate">
                        {exerciseName || "None"}
                    </span>
                </div>
                <div className="text-xs text-zinc-500">
                    {count > 0 ? (
                        <span>{count} log{count !== 1 ? 's' : ''} {subtitle}</span>
                    ) : (
                        <span>No workouts logged yet</span>
                    )}
                </div>
            </div>
        </GlassCard>
    );
}
