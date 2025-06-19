import correlator from 'express-correlation-id';
import Template from "../helper/responseTemplate";
import logger from '../lib/logger';
import { Request, Response } from 'express';
import { ErrorReportingService } from "../service/ErrorReporting.service";
import Email from "../helper/email";
import { ErrorMessage } from '../constant/error.message';
import { SuccessMessage } from '../constant/sucess.message';
const emailConfig = global['configuration'].email;

class ErrorReportingController {

    static async reportPortalError(req: Request, res: Response) {
        let isPortalGenerated: boolean = false;
        let portalGeneratedReportingType: string;
        let recipients;
        try {
            const email = req['user']?.email ?? '';
            req.body.distributorId = req['user']?.login_id || req.params.distributor_id;
            req.body.corrlnId = correlator.getId() || null;
            if (req.body.errorCode == ErrorMessage.PARTNER_MISMATCH_ERROR_CODE)
                recipients = req.body.recipients;
            else if (req['user'] == null) { //If use is null, then internal API call from order microservice was made, in this case email to be sent to internal members
                req.body.created_by_user_group = 'PORTAL_MANAGED';
                recipients = emailConfig.reportAutoValidationErrorMailIds;
                isPortalGenerated = true;
                if(req?.body?.remarks && req?.body?.remarks?.includes('AOS')){
                    portalGeneratedReportingType = 'AOS';
                } else {
                    portalGeneratedReportingType = 'DLP';
                }
            }
            else
                recipients = emailConfig.reportPortalErrorMailIds;

            const reportPortalErrorResponse = await ErrorReportingService.reportPortalError(req.body, req['user']);
            if (reportPortalErrorResponse) {
                logger.info(`recipients : ${recipients}`);
                let ccEmailIds = req.body.ccRecipients ? req.body.ccRecipients : '';
                ccEmailIds = ccEmailIds + ',' + email;
                logger.info(`ccEmailIds : ${ccEmailIds}`);
                let tse: {
                    first_name: string,
                    last_name: string,
                    code: string,
                    email: string,
                  }[] = [];
                  
                  if (req.body.tse) {
                    tse = req.body.tse.map(({ first_name, last_name, code, email }) => ({
                      first_name,
                      last_name,
                      code,
                      email,
                    }));
                  }
                logger.info(`tse : ${JSON.stringify(tse)}`);
                let emailTemplateFileName = req.body.errorCode == ErrorMessage.PARTNER_MISMATCH_ERROR_CODE ? 'partner-mismatch-error' : 'report-portal-error';
                let soDetailsObject: {
                    soNumber: string,
                    soDate: string,
                    distCode: string,
                    distName: string,
                    unloading: string
                } = {
                    soNumber: null,
                    soDate: null,
                    distCode: null,
                    distName: null,
                    unloading: null
                };
                if (req.body.errorCode == ErrorMessage.PARTNER_MISMATCH_ERROR_CODE) {
                    if (reportPortalErrorResponse.error_info) {
                        if (reportPortalErrorResponse.error_info.data_from_sap) {
                            soDetailsObject.soNumber = reportPortalErrorResponse.error_info.data_from_sap.SalesOrder;
                            soDetailsObject.soDate = reportPortalErrorResponse.error_info.data_from_sap.PoDate;
                        }
                        if (reportPortalErrorResponse.error_info.sales_order_data) {
                            if (reportPortalErrorResponse.error_info.sales_order_data.distributor) {
                                soDetailsObject.distCode = reportPortalErrorResponse.error_info.sales_order_data.distributor.id;
                                soDetailsObject.distName = reportPortalErrorResponse.error_info.sales_order_data.distributor.name;
                            }
                            soDetailsObject.unloading = reportPortalErrorResponse.error_info.sales_order_data.unloading;
                        }
                    }
                }

                Email.report_portal_error(recipients, ccEmailIds, tse, reportPortalErrorResponse, req['user'], emailTemplateFileName, soDetailsObject, isPortalGenerated, portalGeneratedReportingType);
                return res.status(200).json(
                    Template.success(
                        reportPortalErrorResponse,
                        "Ticket logged with below details"
                    )
                );
            }
            return res.status(200).json(Template.error(
                "Technical Error",
                "Could not log your ticket"
            )
            );
        } catch (error) {
            logger.error('Error in logging request (ErrorReportingController.reportPortalError):', error);
            res.status(500).json(
                Template.error(
                    "Technical Error",
                    "Error occurred while logging service request"
                )
            );
        }
    }

