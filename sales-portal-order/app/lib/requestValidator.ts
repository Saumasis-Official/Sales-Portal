import { CUSTOMER_GROUPS_FOR_ARS } from "../constants";

const Joi = require('joi');

const validation = {
  loginUser: {
    body: {
      email: Joi.string().regex(/^[\w.]+@[\w]+?(\.[a-zA-Z]{2,3}){1,3}$/).required(),
      password: Joi.string().min(8).max(50).required()
    }
  },
  createUser: {
    body: {
      username: Joi.string().min(4).max(50).required(),
      password: Joi.string().min(8).max(50).required(),
      email: Joi.string().regex(/^[\w.]+@[\w]+?(\.[a-zA-Z]{2,3}){1,3}$/).required(),
      verify_password: Joi.string().min(6).max(50).required()
    },
  },
  resetPassword: {
    body: {
      email: Joi.string().regex(/^[\w.]+@[\w]+?(\.[a-zA-Z]{2,3}){1,3}$/).required(),
    }
  },
  getForecastConfiguration: {
    body: {
      areaCode: Joi.string().length(4).required()
    }
  },
  updateForecastConfiguration: {
    body: {
      area_code: Joi.string().required(),
      applicable_month: Joi.string().required(),
      config_data: Joi.object().pattern(/^/, Joi.object().keys({
        weekly_week1: Joi.string(),
        weekly_week2: Joi.string(),
        weekly_week3: Joi.string(),
        weekly_week4: Joi.string(),
        fortnightly_week12: Joi.string(),
        fortnightly_week34: Joi.string()
      })
      )

    }
  },
  getForecastSummary: {
    body: {
      areaCode: Joi.string().length(4).required(),
      search: Joi.string().allow(null, ''),
      limit: Joi.number().required(),
      offset: Joi.number().required(),
    },
    query: {
      quantity_norm_flag: Joi.boolean().optional().allow(null, ''),
    }
  },
  submitForecast: {
    body: {
      areaCode: Joi.string().length(4).required(),
    }
  },
  updateForecastDistribution: {
    body: {
      area_code: Joi.string(),
    }
  },
  stockData: {
    body: {
      dbCode: Joi.string().required(),
      psku: Joi.array().items(Joi.string()),
      docType: Joi.string().valid('ZLIQ', 'ZOR')
    }
  },
  skuStockData: {
    body: {
      distributor_code: Joi.string().required(),
      sku: Joi.string().required(),
      docType: Joi.string().valid('ZLIQ', 'ZOR').required(),
    }
  },
  updateStockNormAudit: {
    body: {
      update: Joi.array().items(Joi.object({
        id: Joi.number().required(),
        stock_norm: Joi.string().required(),
        ss_percent: Joi.string().required(),
        remarks: Joi.string().allow(null, ''),
        class_of_last_update: Joi.string().required().max(1),
      })).required()
    },
  },
  getMoqDbMapping: {
    body: {
      area: Joi.string().allow(null),
      search: Joi.string().allow(null, ''),
      limit: Joi.number().required(),
      offset: Joi.number().required(),
    }
  },
  updateMoq: {
    body: {
      moq_data: Joi.array().items(Joi.object().keys({
        dbId: Joi.string().required(),
        plantId: Joi.number().required(),
        moq: Joi.number().min(0).required()
      }))
    }
  },

  distributorMoq: {
    body: {
      dbCode: Joi.string().required(),
      plantCodes: Joi.array().items(Joi.string()).required(),
    }
  },

  automatedArsValidation: {
    body: {
      area_codes: Joi.array().items(Joi.string()).optional(),
    },
    query: {
      month: Joi.string().length(6).optional().allow(null, '')
    }
  },

  syncStockNorm: {
    query: {
      month: Joi.string().length(6).optional().allow(null, '')
    }
  },

  getStockNormAudit: {
    params: {
      cg: Joi.string().required().valid(CUSTOMER_GROUPS_FOR_ARS),
    },
    body: {
      offset: Joi.number(),
      limit: Joi.number(),
      ars_db: Joi.boolean(),
      distId: Joi.array().items(Joi.string())
    }
  },

  updateStockNormDefault: {
    body: {
      customerGroup: Joi.string().required().valid(CUSTOMER_GROUPS_FOR_ARS),
      update: Joi.object({
        class_a_sn: Joi.string().required(),
        class_a_ss_percent: Joi.string().required(),
        class_b_sn: Joi.string().required(),
        class_b_ss_percent: Joi.string().required(),
        class_c_sn: Joi.string().required(),
        class_c_ss_percent: Joi.string().required(),
      }).required()
    }
  },

  getAllArsTolerance: {
    params: {
      cg: Joi.string().required().valid(CUSTOMER_GROUPS_FOR_ARS),
    }
  },

  getArsTolerance: {
    params: {
      cg: Joi.string().required().valid(CUSTOMER_GROUPS_FOR_ARS),
      areaCode: Joi.string().required(),
    }
  },

  updateArsTolerance: {
    body: {
      data: Joi.array().items(Joi.object({
        class_a_max: Joi.string().required(),
        class_b_max: Joi.string().required(),
        class_c_max: Joi.string().required(),
        class_a_min: Joi.string().required(),
        class_b_min: Joi.string().required(),
        class_c_min: Joi.string().required(),
        remarks: Joi.string().optional().allow(null, ''),
        id: Joi.string().required()
      })).required()
    }
  },

  testFetchForecastForDist: {
    body: {
      distributor_code: Joi.string().required(),
      divisions: Joi.array().items(Joi.number()).required().min(1),
      applicable_month: Joi.string().required(),
      next_applicable_month: Joi.string().required(),
    }
  },

  forecast: {
    body: {
      areaCode: Joi.string().length(4).required(),
      brandVariantCode: Joi.string().required()
    }
  },

  skuCodes: {
    body: {
      area_codes: Joi.array().items(Joi.string()),
      non_forecasted: Joi.boolean(),
      dist_channels: Joi.array().items(Joi.string()),
    }
  },

  skuDetails: {
    body: {
      sku: Joi.string().required(),
      area_codes: Joi.array().items(Joi.string()).optional(),
      non_forecasted: Joi.boolean().optional()
    }
  },

  saveRuleConfig: {
    body: {
      data: Joi.array().items(Joi.object(
        {
          area_code: Joi.string().required(),
          sku_code: Joi.string().required(),
          deleted: Joi.boolean().optional().allow(null, ''),
          cg_db: Joi.object().pattern(
            Joi.string(),
            Joi.object().pattern(
              Joi.string(),
              Joi.alternatives().try(
                Joi.array().items(Joi.string()),
                Joi.boolean()
              )
            )
          ),
          dist_channels: Joi.array().items(Joi.number()).required(),
        }
      )).required()
    }
  },

  fetchRuleConfig: {
    body: {
      area_codes: Joi.array().items(Joi.string()).optional().allow(null, ''),
      search: Joi.string().optional().allow(null, ''),
      dist_channels: Joi.array().items(Joi.string()),
    }
  },

  savePromisedCredit: {
    body: {
              po_number: Joi.string().required(),
              input_type : Joi.string().required,
              reference_date :Joi.date().required,
              plant : Joi.string().required,
              order_value :Joi.string().required,
              open_order_value :Joi.string().required,
              credit_shortfall: Joi.string().required,
              promised_credit_date: Joi.string().required,
              promised_credit_time: Joi.string().required,
              promised_credit: Joi.string().required, 
              promised_credit_type: Joi.string().required,
    }
  },

  getExcludedMaterials: {
    body: {
      distributor_code: Joi.string().required(),
    }
  },
  
  fetchRushOrders: {
    body: {
      queryParams: Joi.object({ status: Joi.string(),
                                region: Joi.array().items(Joi.string()).optional().allow(null, ''),
                                area: Joi.array().items(Joi.string()).optional().allow(null, ''),
                                search: Joi.string().allow(null, ''),
                                startDate: Joi.string(),
                                endDate: Joi.string(),
                                limit: Joi.number(),
                                offset: Joi.number(),
                              }).required()
    }
  },

  insertOrderRequest: {
    body: {
      po_number: Joi.string().required(),
      approver_email: Joi.string().required(),
      location: Joi.string().required(),
      rsm: Joi.string().required(),
      reason: Joi.string().required(),
      comments: Joi.string(),
    }
  },

  lastForecastDate: {
    body: {
      areaCode: Joi.string().length(4).required(),
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


  updateQuantityNorm: {
    body: {
      area_code: Joi.string().required(),
      quantity_norm: Joi.array().items(Joi.object({
        psku: Joi.string().required(),
        value: Joi.number().required(),
      })).required()
    }
  },


  brandVariantDetails: {
    body: {
      area_codes: Joi.array().items(Joi.string()).optional().allow(null, ''),
      brand_variant_code: Joi.string().required(),
    }
  },

  brandVariantPrioritization: {
    body: {
      data: Joi.array().items(Joi.object({
        area: Joi.string().required(),
        brand_variant: Joi.string().required(),
        priority: Joi.number().required(),
        deleted: Joi.boolean().optional().allow(null, ''),
        id: Joi.number().optional().allow(null, ''),
      })).required()
    }
  },

  fetchPrioritization: {
    body: {
      area_codes: Joi.array().items(Joi.string()).optional().allow(null, ''),
      search: Joi.string().optional().allow(null, ''),
    }
  },

  brandVariantCombinations: {
    body: {
      area_codes: Joi.array().items(Joi.string()).optional().allow(null, '')
    }
  },
  massUpdateMoq:{
    body: {
      area: Joi.array().items(Joi.string()).required(),
      quantity: Joi.string().required(),
      region_id: Joi.array().items(Joi.number()).required(),
     
      

    }
  
  },
  getMoqQunatity:{
    body:{
      plantCodes:Joi.string().required(),
      dbCode:Joi.string().required(),
    }
  },
  fetchOrderRequest: {
    params: {
      po_number: Joi.string().required(),
    }
  },

  updateOrderRequestFromOrders: {
    body: {
      queryParams: Joi.object({ 
                                distributor_id: Joi.string().required(),
                                distributor_name: Joi.string().required(),
                                distributor_email: Joi.string().required(),
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

  fetchNonForecastedSku: {
    body: {
      area_code: Joi.array().items(Joi.string()).optional(),
      tse: Joi.string().optional(),
      cg: Joi.string().optional(),
      db: Joi.string().optional(),
      dist_channels: Joi.array().items(Joi.string()),
    }
  },

  upsertNonForecastedSku: {
    body: {
      data: Joi.array().items(
        Joi.object({
          psku: Joi.string().required(),
          area_code: Joi.string().required(),
          deleted: Joi.boolean().required(),
          cg_db: Joi.object().pattern(
            Joi.string(),
            Joi.object().pattern(
              Joi.string(),
              Joi.alternatives().try(
                Joi.array().items(Joi.string()),
                Joi.boolean()
              )
            )
          ),
          dist_channels: Joi.string().required(),
        }).required()
      )
    }
  },

  updateToleranceExcludedPskus: {
    body: {
      pskus: Joi.array().items(Joi.object({
        psku: Joi.string().required(),
        deleted: Joi.boolean().required(),
      }).required())
    }
  },

  upsertAllNonForecastedSku: {
    body: {
      data: Joi.object({
        payload: Joi.object().pattern(
          Joi.string(),
          Joi.object().keys({
            selectedTse: Joi.array().items(Joi.string()).required(),
            cg_data: Joi.object().pattern(
              Joi.string(),
              Joi.object({
                selected: Joi.alternatives().try(Joi.array(), Joi.boolean()),
                unselected: Joi.alternatives().try(Joi.array(), Joi.boolean()),
                partial: Joi.object(),
              })
            )
          }),
        ),
        selectedArea:Joi.array().items(Joi.string()),
        dist_channels: Joi.string().required(),
      })
    }
  },

  fetchArsConfigurations: {
    body: {
      configurations: Joi.array().items(Joi.string()).optional().allow(null),
      keys: Joi.array().items(Joi.string()).optional().allow(null),
      details: Joi.boolean().optional().allow(null),
    }
  },

  updateArsConfigurations: {
    body: {
      data: Joi.array().items(Joi.object({
        id: Joi.number().required(),
        remarks: Joi.string().required().allow(""),
        auto_order: Joi.boolean().optional().allow(null),
        auto_order_submit: Joi.boolean().optional().allow(null),
        enable_adjustment: Joi.boolean().optional().allow(null),
        start_date: Joi.number().optional().allow(null),
        end_date: Joi.number().optional().allow(null),
        values: Joi.string().optional().allow(null),
      })).required()
    }
  },

  updateRushOrderRequest2: {
    body: {
      distributor_id: Joi.string().required(),
      po_number: Joi.string().required(),
      action: Joi.string().valid('APPROVE','REJECT').required(),
      reject_comments: Joi.string().optional(),
    }
  },

  rddAutoClosure: {
    body: Joi.array().items(Joi.object({
      SOLDTOPARTY: Joi.string().required(),
      SO_DETAILS: Joi.array().items(Joi.object({
        ORDERDATE: Joi.string().required(),
        SALESORDER: Joi.string().required(),
      })).required(),
    })).required()
  },

  upsertAllRuleConfigurations: {
    body: {
      data: Joi.object({
        payload: Joi.object().pattern(
          Joi.string(),
          Joi.object().keys({
            selectedTse: Joi.array().items(Joi.string()).required(),
            cg_data: Joi.object().pattern(
              Joi.string(),
              Joi.object({
                selected: Joi.alternatives().try(Joi.array(), Joi.boolean()),
                unselected: Joi.alternatives().try(Joi.array(), Joi.boolean()),
                partial: Joi.object(),
              })
            )
          }),
        ),
        selectedArea: Joi.array().items(Joi.string()),
        dist_channels: Joi.array().items(Joi.string()).required(),
        operation:Joi.string().required(),
      })
    }
  },

  upsertRuleConfiguration: {
    body: {
      data: Joi.array().items(
        Joi.object({
          psku: Joi.string().required(),
          area_code: Joi.string().required(),
          deleted: Joi.boolean().required(),
          cg_db: Joi.object().pattern(
            Joi.string(),
            Joi.object().pattern(
              Joi.string(),
              Joi.alternatives().try(
                Joi.array().items(Joi.string()),
                Joi.boolean()
              )
            )
          ),
          dist_channels: Joi.string().optional(),
        }).required()
      ),
      dist_channels:Joi.string(),
    }
  },

  updateMultipleRushOrderRequests: {
    body: {
      data: Joi.array().items(
        Joi.object({
          distributor_id: Joi.string().required(),
          po_number: Joi.string().required(),
          action: Joi.string().valid('APPROVE','REJECT').required(),
          reject_comments: Joi.string().optional(),
        })
      ).required()
    }
  },

};
export default validation
