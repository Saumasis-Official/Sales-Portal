import unittest
from unittest.mock import patch, MagicMock
from src.models.data_persist_model import PersistModel
from src.models.dto.upsert_po_key_interface import UpsertPoKey
from src.exceptions.data_persisting_exception import DataPersistingException
from src.models.dto.po_dto import PoDTO, PoItemsDTO
from datetime import datetime
from src.enums.mt_ecom_status_type import MtEcomStatusType

class TestPersistModel(unittest.TestCase):

    @patch('src.models.data_persist_model.DatabaseHelper')
    def setUp(self, MockDatabaseHelper):
        self.persist_model = PersistModel()
        self.mock_db_helper = MockDatabaseHelper.return_value

    @patch('src.models.data_persist_model.json')
    @patch('src.models.data_persist_model.pd')
    def test_upsert_po_key_success(self, mock_pd, mock_json):
        mock_data = [UpsertPoKey(
            unique_id="1",
            po_number="PO123",
            status="SO Pending",
            po_created_date="2023-01-01",
            customer="Reliance",
            customer_code="CUST123",
            site_code="SITE123",
            delivery_date="2023-02-01",
            json_file_name="file.json"  # Include json_file_name
        )]
        mock_json.dumps.return_value = '{"unique_id": "1", "po_number": "PO123"}'
        mock_cursor = MagicMock()
        mock_cursor.description = [('id',)]
        mock_cursor.fetchall.return_value = [(1,)]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"id": 1}]
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.upsert_po_key(mock_data)
        self.assertEqual(result, 1)

    @patch('src.models.data_persist_model.json')
    @patch('src.models.data_persist_model.pd')
    def test_upsert_po_key_exception(self, mock_pd, mock_json):
        mock_data = [UpsertPoKey(
            unique_id="1",
            po_number="PO123",
            status="SO Pending",
            po_created_date="2023-01-01",
            customer="Reliance",
            customer_code="CUST123",
            site_code="SITE123",
            delivery_date="2023-02-01",
             json_file_name="file.json"
        )]
        mock_json.dumps.return_value = '{"unique_id": "1", "po_number": "PO123"}'
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.upsert_po_key(mock_data)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_po_key_success(self, mock_pd):
        po_number = "PO123"
        mock_cursor = MagicMock()
        mock_cursor.description = [('xml_file_name',), ('json_file_name',), ('customer',), ('id',)]
        mock_cursor.fetchall.return_value = [("xml_file.xml", "json_file.json", "Reliance", 1)]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"xml_file_name": "xml_file.xml", "json_file_name": "json_file.json", "customer": "Reliance", "id": 1}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_po_key(po_number)
        self.assertEqual(result, {"xml_file_name": "xml_file.xml", "json_file_name": "json_file.json", "customer": "Reliance", "id": 1})

    @patch('src.models.data_persist_model.pd')
    def test_fetch_po_key_exception(self, mock_pd):
        po_number = "PO123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_po_key(po_number)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_workflow_configurations_success(self, mock_pd):
        customer = "Reliance"
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [(
            "po_format", "article", "mrp_1", "mrp_2", "caselot", "base_price", "invoice", "asn", "acknowledgement"
        )]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{
            "po_format": "po_format",
            "article": "article",
            "mrp_1": "mrp_1",
            "mrp_2": "mrp_2",
            "caselot": "caselot",
            "base_price": "base_price",
            "invoice": "invoice",
            "asn": "asn",
            "acknowledgement": "acknowledgement"
        }]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_workflow_configurations(customer)
        self.assertEqual(result, {
            "po_format": "po_format",
            "article": "article",
            "mrp_1": "mrp_1",
            "mrp_2": "mrp_2",
            "caselot": "caselot",
            "base_price": "base_price",
            "invoice": "invoice",
            "asn": "asn",
            "acknowledgement": "acknowledgement"
        })

    @patch('src.models.data_persist_model.pd')
    def test_fetch_workflow_configurations_exception(self, mock_pd):
        customer = "Reliance"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_workflow_configurations(customer)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_article_details_success(self, mock_pd):
        order_items = [MagicMock()]
        site_code = "SITE123"
        vendor_code = "VENDOR123"
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [(
            "article_id", "psku", "psku_desc", "sku", "sku_desc", "plant_code"
        )]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{
            "article_id": "article_id",
            "psku": "psku",
            "psku_desc": "psku_desc",
            "sku": "sku",
            "sku_desc": "sku_desc",
            "plant_code": "plant_code"
        }]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_article_details(order_items, site_code, vendor_code)
        self.assertEqual(result, {
            "article_id": {
                "article_id": "article_id",
                "psku": "psku",
                "psku_desc": "psku_desc",
                "sku": "sku",
                "sku_desc": "sku_desc",
                "plant_code": "plant_code"
            }
        })

    @patch('src.models.data_persist_model.pd')
    def test_fetch_article_details_exception(self, mock_pd):
        order_items = [MagicMock()]
        site_code = "SITE123"
        vendor_code = "VENDOR123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_article_details(order_items, site_code, vendor_code)

    @patch('src.models.data_persist_model.json')
    @patch('src.models.data_persist_model.pd')
    def test_upsert_po_key_success(self, mock_pd, mock_json):
        mock_data = [UpsertPoKey(
            unique_id="1",
            po_number="PO123",
            status="SO Pending",
            po_created_date="2023-01-01",
            customer="Reliance",
            customer_code="CUST123",
            site_code="SITE123",
            delivery_date="2023-02-01",
            json_file_name="file.json"  # Include json_file_name
        )]
        mock_json.dumps.return_value = '{"unique_id": "1", "po_number": "PO123"}'
        mock_cursor = MagicMock()
        mock_cursor.description = [('id',)]
        mock_cursor.fetchall.return_value = [(1,)]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"id": 1}]
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.upsert_po_key(mock_data)
        self.assertEqual(result, 1)

    @patch('src.models.data_persist_model.json')
    @patch('src.models.data_persist_model.pd')
    def test_upsert_po_key_exception(self, mock_pd, mock_json):
        mock_data = [UpsertPoKey(
            unique_id="1",
            po_number="PO123",
            status="SO Pending",
            po_created_date="2023-01-01",
            customer="Reliance",
            customer_code="CUST123",
            site_code="SITE123",
            delivery_date="2023-02-01",
                json_file_name="file.json"
        )]
        mock_json.dumps.return_value = '{"unique_id": "1", "po_number": "PO123"}'
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.upsert_po_key(mock_data)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_po_key_success(self, mock_pd):
        po_number = "PO123"
        mock_cursor = MagicMock()
        mock_cursor.description = [('xml_file_name',), ('json_file_name',), ('customer',), ('id',)]
        mock_cursor.fetchall.return_value = [("xml_file.xml", "json_file.json", "Reliance", 1)]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"xml_file_name": "xml_file.xml", "json_file_name": "json_file.json", "customer": "Reliance", "id": 1}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_po_key(po_number)
        self.assertEqual(result, {"xml_file_name": "xml_file.xml", "json_file_name": "json_file.json", "customer": "Reliance", "id": 1})

    @patch('src.models.data_persist_model.pd')
    def test_fetch_po_key_exception(self, mock_pd):
        po_number = "PO123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_po_key(po_number)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_workflow_configurations_success(self, mock_pd):
        customer = "Reliance"
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [(
            "po_format", "article", "mrp_1", "mrp_2", "caselot", "base_price", "invoice", "asn", "acknowledgement"
        )]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{
            "po_format": "po_format",
            "article": "article",
            "mrp_1": "mrp_1",
            "mrp_2": "mrp_2",
            "caselot": "caselot",
            "base_price": "base_price",
            "invoice": "invoice",
            "asn": "asn",
            "acknowledgement": "acknowledgement"
        }]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_workflow_configurations(customer)
        self.assertEqual(result, {
            "po_format": "po_format",
            "article": "article",
            "mrp_1": "mrp_1",
            "mrp_2": "mrp_2",
            "caselot": "caselot",
            "base_price": "base_price",
            "invoice": "invoice",
            "asn": "asn",
            "acknowledgement": "acknowledgement"
        })

    @patch('src.models.data_persist_model.pd')
    def test_fetch_workflow_configurations_exception(self, mock_pd):
        customer = "Reliance"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_workflow_configurations(customer)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_article_details_success(self, mock_pd):
        order_items = [MagicMock()]
        site_code = "SITE123"
        vendor_code = "VENDOR123"
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [(
            "article_id", "psku", "psku_desc", "sku", "sku_desc", "plant_code"
        )]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{
            "article_id": "article_id",
            "psku": "psku",
            "psku_desc": "psku_desc",
            "sku": "sku",
            "sku_desc": "sku_desc",
            "plant_code": "plant_code"
        }]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_article_details(order_items, site_code, vendor_code)
        self.assertEqual(result, {
            "article_id": {
                "article_id": "article_id",
                "psku": "psku",
                "psku_desc": "psku_desc",
                "sku": "sku",
                "sku_desc": "sku_desc",
                "plant_code": "plant_code"
            }
        })

    @patch('src.models.data_persist_model.pd')
    def test_fetch_article_details_exception(self, mock_pd):
        order_items = [MagicMock()]
        site_code = "SITE123"
        vendor_code = "VENDOR123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_article_details(order_items, site_code, vendor_code)

    @patch('src.models.data_persist_model.json')
    def test_create_audit_logs_success(self, mock_json):
        data = {
            "type": "INSERT",
            "po_number": "PO123",
            "data": {"key": "value"},
            "id": "1"
        }
        mock_cursor = MagicMock()
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.create_audit_logs(data)
        self.assertTrue(result)
        mock_cursor.execute.assert_called_once_with(
            '''INSERT INTO mt_ecom_audit_trail (type,reference_column,column_values,request_id) VALUES (%s,%s,%s,%s)''',
            (data.get('type'), data.get('po_number'), mock_json.dumps(data.get('data')), data.get('id'))
        )

    @patch('src.models.data_persist_model.json')
    def test_create_audit_logs_exception(self, mock_json):
        data = {
            "type": "INSERT",
            "po_number": "PO123",
            "data": {"key": "value"},
            "id": "1"
        }
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.create_audit_logs(data)

           

    @patch('src.models.data_persist_model.json')
    @patch('src.models.data_persist_model.pd')
    def test_upsert_po_key_success(self, mock_pd, mock_json):
        mock_data = [UpsertPoKey(
            unique_id="1",
            po_number="PO123",
            status="SO Pending",
            po_created_date="2023-01-01",
            customer="Reliance",
            customer_code="CUST123",
            site_code="SITE123",
            delivery_date="2023-02-01",
            json_file_name="file.json"  # Include json_file_name
        )]
        mock_json.dumps.return_value = '{"unique_id": "1", "po_number": "PO123"}'
        mock_cursor = MagicMock()
        mock_cursor.description = [('id',)]
        mock_cursor.fetchall.return_value = [(1,)]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"id": 1}]
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.upsert_po_key(mock_data)
        self.assertEqual(result, 1)

    @patch('src.models.data_persist_model.json')
    @patch('src.models.data_persist_model.pd')
    def test_upsert_po_key_exception(self, mock_pd, mock_json):
        mock_data = [UpsertPoKey(
            unique_id="1",
            po_number="PO123",
            status="SO Pending",
            po_created_date="2023-01-01",
            customer="Reliance",
            customer_code="CUST123",
            site_code="SITE123",
            delivery_date="2023-02-01",
                json_file_name="file.json"
        )]
        mock_json.dumps.return_value = '{"unique_id": "1", "po_number": "PO123"}'
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.upsert_po_key(mock_data)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_po_key_success(self, mock_pd):
        po_number = "PO123"
        mock_cursor = MagicMock()
        mock_cursor.description = [('xml_file_name',), ('json_file_name',), ('customer',), ('id',)]
        mock_cursor.fetchall.return_value = [("xml_file.xml", "json_file.json", "Reliance", 1)]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"xml_file_name": "xml_file.xml", "json_file_name": "json_file.json", "customer": "Reliance", "id": 1}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_po_key(po_number)
        self.assertEqual(result, {"xml_file_name": "xml_file.xml", "json_file_name": "json_file.json", "customer": "Reliance", "id": 1})

    @patch('src.models.data_persist_model.pd')
    def test_fetch_po_key_exception(self, mock_pd):
        po_number = "PO123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_po_key(po_number)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_workflow_configurations_success(self, mock_pd):
        customer = "Reliance"
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [(
            "po_format", "article", "mrp_1", "mrp_2", "caselot", "base_price", "invoice", "asn", "acknowledgement"
        )]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{
            "po_format": "po_format",
            "article": "article",
            "mrp_1": "mrp_1",
            "mrp_2": "mrp_2",
            "caselot": "caselot",
            "base_price": "base_price",
            "invoice": "invoice",
            "asn": "asn",
            "acknowledgement": "acknowledgement"
        }]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_workflow_configurations(customer)
        self.assertEqual(result, {
            "po_format": "po_format",
            "article": "article",
            "mrp_1": "mrp_1",
            "mrp_2": "mrp_2",
            "caselot": "caselot",
            "base_price": "base_price",
            "invoice": "invoice",
            "asn": "asn",
            "acknowledgement": "acknowledgement"
        })

    @patch('src.models.data_persist_model.pd')
    def test_fetch_workflow_configurations_exception(self, mock_pd):
        customer = "Reliance"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_workflow_configurations(customer)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_article_details_success(self, mock_pd):
        order_items = [MagicMock()]
        site_code = "SITE123"
        vendor_code = "VENDOR123"
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [(
            "article_id", "psku", "psku_desc", "sku", "sku_desc", "plant_code"
        )]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{
            "article_id": "article_id",
            "psku": "psku",
            "psku_desc": "psku_desc",
            "sku": "sku",
            "sku_desc": "sku_desc",
            "plant_code": "plant_code"
        }]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_article_details(order_items, site_code, vendor_code)
        self.assertEqual(result, {
            "article_id": {
                "article_id": "article_id",
                "psku": "psku",
                "psku_desc": "psku_desc",
                "sku": "sku",
                "sku_desc": "sku_desc",
                "plant_code": "plant_code"
            }
        })

    @patch('src.models.data_persist_model.pd')
    def test_fetch_article_details_exception(self, mock_pd):
        order_items = [MagicMock()]
        site_code = "SITE123"
        vendor_code = "VENDOR123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_article_details(order_items, site_code, vendor_code)

    @patch('src.models.data_persist_model.json')
    def test_create_audit_logs_success(self, mock_json):
        data = {
            "type": "INSERT",
            "po_number": "PO123",
            "data": {"key": "value"},
            "id": "1"
        }
        mock_cursor = MagicMock()
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.create_audit_logs(data)
        self.assertTrue(result)
        mock_cursor.execute.assert_called_once_with(
            '''INSERT INTO mt_ecom_audit_trail (type,reference_column,column_values,request_id) VALUES (%s,%s,%s,%s)''',
            (data.get('type'), data.get('po_number'), mock_json.dumps(data.get('data')), data.get('id'))
        )

    @patch('src.models.data_persist_model.json')
    def test_create_audit_logs_exception(self, mock_json):
        data = {
            "type": "INSERT",
            "po_number": "PO123",
            "data": {"key": "value"},
            "id": "1"
        }
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.create_audit_logs(data)

    @patch('src.models.data_persist_model.pd')
    def test_delete_po_success(self, mock_pd):
        data = {
            "customer": "Reliance",
            "from_date": "2023-01-01",
            "to_date": "2023-02-01"
        }
        mock_cursor = MagicMock()
        mock_cursor.description = [('id',), ('po_number',)]
        mock_cursor.fetchall.return_value = [(1, "PO123")]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"id": 1, "po_number": "PO123"}]
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.delete_po(data)
        self.assertEqual(result, 1)

    @patch('src.models.data_persist_model.pd')
    def test_delete_po_exception(self, mock_pd):
        data = {
            "customer": "Reliance",
            "from_date": "2023-01-01",
            "to_date": "2023-02-01"
        }
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.delete_po(data)

    @patch('src.models.data_persist_model.pd')
    def test_change_po_status_success(self, mock_pd):
        mock_cursor = MagicMock()
        mock_cursor.rowcount = 5
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.change_po_status()
        self.assertEqual(result, 5)

    @patch('src.models.data_persist_model.pd')
    def test_change_po_status_exception(self, mock_pd):
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.change_po_status()
    # @patch('src.models.data_persist_model.pd')
    # def test_update_base_price_success(self, mock_pd):
    #     data = {
    #         "id": 1,
    #         "item_number": "ITEM123",
    #         "correct_base_price": 100,
    #         "message": "Updated",
    #         "status": "Success"
    #     }
    #     mock_cursor_read = MagicMock()
    #     mock_cursor_write = MagicMock()
    #     mock_cursor_read.description = [('status',), ('message',)]
    #     mock_cursor_read.fetchall.return_value = [("Pending", "Old Message")]
    #     mock_pd.DataFrame.return_value.to_dict.return_value = [{"status": "Pending", "message": "Old Message"}]
    #     self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor_read
    #     self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor_write
    
    #     self.persist_model.update_base_price(data)
    #     mock_cursor_write.execute.assert_called_with(
    #         '''UPDATE mt_ecom_item_table SET updated_base_price = %s, message = %s, status = %s WHERE po_id = %s and item_number = %s''',
    #         (data.get('correct_base_price', ""), data.get("message", ""), data.get('status', ""), data.get('id', 0), data.get('item_number', ""))
    #     )
    @patch('src.models.data_persist_model.pd')
    def test_update_base_price_exception(self, mock_pd):
        data = {
            "id": 1,
            "item_number": "ITEM123",
            "correct_base_price": 100,
            "message": "Updated",
            "status": "Success"
        }
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.update_base_price(data)

    @patch('src.models.data_persist_model.pd')
    def test_get_header_data_success(self, mock_pd):
        po = "PO123"
        mock_cursor = MagicMock()
        mock_cursor.description = [('site_code',), ('vendor_code',), ('location',)]
        mock_cursor.fetchall.return_value = [("SITE123", "VENDOR123", "LOCATION123")]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"site_code": "SITE123", "vendor_code": "VENDOR123", "location": "LOCATION123"}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.get_header_data(po)
        self.assertEqual(result, {"site_code": "SITE123", "vendor_code": "VENDOR123", "location": "LOCATION123"})

    @patch('src.models.data_persist_model.pd')
    def test_get_header_data_exception(self, mock_pd):
        po = "PO123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.get_header_data(po)

      
    @patch('src.models.data_persist_model.pd')
    def test_fetch_items_success(self, mock_pd):
        id = "1"
        mock_cursor = MagicMock()
        mock_cursor.description = [('column1',), ('column2',)]
        mock_cursor.fetchall.return_value = [("value1", "value2")]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"column1": "value1", "column2": "value2"}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_items(id)
        self.assertEqual(result, {"data": [{"column1": "value1", "column2": "value2"}]})

    @patch('src.models.data_persist_model.pd')
    def test_fetch_items_exception(self, mock_pd):
        id = "1"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.fetch_items(id)

    @patch('src.models.data_persist_model.pd')
    def test_download_reports_success(self, mock_pd):
        data = {
            "from_date": "2023-01-01",
            "to_date": "2023-02-01"
        }
        mock_cursor = MagicMock()
        mock_cursor.description = [('column1',), ('column2',)]
        mock_cursor.fetchall.return_value = [("value1", "value2")]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"column1": "value1", "column2": "value2"}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.download_reports(data)
        self.assertEqual(result, [{"column1": "value1", "column2": "value2"}])

    @patch('src.models.data_persist_model.pd')
    def test_download_reports_exception(self, mock_pd):
        data = {
            "from_date": "2023-01-01",
            "to_date": "2023-02-01"
        }
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.download_reports(data)

    @patch('src.models.data_persist_model.pd')
    def test_update_invoice_status_success(self, mock_pd):
        data = {
            "invoice_number": "INV123",
            "invoice_date": "2023-01-01",
            "invoice_quantity": 10,
            "invoice_mrp": 100,
            "invoice_base_price": 90,
            "invoice_uom": "PCS",
            "item_number": "ITEM123",
            "so_number": "SO123",
            "po_number": "PO123"
        }
        mock_cursor = MagicMock()
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.update_invoice_status(data)
        self.assertTrue(result)

    @patch('src.models.data_persist_model.pd')
    def test_update_invoice_status_exception(self, mock_pd):
        data = {
            "invoice_number": "INV123",
            "invoice_date": "2023-01-01",
            "invoice_quantity": 10,
            "invoice_mrp": 100,
            "invoice_base_price": 90,
            "invoice_uom": "PCS",
            "item_number": "ITEM123",
            "so_number": "SO123",
            "po_number": "PO123"
        }
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.update_invoice_status(data)

    @patch('src.models.data_persist_model.pd')
    def test_export_po_data_success(self, mock_pd):
        data = {
            "customer_name": "Reliance"
        }
        mock_cursor = MagicMock()
        mock_cursor.description = [('column1',), ('column2',)]
        mock_cursor.fetchall.return_value = [("value1", "value2")]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"column1": "value1", "column2": "value2"}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.export_po_data(data)
        self.assertEqual(result, [{"column1": "value1", "column2": "value2"}])

    @patch('src.models.data_persist_model.pd')
    def test_export_po_data_exception(self, mock_pd):
        data = {
            "customer_name": "Reliance"
        }
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.export_po_data(data)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_conversion_factor_success(self, mock_pd):
        sku = 123
        mock_cursor = MagicMock()
        mock_cursor.description = [('pak_to_cs',)]
        mock_cursor.fetchall.return_value = [(10,)]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"pak_to_cs": 10}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_conversion_factor(sku)
        self.assertEqual(result, 10)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_conversion_factor_exception(self, mock_pd):
        sku = 123
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.fetch_conversion_factor(sku)

    @patch('src.models.data_persist_model.pd')
    def test_save_remaining_caselot_success(self, mock_pd):
        remainder = 5
        po_number = "PO123"
        item_number = "ITEM123"
        so_qty = 10
        sap_caselot = 15
        message = 'Error'
        mock_cursor = MagicMock()
        mock_cursor.rowcount = 1
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.save_remaining_caselot(remainder, po_number, item_number, so_qty, sap_caselot,message)
        self.assertEqual(result, 1)

    @patch('src.models.data_persist_model.pd')
    def test_save_remaining_caselot_exception(self, mock_pd):
        remainder = 5
        po_number = "PO123"
        item_number = "ITEM123"
        so_qty = 10
        sap_caselot = 15
        message = 'Error'
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.save_remaining_caselot(remainder, po_number, item_number, so_qty, sap_caselot,message)

    @patch('src.models.data_persist_model.pd')
    @patch('src.models.data_persist_model.datetime')
    def test_save_item_details_success(self, mock_datetime, mock_pd):
        order_details = PoDTO(
            site_code="SITE123",
            po_number="PO123",
            items=[PoItemsDTO(
                item_number="ITEM123",
                caselot=10,
                customer_product_id="CUST123",
                target_qty=100,
                ean="EAN123",
                mrp=200.0,
                po_item_description="Description",
                base_price=150.0,
                landing_price=180.0,
                sales_unit="PCS",
                uom="UOM"
            )]
        )
        id = "1"
        mock_cursor = MagicMock()
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor
    
        # Mock datetime.now() to return a consistent value
        fixed_datetime = datetime(2024, 12, 26, 16, 45, 39, 230289)
        mock_datetime.now.return_value = fixed_datetime
    
        self.persist_model.save_item_details(order_details, id)
        mock_cursor.execute.assert_called_once_with(
            """ Insert into mt_ecom_item_table (
                item_number, caselot, customer_product_id,
                target_qty, ean, mrp ,po_item_description,base_price,landing_price,sales_unit,
                po_id, status, created_on, updated_on,uom,item_total_amount
                ) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) on
                conflict on constraint mt_ecom_item_table_un do nothing""",
            (
                "ITEM123",
                10,
                "CUST123",
                100,
                "EAN123",
                200.0,
                "Description",
                150.0,
                180.0,
                "PCS",
                "1",
                MtEcomStatusType.ACKNOWLEDGEMENT_SUCCESS,
                fixed_datetime,
                fixed_datetime,
                "UOM",
                0.0  # Assuming item_total_amount is 0.0 for this test case
            )
        )
    @patch('src.models.data_persist_model.pd')
    def test_fetch_non_invoiced_items_success(self, mock_pd):
        po_number = "PO123"
        mock_cursor = MagicMock()
        mock_cursor.description = [('id',), ('customer',), ('so_number',)]
        mock_cursor.fetchall.return_value = [(1, "Reliance", "SO123")]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"id": 1, "customer": "Reliance", "so_number": "SO123"}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_non_invoiced_items(po_number=po_number)
        self.assertEqual(result, [{"id": 1, "customer": "Reliance", "so_number": "SO123"}])

    @patch('src.models.data_persist_model.pd')
    def test_fetch_non_invoiced_items_exception(self, mock_pd):
        po_number = "PO123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_non_invoiced_items(po_number=po_number)

    @patch('src.models.data_persist_model.pd')
    def test_update_po_status_success(self, mock_pd):
        id = "1"
        mock_cursor = MagicMock()
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.update_po_status(id)
        self.assertTrue(result)
        mock_cursor.execute.assert_called_once_with(
            """UPDATE mt_ecom_header_table SET status = %s where id = %s""",
            (MtEcomStatusType.INVOICE_SUCCESS, id)
        )

    @patch('src.models.data_persist_model.pd')
    def test_update_po_status_exception(self, mock_pd):
        id = "1"
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.update_po_status(id)

    @patch('src.models.data_persist_model.pd')
    def test_get_invoice_status_success(self, mock_pd):
        data = {
            "item_number": "ITEM123",
            "so_number": "SO123"
        }
        mock_cursor = MagicMock()
        mock_cursor.description = [('ean',), ('invoice_number',), ('customer_product_id',), ('po_item_description',)]
        mock_cursor.fetchall.return_value = [("EAN123", "INV123", "CUST123", "Description")]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"ean": "EAN123", "invoice_number": "INV123", "customer_product_id": "CUST123", "po_item_description": "Description"}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.get_invoice_status(data)
        self.assertFalse(result)

    @patch('src.models.data_persist_model.pd')
    def test_get_invoice_status_exception(self, mock_pd):
        data = {
            "item_number": "ITEM123",
            "so_number": "SO123"
        }
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.get_invoice_status(data)

    @patch('src.models.data_persist_model.pd')
    def test_update_header_status_success(self, mock_pd):
        id = 1
        status = MtEcomStatusType.INVOICE_SUCCESS
        mock_cursor = MagicMock()
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor
    
        result = self.persist_model.update_header_status(id, status)
        self.assertTrue(result)
        mock_cursor.execute.assert_called_once_with(
            """
        UPDATE
            public.mt_ecom_header_table
        SET
            status = %s
        WHERE
            id = %s
        """,
        (status, id)
    )
    @patch('src.models.data_persist_model.pd')
    def test_update_header_status_exception(self, mock_pd):
        id = 1
        status = MtEcomStatusType.INVOICE_SUCCESS
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.update_header_status(id, status)

  
  
    @patch('src.models.data_persist_model.pd')
    def test_save_or_update_item_details_exception(self, mock_pd):
        data = {
            "data": {
                "PoItemNumber": "123",
                "Item_Number": "ITEM123",
                "SKU_Code": "SKU123",
                "Message": "Order message",
                "Sales_Order_Number": "SO123"
            },
            "id": "1",
            "so_number": "SO123",
            "po_number": "PO123",
            "status": MtEcomStatusType.INVOICE_PENDING
        }
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.save_or_update_item_details(data)

    @patch('src.models.data_persist_model.pd')
    def test_update_materials_success(self, mock_pd):
        data = [{
            "system_sku_code": "SKU123",
            "system_sku_description": "Description",
            "psku_code": "PSKU123",
            "psku_description": "PSKU Description",
            "status": MtEcomStatusType.INVOICE_PENDING,
            "plant_code": "PLANT123",
            "site_code": "SITE123",
            "id": "1",
            "item_number": "ITEM123"
        }]
        mock_cursor = MagicMock()
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        self.persist_model.update_materials(data)
        mock_cursor.execute.assert_called_once_with(
            """ Update mt_ecom_item_table set system_sku_code = %s, system_sku_description = %s, psku_code = %s, psku_description = %s,status = %s,plant_code = %s,site_code = %s where po_id = %s and item_number = %s""",
            (
                "SKU123",
                "Description",
                "PSKU123",
                "PSKU Description",
                MtEcomStatusType.INVOICE_PENDING,
                "PLANT123",
                "SITE123",
                "1",
                "ITEM123"
            )
        )

    @patch('src.models.data_persist_model.pd')
    def test_update_materials_exception(self, mock_pd):
        data = [{
            "system_sku_code": "SKU123",
            "system_sku_description": "Description",
            "psku_code": "PSKU123",
            "psku_description": "PSKU Description",
            "status": MtEcomStatusType.INVOICE_PENDING,
            "plant_code": "PLANT123",
            "site_code": "SITE123",
            "id": "1",
            "item_number": "ITEM123"
        }]
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.update_materials(data)


    @patch('src.models.data_persist_model.pd')
    def test_fetch_po_key_success(self, mock_pd):
        po_number = "PO123"
        mock_cursor = MagicMock()
        mock_cursor.description = [('xml_file_name',), ('json_file_name',), ('customer',), ('id',)]
        mock_cursor.fetchall.return_value = [("xml_file.xml", "json_file.json", "Reliance", 1)]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"xml_file_name": "xml_file.xml", "json_file_name": "json_file.json", "customer": "Reliance", "id": 1}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_po_key(po_number)
        self.assertEqual(result, {"xml_file_name": "xml_file.xml", "json_file_name": "json_file.json", "customer": "Reliance", "id": 1})

    @patch('src.models.data_persist_model.pd')
    def test_fetch_po_key_exception(self, mock_pd):
        po_number = "PO123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_po_key(po_number)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_workflow_configurations_success(self, mock_pd):
        customer = "Reliance"
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [(
            "po_format", "article", "mrp_1", "mrp_2", "caselot", "base_price", "invoice", "asn", "acknowledgement"
        )]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{
            "po_format": "po_format",
            "article": "article",
            "mrp_1": "mrp_1",
            "mrp_2": "mrp_2",
            "caselot": "caselot",
            "base_price": "base_price",
            "invoice": "invoice",
            "asn": "asn",
            "acknowledgement": "acknowledgement"
        }]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_workflow_configurations(customer)
        self.assertEqual(result, {
            "po_format": "po_format",
            "article": "article",
            "mrp_1": "mrp_1",
            "mrp_2": "mrp_2",
            "caselot": "caselot",
            "base_price": "base_price",
            "invoice": "invoice",
            "asn": "asn",
            "acknowledgement": "acknowledgement"
        })

    @patch('src.models.data_persist_model.pd')
    def test_fetch_workflow_configurations_exception(self, mock_pd):
        customer = "Reliance"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_workflow_configurations(customer)

    @patch('src.models.data_persist_model.pd')
    def test_fetch_article_details_success(self, mock_pd):
        order_items = [MagicMock()]
        site_code = "SITE123"
        vendor_code = "VENDOR123"
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [(
            "article_id", "psku", "psku_desc", "sku", "sku_desc", "plant_code"
        )]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{
            "article_id": "article_id",
            "psku": "psku",
            "psku_desc": "psku_desc",
            "sku": "sku",
            "sku_desc": "sku_desc",
            "plant_code": "plant_code"
        }]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.fetch_article_details(order_items, site_code, vendor_code)
        self.assertEqual(result, {
            "article_id": {
                "article_id": "article_id",
                "psku": "psku",
                "psku_desc": "psku_desc",
                "sku": "sku",
                "sku_desc": "sku_desc",
                "plant_code": "plant_code"
            }
        })

    @patch('src.models.data_persist_model.pd')
    def test_fetch_article_details_exception(self, mock_pd):
        order_items = [MagicMock()]
        site_code = "SITE123"
        vendor_code = "VENDOR123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.fetch_article_details(order_items, site_code, vendor_code)

    @patch('src.models.data_persist_model.pd')
    def test_update_status_success(self, mock_pd):
        id = 1
        message = "Updated"
        status = MtEcomStatusType.INVOICE_SUCCESS
        item_number = "ITEM123"
        mrp = 100
        caselot = 10
        mock_cursor_read = MagicMock()
        mock_cursor_write = MagicMock()
        mock_cursor_read.description = [('status',), ('message',)]
        mock_cursor_read.fetchall.return_value = [("Pending", "Old Message")]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"status": "Pending", "message": "Old Message"}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor_read
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor_write

        self.persist_model.update_status(id, message, status, item_number, mrp, caselot)
        mock_cursor_write.execute.assert_called()

    @patch('src.models.data_persist_model.pd')
    def test_update_status_exception(self, mock_pd):
        id = 1
        message = "Updated"
        status = MtEcomStatusType.INVOICE_SUCCESS
        item_number = "ITEM123"
        mrp = 100
        caselot = 10
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.update_status(id, message, status, item_number, mrp, caselot)

    @patch('src.models.data_persist_model.pd')
    def test_get_customer_code_success(self, mock_pd):
        site_code = "SITE123"
        mock_cursor = MagicMock()
        mock_cursor.description = [('customer_code',)]
        mock_cursor.fetchall.return_value = [("CUST123",)]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"customer_code": "CUST123"}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.get_customer_code(site_code)
        self.assertEqual(result, {"customer_code": "CUST123"})

    @patch('src.models.data_persist_model.pd')
    def test_get_customer_code_exception(self, mock_pd):
        site_code = "SITE123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.get_customer_code(site_code)

    @patch('src.models.data_persist_model.json')
    def test_save_req_res_success(self, mock_json):
        data = {"key": "value"}
        log_type = {"type": "INSERT", "po_number": "PO123"}
        request_id = "REQ123"
        mock_cursor = MagicMock()
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor
    
        result = self.persist_model.save_req_res(data, log_type, request_id)
        self.assertTrue(result)
        mock_cursor.execute.assert_called_once_with(
            """ Insert into mt_ecom_audit_trail (type,reference_column,
                column_values,request_id) values (%s,%s,%s,%s)""",
            (log_type.get("type"), log_type.get("po_number"), mock_json.dumps(data), request_id)
        )
    @patch('src.models.data_persist_model.json')
    def test_save_req_res_exception(self, mock_json):
        data = {"key": "value"}
        log_type = {"type": "INSERT", "po_number": "PO123"}
        request_id = "REQ123"
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.save_req_res(data, log_type, request_id)

    
    @patch('src.models.data_persist_model.json')
    @patch('src.models.data_persist_model.datetime')
    def test_create_logs_success(self, mock_datetime, mock_json):
        data = {
            "po_number": "PO123",
            "log": "Log message",
            "status": MtEcomStatusType.INVOICE_SUCCESS
        }
        mock_cursor = MagicMock()
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor
    
        # Mock datetime.now() to return a consistent value
        fixed_datetime = datetime(2024, 12, 26, 16, 23, 29, 690633)
        mock_datetime.now.return_value = fixed_datetime
    
        result = self.persist_model.create_logs(data)
        self.assertTrue(result)
        mock_cursor.execute.assert_called_once_with(
            """ Insert into mt_ecom_logs (po_number,log_type,status,updated_on) values (%s,%s,%s,%s) """,
            (data.get("po_number"), data.get("log"), data.get("status"), fixed_datetime)
        )
    @patch('src.models.data_persist_model.json')
    def test_create_logs_exception(self, mock_json):
        data = {
            "po_number": "PO123",
            "log": "Log message",
            "status": MtEcomStatusType.INVOICE_SUCCESS
        }
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.create_logs(data)

    @patch('src.models.data_persist_model.pd')
    def test_get_so_number_success(self, mock_pd):
        po_number = "PO123"
        mock_cursor = MagicMock()
        mock_cursor.description = [('so_flag',)]
        mock_cursor.fetchall.return_value = [(True,)]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"so_flag": True}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.get_so_number(po_number)
        self.assertTrue(result)

    @patch('src.models.data_persist_model.pd')
    def test_get_so_number_exception(self, mock_pd):
        po_number = "PO123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(DataPersistingException):
            self.persist_model.get_so_number(po_number)



    @patch('src.models.data_persist_model.pd')
    def test_update_so_flag_success(self, mock_pd):
        po = "PO123"
        mock_cursor = MagicMock()
        mock_cursor.rowcount = 1
        self.mock_db_helper.get_write_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.update_so_flag(po)
        self.assertEqual(result, 1)
        mock_cursor.execute.assert_called_once_with(
            '''Update mt_ecom_header_table set so_flag = true where po_number = %s''', 
            (po,)
        )

    @patch('src.models.data_persist_model.pd')
    def test_update_so_flag_exception(self, mock_pd):
        po = "PO123"
        self.mock_db_helper.get_write_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.update_so_flag(po)
        
    @patch('src.models.data_persist_model.pd')
    def test_get_po_copy_success(self, mock_pd):
        po_number = "PO123"
        mock_cursor = MagicMock()
        mock_cursor.description = [('customer','xml_file_name','json_file_name')]
        mock_cursor.fetchall.return_value = [('BigBasket','json/abc@123','po/abc@123')]
        mock_pd.DataFrame.return_value.to_dict.return_value = [{"customer": 'BigBasket','xml_file_name':'json/abc@123','json_file_name': 'po/abc@123'}]
        self.mock_db_helper.get_read_connection.return_value.__enter__.return_value.cursor.return_value = mock_cursor

        result = self.persist_model.get_po_copy(po_number)
        self.assertTrue(result)

    @patch('src.models.data_persist_model.pd')
    def test_get_po_copy_exception(self, mock_pd):
        po = "PO123"
        self.mock_db_helper.get_read_connection.side_effect = Exception("DB Error")

        with self.assertRaises(Exception):
            self.persist_model.get_po_copy(po)
        



if __name__ == '__main__':
    unittest.main()