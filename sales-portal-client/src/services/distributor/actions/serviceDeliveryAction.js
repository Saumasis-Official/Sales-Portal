import {
    ADD_SERVICE_DELIVERY_REQUEST,
    SERVICE_DELIVERY_REQUEST_LIST,
    UPADTE_CFA_RESPONSE
} from './serviceDeliveryActionType';
import axios from 'axios';
import * as API from '../../../api/index';
import { isLoading } from '../../../constants/actionsConstants';

export const serviceDeliveryRequestList = (data) => {
    return {
        type: SERVICE_DELIVERY_REQUEST_LIST,
        payload: data
    };
};
export const updateSdResponse = (data) => {
    return {
        type: UPADTE_CFA_RESPONSE,
        payload: data
    };
};

export const addServiceDeliveryRequest = (data) => {
    return {
        type: ADD_SERVICE_DELIVERY_REQUEST,
        payload: data
    }
};

export const addSDR = (data) => {
    let apiUrl = `${API.url('service_delivery_request', "order")}`;
    return (dispatch) => {
        dispatch(isLoading(true))
        return axios
            .post(apiUrl, data)
            .then((response) => {
                dispatch(isLoading(false))
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    }
};

export const addSDRAdmin = (data) => {
    let apiUrl = `${API.url('service_delivery_request_admin', "order")}`;
    return (dispatch) => {
        dispatch(isLoading(true))
        return axios
            .post(apiUrl, data)
            .then((response) => {
                dispatch(isLoading(false))
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    }
};


export const getSDList = (params) => {
    return async dispatch => {
        dispatch(isLoading(true))
        try {
            const response = await axios.post(API.url('sdr_list_admin', "order"), params);
            dispatch(
                serviceDeliveryRequestList(
                    response.data.data
                ));
            dispatch(isLoading(false));
        } catch (error) {
            dispatch(isLoading(false));
            if (error.response) {
                return error.response.data;
            }
        }
    }
};

export const updateCFA = (data) => {
    let apiUrl = `${API.url('service_delivery_request_admin', 'order')}`;
    return (dispatch) => {
        dispatch(isLoading(true))
        return axios
            .put(apiUrl, data)
            .then((response) => {
                dispatch(isLoading(false))
                return response.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
                if (error.response) {
                    return error.response.data;
                }
            });
    }
};