import logger from "../lib/logger";
import _ from "lodash";
import { SkuRuleConfigurationsModel } from "../models/skuRuleConfig.model";

export const SkuRuleConfigurationsService = {
    async getCustomerGroups() {
        return await SkuRuleConfigurationsModel.getCustomerGroups();
    },

    async getSKUCode(areaCodes: string[], nonForecasted: boolean, distChannels: string[] = []) {
        logger.info("inside SkuRuleConfigurationsService -> getSKUCode");
        let distChannel = ''
        switch (distChannels[0]) {
            case 'GT':
                distChannel = 'GT';
                break;
            case 'NOURISHCO':
                distChannel = 'NCO';
                break;
            default:
                distChannel = 'GT';
                break;
        }
        const skuCodes = await SkuRuleConfigurationsModel.getSKUCodes(nonForecasted,distChannels);
        const skuCodesMap = (nonForecasted || areaCodes.length === 0) ? skuCodes : skuCodes?.filter(sku => {
            return sku.appl_area_channel?.some(item => (areaCodes.includes(item.area) && item.channel === distChannel));
        })
        return skuCodesMap?.map(item => {
            return { code: item.code, description: item.description, dist_channels: item.dist_channels };
        });;
    },

    async getSKUDetails(sku: string, areaCodes: string[] = [], nonForecasted: boolean) {
        try {
            const result = await SkuRuleConfigurationsModel.getSKUDetails(sku, nonForecasted);
            const skuCodesMap: {
                area_code: string,
                code: string,
                description: string,
                brand_name: string,
                brand_variant: string,
                dist_channels: number[],
            }[] = [];
            result?.forEach(res => {
                const applicableAreas = res.appl_area_channel?.filter(item => areaCodes.length === 0 || (areaCodes?.includes(item.area) && item.channel === 'GT'));
                _.sortBy(applicableAreas, ['area'])?.forEach(item => {
                    skuCodesMap.push({ code: res.code, description: res.description, area_code: item.area, brand_name: res.brand_name, brand_variant: res.brand_variant, dist_channels: res.dist_channels});
                });
            });
            return nonForecasted ? result : _.uniqWith(skuCodesMap, _.isEqual);
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> getSKUDetails: ", error);
            return null;
        }
    },

    async upsertSkuRuleConfigurations(
        data: {
            area_code: string,
            sku_code: string,
            deleted: boolean | null,
            cg_db: {
                [key: string]: {
                    [key: string]: boolean | string[]
                }
            },
            dist_channels: number[],
        }[],
        updatedBy: string,
    ) {
        const response = {};
        return await SkuRuleConfigurationsModel.upsertSkuRuleConfigurations(data, updatedBy)
    },

    async getSkuRuleConfigurations(areaCodes: string[] | null, search: string | null, distChannels: string[] = []) {
        return await SkuRuleConfigurationsModel.getSkuRuleConfigurations(areaCodes, search, distChannels);
    },

    async fetchBrandAndBrandVariantCombinations(areaCodes: string[] | null) {
        return await SkuRuleConfigurationsModel.fetchBrandAndBrandVariantCombinations(areaCodes);
    },

    async fetchBrandVariantDetails(brandVariantCode: string, areaCodes: string[] = []) {
        logger.info("inside SkuRuleConfigurationsService -> fetchBrandVariantDetails");
        try {
            const result = await SkuRuleConfigurationsModel.fetchBrandVariantDetails(brandVariantCode);
            let detailsMap: {
                area_code: string,
                brand: string,
                brand_desc: string,
                brand_variant: string,
                brand_variant_desc: string,
                psku_details: {
                    code: string,
                    description: string
                }[]
            }[] = [];
            const applicablePsku = {};
            if (!result) return null;
            result?.forEach(res => {
                //if no area codes are passed, then return all applicable areas.
                //TODO: DISCUSSION: If no app_area_channel is present, then what to do? Does it mean it is applicable for all areas?
                const applicableAreas = res.appl_area_channel?.filter(item => areaCodes?.length === 0 || (areaCodes?.includes(item.area)));
                _.sortBy(applicableAreas, ['area'])?.forEach(item => {
                    detailsMap.push({
                        area_code: item.area,
                        brand: res.brand,
                        brand_desc: res.brand_desc,
                        brand_variant: res.brand_variant,
                        brand_variant_desc: res.brand_variant_desc,
                        psku_details: []
                    });
                    if (!applicablePsku[`${res.brand_variant}_${item.area}`]) {
                        applicablePsku[`${res.brand_variant}_${item.area}`] = [];
                    }
                    applicablePsku[`${res.brand_variant}_${item.area}`].push({ psku: res.code, description: res.description });
                });
            });
            detailsMap = _.uniqWith(detailsMap, _.isEqual);
            detailsMap?.forEach(item => {
                item.psku_details = _.uniqWith(applicablePsku[`${item.brand_variant}_${item.area_code}`], _.isEqual);
            });
            return _.sortBy(detailsMap, ['area_code']);
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> fetchBrandVariantDetails: ", error);
            return null;
        }
    },

    async upsertBrandVariantPrioritization(
        data: {
            area: string,
            brand_variant: string,
            priority: number | string,
            deleted?: boolean | null,
        }[],
        updated_by: string
    ) {
        try {
            const response = {};
            for (const d of data) {
                const result = await SkuRuleConfigurationsModel.upsertPrioritization(d.area, d.brand_variant, d.priority, updated_by, d.deleted ?? false);
                response[`${d.area}_${d.brand_variant}`] = result;
            }
            return response;
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> upsertBrandVariantRuleConfigurations: ", error);
            return null;
        }
    },

    async fetchPrioritization(areaCodes: string[] | null = [], search: string | null = null) {
        logger.info("inside SkuRuleConfigurationsService -> fetchPrioritization");
        try {
            const result = await SkuRuleConfigurationsModel.fetchPrioritization(areaCodes, search);
            let detailsMap: {
                id: number,
                priority: number,
                area_code: string,
                brand: string,
                brand_desc: string,
                brand_variant: string,
                brand_variant_desc: string,
                updated_by: string,
                updated_on: string,
                first_name?: string,
                last_name?: string,
                psku_details: {
                    code: string,
                    description: string
                }[]
            }[] = [];
            const applicablePsku = {};
            if (!result) return null;
            result?.forEach(res => {
                detailsMap.push({
                    id: res.id,
                    priority: res.priority,
                    area_code: res.area_code,
                    brand: res.brand,
                    brand_desc: res.brand_desc,
                    brand_variant: res.brand_variant,
                    brand_variant_desc: res.brand_variant_desc,
                    updated_by: res.updated_by,
                    updated_on: res.updated_on,
                    first_name: res.first_name,
                    last_name: res.last_name,
                    psku_details: []
                });
                //find the psku that are applicable for this brand_variant and area_code
                const isApplicable = res.appl_area_channel?.some(item => res?.area_code === item.area);
                if (isApplicable) {
                    if (!applicablePsku[`${res.brand_variant}_${res.area_code}`]) {
                        applicablePsku[`${res.brand_variant}_${res.area_code}`] = [];
                    }
                    applicablePsku[`${res.brand_variant}_${res.area_code}`].push({ psku: res.code, description: res.description });
                }
            });
            const detailsMapUniq = _.uniqWith(detailsMap, function (a, b) {
                return a.id === b.id && a.area_code === b.area_code && a.brand_variant === b.brand_variant;
            });
            detailsMapUniq?.forEach(item => {
                item.psku_details = _.uniqWith(applicablePsku[`${item.brand_variant}_${item.area_code}`], _.isEqual);
            });
            return _.sortBy(detailsMapUniq, ['area_code', 'priority']);
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsModel -> fetchPrioritization: ", error);
            return null;
        }
    },
    async fetchNonForecastedPsku(areaCode: string[], distChannels: string[] = []) {
        return await SkuRuleConfigurationsModel.fetchNonForecastedPsku(areaCode, distChannels);
    },
    async upsertNonForecastedPsku(
        payload: [
            {
                psku: string,
                area_code: string,
                deleted: boolean,
                cg_db: {
                    [key: string]: {
                        [key: string]: string[] | boolean
                    }
                },
                dist_channels: string
            }
        ], user: string) {
        return await SkuRuleConfigurationsModel.upsertNonForecastedPsku(payload, user)
    },
    async getDbList(distChannels: string[] = []) {
        return await SkuRuleConfigurationsModel.getDbList(distChannels);
    },

    async upsertAllNonForecastedPsku(
        data: 
            {
                payload: {
                    [key: string]: {
                        selectedTse: string[],
                        cg_data: {
                            [key: string]: {
                                selected: string[] | boolean,
                                unselected: string[] | boolean,
                                partial: {},
                            },
                        }
                    },
                },
                selectedArea:string[],
                dist_channels: string
            }
        , user: string) {
        logger.info("inside SkuRuleConfigurationsService -> upsertAllNonForecastedPsku");

        //Fetch db list
        //Format it to get all TSE codes
        //For every psku of payload run a loop over all TSE and for each cg, fetch the data from select, unselect and partial
        try {
            const tseAreaMap = new Map<string, string>()
            const payload = data.payload;
            const selectedArea = new Set(data.selectedArea);
            const dbResults = await SkuRuleConfigurationsService.getDbList();
            const tseSet = new Set<string>();
            const areaTse: {
                [area: string]: Set<string>
            } = {};
            const finalPayload: {
                areaCode: string,
                tseCode: string,
                pskuCode: string,
                included_cg_list: string,
                deleted: boolean,
                channel:string,
            }[] = [];
            if (dbResults) {
                const inlucedCgs = await SkuRuleConfigurationsModel.getCustomerGroups() ?? [];
                const cgForNonForecast = inlucedCgs.map(item => item.name);
                dbResults.forEach(row => {
                    areaTse[row.area_code] = new Set();
                    Object.keys(row.db_list).forEach((cg) => {
                        row.db_list[cg].forEach(db => {
                            tseSet.add(db.tse_code);  
                            areaTse[row.area_code].add(db.tse_code);
                            tseAreaMap.set(db.tse_code, row.area_code);
                        })
                    })
                })
                Object.keys(payload).forEach(pskuCode => {
                    //Add deleted TSE
                    const tseList = selectedArea.size > 0 ? new Set([...selectedArea, ...payload[pskuCode].selectedTse]) : new Set([...tseSet, ...payload[pskuCode].selectedTse]);
                    Array.from(tseList).forEach((tse:string) => {
                        const area = tseAreaMap.has(tse) ? tseAreaMap.get(tse) : tse.substring(0, 4).trim();
                        let result = "'{";
                        cgForNonForecast.forEach(cg => {
                            let currPayload = payload[pskuCode].cg_data[cg];
                            const arraySelector = typeof (currPayload.selected) != "boolean" ? 'selected' : 'unselected'
                            const newCurrPayload: string[] = []
                            if (Array.isArray(currPayload[arraySelector])) {
                                (currPayload[arraySelector] as string[]).forEach(areaTseCode => {
                                    //Deleted TSE codes don't come up in areaTse object
                                    if (areaTseCode.length <= 4 && areaTse[areaTseCode]) {
                                        newCurrPayload.push(...Array.from(areaTse[areaTseCode]))
                                    }
                                    else
                                        newCurrPayload.push(areaTseCode);
                                })
                                currPayload[arraySelector] = newCurrPayload.length > 0 ? newCurrPayload : currPayload[arraySelector];  
                            }

                            const isSelected = typeof(currPayload.selected) == 'boolean' ? 'POSSIBLE' : Array.isArray(currPayload.selected) && currPayload.selected.includes(tse);
                            const isPartial = currPayload.partial.hasOwnProperty(tse);
                            const isUnselected = typeof (currPayload.unselected) == 'boolean' ? 'POSSIBLE' : Array.isArray(currPayload.unselected) && currPayload.unselected.includes(tse);

                            if (isPartial) {
                                result = result == "'{" ?result : result + ','
                                result = result+`"${cg}":`+`["${currPayload.partial[tse].join('","')}"]`
                            }
                            else if (isSelected == true) {
                                result = result == "'{" ? result : result + ','
                                result = result+`"${cg}":true`
                            }
                            else if (isSelected == 'POSSIBLE' && !isUnselected) {
                                result = result == "'{" ? result : result + ','
                                result = result + `"${cg}":true`
                            }
                        })
                        result += "}'"
                        if (result != "'{}'")
                            finalPayload.push({ areaCode: area, tseCode: tse, pskuCode: pskuCode, included_cg_list: result, deleted: false, channel: data.dist_channels })
                        else 
                            finalPayload.push({ areaCode: area, tseCode: tse, pskuCode: pskuCode, included_cg_list: result, deleted: true, channel:data.dist_channels })
                    })
                })
                return await SkuRuleConfigurationsModel.upsertAllNonForecasted(finalPayload, user);
            }
            return null;
        }
        catch(error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsService -> upsertAllNonForecastedPsku: ", error);
            return null;
        }
    },

    async upsertAllRuleConfiguration(
        data: {
            payload: {
                [key: string]: {
                    selectedTse: string[],
                    cg_data: {
                        [key: string]: {
                            selected: string[] | boolean,
                            unselected: string[] | boolean,
                            partial: {},
                        },
                    }
                },
            },
            selectedArea: string[],
            dist_channels: string[],
            operation:string
        },
        user: string
    ) {
       
        const payload = data.payload;
        const selectedArea = new Set(data.selectedArea);
        const dbResults = await SkuRuleConfigurationsService.getDbList();
        const tseSet = new Set<string>();
        const areaTse: {
            [area: string]: Set<string>
        } = {};
        const tseAreaMap = new Map<string, string>()
        const finalPayload: {
            areaCode: string,
            tseCode: string,
            pskuCode: string,
            included_cg_list: string,
            deleted: boolean,
        }[] = [];
        if (dbResults) {
            const inlucedCgs = await SkuRuleConfigurationsModel.getCustomerGroups() ?? [];
            const cgForNonForecast = inlucedCgs.map(item => item.name);
            dbResults.forEach(row => {
                areaTse[row.area_code] = new Set();
                Object.keys(row.db_list).forEach((cg) => {
                    row.db_list[cg].forEach(db => {
                        tseSet.add(db.tse_code);
                        areaTse[row.area_code].add(db.tse_code);
                        tseAreaMap.set(db.tse_code, row.area_code);
                    })
                })
            })
            Object.keys(payload).forEach(pskuCode => {
                const tseList = selectedArea.size > 0 ? new Set([...selectedArea, ...payload[pskuCode].selectedTse]) : new Set([...tseSet, ...payload[pskuCode].selectedTse]);
                Array.from(tseList).forEach((tse: string) => {
                    const area = tseAreaMap.has(tse) ? tseAreaMap.get(tse) : tse.substring(0, 4).trim();
                    const currSelectedTse = payload[pskuCode].selectedTse;
                    let result = "'{";
                    cgForNonForecast.forEach(cg => {
                        let currPayload = payload[pskuCode].cg_data[cg];
                        const arraySelector = typeof (currPayload.selected) != "boolean" ? 'selected' : 'unselected'
                        const newCurrPayload: string[] = []
                        if (Array.isArray(currPayload[arraySelector])) {
                            (currPayload[arraySelector] as string[]).forEach(areaTseCode => {
                                if (areaTseCode.length <= 4) {
                                    newCurrPayload.push(...Array.from(areaTse[areaTseCode]))
                                }
                                else
                                    newCurrPayload.push(areaTseCode);
                            })
                            currPayload[arraySelector] = newCurrPayload.length > 0 ? newCurrPayload : currPayload[arraySelector];
                        }

                        const isSelected = typeof (currPayload.selected) == 'boolean' ? 'POSSIBLE' : Array.isArray(currPayload.selected) && currPayload.selected.includes(tse);
                        const isPartial = currPayload.partial.hasOwnProperty(tse);
                        const isUnselected = typeof (currPayload.unselected) == 'boolean' ? 'POSSIBLE' : Array.isArray(currPayload.unselected) && currPayload.unselected.includes(tse);

                        if (isPartial) {
                            result = result == "'{" ? result : result + ','
                            result = result + `"${cg}":` + `["${currPayload.partial[tse].join('","')}"]`
                        }
                        else if (isSelected == true) {
                            result = result == "'{" ? result : result + ','
                            result = result + `"${cg}":true`
                        }
                        else if (isSelected == 'POSSIBLE' && !isUnselected) {
                            result = result == "'{" ? result : result + ','
                            result = result + `"${cg}":true`
                        }
                    })
                    result += "}'";
                    if (data.operation === 'INSERT')
                        finalPayload.push({ areaCode: area ?? '', tseCode: tse, pskuCode: pskuCode, included_cg_list: result, deleted: false })
                    else if (result === "'{}'" && currSelectedTse.includes(tse) && data.operation==='UPDATE')
                        finalPayload.push({ areaCode: area ?? '', tseCode: tse, pskuCode: pskuCode, included_cg_list: result, deleted: false })
                    else if (result === "'{}'")
                        finalPayload.push({ areaCode: area ?? '', tseCode: tse, pskuCode: pskuCode, included_cg_list: result, deleted: true })
                    else
                        finalPayload.push({ areaCode: area ?? '', tseCode: tse, pskuCode: pskuCode, included_cg_list: result, deleted: false })
                })
            })
            return await SkuRuleConfigurationsModel.upsertAllRuleConfiguration(finalPayload, user, data.dist_channels[0]);
        }
        return null;
    },

    async upsertRuleConfiguration(
        payload: [
            {
                psku: string,
                area_code: string,
                deleted: boolean,
                cg_db: {
                    [key: string]: {
                        [key: string]: string[] | boolean
                    }
                },
            }
        ], user: string, dist_channels: string) {
        return await SkuRuleConfigurationsModel.upsertRuleConfigurations(payload, user, dist_channels)
    },
};