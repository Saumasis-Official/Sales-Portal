import {
	DISTRIBUTOR_UPDATE_CREATE_ORDER_FORM_FIELD,
	DISTRIBUTOR_SUBMIT_CREATE_ORDER_FORM,
	DISTRIBUTOR_VALIDATE_CREATE_ORDER_FORM,
	DISTRIBUTOR_INVALIDATE_CREATE_ORDER_FORM,
	DISTRIBUTOR_RESET_CREATE_ORDER_FORM_FIELDS,
	DISTRIBUTOR_RESET_CREATE_ORDER_COMPLETE_FORM_FIELDS,
	DISTRIBUTOR_RESET_CREATE_ORDER_FORM_FIELDS_FOR_LIQ_TOGGLE,
	DISTRIBUTOR_SET_MATERIALS_FIELD,
	DISTRIBUTOR_SET_WAREHOUSES,
	LIQ_MATERIALS,
	FORECAST_FOR_DIST,
	EXCLUDED_MATERIALS
} from './actionTypes';

import Immutable from 'immutable';

const application_default_data = Immutable.Map({
	'create_order': Immutable.Map({
		submit: false,
		error: false,
		doc_type: '',
		sales_org: '',
		distribution_channel: '',
		division: '',
		soldto: '',
		shipto: Immutable.Map({}),
		unloadingpoint: '',
		so_number: '',
		po_number: '',
		po_date: '',
		req_date: '',
		items: [],
		partners: [],
		navresult: [],
		order_payload: {},
		order_response: {},
		order_total_amount: '',
		distributor_psku_tolerance: [],
	}),
	'warehouses': {},
	'materials': Immutable.List([]),
	'forecast_materials': Immutable.List([]),
	'rule_config_excluded_materials': Immutable.List([]),
});



function distributor(distributor = application_default_data, action) {
	switch (action.type) {
		case DISTRIBUTOR_UPDATE_CREATE_ORDER_FORM_FIELD:
			return distributor.setIn(['create_order', action.payload.field], action.payload.value);
		case DISTRIBUTOR_SUBMIT_CREATE_ORDER_FORM:
			return distributor.setIn(['create_order', 'submit'], action.payload);
		case DISTRIBUTOR_INVALIDATE_CREATE_ORDER_FORM:
			return distributor.setIn(['create_order', 'error'], action.payload);
		case DISTRIBUTOR_SET_MATERIALS_FIELD:
			return distributor.set('materials', action.payload);
		case DISTRIBUTOR_SET_WAREHOUSES:
			return distributor.set('warehouses', action.payload);
		case DISTRIBUTOR_RESET_CREATE_ORDER_FORM_FIELDS:
			return distributor
				.setIn(['create_order', 'submit'], false)
				.setIn(['create_order', 'error'], false)
				.setIn(['create_order', 'doc_type'], '')
				.setIn(['create_order', 'sales_org'], '')
				.setIn(['create_order', 'distribution_channel'], '')
				.setIn(['create_order', 'division'], '')
				.setIn(['create_order', 'soldto'], '')
				.setIn(['create_order', 'shipto'], {})
				.setIn(['create_order', 'unloadto'], '')
				.setIn(['create_order', 'unloadingpoint'], '')
				.setIn(['create_order', 'items'], [])
				.setIn(['create_order', 'partners'], [])
				.setIn(['create_order', 'navresult'], [])
		case DISTRIBUTOR_RESET_CREATE_ORDER_COMPLETE_FORM_FIELDS:
			return distributor
				.setIn(['create_order', 'submit'], false)
				.setIn(['create_order', 'error'], false)
				.setIn(['create_order', 'doc_type'], '')
				.setIn(['create_order', 'sales_org'], '')
				.setIn(['create_order', 'distribution_channel'], '')
				.setIn(['create_order', 'division'], '')
				.setIn(['create_order', 'soldto'], '')
				.setIn(['create_order', 'shipto'], {})
				.setIn(['create_order', 'unloadto'], '')
				.setIn(['create_order', 'unloadingpoint'], '')
				.setIn(['create_order', 'items'], [])
				.setIn(['create_order', 'partners'], [])
				.setIn(['create_order', 'navresult'], [])
				.setIn(['create_order', 'req_date'], '')
				.setIn(['create_order', 'so_number'], '')
				.setIn(['create_order', 'po_date'], '')
				.setIn(['create_order', 'po_number'], '')
				.setIn(['create_order', 'order_payload'], {})
				.setIn(['create_order', 'order_payload'], {})
				.setIn(['create_order', 'order_total_amount'], '')
				.set('warehouses', {})
				.set('materials', [])
				.set('forecast_materials', [])
		case DISTRIBUTOR_RESET_CREATE_ORDER_FORM_FIELDS_FOR_LIQ_TOGGLE:
			return distributor
				.setIn(['create_order', 'submit'], false)
				.setIn(['create_order', 'error'], false)
				.setIn(['create_order', 'doc_type'], '')
				.setIn(['create_order', 'items'], [])
				.setIn(['create_order', 'navresult'], [])
				.setIn(['create_order', 'req_date'], '')
				.setIn(['create_order', 'so_number'], '')
				.setIn(['create_order', 'po_date'], '')
				.setIn(['create_order', 'po_number'], '')
				.setIn(['create_order', 'order_payload'], {})
				.setIn(['create_order', 'order_payload'], {})
				.setIn(['create_order', 'order_total_amount'], '')
				.set('materials', [])
				.set('forecast_materials', [])
		case DISTRIBUTOR_VALIDATE_CREATE_ORDER_FORM:
			return distributor.setIn(['create_order', 'submit'], action.payload);
		case LIQ_MATERIALS:
			return distributor.set('liq_materials', action.payload);
		case FORECAST_FOR_DIST:
			return distributor.set('forecast_materials', action.payload);
		case EXCLUDED_MATERIALS:
			return distributor.set('rule_config_excluded_materials', action.payload);
		default:
			return distributor;
	}


}


export default distributor;
