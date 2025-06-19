import { Request, Response } from 'express';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { SkuRuleConfigurationsService } from "../../app/service/skuRuleConfig.service"
import Template from '../../app/helper/responseTemplate';
import { SkuRuleConfigurationsController } from '../../app/controller/skuRuleConfig.controller';
import { SuccessMessage } from '../../app/constants/successMessage';
import { ErrorMessage } from '../../app/constants/errorMessage';

describe('SkuRuleConfigurationsController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;
    describe('upsertRuleConfiguration', () => {
        beforeEach(() => {
            req = {
                body: {
                    data: [],
                    dist_channels:[]
                },
                user: {
                    user_id: 'test_user'
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

        it('should return 200 and success template when result is found', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsService, 'upsertRuleConfiguration').mockImplementation(() => Promise.resolve([]));
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await SkuRuleConfigurationsController.upsertRuleConfiguration(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(Template.success(result, SuccessMessage.UPSERT_SKU_RULE_CONFIGURATIONS));
        });

        it('should handle error during upsert rule configuration', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsService, 'upsertRuleConfiguration').mockRejectedValue(mockError);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await SkuRuleConfigurationsController.upsertRuleConfiguration(req as Request, res as Response);

            expect(SkuRuleConfigurationsService.upsertRuleConfiguration).toHaveBeenCalledWith(req.body.data, 'test_user', req.body.dist_channels);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

    })

    describe('upsertAllRuleConfiguration', () => {
        beforeEach(() => {
            req = {
                body: {
                    data:[]
                },
                user: {
                    user_id: 'test_user'
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

        it('should return 200 and success template when result is found', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsService, 'upsertAllRuleConfiguration').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await SkuRuleConfigurationsController.upsertAllRuleConfiguration(req as Request, res as Response);

            expect(SkuRuleConfigurationsService.upsertAllRuleConfiguration).toHaveBeenCalledWith(req.body.data, 'test_user');
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should handle error during upsert all rule configurations', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsService, 'upsertAllRuleConfiguration').mockRejectedValue(mockError);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await SkuRuleConfigurationsController.upsertAllRuleConfiguration(req as Request, res as Response);

            expect(SkuRuleConfigurationsService.upsertAllRuleConfiguration).toHaveBeenCalledWith(req.body.data, 'test_user');
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    })

    describe('getCustomerGroups', () => {
        beforeEach(() => {
            req = {} as Partial<Request>;
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

        it('should return 200 and success template when result is found', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsService, 'getCustomerGroups').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await SkuRuleConfigurationsController.getCustomerGroups(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(Template.success(result, SuccessMessage.FETCH_CUSTOMER_GROUPS));
        });

        it('should handle error during getCustomerGroups', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsService, 'getCustomerGroups').mockRejectedValue(mockError);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await SkuRuleConfigurationsController.getCustomerGroups(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        });
    });

    describe('getSKUCode', () => {
        beforeEach(() => {
            req = {
                body: {
                    area_codes: [],
                    non_forecasted: false,
                    dist_channels: []
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

        it('should return 200 and success template when result is found', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsService, 'getSKUCode').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await SkuRuleConfigurationsController.getSKUCode(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(Template.success(result, SuccessMessage.FETCH_SKU_CODE));
        });

        it('should handle error during getSKUCode', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsService, 'getSKUCode').mockRejectedValue(mockError);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await SkuRuleConfigurationsController.getSKUCode(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        });
    });

    describe('getSKUDetails', () => {
        beforeEach(() => {
            req = {
                body: {
                    sku: 'test_sku',
                    area_codes: [],
                    non_forecasted: false
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

        it('should return 200 and success template when result is found', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsService, 'getSKUDetails').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await SkuRuleConfigurationsController.getSKUDetails(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(Template.success(result, SuccessMessage.FETCH_SKU_DETAILS));
        });

        it('should handle error during getSKUDetails', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsService, 'getSKUDetails').mockRejectedValue(mockError);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await SkuRuleConfigurationsController.getSKUDetails(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        });
    });

    describe('fetchBrandAndBrandVariantCombinations', () => {
        beforeEach(() => {
            req = {
                body: {
                    area_codes: []
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

        it('should return 200 and success template when result is found', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsService, 'fetchBrandAndBrandVariantCombinations').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await SkuRuleConfigurationsController.fetchBrandAndBrandVariantCombinations(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(Template.success(result, SuccessMessage.FETCH_BRAND_AND_BRAND_VARIANT_COMBINATIONS));
        });

        it('should handle error during fetchBrandAndBrandVariantCombinations', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsService, 'fetchBrandAndBrandVariantCombinations').mockRejectedValue(mockError);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await SkuRuleConfigurationsController.fetchBrandAndBrandVariantCombinations(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        });
    });

    describe('fetchBrandVariantDetails', () => {
        beforeEach(() => {
            req = {
                body: {
                    brand_variant_code: 'test_code',
                    area_codes: []
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

        it('should return 200 and success template when result is found', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsService, 'fetchBrandVariantDetails').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await SkuRuleConfigurationsController.fetchBrandVariantDetails(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(Template.success(result, SuccessMessage.FETCH_BRAND_VARIANT_DETAILS));
        });

        it('should handle error during fetchBrandVariantDetails', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsService, 'fetchBrandVariantDetails').mockRejectedValue(mockError);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await SkuRuleConfigurationsController.fetchBrandVariantDetails(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        });
    });

    describe('getDbList', () => {
        beforeEach(() => {
            req = {
                query: {
                    dist_channels: ''
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

        it('should return 200 and success template when result is found', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsService, 'getDbList').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await SkuRuleConfigurationsController.getDbList(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(Template.success(result, SuccessMessage.FETCH_DISTRIBUTOR_LIST));
        });

        it('should handle error during getDbList', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsService, 'getDbList').mockRejectedValue(mockError);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await SkuRuleConfigurationsController.getDbList(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(Template.error(ErrorMessage.FETCH_DISTRIBUTOR_LIST));
        });
    });

    describe('upsertBrandVariantPrioritization', () => {
        beforeEach(() => {
            req = {
                body: {
                    data: {}
                },
                user: {
                    user_id: 'test_user'
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

        it('should return 200 and success template when result is found', async () => {
            const result = {};
            jest.spyOn(SkuRuleConfigurationsService, 'upsertBrandVariantPrioritization').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await SkuRuleConfigurationsController.upsertBrandVariantPrioritization(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(Template.success(result, SuccessMessage.UPSERT_BRAND_VARIANT_PRIORITIZATION));
        });

        it('should handle error during upsertBrandVariantPrioritization', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsService, 'upsertBrandVariantPrioritization').mockRejectedValue(mockError);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await SkuRuleConfigurationsController.upsertBrandVariantPrioritization(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        });
    });

    describe('fetchPrioritization', () => {
        beforeEach(() => {
            req = {
                body: {
                    area_codes: [],
                    search: ''
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

        it('should return 200 and success template when result is found', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsService, 'fetchPrioritization').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await SkuRuleConfigurationsController.fetchPrioritization(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(Template.success(result, SuccessMessage.FETCH_PRIORITIZATION));
        });

        it('should handle error during fetchPrioritization', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsService, 'fetchPrioritization').mockRejectedValue(mockError);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await SkuRuleConfigurationsController.fetchPrioritization(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        });
    });
})