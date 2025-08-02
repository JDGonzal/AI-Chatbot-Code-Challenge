import request from 'supertest';
import app from '../../server.js';
import { User } from '../../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as scraper from '../../services/scraper.js';
import * as chunker from '../../services/chunker.js';
import * as embedding from '../../services/embedding.js';
import * as pineconeClient from '../../services/pineconeClient.js';
import * as openai from '../../services/openai.js';

// Mock dependencies
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}));
jest.mock('../../services/scraper.js');
jest.mock('../../services/chunker.js');
jest.mock('../../services/embedding.js');
jest.mock('../../services/pineconeClient.js');
jest.mock('../../services/openai.js');

describe('API Routes Integration Tests', () => {
  let validToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset User array to initial state
    User.length = 0;
    User.push(
      {
        username: "Admin",
        password: "$2b$10$Vr5C5oMmDKZPxDSq/aXQvOZuhIXot3Jtagdro8BO/8g/TIeJcqDUS",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        username: "User",
        password: "$2b$10$E/S15HNMPLmRoWES9KsHN.CBofM3XwLBa9JjWGN/vyfPslDZMflZS",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    // Create a valid token for testing
    validToken = 'valid.jwt.token';
    jwt.sign.mockReturnValue(validToken);
    jwt.verify.mockImplementation((token, secret, callback) => {
      if (token === validToken) {
        callback(null, { username: 'Admin' });
      } else {
        callback(new Error('Invalid token'), null);
      }
    });
    
    // Setup bcrypt mocks
    bcrypt.hash.mockResolvedValue('hashedpassword');
    bcrypt.compare.mockResolvedValue(true);
  });

  describe('Root Route', () => {
    test('GET / should return welcome message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toEqual({
        message: "Welcome to the AI Chatbot Code Challenge API!"
      });
    });
  });

  describe('Authentication Routes (/api/auth)', () => {
    describe('POST /api/auth/register', () => {
      describe('Positive Cases', () => {
        test('should register new user successfully', async () => {
          bcrypt.hash.mockResolvedValue('hashedpassword123');

          const response = await request(app)
            .post('/api/auth/register')
            .send({
              username: 'newuser',
              password: 'password123'
            })
            .expect(201);

          expect(response.body).toEqual({
            message: "User registered successfully"
          });
          expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
        });
      });

      describe('Negative Cases', () => {
        test('should reject duplicate username', async () => {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              username: 'Admin', // existing user
              password: 'password123'
            })
            .expect(400);

          expect(response.body).toEqual({
            error: "Username already exists"
          });
        });

        test('should reject invalid username length', async () => {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              username: 'ab', // too short
              password: 'password123'
            })
            .expect(400);

          expect(response.body).toEqual({
            error: "Username must be between 3-10 characters"
          });
        });

        test('should reject invalid password length', async () => {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              username: 'newuser',
              password: '12345' // too short
            })
            .expect(400);

          expect(response.body).toEqual({
            error: "Password must be between 6-20 characters"
          });
        });
      });
    });

    describe('POST /api/auth/login', () => {
      describe('Positive Cases', () => {
        test('should login user with valid credentials', async () => {
          bcrypt.compare.mockResolvedValue(true);

          const response = await request(app)
            .post('/api/auth/login')
            .send({
              username: 'Admin',
              password: 'testpassword'
            })
            .expect(200);

          expect(response.body).toEqual({
            message: "Login successful",
            token: validToken
          });
          expect(bcrypt.compare).toHaveBeenCalled();
          expect(jwt.sign).toHaveBeenCalledWith(
            { username: 'Admin' },
            process.env.AUTH_SEED,
            { expiresIn: '1h' }
          );
        });
      });

      describe('Negative Cases', () => {
        test('should reject login for non-existent user', async () => {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              username: 'nonexistent',
              password: 'password123'
            })
            .expect(404);

          expect(response.body).toEqual({
            error: "User not found"
          });
        });

        test('should reject login with invalid password', async () => {
          bcrypt.compare.mockResolvedValue(false);

          const response = await request(app)
            .post('/api/auth/login')
            .send({
              username: 'Admin',
              password: 'wrongpassword'
            })
            .expect(401);

          expect(response.body).toEqual({
            error: "Invalid password"
          });
        });
      });
    });
  });

  describe('Chat Routes (/api/chat)', () => {
    describe('GET /api/chat/can-access', () => {
      describe('Positive Cases', () => {
        test('should allow access with valid token and existing user', async () => {
          const response = await request(app)
            .get('/api/chat/can-access')
            .set('x-auth-token', validToken)
            .send({ username: 'Admin' })
            .expect(200);

          expect(response.body.message).toBe("The user can access the chat");
          expect(response.body.chat).toBeDefined();
        });
      });

      describe('Negative Cases - Missing Auth Header', () => {
        test('should reject request without auth token', async () => {
          const response = await request(app)
            .get('/api/chat/can-access')
            .send({ username: 'Admin' })
            .expect(401);

          expect(response.body).toEqual({
            error: "No token provided"
          });
        });

        test('should reject request with empty auth token', async () => {
          const response = await request(app)
            .get('/api/chat/can-access')
            .set('x-auth-token', '')
            .send({ username: 'Admin' })
            .expect(401);

          expect(response.body).toEqual({
            error: "No token provided"
          });
        });

        test('should reject request with invalid auth token', async () => {
          const response = await request(app)
            .get('/api/chat/can-access')
            .set('x-auth-token', 'invalid.token')
            .send({ username: 'Admin' })
            .expect(403);

          expect(response.body).toEqual({
            error: "Failed to authenticate token"
          });
        });
      });

      describe('Negative Cases - User Validation', () => {
        test('should reject access for non-existent user even with valid token', async () => {
          const response = await request(app)
            .get('/api/chat/can-access')
            .set('x-auth-token', validToken)
            .send({ username: 'NonExistentUser' })
            .expect(400);

          expect(response.body).toEqual({
            error: "Username doesn't exists"
          });
        });
      });
    });

    describe('POST /api/chat', () => {
      const mockScrapedText = 'Mock financial data';
      const mockChunks = ['chunk1', 'chunk2'];
      const mockEmbeddings = [[0.1, 0.2], [0.3, 0.4]];
      const mockQuestionEmbedding = [0.5, 0.6];
      const mockSearchResults = ['Financial info 1', 'Financial info 2'];

      beforeEach(() => {
        // Setup service mocks
        scraper.fetchAndExtractText.mockResolvedValue(mockScrapedText);
        chunker.chunkText.mockReturnValue(mockChunks);
        embedding.embedChunks
          .mockResolvedValueOnce(mockEmbeddings)
          .mockResolvedValueOnce([mockQuestionEmbedding]);
        pineconeClient.upsertEmbeddings.mockResolvedValue();
        pineconeClient.searchSimilarChunks.mockResolvedValue(mockSearchResults);
        
        // Mock OpenAI service functions to prevent fallback responses
        openai.generateResponseFromChunks.mockResolvedValue('Mock OpenAI response');
        openai.validateAndImproveChunks.mockResolvedValue(mockSearchResults);
      });

      describe('Positive Cases', () => {
        test('should process finance chat with valid token and user', async () => {
          const response = await request(app)
            .post('/api/chat')
            .set('x-auth-token', validToken)
            .send({
              username: 'Admin',
              question: 'What are the market trends?'
            })
            .expect(200);

          expect(response.body).toEqual({
            chat: mockSearchResults
          });
          expect(scraper.fetchAndExtractText).toHaveBeenCalled();
          expect(chunker.chunkText).toHaveBeenCalled();
          expect(embedding.embedChunks).toHaveBeenCalledTimes(2);
        });
      });

      describe('Negative Cases - Authentication', () => {
        test('should reject request without auth token', async () => {
          const response = await request(app)
            .post('/api/chat')
            .send({
              username: 'Admin',
              question: 'Market trends?'
            })
            .expect(401);

          expect(response.body).toEqual({
            error: "No token provided"
          });
          
          // Verify no services were called
          expect(scraper.fetchAndExtractText).not.toHaveBeenCalled();
        });

        test('should reject request with invalid token', async () => {
          const response = await request(app)
            .post('/api/chat')
            .set('x-auth-token', 'invalid.token')
            .send({
              username: 'Admin',
              question: 'Market trends?'
            })
            .expect(403);

          expect(response.body).toEqual({
            error: "Failed to authenticate token"
          });
        });
      });

      describe('Negative Cases - Unknown Product Query', () => {
        test('should handle unknown product query gracefully', async () => {
          // Mock empty search results for unknown product
          pineconeClient.searchSimilarChunks.mockResolvedValue([]);

          const response = await request(app)
            .post('/api/chat')
            .set('x-auth-token', validToken)
            .send({
              username: 'Admin',
              question: 'What is the price of XYZ unknown product?'
            })
            .expect(200);

          expect(response.body).toEqual({
            chat: [] // Empty results for unknown product
          });
        });

        test('should handle non-financial queries', async () => {
          // Mock empty or irrelevant search results
          pineconeClient.searchSimilarChunks.mockResolvedValue([
            'No relevant financial information found'
          ]);

          const response = await request(app)
            .post('/api/chat')
            .set('x-auth-token', validToken)
            .send({
              username: 'Admin',
              question: 'What is the weather today?'
            })
            .expect(200);

          expect(response.body.chat).toBeDefined();
        });
      });

      describe('Negative Cases - Service Failures', () => {
        test('should handle scraper service failure', async () => {
          scraper.fetchAndExtractText.mockRejectedValue(
            new Error('Website scraping failed')
          );

          const response = await request(app)
            .post('/api/chat')
            .set('x-auth-token', validToken)
            .send({
              username: 'Admin',
              question: 'Market trends?'
            })
            .expect(500);

          expect(response.body).toEqual({
            error: "Error testing Access"
          });
        });

        test('should handle embedding service failure', async () => {
          embedding.embedChunks.mockRejectedValue(
            new Error('OpenAI API failed')
          );

          const response = await request(app)
            .post('/api/chat')
            .set('x-auth-token', validToken)
            .send({
              username: 'Admin',
              question: 'Market trends?'
            })
            .expect(500);

          expect(response.body).toEqual({
            error: "Error testing Access"
          });
        });

        test('should handle Pinecone service failure', async () => {
          pineconeClient.searchSimilarChunks.mockRejectedValue(
            new Error('Pinecone query failed')
          );

          const response = await request(app)
            .post('/api/chat')
            .set('x-auth-token', validToken)
            .send({
              username: 'Admin',
              question: 'Market trends?'
            })
            .expect(500);

          expect(response.body).toEqual({
            error: "Error testing Access"
          });
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    test('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send('{"malformed": json}')
        .type('application/json')
        .expect(400);
    });
  });

  describe('Cross-Route Integration', () => {
    test('complete authentication and chat flow', async () => {
      // 1. Register a new user
      bcrypt.hash.mockResolvedValue('hashedpassword123');
      
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        })
        .expect(201);

      // 2. Login the user
      bcrypt.compare.mockResolvedValue(true);
      const loginToken = 'login.jwt.token';
      jwt.sign.mockReturnValue(loginToken);
      jwt.verify.mockImplementation((token, secret, callback) => {
        if (token === loginToken) {
          callback(null, { username: 'testuser' });
        } else {
          callback(new Error('Invalid token'), null);
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        })
        .expect(200);

      expect(loginResponse.body.token).toBe(loginToken);

      // 3. Use the token to access chat
      const chatResponse = await request(app)
        .get('/api/chat/can-access')
        .set('x-auth-token', loginToken)
        .send({ username: 'testuser' })
        .expect(200);

      expect(chatResponse.body.message).toBe("The user can access the chat");
    });
  });
}); 