import {
    LOG_APP_ISSUE
} from "./errorActionTypes";

import axios from 'axios';
import * as API from '../../../api/index';
import Auth from '../../../util/middleware/auth';

import {
    isLoading
} from '../../../constants/actionsConstants';

export function logAppIssue(data) {
    return { type: LOG_APP_ISSUE, payload: data };
}

export function reportPortalError(data, distributorId) {
    let role = Auth.getRole();
    let apiUrl
    if (role) {
      apiUrl = `${API.url('report_portal_error_admin', 'sap')}/${distributorId}`;
    } else {
      apiUrl = `${API.url('report_portal_error', 'sap')}`;
    }
    return (dispatch) => {
        dispatch(isLoading(true))
        return axios
            .post(apiUrl, data)
            .then((response) => {
                dispatch(isLoading(false));
                return response;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                return error;
            });
    }
}

