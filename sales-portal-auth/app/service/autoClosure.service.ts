import { AutoClosureModel } from '../models/autoClosure.model';
import { AutoClosureReportFilter } from '../interface/autoClosureReportFilter';
import logger from '../lib/logger';
import axiosApi from '../helper/axiosApi';

export const AutoClosureService = {
    async fetchAutoClosureGT(orderType: string, limit: number, offset: number) {
        return await AutoClosureModel.fetchAutoClosureGT(orderType, limit, offset);
    },

    async updateAutoClosureGT(
        data: {
            id: string;
            short_close: number | null;
            remarks: string;
        }[],
        user_id: string,
    ) {
        return await AutoClosureModel.updateAutoClosureGT(data, user_id);
    },

    async multiUpdateAutoClosureGT(orderType: string, shortClose: number | null, remarks: string, userId: string) {
        return await AutoClosureModel.multiUpdateAutoClosureGT(orderType, shortClose, remarks, userId);
    },

    async fetchAutoClosureMTEcomSingleGrn(customerGroup: string, limit: number | null = null, offset: number | null = null, search: string | null = null) {
        return await AutoClosureModel.fetchAutoClosureMTEcomSingleGrn(customerGroup, limit, offset, search);
    },

    async fetchAutoClosureMTEcomSingleGrnCustomerDetails(payerCode: string) {
        return await AutoClosureModel.fetchAutoClosureMTEcomSingleGrnCustomerDetails(payerCode);
    },

    async fetchMultiGrnConsolidatedData(customerGroup: string) {
        return await AutoClosureModel.fetchMultiGrnConsolidatedData(customerGroup);
    },

    async fetchMultiGrnCustomerDetails(customerGroup: string) {
        return await AutoClosureModel.fetchMultiGrnCustomerDetails(customerGroup);
    },

    async updateSingleGrn(
        data: {
            id: string;
            short_close: number | null;
            po_validity: number | null;
            remarks: string;
        }[],
        user_id: string,
    ) {
        return await AutoClosureModel.updateSingleGrn(data, user_id);
    },

    async updateMultiGrn(ids: string[], short_close: number | null = null, po_validity: number | null = null, remarks: string, user_id: string) {
        return await AutoClosureModel.updateMultiGrn({ ids, short_close, po_validity, remarks }, user_id);
    },

    async multiUpdateMTEcom(shortCloseSingleGrn: number | null, shortCloseMultiGrn: number | null, shortCloseRemarks: string, userId: string) {
        logger.info('inside AutoClosureService -> multiUpdateMTEcom');
        try {
            return await AutoClosureModel.updateAutoClosureMtEcomMultiUpdate(shortCloseSingleGrn, shortCloseMultiGrn, shortCloseRemarks, userId);
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureService -> multiUpdateMTEcom', error);
            return null;
        }
    },

    async autoClosureReportGT(filter: AutoClosureReportFilter) {
        try {
            const result = await AutoClosureModel.autoClosureReportGT(filter);
            const rows = result?.paginatedRows;
            const so: Set<string> = new Set();
            rows?.forEach((row) => {
                so.add(row.sales_order);
            });
            const datalakeResponse = await axiosApi.getSoClosureStatus(Array.from(so));
            const soStatusMap =
                datalakeResponse?.reduce((acc: object, item: object) => {
                    acc[item['SALESORDER']] = item['OVERALLSTATUS'];
                    return acc;
                }, {}) ?? {};
            rows?.forEach((row) => {
                row.datalake_status = soStatusMap[row.sales_order] ?? null;
            });
            return result;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureService -> autoClosureReportGT', error);
            return null;
        }
    },

    async fetchAutoClosureMtEcomConfig(limit: number, offset: number) {
        return await AutoClosureModel.fetchAutoClosureMtEcomConfig(limit, offset);
    },

    async updateAutoClosureMtEcomConfig(payload, userId) {
        return await AutoClosureModel.updateAutoClosureMtEcomConfig(payload, userId);
    },

    async autoClosureReportMT(filter) {
        try {
            let result = await AutoClosureModel.autoClosureReportMT(filter);
            if (result) {
                const soSet = new Set(result.map((item) => item.sales_order));
                const datalakeResponse = await axiosApi.getSoClosureStatus(Array.from(soSet));
                const soStatusMap =
                    datalakeResponse?.reduce((acc: object, item: object) => {
                        acc[item['SALESORDER']] = item['OVERALLSTATUS'];
                        return acc;
                    }, {}) ?? {};
                result.forEach((row) => {
                    row.datalake_status = soStatusMap[row.sales_order] ?? null;
                    return row;
                });
                return result;
            }
            return null;
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureService -> autoClosureReportMT', error);
            return null;
        }
    },
};
