import { Request, Response } from 'express';
import logger from "../lib/logger";
import Template from '../helper/responseTemplate';
import { UserService } from "../service/user.service";
import { SuccessMessage } from '../constants/successMessage'
import { ErrorMessage } from '../constants/errorMessage'

export const UserController = {
    async fetchDistributorDetails(req: Request, res: Response) {
        logger.info("inside UserController -> fetchDistributorDetails");
        try {
            const distributorCode = req.params.distributorCode;
            const response = await UserService.fetchDistributorDetails(distributorCode);
            res.status(200).json(Template.success(response, ""));
        } catch (err) {
            logger.error("Error in UserController -> fetchDistributorDetails: ", err);
            return res.status(500).json(Template.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }
};