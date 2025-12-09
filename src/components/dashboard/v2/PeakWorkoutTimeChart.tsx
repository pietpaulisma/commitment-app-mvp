import React from 'react';
import { COLORS } from '@/utils/colors';

interface PeakWorkoutTimeChartProps {
    hourlyData: number[];
}

export const PeakWorkoutTimeChart = ({ hourlyData }: PeakWorkoutTimeChartProps) => {
    const max = Math.max(...hourlyData);

    // Group hours into 4-hour blocks for better visualization
    const timeBlocks = [
        { label: '0-3', hours: [0, 1, 2, 3] },
        { label: '4-7', hours: [4, 5, 6, 7] },
        { label: '8-11', hours: [8, 9, 10, 11] },
        { label: '12-15', hours: [12, 13, 14, 15] },
        { label: '16-19', hours: [16, 17, 18, 19] },
        { label: '20-23', hours: [20, 21, 22, 23] }
    ];

    const blockData = timeBlocks.map(block => {
        const total = block.hours.reduce((sum, hour) => sum + hourlyData[hour], 0);
        return { label: block.label, value: total };
    });

    return (
        <div className="space-y-2">
            {blockData.map((block, i) => {
                const percentage = max > 0 ? (block.value / max) * 100 : 0;
                const isZero = block.value === 0;

                return (
                    <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-500 w-12 text-right">{block.label}</span>
                        <div className="flex-1 bg-zinc-900/50 rounded-md h-6 overflow-hidden relative">
                            {!isZero && (
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-500 via-yellow-600 to-orange-500 transition-all duration-500 flex items-center justify-end px-2"
                                    style={{ width: `${percentage}%` }}
                                >
                                    <span className="text-xs font-black text-black/70">{block.value}</span>
                                </div>
                            )}
                            {isZero && (
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-700">0</span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
