import {
    LOG_APP_ISSUE,
} from '../actions/errorActionTypes.js';

import Immutable from 'immutable';

const applicationDefaultData = Immutable.Map({
	'issue': {}
});

export default (error = applicationDefaultData, action) => {
    switch (action.type) {
        case LOG_APP_ISSUE:
            return error.set('issue', action.payload);
        default:
            return error;
    }
}