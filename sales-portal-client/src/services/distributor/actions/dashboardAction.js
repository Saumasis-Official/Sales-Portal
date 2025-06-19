import {
  DASHBOARD_CREDIT_DETAILS,
  DASHBOARD_PO_DETAILS,
  DASHBOARD_ORDER_LIST,
  DASHBOARD_REGION_DETAILS,
  DASHBOARD_SET_ALL_MATERIALS,
  DASHBOARD_SET_WAREHOUSES,
  ALERT_DETAILS,
  ORDER_DEATILS_HEADER_DATA,
  ALERT_COMMENT_LIST,
} from './dashboardActionTypes';
import axios from 'axios';
import config from '../../../config/server';
import ReactGA4 from 'react-ga4';
import * as API from '../../../api/index';
import { isLoading } from '../../../constants/actionsConstants';
import Auth from '../../../util/middleware/auth';
import { logAppIssue } from './errorAction';
import { errorReportFormat } from '../../../config/error';

//----------------------------------------------------------------//
export const dashboardSetAllMaterials = (data) => {
  return {
    type: DASHBOARD_SET_ALL_MATERIALS,
    payload: data,
  };
};

export const dashboardGetOrderList = (data) => {
  return {
    type: DASHBOARD_ORDER_LIST,
    payload: data,
  };
};

export const dashboardGetRegionDetails = (data) => {
  return {
    type: DASHBOARD_REGION_DETAILS,
    payload: data,
  };
};

export const dashboardGetCreditLimitDetails = (data) => {
  return {
    type: DASHBOARD_CREDIT_DETAILS,
    payload: data,
  };
};

export const dashboardSetWarehouses = (data) => {
  return {
    type: DASHBOARD_SET_WAREHOUSES,
    payload: data,
  };
};

export const dashboardSetPODetails = (data) => {
  return {
    type: DASHBOARD_PO_DETAILS,
    payload: data,
  };
};

export const setAlertDetails = (data) => {
  return {
    type: ALERT_DETAILS,
    payload: data,
  };
};

export const oderDetailsGetData = (data) => {
  return {
    type: ORDER_DEATILS_HEADER_DATA,
    payload: data,
  };
};

export const dashboardSetAlertCommentList = (data) => {
  return {
    type: ALERT_COMMENT_LIST,
    payload: data,
  };
};

export const getAllMaterials = (distributorId,isNourishCo=false) => {
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url(
      'get_materials_admin',
      'order',
    )}/${distributorId}`;
  } else {
    apiUrl = `${API.url('get_materials', 'order')}`;
  }
  apiUrl += `?isNourishco=${isNourishCo}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        dispatch(dashboardSetAllMaterials(response.data.data));
        dispatch(isLoading(false));
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.mtrl_001.logObj =
          error.response;
        dispatch(
          logAppIssue(
            errorReportFormat.distributor_dashboard.mtrl_001,
          ),
        );
        dispatch(isLoading(false));
      });
  };
};

