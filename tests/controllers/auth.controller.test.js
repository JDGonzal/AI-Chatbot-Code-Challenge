import { registerUser, loginUser } from '../../controllers/auth.controller.js';
import { User } from '../../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn()
}));

describe('Auth Controller', () => {
  let req, res, mockUser;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request and response objects
    req = {
      body: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock user data
    mockUser = {
      username: 'testuser',
      password: 'hashedpassword123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Reset User array to initial state before each test
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

  describe('registerUser', () => {
    describe('Positive Cases', () => {
      test('should register a new user successfully', async () => {
        req.body = { username: 'newuser', password: 'password123' };
        bcrypt.hash.mockResolvedValue('hashedpassword123');

        await registerUser(req, res);

        expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ 
          message: "User registered successfully" 
        });
        
        // Verify user was added to the array
        const addedUser = User.find(user => user.username === 'newuser');
        expect(addedUser).toBeDefined();
        expect(addedUser.password).toBe('hashedpassword123');
      });

      test('should handle valid username and password lengths', async () => {
        req.body = { username: 'abc', password: '123456' }; // minimum lengths
        bcrypt.hash.mockResolvedValue('hashedpassword123');

        await registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ 
          message: "User registered successfully" 
        });
      });
    });

    describe('Negative Cases', () => {
      test('should reject duplicate username', async () => {
        req.body = { username: 'Admin', password: 'password123' }; // existing user

        await registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Username already exists" 
        });
        expect(bcrypt.hash).not.toHaveBeenCalled();
      });

      test('should reject username too short', async () => {
        req.body = { username: 'ab', password: 'password123' }; // 2 characters

        await registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Username must be between 3-10 characters" 
        });
        expect(bcrypt.hash).not.toHaveBeenCalled();
      });

      test('should reject username too long', async () => {
        req.body = { username: 'verylongusername', password: 'password123' }; // 16 characters

        await registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Username must be between 3-10 characters" 
        });
        expect(bcrypt.hash).not.toHaveBeenCalled();
      });

      test('should reject password too short', async () => {
        req.body = { username: 'newuser', password: '12345' }; // 5 characters

        await registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Password must be between 6-20 characters" 
        });
        expect(bcrypt.hash).not.toHaveBeenCalled();
      });

      test('should reject password too long', async () => {
        req.body = { username: 'newuser', password: 'verylongpasswordthatexceeds20characters' }; // >20 characters

        await registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Password must be between 6-20 characters" 
        });
        expect(bcrypt.hash).not.toHaveBeenCalled();
      });

      test('should handle bcrypt errors', async () => {
        req.body = { username: 'newuser', password: 'password123' };
        bcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

        await registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Error registering user" 
        });
      });
    });
  });

  describe('loginUser', () => {
    describe('Positive Cases', () => {
      test('should login user successfully with valid credentials', async () => {
        req.body = { username: 'Admin', password: 'testpassword' };
        const mockToken = 'mock.jwt.token';
        
        bcrypt.hash.mockResolvedValue('hashedpassword');
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockReturnValue(mockToken);

        await loginUser(req, res);

        expect(bcrypt.compare).toHaveBeenCalledWith(
          'testpassword', 
          User[0].password
        );
        expect(jwt.sign).toHaveBeenCalledWith(
          { username: 'Admin' },
          process.env.AUTH_SEED,
          { expiresIn: '1h' }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          message: "Login successful",
          token: mockToken
        });
      });
    });

    describe('Negative Cases', () => {
      test('should reject login for non-existent user', async () => {
        req.body = { username: 'nonexistent', password: 'password123' };

        await loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "User not found" 
        });
        expect(bcrypt.compare).not.toHaveBeenCalled();
        expect(jwt.sign).not.toHaveBeenCalled();
      });

      test('should reject login with invalid password', async () => {
        req.body = { username: 'Admin', password: 'wrongpassword' };
        
        bcrypt.hash.mockResolvedValue('hashedpassword');
        bcrypt.compare.mockResolvedValue(false);

        await loginUser(req, res);

        expect(bcrypt.compare).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Invalid password" 
        });
        expect(jwt.sign).not.toHaveBeenCalled();
      });

      test('should handle bcrypt comparison errors', async () => {
        req.body = { username: 'Admin', password: 'password123' };
        
        bcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

        await loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Error logging in user" 
        });
      });

      test('should handle JWT signing errors', async () => {
        req.body = { username: 'Admin', password: 'testpassword' };
        
        bcrypt.compare.mockResolvedValue(true);
        jwt.sign.mockImplementation(() => {
          throw new Error('JWT error');
        });

        await loginUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ 
          error: "Error logging in user" 
        });
      });
    });
  });
}); 