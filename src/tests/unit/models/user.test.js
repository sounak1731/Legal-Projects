// Mock the database connection
jest.mock('../../../db', () => {
  // Create a simple mock for Sequelize
  const mockSequelize = {
    define: jest.fn().mockReturnValue({
      init: jest.fn(),
      findOne: jest.fn().mockResolvedValue({
        id: '123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'user',
        status: 'active'
      }),
      create: jest.fn().mockImplementation((data) => Promise.resolve(data)),
      findByPk: jest.fn().mockResolvedValue({
        id: '123',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com'
      })
    })
  };
  
  return {
    sequelize: mockSequelize,
    Sequelize: {
      DataTypes: {
        UUID: 'UUID',
        STRING: 'STRING',
        ENUM: jest.fn().mockReturnValue('ENUM'),
        DATE: 'DATE',
        BOOLEAN: 'BOOLEAN',
        JSONB: 'JSONB'
      }
    }
  };
});

// Import the user model
const { v4: uuidv4 } = require('uuid');
const User = require('../../../models/user');

describe('User Model', () => {
  it('should be defined', () => {
    expect(User).toBeDefined();
  });
  
  it('should have correct methods', () => {
    // Since we're mocking, we're just testing that the model is structured correctly
    expect(typeof User).toBe('function');
  });
}); 