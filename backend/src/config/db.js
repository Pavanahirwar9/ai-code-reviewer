// backend/config/db.js
/**
 * MongoDB database connection configuration
 * Uses Mongoose to connect to MongoDB
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Mongoose 6+ no longer needs these options:
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
        });

        logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
        logger.info(`📁 Database: ${conn.connection.name}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

    } catch (error) {
        logger.error(`❌ MongoDB connection failed: ${error.message}`);
        logger.warn('⚠️  Continuing without database - some features may not work');
        // Don't crash the app, continue without database
        return null;
    }
};

module.exports = connectDB;

