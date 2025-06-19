import { SkuRuleConfigurationsService } from "../service/skuRuleConfig.service";
import { Request, Response } from 'express';
import Template from '../helper/responseTemplate';
import { ErrorMessage } from '../constants/errorMessage';
import { SuccessMessage } from '../constants/successMessage';
import logger from "../lib/logger";

export const SkuRuleConfigurationsController = {
    async getCustomerGroups(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> getCustomerGroups");
        try {
            const result = await SkuRuleConfigurationsService.getCustomerGroups();
            return res.status(200).json(Template.success(result, SuccessMessage.FETCH_CUSTOMER_GROUPS));
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> getCustomerGroups: ", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async getSKUCode(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> getSKUCode");
        try {
            const { area_codes = [], non_forecasted = false, dist_channels = [] } = req.body;
            const result = await SkuRuleConfigurationsService.getSKUCode(area_codes, non_forecasted, dist_channels);
            return res.status(200).json(Template.success(result, SuccessMessage.FETCH_SKU_CODE));
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> getSKUCode: ", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async getSKUDetails(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> getSKUDetails");
        try {
            const { sku, area_codes, non_forecasted = false } = req.body;
            const result = await SkuRuleConfigurationsService.getSKUDetails(sku, area_codes, non_forecasted);
            return res.status(200).json(Template.success(result, SuccessMessage.FETCH_SKU_DETAILS));
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> getSKUDetails: ", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async upsertSkuRuleConfigurations(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> upsertSkuRuleConfigurations");
        try {
            const { data } = req.body;
            const { user_id } = req['user']
            const result = await SkuRuleConfigurationsService.upsertSkuRuleConfigurations(data, user_id);
            if (result)
                // if (result && typeof result === 'object')
                return res.status(200).json(Template.success(result, SuccessMessage.UPSERT_SKU_RULE_CONFIGURATIONS));
            // else if (result && typeof result === 'number')
            //     return res.status(200).json(Template.successMessage(SuccessMessage.UPSERT_SKU_RULE_CONFIGURATIONS));
            else
                return res.status(200).json(Template.errorMessage(ErrorMessage.UPSERT_SKU_RULE_CONFIGURATIONS));
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> upsertSkuRuleConfigurations: ", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async getSkuRuleConfigurations(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> getSkuRuleConfigurations");
        try {
            const { area_codes, search, dist_channels = [] } = req.body;
            const result = await SkuRuleConfigurationsService.getSkuRuleConfigurations(area_codes, search, dist_channels);
            return res.status(200).json(Template.success(result, SuccessMessage.FETCH_SKU_RULE_CONFIGURATIONS));
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> getSkuRuleConfigurations: ", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchBrandAndBrandVariantCombinations(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> fetchBrandAndBrandVariantCombinations");
        try {
            const { area_codes } = req.body;
            const result = await SkuRuleConfigurationsService.fetchBrandAndBrandVariantCombinations(area_codes);
            return res.status(200).json(Template.success(result, SuccessMessage.FETCH_BRAND_AND_BRAND_VARIANT_COMBINATIONS));
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> fetchBrandAndBrandVariantCombinations: ", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchBrandVariantDetails(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> fetchBrandVariantDetails");
        try {
            const { brand_variant_code, area_codes } = req.body;
            const result = await SkuRuleConfigurationsService.fetchBrandVariantDetails(brand_variant_code, area_codes);
            return res.status(200).json(Template.success(result, SuccessMessage.FETCH_BRAND_VARIANT_DETAILS));
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> fetchBrandVariantDetails: ", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async upsertBrandVariantPrioritization(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> upsertBrandVariantPrioritization");
        try {
            const { data } = req.body;
            const { user_id } = req['user']
            const result = await SkuRuleConfigurationsService.upsertBrandVariantPrioritization(data, user_id);
            return res.status(200).json(Template.success(result, SuccessMessage.UPSERT_BRAND_VARIANT_PRIORITIZATION));
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> upsertBrandVariantPrioritization: ", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchPrioritization(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> fetchPrioritization");
        try {
            const { area_codes, search } = req.body;
            const result = await SkuRuleConfigurationsService.fetchPrioritization(area_codes, search);
            return res.status(200).json(Template.success(result, SuccessMessage.FETCH_PRIORITIZATION));
        } catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> fetchPrioritization: ", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    },

    async fetchNonForecastedPsku(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> fetchNonForecastedPsku");
        try {
            const { area_code = [], dist_channels = [] } = req.body
            const result = await SkuRuleConfigurationsService.fetchNonForecastedPsku(area_code, dist_channels);
            if (result) {
                return res.status(200).json(Template.success(result, SuccessMessage.NON_FORECASTED_SKU_FETCH))
            }
            else return res.status(500).json(Template.error(ErrorMessage.NON_FORECASTED_SKU_FETCH))
        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> fetchNonForecastedPsku: ", error);
            return res.status(500).json(Template.error(ErrorMessage.NON_FORECASTED_SKU_FETCH))
        }
    },

    async upsertNonForecastedPsku(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> upsertNonForecastedPsku");
        const { data } = req.body
        const user = req['user'];
        try {
            const result = await SkuRuleConfigurationsService.upsertNonForecastedPsku(data, user?.user_id ?? 'PORTAL_MANAGED')
            if (result)
                return res.status(200).json(Template.success(result, SuccessMessage.NON_FORECASTED_INSERT))
            return res.status(500).json(Template.error(ErrorMessage.NON_FORECASTED_INSERT))

        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> upsertNonForecastedPsku: ", error);
            return res.status(500).json(Template.error(ErrorMessage.NON_FORECASTED_INSERT))
        }

    },

    async getDbList(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> getDbList");
        try {
            const { dist_channels = "" } = req.query;
            const dcs: string[] = dist_channels ? dist_channels.toString().split(',') : [];
            const result = await SkuRuleConfigurationsService.getDbList(dcs);
            return res.status(200).json(Template.success(result, SuccessMessage.FETCH_DISTRIBUTOR_LIST))
        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> getDbList: ", error);
            return res.status(500).json(Template.error(ErrorMessage.FETCH_DISTRIBUTOR_LIST))
        }

    },

    async upsertAllNonForecastedPsku(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> upsertNonForecastedPsku");
        const { data } = req.body
        const user = req['user'];
        try {
            const result = await SkuRuleConfigurationsService.upsertAllNonForecastedPsku(data, user?.user_id ?? 'PORTAL_MANAGED')
            if (result)
                return res.status(200).json(Template.success(result, SuccessMessage.NON_FORECASTED_INSERT))
            return res.status(500).json(Template.error(ErrorMessage.NON_FORECASTED_INSERT))

        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> upsertNonForecastedPsku: ", error);
            return res.status(500).json(Template.error(ErrorMessage.NON_FORECASTED_INSERT))
        }

    },

    async upsertAllRuleConfiguration(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> upsertAllRuleConfiguration");
        const { data } = req.body
        const user = req['user'];
        try {
            const result = await SkuRuleConfigurationsService.upsertAllRuleConfiguration(data, user?.user_id ?? 'PORTAL_MANAGED')
            if (result)
                return res.status(200).json(Template.success(result, SuccessMessage.UPSERT_SKU_RULE_CONFIGURATIONS))
            return res.status(500).json(Template.error(ErrorMessage.UPSERT_SKU_RULE_CONFIGURATIONS))
        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> upsertAllRuleConfiguration: ", error);
            return res.status(500).json(Template.error(ErrorMessage.UPSERT_SKU_RULE_CONFIGURATIONS))
        }
    },

    async upsertRuleConfiguration(req: Request, res: Response) {
        logger.info("inside SkuRuleConfigurationsController -> upsertRuleConfiguration");
        const { data, dist_channels } = req.body
        const user = req['user'];
        try {
            const result = await SkuRuleConfigurationsService.upsertRuleConfiguration(data, user?.user_id ?? 'PORTAL_MANAGED', dist_channels)
            if (result)
                return res.status(200).json(Template.success(result, SuccessMessage.DELETE_SUCCESS))
            return res.status(500).json(Template.error(ErrorMessage.DELETE_FAILURE))

        }
        catch (error) {
            logger.error("CAUGHT ERROR IN SkuRuleConfigurationsController -> upsertRuleConfiguration: ", error);
            return res.status(500).json(Template.error(ErrorMessage.DELETE_FAILURE))
        }

    },
};