import unittest
from unittest.mock import patch, MagicMock, ANY
from datetime import datetime
from src.models.mt_ecom_model import MTECOMModel
import json
from unittest.mock import patch, MagicMock
import pandas as pd
from src.enums.success_message import SuccessMessage
from src.enums.error_message import ErrorMessage


class TestMTECOMModel(unittest.TestCase):

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_success(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act
        result = model.save_rdd_data(data)

        # Assert
        self.assertEqual(result, mock_cursor.rowcount)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_called_once()
        mock_logger.info.assert_called_with("Inside MTECOMModel->save_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_exception(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.executemany.side_effect = Exception("Test exception")

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.save_rdd_data(data)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_not_called()
        mock_logger.error.assert_called_with("Exception in save_rdd_data", mock_cursor.executemany.side_effect)

    

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_success(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act
        result = model.save_rdd_data(data)

        # Assert
        self.assertEqual(result, mock_cursor.rowcount)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_called_once()
        mock_logger.info.assert_called_with("Inside MTECOMModel->save_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_exception(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.executemany.side_effect = Exception("Test exception")

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.save_rdd_data(data)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_not_called()
        mock_logger.error.assert_called_with("Exception in save_rdd_data", mock_cursor.executemany.side_effect)

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_success(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        from_date = '2023-01-01'
        to_date = '2023-01-31'
        expected_data = [{'po_number': 'PO123'}]
        mock_cursor.fetchall.return_value = [('PO123',)]
        mock_cursor.description = [('po_number',)]

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.info.assert_called_with("Inside MTECOMModel->get_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_exception(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        from_date = '2023-01-01'
        to_date = '2023-01-31'

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, "Error in get_rdd_data")
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.error.assert_called_with("Exception in get_rdd_data", mock_cursor.execute.side_effect)



    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_success(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act
        result = model.save_rdd_data(data)

        # Assert
        self.assertEqual(result, mock_cursor.rowcount)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_called_once()
        mock_logger.info.assert_called_with("Inside MTECOMModel->save_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_exception(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.executemany.side_effect = Exception("Test exception")

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.save_rdd_data(data)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_not_called()
        mock_logger.error.assert_called_with("Exception in save_rdd_data", mock_cursor.executemany.side_effect)

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_success(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        from_date = '2023-01-01'
        to_date = '2023-01-31'
        expected_data = [{'po_number': 'PO123'}]
        mock_cursor.fetchall.return_value = [('PO123',)]
        mock_cursor.description = [('po_number',)]

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.info.assert_called_with("Inside MTECOMModel->get_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_exception(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        from_date = '2023-01-01'
        to_date = '2023-01-31'

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, "Error in get_rdd_data")
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.error.assert_called_with("Exception in get_rdd_data", mock_cursor.execute.side_effect)

      

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_success(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act
        result = model.save_rdd_data(data)

        # Assert
        self.assertEqual(result, mock_cursor.rowcount)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_called_once()
        mock_logger.info.assert_called_with("Inside MTECOMModel->save_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_exception(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.executemany.side_effect = Exception("Test exception")

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.save_rdd_data(data)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_not_called()
        mock_logger.error.assert_called_with("Exception in save_rdd_data", mock_cursor.executemany.side_effect)

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_success(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        from_date = '2023-01-01'
        to_date = '2023-01-31'
        expected_data = [{'po_number': 'PO123'}]
        mock_cursor.fetchall.return_value = [('PO123',)]
        mock_cursor.description = [('po_number',)]

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.info.assert_called_with("Inside MTECOMModel->get_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_exception(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        from_date = '2023-01-01'
        to_date = '2023-01-31'

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, "Error in get_rdd_data")
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.error.assert_called_with("Exception in get_rdd_data", mock_cursor.execute.side_effect)

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.constants')
    def test_get_mismatch_data_reliance(self, mock_constants, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        mock_constants.RELIANCE = 'Reliance'

        data = [
            {
                'psku': 'PSKU123',
                'sku': 'SKU123',
                'region': 'Region123',
                'customer_name': 'Reliance',
                'article_id': 'Article123',
                'customer_code': 'CustomerCode123',
                'site_code': 'SiteCode123',
                'plant_code': 'PlantCode123',
                'vendor_code': 'VendorCode123',
                'priority': 'Priority123'
            }
        ]

        expected_data = [{'psku': 'PSKU123'}]
        mock_cursor.fetchall.return_value = [('PSKU123',)]
        mock_cursor.description = [('psku',)]

        # Mock the mogrify method to return a formatted string
        mock_cursor.mogrify.side_effect = lambda query, record: f"({', '.join(record)})".encode('utf-8')

        model = MTECOMModel()

        # Act
        result = model.get_mismatch_data(data)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once()
        mock_constants.RELIANCE = 'Reliance'


    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.constants')
    def test_get_mismatch_data_non_reliance(self, mock_constants, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        mock_constants.RELIANCE = 'Reliance'

        data = [
            {
                'psku': 'PSKU123',
                'sku_id': 'SKU123',
                'region': 'Region123',
                'customer_name': 'NonReliance',
                'article_id': 'Article123',
                'customer_code': 'CustomerCode123',
                'site_code': 'SiteCode123',
                'plant_code': 'PlantCode123',
                'vendor_code': 'VendorCode123',
                'priority': 'Priority123'
            }
        ]

        expected_data = [{'psku': 'PSKU123'}]
        mock_cursor.fetchall.return_value = [('PSKU123',)]
        mock_cursor.description = [('psku',)]

        # Mock the mogrify method to return a formatted string
        mock_cursor.mogrify.side_effect = lambda query, record: f"({', '.join(map(str, record))})".encode('utf-8')

        model = MTECOMModel()

        # Act
        result = model.get_mismatch_data(data)

        # Assert
        self.assertEqual(result, [])
        mock_cursor.execute.assert_called_once()
        mock_constants.RELIANCE = 'Reliance'



    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_success(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act
        result = model.save_rdd_data(data)

        # Assert
        self.assertEqual(result, mock_cursor.rowcount)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_called_once()
        mock_logger.info.assert_called_with("Inside MTECOMModel->save_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_exception(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.executemany.side_effect = Exception("Test exception")

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.save_rdd_data(data)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_not_called()
        mock_logger.error.assert_called_with("Exception in save_rdd_data", mock_cursor.executemany.side_effect)

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_success(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        from_date = '2023-01-01'
        to_date = '2023-01-31'
        expected_data = [{'po_number': 'PO123'}]
        mock_cursor.fetchall.return_value = [('PO123',)]
        mock_cursor.description = [('po_number',)]

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.info.assert_called_with("Inside MTECOMModel->get_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_exception(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        from_date = '2023-01-01'
        to_date = '2023-01-31'

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, "Error in get_rdd_data")
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.error.assert_called_with("Exception in get_rdd_data", mock_cursor.execute.side_effect)

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.constants')
    def test_get_mismatch_data_reliance(self, mock_constants, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        mock_constants.RELIANCE = 'Reliance'

        data = [
            {
                'psku': 'PSKU123',
                'sku': 'SKU123',
                'region': 'Region123',
                'customer_name': 'Reliance',
                'article_id': 'Article123',
                'customer_code': 'CustomerCode123',
                'site_code': 'SiteCode123',
                'plant_code': 'PlantCode123',
                'vendor_code': 'VendorCode123',
                'priority': 'Priority123'
            }
        ]

        expected_data = [{'psku': 'PSKU123'}]
        mock_cursor.fetchall.return_value = [('PSKU123',)]
        mock_cursor.description = [('psku',)]

        # Mock the mogrify method to return a formatted string
        mock_cursor.mogrify.side_effect = lambda query, record: f"({', '.join(record)})".encode('utf-8')

        model = MTECOMModel()

        # Act
        result = model.get_mismatch_data(data)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once()
        mock_constants.RELIANCE = 'Reliance'

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.constants')
    def test_get_mismatch_data_non_reliance(self, mock_constants, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        mock_constants.RELIANCE = 'Reliance'

        data = [
            {
                'psku': 'PSKU123',
                'sku_id': 'SKU123',
                'region': 'Region123',
                'customer_name': 'NonReliance',
                'article_id': 'Article123',
                'customer_code': 'CustomerCode123',
                'site_code': 'SiteCode123',
                'plant_code': 'PlantCode123',
                'vendor_code': 'VendorCode123',
                'priority': 'Priority123'
            }
        ]

        expected_data = [{'psku': 'PSKU123'}]
        mock_cursor.fetchall.return_value = [('PSKU123',)]
        mock_cursor.description = [('psku',)]

        # Mock the mogrify method to return a formatted string
        mock_cursor.mogrify.side_effect = lambda query, record: f"({', '.join(map(str, record))})".encode('utf-8')

        model = MTECOMModel()

        # Act
        result = model.get_mismatch_data(data)

        # Assert
        self.assertEqual(result, [])
        mock_cursor.execute.assert_called_once()
        mock_constants.RELIANCE = 'Reliance'

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_retrigger_success(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {'PO NUMBER': 'PO123'}

        model = MTECOMModel()

        # Act
        result = model.retrigger(data)

        # Assert
        self.assertTrue(result)
        mock_cursor.execute.assert_called_once_with(
            "Update mt_ecom_header_table set so_flag = False where po_number = 'PO123' "
        )

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_retrigger_exception(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = {'PO NUMBER': 'PO123'}

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.retrigger(data)
        mock_cursor.execute.assert_called_once_with(
            "Update mt_ecom_header_table set so_flag = False where po_number = 'PO123' "
        )

      

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_success(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act
        result = model.save_rdd_data(data)

        # Assert
        self.assertEqual(result, mock_cursor.rowcount)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_called_once()
        mock_logger.info.assert_called_with("Inside MTECOMModel->save_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_exception(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.executemany.side_effect = Exception("Test exception")

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.save_rdd_data(data)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_not_called()
        mock_logger.error.assert_called_with("Exception in save_rdd_data", mock_cursor.executemany.side_effect)

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_success(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        from_date = '2023-01-01'
        to_date = '2023-01-31'
        expected_data = [{'po_number': 'PO123'}]
        mock_cursor.fetchall.return_value = [('PO123',)]
        mock_cursor.description = [('po_number',)]

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.info.assert_called_with("Inside MTECOMModel->get_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_exception(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        from_date = '2023-01-01'
        to_date = '2023-01-31'

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, "Error in get_rdd_data")
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.error.assert_called_with("Exception in get_rdd_data", mock_cursor.execute.side_effect)

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.constants')
    def test_get_mismatch_data_reliance(self, mock_constants, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        mock_constants.RELIANCE = 'Reliance'

        data = [
            {
                'psku': 'PSKU123',
                'sku': 'SKU123',
                'region': 'Region123',
                'customer_name': 'Reliance',
                'article_id': 'Article123',
                'customer_code': 'CustomerCode123',
                'site_code': 'SiteCode123',
                'plant_code': 'PlantCode123',
                'vendor_code': 'VendorCode123',
                'priority': 'Priority123'
            }
        ]

        expected_data = [{'psku': 'PSKU123'}]
        mock_cursor.fetchall.return_value = [('PSKU123',)]
        mock_cursor.description = [('psku',)]

        # Mock the mogrify method to return a formatted string
        mock_cursor.mogrify.side_effect = lambda query, record: f"({', '.join(record)})".encode('utf-8')

        model = MTECOMModel()

        # Act
        result = model.get_mismatch_data(data)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once()
        mock_constants.RELIANCE = 'Reliance'

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.constants')
    def test_get_mismatch_data_non_reliance(self, mock_constants, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        mock_constants.RELIANCE = 'Reliance'

        data = [
            {
                'psku': 'PSKU123',
                'sku_id': 'SKU123',
                'region': 'Region123',
                'customer_name': 'NonReliance',
                'article_id': 'Article123',
                'customer_code': 'CustomerCode123',
                'site_code': 'SiteCode123',
                'plant_code': 'PlantCode123',
                'vendor_code': 'VendorCode123',
                'priority': 'Priority123'
            }
        ]

        expected_data = [{'psku': 'PSKU123'}]
        mock_cursor.fetchall.return_value = [('PSKU123',)]
        mock_cursor.description = [('psku',)]

        # Mock the mogrify method to return a formatted string
        mock_cursor.mogrify.side_effect = lambda query, record: f"({', '.join(map(str, record))})".encode('utf-8')

        model = MTECOMModel()

        # Act
        result = model.get_mismatch_data(data)

        # Assert
        self.assertEqual(result, [])
        mock_cursor.execute.assert_called_once()
        mock_constants.RELIANCE = 'Reliance'

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_retrigger_success(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {'PO NUMBER': 'PO123'}

        model = MTECOMModel()

        # Act
        result = model.retrigger(data)

        # Assert
        self.assertTrue(result)
        mock_cursor.execute.assert_called_once_with(
            "Update mt_ecom_header_table set so_flag = False where po_number = 'PO123' "
        )

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_retrigger_exception(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = {'PO NUMBER': 'PO123'}

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.retrigger(data)
        mock_cursor.execute.assert_called_once_with(
            "Update mt_ecom_header_table set so_flag = False where po_number = 'PO123' "
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_app_level_settings_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        type = 'some_key'
        expected_data = [{'key': 'some_key', 'value': 'YES'}]
        mock_cursor.fetchall.return_value = [('some_key', 'YES')]
        mock_cursor.description = [('key',), ('value',)]

        model = MTECOMModel()

        # Act
        result = model.get_app_level_settings(type)

        # Assert
        self.assertTrue(result)
        mock_cursor.execute.assert_called_once_with(
            "SELECT * FROM public.app_level_settings where key = 'some_key' "
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_app_level_settings_no_value(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        type = 'some_key'
        expected_data = [{'key': 'some_key', 'value': ''}]
        mock_cursor.fetchall.return_value = [('some_key', '')]
        mock_cursor.description = [('key',), ('value',)]

        model = MTECOMModel()

        # Act
        result = model.get_app_level_settings(type)

        # Assert
        self.assertFalse(result)
        mock_cursor.execute.assert_called_once_with(
            "SELECT * FROM public.app_level_settings where key = 'some_key' "
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_app_level_settings_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        type = 'some_key'

        model = MTECOMModel()

        # Act
        result = model.get_app_level_settings(type)

        # Assert
        self.assertFalse(result)
        mock_cursor.execute.assert_called_once_with(
            "SELECT * FROM public.app_level_settings where key = 'some_key' "
        )



    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_getKamsData_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        data = {
            'search': {
                'kamsName': 'John',
                'customerCode': 'C123',
                'email': 'john@example.com'
            },
            'limit': 10,
            'offset': 0
        }
        encoded_data = json.dumps(data).encode('utf-8')

        expected_kams_data = [{'user_id': '1', 'customer_code': 'C123', 'first_name': 'John', 'email': 'john@example.com', 'last_name': 'Doe', 'is_disabled': True}]
        mock_cursor.fetchall.return_value = [('1', 'C123', 'John', 'john@example.com', 'Doe', True)]
        mock_cursor.description = [('user_id',), ('customer_code',), ('first_name',), ('email',), ('last_name',), ('is_disabled',)]
        mock_cursor.fetchone.return_value = (1,)

        model = MTECOMModel()

        # Act
        result = model.getKamsData(encoded_data)

        # Assert
        self.assertEqual(result, {"kams_data": expected_kams_data, "count": 1})
        mock_cursor.execute.assert_called()
    
    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_getKamsData_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
    
        expected_kams_data = [{
            'customer_code': 'C123',
            'email': 'john@example.com',
            'first_name': 'John',
            'is_disabled': True,
            'last_name': 'Doe',
            'user_id': '1'
        }]
        mock_cursor.fetchall.side_effect = [
            [('C123', 'john@example.com', 'John', 'Doe', '1', True)],  # kams_data
            [('1',)]  # customer_groups
        ]
        mock_cursor.fetchone.return_value = (1,)  # count
        mock_cursor.description = [
            ('customer_code',), ('email',), ('first_name',), ('last_name',), ('user_id',), ('is_disabled',)
        ]
    
        data = {
            'search': {
                'kamsName': 'John',
                'customerCode': 'C123',
                'email': 'john@example.com'
            },
            'limit': 10,
            'offset': 0
        }
        encoded_data = json.dumps(data).encode('utf-8')
    
        model = MTECOMModel()
    
        # Act
        result = model.getKamsData(encoded_data)
    
        # Assert
        self.assertEqual(result, {"kams_data": expected_kams_data, "customer_groups": ['1'], "count": 1})
        mock_cursor.execute.assert_called()
    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_exclusion_customer_codes_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        expected_exclusion_codes = [{'customer_code': 'C123'}]
        mock_cursor.fetchall.return_value = [('C123',)]
        mock_cursor.description = [('customer_code',)]

        model = MTECOMModel()

        # Act
        result = model.get_exclusion_customer_codes()

        # Assert
        self.assertEqual(result, expected_exclusion_codes)
        mock_cursor.execute.assert_called_once_with('''SELECT customer_code FROM public.mt_ecom_exclusion_customer_codes''')

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_exclusion_customer_codes_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        model = MTECOMModel()

        # Act
        result = model.get_exclusion_customer_codes()

        # Assert
        self.assertFalse(result)
        mock_cursor.execute.assert_called_once_with('''SELECT customer_code FROM public.mt_ecom_exclusion_customer_codes''')


    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_success(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act
        result = model.save_rdd_data(data)

        # Assert
        self.assertEqual(result, mock_cursor.rowcount)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_called_once()
        mock_logger.info.assert_called_with("Inside MTECOMModel->save_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_save_rdd_data_exception(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.executemany.side_effect = Exception("Test exception")

        data = {
            'NAVITEM': [
                {
                    'ItemNumber': '123',
                    'SystemSKUCode': 'SKU123',
                    'NAVSCHLINES': [
                        {
                            'DeliveryDate': '20230101',
                            'ScheduleLineNumber': '1',
                            'OrderQuantity': '10'
                        }
                    ],
                    'TargetQty': '10'
                }
            ],
            'PoNumber': 'PO123',
            'Sales_Order_Number': 'SO123',
            'PoDateTo': '01.01.2023',
            'SoldTo': 'Customer123'
        }

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.save_rdd_data(data)
        mock_cursor.executemany.assert_called_once()
        mock_conn_write.commit.assert_not_called()
        mock_logger.error.assert_called_with("Exception in save_rdd_data", mock_cursor.executemany.side_effect)

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_success(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        from_date = '2023-01-01'
        to_date = '2023-01-31'
        expected_data = [{'po_number': 'PO123'}]
        mock_cursor.fetchall.return_value = [('PO123',)]
        mock_cursor.description = [('po_number',)]

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.info.assert_called_with("Inside MTECOMModel->get_rdd_data")

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_get_rdd_data_exception(self, mock_logger, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        from_date = '2023-01-01'
        to_date = '2023-01-31'

        model = MTECOMModel()

        # Act
        result = model.get_rdd_data(from_date, to_date)

        # Assert
        self.assertEqual(result, "Error in get_rdd_data")
        mock_cursor.execute.assert_called_once_with(
            '''SELECT DISTINCT(po_number) FROM mt_ecom_rdd WHERE rdd >= %s and rdd<= %s ''',
            (from_date, to_date + " 23:59:59")
        )
        mock_logger.error.assert_called_with("Exception in get_rdd_data", mock_cursor.execute.side_effect)

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_sync_logs_insert_success(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {
            'type': 'MT ECOM SO Sync',
            'run_at': '2023-01-01 00:00:00',
            'status': 'SUCCESS'
        }
        flag = True
        user_id = 'user123'

        model = MTECOMModel()

        # Act
        result = model.sync_logs(data, flag, user_id)

        # Assert
        self.assertTrue(result)
        mock_cursor.execute.assert_called_once_with(
            '''INSERT INTO sync_logs (type,run_at,result,user_id) VALUES (%s,%s,%s,%s)''',
            (data.get('type',''), data.get('run_at',''), data.get('status',''), user_id)
        )
        mock_conn_write.commit.assert_called_once()

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_sync_logs_select_success(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {
            'type': 'MT ECOM SO Sync',
            'run_at': '2023-01-01 00:00:00',
            'status': 'SUCCESS'
        }
        flag = False
        user_id = 'user123'

        expected_data = [{'run_at': '2023-01-01 00:00:00', 'diff': 3600}]
        mock_cursor.fetchall.return_value = [('2023-01-01 00:00:00', 3600)]
        mock_cursor.description = [('run_at',), ('diff',)]

        model = MTECOMModel()

        # Act
        result = model.sync_logs(data, flag, user_id)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            f" SELECT run_at, EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - run_at)) AS diff FROM sync_logs WHERE type='MT ECOM SO Sync' AND result='SUCCESS' AND user_id = '{user_id}' order by created_on desc limit 1"
        )

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_sync_logs_exception(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = {
            'type': 'MT ECOM SO Sync',
            'run_at': '2023-01-01 00:00:00',
            'status': 'SUCCESS'
        }
        flag = True
        user_id = 'user123'

        model = MTECOMModel()

        # Act
        result = model.sync_logs(data, flag, user_id)

        # Assert
        self.assertFalse(result)
        mock_cursor.execute.assert_called_once_with(
            '''INSERT INTO sync_logs (type,run_at,result,user_id) VALUES (%s,%s,%s,%s)''',
            (data.get('type',''), data.get('run_at',''), data.get('status',''), user_id)
        )
        mock_conn_write.rollback.assert_called_once()


    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_mt_ecom_customer_workflow_by_customer_name(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        data = {'customer_name': 'Customer123'}
        expected_data = [{'customer': 'Customer123', 'is_disabled': True}]
        mock_cursor.fetchall.return_value = [('Customer123', True)]
        mock_cursor.description = [('customer',), ('is_disabled',)]

        model = MTECOMModel()

        # Act
        result = model.get_mt_ecom_customer_workflow(data)

        # Assert
        self.assertEqual(result, {"customerData": expected_data})
        mock_cursor.execute.assert_called_once_with(
            """ Select *,true as is_disabled from mt_ecom_workflow_type where customer = %s""",
            (data.get("customer_name"),)
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_mt_ecom_customer_workflow_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = {'customer_name': 'Customer123'}

        model = MTECOMModel()

        # Act
        result = model.get_mt_ecom_customer_workflow(data)

        # Assert
        self.assertIsNone(result)
        mock_cursor.execute.assert_called_once_with(
            """ Select *,true as is_disabled from mt_ecom_workflow_type where customer = %s""",
            (data.get("customer_name"),)
        )


    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_mt_ecom_customer_workflow_list_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = {'limit': 10, 'offset': 0}

        model = MTECOMModel()

        # Act
        result = model.get_mt_ecom_customer_workflow_list(data)

        # Assert
        self.assertIsNone(result)
        self.assertEqual(mock_cursor.execute.call_count, 1)



    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_mt_ecom_rdd_item_list_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        data = {
            'po_number': 'PO123',
            'limit': 10,
            'offset': 0
        }
        expected_rdd_data = [{'po_number': 'PO123', 'item': 'item1'}]
        expected_count = [{'count': 1}]
        mock_cursor.fetchall.side_effect = [
            [('PO123', 'item1')],
            [(1,)]
        ]
        mock_cursor.description = [('po_number',), ('item',)]

        model = MTECOMModel()

        # Act
        result = model.get_mt_ecom_rdd_item_list(data)

        # Assert
        self.assertEqual(result, {"rddList": expected_rdd_data, "count": 1})
        mock_cursor.execute.assert_any_call(
            '''SELECT * FROM mt_ecom_rdd WHERE po_number = %s LIMIT %s OFFSET %s''',
            (data.get('po_number'), data.get('limit'), data.get('offset'))
        )
        mock_cursor.execute.assert_any_call(
            '''SELECT COUNT(*) FROM mt_ecom_rdd WHERE po_number = %s''',
            (data.get('po_number'),)
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_mt_ecom_rdd_item_list_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = {
            'po_number': 'PO123',
            'limit': 10,
            'offset': 0
        }

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.get_mt_ecom_rdd_item_list(data)
        mock_cursor.execute.assert_called_with(
            '''SELECT * FROM mt_ecom_rdd WHERE po_number = %s LIMIT %s OFFSET %s''',
            (data.get('po_number'), data.get('limit'), data.get('offset'))
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_ror_data_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        so = 'SO123'
        item_number = 'ITEM123'
        expected_message = 'Test message'
        mock_cursor.fetchall.return_value = [('Test message',)]
        mock_cursor.description = [('message',)]

        model = MTECOMModel()

        # Act
        result = model.get_ror_data(so, item_number)

        # Assert
        self.assertEqual(result, expected_message)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT message FROM mt_ecom_item_table where sales_order = %s and response_item_number = '%s' ''',
            [so, item_number]
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_ror_data_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        so = 'SO123'
        item_number = 'ITEM123'

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.get_ror_data(so, item_number)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT message FROM mt_ecom_item_table where sales_order = %s and response_item_number = '%s' ''',
            [so, item_number]
        )


    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_material_data_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        so = 'SO123'
        item_number = 'ITEM123'
        expected_data = [{
            'psku_code': 'PSKU123',
            'customer_product_id': 'CPID123',
            'system_sku_description': 'Description',
            'item_number': 'ITEM123',
            'system_sku_code': 'SKU123',
            'pak_to_cs': '10'
        }]
        mock_cursor.fetchall.return_value = [
            ('PSKU123', 'CPID123', 'Description', 'ITEM123', 'SKU123', '10')
        ]
        mock_cursor.description = [
            ('psku_code',), ('customer_product_id',), ('system_sku_description',),
            ('item_number',), ('system_sku_code',), ('pak_to_cs',)
        ]

        model = MTECOMModel()

        # Act
        result = model.get_material_data(so, item_number)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT 
                    psku_code,
                    customer_product_id,
                    system_sku_description,
                    item_number,
                    system_sku_code,
                    mc.pak_to_cs  
                FROM 
                    mt_ecom_item_table mt
                LEFT JOIN 
                    material_master mc ON mc.code = mt.psku_code::varchar 
                WHERE 
                    mt.sales_order = %s AND mt.response_item_number = '%s' ''',
            [so, item_number]
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_material_data_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        so = 'SO123'
        item_number = 'ITEM123'

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.get_material_data(so, item_number)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT 
                    psku_code,
                    customer_product_id,
                    system_sku_description,
                    item_number,
                    system_sku_code,
                    mc.pak_to_cs  
                FROM 
                    mt_ecom_item_table mt
                LEFT JOIN 
                    material_master mc ON mc.code = mt.psku_code::varchar 
                WHERE 
                    mt.sales_order = %s AND mt.response_item_number = '%s' ''',
            [so, item_number]
        )


    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_po_numbers_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        data = ['SO123', 'SO456']
        expected_data = [{'po_number': 'PO123'}, {'po_number': 'PO456'}]
        mock_cursor.fetchall.return_value = [('PO123',), ('PO456',)]
        mock_cursor.description = [('po_number',)]

        model = MTECOMModel()

        # Act
        result = model.get_po_numbers(data)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT po_number FROM mt_ecom_header_table where so_number in %s ''',
            (tuple(data),)
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_po_numbers_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = ['SO123', 'SO456']

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.get_po_numbers(data)
        mock_cursor.execute.assert_called_once_with(
            '''SELECT po_number FROM mt_ecom_header_table where so_number in %s ''',
            (tuple(data),)
        )



    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_add_update_customer_update_success(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = json.dumps({
            'id': 1,
            'customer_type': 'Type1',
            'customer_name': 'Customer1',
            'customer_code': 'Code1'
        })

        model = MTECOMModel()

        # Act
        result = model.add_update_customer(data)

        # Assert
        self.assertEqual(result, {'message': 'Customer Updated Successfully'})
        mock_cursor.execute.assert_called_once_with(
            '''UPDATE mt_ecom_customer_type SET customer_type = %s, customer_name = %s, customer_code = %s, updated_on = %s WHERE id = %s''',
            ('Type1', 'Customer1', 'Code1', ANY, 1)
        )
        mock_conn_write.commit.assert_called_once()

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_add_update_customer_insert_success(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = json.dumps({
            'customerType': 'Type1',
            'customer_name': 'Customer1',
            'customer_code': 'Code1'
        })

        model = MTECOMModel()

        # Act
        result = model.add_update_customer(data)

        # Assert
        self.assertEqual(result, {'message': 'Customer Added Successfully'})
        mock_cursor.execute.assert_called_once_with(
            '''INSERT INTO mt_ecom_customer_type (customer_type,customer_name,customer_code,created_on) VALUES (%s,%s,%s,%s)''',
            ('Type1', 'Customer1', 'Code1', ANY)
        )
        mock_conn_write.commit.assert_called_once()

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_add_update_customer_exception(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = json.dumps({
            'customerType': 'Type1',
            'customer_name': 'Customer1',
            'customer_code': 'Code1'
        })

        model = MTECOMModel()

        # Act
        result = model.add_update_customer(data)

        # Assert
        self.assertFalse(result)
        mock_cursor.execute.assert_called_once()
        mock_conn_write.commit.assert_not_called()


    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_mt_ecom_customer_list_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        data = json.dumps({
            'search': {
                'customerCode': 'C123',
                'customerName': 'CustomerName'
            },
            'limit': 10,
            'offset': 0
        })

        expected_customer_data = [{'customer_code': 'C123', 'customer_name': 'CustomerName', 'is_disabled': True}]
        expected_count = [{'count': 1}]
        mock_cursor.fetchall.side_effect = [
            [('C123', 'CustomerName', True)],
            [(1,)]
        ]
        mock_cursor.description = [('customer_code',), ('customer_name',), ('is_disabled',)]

        model = MTECOMModel()

        # Act
        result = model.get_mt_ecom_customer_list(data)

        # Assert
        self.assertEqual(result, {"customerList": expected_customer_data, "count": 1})
        mock_cursor.execute.assert_any_call(
            '''SELECT * ,true as is_disabled FROM mt_ecom_customer_type where (customer_code ilike '%C123%' and customer_name ilike '%CustomerName%') limit 10 offset 0'''
        )
        mock_cursor.execute.assert_any_call(
            '''select count(*) from mt_ecom_customer_type where (customer_code ilike '%C123%' and customer_name ilike '%CustomerName%') '''
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_mt_ecom_customer_list_no_search(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        data = json.dumps({
            'limit': 10,
            'offset': 0
        })

        expected_customer_data = [{'customer_code': 'C123', 'customer_name': 'CustomerName', 'is_disabled': True}]
        expected_count = [{'count': 1}]
        mock_cursor.fetchall.side_effect = [
            [('C123', 'CustomerName', True)],
            [(1,)]
        ]
        mock_cursor.description = [('customer_code',), ('customer_name',), ('is_disabled',)]

        model = MTECOMModel()

        # Act
        result = model.get_mt_ecom_customer_list(data)

        # Assert
        self.assertEqual(result, {"customerList": expected_customer_data, "count": 1})
        mock_cursor.execute.assert_any_call(
            '''SELECT * ,true as is_disabled FROM mt_ecom_customer_type limit 10 offset 0'''
        )
        mock_cursor.execute.assert_any_call(
            '''select count(*) from mt_ecom_customer_type '''
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_mt_ecom_customer_list_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = json.dumps({
            'search': {
                'customerCode': 'C123',
                'customerName': 'CustomerName'
            },
            'limit': 10,
            'offset': 0
        })

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.get_mt_ecom_customer_list(data)
        mock_cursor.execute.assert_called()


    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_mt_ecom_rdd_list_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = {
            'rdd': '2023-01-01',
            'user_id': 'user123',
            'customer_code': 'C123'
        }

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.get_mt_ecom_rdd_list(data)
        mock_cursor.execute.assert_called()



    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_so_mail_receipients_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        id = 1
        expected_email = 'test@example.com'
        mock_cursor.fetchall.side_effect = [
            [('site_code_1',)],
            [(expected_email,)]
        ]
        mock_cursor.description = [('site_code',), ('email',)]

        model = MTECOMModel()

        # Act
        result = model.get_so_mail_receipients(id)

        # Assert
        self.assertEqual(result, expected_email)
        mock_cursor.execute.assert_any_call(
            ''' Select site_code from mt_ecom_header_table where id = %s ''',
            (id,)
        )
        mock_cursor.execute.assert_any_call(
            ''' Select email from mt_ecom_mail_recipients where site_code = %s and type = 'Success' ''',
            ('site_code_1',)
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_so_mail_receipients_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        id = 1

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.get_so_mail_receipients(id)
        mock_cursor.execute.assert_called()

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_customer_list_with_site_code(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        site_code = 'site_code_1'
        expected_result = {'customer_code': 'C123', 'plant_code': 'P123'}
        mock_cursor.fetchall.return_value = [('C123', 'P123')]
        mock_cursor.description = [('customer_code',), ('plant_code',)]

        model = MTECOMModel()

        # Act
        result = model.get_customer_list(site_code)

        # Assert
        self.assertEqual(result, expected_result)
        mock_cursor.execute.assert_called_once_with(
            ''' Select customer_code,plant_code from mdm_material_data where site_code = %s''',
            (site_code,)
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_customer_list_without_site_code(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        expected_customer = 'Reliance'
        mock_cursor.fetchall.return_value = [(expected_customer,)]
        mock_cursor.description = [('customer',)]

        model = MTECOMModel()

        # Act
        result = model.get_customer_list()

        # Assert
        self.assertEqual(result, expected_customer)
        mock_cursor.execute.assert_called_once_with(
            "Select distinct customer from mt_ecom_header_table where customer = 'Reliance' "
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_customer_list_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.get_customer_list()
        mock_cursor.execute.assert_called()

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_header_data_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        from_date = '2023-01-01'
        to_date = '2023-01-31'
        expected_data = [{'po_number': 'PO123'}]
        mock_cursor.fetchall.return_value = [('PO123',)]
        mock_cursor.description = [('po_number',)]

        model = MTECOMModel()

        # Act
        result = model.get_header_data(from_date, to_date)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            ''' Select * from mt_ecom_header_table where po_created_date between %s and %s and customer in  %s ''',
            (from_date, to_date, ('Reliance', 'Grofers', 'ARIPL', 'BigBasket', 'Swiggy', 'Zepto'))
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_header_data_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        from_date = '2023-01-01'
        to_date = '2023-01-31'

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.get_header_data(from_date, to_date)
        mock_cursor.execute.assert_called()

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_item_data_success(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor

        id = 1
        expected_data = [{'item_number': 'ITEM123'}]
        mock_cursor.fetchall.return_value = [('ITEM123',)]
        mock_cursor.description = [('item_number',)]

        model = MTECOMModel()

        # Act
        result = model.get_item_data(id)

        # Assert
        self.assertEqual(result, expected_data)
        mock_cursor.execute.assert_called_once_with(
            ''' Select * from mt_ecom_item_table where po_id = %s ''',
            (id,)
        )

    @patch('src.models.mt_ecom_model.database_helper.get_read_connection')
    def test_get_item_data_exception(self, mock_get_read_connection):
        # Arrange
        mock_conn_read = MagicMock()
        mock_cursor = MagicMock()
        mock_get_read_connection.return_value.__enter__.return_value = mock_conn_read
        mock_conn_read.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        id = 1

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.get_item_data(id)
        mock_cursor.execute.assert_called()
    
    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    def test_upload_data_exception(self, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = [
            {
                "psku": "PSKU123",
                "sku": "SKU123",
                "region": "Region123",
                "customer_name": "Customer123",
                "article_id": "Article123",
                "customer_code": "CustomerCode123",
                "site_code": "SiteCode123",
                "plant_code": "PlantCode123",
                "vendor_code": "VendorCode123",
                "priority": "Priority123"
            }
        ]
        user_id = 'user123'

        model = MTECOMModel()

        # Act & Assert
        with self.assertRaises(Exception):
            model.upload_data(data, user_id)
        mock_cursor.execute.assert_called()
        mock_conn_write.rollback.assert_called()

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_delete_kams_data_exception(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")
    
        data = [{
            'user_id': 'test_user',
            'payer_code': '0000171015',
            'updated_by': 'admin'
        }]
    
        model = MTECOMModel()
    
        # Act
        result = model.delete_kams_data(data)
    
        # Assert
        self.assertEqual(result, {'message': ErrorMessage.KAMS_NKAMS_DELETE_ERROR.value})
        mock_cursor.execute.assert_called()
        mock_logger.error.assert_called_with("Exception in delete_kams_data: %s", "Test exception")

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_edit_kams_data_success(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor

        data = {
            'user_id': 'test_user',
            'payer_code': '0000171015',
            'credit_limit': True,
            'updated_by': 'admin'
        }

        model = MTECOMModel()

        # Act
        result = model.edit_kams_data(data)

        # Assert
        self.assertEqual(result, {'message': SuccessMessage.KAMS_NKAMS_EDIT_SUCCESS.value})
        mock_cursor.execute.assert_called()
        mock_conn_write.commit.assert_called()
        mock_logger.info.assert_called_with("Inside MTECOMModel->edit_kams_data")

    @patch('src.models.mt_ecom_model.database_helper.get_write_connection')
    @patch('src.models.mt_ecom_model.logger')
    def test_edit_kams_data_exception(self, mock_logger, mock_get_write_connection):
        # Arrange
        mock_conn_write = MagicMock()
        mock_cursor = MagicMock()
        mock_get_write_connection.return_value.__enter__.return_value = mock_conn_write
        mock_conn_write.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("Test exception")

        data = {
            'user_id': 'test_user',
            'payer_code': '0000171015',
            'credit_limit': True,
            'updated_by': 'admin'
        }

        model = MTECOMModel()

        # Act
        result = model.edit_kams_data(data)

        # Assert
        self.assertEqual(result, {'message': ErrorMessage.KAMS_NKAMS_EDIT_ERROR.value})
        mock_cursor.execute.assert_called()
        mock_logger.error.assert_called_with("Exception in edit_kams_data", mock_cursor.execute.side_effect)

if __name__ == '__main__':
    unittest.main()