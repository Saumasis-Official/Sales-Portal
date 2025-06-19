import jwt from 'jsonwebtoken';

import validation from '../../app/middleware/authMiddleware';

import { UserService } from '../../../sales-portal-sap/app/service/user.service';
import responseTemplate from '../../app/helper/responseTemplate';

jest.mock('jsonwebtoken');
jest.mock('../../../sales-portal-sap/app/service/user.service');
jest.mock('../../app/helper/responseTemplate');

describe('validateToken', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      headers: {
        authorization: 'Bearer token',
        'x-correlation-id': 'correlation-id',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call next if token is valid and session is not invalidated', async () => {
    const decodedToken = { login_id: 'user-id' };
    (jwt.verify as jest.Mock).mockImplementation(
      (token, secret, callback) => {
        callback(null, decodedToken);
      },
    );
    (
      UserService.getSessionInvalidateStatus as jest.Mock
    ).mockResolvedValue([{ count: '0' }]);

    await validation.validateToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      'Bearer token',
      process.env.SECRET_KEY,
      expect.any(Function),
    );
    expect(
      UserService.getSessionInvalidateStatus,
    ).toHaveBeenCalledWith('user-id', 'correlation-id');
    expect(next).toHaveBeenCalled();
  });

  test('should return 403 if token is invalid', async () => {
    (jwt.verify as jest.Mock).mockImplementation(
      (token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      },
    );

    await validation.validateToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      'Bearer token',
      process.env.SECRET_KEY,
      expect.any(Function),
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.commonAuthUserDataError(),
    );
  });

  test('should return 403 if session is invalidated', async () => {
    const decodedToken = { login_id: 'user-id' };
    (jwt.verify as jest.Mock).mockImplementation(
      (token, secret, callback) => {
        callback(null, decodedToken);
      },
    );
    (
      UserService.getSessionInvalidateStatus as jest.Mock
    ).mockResolvedValue([{ count: '1' }]);

    await validation.validateToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith(
      'Bearer token',
      process.env.SECRET_KEY,
      expect.any(Function),
    );
    expect(
      UserService.getSessionInvalidateStatus,
    ).toHaveBeenCalledWith('user-id', 'correlation-id');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.invalidSession(),
    );
  });

  test('should return 403 if token is not provided', async () => {
    req.headers.authorization = null;

    await validation.validateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.tokenRequiredAuthError(),
    );
  });

  test('should return 403 if an error occurs during validation', async () => {
    const error = new Error('Technical Error');
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw error;
    });

    await validation.validateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.error(
        'Technical Error',
        'There may some error occurred in user validation',
      ),
    );
  });
});
