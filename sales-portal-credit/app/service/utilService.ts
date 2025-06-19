/**
 * @file util.service
 * @description defines util service methods
 */
import { utilModel } from '../models/utilModel';
import logger from '../lib/logger';
import UtilityFunctions from '../helper/utilityFunctions';
import { UserModel } from '../models/user.model';
import { UserService } from './user.service';
import { roles } from '../constants/persona';
import { ErrorMessage } from '../constants/errorMessage';
import { SuccessMessage } from '../constants/successMessage';
import Helper from '../helper';
import Email from '../helper/email';

export const utilService = {
    async userMappingList(userId: string) {
        logger.info('inside UtilService -> userMappingList');
        return await utilModel.userMappingList(userId);
    },
    async getCustomerGroups() {
        logger.info('inside UtilService -> getCustomerGroups');
        return await utilModel.getCustomerGroups();
    },
    async getAccountList(data: { customer_group: string | null; search: string | null; limit: number | null; offset: number | null; type: string | null }) {
        logger.info('inside UtilService -> getAccountList');
        return await utilModel.getAccountList(data);
    },

    async getAllPayerCodes() {
        logger.info('inside UtilService -> getAllPayerCodes');
        return await utilModel.getAllPayerCodes();
    },

    async runBaseLimitJob(payerCode: string, creditLimit: string, riskClass: string) {
        logger.info('inside UtilService -> runBaseLimitJob');
        return await utilModel.runBaseLimitJob(payerCode, creditLimit, riskClass);
        //audit it
    },

    async insertBaseLimitToAuditTrail(queryParams: any) {
        logger.info('inside UserService -> insertToAuditTrail');
        const response = await utilModel.insertBaseLimitToAuditTrail(queryParams);
        return response;
    },
    async getPayerCodeGroup(payerCode: string) {
        logger.info('inside UtilService -> getPayerCodeGroup');
        const response = await utilModel.getPayerCodeGroup(payerCode);
        return response;
    },

    async revertBaseLimit() {
        logger.info('inside UtilService -> revertBaseLimit');
        const transactionData = await utilModel.getAllTransactions();
        let sapResponse: any;
        let status: any = { status: 201, data: [] };

        if (transactionData && transactionData?.length > 0) {
            const currentDate = new Date().toISOString().split('T')[0];
            for (const data of transactionData) {
                const expiryDate = new Date(data.expirydate).toISOString().split('T')[0];
                if (expiryDate <= currentDate) {
                    sapResponse = await UtilityFunctions.sendToRevertBaseLimit(data.payercode, data.amount_requested);
                    if (sapResponse?.status === 201 && sapResponse?.data?.d) {
                        await utilModel.updateTransactionTable(data.transaction_id, data.childid, 'REVERTED');
                        await UserModel.insertAuditTrail('SYSTEM', data.transaction_id, 'REVERTED BY SYSTEM', data.childid, 'APPROVED', 'REVERTED');
                        const saveSapLimitOb = await UtilityFunctions.sendToSapCreditLimit(data.payercode);
                        if (saveSapLimitOb?.data?.d?.results[0]?.CREDIT_LIMIT) {
                            const sapBaseLimit = saveSapLimitOb.data?.d?.results[0]?.CREDIT_LIMIT;
                            await utilModel.saveSapBaseLimit(sapBaseLimit, data.payercode);
                            logger.info('inside UtilService -> revertBaseLimit :  sapBaseLimit', sapBaseLimit, data.payercode);
                        }
                        status.data.push({ [data?.childid]: 'Reverted successfully in SAP' });
                    } else {
                        status.data.push({ [data?.childid]: 'Failed to revert in SAP' });
                        await UserModel.insertAuditTrail('SYSTEM', data.transaction_id, 'REVERTED BY SYSTEM', data.childid, 'REJECTED', 'REVERTED');
                    }
                }
            }
        } else {
            logger.info('No transactions found to revert base limit');

            return null;
        }
        return status;
    },
    async insertAccountMaster(file_name: string, updated_by: string, uid: string) {
        logger.info('inside UtilService -> insertAccountMaster');
        const response = await utilModel.insertAccountMaster(file_name, updated_by, uid);
        return response;
    },
    async updateAccountMaster(file_name: string, updated_by: string) {
        logger.info('inside UtilService -> updateAccountMaster');
        const response = await utilModel.updateAccountMaster(file_name, updated_by);
        return response;
    },
    async getValidatedData(validateData: any, user_id: string) {
        const transactionData = await utilModel.getAllTransactionsForMasterUpload();
        for (const validateItem of validateData) {
            for (const transactionItem of transactionData) {
                if (transactionItem.payercode === validateItem.payerCode) {
                    await utilModel.updateTransactionTable(transactionItem.transaction_id, transactionItem.childid, 'MASTER_UPLOAD');
                    await UserModel.insertAuditTrail(user_id, transactionItem.transaction_id, 'BULK UPLOADING', transactionItem.childid, 'APPROVED', 'MASTER_UPLOAD');
                }
            }
        }
    },

    async getMtClReport(user_id: string, roles: string[]) {
        logger.info('inside UtilService -> getMtClReport');
        try {
            const response = await utilModel.getMtClReport(user_id, roles);
            if (!response || !Array.isArray(response)) {
                logger.error('getMtClReport: Invalid response format');
                throw new Error('Invalid response format from database');
            }

            const formattedResponse = response.map((item) => ({
                transaction_id: item.transaction_id || '',
                payercode: item.payercode || '',
                payer_name: item.payer_name || '',
                expirydate: item.expirydate ? new Date(item.expirydate) : null,
                amount_requested: item.amount_requested || 0,
                baselimit: item.baselimit || 0,
                childid: item.childid || '',
                requested_on: new Date(item.requested_on),
                requested_by: item.requestor_name || '',
                status: item.status || '',
                responded_by: item.responder_names || null,
                responded_on: item.responded_on
                    ? typeof item.responded_on === 'string'
                        ? Helper.parseTimestampArray(item.responded_on)
                        : item.responded_on.map((timestamp: string) => new Date(timestamp))
                    : [],
                customer_group: item.customer_group || '',
            }));

            logger.info(`getMtClReport: Successfully retrieved ${formattedResponse.length} records`);
            return formattedResponse;
        } catch (error) {
            logger.error('Error in getMtClReport:', error);
            throw error;
        }
    },
    async addGTApprovers(queryParams: any, user_id: string) {
        logger.info('inside UtilService -> addGTApprovers');
        const approverDetails = await utilModel.addGTApprovers(queryParams, user_id);
        return approverDetails;
    },
    async getCluster() {
        logger.info('inside UtilService -> getCluster');
        const cluster = await utilModel.getCluster();
        return cluster;
    },
    async getGTApproverDetails() {
        logger.info('inside UserService -> getGTApproverDetails');
        const response = await utilModel.getGTApproverDetails();
        return response;
    },
    async sendGTMailOnApproval(mailDataArray: any[], triggered_by: string | null | undefined = null) {
        logger.info('inside UtilService -> sendGTMailOnApproval');
        const [firstMailData] = mailDataArray;
        const {
            requestorId,
            transactionId,
            current_approver,
            next_approver,
            previous_approver,
            approver_type,
            childRecords,
            requested_date,
            approver1_remarks,
            approver2_remarks,
            requestor_remarks,
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
            req_date: requested_date,
            transaction_id: transactionId,
            requestor_remarks: requestor_remarks,
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
            approver1_remarks: approver1_remarks,
            approver2_remarks: approver2_remarks,
            created_by: triggered_by,
            approver_type: approver_type,
            subTransactionIds: childRecords,
        };
        await Email.creditExtensionGTNotificationONApproval(emailPayload);
    },
    async updateGTRequestApprover(queryParams: any[], login_id: string, role: string[]) {
        logger.info('inside UtilService -> updateGTRequestApprover');
        const childRecords: {
            child_id: string;
            amount: number;
            action_type: string;
            party_code: string;
            party_name: string;
            region_name: string;
            start_date: string;
            end_date: string;
            status: string;
            base_limit: string;
        }[] = [];
        let mailData: any = {};
        const mailDataArray: any[] = [];
        try {
            for (const param of queryParams) {
                const { transaction_id, status, child_id, approvers_remarks } = param;
                const response = await UserModel.getAuditHistorydetails(transaction_id); //audit history
                const approverDetails = await UserService.fetchDistributorDetails(login_id); //sales hirarchy
                const transactionData = await utilModel.getRespondedByFromGTTransaction(transaction_id, child_id); //transcation table
                const getAuditTrailResponse = await UserModel.getAuditTrailDetails(transaction_id, child_id, 'APPROVED');
                const requestedDate = transactionData?.requested_on ? new Date(transactionData.requested_on) : null;

                let formattedDate = '';

                if (requestedDate) {
                    formattedDate = requestedDate.toISOString().split('T')[0];
                } else {
                    formattedDate = ' ';
                }

                const approver1 = response && response.length > 0 && response[0].approver_details[0];
                const approver2 = response && response.length > 0 && response[0].approver_details[1];

                const updateData = {
                    ...param,
                    approver1: approver1,
                    approver2: approver2,
                    login_id: login_id,
                    amount: transactionData?.amount,
                    distributor_code: transactionData?.distributor_code,
                    start_date: transactionData?.start_date,
                    end_date: transactionData?.end_date,
                    base_limit:transactionData?.base_limit
                };

                const respondedbyEmail = transactionData?.responded_by && transactionData?.responded_by.length > 0;
                const userEmail = approverDetails?.rows[0].email.toLowerCase();
                const respondedByCheck = transactionData?.responded_by && transactionData?.responded_by.some((email) => email.toLowerCase().includes(userEmail));
                const previousRespondedByCheck = transactionData?.responded_by && (transactionData?.responded_by[0] == null || transactionData?.responded_by[0] === '');

                if (approver1?.split('#')[1]?.toLowerCase() === userEmail) {
                    if (role.includes(roles.GT_PRIMARY_APPROVER)) {
                        if (!respondedByCheck) {
                            if (!(respondedbyEmail && transactionData.responded_by[0].split('#')[1].toLowerCase() === userEmail)) {
                                const result = await utilModel.updateGTRequestApprover(updateData, 'APPROVER1');
                                if (result) {
                                    mailData = {
                                        requestorId: result?.transaction?.requested_by?.split('#')[0],
                                        transactionId: transaction_id,
                                        current_approver: approver1.split('#')[1],
                                        next_approver: approver2.split('#')[1],
                                        previous_approver: '',
                                        approver_type: 'APPROVER1',
                                        childRecords: childRecords,
                                        requested_date: formattedDate,
                                        approver1_remarks: approvers_remarks,
                                        approver2_remarks: '',
                                        requestor_remarks: transactionData?.requestor_remarks,
                                    };

                                    childRecords.push({
                                        child_id: child_id,
                                        amount: transactionData?.amount,
                                        action_type: transactionData?.file_action_type,
                                        party_code: transactionData?.distributor_code,
                                        party_name: transactionData?.distributor_name,
                                        region_name: transactionData?.region,
                                        start_date: transactionData?.start_date.toISOString().split('T')[0],
                                        end_date: transactionData?.end_date.toISOString().split('T')[0],
                                        status: status,
                                        base_limit: transactionData?.base_limit
                                    });
                                }
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
                            message: ErrorMessage.ROLE_MISMATCH,
                        };
                    }
                } else if (approver2?.split('#')[1]?.toLowerCase() === userEmail) {
                    if (role.includes(roles.GT_SECONDARY_APPROVER)) {
                        if (!previousRespondedByCheck) {
                            if (!respondedByCheck) {
                                if (respondedbyEmail && getAuditTrailResponse[0]?.status === 'APPROVED' && getAuditTrailResponse[0].type === 'APPROVER1') {
                                    const result = await utilModel.updateGTRequestApprover(updateData, 'APPROVER2');
                                    if (result) {
                                        const currentDate = new Date().toISOString().split('T')[0];
                                        const startDate = new Date(updateData.start_date).toLocaleDateString('en-CA');
                                        
                                    if (startDate == currentDate && status === 'APPROVED') {
                                        // Get GT transactions that need to be started for current date
                                        const transactionDetails = await utilModel.getGtStartDate(startDate);
                                        if (!transactionDetails || transactionDetails.length === 0) {
                                            logger.info(`No transactions found for current date as start date: ${updateData.start_date}`);
                                            return {
                                                status: 200,
                                                message: ErrorMessage.GT_START_NO_DATA,
                                            };
                                        }
                                        //Process each GT transaction(s) for updating credit limit
                                        for (const record of transactionDetails) {
                                            //Step 1: Update credit limit in SAP
                                            const sapUpdateGTResponse = await UtilityFunctions.updateGTCreditLimit(
                                                { updatedBaseLimit: record?.amount },
                                                { payercode: record?.distributor_code },
                                                { baselimit: record?.base_limit }
                                            );
                                            //Step 2: Prepare query parameters for audit trail
                                            const queryParams = {
                                                transaction_id: record.transaction_id,
                                                child_id: record.child_id,
                                                payerCode: record.distributor_code,
                                                creditLimit: record.base_limit,
                                                amount: record.amount,
                                                sapResponse: {
                                                    status: String(sapUpdateGTResponse?.status),
                                                    data: sapUpdateGTResponse?.data
                                                },
                                                userId : login_id,
                                            };
                                            //Step 3: Handle successful SAP update
                                            if (sapUpdateGTResponse?.status === 201) {

                                                const getResponse = await UtilityFunctions.sendToSapCreditLimit(record.distributor_code);
                                                const creditLimit = getResponse?.data?.d?.results[0]?.CREDIT_LIMIT;
                                                //Step 4: Update local database records
                                                await utilModel.updateGtDistributorRecord(record.distributor_code, creditLimit);
                                                //Step 5: Create audit trail
                                                await utilModel.insertGTStartEventAudit(queryParams);
                            
                                                logger.info(`Successfully updated GT::Today, base limit for ${record.distributor_code}`);
                                            } else {
                                                // Handle SAP Update failure
                                                logger.error(`SAP update failed for Distributor code ${record.distributor_code} with response : `, sapUpdateGTResponse?.data);
                                                throw new Error(`SAP update failed with status: ${sapUpdateGTResponse?.status}`);
                                            }
                                        }
                                    }

                                    mailData = {
                                            requestorId: result?.transaction?.requested_by?.split('#')[0],
                                            transactionId: transaction_id,
                                            current_approver: approver2.split('#')[1],
                                            next_approver: '',
                                            previous_approver: approver1.split('#')[1],
                                            approver_type: 'APPROVER2',
                                            childRecords: childRecords,
                                            requested_date: formattedDate,
                                            approver1_remarks: transactionData?.approvers_remarks?.approver1_remarks,
                                            approver2_remarks: approvers_remarks,
                                            requestor_remarks: transactionData?.requestor_remarks,
                                        };

                                        childRecords.push({
                                            child_id: child_id,
                                            amount: transactionData?.amount,
                                            action_type: transactionData?.file_action_type,
                                            party_code: transactionData?.distributor_code,
                                            party_name: transactionData?.distributor_name,
                                            region_name: transactionData?.region,
                                            start_date: transactionData?.start_date.toISOString().split('T')[0],
                                            end_date: transactionData?.end_date.toISOString().split('T')[0],
                                            status: status,
                                            base_limit: transactionData?.base_limit
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
                }
            }
            mailDataArray.push(mailData);
            logger.info('inside UtilService -> updateGTRequestApprover :  mailDataArray', mailDataArray);
            if (mailDataArray.length > 0) {
                utilService.sendGTMailOnApproval(mailDataArray);
                return { success: true };
            }
        } catch (error) {
            logger.error('Error in processing approval -> updateGTRequestApprover', error);
            return { success: false, data: null };
        }
    },

    async getGTExcelData(clusterCode: string, action_type: string) {
        logger.info('inside UtilService -> getGTExcelData');
        try {
            const response = await utilModel.getGTExcelData(clusterCode, action_type);
            const formattedResponse = response?.map((item) => ({
                party_code: item.party_code || '',
                party_name: item.party_name || '',
                cluster_code: item.cluster_code || '',
                base_limit: item.base_limit || '-',
                type: item.nach_type === 'FALSE' ? 'ADVANCE' : 'NACH',
            }));
            logger.info(`getGTExcelData: Successfully retrieved ${formattedResponse?.length} records`);
            return formattedResponse;
        } catch (error) {
            logger.error('Error in getGTExcelData:', error);
            throw error;
        }
    },

    async getGtApprovers(queryParams: any) {
        logger.info('inside UtilService -> getGtApprovers');
        const approverDetails = await utilModel.getGtApprovers(queryParams);
        return approverDetails;
    },
    async getGtRequestorDetails(user_id: string) {
        logger.info('inside UtilService -> getGtRequestorDetails');
        const response = await utilModel.getGtRequestorDetails(user_id);
        return response;
    },
    async fetchGtAddRequestor(user_id: string) {
        logger.info('inside UtilService -> fetchGtAddRequestor');
        const response = await utilModel.fetchGtAddRequestor(user_id);
        return response;
    },
    async addGtRequestor(queryParams: any) {
        logger.info('inside UtilService -> addGtRequestor');
        const approverDetails = await utilModel.addGtRequestor(queryParams);
        return approverDetails;
    },

    async getRequestorClusters(user_id: string) {
        logger.info('inside UtilService -> getRegions');
        const cluster = await utilModel.getRequestorClusters(user_id);
        return cluster;
    },

    async getCustomerGroupForSettings(user_id: string) {
        logger.info('inside UtilService -> getCustomerGroupForSettings');
        const customerGroup = await utilModel.getCustomerGroupForSettings(user_id);
        return customerGroup;
    },
    async fetchAllDistributorCodes() {
        logger.info('inside UtilService -> fetchAllDistributorCodes');
        const response = await utilModel.fetchAllDistributorCodes();
        return response;
    },
    async runGtBaseLimitJob(creditLimit: string, db_code: string) {
        logger.info('inside UtilService -> runGtBaseLimitJob');
        return await utilModel.runGtBaseLimitJob(creditLimit, db_code);
    },
    async gtStartTransactionCron(start_date: string) {
        logger.info('inside UtilService -> gtStartTransactionCron');
        try {
            const results: {
                success: string[];
                failed: Array<{
                    distributor_code: string;
                    error: string;
                }>;
                totalProcessed: number;
            } = { success: [], failed: [], totalProcessed: 0 };

            const transactionData = await utilModel.getGtStartDate(start_date);

            if (!transactionData || transactionData.length === 0) {
                logger.info(`No transactions found for date: ${start_date}`);
                return {
                    status: 200,
                    message: ErrorMessage.GT_START_NO_DATA,
                    data: results,
                };
            }

            for (const record of transactionData) {
                try {
                    logger.info(`Processing transaction for distributor: ${record.distributor_code}`);
                    // Validate required fields
                    if (!record.amount || !record.distributor_code || !record.base_limit) {
                        const missingFields: string[] = [];
                        if (!record.amount) missingFields.push('amount');
                        if (!record.distributor_code) missingFields.push('distributor_code');
                        if (!record.base_limit) missingFields.push('base_limit');
                        logger.error(`Missing required fields for record: ${JSON.stringify(record)}`);
                        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                    }
                    const sapUpdateGTResponse = await UtilityFunctions.updateGTCreditLimit(
                        { updatedBaseLimit: record?.amount },
                        { payercode: record?.distributor_code },
                        { baselimit: record?.base_limit },
                    );

                    const queryParams = {
                        transaction_id: record.transaction_id,
                        child_id: record.child_id,
                        payerCode: record.distributor_code,
                        creditLimit: record.base_limit,
                        amount: record.amount,
                        sapResponse: {
                            status: String(sapUpdateGTResponse?.status),
                            data: sapUpdateGTResponse?.data,
                        },
                    };

                    if (sapUpdateGTResponse?.status === 201) {
                        const getResponse = await UtilityFunctions.sendToSapCreditLimit(record.distributor_code);
                        const creditLimit = getResponse?.data?.d?.results[0]?.CREDIT_LIMIT;

                        await utilModel.updateGtDistributorRecord(record.distributor_code, creditLimit);
                        await utilModel.insertGTStartEventAudit(queryParams);

                        logger.info(`Successfully updated GT(START) base limit for ${record.distributor_code}`);
                        results.success.push(record.distributor_code);
                    } else {
                        logger.error(`SAP update failed for Distributor code ${record.distributor_code} with response : `, sapUpdateGTResponse?.data);
                        throw new Error(`SAP update failed with status: ${sapUpdateGTResponse?.status}`);
                    }
                } catch (recordError) {
                    logger.error(`Failed to process record for ${record.distributor_code || 'unknown'}:`, recordError);
                    results.failed.push({
                        distributor_code: record.distributor_code || 'Unknown',
                        error: `GT START Transaction Failed: ${recordError.message}`,
                    });
                }
                results.totalProcessed++;
            }

            return {
                status: 200,
                message: SuccessMessage.GT_START_TRANSACTION_CRON,
                data: {
                    ...results,
                    successCount: results.success.length,
                    failureCount: results.failed.length,
                },
            };
        } catch (error) {
            logger.error('Error in gtStartTransactionCron:', error);
            return {
                status: 500,
                message: ErrorMessage.GT_START_TRANSACTION_CRON,
                error: `GT START Transaction Failed: ${error.message}`,
            };
        }
    },
    async gtEndTransactionCron(end_date: string) {
        logger.info('inside UtilService -> gtEndTransactionCron');
        try {
            const results: {
                success: string[];
                failed: Array<{
                    distributor_code: string;
                    error: string;
                }>;
                totalProcessed: number;
            } = { success: [], failed: [], totalProcessed: 0 };

            const transactionData = await utilModel.getGtEndDate(end_date);

            if (!transactionData || transactionData.length === 0) {
                logger.info(`No transactions found for date: ${end_date}`);
                return {
                    status: 200,
                    message: ErrorMessage.GT_END_NO_DATA,
                    data: results,
                };
            }

            for (const record of transactionData) {
                try {
                    logger.info(`Processing transaction for distributor: ${record.distributor_code}`);
                    // Validate required fields
                    if (!record.amount || !record.distributor_code || !record.base_limit) {
                        const missingFields: string[] = [];
                        if (!record.amount) missingFields.push('amount (current limit)');
                        if (!record.distributor_code) missingFields.push('distributor_code');
                        if (!record.base_limit) missingFields.push('base_limit (original limit)');

                        logger.error(`Missing required fields for END transaction: ${JSON.stringify(record)}`);
                        throw new Error(`Missing required fields for GT END: ${missingFields.join(', ')}`);
                    }
                    const sapUpdateGTResponse = await UtilityFunctions.updateGTCreditLimit(
                        { updatedBaseLimit: record.base_limit }, // Reverting to original base limit
                        { payercode: record.distributor_code },
                        { baselimit: record.amount }, // Current limit
                    );

                    const queryParams = {
                        transaction_id: record.transaction_id,
                        child_id: record.child_id,
                        payerCode: record.distributor_code,
                        creditLimit: record.amount,
                        amount: record.base_limit,
                        sapResponse: {
                            status: String(sapUpdateGTResponse?.status),
                            data: sapUpdateGTResponse?.data,
                        },
                    };

                    if (sapUpdateGTResponse?.status === 201) {
                        const getResponse = await UtilityFunctions.sendToSapCreditLimit(record.distributor_code);
                        const creditLimit = getResponse?.data?.d?.results[0]?.CREDIT_LIMIT;

                        await utilModel.updateGtDistributorRecord(record.distributor_code, creditLimit);
                        await utilModel.insertGTEndEventAudit(queryParams);

                        logger.info(`Successfully updated GT(END) base limit for ${record.distributor_code}`);
                        results.success.push(record.distributor_code);
                    } else {
                        logger.error(`SAP update failed for Distributor ${record.distributor_code} with response : `, sapUpdateGTResponse?.data);
                        throw new Error(`SAP update failed with status: ${sapUpdateGTResponse?.status}`);
                    }
                } catch (recordError) {
                    logger.error(`Failed to process record for ${record.distributor_code || 'unknown'}:`, recordError);
                    results.failed.push({
                        distributor_code: record.distributor_code || 'Unknown',
                        error: `GT END Failed: ${recordError.message}`,
                    });
                }
                results.totalProcessed++;
            }

            return {
                status: 200,
                message: SuccessMessage.GT_END_TRANSACTION_CRON,
                data: {
                    ...results,
                    successCount: results.success.length,
                    failureCount: results.failed.length,
                    proceessDate: end_date,
                },
            };
        } catch (error) {
            logger.error('Error in gtEndTransactionCron:', error);
            return {
                status: 500,
                message: ErrorMessage.GT_START_TRANSACTION_CRON,
                error: `GT END Transaction Failed: ${error.message}`,
            };
        }
    },
    async getGtStartDate(start_date: string) {
        logger.info('inside UtilService -> getGtStartDate');
        try {
            const transactionData = await utilModel.getGtStartDate(start_date);
            return transactionData;
        } catch (error) {
            logger.error('Error in getGtStartDate:', error);
            throw error;
        }

    },
    async getGtEndDate(end_date: string) {
        logger.info('inside UtilService -> getGtEndDate');
        try {
            const transactionData = await utilModel.getGtEndDate(end_date);
            return transactionData;
        } catch (error) {
            logger.error('Error in getGtEndDate:', error);
            throw error;
        }
    },
    async getGtClReport(user_id: string, roles: string[]) {
        logger.info('inside UtilService -> getGtClReport');
        try {
            const response = await utilModel.getGtClReport(user_id, roles);
            if (!response || !Array.isArray(response)) {
                logger.error('getGtClReport: Invalid response format');
                throw new Error('Invalid response format from database');
            }
            const formattedResponse = response.map((item) => ({
                transaction_id: item.transaction_id || '',
                distributor_code: item.distributor_code || '',
                distributor_name: item.distributor_name || '',
                region: item.region || '',
                file_action_type: item.file_action_type || '',
                start_date: item.start_date ? item.start_date : '',
                end_date: item.end_date ? item.end_date : '',
                amount: item.amount || 0,
                baselimit: item.base_limit || 0,
                child_id: item.child_id || '',
                requested_on: new Date(item.date_of_upload),
                requested_by: item.requestor_name || '',
                status: item.status || '',
                approved_by: item.approved_by || null,
                approved_on: item.approved_on
                    ? typeof item.approved_on === 'string'
                        ? Helper.parseTimestampArray(item.approved_on)
                        : item.approved_on.map((timestamp: string) => new Date(timestamp))
                    : [],
                
            }));
            logger.info(`getGtClReport: Successfully retrieved ${formattedResponse.length} records`);
            return formattedResponse;
        } catch (error) {
            logger.error('Error in getGtClReport:', error);
            throw error;
        }
    },
};
