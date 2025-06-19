import logger from '../lib/logger';
import { Request, Response } from 'express';
import { SurveyService } from '../service/surveyService';
import Template from '../helper/responseTemplate';
import { SuccessMessage } from '../constant/sucess.message';
import { ErrorMessage } from '../constant/error.message';
import _ from 'lodash';
import { roles as userRoles } from '../constant/persona';

class SurveyController {
    static async fetchDepotForLogistics(req: Request, res: Response) {
        logger.info('inside SurveyController -> fetchDepotForLogistics');
        try {
            const { logistics_email } = req.body;
            const { email, roles } = req.user;
            let mail = logistics_email
                ? logistics_email.toLowerCase()
                : _.intersection(roles, [userRoles.SUPER_ADMIN, userRoles.SUPPORT, userRoles.PORTAL_OPERATIONS]).length > 0
                  ? null
                  : email.toLowerCase();
            let depotData = await SurveyService.fetchDepotForLogistics(mail);
            if (depotData) {
                return res.status(200).json(Template.success(depotData, SuccessMessage.FETCH_DEPOT_LOGISTICS));
            }
            return res.status(408).json(Template.error('API Error', ErrorMessage.FETCH_DEPOT_LOGISTICS));
        } catch (error) {
            logger.error(`inside SurveyController -> fetchDepotForLogistics, error: ${error}`);
            res.status(500).json(Template.internalServerError());
        }
    }

    static async upsertCfaSurveyQuestionnaire(req: Request, res: Response) {
        logger.info('inside SurveyController -> upsertCfaSurveyQuestionnaire');
        try {
            const { logistic_id, depot_code_distributors, questions, survey_start, survey_end } = req.body;
            const { user_id } = req?.user != null ? req.user : { user_id: null };
            let id = logistic_id ? logistic_id : user_id;

            let response = await SurveyService.upsertCfaSurveyQuestionnaire(id, depot_code_distributors, questions, survey_start, survey_end);
            if (response) {
                return res.status(200).json(Template.successMessage(SuccessMessage.UPSERT_CFA_SURVEY_QUESTIONNAIRE));
            }
            return res.status(200).json(Template.error('API Error', ErrorMessage.UPSERT_CFA_SURVEY_QUESTIONNAIRE));
        } catch (error) {
            logger.error(`inside SurveyController -> upsertCfaSurveyQuestionnaire, error: ${error}`);
            res.status(500).json(Template.internalServerError());
        }
    }

