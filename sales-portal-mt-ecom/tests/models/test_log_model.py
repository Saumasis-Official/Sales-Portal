import unittest
from unittest.mock import patch, MagicMock
from decimal import Decimal
from src.models.log_model import LogModel

class TestLogModel(unittest.TestCase):

    @patch('src.models.log_model.database_helper.get_write_connection')
    def test_insert_sync_log_success(self, mock_get_write_connection):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        log_type = 'SO'
        result = 'success'
        data = {'upsertCount': 5, 'deleteCount': 2}
        distributorId = 123
        error = None
        isCronJob = False

        success = LogModel.insert_sync_log(log_type, result, data, distributorId, error, isCronJob)
        
        self.assertTrue(success)
        mock_cursor.execute.assert_called_once()

    @patch('src.models.log_model.database_helper.get_write_connection')
    def test_insert_sync_log_failure(self, mock_get_write_connection):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("DB Error")

        log_type = 'SO'
        result = 'failure'
        data = {'upsertCount': 5, 'deleteCount': 2}
        distributorId = 123
        error = 'Some error'
        isCronJob = False

        success = LogModel.insert_sync_log(log_type, result, data, distributorId, error, isCronJob)
        
        self.assertFalse(success)
        mock_cursor.execute.assert_called_once()

    @patch('src.models.log_model.database_helper.get_write_connection')
    def test_insert_email_log_success(self, mock_get_write_connection):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        data = {
            'type': 'notification',
            'status': 'sent',
            'subject': 'Test Email',
            'recipients': ['test@example.com'],
            'reference': 'ref123',
            'email_data': {'key': Decimal('10.5')},
            'error': None
        }

        success = LogModel.insert_email_log(data)
        
        self.assertTrue(success)
        mock_cursor.execute.assert_called_once()

    @patch('src.models.log_model.database_helper.get_write_connection')
    def test_insert_email_log_failure(self, mock_get_write_connection):
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("DB Error")

        data = {
            'type': 'notification',
            'status': 'failed',
            'subject': 'Test Email',
            'recipients': ['test@example.com'],
            'reference': 'ref123',
            'email_data': {'key': Decimal('10.5')},
            'error': 'Some error'
        }

        success = LogModel.insert_email_log(data)
        
        self.assertFalse(success)
        mock_cursor.execute.assert_called_once()

if __name__ == '__main__':
    unittest.main()