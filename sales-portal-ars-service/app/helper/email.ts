const path = require('path');
declare function require(name: string);

const nodemailer = require('nodemailer');
const url = global['configuration'].url;
const mailConfig = global['configuration'].email;

// import moment from 'moment-timezone';
import logger from '../lib/logger';
import emailConfig from '../config/email';
import { EmailTemplate } from 'email-templates';
// import commonHelper from '../helper'
let AWS = require('aws-sdk');
import Helper from './index';
import fs from 'fs';
// import { AdminModel } from '../models/admin.model';

// import { utilModel } from '../models/utilModel';
// import { UserService } from '../service/user.service';
import {LogService} from '../service/logService';
import { ArsModel } from '../model/arsModel';
// AWS.config.update({
//   accessKeyId: mailConfig.accessKeyId,
//   secretAccessKey: mailConfig.secretAccessKey,
//   region: mailConfig.region,
// });

const rushOrderConfig = global['configuration'].rushOrder;

const globalEmailConfig = async () => {
  let DBEmailConfigFlag
  try {
    DBEmailConfigFlag = mailConfig.enableEmail;
  } catch (error) {
    logger.error("CAUGHT: Error in Email -> globalEmailConfig: ", error);
    return null;
  }
  AWS.config.update({
    // accessKeyId: mailConfig.accessKeyId,
    // secretAccessKey: mailConfig.secretAccessKey,
    region: mailConfig.region,
  });
  let transport = nodemailer.createTransport({
    SES: new AWS.SES({
      apiVersion: '2012-10-17',
    }),
  });

  if (DBEmailConfigFlag === 'FALSE') {
    transport = nodemailer.createTransport({
      port: 1025
    });
  }

  return transport;
}

let transport;

globalEmailConfig().then((mailer) => {
  transport = mailer;
});

const isProduction = () => {
  return process.env.NODE_ENV === 'prod';
}

const formatInternalEmail = (actualEmail: string | string[] | undefined | null, customEmail: string = 'pegasus-testing@tataconsumer.com') => {
  const emailArr: string[] = [];
  if (actualEmail === null || actualEmail === undefined || actualEmail.length === 0) return emailArr;
  if (typeof actualEmail === 'string') {
    actualEmail = actualEmail.split(',');
  }
  // Output will be formatInternalEmail('abc@xyz.com', 'pqr') => abc+pqr@xyz.com
  for (const email of actualEmail) {
    if (email === null || email === undefined || email.length === 0) continue;
    emailArr.push(customEmail.slice(0, customEmail.indexOf('@')) + `+${email.slice(0, email.indexOf('@'))}` + customEmail.slice(customEmail.indexOf('@')));
  }
  return emailArr;
}

const isEmailEnabled = async () => {
  return true;
  // const response:any[] = await utilModel.getAppSettings();
  // const isEnabled:boolean = (response)? response?.filter((item) => item.key === 'ENABLE_EMAIL_NOTIFICATION').map((item) => item.value.toUpperCase() === 'YES')[0] : false;
  // return isEnabled;
}

