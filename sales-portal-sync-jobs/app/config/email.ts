'use strict';

export default {

  global: {
    from: 'noreply.pegasus@tataconsumer.com',
  },
  welcome: {
    subject: 'Welcome to TCPL',
  },
  order_created: {
    subject: 'TCPL: Order successfully created',
  },
  warehouse_details_fetch_failed: {
    subject: 'TCPL: Could not fetch Shipping & Unloading Points'
  },
  tse_admin_order_creation: {
    subject: 'TCPL: Order successfully created',
  },
  report_portal_error: {
    subject: 'TCPL: Portal error reported',
  },
  update_distributor: {
    subject: 'TCPL: Update distributor',
  },
  distributor_contact_update: {
    subject: 'TCPL: Distributor Contact Updated',
  },

  update_email: {
    subject: 'TCPL: Update Email',
  },
  sd_request_email: {
    subject: 'raised by'
  },
  cfa_response_email: {
    subject: 'raised by'
  },
  forecast_dump_email: {
    to: process.env.FORECAST_UPLOAD_EMAIL_NOTIFICATION_TO,
    cc: process.env.FORECAST_UPLOAD_EMAIL_NOTIFICATION_CC,
  },
  ars_report_email: {
    to: process.env.ARS_REPORT_TO,
    cc: process.env.ARS_REPORT_CC
  }
}
