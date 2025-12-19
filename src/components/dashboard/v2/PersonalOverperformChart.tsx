import React from 'react';

interface PersonalOverperformChartProps {
    dailyData: Array<{
        date: string;
        actual: number;
        target: number;
        overperformance: number;
        recovery: number;
        sickPlaceholder: number;
        isRecoveryDay?: boolean; // User-chosen recovery day
    }>;
}

export const PersonalOverperformChart = ({ dailyData }: PersonalOverperformChartProps) => {
    if (dailyData.length === 0) {
        return (
            <div className="text-center py-8 text-zinc-500 text-sm">
                No data available
            </div>
        );
    }

    const chartHeight = 128;
    const usableHeight = chartHeight * 0.8;

    // Find max value across all data
    const maxDataValue = Math.max(...dailyData.map(d => Math.max(d.target, d.actual)));
    const maxScale = maxDataValue * 1.1; // Add 10% headroom

    // Get today's date string for highlighting
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-3">
            {/* Chart area */}
            <div className="relative">
                <div className="relative flex items-end justify-between h-32 w-full">
                    {dailyData.map((day, index) => {
                        const isToday = day.date === today;
                        const isRecoveryDay = day.isRecoveryDay || false;

                        // Calculate component heights
                        const basePoints = Math.max(0, day.actual - day.overperformance - day.recovery);
                        const baseHeightPx = maxScale > 0 ? (basePoints / maxScale) * usableHeight : 0;
                        const recoveryHeightPx = maxScale > 0 ? (day.recovery / maxScale) * usableHeight : 0;
                        const overHeightPx = maxScale > 0 ? (day.overperformance / maxScale) * usableHeight : 0;
                        const sickHeightPx = maxScale > 0 ? (day.sickPlaceholder / maxScale) * usableHeight : 0;

                        const opacity = isToday ? 1 : 0.5;

                        return (
                            <div
                                key={index}
                                className="flex-1 h-full flex flex-col justify-end items-stretch relative group px-[0.5px]"
                            >
                                <div className="w-full flex flex-col justify-end items-center">
                                    <div className="w-full max-w-[7px] flex flex-col justify-end">
                                        {/* Recovery Day indicator - full green bar */}
                                        {isRecoveryDay && (
                                            <div
                                                className="w-full rounded-t-[1.5px] transition-all duration-300 bg-gradient-to-t from-green-700 to-green-500"
                                                style={{
                                                    height: `${(day.actual / maxScale) * usableHeight}px`,
                                                    opacity: opacity
                                                }}
                                            />
                                        )}
                                        
                                        {/* Normal day display */}
                                        {!isRecoveryDay && (
                                            <>
                                                {/* 1. Orange overperformance bar (TOP) */}
                                                {day.overperformance > 0 && (
                                                    <div
                                                        className="w-full rounded-t-[1.5px] transition-all duration-300 bg-gradient-to-t from-orange-700 to-orange-600"
                                                        style={{
                                                            height: `${overHeightPx}px`,
                                                            opacity: opacity
                                                        }}
                                                    />
                                                )}

                                                {/* 2. Base points bar (blue) (MIDDLE) */}
                                                {baseHeightPx > 0 && (
                                                    <div
                                                        className={`w-full transition-all duration-300 bg-gradient-to-t from-blue-700 to-blue-600 ${day.overperformance === 0 ? 'rounded-t-[1.5px]' : ''}`}
                                                        style={{
                                                            height: `${baseHeightPx}px`,
                                                            opacity: opacity
                                                        }}
                                                    />
                                                )}

                                                {/* 3. Recovery points bar (teal) (LOWER) */}
                                                {day.recovery > 0 && (
                                                    <div
                                                        className={`w-full transition-all duration-300 bg-gradient-to-t from-teal-700 to-teal-600 ${day.overperformance === 0 && basePoints === 0 ? 'rounded-t-[1.5px]' : ''}`}
                                                        style={{
                                                            height: `${recoveryHeightPx}px`,
                                                            opacity: opacity
                                                        }}
                                                    />
                                                )}

                                                {/* 4. Sick Placeholder (Gray) (BOTTOM) */}
                                                {day.sickPlaceholder > 0 && (
                                                    <div
                                                        className={`w-full transition-all duration-300 bg-zinc-800/80 border-t border-white/5 ${day.overperformance === 0 && basePoints === 0 && day.recovery === 0 ? 'rounded-t-[1.5px]' : ''}`}
                                                        style={{
                                                            height: `${sickHeightPx}px`,
                                                            opacity: opacity
                                                        }}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Tooltip on hover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                                    <div className="bg-black/90 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] whitespace-nowrap">
                                        <div className="text-zinc-400 mb-0.5">
                                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </div>
                                        {isRecoveryDay ? (
                                            <div className="text-green-400">🧘 Recovery Day</div>
                                        ) : (
                                            <>
                                                <div className="text-blue-400">Target: {day.target}</div>
                                                <div className="text-white">Actual: {day.actual}</div>
                                                {day.recovery > 0 && (
                                                    <div className="text-teal-400">Recovery: {day.recovery}</div>
                                                )}
                                                {day.overperformance > 0 && (
                                                    <div className="text-orange-400">+{day.overperformance}</div>
                                                )}
                                                {day.sickPlaceholder > 0 && (
                                                    <div className="text-zinc-500">Sick: {day.sickPlaceholder}</div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Day of week labels */}
                <div className="relative flex items-center justify-between mt-1 w-full text-center">
                    {dailyData.map((day, index) => {
                        const dayOfWeek = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
                        const firstLetter = dayOfWeek.charAt(0);
                        const isToday = day.date === today;
                        const isRecoveryDay = day.isRecoveryDay || false;

                        return (
                            <div key={index} className="flex-1">
                                <span className={`text-[8px] font-bold ${
                                    isRecoveryDay 
                                        ? 'text-green-500' 
                                        : isToday 
                                            ? 'text-white' 
                                            : 'text-zinc-600'
                                }`}>
                                    {isRecoveryDay ? '🧘' : firstLetter}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2.5 text-[9px] font-bold">
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-gradient-to-r from-orange-700 to-orange-600" />
                    <span className="text-zinc-500">Over</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-gradient-to-r from-blue-700 to-blue-600" />
                    <span className="text-zinc-500">Base</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-gradient-to-r from-teal-700 to-teal-600" />
                    <span className="text-zinc-500">Recovery</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-gradient-to-r from-green-700 to-green-500" />
                    <span className="text-zinc-500">Rest</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded bg-zinc-600" />
                    <span className="text-zinc-500">Sick</span>
                </div>
            </div>
        </div>
    );
};
