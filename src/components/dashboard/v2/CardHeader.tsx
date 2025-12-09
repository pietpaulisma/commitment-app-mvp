import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardHeaderProps {
    title: string;
    icon: LucideIcon;
    rightContent?: React.ReactNode;
    colorClass?: string;
}

export const CardHeader = ({ title, icon: Icon, rightContent, colorClass = "text-green-500" }: CardHeaderProps) => (
    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Icon size={14} className={colorClass} fill="currentColor" /> {title}
        </h3>
        {rightContent && <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{rightContent}</div>}
    </div>
);
