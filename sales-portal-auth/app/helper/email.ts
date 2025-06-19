const path = require('path');
declare function require(name: string);
const nodemailer = require('nodemailer');
const url = global['configuration'].url;
const mailConfig = global['configuration'].email;
import emailConfig from '../config/email';
import { EmailTemplate } from 'email-templates';
import logger from '../lib/logger';
import commonHelper from '../helper';
const env = process.env.NODE_ENV;
let AWS = require('aws-sdk');
import { SURVEY_NOTIFICATION_EMAIL_TYPE } from '../constant';
import { AuthModel } from '../models/authModel';
import commmonHelper from './index';
import { LogService } from '../../../sales-portal-auth/app/service/LogService';

const globalEmailConfig = async () => {
    let DBEmailConfigFlag;
    try {
        DBEmailConfigFlag = mailConfig.enableEmail; //await AdminModel.getGlobalEmailConfig();
    } catch (error) {
        logger.error('CAUGHT: Error in Email -> globalEmailConfig: ', error);
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
            port: 587,
        });
    }

    return transport;
};

let transport;

globalEmailConfig().then((mailer) => {
    transport = mailer;
});

const isProduction = () => {
    return process.env.NODE_ENV === 'prod';
};

const formatInternalEmail = (actualEmail: string | string[], customEmail: string = 'pegasus-testing@tataconsumer.com') => {
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
};

const isEmailEnabled = async () => {
    return true;
    // const response:any[] = await AuthModel.fetchAppLevelSettings();
    // const isEnabled:boolean = (response)? response?.filter((item) => item.key === 'ENABLE_EMAIL_NOTIFICATION').map((item) => item.value.toUpperCase() === 'YES')[0] : false;
    // return isEnabled;
};

