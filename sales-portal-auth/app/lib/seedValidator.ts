const Joi = require('joi');

const validation = {
    seeder: {
        body: {
            seed_from: Joi.string().required().valid('dev', 'uat', 'prod'),
            tables: Joi.array().items(Joi.string()
                .valid("ars", "forecast_distribution", "sales_allocation", "monthly_sales", "updated_sales_allocation", "forecast_configurations", "stock_norm_config"))
                .required(),
            applicable_months: Joi.array().items(Joi.string()).optional().allow(null, ''),
        }
    },
    applicableMonths: {
        body: {
            applicable_months: Joi.array().items(Joi.string()).optional().allow(null, ''),
        }
    },
    monthsAndAreaCode: {
        body: {
            applicable_months: Joi.array().items(Joi.string()).optional().allow(null, ''),
            area_code: Joi.string().required()
        }
    },
};

export default validation;
