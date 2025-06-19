// Import dependencies
const jwt = require('jsonwebtoken');
import responseTemplate from '../../app/helper/responseTemplate';
import { UserService } from '../../app/service/user.service';
import validation from '../../app/middleware/authMiddleware';
import {jest, describe, test, expect, beforeEach} from '@jest/globals';

// Mocking dependencies
jest.mock('jsonwebtoken');
jest.mock('../../app/helper/responseTemplate');
jest.mock('../../app/service/user.service');

describe('validateToken Middleware', () => {
  // Mocked request and response objects, as well as the next function
  let mockReq;
  let mockRes;
  let next;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Set up mock request object
    mockReq = {
      headers: {
        authorization: 'Bearer token',
        'x-correlation-id': 'test-correlation-id',
      },
      user: null,
    };

    // Set up mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Set up mock next function
    next = jest.fn();
  });

  test('should return 403 if no token is provided', () => {
    mockReq.headers.authorization = '';
    validation.validateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(responseTemplate.tokenRequiredAuthError());
  });

  test('should return 403 if token is invalid', () => {
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(new Error('Invalid token'), null);
    });
    validation.validateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(responseTemplate.commonAuthUserDataError());
  });

  test('should call next if token is valid and session is valid', async () => {
    const decodedToken = { login_id: 'user123' };
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, decodedToken);
    });
    jest.spyOn(UserService, 'getSessionInvalidateStatus').mockResolvedValue([{ count: 0 }]);
    await validation.validateToken(mockReq, mockRes, next);
    expect(mockReq.user).toEqual(decodedToken);
    expect(next).toHaveBeenCalled();
  });

  test('should return 403 if session is invalid', async () => {
    const decodedToken = { login_id: 'user123' };
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, decodedToken);
    });
    jest.spyOn(UserService, 'getSessionInvalidateStatus').mockImplementation(() => Promise.resolve([{ count: 1 }]));
    await validation.validateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(responseTemplate.invalidSession());
  });

  test('should handle technical errors during token validation', () => {
    const error = new Error('Technical Error');
    jwt.verify.mockImplementation(() => {
      throw error;
    });
    validation.validateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(responseTemplate.error('Technical Error', 'There may some error occurred in user validation'));
  });
});