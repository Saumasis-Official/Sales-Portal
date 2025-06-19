/**
 * @file user.service
 * @description defines user service methods
 */
import { SapModel } from '../models/sap.model';
import Email from '../helper/email';
import Common_helper from '../helper/index';
import UtilityFunctions from '../helper/utilityFunctions';
import logger from '../lib/logger';
import { LogService } from './LogService';
import axios, { AxiosResponse } from 'axios';
import { mdmTransformer } from '../transformer/mdmTransformer';
import { ErrorMessage } from '../constant/error.message';
import { OrderTypes } from '../../enum/OrderTypes';
import { ValidateOrderInterface } from '../interface/ValidateOrder';
import { validateHelper } from '../helper/validateHelper';
import { ValidateOrderResponse } from '../interface/ValidateOrderResponse';
import { SuccessMessage } from '../constant/sucess.message';
import { roles } from '../constant/persona';
import { createOrderHelper } from '../helper/createOrderHelper';
import { CreateOrderInterface } from '../interface/CreateOrder';
import { CreateOrderResponse } from '../interface/CreateOrderResponse';

const SapConfig = global['configuration'].sap;
const config = {
    method: 'get',
    url: null,
    headers: {
        'X-Requested-With': 'X',
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'Content-Type, api_key, Authorization, Referer',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, PATCH, OPTIONS',
        'Access-Control-Allow-Origin': '*',
    },
    auth: SapConfig.auth,
};

