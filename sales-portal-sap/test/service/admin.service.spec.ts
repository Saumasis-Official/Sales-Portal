import { AdminService } from '../../app/service/admin.service';
import { AdminModel } from '../../app/models/admin.model';
import logger from '../../app/lib/logger';

jest.mock('../../app/models/admin.model');
jest.mock('../../app/lib/logger');

describe('AdminService', () => {
    const email = 'test@example.com';
    const adminId = 'admin123';
    const distributorId = 'dist123';
    const adminCode = 'adminCode123';
    const role = 'admin';
    const code = 'code123';
    const contactDetailChanges = { update_mobile: '1234567890', update_email: 'test@example.com' };
    const changedBy = 'adminUser';
    const remark = 'Test Remark';

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should get admin details statement', async () => {
        const mockResponse = { email };
        (AdminModel.adminDetailsStatement as jest.Mock).mockResolvedValue(mockResponse);

        const result = await AdminService.adminDetailsStatement(email);

        expect(AdminModel.adminDetailsStatement).toHaveBeenCalledWith(email);
        expect(result).toEqual(mockResponse);
    });

    test('should validate distributor admin or TSE statement', async () => {
        const mockResponse = { valid: true };
        (AdminModel.validateDistAdminOrTseStatement as jest.Mock).mockResolvedValue(mockResponse);

        const result = await AdminService.validateDistAdminOrTseStatement(adminId, distributorId);

        expect(AdminModel.validateDistAdminOrTseStatement).toHaveBeenCalledWith(adminId, distributorId);
        expect(result).toEqual(mockResponse);
    });

    test('should validate TSE admin statement', async () => {
        const mockResponse = { valid: true };
        (AdminModel.validateTseAdminStatement as jest.Mock).mockResolvedValue(mockResponse);

        const result = await AdminService.validateTseAdminStatement(adminCode, distributorId);

        expect(AdminModel.validateTseAdminStatement).toHaveBeenCalledWith(adminCode, distributorId);
        expect(result).toEqual(mockResponse);
    });

    test('should validate super admin statement', async () => {
        const mockResponse = { valid: true };
        (AdminModel.validateSuperAdminStatement as jest.Mock).mockResolvedValue(mockResponse);

        const result = await AdminService.validateSuperAdminStatement(distributorId);

        expect(AdminModel.validateSuperAdminStatement).toHaveBeenCalledWith(distributorId);
        expect(result).toEqual(mockResponse);
    });

    test('should update contact details history', async () => {
        const mockResponse = { command: 'INSERT', rowCount: 1 };
        (AdminModel.updateContactDetailsHistory as jest.Mock).mockResolvedValue(mockResponse);

        const result = await AdminService.updateContactDetailsHistory(distributorId, {
            contact_detail_changes: contactDetailChanges,
            changed_by: changedBy,
            remark
        });

        expect(AdminModel.updateContactDetailsHistory).toHaveBeenCalledWith(distributorId, contactDetailChanges, changedBy, remark);
        expect(result).toBe(true);
    });

    test('should handle error in update contact details history', async () => {
        const mockError = new Error('Test Error');
        (AdminModel.updateContactDetailsHistory as jest.Mock).mockRejectedValue(mockError);

        const result = await AdminService.updateContactDetailsHistory(distributorId, {
            contact_detail_changes: contactDetailChanges,
            changed_by: changedBy,
            remark
        });

        expect(AdminModel.updateContactDetailsHistory).toHaveBeenCalledWith(distributorId, contactDetailChanges, changedBy, remark);
        expect(result).toBe(mockError);
    });

    test('should validate distributor admin mapping', async () => {
        const mockResponse = { valid: true };
        (AdminModel.validateDistributorAdminMapping as jest.Mock).mockResolvedValue(mockResponse);

        const result = await AdminService.validateDistributorAdminMapping(distributorId, role, code);

        expect(AdminModel.validateDistributorAdminMapping).toHaveBeenCalledWith(distributorId, role, code);
        expect(result).toEqual(mockResponse);
    });
});