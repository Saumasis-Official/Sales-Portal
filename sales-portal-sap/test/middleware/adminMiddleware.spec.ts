import validation from '../../app/middleware/adminMiddleware';
import responseTemplate from '../../app/helper/responseTemplate';
import { AdminService } from '../../app/service/admin.service';
import { UserService } from '../../app/service/user.service';
import jwtDecode from 'jwt-decode';
import logger from '../../app/lib/logger';

jest.mock('jwt-decode');
jest.mock('../../app/service/admin.service');
jest.mock('../../app/service/user.service');
jest.mock('../../app/lib/logger');

describe('Admin Middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      headers: {
        authorization: 'Bearer token',
        'x-correlation-id': 'correlation-id',
      },
      params: {
        distributor_id: 'distributor-id',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  test('should return 403 if no token is provided', async () => {
    req.headers.authorization = null;

    await validation.validateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.tokenRequiredAuthError(),
    );
  });

  test('should return 403 if token is invalid', async () => {
    (jwtDecode as jest.Mock).mockImplementation(() => null);

    await validation.validateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.commonAuthUserDataError(),
    );
  });

  test('should call next if token is valid and user has proper role', async () => {
    (jwtDecode as jest.Mock).mockImplementation(() => ({
      client_id: global['configuration'].admin.cognitoClientId,
      username: 'test@cognitoIdpName',
    }));

    (
      UserService.getSessionInvalidateStatus as jest.Mock
    ).mockResolvedValue([]);
    (
      AdminService.adminDetailsStatement as jest.Mock
    ).mockResolvedValue({
      rows: [
        {
          roles: ['SUPER_ADMIN'],
          user_id: 'user-id',
          code: 'code',
        },
      ],
    });
    (
      AdminService.validateSuperAdminStatement as jest.Mock
    ).mockResolvedValue({
      rows: [{ some: 'data' }],
    });

    await validation.validateToken(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should return 403 if user role is not authorized', async () => {
    (jwtDecode as jest.Mock).mockImplementation(() => ({
      client_id: global['configuration'].admin.cognitoClientId,
      username: 'test@cognitoIdpName',
    }));

    (
      UserService.getSessionInvalidateStatus as jest.Mock
    ).mockResolvedValue([]);
    (
      AdminService.adminDetailsStatement as jest.Mock
    ).mockResolvedValue({
      rows: [
        {
          roles: 'UNAUTHORIZED_ROLE',
          user_id: 'user-id',
          code: 'code',
        },
      ],
    });

    await validation.validateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.error(
        'Unauthorized',
        'You are not permitted to access this resource',
      ),
    );
  });
});
