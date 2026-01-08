const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware');
const { transcribeAudio } = require('../controllers/transcriptionController');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for audio file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `audio-${uniqueSuffix}${ext}`);
    }
});

// File filter to only accept audio files
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'audio/webm',
        'audio/mp4',
        'audio/wav',
        'audio/mpeg',
        'audio/ogg',
        'audio/x-m4a',
        'audio/mp3'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
    }
};

// Configure multer with 25MB limit (Whisper API limit)
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB in bytes
    }
});

// Error handling middleware for multer errors
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 25MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: `Upload error: ${err.message}`
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    next();
};

/**
 * @route   POST /api/transcription
 * @desc    Upload audio file and get transcription
 * @access  Private
 */
router.post(
    '/',
    auth,
    upload.single('audio'),
    handleMulterError,
    transcribeAudio
);

module.exports = router;
