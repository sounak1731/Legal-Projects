require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const initializeDatabase = require('./config/init-db');
const logger = require('./config/logger');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Initialize database
initializeDatabase()
  .then(() => {
    logger.info('Database initialized successfully');
  })
  .catch((error) => {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  });

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/e-sign', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/e-sign.html'));
});

app.get('/dd-assistant', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dd-assistant.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
}); 