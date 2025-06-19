import unittest
from unittest.mock import patch, MagicMock
from src.services.log_service import LogService
from src.models.log_model import LogModel
from src.models.xml_validation_model import XmlValidationModel
from src.exceptions.log_service_exception import LogServiceException
from src.utils import constants
from src.libs.loggers import Logger
from unittest import mock

class TestLogService(unittest.TestCase):

    @patch.object(LogModel, 'insert_sync_log')
    def test_insert_sync_log(self, mock_insert_sync_log):
        log_service = LogService()
        log_service.insert_sync_log('type', 'result', 'data', 'distributor_id', 'error')
        mock_insert_sync_log.assert_called_once_with(log_service, 'type', 'result', 'data', 'distributor_id', 'error')

    @patch.object(LogModel, 'insert_email_log')
    def test_insert_email_log(self, mock_insert_email_log):
        log_service = LogService()
        email_data = {
            "type": "type",
            "status": "status",
            "subject": "subject",
            "recipients": {"recipient": "test@example.com"},
            "reference": "reference",
            "email_data": {"key": "value"},
            "error": "error",
        }
        log_service.insert_email_log(
            type="type",
            status="status",
            subject="subject",
            recipients={"recipient": "test@example.com"},
            reference="reference",
            email_data={"key": "value"},
            error="error"
        )
        mock_insert_email_log.assert_called_once_with(email_data)

   
    @patch.object(XmlValidationModel, 'create_logs')
    def test_log_process(self, mock_create_logs):
        log_service = LogService()
        result = log_service.log_process(po_number="12345")
        self.assertTrue(result)
        mock_create_logs.assert_called_once_with({
            "po_number": "12345",
            "log": constants.JSON_VALIDATION_STATUS_SUCCESS,
            "status": constants.XSD_SUCCESS,
        })
    @patch.object(XmlValidationModel, 'create_logs')
    @patch.object(Logger, 'error')
    def test_log_process_exception(self, mock_logger_error, mock_create_logs):
        mock_create_logs.side_effect = Exception("Test Exception")
        log_service = LogService()
        result = log_service.log_process(po_number="12345")
        self.assertFalse(result)
        mock_logger_error.assert_called_once_with("Exception in LogService -> log_process: ", mock.ANY)
if __name__ == '__main__':
    unittest.main()