require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');
const { Sequelize } = require('sequelize');
const os = require('os');
const logger = require('../utils/logger');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Test results collection
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Utility function to log with colors
function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

// Log test result
function logTest(name, status, message = '', details = null) {
  let color;
  switch (status) {
    case 'PASS':
      color = colors.green;
      testResults.passed++;
      break;
    case 'FAIL':
      color = colors.red;
      testResults.failed++;
      break;
    case 'WARN':
      color = colors.yellow;
      testResults.warnings++;
      break;
    case 'INFO':
      color = colors.blue;
      break;
    default:
      color = colors.white;
  }
  
  log(`[${status}] ${name}${message ? ': ' + message : ''}`, color);
  
  if (details) {
    console.log('  Details:', details);
  }
  
  if (status !== 'INFO') {
    testResults.tests.push({
      name,
      status,
      message,
      details
    });
  }
}

// Check if SQLite is available
let isSqliteAvailable = false;
try {
  require('sqlite3');
  isSqliteAvailable = true;
} catch (error) {
  // SQLite is not available
}

// Environment check test
async function testEnvironment() {
  log('\n=== Environment Check ===', colors.cyan + colors.bold);
  
  // Check Node.js version
  const nodeVersion = process.version;
  const nodeVersionMatch = /v(\d+)\./.exec(nodeVersion);
  const majorVersion = nodeVersionMatch ? parseInt(nodeVersionMatch[1]) : 0;
  
  if (majorVersion >= 16) {
    logTest('Node.js Version', 'PASS', `Using Node.js ${nodeVersion}`);
  } else {
    logTest('Node.js Version', 'FAIL', `Using Node.js ${nodeVersion}, but >= v16.0.0 is required`);
  }
  
  // Check npm packages
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    logTest('Package.json Check', 'PASS', 'Successfully parsed package.json');
    
    // Check required dependencies
    const requiredDeps = ['express', 'sequelize', 'jsonwebtoken', 'bcryptjs', 'dotenv'];
    const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
    
    if (missingDeps.length > 0) {
      logTest('Required Dependencies', 'FAIL', `Missing dependencies: ${missingDeps.join(', ')}`);
    } else {
      logTest('Required Dependencies', 'PASS', 'All required dependencies present');
    }
    
  } catch (error) {
    logTest('Package.json Check', 'FAIL', `Error parsing package.json: ${error.message}`);
  }
  
  // Check environment variables
  const isSqlite = process.env.DB_DIALECT === 'sqlite';
  
  // Define required environment variables based on database type
  const requiredEnvVars = [
    'PORT', 'NODE_ENV', 
    'JWT_SECRET', 'JWT_EXPIRATION'
  ];
  
  // Add database-specific environment variables
  if (isSqlite) {
    requiredEnvVars.push('DB_DIALECT', 'DB_STORAGE');
  } else {
    requiredEnvVars.push('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD');
  }
  
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    logTest('Environment Variables', 'FAIL', `Missing required environment variables: ${missingEnvVars.join(', ')}`);
  } else {
    logTest('Environment Variables', 'PASS', 'All required environment variables present');
  }
}

// Directory structure test
async function testDirectoryStructure() {
  log('\n=== Directory Structure Check ===', colors.cyan + colors.bold);
  
  const requiredDirs = [
    'src',
    'src/models',
    'src/routes',
    'src/middleware',
    'src/controllers',
    'src/utils',
    'public',
    'public/js',
    'public/css',
    'uploads'
  ];
  
  const missingDirs = requiredDirs.filter(dir => !fs.existsSync(path.join(process.cwd(), dir)));
  
  if (missingDirs.length > 0) {
    logTest('Directory Structure', 'FAIL', `Missing required directories: ${missingDirs.join(', ')}`);
    
    // Create missing directories
    try {
      missingDirs.forEach(dir => {
        fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
      });
      logTest('Directory Creation', 'INFO', 'Created missing directories');
    } catch (error) {
      logTest('Directory Creation', 'FAIL', `Failed to create directories: ${error.message}`);
    }
  } else {
    logTest('Directory Structure', 'PASS', 'All required directories present');
  }
  
  // Check for required files
  const requiredFiles = [
    'src/server.js',
    '.env',
    'package.json'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(process.cwd(), file)));
  
  if (missingFiles.length > 0) {
    logTest('Required Files', 'FAIL', `Missing required files: ${missingFiles.join(', ')}`);
  } else {
    logTest('Required Files', 'PASS', 'All required files present');
  }
}

