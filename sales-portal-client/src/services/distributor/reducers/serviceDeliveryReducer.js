import {
    ADD_SERVICE_DELIVERY_REQUEST,
    SERVICE_DELIVERY_REQUEST_LIST,
    UPADTE_CFA_RESPONSE
} from '../actions/serviceDeliveryActionType';
import Immutable from 'immutable';

const application_default_data = Immutable.Map({
    loading: true,
    categories: [],
    // updated_cfa_details: 0,
    updated_cfa_details: {},
    sdr_list: Immutable.Map({
        data: [],
        totalCount: 0
    }),
    add_sdr: {}
});
const serviceDeliveryRequestReducer = (state = application_default_data, action) => {
    
    switch (action.type) {
        case SERVICE_DELIVERY_REQUEST_LIST:
            return state
                .set('loading', false)
                .setIn(['sdr_list', 'data'], action.payload.rows)
                .setIn(['sdr_list', 'totalCount'], action.payload.totalCount);
        case ADD_SERVICE_DELIVERY_REQUEST:
            return state.set('add_sdr', action.payload);

        case UPADTE_CFA_RESPONSE:
            return state.set('updated_cfa_details', action.payload);

        default: return state;
    }
}
export default serviceDeliveryRequestReducer;