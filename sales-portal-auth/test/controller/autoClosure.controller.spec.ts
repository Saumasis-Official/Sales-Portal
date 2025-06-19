import { describe, test, expect, jest, beforeEach, afterEach, it } from '@jest/globals';
import { Request, Response } from 'express';
import Template from '../../app/helper/responseTemplate';
import { SuccessMessage } from '../../app/constant/sucess.message';
import { AutoClosureService } from '../../app/service/autoClosure.service';
import { AutoClosureController } from '../../app/controller/autoClosure.controller';

jest.mock('../../app/lib/logger');
jest.mock('../../app/helper/responseTemplate');
jest.mock('../../app/constant/sucess.message');
jest.mock('../../app/constant/error.message');
jest.mock('../../app/service/autoClosure.service');
describe('ArsController', () => {
    describe('fetchAutoClosureMtEcomConfig', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;

        beforeEach(() => {
            req = {
                body: {
                    limit: 10,
                    offset: 0,
                },
            };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as unknown as Response;
            jest.clearAllMocks();
        });
        const mockResponse: object[] = [
            {
                id: '1',
                customer_group: '14',
                short_close_single_grn: null,
                short_close_multi_grn: '8',
                remarks: 'kj lkj l ljkl lk',
                updated_by: 'PORTAL_15',
                updated_on: '2025-06-02T05:57:22.323Z',
                created_on: '2025-05-19T06:21:57.011Z',
                deleted: false,
                revision_id: '5665aea2-658b-4428-a6a4-a046dfb18acf',
                updated_by_user_name: 'Harshit Wadhwa(SUPER_ADMIN)',
                customer_group_desc: 'Modern Trade',
                total_count: '5',
            },
        ];
        test('positive case: should fetch auto closure MTEcom config successfully', async () => {
            (AutoClosureService.fetchAutoClosureMtEcomConfig as jest.MockedFunction<typeof AutoClosureService.fetchAutoClosureMtEcomConfig>).mockResolvedValue(mockResponse);
            await AutoClosureController.fetchAutoClosureMtEcomConfig(req as Request, res as unknown as Response);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(Template.success(SuccessMessage.FETCH_AUTO_CLOSURE_MT, mockResponse));
        });
    });

    describe('updateAutoClosureMtEcomConfig', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    someKey: 'someValue', // Replace with actual payload structure
                },
                user: {
                    user_id: 'testUserId',
                },
            } as unknown as Request;
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as unknown as Response;
            statusMock = res.status as jest.Mock;
            jsonMock = res.json as jest.Mock;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return 200 and success template when result is found', async () => {
            const response = []; // Mocked response
            jest.spyOn(AutoClosureService, 'updateAutoClosureMtEcomConfig').mockResolvedValue(response);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await AutoClosureController.updateAutoClosureMtEcomConfig(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 200 and error template when result is not found', async () => {
            const response = null; // Mocked response
            jest.spyOn(AutoClosureService, 'updateAutoClosureMtEcomConfig').mockResolvedValue(response);
            jest.spyOn(Template, 'errorMessage').mockReturnValue({ error: true });

            await AutoClosureController.updateAutoClosureMtEcomConfig(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('autoClosureReportMT', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    filterOptions: {
                        limit: 10,
                        offset: 0,
                    },
                },
            } as unknown as Request;
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as unknown as Response;
            statusMock = res.status as jest.Mock;
            jsonMock = res.json as jest.Mock;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return 200 and success template when result is found', async () => {
            const response = [{ sales_order: 'SO123', po_number: 'PO123' }];
            jest.spyOn(AutoClosureService, 'autoClosureReportMT').mockResolvedValue(response);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await AutoClosureController.autoClosureReportMT(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });
    });
});
