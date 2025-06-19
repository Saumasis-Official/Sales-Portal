import { Request, Response } from 'express';
import { ArsController } from '../../app/controller/arsController';
import { ArsService } from '../../app/service/ars.service';
import Template from '../../app/helper/responseTemplate';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { QueryResult } from 'pg';
import { ErrorMessage } from '../../app/constants/errorMessage';
import { SuccessMessage } from '../../app/constants/successMessage';
import { LogService } from '../../app/service/logService';

const sampleSuccessQuery = { rows: [{}], rowCount: 1, oid: 0, command: '', fields: [] };

describe('ArsController', () => {
    describe('getRegionalBrandVariants', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    areaCode: 'testAreaCode',
                },
            } as Request;
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
            const result: QueryResult<any> = { rows: [], rowCount: 1, oid: 0, command: '', fields: [] };
            jest.spyOn(ArsService, 'getRegionalBrandVariants').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.getRegionalBrandVariants(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 200 and error template when result is not found', async () => {
            const result = null;
            jest.spyOn(ArsService, 'getRegionalBrandVariants').mockResolvedValue(result);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.getRegionalBrandVariants(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'getRegionalBrandVariants').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.getRegionalBrandVariants(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('getForecastData', () => {
        let req: Request;
        let res: Response;
        type GetForecastDataType = (areaCode: string, brandVariantCode: string) => Promise<any>;

        beforeEach(() => {
            req = {
                body: {
                    areaCode: '123',
                    brandVariantCode: '456',
                },
            } as Request;
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as unknown as Response;
        });

        it('should return success response with forecast data', async () => {
            const mockResult = { data: 'forecast data' };
            const getMockedForecastData = jest.spyOn(ArsService, 'getForecastData') as jest.MockedFunction<GetForecastDataType>;
            getMockedForecastData.mockResolvedValue(mockResult);

            await ArsController.getForecastData(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(Template.success(mockResult, SuccessMessage.GET_FORECAST));
        });

        it('should return error response if result is falsy', async () => {
            const mockResult = null;
            const mockedForecastResult = jest.spyOn(ArsService, 'getForecastData') as jest.MockedFunction<GetForecastDataType>;
            mockedForecastResult.mockResolvedValue(mockResult);

            await ArsController.getForecastData(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(Template.error(ErrorMessage.GET_FORECAST_ERROR, '', mockResult));
        });

        it('should return error response if an error occurs', async () => {
            const mockError = new Error('Some error');
            const mockedForecastResult = jest.spyOn(ArsService, 'getForecastData') as jest.MockedFunction<GetForecastDataType>;
            mockedForecastResult.mockRejectedValue(mockError);
            await ArsController.getForecastData(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(Template.error(ErrorMessage.GET_FORECAST_ERROR, mockError));
        });
    });

    describe('updateForecastData', () => {
        const upsertForecastDistributionDataType = (areaCode: string, data: any, quantityNormPskuClass?: string | null) => Promise<boolean | string[] | null>;
        it('should update forecast data successfully', async () => {
            const mockResult: number | null = 1;
            const req = {
                body: { areaCode: '123' },
                user: { user_id: 'user123' },
            } as Partial<Request>;
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as Partial<Response>;

            jest.spyOn(ArsService, 'upsertForecastDistribution').mockResolvedValue(true);
            jest.spyOn(ArsService, 'updateForecastData').mockResolvedValue(mockResult);

            await ArsController.updateForecastData(req as Request, res as Response);

            expect(ArsService.upsertForecastDistribution).toHaveBeenCalledWith('123', req.body);
            expect(ArsService.updateForecastData).toHaveBeenCalledWith(req.body, 'user123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(Template.success(mockResult, SuccessMessage.UPDATE_FORECAST));
        });

        it('should return an error if updateForecastData fails', async () => {
            const mockError = new Error('Update failed');
            const req = {
                body: { areaCode: '123' },
                user: { user_id: 'user123' },
            } as Partial<Request>;
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as Partial<Response>;

            jest.spyOn(ArsService, 'upsertForecastDistribution').mockResolvedValue(false);
            jest.spyOn(ArsService, 'updateForecastData').mockRejectedValue(mockError);

            await ArsController.updateForecastData(req as Request, res as Response);

            expect(ArsService.upsertForecastDistribution).toHaveBeenCalledWith('123', req.body);
            expect(ArsService.updateForecastData).toHaveBeenCalledWith(req.body, 'user123');
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(Template.error(ErrorMessage.UPDATE_FORECAST, mockError));
        });

        it('should handle absence of result after update', async () => {
            const req = {
                body: { areaCode: '123' },
                user: { user_id: 'user123' },
            } as Partial<Request>;
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as Partial<Response>;

            jest.spyOn(ArsService, 'upsertForecastDistribution').mockResolvedValue(false);
            jest.spyOn(ArsService, 'updateForecastData').mockResolvedValue(null);

            await ArsController.updateForecastData(req as Request, res as Response);

            expect(ArsService.upsertForecastDistribution).toHaveBeenCalledWith('123', req.body);
            expect(ArsService.updateForecastData).toHaveBeenCalledWith(req.body, 'user123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(Template.error(ErrorMessage.UPDATE_FORECAST, '', null));
        });
    });

    describe('getRegionalBrands', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    areaCode: 'testAreaCode',
                },
            } as Request;
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
            const result: QueryResult<any> = { rows: [], rowCount: 1, oid: 0, command: '', fields: [] };
            jest.spyOn(ArsService, 'getRegionalBrands').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.getRegionalBrands(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 200 and error template when result is not found', async () => {
            const result = null;
            jest.spyOn(ArsService, 'getRegionalBrands').mockResolvedValue(result);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.getRegionalBrands(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'getRegionalBrands').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.getRegionalBrands(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });
    describe('fetchForecastConfigurations', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    areaCode: 'testAreaCode',
                },
            } as Request;
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

        it('should return 200 and success template when forecast configurations are found', async () => {
            const forecastConfigurations = [{ config: 'testConfig' }];
            jest.spyOn(ArsService, 'fetchForecastConfigurations').mockResolvedValue(forecastConfigurations);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.fetchForecastConfigurations(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 200 and error template when forecast configurations are not found', async () => {
            const forecastConfigurations = null;
            jest.spyOn(ArsService, 'fetchForecastConfigurations').mockResolvedValue(forecastConfigurations);
            jest.spyOn(Template, 'errorMessage').mockReturnValue({ error: true });

            await ArsController.fetchForecastConfigurations(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'fetchForecastConfigurations').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.fetchForecastConfigurations(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('updateForecastConfiguration', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                user: {
                    roles: ['admin'],
                    user_id: 'user123',
                },
                body: {
                    config: 'testConfig',
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

        it('should return 200 and success template when forecast configuration is updated successfully', async () => {
            const response: QueryResult<any> = sampleSuccessQuery;
            jest.spyOn(ArsService, 'updateForecastConfiguration').mockResolvedValue(response);
            jest.spyOn(Template, 'successMessage').mockReturnValue({ success: true });

            await ArsController.updateForecastConfiguration(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 200 and error template when forecast configuration update fails', async () => {
            const response = false;
            jest.spyOn(ArsService, 'updateForecastConfiguration').mockResolvedValue(response);
            jest.spyOn(Template, 'errorMessage').mockReturnValue({ error: true });

            await ArsController.updateForecastConfiguration(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'updateForecastConfiguration').mockRejectedValue(error);
            jest.spyOn(Template, 'errorMessage').mockReturnValue({ error: true });

            await ArsController.updateForecastConfiguration(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('stockData', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    dbCode: 'testDbCode',
                    psku: 'testPsku',
                    docType: 'testDocType',
                },
            } as Request;
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

        it('should return 200 and success template when stock data is found', async () => {
            const result: {
                sku: any;
                cf: any;
                stock_in_transit: string;
                stock_in_hand: string;
                open_order: string;
            }[] = [{ sku: '', cf: '', stock_in_transit: '', stock_in_hand: '', open_order: '' }];
            jest.spyOn(ArsService, 'stockData').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.stockData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 200 and error template when stock data is not found', async () => {
            const result = null;
            jest.spyOn(ArsService, 'stockData').mockResolvedValue(result);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.stockData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'stockData').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.stockData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('autoSubmitForecastData', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                query: {
                    forecast_sync: 'true',
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

        it('should return 200 and success message when autoSubmitForecastData is called', async () => {
            jest.spyOn(ArsService, 'autoSubmitForecastData').mockResolvedValue(true);
            jest.spyOn(Template, 'successMessage').mockReturnValue({ success: true });

            await ArsController.autoSubmitForecastData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error message when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'autoSubmitForecastData').mockImplementation(() => {
                throw error;
            });
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.autoSubmitForecastData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('forecastDumpValidation', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {} as Request;
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

        it('should return 200 and success message when forecastDumpValidation is called', async () => {
            jest.spyOn(ArsService, 'forecastDumpValidation').mockResolvedValue(true);

            await ArsController.forecastDumpValidation(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ status: 'True', message: 'Service running in background.Forecast dump validation report email will be sent' });
        });

        it('should return 500 and error message when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'forecastDumpValidation').mockImplementation(() => {
                throw error;
            });

            await ArsController.forecastDumpValidation(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ status: false, message: 'Could not send report' });
        });
    });

    describe('autoOrderReportEmail', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {} as Request;
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

        it('should return 200 and success message when autoOrderReportEmail is called', async () => {
            jest.spyOn(ArsService, 'autoOrderReportEmail').mockResolvedValue(undefined);
            await ArsController.autoOrderReportEmail(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ status: 'True', message: 'Auto Order Report sent!' });
        });

        it('should return 500 and error message when an error occurs', async () => {
            const error = new Error('Auto Order Report could not be sent!');
            const insertSyncLogResult: QueryResult<any> = sampleSuccessQuery;
            jest.spyOn(ArsService, 'autoOrderReportEmail').mockImplementation(() => {
                throw error;
            });
            jest.spyOn(LogService, 'insertSyncLog').mockResolvedValue(insertSyncLogResult);

            await ArsController.autoOrderReportEmail(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ status: 'False', message: 'Auto Order Report could not be sent!' });
        });
    });

    describe('autoSubmitForecastData', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                query: {
                    forecast_sync: 'true',
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

        it('should return 200 and success message when autoSubmitForecastData is called', async () => {
            jest.spyOn(ArsService, 'autoSubmitForecastData').mockResolvedValue(true);
            jest.spyOn(Template, 'successMessage').mockReturnValue({ success: true });

            await ArsController.autoSubmitForecastData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error message when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'autoSubmitForecastData').mockImplementation(() => {
                throw error;
            });
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.autoSubmitForecastData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('sihSsEmailCheck', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {} as Request;
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

        it('should return 200 and success template when safety stock check is successful', async () => {
            const result = { dbs_locked: [] };
            const insertSyncLogResult: QueryResult<any> = sampleSuccessQuery;

            jest.spyOn(ArsService, 'safetyStockCheck').mockResolvedValue(result);
            jest.spyOn(LogService, 'insertSyncLog').mockResolvedValue(insertSyncLogResult);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.sihSsEmailCheck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error template when safety stock check returns null', async () => {
            const insertSyncLogResult: QueryResult<any> = sampleSuccessQuery;
            jest.spyOn(ArsService, 'safetyStockCheck').mockResolvedValue(null);
            jest.spyOn(LogService, 'insertSyncLog').mockResolvedValue(insertSyncLogResult);
            jest.spyOn(Template, 'errorMessage').mockReturnValue({ error: true });

            await ArsController.sihSsEmailCheck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            const insertSyncLogResult: QueryResult<any> = sampleSuccessQuery;

            jest.spyOn(ArsService, 'safetyStockCheck').mockRejectedValue(error);
            jest.spyOn(LogService, 'insertSyncLog').mockResolvedValue(insertSyncLogResult);
            jest.spyOn(Template, 'internalServerError').mockReturnValue({ error: true });

            await ArsController.sihSsEmailCheck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('forecastDumpValidation', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {} as Request;
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

        it('should return 200 and success message when forecastDumpValidation is called', async () => {
            const result = true;
            jest.spyOn(ArsService, 'forecastDumpValidation').mockResolvedValue(result);

            await ArsController.forecastDumpValidation(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ status: 'True', message: 'Service running in background.Forecast dump validation report email will be sent' });
        });

        it('should return 500 and error message when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'forecastDumpValidation').mockImplementation(() => {
                throw error;
            });

            await ArsController.forecastDumpValidation(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ status: false, message: 'Could not send report' });
        });
    });

    describe('autoOrderReportEmail', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {} as Request;
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

        it('should return 200 and success message when autoOrderReportEmail is called', async () => {
            jest.spyOn(ArsService, 'autoOrderReportEmail').mockResolvedValue(undefined);

            await ArsController.autoOrderReportEmail(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ status: 'True', message: 'Auto Order Report sent!' });
        });

        it('should return 500 and error message when an error occurs', async () => {
            const error = new Error('test error');
            const insertSyncLogResult: QueryResult<any> = sampleSuccessQuery;
            jest.spyOn(ArsService, 'autoOrderReportEmail').mockImplementation(() => {
                throw error;
            });
            jest.spyOn(LogService, 'insertSyncLog').mockResolvedValue(insertSyncLogResult);

            await ArsController.autoOrderReportEmail(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ status: 'False', message: 'Auto Order Report could not be sent!' });
        });
    });

    describe('sihSsEmailCheck', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {} as Request;
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

        it('should return 200 and success template when safety stock check is successful', async () => {
            const result = { dbs_locked: [] };
            const insertSyncLogResult: QueryResult<any> = sampleSuccessQuery;
            jest.spyOn(ArsService, 'safetyStockCheck').mockResolvedValue(result);
            jest.spyOn(LogService, 'insertSyncLog').mockResolvedValue(insertSyncLogResult);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.sihSsEmailCheck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error template when safety stock check returns null', async () => {
            const insertSyncLogResult: QueryResult<any> = sampleSuccessQuery;
            jest.spyOn(ArsService, 'safetyStockCheck').mockResolvedValue(null);
            jest.spyOn(LogService, 'insertSyncLog').mockResolvedValue(insertSyncLogResult);
            jest.spyOn(Template, 'errorMessage').mockReturnValue({ error: true });

            await ArsController.sihSsEmailCheck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            const insertSyncLogResult: QueryResult<any> = sampleSuccessQuery;
            jest.spyOn(ArsService, 'safetyStockCheck').mockRejectedValue(error);
            jest.spyOn(LogService, 'insertSyncLog').mockResolvedValue(insertSyncLogResult);
            jest.spyOn(Template, 'internalServerError').mockReturnValue({ error: true });

            await ArsController.sihSsEmailCheck(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('downloadForecastSummary', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                query: {
                    area: 'testArea',
                },
                user: {
                    roles: 'testRole',
                    user_id: 'testUserId',
                    code: 'testCode',
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

        it('should return 200 and success template when forecast summary is found', async () => {
            const result = { data: 'testData' };
            jest.spyOn(ArsService, 'downloadForecastSummary').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.downloadForecastSummary(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 200 and error template when forecast summary is not found', async () => {
            const result = null;
            jest.spyOn(ArsService, 'downloadForecastSummary').mockResolvedValue(result);
            jest.spyOn(Template, 'errorMessage').mockReturnValue({ error: true });

            await ArsController.downloadForecastSummary(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'downloadForecastSummary').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.downloadForecastSummary(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('fetchStockLevelSyncStatus', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {} as Request;
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

        it('should return 200 and success template when stock level sync status is found', async () => {
            const response = { data: 'testData' };
            jest.spyOn(ArsService, 'fetchStockLevelSyncStatus').mockResolvedValue(response);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.fetchStockLevelSyncStatus(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 200 and error template when stock level sync status is not found', async () => {
            const response = null;
            jest.spyOn(ArsService, 'fetchStockLevelSyncStatus').mockResolvedValue(response);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.fetchStockLevelSyncStatus(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'fetchStockLevelSyncStatus').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.fetchStockLevelSyncStatus(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('fetchSkuStockData', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    distributor_code: 'testDistributorCode',
                    sku: 'testSku',
                    docType: 'testDocType',
                },
            } as Request;
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

        it('should return 200 and success template when SKU stock data is found', async () => {
            const response = [
                {
                    sku: '1400000000517',
                    description: 'TS_TS_ROCK_SALT_1KG',
                    stock_in_transit: '',
                    stock_in_hand: '',
                    open_order: '',
                    sih_closing_stock_date: '',
                    oo_update_time: '',
                    sit_update_time: '',
                },
            ];
            jest.spyOn(ArsService, 'fetchSkuStockData').mockResolvedValue(response);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.fetchSkuStockData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 200 and error template when SKU stock data is not found', async () => {
            const response = null;
            jest.spyOn(ArsService, 'fetchSkuStockData').mockResolvedValue(response);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.fetchSkuStockData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'fetchSkuStockData').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.fetchSkuStockData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('automatedArsValidation', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    area_codes: ['testAreaCode'],
                },
                query: {
                    month: 'testMonth',
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

        it('should return 200 and success message when automatedArsValidation is called and service is not running', async () => {
            jest.spyOn(ArsService, 'automatedARSValidationSAP').mockResolvedValue(null);
            jest.spyOn(Template, 'successMessage').mockReturnValue({ success: true });

            await ArsController.automatedArsValidation(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error message when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'automatedARSValidationSAP').mockImplementation(() => {
                throw error;
            });
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.automatedArsValidation(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('getMoqMappingData', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                user: {
                    roles: 'ZONAL_OFFICER',
                    email: 'test@example.com',
                },
                body: {
                    search: 'testSearch',
                    limit: 10,
                    offset: 0,
                    area: 'testArea',
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

        it('should return 200 and success template when data is found', async () => {
            const response = { totalCount: 0, rows: [] };
            jest.spyOn(ArsService, 'getMoqMappingData').mockResolvedValue(response);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.getMoqMappingData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'getMoqMappingData').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.getMoqMappingData(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('updateMoq', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                user: {
                    roles: 'LOGISTIC_OFFICER',
                },
                body: {
                    moq_data: 'testData',
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

        it('should return 200 and success message when update is successful', async () => {
            jest.spyOn(ArsService, 'updateMoq').mockResolvedValue(true);
            jest.spyOn(Template, 'successMessage').mockReturnValue({ success: true });

            await ArsController.updateMoq(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'updateMoq').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.updateMoq(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('getDistributorMoq', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    dbCode: 'testDbCode',
                    plantCodes: ['testPlantCode'],
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

        it('should return 200 and success template when data is found', async () => {
            const response = [{ data: 'testData' }];
            jest.spyOn(ArsService, 'getDistributorMoq').mockResolvedValue(response);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.getDistributorMoq(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'getDistributorMoq').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.getDistributorMoq(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('getStockNormAudit', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                params: {
                    cg: 'testCg',
                },
                user: {
                    user_id: 'testUserId',
                    roles: 'testRole',
                },
                body: {
                    offset: 0,
                    limit: 10,
                    ars_db: true,
                    distId: 'testDistId',
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

        it('should return 200 and success template when data is found', async () => {
            const result = { data: 'testData' };
            jest.spyOn(ArsService, 'getStockNormAudit').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.getStockNormAudit(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'getStockNormAudit').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.getStockNormAudit(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('downloadStockNormAudit', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    customer_group: 'some_customer_group',
                    ars_db: 'some_ars_db',
                    distId: 'some_dist_id',
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

        it('should return a successful response when ArsService.downloadStockNormAudit resolves', async () => {
            const mockResponse = { data: 'some_data' };
            jest.spyOn(ArsService, 'downloadStockNormAudit').mockResolvedValue(mockResponse);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.downloadStockNormAudit(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('updateStockNormConfig', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                body: {
                    update: 'testUpdate',
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

        it('should return 200 and success template when update is successful', async () => {
            const result = { data: 'testData' };
            jest.spyOn(ArsService, 'updateStockNormConfig').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true });

            await ArsController.updateStockNormConfig(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'updateStockNormConfig').mockRejectedValue(error);
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.updateStockNormConfig(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('syncStockNorm', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                query: {
                    month: 'testMonth',
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

        it('should return 200 and success message when sync is successful', async () => {
            const result = 55;
            jest.spyOn(ArsService, 'syncStockNormConfig').mockResolvedValue(result);
            jest.spyOn(Template, 'successMessage').mockReturnValue({ success: true });

            await ArsController.syncStockNorm(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'syncStockNormConfig').mockImplementation(() => {
                throw error;
            });
            jest.spyOn(Template, 'error').mockReturnValue({ error: true });

            await ArsController.syncStockNorm(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });

    describe('fetchAreaForecastDumpDetails', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let statusMock: jest.Mock;
        let jsonMock: jest.Mock;

        beforeEach(() => {
            req = {
                params: {
                    areaCode: 'testAreaCode',
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

        it('should return 200 and success message when fetch is successful', async () => {
            const result = [];
            jest.spyOn(ArsService, 'fetchAreaForecastDumpDetails').mockResolvedValue(result);
            jest.spyOn(Template, 'success').mockReturnValue({ success: true, data: result });

            await ArsController.fetchAreaForecastDumpDetails(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: true, data: result });
        });

        it('should return 200 and error message when no result is found', async () => {
            jest.spyOn(ArsService, 'fetchAreaForecastDumpDetails').mockResolvedValue(null);
            jest.spyOn(Template, 'errorMessage').mockReturnValue({ success: false });

            await ArsController.fetchAreaForecastDumpDetails(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ success: false });
        });

        it('should return 500 and error template when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'fetchAreaForecastDumpDetails').mockImplementation(() => {
                throw error;
            });
            jest.spyOn(Template, 'internalServerError').mockReturnValue({ error: true });

            await ArsController.fetchAreaForecastDumpDetails(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: true });
        });
    });
});
