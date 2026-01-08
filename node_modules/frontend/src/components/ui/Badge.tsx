import React from 'react';
import { cn, getStatusColor } from '@/lib/utils';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'status';
    status?: string;
    className?: string;
}

export function Badge({ children, variant = 'default', status, className }: BadgeProps) {
    const baseStyles = 'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border';

    if (variant === 'status' && status) {
        return (
            <span className={cn(baseStyles, getStatusColor(status), className)}>
                {children}
            </span>
        );
    }

    return (
        <span className={cn(
            baseStyles,
            'bg-violet-500/20 text-violet-400 border-violet-500/30',
            className
        )}>
            {children}
        </span>
    );
}
