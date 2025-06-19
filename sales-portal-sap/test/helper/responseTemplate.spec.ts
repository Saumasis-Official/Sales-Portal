import data from '../../app/helper/responseTemplate';

describe('userdoesNotExist', () => {
  test('should return the correct response when an error message is provided', () => {
    const error = { message: 'User not found' };
    const expectedResponse = {
      success: false,
      message: 'User not found',
      description: 'user account does not exist in system',
    };

    const result = data.userdoesNotExist(error);

    expect(result).toEqual(expectedResponse);
  });

  test('should return the correct response when no error message is provided', () => {
    const error = {};
    const expectedResponse = {
      success: false,
      message: 'user not registered in system',
      description: 'user account does not exist in system',
    };

    const result = data.userdoesNotExist(error);

    expect(result).toEqual(expectedResponse);
  });
});

describe('mobiledoesNotExist', () => {
  test('should return the correct response', () => {
    const expectedResponse = {
      success: false,
      message: 'Mobile for register user is not exists in system',
      description: 'Mobile for register user is not exists in system',
    };

    const result = data.mobiledoesNotExist();

    expect(result).toEqual(expectedResponse);
  });
});