const Email = {
  forecastDumpStatusNotification(
    reportData: {
      unsuccessfulAreaCodesPresent: boolean,
      unsuccessfulDistributorsPresent: boolean
    },
    excelDataFile: {
      filePath: string,
      fileName: string
    } | null) {
    try {
      let templateDir = path.join(
        'app/global/templates',
        'emails',
        'forecast-dump-notification-email',
      );

      const monthName = {
        '01': "January",
        '02': "February",
        '03': "March",
        '04': "April",
        '05': "May",
        '06': "June",
        '07': "July",
        '08': "August",
        '09': "September",
        '10': "October",
        '11': "November",
        '12': "December"
      }
      const applicableMonth = Helper.applicableMonth('next');
      const forecastMonth = `${monthName[applicableMonth.substring(4, 6)]}'${applicableMonth.substring(0, 4)}`;
      Object.assign(reportData, { forecastMonth: forecastMonth });
      let forecastNotificationEmail = new EmailTemplate(templateDir);
      const emailConfiguration = {
        from: emailConfig.global.from,
        to: emailConfig.forecast_dump_email.to,
        cc: emailConfig.forecast_dump_email.cc,
        subject: `Forecast upload status notification for the month of ${forecastMonth}`,
        attachments: [
          {
            filename: excelDataFile?.fileName,
            path: excelDataFile?.filePath,
          }
        ],
      }
      forecastNotificationEmail.render({ data: reportData, url: url.FE },
        (err: any, result: { html: any; }) => {
          if (!err) {
            transport.sendMail(
              {
                ...emailConfiguration,
                html: result?.html
              },
              (err: any, info: any) => {
                if (err) {
                  logger.error('Could not send forecast dump notification email', err);
                  LogService.insertEmailLogs(
                    'FORECAST_DUMP_STATUS',
                    'FAIL',
                    `Forecast upload status notification for the month of ${forecastMonth}`,
                    {
                      to: emailConfig.forecast_dump_email.to,
                      cc: emailConfig.forecast_dump_email.cc,
                      from: emailConfig.global.from
                    },
                    'Forecast upload status notification',
                    reportData,
                    err
                  );
                }
                else { 
                  logger.info("Forecast dump notification email sent successfully");
                  LogService.insertEmailLogs(
                    'FORECAST_DUMP_STATUS',
                    'SUCCESS',
                    `Forecast upload status notification for the month of ${forecastMonth}`,
                    {
                      to: emailConfig.forecast_dump_email.to,
                      cc: emailConfig.forecast_dump_email.cc,
                      from: emailConfig.global.from
                    },
                    'Forecast upload status notification',
                    reportData
                  );
                }
                /**delete the generated excel file */
                if (excelDataFile) {
                  fs.unlink(excelDataFile?.filePath, (err) => {
                    if (err) {
                      logger.error('Error removing Excel file:', err);
                    } else {
                      logger.info('Excel file removed successfully!');
                    }
                  });
                }
              }
            );
          } else {
            logger.error('Error in email.ts, forecastNotificationEmail.render: ', err);
            LogService.insertEmailLogs(
              'FORECAST_DUMP_STATUS',
              'FAIL',
              `Forecast upload status notification for the month of ${forecastMonth}`,
              {
                to: emailConfig.forecast_dump_email.to,
                cc: emailConfig.forecast_dump_email.cc,
                from: emailConfig.global.from
              },
              'Forecast upload status notification',
              reportData,
              err
            );
          }
        });
      return true;
    } catch (error) {
      logger.error('Error in email.ts-> Email-> forecastDumpStatusNotification', error);
      LogService.insertEmailLogs(
        'FORECAST_DUMP_STATUS',
        'FAIL',
        `Forecast upload status notification`,
        {
          to: emailConfig.forecast_dump_email.to,
          cc: emailConfig.forecast_dump_email.cc,
          from: emailConfig.global.from
        },
        'Forecast upload status notification',
        reportData,
        error
      );
      return null;
    }
  },
  arsReport(
    excelDataFile: {
      filePath: string,
      fileName: string
    } | null,
    summary: {
      region: string,
      orderCount: number,
      tentative: string,
      dbCount: number
    }[] | null,
    to_arr: string[] = [],
    areaCode: string = '') {
    try {
      let templateDir = path.join(
        'app/global/templates',
        'emails',
        'ars-report',
      );
      const today = new Date();
      today.setDate(today.getDate() - 1);
      let yesterday = today.toLocaleDateString('en-GB');
      to_arr.push(emailConfig?.ars_report_email?.to ?? "")
      const to_emails = to_arr.join(',');

      let subject = `ARS report for # ${yesterday}`;
      const areaCodeStatement = areaCode ? `area code ${areaCode} on` : '';
      subject = subject.replace('#', areaCodeStatement);
      subject = process.env.NODE_ENV != 'prod' ? `(${process.env.NODE_ENV})${subject}` : subject;

      let emailConfiguration = {
        from: emailConfig.global.from,
        to: isProduction() ? to_emails : formatInternalEmail(to_emails),
        cc: isProduction() ? emailConfig.ars_report_email.cc : formatInternalEmail(emailConfig.ars_report_email.cc),
        subject: subject
      }
      if (areaCode) delete emailConfiguration.cc; //SOPE-2042

      if (excelDataFile) {
        Object.assign(emailConfiguration, {
          attachments: [
            {
              filename: excelDataFile?.fileName,
              path: excelDataFile?.filePath,
            }
          ],
        })
      }

      let arsReportEmail = new EmailTemplate(templateDir);
      arsReportEmail.render({ data: { yesterday: yesterday, isOrderPlaced: (excelDataFile ? true : false), area: areaCode, summary }, url: url.FE },
        (err: any, result: { html: any }) => {
          if (!err) {
            transport.sendMail(
              {
                ...emailConfiguration,
                html: result?.html
              },
              (err: any, info: any) => {
                if (err) {
                  logger.error('Could not send ars-report email', err);
                  LogService.insertEmailLogs(
                    'ARS_REPORT',
                    'FAIL',
                    subject,
                    {
                      to: emailConfig.ars_report_email.to,
                      cc: emailConfig.ars_report_email.cc,
                      from: emailConfig.global.from
                    },
                    'ARS report email',
                    { yesterday: yesterday, isOrderPlaced: (excelDataFile ? true : false), area: areaCode },
                    err
                  );
                }
                else { 
                  logger.info("ARS report email sent successfully");
                  LogService.insertEmailLogs(
                    'ARS_REPORT',
                    'SUCCESS',
                    subject,
                    {
                      to: emailConfig.ars_report_email.to,
                      cc: emailConfig.ars_report_email.cc,
                      from: emailConfig.global.from
                    },
                    'ARS report email',
                    { yesterday: yesterday, isOrderPlaced: (excelDataFile ? true : false), area: areaCode }
                  );
                }
                /**delete the generated excel file */
                if (excelDataFile) {
                  fs.unlink(excelDataFile?.filePath, (err) => {
                    if (err) {
                      logger.error('Error in ArsReport: removing Excel file:', err);
                    } else {
                      logger.info('ArsReport: Excel file removed successfully!');
                    }
                  });
                }
              }
            );
          } else {
            logger.error('Error in email.ts, arsReportEmail.render: ', err);
            LogService.insertEmailLogs(
              'ARS_REPORT',
              'FAIL',
              subject,
              {
                to: emailConfig.ars_report_email.to,
                cc: emailConfig.ars_report_email.cc,
                from: emailConfig.global.from
              },
              'ARS report email',
              { yesterday: yesterday, isOrderPlaced: (excelDataFile ? true : false), area: areaCode },
              err
            );
          }
        }
      );
      return true;
    } catch (error) {
      logger.error('Error in email.ts-> Email-> ArsReport', error);
      LogService.insertEmailLogs(
        'ARS_REPORT',
        'FAIL',
        `ARS report email`,
        {
          to: emailConfig.ars_report_email.to,
          cc: emailConfig.ars_report_email.cc,
          from: emailConfig.global.from
        },
        'ARS report email',
        { yesterday: '', isOrderPlaced: false, env: '', area: '' },
        error
      );
      return null;
    }
  },

  async sihBelowSs(data) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending sihBelowSs email to users.');
      return;
    }
    logger.info('inside Email -> sihBelowSs');
    const email_type = data.emailType === 'stock norm' ? 'HOLDINGS_BELOW_SN' : 'HOLDINGS_BELOW_SS';
    try {
      if (data) {
        let templateDir = path.join(
          'app/global/templates',
          'emails',
          'sih-ss-email',
        );
        let sihBelowSs = new EmailTemplate(templateDir);
        
        sihBelowSs.render({ content: { ...data }, activate_url: `${Helper.feUrl()}` }, (err, result) => {
          if (!err) {
            transport.sendMail(
              {
                from: emailConfig.global.from,
                to: isProduction() ? data.to : formatInternalEmail(data.to),
                cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
                subject: `Stock Holdings has fallen below ${data.emailType}`,
                html: result.html,
              }, (err, info) => {
                if (err) {
                  logger.error(`Couldn't send SIH below SS alert email to '${data.to}' , due to error: `, err);
                  LogService.insertEmailLogs(
                    email_type,
                    'FAIL',
                    `Stock Holdings has fallen below ${data.emailType}`,
                    {
                      to: data.to,
                      cc: data.cc,
                      from: emailConfig.global.from
                    },
                    data.dbCode,
                    data,
                    err
                  );
                }
                else {
                  logger.info(`SIH below SS alert email for ${data.dbName}(${data.dbCode}) sent successfully.`);
                  LogService.insertEmailLogs(
                    email_type,
                    'SUCCESS',
                    `Stock Holdings has fallen below ${data.emailType}`,
                    {
                      to: data.to,
                      cc: data.cc,
                      from: emailConfig.global.from
                    },
                    data.dbCode,
                    data
                  );
                }
              }
            );
          } else {
            logger.error('inside Email -> sihBelowSs, Error: ', err);
            LogService.insertEmailLogs(
              email_type,
              'FAIL',
              `Stock Holdings has fallen below ${data.emailType}`,
              {
                to: data.to,
                cc: data.cc,
                from: emailConfig.global.from
              },
              data.dbCode,
              data,
              err
            );
          }
        });
      }
    } catch (error) {
      logger.error("Error while sending SIH below SS alert email , Error: ", error)
      LogService.insertEmailLogs(
        email_type,
        'FAIL',
        `Stock Holdings has fallen below ${data.emailType}`,
        {
          to: data.to,
          cc: data.cc,
          from: emailConfig.global.from
        },
        data.dbCode,
        data,
        error
      );
    }
  },

  async forecastWindowOpen(data) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending forecastWindowOpen email to users.');
      return;
    }
    logger.info('inside Email -> forecastWindowOpen');
    try {
      if (data) {
        let templateDir = path.join(
          'app/global/templates',
          'emails',
          'forecast-window-open-email',
        );
        let windowOpen = new EmailTemplate(templateDir);
        windowOpen.render({ content: { ...data }, activate_url: `${Helper.feUrl()}` }, (err, result) => {
          if (!err) {
            transport.sendMail(
              {
                from: emailConfig.global.from,
                to: isProduction() ? data.to : formatInternalEmail(data.to),
                cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
                subject: `Forecast and Phasing Adjustment`,
                html: result.html,
              }, (err, info) => {
                if (err) {
                  logger.error(`Couldn't send Forecast Adjustment Window open email to '${data.to}' , cc '${data.cc}', due to error: `, err);
                  LogService.insertEmailLogs(
                    'FORECAST_WINDOW_OPEN',
                    'FAIL',
                    `Forecast and Phasing Adjustment`,
                    {
                      to: data.to,
                      cc: data.cc,
                      from: emailConfig.global.from
                    },
                    data.dbCode,
                    data,
                    err
                  );
                }
                else {
                  logger.info(`Forecast Adjustment Window open email  sent successfully.`); 
                  LogService.insertEmailLogs(
                    'FORECAST_WINDOW_OPEN',
                    'SUCCESS',
                    `Forecast and Phasing Adjustment`,
                    {
                      to: data.to,
                      cc: data.cc,
                      from: emailConfig.global.from
                    },
                    data.dbCode,
                    data
                  );
                }
              }
            );
          } else {
            logger.error('Inside Email -> forecastWindowOpen, Error: ', err);
            LogService.insertEmailLogs(
              'FORECAST_WINDOW_OPEN',
              'FAIL',
              `Forecast and Phasing Adjustment`,
              {
                to: data.to,
                cc: data.cc,
                from: emailConfig.global.from
              },
              data.dbCode,
              data,
              err
            );
          }
        });
      }
    } catch (error) {
      logger.error("Error while sending Forecast Adjustment Window open email , Error: ", error)
      LogService.insertEmailLogs(
        'FORECAST_WINDOW_OPEN',
        'FAIL',
        `Forecast and Phasing Adjustment`,
        {
          to: data.to,
          cc: data.cc,
          from: emailConfig.global.from
        },
        data.dbCode,
        data,
        error
      );
    }
  },

  async forecastWindowClose(data) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending forecastWindowClose email to users.');
      return;
    }
    logger.info('inside Email -> forecastWindowClose');
    try {
      if (data) {
        let templateDir = path.join(
          'app/global/templates',
          'emails',
          'forecast-window-close-email',
        );
        let windowOpen = new EmailTemplate(templateDir);
        windowOpen.render({ content: { ...data }, activate_url: `${Helper.feUrl()}` }, (err, result) => {
          if (!err) {
            transport.sendMail(
              {
                from: emailConfig.global.from,
                to: isProduction() ? data.to : formatInternalEmail(data.to),
                cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
                subject: `Forecast and Phasing Adjustment`,
                html: result.html,
              }, (err, info) => {
                if (err) {
                  logger.error(`Couldn't send Forecast and Phasing Adjustments snapshot email to '${data.to}' , cc '${data.cc}', due to error: `, err);
                  LogService.insertEmailLogs(
                    'FORECAST_WINDOW_CLOSE',
                    'FAIL',
                    `Forecast and Phasing Adjustment`,
                    {
                      to: data.to,
                      cc: data.cc,
                      from: emailConfig.global.from
                    },
                    data.name,
                    data,
                    err
                  );
                }
                else {
                  logger.info(`Forecast and Phasing Adjustments snapshot email  sent successfully.`)
                  LogService.insertEmailLogs(
                    'FORECAST_WINDOW_CLOSE',
                    'SUCCESS',
                    `Forecast and Phasing Adjustment`,
                    {
                      to: data.to,
                      cc: data.cc,
                      from: emailConfig.global.from
                    },
                    data.name,
                    data
                  );
                }
              }
            );
          } else {
            logger.error('Inside Email -> forecastWindowClose, Error: ', err);
            LogService.insertEmailLogs(
              'FORECAST_WINDOW_CLOSE',
              'FAIL',
              `Forecast and Phasing Adjustment`,
              {
                to: data.to,
                cc: data.cc,
                from: emailConfig.global.from
              },
              data.name,
              data,
              err
            );
          }
        });
      }
    } catch (error) {
      logger.error("Error while sending Forecast and Phasing Adjustments snapshot email , Error: ", error)
      LogService.insertEmailLogs(
        'FORECAST_WINDOW_CLOSE',
        'FAIL',
        `Forecast and Phasing Adjustment`,
        {
          to: data.to,
          cc: data.cc,
          from: emailConfig.global.from
        },
        data.name,
        data,
        error
      );
    }
  },
};
export default Email;
