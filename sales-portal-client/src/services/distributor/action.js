import {
  REDUX_RESET_STATE,
  DISTRIBUTOR_UPDATE_CREATE_ORDER_FORM_FIELD,
  DISTRIBUTOR_SUBMIT_CREATE_ORDER_FORM,
  DISTRIBUTOR_VALIDATE_CREATE_ORDER_FORM,
  DISTRIBUTOR_INVALIDATE_CREATE_ORDER_FORM,
  DISTRIBUTOR_RESET_CREATE_ORDER_FORM_FIELDS,
  DISTRIBUTOR_RESET_CREATE_ORDER_COMPLETE_FORM_FIELDS,
  DISTRIBUTOR_RESET_CREATE_ORDER_FORM_FIELDS_FOR_LIQ_TOGGLE,
  DISTRIBUTOR_SET_MATERIALS_FIELD,
  DISTRIBUTOR_SET_WAREHOUSES,
  UPDATE_FIELD,
  UPDATE_SECTION,
  UPDATE_TABS,
  UPDATE_LOADED,
  LIQ_MATERIALS,
  FORECAST_FOR_DIST,
  EXCLUDED_MATERIALS,
} from './actionTypes';

import axios from 'axios';
import * as API from '../../api/index';
import { message } from 'antd';
import { isLoading, isSpinning } from '../../constants/actionsConstants';
import config from '../../config/server';
import ReactGA4 from 'react-ga4';
import { logAppIssue } from './actions/errorAction';
import { errorReportFormat } from '../../config/error';
import Auth from '../../util/middleware/auth';
import { hasPermission, teams } from '../../persona/pegasus';

export function stopLoading() {
  return {
    type: 'STOP_LOADING',
  };
}
export function initiateLoading() {
  return {
    type: 'INITIATE_LOADING',
  };
}
export function reduxResetState() {
  return { type: REDUX_RESET_STATE };
}

//----------------------------------------------------------------//
export function distributorUpdateCreateOrderFormField(data) {
  return {
    type: DISTRIBUTOR_UPDATE_CREATE_ORDER_FORM_FIELD,
    payload: data,
  };
}
export function distributorSubmitCreateOrderForm(data) {
  return {
    type: DISTRIBUTOR_SUBMIT_CREATE_ORDER_FORM,
    payload: data,
  };
}
export function distributorInvalidateCreateOrderForm(data) {
  return {
    type: DISTRIBUTOR_INVALIDATE_CREATE_ORDER_FORM,
    payload: data,
  };
}
export function distributorResetCreateOrderFormFields() {
  return { type: DISTRIBUTOR_RESET_CREATE_ORDER_FORM_FIELDS };
}
export function distributorResetCreateOrderCompleteFormFields() {
  return {
    type: DISTRIBUTOR_RESET_CREATE_ORDER_COMPLETE_FORM_FIELDS,
  };
}
export function distributorResetCreateOrderFormFieldsForLiqToggle() {
  return {
    type: DISTRIBUTOR_RESET_CREATE_ORDER_FORM_FIELDS_FOR_LIQ_TOGGLE,
  };
}
export function distributorSetWarehouses(data) {
  return { type: DISTRIBUTOR_SET_WAREHOUSES, payload: data };
}

export function distributorSetMaterialField(data) {
  return { type: DISTRIBUTOR_SET_MATERIALS_FIELD, payload: data };
}

export function distributorValidateCreateOrderForm(status) {
  return {
    type: DISTRIBUTOR_VALIDATE_CREATE_ORDER_FORM,
    payload: status,
  };
}

export function getLiquidationMaterials(status) {
  return { type: LIQ_MATERIALS, payload: status };
}

