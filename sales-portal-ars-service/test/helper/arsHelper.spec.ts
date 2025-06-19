import { describe, it, expect, jest } from '@jest/globals';
import { arsHelpers } from '../../app/helper/arsHelper';
import { ArsModel } from '../../app/model/arsModel';
import Helper from '../../app/helper';

const sampleSuccessQuery = { rows: [{}], rowCount: 1, oid: 0, command: '', fields: [] };

describe('arsHelpers', () => {
    describe('getCurrentWeek', () => {
        it('should return the correct week based on the current date', () => {
            const originalDate = Date;
            global.Date = jest.fn(() => new originalDate('2023-01-05T00:00:00Z')) as any;
            expect(arsHelpers.getCurrentWeek()).toBe(1);
            global.Date = jest.fn(() => new originalDate('2023-01-10T00:00:00Z')) as any;
            expect(arsHelpers.getCurrentWeek()).toBe(2);
            global.Date = jest.fn(() => new originalDate('2023-01-17T00:00:00Z')) as any;
            expect(arsHelpers.getCurrentWeek()).toBe(3);
            global.Date = jest.fn(() => new originalDate('2023-01-25T00:00:00Z')) as any;
            expect(arsHelpers.getCurrentWeek()).toBe(4);
            global.Date = originalDate;
        });
    });

    describe('generateWeekColumns', () => {
        it('should generate an array of week columns', () => {
            const start = 1;
            const end = 4;
            const expected = ['_1', '_2', '_3', '_4'];
            expect(arsHelpers.generateWeekColumns(start, end)).toEqual(expected);
        });
    });

    describe('calculateWeekDays', () => {
        it('should calculate the correct week days', () => {
            const type = 'FN';
            const pdpArray = ['MO', 'WE', 'FR'];
            const pskuSN = 14;
            const psku = ['psku1', 'psku2'];
            const applicableMonth = 'January';
            const nextApplicableMonth = 'February';
            const result = arsHelpers.calculateWeekDays(type, pdpArray, pskuSN, psku, applicableMonth, nextApplicableMonth, '04-01-2025');
            expect(result).toHaveProperty('current', 'January');
            expect(result).toHaveProperty('psku', psku);
        });
    });

    describe('rekey', () => {
        it('should rekey the array of objects', async () => {
            const arrayOfObjects = [
                { key1: 'a', key2: '1' },
                { key1: 'b', key2: '2' },
            ];
            const key1 = 'key1';
            const key2 = 'key2';
            const expected = { a: '1', b: '2' };
            expect(await arsHelpers.rekey(arrayOfObjects, key1, key2)).toEqual(expected);
        });

        it('should return an empty object if arrayOfObjects is null', async () => {
            expect(await arsHelpers.rekey(null, 'key1', 'key2')).toEqual({});
        });
    });

    describe('nestedRekey', () => {
        it('should nest the array of objects based on the specified keys', () => {
            const arrayOfObjects = [
                { key1: 'a', key2: '1', key3: 'x' },
                { key1: 'a', key2: '2', key3: 'y' },
                { key1: 'b', key2: '1', key3: 'z' },
            ];
            const keys = ['key1', 'key2', 'key3'];
            const expected = {
                a: {
                    '1': 'x',
                    '2': 'y',
                },
                b: {
                    '1': 'z',
                },
            };
            expect(arsHelpers.nestedRekey(arrayOfObjects, keys)).toEqual(expected);
        });

        it('should return an empty object if arrayOfObjects is null', () => {
            expect(arsHelpers.nestedRekey(null, ['key1', 'key2', 'key3'])).toEqual({});
        });
    });

    describe('groupUpData', () => {
        it('should group up data correctly', async () => {
            const distPdpDistributionArray = [
                { psku: 'psku1', pdp: 'pdp1' },
                { psku: 'psku2', pdp: 'pdp1' },
            ];
            const normCycleSafetyValues = {
                psku1: { stock_norm: 1 },
                psku2: { stock_norm: 2 },
            };
            const expected = {
                '1_pdp1': ['psku1'],
                '2_pdp1': ['psku2'],
            };
            expect(await arsHelpers.groupUpData(distPdpDistributionArray, normCycleSafetyValues)).toEqual(expected);
        });
    });

    describe('convertExcelToJson', () => {
        it('should convert Excel file to JSON', () => {
            const file = {
                originalname: 'test.xlsx',
                path: 'path/to/test.xlsx',
            };
            const fs = require('fs');
            const XLSX = require('xlsx');
            const buffer = Buffer.from([]);
            const workbook = { SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } };
            const jsonData = { Sheet1: [] };

            jest.spyOn(fs, 'readFileSync').mockReturnValue(buffer);
            jest.spyOn(XLSX, 'read').mockReturnValue(workbook);
            jest.spyOn(XLSX.utils, 'sheet_to_json').mockReturnValue([]);

            expect(arsHelpers.convertExcelToJson(file)).toEqual(jsonData);
        });

        it('should return null for invalid file type', () => {
            const file = {
                originalname: 'test.txt',
                path: 'path/to/test.txt',
            };
            expect(arsHelpers.convertExcelToJson(file)).toBeNull();
        });
    });

    describe('getMonthYear', () => {
        it('should return applicable year months', async () => {
            const areaCode = 'testAreaCode';
            const lastForecastDate = { ...sampleSuccessQuery, rows: [{ date: '2023-01-01' }] };
            const expected = { monthYear: ['202301', '202302'], monthNames: ['Jan', 'Feb'] };

            jest.spyOn(ArsModel, 'fetchLastForecastDate').mockResolvedValue(lastForecastDate);
            jest.spyOn(Helper, 'applicableYearMonths').mockReturnValue(expected);

            const monthYear = await arsHelpers.getMonthYear(areaCode);
            expect(monthYear).toEqual(expected);
        });
    });

    describe('getAreaCode', () => {
        it('should return area code for distributor', async () => {
            const data = { 'DB Code': 'testDBCode' };
            const expected = 'testAreaCode';

            jest.spyOn(ArsModel, 'getAreaCodeForDist').mockResolvedValue(expected);

            expect(await arsHelpers.getAreaCode(data)).toBe(expected);
        });
    });

    describe('appendSalesAllocationKeyToUploadedFile', () => {
        it('should append sales allocation key to uploaded file', () => {
            const data = [
                { sold_to_party: 'party1', parent_sku: 'sku1', adjusted_forecast: 10, by_allocation: 0 },
                { sold_to_party: 'party2', parent_sku: 'sku2', adjusted_forecast: 0, by_allocation: 1 },
            ];
            const existingForecast = [
                { sold_to_party: 'party1', parent_sku: 'sku1', key: 'key1', class: 'class1' },
                { sold_to_party: 'party2', parent_sku: 'sku2', key: 'key2', class: 'class2' },
            ];
            const expected = [
                { sold_to_party: 'party1', parent_sku: 'sku1', by_allocation: 0, sales_allocation_key: 'key1', updated_allocation: 10, pskuClass: 'Q' },
                { sold_to_party: 'party2', parent_sku: 'sku2', by_allocation: 1, sales_allocation_key: 'key2', updated_allocation: 0, pskuClass: 'class2' },
            ];
            const mockResult = arsHelpers.appendSalesAllocationKeyToUploadedFile(data, existingForecast);
            expect(mockResult).toEqual(expected);
        });
    });

    describe('phasingReadjustment', () => {
        it('should calculate phasing readjustment correctly', () => {
            const forecastConfig = [
                {
                    customer_group: 'group1',
                    fortnightly_week12: '10',
                    fortnightly_week34: '20',
                    weekly_week1: '5',
                    weekly_week2: '10',
                    weekly_week3: '15',
                    weekly_week4: '20',
                },
            ];
            const expected = [
                {
                    customer_group: 'group1',
                    fortnightly_week12: expect.anything(),
                    fortnightly_week34: expect.anything(),
                    weekly_week1: expect.anything(),
                    weekly_week2: expect.anything(),
                    weekly_week3: expect.anything(),
                    weekly_week4: expect.anything(),
                },
            ];
            const mockResult = arsHelpers.phasingReadjustment(forecastConfig);
            expect(mockResult).toMatchObject(expected);
        });
    });

    describe('convertAmountLakhOrCrore', () => {
        it('should convert amount to lakh or crore', () => {
            expect(arsHelpers.convertAmountLakhOrCrore(10000000)).toBe('1.00 Cr');
            expect(arsHelpers.convertAmountLakhOrCrore(500000)).toBe('5.00 Lakh');
            expect(arsHelpers.convertAmountLakhOrCrore(50000)).toBe('50000');
        });

        it('should handle string input', () => {
            expect(arsHelpers.convertAmountLakhOrCrore('10000000')).toBe('1.00 Cr');
            expect(arsHelpers.convertAmountLakhOrCrore('500000')).toBe('5.00 Lakh');
            expect(arsHelpers.convertAmountLakhOrCrore('50000')).toBe('50000');
        });
    });
});
