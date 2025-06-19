import unittest
from unittest.mock import MagicMock, patch
import asyncio
from src.utils.database_helper import DatabaseHelper
from src.models.shopify_model import ShopifyModel


class TestShopifyModel(unittest.TestCase):
    def setUp(self):
        self.shopify_model = ShopifyModel()
        # Patch DatabaseHelper methods to avoid AttributeError
        self.shopify_model.DATABASE_HELPER.get_write_connection = MagicMock()
        self.shopify_model.DATABASE_HELPER.get_read_connection = MagicMock()

    @patch("src.libs.loggers.Logger")
    def test_sap_request_payload_persistance(self, mock_logger):
        mock_logger.return_value = MagicMock()
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        self.shopify_model.DATABASE_HELPER.get_write_connection.return_value.__enter__.return_value = mock_conn

        # Simulate a successful database insert
        mock_cursor.fetchall.return_value = [{"id": 1}]
        mock_cursor.description = [("id",)]

        data = [
            MagicMock(
                sales_org="0010",
                disribution_channel="01",
                division="01",
                currency_code="USD",
                order_type="ZOR",
                po_number="123456",
                customer="Customer A",
                po_date="20230510",
                rdd="20230520",
                status="Open",
                ship_cond="01",
                ship_type="01",
                compl_div="01",
                order_partners=[{"PartnNumb": "123"}],
                header_conditions=[{"ConditionCode": "ZUKM"}],
                created_on="2023-05-15",
                json_file_key="key123",
                items=[
                    MagicMock(
                        item_number="10",
                        customer_material_code="M001",
                        order_quantity="10",
                        sales_unit="EA",
                        item_conditions=[{"ConditionCode": "ZABC"}],
                        created_on="2023-05-15",
                        item_category="ZABC",
                    )
                ],
            )
        ]

        result = self.shopify_model.sap_request_payload_persistance(data)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["message"], "Request payload processed successfully")

    @patch("src.libs.loggers.Logger")
    def test_sap_request_payload_persistance_failure(self, mock_logger):
        mock_logger.return_value = MagicMock()
        self.shopify_model.DATABASE_HELPER.get_write_connection.side_effect = Exception("Database error")

        data = [
            MagicMock(
                sales_org="0010",
                disribution_channel="01",
                division="01",
                currency_code="USD",
                order_type="ZOR",
                po_number="123456",
                customer="Customer A",
                po_date="20230510",
                rdd="20230520",
                status="Open",
                ship_cond="01",
                ship_type="01",
                compl_div="01",
                order_partners=[{"PartnNumb": "123"}],
                header_conditions=[{"ConditionCode": "ZUKM"}],
                created_on="2023-05-15",
                json_file_key="key123",
                items=[
                    MagicMock(
                        item_number="10",
                        customer_material_code="M001",
                        order_quantity="10",
                        sales_unit="EA",
                        item_conditions=[{"ConditionCode": "ZABC"}],
                        created_on="2023-05-15",
                        item_category="ZABC",
                    )
                ],
            )
        ]

        result = self.shopify_model.sap_request_payload_persistance(data)
        self.assertEqual(result["success"], "failure")
        self.assertIn("error", result)

    @patch("src.libs.loggers.Logger")
    def test_po_list(self, mock_logger):
        mock_logger.return_value = MagicMock()
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        self.shopify_model.DATABASE_HELPER.get_read_connection.return_value.__enter__.return_value = mock_conn

        # Mock the cursor's response for POs
        mock_cursor.fetchall.side_effect = [
            # Mock response for rows (POs)
            [
                {"po_number": "123456", "status": "Open", "po_date": "2023-05-10"},
                {"po_number": "789012", "status": "Closed", "po_date": "2023-05-11"},
            ],
            # Mock response for count
            [(2,)],
            # Mock response for customer codes
            [
                {"PartnNumb": "0010"},
                {"PartnNumb": "0020"},
            ],
        ]
        mock_cursor.description = [
            # Mock description for rows (POs)
            ("po_number",), ("status",), ("po_date",),
            # Mock description for count
            ("count",),
            # Mock description for customer codes
            ("PartnNumb",),
        ]

        data = {"customerCodes": ["0010"], "limit": 10, "offset": 0}
        result = self.shopify_model.po_list(data)

        # Assert that the response contains the correct structure
        self.assertIn("data", result)
        self.assertIn("count", result)
        self.assertIn("customer_codes", result)

        # Assert the values in the response
        self.assertEqual(len(result["data"]), 2)
        self.assertEqual(result["count"], 2)
        self.assertEqual(len(result["customer_codes"]), 2)
        self.assertEqual(result["customer_codes"][0]["PartnNumb"], "0010")
        self.assertEqual(result["customer_codes"][1]["PartnNumb"], "0020")

    @patch("src.libs.loggers.Logger")
    def test_get_customer_name(self, mock_logger):
        mock_logger.return_value = MagicMock()
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        self.shopify_model.DATABASE_HELPER.get_write_connection.return_value.__enter__.return_value = mock_conn

        mock_cursor.fetchall.return_value = [{"name": "Customer A"}]
        mock_cursor.description = [("name",)]

        result = self.shopify_model.get_customer_name("000123")
        self.assertEqual(result, "Customer A")

    @patch("src.libs.loggers.Logger")
    def test_retrigger_po_list(self, mock_logger):
        mock_logger.return_value = MagicMock()
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        self.shopify_model.DATABASE_HELPER.get_read_connection.return_value.__enter__.return_value = mock_conn

        mock_cursor.fetchall.return_value = [{"id": 1}]
        mock_cursor.description = [("id",)]

        result = self.shopify_model.retrigger_po_list()
        self.assertEqual(len(result), 1)
        self.assertIn("id", result[0])

    @patch("src.libs.loggers.Logger")
    def test_fetch_year(self, mock_logger):
        mock_logger.return_value = MagicMock()
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        self.shopify_model.DATABASE_HELPER.get_read_connection.return_value.__enter__.return_value = mock_conn

        mock_cursor.fetchall.return_value = [{"year": "2023"}]
        mock_cursor.description = [("year",)]

        result = self.shopify_model.fetch_year("user123")
        self.assertEqual(len(result), 1)
        self.assertIn("year", result[0])

    @patch("src.libs.loggers.Logger")
    def test_delete_items(self, mock_logger):
        mock_logger.return_value = MagicMock()
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        self.shopify_model.DATABASE_HELPER.get_write_connection.return_value.__enter__.return_value = mock_conn

        # Test data
        data = [{
            "is_deleted": True, 
            "po_id": 1, 
            "item_number": "10",
            "user_id": "test_user"
        }]

        # Mock the database responses
        mock_cursor.fetchone.return_value = ("Test", "User")
        mock_cursor.fetchall.return_value = [{"status": "success", "message": "Item(s) modified successfully"}]

        # Run the test
        result = asyncio.run(self.shopify_model.delete_items(data))

        # Assertions
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["message"], "Item(s) modified successfully")

if __name__ == "__main__":
    unittest.main()