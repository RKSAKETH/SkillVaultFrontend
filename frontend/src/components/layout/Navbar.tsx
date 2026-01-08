'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button, Avatar } from '@/components/ui';
import {
    Wallet,
    Users,
    Calendar,
    Home,
    LogOut,
    Menu,
    X,
    GraduationCap,
    Sparkles
} from 'lucide-react';
import { cn, formatCredits } from '@/lib/utils';

export function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const navLinks = isAuthenticated ? [
        { href: '/dashboard', label: 'Dashboard', icon: Home },
        { href: '/marketplace', label: 'Marketplace', icon: Users },
        { href: '/sessions', label: 'Sessions', icon: Calendar },
        { href: '/wallet', label: 'Wallet', icon: Wallet },
    ] : [];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                            SkillVault
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-violet-500/20 text-violet-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated && user ? (
                            <>
                                {/* Credit Balance */}
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    <span className="text-amber-400 font-semibold">
                                        {formatCredits(user.creditBalance)} Credits
                                    </span>
                                </div>

                                {/* Profile */}
                                <Link href="/profile" className="flex items-center gap-3">
                                    <Avatar
                                        src={user.avatar}
                                        firstName={user.firstName}
                                        lastName={user.lastName}
                                        size="sm"
                                    />
                                    <span className="hidden lg:block text-sm font-medium text-white">
                                        {user.firstName}
                                    </span>
                                </Link>

                                {/* Logout */}
                                <button
                                    onClick={logout}
                                    className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link href="/login">
                                    <Button variant="ghost" size="sm">
                                        Log in
                                    </Button>
                                </Link>
                                <Link href="/register">
                                    <Button size="sm">
                                        Sign up
                                    </Button>
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 py-4">
                    {isAuthenticated && user && (
                        <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 font-semibold">
                                {formatCredits(user.creditBalance)} Credits
                            </span>
                        </div>
                    )}
                    <div className="space-y-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-violet-500/20 text-violet-400'
                                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
}
