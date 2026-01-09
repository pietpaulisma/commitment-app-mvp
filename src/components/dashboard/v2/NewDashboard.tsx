'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Trophy, Calendar, CheckCircle2, ChevronRight, Zap, Flame, Clock, CircleDollarSign, TrendingUp, AlertCircle, Menu, Star, Dumbbell, Moon, History, Coins, Heart, Sparkles, Search, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWeekMode } from '@/contexts/WeekModeContext';
import { GlassCard } from './GlassCard';
import { CardHeader } from './CardHeader';
import { SquadMemberRow } from './SquadMemberRow';
import { PersonalOverperformChart } from './PersonalOverperformChart';
import { GroupOverperformanceChart } from './GroupOverperformanceChart';
import { PeakWorkoutTimeChart } from './PeakWorkoutTimeChart';
import { PopularExerciseWidget } from './PopularExerciseWidget';
import WorkoutModal from '@/components/modals/WorkoutModal';
import { BottomNavigation } from './BottomNavigation';
import { calculateDailyTarget, getDaysSinceStart, RECOVERY_DAY_TARGET_MINUTES } from '@/utils/targetCalculation';
import WeeklyOverperformers from '@/components/WeeklyOverperformers';
import { SeasonalChampionsWidget } from '@/components/SeasonalChampionsWidget';
import { COLORS } from '@/utils/colors';
import GroupChat from '@/components/GroupChat';
import { PotHistoryModal } from '@/components/modals/PotHistoryModal';
import { DailyRecapHistoryModal } from '@/components/modals/DailyRecapHistoryModal';
import { PenaltyResponseModal } from '@/components/modals/PenaltyResponseModal';
import type { PendingPenalty } from '@/types/penalties';
import { formatTimeRemaining } from '@/utils/penaltyHelpers';
import { TimePeriod, TIME_PERIOD_LABELS, getNextTimePeriod, getDateRangeForPeriod, getTimestampRangeForPeriod } from '@/utils/timePeriodHelpers';
import { getRecoveryDayStatusForUsers, getActiveRecoveryDay } from '@/utils/recoveryDayHelpers';

