const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticateUser } = require('../middleware/auth');
const { User, Document, AnalysisResult, Signature, SignatureRequest } = require('../models');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Set up multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads');
const tempDir = path.join(uploadDir, 'temp');

// Ensure upload directories exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.floor(Math.random() * 1000000000);
    const extension = path.extname(file.originalname);
    cb(null, `${timestamp}-${randomString}${extension}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Direct document upload endpoint without authentication
router.post('/upload-document', upload.single('document'), async (req, res) => {
  try {
    logger.info('Test document upload accessed');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }
    
    // Log file information
    logger.info(`File uploaded: ${req.file.originalname}, Size: ${req.file.size} bytes`);

    // Find admin user
    const admin = await User.findOne({ where: { email: 'admin@legalplatform.com' } });
    
    if (!admin) {
      throw new Error('Admin user not found');
    }

    // Create document record in database
    const document = await Document.create({
      id: uuidv4(),
      originalName: req.file.originalname,
      name: req.file.originalname,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
      category: 'Other',
      status: 'uploaded',
      description: '',
      tags: [],
      metadata: {},
      uploadedBy: admin.id,
      version: 1
    });
    
    // Return success response with file information
    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        id: document.id,
        originalName: document.originalName,
        name: document.name,
        path: document.path,
        size: document.size,
        mimeType: document.mimeType
      }
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
});

// Compare documents without authentication
router.post('/compare-documents', upload.array('documents', 2), async (req, res) => {
  try {
    logger.info('Test document comparison accessed');
    
    if (!req.files || req.files.length !== 2) {
      return res.status(400).json({ 
        success: false,
        message: 'Two files are required for comparison' 
      });
    }
    
    // Log files information
    logger.info(`Files for comparison: ${req.files[0].originalname} and ${req.files[1].originalname}`);

    // In a real app, we would compare the documents here
    // For this demo, we'll simulate the comparison results

    // Create document records
    const doc1Id = uuidv4();
    const doc2Id = uuidv4();
    
    await Document.create({
      id: doc1Id,
      name: req.files[0].originalname,
      filePath: req.files[0].path,
      fileType: req.files[0].mimetype,
      fileSize: req.files[0].size,
      status: 'active',
      uploadedBy: '00000000-0000-4000-a000-000000000000' // Admin ID
    });
    
    await Document.create({
      id: doc2Id,
      name: req.files[1].originalname,
      filePath: req.files[1].path,
      fileType: req.files[1].mimetype,
      fileSize: req.files[1].size,
      status: 'active',
      uploadedBy: '00000000-0000-4000-a000-000000000000' // Admin ID
    });

    // Simulate comparison results
    const comparisonResults = {
      documentA: {
        id: doc1Id,
        name: req.files[0].originalname
      },
      documentB: {
        id: doc2Id,
        name: req.files[1].originalname
      },
      differences: [
        {
          type: 'addition',
          section: 'Section 3.1',
          content: 'New clause regarding liability limitations',
          position: { page: 2, paragraph: 4 }
        },
        {
          type: 'deletion',
          section: 'Section 5.2',
          content: 'Removed warranty provisions',
          position: { page: 4, paragraph: 2 }
        },
        {
          type: 'modification',
          section: 'Section 8',
          content: 'Changed payment terms from 30 days to 15 days',
          position: { page: 7, paragraph: 1 }
        }
      ],
      summary: 'The documents show 3 significant differences in key sections related to liability, warranty, and payment terms.',
      riskAssessment: 'Medium risk due to shortened payment terms and reduced warranty coverage.'
    };

    // Return success response with comparison results
    res.json({
      success: true,
      message: 'Documents compared successfully',
      comparisonResults
    });
  } catch (error) {
    logger.error('Error comparing documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing documents',
      error: error.message
    });
  }
});

// Analyze document without authentication
router.post('/analyze-document/:id', async (req, res) => {
  try {
    logger.info(`Test document analysis accessed for document ID: ${req.params.id}`);
    
    // Get document by ID
    const document = await Document.findByPk(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Create analysis record
    const analysisId = uuidv4();
    const analysis = await AnalysisResult.create({
      id: analysisId,
      documentId: document.id,
      userId: '00000000-0000-4000-a000-000000000000', // Admin ID
      status: 'processing',
      analysisVersion: '1.0'
    });

    // Simulate analysis process (in a real app, this would be an async job)
    setTimeout(async () => {
      try {
        // Simulate analysis results
        const analysisResults = {
          entities: [
            { type: 'person', name: 'John Smith', occurrences: 5 },
            { type: 'company', name: 'Acme Corporation', occurrences: 12 },
            { type: 'date', value: '2023-06-30', occurrences: 3 }
          ],
          clauses: [
            { 
              type: 'indemnification', 
              text: 'Party A shall indemnify Party B against all claims...',
              location: { page: 4, paragraph: 2 }
            },
            { 
              type: 'limitation_of_liability', 
              text: 'In no event shall either party be liable for any indirect damages...',
              location: { page: 6, paragraph: 1 }
            }
          ],
          risks: [
            { 
              level: 'high', 
              description: 'Unlimited liability exposure in Section 8.3',
              recommendation: 'Add liability cap'
            },
            { 
              level: 'medium', 
              description: 'Vague termination provisions',
              recommendation: 'Clarify termination conditions'
            }
          ],
          summary: 'This document is a services agreement between Acme Corporation and John Smith, with standard provisions but notable risks in liability and termination clauses.'
        };

        // Update analysis record with results
        await analysis.update({
          status: 'completed',
          entities: analysisResults.entities,
          clauses: analysisResults.clauses,
          risks: analysisResults.risks,
          summary: analysisResults.summary,
          processingTime: 2.5, // seconds
          completedAt: new Date()
        });

        logger.info(`Analysis completed for document ${document.id}`);
      } catch (error) {
        // Update analysis record with error
        await analysis.update({
          status: 'failed',
          error: error.message
        });
        logger.error(`Analysis failed for document ${document.id}: ${error.message}`);
      }
    }, 3000); // Simulate 3-second processing time

    // Return immediate response
    res.json({
      success: true,
      message: 'Document analysis started',
      analysis: {
        id: analysis.id,
        documentId: analysis.documentId,
        status: analysis.status,
        createdAt: analysis.createdAt
      }
    });
  } catch (error) {
    logger.error('Error starting document analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting document analysis',
      error: error.message
    });
  }
});

// Get analysis results without authentication
router.get('/analysis-results/:id', async (req, res) => {
  try {
    logger.info(`Getting analysis results for analysis ID: ${req.params.id}`);
    
    // Get analysis by ID
    const analysis = await AnalysisResult.findByPk(req.params.id);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    // Return analysis results
    res.json({
      success: true,
      analysis: {
        id: analysis.id,
        documentId: analysis.documentId,
        status: analysis.status,
        entities: analysis.entities,
        clauses: analysis.clauses,
        risks: analysis.risks,
        summary: analysis.summary,
        processingTime: analysis.processingTime,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
        completedAt: analysis.completedAt
      }
    });
  } catch (error) {
    logger.error('Error getting analysis results:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting analysis results',
      error: error.message
    });
  }
});

// Generate report without authentication
router.post('/generate-report/:documentId', async (req, res) => {
  try {
    logger.info(`Generating report for document ID: ${req.params.documentId}`);
    
    // Get document by ID
    const document = await Document.findByPk(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Get analysis for document (if exists)
    const analysis = await AnalysisResult.findOne({
      where: { documentId: document.id, status: 'completed' }
    });

    // Generate report (simulated)
    const report = {
      id: uuidv4(),
      title: `Report: ${document.name}`,
      generatedAt: new Date().toISOString(),
      documentInfo: {
        id: document.id,
        name: document.name,
        fileSize: document.fileSize,
        uploadedAt: document.createdAt
      },
      content: {
        executiveSummary: analysis ? analysis.summary : 'No analysis available',
        keyFindings: analysis ? analysis.risks.map(r => r.description).join('; ') : 'No findings available',
        recommendations: analysis ? analysis.risks.map(r => r.recommendation).join('; ') : 'No recommendations available',
        detailedAnalysis: {
          entities: analysis ? analysis.entities : [],
          clauses: analysis ? analysis.clauses : [],
          risks: analysis ? analysis.risks : []
        }
      },
      reportFormat: 'PDF',
      downloadUrl: `/api/test/download-report/${uuidv4()}`
    };

    // Return report data
    res.json({
      success: true,
      message: 'Report generated successfully',
      report
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
});

// E-signature without authentication
router.post('/sign-document/:documentId', async (req, res) => {
  try {
    logger.info(`Adding signature to document ID: ${req.params.documentId}`);
    
    const { signatureType, signatureData, position } = req.body;
    
    if (!signatureType || !signatureData) {
      return res.status(400).json({
        success: false,
        message: 'Signature type and data are required'
      });
    }
    
    // Get document by ID
    const document = await Document.findByPk(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Create signature record
    const signature = await Signature.create({
      id: uuidv4(),
      documentId: document.id,
      userId: '00000000-0000-4000-a000-000000000000', // Admin ID
      signatureType: signatureType,
      signatureData: signatureData,
      page: position?.page || 1,
      positionX: position?.x || 100,
      positionY: position?.y || 100,
      width: position?.width || 200,
      height: position?.height || 50,
      metadata: {},
      verified: false,
      createdAt: new Date()
    });

    // Return signature data
    res.json({
      success: true,
      message: 'Signature added successfully',
      signature: {
        id: signature.id,
        documentId: signature.documentId,
        signatureType: signature.signatureType,
        position: {
          page: signature.page,
          x: signature.positionX,
          y: signature.positionY,
          width: signature.width,
          height: signature.height
        },
        createdAt: signature.createdAt
      }
    });
  } catch (error) {
    logger.error('Error adding signature:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding signature',
      error: error.message
    });
  }
});

// Test upload page
router.get('/test-upload', (req, res) => {
  logger.info('Serving test-upload page via test route');
  res.sendFile(path.join(__dirname, '../../public/test-upload.html'));
});

// Home page / index route
router.get('/', (req, res) => {
  logger.info('Serving index/home page via test route');
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Universal access - any HTML page from public directory
router.get('/:pageName', (req, res) => {
  let pageName = req.params.pageName;
  logger.info(`Serving ${pageName} page via test route`);
  
  // Remove .html extension if it's already there to avoid double extension
  if (pageName.endsWith('.html')) {
    pageName = pageName.slice(0, -5); // Remove .html
  }
  
  // Check if the file exists in public directory
  const filePath = path.join(__dirname, '../../public', `${pageName}.html`);
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      logger.error(`Page not found: ${pageName}.html`);
      return res.status(404).send(`Page not found: ${pageName}.html`);
    }
    
    // If file exists, serve it
    res.sendFile(filePath);
  });
});

// Client-side login bypass - creates and injects a JWT token directly
router.get('/login-bypass', (req, res) => {
  logger.info('Providing enhanced client-side login bypass');
  
  // Create a test token with admin UUID
  const token = jwt.sign(
    { 
      user: { 
        id: '00000000-0000-4000-a000-000000000000',
        email: 'admin@legalplatform.com',
        role: 'admin'
      } 
    },
    process.env.JWT_SECRET || 'your_jwt_secret_replace_in_production',
    { expiresIn: '24h' }
  );
  
  // We'll send a page that auto-logs in the user with more complete data
  const loginBypassHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Enhanced Login Bypass</title>
    <script>
      // Store the token in localStorage
      localStorage.setItem('auth_token', '${token}');
      
      // Store comprehensive user info
      localStorage.setItem('user_info', JSON.stringify({
        id: '00000000-0000-4000-a000-000000000000',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@legalplatform.com',
        role: 'admin',
        status: 'active',
        lastLogin: new Date().toISOString(),
        permissions: ['read', 'write', 'delete', 'admin'],
        metadata: {
          company: 'Legal Platform Inc.',
          department: 'Administration',
          accountType: 'SuperAdmin'
        }
      }));
      
      // Store more settings that might be needed
      localStorage.setItem('settings', JSON.stringify({
        darkMode: false,
        notifications: true,
        autoSave: true,
        defaultView: 'list'
      }));
      
      // Simulate successful login in session storage too
      sessionStorage.setItem('isLoggedIn', 'true');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 2000);
    </script>
    <style>
      body {
        font-family: Arial, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background-color: #f5f5f5;
      }
      .container {
        text-align: center;
        padding: 2rem;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-width: 500px;
      }
      h1 { color: #2c3e50; margin-bottom: 0.5rem; }
      p { color: #7f8c8d; line-height: 1.5; }
      .spinner {
        display: inline-block;
        width: 50px;
        height: 50px;
        border: 3px solid rgba(0,0,0,.1);
        border-radius: 50%;
        border-top-color: #2c3e50;
        animation: spin 1s ease-in-out infinite;
        margin: 1.5rem 0;
      }
      .info {
        background-color: #f8f9fa;
        border-left: 4px solid #2c3e50;
        padding: 1rem;
        margin: 1rem 0;
        text-align: left;
        font-size: 0.9rem;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Enhanced Login Bypass</h1>
      <p>Creating authentication token and setting up all necessary session data...</p>
      <div class="spinner"></div>
      <div class="info">
        <p><strong>User:</strong> Admin User (admin@legalplatform.com)</p>
        <p><strong>Role:</strong> Administrator</p>
        <p><strong>Token:</strong> Created & stored in localStorage</p>
        <p><strong>Status:</strong> Redirecting to dashboard...</p>
      </div>
    </div>
  </body>
  </html>
  `;
  
  res.send(loginBypassHtml);
});

// Simple test endpoint that doesn't require database access
router.get('/status', (req, res) => {
  logger.info('Test status endpoint accessed');
  
  res.json({
    status: 'success',
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    serverInfo: {
      nodejs: process.version,
      memoryUsage: process.memoryUsage()
    }
  });
});

module.exports = router; 