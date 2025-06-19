import { Request, Response } from 'express';
import responseTemplate from '../helper/responseTemplate';
import logger from '../lib/logger';
import { UserService } from '../service/user.service';
import { SuccessMessage } from '../constants/successMessage';
import { ErrorMessage } from '../constants/errorMessage';

class UserController {
    public async getUserDetails(req: Request, res: Response) {
        try {
            logger.info(`inside userController -> getUserDetails`);
            const distributor_id = req.params.distributor_id || req.user.login_id;
            // const resultSet = await UserService.getUserDetails(req.user.login_id);
            const resultSet = await UserService.fetchDistributorDetails(distributor_id);
            res.status(200).json({ data: resultSet, success: true });
        } catch (error) {
            logger.error(`inside userController -> getUserDetails, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }
    public async fetchPlantDetails(req: Request, res: Response) {
        try{
            logger.info(`inside userController -> fetchPlantDetails`);
             const response = await UserService.fetchPlantDetails();
                  if (response) {
                    logger.info('Inside  userController -> fetchPlantDetails , ' + SuccessMessage.PLANT_DETAILS_SUCCESS)
                    res.status(200).json(responseTemplate.success(response, SuccessMessage.PLANT_DETAILS_SUCCESS))
                  }
                  else {
                    logger.info('Inside  userController -> fetchPlantDetails, ' + ErrorMessage.PLANT_DETAILS_ERROR)
                    res.status(200).json(responseTemplate.errorMessage(ErrorMessage.PLANT_DETAILS_ERROR))
                  }
        } catch (error) {
            logger.error(`inside  userController -> fetchPlantDetails, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }
}

export default UserController;