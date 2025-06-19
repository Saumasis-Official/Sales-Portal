import _ from 'lodash';
import { roles } from './roles';
import LocalAuth from '../util/middleware/auth.js';
import distributorHeader from './distributorHeader.js';
import distributorNav from './distributorNav.js';
import forecast from './forecast.js';
import requests from './requests.js';
import moq from './moq.js';
import mdm from './mdm.js';

export const teams = {
    ADMIN: 'ADMIN',
    SALES: 'SALES',
    LOGISTICS: 'LOGISTICS',
};

export const pegasus = {
    ADMIN: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.MDM],
    SALES: [roles.VP, roles.CLUSTER_MANAGER, roles.DIST_ADMIN, roles.RSM, roles.ASM, roles.TSE, roles.SHOPPER_MARKETING, roles.OPERATIONS, roles.CALL_CENTRE_OPERATIONS],
    LOGISTICS: [roles.CFA, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
    MT_ECOM: [roles.KAMS, roles.NKAMS],
    FINANCE: [roles.FINANCE, roles.FINANCE_CONTROLLER],
    SHOPIFY: [roles.SHOPIFY_UK, roles.SHOPIFY_SUPPORT, roles.SHOPIFY_OBSERVER],
    CREDIT_LIMIT: [roles.CL_PRIMARY_APPROVER, roles.CL_SECONDARY_APPROVER],
    GT_CREDIT_LIMIT: [roles.RCM, roles.HOF, roles.GT_PRIMARY_APPROVER, roles.GT_SECONDARY_APPROVER],
};

export const hasPermission = (team) => {
    const role = LocalAuth.getAdminRole();
    return !!_.intersection(pegasus[team], role).length;
};

export const personaUIRef = {
    HEADER: distributorHeader,
    SIDE_NAV: distributorNav,
    FORECAST: forecast,
    REQUESTS: requests,
    MOQ: moq,
    MDM: mdm,
};
