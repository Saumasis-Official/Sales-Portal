import { roles } from "./roles";
import LocalAuth from '../util/middleware/auth.js';
import _ from "lodash";

export const pages = {
    SKU_DATA_MANAGEMENT: 'SKU_DATA_MANAGEMENT',
    NAKM_DETAIL: 'NAKM_DETAIL',
    SO_SYNC : 'SO_SYNC',
    RETRIGGER : 'RETRIGGER',
    DOWNLOAD : 'DOWNLOAD',
    DOWNLOAD_PO_DETAILS : 'DOWNLOAD_PO_DETAILS',
    DOWNLOAD_SO_REQ_RES : 'DOWNLOAD_SO_REQ_RES'

};

export const features = {
    UPLOAD: 'UPLOAD',
};

const mdm = {
    SKU_DATA_MANAGEMENT: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.MDM, roles.KAMS,roles.NKAMS],
        EDIT: [roles.SUPER_ADMIN, roles.MDM, roles.KAMS,roles.NKAMS],
        UPLOAD: [roles.MDM]
    },
    NAKM_DETAIL:{
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.MDM,roles.NKAMS],
        EDIT: [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS, roles.MDM,roles.NKAMS]
    },
    SO_SYNC:{
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.MDM,roles.NKAMS,roles.KAMS],
        EDIT: [roles.KAMS]
    },
    RETRIGGER:{
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT,roles.NKAMS],
        EDIT: [roles.SUPER_ADMIN, roles.SUPPORT,roles.NKAMS]
    },
    DOWNLOAD:{
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT,roles.KAMS,roles.NKAMS],    
        EDIT: [roles.SUPER_ADMIN, roles.SUPPORT,roles.KAMS,roles.NKAMS],    
    },
    DOWNLOAD_PO_DETAILS:{
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT,roles.KAMS,roles.NKAMS],    
        EDIT: [roles.SUPER_ADMIN, roles.SUPPORT,roles.KAMS,roles.NKAMS],
    },
    DOWNLOAD_SO_REQ_RES:{
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT],
        EDIT: [roles.SUPER_ADMIN, roles.SUPPORT],
    }
};

export default mdm;

export const hasViewPermission = (page, feature = 'VIEW') => {
    const role = LocalAuth.getAdminRole();
    return !!(_.intersection(mdm[page][feature], role).length);
};

export const hasEditPermission = (page, feature = 'EDIT') => {
    const role = LocalAuth.getAdminRole();
    return !!(_.intersection(mdm[page][feature], role).length);
};