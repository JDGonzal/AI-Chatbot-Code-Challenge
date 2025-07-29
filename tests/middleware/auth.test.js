import { auth } from '../../middleware/auth.js';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      headers: {},
      user: null
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
  });

  describe('Positive Cases', () => {
    test('should authenticate with valid token', () => {
      const mockToken = 'valid.jwt.token';
      const mockDecodedUser = { username: 'testuser' };
      
      req.headers['x-auth-token'] = mockToken;
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockDecodedUser);
      });

      auth(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(
        mockToken,
        process.env.AUTH_SEED,
        expect.any(Function)
      );
      expect(req.user).toEqual(mockDecodedUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('should attach correct user information to request', () => {
      const mockToken = 'valid.jwt.token';
      const mockDecodedUser = { 
        username: 'admin', 
        iat: 1234567890, 
        exp: 1234571490 
      };
      
      req.headers['x-auth-token'] = mockToken;
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockDecodedUser);
      });

      auth(req, res, next);

      expect(req.user).toEqual(mockDecodedUser);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Negative Cases', () => {
    test('should reject request with no token', () => {
      // No token provided
      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: "No token provided" 
      });
      expect(next).not.toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    test('should reject request with empty token', () => {
      req.headers['x-auth-token'] = '';
      
      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: "No token provided" 
      });
      expect(next).not.toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    test('should reject request with null token', () => {
      req.headers['x-auth-token'] = null;
      
      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: "No token provided" 
      });
      expect(next).not.toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    test('should reject request with invalid token', () => {
      const mockToken = 'invalid.jwt.token';
      const mockError = new Error('Invalid token');
      
      req.headers['x-auth-token'] = mockToken;
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(mockError, null);
      });

      auth(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(
        mockToken,
        process.env.AUTH_SEED,
        expect.any(Function)
      );
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        error: "Failed to authenticate token" 
      });
      expect(next).not.toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    test('should reject request with expired token', () => {
      const mockToken = 'expired.jwt.token';
      const mockError = new Error('TokenExpiredError');
      mockError.name = 'TokenExpiredError';
      
      req.headers['x-auth-token'] = mockToken;
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(mockError, null);
      });

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        error: "Failed to authenticate token" 
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request with malformed token', () => {
      const mockToken = 'malformed-token-without-dots';
      const mockError = new Error('JsonWebTokenError');
      mockError.name = 'JsonWebTokenError';
      
      req.headers['x-auth-token'] = mockToken;
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(mockError, null);
      });

      auth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ 
        error: "Failed to authenticate token" 
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle JWT verification throwing synchronous error', () => {
      const mockToken = 'problematic.jwt.token';
      
      req.headers['x-auth-token'] = mockToken;
      jwt.verify.mockImplementation(() => {
        throw new Error('Synchronous JWT error');
      });

      expect(() => auth(req, res, next)).toThrow('Synchronous JWT error');
    });

    test('should handle different header case sensitivity', () => {
      const mockToken = 'valid.jwt.token';
      const mockDecodedUser = { username: 'testuser' };
      
      // Test with different case - should still work as headers are case-insensitive in HTTP
      req.headers['X-Auth-Token'] = mockToken;
      // But our middleware specifically looks for 'x-auth-token'
      
      auth(req, res, next);

      // Should fail because header key doesn't match exactly
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: "No token provided" 
      });
    });
  });
}); 