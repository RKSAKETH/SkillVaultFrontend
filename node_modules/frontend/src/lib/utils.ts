import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDateTime(date: string | Date): string {
    return `${formatDate(date)} at ${formatTime(date)}`;
}

export function formatCredits(amount: number | undefined | null): string {
    return (amount || 0).toFixed(1);
}

export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
        return `${hours} hr`;
    }
    return `${hours} hr ${remainingMinutes} min`;
}

export function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        in_progress: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        completed: 'bg-green-500/20 text-green-400 border-green-500/30',
        cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
        disputed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export function getTransactionTypeColor(type: string): string {
    const colors: Record<string, string> = {
        credit: 'text-green-400',
        debit: 'text-red-400',
        initial: 'text-blue-400',
        bonus: 'text-purple-400',
        refund: 'text-yellow-400',
    };
    return colors[type] || 'text-gray-400';
}

export function getTransactionSign(type: string): string {
    return ['credit', 'initial', 'bonus', 'refund'].includes(type) ? '+' : '-';
}