export const getOrderList = (data) => {
  const {
    page_no = '',
    items_per_page = '',
    searchItem = '',
    fromDate,
    toDate,
    distributorId,
  } = data;
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url(
      `get_order_list_admin`,
      'order',
    )}/${distributorId}?page_no=${page_no}&items_per_page=${items_per_page}`;
  } else {
    apiUrl = `${API.url(
      'get_order_list',
      'order',
    )}?page_no=${page_no}&items_per_page=${items_per_page}`;
  }
  if (searchItem) {
    apiUrl += `&po_so_number=${searchItem}`;
  }
  //changes for SOPE-47
  if (fromDate) {
    if (toDate) {
      apiUrl += `&from_date=${fromDate}&to_date=${toDate}`;
    }
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        dispatch(
          dashboardGetOrderList({
            data: response.data.data,
            drafts: response.data.drafts,
            rushDrafts: response.data.rushDrafts,
            totalCount: response.data.totalCount,
            sync: response.data.sync,
            lastSync: response.data.lastSync,
          }),
        );
        dispatch(isLoading(false));
        return response.data.data;
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.po_001.logObj =
          error.response;
        dispatch(
          logAppIssue(errorReportFormat.distributor_dashboard.po_001),
        );
        dispatch(isLoading(false));
      });
  };
};

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
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        if (response && response.data && response.data.data) {
          dispatch(dashboardGetRegionDetails(response.data.data));
          
          return response.data.data;
        } else {
          errorReportFormat.distributor_dashboard.profile_001.logObj =
            response;
          dispatch(
            logAppIssue(
              errorReportFormat.distributor_dashboard.profile_001,
            ),
          );
        }
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.profile_002.logObj =
          error.response;
        dispatch(
          logAppIssue(
            errorReportFormat.distributor_dashboard.profile_002,
          ),
        );
      })
      .finally(() => {
        dispatch(isLoading(false));
      });
  };
};

export const getWarehouseDetails = (distributorId) => {
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url(
      'warehouse_details_admin',
      'sap',
    )}/${distributorId}`;
  } else {
    apiUrl = `${API.url('warehouse_details', 'sap')}`;
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        let json = response.data;
        if (json.success === true) {
          dispatch(dashboardSetWarehouses(json.data));
          dispatch(isLoading(false));
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
        dispatch(isLoading(false));
      });
  };
};

export const getPODetails = (id, distributor_id) => {
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url(
      'poDetailsAdmin',
      'order',
    )}/${id}/${distributor_id}`;
  } else {
    apiUrl = `${API.url(
      'poDetails',
      'order',
    )}/${id}/${distributor_id}`;
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        let json = response.data;
        dispatch(dashboardSetPODetails(json.data));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'PO',
            action: 'Get PO details success',
          });
        }
        return response.data.data;
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.po_002.logObj =
          error.response.data;
        dispatch(
          logAppIssue(errorReportFormat.distributor_dashboard.po_002),
        );
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'PO',
            action: 'Get PO details failure',
          });
        }
      })
      .finally(() => {
        dispatch(isLoading(false));
      });
  };
};

export const getAlterDetails = (data) => {
  const apiUrl = `${API.url('get_alert', 'auth')}/${data.login_id}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        let json = response.data;
        dispatch(setAlertDetails(json.data));
        dispatch(isLoading(false));
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.alerts_001.logObj =
          error.response.data;
        dispatch(
          logAppIssue(
            errorReportFormat.distributor_dashboard.alerts_001,
          ),
        );
        dispatch(isLoading(false));
      });
  };
};

export function updateAlert(data) {
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .post(API.url('update_alert', 'auth'), data)
      .then((res) => {
        dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'Alerts',
            action: 'Update Alert settings success',
          });
        }
        return res;
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.alerts_002.logObj = {
          data: error.response.config.data,
          error_message: error.response.data,
        };
        dispatch(
          logAppIssue(
            errorReportFormat.distributor_dashboard.alerts_002,
          ),
        );
        dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'Alerts',
            action: 'Update Alert settings failure',
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

export function sendSmsMail(data) {
  // debugger
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .post(API.url('send_otp_mail_update', 'sap'), data)
      .then((res) => {
        dispatch(isLoading(false));

        return res;
      })
      .catch((error) => {
        dispatch(isLoading(false));
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

export function verifyOtp(data) {
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .post(API.url('verify_otp_update_mobile', 'sap'), data)
      .then((res) => {
        dispatch(isLoading(false));

        return res;
      })
      .catch((error) => {
        dispatch(isLoading(false));
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

export const getReOrderDetails = (
  so_number,
  distributorId = null,
) => {
  let role = Auth.getRole();
  let apiUrl = null;
  if (role) {
    apiUrl = `${API.url(
      're_order_admin',
      'sap',
    )}/${distributorId}?so_number='${so_number}'`;
  } else {
    apiUrl = `${API.url('re_order', 'sap')}?so_number='${so_number}'`;
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'ReOrder',
            action: 'Getting re-order item success',
          });
        }
        return response;
      })
      .catch((error) => {
        dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'ReOrder',
            action: 'Getting re-order item failure',
          });
        }
        return error;
      });
  };
};

