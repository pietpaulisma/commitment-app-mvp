import React, { useState } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { X, ChevronDown, ChevronRight, Eye, Target, MessageSquare, Settings, Trophy } from 'lucide-react';

interface MessageOption {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  rarity: 'common' | 'rare' | 'legendary';
  preview: string;
}

interface SummaryOption {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  preview: string;
}

interface MilestoneOption {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  rarity: 'common' | 'rare' | 'legendary';
  preview: string;
  currentProgress: number;
  target: number;
  unit: string;
}

interface TimingConfig {
  type: 'end_of_day' | 'custom';
  customTime?: string;
}

export default function SystemMessageConfig() {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');
  const [previewMode, setPreviewMode] = useState<string | null>(null);
  
  // Challenge configuration
  const [challengeEnabled, setChallengeEnabled] = useState(false);
  const [challengeMessage, setChallengeMessage] = useState('');
  const [challengeTiming, setChallengeTiming] = useState<TimingConfig>({ type: 'end_of_day' });

  // Summary configuration
  const [summaryEnabled, setSummaryEnabled] = useState(true);
  const [summaryTiming, setSummaryTiming] = useState<TimingConfig>({ type: 'end_of_day' });
  const [dailySummaryOptions, setDailySummaryOptions] = useState<SummaryOption[]>([
    {
      id: 'workout_completion',
      title: 'Workout Completion Rate',
      description: 'Show how many members completed their workouts today',
      enabled: true,
      preview: "💪 Workout Update: 8/10 members crushed their workouts today! Amazing commitment team!"
    },
    {
      id: 'top_performer',
      title: 'Daily MVP',
      description: 'Highlight the member who performed best today',
      enabled: true,
      preview: "🏆 Today's MVP: Sarah with an intense 90-minute strength session! Way to lead by example!"
    },
    {
      id: 'streak_info',
      title: 'Group Streak',
      description: 'Show current group workout streak',
      enabled: true,
      preview: "🔥 STREAK ALERT: We're on a 12-day group streak! Let's keep this momentum going strong!"
    },
    {
      id: 'motivation',
      title: 'Daily Motivation',
      description: 'Include an inspiring fitness quote',
      enabled: false,
      preview: "✨ \"The only bad workout is the one that didn't happen.\" - Keep pushing forward, team!"
    }
  ]);

  const [weeklySummaryOptions, setWeeklySummaryOptions] = useState<SummaryOption[]>([
    {
      id: 'weekly_stats',
      title: 'Weekly Performance',
      description: 'Overview of group workout completion this week',
      enabled: true,
      preview: "📊 Week 12 Recap: 89% completion rate, 47 total workouts, and 3 new personal bests!"
    },
    {
      id: 'member_spotlight',
      title: 'Member Spotlight',
      description: 'Feature a member who showed great progress',
      enabled: true,
      preview: "🌟 Member Spotlight: Mike improved his 5K time by 2 minutes this week! Incredible progress!"
    }
  ]);

  const [personalSummaryOptions, setPersonalSummaryOptions] = useState<SummaryOption[]>([
    {
      id: 'personal_streak',
      title: 'Personal Streak',
      description: 'Individual member workout streaks',
      enabled: true,
      preview: "🔥 @Alex: You're on a 15-day streak! Your consistency is inspiring the whole team!"
    },
    {
      id: 'goal_progress',
      title: 'Goal Milestones',
      description: 'Personal fitness goal achievements',
      enabled: true,
      preview: "🎯 @Sam just hit their monthly goal of 20 workouts! Incredible dedication this month!"
    }
  ]);

  // Admin Messages configuration
  const [developerMessage, setDeveloperMessage] = useState('');
  const [developerTiming, setDeveloperTiming] = useState<TimingConfig>({ type: 'custom', customTime: '09:00' });

  // Milestone configuration
  const [milestoneOptions, setMilestoneOptions] = useState<MilestoneOption[]>([
    { 
      id: 'first_100', 
      title: 'Century Club', 
      description: 'Group completes 100 total workouts', 
      enabled: true, 
      rarity: 'rare' as const,
      preview: "🎉 MILESTONE UNLOCKED: Century Club! We've completed 100 workouts together as a team!",
      currentProgress: 87,
      target: 100,
      unit: 'workouts'
    },
    { 
      id: 'workout_streak_week', 
      title: 'Week Warriors', 
      description: 'Everyone completes workouts for 7 days straight', 
      enabled: true, 
      rarity: 'legendary' as const,
      preview: "🏆 LEGENDARY ACHIEVEMENT: Week Warriors! Every single member completed their workouts for 7 days straight!",
      currentProgress: 4,
      target: 7,
      unit: 'days'
    },
    { 
      id: 'streak_master', 
      title: 'Streak Master', 
      description: 'Member maintains 30-day workout streak', 
      enabled: true, 
      rarity: 'legendary' as const,
      preview: "⚡ STREAK MASTER UNLOCKED: @Chris just hit an incredible 30-day workout streak! Legend status achieved!",
      currentProgress: 22,
      target: 30,
      unit: 'days'
    }
  ]);

  // Main sections
  const sections = [
    {
      id: 'challenge',
      title: 'Weekly Challenges',
      description: 'Motivational fitness challenges for the group',
      icon: Target,
      enabled: challengeEnabled,
      count: 0
    },
    {
      id: 'summary',
      title: 'Workout Summaries',
      description: 'Daily, weekly, and personal progress updates',
      icon: MessageSquare,
      enabled: summaryEnabled,
      count: dailySummaryOptions.filter(opt => opt.enabled).length + 
             weeklySummaryOptions.filter(opt => opt.enabled).length + 
             personalSummaryOptions.filter(opt => opt.enabled).length
    },
    {
      id: 'admin',
      title: 'Admin Messages',
      description: 'Important announcements from group administrators',
      icon: Settings,
      enabled: true,
      count: 0
    },
    {
      id: 'milestone',
      title: 'Achievement Celebrations',
      description: 'Milestone notifications and achievement unlocks',
      icon: Trophy,
      enabled: true,
      count: milestoneOptions.filter(opt => opt.enabled).length
    }
  ];

  const toggleSummaryOption = (options: SummaryOption[], setOptions: React.Dispatch<React.SetStateAction<SummaryOption[]>>, id: string) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, enabled: !option.enabled } : option
    ));
  };

  const toggleMessageOption = (options: MessageOption[], setOptions: React.Dispatch<React.SetStateAction<MessageOption[]>>, id: string) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, enabled: !option.enabled } : option
    ));
  };

  const toggleMilestoneOption = (id: string) => {
    setMilestoneOptions(milestoneOptions.map(option => 
      option.id === id ? { ...option, enabled: !option.enabled } : option
    ));
  };

  const updateMessageRarity = (options: MessageOption[], setOptions: React.Dispatch<React.SetStateAction<MessageOption[]>>, id: string, rarity: 'common' | 'rare' | 'legendary') => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, rarity } : option
    ));
  };

  const updateMilestoneRarity = (id: string, rarity: 'common' | 'rare' | 'legendary') => {
    setMilestoneOptions(milestoneOptions.map(option => 
      option.id === id ? { ...option, rarity } : option
    ));
  };

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rare': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'legendary': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return '';
    }
  };

  const getRarityPreviewStyle = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return {
          container: 'mt-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30',
          header: 'text-green-400 text-xs',
          text: 'mt-1 text-green-200 text-xs leading-relaxed'
        };
      case 'rare':
        return {
          container: 'mt-3 p-4 bg-blue-500/15 rounded-lg border-2 border-blue-500/40 shadow-lg shadow-blue-500/10',
          header: 'text-blue-300 text-xs font-medium',
          text: 'mt-1 text-blue-100 text-xs leading-relaxed'
        };
      case 'legendary':
        return {
          container: 'mt-3 p-4 bg-gradient-to-br from-yellow-400/30 via-amber-500/25 to-orange-500/20 rounded-lg border-2 border-yellow-400/60 shadow-xl shadow-yellow-500/20 relative overflow-hidden',
          header: 'text-yellow-200 text-xs font-semibold tracking-wide uppercase',
          text: 'mt-2 text-yellow-50 text-sm leading-relaxed font-medium'
        };
      default:
        return {
          container: 'mt-3 p-3 bg-slate-500/10 rounded-lg border border-slate-500/30',
          header: 'text-slate-400 text-xs',
          text: 'mt-1 text-slate-300 text-xs leading-relaxed'
        };
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-yellow-500'; // Near completion - legendary
    if (percentage >= 70) return 'bg-blue-500'; // Good progress - rare  
    return 'bg-green-500'; // Early progress - common
  };

  const renderRaritySelector = (
    option: MessageOption,
    options: MessageOption[], 
    setOptions: React.Dispatch<React.SetStateAction<MessageOption[]>>
  ) => (
    <Select 
      value={option.rarity} 
      onValueChange={(value: 'common' | 'rare' | 'legendary') => 
        updateMessageRarity(options, setOptions, option.id, value)
      }
    >
      <SelectTrigger 
        className={`inline-flex items-center h-auto px-2 py-0.5 text-xs border rounded-md cursor-pointer hover:opacity-80 transition-opacity w-auto ${getRarityBadgeStyle(option.rarity)}`}
      >
        {option.rarity}
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-600">
        <SelectItem value="common">Common</SelectItem>
        <SelectItem value="rare">Rare</SelectItem>
        <SelectItem value="legendary">Legendary</SelectItem>
      </SelectContent>
    </Select>
  );

  const renderMilestoneRaritySelector = (milestone: MilestoneOption) => (
    <Select 
      value={milestone.rarity} 
      onValueChange={(value: 'common' | 'rare' | 'legendary') => 
        updateMilestoneRarity(milestone.id, value)
      }
    >
      <SelectTrigger 
        className={`inline-flex items-center h-auto px-2 py-0.5 text-xs border rounded-md cursor-pointer hover:opacity-80 transition-opacity w-auto ${getRarityBadgeStyle(milestone.rarity)}`}
      >
        {milestone.rarity}
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-600">
        <SelectItem value="common">Common</SelectItem>
        <SelectItem value="rare">Rare</SelectItem>
        <SelectItem value="legendary">Legendary</SelectItem>
      </SelectContent>
    </Select>
  );

  const renderSummaryOption = (
    option: SummaryOption, 
    options: SummaryOption[], 
    setOptions: React.Dispatch<React.SetStateAction<SummaryOption[]>>
  ) => (
    <div key={option.id} className="flex items-start justify-between py-3">
      <div className="flex-1 min-w-0 pr-3">
        <h5 className="text-white text-sm">{option.title}</h5>
        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{option.description}</p>
      </div>
      <Checkbox
        checked={option.enabled}
        onCheckedChange={() => toggleSummaryOption(options, setOptions, option.id)}
        className="mt-1 shrink-0"
      />
    </div>
  );

  const renderMessageOption = (
    option: MessageOption, 
    options: MessageOption[], 
    setOptions: React.Dispatch<React.SetStateAction<MessageOption[]>>
  ) => (
    <div key={option.id} className="flex items-start justify-between py-3">
      <div className="flex-1 min-w-0 pr-3">
        <h5 className="text-white text-sm">{option.title}</h5>
        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{option.description}</p>
        <div className="mt-2">
          {renderRaritySelector(option, options, setOptions)}
        </div>
      </div>
      <Checkbox
        checked={option.enabled}
        onCheckedChange={() => toggleMessageOption(options, setOptions, option.id)}
        className="mt-1 shrink-0"
      />
    </div>
  );

  const renderMilestoneOption = (milestone: MilestoneOption) => {
    const percentage = Math.min((milestone.currentProgress / milestone.target) * 100, 100);
    const isCompleted = percentage >= 100;
    const isPreviewVisible = previewMode === `milestone-${milestone.id}`;
    const previewStyle = getRarityPreviewStyle(milestone.rarity);
    
    return (
      <div key={milestone.id} className="py-4 border-b border-slate-700/30 last:border-b-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <h5 className="text-white text-sm">{milestone.title}</h5>
              {isCompleted && <span className="text-xs text-yellow-400">✓ Complete</span>}
            </div>
            <p className="text-slate-400 text-xs mb-3 leading-relaxed">{milestone.description}</p>
            
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Progress</span>
                <span className="text-xs text-slate-400">
                  {milestone.currentProgress}/{milestone.target} {milestone.unit}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(percentage)}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">{Math.round(percentage)}%</span>
              </div>
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <div>
                {renderMilestoneRaritySelector(milestone)}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setPreviewMode(isPreviewVisible ? null : `milestone-${milestone.id}`)}
                className="text-slate-400 hover:text-slate-300 h-6 px-2 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                {isPreviewVisible ? 'Hide' : 'Preview'}
              </Button>
            </div>
            
            {/* Individual Milestone Preview with Rarity-specific Styling */}
            {isPreviewVisible && (
              <div className={previewStyle.container}>
                {milestone.rarity === 'legendary' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/10 to-transparent animate-pulse"></div>
                )}
                <span className={previewStyle.header}>
                  {milestone.rarity === 'legendary' ? '✨ Legendary Achievement Preview ✨' : 
                   milestone.rarity === 'rare' ? '💎 Rare Achievement Preview' : 
                   '🌟 Achievement Preview'}
                </span>
                <p className={previewStyle.text}>{milestone.preview}</p>
                {milestone.rarity === 'legendary' && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                )}
              </div>
            )}
          </div>
          <Checkbox
            checked={milestone.enabled}
            onCheckedChange={() => toggleMilestoneOption(milestone.id)}
            className="mt-1 shrink-0"
          />
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl text-white">Bot Message Settings</h1>
            <p className="text-slate-400 text-sm mt-1">Configure automated messages for your fitness group</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-300 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Section List */}
        <div className="space-y-3">
          {sections.map((section, index) => {
            const isExpanded = expandedSection === section.id;
            const IconComponent = section.icon;
            
            return (
              <div key={section.id} className="bg-slate-900/40 rounded-lg border border-slate-800/60">
                
                {/* Section Header */}
                <div 
                  className={`flex items-center justify-between p-4 hover:bg-slate-800/30 cursor-pointer transition-colors rounded-lg ${
                    isExpanded ? 'bg-slate-800/40 border-b border-slate-700/50' : ''
                  }`}
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5 text-slate-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white">{section.title}</h3>
                        {section.count > 0 && (
                          <span className="text-xs text-slate-400">({section.count})</span>
                        )}
                        {section.enabled && (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm">{section.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>

                {/* Section Content */}
                {isExpanded && (
                  <div className="p-6 bg-slate-800/20 rounded-b-lg">
                    
                    {/* Challenge Configuration */}
                    {section.id === 'challenge' && (
                      <div className="space-y-6">
                        {/* Section Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
                          <div>
                            <h4 className="text-white text-sm">Enable Weekly Challenges</h4>
                            <p className="text-slate-400 text-xs mt-1">Send motivational challenges to keep the group engaged</p>
                          </div>
                          <Switch
                            checked={challengeEnabled}
                            onCheckedChange={setChallengeEnabled}
                            className="data-[state=checked]:bg-green-600"
                          />
                        </div>

                        {challengeEnabled && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-white text-sm">Weekly Challenge Message</Label>
                              <Textarea
                                placeholder="e.g., This week's challenge: Complete 100 burpees as a team! 💪"
                                value={challengeMessage}
                                onChange={(e) => setChallengeMessage(e.target.value)}
                                className="bg-slate-800 border-slate-600 text-white min-h-[80px] resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-white text-sm">Send Time</Label>
                                <Select 
                                  value={challengeTiming.type} 
                                  onValueChange={(value: 'end_of_day' | 'custom') => 
                                    setChallengeTiming({ type: value, customTime: value === 'custom' ? '09:00' : undefined })
                                  }
                                >
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-600">
                                    <SelectItem value="end_of_day">End of Day</SelectItem>
                                    <SelectItem value="custom">Custom Time</SelectItem>
                                  </SelectContent>
                                </Select>
                                {challengeTiming.type === 'custom' && (
                                  <Input
                                    type="time"
                                    value={challengeTiming.customTime || '09:00'}
                                    onChange={(e) => setChallengeTiming({ ...challengeTiming, customTime: e.target.value })}
                                    className="bg-slate-800 border-slate-600 text-white"
                                  />
                                )}
                              </div>
                            </div>

                            {challengeMessage && (
                              <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
                                <div className="flex items-center gap-2 mb-2">
                                  <Eye className="h-3 w-3 text-slate-500" />
                                  <span className="text-xs text-slate-400">Preview</span>
                                </div>
                                <p className="text-sm text-slate-300">{challengeMessage}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Summary Configuration */}
                    {section.id === 'summary' && (
                      <div className="space-y-8">
                        {/* Section Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
                          <div>
                            <h4 className="text-white text-sm">Enable Workout Summaries</h4>
                            <p className="text-slate-400 text-xs mt-1">Send daily, weekly, and personal workout progress updates</p>
                          </div>
                          <Switch
                            checked={summaryEnabled}
                            onCheckedChange={setSummaryEnabled}
                            className="data-[state=checked]:bg-green-600"
                          />
                        </div>

                        {summaryEnabled && (
                          <>
                            {/* Daily Summaries */}
                            <div className="space-y-4">
                              <h4 className="text-white">Daily Summary Options</h4>
                              
                              <div className="space-y-1 p-4 bg-slate-800/20 rounded-lg border border-slate-700/20">
                                {dailySummaryOptions.map((option) => 
                                  renderSummaryOption(option, dailySummaryOptions, setDailySummaryOptions)
                                )}
                              </div>

                              <div className="flex justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setPreviewMode(previewMode === 'daily' ? null : 'daily')}
                                  className="text-slate-400 hover:text-slate-300 h-7 px-2"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  {previewMode === 'daily' ? 'Hide Preview' : 'Show Preview'}
                                </Button>
                              </div>

                              {previewMode === 'daily' && (
                                <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                                  <span className="text-blue-400 text-xs">Daily Summary Preview</span>
                                  <div className="mt-2 space-y-1">
                                    {dailySummaryOptions.filter(opt => opt.enabled).map(opt => (
                                      <p key={opt.id} className="text-blue-300 text-xs leading-relaxed">{opt.preview}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Weekly Summaries */}
                            <div className="space-y-4">
                              <div className="w-full h-px bg-slate-700/50"></div>
                              <h4 className="text-white">Weekly Summary Options</h4>
                              
                              <div className="space-y-1 p-4 bg-slate-800/20 rounded-lg border border-slate-700/20">
                                {weeklySummaryOptions.map((option) => 
                                  renderSummaryOption(option, weeklySummaryOptions, setWeeklySummaryOptions)
                                )}
                              </div>

                              <div className="flex justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setPreviewMode(previewMode === 'weekly' ? null : 'weekly')}
                                  className="text-slate-400 hover:text-slate-300 h-7 px-2"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  {previewMode === 'weekly' ? 'Hide Preview' : 'Show Preview'}
                                </Button>
                              </div>

                              {previewMode === 'weekly' && (
                                <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                                  <span className="text-purple-400 text-xs">Weekly Summary Preview</span>
                                  <div className="mt-2 space-y-1">
                                    {weeklySummaryOptions.filter(opt => opt.enabled).map(opt => (
                                      <p key={opt.id} className="text-purple-300 text-xs leading-relaxed">{opt.preview}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Personal Summaries */}
                            <div className="space-y-4">
                              <div className="w-full h-px bg-slate-700/50"></div>
                              <h4 className="text-white">Personal Summary Options</h4>
                              
                              <div className="space-y-1 p-4 bg-slate-800/20 rounded-lg border border-slate-700/20">
                                {personalSummaryOptions.map((option) => 
                                  renderSummaryOption(option, personalSummaryOptions, setPersonalSummaryOptions)
                                )}
                              </div>

                              <div className="flex justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setPreviewMode(previewMode === 'personal' ? null : 'personal')}
                                  className="text-slate-400 hover:text-slate-300 h-7 px-2"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  {previewMode === 'personal' ? 'Hide Preview' : 'Show Preview'}
                                </Button>
                              </div>

                              {previewMode === 'personal' && (
                                <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                                  <span className="text-green-400 text-xs">Personal Summary Preview</span>
                                  <div className="mt-2 space-y-1">
                                    {personalSummaryOptions.filter(opt => opt.enabled).map(opt => (
                                      <p key={opt.id} className="text-green-300 text-xs leading-relaxed">{opt.preview}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Summary Timing */}
                            <div className="space-y-4">
                              <div className="w-full h-px bg-slate-700/50"></div>
                              <h4 className="text-white text-sm">Summary Timing</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-white text-sm">Send Time</Label>
                                  <Select 
                                    value={summaryTiming.type} 
                                    onValueChange={(value: 'end_of_day' | 'custom') => 
                                      setSummaryTiming({ type: value, customTime: value === 'custom' ? '20:00' : undefined })
                                    }
                                  >
                                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600">
                                      <SelectItem value="end_of_day">End of Day</SelectItem>
                                      <SelectItem value="custom">Custom Time</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {summaryTiming.type === 'custom' && (
                                    <Input
                                      type="time"
                                      value={summaryTiming.customTime || '20:00'}
                                      onChange={(e) => setSummaryTiming({ ...summaryTiming, customTime: e.target.value })}
                                      className="bg-slate-800 border-slate-600 text-white"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Admin Messages Configuration */}
                    {section.id === 'admin' && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-white text-sm">Admin Message</Label>
                          <Textarea
                            placeholder="Send important announcements to your fitness group..."
                            value={developerMessage}
                            onChange={(e) => setDeveloperMessage(e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white min-h-[100px] resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white text-sm">Send Time</Label>
                            <Select 
                              value={developerTiming.type} 
                              onValueChange={(value: 'end_of_day' | 'custom') => 
                                setDeveloperTiming({ type: value, customTime: value === 'custom' ? '09:00' : undefined })
                              }
                            >
                              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600">
                                <SelectItem value="end_of_day">End of Day</SelectItem>
                                <SelectItem value="custom">Custom Time</SelectItem>
                              </SelectContent>
                            </Select>
                            {developerTiming.type === 'custom' && (
                              <Input
                                type="time"
                                value={developerTiming.customTime || '09:00'}
                                onChange={(e) => setDeveloperTiming({ ...developerTiming, customTime: e.target.value })}
                                className="bg-slate-800 border-slate-600 text-white"
                              />
                            )}
                          </div>
                          
                          <div className="flex items-end">
                            <Button
                              onClick={() => {
                                if (developerMessage.trim()) {
                                  console.log('Sending admin message:', developerMessage);
                                  setDeveloperMessage('');
                                }
                              }}
                              disabled={!developerMessage.trim()}
                              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                            >
                              Send Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Milestone Configuration */}
                    {section.id === 'milestone' && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h4 className="text-white">Achievement Milestones</h4>
                          <p className="text-slate-400 text-sm">Celebrations are sent instantly when milestones are reached</p>
                          
                          <div className="p-4 bg-slate-800/20 rounded-lg border border-slate-700/20">
                            {milestoneOptions.map((milestone) => renderMilestoneOption(milestone))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-700/50">
          <Button variant="outline" onClick={() => setIsOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800">
            Cancel
          </Button>
          <Button className="bg-green-600 hover:bg-green-700">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}