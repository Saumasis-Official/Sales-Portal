import jwt, { Secret } from 'jsonwebtoken';
import validation from '../../app/middleware/authMiddleware';
import responseTemplate from '../../app/helper/responseTemplate';
import { AuthService } from '../../app/service/authService';
import AuthController from '../../app/controller/AuthController';

jest.mock('jsonwebtoken');
jest.mock('../../app/helper/responseTemplate');
jest.mock('../../app/service/authService');
jest.mock('../../app/controller/AuthController');

describe('validateToken Middleware', () => {
  interface Request {
    headers: {
      authorization: string;
      'x-correlation-id': string;
    };
  }

  const mockRequest = (token: any): Request => ({
    headers: {
      authorization: token,
      'x-correlation-id': 'test-correlation-id',
    },
  });

  interface Response {
    status: jest.Mock<any, any>;
    json: jest.Mock<any, any>;
  }

  const mockResponse = (): Response => {
    const res: Response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    return res;
  };

  const nextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 403 if no token is provided', () => {
    const req = mockRequest(null);
    const res = mockResponse();

    validation.validateToken(req, res, nextFunction);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.tokenRequiredAuthError(),
    );
  });

  test('should return 403 if token is invalid', () => {
    const req = mockRequest('invalid-token');
    const res = mockResponse();
    (
      jwt.verify as jest.Mock<any, any> & {
        mockImplementation: jest.Mock<any, any>;
      }
    ).mockImplementation((token, secret, callback) => {
      callback(new Error('Invalid token'), null);
    }) as jest.Mock<any, any> & {
      mockImplementation?: jest.Mock<any, any>;
    };

    validation.validateToken(req, res, nextFunction);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.commonAuthUserDataError(),
    );
  });

  test('should call next if token is valid', async () => {
    const req = mockRequest('valid-token') as {
      headers: { authorization: any; 'x-correlation-id': string };
      user?: any;
    };
    const res = mockResponse();
    const decoded = { login_id: 'user123' };

    // Cast jwt.verify to a Jest mock
    (jwt.verify as jest.Mock).mockImplementation(
      (token: string, secret: Secret, callback: Function) => {
        callback(null, decoded);
      },
    );

    const mockUser = { id: 'user123', password: 'hashed_password' };
    (
      AuthController.getUserByDistributorId as jest.Mock
    ).mockImplementation((id, callback) => {
      callback(null, mockUser);
    });

    jest
      .spyOn(AuthService, 'getSessionInvalidateStatus')
      .mockResolvedValue([{ count: 0 }]);

    await validation.validateToken(req, res, nextFunction);

    expect(req.user).toEqual(mockUser);
    expect(nextFunction).toHaveBeenCalled();
  });
  test('should return 403 if token is invalid', () => {
    const req = mockRequest('invalid-token');
    const res = mockResponse();

    (jwt.verify as jest.Mock).mockImplementation(
      (token: string, secret: Secret, callback: Function) => {
        callback(new Error('Invalid token'), null);
      },
    );

    validation.validateToken(req, res, nextFunction);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.commonAuthUserDataError(),
    );
  });
  test('should return 403 if user retrieval fails', async () => {
    const req = mockRequest('valid-token');
    const res = mockResponse();
    const decoded = { login_id: 'user123' };

    (jwt.verify as jest.Mock).mockImplementation(
      (token: string, secret: Secret, callback: Function) => {
        callback(null, decoded);
      },
    );

    (
      AuthController.getUserByDistributorId as jest.Mock
    ).mockImplementation((id, callback) => {
      callback(new Error('User not found'), null);
    });

    await validation.validateToken(req, res, nextFunction);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.commonAuthUserDataError(),
    );
  });
  test('should return 403 if session is invalid', async () => {
    const req = mockRequest('valid-token');
    const res = mockResponse();
    const decoded = { login_id: 'user123' };

    (jwt.verify as jest.Mock).mockImplementation(
      (token: string, secret: Secret, callback: Function) => {
        callback(null, decoded);
      },
    );

    const mockUser = { id: 'user123', password: 'hashed_password' };

    (
      AuthController.getUserByDistributorId as jest.Mock
    ).mockImplementation((id, callback) => {
      callback(null, mockUser);
    });

    jest
      .spyOn(AuthService, 'getSessionInvalidateStatus')
      .mockResolvedValue([{ count: 1 }])

    await validation.validateToken(req, res, nextFunction);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.invalidSession(),
    );
  });
});
