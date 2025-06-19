import {
  DASHBOARD_CREDIT_DETAILS,
  DASHBOARD_PO_DETAILS,
  DASHBOARD_ORDER_LIST,
  DASHBOARD_REGION_DETAILS,
  DASHBOARD_SET_ALL_MATERIALS,
  DASHBOARD_SET_WAREHOUSES,
  ALERT_DETAILS,
} from '../actions/dashboardActionTypes';

import Immutable from 'immutable';

const application_default_data = Immutable.Map({
  loading: true,
  materials: [],
  order_list: Immutable.Map({
    data: [],
    totalCount: 0,
  }),
  po_details: {},
  region_details: {},
  credit_details: {},
  warehouses: {},
});

const dashboard = (dashboard = application_default_data, action) => {
  // const { payload, type } = action;
  if (action.type === DASHBOARD_SET_ALL_MATERIALS) {
    return dashboard.set('materials', action.payload);
  } else if (action.type === DASHBOARD_ORDER_LIST) {
    return dashboard
      .set('loading', false)
      .setIn(['order_list', 'data'], action.payload.data)
      .setIn(['order_list', 'drafts'], action.payload.drafts)
      .setIn(['order_list', 'rushDrafts'], action.payload.rushDrafts)
      .setIn(['order_list', 'totalCount'], action.payload.totalCount)
      .setIn(['order_list', 'sync'], action.payload.sync)
      .setIn(['order_list', 'lastSync'], action.payload.lastSync);
  } else if (action.type === DASHBOARD_SET_WAREHOUSES) {
    return dashboard.set('warehouses', action.payload);
  } else if (action.type === DASHBOARD_PO_DETAILS) {
    return dashboard
      .set('loading', false)
      .set('po_details', action.payload);
  } else if (action.type === DASHBOARD_REGION_DETAILS) {
    return dashboard
      .set('loading', false)
      .set('region_details', action.payload);
  } else if (action.type === ALERT_DETAILS) {
    return dashboard
      .set('loading', false)
      .set('alert_details', action.payload);
  } else if (action.type === DASHBOARD_CREDIT_DETAILS) {
    return dashboard
      .set('loading', false)
      .set('credit_details', action.payload);
  } else {
    return dashboard;
  }
};

export default dashboard;
