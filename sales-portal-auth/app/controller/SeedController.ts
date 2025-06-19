import { SeedService } from "../service/seed.service";
import logger from "../lib/logger";
import Template from "../helper/responseTemplate";
import { ErrorMessage } from "../constant/error.message";
import commonHelper from "../helper";
import { Request, Response } from "express";
class SeedController {
    static async seeder(req: Request, res: Response) {
        try {
            const { seed_from, tables, applicable_months } = req.body;
            if (!(req.hostname === 'localhost') && seed_from === process.env.NODE_ENV) {
                return res.status(400).json(Template.errorMessage("Can't seed from the same environment"))
            }
            if (process.env.NODE_ENV === 'prod') return res.status(400).json(Template.errorMessage("Cannot seed in production environment"));
            const seedData = await SeedService.seeder(seed_from, tables, applicable_months);
            if (seedData) {
                return res.status(200).json(Template.success(seedData));
            } else {
                return res.status(500).json(Template.error('Bad Request', ErrorMessage.TECHNICAL_ERROR));
            }
        } catch (error) {
            logger.error("CAUGHT: Error in SeedController -> seeder()", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR, error));
        }
    };

    static async getForecastConfigurations(req: Request, res: Response) {
        try {
            const applicableMonths = req.body.applicable_months ?? [commonHelper.applicableMonth()];
            logger.info('inside SeedController -> getForecastConfigurations()', applicableMonths);
            const forecastConfigurations = await SeedService.getForecastConfigurations(applicableMonths);
            if (forecastConfigurations) {
                return res.status(200).json(Template.success(forecastConfigurations));
            } else {
                return res.status(500).json(Template.error('Bad Request', ErrorMessage.TECHNICAL_ERROR));
            }
        } catch (error) {
            logger.error("CAUGHT: Error in SeedController -> getForecastConfigurations()", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR, error));
        }
    };

    static async getForecastDistribution(req: Request, res: Response) {
        try {
            const applicableMonths = req.body.applicable_months ?? [commonHelper.applicableMonth()];
            logger.info('inside SeedController -> getForecastDistribution()', applicableMonths);
            const forecastConfigurations = await SeedService.getForecastDistribution(applicableMonths);
            if (forecastConfigurations) {
                return res.status(200).json(Template.success(forecastConfigurations));
            } else {
                return res.status(500).json(Template.error('Bad Request', ErrorMessage.TECHNICAL_ERROR));
            }
        } catch (error) {
            logger.error("CAUGHT: Error in SeedController -> getForecastDistribution()", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR, error));
        }
    };

    static async getStockNormConfig(req: Request, res: Response) {
        try {
            const applicableMonths = req.body.applicable_months ?? [commonHelper.applicableMonth()];
            logger.info('inside SeedController -> getStockNormConfig()', applicableMonths);
            const forecastConfigurations = await SeedService.getStockNormConfig(applicableMonths);
            if (forecastConfigurations) {
                return res.status(200).json(Template.success(forecastConfigurations));
            } else {
                return res.status(500).json(Template.error('Bad Request', ErrorMessage.TECHNICAL_ERROR));
            }
        } catch (error) {
            logger.error("CAUGHT: Error in SeedController -> getStockNormConfig()", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR, error));
        }
    };

    static async getMonthlySales(req: Request, res: Response) {
        try {
            const applicableMonths = req.body.applicable_months ?? [commonHelper.applicableMonth()];
            const { area_code } = req.body;
            logger.info(`inside SeedController -> getMonthlySales(): areaCode: ${area_code}`, applicableMonths);
            const forecastConfigurations = await SeedService.getMonthlySales(applicableMonths, area_code);
            if (forecastConfigurations) {
                return res.status(200).json(Template.success(forecastConfigurations));
            } else {
                return res.status(500).json(Template.error('Bad Request', ErrorMessage.TECHNICAL_ERROR));
            }
        } catch (error) {
            logger.error("CAUGHT: Error in SeedController -> getMonthlySales()", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR, error));
        }
    };

    static async getSalesAllocation(req: Request, res: Response) {
        try {
            const applicableMonths = req.body.applicable_months ?? [commonHelper.applicableMonth()];
            const { area_code } = req.body;
            logger.info(`inside SeedController -> getSalesAllocation(): areaCode: ${area_code}`, applicableMonths);
            const forecastConfigurations = await SeedService.getSalesAllocation(applicableMonths, area_code);
            if (forecastConfigurations) {
                return res.status(200).json(Template.success(forecastConfigurations));
            } else {
                return res.status(500).json(Template.error('Bad Request', ErrorMessage.TECHNICAL_ERROR));
            }
        } catch (error) {
            logger.error("CAUGHT: Error in SeedController -> getSalesAllocation()", error);
            return res.status(500).json(Template.error(ErrorMessage.INTERNAL_SERVER_ERROR, error));
        }
    }
};

export default SeedController;