import { Request, Response } from 'express';
import Template from '../helper/responseTemplate';
import logger from '../lib/logger';
import { ServiceDeliveryRequestService } from '../service/serviceDeliveryRequestService';
import { ErrorMessage } from '../constants/errorMessage';
import { SuccessMessage } from '../constants/successMessage';
import _ from 'lodash';

export const ServiceDeliveryRequestController = {
  async getSDList(req: Request, res: Response) {
    logger.info(
      'inside ServiceDeliveryRequestController -> getSDList',
    );

    const { roles, user_id, email, code } = req.user;
    const { limit, offset, search, status } = req.body;

    try {
      const sdrList = await ServiceDeliveryRequestService.getSDList(
        roles, user_id, limit, offset, search, email, status, code || ''
      );

      const sdrListCount =
        await ServiceDeliveryRequestService.getSDListCount(
          roles, user_id, search, email, status, code || ''
        );

      if (sdrList && sdrListCount) {
        logger.info('Inside if success getSDList ');

        return res.status(200).json(
          Template.success(
            {
              rowCount: sdrList.rowCount,
              rows: sdrList.rows,
              totalCount: sdrListCount.rows[0].count,
            },
            SuccessMessage.GET_SDR_LIST_SUCCESS,
          ),
        );
      }

      return res
        .status(200)
        .json(Template.errorMessage(ErrorMessage.GET_SDR_LIST_ERROR));
    } catch (error) {
      logger.error(`error getSDList ${error}`);
      return res.status(400).json(Template.error());
    }
  },

  async sdrReport(req: Request, res: Response) {
    logger.info(
      'inside ServiceDeliveryRequestController -> sdrReport',
    );

    try {

      const { toDate, fromDate } = req.body;
      const sdrReportData = await ServiceDeliveryRequestService.sdrReport(toDate, fromDate);

      if (sdrReportData) {
        logger.info('Inside if success getSDList ');

        return res.status(200).json(
          Template.success(
            {
              rowCount: sdrReportData.rowCount,
              rows: sdrReportData.rows,
            },
            SuccessMessage.GET_SDR_REPORT_DATA_SUCCESS,
          ),
        );
      }

      return res
        .status(200)
        .json(Template.errorMessage(ErrorMessage.GET_SDR_REPORT_DATA_ERROR));
    } catch (error) {
      logger.error(`error sdrReport ${error}`);
      return res.status(400).json(Template.error());
    }
  },

  async sdResponseReport(req: Request, res: Response) {
    logger.info(
      'inside ServiceDeliveryRequestController -> sdResponseReport',
    );

    try {

      const { toDate, fromDate } = req.body;
      const sdResponseReportData = await ServiceDeliveryRequestService.sdResponseReport(toDate, fromDate);

      if (sdResponseReportData) {
        logger.info('Inside if success sdResponseReport ');

        return res.status(200).json(
          Template.success(
            {
              rowCount: sdResponseReportData.rowCount,
              rows: sdResponseReportData.rows,
            },
            SuccessMessage.GET_SD_RESPONSE_REPORT_DATA_SUCCESS,
          ),
        );
      }

      return res
        .status(200)
        .json(Template.errorMessage(ErrorMessage.GET_SD_RESPONSE_REPORT_DATA_ERROR));
    } catch (error) {
      logger.error(`error sdResponseReport ${error}`);
      return res.status(400).json(Template.error());
    }
  },

  async addSDRequest(req: any, res: any) {
    logger.info(
      'Inside ServiceDeliveryRequestController addSDRequest',
    );
    try {
      const serviceDeliveryRequestData = req.body;
      const user = req.user;
      let response = await ServiceDeliveryRequestService.addSDRequest(
        serviceDeliveryRequestData,
        user,
      );

      if (response == null) {
        return res
          .status(500)
          .json(
            Template.error(
              'Technical Error',
              'Error occurred while adding service delivery request',
            ),
          );
      }

      return res
        .status(200)
        .json(
          Template.success(
            response.rows[0],
            'Service delivery request logged',
          ),
        );
    } catch (error) {
      logger.error(
        'Error in adding service delivery request:',
        error,
      );
      return res
        .status(500)
        .json(
          Template.error(
            'Technical Error',
            'Error occurred while adding service delivery request',
          ),
        );
    }
  },

  async updateSDRequest(req: any, res: any) {
    logger.info(
      'Inside ServiceDeliveryRequestController updateSDRequest',
    );

    try {
      const serviceDeliveryRequestData = req.body;
      const user = req.user;
      let response =
        await ServiceDeliveryRequestService.updateSDRequest(
          serviceDeliveryRequestData,
          user,
        );

      if (response == null) {
        return res.status(500).json(
          Template.error(
            'Technical Error',
            'Error occurred while updating service delivery request',
          ),
        );
      }

      return res.status(200).json(
        Template.success(
          { rowCount: response.rowCount },
          'Service delivery request updated with below details',
        ),
      );
    } catch (error) {
      logger.error(
        'Error in adding service delivery request (ServiceDeliveryRequestController.updateSDRequest):',
        error,
      );
      return res.status(500).json(
        Template.error(
          'Technical Error',
          'Error occurred while update service delivery request',
        ),
      );
    }
  },

  async getSDReport(req: Request, res: Response) {
    logger.info('inside ServiceDeliveryRequestController -> getSDReport');
  
    try {
      await ServiceDeliveryRequestService.fetchReportsForAllRegions();
      return res.status(200).json({ status: "True", message: "SD Order Report sent!" });
    } catch (error) {
      logger.error(`error getSDReport ${error}`);
      return res.status(500).json({ status: "False", message: "Error in Sending SD Order Report!" });
    }
  },
};



