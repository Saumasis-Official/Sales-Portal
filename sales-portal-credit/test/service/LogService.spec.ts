import { jest, describe, afterEach, it, expect } from '@jest/globals';
import { LogService } from '../../app/service/LogService';
import { LogModel } from '../../app/models/LogModel';

const sampleSuccessQuery = { rows: [{}], rowCount: 1, oid: 0, command: '', fields: [] }

describe('LogService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('insertEmailLogs', () => {
        it('should insert email logs and return the result', async () => {
            const type = 'testType';
            const status = 'sent';
            const subject = 'testSubject';
            const recipients = { to: 'test@example.com', from: 'noreply@example.com' };
            const reference = 'testReference';
            const email_data = { key: 'value' };
            const error = null;
            const created_by = 'testUser';
            const expectedResult = 1;

            jest.spyOn(LogModel, 'insertEmailLogs').mockResolvedValue(expectedResult);

            const serviceResult = await LogService.insertEmailLogs(type, status, subject, recipients, reference, email_data, error, created_by);

            expect(serviceResult).toBe(expectedResult);
            expect(LogModel.insertEmailLogs).toHaveBeenCalledWith(type, status, subject, recipients, reference, email_data, error, created_by);
        });
    });
});