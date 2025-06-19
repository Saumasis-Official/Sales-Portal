import { ErrorReportingService } from '../../app/service/ErrorReporting.service';
import { ErrorReportingModel } from '../../app/models/ErrorReporting.model';

jest.mock('../../app/models/ErrorReporting.model');

describe('ErrorReportingService', () => {
    const user = { user_id: 'user123', roles: 'admin' };

    describe('reportPortalError', () => {
        it('should report a portal error', async () => {
            const errorObj = {
                remarks: "Test error",
                distributorId: "dist123",
                errorCode: "E001",
                errorMessage: "An error occurred",
                corrlnId: "corr123",
                logObj: { key: "value" },
                categoryId: 1,
                recipients: undefined,
                created_by_user_group: null
            };

            await ErrorReportingService.reportPortalError(errorObj, user);

            expect(ErrorReportingModel.reportPortalError).toHaveBeenCalledWith({
                remarks: "Test error",
                user_id: "dist123",
                error_code: "E001",
                error_message: "An error occurred",
                corr_id: "corr123",
                error_info: { key: "value" },
                category_id: 1,
                created_by: "user123",
                created_by_user_group: "admin"
            });
        });
    });

    describe('reportCFAPortalError', () => {
        it('should report a CFA portal error', async () => {
            const errorObj = {
                remarks: "Test CFA error",
                errorCode: "E002",
                errorMessage: "A CFA error occurred",
                corrlnId: "corr456",
                logObj: { key: "value2" },
                categoryId: 2,
                recipients: undefined
            };

            await ErrorReportingService.reportCFAPortalError(errorObj, user);

            expect(ErrorReportingModel.reportCFAPortalError).toHaveBeenCalledWith({
                remarks: "Test CFA error",
                error_code: "E002",
                error_message: "A CFA error occurred",
                corr_id: "corr456",
                error_info: { key: "value2" },
                category_id: 2,
                created_by: "user123",
                created_by_user_group: "admin"
            });
        });
    });

    describe('fetchServiceRequestCategories', () => {
        it('should fetch service request categories', async () => {
            const type = 'error';
            await ErrorReportingService.fetchServiceRequestCategories(type);
            expect(ErrorReportingModel.fetchServiceRequestCategories).toHaveBeenCalledWith(type);
        });
    });

    describe('addServiceRequestCategory', () => {
        it('should add a service request category', async () => {
            const requestCategory = { label: 'New Category', description: 'Description', type: 'error' };
            const createdBy = 'user123';
            await ErrorReportingService.addServiceRequestCategory(requestCategory, createdBy);
            expect(ErrorReportingModel.addServiceRequestCategory).toHaveBeenCalledWith('New Category', 'Description', 'user123', 'error');
        });
    });

    describe('modifyServiceRequestCategory', () => {
        it('should modify a service request category', async () => {
            const categoryId = 1;
            const requestCategory = { label: 'Updated Category', description: 'Updated Description', enable: true, type: 'error' };
            const updatedBy = 'user123';
            await ErrorReportingService.modifyServiceRequestCategory(categoryId, requestCategory, updatedBy);
            expect(ErrorReportingModel.modifyServiceRequestCategory).toHaveBeenCalledWith(categoryId, 'Updated Category', 'Updated Description', true, 'user123', 'error');
        });
    });
});