import { Request, Response } from 'express';
import AuthController from '../../app/controller/AuthController';
import { AuthService } from '../../app/service/authService';
import Template from '../../app/helper/responseTemplate';
import { ErrorMessage } from '../../app/constant/error.message';

jest.mock('../../app/service/authService');
jest.mock('../../app/helper/responseTemplate');
jest.mock('../../app/constant/error.message');

describe('AdminRouter', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {
        status: 'OPEN',
        duration: 120,
        remark: 'Test maintenance',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /add-maintenance-status should handle authorized user', async () => {
    const mockResponse = {
      success: true,
      message: 'Maintenance added',
    };
    (AuthService.addnewmaintenance as jest.Mock).mockResolvedValue(
      mockResponse,
    );

    req.user = {
      user_id: 'TCPL_23349430',
      first_name: 'SHIVANSH',
      last_name: 'BOHRA',
      roles: 'SUPER_ADMIN',
    };
    await AuthController.addNewMaintenanceStatus(
      req as Request,
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResponse);
  });

  test('POST /add-maintenance-status should handle unauthorized user', async () => {
    req.user = undefined;
    await AuthController.addNewMaintenanceStatus(
      req as Request,
      res as Response,
    );

    // Assertions
    expect(res.json).toHaveBeenCalledWith(
      Template.errorMessage(ErrorMessage.UNAUTHORIZED),
    );
    expect(AuthService.addnewmaintenance).not.toHaveBeenCalled();
  });
});