export const SapService = {
    /**
     * @param login_id - otp exist or not
     */
    async userIdExistOrNotOtpTable(login_id: string) {
        return SapModel.userIdExistOrNotOtpTable(login_id);
    },
    /**
     * @param otp - otp exist or not
     */
    async otpExistOrNot(otp: string, login_id: string) {
        return SapModel.checkOtpExistOrNot(otp, login_id);
    },
    /**
     * @param userId -
     */
    async getTseAsmAdminDetails(userId: any) {
        return SapModel.getTseAsmAdminDetails(userId);
    },
    /**
     * returns data
     * @param distId - where condition
     * @param login_id - where condition
     */
    async soNumberWithDistributorId(soNumber: string, distId: string) {
        return SapModel.soNumberWithDistributorId(soNumber, distId);
    },
    /**
     * returns data
     * @param deliveryNumber - where condition
     * @param login_id - where condition
     */
    async getOrderByDeliveryNumber(deliveryNumber, login_id) {
        return SapModel.getOrderByDeliveryNumber(deliveryNumber, login_id);
    },
    /**
     * returns data
     * @param invoiceNumber - where condition
     * @param login_id - where condition
     */
    async getOrderByInvoiceNumber(invoiceNumber, login_id) {
        return SapModel.getOrderByInvoiceNumber(invoiceNumber, login_id);
    },
    /**
     * returns data
     * @param key - where condition
     */
    async getAppLevelSettingsByKeys(keys: string[]) {
        const keysString = "'" + keys.join("','") + "'";
        return SapModel.getAppLevelSettingsByKeys(keysString);
    },
    /**
     * returns data
     * @param login_id - where condition
     */
    async getPDPDayReferenceDateByDistributorId(login_id: string) {
        return SapModel.getPDPDayReferenceDateByDistributorId(login_id);
    },
    async getSapMaterialList(distributionChannels: number[], divisions: number[]) {
        logger.info('inside SapService -> getSapMaterialList');
        try {
            if (distributionChannels.length > 0 && divisions.length > 0) {
                let result: any[] = [];
                const materialListResult = await UtilityFunctions.fetchFromSapMaterialList(distributionChannels, divisions);
                return materialListResult?.data?.d?.results;
            }
            return {
                status: 500,
                message: 'Technical Error, distribution channel or division list can not be empty',
                data: null,
            };
        } catch (error) {
            logger.error('Error in SapService -> getSapMaterialList ', error);
            return {
                status: 500,
                message: 'Technical Error, distribution channel or division list can not be empty',
                data: null,
            };
        }
    },
    async PlantUpdateRequest(data: any, user: any) {
        logger.info('inside plant update request sap service');
        try {
            if (data) {
                const tableName = 'plant_code_update_request';
                const prefix = 'PC';
                let response;
                let pcData: any[] = [];
                let pcDataObj = { pcNo: '', currentPc: '', requestedPc: '', salesDetails: '', status: 'PENDING' };
                let emails = await SapModel.getZonalEmail(data.data[0].plant_name, data.data[0].sales_org, data.data[0].distribution_channel, data.data[0].division);
                let emailList = emails ? emails['zonal_emails'].concat(emails['logistic_emails']) : [];
                let asmDetails =
                    user.roles === 'TSE' || user.roles === 'LOGISTIC_OFFICER'
                        ? await SapModel.getASMDetailByCode(user.code)
                        : { first_name: user.first_name, last_name: user.last_name, email: user.email };
                let asmTseEmails =
                    user.roles === 'TSE' || user.roles === 'LOGISTIC_OFFICER' ? [user.email, asmDetails?.email, emails?.cluster_emails] : [user.email, emails?.cluster_emails];

                for (let x of data.data) {
                    const PC_Number = await Common_helper.generateUId(tableName, 'pc_number', prefix);
                    if (PC_Number) {
                        response = await SapModel.PlantCodeUpdateReques(PC_Number, x, data.dbCode, user, data.name, data.comment);
                        if (response) {
                            pcDataObj['pcNo'] = PC_Number;
                            pcDataObj['currentPc'] = x.previous_sales_details.substring(x.previous_sales_details.length - 4);
                            pcDataObj['requestedPc'] = x.plant_name;
                            pcDataObj['salesDetails'] = x.sales_org + '/' + x.distribution_channel + '/' + x.division;
                            pcData.push({ ...pcDataObj });
                        } else {
                            throw new Error('Unable to save plant_code_update_request');
                        }
                    } else {
                        throw new Error('Unable to generate plant_code_update_number');
                    }
                }
                this.pcPdpEmailSender(
                    emailList,
                    { name: user.first_name + ' ' + user.last_name, code: user.roles === 'SUPER_ADMIN' || user.roles === 'PORTAL_OPERATIONS' ? 'TCPL_ADMIN' : user.code },
                    asmTseEmails,
                    { name: data.name, code: data.dbCode },
                    pcData,
                    data.comment,
                    'pc',
                );

                return response;
            } else {
                logger.info('data is not there in plant update request method inside Sap service');
                return null;
            }
        } catch (error) {
            return null;
        }
    },

    async plantCodeUpdateByLogisticOfficer(data: any, user: any) {
        try {
            const tableName = 'plant_code_update_request';
            const prefix = 'PC';
            let response;
            let pcData: any[] = [];
            let pcDataObj = {
                pcNo: '',
                currentPc: '',
                requestedPc: '',
                salesDetails: '',
                status: !(user.roles === 'LOGISTIC_OFFICER' || user.roles === 'ZONAL_OFFICER') ? 'PENDING' : 'APPROVED',
            };
            let emails = await SapModel.getZonalEmail(data.data[0].plant_name, data.data[0].sales_org, data.data[0].distribution_channel, data.data[0].division);

            let emailList = emails ? emails['zonal_emails'].concat(emails['logistic_emails']) : [];
            let cc = emailList.filter((o: string) => o.toLowerCase() !== user.email.toLowerCase());
            let asmDetails =
                user.roles === 'TSE' || user.roles === 'LOGISTIC_OFFICER'
                    ? await SapModel.getASMDetailByCode(user.code)
                    : { first_name: user.first_name, last_name: user.last_name, email: user.email };
            let asmTseEmails =
                user.roles === 'TSE' || user.roles === 'LOGISTIC_OFFICER' ? [user.email, asmDetails?.email, emails?.cluster_emails] : [user.email, emails?.cluster_emails];
            let tseId = user.first_name + ' ' + user.last_name + ' ' + user.user_id;
            let tseName = user.first_name + ' ' + user.last_name + ' ' + user.code;

            for (const x of data.data) {
                const PC_Number = await Common_helper.generateUId(tableName, 'pc_number', prefix);

                if (PC_Number) {
                    response = await SapModel.updatePlantCodeByLogisticOfficer(PC_Number, x, data.dbCode, user, data.name, data.comment);

                    if (response) {
                        let datas = {
                            pc_number: PC_Number,
                            distributor_code: data.dbCode,
                            distributor_name: data.name,
                            division: x.division,
                            tseName: tseName,
                            tseId: tseId,
                            distribution_channel: x.distribution_channel,
                            sales_org: x.sales_org,
                            request_type: 'Update_Plant',
                            plant_code: x.plant_name,
                            previous_sales_details: x.previous_sales_details,
                            comments: data.comment,
                            status: 'APPROVED',
                            response: data.comment,
                        };

                        await UtilityFunctions.UpdatedPlantCodeMapping(datas);
                        pcDataObj['pcNo'] = PC_Number;
                        pcDataObj['currentPc'] = x.previous_sales_details.substring(x.previous_sales_details.length - 4);
                        pcDataObj['requestedPc'] = x.plant_name;
                        pcDataObj['salesDetails'] = x.sales_org + '/' + x.distribution_channel + '/' + x.division;
                        pcData.push({ ...pcDataObj });
                    } else {
                        pcDataObj['status'] = 'PENDING';
                        throw new Error('Unable to save plant_code_update_request');
                    }
                } else {
                }
            }

            if (!(user.roles === 'ZONAL_OFFICER' || user.roles === 'LOGISTIC_OFFICER')) {
            } else {
                this.pcPdpResponseAutoApprovedEmailSender(
                    { name: user.first_name + ' ' + user.last_name, code: user.roles === 'SUPER_ADMIN' || user.roles === 'PORTAL_OPERATIONS' ? 'TCPL_ADMIN' : user.code },
                    asmTseEmails,
                    { name: data.name, code: data.dbCode },
                    pcData,
                    data.comment,
                    'pc',
                    user.roles,
                    user,
                );
            }

            return response;
        } catch (error) {
            return null;
        }

        //   return response;
    },

    async logisticOfficerResponse(data: any, user: any) {
        logger.info('inside sap serivce logistic officer response');

        try {
            let response_email_data = { to: [''], from: '', cc: [], tse_name: '', tse_code: '', status: '', pcNo: '', db: '', salesDetails: '', pc_old: '', pc_new: '' };
            let emails = await SapModel.getZonalEmail(data.plant_code, data.sales_org, data.distribution_channel, data.division);
            let emailList = emails ? emails['zonal_emails'].concat(emails['cluster_emails']).concat(emails['logistic_emails']) : [];
            let cc = emailList.filter((o: string) => o.toLowerCase() !== user.email.toLowerCase());
            let userDetails = await SapModel.getSSODetailById(data.tseId.trim().substring(data.tseId.trim().lastIndexOf(' ') + 1));
            let asmDetails =
                userDetails.code == null || userDetails.code === '' || userDetails.roles === 'SUPER_ADMIN' || userDetails.roles === 'PORTAL_OPERATIONS'
                    ? { email: user.email }
                    : userDetails.roles === 'TSE'
                      ? await SapModel.getASMDetailByCode(userDetails.code)
                      : { email: user.email };
            let asmTseEmails =
                userDetails.code == null || userDetails.code === '' || userDetails.roles === 'SUPER_ADMIN' || userDetails.roles === 'PORTAL_OPERATIONS'
                    ? [userDetails.email]
                    : [userDetails.email, asmDetails.email];
            let pcOld = data.previous_sales_details.substring(data.previous_sales_details.length - 4);
            response_email_data.to = asmTseEmails;
            response_email_data.from = user.email;
            response_email_data.cc = cc;
            response_email_data.tse_name = userDetails.first_name + ' ' + userDetails.last_name;
            response_email_data.tse_code =
                userDetails.code == null || userDetails.code === '' || userDetails.roles === 'SUPER_ADMIN' || userDetails.roles === 'PORTAL_OPERATIONS'
                    ? 'TCPL_ADMIN'
                    : userDetails.code;
            response_email_data.status = data.status;
            response_email_data.pcNo = data.pc_number;
            response_email_data.db = data.distributor_name + ' (' + data.distributor_code + ')';
            response_email_data.salesDetails =
                data.status === 'REJECTED'
                    ? data.sales_org + '/' + data.previous_sales_details
                    : data.sales_org + '/' + data.distribution_channel + '/' + data.division + '/' + data.plant_code;
            response_email_data.pc_old = pcOld;
            response_email_data.pc_new = data.plant_code;
            const response = await SapModel.logisticOfficerResponse(data, user);

            if (response) {
                if (data.status == 'APPROVED') {
                    const sapResponse = await UtilityFunctions.UpdatedPlantCodeMapping(data);
                    if (sapResponse) {
                        this.pcPdpResponseEmailSender({ ...response_email_data }, 'pc');
                        return sapResponse.data.d;
                    } else {
                        return null;
                    }
                } else {
                    this.pcPdpResponseEmailSender({ ...response_email_data }, 'pc');
                    return response;
                }
            } else {
                return null;
            }
        } catch (error) {
            logger.error('Error in sap.service -> logisticOfficerResponse: ', error);
            return null;
        }
    },
    async pdpUpdateRequest(data: any, user: any) {
        logger.info('inside sap.service -> pdpUpdateRequest');
        try {
            let response: number[] = [];
            let pdpData: any[] = [];
            let pdpDataObj = {
                pdpNo: '',
                currentPdp: '',
                requestedPdp: '',
                salesDetails: '',
                status: !(user.roles === 'LOGISTIC_OFFICER' || user.roles === 'ZONAL_OFFICER') ? 'PENDING' : 'APPROVED',
            };
            let response_email_data = { to: [''], from: '', cc: [], tse_name: '', tse_code: '', status: '', pdpNo: '', db: '', salesDetails: '', pdp_old: '', pdp_new: '' };
            let pdpNo;
            let emails = await SapModel.getZonalEmail(data.pdp_data[0].plant_code, data.pdp_data[0].sales_org, data.pdp_data[0].distribution_channel, data.pdp_data[0].division);
            let emailList = emails ? emails['zonal_emails'].concat(emails['logistic_emails']) : [];
            let cc = emailList.filter((o: string) => o.toLowerCase() !== user.email.toLowerCase());
            let asmDetails =
                user.roles === 'TSE' || user.roles === 'LOGISTIC_OFFICER' || user.roles === 'ZONAL_OFFICER'
                    ? await SapModel.getASMDetailByCode(user.code)
                    : { first_name: user.first_name, last_name: user.last_name, email: user.email };
            let asmTseEmails =
                user.roles === 'TSE' || user.roles === 'LOGISTIC_OFFICER' || user.roles === 'ZONAL_OFFICER'
                    ? [user.email, asmDetails?.email, emails?.cluster_emails]
                    : [user.email, emails?.cluster_emails];

            if (data) {
                for (let d of data.pdp_data) {
                    const pdp_update_request_no = await Common_helper.generateUId('pdp_update_request', 'pdp_update_req_no', 'PDP');
                    let datas = {
                        dbCode: data.dbCode,
                        sales_org: d.sales_org,
                        distribution_channel: d.distribution_channel,
                        division: d.division,
                        pdp_new: d.pdp_requested,
                        ref_date_new: d.ref_date_current,
                    };
                    let responses: any;
                    responses = pdpDataObj.status === 'APPROVED' ? await UtilityFunctions.updatePdpMapping(datas) : '';
                    if (pdp_update_request_no) {
                        if ((user.roles === 'LOGISTIC_OFFICER' || user.roles === 'ZONAL_OFFICER') && responses.status != 201) {
                            throw new Error('Failed to insert pdp update request');
                        }
                        let res = await SapModel.pdpUpdateRequest(pdp_update_request_no, d, data.dbCode, user, data.name, data.comment);
                        if (res) {
                            response.push(res);
                            pdpDataObj['pdpNo'] = pdp_update_request_no;
                            pdpDataObj['currentPdp'] = d.pdp_current;
                            pdpDataObj['requestedPdp'] = d.pdp_requested;
                            pdpDataObj['salesDetails'] = d.sales_org + '/' + d.distribution_channel + '/' + d.division + '/' + d.plant_code;
                            pdpData.push({ ...pdpDataObj });
                        } else throw new Error('Failed to insert pdp update request');
                    } else {
                        throw new Error('UID Generation Failed');
                    }
                }

                if (!(user.roles === 'ZONAL_OFFICER' || user.roles === 'LOGISTIC_OFFICER')) {
                    this.pcPdpEmailSender(
                        emailList,
                        { name: user.first_name + ' ' + user.last_name, code: user.roles === 'SUPER_ADMIN' || user.roles === 'PORTAL_OPERATIONS' ? 'TCPL_ADMIN' : user.code },
                        asmTseEmails,
                        { name: data.name, code: data.dbCode },
                        pdpData,
                        data.comment,
                        'pdp',
                    );
                } else {
                    this.pcPdpResponseAutoApprovedEmailSender(
                        { name: user.first_name + ' ' + user.last_name, code: user.roles === 'SUPER_ADMIN' || user.roles === 'PORTAL_OPERATIONS' ? 'TCPL_ADMIN' : user.code },
                        asmTseEmails,
                        { name: data.name, code: data.dbCode },
                        pdpData,
                        data.comment,
                        'pdp',
                        user.roles,
                        user,
                    );
                }
            } else {
                logger.info('data is not there in pdp_update_request method inside Sap.service');
            }
            return response;
        } catch (error) {
            logger.error('Error in sap.service -> pdpUpdateRequest ', error);
            return [];
        }
    },

    async getPDPUpdateRequests(user: any, payload: any) {
        logger.info('Inside sap.service -> getPDPUpdateRequests ');
        let response = await SapModel.getPDPUpdateRequests(user, payload);
        return response;
    },

    async getPDPUpdateRequestsCount(user: any, payload: any) {
        logger.info('Inside model sap.service -> getPDPUpdateRequestsCount ');
        let response = await SapModel.getPDPUpdateRequestsCount(user, payload);
        return response;
    },

    async pdpUpdateRequestResponse(data: any, user: any) {
        logger.info('Inside sap.service -> pdpUpdateRequestResponse ');

        try {
            let response_email_data = { to: [''], from: '', cc: [], tse_name: '', tse_code: '', status: '', pdpNo: '', db: '', salesDetails: '', pdp_old: '', pdp_new: '' };
            let emails = await SapModel.getZonalEmail(data.plant_code, data.sales_org, data.distribution_channel, data.division);
            let emailList = emails ? emails['zonal_emails'].concat(emails['cluster_emails']).concat(emails['logistic_emails']) : [];
            let cc = emailList.filter((o: string) => o.toLowerCase() !== user.email.toLowerCase());
            let userDetails = await SapModel.getSSODetailByEmail(data.created_by);
            let asmDetails =
                userDetails.code == null || userDetails.code === '' || userDetails.roles === 'SUPER_ADMIN' || userDetails.roles === 'PORTAL_OPERATIONS'
                    ? { email: user.email }
                    : userDetails.roles === 'TSE'
                      ? await SapModel.getASMDetailByCode(userDetails.code)
                      : { email: user.email };
            let asmTseEmails =
                userDetails.code == null || userDetails.code === '' || userDetails.roles === 'SUPER_ADMIN' || userDetails.roles === 'PORTAL_OPERATIONS'
                    ? [data.created_by]
                    : [data.created_by, asmDetails.email];

            response_email_data.to = asmTseEmails;
            response_email_data.from = user.email;
            response_email_data.cc = cc;
            response_email_data.tse_name = userDetails.first_name + ' ' + userDetails.last_name;
            response_email_data.tse_code =
                userDetails.code == null || userDetails.code === '' || userDetails.roles === 'SUPER_ADMIN' || userDetails.roles === 'PORTAL_OPERATIONS'
                    ? 'TCPL_ADMIN'
                    : userDetails.code;
            response_email_data.status = data.status;
            response_email_data.pdpNo = data.pdpNo;
            response_email_data.db = data.dbName + ' (' + data.dbCode + ')';
            response_email_data.salesDetails = data.sales_org + '/' + data.division + '/' + data.distribution_channel + '/' + data.plant_code;
            response_email_data.pdp_old = data.pdp_old;
            response_email_data.pdp_new = data.pdp_new;

            if (data.status == 'APPROVED') {
                const sapResponse = await UtilityFunctions.updatePdpMapping(data);
                if (sapResponse) {
                    const response = await SapModel.pdpUpdateRequestResponse(data, user);
                    if (response != 0) {
                        this.pcPdpResponseEmailSender({ ...response_email_data }, 'pdp');
                        return response;
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            } else {
                const response = await SapModel.pdpUpdateRequestResponse(data, user);
                if (response != 0) {
                    this.pcPdpResponseEmailSender({ ...response_email_data }, 'pdp');
                    return response;
                } else {
                    return null;
                }
            }
        } catch (error) {
            logger.error('Error in sap.service -> pdpUpdateRequestResponse, Error = ', error);
            return null;
        }
    },

    pcPdpEmailSender(to: string[], tse: { name: string; code: string }, cc: string[], db: { name: string; code: string }, tableData: any[], comments: string, type: string) {
        let reqDate = new Date().toLocaleDateString();
        let reqDateArray = reqDate.split('/');
        reqDate = reqDateArray[1] + '/' + reqDateArray[0] + '/' + reqDateArray[2];
        let emailData = {
            to,
            cc,
            tse,
            reqDate,
            db,
            tableData,
            comments,
        };

        try {
            if (type === 'pdp') {
                Email.pdp_update_request(emailData);
            } else Email.pc_update_request(emailData);
        } catch (error) {
            logger.error(`Error while sending ${type}_update_request email ->`, error);
        }
    },

    async pcPdpResponseAutoApprovedEmailSender(
        tse: { name: string; code: string },
        cc: any,
        db: { name: string; code: string },
        tableData: any[],
        comments: string,
        type: string,
        user: any,
        users: any,
    ) {
        let reqDate = new Date().toLocaleDateString();
        let reqDateArray = reqDate.split('/');
        reqDate = reqDateArray[1] + '/' + reqDateArray[0] + '/' + reqDateArray[2];
        let roleType = '';
        if (user === 'LOGISTIC_OFFICER') roleType = 'Logistics team';
        else if (user === 'ZONAL_OFFICER') roleType = 'Zonal team';

        let toEmails: any = [];
        let CCEmails: any = [];

        CCEmails.push(users.email);

        let toEmail = await SapModel.getTseDetails(db.code);

        for (let item of toEmail) {
            if (item.tse_email !== null) {
                toEmails.push(item.tse_email);
            }
            if (item.asm_email !== null) {
                CCEmails.push(item.asm_email);
            }
            if (item.db_email_id !== null) {
                toEmails.push(item.db_email_id);
            }
        }

        let emailData = {
            to: toEmails,
            cc: CCEmails,
            tse,
            reqDate,
            db,
            tableData,
            comments,
            roleType,
        };

        try {
            if (type === 'pdp') Email.pdp_auto_update_request(emailData);
            else Email.pc_auto_update_request(emailData);
        } catch (error) {
            logger.error(`Error while sending ${type}_update_request email ->`, error);
        }
    },
    pcPdpResponseEmailSender(data: any, type: string) {
        try {
            if (type === 'pdp') Email.pdp_update_response(data);
            else Email.pc_update_response(data);
        } catch (error) {
            logger.error(`Error while sending ${type}_update_response email ->`, error);
        }
    },
    async depotCodeMappingService(data: any, user: any) {
        let result: any = [];
        let { divZoneSales, depot_code } = data;
        for (let i = 0; i < depot_code.length; i++) {
            for (let j = 0; j < divZoneSales.length; j++) {
                let response = await SapModel.depotCodeMapping(divZoneSales[j], depot_code[i], user.user.roles, user.user.email);
                if (response) {
                    result.push(response);
                } else {
                }
            }
        }
        return result;
    },

    async fetchPrioritizationByDistributorId(distCode: string) {
        return await SapModel.fetchPrioritizationByDistributorId(distCode);
    },

    async fetchSapHolidayList(year: string | undefined, code: string | undefined, state: string | undefined) {
        logger.info('inside SapService -> fetchSapHolidayList');
        return await SapModel.fetchSapHolidayList(year, code, state);
    },

    async deletePurchaseOrder(po_number: string) {
        logger.info('Inside sap.service -> deletePurchaseOrder, po_number: ' + po_number);
        return await SapModel.deletePurchaseOrder(po_number);
    },

    async updateHolidaySync(selectedYears: any) {
        logger.info('Inside sap.Service -> updateHolidaySync');
        if (!SapConfig.holidayCalendarEndpoint) {
            logger.error(`Error in SapConfig.holidayCalendarEndpoint: not defined in env`);
            LogService.insertSyncLog('SAP_HOLIDAY_SYNC', 'FAIL', null, null, `Error in SapConfig.holidayCalendarEndpoint: not defined in env`);
            return null;
        }

        config.url = `${SapConfig.holidayCalendarEndpoint}?$format=json&fiscal_year=${selectedYears}`;
        config.auth = SapConfig.auth;
        logger.info(`Config send to sap from axios call: ${JSON.stringify(config.url)}`);
        let response = null;
        try {
            response = await axios(config);
            let updateResponse: any;

            if (response.data.d.results.length > 0) {
                const updatedData = mdmTransformer.updateHolidayTransformer(response.data.d.results);
                updateResponse = await SapModel.updateHolidaySync(updatedData);
            }
            if (updateResponse) {
                LogService.insertSyncLog('SAP_HOLIDAY_SYNC', 'SUCCESS', {
                    upsertCount: updateResponse.rowCount,
                    deleteCount: 0,
                });
                return updateResponse;
            }
            if (!response) {
                logger.info(`Response from holiday calendar SAP is undefined or null`);
                return {
                    status: 500,
                    message: 'Technical Error',
                    data: null,
                };
            }
            const { status } = response;
            logger.info('Status received from holiday calendar SAP is: ', {
                status,
            });

            return response;
        } catch (err) {
            logger.error('Error in holiday calendar SAP API call', err);
            LogService.insertSyncLog('SAP_HOLIDAY_SYNC', 'FAIL', null, null, `Sap api failed: ${err}`);
            return null;
        }
    },

    async getOrderDetailsByPoNumber(po_number: string, po_index: number = 1) {
        logger.info('Inside sap.service -> getOrderDetailsByPoNumber, po_number: ' + po_number);
        return SapModel.getOrderDetails(po_number, po_index);
    },

    async fetchCartsCountToday(distributorId: string) {
        logger.info('Inside sap.service -> fetchCartsCountToday, distributorId: ' + distributorId);
        try {
            const fetchCartsCountTodayResponse = await SapModel.fetchCartsCountTodayQuery(distributorId);
            logger.info(`no of carts present today: ${fetchCartsCountTodayResponse?.rows[0] || 'NA'}`);
            return fetchCartsCountTodayResponse.rows[0] ?? false;
        } catch (error) {
            logger.error(`Inside sap.service -> fetchCartsCountToday, Error: `, error);
            return false;
        }
    },

    async savePurchaseOrder(payload: any) {
        logger.info('Inside sap.service -> savePurchaseOrder');
        return SapModel.generatePurchaseOrderNo(payload);
    },

    async validateOrder2(orderData: any, distributorId: string, orderType: OrderTypes, user: any) {
        logger.info('Inside sap.service -> validateOrder2, distributorId: ' + distributorId + ', orderType: ' + orderType);
        const response = { status: false, message: ErrorMessage.VALIDATE_ORDER, data: {} };
        try {
            const validator: ValidateOrderInterface = validateHelper.getValidator(orderType);
            const validateResponse: ValidateOrderResponse = await validator.validate(orderData, distributorId, user);

            if (validateResponse.status) {
                response.status = true;
                response.message = SuccessMessage.VALIDATE_ORDER;
                response.data = validateResponse.data || {};
            } else {
                response.message = validateResponse.message;
                response.data = validateResponse.data || {};
            }
        } catch (error) {
            logger.error('Inside sap.service -> validateOrder2, Error: ', error);
        } finally {
            return response;
        }
    },

    async getPDPWindows(regionId: number) {
        return SapModel.getPDPWindows(regionId);
    },

    async createOrder2(poNumber: string, orderType: OrderTypes, user: any) {
        logger.info('Inside sap.service -> createOrder2, po_number: ' + poNumber + ', orderType: ' + orderType);
        try {
            const creator: CreateOrderInterface = createOrderHelper.getCreator(orderType);
            const createResponse: CreateOrderResponse = await creator.create(poNumber, user);

            return createResponse;
        } catch (error) {
            logger.error('Inside sap.service -> createOrder2, Error: ', error);
            return { status: false, message: error.message || ErrorMessage.CREATE_ORDER, data: error };
        }
    },

    async isPoUnderOrderSubmissionProcessing(poNumber: string | null) {
        logger.info('Inside sap.service -> isPoUnderOrderSubmissionProcessing, po_number: ' + poNumber);
        try {
            if (!poNumber) {
                logger.warn('PO number is null or undefined');
                return true; //restrict PO from further processing
            }
            return await SapModel.isPoUnderOrderSubmissionProcessing(poNumber);
        } catch (error) {
            logger.error('CAUGHT: Error Inside sap.service -> isPoUnderOrderSubmissionProcessing, Error: ', error);
            return false;
        }
    },

    async removePoFromOrderSubmissionProcessing(poNumber: string) {
        logger.info('Inside sap.service -> removePoFromOrderSubmissionProcessing, po_number: ' + poNumber);
        try {
            return await SapModel.removePoFromOrderSubmissionProcessing(poNumber);
        } catch (error) {
            logger.error('CAUGHT: Inside sap.service -> removePoFromOrderSubmissionProcessing, Error: ', error);
            return false;
        }
    },
};
