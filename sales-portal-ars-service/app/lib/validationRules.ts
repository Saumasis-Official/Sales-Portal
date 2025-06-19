/**
 * This file will be replication of businessRules.ts
 * This is done to keep the actual ARS Logic intact
 * Except few places most of the code is same as it is in businessRules.ts
 */
/**
 * SOPE-785
 * The key idea is we want to validate if all the forecasted PSKUs(for the upcoming month) are getting validated from the SAP
 * Hence the suggested materials are chosen considering the upcoming month
 * SIH, SIT and OO data are neglected
 * If suggested quantity of any PSKU = 0/-ve, then consider it as 1
 * Any changes made wrt to ArsRules; comment "//CHANGES:" has been used
 */
import logger from '../lib/logger';
import { arsHelpers } from '../helper/arsHelper';
import Helper from '../helper';
import { ArsModel } from '../model/arsModel';
import { ErrorMessage } from '../constants/errorMessage';
import _ from 'lodash';
import { SuccessMessage } from '../constants/successMessage';

export const AutoValidationRules = {
    calculateWeekDays(type: string, pdpArray: any, pskuSN: number, psku: string) {
        const days = {
            SU: 0,
            MO: 1,
            TU: 2,
            WE: 3,
            TH: 4,
            FR: 5,
            SA: 6,
        };
        const date = new Date();
        //CHANGES: applicableMonth and nextApplicableMonth hs been moved by 1month
        const applicableMonth = Helper.applicableMonth('next');
        const nextApplicableMonth = Helper.applicableMonth('next-next');
        const monthDays = Helper.daysInMonth(applicableMonth); // to find the no. of days in the month; this will take care of leap year as well
        pskuSN = pskuSN == null ? 6 : pskuSN;
        pskuSN = type == 'FN' ? 14 : pskuSN;

        let weekdaysArray: string[] = [],
            overFlowWeeks: string[] = [];
        let availablePdpDays = pdpArray.map((ele) => {
            return days[ele];
        });
        let day,
            nextPdpDay = 0;

        for (let i = 1; i < 8; i++) {
            date.setDate(date.getDate() + 1);
            day = date.getDay();
            if (day == 0) continue;
            if (availablePdpDays.includes(day)) {
                nextPdpDay = date.getDate();
                break;
            }
        }

        if (nextPdpDay != 0) {
            let start = nextPdpDay + 1;
            let end = start + pskuSN - 1;
            let overFlowStart, overFlowEnd;

            if (end > monthDays) {
                overFlowStart = 1;
                overFlowEnd = end % monthDays;
                overFlowWeeks = arsHelpers.generateWeekColumns(overFlowStart, overFlowEnd);
                end = end - overFlowEnd;
            }
            weekdaysArray = arsHelpers.generateWeekColumns(start, end);
        }
        let final = {};

        if (overFlowWeeks.length > 0) {
            Object.assign(final, { [applicableMonth]: weekdaysArray, [nextApplicableMonth]: overFlowWeeks });
        } else {
            Object.assign(final, { [applicableMonth]: weekdaysArray });
        }
        return final;
    },

    async getWeekDaysPskuWise(distPdpDistributionArray: any, normCycleSafetyValues: any) {
        logger.info('inside AutoValidationRules -> getWeekDaysPskuWise ');

        distPdpDistributionArray = [...new Map(distPdpDistributionArray.map((item) => [item['pdp'], item])).values()];

        return distPdpDistributionArray.map((ele: any) => {
            let psku = ele.psku;

            let pdpType = ele.pdp.substring(0, 2);
            let pdpWin = ele.pdp.substring(2);
            if (pdpType == 'WE') {
                let pdpArray = pdpWin.match(/.{1,2}/g);
                //CHANGES: referring to this method
                return AutoValidationRules.calculateWeekDays(pdpType, pdpArray, 6, psku);
            } else if (pdpType == 'FN') {
                let pdpArray = pdpWin.match(/.{1,2}/g);
                return AutoValidationRules.calculateWeekDays(pdpType, pdpArray, 6, psku);
            }
        });
    },

    async getSuggestedOrder(forecastedPSKUDistWise, stockNormTotalArrayPskuWise, distId, base_to_case, pac_to_case) {
        let finalArray: { productCode: string; qty: string }[] = [];
        for (let item of forecastedPSKUDistWise) {
            let stockNormOb, convOb, baseConv, pacConv;

            if (Object.keys(base_to_case).length > 0) {
                baseConv = base_to_case[item.sku];
            }
            if (Object.keys(pac_to_case).length > 0) {
                pacConv = pac_to_case[item.sku];
            }

            if (baseConv == null || pacConv == null) {
                //TODO: REPORTING HERE
            }

            stockNormOb = stockNormTotalArrayPskuWise?.find((sn) => {
                return sn.psku == item.sku;
            });

            let suggestedQty = 0;
            //CHANGES: SIH, SIT and OO always considered as 0
            let transitQty: number = 0;
            let inhandQty: number = 0;
            let openOrderQty: number = 0;
            let base: any = baseConv != undefined ? parseFloat(baseConv) : 1;
            // let pac: any = (pacConv != undefined) ? parseFloat(pacConv) : 1
            let stockNorm: number = stockNormOb != undefined ? parseFloat(parseFloat(stockNormOb.val).toFixed(2)) : 0;

            const convertedStockNorm = stockNorm / base < 1 ? 0 : stockNorm / base;
            //CHANGES: no need for SIH, SIT, OO
            suggestedQty = Math.ceil(convertedStockNorm);
            //CHANGES: if suggestedQty <=0, consider as 1
            suggestedQty = suggestedQty <= 0 || Number.isNaN(suggestedQty) ? 1 : suggestedQty;
            logger.info(`ARS ->DIST(${distId}) :: PSKU(${item.sku}) :: SuggestedQty(${suggestedQty})`);

            //CHANGES: no need to check for 0 qty
            finalArray.push({
                productCode: item.sku,
                qty: suggestedQty.toString(),
            });
        }
        //CHANGES: no need to sort the array in descending order
        return finalArray;
    },

    async validateUploadRegionForecast(data, user) {
        let validationFailureReason = '';
        const requiredColumnMapping = {
            db_code: 'distributor_code',
            psku: 'psku',
            adjusted_forecast_buom: 'adjusted_allocation',
        };
        const requiredColumnOrderHistoryMapping = {
            db_code: 'distributor_code',
            psku: 'material_code',
        };
        const requiredColumns = Object.keys(requiredColumnMapping);
        const dbPskuMap = {};
        const result = {
            status: true,
            message: SuccessMessage.UPLOAD_SUCCESSFUL,
            data: {},
            formattedData: [],
        };

        for (const [sheet, value] of Object.entries(data)) {
            const errorMessage: string[] = [];
            const dbPskuArr: {}[] = [];
            let formattedResult = [];
            if (Array.isArray(value)) {
                for (let index = 0; index < value.length; index++) {
                    const item = value[index];
                    if (dbPskuMap.hasOwnProperty(`${item.DB_Code}#${item.PSKU}`)) {
                        validationFailureReason = `Error in ${sheet} line - ${index + 2} : Row already exists`;
                        errorMessage.push(validationFailureReason);
                    }
                    const formattedItem = Object.keys(item).reduce((acc, key) => {
                        const formattedKey = key
                            .trim()
                            .replace(/\s{2,}/g, ' ')
                            .toLocaleLowerCase();
                        acc[formattedKey] = item[key];
                        return acc;
                    }, {});
                    const tempOrderHistoryMapping = {};
                    let validItem = true;
                    for (let column of requiredColumns) {
                        if (!formattedItem.hasOwnProperty(column)) {
                            validItem = false;
                            if (index == 0) {
                                break;
                            } else {
                                validationFailureReason = `Error in ${sheet} line ${index + 2} : ${column} is not present in sheet`;
                                errorMessage.push(validationFailureReason);
                            }
                        } else {
                            formattedItem[requiredColumnMapping[column]] = formattedItem[column];
                        }
                        if (requiredColumnOrderHistoryMapping.hasOwnProperty(column)) {
                            tempOrderHistoryMapping[requiredColumnOrderHistoryMapping[column]] = formattedItem[column];
                        }
                    }
                    if (validItem) {
                        dbPskuMap[`${item.DB_Code}#${item.PSKU}`] = true;
                        let adjustedForecast = formattedItem[requiredColumns[2]];
                        const decimalPlaceRegex = /\b\d+\.\d{3,}\b/;
                        if (isNaN(adjustedForecast) || (!isNaN(adjustedForecast) && adjustedForecast < 0)) {
                            validationFailureReason = `Error in ${sheet} line - ${index + 2} : Adjusted forecast must be a positive number`;
                            errorMessage.push(validationFailureReason);
                        }
                        if (!isNaN(adjustedForecast) && decimalPlaceRegex.test(adjustedForecast)) {
                            adjustedForecast = parseFloat(adjustedForecast.toFixed(2));
                        }
                        const finalData = Object.keys(formattedItem).reduce((acc, entry) => {
                            if (typeof formattedItem[entry] === 'string' && /['%,\$\/\*]/.test(formattedItem[entry])) {
                                acc[entry] = formattedItem[entry].replace(/['%,\$\/\*]/g, '');
                            } else acc[entry] = formattedItem[entry];
                            return acc;
                        }, {});
                        finalData['sheetName'] = sheet;
                        formattedResult.push(finalData);
                        dbPskuArr.push(tempOrderHistoryMapping);
                    } else if (!validItem && index > 0) {
                        break;
                    }
                }
            }
            const mismatchResult = await ArsModel.getMissingDBPskuCombination(dbPskuArr);
            if (mismatchResult?.missing_distributors?.length || mismatchResult?.missing_materials?.length) {
                const mismatchedAreas = new Set();
                const mismatchedDb = new Set([...(mismatchResult.missing_distributors ?? [])]);
                const mismatchedPsku = new Set([...(mismatchResult.missing_materials ?? [])]);
                formattedResult = formattedResult.filter((item) => {
                    if (!(mismatchedDb.has(`${item['db_code']}`) || mismatchedPsku.has(`${item['psku']}`))) return item;
                    else mismatchedAreas.add(item['sheetName']);
                });
                logger.info(
                    `Inside ValidationRules -> validateUploadRegionForecast: Found Mismatched DB or PSKU for sheets [${Array.from(mismatchedAreas).join(',')}] - `,
                    mismatchResult,
                );
            }
            //SOPE-4411 : Allow Invalid DB or PSKU for forecast upload
            // if (!(mismatchResult && (!mismatchResult.missing_distributors && !mismatchResult.missing_materials))) {
            //     if (mismatchResult) {
            //         const missingDistributors = mismatchResult.missing_distributors ? `db_code: ${mismatchResult.missing_distributors}` : '';
            //         const missingMaterials = mismatchResult.missing_materials ? `psku: ${mismatchResult.missing_materials}` : '';
            //         errorMessage.push(`Mismatch found for ${missingDistributors} ${missingMaterials}`.trim());
            //     }
            //     else {
            //         errorMessage.push('Unable to fetch mismatch db/psku list')
            //     }
            // }
            result.formattedData = [...result.formattedData, ...formattedResult];

            if (errorMessage.length > 0) {
                result.status = false;
                result.message = ErrorMessage.VALIDATION_ERRORS;
                result.data[sheet] = {
                    status: false,
                    message: `Excel sheet for the following area ${sheet} has the following error(s)`,
                    data: {
                        isValid: false,
                        errorMessages: errorMessage,
                    },
                };
            }
        }
        return result;
    },
};
