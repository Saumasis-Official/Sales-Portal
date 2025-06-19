import unittest
from unittest.mock import patch, MagicMock
from src.transformers.blinkit_transformers import BlinkitTransformers
from src.models.dto.po_dto import PoDTO, PoItemsDTO
from src.models.dto.blinkit_po_ack_dto import BlinkitPoAckDTO
from src.models.dto.invoice_dto import InvoiceHeaderDTO, InvoiceItemsDTO
from src.exceptions.po_acknowledgement_exception import PoAcknowledgementException
from datetime import date, datetime

class TestBlinkitTransformers(unittest.TestCase):

    def setUp(self):
        self.transformer = BlinkitTransformers()

    @patch('src.services.data_persist_service.DataPersistService.get_customer_code')
    def test_po_transformer(self, mock_get_customer_code):
        payload = {
            "item_data": [
                {
                    "line_number": 1,
                    "case_size": 10,
                    "units_ordered": 100,
                    "item_id": "12345",
                    "mrp": 50,
                    "name": "Test Item",
                    "upc": "123456789012",
                    "cost_price": 45.0,
                    "landing_rate": 47.0,
                    "uom": "EA"
                }
            ],
            "receiver_code": "RC123",
            "purchase_order_details": {
                "purchase_order_number": "PO123",
                "issue_date": "2023-01-01",
                "po_expiry_date": "2023-01-10"
            },
            "grofers_delivery_details": {
                "grofers_outlet_id": "OUT123"
            }
        }
        location = "test_location"
        mock_get_customer_code.return_value = {'customer_code': '123'}

        po_dto = self.transformer.po_transformer(payload, location)

        self.assertIsInstance(po_dto, PoDTO)
        self.assertEqual(po_dto.vendor_code, "RC123")
        self.assertEqual(po_dto.po_number, "PO123")
        self.assertEqual(po_dto.po_created_date, date(2023, 1, 1)) 
        self.assertEqual(po_dto.delivery_date.date(), date(2023, 1, 10)) 
        self.assertEqual(po_dto.customer_code, "123")
        self.assertEqual(po_dto.site_code, "OUT123")
        self.assertEqual(len(po_dto.items), 1)
        self.assertIsInstance(po_dto.items[0], PoItemsDTO)
        
    def test_po_acknowledgement_transformer(self):
        po_number = 123  # Updated to a valid integer
        vendor_code = 123 
        status = "Success"
        event_message = "PO_CREATION"  # Updated to a valid value
        event_name = "PO_CREATION"  # Updated to a valid value
    
        po_ack_dto = self.transformer.po_acknowledgement_transformer(po_number, vendor_code, status, event_message, event_name)
    
        self.assertIsInstance(po_ack_dto, BlinkitPoAckDTO)
        self.assertEqual(po_ack_dto.po_number, po_number)
        self.assertEqual(po_ack_dto.receiver_code, vendor_code)
        self.assertEqual(po_ack_dto.status, status)
        self.assertEqual(po_ack_dto.event_message, event_message)
        self.assertEqual(po_ack_dto.event_name, event_name)
        
    @patch('src.utils.helper.HelperClass.remove_custom_types')
    def test_invoice_payload_transformer(self, mock_remove_custom_types):
        data = [
            {
                "sales_order": "SO123",
                "response_item_number": 1,
                "customer_product_id": "CP123",
                "psku_code": "PSKU123",
                "system_sku_code": "SSKU123",
                "updated_mrp": 55,
                "ean": "123456789012"
            }
        ]
        po = {
            "so_number": "SO123",
            "po_number": "PO123"
        }
        mock_remove_custom_types.return_value = data[0]

        invoice_payload = self.transformer.invoice_payload_transformer(data, po)

        self.assertIsInstance(invoice_payload, dict)
        self.assertEqual(invoice_payload["InvType"], "PRICE_CHECK")
        self.assertIn("NAVHDR", invoice_payload)
        self.assertEqual(len(invoice_payload["NAVHDR"]), 1)
        self.assertIsInstance(invoice_payload["NAVHDR"][0], dict)

if __name__ == '__main__':
    unittest.main()