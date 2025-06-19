import Helper from '../../app/helper';
import {describe, test, expect } from '@jest/globals';

describe('Helper.isCircular', () => {
    test('should return true for circular data', () => {
        const circularData: { [key: string]: any } = {};
        circularData.self = circularData;
        expect(Helper.isCircular(circularData)).toBe(true);
    });

    test('should return false for non-circular data', () => {
        const nonCircularData = { key: 'value' };
        expect(Helper.isCircular(nonCircularData)).toBe(false);
    });

    test('should return false for empty object', () => {
        const emptyObject = {};
        expect(Helper.isCircular(emptyObject)).toBe(false);
    });

    test('should return false for null', () => {
        expect(Helper.isCircular(null)).toBe(false);
    });

    test('should return false for undefined', () => {
        expect(Helper.isCircular(undefined)).toBe(false);
    });

    test('should return false for primitive data types', () => {
        expect(Helper.isCircular(42)).toBe(false);
        expect(Helper.isCircular('string')).toBe(false);
        expect(Helper.isCircular(true)).toBe(false);
    });
    test('should return true for valid JSON object', () => {
        const jsonObject = { key: 'value' };
        expect(Helper.isJsonObject(jsonObject)).toBe(true);
    });

    test('should return true for empty object', () => {
        const emptyObject = {};
        expect(Helper.isJsonObject(emptyObject)).toBe(true);
    });

    test('should return false for circular object', () => {
        const circularObject: any = {};
        circularObject.self = circularObject;
        expect(Helper.isJsonObject(circularObject)).toBe(false);
    });
});

describe('Helper.formatTime', () => {
    test('should format time in 12-hour format with AM', () => {
        const time = new Date('2022-01-01T09:30:00');
        expect(Helper.formatTime(time)).toBe('09:30 AM');
    });

    test('should format time in 12-hour format with PM', () => {
        const time = new Date('2022-01-01T18:45:00');
        expect(Helper.formatTime(time)).toBe('06:45 PM');
    });

    test('should format midnight time as 12:00 AM', () => {
        const time = new Date('2022-01-01T00:00:00');
        expect(Helper.formatTime(time)).toBe('12:00 AM');
    });

    test('should format time with leading zero for single-digit hour', () => {
        const time = new Date('2022-01-01T05:15:00');
        expect(Helper.formatTime(time)).toBe('05:15 AM');
    });

    test('should format time with leading zero for single-digit minute', () => {
        const time = new Date('2022-01-01T10:05:00');
        expect(Helper.formatTime(time)).toBe('10:05 AM');
    });
});

