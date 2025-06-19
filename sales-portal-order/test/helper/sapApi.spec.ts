import { SapApi } from '../../app/helper/sapApi';

describe('SapApi', () => {
  describe('reportValidationError', () => {
    it('should make a POST request to the correct URL with the error object', async () => {
      const distId = '123';
      const errorObj = { message: 'Validation error' };

      const expectedUrl = `sapApiConfig.reportErrorUrl/${distId}`;

      const reportValidationErrorSpy = jest.spyOn(SapApi, 'reportValidationError').mockResolvedValueOnce(null);

      await SapApi.reportValidationError(distId, errorObj);

      expect(reportValidationErrorSpy).toHaveBeenCalledWith(distId, errorObj);
    });

    it('should throw an error if the API call fails', async () => {
      const distId = '123';
      const errorObj = { message: 'Validation error' };

      const reportValidationErrorSpy = jest.spyOn(SapApi, 'reportValidationError').mockRejectedValueOnce(new Error('API error'));

      await expect(SapApi.reportValidationError(distId, errorObj)).rejects.toThrowError('API error');
      expect(reportValidationErrorSpy).toHaveBeenCalledWith(distId, errorObj);
    });
  });
});
