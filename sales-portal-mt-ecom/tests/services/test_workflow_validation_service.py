# import unittest
# from unittest.mock import MagicMock, patch, call
# from src.services.workflow_validation_service import WorkflowValidationService
# from src.models.dto.po_dto import PoDTO
# from src.enums.mt_ecom_status_type import MtEcomStatusType
# from src.enums.error_message import ErrorMessage
# from src.enums.success_message import SuccessMessage
# from src.enums.customers_enum import Customers
# from src.exceptions.article_lookup_exception import ArticleLookupException
# from src.exceptions.mrp_exception import MrpException
# from src.exceptions.base_price_exception import BasePriceException
# from src.exceptions.caselot_exception import CaselotException
# # no data collected
# class TestWorkflowValidationService(unittest.TestCase):

#     # def setUp(self):
#     #     patcher_dp = patch('src.services.workflow_validation_service.DataPersistService')
#     #     patcher_st = patch('src.services.workflow_validation_service.SapTransformers')
#     #     patcher_mail = patch('src.services.workflow_validation_service.MailHelper')
#     #     patcher_mule = patch('src.services.workflow_validation_service.mulesoft_service')
#     #     patcher_logger = patch('src.services.workflow_validation_service.logger')
#     #     patcher_constants = patch('src.services.workflow_validation_service.constants')

#     #     self.mock_dp = patcher_dp.start()()
#     #     self.mock_st = patcher_st.start()()
#     #     self.mock_mail = patcher_mail.start()()
#     #     self.mock_mule = patcher_mule.start()
#     #     self.mock_logger = patcher_logger.start()
#     #     self.mock_constants = patcher_constants.start()

#     #     self.addCleanup(patcher_dp.stop)
#     #     self.addCleanup(patcher_st.stop)
#     #     self.addCleanup(patcher_mail.stop)
#     #     self.addCleanup(patcher_mule.stop)
#     #     self.addCleanup(patcher_logger.stop)
#     #     self.addCleanup(patcher_constants.stop)

#     #     self.svc = WorkflowValidationService()
#     #     self.svc.DATA_PERSIST_SERVICE = self.mock_dp
#     #     self.svc.SAP_TRANSFORMERS = self.mock_st
#     #     self.svc.MAIL_HELPER = self.mock_mail
        

#     #     self.mock_constants.ARTICLE_FAILED = "ARTICLE_FAILED"
#     #     self.mock_constants.MRP_FAILED = "MRP_FAILED"
#     #     self.mock_constants.BASE_PRICE_FAILED = "BASE_PRICE_FAILED"
#     #     self.mock_constants.CASELOT_FAILED = "CASELOT_FAILED"
#     #     self.mock_constants.VENDOR_CODE_MISSING = "VENDOR_CODE_MISSING"
#     #     self.mock_constants.ARTICLE_FAILED = "ARTICLE_FAILED"
#     #     self.mock_constants.ARTICLE_SUCCESS = "ARTICLE_SUCCESS"
    

#     # def make_order(self, n_items=2, with_ror=False):
#     #     class DummyItem:
#     #         def __init__(self, n):
#     #             self.item_number = n
#     #             self.psku_code = f"PSKU{n}"
#     #             self.psku_description = f"Parent SKU {n}"
#     #             self.system_sku_code = f"SKU{n}"
#     #             self.system_sku_description = f"SKU Desc {n}"
#     #             self.mrp = 100.0 + n
#     #             self.base_price = 50.0 + n
#     #             self.caselot = 2 + n
#     #             self.ean = f"EAN{n}"
#     #             self.customer_product_id = f"CPID{n}"
#     #             self.ror = ErrorMessage.MRP_ROR_CODE if with_ror else ""
#     #     order = MagicMock()
#     #     order.po_number = "PO1"
#     #     order.site_code = "SITE1"
#     #     order.vendor_code = "VENDOR1"
#     #     order.customer_code = "CUSTOMER1"
#     #     items = [DummyItem(i+1) for i in range(n_items)]
#     #     order.items = items
#     #     return order

#     # def make_validation_response(self, valid_list):
#     #     results = []
#     #     for idx, d in enumerate(valid_list, 1):
#     #         d = dict(d)
#     #         if "ItemNumber" not in d:
#     #             d["ItemNumber"] = str(idx)
#     #         results.append(d)
#     #     return {
#     #         "d": {
#     #             "NAVRESULT": {
#     #                 "results": results
#     #             }
#     #         }
#     #     }

#     # # ARTICLE LOOKUP VALIDATION

