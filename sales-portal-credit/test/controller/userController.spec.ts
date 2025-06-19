import { Request, Response } from 'express';
import {
  jest,
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
} from '@jest/globals';
import UserController from '../../app/controller/userController';
import { UserService } from '../../app/service/user.service';
import responseTemplate from '../../app/helper/responseTemplate';
import { SuccessMessage } from '../../app/constants/successMessage';
import { ErrorMessage } from '../../app/constants/errorMessage';
import { Readable } from 'stream';

describe('UserController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  describe('insertCreditExtensionRequest', () => {
    beforeEach(() => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.xlsx',
        encoding: '7bit',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('test content'),
        size: 1234,
        stream: new Readable(),
        destination: '/tmp',
        filename: 'test.xlsx',
        path: '/tmp/test.xlsx',
      };

      req = {
        body: {
          queryParams: JSON.stringify([
            {
              customer_Code: 'C123',
              base_limit: '1000',
              expiry_date: '2025-01-01',
              amount_requested: '500',
              payer_code: 'P123',
              remarks: 'Testing',
              approver1: 'chaithra.shivanna@tataconsumer.com',
              approver2: 'ananya.thapli@tataconsumer.com',
              approver3: 'ganesh@tataconsumer.com',
              payer_name: 'amazon',
            },
          ]),
        },
        user: {
          user_id: 'test_user',
          roles: 'KAMS',
        },
        file: mockFile,
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
      const result = 'success';
      jest
        .spyOn(UserService, 'insertCreditExtensionRequest')
        .mockResolvedValue(result);
      await UserController.insertCreditExtensionRequest(
        req as Request,
        res as Response,
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: 'Credit extention request form submitted successfully',
      });
    });

    it('should return 500 and internal server error response when insertCreditExtensionRequest throws an error', async () => {
      const mockError = new Error('Test error');
      jest
        .spyOn(UserService, 'insertCreditExtensionRequest')
        .mockRejectedValue(mockError);
      jest
        .spyOn(responseTemplate, 'error')
        .mockReturnValue({ error: true });
      await UserController.insertCreditExtensionRequest(
        req as Request,
        res as Response,
      );
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        responseTemplate.error(ErrorMessage.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('updateRequestApprover', () => {
    beforeEach(() => {
      req = {
        body: {
          queryParams: {
            transaction_id: 'CE-0125-00001',
            approver_remarks: 'testinggg',
            amount: '100000',
            base_limit: '500000',
            customerCode: '1223434',
            expiryDate: '2023-12-31 23:59:59',
            status: 'APPROVED',
          },
        },
        user: {
          user_id: 'test_user',
          // role: 'KAMS'
        },
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
    it('should return 200 and success response when updateRequestApprover is successful', async () => {
      const result = {
        success: true,
        data: {
          transaction: {
            requested_by:
              'TCPL_09382139#{"APPROVER(SECONDARY)","NKAMS"}',
          },
        },
      };
      jest
        .spyOn(UserService, 'updateRequestApprover')
        .mockResolvedValue(result);
      await UserController.updateRequestApprover(
        req as Request,
        res as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: SuccessMessage.UPDATE_CREDIT_EXTENSION_REQUEST,
        data: result,
      });
    });

    it('should return 500 and internal server error response when insertCreditExtensionRequest throws an error', async () => {
      const mockError = new Error('Test error');
      jest
        .spyOn(UserService, 'insertCreditExtensionRequest')
        .mockRejectedValue(mockError);
      jest
        .spyOn(responseTemplate, 'error')
        .mockReturnValue({ error: true });
      await UserController.insertCreditExtensionRequest(
        req as Request,
        res as Response,
      );
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: true });
    });
  });

  describe('getClApproverFinance', () => {
    beforeEach(() => {
      req = {
        user: {
          user_id: 'test_user',
          role: 'test_role',
        },
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
    it('should return 200 and success response when getClApproverFinance is successful', async () => {
      const response = {
        rows: [
          {
            user_id: 'PORTAL_26',
            first_name: 'Ananya',
            last_name: 'Thapli',
            email: 'ananya.thapli@tataconsumer.com',
          },
        ],
        rowCount: 1,
      };

      jest
        .spyOn(UserService, 'getClApproverFinance')
        .mockResolvedValue(response);

      await UserController.getClApproverFinance(
        req as Request,
        res as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: SuccessMessage.GET_CL_APPROVER_FINANCE,
        data: response,
      });
    });
    it('should return 500 and internal server error response when getClApproverFinance throws an error', async () => {
      const mockError = new Error('Test error');
      jest
        .spyOn(UserService, 'getClApproverFinance')
        .mockRejectedValue(mockError);
      jest
        .spyOn(responseTemplate, 'internalServerError')
        .mockReturnValue({ error: true });

      await UserController.getClApproverFinance(
        req as Request,
        res as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        responseTemplate.internalServerError(),
      );
    });
  });

  describe('fetchRequestedDetailsById', () => {
    beforeEach(() => {
      req = {
        params: {
          transaction_id: 'CE-0125-00001',
        },
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
    it('should return 200 and success response when fetchRequestedDetailsById is successful', async () => {
      const result = {
        rows: [
          {
            transaction_id: 'CE-0125-00008',
            baselimit: '50000',
            expirydate: '2025-02-07T07:36:47.030Z',
            payercode: '137061',
            customercode: null,
            amount_requested: '10000000',
            childid: 'CE-0125-00008-0001',
            status: 'PENDING',
            type: 'REQUESTED',
            approver1_remarks: null,
          },
        ],
      };
      const customerGroup = '14';

      jest
        .spyOn(UserService, 'fetchRequestedDetailsById')
        .mockResolvedValue({ result: result.rows, customerGroup });
      jest
        .spyOn(responseTemplate, 'success')
        .mockReturnValue({
          success: true,
          data: { result: result.rows, customerGroup },
        });

      await UserController.fetchRequestedDetailsById(
        req as Request,
        res as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        responseTemplate.success(
          result,
          SuccessMessage.FETCH_ORDER_REQUEST,
        ),
      );
    });

    it('should return 200 and error response when fetchRequestedDetailsById fails', async () => {
      jest
        .spyOn(UserService, 'fetchRequestedDetailsById')
        .mockResolvedValue(null);
      jest
        .spyOn(responseTemplate, 'errorMessage')
        .mockReturnValue({ error: true });

      await UserController.fetchRequestedDetailsById(
        req as Request,
        res as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        responseTemplate.errorMessage(
          ErrorMessage.FETCH_ORDER_REQUEST,
        ),
      );
    });

    it('should return 500 and internal server error response when fetchRequestedDetailsById throws an error', async () => {
      const mockError = new Error('Test error');
      jest
        .spyOn(UserService, 'fetchRequestedDetailsById')
        .mockRejectedValue(mockError);
      jest
        .spyOn(responseTemplate, 'internalServerError')
        .mockReturnValue({ error: true });

      await UserController.fetchRequestedDetailsById(
        req as Request,
        res as Response,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        responseTemplate.internalServerError(),
      );
    });
  });
});
