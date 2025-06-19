import os

os.environ['MT_ECOM_PORT'] = '5432'

import unittest
from unittest.mock import patch, MagicMock
from src.utils.sqs_helper import SQSHelper
from src.exceptions.sqs_exception import SQSException
from src.enums.customers_enum import Customers
from src.constants.globals import GlobalsVars

class TestSQSHelper(unittest.TestCase):

    @patch('src.utils.sqs_helper.boto3.resource')
    @patch('src.utils.sqs_helper.Logger')
    @patch('src.utils.sqs_helper.SQS')
    def setUp(self, mock_sqs, mock_logger, mock_boto3_resource):
        self.mock_sqs = mock_sqs
        self.mock_logger = mock_logger
        self.mock_boto3_resource = mock_boto3_resource
        self.sqs_helper = SQSHelper()

    @patch('src.utils.sqs_helper.SQSHelper.delete_message')
    def test_delete_message(self, mock_delete_message):
        mock_delete_message.return_value = True
        result = self.sqs_helper.delete_message('queue_url', 'receipt_handle')
        self.assertTrue(result)
        mock_delete_message.assert_called_once_with('queue_url', 'receipt_handle')

    @patch('src.utils.sqs_helper.SQSHelper.send_data_to_sqs')
    def test_send_data_to_sqs(self, mock_send_data_to_sqs):
        mock_send_data_to_sqs.return_value = True
        result = self.sqs_helper.send_data_to_sqs('queue_url', {'key': 'value'})
        self.assertTrue(result)
        mock_send_data_to_sqs.assert_called_once_with('queue_url', {'key': 'value'})

    @patch('src.utils.sqs_helper.SQSHelper.send_data_to_invoice_sqs')
    def test_send_data_to_invoice_sqs(self, mock_send_data_to_invoice_sqs):
        mock_send_data_to_invoice_sqs.return_value = True
        result = self.sqs_helper.send_data_to_invoice_sqs('queue_url', {'key': 'value'})
        self.assertTrue(result)
        mock_send_data_to_invoice_sqs.assert_called_once_with('queue_url', {'key': 'value'})

    @patch('src.utils.sqs_helper.SQSHelper.send_data_to_invoicing_sqs')
    def test_send_data_to_invoicing_sqs(self, mock_send_data_to_invoicing_sqs):
        mock_send_data_to_invoicing_sqs.return_value = True
        result = self.sqs_helper.send_data_to_invoicing_sqs('queue_url', {'key': 'value'})
        self.assertTrue(result)
        mock_send_data_to_invoicing_sqs.assert_called_once_with('queue_url', {'key': 'value'})

    @patch('src.utils.sqs_helper.SQSHelper.send_data_so_sqs')
    def test_send_data_so_sqs(self, mock_send_data_so_sqs):
        mock_send_data_so_sqs.return_value = True
        result = self.sqs_helper.send_data_so_sqs('queue_url', {'key': 'value'})
        self.assertTrue(result)
        mock_send_data_so_sqs.assert_called_once_with('queue_url', {'key': 'value'})

if __name__ == '__main__':
    unittest.main()