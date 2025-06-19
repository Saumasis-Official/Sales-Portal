import { jest, describe, it, expect, beforeAll, afterEach } from '@jest/globals';

// Mock PostgreSQL connection with a class structure
jest.mock('../../app/lib/postgresqlConnection', () => {
  const mockGetInstance = jest.fn(() => ({
    getWriteClient: jest.fn(),
    getReadClient: jest.fn(),
  }));
  return {
    __esModule: true,
    default: {
      getInstance: mockGetInstance,
    },
  };
});

// Mock other dependencies
jest.mock('../../app/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../app/service/LogService', () => ({
  LogService: {
    insertSyncLog: jest.fn(), 
  },
}));

jest.mock('../../app/models/UtilModel', () => ({
  UtilModel: {
    syncCustomerCodes: jest.fn(),
  },
}));

// Set global configuration
beforeAll(() => {
  global['configuration'] = {
    sap: { auth: { username: 'test', password: 'test' } },
    email: { smtp: { host: 'smtp.test.com', port: 587, secure: false, auth: { user: 'test', pass: 'test' } } },
    mule: { baseUrl: 'https://mule.test.com', apiKey: 'test-api-key' },
    customerCodeSyncApi: { baseUrl: 'https://customer-code-sync.test.com', apiKey: 'test-api-key' },
    pgsql: { pgsql_host: 'localhost', pgsql_username: 'test', pgsql_port: '5432', pgsql_password: 'test', pgsql_database_name: 'testdb' },
    pgsql_read: { pgsql_host: 'localhost', pgsql_username: 'test', pgsql_port: '5432', pgsql_password: 'test', pgsql_database_name: 'testdb' },
  };
});

// Import the module under test
import UtilityFunctions from '../../app/helper/utilityFunctions';
import logger from '../../app/lib/logger';
import { LogService } from '../../app/service/LogService';
import { UtilModel } from '../../app/models/UtilModel';

describe.only('UtilityFunctions', () => {
  describe.only('fetchKamsCustomerCodeSync', () => {
    let syncCustomerCodesSpy: jest.SpiedFunction<typeof UtilModel.syncCustomerCodes>;

    beforeAll(() => {
      syncCustomerCodesSpy = jest.spyOn(UtilModel, 'syncCustomerCodes');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch customer codes successfully', async () => {
      const mockSyncResult = { message: 'some data' };
      syncCustomerCodesSpy.mockResolvedValue(mockSyncResult);

      const result = await UtilityFunctions.fetchKamsCustomerCodeSync();

      expect(result).toEqual(mockSyncResult);
      expect(logger.info).toHaveBeenCalledWith('Fetching data from customer code sync API in utilityFunctions.fetchCustomerCodeSync');
      expect(logger.info).toHaveBeenCalledWith('Successfully fetched data from KAMS customer code sync API');
    });

    it('should handle response error', async () => {
      const mockError = {
        response: { data: 'error data', status: 500 },
      };
      syncCustomerCodesSpy.mockRejectedValue(mockError);

      const result = await UtilityFunctions.fetchKamsCustomerCodeSync();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Error while fetching data from customer code sync API:', mockError.response.data);
      expect(LogService.insertSyncLog).toHaveBeenCalledWith('KAMS_CUSTOMER_CODE_SYNC', 'FAIL', null, null, 'API failed with status: 500');
    });

    it('should handle request error', async () => {
      const mockError = { request: 'request data' };
      syncCustomerCodesSpy.mockRejectedValue(mockError);

      const result = await UtilityFunctions.fetchKamsCustomerCodeSync();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('No response received from customer code sync API:', mockError.request);
      expect(LogService.insertSyncLog).toHaveBeenCalledWith('KAMS_CUSTOMER_CODE_SYNC', 'FAIL', null, null, 'No response received from API');
    });

    it('should handle general error', async () => {
      const mockError = { message: 'general error' };
      syncCustomerCodesSpy.mockRejectedValue(mockError);

      const result = await UtilityFunctions.fetchKamsCustomerCodeSync();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Error in customer code sync API call', mockError.message);
      expect(LogService.insertSyncLog).toHaveBeenCalledWith('CUSTOMER_CODE_SYNC', 'FAIL', null, null, 'API call failed: general error');
    });
  });
});