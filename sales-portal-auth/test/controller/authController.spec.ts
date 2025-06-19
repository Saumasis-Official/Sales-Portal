import { AuthService } from '../../app/service/authService';
import Template from '../../app/helper/responseTemplate';
import { ErrorMessage } from '../../app/constant/error.message';
import logger from '../../app/lib/logger';
import authController from '../../app/controller/AuthController';

jest.mock('../../app/service/authService');
jest.mock('../../app/lib/logger');
jest.mock('../../app/constant/error.message');
jest.mock('../../app/constant/sucess.message');
jest.mock('../../app/helper/responseTemplate');

describe('addNewMaintenanceStatus Controller', () => {
  const mockUser = {
    user_id: 'TCPL_23349430',
    first_name: 'SHIVANSH',
    last_name: 'BOHRA',
    roles: 'SUPER_ADMIN',
  };

  let req: {
    user: {
      user_id: string;
      first_name: string;
      last_name: string;
      roles: string;
    };
    body: {
      status: string;
      duration: number;
      remark: string;
    };
  };
  let res: {
    status: (code: number) => any;
    json: (data: any) => any;
  };

  beforeEach(() => {
    req = {
      user: mockUser,
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

    jest.clearAllMocks();
  });

  test('should add new maintenance status when user is authorized', async () => {
    const mockResponse = {
      success: true,
      message: 'Maintenance added',
    };
    AuthService.addnewmaintenance = jest
      .fn()
      .mockResolvedValue(mockResponse);

    await authController.addNewMaintenanceStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResponse);
    expect(AuthService.addnewmaintenance).toHaveBeenCalledWith(
      req.body,
      mockUser.user_id,
      `${mockUser.first_name} ${mockUser.last_name}`,
    );
  });

  test('should return unauthorized error for non-authorized roles', async () => {
    req.user.roles = 'USER';

    await authController.addNewMaintenanceStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(
      Template.errorMessage(ErrorMessage.UNAUTHORIZED),
    );
  });
});

describe('getMaintenanceStatus Controller', () => {
  let req: any, res: any;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test('should return maintenance status when retrieved successfully', async () => {
    const mockResponse = {
      rows: [
        { id: 1, status: 'OPEN' },
        { id: 2, status: 'CLOSED' },
      ],
    };
    (AuthService.getMaintenanceStatus as jest.Mock).mockResolvedValue(
      mockResponse,
    );

    await authController.getMaintenanceStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResponse.rows);
    expect(logger.info).toHaveBeenCalledWith(
      'inside get maintenance status',
      req.body,
    );
  });

  test('should return 500 and error message on service failure', async () => {
    const errorMessage = 'Service error';
    (AuthService.getMaintenanceStatus as jest.Mock).mockRejectedValue(
      new Error(errorMessage),
    );

    await authController.getMaintenanceStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      Template.error('Error in fetching maintenance status'),
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error in getting maintenance status:',
      expect.any(Error),
    );
  });
});
describe('updateMaintenanceStatus Controller', () => {
  let req: any, res: any;

  beforeEach(() => {
    req = {
      user: {
        user_id: 'TCPL_23349430',
        first_name: 'SHIVANSH',
        last_name: 'BOHRA',
        roles: 'SUPER_ADMIN',
      },
      body: {
        status: 'OPEN',
        duration: 120,
        remark: 'Test update maintenance',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  test('should update maintenance status when user is authorized', async () => {
    const mockResponse = {
      success: true,
      message: 'Maintenance status updated',
    };
    (AuthService.updateMaintenance as jest.Mock).mockResolvedValue(
      mockResponse,
    );

    await authController.updateMaintenanceStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResponse);
    expect(AuthService.updateMaintenance).toHaveBeenCalledWith(
      req.body,
      req.user.user_id,
      `${req.user.first_name} ${req.user.last_name}`,
    );
    expect(logger.info).toHaveBeenCalledWith(
      'inside start maintenance',
      req.body,
    );
  });

  test('should return 500 and error message on service failure', async () => {
    const errorMessage = 'Service error';
    (AuthService.updateMaintenance as jest.Mock).mockRejectedValue(
      new Error(errorMessage),
    );

    await authController.updateMaintenanceStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      Template.error(
        'Technical Error',
        'There is some issue occurred while Updating maintenance status.',
      ),
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error Updating Maintenace status',
      expect.any(Error),
    );
    expect(logger.info).toHaveBeenCalledWith(
      'inside start maintenance',
      req.body,
    );
  });
});
