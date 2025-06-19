const Joi = require('joi');
const types=  ['REPORT_ISSUE', 'SD_REQUEST', 'SD_RESPONSE']


let Item = Joi.object().keys({
  material_code: Joi.string().required().error(() => { return { message: 'Material code is required.' } }),
  item_number: Joi.string().required().error(() => { return { message: 'Item number is required.' } }),
  required_qty: Joi.string().required().error(() => { return { message: 'Requested quantity is required.' } }),
  target_qty: Joi.string().required().error(() => { return { message: 'Target quantity is required.' } }),
  original_quantity: Joi.string().optional().error(() => { return { message: 'Original quantity is required.' } }),
  description: Joi.string().optional().allow(''),
  sales_unit: Joi.string().optional().allow('').allow(null),
  pack_type: Joi.string().optional().allow('').allow(null),
  sales_org: Joi.number().optional().allow('').allow(null),
  distribution_channel: Joi.number().optional().allow('').allow(null),
  ReqDeliveryDate: Joi.string().optional().allow('').allow(null),
  division: Joi.number().optional().allow('').allow(null),
  stock_in_hand: Joi.string().optional().allow(''),
  stock_in_transit: Joi.string().optional().allow(''),
  open_order: Joi.string().optional().allow(''),
  item_type: Joi.string().optional(),
  stock_norm_days: Joi.string().optional().allow('', null),
  soq_norm_qty: Joi.string().optional().allow('', null),
})

let Partner = Joi.object().keys({
  partner_role: Joi.string().required().error(() => { return { message: 'Partner role is required.' } }),
  partner_number: Joi.number().required().error(() => { return { message: 'Partner code is required.' } }),
  partner_name: Joi.string().optional().allow('').allow(null)
})

let OrderItem = Joi.object().keys({
  item_number: Joi.string().required().error(() => { return { message: 'Item number is required.' } }),
  material_code: Joi.string().required().error(() => { return { message: 'Material code is required.' } }),
  sales_unit: Joi.any(),
  ReqDeliveryDate: Joi.string().optional().allow('').allow(null),
  required_qty: Joi.string().required().error(() => { return { message: 'Requested quantity is required.' } }),
  sales_org: Joi.number().optional().allow('').allow(null),
  distribution_channel: Joi.number().optional().allow('').allow(null),
  division: Joi.number().optional().allow('').allow(null)
})
let SalesDownloadItem = Joi.object().keys({
  so_number: Joi.string().required().error(() => { return { message: 'so_number  is required.' } }),
  deliveries: Joi.any(),
  invoices: Joi.any()
})

