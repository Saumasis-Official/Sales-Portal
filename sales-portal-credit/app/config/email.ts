'use strict';
require('dotenv').config();

export default {
  welcome: {
    subject: 'Welcome to TCPL',
  },
  global: {
    from: 'noreply.pegasus@tataconsumer.com',
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
  },
  sd_report_email: {
    to: process.env.ARS_REPORT_TO
  }
}

