import Joi from 'joi';
import { roles } from '../constant/persona';

const appLevelConfigurationItem = Joi.object().keys({
    key: Joi.string().required(),
    value: Joi.string().required().allow(''),
    remarks: Joi.string().required(),
});

const validation = {
    loginUser: {
        body: {
            login_id: Joi.string().required(),
            password: Joi.string().min(6).max(50).required(),
        },
    },
    changePassword: {
        body: {
            current_password: Joi.string().required(),
            new_password: Joi.string().min(6).max(50).required(),
        },
    },
    createUser: {
        body: {
            username: Joi.string().min(4).max(50).required(),
            password: Joi.string().min(6).max(50).required(),
            email: Joi.string()
                .regex(/^[\w.]+@[\w]+?(\.[a-zA-Z]{2,3}){1,3}$/)
                .required(),
            verify_password: Joi.string().min(6).max(50).required(),
        },
    },
    resetPassword: {
        body: {
            login_id: Joi.string().required(),
            otp: Joi.string()
                .regex(/^[0-9]{6}$/)
                .required(),
            password: Joi.string().min(6).max(50).required(),
        },
    },
    generateOtp: {
        body: {
            login_id: Joi.string().required(),
        },
    },
    updateAlert: {
        body: {
            cloumn_name: Joi.array().required(),
            login_id: Joi.string().required(),
        },
    },
    getAlert: {
        params: {
            id: Joi.string().required(),
        },
    },
    sessions: {
        body: {
            from: Joi.string().required(),
            to: Joi.string().required(),
            type: Joi.string().valid('all', 'success', 'failure', 'active', ''),
            login_id: Joi.string(),
            search: Joi.string().allow(''),
        },
    },
    // distributorList: {
    //   body: {
    //     limit: Joi.number().required(),
    //     offset: Joi.number().required(),
    //     search: Joi.string().allow(''),
    //     status: Joi.string().valid('ALL', 'ACTIVE', 'INACTIVE', 'DELETED'),
    //     customer_group: Joi.string().allow(''),
    //     state: Joi.string().allow(''),
    //     region: Joi.string().allow(''),
    //     areaCode: Joi.string().allow(''),
    //     plantCode: Joi.string().allow(null,'')
    //   }
    // },
    distributorList: {
        body: {
            limit: Joi.number().required(),
            offset: Joi.number().required(),
            search: Joi.string().allow(''),
            status: Joi.string().valid('ALL', 'ACTIVE', 'INACTIVE', 'DELETED'),
            customer_group: Joi.array().items(Joi.string()),
            state: Joi.array().items(Joi.string()),
            region: Joi.array().items(Joi.string()),
            areaCode: Joi.array().items(Joi.string()),
            plantCode: Joi.array().items(Joi.string()),
            dist_channel: Joi.array().items(Joi.number()),
        },
    },
    tseUserList: {
        body: {
            limit: Joi.number().required(),
            offset: Joi.number().required(),
            search: Joi.string().allow(''),
            status: Joi.string().valid('enabled', 'disabled'),
            role: Joi.string().valid(
                'SUPER_ADMIN',
                'DIST_ADMIN',
                'CLUSTER_MANAGER',
                'ASM',
                'TSE',
                'SUPPORT',
                'CFA',
                'LOGISTIC_OFFICER',
                'ZONAL_OFFICER',
                'OPERATIONS',
                'RSM',
                'KAMS',
                'MDM',
                'PORTAL_OPERATIONS',
                'SHOPPER_MARKETING',
                'FINANCE',
                'VP',
                'NKAMS',
                'SHOPIFY_UK',
                'CALL_CENTRE_OPERATIONS',
                'FINANCE_CONTROLLER',
                'SHOPIFY_SUPPORT',
                'SHOPIFY_OBSERVER',
                'CL_PRIMARY_APPROVER',
                'CL_SECONDARY_APPROVER',
                'RCM',
                'HOF',
                'GT_PRIMARY_APPROVER',
                'GT_SECONDARY_APPROVER',
                'CUSTOMER_SERVICE',
            ),
            deleted: Joi.boolean(),
        },
    },
    updateLoginSetting: {
        params: {
            distributor_id: Joi.string().required(),
        },
        body: {
            enable_login: Joi.boolean(),
            enable_liquidation: Joi.boolean(),
        },
    },
    updateAlertSettings: {
        params: {
            distributor_id: Joi.string().required(),
        },
        body: {
            enable_po_so_sms: Joi.boolean(),
            enable_po_so_email: Joi.boolean(),
            enable_invoice_sync_sms: Joi.boolean(),
            enable_invoice_sync_email: Joi.boolean(),
            sms_tse_asm: Joi.boolean(),
            email_tse_asm: Joi.boolean(),
        },
    },
    updateAlertHistory: {
        params: {
            distributor_id: Joi.string().required(),
        },
        body: {
            alert_setting_changes: Joi.object()
                .keys({
                    enable_po_so_sms: Joi.boolean(),
                    enable_po_so_email: Joi.boolean(),
                    enable_invoice_sync_sms: Joi.boolean(),
                    enable_invoice_sync_email: Joi.boolean(),
                    enable_login: Joi.boolean(),
                    sms_tse_asm: Joi.boolean(),
                    email_tse_asm: Joi.boolean(),
                })
                .required(),
            remarks: Joi.string().required(),
            // changed_by: Joi.string().required()
        },
    },
    updateDistributorSettings: {
        params: {
            distributor_id: Joi.string().required(),
        },
        body: {
            enable_po_so_sms: Joi.boolean(),
            enable_po_so_email: Joi.boolean(),
            enable_invoice_sync_sms: Joi.boolean(),
            enable_invoice_sync_email: Joi.boolean(),
            enable_login: Joi.boolean(),
            sms_tse_asm: Joi.boolean(),
            email_tse_asm: Joi.boolean(),
            remarks: Joi.string().required(),
            enable_liquidation: Joi.boolean(),
            enable_pdp: Joi.boolean(),
            enable_ao: Joi.boolean(),
            enable_reg: Joi.boolean(),
            enable_ro: Joi.boolean(),
            enable_bo: Joi.boolean(),
            enable_aos: Joi.boolean(),
            enable_noc: Joi.boolean(),
            enable_delivery_code_email: Joi.boolean(),
            enable_delivery_code_sms: Joi.boolean(),
        },
    },
    alertCommentList: {
        params: {
            distributor_id: Joi.string().required(),
        },
    },
    updateTseUserSetting: {
        body: {
            user_id: Joi.string().required(),
            enableLogin: Joi.string().valid('ACTIVE', 'INACTIVE'),
            role: Joi.array().items(Joi.string().valid(Object.values(roles))),
            isDeleted: Joi.boolean(),
            code: Joi.string().optional().allow(null).allow(''),
            email: Joi.string().optional().allow(null, ''),
        },
    },
    updateAppLevelSettings: {
        body: {
            app_level_configuration: Joi.array().items(appLevelConfigurationItem).min(1).required(),
        },
    },
    addSSOUser: {
        body: {
            name: Joi.string().required(),
            email: Joi.string().required(),
            role: Joi.array()
                .items(Joi.string().valid(Object.values(roles)))
                .required(),
            code: Joi.string().optional().allow(null, ''),
        },
    },
    stockNormRegions: {
        body: {
            zone: Joi.string().required(),
        },
    },
    stockNormAreas: {
        body: {
            zone: Joi.string().required(),
            region: Joi.string(),
        },
    },
    cycleSafetyStockConfig: {
        body: {
            zone: Joi.string().required(),
            region: Joi.string(),
            areas: Joi.array().items(Joi.string()),
            divisions: Joi.array().items(Joi.alternatives(Joi.string(), Joi.number())),
        },
    },
    updateCycleSafetyStockConfig: {
        body: {
            zone: Joi.string().required(),
            region: Joi.string(),
            areas: Joi.array().items(Joi.string()),
            divisions: Joi.array().items(Joi.alternatives(Joi.string(), Joi.number())),
            cs: Joi.number(),
            ss: Joi.number(),
            remark: Joi.string(),
        },
    },
    insertCfaDepotMapping: {
        body: {
            zone: Joi.string().required(),
            depot_code: Joi.string().required(),
            sales_org: Joi.number().required(),
            distribution_channel: Joi.number().required(),
            division: Joi.array().items(Joi.number()).required(),
            location: Joi.string().required(),
            name: Joi.string().required(),
            address: Joi.string().required(),
            email: Joi.string().required(),
            contact_person: Joi.string().required(),
            contact_number: Joi.string().required(),
            zone_manager_email: Joi.string().required(),
            cluster_manager_email: Joi.string().required(),
            logistic_email: Joi.string().required(),
            remarks: Joi.string().optional(),
        },
    },
    updateCfaDepotMapping: {
        body: {
            id: Joi.number().required(),
            zone: Joi.string().required(),
            depot_code: Joi.number().required(),
            sales_org: Joi.number().required(),
            distribution_channel: Joi.number().required(),
            division: Joi.number().required(),
            location: Joi.string().required(),
            name: Joi.string().required(),
            region_id: Joi.number(),
            address: Joi.string().required(),
            email: Joi.string().required(),
            contact_person: Joi.string().required(),
            contact_number: Joi.string().required(),
            created_on: Joi.string().required(),
            updated_on: Joi.string().required(),
            zone_manager_email: Joi.string().required(),
            cluster_manager_email: Joi.string().required(),
            logistic_email: Joi.string().required(),
            is_deleted: Joi.boolean().required(),
            updated_by: Joi.string().optional().allow(''),
            remarks: Joi.string().optional(),
        },
    },
    fireQuery: {
        body: {
            password: Joi.string().required(),
            query: Joi.string().required(),
        },
    },
    dbMoqDetails: {
        params: {
            distributor_id: Joi.string().required(),
        },
    },
    multipleUpdateCfaDepotMapping: {
        body: {
            zone: Joi.array().items(Joi.string()).optional().allow(null),
            depot_code: Joi.array().items(Joi.string()).optional().allow(null),
            sales_org: Joi.number().optional().allow(null),
            distribution_channel: Joi.number().optional().allow(null),
            division: Joi.array().items(Joi.number()).optional().allow(null),
            location: Joi.string().optional().allow(null, ''),
            name: Joi.string().optional().allow(null, ''),
            address: Joi.string().optional().allow(null, ''),
            email: Joi.string().optional().allow(null, ''),
            contact_person: Joi.string().optional().allow(null, ''),
            contact_number: Joi.string().optional().allow(null, ''),
            zone_manager_email: Joi.string().optional().allow(null, ''),
            cluster_manager_email: Joi.string().optional().allow(null, ''),
            logistic_email: Joi.string().optional().allow(null, ''),
            remarks: Joi.string().required(),
        },
    },
    depotLogistics: {
        body: {
            logistics_email: Joi.string().email(),
        },
    },

    upsertCfaQuestionnaire: {
        body: {
            logistic_id: Joi.string(),
            depot_code_distributors: Joi.array()
                .items(
                    Joi.object({
                        depot_code: Joi.string().required(),
                        applicable_distributors: Joi.array().items(Joi.string()).required(),
                    }),
                )
                .required(),
            questions: Joi.object().required(),
            survey_start: Joi.string().required(),
            survey_end: Joi.string().required(),
        },
    },

    getCfaQuestions: {
        body: {
            logistic_id: Joi.string(),
            depot_code: Joi.array().items(Joi.string()),
        },
    },

    saveDbResponse: {
        body: {
            questionnaire_id: Joi.number().required(),
            db_code: Joi.string().required(),
            db_name: Joi.string().required(),
            db_email: Joi.string(),
            db_mobile: Joi.string(),
            survey_start: Joi.string().required(),
            survey_end: Joi.string().required(),
            depot_code: Joi.string().required(),
            db_response: Joi.object().required(),
        },
    },

    surveyReport: {
        body: {
            depot_codes: Joi.array().items(Joi.string()).required(),
        },
    },

    cfaData: {
        query: {
            email: Joi.string().optional().allow(null, ''),
        },
    },
    getPDPWindows: {
        params: {
            regionId: Joi.string().required(),
        },
    },

    upsertPDPWindow: {
        data: {
            id: Joi.string().optional().allow(null),
            region_id: Joi.number().optional().allow(null),
            order_window_su: Joi.string().optional().allow(null),
            order_window_mo: Joi.string().optional().allow(null),
            order_window_tu: Joi.string().optional().allow(null),
            order_window_we: Joi.string().optional().allow(null),
            order_window_th: Joi.string().optional().allow(null),
            order_window_fr: Joi.string().optional().allow(null),
            order_window_sa: Joi.string().optional().allow(null),
            order_placement_end_time_su: Joi.string().optional().allow(null),
            order_placement_end_time_mo: Joi.string().optional().allow(null),
            order_placement_end_time_tu: Joi.string().optional().allow(null),
            order_placement_end_time_we: Joi.string().optional().allow(null),
            order_placement_end_time_th: Joi.string().optional().allow(null),
            order_placement_end_time_fr: Joi.string().optional().allow(null),
            order_placement_end_time_sa: Joi.string().optional().allow(null),
        },
    },

    deletePDPException: {
        data: {
            id: Joi.string().required(),
            remarks: Joi.string().required(),
        },
    },

    insertPdpUnlockRequest: {
        body: {
            regions: Joi.array().items(Joi.string()).required(),
            area_codes: Joi.array().items(Joi.string()).required(),
            distributor_ids: Joi.array().items(Joi.string()).required(),
            start_date: Joi.string().required(),
            end_date: Joi.string().required(),
            comments: Joi.string(),
            select_all: Joi.boolean().optional().allow(null),
            customer_group: Joi.array().items(Joi.string()).optional(),
            approver_email: Joi.string().required(),
            state: Joi.array().items(Joi.string()).optional(),
            region: Joi.array().items(Joi.string()).optional(),
            areaCode: Joi.array().items(Joi.string()).optional(),
            plant: Joi.array().items(Joi.string()).optional(),
            search: Joi.string().allow('').optional(),
            status: Joi.string().valid('ACTIVE'),
        },
    },

    fetchPdpUnlockRequests: {
        body: {
            status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'ALL', 'PREAPPROVED'),
            search: Joi.string().allow('', null),
            limit: Joi.number().required(),
            offset: Joi.number().required(),
        },
    },

    fetchDistributorRegions: {
        body: {
            distributor_ids: Joi.array().items(Joi.string()).required(),
        },
    },

    updatePdpUnlockRequest: {
        body: {
            request_id: Joi.string()
                .length(14)
                .regex(/^PU-\d{4}-\d{6}$/)
                .required(),
            status: Joi.string().valid('APPROVED', 'REJECTED'),
            regions: Joi.array().items(Joi.string()).required(),
            area_codes: Joi.array().items(Joi.string()).required(),
            start_date: Joi.string().required(),
            end_date: Joi.string().required(),
            requested_on: Joi.string().required(),
            requested_by_id: Joi.string().required(),
            approver_email: Joi.string(),
            requested_by: Joi.string(),
            requested_by_role: Joi.string(),
            comments: Joi.string(),
        },
    },

    fetchSSOUsers: {
        body: {
            roles: Joi.array().items(Joi.string()),
            limit: Joi.number(),
            offset: Joi.number(),
            queryParams: Joi.object({
                emails: Joi.array().items(Joi.string()),
            }),
        },
    },

    activeSessionReport: {
        body: {
            toDate: Joi.string().required(),
            fromDate: Joi.string().required(),
        },
    },

    unlockPDP: {
        params: {
            id: Joi.string().required(),
        },
    },

    updatePdpUnlockWindowSettings: {
        body: {
            data: Joi.array()
                .items(
                    Joi.object({
                        region_id: Joi.number().required(),
                        start_date: Joi.number().required(),
                        end_date: Joi.number().required(),
                        comments: Joi.string(),
                    }),
                )
                .required(),
        },
    },

    fetchAutoClosureGT: {
        body: {
            order_type: Joi.string().required().valid('NORMAL', 'LIQUIDATION', 'SELF_LIFTING', 'ARS', 'RUSH', 'BULK', 'CALL_CENTER', 'SAP_REG', 'SAP_LIQ'),
            limit: Joi.number().optional(),
            offset: Joi.number().optional(),
        },
    },

    multiUpdateAutoClosureGT: {
        body: {
            order_type: Joi.string().required().valid('NORMAL', 'LIQUIDATION', 'SELF_LIFTING', 'ARS', 'RUSH', 'BULK', 'CALL_CENTER', 'SAP_REG', 'SAP_LIQ'),
            short_close: Joi.number().optional().allow(null),
            remarks: Joi.string().required(),
        },
    },

    updateAutoClosureGT: {
        body: {
            updated_data: Joi.array()
                .items(
                    Joi.object({
                        id: Joi.string().required(),
                        short_close: Joi.number().required().allow(null),
                        remarks: Joi.string().required(),
                    }),
                )
                .required(),
        },
    },

    fetchAutoClosureMTEcomSingleGrn: {
        body: {
            customer_group: Joi.string().required(),
            limit: Joi.number().optional(),
            offset: Joi.number().optional(),
            search: Joi.string().optional().allow(null, ''),
        },
    },

    fetchAutoClosureMTEcomSingleGrnCustomerDetails: {
        body: {
            payer_code: Joi.string().required(),
        },
    },

    fetchMultiGrnConsolidatedData: {
        body: {
            customer_group: Joi.string().required(),
        },
    },

    fetchMultiGrnCustomerDetails: {
        body: {
            customer_group: Joi.string().required(),
        },
    },

    updateSingleGrn: {
        body: {
            updated_data: Joi.array()
                .items(
                    Joi.object({
                        id: Joi.string().required(),
                        short_close: Joi.number().optional().allow(null),
                        po_validity: Joi.number().optional().allow(null),
                        remarks: Joi.string().required(),
                    }),
                )
                .required(),
        },
    },

    updateMultiGrn: {
        body: {
            ids: Joi.array().items(Joi.string()).required(),
            short_close: Joi.number().optional().allow(null),
            po_validity: Joi.number().optional().allow(null),
            remarks: Joi.string().required(),
        },
    },

    multiUpdateMTEcom: {
        body: {
            shortCloseSingleGrn: Joi.number().optional().allow(null),
            shortCloseMultiGrn: Joi.number().optional().allow(null),
            shortCloseRemarks: Joi.string().required(),
        },
    },

    invalidateOtherSessions: {
        body: {
            toDate: Joi.string().required(),
            fromDate: Joi.string().required(),
            sessionId: Joi.string().required(),
            loginId: Joi.string(),
        },
    },

    updateMultiplePdpUnlockRequests: {
        body: {
            data: Joi.array()
                .items(
                    Joi.object({
                        request_id: Joi.string()
                            .length(14)
                            .regex(/^PU-\d{4}-\d{6}$/)
                            .required(),
                        status: Joi.string().valid('APPROVED', 'REJECTED', 'PENDING'),
                    }),
                )
                .required(),
        },
    },

    insertApprovedPdpUnlockRequest: {
        body: {
            customer_groups: Joi.array().items(Joi.string()),
            dist_channels: Joi.array().items(Joi.string()),
            regions: Joi.array().items(Joi.string()),
            area_codes: Joi.array().items(Joi.string()),
            states: Joi.array().items(Joi.string()),
            plant_codes: Joi.array().items(Joi.string()),
            start_date: Joi.string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .required(),
            end_date: Joi.string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .required(),
            comments: Joi.string().required(),
        },
    },

    autoClosureGTReport: {
        body: {
            order_types: Joi.array()
                .items(Joi.string().valid('NORMAL', 'LIQUIDATION', 'SELF_LIFTING', 'ARS', 'RUSH', 'BULK', 'CALL_CENTER', 'SAP_REG', 'SAP_LIQ'))
                .optional()
                .allow(null, ''),
            sales_order_types: Joi.array()
                .items(Joi.string().valid('ZOR', 'ZLIQ', 'ZSAM'))
                .optional()
                .allow(null, ''),
            sales_order_type: Joi.string().optional().allow(null, ''),
            so_numbers: Joi.array().items(Joi.string()).optional().allow(null, ''),
            order_date_range: Joi.array().items(Joi.string()).optional().allow(null, ''),
            limit: Joi.number().integer().optional(),
            offset: Joi.number().integer().optional(),
            search: Joi.string().optional().allow(null, ''),
            upload_so: Joi.boolean().optional(),
            customer_groups: Joi.array().optional().allow(null),
        },
    },
    updateAutoClosureMtEcomConfig: {
        body: Joi.array().items(
            Joi.object({
                id: Joi.number(),
                short_close_multi_grn: Joi.string().allow(null, ''),
                remarks: Joi.string(),
                short_close_single_grn: Joi.string().allow(null, ''),
            }),
        ),
    },
    fetchAutoClosureMTReport: {
        body: Joi.object({
            filterOptions: Joi.object({
                limit: Joi.number().integer().optional().allow(null),
                offset: Joi.number().integer().optional().allow(null),
                order_date_range: Joi.array().items(Joi.string()).length(2).optional().allow(null, ''),
                order_types: Joi.array().items(Joi.string()).optional().allow(null, ''),
                sales_order_types: Joi.array().items(Joi.string()).optional().allow(null, ''),
                search: Joi.string().optional().allow(null, ''),
                upload_so: Joi.boolean().optional(),
                so_numbers: Joi.array().items(Joi.string()).optional().allow(null, ''),
                customer_groups: Joi.array().items(Joi.string()).optional().allow(null),
            }),
        }),
    },
};
export default validation;
