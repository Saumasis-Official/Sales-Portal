/**
 * @file transaction.service
 * @description defines transaction service methods
*/
import { TransactionModel } from "../models/TransactionModel";

export const TransactionService = {

    async beginTransaction(syncType: string) {
        return await TransactionModel.beginTransaction(syncType);
    },

    async commitTransaction(syncType: string) {
        return await TransactionModel.commitTransaction(syncType);
    },

    async rollbackTransaction(syncType: string) {
        return await TransactionModel.rollbackTransaction(syncType);
    },

};

