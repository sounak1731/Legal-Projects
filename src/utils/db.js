const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { logger } = require('./logger');

let db = null;

/**
 * Initialize the database connection and schema
 */
async function initDatabase() {
    try {
        // Ensure database directory exists
        const dbDir = path.dirname(config.database.path);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Open database connection
        db = await open({
            filename: config.database.path,
            driver: sqlite3.Database
        });

        logger.info('Connected to SQLite database');

        // Enable foreign keys
        await db.run('PRAGMA foreign_keys = ON');

        // Initialize schema
        await initializeSchema();

        return db;
    } catch (error) {
        logger.error('Database initialization failed:', error);
        throw error;
    }
}

/**
 * Initialize the database schema
 */
async function initializeSchema() {
    try {
        // Create documents table
        await db.run(`
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                original_name TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size INTEGER NOT NULL,
                path TEXT NOT NULL,
                upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_id INTEGER,
                metadata TEXT
            )
        `);
        
        // Create analysis_results table
        await db.run(`
            CREATE TABLE IF NOT EXISTS analysis_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                risk_score REAL,
                risk_level TEXT,
                summary TEXT,
                recommendations TEXT,
                metadata TEXT,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        `);
        
        // Create document_entities table
        await db.run(`
            CREATE TABLE IF NOT EXISTS document_entities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                entity_type TEXT NOT NULL,
                entity_value TEXT NOT NULL,
                confidence REAL,
                metadata TEXT,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        `);
        
        // Create signatures table
        await db.run(`
            CREATE TABLE IF NOT EXISTS signatures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                signature_data TEXT NOT NULL,
                position TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_id INTEGER,
                user_email TEXT,
                user_name TEXT,
                status TEXT DEFAULT 'pending',
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        `);
        
        // Create document comparisons table
        await db.run(`
            CREATE TABLE IF NOT EXISTS document_comparisons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document1_id INTEGER NOT NULL,
                document2_id INTEGER NOT NULL,
                comparison_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                diff_data TEXT,
                status TEXT DEFAULT 'pending',
                result_path TEXT,
                FOREIGN KEY (document1_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (document2_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        `);
        
        // Create document edits table
        await db.run(`
            CREATE TABLE IF NOT EXISTS document_edits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                edit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                edit_type TEXT NOT NULL,
                edit_data TEXT,
                edit_by TEXT,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        `);
        
        // Create document versions table instead of using parent_id in documents
        await db.run(`
            CREATE TABLE IF NOT EXISTS document_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_id INTEGER NOT NULL,
                version_id INTEGER NOT NULL,
                version_number INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (original_id) REFERENCES documents(id) ON DELETE CASCADE,
                FOREIGN KEY (version_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        `);
        
        logger.info('Database schema initialized successfully');
    } catch (error) {
        logger.error('Schema initialization failed:', error);
        throw error;
    }
}

/**
 * Get the database instance
 * @returns {Object} The database instance
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Close the database connection
 */
async function closeDatabase() {
    try {
        if (db) {
            await db.close();
            db = null;
            logger.info('Database connection closed');
        }
    } catch (error) {
        logger.error('Error closing database:', error);
        throw error;
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    try {
        await closeDatabase();
        process.exit(0);
    } catch (error) {
        logger.error('Error during database cleanup:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    try {
        await closeDatabase();
        process.exit(0);
    } catch (error) {
        logger.error('Error during database cleanup:', error);
        process.exit(1);
    }
});

// Export database functions
module.exports = {
    initDatabase,
    getDb,
    closeDatabase
}; 