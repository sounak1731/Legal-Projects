const request = require('supertest');
const app = require('../../server');
const { sequelize } = require('../../db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Import User model
const User = require('../../models/user')(sequelize);

describe('Authentication API', () => {
  let testUser;
  let token;
  
  beforeAll(async () => {
    // Sync the database
    await sequelize.sync({ force: true });
    
    // Create a test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    testUser = await User.create({
      id: uuidv4(),
      firstName: 'Test',
      lastName: 'User',
      email: 'test-auth@example.com',
      password: hashedPassword,
      role: 'user',
      status: 'active'
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
        
      expect(response.status).toBe(400);
    });
    
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-auth@example.com',
          password: 'WrongPassword'
        });
        
      expect(response.status).toBe(401);
    });
    
    it('should return 200 and token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-auth@example.com',
          password: 'TestPassword123!'
        });
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test-auth@example.com');
      
      // Save token for future tests
      token = response.body.token;
    });
  });
  
  describe('GET /api/auth/me', () => {
    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/me');
        
      expect(response.status).toBe(401);
    });
    
    it('should return 200 and user data for valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
        
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe('test-auth@example.com');
    });
  });
  
  describe('POST /api/auth/register', () => {
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new-user@example.com'
        });
        
      expect(response.status).toBe(400);
    });
    
    it('should return 409 for duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Duplicate',
          lastName: 'Email',
          email: 'test-auth@example.com',
          password: 'NewPassword123!'
        });
        
      expect(response.status).toBe(409);
    });
    
    it('should return 201 for successful registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          email: 'new-user@example.com',
          password: 'NewPassword123!'
        });
        
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('new-user@example.com');
    });
  });
  
  afterAll(async () => {
    // Clean up
    await sequelize.close();
  });
}); 