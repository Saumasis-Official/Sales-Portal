import unittest
from unittest.mock import patch, MagicMock
from src.utils.mail_helper import MailHelper
import pandas as pd
import os
import src.utils.constants as constants

class TestMailHelper(unittest.TestCase):

    @patch('src.utils.mail_helper.boto3.client')
    @patch('src.utils.mail_helper.PoProcessingSoCreationModel.get_so_mail_recipients')
    @patch('src.utils.mail_helper.LogService.insert_email_log')
    def test_so_success_mail(self, mock_insert_email_log, mock_get_so_mail_recipients, mock_boto_client):
        mock_get_so_mail_recipients.return_value = 'test@example.com'
        mock_ses_client = MagicMock()
        mock_boto_client.return_value = mock_ses_client

        mail_helper = MailHelper()
        body_msg = {
            'po_number': 'PO123',
            'so_number': 'SO123',
            'so_details': [{'item': 'item1', 'quantity': 1}],
            'id': 1
        }
        subject = 'Sales order created successfully'

        with patch('builtins.open', unittest.mock.mock_open(read_data="html content")):
            mail_helper.so_success_mail(body_msg, subject)

        mock_ses_client.send_email.assert_called_once()
        mock_insert_email_log.assert_called_once_with('MT_ECOM_SO_SUCCESS', 'SUCCESS', subject, {"to": ['test@example.com']}, None, body_msg, None)

    @patch('src.utils.mail_helper.boto3.client')
    @patch('src.utils.mail_helper.PoProcessingSoCreationModel.get_error_or_exception_mail_recipients')
    @patch('src.utils.mail_helper.LogService.insert_email_log')
    def test_error_exception_mail(self, mock_insert_email_log, mock_get_error_or_exception_mail_recipients, mock_boto_client):
        mock_get_error_or_exception_mail_recipients.return_value = 'test@example.com'
        mock_ses_client = MagicMock()
        mock_boto_client.return_value = mock_ses_client

        mail_helper = MailHelper()
        body_msg = {
            'po_number': 'PO123',
            'details': [{'error': 'error1', 'description': 'desc1'}],
            'type': 'Error'
        }
        subject = 'Error occurred'

        with patch('builtins.open', unittest.mock.mock_open(read_data="html content")):
            mail_helper.error_exception_mail(body_msg, subject)

        mock_ses_client.send_email.assert_called_once()
        mock_insert_email_log.assert_called_once_with('MT_ECOM_ERROR', 'SUCCESS', subject, {"to": ['test@example.com']}, None, body_msg, None)

    @patch('src.utils.mail_helper.boto3.client')
    @patch('src.utils.mail_helper.PoProcessingSoCreationModel.get_error_or_exception_mail_recipients')
    @patch('src.utils.mail_helper.LogService.insert_email_log')
    def test_exception_mail(self, mock_insert_email_log, mock_get_error_or_exception_mail_recipients, mock_boto_client):
        mock_get_error_or_exception_mail_recipients.return_value = 'test@example.com'
        mock_ses_client = MagicMock()
        mock_boto_client.return_value = mock_ses_client

        mail_helper = MailHelper()
        body_msg = {
            'po_number': 'PO123',
            'Message': 'Exception occurred',
            'type': 'Exception'
        }
        subject = 'Exception occurred'

        with patch('builtins.open', unittest.mock.mock_open(read_data="html content")):
            mail_helper.exception_mail(body_msg, subject)

        mock_ses_client.send_email.assert_called_once()
        mock_insert_email_log.assert_called_once_with('MT_ECOM_SUCCESS', 'SUCCESS', subject, {"to": ['test@example.com']}, None, body_msg, None)

if __name__ == '__main__':
    unittest.main()