export function getWarehouseDetails(distributorId) {
  let role = Auth.getRole();
  let apiUrl = null;
  if (role) {
    apiUrl = `${API.url(
      'warehouse_details_admin',
      'sap',
    )}/${distributorId}`;
  } else {
    apiUrl = `${API.url('warehouse_details', 'sap')}`;
  }
  return (dispatch) =>
    axios
      .get(apiUrl)
      .then((response) => {
        let json = response.data;
        if (json.success === true) {
          if (json.data) {
            let { shipping_point, unloading_point } = json.data;
            shipping_point = shipping_point.sort((a, b) =>
              a.partner_name > b.partner_name
                ? 1
                : b.partner_name > a.partner_name
                  ? -1
                  : 0,
            );
            unloading_point = unloading_point.sort((a, b) =>
              a.partner_name > b.partner_name
                ? 1
                : b.partner_name > a.partner_name
                  ? -1
                  : 0,
            );
            const warehouse_details = {
              shipping_point: shipping_point,
              unloading_point: unloading_point,
            };
            dispatch(
              distributorSetWarehouses(
                warehouse_details || { shipping_point: [] },
              ),
            );
          } else {
            dispatch(
              distributorSetWarehouses({
                shipping_point: [],
                unloading_point: [],
              }),
            );
          }
        } else {
          const logs = json.data.d.results.map((item) => {
            delete item.__metadata;
            return item;
          });
          errorReportFormat.distributor_dashboard.whsd_001.errorMessage =
            json.error;
          errorReportFormat.distributor_dashboard.whsd_001.logObj =
            logs;
          dispatch(
            logAppIssue(
              errorReportFormat.distributor_dashboard.whsd_001,
            ),
          );
        }
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.whsd_002.logObj =
          error.response;
        dispatch(
          logAppIssue(
            errorReportFormat.distributor_dashboard.whsd_002,
          ),
        );
        if (error.response) {
          // Request made and server responded
          return error.response.data;
        } else if (error.request) {
          // The request was made but no response was received
          return error.request;
        } else {
          // Something happened in setting up the request that triggered an Error
          return error.message;
        }
      });
}

export function getWarehouseDetailsOnDistChannel(distributorId, distributionChannel, divisionArr) {
  let divisionStr = divisionArr.toString();
  let role = Auth.getRole();
  let apiUrl = null;
  if (role) {
    apiUrl = `${API.url("warehouse_details_dist_channel_admin", "sap")}/${distributorId}/${distributionChannel}/${divisionStr}`;
  } else {
    apiUrl = `${API.url("warehouse_details_dist_channel", "sap")}/${distributionChannel}/${divisionStr}`;
  }
  return dispatch => {
    return axios
      .get(apiUrl)
      .then(response => {
        let json = response.data;
        if (json.success === true) {
          if (json.data) {
            let { shipping_point, unloading_point } = json.data;
            shipping_point = shipping_point.sort((a, b) => (a.partner_name > b.partner_name) ? 1 : ((b.partner_name > a.partner_name) ? -1 : 0))
            unloading_point = unloading_point.sort((a, b) => (a.partner_name > b.partner_name) ? 1 : ((b.partner_name > a.partner_name) ? -1 : 0))
            const warehouse_details = {
              shipping_point: shipping_point,
              unloading_point: unloading_point
            }
            dispatch(distributorSetWarehouses(warehouse_details || { shipping_point: [] }));
            return warehouse_details
          }
          else {
            dispatch(distributorSetWarehouses({ shipping_point: [], unloading_point: [] }));
          }
        } else {
          const logs = json.data.d.results.map((item) => {
            delete item.__metadata;
            return item;
          });
          errorReportFormat.distributor_dashboard.whsd_001.errorMessage = json.error;
          errorReportFormat.distributor_dashboard.whsd_001.logObj = logs;
          dispatch(logAppIssue(errorReportFormat.distributor_dashboard.whsd_001));
        }
      })
      .catch(error => {
        errorReportFormat.distributor_dashboard.whsd_002.logObj = error.response;
        dispatch(logAppIssue(errorReportFormat.distributor_dashboard.whsd_002));
        if (error.response) {
          // Request made and server responded
          return error.response.data;

        } else if (error.request) {
          // The request was made but no response was received
          return error.request;
        } else {
          // Something happened in setting up the request that triggered an Error
          return error.message;
        }

      })
  } 
}

