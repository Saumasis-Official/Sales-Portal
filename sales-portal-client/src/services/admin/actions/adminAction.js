import {
    ALERT_COMMENT_LIST,
    GET_DISTRIBUTOR_LIST,
    SET_DASHBOARD_FILTER_STATE,
    SSO_USER_DETAILS,
    GET_TSE_USER_LIST,
    GET_APP_SETTING_LIST,
    ADMIN_SWITCH_TO_DISTRIBUTOR,
    CREATE_TSE_REQUEST,
    GET_TSE_REQUESTS,
    GET_ASM_REQUESTS,
    UPDATE_TSE_REQUEST,
    GET_MAINTENANCE_MODE,
    GET_TSE_DISTRIBUTOR_CODE,
    GET_TSE_LIST,
    FETCH_CFA_REPORT_ISSUES,
    GET_FILE_HISTORY,
    GET_HELP_SECTION_DATA,
    GET_PLANT_CODE_REQUEST,
    PDP_UPDATE_REQUESTS,
    CUSTOMER_GROUPS,
    LAST_FORECAST_DATE,
    ADJUSTMENT_TIMELINE,
    DASHBOARD_FILTER_CATEGORIES,
    DB_MOQ_DETAILS,
    UPLOADED_FILE,
    RESET_UPLOADED_FILE,
    RO_APPROVAL_COUNT,
    SET_CORRELATION_ID,
    DASHBOARD_CREDIT_DETAILS,
} from './adminActionTypes';
import _ from 'lodash';
import { PDP_WINDOWS } from '../../auth/actionTypes';
import axios from 'axios';
import { notification } from 'antd';
import * as API from '../../../api/index';
import { isLoading, isSpinning, isForecastLoading } from '../../../constants/actionsConstants';
import Auth from '../../../util/middleware/auth';
import { SYNC_PROGRESS_TEXT } from '../../../config/constant';
import auth from '../../../util/middleware/auth';
import { logAppIssue } from './errorAction';
import { errorReportFormat } from '../../../config/error';

export const getMaintenanceModeDetails = (data) => {
    return {
        type: GET_MAINTENANCE_MODE,
        payload: data,
    };
};

