import { roles } from "./roles";
import LocalAuth from '../util/middleware/auth.js'
import _ from "lodash";

export const pages = {
    SHR: "SHR",
    PDP_REQUESTS: "PDP_REQUESTS",
    PLANT_REQUEST: "PLANT_REQUEST",
    SDR: "SDR",
    RO_REQUESTS: "RO_REQUESTS",
    PDP_UNLOCK: "PDP_UNLOCK",
};

export const features = {
    VIEW: "VIEW",
    ONLY_SDR_VIEW: "ONLY_SDR_VIEW",
    VIEW_RAISE: "VIEW_RAISE",
    RAISE: "RAISE",
    RESPOND: "RESPOND",
    VIEW_REQUESTING_TSE: "VIEW_REQUESTING_TSE",
    VIEW_REQUESTED_BY: "VIEW_REQUESTED_BY",
    ONLY_PDP_UNLOCK_VIEW: "ONLY_PDP_UNLOCK_VIEW",
    APPROVED_PDP_UNLOCK_REQUESTS: 'APPROVED_PDP_UNLOCK_REQUESTS',
};

const requests = {
    SHR: {
        VIEW: [roles.SUPER_ADMIN],
        VIEW_REQUESTING_TSE: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        VIEW_RAISE: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.TSE],
        RAISE: [roles.TSE],
        RESPOND: [roles.ASM],
    },
    PDP_REQUESTS: {
        VIEW: [roles.SUPER_ADMIN],
        VIEW_RAISE: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.TSE, roles.ASM, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
        VIEW_REQUESTED_BY: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS],
        RAISE: [roles.SUPER_ADMIN, roles.TSE, roles.ASM, roles.RSM, roles.DIST_ADMIN, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER, roles.CLUSTER_MANAGER],
        RESPOND: [roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
    },
    PLANT_REQUEST: {
        VIEW: [roles.SUPER_ADMIN],
        VIEW_RAISE: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.TSE, roles.ASM, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
        RAISE: [roles.SUPER_ADMIN, roles.TSE, roles.ASM, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
        RESPOND: [roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
    },
    SDR: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.TSE, roles.ASM, roles.DIST_ADMIN, roles.RSM, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER, roles.CLUSTER_MANAGER],
        ONLY_SDR_VIEW: [roles.CFA],
        VIEW_RAISE: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.TSE, roles.ASM, roles.DIST_ADMIN, roles.RSM, roles.CLUSTER_MANAGER],
        RAISE: [roles.TSE, roles.ASM, roles.DIST_ADMIN, roles.RSM, roles.CLUSTER_MANAGER],
        RESPOND: [roles.CFA, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
    },
    RO_REQUESTS: {
        VIEW : [roles.SUPER_ADMIN, roles.SUPPORT, roles.CLUSTER_MANAGER, roles.VP],
        RESPOND: [roles.SUPER_ADMIN, roles.CLUSTER_MANAGER, roles.VP],
    },
    PDP_UNLOCK: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.VP, roles.TSE, roles.ASM, roles.RSM, roles.DIST_ADMIN, roles.CLUSTER_MANAGER, roles.ZONAL_OFFICER, roles.LOGISTICS_OFFICER, roles.CUSTOMER_SERVICE],
        RESPOND: [roles.VP,roles.SUPER_ADMIN],
        ONLY_PDP_UNLOCK_VIEW: [roles.VP,roles.CUSTOMER_SERVICE],
        APPROVED_PDP_UNLOCK_REQUESTS: [roles.SUPER_ADMIN]
    },
};

export default requests;

export const hasViewPermission = (page, feature = 'VIEW') => {
    const role = LocalAuth.getAdminRole();
    return !_.isEmpty(_.intersection(requests[page][feature], role))
};

export const hasRaisePermission = (page, feature = 'RAISE') => {
    const role = LocalAuth.getAdminRole();
    return !_.isEmpty(_.intersection(requests[page][feature], role))
};

export const hasRespondPermission = (page, feature = 'RESPOND') => {
    const role = LocalAuth.getAdminRole();
    return !_.isEmpty(_.intersection(requests[page][feature], role))
};