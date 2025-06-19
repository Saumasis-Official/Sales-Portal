/* eslint-disable import/no-anonymous-default-export */
export default {

	app_level_configuration: {
		search_switch: {
			key: 'ENABLE_SEARCH_SWITCH',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		default_search: {
			key: 'DEFAULT_SEARCH_BEHAVIOUR',
			distributor_specific_value: 'DIST_SPECIFIC',
			universal_value: 'UNIVERSAL'
		},
		change_password: {
			key: 'CHANGE_PASSWORD_LOGGED_IN',
			active_value: 'SHOW',
			inactive_value: 'HIDE'
		},
		profile_update: {
			key: 'PROFILE_UPDATE',
			active_value: 'SHOW',
			inactive_value: 'HIDE'
		},
		report_issue: {
			key: 'REPORT_ISSUE',
			active_value: 'SHOW',
			inactive_value: 'HIDE'
		},
		session_info: {
			key: 'SHOW_SESSION_INFO',
			active_value: 'SHOW',
			inactive_value: 'HIDE'
		},
		bom_explode: {
			key: 'ENABLE_BOM_EXPLODE',
			active_value: 'SHOW',
			inactive_value: 'HIDE'
		},
		create_or_reorder_admin: {
			key: 'ENABLE_ADMIN_CREATE_ORDER',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		show_draft: {
			key: 'ENABLE_DRAFT',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		liquidation: {
			key: 'ENABLE_LIQUIDATION',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		self_lifting: {
			key: 'ENABLE_SELF_LIFTING',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		pdp_restriction: {
			key: 'ENABLE_PDP_RESTRICTION',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		pdp_fortnightly_order_window: {
			key: 'PDP_FORTNIGHTLY_ORDER_WINDOW',
			default_value: 1
		},
		pdp_weekly_order_window: {
			key: 'PDP_WEEKLY_ORDER_WINDOW',
			default_value: 1
		},
		pdp_order_placement_time: {
			key: 'PDP_ORDER_PLACEMENT_TIME',
			default_value: 17
		},
		pdp_weekly_off: {
			key: 'PDP_WEEKLY_OFF',
			default_value: 'SUNDAY'
		},
		cart_expiry_window: {
			key: 'CART_EXPIRY_WINDOW',
			default_value: 15
		},
		partner_mismatch_error_recipients: {
			key: 'PARTNER-MISMATCH-ERROR-RECIPIENTS',
			default_value: null
		},
		service_delivery_requests: {
			key: 'ENABLE_SERVICE_DELIVERY_REQUESTS',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		enable_reserved_credit: {
			key: 'ENABLE_RESERVE_CREDIT',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		enable_order_approval_rush_order: {
			key: 'ENABLE_ORDER_APPROVAL_RUSH_ORDER',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		enable_quantity_norm: {
			key: 'ENABLE_QUANTITY_NORM',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		enable_promise_credit: {
			key: 'ENABLE_PROMISE_CREDIT_FIRST',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		enable_second_promise_credit: {
			key: 'ENABLE_PROMISE_CREDIT_SECOND',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		second_promise_credit_start_time: {
			key: 'ENABLE_PROMISE_CREDIT_SECOND_START_TIME',
		},
		second_promise_credit_end_time: {
			key: 'ENABLE_PROMISE_CREDIT_SECOND_END_TIME',
		},
		portal_managed_configuration: 'SET_BY_SYSTEM',
		pdp_weekly: {
			THRESHOLD_FREQUENCY: 0,
			MO: {
				key1: 'order_window_mo',
				key2: 'order_placement_end_time_mo',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			TU: {
				key1: 'order_window_tu',
				key2: 'order_placement_end_time_tu',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			WE: {
				key1: 'order_window_we',
				key2: 'order_placement_end_time_we',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			TH: {
				key1: 'order_window_th',
				key2: 'order_placement_end_time_th',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			FR: {
				key1: 'order_window_fr',
				key2: 'order_placement_end_time_fr',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			SA: {
				key1: 'order_window_sa',
				key2: 'order_placement_end_time_sa',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			SU: {
				key1: 'order_window_su',
				key2: 'order_placement_end_time_su',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
		},
		pdp_fortnightly: {
			THRESHOLD_FREQUENCY: 0,
			MO: {
				key1: 'order_window_mo',
				key2: 'order_placement_end_time_mo',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			TU: {
				key1: 'order_window_tu',
				key2: 'order_placement_end_time_tu',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			WE: {
				key1: 'order_window_we',
				key2: 'order_placement_end_time_we',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			TH: {
				key1: 'order_window_th',
				key2: 'order_placement_end_time_th',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			FR: {
				key1: 'order_window_fr',
				key2: 'order_placement_end_time_fr',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			SA: {
				key1: 'order_window_sa',
				key2: 'order_placement_end_time_sa',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
			SU: {
				key1: 'order_window_su',
				key2: 'order_placement_end_time_su',
				orderWindow: '44:00',
				orderPlacementEndTime: '-04:00',
				orderWindowException: null,
				orderPlacementEndTimeException: null,
			},
		},
		enable_rush_order_requests: {
			key: 'ENABLE_RO_REQUEST',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		enable_bulk_order: {
			key: 'ENABLE_BO',
			enable_value: 'YES',
			disable_value: 'NO'
		},
		ro_approvers: {
			key: 'RO_APPROVERS',
			default_value: ''
		},
	}

}
