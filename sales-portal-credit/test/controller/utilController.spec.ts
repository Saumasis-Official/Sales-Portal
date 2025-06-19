import { Request, Response } from 'express';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import UtilController from '../../app/controller/utilController';
import responseTemplate from '../../app/helper/responseTemplate';
import { SuccessMessage } from '../../app/constants/successMessage';
import { utilService } from '../../app/service/utilService';

describe('utilController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;

    describe('fetchCustomerGroups', () => {

        beforeEach(() => {
            req = {
                user: {
                    user_id: 'test_user',
                    roles: ['ADMIN']
                }
            } as Partial<Request>;

            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            } as unknown as Partial<Response>;

            statusMock = res.status as jest.Mock;
            jsonMock = res.json as jest.Mock;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return 200 and success response when fetchCustomerGroups is successful', async () => {
            const customerGroupList :any= {
                rowCount: 2,
                rows: [
                    { id: 1, name: 'Group 1' },
                    { id: 2, name: 'Group 2' }
                ]
            };
            jest.spyOn(utilService, 'userMappingList').mockResolvedValue(customerGroupList);
            jest.spyOn(responseTemplate, 'success').mockReturnValue({ success: true, data: customerGroupList });

            await UtilController.userMappingList(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(responseTemplate.success({ rowCount: customerGroupList.rowCount, rows: customerGroupList.rows }, SuccessMessage.CUSTOMER_GROUP_LIST_SUCCESS));
        });

        it('should return 500 and internal server error response when fetchCustomerGroups throws an error', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(utilService, 'userMappingList').mockRejectedValue(mockError);
            jest.spyOn(responseTemplate, 'error').mockReturnValue({ error: true });

            await UtilController.userMappingList(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(responseTemplate.error());
        });
    });
});