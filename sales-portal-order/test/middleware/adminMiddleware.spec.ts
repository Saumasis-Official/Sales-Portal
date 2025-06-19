import jwtDecode from 'jwt-decode';
import responseTemplate from '../../app/helper/responseTemplate';
import { AdminService } from '../../app/service/admin.service';
import { UserService } from '../../app/service/user.service';
import validation from '../../app/middleware/adminMiddleware';
import logger from '../../app/lib/logger';
import { ErrorMessage } from '../../app/constants/errorMessage';
import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
} from '@jest/globals';

// Mocking dependencies
jest.mock('jwt-decode');
jest.mock('../../app/helper/responseTemplate');
jest.mock('../../app/service/admin.service');
jest.mock('../../app/service/user.service');
jest.mock('../../app/lib/logger');
jest.mock('../../app/constants/errorMessage');

// Create a type alias to add `mockReturnValue` property.
const mockJwtDecode = jwtDecode as jest.MockedFunction<
  typeof jwtDecode
>;
describe('validateToken Middleware', () => {
  let mockReq;
  let mockRes;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {
        authorization: 'Bearer token',
        'x-correlation-id': 'test-correlation-id',
      },
      params: {
        distributor_id: 'distributor123',
      },
      user: null,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test('should return 403 if no token is provided', () => {
    mockReq.headers.authorization = '';
    validation.validateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      responseTemplate.tokenRequiredAuthError(),
    );
  });

  test('should return 403 if client_id does not match', () => {
    const payload = { client_id: 'wrongClientId' };
    mockJwtDecode.mockReturnValue(payload);
    validation.validateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      responseTemplate.commonAuthUserDataError(),
    );
  });

  test('should return 403 if session is invalid', async () => {
    const payload = {
      client_id: 'correctClientId',
      username: 'user@domain.com',
    };
    mockJwtDecode.mockReturnValue(payload);
    jest
      .spyOn(UserService, 'getSessionInvalidateStatus')
      .mockResolvedValue([{ count: 1 }]);
    await validation.validateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      responseTemplate.invalidSession(),
    );
  });

  test('should return 403 if admin details are not found', async () => {
    const payload = {
      client_id: 'correctClientId',
      username: 'user@domain.com',
    };
    mockJwtDecode.mockReturnValue(payload);
    jest
      .spyOn(UserService, 'getSessionInvalidateStatus')
      .mockResolvedValue([{ count: 0 }]);
    (
      AdminService.adminDetailsStatement as jest.Mock
    ).mockResolvedValue({ rows: [] } as never);
    await validation.validateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      responseTemplate.error(
        'Unauthorized',
        ErrorMessage.PERMISSION_ISSUE,
      ),
    );
  });

  test('should return 403 if admin is SUPER_ADMIN and distributor is not validated', async () => {
    const payload = {
      client_id: 'correctClientId',
      username: 'user@domain.com',
    };
    mockJwtDecode.mockReturnValue(payload);
    jest
      .spyOn(UserService, 'getSessionInvalidateStatus')
      .mockResolvedValue([{ count: 0 }] as any);
    jest
      .spyOn(AdminService, 'adminDetailsStatement')
      .mockResolvedValue({
        rows: [
          {
            roles: 'SUPER_ADMIN',
            user_id: 'admin123',
            code: 'code123',
          },
        ],
      } as never);
    (
      AdminService.validateSuperAdminStatement as jest.Mock
    ).mockResolvedValue({ rows: [] } as never);
    await validation.validateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      responseTemplate.error(
        'Unauthorized',
        ErrorMessage.PERMISSION_ISSUE,
      ),
    );
  });

  test('should handle technical errors during token validation', () => {
    const error = new Error('Technical Error');
    mockJwtDecode.mockImplementation(() => {
      throw error;
    });
    validation.validateToken(mockReq, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith(
      responseTemplate.error(
        'Technical Error',
        'There may some error occurred in user validation',
      ),
    );
  });
});
