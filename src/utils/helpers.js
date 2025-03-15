const path = require('path');
const crypto = require('crypto');

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size (e.g., "1.5 MB")
 */
function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate a secure random string
 * @param {number} length - Length of the string
 * @returns {string} - Random string
 */
function generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate file type against allowed types
 * @param {string} filename - Name of the file
 * @param {string[]} allowedTypes - Array of allowed file extensions
 * @returns {boolean} - Whether the file type is allowed
 */
function isValidFileType(filename, allowedTypes) {
    const ext = path.extname(filename).toLowerCase().substring(1);
    return allowedTypes.includes(ext);
}

/**
 * Sanitize filename to prevent directory traversal
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
    return path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Generate a unique filename with timestamp
 * @param {string} originalFilename - Original filename
 * @returns {string} - Unique filename
 */
function generateUniqueFilename(originalFilename) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(originalFilename);
    const base = path.basename(originalFilename, ext);
    
    return `${sanitizeFilename(base)}_${timestamp}_${random}${ext}`;
}

/**
 * Parse boolean environment variable
 * @param {string} value - Environment variable value
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean} - Parsed boolean value
 */
function parseBooleanEnv(value, defaultValue = false) {
    if (typeof value === 'undefined' || value === null) {
        return defaultValue;
    }
    return ['true', '1', 'yes'].includes(value.toLowerCase());
}

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} unsafe - Unsafe string
 * @returns {string} - Escaped string
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date
 */
function formatDate(date, options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
}) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', options).format(d);
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, deepClone(value)])
        );
    }
    throw new Error(`Unable to clone object of type ${typeof obj}`);
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

module.exports = {
    formatFileSize,
    generateRandomString,
    isValidFileType,
    sanitizeFilename,
    generateUniqueFilename,
    parseBooleanEnv,
    isValidEmail,
    escapeHtml,
    formatDate,
    deepClone,
    debounce,
    throttle
}; 