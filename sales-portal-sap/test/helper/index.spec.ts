import commonHelper from '../../app/helper/index';
import CryptoJS from 'crypto-js';
import Helper from '../../app/helper';

describe('encrypt', () => {
  test('should encrypt data using AES encryption', () => {
    const data = { message: 'Hello, World!' };
    const encryptedData = commonHelper.encrypt(data);
    const decryptedData = CryptoJS.AES.decrypt(
      encryptedData,
      '10',
    ).toString(CryptoJS.enc.Utf8);
    expect(decryptedData).toEqual(JSON.stringify(data));
  });

  test('should return null if data is not found', () => {
    const data = null;
    const result = commonHelper.encrypt(data);
    expect(result).toBeNull();
  });
});

describe('decrypt', () => {
  test('should decrypt data using AES decryption', () => {
    const data = { message: 'Hello, World!' };
    const encryptedData = commonHelper.encrypt(data);
    const decryptedData = commonHelper.decrypt(encryptedData);
    expect(decryptedData).toEqual(JSON.stringify(data));
  });

  test('should return null if data is not found', () => {
    const data = null;
    const result = commonHelper.decrypt(data);
    expect(result).toBeNull();
  });
});

describe('modifyMobileNumber', () => {
  test('should return null if mobileNumber is falsy', () => {
    const mobileNumber = null;
    const result = commonHelper.modifyMobileNumber(mobileNumber);
    expect(result).toBeNull();
  });

  test('should return mobileNumber prefixed with "91" if its length is 10 or more', () => {
    const mobileNumber = '1234567890';
    const expected = '911234567890';
    const result = commonHelper.modifyMobileNumber(mobileNumber);
    expect(result).toEqual(expected);
  });
});

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

describe('convertExcelDateToJsDate', () => {
  test('should return null if date is falsy', () => {
    const date = null;
    const result = commonHelper.convertExcelDateToJsDate(date);
    expect(result).toBeNull();
  });

  test('should return null if date is undefined', () => {
    const date = undefined;
    const result = commonHelper.convertExcelDateToJsDate(date);
    expect(result).toBeNull();
  });

  test('should convert Excel date to JavaScript date', () => {
    const excelDate = 44197;
    const expectedDate = new Date('2021-01-01T00:00:00.000Z');
    const result = commonHelper.convertExcelDateToJsDate(excelDate);
    expect(result.toISOString()).toEqual(expectedDate.toISOString());
  });
});

describe('numberWithCommas', () => {
  test('should format number with commas correctly', () => {
    const input = 1234567;
    const expectedOutput = '1,234,567';
    const result = commonHelper.numberWithCommas(input);
    expect(result).toBe(expectedOutput);
  });

  test('should return null for null input', () => {
    const input = null;
    const result = commonHelper.numberWithCommas(input);
    expect(result).toBeNull();
  });

  test('should format number with decimals correctly', () => {
    const input = 1234567.89;
    const expectedOutput = '1,234,567.89';
    const result = commonHelper.numberWithCommas(input);
    expect(result).toBe(expectedOutput);
  });

  test('should format negative number with commas correctly', () => {
    const input = -1234567;
    const expectedOutput = '-1,234,567';
    const result = commonHelper.numberWithCommas(input);
    expect(result).toBe(expectedOutput);
  });

  test('should format large number with commas correctly', () => {
    const input = 123456789012345;
    const expectedOutput = '123,456,789,012,345';
    const result = commonHelper.numberWithCommas(input);
    expect(result).toBe(expectedOutput);
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
describe('Helper.formatDate', () => {
  test('should format date as DD/MM/YYYY', () => {
    const date = new Date('2022-01-01');
    expect(Helper.formatDate(date)).toBe('01/01/2022');
  });

  test('should format date with leading zero for single-digit day', () => {
    const date = new Date('2022-01-09');
    expect(Helper.formatDate(date)).toBe('09/01/2022');
  });

  test('should format date with leading zero for single-digit month', () => {
    const date = new Date('2022-09-01');
    expect(Helper.formatDate(date)).toBe('01/09/2022');
  });

  test('should format date correctly for double-digit day and month', () => {
    const date = new Date('2022-12-31');
    expect(Helper.formatDate(date)).toBe('31/12/2022');
  });

  describe('urlDivString', () => {
    test('should return correct URL division string for non-empty array', () => {
      const divisionArr = ['A', 'B', 'C'];
      const expectedOutput =
        "Division eq 'A' or Division eq 'B' or Division eq 'C' ";
      const result = commonHelper.urlDivString(divisionArr);
      expect(result).toBe(expectedOutput);
    });

    test('should return default division string when array is empty', () => {
      const divisionArr = [];
      const expectedOutput = "Division eq '10'";
      const result = commonHelper.urlDivString(divisionArr);
      expect(result).toBe(expectedOutput);
    });
  });
});
describe('singleQuoteEscape', () => {
  test('should escape single quotes in the string', () => {
    const input = "O'Reilly";
    const expectedOutput = "O''Reilly";
    const result = commonHelper.singleQuoteEscape(input);
    expect(result).toBe(expectedOutput);
  });

  test('should return the same string if there are no single quotes', () => {
    const input = 'Hello World';
    const expectedOutput = 'Hello World';
    const result = commonHelper.singleQuoteEscape(input);
    expect(result).toBe(expectedOutput);
  });

  test('should return null if input is null', () => {
    const input = null;
    const result = commonHelper.singleQuoteEscape(input);
    expect(result).toBeNull();
  });

  test('should return an empty string if input is an empty string', () => {
    const input = '';
    const expectedOutput = '';
    const result = commonHelper.singleQuoteEscape(input);
    expect(result).toBe(expectedOutput);
  });

  test('should escape multiple single quotes in the string', () => {
    const input = "It's a test's string";
    const expectedOutput = "It''s a test''s string";
    const result = commonHelper.singleQuoteEscape(input);
    expect(result).toBe(expectedOutput);
  });
});
