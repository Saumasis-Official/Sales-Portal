# import unittest
# from unittest.mock import patch, MagicMock
# import json
# from datetime import datetime
# from src.services.po_processing_so_creation_service import PoProcessingSoCreationService

# class TestPoProcessingSoCreationService(unittest.TestCase):
#     def setUp(self):
#         self.svc = PoProcessingSoCreationService()
#         self.po_number = "PO123"
#         self.unique_id = "UID123"
#         self.result_row = {
#             'so_number': None,
#             'json_file_name': 'test.json',
#             'unique_id': self.unique_id,
#             'id': 1,
#             'delivery_date': datetime(2024, 5, 21)
#         }
#         self.result_row_with_so = {
#             **self.result_row,
#             'so_number': "SO456",
#             'delivery_date': datetime(2024, 5, 21)
#         }
#         self.payload = {
#             "ean_full_details": [{"EAN": "123456789"}],
#             "status": True,
#             "is_valid": True,
#             "mrp_check_req": {"NAVPRICE": [1]},
#             "po_date_to": "2024-05-21",
#             "customer_code": "CUST1",
#             "incorrect_ean_data": [],
#             "sap_req": {"NAVITEM": [{"ItemNumber": "1", "ROR": ""}]}
#         }
#         self.mrp_response = MagicMock()
#         self.mrp_response.json.return_value = {
#             'data': {'data': {
#                 'd': {
#                     'NAVRESULT': {'results': [
#                         {"HasError": "false", "IsValid": "true", "BasePriceValid": "true", "IsCaseLotValid": "true", "ItemNumber": "1", "CorrectMRP": "100", "CorrectBasePrice": "10", "CorrectCaseLot": "1", "ParentSKUCode": "A", "ParentSKUDescription": "desc", "SKUCode": "B", "SystemSKUDescription": "sku", "MRP": "100", "EAN": "1234", "CustomerProductID": "CUST1", "CaseLot": "1"}
#                     ]}
#                 }
#             }}
#         }
#         self.s3_object = {'Body': MagicMock(read=MagicMock(return_value=json.dumps({"EAN": "123456789"}).encode('utf-8')))}

#     @patch("src.services.po_processing_so_creation_service.po_processing_so_creation_model")
#     @patch("src.services.po_processing_so_creation_service.s3_client")
#     @patch("src.services.po_processing_so_creation_service.ean_mapping_service")
#     @patch("src.services.po_processing_so_creation_service.response_handlers")
#     def test_po_not_found_returns_400(self, mock_response_handlers, mock_ean_mapping, mock_s3_client, mock_model):
#         mock_response_handlers.send.return_value = {"status": 400}
#         resp = self.svc.po_processing_so_creation_service(json.dumps({}))
#         self.assertEqual(resp["status"], 400)
#         mock_response_handlers.send.assert_called_with(400, "PO Number is not found")

#     @patch("src.services.po_processing_so_creation_service.po_processing_so_creation_model")
#     @patch("src.services.po_processing_so_creation_service.s3_client")
#     @patch("src.services.po_processing_so_creation_service.ean_mapping_service")
#     @patch("src.services.po_processing_so_creation_service.response_handlers")
#     @patch("src.services.po_processing_so_creation_service.sqs_helper")
#     def test_po_not_found_in_db(self, mock_sqs, mock_response_handlers, mock_ean_mapping, mock_s3_client, mock_model):
#         mock_model.so_check.return_value = []
#         mock_response_handlers.send.return_value = {"status": 400}
#         resp = self.svc.po_processing_so_creation_service(json.dumps({"PO NUMBER": self.po_number}))
#         self.assertEqual(resp["status"], 400)
#         mock_response_handlers.send.assert_called_with(400, "PO Number not found in database")

#     @patch("src.services.po_processing_so_creation_service.po_processing_so_creation_model")
#     @patch("src.services.po_processing_so_creation_service.s3_client")
#     @patch("src.services.po_processing_so_creation_service.ean_mapping_service")
#     @patch("src.services.po_processing_so_creation_service.response_handlers")
#     @patch("src.services.po_processing_so_creation_service.sap_service")
#     @patch("src.services.po_processing_so_creation_service.sqs_helper")
#     def test_already_created_so_returns_message(self, mock_sqs, mock_sap_service, mock_response_handlers, mock_ean_mapping, mock_s3_client, mock_model):
#         mock_model.so_check.return_value = [self.result_row_with_so]
#         mock_s3_client.get_object.return_value = self.s3_object
#         mock_ean_mapping.prepare_payload_from_xml_event.return_value = self.payload
#         mock_model.save_or_update_line_item_details.return_value = True
#         mock_ean_mapping.prepare_validity_date_payload.return_value = {"some": "dict"}
#         mock_amendment_response = MagicMock()
#         mock_amendment_response.json.return_value = {"result": "ok"}
#         mock_sap_service.create_amendment.return_value = mock_amendment_response

#         resp = self.svc.po_processing_so_creation_service(json.dumps({"PO NUMBER": self.po_number}))
#         self.assertIn("so already created", resp["message"].lower())

