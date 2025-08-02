import { canAccess, financeChat } from '../../controllers/chat.controller.js';
import { User } from '../../models/user.model.js';
import { Chat } from '../../models/chat.model.js';
import * as scraper from '../../services/scraper.js';
import * as chunker from '../../services/chunker.js';
import * as embedding from '../../services/embedding.js';
import * as pineconeClient from '../../services/pineconeClient.js';
import * as openai from '../../services/openai.js';

// Mock dependencies
jest.mock('../../services/scraper.js');
jest.mock('../../services/chunker.js');
jest.mock('../../services/embedding.js');
jest.mock('../../services/pineconeClient.js');
jest.mock('../../services/openai.js');

describe('Chat Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      body: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

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
  });

  describe('canAccess', () => {
    describe('Positive Cases', () => {
      test('should allow access for existing user', async () => {
        req.body = { username: 'Admin' };

        await canAccess(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ 
          message: "The user can access the chat", 
          chat: Chat 
        });
      });

      test('should return chat data for valid user', async () => {
        req.body = { username: 'User' };

        await canAccess(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ 
          message: "The user can access the chat", 
          chat: Chat 
        });
      });
    });

    describe('Negative Cases', () => {
      test('should deny access for non-existent user', async () => {
        req.body = { username: 'NonExistentUser' };

        await canAccess(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Username doesn't exists" 
        });
      });

      test('should handle missing username', async () => {
        req.body = {};

        await canAccess(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Username doesn't exists" 
        });
      });

      test('should handle null username', async () => {
        req.body = { username: null };

        await canAccess(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Username doesn't exists" 
        });
      });

      test('should handle unexpected errors', async () => {
        req.body = { username: 'Admin' };
        
        // Force an error by mocking User.find to throw
        const originalFind = User.find;
        User.find = jest.fn().mockImplementation(() => {
          throw new Error('Database error');
        });

        await canAccess(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Error testing Access" 
        });

        // Restore original method
        User.find = originalFind;
      });
    });
  });

  describe('financeChat', () => {
    const mockScrapedText = 'Mock financial data from investing.com';
    const mockChunks = ['chunk1', 'chunk2'];
    const mockEmbeddings = [[0.1, 0.2], [0.3, 0.4]];
    const mockQuestionEmbedding = [0.5, 0.6];
    const mockSearchResults = ['Relevant financial info 1', 'Relevant financial info 2'];

    beforeEach(() => {
      // Setup default mocks for happy path
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
      test('should process finance chat successfully for valid user', async () => {
        req.body = { username: 'Admin', question: 'What are the market trends?' };

        await financeChat(req, res);

        expect(scraper.fetchAndExtractText).toHaveBeenCalledWith(
          'https://www.investing.com/markets/united-states'
        );
        expect(chunker.chunkText).toHaveBeenCalledWith(mockScrapedText + '\n', 1024);
        expect(embedding.embedChunks).toHaveBeenCalledTimes(2);
        expect(pineconeClient.upsertEmbeddings).toHaveBeenCalledWith(
          mockEmbeddings, 
          mockChunks
        );
        expect(pineconeClient.searchSimilarChunks).toHaveBeenCalledWith(
          mockQuestionEmbedding, 
          5
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ 
          chat: 'Mock OpenAI response',
          sources: mockSearchResults,
          originalChunks: 2,
          validatedChunks: 2,
          aiProcessed: true
        });
      });

      test('should handle different types of financial questions', async () => {
        req.body = { 
          username: 'User', 
          question: 'Tell me about stock market performance' 
        };

        await financeChat(req, res);

        expect(embedding.embedChunks).toHaveBeenCalledWith([
          'Tell me about stock market performance'
        ]);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ 
          chat: 'Mock OpenAI response',
          sources: mockSearchResults,
          originalChunks: 2,
          validatedChunks: 2,
          aiProcessed: true
        });
      });
    });

    describe('Negative Cases', () => {
      test('should deny access for non-existent user', async () => {
        req.body = { username: 'NonExistentUser', question: 'Market trends?' };

        await financeChat(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Username doesn't exists" 
        });
        
        // Verify no services were called
        expect(scraper.fetchAndExtractText).not.toHaveBeenCalled();
        expect(chunker.chunkText).not.toHaveBeenCalled();
        expect(embedding.embedChunks).not.toHaveBeenCalled();
      });

      test('should handle unknown product query', async () => {
        req.body = { 
          username: 'Admin', 
          question: 'What is the price of XYZ unknown product?' 
        };
        
        // Mock empty search results to simulate unknown product
        pineconeClient.searchSimilarChunks.mockResolvedValue([]);
        openai.validateAndImproveChunks.mockResolvedValue([]);

        await financeChat(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ 
          chat: 'Mock OpenAI response',
          sources: [],
          originalChunks: 0,
          validatedChunks: 0,
          aiProcessed: true
        });
      });

      test('should handle scraper service errors', async () => {
        req.body = { username: 'Admin', question: 'Market data?' };
        
        scraper.fetchAndExtractText.mockRejectedValue(
          new Error('Failed to scrape website')
        );

        await financeChat(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Error testing Access" 
        });
      });

      test('should handle chunker service errors', async () => {
        req.body = { username: 'Admin', question: 'Market data?' };
        
        chunker.chunkText.mockImplementation(() => {
          throw new Error('Chunking failed');
        });

        await financeChat(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Error testing Access" 
        });
      });

      test('should handle embedding service errors', async () => {
        req.body = { username: 'Admin', question: 'Market data?' };
        
        // Clear the previous mock setup and make it fail
        embedding.embedChunks.mockReset();
        embedding.embedChunks.mockRejectedValue(
          new Error('OpenAI embedding failed')
        );

        await financeChat(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Error testing Access" 
        });
      });

      test('should handle Pinecone upsert errors', async () => {
        req.body = { username: 'Admin', question: 'Market data?' };
        
        pineconeClient.upsertEmbeddings.mockRejectedValue(
          new Error('Pinecone upsert failed')
        );

        await financeChat(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Error testing Access" 
        });
      });

      test('should handle Pinecone search errors', async () => {
        req.body = { username: 'Admin', question: 'Market data?' };
        
        pineconeClient.searchSimilarChunks.mockRejectedValue(
          new Error('Pinecone search failed')
        );

        await financeChat(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Error testing Access" 
        });
      });

      test('should handle missing question parameter', async () => {
        req.body = { username: 'Admin' }; // No question

        await financeChat(req, res);

        // Should still process but with undefined question
        expect(embedding.embedChunks).toHaveBeenCalledWith([undefined]);
        expect(res.status).toHaveBeenCalledWith(200);
      });

      test('should handle empty question', async () => {
        req.body = { username: 'Admin', question: '' };

        await financeChat(req, res);

        expect(embedding.embedChunks).toHaveBeenCalledWith(['']);
        expect(res.status).toHaveBeenCalledWith(200);
      });
    });

    describe('Integration Flow', () => {
      test('should follow complete workflow in correct order', async () => {
        req.body = { username: 'Admin', question: 'Market analysis' };
        
        // Clear all mocks to ensure clean state
        jest.clearAllMocks();
        
        const callOrder = [];
        
        scraper.fetchAndExtractText.mockImplementation(async () => {
          callOrder.push('scraper');
          return mockScrapedText;
        });
        
        chunker.chunkText.mockImplementation(() => {
          callOrder.push('chunker');
          return mockChunks;
        });
        
        embedding.embedChunks
          .mockImplementationOnce(async () => {
            callOrder.push('embedding');
            return mockEmbeddings;
          })
          .mockImplementationOnce(async () => {
            callOrder.push('embedding');
            return [mockQuestionEmbedding];
          });
        
        pineconeClient.upsertEmbeddings.mockImplementation(async () => {
          callOrder.push('upsert');
        });
        
        pineconeClient.searchSimilarChunks.mockImplementation(async () => {
          callOrder.push('search');
          return mockSearchResults;
        });
        
        // Mock OpenAI services for this integration test
        openai.generateResponseFromChunks.mockResolvedValue('Mock OpenAI response');
        openai.validateAndImproveChunks.mockResolvedValue(mockSearchResults);

        await financeChat(req, res);

        expect(callOrder).toEqual([
          'scraper', 
          'chunker', 
          'embedding', 
          'upsert',
          'embedding', // For question embedding
          'search'
        ]);
      });
    });
  });
}); 