    static async fetchCfaSurveyQuestions(req: Request, res: Response) {
        logger.info('inside SurveyController -> fetchCfaSurveyQuestions');
        try {
            const { logistic_id, depot_code } = req.body;
            const { user_id, roles } = req?.user != null ? req.user : { user_id: null, roles: null };
            let id = logistic_id ? logistic_id : _.intersection(roles, [userRoles.SUPER_ADMIN, userRoles.SUPPORT, userRoles.PORTAL_OPERATIONS]).length === 0 ? user_id : null;
            let response = await SurveyService.fetchCfaSurveyQuestions(id, depot_code);
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.FETCH_CFA_SURVEY_QUESTIONS));
            }
            return res.status(200).json(Template.error('API Error', ErrorMessage.FETCH_CFA_SURVEY_QUESTIONS));
        } catch (error) {
            logger.error(`inside SurveyController -> fetchCfaSurveyQuestions, error: ${error}`);
            res.status(500).json(Template.internalServerError());
        }
    }

    static async saveDbResponse(req: Request, res: Response) {
        logger.info('inside SurveyController -> saveDbResponse');
        try {
            const { questionnaire_id, depot_code, db_code, db_name, survey_start, survey_end, db_response, db_email, db_mobile } = req.body;
            const { user_id } = req?.user != null ? req.user : { user_id: null };
            let id = user_id ? user_id : null;

            let response = await SurveyService.saveDbResponse(questionnaire_id, db_code, db_response, id, depot_code, db_name, survey_start, survey_end, db_email, db_mobile);
            if (response) {
                return res.status(200).json(Template.successMessage(SuccessMessage.SAVE_DB_RESPONSE));
            }
            return res.status(200).json(Template.error('API Error', ErrorMessage.SAVE_DB_RESPONSE));
        } catch (error) {
            logger.error(`inside SurveyController -> saveDbResponse, error: ${error}`);
            res.status(500).json(Template.internalServerError());
        }
    }

    static async surveyNotification(req: Request, res: Response) {
        logger.info('inside SurveyController -> surveyNotification');
        try {
            const response = await SurveyService.surveyNotification();
            return response === true
                ? res.status(200).json(Template.success(response, SuccessMessage.SURVEY_NOTIFICATION))
                : res.status(400).json(Template.errorMessage(ErrorMessage.SURVEY_NOTIFICATION_ERROR));
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyController -> surveyNotification', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    static async fetchSurveyReport(req: Request, res: Response) {
        logger.info('inside SurveyController -> fetchSurveyReport');
        try {
            const { depot_codes } = req.body;
            const response = await SurveyService.fetchSurveyReport(depot_codes);
            return res.status(200).json(Template.success(response, SuccessMessage.FETCH_SURVEY_REPORT));
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyController -> fetchSurveyReport', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    static async fetchSurveyReportStatistics(req: Request, res: Response) {
        logger.info('inside SurveyController -> fetchSurveyReportStatistics');
        try {
            const { zones, area_codes, limit, offset, headerFilter } = req.body;
            const response = await SurveyService.fetchSurveyReportStatistics(area_codes, zones, limit, offset, headerFilter);
            if (!response) {
                return res.status(200).json(Template.error('API Error', ErrorMessage.FETCH_SURVEY_REPORT_FOR_LOGISTICS));
            }
            return res.status(200).json(Template.success(response, SuccessMessage.FETCH_SURVEY_REPORT_FOR_LOGISTICS));
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyController -> fetchSurveyReportStatistics', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    static async fetchActivePlantDistributors(req: Request, res: Response) {
        logger.info('inside SurveyController -> fetchActivePlantDistributors');
        try {
            const response = await SurveyService.fetchActivePlantDistributors();
            return res.status(200).json(Template.success(response, SuccessMessage.FETCH_ACTIVE_PLANT_DISTRIBUTORS));
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyController -> fetchActivePlantDistributors', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    static async saveSurveyLink(req: Request, res: Response) {
        logger.info('inside SurveyController -> saveSurveyLink');
        try {
            const { survey_start, survey_end, survey_link } = req.body;

            if (!survey_start || !survey_end || !survey_link) {
                return res.status(400).json(Template.error(ErrorMessage.INVALID_INPUT));
            }
            const response = await SurveyService.saveSurveyLink(survey_start, survey_end, survey_link);
            return res.status(200).json(Template.success(response, SuccessMessage.SAVE_SURVEY_LINK));
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyController -> saveSurveyLink', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    static async saveSurveyResponse(req: Request, res: Response) {
        logger.info('inside SurveyController -> saveSurveyResponse');
        try {
            const { questionnaire_id, db_code, survey_start, survey_end, response = {}, updated_by = '', db_cfa_details = {} } = req.body;

            const result = await SurveyService.saveSurveyResponse(questionnaire_id, db_code, survey_start, survey_end, response, updated_by, db_cfa_details);
            return res.status(200).json(Template.success(result, SuccessMessage.SAVE_SURVEY_LINK));
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyController -> saveSurveyResponse', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    static async saveNocResponse(req: Request, res: Response) {
        logger.info('inside SurveyController -> saveNocResponse');
        try {
            const { distributor_id, agreement_status } = req.body;

            if (!distributor_id || !agreement_status) {
                return res.status(400).json(Template.error(ErrorMessage.INVALID_INPUT));
            }
            const response = await SurveyService.saveNocResponse(distributor_id, agreement_status);
            return res.status(200).json(Template.success(response, SuccessMessage.SAVE_NOC_RESPONSE));
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyController -> saveNocResponse', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }
    static async fetchDistributorAgreements(req: Request, res: Response) {
        logger.info('inside SurveyController -> fetchDistributorAgreements');
        try {
            const limit = parseInt((req.query as any).limit, 10);
            const offset = parseInt((req.query as any).offset, 10);
            const status = (req.query as any).status;
            const search = (req.query as any).search;

            const agreementsResponse = await SurveyService.fetchDistributorAgreements(limit, offset, status, search);
            const idsResponse = await SurveyService.fetchDistributorIDs();

            // Combine the results
            const combinedResponse = {
                agreements: agreementsResponse,
                distributorIDs: idsResponse,
            };

            return res.status(200).json(Template.success(combinedResponse, SuccessMessage.FETCH_DISTRIBUTORS_AGREEMENTS));
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyController -> fetchDistributorAgreements', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    static async submitSurvey(req: Request, res: Response) {
        logger.info('inside SurveyController -> submitSurvey');
        try {
            const { db_code, accountingSoftware, otherSoftware, version } = req.body;

            // Validate input
            if (!db_code) {
                return res.status(400).json(Template.error(ErrorMessage.INVALID_INPUT));
            }

            // Call the service to handle the survey submission
            const response = await SurveyService.submitSurvey({
                db_code,
                accountingSoftware,
                otherSoftware,
                version,
            });

            // Check if the response indicates success
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.SUBMIT_SURVEY));
            }
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyController -> submitSurvey', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }
    static async getSurveyResponses(req: Request, res: Response) {
        logger.info('inside SurveyController -> getSurveyResponses');
        try {
            const surveyResponses = await SurveyService.getSurveyResponses();

            return res.status(200).json(Template.success(surveyResponses, SuccessMessage.FETCH_SURVEY_RESPONSES));
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyController -> getSurveyResponses', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }
}

export default SurveyController;
