import unittest
from unittest.mock import patch, MagicMock
import json

from src.services.invoice_price_check_service import InvoicePriceCheckService

class TestInvoicePriceCheckService(unittest.TestCase):
    def setUp(self):
        self.service = InvoicePriceCheckService()

    def test_response_check_not_splitted(self):
        inv_arr = [{"Invoice": "123"}]
        result = self.service.response_check(inv_arr)
        self.assertEqual(result, "Not_Splitted")

    def test_response_check_splitted(self):
        inv_arr = [{"Invoice": "123"}, {"Invoice": "123"}]
        result = self.service.response_check(inv_arr)
        self.assertEqual(result, "Invoice_Splitted")

    @patch("src.services.invoice_price_check_service.invoice_price_check_model")
    @patch("src.services.invoice_price_check_service.ean_mapping_service")
    @patch("src.services.invoice_price_check_service.helper")
    @patch("src.services.invoice_price_check_service.sqs_helper")
    @patch("src.services.invoice_price_check_service.response_handlers")
    def test_check_invoice_price_po_number(self, mock_response_handlers, mock_sqs, mock_helper, mock_ean, mock_model):
        mock_model.get_header_data.return_value = [{"id": "header1", "po_number": "PN1"}]
        mock_model.get_item_status.return_value = [1]
        mock_model.get_non_invoiced_items.return_value = [{"foo": "bar"}]
        mock_helper.remove_custom_types.side_effect = lambda x: x
        mock_ean.prepare_mrp_check_2_payload.return_value = {"status": True}
        mock_response_handlers.send.return_value = "ok"

        result = self.service.check_invoice_price(flag=True, po_number="PN1")
        self.assertEqual(result, {"status": True})

        mock_ean.prepare_mrp_check_2_payload.return_value = {"status": True}
        result = self.service.check_invoice_price(flag=False, po_number="PN1")
        mock_sqs.send_data_to_invoice_sqs.assert_called()
        self.assertEqual(result, "ok")

    @patch("src.services.invoice_price_check_service.invoice_price_check_model")
    @patch("src.services.invoice_price_check_service.ean_mapping_service")
    @patch("src.services.invoice_price_check_service.helper")
    @patch("src.services.invoice_price_check_service.sqs_helper")
    @patch("src.services.invoice_price_check_service.response_handlers")
    def test_check_invoice_price_po_number_no_item_data(self, mock_response_handlers, mock_sqs, mock_helper, mock_ean, mock_model):
        mock_model.get_header_data.return_value = [{"id": "header1", "po_number": "PN1"}]
        mock_model.get_item_status.return_value = [1]
        mock_model.get_non_invoiced_items.return_value = []
        mock_response_handlers.send.return_value = "ok"
        result = self.service.check_invoice_price(flag=False, po_number="PN1")
        self.assertEqual(result, "ok")

    @patch("src.services.invoice_price_check_service.invoice_price_check_model")
    @patch("src.services.invoice_price_check_service.response_handlers")
    def test_check_invoice_price_no_status(self, mock_response_handlers, mock_model):
        mock_model.get_non_invoiced_items.return_value = [{"id": "header2", "po_number": "PN2"}]
        mock_model.get_item_status.return_value = []
        mock_response_handlers.send.return_value = "ok"
        result = self.service.check_invoice_price(flag=False, po_number=False)
        mock_model.change_po_status_to_pending.assert_called()
        mock_model.change_po_status_to_completed.assert_called_with("PN2")
        self.assertEqual(result, "ok")

    @patch("src.services.invoice_price_check_service.sap_service")
    @patch("src.services.invoice_price_check_service.invoice_price_check_model")
    @patch("src.services.invoice_price_check_service.acknowledgement_helper")
    @patch("src.services.invoice_price_check_service.response_handlers")
    @patch("src.services.invoice_price_check_service.helper")
    @patch("src.services.invoice_price_check_service.mail_helper")
    @patch("src.services.invoice_price_check_service.sqs_helper")
    def test_sap_check_invoice_price_full(
        self, mock_sqs, mock_mail, mock_helper, mock_response, mock_ack, mock_model, mock_sap
    ):
        event = {
            "body": json.dumps({"data": {"foo": "bar"}}),
            "receiptHandle": "RH"
        }
        mock_sap.mrp_check_2.return_value.json.return_value = {
            "data": {
                "data": {
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
                                                            "IsValid": "false",
                                                            "CorrectMRP": "10.00",
                                                            "BasePrice": "20.00"
                                                        },
                                                        {
                                                            "ItemNumber": "1",
                                                            "PoItemNumber": "1",
                                                            "Quantity": "2",
                                                            "IsValid": "true",
                                                            "CorrectMRP": "10.00",
                                                            "BasePrice": "20.00"
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    },
                                    "SalesOrder": "SO1",
                                    "PONumber": "PN1",
                                    "UniqueID": "UID1",
                                    "SoStatus": "COMPLETED"
                                }
                            ]
                        }
                    }
                }
            }
        }
        mock_helper.sanitize_sap_price_value.side_effect = lambda x: x
        mock_model.get_invoice_status.return_value = False
        mock_model.check_amendment_status.return_value = False
        mock_ack.prepare_error_info_xml.return_value = "<xml/>"
        mock_model.create_logs.return_value = True
        mock_ack.send_error_ack_to_reliance.return_value = True
        mock_ack.prepare_line_item_asn_data.return_value = "ASN_LINE"
        mock_model.update_status_of_item.return_value = True
        mock_model.update_invoice_in_header.return_value = True
        mock_model.get_invoice_status.return_value = False
        mock_model.check_amendment_status.side_effect = [False, False]
        mock_response.send.return_value = "ok"
        mock_ack.send_asn_to_reliance.return_value = True

        result = self.service.sap_check_invoice_price(json.dumps(event))
        mock_response.send.assert_called_with(200, "Success")
        self.assertEqual(result, "ok")
        mock_sqs.delete_message.assert_called_with("RH", "invoice")

        with patch.object(self.service, "response_check", return_value="Invoice_Splitted"):
            result = self.service.sap_check_invoice_price(json.dumps(event))
            self.assertEqual(result, "ok")

    @patch("src.services.invoice_price_check_service.sap_service")
    @patch("src.services.invoice_price_check_service.response_handlers")
    def test_sap_check_invoice_price_no_navhdr(self, mock_response, mock_sap):
        event = {"body": json.dumps({"data": {}})}
        mock_sap.mrp_check_2.return_value.json.return_value = {"data": {"data": {"d": {}}}}
        mock_response.send.return_value = "ok"
        result = self.service.sap_check_invoice_price(json.dumps(event))
        self.assertIsNone(result)  # <-- Expect None, not "ok"

    @patch("src.services.invoice_price_check_service.sap_service")
    @patch("src.services.invoice_price_check_service.response_handlers")
    def test_sap_check_invoice_price_no_body(self, mock_response, mock_sap):
        event = {"foo": "bar"}
        mock_sap.mrp_check_2.return_value.json.return_value = {"data": {"data": {"d": {}}}}
        mock_response.send.return_value = "ok"
        result = self.service.sap_check_invoice_price(json.dumps(event))
        self.assertIsNone(result)  # <-- Expect None, not "ok"

if __name__ == "__main__":
    unittest.main()