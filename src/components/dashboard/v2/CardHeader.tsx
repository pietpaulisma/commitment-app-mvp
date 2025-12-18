import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardHeaderProps {
    title: string;
    icon: LucideIcon;
    rightContent?: React.ReactNode;
    colorClass?: string;
    onRightContentClick?: () => void;
}

export const CardHeader = ({ title, icon: Icon, rightContent, colorClass = "text-green-500", onRightContentClick }: CardHeaderProps) => (
    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Icon size={14} className={colorClass} fill="currentColor" /> {title}
        </h3>
        {rightContent && (
            <div 
                className={`text-[10px] font-bold uppercase tracking-widest ${onRightContentClick ? 'cursor-pointer text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all select-none px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50' : 'text-zinc-500'}`}
                onClick={onRightContentClick}
            >
                {rightContent}
            </div>
        )}
    </div>
);
