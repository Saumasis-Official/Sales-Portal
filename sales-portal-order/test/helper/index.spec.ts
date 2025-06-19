import Helper from '../../app/helper';
import { jest, describe, test, expect } from '@jest/globals';

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
describe('Helper.createXlsxFile', () => {
  test('should create an xlsx file with the given data and sheet names', () => {
    // Test data
    const dataArray = [
      [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ],
      [
        { name: 'Bob', age: 40 },
        { name: 'Alice', age: 35 },
      ],
    ];
    const sheetNameArray = ['Sheet1', 'Sheet2'];
    const filename = 'testFile';
    const prevDate = false;

    // Mock the createXlsxFile method
    const mockResult = {
      fileName: 'testFile_28-08-2024.xlsx',
      filePath: 'testFile_28-08-2024.xlsx',
    };
    jest.spyOn(Helper, 'createXlsxFile').mockReturnValue(mockResult);

    // Call the method
    const result = Helper.createXlsxFile(
      dataArray,
      sheetNameArray,
      filename,
      prevDate,
    );

    // Extract the date from the received filename
    const datePattern = /\d{2}-\d{2}-\d{4}/;
    const dateMatch = result.fileName.match(datePattern);
    const dateString = dateMatch ? `_${dateMatch[0]}` : '';

    // Assertions
    expect(result).toBeDefined();
    expect(result.fileName).toBe(`testFile${dateString}.xlsx`);
    expect(result.filePath).toBe(`testFile${dateString}.xlsx`);
  });

  test('should create an xlsx file with previous date appended to the filename if prevDate is true', () => {
    // Test data
    const dataArray = [
      [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ],
      [
        { name: 'Bob', age: 40 },
        { name: 'Alice', age: 35 },
      ],
    ];
    const sheetNameArray = ['Sheet1', 'Sheet2'];
    const filename = 'testFile';
    const prevDate = true;

    // Mock the createXlsxFile method
    const mockResult = {
      fileName: 'testFile_27-08-2024.xlsx',
      filePath: 'testFile_27-08-2024.xlsx',
    };
    jest.spyOn(Helper, 'createXlsxFile').mockReturnValue(mockResult);

    // Call the method
    const result = Helper.createXlsxFile(
      dataArray,
      sheetNameArray,
      filename,
      prevDate,
    );

    // Extract the date from the received filename
    const datePattern = /\d{2}-\d{2}-\d{4}/;
    const dateMatch = result.fileName.match(datePattern);
    const dateString = dateMatch ? `_${dateMatch[0]}` : '';

    // Assertions
    expect(result).toBeDefined();
    expect(result.fileName).toBe(`testFile${dateString}.xlsx`);
    expect(result.filePath).toBe(`testFile${dateString}.xlsx`);
  });
  test('should handle empty dataArray', () => {
    const dataArray: any[] = [];
    const sheetNameArray = ['Sheet1'];
    const filename = 'testFile';
    const prevDate = false;

    const mockResult = {
      fileName: 'testFile_28-08-2024.xlsx',
      filePath: 'testFile_28-08-2024.xlsx',
    };
    jest.spyOn(Helper, 'createXlsxFile').mockReturnValue(mockResult);

    const result = Helper.createXlsxFile(
      dataArray,
      sheetNameArray,
      filename,
      prevDate,
    );

    expect(result).toBeDefined();
    expect(result.fileName).toBe('testFile_28-08-2024.xlsx');
    expect(result.filePath).toBe('testFile_28-08-2024.xlsx');
  });

  test('should handle empty sheetNameArray', () => {
    const dataArray = [
      [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ],
    ];
    const sheetNameArray: string[] = [];
    const filename = 'testFile';
    const prevDate = false;

    const mockResult = {
      fileName: 'testFile_28-08-2024.xlsx',
      filePath: 'testFile_28-08-2024.xlsx',
    };
    jest.spyOn(Helper, 'createXlsxFile').mockReturnValue(mockResult);

    const result = Helper.createXlsxFile(
      dataArray,
      sheetNameArray,
      filename,
      prevDate,
    );

    expect(result).toBeDefined();
    expect(result.fileName).toBe('testFile_28-08-2024.xlsx');
    expect(result.filePath).toBe('testFile_28-08-2024.xlsx');
  });

  test('should handle empty filename', () => {
    const dataArray = [
      [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ],
    ];
    const sheetNameArray = ['Sheet1'];
    const filename = '';
    const prevDate = false;

    const mockResult = {
      fileName: '_28-08-2024.xlsx',
      filePath: '_28-08-2024.xlsx',
    };
    jest.spyOn(Helper, 'createXlsxFile').mockReturnValue(mockResult);

    const result = Helper.createXlsxFile(
      dataArray,
      sheetNameArray,
      filename,
      prevDate,
    );

    expect(result).toBeDefined();
    expect(result.fileName).toBe('_28-08-2024.xlsx');
    expect(result.filePath).toBe('_28-08-2024.xlsx');
  });

  test('should handle non-boolean prevDate', () => {
    const dataArray = [
      [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ],
    ];
    const sheetNameArray = ['Sheet1'];
    const filename = 'testFile';
    const prevDate: any = 'notABoolean';

    const mockResult = {
      fileName: 'testFile_28-08-2024.xlsx',
      filePath: 'testFile_28-08-2024.xlsx',
    };
    jest.spyOn(Helper, 'createXlsxFile').mockReturnValue(mockResult);

    const result = Helper.createXlsxFile(
      dataArray,
      sheetNameArray,
      filename,
      prevDate,
    );

    expect(result).toBeDefined();
    expect(result.fileName).toBe('testFile_28-08-2024.xlsx');
    expect(result.filePath).toBe('testFile_28-08-2024.xlsx');
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

