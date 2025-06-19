import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { SkuRuleConfigurationsService } from '../../app/service/skuRuleConfig.service';
import { SkuRuleConfigurationsModel } from '../../app/models/skuRuleConfig.model';

describe('SkuRuleConfigurationsService', () => {
    describe('upsertRuleConfiguration', () => {
        let payload: [
            {
                psku: string,
                area_code: string,
                deleted: boolean,
                cg_db: {
                    [key: string]: {
                        [key: string]: string[] | boolean
                    }
                },
            }
        ];
        let user: string;
        let dist_channels: string;

        beforeEach(() => {
            payload = [
                {
                    psku: 'test_psku',
                    area_code: 'test_area_code',
                    deleted: false,
                    cg_db: {
                        group1: {
                            key1: ['value1', 'value2']
                        }
                    }
                }
            ];
            user = 'test_user';
            dist_channels = 'test_channel';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when upsertRuleConfigurations is successful', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsModel, 'upsertRuleConfigurations').mockResolvedValue(result);
            const response = await SkuRuleConfigurationsService.upsertRuleConfiguration(payload, user, dist_channels);

            expect(SkuRuleConfigurationsModel.upsertRuleConfigurations).toHaveBeenCalledWith(payload, user, dist_channels);
            expect(response).toEqual(result);
        });

        it('should throw error when upsertRuleConfigurations fails', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsModel, 'upsertRuleConfigurations').mockRejectedValue(mockError);

            await expect(SkuRuleConfigurationsService.upsertRuleConfiguration(payload, user, dist_channels)).rejects.toThrow('Test error');
            expect(SkuRuleConfigurationsModel.upsertRuleConfigurations).toHaveBeenCalledWith(payload, user, dist_channels);
        });
    });

    describe('upsertAllRuleConfiguration', () => {
        let data: {
            payload: {
                [key: string]: {
                    selectedTse: string[],
                    cg_data: {
                        [key: string]: {
                            selected: string[] | boolean,
                            unselected: string[] | boolean,
                            partial: {},
                        },
                    }
                },
            },
            selectedArea: string[],
            dist_channels: string[],
            operation: string
        };
        let user: string;
        let cgData: {}[];

        beforeEach(() => {
            data = {
                payload: {
                    '14000000000000': {
                        selectedTse: ['tse1', 'tse2'],
                        cg_data: {
                            "12": {
                                "selected": [
                                    "KA02TS02"
                                ],
                                "unselected": true,
                                "partial": {}
                            },
                            "13": {
                                "selected": [
                                    "AP01TS05",
                                    "AP01TS06"
                                ],
                                "unselected": true,
                                "partial": {}
                            },
                        }
                    }
                },
                selectedArea: ['area1'],
                dist_channels: ['channel1'],
                operation: 'INSERT'
            };
            user = 'test_user';
            cgData = [{"name":'12'},{"name":'13'}]
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return expected result when upsertAllRuleConfiguration is successful', async () => {
            const dbResults = [
                {
                    area_code: 'area1',
                    db_list: {
                        '12': [
                            { tse_code: 'KA02TS02' },
                        ]
                    }
                }
            ];
            const finalPayload = [
                {
                    areaCode: 'area',
                    tseCode: 'area1',
                    "included_cg_list": "'{}'",
                    "pskuCode": "14000000000000",
                    deleted: false
                }
            ];
            jest.spyOn(SkuRuleConfigurationsModel, 'getCustomerGroups').mockResolvedValue(cgData);
            jest.spyOn(SkuRuleConfigurationsService, 'getDbList').mockResolvedValue(dbResults);
            jest.spyOn(SkuRuleConfigurationsModel, 'upsertAllRuleConfiguration').mockResolvedValue(finalPayload);
            jest.spyOn(String.prototype, 'match').mockReturnValue(['12']);

            const result = await SkuRuleConfigurationsService.upsertAllRuleConfiguration(data, user);
            expect(SkuRuleConfigurationsModel.upsertAllRuleConfiguration).toBeCalledTimes(1);
            expect(result).toEqual(finalPayload);
        });

        it('should return null when dbResults is null', async () => {
            jest.spyOn(SkuRuleConfigurationsService, 'getDbList').mockResolvedValue(null);

            const result = await SkuRuleConfigurationsService.upsertAllRuleConfiguration(data, user);
            expect(result).toBeNull();
        });
    });

    describe('getCustomerGroups', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });

        it('should return customer groups', async () => {
            const customerGroups = [{ id: 1, name: 'Group1' }];
            jest.spyOn(SkuRuleConfigurationsModel, 'getCustomerGroups').mockResolvedValue(customerGroups);

            const result = await SkuRuleConfigurationsService.getCustomerGroups();

            expect(SkuRuleConfigurationsModel.getCustomerGroups).toHaveBeenCalled();
            expect(result).toEqual(customerGroups);
        });
    });

    describe('getSKUCode', () => {
        let areaCodes: string[];
        let nonForecasted: boolean;
        let distChannels: string[];

        beforeEach(() => {
            areaCodes = ['area1'];
            nonForecasted = false;
            distChannels = ['channel1'];
            jest.restoreAllMocks();
        });

        it('should return SKU codes', async () => {
            const skuCodes = [
                { code: 'sku1', description: 'SKU 1', appl_area_channel: [{ area: 'area1', channel: 'GT' }] }
            ];
            const expectedSkuCodes = [{ code: 'sku1', description: 'SKU 1', dist_channels: undefined }];
            jest.spyOn(SkuRuleConfigurationsModel, 'getSKUCodes').mockResolvedValue(skuCodes);

            const result = await SkuRuleConfigurationsService.getSKUCode(areaCodes, nonForecasted, distChannels);

            expect(SkuRuleConfigurationsModel.getSKUCodes).toHaveBeenCalledWith(nonForecasted, distChannels);
            expect(result).toEqual(expectedSkuCodes);
        });
    });

    describe('getSKUDetails', () => {
        let sku: string;
        let areaCodes: string[];
        let nonForecasted: boolean;

        beforeEach(() => {
            sku = 'sku1';
            areaCodes = ['area1'];
            nonForecasted = false;
            jest.restoreAllMocks();
        });

        it('should return SKU details', async () => {
            const skuDetails = [
                {
                    code: 'sku1',
                    description: 'SKU 1',
                    brand_name: 'Brand1',
                    brand_variant: 'Variant1',
                    dist_channels: [1],
                    appl_area_channel: [{ area: 'area1', channel: 'GT' }]
                }
            ];
            const expectedSkuDetails = [
                {
                    area_code: 'area1',
                    code: 'sku1',
                    description: 'SKU 1',
                    brand_name: 'Brand1',
                    brand_variant: 'Variant1',
                    dist_channels: [1]
                }
            ];
            jest.spyOn(SkuRuleConfigurationsModel, 'getSKUDetails').mockResolvedValue(skuDetails);

            const result = await SkuRuleConfigurationsService.getSKUDetails(sku, areaCodes, nonForecasted);

            expect(SkuRuleConfigurationsModel.getSKUDetails).toHaveBeenCalledWith(sku, nonForecasted);
            expect(result).toEqual(expectedSkuDetails);
        });

        it('should handle errors', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsModel, 'getSKUDetails').mockRejectedValue(mockError);

            const result = await SkuRuleConfigurationsService.getSKUDetails(sku, areaCodes, nonForecasted);

            expect(SkuRuleConfigurationsModel.getSKUDetails).toHaveBeenCalledWith(sku, nonForecasted);
            expect(result).toBeNull();
        });
    });

    describe('getSkuRuleConfigurations', () => {
        let areaCodes: string[] | null;
        let search: string | null;
        let distChannels: string[];

        beforeEach(() => {
            areaCodes = ['area1', 'area2'];
            search = 'search_term';
            distChannels = ['channel1', 'channel2'];
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when getSkuRuleConfigurations is successful', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsModel, 'getSkuRuleConfigurations').mockResolvedValue(result);

            const response = await SkuRuleConfigurationsService.getSkuRuleConfigurations(areaCodes, search, distChannels);

            expect(SkuRuleConfigurationsModel.getSkuRuleConfigurations).toHaveBeenCalledWith(areaCodes, search, distChannels);
            expect(response).toEqual(result);
        });

        it('should throw error when getSkuRuleConfigurations fails', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsModel, 'getSkuRuleConfigurations').mockRejectedValue(mockError);

            await expect(SkuRuleConfigurationsService.getSkuRuleConfigurations(areaCodes, search, distChannels)).rejects.toThrow('Test error');
            expect(SkuRuleConfigurationsModel.getSkuRuleConfigurations).toHaveBeenCalledWith(areaCodes, search, distChannels);
        });
    });

    describe('fetchBrandAndBrandVariantCombinations', () => {
        let areaCodes: string[] | null;

        beforeEach(() => {
            areaCodes = ['area1', 'area2'];
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when fetchBrandAndBrandVariantCombinations is successful', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsModel, 'fetchBrandAndBrandVariantCombinations').mockResolvedValue(result);

            const response = await SkuRuleConfigurationsService.fetchBrandAndBrandVariantCombinations(areaCodes);

            expect(SkuRuleConfigurationsModel.fetchBrandAndBrandVariantCombinations).toHaveBeenCalledWith(areaCodes);
            expect(response).toEqual(result);
        });

        it('should throw error when fetchBrandAndBrandVariantCombinations fails', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsModel, 'fetchBrandAndBrandVariantCombinations').mockRejectedValue(mockError);

            await expect(SkuRuleConfigurationsService.fetchBrandAndBrandVariantCombinations(areaCodes)).rejects.toThrow('Test error');
            expect(SkuRuleConfigurationsModel.fetchBrandAndBrandVariantCombinations).toHaveBeenCalledWith(areaCodes);
        });
    });

    describe('fetchBrandVariantDetails', () => {
        let brandVariantCode: string;
        let areaCodes: string[];

        beforeEach(() => {
            brandVariantCode = 'test_code';
            areaCodes = ['area1', 'area2'];
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when fetchBrandVariantDetails is successful', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsModel, 'fetchBrandVariantDetails').mockResolvedValue(result);

            const response = await SkuRuleConfigurationsService.fetchBrandVariantDetails(brandVariantCode, areaCodes);

            expect(SkuRuleConfigurationsModel.fetchBrandVariantDetails).toHaveBeenCalledWith(brandVariantCode);
            expect(response).toEqual(result);
        });

        it('should throw error when fetchBrandVariantDetails fails', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsModel, 'fetchBrandVariantDetails').mockRejectedValue(mockError);

            await expect(SkuRuleConfigurationsService.fetchBrandVariantDetails(brandVariantCode, areaCodes)).resolves.toBe(null);
            expect(SkuRuleConfigurationsModel.fetchBrandVariantDetails).toHaveBeenCalledWith(brandVariantCode);
        });
    });

    describe('upsertBrandVariantPrioritization', () => {
        let data: { area: string, brand_variant: string, priority: number | string, deleted?: boolean | null }[];
        let updated_by: string;

        beforeEach(() => {
            data = [
                { area: 'area1', brand_variant: 'variant1', priority: 1 },
                { area: 'area2', brand_variant: 'variant2', priority: 2 }
            ];
            updated_by = 'test_user';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when upsertBrandVariantPrioritization is successful', async () => {
            const result = {
                "area1_variant1": { },
                "area2_variant2": { },
            }
            jest.spyOn(SkuRuleConfigurationsModel, 'upsertPrioritization').mockResolvedValue({});

            const response = await SkuRuleConfigurationsService.upsertBrandVariantPrioritization(data, updated_by);

            expect(SkuRuleConfigurationsModel.upsertPrioritization).toHaveBeenCalledTimes(data.length);
            expect(response).toEqual(result);
        });

        it('should throw error when upsertBrandVariantPrioritization fails', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsModel, 'upsertPrioritization').mockRejectedValue(mockError);

            await expect(SkuRuleConfigurationsService.upsertBrandVariantPrioritization(data, updated_by)).resolves.toBe(null);
            
        });
    });

    describe('fetchPrioritization', () => {
        let areaCodes: string[] | null;
        let search: string | null;

        beforeEach(() => {
            areaCodes = ['area1', 'area2'];
            search = 'search_term';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when fetchPrioritization is successful', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsModel, 'fetchPrioritization').mockResolvedValue(result);

            const response = await SkuRuleConfigurationsService.fetchPrioritization(areaCodes, search);

            expect(SkuRuleConfigurationsModel.fetchPrioritization).toHaveBeenCalledWith(areaCodes, search);
            expect(response).toEqual(result);
        });

        it('should throw error when fetchPrioritization fails', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsModel, 'fetchPrioritization').mockRejectedValue(mockError);

            await expect(SkuRuleConfigurationsService.fetchPrioritization(areaCodes, search)).resolves.toBe(null);
            expect(SkuRuleConfigurationsModel.fetchPrioritization).toHaveBeenCalledWith(areaCodes, search);
        });
    });

    describe('fetchNonForecastedPsku', () => {
        let areaCode: string[];
        let distChannels: string[];

        beforeEach(() => {
            areaCode = ['area1', 'area2'];
            distChannels = ['channel1', 'channel2'];
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return result when fetchNonForecastedPsku is successful', async () => {
            const result = [];
            jest.spyOn(SkuRuleConfigurationsModel, 'fetchNonForecastedPsku').mockResolvedValue(result);

            const response = await SkuRuleConfigurationsService.fetchNonForecastedPsku(areaCode, distChannels);

            expect(SkuRuleConfigurationsModel.fetchNonForecastedPsku).toHaveBeenCalledWith(areaCode, distChannels);
            expect(response).toEqual(result);
        });

        it('should throw error when fetchNonForecastedPsku fails', async () => {
            const mockError = new Error('Test error');
            jest.spyOn(SkuRuleConfigurationsModel, 'fetchNonForecastedPsku').mockRejectedValue(mockError);

            await expect(SkuRuleConfigurationsService.fetchNonForecastedPsku(areaCode, distChannels)).rejects.toThrow('Test error');
            expect(SkuRuleConfigurationsModel.fetchNonForecastedPsku).toHaveBeenCalledWith(areaCode, distChannels);
        });
    });
});