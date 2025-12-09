import React from 'react';
import { COLORS } from '@/utils/colors';

interface PersonalOverperformChartProps {
    dailyData: Array<{
        date: string;
        actual: number;
        target: number;
    }>;
}

export const PersonalOverperformChart = ({ dailyData }: PersonalOverperformChartProps) => {
    // Calculate max value for scaling (use the highest of actual or target)
    const max = Math.max(...dailyData.map(d => Math.max(d.actual, d.target)));

    return (
        <div className="flex items-end justify-between h-24 gap-1 px-2 mt-4">
            {dailyData.map((day, i) => {
                const targetHeight = (day.target / max) * 100;
                const actualHeight = (day.actual / max) * 100;
                const isOverperforming = day.actual > day.target;

                return (
                    <div key={i} className="w-full relative flex flex-col justify-end" style={{ height: '100%' }}>
                        {/* Base bar (blue to purple - represents target) */}
                        <div
                            className="w-full rounded-t-sm transition-all duration-500 bg-gradient-to-t from-blue-400 via-blue-500 to-purple-600"
                            style={{
                                height: `${Math.min(targetHeight, actualHeight)}%`
                            }}
                        />
                        {/* Overflow bar (orange - represents overperformance) */}
                        {isOverperforming && (
                            <div
                                className="w-full rounded-t-sm transition-all duration-500 bg-gradient-to-t from-orange-500 via-orange-600 to-red-600 absolute bottom-0"
                                style={{
                                    height: `${actualHeight}%`,
                                    opacity: 0.8
                                }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
