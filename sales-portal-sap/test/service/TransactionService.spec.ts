import { TransactionService } from "../../app/service/TransactionService";
import { TransactionModel } from "../../app/models/TransactionModel";

jest.mock("../../app/models/TransactionModel");

describe("TransactionService", () => {
    const syncType = "testSyncType";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should begin a transaction", async () => {
        (TransactionModel.beginTransaction as jest.Mock).mockResolvedValue("beginTransactionResult");

        const result = await TransactionService.beginTransaction(syncType);

        expect(TransactionModel.beginTransaction).toHaveBeenCalledWith(syncType);
        expect(result).toBe("beginTransactionResult");
    });

    it("should commit a transaction", async () => {
        (TransactionModel.commitTransaction as jest.Mock).mockResolvedValue("commitTransactionResult");

        const result = await TransactionService.commitTransaction(syncType);

        expect(TransactionModel.commitTransaction).toHaveBeenCalledWith(syncType);
        expect(result).toBe("commitTransactionResult");
    });

    it("should rollback a transaction", async () => {
        (TransactionModel.rollbackTransaction as jest.Mock).mockResolvedValue("rollbackTransactionResult");

        const result = await TransactionService.rollbackTransaction(syncType);

        expect(TransactionModel.rollbackTransaction).toHaveBeenCalledWith(syncType);
        expect(result).toBe("rollbackTransactionResult");
    });
});