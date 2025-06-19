import unittest
from unittest.mock import patch, MagicMock
from decimal import Decimal
from src.transformers.sap_transformers import SapTransformers, DecimalEncoder
from src.models.dto.po_dto import PoDTO, PoItemsDTO
from src.models.dto.so_dto import SoDTO, SoItems
from src.models.dto.validation_dto import ValidationDTO, ValidationItemsDTO
from src.models.dto.shopify_so_updation_dto import ShopifySOUpdateDTO, ShopifySOUpdateItemsDTO
from src.exceptions.sap_transformer_exception import SapTransformerException

class TestSapTransformers(unittest.TestCase):

    def setUp(self):
        self.transformer = SapTransformers()

    def test_pad_number(self):
        self.assertEqual(self.transformer.pad_number(1), '000001')
        self.assertEqual(self.transformer.pad_number(123), '000123')
        self.assertEqual(self.transformer.pad_number(123456), '123456')

    def test_invoice_payload(self):
        non_invoiced_records = [
            {
                "so_number": "SO123",
                "response_item_number": "1",
                "psku": "PSKU123",
                "system_sku": "SKU123",
                "updated_mrp": Decimal("100.00"),
                "ean": "EAN123",
                "customer_product_id": "CPID123",
                "unique_id": "UID123"
            }
        ]
        po_number = "PO123"
        result = self.transformer.invoice_payload(non_invoiced_records, po_number)
        self.assertTrue(result["status"])
        self.assertEqual(result["data"]["InvType"], "PRICE_CHECK")
        self.assertEqual(len(result["data"]["NAVHDR"]), 1)

    @patch('src.transformers.sap_transformers.Logger.info')
    def test_so_payload(self, mock_logger_info):
        items = [PoItemsDTO(
            item_number="1",
            target_qty=10,
            system_sku_code="123",
            mrp=Decimal("100.00"),
            ror="ROR",
            caselot="10",
            customer_product_id="CPID123",
            sales_unit="SU",
            uom="UOM"
        )]
        order = PoDTO(
            customer_code="CUST123",
            po_number="PO123",
            po_created_date="2023-01-01",
            delivery_date="2023-01-10",
            site_code="SITE123",
            items=items
        )
        result = self.transformer.so_payload(order)
        self.assertIsInstance(result, SoDTO)
        self.assertEqual(result.SoldTo, "CUST123")
        self.assertEqual(result.PoNumber, "PO123")
        self.assertEqual(len(result.NAVITEM), 1)

    @patch('src.transformers.sap_transformers.Logger.info')
    def test_validation_payload(self, mock_logger_info):
        items = [PoItemsDTO(
            item_number="1",
            psku_code="123",
            system_sku_code="123",
            customer_product_id="CPID123",
            mrp=Decimal("100.00"),
            ean="EAN123",
            caselot="10",
            base_price=Decimal("90.00"),
            target_qty=10,
            sales_unit="SU",
            uom="UOM"
        )]
        order = PoDTO(
            customer_code="CUST123",
            po_number="PO123",
            po_created_date="2023-01-01",
            site_code="SITE123",
            items=items
        )
        result = self.transformer.validation_payload(order)
        self.assertIsInstance(result, ValidationDTO)
        self.assertEqual(result.SoldTo, "CUST123")
        self.assertEqual(result.PoNumber, "PO123")
        self.assertEqual(len(result.NAVPRICE), 1)
        
    @patch('src.transformers.sap_transformers.Logger.info')
    def test_shopify_so_updation_transformer(self, mock_logger_info):
        data = {
            "header_data": {
                "sales_order": "SO123",
                "sales_org": "ORG123",
                "disribution_channel": "DC123",
                "division": "DIV123",
                "currency_code": "USD",
                "order_partners": ["PARTNER1", "PARTNER2"],
                "header_conditions": ["CONDITION1", "CONDITION2"]
            },
            "item_data": [
                {
                    "item_number": "1",
                    "customer_material_code": "CMC123",
                    "order_quantity": "10",
                    "sales_unit": "UNIT",
                    "item_conditions": ["CONDITION1", "CONDITION2"],
                    "item_category": "CATEGORY",
                    "ror": True
                }
            ]
        }
        result = self.transformer.shopify_so_updation_transformer(data)
        self.assertIsInstance(result, ShopifySOUpdateDTO)
        self.assertEqual(result.SalesDocument, "SO123")
        self.assertEqual(len(result.LineItems), 1)
        
    @patch('src.transformers.sap_transformers.Logger.info')
    def test_shopify_creation_transformer(self, mock_logger_info):
        data = {
            "header_data": {
                "sales_order": "SO123",
                "sales_org": "ORG123",
                "disribution_channel": "DC123",
                "division": "DIV123",
                "currency_code": "USD",
                "order_partners": ["PARTNER1", "PARTNER2"],
                "header_conditions": ["CONDITION1", "CONDITION2"]
            },
            "item_data": [
                {
                    "item_number": "1",
                    "customer_material_code": "CMC123",
                    "order_quantity": "10",
                    "sales_unit": "UNIT",
                    "item_conditions": ["CONDITION1", "CONDITION2"],
                    "item_category": "CATEGORY"
                }
            ]
        }
        result = self.transformer.shopify_creation_transformer(data)
        self.assertIsInstance(result, ShopifySOUpdateDTO)
        self.assertEqual(result.SalesDocument, "SO123")
        self.assertEqual(len(result.LineItems), 1)
    
if __name__ == '__main__':
    unittest.main()