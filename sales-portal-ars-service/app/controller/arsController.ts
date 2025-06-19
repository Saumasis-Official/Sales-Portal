import { Request, Response } from 'express';
import logger from '../lib/logger';
import { ArsService } from '../service/ars.service';
import Template from '../helper/responseTemplate';
import { SuccessMessage } from '../constants/successMessage';
import { ErrorMessage } from '../constants/errorMessage';
import { LogService } from '../service/logService';
import ResultNotFound from '../lib/ResultNotFound';
// import { ArsWorkflowTestLogs } from '../helper/ArsWorkflowLogs';
import Helper from '../helper';

// const arsWorkflowLogs = ArsWorkflowTestLogs.getInstance();
// const arsWorkflowLogs = ArsWorkflowTestLogs.getInstance();
let isDLPSyncRunning = false;

export const ArsController = {
    async getRegionalBrandVariants(req: Request, res: Response) {
        logger.info('inside ArsController -> getRegionalBrandVariants');
        const { areaCode } = req.body;
        try {
            const result = await ArsService.getRegionalBrandVariants(areaCode);
            if (result) {
                logger.info('RESULT getRegionalBrandVariants -> status: SUCCESS');
                return res.status(200).json(Template.success({ rows: result.rows, rowCount: result.rowCount }, SuccessMessage.GET_BRAND_VARIANT_LIST));
            }
            return res.status(200).json(Template.error(ErrorMessage.BRAND_VARIANT_LIST_ERROR, '', result));
        } catch (error) {
            logger.error('Error in ArsController -> getRegionalBrandVariants ', error);
            return res.status(500).json(Template.error(ErrorMessage.BRAND_VARIANT_LIST_ERROR, error));
        }
    },

    async getForecastData(req: Request, res: Response) {
        logger.info('inside ArsController -> getForecastData');
        const { areaCode, brandVariantCode } = req.body;
        try {
            const result = await ArsService.getForecastData(areaCode, brandVariantCode);
            return result
                ? res.status(200).json(Template.success(result, SuccessMessage.GET_FORECAST))
                : res.status(200).json(Template.error(ErrorMessage.GET_FORECAST_ERROR, '', result));
        } catch (error) {
            logger.error('Error in ArsController -> getForecastData');
            return res.status(400).json(Template.error(ErrorMessage.GET_FORECAST_ERROR, error));
        }
    },

    async getRegionalBrands(req: Request, res: Response) {
        logger.info('inside ArsController -> getRegionalBrands');
        const { areaCode } = req.body;
        try {
            const result = await ArsService.getRegionalBrands(areaCode);
            if (result) {
                logger.info('RESULT ArsController -> getRegionalBrands, status: SUCCESS');
                return res.status(200).json(Template.success({ rows: result.rows, rowCount: result.rowCount }, SuccessMessage.GET_REGIONAL_BRAND_LIST));
            }
            return res.status(200).json(Template.error(ErrorMessage.REGIONAL_BRAND_LIST_ERROR, '', result));
        } catch (error) {
            logger.error('Error in ArsController -> getRegionalBrands, Error: ', error);
            return res.status(500).json(Template.error());
        }
    },

    async updateForecastData(req: Request, res: Response) {
        logger.info('inside ArsController -> updateForecastData');
        const { areaCode } = req.body;
        const { user_id } = req.user;
        try {
            ArsService.upsertForecastDistribution(areaCode, req.body);
            const result = await ArsService.updateForecastData(req.body, user_id);
            if (result) {
                logger.info('result ArsController -> updateForecastData, status: SUCCESS');
                return res.status(200).json(Template.success(result, SuccessMessage.UPDATE_FORECAST));
            }
            return res.status(200).json(Template.error(ErrorMessage.UPDATE_FORECAST, '', result));
        } catch (error) {
            logger.error('Error in ArsController -> updateForecastData', error);
            return res.status(400).json(Template.error(ErrorMessage.UPDATE_FORECAST, error));
        }
    },
    async fetchForecastConfigurations(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchForecastConfigurations');
        const { areaCode, applicableMonth, nextApplicableMonth } = req.body;
        try {
            const forecastConfigurations = await ArsService.fetchForecastConfigurations(areaCode, applicableMonth, nextApplicableMonth);
            if (forecastConfigurations) {
                logger.info('If success fetchForecastConfigurations', forecastConfigurations);
                return res.status(200).json(Template.success({ rows: forecastConfigurations }, SuccessMessage.FORECAST_CONFIGURATION_LIST_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.FORECAST_CONFIGURATIONS_LIST_ERROR));
        } catch (error) {
            logger.error(`error  in ArsController -> fetchForecastConfigurations ${error}`);
            return res.status(500).json(Template.error());
        }
    },
    async updateForecastConfiguration(req: Request, res: Response) {
        logger.info('inside ArsController -> updateForecastConfiguration');
        const { roles, user_id } = req.user;
        try {
            const response = await ArsService.updateForecastConfiguration(user_id, roles, req.body);
            if (response) {
                return res.status(200).json(Template.successMessage(SuccessMessage.FORECAST_CONFIGURATION_UPDATE_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.FORECAST_CONFIGURATION_UPDATE_ERROR));
        } catch (error) {
            logger.error('Error in ArsController -> updateForecastConfiguration', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.FORECAST_CONFIGURATION_UPDATE_ERROR));
        }
    },

    async getForecastSummaryData(req: Request, res: Response) {
        logger.info('Inside ArsController -> getForecastSummaryData');
        const { areaCode, search, limit, offset } = req.body;
        const { quantity_norm_flag = false } = req.query;
        try {
            const result = await ArsService.getForecastSummaryData(areaCode, search, limit, offset, !!quantity_norm_flag);
            if (result) {
                logger.info(`Inside ArsController -> getForecastSummaryData , Result Status: SUCCESS, RowCount: ${result.rowCount}`);
                return res.status(200).json(Template.success(result, SuccessMessage.GET_FORECAST_SUMMARY));
            }
            logger.info('Inside ArsController -> getForecastSummaryData , Result Status: FAILURE');
            return res.status(200).json(Template.error(ErrorMessage.GET_FORECAST_SUMMARY_ERROR, '', result));
        } catch (error) {
            logger.error('Inside ArsController -> getForecastSummaryData , Error : ', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },
    async fetchLastForecastDate(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchLastForecastDate');
        const { areaCode } = req.body;
        try {
            const lastForecastDate = await ArsService.fetchLastForecastDate(areaCode);
            if (lastForecastDate) {
                logger.info('last forecast data = ' + lastForecastDate?.rows[0]?.date);
                return res.status(200).json(
                    Template.success(
                        {
                            lastForecastDate: lastForecastDate?.rows[0]?.date,
                            forecast_month: lastForecastDate?.rows[0]?.forecast_month,
                        },
                        SuccessMessage.LAST_FORECAST_DATE,
                    ),
                );
            }
            return res.status(200).json(Template.error(ErrorMessage.LAST_FORECAST_DATE_ERROR));
        } catch (error) {
            logger.error('Error in ArsController -> fetchLastForecastDate', error);
            return res.status(400).json(Template.error(ErrorMessage.LAST_FORECAST_DATE_ERROR, '', error));
        }
    },

    async submitForecastData(req: Request, res: Response) {
        logger.info('inside ArsController -> submitForecastData');
        const { areaCode } = req.body;
        const { user_id } = req.user;
        try {
            const result = await ArsService.submitForecastData(areaCode, user_id);
            const response = await ArsService.fetchUpdatedForecast(areaCode);
            if (result) {
                logger.info('RESULT ArsController -> submitForecastData, status: SUCCESS');
                return res.status(200).json(Template.success({ rowsInserted: result, rows: response }, SuccessMessage.SUBMIT_FORECAST));
            }
            return res.status(200).json(Template.error(ErrorMessage.SUBMIT_FORECAST, '', result));
        } catch (error) {
            logger.error('Error in ArsController -> submitForecastData, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },
    async fetchSuggestedMaterials(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchSuggestedMaterials');
        try {
            const body = req.body;
            const distId = body.distributor_code ? body.distributor_code : req.user.login_id;
            // Do validate the distributor id
            if (distId == undefined || distId == null || distId == 0) {
                const message = ErrorMessage.VALIDATION_ERRORS.replace('#', 'Distributor ID');
                return res.status(400).json(Template.error(message));
            }
            const division = body.divisions ? body.divisions : [];
            // Do validate the divsions
            if (division && division.length <= 0) {
                const message = ErrorMessage.VALIDATION_ERRORS.replace('#', 'Divisions');
                return res.status(400).json(Template.error(message));
            }

            //Call the service to fetch suggested materials
            const response = await ArsService.getSuggestedMaterials(distId, division);
            if (response === ErrorMessage.STOCK_NORM_NOT_DEFINED) {
                return res.status(400).json(Template.errorMessage(response));
            } else if (typeof response === 'object') {
                return res.status(200).json(Template.success(response?.finalArray));
            }
            return res.status(200).json(Template.success(response));
        } catch (error) {
            logger.error('Error in ArsController -> fetchSuggestedMaterials', error);
            return res.status(500).json(Template.error(ErrorMessage.SUGGESTED_MATERIAL_FETCH_ERROR));
        }
    },

    async updateForecastDistribution(req: Request, res: Response) {
        logger.info('inside ArsController -> updateForecastDistribution');
        try {
            const { area_code = null } = req.body;
            const result = await ArsService.updateForecastDistribution(area_code);
            if (result) return res.status(200).json(Template.successMessage());
            return res.status(400).json(Template.error());
        } catch (error) {
            logger.error('Error in ArsController -> updateForecastDistribution', error);
            return res.status(500).json(Template.error());
        }
    },

    async stockData(req: Request, res: Response) {
        logger.info('inside ArsController -> stockData');
        try {
            const { dbCode, psku, docType } = req.body;
            const result = await ArsService.stockData(dbCode, psku, docType);
            if (result) return res.status(200).json(Template.success(result, SuccessMessage.GET_STOCK_DATA));
            return res.status(200).json(Template.error(ErrorMessage.GET_STOCK_FAILURE, '', []));
        } catch (error) {
            logger.error('Error in ArsController -> stockData , Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },
    async autoSubmitForecastData(req: Request, res: Response) {
        logger.info('inside ArsController -> autoSubmitForecastData');
        const { forecast_sync = false } = req.query;
        try {
            // removing await so that sales-portal-ars-allocation service don't wait for this service to complete
            ArsService.autoSubmitForecastData(!!forecast_sync);
            logger.info('RESULT ArsController -> autoSubmitForecastData, status: SUCCESS');
            return res.status(200).json(Template.successMessage(SuccessMessage.SERVICE_RUNNING_IN_BACKGROUND));
        } catch (error) {
            logger.error('Error in ArsController -> autoSubmitForecastData, Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async forecastDumpValidation(req: Request, res: Response) {
        logger.info('inside ArsController -> forecastDumpValidation');
        try {
            // removing await so that sales-portal-ars-allocation service don't wait for this service to complete
            ArsService.forecastDumpValidation();
            return res.status(200).json({
                status: 'True',
                message: 'Service running in background.Forecast dump validation report email will be sent',
            });
        } catch (error) {
            logger.error('Error in ArsController -> forecastDumpValidation', error);
            return res.status(500).json({ status: false, message: 'Could not send report' });
        }
    },

    async autoOrderReportEmail(req: Request, res: Response) {
        logger.info('inside ArsController -> autoOrderReportEmail');
        try {
            ArsService.autoOrderReportEmail();
            return res.status(200).json({ status: 'True', message: 'Auto Order Report sent!' });
        } catch (error) {
            logger.error('Error in ArsController -> autoOrderReportEmail');
            LogService.insertSyncLog('ARS_ORDER_REPORT', 'FAIL', null, null, `${error}`, true);
            return res.status(500).json({
                status: 'False',
                message: 'Auto Order Report could not be sent!',
            });
        }
    },

    async sihSsEmailCheck(req: Request, res: Response) {
        logger.info('inside ArsController -> sihSsEmailCheck');
        try {
            const result = await ArsService.safetyStockCheck();
            if (result) {
                LogService.insertSyncLog('ARS_STOCK_HOLDING_NOTIFICATION', 'SUCCESS', null, null, null, true);
                return res.status(200).json(Template.success(result, SuccessMessage.SIH_SS_CHECK));
            } else {
                logger.error('inside ArsController -> sihSsEmailCheck, Error: sihSsCheck service method returned false');
                LogService.insertSyncLog('ARS_STOCK_HOLDING_NOTIFICATION', 'FAIL', null, null, `${ErrorMessage.SIH_SS_CHECK}`, true);
                return res.status(500).json(Template.errorMessage(ErrorMessage.SIH_SS_CHECK));
            }
        } catch (error) {
            logger.error('inside ArsController -> sihSsEmailCheck, Error: ', error);
            LogService.insertSyncLog('ARS_STOCK_HOLDING_NOTIFICATION', 'FAIL', null, null, `${error}`, true);
            return res.status(500).json(Template.internalServerError());
        }
    },

    async downloadForecastSummary(req: Request, res: Response) {
        logger.info('inside ArsController -> downloadForecastSummary');
        try {
            const areaCode = req.query.area?.toString() || 'ALL';
            const { roles = '', user_id = '', code = '' } = req.user || {};

            const result = await ArsService.downloadForecastSummary(areaCode, user_id, roles, code);
            if (result) return res.status(200).json(Template.success(result, SuccessMessage.FORECAST_DOWNLOAD));
            return res.status(200).json(Template.errorMessage(ErrorMessage.FORECAST_DOWNLOAD));
        } catch (error) {
            logger.error('Error in ArsController -> downloadForecastSummary , Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },
    async fetchStockLevelSyncStatus(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchStockLevelSyncStatus');
        try {
            const response = await ArsService.fetchStockLevelSyncStatus();
            if (response) return res.status(200).json(Template.success(response));
            return res.status(200).json(Template.error(ErrorMessage.GET_STOCK_LEVEL_SYNC_STATUS));
        } catch (error) {
            logger.error('Error in ArsController -> fetchStockLevelSyncStatus: ', error);
            return res.status(500).json(Template.error(ErrorMessage.GET_STOCK_LEVEL_SYNC_STATUS));
        }
    },

    async fetchSkuStockData(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchSkuStockData');
        try {
            const { distributor_code, sku, docType } = req.body;
            const response = await ArsService.fetchSkuStockData(distributor_code, sku, docType);
            if (response)
                return res.status(200).json(
                    Template.success({
                        rows: response,
                        message: SuccessMessage.SKU_STOCK_DATA,
                    }),
                );
            return res.status(200).json(Template.error(ErrorMessage.SKU_STOCK_DATA));
        } catch (error) {
            if (error instanceof ResultNotFound) {
                return res.status(200).json(Template.error(error.message));
            }
            logger.error('inside ArsController -> fetchSkuStockData', error);
            return res.status(500).json(Template.error());
        }
    },

    async arsAutoSubmit(req: Request, res: Response) {
        logger.info('inside ArsController -> arsAutoSubmit');
        try {
            const { holdings, distributor_code, id } = req.body;
            const result = await ArsService.arsAutoSubmit(id, distributor_code, holdings);
            return res.status(200).json(Template.success(result, SuccessMessage.ARS_AUTO_SUBMIT));
        } catch (error) {
            logger.error('Caught error in ArsController -> arsAutoSubmit', error);
            return res.status(500).json(Template.error(ErrorMessage.ARS_AUTO_SUBMIT));
        }
    },

    async automatedArsValidation(req: Request, res: Response) {
        logger.info('inside ArsController -> automatedArsValidation');
        if (isDLPSyncRunning) {
            return res.status(200).json(Template.error(ErrorMessage.SERVICE_ALREADY_RUNNING));
        }
        try {
            isDLPSyncRunning = true;
            const { area_codes = [] } = req.body;
            const { month = null } = req.query;
            ArsService.automatedARSValidationSAP(area_codes, month?.toString()).then(() => (isDLPSyncRunning = false));
            return res.status(200).json(Template.successMessage('Service has started in the backend'));
        } catch (error) {
            logger.error('Caught Error in ArsController -> automatedArsValidation', error);
            isDLPSyncRunning = false;
            return res.status(500).json(Template.error(ErrorMessage.SERVICE_ALREADY_RUNNING));
        }
    },

    async getMoqMappingData(req: Request, res: Response) {
        logger.info('inside ArsController -> getMoqMappingData');
        try {
            const { roles, email } = req.user;
            const { search, limit, offset, area } = req.body;
            const response = await ArsService.getMoqMappingData(area, search, roles, email, limit, offset);
            if (response) return res.status(200).json(Template.success(response, SuccessMessage.MOQ_MAPPING_DATA));
            return res.status(200).json(Template.error(ErrorMessage.MOQ_MAPPING_DATA));
        } catch (error) {
            logger.error('inside ArsController -> getMoqMappingData, Error: ', error);
            return res.status(500).json(Template.error());
        }
    },

    async updateMoq(req: Request, res: Response) {
        logger.info('inside ArsController -> updateMoq');
        try {
            // const { roles } = req.user;
            const { moq_data } = req.body;
            const response = await ArsService.updateMoq(moq_data, req.user);
            if (response) return res.status(200).json(Template.successMessage(SuccessMessage.MOQ_UPDATE));
            return res.status(200).json(Template.error(ErrorMessage.MOQ_UPDATE));
        } catch (error) {
            logger.error('inside ArsController -> updateMoq, Error: ', error);
            return res.status(500).json(Template.error());
        }
    },

    async getDistributorMoq(req: Request, res: Response) {
        logger.info('inside ArsController -> getMoqMappingData');
        try {
            const { dbCode, plantCodes } = req.body;

            const response = await ArsService.getDistributorMoq(dbCode, plantCodes);
            if (response) return res.status(200).json(Template.success(response, SuccessMessage.DISTRIBUTOR_MOQ_DATA));
            return res.status(200).json(Template.error(ErrorMessage.DISTRIBUTOR_MOQ_DATA));
        } catch (error) {
            logger.error('inside ArsController -> getDistributorMoq, Error: ', error);
            return res.status(500).json(Template.error());
        }
    },

    async getStockNormAudit(req: Request, res: Response) {
        logger.info('inside ArsController -> getStockNormAudit');
        try {
            const { cg } = req.params;
            const { user_id, roles } = req['user'];
            const { offset, limit, ars_db, distId } = req.body;
            const result = await ArsService.getStockNormAudit(user_id, roles, cg, ars_db == true, offset, limit, distId);
            return res.status(200).json(Template.success(result));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> getStockNormAudit', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async updateStockNormConfig(req: Request, res: Response) {
        logger.info('inside ArsController -> updateStockNormConfig');
        try {
            const { update } = req.body;
            const { user_id } = req.user;

            const result = await ArsService.updateStockNormConfig(update, user_id);
            if (result) return res.status(200).json(Template.success(result));
            else return res.status(200).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> updateStockNormConfig', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async syncStockNorm(req: Request, res: Response) {
        const { month = Helper.applicableMonth('next') } = req.query;
        logger.info(`inside ArsController -> syncStockNorm: applicable_month: ${month}`);
        try {
            ArsService.syncStockNormConfig(month.toString());
            return res.status(200).json(Template.successMessage('Sync stock norm running in background...'));
        } catch (error) {
            logger.error('CAUGHT Error in ArsController -> syncStockNorm', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async getStockNormDefault(req: Request, res: Response) {
        logger.info('inside ArsController -> getStockNormDefault');
        try {
            const { cg } = req.params;
            const result = await ArsService.getStockNormDefault(cg);
            return res.status(200).json(Template.success(result));
        } catch (error) {
            logger.error('CAUGHT Error in ArsController -> getStockNormDefault', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async updateStockNormDefault(req: Request, res: Response) {
        logger.info('inside ArsController -> updateStockNormDefault');
        try {
            const { customerGroup, update } = req.body;
            const { user_id } = req.user;
            Object.assign(update, { updated_by: user_id });
            const result = await ArsService.updateStockNormDefault(customerGroup, update);
            return res.status(200).json(Template.success(result));
        } catch (error) {
            logger.error('CAUGHT Error in ArsController -> updateStockNormDefault', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async getAllArsTolerance(req: Request, res: Response) {
        logger.info('inside ArsController -> getAllArsTolerance');
        try {
            const { cg } = req.params;
            const result = await ArsService.getAllArsTolerance(cg);
            if (result) return res.status(200).json(Template.success(result));
            return res.status(400).json(Template.error(ErrorMessage.GET_ALL_ARS_TOLERANCE));
        } catch (error) {
            logger.error('CAUGHT Error in ArsController -> getAllArsTolerance', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async getArsTolerance(req: Request, res: Response) {
        logger.info('inside ArsController -> getArsTolerance');
        try {
            const { cg, areaCode } = req.params;
            const result = await ArsService.getArsTolerance(cg, areaCode);
            if (result) return res.status(200).json(Template.success(result));
            return res.status(400).json(Template.error(ErrorMessage.GET_ARS_TOLERANCE));
        } catch (error) {
            logger.error('CAUGHT Error in ArsController -> getArsTolerance', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async updateArsTolerance(req: Request, res: Response) {
        logger.info('inside ArsController -> updateArsTolerance');
        try {
            const { data } = req.body;
            const { user_id } = req.user;
            const result = await ArsService.updateArsTolerance(data, user_id);
            if (result) return res.status(200).json(Template.success(result));
            return res.status(400).json(Template.error(ErrorMessage.UPDATE_ARS_TOLERANCE));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> updateArsTolerance', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async testFetchSuggestedMaterials(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchSuggestedMaterials');
        try {
            const { distributor_code, divisions, applicable_month, next_applicable_month, simulation_date } = req.body;

            //Call the service to fetch suggested materials
            const response = await ArsService.getSuggestedMaterials(distributor_code, divisions, applicable_month, next_applicable_month, simulation_date);
            if (typeof response === 'object') {
                return res.status(200).json(Template.success(response?.arsWorkflowLogs));
            } else {
                return res.status(200).json(Template.success(response));
            }
        } catch (error) {
            logger.error('Error in ArsController -> fetchSuggestedMaterials', error);
            return res.status(500).json(Template.error(ErrorMessage.SUGGESTED_MATERIAL_FETCH_ERROR));
        }
    },

    async sendForecastWindowNotification(req: Request, res: Response) {
        logger.info('inside ArsController -> sendForecastWindowNotification');
        try {
            const result = await ArsService.sendForecastWindowNotification();
            if (result) return res.status(200).json(Template.successMessage(SuccessMessage.ARS_WINDOW_NOTIFICATION));
            return res.status(200).json(Template.errorMessage(ErrorMessage.ARS_WINDOW_NOTIFICATION));
        } catch (error) {
            logger.error('Error in ArsController -> sendForecastWindowNotification , Error: ', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async getExcludedMaterials(req: Request, res: Response) {
        logger.info('inside ArsController -> getExcludedMaterials');
        try {
            const { distributor_code } = req.body;
            const result = await ArsService.getExcludedMaterials(distributor_code);
            return res.status(200).json(Template.success(result, SuccessMessage.GET_EXCLUDED_MATERIALS));
        } catch (error) {
            logger.error('Error in ArsController -> getExcludedMaterials', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async updateQuantityNorm(req: Request, res: Response) {
        logger.info('inside ArsController -> updateQuantityNorm');
        try {
            const { user_id } = req.user;
            const result = await ArsService.updateQuantityNorm(req.body, user_id);
            if (result) return res.status(200).json(Template.successMessage(SuccessMessage.UPDATE_QUANTITY_NORM));
            return res.status(200).json(Template.errorMessage(ErrorMessage.UPDATE_QUANTITY_NORM));
        } catch (error) {
            logger.error('Error in ArsController -> updateQuantityNorm', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async uploadForecastExcel(req: Request, res: Response) {
        try {
            const file = req['file'];
            const response = await ArsService.uploadForecastExcel(file, req.user);
            return res.status(200).json(response);
        } catch (e) {
            logger.error('CAUGHT: Error in ArsController -> uploadForecastExcel', e);
            return res.status(500).json(Template.error(ErrorMessage.EXCEL_UPLOAD_FAILURE));
        }
    },
    async downloadDlpReport(req: Request, res: Response) {
        try {
            const response = await ArsService.downloadDlpReport();
            return res.status(200).json(response);
        } catch {
            logger.error('CAUGHT: Error in ArsController -> downloadDlpReport');
            return res.status(500).json(Template.error('Failed to download DLP report'));
        }
    },

    async stockNormDbFilter(req: Request, res: Response) {
        try {
            const { ao_enabled, cg } = req.query;
            const response = await ArsService.stockNormDbFilter(ao_enabled == 'true', cg as string);
            return res.status(200).json(Template.success(response, SuccessMessage.FETCH_STOCK_NORM_DISTRIBUTOR_FILTER_SUCCESS));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> stockNormDbFilter', error);
            return res.status(500).json(Template.error(ErrorMessage.STOCK_NORM_DISTRIBUTOR_FETCH_FAILURE));
        }
    },

    async quantityNormSync(req: Request, res: Response) {
        try {
            ArsService.quantityNormSync();
            return res.status(200).json(Template.successMessage('Quantity norms sync started. Job running in background...'));
        } catch {
            logger.error('CAUGHT: Error in ArsController -> quantityNormSync');
            return res.status(500).json(Template.error(ErrorMessage.QUANTITY_NORM_SYNC_ERROR));
        }
    },

    async syncForecastTotal(req: Request, res: Response) {
        try {
            const { applicable_month } = req.query;
            ArsService.syncForecastTotal(applicable_month as string);
            return res.status(200).json(Template.successMessage('Forecast total sync started. Job running in background...'));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> syncForecastTotal', error);
            return res.status(500).json(Template.error(ErrorMessage.FORECAST_TOTAL_SYNC));
        }
    },

    async upsertSoqNorms(req: Request, res: Response) {
        try {
            const { data } = req.body;
            const { user_id } = req.user;
            const result = await ArsService.upsertSoqNorms(data, user_id);
            if (result) return res.status(200).json(Template.successMessage(SuccessMessage.UPSERT_SOQ_NORMS));
            return res.status(200).json(Template.errorMessage(ErrorMessage.UPSERT_SOQ_NORMS));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> upsertSoqNorms', error);
            return res.status(500).json(Template.error(ErrorMessage.UPSERT_SOQ_NORMS));
        }
    },

    async fetchAllSoqNorms(req: Request, res: Response) {
        try {
            const result = await ArsService.fetchAllSoqNorms();
            if (result) return res.status(200).json(Template.success(result, SuccessMessage.FETCH_SOQ_NORMS));
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_SOQ_NORMS));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> fetchAllSoqNorms', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchSoqNormsDivisionList(req: Request, res: Response) {
        try {
            const result = await ArsService.fetchSoqNormsDivisionList();
            if (result) return res.status(200).json(Template.success(result, SuccessMessage.FETCH_SOQ_NORMS_DIVISION_LIST));
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_SOQ_NORMS_DIVISION_LIST));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> fetchSoqNormsDivisionList', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async deleteSoqNorm(req: Request, res: Response) {
        try {
            const { user_id } = req.user;
            const { division } = req.params;
            const result = await ArsService.deleteSoqNorm(division, user_id);
            if (result) return res.status(200).json(Template.successMessage(SuccessMessage.DELETE_SOQ_NORM));
            return res.status(200).json(Template.errorMessage(ErrorMessage.DELETE_SOQ_NORM));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> deleteSoqNorm', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },
    async fetchToleranceExcludedPskus(req: Request, res: Response) {
        try {
            logger.info('inside ArsController -> fetchToleranceExcludedPskus');
            const response = await ArsService.fetchToleranceExcludedPskus();
            if (response) {
                logger.info('inside ArsController -> fetchToleranceExcludedPskus, status: SUCCESS');
                return res.status(200).json(Template.success(response, SuccessMessage.FETCH_TOLERANCE_EXCLUDED_PSKUS));
            }
            logger.info('inside ArsController -> fetchToleranceExcludedPskus, status: FAILURE');
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_TOLERANCE_EXCLUDED_PSKUS));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> fetchToleranceExcludedPskus', error);
            return res.status(500).json(Template.internalServerError());
        }
    },

    async fetchMaterialList(req: Request, res: Response) {
        try {
            logger.info('inside ArsController -> fetchMaterialList');
            const response = await ArsService.fetchMaterialList();
            if (response) {
                logger.info('inside ArsController -> fetchMaterialList, status: SUCCESS');
                return res.status(200).json(Template.success(response, SuccessMessage.FETCH_MATERIALS_LIST));
            }
            logger.info('inside ArsController -> fetchMaterialList, status: FAILURE');
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_MATERIALS_LIST));
        } catch (error) {
            logger.error('inside ArsController -> fetchMaterialList, Error: ', error);
            return res.status(500).json(Template.internalServerError());
        }
    },

    async updateToleranceExcludedPskus(req: Request, res: Response) {
        logger.info('inside ArsController -> updateToleranceExcludedPskus');
        try {
            const { user_id, roles } = req.user;
            const { pskus } = req.body;
            const response = await ArsService.updateToleranceExcludedPskus(pskus, roles, user_id);
            if (response) {
                logger.info('inside ArsController -> updateToleranceExcludedPskus, status: SUCCESS');
                return res.status(200).json(Template.success(response, SuccessMessage.UPDATE_TOLERANCE_EXCLUDED_PSKUS));
            }
            logger.info('inside ArsController -> updateToleranceExcludedPskus, status: FAILURE');
            return res.status(200).json(Template.errorMessage(ErrorMessage.UPDATE_TOLERANCE_EXCLUDED_PSKUS));
        } catch (error) {
            logger.error('inside ArsController -> updateToleranceExcludedPskus, Error: ', error);
            return res.status(500).json(Template.internalServerError());
        }
    },

    async arsTentativeOrder(req: Request, res: Response) {
        logger.info('inside ArsController -> arsTentativeOrder');
        try {
            ArsService.arsTentativeOrder();
            return res.status(200).json(Template.successMessage('Tentative order service started in background'));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> arsTentativeOrder', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async skuSoqNormSync(req: Request, res: Response) {
        logger.info('inside ArsController -> skuSoqNormSync');
        try {
            const { user_id } = req.user;
            const response = await ArsService.uploadSkuSoqNormSync(req['file'], user_id);
            return res.status(200).json(response);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> skuSoqNormSync', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async uploadDBCensusCustomerGroup(req: Request, res: Response) {
        try {
            const { user_id } = req.user;
            const response = await ArsService.uploadDBCensusCustomerGroup(req['file'], user_id);
            return res.status(200).json(response);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> uploadDBCensusCustomerGroup', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async skuSoqNormDownload(req: Request, res: Response) {
        logger.info('inside ArsController -> skuSoqNormDownload');
        try {
            const result = await ArsService.skuSoqNormDownload();
            if (result) return res.status(200).json(Template.success(result, SuccessMessage.SKU_SOQ_NORM_DOWNLOAD));
            return res.status(400).json(Template.errorMessage(ErrorMessage.SKU_SOQ_NORM_DOWNLOAD));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> skuSoqNormDownload', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async distributorCensusCustomerGroupDownload(req: Request, res: Response) {
        logger.info('inside ArsController -> distributorCensusCustomerGroupDownload');
        try {
            const result = await ArsService.distributorCensusCustomerGroupDownload();
            if (result) return res.status(200).json(Template.success(result, SuccessMessage.DISTRIBUTOR_CENSUS_CUSTOMER_GROUP_DOWNLOAD));
            return res.status(400).json(Template.errorMessage(ErrorMessage.DISTRIBUTOR_CENSUS_CUSTOMER_GROUP_DOWNLOAD));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> distributorCensusCustomerGroupDownload', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async saveForecastData(req: Request, res: Response) {
        try {
            logger.info('inside ArsController -> saveForecastData');
            const currentDateQuery = req?.query?.current_date as unknown;
            const currentDate = typeof currentDateQuery === 'string' ? currentDateQuery.toLowerCase() === 'true' : undefined;
            const debugQuery = req?.query?.debug as unknown;
            const debug = typeof debugQuery === 'string' ? debugQuery.toLowerCase() === 'true' : false;
            if (!debug) {
                ArsService.saveForecastFileData(currentDate);
                return res.status(200).json(Template.successMessage('Service running in background'));
            }
            const response = await ArsService.saveForecastFileData(currentDate);
            if (response) {
                logger.info('inside ArsController -> saveForecastData, forecast files fetched from S3 and data saved successfully');
                return res.status(200).json(response);
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.FORECAST_DATA_UPDATE));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> saveForecastData', error);
            return res.status(500).json(Template.internalServerError());
        }
    },

    async uploadStockNorm(req: Request, res: Response) {
        logger.info('inside ArsController -> uploadStockNorm');
        try {
            const file = req['file'];
            const { user_id } = req['user'];
            const { is_class_level, to_overwrite } = req.query;
            const isClassLevel = is_class_level === 'true';
            const toOverwrite = to_overwrite === 'true';
            let response;
            if (isClassLevel) {
                response = await ArsService.uploadClassLevelStockNorm(file, user_id, toOverwrite);
            } else {
                response = await ArsService.uploadStockNorm(file, user_id);
            }
            return res.status(200).json(response);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> uploadStockNorm', error);
            return res.status(500).json(Template.internalServerError());
        }
    },

    async fetchArsConfigurations(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchArsConfigurations');
        try {
            const { configurations, keys, details } = req.body;
            const response = await ArsService.fetchArsConfigurations(configurations, keys, details);
            if (response) return res.status(200).json(Template.success(response, SuccessMessage.FETCH_ARS_CONFIGURATIONS));
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_ARS_CONFIGURATIONS));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> fetchArsConfigurations', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async updateArsConfigurations(req: Request, res: Response) {
        logger.info('inside ArsController -> updateArsController');
        try {
            const { data } = req.body;
            const { user_id } = req.user;
            const response = await ArsService.updateArsConfiguration(data, user_id);
            return res.status(200).json(Template.success(response, SuccessMessage.UPDATE_ARS_CONFIGURATIONS));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> updateArsController', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchForecastDistribution(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchForecastDistribution');
        try {
            const { distributor_code, applicable_month, next_applicable_month } = req.body;
            const response = await ArsService.fetchForecastDistribution(distributor_code, applicable_month, next_applicable_month);
            if (response) return res.status(200).json(Template.success(response, SuccessMessage.FETCH_FORECAST_DISTRIBUTION));
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_FORECAST_DISTRIBUTION));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> fetchForecastDistribution', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchProductHierarchyFilter(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchProductHierarchyFilter');
        try {
            const { search, isPskuCode = false } = req.body;
            const response = await ArsService.fetchProductHierarchyFilter(search, isPskuCode);
            if (response) return res.status(200).json(Template.success(response, SuccessMessage.FETCH_PRODUCT_HIERARCHY_FILTER));
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_PRODUCT_HIERARCHY_FILTER));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> fetchProductHierarchyFilter', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async upsertDistributorPskuTolerance(req: Request, res: Response) {
        logger.info('inside ArsController -> upsertDistributorPskuTolerance');
        try {
            const { customer_groups, tse_codes, distributor_codes, product_hierarchy, psku, max, min } = req.body;
            const { user_id } = req.user;
            const response = await ArsService.upsertDistributorPskuTolerance(
                {
                    customer_groups,
                    tse_codes,
                    distributor_codes,
                    product_hierarchy,
                    psku,
                    max,
                    min,
                },
                user_id,
            );
            if (response) {
                if (typeof response === 'string') return res.status(200).json(Template.errorMessage(response));
                else return res.status(200).json(Template.success(response, SuccessMessage.UPSERT_DISTRIBUTOR_PSKU_TOLERANCE));
            } else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.UPSERT_DISTRIBUTOR_PSKU_TOLERANCE));
            }
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> upsertDistributorPskuTolerance', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchDistributorPskuTolerance(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchDistributorPskuTolerance');
        try {
            const { distributor_code, audit_details } = req.body;
            const response = await ArsService.fetchDistributorPskuTolerance(distributor_code, audit_details);
            if (response) return res.status(200).json(Template.success(response, SuccessMessage.FETCH_DISTRIBUTOR_PSKU_TOLERANCE));
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_DISTRIBUTOR_PSKU_TOLERANCE));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> fetchDistributorPskuTolerance', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async uploadRegionForecast(req: Request, res: Response) {
        try {
            const file = req['file'];
            const result = await ArsService.uploadRegionForecast(file, req['user']);
            if (result) return res.status(200).json(result);
            else return res.status(200).json(Template.errorMessage(ErrorMessage.EXCEL_UPLOAD_FAILURE));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> uploadRegionForecast', error);
            return res.status(500).json(Template.error(error.message));
        }
    },

    async allocationFromStaging(req: Request, res: Response) {
        logger.info('inside ArsController -> allocationFromStaging');

        try {
            ArsService.allocationFromStaging();
            return res.status(200).json(Template.successMessage('Moving adjusted forecast from staging, job running in the background...'));
        } catch (error) {
            logger.error('CAUGHT : Error in ArsController -> allocationFromStaging', error);
            return res.status(500).json(Template.errorMessage(error.message));
        }
    },

    async getMissingDBPskuCombination(req: Request, res: Response) {
        logger.info('inside ArsController -> getMissingDBPskuCombination');
        try {
            const { body } = req;
            const result = await ArsService.getMissingDBPskuCombination(body);
            return res.status(200).json(Template.success(result));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> getMissingDBPskuCombination', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchDbPSKUTolerance(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchDbPSKUTolerance');
        try {
            const { limit, offset, dbCode, cg, psku, pskuHierarchy, zoneArea } = req.body;
            const result = await ArsService.fetchDbPSKUTolerance(limit, offset, dbCode, cg, psku, pskuHierarchy, zoneArea);
            if (result) return res.status(200).json(Template.success(result));
            else return res.status(200).json(ErrorMessage.FETCH_DISTRIBUTOR_PSKU_TOLERANCE);
        } catch (error) {
            logger.error('CAUGHT : Error inside ArsController -> fetchDbPSKUTolerance', error);
            return res.status(500).json(ErrorMessage.FETCH_DISTRIBUTOR_PSKU_TOLERANCE);
        }
    },

    async deleteDbPSKUTolerance(req: Request, res: Response) {
        logger.info('Inside ArsController -> deleteDbPSKUTolerance');
        try {
            const { ids } = req.body;
            const result = await ArsService.deleteDbPSKUTolerance(ids);
            if (result) return res.status(200).json(Template.successMessage('Delete Successful'));
            return res.status(200).json(Template.errorMessage(ErrorMessage.DELETE_DB_PSKU_TOLERANCE));
        } catch (error) {
            logger.error('CUAGHT : Error in ArsController -> fetchDbPSKUTolerance', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.DELETE_DB_PSKU_TOLERANCE));
        }
    },

    async downloadStockNormAudit(req: Request, res: Response) {
        logger.info('inside ArsController -> downloadStockNormAudit');
        try {
            const { ars_db, distId } = req.body;
            const response = await ArsService.downloadStockNormAudit(ars_db, distId);
            if (response) {
                return res.status(200).json(Template.success(response, SuccessMessage.STOCK_NORM_AUDIT_DOWNLOAD));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.STOCK_NORM_AUDIT_DOWNLOAD));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> downloadStockNormAudit', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async aosSimulationReport(req: Request, res: Response) {
        logger.info('Inside ArsController -> aosSimulationReport');
        try {
            const { distributor_code, date } = req.body;
            const result = await ArsService.aosSimulationReport(distributor_code, date);
            return res.status(200).json(Template.success(result));
        } catch (error) {
            logger.error('CAUGHT : Error in ArsController -> aosSimulationReport', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async insertSyncLog(req: Request, res: Response) {
        logger.info('Inside ArsController -> insertSyncLog');
        try {
            const {
                type,
                result,
                upsertCount = null,
                deleteCount = null,
                configuration = null,
                distributorId = null,
                error = null,
                isCronJob = false,
                executionTime = null,
            } = req.body;
            const syncLogResult = await LogService.insertSyncLog(type, result, { upsertCount, deleteCount }, distributorId, error, isCronJob, executionTime, configuration);
            if (syncLogResult) return res.status(200).json(Template.successMessage('Inserted Logs Successfully'));
            else return res.status(200).json(Template.successMessage('Failed to Insert Logs'));
        } catch (error) {
            logger.error('CAUGHT : Error in ArsController -> insertSyncLog', error);
            return res.status(500).json(Template.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchArsAreaCodes(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchArsAreaCodes');
        try {
            const { roles = '', user_id = '', code = '' } = req.user || {};
            const result = await ArsService.fetchArsAreaCodes(user_id, roles, code);
            if (result) return res.status(200).json(Template.success(result, SuccessMessage.FETCH_SUCCESS));
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_ERROR));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> fetchArsAreaCodes', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchStockNormForDistributor(req: Request, res: Response) {
        logger.info('inside ArsController -> fetchStockNormForDistributor');
        try {
            const { distributorCode = '' } = req.params;
            const result = await ArsService.fetchStockNormForDistributor(distributorCode);
            if (result) return res.status(200).json(Template.success(result, SuccessMessage.FETCH_STOCK_NORM_FOR_DISTRIBUTOR));
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_STOCK_NORM_FOR_DISTRIBUTOR));
        } catch (error) {
            logger.error('CAUGHT: Error in ArsController -> fetchStockNormForDistributor', error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchAreaForecastDumpDetails(req: Request, res: Response) {
        logger.info('Inside arsController->fetchAreaForecastDumpDetails');
        const { areaCode = '' } = req.params;
        try {
            const result = await ArsService.fetchAreaForecastDumpDetails(areaCode);
            if (!result) res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_FORECAST_DUMP_DETAILS));
            return res.status(200).json(Template.success(result, SuccessMessage.FETCH_FORECAST_DUMP_DETAILS));
        } catch (error) {
            logger.error('CAUGHT: Error in arsController->fetchAreaForecastDumpDetails: ', error);
            return res.status(500).json(Template.internalServerError());
        }
    },
};
