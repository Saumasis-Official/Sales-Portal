import { AuthModel } from '../../app/models/authModel';
import { AuthService } from '../../app/service/authService';
import { describe, test, expect, jest } from '@jest/globals';
describe('AuthService', () => {
  describe('getMaintenanceStatus', () => {
    test('should return maintenance status', async () => {
      // Mock the dependencies
      const getMaintenanceStatusMock = jest
        .spyOn(AuthModel, 'getMaintenanceStatus')
        .mockResolvedValue(true);

      // Call the function
      const result = await AuthService.getMaintenanceStatus();

      // Assertions
      expect(getMaintenanceStatusMock).toHaveBeenCalled();
      expect(result).toBe(true);

      // Restore the mock
      getMaintenanceStatusMock.mockRestore();
    });
  });
  describe('addMaintenanceStatus', () => {
    test('should add new maintenance status', async () => {
      // Mock the dependencies
      const addNewMaintenanceStatusMock = jest
        .spyOn(AuthModel, 'addNewMaintenanceStatus')
        .mockResolvedValue(true);

      // Test data
      const data = {
        status: 'OPEN',
        duration: 120,
        remark: 'Test maintenance',
      };
      const user_id = 'TCPL_23349430';
      const userName = 'SHIVANSH BOHRA';

      // Call the function
      const result = await AuthService.addnewmaintenance(
        data,
        user_id,
        userName,
      );

      // Assertions
      expect(addNewMaintenanceStatusMock).toHaveBeenCalledWith(
        data,
        user_id,
        userName,
      );
      expect(result).toBe(true);

      // Restore the mock
      addNewMaintenanceStatusMock.mockRestore();
    });
  });

  describe('updateMaintenance', () => {
    test('should update maintenance status', async () => {
      // Mock the dependencies
      const updateMaintenanceStatusMock = jest
        .spyOn(AuthModel, 'updateMaintenanceStatus')
        .mockResolvedValue(true);

      // Test data
      const data = {
        status: 'CLOSED',
        duration: 60,
        remark: 'Test update maintenance',
      };
      const user_id = 'TCPL_23349430';
      const userName = 'SHIVANSH BOHRA';

      // Call the function
      const result = await AuthService.updateMaintenance(
        data,
        user_id,
        userName,
      );

      // Assertions
      expect(updateMaintenanceStatusMock).toHaveBeenCalledWith(
        data,
        user_id,
        userName,
      );
      expect(result).toBe(true);

      // Restore the mock
      updateMaintenanceStatusMock.mockRestore();
    });
  });
  describe('updatePassword', () => {
    test('should update password', async () => {
      // Mock the dependencies
      const updatePasswordMock = jest
        .spyOn(AuthModel, 'updatePassword')
        .mockResolvedValue(true);

      // Test data
      const hash = 'hashedPassword';
      const login_id = '100003';

      // Call the function
      const result = await AuthService.updatePassword({
        hash,
        login_id,
      });

      // Assertions
      expect(updatePasswordMock).toHaveBeenCalledWith({
        hash,
        login_id,
      });
      expect(result).toBe(true);

      // Restore the mock
      updatePasswordMock.mockRestore();
    });
  });
  describe('getActiveSessionReport', () => {
    test('should return active session report', async () => {
      // Mock the dependencies
      const to = '2022-01-01';
      const from = '2022-01-31';
      const getActiveSessionReportMock = jest
        .spyOn(AuthModel, 'getActiveSessionReport')
        .mockResolvedValue([true]);

      // Call the function
      const result = await AuthService.getActiveSessionReport(
        to,
        from,
      );

      // Assertions
      expect(getActiveSessionReportMock).toHaveBeenCalledWith(
        to,
        from,
      );
      expect(result).toEqual([true]);

      // Restore the mock
      getActiveSessionReportMock.mockRestore();
    });
  });
});
