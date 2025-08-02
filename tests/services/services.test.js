import { fetchAndExtractText } from '../../services/scraper.js';
import { chunkText } from '../../services/chunker.js';
import { embedChunks } from '../../services/embedding.js';
import { upsertEmbeddings, searchSimilarChunks } from '../../services/pineconeClient.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Mock dependencies
jest.mock('axios');
jest.mock('cheerio');
jest.mock('openai');
jest.mock('@pinecone-database/pinecone');

describe('Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Scraper Service', () => {
    describe('fetchAndExtractText', () => {
      test('should successfully fetch and extract text from webpage', async () => {
        const mockHtml = '<html><body><h1>Title</h1><p>Content here</p></body></html>';
        const mockExtractedText = 'Title Content here';
        
        axios.get.mockResolvedValue({ data: mockHtml });
        
        // Mock cheerio load function and the $ function it returns
        const mockBodySelector = {
          text: jest.fn().mockReturnValue('Title    Content    here   ')
        };
        const mock$ = jest.fn((selector) => {
          if (selector === 'body') {
            return mockBodySelector;
          }
          return mockBodySelector;
        });
        cheerio.load.mockReturnValue(mock$);

        const result = await fetchAndExtractText('https://example.com');

        expect(axios.get).toHaveBeenCalledWith('https://example.com');
        expect(cheerio.load).toHaveBeenCalledWith(mockHtml);
        expect(mock$).toHaveBeenCalledWith('body');
        expect(mockBodySelector.text).toHaveBeenCalled();
        expect(result).toBe('Title Content here');
      });

      test('should handle axios errors', async () => {
        axios.get.mockRejectedValue(new Error('Network error'));

        await expect(fetchAndExtractText('https://invalid-url.com'))
          .rejects.toThrow('Network error');
      });

      test('should handle empty response', async () => {
        const mockHtml = '<html><body></body></html>';
        
        axios.get.mockResolvedValue({ data: mockHtml });
        
        // Mock cheerio load function and the $ function it returns
        const mockBodySelector = {
          text: jest.fn().mockReturnValue('')
        };
        const mock$ = jest.fn((selector) => {
          if (selector === 'body') {
            return mockBodySelector;
          }
          return mockBodySelector;
        });
        cheerio.load.mockReturnValue(mock$);

        const result = await fetchAndExtractText('https://empty.com');
        
        expect(axios.get).toHaveBeenCalledWith('https://empty.com');
        expect(cheerio.load).toHaveBeenCalledWith(mockHtml);
        expect(mock$).toHaveBeenCalledWith('body');
        expect(result).toBe('');
      });
    });
  });

  describe('Chunker Service', () => {
    describe('chunkText', () => {
      test('should chunk text with default size', () => {
        const text = 'a'.repeat(1000);
        const chunks = chunkText(text);
        
        expect(chunks).toHaveLength(2); // 500 + 500
        expect(chunks[0]).toHaveLength(500);
        expect(chunks[1]).toHaveLength(500);
      });

      test('should chunk text with custom size', () => {
        const text = 'Hello World Test';
        const chunks = chunkText(text, 5);
        
        expect(chunks).toHaveLength(4); // "Hello", " Worl", "d Tes", "t"
        expect(chunks[0]).toBe('Hello');
        expect(chunks[1]).toBe(' Worl');
        expect(chunks[2]).toBe('d Tes');
        expect(chunks[3]).toBe('t');
      });

      test('should handle empty text', () => {
        const chunks = chunkText('');
        expect(chunks).toEqual([]);
      });

      test('should handle text smaller than chunk size', () => {
        const text = 'Short';
        const chunks = chunkText(text, 100);
        
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe('Short');
      });

      test('should handle exact chunk size', () => {
        const text = 'Exact';
        const chunks = chunkText(text, 5);
        
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe('Exact');
      });
    });
  });

  describe('Embedding Service', () => {
    let mockOpenAI;
    
    beforeEach(() => {
      mockOpenAI = {
        embeddings: {
          create: jest.fn()
        }
      };
      OpenAI.mockImplementation(() => mockOpenAI);
    });

    describe('embedChunks', () => {
      test('should create embeddings for single chunk', async () => {
        const chunks = ['Test chunk'];
        const mockEmbedding = [0.1, 0.2, 0.3];
        
        mockOpenAI.embeddings.create.mockResolvedValue({
          data: [{ embedding: mockEmbedding }]
        });

        const result = await embedChunks(chunks);

        expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
          model: 'text-embedding-3-small',
          input: 'Test chunk',
          dimensions: 1024
        });
        expect(result).toEqual([mockEmbedding]);
      });

      test('should create embeddings for multiple chunks', async () => {
        const chunks = ['Chunk 1', 'Chunk 2'];
        const mockEmbeddings = [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6]
        ];
        
        mockOpenAI.embeddings.create
          .mockResolvedValueOnce({ data: [{ embedding: mockEmbeddings[0] }] })
          .mockResolvedValueOnce({ data: [{ embedding: mockEmbeddings[1] }] });

        const result = await embedChunks(chunks);

        expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2);
        expect(result).toEqual(mockEmbeddings);
      });

      test('should handle OpenAI API errors', async () => {
        const chunks = ['Test chunk'];
        
        mockOpenAI.embeddings.create.mockRejectedValue(
          new Error('OpenAI API error')
        );

        await expect(embedChunks(chunks))
          .rejects.toThrow('OpenAI API error');
      });

      test('should handle empty chunks array', async () => {
        const chunks = [];
        const result = await embedChunks(chunks);
        
        expect(result).toEqual([]);
        expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Pinecone Client Service', () => {
    let mockIndex, mockPinecone;
    
    beforeEach(() => {
      mockIndex = {
        upsert: jest.fn(),
        query: jest.fn()
      };
      
      mockPinecone = {
        Index: jest.fn().mockReturnValue(mockIndex)
      };
      
      Pinecone.mockImplementation(() => mockPinecone);
    });

    describe('upsertEmbeddings', () => {
      test('should upsert embeddings successfully', async () => {
        const embeddings = [[0.1, 0.2], [0.3, 0.4]];
        const chunks = ['chunk1', 'chunk2'];
        
        mockIndex.upsert.mockResolvedValue({});

        await upsertEmbeddings(embeddings, chunks);

        expect(mockIndex.upsert).toHaveBeenCalledWith([
          {
            id: 'chunk-0',
            values: [0.1, 0.2],
            metadata: { text: 'chunk1' }
          },
          {
            id: 'chunk-1',
            values: [0.3, 0.4],
            metadata: { text: 'chunk2' }
          }
        ]);
      });

      test('should handle Pinecone upsert errors', async () => {
        const embeddings = [[0.1, 0.2]];
        const chunks = ['chunk1'];
        
        mockIndex.upsert.mockRejectedValue(new Error('Pinecone error'));

        await expect(upsertEmbeddings(embeddings, chunks))
          .rejects.toThrow('Pinecone error');
      });

      test('should handle empty embeddings', async () => {
        const embeddings = [];
        const chunks = [];
        
        mockIndex.upsert.mockResolvedValue({});

        await upsertEmbeddings(embeddings, chunks);

        expect(mockIndex.upsert).toHaveBeenCalledWith([]);
      });
    });

    describe('searchSimilarChunks', () => {
      test('should search and return similar chunks', async () => {
        const queryEmbedding = [0.1, 0.2, 0.3];
        const mockResults = {
          matches: [
            { metadata: { text: 'Similar chunk 1' } },
            { metadata: { text: 'Similar chunk 2' } }
          ]
        };
        
        mockIndex.query.mockResolvedValue(mockResults);

        const result = await searchSimilarChunks(queryEmbedding, 2);

        expect(mockIndex.query).toHaveBeenCalledWith({
          vector: queryEmbedding,
          topK: 2,
          includeMetadata: true
        });
        expect(result).toEqual(['Similar chunk 1', 'Similar chunk 2']);
      });

      test('should use default topK value', async () => {
        const queryEmbedding = [0.1, 0.2, 0.3];
        const mockResults = { matches: [] };
        
        mockIndex.query.mockResolvedValue(mockResults);

        await searchSimilarChunks(queryEmbedding);

        expect(mockIndex.query).toHaveBeenCalledWith({
          vector: queryEmbedding,
          topK: 3, // default value
          includeMetadata: true
        });
      });

      test('should handle Pinecone query errors', async () => {
        const queryEmbedding = [0.1, 0.2, 0.3];
        
        mockIndex.query.mockRejectedValue(new Error('Pinecone query error'));

        await expect(searchSimilarChunks(queryEmbedding))
          .rejects.toThrow('Pinecone query error');
      });

      test('should handle empty search results', async () => {
        const queryEmbedding = [0.1, 0.2, 0.3];
        const mockResults = { matches: [] };
        
        mockIndex.query.mockResolvedValue(mockResults);

        const result = await searchSimilarChunks(queryEmbedding);

        expect(result).toEqual([]);
      });
    });
  });
}); 