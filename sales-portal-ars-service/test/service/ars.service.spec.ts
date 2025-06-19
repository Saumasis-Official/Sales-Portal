import { Request, Response } from 'express';
import { ArsController } from '../../app/controller/arsController';
import Template from '../../app/helper/responseTemplate';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { QueryResult } from 'pg';
import { ErrorMessage } from '../../app/constants/errorMessage';
import { SuccessMessage } from '../../app/constants/successMessage';
import { LogService } from '../../app/service/logService';
import { ArsModel } from '../../app/model/arsModel';
import { arsHelpers } from '../../app/helper/arsHelper';
import Helper from '../../app/helper';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { ArsRules } from '../../app/lib/businessRules';
import Email from '../../app/helper/email';
import { ArsService } from '../../app/service/ars.service';
import { AdminModel } from '../../app/model/adminModel';
import S3Helper from '../../app/helper/ConnectToS3Bucket';
import { AutoValidationRules } from '../../app/lib/validationRules';
import { UserService } from '../../app/service/user.service';
import { SapApi } from '../../app/helper/sapApi';
import { ArsAutoSubmitRules } from '../../app/lib/arsAutoSubmitRule';
import * as workerThread from 'worker-thread';

jest.mock('axios');
jest.mock('worker-thread');

const mAxios = axios as jest.MockedFunction<typeof axios>;
const mWorkerThread = workerThread as jest.Mocked<typeof workerThread>;

const sampleSuccessQuery = { rows: [{}], rowCount: 1, oid: 0, command: '', fields: [] };

