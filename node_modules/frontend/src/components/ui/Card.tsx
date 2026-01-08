import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
    className?: string;
    children: React.ReactNode;
    hover?: boolean;
    onClick?: () => void;
}

export function Card({ className, children, hover = false, onClick }: CardProps) {
    return (
        <div
            className={cn(
                'bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6',
                hover && 'hover:bg-gray-800/70 hover:border-gray-600/50 transition-all duration-200 cursor-pointer',
                onClick && 'cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    className?: string;
    children: React.ReactNode;
}

export function CardHeader({ className, children }: CardHeaderProps) {
    return (
        <div className={cn('mb-4', className)}>
            {children}
        </div>
    );
}

interface CardTitleProps {
    className?: string;
    children: React.ReactNode;
}

export function CardTitle({ className, children }: CardTitleProps) {
    return (
        <h3 className={cn('text-lg font-semibold text-white', className)}>
            {children}
        </h3>
    );
}

interface CardContentProps {
    className?: string;
    children: React.ReactNode;
}

export function CardContent({ className, children }: CardContentProps) {
    return (
        <div className={cn(className)}>
            {children}
        </div>
    );
}
