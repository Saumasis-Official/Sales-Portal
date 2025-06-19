'use strict';
import axios from 'axios';
import logger from '../lib/logger';
const SapConfig = global['configuration'].sap;

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
  fetchOpenSO: async (distributorId: string) => {
    logger.info(`Fetching SO in fetchOpenSO`);
    config.url = `${SapConfig.openSOApiEndpoint}/${distributorId}`;
    logger.info(`Config send to api from axios call: ${JSON.stringify(config)}`);
    let response = null;
    try {
      response = await axios(config);
      return response;
    } catch (err) {
      logger.error("Error in the OPEN SO SAP API call:", err);
      return {
        status: 500,
        message: "Technical Error",
        data: null
      };
    }
  }
}

export default UtilityFunctions;
