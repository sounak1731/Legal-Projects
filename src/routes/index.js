const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../utils/db');
const { singleFileUpload, multipleFilesUpload, cleanupTempFiles } = require('../middleware/upload');
const config = require('../config');
const { logger } = require('../utils/logger');
const testRoutes = require('./test');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: config.env
    });
});

// ======== DOCUMENT UPLOAD ENDPOINTS ========

// Single document upload endpoint
router.post('/documents/upload', singleFileUpload, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const db = getDb();
        
        // Save document in database
        const result = await db.run(`
            INSERT INTO documents 
            (name, original_name, mime_type, size, path)
            VALUES (?, ?, ?, ?, ?)
        `, [
            req.file.filename,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            req.file.path
        ]);

        // Log successful upload
        logger.info(`Document uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
        
        // Return success response
        res.status(200).json({
            success: true,
            documentId: result.lastID,
            file: {
                name: req.file.originalname,
                size: req.file.size,
                type: req.file.mimetype,
                url: `/uploads/${path.basename(req.file.path)}`
            }
        });
    } catch (error) {
        logger.error('Document upload failed:', error);
        res.status(500).json({
            error: 'File upload failed',
            message: error.message
        });
    }
});

// Multiple documents upload endpoint
router.post('/documents/upload-multiple', multipleFilesUpload, async (req, res) => {
    try {
        const db = getDb();
        const uploadedDocs = [];
        
        // Save all documents in database
        for (const file of req.files) {
            const result = await db.run(`
                INSERT INTO documents 
                (name, original_name, mime_type, size, path)
                VALUES (?, ?, ?, ?, ?)
            `, [
                file.filename,
                file.originalname,
                file.mimetype,
                file.size,
                file.path
            ]);
            
            uploadedDocs.push({
                documentId: result.lastID,
                file: {
                    name: file.originalname,
                    size: file.size,
                    type: file.mimetype,
                    url: `/uploads/${path.basename(file.path)}`
                }
            });
        }
        
        // Log successful upload
        logger.info(`${uploadedDocs.length} documents uploaded successfully`);
        
        // Return success response
        res.status(200).json({
            success: true,
            documents: uploadedDocs
        });
    } catch (error) {
        logger.error('Multiple document upload failed:', error);
        res.status(500).json({
            error: 'File upload failed',
            message: error.message
        });
    }
});

// ======== DOCUMENT MANAGEMENT ENDPOINTS ========

// Get all documents
router.get('/documents', async (req, res) => {
    try {
        const db = getDb();
        const documents = await db.all('SELECT * FROM documents ORDER BY upload_date DESC');
        
        res.json({
            success: true,
            documents: documents.map(doc => ({
                id: doc.id,
                name: doc.original_name,
                size: doc.size,
                type: doc.mime_type,
                uploadDate: doc.upload_date,
                url: `/uploads/${path.basename(doc.path)}`
            }))
        });
    } catch (error) {
        logger.error('Failed to get documents:', error);
        res.status(500).json({
            error: 'Failed to retrieve documents',
            message: error.message
        });
    }
});

// Get a single document
router.get('/documents/:id', async (req, res) => {
    try {
        const db = getDb();
        const document = await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
        
        if (!document) {
            return res.status(404).json({
                error: 'Document not found'
            });
        }
        
        res.json({
            success: true,
            document: {
                id: document.id,
                name: document.original_name,
                size: document.size,
                type: document.mime_type,
                uploadDate: document.upload_date,
                url: `/uploads/${path.basename(document.path)}`
            }
        });
    } catch (error) {
        logger.error(`Failed to get document ${req.params.id}:`, error);
        res.status(500).json({
            error: 'Failed to retrieve document',
            message: error.message
        });
    }
});

// Delete a document
router.delete('/documents/:id', async (req, res) => {
    try {
        const db = getDb();
        
        // Get document info
        const document = await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
        
        if (!document) {
            return res.status(404).json({
                error: 'Document not found'
            });
        }
        
        // Delete document file
        if (fs.existsSync(document.path)) {
            fs.unlinkSync(document.path);
        }
        
        // Delete from database
        await db.run('DELETE FROM documents WHERE id = ?', [req.params.id]);
        
        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        logger.error(`Failed to delete document ${req.params.id}:`, error);
        res.status(500).json({
            error: 'Failed to delete document',
            message: error.message
        });
    }
});

// ======== DOCUMENT ANALYSIS ENDPOINTS ========

// Analyze document
router.post('/documents/:id/analyze', async (req, res) => {
    try {
        const db = getDb();
        const documentId = req.params.id;
        
        // Check if document exists
        const document = await db.get('SELECT * FROM documents WHERE id = ?', [documentId]);
        
        if (!document) {
            return res.status(404).json({
                error: 'Document not found'
            });
        }
        
        // Start analysis (mock implementation)
        res.json({
            success: true,
            message: 'Document analysis started',
            status: 'processing',
            documentId
        });
        
    } catch (error) {
        logger.error(`Failed to analyze document ${req.params.id}:`, error);
        res.status(500).json({
            error: 'Failed to analyze document',
            message: error.message
        });
    }
});

// ======== E-SIGNATURE ENDPOINTS ========

// Save signature
router.post('/signatures', async (req, res) => {
    try {
        const { documentId, signatureData, position } = req.body;
        
        if (!documentId || !signatureData) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }
        
        const db = getDb();
        
        // Check if document exists
        const document = await db.get('SELECT id FROM documents WHERE id = ?', [documentId]);
        if (!document) {
            return res.status(404).json({
                error: 'Document not found'
            });
        }
        
        // Save signature
        const result = await db.run(`
            INSERT INTO signatures (document_id, signature_data, position)
            VALUES (?, ?, ?)
        `, [documentId, signatureData, position ? JSON.stringify(position) : null]);
        
        res.json({
            success: true,
            signatureId: result.lastID
        });
    } catch (error) {
        logger.error('Failed to save signature:', error);
        res.status(500).json({
            error: 'Failed to save signature',
            message: error.message
        });
    }
});

// Get signatures for a document
router.get('/documents/:id/signatures', async (req, res) => {
    try {
        const db = getDb();
        const documentId = req.params.id;
        
        // Check if document exists
        const document = await db.get('SELECT id FROM documents WHERE id = ?', [documentId]);
        if (!document) {
            return res.status(404).json({
                error: 'Document not found'
            });
        }
        
        // Get signatures
        const signatures = await db.all(
            'SELECT * FROM signatures WHERE document_id = ? ORDER BY created_at DESC', 
            [documentId]
        );
        
        res.json({
            success: true,
            signatures: signatures.map(sig => ({
                id: sig.id,
                documentId: sig.document_id,
                position: sig.position ? JSON.parse(sig.position) : null,
                createdAt: sig.created_at,
                signatureData: sig.signature_data
            }))
        });
    } catch (error) {
        logger.error(`Failed to get signatures for document ${req.params.id}:`, error);
        res.status(500).json({
            error: 'Failed to retrieve signatures',
            message: error.message
        });
    }
});

// ======== DOCUMENT COMPARISON ENDPOINTS ========

// Compare two documents
router.post('/documents/compare', async (req, res) => {
    try {
        const { documentId1, documentId2 } = req.body;
        
        if (!documentId1 || !documentId2) {
            return res.status(400).json({
                error: 'Missing document IDs for comparison'
            });
        }
        
        const db = getDb();
        
        // Check if documents exist
        const doc1 = await db.get('SELECT * FROM documents WHERE id = ?', [documentId1]);
        const doc2 = await db.get('SELECT * FROM documents WHERE id = ?', [documentId2]);
        
        if (!doc1 || !doc2) {
            return res.status(404).json({
                error: 'One or both documents not found'
            });
        }
        
        // Mock comparison (actual implementation would require document processing library)
        res.json({
            success: true,
            message: 'Document comparison started',
            status: 'processing',
            comparisonId: Date.now(),
            documents: [
                {
                    id: doc1.id,
                    name: doc1.original_name
                },
                {
                    id: doc2.id,
                    name: doc2.original_name
                }
            ]
        });
    } catch (error) {
        logger.error('Failed to compare documents:', error);
        res.status(500).json({
            error: 'Failed to compare documents',
            message: error.message
        });
    }
});

// Serve static files (e.g., uploaded documents)
router.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Mount test routes
router.use('/test', testRoutes);

module.exports = router; 