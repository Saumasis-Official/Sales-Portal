import {
    REDUX_RESET_STATE,
    AUTH_UPDATE_REGISTER_FORM_FIELD,
    AUTH_SUBMIT_REGISTER_FORM,
    AUTH_INVALIDATE_REGISTER_FORM,
    AUTH_RESET_REGISTER_FORM_FIELDS,
    AUTH_UPDATE_USER_DATA,
    AUTH_RESET_USER_DATA,
    AUTH_UPDATE_USER_FIELD,
    AUTH_UPDATE_LOGIN_FORM_FIELD,
    AUTH_SUBMIT_LOGIN_FORM,
    AUTH_INVALIDATE_LOGIN_FORM,
    AUTH_RESET_LOGIN_FORM_FIELDS,
    AUTH_SUBMIT_CHANGE_PASSWORD_FORM,
    AUTH_UPDATE_CHANGE_PASSWORD_STATUS_FIELD,
    AUTH_INVALIDATE_CHANGE_PASSWORD_FORM,
    AUTH_RESET_CHANGE_PASSWORD_FORM,
    AUTH_UPDATE_CHANGE_PASSWORD_FORM_FIELD,
    AUTH_UPDATE_OTP_FORM_FIELD,
    AUTH_INVALIDATE_OTP_FORM,
    AUTH_RESET_OTP_FORM_FIELDS,
    AUTH_SUBMIT_OTP_FORM,
    USER_UPDATE_PROFILE,
    USER_UPDATE_PROFILE_FIELD,
    USER_DELETE_PROFILE_FIELD,
    USER_PROFILE_LOADED,
    UPDATE_FIELD,
    UPDATE_SECTION,
    UPDATE_TABS,
    UPDATE_LOADED,
    APP_LEVEL_CONFIG,
} from './actionTypes';
import Util from '../../util/helper';

import axios from 'axios';
import * as API from '../../api/index';
import { message, notification } from 'antd';
import Auth from '../../util/middleware/auth';
import jwt from 'jsonwebtoken';
import { browserHistory } from 'react-router';
import { isLoading } from '../../constants/actionsConstants';
import config from '../../config/server';
import ReactGA4 from 'react-ga4';
import { MAX_FAILED_ATTEMPT_COUNT, FAILED_ATTEMPT_TIME_LIMIT_MINUTE } from '../../config/constant';
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
export function fetchProfileSuccess(data) {
    return {
        type: 'FETCH_PROFILE_SUCCESS',
        payload: {
            data: data,
        },
    };
}
export function fetchProfile() {
    return (dispatch) => {
        return axios
            .get(API.url('userfetch', 'auth'))
            .then((response) => {
                let json = response.data;
                dispatch(fetchProfileSuccess(json));
            })
            .catch((error) => {});
    };
}
export function authUpdateRegisterFormField(data) {
    return { type: AUTH_UPDATE_REGISTER_FORM_FIELD, payload: data };
}
export function authSubmitRegisterForm(data) {
    return { type: AUTH_SUBMIT_REGISTER_FORM, payload: data };
}
export function authInvalidateRegisterForm(data) {
    return { type: AUTH_INVALIDATE_REGISTER_FORM, payload: data };
}
export function authResetRegisterFormFields() {
    return { type: AUTH_RESET_REGISTER_FORM_FIELDS };
}

export async function validateDistributorId(id) {
    const apiUrl = `${API.url('validate_distributor_id', 'auth')}/${id}`;
    return await axios.get(apiUrl);
}

export function authServerRegisterUser(data) {
    return (dispatch) => {
        let nofity_message = message.info('Creating your account...', 0);
        dispatch(isLoading(true));
        return axios
            .post(API.url('register', 'auth'), data)
            .then((response) => {
                let json = response.data;
                nofity_message();
                dispatch(authSubmitRegisterForm(false));
                dispatch(isLoading(false));
                if (json.success !== true) {
                    message.info('Error occurred while creating account.', 3);
                    notification.error({
                        message: 'Error Occurred',
                        description: json.error,
                        duration: 8,
                        className: 'notification-error',
                    });
                } else {
                    dispatch(authResetRegisterFormFields());
                    message.info('Account successfully created. You can login now.', 3);
                    // browserHistory.push('/auth/login');
                }
            })
            .catch((error) => {
                dispatch(authSubmitRegisterForm(false));
                notification.error({
                    message: 'Error Occurred',
                    description: error,
                    duration: 8,
                    className: 'notification-error',
                });
            });
    };
}
export function authUpdateLoginFormField(data) {
    return { type: AUTH_UPDATE_LOGIN_FORM_FIELD, payload: data };
}
export function authSubmitLoginForm(status) {
    return { type: AUTH_SUBMIT_LOGIN_FORM, payload: status };
}
export function authInvalidateLoginForm(data) {
    return { type: AUTH_INVALIDATE_LOGIN_FORM, payload: data };
}
export function authResetLoginFormFields() {
    return { type: AUTH_RESET_LOGIN_FORM_FIELDS };
}