#     # def test_article_lookup_validation_success(self):
#     #     order = self.make_order()
#     #     id = 1
#     #     self.mock_dp.fetch_article_details.return_value = {
#     #         "CPID1": {
#     #             "psku": "PSKU1", "psku_desc": "Parent SKU 1",
#     #             "plant_code": "PLANT1", "sku": "SKU1", "sku_desc": "SKU Desc 1"
#     #         },
#     #         "CPID2": {
#     #             "psku": "PSKU2", "psku_desc": "Parent SKU 2",
#     #             "plant_code": "PLANT2", "sku": "SKU2", "sku_desc": "SKU Desc 2"
#     #         }
#     #     }
#     #     self.mock_dp.check_vendor_code.return_value = True

#     #     result = self.svc.article_lookup_validation(order, id)

#     #     self.mock_dp.update_materials.assert_called_once()
#     #     self.mock_mail.send_mail.assert_not_called()
#     #     self.mock_dp.update_header_status.assert_called_with(id, MtEcomStatusType.ARTICLE_SUCCESS)
#     #     self.mock_dp.create_logs.assert_called()
#     #     self.assertEqual(result, order)
#     #     self.assertTrue(all(hasattr(item, 'psku_code') for item in order.items))

#     # def test_article_lookup_validation_missing_customer_code(self):
#     #     order = self.make_order()
#     #     order.customer_code = None
#     #     id = 2
#     #     self.mock_dp.fetch_article_details.return_value = {}
#     #     self.mock_dp.check_vendor_code.return_value = True

#     #     result = self.svc.article_lookup_validation(order, id)
#     #     self.mock_mail.send_mail.assert_called()
#     #     self.mock_dp.update_header_status.assert_called_with(id, MtEcomStatusType.ARTICLE_FAILED)
#     #     self.mock_dp.create_logs.assert_called()
#     #     self.assertEqual(result, order)
#     #     self.assertEqual(len(order.items), 0)

#     # def test_article_lookup_validation_missing_customer_product_id(self):
#     #     order = self.make_order()
#     #     order.items[0].customer_product_id = None
#     #     order.items[1].customer_product_id = "CPID2"
#     #     id = 3
#     #     self.mock_dp.fetch_article_details.return_value = {
#     #         "CPID2": {
#     #             "psku": "PSKU2", "psku_desc": "Parent SKU 2",
#     #             "plant_code": "PLANT2", "sku": "SKU2", "sku_desc": "SKU Desc 2"
#     #         }
#     #     }
#     #     self.mock_dp.check_vendor_code.return_value = True

#     #     result = self.svc.article_lookup_validation(order, id)
#     #     self.mock_mail.send_mail.assert_called()
#     #     self.mock_dp.update_header_status.assert_called_with(id, MtEcomStatusType.ARTICLE_FAILED)
#     #     self.mock_dp.create_logs.assert_called()
#     #     self.assertEqual(result, order)
#     #     self.assertEqual(len(order.items), 1)

    

#     # def test_article_lookup_validation_article_error(self):
#     #     order = self.make_order()
#     #     id = 5
#     #     self.mock_dp.fetch_article_details.return_value = {}
#     #     self.mock_dp.check_vendor_code.return_value = True

#     #     result = self.svc.article_lookup_validation(order, id)
#     #     self.mock_mail.send_mail.assert_called()
#     #     self.mock_dp.update_header_status.assert_called_with(id, MtEcomStatusType.ARTICLE_FAILED)
#     #     self.mock_dp.create_logs.assert_called()
#     #     self.assertEqual(len(order.items), 0)

#     # def test_article_lookup_validation_raises(self):
#     #     order = self.make_order()
#     #     id = 6
#     #     self.mock_dp.fetch_article_details.side_effect = Exception("fail")
#     #     with self.assertRaises(ArticleLookupException):
#     #         self.svc.article_lookup_validation(order, id)


#     # def test_mrp_check_1_validation_success(self):
#     #     order = self.make_order()
#     #     id = 10
#     #     val_payload = MagicMock()
#     #     self.mock_st.validation_payload.return_value = val_payload
#     #     mrp_resp = MagicMock()
#     #     mrp_resp.json.return_value = self.make_validation_response([
#     #         {"IsValid": "true", "CorrectMRP": "110.0", "ItemNumber": "1"},
#     #         {"IsValid": "true", "CorrectMRP": "120.0", "ItemNumber": "2"}
#     #     ])
#     #     self.mock_mule.so_validation_check.return_value = mrp_resp