export const getMultipleSalesOrderDetails = (data, distributorId) => {
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url(
      'multiple_so_details_admin',
      'sap',
    )}/${distributorId}`;
  } else {
    apiUrl = `${API.url('multiple_so_details', 'sap')}`;
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .post(apiUrl, data)
      .then((res) => {
        dispatch(isLoading(false));
        return res.data.data;
      })
      .catch((error) => {
        dispatch(isLoading(false));
        if (error.response) {
          return error.response.data;
        }
      });
  };
};
export const getCreditLimitDetails = (login_id) => {
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url('credit_limit_admin', 'sap')}/${login_id}`;
  } else {
    apiUrl = `${API.url('credit_limit', 'sap')}/${login_id}`;
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        if (response && response.status === 200) {
          const [result] =
            response.data &&
            response.data.data &&
            response.data.data.d &&
            response.data.data.d.results;
          Object.assign(result, { RESERVED_CREDIT: response?.data?.data?.reserved_credit })
          Object.assign(result, { SECOND_PROMISE_FLAG: response?.data?.data?.promise_consent_day_flag })
          dispatch(dashboardGetCreditLimitDetails(result));
          dispatch(isLoading(false));
        } else {
          errorReportFormat.distributor_dashboard.crd_001.logObj =
            response;
          dispatch(
            logAppIssue(
              errorReportFormat.distributor_dashboard.crd_001,
            ),
          );
        }
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.crd_002.logObj =
          error?.response?.data;
        dispatch(
          logAppIssue(
            errorReportFormat.distributor_dashboard.crd_002,
          ),
        );
        dispatch(isLoading(false));
      });
  };
};

export const getEmailVerify = (id, remark) => {
  let apiUrl = `${API.url('email_verify', 'sap')}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(`${apiUrl}/${id}?remark=${remark}`)
      .then((response) => {
        dispatch(isLoading(false));
        return response;
      })
      .catch((error) => {
        dispatch(isLoading(false));
      });
  };
};

export const listSODetails = (soNumber, login_id) => {
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url('sales_order_admin', 'sap')}/${login_id}`;
  } else {
    apiUrl = `${API.url('sales_order', 'sap')}`;
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .post(apiUrl, { so_number: soNumber })
      .then((res) => {
        dispatch(isLoading(false));
        return res.data.data;
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.so_001.logObj = {
          data: error.response?.config?.data,
          error_message: error.response?.data,
        };
        dispatch(
          logAppIssue(errorReportFormat.distributor_dashboard.so_001),
        );
        dispatch(isLoading(false));
        if (error.response) {
          return error.response.data;
        }
      });
  };
};

export const listSalesOrderDelivery = (deliveryNumber, login_id) => {
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url(
      'sales_order_delivery_admin',
      'sap',
    )}/${login_id}`;
  } else {
    apiUrl = `${API.url('sales_order_delivery', 'sap')}`;
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .post(apiUrl, { deliveryNumber })
      .then((res) => {
        dispatch(isLoading(false));
        return res.data.data;
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.del_001.logObj = {
          data: error.response?.config?.data,
          error_message: error.response?.data,
        };
        dispatch(
          logAppIssue(
            errorReportFormat.distributor_dashboard.del_001,
          ),
        );
        dispatch(isLoading(false));
        if (error.response) {
          return error.response.data;
        }
      });
  };
};

export const changePassword = (data) => {
  let apiUrl = `${API.url('change_password', 'auth')}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .put(apiUrl, data)
      .then((response) => {
        dispatch(isLoading(false));
        return response;
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.pwd_002.logObj = {
          data: error.response.config.data,
          error_message: error.response.data,
        };
        dispatch(
          logAppIssue(
            errorReportFormat.distributor_dashboard.pwd_002,
          ),
        );
        dispatch(isLoading(false));
        return error.response;
      });
  };
};

