import { UserModel } from "../../app/model/userModel";
import { UserService } from "../../app/service/user.service";
import { jest, describe, beforeEach, afterEach, it, expect, } from '@jest/globals';

const sampleSuccessQuery = { rows: [{}], rowCount: 1, oid: 0, command: '', fields: [] }

describe('UserService', () => {

    describe('getSessionInvalidateStatus', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return session invalidate status', async () => {
            const loginId = 'testLoginId';
            const uuid = 'testUuid';
            const expectedResponse = [{ status: 'invalid' }];

            jest.spyOn(UserModel, 'getInvalidateSessionStatus').mockResolvedValue(expectedResponse);

            const result = await UserService.getSessionInvalidateStatus(loginId, uuid);

            expect(result).toEqual(expectedResponse);
            expect(UserModel.getInvalidateSessionStatus).toHaveBeenCalledWith(loginId, uuid);
        });
    });

    describe('fetchDistributorDetails', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should fetch distributor details', async () => {
            const distributorCode = 'testDistributorCode';
            const expectedResponse = { name: 'Distributor Name' };

            jest.spyOn(UserModel, 'fetchDistributorDetails').mockResolvedValue(expectedResponse);

            const result = await UserService.fetchDistributorDetails(distributorCode);

            expect(result).toEqual(expectedResponse);
            expect(UserModel.fetchDistributorDetails).toHaveBeenCalledWith(distributorCode);
        });
    });

    describe('getMaterialsList', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should get materials list', async () => {
            const distributorId = 'testDistributorId';
            const queryParams = { param1: 'value1' };
            const expectedResponse = [{ material: 'Material1' }];

            jest.spyOn(UserModel, 'getMaterialsList').mockResolvedValue(expectedResponse);

            const result = await UserService.getMaterialsList(distributorId, queryParams);

            expect(result).toEqual(expectedResponse);
            expect(UserModel.getMaterialsList).toHaveBeenCalledWith(distributorId, queryParams);
        });
    });


    describe('createSalesHierarchyObject', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return an object with the correct properties', () => {
            const row = {
                user_id: 'testUserId',
                first_name: 'testFirstName',
                last_name: 'testLastName',
                email: 'test@example.com',
                mobile_number: '1234567890',
                code: 'testCode',
            };

            const result = UserService.createSalesHierarchyObject(row);

            expect(result).toEqual({
                user_id: 'testUserId',
                first_name: 'testFirstName',
                last_name: 'testLastName',
                email: 'test@example.com',
                mobile_number: '1234567890',
                code: 'testCode',
            });
        });
    });
});