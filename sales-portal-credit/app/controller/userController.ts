import { Request, Response } from 'express';
import responseTemplate from '../helper/responseTemplate';
import logger from '../lib/logger';
import { UserService } from '../service/user.service';
import { SuccessMessage } from '../constants/successMessage';
import { ErrorMessage } from '../constants/errorMessage';
import UtilityFunctions from '../helper/utilityFunctions';
import { bearerAuth } from '../constants/constants';
import Helper from '../helper';
import { utilService } from '../service/utilService';
import { GT_ACTION_TYPE } from '../constants/constants';

class UserController {
    public static async fetchCreditExtentionRequests(req: Request, res: Response) {
        logger.info('inside UserController -> fetchCreditExtentionRequests');
        try {
            const { queryParams } = req.body;
            const { roles, user_id } = req.user;
            const result = await UserService.fetchCreditExtentionRequests(roles, user_id, queryParams);
            if (result) {
                logger.info(`inside UserController -> fetchCreditExtentionRequests, success, rowCount: ${result.rowCount}`);
                return res.status(200).json(responseTemplate.success(result, SuccessMessage.FETCH_CREDIT_EXTENTION_REQUESTS));
            }
            logger.info(`inside UserController -> fetchCreditExtentionRequests,  failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.FETCH_CREDIT_EXTENTION_REQUESTS));
        } catch (error) {
            logger.error(`inside UserController -> fetchCreditExtentionRequests, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async fetchRequestedDetailsById(req: Request, res: Response) {
        logger.info('inside UserController -> fetchRequestedDetailsById');
        try {
            const { transaction_id } = req.params;
            const result = await UserService.fetchRequestedDetailsById(transaction_id);
            if (result) {
                logger.info(`inside UserController -> fetchRequestedDetailsById, success `);
                return res.status(200).json(responseTemplate.success(result, SuccessMessage.FETCH_ORDER_REQUEST));
            }
            logger.info(`inside UserController -> fetchRequestedDetailsById,  failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.FETCH_ORDER_REQUEST));
        } catch (error) {
            logger.error(`inside UserController -> fetchRequestedDetailsById, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    static async getCreditLimitDetails(req: Request, res: Response) {
        try {
            logger.info(`Fetching credit limit details with request params:`);

            const payer_code = req.params.distributor_id;
            // const distributorId = req.user.login_id;
            const bearer_auth = req.headers['bearer-auth'] || false;
            logger.info(`inside userController->getCreditLimitDetails-> payload headers: ${JSON.stringify(req.headers)}`);
            if (!bearer_auth || bearer_auth !== bearerAuth) return res.status(401).json(responseTemplate.errorMessage(ErrorMessage.PERMISSION_ISSUE));

            // if (payer_code !== distributorId) {
            //     return res.status(403).json(responseTemplate.error('Unauthorized', 'Invalid distributor Id'));
            // }
            const label = `Fetching credit limit details for start in controller ${payer_code}`;

            console.time(label); // Start the timer
            console.timeLog(label, 'start controller');

            const creditResponse = await UtilityFunctions.sendToSapCreditLimit(payer_code);

            console.timeLog(label, '');
            console.timeEnd(label); // End the timer and log the total elapsed time

            if (creditResponse.status == 200) {
                logger.info('Successfully fetched credit limit details with response:');
                res.status(200).json(responseTemplate.success(creditResponse.data, 'Successfully fetched credit limit details'));
                return { success: true, data: creditResponse.data };
            } else {
                logger.info('Failed to Fetch credit limit Details with response:', creditResponse);
                res.status(500).json(responseTemplate.error('Technical Error', 'There is some issue occurred while fetching the credit limit', creditResponse.data));
            }
        } catch (error) {
            logger.error('Error in fetching credit limit:', error);
            res.status(500).json(responseTemplate.error('Technical Error', 'Credit limit is not fetched successfully'));
        }
    }

    public static async insertCreditExtensionRequest(req: Request, res: Response) {
        logger.info('inside UserController -> insertCreditExtentionRequest');
        try {
            const { queryParams } = req.body;
            const { roles, user_id } = req.user;
            const file = req['file'];
            const parsedQueryParams = JSON.parse(queryParams);
            const result = await UserService.insertCreditExtensionRequest(user_id, roles, parsedQueryParams, file);
            if (result) {
                logger.info(`inside UserController -> insertCreditExtensionRequest, success`);
                return res.status(200).json(responseTemplate.success(SuccessMessage.INSERT_CREDIT_EXTENTION_REQUEST));
            }
            logger.info(`inside UserController -> insertCreditExtensionRequest, failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.INSERT_CREDIT_EXTENTION_REQUEST));
        } catch (error) {
            logger.error(`inside UserController -> insertCreditExtentionRequest, Error:`, error);
            res.status(500).json(responseTemplate.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    public static async updateRequestApprover(req: Request, res: Response) {
        logger.info('inside UserController -> updateRequestApprover');
        try {
            const { user_id, roles } = req.user;
            const { queryParams } = req.body;
            const response = await UserService.updateRequestApprover(queryParams, user_id, roles);
            if (response?.success) {
                logger.info(`inside UserController -> updateRequestApprover, success`);
                return res.status(200).json({
                    message: SuccessMessage.UPDATE_CREDIT_EXTENSION_REQUEST,
                    data: response,
                });
            }
            logger.info(`inside UserController -> updateRequestApprover,  failure`);
            return res.status(200).json({
                message: ErrorMessage.UPDATE_CREDIT_EXTENSION_REQUEST,
                data: response,
            });
        } catch (error) {
            logger.error(`inside UserController -> updateRequestApprover, Error:`, error);
            res.status(500).json(responseTemplate.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    public static async getClApproverFinance(req: Request, res: Response) {
        logger.info('inside UserController -> getClApproverFinance');
        try {
            const response = await UserService.getClApproverFinance();
            if (response) {
                logger.info(`inside UserController -> getClApproverFinance, success`);
                return res.status(200).json({
                    message: SuccessMessage.GET_CL_APPROVER_FINANCE,
                    data: response,
                });
            }
            logger.info(`inside UserController -> getClApproverFinance,  failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.GET_CL_APPROVER_FINANCE));
        } catch (error) {
            logger.error(`inside UserController -> getClApproverFinance, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async getClApproverSales(req: Request, res: Response) {
        logger.info('inside UserController -> getClApproverSales');
        try {
            const response = await UserService.getClApproverSales();
            if (response) {
                logger.info(`inside UserController -> getClApproverSales, success`);
                return res.status(200).json({
                    message: SuccessMessage.GET_CL_APPROVER_SALES,
                    data: response,
                });
            }
            logger.info(`inside UserController -> getClApproverSales,  failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.GET_CL_APPROVER_SALES));
        } catch (error) {
            logger.error(`inside UserController -> getClApproverSales, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async insertApproverDetails(req: Request, res: Response) {
        logger.info('inside UserController -> insertApproverDetails');
        try {
            const { user_id } = req.user;
            const { queryParams } = req.body;
            const response = await UserService.insertApproverDetails(queryParams, user_id);
            if (response?.status) {
                logger.info(`inside UserController -> insertApproverDetails, success`);
                return res.status(200).json({
                    // message: SuccessMessage.INSERT_APPROVER_DETAILS,
                    data: response,
                });
            }
            logger.info(`inside UserController -> insertApproverDetails,  failure`);
            return res.status(200).json({
                message: ErrorMessage.INSERT_APPROVER_DETAILS,
                data: response,
            });
        } catch (error) {
            logger.error(`inside UserController -> insertApproverDetails, Error:`, error);
            res.status(500).json(responseTemplate.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    public static async getApproverDetails(req: Request, res: Response) {
        logger.info('inside UserController -> getApproverDetails');
        try {
            const response = await UserService.getApproverDetails();
            if (response) {
                logger.info(`inside UserController -> getApproverDetails, success`);
                return res.status(200).json({
                    message: SuccessMessage.FETCH_APPROVER_DETAILS,
                    data: response,
                });
            }
            logger.info(`inside UserController -> getApproverDetails,  failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.FETCH_APPROVER_DETAILS));
        } catch (error) {
            logger.error(`inside UserController -> getApproverDetails, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }
    public static async getRiskCategory(req: Request, res: Response) {
        logger.info('inside UserController -> getRiskCategory');
        try {
            const response = await UserService.getRiskCategory();
            if (response) {
                logger.info(`inside UserController -> getRiskCategory, success`);
                return res.status(200).json({
                    message: SuccessMessage.FETCH_RISK_CATEGORY,
                    data: response,
                });
            }
            logger.info(`inside UserController -> getRiskCategory,  failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.FETCH_RISK_CATEGORY));
        } catch (error) {
            logger.error(`inside UserController -> getRiskCategory, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async fetchApproversDetails(req: Request, res: Response) {
        try {
            const queryParams = req.body;
            const response = await UserService.fetchApproversDetails(queryParams);
            if (response) {
                logger.info(`inside UserController -> fetchApproversDetails, success`);
                return res.status(200).json({
                    message: SuccessMessage.FETCH_APPROVER_DETAILS,
                    data: response,
                });
            }
            logger.info(`inside UserController -> fetchApproversDetails,  failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.FETCH_APPROVER_DETAILS));
        } catch (error) {
            logger.error(`inside UserController -> fetchApproversDetails, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }
    public static async accountBaseLimitCheck(req: Request, res: Response) {
        logger.info('inside UserController -> accountBaseLimitCheck');
        try {
            const response = await UserService.accountBaseLimitCheck();
            if (response) {
                logger.info(`inside UserController -> accountBaseLimitCheck, success`);
                return res.status(200).json({
                    message: SuccessMessage.FETCH_LATEST_RECORDS,
                    data: response,
                });
            }
            logger.info(`inside UserController -> accountBaseLimitCheck,  failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.FETCH_LATEST_RECORDS));
        } catch (error) {
            logger.error(`inside UserController -> accountBaseLimitCheck, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }
    public static async addApproverConfig(req: Request, res: Response) {
        logger.info('inside UserController -> addApproverConfig');
        try {
            const { user_id } = req.user;

            const { queryParams } = req.body;
            // queryParams(...user_id)
            const response = await UserService.addApproverConfig(queryParams, user_id);
            if (response) {
                logger.info(`inside UserController -> addApproverConfig, success`);
                return res.status(200).json({
                    message: SuccessMessage.ADD_APPROVER_CONFIG,
                    data: response,
                });
            }
            logger.info(`inside UserController -> addApproverConfig,  failure`);
            return res.status(200).json({
                message: ErrorMessage.ADD_APPROVER_CONFIG,
                data: response,
            });
        } catch (error) {
            logger.error(`inside UserController -> addApproverConfig, Error:`, error);
            res.status(500).json(responseTemplate.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    public static async getCategoryList(req: Request, res: Response) {
        logger.info('inside UserController -> getCategoryList');
        try {
            const response = await UserService.getCategoryList();
            if (response) {
                logger.info(`inside UserController -> getCategoryList, success`);
                return res.status(200).json({
                    message: SuccessMessage.GET_CATEGORY_LIST,
                    data: response,
                });
            }
            logger.info(`inside UserController -> getCategoryList,  failure`);
            return res.status(200).json({
                message: ErrorMessage.GET_CATEGORY_LIST,
                data: response,
            });
        } catch (error) {
            logger.error(`inside UserController -> getCategoryList, Error:`, error);
            return res.status(500).json(responseTemplate.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    public static async getUnmappedCustomerGroups(req: Request, res: Response) {
        logger.info('inside UserController -> getUnmappedCustomerGroups');
        try {
            const response = await UserService.getUnmappedCustomerGroups();
            if (response) {
                logger.info(`inside UserController -> getUnmappedCustomerGroups, success`);
                return res.status(200).json({
                    message: SuccessMessage.GET_NEW_CUSTOMER_GROUP,
                    data: response,
                });
            }
            logger.info(`inside UserController -> getUnmappedCustomerGroups,  failure`);
            return res.status(200).json({
                message: ErrorMessage.GET_NEW_CUSTOMER_GROUP,
                data: response,
            });
        } catch (error) {
            logger.error(`inside UserController -> getUnmappedCustomerGroups, Error:`, error);
            return res.status(500).json(responseTemplate.errorMessage(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }

    public static async insertCreditExtensionGTRequest(req: Request, res: Response) {
        logger.info('inside UserController ->insertCreditExtensionGTRequest');
        try {
            const { queryParams } = req.body;
            const { roles, user_id } = req.user;
            const { file } = req;
            const parsedQueryParams = JSON.parse(queryParams);
            const getActionTypeCheck = parsedQueryParams.action_type;
            const checkActionType = getActionTypeCheck === GT_ACTION_TYPE.BASE_LIMIT_UPLOAD || getActionTypeCheck === GT_ACTION_TYPE.ADDITIONAL_LIMIT_UPLOAD;
            const checkAdditionalLimitUpload = getActionTypeCheck === GT_ACTION_TYPE.ADDITIONAL_LIMIT_UPLOAD;
            //Check file is uploaded or not
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                });
            }

            const jsondata = Helper.convertExcelToJson(file, true);

            const commonColumns = ['party code', 'party name', 'base limit', 'start date'];

            // Define the required columns based on action type
            let requiredColumns = [...commonColumns];
            if (getActionTypeCheck === GT_ACTION_TYPE.BASE_LIMIT_UPLOAD) {
                requiredColumns.push('amount', 'end date');
            } else if (checkAdditionalLimitUpload) {
                requiredColumns.push('amount', 'end date', 'type');
            }

            function getAllUniqueKeys(jsonData: object[]): string[] {
                const uniqueKeys = new Set<string>();
                for (const obj of jsonData) {
                    Object.keys(obj).forEach(key => uniqueKeys.add(key));
                }
                return Array.from(uniqueKeys);
            }
            const commonKeys = getAllUniqueKeys(jsondata);

            const missingColumns = requiredColumns.filter((column) => !commonKeys.some((header) => header === (column)));
            
            if (missingColumns.length > 0) {
                return res.status(200).json({
                    success: false,
                    message: `The uploaded file is missing the required columns: ${missingColumns.join(', ').toUpperCase()}`,
                });
            }

            // Check for additional columns
            const additionalColumns = commonKeys.filter((header) => !requiredColumns.includes(header));

            if (additionalColumns.length > 0) {
                return res.status(200).json({
                    success: false,
                    message: `The uploaded file contains the unnecessary columns: ${additionalColumns.join(', ').toUpperCase()}. Please remove it and try again.`,
                });
            }

            const validData = await Promise.all(
                jsondata.map(async(row, index) => {
                    const baseLimitFromDb = await UserService.getBaseLimit(row['party code'].trim());
                    return {
                        ...row,
                        rowNumber: index + 2, 
                        'base limit': !checkActionType ? baseLimitFromDb.base_limit:row['base limit'].trim(), 
                    };
                })
            );

            const filteredData=  validData.filter((row) => {
                    if (getActionTypeCheck === GT_ACTION_TYPE.BASE_LIMIT_REMOVAL || getActionTypeCheck === GT_ACTION_TYPE.ADDITIONAL_LIMIT_REMOVAL) {
                        return row['party code'] && row['party name'] && row['start date'] && row['base limit'] !== undefined && row['base limit'] !== '-' && row['base limit']!==null  ;
                    }
                    return (
                        row['party code'] &&
                        row['party name'] &&
                        row['amount'] &&
                        row['start date'] &&
                        row['end date'] &&
                        row['base limit'] !== undefined &&
                        row['base limit'] !== '-' &&
                        row['base limit'] !==null
                    );
                })
                .map((row) => {
                 
                    return {
                        rowNumber: row.rowNumber,
                        partyCode: row['party code'].trim(),
                        partyName: row['party name'].trim(),
                        amount: !checkActionType ? '0.01' : row['amount'].trim(),
                        startDate: row['start date'].trim(),
                        endDate: !checkActionType ? '12/12/9999' : row['end date'].trim(),
                        base_limit: row['base limit'],
                        type: getActionTypeCheck === GT_ACTION_TYPE.ADDITIONAL_LIMIT_UPLOAD ? row['type'].trim() : '',
                    };
                });

            if (filteredData.length <= 0) {
                return res.status(200).json({
                    success: false,
                    message: 'No valid data found in the file',
                });
            }
            const errors: string[] = [];
            const gtExcel = await utilService.getGTExcelData(parsedQueryParams.cluster_code, parsedQueryParams.action_type);

            filteredData?.forEach((row) => {
                const filePartyCode = String(row?.partyCode).trim();
                const partyName = String(row?.partyName).trim();
                const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
                const numberRegex = /^(?:[1-9]\d*|0)$/;
                const checkDigits = /^\d{1,7}$/;
                const partyCodeData = gtExcel?.find((partyCode) => partyCode.party_code === filePartyCode);
                const [start_date, start_month, start_year] = row?.startDate?.split('/');
                const [end_date, end_month, end_year] = row?.endDate.split('/');
                const formattedStartDate = `${start_year}-${start_month}-${start_date}`;
                const formattedEndDate = `${end_year}-${end_month}-${end_date}`;
                const startDate = new Date(formattedStartDate);
                const endDate = new Date(formattedEndDate);
                const today = new Date();
                startDate.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);

                //Repeated Party code validation
                const partyCodeOccurrences = new Map<string, number[]>();

                filteredData.forEach((row) => {
                    const partyCode = row.partyCode;
                    if (partyCodeOccurrences.has(partyCode)) {
                        partyCodeOccurrences.get(partyCode)?.push(row.rowNumber);
                    } else {
                        partyCodeOccurrences.set(partyCode, [row.rowNumber]);
                    }
                });

                partyCodeOccurrences.forEach((rowNumbers, partyCode) => {
                    if (rowNumbers.length > 1) {
                        const errorMessage = `Payer Code '${partyCode}' is repeated in rows: ${rowNumbers.join(', ')}`;
                        if (!errors.includes(errorMessage)) {
                            errors.push(errorMessage);
                        }
                    }
                });

                //start date validations
                if (!dateRegex.test(row.startDate)) {
                    errors.push(`Row ${row.rowNumber}: Start date (${row.startDate}) should be in DD/MM/YYYY format`);
                } else if (startDate.getDate() !== parseInt(start_date) || startDate.getMonth() + 1 !== parseInt(start_month) || startDate.getFullYear() !== parseInt(start_year)) {
                    errors.push(`Row ${row.rowNumber}: Start date (${row.startDate}) is not a valid date.`);
                } else if (startDate < today) {
                    errors.push(`Row ${row.rowNumber}: Start date (${row.startDate}) should be greater than or equal to today's date.`);
                }

                //end date validations
                if (!dateRegex.test(row.endDate)) {
                    errors.push(`Row ${row.rowNumber}: End date (${row.endDate}) should be in DD/MM/YYYY format`);
                } else if (endDate.getDate() !== parseInt(end_date) || endDate.getMonth() + 1 !== parseInt(end_month) || endDate.getFullYear() !== parseInt(end_year)) {
                    errors.push(`Row ${row.rowNumber}: End date (${row.endDate}) is not a valid date.`);
                } else if (endDate < today) {
                    errors.push(`Row ${row.rowNumber}: End date (${row.endDate}) should be greater than or equal to today's date.`);
                } else if (endDate < startDate) {
                    errors.push(`Row ${row.rowNumber}: End date (${row.endDate}) should be greater than or equal to Start date (${row.startDate}).`);
                }

                //comparing with query data
                if (!partyCodeData) {
                    errors.push(`Row ${row.rowNumber}: Party Code ${row.partyCode} is not valid`);
                } else {
                    if (partyCodeData.party_name.toLowerCase() !== partyName.toLowerCase()) {
                        errors.push(
                            `Row ${row.rowNumber}: Party Name for Party Code '${row.partyCode}' does not match. Expected: ${partyCodeData.party_name}, Found: ${row.partyName}`,
                        );
                    }
                    if (checkActionType) {
                        if (partyCodeData.base_limit !== row.base_limit) {
                            errors.push(
                                `Row ${row.rowNumber}: Base Limit for Party Code '${row.partyCode}' does not match. Expected: ${partyCodeData.base_limit}, Found: ${row.base_limit}`,
                            );
                        }
                    }
                    if (getActionTypeCheck === GT_ACTION_TYPE.ADDITIONAL_LIMIT_UPLOAD) {
                        if (partyCodeData.type !== row.type) {
                            errors.push(`Row ${row.rowNumber}: TYPE for Party Code '${row.partyCode}' does not match. Expected: ${partyCodeData.type}, Found: ${row.type}`);
                        }
                    }
                }

                //Amount validation
                if (checkActionType) {
                    if (!numberRegex.test(row.amount)) {
                        errors.push(`Row ${row.rowNumber}: Amount (${row.amount}) is not a valid number`);
                    } else if (parseFloat(row.amount) === 0) {
                        errors.push(`Row ${row.rowNumber}: Amount should not be zero`);
                    } else if (/^0\d+/.test(row.amount)) {
                        errors.push(`Row ${row.rowNumber}: Amount (${row.amount}) should not start with zero.`);
                    } else if (!checkDigits.test(row.amount)) {
                        errors.push(`Row ${row.rowNumber}: Amount (${row.amount}) should be a maximum of 7 digits.`);
                    }
                }
            });

