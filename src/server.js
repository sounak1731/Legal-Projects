require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const { initializeDatabase } = require('./db');

// Import routes
const testRoutes = require('./routes/test');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/test', testRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

// Initialize database and start server
const PORT = process.env.PORT || 4000;

// Function to start the server with proper error handling
const startServer = (port) => {
  return new Promise((resolve, reject) => {
    try {
      // Check if port is in use first
      const net = require('net');
      const tester = net.createServer()
        .once('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            logger.warn(`Port ${port} is in use, trying port ${port + 1}`);
            // Try the next port
            resolve(startServer(port + 1));
          } else {
            reject(err);
          }
        })
        .once('listening', () => {
          tester.close();
          
          // Start the actual server
          const server = app.listen(port, () => {
            logger.info(`Server running on port ${port}`);
            logger.info(`Environment: ${process.env.NODE_ENV}`);
            resolve(server);
          }).on('error', (err) => {
            reject(err);
          });
        })
        .listen(port);
    } catch (error) {
      reject(error);
    }
  });
};

// Only start the server if this file is run directly
if (require.main === module) {
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
    // Keep the process alive but log the error
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    // Keep the process alive but log the error
  });
  
  // Initialize database and start server with proper error handling
  initializeDatabase()
    .then(() => {
      return startServer(PORT);
    })
    .catch(error => {
      logger.error('Failed to initialize database or start server:', error.message);
      
      // Start server anyway with in-memory database
      logger.info('Starting server with failsafe in-memory database');
      startServer(PORT).catch(err => {
        logger.error('Fatal error starting server:', err.message);
      });
    });
}

// Export app for testing
module.exports = app; 