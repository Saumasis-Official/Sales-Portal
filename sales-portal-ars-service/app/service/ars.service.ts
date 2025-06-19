import Helper from '../helper';
import { arsHelpers } from '../helper/arsHelper';
import { ArsWorkflowTestLogs } from '../helper/ArsWorkflowLogs';
import Email from '../helper/email';
import { ArsRules } from '../lib/businessRules';
import logger from '../lib/logger';
import { AdminModel } from '../model/adminModel';
import { ArsModel } from '../model/arsModel';
import S3Helper from '../helper/ConnectToS3Bucket';
import Template from '../helper/responseTemplate';
import XLSX from 'xlsx';
import axios from 'axios';
import { ErrorMessage } from '../constants/errorMessage';
import { SuccessMessage } from '../constants/successMessage';
import * as path from 'path';
import * as fs from 'fs';
import * as workerThread from 'worker-thread';
import CreteOrder from '../model/createOrder';
import { AutoValidationRules } from '../lib/validationRules';
import { UserService } from './user.service';
import { SapApi } from '../helper/sapApi';
import { ArsAutoSubmitRules } from '../lib/arsAutoSubmitRule';
import { LogService } from './logService';
import { UserModel } from '../model/userModel';
import { UpdateForecastData, UpdateForecastDataAdjusted } from '../interfaces/updateForecastData';
const emailConfig = global['configuration'].email;
const GrpEmail = emailConfig.REPORT_ARS_AUTO_VALIDATION_ERROR_MAILIDS;
import { uploadedDataTransformer } from '../transformer/uploadExcelTransformer';
import { PDPCheck, PDPConfig } from '../helper/pdp';
import { UploadStockNorm } from '../interfaces/uploadStockNorm';
import { ForecastedPskuDistWise } from '../interfaces/forecastedPskuDistWise';
import { DistributorPskuSN } from '../interfaces/distributorPskuSN';
import { DistributorForecast } from '../interfaces/distributorForecast';
import _ from 'lodash';
import moment from 'moment';
import { AuditModel } from '../model/audit.model';
import { CreateXlsxFileReturnType } from '../../enums/createXlsxFileReturnType';
import { OrderSummary, OrderDetails, PDPDetails } from '../interfaces/aosAuditReport';
import { ValidateForecastDataUserType } from '../interfaces/validateForecastData';
import { ArsSuggestedMaterials } from '../interfaces/arsSuggestedMaterials';
import ArsArchiveModel from '../model/archive.model';
import { UploadClassLevelStockNorm } from '../interfaces/UploadClassLevelStockNorm';

const create_order = new CreteOrder();
const ArsDockerApiConfig = global['configuration'].arsDockerApis;
// const arsWorkflowLogs = ArsWorkflowTestLogs.getInstance();

