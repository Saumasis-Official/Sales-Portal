import WarehouseController from '../../app/controller/WarehouseController';
import UtilityFunctions from '../../app/helper/utilityFunctions';
import Template from '../../app/helper/responseTemplate';
import { ErrorMessage } from '../../app/constant/error.message';

jest.mock('../../app/helper/utilityFunctions');
jest.mock('../../app/helper/responseTemplate');
jest.mock('../../app/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('WarehouseController', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      user: { login_id: 'testUser' },
      params: { dist_channel: '10', division_str: '10,20' },
      _startTime: new Date(),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchWarehouseDetails', () => {
    test('should return 500 if fetched warehouse details response does not exist', async () => {
      (
        UtilityFunctions.fetchWarehouseDetails as jest.Mock
      ).mockResolvedValue(null);

      await WarehouseController.fetchWarehouseDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.error(
          'Technical Error',
          ErrorMessage.WAREHOUSE_DETAILS_ERROR,
          [],
        ),
      );
    });

    test('should return 200 with success message if fetchWarehouseDetailsResponse is valid', async () => {
      const mockResponse = {
        status: 200,
        data: {
          d: {
            results: [
              {
                Function: 'SH : Ship To Point',
                Distributor: 'D1',
                Name: 'Distributor 1',
                InputToSalesAreaNav: { results: [] },
              },
            ],
          },
        },
      };
      (
        UtilityFunctions.fetchWarehouseDetails as jest.Mock
      ).mockResolvedValue(mockResponse);
      (Template.success as jest.Mock).mockReturnValue({
        success: true,
      });

      await WarehouseController.fetchWarehouseDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    test('should return 500 if SAP API response is not in appropriate format', async () => {
      const mockResponse = { status: 500, data: {} };
      (
        UtilityFunctions.fetchWarehouseDetails as jest.Mock
      ).mockResolvedValue(mockResponse);

      await WarehouseController.fetchWarehouseDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.error(
          'Technical Error',
          ErrorMessage.SAP_API_FAILED,
          mockResponse.data,
        ),
      );
    });
  });

  describe('fetchWarehouseDetailsOnDistChannel', () => {
    test('should return 500 if fetched warehouse details response does not exist', async () => {
      (
        UtilityFunctions.fetchWarehouseDetailsOnDistChannel as jest.Mock
      ).mockResolvedValue(null);

      await WarehouseController.fetchWarehouseDetailsOnDistChannel(
        req,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.error(
          'Technical Error',
          ErrorMessage.WAREHOUSE_DETAILS_ERROR,
          [],
        ),
      );
    });

    test('should return 200 with success message if fetchWarehouseDetailsResponse is valid', async () => {
      const mockResponse = {
        status: 200,
        data: {
          d: {
            results: [
              {
                Function: 'SH : Ship To Point',
                Distributor: 'D1',
                Name: 'Distributor 1',
                InputToSalesAreaNav: { results: [] },
              },
            ],
          },
        },
      };
      (
        UtilityFunctions.fetchWarehouseDetailsOnDistChannel as jest.Mock
      ).mockResolvedValue(mockResponse);
      (Template.success as jest.Mock).mockReturnValue({
        success: true,
      });

      await WarehouseController.fetchWarehouseDetailsOnDistChannel(
        req,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    test('should return 500 if SAP API failed fetching shipping and unloading points:', async () => {
      const mockResponse = { status: 500, data: {} };
      (
        UtilityFunctions.fetchWarehouseDetailsOnDistChannel as jest.Mock
      ).mockResolvedValue(mockResponse);

      await WarehouseController.fetchWarehouseDetailsOnDistChannel(
        req,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        Template.error(
          'Technical Error',
          ErrorMessage.SAP_API_FAILED,
          mockResponse.data,
        ),
      );
    });
  });
});
