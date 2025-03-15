const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');
const db = require('../db');
const documentAnalyzer = require('../services/documentAnalyzer');

/**
 * Upload a new document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadDocument = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }

        logger.info(`File uploaded: ${req.file.originalname}`);

        // Create document record
        const document = db.insertDocument({
            name: req.file.originalname,
            file_path: req.file.path,
            file_size: req.file.size,
            file_type: req.file.mimetype
        });

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            document: {
                id: document.id,
                name: document.name,
                upload_date: document.upload_date,
                file_size: document.file_size,
                file_type: document.file_type,
                analysis_status: 'pending'
            }
        });

    } catch (error) {
        logger.error(`Error in uploadDocument: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to upload document', 
            error: error.message 
        });
    }
};

/**
 * Get all documents
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDocuments = async (req, res) => {
    try {
        const documents = db.getDocuments();
        
        // Format documents for response
        const formattedDocuments = documents.map(doc => ({
            id: doc.id,
            name: doc.name,
            upload_date: doc.upload_date,
            analysis_status: doc.analysis_status,
            document_type: doc.document_type || 'Unknown',
            file_size: doc.file_size
        }));
        
        res.json({
            success: true,
            count: formattedDocuments.length,
            documents: formattedDocuments
        });
    } catch (error) {
        logger.error(`Error in getDocuments: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve documents', 
            error: error.message 
        });
    }
};

/**
 * Get document by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDocumentById = async (req, res) => {
    try {
        const { id } = req.params;
        const document = db.getDocumentById(id);
        
        if (!document) {
            return res.status(404).json({ 
                success: false, 
                message: 'Document not found' 
            });
        }
        
        res.json({
            success: true,
            document: {
                id: document.id,
                name: document.name,
                upload_date: document.upload_date,
                analysis_status: document.analysis_status,
                document_type: document.document_type || 'Unknown',
                file_size: document.file_size,
                analysis_results: document.analysis_results ? JSON.parse(document.analysis_results) : null
            }
        });
    } catch (error) {
        logger.error(`Error in getDocumentById: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve document', 
            error: error.message 
        });
    }
};

/**
 * Delete document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = db.getDocumentById(id);
        
        if (!document) {
            return res.status(404).json({ 
                success: false, 
                message: 'Document not found' 
            });
        }
        
        // Delete the file
        await fs.unlink(document.file_path).catch(err => {
            logger.warn(`Failed to delete file ${document.file_path}: ${err.message}`);
        });
        
        // Delete from database
        db.deleteDocument(id);
        
        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        logger.error(`Error in deleteDocument: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete document', 
            error: error.message 
        });
    }
};

/**
 * Analyze document
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const analyzeDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = db.getDocumentById(id);
        
        if (!document) {
            return res.status(404).json({ 
                success: false, 
                message: 'Document not found' 
            });
        }
        
        // Mark as processing
        db.updateDocumentAnalysis(id, 'processing', null);
        
        // Perform analysis
        const analysisResults = await documentAnalyzer.analyzeDocument(document.file_path);
        
        // Update document with results
        db.updateDocumentAnalysis(id, 'completed', analysisResults);
        
        res.json({
            success: true,
            message: 'Document analysis completed',
            analysis: analysisResults
        });
    } catch (error) {
        logger.error(`Error in analyzeDocument: ${error.message}`);
        
        // Mark as failed
        try {
            db.updateDocumentAnalysis(req.params.id, 'failed', { error: error.message });
        } catch (dbError) {
            logger.error(`Failed to update document status: ${dbError.message}`);
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Document analysis failed', 
            error: error.message 
        });
    }
};

module.exports = {
    uploadDocument,
    getDocuments,
    getDocumentById,
    deleteDocument,
    analyzeDocument
}; 