export const ArsService = {
    async getRegionalBrandVariants(areaCode: string) {
        logger.info('inside ArsService -> getRegionalBrandVariants');
        return await ArsModel.getRegionalBrandVariants(areaCode);
    },
    async getRegionalBrands(areaCode: string) {
        logger.info('inside ars.service -> getRegionalBrands');
        return await ArsModel.getRegionalBrands(areaCode);
    },

    async fetchForecastConfigurations(areaCode: string, applicableMonth: string | null = null, nextApplicableMonth: string | null = null) {
        logger.info('inside ArsService -> fetchForecastConfigurations');
        return await ArsModel.fetchForecastConfigurations(areaCode, applicableMonth, nextApplicableMonth);
    },
    async updateForecastConfiguration(
        user_id: string,
        role: string,
        config: {
            area_code: string;
            applicable_month: string;
            config_data: {
                [key: string]: {
                    weekly_week1: string;
                    weekly_week2: string;
                    weekly_week3: string;
                    weekly_week4: string;
                    fortnightly_week12: string;
                    fortnightly_week34: string;
                };
            };
        },
    ) {
        logger.info('inside ArsService -> updateForecastConfiguration');
        const response = await ArsModel.updateForecastConfiguration(user_id, role, config);
        ArsModel.updateForecastDistribution(config.area_code);
        return response;
    },

    async getForecastData(areaCode: string, brandVariantCode: string) {
        logger.info('inside ArsService -> getForecastData');
        console.time('TOTAL FORECAST TIME');
        console.time('FORECAST DB');
        let response;
        const areaSalesMonth = await ArsModel.fetchSalesMonthByArea(areaCode);
        const salesMonths = areaSalesMonth?.area_month?.filter((item) => item['area_code'] == areaCode);
        if (salesMonths && salesMonths.length) {
            const areaDateRange = salesMonths[0];
            const startMonth = areaDateRange?.start_month ?? null;
            const endMonth = areaDateRange?.end_month ?? null;
            response = await ArsModel.getForecastData(areaCode, brandVariantCode, startMonth, endMonth);
        } else response = await ArsModel.getForecastData(areaCode, brandVariantCode);
        const conversionFactor = (await ArsModel.getConversionFactor(brandVariantCode)) ?? [];
        console.timeEnd('FORECAST DB');
        const prevForecast = arsHelpers.rekey(response?.prev_forecast, 'sold_to_party', 'prev_forecast');
        const buomToCs = conversionFactor[0]?.buom_to_cs ?? 1;
        const dbList: Array<{ customer: string }> =
            response?.rows?.map((item) => {
                return { customer: item.distributor_code };
            }) ?? [];
        let doctype = 'ZOR';
        const type = 'MTD';
        console.time('MTD API');
        const mtdData = await ArsService.mtdApiValues(dbList, brandVariantCode, type, doctype);
        console.timeEnd('MTD API');
        const mtd = arsHelpers.rekey(mtdData, 'CUSTOMER', 'MTD');
        const responseWithMTD = response?.rows?.map((item) => {
            const mtdValue = +mtd[item.distributor_code] * buomToCs ?? null;
            const forecast = prevForecast[item.distributor_code] || item.adjusted_forecast;
            const btg = mtdValue ? +forecast - mtdValue : null;
            delete item.prev_forecast;
            //there are instances where mtdValue = NaN, in such cases mtdValue?.toFixed(2) = NaN
            return {
                ...item,
                mtd: mtdValue ? mtdValue.toFixed(2) : null,
                balance_to_go: btg?.toFixed(2),
            };
        });
        console.timeEnd('TOTAL FORECAST TIME');
        return {
            ...response,
            rows: responseWithMTD,
        };
    },

    async updateForecastData(
        data: {
            adjusted: {
                sales_allocation_key: any;
                updated_allocation: any;
            }[];
        },
        userId: string,
    ) {
        logger.info('inside ArsService -> updateForecastData');
        return await ArsModel.updateForecastData(data, userId);
    },

    async upsertForecastDistribution(areaCode: string, data: UpdateForecastData) {
        logger.info('inside ArsService -> upsertForecastDistribution : ' + areaCode);
        try {
            let mtd;
            let buomToCs = null;
            //if window is open and forecast is not dumped, then applicable month is current month
            const isNextMonthForecastDumped = await Helper.isNextMonthForecastDumped(areaCode);
            const applicableMonth = isNextMonthForecastDumped ? Helper.applicableMonth('next') : Helper.applicableMonth();

            const forecastConfig = await ArsModel.fetchForecastPhasing(areaCode, applicableMonth);
            let phasing = forecastConfig?.find((i) => i.area_code === areaCode)?.config;
            // if (!isNextMonthForecastDumped) {
            //     phasing = arsHelpers.phasingReadjustment(phasing);
            //     const dbList = data.adjusted.map(item => { return { "customer": item.distributorCode } });
            //     const mtdResult = await ArsService.mtdApiValues(dbList, data.pskuCode, 'MTD', 'ZOR');
            //     mtd = await arsHelpers.rekey(mtdResult, 'CUSTOMER', 'MTD');
            //     const conversion = await ArsModel.getConversionFactor(data.pskuCode);
            //     buomToCs = conversion && conversion[0]?.['buom_to_cs'];
            // }
            return await ArsModel.updateInsertForecastDistribution(areaCode, phasing, data, !isNextMonthForecastDumped, mtd, buomToCs);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> upsertForecastDistribution', error);
            return null;
        }
    },
    async makeApiCallsToGetValues(payload: any): Promise<any> {
        const api = payload.type === 'holdings' ? ArsDockerApiConfig.HOLDINGS_API : ArsDockerApiConfig.API;
        const config = {
            method: 'GET',
            url: api,
            headers: {
                'X-Requested-With': 'X',
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            auth: {
                username: ArsDockerApiConfig.USERNAME,
                password: ArsDockerApiConfig.PASSWORD,
            },
            data: JSON.stringify(payload),
        };

        let response: any;

        try {
            response = await axios(config);
            let x = response;
        } catch (err) {
            logger.error(`Error in the ${payload.type} API call: `, err);
        }
        if (!response || response.length < 0) {
            logger.info(`Response from ${payload.type} is undefined or null`);
            return [];
        }
        return response.data;
    },
    async getArsApiValues(forecastedPSKUDistWise: any, distId: any, type: string, doctype: string | null) {
        let payload: any = {
            type: type,
            customer: distId,
            doctype: doctype,
            sku_list: forecastedPSKUDistWise,
        };
        return await ArsService.makeApiCallsToGetValues(payload);
    },

    async getSuggestedMaterials(
        distId: any,
        division: any,
        applicable_month = Helper.applicableMonth(),
        next_applicable_month = Helper.applicableMonth('next'),
        simulation_date: string | null = null,
    ): Promise<{ finalArray: ArsSuggestedMaterials[]; arsWorkflowLogs: ArsWorkflowTestLogs } | string | null> {
        const arsWorkflowLogs = new ArsWorkflowTestLogs();
        let finalArray: ArsSuggestedMaterials[] = [];
        logger.info(`inside ArsService -> getSuggestedMaterials: DIST: ${distId}`, division);
        try {
            console.time('TOTAL ARS TIME');
            let applicableMonth = applicable_month;
            let nextApplicableMonth = next_applicable_month;
            if (simulation_date) {
                const evaluation = arsHelpers.evaluateApplicableMonthFromDate(new Date(simulation_date));
                applicableMonth = evaluation.applicableMonth;
                nextApplicableMonth = evaluation.nextApplicableMonth;
            }
            console.time('ARS DB CALLS');
            const [forecastedPSKUDistWise, normCycleSafetyValues = {}, distPdpDistributionArray, lastOrderDetails, excludedPSKU, soqNormsResult, skuSoqNormResult]: [
                ForecastedPskuDistWise[] | null,
                any,
                any,
                any[],
                any,
                any,
                any,
            ] = await Promise.all([
                ArsModel.getForecastedPSKUDistWise(distId, applicableMonth),
                ArsService.getStockNormByPsku(distId, applicableMonth),
                ArsModel.getDistPdpDistribution(distId, division, applicableMonth),
                ArsModel.getLastArsOrder(distId),
                ArsModel.getRuleConfigPSKU(distId),
                ArsModel.findApplicableSoqNorms(null, applicableMonth),
                ArsModel.findApplicableSkuSoqNorm(distId, applicableMonth),
            ]);
            console.timeEnd('ARS DB CALLS');

            if (!forecastedPSKUDistWise?.length) {
                logger.info(`inside ArsService -> getSuggestedMaterials: DistributorID: ${distId} on ${new Date().toLocaleDateString()} No forecast found`);
                return `DistributorID: ${distId} on ${new Date().toLocaleDateString()} No forecast found`;
            }

            arsWorkflowLogs.distPdpDistributionArray = distPdpDistributionArray;
            arsWorkflowLogs.normCycleSafetyValues = normCycleSafetyValues;

            const weekColumnsPskuWise = await ArsRules.getWeekDaysPskuWise(distPdpDistributionArray, normCycleSafetyValues, applicableMonth, nextApplicableMonth, simulation_date);
            arsWorkflowLogs.weekColumnsPskuWise = weekColumnsPskuWise;
            // logger.info('weekColumnsPskuWise', weekColumnsPskuWise)
            arsWorkflowLogs.forecastedPSKUDistWise = forecastedPSKUDistWise;

            let stockNormData: any = await ArsModel.getStockNormTotal(distId, weekColumnsPskuWise);
            arsWorkflowLogs.stockNormData = stockNormData;

            console.time('ARS API CALLS');
            let doctype = 'ZOR';
            const sku_list = forecastedPSKUDistWise?.map((o) => o.sku) ?? [];
            const holdingsResult = await ArsService.getArsApiValues(sku_list, distId, 'holdings', doctype);
            console.timeEnd('ARS API CALLS');

            const transitStockData = arsHelpers.rekey(holdingsResult, 'SKU', 'SIT_QTY');
            const inhandStockData = arsHelpers.rekey(holdingsResult, 'SKU', 'SIH_QTY');
            const openOrderStockData = arsHelpers.rekey(holdingsResult, 'SKU', 'OO_QTY');
            let base_to_case = arsHelpers.rekey(forecastedPSKUDistWise, 'sku', 'buom_to_cs');
            let pac_to_case = arsHelpers.rekey(forecastedPSKUDistWise, 'sku', 'pak_to_cs');
            stockNormData = arsHelpers.rekey(stockNormData, 'psku', 'val');

            arsWorkflowLogs.transitStockData = transitStockData;
            arsWorkflowLogs.inhandStockData = inhandStockData;
            arsWorkflowLogs.openOrderStockData = openOrderStockData;
            arsWorkflowLogs.base_to_case = base_to_case;
            arsWorkflowLogs.pac_to_case = pac_to_case;
            arsWorkflowLogs.stockNormData = stockNormData;
            arsWorkflowLogs.lastOrderDetails = lastOrderDetails;
            arsWorkflowLogs.excludedPSKU = excludedPSKU;

            const soqNorm = await arsHelpers.rekey(soqNormsResult, 'psku', 'soq');
            arsWorkflowLogs.soqNorms = soqNorm;

            const skuSoqNorm = arsHelpers.nestedRekey(skuSoqNormResult, ['distributor_code', 'material_code', 'soq_norm']);
            arsWorkflowLogs.skuSoqNorm = skuSoqNorm;

            finalArray = await ArsRules.getSuggestedOrder(
                distId,
                forecastedPSKUDistWise,
                transitStockData,
                inhandStockData,
                openOrderStockData,
                stockNormData,
                base_to_case,
                pac_to_case,
                lastOrderDetails,
                excludedPSKU,
                normCycleSafetyValues,
                soqNorm,
                skuSoqNorm[distId],
            );
            console.timeEnd('TOTAL ARS TIME');
            logger.info(`inside ArsService -> getSuggestedMaterials, Dist: ${distId}: finalArray: `, finalArray);
            arsWorkflowLogs.finalArray = finalArray;
            // return { finalArray, arsWorkflowLogs };
        } catch (error) {
            arsWorkflowLogs.errors = error.message;
            logger.error('Error in ArsService -> getSuggestedMaterials', error);
            // return error.message ?? null;
        } finally {
            // returning from finally to capture error from catch
            return {
                finalArray,
                arsWorkflowLogs,
            };
        }
    },
    async fetchLastForecastDate(areaCode: string) {
        logger.info('inside ArsService -> fetchLastForecastDate');
        return await ArsModel.fetchLastForecastDate(areaCode);
    },

    async getForecastSummaryData(areaCode: string, search: string, limit: string, offset: string, quantityNormFlag: boolean) {
        logger.info('inside ArsService -> getForecastSummaryData: ', areaCode);
        console.time('TOTAL FORECAST SUMMARY TIME');
        const areaSalesMonth = await ArsModel.fetchSalesMonthByArea(areaCode);
        const salesMonths = areaSalesMonth?.area_month?.filter((item) => item['area_code'] == areaCode);
        const lastForecastDate: any = await ArsModel.fetchLastForecastDate(areaCode);
        if (!lastForecastDate) return null;
        const lastForecastMonth = lastForecastDate?.rows[0]?.forecast_month;
        let endMonth: string | null = null;
        let monthYear, res;
        if (salesMonths?.length) {
            const startMonth = salesMonths[0].start_month ?? null;
            endMonth = salesMonths[0].end_month ?? null;
            monthYear = startMonth && endMonth ? arsHelpers.getDynamicYearMonth(startMonth, endMonth, lastForecastMonth) : Helper.applicableYearMonths(lastForecastMonth);
            res = await ArsModel.getForecastSummaryData(areaCode, search, limit, offset, monthYear, quantityNormFlag, moment(endMonth)?.format('YYYYMM'));
        } else {
            monthYear = Helper.applicableYearMonths(lastForecastMonth);
            res = await ArsModel.getForecastSummaryData(areaCode, search, limit, offset, monthYear, quantityNormFlag);
        }
        console.timeEnd('TOTAL FORECAST SUMMARY TIME');
        return res;
    },

    async submitForecastData(areaCode: string, userId: string) {
        logger.info('Inside ArsService -> submitForecastData');
        return await ArsModel.submitForecastData(areaCode, userId);
    },

    async fetchUpdatedForecast(areaCode: string, forecast_sync: boolean = false, dbWithPDPMismatch: string[] = []) {
        /**
         * PROCESS FLOW:
         * 1. forecast_sync = true,
         *       Considering this function has been called to update the PDP of forecast_distribution and associated bifurcation.
         *       Hence fetch the forecast for the current month even if forecast for next month has been dumped.
         *       Pass only those distributor details to ArsModel.updateInsertForecastDistribution() which requires changes.
         *       In ArsModel.updateInsertForecastDistribution(), applicable_month will be current month.
         * 2. forecast_sync = false,
         *       Then it might have been called from this.autoSubmitForecastData() or ArsController.submitForecastData().
         *       In both the cases, we will update forecast_distribution using the latest forecast( i.e. if next month forecast is not yet dumped, then use the current forecast)
         *       But if we pass forecast_sync= false, in ArsMode.updateInsertForecastDistribution(), then applicable_month will be next month( this we don't want).
         *       So we have to modify:
         *           a. check if next month forecast has been dumped, if yes, then only update enableCurrentMonthForecastUpdate = true
         *           b. while calling ArsModel.updateInsertForecastDistribution(), we are checking if enableCurrentMonthForecastUpdate is true, then pass enableCurrentMonthForecastUpdate else pass forecast_sync.
         */
        logger.info('Inside ArsService -> fetchUpdatedForecast');
        try {
            let dumpErrorLogs: any[] = [];
            let isNextMonthForecastDumped: boolean = true;
            let enableCurrentMonthForecastUpdate: boolean | null = null;
            let mtd: any = null;
            let buomToCs: any = null;

            const result = await ArsModel.fetchUpdatedForecast(areaCode, forecast_sync);

            let data: UpdateForecastData;

            isNextMonthForecastDumped = await Helper.isNextMonthForecastDumped(areaCode);

            const applicableMonth = isNextMonthForecastDumped ? Helper.applicableMonth('next') : Helper.applicableMonth();
            const forecastConfigResult = await ArsModel.fetchForecastPhasing(areaCode, applicableMonth);
            let phasing = forecastConfigResult ? forecastConfigResult[0].config : [];
            if (!isNextMonthForecastDumped || forecast_sync) {
                enableCurrentMonthForecastUpdate = true;
                // phasing = arsHelpers.phasingReadjustment(phasing)
            }

            for (const row of result) {
                let d = { ...data };
                d.pskuCode = row.parent_sku;
                d.areaCode = areaCode;

                const dbList: { customer: string }[] = [];

                const arr: UpdateForecastDataAdjusted[] = [];
                for (let i = 0; i < row.sa_id.length; i++) {
                    const ele = row.sa_id[i];
                    const temp = {
                        updated_allocation: row.updated_allocation[i],
                        distributorCode: row.distributorcode[i],
                        sales_allocation_key: ele,
                        updatedAllocationId: row.ua_id[i],
                        pskuClass: row.psku_class[i],
                    };
                    dbList.push({ customer: row.distributorcode[i] });
                    if (dbWithPDPMismatch.length == 0) {
                        arr.push(temp);
                    } else if (dbWithPDPMismatch.includes(row.distributorcode[i])) {
                        arr.push(temp);
                    }
                }
                // if (enableCurrentMonthForecastUpdate) {
                //     const mtdResponse = await ArsService.mtdApiValues(dbList, row.parent_sku, 'MTD', 'ZOR');
                //     mtd = await arsHelpers.rekey(mtdResponse, 'CUSTOMER', 'MTD');
                //     const conversion = await ArsModel.getConversionFactor(row.parent_sku);
                //     buomToCs = conversion && conversion[0]?.['buom_to_cs'];
                // }

                d.adjusted = [...arr];

                if (d.adjusted.length > 0) {
                    const upsertResponse = await ArsModel.updateInsertForecastDistribution(areaCode, phasing, d, enableCurrentMonthForecastUpdate ?? forecast_sync, mtd, buomToCs);
                    if (typeof upsertResponse === 'object' && upsertResponse) {
                        dumpErrorLogs.push(upsertResponse);
                    }
                }
                d = { ...data };
            }

            return dumpErrorLogs ?? null;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> fetchUpdatedForecast', error);
            return null;
        }
    },
    async updateForecastDistribution(areaCode: string) {
        logger.info('inside ArsService -> updateForecastDistribution');
        return await ArsModel.updateForecastDistribution(areaCode);
    },

    async stockData(dbCode: string, psku: string[], docType: string) {
        logger.info('Inside ArsService -> stockData');

        try {
            let holdingsResult = await ArsService.getArsApiValues(psku, dbCode, 'holdings', docType);
            const holdings = {};
            holdingsResult.forEach((i) => {
                holdings[i.SKU] = i;
            });
            const response = psku?.map((p) => {
                return {
                    sku: p,
                    stock_in_transit: holdings[+p]?.SIT_QTY != null ? Math.ceil(holdings[+p]?.SIT_QTY)?.toString() : '',
                    stock_in_hand: holdings[+p]?.SIH_QTY != null ? Math.ceil(holdings[+p]?.SIH_QTY)?.toString() : '',
                    open_order: holdings[+p]?.OO_QTY != null ? Math.ceil(holdings[+p]?.OO_QTY)?.toString() : '',
                };
            });
            if (response?.length) return response;
            return null;
        } catch (error) {
            logger.error('Inside ArsService -> stockData , Error: ', error);
            return null;
        }
    },

    async forecastDumpValidation() {
        /**
         * Fetch all the area codes
         * For each area, check that success count >=2 for the current month
         * For each successfulAreaCodes, check the missed distributors;
         */
        const successfulAreaCodes: string[] = [];
        const unsuccessfulAreaCodes: string[] = [];
        const unsuccessfulDistributorsArray: any[] = [];
        try {
            const areaCodes = await ArsModel.fetchAreaCodes();
            if (areaCodes) {
                for (let area of areaCodes) {
                    const { salesAllocationStatus, monthlySalesStatus } = await ArsModel.checkForecastSyncStatus(area.code);
                    /**if both the status is true, then success */
                    if (salesAllocationStatus && monthlySalesStatus) successfulAreaCodes.push(area.code);
                    else unsuccessfulAreaCodes.push(area.code);
                }
                if (successfulAreaCodes.length > 0) {
                    for (let area of successfulAreaCodes) {
                        const unsuccessfulDistributors = await ArsModel.distributorLevelForecastValidation(area);
                        if (unsuccessfulDistributors && unsuccessfulDistributors.length > 0) unsuccessfulDistributorsArray.push(...unsuccessfulDistributors);
                    }
                }
            }
            let fileDetails: { filePath: string; fileName: string } | null = null;

            const successfulAreaCodesArray = successfulAreaCodes.map((item) => {
                return { area_code: item };
            });
            const unsuccessfulAreaCodesArray = unsuccessfulAreaCodes.map((item) => {
                return { area_code: item };
            });
            const reportData: any[] = [];
            const sheetName: string[] = [];
            if (successfulAreaCodes && successfulAreaCodes.length > 0) {
                reportData.push(successfulAreaCodesArray);
                sheetName.push('successful_area_codes');
            }
            if (unsuccessfulAreaCodes && unsuccessfulAreaCodes.length > 0) {
                reportData.push(unsuccessfulAreaCodesArray);
                sheetName.push('unsuccessful_area_codes');
            }
            if (unsuccessfulDistributorsArray && unsuccessfulDistributorsArray.length > 0) {
                reportData.push(unsuccessfulDistributorsArray);
                sheetName.push('unsuccessful_distributors');
            }
            /**null value should not be sent */
            fileDetails = Helper.createXlsxFile(reportData, sheetName, 'forecast-upload-report');

            const forecastDumpReport = {
                unsuccessfulAreaCodesPresent: !!unsuccessfulAreaCodes,
                unsuccessfulDistributorsPresent: unsuccessfulDistributorsArray && unsuccessfulDistributorsArray.length > 0 ? true : false,
            };
            Email.forecastDumpStatusNotification(forecastDumpReport, fileDetails);
            return true;
        } catch (error) {
            logger.error('Error in ArsService -> forecastDumpValidation', error);
        } finally {
            return null;
        }
    },
    async autoSubmitForecastData(forecast_sync: boolean = false) {
        logger.info('inside ArsService -> autoSubmitForecastData');
        let dumpErrorLogs: any[] = [];
        try {
            forecast_sync && (await ArsModel.reIndexArsTables());
            const areaCodes = await ArsModel.fetchAreaCodes();
            let forecastConfigResult;
            let dbWithPDPMismatch = [];
            if (forecast_sync) {
                dbWithPDPMismatch = await ArsModel.distributorsWithPDPMismatch(Helper.applicableMonth());
                forecastConfigResult = await ArsModel.fetchForecastPhasing(null);
                logger.info('inside ArsService -> autoSubmitForecastData, dbWithPDPMismatch: ', dbWithPDPMismatch);
            }
            for (let area of areaCodes) {
                if (!forecast_sync) await ArsService.submitForecastData(area?.code, 'PORTAL_MANAGED');
                const response = await ArsService.fetchUpdatedForecast(area?.code, forecast_sync, dbWithPDPMismatch);
                response && dumpErrorLogs.push(response);
            }
            //remove duplicate records from dumpErrorLogs
            dumpErrorLogs = dumpErrorLogs.flat(3);
            const dumpErrorLogsSet = new Set(dumpErrorLogs);
            dumpErrorLogs = [...dumpErrorLogsSet];
            logger.error('Error in ArsService -> autoSubmitForecastData: Error while forecast_distribution insert:', dumpErrorLogs);
            return true;
        } catch (error) {
            logger.error('Error in ArsService -> autoSubmitForecastData', error);
            return null;
        }
    },
    async fetchArsReport() {
        logger.info('inside ArsService -> fetchArsReport');
        try {
            const report = await ArsModel.fetchArsReport();
            let summary:
                | {
                      region: string;
                      orderCount: number;
                      tentative: string;
                      dbCount: number;
                  }[]
                | null = null;
            let fileDetails: { filePath: string; fileName: string } | null = null;

            if (report) {
                const pskuDbSet = {};
                report.forEach((row) => {
                    if (!pskuDbSet[row['Parent SKU']]) {
                        pskuDbSet[row['Parent SKU']] = new Set();
                    }
                    pskuDbSet[row['Parent SKU']].add(row['Distributor ID']);
                });
                // We have to fetch MTD for D-1, hence passing 1, denoting MTD till yesterday
                const mtdResponse = await ArsService.getMtd(pskuDbSet, 1);
                report.forEach((r) => {
                    const mtd = mtdResponse?.[r['Parent SKU']]?.[r['Distributor ID']] ?? 0;
                    r['MTD'] = mtd;
                });
                fileDetails = Helper.createXlsxFile([report], ['order_details'], 'ars_report', true);
                summary = ArsRules.arsOrderReportSummary(report);
            }
            Email.arsReport(fileDetails, summary);
            return null;
        } catch (error) {
            logger.error('Error in ArsService -> fetchArsReport');
            return null;
        }
    },

    async sihSsCheck() {
        logger.info('inside ArsService -> sihSsCheck');
        try {
            let dbList: string[] = [];
            const dbNormData = await ArsModel.fetchStockNormData();
            const ss_sn = await ArsModel.safetyStockAndSafetyNorm();
            let logRespone: boolean = false;
            let disablePdpRespone: boolean = false;
            let dbListAll: string[] = [];

            if (!dbNormData) {
                logger.error('inside ArsService -> sihSsCheck, Error: Failed to fetch distributor norms data');
                return false;
            }
            dbNormData.forEach((row) => {
                if (row?.sn_data?.ss && row?.sn_data?.ss.length > 0) dbListAll.push(`'${row.profile_id}'`);
            });
            // let enablePdpRespone: boolean = await ArsModel.enableDisablePdp(dbListAll.toString(), true);
            // if (!enablePdpRespone) {
            //     logger.error('inside ArsService -> sihSsCheck, Error: Failed to enable pdp for distributors');
            //     return false;
            // }

            let result = await Promise.all(
                dbNormData.map(async (row): Promise<any> => {
                    let sendSnMail: boolean = false;
                    let sendSsMail: boolean = false;

                    let sku_list = row['sn_data'].psku.map((o) => {
                        return { sku: o };
                    });
                    let inhandStockData = await ArsService.getArsApiValues(sku_list, row['profile_id'], 'inhand', 'ZOR');
                    let intransitStockData = await ArsService.getArsApiValues(sku_list, row['profile_id'], 'transit', 'ZOR');
                    let openStockData = await ArsService.getArsApiValues(sku_list, row['profile_id'], 'open', 'ZOR');

                    let ss_sih_list: {
                        psku: string;
                        cf: number;
                        sn: number;
                        ss: number;
                        cs: number;
                        sih: number;
                        sit: number;
                        oo: number;
                    }[] = [];
                    row['sn_data'].psku.forEach((value, index) => {
                        let obj = {
                            psku: value,
                            cf: row['sn_data'].cf[index],
                            sn: row['sn_data'].sn[index],
                            ss: row['sn_data'].ss[index],
                            cs: row['sn_data'].cs[index],
                            sih: 0,
                            sit: 0,
                            oo: 0,
                        };
                        ss_sih_list.push(obj);
                    });
                    const ss_tolerance_value: {
                        key: string;
                        value: string;
                    } = ss_sn.find((item) => item.key === 'SAFETY_STOCK');
                    const sn_tolerance_value: {
                        key: string;
                        value: string;
                    } = ss_sn.find((item) => item.key === 'STOCK_NORM');
                    ss_sih_list = ss_sih_list.map((r) => {
                        let inhand: number = inhandStockData.find((t) => r.psku === t.SKU)?.QTY == null ? 0 : Math.ceil(inhandStockData.find((t) => r.psku === t.SKU)?.QTY);
                        let intransit: number = intransitStockData.find((t) => r.psku === t.SKU)?.QTY == null ? 0 : +intransitStockData.find((t) => r.psku === t.SKU)?.QTY;
                        let open: number = openStockData.find((t) => r.psku === t.SKU)?.QTY == null ? 0 : +openStockData.find((t) => r.psku === t.SKU)?.QTY;
                        let sn_tolerance: number = sn_tolerance_value?.value == null ? 0 : +sn_tolerance_value?.value;
                        let ss_tolerance: number = ss_tolerance_value?.value == null ? 0 : +ss_tolerance_value?.value;
                        if (+(inhand + intransit + open).toFixed(2) < +(r.sn * (1 - sn_tolerance / 100)).toFixed(2)) {
                            if (+(inhand + intransit + open).toFixed(2) < +(r.ss * (1 - ss_tolerance / 100)).toFixed(2)) sendSsMail = true;
                            else sendSnMail = true;
                        }
                        r['sih'] = inhand;
                        r['sit'] = intransit;
                        r['oo'] = open;
                        return { ...r };
                    });

                    if (sendSnMail || sendSsMail) {
                        dbList.push(`'${row.profile_id}'`);
                        let emailData = {
                            to: [row.db_email, row.tse_email],
                            // to: [row.db_email, 'saumasis.chandra@tataconsumer.com'],
                            cc: row.asm_email,
                            // cc: 'mayukh.maity@tataconsumer.com',
                            dbName: row.name,
                            dbCode: row.profile_id,
                            emailType: sendSsMail ? 'safety stock' : 'stock norm',
                        };
                        Email.sihBelowSs(emailData);
                    }

                    let result_row = {
                        region: row.region,
                        area_code: row.area_code,
                        asm_email: row.asm_email,
                        tse_code: row.tse_code,
                        tse_email: row.tse_email,
                        db_code: row.profile_id,
                        db_email: row.db_email,
                        pskus_checked: JSON.stringify(ss_sih_list),
                        email_sent: sendSnMail || sendSsMail,
                        email_type: sendSnMail || sendSsMail ? (sendSsMail ? 'SAFETY_STOCK' : 'STOCK_NORM') : 'NA',
                    };

                    return result_row;
                }),
            );

            if (dbNormData && result != null) {
                logRespone = await ArsModel.insertSihSSLog(result);
            }
            if (logRespone) {
                // disablePdpRespone = await ArsModel.enableDisablePdp(dbList.toString(), false);
            }
            if (disablePdpRespone) {
                return true;
            }
            return false;
        } catch (error) {
            logger.error('inside ArsService -> sihSsCheck, Error: ', error);
            return false;
        }
    },

    async downloadForecastSummary(areaCode: string, userId: string, role: string[], code: string) {
        logger.info('inside ArsService -> downloadForecastSummary, userId: ' + userId + ' ,role: ' + role + ' ,code: ' + code);
        logger.info(
            `ArsService -> downloadForecastSummary: INITIAL: Allocated Heap Memory: ${process.memoryUsage().heapTotal / 1024 / 1024}MB,  Heap Memory Usage: ${process.memoryUsage().heapUsed / 1024 / 1024}MB`,
        );

        try {
            let responseObj = {};

            if (areaCode === 'ALL') {
                const areaCodes = await AdminModel.fetchAreaCodes(userId, role, code);

                logger.info('inside ArsService -> downloadForecastSummary, areaCodes : ', areaCodes);
                const today = new Date();
                const currentDate = today.toLocaleDateString('en-GB').split('/').join('-');

                const fileMap = new Map<string, boolean>();
                const regionMap = new Map<string, string[]>();

                for (let area of areaCodes) {
                    if (fileMap.get(area.region)) continue;
                    const areas = regionMap.get(area.region) || [];

                    const fileName = `forecast_${area.region}_${currentDate}.xlsx`;
                    try {
                        const s3Response = (await S3Helper.checkIfForecastFileExists(fileName, 'download')) || {};
                        if (s3Response['ContentLength']) {
                            logger.info('inside ArsService -> downloadForecastSummary, File Exists : ' + fileName);
                            fileMap.set(area.region, true);
                            responseObj[area.region] = s3Response;
                        } else {
                            fileMap.set(area.region, false);
                            areas.push(area.code);
                            regionMap.set(area.region, areas);
                        }
                    } catch (err) {
                        logger.error('inside ArsService -> downloadForecastSummary, Error : ', err);
                        fileMap.set(area.region, false);
                        areas.push(area.code);
                        regionMap.set(area.region, areas);
                    }
                }

                // const finalWorkbookPath = path.join(__dirname, `forecast_${currentDate}.xlsx`);
                let finalWorkbook = XLSX.utils.book_new();
                const areaSalesMonth = await ArsModel.fetchSalesMonthByArea();
                for (let [region, areas] of regionMap) {
                    // const workbook = XLSX.utils.book_new();
                    for (let area of areas) {
                        console.time(`FORECAST SUMMARY ${area}`);
                        const forecast = (await ArsModel.forecastSummaryAll(area)) || [];
                        const salesMonths = areaSalesMonth?.area_month?.filter((item) => item['area_code'] == area);
                        if (!salesMonths?.length) {
                            logger.error('Monthly sales not found for :', area);
                            continue;
                        }
                        const areaDateRange = salesMonths[0];
                        console.timeEnd(`FORECAST SUMMARY ${area}`);
                        const lastForecast = (await ArsModel.fetchLastForecastDate(area))?.rows[0]?.forecast_month || null;
                        if (!lastForecast || forecast.length === 0) continue;
                        let forecastMonths;
                        if (!areaDateRange.start_month || !areaDateRange.end_month) forecastMonths = arsHelpers.getMonthYear(area);
                        else {
                            forecastMonths = arsHelpers.getDynamicYearMonth(areaDateRange.start_month, areaDateRange.end_month, lastForecast);
                        }
                        const excelData = forecast.map((item) => {
                            const obj = {
                                Area_Code: item.area_code,
                                TSE_Code: item.tse_code,
                                DB_Code: item.sold_to_party,
                                DB_Name: item.customer_name,
                                PSKU: item.parent_sku,
                                PSKU_Description: item.parent_desc,
                                BUOM: item.buom,
                                BUOM_TO_CS: item.buom_to_cs,
                                Stock_Norm_Days: item.stock_norm,
                                Status: item.status,
                                Customer_Group: item.customer_group,
                                Customer_Group_Desc: item.customer_group_description,
                            };
                            const { monthNames = [], monthYear = [] } = forecastMonths || {};
                            for (let i = 0; i < monthNames.length - 1; i++) {
                                const monthSalesFigure = (monthNames[i] || 'month1') + '_Sales_Figure';
                                const monthForecast = item.monthly_sales[monthYear[i] || ''] || 0;
                                obj[monthSalesFigure] = monthForecast;
                            }
                            const currentMonth = (monthNames.at(-1) || 'currentMonth') + '_Forecast_BUOM';
                            const currentMonth_forecast = item.forecast;
                            obj[currentMonth] = currentMonth_forecast;
                            obj['Adjusted_Forecast_BUOM'] = item.adjusted_forecast;
                            return obj;
                        });
                        if (!excelData.length) continue;
                        const worksheet = XLSX.utils.json_to_sheet(excelData);
                        const tempFilePath = path.join(__dirname, `temp_${area}.xlsx`);
                        let tempWorkbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(tempWorkbook, worksheet, area);
                        XLSX.writeFile(tempWorkbook, tempFilePath);

                        // Append the temporary file to the final workbook
                        let tempWorkbookRead = XLSX.readFile(tempFilePath);
                        XLSX.utils.book_append_sheet(finalWorkbook, tempWorkbookRead.Sheets[area], area);

                        // Clean up the temporary file
                        fs.unlinkSync(tempFilePath);

                        // const sheetName = area;
                        // XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

                        // Log memory usage after each iteration
                        logger.info(
                            `ArsService -> downloadForecastSummary: Region: ${region} Area: ${area} AFTER ITERATION: Allocated Heap Memory: ${process.memoryUsage().heapTotal / 1024 / 1024}MB,  Heap Memory Usage: ${process.memoryUsage().heapUsed / 1024 / 1024}MB`,
                        );
                    }

                    if (finalWorkbook.SheetNames.length === 0) continue;
                    const fileName = `forecast_${region}_${currentDate}.xlsx`;
                    try {
                        let xlsxData = XLSX.write(finalWorkbook, {
                            bookType: 'xlsx',
                            type: 'buffer',
                        });

                        logger.info(
                            `ArsService -> downloadForecastSummary: Region: ${region}: Allocated Heap Memory: ${process.memoryUsage().heapTotal / 1024 / 1024}MB,  Heap Memory Usage: ${process.memoryUsage().heapUsed / 1024 / 1024}MB`,
                        );
                        const s3UploadResponse = (await S3Helper.uploadForecastFile(xlsxData, fileName, 'download')) || {};

                        // Dereference large objects to free up memory
                        xlsxData = null;
                        finalWorkbook = XLSX.utils.book_new(); // Create a new workbook

                        const location = s3UploadResponse['Location'] || '';
                        const bucket = s3UploadResponse['Bucket'] || '';
                        const responseKey = s3UploadResponse['Key'] || '';
                        if (location) {
                            const path = responseKey;
                            const downloadUrl = (await S3Helper.createSignedUrl(bucket, path)) || '';
                            s3UploadResponse['downloadUrl'] = downloadUrl;
                        }

                        responseObj[region] = s3UploadResponse;
                        const logObj = {
                            file_name: fileName,
                            region: region,
                            areas: regionMap.get(region) ?? [],
                            type: 'download',
                            link: s3UploadResponse['Location'] || '',
                            success: s3UploadResponse['Location'] ? true : false,
                            error: s3UploadResponse['Location'] ? '' : 'Error in uploading forecast download file to S3',
                        };
                        await ArsModel.insertForecastUploadDownloadLogs(logObj, userId, role);
                    } catch (error) {
                        logger.error('inside ArsService -> downloadForecastSummary, Error : ', error);
                        responseObj[region] = error;
                    }
                }
                logger.info('inside ArsService -> downloadForecastSummary, download Response : ', responseObj);
            } else {
                const forecast = (await ArsModel.forecastSummaryAll(areaCode)) || [];
                responseObj[areaCode] = forecast;
            }

            return responseObj;
        } catch (error) {
            logger.error('inside ArsService -> downloadForecastSummary, Error : ', error);
            return null;
        }
    },

    async fetchStockLevelSyncStatus() {
        logger.info('inside ArsService -> fetchStockLevelSyncStatus');
        try {
            const timeSync = await ArsService.getArsApiValues(null, null, 'time', null);
            return timeSync;
        } catch (error) {
            logger.error('Error in ArsService -> fetchStockLevelSyncStatus: ', error);
            return null;
        }
    },

    async fetchSkuStockData(dbCode: string, sku: string, docType: string) {
        logger.info('inside ArsService -> fetchSkuStockData');
        try {
            const materials = await ArsModel.fetchChildMaterialCodes(sku);
            // const materialConversion = await ArsModel.getMaterialConversionPSKUWise([sku]);
            // const pak_to_cs = arsHelpers.rekey(materialConversion, 'code', 'pak_to_cs');
            let sku_list = materials?.map((o) => o.code);

            const holdingsResult = await ArsService.getArsApiValues(sku_list, dbCode, 'holdings', docType);
            const holdings = {};
            holdingsResult.forEach((i) => {
                holdings[i.SKU] = i;
            });
            const response = materials?.map((m) => {
                // const cf = pak_to_cs[m.code] ?? 1;
                return {
                    sku: m.code,
                    description: m.description,
                    stock_in_transit: holdings[+m.code]?.SIT_QTY != null ? Math.ceil(holdings[+m.code]?.SIT_QTY) : '',
                    stock_in_hand: holdings[+m.code]?.SIH_QTY != null ? Math.ceil(holdings[+m.code]?.SIH_QTY).toString() : '',
                    open_order: holdings[+m.code]?.OO_QTY != null ? Math.ceil(holdings[+m.code]?.OO_QTY) : '',
                    sih_closing_stock_date: holdings[+m.code]?.SIH_CLOSING_STOCK_DATE ?? '',
                    oo_update_time: holdings[+m.code]?.OO_UPDATE_TIME ?? '',
                    sit_update_time: holdings[+m.code]?.SIT_UPDATE_TIME ?? '',
                };
            });
            if (response) return response;
            return null;
        } catch (error) {
            logger.error('Error in ArsService -> fetchSkuStockData', error);
            return null;
        }
    },

    async arsAutoSubmit(id: number, distId: string, holding: {}[] | null) {
        /**
         * TODO: FEATURE NOT IMPLEMENTED YET
         */

        /**
         * fetch app settings for PDP window, ARS flag and auto submit flag
         * create an array of regions metro and non-metro separately for which global ARS and Auto-submit are enabled.
         * fetch all distributors who are GT-METRO and GT-NonMetro, active, not deleted and ARS at DB level is enabled and falls in the above created area_codes;
         * for each DB fetch the PDP of each divisions, with distribution-channel = 10
         * if PDP flag at global level or DB level is off, then recommended materials list is to be generated for all the divisions.
         * else find the active divisions and create array of those divisions.
         * [**IMPORTANT NOTE**: PDP closing window time should not be considered, only consider the date/day. Otherwise if we run the api after the PDP window closure, then all the divisions will show out of PDP window]
         * [**IMPORTANT NOTE**: If AOR has been placed within the PDP window then do not auto-submit]
         * fetch the recommendation materials by distributor code and division array
         * generate the SAP request body, apply the portal side validations
         * send the list for SAP validations
         * if error is encountered for any line item, remove the line item and get the materials validated again
         * on successful validation, submit the order
         * if error encountered during submit, then generate Report Issue
         * ?? What will be the default sold-to and ship-to?
         * ?? Cases where SIH < SS, should order be auto-submited?
         */
        /**
         * This function will accept a distributor code and holdings, and a id to identify the row in audit.aos_workflow table
         * Using the id, fetch the items from audit.aos_workflow_items table
         * Fetch the calculated stock-norm from for the distributor
         * Fetch material conversion factors
         * Fetch rule-configurations
         * Fetch soq-norm
         * Fetch distributor-psku-soq-norm
         * Fetch orders placed
         * Calculate the SOQ for each item
         */
        logger.info(`inside ArsService -> arsAutoSubmit: id: ${id}, db_code: ${distId}`);
        const soq_logs: {
            forecastedPSKUDistWise?: any;
            conversionArray?: any;
            soqNorm?: any;
            skuSoqNorm?: any;
            stockNorm?: any;
            excludedPSKU?: any;
            lastOrderDetails?: any;
            finalArray?: any;
            error?: string;
        } = {};
        let error: string = '';
        try {
            const applicableMonth = Helper.applicableMonth();
            const [orderDetails, stockNormResult, distributorProfile, excludedPSKU, soqNormsResult, skuSoqNormResult, normCycleSafetyValues, conversionArray] = await Promise.all([
                ArsModel.fetchAosOrderPayload(id),
                ArsModel.getTentativeOrderDetails(distId, applicableMonth),
                UserService.fetchDistributorDetails(distId),
                ArsModel.getRuleConfigPSKU(distId),
                ArsModel.findApplicableSoqNorms(null, applicableMonth),
                ArsModel.findApplicableSkuSoqNorm(distId, applicableMonth),
                ArsService.getStockNormByPsku(distId, applicableMonth),
                ArsModel.getMaterialConversion(),
            ]);
            if (!orderDetails) {
                error = `No order details found for id: ${id}`;
                return null;
            }
            if (orderDetails?.length && !orderDetails[0]?.pdp?.applicable_divisions) {
                error = `No applicable divisions found for distributor: ${distId}`;
                return null;
            }

            if (!stockNormResult) {
                error = `No stock norm found for distributor: ${distId}`;
                return null;
            }

            if (!distributorProfile) {
                error = `No distributor profile found for distributor: ${distId}`;
                return null;
            }

            const stockNorm = arsHelpers.rekey(stockNormResult, 'psku', 'stock_norm_cv');
            const base_to_case = arsHelpers.rekey(conversionArray, 'code', 'buom_to_cs');
            const pac_to_case = arsHelpers.rekey(conversionArray, 'code', 'pak_to_cs');
            const sih = arsHelpers.rekey(holding, 'SKU', 'SIH_QTY');
            const sit = arsHelpers.rekey(holding, 'SKU', 'SIT_QTY');
            const oo = arsHelpers.rekey(holding, 'SKU', 'OO_QTY');
            const soqNorm = arsHelpers.rekey(soqNormsResult, 'psku', 'soq');
            const skuSoqNorm = arsHelpers.nestedRekey(skuSoqNormResult, ['distributor_code', 'material_code', 'soq_norm']);

            const forecastedPSKUDistWise: ForecastedPskuDistWise[] | null = orderDetails[0]?.order_payload?.original_items?.map((i) => ({
                class: i.class,
                distributor_code: distId,
                sku: i.material_code,
                pac_to_case: pac_to_case[i.material_code] ?? 1,
                buom_to_case: base_to_case[i.material_code] ?? 1,
            }));

            soq_logs.forecastedPSKUDistWise = forecastedPSKUDistWise;
            soq_logs.conversionArray = conversionArray;
            soq_logs.soqNorm = soqNorm;
            soq_logs.skuSoqNorm = skuSoqNorm;
            soq_logs.stockNorm = stockNorm;
            soq_logs.excludedPSKU = excludedPSKU;

            //fetching the last order details of the distributor for the current date
            let lastOrderDetails = await ArsModel.getLastOrdersByDivision(orderDetails[0]?.pdp?.applicable_divisions, distId);
            soq_logs.lastOrderDetails = lastOrderDetails;
            let finalArray = await ArsRules.getSuggestedOrder(
                distId,
                forecastedPSKUDistWise,
                sit,
                sih,
                oo,
                stockNorm,
                base_to_case,
                pac_to_case,
                lastOrderDetails,
                excludedPSKU,
                normCycleSafetyValues,
                soqNorm,
                skuSoqNorm[distId],
                true,
            );
            soq_logs.finalArray = finalArray;
            return finalArray;
        } catch (error) {
            logger.error('Caught error in ArsService -> arsAutoSubmit', error);
            return false;
        } finally {
            try {
                soq_logs.error = error;
                AuditModel.upsertAosLogs({
                    distributor_code: distId,
                    soq_calculations: soq_logs,
                });
            } catch (error) {
                logger.error('CAUGHT: Error in ArsService -> arsAutoSubmit, while logging', error);
            }
        }
    },

    async getSuggestedMaterialsAutoValidation(distId: any, division: any) {
        /**
         * This function is a replication of getSuggestedMaterials(), except in few places
         */
        logger.info('inside ArsService -> getSuggestedMaterialsAutoValidation');
        try {
            // Get asm_code for distId
            const area_code = await ArsModel.getAreaCodeForDist(distId);

            // Check and stop the excution if the forecast is not available
            const forecastCheckForDist = await ArsModel.checkForecastForDist(distId, area_code);
            if (!forecastCheckForDist) {
                logger.info(`DistributorID: ${distId} on ${new Date().toLocaleDateString()} No forecast found`);
                return `DistributorID: ${distId} on ${new Date().toLocaleDateString()} No forecast found`;
            }

            // Fetch Stock Norm, Cycle Stock, Safety Stock.
            const normCycleSafetyValues = await ArsModel.getNormCycleSafetyValues(distId);
            // Fetch dist pdp distribution array
            const distPdpDistributionArray = await ArsModel.getDistPdpDistribution(distId, division);

            if (distPdpDistributionArray.length <= 0) {
                return 'Forecast Distribution not found';
            }

            const weekColumnsPskuWise = await AutoValidationRules.getWeekDaysPskuWise(distPdpDistributionArray, normCycleSafetyValues[0]);
            logger.info('weekColumnsPskuWise', weekColumnsPskuWise);
            const forecastedPSKUDistWise = await ArsModel.getForecastedPSKUDistWise(distId, area_code);
            const stockNormData = await ArsModel.getStockNormTotal(distId, weekColumnsPskuWise[0]);

            //CHANGES: SIH, SIT, OO not required, since we are considering one month ahead for autoValidation
            let conversionArray = await ArsModel.getMaterialConversion(area_code);

            let base_to_case = await arsHelpers.rekey(conversionArray, 'code', 'buom_to_cs');
            let pac_to_case = await arsHelpers.rekey(conversionArray, 'code', 'pak_to_cs');

            let finalArray = await AutoValidationRules.getSuggestedOrder(forecastedPSKUDistWise, stockNormData, distId, base_to_case, pac_to_case);

            return finalArray;
        } catch (error) {
            logger.error('Error in ArsService -> getSuggestedMaterialsAutoValidation', error);
            return null;
        }
    },

    /** As per SOPE-1095(https://tataconsumer.atlassian.net/browse/SOPE-1095) this logic is deprecated */
    async automatedArsValidation() {
        /**
         * We must validate for all the psku, change 0 or negative quantity to 1
         * While generating recommendation applicable_month will be next month, not current month
         */
        logger.info('inside ArsService -> automatedArsValidation');
        try {
            //find the distributor list along with all the divisions and ARS enabled, one from each area
            const distList = await ArsModel.fetchArsDistributorList([]);

            async function worker(dist: { distributor_code: string; divisions: any[] }) {
                //find recommended materials
                const recommendationPromise = ArsService.getSuggestedMaterialsAutoValidation(dist.distributor_code, dist.divisions);

                //find the region details, divisions, and pdp
                // const regionDetailsPromise = UserService.getUserDetails(dist.distributor_code);
                // const regionDetailsPromise = UserService.fetchDistributorDetails(dist.distributor_code);
                const regionDetails = await UserService.fetchDistributorDetails(dist.distributor_code);
                const isNourishco: boolean = regionDetails['is_nourishco'] === true;

                //find all the materials list from SAP
                const materialsPromise = UserService.getMaterialsList(dist.distributor_code, null);

                //fetch warehouse details
                const warehouseDetailsPromise = SapApi.getWarehouseDetails(dist.distributor_code, isNourishco ? '90' : '10', dist.divisions);

                return Promise.all([recommendationPromise, materialsPromise, warehouseDetailsPromise])
                    .then(([recommendation, materials, warehouseDetails]) => {
                        const mappedAutoOrderDetails = ArsAutoSubmitRules.mapAutoOrderDetails(recommendation, regionDetails, materials);
                        if (!warehouseDetails?.data?.shipping_point) {
                            throw new Error('Warehouse details not found.');
                        }

                        //map the ship-to and unloading-point
                        const partnerList = [
                            {
                                partner_role: 'AG',
                                partner_number: dist.distributor_code,
                            },
                        ];

                        //check if ship-to available with the distributorId, then consider that as ship-to else take the first option
                        const shipToWithDistIdPresent = !!warehouseDetails.data.shipping_point.find(
                            (item: { partner_code: string }) => item.partner_code === dist.distributor_code,
                        );
                        const partnerCode = shipToWithDistIdPresent ? dist.distributor_code : warehouseDetails.data.shipping_point[0].partner_code;
                        partnerList.push({
                            partner_role: 'WE',
                            partner_number: partnerCode,
                        });

                        const unloadingPointWIthDistIdPresent = !!warehouseDetails.data.unloading_point?.find(
                            (item: { partner_code: string }) => item.partner_code === dist.distributor_code,
                        );
                        const unloadingPartnerCode = unloadingPointWIthDistIdPresent ? warehouseDetails.data.unloading_point[0]?.partner_code : dist.distributor_code;
                        partnerList.push({
                            partner_role: 'Y1',
                            partner_number: unloadingPartnerCode,
                        });

                        create_order.setValue('partners', partnerList);
                        create_order.setValue('distribution_channel', isNourishco ? '90' : '10');
                        create_order.setValue('sales_org', '1010');
                        create_order.setValue('items', mappedAutoOrderDetails);
                        create_order.setValue('distributor', dist.distributor_code);
                        create_order.setValue('order_type', 'Auto-Order');

                        //validate the line items and create an error object
                        const validatePromise = ArsAutoSubmitRules.handleValidate(create_order);
                        const errorObjPromise = validatePromise.then((validate) => ArsAutoSubmitRules.handleValidationErrors(regionDetails, create_order.items, validate?.data));

                        return Promise.all([validatePromise, errorObjPromise]);
                    })
                    .then(([validate, errorObj]) => {
                        // report validation error
                        return SapApi.reportValidationError(dist.distributor_code, errorObj);
                    })
                    .catch((error) => {
                        // handle and log any errors
                        logger.error('Error occurred in ArsService -> automatedArsValidation -> worker:', error);
                    });
            }

            const noOfThreads = distList.length || 1;
            const channel = workerThread.createChannel(worker, noOfThreads);

            channel.on('done', (error: any, result: any) => {
                if (error) {
                    logger.error('Error in ArsService -> automatedArsValidation:- on.done: execution: ', error);
                }
                logger.info('Result in ArsService -> automatedArsValidation: on.done ', result);
            });

            channel.on('stop', () => {
                logger.info('ArsService -> automatedArsValidation: All Execution completed: Channel is stop');
                return distList;
            });

            for (const dist of distList) {
                channel.add(dist);
            }
        } catch (error) {
            logger.error('Caught Error in ArsService -> automatedArsValidation ', error);
            throw error;
        }
    },

    async getStockNormAudit(userId: string, roles: string, customer_group: string, arsEnabledDB: boolean = true, offset: number = 0, limit: number = 10, distIdArr: any = null) {
        logger.info('inside ArsService -> getStockNormAudit');
        const result: any = await ArsModel.getStockNormAudit({
            customer_group,
            arsEnabledDB,
            distIdArr,
            offset,
            limit,
        });
        return result;
    },

    async downloadStockNormAudit(arsEnabledDB: boolean = true, distIdArr: any = null, overwrite_s3: boolean = false) {
        logger.info('inside ArsService -> downloadStockNormAudit');
        try {
            if (overwrite_s3) {
                /**
                 * if overwrite_s3 is true, then is most probably called after update to stock norm config.
                 * this wait is necessary to ensure reader and writer consistency in the DB
                 */
                await Helper.wait(5000);
            }
            const today = new Date();
            const currentDate = today.toLocaleDateString('en-GB').split('/').join('-');
            const currentTimestamp = today.getTime();
            const s3Response = {};
            if (distIdArr?.length > 0) {
                const fileName = `stock_norm_audit_dist_${currentTimestamp}.xlsx`;
                const stockNormResult = await ArsModel.downloadStockNormAudit({
                    arsEnabledDB,
                    distIdArr,
                });
                if (stockNormResult?.length > 0) {
                    const data = Helper.createXlsxFile([stockNormResult], ['stock-norm'], fileName, false, CreateXlsxFileReturnType.BUFFER);
                    const s3UploadResponse = (await S3Helper.uploadForecastFile(data.fileData, fileName, 'download')) || {};
                    const location = s3UploadResponse['Location'] || '';
                    const bucket = s3UploadResponse['Bucket'] || '';
                    const responseKey = s3UploadResponse['Key'] || '';
                    if (location) {
                        const path = responseKey;
                        const downloadUrl = (await S3Helper.createSignedUrl(bucket, path)) || '';
                        s3UploadResponse['downloadUrl'] = downloadUrl;
                    }
                    s3Response['Region'] = s3UploadResponse;
                }
            } else {
                const areaCodesResult = await ArsModel.fetchAreaCodes();
                const regionAreaCodeMapping = {};
                areaCodesResult?.forEach((area) => {
                    if (!regionAreaCodeMapping[area.region]) {
                        regionAreaCodeMapping[area.region] = [];
                    }
                    regionAreaCodeMapping[area.region].push(area.code);
                });
                for (let region in regionAreaCodeMapping) {
                    /**
                     * SCENARIO: On first download arsEnableDB = true, and files got uploaded to S3.
                     * Now if we download again, with arsEnabledDB = false, then new set of files should be uploaded to S3 and then downloaded.
                     * It should not be that first set of files are getting download.
                     * This is the reason we are using two different file names based on arsEnabledDB value.
                     */
                    const fileName = arsEnabledDB ? `stock_norm_ars_enabled_db_${region}_${currentDate}.xlsx` : `stock_norm_all_db_${region}_${currentDate}.xlsx`;
                    const s3ExistingResponse = (await S3Helper.checkIfForecastFileExists(fileName, 'download')) || {};
                    if (!overwrite_s3 && s3ExistingResponse['ContentLength']) {
                        logger.info('inside ArsService -> downloadStockNormAudit: File Exists: ' + fileName);
                        s3Response[region] = s3ExistingResponse;
                    } else {
                        const stockNormResult = await ArsModel.downloadStockNormAudit({
                            arsEnabledDB,
                            areaCodes: regionAreaCodeMapping[region],
                        });
                        if (stockNormResult?.length > 0) {
                            const areaWiseStockNorm = {};
                            stockNormResult?.forEach((sn) => {
                                if (!areaWiseStockNorm[sn['Area Code']]) {
                                    areaWiseStockNorm[sn['Area Code']] = [];
                                }
                                areaWiseStockNorm[sn['Area Code']].push(sn);
                            });

                            const data = Helper.createXlsxFile(Object.values(areaWiseStockNorm), Object.keys(areaWiseStockNorm), fileName, false, CreateXlsxFileReturnType.BUFFER);
                            const s3UploadResponse = (await S3Helper.uploadForecastFile(data.fileData, fileName, 'download')) || {};
                            const location = s3UploadResponse['Location'] || '';
                            const bucket = s3UploadResponse['Bucket'] || '';
                            const responseKey = s3UploadResponse['Key'] || '';
                            if (location) {
                                const path = responseKey;
                                const downloadUrl = (await S3Helper.createSignedUrl(bucket, path)) || '';
                                s3UploadResponse['downloadUrl'] = downloadUrl;
                            }
                            s3Response[region] = s3UploadResponse;
                            logger.info(
                                `ArsService -> downloadStockNormAudit: Region: ${region}: Allocated Heap Memory: ${process.memoryUsage().heapTotal / 1024 / 1024}MB,  Heap Memory Usage: ${process.memoryUsage().heapUsed / 1024 / 1024}MB`,
                            );
                        }
                    }
                }
            }
            return s3Response;
        } catch (error) {
            logger.error('Caught Error in ArsService -> downloadStockNormAudit', error);
            return null;
        }
    },

    async updateStockNormConfig(
        updates: Array<{
            id: number;
            stock_norm: number;
            ss_percent: number;
            class_of_last_update: string;
        }>,
        userId: string,
    ) {
        logger.info('inside ArsService -> updateStockNormConfig');

        try {
            const updatedData: Array<{
                id: number;
                stock_norm: number;
                ss_percent: number;
                updated_by: any;
                class_of_last_update: string;
            }> = updates.map((item) => ({ ...item, updated_by: userId }));
            await ArsModel.updateStockNormConfig(updatedData);
            return true;
        } catch (error) {
            logger.error('Caught Error in ArsService -> updateStockNormConfig ', error);
            return error.message;
        }
    },

    async getStockNormByPsku(distId: string | string[], applicableMonth: string = Helper.applicableMonth(), ofCurrentMonth: boolean = false): Promise<DistributorPskuSN> {
        logger.info('inside ArsService -> getStockNormByPsku');
        try {
            let distributors: string[] = [];
            if (typeof distId === 'string') {
                distributors = [distId];
            } else {
                distributors = distId;
            }
            const stockNorm: any = await ArsModel.getStockNorm(distributors.join(','), applicableMonth);

            let pskuStockNorm = {};
            let distributorPskuStockNorm = {};
            if (typeof distId === 'string') {
                stockNorm?.forEach((s: { psku: string | number; stock_norm: number | null; ss_percent: number | null; pak_to_cs: number; buom_to_cs: number | null }) => {
                    pskuStockNorm[s.psku] = {
                        stock_norm: s.stock_norm,
                        safety_stock: s.ss_percent,
                        pak_to_cs: s.pak_to_cs,
                        buom_to_cs: s.buom_to_cs,
                    };
                });
                return pskuStockNorm;
            } else {
                stockNorm?.forEach((i) => {
                    if (!distributorPskuStockNorm[i.dist_id]) distributorPskuStockNorm[i.dist_id] = {};
                    distributorPskuStockNorm[i.dist_id][i.psku] = {
                        stock_norm: i.stock_norm,
                        safety_stock: i.ss_percent,
                        pak_to_cs: i.pak_to_cs,
                        buom_to_cs: i.buom_to_cs,
                    };
                });
                return distributorPskuStockNorm;
            }
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> getStockNormByPsku', error);
            throw error;
        }
    },

    async getMoqMappingData(area: string | null | undefined, search: string | null | undefined, role: string[], email: string, limit: number, offset: number) {
        logger.info('inside ArsService -> getMoqMappingData');
        try {
            const rows = await ArsModel.getMoqMappingData(area, search, role, email, limit, offset);
            const totalCount = await ArsModel.getMoqMappingDataCount(area, search, role, email);
            return { totalCount, rows };
        } catch (error) {
            logger.error('inside ArsService -> getMoqMappingData,Error: ', error);
            return null;
        }
    },

    async updateMoq(moq_data: { dbId: string; plantId: number; moq: number }[], user: any) {
        logger.info('inside ArsService -> updateMoq');
        try {
            let success: boolean = true;
            for (let data of moq_data) {
                const response = await ArsModel.updateMoq(data['dbId'], data['plantId'], data['moq'], user);
                success = success && response;
            }

            return success;
        } catch (error) {
            logger.error('inside ArsService -> updateMoq,Error: ', error);
            return null;
        }
    },

    async getDistributorMoq(dbCode: string, plantCodes: string[]) {
        logger.info('inside ArsService -> getMoqMappingData');
        try {
            const rows = await ArsModel.getDistributorMoq(dbCode, plantCodes);
            return rows;
        } catch (error) {
            logger.error('inside ArsService -> getDistributorMoq, Error: ', error);
            return null;
        }
    },

    /**
     * SOPE-1095(https://tataconsumer.atlassian.net/browse/SOPE-1095)
     * This function is used to  validate if all the PSKUs that are forecasted for the current month or next month are getting validated from SAP.
     * The purpose of this function is not to check the ARS logic flow, but to check if the PSKUs are getting validated from SAP.
     *
     * SOPE-1539(https://tataconsumer.atlassian.net/browse/SOPE-1539)
     * This function is also used to store the distributor landing price(DLP) details in the database.
     */
    async automatedARSValidationSAP(areaCode: string[], applicableMonth: string = Helper.applicableMonth()) {
        logger.info('inside ArsService -> automatedARSValidationSAP');
        let rerunDistributorsList: any[] = [];
        let rerunCounter = 0;
        const maxRerunCounter = 5; //maximum number of times the job can be rerun for the same area/customer_group combination, this is to prevent infinite loop
        const dlpRunningLog = {};
        try {
            //find the distributor list along with all the divisions and ARS enabled, one from each area
            const distList = await ArsModel.fetchDistributorListForPricing(areaCode);

            function maintainDLPLog(distributorId: string, customerGroup: string | number, area: string) {
                const key = `${area}#${customerGroup}`;
                if (!dlpRunningLog[key]) {
                    dlpRunningLog[key] = [];
                } else {
                    dlpRunningLog[key].push(distributorId);
                }
            }
            async function worker(dist: { distributor_code: string; area_code: string; channel_code: string; divisions: any[] }) {
                try {
                    //find recommended materials
                    const recommendation = await ArsModel.getForecastedMaterialsMaterialMaster(dist.distributor_code, dist.area_code, dist.channel_code);

                    //find the region details, divisions, and pdp
                    // const regionDetails = await UserService.getUserDetails(dist.distributor_code);
                    const regionDetails = await UserService.fetchDistributorDetails(dist.distributor_code);
                    const isNourishco: boolean = regionDetails['is_nourishco'] === true;

                    maintainDLPLog(dist.distributor_code, dist.area_code, regionDetails?.customer_group_code);

                    //fetch warehouse details
                    const warehouseDetails = await SapApi.getWarehouseDetails(dist.distributor_code, isNourishco ? '90' : '10', dist.divisions);

                    const mappedAutoOrderDetails = ArsAutoSubmitRules.mapDLPOrderDetails(recommendation);
                    if (!warehouseDetails?.data?.shipping_point) {
                        logger.error('Error in ArsService -> automatedARSValidationSAP:  Warehouse details not found. For dist: ', dist);
                        const combination = {
                            area: dist.area_code,
                            customer_group: regionDetails?.customer_group_code,
                            distributor_code: dlpRunningLog[`${dist.area_code}#${regionDetails?.customer_group_code}`],
                        };
                        const rerunDist = await ArsModel.fetchDistributorListForPricing(null, combination);
                        rerunDistributorsList.push(rerunDist);
                        return;
                    }

                    //map the ship-to and unloading-point
                    /**
                     * AG: Sold-To (Distributor)
                     * WE: Ship-To
                     * Y1: Unloading Point
                     */
                    const partnerList = [
                        {
                            partner_role: 'AG',
                            partner_number: dist.distributor_code,
                        },
                    ];

                    //check if ship-to available with the distributorId, then consider that as ship-to else take the first option
                    const shipToWithDistIdPresent = !!warehouseDetails.data.shipping_point.find((item: { partner_code: string }) => item.partner_code === dist.distributor_code);
                    const partnerCode = shipToWithDistIdPresent ? dist.distributor_code : warehouseDetails.data.shipping_point[0].partner_code;
                    partnerList.push({
                        partner_role: 'WE',
                        partner_number: partnerCode,
                    });

                    const unloadingPointWIthDistIdPresent = !!warehouseDetails.data.unloading_point?.find(
                        (item: { partner_code: string }) => item.partner_code === dist.distributor_code,
                    );
                    const unloadingPartnerCode = unloadingPointWIthDistIdPresent ? warehouseDetails.data.unloading_point[0]?.partner_code : dist.distributor_code;
                    partnerList.push({
                        partner_role: 'Y1',
                        partner_number: unloadingPartnerCode,
                    });

                    create_order.setValue('partners', partnerList);
                    create_order.setValue('distribution_channel', isNourishco ? '90' : '10');
                    create_order.setValue('sales_org', '1010');
                    create_order.setValue('items', mappedAutoOrderDetails);
                    create_order.setValue('distributor', dist.distributor_code);
                    create_order.setValue('order_type', 'Auto-Order');

                    //validate the line items and create an error object
                    const validate = await ArsAutoSubmitRules.handleValidate(create_order);
                    const errorObj = ArsAutoSubmitRules.handleValidationErrors(regionDetails, create_order.items, validate?.data);

                    const errorResponse = JSON.parse(JSON.stringify(errorObj));
                    //if all PSKU have tentative amount = 0, then it signifies our chosen distributor has some issue from SAP(eg. order blocked, or Ship-to party not defined for sales area, etc.)
                    //hence in such cases we have to re-run the job for the same area/customer_group combination but with a different distributor
                    if (errorResponse?.allTentativeAmountsZero || errorResponse?.dbSpecificErrorExist) {
                        const combination = {
                            area: dist.area_code,
                            customer_group: regionDetails?.customer_group_code,
                            distributor_code: dlpRunningLog[`${dist.area_code}#${regionDetails?.customer_group_code}`],
                        };
                        const rerunDist = await ArsModel.fetchDistributorListForPricing(null, combination);
                        rerunDistributorsList.push(rerunDist);
                    } else if (Object.keys(errorResponse?.logObj?.sales_order_data)?.length > 0) {
                        //insert records for distributor pricing
                        await ArsModel.insertDistributorPricingDetails(
                            dist.distributor_code,
                            regionDetails?.customer_group_code,
                            regionDetails?.area_code,
                            errorResponse?.logObj?.sales_order_data,
                            {
                                errors: errorResponse?.logObj?.errors,
                                itemsSentForValidationCount: errorResponse?.itemsSentForValidationCount,
                                itemNumbersReceivedFromSAPValidationResponse: errorResponse?.itemNumbersReceivedFromSAPValidationResponseCount,
                                missingItemsFromSAPValidation: errorResponse?.missingItemsFromSAPValidation,
                            },
                        );
                    }
                    if (errorResponse?.logObj?.errors?.length > 0) {
                        delete errorResponse?.allTentativeAmountsZero;
                        delete errorResponse?.itemNumbersReceivedFromSAPValidationResponseCount;
                        delete errorResponse?.missingItemsFromSAPValidation;
                        delete errorResponse?.itemsSentForValidationCount;
                        delete errorResponse.dbSpecificErrorExist;
                        //report validation error
                        SapApi.reportValidationError(dist.distributor_code, errorResponse);
                    }
                } catch (error) {
                    // handle and log any errors
                    logger.error('Error occurred in ArsService -> automatedArsValidation -> worker:', error);
                }
            }

            for (const dist of distList) {
                await worker(dist);
            }
            while (rerunDistributorsList.length !== 0 && rerunCounter <= maxRerunCounter) {
                logger.info('inside ArsService -> automatedARSValidationSAP: Rerunning the job: RerunCounter: ', rerunCounter);
                await rerun();
            }

            async function rerun() {
                rerunCounter++;
                const tempRerunDistributorsList = JSON.parse(JSON.stringify(rerunDistributorsList)); //deep copy: This is to avoid updating the for-loop variable
                rerunDistributorsList = [];
                logger.info('in ArsService -> automatedARSValidationSAP: Rerunning the job for the following area_code and customer_group combination: ', rerunDistributorsList);
                for (const dist of tempRerunDistributorsList) {
                    await worker(dist[0]);
                }
            }
            LogService.insertSyncLog('DLP_SYNC', 'SUCCESS');
            return null;
        } catch (error) {
            logger.error('Caught Error in ArsService -> automatedARSValidationSAP ', error);
            LogService.insertSyncLog('DLP_SYNC', 'FAIL', null, null, `${error}`);
            return null;
        } finally {
            logger.info('in ArsService -> automatedARSValidationSAP: All execution complete');
        }
    },

    async syncStockNormConfig(applicableMonth: string) {
        logger.info(`inside ArsService -> syncStockNormConfig: applicableMonth = ${applicableMonth}`);
        try {
            const syncStockNorm = await ArsModel.syncStockNormConfig(applicableMonth);
            return syncStockNorm;
        } catch (error) {
            logger.error('CAUGHT Error in ArsService -> syncStockNormConfig', error);
            return null;
        }
    },

    async getStockNormDefault(customerGroup: string) {
        logger.info('inside ArsService -> getStockNormDefault');
        return await ArsModel.getStockNormDefault(customerGroup);
    },

    async updateStockNormDefault(customerGroup: string, data: any) {
        logger.info('inside ArsService -> updateStockNormDefault');
        const result1 = await ArsModel.updateStockNormDefault(customerGroup, data);
        let currentMonth = Helper.applicableMonth();
        let upcomingMonth = Helper.applicableMonth('next');
        const forecastCurrentMonth = `01-${new Date(currentMonth.substring(4)).toLocaleString('default', { month: 'short' })}-${currentMonth.substring(2, 4)}`;
        const forecastupcomingMonth = `01-${new Date(upcomingMonth.substring(4)).toLocaleString('default', { month: 'short' })}-${upcomingMonth.substring(2, 4)}`;
        const result2 = await ArsModel.updateStockNormConfigSafetyPercentage(customerGroup, data, currentMonth, upcomingMonth, forecastCurrentMonth, forecastupcomingMonth);
        return result1 && result2;
    },

    async getAllArsTolerance(customerGroup: string) {
        logger.info('inside ArsService -> getAllArsTolerance');
        return await ArsModel.getAllArsTolerance(customerGroup);
    },

    async getArsTolerance(customerGroup: string, areaCode: string) {
        logger.info('inside ArsService -> getArsTolerance');
        return await ArsModel.getArsTolerance(customerGroup, areaCode);
    },

    async updateArsTolerance(
        data: Array<{
            class_a_max: string;
            class_b_max: string;
            class_c_max: string;
            class_a_min: string;
            class_b_min: string;
            class_c_min: string;
            remarks: string;
            id: string;
        }>,
        updatedBy: string,
    ) {
        logger.info('inside ArsService -> updateArsTolerance');
        try {
            let res: boolean = true;
            for (let item of data) {
                const rowCount: number = await ArsModel.updateArsTolerance(item, updatedBy);
                res = res && rowCount > 0;
            }
            return res;
        } catch (error) {
            logger.error('CAUGHT Error in ArsService -> updateArsTolerance', error);
            return false;
        }
    },

    async fetchArsReportAreaWise() {
        logger.info('inside ArsService -> fetchArsReport');
        try {
            const areas = (await ArsModel.fetchArsEnabledAreaCodesWithTse()) ?? [];
            for (const area of areas) {
                const report = await ArsModel.fetchArsReport(area['area_code']);
                let fileDetails: {
                    filePath: string;
                    fileName: string;
                } | null = null;
                const asmEmailsSet: Set<string> = new Set();
                if (report) {
                    fileDetails = Helper.createXlsxFile([report], ['order_details'], `ars_report_${area['area_code']}`, true);
                    /**
                     * EDGE CASE: if for an area_code there are multiple ASM, and TSEs are distributed among them, then all ASM emails will not be fetched since we are considering the first TSE only.
                     * In such case we have to run a loop on all the tse_code and find the unique email ids of ASM.
                     */
                    const salesHierarchyDetails = await UserService.fetchSalesHierarchyDetails(area['tse'][0]);
                    salesHierarchyDetails['ASM']?.forEach((item: { email: string }) => asmEmailsSet.add(item.email?.toLowerCase()));
                }
                Email.arsReport(fileDetails, null, [...asmEmailsSet], area['area_code']);
            }
            return null;
        } catch (error) {
            logger.error('Error in ArsService -> fetchArsReport');
            return null;
        }
    },

    async mtdApiValues(dbList: Array<{ customer: string }>, sku: string, type: string, doctype: string) {
        const payload = {
            customer_list: dbList,
            sku: sku,
            type: type,
            doctype: doctype,
        };
        const response = dbList.length > 0 ? await ArsService.makeApiCallsToGetValues(payload) : null;
        return response;
    },
    async sendForecastWindowNotification() {
        logger.info('Inside ArsService -> sendForecastWindowNotification');
        try {
            const appSettings = await UserModel.getAppLevelSettings(null);
            if (!appSettings?.length) return false;
            let open_date: number = 0,
                close_date: number = 31,
                mid_date: number = 0,
                today: any = new Date();
            appSettings?.forEach((item: { key: string; value: string }) => {
                if (item.key === 'AO_METRO_ADJUSTMENT_START_DATE' || item.key === 'AO_NON_METRO_ADJUSTMENT_START_DATE') open_date = Math.max(open_date, +item.value);
                if (item.key === 'AO_METRO_ADJUSTMENT_END_DATE' || item.key === 'AO_NON_METRO_ADJUSTMENT_END_DATE')
                    close_date = Math.min(close_date, +item.value, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());
            });
            mid_date = Math.trunc((open_date + close_date) / 2);
            if (today.getDate() === open_date || today.getDate() === close_date || today.getDate() === mid_date) {
                const recipients: any = await ArsModel.fetchAsmRsmData();
                if (!recipients?.length) return false;
                const rsmSet: string[] = Array.from(
                    new Set(
                        recipients
                            ?.filter((item: any) => item.rsm_email?.toLowerCase().endsWith('@tataconsumer.com'))
                            .map((item: any) => ({
                                email: item.rsm_email,
                                name: item.rsm_name,
                            })),
                    ),
                );
                if (today.getDate() === open_date) {
                    rsmSet.forEach((rsm: any) => {
                        let to: string[] = [rsm.email];
                        let cc: string[] = Array.from(
                            new Set(
                                recipients
                                    ?.filter((item: any) => item.asm_email?.toLowerCase().endsWith('@tataconsumer.com') && item.rsm_email === rsm.email)
                                    .map((item: any) => item.asm_email),
                            ),
                        );
                        cc = [...cc, GrpEmail];
                        let name: string = rsm.name;
                        Email.forecastWindowOpen({ to, cc, name });
                    });
                } else {
                    const areaZones: any = await UserModel.fetchAreaZones();
                    if (!areaZones?.length) return false;
                    const zonesMap = new Map(areaZones?.map((item: any) => [item.area_code, item.zone]));
                    const arsUpdateData: any = await ArsModel.fetchForecastAndConfigUpdateData();
                    if (!arsUpdateData?.length) return false;
                    const updateMap = new Map(
                        arsUpdateData?.map((item: any) => [
                            item.area_code,
                            {
                                fc_iu: item.fc_is_updated ? 'Y' : 'N',
                                fc_ub: item.fc_is_updated ? item.fc_updated_by : '-',
                                f_iu: item.f_is_updated ? 'Y' : 'N',
                                f_ub: item.f_is_updated ? item.f_updated_by : '-',
                                zone: zonesMap.get(item.area_code),
                                area: item.area_code,
                            },
                        ]),
                    );
                    let year = '',
                        month = '';
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    // if (today.getMonth() == 11) {
                    //     var next = new Date(today.getFullYear() + 1, 0, 1);
                    //     year = next.getFullYear() + '';
                    //     month = monthNames[next.getMonth()];
                    // } else {
                    //     var next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                    //     year = next.getFullYear() + '';
                    //     month = monthNames[next.getMonth()];
                    // }

                    rsmSet.forEach((rsm: any) => {
                        let to: string[] = [rsm.email];
                        let cc: string[] = [];
                        let name: string = rsm.name;
                        let cc_set: Set<string> = new Set();
                        let tableData: any[] = [];
                        let td_set: Set<any> = new Set();
                        recipients
                            ?.filter((item: any) => item.asm_email?.toLowerCase().endsWith('@tataconsumer.com') && item.rsm_email === rsm.email)
                            .forEach((item: any) => {
                                cc_set.add(item.asm_email);
                                let area_codes: string[] = item.area_code.split(',');
                                area_codes?.forEach((area_code: string) => {
                                    area_code = area_code.trim().substring(0, 4);
                                    let data: any = updateMap.get(area_code);
                                    if (data != undefined) {
                                        td_set.add(data);
                                    }
                                });
                            });
                        cc = Array.from(cc_set);
                        cc = [...cc, GrpEmail];
                        tableData = Array.from(td_set);
                        if (tableData.length > 0) {
                            let emailData = {
                                to,
                                cc,
                                name,
                                tableData,
                                close_date,
                                month: monthNames[today.getMonth()],
                            };
                            Email.forecastWindowClose(emailData);
                        }
                    });
                }
                return true;
            } else return false;
        } catch (error) {
            logger.error('Inside ArsService -> sendForecastWindowNotification, Error: ', error);
            return false;
        }
    },

    async getExcludedMaterials(distId: string) {
        return await ArsModel.getRuleConfigPSKU(distId);
    },

    async updateQuantityNorm(
        data: {
            area_code: string;
            quantity_norm: {
                psku: string;
                value: number;
            }[];
        },
        user_id: string,
    ) {
        /**
         * accept the payload
         * through service, generate the payload to be used by this.upsertForecastDistribution() to update the forecast distribution
         * and by this.updateForecastData() to update the forecast data
         */
        logger.info('Inside ArsService -> updateQuantityNorm');
        let response: boolean = true;
        try {
            for (let item of data.quantity_norm) {
                const forecastedDBs = await ArsModel.getForecastedDBByAreaPsKu(data.area_code, item.psku);
                const dbCount = forecastedDBs?.length ?? 1;
                if (dbCount === 0) {
                    logger.info('Inside ArsService -> updateQuantityNorm, No DBs found for the given area and psku');
                    continue;
                }
                const adjustedValues: UpdateForecastDataAdjusted[] =
                    forecastedDBs?.map((db) => {
                        return {
                            updated_allocation: +item.value,
                            distributorCode: db.sold_to_party,
                            sales_allocation_key: db.key,
                            pskuClass: db.class,
                        };
                    }) ?? [];
                const updateForecastData: UpdateForecastData = {
                    areaCode: data.area_code,
                    pskuCode: item.psku,
                    adjusted: adjustedValues,
                };

                await ArsService.upsertForecastDistribution(data.area_code, updateForecastData);
                const result = await ArsService.updateForecastData(updateForecastData, user_id);
                if (!result) response = false;
            }
            return response;
        } catch (error) {
            logger.error('Inside ArsService -> updateQuantityNorm, Error: ', error);
            return null;
        }
    },

    async saveForecastData(fileName: string, user: ValidateForecastDataUserType) {
        logger.info('Inside ArsService -> saveForecastData, file: ' + fileName);
        try {
            const S3Response = (await S3Helper.readForecastFile(fileName, 'upload')) || {};
            if (!S3Response['ContentLength']) {
                logger.error('inside ArsService -> saveForecastData, Error: File not found in S3');
                return false;
            }
            const fileData = S3Response['Body'];
            const jsonData = JSON.parse(fileData.toString() || '');

            const responseObj = {};
            for (const areaCode in jsonData) {
                const data = jsonData[areaCode];
                const validateResponse = await ArsService.validateForecastData(areaCode, data, user);
                if (!validateResponse?.status) {
                    responseObj[areaCode] = false;
                    continue;
                }
                let transformedData = await uploadedDataTransformer.jsonToDBMapping(data, areaCode);

                const existingForecast = await ArsModel.forecastSummaryAll(areaCode);
                if (existingForecast) {
                    const modifiedExistingForecast = existingForecast.map(({ parent_desc, customer_name, ...item }) => item);
                    //finding out rows that are modified
                    const modifiedRows = await ArsModel.findUploadedFileMismatchRecords(transformedData, modifiedExistingForecast, true);
                    const withSalesAllocation = arsHelpers.appendSalesAllocationKeyToUploadedFile(modifiedRows, modifiedExistingForecast);
                    //Filtering data with undefined allocation key (in the case of invalid db or psku)
                    const filteredWithSalesAllocation = withSalesAllocation.filter((item) => item.sales_allocation_key);

                    // uploadForecastDistribution is required to be called first then uploadForecastData
                    const uploadDistributionResult = await ArsService.uploadForecastDistribution(filteredWithSalesAllocation, areaCode);
                    const uploadForecastResult = uploadDistributionResult ? await ArsService.uploadForecastData(filteredWithSalesAllocation, user?.userId) : null;

                    responseObj[areaCode] = uploadForecastResult ? true : false;
                }
            }
            ArsModel.updateForecastUpdateDownloadLogs(fileName);
            return responseObj;
        } catch (e) {
            logger.error('inside ArsService -> saveForecastData, Error: ', e);
            return false;
        }
    },

    async validateForecastData(areaCode: string, jsonData: any[], user: ValidateForecastDataUserType) {
        logger.info('Inside ArsService -> validateForecastData, area: ' + areaCode);
        try {
            const { code, roles } = user;
            if (!code?.includes(areaCode) && roles.includes('ASM'))
                return {
                    status: false,
                    data: null,
                    message: ErrorMessage.SHEET_NAME_ERROR_FORECAST_UPLOAD_ASM,
                };
            let transformedExcelData = await uploadedDataTransformer.jsonToDBMapping(jsonData, areaCode);

            const existingForecast = await ArsModel.forecastSummaryAll(areaCode);
            if (existingForecast) {
                //Removed keys to avoid special characters
                const modifiedExistingForecast = existingForecast.map(({ parent_desc, customer_name, ...item }) => item);
                const validationResult = await ArsRules.forecastFileUploadValidation(areaCode, transformedExcelData, modifiedExistingForecast);
                if (validationResult.isValid) {
                    const modifiedRows = await ArsModel.findUploadedFileMismatchRecords(validationResult.finalResult, modifiedExistingForecast, true);
                    if (modifiedRows.length < 1) {
                        return {
                            status: false,
                            data: null,
                            message: ErrorMessage.NO_MODIFICATION,
                        };
                    }
                    return {
                        status: true,
                        data: { modifiedRows, existingForecast },
                        message: `Excel Sheet for area ${areaCode} is valid.`,
                    };
                } else {
                    return {
                        status: false,
                        data: validationResult,
                        message: `Excel Sheet for area ${areaCode} has for following error(s).`,
                    };
                }
            }
        } catch (e) {
            logger.error('CAUGHT: Error in ArsService -> validateForecastData', e);
            return {
                status: false,
                message: 'Failed to process data for area - ' + areaCode,
            };
        }
    },
    async uploadForecastExcel(file: any, user: any) {
        try {
            const jsonData: any = arsHelpers.convertExcelToJson(file);
            if (!jsonData || Object.keys(jsonData).length === 0)
                return {
                    status: false,
                    data: null,
                    message: ErrorMessage.EMPTY_FILE,
                };
            // return jsonData;

            const responseData = {};
            let isSuccess = true;

            let areaCount = 0;
            let noModificationCount = 0;
            for (let area in jsonData) {
                areaCount += 1;
                const result = await ArsService.validateForecastData(area, jsonData[area], user);
                responseData[area] = result;
                if (!result.status) {
                    if (result.message === ErrorMessage.NO_MODIFICATION) {
                        noModificationCount += 1;
                    } else {
                        isSuccess = false;
                    }
                }
            }
            if (areaCount === noModificationCount) {
                isSuccess = false;
            }

            // const fileName = file.originalname.split('.')[0] + '.json';
            // const buffer = Buffer.from(JSON.stringify(jsonData));
            // const s3UploadResponse = await S3Helper.uploadForecastFile(buffer, fileName,'upload');
            // return { status: true, message: SuccessMessage.UPLOAD_SUCCESSFUL, data: s3UploadResponse };

            if (isSuccess) {
                const { user_id, roles } = user;
                const areas = Object.keys(jsonData);
                const areaData: any[] = (await ArsModel.fetchAreaCodes()) || [];
                const region = areaData.find((item: any) => item.code === areas[0])?.region || '';

                const fileName = file.originalname.split('.')[0] + '_' + new Date().getTime() + '.json';
                const buffer = Buffer.from(JSON.stringify(jsonData));
                const S3Response = (await S3Helper.uploadForecastFile(buffer, fileName, 'upload')) || {};

                let isUploaded = true;
                let error = '';
                if (!S3Response['Location']) {
                    logger.error('inside ArsService -> uploadForecastExcel, Error: File not uploaded to S3');
                    isUploaded = false;
                    error = 'Failed to upload file to S3';
                }
                const logObj = {
                    file_name: fileName,
                    region: region,
                    areas: areas,
                    type: 'upload',
                    link: S3Response['Location'],
                    success: isUploaded,
                    error: error,
                };

                await ArsModel.insertForecastUploadDownloadLogs(logObj, user_id, roles);
                ArsService.saveForecastFileData(true);
                return {
                    status: true,
                    message: SuccessMessage.UPLOAD_SUCCESSFUL,
                    data: responseData,
                };
            } else {
                return {
                    status: false,
                    message: ErrorMessage.INVALID_FILE,
                    data: responseData,
                };
            }
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> uploadForecastExcel', error);
            return { status: false, message: ErrorMessage.FORECAST_UPLOAD };
        }
    },

    async uploadForecastData(data: any[], userId: string) {
        try {
            let payload: {
                adjusted: UpdateForecastDataAdjusted[];
            } = {
                adjusted: data,
            };
            return await ArsService.updateForecastData(payload, userId);
        } catch (e) {
            logger.error('CAUGHT : Error in ArsService -> uploadForecastData', e);
            return null;
        }
    },

    async uploadForecastDistribution(data: any[], areaCode: string) {
        let dataGroupedByPsku = {};
        let resultStatus = true;
        try {
            data.forEach((item) => {
                const modifiedForDistribution: UpdateForecastDataAdjusted = uploadedDataTransformer.distributionMapping(item);
                if (dataGroupedByPsku.hasOwnProperty(item.parent_sku)) {
                    dataGroupedByPsku[item.parent_sku].push(modifiedForDistribution);
                } else {
                    dataGroupedByPsku[item.parent_sku] = [];
                    dataGroupedByPsku[item.parent_sku].push(modifiedForDistribution);
                }
            });
            if (Object.keys(dataGroupedByPsku).length > 0) {
                Object.keys(dataGroupedByPsku).forEach(async (item) => {
                    let distributionPayload: UpdateForecastData = {
                        pskuCode: item,
                        areaCode: areaCode,
                        adjusted: dataGroupedByPsku[item],
                    };
                    try {
                        await ArsService.upsertForecastDistribution(areaCode, distributionPayload);
                    } catch (e) {
                        logger.error('CAUGHT : Error in ArsService -> uploadForecastDistribution', e);
                        resultStatus = false;
                    }
                });
            }
            return resultStatus;
        } catch (e) {
            logger.error('CAUGHT : Error in ArsService ->uploadForecastDistribution', e);
            return null;
        }
    },
    async downloadDlpReport() {
        return await ArsModel.downloadDlpReport();
    },

    async stockNormDbFilter(ao_enabled: boolean, cg: string) {
        return await ArsModel.stockNormDbFilter(ao_enabled, cg);
    },

    async quantityNormSync() {
        /**
         * This function is used to fill the adjusted forecast with a specific quantity where both forecast and adjusted forecast is 0.
         * This function will be a cron job that will run on 1st of the current month.
         * Hence the forecast distribution will be updated for the current month.
         */
        logger.info('inside ArsService -> quantityNormSync');
        try {
            const updatedForecastPayload: {
                adjusted: UpdateForecastDataAdjusted[];
            } = {
                adjusted: [],
            };
            const conversionArray = await ArsModel.getMaterialConversion();
            const base_to_case = await arsHelpers.rekey(conversionArray, 'code', 'buom_to_cs');
            const settings = await UserModel.getAppLevelSettings('QUANTITY_NORM_DEFAULT_VALUE');
            const defaultValue = settings && settings[0] && settings[0].value ? +settings[0].value : 2;
            const recordsWithZeroForecast = await ArsModel.getRecordsWithZeroForecast();

            const groupedRecords = recordsWithZeroForecast?.reduce((acc, item) => {
                const key = `${item.area_code}_${item.parent_sku}`;
                if (acc[key]) {
                    acc[key].push(item);
                } else {
                    acc[key] = [item];
                }
                return acc;
            }, {});

            for (const key of Object.keys(groupedRecords)) {
                const [areaCode, psku] = key.split('_');
                const adjustedValues: UpdateForecastDataAdjusted[] =
                    groupedRecords[key].map((item) => {
                        const value = +defaultValue * parseFloat(base_to_case[item.parent_sku] || 1);
                        /**
                         * if value is > 0 and <1 then do not round off[SCENARIO: Saffron is light weight. 1CV = 4g]
                         * if value is 0 then take the default value
                         * if value is >= 1 then round off to the nearest integer
                         */
                        const roundedValue = value >= 1 ? Math.round(value) : value;
                        const finalValue = roundedValue == 0 ? defaultValue : roundedValue;
                        return {
                            updated_allocation: finalValue,
                            distributorCode: item.sold_to_party,
                            sales_allocation_key: item.key,
                            pskuClass: 'Q',
                        };
                    }) ?? [];
                const updateForecastData: UpdateForecastData = {
                    areaCode,
                    pskuCode: psku,
                    adjusted: adjustedValues,
                };
                updatedForecastPayload.adjusted.push(...adjustedValues);
                await ArsService.upsertForecastDistribution(areaCode, updateForecastData);
            }

            await ArsService.updateForecastData(updatedForecastPayload, 'PORTAL_MANAGED');
            await ArsModel.reIndexArsTables();
            return true;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> quantityNormSync', error);
            return null;
        } finally {
            logger.info('inside ArsService -> quantityNormSync: All execution complete');
        }
    },

    async getMtd(pskuDbSet: { [s: string]: unknown } | ArrayLike<unknown>, mtdTillToday: number = 0) {
        /**
         * This function is called to fetch MTD of multiple psku*distributor combination
         */
        try {
            console.time('MTD API BULK');
            const payload = {
                type: 'MTD-BULK',
                doctype: 'ZOR',
                end_date: mtdTillToday,
                psku_customer: [] as { customer: string; sku: string }[],
            };
            const pskuDb: { customer: string; sku: string }[] = [];

            for (const [key, value] of Object.entries(pskuDbSet)) {
                const pskuDbList: { customer: string; sku: string }[] = Array.from(value as Set<any>).map((d) => ({
                    customer: d,
                    sku: key,
                }));
                pskuDb.push(...pskuDbList);
            }
            payload.psku_customer = pskuDb;
            const res = await ArsService.makeApiCallsToGetValues(payload);
            const mtdResponse = arsHelpers.nestedRekey(res, ['PARENT_SKU', 'CUSTOMER', 'MTD']);
            return mtdResponse;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> getMtd', error);
            return null;
        } finally {
            console.timeEnd('MTD API BULK');
        }
    },

    async autoOrderReportEmail() {
        try {
            await ArsService.fetchArsReport();
            await ArsService.fetchArsReportAreaWise();
            LogService.insertSyncLog('ARS_ORDER_REPORT', 'SUCCESS', null, null, null, true);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> autoOrderReportEmail', error);
            return null;
        }
    },
    async fetchToleranceExcludedPskus() {
        logger.info('inside ArsService -> fetchToleranceExcludedPskus');
        return await ArsModel.fetchToleranceExcludedPskus();
    },

    async fetchMaterialList() {
        logger.info('inside ArsService -> fetchMaterialList');
        const response = ((await UserModel.getMaterialsList('', null)) ?? []).map((item) => {
            return {
                code: item.code,
                description: item.description,
                division: item.division,
                sales_unit: item.sales_unit,
                pak_code: item.pak_code,
                ton_to_cv: item.ton_to_cv,
                appl_area_channel: item.appl_area_channel,
            };
        });
        return response;
    },

    async updateToleranceExcludedPskus(pskuData: any[], role: string[], user_id: string) {
        logger.info('inside ArsService -> updateToleranceExcludedPskus');
        const response = await ArsModel.updateToleranceExcludedPskus(pskuData, role, user_id);
        return response;
    },

    async safetyStockCheck() {
        logger.info('inside ArsService -> safetyStockCheck');
        try {
            // we will first lock the PDP for the dbs that have been unlocked yesterday by this sync
            // we are fetching the email_ogs of the previous day
            const previous_day_logs = await ArsModel.getSNSSCheckEmailLogs();
            if (!previous_day_logs) return null;

            const dbs_to_lock: string[] = Array.from(new Set(previous_day_logs?.map((item) => item.reference)));
            const dbs_locked = await ArsModel.enableDisablePdp(dbs_to_lock, true, 'Locking PDP for the Distributors unlocked in stock-norm-safety-stock check yesterday');
            if (!dbs_locked) {
                logger.info('inside ArsService -> safetyStockCheck: Failed to turn on PDP for distributors: ' + dbs_to_lock.toString() ?? '-');
                return null;
            }
            logger.info('inside ArsService -> safetyStockCheck: PDP turned on for distributors: ' + dbs_locked.toString() ?? '-');
            // end of pdp locking

            // we will now do the necessay checks to unlock the PDP of dbs
            const response = {
                dbs_locked: dbs_locked,
            };
            // if gloabal PDP switch is off then we will skip the stock-norm/safety-stock check, hence no need to unlock PDP
            const globalPdpSettings = (await UserModel.getAppLevelSettings('ENABLE_PDP_RESTRICTION')) ?? [];
            if (globalPdpSettings.length == 0 || globalPdpSettings[0].value === 'NO') {
                logger.info('inside ArsService -> safetyStockCheck: PDP is globally turned off, hence skipping the stock-norm/safety-stock check');
                response['dbs_unlocked'] = [];
                return response;
            }

            // we will now fetch the dbs whose both ars and pdp is on
            const dbSalesDetails = (await ArsModel.getSNSSCheckDbs()) ?? [];
            const dbMap = dbSalesDetails.reduce((acc, item) => {
                acc[item.db_code] = acc[item.db_code] || [];
                acc[item.db_code].push(item);
                return acc;
            }, {});

            // we will now filter the dbs who are outside PDP window
            const dbs_outside_pdp: any[] = [];
            const appSettings = (await UserModel.getAppLevelSettings(null)) ?? [];
            const arsSettings = (await ArsModel.fetchArsConfigurations(null, ['SAFETY_STOCK', 'STOCK_NORM'])) ?? [];
            // fetching stock-norm and safety-stock tolerance values
            const ss_tolerance_value: number = +(arsSettings.find((item) => item.key === 'SAFETY_STOCK')?.value || 0);
            const sn_tolerance_value: number = +(arsSettings.find((item) => item.key === 'STOCK_NORM')?.value || 0);

            const pdpWindowsMap = new Map();
            // for loop to find distributors outside PDP window
            for (let key in dbMap) {
                let isPdpWindowOn = false;

                const group5_id = dbMap[key][0].group5_id;
                const area_code = dbMap[key][0].area_code;
                const pdpWindows = !pdpWindowsMap.has(group5_id) ? await UserModel.getPDPWindows(group5_id) : pdpWindowsMap.get(group5_id);
                pdpWindowsMap.set(group5_id, pdpWindows);
                const pdp: PDPConfig = PDPCheck.updateAppSettings(appSettings, pdpWindows, true);
                for (let item of dbMap[key]) {
                    const checkPdp = PDPCheck.checkPdpDay(item.pdp_day, item.reference_date, pdp);
                    if (checkPdp.allowedToOrder) {
                        isPdpWindowOn = true;
                        break;
                    }
                }
                if (!isPdpWindowOn) {
                    dbs_outside_pdp.push({
                        db_code: key,
                        area_code: area_code,
                    });
                }
            }

            let suggestedMats = {};
            const applicableMonth = Helper.applicableMonth();
            const nextApplicableMonth = Helper.applicableMonth('next');
            // we will now loop through the dbs outside PDP and fetch the stock-norm and safety-stock values
            for (let db_obj of dbs_outside_pdp) {
                const distId = db_obj.db_code;
                const areaCode = db_obj.area_code;
                const forecastCheckForDist = await ArsModel.checkForecastForDist(distId, areaCode);
                if (!forecastCheckForDist) {
                    logger.info(`inside ArsService -> safetyStockCheck, DistributorID: ${distId} on ${new Date().toLocaleDateString()} No forecast found`);
                    continue;
                }

                // Fetch Stock Norm, Cycle Stock, Safety Stock.
                let normCycleSafetyValues: any = {};
                try {
                    normCycleSafetyValues = await ArsService.getStockNormByPsku(distId, applicableMonth);
                } catch (error) {
                    logger.error('inside ArsService -> safetyStockCheck, Error in getStockNormByPsku', error);
                    continue;
                }

                // Fetch dist pdp distribution array
                const distPdpDistributionArray = await ArsModel.getDistPdpDistribution(distId, [], applicableMonth);

                if (!distPdpDistributionArray) {
                    logger.info(`inside ArsService -> safetyStockCheck, DistributorID: ${distId} on ${new Date().toLocaleDateString()} Forecast Distribution not found`);
                    continue;
                }

                const weekColumnsPskuWise = await ArsRules.getWeekDaysPskuWise(distPdpDistributionArray, normCycleSafetyValues, applicableMonth, nextApplicableMonth);
                logger.info('inside ArsService -> safetyStockCheck, weekColumnsPskuWise', weekColumnsPskuWise);
                const forecastedPSKUDistWise = await ArsModel.getForecastedPSKUDistWise(distId, applicableMonth);

                let stockNormData: any = await ArsModel.getStockNormTotal(distId, weekColumnsPskuWise);
                if (!stockNormData) {
                    logger.info(`inside ArsService -> safetyStockCheck, DistributorID: ${distId} on ${new Date().toLocaleDateString()} Stock Norm not found`);
                    continue;
                }
                const stockNorm = await arsHelpers.rekey(stockNormData, 'psku', 'val');

                // calculating the safety_stock and stock_norm values
                Object.keys(normCycleSafetyValues)?.forEach((psku) => {
                    const ss_per = +normCycleSafetyValues[psku]['safety_stock'] || 0;
                    const sn = +stockNorm[psku] || 0;
                    const ss = (sn * ss_per) / 100;
                    normCycleSafetyValues[psku]['stock_norm_value'] = sn.toFixed(2);
                    normCycleSafetyValues[psku]['safety_stock_value'] = ss.toFixed(2);
                });
                suggestedMats[distId] = normCycleSafetyValues;
            }

            // suggestedMats = {
            //                 "172236": {
            //                     "14000000007977" : {
            //                             "stock_norm": "8",
            //                             "safety_stock": "50",
            //                             "stock_norm_value": 644.07,
            //                             "safety_stock_value": 337.03,
            //                             "pak_to_cs": 24,
            //                         },
            //                     }
            //                 }
            const temp = {};
            const dbs_to_unlock: string[] = [];
            // dbMap = {
            //         "172236":  [{
            //                         db_code: '172236',
            //                         db_name: 'Sri Someshwara Enterprises Sri Someshwara Enterpri',
            //                         db_email: 'kiran.hebballi@tataconsumer.com',
            //                         group5_id: 6,
            //                         area_code: 'KA03',
            //                         tse_emails: [
            //                         'Sidharth.Sathisan@tataconsumer.com',
            //                         'Rahul.R1@tataconsumer.com',
            //                         'Guru.V@tataconsumer.com',
            //                         'Nithin.Ganesh@tataconsumer.com'
            //                         ],
            //                         asm_emails: [
            //                         'maruthi.veeranna@tataconsumer.com',
            //                         'Mohamed.Ulla@tataconsumer.com'
            //                         ],
            //                         distribution_channel: 10,
            //                         division: 10,
            //                         plant_code: '1438',
            //                         pdp_day: 'WEMOWEFR',
            //                         reference_date: null
            //                     }],
            //         }

            // we will now fetch the inhand, open and transit stock data for the pskus having stock norm and safety stock ,
            // and check if holdings of any of the pskus are below stock norm or safety stock
            const logs_data: any[] = [];
            for (let db_code in suggestedMats) {
                const sku_map = suggestedMats[db_code];
                let sku_list = Object.keys(sku_map).map((psku) => {
                    return { sku: psku };
                });
                // Fetch inhand, open and transit stock data
                let inhandStockData: any[] = await ArsService.getArsApiValues(sku_list, db_code, 'inhand', 'ZOR');
                let intransitStockData: any[] = await ArsService.getArsApiValues(sku_list, db_code, 'transit', 'ZOR');
                let openStockData: any[] = await ArsService.getArsApiValues(sku_list, db_code, 'open', 'ZOR');

                // saving inhand, open and transit stock data in sku_map
                inhandStockData.forEach((item) => {
                    let sku_details = sku_map[item.SKU] || {};
                    sku_details['inhand'] = item.QTY;
                    sku_map[item.SKU] = sku_details;
                });
                openStockData.forEach((item) => {
                    let sku_details = sku_map[item.SKU] || {};
                    sku_details['open'] = item.QTY;
                    sku_map[item.SKU] = sku_details;
                });
                intransitStockData.forEach((item) => {
                    let sku_details = sku_map[item.SKU] || {};
                    sku_details['transit'] = item.QTY;
                    sku_map[item.SKU] = sku_details;
                });

                let isBelowSN: boolean = false;
                let isBelowSS: boolean = false;
                const pskus_log: any[] = [];

                // check if any sku is below stock norm or safety stock
                for (let psku in sku_map) {
                    const sku_details = sku_map[psku];
                    // we do not check pskus where pak_to_cs is not available or inhand, transit and open are all not available
                    if (!sku_details['pak_to_cs'] || (!sku_details['inhand'] && !sku_details['transit'] && !sku_details['open'])) continue;

                    const cf = sku_details['pak_to_cs'] || 1;
                    const inhand = Math.ceil(sku_details['inhand']) || 0;
                    const transit = sku_details['transit'] || 0;
                    const open = sku_details['open'] || 0;
                    const holdings = Math.ceil(inhand + transit + open);
                    const effective_sn = Math.ceil(sku_details['stock_norm_value'] * (1 - sn_tolerance_value / 100)); //stock_norm after applying tolerance
                    const effective_ss = Math.ceil(sku_details['safety_stock_value'] * (1 - ss_tolerance_value / 100)); //safety_stock after applying tolerance

                    const psku_log_obj = {
                        psku: psku,
                        stock_norm: sku_details['stock_norm_value'],
                        safety_stock: sku_details['safety_stock_value'],
                        effective_sn: effective_sn,
                        effective_ss: effective_ss,
                        inhand: inhand,
                        transit: transit,
                        open: open,
                        holdings: holdings,
                    };
                    pskus_log.push(psku_log_obj);
                    // if holdings < effective_sn then it is below stock norm
                    if (holdings < effective_sn) {
                        // if holdings < effective_ss then it is below safety stock
                        if (holdings < effective_ss) {
                            isBelowSS = true;
                            break;
                        }
                        isBelowSN = true;
                    }
                }

                const email_sent = isBelowSN || isBelowSS ? true : false;
                const email_type = isBelowSN || isBelowSS ? (isBelowSS ? 'SAFETY_STOCK' : 'STOCK_NORM') : 'NA';
                if (isBelowSS || isBelowSN) {
                    dbs_to_unlock.push(db_code);
                    // send email
                    const db_details = dbMap[db_code][0];
                    const tse_emails = db_details.tse_emails || [];
                    const asm_emails = db_details.asm_emails || [];
                    let emailData = {
                        to: [db_details.db_email, ...tse_emails],
                        // to: [row.db_email, 'saumasis.chandra@tataconsumer.com'],
                        cc: asm_emails,
                        // cc: ['mayukh.maity@tataconsumer.com'],
                        dbName: db_details.db_name,
                        dbCode: db_code,
                        emailType: isBelowSS ? 'safety stock' : 'stock norm', //decide the email type based on the condition
                    };

                    Email.sihBelowSs(emailData);
                }

                temp[db_code] = sku_map;
                const db_details = dbMap[db_code][0];
                const tse_emails = (db_details.tse_emails || []).join(',');
                const asm_emails = (db_details.asm_emails || []).join(',');
                const logs_obj = {
                    region: db_details.region,
                    area_code: db_details.area_code,
                    asm_email: asm_emails,
                    tse_code: db_details.tse_code,
                    tse_email: tse_emails,
                    db_code: db_code,
                    db_email: db_details.db_email,
                    pskus_checked: JSON.stringify(pskus_log),
                    email_sent: email_sent,
                    email_type: email_type,
                };
                logs_data.push(logs_obj);
            }
            // we are saving the logs in the sih_ss_email_log table
            const logRespone = await ArsModel.insertSihSSLog(logs_data);
            if (!logRespone) {
                logger.info('inside ArsService -> safetyStockCheck: Failed to save logs');
            }

            // we will now unlock the PDP for the dbs
            const dbs_unlocked = await ArsModel.enableDisablePdp(dbs_to_unlock, false, 'Unlocking PDP for the Distributors below stock-norm/safety-stock');
            if (!dbs_unlocked) {
                logger.info('inside ArsService -> safetyStockCheck: Failed to turn off PDP for distributors: ' + dbs_to_unlock.toString() ?? '-');
                return response;
            }
            response['dbs_unlocked'] = dbs_unlocked;
            logger.info('inside ArsService -> safetyStockCheck: sync success response: ', response);
            return response;
        } catch (error) {
            logger.error('inside ArsService -> safetyStockCheck, Error: ', error);
            return null;
        }
    },

    async saveForecastFileData(currentDate: boolean | undefined = undefined) {
        logger.info('inside ArsService -> saveForecastFileData');
        try {
            const logsResponse = (await ArsModel.fetchForecastUploadDownloadLogs('upload', !currentDate)) || [];
            const responseObj = {};
            for (let log of logsResponse) {
                if (log.success === false) continue;
                const fileName = log.file_name;
                const user: ValidateForecastDataUserType = {
                    userId: log?.requested_by?.split('#')[0],
                    code: log?.user_code,
                    roles: log?.requested_by?.split('#')[1]?.split(','),
                };
                const saveResponse = await ArsService.saveForecastData(fileName, user);
                responseObj[fileName] = saveResponse;
            }
            // TODO: Download will be enabled once heap memory optimization is complete
            // ArsService.downloadForecastSummary('ALL','','','');
            return responseObj;
        } catch (e) {
            logger.error('inside ArsService -> saveForecastFileData, Error: ', e);
            return false;
        }
    },

    async syncForecastTotal(applicableMonth) {
        ArsArchiveModel.archiveForecastTotal();
        return await ArsModel.syncForecastTotal(applicableMonth);
    },

    async upsertSoqNorms(data, userId) {
        try {
            const updatedDivisions = new Set(data?.map((item) => item.division));
            return await ArsModel.upsertSoqNorms(data, [...updatedDivisions], userId);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> upsertSoqNorms', error);
            return null;
        }
    },

    async fetchAllSoqNorms() {
        return await ArsModel.fetchAllSoqNorms();
    },

    async fetchSoqNormsDivisionList() {
        return await ArsModel.fetchSoqNormsDivisionList();
    },

    async deleteSoqNorm(division: string | number, userId: string) {
        return await ArsModel.deleteSoqNorm(division, userId);
    },

    async arsTentativeOrder() {
        /**
         * This is a automated job, to calculate the SN(CV) for ARS enabled DB and store in the table
         * This data will be used by Datalake to do analysis on the generated orders vs confirmed orders[SOPE-2065]
         * This same data will also be used for ARS Auto-Submit[SOPE-2549]
         */
        logger.info('inside ArsService -> arsTentativeOrder');
        const executionStart = moment();
        try {
            const pdpConfig = new PDPConfig();
            const stockNormCV: any = {};
            const batchSize = 100;
            let forecast: ForecastedPskuDistWise[] = [];
            let distributorPskuSN: DistributorPskuSN = {};
            const distributorForecast: DistributorForecast = {};
            let allErrors: string = '';

            const applicableMonth = Helper.applicableMonth();
            const nextApplicableMonth = Helper.applicableMonth('next');
            const dbList = await ArsModel.fetchDistributorForArsTentativeOrders();
            if (!dbList) {
                logger.info('inside ArsService -> arsTentativeOrder: No distributors found');
                return null;
            }
            const appSettings = await UserModel.getAppLevelSettings(pdpConfig.pdp_restriction.key);

            const pdpWindowsByRegion = {};

            const memoisedPDPWindows = async (regionId) => {
                if (!pdpWindowsByRegion[regionId]) {
                    pdpWindowsByRegion[regionId] = await UserModel.getPDPWindows(regionId);
                }
                return pdpWindowsByRegion[regionId];
            };
            const uniqueDistributors: string[] = Array.from(new Set<string>(dbList.map((d) => d.id)) ?? []);

            /**
             * when number of DBs >1000, postgres connection is timing out
             * hence we are fetching the forecasted data in batches
             */
            for (let i = 0; i < uniqueDistributors.length; i += batchSize) {
                const batch = uniqueDistributors.slice(i, i + batchSize);
                const forecastBatch: ForecastedPskuDistWise[] | null = await ArsModel.getForecastedPSKUDistWise(batch, applicableMonth);
                if (forecastBatch?.length) {
                    forecast = forecast.concat(forecastBatch);
                }

                const distributorPskuSNBatch: DistributorPskuSN = await ArsService.getStockNormByPsku(batch, applicableMonth);
                distributorPskuSN = {
                    ...distributorPskuSN,
                    ...distributorPskuSNBatch,
                };
            }

            forecast?.forEach((item) => {
                distributorForecast[item.distributor_code] = distributorForecast[item.distributor_code] || [];
                distributorForecast[item.distributor_code].push(item);
            });

            for (const db of dbList) {
                try {
                    const profile = await UserService.fetchDistributorDetails(db.id);
                    const pdpWindows = await memoisedPDPWindows(profile?.group5_id);
                    const pdp: PDPConfig = PDPCheck.updateAppSettings(appSettings, pdpWindows, profile?.ao_enable);

                    const pdpDivision = {};
                    let activeDivisions: number[] = [];
                    profile?.distributor_sales_details?.forEach((i) => {
                        if (i.distribution_channel === 10) {
                            if (!i.pdp_day) {
                                // if pdp_day is not set then we will consider the division as active
                                activeDivisions.push(i.division);
                                return;
                            }
                            let key = i.pdp_day;
                            if (i.pdp_day.startsWith('FN')) {
                                key = `${key}_${i.reference_date}`;
                            }
                            if (pdpDivision.hasOwnProperty(key)) {
                                pdpDivision[key].add(i.division);
                            } else {
                                pdpDivision[key] = new Set<number>();
                                pdpDivision[key].add(i.division);
                            }
                        }
                    });
                    Object.keys(pdpDivision).forEach((pdpString) => {
                        let referenceDate = pdpString.split('_')[1] ?? '';
                        const checkPdp = PDPCheck.checkPdpDay(pdpString, referenceDate, pdp);
                        if (checkPdp.allowedToOrder) {
                            activeDivisions = activeDivisions.concat(Array.from(pdpDivision[pdpString]));
                        }
                    });
                    if (!activeDivisions.length) {
                        //no active PDP divisions
                        continue;
                    }

                    const forecastedPSKUDistWise = distributorForecast[db.id];
                    let normCycleSafetyValues = distributorPskuSN[db.id] || {};
                    const distPdpDistributionArray = await ArsModel.getDistPdpDistribution(
                        db.id,
                        activeDivisions.map((d) => d),
                        applicableMonth,
                    );
                    const weekColumnsPskuWise = await ArsRules.getWeekDaysPskuWise(distPdpDistributionArray, normCycleSafetyValues, applicableMonth, nextApplicableMonth);
                    let stockNormData: any = await ArsModel.getStockNormTotal(db.id, weekColumnsPskuWise);
                    if (stockNormData?.length) {
                        const sn = {};
                        stockNormData?.forEach((s) => {
                            const buomToCs: number = +(normCycleSafetyValues[s.psku]?.buom_to_cs || 1);
                            sn[s.psku] = s.val / buomToCs;
                        });
                        stockNormCV[db.id] = sn;
                    }
                } catch (error) {
                    logger.error('Error in ArsService -> arsTentativeOrder', error);
                    allErrors += `## ${error} ##`;
                    continue;
                }
            }
            const rowCount = await ArsModel.upsertArsTentativeOrderStockNorm(stockNormCV);
            const executionEnd = moment();
            const executionTime = moment.utc(executionEnd.diff(executionStart)).format('HH:mm:ss');
            LogService.insertSyncLog('ARS_STOCK_NORM_CV', 'SUCCESS', { upsertCount: rowCount, deleteCount: 0 }, null, allErrors, true, executionTime);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> arsTentativeOrder', error);
            const executionEnd = moment();
            const executionTime = moment.utc(executionEnd.diff(executionStart)).format('HH:mm:ss');
            LogService.insertSyncLog('ARS_STOCK_NORM_CV', 'FAIL', null, null, `${error}`, true, executionTime);
        }
    },

    async uploadSkuSoqNormSync(file: any, user: any) {
        logger.info('inside ArsService -> uploadSkuSoqNormSync');
        try {
            const fileData = arsHelpers.convertExcelToJson(file);
            const jsonData = fileData[Object.keys(fileData)?.[0]];
            if (jsonData == null || Object.keys(jsonData).length == 0)
                return {
                    status: false,
                    data: null,
                    message: ErrorMessage.EMPTY_FILE,
                };

            const data = uploadedDataTransformer.jsonToSkuSoqNorm(jsonData);
            const result = await ArsModel.uploadSkuSoqNormSync(data, user);
            if (result) {
                LogService.insertSyncLog('SKU_SOQ_NORM', 'SUCCESS', result);
                return {
                    status: 200,
                    data: {
                        success: true,
                        message: SuccessMessage.SKU_SOQ_NORM_UPLOAD_SUCCESS,
                        result: result,
                    },
                };
            } else
                return {
                    status: 500,
                    data: {
                        success: false,
                        message: ErrorMessage.SKU_SOQ_NORM_UPLOAD_ERROR,
                        result: null,
                    },
                };
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> uploadSkuSoqNormSync', error);
            LogService.insertSyncLog('SKU_SOQ_NORM', 'FAIL', null, null, error);
            return {
                status: 500,
                data: {
                    success: false,
                    message: ErrorMessage.SKU_SOQ_NORM_UPLOAD_ERROR,
                    result: null,
                },
            };
        }
    },

    async uploadDBCensusCustomerGroup(file: any, user: any) {
        logger.info('inside ArsService -> uploadDBCensusCustomerGroup');
        try {
            const fileData = arsHelpers.convertExcelToJson(file);
            const jsonData = fileData[Object.keys(fileData)?.[0]];
            if (jsonData == null || Object.keys(jsonData).length == 0) return Template.errorMessage(ErrorMessage.EMPTY_FILE);
            const data = uploadedDataTransformer.jsonToDBCensusCustomerGroup(jsonData);
            const result = await ArsModel.uploadDBCensusCustomerGroup(data, user);
            LogService.insertSyncLog('DISTRIBUTOR_CENSUS_CUSTOMER_GROUP', 'SUCCESS', result);
            return {
                status: 200,
                data: {
                    success: true,
                    message: SuccessMessage.SKU_SOQ_NORM_UPLOAD_SUCCESS,
                    result: result,
                },
            };
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> uploadDBCensusCustomerGroup', error);
            LogService.insertSyncLog('DISTRIBUTOR_CENSUS_CUSTOMER_GROUP', 'FAIL', null, null, error);
            return {
                status: 500,
                data: {
                    success: false,
                    message: ErrorMessage.DBCensus_UPLOAD_ERROR,
                    result: null,
                },
            };
        }
    },

    async distributorCensusCustomerGroupDownload() {
        logger.info('inside ArsService -> distributorCensusCustomerGroupDownload');
        try {
            return await ArsModel.distributorCensusCustomerGroupDownload();
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> distributorCensusCustomerGroupDownload', error);
            return null;
        }
    },

    async skuSoqNormDownload() {
        logger.info('inside ArsService -> skuSoqNormDownload');
        try {
            const skuSoqNormResult = await ArsModel.skuSoqNormDownload();
            //SOPE-2700 (Sent a dummy line so that empty file will be downloaded)
            const defaultSkuSoqNorm = [
                {
                    'Distributor Code': '',
                    'Distributor Name': '',
                    PSKU: '',
                    'PSKU Description': '',
                    'SOQ Norm': '',
                },
            ];
            if (skuSoqNormResult && skuSoqNormResult.length == 0) {
                return defaultSkuSoqNorm;
            } else return skuSoqNormResult;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> skuSoqNormDownload', error);
            return null;
        }
    },

    async uploadStockNorm(file, userId) {
        logger.info('inside ArsService -> uploadStockNorm');
        try {
            const response = {
                status: true,
                message: SuccessMessage.STOCK_NORM_UPLOAD_SUCCESS,
                data: {},
            };
            let uploadedData: UploadStockNorm[] = [];
            const fileData = arsHelpers.convertExcelToJson(file);
            if (fileData == null || Object.keys(fileData).length == 0) return Template.errorMessage(ErrorMessage.EMPTY_FILE);
            for (let sheet in fileData) {
                const data: UploadStockNorm[] = uploadedDataTransformer.jsonToStockNorm(fileData[sheet]);
                const validate = ArsRules.stockNormFileUploadValidation(data);
                if (validate.isValid) {
                    uploadedData = uploadedData.concat(data);
                } else {
                    response.status = false;
                    response.message = ErrorMessage.INVALID_FILE;
                    response.data[sheet] = {
                        status: false,
                        data: validate,
                        message: `Excel sheet: ${sheet} has the following error(s)`,
                    };
                }
            }
            if (response.status) {
                await ArsModel.uploadStockNorm(uploadedData, userId);
                ArsService.downloadStockNormAudit(true, null, true);
            }
            return response;
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> uploadStockNorm', error);
            return Template.errorMessage(ErrorMessage.STOCK_NORM_UPLOAD_ERROR);
        }
    },

    async fetchArsConfigurations(configuration: string[] | null = null, keys: string[] | null = null, allDetails: boolean = false) {
        return await ArsModel.fetchArsConfigurations(configuration, keys, allDetails);
    },

    async updateArsConfiguration(data, userId) {
        return await ArsModel.updateArsConfigurations(data, userId);
    },

    async fetchForecastDistribution(distributorCode: string, applicableMonth: string, next_applicable_month: string | null) {
        return await ArsModel.fetchForecastDistribution(distributorCode, applicableMonth, next_applicable_month);
    },

    async fetchProductHierarchyFilter(search: string, isPskuCode: boolean) {
        logger.info('inside ArsService -> fetchProductHierarchyFilter');
        return await ArsModel.fetchProductHierarchyFilter(search, isPskuCode);
    },

    async upsertDistributorPskuTolerance(
        data: {
            customer_groups?: string[] | null;
            tse_codes?: string[] | null;
            distributor_codes?: string[] | null;
            product_hierarchy?: string[] | null;
            psku?: string[] | null;
            max: number;
            min: number;
        },
        userId: string,
    ) {
        logger.info('inside ArsService -> upsertDistributorPskuTolerance');
        if (!data.customer_groups?.length && !data.tse_codes?.length && !data.distributor_codes?.length) {
            return 'Sales details are missing';
        } else if (!data.product_hierarchy?.length && !data.psku?.length) {
            return 'Product details are missing';
        } else if (data.max == null || data.min == null) {
            return 'Tolerance values are missing';
        } else {
            const temp: {
                customer_group: string | null;
                tse_code: string | null;
                distributor_code: string | null;
                product_hierarchy: string | null;
                psku: string | null;
                max: number;
                min: number;
                created_by: string;
            }[] = [];
            const initial = {
                customer_group: null,
                tse_code: null,
                distributor_code: null,
                product_hierarchy: null,
                psku: null,
                max: data.max,
                min: data.min,
                created_by: userId,
            };
            const salesDetails: any[] = [];
            const productDetails: any[] = [];
            if (data?.distributor_codes) {
                data.distributor_codes?.forEach((d) => {
                    salesDetails.push({ distributor_code: d });
                });
            }
            if (data.tse_codes) {
                data.tse_codes?.forEach((t) => {
                    if (data.customer_groups) {
                        data.customer_groups?.forEach((cg) => {
                            salesDetails.push({ tse_code: t, customer_group: cg });
                        });
                    } else {
                        salesDetails.push({ tse_code: t });
                    }
                });
            }
            if (data.product_hierarchy) {
                data.product_hierarchy?.forEach((p) => {
                    productDetails.push({ product_hierarchy: p });
                });
            }
            if (data.psku) {
                data.psku?.forEach((p) => {
                    productDetails.push({ psku: p });
                });
            }
            for (const sales of salesDetails) {
                for (const product of productDetails) {
                    temp.push({
                        ...initial,
                        ...sales,
                        ...product,
                        max: data.max,
                        min: data.min,
                        created_by: userId,
                    });
                }
            }
            return await ArsModel.upsertDistributorPskuTolerance(temp);
        }
    },

    async fetchDistributorPskuTolerance(distributorCode: string, auditDetails: boolean = false) {
        logger.info('inside ArsService -> fetchDistributorPskuTolerance');
        try {
            const distributorDetails = await UserService.fetchDistributorDetails(distributorCode);
            return await ArsModel.fetchDistributorPskuTolerance(distributorCode, distributorDetails?.customer_group_code, distributorDetails?.tse[0]?.code, auditDetails);
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> fetchDistributorPskuTolerance', error);
            return null;
        }
    },
    async uploadRegionForecast(fileData, user) {
        try {
            const jsonData = arsHelpers.convertExcelToJson(fileData);
            const isAutomatedJob = global['configuration'].automatedJobs.allocationFromStaging;
            const allowedRoles = ['SUPER_ADMIN', 'SHOPPER_MARKETING', 'RSM'];
            if (!jsonData || Object.keys(jsonData).length === 0)
                return {
                    status: false,
                    data: [],
                    message: ErrorMessage.EMPTY_FILE,
                };
            if (_.isEmpty(_.intersection(user.roles, allowedRoles))) {
                return {
                    status: false,
                    data: [],
                    message: ErrorMessage.PERMISSION_ISSUE,
                };
            }
            const isValidUpload = await AutoValidationRules.validateUploadRegionForecast(jsonData, user.user_id); //Checks for file validation
            if (!isValidUpload?.status) {
                delete (isValidUpload as any).formattedData;
                return isValidUpload;
            }
            if (isValidUpload && isValidUpload.formattedData.length == 0) {
                isValidUpload.status = false;
                return isValidUpload;
            }
            const uploadToStagingResult = await ArsModel.uploadRegionForecastStaging(isValidUpload.formattedData, user?.user_id);
            if (uploadToStagingResult) {
                ArsService.allocationFromStaging();
                return {
                    status: true,
                    data: [],
                    message: SuccessMessage.UPLOAD_SUCCESSFUL,
                };
            }
            logger.error('CAUGHT: Error In arsService->UploadForecastRegion : ', ErrorMessage.UPLOAD_FAILURE);
            return {
                status: false,
                data: [],
                message: ErrorMessage.UPLOAD_FAILURE,
            };
        } catch (error) {
            logger.error('CAUGHT : Error in arsService->uploadRegionForecast: ', error);
            return {
                status: false,
                data: [],
                message: ErrorMessage.UPLOAD_FAILURE,
            };
        }
    },

    async allocationFromStaging() {
        logger.info('inside ArsService -> allocationFromStaging');
        try {
            const areaDbMapping = await ArsModel.fetchAreaDbMapFromAllocationStatging();
            logger.info(`Number of areas present in adjusted_forecast_staging : ${areaDbMapping?.length ?? 0}`);
            if (areaDbMapping) {
                const areaForecastMonthMap: {}[] = [];
                for (let key of areaDbMapping) {
                    for (let area of Object.keys(key.area_db_map)) {
                        const isNextMonthForecastDumped = await Helper.isNextMonthForecastDumped(area);
                        if (!isNextMonthForecastDumped) {
                            areaForecastMonthMap.push({
                                asm_code: area,
                                forecast_month: Helper.formatDateToCustomString(new Date()),
                            });
                        } else {
                            const applicableMonth = Helper.applicableMonth('next');
                            const nextMonth = applicableMonth.substring(0, 4) + '/' + applicableMonth.substring(4, 6) + '/01';
                            areaForecastMonthMap.push({
                                asm_code: area,
                                forecast_month: Helper.formatDateToCustomString(new Date(nextMonth)),
                            });
                        }
                    }
                }
                const result = await ArsModel.allocationFromStaging(areaForecastMonthMap);
                if (result) {
                    logger.info('Successfully transferred adjusted forecast from staging');
                    for (let key of areaDbMapping) {
                        for (let area of Object.keys(key.area_db_map)) {
                            await ArsService.fetchUpdatedForecast(area, false, key.area_db_map[area]);
                        }
                    }
                    logger.info('Forecast allocation executed successfully.');
                    return true;
                } else {
                    logger.error('CAUGHT : Error in ArsService -> allocationFromStaging :Failed to transfer adjusted forecast from staging', result);
                    return null;
                }
            }
        } catch (error) {
            logger.error('CAUGHT : Error in ArsService -> allocationFromStaging', error);
            return null;
        }
    },

    async getMissingDBPskuCombination(data) {
        return await ArsModel.getMissingDBPskuCombination(data);
    },

    async fetchDbPSKUTolerance(
        limit: number,
        offset: number,
        dbCode: string | null = null,
        cg: string | null = null,
        psku: string | null = null,
        pskuHierarchy: string[] | null = null,
        zoneArea: string[] | null = null,
    ) {
        logger.info('inside ArsService -> fetchDbPSKUTolerance');
        return await ArsModel.fetchDbPSKUTolerance(limit, offset, dbCode, cg, psku, pskuHierarchy, zoneArea);
    },

    async deleteDbPSKUTolerance(ids: number[]) {
        logger.info('inside ArsService -> fetchDbPSKUTolerance');
        return await ArsModel.deleteDbPSKUTolerance(ids);
    },

    async aosSimulationReport(distributorCode: string, date: string) {
        logger.info('inside ArsService -> aosSimulationReport');
        try {
            const result = await ArsModel.aosSimulationReport(distributorCode, date);
            if (result) {
                const res: {
                    order_summary: OrderSummary[];
                    order_details: OrderDetails[];
                    pdp_details: PDPDetails[];
                } = {
                    order_summary: [],
                    order_details: [],
                    pdp_details: [],
                };

                // ******************** Order Summary ********************

                const orderSummaryObj = {
                    distributor_code: result?.distributor_code,
                    distributor_name: result?.distributor_name,
                    order_date: result?.order_date,
                    sold_to: '',
                    sold_to_name: '',
                    ship_to: '',
                    ship_to_name: '',
                    unloading_point: '',
                    unloading_point_name: '',
                    errors: [result?.errors ?? '', result?.soq_calculations?.error ?? ''].filter(Boolean).join('; '),
                    po: result?.po_number,
                    so: result?.so_number,
                };
                result?.partners?.forEach((p) => {
                    if (p.partner_role === 'AG') {
                        orderSummaryObj.sold_to = p.partner_number;
                        orderSummaryObj.sold_to_name = p.partner_name;
                    } else if (p.partner_role === 'WE') {
                        orderSummaryObj.ship_to = p.partner_number;
                        orderSummaryObj.ship_to_name = p.partner_name;
                    } else if (p.partner_role === 'Y1') {
                        orderSummaryObj.unloading_point = p.partner_number;
                        orderSummaryObj.unloading_point_name = p.partner_name;
                    }
                });
                res.order_summary = [orderSummaryObj];

                // ******************** PDP Details ********************

                Object.entries(result?.pdp?.pdp)?.forEach(([key, value]) => {
                    const data: PDPDetails = {
                        division: key,
                        pdp: value['pdp'],
                        status: 'NOT_ORDER_APPLICABLE', // Default status,
                        order_window_start: null,
                        order_window_end: null,
                    };

                    const inApplicable = result?.pdp?.applicable_divisions?.[key];
                    if (inApplicable) {
                        data.order_window_start = inApplicable.order_start;
                        data.order_window_end = inApplicable.order_end;
                        data.status = 'ORDER_APPLICABLE';
                    }

                    res.pdp_details.push(data);
                });

                // ******************** Order Details ********************
                const holdingsMap = {};
                const conversionMap = {};
                const sapValidationError1Map = {};
                const sapValidationError2Map = {};
                const lastOrdersMap = {};
                result?.holdings?.forEach((h) => {
                    holdingsMap[h.SKU] = h;
                });
                result?.soq_calculations?.conversionArray?.forEach((c) => {
                    conversionMap[c.code] = c;
                });
                result?.sap_validation_errors_1?.error_items?.forEach((s) => {
                    const psku = s.material?.material_code;
                    sapValidationError1Map[psku] = s.message;
                });
                result?.sap_validation_errors_2?.error_items?.forEach((s) => {
                    const psku = s.material?.material_code;
                    sapValidationError2Map[psku] = s.message;
                });
                result?.soq_calculations?.lastOrderDetails?.forEach((o) => {
                    const psku = o.psku;
                    lastOrdersMap[psku] = o;
                });
                result?.order_payload?.original_items?.forEach((o) => {
                    const data: OrderDetails = {
                        psku: o.material_code,
                        psku_description: o.description,
                        division: o.division,
                        sn_cv: result?.soq_calculations?.stockNorm?.[o.material_code] ?? null,
                        sih: o.stock_in_hand === 'None' ? null : o.stock_in_hand,
                        sit: o.stock_in_transit === 'None' ? null : o.stock_in_transit,
                        oo: o.open_order === 'None' ? null : o.open_order,
                        soq: o.target_qty,
                        last_order_placed_qty: lastOrdersMap[o.material_code]?.total_qty ?? null,
                        last_order_placed_po: lastOrdersMap[o.material_code]?.po_numbers?.join(', ') ?? null,
                        pak_to_cs: conversionMap[o.material_code]?.pak_to_cs ?? null,
                        base_to_case: conversionMap[o.material_code]?.buom_to_cs ?? null,
                        soq_norms: result?.soq_calculations?.soqNorm?.[o.material_code] ?? null,
                        sku_soq_norms: result?.soq_calculations?.skuSoqNorm?.[distributorCode]?.[o.material_code] ?? null,
                        sap_validation_error_attempt_1: sapValidationError1Map[o.material_code]?.join('; ') ?? null,
                        sap_validation_error_attempt_2: sapValidationError2Map[o.material_code]?.join('; ') ?? null,
                        order_date: result?.order_date,
                    };
                    res.order_details.push(data);
                });

                return res;
            } else {
                return null;
            }
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> aosSimulationReport', error);
            return null;
        }
    },

    async fetchArsAreaCodes(userId: string, role: string[], code: string) {
        return await AdminModel.fetchAreaCodes(userId, role, code);
    },

    async fetchStockNormForDistributor(distributorCode: string) {
        return ArsModel.fetchStockNormForDistributor(distributorCode);
    },

    async fetchAreaForecastDumpDetails(areaCode: string) {
        return ArsModel.fetchAreaForecastDumpDetails(areaCode);
    },

    async uploadClassLevelStockNorm(file, userId: string, overwrite: boolean) {
        logger.info('inside ArsService -> uploadClassLevelStockNorm');
        const response = {
            status: true,
            message: SuccessMessage.STOCK_NORM_UPLOAD_SUCCESS,
            data: {},
        };
        let res: number | null | undefined = null;
        try {
            let uploadedData: UploadClassLevelStockNorm[] = [];
            const fileData = arsHelpers.convertExcelToJson(file);
            if (fileData == null || Object.keys(fileData).length == 0) {
                return Template.errorMessage(ErrorMessage.EMPTY_FILE);
            }
            for (let sheet in fileData) {
                const data: UploadClassLevelStockNorm[] = uploadedDataTransformer.jsonToClassLevelStockNorm(fileData[sheet]);
                const validate = ArsRules.classLevelStockNormFileUploadValidation(data);
                if (validate.isValid) {
                    uploadedData = uploadedData.concat(data);
                } else {
                    response.status = false;
                    response.message = ErrorMessage.INVALID_FILE;
                    response.data[sheet] = {
                        status: false,
                        data: validate,
                        message: `Excel sheet: ${sheet} has the following error(s)`,
                    };
                }
            }
            if (response.status) {
                res = await ArsModel.uploadClassLevelStockNorm(uploadedData, userId, overwrite);
            }
            if (res) {
                return response;
            } else {
                logger.error('Error in ArsService -> uploadClassLevelStockNorm: Failed to upload class level stock norms: Res not found');
                return Template.errorMessage(ErrorMessage.STOCK_NORM_UPLOAD_ERROR);
            }
        } catch (error) {
            logger.error('CAUGHT: Error in ArsService -> uploadClassLevelStockNorm', error);
            return Template.errorMessage(ErrorMessage.STOCK_NORM_UPLOAD_ERROR);
        }
    },
};