export function addNewMaintenance(data) {
    let apiUrl = `${API.url('add_new_maintenance', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export function updateMaintenanceStatus(data) {
    let apiUrl = `${API.url('update_maintenance', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .patch(apiUrl, data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export const getMaintenanceRequests = (history) => {
    let apiUrl = `${API.url('get_maintenance_status', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(apiUrl)
            .then((response) => {
                let json = response.data;
                dispatch(
                    getMaintenanceModeDetails({
                        data: json,
                    }),
                );
                dispatch(isLoading(false));
                if (response.data) {
                    if (response.data.length > 0) {
                        if (response.data[0].status == 'OPEN') {
                            let adminRole = auth.getAdminRole();
                            if (!(adminRole.includes('SUPER_ADMIN') || adminRole.includes('SUPPORT'))) {
                                if (localStorage.getItem('token') || localStorage.getItem('TCPL_SSO_token')) {
                                    localStorage.removeItem('token');
                                    localStorage.removeItem('TCPL_SSO_token');
                                    history?.push('/maintenance');
                                }
                            }
                        }
                    }
                }
                return response;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const dashboardSetDistributionList = (data) => {
    return {
        type: GET_DISTRIBUTOR_LIST,
        payload: data,
    };
};
export const setDashboardFilterState = (filterState) => {
    return {
        type: SET_DASHBOARD_FILTER_STATE,
        payload: filterState,
    };
};

export const setCorrelationId = (id) => {
    return {
        type: SET_CORRELATION_ID,
        payload: id,
    };
};

export const dashboardSetAlertCommentList = (data) => {
    return {
        type: ALERT_COMMENT_LIST,
        payload: data,
    };
};

export const ssoUserDetails = (data) => {
    return {
        type: SSO_USER_DETAILS,
        payload: data,
    };
};

export const adminSetSwitchToDistributor = (data) => {
    return {
        type: ADMIN_SWITCH_TO_DISTRIBUTOR,
        payload: data,
    };
};

export const getTSERequestsList = (data) => {
    return {
        type: GET_TSE_REQUESTS,
        payload: data,
    };
};

export const createTSERequestRes = (data) => {
    return {
        type: CREATE_TSE_REQUEST,
        payload: data,
    };
};

export const updateTSERequestRes = (data) => {
    return {
        type: UPDATE_TSE_REQUEST,
        payload: data,
    };
};

export const getASMRequestsList = (data) => {
    return {
        type: GET_ASM_REQUESTS,
        payload: data,
    };
};
export const getDistributorList = (params) => {
    return (dispatch) => {
        if (params.limit != 0) dispatch(isLoading(true));
        return axios
            .post(API.url('distributor_list_admin', 'auth'), params)
            .then((response) => {
                dispatch(isLoading(false));
                dispatch(
                    dashboardSetDistributionList({
                        data: response.data.data,
                    }),
                );
                return response.data.data.rows;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) return error.response.data;
            });
    };
};

export const getSessionsLog = (data) => {
    let apiUrl = `${API.url('sessions_admin', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getTSERequests = (params) => {
    let apiUrl = `${API.url('get_mapping_requests', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(`${apiUrl}`, params)
            .then((response) => {
                dispatch(getTSERequestsList(response.data.data));
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const createTSERequest = (params) => {
    let apiUrl = `${API.url('create_mapping_request', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(`${apiUrl}`, params)
            .then((response) => {
                dispatch(createTSERequestRes(response));
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const updateTSERequest = (params, requestID) => {
    let apiUrl = `${API.url('update_mapping_request', 'sap')}/${requestID}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(`${apiUrl}`, params)
            .then((response) => {
                dispatch(updateTSERequestRes(response));
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const getASMRequests = (params) => {
    let apiUrl = `${API.url('get_mapping_requests', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(`${apiUrl}`, params)
            .then((response) => {
                dispatch(getASMRequestsList(response.data.data));
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const updateMassDistributorSetting = (params) => {
    let apiUrl = `${API.url('distributor_settings', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(`${apiUrl}`, params)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};
export const updateDistributorSetting = (params, distributorId) => {
    let apiUrl = `${API.url('distributor_settings', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(`${apiUrl}/${distributorId}`, params)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const updateDistributorMobile = (data, distributorId) => {
    let apiUrl = `${API.url('update_distributor_mobile', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(`${apiUrl}/${distributorId}`, data)
            .then((response) => {
                dispatch(isLoading(false));
                if (response.data.success) {
                    notification.success({
                        message: 'Success',
                        description: 'Phone Number Updated Successfully !!',
                        duration: 3,
                        className: 'notification-green',
                    });
                } else {
                    notification.error({
                        message: 'Error Occurred',
                        description: response.data.message,
                        duration: 5,
                        className: 'notification-error',
                    });
                }
                return response.data;
            })
            .catch((error) => {
                notification.error({
                    message: 'Error Occurred',
                    description: error.message,
                    duration: 5,
                    className: 'notification-error',
                });
            });
    };
};

export const updateDistributorEmail = (data, distributorId) => {
    let apiUrl = `${API.url('update_distributor_email', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(`${apiUrl}/${distributorId}`, data)
            .then((response) => {
                dispatch(isLoading(false));
                if (response.data.success) {
                    notification.success({
                        message: 'Success',
                        description: 'Email ID Updated Successfully !!',
                        duration: 3,
                        className: 'notification-green',
                    });
                } else {
                    notification.error({
                        message: 'Error Occurred',
                        description: response.data.message,
                        duration: 5,
                        className: 'notification-error',
                    });
                }
                return response.data;
            })
            .catch((error) => {
                notification.error({
                    message: 'Error Occurred',
                    description: error.message,
                    duration: 5,
                    className: 'notification-error',
                });
            });
    };
};

export const getAlertCommentList = (distributorId) => {
    let apiUrl = `${API.url('alert_comment_list', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(`${apiUrl}/${distributorId}`)
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

export function getSSODetails(emailId, history, newLogin = null) {
    //Storing the token as the token is deleted on maintenance check
    const ssoToken = Auth.getAdminAccessToken();
    let apiUrl = `${API.url('sso_details', 'auth')}/${emailId}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(apiUrl)
            .then((response) => {
                let json = response.data;
                dispatch(isLoading(false));
                if (json.success !== true) {
                    // Auth.removeSSOCreds();
                    history.push('/no-access');
                } else {
                    Auth.setRole(json.data && json.data.length > 0 && json.data[0] && json.data[0].roles);
                    dispatch(
                        ssoUserDetails({
                            data: json.data,
                        }),
                    );
                    if (newLogin && !Auth.getAdminAccessToken() && ssoToken) {
                        window.localStorage.setItem('TCPL_SSO_token', ssoToken);
                        history.push('/admin/dashboard');
                    }
                }
            })
            .catch((error) => {
                notification.error({
                    message: 'Error Occurred',
                    description: error.message,
                    duration: 8,
                    className: 'notification-error',
                });
            });
    };
}

export function getSyncJobs() {
    let apiUrl = `${API.url('get_sync_logs', 'order')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                notification.error({
                    message: 'Error Occurred',
                    description: error.message,
                    duration: 8,
                    className: 'notification-error',
                });
            });
    };
}

export function materialSync() {
    let apiUrl = `${API.url('material_sync', 'syncjob')}`;
    return (dispatch) => {
        dispatch(
            isSpinning({
                isSpin: true,
                text: 'Fetching material data ...',
            }),
        );
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(isSpinning(false));
                return response;
            })
            .catch(() => {
                dispatch(isSpinning(false));
            });
    };
}

export function distributorSync() {
    let apiUrl = `${API.url('distributor_sync', 'syncjob')}`;
    return (dispatch) => {
        dispatch(isLoading({ isLoad: true, text: SYNC_PROGRESS_TEXT }));
        const config = {
            headers: {
                'bearer-auth': '$2y$10$z97XkHhqGaz1tC9qOJXXeu9jxaKhcTh2ZPtOyggxIiZ5qCHYteA6i',
            },
        };
        return axios
            .get(apiUrl, config)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export function salesHierarchySync() {
    let apiUrl = `${API.url('sales_hierarchy_sync', 'syncjob')}`;
    return (dispatch) => {
        dispatch(isLoading({ isLoad: true, text: SYNC_PROGRESS_TEXT }));
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export function mdmSync() {
    let apiUrl = `${API.url('mdm_sync', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading({ isLoad: true, text: SYNC_PROGRESS_TEXT }));
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error.response;
            });
    };
}

export function soSync(loginId) {
    let apiUrl = `${API.url('so_sync', 'sap')}/${loginId}`;
    return (dispatch) => {
        dispatch(isLoading({ isLoad: true, text: SYNC_PROGRESS_TEXT }));
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export function updateMaterialTags(data) {
    let apiUrl = `${API.url('update_material_tags', 'order')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export const loaderShowHide = (show) => {
    return (dispatch) => {
        dispatch(isLoading(show));
    };
};

export const setTSEUserList = (data) => {
    return {
        type: GET_TSE_USER_LIST,
        payload: data,
    };
};

export const getTSEUserList = (data) => {
    return async (dispatch) => {
        dispatch(isLoading(true));
        try {
            const response = await axios.post(API.url('tse_user_list_admin', 'auth'), data);
            dispatch(
                setTSEUserList({
                    data: response.data.data,
                }),
            );
            dispatch(isLoading(false));
        } catch (error) {
            dispatch(isLoading(false));
            if (error.response) {
                return error.response.data;
            }
        }
    };
};

export const updateTSEUserSetting = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('tse_user_setting', 'auth'), data)
            .then(() => {
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

export const setAppSettingList = (data) => {
    return {
        type: GET_APP_SETTING_LIST,
        payload: data,
    };
};

export const getAppSettingList = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('fetch_app_level_settings_admin', 'auth'))
            .then((response) => {
                dispatch(
                    setAppSettingList({
                        data: response.data.data,
                    }),
                );

                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const updateAppSetting = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('update_app_level_settings', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export function downloadSampleTag() {
    let apiUrl = `${API.url('download_sample_tag', 'order')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                notification.error({
                    message: 'Error Occurred',
                    description: error.message,
                    duration: 8,
                    className: 'notification-error',
                });
            });
    };
}

export function skuDistributorPlanningSync() {
    let apiUrl = `${API.url('distributor_inventory_sync', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading({ isLoad: true, text: SYNC_PROGRESS_TEXT }));
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export function pskuDistributorPlanningSync() {
    let apiUrl = `${API.url('distributor_inventory_sync', 'syncjob')}`;
    return (dispatch) => {
        dispatch(isLoading({ isLoad: true, text: SYNC_PROGRESS_TEXT }));
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export const getZoneWiseOrders = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_zone_wise_orders', 'order'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const getZoneWiseOrdersByOrderType = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_zone_wise_orders_by_order_type', 'order'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const getSdrReportData = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('sdr_report_data', 'order'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const getSdResponseReportData = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('sd_response_report_data', 'order'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const getCategoryWisePortalIssues = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_category_wise_portal_issues', 'order'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const getCFAReportIssues = (data) => {
    return {
        type: FETCH_CFA_REPORT_ISSUES,
        payload: data,
    };
};

export const getDistributorCode = (data) => {
    return {
        type: GET_TSE_DISTRIBUTOR_CODE,
        payload: data,
    };
};

export const getDistributorCodeForTSE = () => {
    const apiUrl = `${API.url('get_distributor_code', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(getDistributorCode(response.data.data));
                dispatch(isLoading(false));
                return response.data.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};
export const getCFAReportIssuesAction = (type) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        let apiUrl = `${API.url(`fetch_service_request_category`, 'sap')}/${type}`;
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(getCFAReportIssues(response.data.data));
                isLoading(false);
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const setTSEList = (data) => {
    return {
        type: GET_TSE_LIST,
        payload: data,
    };
};

export const getTSEList = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('tse_list', 'sap'))
            .then((response) => {
                dispatch(
                    setTSEList({
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

export const getAzureADUserData = (text) => {
    return () => {
        return axios
            .get(`${API.url('azureAD_users', 'auth')}/${text}`)
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

export const addSSOUser = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(`${API.url('add_SSO_user', 'auth')}`, data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};
export const getSapMaterialList = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('sap_material_list', 'sap'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const setFileUploadHistory = (data) => {
    return {
        type: GET_FILE_HISTORY,
        payload: data,
    };
};

export const getFileUploadHistory = (params) => {
    let apiUrl = `${API.url('fetch_files_history', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(`${apiUrl}`, params)
            .then((response) => {
                dispatch(
                    setFileUploadHistory({
                        data: response.data.data,
                    }),
                );
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};
export const updateFileStatus = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .patch(API.url(`update_file_status`, 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};
export function uploadFile(file) {
    let apiUrl = `${API.url('upload_file', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, file)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}
export const getHelpSectionData = (data) => {
    return {
        type: GET_HELP_SECTION_DATA,
        payload: data,
    };
};
export const fetchHelpSectionData = (params) => {
    let apiUrl = `${API.url('fetch_help_section_data', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(`${apiUrl}`, params)
            .then((response) => {
                dispatch(isLoading(false));
                dispatch(
                    getHelpSectionData({
                        data: response.data.data,
                    }),
                );
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getPreAssignedUrl = (path) => {
    path = {
        path: path,
    };
    let apiUrl = `${API.url('get_preassigned_url', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(`${apiUrl}`, path)
            .then((response) => {
                dispatch(isLoading(false));

                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updatePlantCodeMapping = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_plant_code_mapping', 'sap'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getPlantCodeRequests = (data) => {
    return {
        type: GET_PLANT_CODE_REQUEST,
        payload: data,
    };
};

export const getPlantCodeRequestList = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('getPlantCodeRequestList', 'sap'), data)
            .then((response) => {
                dispatch(isLoading(false));
                dispatch(
                    getPlantCodeRequests({
                        data: response.data.data,
                    }),
                );
                return response.data.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const logisticOfficerResponse = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('Logistic_Officer_Response', 'sap'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateLogisticsOfficerRequest = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_plant_code', 'sap'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const dashboardFilterCategories = (excludeDeleted = null) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_dashboard_filter_categories', 'auth') + `${excludeDeleted ? '?excludeDeleted=true' : ''}`)
            .then((res) => {
                dispatch(isLoading(false));
                dispatch(dashboardFilterCategoriesList(res.data.data));
                return res.data.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const pdpUpdateRequestList = (data) => {
    return {
        type: PDP_UPDATE_REQUESTS,
        payload: data,
    };
};

export const getPdpUpdateRequests = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('pdp_update_request_list', 'sap'), data)
            .then((response) => {
                dispatch(isLoading(false));
                dispatch(
                    pdpUpdateRequestList({
                        rows: response.data.success ? response.data.data.rows : [],
                        totalCount: response.data.success ? response.data.data.totalCount : 0,
                    }),
                );
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
                return null;
            });
    };
};

export const savePdpUpdateRequest = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('pdp_update_reqeust', 'sap'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
                return null;
            });
    };
};

export const pdpUpdateResponse = (data) => {
    return async (dispatch) => {
        dispatch(isLoading(true));
        try {
            const response = await axios.post(API.url('pdp_request_response', 'sap'), data);
            dispatch(isLoading(false));
            return response.data;
        } catch (error) {
            dispatch(isLoading(false));
            return error;
        }
    };
};

export const customerGroupList = (data) => {
    return {
        type: CUSTOMER_GROUPS,
        payload: data,
    };
};

export const getCustomerGroupDetails = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('customer_groups', 'sap'))
            .then((response) => {
                dispatch(isLoading(false));
                dispatch(
                    customerGroupList({
                        data: response.data.data,
                    }),
                );
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
                return null;
            });
    };
};

export const getAreaCodes = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('area_code_list', 'auth'))
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getArsAreaCodes = () => {
    return () => {
        return axios
            .get(API.url('ars_enabled_area_codes', 'ars'))
            .then((response) => {
                return response;
            })
            .catch(() => {});
    };
};

export const getForecastConfigurations = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('forecast_configuration', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateForecastConfiguration = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('forecast_configuration', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getBrandVariantList = (data) => {
    return () => {
        // dispatch(isLoading(true));
        return axios
            .post(API.url('brand_variant_list', 'ars'), data)
            .then((response) => {
                // dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                // dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const getForecast = (data) => {
    return (dispatch) => {
        dispatch(isSpinning({ isSpin: true, text: 'Fetching forecast data...' }));
        return axios
            .post(API.url('forecast', 'ars'), data)
            .then((response) => {
                dispatch(isSpinning(false));
                return response;
            })
            .catch((error) => {
                dispatch(isSpinning(false));
                return error?.response?.data;
            });
    };
};

export const updateForecast = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('update_forecast', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error?.response?.data;
            });
    };
};

export const getRegionalBrands = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('regional_brands', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error?.response?.data;
            });
    };
};

export const lastForecastDate = (data) => {
    return {
        type: LAST_FORECAST_DATE,
        payload: data,
    };
};

export const getForecastSummary = (data, quantityNormMode) => {
    let api = API.url('forecast_summary', 'ars');
    if (quantityNormMode) {
        api += `?quantity_norm_flag=${quantityNormMode}`;
    }

    return (dispatch) => {
        dispatch(isLoading(true));
        dispatch(isForecastLoading(true));
        return axios
            .post(api, data)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error?.response?.data;
            })
            .finally(() => {
                dispatch(isForecastLoading(false));
                dispatch(isLoading(false));
            });
    };
};

export const getLastForecastDate = (data) => {
    return (dispatch) => {
        if (data.areaCode == null || data.areaCode === '') {
            return null;
        }
        return axios
            .post(API.url('last_forecast_date', 'ars'), data)
            .then((response) => {
                dispatch(lastForecastDate(response?.data?.data));
            })
            .catch((error) => {
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const submitForecast = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('submit_forecast', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error?.response?.data;
            });
    };
};

export const adjustmentTimeline = (data) => {
    return {
        type: ADJUSTMENT_TIMELINE,
        payload: data,
    };
};

export const getAdjustmentTimeline = () => {
    /**
     *
     * FORECAST SUMMARY: UPLOAD :- Open if any of CG window is open. DOWNLOAD:- always open. SUBMIT:- Open if any of CG window is open.
     * QUANTITY NORM: Open for change if any of CG window is open.
     * FORECAST: if any
     * FORECAST CONFIGURATION: Individual CG window.
     * STOCK NORM: Individual CG window.
     */
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('fetch_ars_configurations', 'ars'), {
                configurations: ['TIMELINE'],
                details: false,
            })
            .then((res) => {
                const tempCgEditTimeline = {};
                const currentDate = new Date().getDate();
                res.data?.data?.forEach((cgData) => {
                    tempCgEditTimeline[cgData.customer_group] = {
                        editEnable: cgData.start_date <= currentDate && cgData.end_date >= currentDate && cgData.enable_adjustment,
                        desc: cgData.desc,
                    };
                });
                dispatch(adjustmentTimeline(tempCgEditTimeline));
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error?.response?.data;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateForcastDistribution = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('update_forecast_distribution', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error?.response?.data;
            });
    };
};

export const getStockData = (data) => {
    return () => {
        return axios
            .post(API.url('stock_data', 'ars'), data)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error?.response?.data;
            });
    };
};

export const getStockSyncTime = () => {
    return () => {
        return axios
            .get(API.url('stock_sync_time', 'ars'))
            .then((response) => {
                if (response?.data?.success) {
                    return response?.data?.data;
                }
                return null;
            })
            .catch((error) => {
                return error?.response?.data;
            });
    };
};
export const downloadForecastSummary = (data = null) => {
    let url = `${API.url('download_forecast_summary', 'ars')}`;
    if (data) {
        url += `?area=${data}`;
    }
    return () => {
        // dispatch(isSpinning({ isSpin: true, text: "Downloading forecast summary..." }))
        return axios
            .get(url)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error?.response?.data;
            })
            .finally(() => {
                // dispatch(isSpinning(false));
            });
    };
};

export const fetchSkuStockData = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('sku_stock_data', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data?.data?.rows;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error?.response?.data;
            });
    };
};

export const getSNConfigRegions = (data) => {
    let url = `${API.url('get_stock_norm_config_regions', 'auth')}`;
    return () => {
        return axios
            .post(url, data)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error?.response?.data;
            });
    };
};

export const getSNConfigAreas = (data) => {
    let url = `${API.url('get_stock_norm_config_areas', 'auth')}`;
    return () => {
        return axios
            .post(url, data)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error?.response?.data;
            });
    };
};

export const getSNConfigDivisions = () => {
    let url = `${API.url('get_stock_norm_config_divisions', 'auth')}`;
    return () => {
        return axios
            .post(url)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error?.response?.data;
            });
    };
};

export const getCycleSafetyStock = (data) => {
    let url = `${API.url('get_cycle_safety_stock_config', 'auth')}`;
    return () => {
        return axios
            .post(url, data)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error?.response?.data;
            });
    };
};

export const updateCycleSafetyStock = (data) => {
    let url = `${API.url('update_cycle_safety_stock', 'auth')}`;
    return () => {
        return axios
            .put(url, data)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error?.response?.data;
            });
    };
};

export const dashboardFilterCategoriesList = (data) => {
    return {
        type: DASHBOARD_FILTER_CATEGORIES,
        payload: data,
    };
};

export const getCfaDepotMapping = (email) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        const url = email ? `${API.url('cfa_depot_mapping', 'auth')}?email=${email}` : `${API.url('cfa_depot_mapping', 'auth')}`;
        return axios
            .get(url)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};
export const updateCfaDepotMapping = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('cfa_depot_mapping', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const insertCfaDepotMapping = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('cfa_depot_mapping', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getStockNormAudit = (customerGroup, payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        const url = `${API.url('stock_norm_audit', 'ars')}/${customerGroup}`;
        return axios
            .post(url, payload)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};
export const getMoqDbMappingData = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('moq_mapping_data', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};
export const getBoMoqDbMappingData = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('bo_moq_mapping_data', 'order'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getBoAreaZone = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('bo_mapped_zone', 'order'))
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateMoq = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_moq', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const BulkOrderupdateMoq = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('bulk_order_update_moq', 'order'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const bulkOrderMassUpdate = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('bo_mass_update', 'order'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const distributorMoqDetails = (data) => {
    return {
        type: DB_MOQ_DETAILS,
        payload: data,
    };
};

export const getDbMoqDetails = (distributorId) => {
    let apiUrl = `${API.url('db_moq_details', 'auth')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(`${apiUrl}/${distributorId}`)
            .then((response) => {
                dispatch(
                    distributorMoqDetails({
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

export const updateStockNormAudit = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('stock_norm_audit', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const downlaodMdmData = (params) => {
    let apiUrl = `${API.url('download_Mdm_Data', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, params)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data?.data;
                // return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const getMdmData = (params) => {
    let apiUrl = `${API.url('get_mdm_data', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, params)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};
export const UpdateFieldLevelData = (params) => {
    let apiUrl = `${API.url('mdm_filed_level_save', 'sap')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(apiUrl, params)
            .then((response) => {
                dispatch(isLoading(false));
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};
export const getStockNormDefault = (data) => {
    return () => {
        const url = `${API.url('stock_norm_default', 'ars')}/${data}`;
        return axios
            .get(url)
            .then((response) => {
                return response;
            })
            .catch((error) => {
                return error;
            });
    };
};

export const updateStockNormDefault = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('stock_norm_default', 'ars'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getAllArsTolerance = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        const url = `${API.url('all_ars_tolerance', 'ars')}/${data}`;
        return axios
            .get(url)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getArsTolerance = (customerGroup, areaCode) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        const url = auth.getAdminRole()?.length
            ? `${API.url('ars_tolerance_admin', 'ars')}/${customerGroup}/${areaCode}`
            : `${API.url('ars_tolerance', 'ars')}/${customerGroup}/${areaCode}`;
        return axios
            .get(url)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateArsTolerance = (updatedData) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('all_ars_tolerance', 'ars'), { data: updatedData })
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};
export const multipleUpdateCfaDepotMapping = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('multiple_update_cfa_depot_mapping', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};
export const uploadMdmData = (uploadData) => {
    return (dispatch) => {
        dispatch(isSpinning({ isSpin: true, text: 'Uploading MDM data...' }));
        return axios
            .post(API.url('upload_mdm_data', 'sap'), uploadData)
            .then((response) => {
                return response;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isSpinning(false));
            });
    };
};

export const uploadedFileData = (uploadData) => {
    return {
        type: UPLOADED_FILE,
        payload: uploadData,
    };
};

export const resetUploadFileData = () => {
    return {
        type: RESET_UPLOADED_FILE,
        payload: {},
    };
};

export const getAllMdmCustomers = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('all_mdm_customers', 'sap'))
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const get_Depot_Code = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_depot_code', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getSurveyReport = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('survey_report', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getSKUCodes = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('sku_codes', 'order'), data)
            .then((response) => {
                return response?.data?.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getSKUDetails = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('sku_details', 'order'), data)
            .then((response) => {
                return response?.data?.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getCustomerGroups = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('customer_groups', 'order'))
            .then((response) => {
                return response?.data?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const getActivePlantDistributors = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('active_plant_distributors', 'auth'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const saveRuleConfig = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('save_rule_config', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getRuleConfig = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_rule_config', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const promiseCredit = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('promised_credit', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getRushOrderRequests = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_ro_requests', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const addUpdateMdm = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('add_update_sku', 'sap'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const poList = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('po_list', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const poItemList = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('po_Items', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const mtecomUpload = (uploadData) => {
    return (dispatch) => {
        dispatch(isSpinning({ isSpin: true, text: 'Uploading MtEcom data...' }));
        return axios
            .post(API.url('upload_reliance', 'mtecom'), uploadData)
            .then((response) => {
                return response;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isSpinning(false));
            });
    };
};

export const rushOrderApprovalCount = (data) => {
    return {
        type: RO_APPROVAL_COUNT,
        payload: data['count'],
    };
};

export const getRushOrderApprovalCount = () => {
    return (dispatch) => {
        return axios
            .get(API.url('get_ro_approval_count', 'order'))
            .then((response) => {
                dispatch(
                    rushOrderApprovalCount({
                        count: response.data.data.count,
                    }),
                );
                return {
                    success: response.data.success,
                    data: response.data.data.count,
                    message: response.data.message,
                };
            })
            .catch((error) => {
                return { success: false, message: error };
            })
            .finally(() => {});
    };
};

export const updateRushOrderRequest = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('update_ro_request', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateQuantityNorm = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_quantity_norm', 'ars'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getBODistMoq = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('getBoMoq', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const cleartaxPanDetails = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('cleartax_gst_pan', 'sap'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getBrandAndBrandVariantCombinations = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('brand_variant_combinations', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getBrandVariantDetails = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('brand_variant_details', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const upsertPrioritization = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('brand_variant_prioritization', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getPrioritization = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('prioritization_list', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchOrderRequest = (po_number) => {
    const url = `${API.url('get_order_request', 'order')}/${po_number}`;
    return () => {
        return axios
            .get(url)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {});
    };
};

export const getSAPHoliday = (data) => {
    const url = `${API.url('sap_holiday_list', 'sap')}`;
    return () => {
        return axios
            .post(url, data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {});
    };
};

export const forecastUpload = (data) => {
    return (dispatch) => {
        dispatch(
            isSpinning({
                isSpin: true,
                text: 'Uploading Forecast data...',
            }),
        );
        const config = {
            headers: {
                'content-type': 'multipart/form-data',
            },
        };
        const role = Auth.getAdminRole();
        const url = !_.isEmpty(_.intersection(['SUPER_ADMIN', 'SHOPPER_MARKETING', 'RSM'], role)) ? 'upload_region_forecast' : 'upload_forecast';
        return axios
            .post(API.url(url, 'ars'), data, config)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isSpinning(false));
            });
    };
};

// sap_holiday_list
export function updateSAPHolidays(data) {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_sap_holidays', 'sap'), data)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}
export const getActiveSessionReport = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('active_session_report', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const invalidateSession = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('invalidate_session', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const insertAdminSession = (correlationId) => {
    let data = {};
    data.loginId = Auth.getUserEmail();
    data.correlationId = correlationId;
    if (data.loginId) {
        return () => {
            return axios
                .post(API.url('insert_admin_session', 'auth'), data)
                .then((response) => {
                    return response?.data;
                })
                .catch((error) => {
                    return error;
                });
        };
    }
};

export const RDDList = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios.post(API.url('rdd_list', 'mtecom'), data);
    };
};
export const pdpWindows = (data) => {
    return {
        type: PDP_WINDOWS,
        payload: data,
    };
};

export const getPDPWindow = (regionId) => {
    const isSSOLogin = Auth.getRole();
    const url = isSSOLogin ? `${API.url('get_pdp_windows_admin', 'auth')}/${regionId}` : `${API.url('get_pdp_windows', 'auth')}/${regionId}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(url)
            .then((response) => {
                if (response?.data?.success) dispatch(pdpWindows(response?.data?.data));
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const upsertPDPWindow = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('upsert_pdp_window', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const deletePDPException = (data) => {
    return () => {
        return axios
            .delete(API.url('delete_pdp_window', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            });
    };
};

export const inserPdpUnlockRequest = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('insert_pdp_unlock_request', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getPdpUnlockRequests = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_pdp_unlock_requests', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getDbRegions = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_db_regions', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchSSOUsers = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_sso_users', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updatePDPUnlockRequest = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('update_pdp_unlock_request', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const dlpSync = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        //has to be changed to 'syncjob
        return axios
            .post(API.url('dlp_sync', 'ars'), payload)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchDlpReportData = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('dlp_download', 'ars'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const setExpiredPdpUnlockRequests = () => {
    return () => {
        return axios
            .put(API.url('set_expired_pdp_unlock_requests', 'auth'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {});
    };
};

export const approveRushOrderRequest = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('approve_ro_request', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const customerList = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('customer_list', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const addUpdateCustomer = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('add_update_customer', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const createAmendment = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('create_amendment', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const RDDItemList = (limit, offset, po_number) => {
    const url = `${API.url('rdd_item_list', 'mtecom')}/${limit}/${offset}/${po_number}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(url)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const stockNormDbFilter = (ao_enabled, cg) => {
    return () => {
        return axios
            .get(API.url(`stock_norm_db_filter`, 'ars') + `?ao_enabled=${ao_enabled}&cg=${cg}`)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });
    };
};
export const sendROApprovalEmail = (data) => {
    return () => {
        return axios
            .post(API.url('ro_approval_email', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            });
    };
};

export const getNonForecastedPsku = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_non_forecasted_psku', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getAllDbList = (data = {}) => {
    return () => {
        const { dist_channels = '' } = data;
        let url = `${API.url('all_db_list', 'order')}`;
        if (dist_channels) {
            url += `?dist_channels=${dist_channels}`;
        }
        return axios
            .get(url)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            });
    };
};

export const upsertNonForecastedPsku = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('upsert_non_forecasted_psku', 'order'), {
                data: payload,
            })
            .then((response) => response.data)
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const customerWorkflowList = (limit, offset) => {
    const url = `${API.url('customer_workflow_list', 'mtecom')}/${limit}/${offset}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(url)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const addUpdateCustomerWorkflow = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('add_update_workflow_workflow', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const customerWorkflowData = (customer_name, user_id) => {
    const url = `${API.url('customer_workflow_data', 'mtecom')}/${customer_name}/${user_id}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(url)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const mtEcomSOSync = () => {
    const url = `${API.url('so_sync', 'syncjob')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(url)
            .then((response) => {
                return response;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const getCustomerCodes = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('customer_code_list', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const addUpdateKams = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('add_update_kams', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const updateCustomerData = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_customer_data', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getKamsData = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_kams_data', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const upsertSoqNorms = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('upsert_soq_norms', 'ars'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchSoqNorms = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('fetch_soq_norms', 'ars'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchSoqNormDivisionList = () => {
    return () => {
        return axios
            .get(API.url('fetch_soq_norm_division_list', 'ars'))
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });
    };
};

export const deleteSoqNorm = (division) => {
    return () => {
        return axios
            .delete(API.url('delete_soq_norm', 'ars') + `/${division}`)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });
    };
};

export const getPskuToleranceExclusions = () => {
    return () => {
        let role = Auth.getRole();
        const url = role ? API.url('psku_tolerance_exclusions_admin', 'ars') : API.url('psku_tolerance_exclusions', 'ars');
        return axios
            .get(url)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            });
    };
};

export const postToleranceExcludedPskus = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_psku_tolerance_exclusions', 'ars'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const downloadMtEcomReports = (params) => {
    let apiUrl = `${API.url('download_mt_reports', 'mtecom')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, params)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const updateSkuSoqNorm = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_sku_soq_norm_sync', 'ars'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const downloadSkuSoqNorm = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('update_sku_soq_norm_sync', 'ars'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateDBPopClass = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_db_pop_class', 'ars'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const downloadDBPopClass = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('update_db_pop_class', 'ars'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const upsertAllNonForecasted = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('upsert_all_non_forecast', 'order'), {
                data: payload,
            })
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const uploadStockNorm = (data, isClassLevel, toOverwrite) => {
    return (dispatch) => {
        dispatch(
            isSpinning({
                isSpin: true,
                text: 'Uploading Stock Norm data...',
            }),
        );
        const api = `${API.url('upload_stock_norm', 'ars')}?is_class_level=${isClassLevel}&to_overwrite=${toOverwrite}`;
        return axios
            .post(api, data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isSpinning(false));
            });
    };
};

export const getPDPUnlockWindow = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_pdp_unlock_window', 'auth'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updatePDPUnlockWindow = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('update_pdp_unlock_window', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const shopifyPoList = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('shopify_po_list', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const shopifyPoItemList = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('shopify_po_items', 'mtecom'), { params: data })
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const downloadShopifyReports = (params) => {
    let apiUrl = `${API.url('shopify_reports', 'mtecom')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, params)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};
export const exportPOData = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('export_data', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const retriggerShopifySO = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('shopify_retrigger', 'mtecom'), {}, { params: data })
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateRushOrderRequest2 = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('update_ro_request2', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchArsConfigurations = (configurations = null, details = false) => {
    return () => {
        return axios
            .post(API.url('fetch_ars_configurations', 'ars'), {
                configurations,
                details,
            })
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            });
    };
};

export const updateArsConfigurations = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_ars_configurations', 'ars'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const retrigger = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('mtecom_retrigger', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const exportZtables = (params) => {
    let apiUrl = `${API.url('shopify_z_table_export', 'mtecom')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, params)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    };
};

export const getAllShopifyCustomers = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('shopify_all_customers', 'mtecom'), payload)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const forecastDistribution = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('forecast_distribution', 'ars'), payload)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const arsRecommendationSimulation = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('ars_recommendation_simulation', 'ars'), payload)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchProductHierarchyFilter = (payload) => {
    return () => {
        return axios
            .post(API.url('product_hierarchy_filter', 'ars'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch(() => {});
    };
};

export const upsertDbPskuTolerance = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('upsert_db_psku_tolerance', 'ars'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchDistributorPskuTolerance = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        const url = auth.getAdminRole()?.length ? API.url('fetch_distributor_psku_tolerance_admin', 'ars') : API.url('fetch_distributor_psku_tolerance', 'ars');
        return axios
            .post(url, payload)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
};
export function getCfaProcessFlow(data) {
    return (dispatch) => {
        dispatch(isSpinning({ isLoad: true }));
        return axios
            .post(API.url('cfa_process_flow', 'syncjob'), data)
            .then((response) => {
                dispatch(isSpinning(false));
                return response.data;
            })
            .catch(() => {
                dispatch(isSpinning(false));
            });
    };
}

export const getMissingDBPskuCombination = (data) => {
    return () => {
        return axios
            .post(API.url('missing_distributor_psku_combination', 'ars'), data)
            .then((response) => {
                return response?.data;
            })
            .catch(() => {});
    };
};

export const fetchAutoClosureGT = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        const url = auth.getAdminRole()?.length ? 'fetch_auto_closure_gt_admin' : 'fetch_auto_closure_gt';
        return axios
            .post(API.url(url, 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateAutoClosureGT = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_auto_closure_gt', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchAutoClosureMTEcomSingleGrn = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('fetch_auto_closure_mt_ecom_single_grn', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchAutoClosureMTEcomSingleGrnCustomerDetails = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('fetch_auto_closure_mt_ecom_single_grn_customer_details', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateSingleGrnAutoClosure = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_single_grn_auto_closure', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchMultiGrnData = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('fetch_multi_grn_consolidated_data', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchMultiGrnCustomerDetails = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('fetch_multi_grn_customer_details', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateMultiGrnAutoClosure = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_multi_grn_auto_closure', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const multiUpdateGTAutoClosure = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('multi_update_auto_closure_gt', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const multiUpdateMTEcom = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('multi_update_auto_closure_mt_ecom', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchOriginalDistributorPskuTolerance = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('fetch_original_distributor_psku_tolerance', 'ars'), data)
            .then((res) => {
                return res.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const deleteDistributorPskuTolerance = (ids) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('delete_distributor_psku_tolerance', 'ars'), ids)
            .then((res) => {
                return res.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export function getUpcomingDistributorPDP(data, soDate, deliveryDate) {
    return (dispatch) => {
        dispatch(isLoading(true));
        const api = `${API.url('distributor_upcoming_pdp_date', 'order')}/${data}`;
        return axios
            .post(api, { soDate: soDate, deliveryDate: deliveryDate })
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}

export function downloadStockNorm(data) {
    return (dispatch) => {
        dispatch(isLoading(true));
        const api = `${API.url('download_stock_norm', 'ars')}`;
        return axios
            .post(api, data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}

export function aosAuditReport(data) {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('aos_audit_report', 'ars'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}

export function insertSyncLog(payload) {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('insert_sync_log', 'ars'), payload)
            .then((res) => {
                return res?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}

export function syncForecastDump(payload) {
    return () => {
        const body = {};
        const params = Object.keys(payload).reduce((acc, key) => {
            if (payload[key] === null) return acc;
            if (key === 'area_codes' && !payload.area_codes?.length) return acc;
            else if (['sales_months', 'weightages', 'db_codes'].includes(key)) body[key] = payload[key];
            else {
                if (acc === '') acc = `?${key}=${payload[key]}`;
                else acc = acc + `&${key}=${payload[key]}`;
                return acc;
            }
            return acc;
        }, '');
        axios.post(API.url('forecast_dump', 'ars_allocation') + params, body);
    };
}

export function syncForecastAllocation(payload) {
    return () => {
        const params = Object.keys(payload).reduce((acc, key) => {
            if (acc === '') acc = `?${key}=${payload[key]}`;
            else acc = acc + `&${key}=${payload[key]}`;
            return acc;
        }, '');
        axios.get(API.url('allocation', 'ars_allocation') + params);
    };
}

export function syncPhasing(payload) {
    return () => {
        axios.post(API.url('phasing', 'ars_allocation'), payload);
    };
}

export function getAllResendPOData(userId, year, salesOrg, fileName) {
    return (dispatch) => {
        dispatch(isLoading(true));
        let api = `${API.url('resend_po', 'mtecom')}`;
        if (userId) {
            api += `?userId=${userId}`;
        } else if (year && salesOrg) {
            api += `?year=${year}&salesOrg=${salesOrg}`;
        } else if (fileName) {
            api += `?fileName=${fileName}`;
        }
        return axios
            .get(api)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}
export const deleteItems = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('delete_items', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const invalidateOtherSessions = (data) => {
    return async (dispatch) => {
        dispatch(isLoading(true));
        try {
            try {
                const response = await axios.post(API.url('invalidate_other_sessions_admin', 'auth'), data);
                return response?.data;
            } catch (error) {
                return error;
            }
        } finally {
            dispatch(isLoading(false));
        }
    };
};

export function updateCfaWorkflowCalender(data) {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_cfa_flow_calender', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export function getCfaWorkflowCalender() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('fetch_cfa_flow_calender', 'auth'))
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}
export const upsertAllRuleConfiguration = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('upsert_all_rule_configuration', 'order'), {
                data: payload,
            })
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const upsertRuleConfiguration = (payload, channel) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('upsert_rule_configuration', 'order'), {
                data: payload,
                dist_channels: channel,
            })
            .then((response) => response.data)
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const massUpdateRushOrderRequest = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('mass_update_ro_request', 'order'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateMultiplePDPUnlockRequests = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .put(API.url('update_multiple_pdp_unlock_requests', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getTransactionSummary = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('transaction_summary', 'credit'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const sendCreditExtensionRequest = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('send_credit_extension_request', 'credit'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getCustomerDetails = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_mt_customer_details', 'credit'))
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                notification.error({
                    message: 'Error Occurred',
                    description: error.message,
                    duration: 8,
                    className: 'notification-error',
                });
                // return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getTransactionDetails = (transaction_id) => {
    const url = `${API.url('transaction_details', 'credit')}/${transaction_id}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(url)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const cl_approver_update = (data) => {
    return (dispatch) => {
        dispatch(
            isSpinning({
                isSpin: true,
                text: 'Please wait, MT update request is processing...',
            }),
        );
        dispatch(isLoading(true));
        return axios
            .post(API.url('cl_approver_update', 'credit'), data)
            .then((response) => {
                dispatch(isSpinning(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isSpinning(false));
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const financeApprover = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('cl_finance_approver', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const customer_group_list = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('customer_groups', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const account_master_list = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('account_master_list', 'credit'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const downloadPO = (po) => {
    const apiUrl = `${API.url('download_po', 'mtecom')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(apiUrl, {
                params: { po },
            })
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
                // Handle error
            });
    };
};

export const insertApprovedPdpUnlockRequest = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('insert_approved_pdp_unlock_request', 'auth'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getCreditLimitDetails = (login_id) => {
    return async (dispatch) => {
        let role = Auth.getRole();
        let apiUrl;

        if (role) {
            apiUrl = `${API.url('credit_limit_admin', 'credit')}/${login_id}`;
        }
        dispatch(isLoading(true));
        try {
            const config = {
                headers: {
                    'bearer-auth': '$2y$10$z97XkHhqGaz1tC9qOJXXeu9jxaKhcTh2ZPtOyggxIiZ5qCHYteA6i',
                },
            };
            const response = await axios.get(apiUrl, config);
            if (response && response.status === 200) {
                const [result] = response.data?.data?.d?.results || [];
                dispatch(dashboardGetCreditLimitDetails(result));
            } else {
                throw new Error('Failed to fetch credit limit details');
            }
        } catch (error) {
            console.error('Error fetching credit limit details:', error);
            dispatch(logAppIssue(errorReportFormat.distributor_dashboard.crd_002));
        } finally {
            dispatch(isLoading(false));
        }
    };
};

export const dashboardGetCreditLimitDetails = (data) => {
    return {
        type: DASHBOARD_CREDIT_DETAILS,
        payload: data,
    };
};

export const fetchAutoClosureReportGT = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('fetch_auto_closure_gt_report', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const getCreditDetailsFromSap = (login_id) => {
    let role = Auth.getRole();
    let url;
    if (role) {
        url = `${API.url('credit_limit_admin', 'credit')}/${login_id}`;
    }
    return (dispatch) => {
        dispatch(isLoading(true));
        const config = {
            headers: {
                'bearer-auth': '$2y$10$z97XkHhqGaz1tC9qOJXXeu9jxaKhcTh2ZPtOyggxIiZ5qCHYteA6i',
            },
        };
        return axios
            .get(url, config)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export function uploadBaseLimit(data) {
    let apiUrl = `${API.url('upload_base_limit', 'credit')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export const salesApprover = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('cl_sales_approver', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getApproverDetails = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_approver_details', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateApproverDetails = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_approver_details', 'credit'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const getRiskCategory = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_risk_category', 'credit'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const get_latest_upload_record = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_latest_upload_record', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetch_approvers = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('fetch_approvers', 'credit'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export function fetchStockNormForDistributor(distributorCode) {
    let apiUrl = `${API.url('stock_norm_for_distributor', 'ars')}/${distributorCode}`;
    return () => {
        return axios
            .get(apiUrl)
            .then((response) => {
                return response.data;
            })
            .catch((error) => {
                return error;
            });
    };
}

export function add_approver_config(data) {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('add_approver_config', 'credit'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            });
    };
}

export function get_category_list() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_category_list', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            });
    };
}
export const downloadPODetails = (po) => {
    const apiUrl = `${API.url('download_po_details', 'mtecom')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(apiUrl, {
                params: { po },
            })
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error;
            });
    };
};

export const upsertNourishcoPlanningSync = (payload) => {
    const apiUrl = API.url('nourishco_planning_sync', 'syncjob');
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, payload)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error;
            });
    };
};

export const downloadNourishcoPlanning = (payload) => {
    const apiUrl = API.url('download_nourishco_planning', 'syncjob');
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(apiUrl, payload)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error;
            });
    };
};

export function fetch_unmapped_group() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('fetch_unmapped_group', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            });
    };
}

export function fetch_mt_cl_report() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('fetch_mt_cl_report', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}

export function uploadGTRequests(data) {
    let apiUrl = `${API.url('upload_gt_requests', 'credit')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch(() => {
                dispatch(isLoading(false));
            });
    };
}

export const getGTTransactionSummary = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('gt_transaction_summary', 'credit'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export function add_GT_approvers(data) {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('add_GT_approvers', 'credit'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}
export function get_cluster() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_cluster', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            });
    };
}
export function get_GT_approvers() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_GT_approvers', 'credit'))
            .then((response) => {
                return response?.data?.data;
            })
            .catch((error) => {
                return error;
            });
    };
}

export const cl_gt_approver_update = (data) => {
    return (dispatch) => {
        dispatch(
            isSpinning({
                isSpin: true,
                text: 'Please wait, GT update request is processing...',
            }),
            );
        return axios
            .post(API.url('cl_gt_approver_update', 'credit'), data)
            .then((response) => {
                dispatch(isSpinning(false));
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isSpinning(false));
            });
    };
};

export const getGTTransactionDetails = (transaction_id) => {
    const url = `${API.url('gt_transaction_details', 'credit')}/${transaction_id}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(url)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export function fetch_gt_excel_data(data) {
    let apiUrl = `${API.url('gt_download_excel', 'credit')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(apiUrl, data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}

export function get_gt_requestor() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_gt_requestor', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}

export function gt_requestor_details() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('gt_requestor_details', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}
export const get_gt_approver = (data) => {
    return (dispatch) => {
        return axios
            .post(API.url('get_gt_approver', 'credit'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const add_gt_requestor = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('add_gt_requestor', 'credit'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export function get_requestor_clusters() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_requestor_clusters', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}
export function get_customer_groups() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('get_customer_groups', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}

export const mtEcomAutoSOSync = (user_id) => {
    const url = `${API.url('so_sync', 'mtecom')}/${user_id}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(url)
            .then((response) => {
                return response;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const mtEcomASNDownload = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('asn_download', 'mtecom'), data)
            .then((response) => {
                return response;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchAutoClosureMtEcomConfig = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('fetch_auto_closure_mt_config', 'auth'), data)
            .then((res) => {
                return res;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const updateAutoClosureMtEcomConfig = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_auto_closure_mt_config', 'auth'), data)
            .then((res) => {
                return res;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
export const mtEcomTOTTolerance = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('mt_ecom_tot_tolerance', 'mtecom'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

//delivery_code_reports

export const deliveryCodeReports = (data) => {
    return (dispatch) => {
        dispatch(isLoading(false));
        return axios
            .post(API.url('delivery_code_reports', 'syncjob'), data)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export const fetch_plant_details = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('fetch_plant_details', 'order'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};

export function fetch_gt_cl_report() {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('fetch_gt_cl_report', 'credit'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
}
export const fetchAreaForecastDumpDetails = (areaCode) => {
    return (dispatch) => {
        return axios
            .get(`${API.url('forecast_dump_details', 'ars')}/${areaCode}`)
            .then((res) => {
                return res.data;
            })
            .catch((error) => {
                return error;
            });
    };
};
export const downloadSOReqRes = (po) => {
    const apiUrl = `${API.url('download_so_req_res', 'mtecom')}`;
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(apiUrl, {
                params: { po },
            })
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error;
            });
    };
};

export const fetchAutoClosureReportMT = (payload) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('fetch_auto_closure_mt_report', 'auth'), payload)
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            })
            .finally(() => {
                dispatch(isLoading(false));
            });
    };
};
