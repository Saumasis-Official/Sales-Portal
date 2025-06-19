const path = require('path');
declare function require(name: string);

const nodemailer = require('nodemailer');
const url = global['configuration'].url;
const mailConfig = global['configuration'].email;

import moment from 'moment-timezone';
import logger from '../lib/logger';
import emailConfig from '../config/email';
import { EmailTemplate } from 'email-templates';
import commenHelper from '../helper'
import data from './responseTemplate';
import { AdminModel } from '../models/admin.model';
import { SapModel } from '../models/sap.model';
import { LogService } from '../service/LogService';

let AWS = require('aws-sdk');

// AWS.config.update({
//   accessKeyId: mailConfig.accessKeyId,
//   secretAccessKey: mailConfig.secretAccessKey,
//   region: mailConfig.region,
// });
const globalEmailConfig = async () => {
  let DBEmailConfigFlag;
  try {
    DBEmailConfigFlag = mailConfig.enableEmail // await AdminModel.getGlobalEmailConfig();
  } catch (error) {
    logger.error("CAUGHT: Error in Email -> globalEmailConfig: ", error);
    return null;
  }
  AWS.config.update({
    // accessKeyId: mailConfig.accessKeyId,
    // secretAccessKey: mailConfig.secretAccessKey,
    region: mailConfig.region,
  });

  let transport;
  transport = nodemailer.createTransport({
    SES: new AWS.SES({
      apiVersion: '2012-10-17',
    }),
  });

  if (DBEmailConfigFlag === 'FALSE') {
    transport = nodemailer.createTransport({
      port: 587
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

const formatInternalEmail = (actualEmail: string | string[], customEmail: string = 'pegasus-testing@tataconsumer.com') => {
  const emailArr: string[] = [];
  if (typeof actualEmail === 'string') {
    actualEmail = actualEmail.split(',');
  }
  // Output will be formatInternalEmail('abc@xyz.com', 'pqr@qwe.com') => pqr+abc@xyz.com
  for (const email of actualEmail) {
    emailArr.push(customEmail.slice(0, customEmail.indexOf('@')) + `+${email.slice(0, email.indexOf('@'))}` + customEmail.slice(customEmail.indexOf('@')));
  }
  logger.info('email.ts -> Email formatInternalEmail: ', emailArr);
  return emailArr;
}

const isEmailEnabled = async () => {
  return true;
  // const response = await SapModel.getAppLevelSettingsByKeys(`'ENABLE_EMAIL_NOTIFICATION'`);
  // let isEnabled:boolean = false;
  // if(response && response?.rows.length > 0){
  //   isEnabled = response.rows[0].value.toUpperCase() === 'YES';
  // }
  // return isEnabled;
}

const isCreditCrunchEmailEnabled = async () => {
  const response = await SapModel.getAppLevelSettingsByKeys(`'CREDIT_LIMIT_NOTIFICATION'`);
  let isEnabled: boolean = false;
  if (response && response?.rows.length > 0) {
    isEnabled = response.rows[0].value.toUpperCase() === 'YES';
  }
  return isEnabled;
}

const Email = {
  async welcome(user) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending welcome email to users.');
      return;
    }
    if (user.email) {
      let templateDir = path.join('app/global/templates', 'emails', 'welcome-email');
      let welcomeEmail = new EmailTemplate(templateDir);

      welcomeEmail.render({ user: user, activate_url: `${url.API}/auth/activate/${user.uuid}` }, (err, result) => {

        transport.sendMail(
          {
            from: emailConfig.global.from,
            to: isProduction() ? user.email : formatInternalEmail(user.email),
            subject: emailConfig.welcome.subject,
            html: result.html,
          }, (err, info) => {
            if (err) {
              logger.error('Sent mail welcome err: ', err);
              LogService.insertEmailLogs('WELCOME_SAP', 'FAIL', emailConfig.welcome.subject, { to: user.email, from: emailConfig.global.from }, user.email, user, err);
            } else {
              logger.info('Sent mail welcome!'); 
              LogService.insertEmailLogs('WELCOME_SAP', 'SUCCESS', emailConfig.welcome.subject, { to: user.email, from: emailConfig.global.from }, user.email, user);
            }

          }
        );
      });
    }
  },

  async order_created(user, otpData) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending order_created email to users.');
      return;
    }
    if (user.email) {
      const { poNumber } = otpData;
      let templateDir = path.join('app/global/templates', 'emails', 'order-created-email');
      let createOder = new EmailTemplate(templateDir);
      createOder.render({ user: otpData, otpData }, (err, result) => {
        transport.sendMail(
          {
            from: emailConfig.global.from,
            to: isProduction() ? user.email : formatInternalEmail(user.email),
            subject: emailConfig.order_created.subject,
            html: result.html,
          }, (err, info) => {
            if (err) {
              logger.error('Sent mail order creation err: ', err);
              LogService.insertEmailLogs('CREATE_ORDER', 'FAIL', emailConfig.order_created.subject, { to: user.email, from: emailConfig.global.from }, poNumber, otpData, err);
            }
            else {
              logger.info('Sent mail on order creation!')
              LogService.insertEmailLogs('CREATE_ORDER', 'SUCCESS', emailConfig.order_created.subject, { to: user.email, from: emailConfig.global.from }, poNumber, otpData);
            }

            // some error occoured...
          }
        );
      });
    }
    if (user.phone_verified) {
      // To do to send email
    }

  },

  warehouse_details_fetch_failed(user, distributorId, startTime, error) {
    transport.sendMail(
      {
        from: emailConfig.global.from,
        to: isProduction() ? user.email : formatInternalEmail(user.email),
        subject: emailConfig.warehouse_details_fetch_failed.subject,
        text: `Hi,
The distributor ${distributorId} has no shipping and unloading points configured. 
Login Date and Time: ${new Date(startTime).toLocaleString("en-US", { timeZone: 'Asia/Kolkata' })} IST
Error Code :  ${error.code || 500}
Error Message:  ${error.message || 'Issue in fetching Shipping and Unloading Points'}
Environment: ${process.env.NODE_ENV || 'dev'}

Thankyou
TCPL`,
      }, (err, info) => {
        const emailData = {
          distributorId,
          startTime: new Date(startTime).toLocaleString("en-US", { timeZone: 'Asia/Kolkata' }),
          error
        }
        if (err) {
          logger.error('Sent mail warehouse details fetch err', err);
          LogService.insertEmailLogs('WAREHOUSE_DETAILS_FETCH_FAILED', 'FAIL', emailConfig.warehouse_details_fetch_failed.subject, { to: user.email, from: emailConfig.global.from }, distributorId, emailData, err);
        }
        else {
          logger.info('Sent mail warehouse details fetch info', info);
          LogService.insertEmailLogs('WAREHOUSE_DETAILS_FETCH_FAILED', 'SUCCESS', emailConfig.warehouse_details_fetch_failed.subject, { to: user.email, from: emailConfig.global.from }, distributorId, emailData);
        }

        // some error occoured...
      }
    );
  },
  async tse_admin_order_creation(email, otpData) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending tse_admin_order_creation email to users.');
      return;
    }
    if (email && email.length > 0) {
      const { area, asm, asmareacode, tse, tseareacode, distributorId, distributorname, poNumber, poDate, amount, soNumber, soDate, shipTo, shipToCode, unloadingPoint, totalQuantityTon, unloadingPointCode, items } = otpData
      let templateDir = path.join('app/global/templates', 'emails', 'tse-admin-order-creation');
      let createOder = new EmailTemplate(templateDir);
      createOder.render({ area, asm, asmareacode, tse, tseareacode, distributorId, distributorname, poNumber, poDate, amount, soNumber, soDate, shipTo, shipToCode, unloadingPoint, totalQuantityTon, unloadingPointCode, items }, (err, result) => {
        if (result) {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? email : formatInternalEmail(email),
              subject: emailConfig.tse_admin_order_creation.subject,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.info('Sent mail to admin order creation err: ', err); 
                LogService.insertEmailLogs('TSE_ADMIN_ORDER_CREATION', 'FAIL', emailConfig.tse_admin_order_creation.subject, { to: email, from: emailConfig.global.from }, poNumber, otpData, err);
              }
              else {
                logger.info('Sent mail to admin on order creation!'); 
                LogService.insertEmailLogs('TSE_ADMIN_ORDER_CREATION', 'SUCCESS', emailConfig.tse_admin_order_creation.subject, { to: email, from: emailConfig.global.from }, poNumber, otpData);
              }
              // some error occoured...
            }
          );
        } else {
          LogService.insertEmailLogs('TSE_ADMIN_ORDER_CREATION', 'FAIL', emailConfig.tse_admin_order_creation.subject, { to: email, from: emailConfig.global.from }, poNumber, otpData, "Error in rendering email template");
        }
      });
    }
  },
  async report_portal_error(
    emailIds,
    ccEmailIds,
    tse,
    reportPortalErrorObj: {
      sr_no: string,
      remarks: string,
      user_id: string,
      error_code: string,
      error_message: string | null,
      corr_id: string | null,
      error_info: any | null,
      category_label: string,
      category_description: string,
      created_by: string | null,
      created_by_user_group: string
    },
    userDetails: object,
    emailTemplateFileName: string,
    soDetailsObject: {
      soNumber: string,
      soDate: string,
      distCode: string,
      distName: string,
      unloading: string
    },
    isPortalGenerated: boolean = false,
    portalGeneratedReportingType: string | null
  ) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending report_portal_error email to users.');
      return;
    }
    const tseNameArray = tse?.map(({ first_name, last_name, code }) => {
      const firstName: string = (first_name || '')
      const lastName: string = (last_name || '');
      const codes: string = (code ? `(${code})` : '');
      return `${firstName} ${lastName} ${codes}`;
    })
    const tseEmailArray = tse?.map(({ email }) => {
      const emails: string = email || '<NOT AVAILABLE>';
      return emails
    })

    const tseNames: string = tseNameArray?.length > 0 ? tseNameArray.join('/') : '<NOT AVAILABLE>';
    const tseEmails: string = tseEmailArray?.length > 0 ? tseEmailArray?.join('/') : '<NOT AVAILABLE>';

    const tseDetails = {
      name: tseNames,
      email: tseEmails
    }

    if (emailIds) {
      let templateDir = path.join('app/global/templates', 'emails', emailTemplateFileName);
      logger.info(`emailTemplateFileName : ${emailTemplateFileName}`);
      let temp = {
        ...reportPortalErrorObj,
        ...soDetailsObject,
        distributor_name: userDetails ? userDetails['name'] : reportPortalErrorObj?.error_info?.sales_order_data?.distributor?.name,
        user_details: userDetails,
        tse: tseDetails,
        url: url.FE,
        order_type: null
      }
      if (reportPortalErrorObj.error_info) {
        if (reportPortalErrorObj.error_info.order_type) {
          temp.order_type = reportPortalErrorObj.error_info.order_type;
        }
        else if (reportPortalErrorObj.error_info.sales_order_data) {
          temp.order_type = reportPortalErrorObj.error_info.sales_order_data.order_type;
        }
      }
      logger.info(`soDetailsObject : ${JSON.stringify(temp)}`);
      let reportPortalError = new EmailTemplate(templateDir);
      reportPortalError.render(temp, (err, result) => {
        if (result) {
          logger.info(`reportPortalErrorObj : ${JSON.stringify(reportPortalErrorObj)}`);
          let errorSubject: string = `${emailConfig.report_portal_error.subject} | ${reportPortalErrorObj.user_id} | ${moment.tz(moment(), 'Asia/Kolkata').format('DD-MM-YYYY hh:mm A')} | ${reportPortalErrorObj.category_label}`;
          if (isPortalGenerated) {
            if (portalGeneratedReportingType === 'AOS') {
              errorSubject += '(**PORTAL GENERATED AOS VALIDATION ERROR**)';
            } else if (portalGeneratedReportingType === 'DLP') {
              errorSubject += '(**PORTAL GENERATED DLP VALIDATION ERROR**)';
            }
          }
          if (reportPortalErrorObj.error_info) {
            transport.sendMail({
              from: emailConfig.global.from,
              to: isProduction() ? emailIds : formatInternalEmail(emailIds),
              cc: isProduction() ? ccEmailIds : formatInternalEmail(ccEmailIds),
              subject: errorSubject,
              html: result.html,
              attachments: {
                filename: `${reportPortalErrorObj.sr_no}-error-log.txt`,
                content: `${JSON.stringify(reportPortalErrorObj.error_info, null, 4)}`
              }
            }, (err, info) => {
              if (err) {
                logger.info('Error in sending mail on reporting portal error: ', err);
                LogService.insertEmailLogs('REPORT_PORTAL_ERROR', 'FAIL', errorSubject, { to: emailIds, cc: ccEmailIds, from: emailConfig.global.from }, reportPortalErrorObj.sr_no, reportPortalErrorObj, err)
              }
              else {
                logger.info('Sent mail on reporting portal error successfully with attachment');
                LogService.insertEmailLogs('REPORT_PORTAL_ERROR', 'SUCCESS', errorSubject, { to: emailIds, cc: ccEmailIds, from: emailConfig.global.from }, reportPortalErrorObj.sr_no, reportPortalErrorObj)
              }
            }
            );
          } else {
            transport.sendMail(
              {
                from: emailConfig.global.from,
                to: isProduction() ? emailIds : formatInternalEmail(emailIds),
                cc: isProduction() ? ccEmailIds : formatInternalEmail(ccEmailIds),
                subject: `${emailConfig.report_portal_error.subject} | ${reportPortalErrorObj.user_id} | ${moment.tz(moment(), 'Asia/Kolkata').format('DD-MM-YYYY hh:mm A')} | ${reportPortalErrorObj.category_label}`,
                html: result.html
              }, (err, info) => {
                if (err) {
                  logger.info('Error in sending mail on reporting portal error: ', err);
                  LogService.insertEmailLogs('REPORT_PORTAL_ERROR', 'FAIL', `${emailConfig.report_portal_error.subject} | ${reportPortalErrorObj.user_id} | ${moment.tz(moment(), 'Asia/Kolkata').format('DD-MM-YYYY hh:mm A')} | ${reportPortalErrorObj.category_label}`, { to: emailIds, cc: ccEmailIds, from: emailConfig.global.from }, reportPortalErrorObj.sr_no, reportPortalErrorObj, err)
                }
                else {
                  logger.info('Sent mail on reporting portal error successfully');
                  LogService.insertEmailLogs('REPORT_PORTAL_ERROR', 'SUCCESS', `${emailConfig.report_portal_error.subject} | ${reportPortalErrorObj.user_id} | ${moment.tz(moment(), 'Asia/Kolkata').format('DD-MM-YYYY hh:mm A')} | ${reportPortalErrorObj.category_label}`, { to: emailIds, cc: ccEmailIds, from: emailConfig.global.from }, reportPortalErrorObj.sr_no, reportPortalErrorObj)
                }
              }
            );
          }
        }
        else if (err) {
          logger.info('Error in rendering rmailTemplate:', err);
          LogService.insertEmailLogs('REPORT_PORTAL_ERROR', 'FAIL', `${emailConfig.report_portal_error.subject} | ${reportPortalErrorObj.user_id} | ${moment.tz(moment(), 'Asia/Kolkata').format('DD-MM-YYYY hh:mm A')} | ${reportPortalErrorObj.category_label}`, { to: emailIds, cc: ccEmailIds, from: emailConfig.global.from }, reportPortalErrorObj.sr_no, reportPortalErrorObj, "Error in rendering email template")
        }
      });
    }
  },

  async report_cfa_portal_error(emailIds, ccEmailIds, reportPortalErrorObj: {
    sr_no: string, remarks: string, user_id: string, error_code: string, error_message: string | null, corr_id: string | null, error_info: any | null, category_label: string, category_description: string, created_by: string | null, created_by_user_group: string
  }, userDetails: any, emailTemplateFileName: string) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending report_cfa_portal_error email to users.');
      return;
    }
    if (emailIds) {
      let templateDir = path.join('app/global/templates', 'emails', emailTemplateFileName);
      logger.info(`emailTemplateFileName : ${emailTemplateFileName}`);
      let temp = {
        ...reportPortalErrorObj,
        user_details: userDetails,
        url: url.FE,
        order_type: null
      }
      reportPortalErrorObj.user_id = userDetails.user_id;

      if (reportPortalErrorObj.error_info) {
        if (reportPortalErrorObj.error_info.order_type) {
          temp.order_type = reportPortalErrorObj.error_info.order_type;
        }
        else if (reportPortalErrorObj.error_info.sales_order_data) {
          temp.order_type = reportPortalErrorObj.error_info.sales_order_data.order_type;
        }
      }
      logger.info(`soDetailsObject : ${JSON.stringify(temp)}`);
      let reportPortalError = new EmailTemplate(templateDir);
      reportPortalError.render(temp, (err, result) => {
        if (result) {
          logger.info(`reportPortalErrorObj : ${JSON.stringify(reportPortalErrorObj)}`);
          if (reportPortalErrorObj.error_info) {
            transport.sendMail({
              from: emailConfig.global.from,
              to: isProduction() ? emailIds : formatInternalEmail(emailIds),
              cc: isProduction() ? ccEmailIds : '',
              subject: `${emailConfig.report_portal_error.subject} | ${reportPortalErrorObj.user_id} | ${moment.tz(moment(), 'Asia/Kolkata').format('DD-MM-YYYY hh:mm A')} | ${reportPortalErrorObj.category_label}`,
              html: result.html,
              attachments: {
                filename: `${reportPortalErrorObj.sr_no}-error-log.txt`,
                content: `${JSON.stringify(reportPortalErrorObj.error_info, null, 4)}`
              }
            }, (err, info) => {
              if (err) {
                logger.info('Error in sending mail on reporting portal error: ', err);
                LogService.insertEmailLogs('REPORT_CFA_PORTAL_ERROR', 'FAIL', `${emailConfig.report_portal_error.subject} | ${reportPortalErrorObj.user_id} | ${moment.tz(moment(), 'Asia/Kolkata').format('DD-MM-YYYY hh:mm A')} | ${reportPortalErrorObj.category_label}`, { to: emailIds, cc: ccEmailIds, from: emailConfig.global.from }, reportPortalErrorObj.sr_no, reportPortalErrorObj, err);
              }
              else {
                logger.info('Sent mail on reporting portal error successfully');
                LogService.insertEmailLogs('REPORT_CFA_PORTAL_ERROR', 'SUCCESS', `${emailConfig.report_portal_error.subject} | ${reportPortalErrorObj.user_id} | ${moment.tz(moment(), 'Asia/Kolkata').format('DD-MM-YYYY hh:mm A')} | ${reportPortalErrorObj.category_label}`, { to: emailIds, cc: ccEmailIds, from: emailConfig.global.from }, reportPortalErrorObj.sr_no, reportPortalErrorObj);
              }
            }
            );
          } else {
            transport.sendMail(
              {
                from: emailConfig.global.from,
                to: isProduction() ? emailIds : formatInternalEmail(emailIds),
                cc: isProduction() ? ccEmailIds : '',
                subject: `${emailConfig.report_portal_error.subject} | ${reportPortalErrorObj.user_id} | ${moment.tz(moment(), 'Asia/Kolkata').format('DD-MM-YYYY hh:mm A')} | ${reportPortalErrorObj.category_label}`,
                html: result.html
              }, (err, info) => {
                if (err) logger.info('Error in sending mail on reporting portal error: ', err);
                else logger.info('Sent mail on reporting portal error successfully');
              }
            );
          }
        }
        else if (err) {
          logger.info('Error in rendering emailTemplate:', err);
          LogService.insertEmailLogs('REPORT_CFA_PORTAL_ERROR', 'FAIL', `${emailConfig.report_portal_error.subject} | ${reportPortalErrorObj.user_id} | ${moment.tz(moment(), 'Asia/Kolkata').format('DD-MM-YYYY hh:mm A')} | ${reportPortalErrorObj.category_label}`, { to: emailIds, cc: ccEmailIds, from: emailConfig.global.from }, reportPortalErrorObj.sr_no, reportPortalErrorObj, "Error in rendering email template")
        }
      });
    }
  },

  async sales_hierarchy_dist_admin_email(email, content) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending sales_hierarchy_dist_admin_email to users.');
      return;
    }
    let data = {
      addressname: '',
      addresscode: '',
      addressemail: '',
      newname: '',
      newcode: '',
      newemail: '',
      oldname: '',
      oldcode: '',
      oldemail: '',
      distributor_code: '',
      distributor_name: '',
      type: '',
      status: '',
      sh_number: ''
    };


    let type = '';
    if (content.status == 'ADD') {
      type = 'Distributor not showing'
    }
    else {
      type = 'Distributor does not belong to TSE'
    }
    let emailIDs = '';
    if (content) {
      if (content.toemail != null && content.oldtseemail != null) {
        emailIDs = (content.toemail + ", " + content.oldtseemail);
      }
      else {
        emailIDs = content.toemail;
      }

      if (content.payloadtemptsecode != content.payloadtsecode && content.payloadtsecode != undefined) {
        data.addressname = content.oldtsename;
        data.addresscode = content.oldtsecode;
        data.addressemail = content.oldtseemail;
        data.newname = content.tsename;
        data.newcode = content.tsecode;
        data.newemail = content.toemail;
        data.distributor_code = content.distributorcode;
        data.distributor_name = content.distributorname;
        data.type = content.type;
        data.status = content.status;
        data.sh_number = content.shnumber;
      }
      else if (content.payloadtsecode == undefined) {
        data.addressname = content.tsename;
        data.addresscode = content.tsecode;
        data.addressemail = content.toemail;
        data.distributor_code = content.distributorcode;
        data.distributor_name = content.distributorname;
        data.type = content.type;
        data.status = content.status;
        data.sh_number = content.shnumber;
      }
      else if (content.payloadtemptsecode == content.payloadtsecode) {
        data.addressname = content.tsename;
        data.addresscode = content.tsecode;
        data.addressemail = content.toemail;
        data.oldname = content.oldtsename;
        data.oldcode = content.oldtsecode;
        data.oldemail = content.oldtseemail;
        data.distributor_code = content.distributorcode;
        data.distributor_name = content.distributorname;
        data.type = content.type;
        data.status = content.status;
        data.sh_number = content.shnumber;
      }
    }
    if (email) {
      let templateDir = path.join('app/global/templates', 'emails', 'sales-hierarchy-dist-admin-email');
      let createOder = new EmailTemplate(templateDir);
      createOder.render({ content: data, email, activate_url: `${commenHelper.feUrl(process.env.FE_URL)}` }, (err, result) => {
        transport.sendMail(
          {
            from: emailConfig.global.from,
            to: isProduction() ? emailIDs : formatInternalEmail(emailIDs),
            cc: isProduction() ? email : formatInternalEmail(email),
            subject: `${data.sh_number} raised by ${data.addressname}(${data.addresscode}) | ${type}`,
            html: result.html,
          }, (err, info) => {
            if (err) {
              logger.error('Sent mail distributor update err: ', err);
              LogService.insertEmailLogs('SALES_HIERARCHY_RESPONSE', 'FAIL', `${data.sh_number} raised by ${data.addressname}(${data.addresscode}) | ${type}`, { to: emailIDs, cc: email, from: emailConfig.global.from }, data.sh_number, data, err);
            }
          else {
            logger.info('Sent mail on distributor update!');
            LogService.insertEmailLogs('SALES_HIERARCHY_RESPONSE', 'SUCCESS', `${data.sh_number} raised by ${data.addressname}(${data.addresscode}) | ${type}`, { to: emailIDs, cc: email, from: emailConfig.global.from }, data.sh_number, data);
          }
        });
      });
    }
  },

  async sales_hierarchy_tse_email(email, content) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending sales_hierarchy_tse_email email to users.');
      return;
    }
    let type = '';
    if (content.status == 'ADD') {
      type = 'Distributor not showing'
    }
    else {
      type = 'Distributor does not belong to TSE'
    }
    if (email) {
      let templateDir = path.join('app/global/templates', 'emails', 'sales-hierarchy-tse-email');
      let createOder = new EmailTemplate(templateDir);
      createOder.render({ content: content, email, activate_url: `${commenHelper.feUrl(process.env.FE_URL)}` }, (err, result) => {
        transport.sendMail(
          {
            from: emailConfig.global.from,
            to: isProduction() ? content.asmemail : formatInternalEmail(content.asmemail),
            cc: isProduction() ? email : formatInternalEmail(email),
            subject: `${content.shnumber} raised by ${content.tsename}(${content.tsecode}) | ${type}`,
            html: result.html,
          }, (err, info) => {
            if (err) {
              logger.error('Sent mail distributor update err: ', err);
              LogService.insertEmailLogs('SALES_HIERARCHY_REQUEST', 'FAIL', `${content.shnumber} raised by ${content.tsename}(${content.tsecode}) | ${type}`, { to: content.asmemail, cc: email, from: emailConfig.global.from }, content.shnumber, content, err);
            }
            else {
              logger.info('Sent mail on distributor update!');
              LogService.insertEmailLogs('SALES_HIERARCHY_REQUEST', 'SUCCESS', `${content.shnumber} raised by ${content.tsename}(${content.tsecode}) | ${type}`, { to: content.asmemail, cc: email, from: emailConfig.global.from }, content.shnumber, content);
            }
          }
        );
      });
    }
  },

  async send_email_tse_admin_update_email_mobile(email, distributorId, emailId, phoneNumber, updatedBy: { first_name: string, last_name: string, email: string } | null = null) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending send_email_tse_admin_update_email_mobile email to users.');
      return;
    }
    if (email) {
      let templateDir = path.join('app/global/templates', 'emails', updatedBy ? 'tse-asm-update-email-mobile-by-admin' : 'tse-admin-update-email-mobile');
      let contactDetailsUpdatedEmail = new EmailTemplate(templateDir);

      contactDetailsUpdatedEmail.render(updatedBy ? { distributorId, emailId, phoneNumber, admin_name: (updatedBy.first_name ? updatedBy.first_name : '') + ' ' + (updatedBy.last_name ? updatedBy.last_name : ''), admin_email: (updatedBy.email ? updatedBy.email : '') } : { distributorId, emailId, phoneNumber }, (err, result) => {
        if (result) {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? email : formatInternalEmail(email),
              subject: emailConfig.distributor_contact_update.subject,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.info('update email error: ', err);
                LogService.insertEmailLogs('TSE_ADMIN_UPDATE_EMAIL_MOBILE', 'FAIL', `${emailConfig.distributor_contact_update.subject}`, { to: email, from: emailConfig.global.from }, phoneNumber, { email: emailId }, `${err}`);
              }
              else {
                logger.info('update email success');
                LogService.insertEmailLogs('TSE_ADMIN_UPDATE_EMAIL_MOBILE', 'SUCCESS', `${emailConfig.distributor_contact_update.subject}`, { to: email, from: emailConfig.global.from }, phoneNumber, { email: emailId });
              } 
            }
          );
        }
      });
    }
  },

  async update_email(email, id, name, remark) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending update_email email to users.');
      return;
    }
    if (email) {
      let templateDir = path.join('app/global/templates', 'emails', 'email-update');
      let passwordResetEmail = new EmailTemplate(templateDir);
      passwordResetEmail.render({
        name, activate_url: `${commenHelper.feUrl(process.env.NODE_ENV)}/email-verify/${id}?remark=${remark}`
      }, (err, result) => {
        if (result) {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? email : formatInternalEmail(email),
              subject: emailConfig.update_email.subject,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.info('update email error: ', err);
                LogService.insertEmailLogs('UPDATE_EMAIL', 'FAIL', `${emailConfig.update_email.subject}`, { to: email, from: emailConfig.global.from }, name, { remark: remark }, `${err}`);
              }
              else {
                logger.info('update email success');
                LogService.insertEmailLogs('UPDATE_EMAIL', 'SUCCESS', `${emailConfig.update_email.subject}`, { to: email, from: emailConfig.global.from }, name, { remark: remark });
              }
            }
          );
        }

      });
    }
  },

  async pdp_update_request(data: any) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending pdp_update_request email to users.');
      return;
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    try {
      if (data) {
        let templateDir = path.join('app/global/templates', 'emails', 'pdp-update-request-email');
        let createOder = new EmailTemplate(templateDir);
        createOder.render({ content: { ...data }, activate_url: `${commenHelper.feUrl(process.env.FE_URL)}` }, (err, result) => {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? data.to : formatInternalEmail(data.to),
              cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
              subject: `PDP Update Request raised by ${data.tse.name}(${data.tse.code})`,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.error("Couldn't send pdp_update_request email, due to error: ", err)
                LogService.insertEmailLogs('PDP_UPDATE_REQUEST', 'FAIL', `PDP Update Request raised by ${data.tse.name}(${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${err}`);
              }
              else {
                logger.info('pdp_update_request email sent successfully.')
                LogService.insertEmailLogs('PDP_UPDATE_REQUEST', 'SUCCESS', `PDP Update Request raised by ${data.tse.name}(${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status });
              }
            }
          );
        });
      }
    } catch (error) {
      logger.error("Error while sending pdp-update-request email -> ", error)
      LogService.insertEmailLogs('PDP_UPDATE_REQUEST', 'FAIL', `PDP Update Request raised by ${data.tse.name}(${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${error}`);
    }
  },

  async pdp_auto_update_request(data: any) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending pdp_auto_update_request email to users.');
      return;
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    try {
      if (data) {
        let templateDir = path.join('app/global/templates', 'emails', 'pdp-update-auto-approved');
        let createOder = new EmailTemplate(templateDir);
        createOder.render({ content: { ...data }, activate_url: `${commenHelper.feUrl(process.env.FE_URL)}` }, (err, result) => {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? data.to : formatInternalEmail(data.to),
              cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
              subject: `Response to PDP update request raised by  ${data.tse.name}(${data.tse.code})`,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.error("Couldn't send pdp_update_request email, due to error: ", err);
                LogService.insertEmailLogs('PDP_AUTO_UPDATE_REQUEST', 'FAIL', `Response to PDP update request raised by  ${data.tse.name}(${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${err}`);
              }
              else {
                logger.info('pdp_update_request email sent successfully.')
                LogService.insertEmailLogs('PDP_AUTO_UPDATE_REQUEST', 'SUCCESS', `Response to PDP update request raised by  ${data.tse.name}(${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status });
              }
            }
          );
        });
      }
    } catch (error) {
      logger.error("Error while sending pdp-update-request email -> ", error)
      LogService.insertEmailLogs('PDP_AUTO_UPDATE_REQUEST', 'FAIL', `Response to PDP update request raised by  ${data.tse.name}(${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${error}`);
    }
  },

  async pc_auto_update_request(data: any) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending pc_auto_update_request email to users.');
      return;
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    try {
      if (data) {
        let templateDir = path.join('app/global/templates', 'emails', 'pc-update-auto-approve');
        let createOder = new EmailTemplate(templateDir);
        createOder.render({ content: { ...data }, activate_url: `${commenHelper.feUrl(process.env.FE_URL)}` }, (err, result) => {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? data.to : formatInternalEmail(data.to),
              cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
              subject: `Response to Plant Code update request raised by ${data.tse.name}(${data.tse.code})`,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.error("Couldn't send pdp_update_request email, due to error: ", err);
                LogService.insertEmailLogs('PLANT_CODE_AUTO_UPDATE_REQUEST', 'FAIL', `Response to Plant Code update request raised by ${data.tse.name}(${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${err}`);
              }
              else {
                logger.info('pdp_update_request email sent successfully.')
                LogService.insertEmailLogs('PLANT_CODE_AUTO_UPDATE_REQUEST', 'SUCCESS', `Response to Plant Code update request raised by ${data.tse.name}(${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status });
              }
            }
          );
        });
      }
    } catch (error) {
      logger.error("Error while sending pdp-update-request email -> ", error)
      LogService.insertEmailLogs('PLANT_CODE_AUTO_UPDATE_REQUEST', 'FAIL', `Response to Plant Code update request raised by ${data.tse.name}(${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${error}`);
    }
  },
  async pc_update_request(data: any) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending pc_update_request email to users.');
      return;
    }
    try {
      if (data) {
        let templateDir = path.join('app/global/templates', 'emails', 'pc-update-request-email');
        let createOder = new EmailTemplate(templateDir);
        createOder.render({ content: { ...data }, activate_url: `${commenHelper.feUrl(process.env.FE_URL)}` }, (err, result) => {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? data.to : formatInternalEmail(data.to),
              cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
              subject: `Plant Code Update Request raised by ${data.tse.name} (${data.tse.code})`,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.error("Couldn't send pc_update_request email, due to error: ", err);
                LogService.insertEmailLogs('PLANT_UPDATE_REQUEST', 'FAIL', `Plant Code Update Request raised by ${data.tse.name} (${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${err}`);
              }
              else {
                logger.info('pc_update_request email sent successfully.')
                LogService.insertEmailLogs('PLANT_UPDATE_REQUEST', 'SUCCESS', `Plant Code Update Request raised by ${data.tse.name} (${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status });
              }
            }
          );
        });
      }
    } catch (error) {
      logger.error("Error while sending pc-update-request email -> ", error)
      LogService.insertEmailLogs('PLANT_UPDATE_REQUEST', 'FAIL', `Plant Code Update Request raised by ${data.tse.name} (${data.tse.code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${error}`);
    }
  },

  async pc_update_response(data: any) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending pc_update_response email to users.');
      return;
    }
    try {
      if (data) {
        let templateDir = path.join('app/global/templates', 'emails', 'pc-update-response-email');
        let createOder = new EmailTemplate(templateDir);
        createOder.render({ content: { ...data }, activate_url: `${commenHelper.feUrl(process.env.FE_URL)}` }, (err, result) => {
          transport.sendMail(
            {
              from: data.from,
              to: isProduction() ? data.to : formatInternalEmail(data.to),
              cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
              subject: `Response to Plant Code Update Request raised by ${data.tse_name} (${data.tse_code})`,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.error("Couldn't send pc_update_response email, due to error: ", err);
                LogService.insertEmailLogs('PLANT_UPDATE_RESPONSE', 'FAIL', `Response to Plant Code Update Request raised by ${data.tse_name} (${data.tse_code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${err}`);
              }
              else {
                logger.info('pc_update_response email sent successfully.')
                LogService.insertEmailLogs('PLANT_UPDATE_RESPONSE', 'SUCCESS', `Response to Plant Code Update Request raised by ${data.tse_name} (${data.tse_code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status });
              }
            }
          );
        });
      }
    } catch (error) {
      logger.error("Error while sending pc-update-response email -> ", error)
      LogService.insertEmailLogs('PLANT_UPDATE_RESPONSE', 'FAIL', `Response to Plant Code Update Request raised by ${data.tse_name} (${data.tse_code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${error}`);
    }
  },

  async pdp_update_response(data: any) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending pdp_update_response email to users.');
      return;
    }
    try {
      if (data) {
        let templateDir = path.join('app/global/templates', 'emails', 'pdp-update-response-email');
        let createOder = new EmailTemplate(templateDir);
        createOder.render({ content: { ...data }, activate_url: `${commenHelper.feUrl(process.env.FE_URL)}` }, (err, result) => {
          transport.sendMail(
            {
              from: data.from,
              to: isProduction() ? data.to : formatInternalEmail(data.to),
              cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
              subject: `Response to PDP Update Request raised by ${data.tse_name} (${data.tse_code})`,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.error("Couldn't send pdp_update_response email, due to error: ", err);
                LogService.insertEmailLogs('PDP_UPDATE_RESPONSE', 'FAIL', `Response to PDP Update Request raised by ${data.tse_name} (${data.tse_code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${err}`);
              }
              else {
                logger.info('pdp_update_response email sent successfully.')
                LogService.insertEmailLogs('PDP_UPDATE_RESPONSE', 'SUCCESS', `Response to PDP Update Request raised by ${data.tse_name} (${data.tse_code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status });
              }
            }
          );
        });
      }
    } catch (error) {
      logger.error("Error while sending pdp-update-response email -> ", error)
      LogService.insertEmailLogs('PDP_UPDATE_RESPONSE', 'FAIL', `Response to PDP Update Request raised by ${data.tse_name} (${data.tse_code})`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data?.db, { status: data?.status }, `${error}`);
    }
  },
  dbSyncFailed(data: any) {
    let templateDir = path.join('app/global/templates', 'emails', 'db-sync-failed');
    let dbSyncEmail = new EmailTemplate(templateDir);
    dbSyncEmail.render({ content: { ...data }, activate_url: `${commenHelper.feUrl(process.env.FE_URL)}` }, (err, result) => {
      transport.sendMail(
        {
          from: emailConfig.global.from,
          to: isProduction() ? data.email : formatInternalEmail(data.email),
          cc: isProduction() ? '' : '',
          subject: `DB Sync Failed issue notification`,
          html: result.html,
        }, (err, info) => {
          if (err) {
            logger.error("Couldn't send DB Sync Failed issued notification, due to error: ", err);
            LogService.insertEmailLogs('DB_SYNC_FAILED', 'FAIL', `DB Sync Failed issue notification`, { to: data.email, from: emailConfig.global.from }, data.email, { type: data?.type }, `${err}`);
          }
          else {
            logger.info('DB Sync Failed issued notification email sent successfully.')
            LogService.insertEmailLogs('DB_SYNC_FAILED', 'SUCCESS', `DB Sync Failed issue notification`, { to: data.email, from: emailConfig.global.from }, data.email, { type: data?.type });
          }
        }
      );
    })
  },
  async mdm_notification(email: string, customer_name) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending mdm_notification email to users.');
      return;
    }
    let templateDir = path.join('app/global/templates', 'emails', 'mdm-notification');
    let notificationEmail = new EmailTemplate(templateDir);
    try {
      const result = await new Promise((resolve, reject) => {
        notificationEmail.render({ activate_url: `${commenHelper.feUrl(process.env.FE_URL)}` }, (err: any, result: { html: any; }) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      if (result) {
        try {
          await new Promise((resolve, reject) => {
            transport.sendMail(
              {
                from: emailConfig.global.from,
                to: isProduction() ? email : formatInternalEmail(email),
                cc: process.env.MDM_EMAIL_DL,
                subject: `Article Code/Description are not mapped for ${customer_name}`,
                html: result['html'],
              }, (err: any, info: any) => {
                if (err) {
                  reject(err)
                }
                else {
                  resolve(true)
                }
              }
            )
          });
          LogService.insertEmailLogs('MDM_NOTIFICATION', 'SUCCESS', `Article Code/Description are not mapped for ${customer_name}`, { to: email, cc: process.env.MDM_EMAIL_DL, from: emailConfig.global.from }, email, { customerName: customer_name });
          return true; // Email sent successfully
        } catch (error) {
          LogService.insertEmailLogs('MDM_NOTIFICATION', 'FAIL', `Article Code/Description are not mapped for ${customer_name}`, { to: email, cc: process.env.MDM_EMAIL_DL, from: emailConfig.global.from }, email, { customerName: customer_name }, `${error}`);
          logger.error(`Error in Email -> mdmNotification -> sendMail `, error);
          return false; // Error occurred while sending email
        }
      }
    } catch (error) {
      LogService.insertEmailLogs('MDM_NOTIFICATION', 'FAIL', `Article Code/Description are not mapped for ${customer_name}`, { to: email, cc: process.env.MDM_EMAIL_DL, from: emailConfig.global.from }, email, { customerName: customer_name }, `${error}`);
      logger.error(`Error in Email -> surveyNotification -> render`, error);
      return false; // Error occurred while rendering email
    }
  },
  async credit_crunch_notification(data: any): Promise<boolean> {
    try {
      const isEnabled = await isCreditCrunchEmailEnabled();
      if (!isEnabled) {
        logger.info('Credit Crunch email is disabled, so not sending credit_crunch_notification email to users.');
        return false;
      }
      if (data) {
        let isSent: boolean = true;
        let templateDir = path.join('app/global/templates', 'emails', 'credit-crunch-notification');
        let createOder = new EmailTemplate(templateDir);
        await createOder.render({ content: { ...data }, activate_url: process.env.FE_URL }, (err, result) => {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? data.email.join(',') : formatInternalEmail(data.email.join(',')),
              subject: `Sales Order Stock Allocation`,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.error("Couldn't send credit_crunch_notification email, due to error: ", err);
                LogService.insertEmailLogs('CREDIT_CRUNCH_NOTIFICATION', 'FAIL', `Sales Order Stock Allocation`, { to: data.email, from: emailConfig.global.from }, data.distributorId, { poNumber: data.po_number }, `${err}`);
                isSent = false;
              } else {
                logger.info('credit_crunch_notification email sent successfully.');
                LogService.insertEmailLogs('CREDIT_CRUNCH_NOTIFICATION', 'SUCCESS', `Sales Order Stock Allocation`, { to: data.email, from: emailConfig.global.from }, data.distributorId, { poNumber: data.po_number });
              }
            }
          );
        });
        return isSent;
      }
      return false;
    } catch (error) {
      logger.error("Error while sending credit_crunch_notification email -> ", error);
      return false;
    }
  },

  async reserved_credit_notification(
    data: {
      to: string | string[],
      cc: string | string[],
      db_name: string,
      db_code: string,
      reserved_amount: string | number,
      reserved_date: string,
    }) {
    try {
      if (data) {
        let isSent: boolean = true;
        const to = [data.to, mailConfig.reportPortalErrorMailIds]
        let templateDir = path.join('app/global/templates', 'emails', 'reserved-credit-submit-notification');
        let reservedCreditNotification = new EmailTemplate(templateDir);
        await reservedCreditNotification.render({ content: { ...data }, activate_url: `${commenHelper.feUrl("")}` }, (err, result) => {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? to : formatInternalEmail(to),
              cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
              subject: `Credit Reserved for Capital Foods`,
              html: result.html,
            }, (err, info) => {
              if (err) {
                logger.error("Couldn't send reserved_credit_notification email, due to error: ", err);
                LogService.insertEmailLogs('RESERVED_CREDIT_NOTIFICATION', 'FAIL', `Credit Reserved for Capital Foods`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data.db_code, { reservedAmount: data.reserved_amount }, `${err}`);
                isSent = false;
              } else {
                logger.info('reserved_credit_notification email sent successfully.');
                LogService.insertEmailLogs('RESERVED_CREDIT_NOTIFICATION', 'SUCCESS', `Credit Reserved for Capital Foods`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data.db_code, { reservedAmount: data.reserved_amount });
              }
            }
          );
        });
        return isSent;
      }
      return false;
    } catch (error) {
      logger.error("Error while sending reserved_credit_notification email -> ", error);
      LogService.insertEmailLogs('RESERVED_CREDIT_NOTIFICATION', 'FAIL', `Credit Reserved for Capital Foods`, { to: data.to, cc: data.cc, from: emailConfig.global.from }, data.db_code, { reservedAmount: data.reserved_amount }, `${error}`);
      return false;
    }
  },
};
export default Email;