#     #     result = self.svc.mrp_check_1_validation(order, id)
#     #     self.assertEqual(result, order)
#     #     self.mock_dp.update_status.assert_any_call(id, "", MtEcomStatusType.MRP_SUCCESS, order.items[0].item_number, "110.0")
#     #     self.mock_dp.update_status.assert_any_call(id, "", MtEcomStatusType.MRP_SUCCESS, order.items[1].item_number, "120.0")
#     #     self.mock_dp.update_header_status.assert_called_with(id, MtEcomStatusType.MRP_SUCCESS)
#     #     self.mock_dp.create_logs.assert_called()

#     # def test_mrp_check_1_validation_failure(self):
#     #     order = self.make_order()
#     #     id = 11
#     #     val_payload = MagicMock()
#     #     self.mock_st.validation_payload.return_value = val_payload
#     #     mrp_resp = MagicMock()
#     #     mrp_resp.json.return_value = self.make_validation_response([
#     #         {"IsValid": "false", "CorrectMRP": "101.0", "ItemNumber": "1"},
#     #         {"IsValid": "true", "CorrectMRP": "102.0", "ItemNumber": "2"}
#     #     ])
#     #     self.mock_mule.so_validation_check.return_value = mrp_resp

#     #     result = self.svc.mrp_check_1_validation(order, id)
#     #     self.assertEqual(result, order)
#     #     self.mock_dp.update_status.assert_any_call(
#     #         id, ErrorMessage.MRP_ROR_ERROR, MtEcomStatusType.MRP_FAILED, order.items[0].item_number, "101.0", "0.00"
#     #     )
#     #     self.mock_dp.update_status.assert_any_call(
#     #         id, "", MtEcomStatusType.MRP_SUCCESS, order.items[1].item_number, "102.0"
#     #     )
#     #     self.mock_dp.update_header_status.assert_called_with(id, MtEcomStatusType.MRP_FAILED)
#     #     self.mock_dp.create_logs.assert_called()
#     #     self.mock_mail.send_mail.assert_called()

#     # def test_mrp_check_1_validation_empty_response(self):
#     #     order = self.make_order()
#     #     id = 12
#     #     val_payload = MagicMock()
#     #     self.mock_st.validation_payload.return_value = val_payload
#     #     mrp_resp = MagicMock()
#     #     mrp_resp.json.return_value = {}
#     #     self.mock_mule.so_validation_check.return_value = mrp_resp

#     #     result = self.svc.mrp_check_1_validation(order, id)
#     #     self.assertEqual(result, '')

#     # def test_mrp_check_1_validation_exception(self):
#     #     order = self.make_order()
#     #     id = 13
#     #     self.mock_st.validation_payload.side_effect = Exception("fail")
#     #     with self.assertRaises(MrpException):
#     #         self.svc.mrp_check_1_validation(order, id)


#     # def test_base_price_validation_success(self):
#     #     order = self.make_order()
#     #     id = 14
#     #     val_payload = MagicMock()
#     #     self.mock_st.validation_payload.return_value = val_payload
#     #     base_price_resp = MagicMock()
#     #     base_price_resp.json.return_value = self.make_validation_response([
#     #         {"BasePriceValid": "true", "CorrectBasePrice": "99.0", "ItemNumber": "1"},
#     #         {"BasePriceValid": "true", "CorrectBasePrice": "98.0", "ItemNumber": "2"}
#     #     ])
#     #     self.mock_mule.so_validation_check.return_value = base_price_resp

#     #     result = self.svc.base_price_validation(order, id)
#     #     self.assertEqual(result, order)
#     #     self.mock_dp.update_header_status.assert_called_with(id, MtEcomStatusType.BASE_PRICE_SUCCESS)
#     #     self.mock_dp.create_logs.assert_called()

#     # def test_base_price_validation_failure(self):
#     #     order = self.make_order()
#     #     id = 15
#     #     order.items[0].ror = ""
#     #     order.items[1].ror = ""
#     #     val_payload = MagicMock()
#     #     self.mock_st.validation_payload.return_value = val_payload
#     #     base_price_resp = MagicMock()
#     #     base_price_resp.json.return_value = self.make_validation_response([
#     #         {"BasePriceValid": "false", "CorrectBasePrice": "97.0", "ItemNumber": "1"},
#     #         {"BasePriceValid": "true", "CorrectBasePrice": "98.0", "ItemNumber": "2"}
#     #     ])
#     #     self.mock_mule.so_validation_check.return_value = base_price_resp