export function getMaterialsCodes(keyword, universalProductType = false, distributorId = null, isSelfLiftingOrder = false, isNourishCo = false) {
  let role = Auth.getRole();
  let apiUrl = null;
  if (role) {
    apiUrl = `${API.url(
      'get_materials_admin',
      'order',
    )}/${distributorId}`;
  } else {
    apiUrl = `${API.url('get_materials', 'order')}`;
  }
  apiUrl += `?isNourishco=${isNourishCo}`;
  if(keyword) apiUrl += `&search_query=${keyword}`;
  if (!universalProductType)  apiUrl += `&distributor_wise_search=true`;
  if (isSelfLiftingOrder) apiUrl += `&self_lifting=true`;
  return axios.get(apiUrl);
}

export const getRegionDetails = (distributorId) => {
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url(
      'distributor_profile_admin',
      'order',
    )}/${distributorId}`;
  } else {
    apiUrl = `${API.url('distributor_profile', 'order')}`;
  }
  return axios.get(apiUrl);
};

export const getSessionsLog = (data) => {
  let apiUrl = `${API.url('sessions', 'auth')}`;
  return (dispatch) => {
    return axios
      .post(apiUrl, data)
      .then((response) => {
        return response;
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.session_001.logObj = {
          data: error.response.config.data,
          error_message: error.response.data,
        };
        dispatch(
          logAppIssue(
            errorReportFormat.distributor_dashboard.session_001,
          ),
        );
      });
  };
};

export const getLIQMaterials = (plant, distChannel, ssoDetails) => {
  let apiUrl;
  if (ssoDetails && (hasPermission(teams.ADMIN) || hasPermission(teams.SALES))) {
    apiUrl = `${API.url('get_liquidation_materials_admin', 'sap')}?plantCode=` + `${plant}` + `&distChannel=` + `${distChannel}`;
  }
  else apiUrl = `${API.url('get_liquidation_materials', 'sap')}?plantCode=` + `${plant}` + `&distChannel=` + `${distChannel}`;

  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        dispatch(
          getLiquidationMaterials({
            data: response.data.data,
          }),
        );
        dispatch(isLoading(false));
      })
      .catch((error) => {
        dispatch(isLoading(false));
        if (error.response) {
          return error.response.data;
        }
      });
  };
};

export function createDistributorSalesOrder(
  data,
  distributorId = null,
  liquidation = null,
  selflifting = null,
  autoOrder = null,
) {
  // let nofity_message = message.info('Creating the sales order...', 1);
  let role = Auth.getRole();
  let apiUrl = null;
  if (role) {
    apiUrl = `${API.url(
      'create_order_admin',
      'sap',
    )}/${distributorId}`;
  } else {
    apiUrl = `${API.url('create_order', 'sap')}`;
  }
  if (liquidation) apiUrl += `?liquidation=true`;
  if (selflifting) apiUrl += `?self_lifting=true`;
  if (autoOrder) apiUrl += `?auto_order=true`;
  return (dispatch) => {
    // dispatch(isLoading(true));
    // nofity_message();
    return axios
      .post(apiUrl, data)
      .then((res) => {
        // dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'PO',
            action: 'Create PO success',
          });
        }
        return res;
      })
      .catch((error) => {
        // dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'PO',
            action: 'Create PO failure',
          });
        }
        if (error.response) {
          // Request made and server responded
          return error.response.data;
        } else if (error.request) {
          // The request was made but no response was received
          return error.request;
        } else {
          // Something happened in setting up the request that triggered an Error
          return error.message;
        }
      });
  };
}

export function validateDistributorSalesOrder(
  data,
  distributorId = null,
  liquidation = null,
  selflifting = null,
  autoOrder = null,
  rushOrder = null,
  bulkOrder = null,
  sendForApproval = null,
) {
  // let nofity_message = message.info(
  //   'Validating the sales order...',
  //   1,
  // );
  let role = Auth.getRole();
  let apiUrl = null;
  if (role) {
    apiUrl = `${API.url(
      'validate_order_admin',
      'sap',
    )}/${distributorId}`;
  } else {
    apiUrl = `${API.url('validate_order', 'sap')}`;
  }
  if (liquidation) apiUrl += `?liquidation=true`;
  if (selflifting) apiUrl += `?self_lifting=true`;
  if (autoOrder) apiUrl += `?auto_order=true`;
  if (rushOrder) apiUrl += `?rush_order=true`;
  if (bulkOrder) apiUrl += `?bulk_order=true`;
  if (sendForApproval) apiUrl += `&send_for_approval=true`; // considering send for approval as query param as it is not required for all the cases, and it will be the second param
  return (dispatch) => {
    // dispatch(isLoading(true));
    // nofity_message();
    return axios
      .post(apiUrl, data)
      .then((res) => {
        dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'PO',
            action: 'Validate PO success',
          });
        }
        return res;
      })
      .catch((error) => {
        // dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'PO',
            action: 'Validate PO failure',
          });
        }

        if (error.response) {
          // Request made and server responded
          return error.response.data;
        } else if (error.request) {
          // The request was made but no response was received
          return error.request;
        } else {
          // Something happened in setting up the request that triggered an Error
          return error.message;
        }
      });
  };
}

export const fetchServiceLevelCategory = (type) => {
  let apiUrl = `${API.url(
    'service_request_category',
    'sap',
  )}/${type}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        dispatch(isLoading(false));
        return response;
      })
      .catch((error) => {
        dispatch(isLoading(false));
      });
  };
};