export function authUpdateOtpFormField(data) {
    return { type: AUTH_UPDATE_OTP_FORM_FIELD, payload: data };
}
export function authInvalidateOtpForm(data) {
    return { type: AUTH_INVALIDATE_OTP_FORM, payload: data };
}
export function authResetOtpFormFields() {
    return { type: AUTH_RESET_OTP_FORM_FIELDS };
}
export function authSubmitOtpForm(status) {
    return { type: AUTH_SUBMIT_OTP_FORM, payload: status };
}

export function authUpdateUserData(data) {
    return { type: AUTH_UPDATE_USER_DATA, payload: data };
}

export function authUpdateUserField(data) {
    return { type: AUTH_UPDATE_USER_FIELD, payload: data };
}

export function authResetUserData() {
    return { type: AUTH_RESET_USER_DATA };
}

export function authServerGenerateOtpCode(data) {
    return (dispatch) => {
        return axios.post(API.url('generate_otp', 'auth'), data);
    };
}

export function authServerLoginUser(data) {
    const dataSend = { login_id: data.login_id, password: data.password };

    return (dispatch) => {
        window.localStorage.setItem('TCPL_correlation_id', Util.createUUID());
        let failedData = Auth.getFailedLoginData();
        if (failedData && failedData[dataSend.login_id]) {
            const distributorLoginFailure = failedData[dataSend.login_id];
            const timeFrameInMillis = FAILED_ATTEMPT_TIME_LIMIT_MINUTE * 60 * 1000;
            const timeDIfference = Date.now() - new Date(distributorLoginFailure.last_failed_attempt).getTime();
            if (distributorLoginFailure.failedAttempts % MAX_FAILED_ATTEMPT_COUNT === 0 && timeDIfference <= timeFrameInMillis) {
                notification.error({
                    message: 'Failed Login Attempts Exceeded',
                    description: `Try after ${Math.ceil((timeFrameInMillis - timeDIfference) / 60000)} minutes`,
                    duration: 8,
                    className: 'notification-error',
                });
                return;
            }
        }

        // let nofity_message = message.info("Logging you in.. please wait", 0);
        dispatch(isLoading(true));
        return axios
            .post(API.url('login', 'auth'), dataSend, {
                headers: {
                    'x-correlation-id': window.localStorage.getItem('TCPL_correlation_id'),
                },
            })
            .then((response) => {
                let json = response.data;
                // nofity_message();
                dispatch(authSubmitLoginForm(false));

                if (json.success === false) {
                    dispatch(isLoading(false));
                    notification.error({
                        message: 'Error occurred',
                        description: json.error || 'Please enter correct username/password',
                        duration: 8,
                        className: 'notification-error',
                    });
                    if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
                        ReactGA4.event({
                            category: 'Login',
                            action: 'Incorrect login attempt',
                        });
                    }
                } else {
                    dispatch(authResetLoginFormFields());
                    // message.info("Successfully logged in", 3);
                    Auth.setAccessToken(json.token);
                    const userToken = jwt.decode(json.token);
                    dispatch(authUpdateUserData(userToken));
                    dispatch(isLoading(false));
                    if (failedData && failedData.hasOwnProperty(dataSend.login_id)) {
                        delete failedData[dataSend.login_id];
                        window.localStorage.setItem('failed-login', JSON.stringify(failedData));
                    }
                    if (userToken.type === 'DISTRIBUTOR') {
                        if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
                            ReactGA4.event({
                                category: 'Login',
                                action: 'Successful Distributor Login',
                            });
                        }
                        data.history.push({ pathname: '/distributor/dashboard', state: userToken?.login_id });
                    } else {
                        // browserHistory.push(routes.vendor_dashboard);
                    }
                }
            })
            .catch((error) => {
                // nofity_message();
                dispatch(authSubmitLoginForm(false));
                dispatch(isLoading(false));
                if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
                    ReactGA4.event({
                        category: 'Login',
                        action: 'Technical error login',
                    });
                }
                if (error.response && error.response.data) {
                    if (error.response.data.last_failed_attempt && error.response.data.failed_attempts) {
                        Auth.setFailedLoginData(dataSend.login_id, error.response.data.last_failed_attempt, error.response.data.failed_attempts);
                    }
                    notification.error({
                        message: 'Unable to login',
                        description: error.response.data.message,
                        duration: 8,
                        className: 'notification-error',
                    });
                }
            });
    };
}

export function authServerVerifyOtp(data) {
    return (dispatch) => {
        let nofity_message = message.info('Verifying OTP code. please wait', 0);
        nofity_message();

        return axios.post(API.url('verify_otp', 'auth'), data);
    };
}

