import unittest
from unittest.mock import patch, MagicMock
from src.models.invoice_price_check_model import InvoicePriceCheckModel
import src.utils.constants as constants


class TestInvoicePriceCheckModel(unittest.TestCase):
    def setUp(self):
        self.model = InvoicePriceCheckModel()
        self.mock_conn_read = MagicMock()
        self.mock_conn_write = MagicMock()
        self.mock_cursor = MagicMock()

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_get_item_status(self, mock_database_helper):
        mock_database_helper.get_read_connection.return_value.__enter__.return_value = self.mock_conn_read
        self.mock_conn_read.cursor.return_value = self.mock_cursor
        self.mock_cursor.description = [('id',), ('status',)]
        self.mock_cursor.fetchall.return_value = [(1, 'PENDING')]

        result = self.model.get_item_status(1)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['id'], 1)
        self.assertEqual(result[0]['status'], 'PENDING')

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_change_po_status_to_pending(self, mock_database_helper):
        mock_database_helper.get_write_connection.return_value.__enter__.return_value = self.mock_conn_write
        self.mock_conn_write.cursor.return_value = self.mock_cursor
        self.mock_cursor.description = [('id',), ('po_number',)]
        self.mock_cursor.fetchall.return_value = [(1, 'PO123')]

        result = self.model.change_po_status_to_pending()
        self.assertIsNone(result)

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_get_non_invoiced_items_with_id(self, mock_database_helper):
        mock_database_helper.get_read_connection.return_value.__enter__.return_value = self.mock_conn_read
        self.mock_conn_read.cursor.return_value = self.mock_cursor
        self.mock_cursor.description = [('id',), ('status',)]
        self.mock_cursor.fetchall.return_value = [(1, 'PENDING')]

        result = self.model.get_non_invoiced_items(1)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['id'], 1)

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_get_header_data(self, mock_database_helper):
        mock_database_helper.get_read_connection.return_value.__enter__.return_value = self.mock_conn_read
        self.mock_conn_read.cursor.return_value = self.mock_cursor
        self.mock_cursor.description = [('id',), ('po_number',)]
        self.mock_cursor.fetchall.return_value = [(1, 'PO123')]

        result = self.model.get_header_data('PO123')
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['id'], 1)

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_create_logs(self, mock_database_helper):
        mock_database_helper.get_write_connection.return_value.__enter__.return_value = self.mock_conn_write
        self.mock_conn_write.cursor.return_value = self.mock_cursor

        data = {'po_number': 'PO123', 'log': 'Created', 'status': 'SUCCESS', 'data': 'Test Data'}
        result = self.model.create_logs(data)
        self.assertTrue(result)

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_update_status_of_item(self, mock_database_helper):
        mock_database_helper.get_write_connection.return_value.__enter__.return_value = self.mock_conn_write
        self.mock_conn_write.cursor.return_value = self.mock_cursor

        data = {'type': 'success', 'status': 'SUCCESS', 'invoice_number': 'INV123', 'invoice_mrp': 100.0,
                'invoice_quantity': 10, 'invoice_date': '12.05.2025', 'item_number': 'ITEM1', 'so_number': 'SO123'}
        result = self.model.update_status_of_item(data)
        self.assertTrue(result)

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_update_invoice_in_header(self, mock_database_helper):
        mock_database_helper.get_read_connection.return_value.__enter__.return_value = self.mock_conn_read
        mock_database_helper.get_write_connection.return_value.__enter__.return_value = self.mock_conn_write
        self.mock_conn_read.cursor.return_value = self.mock_cursor
        self.mock_cursor.description = [('invoice_number',)]
        self.mock_cursor.fetchall.return_value = []

        data = {'po_number': 'PO123', 'status': 'PENDING', 'invoice_number': ['INV123']}
        result = self.model.update_invoice_in_header(data)
        self.assertTrue(result)

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_change_po_status_to_completed(self, mock_database_helper):
        mock_database_helper.get_write_connection.return_value.__enter__.return_value = self.mock_conn_write
        self.mock_conn_write.cursor.return_value = self.mock_cursor

        result = self.model.change_po_status_to_completed('PO123')
        self.assertTrue(result)

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_get_line_item(self, mock_database_helper):
        mock_database_helper.get_read_connection.return_value.__enter__.return_value = self.mock_conn_read
        self.mock_conn_read.cursor.return_value = self.mock_cursor
        self.mock_cursor.description = [('item_number',), ('sales_order',)]
        self.mock_cursor.fetchall.return_value = [('ITEM1', 'SO123')]

        data = {'item_number': 'ITEM1', 'sales_order': 'SO123'}
        result = self.model.get_line_item(data)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['item_number'], 'ITEM1')

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_get_items(self, mock_database_helper):
        mock_database_helper.get_read_connection.return_value.__enter__.return_value = self.mock_conn_read
        self.mock_conn_read.cursor.return_value = self.mock_cursor
        self.mock_cursor.description = [('po_number',), ('status',)]
        self.mock_cursor.fetchall.return_value = [('PO123', 'PENDING')]

        result = self.model.get_items(['PO123'], ['PENDING'], ['Reliance'])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['po_number'], 'PO123')

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_change_status_to_pending(self, mock_database_helper):
        mock_database_helper.get_write_connection.return_value.__enter__.return_value = self.mock_conn_write
        self.mock_conn_write.cursor.return_value = self.mock_cursor

        result = self.model.change_status_to_pending(['Reliance'])
        self.assertTrue(result)

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_change_status_to_success(self, mock_database_helper):
        mock_database_helper.get_write_connection.return_value.__enter__.return_value = self.mock_conn_write
        self.mock_conn_write.cursor.return_value = self.mock_cursor

        result = self.model.change_status_to_success(['PO123'])
        self.assertTrue(result)

    @patch('src.models.invoice_price_check_model.database_helper')
    def test_get_so_items(self, mock_database_helper):
        mock_database_helper.get_read_connection.return_value.__enter__.return_value = self.mock_conn_read
        self.mock_conn_read.cursor.return_value = self.mock_cursor
        self.mock_cursor.description = [('sales_order',), ('item_number',)]
        self.mock_cursor.fetchall.return_value = [('SO123', 'ITEM1')]

        result = self.model.get_so_items(['SO123'])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['sales_order'], 'SO123')


if __name__ == '__main__':
    unittest.main()