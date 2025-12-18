'use client'

import React from 'react';
import { Dumbbell, Flame, Heart, Moon, Zap } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { CardHeader } from './CardHeader';
import { TimePeriod, TIME_PERIOD_LABELS, getNextTimePeriod } from '@/utils/timePeriodHelpers';

interface Exercise {
    name: string;
    count: number;
    emoji?: string;
    contributors?: string[];
}

interface PopularExerciseWidgetProps {
    exercises: Array<{ name: string; count: number; contributors?: string[] }>;
    isPersonal?: boolean;
    customTitle?: string;
    customRightContent?: string;
    timePeriod?: TimePeriod;
    onTimePeriodChange?: (newPeriod: TimePeriod) => void;
}

export function PopularExerciseWidget({ exercises, isPersonal = false, customTitle, customRightContent, timePeriod, onTimePeriodChange }: PopularExerciseWidgetProps) {
    const title = customTitle || (isPersonal ? "Your Top Exercise" : "Group Favorite");
    // Use time period label if provided, otherwise fall back to customRightContent or default
    const rightContent = timePeriod ? TIME_PERIOD_LABELS[timePeriod] : (customRightContent || "THIS WEEK");
    const maxCount = Math.max(...exercises.map(e => e.count), 1);
    
    const handleTimePeriodClick = () => {
        if (timePeriod && onTimePeriodChange) {
            onTimePeriodChange(getNextTimePeriod(timePeriod));
        }
    };

    // Helper to convert points to quantity and get unit
    // NOTE: This is a fallback for when we don't have exercise metadata
    // The actual conversion should use points_per_unit from the database
    const getQuantityAndUnit = (name: string, points: number): { quantity: number; unit: string } => {
        const lower = name.toLowerCase();

        // Sports (need to divide by points per minute)
        if (lower.includes('intense sport')) {
            return { quantity: Math.round(points / 375), unit: 'min' };
        }
        if (lower.includes('medium sport')) {
            return { quantity: Math.round(points / 250), unit: 'min' };
        }
        if (lower.includes('light sport')) {
            return { quantity: Math.round(points / 125), unit: 'min' };
        }

        // Time-based exercises
        if (lower.includes('plank') || lower.includes('wall sit')) {
            return { quantity: Math.round(points / 25), unit: 'min' };
        }
        if (lower.includes('battle rope')) {
            return { quantity: Math.round(points / 35), unit: 'min' };
        }
        if (lower.includes('jog')) {
            return { quantity: Math.round(points / 20), unit: 'min' };
        }
        if (lower.includes('yoga') || lower.includes('meditat') || lower.includes('stretch') || lower.includes('blackroll')) {
            return { quantity: Math.round(points / 10), unit: 'min' };
        }

        // Rep-based exercises
        if (lower.includes('pull')) {
            return { quantity: Math.round(points / 4), unit: 'reps' };
        }
        if (lower.includes('burpee')) {
            return { quantity: Math.round(points / 3), unit: 'reps' };
        }
        if (lower.includes('jumping jack')) {
            return { quantity: Math.round(points / 0.333), unit: 'reps' };
        }

        // Most exercises are 1 point = 1 rep
        // This includes push-ups, dips, squats, sit-ups, lunges, etc.
        return { quantity: points, unit: 'reps' };
    };

    // Helpers for emojis
    const getExerciseEmoji = (name: string): string | null => {
        const lower = name.toLowerCase();
        if (lower.includes('run') || lower.includes('sprint') || lower.includes('jog')) return '🏃‍♂️';
        if (lower.includes('walk') || lower.includes('hike')) return '🚶‍♂️';
        if (lower.includes('swim')) return '🏊‍♂️';
        if (lower.includes('cycle') || lower.includes('bike') || lower.includes('ride')) return '🚴‍♂️';
        if (lower.includes('yoga') || lower.includes('stretch')) return '🧘‍♂️';
        if (lower.includes('weight') || lower.includes('lift') || lower.includes('press') || lower.includes('bench')) return '🏋️‍♂️';
        if (lower.includes('squat') || lower.includes('leg')) return '🦵';
        if (lower.includes('push') || lower.includes('pull') || lower.includes('chin')) return '💪';
        if (lower.includes('abs') || lower.includes('core') || lower.includes('plank')) return '🍫';
        if (lower.includes('hiit') || lower.includes('crossfit')) return '🔥';
        if (lower.includes('box') || lower.includes('kick')) return '🥊';
        if (lower.includes('dance') || lower.includes('zumba')) return '💃';
        if (lower.includes('tennis') || lower.includes('racket')) return '🎾';
        if (lower.includes('soccer') || lower.includes('football')) return '⚽';
        if (lower.includes('basketball')) return '🏀';
        if (lower.includes('climb')) return '🧗‍♂️';
        if (lower.includes('row')) return '🚣‍♂️';
        if (lower.includes('jump') || lower.includes('skip')) return '🦘';
        if (lower.includes('recovery') || lower.includes('sleep') || lower.includes('meditate')) return '🌙';
        return null;
    };

    // If exercises array is provided (new format), use it
    if (exercises && exercises.length > 0) {
        // Find top exercise to set header color
        const topExercise = exercises.reduce((prev, current) => (prev.count > current.count) ? prev : current);

        return (
            <GlassCard noPadding className="col-span-2">
                <CardHeader
                    title={title}
                    icon={Dumbbell}
                    colorClass={maxCount > 500 ? "text-orange-500" : "text-blue-500"}
                    rightContent={rightContent}
                    onRightContentClick={timePeriod && onTimePeriodChange ? handleTimePeriodClick : undefined}
                />
                <div className="p-4 space-y-3">
                    {exercises.slice(0, 5).map((exercise, index) => {
                        const percentage = Math.max((exercise.count / maxCount) * 100, 15); // Min 15% for visibility
                        const isHigh = exercise.count > 500;

                        // Icon mapping (fallback if no emoji)
                        let Icon = Zap;
                        const emoji = getExerciseEmoji(exercise.name);
                        const nameLower = exercise.name.toLowerCase();

                        if (!emoji) {
                            if (nameLower.includes('run')) Icon = Flame;
                            else if (nameLower.includes('squat')) Icon = Heart;
                            else if (nameLower.includes('push') || nameLower.includes('press')) Icon = Dumbbell;
                            else if (nameLower.includes('recovery')) Icon = Moon;
                        }

                        const glowStyle = isHigh
                            ? '0 0 15px 1px rgba(249, 115, 22, 0.3), 0 0 5px 0px rgba(249, 115, 22, 0.4)'
                            : '0 0 15px 1px rgba(96, 165, 250, 0.25), 0 0 5px 0px rgba(79, 70, 229, 0.3)';

                        return (
                            <div key={index} className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-3">
                                    {/* Rank Outside */}
                                    <span className="text-xs font-black text-zinc-500 w-4 text-center">
                                        #{index + 1}
                                    </span>

                                    <div className="relative flex-1 h-11 rounded-lg bg-zinc-800/40 overflow-hidden border border-white/5 flex items-center group">
                                        {/* Bar Background */}
                                        <div
                                            className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${isHigh
                                                ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-red-600'
                                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                                }`}
                                            style={{
                                                width: `${percentage}%`,
                                                boxShadow: glowStyle
                                            }}
                                        />

                                        {/* Content Content */}
                                        <div className="relative z-10 w-full px-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* Icon/Emoji */}
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isHigh ? 'bg-black/20 text-white' : 'bg-black/20 text-white'}`}>
                                                    {emoji ? (
                                                        <span className="text-sm">{emoji}</span>
                                                    ) : (
                                                        <Icon size={12} />
                                                    )}
                                                </div>

                                                {/* Name */}
                                                <span className="text-sm font-black text-white tracking-tight drop-shadow-sm uppercase truncate max-w-[120px]">
                                                    {exercise.name}
                                                </span>
                                            </div>

                                            {/* Quantity */}
                                            {(() => {
                                                const { quantity, unit } = getQuantityAndUnit(exercise.name, exercise.count);
                                                return (
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-lg font-black text-white drop-shadow-md tabular-nums">
                                                            {quantity}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-white/70 uppercase">
                                                            {unit}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Contributors - Below the bar */}
                                {exercise.contributors && exercise.contributors.length > 0 && !isPersonal && (
                                    <div className="flex gap-1.5 ml-7 flex-wrap">
                                        {exercise.contributors.map((name, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[9px] font-bold text-white/60 uppercase tracking-wide px-1.5 py-0.5 bg-white/5 rounded border border-white/10"
                                            >
                                                {name.slice(0, 4)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </GlassCard>
        );
    }

    // Empty state - show widget even with no data
    return (
        <GlassCard>
            <CardHeader
                title={title}
                icon={Flame}
                colorClass="text-purple-400"
            />
            <div className="p-6">
                <div className="text-center text-zinc-500">
                    <div className="text-sm">No workouts logged this week</div>
                    <div className="text-xs text-zinc-600 mt-1">Start logging to see your favorites!</div>
                </div>
            </div>
        </GlassCard>
    );
}
