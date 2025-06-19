import { roles } from './roles';
import LocalAuth from '../util/middleware/auth.js';
import _ from 'lodash';

export const pages = {
    APP_SETTINGS: 'APP_SETTINGS',
    USER_MANAGEMENT: 'USER_MANAGEMENT',
    SYNC_JOBS: 'SYNC_JOBS',
    MAINTENANCE: 'MAINTENANCE',
    HELP_MANAGEMENT: 'HELP_MANAGEMENT',
    SESSION_LOGS: 'SESSION_LOGS',
    REPORTS: 'REPORTS',
    MATERIAL_LIST: 'MATERIAL_LIST',
    STOCK_LEVEL_CHECK: 'STOCK_LEVEL_CHECK',
    CFA_DEPOT_MAPPING: 'CFA_DEPOT_MAPPING',
    NOTIFICATION_ICON: 'NOTIFICATION_ICON',
    CFA_SURVEY: 'CFA_SURVEY',
    RULES_CONFIGURATION: 'RULES_CONFIGURATION',
    FINANCE: 'FINANCE',
    FINANCE_CONTROLLER: 'FINANCE_CONTROLLER',
    MT_ECOM_REPORTS: 'MT_ECOM_REPORTS',
    NKAM_DETAIL: 'NKAM_DETAIL',
    SO_SYNC: 'SO_SYNC',
    SHOPIFY_REPORTS: 'SHOPIFY_REPORTS',
    AUTO_CLOSURE: 'AUTO_CLOSURE',
    CREDIT_LIMIT: 'CREDIT_LIMIT',
    DELIVERY_CODE_REPORT: 'DELIVERY_CODE_REPORT',
};

export const features = {
    VIEW_SALES_ORDER_VALUE_REPORT: 'VIEW_SALES_ORDER_VALUE_REPORT',
    VIEW_PORTAL_ISSUES_REPORT: 'VIEW_PORTAL_ISSUES_REPORT',
    VIEW_EDIT: 'VIEW_EDIT',
    EDIT: 'EDIT',
    EDIT_PRIORITIZATION: 'EDIT_PRIORITIZATION',
    VIEW_MTECOM: 'VIEW_MTECOM',
    VIEW_APP_SETTINGS: 'VIEW_APP_SETTINGS',
    VIEW_PDP: 'VIEW_PDP',
    VIEW_ARS: 'VIEW_ARS',
    VIEW_MOQ: 'VIEW_MOQ',
    EDIT_MTECOM: 'EDIT_MTECOM',
    EDIT_APP_SETTINGS: 'EDIT_APP_SETTINGS',
    EDIT_PDP: 'EDIT_PDP',
    EDIT_ARS: 'EDIT_ARS',
    EDIT_MOQ: 'EDIT_MOQ',
    EDIT_ADMIN_SURVEY: 'EDIT_ADMIN_SURVEY',
    EDIT_GT_AUTO_CLOSURE: 'EDIT_GT_AUTO_CLOSURE',
    EDIT_MT_AUTO_CLOSURE: 'EDIT_MT_AUTO_CLOSURE',
    EDIT_Ecom_AUTO_CLOSURE: 'EDIT_Ecom_AUTO_CLOSURE',
};

const distributorHeader = {
    APP_SETTINGS: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        EDIT: [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS],
        VIEW_MTECOM: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.KAMS, roles.NKAMS],
        VIEW_APP_SETTINGS: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        VIEW_PDP: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        VIEW_ARS: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        VIEW_MOQ: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        EDIT_MTECOM: [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS, roles.KAMS, roles.NKAMS],
        EDIT_APP_SETTINGS: [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS],
        EDIT_PDP: [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS],
        EDIT_ARS: [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS],
        EDIT_MOQ: [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS],
    },
    USER_MANAGEMENT: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        EDIT: [roles.SUPER_ADMIN],
    },
    SYNC_JOBS: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        EDIT: [roles.SUPER_ADMIN],
    },
    MAINTENANCE: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        EDIT: [roles.SUPER_ADMIN],
    },
    HELP_MANAGEMENT: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
    },
    SESSION_LOGS: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
    },
    REPORTS: {
        VIEW: [
            roles.SUPER_ADMIN,
            roles.SUPPORT,
            roles.PORTAL_OPERATIONS,
            roles.DIST_ADMIN,
            roles.RSM,
            roles.ASM,
            roles.CFA,
            roles.LOGISTICS_OFFICER,
            roles.ZONAL_OFFICER,
            roles.CLUSTER_MANAGER,
        ],
        VIEW_SALES_ORDER_VALUE_REPORT: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.DIST_ADMIN, roles.RSM, roles.ASM, roles.CLUSTER_MANAGER],
        VIEW_PORTAL_ISSUES_REPORT: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
    },
    MATERIAL_LIST: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
    },
    STOCK_LEVEL_CHECK: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
    },
    CFA_DEPOT_MAPPING: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
        EDIT: [roles.SUPER_ADMIN, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
    },
    NOTIFICATION_ICON: {
        VIEW: [roles.ASM],
    },
    CFA_SURVEY: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
        EDIT: [roles.SUPER_ADMIN, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
        EDIT_ADMIN_SURVEY: [roles.SUPER_ADMIN, roles.SUPPORT],
    },
    RULES_CONFIGURATION: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.SHOPPER_MARKETING],
        EDIT: [roles.SUPER_ADMIN, roles.SHOPPER_MARKETING],
        EDIT_PRIORITIZATION: [roles.SUPER_ADMIN, roles.SHOPPER_MARKETING],
    },
    BULK_ORDER_DEPOT_MAPPING: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
        EDIT: [roles.SUPER_ADMIN, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
    },
    FINANCE: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.FINANCE],
    },
    FINANCE_CONTROLLER: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.FINANCE_CONTROLLER],
    },
    MT_ECOM_REPORTS: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.KAMS, roles.NKAMS],
    },
    NKAM_DETAIL: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.MDM, roles.NKAMS],
        EDIT: [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS, roles.MDM, roles.NKAMS],
    },
    SO_SYNC: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.MDM, roles.NKAMS, roles.KAMS],
        EDIT: [roles.KAMS],
    },
    SHOPIFY_REPORTS: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.SHOPIFY_UK, roles.SHOPIFY_OBSERVER, roles.SHOPIFY_SUPPORT],
    },
    AUTO_CLOSURE: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.SHOPPER_MARKETING],
        EDIT_GT_AUTO_CLOSURE: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.SHOPPER_MARKETING],
        EDIT_MT_AUTO_CLOSURE: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.NKAMS],
        EDIT_Ecom_AUTO_CLOSURE: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.NKAMS],
    },
    CREDIT_LIMIT: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        // EDIT: [roles.SUPER_ADMIN],
    },
    DELIVERY_CODE_REPORT: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
    }
};

export default distributorHeader;

export const hasViewPermission = (page, feature = 'VIEW') => {
    const role = LocalAuth.getAdminRole();
    return !!_.intersection(distributorHeader[page][feature], role).length;
};

export const hasEditPermission = (page, feature = 'EDIT') => {
    const role = LocalAuth.getAdminRole();
    return !!_.intersection(distributorHeader[page][feature], role).length;
};
