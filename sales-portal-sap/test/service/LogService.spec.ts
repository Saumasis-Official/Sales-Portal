import { LogService } from '../../app/service/LogService';
import { LogModel } from '../../app/models/LogModel';

jest.mock('../../app/models/LogModel');

describe('LogService', () => {
    describe('insertEmailLogs', () => {
        test('should call LogModel.insertEmailLogs with correct parameters', async () => {
            const type = 'info';
            const status = 'sent';
            const subject = 'Test Subject';
            const recipients = { to: ['test@example.com'], from: 'sender@example.com' };
            const reference = '12345';
            const email_data = { body: 'Test email body' };
            const error = null;

            await LogService.insertEmailLogs(type, status, subject, recipients, reference, email_data, error);

            expect(LogModel.insertEmailLogs).toHaveBeenCalledWith(type, status, subject, recipients, reference, email_data, error);
        });

        
        test('should handle error parameter', async () => {
            const type = 'error';
            const status = 'failed';
            const subject = 'Error Subject';
            const recipients = { to: ['test@example.com'], from: 'sender@example.com' };
            const reference = '12345';
            const email_data = { body: 'Error email body' };
            const error = { message: 'Test error' };

            await LogService.insertEmailLogs(type, status, subject, recipients, reference, email_data, error);

            expect(LogModel.insertEmailLogs).toHaveBeenCalledWith(type, status, subject, recipients, reference, email_data, error);
        });
    });
});