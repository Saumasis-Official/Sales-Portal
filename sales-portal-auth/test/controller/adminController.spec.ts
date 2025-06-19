import { Request, Response } from 'express';
import AdminController from '../../app/controller/AdminController';
import { AdminService } from '../../app/service/AdminService';
import responseTemplate from '../../app/helper/responseTemplate';
import { ErrorMessage } from '../../app/constant/error.message';
import { SuccessMessage } from '../../app/constant/sucess.message';
import logger from '../../app/lib/logger';
import Template  from '../../app/helper/responseTemplate';

jest.mock('../../app/service/AdminService');
jest.mock('../../app/lib/logger');
jest.mock('../../app/constant/error.message');
jest.mock('../../app/constant/sucess.message');
jest.mock('../../app/helper/responseTemplate');

describe('getCfaDepotMapping Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test('should return CFA data successfully', async () => {
    const mockCfaData = [{ id: 1, name: 'CFA1' }];
    const mockSuccessResponse = {
      success: true,
      message: SuccessMessage.GET_CFA_DATA_SUCCESS,
    };

    (AdminService.getCfaDepotMapping as jest.Mock).mockResolvedValue(
      mockCfaData,
    );

    await AdminController.getCfaDepotMapping(
      req as Request,
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.success(
        mockCfaData,
        SuccessMessage.GET_CFA_DATA_SUCCESS,
      ),
    );
  });

  test('should handle error while fetching CFA data', async () => {
    const mockErrorMessage = 'Error fetching CFA data';
    const mockErrorResponse = {
      error: 'Bad Request',
      message: ErrorMessage.ERROR_WHILE_FETCHING_CFA_DATA,
    };

    (AdminService.getCfaDepotMapping as jest.Mock).mockRejectedValue(
      new Error(mockErrorMessage),
    );

    await AdminController.getCfaDepotMapping(
      req as Request,
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.error(
        'Bad Request',
        ErrorMessage.ERROR_WHILE_FETCHING_CFA_DATA,
      ),
    );
    expect(logger.error).toHaveBeenCalledWith(
      `inside AdminController -> getCfaDepotMapping Error in CFA Data:`,
      expect.any(Error),
    );
  });
});
describe('insertCfaDepotMapping Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {
        zone: 'Zone A',
        depot_code: 'DEP001',
        sales_org: 'SalesOrg123',
        distribution_channel: 'Channel1',
        division: 'DivisionXYZ',
        location: 'LocationXYZ',
        name: 'CFA Depot',
        address: '123 CFA Street',
        email: 'cfa@example.com',
        contact_person: 'John Doe',
        contact_number: '1234567890',
        zone_manager_email: 'zone.manager@example.com',
        cluster_manager_email: 'cluster.manager@example.com',
        logistic_email: 'logistic@example.com',
        remarks: 'Test remarks',
      },
      user: {
        user_id: 'user123',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test('should insert CFA depot mapping successfully', async () => {
    const mockSuccessResponse = {
      success: true,
      message: SuccessMessage.INSERT_CFA_DEPOT_MAPPING,
    };

    (
      AdminService.insertCfaDepotMapping as jest.Mock
    ).mockResolvedValue(true);

    await AdminController.insertCfaDepotMapping(
      req as Request,
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.successMessage(
        SuccessMessage.INSERT_CFA_DEPOT_MAPPING,
      ),
    );
  });

  test('should handle error while inserting CFA depot mapping', async () => {
    const mockErrorMessage = 'Error inserting CFA depot mapping';
    const mockErrorResponse = {
      error: 'Bad Request',
      message: ErrorMessage.INSERT_CFA_DATA,
    };

    (
      AdminService.insertCfaDepotMapping as jest.Mock
    ).mockRejectedValue(new Error(mockErrorMessage));

    await AdminController.insertCfaDepotMapping(
      req as Request,
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.error(
        'Bad Request',
        ErrorMessage.INSERT_CFA_DATA,
      ),
    );
    expect(logger.error).toHaveBeenCalledWith(
      'inside AdminCtroller -> insertCfaDepotMapping Error in CFA Data:',
      expect.any(Error),
    );
  });
});
describe('updateCfaDepotMapping Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {
        depot_code: 'DEP001',
        sales_org: 'SalesOrg123',
        distribution_channel: 'Channel1',
        division: 'DivisionXYZ',
        location: 'LocationXYZ',
        name: 'Updated CFA Depot',
        address: '123 Updated CFA Street',
        email: 'updated_cfa@example.com',
        contact_person: 'Jane Doe',
        contact_number: '9876543210',
        zone_manager_email: 'updated_zone.manager@example.com',
        cluster_manager_email: 'updated_cluster.manager@example.com',
        is_deleted: false,
        logistic_email: 'updated_logistic@example.com',
        remarks: 'Updated remarks',
      },
      user: {
        user_id: 'user123',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test('should update CFA depot mapping successfully', async () => {
    const mockSuccessResponse = {
      rowCount: 1,
    };

    (
      AdminService.updateCfaDepotMapping as jest.Mock
    ).mockResolvedValue(mockSuccessResponse);

    await AdminController.updateCfaDepotMapping(
      req as Request,
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.successMessage(
        SuccessMessage.UPDATED_CFA_DEPOT_MAPPING,
      ),
    );
  });

  test('should handle error while updating CFA depot mapping', async () => {
    const mockErrorMessage = 'Error updating CFA depot mapping';
    const mockErrorResponse = {
      error: 'Bad Request',
      message: ErrorMessage.UPDATED_CFA_DATA_ERROR,
    };

    (
      AdminService.updateCfaDepotMapping as jest.Mock
    ).mockRejectedValue(new Error(mockErrorMessage));

    await AdminController.updateCfaDepotMapping(
      req as Request,
      res as Response,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.error(
        'Bad Request',
        ErrorMessage.UPDATED_CFA_DATA_ERROR,
      ),
    );
    expect(logger.error).toHaveBeenCalledWith(
      'inside AdminCtroller-> updateCFADepotMapping Error in CFA Data:',
      expect.any(Error),
    );
  });
});

