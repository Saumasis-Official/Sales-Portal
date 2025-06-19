import unittest
from unittest.mock import patch, MagicMock
from src.transformers.amazon_transformers import AmazonTransformers
from src.models.dto.po_dto import PoDTO, PoItemsDTO
from src.models.dto.amazon_po_ack import AmazonAcknowledgementsDTO
from src.models.dto.amazon_invoice_dto import InvoiceDTO, InvoiceItem, TaxDetail, Amount, InvoicedQuantity, Party, Address, TaxRegistrationDetail, PaymentTerms
from src.exceptions.po_transformer_exception import PoTransformerException
from src.exceptions.po_acknowledgement_exception import PoAcknowledgementException
from datetime import datetime

class TestAmazonTransformers(unittest.TestCase):

    def setUp(self):
        self.transformer = AmazonTransformers()

    @patch('src.services.data_persist_service.DataPersistService.get_customer_code')
    @patch('src.utils.helper.HelperClass.convert_iso_to_local')
    def test_po_transformer(self, mock_convert_iso_to_local, mock_get_customer_code):
        payload = {
            "payload": {
                "orders": [
                    {
                        "orderDetails": {
                            "items": [
                                {
                                    "itemSequenceNumber": "1",
                                    "orderedQuantity": {"amount": "10", "unitOfMeasure": "EA"},
                                    "netCost": {"amount": "100"},
                                    "amazonProductIdentifier": "APID123"
                                }
                            ],
                            "shipToParty": {"partyId": "123"},
                            "purchaseOrderDate": "2023-01-01T00:00:00Z",
                            "deliveryWindow": "2023-01-01T00:00:00Z--2023-01-10T00:00:00Z",
                            "sellingParty": {"partyId": "456"},
                            "billToParty": {"address": {"addressLine1": "123 Street"}}
                        },
                        "purchaseOrderNumber": "PO123"
                    }
                ]
            }
        }
        location = "location"
        mock_get_customer_code.return_value = {'customer_code': '789'}
        mock_convert_iso_to_local.side_effect = [datetime(2023, 1, 1), datetime(2023, 1, 10)]

        result = self.transformer.po_transformer(payload, location)
        self.assertEqual(len(result), 1)
        self.assertIsInstance(result[0], PoDTO)
        self.assertEqual(result[0].po_number, "PO123")



    def test_invoice_items_transformer(self):
        item = {
            "costPrice": "1000",
            "outerCaseSize": "10",
            "Quantity": "5",
            "hsnCode": "HSN123",
            "CGST": "5",
            "SGST": "5",
            "CGST_Value": "25",
            "SGST_Value": "25",
            "IGST": "",
            "IGST_Value": "",
            "PoItemNumber": "1"
        }
        po_data = {
            "customer_product_id": "APID123",
            "po_number": "PO123",
            "ean": "EAN123"
        }

        result = self.transformer.invoice_items_transformer(item, po_data)
        self.assertIsInstance(result, InvoiceItem)
        self.assertEqual(result.itemSequenceNumber, 1)

   
if __name__ == '__main__':
    unittest.main()