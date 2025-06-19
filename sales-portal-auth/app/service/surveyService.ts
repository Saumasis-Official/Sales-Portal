import logger from '../lib/logger';
import { SurveyModel } from '../models/SurveyModel';
import Email from '../helper/email';
import { SURVEY_NOTIFICATION_EMAIL_TYPE } from '../constant/index';
import commonHelper from '../helper';
interface SurveyReport {
    'Area Code': string;
    'Depot Code': string;
    'CFA Name': string;
    'CFA Contact Person': string;
    'CFA Email': string;
    'CFA Mobile': string;
    'DB Code': string;
    'DB Name': string;
    'DB Email': string;
    Questions: string;
    Feedback: string;
    'Survey Start Date': string;
    'Survey End Date': string;
    'Response Date': string;
    Remarks: string;
    response: any;
}

export const SurveyService = {
    async fetchDepotForLogistics(email: string | null) {
        logger.info('inside SurveyService -> fetchDepotForLogistics');
        const response = await SurveyModel.fetchDepotForLogistics(email);
        return response;
    },

    async upsertCfaSurveyQuestionnaire(
        logistic_id: string | null,
        depot_code_distributors: { depot_code: string; applicable_distributors: string[] }[],
        questions: any,
        survey_start: any,
        survey_end: any,
    ) {
        logger.info('inside SurveyService -> upsertCfaSurveyQuestionnaire');
        const response = await SurveyModel.upsertCfaSurveyQuestionnaire(logistic_id, depot_code_distributors, questions, survey_start, survey_end);
        return response;
    },

    async fetchCfaSurveyQuestions(logistic_id: string | null, depot_code: string[] | null) {
        logger.info('inside SurveyService -> fetchCfaSurveyQuestions');
        const response = await SurveyModel.fetchCfaSurveyQuestions(logistic_id, depot_code);
        return response;
    },

    async saveDbResponse(
        questionnaire_id: number,
        db_code: string,
        response: any,
        updated_by: string | null,
        depot: string,
        db_name: string,
        survey_start: string,
        survey_end: string,
        db_email: string | null,
        db_mobile: string | null,
    ) {
        logger.info('inside SurveyService -> saveDbResponse');
        const cfaData = await SurveyModel.fetchCfaDetailsOfDepot(depot);
        if (cfaData?.length) {
            let cfa_data = JSON.stringify(
                Object.assign(
                    {},
                    cfaData.map((cfa: any, index) => {
                        return { customer: `${db_name} (${db_code})`, customer_email: db_email ? db_email : '-', customer_mobile: db_mobile ? db_mobile : '-', ...cfa };
                    }),
                ),
            );
            const res = await SurveyModel.saveDbResponse(questionnaire_id, db_code, response, updated_by, survey_start, survey_end, cfa_data);
            return res;
        }
        return false;
    },

    async surveyNotification() {
        logger.info('inside SurveyService -> surveyNotification');
        try {
            const dbList = await SurveyModel.surveyNotification();
            for (const db of dbList) {
                if (!db.applicable_distributors.includes(db.db_id)) continue;
                const emailType = +db.notification_count === 0 ? SURVEY_NOTIFICATION_EMAIL_TYPE.INITIAL : SURVEY_NOTIFICATION_EMAIL_TYPE.FOLLOW_UP;
                const emailResponse = await Email.survey_notification(emailType, db);
                /**
                 * Special care to be taken, if email is not sent then data should not be updated in database.
                 */
                if (emailResponse) {
                    await SurveyModel.upsertSurveyNotification(db, emailType);
                }
            }
            this.surveyQuestionsDump();
            return true;
        } catch (err) {
            logger.error('Error in SurveyService -> surveyNotification', err);
            return err;
        }
    },

    async surveyQuestionsDump() {
        /**
         * Job to insert questions for the next survey as soon as one survey of a depot ends.
         * Start date and end date will be of next upcoming quarter with duration of 2weeks.
         * Questions will be carried forward from the last survey.
         * If there is no previous questions(eg. new depot) then default questions will be inserted
         */
        logger.info('inside SurveyService -> surveyQuestionsDump');
        try {
            const startDate = this.getFirstDateOfUpcomingQuarter(new Date().getMonth() + 1, new Date().getFullYear());
            const endDate = new Date(startDate.getTime() + 12095.9e5); // 2 weeks
            await SurveyModel.surveyQuestionsDump(startDate, endDate);
            return true;
        } catch (error) {
            logger.error('CAUGHT: Error in SurveyService -> surveyQuestionsDump', error);
            return null;
        }
    },

    getFirstDateOfUpcomingQuarter(month: number, year: number): Date {
        let currentQuarter = Math.ceil(month / 3);
        let upcomingQuarter = currentQuarter + 1;

        if (upcomingQuarter > 4) {
            upcomingQuarter = 1;
            year++;
        }

        let startMonth = (upcomingQuarter - 1) * 3 + 1;

        return new Date(year, startMonth - 1, 1); // JavaScript months are 0-based
    },

    async fetchSurveyReport(depotCodes: string[]) {
        logger.info('inside SurveyService -> fetchSurveyReport');
        const reportData: SurveyReport[] = [];
        try {
            const response = await SurveyModel.fetchCfaSurveyResponse(depotCodes);
            response?.forEach((element) => {
                //this can be used to set default values
                const record: SurveyReport = {
                    'Area Code': '',
                    'Depot Code': '',
                    'CFA Name': '',
                    'CFA Contact Person': '',
                    'CFA Email': '',
                    'CFA Mobile': '',
                    'DB Code': '',
                    'DB Name': '',
                    'DB Email': '',
                    Questions: '',
                    Feedback: '',
                    'Survey Start Date': '',
                    'Survey End Date': '',
                    'Response Date': '',
                    Remarks: '',
                    response: {},
                };
                record['Area Code'] = element?.area_code;
                record['Depot Code'] = element?.depot_code;
                record['CFA Name'] = element?.db_cfa_details['0']?.cfa_name;
                record['CFA Contact Person'] = element?.db_cfa_details['0']?.cfa_contact_person;
                record['CFA Email'] = element?.db_cfa_details['0']?.cfa_email;
                record['CFA Mobile'] = element?.db_cfa_details['0']?.cfa_mobile;
                record['DB Code'] = element?.db_code;
                record['DB Name'] = element?.db_cfa_details['0']?.customer?.split('(')[0]?.trim();
                record['DB Email'] = element?.db_cfa_details['0']?.customer_email;
                record['Survey Start Date'] = commonHelper.formatDate(element?.survey_start);
                record['Survey End Date'] = commonHelper.formatDate(element?.survey_end);
                record['Response Date'] = commonHelper.formatDate(element?.updated_on);
                record['Remarks'] = element?.response?.comment;
                record.response = element?.response;
                reportData.push(record);
            });
            return reportData;
        } catch (err) {
            logger.error('Error in SurveyService -> fetchSurveyReport', err);
            return err;
        }
    },

    mapQuestionsWithFeedback(data: any) {
        const mapping = {};
        for (const key in data) {
            if (key.includes('q')) {
                const question = data[key];
                const feedback = data[`a${key.split('q')[1]}`];
                mapping[`${key.split('q')[1]}`] = { question, feedback };
            }
        }
        return mapping;
    },

    async fetchSurveyReportStatistics(areaCodes: string[], zones: string[], limit: number | string, offset: number | string, headerFilter: any) {
        logger.info('inside SurveyService -> fetchSurveyReportStatistics');
        try {
            const response = await SurveyModel.fetchSurveyReportStatistics(areaCodes, zones, limit, offset, headerFilter);
            if (!response?.length) return null;
            response.forEach((element) => {
                let feedbackSum = 0;
                let feedbackCount = 0;
                if (element.db_response) {
                    const dbResponseKeys = Object.keys(element.db_response);
                    element.db_response_count = dbResponseKeys.length; //total number of DBs responded
                    dbResponseKeys.forEach((db_code) => {
                        const db = element.db_response[db_code];
                        const dbKeys = Object.keys(db);
                        dbKeys.forEach((key) => {
                            if (key.includes('a')) {
                                feedbackSum += +db[key];
                                feedbackCount++;
                            }
                        });
                    });
                    const avg = (feedbackSum / feedbackCount).toFixed(2);
                    element.avg_score = isNaN(+avg) || avg == null ? 0 : avg;
                } else {
                    element.db_response_count = 0;
                    element.avg_score = 0;
                }
                delete element.db_response;
            });
            return response;
        } catch (err) {
            logger.error('Error in SurveyService -> fetchSurveyReportStatistics', err);
            return err;
        }
    },

    async fetchActivePlantDistributors() {
        return await SurveyModel.fetchActivePlantDistributors();
    },

    async saveSurveyLink(survey_start: string, survey_end: string, survey_link: string) {
        return await SurveyModel.saveSurveyLink(survey_start, survey_end, survey_link);
    },

    async saveSurveyResponse(
        questionnaire_id: number,
        db_code: string,
        survey_start: string,
        survey_end: string,
        response: object = {},
        updated_by: string = '',
        db_cfa_details: object = {},
    ) {
        return await SurveyModel.saveSurveyResponse(questionnaire_id, db_code, survey_start, survey_end, response, updated_by, db_cfa_details);
    },
    async saveNocResponse(distributor_id: number, agreement_status: string) {
        logger.info('inside SurveyService -> saveNocResponse');
        try {
            const response = await SurveyModel.saveNocResponse(distributor_id, agreement_status);
            return response;
        } catch (error) {
            throw error;
        }
    },

    async fetchDistributorAgreements(limit: number, offset: number, status: string, search: string) {
        logger.info('inside SurveyService -> fetchDistributorAgreements');
        try {
            const response = await SurveyModel.fetchDistributorAgreements(limit, offset, status, search);
            return response;
        } catch (error) {
            throw error;
        }
    },

    async fetchDistributorIDs() {
        logger.info('inside SurveyService -> fetchDistriubtorIDs');
        try {
            const response = await SurveyModel.fetchDistributorIDs();
            return response;
        } catch (error) {
            throw error;
        }
    },

    async submitSurvey(surveyData: { db_code: string; accountingSoftware: string; otherSoftware: string; version: string }) {
        const { db_code, accountingSoftware, otherSoftware, version } = surveyData;
        logger.info('inside SurveyService -> submitSurvey');
        try {
            const responseJson = JSON.stringify({
                accountingSoftware,
                otherSoftware,
                version,
            });
            const response = await SurveyModel.submitSurvey(db_code, responseJson);
            return response;
        } catch (error) {
            logger.error('Error in SurveyService -> submitSurvey', error);
        }
    },

    async getSurveyResponses() {
        logger.info('inside SurveyService -> getSurveyResponses');
        try {
            const response = await SurveyModel.getSurveyResponses();
            return response;
        } catch (error) {
            throw error;
        }
    },
};
