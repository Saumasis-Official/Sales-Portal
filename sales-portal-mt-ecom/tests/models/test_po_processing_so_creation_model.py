import unittest
from unittest.mock import patch, MagicMock, PropertyMock
from src.models.po_processing_so_creation_model import PoProcessingSoCreationModel
from src.utils.database_helper import DatabaseHelper
from psycopg2.extras import Json
import pandas as pd
import json
from decimal import Decimal
from src.enums.mt_ecom_status_type import MtEcomStatusType
from src.utils import constants

class TestPoProcessingSoCreationModel(unittest.TestCase):
    def setUp(self):
        # Create a fresh instance for each test
        self.model = PoProcessingSoCreationModel()
        
        # Create a mock for DatabaseHelper with the required methods
        self.db_helper_mock = MagicMock(spec=DatabaseHelper)
        self.db_helper_mock.get_read_connection = MagicMock()
        self.db_helper_mock.get_write_connection = MagicMock()
        
        # Common mock data
        self.insert_data = {
            'type': 'Insert',
            'id': '123',
            'customer_code': 'CUST001',
            'data': [{
                'ItemNumber': '001',
                'ParentSKUCode': 'PSKU001',
                'SystemSKUCode': 'SSKU001',
                'CustomerProductID': 'CP001',
                'MRP': 100.0,
                'CaseLot': 10,
                'TargetQty': 5,
                'BasePrice': 90.0,
                'EAN': 'EAN001',
                'Message': None,
                'ParentSKUDescription': 'Parent Desc',
                'Plant': 'PLANT01',
                'PO_Item_description': 'Item Desc',
                'SalesUnit': 'EA',
                'SiteCode': 'SITE01',
                'SystemSKUDescription': 'System Desc'
            }],
            'status': 'PENDING',
            'unique_id': 'UNIQUE001',
            'delivery_date': '2023-12-31'
        }
        
        self.update_data = {
            'type': 'Update',
            'id': '123',
            'data': {
                'PoItemNumber': '001',
                'Message': 'ORDER_CREATED',
                'Sales_Order_Number': 'SO123',
                'Item_Number': '001',
                'Order_Qty': '5'
            },
            'status': 'COMPLETED',
            'so_number': 'SO123'
        }

    def test_save_or_update_line_item_details_insert_new(self):
        # Setup mock connections and cursors
        mock_read_conn = MagicMock()
        mock_write_conn = MagicMock()
        
        # Mock cursor for read connection
        mock_read_cursor = MagicMock()
        mock_read_cursor.fetchall.return_value = []  # No existing record
        mock_read_conn.cursor.return_value = mock_read_cursor
        
        # Mock cursor for write connection
        mock_write_cursor = MagicMock()
        mock_write_conn.cursor.return_value = mock_write_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_read_connection.return_value.__enter__.return_value = mock_read_conn
        self.db_helper_mock.get_write_connection.return_value.__enter__.return_value = mock_write_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            result = self.model.save_or_update_line_item_details(self.insert_data)
            
            # Assertions
            self.assertTrue(result)
            mock_write_cursor.execute.assert_called()

    def test_save_or_update_line_item_details_insert_existing(self):
        # Setup existing record
        existing_record = {
            'id': 1,
            'psku_code': 'PSKU001',
            'system_sku_code': 'SSKU001',
            'customer_product_id': 'CP001',
            'mrp': 100.0,
            'caselot': 10,
            'target_qty': 5,
            'base_price': 90.0
        }
        
        # Setup mock connections and cursors
        mock_read_conn = MagicMock()
        mock_write_conn = MagicMock()
        
        # Mock cursor for read connection
        mock_read_cursor = MagicMock()
        mock_read_cursor.fetchall.return_value = [(1,)]  # Existing record
        mock_read_conn.cursor.return_value = mock_read_cursor
        
        # Mock cursor for write connection
        mock_write_cursor = MagicMock()
        mock_write_conn.cursor.return_value = mock_write_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_read_connection.return_value.__enter__.return_value = mock_read_conn
        self.db_helper_mock.get_write_connection.return_value.__enter__.return_value = mock_write_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute with same data as existing record
            result = self.model.save_or_update_line_item_details(self.insert_data)
            
            # Assertions
            self.assertTrue(result)
            mock_write_cursor.execute.assert_not_called()

    def test_save_or_update_line_item_details_update(self):
        # Setup mock for existing message
        mock_read_conn = MagicMock()
        mock_write_conn = MagicMock()
        
        # Mock cursor for read connection
        mock_read_cursor = MagicMock()
        mock_read_cursor.fetchall.return_value = [('Existing message',)]  # Existing message
        mock_read_conn.cursor.return_value = mock_read_cursor
        
        # Mock cursor for write connection
        mock_write_cursor = MagicMock()
        mock_write_conn.cursor.return_value = mock_write_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_read_connection.return_value.__enter__.return_value = mock_read_conn
        self.db_helper_mock.get_write_connection.return_value.__enter__.return_value = mock_write_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            result = self.model.save_or_update_line_item_details(self.update_data)
            
            # Assertions
            self.assertTrue(result)
            mock_write_cursor.execute.assert_called()

    def test_so_check(self):
        # Setup mock
        mock_read_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [('file.json', 'SO123', 'UNIQUE001', 123, '2023-12-31')]
        mock_read_conn.cursor.return_value = mock_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_read_connection.return_value.__enter__.return_value = mock_read_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            result = self.model.so_check('PO123')
            
            # Assertions
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]['json_file_name'], 'file.json')

    def test_get_master_data(self):
        # Setup mock
        mock_read_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [('PSKU001', 'SKU001', 'Parent Desc', 'System Desc', 'VEND001', 'CUST001', 'PLANT01')]
        mock_read_conn.cursor.return_value = mock_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_read_connection.return_value.__enter__.return_value = mock_read_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            result = self.model.get_master_data({
                'CustomerProductID': 'CP001',
                'SiteCode': 'SITE01',
                'VendorCode': 'VEND001'
            })
            
            # Assertions
            self.assertEqual(result['psku'], 'PSKU001')
            self.assertEqual(result['sku'], 'SKU001')

    def test_update_failed_message_ean_failed(self):
        # Setup mock
        mock_write_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_write_conn.cursor.return_value = mock_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_write_connection.return_value.__enter__.return_value = mock_write_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            self.model.update_failed_message({
                'type': 'EAN Failed',
                'message': 'EAN validation failed',
                'id': '123',
                'item_number': '001'
            })
            
            # Assertions
            self.assertEqual(mock_cursor.execute.call_count, 2)

    def test_create_logs_with_data(self):
        # Setup mock
        mock_write_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_write_conn.cursor.return_value = mock_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_write_connection.return_value.__enter__.return_value = mock_write_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            result = self.model.create_logs({
                'po_number': 'PO123',
                'log': 'TEST_LOG',
                'status': 'SUCCESS',
                'data': {'key': 'value'}
            })
            
            # Assertions
            self.assertTrue(result)
            mock_cursor.execute.assert_called_once()

    def test_update_header_data(self):
        # Setup mock
        mock_write_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_write_conn.cursor.return_value = mock_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_write_connection.return_value.__enter__.return_value = mock_write_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            result = self.model.update_header_data({
                'so_number': 'SO123',
                'status': 'COMPLETED',
                'so_created_date': '2023-01-01',
                'id': '123'
            })
            
            # Assertions
            self.assertTrue(result)
            mock_cursor.execute.assert_called_once()

    def test_pad_number(self):
        self.assertEqual(self.model.pad_number(1), '00001')
        self.assertEqual(self.model.pad_number(123), '00123')

    def test_get_so_mail_recipients(self):
        # Setup mock
        mock_read_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.side_effect = [
            [('SITE01',)],  # First query for site code
            [('test@example.com',)]  # Second query for email
        ]
        mock_read_conn.cursor.return_value = mock_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_read_connection.return_value.__enter__.return_value = mock_read_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            result = self.model.get_so_mail_recipients('123')
            
            # Assertions
            self.assertEqual(result, 'test@example.com')

    def test_update_so_status(self):
        # Setup mock
        mock_write_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_write_conn.cursor.return_value = mock_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_write_connection.return_value.__enter__.return_value = mock_write_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            result = self.model.update_so_status('PO123')
            
            # Assertions
            self.assertTrue(result)
            mock_cursor.execute.assert_called_once()

    def test_check_site_code(self):
        # Setup mock
        mock_read_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [('CUST001',)]  # Existing site code
        mock_read_conn.cursor.return_value = mock_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_read_connection.return_value.__enter__.return_value = mock_read_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            result = self.model.check_site_code('SITE01')
            
            # Assertions
            self.assertTrue(result)

    def test_check_vendor_code(self):
        # Setup mock
        mock_read_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [('VEND001',)]  # Existing vendor code
        mock_read_conn.cursor.return_value = mock_cursor
        
        # Configure the mock methods
        self.db_helper_mock.get_read_connection.return_value.__enter__.return_value = mock_read_conn
        
        # Patch the database_helper instance
        with patch('src.models.po_processing_so_creation_model.database_helper', self.db_helper_mock):
            # Execute
            result = self.model.check_vendor_code({'VendorCode': 'VEND001'})
            
            # Assertions
            self.assertTrue(result)

if __name__ == '__main__':
    unittest.main()