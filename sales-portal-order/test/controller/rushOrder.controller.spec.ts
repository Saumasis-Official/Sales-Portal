import { Request, Response } from 'express';
import {
  jest,
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
} from '@jest/globals';
import { RushOrderService } from '../../app/service/rushOrder.service';
import Template from '../../app/helper/responseTemplate';
import RushOrderController from '../../app/controller/rushOrder.controller';
import { SuccessMessage } from '../../app/constants/successMessage';
import { ErrorMessage } from '../../app/constants/errorMessage';
import { LogService } from '../../app/service/LogService';

describe('RushOrderController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  const user = {
    user_id: 'test_user_id',
    roles: 'SUPER_ADMIN',
    first_name: 'test_fname',
    last_name: 'test_lname',
    email: 'test_email',
  };
  describe('updateMultipleOrderRequests', () => {
    beforeEach(() => {
      req = {
        body: {
          data: [
            {
              po_number: 'test_po',
              distributor_id: 'test_distributor',
              status: 'APPROVE',
            },
          ],
        },
        user: user,
      } as Partial<Request>;
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Partial<Response>;
      statusMock = res.status as jest.Mock;
      jsonMock = res.json as jest.Mock;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return 200 and success template when result is found', async () => {
      const result = [
        {
          po_number: 'test_po',
          success: true,
          message: 'Request updated successfully',
        },
      ];
      const mockResponse = {
        success: true,
        message: 'Requests updated successfully',
        data: result,
      };
      jest
        .spyOn(RushOrderService, 'updateMultipleOrderRequests')
        .mockImplementation(() => Promise.resolve(mockResponse));
      jest
        .spyOn(Template, 'success')
        .mockReturnValue({ success: true });

      await RushOrderController.updateMultipleOrderRequests(
        req as Request,
        res as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        Template.success(
          result,
          SuccessMessage.UPDATE_RUSH_ORDER_REQUEST,
        ),
      );
    });

    it('should handle error during update multiple rush order requests', async () => {
      const mockError = {
        message: 'Internal Server Error, try again later',
        success: false,
      };
      // const mockError = new Error('Test error');
      jest
        .spyOn(RushOrderService, 'updateMultipleOrderRequests')
        .mockRejectedValue(new Error('Test error'));
      jest.spyOn(Template, 'error').mockReturnValue(mockError);

      await RushOrderController.updateMultipleOrderRequests(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.updateMultipleOrderRequests,
      ).toHaveBeenCalledWith(
        req.body.data,
        user.user_id,
        user.roles,
        `${user.first_name} ${user.last_name}`,
        user.email,
      );
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(mockError);
    });
  });

  describe('fetchRushOrderRequests', () => {
    beforeEach(() => {
      req = {
        body: {
          queryParams: { status: 'PENDING' },
        },
        user: user,
      } as Partial<Request>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Partial<Response>;

      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fetch rush order requests successfully', async () => {
      const mockSuccessResponse = {
        rows: [
          { id: 1 },
          { id: 2 },
          { id: 3 },
          { id: 4 },
          { id: 5 },
          { id: 6 },
          { id: 7 },
          { id: 8 },
          { id: 9 },
          { id: 10 },
        ],
        rowCount: 10,
        totalCount: 1000,
      };

      jest
        .spyOn(RushOrderService, 'fetchRushOrderRequests')
        .mockResolvedValue(mockSuccessResponse);

      await RushOrderController.fetchRushOrderRequests(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.fetchRushOrderRequests,
      ).toHaveBeenCalledWith(
        user.roles,
        user.user_id,
        req.body.queryParams,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        Template.success(
          mockSuccessResponse,
          SuccessMessage.FETCH_RUSH_ORDER_REQUESTS,
        ),
      );
    });

    it('should handle failure to fetch rush order requests', async () => {
      jest
        .spyOn(RushOrderService, 'fetchRushOrderRequests')
        .mockResolvedValue(null);

      await RushOrderController.fetchRushOrderRequests(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.fetchRushOrderRequests,
      ).toHaveBeenCalledWith(
        user.roles,
        user.user_id,
        req.body.queryParams,
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        Template.errorMessage(ErrorMessage.FETCH_RUSH_ORDER_REQUESTS),
      );
    });

    it('should handle error during fetch rush order requests', async () => {
      jest
        .spyOn(RushOrderService, 'fetchRushOrderRequests')
        .mockRejectedValue(null);

      await RushOrderController.fetchRushOrderRequests(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.fetchRushOrderRequests,
      ).toHaveBeenCalledWith(
        user.roles,
        user.user_id,
        req.body.queryParams,
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.internalServerError(),
      );
      // expect(logger.error).toHaveBeenCalledWith('inside rushOrderController -> fetchRushOrderRequests, Error:', mockError);
    });
  });

  describe('insertOrderRequest', () => {
    beforeEach(() => {
      req = {
        body: {
          po_number: 'PO123456',
          approver_email: 'approver@example.com',
          location: 'Location1',
          rsm: 'RSM1',
          reason: 'Urgent order',
          comments: 'Please approve this order urgently.',
        },
        user: user,
      } as Partial<Request>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Partial<Response>;

      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should insert order request successfully', async () => {
      const mockSuccessResponse = {
        distributor_id: '100000',
        amount: '100',
      };

      jest
        .spyOn(RushOrderService, 'insertOrderRequest')
        .mockResolvedValue(mockSuccessResponse);

      await RushOrderController.insertOrderRequest(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.insertOrderRequest,
      ).toHaveBeenCalledWith(
        req.body.po_number,
        req.body.approver_email,
        req.body.location,
        req.body.rsm,
        req.body.reason,
        req.body.comments,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        Template.success(
          mockSuccessResponse,
          SuccessMessage.INSERT_ORDER_REQUEST,
        ),
      );
    });

    it('should handle failure to insert order request', async () => {
      jest
        .spyOn(RushOrderService, 'insertOrderRequest')
        .mockResolvedValue(null);

      await RushOrderController.insertOrderRequest(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.insertOrderRequest,
      ).toHaveBeenCalledWith(
        req.body.po_number,
        req.body.approver_email,
        req.body.location,
        req.body.rsm,
        req.body.reason,
        req.body.comments,
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        Template.errorMessage(ErrorMessage.INSERT_ORDER_REQUEST),
      );
    });

    it('should handle error during insert order request', async () => {
      const mockError = new Error('Test error');
      jest
        .spyOn(RushOrderService, 'insertOrderRequest')
        .mockRejectedValue(mockError);

      await RushOrderController.insertOrderRequest(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.insertOrderRequest,
      ).toHaveBeenCalledWith(
        req.body.po_number,
        req.body.approver_email,
        req.body.location,
        req.body.rsm,
        req.body.reason,
        req.body.comments,
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.internalServerError(),
      );
      // expect(logger.error).toHaveBeenCalledWith('inside rushOrderController -> insertOrderRequest, Error:', mockError);
    });
  });

  describe('fetchApprovalCount', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
      req = {
        user: user,
      } as Partial<Request>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Partial<Response>;

      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fetch approval count successfully', async () => {
      const mockSuccessResponse = { count: 5 };

      jest
        .spyOn(RushOrderService, 'fetchApprovalCount')
        .mockResolvedValue(mockSuccessResponse);

      await RushOrderController.fetchApprovalCount(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.fetchApprovalCount,
      ).toHaveBeenCalledWith(user.user_id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        Template.success(
          mockSuccessResponse,
          SuccessMessage.RUSH_ORDER_APPROVAL_COUNT,
        ),
      );
    });

    it('should handle failure to fetch approval count', async () => {
      jest
        .spyOn(RushOrderService, 'fetchApprovalCount')
        .mockResolvedValue(null);

      await RushOrderController.fetchApprovalCount(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.fetchApprovalCount,
      ).toHaveBeenCalledWith(user.user_id);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        Template.errorMessage(ErrorMessage.RUSH_ORDER_APPROVAL_COUNT),
      );
    });

    it('should handle error during fetch approval count', async () => {
      const mockError = new Error('Test error');

      jest
        .spyOn(RushOrderService, 'fetchApprovalCount')
        .mockRejectedValue(mockError);

      await RushOrderController.fetchApprovalCount(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.fetchApprovalCount,
      ).toHaveBeenCalledWith(user.user_id);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.internalServerError(),
      );
    });
  });

  describe('setExpired', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
      req = {
        user: user,
      } as Partial<Request>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Partial<Response>;

      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should set expired rush orders successfully', async () => {
      const mockSuccessResponse = '1,2,3';

      jest
        .spyOn(RushOrderService, 'setExpired')
        .mockResolvedValue(mockSuccessResponse);

      jest
        .spyOn(LogService, 'insertSyncLog')
        .mockResolvedValue(null);

      await RushOrderController.setExpired(
        req as Request,
        res as Response,
      );

      expect(RushOrderService.setExpired).toHaveBeenCalled();
      expect(LogService.insertSyncLog).toHaveBeenCalledWith('RO_EXPIRY_CHECK', 'SUCCESS', null, null, null, true);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        Template.success(
          { recordsUpdated: mockSuccessResponse.split(',').length },
          SuccessMessage.RUSH_ORDER_SET_EXPIRED,
        ),
      );
    });

    it('should handle failure to set expired rush orders', async () => {
      jest
        .spyOn(RushOrderService, 'setExpired')
        .mockResolvedValue(null);

      jest
        .spyOn(LogService, 'insertSyncLog')
        .mockResolvedValue(null);

      await RushOrderController.setExpired(
        req as Request,
        res as Response,
      );

      expect(RushOrderService.setExpired).toHaveBeenCalled();
      expect(LogService.insertSyncLog).toHaveBeenCalledWith('RO_EXPIRY_CHECK', 'FAIL', null, null, `${ErrorMessage.RUSH_ORDER_SET_EXPIRED}`, true);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        Template.errorMessage(ErrorMessage.RUSH_ORDER_SET_EXPIRED),
      );
    });

    it('should handle error during set expired rush orders', async () => {
      const mockError = new Error('Test error');

      jest
        .spyOn(RushOrderService, 'setExpired')
        .mockRejectedValue(mockError);
      
      jest
        .spyOn(LogService, 'insertSyncLog')
        .mockResolvedValue(null);

      await RushOrderController.setExpired(
        req as Request,
        res as Response,
      );

      expect(RushOrderService.setExpired).toHaveBeenCalled();
      expect(LogService.insertSyncLog).toHaveBeenCalledWith('RO_EXPIRY_CHECK', 'FAIL', null, null, `${mockError}`, true);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.internalServerError(),
      );
    });
  });

  describe('fetchOrderRequestByPO', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
      req = {
        user: user,
        params: {
          po_number: 'PO123456',
        },
      } as Partial<Request>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Partial<Response>;

        jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fetch order request by PO number successfully', async () => {
      const mockSuccessResponse = { id: 1, po_number: 'PO123456' };

      jest
        .spyOn(RushOrderService, 'fetchOrderRequestByPO')
        .mockResolvedValue(mockSuccessResponse);

      await RushOrderController.fetchOrderRequestByPO(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.fetchOrderRequestByPO,
      ).toHaveBeenCalledWith('PO123456');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        Template.success(
          mockSuccessResponse,
          SuccessMessage.FETCH_ORDER_REQUEST,
        ),
      );
    });

    it('should handle failure to fetch order request by PO number', async () => {
      jest
        .spyOn(RushOrderService, 'fetchOrderRequestByPO')
        .mockResolvedValue(null);

      await RushOrderController.fetchOrderRequestByPO(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.fetchOrderRequestByPO,
      ).toHaveBeenCalledWith('PO123456');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        Template.errorMessage(ErrorMessage.FETCH_ORDER_REQUEST),
      );
    });

    it('should handle error during fetch order request by PO number', async () => {
      const mockError = new Error('Test error');

      jest
        .spyOn(RushOrderService, 'fetchOrderRequestByPO')
        .mockRejectedValue(mockError);

      await RushOrderController.fetchOrderRequestByPO(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.fetchOrderRequestByPO,
      ).toHaveBeenCalledWith('PO123456');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.internalServerError(),
      );
    });
  });

  describe('updateOrderRequestFromOrders', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
      req = {
        user: user,
        body: {
          queryParams: { po_number: 'PO123456' },
        },
      } as Partial<Request>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Partial<Response>;

      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should update order request from orders successfully', async () => {
      const mockSuccessResponse = { success: true };

      jest
        .spyOn(RushOrderService, 'updateOrderRequestFromOrders')
        .mockResolvedValue(mockSuccessResponse);

      await RushOrderController.updateOrderRequestFromOrders(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.updateOrderRequestFromOrders,
      ).toHaveBeenCalledWith(
        req.body.queryParams,
        user.user_id,
        user.roles,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        Template.successMessage(
          SuccessMessage.UPDATE_RUSH_ORDER_REQUEST,
        ),
      );
    });

    it('should handle failure to update order request from orders', async () => {
      jest
        .spyOn(RushOrderService, 'updateOrderRequestFromOrders')
        .mockResolvedValue(null);

      await RushOrderController.updateOrderRequestFromOrders(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.updateOrderRequestFromOrders,
      ).toHaveBeenCalledWith(
        req.body.queryParams,
        user.user_id,
        user.roles,
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        Template.errorMessage(ErrorMessage.UPDATE_RUSH_ORDER_REQUEST),
      );
    });

    it('should handle error during update order request from orders', async () => {
      const mockError = new Error('Test error');

      jest
        .spyOn(RushOrderService, 'updateOrderRequestFromOrders')
        .mockRejectedValue(mockError);

      await RushOrderController.updateOrderRequestFromOrders(
        req as Request,
        res as Response,
      );

      expect(
        RushOrderService.updateOrderRequestFromOrders,
      ).toHaveBeenCalledWith(
        req.body.queryParams,
        user.user_id,
        user.roles,
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.internalServerError(),
      );
    });
  });

  describe('fetchROReasons', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
      req = {
        user: user,
      } as Partial<Request>;

      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Partial<Response>;

      jest.clearAllMocks();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should fetch rush order reasons successfully', async () => {
      const mockSuccessResponse = [
        { id: 1, reason: 'Urgent' },
        { id: 2, reason: 'High Priority' },
      ];

      jest
        .spyOn(RushOrderService, 'fetchROReasons')
        .mockResolvedValue(mockSuccessResponse);

      await RushOrderController.fetchROReasons(
        req as Request,
        res as Response,
      );

      expect(RushOrderService.fetchROReasons).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        Template.success(
          mockSuccessResponse,
          SuccessMessage.FETCH_RO_REASONS,
        ),
      );
    });

    it('should handle failure to fetch rush order reasons', async () => {
      jest
        .spyOn(RushOrderService, 'fetchROReasons')
        .mockResolvedValue(null);

      await RushOrderController.fetchROReasons(
        req as Request,
        res as Response,
      );

      expect(RushOrderService.fetchROReasons).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        Template.errorMessage(ErrorMessage.FETCH_RO_REASONS),
      );
    });

    it('should handle error during fetch rush order reasons', async () => {
      const mockError = new Error('Test error');

      jest
        .spyOn(RushOrderService, 'fetchROReasons')
        .mockRejectedValue(mockError);

      await RushOrderController.fetchROReasons(
        req as Request,
        res as Response,
      );

      expect(RushOrderService.fetchROReasons).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.internalServerError(),
      );
    });
  });
});
