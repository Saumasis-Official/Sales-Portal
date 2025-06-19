import unittest
from unittest.mock import patch, MagicMock
import json

from src.services.invoice_service import InvoiceService

class TestInvoiceService(unittest.TestCase):
    def setUp(self):
        self.service = InvoiceService()

    @patch("src.services.invoice_service.global_var")
    @patch("src.services.invoice_service.logger")
    @patch("src.services.invoice_service.DataPersistService")
    @patch("src.services.invoice_service.SQSHelper")
    @patch("src.services.invoice_service.BlinkitTransformers")
    def test_create_invoice_payload_po_number_invoice_enabled_debug(self, mock_blinkit, mock_sqs, mock_data_persist, mock_logger, mock_global):
        service = InvoiceService()
        service.DATA_PERSIST_SERVICE = MagicMock()
        service.BLINKIT_TRANSFORMERS = MagicMock()
        service.SQS_HELPER = MagicMock()
        service.AMAZON_TRANSFORMERS = MagicMock()
        data = {"po_number": "PO123", "debug": True}
        service.DATA_PERSIST_SERVICE.fetch_non_invoiced_items.return_value = [{"id": "ID1", "customer": "CUST1", "so_number": "SO1"}]
        service.DATA_PERSIST_SERVICE.fetch_workflow_configurations.return_value = {"invoice": True}
        service.DATA_PERSIST_SERVICE.fetch_items.return_value = {"data": ["item"], "customer": "CUST1", "so_number": "SO1"}
        service.BLINKIT_TRANSFORMERS.invoice_payload_transformer.return_value = ["transformed"]
        result = service.create_invoice_payload(data)
        self.assertEqual(result, {"data": ["transformed"], "customer": "CUST1"})

    @patch("src.services.invoice_service.global_var")
    @patch("src.services.invoice_service.logger")
    @patch("src.services.invoice_service.DataPersistService")
    @patch("src.services.invoice_service.SQSHelper")
    @patch("src.services.invoice_service.BlinkitTransformers")
    def test_create_invoice_payload_po_number_invoice_enabled_not_debug(self, mock_blinkit, mock_sqs, mock_data_persist, mock_logger, mock_global):
        service = InvoiceService()
        service.DATA_PERSIST_SERVICE = MagicMock()
        service.BLINKIT_TRANSFORMERS = MagicMock()
        service.SQS_HELPER = MagicMock()
        service.AMAZON_TRANSFORMERS = MagicMock()
        data = {"po_number": "PO123"}
        service.DATA_PERSIST_SERVICE.fetch_non_invoiced_items.return_value = [{"id": "ID1", "customer": "CUST1", "so_number": "SO1"}]
        service.DATA_PERSIST_SERVICE.fetch_workflow_configurations.return_value = {"invoice": True}
        service.DATA_PERSIST_SERVICE.fetch_items.return_value = {"data": ["item"], "customer": "CUST1", "so_number": "SO1"}
        service.BLINKIT_TRANSFORMERS.invoice_payload_transformer.return_value = ["transformed"]
        result = service.create_invoice_payload(data)
        self.assertTrue(result)
        service.SQS_HELPER.send_data_to_invoicing_sqs.assert_called()

    @patch("src.services.invoice_service.global_var")
    @patch("src.services.invoice_service.logger")
    @patch("src.services.invoice_service.DataPersistService")
    @patch("src.services.invoice_service.SQSHelper")
    @patch("src.services.invoice_service.BlinkitTransformers")
    def test_create_invoice_payload_po_number_invoice_disabled(self, mock_blinkit, mock_sqs, mock_data_persist, mock_logger, mock_global):
        service = InvoiceService()
        service.DATA_PERSIST_SERVICE = MagicMock()
        service.DATA_PERSIST_SERVICE.fetch_non_invoiced_items.return_value = [{"id": "ID1", "customer": "CUST1", "so_number": "SO1"}]
        service.DATA_PERSIST_SERVICE.fetch_workflow_configurations.return_value = {"invoice": False}
        result = service.create_invoice_payload({"po_number": "PO123"})
        self.assertEqual(result, [])

    @patch("src.services.invoice_service.global_var")
    @patch("src.services.invoice_service.logger")
    @patch("src.services.invoice_service.DataPersistService")
    def test_create_invoice_payload_po_number_not_found(self, mock_data_persist, mock_logger, mock_global):
        service = InvoiceService()
        service.DATA_PERSIST_SERVICE = MagicMock()
        service.DATA_PERSIST_SERVICE.fetch_non_invoiced_items.return_value = []
        result = service.create_invoice_payload({"po_number": "PO123"})
        self.assertEqual(result, [])

    @patch("src.services.invoice_service.global_var")
    @patch("src.services.invoice_service.logger")
    @patch("src.services.invoice_service.DataPersistService")
    @patch("src.services.invoice_service.SQSHelper")
    @patch("src.services.invoice_service.BlinkitTransformers")
    def test_create_invoice_payload_no_po_number_non_invoiced_po(self, mock_blinkit, mock_sqs, mock_data_persist, mock_logger, mock_global):
        service = InvoiceService()
        service.DATA_PERSIST_SERVICE = MagicMock()
        service.SQS_HELPER = MagicMock()
        service.BLINKIT_TRANSFORMERS = MagicMock()
        # Simulate one PO with config that enables invoice, and items
        po = {"id": "PO1", "customer": "CUST1", "po": "POCODE"}
        service.DATA_PERSIST_SERVICE.fetch_non_invoiced_items.side_effect = [
            [po],   # fetch_non_invoiced_items("", "")
            ["item"]  # fetch_non_invoiced_items(None, po.get("id"))
        ]
        service.DATA_PERSIST_SERVICE.fetch_workflow_configurations.return_value = {"invoice": True}
        service.BLINKIT_TRANSFORMERS.invoice_payload_transformer.return_value = ["transformed"]
        result = service.create_invoice_payload({})
        self.assertTrue(result)

    @patch("src.services.invoice_service.global_var")
    @patch("src.services.invoice_service.logger")
    @patch("src.services.invoice_service.DataPersistService")
    def test_create_invoice_payload_no_non_invoiced_items(self, mock_data_persist, mock_logger, mock_global):
        service = InvoiceService()
        service.DATA_PERSIST_SERVICE = MagicMock()
        service.DATA_PERSIST_SERVICE.fetch_non_invoiced_items.return_value = []
        result = service.create_invoice_payload({})
        self.assertTrue(result)

    @patch("src.services.invoice_service.DataPersistService")
    @patch("src.services.invoice_service.logger")
    @patch("src.services.invoice_service.global_var")
    def test_create_invoice_payload_data_persisting_exception(self, mock_global, mock_logger, mock_data_persist):
        service = InvoiceService()
        service.DATA_PERSIST_SERVICE = MagicMock()
        service.DATA_PERSIST_SERVICE.fetch_non_invoiced_items.side_effect = Exception("fail")
        result = service.create_invoice_payload({"po_number": "PO123"})
        self.assertIsNone(result)  # returns None due to generic Exception

    @patch("src.services.invoice_service.DataPersistService")
    @patch("src.services.invoice_service.logger")
    @patch("src.services.invoice_service.global_var")
    def test_create_invoice_payload_data_persisting_exception_custom(self, mock_global, mock_logger, mock_data_persist):
        from src.exceptions.data_persisting_exception import DataPersistingException
        service = InvoiceService()
        service.DATA_PERSIST_SERVICE = MagicMock()
        service.DATA_PERSIST_SERVICE.fetch_non_invoiced_items.side_effect = DataPersistingException("E001", "fail")
        result = service.create_invoice_payload({"po_number": "PO123"})
        self.assertFalse(result)

    @patch("src.services.invoice_service.global_var")
    @patch("src.services.invoice_service.logger")
    @patch("src.services.invoice_service.Customers")
    @patch("src.services.invoice_service.DataPersistService")
    @patch("src.services.invoice_service.MulesoftService")
    @patch("src.services.invoice_service.HelperClass")
    @patch("src.services.invoice_service.AmazonTransformers")
    @patch("src.services.invoice_service.BlinkitTransformers")
    @patch("src.services.invoice_service.SQSHelper")
    def test_invoice_processing_happy_path(
        self, mock_sqs, mock_blinkit, mock_amazon, mock_helper, mock_mulesoft, mock_data_persist, mock_customers, mock_logger, mock_global
    ):
        service = InvoiceService()
        service.DATA_PERSIST_SERVICE = MagicMock()
        service.MULESOFT_SERVICE = MagicMock()
        service.HELPER = MagicMock()
        service.AMAZON_TRANSFORMERS = MagicMock()
        service.SQS_HELPER = MagicMock()
        service.BLINKIT_TRANSFORMERS = MagicMock()
        NAVHDR = [{"PONumber": "PN1"}]
        data = {
            "body": json.dumps({"data": {"NAVHDR": NAVHDR}, "customer": "BLINKIT", "receiptHandle": "RH"}),
            "receiptHandle": "RH"
        }
        service.DATA_PERSIST_SERVICE.fetch_workflow_configurations.return_value = {"invoice": True, "mrp_2": False}
        resp_json = {
            "d": {
                "NAVHDR": {
                    "results": [
                        {
                            "NAV_INVOICES": {
                                "results": [
                                    {
                                        "Invoice": "INV1",
                                        "InvoiceDate": "20240515",
                                        "NAVINVLINES": {
                                            "results": [
                                                {
                                                    "ItemNumber": "1",
                                                    "PoItemNumber": "1",
                                                    "Quantity": "2",
                                                    "CorrectMRP": "10.00",
                                                    "BasePrice": "20.00",
                                                    "outerCaseSize": "1",
                                                    "caseCount": "1",
                                                    "UGST_Value": "1",
                                                    "CGST_Value": "1",
                                                    "Cess_Value": "1",
                                                    "IGST_Value": "1",
                                                    "SGST_Value": "1",
                                                    "MRP": "10.00",
                                                    "hsnCode": "HSN",
                                                    "lltaxAmt": "1",
                                                    "costPrice": "10.00",
                                                    "expDt": "20240630",
                                                    "mfdDate": "20240501"
                                                }
                                            ]
                                        },
                                        "NAVTAX": "TAX",
                                        "InvoiceQty": "1",
                                        "DeliveryDate": "20240516",
                                        "TotalCostPrice": "10.00",
                                        "totTaxAmt": "1"
                                    }
                                ]
                            },
                            "SalesOrder": "SO1",
                            "PONumber": "PN1"
                        }
                    ]
                }
            }
        }
        resp_obj = MagicMock()
        resp_obj.json.return_value = resp_json
        service.MULESOFT_SERVICE.invoice_sync.return_value = resp_obj
        service.MULESOFT_SERVICE.invoice.return_value = resp_obj
        service.MULESOFT_SERVICE.asn.return_value = resp_obj
        service.DATA_PERSIST_SERVICE.get_invoice_status.return_value = {"po_item_description": "desc", "customer_product_id": 1}
        service.HELPER.sanitize_sap_price_value.side_effect = lambda x: x
        service.HELPER.remove_custom_types.side_effect = lambda x: x
        service.AMAZON_TRANSFORMERS.invoice_items_transformer.return_value = {}
        service.AMAZON_TRANSFORMERS.invoice_header_transformer.return_value = MagicMock(model_dump=lambda: {})
        service.DATA_PERSIST_SERVICE.get_header_data.return_value = {"location": "loc"}
        service.DATA_PERSIST_SERVICE.create_logs.return_value = True
        service.DATA_PERSIST_SERVICE.create_audit_logs.return_value = True
        service.DATA_PERSIST_SERVICE.save_req_res.return_value = True
        service.DATA_PERSIST_SERVICE.update_invoice_status.return_value = True
        result = service.invoice_processing(json.dumps(data))
        self.assertTrue(result)

    @patch("src.services.invoice_service.DataPersistService")
    @patch("src.services.invoice_service.logger")
    @patch("src.services.invoice_service.global_var")
    def test_invoice_processing_exception(self, mock_global, mock_logger, mock_data_persist):
        service = InvoiceService()
        service.DATA_PERSIST_SERVICE = MagicMock()
        service.MULESOFT_SERVICE = MagicMock()
        service.HELPER = MagicMock()
        service.AMAZON_TRANSFORMERS = MagicMock()
        service.SQS_HELPER = MagicMock()
        service.BLINKIT_TRANSFORMERS = MagicMock()
        service.DATA_PERSIST_SERVICE.fetch_workflow_configurations.side_effect = Exception("fail")
        data = {
            "body": json.dumps({"data": {"NAVHDR": [{}]}, "customer": "BLINKIT"}),
            "receiptHandle": "RH"
        }
        result = service.invoice_processing(json.dumps(data))
        self.assertIsNone(result)
        service.SQS_HELPER.delete_message.assert_called_with("RH", "invoicing")

if __name__ == "__main__":
    unittest.main()