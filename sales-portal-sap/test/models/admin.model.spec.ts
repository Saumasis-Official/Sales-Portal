import { AdminModel } from '../../app/models/admin.model';
import pool from '../../app/lib/postgresql';
import logger from '../../app/lib/logger';
import commonHelperModel from '../../app/models/helper.model';
import PostgresqlConnection from '../../app/lib/postgresqlConnection';

jest.mock('../../app/lib/postgresql');
jest.mock('../../app/lib/logger');
jest.mock('../../app/models/helper.model');
jest.mock('../../app/lib/postgresqlConnection');

const conn = {
  getReadClient: jest.fn(),
  getWriteClient: jest.fn(),
};

PostgresqlConnection.getInstance = jest.fn().mockReturnValue(conn);

describe('AdminModel', () => {
  let client: any;

  beforeEach(() => {
    client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    conn.getReadClient.mockResolvedValue(client);
    conn.getWriteClient.mockResolvedValue(client);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGlobalEmailConfig', () => {
    it('should return null if an error occurs', async () => {
      client.query.mockRejectedValue(new Error('Query error'));

      const result = await AdminModel.getGlobalEmailConfig();

      expect(result).toBeNull();
    });
  });

  describe('adminDetailsStatement', () => {
    it('should return null if an error occurs', async () => {
      client.query.mockRejectedValue(new Error('Query error'));

      const result = await AdminModel.adminDetailsStatement(
        'test@example.com',
      );

      expect(result).toBeNull();
    });
  });

  describe('validateDistributorAdminMapping', () => {
    it('should return false if admin is not mapped to distributor', async () => {
      const mockDistributorId = 'dist123';
      const mockRole = 'ASM';
      const mockCode = 'area2';
      const mockResult = [
        {
          tse_code: 'tse1',
          area_code: 'area1',
          rsm_code: 'rsm1',
          cluster_code: 'cluster1',
        },
      ];
      client.query.mockResolvedValue({ rows: mockResult });

      const result = await AdminModel.validateDistributorAdminMapping(
        mockDistributorId,
        mockRole,
        mockCode,
      );

      expect(result).toBe(false);
    });

    it('should return false if an error occurs', async () => {
      client.query.mockRejectedValue(new Error('Query error'));

      const result = await AdminModel.validateDistributorAdminMapping(
        'dist123',
        'ASM',
        'area1',
      );

      expect(result).toBe(false);
    });
  });
});
