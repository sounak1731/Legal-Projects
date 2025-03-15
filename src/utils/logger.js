const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log formats
const formats = {
  console: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
      info => `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  file: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  )
};

// Define transports
const transports = [
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: formats.console
  })
];

// Add file transport if LOG_FILE is set
if (process.env.LOG_FILE) {
  transports.push(
    new winston.transports.File({
      filename: process.env.LOG_FILE || path.join(logDir, 'app.log'),
      level: process.env.LOG_LEVEL || 'info',
      format: formats.file,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
  exitOnError: false
});

// Capture uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(error.stack);
  
  // In production, you might want to exit the process after logging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Capture unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Promise Rejection: ${reason}`);
  
  // In production, you might want to exit the process after logging
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

module.exports = logger; 