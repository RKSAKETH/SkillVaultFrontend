// User types
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    avatar: string | null;
    bio: string;
    creditBalance: number;
    teachingSkills: TeachingSkill[];
    learningInterests: LearningInterest[];
    stats: UserStats;
    availability?: Availability;
    createdAt: string;
}

export interface TeachingSkill {
    _id: string;
    name: string;
    category: string;
    proficiency: string;
    description?: string;
    hourlyRate: number;
}

export interface LearningInterest {
    _id: string;
    name: string;
    category: string;
}

export interface UserStats {
    totalSessionsTaught: number;
    totalSessionsLearned: number;
    totalHoursTaught: number;
    totalHoursLearned: number;
    averageRating: number;
    totalRatings: number;
}

export interface Availability {
    timezone: string;
    weeklySchedule: Record<string, { start: string; end: string }[]>;
}

// Session types
export interface Session {
    _id: string;
    tutor: User | string;
    student: User | string;
    skill: {
        name: string;
        category: string;
    };
    scheduledAt: string;
    duration: number;
    creditCost: number;
    status: SessionStatus;
    notes?: string;
    meetingDetails?: {
        type: 'video' | 'in-person' | 'chat';
        link?: string;
        location?: string;
    };
    review?: {
        rating: number;
        comment?: string;
        createdAt: string;
    };
    cancellation?: {
        cancelledBy: string;
        reason?: string;
        cancelledAt: string;
        refunded: boolean;
    };
    createdAt: string;
    updatedAt: string;
}

export type SessionStatus =
    | 'pending'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'disputed';

// Transaction types
export interface Transaction {
    _id: string;
    transactionId: string;
    user: string;
    counterparty?: User;
    session?: Session;
    type: TransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    status: TransactionStatus;
    description: string;
    createdAt: string;
}

export type TransactionType = 'credit' | 'debit' | 'initial' | 'refund' | 'bonus';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

// Wallet types
export interface WalletSummary {
    currentBalance: number;
    totalEarned: number;
    totalSpent: number;
    transactionCounts: Record<string, { total: number; count: number }>;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    details?: { field: string; message: string }[];
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// Form types
export interface LoginForm {
    email: string;
    password: string;
}

export interface RegisterForm {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

export interface BookSessionForm {
    tutorId: string;
    skillName: string;
    skillCategory: string;
    scheduledAt: string;
    duration: number;
    notes?: string;
    meetingType?: 'video' | 'in-person' | 'chat';
}

export interface AddSkillForm {
    name: string;
    category: string;
    proficiency: string;
    description?: string;
    hourlyRate?: number;
}

// Constants
export const SKILL_CATEGORIES = [
    'Programming',
    'Mathematics',
    'Science',
    'Languages',
    'Music',
    'Art & Design',
    'Business',
    'Writing',
    'Test Prep',
    'Other'
] as const;

export const PROFICIENCY_LEVELS = [
    'Beginner',
    'Intermediate',
    'Advanced',
    'Expert'
] as const;

export const SESSION_DURATIONS = [
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' }
] as const;
