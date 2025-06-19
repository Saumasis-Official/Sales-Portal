import unittest
from unittest.mock import patch, MagicMock
from src.services.data_persist_service import DataPersistService
from src.models.dto.po_dto import PoDTO, PoItemsDTO
from src.enums.mt_ecom_status_type import MtEcomStatusType
from src.enums.customers_enum import Customers
from src.exceptions.data_persisting_exception import DataPersistingException

class TestDataPersistService(unittest.TestCase):

    def setUp(self):
        self.service = DataPersistService()

        sample_item = PoItemsDTO(
            item_number="12345",
            customer_product_id="CUST_PROD_123",
            article_number="A123",
            description="Sample Item",
            quantity=10,
            uom="EA",
            price=10.0,
            base_price=10.0,
            currency="USD",
            target_qty=10,
            sales_unit="EA",
            article_description="",  
            others={},  
        )
        self.po_dto = PoDTO(
                    po_number="12345",
                    po_created_date="2023-10-10",
                    customer_code="CUST123",
                    site_code="SITE123",
                    delivery_date="2023-10-15",
                    others={},
                    po_created_timestamp=None,
                    items=[
                        PoItemsDTO(
                            item_number="1",
                            article_number="UNIT",
                            quantity=10,
                            sales_unit="UNIT",
                            uom="UOM",
                            target_qty=10,
                            customer_product_id="CUST_PROD_123"
                        )
                    ]
                )


    @patch('src.models.data_persist_model.PersistModel.upsert_po_key')
    @patch('src.services.log_service.LogService.log_process')
    def test_persist_po_key_success(self, mock_log_process, mock_upsert_po_key):
        mock_upsert_po_key.return_value = True
        response = self.service.persist_po_key(self.po_dto, "json_file_key", Customers.RELIANCE)
        self.assertTrue(response)
        mock_log_process.assert_called_with(self.po_dto.po_number, "Validation completed successfully", MtEcomStatusType.VALIDATION_SUCCESS)

    # @patch('src.models.data_persist_model.PersistModel.upsert_po_key')
    # @patch('src.services.log_service.LogService.log_process')
    # def test_persist_po_key_failure(self, mock_log_process, mock_upsert_po_key):
    #     mock_upsert_po_key.return_value = False
    #     with self.assertRaises(DataPersistingException):
    #         self.service.persist_po_key(self.po_dto, "json_file_key", "customer")
    #     mock_log_process.assert_called_with(self.po_dto.po_number, "JSON_VALIDATION_STATUS_FAILED", MtEcomStatusType.VALIDATION_FAILED)

    @patch('src.models.data_persist_model.PersistModel.fetch_po_key')
    def test_fetch_po_key_success(self, mock_fetch_po_key):
        mock_fetch_po_key.return_value = "file_name"
        response = self.service.fetch_po_key("12345")
        self.assertEqual(response, "file_name")

    @patch('src.models.data_persist_model.PersistModel.fetch_po_key')
    def test_fetch_po_key_failure(self, mock_fetch_po_key):
        mock_fetch_po_key.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.fetch_po_key("12345")

    @patch('src.models.data_persist_model.PersistModel.fetch_workflow_configurations')
    def test_fetch_workflow_configurations_success(self, mock_fetch_workflow_configurations):
        mock_fetch_workflow_configurations.return_value = "workflow_config"
        response = self.service.fetch_workflow_configurations(Customers.RELIANCE)
        self.assertEqual(response, "workflow_config")

    @patch('src.models.data_persist_model.PersistModel.fetch_workflow_configurations')
    def test_fetch_workflow_configurations_failure(self, mock_fetch_workflow_configurations):
        mock_fetch_workflow_configurations.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.fetch_workflow_configurations(Customers.RELIANCE)

    @patch('src.models.data_persist_model.PersistModel.fetch_article_details')
    def test_fetch_article_details_success(self, mock_fetch_article_details):
        mock_fetch_article_details.return_value = "article_details"
        response = self.service.fetch_article_details(
            [
                PoItemsDTO(
                    item_number="1",
                    article_number="ART123",
                    quantity=10,
                    sales_unit="UNIT",
                    uom="UOM",
                    target_qty=10,
                    customer_product_id="CUST_PROD_123"  # Provide a valid value for the 'customer_product_id' field
                )
            ],
            "SITE123",
            "VENDOR123"
        )
        self.assertEqual(response, "article_details")


    @patch('src.models.data_persist_model.PersistModel.fetch_article_details')
    def test_fetch_article_details_failure(self, mock_fetch_article_details):
        mock_fetch_article_details.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.fetch_article_details(
                [
                    PoItemsDTO(
                        item_number="1",
                        article_number="ART123",
                        quantity=10,
                        sales_unit="UNIT",
                        uom="UOM",
                        target_qty=10,
                        customer_product_id="CUST_PROD_123"
                    )
                ],
                "SITE123",
                "VENDOR123"
            )

    @patch('src.models.data_persist_model.PersistModel.update_status')
    def test_update_status_success(self, mock_update_status):
        mock_update_status.return_value = True
        response = self.service.update_status(1, "message", MtEcomStatusType.VALIDATION_SUCCESS, "item_number")
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.update_status')
    def test_update_status_failure(self, mock_update_status):
        mock_update_status.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.update_status(1, "message", MtEcomStatusType.VALIDATION_SUCCESS, "item_number")

    @patch('src.models.data_persist_model.PersistModel.get_customer_code')
    def test_get_customer_code_success(self, mock_get_customer_code):
        mock_get_customer_code.return_value = "customer_code"
        response = self.service.get_customer_code("SITE123")
        self.assertEqual(response, "customer_code")

    @patch('src.models.data_persist_model.PersistModel.get_customer_code')
    def test_get_customer_code_failure(self, mock_get_customer_code):
        mock_get_customer_code.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.get_customer_code("SITE123")

    @patch('src.models.data_persist_model.PersistModel.create_logs')
    def test_create_logs_success(self, mock_create_logs):
        mock_create_logs.return_value = True
        response = self.service.create_logs({"po_number": "12345", "log": "log", "status": MtEcomStatusType.VALIDATION_SUCCESS})
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.create_logs')
    def test_create_logs_failure(self, mock_create_logs):
        mock_create_logs.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.create_logs({"po_number": "12345", "log": "log", "status": MtEcomStatusType.VALIDATION_SUCCESS})

    @patch('src.models.data_persist_model.PersistModel.get_so_number')
    def test_get_so_number_success(self, mock_get_so_number):
        mock_get_so_number.return_value = "so_number"
        response = self.service.get_so_number("12345")
        self.assertEqual(response, "so_number")

    @patch('src.models.data_persist_model.PersistModel.get_so_number')
    def test_get_so_number_failure(self, mock_get_so_number):
        mock_get_so_number.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.get_so_number("12345")

    # @patch('src.models.data_persist_model.PersistModel.save_item_details')
    # def test_save_item_details_success(self, mock_save_item_details):
    #     mock_save_item_details.return_value = True
    #     response = self.service.save_item_details(self.po_dto, "id")
    #     self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.save_item_details')
    def test_save_item_details_failure(self, mock_save_item_details):
        mock_save_item_details.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.save_item_details(self.po_dto, "id")

    @patch('src.models.data_persist_model.PersistModel.fetch_non_invoiced_items')
    def test_fetch_non_invoiced_items_success(self, mock_fetch_non_invoiced_items):
        mock_fetch_non_invoiced_items.return_value = "non_invoiced_items"
        response = self.service.fetch_non_invoiced_items("12345", "id")
        self.assertEqual(response, "non_invoiced_items")

    @patch('src.models.data_persist_model.PersistModel.fetch_non_invoiced_items')
    def test_fetch_non_invoiced_items_failure(self, mock_fetch_non_invoiced_items):
        mock_fetch_non_invoiced_items.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.fetch_non_invoiced_items("12345", "id")

    @patch('src.models.data_persist_model.PersistModel.update_po_status')
    def test_update_po_status_success(self, mock_update_po_status):
        mock_update_po_status.return_value = True
        response = self.service.update_po_status("id")
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.update_po_status')
    def test_update_po_status_failure(self, mock_update_po_status):
        mock_update_po_status.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.update_po_status("id")

    @patch('src.models.data_persist_model.PersistModel.get_invoice_status')
    def test_get_invoice_status_success(self, mock_get_invoice_status):
        mock_get_invoice_status.return_value = "invoice_status"
        response = self.service.get_invoice_status({"data": "data"})
        self.assertEqual(response, "invoice_status")

    @patch('src.models.data_persist_model.PersistModel.get_invoice_status')
    def test_get_invoice_status_failure(self, mock_get_invoice_status):
        mock_get_invoice_status.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.get_invoice_status({"data": "data"})

    @patch('src.models.data_persist_model.PersistModel.update_header_status')
    def test_update_header_status_success(self, mock_update_header_status):
        mock_update_header_status.return_value = True
        response = self.service.update_header_status(1, MtEcomStatusType.VALIDATION_SUCCESS)
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.update_header_status')
    def test_update_header_status_failure(self, mock_update_header_status):
        mock_update_header_status.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.update_header_status(1, MtEcomStatusType.VALIDATION_SUCCESS)

    @patch('src.models.data_persist_model.PersistModel.save_or_update_item_details')
    def test_save_or_update_item_details_success(self, mock_save_or_update_item_details):
        mock_save_or_update_item_details.return_value = True
        response = self.service.save_or_update_item_details({"data": "data"})
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.save_or_update_item_details')
    def test_save_or_update_item_details_failure(self, mock_save_or_update_item_details):
        mock_save_or_update_item_details.side_effect = Exception("Database error")
        with self.assertRaises(DataPersistingException):
            self.service.save_or_update_item_details({"data": "data"})

    @patch('src.models.data_persist_model.PersistModel.save_req_res')
    def test_save_req_res_success(self, mock_save_req_res):
        mock_save_req_res.return_value = True
        response = self.service.save_req_res({"data": "data"}, "type")
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.save_req_res')
    def test_save_req_res_failure(self, mock_save_req_res):
        mock_save_req_res.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.save_req_res({"data": "data"}, "type")

    @patch('src.models.data_persist_model.PersistModel.update_materials')
    def test_update_materials_success(self, mock_update_materials):
        mock_update_materials.return_value = True
        response = self.service.update_materials([{"data": "data"}])
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.update_materials')
    def test_update_materials_failure(self, mock_update_materials):
        mock_update_materials.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.update_materials([{"data": "data"}])

    @patch('src.models.data_persist_model.PersistModel.fetch_items')
    def test_fetch_items_success(self, mock_fetch_items):
        mock_fetch_items.return_value = "items"
        response = self.service.fetch_items("id")
        self.assertEqual(response, "items")

    @patch('src.models.data_persist_model.PersistModel.fetch_items')
    def test_fetch_items_failure(self, mock_fetch_items):
        mock_fetch_items.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.fetch_items("id")

    @patch('src.models.data_persist_model.PersistModel.update_invoice_status')
    def test_update_invoice_status_success(self, mock_update_invoice_status):
        mock_update_invoice_status.return_value = True
        response = self.service.update_invoice_status({"data": "data"})
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.update_invoice_status')
    def test_update_invoice_status_failure(self, mock_update_invoice_status):
        mock_update_invoice_status.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.update_invoice_status({"data": "data"})

    @patch('src.models.data_persist_model.PersistModel.fetch_conversion_factor')
    def test_convert_pieces_to_cases_success(self, mock_fetch_conversion_factor):
        mock_fetch_conversion_factor.return_value = 10
        response = self.service.convert_pieces_to_cases(25, 1)
        self.assertEqual(response, {'qty': 2, 'remainder': 5})

    @patch('src.models.data_persist_model.PersistModel.fetch_conversion_factor')
    def test_convert_pieces_to_cases_failure(self, mock_fetch_conversion_factor):
        mock_fetch_conversion_factor.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.convert_pieces_to_cases(25, 1)

    @patch('src.models.data_persist_model.PersistModel.save_remaining_caselot')
    def test_save_remaining_caselot_success(self, mock_save_remaining_caselot):
        mock_save_remaining_caselot.return_value = True
        response = self.service.save_remaining_caselot(5, "12345", "item_number", 10, 2)
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.save_remaining_caselot')
    def test_save_remaining_caselot_failure(self, mock_save_remaining_caselot):
        mock_save_remaining_caselot.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.save_remaining_caselot(5, "12345", "item_number", 10, 2)

    @patch('src.models.data_persist_model.PersistModel.delete_po')
    def test_delete_po_success(self, mock_delete_po):
        mock_delete_po.return_value = True
        response = self.service.delete_po({"data": "data"})
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.delete_po')
    def test_delete_po_failure(self, mock_delete_po):
        mock_delete_po.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.delete_po({"data": "data"})

    @patch('src.models.data_persist_model.PersistModel.change_po_status')
    def test_change_po_status_success(self, mock_change_po_status):
        mock_change_po_status.return_value = True
        response = self.service.change_po_status()
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.change_po_status')
    def test_change_po_status_failure(self, mock_change_po_status):
        mock_change_po_status.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.change_po_status()

    @patch('src.models.data_persist_model.PersistModel.update_base_price')
    def test_update_base_price_success(self, mock_update_base_price):
        mock_update_base_price.return_value = True
        response = self.service.update_base_price({"data": "data"})
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.update_base_price')
    def test_update_base_price_failure(self, mock_update_base_price):
        mock_update_base_price.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.update_base_price({"data": "data"})

    @patch('src.models.data_persist_model.PersistModel.get_header_data')
    def test_get_header_data_success(self, mock_get_header_data):
        mock_get_header_data.return_value = "header_data"
        response = self.service.get_header_data("po")
        self.assertEqual(response, "header_data")

    @patch('src.models.data_persist_model.PersistModel.get_header_data')
    def test_get_header_data_failure(self, mock_get_header_data):
        mock_get_header_data.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.get_header_data("po")

    @patch('src.models.data_persist_model.PersistModel.create_audit_logs')
    def test_create_audit_logs_success(self, mock_create_audit_logs):
        mock_create_audit_logs.return_value = True
        response = self.service.create_audit_logs({"data": "data"})
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.create_audit_logs')
    def test_create_audit_logs_failure(self, mock_create_audit_logs):
        mock_create_audit_logs.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.create_audit_logs({"data": "data"})

    @patch('src.models.data_persist_model.PersistModel.check_vendor_code')
    def test_check_vendor_code_success(self, mock_check_vendor_code):
        mock_check_vendor_code.return_value = True
        response = self.service.check_vendor_code("vendor_code")
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.check_vendor_code')
    def test_check_vendor_code_failure(self, mock_check_vendor_code):
        mock_check_vendor_code.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.check_vendor_code("vendor_code")

    @patch('src.models.data_persist_model.PersistModel.update_so_flag')
    def test_update_so_flag_success(self, mock_update_so_flag):
        mock_update_so_flag.return_value = True
        response = self.service.update_so_flag("po")
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.update_so_flag')
    def test_update_so_flag_failure(self, mock_update_so_flag):
        mock_update_so_flag.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.update_so_flag("po")
    
    @patch('src.models.data_persist_model.PersistModel.get_po_copy')
    def test_get_po_copy_success(self, mock_get_po_copy):
        mock_get_po_copy.return_value = True
        response = self.service.get_po_copy("po")
        self.assertTrue(response)

    @patch('src.models.data_persist_model.PersistModel.get_po_copy')
    def test_get_po_copy_failure(self, mock_get_po_copy):
        mock_get_po_copy.side_effect = Exception("Database error")
        with self.assertRaises(Exception):
            self.service.get_po_copy("po")

if __name__ == '__main__':
    unittest.main()