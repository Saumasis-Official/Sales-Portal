import unittest
from unittest.mock import patch, MagicMock
from src.models.xml_validation_model import XmlValidationModel
import datetime


class TestXmlValidationModel(unittest.TestCase):

    @patch('src.models.xml_validation_model.database_helper')
    def test_save_or_update_po_details_update(self, mock_db_helper):
        # Setup mock
        mock_conn_read = MagicMock()
        mock_conn_write = MagicMock()
        mock_cursor_read = MagicMock()
        mock_cursor_write = MagicMock()

        # Configure read cursor to return existing record
        mock_cursor_read.fetchall.return_value = [(1, 2)]

        mock_conn_read.cursor.return_value = mock_cursor_read
        mock_conn_write.cursor.return_value = mock_cursor_write

        mock_db_helper.get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_db_helper.get_write_connection.return_value.__enter__.return_value = mock_conn_write

        model = XmlValidationModel()
        data = {
            "po_number": "PO123",
            "xml_file_key": "file.xml",
            "json_file_key": "file.json"
        }

        result = model.save_or_update_po_details(data)
        self.assertFalse(result)
        mock_cursor_write.execute.assert_called_once()
        mock_conn_write.commit.assert_called_once()

    @patch('src.models.xml_validation_model.database_helper')
    def test_save_or_update_po_details_insert(self, mock_db_helper):
        # Setup mock
        mock_conn_read = MagicMock()
        mock_conn_write = MagicMock()
        mock_cursor_read = MagicMock()
        mock_cursor_write = MagicMock()

        # No data found, so insert happens
        mock_cursor_read.fetchall.return_value = []

        mock_conn_read.cursor.return_value = mock_cursor_read
        mock_conn_write.cursor.return_value = mock_cursor_write

        mock_db_helper.get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_db_helper.get_write_connection.return_value.__enter__.return_value = mock_conn_write

        model = XmlValidationModel()
        data = {
            "unique_id": "abc123",
            "po_number": "PO456",
            "status": "new",
            "json_file_key": "data.json",
            "po_date": datetime.datetime(2024, 4, 9),
            "xml_file_key": "data.xml",
            "customer": "test_customer"
        }

        result = model.save_or_update_po_details(data)
        self.assertTrue(result)
        mock_cursor_write.execute.assert_called_once()
        mock_conn_write.commit.assert_called_once()

    @patch('src.models.xml_validation_model.database_helper')
    def test_save_or_update_po_details_exception(self, mock_db_helper):
        mock_conn_read = MagicMock()
        mock_conn_write = MagicMock()
        mock_cursor_read = MagicMock()

        # Force exception in execute
        mock_cursor_read.execute.side_effect = Exception("DB Error")
        mock_conn_read.cursor.return_value = mock_cursor_read
        mock_db_helper.get_read_connection.return_value.__enter__.return_value = mock_conn_read

        model = XmlValidationModel()
        with self.assertRaises(Exception):
            model.save_or_update_po_details({"po_number": "PO789"})

    @patch('src.models.xml_validation_model.database_helper')
    def test_create_logs_success(self, mock_db_helper):
        mock_conn_write = MagicMock()
        mock_cursor_write = MagicMock()

        mock_conn_write.cursor.return_value = mock_cursor_write
        mock_db_helper.get_write_connection.return_value.__enter__.return_value = mock_conn_write

        model = XmlValidationModel()
        data = {
            "po_number": "PO123",
            "log": "some log",
            "status": "success"
        }

        result = model.create_logs(data)
        self.assertTrue(result)
        mock_cursor_write.execute.assert_called_once()
        mock_conn_write.commit.assert_called_once()

    @patch('src.models.xml_validation_model.database_helper')
    def test_create_logs_exception(self, mock_db_helper):
        mock_conn_write = MagicMock()
        mock_cursor_write = MagicMock()

        mock_cursor_write.execute.side_effect = Exception("Log Insert Error")
        mock_conn_write.cursor.return_value = mock_cursor_write
        mock_db_helper.get_write_connection.return_value.__enter__.return_value = mock_conn_write

        model = XmlValidationModel()
        with self.assertRaises(Exception):
            model.create_logs({"po_number": "PO123", "log": "err", "status": "fail"})


if __name__ == '__main__':
    unittest.main()
