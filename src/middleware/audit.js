const { AuditLog } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware to log user actions for audit purposes
 * @param {string} action - Description of the action being performed
 * @returns {Function} Express middleware function
 */
const auditLogger = (action) => {
  return async (req, res, next) => {
    // Store the original end method
    const originalEnd = res.end;
    
    // Override the end method to capture response data
    res.end = function(...args) {
      // Restore the original end method
      res.end = originalEnd;
      
      // Call the original end method
      res.end.apply(res, args);
      
      try {
        // Log the audit entry after response is sent
        process.nextTick(async () => {
          try {
            // Only log if user is authenticated
            if (req.user) {
              // Create audit log entry
              await AuditLog.create({
                userId: req.user.id,
                action,
                resource: getResourceInfo(req),
                details: {
                  method: req.method,
                  url: req.originalUrl,
                  ip: req.ip,
                  userAgent: req.headers['user-agent'],
                  statusCode: res.statusCode
                }
              });
            }
          } catch (error) {
            logger.error(`Error creating audit log: ${error.message}`, { stack: error.stack });
          }
        });
      } catch (error) {
        logger.error(`Error in audit logger: ${error.message}`, { stack: error.stack });
      }
    };
    
    next();
  };
};

/**
 * Get resource information from the request
 * @param {Object} req - Express request object
 * @returns {string} Resource information
 */
const getResourceInfo = (req) => {
  // Extract resource ID from URL parameters
  const resourceId = req.params.id;
  
  // Get resource type from URL path
  const path = req.path.split('/');
  const resourceType = path[2] || 'unknown';
  
  if (resourceId) {
    return `${resourceType}:${resourceId}`;
  }
  
  return resourceType;
};

/**
 * Helper function to determine action from request
 */
const getActionFromRequest = (req) => {
  const { method, path } = req;
  
  // Document actions
  if (path.includes('/documents')) {
    if (method === 'POST') return 'DOCUMENT_UPLOAD';
    if (method === 'GET' && path.includes('/download')) return 'DOCUMENT_DOWNLOAD';
    if (method === 'GET') return 'DOCUMENT_VIEW';
    if (method === 'PUT') return 'DOCUMENT_UPDATE';
    if (method === 'DELETE') return 'DOCUMENT_DELETE';
  }
  
  // Signature actions
  if (path.includes('/esign') || path.includes('/signatures')) {
    if (method === 'POST') return 'SIGNATURE_CREATE';
    if (method === 'GET') return 'SIGNATURE_VIEW';
  }
  
  // Signature request actions
  if (path.includes('/signature-requests')) {
    if (method === 'POST') return 'SIGNATURE_REQUEST_CREATE';
    if (method === 'PUT' && path.includes('/complete')) return 'SIGNATURE_REQUEST_COMPLETE';
    if (method === 'PUT' && path.includes('/reject')) return 'SIGNATURE_REQUEST_REJECT';
  }
  
  // Analysis actions
  if (path.includes('/analysis')) {
    if (method === 'POST') return 'ANALYSIS_CREATE';
    if (method === 'GET') return 'ANALYSIS_VIEW';
  }
  
  // User actions
  if (path.includes('/users')) {
    if (method === 'POST') return 'USER_CREATE';
    if (method === 'PUT') return 'USER_UPDATE';
    if (method === 'DELETE') return 'USER_DELETE';
  }
  
  // Auth actions
  if (path.includes('/auth')) {
    if (path.includes('/login')) return 'USER_LOGIN';
    if (path.includes('/logout')) return 'USER_LOGOUT';
  }
  
  return 'OTHER';
};

/**
 * Middleware to automatically determine and log action
 */
const autoAuditLogger = (req, res, next) => {
  const action = getActionFromRequest(req);
  return auditLogger(action)(req, res, next);
};

module.exports = {
  auditLogger,
  autoAuditLogger
}; 