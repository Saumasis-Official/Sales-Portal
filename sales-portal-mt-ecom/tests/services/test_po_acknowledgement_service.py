import unittest
from unittest.mock import patch, MagicMock
from src.services.mulesoft_service import MulesoftService
from src.exceptions.so_sap_exception import SOCreationException
from src.exceptions.so_sap_validation_exception import SOValidationException

@patch("src.services.mulesoft_service.mulesoft_base_url", "http://dummy-base-url")
@patch("src.services.mulesoft_service.shopify_base_url", "http://dummy-shopify-url")
@patch("src.services.mulesoft_service.client_id", "dummy")
@patch("src.services.mulesoft_service.client_secret", "dummy")
@patch("src.services.mulesoft_service.shopify_client_id", "dummy")
@patch("src.services.mulesoft_service.shopify_client_secret", "dummy")
@patch("src.services.mulesoft_service.headers", {"dummy": "header"})
class TestMulesoftService(unittest.TestCase):
    def setUp(self):
        self.service = MulesoftService()

    @patch("src.services.mulesoft_service.mt_ecom_model")
    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_so_sync_success(self, mock_requests, mock_logger, mock_model):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_requests.get.return_value = mock_resp
        resp = self.service.so_sync("CUSTOMER", "2025-05-21", "user_id")
        self.assertEqual(resp, mock_resp)
        mock_requests.get.assert_called()

    @patch("src.services.mulesoft_service.mt_ecom_model")
    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_so_sync_fail(self, mock_requests, mock_logger, mock_model):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_requests.get.return_value = mock_resp
        resp = self.service.so_sync("CUSTOMER", "2025-05-21", "user_id")
        self.assertEqual(resp, mock_resp)
        mock_model.sync_logs.assert_called()

    @patch("src.services.mulesoft_service.mt_ecom_model")
    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_so_sync_exception(self, mock_requests, mock_logger, mock_model):
        mock_requests.get.side_effect = Exception("fail")
        with self.assertRaises(Exception):
            self.service.so_sync("CUSTOMER", "2025-05-21", "user_id")
        mock_model.sync_logs.assert_called()

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_so_creation_success(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_requests.post.return_value = mock_resp
        so_payload = MagicMock()
        so_payload.model_dump.return_value = {}
        resp = self.service.so_creation(so_payload)
        self.assertEqual(resp, mock_resp)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_so_creation_fail(self, mock_requests, mock_logger):
        mock_requests.post.side_effect = TypeError("unsupported operand type(s) for +: 'NoneType' and 'str'")
        so_payload = MagicMock()
        so_payload.model_dump.return_value = {}
        with self.assertRaises(SOCreationException):
            self.service.so_creation(so_payload)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_so_creation_exception(self, mock_requests, mock_logger):
        so_payload = MagicMock()
        so_payload.model_dump.return_value = {}
        mock_requests.post.side_effect = Exception("fail")
        with self.assertRaises(SOCreationException):
            self.service.so_creation(so_payload)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_so_validation_check_success(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_requests.post.return_value = mock_resp
        val_payload = MagicMock()
        val_payload.model_dump.return_value = {}
        resp = self.service.so_validation_check(val_payload)
        self.assertEqual(resp, mock_resp)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_so_validation_check_fail(self, mock_requests, mock_logger):
        mock_requests.post.side_effect = TypeError("unsupported operand type(s) for +: 'NoneType' and 'str'")
        val_payload = MagicMock()
        val_payload.model_dump.return_value = {}
        with self.assertRaises(SOValidationException):
            self.service.so_validation_check(val_payload)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_so_validation_check_exception(self, mock_requests, mock_logger):
        val_payload = MagicMock()
        val_payload.model_dump.return_value = {}
        mock_requests.post.side_effect = Exception("fail")
        with self.assertRaises(SOValidationException):
            self.service.so_validation_check(val_payload)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_invoice_sync_success(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_requests.post.return_value = mock_resp
        resp = self.service.invoice_sync({"foo": "bar"})
        self.assertEqual(resp, mock_resp)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_invoice_sync_exception(self, mock_requests, mock_logger):
        mock_requests.post.side_effect = Exception("fail")
        with self.assertRaises(Exception):
            self.service.invoice_sync({"foo": "bar"})

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_asn_success(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_requests.post.return_value = mock_resp
        resp = self.service.asn({"foo": "bar"}, "CUST")
        self.assertEqual(resp, mock_resp)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_asn_fail(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_requests.post.return_value = mock_resp
        resp = self.service.asn({"foo": "bar"}, "CUST")
        self.assertFalse(resp)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_asn_exception(self, mock_requests, mock_logger):
        mock_requests.post.side_effect = Exception("fail")
        with self.assertRaises(Exception):
            self.service.asn({"foo": "bar"}, "CUST")

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_shopify_so_creation(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_requests.post.return_value = mock_resp
        resp = self.service.shopify_so_creation({"foo": "bar"})
        self.assertEqual(resp, mock_resp)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_shopify_so_creation_exception(self, mock_requests, mock_logger):
        mock_requests.post.side_effect = Exception("fail")
        with self.assertRaises(Exception):
            self.service.shopify_so_creation({"foo": "bar"})

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_invoice_success(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_requests.post.return_value = mock_resp
        resp = self.service.invoice({"foo": "bar"}, "CUST", "LOC")
        self.assertEqual(resp, mock_resp)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_invoice_fail(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_requests.post.return_value = mock_resp
        resp = self.service.invoice({"foo": "bar"}, "CUST", "LOC")
        self.assertFalse(resp)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_invoice_exception(self, mock_requests, mock_logger):
        mock_requests.post.side_effect = Exception("fail")
        with self.assertRaises(Exception):
            self.service.invoice({"foo": "bar"}, "CUST", "LOC")

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_acknowledgement_success(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_resp.json.return_value = {"foo": "bar"}
        mock_requests.post.return_value = mock_resp
        resp = self.service.acknowledgement({"foo": "bar"}, "CUST", "LOC")
        self.assertEqual(resp, {"foo": "bar"})

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_acknowledgement_exception(self, mock_requests, mock_logger):
        mock_requests.post.side_effect = Exception("fail")
        with self.assertRaises(Exception):
            self.service.acknowledgement({"foo": "bar"}, "CUST", "LOC")

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_resend_po_success(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_requests.get.return_value = mock_resp
        resp = self.service.resend_po("testfile.csv")
        self.assertEqual(resp, mock_resp)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_resend_po_fail(self, mock_requests, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_requests.get.return_value = mock_resp
        resp = self.service.resend_po("testfile.csv")
        self.assertFalse(resp)

    @patch("src.services.mulesoft_service.logger")
    @patch("src.services.mulesoft_service.requests")
    def test_resend_po_exception(self, mock_requests, mock_logger):
        mock_requests.get.side_effect = Exception("fail")
        with self.assertRaises(Exception):
            self.service.resend_po("testfile.csv")

if __name__ == "__main__":
    unittest.main()