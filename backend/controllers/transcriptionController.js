const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<any>}
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Only retry on 500 errors (server errors)
            const isServerError = error.status === 500 ||
                error.code === 'ECONNRESET' ||
                error.code === 'ETIMEDOUT' ||
                error.message?.includes('500');

            if (!isServerError || attempt === maxRetries) {
                throw error;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Gemini API attempt ${attempt} failed. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
};

/**
 * Cleanup uploaded file
 * @param {string} filePath - Path to the file to delete
 */
const cleanupFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Failed to cleanup file ${filePath}:`, err.message);
        } else {
            console.log(`Cleaned up temporary file: ${filePath}`);
        }
    });
};

/**
 * Convert file to base64 for Gemini API
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<{data: string, mimeType: string}>}
 */
const fileToGenerativePart = async (filePath, mimeType) => {
    const fileData = fs.readFileSync(filePath);
    return {
        inlineData: {
            data: fileData.toString('base64'),
            mimeType: mimeType
        }
    };
};

/**
 * @desc    Transcribe audio file using Google Gemini
 * @route   POST /api/transcription
 * @access  Private
 */
const transcribeAudio = async (req, res) => {
    // Ensure file was uploaded
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: 'No audio file provided'
        });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype || 'audio/webm';

    try {
        // Check if Gemini API key is configured
        if (!process.env.GEMINI_API_KEY) {
            cleanupFile(filePath);
            return res.status(500).json({
                success: false,
                error: 'Gemini API key is not configured'
            });
        }

        // Convert audio file to base64
        const audioPart = await fileToGenerativePart(filePath, mimeType);

        // Use Gemini 1.5 Flash Latest for audio transcription (supports audio input)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

        // Call Gemini API with retry mechanism
        const transcription = await retryWithBackoff(async () => {
            const result = await model.generateContent([
                {
                    text: 'Please transcribe the following audio accurately. Only provide the transcription text, nothing else. Do not add any introductory text or explanations.'
                },
                audioPart
            ]);

            const response = await result.response;
            return response.text();
        }, 3, 1000);

        // Cleanup the uploaded file immediately after processing
        cleanupFile(filePath);

        // Return successful transcription
        return res.status(200).json({
            success: true,
            data: {
                transcription: transcription.trim()
            }
        });

    } catch (error) {
        // Always cleanup the file, even on error
        cleanupFile(filePath);

        // Detailed error logging for debugging
        console.error('=== Transcription Error ===');
        console.error('Error message:', error.message);
        console.error('Error status:', error.status);
        console.error('Error code:', error.code);
        console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

        // Handle specific Gemini errors
        if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key') || error.message?.includes('apiKey')) {
            return res.status(500).json({
                success: false,
                error: 'Invalid Gemini API key. Please check your GEMINI_API_KEY in .env'
            });
        }

        if (error.message?.includes('RATE_LIMIT') || error.status === 429) {
            return res.status(429).json({
                success: false,
                error: 'Gemini rate limit exceeded. Please try again later.'
            });
        }

        if (error.code === 'ENOENT') {
            return res.status(400).json({
                success: false,
                error: 'Audio file not found or corrupted'
            });
        }

        // Generic error response - include actual error message for debugging
        return res.status(500).json({
            success: false,
            error: `Transcription failed: ${error.message || 'Unknown error. Check backend console for details.'}`
        });
    }
};

module.exports = {
    transcribeAudio
};
