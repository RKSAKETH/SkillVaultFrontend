'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleAnimationEnd = () => {
        if (!isOpen) {
            setIsVisible(false);
        }
    };

    if (!isVisible && !isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div
            className={cn(
                'fixed inset-0 z-50 flex items-center justify-center p-4',
                isOpen ? 'animate-fadeIn' : 'animate-fadeOut'
            )}
            onAnimationEnd={handleAnimationEnd}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={cn(
                    'relative w-full bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl',
                    sizes[size],
                    isOpen ? 'animate-slideIn' : 'animate-slideOut'
                )}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                        <h2 className="text-xl font-semibold text-white">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