describe('updateMultiplePdpUnlockRequests Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {
        data: [
          { request_id: 'PU-1234-123456', status: 'APPROVED' },
          { request_id: 'PU-5678-654321', status: 'REJECTED' },
        ],
      },
      user: {
        user_id: 'user123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test('should update multiple PDP unlock requests successfully', async () => {
    const mockSuccessResponse = [
      { request_id: 'PU-1234-123456', success: true, message: 'Request approved' },
      { request_id: 'PU-5678-654321', success: true, message: 'Request rejected' },
    ];

    (AdminService.updateMultiplePdpUnlockRequests as jest.Mock).mockResolvedValue(mockSuccessResponse);

    await AdminController.updateMultiplePdpUnlockRequests(req as Request, res as Response);

    expect(AdminService.updateMultiplePdpUnlockRequests).toHaveBeenCalledWith(
      req.body.data,
      req.user.user_id,
      req.user.email,
      `${req.user.first_name} ${req.user.last_name}`
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      responseTemplate.success(mockSuccessResponse, SuccessMessage.UPDATE_PDP_UNLOCK_REQUEST)
    );
  });

  test('should handle empty request array', async () => {
    req.body.data = [];

    await AdminController.updateMultiplePdpUnlockRequests(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(responseTemplate.errorMessage('Empty request array'));
  });

  test('should handle error during update multiple PDP unlock requests', async () => {
    const mockErrorMessage = 'Error updating PDP unlock requests';

    (AdminService.updateMultiplePdpUnlockRequests as jest.Mock).mockRejectedValue(new Error(mockErrorMessage));

    await AdminController.updateMultiplePdpUnlockRequests(req as Request, res as Response);

    expect(AdminService.updateMultiplePdpUnlockRequests).toHaveBeenCalledWith(
      req.body.data,
      req.user.user_id,
      req.user.email,
      `${req.user.first_name} ${req.user.last_name}`
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(responseTemplate.error(ErrorMessage.TECHNICAL_ERROR));
    expect(logger.error).toHaveBeenCalledWith(
      'inside AdminController -> updateMultiplePdpUnlockRequests, Error: ',
      expect.any(Error)
    );
  });

  test('should handle update failure', async () => {
    const mockFailureResponse = [];

    (AdminService.updateMultiplePdpUnlockRequests as jest.Mock).mockResolvedValue(mockFailureResponse);

    await AdminController.updateMultiplePdpUnlockRequests(req as Request, res as Response);

    expect(AdminService.updateMultiplePdpUnlockRequests).toHaveBeenCalledWith(
      req.body.data,
      req.user.user_id,
      req.user.email,
      `${req.user.first_name} ${req.user.last_name}`
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(responseTemplate.error(ErrorMessage.UPDATE_PDP_UNLOCK_REQUEST));
  });
});

describe('insertApprovedPDPUnlockRequest Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {
        plant_codes: ['1258', '1226'],
        start_date: '2025-02-06',
        end_date: '2025-02-07',
        comments: 'PDP unlock plant wise by CFA',
        customer_groups: [], dist_channels: [], regions: [], area_codes: [], states: [], 
      },
      user: {
        user_id: 'user123',
        roles: ['ADMIN'],
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test('should insert approved PDP unlock request successfully', async () => {
    const mockSuccessResponse = { success: true };

    (AdminService.insertApprovedPDPUnlockRequest as jest.Mock).mockResolvedValue(mockSuccessResponse);

    await AdminController.insertApprovedPDPUnlockRequest(req as Request, res as Response);

    expect(AdminService.insertApprovedPDPUnlockRequest).toHaveBeenCalledWith(
      req.body.customer_groups, 
      req.body.dist_channels, 
      req.body.regions, 
      req.body.area_codes, 
      req.body.states, 
      req.body.plant_codes,
      req.body.start_date,
      req.body.end_date,
      req.body.comments,
      req.user.user_id,
      req.user.roles
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(Template.success(mockSuccessResponse, SuccessMessage.INSERT_APPROVED_PDP_UNLOCK_REQUEST));
  });

  test('should handle failure to insert approved PDP unlock request', async () => {
    (AdminService.insertApprovedPDPUnlockRequest as jest.Mock).mockResolvedValue(null);

    await AdminController.insertApprovedPDPUnlockRequest(req as Request, res as Response);

    expect(AdminService.insertApprovedPDPUnlockRequest).toHaveBeenCalledWith(
      req.body.customer_groups, 
      req.body.dist_channels, 
      req.body.regions, 
      req.body.area_codes, 
      req.body.states,
      req.body.plant_codes,
      req.body.start_date,
      req.body.end_date,
      req.body.comments,
      req.user.user_id,
      req.user.roles
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(Template.errorMessage(ErrorMessage.INSERT_APPROVED_PDP_UNLOCK_REQUEST));
  });

  test('should handle error during insert approved PDP unlock request', async () => {
    const mockError = new Error('Test error');

    (AdminService.insertApprovedPDPUnlockRequest as jest.Mock).mockRejectedValue(mockError);

    await AdminController.insertApprovedPDPUnlockRequest(req as Request, res as Response);

    expect(AdminService.insertApprovedPDPUnlockRequest).toHaveBeenCalledWith(
      req.body.customer_groups, 
      req.body.dist_channels, 
      req.body.regions, 
      req.body.area_codes, 
      req.body.states,
      req.body.plant_codes,
      req.body.start_date,
      req.body.end_date,
      req.body.comments,
      req.user.user_id,
      req.user.roles
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(Template.internalServerError());
    expect(logger.error).toHaveBeenCalledWith('inside AdminController -> insertApprovedPDPUnlockRequest, Error: ', mockError);
  });
});
