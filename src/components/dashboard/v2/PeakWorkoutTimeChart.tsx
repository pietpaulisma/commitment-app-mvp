import React from 'react';

interface PeakWorkoutTimeChartProps {
    hourlyData: number[];
}

export const PeakWorkoutTimeChart = ({ hourlyData }: PeakWorkoutTimeChartProps) => {
    const max = Math.max(...hourlyData);

    // Calculate intensity for each hour (0-1 scale)
    const intensities = hourlyData.map(count => max > 0 ? count / max : 0);

    // Get gradient ID based on intensity
    const getGradientId = (intensity: number, hour: number) => {
        if (intensity === 0) return null; // Use solid color for no activity
        if (intensity < 0.3) return `gradient-low-${hour}`;
        if (intensity < 0.6) return `gradient-med-${hour}`;
        if (intensity < 0.8) return `gradient-high-${hour}`;
        return `gradient-peak-${hour}`;
    };

    // Get solid color for zero intensity
    const getSolidColor = (intensity: number) => {
        if (intensity === 0) return 'rgba(39, 39, 42, 0.5)'; // zinc-800/50 for no activity
        return 'url(#gradient)';
    };

    // SVG dimensions
    const size = 280;
    const center = size / 2;
    const outerRadius = 120;
    const innerRadius = 60;
    const labelRadius = 135;

    // Generate clock markers (12, 3, 6, 9)
    const timeLabels = [
        { hour: 0, label: '12AM', angle: -90 },
        { hour: 6, label: '6AM', angle: 0 },
        { hour: 12, label: '12PM', angle: 90 },
        { hour: 18, label: '6PM', angle: 180 }
    ];

    // Generate path for each hour segment
    const generateSegmentPath = (hour: number) => {
        const angleStart = (hour * 15) - 90; // Each hour = 15 degrees, start from top
        const angleEnd = angleStart + 15;

        const startRad = (angleStart * Math.PI) / 180;
        const endRad = (angleEnd * Math.PI) / 180;

        const x1 = center + innerRadius * Math.cos(startRad);
        const y1 = center + innerRadius * Math.sin(startRad);
        const x2 = center + outerRadius * Math.cos(startRad);
        const y2 = center + outerRadius * Math.sin(startRad);
        const x3 = center + outerRadius * Math.cos(endRad);
        const y3 = center + outerRadius * Math.sin(endRad);
        const x4 = center + innerRadius * Math.cos(endRad);
        const y4 = center + innerRadius * Math.sin(endRad);

        return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1} Z`;
    };

    // Find peak hour
    const peakHour = hourlyData.indexOf(max);
    const peakLabel = peakHour === 0 ? '12AM' : peakHour < 12 ? `${peakHour}AM` : peakHour === 12 ? '12PM' : `${peakHour - 12}PM`;

    return (
        <div className="flex flex-col items-center py-4">
            {/* Circular heat map */}
            <svg width={size} height={size} className="mb-4">
                {/* Define gradients for each hour segment */}
                <defs>
                    {Array.from({ length: 24 }, (_, hour) => {
                        const intensity = intensities[hour];
                        const gradientId = getGradientId(intensity, hour);
                        if (!gradientId) return null;

                        // Define gradient colors based on intensity
                        let startColor, midColor, endColor;
                        if (intensity < 0.3) {
                            // Low - blue gradient
                            startColor = 'rgba(37, 99, 235, 0.3)'; // blue-600
                            midColor = 'rgba(59, 130, 246, 0.35)'; // blue-500
                            endColor = 'rgba(96, 165, 250, 0.4)'; // blue-400
                        } else if (intensity < 0.6) {
                            // Medium - stronger blue gradient
                            startColor = 'rgba(37, 99, 235, 0.6)'; // blue-600
                            midColor = 'rgba(59, 130, 246, 0.65)'; // blue-500
                            endColor = 'rgba(96, 165, 250, 0.7)'; // blue-400
                        } else if (intensity < 0.8) {
                            // High - orange gradient
                            startColor = 'rgba(234, 88, 12, 0.8)'; // orange-600
                            midColor = 'rgba(249, 115, 22, 0.85)'; // orange-500
                            endColor = 'rgba(251, 146, 60, 0.9)'; // orange-400
                        } else {
                            // Peak - red gradient
                            startColor = 'rgba(220, 38, 38, 0.9)'; // red-600
                            midColor = 'rgba(239, 68, 68, 0.95)'; // red-500
                            endColor = 'rgba(248, 113, 113, 1)'; // red-400
                        }

                        return (
                            <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={startColor} />
                                <stop offset="50%" stopColor={midColor} />
                                <stop offset="100%" stopColor={endColor} />
                            </linearGradient>
                        );
                    })}
                </defs>

                {/* Hour segments */}
                {Array.from({ length: 24 }, (_, hour) => {
                    const intensity = intensities[hour];
                    const gradientId = getGradientId(intensity, hour);
                    const fillColor = intensity === 0 ? 'rgba(39, 39, 42, 0.5)' : `url(#${gradientId})`;

                    return (
                        <g key={hour}>
                            <path
                                d={generateSegmentPath(hour)}
                                fill={fillColor}
                                stroke="rgba(0, 0, 0, 0.3)"
                                strokeWidth="0.5"
                                className="transition-all duration-300 hover:opacity-80"
                            />
                        </g>
                    );
                })}

                {/* Time labels */}
                {timeLabels.map(({ hour, label, angle }) => {
                    const rad = (angle * Math.PI) / 180;
                    const x = center + labelRadius * Math.cos(rad);
                    const y = center + labelRadius * Math.sin(rad);

                    return (
                        <text
                            key={hour}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[11px] font-bold fill-zinc-500"
                        >
                            {label}
                        </text>
                    );
                })}

                {/* Center circle with peak info */}
                <circle cx={center} cy={center} r={innerRadius - 5} fill="rgba(0, 0, 0, 0.5)" />
                <text
                    x={center}
                    y={center - 8}
                    textAnchor="middle"
                    className="text-xs font-bold fill-zinc-500"
                >
                    PEAK HOUR
                </text>
                <text
                    x={center}
                    y={center + 10}
                    textAnchor="middle"
                    className="text-lg font-black fill-white"
                >
                    {peakLabel}
                </text>
            </svg>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }} />
                    <span className="text-zinc-600">Low</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.6)' }} />
                    <span className="text-zinc-600">Med</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(249, 115, 22, 0.8)' }} />
                    <span className="text-zinc-600">High</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }} />
                    <span className="text-zinc-600">Peak</span>
                </div>
            </div>
        </div>
    );
};
