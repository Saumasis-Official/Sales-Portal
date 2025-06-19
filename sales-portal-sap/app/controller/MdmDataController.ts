import logger from '../lib/logger';
// import fs from 'fs'
// import axios, { AxiosResponse } from 'axios';
import Template from '../helper/responseTemplate';
import { ErrorMessage } from '../constant/error.message';
import { SuccessMessage } from '../constant/sucess.message';
import { MdmService } from '../service/mdm.service';
import { Request, Response } from 'express';

class MdmDataController {
    static async downloadMdmData(req: any, res: any) {
        try {
            const { dataDownload } = req.body;
            const response = await MdmService.mdmDownload(dataDownload);
            if (response) {
                logger.info(`Mdm data downloaded successfully with response:`)
                // res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                // res.send(response);
                return res.status(200).json(Template.success(response, SuccessMessage.MDM_DATA_DOWNLOADED_SUCCESSFULLY))
            }
            else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.MDM_DATA_FETCH_FAILED));
            }
        } catch (error) {
            logger.error('Error in downloading mdm data:', error);
            res.status(500).json(error)
        }
    }
    static async getMdmData(req: any, res: any) {
        try {
            logger.info(`Fetching getMdmData:`, req);
            const data = await MdmService.getMdmData(req);
            if (data) {
                res.data = data;
                return res.status(200).json(Template.success(data, SuccessMessage.MDM_DATA_FETCHED_SUCCESSFULLY))
            }
            else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.MDM_DATA_FETCH_FAILED));
            }
        }
        catch (err) {
            return res.status(400).json(Template.errorMessage(ErrorMessage.MDM_DATA_ERROR));
        }
    }

    static async feildLevelSave(req: any, res: any) {
        logger.info(`Inside MdmDataController -> feildLevelSave`);
        try {
            const response = await MdmService.fieldLevelSave(req.body);
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.MDM_DATA_SAVED_SUCCESSFULLY))
            }
            else if (response == null) {
                return res.status(400).json(Template.errorMessage(ErrorMessage.MDM_DATA_UPDATE_FAILED));
            } else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.MDM_DATA_SAVE_FAILED));
            }
        }
        catch (err) {
            logger.error(`Error in MdmDataController -> feildLevelSave:`, err);
            res.status(500).json(err)
        }
    }
    static async uploadMdmData(req: Request, res: Response) {
        logger.info('inside MdmDataController -> uploadMdmData')
        try {
            const { user_id } = req['user'];
            const response = await MdmService.uploadMdmData(req['files'], user_id);
            if (!response?.status) {
                return res.status(200).json(Template.error(response?.message, null, response?.data));
            } else {
                return res.status(200).json(Template.success(response?.data, SuccessMessage.MDM_DATA_UPLOADED_SUCCESSFULLY))
            }
        } catch (error) {
            logger.error('Error in uploading mdm data:', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR))
        }
    }

    static async getAllCustomers(req: Request, res: Response) {
        logger.info('inside MdmDataController -> getAllCustomers');
        try {
            const response = await MdmService.getAllCustomers();
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.MDM_DATA_FETCHED_SUCCESSFULLY))
            }
            else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.MDM_DATA_FETCH_FAILED));
            }
        } catch (error) {
            logger.error('Error in fetching customers:', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR))
        }
    };
    static async getMdmNotification(req: Request, res: Response) {
        logger.info('inside MdmDataController -> getMdmNotification');
        try {
            const email = await MdmService.getMdmNotification();
            if (email) {
                return res.status(200).json(Template.success(email, SuccessMessage.MDM_DATA_MAIL_SUCCESSFULLY))
            }
            else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.MDM_DATA_MAIL_FAILED));
            }

        }
        catch (error) {
            logger.error('Error in fetching mdm notification:', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR))
        }
    };
    static async createOrUpdateMdmData(req: Request, res: Response) {
        logger.info('inside MdmDataController -> createOrUpdateMdmData');
        try {
            const response:any = await MdmService.createOrUpdateMdmData(req);
            if(response.message){
                return res.status(400).json(Template.error(response.messaage,response.message,response.data));
            }
            else if(response?.command =='INSERT'){
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.NEW_PSKU_CREATED))
            } else if (response == null) {
                return res.status(400).json(Template.errorMessage(ErrorMessage.NEW_PSKU_FAILED));
            } else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.NEW_PSKU_FAILED));
            }
        }
        else{
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.PSKU_UPDATED_SUCCESSFULLY))
            } else if (response == null) {
                return res.status(400).json(Template.errorMessage(ErrorMessage.PSKU_UPDATE_FAILED));
            } else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.PSKU_UPDATE_FAILED));
            }
        }
    }
        catch (error) {
            logger.error('Error in creating new psku:', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR))
        }
    }
}
export default MdmDataController;