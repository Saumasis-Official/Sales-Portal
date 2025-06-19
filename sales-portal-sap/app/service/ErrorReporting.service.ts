/**
 * @file admin.service
 * @description defines admin service methods
*/
import { ErrorReportingModel } from "../models/ErrorReporting.model";

export const ErrorReportingService = {

    /**
     * 
     */
    async reportPortalError(errorObj: { remarks: string, distributorId: string, errorCode: string, errorMessage: string, corrlnId: string, logObj: object, categoryId: number, recipients: string | undefined, created_by_user_group: string | undefined | null }, user: any) {
        const { remarks, distributorId, errorCode, errorMessage, corrlnId, logObj, categoryId, created_by_user_group } = errorObj;
        const portalError = {
            remarks: remarks ? remarks.replace(/'/g, "''") : null,
            user_id: distributorId,
            error_code: errorCode,
            error_message: errorMessage ? errorMessage : null,
            corr_id: corrlnId ? corrlnId : null,
            error_info: logObj ? logObj : null,
            category_id: categoryId,
            created_by: null,
            created_by_user_group: created_by_user_group ?? 'SELF'
        };
        if (user && user.roles) {
            portalError.created_by = user.user_id;
            portalError.created_by_user_group = user.roles;
        }
        return await ErrorReportingModel.reportPortalError(portalError);
    },

    async reportCFAPortalError(errorObj: { remarks: string, errorCode: string, errorMessage: string, corrlnId: string, logObj: object, categoryId: number, recipients: string | undefined }, user: any) {
        const { remarks, errorCode, errorMessage, corrlnId, logObj, categoryId } = errorObj;
        const portalError = {
            remarks: remarks ? remarks.replace(/'/g, "''") : null,
            error_code: errorCode,
            error_message: errorMessage ? errorMessage : null,
            corr_id: corrlnId ? corrlnId : null,
            error_info: logObj ? logObj : null,
            category_id: categoryId,
            created_by: user.user_id,
            created_by_user_group: user.roles
        };
        return await ErrorReportingModel.reportCFAPortalError(portalError);
    },


    async fetchServiceRequestCategories(type: string) {
        return await ErrorReportingModel.fetchServiceRequestCategories(type);
    },


    async addServiceRequestCategory(requestCategory: { label: string, description: string, type: string }, createdBy: string) {
        const { label, description, type } = requestCategory;
        return await ErrorReportingModel.addServiceRequestCategory(label, description, createdBy, type);
    },


    async modifyServiceRequestCategory(categoryId: number, requestCategory: { label: string | undefined, description: string | undefined, enable: boolean | undefined, type: string | undefined }, updatedBy: string) {
        const { label, description, enable, type } = requestCategory;
        return await ErrorReportingModel.modifyServiceRequestCategory(categoryId, label, description, enable, updatedBy, type);
    },

};