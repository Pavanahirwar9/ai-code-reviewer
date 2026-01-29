// backend/app.js
/**
 * Express application configuration
 * Sets up middleware, routes, and error handling
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const session = require('express-session');
const path = require('path');

const errorMiddleware = require('./middleware/error.middleware');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const reviewRoutes = require('./routes/review.routes');
const githubRoutes = require('./routes/github.routes');
const userRoutes = require('./routes/user.routes');
const publicReviewRoutes = require('./routes/review-public.routes');

const app = express();

// Trust proxy (for deployment behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'https://ai-code-reviewer-600y.onrender.com',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Session configuration (using memory store for development)
// Note: For production, consider using MongoDB store with proper connection handling
app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        sameSite: 'lax',
    },
}));

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim()),
        },
    }));
}

// Static files (for uploaded files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'AI Code Reviewer API is running',
        version: '1.0.0',
        status: 'healthy',
        endpoints: {
            auth: '/api/auth',
            review: '/api/review',
            github: '/api/github',
            user: '/api/user'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Public API routes (no auth required)
app.use('/api/public/review', publicReviewRoutes);

// Auth routes (uses MongoDB database)
app.use('/api/auth', authRoutes);

// API routes (auth required - uses database)
app.use('/api/review', reviewRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/user', userRoutes);

// Root endpoint
app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'AI Code Review API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            review: '/api/review',
            github: '/api/github',
            user: '/api/user',
        },
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
    });
});

// Global error handler (must be last)
app.use(errorMiddleware);

module.exports = app;
