import commonHelper from '../../app/helper/index';
import CryptoJS from 'crypto-js';

describe('encrypt', () => {
  test('should encrypt data using AES encryption', () => {
    const data = { message: 'Hello, World!' };
    const encryptedData = commonHelper.encrypt(data);
    const decryptedData = CryptoJS.AES.decrypt(
      encryptedData,
      'qwerty987secret',
    ).toString(CryptoJS.enc.Utf8);

    expect(decryptedData).toEqual(JSON.stringify(data));
  });
});
describe('modifyMobileNumber', () => {
  test('should return null if mobileNumber is falsy', () => {
    const mobileNumber = null;
    const result = commonHelper.modifyMobileNumber(mobileNumber);
    expect(result).toBeNull();
  });

  test('should return mobileNumber if its length is less than 10', () => {
    const mobileNumber = '123456789';
    const result = commonHelper.modifyMobileNumber(mobileNumber);
    expect(result).toEqual(mobileNumber);
  });

  test('should return mobileNumber prefixed with "91" if its length is 10 or more', () => {
    const mobileNumber = '9876543210';
    const expected = '919876543210';
    const result = commonHelper.modifyMobileNumber(mobileNumber);
    expect(result).toEqual(expected);
  });
});
describe('encrypt', () => {
  test('should encrypt data using AES encryption', () => {
    const data = { message: 'Hello, World!' };
    const encryptedData = commonHelper.encrypt(data);
    const decryptedData = CryptoJS.AES.decrypt(
      encryptedData,
      'qwerty987secret',
    ).toString(CryptoJS.enc.Utf8);

    expect(decryptedData).toEqual(JSON.stringify(data));
  });
});