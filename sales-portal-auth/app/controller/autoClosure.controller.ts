import { Request, Response } from 'express';
import logger from '../lib/logger';
import Template from '../helper/responseTemplate';
import { SuccessMessage } from '../constant/sucess.message';
import { ErrorMessage } from '../constant/error.message';
import { AutoClosureService } from '../service/autoClosure.service';
import { AutoClosureReportFilter } from '../interface/autoClosureReportFilter';

export const AutoClosureController = {
    async fetchAutoClosureGT(req: Request, res: Response) {
        try {
            const { order_type, limit, offset } = req.body;
            const result = await AutoClosureService.fetchAutoClosureGT(order_type, limit, offset);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.FETCH_AUTO_CLOSURE_GT));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.NO_RECORD_FOUND));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> fetchAutoClosureGT', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async updateAutoClosureGT(req: Request, res: Response) {
        try {
            const { updated_data } = req.body;
            const { user_id } = req.user;
            const result = await AutoClosureService.updateAutoClosureGT(updated_data, user_id);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.UPDATE_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.UPDATE_FAILED));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> updateAutoClosureGT', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async multiUpdateAutoClosureGT(req: Request, res: Response) {
        try {
            const { order_type, short_close, remarks } = req.body;
            const { user_id } = req.user;
            const result = await AutoClosureService.multiUpdateAutoClosureGT(order_type, short_close, remarks, user_id);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.UPDATE_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.UPDATE_FAILED));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> multiUpdateAutoClosureGT', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async fetchAutoClosureMTEcomSingleGrn(req: Request, res: Response) {
        try {
            const { customer_group, limit, offset, search } = req.body;
            const result = await AutoClosureService.fetchAutoClosureMTEcomSingleGrn(customer_group, limit, offset, search);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.DATA_FETCHED));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.NO_RECORD_FOUND));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> fetchAutoClosureMTEcomSingleGrn', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async fetchAutoClosureMTEcomSingleGrnCustomerDetails(req: Request, res: Response) {
        try {
            const { payer_code } = req.body;
            const result = await AutoClosureService.fetchAutoClosureMTEcomSingleGrnCustomerDetails(payer_code);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.DATA_FETCHED));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.NO_RECORD_FOUND));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> fetchAutoClosureMTEcomSingleGrnCustomerDetails', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async fetchMultiGrnConsolidatedData(req: Request, res: Response) {
        try {
            const { customer_group } = req.body;
            const result = await AutoClosureService.fetchMultiGrnConsolidatedData(customer_group);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.DATA_FETCHED));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.NO_RECORD_FOUND));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> fetchMultiGrnConsolidatedData', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async fetchMultiGrnCustomerDetails(req: Request, res: Response) {
        try {
            const { customer_group } = req.body;
            const result = await AutoClosureService.fetchMultiGrnCustomerDetails(customer_group);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.DATA_FETCHED));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.NO_RECORD_FOUND));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> fetchMultiGrnCustomerDetails', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async updateSingleGrn(req: Request, res: Response) {
        try {
            const { updated_data } = req.body;
            const { user_id } = req.user;
            const result = await AutoClosureService.updateSingleGrn(updated_data, user_id);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.UPDATE_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.UPDATE_FAILED));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> updateSingleGrn', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async updateMultiGrn(req: Request, res: Response) {
        try {
            const { ids, short_close, po_validity, remarks } = req.body;
            const { user_id } = req.user;
            const result = await AutoClosureService.updateMultiGrn(ids, short_close, po_validity, remarks, user_id);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.UPDATE_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.UPDATE_FAILED));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> updateMultiGrn', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async multiUpdateMTEcom(req: Request, res: Response) {
        logger.info('inside AutoClosureController -> multiUpdateMTEcom');
        try {
            const { shortCloseSingleGrn, shortCloseMultiGrn, shortCloseRemarks } = req.body;
            const { user_id } = req['user'];
            const result = await AutoClosureService.multiUpdateMTEcom(shortCloseSingleGrn, shortCloseMultiGrn, shortCloseRemarks, user_id);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.UPDATE_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.UPDATE_FAILED));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> multiUpdateMTEcom', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async autoClosureReportGT(req: Request, res: Response) {
        logger.info('inside AutoClosureController -> autoClosureReportGT');
        try {
            const { limit, offset, order_types, sales_order_types, so_numbers, order_date_range, search, upload_so } = req.body;
            const filter: AutoClosureReportFilter = {
                limit,
                offset,
                search,
                order_types,
                sales_order_types,
                so_numbers,
                order_date_range,
                upload_so,
            };
            const result = await AutoClosureService.autoClosureReportGT(filter);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.DATA_FETCHED));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.NO_RECORD_FOUND));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> autoClosureReportGT', error);
            return res.status(400).json(Template.internalServerError());
        }
    },

    async fetchAutoClosureMtEcomConfig(req: Request, res: Response) {
        logger.info('inside AutoClosureController -> fetchAutoClosureMtEcom');
        try {
            const { limit, offset } = req.body;
            const response = await AutoClosureService.fetchAutoClosureMtEcomConfig(limit, offset);
            if (!response) return res.status(200).json(Template.errorMessage(ErrorMessage.NO_RECORD_FOUND));
            return res.status(200).json(Template.success(response, SuccessMessage.FETCH_AUTO_CLOSURE_MT));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> fetchAutoClosureMtEcom', error);
            return res.status(500).json(Template.internalServerError());
        }
    },

    async updateAutoClosureMtEcomConfig(req: Request, res: Response) {
        logger.info('inside AutoClosureController -> updateAutoClosureMtEcomConfig');
        try {
            const payload = req.body;
            const { user_id } = req['user'];
            const response = await AutoClosureService.updateAutoClosureMtEcomConfig(payload, user_id);
            if (!response) return res.status(200).json(Template.errorMessage(ErrorMessage.NO_RECORD_FOUND));
            return res.status(200).json(Template.success(response, SuccessMessage.DATA_UPDATED));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> updateAutoClosureMtEcomConfig', error);
            return res.status(500).json(Template.internalServerError());
        }
    },

    async autoClosureReportMT(req: Request, res: Response) {
        logger.info('Inside AutoClosureController -> autoClosureReportMT');
        try {
            const { filterOptions } = req.body;
            const response = await AutoClosureService.autoClosureReportMT(filterOptions);
            if (response) return res.status(200).json(Template.success(response, SuccessMessage.FETCH_AUTO_CLOSURE_MT));
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_AUTO_CLOSURE_MT));
        } catch (error) {
            logger.error('CAUGHT: Error in AutoClosureController -> autoClosureReportMT', error);
            return res.status(500).json(Template.serverError());
        }
    },
};
