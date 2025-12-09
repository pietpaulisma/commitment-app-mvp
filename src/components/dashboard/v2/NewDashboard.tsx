'use client'

import React, { useState, useEffect } from 'react';
import { MessageCircle, Trophy, Calendar, CheckCircle2, ChevronRight, Zap, Flame, Clock, CircleDollarSign, Gift, TrendingUp, AlertCircle, Menu, Star, Dumbbell, Moon, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWeekMode } from '@/contexts/WeekModeContext';
import { GlassCard } from './GlassCard';
import { CardHeader } from './CardHeader';
import { SquadMemberRow } from './SquadMemberRow';
import { BarChart } from './BarChart';
import { PersonalOverperformChart } from './PersonalOverperformChart';
import { PeakWorkoutTimeChart } from './PeakWorkoutTimeChart';
import { PopularExerciseWidget } from './PopularExerciseWidget';
import WorkoutModal from '@/components/modals/WorkoutModal';
import { BottomNavigation } from './BottomNavigation';
import { calculateDailyTarget, getDaysSinceStart } from '@/utils/targetCalculation';
import WeeklyOverperformers from '@/components/WeeklyOverperformers';
import { SeasonalChampionsWidget } from '@/components/SeasonalChampionsWidget';
import { COLORS } from '@/utils/colors';
import GroupChat from '@/components/GroupChat';

