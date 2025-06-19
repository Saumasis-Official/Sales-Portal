import Joi from 'joi';

const validation = {
    automatedArsValidation: {
        body: {
            area_codes: Joi.array().items(Joi.string()).optional(),
        },
        query: {
            month: Joi.string().length(6).optional().allow(null, ''),
        },
    },

    invoiceOtpCommunication: {
        body: Joi.array().items(
            Joi.object({
                distributor_code: Joi.string().required(),
                invoice_number: Joi.string().required(),
                otp: Joi.string().required(),
                // ship_to: Joi.string().required(),
                // unloading_point: Joi.string().required().allow(''),
            }),
        ),
    },
};
export default validation;
