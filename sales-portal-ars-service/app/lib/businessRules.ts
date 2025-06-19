import logger from '../lib/logger';
import { arsHelpers } from '../helper/arsHelper';
import { ErrorMessage } from '../constants/errorMessage';
import { UploadStockNorm } from '../interfaces/uploadStockNorm';
import { ArsModel } from '../model/arsModel';
import DBPskuTolerance from '../interfaces/dbPskuTolerance';
import { ArsSuggestedMaterials } from '../interfaces/arsSuggestedMaterials';
import { ForecastedPskuDistWise } from '../interfaces/forecastedPskuDistWise';

export const ArsRules = {
    async getWeekDaysPskuWise(
        distPdpDistributionArray: any,
        normCycleSafetyValues: any,
        applicableMonth: string,
        nextApplicableMonth: string,
        simulation_date: string | null = null,
    ) {
        logger.info('inside ArsRules -> getWeekDaysPskuWise ');

        let final = await arsHelpers.groupUpData(distPdpDistributionArray, normCycleSafetyValues);
        let result = [];

        for (let key of Object.keys(final)) {
            let snPdp = key.split('_');
            let pdp = snPdp[1];
            let sn = parseInt(snPdp[0]);
            let pdpType = pdp.substring(0, 2);
            let pdpWin = pdp.substring(2);
            let pdpArray = pdpWin.match(/.{1,2}/g);
            result.push(arsHelpers.calculateWeekDays(pdpType, pdpArray, sn, final[key], applicableMonth, nextApplicableMonth, simulation_date));
        }
        return result;
    },

    async getSuggestedOrder(
        distId: string,
        forecastedPSKUDistWise: ForecastedPskuDistWise[] | null,
        transitStockData,
        inhandStockData,
        openOrderStockData,
        stockNormTotalArrayPskuWise,
        base_to_case,
        pac_to_case,
        last_order_data: any[],
        excludedPSKU: string[],
        normCycleSafetyValues: {},
        soqNorm: {},
        skuSoqNorm: {} = {},
        providedStockNormInCV: boolean = false,
    ) {
        let orderMap = new Map();
        last_order_data?.forEach((item) => orderMap.set(item.psku, item.total_qty));

        let finalArray: ArsSuggestedMaterials[] = [];
        if (!forecastedPSKUDistWise?.length) {
            return finalArray;
        }
        for (let item of forecastedPSKUDistWise) {
            /**
             * https://tataconsumer.atlassian.net/browse/SOPE-1485:
             * If the PSKU is added in sku_rule_config and not available for the particular area/customer-group combination, then it should not be suggested in ARS nor it should appear the the material search.
             */
            if (excludedPSKU.includes(item.sku)) {
                continue;
            }

            let suggestedQty = 0;
            let soq_norm_qty: string | null = null;
            let transitQty: number = +(transitStockData[item.sku] ?? 0);
            let inhandQty: number = +(inhandStockData[item.sku] ?? 0);
            let openOrderQty: number = +(openOrderStockData[item.sku] ?? 0);
            let base: number = parseFloat(base_to_case[item.sku] ?? 1);
            let pac: number = parseFloat(pac_to_case[item.sku] ?? 1);
            let stockNorm: number = parseFloat(parseFloat(stockNormTotalArrayPskuWise[item.sku] ?? 0).toFixed(2)) ?? 0;
            const sn_days: string = normCycleSafetyValues[item.sku]?.stock_norm;
            const convertedStockNorm = providedStockNormInCV ? stockNorm : Math.max(stockNorm / base, 0);
            /**
             * RULES FOR SUGGESTED ORDER QUANTITY(SOQ) CALCULATION:
             * SOQ = SN - (SIH + SIT + OO), (SIH + SIT + OO) a.k.a. HOLDING
             * If order was placed for the same PSKU in the same day, then SOQ = 0
             * If SOQ < 0, then SOQ = 0
             * If division is present in soqNorm, then if HOLDING < SOQ_NORM_QTY, then SOQ = SOQ_NORM_QTY, else SOQ = 0
             * SIH, SIT and OO are rounded ceil values, because in UI we are showing the values in ceil format.
             * If material is present in skuSoqNorm, then if HOLDING < SOQ_NORM_QTY, then SOQ = SOQ_NORM_QTY, else SOQ = 0
             */
            /**
             * RULE PRIORITY ORDER:
             * [1]. Order placed for the same PSKU in the same day
             * [2]. SKU_SOQ_NORM_QTY
             * [3]. SOQ_NORM_QTY
             * [4]. SN - (SIH + SIT + OO)
             */
            const sih: number = Math.ceil(Math.abs(inhandQty)) ?? 0;
            const sit: number = Math.ceil(Math.abs(transitQty)) ?? 0;
            const oo: number = Math.ceil(Math.abs(openOrderQty)) ?? 0;
            const holding: number = sih + sit + oo;

            if (orderMap.has(item.sku) || (orderMap.size > 0 && !providedStockNormInCV)) {
                /**
                 * SOPE-2111: Removal of suggested line items for the day which have been ordered by a DB in ARS
                 * SOPE-3304: If ARS order is placed in the same day, then suggested qty for all items should be 0
                 * providedStockNormInCV is acting as an identifier whether the function been called from AOS
                 */
                // suggestedQty = 0;
                logger.info(`ARS -> DistId(${distId}) :: PSKU(${item.sku}) :: OrderPlacedToday(${orderMap.get(item.sku)}) :: SuggestedQty(${suggestedQty})`);
            } else if (skuSoqNorm[item.sku]) {
                if (holding < +skuSoqNorm[item.sku]) {
                    soq_norm_qty = skuSoqNorm[item.sku];
                    suggestedQty = +skuSoqNorm[item.sku] - holding;
                }
                logger.info(`ARS -> DistId(${distId}) :: PSKU(${item.sku}) :: Holding(${holding}) :: SkuSoqNorm(${skuSoqNorm[item.sku]}) :: SuggestedQty(${suggestedQty})`);
            } else if (soqNorm.hasOwnProperty(item.sku) && !orderMap.has(item.sku)) {
                if (holding < +soqNorm[item.sku]) {
                    //item under soq norm and order not placed for the same day
                    suggestedQty = +soqNorm[item.sku] - holding;
                    soq_norm_qty = soqNorm[item.sku];
                }
                logger.info(`ARS -> DistId(${distId}) :: PSKU(${item.sku}) :: Holding(${holding}) :: SoqNorm(${soqNorm[item.sku]}) :: SuggestedQty(${suggestedQty})`);
            } else {
                //calculate suggested qty based on SN, SIH, SIT, OO
                suggestedQty = Math.ceil(convertedStockNorm - sih - sit - oo);
                //If suggested qty is negative, then set it to 0
                suggestedQty = suggestedQty < 0 || Number.isNaN(suggestedQty) ? 0 : suggestedQty;
                !providedStockNormInCV
                    ? logger.info(
                          `ARS -> DistId(${distId}) :: PSKU(${item.sku}) :: SuggestedQty(${suggestedQty}) = (StockNorm(${stockNorm}) / Conversion(${base})) - (InhandQty(${sih})) - TransitQty(${transitQty}). OpenOrderQty(${openOrderQty})`,
                      )
                    : logger.info(
                          `ARS -> DistId(${distId}) :: PSKU(${item.sku}) :: SuggestedQty(${suggestedQty}) = StockNormCV(${stockNorm}) - (InhandQty(${sih})) - TransitQty(${transitQty}). OpenOrderQty(${openOrderQty})`,
                      );
            }

            finalArray.push({
                productCode: item.sku,
                qty: suggestedQty.toString(),
                pskuClass: item.class,
                sn_days: sn_days,
                soq_norm_qty,
                sih,
                sit,
                oo,
            });
        }
        //Sort final array in descending order
        return finalArray.sort((a: { productCode: string; qty: string }, b: { productCode: string; qty: string }) => {
            return Number(b?.qty) - Number(a?.qty);
        });
    },
    /**
     * This function is used to validate the forecast file uploaded by the user.
     * @param data
     * @returns
     */
    async forecastFileUploadValidation(areaCode: string, data: any[], existingForecast: any[] | null = []) {
        /**
         * https://tataconsumer.atlassian.net/browse/SOPE-2088: Update of ARS forecast download and upload functionality to allow adjustment of 0 forecast items as well
         * VALIDATIONS APPLIED:
         * File is not empty
         * File must contain the necessary sales data columns- L3M, forecast and adjusted forecast, etc.
         * There should not be any mismatch of data except the adjusted forecast.
         * Adjusted forecast should not contain negative values or decimal values.
         * Checking totals for only those PSKUs which have been modified.(Reason mentioned in SOPE-2088)
         * Totals has to be matched at PSKU level, as matching total at area level will create a loop hole. Eg. as you can see area wise total remain same, but at PSKU level the total is changing, which is not correct.
         * PSKU	DB	FORECAST	ADJUSTED		FORECAST TOTAL per PSKU	    ADJUSTED TOTAL per PSKU
            P1	DB1	12	        30		        27	                        50
            P1	DB2	15	        20			
            P2	DB1	10	        10		        60	                        37
            P2	DB2	20	        12			
            P2	DB3	30	        15			
            TOTAL	87	        87			
         * If at PSKU level, total forecast = 0, then adjusted forecast can be > 0  (i.e. Quantity Norm case)
         */
        /**
         * TEST CASES:
         * 1. Empty file
         * 2. File missing sales data columns
         * 3. Mismatch of data except the adjusted forecast
         * 4. Totals mismatch at PSKU level
         * 5. Totals mismatch at area level
         * 6. Duplicate rows
         * 7. Negative values
         * 8. Invalid values
         * 9. Zero forecasted values
         * 10. Mixed up data from different areas - NOT HANDLED
         * 11. Decimal values not to be allowed
         */
        const errorMessages: string[] = [];
        const adjustedForecastTotalByPSKU = {};
        const existingForecastTotalByPSKU = {};
        let mismatchedData = [];
        const dbPskuArr: {
            distributor_code: number;
            material_code: number;
        }[] = [];
        const requiredProperties = ['adjusted_forecast', 'by_allocation', 'parent_sku', 'sold_to_party'];
        const dbpskuMap = new Map();

        if (data?.length === 0) {
            errorMessages.push(ErrorMessage.FILE_EMPTY);
        } else if (!requiredProperties.every((prop) => data[0]?.hasOwnProperty(prop))) {
            errorMessages.push(ErrorMessage.FORECAST_FILE_MISSING_SALES_DATA);
        }

        // Calculate the total adjusted forecast by PSKU
        data?.forEach((item, index) => {
            const dbPskuKey = item.parent_sku + '#' + item.sold_to_party;
            const invalidCharacterRegex = /['%,\$\/\*]/;
            if (invalidCharacterRegex.test(item.parent_sku) || invalidCharacterRegex.test(item.sold_to_party)) {
                errorMessages.push(ErrorMessage.FORECAST_FILE_INVALID_DB_PSKU + ` at row ${index + 2}`);
            }
            if (item.adjusted_forecast < 0 && +item.by_allocation >= 0) {
                errorMessages.push(ErrorMessage.FORECAST_FILE_NEGATIVE_VALUES + ` at row ${index + 2}`);
            }
            if (isNaN(item.adjusted_forecast) || item.adjusted_forecast == null) {
                errorMessages.push(ErrorMessage.FORECAST_FILE_INVALID_VALUES + ` at row ${index + 2}`);
            }
            if (dbpskuMap.has(dbPskuKey)) {
                errorMessages.push(`Duplicate row exists for Distributor Code ${item.sold_to_party} and PSKU ${item.parent_sku} at row ${index + 2}`);
            } else {
                dbpskuMap.set(dbPskuKey, true);
            }
            if (!isNaN(item.parent_sku) && !isNaN(item.sold_to_party)) {
                dbPskuArr.push({
                    distributor_code: item.sold_to_party,
                    material_code: item.parent_sku,
                });
            }
            // adjustedForecastTotalByPSKU[item.parent_sku] = math.add(math.bignumber(adjustedForecastTotalByPSKU[item.parent_sku] ?? 0) , math.bignumber(item.adjusted_forecast));
        });
        // existingForecast?.forEach(item => {
        //     existingForecastTotalByPSKU[item.parent_sku] = math.add(math.bignumber(existingForecastTotalByPSKU[item.parent_sku] ?? 0) , math.bignumber(item.forecast));
        // });
        let finalResult = data;
        //Verifying if distributor code and psku codes are valid
        if (!errorMessages.length) {
            const dbPskuMismatchResult = await ArsModel.getMissingDBPskuCombination(dbPskuArr);
            if (!(dbPskuMismatchResult && !dbPskuMismatchResult.missing_distributors && !dbPskuMismatchResult.missing_materials)) {
                if (dbPskuMismatchResult) {
                    //SOPE-4411 : Allow Invalid DB or PSKU for forecast upload
                    // const missingDistributors =
                    //   dbPskuMismatchResult.missing_distributors
                    //     ? `db_code: ${dbPskuMismatchResult.missing_distributors}`
                    //     : '';
                    // const missingMaterials =
                    //   dbPskuMismatchResult.missing_materials
                    //     ? `psku: ${dbPskuMismatchResult.missing_materials}`
                    //     : '';
                    // errorMessages.push(
                    //   `Mismatch found for ${missingDistributors} ${missingMaterials}`.trim(),
                    // );
                    logger.info(`Inside BusinessRules -> forecastFileUploadValidation: Found Mismatched DB or PSKU for ${areaCode}: `, dbPskuMismatchResult);
                    const missingDb = new Set([...(dbPskuMismatchResult.missing_distributors ?? [])]);
                    const missingPsku = new Set([...(dbPskuMismatchResult.missing_materials ?? [])]);
                    finalResult = data.filter((item) => !(missingDb.has(`${item.sold_to_party}`) || missingPsku.has(`${item.parent_sku}`)));
                } else {
                    errorMessages.push('Unable to fetch mismatch db/psku list');
                }
            }
            const result = await ArsModel.findUploadedFileMismatchRecords(finalResult, existingForecast);
            if (result?.length > 0) {
                errorMessages.push(ErrorMessage.FORECAST_FILE_MISMATCH);
                mismatchedData = result;
            }
        }
        //SOPE-3535: Removing the check for total mismatch at PSKU level
        // Object.keys(adjustedForecastTotalByPSKU)?.forEach(key => {
        //     if (modifiedPsku.has(key) && existingForecastTotalByPSKU[key] > 0 && !math.equal(existingForecastTotalByPSKU[key], adjustedForecastTotalByPSKU[key])) {
        //         errorMessages.push(ErrorMessage.FORECAST_FILE_TOTAL_MISMATCH + ` for PSKU: ${key}` +'  '+ `Suggested Forecast : ${existingForecastTotalByPSKU[key]} Adjusted Forecast : ${adjustedForecastTotalByPSKU[key]} `);
        //     }
        // });

        return {
            isValid: errorMessages.length === 0,
            errorMessages,
            mismatchedData,
            finalResult,
        };
    },

    arsOrderReportSummary(report) {
        /**
         * This function is used to generate the summary of the ARS order report.
         * summary = {
            [region]: {
                    so_number: new Set(),
                    tentative: numeric,
                    db: new Set()
                }
            }
         * Output: summaryFinal: {region, orderCount, tentative, dbCount}[], 
         */
        try {
            const summary = {};
            let totalDbs: number = 0;
            let totalTentative: number = 0;
            let totalOrders: number = 0;
            report?.forEach((r) => {
                const region = r['Region'];
                const so = r['SO Number'];
                const tentative = r['Tentative Value(₹)'];
                const db = r['Distributor ID'];
                if (!summary[region]) {
                    summary[region] = {
                        so_number: new Set(),
                        tentative: 0,
                        db: new Set(),
                    };
                }
                summary[region].so_number.add(so);
                summary[region].tentative += +tentative;
                summary[region].db.add(db);
            });

            const summaryFinal = Object.keys(summary)
                ?.sort()
                ?.map((region) => {
                    totalDbs += summary[region].db.size;
                    totalTentative += summary[region].tentative;
                    totalOrders += summary[region].so_number.size;
                    return {
                        region,
                        orderCount: summary[region].so_number.size,
                        tentative: arsHelpers.convertAmountLakhOrCrore(summary[region].tentative),
                        dbCount: summary[region].db.size,
                    };
                });
            summaryFinal.push({
                region: 'Total',
                orderCount: totalOrders,
                tentative: arsHelpers.convertAmountLakhOrCrore(totalTentative),
                dbCount: totalDbs,
            });
            return summaryFinal;
        } catch (error) {
            logger.error('CAUGHT ERROR: ArsRules -> arsOrderReportSummary: ', error);
            return null;
        }
    },

    stockNormFileUploadValidation(data: UploadStockNorm[]) {
        /**
         * VALIDATION APPLIED:
         * File is not empty
         * Stock norm should be in +ve integer and within range of 0-30. Because SN above >30 days would require forecast_distribution to be also present for next 2 months
         * Special characters in soq_norm are not allowed
         */
        const errorMessages: {
            __line__: number | null;
            message: string;
        }[] = [];
        if (data?.length === 0) {
            errorMessages.push({
                __line__: null,
                message: ErrorMessage.FILE_EMPTY,
            });
        }
        data?.forEach((d, index) => {
            if (d.class_of_last_update == null || d.psku == null) {
                errorMessages.push({
                    __line__: index + 2,
                    message: ErrorMessage.STOCK_NORM_MANDATORY_COLUMNS,
                });
            }
            if (d.stock_norm < 0 || d.stock_norm > 30) {
                errorMessages.push({
                    __line__: index + 2,
                    message: ErrorMessage.STOCK_NORM_RANGE,
                });
            }
            if (isNaN(d.stock_norm) || d.stock_norm == null) {
                errorMessages.push({
                    __line__: index + 2,
                    message: ErrorMessage.STOCK_NORM_INVALID,
                });
            }
            if (d.original_upload && ArsRules.containsSpecialCharacters(d.original_upload)) {
                errorMessages.push({
                    __line__: index + 2,
                    message: ErrorMessage.STOCK_NORM_CONTAINS_SPECIAL_CHARACTERS,
                });
            }
            delete d.original_upload;
        });
        return {
            isValid: errorMessages.length === 0,
            errorMessages,
        };
    },

    classLevelStockNormFileUploadValidation(data) {
        /**
         * VALIDATION APPLIED:
         * File is not empty
         * Mandatory columns are present and not null or undefined or ''
         * Adjusted stock norm should be in +ve integer and within range of 0-30. Because SN above >30 days would require forecast_distribution to be also present for next 2 months
         * Values cannot have special characters
         */
        const errorMessages: {
            __line__: number | null;
            message: string;
        }[] = [];
        const mandatoryColumns = ['db', 'a', 'b', 'c'];
        if (data?.length === 0) {
            errorMessages.push({
                __line__: null,
                message: ErrorMessage.FILE_EMPTY,
            });
        }
        data?.forEach((d, index) => {
            mandatoryColumns.forEach((column) => {
                if (!d.hasOwnProperty(column) || d[column] == null || d[column] === '') {
                    errorMessages.push({
                        __line__: index + 2,
                        message: ErrorMessage.CLASS_LEVEL_STOCK_NORM_MANDATORY_COLUMNS,
                    });
                }
                if (['a', 'b', 'c'].includes(column)) {
                    if (isNaN(d[column]) || d[column] == null) {
                        errorMessages.push({
                            __line__: index + 2,
                            message: ErrorMessage.STOCK_NORM_INVALID,
                        });
                    }
                    if (d[column] < 0 || d[column] > 30) {
                        errorMessages.push({
                            __line__: index + 2,
                            message: `${ErrorMessage.STOCK_NORM_RANGE} in column '${column.toUpperCase()}'`,
                        });
                    }
                    if (d[column] && ArsRules.containsSpecialCharacters(d[column])) {
                        errorMessages.push({
                            __line__: index + 2,
                            message: ErrorMessage.STOCK_NORM_CONTAINS_SPECIAL_CHARACTERS,
                        });
                    }
                }
            });
        });
        return {
            isValid: errorMessages.length === 0,
            errorMessages,
        };
    },

    containsSpecialCharacters(data): boolean {
        /**
         * I/P -> O/P
         * 1234 -> false
         * -90 -> false
         * 90 -> false
         * 90.5 -> false
         * 90a -> true
         * -90.5 -> false
         */
        const regex = /[^0-9.-]/;
        return regex.test(data);
    },

    async validateDBPskuTolerance(data: DBPskuTolerance[]): Promise<{
        isValid: boolean;
        errorMessages: { __line__: number | null; message: string }[];
    }> {
        /**
         * VALIDATION APPLIED:
         * File is not empty
         * No duplicate distributor_code and psku combination
         * distributor_code and psku must be present in distributor master and material master respectively
         * max has to be positive integer >=0
         * min has to be negative integer <=0
         * no special characters in max and min
         * distributor_code, psku, max or min cannot be empty
         */
        const errorMessages: {
            __line__: number | null;
            message: string;
        }[] = [];
        const dbPskuSet = new Set();
        if (data?.length === 0) {
            errorMessages.push({
                __line__: null,
                message: ErrorMessage.FILE_EMPTY,
            });
        }
        const result = await ArsModel.getMissingDBPskuCombination(data);
        const missing_materials = result?.missing_materials ?? [];
        const missing_distributors = result?.missing_distributors ?? [];

        data?.forEach((d, index) => {
            if (dbPskuSet.has(`${d.distributor_code}_${d.psku}`)) {
                errorMessages.push({
                    __line__: index + 2,
                    message: ErrorMessage.DUPLICATE_DISTRIBUTOR_CODE_PSKU,
                });
            }
            dbPskuSet.add(`${d.distributor_code}_${d.psku}`);
            if (missing_materials.includes(d.psku)) {
                errorMessages.push({
                    __line__: index + 2,
                    message: ErrorMessage.MISSING_MATERIAL_CODE,
                });
            }
            if (missing_distributors.includes(d.distributor_code)) {
                errorMessages.push({
                    __line__: index + 2,
                    message: ErrorMessage.MISSING_DISTRIBUTOR_CODE,
                });
            }
            if (isNaN(d.max) || d.max == null || d.max < 0 || ArsRules.containsSpecialCharacters(d.max)) {
                errorMessages.push({
                    __line__: index + 2,
                    message: ErrorMessage.MAX_INVALID,
                });
            }
            if (isNaN(d.min) || d.min == null || d.min > 0 || ArsRules.containsSpecialCharacters(d.min)) {
                errorMessages.push({
                    __line__: index + 2,
                    message: ErrorMessage.MIN_INVALID,
                });
            }
            if (!d.distributor_code || !d.psku || d.max == null || d.min == null) {
                errorMessages.push({
                    __line__: index + 2,
                    message: ErrorMessage.DISTRIBUTOR_CODE_PSKU_MAX_MIN_EMPTY,
                });
            }
        });
        return {
            isValid: errorMessages.length === 0,
            errorMessages,
        };
    },
};
