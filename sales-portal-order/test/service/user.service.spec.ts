import { UserService } from '../../app/service/user.service';
import { UserModel } from '../../app/models/user.model';
import { jest, describe, it, expect, } from '@jest/globals';

describe('UserService', () => {
  describe('getSessionInvalidateStatus', () => {
    it('should call UserModel.getInvalidateSessionStatus with the correct parameters', async () => {
      // Arrange
      const loginId = 'testLoginId';
      const uuid = 'testUuid';
      const expectedResponse = ['testResponse'];
      jest.spyOn(UserModel, 'getInvalidateSessionStatus').mockResolvedValue(expectedResponse);

      // Act
      const result = await UserService.getSessionInvalidateStatus(
        loginId,
        uuid,
      );

      // Assert
      expect(
        UserModel.getInvalidateSessionStatus,
      ).toHaveBeenCalledWith(loginId, uuid);
      expect(result).toBe(expectedResponse);
    });
  });

  describe('fetchSalesHierarchyDetails', () => {
    it('should return the sales hierarchy details', async () => {
      // Arrange
      const tseCode = 'testTseCode';
      const expectedResponse:any = {};
      jest.spyOn(UserModel, 'fetchSalesHierarchyDetails').mockResolvedValue(expectedResponse);

      // Act
      const result = await UserService.fetchSalesHierarchyDetails(
        tseCode,
      );

      // Assert
      expect(result).toEqual(expectedResponse);
    });
  });
  describe('createSalesHierarchyObject', () => {
    it('should return an object with the correct properties', () => {
      // Arrange
      const row = {
        user_id: 'testUserId',
        first_name: 'testFirstName',
        last_name: 'testLastName',
        email: 'test@example.com',
        mobile_number: '1234567890',
        code: 'testCode',
      };

      // Act
      const result = UserService.createSalesHierarchyObject(row);

      // Assert
      expect(result).toEqual({
        user_id: 'testUserId',
        first_name: 'testFirstName',
        last_name: 'testLastName',
        email: 'test@example.com',
        mobile_number: '1234567890',
        code: 'testCode',
      });
    });

    it('should return an object with empty string values for missing properties', () => {
      // Arrange
      const row = {
        user_id: 'testUserId',
        code: 'testCode',
      };

      // Act
      const result = UserService.createSalesHierarchyObject(row);

      // Assert
      expect(result).toEqual({
        user_id: 'testUserId',
        first_name: '',
        last_name: '',
        email: null,
        mobile_number: null,
        code: 'testCode',
      });
    });

    it('should return an object with null values for missing properties', () => {
      // Arrange
      const row = {
        user_id: 'testUserId',
        first_name: 'testFirstName',
        last_name: 'testLastName',
        code: 'testCode',
      };

      // Act
      const result = UserService.createSalesHierarchyObject(row);

      // Assert
      expect(result).toEqual({
        user_id: 'testUserId',
        first_name: 'testFirstName',
        last_name: 'testLastName',
        email: null,
        mobile_number: null,
        code: 'testCode',
      });
    });

    it('should return an object with null values for all properties if row is empty', () => {
      // Arrange
      const row = {};

      // Act
      const result = UserService.createSalesHierarchyObject(row);

      // Assert
      expect(result).toEqual({
        user_id: null,
        first_name: '',
        last_name: '',
        email: null,
        mobile_number: null,
        code: null,
      });
    });
  });
  describe('fetchDistributorDetails', () => {
    it('should return the distributor details', async () => {
      // Arrange
      const distributorCode = 'testDistributorCode';
      const expectedResponse = {
        distributor_id: 'testDistributorId',
        name: 'testDistributorName',
        address: 'testDistributorAddress',
        city: 'testDistributorCity',
        state: 'testDistributorState',
        country: 'testDistributorCountry',
      };
      jest.spyOn(UserModel, 'fetchDistributorDetails').mockResolvedValue(expectedResponse);

      // Act
      const result = await UserService.fetchDistributorDetails(
        distributorCode,
      );

      // Assert
      expect(UserModel.fetchDistributorDetails).toHaveBeenCalledWith(
        distributorCode,
      );
      expect(result).toEqual(expectedResponse);
    });
  });
  describe('getUserDetails', () => {
    it('should return user details with sales hierarchy when tse code is available', async () => {
      // Arrange
      const loginId = 'testLoginId';
      const tseCode = 'testTseCode';
      const resultSet = {
        tse_code: tseCode,
        user_id: 'testUserId',
        first_name: 'testFirstName',
        last_name: 'testLastName',
        email: 'test@example.com',
        mobile_number: '1234567890',
        code: 'testCode',
      };
      const salesDetails = [
        {
          distributor_id: 'testDistributorId',
          name: 'testDistributorName',
          address: 'testDistributorAddress',
          city: 'testDistributorCity',
          state: 'testDistributorState',
          country: 'testDistributorCountry',
        },
      ];
      const salesHierarchyDetails = {
        TSE: [
          {
            user_id: 'testUserId',
            first_name: 'testFirstName',
            last_name: 'testLastName',
            email: 'test@example.com',
            mobile_number: '1234567890',
            code: 'testCode',
          },
        ],
        ASM: [
          {
            user_id: 'testUserId',
            first_name: 'testFirstName',
            last_name: 'testLastName',
            email: 'test@example.com',
            mobile_number: '1234567890',
            code: 'testCode',
          },
        ],
        RSM: [
          {
            user_id: 'testUserId',
            first_name: 'testFirstName',
            last_name: 'testLastName',
            email: 'test@example.com',
            mobile_number: '1234567890',
            code: 'testCode',
          },
        ],
        CLUSTER_MANAGER: [
          {
            user_id: 'testUserId',
            first_name: 'testFirstName',
            last_name: 'testLastName',
            email: 'test@example.com',
            mobile_number: '1234567890',
            code: 'testCode',
          },
        ],
      };
    jest.spyOn(UserModel, 'getUserDetails').mockResolvedValue(resultSet);
    jest.spyOn(UserModel, 'getSalesDetails').mockResolvedValue(salesDetails);
    jest.spyOn(UserService, 'fetchSalesHierarchyDetails').mockResolvedValue(salesHierarchyDetails);

      // Act
      const result = await UserService.getUserDetails(loginId);

      // Assert
      expect(UserModel.getUserDetails).toHaveBeenCalledWith(loginId);
      expect(UserModel.getSalesDetails).toHaveBeenCalledWith(loginId);
      expect(
        UserService.fetchSalesHierarchyDetails,
      ).toHaveBeenCalledWith(tseCode);
    });

    it('should return user details without sales hierarchy when tse code is not available', async () => {
      // Arrange
      const loginId = 'testLoginId';
      const resultSet = {
        user_id: 'testUserId',
        first_name: 'testFirstName',
        last_name: 'testLastName',
        email: 'test@example.com',
        mobile_number: '1234567890',
        code: 'testCode',
      };
      const salesDetails = [
        {
          distributor_id: 'testDistributorId',
          name: 'testDistributorName',
          address: 'testDistributorAddress',
          city: 'testDistributorCity',
          state: 'testDistributorState',
          country: 'testDistributorCountry',
        },
      ];
      jest.spyOn(UserModel, 'getUserDetails').mockResolvedValue(resultSet);
      jest.spyOn(UserModel, 'getSalesDetails').mockResolvedValue(salesDetails);
      jest.spyOn(UserService, 'fetchSalesHierarchyDetails').mockResolvedValue({});

      // Act
      const result = await UserService.getUserDetails(loginId);

      // Assert
      expect(UserModel.getUserDetails).toHaveBeenCalledWith(loginId);
      expect(UserModel.getSalesDetails).toHaveBeenCalledWith(loginId);
      expect(
        UserService.fetchSalesHierarchyDetails,
      ).not.toHaveBeenCalled();
    });

    it('should throw an error if an error occurs during execution', async () => {
      // Arrange
      const loginId = 'testLoginId';
      const error = new Error('Test error');
      jest.spyOn(UserModel, 'getUserDetails').mockRejectedValue(error);

      // Act and Assert
      await expect(
        UserService.getUserDetails(loginId),
      ).rejects.toThrow(error);
      expect(UserModel.getUserDetails).toHaveBeenCalledWith(loginId);
    });
  });
});