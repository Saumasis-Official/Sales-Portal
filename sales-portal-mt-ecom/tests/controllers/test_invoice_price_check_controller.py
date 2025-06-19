import unittest
from unittest.mock import patch, MagicMock
from src.controllers.invoice_price_check_controller import InvoicePriceCheckController

class TestInvoicePriceCheckController(unittest.TestCase):
    
    @patch('src.services.invoice_price_check_service.InvoicePriceCheckService')
    def setUp(self, MockInvoicePriceCheckService):
        self.mock_service = MockInvoicePriceCheckService()
        self.controller = InvoicePriceCheckController()
        self.controller.invoice_price_check_service = self.mock_service  
    
    def test_check_invoice_price_success(self):
        self.mock_service.check_invoice_price.return_value = {'status': 'success', 'price': 100}
        result = self.controller.check_invoice_price(True, 'PO12345')
        self.mock_service.check_invoice_price.assert_called_once_with(True, 'PO12345')
        self.assertEqual(result, {'status': 'success', 'price': 100})
    
    def test_check_invoice_price_failure(self):
        self.mock_service.check_invoice_price.return_value = {'status': 'error', 'message': 'Invalid PO number'}
        result = self.controller.check_invoice_price(False, 'INVALID_PO')
        self.mock_service.check_invoice_price.assert_called_once_with(False, 'INVALID_PO')
        self.assertEqual(result, {'status': 'error', 'message': 'Invalid PO number'})
    
    def test_sap_check_invoice_price_success(self):
        data = {'invoice_id': 'INV123'}
        self.mock_service.sap_check_invoice_price.return_value = {'status': 'verified'}
        result = self.controller.sap_check_invoice_price(data)
        self.mock_service.sap_check_invoice_price.assert_called_once_with(data)
        self.assertEqual(result, {'status': 'verified'})
    
    def test_sap_check_invoice_price_invalid_data(self):
        data = {}  # Empty data case
        self.mock_service.sap_check_invoice_price.return_value = {'status': 'error', 'message': 'Missing data'}
        result = self.controller.sap_check_invoice_price(data)
        self.mock_service.sap_check_invoice_price.assert_called_once_with(data)
        self.assertEqual(result, {'status': 'error', 'message': 'Missing data'})

if __name__ == '__main__':
    unittest.main()
 