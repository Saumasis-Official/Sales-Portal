import express, { Request, Response } from 'express';
import { ErrorMessage } from '../constants/errorMessage';
import { SuccessMessage } from '../constants/successMessage';
import logger from '../lib/logger';
import { utilService } from '../service/utilService';
import UtilityFunctions from '../helper/utilityFunctions';
import Template from '../helper/responseTemplate';
import {
    getIsCreditSyncRunning,
    setIsCreditSyncRunning,
    getIsBaseLimitUpdateRunning,
    setIsBaseLimitUpdateRunning,
    setIsGTSyncRunning,
    getIsGTSyncRunning,
    getIsGTStartRunning,
    setIsGTStartRunning,
    getIsGTEndRunning,
    setIsGTEndRunning
    
} from '../constants/constants';
import S3Helper from '../helper/ConnectToS3Bucket';
import * as XLSX from 'xlsx';
import Helper from '../helper';
import responseTemplate from '../helper/responseTemplate';

interface SyncStatus {
    totalCodes: number;
    processed: number;
    failed: string[];
    lastProcessed: string;
    startTime: Date;
}

let syncStatus: SyncStatus | null = null;
const normalizeDecimal = (value: string | number): string => {
    // Convert to number and back to string to remove trailing zeros
    return Number(parseFloat(String(value)).toFixed(2)).toString();
};

