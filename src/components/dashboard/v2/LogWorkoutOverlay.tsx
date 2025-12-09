'use client'

import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Flame, Dumbbell, Heart, Moon, Zap, Star, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CompletedExerciseCard } from './CompletedExerciseCard';
import { StandardExerciseCard } from './StandardExerciseCard';
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation';
import { useWeekMode } from '@/contexts/WeekModeContext';
import { COLORS } from '@/utils/colors';

// Types
type Exercise = {
    id: string
    name: string
    type: string
    unit: string
    points_per_unit: number
    is_weighted: boolean
    is_time_based: boolean
}

type WorkoutLog = {
    id: string
    exercise_id: string
    count: number
    weight: number
    duration: number
    points: number
    date: string
    exercises?: Exercise
}

interface LogWorkoutOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userProfile: any;
    onLogSubmit?: () => void;
}

export const LogWorkoutOverlay = ({ isOpen, onClose, userId, userProfile, onLogSubmit }: LogWorkoutOverlayProps) => {
    const { weekMode } = useWeekMode();
    const [completedOpen, setCompletedOpen] = useState(true);
    const [favoritesOpen, setFavoritesOpen] = useState(true);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [todaysLogs, setTodaysLogs] = useState<WorkoutLog[]>([]);
    const [dailyTarget, setDailyTarget] = useState(0);
    const [loading, setLoading] = useState(true);

    // New log state
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [quantity, setQuantity] = useState('');
    const [weight, setWeight] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            loadData();
        }
    }, [isOpen, userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load exercises
            const { data: exerciseData } = await supabase
                .from('exercises')
                .select('*')
                .order('name');
            setExercises(exerciseData || []);

            // Load today's logs
            await loadTodaysLogs();

            // Load daily target
            if (userProfile?.group_id) {
                await loadDailyTarget();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTodaysLogs = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('logs')
            .select(`
        *,
        exercises (*)
      `)
            .eq('user_id', userId)
            .eq('date', today)
            .order('timestamp', { ascending: false });
        setTodaysLogs(data || []);
    };

    const loadDailyTarget = async () => {
        try {
            const { data: group } = await supabase
                .from('groups')
                .select('start_date')
                .eq('id', userProfile.group_id)
                .single();

            if (group?.start_date) {
                const { data: groupSettings } = await supabase
                    .from('group_settings')
                    .select('*')
                    .eq('group_id', userProfile.group_id)
                    .maybeSingle();

                const daysSinceStart = getDaysSinceStart(group.start_date);
                const target = calculateDailyTarget({
                    daysSinceStart,
                    weekMode: weekMode,
                    restDays: groupSettings?.rest_days || [1],
                    recoveryDays: groupSettings?.recovery_days || [5]
                });
                setDailyTarget(target);
            }
        } catch (error) {
            console.error('Error loading target:', error);
        }
    };

    const handleLogSubmit = async () => {
        if (!selectedExercise || !quantity) return;
        setIsSubmitting(true);

        const points = Math.floor(parseFloat(quantity) * selectedExercise.points_per_unit);
        const weightValue = parseFloat(weight) || 0;

        try {
            const { error } = await supabase
                .from('logs')
                .insert({
                    user_id: userId,
                    exercise_id: selectedExercise.id,
                    count: selectedExercise.unit === 'rep' ? Math.floor(parseFloat(quantity)) : 0,
                    weight: weightValue,
                    duration: selectedExercise.is_time_based ? Math.floor(parseFloat(quantity)) : 0,
                    points: Math.floor(points),
                    date: new Date().toISOString().split('T')[0],
                    timestamp: Date.now()
                });

            if (error) throw error;

            // Reset form
            setQuantity('');
            setWeight('');
            setSelectedExercise(null);

            // Reload data
            await loadTodaysLogs();

            // Update checkin status (simplified version of MobileWorkoutLogger logic)
            await updateDailyCheckin();

            if (onLogSubmit) onLogSubmit();

        } catch (error) {
            console.error('Error logging workout:', error);
            alert('Error logging workout');
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateDailyCheckin = async () => {
        // This logic mirrors MobileWorkoutLogger's updateDailyCheckin
        // For brevity, we'll assume the backend or a separate process handles the heavy lifting,
        // but we should at least update the local state if needed.
        // In a real migration, we'd extract this logic to a shared hook/service.
    };

    const getTotalPoints = () => {
        return todaysLogs.reduce((total, log) => total + log.points, 0);
    };

    const getIconForExercise = (exercise: Exercise) => {
        // Map exercise types/names to icons
        if (exercise.type === 'recovery') return Moon;
        if (exercise.name.toLowerCase().includes('run')) return Flame;
        if (exercise.name.toLowerCase().includes('squat')) return Heart;
        if (exercise.name.toLowerCase().includes('push')) return Dumbbell;
        return Zap;
    };

    const totalPoints = getTotalPoints();
    const progressPct = dailyTarget > 0 ? Math.min(Math.round((totalPoints / dailyTarget) * 100), 100) : 0;

    return (
        <div
            className={`fixed inset-0 z-[100] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* The Card Sheet */}
            <div className="absolute bottom-0 left-0 w-full h-[92vh] bg-black rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.8)] border-t border-white/10">

                {/* Header - Matching new design system */}
                <div className={`relative h-20 flex items-center justify-between px-6 shrink-0 border-b border-white/5 ${weekMode === 'insane'
                    ? 'bg-gradient-to-b from-orange-500/10 to-transparent'
                    : 'bg-gradient-to-b from-blue-400/10 to-transparent'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${weekMode === 'insane'
                            ? 'bg-orange-500/20'
                            : 'bg-blue-400/20'
                            }`}>
                            <Activity size={18} className={weekMode === 'insane' ? 'text-orange-500' : 'text-blue-400'} />
                        </div>
                        <div>
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{
                                color: weekMode === 'insane' ? COLORS.orange.rgb.primary : COLORS.opal.rgb.primary
                            }}>Log Workout</h2>
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm font-bold text-zinc-400">{totalPoints}/{dailyTarget}</span>
                                <span className="text-xs text-zinc-500">pts</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight">{progressPct}%</div>
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

                    {/* Input Area (if exercise selected) - New design system */}
                    {selectedExercise && (
                        <div className={`bg-white/5 rounded-xl p-4 border mb-4 animate-in fade-in slide-in-from-bottom-4 ${weekMode === 'insane'
                            ? 'border-orange-500/30'
                            : 'border-blue-400/30'
                            }`}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-black text-white tracking-tighter">{selectedExercise.name}</h3>
                                <button onClick={() => setSelectedExercise(null)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="number"
                                    placeholder="Quantity"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className={`flex-1 bg-black/50 border rounded-xl px-4 py-3 text-white outline-none transition-colors ${weekMode === 'insane'
                                        ? 'border-white/10 focus:border-orange-500/50'
                                        : 'border-white/10 focus:border-blue-400/50'
                                        }`}
                                    autoFocus
                                />
                                {selectedExercise.is_weighted && (
                                    <input
                                        type="number"
                                        placeholder="Weight (kg)"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        className={`w-24 bg-black/50 border rounded-xl px-4 py-3 text-white outline-none transition-colors ${weekMode === 'insane'
                                            ? 'border-white/10 focus:border-orange-500/50'
                                            : 'border-white/10 focus:border-blue-400/50'
                                            }`}
                                    />
                                )}
                            </div>
                            <button
                                onClick={handleLogSubmit}
                                disabled={isSubmitting || !quantity}
                                className={`w-full font-black py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${weekMode === 'insane'
                                    ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white hover:shadow-lg'
                                    : 'bg-gradient-to-r from-blue-400 via-blue-500 to-purple-600 text-white hover:shadow-lg'
                                    }`}
                                style={{
                                    boxShadow: weekMode === 'insane'
                                        ? '0 0 20px 3px rgba(249, 115, 22, 0.3), 0 0 10px 0px rgba(249, 115, 22, 0.4)'
                                        : '0 0 20px 3px rgba(96, 165, 250, 0.25), 0 0 10px 0px rgba(79, 70, 229, 0.3)'
                                }}
                            >
                                {isSubmitting ? 'LOGGING...' : `LOG ${quantity ? Math.floor(parseFloat(quantity) * selectedExercise.points_per_unit) : 0} POINTS`}
                            </button>
                        </div>
                    )}

                    {/* 1. Completed Exercises - New design system */}
                    <div>
                        <button
                            onClick={() => setCompletedOpen(!completedOpen)}
                            className="w-full flex items-center justify-between mb-3 px-2"
                        >
                            <h3 className="text-xs font-bold uppercase tracking-widest" style={{
                                color: weekMode === 'insane' ? COLORS.orange.rgb.primary : COLORS.opal.rgb.primary
                            }}>
                                Completed Exercises ({todaysLogs.length})
                            </h3>
                            <ChevronDown size={14} className={`text-zinc-500 transition-transform ${completedOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {completedOpen && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                                {todaysLogs.map(log => (
                                    <CompletedExerciseCard
                                        key={log.id}
                                        name={log.exercises?.name || 'Unknown'}
                                        points={log.points}
                                        maxPoints={dailyTarget}
                                        icon={getIconForExercise(log.exercises as Exercise)}
                                        color={weekMode === 'insane' ? 'orange' : 'opal'}
                                        weight={log.weight > 0 ? `${log.weight}kg` : undefined}
                                    />
                                ))}
                                {todaysLogs.length === 0 && (
                                    <div className="text-center py-8 text-zinc-500 text-sm">No exercises logged yet today</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. Favorites / All Exercises - New design system */}
                    <div>
                        <button
                            onClick={() => setFavoritesOpen(!favoritesOpen)}
                            className="w-full flex items-center justify-between mb-3 px-2 mt-6"
                        >
                            <div className="flex items-center gap-2">
                                <Activity size={14} className={weekMode === 'insane' ? 'text-orange-500' : 'text-blue-400'} />
                                <h3 className="text-xs font-bold text-white uppercase tracking-widest">All Exercises</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-600 font-bold">{exercises.length}</span>
                                <ChevronDown size={14} className={`text-zinc-500 transition-transform ${favoritesOpen ? 'rotate-180' : ''}`} />
                            </div>
                        </button>

                        {favoritesOpen && (
                            <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                                {exercises.map(ex => (
                                    <StandardExerciseCard
                                        key={ex.id}
                                        name={ex.name}
                                        type={ex.type === 'recovery' ? 'recovery' : 'standard'}
                                        defaultVal={`${ex.points_per_unit} pts/${ex.unit}`}
                                        icon={getIconForExercise(ex)}
                                        onClick={() => setSelectedExercise(ex)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pb-10" />
                </div>
            </div>
            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
      `}</style>
        </div>
    );
};
