import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { LogService } from '../../app/service/logService';
import { LogModel } from '../../app/model/logModel';

const sampleSuccessQuery = { rows: [{}], rowCount: 1, oid: 0, command: '', fields: [] }


describe('LogService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('insertSyncLog', () => {
        it('should insert sync log and return the result', async () => {
            const type = 'testType';
            const result = 'success';
            const data = { upsertCount: 1, deleteCount: 0 };
            const distributorId = 'testDistributorId';
            const error = null;
            const isCronJob = false;
            const expectedResult = sampleSuccessQuery;

            jest.spyOn(LogModel, 'insertSyncLog').mockResolvedValue(expectedResult);

            const serviceResult = await LogService.insertSyncLog(type, result, data, distributorId, error, isCronJob);

            expect(serviceResult).toBe(expectedResult);
        });
    });

    describe('checkSyncLog', () => {
        it('should return true when sync log exists', async () => {
            const distributorId = 'testDistributorId';
            const checkSyncLogResponse = { ...sampleSuccessQuery, rows:[{count:'1'}] };

            jest.spyOn(LogModel, 'checkSyncLog').mockResolvedValue(checkSyncLogResponse);

            const serviceResult = await LogService.checkSyncLog(distributorId);

            expect(serviceResult).toBe(true);
            expect(LogModel.checkSyncLog).toHaveBeenCalledWith(distributorId);
        });

        it('should return false when sync log does not exist', async () => {
            const distributorId = 'testDistributorId';
            const checkSyncLogResponse =sampleSuccessQuery;

            jest.spyOn(LogModel, 'checkSyncLog').mockResolvedValue(checkSyncLogResponse);

            const serviceResult = await LogService.checkSyncLog(distributorId);

            expect(serviceResult).toBe(false);
            expect(LogModel.checkSyncLog).toHaveBeenCalledWith(distributorId);
        });

        it('should return false when response is null', async () => {
            const distributorId = 'testDistributorId';
            const checkSyncLogResponse = null;

            jest.spyOn(LogModel, 'checkSyncLog').mockResolvedValue(checkSyncLogResponse);

            const serviceResult = await LogService.checkSyncLog(distributorId);

            expect(serviceResult).toBe(false);
            expect(LogModel.checkSyncLog).toHaveBeenCalledWith(distributorId);
        });
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