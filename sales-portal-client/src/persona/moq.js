import { roles } from "./roles";
import LocalAuth from '../util/middleware/auth.js';
import _ from "lodash";

export const pages = {
    MOQ: 'MOQ',
    BULKMOQ: 'BULKMOQ',
};

const moq = {
    MOQ: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.PORTAL_OPERATIONS, roles.LOGISTICS_OFFICER],
        EDIT: [roles.SUPER_ADMIN, roles.LOGISTICS_OFFICER]
    },
    BULKMOQ: {
        VIEW: [roles.SUPER_ADMIN, roles.SUPPORT, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER],
        EDIT: [roles.SUPER_ADMIN, roles.LOGISTICS_OFFICER, roles.ZONAL_OFFICER]
    }
    
};

export default moq;

export const hasViewPermission = (page, feature = 'VIEW') => {
    const role = LocalAuth.getAdminRole();
    return !!(_.intersection(moq[page][feature], role).length); 
};

export const hasEditPermission = (page, feature = 'EDIT') => {
    const role = LocalAuth.getAdminRole();
    return !!(_.intersection(moq[page][feature], role).length);
};