    static async reportCFAPortalError(req: Request, res: Response) {
        try {
            req.body.corrlnId = correlator.getId() || null;
            const reportPortalErrorResponse = await ErrorReportingService.reportCFAPortalError(req.body, req['user']);
            if (reportPortalErrorResponse) {
                let recipients = req.body.errorCode == ErrorMessage.PARTNER_MISMATCH_ERROR_CODE ? req.body.recipients : emailConfig.reportPortalErrorMailIds;
                logger.info(`recipients : ${recipients}`);
                let ccEmailIds = req.body.ccRecipients ? req.body.ccRecipients : '';
                logger.info(`ccEmailIds : ${ccEmailIds}`);
                let emailTemplateFileName = req.body.errorCode == ErrorMessage.PARTNER_MISMATCH_ERROR_CODE ? 'partner-mismatch-error' : 'report-cfa-portal-error';

                Email.report_cfa_portal_error(recipients, ccEmailIds, reportPortalErrorResponse, req['user'], emailTemplateFileName);
                return res.status(200).json(
                    Template.success(
                        reportPortalErrorResponse,
                        "Ticket logged with below details"
                    )
                );
            }
            return res.status(200).json(Template.error(
                "Technical Error",
                "Could not log your ticket"
            )
            );
        } catch (error) {
            logger.error('Error in logging request (ErrorReportingController.reportCFAPortalError):', error);
            res.status(500).json(
                Template.error(
                    "Technical Error",
                    "Error occurred while logging service request"
                )
            );
        }
    }

    // static async fetchServiceRequestCategories(req: Request, res: Response) {
    //     try {
    //         const fetchServiceRequestCategoriesResponse = await ErrorReportingService.fetchServiceRequestCategories();
    //         if (fetchServiceRequestCategoriesResponse && fetchServiceRequestCategoriesResponse.rowCount) {
    //             return res.status(200).json(
    //                 Template.success(fetchServiceRequestCategoriesResponse.rows, SuccessMessage.REQUEST_CATEGORY_FETCH_SUCCESS)
    //             );
    //         }
    //         return res.status(200).json(Template.error(
    //             "Technical Error",
    //             ErrorMessage.REQUEST_CATEGORY_FETCH_ERROR
    //         ));
    //     } catch (error) {
    //         logger.error('Error in fetching service request categories (ErrorReportingController.fetchServiceRequestCategories):', error);
    //         res.status(500).json(
    //             Template.error(
    //                 "Technical Error",
    //                 ErrorMessage.REQUEST_CATEGORY_FETCH_ERROR
    //             )
    //         );
    //     }
    // }



    static async fetchServiceRequestCategories(req: Request, res: Response) {
        try {
            const { type } = req.params;
            const fetchServiceRequestCategoriesResponse = await ErrorReportingService.fetchServiceRequestCategories(type);
            if (fetchServiceRequestCategoriesResponse?.rowCount) {
                return res.status(200).json(
                    Template.success(fetchServiceRequestCategoriesResponse.rows, SuccessMessage.REQUEST_CATEGORY_FETCH_SUCCESS)
                );
            }
            return res.status(200).json(Template.error(
                "Technical Error",
                ErrorMessage.REQUEST_CATEGORY_FETCH_ERROR
            ));
        } catch (error) {
            logger.error('Error in fetching service request categories (ErrorReportingController.fetchServiceRequestCategories):', error);
            res.status(500).json(
                Template.error(
                    "Technical Error",
                    ErrorMessage.REQUEST_CATEGORY_FETCH_ERROR
                )
            );
        }
    }



    static async addServiceRequestCategory(req: Request, res: Response) {
        try {
            const reportPortalErrorResponse = await ErrorReportingService.addServiceRequestCategory(req.body, req['user'].user_id);
            if (reportPortalErrorResponse && reportPortalErrorResponse.command === 'INSERT' && reportPortalErrorResponse.rowCount) {
                return res.status(200).json(
                    Template.successMessage(SuccessMessage.REQUEST_CATEGORY_CREATE_SUCCESS)
                );
            }
            return res.status(200).json(Template.error(
                "Technical Error",
                ErrorMessage.REQUEST_CATEGORY_CREATE_ERROR
            ));
        } catch (error) {
            logger.error('Error in adding service category request (ErrorReportingController.addServiceRequestCategory):', error);
            res.status(500).json(
                Template.error(
                    "Technical Error",
                    ErrorMessage.REQUEST_CATEGORY_CREATE_ERROR
                )
            );
        }
    }


    static async modifyServiceRequestCategory(req: Request, res: Response) {
        try {
            const { category_id } = req.params;
            const reportPortalErrorResponse = await ErrorReportingService.modifyServiceRequestCategory(parseInt(category_id), req.body, req['user'].user_id);
            if (reportPortalErrorResponse && reportPortalErrorResponse.command === 'UPDATE' && reportPortalErrorResponse.rowCount) {
                return res.status(200).json(
                    Template.success(SuccessMessage.REQUEST_CATEGORY_UPDATE_SUCCESS)
                );
            }
            return res.status(200).json(Template.error(
                "Technical Error",
                ErrorMessage.REQUEST_CATEGORY_UPDATE_ERROR
            ));
        } catch (error) {
            logger.error('Error in logging request (ErrorReportingController.modifyServiceRequestCategory):', error);
            res.status(500).json(
                Template.error(
                    "Technical Error",
                    ErrorMessage.REQUEST_CATEGORY_UPDATE_ERROR
                )
            );
        }
    }


}


export default ErrorReportingController;