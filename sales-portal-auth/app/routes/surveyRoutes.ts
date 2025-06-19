import { Router } from 'express';
import SurveyController from '../controller/SurveyController';
import adminMiddleware from '../middleware/adminMiddleware';
import ValidAuthTokenMiddleware from '../middleware/authMiddleware';
import expressJoiValidator from 'express-joi-validator';
import expressJoi from '../lib/requestValidator';

class SurveyRoutes {
    router: Router;
    constructor() {
        this.router = Router();
        this.init();
    }
    init() {
        this.router.post('/get-depot-for-logistics', adminMiddleware.validateToken, expressJoiValidator(expressJoi.depotLogistics), SurveyController.fetchDepotForLogistics);
        this.router.post(
            '/upsert-cfa-questionnaire-admin',
            adminMiddleware.validateToken,
            expressJoiValidator(expressJoi.upsertCfaQuestionnaire),
            SurveyController.upsertCfaSurveyQuestionnaire,
        );
        this.router.post('/upsert-cfa-questionnaire', expressJoiValidator(expressJoi.upsertCfaQuestionnaire), SurveyController.upsertCfaSurveyQuestionnaire);
        this.router.post('/get-cfa-questions-admin', adminMiddleware.validateToken, expressJoiValidator(expressJoi.getCfaQuestions), SurveyController.fetchCfaSurveyQuestions);
        this.router.post('/get-cfa-questions', expressJoiValidator(expressJoi.getCfaQuestions), SurveyController.fetchCfaSurveyQuestions);
        this.router.post('/save-db-response-admin', adminMiddleware.validateToken, expressJoiValidator(expressJoi.saveDbResponse), SurveyController.saveDbResponse);
        this.router.post('/save-db-response', expressJoiValidator(expressJoi.saveDbResponse), SurveyController.saveDbResponse);
        this.router.get('/survey-notifications', SurveyController.surveyNotification);
        this.router.post('/survey-report', adminMiddleware.validateToken, expressJoiValidator(expressJoi.surveyReport), SurveyController.fetchSurveyReport);
        this.router.post('/survey-response-report', SurveyController.fetchSurveyReportStatistics);
        this.router.get('/active-plant-distributors', adminMiddleware.validateToken, SurveyController.fetchActivePlantDistributors);
        this.router.post('/survey-link', adminMiddleware.validateToken, SurveyController.saveSurveyLink);
        this.router.post('/survey-link-response', ValidAuthTokenMiddleware.validateToken, SurveyController.saveSurveyResponse);
        this.router.post('/save-noc', ValidAuthTokenMiddleware.validateToken, SurveyController.saveNocResponse);
        this.router.get('/fetch-distributor-agreements', SurveyController.fetchDistributorAgreements);
        this.router.post('/save-survey-response', ValidAuthTokenMiddleware.validateToken, SurveyController.submitSurvey);
        this.router.get('/fetch-survey-response', SurveyController.getSurveyResponses);
    }
}

const surveyRoutes = new SurveyRoutes();
surveyRoutes.init();

export default surveyRoutes.router;
