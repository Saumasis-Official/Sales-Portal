import { jest, describe, it, afterEach, beforeEach, expect } from '@jest/globals';
import { UserService } from '../../app/service/user.service';
import { UserController } from '../../app/controller/user.controller';
import { Request, Response } from 'express';
import Template from '../../app/helper/responseTemplate';

describe('UserController', () => { 
    describe('fetchDistributorDetails', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;

        beforeEach(() => {
            req = {
                params: {
                    distributorCode: '12345'
                }
            } as unknown as Request;
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            } as unknown as Response;
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should return distributor details', async () => {
            const response = {
                distributorCode: '12345',
            };
            jest.spyOn(UserService, 'fetchDistributorDetails').mockResolvedValue(response);
            await UserController.fetchDistributorDetails(req as Request, res as Response);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(Template.success(response, ""));
        });

        it('should return error message when UserService throws error', async () => {
            jest.spyOn(UserService, 'fetchDistributorDetails').mockRejectedValue(new Error('Internal server error'));
            await UserController.fetchDistributorDetails(req as Request, res as Response);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(Template.errorMessage('Internal server error'));
        });
            
            
    });
});