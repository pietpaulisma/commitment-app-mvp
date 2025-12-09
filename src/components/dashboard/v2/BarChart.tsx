import React from 'react';
import { COLORS } from '@/utils/colors';

export const BarChart = () => {
    const data = [10, 25, 40, 30, 60, 45, 80, 50, 40, 70, 90, 60, 50, 40, 30, 50, 70, 40, 20];
    const max = Math.max(...data);
    return (
        <div className="flex items-end justify-between h-24 gap-1 px-2 mt-4">
            {data.map((val, i) => (
                <div key={i} className={`w-full rounded-t-sm transition-all duration-500 ${val === max ? 'bg-gradient-to-t from-blue-400 via-blue-500 to-purple-600 shadow-[0_0_15px_rgba(96,165,250,0.5)]' : 'bg-zinc-800 hover:bg-zinc-700'}`} style={{ height: `${(val / max) * 100}%` }} />
            ))}
        </div>
    );
};
