'use strict';
import moment from 'moment';
import axios, { AxiosResponse } from 'axios';
import logger from '../lib/logger';
import { LogService } from '../service/LogService';
import Util from '../helper/index';
import { CUSTOMER_GROUPS_FOR_ORDERING, allDivisions,SALES_ORG } from '../constant/constants';
const SapConfig = global['configuration'].sap;
const MuleConfig = global['configuration'].mule;
const MTEcomConfig = global['configuration'].mtecom;
const emailConfig = global['configuration'].email;
import Email from './email';
const config = {
  method: 'get',
  url: null,
  headers: {
    'X-Requested-With': 'X',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type, api_key, Authorization, Referer',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Origin': '*'
  },
  auth: SapConfig.auth,
};

const UtilityFunctions = {
  getCurrentDate: () => {
    return moment().format("DD.MM.YYYY");
  },
  getCurrentMMYY: () => {
    return moment().format("MMYY");
  },
  sendToSapReOrder: async (so_number: any) => {
    try {
      logger.info(`Getting so number in sendToSapReOrder:`)
      const config = {
        method: 'get',
        url: `${SapConfig.reOrderApiEndpoint}?$filter=(Sales_Order%20eq%20${so_number})&sap-client=400&sap-language=EN`,
        headers: {
          'X-Requested-With': 'X',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Access-Control-Allow-Headers': 'Content-Type, api_key, Authorization, Referer',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, PATCH, OPTIONS',
          'Access-Control-Allow-Origin': '*'
        },
        auth: SapConfig.auth,
      }
      // logger.info(`config send to sap from axios call: ${JSON.stringify(config)}`);
      const response: AxiosResponse = await axios(config);

      if (!response) {
        logger.info(`Response from Re-Order SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from Re-Order SAP is: ', { status });
      logger.info(`Data received from Re-Order SAP is: `, response && response.data);

      return response;
    } catch (error) {
      logger.error(`Error from re-order sap api:`, error);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }
  },
  sendToSapCreditLimit: async (login_id: any) => {
    try {
      logger.info(`Getting login id in sendToSapCreditLimit method`);
      const config = {
        method: 'get',
        url: `${SapConfig.creditLimitApiEndpoint}?$filter=Distributor%20eq%20'${login_id}'&sap-client=400&sap-language=EN`,
        headers: {
          'X-Requested-With': 'X',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        auth: SapConfig.auth,
      }
      // logger.info(`config send to sap from axios call for credit limit: ${JSON.stringify(config)}`);
      const response: AxiosResponse = await axios(config);

      if (!response) {
        logger.info(`Response from SAP Credit Limit is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from SAP Credit Limit is: ', { status });
      logger.info(`Data received from SAP Credit Limit is: `, response && response.data);

      return response;
    } catch (error) {
      logger.error(`Error from credit limit sap api:`, error);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }
  },
  updateEmailMobile: async (type: string, updateValue: string, loginId: string) => {
    try {
      logger.info(`Getting so number in updateEmailMobile:`)
      let urlValue
      if (type === 'sms') {
        urlValue = `${SapConfig.updateEmailMobileEndpoint}?$filter=Distributor%20eq%20'${loginId}'%20and%20Phone%20eq%20'${updateValue}'&sap-client=400&sap-language=EN`
      } else {
        urlValue = `${SapConfig.updateEmailMobileEndpoint}?$filter=Distributor%20eq%20'${loginId}'%20and%20Email%20eq%20'${updateValue}'&sap-client=400&sap-language=EN`

      }
      logger.info(`config send to sap from axios call: ${JSON.stringify(urlValue)}`);
      const config = {
        method: 'get',
        url: urlValue,
        headers: {
          'X-Requested-With': 'X',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Access-Control-Allow-Headers': 'Content-Type, api_key, Authorization, Referer',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, PATCH, OPTIONS',
          'Access-Control-Allow-Origin': '*'
        },
        auth: SapConfig.auth,
      }
      logger.info(`config send to sap from axios call: ${JSON.stringify(config)}`);
      const response: AxiosResponse = await axios(config);
      if (!response) {
        logger.info(`Response from updateEmailMobile SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from updateEmailMobile SAP is: ', { status });
      logger.info(`Data received from updateEmailMobile SAP is: `, response && response.data);
      return response;
    } catch (error) {
      logger.error(`Error from updateEmailMobile sap api:`, error);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }
  },
  fetchWarehouseDetails: async (distributorId: string) => {
    try {
      logger.info(`Fetching warehouse details in fetchWarehouseDetails`);
      if (!SapConfig.warehouseDetailsApiEndpoint) {
        logger.error(`Error in SapConfig.warehouseDetailsApiEndpoint: not defined in env`);
        return null;
      }
      config.url = `${SapConfig.warehouseDetailsApiEndpoint}?$filter=Distributor%20eq%20'${distributorId}'%20and%20Sales_Org%20eq%20'1010'%20and%20Distribution_channel%20eq%20'10'%20and%20Division%20eq%20'10'&sap-client=400&sap-language=EN`;
      config.auth = SapConfig.auth;
      logger.info(`config send to sap from axios call: ${JSON.stringify(config.url)}`);
      logger.info(`config send to sap from axios call: ${JSON.stringify(config)}`);

      const response: AxiosResponse = await axios(config);


      if (!response) {
        logger.info(`Response from fetchWarehouseDetails SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from fetchWarehouseDetails SAP is: ', { status });
      logger.info(`Data received from fetchWarehouseDetails SAP is: `, response && response.data);
      return response;
    } catch (error) {
      logger.error(`Error from fetchWarehouseDetails sap api:`, error);
      return null;
    }
  },

  fetchWarehouseDetailsOnDistChannel: async (distributorId: string, distributionChannel: any, divisionArr: any) => {
    try {
      let urlDivString = '';
      /**const arr = [...divisionArr]
      if (arr && arr.length > 0) {
        for (let a = 0; a < arr.length; a++) {
          urlDivString += `Division eq '${arr[a]}' `
          if (a < arr.length - 1) {
            urlDivString += 'or '
          }
        }
      } else {
        urlDivString = "Division eq '10'"
      }*/
      urlDivString = Util.urlDivString(divisionArr);

      logger.info(`Fetching warehouse details in fetchWarehouseDetails`);
      if (!SapConfig.warehouseDetailsApiEndpoint) {
        logger.error(`Error in SapConfig.warehouseDetailsApiEndpoint: not defined in env`);
        return null;
      }

      config.url = `${SapConfig.warehouseDetailsApiEndpoint}$filter=Distributor eq '${distributorId}' and Sales_Org eq '1010' and Distribution_channel eq '${distributionChannel}' and (${urlDivString}) &sap-client=400&sap-language=EN`

      config.auth = SapConfig.auth;
      logger.info(`config send to sap from axios call: ${JSON.stringify(config.url)}`);
      logger.info(`config send to sap from axios call: ${JSON.stringify(config)}`);

      const response: AxiosResponse = await axios(config);
      if (!response) {
        logger.info(`Response from fetchWarehouseDetails SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from fetchWarehouseDetails SAP is: ', { status });
      logger.info(`Data received from fetchWarehouseDetails SAP is: `, response && response.data);
      return response;
    } catch (error) {
      logger.error(`Error from fetchWarehouseDetails sap api:`, error);
      return null;
    }
  },
  fetchProducts: async () => {
    logger.info(`Fetching products in fetchProducts`);
    if (!SapConfig.materialsApiEndpoint) {
      logger.error(`Error in SapConfig.materialsApiEndpoint: not defined in env`);
      return null;
    }
    const urlDivString = Util.urlDivString(allDivisions.split(','));
    config.url = `${SapConfig.materialsApiEndpoint}?$filter= Sales_Org eq '1010' and ( Distribution_Channel eq '10' or Distribution_Channel eq '40' or Distribution_Channel eq '90' ) and (${urlDivString})&sap-client=400&sap-language=EN`;
    config.auth = SapConfig.auth;
    logger.info(`Config send to sap from axios call: ${JSON.stringify(config.url)}`);
    let response = null;
    try {
      response = await axios(config);

      if (!response) {
        logger.info(`Response from products/ parent SKUs SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from products/ parent SKUs SAP is: ', { status });
      // logger.info(`Data received from products/ parent SKUs SAP is: `, response && response.data);
      return response;
    } catch (err) {
      logger.error('Error in products/ parent SKUs SAP API call', err);
      return null;
    }
  },
  fetchOpenSO: async (distributorId: string, syncLogExist: boolean, status: string | null = null) => {
    // logger.info(`Fetching SO in fetchOpenSO`);
    logger.info(`Inside SAP microservice for Fetching SO in FetchOpenSO`)

    if (!SapConfig.openSOApiEndpoint) {
      logger.error(`Error in SapConfig.openSOApiEndpoint: not defined in env`);
      return null;
    }
    config.url = `${SapConfig.openSOApiEndpoint}?$filter=Distributor%20eq%20'${distributorId}'%20and%20Days%20eq%20'30'`;
    if (status) {
      logger.info(`status is defined in query filter: ${status}`);
      switch (status) {
        case 'not_delivered':
          logger.info(`inside status not_delivered`);
          config.url += ` and Status eq 'Not Delivered' `;
          break;
        case 'partially_delivered':
          logger.info(`inside status partially_delivered`);
          config.url += ` and Status eq 'Partially Delivered' `;
          break;
        case 'delivered':
          logger.info(`inside status delivered`);
          config.url += ` and Status eq 'Completed' `;
          break;
        case 'all':
          logger.info(`inside status all`);
          break;
        default:
          logger.info(`default case`);
      }
    } /* else if (syncLogExist) {
      logger.info(`sync log exists`);
    } */
    config.url += `&sap-client=400&sap-language=EN`;
    config.auth = SapConfig.auth;
    logger.info(`Config send to sap from axios call: ${JSON.stringify(config.url)}`);
    let response = null;
    try {
      response = await axios(config);

      if (!response) {
        logger.info(`Response from open SO SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from open SO SAP is: ', { status });
      logger.info(`Data received from open SO SAP is: `, response && response.data && response.data.length);

      return response;
    } catch (err) {
      logger.error(`CAUGHT: Error in open SO SAP API call: DB: ${distributorId}`, err);
      return null;
    }
  },
  fetchDistributorsFromSap: async () => {
    logger.info(`Fetching distributors in utilityFunctions.fetchDistributors`);
    //Keeping the urls in the format of [cg] : url to make it easier to display the cg during error
    const dbSyncUrl: { [key: string]: string } = {};
    if (!SapConfig.distributorsApiEndpoint) {
      logger.error(`Error in SapConfig.distributorsApiEndpoint: not defined in env`);
      LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `Error in SapConfig.distributorsApiEndpoint: not defined in env`);
      return null;
    }
    const urlDivString = Util.urlDivString(allDivisions.split(','));
    const salesOrg = Util.salesOrg(SALES_ORG);
    // if (Object.values(params).length) CUSTOMER_GROUPS_FOR_ORDERING = Object.values(params);
    CUSTOMER_GROUPS_FOR_ORDERING.forEach(cg => {
      dbSyncUrl[cg] = `${SapConfig.distributorsApiEndpoint}?$filter=(${salesOrg}) and ( Distribution_Channel eq '10' or Distribution_Channel eq '40' or Distribution_Channel eq '70' or Distribution_Channel eq '90') and ( Customer_group eq '${cg}') and ( ${urlDivString})&sap-client=400&sap-language=EN`
    })
    config.auth = SapConfig.auth;
    logger.info(`Config send to sap from axios call: ${JSON.stringify(config)}`);
    let response = null;
    try {
      //Setting headers separately to store cg during error
      response = await Promise.all(Object.keys(dbSyncUrl).map(cg => (axios({ ...config, url: dbSyncUrl[cg], headers: { ...config.headers, 'cg': cg } }))));

      if (!response) {
        logger.info(`Response from distributors SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response[0];
      logger.info('Status received from distributors SAP is: ', { status });
      let responObj: { status: number, message: string, data: any } = {
        status,
        message: '',
        data: []
      };

      for (let res of response) {
        if (!res?.data?.d?.results) {
          logger.info(`Response from distributors SAP is undefined : ${res}`)
          return null;
        }
        responObj.data.push(...res.data.d.results)
      }
      logger.info(`Data received from distributors SAP is: `, response && response.data);
      return responObj;
    } catch (err) {
      if (err.config) {
        logger.error('Error while fetching distributors for Customer Group :', [err.config.headers.cg]);
        LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `SAP api failed for customer group : ${err.config.headers.cg}`);
        return null
      }
      logger.error('Error in distributors SAP API call', err);
      LogService.insertSyncLog('DISTRIBUTOR', 'FAIL', null, null, `SAP api failed error: ${err.message}`);
      return null
    }
  },
  fetchSODetails: async (soNumber: string) => {
    logger.info(`Fetching distributors in utilityFunctions.fetchSODetails`);
    if (!SapConfig.soDetailsApiEndpoint) {
      logger.error(`Error in SapConfig.soDetailsApiEndpoint: not defined in env`);
      return null;
    }
    config.url = `${SapConfig.soDetailsApiEndpoint}?$filter=Sales_Order_Number%20eq%20'${soNumber}'`;
    config.auth = SapConfig.auth;
    logger.info(`Config send to sap from axios call: ${JSON.stringify(config.url)}`);
    let response = null;

    try {
      response = await axios(config);
      if (!response) {
        logger.info(`Response from SO Details SAP API is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from SO Details SAP is: ', { status });
      logger.info(`Data received from SO Details SAP is: `, response && response.data);
      return response;
    } catch (err) {
      logger.error('Error in SO Details SAP API call', err);
      return null;
    }
  },
  updateSalesHierarchy: async (updateData: any) => {
    try {
      logger.info(`Sent to SAP controller with data:`, updateData);
      const updateDataString = JSON.stringify(updateData);
      const apiUrl = SapConfig.salesHierarchyUpdateApi;


      const config = {
        method: 'post',
        url: apiUrl,
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json',

        },
        auth: SapConfig.auth,
        data: updateDataString,
      };

      logger.info(
        `Config send to sap from axios call: ${JSON.stringify(
          config.data,
        )}`,
      );
      let response = await axios(config);
      return response;
    } catch (err) {
      logger.error('Error in the SAP API call: ', err);
      return null;
    }
  },
  fetchSalesHierarchyDetails: async () => {
    logger.info(`Fetching sales hierarchy in utilityFunctions.fetchSalesHierarchyDetails`);
    if (!SapConfig.salesHierarchyApiEndpoint) {
      logger.error(`Error in SapConfig.salesHierarchyApiEndpoint: not defined in env`);
      return null;
    }

    config.url = `${SapConfig.salesHierarchyApiEndpoint}?$expand=empInfo/jobInfoNav/locationNav,empInfo/personNav/phoneNav/phoneTypeNav,manager&$select=defaultFullName,firstName,lastName,email,country,city,userId,manager/email,empInfo/personNav/phoneNav/isPrimary,empInfo/personNav/phoneNav/phoneNumber,empInfo/personNav/phoneNav/extension,empInfo/personNav/phoneNav/phoneType,empInfo/personNav/phoneNav/phoneTypeNav/localeLabel,empInfo/jobInfoNav/customString21&$format=json&$filter=empInfo/jobInfoNav/customString21 ne 'null'`;
    config.auth = SapConfig.salesHierarchyAuth;

    logger.info(`Config send to sap from axios call: ${JSON.stringify(config.url)}`);
    let response = null;
    try {
      response = await axios(config);
      if (!response) {
        logger.info(`Response from ${SapConfig.salesHierarchyApiEndpoint} is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from SuccessFactor API is: ', { status });
      logger.info(`Data received from SuccessFactor API is: `, response && response.data);
      return response;
    } catch (err) {
      logger.error('Error in SuccessFactor API call', err);
      return err?.response?.data ?? null;
    }
  },
  fetchMaterialsBOMExplode: async (distributor_id, material_code, quantity) => {
    if (!SapConfig.materialsBOMExplodeEndpoint) {
      logger.error(`Error in SapConfig.fetchMaterialsBOMExplode: not defined in env`);
      return null;
    }

    config.url = `${SapConfig.materialsBOMExplodeEndpoint}?$filter=Distributor eq '${distributor_id}' and Material_Entered eq '${material_code}' and Mat_Ent_Quanity eq '${quantity}'`;
    config.auth = SapConfig.auth;
    let response = null;
    try {
      response = await axios(config);
      if (!response) {
        logger.info(`Response from BOM Details SAP API is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      return response;
    } catch (err) {
      logger.error('Error in BOM Details SAP API call', err);
      return null;
    }
  },
  commonSapApiCall: async (url) => {
    const config = {
      method: 'get',
      url: url,
      headers: {
        'X-Requested-With': 'X',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      auth: SapConfig.auth
    };
    logger.info(`Config send to sap from axios call: ${config}`);
    let response = null;

    try {
      response = await axios(config);

      if (!response) {
        logger.info(`Response from SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from SAP is: ', { status });
      logger.info(`Data received from SAP is: `, response && response.data);

      return response;
    } catch (err) {
      logger.error("Error in the SAP API call", err);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      };
    }
  },
  commonSapApiCallPromise: async (url) => {
    const config = {
      method: 'get',
      url: url,
      headers: {
        'X-Requested-With': 'X',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      auth: SapConfig.auth
    };
    logger.info(`Config send to sap from axios call: ${config}`);
    let response = null;

    try {
      response = await axios(config);

      if (!response) {
        logger.info(`Response from SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from SAP is: ', { status });
      logger.info(`Data received from SAP is: `, response && response.data);

      return response && response.data && response.data.d && response.data.d.results;
    } catch (err) {
      logger.error("Error in the SAP API call", err);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      };
    }
  },
  fetchLiquidationMaterials: async (plantCode: string,distChannel: string) => {
    try {
      logger.info(`inside UtilityFunctions fetchLiquidationMaterials`);
      let apiEndpoint = SapConfig.liquidationApiEndpoint + "?$filter=";
      let plantCodeArr = plantCode.split(',');
      const distChannelArr = distChannel.split(','); 
      const distChannelQuery = distChannelArr.map((dc) => `Distribution_Channel eq '${dc}'`).join(' or ');
      if (plantCodeArr.length > 0) {
        apiEndpoint = apiEndpoint + "(";
        for (let i = 0; i < plantCodeArr.length; i++) {
          apiEndpoint = apiEndpoint + "PlantCode eq '" + plantCodeArr[i] + "'";
          if (i !== plantCodeArr.length - 1) {
            apiEndpoint = apiEndpoint + " or ";
          }
        }
        apiEndpoint = apiEndpoint + ") and StorageLocation eq '" + SapConfig.liquidationStorageLocation + "'" + " and Sales_Org eq '1010' and (" + distChannelQuery + ")";
      }
      else {
        apiEndpoint = apiEndpoint + "StorageLocation eq '" + SapConfig.liquidationStorageLocation + "'" + " and Sales_Org eq '1010' and (" + distChannelQuery + ")";
      }
      logger.info(`apiEndpoint: ${apiEndpoint}`);
      const config = {
        method: 'GET',
        url: apiEndpoint,
        headers: {
          'X-Requested-With': 'X',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        auth: SapConfig.auth,
      }

      let response = null;
      try {
        response = await axios(config);
      } catch (err) {
        logger.error("Error in the Liquidation SAP API call: ", err);
      }

      if (!response) {
        logger.info(`Response from Liquidation SAP API is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status, statusText, data } = response;
      logger.info('Status received from Liquidation SAP API is: ', { status });
      //logger.info(`Data received from Liquidation SAP is: `, response && response.data);

      if (status == 200 || status == 201) {
        logger.info(`SAP returned success`);
        return {
          status,
          message: statusText,
          data
        }
      } else {
        logger.info(`SAP returned a non 200/201 response`);
        return {
          status,
          message: statusText,
          data: null
        }
      }
    } catch (error) {
      logger.error(`Error while making the fetchLiquidationMaterials method call: ${error}`);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }
  },
  fetchFromSapMaterialList: async (distributionChannel: number[], division: number[]) => {
    logger.info('Fetching material in fetchFromSapMaterialList');
    try {

      let distChannelFilter = "";
      let divisionFilter = "";
      for (let i = 0; i < distributionChannel.length; i++) {
        distChannelFilter += (i === 0) ? "" : " or";
        distChannelFilter += ` Distribution_Channel eq '${distributionChannel[i]}'`
      }
      distChannelFilter = "(" + distChannelFilter + ")";
      for (let i = 0; i < division.length; i++) {
        divisionFilter += (i == 0) ? "" : " or";
        divisionFilter += ` Division eq '${division[i]}'`;
      }
      divisionFilter = `(${divisionFilter})`;

      if (!SapConfig.materialsApiEndpoint) {
        logger.error('Error in SapConfig.materialApiEndpoint: not defined in .env');
        return null;
      }
      let url = `${SapConfig.materialsApiEndpoint}?$filter=Sales_Org eq '1010' and ${distChannelFilter} and ${divisionFilter}&sap-client=400&sap-language=EN`
      const config = {
        method: 'get',
        url: url,
        headers: {
          'X-Requested-With': 'X',
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Access-Control-Allow-Headers': 'Content-Type, api_key, Authorization, Referer',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, PUT, PATCH, OPTIONS',
          'Access-Control-Allow-Origin': '*'
        },
        auth: SapConfig.auth,
      }
      logger.info(`config send to sap from axios call: ${JSON.stringify(config)}`);
      const response: AxiosResponse = await axios(config)
      if (!response) {
        logger.info(`Response from Re-Order SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from material-list SAP is: ', { status });
      return response;

    } catch (error) {
      logger.error(`Error from material-list sap api:`, error);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }

  },
  UpdatedPlantCodeMapping: async (data: any) => {
    try {
      logger.info(`Sent to SAP controller with data:`, data);
      const PlantCodeUpdateData = JSON.stringify({
        Distributor: data.distributor_code,
        Sales_Org: data.sales_org,
        Distribution_Channel: data.distribution_channel,
        Division: data.division,
        Depot_Code: data.plant_code
      });
      const apiUrl = SapConfig.plantCodeUpdateMapping
      const config = {
        method: 'post',
        url: apiUrl,
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json',

        },
        auth: SapConfig.auth,
        data: PlantCodeUpdateData,
      };

      logger.info(
        `Config send to sap from axios call: ${JSON.stringify(
          config.data,
        )}`,
      );
      let response = await axios(config);
      return response;
    } catch (err) {
      logger.error('Error in the SAP API call: ', err);
      return null;
    }

  },

  updatePdpMapping: async (data: any) => {
    try {
      logger.info(`Inside UtilityFunctions -> updatePdpMapping `);
      const pdpUpdateData = JSON.stringify({
        Distributor: data.dbCode,
        Sales_Org: data.sales_org,
        Distribution_Channel: data.distribution_channel,
        Division: data.division,
        PDP_Day: data.pdp_new,
        Reference_date: data.ref_date_new
      });
      const apiUrl = SapConfig.pdpUpdateMapping
      const config = {
        method: 'post',
        url: apiUrl,
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json',

        },
        auth: SapConfig.auth,
        data: pdpUpdateData,
      };

      logger.info(
        `Inside UtilityFunctions -> updatePdpMapping ,Config send to sap =  ${JSON.stringify(
          config.data,
        )}`,
      );
      let response = await axios(config);
      logger.info(
        `Inside UtilityFunctions -> updatePdpMapping ,Response from sap =  ${response}`,
      );
      return response;
    } catch (error) {
      logger.error('Inside UtilityFunctions -> updatePdpMapping ,Error = ', error);
      return null;
    }

  },
  dbSyncFailed(type: any) {
    const email = emailConfig.reportAutoValidationErrorMailIds
    const data = {
      email,
      type
    }
    Email.dbSyncFailed(data);
  },
  getMrpAndCaselotCheckDetails: async (data: any) => {
    try {
      logger.info(`Getting data in getMrpAndCaselotCheckDetails:`)
      const apiUrl = MTEcomConfig.mrpCaselotUrl
      const config = {
        method: 'post',
        url: apiUrl,
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        auth: MTEcomConfig.auth,
        data: data
      }
      const response: AxiosResponse = await axios(config);
      if (!response) {
        logger.info(`Response from Re-getMrpAndCaselotCheckDetails SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from getMrpAndCaselotCheckDetails SAP is: ', { status });
      logger.info(`Data received from getMrpAndCaselotCheckDetails SAP is: `, response && response.data);
      return response;
    } catch (error) {
      logger.error(`Error from getMrpAndCaselotCheckDetails sap api:`, error);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }
  },
  createSO: async (data: any) => {
    try {
      logger.info(`Getting data in createSO:`)
      const apiUrl = MTEcomConfig.soCreationUrl
      const config = {
        method: 'post',
        url: apiUrl,
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        auth: MTEcomConfig.auth,
        data: data
      }
      const response: AxiosResponse = await axios(config);
      if (!response) {
        logger.info(`Response from createSO SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from createSO SAP is: ', { status });
      logger.info(`Data received from createSO SAP is: `, response && response.data);
      return response;
    } catch (error) {
      logger.error(`Error from createSo sap api:`, error);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }
  },
  getMrp2CheckDetails: async (data: any) => {
    try {
      logger.info(`Getting data in getMrp2CheckDetails:`)
      const apiUrl = MTEcomConfig.mrpCheck2Url
      const config = {
        method: 'post',
        url: apiUrl,
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        auth: MTEcomConfig.auth,
        data: data
      }
      logger.info("inside utilityFunction -> getMrp2CheckDetails config", config);
      logger.info("inside utilityFunction -> getMrp2CheckDetails data", data);
      const response: AxiosResponse = await axios(config);
      logger.info("inside utilityFunction -> getMrp2CheckDetails response", response);
      if (!response) {
        logger.info(`Response from getMrp2CheckDetails SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from getMrp2CheckDetails SAP is: ', { status });
      logger.info(`Data received from getMrp2CheckDetails SAP is: `, response && response.data);
      return response;
    } catch (error) {
      logger.error(`Error from getMrp2CheckDetails sap api:`, error);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }
  },
  getSODetails: async (data: any) => {
    try {
      logger.info(`Getting data in getSODetails:`)
      const apiUrl = MTEcomConfig.getSODetailsUrl
      const config = {
        method: 'get',
        url: apiUrl + "?$filter=Sales_Order_Number eq '" + data?.so_number + "' &sap-client=400&sap-language=EN",
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        auth: MTEcomConfig.auth
      }
      const response: AxiosResponse = await axios(config);
      if (!response) {
        logger.info(`Response from getSODetails SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from getSODetails SAP is: ', { status });
      logger.info(`Data received from getSODetails SAP is: `, response && response.data);
      return response;
    } catch (error) {
      logger.error(`Error from getSODetails sap api:`, error);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }
  },
  getAmendmentDetails: async (data: any) => {
    try {
      logger.info(`Getting data in getAmendmentDetails:`)
      const apiUrl = MTEcomConfig.amendmentUrl
      const config = {
        method: 'get',
        url: apiUrl + "?$expand=NAVITEM/NAVSCHLINES&$filter=PoNumber eq '" + data?.po_number + "'&$format=json",
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        auth: MTEcomConfig.auth
      }
      const response: AxiosResponse = await axios(config);
      if (!response) {
        logger.info(`Response from getAmendmentDetails SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from getAmendmentDetails SAP is: ', { status });
      logger.info(`Data received from getAmendmentDetails SAP is: `, response && response.data);
      return response;
    } catch (error) {
      logger.error(`Error from getAmendmentDetails sap api:`, error);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }
  },
  createAmendment: async (data: any) => {
    try {
      logger.info(`Getting data in createAmendment:`)
      const apiUrl = MTEcomConfig.amendmentUrl
      const config = {
        method: 'post',
        url: apiUrl,
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        auth: MTEcomConfig.auth,
        data: data
      }
      const response: AxiosResponse = await axios(config);
      if (!response) {
        logger.info(`Response from createAmendment SAP is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from createAmendment SAP is: ', { status });
      logger.info(`Data received from createAmendment SAP is: `, response && response.data);
      return response;
    } catch (error) {
      logger.error(`Error from createAmendment sap api:`, error);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      }
    }
  },
  fetchProductHierarchy: async () => {
    logger.info("inside UtilityFunctions -> fetchProductHierarchy");
    const url = MuleConfig.productHierarchyApi;
    if (!url) {
      logger.error("Error in MuleConfig.productHierarchyApi: not defined in env");
      return null;
    }
    const config = {
      method: 'get',
      url,
      headers: {
        'Content-Type': 'application/json',
        'client_id': MuleConfig.clientId,
        'client_secret': MuleConfig.clientSecret,
        'x-transaction-id': MuleConfig.xTransactionId,
      }
    };
    logger.info(`Config send to mule from axios call: ${JSON.stringify(config.url)}`);
    try {
      const response = await axios(config);
      if (!response) {
        logger.info(`Response from ${JSON.stringify(config)} is undefined or null`);
        return {
          status: 500,
          message: "Technical Error",
          data: null
        };
      }
      const { status } = response;
      logger.info('Status received from SuccessFactor API is: ', { status });
      logger.info(`Data received from SuccessFactor API is: `, response && response.data);
      return response;
    } catch (err) {
      logger.error('Error in SuccessFactor API call', err);
      return err?.response?.data ?? null;
    }

  },

  sendToSAPForAutoClosure: async (payload) => {
    try {
      logger.info(`Inside UtilityFunctions -> sendToSAPForAutoClosure`);
      const apiUrl = SapConfig.autoClosureApi;
      const config = {
        method: 'post',
        url: apiUrl,
        headers: {
          'X-Requested-With': 'X',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        auth: SapConfig.auth,
        data: JSON.stringify(payload)
      };
      let response = await axios(config);
      return response;
    } catch (err) {
      logger.error('CAUGHT: Error in UtilityFunctions -> sendToSAPForAutoClosure: ', err);
      return null;
    }
  },
}

export default UtilityFunctions;