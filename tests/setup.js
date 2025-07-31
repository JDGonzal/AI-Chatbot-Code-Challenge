import dotenv from 'dotenv';

// Load test environment variables
dotenv.config();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AUTH_SEED = 'test-auth-seed-for-jwt';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.PINECONE_API_KEY = 'test-pinecone-key';

// Mock console.log and console.error to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  table: jest.fn()
};

// Global test timeout
jest.setTimeout(10000); 