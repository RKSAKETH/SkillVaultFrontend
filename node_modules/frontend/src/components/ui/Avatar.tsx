import React from 'react';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
    src?: string | null;
    firstName: string;
    lastName: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export function Avatar({ src, firstName, lastName, size = 'md', className }: AvatarProps) {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    const initials = getInitials(firstName, lastName);

    // Generate a consistent background color based on the name
    const colors = [
        'from-violet-500 to-indigo-500',
        'from-pink-500 to-rose-500',
        'from-cyan-500 to-blue-500',
        'from-emerald-500 to-teal-500',
        'from-orange-500 to-amber-500',
        'from-purple-500 to-fuchsia-500',
    ];
    const colorIndex = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;

    if (src) {
        return (
            <img
                src={src}
                alt={`${firstName} ${lastName}`}
                className={cn(
                    'rounded-full object-cover ring-2 ring-gray-700',
                    sizes[size],
                    className
                )}
            />
        );
    }

    return (
        <div
            className={cn(
                'rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br ring-2 ring-gray-700',
                sizes[size],
                colors[colorIndex],
                className
            )}
        >
            {initials}
        </div>
    );
}
