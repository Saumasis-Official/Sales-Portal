const path = require('path');
declare function require(name: string);

const nodemailer = require('nodemailer');
const url = global['configuration']?.url;
const mailConfig = global['configuration']?.email;
import logger from '../lib/logger';
import emailConfig from '../config/email';
import { EmailTemplate } from 'email-templates';
import commonHelpers from '../helper';
import { SapModel } from '../models/sap.model';
import { LogService } from '../service/LogService';
import fs from 'fs';
import { DeliveryCodeEmail } from '../interface/invoiceOtpCommunication';

let AWS = require('aws-sdk');

AWS.config.update({
    // accessKeyId: mailConfig.accessKeyId,
    // secretAccessKey: mailConfig.secretAccessKey,
    region: mailConfig?.region,
});
const globalEmailConfig = async () => {
    let DBEmailConfigFlag;
    try {
        DBEmailConfigFlag = mailConfig.enableEmail; // await AdminModel.getGlobalEmailConfig();
    } catch (error) {
        logger.error('CAUGHT: Error in Email -> globalEmailConfig: ', error);
        return null;
    }
    AWS.config.update({
        // accessKeyId: mailConfig.accessKeyId,
        // secretAccessKey: mailConfig.secretAccessKey,
        region: mailConfig?.region,
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
    if (typeof actualEmail === 'string') {
        actualEmail = actualEmail.split(',');
    }
    // Output will be formatInternalEmail('abc@xyz.com', 'pqr@qwe.com') => pqr+abc@xyz.com
    for (const email of actualEmail) {
        emailArr.push(customEmail.slice(0, customEmail.indexOf('@')) + `+${email.slice(0, email.indexOf('@'))}` + customEmail.slice(customEmail.indexOf('@')));
    }
    logger.info('email.ts -> Email formatInternalEmail: ', emailArr);
    return emailArr;
};
const isCreditCrunchEmailEnabled = async () => {
    const response = await SapModel.getAppLevelSettingsByKeys(`'CREDIT_LIMIT_NOTIFICATION'`);
    let isEnabled: boolean = false;
    if (response && response?.rows.length > 0) {
        isEnabled = response.rows[0].value.toUpperCase() === 'YES';
    }
    return isEnabled;
};

const isEmailEnabled = async () => {
    return true;
    // const response:any[] = await utilModel.getAppSettings();
    // const isEnabled:boolean = (response)? response?.filter((item) => item.key === 'ENABLE_EMAIL_NOTIFICATION').map((item) => item.value.toUpperCase() === 'YES')[0] : false;
    // return isEnabled;
};

const Email = {
    dbSyncFailed(data: any) {
        let templateDir = path.join('app/global/templates', 'emails', 'db-sync-failed');
        let dbSyncEmail = new EmailTemplate(templateDir);
        dbSyncEmail.render({ content: { ...data }, activate_url: `${commonHelpers.feUrl()}` }, (err, result) => {
            transport.sendMail(
                {
                    from: emailConfig.global.from,
                    to: isProduction() ? data.email : formatInternalEmail(data.email),
                    cc: isProduction() ? '' : '',
                    subject: `DB Sync Failed issue notification`,
                    html: result.html,
                },
                (err, info) => {
                    if (err) {
                        logger.error("Couldn't send DB Sync Failed issued notification, due to error: ", err);
                        LogService.insertEmailLogs(
                            'DB_SYNC_FAILED',
                            'FAIL',
                            `DB Sync Failed issue notification`,
                            { to: data.email, from: emailConfig.global.from },
                            data.email,
                            { type: data?.type },
                            `${err}`,
                        );
                    } else {
                        logger.info('DB Sync Failed issued notification email sent successfully.');
                        LogService.insertEmailLogs(
                            'DB_SYNC_FAILED',
                            'SUCCESS',
                            `DB Sync Failed issue notification`,
                            { to: data.email, from: emailConfig.global.from },
                            data.email,
                            {
                                type: data?.type,
                            },
                        );
                    }
                },
            );
        });
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
                        },
                        (err, info) => {
                            if (err) {
                                logger.error("Couldn't send credit_crunch_notification email, due to error: ", err);
                                LogService.insertEmailLogs(
                                    'CREDIT_CRUNCH_NOTIFICATION',
                                    'FAIL',
                                    `Sales Order Stock Allocation`,
                                    { to: data.email, from: emailConfig.global.from },
                                    data.distributorId,
                                    { poNumber: data.po_number },
                                    `${err}`,
                                );
                                isSent = false;
                            } else {
                                logger.info('credit_crunch_notification email sent successfully.');
                                LogService.insertEmailLogs(
                                    'CREDIT_CRUNCH_NOTIFICATION',
                                    'SUCCESS',
                                    `Sales Order Stock Allocation`,
                                    { to: data.email, from: emailConfig.global.from },
                                    data.distributorId,
                                    { poNumber: data.po_number },
                                );
                            }
                        },
                    );
                });
                return isSent;
            }
            return false;
        } catch (error) {
            logger.error('Error while sending credit_crunch_notification email -> ', error);
            return false;
        }
    },

    arsReport(
        excelDataFile: {
            filePath: string;
            fileName: string;
        } | null,
        to_arr: string[] = [],
        areaCode: string = '',
    ) {
        try {
            let templateDir = path.join('app/global/templates', 'emails', 'ars-report');
            const today = new Date();
            today.setDate(today.getDate() - 1);
            let yesterday = today.toLocaleDateString('en-GB');
            to_arr.push(emailConfig?.ars_report_email?.to ?? '');
            const to_emails = to_arr.join(',');
            let subject = `ARS report for the date: ${yesterday}`;
            subject += areaCode ? ` for the area code: ${areaCode}` : '';
            const env = process.env.NODE_ENV != 'prod' ? `(${process.env.NODE_ENV})` : '';
            let emailConfiguration = {
                from: emailConfig.global.from,
                to: isProduction() ? to_emails : formatInternalEmail(to_emails),
                cc: emailConfig.ars_report_email.cc,
                subject: subject,
            };
            if (excelDataFile) {
                Object.assign(emailConfiguration, {
                    attachments: [
                        {
                            filename: excelDataFile?.fileName,
                            path: excelDataFile?.filePath,
                        },
                    ],
                });
            }

            let arsReportEmail = new EmailTemplate(templateDir);
            arsReportEmail.render(
                { data: { yesterday: yesterday, isOrderPlaced: excelDataFile ? true : false, env: env, area: areaCode }, url: url.FE },
                (err: any, result: { html: any }) => {
                    if (!err) {
                        transport.sendMail(
                            {
                                ...emailConfiguration,
                                html: result?.html,
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
                                            from: emailConfig.global.from,
                                        },
                                        'ARS report email',
                                        { yesterday: yesterday, isOrderPlaced: excelDataFile ? true : false, env: env, area: areaCode },
                                        err,
                                    );
                                } else {
                                    logger.info('ARS report email sent successfully');
                                    LogService.insertEmailLogs(
                                        'ARS_REPORT',
                                        'SUCCESS',
                                        subject,
                                        {
                                            to: emailConfig.ars_report_email.to,
                                            cc: emailConfig.ars_report_email.cc,
                                            from: emailConfig.global.from,
                                        },
                                        'ARS report email',
                                        { yesterday: yesterday, isOrderPlaced: excelDataFile ? true : false, env: env, area: areaCode },
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
                            },
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
                                from: emailConfig.global.from,
                            },
                            'ARS report email',
                            { yesterday: yesterday, isOrderPlaced: excelDataFile ? true : false, env: env, area: areaCode },
                            err,
                        );
                    }
                },
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
                    from: emailConfig.global.from,
                },
                'ARS report email',
                { yesterday: '', isOrderPlaced: false, env: '', area: '' },
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
        try {
            if (data) {
                let templateDir = path.join('app/global/templates', 'emails', 'sih-ss-email');
                let sihBelowSs = new EmailTemplate(templateDir);
                sihBelowSs.render({ content: { ...data }, activate_url: `${commonHelpers.feUrl}` }, (err, result) => {
                    if (!err) {
                        transport.sendMail(
                            {
                                from: emailConfig.global.from,
                                to: isProduction() ? data.to : formatInternalEmail(data.to),
                                cc: isProduction() ? data.cc : formatInternalEmail(data.cc),
                                subject: `Stock Holdings has fallen below ${data.emailType}`,
                                html: result.html,
                            },
                            (err, info) => {
                                if (err) {
                                    logger.error(`Couldn't send SIH below SS alert email to '${data.to}' , due to error: `, err);
                                    LogService.insertEmailLogs(
                                        'SIH_BELOW_SS',
                                        'FAIL',
                                        `Stock Holdings has fallen below ${data.emailType}`,
                                        {
                                            to: data.to,
                                            cc: data.cc,
                                            from: emailConfig.global.from,
                                        },
                                        data.dbCode,
                                        data,
                                        err,
                                    );
                                } else {
                                    logger.info(`SIH below SS alert email for ${data.dbName}(${data.dbCode}) sent successfully.`);
                                    LogService.insertEmailLogs(
                                        'SIH_BELOW_SS',
                                        'SUCCESS',
                                        `Stock Holdings has fallen below ${data.emailType}`,
                                        {
                                            to: data.to,
                                            cc: data.cc,
                                            from: emailConfig.global.from,
                                        },
                                        data.dbCode,
                                        data,
                                    );
                                }
                            },
                        );
                    } else {
                        logger.error('inside Email -> sihBelowSs, Error: ', err);
                        LogService.insertEmailLogs(
                            'SIH_BELOW_SS',
                            'FAIL',
                            `Stock Holdings has fallen below ${data.emailType}`,
                            {
                                to: data.to,
                                cc: data.cc,
                                from: emailConfig.global.from,
                            },
                            data.dbCode,
                            data,
                            err,
                        );
                    }
                });
            }
        } catch (error) {
            logger.error('Error while sending SIH below SS alert email , Error: ', error);
            LogService.insertEmailLogs(
                'SIH_BELOW_SS',
                'FAIL',
                `Stock Holdings has fallen below ${data.emailType}`,
                {
                    to: data.to,
                    cc: data.cc,
                    from: emailConfig.global.from,
                },
                data.dbCode,
                data,
                error,
            );
        }
    },

    async sendDeliveryCodeEmail(data: DeliveryCodeEmail) {
        try {
            let templateDir = path.join('app/global/templates', 'emails', 'delivery-code-email');
            const invoiceOtpEmail = new EmailTemplate(templateDir);
            const subject = `Delivery code of invoice - ${data.invoice_number}`;
            if (!data?.email) {
                LogService.insertEmailLogs('DELIVERY_CODE', 'FAIL', subject, { to: data.email, from: emailConfig.global.from }, data.invoice_number, data, 'Email is empty');
                return;
            }
            await invoiceOtpEmail.render({ content: { ...data }, activate_url: `${commonHelpers.feUrl()}` }, (err, result) => {
                transport.sendMail(
                    {
                        from: emailConfig.global.from,
                        to: isProduction() ? data.email : formatInternalEmail(data.email),
                        subject: subject,
                        html: result.html,
                    },
                    (err, info) => {
                        if (err) {
                            logger.error("Couldn't send delivery code email, due to error: ", err);
                            LogService.insertEmailLogs('DELIVERY_CODE', 'FAIL', subject, { to: data.email, from: emailConfig.global.from }, data.invoice_number, data, `${err}`);
                        } else {
                            // logger.info('delivery code email sent successfully.');
                            LogService.insertEmailLogs('DELIVERY_CODE', 'SUCCESS', subject, { to: data.email, from: emailConfig.global.from }, data.invoice_number, data);
                        }
                    },
                );
            });
        } catch (error) {
            logger.error(`CAUGHT: Error in sendInvoiceOtpEmail: while sending Invoice OTP email, Invoice: ${data.invoice_number} -> `, error);
            return null;
        }
    },
};
export default Email;
