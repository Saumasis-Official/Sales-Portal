const Joi = require('joi');

const validation = { 
  fetchCreditExtentionRequest: {
    body: {
      queryParams: Joi.object({ 
                                status: Joi.string().valid('APPROVED','REJECTED','PENDING','ALL'),
                                search: Joi.string().allow(null, ''),
                                limit: Joi.number(),
                                offset: Joi.number(),
                                customer_group: Joi.array().allow(null, ''),
                                type: Joi.string().allow(null, ''),
                                from_date: Joi.string().allow(null, ''),
                                to_date: Joi.string().allow(null, ''),
                                responded:Joi.string().allow(null, ''),
                              }).required()
    }
  },
  fetchRequestedData: {
    params: {
      transaction_id: Joi.string().required(),
      
    }
  },

  updateRushOrderRequest: {
    body: {
      queryParams: Joi.object({ 
                                distributor_id: Joi.string().required(),
                                distributor_name: Joi.string().required(),
                                distributor_email: Joi.string().allow(null, ''),
                                tse_email: Joi.array().items(Joi.string()),
                                asm_email: Joi.array().items(Joi.string()),
                                rsm_email: Joi.array().items(Joi.string()),
                                cluster_email: Joi.array().items(Joi.string()),
                                upcoming_pdp: Joi.object({
                                      pdp: Joi.string().required(),
                                      plant_code: Joi.string().required(),
                                      division: Joi.string().required(),
                                    }).optional(),
                                request_date: Joi.string().required(),
                                po_number: Joi.string().required(),
                                so_number: Joi.string().when('status', {is: 'APPROVED', then: Joi.required(), otherwise: Joi.optional()}),
                                so_amount: Joi.string().when('status', {is: 'APPROVED', then: Joi.required(), otherwise: Joi.optional()}),
                                status: Joi.string().valid('APPROVED','REJECTED','PENDING').required(),
                                tentative_amount: Joi.string().when('status', {is: 'PENDING', then: Joi.required(), otherwise: Joi.optional()}),
                                location: Joi.string().when('status', {is: 'PENDING', then: Joi.required(), otherwise: Joi.optional()}),
                                rsm: Joi.string().when('status', {is: 'PENDING', then: Joi.required(), otherwise: Joi.optional()}),
                                reason: Joi.string().when('status', {is: 'PENDING', then: Joi.required(), otherwise: Joi.optional()}),
                                comments: Joi.string().allow(null, ''),
                              }).required()
    }
  },

  rushOrderEmailTrigger: {
    body: {
      emailParams: Joi.object({
        distributor_id: Joi.string().required(),
        po_number: Joi.string().required(),
        amount: Joi.string().required(),
        approver_email: Joi.string().required(),
        previous_approver_email: Joi.string(),
        location: Joi.string().required(),
        rsm: Joi.string().required(),
        reason: Joi.string().required(),
        comments: Joi.string().allow(null, ''),
        approver_no: Joi.number().required(),
      }).required()
    }
  },

  updateRushOrderRequest2: {
    body: {
      distributor_id: Joi.string().required(),
      po_number: Joi.string().required(),
      action: Joi.string().valid('APPROVE','REJECT').required(),
    }
  },
};
export default validation