#     @patch("src.services.po_processing_so_creation_service.po_processing_so_creation_model")
#     @patch("src.services.po_processing_so_creation_service.s3_client")
#     @patch("src.services.po_processing_so_creation_service.ean_mapping_service")
#     @patch("src.services.po_processing_so_creation_service.response_handlers")
#     @patch("src.services.po_processing_so_creation_service.sap_service")
#     @patch("src.services.po_processing_so_creation_service.mail_helper")
#     @patch("src.services.po_processing_so_creation_service.persist_model")
#     def test_valid_flow_success(self, mock_persist, mock_mail, mock_sap, mock_response_handlers, mock_ean_mapping, mock_s3_client, mock_model):
#         mock_model.so_check.return_value = [self.result_row]
#         mock_s3_client.get_object.return_value = self.s3_object
#         mock_ean_mapping.prepare_payload_from_xml_event.return_value = self.payload
#         mock_model.save_or_update_line_item_details.return_value = True
#         mock_model.create_logs.return_value = True
#         mock_model.save_req_res.return_value = True
#         mock_model.update_failed_message.return_value = True
#         mock_persist.fetch_workflow_configurations.return_value = {"base_price": True}
#         mock_mail.send_mail.return_value = True
#         mock_sap.mrp_and_caselot_check.return_value = self.mrp_response
#         create_so_resp = MagicMock()
#         create_so_resp.json.return_value = {
#             'data': {'data': {'d': {
#                 "NAVRES": {"results": [{"Sales_Order_Number": "SO12345678", "Type": "S", "Message": "Created"}]},
#                 "NAVITEM": {"results": [
#                     {"ItemNumber": "1", "SystemSKUCode": "A", "TargetQty": "10", "ROR": "", "MRP": "100", "case_lot": "1"}
#                 ]}
#             }}}
#         }
#         mock_sap.create_so.return_value = create_so_resp
#         mock_response_handlers.send.side_effect = lambda code, msg: {"status": code, "message": msg}
#         resp = self.svc.po_processing_so_creation_service(json.dumps({"PO NUMBER": self.po_number}))
#         self.assertEqual(resp["status"], 200)
#         self.assertIn("sales order created successfully", resp["message"].lower())

#     @patch("src.services.po_processing_so_creation_service.po_processing_so_creation_model")
#     @patch("src.services.po_processing_so_creation_service.s3_client")
#     @patch("src.services.po_processing_so_creation_service.ean_mapping_service")
#     @patch("src.services.po_processing_so_creation_service.response_handlers")
#     @patch("src.services.po_processing_so_creation_service.mail_helper")
#     @patch("src.services.po_processing_so_creation_service.persist_model")
#     @patch("src.services.po_processing_so_creation_service.sap_service")
#     def test_invalid_ean_data(self, mock_sap, mock_persist, mock_mail, mock_response_handlers, mock_ean_mapping, mock_s3_client, mock_model):
#         payload = self.payload.copy()
#         payload["incorrect_ean_data"] = [
#             {"Error_message": "SITE_CODE_NOT_FOUND", "ItemNumber": "1", "SiteCode": "X", "CustomerProductID": "CUST1", "EAN": "987"}
#         ]
#         mock_model.so_check.return_value = [self.result_row]
#         mock_s3_client.get_object.return_value = self.s3_object
#         mock_ean_mapping.prepare_payload_from_xml_event.return_value = payload
#         mock_model.save_or_update_line_item_details.return_value = True
#         mock_model.create_logs.return_value = True
#         mock_model.save_req_res.return_value = True
#         mock_model.update_failed_message.return_value = True
#         mock_mail.send_mail.return_value = True
#         mock_sap.mrp_and_caselot_check.return_value = self.mrp_response
#         mock_response_handlers.send.side_effect = lambda code, msg: {"status": code, "message": msg}
#         resp = self.svc.po_processing_so_creation_service(json.dumps({"PO NUMBER": self.po_number}))
#         self.assertEqual(resp["status"], 400)
#         self.assertTrue(resp["message"])

#     @patch("src.services.po_processing_so_creation_service.po_processing_so_creation_model")
#     @patch("src.services.po_processing_so_creation_service.s3_client")
#     @patch("src.services.po_processing_so_creation_service.ean_mapping_service")
#     @patch("src.services.po_processing_so_creation_service.response_handlers")
#     @patch("src.services.po_processing_so_creation_service.sap_service")
#     def test_mrp_check_error(self, mock_sap, mock_response_handlers, mock_ean_mapping, mock_s3_client, mock_model):
#         payload = self.payload.copy()
#         payload["mrp_check_req"] = {"NAVPRICE": [1]}
#         mock_model.so_check.return_value = [self.result_row]
#         mock_s3_client.get_object.return_value = self.s3_object
#         mock_ean_mapping.prepare_payload_from_xml_event.return_value = payload
#         mock_model.save_or_update_line_item_details.return_value = True
#         mock_sap.mrp_and_caselot_check.side_effect = Exception("MRP Service Down")
#         mock_response_handlers.send.side_effect = lambda code, msg: {"status": code, "message": msg}
#         resp = self.svc.po_processing_so_creation_service(json.dumps({"PO NUMBER": self.po_number}))
#         self.assertEqual(resp["status"], 400)
#         self.assertIn("mrp service down", resp["message"].lower())

# if __name__ == "__main__":
#     unittest.main()