const validation = {
  validateOrderPayload: {
    body: {
      sales_org: Joi.any(),
      distribution_channel: Joi.any(),
      division: Joi.any(),
      po_number: Joi.any(),
      po_date: Joi.any(),
      req_date: Joi.any(),
      items: Joi.array().items(Item).strict().required(),
      original_items: Joi.array().items(Item).optional(),
      partners: Joi.array().items(Partner),
      navresult: Joi.any(),
      pdp: Joi.string().optional().valid('ON', 'OFF'),
      distributor_psku_tolerance: Joi.array().optional().allow(null)
    }
  },
  createOrderPayload: {
    body: {
      sales_org: Joi.any(),
      distribution_channel: Joi.any(),
      division: Joi.any(),
      soldto: Joi.any().required(),
      shipto: Joi.any().required(),
      po_number: Joi.any().required(),
      po_date: Joi.any().required(),
      req_date: Joi.any(),
      pay_terms: Joi.any(),
      items: Joi.array().items(OrderItem),
      navresult: Joi.any(),
      unloading: Joi.any(),
      product_type: Joi.string().valid('universal', 'dist_specific'),
      ton: Joi.any(),
      pdp: Joi.string().optional().valid('ON', 'OFF'),
      rdd_data: Joi.any(),
      raised_by: Joi.string(),
    },
  },
  salesOrderPayload: {
    body: {
      so_number: Joi.string().required(),
    },
  },
  salesOrderDeliveryPayload: {
    body: {
      deliveryNumber: Joi.array().required(),
    },
  },
  multipleSalesPayload: {
    body: {
      items: Joi.array().items(SalesDownloadItem),
    },
  },
  salesOrderInvoicePayload: {
    body: {
      invoiceNumber: Joi.array().required(),
    },
  },
  reportErrorPayload: {
    body: {
      remarks: Joi.string().required(),
      errorCode: Joi.string().required(),
      errorMessage: Joi.string(),
      logObj: Joi.any(),
      categoryId: Joi.number().min(1).required(),
      recipients: Joi.string(),
      ccRecipients: Joi.string(),
      tse: Joi.any(),
    },
  },
  materialsBOMExplodePayload: {
    body: {
      materialCode: Joi.string().required().error(() => { return { message: 'Material code is required.' } }),
      quantity: Joi.number().required().error(() => { return { message: 'Quantity is required.' } })
    },
  },
  addServiceRequestCategoryPayload: {
    
    body: {
      label: Joi.string().required(),
      description: Joi.string().required(),
      type: Joi.string().valid(...types).required()
    }
  },
  modifyServiceRequestCategoryPayload: {
    body: {
      label: Joi.string(),
      description: Joi.string(),
      enable: Joi.boolean(),
      type: Joi.string().valid(...types)
    }
  },
  addUsersPayload: [{
    body: [{
      userId: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string(),
      emailAddress: Joi.string().required(),
      mobileNumber: Joi.number(),
      managerId: Joi.string(),
      code: Joi.string(),
      roles: Joi.string().required().valid('SUPER_ADMIN', 'SUPPORT','PORTAL_OPERATIONS'),
    }]
  }],

  createMappingRequestPayload: {
    body: {
      status: Joi.string().required().valid('PENDING', 'APPROVED', 'REJECTED'),
      type: Joi.string().required().valid('ADD', 'REMOVE'),
      distributor_code: Joi.any().required(),
      TSE_code: Joi.any().required(),
      ASMRSM_code: Joi.any().required(),
      submission_comments: Joi.string(),
      created_by: Joi.string().required(),
    }
  },

  listMappingRequestPayload: {
    body: {
      limit: Joi.number().required(),
      offset: Joi.number().required(),
      status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'ALL'),
      search: Joi.string().allow(''),
    }
  },
  listDepotCodePayload: {
    body: {
      limit: Joi.number().required(),
      offset: Joi.number().required(),
      status: Joi.string().valid('ALL','PENDING', 'APPROVED', 'REJECTED'),
      search: Joi.string().allow(''),
    },
  },
  
  getPDPUpdateRequests: {
    body: {
      limit: Joi.number().required(),
      offset: Joi.number().required(),
      status: Joi.string().valid('ALL','PENDING', 'APPROVED', 'REJECTED').required(),
      search: Joi.string().allow('')
    },
  },

  updateMappingRequestPayload: {
    body: {
      sh_number: Joi.string().required(), 
      status: Joi.string().required().valid('APPROVED', 'REJECTED'),
      type: Joi.string().required().valid('ADD', 'REMOVE'),
      distributor_code: Joi.any().required(),
      distributor_name: Joi.any().required(),
      TSE_code: Joi.any().required(),
      Temp_TSE_Code: Joi.any().required(),
      ASMRSM_code: Joi.any().required(),
      comments: Joi.string(),
      updated_by: Joi.string().required(),
      existing_tse_code:  Joi.string().required(),
      existing_tse_name:  Joi.string().required(),
      existing_tse_email:  Joi.string().required()
    }
  },
  updateDistributorMobile: {
    body: {
      mobile_number: Joi.string().regex(/^[0-9]{10,12}$/).required(),
      remark: Joi.string().required(),
    },
    params: {
      distributor_id: Joi.string().required(),
    }
  },
  updateDistributorEmail: {
    body: {
      email: Joi.string().email().required(),
      remark: Joi.string().required(),
    },
    params: {
      distributor_id: Joi.string().required(),
    }
  },
  sendOtpMailMobile: {
    body: {
      type: Joi.string().required(),
      updateValue: Joi.string().required(),
      remark: Joi.string(),
    }
  },
  verifyMobile: {
    body: {
      otp: Joi.number().required(),
      remark: Joi.string(),
    }
  },
  verifyEmail: {
    params: {
      id: Joi.string().required(),
    }
  },
  pdpUpdate: {
    body: {
      comment: Joi.string().required(),
      dbCode: Joi.string().required(),
      name: Joi.string().required(),
      pdp_data: Joi.array().items(Joi.object().keys({
        sales_org : Joi.string().required(),
        division: Joi.string().required(),
        distribution_channel: Joi.string().required(),
        plant_code: Joi.string().required(),
        pdp_current: Joi.string().allow(null, '').required(),
        pdp_requested: Joi.string().required(),
        ref_date_current: Joi.string().min(8).max(8),
        ref_date_requested: Joi.string().min(8).max(8),
      }))
    }
  },
  
  pdpUpdateRequestResponse: {
    body: {
      pdpNo: Joi.string().required(),
      dbCode: Joi.string().required(),
      dbName: Joi.string().required(),
      sales_org : Joi.string().required(),
      division: Joi.string().required(),
      distribution_channel: Joi.string().required(),
      plant_code: Joi.string().required(),
      status: Joi.string().valid('APPROVED', 'REJECTED').required(),
      pdp_old: Joi.string().allow(null, '').required(),
      pdp_new: Joi.string().required(),
      ref_date_old: Joi.string().min(8).max(8).required(),
      ref_date_new: Joi.string().min(8).max(8).required(),
      response: Joi.string().required(),
      created_by: Joi.string().required(),      
    }
  },

  creditCrunchNotificationPayload: {
    body: {
      distributor_id: Joi.string().required(),
      distributor_name: Joi.string().required(),
      po_number: Joi.string().required(),
      to: Joi.array().items(Joi.string()).required(),
      cc: Joi.array().items(Joi.string()),
      credit_shortage: Joi.number().required()
    },
  },

  insertReservedCredit: {
    body: {
      distributor_id: Joi.string().optional().allow('', null),
      amount: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    }
  },

  getSapHolidayList: {
    body: {
      year: Joi.string().min(4).max(4),
      state_name: Joi.string(),
      state_code: Joi.string().max(2)
    },
  },

  createOrder2: {
    body: {
      po_number: Joi.string().min(18).required(),
      order_type: Joi.string().valid('NORMAL', 'LIQUIDATION', 'SELF_LIFTING', 'ARS', 'RUSH', 'BULK').required(),
    },
  },
};
export default validation
