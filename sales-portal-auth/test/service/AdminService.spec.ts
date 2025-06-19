import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { AdminModel } from '../../app/models/AdminModel';
import { AuthModel } from '../../app/models/authModel';
import { AdminService } from '../../app/service/AdminService';
import { UserService } from '../../app/service/user.service';
import helper from '../../app/helper';
import Email from '../../app/helper/email';

import cfaMock from './mock/cfa.json';

describe('AdminService', () => {
  describe('getCFAData', () => {
    test('should return CFA data', async () => {
      // Mock the dependencies
      const getCFADataMock = jest
        .spyOn(AdminModel, 'getCFAData')
        .mockResolvedValue({
          rows: cfaMock.cfaRows,
          rowCount: cfaMock.cfaRows.length,
          command: '',
          oid: 0,
          fields: [],
        });
      const result = await AdminService.getCFAData();

      // Assertions
      expect(getCFADataMock).toHaveBeenCalled();
      expect(result).toEqual({
        rows: cfaMock.cfaRows,
        rowCount: cfaMock.cfaRows.length,
        command: '',
        oid: 0,
        fields: [],
      });

      // Restore the mock
      getCFADataMock.mockRestore();
    });
  });

  describe('insertCfaDepotMapping', () => {
    test('should insert CFA depot mapping', async () => {
      // Mock the dependencies
      const insertCfaDepotMappingMock = jest
        .spyOn(AdminModel, 'insertCfaDepotMapping')
        .mockResolvedValue({
          rows: [],
          rowCount: 1,
          command: '',
          oid: 0,
          fields: [],
        });

      // Define the input parameters
      const insertBody = {
        zone: 'Zone 1',
        depotCode: '1205',
        salesOrg: 1010,
        distributionChannel: 456,
        divisions: [10, 20, 30],
        location: 'Location 1',
        name: 'Name 1',
        address: 'Address 1',
        email: 'email@example.com',
        contactPerson: 'Contact Person 1',
        contactNumber: '1234567890',
        zoneManagerEmail: 'zone.manager@example.com',
        clusterManagerEmail: 'cluster.manager@example.com',
        logisticEmail: 'logistic@example.com',
        updatedBy: 'User 1',
        remarks: 'Remarks 1',
      };

      // Call the function
      const result = await AdminService.insertCfaDepotMapping(
        insertBody,
      );

      // Assertions
      expect(result).toBe(true);

      // Restore the mock
      insertCfaDepotMappingMock.mockRestore();
    });
  });
  describe('multipleUpdateCfaDepotMapping', () => {
    test('should update multiple CFA depot mappings', async () => {
      // Mock the dependencies
      const updateCfaDepotMappingMock = jest
        .spyOn(AdminModel, 'multipleUpdateCfaDepotMapping')
        .mockResolvedValue({
          rows: [],
          rowCount: 1,
          command: '',
          oid: 0,
          fields: [],
        });

      // Define the input parameters
      const insertBody = {
        zone: ['Central 2', 'North 2', 'South 1'],
        depotCode: ['1021', '1027', '1111'],
        salesOrg: 1010,
        distributionChannel: 456,
        division: [12, 17, 21],
        location: 'Location 1',
        name: 'Name 1',
        address: 'Address 1',
        email: 'shivansh@gmail.com',
        contactPerson: 'Contact Person 1',
        contactNumber: '1234567890',
        zoneManagerEmail: 'zone.manager@example.com',
        clusterManagerEmail: 'cluster.manager@example.com',
        logisticEmail: 'logistic@example.com',
        updatedBy: 'User 1',
        remarks: 'Remarks 1',
      };

      // Call the function
      const result = await AdminService.multipleUpdateCfaDepotMapping(
        insertBody,
      );
      // Assertions
      expect(updateCfaDepotMappingMock).toHaveBeenCalledWith(
        insertBody,
      );
      expect(result?.rowCount).toBe(1);

      // Restore the mock
      updateCfaDepotMappingMock.mockRestore();
    });
  });
  describe('updateCfaDepotMapping', () => {
    test('should update CFA depot mapping', async () => {
      // Mock the dependencies
      const updateCfaDepotMappingMock = jest
        .spyOn(AdminModel, 'updateCfaDepotMapping')
        .mockResolvedValue({
          rows: [],
          rowCount: 1,
          command: '',
          oid: 0,
          fields: [],
        });

      // Define the input parameters
      const updateBody = {
        depotCode: '1205',
        salesOrg: 1010,
        distributionChannel: 456,
        division: 10,
        location: 'Location 1',
        name: 'Name 1',
        address: 'Address 1',
        email: 'email@example.com',
        contactPerson: 'Contact Person 1',
        contactNumber: '1234567890',
        zoneManagerEmail: 'zone.manager@example.com',
        clusterManagerEmail: 'cluster.manager@example.com',
        isDeleted: false,
        logisticEmail: 'logistic@example.com',
        updatedBy: 'User 1',
        remarks: 'Remarks 1',
      };

      // Call the function
      const result = await AdminService.updateCfaDepotMapping(
        updateBody,
      );

      // Assertions
      expect(updateCfaDepotMappingMock).toHaveBeenCalledWith(
        updateBody,
      );
      expect(result).toEqual({
        rows: [],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      // Restore the mock
      updateCfaDepotMappingMock.mockRestore();
    });
  });

  describe('updatePdpUnlockRequest2', () => {

    test('should update PDP Unlock Request successfully', async () => {
        const requestId = 'PU-1234-123456';
        const status = 'APPROVED';
        const userId = 'user123';
        const email = 'approver@example.com';
        const userName = 'John Doe';

        const setExpiredPDPUnlockRequestsMock = jest.spyOn(AdminModel, 'setExpiredPDPUnlockRequests').mockResolvedValue({expired:{expired_request_ids: []}});
        const checkPDPUnlockRequestExistMock = jest.spyOn(AdminModel, 'checkPDPUnlockRequestExist').mockResolvedValue({
            exist: true,
            data: {
                status: 'PENDING',
                responded_by: [],
                requested_by: 'user123#TSE',
                start_date: '2023-01-01',
                end_date: '2023-01-31',
                requested_on: '2023-01-01',
                regions: ['Region1'],
                areaCodes: ['Area1'],
                comments: 'Test comment',
            },
        });
        const fetchAppLevelSettingsMock = jest.spyOn(AuthModel, 'fetchAppLevelSettings').mockResolvedValue([
            { key: 'PDP_APPROVERS', value: 'approver@example.com' },
        ]);
        const getPdpApproverDetailsMock = jest.spyOn(AdminModel, 'getPdpApproverDetails').mockResolvedValue({ user_id: 'approver1' });
        const updatePDPUnlockRequestMock = jest.spyOn(AdminModel, 'updatePDPUnlockRequest').mockResolvedValue({ success: true, message: 'Request updated successfully.' });
        const fetchSSOUsersMock = jest.spyOn(AdminModel, 'fetchSSOUsers').mockResolvedValue([{ user_id: 'user123', email: 'requester@example.com', first_name: 'Requester', last_name: 'User', code: 'code123' }]);
        const fetchSalesHierarchyDetailsMock = jest.spyOn(UserService, 'fetchSalesHierarchyDetails').mockResolvedValue({
            ASM: [{ email: 'asm@example.com' }],
            CLUSTER_MANAGER: [{ email: 'cm@example.com' }],
        });
        const sendPdpUnlockRequestEmailMock = jest.spyOn(AdminService, 'sendPdpUnlockRequestEmail').mockResolvedValue(true);
        const sendPdpUnlockStatusEmailMock = jest.spyOn(Email, 'sendPdpUnlockStatusEmail').mockResolvedValue(null);
        const formatDateMock = jest.spyOn(helper, 'formatDate').mockImplementation(any => '2023-01-01');

        const result = await AdminService.updatePdpUnlockRequest2(requestId, status, userId, email, userName);

        expect(setExpiredPDPUnlockRequestsMock).toHaveBeenCalled();
        expect(checkPDPUnlockRequestExistMock).toHaveBeenCalledWith(requestId);
        expect(fetchAppLevelSettingsMock).toHaveBeenCalled();
        expect(getPdpApproverDetailsMock).toHaveBeenCalledWith('approver@example.com');
        expect(updatePDPUnlockRequestMock).toHaveBeenCalledWith(requestId, status, userId, email);
        expect(fetchSSOUsersMock).toHaveBeenCalledWith(['TSE']);
        expect(fetchSalesHierarchyDetailsMock).toHaveBeenCalledWith('code123');
        // expect(sendPdpUnlockRequestEmailMock).toHaveBeenCalledWith({
        //     name: 'Requester User',
        //     approver_email: '',
        //     req_id: requestId,
        //     areaCodes: ['Area1'],
        //     startDate: '2023-01-01',
        //     endDate: '2023-01-31',
        //     comments: 'Test comment',
        //     role: 'TSE',
        //     regions: ['Region1'],
        //     message: 'John Doe has approved the request for PDP unlock.',
        // });
        expect(sendPdpUnlockStatusEmailMock).toHaveBeenCalledWith(
            'Region1 / Area1',
            '2023-01-01',
            '2023-01-01',
            '2023-01-01',
            status,
            userName,
            ['requester@example.com', 'asm@example.com', 'cm@example.com'],
            requestId
        );
        expect(result).toEqual({ success: true, "message": "Request updated successfully." });
    });

    test('should handle errors during PDP Unlock Request update', async () => {
        const requestId = 'PU-1234-123456';
        const status = 'APPROVED';
        const userId = 'user123';
        const email = 'approver@example.com';
        const userName = 'John Doe';

        const setExpiredPDPUnlockRequestsMock = jest.spyOn(AdminModel, 'setExpiredPDPUnlockRequests').mockRejectedValue(null);

        const result = await AdminService.updatePdpUnlockRequest2(requestId, status, userId, email, userName);

        expect(setExpiredPDPUnlockRequestsMock).toHaveBeenCalled();
        // expect(logger.error).toHaveBeenCalledWith('inside AdminService -> updatePdpUnlockRequest2, failed to set expired due to error: ', expect.any(Error));
        expect(result).toEqual({ success: false, message: 'PDP unlock request does not exist' });
    });

    test('should handle non-existent PDP Unlock Request', async () => {
        const requestId = 'PU-1234-123456';
        const status = 'APPROVED';
        const userId = 'user123';
        const email = 'approver@example.com';
        const userName = 'John Doe';

        const checkPDPUnlockRequestExistMock = jest.spyOn(AdminModel, 'checkPDPUnlockRequestExist').mockRejectedValue(null);

        const result = await AdminService.updatePdpUnlockRequest2(requestId, status, userId, email, userName);

        expect(checkPDPUnlockRequestExistMock).toHaveBeenCalledWith(requestId);
        expect(result).toEqual({ success: false, message: 'Failed to validate PDP unlock request' });
    });

    test('should handle expired PDP Unlock Request', async () => {
        const requestId = 'PU-1234-123456';
        const status = 'APPROVED';
        const userId = 'user123';
        const email = 'approver@example.com';
        const userName = 'John Doe';

        const checkPDPUnlockRequestExistMock = jest.spyOn(AdminModel, 'checkPDPUnlockRequestExist').mockResolvedValue({
            exist: true,
            data: { status: 'EXPIRED' },
        });

        const result = await AdminService.updatePdpUnlockRequest2(requestId, status, userId, email, userName);

        expect(checkPDPUnlockRequestExistMock).toHaveBeenCalledWith(requestId);
        expect(result).toEqual({ success: false, message: 'PDP unlock request has already expired' });
    });

    test('should handle already approved PDP Unlock Request', async () => {
        const requestId = 'PU-1234-123456';
        const status = 'APPROVED';
        const userId = 'user123';
        const email = 'approver@example.com';
        const userName = 'John Doe';

        const checkPDPUnlockRequestExistMock = jest.spyOn(AdminModel, 'checkPDPUnlockRequestExist').mockResolvedValue({
            exist: true,
            data: { status: 'APPROVED' },
        });

        const result = await AdminService.updatePdpUnlockRequest2(requestId, status, userId, email, userName);

        expect(checkPDPUnlockRequestExistMock).toHaveBeenCalledWith(requestId);
        expect(result).toEqual({ success: false, message: 'PDP unlock request has already been approved' });
    });

    test('should handle already rejected PDP Unlock Request', async () => {
        const requestId = 'PU-1234-123456';
        const status = 'APPROVED';
        const userId = 'user123';
        const email = 'approver@example.com';
        const userName = 'John Doe';

        const checkPDPUnlockRequestExistMock = jest.spyOn(AdminModel, 'checkPDPUnlockRequestExist').mockResolvedValue({
            exist: true,
            data: { status: 'REJECTED' },
        });

        const result = await AdminService.updatePdpUnlockRequest2(requestId, status, userId, email, userName);

        expect(checkPDPUnlockRequestExistMock).toHaveBeenCalledWith(requestId);
        expect(result).toEqual({ success: false, message: 'PDP unlock request has already been rejected' });
    });

    test('should handle unauthorized approver', async () => {
        const requestId = 'PU-1234-123456';
        const status = 'APPROVED';
        const userId = 'user123';
        const email = 'unauthorized@example.com';
        const userName = 'John Doe';

        const checkPDPUnlockRequestExistMock = jest.spyOn(AdminModel, 'checkPDPUnlockRequestExist').mockResolvedValue({
            exist: true,
            data: { status: 'PENDING' },
        });
        const fetchAppLevelSettingsMock = jest.spyOn(AuthModel, 'fetchAppLevelSettings').mockResolvedValue([
            { key: 'PDP_APPROVERS', value: 'approver@example.com' },
        ]);

        const result = await AdminService.updatePdpUnlockRequest2(requestId, status, userId, email, userName);

        expect(fetchAppLevelSettingsMock).toHaveBeenCalled();
        expect(result).toEqual({ success: false, message: 'Unauthorized to approve PDP unlock request' });
    });

    test('should handle previous approver not responded', async () => {
        const requestId = 'PU-1234-123456';
        const status = 'APPROVED';
        const userId = 'user123';
        const email = 'approver@example.com';
        const userName = 'John Doe';

        const checkPDPUnlockRequestExistMock = jest.spyOn(AdminModel, 'checkPDPUnlockRequestExist').mockResolvedValue({
            exist: true,
            data: { status: 'PENDING', responded_by: [] },
        });
        const fetchAppLevelSettingsMock = jest.spyOn(AuthModel, 'fetchAppLevelSettings').mockResolvedValue([
            { key: 'PDP_APPROVERS', value: 'approver@example.com,approver2@example.com' },
        ]);
        const getPdpApproverDetailsMock = jest.spyOn(AdminModel, 'getPdpApproverDetails').mockResolvedValue({ user_id: 'approver1' });

        const result = await AdminService.updatePdpUnlockRequest2(requestId, status, userId, email, userName);

        expect(getPdpApproverDetailsMock).toHaveBeenCalledWith('approver@example.com');
        expect(result).toEqual({ success: false, message: 'Failed to update PDP unlock request' });
    });
  });
});

describe('insertApprovedPDPUnlockRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should insert approved PDP unlock request successfully', async () => {
    const plants = ['1258', '1226'];
    const startDate = '2025-02-06';
    const endDate = '2025-02-07';
    const comments = 'PDP unlock plant wise by CFA';
    const userId = 'user123';
    const role = ['ADMIN'];
    const customer_groups= [], dist_channels= [], regions= [], area_codes= [], states= [];

    const mockSuccessResponse = 'PU-0224-000000';

    const insertApprovedPDPUnlockRequestMock = jest.spyOn(AdminModel, 'insertApprovedPDPUnlockRequest2').mockResolvedValue(mockSuccessResponse);

    const result = await AdminService.insertApprovedPDPUnlockRequest(customer_groups, dist_channels, regions, area_codes, states,plants, startDate, endDate, comments, userId, role);

    expect(insertApprovedPDPUnlockRequestMock).toHaveBeenCalledWith(customer_groups, dist_channels, regions, area_codes, states, plants, startDate, endDate, comments, userId, role);
    expect(result).toEqual(mockSuccessResponse);
  });

  test('should handle error during insert approved PDP unlock request', async () => {
    const plants = ['1258', '1226'];
    const startDate = '2025-02-06';
    const endDate = '2025-02-07';
    const comments = 'PDP unlock plant wise by CFA';
    const userId = 'user123';
    const role = ['ADMIN'];
    const customer_groups= [], dist_channels= [], regions= [], area_codes= [], states= [];

    const mockError = null;

    const insertApprovedPDPUnlockRequestMock = jest.spyOn(AdminModel, 'insertApprovedPDPUnlockRequest2').mockRejectedValue(mockError);

    const result = await AdminService.insertApprovedPDPUnlockRequest(customer_groups, dist_channels, regions, area_codes, states,plants, startDate, endDate, comments, userId, role);

    expect(insertApprovedPDPUnlockRequestMock).toHaveBeenCalledWith(customer_groups, dist_channels, regions, area_codes, states, plants, startDate, endDate, comments, userId, role);
    expect(result).toBeNull();
    // expect(logger.error).toHaveBeenCalledWith('inside AdminService -> insertApprovedPDPUnlockRequest, Error:', mockError);
  });
});