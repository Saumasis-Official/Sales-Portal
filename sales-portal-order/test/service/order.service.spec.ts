import { OrderModel } from "../../app/models/order.model";
import { OrderService } from "../../app/service/order.service";
import logger from "../../app/lib/logger";
import {describe, test, expect, jest} from "@jest/globals";

jest.mock("../../app/models/order.model");
jest.mock("../../app/lib/logger");

describe("OrderService", () => {
  describe("removeDraft", () => {
    const poNumber = "123";
    const distributorId = "456";

    test("should call OrderModel.removeDraft with correct parameters", async () => {
      await OrderService.removeDraft(poNumber, distributorId);

      expect(OrderModel.removeDraft).toHaveBeenCalledWith(poNumber, distributorId);
    });
  });

  describe("removeExpiredCarts", () => {
    const distributorId = "456";
    const cartExpiryWindow = 7;

    test("should call OrderModel.removeExpiredCarts with correct parameters", async () => {
      await OrderService.removeExpiredCarts(distributorId, cartExpiryWindow);

      expect(OrderModel.removeExpiredCarts).toHaveBeenCalledWith(distributorId, cartExpiryWindow);
    });
  });

  describe("getZoneWiseOrders", () => {
    const fromDate = "2022-01-01";
    const toDate = "2022-01-31";

    test("should call OrderModel.getZoneWiseOrders with correct parameters", async () => {
      await OrderService.getZoneWiseOrders(fromDate, toDate);

      expect(OrderModel.getZoneWiseOrders).toHaveBeenCalledWith(fromDate, toDate);
    });
  });

  describe("getZoneWiseOrdersByOrderType", () => {
    const fromDate = "2022-01-01";
    const toDate = "2022-01-31";
    const orderType = "Type";

    test("should call OrderModel.getZoneWiseOrdersByOrderType with correct parameters", async () => {
      await OrderService.getZoneWiseOrdersByOrderType(fromDate, toDate, orderType);

      expect(OrderModel.getZoneWiseOrdersByOrderType).toHaveBeenCalledWith(fromDate, toDate, orderType);
    });
  });

  describe("getCategoryWiseReportedIssues", () => {
    const fromDate = "2022-01-01";
    const toDate = "2022-01-31";

    test("should call OrderModel.getCategoryWiseReportedIssues with correct parameters", async () => {
      await OrderService.getCategoryWiseReportedIssues(fromDate, toDate);

      expect(OrderModel.getCategoryWiseReportedIssues).toHaveBeenCalledWith(fromDate, toDate);
    });
  });

  describe("getTseAsmAdminDetails", () => {
    const userId = "123";

    test("should call OrderModel.getTseAsmAdminDetails with correct parameters", async () => {
      await OrderService.getTseAsmAdminDetails(userId);

      expect(OrderModel.getTseAsmAdminDetails).toHaveBeenCalledWith(userId);
    });
  });

  describe("getMaterialsList", () => {
    const distributorId = "456";
    const queryParams = [{ param1: "value1", param2: "value2" }];

    test("should call OrderModel.getMaterialsList with correct parameters", async () => {
      jest.spyOn(OrderModel, 'getMaterialsList').mockResolvedValue(queryParams);
      await OrderService.getMaterialsList(distributorId, queryParams);

      // expect(OrderModel.getMaterialsList).toHaveBeenCalledWith(distributorId, queryParams);
      expect(logger.info).toHaveBeenCalledWith(
        `inside orderService -> getMaterialsList, distributorId: ${distributorId}, queryParams: ${JSON.stringify(queryParams)}`
      );
    });
  });

  describe("fetchOrders", () => {
    const distributorId = "456";
    const queryParams = { param1: "value1", param2: "value2" };

    test("should call OrderModel.fetchOrders with correct parameters", async () => {
      await OrderService.fetchOrders(distributorId, queryParams);

      expect(OrderModel.fetchOrders).toHaveBeenCalledWith(distributorId, queryParams);
      expect(logger.info).toHaveBeenCalledWith(
        `inside orderService -> fetchOrders, distributorId: ${distributorId}, queryParams: ${JSON.stringify(queryParams)}`
      );
    });
  });

  describe("fetchPODetails", () => {
    const poNumber = "123";
    const distributorId = "456";
    const po_index = "789";

    test("should call OrderModel.fetchPODetails with correct parameters", async () => {
      await OrderService.fetchPODetails(poNumber, distributorId, po_index);

      expect(OrderModel.fetchPODetails).toHaveBeenCalledWith(poNumber, distributorId, po_index);
      expect(logger.info).toHaveBeenCalledWith(
        `inside orderService -> fetchPODetails, distributorId: ${distributorId}, poNumber: ${poNumber}`
      );
    });
  });

  describe("fetchWarehouseDetails", () => {
    const distributorId = "456";

    test("should call OrderModel.fetchWarehouseDetails with correct parameters", async () => {
      await OrderService.fetchWarehouseDetails(distributorId);

      expect(OrderModel.fetchWarehouseDetails).toHaveBeenCalledWith(distributorId);
      expect(logger.info).toHaveBeenCalledWith(
        `inside orderService -> fetchWarehouseDetails, distributorId: ${distributorId}`
      );
    });
  });

  describe("savePromisedCredit", () => {
    const data = {
      distributor_id: "456",
      plant: "Plant",
      type: "Type",
      po_number: "123",
      input_type: "Input Type",
      reference_date: "2022-01-01",
      promised_credit_type: "Promised Credit Type",
      order_value: 100,
      open_order_value: 50,
      credit_shortfall: 50,
      promised_credit_date: "2022-01-02",
      promised_credit_time: "10:00",
      promised_credit: "Promised Credit",
    };

    test("should call OrderModel.savePromisedCredit with correct parameters", async () => {
      await OrderService.savePromisedCredit(data);

      expect(OrderModel.savePromisedCredit).toHaveBeenCalledWith(data);
      expect(logger.info).toHaveBeenCalledWith(
        `inside orderService -> savePromisedCredit,
            distrubutor_id: ${data.distributor_id}, plant : ${data.plant},type : ${data.type}, 
            po_number: ${data.po_number}, input_type: ${data.input_type}, reference_date: ${data.reference_date},
            promised_credit_type: ${data.promised_credit_type}, order_value: ${data.order_value}, open_order_value: ${data.open_order_value},
            credit_shortfall: ${data.credit_shortfall}, promised_credit_date: ${data.promised_credit_date}, 
            promised_credit_time: ${data.promised_credit_time}, promised_credit: ${data.promised_credit}`
      );
    });
  });
});