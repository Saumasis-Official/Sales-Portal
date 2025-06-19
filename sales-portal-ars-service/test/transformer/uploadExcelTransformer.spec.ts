import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { uploadedDataTransformer } from '../../app/transformer/uploadExcelTransformer';
import { arsHelpers } from '../../app/helper/arsHelper';

describe('uploadExcelTransformer', () => {
    describe('jsonToDBMapping', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should map JSON data to DB format correctly', async () => {
            const data = [
                {
                    DB_Code: '123',
                    DB_Name: 'Test DB',
                    PSKU: 'PSKU123',
                    PSKU_Description: 'Test PSKU Description',
                    Jan_Sales_Figure: 100,
                    Feb_Sales_Figure: 200,
                    Mar_Sales_Figure: 300,
                    Apr_Forecast_BUOM: 400,
                    Adjusted_Forecast_BUOM: 500
                }
            ];
            const areaCode = 'testAreaCode';
            const monthData = {
                monthNames: ['Jan', 'Feb', 'Mar', 'Apr'],
                monthYear: ['Jan_2023', 'Feb_2023', 'Mar_2023']
            };
            const expectedResult = [
                {
                    sold_to_party: '123',
                    parent_sku: 'PSKU123',
                    by_allocation: 400,
                    Jan_2023: 100,
                    Feb_2023: 200,
                    Mar_2023: 300,
                    adjusted_forecast: 500
                }
            ];

            jest.spyOn(arsHelpers, 'getMonthYear').mockResolvedValue(monthData);

            const result = await uploadedDataTransformer.jsonToDBMapping(data, areaCode);

            expect(result).toEqual(expectedResult);
            expect(arsHelpers.getMonthYear).toHaveBeenCalledWith(areaCode);
        });

        it('should handle missing sales figures and forecasts gracefully', async () => {
            const data = [
                {
                    DB_Code: '123',
                    DB_Name: 'Test DB',
                    PSKU: 'PSKU123',
                    PSKU_Description: 'Test PSKU Description',
                    Feb_Sales_Figure: 200,
                    Mar_Sales_Figure: 300,
                    Adjusted_Forecast_BUOM: 500
                }
            ];
            const areaCode = 'testAreaCode';
            const monthData = {
                monthNames: ['Jan', 'Feb', 'Mar', 'Apr'],
                monthYear: ['Jan_2023', 'Feb_2023', 'Mar_2023']
            };
            const expectedResult = [
                {
                    sold_to_party: '123',
                    parent_sku: 'PSKU123',
                    by_allocation: 0,
                    Feb_2023: 200,
                    Mar_2023: 300,
                    adjusted_forecast: 500
                }
            ];

            jest.spyOn(arsHelpers, 'getMonthYear').mockResolvedValue(monthData);

            const result = await uploadedDataTransformer.jsonToDBMapping(data, areaCode);

            expect(result).toEqual(expectedResult);
            expect(arsHelpers.getMonthYear).toHaveBeenCalledWith(areaCode);
        });
    });
    describe('uploadExcelTransformer', () => {
        describe('jsonToDBMapping', () => {
            afterEach(() => {
                jest.restoreAllMocks();
            });

            it('should map JSON data to DB format correctly', async () => {
                const data = [
                    {
                        DB_Code: '123',
                        DB_Name: 'Test DB',
                        PSKU: 'PSKU123',
                        PSKU_Description: 'Test PSKU Description',
                        Jan_Sales_Figure: 100,
                        Feb_Sales_Figure: 200,
                        Mar_Sales_Figure: 300,
                        Apr_Forecast_BUOM: 400,
                        Adjusted_Forecast_BUOM: 500
                    }
                ];
                const areaCode = 'testAreaCode';
                const monthData = {
                    monthNames: ['Jan', 'Feb', 'Mar', 'Apr'],
                    monthYear: ['Jan_2023', 'Feb_2023', 'Mar_2023']
                };
                const expectedResult = [
                    {
                        sold_to_party: '123',
                        parent_sku: 'PSKU123',
                        by_allocation: 400,
                        Jan_2023: 100,
                        Feb_2023: 200,
                        Mar_2023: 300,
                        adjusted_forecast: 500
                    }
                ];

                jest.spyOn(arsHelpers, 'getMonthYear').mockResolvedValue(monthData);

                const result = await uploadedDataTransformer.jsonToDBMapping(data, areaCode);

                expect(result).toEqual(expectedResult);
                expect(arsHelpers.getMonthYear).toHaveBeenCalledWith(areaCode);
            });

            it('should handle missing sales figures and forecasts gracefully', async () => {
                const data = [
                    {
                        DB_Code: '123',
                        DB_Name: 'Test DB',
                        PSKU: 'PSKU123',
                        PSKU_Description: 'Test PSKU Description',
                        Feb_Sales_Figure: 200,
                        Mar_Sales_Figure: 300,
                        Adjusted_Forecast_BUOM: 500
                    }
                ];
                const areaCode = 'testAreaCode';
                const monthData = {
                    monthNames: ['Jan', 'Feb', 'Mar', 'Apr'],
                    monthYear: ['Jan_2023', 'Feb_2023', 'Mar_2023']
                };
                const expectedResult = [
                    {
                        sold_to_party: '123',
                        parent_sku: 'PSKU123',
                        by_allocation: 0,
                        Feb_2023: 200,
                        Mar_2023: 300,
                        adjusted_forecast: 500
                    }
                ];

                jest.spyOn(arsHelpers, 'getMonthYear').mockResolvedValue(monthData);

                const result = await uploadedDataTransformer.jsonToDBMapping(data, areaCode);

                expect(result).toEqual(expectedResult);
                expect(arsHelpers.getMonthYear).toHaveBeenCalledWith(areaCode);
            });
        });

        describe('distributionMapping', () => {
            it('should map distribution data correctly', () => {
                const data = {
                    updated_allocation: 100,
                    sold_to_party: '123',
                    sales_allocation_key: 'key123',
                    pskuClass: 'classA'
                };
                const expectedResult = {
                    updated_allocation: 100,
                    distributorCode: '123',
                    sales_allocation_key: 'key123',
                    pskuClass: 'classA'
                };

                const result = uploadedDataTransformer.distributionMapping(data);

                expect(result).toEqual(expectedResult);
            });

            it('should return an empty object for empty input', () => {
                const data = {};
                const expectedResult = {
                    updated_allocation: 0,
                    distributorCode: '',
                    sales_allocation_key: '',
                    pskuClass: ''
                };

                const result = uploadedDataTransformer.distributionMapping(data);

                expect(result).toEqual(expectedResult);
            });
        });

        describe('jsonToSkuSoqNorm', () => {
            it('should map JSON data to UploadSkuSoqNorm format correctly', () => {
                const data = [
                    {
                        PSKU: 'PSKU123',
                        'Distributor Code': 'D123',
                        'SOQ Norm': 50.5
                    }
                ];
                const expectedResult = [
                    {
                        material_code: 'PSKU123',
                        distributor_code: 'D123',
                        soq_norm: 51
                    }
                ];

                const result = uploadedDataTransformer.jsonToSkuSoqNorm(data);

                expect(result).toEqual(expectedResult);
            });
        });

        describe('jsonToDBCensusCustomerGroup', () => {
            it('should map JSON data to UploadDBCensusCustomerGroup format correctly', () => {
                const data = [
                    {
                        'DB Code': 'D123',
                        'Pop Class': 'ClassA (Description)'
                    }
                ];
                const expectedResult = [
                    {
                        distributor_code: 'D123',
                        customer_group: 'CLASSA',
                        pop_class: 'ClassA (Description)'
                    }
                ];

                const result = uploadedDataTransformer.jsonToDBCensusCustomerGroup(data);

                expect(result).toEqual(expectedResult);
            });
        });

        describe('jsonToStockNorm', () => {
            it('should map JSON data to UploadStockNorm format correctly', () => {
                const data = [
                    {
                        'Distributor Code': 'D123',
                        PSKU: 'PSKU123',
                        Class: 'ClassA',
                        'Stock Norm(Days)': 30.5
                    }
                ];
                const expectedResult = [
                    {
                        dist_id: 'D123',
                        psku: 'PSKU123',
                        class_of_last_update: 'ClassA',
                        stock_norm: 31,
                        original_upload: 30.5
                    }
                ];

                const result = uploadedDataTransformer.jsonToStockNorm(data);

                expect(result).toEqual(expectedResult);
            });
        });
    });
});