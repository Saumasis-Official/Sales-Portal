import {
    LOG_APP_ISSUE
} from "./errorActionTypes";

import axios from 'axios';
import * as API from '../../../api/index';

import {
    isLoading
} from '../../../constants/actionsConstants';

export function logAppIssue(data) {
    return { type: LOG_APP_ISSUE, payload: data };
}

export function reportPortalErrorForCFA(data) {
    let apiUrl = `${API.url('report_portal_error_cfa', 'sap')}`;
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

