const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../', config.upload.directory);
const tempDir = path.join(uploadDir, 'temp');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Get allowed file types from config
  const allowedTypes = config.upload.allowedTypes;
  
  // Extract file extension without the dot
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxSize
  },
  fileFilter: fileFilter
});

// Wrapper function to handle multer errors
const handleUpload = (field) => {
  return (req, res, next) => {
    const uploadHandler = upload.single(field);
    
    uploadHandler(req, res, (err) => {
      if (err) {
        logger.error(`Upload error: ${err.message}`);
        
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: 'File too large',
              message: `File size exceeds the limit of ${config.upload.maxSize / (1024 * 1024)} MB`
            });
          }
          
          return res.status(400).json({
            error: 'Upload error',
            message: err.message
          });
        }
        
        return res.status(400).json({
          error: 'Invalid file',
          message: err.message
        });
      }
      
      // If no file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: 'No file',
          message: 'No file was uploaded'
        });
      }
      
      // Add file metadata to request
      req.fileMetadata = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype
      };
      
      next();
    });
  };
};

// Function to move file from temp to permanent location
const moveFile = (tempPath, targetDir) => {
  return new Promise((resolve, reject) => {
    const filename = path.basename(tempPath);
    const targetPath = path.join(targetDir, filename);
    
    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Create read and write streams
    const readStream = fs.createReadStream(tempPath);
    const writeStream = fs.createWriteStream(targetPath);
    
    // Handle errors
    readStream.on('error', reject);
    writeStream.on('error', reject);
    
    // When the write is complete, resolve with the new path
    writeStream.on('finish', () => {
      // Delete the temp file
      fs.unlink(tempPath, (err) => {
        if (err) {
          logger.warn(`Failed to delete temp file: ${tempPath}`);
        }
      });
      
      resolve(targetPath);
    });
    
    // Pipe the read stream to the write stream
    readStream.pipe(writeStream);
  });
};

// Cleanup function to remove temporary files
const cleanupTempFiles = (req, res, next) => {
  if (req.file && req.file.path) {
    fs.unlink(req.file.path, (err) => {
      if (err) {
        logger.warn(`Failed to delete temp file: ${req.file.path}`);
      }
    });
  }
  
  next();
};

module.exports = {
  handleUpload,
  moveFile,
  cleanupTempFiles,
  uploadDir
}; 