export default function NewDashboard() {
    const { user } = useAuth();
    const { weekMode } = useWeekMode();
    const [time, setTime] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<"group" | "personal">("group");
    const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [squadData, setSquadData] = useState<any[]>([]);
    const [potHistory, setPotHistory] = useState<any[]>([]);
    const [daysRemaining, setDaysRemaining] = useState(999); // Default 999 to debug if calculation works
    const [totalPot, setTotalPot] = useState(0);
    const [loading, setLoading] = useState(true);
    const [totalGroupPoints, setTotalGroupPoints] = useState(0);
    const [peakWorkoutTime, setPeakWorkoutTime] = useState('--:--');
    const [recapData, setRecapData] = useState<{
        completedMembers: string[];
        pendingMembers: Array<{ username: string; actual: number; target: number }>;
        sickMembers: string[];
        yesterdayDate: string;
    }>({
        completedMembers: [],
        pendingMembers: [],
        sickMembers: [],
        yesterdayDate: ''
    });
    const [personalPoints, setPersonalPoints] = useState({
        total: 0,
        baseTarget: 0,
        overperformance: 0
    });
    const [lastContribution, setLastContribution] = useState<{
        amount: number;
        daysAgo: number;
        date: string;
    } | null>(null);
    const [personalDailyData, setPersonalDailyData] = useState<Array<{
        date: string;
        actual: number;
        target: number;
    }>>([]);
    const [hourlyWorkoutData, setHourlyWorkoutData] = useState<number[]>(new Array(24).fill(0));
    const [popularExerciseGroup, setPopularExerciseGroup] = useState<{ name: string; count: number }>({ name: '', count: 0 });
    const [popularExercisePersonal, setPopularExercisePersonal] = useState<{ name: string; count: number }>({ name: '', count: 0 });

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        if (!user) return;
        setLoading(true);
        console.log('[NewDashboard] Starting loadDashboardData for user:', user.id);
        try {
            // 1. Get User Profile & Group
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('[NewDashboard] Error fetching profile:', profileError);
            }
            console.log('[NewDashboard] User profile:', profile);
            console.log('[NewDashboard] Profile has group_id:', profile?.group_id);
            setUserProfile(profile);

            if (profile?.group_id) {
                // 2. Get Group Data (Start Date, etc.)
                console.log('[NewDashboard] Fetching group data for group_id:', profile.group_id);
                const { data: group, error: groupError } = await supabase
                    .from('groups')
                    .select('*')
                    .eq('id', profile.group_id)
                    .single();

                if (groupError) {
                    console.error('[NewDashboard] Error fetching group:', groupError);
                }
                console.log('[NewDashboard] Group data:', group);
                console.log('[NewDashboard] Group start_date:', group?.start_date);

                if (group && group.start_date) {
                    // Calculate days SINCE start (counting up, not down)
                    const start = new Date(group.start_date);
                    const now = new Date();
                    const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

                    console.log('[NewDashboard] Days calculation:', {
                        start_date: group.start_date,
                        days_since_start: daysSinceStart
                    });
                    setDaysRemaining(daysSinceStart);
                } else {
                    console.error('[NewDashboard] Group or start_date missing:', { group });
                }

                // 3. Get Squad Data (Leaderboard) - Use API to bypass RLS
                const today = new Date().toISOString().split('T')[0];
                console.log('Fetching squad status for date:', today);

                try {
                    const response = await fetch(`/api/dashboard/squad-status?groupId=${profile.group_id}&date=${today}`);
                    const data = await response.json();

                    if (data.error) {
                        console.error('Error from squad-status API:', data.error);
                    } else {
                        console.log('Squad data from API:', data.squad);

                        const squad = data.squad.map((u: any) => ({
                            name: u.id === user.id ? "You" : u.username || "User",
                            pct: u.is_sick_mode ? u.pct : u.pct, // Percentage already calculated correctly
                            mode: u.is_sick_mode ? "sick" : (u.week_mode || "insane"), // Show sick mode or actual week mode
                            isLive: false // TODO: Real-time status from last_seen
                        }));

                        // Sort: You first, then by pct
                        const sortedSquad = [
                            ...squad.filter(u => u.name === "You"),
                            ...squad.filter(u => u.name !== "You").sort((a, b) => b.pct - a.pct)
                        ];
                        setSquadData(sortedSquad);
                    }
                } catch (error) {
                    console.error('Error fetching squad status:', error);
                }

                // 4. Get Pot History from payment_transactions
                try {
                    const { data: transactions, error: transError } = await supabase
                        .from('payment_transactions')
                        .select('amount, user_id, transaction_type, created_at, profiles!inner(username)')
                        .eq('group_id', profile.group_id)
                        .in('transaction_type', ['penalty', 'payment', 'donation'])
                        .order('created_at', { ascending: false });

                    if (transError) {
                        console.error('[NewDashboard] Error loading transactions:', transError);
                    } else {
                        console.log('[NewDashboard] Transactions loaded:', transactions?.length);

                        // Calculate net amounts per user (penalties - payments)
                        const userNetMap = new Map();
                        transactions?.forEach(t => {
                            const userId = t.user_id;
                            const amount = t.transaction_type === 'penalty' ? t.amount : -t.amount;
                            userNetMap.set(userId, (userNetMap.get(userId) || 0) + amount);
                        });

                        // Calculate total pot (sum of positive net amounts)
                        const pot = Array.from(userNetMap.values())
                            .filter(amt => amt > 0)
                            .reduce((sum, amt) => sum + amt, 0);
                        setTotalPot(pot);

                        // Get latest transaction per user for history display
                        const userLatestTrans = new Map();
                        transactions?.forEach(t => {
                            if (!userLatestTrans.has(t.user_id)) {
                                userLatestTrans.set(t.user_id, {
                                    username: t.profiles.username,
                                    date: t.created_at,
                                    amount: userNetMap.get(t.user_id) || 0
                                });
                            }
                        });

                        // Convert to history array with days ago
                        const history = Array.from(userLatestTrans.values())
                            .filter(u => u.amount > 0)
                            .map(u => {
                                const daysAgo = Math.floor((Date.now() - new Date(u.date).getTime()) / (1000 * 60 * 60 * 24));
                                return {
                                    name: u.username,
                                    amt: u.amount,
                                    days: daysAgo
                                };
                            })
                            .sort((a, b) => b.amt - a.amt);

                        setPotHistory(history);

                        // Get user's last contribution for personal view
                        const userTransactions = transactions?.filter(t => t.user_id === user.id) || [];
                        if (userTransactions.length > 0) {
                            const lastTrans = userTransactions[0]; // Already sorted by created_at desc
                            const userNetAmount = userNetMap.get(user.id) || 0;
                            if (userNetAmount > 0) {
                                const daysAgo = Math.floor((Date.now() - new Date(lastTrans.created_at).getTime()) / (1000 * 60 * 60 * 24));
                                setLastContribution({
                                    amount: userNetAmount,
                                    daysAgo,
                                    date: new Date(lastTrans.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error('[NewDashboard] Error in pot history:', error);
                }

                // 5. Get Yesterday's Recap Data
                try {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    const yesterdayDayOfWeek = yesterday.getDay();

                    console.log('[NewDashboard] Loading recap for:', yesterdayStr);

                    // Get group settings
                    const { data: groupSettings } = await supabase
                        .from('group_settings')
                        .select('rest_days, recovery_days')
                        .eq('group_id', profile.group_id)
                        .maybeSingle();

                    const restDays = groupSettings?.rest_days || [1];
                    const recoveryDays = groupSettings?.recovery_days || [5];
                    const isRestDay = restDays.includes(yesterdayDayOfWeek);

                    // Get all group members
                    const { data: members } = await supabase
                        .from('profiles')
                        .select('id, username, week_mode, is_sick_mode')
                        .eq('group_id', profile.group_id);

                    if (!members || members.length === 0) {
                        console.log('[NewDashboard] No members found for recap');
                        return;
                    }

                    // Get penalties for yesterday
                    const { data: penalties } = await supabase
                        .from('pending_penalties')
                        .select('user_id, status, actual_points, target_points')
                        .eq('group_id', profile.group_id)
                        .eq('date', yesterdayStr);

                    const penaltyMap = new Map(penalties?.map(p => [p.user_id, p]) || []);

                    // Get yesterday's logs (using logs table which contains the actual data)
                    const { data: yesterdayLogs } = await supabase
                        .from('logs')
                        .select('user_id, points, exercise_id')
                        .eq('date', yesterdayStr)
                        .in('user_id', members.map(m => m.id));

                    // Get exercises to check types
                    const { data: exercises } = await supabase
                        .from('exercises')
                        .select('id, type');

                    const exerciseTypeMap = new Map(exercises?.map(e => [e.id, e.type]) || []);

                    // Calculate days since start for target calculation
                    const startDate = new Date(group.start_date);
                    const daysSinceStartForYesterday = Math.floor((yesterday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

                    const completedList: string[] = [];
                    const pendingList: Array<{ username: string; actual: number; target: number }> = [];
                    const sickList: string[] = [];

                    // Process each member
                    for (const member of members) {
                        // Check sick mode
                        if (member.is_sick_mode) {
                            sickList.push(member.username);
                            continue;
                        }

                        // Check rest day
                        if (isRestDay) {
                            completedList.push(member.username);
                            continue;
                        }

                        // Calculate target
                        const dailyTarget = calculateDailyTarget({
                            daysSinceStart: daysSinceStartForYesterday,
                            weekMode: member.week_mode || 'insane',
                            restDays,
                            recoveryDays,
                            currentDayOfWeek: yesterdayDayOfWeek
                        });

                        // Calculate actual points with recovery capping
                        const memberLogs = yesterdayLogs?.filter(l => l.user_id === member.id) || [];
                        let totalRecovery = 0;
                        let totalNonRecovery = 0;

                        memberLogs.forEach(log => {
                            const exerciseType = exerciseTypeMap.get(log.exercise_id);
                            if (exerciseType === 'recovery') {
                                totalRecovery += log.points;
                            } else {
                                totalNonRecovery += log.points;
                            }
                        });

                        const recoveryCapLimit = Math.round(dailyTarget * 0.25);
                        const cappedRecovery = Math.min(totalRecovery, recoveryCapLimit);
                        const actualPoints = totalNonRecovery + cappedRecovery;

                        const metTarget = actualPoints >= dailyTarget;
                        const penalty = penaltyMap.get(member.id);

                        if (metTarget) {
                            completedList.push(member.username);
                        } else if (penalty && penalty.status === 'pending') {
                            pendingList.push({
                                username: member.username,
                                actual: actualPoints,
                                target: dailyTarget
                            });
                        }
                    }

                    setRecapData({
                        completedMembers: completedList,
                        pendingMembers: pendingList,
                        sickMembers: sickList,
                        yesterdayDate: yesterdayStr
                    });

                    console.log('[NewDashboard] Recap loaded:', {
                        completed: completedList.length,
                        pending: pendingList.length,
                        sick: sickList.length
                    });

                } catch (error) {
                    console.error('[NewDashboard] Error loading recap:', error);
                }

                // 6. Calculate Group Points (last 30 days)
                try {
                    console.log('[NewDashboard] Calculating group points...');

                    // Get all group members
                    const { data: members } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('group_id', profile.group_id);

                    if (members && members.length > 0) {
                        const memberIds = members.map(m => m.id);

                        // Get last 30 days
                        const past30Days = Array.from({ length: 30 }, (_, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            return date.toISOString().split('T')[0];
                        }).reverse();

                        // Get logs for all members in last 30 days
                        const { data: logs } = await supabase
                            .from('logs')
                            .select('date, points')
                            .in('user_id', memberIds)
                            .in('date', past30Days);

                        // Calculate total points
                        const totalPoints = logs?.reduce((sum, log) => sum + log.points, 0) || 0;
                        setTotalGroupPoints(totalPoints);

                        console.log('[NewDashboard] Group points calculated:', totalPoints);
                    }
                } catch (error) {
                    console.error('[NewDashboard] Error calculating group points:', error);
                }

                // 6.5. Calculate Personal Points (last 30 days) - user's base target + overperformance
                try {
                    console.log('[NewDashboard] Calculating personal points...');

                    // Get group settings and start date
                    const { data: groupSettings } = await supabase
                        .from('group_settings')
                        .select('rest_days, recovery_days')
                        .eq('group_id', profile.group_id)
                        .maybeSingle();

                    const restDays = groupSettings?.rest_days || [1];
                    const recoveryDays = groupSettings?.recovery_days || [5];
                    const groupStartDate = new Date(group.start_date);

                    // Get last 30 days
                    const past30Days = Array.from({ length: 30 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        return date.toISOString().split('T')[0];
                    }).reverse();

                    // Get user's logs for last 30 days
                    const { data: userLogs } = await supabase
                        .from('logs')
                        .select('date, points, exercise_id')
                        .eq('user_id', user.id)
                        .in('date', past30Days);

                    // Get exercises to check types for recovery capping
                    const { data: exercises } = await supabase
                        .from('exercises')
                        .select('id, type');

                    const exerciseTypeMap = new Map(exercises?.map(e => [e.id, e.type]) || []);

                    // Group logs by date and apply recovery capping
                    const dailyPointsMap = new Map<string, number>();
                    const logsByDate = new Map<string, any[]>();

                    userLogs?.forEach(log => {
                        if (!logsByDate.has(log.date)) {
                            logsByDate.set(log.date, []);
                        }
                        logsByDate.get(log.date)!.push(log);
                    });

                    // Process each day with recovery capping
                    logsByDate.forEach((dayLogs, date) => {
                        const dateObj = new Date(date);
                        const dayOfWeek = dateObj.getDay();
                        const daysSinceStart = Math.floor((dateObj.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24));

                        // Calculate daily target for recovery cap
                        const dailyTarget = calculateDailyTarget({
                            daysSinceStart,
                            weekMode: profile.week_mode || 'sane',
                            restDays,
                            recoveryDays,
                            currentDayOfWeek: dayOfWeek
                        });

                        const recoveryCapLimit = Math.round(dailyTarget * 0.25);

                        // Separate recovery and non-recovery points
                        let totalRecoveryPoints = 0;
                        let totalNonRecoveryPoints = 0;

                        dayLogs.forEach(log => {
                            const exerciseType = exerciseTypeMap.get(log.exercise_id);
                            if (exerciseType === 'recovery') {
                                totalRecoveryPoints += log.points;
                            } else {
                                totalNonRecoveryPoints += log.points;
                            }
                        });

                        // Apply recovery cap
                        const cappedRecoveryPoints = Math.min(totalRecoveryPoints, recoveryCapLimit);
                        const totalDayPoints = totalNonRecoveryPoints + cappedRecoveryPoints;

                        dailyPointsMap.set(date, totalDayPoints);
                    });

                    // Calculate total actual points
                    const totalActualPoints = Array.from(dailyPointsMap.values()).reduce((sum, pts) => sum + pts, 0);

                    // Calculate base target for the 30 days AND build daily data array for chart
                    let totalBaseTarget = 0;
                    const dailyDataArray: Array<{ date: string; actual: number; target: number }> = [];

                    past30Days.forEach(dateStr => {
                        const dateObj = new Date(dateStr);
                        const dayOfWeek = dateObj.getDay();
                        const daysSinceStart = Math.floor((dateObj.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24));

                        const dailyTarget = calculateDailyTarget({
                            daysSinceStart,
                            weekMode: profile.week_mode || 'sane',
                            restDays,
                            recoveryDays,
                            currentDayOfWeek: dayOfWeek
                        });

                        totalBaseTarget += dailyTarget;

                        // Add to daily data array for chart
                        dailyDataArray.push({
                            date: dateStr,
                            actual: dailyPointsMap.get(dateStr) || 0,
                            target: dailyTarget
                        });
                    });

                    // Calculate overperformance (total - base target, but only if positive)
                    const overperformance = Math.max(0, totalActualPoints - totalBaseTarget);

                    setPersonalPoints({
                        total: totalActualPoints,
                        baseTarget: totalBaseTarget,
                        overperformance
                    });

                    setPersonalDailyData(dailyDataArray);

                    console.log('[NewDashboard] Personal points calculated:', {
                        total: totalActualPoints,
                        baseTarget: totalBaseTarget,
                        overperformance
                    });

                } catch (error) {
                    console.error('[NewDashboard] Error calculating personal points:', error);
                }

                // 7. Calculate Peak Workout Time
                try {
                    console.log('[NewDashboard] Calculating peak workout time...');

                    const { data: members } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('group_id', profile.group_id);

                    if (members && members.length > 0) {
                        const memberIds = members.map(m => m.id);

                        // Get all logs with created_at timestamp
                        const { data: timeLogs } = await supabase
                            .from('logs')
                            .select('created_at')
                            .in('user_id', memberIds);

                        // Count workouts by hour
                        const hourCounts = new Array(24).fill(0);
                        timeLogs?.forEach(log => {
                            const hour = new Date(log.created_at).getHours();
                            hourCounts[hour]++;
                        });

                        const mostPopularHour = hourCounts.indexOf(Math.max(...hourCounts));
                        const peakTime = `${String(mostPopularHour).padStart(2, '0')}:00`;
                        setPeakWorkoutTime(peakTime);
                        setHourlyWorkoutData(hourCounts);

                        console.log('[NewDashboard] Peak workout time:', peakTime);
                    }
                } catch (error) {
                    console.error('[NewDashboard] Error calculating peak workout time:', error);
                }

                // 8. Calculate Most Popular Exercise (Group - This Week)
                try {
                    console.log('[NewDashboard] Calculating group popular exercise...');

                    const { data: members } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('group_id', profile.group_id);

                    if (members && members.length > 0) {
                        const memberIds = members.map(m => m.id);

                        // Get Monday of current week
                        const today = new Date();
                        const currentDay = today.getDay();
                        const mondayOffset = currentDay === 0 ? 6 : currentDay - 1;
                        const monday = new Date(today);
                        monday.setDate(today.getDate() - mondayOffset);
                        monday.setHours(0, 0, 0, 0);
                        const mondayStr = monday.toISOString().split('T')[0];

                        // Get logs for current week
                        const { data: weekLogs } = await supabase
                            .from('logs')
                            .select('exercise_id, exercises(name)')
                            .in('user_id', memberIds)
                            .gte('date', mondayStr);

                        // Count exercises
                        const exerciseCount = new Map<string, { name: string; count: number }>();
                        weekLogs?.forEach(log => {
                            const exerciseName = log.exercises?.name || 'Unknown';
                            const current = exerciseCount.get(log.exercise_id);
                            if (current) {
                                current.count++;
                            } else {
                                exerciseCount.set(log.exercise_id, { name: exerciseName, count: 1 });
                            }
                        });

                        // Find most popular
                        let mostPopular = { name: '', count: 0 };
                        exerciseCount.forEach(exercise => {
                            if (exercise.count > mostPopular.count) {
                                mostPopular = exercise;
                            }
                        });

                        setPopularExerciseGroup(mostPopular);
                        console.log('[NewDashboard] Group popular exercise:', mostPopular);
                    }
                } catch (error) {
                    console.error('[NewDashboard] Error calculating group popular exercise:', error);
                }

                // 9. Calculate Most Popular Exercise (Personal - This Week)
                try {
                    console.log('[NewDashboard] Calculating personal popular exercise...');

                    // Get Monday of current week
                    const today = new Date();
                    const currentDay = today.getDay();
                    const mondayOffset = currentDay === 0 ? 6 : currentDay - 1;
                    const monday = new Date(today);
                    monday.setDate(today.getDate() - mondayOffset);
                    monday.setHours(0, 0, 0, 0);
                    const mondayStr = monday.toISOString().split('T')[0];

                    // Get user's logs for current week
                    const { data: weekLogs } = await supabase
                        .from('logs')
                        .select('exercise_id, exercises(name)')
                        .eq('user_id', user.id)
                        .gte('date', mondayStr);

                    // Count exercises
                    const exerciseCount = new Map<string, { name: string; count: number }>();
                    weekLogs?.forEach(log => {
                        const exerciseName = log.exercises?.name || 'Unknown';
                        const current = exerciseCount.get(log.exercise_id);
                        if (current) {
                            current.count++;
                        } else {
                            exerciseCount.set(log.exercise_id, { name: exerciseName, count: 1 });
                        }
                    });

                    // Find most popular
                    let mostPopular = { name: '', count: 0 };
                    exerciseCount.forEach(exercise => {
                        if (exercise.count > mostPopular.count) {
                            mostPopular = exercise;
                        }
                    });

                    setPopularExercisePersonal(mostPopular);
                    console.log('[NewDashboard] Personal popular exercise:', mostPopular);
                } catch (error) {
                    console.error('[NewDashboard] Error calculating personal popular exercise:', error);
                }
            }

        } catch (error) {
            console.error("Error loading dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getTimeRemaining = (date: Date) => {
        // Calculate time remaining until midnight
        const now = date.getTime();
        const midnight = new Date(date);
        midnight.setHours(24, 0, 0, 0);
        const remaining = midnight.getTime() - now;

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const getTimeRemainingPercentage = (date: Date) => {
        // Calculate percentage of day remaining
        const now = date.getTime();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const midnight = new Date(date);
        midnight.setHours(24, 0, 0, 0);

        const totalDay = midnight.getTime() - startOfDay.getTime();
        const remaining = midnight.getTime() - now;
        return Math.round((remaining / totalDay) * 100);
    };

    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 selection:text-blue-100 overflow-x-hidden relative">

            {/* Background Ambience */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-blue-900/10 rounded-full blur-[140px] opacity-20" />
                <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-orange-900/10 rounded-full blur-[140px] opacity-20" />
            </div>

            <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col pb-28">

                {/* Header */}
                <header className="px-6 pt-8 pb-4 flex justify-between items-center">
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black italic tracking-tighter text-white mb-1">THE COMMITMENT</h1>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em]">{dayName}</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 rounded-full border border-orange-500/20">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-600"></span>
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">Live</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => window.location.href = '/profile'}
                        className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-lg"
                    >
                        <div className="w-5 h-5 rounded-full border-[1.5px] border-zinc-400 flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-zinc-400" />
                        </div>
                    </button>
                </header>

                {/* --- MAIN CONTENT --- */}
                <div className="px-5 flex flex-col gap-8 mb-8">
                    <div className="px-1 relative">
                        <span className="block text-9xl font-black tracking-tighter leading-[0.8] text-white drop-shadow-2xl">{daysRemaining}</span>
                    </div>

                    <div>
                        <div className="flex justify-between items-center px-4 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Time Remaining</span>
                        </div>
                        <div className="h-20 w-full bg-[#050505] rounded-full border border-zinc-800 p-1.5 shadow-[0_0_0_1px_rgba(0,0,0,1)] relative group">
                            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 relative flex items-center px-6 transition-all duration-1000"
                                style={{
                                    width: `${time ? getTimeRemainingPercentage(time) : 0}%`,
                                    boxShadow: COLORS.orange.boxShadow
                                }}>
                                <div className="absolute inset-0 rounded-full overflow-hidden z-0">
                                    <div className="absolute top-[-50%] bottom-[-50%] left-[-50%] right-[-50%] bg-white/20 skew-x-12 animate-[shimmer_2s_infinite] mix-blend-overlay" />
                                </div>
                                <span className="relative z-10 text-3xl font-black tracking-tight text-white tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{time ? getTimeRemaining(time) : '--:--:--'}</span>
                            </div>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-700"><Clock size={24} /></div>
                        </div>
                    </div>

                    <div>
                        <GlassCard noPadding className="overflow-visible min-h-[240px]">
                            <CardHeader title="Squad Status" icon={Flame} colorClass="text-orange-500" />
                            <div className="px-4 py-3 flex flex-col">
                                {squadData.map((u, i) => (<SquadMemberRow key={i} name={u.name} pct={u.pct} mode={u.mode} isLive={u.isLive} />))}
                                {squadData.length === 0 && <div className="text-zinc-500 text-center py-4">Loading squad...</div>}
                            </div>
                        </GlassCard>
                        <div className="flex justify-center mt-6">
                            <div className="bg-zinc-900 rounded-full p-1 flex items-center gap-1 border border-white/5 shadow-lg">
                                <button onClick={() => setViewMode("group")} className={`px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'group' ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>Group</button>
                                <button onClick={() => setViewMode("personal")} className={`px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'personal' ? 'bg-zinc-800 text-white shadow-md border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}>Personal</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- STATS GRID --- */}
                <section className="px-5 grid grid-cols-2 gap-4">
                    {viewMode === "group" ? (
                        <GlassCard noPadding className="col-span-2">
                            <CardHeader title="Group Points" icon={TrendingUp} colorClass="text-blue-400" rightContent="LAST 30D" />
                            <div className="p-6 pt-2">
                                <div className="flex items-baseline gap-2 mb-2"><span className="text-5xl font-black text-white tracking-tighter">{totalGroupPoints.toLocaleString()}</span><span className="text-sm font-bold text-zinc-500">PTS</span></div>
                                <BarChart />
                            </div>
                        </GlassCard>
                    ) : (
                        <GlassCard noPadding className="col-span-2">
                            <CardHeader title="Personal Points" icon={TrendingUp} colorClass="text-blue-400" rightContent="LAST 30D" />
                            <div className="p-6 pt-2">
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-5xl font-black text-white tracking-tighter">{personalPoints.total.toLocaleString()}</span>
                                    <span className="text-sm font-bold text-zinc-500">PTS</span>
                                </div>
                                <div className="text-xs text-zinc-500 mb-3 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Base Target:</span>
                                        <span className="font-bold text-zinc-400">{personalPoints.baseTarget.toLocaleString()} pts</span>
                                    </div>
                                    {personalPoints.overperformance > 0 && (
                                        <div className="flex justify-between">
                                            <span>Overperformance:</span>
                                            <span className="font-bold text-orange-400">+{personalPoints.overperformance.toLocaleString()} pts</span>
                                        </div>
                                    )}
                                </div>
                                <PersonalOverperformChart dailyData={personalDailyData} />
                            </div>
                        </GlassCard>
                    )}
                    {viewMode === "group" ? (
                        <GlassCard noPadding className="row-span-2 h-full min-h-[320px]">
                            <CardHeader title="Pot History" icon={CircleDollarSign} colorClass="text-white" />
                            <div className="flex flex-col h-full">
                                <div className="px-5 py-4 border-b border-white/5 bg-white/[0.01]"><div className="text-3xl font-black">€{totalPot}</div></div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                    {potHistory.map((c, i) => (<div key={i} className="flex justify-between items-start text-xs group"><div><div className="font-bold text-zinc-300 group-hover:text-white transition-colors">{c.name}</div><div className="text-zinc-600 text-[10px]">{c.days} days ago</div></div><div className="font-mono font-bold text-zinc-400">€{c.amt}</div></div>))}
                                </div>
                            </div>
                        </GlassCard>
                    ) : (
                        <GlassCard noPadding className="row-span-2 h-full min-h-[320px]">
                            <CardHeader title="Last Contribution" icon={CircleDollarSign} colorClass="text-white" />
                            <div className="flex flex-col h-full justify-center items-center p-6">
                                {lastContribution ? (
                                    <>
                                        <div className="text-5xl font-black text-white mb-4">€{lastContribution.amount}</div>
                                        <div className="text-sm text-zinc-500 mb-1">{lastContribution.date}</div>
                                        <div className="text-xs text-zinc-600">{lastContribution.daysAgo} days ago</div>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <div className="text-5xl font-black text-zinc-700 mb-4">€0</div>
                                        <div className="text-xs text-zinc-600">No contributions yet</div>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    )}
                    {viewMode === "group" ? (
                        <div className="relative bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 rounded-3xl p-5 flex flex-col justify-between overflow-hidden shadow-2xl h-[160px]">
                            <div className="absolute top-0 right-0 p-4 opacity-30 mix-blend-overlay"><Gift size={80} className="text-white rotate-12" /></div>
                            <div><span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Next Birthday</span><div className="flex items-baseline gap-1 mt-1"><span className="text-5xl font-black text-white tracking-tighter">14</span><span className="text-sm font-bold text-white/80">DAYS</span></div></div>
                            <div className="flex items-center gap-2 mt-2"><div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><Calendar size={12} className="text-white" /></div><span className="font-bold text-white text-sm">Matthijs</span></div>
                        </div>
                    ) : (
                        <div className="relative bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 rounded-3xl p-5 flex flex-col justify-between overflow-hidden shadow-2xl h-[160px]">
                            <div className="absolute top-0 right-0 p-4 opacity-30 mix-blend-overlay"><Gift size={80} className="text-white rotate-12" /></div>
                            <div><span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Your Birthday</span><div className="flex items-baseline gap-1 mt-1"><span className="text-2xl font-black text-white tracking-tighter">Coming Soon</span></div></div>
                            <div className="flex items-center gap-2 mt-2"><div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"><Heart size={12} className="text-white" /></div><span className="font-bold text-white/60 text-xs">Set in profile settings</span></div>
                        </div>
                    )}
                    <GlassCard className="flex flex-col justify-center h-[160px] relative overflow-hidden group">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-900/20 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-800/20 transition-all" />
                        <div className="mb-4"><div className="flex justify-between items-end mb-1"><h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Streak</h4><span className="text-[9px] font-bold text-zinc-600">REC: 44</span></div><div className="flex items-baseline gap-1"><span className="text-3xl font-black text-white leading-none">0</span><span className="text-xs text-zinc-500">days</span></div></div>
                        <div className="w-full h-px bg-white/10 mb-4" />
                        <div><div className="flex justify-between items-end mb-1"><h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Insane</h4><span className="text-[9px] font-bold text-zinc-600">REC: 4</span></div><div className="flex items-baseline gap-1"><span className="text-3xl font-black text-white leading-none">0</span><span className="text-xs text-zinc-500">days</span></div></div>
                    </GlassCard>
                    {viewMode === "group" ? (
                        <PopularExerciseWidget
                            exerciseName={popularExerciseGroup.name}
                            count={popularExerciseGroup.count}
                            isPersonal={false}
                        />
                    ) : (
                        <PopularExerciseWidget
                            exerciseName={popularExercisePersonal.name}
                            count={popularExercisePersonal.count}
                            isPersonal={true}
                        />
                    )}
                    {viewMode === "group" && (
                        <GlassCard noPadding className="col-span-2">
                            <CardHeader
                                title={`Recap: ${recapData.yesterdayDate ? new Date(recapData.yesterdayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Yesterday'}`}
                                icon={AlertCircle}
                                colorClass="text-orange-500"
                            />
                            <div className="p-4 grid grid-cols-2 gap-4">
                                {/* Made It - using opal colors */}
                                <div className="rounded-xl p-3 border" style={{
                                    background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(79, 70, 229, 0.15) 100%)',
                                    borderColor: 'rgba(96, 165, 250, 0.2)'
                                }}>
                                    <div className="flex items-center gap-2 mb-2" style={{ color: 'rgb(96, 165, 250)' }}>
                                        <CheckCircle2 size={16} />
                                        <span className="text-xs font-black uppercase tracking-wide">Made It</span>
                                    </div>
                                    <div className="text-xs font-bold text-zinc-300 space-y-1">
                                        {recapData.completedMembers.length > 0 ? (
                                            recapData.completedMembers.map((username, idx) => (
                                                <div key={idx}>{username}</div>
                                            ))
                                        ) : (
                                            <div className="text-zinc-500">None</div>
                                        )}
                                    </div>
                                </div>

                                {/* Right column: Pending and Sick stacked */}
                                <div className="flex flex-col gap-3">
                                    {/* Pending - orange/red colors */}
                                    <div className="rounded-xl p-3 border" style={{
                                        background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
                                        borderColor: 'rgba(251, 146, 60, 0.2)'
                                    }}>
                                        <div className="flex items-center gap-2 mb-2" style={{ color: 'rgb(251, 146, 60)' }}>
                                            <Clock size={16} />
                                            <span className="text-xs font-black uppercase tracking-wide">Pending</span>
                                        </div>
                                        <div className="space-y-1">
                                            {recapData.pendingMembers.length > 0 ? (
                                                recapData.pendingMembers.map((m, idx) => (
                                                    <div key={idx} className="flex justify-between text-[10px] font-medium text-zinc-300">
                                                        <span>{m.username}</span>
                                                        <span className="font-mono">{m.actual}/{m.target}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-xs text-zinc-500">None</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sick Mode - gray colors */}
                                    <div className="bg-gray-800/40 rounded-xl p-3 border border-gray-600/30">
                                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                                            <Moon size={16} />
                                            <span className="text-xs font-black uppercase tracking-wide">Sick</span>
                                        </div>
                                        <div className="text-xs font-bold text-gray-400 space-y-1">
                                            {recapData.sickMembers.length > 0 ? (
                                                recapData.sickMembers.map((username, idx) => (
                                                    <div key={idx}>{username}</div>
                                                ))
                                            ) : (
                                                <div className="text-zinc-500">None</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    )}
                </section>

                {/* --- NEW COMPONENTS SECTION --- */}
                {viewMode === "group" ? (
                    <section className="px-5 grid grid-cols-2 gap-4 mt-8">
                        {/* Weekly Overperformers - Full width */}
                        <div className="col-span-2">
                            <WeeklyOverperformers />
                        </div>

                        {/* Seasonal Champions */}
                        {userProfile?.group_id && (
                            <div className="col-span-2">
                                <SeasonalChampionsWidget groupId={userProfile.group_id} />
                            </div>
                        )}

                        {/* Peak Workout Time - Group */}
                        <GlassCard noPadding className="col-span-2">
                            <CardHeader title="Peak Workout Time" icon={Zap} colorClass="text-yellow-500" />
                            <div className="p-6 pt-2 flex flex-col items-center justify-center">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Group Most Active</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-6xl font-black text-white tracking-tighter">{peakWorkoutTime}</span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-2">When the squad hits hardest</div>
                            </div>
                        </GlassCard>
                    </section>
                ) : (
                    <section className="px-5 grid grid-cols-2 gap-4 mt-8">
                        {/* Peak Workout Time - Personal (hourly visualization) */}
                        <GlassCard noPadding className="col-span-2">
                            <CardHeader title="Peak Workout Time" icon={Zap} colorClass="text-yellow-500" rightContent={peakWorkoutTime} />
                            <div className="p-6 pt-2">
                                <div className="text-xs text-zinc-500 mb-4">Workout distribution by time of day</div>
                                <PeakWorkoutTimeChart hourlyData={hourlyWorkoutData} />
                            </div>
                        </GlassCard>
                    </section>
                )}

            </div>

            {/* --- BOTTOM NAVIGATION --- */}
            <BottomNavigation
                onWorkoutClick={() => setIsWorkoutModalOpen(true)}
                onChatClick={() => setIsChatOpen(true)}
                groupId={userProfile?.group_id}
            />

            {/* --- WORKOUT MODAL --- */}
            {user && (
                <WorkoutModal
                    isOpen={isWorkoutModalOpen}
                    onClose={() => {
                        setIsWorkoutModalOpen(false);
                        loadDashboardData(); // Reload dashboard data after workout logged
                    }}
                />
            )}

            {/* --- CHAT MODAL --- */}
            <GroupChat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onCloseStart={() => setIsChatOpen(false)}
            />

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
      `}</style>
        </div>
    );
}