describe('ArsService', () => {
    describe('getRegionalBrandVariants', () => {
        let areaCode: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when found', async () => {
            const result = { rows: [], rowCount: 1, oid: 0, command: '', fields: [] };
            jest.spyOn(ArsModel, 'getRegionalBrandVariants').mockResolvedValue(result);

            const serviceResult = await ArsService.getRegionalBrandVariants(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should return null when result is not found', async () => {
            const result = null;
            jest.spyOn(ArsModel, 'getRegionalBrandVariants').mockResolvedValue(result);

            const serviceResult = await ArsService.getRegionalBrandVariants(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'getRegionalBrandVariants').mockRejectedValue(error);

            await expect(ArsService.getRegionalBrandVariants(areaCode)).rejects.toThrow(error);
        });
    });

    describe('getRegionalBrands', () => {
        let areaCode: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when found', async () => {
            const result = sampleSuccessQuery;
            jest.spyOn(ArsModel, 'getRegionalBrands').mockResolvedValue(result);

            const serviceResult = await ArsService.getRegionalBrands(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should return null when result is not found', async () => {
            const result = null;
            jest.spyOn(ArsModel, 'getRegionalBrands').mockResolvedValue(result);

            const serviceResult = await ArsService.getRegionalBrands(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'getRegionalBrands').mockRejectedValue(error);

            await expect(ArsService.getRegionalBrands(areaCode)).rejects.toThrow(error);
        });
    });

    describe('fetchForecastConfigurations', () => {
        let areaCode: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when found', async () => {
            const result = { rows: [], rowCount: 1, oid: 0, command: '', fields: [] };
            jest.spyOn(ArsModel, 'fetchForecastConfigurations').mockResolvedValue(result);

            const serviceResult = await ArsService.fetchForecastConfigurations(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should return null when result is not found', async () => {
            const result = null;
            jest.spyOn(ArsModel, 'fetchForecastConfigurations').mockResolvedValue(result);

            const serviceResult = await ArsService.fetchForecastConfigurations(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchForecastConfigurations').mockRejectedValue(error);

            await expect(ArsService.fetchForecastConfigurations(areaCode)).rejects.toThrow(error);
        });
    });

    describe('updateForecastConfiguration', () => {
        let user_id: string;
        let role: string;
        let config: any;

        beforeEach(() => {
            user_id = 'testUser';
            role = 'testRole';
            config = {
                area_code: 'testAreaCode',
                applicable_month: 'testMonth',
                config_data: {
                    key: {
                        weekly_week1: '1',
                        weekly_week2: '2',
                        weekly_week3: '3',
                        weekly_week4: '4',
                        fortnightly_week12: '12',
                        fortnightly_week34: '34',
                    },
                },
            };
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when update is successful', async () => {
            const result = sampleSuccessQuery;
            jest.spyOn(ArsModel, 'updateForecastConfiguration').mockResolvedValue(result);
            jest.spyOn(ArsModel, 'updateForecastDistribution').mockResolvedValue(null);

            const serviceResult = await ArsService.updateForecastConfiguration(user_id, role, config);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'updateForecastConfiguration').mockRejectedValue(error);

            await expect(ArsService.updateForecastConfiguration(user_id, role, config)).rejects.toThrow(error);
        });
    });

    describe('getForecastData', () => {
        let areaCode: string;
        let brandVariantCode: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
            brandVariantCode = 'testBrandVariantCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result with MTD data when found', async () => {
            const response = { rows: [{ distributor_code: 'dist1', adjusted_forecast: 100 }], firstName: '', lastName: '', rowCount: 10, prev_forecast: [] };
            const conversionFactor = [{ buom_to_cs: 1 }];
            const mtdData = [{ CUSTOMER: 'dist1', MTD: 50 }];
            jest.spyOn(ArsModel, 'getForecastData').mockResolvedValue(response);
            jest.spyOn(ArsModel, 'getConversionFactor').mockResolvedValue(conversionFactor);
            jest.spyOn(ArsService, 'mtdApiValues').mockResolvedValue(mtdData);
            jest.spyOn(arsHelpers, 'rekey').mockImplementation((data, key, newKey) => ({ dist1: data?.[0]?.[newKey] ?? 0 }));
            jest.spyOn(ArsModel, 'fetchSalesMonthByArea').mockResolvedValue(null);
            const serviceResult = await ArsService.getForecastData(areaCode, brandVariantCode);
            if (serviceResult.rows) {
                expect(serviceResult.rows[0].mtd).toBe('50.00');
                expect(serviceResult.rows[0].balance_to_go).toBe('50.00');
            }
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchSalesMonthByArea').mockResolvedValue(null);
            jest.spyOn(ArsModel, 'getForecastData').mockRejectedValue(error);
            await expect(ArsService.getForecastData(areaCode, brandVariantCode)).rejects.toThrow(error);
        });
    });

    describe('updateForecastData', () => {
        let data: any;
        let userId: string;

        beforeEach(() => {
            data = { adjusted: [{ sales_allocation_key: 'key', updated_allocation: 'allocation' }] };
            userId = 'testUser';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when update is successful', async () => {
            jest.spyOn(ArsModel, 'updateForecastData').mockResolvedValue(5);

            const serviceResult = await ArsService.updateForecastData(data, userId);

            expect(serviceResult).toBe(5);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'updateForecastData').mockRejectedValue(error);

            await expect(ArsService.updateForecastData(data, userId)).rejects.toThrow(error);
        });
    });

    describe('getRegionalBrandVariants', () => {
        let areaCode: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when found', async () => {
            const result = { rows: [], rowCount: 1, oid: 0, command: '', fields: [] };
            jest.spyOn(ArsModel, 'getRegionalBrandVariants').mockResolvedValue(result);

            const serviceResult = await ArsService.getRegionalBrandVariants(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should return null when result is not found', async () => {
            const result = null;
            jest.spyOn(ArsModel, 'getRegionalBrandVariants').mockResolvedValue(result);

            const serviceResult = await ArsService.getRegionalBrandVariants(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'getRegionalBrandVariants').mockRejectedValue(error);

            await expect(ArsService.getRegionalBrandVariants(areaCode)).rejects.toThrow(error);
        });
    });

    describe('getRegionalBrands', () => {
        let areaCode: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when found', async () => {
            const result = sampleSuccessQuery;
            jest.spyOn(ArsModel, 'getRegionalBrands').mockResolvedValue(result);

            const serviceResult = await ArsService.getRegionalBrands(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should return null when result is not found', async () => {
            const result = null;
            jest.spyOn(ArsModel, 'getRegionalBrands').mockResolvedValue(result);

            const serviceResult = await ArsService.getRegionalBrands(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'getRegionalBrands').mockRejectedValue(error);

            await expect(ArsService.getRegionalBrands(areaCode)).rejects.toThrow(error);
        });
    });

    describe('fetchForecastConfigurations', () => {
        let areaCode: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when found', async () => {
            const result = { rows: [], rowCount: 1, oid: 0, command: '', fields: [] };
            jest.spyOn(ArsModel, 'fetchForecastConfigurations').mockResolvedValue(result);

            const serviceResult = await ArsService.fetchForecastConfigurations(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should return null when result is not found', async () => {
            const result = null;
            jest.spyOn(ArsModel, 'fetchForecastConfigurations').mockResolvedValue(result);

            const serviceResult = await ArsService.fetchForecastConfigurations(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchForecastConfigurations').mockRejectedValue(error);

            await expect(ArsService.fetchForecastConfigurations(areaCode)).rejects.toThrow(error);
        });
    });

    describe('updateForecastConfiguration', () => {
        let user_id: string;
        let role: string;
        let config: any;

        beforeEach(() => {
            user_id = 'testUser';
            role = 'testRole';
            config = {
                area_code: 'testAreaCode',
                applicable_month: 'testMonth',
                config_data: {
                    key: {
                        weekly_week1: '1',
                        weekly_week2: '2',
                        weekly_week3: '3',
                        weekly_week4: '4',
                        fortnightly_week12: '12',
                        fortnightly_week34: '34',
                    },
                },
            };
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when update is successful', async () => {
            const result = sampleSuccessQuery;
            jest.spyOn(ArsModel, 'updateForecastConfiguration').mockResolvedValue(result);
            jest.spyOn(ArsModel, 'updateForecastDistribution').mockResolvedValue(null);

            const serviceResult = await ArsService.updateForecastConfiguration(user_id, role, config);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'updateForecastConfiguration').mockRejectedValue(error);

            await expect(ArsService.updateForecastConfiguration(user_id, role, config)).rejects.toThrow(error);
        });
    });

    describe('getForecastData', () => {
        let areaCode: string;
        let brandVariantCode: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
            brandVariantCode = 'testBrandVariantCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result with MTD data when found', async () => {
            const response = { rows: [{ distributor_code: 'dist1', adjusted_forecast: 100 }], firstName: '', lastName: '', rowCount: 10, prev_forecast: [] };
            const conversionFactor = [{ buom_to_cs: 1 }];
            const mtdData = [{ CUSTOMER: 'dist1', MTD: 50 }];
            jest.spyOn(ArsModel, 'getForecastData').mockResolvedValue(response);
            jest.spyOn(ArsModel, 'getConversionFactor').mockResolvedValue(conversionFactor);
            jest.spyOn(ArsService, 'mtdApiValues').mockResolvedValue(mtdData);
            jest.spyOn(arsHelpers, 'rekey').mockImplementation((data, key, newKey) => ({ dist1: data?.[0]?.[newKey] ?? 0 }));
            jest.spyOn(ArsModel, 'fetchSalesMonthByArea').mockResolvedValue(null);

            const serviceResult = await ArsService.getForecastData(areaCode, brandVariantCode);
            if (serviceResult.rows) {
                expect(serviceResult.rows[0].mtd).toBe('50.00');
                expect(serviceResult.rows[0].balance_to_go).toBe('50.00');
            }
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchSalesMonthByArea').mockResolvedValue(null);
            jest.spyOn(ArsModel, 'getForecastData').mockRejectedValue(error);

            await expect(ArsService.getForecastData(areaCode, brandVariantCode)).rejects.toThrow(error);
        });
    });

    describe('updateForecastData', () => {
        let data: any;
        let userId: string;

        beforeEach(() => {
            data = { adjusted: [{ sales_allocation_key: 'key', updated_allocation: 'allocation' }] };
            userId = 'testUser';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when update is successful', async () => {
            jest.spyOn(ArsModel, 'updateForecastData').mockResolvedValue(5);

            const serviceResult = await ArsService.updateForecastData(data, userId);

            expect(serviceResult).toBe(5);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'updateForecastData').mockRejectedValue(error);

            await expect(ArsService.updateForecastData(data, userId)).rejects.toThrow(error);
        });
    });

    describe('upsertForecastDistribution', () => {
        let areaCode: string;
        let data: any;
        let quantityNormPskuClass: string | null;

        beforeEach(() => {
            areaCode = 'testAreaCode';
            data = { adjusted: [{ sales_allocation_key: 'key', updated_allocation: 'allocation' }] };
            quantityNormPskuClass = null;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when upsert is successful', async () => {
            jest.spyOn(ArsModel, 'updateInsertForecastDistribution').mockResolvedValue(true);
            jest.spyOn(Helper, 'isNextMonthForecastDumped').mockResolvedValue(false);
            jest.spyOn(Helper, 'applicableMonth').mockReturnValue('testMonth');
            jest.spyOn(ArsModel, 'fetchForecastPhasing').mockResolvedValue([{ area_code: 'testAreaCode', config: {} }]);

            const serviceResult = await ArsService.upsertForecastDistribution(areaCode, data);

            expect(serviceResult).toBe(true);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(Helper, 'isNextMonthForecastDumped').mockResolvedValue(false);
            jest.spyOn(Helper, 'applicableMonth').mockReturnValue('');
            jest.spyOn(ArsModel, 'fetchForecastPhasing').mockResolvedValue([{ area_code: 'testAreaCode', config: {} }]);
            jest.spyOn(ArsModel, 'updateInsertForecastDistribution').mockImplementation(() => {
                throw error;
            });

            const x = await ArsService.upsertForecastDistribution(areaCode, data);
            expect(x).toBeNull();
        });
    });

    describe('makeApiCallsToGetValues', () => {
        let payload: any;
        let response: AxiosResponse;
        let config: AxiosRequestConfig;

        beforeEach(() => {
            payload = { type: 'testType', customer: 'testCustomer', doctype: 'testDoctype', sku_list: [] };
            response = {
                data: 'test data',
                status: 200,
                statusText: 'OK',
                headers: {},
                config: config,
            };
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return data when API call is successful', async () => {
            mAxios.mockResolvedValue(response);

            const serviceResult = await ArsService.makeApiCallsToGetValues(payload);

            expect(serviceResult).toBe('test data');
        });

        it('should return empty array when API call fails', async () => {
            mAxios.mockRejectedValue(new Error('test error'));

            const serviceResult = await ArsService.makeApiCallsToGetValues(payload);

            expect(serviceResult).toEqual([]);
        });
    });

    describe('getArsApiValues', () => {
        let forecastedPSKUDistWise: any;
        let distId: any;
        let type: string;
        let doctype: string | null;

        beforeEach(() => {
            forecastedPSKUDistWise = [];
            distId = 'testDistId';
            type = 'testType';
            doctype = 'testDoctype';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return API values when call is successful', async () => {
            const result = 'testData';
            jest.spyOn(ArsService, 'makeApiCallsToGetValues').mockResolvedValue(result);

            const serviceResult = await ArsService.getArsApiValues(forecastedPSKUDistWise, distId, type, doctype);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsService, 'makeApiCallsToGetValues').mockRejectedValue(error);

            await expect(ArsService.getArsApiValues(forecastedPSKUDistWise, distId, type, doctype)).rejects.toThrow(error);
        });
    });

    describe('getSuggestedMaterials', () => {
        let distId: any;
        let division: any;

        beforeEach(() => {
            distId = 'testDistId';
            division = 'testDivision';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return suggested materials when found', async () => {
            const result = 'DistributorID: testDistId on 9/2/2025 No forecast found';
            jest.spyOn(ArsModel, 'getAreaCodeForDist').mockResolvedValue('testAreaCode');
            jest.spyOn(ArsModel, 'checkForecastForDist').mockResolvedValue(true);
            jest.spyOn(ArsService, 'getStockNormByPsku').mockResolvedValue({});
            jest.spyOn(ArsModel, 'getDistPdpDistribution').mockResolvedValue([]);
            jest.spyOn(ArsRules, 'getWeekDaysPskuWise').mockResolvedValue([]);
            jest.spyOn(ArsModel, 'getForecastedPSKUDistWise').mockResolvedValue([]);
            jest.spyOn(ArsModel, 'getStockNormTotal').mockResolvedValue([]);
            jest.spyOn(ArsService, 'getArsApiValues').mockResolvedValue('testData');
            jest.spyOn(ArsModel, 'getMaterialConversion').mockResolvedValue([]);
            jest.spyOn(arsHelpers, 'rekey').mockImplementation((data, key, newKey) => Promise.resolve({}));
            jest.spyOn(ArsModel, 'getLastArsOrder').mockResolvedValue([]);
            jest.spyOn(ArsModel, 'getLastArsOrder').mockResolvedValue([]);
            jest.spyOn(ArsModel, 'getRuleConfigPSKU').mockResolvedValue([]);
            jest.spyOn(ArsModel, 'findApplicableSoqNorms').mockResolvedValue([]);
            jest.spyOn(ArsModel, 'findApplicableSkuSoqNorm').mockResolvedValue([]);
            jest.spyOn(ArsRules, 'getSuggestedOrder').mockResolvedValue([]);

            const serviceResult = await ArsService.getSuggestedMaterials(distId, division);

            expect(serviceResult).not.toBeNull();
        });

        it('should return null when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'getForecastedPSKUDistWise').mockRejectedValue(error);
            jest.spyOn(ArsService, 'getStockNormByPsku').mockRejectedValue(error);
            jest.spyOn(ArsModel, 'getDistPdpDistribution').mockRejectedValue(error);
            jest.spyOn(ArsModel, 'getLastArsOrder').mockRejectedValue(error);
            jest.spyOn(ArsModel, 'getRuleConfigPSKU').mockRejectedValue(error);
            jest.spyOn(ArsModel, 'findApplicableSoqNorms').mockRejectedValue(error);
            jest.spyOn(ArsModel, 'findApplicableSkuSoqNorm').mockRejectedValue(error);

            const serviceResult = await ArsService.getSuggestedMaterials(distId, division);

            expect(serviceResult).not.toBeNull();
        });
    });

    describe('fetchLastForecastDate', () => {
        let areaCode: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return last forecast date when found', async () => {
            const result = sampleSuccessQuery;
            jest.spyOn(ArsModel, 'fetchLastForecastDate').mockResolvedValue(result);

            const serviceResult = await ArsService.fetchLastForecastDate(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchLastForecastDate').mockRejectedValue(error);

            await expect(ArsService.fetchLastForecastDate(areaCode)).rejects.toThrow(error);
        });
    });

    describe('getForecastSummaryData', () => {
        let areaCode: string;
        let search: string;
        let limit: string;
        let offset: string;
        let quantityNormFlag: boolean;

        beforeEach(() => {
            areaCode = 'testAreaCode';
            search = 'testSearch';
            limit = '10';
            offset = '0';
            quantityNormFlag = true;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return forecast summary data when found', async () => {
            const result = { rows: [{}], rowCount: 1, totalCount: 1, endMonth: '202501', delta: 1 };
            jest.spyOn(ArsModel, 'fetchSalesMonthByArea').mockResolvedValue(null);
            jest.spyOn(ArsModel, 'getForecastSummaryData').mockResolvedValue(result);
            const serviceResult = await ArsService.getForecastSummaryData(areaCode, search, limit, offset, quantityNormFlag);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchSalesMonthByArea').mockResolvedValue(null);
            jest.spyOn(ArsModel, 'getForecastSummaryData').mockRejectedValue(error);

            await expect(ArsService.getForecastSummaryData(areaCode, search, limit, offset, quantityNormFlag)).rejects.toThrow(error);
        });
    });

    describe('submitForecastData', () => {
        let areaCode: string;
        let userId: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
            userId = 'testUserId';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when submit is successful', async () => {
            const result = 1;
            jest.spyOn(ArsModel, 'submitForecastData').mockResolvedValue(result);

            const serviceResult = await ArsService.submitForecastData(areaCode, userId);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'submitForecastData').mockRejectedValue(error);

            await expect(ArsService.submitForecastData(areaCode, userId)).rejects.toThrow(error);
        });
    });

    describe('fetchUpdatedForecast', () => {
        let areaCode: string;
        let forecast_sync: boolean;
        let dbWithPDPMismatch: string[];

        beforeEach(() => {
            areaCode = 'testAreaCode';
            forecast_sync = false;
            dbWithPDPMismatch = [];
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when fetch is successful', async () => {
            const result = [['']];
            jest.spyOn(ArsModel, 'fetchUpdatedForecast').mockResolvedValue(result);
            jest.spyOn(Helper, 'isNextMonthForecastDumped').mockResolvedValue(false);
            jest.spyOn(Helper, 'applicableMonth').mockReturnValue('testMonth');
            jest.spyOn(ArsModel, 'fetchForecastPhasing').mockResolvedValue([{ config: {} }]);
            jest.spyOn(ArsModel, 'updateInsertForecastDistribution').mockResolvedValue(['']);

            const serviceResult = await ArsService.fetchUpdatedForecast(areaCode, forecast_sync, dbWithPDPMismatch);

            expect(serviceResult === null || serviceResult === result).toBe(true);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchUpdatedForecast').mockRejectedValue(error);

            const serviceResult = await ArsService.fetchUpdatedForecast(areaCode, forecast_sync, dbWithPDPMismatch);

            expect(serviceResult === null || serviceResult === undefined).toBe(true);
        });
    });

    describe('updateForecastDistribution', () => {
        let areaCode: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when update is successful', async () => {
            const result = true;
            jest.spyOn(ArsModel, 'updateForecastDistribution').mockResolvedValue(result);

            const serviceResult = await ArsService.updateForecastDistribution(areaCode);

            expect(serviceResult).toBe(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'updateForecastDistribution').mockRejectedValue(error);

            await expect(ArsService.updateForecastDistribution(areaCode)).rejects.toThrow(error);
        });
    });

    describe('stockData', () => {
        let dbCode: string;
        let psku: any[];
        let docType: string;

        const result = [{ open_order: '', sku: 'psku1', stock_in_hand: '', stock_in_transit: '' }];

        beforeEach(() => {
            dbCode = 'testDbCode';
            psku = ['psku1'];
            docType = 'testDocType';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return null when no data found', async () => {
            jest.spyOn(ArsModel, 'getMaterialConversionPSKUWise').mockResolvedValue([]);

            const serviceResult = await ArsService.stockData(dbCode, psku, docType);

            expect(serviceResult).toStrictEqual(result);
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'getMaterialConversionPSKUWise').mockRejectedValue(error);

            const serviceResult = await ArsService.stockData(dbCode, psku, docType);

            expect(serviceResult).toStrictEqual(result);
        });
    });

    describe('forecastDumpValidation', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return file details when validation is successful', async () => {
            const areaCodes = [{ code: 'area1' }];
            const successfulAreaCodes = ['area1'];
            const unsuccessfulDistributors = [{ distributor: 'dist1' }];
            jest.spyOn(ArsModel, 'fetchAreaCodes').mockResolvedValue(areaCodes);
            jest.spyOn(ArsModel, 'checkForecastSyncStatus').mockResolvedValue({ salesAllocationStatus: true, monthlySalesStatus: true });
            jest.spyOn(ArsModel, 'distributorLevelForecastValidation').mockResolvedValue(unsuccessfulDistributors);
            jest.spyOn(Helper, 'createXlsxFile').mockReturnValue({ filePath: 'path', fileName: 'name' });

            const serviceResult = await ArsService.forecastDumpValidation();

            expect(serviceResult).toBeNull();
        });

        it('should return null when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchAreaCodes').mockRejectedValue(error);

            const serviceResult = await ArsService.forecastDumpValidation();

            expect(serviceResult).toBeNull();
        });
    });

    describe('fetchArsReport', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return null when fetch is successful', async () => {
            const report = [{ 'Parent SKU': 'sku1', 'Distributor ID': 'dist1' }];
            const mtdResponse = { sku1: { dist1: 50 } };
            const fileDetails = { filePath: 'path', fileName: 'name' };
            const summary = [{ region: 'region1', orderCount: 1, tentative: 'yes', dbCount: 1 }];

            jest.spyOn(ArsModel, 'fetchArsReport').mockResolvedValue(report);
            jest.spyOn(ArsService, 'getMtd').mockResolvedValue(mtdResponse);
            jest.spyOn(Helper, 'createXlsxFile').mockReturnValue(fileDetails);
            jest.spyOn(ArsRules, 'arsOrderReportSummary').mockReturnValue(summary);
            jest.spyOn(Email, 'arsReport').mockImplementation(() => true);

            const serviceResult = await ArsService.fetchArsReport();

            expect(serviceResult).toBeNull();
        });

        it('should return null when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchArsReport').mockRejectedValue(error);

            const serviceResult = await ArsService.fetchArsReport();

            expect(serviceResult).toBeNull();
        });
    });

    describe('sihSsCheck', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return true when sihSsCheck is successful', async () => {
            const dbNormData = [
                {
                    profile_id: 'dist1',
                    sn_data: { psku: ['sku1'], cf: [1], sn: [100], ss: [50], cs: [10] },
                    db_email: 'db@test.com',
                    tse_email: 'tse@test.com',
                    asm_email: 'asm@test.com',
                    name: 'dist1',
                    customer_group: '10',
                    region: 'SOUTH 1',
                    area_code: 'KA01',
                    tse_code: 'KA01TS01',
                },
            ];
            const ss_sn = [
                { key: 'SAFETY_STOCK', value: '10' },
                { key: 'STOCK_NORM', value: '20' },
            ];
            const inhandStockData = [{ SKU: 'sku1', QTY: 50 }];
            const intransitStockData = [{ SKU: 'sku1', QTY: 20 }];
            const openStockData = [{ SKU: 'sku1', QTY: 10 }];
            const result = [
                {
                    region: 'region1',
                    area_code: 'area1',
                    asm_email: 'asm@test.com',
                    tse_code: 'tse1',
                    tse_email: 'tse@test.com',
                    db_code: 'dist1',
                    db_email: 'db@test.com',
                    pskus_checked: '[]',
                    email_sent: true,
                    email_type: 'SAFETY_STOCK',
                },
            ];

            jest.spyOn(ArsModel, 'fetchStockNormData').mockResolvedValue(dbNormData);
            jest.spyOn(ArsModel, 'safetyStockAndSafetyNorm').mockResolvedValue(ss_sn);
            jest.spyOn(ArsService, 'getArsApiValues').mockResolvedValueOnce(inhandStockData).mockResolvedValueOnce(intransitStockData).mockResolvedValueOnce(openStockData);
            jest.spyOn(Email, 'sihBelowSs').mockImplementation((data: any) => Promise.resolve());
            jest.spyOn(ArsModel, 'insertSihSSLog').mockResolvedValue(true);

            const serviceResult = await ArsService.sihSsCheck();

            expect(serviceResult).toBe(false);
        });

        it('should return false when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchStockNormData').mockRejectedValue(error);

            const serviceResult = await ArsService.sihSsCheck();

            expect(serviceResult).toBe(false);
        });
    });

    describe('autoSubmitForecastData', () => {
        let forecast_sync: boolean;

        beforeEach(() => {
            forecast_sync = false;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return true when auto submit is successful', async () => {
            const areaCodes = [{ code: 'area1' }];
            const dbWithPDPMismatch = ['dist1'];
            const fetchUpdatedForecastResponse = ['response'];

            jest.spyOn(ArsModel, 'reIndexArsTables').mockResolvedValue(null);
            jest.spyOn(ArsModel, 'fetchAreaCodes').mockResolvedValue(areaCodes);
            jest.spyOn(ArsModel, 'distributorsWithPDPMismatch').mockResolvedValue(dbWithPDPMismatch);
            jest.spyOn(ArsModel, 'fetchForecastPhasing').mockResolvedValue(null);
            jest.spyOn(ArsService, 'submitForecastData').mockResolvedValue(null);
            jest.spyOn(ArsService, 'fetchUpdatedForecast').mockResolvedValue(fetchUpdatedForecastResponse);

            const serviceResult = await ArsService.autoSubmitForecastData(forecast_sync);

            expect(serviceResult).toBe(true);
        });

        it('should return null when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'fetchAreaCodes').mockRejectedValue(error);

            const serviceResult = await ArsService.autoSubmitForecastData(forecast_sync);

            expect(serviceResult).toBeNull();
        });
    });

    describe('downloadForecastSummary', () => {
        let areaCode: string;
        let userId: string;
        let role: string[];
        let code: string;

        beforeEach(() => {
            areaCode = 'testAreaCode';
            userId = 'testUserId';
            role = ['testRole'];
            code = 'testCode';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return response object when download is successful for all areas', async () => {
            const areaCodes = [{ region: 'region1', area_code: 'area1' }];
            const s3Response = { ContentLength: 100 };
            const forecast = [{ area_code: 'area1', monthly_sales: {}, forecast: 100 }];
            const lastForecast = { ...sampleSuccessQuery, rows: [{ date: '2023-01-01' }] };

            jest.spyOn(AdminModel, 'fetchAreaCodes').mockResolvedValue(areaCodes);
            jest.spyOn(S3Helper, 'checkIfForecastFileExists').mockResolvedValue(s3Response);
            jest.spyOn(ArsModel, 'forecastSummaryAll').mockResolvedValue(forecast);
            jest.spyOn(ArsModel, 'fetchLastForecastDate').mockResolvedValue(lastForecast);
            jest.spyOn(S3Helper, 'uploadForecastFile').mockResolvedValue({ Location: 'testLocation', Bucket: 'testBucket', Key: 'testKey' });
            jest.spyOn(S3Helper, 'createSignedUrl').mockResolvedValue('testDownloadUrl');
            jest.spyOn(ArsModel, 'insertForecastUploadDownloadLogs').mockResolvedValue(null);

            const serviceResult = await ArsService.downloadForecastSummary('ALL', userId, role, code);

            expect(serviceResult).toHaveProperty('region1');
            expect(serviceResult?.['region1']).toHaveProperty('ContentLength');
        });

        it('should return response object when download is successful for a specific area', async () => {
            const forecast = [{ area_code: 'area1', monthly_sales: {}, forecast: 100 }];

            jest.spyOn(ArsModel, 'forecastSummaryAll').mockResolvedValue(forecast);

            const serviceResult = await ArsService.downloadForecastSummary(areaCode, userId, role, code);

            expect(serviceResult).toHaveProperty(areaCode);
            expect(serviceResult?.[areaCode]).toEqual(forecast);
        });

        it('should return null when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(AdminModel, 'fetchAreaCodes').mockRejectedValue(error);

            const serviceResult = await ArsService.downloadForecastSummary('ALL', userId, role, code);

            expect(serviceResult).toBeNull();
        });
    });

    describe('getSuggestedMaterialsAutoValidation', () => {
        let distId: any;
        let division: any;

        beforeEach(() => {
            distId = 'testDistId';
            division = 'testDivision';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return suggested materials when found', async () => {
            const areaCode = 'testAreaCode';
            const forecastCheck = true;
            const normCycleSafetyValues = [{}];
            const distPdpDistributionArray = [{}];
            const weekColumnsPskuWise = [{}];
            const forecastedPSKUDistWise = [];
            const stockNormData = [{}];
            const conversionArray = [{}];
            const finalArray = [{ productCode: '', qty: '' }];

            jest.spyOn(ArsModel, 'getAreaCodeForDist').mockResolvedValue(areaCode);
            jest.spyOn(ArsModel, 'checkForecastForDist').mockResolvedValue(forecastCheck);
            jest.spyOn(ArsModel, 'getNormCycleSafetyValues').mockResolvedValue(normCycleSafetyValues);
            jest.spyOn(ArsModel, 'getDistPdpDistribution').mockResolvedValue(distPdpDistributionArray);
            jest.spyOn(AutoValidationRules, 'getWeekDaysPskuWise').mockResolvedValue(weekColumnsPskuWise);
            jest.spyOn(ArsModel, 'getForecastedPSKUDistWise').mockResolvedValue(forecastedPSKUDistWise);
            jest.spyOn(ArsModel, 'getStockNormTotal').mockResolvedValue(stockNormData);
            jest.spyOn(ArsModel, 'getMaterialConversion').mockResolvedValue(conversionArray);
            jest.spyOn(arsHelpers, 'rekey').mockImplementation((data, key, newKey) => Promise.resolve({}));
            jest.spyOn(AutoValidationRules, 'getSuggestedOrder').mockResolvedValue(finalArray);
            jest.spyOn(ArsModel, 'fetchLastForecastDate').mockResolvedValue(sampleSuccessQuery);

            const serviceResult = await ArsService.getSuggestedMaterialsAutoValidation(distId, division);

            expect(serviceResult).toEqual(finalArray);
        });

        it('should return message when no forecast found', async () => {
            const areaCode = 'testAreaCode';
            const forecastCheck = false;

            jest.spyOn(ArsModel, 'getAreaCodeForDist').mockResolvedValue(areaCode);
            jest.spyOn(ArsModel, 'checkForecastForDist').mockResolvedValue(forecastCheck);

            const serviceResult = await ArsService.getSuggestedMaterialsAutoValidation(distId, division);

            expect(serviceResult).toBe(`DistributorID: ${distId} on ${new Date().toLocaleDateString()} No forecast found`);
        });

        it('should return message when no forecast distribution found', async () => {
            const areaCode = 'testAreaCode';
            const forecastCheck = true;
            const normCycleSafetyValues = [{}];
            const distPdpDistributionArray = [];

            jest.spyOn(ArsModel, 'getAreaCodeForDist').mockResolvedValue(areaCode);
            jest.spyOn(ArsModel, 'checkForecastForDist').mockResolvedValue(forecastCheck);
            jest.spyOn(ArsModel, 'getNormCycleSafetyValues').mockResolvedValue(normCycleSafetyValues);
            jest.spyOn(ArsModel, 'getDistPdpDistribution').mockResolvedValue(distPdpDistributionArray);

            const serviceResult = await ArsService.getSuggestedMaterialsAutoValidation(distId, division);

            expect(serviceResult).toBe('Forecast Distribution not found');
        });

        it('should return null when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'getAreaCodeForDist').mockRejectedValue(error);

            const serviceResult = await ArsService.getSuggestedMaterialsAutoValidation(distId, division);

            expect(serviceResult).toBeNull();
        });
    });

    describe('getStockNormByPsku', () => {
        let distId: string | string[];
        let applicableMonth: string;
        let ofCurrentMonth: boolean;

        beforeEach(() => {
            distId = 'testDistId';
            applicableMonth = '2023-01';
            ofCurrentMonth = false;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return pskuStockNorm when distId is a string', async () => {
            const stockNorm = [{ psku: 'psku1', stock_norm: 100, ss_percent: 10, pak_to_cs: 1 }];
            jest.spyOn(ArsModel, 'getStockNorm').mockResolvedValue(stockNorm);

            const serviceResult = await ArsService.getStockNormByPsku(distId, applicableMonth, ofCurrentMonth);

            expect(serviceResult).toEqual({ psku1: { stock_norm: 100, safety_stock: 10, pak_to_cs: 1 } });
        });

        it('should return distributorPskuStockNorm when distId is an array', async () => {
            distId = ['testDistId1', 'testDistId2'];
            const stockNorm = [
                { dist_id: 'testDistId1', psku: 'psku1', stock_norm: 100, ss_percent: 10, pak_to_cs: 1 },
                { dist_id: 'testDistId2', psku: 'psku2', stock_norm: 200, ss_percent: 20, pak_to_cs: 2 },
            ];
            jest.spyOn(ArsModel, 'getStockNorm').mockResolvedValue(stockNorm);

            const serviceResult = await ArsService.getStockNormByPsku(distId, applicableMonth, ofCurrentMonth);

            expect(serviceResult).toEqual({
                testDistId1: { psku1: { stock_norm: 100, safety_stock: 10, pak_to_cs: 1 } },
                testDistId2: { psku2: { stock_norm: 200, safety_stock: 20, pak_to_cs: 2 } },
            });
        });

        it('should throw an error when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'getStockNorm').mockRejectedValue(error);

            await expect(ArsService.getStockNormByPsku(distId, applicableMonth, ofCurrentMonth)).rejects.toThrow(error);
        });
    });

    describe('getMoqMappingData', () => {
        let area: string | null | undefined;
        let search: string | null | undefined;
        let role: string[];
        let email: string;
        let limit: number;
        let offset: number;

        beforeEach(() => {
            area = 'testArea';
            search = 'testSearch';
            role = ['testRole'];
            email = 'testEmail';
            limit = 10;
            offset = 0;
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return moq mapping data when found', async () => {
            const rows = [{ dbId: 'testDbId', plantId: 1, moq: 100 }];
            const totalCount = 1;
            jest.spyOn(ArsModel, 'getMoqMappingData').mockResolvedValue(rows);
            jest.spyOn(ArsModel, 'getMoqMappingDataCount').mockResolvedValue(totalCount);

            const serviceResult = await ArsService.getMoqMappingData(area, search, role, email, limit, offset);

            expect(serviceResult).toEqual({ totalCount, rows });
        });

        it('should return null when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'getMoqMappingData').mockRejectedValue(error);

            const serviceResult = await ArsService.getMoqMappingData(area, search, role, email, limit, offset);

            expect(serviceResult).toBeNull();
        });
    });

    describe('updateMoq', () => {
        let moq_data: { dbId: string; plantId: number; moq: number }[];
        let user: any;

        beforeEach(() => {
            moq_data = [{ dbId: 'testDbId', plantId: 1, moq: 100 }];
            user = { id: 'testUserId' };
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return true when update is successful', async () => {
            jest.spyOn(ArsModel, 'updateMoq').mockResolvedValue(true);

            const serviceResult = await ArsService.updateMoq(moq_data, user);

            expect(serviceResult).toBe(true);
        });

        it('should return null when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'updateMoq').mockRejectedValue(error);

            const serviceResult = await ArsService.updateMoq(moq_data, user);

            expect(serviceResult).toBeNull();
        });
    });

    describe('getDistributorMoq', () => {
        let dbCode: string;
        let plantCodes: string[];

        beforeEach(() => {
            dbCode = 'testDbCode';
            plantCodes = ['testPlantCode1', 'testPlantCode2'];
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return distributor moq when found', async () => {
            const rows = [{ dbId: 'testDbId', plantId: 1, moq: 100 }];
            jest.spyOn(ArsModel, 'getDistributorMoq').mockResolvedValue(rows);

            const serviceResult = await ArsService.getDistributorMoq(dbCode, plantCodes);

            expect(serviceResult).toEqual(rows);
        });

        it('should return null when an error occurs', async () => {
            const error = new Error('test error');
            jest.spyOn(ArsModel, 'getDistributorMoq').mockRejectedValue(error);

            const serviceResult = await ArsService.getDistributorMoq(dbCode, plantCodes);

            expect(serviceResult).toBeNull();
        });
    });

    describe('syncStockNormConfig', () => {
        it('should sync and archive stock norm config', async () => {
            const applicableMonth = '202301';
            const syncStockNormMock = 1;

            jest.spyOn(ArsModel, 'syncStockNormConfig').mockResolvedValue(syncStockNormMock);
            jest.spyOn(Helper, 'applicableMonth').mockReturnValue('202301');

            const result = await ArsService.syncStockNormConfig(applicableMonth);

            expect(result).toEqual(1);
            expect(ArsModel.syncStockNormConfig).toHaveBeenCalledWith(applicableMonth);
        });

        it('should return null and log error on failure', async () => {
            const applicableMonth = '202301';
            const error = new Error('Test error');

            jest.spyOn(ArsModel, 'syncStockNormConfig').mockRejectedValue(error);

            const result = await ArsService.syncStockNormConfig(applicableMonth);

            expect(result).toBeNull();
        });
    });

    describe('getStockNormDefault', () => {
        it('should get stock norm default', async () => {
            const customerGroup = 'group1';
            const stockNormDefaultMock = [{ norm: 'default' }];

            jest.spyOn(ArsModel, 'getStockNormDefault').mockResolvedValue(stockNormDefaultMock);

            const result = await ArsService.getStockNormDefault(customerGroup);

            expect(result).toEqual(stockNormDefaultMock);
            expect(ArsModel.getStockNormDefault).toHaveBeenCalledWith(customerGroup);
        });
    });

    describe('updateStockNormDefault', () => {
        it('should update stock norm default and config safety percentage', async () => {
            const customerGroup = 'group1';
            const data = { norm: 'new' };
            const result1Mock = [];
            const result2Mock = sampleSuccessQuery;

            jest.spyOn(ArsModel, 'updateStockNormDefault').mockResolvedValue(result1Mock);
            jest.spyOn(ArsModel, 'updateStockNormConfigSafetyPercentage').mockResolvedValue(result2Mock);
            jest.spyOn(Helper, 'applicableMonth').mockReturnValueOnce('202301').mockReturnValueOnce('202302');

            const result = await ArsService.updateStockNormDefault(customerGroup, data);

            expect(result).toBe(sampleSuccessQuery);
            expect(ArsModel.updateStockNormDefault).toHaveBeenCalledWith(customerGroup, data);
            expect(ArsModel.updateStockNormConfigSafetyPercentage).toHaveBeenCalledWith(customerGroup, data, '202301', '202302', '01-Jan-23', '01-Feb-23');
        });
    });

    describe('getAllArsTolerance', () => {
        it('should get all ARS tolerance', async () => {
            const customerGroup = 'group1';
            const arsToleranceMock = [{ tolerance: 'tolerance1' }];

            jest.spyOn(ArsModel, 'getAllArsTolerance').mockResolvedValue(arsToleranceMock);

            const result = await ArsService.getAllArsTolerance(customerGroup);

            expect(result).toEqual(arsToleranceMock);
            expect(ArsModel.getAllArsTolerance).toHaveBeenCalledWith(customerGroup);
        });
    });

    describe('getArsTolerance', () => {
        it('should get ARS tolerance for a specific area', async () => {
            const customerGroup = 'group1';
            const areaCode = 'area1';
            const arsToleranceMock = { tolerance: 'tolerance1' };

            jest.spyOn(ArsModel, 'getArsTolerance').mockResolvedValue(arsToleranceMock);

            const result = await ArsService.getArsTolerance(customerGroup, areaCode);

            expect(result).toEqual(arsToleranceMock);
            expect(ArsModel.getArsTolerance).toHaveBeenCalledWith(customerGroup, areaCode);
        });
    });

    describe('fetchAreaForecastDumpDetails', () => {
        it('should fetch forecast dump details for a specific area', async () => {
            const areaCode = 'testAreaCode';
            const forecastDumpDetailsMock = [];

            jest.spyOn(ArsModel, 'fetchAreaForecastDumpDetails').mockResolvedValue(forecastDumpDetailsMock);

            const result = await ArsService.fetchAreaForecastDumpDetails(areaCode);

            expect(result).toEqual(forecastDumpDetailsMock);
            expect(ArsModel.fetchAreaForecastDumpDetails).toHaveBeenCalledWith(areaCode);
        });
    });
});