            if (errors.length > 0) {
                return res.status(200).json({
                    success: false,
                    message: 'Validation Error',
                    errors: errors,
                });
            }

            const result = await UserService.insertCreditExtensionGTRequest(user_id, roles, file, parsedQueryParams, filteredData);
            if (result) {
                logger.info(`inside UserController -> insertCreditExtensionGTRequest, success`);
                return res.status(200).json({
                    success: true,
                    message: `Uploaded ${filteredData.length} valid records Succesfully`,
                    totalRecords: jsondata.length,
                    validRecords: filteredData.length,
                });
            }
            logger.info(`inside UserController -> insertCreditExtensionGTRequest, failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.INSERT_CREDIT_EXTENTION_REQUEST));
        } catch (error) {
            logger.error(`inside UserController -> insertCreditExtensionGTRequest, Error:`, error);
            res.status(500).json(responseTemplate.error(ErrorMessage.INTERNAL_SERVER_ERROR));
        }
    }
    public static async fetchGTCreditExtentionRequests(req: Request, res: Response) {
        logger.info('inside UserController -> fetchGTCreditExtentionRequests');
        try {
            const { queryParams } = req.body;
            const { roles, user_id, email } = req.user;
            const result = await UserService.fetchGTCreditExtentionRequests(roles, user_id, email, queryParams);
            if (result) {
                logger.info(`inside UserController -> fetchGTCreditExtentionRequests, success, rowCount: ${result.rowCount}`);
                return res.status(200).json(responseTemplate.success(result, SuccessMessage.FETCH_CREDIT_EXTENTION_REQUESTS));
            }
            logger.info(`inside UserController -> fetchGTCreditExtentionRequests,  failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.FETCH_CREDIT_EXTENTION_REQUESTS));
        } catch (error) {
            logger.error(`inside UserController -> fetchGTCreditExtentionRequests, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }

    public static async fetchGTRequestedDetailsById(req: Request, res: Response) {
        logger.info('inside UserController -> fetchGTRequestedDetailsById');
        try {
            const { transaction_id } = req.params;
            const result = await UserService.fetchGTRequestedDetailsById(transaction_id);
            if (result) {
                logger.info(`inside UserController -> fetchGTRequestedDetailsById, success `);
                return res.status(200).json(responseTemplate.success(result, SuccessMessage.FETCH_ORDER_REQUEST));
            }
            logger.info(`inside UserController -> fetchGTRequestedDetailsById,  failure`);
            return res.status(200).json(responseTemplate.errorMessage(ErrorMessage.FETCH_ORDER_REQUEST));
        } catch (error) {
            logger.error(`inside UserController -> fetchGTRequestedDetailsById, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }
}

export default UserController;
