import {
	AUTH_UPDATE_REGISTER_FORM_FIELD,
	AUTH_SUBMIT_REGISTER_FORM,
	AUTH_INVALIDATE_REGISTER_FORM,
	AUTH_RESET_REGISTER_FORM_FIELDS,
	AUTH_UPDATE_USER_DATA,
	AUTH_RESET_USER_DATA,
	AUTH_UPDATE_USER_FIELD,
	AUTH_SUBMIT_LOGIN_FORM,
	AUTH_UPDATE_LOGIN_FORM_FIELD,
	AUTH_INVALIDATE_LOGIN_FORM,
	AUTH_RESET_LOGIN_FORM_FIELDS,
	AUTH_SUBMIT_CHANGE_PASSWORD_FORM,
	AUTH_RESET_CHANGE_PASSWORD_FORM,
	AUTH_UPDATE_CHANGE_PASSWORD_STATUS_FIELD,
	AUTH_UPDATE_CHANGE_PASSWORD_FORM_FIELD,
	AUTH_INVALIDATE_CHANGE_PASSWORD_FORM,
	REDUX_RESET_STATE,
	APP_LEVEL_CONFIG,
	PDP_WINDOWS
} from './actionTypes';

import Immutable from 'immutable';

const application_default_data = Immutable.Map({

	status: Immutable.Map({
		logged_in: false,
		in_progress: false,
	}),

	user: Immutable.Map({}), // this contains the decoded token data

	register: Immutable.Map({
		submit: false,
		error: false
	}),

	login: Immutable.Map({
		submit: false,
		error: false,
		login_id: '',
		password: '',
	}),

	reset_password: Immutable.Map({
		submit: false,
		done: false,
		error: false,
		password: '',
		password_confirm: ''
	}),

	app_level_configuration: [],
	pdp_windows: []

});



function auth(auth = application_default_data, action) {
	switch (action.type) {
		case REDUX_RESET_STATE:
			return auth
				.setIn(['auth', 'status'], {
					logged_in: false,
					in_progress: false
				})
				.setIn(['auth', 'user'], {})
				.setIn(['auth', 'login'], {
					submit: false,
					error: false,
					login_id: '',
					password: '',
				})
				.setIn(['auth', 'reset_password'], {
					submit: false,
					done: false,
					error: false,
					password: '',
					password_confirm: ''
				})
		case AUTH_UPDATE_REGISTER_FORM_FIELD:
			return auth.setIn(['register', action.payload.field], action.payload.value);
		case AUTH_SUBMIT_REGISTER_FORM:
			return auth.setIn(['register', 'submit'], action.payload);
		case AUTH_INVALIDATE_REGISTER_FORM:
			return auth.setIn(['register', 'error'], action.payload);
		case AUTH_RESET_REGISTER_FORM_FIELDS:
			return auth
				.setIn(['register', 'submit'], false)
				.setIn(['register', 'error'], false)
				.setIn(['register', 'name'], '')
				.setIn(['register', 'email'], '')
				.setIn(['register', 'address'], '')
				.setIn(['register', 'password'], '')
				.setIn(['register', 'password_confirm'], '');
		case AUTH_SUBMIT_LOGIN_FORM:
			return auth.setIn(['login', 'submit'], action.payload);
		case AUTH_UPDATE_LOGIN_FORM_FIELD:
			return auth.setIn(['login', action.payload.field], action.payload.value);
		case AUTH_INVALIDATE_LOGIN_FORM:
			return auth.setIn(['login', 'error'], action.payload);
		case AUTH_RESET_LOGIN_FORM_FIELDS:
			return auth
				.setIn(['login', 'submit'], false)
				.setIn(['login', 'error'], false)
				.setIn(['login', 'login_id'], '')
				.setIn(['login', 'password'], '');
		case AUTH_UPDATE_USER_DATA:
			return auth.set('user', Immutable.Map(action.payload));
		case AUTH_UPDATE_USER_FIELD:
			return auth.setIn(['user', action.payload.key], action.payload.value);
		case AUTH_RESET_USER_DATA:
			return auth.set('user', Immutable.Map({}));
		case AUTH_SUBMIT_CHANGE_PASSWORD_FORM:
			return auth.setIn(['reset_password', 'submit'], action.payload);
		case AUTH_UPDATE_CHANGE_PASSWORD_STATUS_FIELD:
			return auth.setIn(['reset_password', action.payload.field], action.payload.value);
		case AUTH_INVALIDATE_CHANGE_PASSWORD_FORM:
			return auth.setIn(['reset_password', 'error'], action.payload);
		case AUTH_RESET_CHANGE_PASSWORD_FORM:
			return auth
				.setIn(['reset_password', 'submit'], false)
				.setIn(['reset_password', 'error'], false)
				.setIn(['reset_password', 'password'], '')
				.setIn(['reset_password', 'password_confirm'], '');
		case AUTH_UPDATE_CHANGE_PASSWORD_FORM_FIELD:
			return auth.setIn(['reset_password', action.payload.field], action.payload.value);
		case APP_LEVEL_CONFIG:
			return auth.set('app_level_configuration', action.payload);
		case PDP_WINDOWS:
			return auth.set('pdp_windows', action.payload);
		default:
			return auth;
	}


}


export default auth;
