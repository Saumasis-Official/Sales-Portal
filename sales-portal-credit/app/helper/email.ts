const path = require('path');
declare function require(name: string);
const nodemailer = require('nodemailer');
const url = global['configuration'].url;
const mailConfig = global['configuration'].email;

import logger from '../lib/logger';
import emailConfig from '../config/email';
import { EmailTemplate } from 'email-templates';
let AWS = require('aws-sdk');
import Helper from './index';
import { LogService } from '../service/LogService';
import email from '../config/email';
import { DEFAULT_EMAIL } from '../constants/constants';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const globalEmailConfig = async () => {
    let DBEmailConfigFlag;
    try {
        DBEmailConfigFlag = mailConfig.enableEmail;
    } catch (error) {
        logger.error('CAUGHT: Error in Email -> globalEmailConfig: ', error);
        return null;
    }
    AWS.config.update({
        region: mailConfig.region,
    });

    let transport = nodemailer.createTransport({
        SES: new AWS.SES({
            apiVersion: '2012-10-17',
        }),
    });

    if (DBEmailConfigFlag === 'FALSE') {
        transport = nodemailer.createTransport({
            port: 1025,
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
};

const isEmailEnabled = async () => {
    return true;
};

const ecom_groups = ['14', '16'];

const Email = {
    async creditExtensionRequestNotification(data: {
        requestor_name: string;
        requestor_code: string;
        requestor_email: string;
        req_date: string;
        transaction_id: string;
        approver: { first_name: string; last_name: string; email: string };
        remarks: string;
        expiry_date: string;
        subTransactionIds: { childid: string; amount_requested: string; payercode: string; payer_name: string; status: string }[];
        getGroupCheck: string;
        created_by: string | null | undefined;
    }) {
        const email_data = {
            approver_to: '',
            cc: '',
            requestor_name: '',
            requestor_code: '',
            requestor_to: '',
            req_date: '',
            transaction_id: '',
            approver_name: '',
            request_reason: '',
            expiryDate: '',
            subTransactionIds: [] as { childid: string; amount_requested: string; payercode: string; payer_name: string; status: string }[],
        };

        try {
            if (!data?.approver) {
                logger.error("Error inside Email -> creditExtensionRequestNotification: No email id found for approver head. Email 'to' is empty", email_data);
                return;
            }
            email_data.requestor_name = data?.requestor_name;
            email_data.requestor_code = data?.requestor_code;
            email_data.requestor_to = data?.requestor_email;
            email_data.req_date = Helper.formatedDate(data?.req_date, 'DD/MM/YYYY') ||'';
            email_data.transaction_id = data?.transaction_id;
            email_data.approver_name = `${data?.approver.first_name} ${data?.approver.last_name}`;
            email_data.approver_to = data?.approver.email;
            email_data.request_reason = data?.remarks;
            email_data.expiryDate = Helper.formatedDate(data?.expiry_date.split('T')[0]) || "";
            email_data.subTransactionIds = data?.subTransactionIds;

            function isGroupPresent(getGroupCheck: string): boolean {
                return ecom_groups.includes(getGroupCheck);
            }

            if (data) {
                const encryptedTransactionId = Helper.encryptData(data?.transaction_id).replaceAll('/', '*').replaceAll('+', '-');
                let extension_url = `${Helper.feUrl()}/redirect?path=admin*cl-order-request&transaction_id=${encryptedTransactionId}`;

                if (isGroupPresent(data?.getGroupCheck)) {
                    await sendMtEcomEmailToApproverOnRequest(email_data, extension_url);
                    await sendMtEcomEmailToRequestorOnRequest(email_data);
                } else {
                    await sendExclusiveEmailToApproverOnRequest(email_data, extension_url);
                    await sendExclusiveEmailToRequestorOnRequest(email_data);
                }
            }
        } catch (error) {
            logger.error('Error while sending Credit Limit Extension Notification, Error: ', error);
            LogService.insertEmailLogs(
                'CREDIT_EXTENSION_REQUEST',
                'FAIL',
                `Credit Extension Request Notification sent for Requestor ${email_data.requestor_name}`,
                {
                    to: email_data.requestor_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                data,
                error,
            );
        }
    },

    async creditExtensionRequestResponseNotification(data: {
        requestor_name: string;
        requestor_code: string;
        requestor_email: string;
        request_reason: string;
        req_date: string;
        transaction_id: string;
        currentApprover: { first_name: string; last_name: string; email: string };
        nextApprover: { first_name: string; last_name: string; email: string };
        previousApprover: { first_name: string; last_name: string; email: string };
        remarks: string;
        created_by: string | null | undefined;
        approver_type: string;
        expiryDate: string;
        subTransactionIds: { childid: string; amount_requested: string; payercode: string; payer_name: string; status: string }[];
        getGroupCheck: string;
    }) {
        const email_data = {
            approver_to: '',
            cc: '',
            requestor_name: '',
            requestor_code: '',
            requestor_email: '',
            req_date: '',
            transaction_id: '',
            currentApprover_name: '',
            nextApprover__name: '',
            current_approver_email: '',
            nexApprover_email: '',
            remarks: '',
            approver_type: '',
            previousApprover_name: '',
            request_reason: '',
            expiryDate: '',
            subTransactionIds: [] as { childid: string; amount_requested: string; payercode: string; payer_name: string; status: string }[],
            subTransactionIdsStatus: false,
        };
        try {
            if (!data?.nextApprover) {
                logger.error("Error inside Email -> creditExtensionRequestNotification: No email id found for approver head. Email 'to' is empty", email_data);
                return;
            }

            email_data.requestor_name = data?.requestor_name;
            email_data.requestor_code = data?.requestor_code;
            email_data.requestor_email = data?.requestor_email;
            email_data.req_date = Helper.formatedDate(data?.req_date) || '';
            email_data.transaction_id = data?.transaction_id;
            email_data.nextApprover__name = `${data?.nextApprover.first_name} ${data?.nextApprover.last_name}`;
            email_data.approver_to = data?.nextApprover.email;
            email_data.remarks = data?.remarks;
            email_data.current_approver_email = data?.currentApprover?.email;
            email_data.nexApprover_email = data?.nextApprover?.email;
            email_data.approver_type = data?.approver_type;
            email_data.previousApprover_name = `${data?.previousApprover.first_name} ${data?.previousApprover.last_name}`;
            email_data.request_reason = data?.request_reason;
            email_data.expiryDate = Helper.formatedDate(data?.expiryDate.split('T')[0]) || "";
            email_data.subTransactionIds = data?.subTransactionIds;

            let allRejected: boolean;
            allRejected = email_data.subTransactionIds.every((subTransaction) => subTransaction.status === 'REJECTED');
            email_data.subTransactionIdsStatus = allRejected;
            if (allRejected) {
                if ((data?.currentApprover?.email === data?.previousApprover?.email) || (data?.nextApprover?.email === DEFAULT_EMAIL.SYSTEM_EMAIL) ) {
                    email_data.currentApprover_name = `${email_data.nextApprover__name}`;
                } 
                else if ((data?.currentApprover.email === DEFAULT_EMAIL.SYSTEM_EMAIL) || ((data?.currentApprover.email === DEFAULT_EMAIL.SYSTEM_EMAIL && data?.approver_type === 'APPROVER3'))) {
                    email_data.currentApprover_name = `${email_data.previousApprover_name}`;
                }
                else {
                    email_data.currentApprover_name = `${data?.currentApprover.first_name} ${data?.currentApprover.last_name}`;
                }
            }
            else {
                email_data.currentApprover_name = `${data?.currentApprover.first_name} ${data?.currentApprover.last_name}`;
            }

            function isGroupPresent(getGroupCheck: string): boolean {
                return ecom_groups.includes(getGroupCheck);
            }

            if (data) {
                const encryptedTransactionId = Helper.encryptData(data?.transaction_id).replaceAll('/', '*').replaceAll('+', '-');
                let cl_approve = `${Helper.feUrl()}/redirect?path=admin*cl-order-request&transaction_id=${encryptedTransactionId}&action=approve`;
                let cl_reject = `${Helper.feUrl()}/redirect?path=admin*cl-order-request&transaction_id=${encryptedTransactionId}&action=reject`;
                let extension_url = `${Helper.feUrl()}/redirect?path=admin*cl-order-request&transaction_id=${encryptedTransactionId}`;
                if (isGroupPresent(data?.getGroupCheck)) {
                    await sendMtEcomEmailToApprover(email_data, extension_url, cl_approve, cl_reject);
                    await sendMtEcomEmailToRequestor(email_data);
                } else {
                    await sendExclusiveEmailToApprover(email_data, extension_url, cl_approve, cl_reject);
                    await sendExclusiveEmailToRequestor(email_data);
                }
            }
        } catch (error) {
            logger.error('Error while sending Credit Limit Extension Notification, Error: ', error);
            LogService.insertEmailLogs(
                'CREDIT_EXTENSION_RESPONSE',
                'FAIL',
                `Credit Extension Notification for ${email_data.requestor_name}`,
                {
                    to: email_data.approver_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                data,
                error,
            );
        }
    },

    //on request
    async creditExtensionGTRequestNotification(data: {
        requestor_name: string;
        requestor_code: string;
        requestor_email: string;
        req_date: string;
        transaction_id: string;
        approver: { first_name: string; last_name: string; email: string };
        requestor_remarks: string;
        subTransactionIds: {
            childid: string;
            amount: number;
            party_code: string;
            party_name: string;
            start_date: string;
            end_date: string;
            status: string;
            action_type: string;
            region_name: string;
            base_limit:string
        }[];
        created_by: string | null | undefined;
    }) {
        const email_data = {
            approver_to: '',
            cc: '',
            requestor_name: '',
            requestor_code: '',
            requestor_to: '',
            req_date: '',
            transaction_id: '',
            approver_name: '',
            requestor_remarks: '',
            subTransactionIds: [] as {
                childid: string;
                amount: number;
                party_code: string;
                party_name: string;
                start_date: string;
                end_date: string;
                status: string;
                action_type: string;
                region_name: string;
                base_limit:string
            }[],
        };

        try {
            if (!data?.approver) {
                logger.error("Error inside Email -> gt creditExtensionRequestNotification: No email id found for approver head. Email 'to' is empty", email_data);
                return;
            }
            email_data.requestor_name = data?.requestor_name;
            email_data.requestor_code = data?.requestor_code;
            email_data.requestor_to = data?.requestor_email;
            email_data.req_date = Helper.formatedDate(data?.req_date, 'DD/MM/YYYY') || '';
            email_data.transaction_id = data?.transaction_id;
            email_data.approver_name = `${data?.approver.first_name} ${data?.approver.last_name}`;
            email_data.approver_to = data?.approver.email;
            email_data.subTransactionIds = data?.subTransactionIds;
            email_data.requestor_remarks = data?.requestor_remarks;
            email_data.subTransactionIds = data?.subTransactionIds?.map((subTransaction) => {
                return {
                    ...subTransaction,
                    startDate: subTransaction.start_date ? Helper.formatedDate(subTransaction.start_date, 'DD/MM/YYYY') : null,
                    endDate: subTransaction.end_date ? Helper.formatedDate(subTransaction.end_date, 'DD/MM/YYYY') : null,
                };
            });

            if (data) {
                const encryptedTransactionId = Helper.encryptData(data?.transaction_id).replaceAll('/', '*').replaceAll('+', '-');
                let cl_approve = `${Helper.feUrl()}/redirect?path=admin*cl-gt-request&transaction_id=${encryptedTransactionId}&action=approve`;
                let cl_reject = `${Helper.feUrl()}/redirect?path=admin*cl-gt-request&transaction_id=${encryptedTransactionId}&action=reject`;
                let extension_url = `${Helper.feUrl()}/redirect?path=admin*cl-gt-request&transaction_id=${encryptedTransactionId}`;
                await senGTEmailToRequestorOnRequest(email_data);
                await senGTEmailToApproverOnRequest(email_data, extension_url, cl_approve, cl_reject);
            }
        } catch (error) {
            logger.error('Error while sending gt Credit Limit Extension Notification, Error: ', error);
            LogService.insertEmailLogs(
                'GT_CREDIT_EXTENSION_REQUEST',
                'FAIL',
                `GT Credit Extension Request Notification sent for Requestor ${email_data.requestor_name}`,
                {
                    to: email_data.requestor_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                data,
                error,
            );
        }
    },
    //on approval
    async creditExtensionGTNotificationONApproval(data: {
        requestor_name: string;
        requestor_code: string;
        requestor_email: string;
        req_date: string;
        transaction_id: string;
        requestor_remarks: string;
        currentApprover: { first_name: string; last_name: string; email: string };
        nextApprover: { first_name: string; last_name: string; email: string };
        previousApprover: { first_name: string; last_name: string; email: string };
        created_by: string | null | undefined;
        approver_type: string;
        subTransactionIds: {
            childid: string;
            amount: number;
            party_code: string;
            party_name: string;
            start_date: string;
            end_date: string;
            status: string;
            action_type: string;
            region_name: string;
            base_limit:string
        }[];
        approver1_remarks: string;
        approver2_remarks: string;
    }) {
        const email_data = {
            approver_to: '',
            cc: '',
            requestor_name: '',
            requestor_code: '',
            requestor_email: '',
            req_date: '',
            transaction_id: '',
            currentApprover_name: '',
            nextApprover__name: '',
            current_approver_email: '',
            nexApprover_email: '',
            approver_type: '',
            previousApprover_name: '',
            subTransactionIds: [] as {
                childid: string;
                amount: number;
                party_code: string;
                party_name: string;
                start_date: string;
                end_date: string;
                status: string;
                action_type: string;
                region_name: string;
                base_limit: string;
            }[],
            approver1_remarks: '',
            approver2_remarks: '',
            requestor_remarks: '',
            subTransactionIdsStatus: false,
        };
        try {
            if (!data?.nextApprover) {
                logger.error("Error inside Email -> creditExtensionGTNotificationONApproval: No email id found for approver head. Email 'to' is empty", email_data);
                return;
            }

            email_data.requestor_name = data?.requestor_name;
            email_data.requestor_code = data?.requestor_code;
            email_data.requestor_email = data?.requestor_email;
            email_data.req_date = Helper.formatedDate(data?.req_date) || '';
            email_data.transaction_id = data?.transaction_id;
            email_data.nextApprover__name = `${data?.nextApprover.first_name} ${data?.nextApprover.last_name}`;
            email_data.approver_to = data?.nextApprover.email;
            email_data.currentApprover_name = `${data?.currentApprover.first_name} ${data?.currentApprover.last_name}`;
            email_data.current_approver_email = data?.currentApprover?.email;
            email_data.nexApprover_email = data?.nextApprover?.email;
            email_data.approver_type = data?.approver_type;
            email_data.previousApprover_name = `${data?.previousApprover.first_name} ${data?.previousApprover.last_name}`;
            email_data.requestor_remarks = data?.requestor_remarks;
            email_data.approver1_remarks = data?.approver1_remarks;
            email_data.approver2_remarks = data?.approver2_remarks ? data?.approver2_remarks : '';

            email_data.subTransactionIds = data?.subTransactionIds?.map((subTransaction) => {
                return {
                    ...subTransaction,
                    startDate: subTransaction.start_date ? Helper.formatedDate(subTransaction.start_date) : null,
                    endDate: subTransaction.end_date ? Helper.formatedDate(subTransaction.end_date) : null,
                    status:
                        subTransaction.status === 'APPROVED'
                            ? data?.approver_type === 'APPROVER1'
                                ? 'Pending by second Approver'
                                : 'APPROVED'
                            : data?.approver_type === 'APPROVER1'
                              ? 'Rejected by first Approver'
                              : 'REJECTED',
                };
            });

            let allRejected: boolean;
            allRejected = email_data.subTransactionIds.every((subTransaction) => subTransaction.status === 'Rejected by first approver' || subTransaction.status==='REJECTED');
            email_data.subTransactionIdsStatus = allRejected;

            if (data) {
                const encryptedTransactionId = Helper.encryptData(data?.transaction_id).replaceAll('/', '*').replaceAll('+', '-');
                let cl_approve = `${Helper.feUrl()}/redirect?path=admin*cl-gt-request&transaction_id=${encryptedTransactionId}&action=approve`;
                let cl_reject = `${Helper.feUrl()}/redirect?path=admin*cl-gt-request&transaction_id=${encryptedTransactionId}&action=reject`;
                let extension_url = `${Helper.feUrl()}/redirect?path=admin*cl-gt-request&transaction_id=${encryptedTransactionId}`;
                if (data.approver_type != 'APPROVER2' && allRejected===false) {
                    await sendGTEmailToApprover(email_data, extension_url, cl_approve, cl_reject);
                }
                await sendGTEmailToRequestor(email_data);
            }
        } catch (error) {
            logger.error('Error while sending GT Credit Limit Extension Notification on approval, Error: ', error);
            LogService.insertEmailLogs(
                'GT_CREDIT_EXTENSION_RESPONSE',
                'FAIL',
                `GT Credit Extension Notification for ${email_data.requestor_name}`,
                {
                    to: email_data.approver_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                data,
                error,
            );
        }
    },
};

//mt ecom request approver mail
async function sendMtEcomEmailToApproverOnRequest(email_data: any, extension_url: string) {
    let templateDir = path.join('app/global/templates', 'emails', 'mt-ecom-approver-request-email');
    let email_template: any = new EmailTemplate(templateDir);
    email_template.render({ content: { ...email_data }, extension_url }, (err, result) => {
        if (!err) {
            transport.sendMail(
                {
                    from: emailConfig.global.from,
                    to: isProduction() ? email_data.approver_to : formatInternalEmail(email_data.approver_to),
                    subject: `Credit Extension Notification for ${email_data.requestor_name}`,
                    html: result.html,
                },
                (err, info) => {
                    if (err) {
                        logger.error(`Inside sendMtEcomEmailToApproverOnRequest --> Couldn't send Credit extension email to '${email_data.approver_to}', due to error: `, err);
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_REQUEST',
                            'FAIL',
                            `Inside sendMtEcomEmailToApproverOnRequest --> Credit Extension Notification for Approver : ${email_data.approver_name}`,
                            {
                                to: email_data.approver_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            err,
                        );
                    } else {
                        logger.info(
                            `Inside sendMtEcomEmailToApproverOnRequest --> Credit Limit Extension Notification email sent successfully for approver.${email_data.approver_name}`,
                        );
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_REQUEST',
                            'SUCCESS',
                            `Inside sendMtEcomEmailToApproverOnRequest --> Credit Extension Notification for Approver : ${email_data.approver_name}`,
                            {
                                to: email_data.approver_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            '',
                            email_data.created_by,
                        );
                    }
                },
            );
        } else {
            logger.error('Inside sendMtEcomEmailToApproverOnRequest -->  credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'CREDIT_EXTENSION_REQUEST',
                'FAIL',
                `Inside sendMtEcomEmailToApproverOnRequest --> Credit Extension Notification for ${email_data.approver_name}`,
                {
                    to: email_data.approver_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

//mt ecom request requestor mail
async function sendMtEcomEmailToRequestorOnRequest(email_data: any) {
    let requestortemplateDir = path.join('app/global/templates', 'emails', 'mt-ecom-requestor-request-email');

    let requestor_email_template: any = new EmailTemplate(requestortemplateDir);

    requestor_email_template.render({ content: { ...email_data } }, (err, result) => {
        if (!err) {
            transport.sendMail(
                {
                    from: emailConfig.global.from,
                    to: isProduction() ? email_data.requestor_to : formatInternalEmail(email_data.requestor_to),
                    subject: `Credit Limit Extension Request`,
                    html: result.html,
                },
                (err, info) => {
                    if (err) {
                        logger.error(`Inside sendMtEcomEmailToRequestorOnRequest --> Couldn't send Credit extension email to '${email_data.requestor_to}', due to error: `, err);
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_REQUEST',
                            'FAIL',
                            `Credit Extension Request Notification for requestor : ${email_data.requestor_code}`,
                            {
                                to: email_data.requestor_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            err,
                        );
                    } else {
                        logger.info(`Inside sendMtEcomEmailToRequestorOnRequest --> Credit Limit Extension Notification email sent successfully to requestor`);
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_REQUEST',
                            'SUCCESS',
                            `Inside sendMtEcomEmailToRequestorOnRequest --> Credit Extension Request Notification sent to Requestor : ${email_data.requestor_name}`,
                            {
                                to: email_data.requestor_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            '',
                            email_data.created_by,
                        );
                    }
                },
            );
        } else {
            logger.error('Inside sendMtEcomEmailToRequestorOnRequest -->  credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'CREDIT_EXTENSION_REQUEST',
                'FAIL',
                `Inside sendMtEcomEmailToRequestorOnRequest --> Credit Extension Request Notification sent to Requestor : ${email_data.requestor_name}`,
                {
                    to: email_data.requestor_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

//mt exclusive request approver mail
async function sendExclusiveEmailToApproverOnRequest(email_data: any, extension_url: string) {
    let templateDir = path.join('app/global/templates', 'emails', 'mt-exclusive-approver-request-email');
    let email_template: any = new EmailTemplate(templateDir);
    email_template.render({ content: { ...email_data }, extension_url }, (err, result) => {
        if (!err) {
            transport.sendMail(
                {
                    from: emailConfig.global.from,
                    to: isProduction() ? email_data.approver_to : formatInternalEmail(email_data.approver_to),
                    subject: `Credit Extension Notification for ${email_data.requestor_name}`,
                    html: result.html,
                },
                (err, info) => {
                    if (err) {
                        logger.error(`Inside sendExclusiveEmailToApproverOnRequest --> Couldn't send Credit extension email to '${email_data.approver_to}', due to error: `, err);
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_REQUEST',
                            'FAIL',
                            `Inside sendExclusiveEmailToApproverOnRequest --> Credit Extension Notification for Approver : ${email_data.approver_name}`,
                            {
                                to: email_data.approver_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            err,
                        );
                    } else {
                        logger.info(
                            `Inside sendExclusiveEmailToApproverOnRequest --> Credit Limit Extension Notification email sent successfully for approver.${email_data.approver_name}`,
                        );
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_REQUEST',
                            'SUCCESS',
                            `Inside sendExclusiveEmailToApproverOnRequest --> Credit Extension Notification for Approver : ${email_data.approver_name}`,
                            {
                                to: email_data.approver_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            '',
                            email_data.created_by,
                        );
                    }
                },
            );
        } else {
            logger.error('Inside sendExclusiveEmailToApproverOnRequest -->  credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'CREDIT_EXTENSION_REQUEST',
                'FAIL',
                `Inside sendExclusiveEmailToApproverOnRequest --> Credit Extension Notification for ${email_data.approver_name}`,
                {
                    to: email_data.approver_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

//mt exclusive request requestor mail
async function sendExclusiveEmailToRequestorOnRequest(email_data: any) {
    let requestortemplateDir = path.join('app/global/templates', 'emails', 'mt-exclusive-requestor-request-email');

    let requestor_email_template: any = new EmailTemplate(requestortemplateDir);

    requestor_email_template.render({ content: { ...email_data } }, (err, result) => {
        if (!err) {
            transport.sendMail(
                {
                    from: emailConfig.global.from,
                    to: isProduction() ? email_data.requestor_to : formatInternalEmail(email_data.requestor_to),
                    subject: `Credit Limit Extension Request`,
                    html: result.html,
                },
                (err, info) => {
                    if (err) {
                        logger.error(`Inside sendExclusiveEmailToRequestorOnRequest --> Couldn't send Credit extension email to '${email_data.requestor_to}', due to error: `, err);
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_REQUEST',
                            'FAIL',
                            `Inside sendExclusiveEmailToRequestorOnRequest-->Credit Extension Request Notification for requestor : ${email_data.requestor_code}`,
                            {
                                to: email_data.requestor_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            err,
                        );
                    } else {
                        logger.info(`Inside sendExclusiveEmailToRequestorOnRequest --> Credit Limit Extension Notification email sent successfully to requestor`);
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_REQUEST',
                            'SUCCESS',
                            `Inside sendExclusiveEmailToRequestorOnRequest --> Credit Extension Request Notification sent to Requestor : ${email_data.requestor_name}`,
                            {
                                to: email_data.requestor_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            '',
                            email_data.created_by,
                        );
                    }
                },
            );
        } else {
            logger.error('Inside sendExclusiveEmailToRequestorOnRequest -->  credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'CREDIT_EXTENSION_REQUEST',
                'FAIL',
                `Inside sendExclusiveEmailToRequestorOnRequest --> Credit Extension Request Notification sent to Requestor : ${email_data.requestor_name}`,
                {
                    to: email_data.requestor_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

//mt ecom response approver mail
async function sendMtEcomEmailToApprover(email_data: any, extension_url: string, cl_approve: string, cl_reject: string) {
    let templateDir = path.join('app/global/templates', 'emails', 'mt-ecom-approver-response-notification');
    let email_template: any = new EmailTemplate(templateDir);

    email_template.render({ content: { ...email_data }, extension_url, cl_approve, cl_reject }, (err, result) => {
        if (!err) {
            if (email_data.subTransactionIds[0].status === 'APPROVED' && !(email_data.approver_type === 'APPROVER3')) {
                transport.sendMail(
                    {
                        from: emailConfig.global.from,
                        to: isProduction() ? email_data.approver_to : formatInternalEmail(email_data.approver_to),
                        subject: `Credit Extension Notification for ${email_data.nextApprover__name}`,
                        html: result.html,
                    },
                    (err, info) => {
                        if (err) {
                            logger.error(`Inside sendMtecomEmailToApprover --> Couldn't send Credit extension email to '${email_data.approver_to}', due to error: `, err);
                            LogService.insertEmailLogs(
                                'CREDIT_EXTENSION_RESPONSE',
                                'FAIL',
                                `Inside sendMtecomEmailToApprover --> Credit Extension Notification for ${email_data.nextApprover__name}`,
                                {
                                    to: email_data.approver_to,
                                    from: emailConfig.global.from,
                                },
                                email_data.requestor_code,
                                email_data,
                                err,
                            );
                        } else {
                            logger.info(`Inside sendMtecomEmailToApprover --> Credit Limit Extension Notification email sent successfully for next approver.`);
                            LogService.insertEmailLogs(
                                'CREDIT_EXTENSION_RESPONSE',
                                'SUCCESS',
                                `Inside sendMtecomEmailToApprover --> Credit Extension Notification for ${email_data.nextApprover__name}`,
                                {
                                    to: email_data.approver_to,
                                    from: emailConfig.global.from,
                                },
                                email_data.requestor_code,
                                email_data,
                                '',
                                email_data.created_by,
                            );
                        }
                    },
                );
            } else {
                logger.info(`inside sendMtecomEmailToApprover --> As request rejected, email will not be sent to next approver`);
            }
        } else {
            logger.error('Inside sendMtecomEmailToApprover --> credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'CREDIT_EXTENSION_RESPONSE',
                'FAIL',
                `Inside sendMtecomEmailToApprover --> Credit Extension Notification for ${email_data.requestor_name}`,
                {
                    to: email_data.approver_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

//mt ecom response requestor mail
async function sendMtEcomEmailToRequestor(email_data: any) {
    let requestortemplateDir = path.join('app/global/templates', 'emails', 'mt-ecom-requestor-response-notification');
    let requestor_email_template: any = new EmailTemplate(requestortemplateDir);

    requestor_email_template.render({ content: { ...email_data } }, (err, result) => {
        if (!err) {
            transport.sendMail(
                {
                    from: emailConfig.global.from,
                    to: isProduction() ? email_data.requestor_email : formatInternalEmail(email_data.requestor_email),
                    subject: `Credit Limit Extension Request`,
                    html: result.html,
                },
                (err, info) => {
                    if (err) {
                        logger.error(`Inside sendMtEcomEmailToRequestor --> Couldn't send Credit extension email to '${email_data.requestor_email}', due to error: `, err);
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_RESPONSE',
                            'FAIL',
                            `Inside sendMtEcomEmailToRequestor --> Credit Extension response Notification for ${email_data.requestor_email}`,
                            {
                                to: email_data.requestor_email,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            err,
                        );
                    } else {
                        logger.info(`Inside sendMtEcomEmailToRequestor --> Credit Limit Extension Response Notification email sent successfully to requestor`);
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_RESPONSE',
                            'SUCCESS',
                            `Inside sendMtEcomEmailToRequestor --> Credit Extension Notification for ${email_data.requestor_name}`,
                            {
                                to: email_data.requestor_email,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            '',
                            email_data.created_by,
                        );
                    }
                },
            );
        } else {
            logger.error('Inside sendMtEcomEmailToRequestor --> credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'CREDIT_EXTENSION_RESPONSE',
                'FAIL',
                `Inside sendMtEcomEmailToRequestor --> Credit Extension Notification for ${email_data.requestor_name}`,
                {
                    to: email_data.requestor_email,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

//mt exclusive response approver mail
async function sendExclusiveEmailToApprover(email_data: any, extension_url: string, cl_approve: string, cl_reject: string) {
    let mtExclusiveApproverTemplate = path.join('app/global/templates', 'emails', 'mt-exclusive-approver-response-email');
    let mtExclusive_approver_template: any = new EmailTemplate(mtExclusiveApproverTemplate);
    const allRejected = email_data.subTransactionIds.every((subTransaction) => subTransaction.status === 'REJECTED');

    mtExclusive_approver_template.render({ content: { ...email_data }, extension_url, cl_approve, cl_reject }, (err, result) => {
        if (!err) {
            if (!allRejected && !(email_data.approver_type === 'APPROVER3')) {
                transport.sendMail(
                    {
                        from: emailConfig.global.from,
                        to: isProduction() ? email_data.approver_to : formatInternalEmail(email_data.approver_to),
                        subject: `Credit Extension Notification for ${email_data.nextApprover__name}`,
                        html: result.html,
                    },
                    (err, info) => {
                        if (err) {
                            logger.error(`Inside sendExclusiveEmailToApprover --> Couldn't send Credit extension email to '${email_data.approver_to}', due to error: `, err);
                            LogService.insertEmailLogs(
                                'CREDIT_EXTENSION_RESPONSE',
                                'FAIL',
                                `Inside sendExclusiveEmailToApprover --> Credit Extension Notification for ${email_data.nextApprover__name}`,
                                {
                                    to: email_data.approver_to,
                                    from: emailConfig.global.from,
                                },
                                email_data.requestor_code,
                                email_data,
                                err,
                            );
                        } else {
                            logger.info(`Inside sendExclusiveEmailToApprover --> Credit Limit Extension Notification email sent successfully for next approver.`);
                            LogService.insertEmailLogs(
                                'CREDIT_EXTENSION_RESPONSE',
                                'SUCCESS',
                                `Inside sendExclusiveEmailToApprover --> Credit Extension Notification for ${email_data.nextApprover__name}`,
                                {
                                    to: email_data.approver_to,
                                    from: emailConfig.global.from,
                                },
                                email_data.requestor_code,
                                email_data,
                                '',
                                email_data.created_by,
                            );
                        }
                    },
                );
            } else {
                logger.info(`Inside sendExclusiveEmailToApprover --> As request rejected, email will not be sent to next approver`);
            }
        } else {
            logger.error('Inside sendExclusiveEmailToApprover -->  -> credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'CREDIT_EXTENSION_RESPONSE',
                'FAIL',
                `Inside sendExclusiveEmailToApprover --> Credit Extension Notification for ${email_data.requestor_name}`,
                {
                    to: email_data.approver_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

//mt exclusive response requestor mail
async function sendExclusiveEmailToRequestor(email_data: any) {
    let mtExclusiveTemplate = path.join('app/global/templates', 'emails', 'mt-exclusive-requestor-response-email');
    let mtExclusive_template: any = new EmailTemplate(mtExclusiveTemplate);

    mtExclusive_template.render({ content: { ...email_data } }, (err, result) => {
        if (!err) {
            transport.sendMail(
                {
                    from: emailConfig.global.from,
                    to: isProduction() ? email_data.approver_to : formatInternalEmail(email_data.approver_to),
                    subject: `Credit Extension Notification for ${email_data.nextApprover__name}`,
                    html: result.html,
                },
                (err, info) => {
                    if (err) {
                        logger.error(`Inside sendExclusiveEmailToRequestor --> Couldn't send Credit extension email to '${email_data.approver_to}', due to error: `, err);
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_RESPONSE',
                            'FAIL',
                            `Inside sendExclusiveEmailToRequestor --> Credit Extension Notification for ${email_data.nextApprover__name}`,
                            {
                                to: email_data.approver_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            err,
                        );
                    } else {
                        logger.info(`Inside sendExclusiveEmailToRequestor --> Credit Limit Extension Notification email sent successfully for requestor.`);
                        LogService.insertEmailLogs(
                            'CREDIT_EXTENSION_RESPONSE',
                            'SUCCESS',
                            `Inside sendExclusiveEmailToRequestor --> Credit Extension Notification for ${email_data.nextApprover__name}`,
                            {
                                to: email_data.approver_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            '',
                            email_data.created_by,
                        );
                    }
                },
            );
        } else {
            logger.error('Inside sendExclusiveEmailToRequestor -->  credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'CREDIT_EXTENSION_RESPONSE',
                'FAIL',
                `Inside sendExclusiveEmailToRequestor --> Credit Extension Notification for ${email_data.requestor_name}`,
                {
                    to: email_data.approver_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

//gt requestor request
async function senGTEmailToRequestorOnRequest(email_data: any) {
    let requestortemplateDir = path.join('app/global/templates', 'emails', 'gt-requestor-request-notification');

    let requestor_email_template: any = new EmailTemplate(requestortemplateDir);

    requestor_email_template.render({ content: { ...email_data } }, (err, result) => {
        if (!err) {
            transport.sendMail(
                {
                    from: emailConfig.global.from,
                    to: isProduction() ? email_data.requestor_to : formatInternalEmail(email_data.requestor_to),
                    subject: `GT Credit Limit Extension Request`,
                    html: result.html,
                },
                (err, info) => {
                    if (err) {
                        logger.error(`Inside senGTEmailToRequestorOnRequest --> Couldn't send Credit extension email to '${email_data.requestor_to}', due to error: `, err);
                        LogService.insertEmailLogs(
                            'GT_CREDIT_EXTENSION_REQUEST',
                            'FAIL',
                            `GT Credit Extension Request Notification for requestor : ${email_data.requestor_code}`,
                            {
                                to: email_data.requestor_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            err,
                        );
                    } else {
                        logger.info(`Inside senGTEmailToRequestorOnRequest --> GT Credit Limit Extension Notification email sent successfully to requestor`);
                        LogService.insertEmailLogs(
                            'GT_CREDIT_EXTENSION_REQUEST',
                            'SUCCESS',
                            `Inside senGTEmailToRequestorOnRequest --> GT Credit Extension Request Notification sent to Requestor : ${email_data.requestor_name}`,
                            {
                                to: email_data.requestor_to,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            '',
                            email_data.created_by,
                        );
                    }
                },
            );
        } else {
            logger.error('Inside senGTEmailToRequestorOnRequest -->  GT credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'GT_CREDIT_EXTENSION_REQUEST',
                'FAIL',
                `Inside senGTEmailToRequestorOnRequest --> GT Credit Extension Request Notification sent to Requestor : ${email_data.requestor_name}`,
                {
                    to: email_data.requestor_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

//gt approver request
async function senGTEmailToApproverOnRequest(email_data: any, extension_url: string, cl_approve: string, cl_reject: string) {
    let requestortemplateDir = path.join('app/global/templates', 'emails', 'gt-approvers-notification');

    let requestor_email_template: any = new EmailTemplate(requestortemplateDir);

    requestor_email_template.render({ content: { ...email_data }, extension_url, cl_approve, cl_reject }, (err, result) => {
        if (!err) {
            transport.sendMail(
                {
                    from: emailConfig.global.from,
                    to: isProduction() ? email_data.requestor_to : formatInternalEmail(email_data.approver_to),
                    subject: `GT Credit Limit Extension Request`,
                    html: result.html,
                },
                (err, info) => {
                    if (err) {
                        logger.error(`Inside  senGTEmailToApproverOnRequest --> Couldn't send Credit extension email to '${email_data.approver_name}', due to error: `, err);
                        LogService.insertEmailLogs(
                            'GT_CREDIT_EXTENSION_REQUEST',
                            'FAIL',
                            `GT Credit Extension Request Notification for approver 1 : ${email_data.approver_name}`,
                            {
                                to: email_data.approver_to,
                                from: emailConfig.global.from,
                            },
                            email_data.approver_name,
                            email_data,
                            err,
                        );
                    } else {
                        logger.info(`Inside senGTEmailToApproverOnRequest --> GT Credit Limit Extension Notification email sent successfully to APPROVER 1`);
                        LogService.insertEmailLogs(
                            'GT_CREDIT_EXTENSION_REQUEST',
                            'SUCCESS',
                            `Inside senGTEmailToApproverOnRequest --> GT Credit Extension Request Notification sent to Requestor : ${email_data.approver_name}`,
                            {
                                to: email_data.approver_to,
                                from: emailConfig.global.from,
                            },
                            email_data.approver_name,
                            email_data,
                            '',
                            email_data.created_by,
                        );
                    }
                },
            );
        } else {
            logger.error('Inside senGTEmailToApproverOnRequest -->  GT credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'GT_CREDIT_EXTENSION_REQUEST',
                'FAIL',
                `Inside senGTEmailToApproverOnRequest --> GT Credit Extension Request Notification sent to Requestor : ${email_data.approver_name}`,
                {
                    to: email_data.approver_to,
                    from: emailConfig.global.from,
                },
                email_data.approver_name,
                email_data,
                err,
            );
        }
    });
}

//gt approver on approval
async function sendGTEmailToApprover(email_data: any, extension_url: string, cl_approve: string, cl_reject: string) {
    let gteApproverTemplate = path.join('app/global/templates', 'emails', 'gt-approvers-notification-on-approval');
    let gt_approver_template: any = new EmailTemplate(gteApproverTemplate);
    const allRejected = email_data.subTransactionIds.every((subTransaction) => subTransaction.status === 'REJECTED');

    gt_approver_template.render({ content: { ...email_data }, extension_url, cl_approve, cl_reject }, (err, result) => {
        if (!err) {
            if (!allRejected && !(email_data.approver_type === 'APPROVER2')) {
                transport.sendMail(
                    {
                        from: emailConfig.global.from,
                        to: isProduction() ? email_data.approver_to : formatInternalEmail(email_data.approver_to),
                        subject: `GT Credit Extension Notification for ${email_data.nextApprover__name}`,
                        html: result.html,
                    },
                    (err, info) => {
                        if (err) {
                            logger.error(`Inside sendGTEmailToApprover --> Couldn't send GT Credit extension email to '${email_data.approver_to}', due to error: `, err);
                            LogService.insertEmailLogs(
                                'CREDIT_EXTENSION_RESPONSE',
                                'FAIL',
                                `Inside sendGTEmailToApprover --> GT Credit Extension Notification for ${email_data.nextApprover__name}`,
                                {
                                    to: email_data.approver_to,
                                    from: emailConfig.global.from,
                                },
                                email_data.requestor_code,
                                email_data,
                                err,
                            );
                        } else {
                            logger.info(`Inside sendGTEmailToApprover --> GT Credit Limit Extension Notification email sent successfully for next approver.`);
                            LogService.insertEmailLogs(
                                'GT_CREDIT_EXTENSION_RESPONSE',
                                'SUCCESS',
                                `Inside sendGTEmailToApprover --> GT Credit Extension Notification for ${email_data.nextApprover__name}`,
                                {
                                    to: email_data.approver_to,
                                    from: emailConfig.global.from,
                                },
                                email_data.requestor_code,
                                email_data,
                                '',
                                email_data.created_by,
                            );
                        }
                    },
                );
            } else {
                logger.info(`Inside sendGTEmailToApprover --> As request rejected, email will not be sent to next approver`);
            }
        } else {
            logger.error('Inside sendGTEmailToApprover -->  -> credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'GT_CREDIT_EXTENSION_RESPONSE',
                'FAIL',
                `Inside sendGTEmailToApprover --> GT Credit Extension Notification for ${email_data.requestor_name}`,
                {
                    to: email_data.approver_to,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

//gt requestor on approval
async function sendGTEmailToRequestor(email_data: any) {
    let gtRequestorTemplate = path.join('app/global/templates', 'emails', 'gt-requestor-notification-on-approval');
    let gtRequestor_template: any = new EmailTemplate(gtRequestorTemplate);

    gtRequestor_template.render({ content: { ...email_data } }, (err, result) => {
        if (!err) {
            transport.sendMail(
                {
                    from: emailConfig.global.from,
                    to: isProduction() ? email_data.requestor_email : formatInternalEmail(email_data.requestor_email),
                    subject: `GT Credit Extension Notification for ${email_data.requestor_name}`,
                    html: result.html,
                },
                (err, info) => {
                    if (err) {
                        logger.error(`Inside sendGTEmailToRequestor --> Couldn't send Credit extension email to '${email_data.requestor_email}', due to error: `, err);
                        LogService.insertEmailLogs(
                            'GT_CREDIT_EXTENSION_RESPONSE',
                            'FAIL',
                            `Inside sendGTEmailToRequestor --> GT Credit Extension Notification for ${email_data.requestor_name}`,
                            {
                                to: email_data.requestor_email,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            err,
                        );
                    } else {
                        logger.info(`Inside sendGTEmailToRequestor -->GT Credit Limit Extension Notification email sent successfully for requestor.`);
                        LogService.insertEmailLogs(
                            'GT_CREDIT_EXTENSION_RESPONSE',
                            'SUCCESS',
                            `Inside sendGTEmailToRequestor --> GT Credit Extension Notification for ${email_data.requestor_name}`,
                            {
                                to: email_data.requestor_email,
                                from: emailConfig.global.from,
                            },
                            email_data.requestor_code,
                            email_data,
                            '',
                            email_data.created_by,
                        );
                    }
                },
            );
        } else {
            logger.error('Inside sendGTEmailToRequestor --> gt  credit extension, Error: ', err);
            LogService.insertEmailLogs(
                'GT_CREDIT_EXTENSION_RESPONSE',
                'FAIL',
                `Inside sendGTEmailToRequestor -->GT Credit Extension Notification for ${email_data.requestor_name}`,
                {
                    to: email_data.requestor_email,
                    from: emailConfig.global.from,
                },
                email_data.requestor_code,
                email_data,
                err,
            );
        }
    });
}

export default Email;
