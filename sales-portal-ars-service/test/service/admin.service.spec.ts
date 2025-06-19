import { jest, describe, beforeEach, afterEach, it, expect, } from '@jest/globals';
import { AdminService } from '../../app/service/admin.service';
import { AdminModel } from '../../app/model/adminModel';

const sampleSuccessQuery = { rows: [{}], rowCount: 1, oid: 0, command: '', fields: [] }

describe('AdminService', () => {
    describe('adminDetailsStatement', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('should return admin details for a given email', async () => {
            const email = 'test@example.com';
            const mockResponse = sampleSuccessQuery;
            const adminDetailsSpy = jest.spyOn(AdminModel, 'adminDetailsStatement').mockResolvedValue(mockResponse);

            const result = await AdminService.adminDetailsStatement(email);
            expect(result).toEqual(mockResponse);
            expect(adminDetailsSpy).toHaveBeenCalledWith(email);
        });
    });

    describe('validateSuperAdminStatement', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('should validate super admin for a given distributorId', async () => {
            const distributorId = '12345';
            const mockResponse = sampleSuccessQuery;
            const validateSuperAdminSpy = jest.spyOn(AdminModel, 'validateSuperAdminStatement').mockResolvedValue(mockResponse);

            const result = await AdminService.validateSuperAdminStatement(distributorId);
            expect(result).toEqual(mockResponse);
            expect(validateSuperAdminSpy).toHaveBeenCalledWith(distributorId);
        });
    });

    describe('validateDistributorAdminMapping', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('should validate distributor admin mapping for given parameters', async () => {
            const distributorId = '12345';
            const role = ['admin'];
            const code = 'ABC123';
            const mockResponse = true;
            const validateDistributorAdminMappingSpy = jest.spyOn(AdminModel, 'validateDistributorAdminMapping').mockResolvedValue(mockResponse);

            const result = await AdminService.validateDistributorAdminMapping(distributorId, role, code);
            expect(result).toEqual(mockResponse);
            expect(validateDistributorAdminMappingSpy).toHaveBeenCalledWith(distributorId, role, code);
        });
    })
})