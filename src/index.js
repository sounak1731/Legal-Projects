const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const config = require('./config');
const { logger } = require('./utils/logger');
const { initDatabase } = require('./utils/db');
const routes = require('./routes');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "http:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    }
}));

// CORS setup
app.use(cors({
    origin: config.server.corsOrigins.includes('*') ? '*' : config.server.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Middleware setup
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Setup routes
const apiRoutes = require('./routes/index');
app.use('/api', apiRoutes);
app.use('/', require('./routes/pages'));

// Page routes
app.get('/legal-dd', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/legal-dd.html'));
});

app.get('/e-sign', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/e-sign.html'));
});

app.get('/user-guide', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/user-guide.html'));
});

// SPA fallback for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
    // Handle specific error types
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON' });
    }
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Default error response
    res.status(500).json({ 
        error: config.env === 'development' ? err.message : 'Internal server error'
    });
});

// Start server function
async function startServer() {
    try {
        // Initialize database
        await initDatabase();
        
        // Try available ports
        const ports = Array.isArray(config.server.ports) ? config.server.ports : [3000, 3001, 3002, 3003];
        
        // Try each port in sequence
        for (const port of ports) {
            try {
                const server = app.listen(port, () => {
                    logger.info(`Server running on port ${port} in ${config.env || 'development'} mode`);
                    
                    // Handle graceful shutdown
                    process.on('SIGTERM', () => {
                        logger.info('SIGTERM received. Shutting down gracefully...');
                        server.close(() => {
                            logger.info('Server closed');
                            process.exit(0);
                        });
                    });
                    
                    process.on('SIGINT', () => {
                        logger.info('SIGINT received. Shutting down gracefully...');
                        server.close(() => {
                            logger.info('Server closed');
                            process.exit(0);
                        });
                    });
                });
                
                server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        logger.warn(`Port ${port} is already in use`);
                        server.close();
                    } else {
                        logger.error('Server error:', err);
                        process.exit(1);
                    }
                });
                
                return; // Server started successfully
            } catch (err) {
                if (err.code === 'EADDRINUSE') {
                    logger.warn(`Port ${port} is already in use, trying next port`);
                    continue;
                }
                throw err;
            }
        }
        
        throw new Error('All ports are in use');
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
}

// Start the server
startServer(); 