export function authSubmitChangePasswordForm(status) {
    return { type: AUTH_SUBMIT_CHANGE_PASSWORD_FORM, payload: status };
}

export function authUpdateChangePasswordStatusField(data) {
    return {
        type: AUTH_UPDATE_CHANGE_PASSWORD_STATUS_FIELD,
        payload: data,
    };
}

export function authUpdateChangePasswordFormField(data) {
    return {
        type: AUTH_UPDATE_CHANGE_PASSWORD_FORM_FIELD,
        payload: data,
    };
}

export function authInvalidateChangePasswordForm(data) {
    return {
        type: AUTH_INVALIDATE_CHANGE_PASSWORD_FORM,
        payload: data,
    };
}

export function authResetChangePasswordForm(data) {
    return { type: AUTH_RESET_CHANGE_PASSWORD_FORM, payload: data };
}

export function authServerResetPassword(data) {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('reset_password', 'auth'), data)
            .then((response) => {
                let json = response.data;
                dispatch(authSubmitChangePasswordForm(false));
                if (json.success === false) {
                    dispatch(isLoading(false));
                    if (json.message === 'Please enter correct OTP') {
                        notification.error({
                            message: json.message || 'Error occurred',
                            description: json.error || 'Please enter correct OTP',
                            duration: 8,
                            className: 'notification-error',
                        });

                        if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
                            ReactGA4.event({
                                category: 'Password',
                                action: 'Entered incorrect OTP',
                            });
                        }
                    } else {
                        notification.error({
                            message: 'Error occurred',
                            description: json.message || 'Could not reset password',
                            duration: 8,
                            className: 'notification-error',
                        });
                    }
                } else {
                    message.info('Password changed successfully', 3);

                    if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
                        ReactGA4.event({
                            category: 'Password',
                            action: 'Password changed successfully',
                        });
                    }
                    dispatch(
                        authUpdateChangePasswordStatusField({
                            field: 'done',
                            value: true,
                        }),
                    );
                    dispatch(isLoading(false));
                    data.history.push('/auth/login');
                }
            })
            .catch((error) => {
                dispatch(authSubmitChangePasswordForm(false));
                dispatch(isLoading(false));

                if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') {
                    ReactGA4.event({
                        category: 'Password',
                        action: 'Password change failure',
                    });
                }
                if (error.response && error.response.data) {
                    notification.error({
                        message: 'Unable to reset password',
                        description: error.response.data.message,
                        duration: 8,
                        className: 'notification-error',
                    });
                }
            });
    };
}

export function userProfileLoaded(data) {
    return { type: USER_PROFILE_LOADED, payload: data };
}

export function userUpdateProfile(data) {
    return { type: USER_UPDATE_PROFILE, payload: data };
}

export function userUpdateProfileField(data) {
    return { type: USER_UPDATE_PROFILE_FIELD, payload: data };
}

export function userDeleteProfileField(data) {
    return { type: USER_DELETE_PROFILE_FIELD, payload: data };
}

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

export const setAppLevelConfiguration = (data) => {
    return {
        type: APP_LEVEL_CONFIG,
        payload: data,
    };
};

export const fetchAppLevelSettings = () => {
    let apiUrl = `${API.url('fetch_app_level_settings', 'auth')}`;
    return (dispatch) => {
        return axios
            .get(apiUrl)
            .then((response) => {
                dispatch(setAppLevelConfiguration(response.data.data));
            })
            .catch((error) => {});
    };
};

export const get_Depot_Code = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_depot_code', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const get_survey_satistics_by_admin = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_survey_satistics', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const update_cfa_question_by_admin = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('update_cfa_question', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const get_cfa_questions_admin = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_cfa_questions_admin', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const get_cfa_questions = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('get_cfa_questions', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const survey_db_response = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('survey_db_response', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));

                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const setROExpired = () => {
    return (dispatch) => {
        //change to 'syncjob' later
        return axios
            .put(API.url('set_ro_expired', 'order'))
            .then((response) => {
                return response?.data;
            })
            .catch((error) => {
                return error;
            });
    };
};

export const surveyLink = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('save_survey_link', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const surveyLinkResponse = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('survey_link_response', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const saveNocResponse = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('save_noc_response', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchDistributorAgreements = (limit, offset, status, search) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('fetch_distributor_agreements', 'auth'), {
                params: {
                    limit,
                    offset,
                    status,
                    search,
                },
            })
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const submitSurvey = (data) => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .post(API.url('save_survey_response', 'auth'), data)
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};

export const fetchSurveyResponse = () => {
    return (dispatch) => {
        dispatch(isLoading(true));
        return axios
            .get(API.url('fetch_survey_response', 'auth'))
            .then((response) => {
                dispatch(isLoading(false));
                return response?.data;
            })
            .catch((error) => {
                dispatch(isLoading(false));
            });
    };
};