class utilController {
    static async userMappingList(req: Request, res: Response) {
        logger.info('inside UtilController -> userMappingList');
        const { user_id } = req?.user;
        try {
            const customerGroupList = await utilService.userMappingList(user_id);
            if (customerGroupList) {
                logger.info('If success fetch', customerGroupList && customerGroupList.rowCount);
                return res.status(200).json(
                    Template.success(
                        {
                            rowCount: customerGroupList.rowCount,
                            rows: customerGroupList.rows,
                        },
                        SuccessMessage.USER_MAPPING_LIST_SUCCESS,
                    ),
                );
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.USER_MAPPING_LIST_ERROR));
        } catch (error) {
            logger.error(`error fetchAreaCodes ${error}`);
            return res.status(500).json(Template.error());
        }
    }

    static async getCustomerGroups(req: Request, res: Response) {
        logger.info('inside UtilController -> getCustomerGroups');
        try {
            const customerGroupList = await utilService.getCustomerGroups();
            if (customerGroupList) {
                logger.info('If success fetch', customerGroupList && customerGroupList.rowCount);
                return res.status(200).json(
                    Template.success(
                        {
                            rowCount: customerGroupList.rowCount,
                            rows: customerGroupList.rows,
                        },
                        SuccessMessage.CUSTOMER_GROUP_LIST_SUCCESS,
                    ),
                );
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.CUSTOMER_GROUP_LIST_ERROR));
        } catch (error) {
            logger.error(`error getCustomerGroups ${error}`);
            return res.status(500).json(Template.error());
        }
    }

    public static async getAccountList(req: Request, res: Response) {
        logger.info('inside UtilController -> getAccountList');
        try {
            const { data } = req.body;
            const accountList = await utilService.getAccountList(data);
            if (accountList) {
                logger.info('If success fetch', accountList && accountList.totalCount);
                return res.status(200).json(
                    Template.success(
                        {
                            totalCount: accountList.totalCount,
                            rowCount: accountList.rowCount,
                            rows: accountList.rows,
                        },
                        SuccessMessage.ACCOUNT_LIST_SUCCESS,
                    ),
                );
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.ACCOUNT_LIST_ERROR));
        } catch (error) {
            logger.error(`error getAccountList ${error}`);
            return res.status(500).json(Template.error());
        }
    }

    public static async runBaseLimitJob(req: Request, res: Response) {
        logger.info('inside utilController -> runBaseLimitJob');
        // check if credit limit sync is already running
        if (getIsCreditSyncRunning()) {
            return res.status(200).json({
                success: false,
                message: 'Credit Limit Sync already running',
                status: syncStatus,
            });
        }

        try {
            const payerCodes = await utilService.getAllPayerCodes();
            if (!Array.isArray(payerCodes) || payerCodes.length === 0) {
                throw new Error('No payer codes found or invalid response');
            }

            // Initialize sync status
            syncStatus = {
                totalCodes: payerCodes.length,
                processed: 0,
                failed: [],
                lastProcessed: '',
                startTime: new Date(),
            };

            // Start background processing
            setIsCreditSyncRunning(true);
            // Send immediate response
            res.status(200).json({
                success: true,
                message: `Starting credit limit sync for ${payerCodes.length} payer codes`,
                status: syncStatus,
            });

            // Start background processing after response is sent
            process.nextTick(() => {
                utilController.processBatchAsync(payerCodes);
            });
        } catch (error) {
            logger.error(`Error initiating credit sync:`, error);
            setIsCreditSyncRunning(false);
            syncStatus = null;
            return res.status(500).json({
                success: false,
                message: 'Failed to start credit sync',
                error: error.message,
            });
        }
    }

    static async processBatchAsync(payerCodes: any[]) {
        const batchSize = 20; // Process 20 codes at a time
        let currentIndex = 0;
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        try {
            logger.info(`Starting batch processing for ${payerCodes.length} payer codes`);
            while (currentIndex < payerCodes.length) {
                const batch = payerCodes.slice(currentIndex, currentIndex + batchSize);
                const batchNumber = Math.floor(currentIndex / batchSize) + 1;
                logger.info(`Processing batch ${batchNumber}, size: ${batch.length}`);
                // Process batch with Promise.all for parallel execution
                await Promise.all(
                    batch.map(async ({ payer_code }) => {
                        try {
                            logger.info(`[${currentIndex + 1}/${payerCodes.length}] Fetching credit limit for: ${payer_code}`);

                            const creditLimitOb = await UtilityFunctions.sendToSapCreditLimit(payer_code);
                            if (creditLimitOb?.data?.d?.results[0]?.CREDIT_LIMIT) {
                                const creditLimit = creditLimitOb.data?.d?.results[0]?.CREDIT_LIMIT;
                                const riskClass = creditLimitOb.data?.d?.results[0]?.RISK_CLASS;

                                logger.info(`Updating base limit for ${payer_code} to ${creditLimit} and Risk class to  ${riskClass}`);
                                // Run base limit job and wait for completion
                                const updateResult = await utilService.runBaseLimitJob(payer_code, creditLimit, riskClass);

                                if (updateResult) {
                                    logger.info(`Successfully updated base limit for ${payer_code}`);
                                } else {
                                    throw new Error(`Failed to update base limit for ${payer_code}`);
                                }
                            } else {
                                throw new Error('No credit limit data');
                            }
                        } catch (error) {
                            logger.error(`Failed to process ${payer_code}:`, error);
                            if (syncStatus) {
                                syncStatus.failed.push(payer_code);
                            }
                        } finally {
                            if (syncStatus) {
                                syncStatus.processed++;
                                syncStatus.lastProcessed = payer_code;
                                logger.info(`Progress: ${syncStatus.processed}/${syncStatus.totalCodes}`);
                            }
                        }
                    }),
                );
                currentIndex += batchSize;
                // Add longer sleep between batches (5 seconds)
                // await new Promise((resolve) => setTimeout(resolve, 1000));
                logger.info(`Batch ${batchNumber} completed. Sleeping for 5 seconds...`);
                await sleep(5000);
                logger.info(`Completed batch. Total progress: ${syncStatus?.processed}/${payerCodes.length}`);
            }
        } catch (error) {
            logger.error('Batch processing error:', error);
        } finally {
            setIsCreditSyncRunning(false);
            const duration = syncStatus ? (new Date().getTime() - syncStatus.startTime.getTime()) / 1000 : 0;
            logger.info('MT Credit limit Sync completed', {
                processed: syncStatus?.processed,
                failed: syncStatus?.failed.length,
                duration: duration,
                failedCodes: syncStatus?.failed,
            });
        }
    }

    public static async getCreditSyncStatus(req: Request, res: Response) {
        return res.status(200).json({
            isRunning: getIsCreditSyncRunning(),
            status: syncStatus,
        });
    }

    static async processBaseLimitUpdates(validData: any[], remarks: string, user_id: string, roles: string) {
        logger.info('Inside utilController -> processBaseLimitUpdates');
        if (getIsBaseLimitUpdateRunning()) {
            return {
                status: 200,
                message: 'Base Limit update already in progress...',
            };
        }
        try {
            setIsBaseLimitUpdateRunning(true);
            (async () => {
                try {
                    for (const record of validData) {
                        try {
                            const getSapResponse = await UtilityFunctions.sendToSapCreditLimit(record.payerCode);
                            const sapCreditlimit = getSapResponse?.data?.d?.results[0]?.CREDIT_LIMIT;
                            const sapResponse = await UtilityFunctions.updateCreditExtention(
                                { updatedBaseLimit: record.updatedBaseLimit },
                                { payercode: record.payerCode },
                                'baseLimit',
                                sapCreditlimit,
                            );

                            const queryParams = {
                                payerCode: `${record.payerCode}`,
                                creditLimit: `Payer Code: ${record.payerCode},Base Limit: ${record.baseLimit}, Updated base limit: ${record.updatedBaseLimit}`,
                                remarks: remarks,
                                userId: user_id,
                                roles: roles,
                                sapResponse: {
                                    status: sapResponse?.status,
                                    sapData: sapResponse?.data?.d,
                                },
                            };
                            const getResponse = await UtilityFunctions.sendToSapCreditLimit(record.payerCode);
                            const creditlimit = getResponse?.data?.d?.results[0]?.CREDIT_LIMIT;
                            const riskClass = getResponse?.data?.d?.results[0]?.RISK_CLASS;
                            if (sapResponse?.status === 201) {
                                await utilService.runBaseLimitJob(record.payerCode, creditlimit, riskClass);
                                await utilService.insertBaseLimitToAuditTrail(queryParams);
                                logger.info(`Updated base limit for ${record.payerCode}`);
                            }
                            else{
                                await utilService.insertBaseLimitToAuditTrail(queryParams);
                            }
                        } catch (recordError) {
                            logger.error(`Error processing record ${record.payerCode}:`, recordError);
                        }
                    }
                } catch (error) {
                    logger.error('Error in background process:', error);
                } finally {
                    setIsBaseLimitUpdateRunning(false);
                }
            })();
        } catch (error) {
            logger.error('Error in processBaseLimitUpdates:', error);
            setIsBaseLimitUpdateRunning(false);
            throw error;
        }
    }

    static async getPayerCodeGroup(payerCode: string) {
        logger.info('Inside utilController -> getPayerCodeGroup');
        try {
            const payerCodeGroup = await utilService.getPayerCodeGroup(payerCode);
            if (payerCodeGroup) {
                logger.info('If success fetch', payerCodeGroup);
                return {
                    status: 200,
                    message: 'Customer Group fetched',
                    data: payerCodeGroup,
                };
            }
            return {
                status: 200,
                message: 'Customer Group not found',
            };
        } catch (error) {
            logger.error(`error getPayerCodeGroup ${error}`);
            return null;
        }
    }

    static async revertBaseLimit(req: Request, res: Response) {
        logger.info('Inside utilController -> revertBaseLimit');
        try {
            const response = await utilService.revertBaseLimit();
            if (response?.status === 201) {
                return res.status(200).json(Template.success(response, SuccessMessage.REVERT_BASE_LIMIT));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.REVERT_BASE_LIMIT));
        } catch (error) {
            logger.error(`error revertBaseLimit ${error}`);
            return res.status(500).json(Template.errorMessage(ErrorMessage.FAILED_REVERT_BASE_LIMIT));
        }
    }

    static async validateAndProcessFile(req: express.Request, res: express.Response) {
        try {
            logger.info('inside Util Controller -> validateAndProcessFile');
            const remarks = req?.body?.remarks;
            const parsedRemarks = JSON.parse(remarks);
            const { roles, user_id } = req?.user;
            const { file } = req;

            //Check file is uploaded or not
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                });
            }

            const workbook = XLSX.read(req.file.buffer);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            const payerCodes: any = await utilService.getAllPayerCodes();

            //validate the data
            const validData = data
                .filter((row) => row['Payer Code'] && row['Payer Name'] && row['Base Limit'] && row['Updated Base Limit'])
                .map((row) => ({
                    payerCode: row['Payer Code'],
                    payerName: row['Payer Name'],
                    baseLimit: row['Base Limit'],
                    // sapLimit: row['SAP Base Limit'],
                    updatedBaseLimit: row['Updated Base Limit'],
                }));

            if (validData.length <= 0) {
                return res.status(200).json({
                    success: false,
                    message: 'No valid data found in the file',
                });
            }
            const errors: string[] = [];
            const checkRepeatedPayerCodes = new Set<string>();

            //compare excel data with database data
            validData?.forEach((row, index) => {
                const payerCode = String(row?.payerCode).trim();
                const baseLimit = String(row?.baseLimit).trim();
                // const sapLimit = String(row?.sapLimit).trim();
                const payerName = String(row?.payerName).trim().replace(/\s+/g, ' ');
                const payerCodeData = payerCodes.find((payer) => payer.payer_code === payerCode);

                // Check for repeated payer codes
                if (checkRepeatedPayerCodes.has(payerCode)) {
                    errors.push(`Row ${index + 1}: Payer Code '${payerCode}' is repeated`);
                } else {
                    checkRepeatedPayerCodes.add(payerCode);
                }

                if (!payerCodeData) {
                    errors.push(`Row ${index + 1}: Payer Code ${row.payerCode} is not valid`);
                } else {
                    if (payerCodeData.payer_name.toLowerCase() !== payerName.toLowerCase()) {
                        errors.push(
                            `Row ${index + 1}: Payer Name for Payer Code '${row.payerCode}' does not match. Expected: ${payerCodeData.payer_name}, Found: ${row.payerName}`,
                        );
                    }
                    if (payerCodeData.base_limit === String(row?.updatedBaseLimit)) {
                        errors.push(`Row ${index + 1}: Base Limit for Payer Code ${row.payerCode} is same as Updated Base Limit. Please provide a different value`);
                    }
                    if (row?.updatedBaseLimit) {
                        const baseLimit = String(row?.updatedBaseLimit).trim();
                        if (/\s/.test(baseLimit)) {
                            errors.push(`Row ${index + 1}: Updated Base Limit '${row.updatedBaseLimit}' for  ${row.payerCode} contains spaces. Please remove spaces`);
                        }
                    }
                    const validNumberPattern = /^\d{1,10}(\.\d{1,2})?$/;
                    if (!validNumberPattern.test(row?.updatedBaseLimit)) {
                        errors.push(
                            `Row ${index + 1}: Updated Base Limit  '${row?.updatedBaseLimit}' for Payer Code ${row.payerCode} is not valid. Please enter a number with up to 10 digits and maximum 2 decimal places`,
                        );
                    }
                    // if (!/^\d{1,10}$/.test(row?.updatedBaseLimit)) {
                    //     errors.push(`Row ${index + 1}: Updated Base Limit '${row?.updatedBaseLimit}' for Payer Code ${row.payerCode} is not valid`);
                    // }
                    if (normalizeDecimal(payerCodeData.base_limit) !== normalizeDecimal(baseLimit)) {
                        errors.push(`Row ${index + 1}: Base Limit for Payer Code ${row.payerCode} does not match. Expected: ${payerCodeData.base_limit}, Found: ${row.baseLimit}`);
                    }
                    // if (payerCodeData.base_limit !== baseLimit) {
                    //     errors.push(`Row ${index + 1}: Base Limit for Payer Code ${row.payerCode} does not match. Expected: ${payerCodeData.base_limit}, Found: ${row.baseLimit}`);
                    // }
                    // if(payerCodeData.sap_base_limit !== sapLimit){
                    //     errors.push(`Row ${index + 1}: SAP Base Limit for Payer Code ${row.payerCode} does not match. Expected: ${payerCodeData.sap_base_limit}, Found: ${row.sapLimit}`);
                    // }
                }
            });

            if (errors.length > 0) {
                return res.status(200).json({
                    success: false,
                    message: 'Validation Error',
                    errors: errors,
                });
            }

            //Customer group (15) validation
            const customerGroups: string[] = [];
            let response;
            for (const param of validData) {
                const payer_code = param.payerCode;
                const response = await utilController.getPayerCodeGroup(payer_code);
                customerGroups.push(response?.data);
            }
            if (customerGroups.includes('15')) {
                return res.status(200).json({
                    success: false,
                    message: `Records of Customer group(15) found. Please remove and retry.`,
                });
            }

            //Upload file to s3 bucket
            let logObj: {
                file_name: string;
                link: string | null | undefined;
            } = {
                file_name: '',
                link: null,
            };
            const tableName = 'credit.cl_account_master';
            const primaryKey = 'file_id';
            const prefix = 'AM';
            const uid: any = await Helper.generateUId(tableName, primaryKey, prefix);
            // Proceed with the next steps if all validations pass
            if (validData.length > 0) {
                await utilService.getValidatedData(validData, user_id);
                if (file) {
                    const fileName = `${uid}/${file.originalname.split('.')[0]}.xlsx`;
                    const fileBuffer = file.buffer;
                    const S3Response = await S3Helper.uploadCreditLimitEmailFile(fileBuffer, fileName, 'accountMaster');
                    if (!S3Response || !S3Response['Location']) {
                        logger.error('inside Util Controller -> upload payment confirmation file, Error: File not uploaded to S3');
                    } else {
                        logObj = {
                            file_name: fileName,
                            link: S3Response['Location'],
                        };
                    }
                }

                await utilService.insertAccountMaster(logObj.file_name, user_id, uid);
                await utilController.processBaseLimitUpdates(validData, parsedRemarks.remarks, user_id, roles);
                for (const { payerCode, updatedBaseLimit } of validData) {
                    logger.info('Inside utilController -> validateAndProcessFile  -> going inside sendToSapCreditLimit');
                    const creditLimitOb = await UtilityFunctions.sendToSapCreditLimit(payerCode);
                    let creditLimit: any;
                    let riskClass: any;
                    if (creditLimitOb && creditLimitOb?.data?.d?.results[0]?.CREDIT_LIMIT) {
                        creditLimit = creditLimitOb?.data?.d?.results[0]?.CREDIT_LIMIT;
                        riskClass = creditLimitOb?.data?.d?.results[0]?.RISK_CLASS;
                        // response = await utilService.runBaseLimitJob(payerCode, creditLimit, riskClass);
                    } else {
                        logger.error('Error in syncing payer code');
                        creditLimit = null;
                    }
                }
                await utilService.updateAccountMaster(logObj.file_name, user_id);
                return res.status(200).json({
                    success: true,
                    message: `Uploaded ${validData.length} valid records Succesfully`,
                    totalRecords: data.length,
                    validRecords: validData.length,
                });
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error processing file',
                error: error.message,
            });
        }
    }

    static async getMtClReport(req: Request, res: Response) {
        logger.info('inside UtilController -> getMtClReport');
        try {
            const { user_id, roles } = req?.user;
            const mtClReport = await utilService.getMtClReport(user_id, roles);
            if (mtClReport) {
                return res.status(200).json(
                    Template.success(
                        {
                            rowCount: mtClReport.length,
                            rows: mtClReport,
                        },
                        SuccessMessage.MT_CL_REPORT_SUCCESS,
                    ),
                );
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.MT_CL_REPORT_ERROR));
        } catch (error) {
            logger.error(`error getMtClReport ${error}`);
            return res.status(500).json(Template.error());
        }
    }

    static async addGTApprovers(req: express.Request, res: express.Response) {
        logger.info('Inside utilController -> addGTApprovers');
        try {
            const { user_id } = req.user;
            const { queryParams } = req.body;
            const approvers = await utilService.addGTApprovers(queryParams, user_id);
            if (approvers) {
                return res.status(200).json(Template.success(approvers, SuccessMessage.GET_GT_APPROVERS_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.GET_GT_APPROVERS_ERROR));
        } catch (error) {
            logger.error(`Error in addGTApprovers ${error}`);
            return res.status(500).json(Template.error());
        }
    }
    static async getCluster(req: express.Request, res: express.Response) {
        logger.info('Inside utilController -> getCluster');
        try {
            const approvers = await utilService.getCluster();
            if (approvers) {
                return res.status(200).json(Template.success(approvers, SuccessMessage.GET_GT_CLUSTER_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.GET_GT_CLUSTER_ERROR));
        } catch (error) {
            logger.error(`Error in getCluster ${error}`);
            return res.status(500).json(Template.error());
        }
    }
    static async getGTApproverDetails(req: Request, res: Response) {
        logger.info('inside UserController -> getGTApproverDetails');
        try {
            const response = await utilService.getGTApproverDetails();
            if (response) {
                logger.info(`inside UserController -> getGTApproverDetails, success`);
                return res.status(200).json({
                    message: SuccessMessage.FETCH_GT_APPROVER_DETAILS,
                    data: response,
                });
            }
            logger.info(`inside UserController -> getGTApproverDetails,  failure`);
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_GT_APPROVER_DETAILS));
        } catch (error) {
            logger.error(`inside UserController -> getGTApproverDetails, Error:`, error);
            res.status(500).json(Template.error());
        }
    }
    public static async updateGTRequestApprover(req: Request, res: Response) {
        logger.info('inside UtilController -> updateGTRequestApprover');
        try {
            const { user_id, roles } = req.user;
            const { queryParams } = req.body;
            const response = await utilService.updateGTRequestApprover(queryParams, user_id, roles);
            if (response?.success) {
                logger.info(`inside UtilController -> updateGTRequestApprover, success`);
                return res.status(200).json({
                    message: SuccessMessage.UPDATE_CREDIT_EXTENSION_REQUEST,
                    data: response,
                });
            }
            logger.info(`inside UtilController -> updateGTRequestApprover,  failure`);
            return res.status(200).json({
                message: ErrorMessage.UPDATE_CREDIT_EXTENSION_REQUEST,
                data: response,
            });
        } catch (error) {
            logger.error(`inside UtilController -> updateGTRequestApprover, Error:`, error);
            res.status(500).json(responseTemplate.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }
    static async gtDownloadExcel(req: Request, res: Response) {
        logger.info('inside UtilController -> gtDownloadExcel');
        try {
            const { clusterCode, action_type } = req.body;
            const gtExcel = await utilService.getGTExcelData(clusterCode, action_type);
            if (gtExcel) {
                return res.status(200).json(
                    Template.success(
                        {
                            rowCount: gtExcel.length,
                            rows: gtExcel,
                        },
                        SuccessMessage.GT_CL_REQUESTORs_DATA,
                    ),
                );
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.GT_CL_REQUESTORS_DATA));
        } catch (error) {
            logger.error(`error gtDownloadExcel ${error}`);
            return res.status(500).json(Template.error());
        }
    }

    static async getGtApprovers(req: express.Request, res: express.Response) {
        logger.info('Inside utilController -> getGtApproversa');
        try {
            const { queryParams } = req.body;
            const approvers = await utilService.getGtApprovers(queryParams);
            if (approvers) {
                return res.status(200).json(Template.success(approvers, SuccessMessage.GET_GT_APPROVERS_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.GET_GT_APPROVERS_ERROR));
        } catch (error) {
            logger.error(`Error in getGtApproversa ${error}`);
            return res.status(500).json(Template.error());
        }
    }
    public static async getGtRequestorDetails(req: Request, res: Response) {
        logger.info('inside UtilController -> getGtRequestorDetails');
        try {
            const { user_id } = req.user;
            const response = await utilService.getGtRequestorDetails(user_id);
            if (response) {
                logger.info(`inside UtilController -> getGtRequestorDetails, success`);
                return res.status(200).json({
                    message: SuccessMessage.FETCH_GT_REQUESTOR_DETAILS,
                    data: response,
                });
            }
            logger.info(`inside UtilController -> getGtRequestorDetails,  failure`);
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_GT_REQUESTOR_DETAILS));
        } catch (error) {
            logger.error(`inside UtilController -> getGtRequestorDetails, Error:`, error);
            res.status(500).json(Template.error());
        }
    }
    public static async fetchGtAddRequestor(req: Request, res: Response) {
        logger.info('inside UtilController -> fetchGtAddRequestor');
        try {
            const { user_id } = req.user;
            const response = await utilService.fetchGtAddRequestor(user_id);
            if (response) {
                logger.info(`inside UtilController -> fetchGtAddRequestor, success`);
                return res.status(200).json({
                    message: SuccessMessage.FETCH_GT_ADD_REQUESTOR,
                    data: response,
                });
            }
            logger.info(`inside UtilController -> fetchGtAddRequestor,  failure`);
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_GT_ADD_REQUESTOR));
        } catch (error) {
            logger.error(`inside UtilController -> fetchGtAddRequestor, Error:`, error);
            res.status(500).json(Template.error());
        }
    }
    public static async addGtRequestor(req: Request, res: Response) {
        logger.info('inside UtilController -> addGtRequestor');
        try {
            const { user_id } = req.user;
            const { queryParams } = req.body;
            queryParams.user_id = user_id;
            const response = await utilService.addGtRequestor(queryParams);
            if (response) {
                logger.info(`inside UtilController -> addGtRequestor, success`);
                return res.status(200).json({
                    message: SuccessMessage.ADD_GT_REQUESTOR,
                    data: response,
                });
            }
            logger.info(`inside UtilController -> addGtRequestor,  failure`);
            return res.status(200).json(Template.errorMessage(ErrorMessage.ADD_GT_REQUESTOR));
        } catch (error) {
            logger.error(`inside UtilController -> addGtRequestor, Error:`, error);
            res.status(500).json(Template.error());
        }
    }

    static async getRequestorClusters(req: express.Request, res: express.Response) {
        logger.info('Inside utilController -> getRegions');
        try {
            const { user_id } = req.user;
            const approvers = await utilService.getRequestorClusters(user_id);
            if (approvers) {
                return res.status(200).json(Template.success(approvers, SuccessMessage.GET_GT_CLUSTER_SUCCESS));
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.GET_GT_CLUSTER_ERROR));
        } catch (error) {
            logger.error(`Error in getRegions ${error}`);
            return res.status(500).json(Template.error());
        }
    }
    static async getCustomerGroupForSettings(req: Request, res: Response) {
        logger.info('inside UtilController -> getCustomerGroupForSettings');
        try {
            const { user_id } = req.user;
            const response = await utilService.getCustomerGroupForSettings(user_id);
            if (response) {
                logger.info(`inside UtilController -> getCustomerGroupForSettings, success`);
                return res.status(200).json({
                    message: SuccessMessage.FETCH_CUSTOMER_GROUP_FOR_SETTINGS,
                    data: response,
                });
            }
            logger.info(`inside UtilController -> getCustomerGroupForSettings,  failure`);
            return res.status(200).json(Template.errorMessage(ErrorMessage.FETCH_CUSTOMER_GROUP_FOR_SETTINGS));
        } catch (error) {
            logger.error(`inside UtilController -> getCustomerGroupForSettings, Error:`, error);
            res.status(500).json(Template.error());
        }
    }
    public static async runGTBaseLimitJob(req: Request, res: Response) {
        logger.info('inside utilController -> runGTBaseLimitJob');
        // check if GT credit limit sync is already running
        if (getIsGTSyncRunning()) {
            return res.status(200).json({
                success: false,
                message: 'GT Credit Limit Sync already running',
                status: syncStatus,
            });
        }

        try {
            const dbCodes = await utilService.fetchAllDistributorCodes();
            if (!Array.isArray(dbCodes) || dbCodes.length === 0) {
                throw new Error('No distributor codes found or invalid response');
            }
            // Initialize sync status
            syncStatus = {
                totalCodes: dbCodes.length,
                processed: 0,
                failed: [],
                lastProcessed: '',
                startTime: new Date(),
            };

            setIsGTSyncRunning(true);
            // Send immediate response
            res.status(200).json({
                success: true,
                message: `Starting GT credit limit sync for ${dbCodes.length} Distributor codes`,
                status: syncStatus,
            });

            // Start background processing after response is sent
            process.nextTick(() => {
                utilController.gt_processBatchAsync(dbCodes);
            });
        } catch (error) {
            logger.error(`Error initiating credit sync:`, error);

            setIsGTSyncRunning(false);
            syncStatus = null;
            return res.status(500).json({
                success: false,
                message: 'Failed to start credit sync',
                error: error.message,
            });
        }
    }
    static async gt_processBatchAsync(dbCodes: any[]) {
        const batchSize = 20; // Process 20 codes at a time
        let currentIndex = 0;
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        try {
            logger.info(`Starting batch processing for ${dbCodes.length} payer codes`);
            while (currentIndex < dbCodes.length) {
                const batch = dbCodes.slice(currentIndex, currentIndex + batchSize);
                const batchNumber = Math.floor(currentIndex / batchSize) + 1;
                logger.info(`Processing batch ${batchNumber}, size: ${batch.length}`);
                // Process batch with Promise.all for parallel execution
                await Promise.all(
                    batch.map(async ({ party_code }) => {
                        try {
                            logger.info(`[${currentIndex + 1}/${dbCodes.length}] Fetching GT credit limit for: ${party_code}`);

                            const creditLimitOb = await UtilityFunctions.sendToSapCreditLimit(party_code);
                            if (creditLimitOb?.data?.d?.results[0]?.CREDIT_LIMIT) {
                                const creditLimit = creditLimitOb.data?.d?.results[0]?.CREDIT_LIMIT;

                                logger.info(`Updating GT base limit for ${party_code} to ${creditLimit}`);
                                // Run base limit job and wait for completion
                                const updateResult = await utilService.runGtBaseLimitJob(creditLimit, party_code);

                                if (updateResult) {
                                    logger.info(`Successfully updated base limit for ${party_code}`);
                                } else {
                                    throw new Error(`Failed to update base limit for ${party_code}`);
                                }
                            } else {
                                throw new Error('No credit limit data');
                            }
                        } catch (error) {
                            logger.error(`Failed to process ${party_code}:`, error);
                            if (syncStatus) {
                                syncStatus.failed.push(party_code);
                            }
                        } finally {
                            if (syncStatus) {
                                syncStatus.processed++;
                                syncStatus.lastProcessed = party_code;
                                logger.info(`Progress: ${syncStatus.processed}/${syncStatus.totalCodes}`);
                            }
                        }
                    }),
                );
                currentIndex += batchSize;
                // Add longer sleep between batches (5 seconds)
                // await new Promise((resolve) => setTimeout(resolve, 1000));
                logger.info(`Batch ${batchNumber} completed. Sleeping for 5 seconds...`);
                await sleep(5000);
                logger.info(`Completed batch. Total progress: ${syncStatus?.processed}/${dbCodes.length}`);
            }
        } catch (error) {
            logger.error('Batch processing error:', error);
        } finally {
            setIsGTSyncRunning(false);
            const duration = syncStatus ? (new Date().getTime() - syncStatus.startTime.getTime()) / 1000 : 0;
            logger.info('GT Credit limit Sync completed', {
                processed: syncStatus?.processed,
                failed: syncStatus?.failed.length,
                duration: duration,
                failedCodes: syncStatus?.failed,
            });
        }
    }

    public static async gtStartTransactionCron(req: Request, res: Response) {
        logger.info('inside utilController -> gtStartTransactionCron');
         // Check if GT start transaction is already running
        if (getIsGTStartRunning()) {
            return res.status(200).json({
                success: false,
                message: 'GT Start Transaction already running',
                isRunning: true,
                startTime: syncStatus?.startTime || new Date()
            });
        }
        try {
            setIsGTStartRunning(true);
            let start_date;
            if (Object.keys(req.body).length === 0 || !req.body.start_date) {
                start_date = new Date().toISOString().split('T')[0];
                logger.info(`No date provided, hence using current date: ${start_date}`);
            } else {
                start_date = req.body.start_date;
                logger.info(`Using provided date: ${start_date}`);
            }
        // Get count of transactions to be processed
        const transactionDetails = await utilService.getGtStartDate(start_date);
        const transactionCount = transactionDetails?.length || 0;
        const uniqueChildIds = [...new Set(transactionDetails?.map(t => t.child_id) || [])];

            // Send immediate response
            res.status(200).json({
                success: true,
                message: 'GT Start Transaction process initiated',
                processDate: start_date,
                totalTransactions: transactionCount,
                childIds: {
                    ids: uniqueChildIds
                },
                status: {
                    startTime: new Date(),
                    totalToProcess: transactionCount,
                    processed: 0,
                    inProgress: true
                }
            });
        // Process in background
        process.nextTick(async () => {
            try {
                const response = await utilService.gtStartTransactionCron(start_date);
                logger.info(`GT Start Transaction completed:`, {
                    date: start_date,
                    successCount: response?.data?.success?.length,
                    failureCount: response?.data?.failed?.length,
                });
            } catch (error) {
                logger.error(`Background processing error:`, error);
            } finally {
                setIsGTStartRunning(false);
            }
        });
            // const response = await utilService.gtStartTransactionCron(start_date);
            // if (response) {
            //     return res.status(response.status).json(response);
            // }
            // return res.status(200).json(Template.errorMessage(ErrorMessage.GT_START_TRANSACTION_CRON));
        } catch (error) {
            logger.error(`error gtStartTransactionCron ${error}`);
            setIsGTStartRunning(false);
                return res.status(500).json({
                    success: false,
                    message: ErrorMessage.GT_START_TRANSACTION_CRON,
                    error: error.message
                });
        }
    }
    public static async gtEndTransactionCron(req: Request, res: Response) {
        logger.info('inside utilController -> getEndTransactionCron');
        // Check if GT start transaction is already running
        if (getIsGTEndRunning()) {
            return res.status(200).json({
                success: false,
                message: 'GT End Transaction already running',
                isRunning: true,
                startTime: syncStatus?.startTime || new Date()
            });
        }
        try {
            setIsGTEndRunning(true);
            let end_date;
            if (Object.keys(req.body).length === 0 || !req.body.end_date) {
                end_date = new Date().toISOString().split('T')[0];
                logger.info(`No End date provided, hence using current date: ${end_date}`);
            } else {
                end_date = req.body.end_date;
                logger.info(`Using provided date as end date: ${end_date}`);
            }
        // Get count of transactions to be processed
        const transactionDetails = await utilService.getGtEndDate(end_date);
        const transactionCount = transactionDetails?.length || 0;
        const uniqueChildIds = [...new Set(transactionDetails?.map(t => t.child_id) || [])];

            // Send immediate response
            res.status(200).json({
                success: true,
                message: 'GT End Transaction process initiated',
                processDate: end_date,
                totalTransactions: transactionCount,
                childIds: {
                    ids: uniqueChildIds
                },
                status: {
                    startTime: new Date(),
                    totalToProcess: transactionCount,
                    processed: 0,
                    inProgress: true
                }
            });
            // Process in background
        process.nextTick(async () => {
            try {
                const response = await utilService.gtEndTransactionCron(end_date);
                logger.info(`GT End Transaction completed:`, {
                    date: end_date,
                    successCount: response?.data?.success?.length,
                    failureCount: response?.data?.failed?.length,
                });
            } catch (error) {
                logger.error(`Background processing error:`, error);
            } finally {
                setIsGTEndRunning(false);
            }
        });
            // const response = await utilService.gtEndTransactionCron(end_date);
            // if (response) {
            //     return res.status(response.status).json(response);
            // }
            // return res.status(200).json(Template.errorMessage(ErrorMessage.GT_END_TRANSACTION_CRON));
        } catch (error) {
            logger.error(`error getEndTransactionCron ${error}`);
            setIsGTEndRunning(false);
                return res.status(500).json({
                    success: false,
                    message: ErrorMessage.GT_START_TRANSACTION_CRON,
                    error: error.message
                });
        }
    }

    static async getGtClReport(req: Request, res: Response) {
        logger.info('inside UtilController -> getGtClReport');
        try {
            const { user_id, roles } = req?.user;
            const gtClReport = await utilService.getGtClReport(user_id, roles);
            if (gtClReport) {
                return res.status(200).json(
                    Template.success(
                        {
                            rowCount: gtClReport.length,
                            rows: gtClReport,
                        },
                        SuccessMessage.GT_CL_REPORT_SUCCESS,
                    ),
                );
            }
            return res.status(200).json(Template.errorMessage(ErrorMessage.GT_CL_REPORT_ERROR));
        } catch (error) {
            logger.error(`error getgtClReport ${error}`);
            return res.status(500).json(Template.error());
        }
    }
}



export default utilController;