export function updateField(data) {
  return {
    type: UPDATE_FIELD,
    payload: data,
  };
}
export function updateSection(data) {
  return {
    type: UPDATE_SECTION,
    payload: data,
  };
}

export function updateTabs(data) {
  return {
    type: UPDATE_TABS,
    payload: data,
  };
}

export function updateLoaded(data) {
  return {
    type: UPDATE_LOADED,
    payload: data,
  };
}

export const getDepoCodeMaping = (data) => {
  let apiUrl = `${API.url('depot_code_mapping', 'sap')}`;
  return (dispatch) => {
    return axios
      .post(apiUrl, data)
      .then((response) => {
        return response;
      })
      .catch((error) => {
      });
  };
}

export const getCfaData = (type) => {
  let apiUrl = `${API.url('cfa_details', 'auth')}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        dispatch(isLoading(false));
        return response;
      })
      .catch((error) => {
        dispatch(isLoading(false));
      });
  };
};
export const getCfaDataAdmin = (type) => {
  let apiUrl = `${API.url('cfa_details_admin', 'auth')}`;
  return (dispatch) => {
    return axios
      .get(apiUrl)
      .then((response) => {
        return response;
      })
      .catch((error) => {
      });
  };
};

export const forecastForDist = (data) => {
  return {
    type: FORECAST_FOR_DIST,
    payload: data,
  }
};

export const fetchForecastForDist = (data) => {
  const role = Auth.getRole();
  let api = null;
  if (role)
    api = API.url('fetch_forecast_for_dist_admin', 'ars');
  else
    api = API.url('fetch_forecast_for_dist', 'ars');

  return (dispatch => {
    dispatch(isSpinning({ isSpin: true, text: 'Fetching material data ...' }));
    return axios.post(api, data)
      .then(response => {
        //materials with quantity undefined or empty not to be considered
        const materialArr = response?.data?.data?.filter(item => item.qty != "NaN");
        // dispatch(forecastForDist(materialArr));
        return materialArr;
      }).catch(error => {
        return error?.response?.data;
      }).finally(() => {
        dispatch(isSpinning(false));
      })
  })
};

export const fetchDistributorMoq = (data) => {
  let apiUrl = `${API.url('distributor_moq', 'ars')}`;
  return (dispatch) => {
    return axios
      .post(apiUrl, data)
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        if (error.response) {
          return error.response.data;
        }
      });
  };
};

export function getExcludedMaterial(data) {
  return {
    type: EXCLUDED_MATERIALS,
    payload: data
  }
};

export const getExcludedMaterials = (data, ssoDetails) => {
  const api = ssoDetails ?
    API.url('get_excluded_psku_admin', 'ars')
    : API.url('get_excluded_psku', 'ars');
  return (dispatch) => {
    return axios
      .post(api, data)
      .then((response) => {
        dispatch(
          getExcludedMaterial({ data: response.data.data })
        )
        return response.data;
      })
      .catch((error) => {
        if (error.response)
          return error.response.data;
      })
  }
};

export const sentOrderRequest = (data) => {
  const role = Auth.getRole();
  let api = role ? API.url('sent_order_request_admin', 'order') : API.url('sent_order_request', 'order');
  return (dispatch) => {
    dispatch(isLoading(true))
    return axios
      .post(api,data)
      .then((response) => {
        return response;
      })
      .catch((error) => {
        if (error.response)
          return error.response.data;
      }).finally(() => {
        dispatch(isLoading(false))
      })
  }
};

export const getRoReasons = () => {
  let api = API.url('ro_reasons', 'order');
  return (dispatch) => {
    return axios
      .get(api)
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        if (error.response)
          return error.response.data;
      })
  }
}

export const invalidateOtherSessions = (data) => {
  return async dispatch => {
    dispatch(isLoading(true));
    try {
      try {
        const response = await axios.post(API.url('invalidate_other_sessions', 'auth'), data);
        return response?.data;
      } catch (error) {
        return error;
      }
    } finally {
      dispatch(isLoading(false));
    }
  } 
}

export function validateOrder(
  data
) {
  // let nofity_message = message.info('Validating the sales order...',1);
  let role = Auth.getRole();
  let apiUrl = role ? `${API.url('validate_order_admin_be','sap')}` : `${API.url('validate_order_be', 'sap')}`;
  
  
  // if (sendForApproval) apiUrl += `&send_for_approval=true`; // considering send for approval as query param as it is not required for all the cases, and it will be the second param
  return (dispatch) => {
    // dispatch(isLoading(true));
    // nofity_message();
    return axios
      .post(apiUrl, data)
      .then((res) => {
        dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'PO',
            action: 'Validate PO success',
          });
        }
        return res;
      })
      .catch((error) => {
        // dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'PO',
            action: 'Validate PO failure',
          });
        }

        if (error.response) {
          // Request made and server responded
          return error.response.data;
        } else if (error.request) {
          // The request was made but no response was received
          return error.request;
        } else {
          // Something happened in setting up the request that triggered an Error
          return error.message;
        }
      });
  };
}



export function createOrder(data) {
  // let nofity_message = message.info('Creating the sales order...',1);
  let role = Auth.getRole();
  let apiUrl = role ? `${API.url('create_order_admin_be','sap')}` : `${API.url('create_order_be', 'sap')}`;
  
  return (dispatch) => {
    // dispatch(isLoading(true));
    // nofity_message();
    return axios
      .post(apiUrl, data)
      .then((res) => {
        // dispatch(isLoading(false));
        if (config.app_environment === 'uat' ||config.app_environment === 'prod' ||config.app_environment === 'dev') {
          ReactGA4.event({
            category: 'PO',
            action: 'Create PO success',
          });
        }
        return res;
      })
      .catch((error) => {
        // dispatch(isLoading(false));
        if (config.app_environment === 'uat' ||config.app_environment === 'prod' ||config.app_environment === 'dev') {
          ReactGA4.event({
            category: 'PO',
            action: 'Create PO failure',
          });
        }
        if (error.response) {
          // Request made and server responded
          return error.response.data;
        } else if (error.request) {
          // The request was made but no response was received
          return error.request;
        } else {
          // Something happened in setting up the request that triggered an Error
          return error.message;
        }
      });
  };
}

export function checkARSWindowForRushOrder(distributorId){
  let api = API.url('ro_ars_window_check', 'order') + `/${distributorId}`;
  return (dispatch) => {
    return axios
      .get(api)
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        if (error.response)
          return error.response.data;
      })
  }
}
