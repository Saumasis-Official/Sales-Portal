import { UserModel } from "../../app/models/user.model";
import { UserService } from "../../app/service/user.service";
import logger from "../../app/lib/logger";
import { describe, test, expect, jest } from "@jest/globals";

jest.mock("../../app/models/user.model");
jest.mock("../../app/lib/logger");

describe("UserService", () => {
    describe("fetchRequestedDetailsById", () => {
        const transaction_id = "CE123";

        test("should call userModel.fetchRequestedDetailsById with correct parameters", async () => {
            await UserService.fetchRequestedDetailsById(transaction_id);
            expect(UserModel.fetchRequestedDetailsById).toHaveBeenCalledWith(transaction_id);
        });
    });

    describe("getClApproverFinance", () => {
        // const user_id = "TCPL23456";
        // const roles = "KAMS";

        test("should call userModel.getClApproverFinance with correct parameters", async () => {
            await UserService.getClApproverFinance();
            expect(UserModel.getClApproverFinance).toHaveBeenCalledWith();
        });
    });


    describe("fetchDistributorDetails", () => {
        const user_id = "TCPL23456";
        test("should call userModel.fetchDistributorDetails with correct parameters", async () => {
            await UserService.fetchDistributorDetails(user_id);
            expect(UserModel.fetchDistributorDetails).toHaveBeenCalledWith(user_id);
        });
    });


});