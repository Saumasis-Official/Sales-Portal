import { describe, test, expect, jest } from '@jest/globals';
import { AutoClosureModel } from '../../app/models/autoClosure.model';
import { AutoClosureService } from '../../app/service/autoClosure.service';
import axiosApi from '../../app/helper/axiosApi';

describe('AutoClosureService', () => {
    describe('fetchAutoClosureMtEcomConfig', () => {
        test('should fetch auto closure MtEcom configuration', async () => {
            // Mock the dependencies
            const fetchAutoClosureMtEcomConfigMock = jest.spyOn(AutoClosureModel, 'fetchAutoClosureMtEcomConfig').mockResolvedValue([{ id: 1, config: 'testConfig' }]);
            const limit = 10;
            const offset = 0;
            const result = await AutoClosureService.fetchAutoClosureMtEcomConfig(limit, offset);
            expect(fetchAutoClosureMtEcomConfigMock).toHaveBeenCalledWith(limit, offset);
            expect(result).toEqual([{ id: 1, config: 'testConfig' }]);
            fetchAutoClosureMtEcomConfigMock.mockRestore();
        });
    });
    describe('updateAutoClosureMtEcomConfig', () => {
        test('should update auto closure MtEcom configuration', async () => {
            // Mock the dependencies
            const updateAutoClosureMtEcomConfigMock = jest.spyOn(AutoClosureModel, 'updateAutoClosureMtEcomConfig').mockResolvedValue([]);

            // Define the input parameters
            const payload = { id: 1, config: 'updatedConfig' };
            const userId = 'user123';
            const result = await AutoClosureService.updateAutoClosureMtEcomConfig(payload, userId);
            expect(updateAutoClosureMtEcomConfigMock).toHaveBeenCalledWith(payload, userId);
            updateAutoClosureMtEcomConfigMock.mockRestore();
        });
    });

    describe('autoClosureReportMT', () => {
        test('should fetch auto closure MT report with datalake status', async () => {
            const autoClosureReportMTMock = jest.spyOn(AutoClosureModel, 'autoClosureReportMT').mockResolvedValue([
                { sales_order: 'SO123', po_number: 'PO123' },
                { sales_order: 'SO124', po_number: 'PO124' },
            ]);
            const axiosApiMock = jest.spyOn(axiosApi, 'getSoClosureStatus').mockResolvedValue([
                { SALESORDER: 'SO123', OVERALLSTATUS: 'A' },
                { SALESORDER: 'SO124', OVERALLSTATUS: 'B' },
            ]);

            const filter = { limit: 10, offset: 0 };
            const result = await AutoClosureService.autoClosureReportMT(filter);

            // Assertions
            expect(autoClosureReportMTMock).toHaveBeenCalledWith(filter);
            expect(result).toEqual([
                { sales_order: 'SO123', po_number: 'PO123', datalake_status: 'A' },
                { sales_order: 'SO124', po_number: 'PO124', datalake_status: 'B' },
            ]);

            // Restore mocks
            autoClosureReportMTMock.mockRestore();
            axiosApiMock.mockRestore();
        });
    });
});
