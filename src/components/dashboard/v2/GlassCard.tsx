import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
}

export const GlassCard = ({ children, className = "", noPadding = false }: GlassCardProps) => (
    <div className={`relative bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-xl ${noPadding ? '' : 'p-6'} ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className="relative z-10 h-full flex flex-col">{children}</div>
    </div>
);
