require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const { authRoutes, userRoutes, sessionRoutes, walletRoutes, transcriptionRoutes } = require('./routes');
const { errorHandler, notFound } = require('./middleware');
const { initializeSocketHandlers } = require('./socketHandlers');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per 15 minutes
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later'
    }
});

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging in development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Serve static files for testing
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'SkillVault API is running',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transcription', transcriptionRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to SkillVault API',
        version: '1.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                me: 'GET /api/auth/me',
                updateProfile: 'PUT /api/auth/me',
                changePassword: 'PUT /api/auth/password'
            },
            users: {
                search: 'GET /api/users/search',
                profile: 'GET /api/users/:id',
                skillOptions: 'GET /api/users/skills/options',
                addTeachingSkill: 'POST /api/users/skills/teaching',
                updateTeachingSkill: 'PUT /api/users/skills/teaching/:skillId',
                removeTeachingSkill: 'DELETE /api/users/skills/teaching/:skillId',
                addLearningInterest: 'POST /api/users/skills/learning',
                removeLearningInterest: 'DELETE /api/users/skills/learning/:interestId'
            },
            sessions: {
                book: 'POST /api/sessions',
                list: 'GET /api/sessions',
                get: 'GET /api/sessions/:id',
                confirm: 'PUT /api/sessions/:id/confirm',
                complete: 'PUT /api/sessions/:id/complete',
                cancel: 'PUT /api/sessions/:id/cancel',
                review: 'POST /api/sessions/:id/review'
            },
            wallet: {
                summary: 'GET /api/wallet',
                transactions: 'GET /api/wallet/transactions',
                transaction: 'GET /api/wallet/transactions/:id'
            }
        }
    });
});

// Handle 404
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server with Socket.IO
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? process.env.FRONTEND_URL
            : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Initialize socket handlers for WebRTC signaling
initializeSocketHandlers(io);

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏦 SkillVault API Server                                ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                            ║
║   Port: ${PORT}                                            ║
║   API: http://localhost:${PORT}/api                         ║
║   WebSocket: ws://localhost:${PORT}                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Close server & exit process
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

module.exports = { app, server, io };
