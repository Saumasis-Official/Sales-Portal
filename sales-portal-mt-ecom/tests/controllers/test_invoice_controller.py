import unittest
from unittest.mock import patch
import os

os.environ['MT_ECOM_PORT'] = '5432'

from src.controllers.invoice_controller import InvoiceController

class TestInvoiceController(unittest.TestCase):

    @patch('psycopg2.connect') 
    @patch('src.utils.database_helper.DatabaseHelper')
    @patch('src.controllers.invoice_controller.InvoiceService')
    def setUp(self, MockInvoiceService, MockDatabaseHelper, MockPsycopg2Connect):
        self.mock_invoice_service = MockInvoiceService()
        self.mock_database_helper = MockDatabaseHelper()
        self.mock_psycopg2_connect = MockPsycopg2Connect
        self.invoice_controller = InvoiceController()

    def test_create_invoice_payload(self):
        data = {'po_number': '12345', 'debug': True}
        self.mock_invoice_service.create_invoice_payload.return_value = {'status': 'success'}

        result = self.invoice_controller.create_invoice_payload(data)

        self.mock_invoice_service.create_invoice_payload.assert_called_once_with(data)
        self.assertEqual(result, {'status': 'success'})

    def test_invoice_processing(self):
        data = {'invoice_id': '67890'}
        self.mock_invoice_service.invoice_processing.return_value = {'status': 'processed'}

        result = self.invoice_controller.invoice_processing(data)

        self.mock_invoice_service.invoice_processing.assert_called_once_with(data)
        self.assertEqual(result, {'status': 'processed'})

if __name__ == '__main__':
    unittest.main()