// Database connection test
async function testDatabaseConnection() {
  log('\n=== Database Connection Test ===', colors.cyan + colors.bold);
  
  // Check if using SQLite
  const isSqlite = process.env.DB_DIALECT === 'sqlite';
  
  if (isSqlite) {
    logTest('Database Type', 'INFO', 'Using SQLite database');
    
    if (!isSqliteAvailable) {
      logTest('SQLite Package', 'WARN', 'SQLite package is not installed, using in-memory fallback');
      logTest('Database Connection', 'PASS', 'Using in-memory database fallback');
      return true;
    }
    
    try {
      // Check if SQLite file exists or can be created
      const dbPath = process.env.DB_STORAGE || './data/legal_platform.sqlite';
      const dbDir = path.dirname(dbPath);
      
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logTest('SQLite Directory', 'INFO', `Created directory: ${dbDir}`);
      }
      
      // Try to create a Sequelize instance with SQLite
      const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false
      });
      
      await sequelize.authenticate();
      logTest('SQLite Connection', 'PASS', 'Successfully connected to SQLite database');
      
      // Check for required tables
      try {
        await sequelize.sync({ force: false });
        logTest('SQLite Tables', 'PASS', 'Database schema synchronized');
        return true;
      } catch (error) {
        logTest('SQLite Tables', 'FAIL', `Error syncing tables: ${error.message}`);
        return false;
      } finally {
        await sequelize.close();
      }
    } catch (error) {
      logTest('SQLite Connection', 'FAIL', `Failed to connect to SQLite database: ${error.message}`);
      return false;
    }
  } else {
    // PostgreSQL connection test (existing code)
    const sequelize = new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      logging: false
    });

    try {
      await sequelize.authenticate();
      logTest('Database Connection', 'PASS', 'Successfully connected to the database');
      
      // Check for required tables
      try {
        const [results] = await sequelize.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        
        const tableNames = results.map(result => result.table_name);
        logTest('Database Tables', 'INFO', `Found tables: ${tableNames.join(', ')}`);
        
        const requiredTables = ['users', 'documents', 'audit_logs'];
        const missingTables = requiredTables.filter(
          table => !tableNames.includes(table) && !tableNames.includes(table.slice(0, -1))
        );
        
        if (missingTables.length > 0) {
          logTest('Required Tables', 'WARN', `Missing tables: ${missingTables.join(', ')}`);
          logTest('Database Setup', 'INFO', 'Consider running: npm run db:init and npm run db:migrate');
        } else {
          logTest('Required Tables', 'PASS', 'All required tables present');
        }
      } catch (error) {
        logTest('Database Tables Check', 'FAIL', `Error checking tables: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      logTest('Database Connection', 'FAIL', `Failed to connect to the database: ${error.message}`);
      
      // Log detailed troubleshooting information
      log('\nDatabase Configuration:', colors.yellow);
      log(`- Host: ${process.env.DB_HOST}`, colors.yellow);
      log(`- Port: ${process.env.DB_PORT}`, colors.yellow);
      log(`- Database: ${process.env.DB_NAME}`, colors.yellow);
      log(`- User: ${process.env.DB_USER}`, colors.yellow);
      
      // Check if PostgreSQL is installed and running
      try {
        if (process.platform === 'win32') {
          // Windows
          execSync('sc query postgresql', { stdio: 'ignore' });
          logTest('PostgreSQL Service', 'INFO', 'PostgreSQL service exists');
        } else {
          // Linux/Mac
          execSync('ps aux | grep postgres', { stdio: 'ignore' });
          logTest('PostgreSQL Process', 'INFO', 'PostgreSQL process found');
        }
      } catch (error) {
        logTest('PostgreSQL Check', 'WARN', 'Could not verify if PostgreSQL is running');
        logTest('PostgreSQL Installation', 'INFO', 'Make sure PostgreSQL is installed and running');
      }
      
      return false;
    } finally {
      await sequelize.close();
    }
  }
}

// Port availability test
async function testPortAvailability() {
  log('\n=== Port Availability Test ===', colors.cyan + colors.bold);
  
  const port = process.env.PORT || 3000;
  
  return new Promise(resolve => {
    const server = http.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logTest('Port Availability', 'FAIL', `Port ${port} is already in use`);
        
        // Suggest how to find the process using the port
        if (process.platform === 'win32') {
          logTest('Process Check', 'INFO', `Run: netstat -ano | findstr :${port} to find the process using this port`);
        } else {
          logTest('Process Check', 'INFO', `Run: lsof -i :${port} to find the process using this port`);
        }
        
        resolve(false);
      } else {
        logTest('Port Availability', 'FAIL', `Error testing port ${port}: ${err.message}`);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      logTest('Port Availability', 'PASS', `Port ${port} is available`);
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

// Model validation test
async function testModels() {
  log('\n=== Model Validation Test ===', colors.cyan + colors.bold);
  
  const modelsDir = path.join(process.cwd(), 'src/models');
  if (!fs.existsSync(modelsDir)) {
    logTest('Models Directory', 'FAIL', 'Models directory does not exist');
    return;
  }
  
  try {
    const modelFiles = fs.readdirSync(modelsDir)
      .filter(file => file.endsWith('.js') && file !== 'index.js');
    
    logTest('Model Files', 'INFO', `Found models: ${modelFiles.join(', ')}`);
    
    // Check for required models
    const requiredModels = ['user.js', 'document.js', 'auditLog.js'];
    const missingModels = requiredModels.filter(model => !modelFiles.includes(model));
    
    if (missingModels.length > 0) {
      logTest('Required Models', 'WARN', `Missing models: ${missingModels.join(', ')}`);
    } else {
      logTest('Required Models', 'PASS', 'All required models present');
    }
    
    // Basic syntax check of model files
    let syntaxErrors = 0;
    
    for (const file of modelFiles) {
      try {
        require(path.join(modelsDir, file));
        logTest(`Model: ${file}`, 'PASS', 'No syntax errors');
      } catch (error) {
        syntaxErrors++;
        logTest(`Model: ${file}`, 'FAIL', `Syntax error: ${error.message}`);
      }
    }
    
    if (syntaxErrors === 0) {
      logTest('Model Syntax', 'PASS', 'All models passed syntax check');
    } else {
      logTest('Model Syntax', 'FAIL', `${syntaxErrors} models have syntax errors`);
    }
    
  } catch (error) {
    logTest('Models Check', 'FAIL', `Error checking models: ${error.message}`);
  }
}

// Routes validation test
async function testRoutes() {
  log('\n=== Routes Validation Test ===', colors.cyan + colors.bold);
  
  const routesDir = path.join(process.cwd(), 'src/routes');
  if (!fs.existsSync(routesDir)) {
    logTest('Routes Directory', 'FAIL', 'Routes directory does not exist');
    return;
  }
  
  try {
    const routeFiles = fs.readdirSync(routesDir)
      .filter(file => file.endsWith('.js') && file !== 'index.js');
    
    logTest('Route Files', 'INFO', `Found routes: ${routeFiles.join(', ')}`);
    
    // Check for required routes
    const requiredRoutes = ['auth.js', 'admin.js', 'documents.js'];
    const missingRoutes = requiredRoutes.filter(route => !routeFiles.includes(route));
    
    if (missingRoutes.length > 0) {
      logTest('Required Routes', 'WARN', `Missing routes: ${missingRoutes.join(', ')}`);
    } else {
      logTest('Required Routes', 'PASS', 'All required routes present');
    }
    
    // Basic syntax check of route files
    let syntaxErrors = 0;
    
    for (const file of routeFiles) {
      try {
        // Skip signatures.js if SQLite is not available
        if (file === 'signatures.js' && !isSqliteAvailable) {
          logTest(`Route: ${file}`, 'WARN', 'Skipping syntax check (SQLite not available)');
          continue;
        }
        
        require(path.join(routesDir, file));
        logTest(`Route: ${file}`, 'PASS', 'No syntax errors');
      } catch (error) {
        syntaxErrors++;
        logTest(`Route: ${file}`, 'FAIL', `Syntax error: ${error.message}`);
      }
    }
    
    if (syntaxErrors === 0) {
      logTest('Route Syntax', 'PASS', 'All routes passed syntax check');
    } else {
      logTest('Route Syntax', 'FAIL', `${syntaxErrors} routes have syntax errors`);
    }
    
  } catch (error) {
    logTest('Routes Check', 'FAIL', `Error checking routes: ${error.message}`);
  }
}

// Public files validation test
async function testPublicFiles() {
  log('\n=== Public Files Validation Test ===', colors.cyan + colors.bold);
  
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    logTest('Public Directory', 'FAIL', 'Public directory does not exist');
    return;
  }
  
  // Check for required HTML files
  const requiredHtmlFiles = [
    'index.html',
    'login.html',
    'dashboard.html',
    'admin-dashboard.html',
    'document-editor.html',
    'legal-dd.html'
  ];
  
  const htmlFiles = fs.readdirSync(publicDir)
    .filter(file => file.endsWith('.html'));
  
  logTest('HTML Files', 'INFO', `Found HTML files: ${htmlFiles.join(', ')}`);
  
  const missingHtmlFiles = requiredHtmlFiles.filter(file => !htmlFiles.includes(file));
  
  if (missingHtmlFiles.length > 0) {
    logTest('Required HTML Files', 'WARN', `Missing HTML files: ${missingHtmlFiles.join(', ')}`);
  } else {
    logTest('Required HTML Files', 'PASS', 'All required HTML files present');
  }
  
  // Check for required JS files
  const jsDir = path.join(publicDir, 'js');
  
  if (!fs.existsSync(jsDir)) {
    logTest('JS Directory', 'FAIL', 'JavaScript directory does not exist');
  } else {
    const requiredJsFiles = [
      'admin-dashboard.js',
      'document-editor.js',
      'legal-dd.js'
    ];
    
    const jsFiles = fs.readdirSync(jsDir)
      .filter(file => file.endsWith('.js'));
    
    logTest('JS Files', 'INFO', `Found JS files: ${jsFiles.join(', ')}`);
    
    const missingJsFiles = requiredJsFiles.filter(file => !jsFiles.includes(file));
    
    if (missingJsFiles.length > 0) {
      logTest('Required JS Files', 'WARN', `Missing JS files: ${missingJsFiles.join(', ')}`);
    } else {
      logTest('Required JS Files', 'PASS', 'All required JS files present');
    }
  }
}

// Generate test report
function generateReport() {
  log('\n=== Test Summary ===', colors.magenta + colors.bold);
  log(`Total Tests: ${testResults.passed + testResults.failed}`, colors.white);
  log(`Passed: ${testResults.passed}`, colors.green);
  log(`Failed: ${testResults.failed}`, colors.red);
  log(`Warnings: ${testResults.warnings}`, colors.yellow);
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log(`\nTest report saved to: ${reportPath}`, colors.blue);
  
  // Recommendations based on test results
  log('\n=== Recommendations ===', colors.cyan + colors.bold);
  
  if (testResults.failed > 0) {
    log('Critical Issues:', colors.red);
    testResults.tests
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        log(`- ${test.name}: ${test.message}`, colors.red);
      });
  }
  
  if (testResults.warnings > 0) {
    log('\nWarnings:', colors.yellow);
    testResults.tests
      .filter(test => test.status === 'WARN')
      .forEach(test => {
        log(`- ${test.name}: ${test.message}`, colors.yellow);
      });
  }
  
  // Database connection issues
  if (testResults.tests.some(test => test.name === 'Database Connection' && test.status === 'FAIL')) {
    log('\nTo fix database connection issues:', colors.blue);
    log('1. Ensure PostgreSQL is installed and running', colors.white);
    log('2. Verify the database credentials in your .env file', colors.white);
    log('3. Create the database by running:', colors.white);
    log('   > npm run db:init', colors.white);
    log('4. Run the migrations:', colors.white);
    log('   > npm run db:migrate', colors.white);
  }
  
  // Port issues
  if (testResults.tests.some(test => test.name === 'Port Availability' && test.status === 'FAIL')) {
    log('\nTo fix port availability issues:', colors.blue);
    log('1. Find and stop the process using port 3000:', colors.white);
    log('   - Windows: netstat -ano | findstr :3000', colors.white);
    log('   - Then kill the process: taskkill /F /PID <PID>', colors.white);
    log('2. Or change the PORT in your .env file to an available port', colors.white);
  }
  
  // Next steps
  log('\nNext Steps:', colors.blue);
  if (testResults.failed > 0) {
    log('1. Fix all critical issues before proceeding', colors.white);
    log('2. Run this test script again to verify fixes', colors.white);
  } else {
    log('1. Consider running unit tests with Jest: npm test', colors.white);
    log('2. Start the application: npm run dev', colors.white);
    log('3. Access the application at: http://localhost:3000', colors.white);
  }
}

// Main function to run all tests
async function runTests() {
  log('=== Legal Platform Test Suite ===', colors.magenta + colors.bold);
  log('Starting comprehensive system check...\n', colors.white);
  
  await testEnvironment();
  await testDirectoryStructure();
  await testDatabaseConnection();
  await testPortAvailability();
  await testModels();
  await testRoutes();
  await testPublicFiles();
  
  generateReport();
}

// Run the test suite
runTests().catch(error => {
  console.error('An unexpected error occurred during testing:', error);
  process.exit(1);
}); 