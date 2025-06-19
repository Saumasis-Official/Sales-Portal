import { LogModel } from '../../app/models/LogModel';
import { LogService } from '../../app/service/LogService';
import { describe, test, expect, jest } from '@jest/globals';

describe('LogService', () => {
  describe('insertEmailLogs', () => {
    test('should insert email logs', async () => {
      // Mock the dependencies
      const insertEmailLogsMock = jest
        .spyOn(LogModel, 'insertEmailLogs')
        .mockResolvedValue(1);

      // Define the input parameters
      const type = 'email';
      const status = 'success';
      const subject = 'Test Email';
      const recipients = {
        to: 'test@example.com',
        from: 'noreply@example.com',
      };
      const reference = '1234567890';
      const emailData = { body: 'This is a test email' };
      const error = null;

      // Call the function
      const result = await LogService.insertEmailLogs(
        type,
        status,
        subject,
        recipients,
        reference,
        emailData,
        error
      );

      // Assertions
      expect(insertEmailLogsMock).toHaveBeenCalledWith(
        type,
        status,
        subject,
        recipients,
        reference,
        emailData,
        error
      );
      expect(result).toBe(1);

      // Restore the mock
      insertEmailLogsMock.mockRestore();
    });
  });
});