// create Nodemailer SES transporter
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
                if (result) {
                    transport.sendMail(
                        {
                            from: emailConfig.global.from,
                            to: user.email,
                            subject: emailConfig.welcome.subject,
                            html: result.html,
                        },
                        (err, info) => {
                            if (err) {
                                logger.error('Error sending welcome email:', err);
                                LogService.insertEmailLogs(
                                    'WELCOME_AUTH',
                                    'FAIL',
                                    emailConfig.welcome.subject,
                                    { to: user.email, from: emailConfig.global.from },
                                    user.email,
                                    null,
                                    err,
                                );
                            } else {
                                logger.info('Welcome email sent successfully.');
                                LogService.insertEmailLogs('WELCOME_AUTH', 'SUCCESS', emailConfig.welcome.subject, { to: user.email, from: emailConfig.global.from }, user.email);
                            }
                        },
                    );
                }
            });
        }
    },
    async password_reset(user, password) {
        const isEnabled = await isEmailEnabled();
        if (!isEnabled) {
            logger.info('Email is disabled, so not sending password_reset email to users.');
            return;
        }
        if (user.email) {
            let templateDir = path.join('app/global/templates', 'emails', 'password-reset-email');
            let passwordResetEmail = new EmailTemplate(templateDir);
            passwordResetEmail.render({ user: user, login_url: `${url.FE}/auth/login`, password: password }, (err, result) => {
                if (result) {
                    transport.sendMail(
                        {
                            from: emailConfig.global.from,
                            to: user.email,
                            subject: emailConfig.password_reset.subject,
                            html: result.html,
                        },
                        (err, info) => {
                            // some error occurred...
                        },
                    );
                }
            });
        }
        if (user.phone_verified) {
            // Twillo.password_reset_notification(user.phone);
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
            passwordResetEmail.render(
                {
                    name,
                    activate_url: `${commonHelper.feUrl(process.env.NODE_ENV)}/email-verify/${id}?remark=${remark}`,
                },
                (err, result) => {
                    if (result) {
                        transport.sendMail(
                            {
                                from: emailConfig.global.from,
                                to: email,
                                subject: emailConfig.update_email.subject,
                                html: result.html,
                            },
                            (err, info) => {
                                if (err) logger.info('update email error: ', err);
                                else logger.info('update email success');
                            },
                        );
                    }
                },
            );
        }
    },
    async send_email_tse_admin_update_email_mobile(email, distributorId, emailId, phoneNumber, updatedBy: { first_name: string; last_name: string; email: string } | null = null) {
        const isEnabled = await isEmailEnabled();
        if (!isEnabled) {
            logger.info('Email is disabled, so not sending send_email_tse_admin_update_email_mobile email to users.');
            return;
        }
        if (email) {
            let templateDir = path.join('app/global/templates', 'emails', updatedBy ? 'tse-asm-update-email-mobile-by-admin' : 'tse-admin-update-email-mobile');
            let contactDetailsUpdatedEmail = new EmailTemplate(templateDir);

            contactDetailsUpdatedEmail.render(
                updatedBy
                    ? {
                          distributorId,
                          emailId,
                          phoneNumber,
                          admin_name: (updatedBy.first_name ? updatedBy.first_name : '') + ' ' + (updatedBy.last_name ? updatedBy.last_name : ''),
                          admin_email: updatedBy.email ? updatedBy.email : '',
                      }
                    : { distributorId, emailId, phoneNumber },
                (err, result) => {
                    if (result) {
                        transport.sendMail(
                            {
                                from: emailConfig.global.from,
                                to: email,
                                subject: emailConfig.distributor_contact_update.subject,
                                html: result.html,
                            },
                            (err, info) => {
                                if (err) logger.info('update email error: ', err);
                                else logger.info('update email success');
                            },
                        );
                    }
                },
            );
        }
    },
    async survey_notification(
        emailType: string,
        distributor: {
            db_id: string;
            db_email: string;
            db_name: string;
            survey_end_date: string;
        },
    ) {
        const isEnabled = await isEmailEnabled();
        if (!isEnabled) {
            logger.info('Email is disabled, so not sending survey_notification email to users.');
            return;
        }
        const isFollowUp = emailType === SURVEY_NOTIFICATION_EMAIL_TYPE.FOLLOW_UP;
        const emailTemplateFile = isFollowUp ? 'follow-up-notification' : 'initial-notification';
        let templateDir = path.join('app/global/templates', 'emails', 'survey-notification', emailTemplateFile);
        let notificationEmail = new EmailTemplate(templateDir);
        distributor.survey_end_date = `${commonHelper.formatDate(distributor.survey_end_date)} ${commonHelper.formatTime(distributor.survey_end_date)}`;

        try {
            const result = await new Promise((resolve, reject) => {
                notificationEmail.render({ ...distributor, url: commonHelper.feUrl('') }, (err: any, result: { html: any }) => {
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
                                to: isProduction() ? distributor.db_email : formatInternalEmail(distributor.db_email),
                                subject: isFollowUp ? 'Survey Notification Reminder' : 'Survey Notification',
                                html: result['html'],
                            },
                            (err: any, info: any) => {
                                if (err) {
                                    LogService.insertEmailLogs(
                                        'SURVEY_NOTIFICATION',
                                        'FAIL',
                                        isFollowUp ? 'Survey Notification Reminder' : 'Survey Notification',
                                        { to: distributor.db_email, from: emailConfig.global.from },
                                        distributor.db_id,
                                        null,
                                        err,
                                    );
                                    reject(err);
                                } else {
                                    LogService.insertEmailLogs(
                                        'SURVEY_NOTIFICATION',
                                        'SUCCESS',
                                        isFollowUp ? 'Survey Notification Reminder' : 'Survey Notification',
                                        { to: distributor.db_email, from: emailConfig.global.from },
                                        distributor.db_id,
                                    );
                                    resolve(true);
                                }
                            },
                        );
                    });
                    return true; // Email sent successfully
                } catch (error) {
                    logger.error(`Error in Email -> surveyNotification -> sendMail: DB: ${distributor.db_id}: `, error);
                    LogService.insertEmailLogs(
                        'SURVEY_NOTIFICATION',
                        'FAIL',
                        isFollowUp ? 'Survey Notification Reminder' : 'Survey Notification',
                        { to: distributor.db_email, from: emailConfig.global.from },
                        distributor.db_id,
                        null,
                        error,
                    );
                    return false; // Error occurred while sending email
                }
            }
        } catch (error) {
            logger.error(`Error in Email -> surveyNotification -> render: DB: ${distributor.db_id}: `, error);
            LogService.insertEmailLogs(
                'SURVEY_NOTIFICATION',
                'FAIL',
                isFollowUp ? 'Survey Notification Reminder' : 'Survey Notification',
                { to: distributor.db_email, from: emailConfig.global.from },
                distributor.db_id,
                null,
                error,
            );
            return false; // Error occurred while rendering email
        }
    },
    async sendPDPRequestEmail(pdpData: any, userDetails: any[]) {
        const isEnabled = await isEmailEnabled();
        if (!isEnabled) {
            logger.info('Email is disabled, so not sending PDP unlock email.');
            return;
        }

        let templateDir = path.join('app/global/templates', 'emails', 'pdp-unlock-request-email');
        let pdpUnlockEmailTemplate = new EmailTemplate(templateDir);
        let pdp_url = `${commmonHelper.feUrl('')}`;
        const encoded_req_id = commonHelper.encrypt(pdpData.request_id).replaceAll('/', '*').replaceAll('+', '-');
        let pdp_approve = `${commmonHelper.feUrl(process.env.NODE_ENV)}/redirect?path=admin*pdp-unlock-requests&id=${encoded_req_id}&action=approve`;
        let pdp_reject = `${commmonHelper.feUrl(process.env.NODE_ENV)}/redirect?path=admin*pdp-unlock-requests&id=${encoded_req_id}&action=reject`;

        userDetails.forEach((recipient: any) => {
            let personalizedPdpData = { ...pdpData };
            personalizedPdpData['name'] = recipient.first_name + ' ' + recipient.last_name;
            pdpUnlockEmailTemplate.render({ pdpData: personalizedPdpData, pdp_url, pdp_approve, pdp_reject }, (err: any, result: any) => {
                if (result) {
                    const recipients = isProduction() ? recipient.email : formatInternalEmail(recipient.email);
                    transport.sendMail(
                        {
                            from: emailConfig.global.from,
                            to: recipients,
                            subject: 'PDP Unlock Request',
                            html: result.html,
                        },
                        (err: any, info: any) => {
                            if (err) {
                                logger.error('Error sending PDP unlock email:', err);
                                LogService.insertEmailLogs(
                                    'PDP_UNLOCK_REQUEST',
                                    'FAIL',
                                    'PDP Unlock Request',
                                    { to: recipients, from: emailConfig.global.from },
                                    pdpData.request_id,
                                    null,
                                    err,
                                );
                            } else {
                                logger.info('PDP unlock request email sent successfully.');
                                LogService.insertEmailLogs(
                                    'PDP_UNLOCK_REQUEST',
                                    'SUCCESS',
                                    'PDP Unlock Request',
                                    { to: recipients, from: emailConfig.global.from },
                                    pdpData.request_id,
                                );
                            }
                        },
                    );
                } else {
                    logger.error('Error rendering PDP unlock email template:', err);
                    LogService.insertEmailLogs(
                        'PDP_UNLOCK_REQUEST',
                        'FAIL',
                        'PDP Unlock Request',
                        { to: recipient.email, from: emailConfig.global.from },
                        pdpData.request_id,
                        null,
                        err,
                    );
                }
            });
        });
    },

    async sendPdpUnlockStatusEmail(
        areaRegionCode: string,
        requestDate: string,
        pdpStartDate: string,
        pdpEndDate: string,
        status: string | undefined,
        userName: string,
        recipientArr: string[],
        requestId: string,
    ) {
        const isEnabled = await isEmailEnabled();
        if (!isEnabled) {
            logger.info('Email is disabled, so not sending PDP unlock email.');
            return null;
        }
        let templateDir = path.join('app/global/templates', 'emails', 'pdp-request-status-email');
        let pdpUnlockEmailTemplate = new EmailTemplate(templateDir);
        requestDate = commonHelper.formatDate(requestDate);
        pdpStartDate = commonHelper.formatDate(pdpStartDate);
        pdpEndDate = commonHelper.formatDate(pdpEndDate);
        const statusString = status ? (status === 'APPROVED' ? 'approved by ' : 'rejected by ') : 'approved by ';
        status = status == undefined ? 'PENDING' : status;

        pdpUnlockEmailTemplate.render(
            { content: { requestDate, areaRegionCode, pdpStartDate, pdpEndDate, status, userName, statusString, requestId } },
            (err: any, result: any) => {
                if (result) {
                    transport.sendMail(
                        {
                            from: emailConfig.global.from,
                            to: isProduction() ? recipientArr : formatInternalEmail(recipientArr),
                            subject: 'PDP Unlock Status',
                            html: result.html,
                        },
                        (err: any, info: any) => {
                            if (err) {
                                logger.error('Error sending PDP unlock status email:', err);
                                LogService.insertEmailLogs(
                                    'PDP_UNLOCK_RESPONSE',
                                    'FAIL',
                                    'PDP Unlock Status',
                                    { to: recipientArr, from: emailConfig.global.from },
                                    requestId,
                                    null,
                                    err,
                                );
                            } else {
                                logger.info('PDP unlock status email sent successfully.');
                            }
                        },
                    );
                } else {
                    logger.error('Error rendering PDP unlock status email template:', err);
                    LogService.insertEmailLogs('PDP_UNLOCK_RESPONSE', 'FAIL', 'PDP Unlock Status', { to: recipientArr, from: emailConfig.global.from }, requestId, null, err);
                }
            },
        );

        return null;
    },

    async pdpUnlockWindowSyncError(data: any) {
        const isEnabled = await isEmailEnabled();
        if (!isEnabled) {
            logger.info('Email is disabled, so not sending PDP Unlock Window sync error email.');
            return;
        }
        logger.info('inside EmailHelper -> pdpUnlockWindowSyncError');
        let templateDir = path.join('app/global/templates', 'emails', 'ms-me-pdp-unlock-error');
        let pdpSyncError = new EmailTemplate(templateDir);

        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
        const yyyy = today.getFullYear();
        const formattedDate = `${dd}/${mm}/${yyyy}`;

        pdpSyncError.render({ content: data }, (err: any, result: any) => {
            if (result) {
                console.log(result.html);
                transport.sendMail(
                    {
                        from: emailConfig.global.from,
                        to: 'pegasus-testing@tataconsumer.com',
                        subject: 'Monthstart/Monthend PDP Sync Error - ' + formattedDate,
                        html: result.html,
                    },
                    (err: any, info: any) => {
                        if (err) {
                            logger.error('inside EmailHelper -> pdpUnlockWindowSyncError, Error sending email:', err);
                            LogService.insertEmailLogs(
                                'PDP_LOCK_UNLOCK_SYNC_ERROR',
                                'FAIL',
                                'Monthstart/Monthend PDP Sync Error - ' + formattedDate,
                                { to: 'pegasus-testing@tataconsumer.com', from: emailConfig.global.from },
                                'PDP_LOCK_UNLOCK_SYNC_ERROR',
                                null,
                                err,
                            );
                        } else {
                            logger.info('inside EmailHelper -> pdpUnlockWindowSyncError, email sent successfully.');
                            LogService.insertEmailLogs(
                                'PDP_LOCK_UNLOCK_SYNC_ERROR',
                                'SUCCESS',
                                'Monthstart/Monthend PDP Sync Error - ' + formattedDate,
                                { to: 'pegasus-testing@tataconsumer.com', from: emailConfig.global.from },
                                'PDP_LOCK_UNLOCK_SYNC_ERROR',
                            );
                        }
                    },
                );
            } else {
                logger.error('inside EmailHelper -> pdpUnlockWindowSyncError, Error rendering template:', err);
                LogService.insertEmailLogs(
                    'PDP_LOCK_UNLOCK_SYNC_ERROR',
                    'FAIL',
                    'Monthstart/Monthend PDP Sync Error - ' + formattedDate,
                    { to: 'pegasus-testing@tataconsumer.com', from: emailConfig.global.from },
                    'PDP_LOCK_UNLOCK_SYNC_ERROR',
                    null,
                    err,
                );
            }
        });
    },

    async pdpWindowUnlockEmail(data: { emails: string[], cc: string[] }) {
        const isEnabled = await isEmailEnabled();
        if (!isEnabled) {
            logger.info('Email is disabled, so not sending PDP Window Unlock email.');
            return;
        }
        logger.info('inside EmailHelper -> pdpWindowUnlockEmail, email to: ', data.emails);
        let templateDir = path.join('app/global/templates', 'emails', 'pdp-window-unlock-email');
        let emailTemplate = new EmailTemplate(templateDir);
        const fe_url = `${commmonHelper.feUrl('')}`;

        emailTemplate.render({ fe_url }, (err: any, result: any) => {
            if (result) {
                // console.log(result.html);
                transport.sendMail(
                    {
                        from: emailConfig.global.from,
                        to: isProduction() ? data.emails : formatInternalEmail(data.emails),
                        cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
                        subject: 'Monthend PDP Unlock Notification',
                        html: result.html,
                    },
                    (err: any, info: any) => {
                        if (err) {
                            logger.error('inside EmailHelper -> pdpWindowUnlockEmail, Error sending email:', err);
                            LogService.insertEmailLogs(
                                'PDP_WINDOW_UNLOCK_NOTIFICATION',
                                'FAIL',
                                'Monthend PDP Unlock Notification',
                                { to: data.emails, from: emailConfig.global.from },
                                'PDP_WINDOW_UNLOCK_NOTIFICATION',
                                null,
                                err,
                            );
                        } else {
                            logger.info('inside EmailHelper -> pdpWindowUnlockEmail, email sent successfully.');
                            LogService.insertEmailLogs(
                                'PDP_WINDOW_UNLOCK_NOTIFICATION',
                                'SUCCESS',
                                'Monthend PDP Unlock Notification',
                                { to: data.emails, from: emailConfig.global.from },
                                'PDP_WINDOW_UNLOCK_NOTIFICATION',
                            );
                        }
                    },
                );
            } else {
                logger.error('inside EmailHelper -> pdpWindowUnlockEmail, Error rendering template:', err);
                LogService.insertEmailLogs(
                    'PDP_WINDOW_UNLOCK_NOTIFICATION',
                    'FAIL',
                    'Monthend PDP Unlock Notification',
                    { to: data.emails, from: emailConfig.global.from },
                    'PDP_WINDOW_UNLOCK_NOTIFICATION',
                    null,
                    err,
                );
            }
        });
    },

    async sendPreapprovedPDPUnlockRequestEmail(pdpData: any, userDetails: any[]) {
        const isEnabled = await isEmailEnabled();
        if (!isEnabled) {
            logger.info('Email is disabled, so not sending preapproved PDP unlock request email.');
            return;
        }

        let templateDir = path.join('app/global/templates', 'emails', 'pdp-unlock-preapproved-email');
        let pdpUnlockEmailTemplate = new EmailTemplate(templateDir);
        let pdp_url = `${commmonHelper.feUrl('')}`;

        userDetails.forEach((recipient: any) => {
            let personalizedPdpData = { ...pdpData };
            personalizedPdpData['name'] = recipient.first_name + ' ' + recipient.last_name;
            pdpUnlockEmailTemplate.render({ pdpData: personalizedPdpData, pdp_url }, (err: any, result: any) => {
                if (result) {
                    const recipients = isProduction() ? recipient.email : formatInternalEmail(recipient.email);
                    transport.sendMail(
                        {
                            from: emailConfig.global.from,
                            to: recipients,
                            subject: `Preapproved PDP Unlock Request - ${pdpData.request_id} : based on plant code`,
                            html: result.html,
                        },
                        (err: any, info: any) => {
                            if (err) {
                                logger.error('Error sending Preapproved PDP unlock email:', err);
                                LogService.insertEmailLogs(
                                    'PREAPPROVED_PDP_UNLOCK_REQUEST',
                                    'FAIL',
                                    `Preapproved PDP Unlock Request - ${pdpData.request_id} : based on plant code`,
                                    { to: recipients, from: emailConfig.global.from },
                                    pdpData.request_id,
                                    null,
                                    err,
                                );
                            } else {
                                logger.info('Preapproved PDP unlock request email sent successfully.');
                                LogService.insertEmailLogs(
                                    'PREAPPROVED_PDP_UNLOCK_REQUEST',
                                    'SUCCESS',
                                    `Preapproved PDP Unlock Request - ${pdpData.request_id} : based on plant code`,
                                    { to: recipients, from: emailConfig.global.from },
                                    pdpData.request_id,
                                );
                            }
                        },
                    );
                } else {
                    logger.error('Error rendering Preapproved PDP unlock email template:', err);
                    LogService.insertEmailLogs(
                        'PREAPPROVED_PDP_UNLOCK_REQUEST',
                        'FAIL',
                        `Preapproved PDP Unlock Request - ${pdpData.request_id} : based on plant code`,
                        { to: recipient.email, from: emailConfig.global.from },
                        pdpData.request_id,
                        null,
                        err,
                    );
                }
            });
        });
    },
};
export default Email;
