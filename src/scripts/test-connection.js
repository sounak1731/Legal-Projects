require('dotenv').config();
const { Sequelize } = require('sequelize');
const http = require('http');

// Database connection test
async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: console.log
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    console.error('Details:', error);
    
    // Additional troubleshooting info
    console.log('\nDatabase Configuration:');
    console.log(`- Host: ${process.env.DB_HOST}`);
    console.log(`- Port: ${process.env.DB_PORT}`);
    console.log(`- Database: ${process.env.DB_NAME}`);
    console.log(`- User: ${process.env.DB_USER}`);
    
    return false;
  } finally {
    await sequelize.close();
  }
}

// Port availability test
function testPortAvailability(port) {
  return new Promise(resolve => {
    console.log(`Testing if port ${port} is available...`);
    
    const server = http.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use.`);
        resolve(false);
      } else {
        console.error(`❌ An error occurred while testing port ${port}:`, err.message);
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      console.log(`✅ Port ${port} is available.`);
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

// Main function to run tests
async function runTests() {
  console.log('=== Environment Check ===');
  console.log(`Node Version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  console.log('\n=== Database Connection Test ===');
  const dbConnected = await testDatabaseConnection();
  
  console.log('\n=== Port Availability Test ===');
  const port = process.env.PORT || 3000;
  const portAvailable = await testPortAvailability(port);
  
  console.log('\n=== Test Summary ===');
  console.log(`Database Connection: ${dbConnected ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Port ${port} Availability: ${portAvailable ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (!dbConnected) {
    console.log('\n=== Database Connection Troubleshooting ===');
    console.log('1. Ensure PostgreSQL is installed and running.');
    console.log('2. Verify database credentials in your .env file.');
    console.log('3. Check if the database exists.');
    console.log('\nTo create the database, you may run:');
    console.log('> npm run db:init');
  }
  
  if (!portAvailable) {
    console.log('\n=== Port Availability Troubleshooting ===');
    console.log('1. Find and stop the process using port 3000:');
    console.log('   - On Windows: netstat -ano | findstr :3000');
    console.log('   - Then kill the process: taskkill /F /PID <PID>');
    console.log('2. Or change the PORT in your .env file.');
  }
}

// Run all tests
runTests().catch(error => {
  console.error('An unexpected error occurred during testing:', error);
  process.exit(1);
}); 