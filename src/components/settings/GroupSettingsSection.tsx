'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getDaysSinceStart } from '@/utils/targetCalculation'

type Group = {
    id: string
    name: string
    start_date: string
    admin_id: string
    created_at: string
    invite_code?: string
}

type GroupSettings = {
    recovery_days: number[]
}

type GroupSettingsSectionProps = {
    group: Group
    groupSettings: GroupSettings | null
    onSaveSettings: (startDate: string, recoveryDays: number[]) => Promise<void>
}

export function GroupSettingsSection({
    group,
    groupSettings,
    onSaveSettings,
}: GroupSettingsSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [startDate, setStartDate] = useState(group.start_date)
    const [recoveryDays, setRecoveryDays] = useState<number[]>(groupSettings?.recovery_days || [5])

    const handleSave = async () => {
        await onSaveSettings(startDate, recoveryDays)
        setIsEditing(false)
    }

    const handleCancel = () => {
        setStartDate(group.start_date)
        setRecoveryDays(groupSettings?.recovery_days || [5])
        setIsEditing(false)
    }

    return (
        <div>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <span className="text-xs font-bold">⚙️</span>
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-bold text-white group-hover:text-blue-200 transition-colors">
                            Group Settings
                        </span>
                        <span className="text-[10px] text-zinc-500">Start date & recovery days</span>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                ) : (
                    <ChevronDown size={16} className="text-zinc-600 group-hover:text-zinc-400" />
                )}
            </button>

            {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                    {/* Current Info */}
                    <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4">
                        <h4 className="text-sm font-medium text-white mb-3">Current Configuration</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-zinc-500 uppercase tracking-wide text-xs">Start Date</div>
                                <div className="font-semibold text-white">
                                    {new Date(group.start_date).toLocaleDateString()}
                                </div>
                            </div>
                            <div>
                                <div className="text-zinc-500 uppercase tracking-wide text-xs">Challenge Day</div>
                                <div className="font-semibold text-white">Day {getDaysSinceStart(group.start_date) + 1}</div>
                            </div>
                            <div>
                                <div className="text-zinc-500 uppercase tracking-wide text-xs">Today's Target</div>
                                <div className="font-semibold text-white">{1 + getDaysSinceStart(group.start_date)} pts</div>
                            </div>
                            <div>
                                <div className="text-zinc-500 uppercase tracking-wide text-xs">Recovery Day</div>
                                <div className="font-semibold text-white">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][recoveryDays[0]] || 'Fri'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Edit Controls */}
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            Edit Settings
                        </button>
                    ) : (
                        <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4 space-y-4">
                            <h4 className="text-sm font-medium text-white">Edit Group Settings</h4>

                            {/* Start Date */}
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                                    Group Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-zinc-500 mt-1">
                                    Changing this affects challenge day and daily targets for all members
                                </p>
                            </div>

                            {/* Recovery Days */}
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                                    Recovery Day
                                </label>
                                <p className="text-xs text-zinc-500 mb-3">
                                    Choose which day requires only 25% of normal target through recovery exercises
                                </p>
                                <div className="grid grid-cols-7 gap-2">
                                    {[
                                        { day: 0, name: 'Sun' },
                                        { day: 1, name: 'Mon' },
                                        { day: 2, name: 'Tue' },
                                        { day: 3, name: 'Wed' },
                                        { day: 4, name: 'Thu' },
                                        { day: 5, name: 'Fri' },
                                        { day: 6, name: 'Sat' },
                                    ].map(({ day, name }) => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => setRecoveryDays([day])}
                                            className={`p-2 text-center border rounded transition-colors ${recoveryDays.includes(day)
                                                    ? 'border-green-500 bg-green-500/10 text-green-400'
                                                    : 'border-zinc-600 bg-zinc-800/30 text-zinc-500 hover:border-zinc-500'
                                                }`}
                                        >
                                            <div className="font-bold text-xs">{name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm font-medium"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 bg-zinc-600 text-white px-4 py-2 rounded hover:bg-zinc-700 transition-colors text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
