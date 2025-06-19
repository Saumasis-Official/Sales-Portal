import { SeedModel } from "../models/seed.model";
import logger from "../lib/logger";
import axios from "axios";
import commonHelper from "../helper";
import axiosApi from "../helper/axiosApi";

export const SeedService = {
    payloadGenerator(seedFrom: string, table: string, applicableMonths: string[], areaCode?: string) {
        const baseUrl = {
            dev: 'https://devapi-pegasus.tataconsumer.com',
            uat: 'https://uatapi-pegasus.tataconsumer.com',
            prod: 'https://prdapi-pegasus.tataconsumer.com'
        };
        const serviceUrl = "auth/api/v1/seed";
        const url = `${baseUrl[seedFrom]}/${serviceUrl}/${table.replace(/_/g, '-')}`;
        let payload: any = {
            applicable_months: applicableMonths,
            area_code: areaCode
        };
        return { payload, url };
    },

    async seeder(seedFrom: string, tables: string[], applicableMonths: string[] = [commonHelper.applicableMonth()]) {
        logger.info(`SeedService -> seeder(), seedFrom: ${seedFrom}`, tables);
        const result = {};
        const specialTables = ['monthly_sales', 'sales_allocation'];
        try {
            for (const table of tables) {
                if (!specialTables.includes(table)) {
                    const { payload, url } = this.payloadGenerator(seedFrom, table, applicableMonths);
                    const rowCount = await SeedingServices[table](await axiosApi.postApiSeedingData(payload, url));
                    result[table] = rowCount;
                } else {
                    result[table] = {};
                    const areaCodes = await SeedModel.getAllAreaCodes() ?? [];
                    for (const area of areaCodes) {
                        const { payload, url } = this.payloadGenerator(seedFrom, table, applicableMonths, area.code);
                        const rowCount = await SeedingServices[table](await axiosApi.postApiSeedingData(payload, url));
                        result[table][area.code] = rowCount;
                    }
                }
            }
            return result;
        } catch (error) {
            logger.error('CAUGHT: Error in SeedService -> seeder()', error);
            return null;
        }
    },

    async getForecastConfigurations(applicableMonths: string[]) {
        return await SeedModel.getForecastConfiguration(applicableMonths);
    },

    async getForecastDistribution(applicableMonths: string[]) {
        return await SeedModel.getForecastDistribution(applicableMonths);
    },

    async getStockNormConfig(applicableMonths: string[]) {
        return await SeedModel.getStockNormConfig(applicableMonths);
    },

    async getMonthlySales(applicableMonths: string[], areaCode: string) {
        return await SeedModel.getMonthlySales(applicableMonths, areaCode);
    },

    async getSalesAllocation(applicableMonths: string[], areaCode: string) {
        const salesAllocation = await SeedModel.getSalesAllocation(applicableMonths, areaCode);
        const keys = salesAllocation?.map((item: any) => item.key) ?? [];
        const updateSalesAllocation = await SeedModel.getUpdateSalesAllocation(keys);
        return { salesAllocation, updateSalesAllocation };
    },
    async getUpdateSalesAllocation(keys: number[]) {
        return await SeedModel.getUpdateSalesAllocation(keys);
    }
};

const SeedingServices = {
    forecast_configurations: async (data: any) => {
        return await SeedModel.seedForecastConfigurations(JSON.stringify(data))
    },
    forecast_distribution: async (data: any) => {
        return await SeedModel.seedForecastDistribution(JSON.stringify(data))
    },
    stock_norm_config: async (data: any) => {
        return await SeedModel.seedStockNormConfig(JSON.stringify(data))
    },
    monthly_sales: async (data: any) => {
        return await SeedModel.seedMonthlySales(JSON.stringify(data))
    },
    sales_allocation: async (data: any) => {
        const { salesAllocation, updateSalesAllocation } = data;
        const salesAllocationResult = salesAllocation && await SeedModel.seedSalesAllocation(JSON.stringify(salesAllocation));
        const updatedSalesAllocationResult = updateSalesAllocation && await SeedModel.seedUpdateSalesAllocation(JSON.stringify(updateSalesAllocation));
        return { salesAllocationResult, updatedSalesAllocationResult };
    },
};