import logger from '../lib/logger';
import { UserModel } from '../models/user.model';
import Helper from '../helper';
import Email from '../helper/email';
import S3Helper from '../helper/ConnectToS3Bucket';
import fs from 'fs';
import { roles } from '../constants/persona';
import _, { update } from 'lodash';
import { ErrorMessage } from '../constants/errorMessage';
import UtilityFunctions from '../helper/utilityFunctions';
import { LogService } from './LogService';
import { utilModel } from '../models/utilModel';
import { DEFAULT_EMAIL } from '../constants/constants';


export const UserService = {
    async getSessionInvalidateStatus(loginId: string, uuid: string) {
        return await UserModel.getInvalidateSessionStatus(loginId, uuid);
    },

    async fetchDistributorDetails(distributorCode: string) {
        logger.info('inside UserService -> fetchDistributorDetails, distributorCode: ' + distributorCode);
        const response = await UserModel.fetchDistributorDetails(distributorCode);
        return response;
    },
    async getApprovalDetails(approver_email: string) {
        logger.info('inside UserService -> getApprovalDetails, approver_email: ' + approver_email);
        const response = await UserModel.getApprovalDetails(approver_email);
        return response;
    },

    async fetchCreditExtentionRequests(
        rolesArr: string[],
        user_id: string,
        queryParams: {
            status: string | null;
            customer_group: string[] | null;
            search: string | null;
            limit: number | null;
            offset: number | null;
            type: string | null;
            from_date: string | null;
            to_date: string | null;
            responded: string | null;
        },
    ) {
        let params: any = {};

        if (_.intersection(rolesArr, [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS]).length === 0) {
            params = { ...queryParams, type: 'REQUESTED' };
        } else if (_.intersection(rolesArr, [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS]).length > 0) {
            params = { ...queryParams, type: 'ALL' };
        }
        params['user_id'] = user_id;
        params['rolesArr'] = rolesArr;
        logger.info('inside UserService -> fetchCreditExtentionRequests, queryParams: ', params);
        const response = await UserModel.fetchCreditExtentionRequests(params);
        return response;
    },

    async fetchRequestedDetailsById(transaction_id: string) {
        logger.info('inside UserService -> fetchRequestedDetailsById, poNumber: ' + transaction_id);
        const response = await UserModel.fetchRequestedDetailsById(transaction_id);
        return response;
    },
    async sendCreditExtensionRequestApprovalEmail(mailDataArray: any[], getGroupCheck: string, triggered_by: string | null | undefined = null) {
        logger.info('inside UserService -> sendCreditExtensionRequestApprovalEmail ');
        const [firstMailData] = mailDataArray;
        const { requestorId, transactionId, request_reason, expiryDate, approver1, childRecords } = firstMailData;
        try {
            const requestorDetails = await UserService.fetchDistributorDetails(requestorId);
            const requestorData = requestorDetails?.rows[0];
            const approver = await UserService.getApprovalDetails(approver1);
            const approverData = approver?.rows[0];
            const requestor_full_name = `${requestorData?.first_name} ${requestorData?.last_name}`;
            const emailPayload = {
                requestor_name: requestor_full_name,
                requestor_code: requestorData?.user_id,
                requestor_email: requestorData?.email,
                req_date: `${Helper.formatDate(new Date())}`,
                transaction_id: transactionId,
                approver: {
                    first_name: approverData?.first_name,
                    last_name: approverData?.last_name,
                    email: approverData?.email,
                },
                remarks: request_reason,
                expiry_date: expiryDate,
                subTransactionIds: childRecords,
                getGroupCheck: getGroupCheck,
                created_by: triggered_by,
            };
            await Email.creditExtensionRequestNotification(emailPayload);
        } catch (error) {
            console.error('Error in sendCreditExtensionRequestApprovalEmail:', error);
        }
    },

    async sendCreditExtensionRequestGTEmail(mailDataArray: any[], triggered_by: string | null | undefined = null) {
        logger.info('inside UserService -> sendCreditExtensionRequestGTEmail ');
        const [firstMailData] = mailDataArray;
        const { requestorId, transactionId, approver1, childRecords, requestor_remarks } = firstMailData;
        try {
            const requestorDetails = await UserService.fetchDistributorDetails(requestorId);
            const requestorData = requestorDetails?.rows[0];
            const approver = await UserService.getApprovalDetails(approver1);
            const approverData = approver?.rows[0];
            const requestor_full_name = `${requestorData?.first_name} ${requestorData?.last_name}`;
            const emailPayload = {
                requestor_name: requestor_full_name,
                requestor_code: requestorData?.user_id,
                requestor_email: requestorData?.email,
                req_date: `${Helper.formatDate(new Date())}`,
                transaction_id: transactionId,
                approver: {
                    first_name: approverData?.first_name,
                    last_name: approverData?.last_name,
                    email: approverData?.email,
                },
                subTransactionIds: childRecords,
                created_by: triggered_by,
                requestor_remarks: requestor_remarks,
            };
            await Email.creditExtensionGTRequestNotification(emailPayload);
        } catch (error) {
            console.error('Error in sendCreditExtensionRequestGTEmail:', error);
        }
    },

    async sendCLENextApprovalMail(mailDataArray: any[], getGroupCheck: string, triggered_by: string | null | undefined = null) {
        logger.info('inside UserService -> sendCLENextApprovalMail');
        const [firstMailData] = mailDataArray;
        const {
            requestorId,
            transactionId,
            approver1_Remarks,
            request_reason,
            expiryDate,
            current_approver,
            next_approver,
            previous_approver,
            approver_type,
            childRecords,
            requested_date,
        } = firstMailData;
        const requestorDetails = await UserService.fetchDistributorDetails(requestorId);
        const requestorData = requestorDetails?.rows[0];
        const currentApproverEmail = await UserService.getApprovalDetails(current_approver);
        const currentApproverData = currentApproverEmail?.rows[0];
        const nextApproverEmail = await UserService.getApprovalDetails(next_approver);
        const nextApproverData = nextApproverEmail?.rows[0];
        const previousApproverEmail = await UserService.getApprovalDetails(previous_approver);
        const previousApproverData = previousApproverEmail?.rows[0];
        const requestor_full_name = `${requestorData?.first_name} ${requestorData?.last_name}`;
        const emailPayload = {
            requestor_name: requestor_full_name,
            requestor_code: requestorData?.user_id,
            requestor_email: requestorData?.email,
            request_reason: request_reason,
            req_date: requested_date,
            transaction_id: transactionId,
            currentApprover: {
                first_name: currentApproverData?.first_name,
                last_name: currentApproverData?.last_name,
                email: currentApproverData?.email,
            },
            nextApprover: {
                first_name: nextApproverData?.first_name,
                last_name: nextApproverData?.last_name,
                email: nextApproverData?.email,
            },
            previousApprover: {
                first_name: previousApproverData?.first_name,
                last_name: previousApproverData?.last_name,
                email: previousApproverData?.email,
            },
            remarks: approver1_Remarks,
            created_by: triggered_by,
            approver_type: approver_type,
            expiryDate: expiryDate,
            subTransactionIds: childRecords,
            getGroupCheck: getGroupCheck,
        };
        await Email.creditExtensionRequestResponseNotification(emailPayload);
    },

    async insertCreditExtensionRequest(reqested_by: string, roles: string[], queryParams: any[], file: any) {
        logger.info('inside UserService -> insertCreditExtentionRequest');
        const tableName = 'credit.transactions';
        const primaryKey = 'transaction_id';
        const childKey = 'childid';
        const prefix = 'CE';
        const uid: any = await Helper.generateUId(tableName, primaryKey, prefix);
        const childRecords: {
            childid: string;
            amount_requested: string;
            payercode: string;
            payer_name: string;
            status: string;
        }[] = [];
        let mailData: any = {};
        const mailDataArray: any[] = [];
        try {
            for (const param of queryParams) {
                const { customer_Code, base_limit, expiry_date, amount_requested, payer_code, remarks, approver1, approver2, approver3, payer_name } = param;
                const childUid = await Helper.generateChildId(tableName, childKey, uid);

                const approver1Id = await UserService.getApprovalDetails(approver1);
                const approver2Id = await UserService.getApprovalDetails(approver2);
                const approver3Id = await UserService.getApprovalDetails(approver3);
                const approver1UserId = approver1Id && approver1Id.rows[0]?.user_id ? approver1Id.rows[0]?.user_id : null;
                const approver2UserId = approver2Id && approver2Id.rows[0]?.user_id ? approver2Id.rows[0]?.user_id : null;
                const approver3UserId = approver3Id && approver3Id.rows[0]?.user_id ? approver3Id.rows[0]?.user_id : null;
                const approverIDs = [approver1UserId, approver2UserId, approver3UserId];
                let logObj: {
                    file_name: string;
                    link: string | null | undefined;
                } = {
                    file_name: '',
                    link: null,
                };
                if (file) {
                    const fileName = `${payer_code}/${uid}/${file.originalname.split('.')[0]}.msg`;
                    const fileStream = fs.createReadStream(file.path);
                    const S3Response = await S3Helper.uploadCreditLimitEmailFile(fileStream, fileName, 'upload');
                    if (!S3Response || !S3Response['Location']) {
                        logger.error('inside User Service -> upload payment confirmation file, Error: File not uploaded to S3');
                    } else {
                        logObj = {
                            file_name: fileName,
                            link: S3Response['Location'],
                        };
                    }
                }
                // await TransactionModel.beginTransaction('mtTransaction');
                const response = await UserModel.insertCreditExtensionRequest(
                    reqested_by,
                    roles,
                    customer_Code,
                    base_limit,
                    expiry_date,
                    amount_requested,
                    payer_code,
                    remarks,
                    uid,
                    childUid,
                    approver1,
                    approver2,
                    approver3,
                    logObj,
                    approverIDs,
                    payer_name,
                );
                await UserModel.insertAuditTrail(reqested_by, uid, remarks, childUid, 'PENDING', 'REQUESTED');

                await UserModel.insertAuditHistory(
                    reqested_by,
                    customer_Code,
                    base_limit,
                    expiry_date,
                    amount_requested,
                    uid,
                    childUid,
                    approver1,
                    approver2,
                    approver3,
                    approverIDs,
                );
                // await TransactionModel.commitTransaction('mtTransaction')
                logger.info('inside UserService -> insertCreditExtentionRequest, response: ', response);
                if (response) {
                    mailData = {
                        requestorId: response?.requested_by?.split('#')[0],
                        transactionId: uid,
                        request_reason: remarks,
                        expiryDate: expiry_date,
                        approver1: approver1,
                        childRecords: childRecords,
                    };

                    childRecords.push({
                        childid: childUid,
                        amount_requested: amount_requested,
                        payercode: payer_code,
                        payer_name: payer_name,
                        status: 'PENDING',
                    });
                }
            }
            mailDataArray.push(mailData);
            logger.info('mailDataArray', mailDataArray);
            const getGroupCheck = await UserModel.checkCustomerGroup(mailDataArray[0].transactionId);
            logger.info(`getGroupCheck ${getGroupCheck}`);
            logger.info(`mailDataArray length ${mailDataArray.length}`);
            if (getGroupCheck && mailDataArray.length > 0) {
                await UserService.sendCreditExtensionRequestApprovalEmail(mailDataArray, getGroupCheck);
                return 'success';
            }
        } catch (error) {
            // await TransactionModel.rollbackTransaction('mtTransaction');
            logger.error('Caught error in UserService -> insertCreditExtentionRequest', error);
            return null;
        }
    },

    async updateRequestApprover(queryParams: any[], login_id: string, role: string[]) {
        logger.info('inside UserService -> updateRequestApprover ');
        const childRecords: {
            childid: string;
            amount_requested: string;
            payercode: string;
            payer_name: string;
            status: string;
        }[] = [];
        let mailData: any = {};
        const mailDataArray: any[] = [];
        try {
            for (const param of queryParams) {
                const { transaction_id, approver_remarks, amount_requested, expirydate, status, childid, customer_Code } = param;
                const response = await UserModel.getAuditHistorydetails(transaction_id); //audit history
                const approverDetails = await UserService.fetchDistributorDetails(login_id); //sales hirarchy
                const transactionData = await UserModel.getRespondedByFromTransactionDetail(transaction_id, childid); //transcation table
                const getAuditTrailResponse = await UserModel.getAuditTrailDetails(transaction_id, childid, 'APPROVED');
                const requestedDate = transactionData?.requested_on ? new Date(transactionData.requested_on) : null;

                let formattedDate = '';

                if (requestedDate) {
                    formattedDate = requestedDate.toISOString().split('T')[0];
                } else {
                    formattedDate = ' ';
                }

                const approver1 = response && response.length > 0 && response[0].approver_details[0];
                const approver2 = response && response.length > 0 && response[0].approver_details[1];
                const approver3 = response && response.length > 0 && response[0].approver_details[2];

                const remarks = approver_remarks && approver_remarks === '-' ? 'NO REMARKS' : approver_remarks;

                const updateData = {
                    ...param,
                    approver_remarks: remarks,
                    approver1: approver1,
                    approver2: approver2,
                    approver3: approver3,
                    baselimit: transactionData?.baselimit,
                    login_id: login_id,
                };

                const getRequestorId = transactionData?.requested_by?.split('#')[0];
                const getApprover1Email = approver1 ? approver1.split('#')[1] : null;
                const getApprover2Email = approver2 ? approver2.split('#')[1] : null;
                const getApprover3Email = approver3 ? approver3.split('#')[1] : null;

                const respondedbyEmail = transactionData?.responded_by && transactionData?.responded_by.length > 0;
                const userEmail = approverDetails?.rows[0].email.toLowerCase();
                const respondedByCheck = transactionData?.responded_by && transactionData?.responded_by.some((email) => email.toLowerCase().includes(userEmail));
                const previousRespondedByCheck = transactionData?.responded_by && (transactionData?.responded_by[0] == null || transactionData?.responded_by[0] === '');
                const finalPreviousRespondedByCheck =
                    getAuditTrailResponse.length > 0 && transactionData?.responded_by && (transactionData?.responded_by[1] == null || transactionData?.responded_by[1] === '');
                const checkSecondAndThirdApprover = getApprover2Email === DEFAULT_EMAIL.SYSTEM_EMAIL && getApprover3Email === DEFAULT_EMAIL.SYSTEM_EMAIL;
                const checkThirdApprover = getApprover3Email === DEFAULT_EMAIL.SYSTEM_EMAIL;
                const checkSecondApprover = getApprover2Email === DEFAULT_EMAIL.SYSTEM_EMAIL;

                if (getApprover1Email?.toLowerCase() === userEmail) {
                    if (role.includes(roles.CL_PRIMARY_APPROVER)) {
                        if (!(respondedbyEmail && transactionData?.responded_by[0]?.split('#')[1].toLowerCase() === userEmail)) {
                            // await TransactionModel.beginTransaction('mtUpdateTransaction');
                            const result = await UserModel.updateRequestApprover(updateData, 'APPROVER1');

                            // Add check for system email and call updateMTReqestBySystem
                            if (getApprover2Email === DEFAULT_EMAIL.SYSTEM_EMAIL && status == 'APPROVED' && result && result.transaction != null && result.transaction > 0) {
                                // const  getAuditTrailResponse = await UserModel.getAuditTrailDetails(transaction_id, childid, 'APPROVED');
                                // const status_type =   getAuditTrailResponse[0].type;

                                await UserService.updateMTRequestBySystem(transactionData, updateData, status);
                                logger.info('MT Request updated by system for transaction:', transaction_id);
                            }

                            if (result && result.transaction != null && result.transaction > 0) {
                                logger.info('inside UserService ->updateRequestApprover, First Approver perfomed approve/reject action successfully');
                                mailData = {
                                    requestorId: getRequestorId,
                                    transactionId: transaction_id,
                                    approver1_Remarks: approver_remarks,
                                    request_reason: transactionData?.reason,
                                    expiryDate: expirydate,
                                    current_approver: checkSecondAndThirdApprover ? getApprover3Email : checkSecondApprover ? getApprover2Email : getApprover1Email,
                                    next_approver: checkSecondAndThirdApprover ? getApprover1Email : checkSecondApprover ? getApprover3Email : getApprover2Email,
                                    previous_approver: checkSecondAndThirdApprover ? getApprover2Email : checkSecondApprover ? getApprover1Email : '',
                                    approver_type: checkSecondAndThirdApprover ? 'APPROVER3' : checkSecondApprover ? 'APPROVER2' : 'APPROVER1',
                                    childRecords: childRecords,
                                    requested_date: formattedDate,
                                };

                                childRecords.push({
                                    childid: childid,
                                    amount_requested: amount_requested,
                                    payercode: transactionData?.payercode,
                                    payer_name: transactionData?.payer_name,
                                    status: status,
                                });
                            }
                        }
                    } else {
                        return {
                            success: false,
                            message: ErrorMessage.ROLE_MISMATCH,
                        };
                    }
                } else if (getApprover2Email?.toLowerCase() === userEmail) {
                    if (role.includes(roles.CL_SECONDARY_APPROVER)) {
                        if (!previousRespondedByCheck) {
                            if (!respondedByCheck) {
                                if (respondedbyEmail && getAuditTrailResponse[0]?.status === 'APPROVED' && getAuditTrailResponse[0].type === 'APPROVER1') {
                                    const result = await UserModel.updateRequestApprover(updateData, 'APPROVER2');

                                    // Add check for system email and call updateMTReqestBySystem
                                    const getAuditTrailResponse = await UserModel.getAuditTrailDetails(transaction_id, childid, 'APPROVED');
                                    const status_type = getAuditTrailResponse[0].type;
                                    if (
                                        getApprover3Email === DEFAULT_EMAIL.SYSTEM_EMAIL &&
                                        status == 'APPROVED' &&
                                        status_type === 'APPROVER2' &&
                                        result &&
                                        result.transaction != null &&
                                        result.transaction > 0
                                    ) {
                                        await UserService.updateMTRequestBySystem(transactionData, updateData, status);
                                        logger.info('MT Request updated by system for transaction:', transaction_id);
                                    }

                                    if (result && result.transaction != null && result.transaction > 0) {
                                        logger.info('inside UserService ->updateRequestApprover, Second Approver perfomed approve/reject action successfully');
                                        mailData = {
                                            requestorId: getRequestorId,
                                            transactionId: transaction_id,
                                            approver1_Remarks: approver_remarks,
                                            request_reason: transactionData?.reason,
                                            expiryDate: expirydate,
                                            current_approver: checkThirdApprover ? getApprover3Email : getApprover2Email,
                                            next_approver: checkThirdApprover ? getApprover1Email : getApprover3Email,
                                            previous_approver: checkThirdApprover ? getApprover2Email : getApprover1Email,
                                            approver_type: checkThirdApprover ? 'APPROVER3' : 'APPROVER2',
                                            childRecords: childRecords,
                                            requested_date: formattedDate,
                                        };

                                        childRecords.push({
                                            childid: childid,
                                            amount_requested: amount_requested,
                                            payercode: transactionData?.payercode,
                                            payer_name: transactionData?.payer_name,
                                            status: status,
                                        });
                                    }
                                } else {
                                    continue;
                                }
                            } else {
                                return {
                                    success: false,
                                    message: ErrorMessage.ALREADY_RESPONDED,
                                };
                            }
                        } else {
                            return {
                                success: false,
                                message: ErrorMessage.NOT_RESPONDED_BY_PREVIOUS_APPROVER,
                            };
                        }
                    } else {
                        return {
                            success: false,
                            message: ErrorMessage.ROLE_MISMATCH,
                        };
                    }
                } else if (getApprover3Email?.toLowerCase() === userEmail) {
                    if (role.includes(roles.CL_SECONDARY_APPROVER)) {
                        if (!finalPreviousRespondedByCheck) {
                            if (!respondedByCheck) {
                                if (respondedbyEmail && getAuditTrailResponse[0]?.status === 'APPROVED' && getAuditTrailResponse[0].type === 'APPROVER2') {
                                    const getTransactionData = await UserModel.getOnePayerCodeDetailsFromTransaction(transactionData?.payercode);
                                    if (getTransactionData && getTransactionData.length > 0 && status === 'APPROVED') {
                                        for (const data of getTransactionData) {
                                            await utilModel.updateTransactionTable(data?.transaction_id, data?.childid, 'PREVIOUSLY_APPROVED');
                                        }
                                    }
                                    const result = await UserModel.updateRequestApprover(updateData, 'APPROVER3');
                                    if (result && result.transaction != null && result.transaction > 0) {
                                        logger.info('inside UserService ->updateRequestApprover, Third Approver perfomed approve/reject action successfully');
                                        if (status === 'APPROVED') {
                                            const sapResponse = await UtilityFunctions.updateCreditExtention(updateData, transactionData);
                                            if (sapResponse?.status === 201 && sapResponse?.data?.d) {
                                                const amendment_req = {
                                                    req: JSON.stringify(updateData),
                                                    res: JSON.stringify(sapResponse?.data?.d),
                                                };
                                                await LogService.save_req_res(amendment_req, childid);
                                            }
                                            const saveSapLimitOb = await UtilityFunctions.sendToSapCreditLimit(transactionData?.payercode);
                                            if (saveSapLimitOb?.data?.d?.results[0]?.CREDIT_LIMIT) {
                                                const sapBaseLimit = saveSapLimitOb.data?.d?.results[0]?.CREDIT_LIMIT;
                                                await utilModel.saveSapBaseLimit(sapBaseLimit, transactionData?.payercode);
                                                logger.info('inside UserService -> updateRequestApprover :  sapBaseLimit', sapBaseLimit, transactionData?.payercode);
                                            }
                                        }
                                        if (result && result.transaction != null && result.transaction > 0) {
                                            mailData = {
                                                requestorId: getRequestorId,
                                                transactionId: transaction_id,
                                                approver1_Remarks: approver_remarks,
                                                request_reason: transactionData?.reason,
                                                expiryDate: expirydate,
                                                current_approver: getApprover3Email,
                                                //to display the approvers name in the email, setting next approver to approver1
                                                next_approver: getApprover1Email,
                                                previous_approver: approver2.split('#')[1],
                                                approver_type: 'APPROVER3',
                                                childRecords: childRecords,
                                                requested_date: formattedDate,
                                            };

                                            childRecords.push({
                                                childid: childid,
                                                amount_requested: amount_requested,
                                                payercode: transactionData?.payercode,
                                                payer_name: transactionData?.payer_name,
                                                status: status,
                                            });
                                        }
                                    }
                                } else {
                                    continue;
                                }
                            } else {
                                return {
                                    success: false,
                                    message: ErrorMessage.ALREADY_RESPONDED,
                                };
                            }
                        } else {
                            return {
                                success: false,
                                message: ErrorMessage.NOT_RESPONDED_BY_PREVIOUS_APPROVER,
                            };
                        }
                    } else {
                        return {
                            success: false,
                            message: ErrorMessage.ROLE_MISMATCH,
                        };
                    }
                }
            }
            mailDataArray.push(mailData);
            logger.info('inside userService -> updateRequestApprover :  mailDataArray', mailDataArray);
            const getGroupCheck = await UserModel.checkCustomerGroup(mailDataArray[0].transactionId);
            if (getGroupCheck && mailDataArray.length > 0) {
                UserService.sendCLENextApprovalMail(mailDataArray, getGroupCheck);
                return { success: true };
            }
        } catch (error) {
            logger.error('Error in processing approval -> updateRequestApprover', error);
            return { success: false, data: null };
        }
    },

    async getClApproverFinance() {
        logger.info('inside UserService -> getClApproverFinance');
        const response = await UserModel.getClApproverFinance();
        return response;
    },

    async getClApproverSales() {
        logger.info('inside UserService -> getClApproverSales');
        const response = await UserModel.getClApproverSales();
        return response;
    },

    async insertApproverDetails(queryParams: any, login_id: string) {
        logger.info('inside UserService -> insertApproverDetails');
        const response = await UserModel.insertApproverDetails(queryParams, login_id);

        return response;
    },

    async getApproverDetails() {
        logger.info('inside UserService -> getApproverDetails');
        const response = await UserModel.getApproverDetails();
        return response;
    },

    async getRiskCategory() {
        logger.info('inside UserService -> getRiskCategory');
        const response = await UserModel.getRiskCategory();
        return response;
    },

    async fetchApproversDetails(queryParams) {
        const value1: any[] = [];
        const risk: string = queryParams[0]?.riskFactor;
        const percent = parseFloat(queryParams[0]?.extensionrequiredpercentage);
        let range;

        logger.info('inside UserService -> fetchApproversDetails');
        if (queryParams[0]?.type == 'MULTI') {
            logger.info('inside UserService -> fetchApproversDetails -> Type Multi');

            if (percent >= 0 && percent <= 15) {
                range = '1';
            } else if (percent > 15 && percent <= 30) {
                range = '2';
            } else if (percent > 30) {
                range = '3';
            }

            queryParams.forEach((item) => {
                if (item.base_limit < 1 || item.riskFactor != risk || !(item.riskFactor === 'B' || item.riskFactor === 'C' || item.riskFactor === 'D')) {
                    value1.push(item);
                }
                let percRange;
                const valuePercent = item.extensionrequiredpercentage;

                if (item.extensionrequiredpercentage) {
                    if (valuePercent >= 0 && valuePercent <= 15) {
                        percRange = '1';
                    } else if (valuePercent > 15 && valuePercent <= 30) {
                        percRange = '2';
                    } else if (valuePercent > 30) {
                        percRange = '3';
                    }
                    if (percRange != range) {
                        value1.push(item);
                    }
                }
                if (value1.length > 0) {
                    queryParams = queryParams.map((item) => ({
                        ...item,
                        category: 'Approver Category 5 (Default Approver Category)',
                    }));
                }
            });

            const response = await UserModel.fetchExclusiveApproversDetails(queryParams);
            return response;
        } else {
            logger.info('inside UserService -> fetchApproversDetails -> Type Single');
            const response = await UserModel.fetchApproversDetails(queryParams);
            return response;
        }
    },
    async accountBaseLimitCheck() {
        logger.info('inside UserService -> accountBaseLimitCheck');
        const response = await UserModel.accountBaseLimitCheck();
        return response;
    },
    async addApproverConfig(queryParams: any, user_id: string) {
        logger.info('inside UserService -> addApproverConfig');
        const response = await UserModel.addApproverConfig(queryParams, user_id);
        return response;
    },
    async getCategoryList() {
        logger.info('inside UserService -> getCategoryList');
        const response = await UserModel.getCategoryList();
        return response;
    },
    async getUnmappedCustomerGroups() {
        logger.info('inside UserService -> getUnmappedCustomerGroups');
        const response = await UserModel.getUnmappedCustomerGroups();
        return response;
    },
    async insertCreditExtensionGTRequest(
        requested_by: string,
        roles: string[],
        file: any,
        queryParams: {
            cluster_code: string;
            approver1: string;
            approver2: string;
            action_type: string;
            remarks: string;
        },
        data: any[],
    ) {
        logger.info('inside UserService -> insertCreditExtensionGTRequest');
        const { cluster_code, approver1, approver2, action_type, remarks } = queryParams;
        const tableName = 'credit.gt_transactions';
        const primaryKey = 'transaction_id';
        const childKey = 'child_id';
        const prefix = 'GT';
        const uid: any = await Helper.generateUId(tableName, primaryKey, prefix);
        const childRecords: {
            child_id: string;
            amount: number;
            action_type: string;
            party_code: string;
            party_name: string;
            region_name: string;
            start_date: Date;
            end_date: Date;
            status: string;
            base_limit: string;
        }[] = [];
        let mailData: any = {};
        const mailDataArray: any[] = [];
        let logObj: {
            file_name: string;
            link: string | null | undefined;
        } = {
            file_name: '',
            link: null,
        };
        if (file) {
            const fileName = `${uid}/${file.originalname.split('.')[0]}.xlsx`;
            const fileBuffer = file.buffer;
            const S3Response = await S3Helper.uploadCreditLimitEmailFile(fileBuffer, fileName, 'gtexcelupload');
            if (!S3Response || !S3Response['Location']) {
                logger.error('inside User Service -> insertCreditExtensionGTRequest upload payment confirmation file, Error: File not uploaded to S3');
            } else {
                logObj = {
                    file_name: fileName,
                    link: S3Response['Location'],
                };
            }
        }
        try {
            for (const param of data) {
                const { partyCode, partyName, amount, startDate, endDate, base_limit } = param;
                const approver1Id = await UserService.getApprovalDetails(approver1);
                const approver2Id = await UserService.getApprovalDetails(approver2);
                const approver1UserId = approver1Id && approver1Id.rows[0]?.user_id ? approver1Id.rows[0]?.user_id : null;
                const approver2UserId = approver2Id && approver2Id.rows[0]?.user_id ? approver2Id.rows[0]?.user_id : null;

                const approverIDs = [approver1UserId, approver2UserId];
                const childUid = await Helper.generateChildId(tableName, childKey, uid);

                const insertData = {
                    transaction_id: uid,
                    child_id: childUid,
                    file_name: logObj.file_name,
                    file_link: logObj.link,
                    requestedBy: requested_by,
                    roles: roles,
                    ...queryParams,
                    ...param,
                };
                const gtTransactionresponse = await UserModel.insertCreditExtensionGTRequest(insertData);
                if (gtTransactionresponse) {
                    await UserModel.insertAuditTrail(requested_by, uid, '', childUid, 'PENDING', 'REQUESTED');
                    await UserModel.insertGTAuditHistory(requested_by, amount, uid, childUid, approver1, approver2, approverIDs, startDate, endDate, partyCode, base_limit);
                    mailData = {
                        requestorId: requested_by,
                        transactionId: uid,
                        approver1: approver1,
                        childRecords: childRecords,
                        requestor_remarks: remarks,
                    };

                    childRecords.push({
                        child_id: childUid,
                        amount: amount,
                        action_type: action_type,
                        party_code: partyCode,
                        party_name: partyName,
                        region_name: cluster_code,
                        start_date: startDate,
                        end_date: endDate,
                        status: 'PENDING',
                        base_limit: base_limit,
                    });
                }
            }
            mailDataArray.push(mailData);
            logger.info('mailDataArray', mailDataArray);
            if (mailDataArray.length > 0) {
                UserService.sendCreditExtensionRequestGTEmail(mailDataArray);
                return 'success';
            }
        } catch (error) {
            logger.error('Caught error in UserService -> insertCreditExtentionRequest', error);
            return null;
        }
    },
    async fetchGTCreditExtentionRequests(
        rolesArr: string[],
        user_id: string,
        email: string,
        queryParams: {
            status: string | null;
            region: string[] | null;
            search: string | null;
            limit: number | null;
            offset: number | null;
            type: string | null;
            action_type: string | null;
            requestedBySearch: string | null;
        },
    ) {
        let params: any = {};
        params = { ...queryParams };
        params['user_id'] = user_id;
        params['rolesArr'] = rolesArr;
        params['email'] = email;
        logger.info('inside UserService -> fetchGTCreditExtentionRequests, queryParams: ', params);
        const response = await UserModel.fetchGTCreditExtentionRequests(params);
        return response;
    },
    async fetchGTRequestedDetailsById(transaction_id: string) {
        logger.info('inside UserService -> fetchGTRequestedDetailsById, Transaction_Id: ' + transaction_id);
        const response = await UserModel.fetchGTRequestedDetailsById(transaction_id);
        return response;
    },
    async getBaseLimit(partyCode: string) {
        logger.info('inside UserService -> getBaseLimit, party code: ' + partyCode);
        const response = await UserModel.getBaseLimit(partyCode);
        return response;
    },
    async updateMTRequestBySystem(transactionData: any, updateData: any, status: string) {
        logger.info('Inside UserService -> updateMTRequestBySystem');
        try {
            const approver2 = updateData.approver2;
            const approver3 = updateData.approver3;
            let approver2Result: { transaction: any } | null = null;

            // First check and execute Approver2 if it's system email
            if (approver2.split('#')[1] === DEFAULT_EMAIL.SYSTEM_EMAIL) {
                const systemUpdateData = {
                    ...updateData,
                    approver_remarks: 'Auto-approved by system as Second Approver',
                    status: 'APPROVED',
                    login_id: 'SYSTEM',
                };
                approver2Result = await UserModel.updateRequestApprover(systemUpdateData, 'APPROVER2');
                logger.info('updateMTRequestBySystem -> System approver (APPROVER2) action completed successfully');
            }

            // Then check and execute Approver3 if conditions met
            const getAuditTrailResponse = await UserModel.getAuditTrailDetails(updateData.transaction_id, updateData.childid, 'APPROVED');
            logger.info('inside updateMTRequestBySystem -> getAuditTrailResponse', getAuditTrailResponse);
            const status_type = getAuditTrailResponse[0].type;
            logger.info('inside updateMTRequestBySystem -> status_type', status_type);
            logger.info('inside updateMTRequestBySystem -> approver3', approver3.split('#')[1] ,
            "DEFAULT EMAIL", DEFAULT_EMAIL.SYSTEM_EMAIL);
            if (approver3.split('#')[1] === DEFAULT_EMAIL.SYSTEM_EMAIL && status_type === 'APPROVER2') {
                logger.info('updateMTRequestBySystem -> Approver3 is system email, proceeding with final approval');
                const approver3UpdateData = {
                    ...updateData,
                    approver_remarks: 'Auto-approved by system as Third approver',
                    status: 'APPROVED',
                    login_id: 'SYSTEM',
                };

                const getTransactionData = await UserModel.getOnePayerCodeDetailsFromTransaction(transactionData?.payercode);
                logger.info('getTransactionData', getTransactionData);
                if (getTransactionData && getTransactionData.length > 0 && status === 'APPROVED') {
                    for (const data of getTransactionData) {
                        await utilModel.updateTransactionTable(data?.transaction_id, data?.childid, 'PREVIOUSLY_APPROVED');
                    }
                }
                logger.info('Approver 3 updatedata', approver3UpdateData);
                const approver3Result = await UserModel.updateRequestApprover(approver3UpdateData, 'APPROVER3');
                logger.info('updateMTRequestBySystem -> Final approval (APPROVER3) completed by system');
                logger.info('updateMTRequestBySystem -> Approver3 Result:', approver3Result);

                // Handle SAP integration if approved
                if (approver3Result && status === 'APPROVED') {
                    logger.info('updateMTRequestBySystem ->', approver3Result, status);
                    await this.handleMTSAPIntegrationBySystem(updateData, transactionData);
                }
                return approver3Result;
            }
            return approver2Result;
        } catch (error) {
            logger.error('Error in updateMTRequestBySystem:', error);
            throw error;
        }
    },
    async handleMTSAPIntegrationBySystem(updateData: any, transactionData: any) {
        logger.info('inside UserService -> handleMTSAPIntegrationBySystem');
        const sapResponse = await UtilityFunctions.updateCreditExtention(updateData, transactionData);

        if (sapResponse?.status === 201 && sapResponse?.data?.d) {
            const amendment_req = {
                req: JSON.stringify(updateData),
                res: JSON.stringify(sapResponse?.data?.d),
            };
            await LogService.save_req_res(amendment_req, updateData.childid);
        }

        const saveSapLimitOb = await UtilityFunctions.sendToSapCreditLimit(transactionData?.payercode);
        if (saveSapLimitOb?.data?.d?.results[0]?.CREDIT_LIMIT) {
            const sapBaseLimit = saveSapLimitOb.data?.d?.results[0]?.CREDIT_LIMIT;
            await utilModel.saveSapBaseLimit(sapBaseLimit, transactionData?.payercode);
            logger.info('inside UserService ->handleMTSAPIntegrationBySystem : SAP base limit updated:', sapBaseLimit, transactionData?.payercode);
        }
    },
};
