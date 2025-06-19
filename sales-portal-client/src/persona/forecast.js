import { roles } from "./roles";
import LocalAuth from '../util/middleware/auth.js';
import _ from "lodash";

export const pages = {
    FORECAST_DASHBOARD: 'FORECAST_DASHBOARD',
    STOCK_NORM_DEFAULT: 'STOCK_NORM_DEFAULT',
    STOCK_NORM: 'STOCK_NORM',
    QUANTITY_NORM: 'QUANTITY_NORM',
    ADMIN_FORECAST_UPLOAD: 'ADMIN_FORECAST_UPLOAD'
};

export const features = {
    VIEW: 'VIEW',
    EDIT: 'EDIT',
    ADMIN_FORECAST_UPLOAD: 'ADMIN_FORECAST_UPLOAD',
    EDIT_SUBMIT: 'EDIT_SUBMIT'
};

const forecast = {
    FORECAST_DASHBOARD: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.CLUSTER_MANAGER, roles.DIST_ADMIN, roles.RSM, roles.ASM,roles.SHOPPER_MARKETING],
        EDIT: [roles.ASM, roles.RSM, roles.SUPER_ADMIN, roles.SHOPPER_MARKETING],
        ADMIN_FORECAST_UPLOAD: [roles.SUPER_ADMIN, roles.SHOPPER_MARKETING, roles.RSM],
        EDIT_SUBMIT: [roles.SUPER_ADMIN]
    },
    STOCK_NORM_DEFAULT: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        EDIT: [roles.SUPER_ADMIN],
    },
    STOCK_NORM: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.DIST_ADMIN, roles.RSM, roles.ASM, roles.CLUSTER_MANAGER, roles.SHOPPER_MARKETING],
        EDIT: [roles.SUPER_ADMIN, roles.SHOPPER_MARKETING],
    },
    QUANTITY_NORM: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.CLUSTER_MANAGER, roles.DIST_ADMIN, roles.RSM, roles.ASM],
        EDIT: [roles.SUPER_ADMIN, roles.CLUSTER_MANAGER, roles.DIST_ADMIN, roles.RSM, roles.ASM]
    },
};

export default forecast;

export const hasViewPermission = (page, feature = 'VIEW') => {
    const role = LocalAuth.getAdminRole();
    return !!(_.intersection(forecast[page][feature], role).length);
};

export const hasEditPermission = (page, feature = 'EDIT') => {
    const role = LocalAuth.getAdminRole();
    return !!(_.intersection(forecast[page][feature], role).length);
};
