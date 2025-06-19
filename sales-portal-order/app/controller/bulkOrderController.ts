import logger from "../lib/logger";
import { Request, Response } from "express";
import Template from '../helper/responseTemplate'
import { ErrorMessage } from "../constants/errorMessage";
import { SuccessMessage } from "../constants/successMessage";
import { BulkOrderService } from "../service/bulkOrderService";

export const BulkOrderController = {
    async getBulkMoqMappingData(req: Request, res: Response) {
        logger.info('inside BulkOrderController -> getMoqMappingData');
        try {
            const { roles, email } = req.user;
            const { search, limit, offset, area } = req.body;
            const response = await BulkOrderService.getBulkMoqMappingData(area, search, roles, email, limit, offset);
            if (response)
                return res.status(200).json(Template.success(response, SuccessMessage.MOQ_MAPPING_DATA))
            return res.status(200).json(Template.error(ErrorMessage.MOQ_MAPPING_DATA));
        } catch (error) {
            logger.error('inside BulkOrderController -> getMoqMappingData, Error: ', error);
            return res.status(500).json(Template.error())
        }
    },
    async BulkOrderupdateMoq(req: Request, res: Response) {
        logger.info('inside BulkOrderController -> updateMoq');
        try {
            const { moq_data } = req.body;
            const response = await BulkOrderService.BulkOrderupdateMoq(moq_data, req.user);
            if (response)
                return res.status(200).json(Template.successMessage(SuccessMessage.MOQ_UPDATE))
            return res.status(200).json(Template.error(ErrorMessage.MOQ_UPDATE));
        } catch (error) {
            logger.error('inside BulkOrderController -> updateMoq, Error: ', error);
            return res.status(500).json(Template.error());
        }
    },


    async getMappedAreaZone(req: Request, res: Response) {
        logger.info('inside BulkOrderController -> getMappedAreaZone')
        const { roles, email } = req.user;
        try {
            const result = await BulkOrderService.getMappingAreaZone(roles, email);
            if (result)
                return res.status(200).json({ data: result, success: true });
            return res.status(200).json(Template.error(ErrorMessage.MOQ_UPDATE));
        } catch (error) {
            logger.error('inside BulkOrderController -> updateMoq, Error: ', error);
            return res.status(500).json(Template.error());
        }



    },

    async massUpdateMoq(req: Request, res: Response) {
        logger.info('inside BulkOrderController-> massUpdateMoq')

        let response = await BulkOrderService.boMassUpdate(req.body, req.user);

        if (response) return res.status(200).json({ data: 'updated successfully', success: true });
        else return res.status(500).json(Template.error(ErrorMessage.BULK_MOQ_UPDATE));
    },

    async getBoDistributorMOQ(req: Request, res: Response) {
        try {
            logger.info('inside BulkOrderController -> getBoDistributorMOQ')
            let response = await BulkOrderService.getBoDistributorMOQ(req.body);
            if (response)
                return res.status(200).json({ data: response, success: true });
            else
                return res.status(200).json({ data: [{ moq: '' }], success: false })
        }
        catch (error) {
            logger.error("CAUGHT: Error in BulkOrderController -> getBoDistributorMOQ", error);
            return res.status(500).json(Template.error(ErrorMessage.BULK_DIST_MOQ_FETCH));
        }
    },
}