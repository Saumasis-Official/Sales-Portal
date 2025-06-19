export const errorReportFormat = {
	validate_order: {
		oval_001: {
			errorCode: 'ERR-DBO-OVAL-001-DISTID',
			errorMessage: 'Distributor id is required to validate the order details',
			logObj: '',
			//resolution: '', // will add it in later stage
		},
		oval_002: {
			errorCode: 'ERR-DBO-OVAL-002-SHUL',
			errorMessage: 'Please enter shipping & unloading point details',
			logObj: '',
		},
		oval_003: {
			errorCode: 'ERR-DBO-OVAL-003-SHADD',
			errorMessage: 'Please select shipping address',
			logObj: '',
		},
		oval_004: {
			errorCode: 'ERR-DBO-OVAL-004-ITMDET',
			errorMessage: 'Please enter required material details',
			logObj: '',
		},
		oval_005: {
			errorCode: 'ERR-DBO-OVAL-005-ITMERR',
			errorMessage: '',
			logObj: '',
		},
		oval_006: {
			errorCode: 'ERR-DBO-OVAL-006-APIERR',
			errorMessage: 'Could not validate order',
			logObj: '',
		},
		oval_007: {
			errorCode: 'ERR-DBO-OVAL-007-APIFAIL',
			errorMessage: '',
			logObj: '',
		},
		oval_008: {
			errorCode: 'ERR-DBO-OVAL-008-VALERR',
			errorMessage: 'There is error in order items',
			logObj: '',
		},
		oval_009: {
			errorCode: 'ERR-DBO-OVAL-009-TECHERR',
			errorMessage: '',
			logObj: '',
		},
		oval_010: {
			errorCode: 'ERR-DBO-OVAL-009-TENT-AMOUNT',
			errorMessage: 'Unable to get tentative amount value',
			logObj: '',
		},
	},
	create_order: {
		osbt_001: {
			errorCode: 'ERR-DBO-OSBT-001-DISTID',
			errorMessage: 'Distributor id is required to validate the order details',
			logObj: '',
		},
		osbt_002: {
			errorCode: 'ERR-DBO-OSBT-002-SHUL',
			errorMessage: 'Please enter shipping & unloading point details',
			logObj: '',
		},
		osbt_003: {
			errorCode: 'ERR-DBO-OSBT-003-ITMDET',
			errorMessage: 'Please enter required material details',
			logObj: '',
		},
		osbt_004: {
			errorCode: 'ERR-DBO-OSBT-004-APIFAIL',
			errorMessage: '',
			logObj: '',
		},
		osbt_005: {
			errorCode: 'ERR-DBO-OSBT-005-TECHERR',
			errorMessage: 'Some error occurred while creating the sales order',
			logObj: '',
		},
		osbt_006: {
			errorCode: 'ERR-DBO-OSBT-006-PARTNER_MISMATCH',
			errorMessage: 'Partner data mismatch between portal and SAP',
			logObj: '',
		},
	},
	distributor_dashboard: {
		alerts_001: {
			errorCode: 'ERR-DBO-ALERTS-001-TECHERR',
			errorMessage: 'Some error occurred while fetching alerts details',
			logObj: '',
		},
		alerts_002: {
			errorCode: 'ERR-DBO-ALERTS-002-TECHERR',
			errorMessage: 'Some error occurred while updating alerts details',
			logObj: '',
		},
		crd_001: {
			errorCode: 'ERR-DBO-CRD-001-NORCD',
			errorMessage: 'Failed to Fetch credit limit Details',
			logObj: '',
		},
		crd_002: {
			errorCode: 'ERR-DBO-CRD-002-TECHERR',
			errorMessage: 'There is some issue occurred while fetching the credit limit',
			logObj: '',
		},
		del_001: {
			errorCode: 'ERR-DBO-DEL-001-TECHERR',
			errorMessage: 'Some error occurred while fetching sales order delivery',
			logObj: '',
		},
		dwnld_001: {
			errorCode: 'ERR-DBO-DWNLD-001-TECHERR',
			errorMessage: 'Some error occurred while fetching so details',
			logObj: '',
		},
		inv_001: {
			errorCode: 'ERR-DBO-INV-001-TECHERR',
			errorMessage: 'Some error occurred while fetching sales order invoice',
			logObj: '',
		},
		mtrl_001: {
			errorCode: 'ERR-DBO-MTRL-001-TECHERR',
			errorMessage: 'Some error occurred while fetching material list',
			logObj: '',
		},
		po_001: {
			errorCode: 'ERR-DBO-PO-001-TECHERR',
			errorMessage: 'Some error occurred while fetching orders list',
			logObj: '',
		},
		po_002: {
			errorCode: 'ERR-DBO-PO-002-TECHERR',
			errorMessage: 'Some error occurred while fetching PO Details',
			logObj: '',
		},
		profile_001: {
			errorCode: 'ERR-DBO-PROFILE-001-APIFAIL',
			errorMessage: 'Profile api return with no data',
			logObj: '',
		},
		profile_002: {
			errorCode: 'ERR-DBO-PROFILE-002-TECHERR',
			errorMessage: 'Some error occurred while fetching the profile data',
			logObj: '',
		},
		profile_003: {
			errorCode: 'ERR-DBO-PROFILE-003-TECHERR',
			errorMessage: '',
			logObj: '',
		},
		profile_004: {
			errorCode: 'ERR-DBO-PROFILE-004-TECHERR',
			errorMessage: '',
			logObj: '',
		},
		profile_005: {
			errorCode: 'ERR-DBO-PROFILE-005-TECHERR',
			errorMessage: '',
			logObj: '',
		},
		pwd_001: {
			errorCode: 'ERR-DBO-PWD-001-APIFAIL',
			errorMessage: 'Error occurred while updating password',
			logObj: '',
		},
		pwd_002: {
			errorCode: 'ERR-DBO-PWD-002-TECHERR',
			errorMessage: 'There may be error occurred while changing password',
			logObj: '',
		},
		reord_001: {
			errorCode: 'ERR-DBO-REORD-001-NORCD',
			errorMessage: 'No re-order record found with given so number',
			logObj: '',
		},
		reord_002: {
			errorCode: 'ERR-DBO-REORD-002-APIFAIL',
			errorMessage: '',
			logObj: '',
		},
		reord_003: {
			errorCode: 'ERR-DBO-REORD-003-TECHERR',
			errorMessage: 'Some issue occurred while fetching the re-order',
			logObj: '',
		},
		so_001: {
			errorCode: 'ERR-DBO-SO-001-TECHERR',
			errorMessage: 'Some error occurred while fetching so details',
			logObj: '',
		},
		session_001: {
			errorCode: 'ERR-DBO-SESSION-001-TECHERR',
			errorMessage: 'Some error occurred while fetching active session details',
			logObj: '',
		},
		whsd_001: {
			errorCode: 'ERR-DBO-WHSD-001-APIFAIL',
			errorMessage: '',
			logObj: '',
		},
		whsd_002: {
			errorCode: 'ERR-DBO-WHSD-002-TECHERR',
			errorMessage: 'Some error occurred while fetching ship to and unloading points',
			logObj: '',
		},
	},
};
