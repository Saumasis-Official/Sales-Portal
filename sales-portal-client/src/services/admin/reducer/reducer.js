import {
    ALERT_COMMENT_LIST,
    GET_DISTRIBUTOR_LIST,
    SET_DASHBOARD_FILTER_STATE,
    GET_TSE_USER_LIST,
    GET_APP_SETTING_LIST,
    SSO_USER_DETAILS,
    ADMIN_SWITCH_TO_DISTRIBUTOR,
    CREATE_TSE_REQUEST,
    GET_TSE_REQUESTS,
    GET_ASM_REQUESTS,
    UPDATE_TSE_REQUEST,
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
} from '../actions/adminActionTypes';
import Immutable from 'immutable';

const application_default_data = Immutable.Map({
    'distributor_list': [],
    'dashboard_selected_filters': {},
    'sso_user_details': {},
    'tse_user_list': [],
    'app_setting_list': [],
    'admin_switched_to_distributor': null,
    'distributor_code': [],
    'tse_code_list': [],
    'report_issues': [],
    'file_upload_history': [],
    'get_help_section_data': [],
    'last_forecast_date': '',
    'adjustment_timeline': {},
    'dashboard_filter_categories': {},
    'uploaded_file': {},
    'ro_approval_count': 0,
});

function admin(admin = application_default_data, action) {

    switch (action.type) {
        case GET_DISTRIBUTOR_LIST:
            return admin.set('distributor_list', action.payload);
        case SET_DASHBOARD_FILTER_STATE :
            return admin.set('dashboard_selected_filters', action.payload);
        case ALERT_COMMENT_LIST:
            return admin.set('alert_comment_list', action.payload);
        case SSO_USER_DETAILS:
            return admin.set('sso_user_details', action.payload);
        case GET_TSE_USER_LIST:
            return admin.set('tse_user_list', action.payload);
        case GET_APP_SETTING_LIST:
            return admin.set('app_setting_list', action.payload);
        case ADMIN_SWITCH_TO_DISTRIBUTOR:
            return admin.set('admin_switched_to_distributor', action.payload);
        case CREATE_TSE_REQUEST:
            return admin.set('create_req_response', action.payload);
        case GET_TSE_REQUESTS:
            return admin.set('tse_requests', action.payload);
        case GET_ASM_REQUESTS:
            return admin.set('asm_requests', action.payload);
        case UPDATE_TSE_REQUEST:
            return admin.set('update_req_response', action.payload);
        case GET_TSE_DISTRIBUTOR_CODE:
            return admin.set('distributor_code', action.payload);
        case GET_TSE_LIST:
            return admin.set('tse_code_list', action.payload);
        case FETCH_CFA_REPORT_ISSUES:
            return admin.set('report_issues', action.payload);
        case GET_FILE_HISTORY:
            return admin.set('file_upload_history', action.payload);
        case GET_HELP_SECTION_DATA:
            return admin.set('get_help_section_data', action.payload);
        case GET_PLANT_CODE_REQUEST:
            return admin.set('get_plant_code_request', action.payload);
        case PDP_UPDATE_REQUESTS:
            return admin.set('pdp_update_requests', action.payload);
        case CUSTOMER_GROUPS:
            return admin.set('customer_group_list', action.payload);
        case LAST_FORECAST_DATE:
            return admin.set('last_forecast_date', action.payload);
        case ADJUSTMENT_TIMELINE:
            return admin.set('adjustment_timeline', action.payload);
        case DASHBOARD_FILTER_CATEGORIES:
            return admin.set('dashboard_filter_categories', action.payload);
        case DB_MOQ_DETAILS:
            return admin.set('db_moq_details', action.payload);
        case UPLOADED_FILE:
            return admin.set('uploaded_file', action.payload);
        case RESET_UPLOADED_FILE:
            return admin.set('uploaded_file', {});
        case RO_APPROVAL_COUNT:
            return admin.set('ro_approval_count', action.payload);
        case SET_CORRELATION_ID:
            return admin.set('correlation_id', action.payload);
        default:
            return admin;
    }
}

export default admin;