export const listInvoiceOrderDelivery = (invoiceNumber, login_id) => {
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url(
      'sales_order_invoice_admin',
      'sap',
    )}/${login_id}`;
  } else {
    apiUrl = `${API.url('sales_order_invoice', 'sap')}`;
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .post(apiUrl, { invoiceNumber })
      .then((res) => {
        dispatch(isLoading(false));
        return res.data.data;
      })
      .catch((error) => {
        errorReportFormat.distributor_dashboard.inv_001.logObj = {
          data: error.response.config.data,
          error_message: error.response.data,
        };
        dispatch(
          logAppIssue(
            errorReportFormat.distributor_dashboard.inv_001,
          ),
        );
        dispatch(isLoading(false));
        if (error.response) {
          return error.response.data;
        }
      });
  };
};
export const logout = () => {
  let apiUrl = `${API.url('logout', 'auth')}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .post(apiUrl)
      .then((response) => {
        dispatch(isLoading(false));
        return response?.data;
      })
      .catch((error) => {
        dispatch(isLoading(false));
        return error.response;
      });
  };
};

export const orderDetailsHeader = (headerData) => {
  // debugger
  return (dispatch) => {
    dispatch(oderDetailsGetData(headerData));
  };
};

export const getMaterialsBOMData = (data) => {
  let apiUrl = `${API.url('materials_bom_explode', 'sap')}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .post(apiUrl, data)
      .then((response) => {
        dispatch(isLoading(false));
        return response;
      })
      .catch((error) => {
        dispatch(isLoading(false));
        return error.response;
      });
  };
};

export const getAlertCommentList = (distributorId, type) => {
  let apiUrl = `${API.url('distributor_alert_comment_list', 'auth')}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(`${apiUrl}/${distributorId}?type=${type}`)
      .then((response) => {
        dispatch(
          dashboardSetAlertCommentList({
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
export const deleteDraft = (data, distributor_id) => {
  let role = Auth.getRole();
  let apiUrl;
  if (role) {
    apiUrl = `${API.url(
      'remove_draft_by_admin',
      'order',
    )}/${data}/${distributor_id}`;
  } else {
    apiUrl = `${API.url('remove_draft', 'order')}/${data}`;
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .delete(apiUrl)
      .then((res) => {
        dispatch(isLoading(false));
        return res;
      })
      .catch((error) => {
        dispatch(isLoading(false));
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
};

export const getDraftOrderDetails = (po_number, distributorId) => {
  let role = Auth.getRole();
  let apiUrl = null;
  if (role) {
    apiUrl = `${API.url(
      'poDetailsAdmin',
      'order',
    )}/${po_number}/${distributorId}`;
  } else {
    apiUrl = `${API.url(
      'poDetails',
      'order',
    )}/${po_number}/${distributorId}`;
  }
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .get(apiUrl)
      .then((response) => {
        dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'DraftOrder',
            action: 'Getting draft order item success',
          });
        }
        return response;
      })
      .catch((error) => {
        dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'DraftOrder',
            action: 'Getting draft order item failure',
          });
        }
        return error;
      });
  };
};

export const removeExpiredCarts = (distributorId) => {
  let apiUrl = `${API.url('remove_expired_carts', 'order')}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .delete(apiUrl)
      .then((response) => {
        dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'DraftOrder',
            action: 'Removing expired carts success',
          });
        }
        return response;
      })
      .catch((error) => {
        dispatch(isLoading(false));
        if (
          config.app_environment === 'uat' ||
          config.app_environment === 'prod' ||
          config.app_environment === 'dev'
        ) {
          ReactGA4.event({
            category: 'DraftOrder',
            action: 'Removing expired carts failure',
          });
        }

        return error;
      });
  };
};

export const insertReservedCredit = (data) => {
  const role = Auth.getRole();
  let apiUrl = role ?
    `${API.url('insert_reserved_credit_admin', 'sap')}`
    : `${API.url('insert_reserved_credit', 'sap')}`;
  return (dispatch) => {
    dispatch(isLoading(true));
    return axios
      .post(apiUrl, data)
      .then((response) => {
        return response;
      })
      .catch((error) => {
        if (error.response) {
          return error.response.data;
        }
      }).finally(() => {
        dispatch(isLoading(false))
      });
  };
}


