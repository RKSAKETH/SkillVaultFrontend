'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSecureRecordingReturn {
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    isRecording: boolean;
    isProcessing: boolean;
    transcriptionText: string;
    error: string | null;
}

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

/**
 * Custom hook for speech-to-text using browser's native Web Speech API
 * This is completely FREE and requires no API key!
 */
export function useSecureRecording(): UseSecureRecordingReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcriptionText, setTranscriptionText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<any>(null);

    /**
     * Initialize speech recognition
     */
    const initSpeechRecognition = useCallback(() => {
        // Check for browser support
        const SpeechRecognition = (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            throw new Error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Stop after user stops speaking
        recognition.interimResults = true; // Show results as user speaks
        recognition.lang = 'en-US'; // Set language

        return recognition;
    }, []);

    /**
     * Start recording/listening
     */
    const startRecording = useCallback(async (): Promise<void> => {
        setError(null);
        setTranscriptionText('');
        setIsProcessing(false);

        try {
            const recognition = initSpeechRecognition();
            recognitionRef.current = recognition;

            // Handle results
            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                // Show interim results while speaking
                if (interimTranscript) {
                    setTranscriptionText(interimTranscript);
                }

                // Set final result
                if (finalTranscript) {
                    setTranscriptionText(finalTranscript);
                }
            };

            // Handle end of speech
            recognition.onend = () => {
                setIsRecording(false);
                setIsProcessing(false);
            };

            // Handle errors
            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error:', event.error);

                switch (event.error) {
                    case 'not-allowed':
                    case 'permission-denied':
                        setError('Microphone access denied. Please allow microphone permissions in your browser settings.');
                        break;
                    case 'no-speech':
                        setError('No speech detected. Please try again and speak clearly.');
                        break;
                    case 'audio-capture':
                        setError('No microphone found. Please connect a microphone and try again.');
                        break;
                    case 'network':
                        setError('Network error. Please check your internet connection.');
                        break;
                    case 'aborted':
                        // User stopped - not an error
                        break;
                    default:
                        setError(`Speech recognition error: ${event.error}`);
                }

                setIsRecording(false);
                setIsProcessing(false);
            };

            // Start listening
            recognition.start();
            setIsRecording(true);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start speech recognition';
            setError(errorMessage);
            setIsRecording(false);
            console.error('Start recording error:', err);
        }
    }, [initSpeechRecognition]);

    /**
     * Stop recording/listening
     */
    const stopRecording = useCallback((): void => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsRecording(false);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    return {
        startRecording,
        stopRecording,
        isRecording,
        isProcessing,
        transcriptionText,
        error
    };
}

export default useSecureRecording;