export default function NewDashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const { weekMode } = useWeekMode();
    const [time, setTime] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<"group" | "personal">("group");
    const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isPotHistoryOpen, setIsPotHistoryOpen] = useState(false);
    const [isRecapHistoryOpen, setIsRecapHistoryOpen] = useState(false);
    const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
    const [pendingPenalties, setPendingPenalties] = useState<PendingPenalty[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [squadData, setSquadData] = useState<any[]>([]);
    const [potHistory, setPotHistory] = useState<any[]>([]);
    const [daysRemaining, setDaysRemaining] = useState(999); // Default 999 to debug if calculation works
    const [totalPot, setTotalPot] = useState(0);
    const [loading, setLoading] = useState(true);
    const [groupOverperformance, setGroupOverperformance] = useState({
        totalOverperformance: 0,
        totalTarget: 0,
        totalActual: 0
    });
    const [groupDailyData, setGroupDailyData] = useState<Array<{
        date: string;
        target: number;
        actual: number;
        overperformance: number;
        recovery: number;
        sickPlaceholder: number;
    }>>([]);
    const [peakWorkoutTime, setPeakWorkoutTime] = useState('--:--');
    const [recapData, setRecapData] = useState<{
        completedMembers: string[];
        recoveryDayMembers: string[];
        restDayMembers: string[];
        flexRestDayMembers: string[];
        pendingMembers: Array<{ username: string; actual: number; target: number }>;
        paidMembers: Array<{ username: string; actual: number; target: number }>;
        waivedMembers: Array<{ username: string; reason?: string }>;
        underReviewMembers: Array<{ username: string; actual: number; target: number; reason?: string; reasonMessage?: string }>;
        sickMembers: string[];
        yesterdayDate: string;
    }>({
        completedMembers: [],
        recoveryDayMembers: [],
        restDayMembers: [],
        flexRestDayMembers: [],
        pendingMembers: [],
        paidMembers: [],
        waivedMembers: [],
        underReviewMembers: [],
        sickMembers: [],
        yesterdayDate: ''
    });
    const [personalPoints, setPersonalPoints] = useState({
        total: 0,
        baseTarget: 0,
        overperformance: 0
    });
    const [userContributions, setUserContributions] = useState<Array<{
        amount: number;
        days: number;
        name: string;
        date: string;
    }>>([]);
    const [personalDailyData, setPersonalDailyData] = useState<Array<{
        date: string;
        actual: number;
        target: number;
        overperformance: number;
        recovery: number;
        sickPlaceholder: number;
    }>>([]);
    const [hourlyWorkoutData, setHourlyWorkoutData] = useState<number[]>(new Array(24).fill(0));
    const [popularExercisesGroup, setPopularExercisesGroup] = useState<Array<{ name: string; count: number; contributors?: string[] }>>([]);
    const [popularExercisesPersonal, setPopularExercisesPersonal] = useState<Array<{ name: string; count: number }>>([]);
    const [yearlyExercisesPersonal, setYearlyExercisesPersonal] = useState<Array<{ name: string; count: number }>>([]);
    const [upcomingBirthdays, setUpcomingBirthdays] = useState<Array<{
        username: string;
        daysUntil: number;
        date: string;
        isCurrentUser: boolean;
        dailyTarget: number;
    }>>([]);
    const [todayProgress, setTodayProgress] = useState({
        actual: 0,
        target: 0,
        percentage: 0
    });
    
    // Time period states for stats widgets
    const [favoriteTimePeriod, setFavoriteTimePeriod] = useState<TimePeriod>('today');
    const [peakTimeTimePeriod, setPeakTimeTimePeriod] = useState<TimePeriod>('today');
    
    // Unread messages tracking
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    // Check for unread messages
    const checkUnreadMessages = async (groupId: string) => {
        try {
            const lastChatVisit = localStorage.getItem(`lastChatVisit_${groupId}`);
            const lastVisitTime = lastChatVisit ? new Date(lastChatVisit) : new Date(0);

            // Get the most recent message in the group (excluding current user's messages)
            const { data: recentMessages, error } = await supabase
                .from('chat_messages')
                .select('created_at, user_id')
                .eq('group_id', groupId)
                .neq('user_id', user?.id || '')
                .gt('created_at', lastVisitTime.toISOString())
                .limit(1);

            if (error) {
                console.error('[NewDashboard] Error checking unread messages:', error);
                return;
            }

            setHasUnreadMessages(recentMessages && recentMessages.length > 0);
        } catch (error) {
            console.error('[NewDashboard] Error checking unread messages:', error);
        }
    };

    // Mark chat as read when opened
    const handleChatOpen = () => {
        if (userProfile?.group_id) {
            localStorage.setItem(`lastChatVisit_${userProfile.group_id}`, new Date().toISOString());
            setHasUnreadMessages(false);
        }
        setIsChatOpen(true);
    };

    // Subscribe to new messages for unread indicator
    useEffect(() => {
        if (!userProfile?.group_id) return;

        // Initial check
        checkUnreadMessages(userProfile.group_id);

        // Subscribe to new messages
        const subscription = supabase
            .channel(`unread-messages-${userProfile.group_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `group_id=eq.${userProfile.group_id}`
                },
                (payload) => {
                    // Only set unread if message is from someone else and chat is closed
                    if (payload.new && (payload.new as any).user_id !== user?.id && !isChatOpen) {
                        setHasUnreadMessages(true);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [userProfile?.group_id, user?.id, isChatOpen]);

    const loadDashboardData = async () => {
        if (!user) return;
        setLoading(true);        try {
            // 1. Get User Profile & Group
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('[NewDashboard] Error fetching profile:', profileError);
            }
            setUserProfile(profile);

            if (profile?.group_id) {
                // 2. Get Group Data (Start Date, etc.)
                const { data: group, error: groupError } = await supabase
                    .from('groups')
                    .select('*')
                    .eq('id', profile.group_id)
                    .single();

                if (groupError) {
                    console.error('[NewDashboard] Error fetching group:', groupError);
                }
                if (group && group.start_date) {
                    // Calculate days SINCE start (counting up, not down)
                    const start = new Date(group.start_date);
                    const now = new Date();
                    const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    setDaysRemaining(daysSinceStart);
                } else {
                    console.error('[NewDashboard] Group or start_date missing:', { group });
                }

                // 3. Get Squad Data (Leaderboard) - Use API to bypass RLS
                const today = new Date().toISOString().split('T')[0];
                try {
                    const response = await fetch(`/api/dashboard/squad-status?groupId=${profile.group_id}&date=${today}`);
                    const data = await response.json();

                    if (data.error) {
                        console.error('Error from squad-status API:', data.error);
                    } else {
                        // Fetch recovery day status for all squad members
                        const memberIds = data.squad.map((u: any) => u.id);
                        const recoveryDayStatus = await getRecoveryDayStatusForUsers(memberIds);
                        
                        // Fetch flexible rest day usage for today
                        const { data: flexibleRestDayUsage } = await supabase
                            .from('flexible_rest_days')
                            .select('user_id')
                            .eq('used_date', today)
                            .in('user_id', memberIds);
                        
                        const flexibleRestDayUserIds = new Set(flexibleRestDayUsage?.map(r => r.user_id) || []);
                        
                        const squad = data.squad.map((u: any) => {
                            const isOnRecoveryDay = recoveryDayStatus.has(u.id);
                            // Show as "Flexing" if:
                            // 1. User has officially used flexible rest day today (record in table)
                            // 2. OR: It's a rest day AND user has flexible rest day available AND they've logged workouts
                            const hasUsedFlexRestDay = flexibleRestDayUserIds.has(u.id);
                            const isFlexingOnRestDay = u.is_rest_day && u.has_flexible_rest_day && u.pct > 0;
                            const isOnFlexibleRestDay = hasUsedFlexRestDay || isFlexingOnRestDay;
                            return {
                                name: u.id === user.id ? "You" : u.username || "User",
                                pct: u.is_sick_mode ? u.pct : u.pct, // Percentage already calculated correctly
                                mode: u.is_sick_mode ? "sick" : (u.week_mode || "insane"), // Show sick mode or actual week mode
                                isLive: false, // TODO: Real-time status from last_seen
                                isRecoveryDay: isOnRecoveryDay,
                                isFlexibleRestDay: isOnFlexibleRestDay
                            };
                        });

                        // Sort: You first, then by pct
                        const sortedSquad = [
                            ...squad.filter(u => u.name === "You"),
                            ...squad.filter(u => u.name !== "You").sort((a, b) => b.pct - a.pct)
                        ];
                        setSquadData(sortedSquad);
                        
                        // Sync todayProgress from squad data for the current user
                        const currentUserData = data.squad.find((u: any) => u.id === user.id);
                        if (currentUserData) {
                            setTodayProgress(prev => ({
                                ...prev,
                                percentage: currentUserData.pct || 0
                            }));
                        }
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

                        // Get user's contribution history for personal view
                        const userTransactions = transactions?.filter(t => t.user_id === user.id) || [];
                        const userHistory = userTransactions.slice(0, 8).map(t => {
                            const days = Math.floor((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24));
                            return {
                                amount: Math.abs(t.amount),
                                days,
                                name: profile?.username || 'You',
                                date: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            };
                        });
                        setUserContributions(userHistory);
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
                        .select('id, username, week_mode, is_sick_mode, has_flexible_rest_day')
                        .eq('group_id', profile.group_id);

                    if (!members || members.length === 0) {
                        return;
                    }

                    // Get penalties for yesterday
                    const { data: penalties } = await supabase
                        .from('pending_penalties')
                        .select('user_id, status, actual_points, target_points, reason_category, reason_message')
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

                    // Get recovery day records for all members for yesterday
                    const { data: recoveryDayRecords } = await supabase
                        .from('user_recovery_days')
                        .select('user_id, recovery_minutes, is_complete')
                        .in('user_id', members.map(m => m.id))
                        .eq('used_date', yesterdayStr);

                    const recoveryDayMap = new Map(recoveryDayRecords?.map(rd => [rd.user_id, rd]) || []);

                    // Get historical sick mode records for yesterday
                    // This tells us who was actually sick on that specific date
                    const { data: sickModeRecords } = await supabase
                        .from('sick_mode')
                        .select('user_id')
                        .in('user_id', members.map(m => m.id))
                        .eq('date', yesterdayStr);

                    const historicallySickUserIds = new Set(sickModeRecords?.map(sm => sm.user_id) || []);

                    // Calculate days since start for target calculation
                    const startDate = new Date(group.start_date);
                    const daysSinceStartForYesterday = Math.floor((yesterday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

                    // Get day-before-yesterday's logs (for flex rest day qualification check)
                    const dayBeforeYesterday = new Date(yesterday);
                    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
                    const dayBeforeYesterdayStr = dayBeforeYesterday.toISOString().split('T')[0];
                    const dayBeforeYesterdayDayOfWeek = dayBeforeYesterday.getDay();
                    const daysSinceStartForDayBefore = Math.floor((dayBeforeYesterday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    const { data: dayBeforeLogs } = await supabase
                        .from('logs')
                        .select('user_id, points')
                        .eq('date', dayBeforeYesterdayStr)
                        .in('user_id', members.map(m => m.id));
                    
                    // Create a map of day-before logs by user
                    const dayBeforeLogsByUser = new Map<string, number>();
                    dayBeforeLogs?.forEach(log => {
                        const current = dayBeforeLogsByUser.get(log.user_id) || 0;
                        dayBeforeLogsByUser.set(log.user_id, current + log.points);
                    });

                    const completedList: string[] = [];
                    const recoveryDayList: string[] = [];
                    const restDayList: string[] = [];
                    const flexRestDayList: string[] = [];
                    const pendingList: Array<{ username: string; actual: number; target: number }> = [];
                    const paidList: Array<{ username: string; actual: number; target: number }> = [];
                    const waivedList: Array<{ username: string; reason?: string }> = [];
                    const underReviewList: Array<{ username: string; actual: number; target: number; reason?: string; reasonMessage?: string }> = [];
                    const sickList: string[] = [];

                    // Process each member
                    for (const member of members) {
                        // Check if user was sick on this specific historical date
                        if (historicallySickUserIds.has(member.id)) {
                            sickList.push(member.username);
                            continue;
                        }

                        // Check rest day - show as "Rest Day" or "Flex Rest" instead of "Made It"
                        if (isRestDay) {
                            // Check if user has flexible rest day enabled and qualified
                            if (member.has_flexible_rest_day) {
                                const dayBeforePoints = dayBeforeLogsByUser.get(member.id) || 0;
                                const dayBeforeTarget = calculateDailyTarget({
                                    daysSinceStart: daysSinceStartForDayBefore,
                                    weekMode: member.week_mode || 'sane',
                                    restDays,
                                    recoveryDays,
                                    currentDayOfWeek: dayBeforeYesterdayDayOfWeek
                                });
                                
                                // If they got 200% the day before, they earned a flex rest day
                                if (dayBeforePoints >= dayBeforeTarget * 2) {
                                    flexRestDayList.push(member.username);
                                    continue;
                                }
                            }
                            // Regular rest day
                            restDayList.push(member.username);
                            continue;
                        }

                        // Check if member had an active recovery day yesterday
                        const memberRecoveryDay = recoveryDayMap.get(member.id);
                        
                        if (memberRecoveryDay) {
                            const recoveryTarget = RECOVERY_DAY_TARGET_MINUTES;
                            const recoveryActual = memberRecoveryDay.recovery_minutes || 0;
                            const metRecoveryTarget = memberRecoveryDay.is_complete || recoveryActual >= recoveryTarget;
                            const penalty = penaltyMap.get(member.id);

                            if (metRecoveryTarget) {
                                recoveryDayList.push(member.username);
                            } else if (penalty) {
                                if (penalty.status === 'waived') {
                                    // Technical glitch = they actually made it
                                    if (penalty.reason_category === 'technical') {
                                        recoveryDayList.push(member.username);
                                    } else {
                                        waivedList.push({ username: member.username, reason: penalty.reason_category });
                                    }
                                } else if (penalty.status === 'accepted') {
                                    paidList.push({ username: member.username, actual: recoveryActual, target: recoveryTarget });
                                } else if (penalty.status === 'disputed') {
                                    underReviewList.push({ 
                                        username: member.username, 
                                        actual: recoveryActual, 
                                        target: recoveryTarget,
                                        reason: penalty.reason_category,
                                        reasonMessage: penalty.reason_message
                                    });
                                } else if (penalty.status === 'pending') {
                                    pendingList.push({ username: member.username, actual: recoveryActual, target: recoveryTarget });
                                }
                            } else {
                                pendingList.push({ username: member.username, actual: recoveryActual, target: recoveryTarget });
                            }
                            continue;
                        }

                        // Calculate target for regular day
                        // IMPORTANT: Always use 'sane' mode for penalty/made-it evaluation
                        const dailyTarget = calculateDailyTarget({
                            daysSinceStart: daysSinceStartForYesterday,
                            weekMode: 'sane',
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
                        } else {
                            // Didn't meet target - categorize by penalty status
                            if (penalty) {
                                if (penalty.status === 'waived') {
                                    // Technical glitch = they actually made it
                                    if (penalty.reason_category === 'technical') {
                                        completedList.push(member.username);
                                    } else {
                                        waivedList.push({ username: member.username, reason: penalty.reason_category });
                                    }
                                } else if (penalty.status === 'accepted') {
                                    paidList.push({
                                        username: member.username,
                                        actual: actualPoints,
                                        target: dailyTarget
                                    });
                                } else if (penalty.status === 'disputed') {
                                    underReviewList.push({
                                        username: member.username,
                                        actual: actualPoints,
                                        target: dailyTarget,
                                        reason: penalty.reason_category,
                                        reasonMessage: penalty.reason_message
                                    });
                                } else if (penalty.status === 'pending') {
                                    pendingList.push({
                                        username: member.username,
                                        actual: actualPoints,
                                        target: dailyTarget
                                    });
                                }
                                // Note: rejected penalties are not shown
                            } else {
                                // No penalty exists yet - show in Pending section (penalty check hasn't run yet)
                                pendingList.push({
                                    username: member.username,
                                    actual: actualPoints,
                                    target: dailyTarget
                                });
                            }
                        }
                    }

                    setRecapData({
                        completedMembers: completedList,
                        recoveryDayMembers: recoveryDayList,
                        restDayMembers: restDayList,
                        flexRestDayMembers: flexRestDayList,
                        pendingMembers: pendingList,
                        paidMembers: paidList,
                        waivedMembers: waivedList,
                        underReviewMembers: underReviewList,
                        sickMembers: sickList,
                        yesterdayDate: yesterdayStr
                    });
                } catch (error) {
                    console.error('[NewDashboard] Error loading recap:', error);
                }

                // 6. Calculate Group Performance (last 20 days) - excluding sick days
                try {
                    // Get group settings for rest/recovery days
                    const { data: groupSettings } = await supabase
                        .from('group_settings')
                        .select('rest_days, recovery_days')
                        .eq('group_id', profile.group_id)
                        .maybeSingle();

                    const groupRestDays = groupSettings?.rest_days || [1];
                    const groupRecoveryDays = groupSettings?.recovery_days || [5];

                    // Get all group members with their week modes
                    const { data: members } = await supabase
                        .from('profiles')
                        .select('id, week_mode')
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
                            .select('user_id, date, points, exercise_id')
                            .in('user_id', memberIds)
                            .in('date', past30Days);

                        // Note: Sick mode is now tracked via profiles.is_sick_mode boolean
                        // If a user is in sick mode, all their days are considered sick days
                        // For now, we'll skip the sick day logic since it's not being used in calculations below
                        const sickDaySet = new Set<string>();

                        const participatingUserIds = new Set<string>();

                        logs?.forEach(log => participatingUserIds.add(log.user_id));


                        // Get exercises for recovery capping
                        const { data: exercises } = await supabase
                            .from('exercises')
                            .select('id, type');

                        const exerciseTypeMap = new Map(exercises?.map(e => [e.id, e.type]) || []);

                        // Group logs by user and date
                        const logsByUserAndDate = new Map<string, Map<string, any[]>>();
                        logs?.forEach(log => {
                            if (!logsByUserAndDate.has(log.user_id)) {
                                logsByUserAndDate.set(log.user_id, new Map());
                            }
                            const userDateMap = logsByUserAndDate.get(log.user_id)!;
                            if (!userDateMap.has(log.date)) {
                                userDateMap.set(log.date, []);
                            }
                            userDateMap.get(log.date)!.push(log);
                        });

                        // Calculate total actual points and total targets with recovery capping
                        let totalActualPoints = 0;
                        let totalTargetPoints = 0;
                        const dailyData: Array<{ date: string; target: number; actual: number; overperformance: number; recovery: number; sickPlaceholder: number }> = [];

                        // Calculate normalized baseline target (for consistent target line visualization)



                        for (const dateStr of past30Days) {
                            let dayTotalActual = 0;
                            let dayTotalRecovery = 0;
                            let dayTotalOverperformance = 0;

                            const dateObj = new Date(dateStr);
                            const dayOfWeek = dateObj.getDay();
                            const daysSinceStart = Math.floor((dateObj.getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24));

                            // Calculate sane baseline target per person (ignoring rest/recovery days for clean visualization)
                            const saneBaselineTarget = calculateDailyTarget({
                                daysSinceStart,
                                weekMode: 'sane',
                                restDays: [], // Ignore rest days for visual baseline
                                recoveryDays: [], // Ignore recovery days for visual baseline
                                currentDayOfWeek: dayOfWeek
                            });

                            let activeMemberCount = 0; // Count non-sick members for this day
                            let dayTotalSickPlaceholder = 0;

                            for (const member of members) {
                                // Skip this member if they were sick on this day
                                const sickDayKey = `${member.id}_${dateStr}`;
                                if (sickDaySet.has(sickDayKey)) {
                                    // If sick, add a placeholder value equal to the target
                                    // This fills the gap so the group total mimics a "fair" contribution
                                    dayTotalSickPlaceholder += saneBaselineTarget;
                                    continue;
                                }

                                activeMemberCount++; // Count this member as active

                                const userLogs = logsByUserAndDate.get(member.id);
                                const dayLogs = userLogs?.get(dateStr);

                                // Calculate daily target for this member (for recovery capping only)
                                const dailyTarget = calculateDailyTarget({
                                    daysSinceStart,
                                    weekMode: member.week_mode || 'sane',
                                    restDays: groupRestDays,
                                    recoveryDays: groupRecoveryDays,
                                    currentDayOfWeek: dayOfWeek
                                });

                                totalTargetPoints += dailyTarget;

                                // Calculate actual points with recovery capping
                                if (dayLogs) {
                                    const recoveryCapLimit = Math.round(dailyTarget * 0.25);
                                    let totalRecovery = 0;
                                    let totalNonRecovery = 0;

                                    dayLogs.forEach(log => {
                                        const exerciseType = exerciseTypeMap.get(log.exercise_id);
                                        if (exerciseType === 'recovery') {
                                            totalRecovery += log.points;
                                        } else {
                                            totalNonRecovery += log.points;
                                        }
                                    });

                                    const cappedRecovery = Math.min(totalRecovery, recoveryCapLimit);
                                    const userActual = totalNonRecovery + cappedRecovery;

                                    dayTotalActual += userActual;
                                    dayTotalRecovery += cappedRecovery;
                                    totalActualPoints += userActual;

                                    // Calculate individual overperformance (points above sane baseline)
                                    const userOverperformance = Math.max(0, userActual - saneBaselineTarget);
                                    dayTotalOverperformance += userOverperformance;
                                }
                            }

                            // Target line REMOVED per user request
                            // const dayTargetLine = saneBaselineTarget * medianActiveCount;

                            dailyData.push({
                                date: dateStr,
                                target: 0, // Target removed
                                actual: dayTotalActual,
                                overperformance: dayTotalOverperformance,
                                recovery: dayTotalRecovery,
                                sickPlaceholder: dayTotalSickPlaceholder
                            });
                        }

                        const totalOverperformance = Math.max(0, totalActualPoints - totalTargetPoints);

                        setGroupOverperformance({
                            totalOverperformance,
                            totalTarget: totalTargetPoints,
                            totalActual: totalActualPoints
                        });
                        setGroupDailyData(dailyData);
                    }
                } catch (error) {
                    console.error('[NewDashboard] Error calculating group performance:', error);
                }

                // 6.5. Calculate Personal Points (last 30 days) - user's base target + overperformance
                try {
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

                    // Note: Sick mode is tracked via profiles.is_sick_mode boolean
                    // Not using sick days tracking for personal performance calculation
                    const sickDaySet = new Set<string>();

                    // Group logs by date
                    const logsByDate = new Map<string, any[]>();
                    userLogs?.forEach(log => {
                        if (!logsByDate.has(log.date)) {
                            logsByDate.set(log.date, []);
                        }
                        logsByDate.get(log.date)!.push(log);
                    });

                    // Calculate total actual points AND build daily data array for chart
                    let totalActualPoints = 0;
                    let totalBaseTarget = 0;
                    const dailyDataArray: Array<{
                        date: string;
                        actual: number;
                        target: number;
                        overperformance: number;
                        recovery: number;
                        sickPlaceholder: number;
                    }> = [];

                    for (const dateStr of past30Days) {
                        const dateObj = new Date(dateStr);
                        const dayOfWeek = dateObj.getDay();
                        const daysSinceStart = Math.floor((dateObj.getTime() - groupStartDate.getTime()) / (1000 * 60 * 60 * 24));

                        // Calculate daily target
                        const dailyTarget = calculateDailyTarget({
                            daysSinceStart,
                            weekMode: profile.week_mode || 'sane',
                            restDays,
                            recoveryDays,
                            currentDayOfWeek: dayOfWeek
                        });

                        totalBaseTarget += dailyTarget;

                        let dayActual = 0;
                        let dayRecovery = 0;
                        let dayOverperformance = 0;
                        let daySickPlaceholder = 0;

                        // Check if user was sick on this day
                        if (sickDaySet.has(dateStr)) {
                            // Add sick placeholder equal to target
                            daySickPlaceholder = dailyTarget;
                        } else {
                            // Calculate actual points with recovery capping
                            const dayLogs = logsByDate.get(dateStr);
                            if (dayLogs) {
                                const recoveryCapLimit = Math.round(dailyTarget * 0.25);
                                let totalRecovery = 0;
                                let totalNonRecovery = 0;

                                dayLogs.forEach(log => {
                                    const exerciseType = exerciseTypeMap.get(log.exercise_id);
                                    if (exerciseType === 'recovery') {
                                        totalRecovery += log.points;
                                    } else {
                                        totalNonRecovery += log.points;
                                    }
                                });

                                const cappedRecovery = Math.min(totalRecovery, recoveryCapLimit);
                                dayActual = totalNonRecovery + cappedRecovery;
                                dayRecovery = cappedRecovery;
                                totalActualPoints += dayActual;

                                // Calculate overperformance (points above target)
                                dayOverperformance = Math.max(0, dayActual - dailyTarget);
                            }
                        }

                        dailyDataArray.push({
                            date: dateStr,
                            actual: dayActual,
                            target: dailyTarget,
                            overperformance: dayOverperformance,
                            recovery: dayRecovery,
                            sickPlaceholder: daySickPlaceholder
                        });
                    }

                    // Calculate overperformance (total - base target, but only if positive)
                    const overperformance = Math.max(0, totalActualPoints - totalBaseTarget);

                    setPersonalPoints({
                        total: totalActualPoints,
                        baseTarget: totalBaseTarget,
                        overperformance
                    });

                    setPersonalDailyData(dailyDataArray);
                } catch (error) {
                    console.error('[NewDashboard] Error calculating personal points:', error);
                }

                // 7. Calculate Peak Workout Time
                try {
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

                        // Count workouts by hour (using local timezone)
                        const hourCounts = new Array(24).fill(0);
                        timeLogs?.forEach(log => {
                            // Convert UTC timestamp to local time
                            const localDate = new Date(log.created_at);
                            const hour = localDate.getHours();
                            hourCounts[hour]++;
                        });

                        const maxCount = Math.max(...hourCounts);
                        const mostPopularHour = hourCounts.indexOf(maxCount);

                        // Format peak time with AM/PM
                        const peakTime = mostPopularHour === 0 ? '12AM' :
                                        mostPopularHour < 12 ? `${mostPopularHour}AM` :
                                        mostPopularHour === 12 ? '12PM' :
                                        `${mostPopularHour - 12}PM`;

                        setPeakWorkoutTime(peakTime);
                        setHourlyWorkoutData(hourCounts);
                    }
                } catch (error) {
                    console.error('[NewDashboard] Error calculating peak workout time:', error);
                }

                // 8. Popular exercises are now loaded by useEffect based on favoriteTimePeriod
                // This avoids race conditions with the initial data load

                // 9. Calculate Top 5 Popular Exercises (Personal - THIS YEAR)
                try {
                    // Get start of current year (January 1st)
                    const now = new Date();
                    const yearStart = new Date(now.getFullYear(), 0, 1); // January 1st of current year
                    yearStart.setHours(0, 0, 0, 0);
                    const yearStartStr = `${yearStart.getFullYear()}-01-01`;

                    // Get user's logs for this year with exercise details via join
                    const { data: yearLogs } = await supabase
                        .from('logs')
                        .select('exercise_id, points, sport_name, date, exercises(name)')
                        .eq('user_id', user!.id)
                        .gte('date', yearStartStr);

                    // Sum points per exercise (group sports by sport_name, regular exercises by exercise_id)
                    const yearExerciseCount = new Map<string, { name: string; count: number }>();
                    yearLogs?.forEach((log: any) => {
                        let displayName: string;
                        let groupKey: string;

                        const exerciseName = log.exercises?.name;

                        if (log.sport_name) {
                            displayName = log.sport_name;
                            groupKey = `sport:${log.sport_name}`;
                        } else if (exerciseName && exerciseName !== 'Intense Sport') {
                            displayName = exerciseName;
                            groupKey = `exercise:${log.exercise_id}`;
                        } else {
                            return;
                        }

                        const current = yearExerciseCount.get(groupKey);
                        if (current) {
                            current.count += log.points;
                        } else {
                            yearExerciseCount.set(groupKey, { name: displayName, count: log.points });
                        }
                    });

                    // Get top 5 exercises sorted by total points
                    const topYearlyExercises = Array.from(yearExerciseCount.values())
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5);

                    setYearlyExercisesPersonal(topYearlyExercises);
                } catch (error) {
                    console.error('[NewDashboard] Error calculating yearly popular exercises:', error);
                }

                // Fetch upcoming birthdays for the group
                try {
                    const { data: groupMembers } = await supabase
                        .from('profiles')
                        .select('id, username, birth_date, week_mode')
                        .eq('group_id', profile.group_id)
                        .not('birth_date', 'is', null);

                    // Get group settings for rest/recovery days
                    const { data: groupSettings } = await supabase
                        .from('group_settings')
                        .select('rest_days, recovery_days')
                        .eq('group_id', profile.group_id)
                        .maybeSingle();

                    const restDays = groupSettings?.rest_days || [1];
                    const recoveryDays = groupSettings?.recovery_days || [5];

                    if (groupMembers && groupMembers.length > 0) {
                        const today = new Date();
                        const currentYear = today.getFullYear();

                        const birthdaysWithDays = groupMembers.map(member => {
                            const birthDate = new Date(member.birth_date!);

                            // Create this year's birthday
                            let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

                            // If birthday has passed this year, use next year
                            if (nextBirthday < today) {
                                nextBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
                            }

                            const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                            // Calculate their typical daily target for today
                            const daysSinceStart = Math.floor((today.getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24));
                            const dayOfWeek = today.getDay();

                            const dailyTarget = calculateDailyTarget({
                                daysSinceStart,
                                weekMode: member.week_mode || 'sane',
                                restDays,
                                recoveryDays,
                                currentDayOfWeek: dayOfWeek
                            });

                            return {
                                username: member.username || 'Unknown',
                                daysUntil,
                                date: member.birth_date!,
                                isCurrentUser: member.id === user!.id,
                                dailyTarget
                            };
                        });

                        // Sort by days until birthday and take top 2
                        const upcomingTwo = birthdaysWithDays
                            .sort((a, b) => a.daysUntil - b.daysUntil)
                            .slice(0, 2);

                        setUpcomingBirthdays(upcomingTwo);
                    } else {
                        setUpcomingBirthdays([]);
                    }
                } catch (error) {
                    console.error('[NewDashboard] Error fetching birthdays:', error);
                }

                // Also check current user's birthday for personal view (even if no group)
                if (profile?.birth_date) {
                    const today = new Date();
                    const currentYear = today.getFullYear();
                    const birthDate = new Date(profile.birth_date);

                    let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
                    if (nextBirthday < today) {
                        nextBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
                    }

                    const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    // Add to upcomingBirthdays if not already there, maintaining sort order
                    setUpcomingBirthdays(prev => {
                        const hasCurrentUser = prev.find(b => b.isCurrentUser);
                        if (!hasCurrentUser) {
                            const newEntry = {
                                username: profile.username || 'You',
                                daysUntil,
                                date: profile.birth_date!,
                                isCurrentUser: true,
                                dailyTarget: 0
                            };
                            // Add to array, re-sort by daysUntil, and keep top 2
                            return [...prev, newEntry]
                                .sort((a, b) => a.daysUntil - b.daysUntil)
                                .slice(0, 2);
                        }
                        return prev;
                    });
                }

                // 10. Calculate Today's Progress
                try {
                    const today = new Date().toISOString().split('T')[0];
                    const todayDayOfWeek = new Date().getDay();

                    // Check if user has an active recovery day for today
                    const activeRecoveryDay = await getActiveRecoveryDay(user.id);
                    
                    if (activeRecoveryDay) {
                        // User has an active recovery day - use recovery day target (15 min)
                        const percentage = RECOVERY_DAY_TARGET_MINUTES > 0 
                            ? Math.round((activeRecoveryDay.recovery_minutes / RECOVERY_DAY_TARGET_MINUTES) * 100) 
                            : 0;

                        setTodayProgress({
                            actual: activeRecoveryDay.recovery_minutes,
                            target: RECOVERY_DAY_TARGET_MINUTES,
                            percentage
                        });
                    } else {
                        // Regular calculation for non-recovery days
                        // Get group settings
                        const { data: groupSettings } = await supabase
                            .from('group_settings')
                            .select('rest_days, recovery_days')
                            .eq('group_id', profile.group_id)
                            .maybeSingle();

                        const restDays = groupSettings?.rest_days || [1];
                        const recoveryDays = groupSettings?.recovery_days || [5];

                        // Calculate today's target
                        const daysSinceStart = Math.floor((new Date().getTime() - new Date(group.start_date).getTime()) / (1000 * 60 * 60 * 24));
                        const dailyTarget = calculateDailyTarget({
                            daysSinceStart,
                            weekMode: profile.week_mode || 'sane',
                            restDays,
                            recoveryDays,
                            currentDayOfWeek: todayDayOfWeek
                        });

                        // Get today's logs for current user
                        const { data: todayLogs } = await supabase
                            .from('logs')
                            .select('points, exercise_id')
                            .eq('user_id', user.id)
                            .eq('date', today);

                        // Get exercises for recovery capping
                        const { data: exercises } = await supabase
                            .from('exercises')
                            .select('id, type');

                        const exerciseTypeMap = new Map(exercises?.map(e => [e.id, e.type]) || []);

                        // Calculate actual points with recovery capping
                        let totalRecovery = 0;
                        let totalNonRecovery = 0;

                        todayLogs?.forEach(log => {
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

                        const percentage = dailyTarget > 0 ? Math.round((actualPoints / dailyTarget) * 100) : 0;

                        setTodayProgress({
                            actual: actualPoints,
                            target: dailyTarget,
                            percentage
                        });
                    }
                } catch (error) {
                    console.error('[NewDashboard] Error calculating today progress:', error);
                }

            }

            // 13. Fetch Pending Penalties
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const response = await fetch('/api/penalties/my-pending', {
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`
                        }
                    });
                    const data = await response.json();
                    setPendingPenalties(data.penalties || []);
                }
            } catch (error) {
                console.error('[NewDashboard] Error fetching pending penalties:', error);
            }

        } catch (error) {
            console.error('[NewDashboard] Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch popular exercises for a specific time period
    const fetchPopularExercisesByPeriod = async (period: TimePeriod, isGroup: boolean) => {
        if (!user || !userProfile?.group_id) return;

        try {
            const { startDate, endDate } = getDateRangeForPeriod(period);

            if (isGroup) {
                const { data: members } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('group_id', userProfile.group_id);

                if (members && members.length > 0) {
                    const memberIds = members.map(m => m.id);

                    const { data: periodLogs, error: logsError } = await supabase
                        .from('logs')
                        .select('exercise_id, points, sport_name, date, user_id, exercises(name)')
                        .in('user_id', memberIds)
                        .gte('date', startDate)
                        .lte('date', endDate);

                    if (logsError) {
                        console.error('[NewDashboard] Group Popular - Error:', logsError);
                        return;
                    }

                    const { data: allMembers } = await supabase
                        .from('profiles')
                        .select('id, username')
                        .in('id', memberIds);

                    const userIdToUsername = new Map(allMembers?.map(m => [m.id, m.username]) || []);

                    const exerciseCount = new Map<string, { name: string; count: number; contributors: Set<string> }>();
                    periodLogs?.forEach((log: any) => {
                        let displayName: string;
                        let groupKey: string;

                        const exerciseName = log.exercises?.name;

                        if (log.sport_name) {
                            displayName = log.sport_name;
                            groupKey = `sport:${log.sport_name}`;
                        } else if (exerciseName && exerciseName !== 'Intense Sport') {
                            displayName = exerciseName;
                            groupKey = `exercise:${log.exercise_id}`;
                        } else {
                            return;
                        }

                        const username = userIdToUsername.get(log.user_id);
                        if (!username) return;

                        const current = exerciseCount.get(groupKey);
                        if (current) {
                            current.count += log.points;
                            current.contributors.add(username);
                        } else {
                            exerciseCount.set(groupKey, {
                                name: displayName,
                                count: log.points,
                                contributors: new Set([username])
                            });
                        }
                    });

                    const topExercises = Array.from(exerciseCount.values())
                        .map(exercise => ({
                            name: exercise.name,
                            count: exercise.count,
                            contributors: Array.from(exercise.contributors)
                        }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5);

                    setPopularExercisesGroup(topExercises);
                }
            } else {
                const { data: periodLogs } = await supabase
                    .from('logs')
                    .select('exercise_id, points, sport_name, date, exercises(name)')
                    .eq('user_id', user.id)
                    .gte('date', startDate)
                    .lte('date', endDate);

                const exerciseCount = new Map<string, { name: string; count: number }>();
                periodLogs?.forEach((log: any) => {
                    let displayName: string;
                    let groupKey: string;

                    const exerciseName = log.exercises?.name;

                    if (log.sport_name) {
                        displayName = log.sport_name;
                        groupKey = `sport:${log.sport_name}`;
                    } else if (exerciseName && exerciseName !== 'Intense Sport') {
                        displayName = exerciseName;
                        groupKey = `exercise:${log.exercise_id}`;
                    } else {
                        return;
                    }

                    const current = exerciseCount.get(groupKey);
                    if (current) {
                        current.count += log.points;
                    } else {
                        exerciseCount.set(groupKey, { name: displayName, count: log.points });
                    }
                });

                const topExercises = Array.from(exerciseCount.values())
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                setPopularExercisesPersonal(topExercises);
            }
        } catch (error) {
            console.error('[NewDashboard] Error fetching popular exercises by period:', error);
        }
    };

    // Fetch peak workout time for a specific time period
    const fetchPeakWorkoutTimeByPeriod = async (period: TimePeriod) => {
        if (!user || !userProfile?.group_id) return;

        try {
            const { startTimestamp, endTimestamp } = getTimestampRangeForPeriod(period);

            const { data: members } = await supabase
                .from('profiles')
                .select('id')
                .eq('group_id', userProfile.group_id);

            if (members && members.length > 0) {
                const memberIds = members.map(m => m.id);

                const { data: timeLogs } = await supabase
                    .from('logs')
                    .select('created_at')
                    .in('user_id', memberIds)
                    .gte('created_at', startTimestamp)
                    .lt('created_at', endTimestamp);

                const hourCounts = new Array(24).fill(0);
                timeLogs?.forEach(log => {
                    const localDate = new Date(log.created_at);
                    const hour = localDate.getHours();
                    hourCounts[hour]++;
                });

                const maxCount = Math.max(...hourCounts);
                if (maxCount > 0) {
                    const mostPopularHour = hourCounts.indexOf(maxCount);

                    const peakTime = mostPopularHour === 0 ? '12AM' :
                                    mostPopularHour < 12 ? `${mostPopularHour}AM` :
                                    mostPopularHour === 12 ? '12PM' :
                                    `${mostPopularHour - 12}PM`;

                    setPeakWorkoutTime(peakTime);
                } else {
                    setPeakWorkoutTime('--:--');
                }
                setHourlyWorkoutData(hourCounts);
            }
        } catch (error) {
            console.error('[NewDashboard] Error fetching peak workout time by period:', error);
        }
    };

    // Effect to update data when favorite exercise time period changes
    useEffect(() => {
        if (userProfile?.group_id) {
            fetchPopularExercisesByPeriod(favoriteTimePeriod, viewMode === 'group');
        }
    }, [favoriteTimePeriod, viewMode, userProfile?.group_id]);

    // Effect to update data when peak time period changes
    useEffect(() => {
        if (userProfile?.group_id) {
            fetchPeakWorkoutTimeByPeriod(peakTimeTimePeriod);
        }
    }, [peakTimeTimePeriod, userProfile?.group_id]);

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

    const getHoursRemaining = (date: Date) => {
        const now = date.getTime();
        const midnight = new Date(date);
        midnight.setHours(24, 0, 0, 0);
        const remaining = midnight.getTime() - now;
        return Math.floor(remaining / (1000 * 60 * 60));
    };

    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 selection:text-blue-100 overflow-x-hidden relative">

            <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col pb-28">

                {/* Header */}
                <header className="px-6 pt-8 flex justify-between items-center">
                    <h1 className="text-[1.6rem] text-white uppercase leading-none flex items-center gap-0" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: '-0.03em', fontWeight: 900 }}>
                        <span>THE C</span>
                        <svg width="42" height="18" viewBox="0 0 42 18" fill="none" className="relative" style={{ margin: '0 2px' }}>
                            <defs>
                                <linearGradient id="oGradient" x1="0%" y1="50%" x2="100%" y2="50%">
                                    <stop offset="0%" stopColor="#60a5fa" />
                                    <stop offset="100%" stopColor="#f97316" />
                                </linearGradient>
                            </defs>
                            <rect x="3" y="3" width="36" height="12" rx="6" stroke="url(#oGradient)" strokeWidth="5.5" fill="none" />
                        </svg>
                        <span>MMITMENT</span>
                    </h1>
                    <button
                        onClick={() => router.push('/profile')}
                        className="w-10 h-10 rounded-full bg-[#111] border border-white/10 flex items-center justify-center hover:bg-[#222] transition-all"
                    >
                        <Settings size={22} className="text-white" />
                    </button>
                </header>

                {/* --- MAIN CONTENT --- */}
                <div className="px-5 flex flex-col mb-8">
                    <div className="px-1 relative mt-6">
                        <span className="text-sm font-bold uppercase tracking-[0.2em] block mb-1">
                            <span className="text-zinc-500">{dayName.slice(0, -3)}</span>
                            <span className="text-white">{dayName.slice(-3)}</span>
                        </span>
                        <span className="block text-9xl font-black tracking-tighter leading-[0.8] text-white drop-shadow-2xl">{daysRemaining}</span>
                    </div>

                    <div className="mt-6">
                        <div className="flex justify-between items-center px-4 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Time Remaining</span>
                        </div>
                        <div className="h-20 w-full bg-[#050505] rounded-full border border-zinc-800 p-1.5 shadow-[0_0_0_1px_rgba(0,0,0,1)] relative group">
                            <div className="h-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 relative transition-all duration-1000"
                                style={{
                                    width: `${time ? Math.max(10, getTimeRemainingPercentage(time)) : 0}%`,
                                    minWidth: '68px',
                                    boxShadow: COLORS.orange.boxShadow,
                                    borderRadius: '9999px'
                                }}>
                                <div className="absolute inset-0 rounded-full overflow-hidden z-0">
                                    <div className="absolute top-[-50%] bottom-[-50%] left-[-50%] right-[-50%] bg-white/20 skew-x-12 animate-[shimmer_2s_infinite] mix-blend-overlay" />
                                </div>
                            </div>
                            {time && (
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
                                    <span className="text-3xl font-black tracking-tight text-white tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{getTimeRemaining(time)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8">
                        <GlassCard noPadding className="overflow-visible min-h-[240px]">
                            <CardHeader title="Squad Status" icon={Flame} colorClass="text-orange-500" />
                            <div className="px-4 py-3 flex flex-col">
                                {squadData.map((u, i) => (<SquadMemberRow key={i} name={u.name} pct={u.pct} mode={u.mode} isLive={u.isLive} isRecoveryDay={u.isRecoveryDay} isFlexibleRestDay={u.isFlexibleRestDay} />))}
                                {squadData.length === 0 && <div className="text-zinc-500 text-center py-4">Loading squad...</div>}
                            </div>
                        </GlassCard>

                        {/* Pending Penalty Alert - Only show if penalties exist */}
                        {pendingPenalties.length > 0 && (
                            <div className="mt-4">
                                <button
                                    onClick={() => setIsPenaltyModalOpen(true)}
                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-2xl p-4 border-2 border-orange-500/50 shadow-lg hover:shadow-orange-500/25 transition-all active:scale-[0.98]"
                                    style={{
                                        boxShadow: pendingPenalties[0]?.hours_remaining && pendingPenalties[0].hours_remaining < 6
                                            ? '0 0 30px rgba(249, 115, 22, 0.5), 0 0 60px rgba(249, 115, 22, 0.3)'
                                            : '0 0 30px rgba(249, 115, 22, 0.3)'
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                                <AlertCircle className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white font-black text-sm">
                                                    PENALTY RESPONSE REQUIRED
                                                </div>
                                                <div className="text-white/80 text-xs">
                                                    {pendingPenalties.length === 1 ? '1 penalty' : `${pendingPenalties.length} penalties`} waiting • {pendingPenalties[0]?.hours_remaining ? formatTimeRemaining(pendingPenalties[0].hours_remaining) : 'Time limited'} left
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-white/60" />
                                    </div>
                                </button>
                            </div>
                        )}

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
                    {/* Performance Recap - Group view only, shown first */}
                    {viewMode === "group" && (
                        <GlassCard noPadding className="col-span-2">
                            <CardHeader
                                title={`Performance Recap: ${recapData.yesterdayDate ? new Date(recapData.yesterdayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Yesterday'}`}
                                icon={AlertCircle}
                                colorClass="text-orange-500"
                            />
                            <div className="p-4 grid grid-cols-2 gap-3">
                                {/* Left column: Made It, Rest Day, Flex Rest, Recovery Day */}
                                <div className="flex flex-col gap-2">
                                    {/* Made It - using opal colors */}
                                    {recapData.completedMembers.length > 0 && (
                                        <div className="rounded-xl p-3 border" style={{
                                            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(79, 70, 229, 0.15) 100%)',
                                            borderColor: 'rgba(96, 165, 250, 0.2)'
                                        }}>
                                            <div className="flex items-center gap-2 mb-2" style={{ color: 'rgb(96, 165, 250)' }}>
                                                <CheckCircle2 size={16} />
                                                <span className="text-xs font-black uppercase tracking-wide">Made It</span>
                                            </div>
                                            <div className="text-xs font-bold text-zinc-300 space-y-0.5">
                                                {recapData.completedMembers.map((username, idx) => (
                                                    <div key={idx}>{username.slice(0, 4).toUpperCase()}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Rest Day - soft indigo/slate colors */}
                                    {recapData.restDayMembers.length > 0 && (
                                        <div className="rounded-xl p-2.5 border" style={{
                                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(129, 140, 248, 0.15) 100%)',
                                            borderColor: 'rgba(99, 102, 241, 0.2)'
                                        }}>
                                            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'rgb(129, 140, 248)' }}>
                                                <Moon size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wide">Rest Day</span>
                                            </div>
                                            <div className="text-xs font-bold text-zinc-300 space-y-0.5">
                                                {recapData.restDayMembers.map((username, idx) => (
                                                    <div key={idx}>{username.slice(0, 4).toUpperCase()}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Flex Rest Day - amber/gold colors for earned achievement */}
                                    {recapData.flexRestDayMembers.length > 0 && (
                                        <div className="rounded-xl p-2.5 border" style={{
                                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.15) 100%)',
                                            borderColor: 'rgba(245, 158, 11, 0.2)'
                                        }}>
                                            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'rgb(245, 158, 11)' }}>
                                                <Sparkles size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wide">Flex Rest</span>
                                            </div>
                                            <div className="text-xs font-bold text-zinc-300 space-y-0.5">
                                                {recapData.flexRestDayMembers.map((username, idx) => (
                                                    <div key={idx}>{username.slice(0, 4).toUpperCase()}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recovery Day - emerald colors */}
                                    {recapData.recoveryDayMembers.length > 0 && (
                                        <div className="rounded-xl p-2.5 border" style={{
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
                                            borderColor: 'rgba(16, 185, 129, 0.2)'
                                        }}>
                                            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'rgb(16, 185, 129)' }}>
                                                <Heart size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wide">Recovery</span>
                                            </div>
                                            <div className="text-xs font-bold text-zinc-300 space-y-0.5">
                                                {recapData.recoveryDayMembers.map((username, idx) => (
                                                    <div key={idx}>{username.slice(0, 4).toUpperCase()}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Waived - purple colors */}
                                    {recapData.waivedMembers.length > 0 && (
                                        <div className="rounded-xl p-2.5 border" style={{
                                            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                                            borderColor: 'rgba(168, 85, 247, 0.2)'
                                        }}>
                                            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'rgb(168, 85, 247)' }}>
                                                <Sparkles size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wide">Waived</span>
                                            </div>
                                            <div className="text-xs font-bold text-zinc-300 space-y-0.5">
                                                {recapData.waivedMembers.map((m, idx) => (
                                                    <div key={idx}>{m.username.slice(0, 4).toUpperCase()}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right column: Paid, Under Review, Pending, Sick */}
                                <div className="flex flex-col gap-2">
                                    {/* Paid - red colors */}
                                    {recapData.paidMembers.length > 0 && (
                                        <div className="rounded-xl p-2.5 border" style={{
                                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.15) 100%)',
                                            borderColor: 'rgba(239, 68, 68, 0.2)'
                                        }}>
                                            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'rgb(239, 68, 68)' }}>
                                                <AlertCircle size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wide">Paid</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {recapData.paidMembers.map((m, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs font-bold text-zinc-300">
                                                        <span>{m.username.slice(0, 4).toUpperCase()}</span>
                                                        <span className="font-mono text-[9px]">{m.actual}/{m.target}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Under Review - blue colors */}
                                    {recapData.underReviewMembers.length > 0 && (
                                        <div className="rounded-xl p-2.5 border" style={{
                                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)',
                                            borderColor: 'rgba(59, 130, 246, 0.2)'
                                        }}>
                                            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'rgb(59, 130, 246)' }}>
                                                <Search size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wide">Under Review</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {recapData.underReviewMembers.map((m, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs font-bold text-zinc-300">
                                                        <span>{m.username.slice(0, 4).toUpperCase()}</span>
                                                        <span className="font-mono text-[9px]">{m.actual}/{m.target}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pending - orange colors */}
                                    {recapData.pendingMembers.length > 0 && (
                                        <div className="rounded-xl p-2.5 border" style={{
                                            background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)',
                                            borderColor: 'rgba(251, 146, 60, 0.2)'
                                        }}>
                                            <div className="flex items-center gap-2 mb-1.5" style={{ color: 'rgb(251, 146, 60)' }}>
                                                <Clock size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wide">Pending</span>
                                            </div>
                                            <div className="space-y-0.5">
                                                {recapData.pendingMembers.map((m, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs font-bold text-zinc-300">
                                                        <span>{m.username.slice(0, 4).toUpperCase()}</span>
                                                        <span className="font-mono text-[9px]">{m.actual}/{m.target}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sick Mode - gray colors */}
                                    {recapData.sickMembers.length > 0 && (
                                        <div className="bg-gray-800/40 rounded-xl p-2.5 border border-gray-600/30">
                                            <div className="flex items-center gap-2 mb-1.5 text-gray-400">
                                                <Moon size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-wide">Sick</span>
                                            </div>
                                            <div className="text-xs font-bold text-gray-400 space-y-0.5">
                                                {recapData.sickMembers.map((username, idx) => (
                                                    <div key={idx}>{username.slice(0, 4).toUpperCase()}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* View Full History Button */}
                            <div className="px-4 pb-4">
                                <button
                                    onClick={() => setIsRecapHistoryOpen(true)}
                                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 hover:border-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    View Full History
                                </button>
                            </div>
                        </GlassCard>
                    )}

                    {viewMode === "group" ? (
                        <GlassCard noPadding className="col-span-2">
                            <CardHeader title="Group Performance" icon={TrendingUp} colorClass="text-orange-500" rightContent="LAST 30D" />
                            <div className="p-6 pt-2">
                                <GroupOverperformanceChart dailyData={groupDailyData} />
                            </div>
                        </GlassCard>
                    ) : (
                        <GlassCard noPadding className="col-span-2">
                            <CardHeader title="Performance" icon={TrendingUp} colorClass="text-blue-400" rightContent="LAST 30D" />
                            <div className="p-6 pt-2">
                                <PersonalOverperformChart dailyData={personalDailyData} />
                            </div>
                        </GlassCard>
                    )}

                    {viewMode === "group" ? (
                        <GlassCard noPadding className="row-span-2 h-full min-h-[320px] flex flex-col">
                            <CardHeader
                                title="Pot History"
                                icon={Coins}
                                colorClass="text-yellow-500"
                            />
                            <div className="flex flex-col flex-1 min-h-0">
                                {/* Main Content Area */}
                                <div className="flex-1 overflow-hidden px-3 pt-3">
                                    <div className="flex flex-col gap-0.5">
                                        {potHistory.slice(0, 8).map((c, i) => (
                                            <div
                                                key={i}
                                                className={`grid grid-cols-[1fr_auto_auto] gap-2 items-center text-[10px] px-1 py-1 ${c.days === 0 ? 'text-orange-500 font-bold' : 'text-zinc-400'}`}
                                            >
                                                {/* Name Column */}
                                                <div className="flex items-center gap-2">
                                                    <div className={`font-bold tracking-wider ${c.days === 0 ? 'text-orange-500' : 'text-zinc-300'}`}>
                                                        {c.name.slice(0, 4).toUpperCase()}
                                                    </div>
                                                    {c.days === 0 && <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />}
                                                </div>

                                                {/* Amount Column */}
                                                <div className="text-sm font-black text-white tabular-nums">
                                                    €{c.amt}
                                                </div>

                                                {/* Time Column */}
                                                <div className={`font-medium text-[9px] uppercase tracking-wide text-right min-w-[3rem] ${c.days === 0 ? 'text-orange-500/80' : 'text-zinc-600'}`}>
                                                    {c.days === 0 ? 'Today' : `${c.days}d ago`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-3 mt-auto">
                                    <button
                                        onClick={() => setIsPotHistoryOpen(true)}
                                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 hover:border-white/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        View Full History
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    ) : (
                        <GlassCard noPadding className="row-span-2 h-full min-h-[320px] flex flex-col">
                            <CardHeader title="Contributions" icon={CircleDollarSign} colorClass="text-green-500" />
                            <div className="flex flex-col flex-1 min-h-0">
                                {userContributions.length > 0 ? (
                                    <>
                                        {/* Main Content Area */}
                                        <div className="flex-1 overflow-hidden px-3 pt-3">
                                            <div className="flex flex-col gap-0.5">
                                                {userContributions.map((c, i) => (
                                                    <div
                                                        key={i}
                                                        className={`grid grid-cols-[1fr_auto_auto] gap-2 items-center text-[10px] px-1 py-1 ${c.days === 0 ? 'text-green-500 font-bold' : 'text-zinc-400'}`}
                                                    >
                                                        {/* Date Column */}
                                                        <div className="flex items-center gap-2">
                                                            <div className={`font-bold tracking-wider ${c.days === 0 ? 'text-green-500' : 'text-zinc-300'}`}>
                                                                {c.date}
                                                            </div>
                                                            {c.days === 0 && <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
                                                        </div>

                                                        {/* Amount Column */}
                                                        <div className="text-sm font-black text-white tabular-nums">
                                                            €{c.amount}
                                                        </div>

                                                        {/* Time Column */}
                                                        <div className={`font-medium text-[9px] uppercase tracking-wide text-right min-w-[3rem] ${c.days === 0 ? 'text-green-500/80' : 'text-zinc-600'}`}>
                                                            {c.days === 0 ? 'Today' : `${c.days}d ago`}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col h-full justify-center items-center p-6">
                                        <div className="text-center">
                                            <div className="text-5xl font-black text-zinc-700 mb-4">€0</div>
                                            <div className="text-xs text-zinc-600">No contributions yet</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    )}
                    {viewMode === "group" ? (
                        <GlassCard noPadding className="aspect-square flex flex-col">
                            <CardHeader title="Total Pot" icon={CircleDollarSign} colorClass="text-green-500" />
                            <div className="p-4 pt-2 flex flex-col justify-center items-center flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-white tracking-tighter">€{totalPot}</span>
                                </div>
                            </div>
                        </GlassCard>
                    ) : (
                        // Personal view: User's own birthday
                        upcomingBirthdays.find(b => b.isCurrentUser) ? (
                            <GlassCard noPadding className="h-[160px]">
                                <CardHeader title="Your Birthday" icon={Calendar} colorClass="text-purple-500" />
                                <div className="p-4 pt-2 flex flex-col justify-center h-[calc(100%-48px)]">
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-5xl font-black text-white tracking-tighter">
                                            {upcomingBirthdays.find(b => b.isCurrentUser)!.daysUntil}
                                        </span>
                                        <span className="text-sm font-bold text-zinc-500">DAYS</span>
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {new Date(upcomingBirthdays.find(b => b.isCurrentUser)!.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                    </div>
                                </div>
                            </GlassCard>
                        ) : (
                            <GlassCard noPadding className="h-[160px]">
                                <CardHeader title="Your Birthday" icon={Calendar} colorClass="text-purple-500" />
                                <div className="p-4 pt-2 flex flex-col justify-center h-[calc(100%-48px)]">
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-zinc-500 mb-2">Not Set</div>
                                        <div className="text-xs text-zinc-600">Add in profile settings</div>
                                    </div>
                                </div>
                            </GlassCard>
                        )
                    )}

                    {viewMode === "group" && upcomingBirthdays.length > 0 ? (
                        <GlassCard noPadding className="aspect-square flex flex-col">
                            <CardHeader title="Upcoming Bdays" icon={Calendar} colorClass="text-orange-500" />
                            <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-center">
                                {upcomingBirthdays.slice(0, 2).map((birthday, index) => {
                                    // Logic: Next (index 1) is reference (100%). Upcoming (index 0) scales relative to it.
                                    const nextBirthday = upcomingBirthdays[1];
                                    const referenceDays = nextBirthday ? nextBirthday.daysUntil : 60; // Default scale if only 1

                                    // If index 1 (Next): Blue, Full Bar
                                    // If index 0 (Upcoming): Orange, Proportional Bar (Small if days is small)
                                    // Formula: (days / reference) * 100
                                    const isNext = index === 1;
                                    const percentage = isNext
                                        ? 100
                                        : Math.max(5, (birthday.daysUntil / referenceDays) * 100);

                                    const shadowStyle = {
                                        boxShadow: isNext
                                            ? '0 0 20px 3px rgba(96, 165, 250, 0.25), 0 0 10px 0px rgba(79, 70, 229, 0.3)'
                                            : '0 0 20px 3px rgba(249, 115, 22, 0.3), 0 0 10px 0px rgba(249, 115, 22, 0.4)'
                                    };

                                    return (
                                        <div key={index} className="relative">
                                            {/* Name Label */}
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-black text-zinc-300 tracking-wider">
                                                    {birthday.isCurrentUser ? 'YOU' : birthday.username.slice(0, 4).toUpperCase()}
                                                </span>
                                            </div>

                                            {/* Thicker Bar with Text Inside */}
                                            <div className="h-7 w-full bg-zinc-800/50 rounded-lg overflow-hidden relative border border-white/5">
                                                {/* Progress Bar */}
                                                <div
                                                    className={`h-full transition-all duration-1000 flex items-center justify-end px-2.5 ${isNext
                                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                                        : 'bg-gradient-to-r from-orange-500 to-orange-600'
                                                        }`}
                                                    style={{ width: `${percentage}%`, ...shadowStyle }}
                                                >
                                                </div>

                                                {/* Text Overlay (Absolute to ensure visibility if bar is small) */}
                                                <div className="absolute inset-0 flex items-center justify-end px-2.5 pointer-events-none">
                                                    <span className="text-[10px] font-black text-white drop-shadow-md z-10">
                                                        {birthday.daysUntil} {birthday.daysUntil === 1 ? 'DAY' : 'DAYS'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </GlassCard>
                    ) : viewMode === "group" ? (
                        <GlassCard noPadding className="aspect-square flex flex-col">
                            <CardHeader title="Upcoming Bdays" icon={Calendar} colorClass="text-purple-500" />
                            <div className="p-4 flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-sm text-zinc-500">No birthdays set</div>
                                    <div className="text-xs text-zinc-600 mt-1">Members can add birthdays in profile settings</div>
                                </div>
                            </div>
                        </GlassCard>
                    ) : null
                    }
                    <PopularExerciseWidget
                        exercises={viewMode === "group" ? popularExercisesGroup : popularExercisesPersonal}
                        isPersonal={viewMode === "personal"}
                        timePeriod={favoriteTimePeriod}
                        onTimePeriodChange={setFavoriteTimePeriod}
                    />
                </section >

                {/* --- NEW COMPONENTS SECTION --- */}
                {
                    viewMode === "group" ? (
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

                            {/* Peak Workout Time - Group (with visualization) */}
                            <GlassCard noPadding className="col-span-2">
                                <CardHeader
                                    title="Peak Time"
                                    icon={Zap}
                                    colorClass="text-yellow-500"
                                    rightContent={TIME_PERIOD_LABELS[peakTimeTimePeriod]}
                                    onRightContentClick={() => setPeakTimeTimePeriod(getNextTimePeriod(peakTimeTimePeriod))}
                                />
                                <div className="p-6 pt-2">
                                    <div className="text-xs text-zinc-500 mb-4">Group workout distribution by time of day</div>
                                    <PeakWorkoutTimeChart hourlyData={hourlyWorkoutData} />
                                </div>
                            </GlassCard>
                        </section>
                    ) : (
                        <section className="px-5 grid grid-cols-2 gap-4 mt-8">
                            {/* Peak Workout Time - Personal (hourly visualization) */}
                            <GlassCard noPadding className="col-span-2">
                                <CardHeader 
                                    title="Peak Time"
                                    icon={Zap} 
                                    colorClass="text-yellow-500" 
                                    rightContent={TIME_PERIOD_LABELS[peakTimeTimePeriod]}
                                    onRightContentClick={() => setPeakTimeTimePeriod(getNextTimePeriod(peakTimeTimePeriod))}
                                />
                                <div className="p-6 pt-2">
                                    <div className="text-xs text-zinc-500 mb-4">Workout distribution by time of day</div>
                                    <PeakWorkoutTimeChart hourlyData={hourlyWorkoutData} />
                                </div>
                            </GlassCard>
                        </section>
                    )
                }

            </div >

            {/* --- BOTTOM NAVIGATION --- */}
            < BottomNavigation
                onWorkoutClick={() => setIsWorkoutModalOpen(true)}
                onChatClick={handleChatOpen}
                groupId={userProfile?.group_id}
                progressPercentage={squadData.find(u => u.name === "You")?.pct || todayProgress.percentage}
                hasUnreadMessages={hasUnreadMessages}
                isRecoveryDay={squadData.find(u => u.name === "You")?.isRecoveryDay || false}
            />

            {/* --- WORKOUT MODAL --- */}
            {
                user && (
                    <WorkoutModal
                        isOpen={isWorkoutModalOpen}
                        onClose={() => {
                            setIsWorkoutModalOpen(false);
                            loadDashboardData(); // Reload dashboard data after workout logged
                        }}
                        onOpenChat={() => {
                            setIsWorkoutModalOpen(false);
                            handleChatOpen();
                        }}
                    />
                )
            }

            {/* --- CHAT MODAL --- */}
            <GroupChat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onCloseStart={() => setIsChatOpen(false)}
            />

            {/* --- POT HISTORY MODAL --- */}
            {
                isPotHistoryOpen && userProfile?.group_id && (
                    <PotHistoryModal
                        groupId={userProfile.group_id}
                        onClose={() => setIsPotHistoryOpen(false)}
                    />
                )
            }

            {/* --- DAILY RECAP HISTORY MODAL --- */}
            {
                isRecapHistoryOpen && userProfile?.group_id && (
                    <DailyRecapHistoryModal
                        groupId={userProfile.group_id}
                        onClose={() => setIsRecapHistoryOpen(false)}
                    />
                )
            }

            {/* --- PENALTY RESPONSE MODAL --- */}
            {isPenaltyModalOpen && pendingPenalties.length > 0 && (
                <PenaltyResponseModal
                    penalties={pendingPenalties}
                    onComplete={() => {
                        setIsPenaltyModalOpen(false);
                        loadDashboardData(); // Refresh to update penalty count
                    }}
                    onDismiss={() => setIsPenaltyModalOpen(false)}
                />
            )}

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
      `}</style>
        </div >
    );
}