#     #     result = self.svc.base_price_validation(order, id)
#     #     self.assertEqual(result, order)
#     #     self.mock_dp.update_header_status.assert_called_with(id, MtEcomStatusType.BASE_PRICE_FAILED)
#     #     self.mock_dp.create_logs.assert_called()
#     #     self.mock_mail.send_mail.assert_called()

#     # def test_base_price_validation_empty_response(self):
#         order = self.make_order()
#         id = 16
#         val_payload = MagicMock()
#         self.mock_st.validation_payload.return_value = val_payload
#         base_price_resp = MagicMock()
#         base_price_resp.json.return_value = {}
#         self.mock_mule.so_validation_check.return_value = base_price_resp

#         result = self.svc.base_price_validation(order, id)
#         self.assertEqual(result, '')

#     # def test_base_price_validation_exception(self):
#         order = self.make_order()
#         id = 17
#         self.mock_st.validation_payload.side_effect = Exception("fail")
#         with self.assertRaises(BasePriceException):
#             self.svc.base_price_validation(order, id)


#     # def test_caselot_validation_amazon(self):
#     #     order = self.make_order()
#     #     id = 18
#     #     result = self.svc.caselot_validation(order, id, Customers.AMAZON)
#     #     self.assertEqual(result, order)

#     # def test_caselot_validation_success(self):
#     #     order = self.make_order()
#     #     id = 19
#     #     val_payload = MagicMock()
#     #     self.mock_st.validation_payload.return_value = val_payload
#     #     caselot_resp = MagicMock()
#     #     caselot_resp.json.return_value = {
#     #         "d": {
#     #             "NAVRESULT": {
#     #                 "results": [
#     #                     {"IsCaseLotValid": "true", "CorrectMRP": "120.0", "CorrectCaseLot": "4", "ItemNumber": "1"},
#     #                     {"IsCaseLotValid": "true", "CorrectMRP": "121.0", "CorrectCaseLot": "5", "ItemNumber": "2"}
#     #                 ]
#     #             }
#     #         }
#     #     }
#     #     self.mock_mule.so_validation_check.return_value = caselot_resp

#     #     result = self.svc.caselot_validation(order, id, "OTHER")
#     #     self.assertEqual(result, order)
#     #     self.mock_dp.update_header_status.assert_called_with(id, MtEcomStatusType.CASELOT_SUCCESS)
#     #     self.mock_dp.create_logs.assert_called()

#     # def test_caselot_validation_failure(self):
#     #     order = self.make_order()
#     #     id = 20
#     #     order.items[0].ror = ""
#     #     order.items[1].ror = ""
#     #     val_payload = MagicMock()
#     #     self.mock_st.validation_payload.return_value = val_payload
#     #     caselot_resp = MagicMock()
#     #     caselot_resp.json.return_value = {
#     #         "d": {
#     #             "NAVRESULT": {
#     #                 "results": [
#     #                     {"IsCaseLotValid": "false", "CorrectMRP": "120.0", "CorrectCaseLot": "4", "ItemNumber": "1"},
#     #                     {"IsCaseLotValid": "true", "CorrectMRP": "121.0", "CorrectCaseLot": "5", "ItemNumber": "2"}
#     #                 ]
#     #             }
#     #         }
#     #     }
#     #     self.mock_mule.so_validation_check.return_value = caselot_resp

#     #     result = self.svc.caselot_validation(order, id, "OTHER")
#     #     self.assertEqual(result, order)
#     #     self.mock_dp.update_header_status.assert_called_with(id, MtEcomStatusType.CASELOT_FAILED)
#     #     self.mock_dp.create_logs.assert_called()
#     #     self.mock_mail.send_mail.assert_called()

#     # def test_caselot_validation_empty_response(self):
#     #     order = self.make_order()
#     #     id = 21
#     #     val_payload = MagicMock()
#     #     self.mock_st.validation_payload.return_value = val_payload
#     #     caselot_resp = MagicMock()
#     #     caselot_resp.json.return_value = {}
#     #     self.mock_mule.so_validation_check.return_value = caselot_resp

#     #     result = self.svc.caselot_validation(order, id, "OTHER")
#     #     self.assertEqual(result, '')

#     # def test_caselot_validation_exception(self):
#         order = self.make_order()
#         id = 22
#         self.mock_st.validation_payload.side_effect = Exception("fail")
#         with self.assertRaises(CaselotException):
#             self.svc.caselot_validation(order, id, "OTHER")

# if __name__ == "__main__":
#     unittest.main()