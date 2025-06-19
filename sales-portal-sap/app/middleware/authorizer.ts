import responseTemplate from '../helper/responseTemplate';
import { Request, Response } from 'express';
import { roles, pegasus } from '../constant/persona';

function unauthorizedResponse(res: Response) {
    return res.status(403).json(responseTemplate.unauthorizedAccess());
};

function userRole(req: Request) {
    const role = req["user"]?.roles ?? [roles.DISTRIBUTOR];
    return role;
};

function hasPermission(role: string[], permission: string[]) {
    return role.some(r => permission.includes(r));
}

const authorizer = {
    adminTeam(req: Request, res: Response, next) {
        const accessTo = pegasus.ADMIN;
        hasPermission(userRole(req), accessTo) ? next() : unauthorizedResponse(res)
    },

    adminTeamWriteAccess(req: Request, res: Response, next) {
        const accessTo = [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS];
        hasPermission(userRole(req), accessTo) ? next(): unauthorizedResponse(res)
    },

    adminTeamAsmAndAbove(req: Request, res: Response, next) {
        const accessTo: string[] = [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS, roles.DIST_ADMIN, roles.ASM, roles.RSM, roles.CLUSTER_MANAGER];
        hasPermission(userRole(req), accessTo) ? next() : unauthorizedResponse(res);
    },

    validateOrder(req: Request, res: Response, next) {
        const accessTo = [...pegasus.ADMIN, ...pegasus.SALES];
        hasPermission(userRole(req), accessTo) ? next() : unauthorizedResponse(res);
    },

    createOrder(req: Request, res: Response, next) {
        const accessTo = [roles.SUPER_ADMIN, roles.PORTAL_OPERATIONS, ...pegasus.SALES];
        hasPermission(userRole(req), accessTo) ? next() : unauthorizedResponse(res);
    },

    addMappingRequests(req: Request, res: Response, next) {
        const accessTo = [roles.TSE];
        hasPermission(userRole(req), accessTo) ? next() : unauthorizedResponse(res);
    },

    updateMappingRequest(req: Request, res: Response, next) {
        const accessTo = [roles.ASM, roles.RSM, roles.CLUSTER_MANAGER, roles.DIST_ADMIN];
        hasPermission(userRole(req), accessTo) ? next() : unauthorizedResponse(res);
    },
    
    getTseList(req: Request, res: Response, next) {
        const accessTo = [roles.ASM, roles.RSM, roles.CLUSTER_MANAGER, roles.DIST_ADMIN];
        hasPermission(userRole(req), accessTo) ? next() : unauthorizedResponse(res);
    },
};


export default authorizer;