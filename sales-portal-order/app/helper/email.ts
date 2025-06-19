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
import { AdminModel } from '../models/admin.model';
import { utilModel } from '../models/utilModel';
import { UserService } from '../service/user.service';
import {LogService} from '../service/LogService';
import { ServiceDeliveryRequestModel } from '../models/serviceDeliveryRequestModel';
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
  async welcome(user: { email: any; uuid: any; }) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending welcome email to users.');
      return;
    }
    if (user.email) {
      let templateDir = path.join(
        'app/global/templates',
        'emails',
        'welcome-email',
      );
      let welcomeEmail = new EmailTemplate(templateDir);

      welcomeEmail.render(
        {
          user: user,
          activate_url: `${url.API}/auth/activate/${user.uuid}`,
        },
        (err: any, result: { html: any; }) => {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? user.email : formatInternalEmail(user.email),
              subject: emailConfig.welcome.subject,
              html: result.html,
            },
            (err: any, info: any) => {
              // some error occoured...
              if (err) {
                LogService.insertEmailLogs(
                  'WELCOME_ORDER',
                  'FAIL',
                  emailConfig.welcome.subject,
                  {
                    to: user.email,
                    from: emailConfig.global.from
                  },
                  user.email,
                  user,
                  err
                );
              } else {
                LogService.insertEmailLogs(
                  'WELCOME_ORDER',
                  'SUCCESS',
                  emailConfig.welcome.subject,
                  {
                    to: user.email,
                    from: emailConfig.global.from
                  },
                  user.email,
                  user
                );
              }
            },
          );
        },
      );
    }
  },

  async sdr_created(user: { email: any; }, otpData: { cfa_email: any; admin_details: { email: any; tse: Array<{ email: any; }>; asm: Array<{ email: any; }>; }; zone_manager_emails: any; sd_number: any; distributor_name: any; distributor_id: any; }) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending sdr_created email to users.');
      return;
    }
    try {
      if (user.email) {
        let templateDir = path.join(
          'app/global/templates',
          'emails',
          'sdr-created-email',
        );
        const tseEmailsArray: string[] = []
        otpData?.admin_details?.tse?.forEach(element => tseEmailsArray.push(element?.email));
        const tseEmails = tseEmailsArray?.join(',');
        const asmEmailArray: string[] = [];
        otpData?.admin_details?.asm?.forEach(element => tseEmailsArray.push(element?.email));
        const asmEmails = asmEmailArray?.join(',');


        let sdrOrder = new EmailTemplate(templateDir);
        sdrOrder.render({ user: otpData, otpData, url: url.FE }, (err: any, result: { html: any; }) => {
          transport.sendMail(
            {
              from: emailConfig.global.from,
              to: isProduction() ? `${otpData.cfa_email}` : formatInternalEmail(otpData.cfa_email),
              cc: isProduction() ? [
                `${otpData.admin_details.email}`,
                tseEmails ? `${tseEmails}` : ``,
                asmEmails ? `${asmEmails}` : ``,
                `${otpData.zone_manager_emails}`
              ] : formatInternalEmail([
                `${otpData.admin_details.email}`,
                tseEmails ? `${tseEmails}` : ``,
                asmEmails ? `${asmEmails}` : ``,
                `${otpData.zone_manager_emails}`
              ]),
              subject: `${otpData.sd_number} ${emailConfig.sd_request_email.subject}  ${otpData.distributor_name} (${otpData.distributor_id})`,
              html: result.html,
            },
            (err: any, info: any) => {
              if (err) {
                logger.error(`${otpData.sd_number} - Sent mail SDR creation error: `, err);
                LogService.insertEmailLogs(
                  'SDR_REQUEST',
                  'FAIL',
                  `${otpData.sd_number} ${emailConfig.sd_request_email.subject}  ${otpData.distributor_name}(${otpData.distributor_id})`,
                  {
                    to: `${otpData.cfa_email}`,
                    cc: [
                      `${otpData.admin_details.email}`,
                      tseEmails ? `${tseEmails}` : ``,
                      asmEmails ? `${asmEmails}` : ``,
                      `${otpData.zone_manager_emails}`
                    ],
                    from: emailConfig.global.from
                  },
                  otpData.sd_number,
                  otpData,
                  err
                )
              }
              else {
                logger.info(`${otpData.sd_number} - Sent mail on SDR creation!`);
                LogService.insertEmailLogs(
                  'SDR_REQUEST',
                  'SUCCESS',
                  `${otpData.sd_number} ${emailConfig.sd_request_email.subject}  ${otpData.distributor_name}(${otpData.distributor_id})`,
                  {
                    to: `${otpData.cfa_email}`,
                    cc: [
                      `${otpData.admin_details.email}`,
                      tseEmails ? `${tseEmails}` : ``,
                      asmEmails ? `${asmEmails}` : ``,
                      `${otpData.zone_manager_emails}`
                    ],
                    from: emailConfig.global.from
                  },
                  otpData.sd_number,
                  otpData
                )
              }
            },
          );
        });
      }
    } catch (error) {
      logger.error('Error in email.ts-> Email-> sdr_created', error);
      LogService.insertEmailLogs(
        'SDR_REQUEST',
        'FAIL',
        `${otpData.sd_number} ${emailConfig.sd_request_email.subject}  ${otpData.distributor_name}(${otpData.distributor_id})`,
        {
          to: `${otpData.cfa_email}`,
          cc: [
            `${otpData.admin_details.email}`,
            `${otpData.zone_manager_emails}`
          ],
          from: emailConfig.global.from
        },
        otpData.sd_number,
        otpData,
        error
      )
    }
  },

  async cfa_response(user: { email: any; }, otpData: { responder_email: any; admin_details: { email: any; tse: Array<{ email: any; }>; asm: Array<{ email: any; }>; }; zone_manager_emails: any; sd_number: any; distributor_name: any; distributor_id: any; }) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending cfa_response email to users.');
      return;
    }
    try {
      if (user.email) {
        let templateDir = path.join(
          'app/global/templates',
          'emails',
          'cfa-response-email',
        );

        const tseEmailsArray: string[] = []
        otpData?.admin_details?.tse?.forEach(element => tseEmailsArray.push(element?.email));
        const tseEmails = tseEmailsArray?.join(',');
        const asmEmailArray: string[] = [];
        otpData?.admin_details?.asm?.forEach(element => tseEmailsArray.push(element?.email));
        const asmEmails = asmEmailArray?.join(',');

        let cfaResponse = new EmailTemplate(templateDir);
        cfaResponse.render(
          { user: otpData, otpData, url: url.FE },
          (err: any, result: { html: any; }) => {
            transport.sendMail(
              {
                from: `${otpData.responder_email}`,
                to: isProduction() ? [
                  `${otpData.admin_details.email}`,
                  tseEmails ? `${tseEmails}` : ``,
                ] : formatInternalEmail([
                  `${otpData.admin_details.email}`,
                  tseEmails ? `${tseEmails}` : ``,
                ]),
                cc: isProduction() ? [
                  asmEmails ? `${asmEmails}` : ``,
                  `${otpData.zone_manager_emails}`
                ] : formatInternalEmail([
                  asmEmails ? `${asmEmails}` : ``,
                  `${otpData.zone_manager_emails}`
                ]),
                subject: `${otpData.sd_number} ${emailConfig.cfa_response_email.subject} ${otpData.distributor_name} (${otpData.distributor_id})`,
                html: result.html,
              },
              (err: any, info: any) => {
                if (err) { 
                  logger.error(`${otpData.sd_number} - Sent mail CFA response error: `, err);
                  LogService.insertEmailLogs(
                    'SDR_RESPONSE',
                    'FAIL',
                    `${otpData.sd_number} ${emailConfig.cfa_response_email.subject} ${otpData.distributor_name} (${otpData.distributor_id})`,
                    {
                      to: [
                        `${otpData.admin_details.email}`,
                        tseEmails ? `${tseEmails}` : ``,
                      ],
                      cc: [
                        asmEmails ? `${asmEmails}` : ``,
                        `${otpData.zone_manager_emails}`
                      ],
                      from: `${otpData.responder_email}`
                    },
                    otpData.sd_number,
                    otpData,
                    err
                  );
                }
                else {
                  logger.info(`${otpData.sd_number} - Sent mail on CFA response !`);
                  LogService.insertEmailLogs(
                    'SDR_RESPONSE',
                    'SUCCESS',
                    `${otpData.sd_number} ${emailConfig.cfa_response_email.subject} ${otpData.distributor_name} (${otpData.distributor_id})`,
                    {
                      to: [
                        `${otpData.admin_details.email}`,
                        tseEmails ? `${tseEmails}` : ``,
                      ],
                      cc: [
                        asmEmails ? `${asmEmails}` : ``,
                        `${otpData.zone_manager_emails}`
                      ],
                      from: `${otpData.responder_email}`
                    },
                    otpData.sd_number,
                    otpData
                  );
                }
              },
            );
          },
        );
      }
    } catch (error) {
      logger.error(
        'Error in email.ts-> Email-> cfa_response_created',
        error,
      );
      LogService.insertEmailLogs(
        'SDR_RESPONSE',
        'FAIL',
        `${otpData.sd_number} ${emailConfig.cfa_response_email.subject} ${otpData.distributor_name} (${otpData.distributor_id})`,
        {
          to: [
            `${otpData.admin_details.email}`,
          ],
          cc: [
            `${otpData.zone_manager_emails}`
          ],
          from: `${otpData.responder_email}`
        },
        otpData.sd_number,
        otpData,
        error
      );
    }
  },
  
  async rushOrderResponseNotification(data:any) {
    const cc:string[] = [...data.tse_email, ...data.asm_email, ...data.rsm_email, ...data.cluster_email];
    let response_email_data = { to: data.db_email || 'noreply.pegasus@tataconsumer.com', 
                                cc: cc, 
                                db_name: data.db_name, 
                                amount: data.amount, 
                                db_code: data.db_code, 
                                upcoming_pdp_date: data.upcoming_pdp_date,
                                req_date: data.req_date,
                                po_number: data.po_number, 
                                status: data.status,
                                approver_name: data.approver_name,
                              };

    try {
      if (data) {
        let templateDir = path.join(
          'app/global/templates',
          'emails',
          'rush-order-response',
        );
        let email_template = new EmailTemplate(templateDir);
        email_template.render({ content: { ...response_email_data }, activate_url: `${Helper.feUrl()}` }, (err, result) => {
          if (!err) {
            transport.sendMail(
              {
                from: emailConfig.global.from,
                to: isProduction() ? response_email_data.to : formatInternalEmail(response_email_data.to),
                cc: isProduction() ? response_email_data.cc : formatInternalEmail(response_email_data.cc),
                subject: `Rush Order requsest for po_number: ${response_email_data.po_number} has been ${response_email_data.status}`,
                html: result.html,
              }, (err, info) => {
                if (err) {
                  logger.error(`Couldn't send Rush Order response email to '${data.to}' , cc '${data.cc}', due to error: `, err);
                  LogService.insertEmailLogs(
                    'RO_RESPONSE',
                    'FAIL',
                    `Rush Order requsest for po_number: ${response_email_data.po_number} has been ${response_email_data.status}`,
                    {
                      to: data.to,
                      cc: data.cc,
                      from: emailConfig.global.from
                    },
                    response_email_data.po_number,
                    data,
                    err
                  );
                }
                else {
                  logger.info(`Rush Order response email  sent successfully.`); 
                  LogService.insertEmailLogs(
                    'RO_RESPONSE',
                    'SUCCESS',
                    `Rush Order request for po_number: ${response_email_data.po_number} has been ${response_email_data.status}`,
                    {
                      to: data.to,
                      cc: data.cc,
                      from: emailConfig.global.from
                    },
                    response_email_data.po_number,
                    data
                  );
                }
              }
            );
          } else {
            logger.error('Inside Email -> rushOrderResponseNotification, Error: ', err);
            LogService.insertEmailLogs(
              'RO_RESPONSE',
              'FAIL',
              `Rush Order request for po_number: ${response_email_data.po_number} has been ${response_email_data.status}`,
              {
                to: data.to,
                cc: data.cc,
                from: emailConfig.global.from
              },
              response_email_data.po_number,
              data,
              err
            );
          }
        });
      }
    } catch (error) {
      logger.error("Inside Email -> rushOrderResponseNotification, Error: ", error);
      LogService.insertEmailLogs(
        'RO_RESPONSE',
        'FAIL',
        `Rush Order request for po_number: ${response_email_data.po_number} has been ${response_email_data.status}`,
        {
          to: data.to,
          cc: data.cc,
          from: emailConfig.global.from
        },
        response_email_data.po_number,
        data,
        error
      );
    }

  },

  async rushOrderNotification(
    data: {
      db_name: string,
      db_code: string,
      req_date: string,
      po_number: string,
      amount: string,
      upcoming_pdp_date: string,
      approver: {first_name: string, last_name: string, email: string},
      message: string,
      location: string,
      rsm: string,
      reason: string,
      comments: string,
      created_by: string | null | undefined ,
    }) {
      let email_data: {
        to: any[],
        cc: any[],
        db_name: string,
        amount: string,
        db_code: string,
        upcoming_pdp_date: string,
        req_date: string,
        po_number: string,
        approver_name: string,
        message: string,
        location: string,
        rsm: string,
        reason: string,
        comments: string,
      } = {
        to: [],
        cc: [],
        db_name: '',
        amount: '',
        db_code: '',
        upcoming_pdp_date: '',
        req_date: '',
        po_number: '',
        approver_name: '',
        message: '',
        location: '',
        rsm: '',
        reason: '',
        comments: '',
      };

    try {
      if (!data?.approver) {
        logger.error("Error inside Email -> rushOrderNotification: No email id found for approver head. Email 'to' is empty", email_data)
        return;
      }
      email_data.amount = data?.amount;
      email_data.db_name = data?.db_name;
      email_data.db_code = data?.db_code;
      email_data.upcoming_pdp_date = data?.upcoming_pdp_date;
      email_data.req_date = data?.req_date;
      email_data.po_number = data?.po_number;
      email_data.approver_name = `${data.approver.first_name} ${data.approver.last_name}`;
      email_data.to = [data.approver.email];
      email_data.message = data.message;
      email_data.location = data.location;
      email_data.rsm = data.rsm;
      email_data.reason = data.reason;
      email_data.comments = data.comments;
      if (data) {
        let templateDir = path.join(
          'app/global/templates',
          'emails',
          'rush-order-request-status',
        );
        let email_template = new EmailTemplate(templateDir);
        const encryptedPo = Helper.encryptData(data?.po_number).replaceAll('/', '*').replaceAll('+','-');
        const encryptedDbCode = Helper.encryptData(data?.db_code).replaceAll('/', '*').replaceAll('+','-');
        let ro_url = `${Helper.feUrl()}/redirect?path=admin*rush-order-details&po_num=${data?.po_number}&dist_id=${data?.db_code}`;
        let ro_approve = `${Helper.feUrl()}/redirect?path=admin*rush-order-details&po_num=${encryptedPo}&dist_id=${encryptedDbCode}&action=approve`;
        let ro_reject = `${Helper.feUrl()}/redirect?path=admin*rush-order-details&po_num=${encryptedPo}&dist_id=${encryptedDbCode}&action=reject`;
        email_template.render({ content: { ...email_data }, ro_url, ro_reject, ro_approve }, (err, result) => {
         
          if (!err) {
            transport.sendMail(
              {
                from: emailConfig.global.from,
                to: isProduction() ? email_data.to : formatInternalEmail(email_data.to),
                cc: [],
                bcc: ['pegasus-testing@tataconsumer.com'],
                subject: `Rush Order Notification for ${email_data.db_name}`,
                html: result.html,
              }, (err, info) => {
                if (err) {
                  logger.error(`Couldn't send rushOrderNotification email to '${email_data.to}' , cc '${email_data.cc}', due to error: `, err);
                  LogService.insertEmailLogs(
                    'RO_REQUEST',
                    'FAIL',
                    `Rush Order Notification for ${email_data.db_name}`,
                    {
                      to: email_data.to,
                      cc: email_data.cc,
                      from: emailConfig.global.from
                    },
                    email_data.db_code,
                    data,
                    err
                  );
                }
                else {
                  logger.info(`rushOrderNotification email  sent successfully.`)
                  LogService.insertEmailLogs(
                    'RO_REQUEST',
                    'SUCCESS',
                    `Rush Order Notification for ${email_data.db_name}`,
                    {
                      to: email_data.to,
                      cc: email_data.cc,
                      from: emailConfig.global.from
                    },
                    email_data.db_code,
                    data,
                    '',
                    data.created_by
                  );
                }
              }
            );
          } else {
            logger.error('Inside Email -> rushOrderNotification, Error: ', err);
            LogService.insertEmailLogs(
              'RO_REQUEST',
              'FAIL',
              `Rush Order Notification for ${email_data.db_name}`,
              {
                to: email_data.to,
                cc: email_data.cc,
                from: emailConfig.global.from
              },
              email_data.db_code,
              data,
              err
            );
          }
        });
      }
    } catch (error) {
      logger.error("Error while sending rushOrderNotification email , Error: ", error)
      LogService.insertEmailLogs(
        'RO_REQUEST',
        'FAIL',
        `Rush Order Notification for ${email_data.db_name}`,
        {
          to: email_data.to,
          cc: email_data.cc,
          from: emailConfig.global.from
        },
        email_data.db_code,
        data,
        error
      );
    }

  },
  async sdReportByRegion(
    region: string,
    fileDetails: {
      filePath: string;
      fileName: string;
    } | null,
    summary:
      | {
        region: string;
        openTickets: number;
        raisedTickets: number;
        respondedTickets: number;
      }[]
      | null,
    toEmails: string,
    ccEmails: string,
  ) {
    const excludedRegions = [
      'West Region',
      'East Region',
      'South Region',
      'North Region',
      'Center Region',
      'Instant coffee',
      'Others',
    ];

    if (excludedRegions.includes(region)) {
      logger.info(`Skipping email for region: ${region}`);
      return null;
    }
    try {
      let templateDir = path.join(
        'app/global/templates',
        'emails',
        'sd-report',
      );
      const today = new Date();
      today.setDate(today.getDate() - 1);
      let yesterday = today.toLocaleDateString('en-GB');

      let subject = `SD report for ${region} - ${yesterday}`;
      subject =
        process.env.NODE_ENV != 'prod'
          ? `(${process.env.NODE_ENV})${subject}`
          : subject;

      let emailConfiguration = {
        from: emailConfig.global.from,
        to: isProduction() ? toEmails : formatInternalEmail(toEmails),
        cc: isProduction() ? ccEmails : formatInternalEmail(ccEmails),
        subject: subject,
      };

      if (fileDetails) {
        Object.assign(emailConfiguration, {
          attachments: [
            {
              filename: fileDetails?.fileName,
              path: fileDetails?.filePath,
            },
          ],
        });
      }

      let sdReportEmail = new EmailTemplate(templateDir);
      sdReportEmail.render(
        {
          data: {
            yesterday: yesterday,
            sdData: fileDetails ? true : false,
            summary,
          },
          url: url.FE,
        },
        (err: any, result: { html: any }) => {
          if (!err) {
            transport.sendMail(
              {
                ...emailConfiguration,
                html: result?.html,
              },
              (err: any, info: any) => {
                if (err) {
                  logger.error('Could not send sd-report email', err);
                  LogService.insertEmailLogs(
                    'SD_REPORT',
                    'FAIL',
                    subject,
                    {
                      to: toEmails,
                      cc: ccEmails,
                      from: emailConfig.global.from,
                    },
                    'SD report email',
                    {
                      yesterday: yesterday,
                      sdData: fileDetails ? true : false,
                    },
                    err,
                  );
                } else {
                  logger.info('SD report email sent successfully');
                  LogService.insertEmailLogs(
                    'SD_REPORT',
                    'SUCCESS',
                    subject,
                    {
                      to: toEmails,
                      cc: ccEmails,
                      from: emailConfig.global.from,
                    },
                    'SD report email',
                    {
                      yesterday: yesterday,
                      sdData: fileDetails ? true : false,
                    },
                  );
                }
                /**delete the generated excel file */
                if (fileDetails) {
                  fs.unlink(fileDetails?.filePath, (err) => {
                    if (err) {
                      logger.error(
                        'Error in sdReport: removing Excel file:',
                        err,
                      );
                    } else {
                      logger.info(
                        'sdReport: Excel file removed successfully!',
                      );
                    }
                  });
                }
              },
            );
          } else {
            logger.error(
              'Error in email.ts, sdReportEmail.render: ',
              err,
            );
            LogService.insertEmailLogs(
              'SD_REPORT',
              'FAIL',
              subject,
              {
                to: toEmails,
                cc: ccEmails,
                from: emailConfig.global.from,
              },
              'SD report email',
              {
                yesterday: yesterday,
                sdData: fileDetails ? true : false,
              },
              err,
            );
          }
        },
      );
      return true;
    } catch (error) {
      logger.error('Error in email.ts-> Email-> sdReport', error);
      LogService.insertEmailLogs(
        'SD_REPORT',
        'FAIL',
        `SD report email  ${region}`,
        {
          to: '',
          cc: '',
          from: emailConfig.global.from,
        },
        'SD report email',
        { yesterday: '', sdData: false, env: '' },
        error,
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

  async nonExpiredRONotification(data) {
    const isEnabled = await isEmailEnabled();
    if (!isEnabled) {
      logger.info('Email is disabled, so not sending nonExpiredRONotification email to users.');
      return;
    }
    logger.info('inside Email -> nonExpiredRONotification');
    try {
      if (data) {
        let templateDir = path.join(
          'app/global/templates',
          'emails',
          'rush-order-non-expired',
        );
        let email_template = new EmailTemplate(templateDir);
        email_template.render({ content: { ...data }, activate_url: `${Helper.feUrl()}` }, (err, result) => {
          if (!err) {
            // console.log(result.html);
            transport.sendMail(
              {
                from: emailConfig.global.from,
                to: isProduction() ? data.to : formatInternalEmail(data.to),
                bcc: isProduction() ? 'pegasus-testing@tataconsumer.com' : '',
                subject: `Non-expired Rush Order requests report`,
                html: result.html,
              }, (err, info) => {
                if (err) {
                  logger.error(`Couldn't send non-expired Rush Order requests report email to '${data.to}' ', due to error: `, err);
                  LogService.insertEmailLogs(
                    'NONEXPIRED_RO_REQUESTS',
                    'FAIL',
                    `Non-expired RO requests report`,
                    {
                      to: data.to,
                      bcc: isProduction() ? 'pegasus-testing@tataconsumer.com' : '',
                      from: emailConfig.global.from
                    },
                    data.name,
                    data,
                    err
                  );
                }
                else {
                  logger.info(`Non-expired Rush Order requests report email  sent successfully.`)
                  LogService.insertEmailLogs(
                    'NONEXPIRED_RO_REQUESTS',
                    'SUCCESS',
                    `Non-expired RO requests report`,
                    {
                      to: data.to,
                      bcc: isProduction() ? 'pegasus-testing@tataconsumer.com' : '',
                      from: emailConfig.global.from
                    },
                    data.name,
                    data
                  );
                }
              }
            );
          } else {
            logger.error('Inside Email -> nonExpiredRONotification, Error: ', err);
            LogService.insertEmailLogs(
              'NONEXPIRED_RO_REQUESTS',
              'FAIL',
              `Non-expired RO requests report`,
              {
                to: data.to,
                bcc: isProduction() ? 'pegasus-testing@tataconsumer.com' : '',
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
      logger.error("Error while sending non-expired Rush Order requests report email , Error: ", error)
      LogService.insertEmailLogs(
        'NONEXPIRED_RO_REQUESTS',
        'FAIL',
        `Non-expired RO requests report`,
        {
          to: data.to,
          bcc: isProduction() ? 'pegasus-testing@tataconsumer.com' : '',
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
