const { logger } = require('../utils/logger');
const db = require('../db');

/**
 * Save a signature for a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const saveSignature = async (req, res) => {
    try {
        const { documentId, signatureData, position } = req.body;
        
        // Validate request
        if (!documentId || !signatureData) {
            return res.status(400).json({
                success: false,
                message: 'Document ID and signature data are required'
            });
        }
        
        // Check if document exists
        const document = db.getDocumentById(documentId);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        // Save signature
        const signature = db.saveSignature(documentId, signatureData, position);
        
        res.status(201).json({
            success: true,
            message: 'Signature saved successfully',
            signature: {
                id: signature.id,
                document_id: signature.document_id,
                created_at: signature.created_at
            }
        });
    } catch (error) {
        logger.error(`Error in saveSignature: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to save signature',
            error: error.message
        });
    }
};

/**
 * Get signatures for a document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDocumentSignatures = async (req, res) => {
    try {
        const { documentId } = req.params;
        
        // Check if document exists
        const document = db.getDocumentById(documentId);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }
        
        // Get signatures
        const signatures = db.query(
            'SELECT id, document_id, created_at, position FROM signatures WHERE document_id = ?',
            [documentId]
        );
        
        res.json({
            success: true,
            count: signatures.length,
            signatures
        });
    } catch (error) {
        logger.error(`Error in getDocumentSignatures: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve signatures',
            error: error.message
        });
    }
};

module.exports = {
    saveSignature,
    getDocumentSignatures
}; 