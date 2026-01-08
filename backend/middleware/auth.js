const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const auth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated'
            });
        }

        // Attach user to request
        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

/**
 * Optional auth - doesn't fail if no token, but attaches user if present
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (user && user.isActive) {
            req.user = user;
        }

        next();
    } catch (error) {
        // Silently continue without user
        next();
    }
};

/**
 * Admin-only middleware
 * Requires user to be authenticated and have admin role
 */
const adminOnly = (req, res, next) => {
    // Check if user exists (should be set by protect middleware)
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Admin privileges required.'
        });
    }

    next();
};

module.exports = { 
    auth, 
    optionalAuth, 
    adminOnly,
    protect: auth // Alias for consistency with routes
};
