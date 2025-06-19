import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from src.services.shopify_service import ShopifyService

class TestShopifyService(unittest.TestCase):
    def setUp(self):
        self.mock_payload = {
            "Orders": [{
                "LineItems": [{
                    "ItmNumber": "10",
                    "CustMaterialCode": "MC",
                    "OrderQuantity": "5",  # String type
                    "SalesUnit": "EA",
                    "ItemsConditions": [],
                    "ItemCateg": "ZOR"
                }],
                "SalesOrg": "SG",
                "DistrChan": "DC",
                "Division": "DV",
                "CurrencyCode": "INR",
                "OrderType": "OR",
                "CustomerReference": "PO123",
                "CustomerReferenceDate": "2024-05-21",
                "RequiredDeliveryDate": "2024-06-01",
                "ShipCond": "01",
                "ShipType": "STD",
                "ComplDlv": "Y",
                "OrderPartners": [{"PartnNumb": "CUST1"}],
                "HeaderConditions": [],
            }]
        }

    @patch("src.services.shopify_service.S3Service")
    @patch("src.services.shopify_service.ShopifyModel")
    def test_sap_request_payload_persistance_success(self, mock_model, mock_s3):
        mock_model.return_value.get_customer_name.return_value = "TestCustomer"
        mock_model.return_value.sap_request_payload_persistance.return_value = {"status": "success"}
        mock_s3.return_value.save_shopify_payload_response.return_value = "key"
        service = ShopifyService()
        result = service.sap_request_payload_persistance(self.mock_payload)
        self.assertEqual(result, {"status": "success"})

    @patch("src.services.shopify_service.S3Service")
    @patch("src.services.shopify_service.ShopifyModel")
    def test_sap_request_payload_persistance_validation_error(self, mock_model, mock_s3):
        bad_payload = {
            "Orders": [{
                "LineItems": [{
                    "ItmNumber": "10",
                    "CustMaterialCode": "MC",
                    "OrderQuantity": 5,  # Int for validation error
                    "SalesUnit": "EA",
                    "ItemsConditions": [],
                    "ItemCateg": "ZOR"
                }],
                "SalesOrg": "SG",
                "DistrChan": "DC",
                "Division": "DV",
                "CurrencyCode": "INR",
                "OrderType": "OR",
                "CustomerReference": "PO123",
                "CustomerReferenceDate": "2024-05-21",
                "RequiredDeliveryDate": "2024-06-01",
                "ShipCond": "01",
                "ShipType": "STD",
                "ComplDlv": "Y",
                "OrderPartners": [{"PartnNumb": "CUST1"}],
                "HeaderConditions": [],
            }]
        }
        service = ShopifyService()
        result = service.sap_request_payload_persistance(bad_payload)
        self.assertEqual(result["status"], "failure")

    @patch("src.services.shopify_service.ShopifyModel")
    def test_po_list_success(self, mock_model):
        mock_model.return_value.po_list.return_value = [{"po": 1}]
        service = ShopifyService()
        resp = service.po_list({"id": 1})
        self.assertEqual(resp["status"], "success")
        self.assertIsInstance(resp["data"], list)

    @patch("src.services.shopify_service.ShopifyModel")
    def test_po_list_failure(self, mock_model):
        mock_model.return_value.po_list.side_effect = Exception("fail")
        service = ShopifyService()
        resp = service.po_list({"id": 1})
        self.assertEqual(resp["status"], "failure")

    @patch("src.services.shopify_service.ShopifyModel")
    def test_po_items_success(self, mock_model):
        mock_model.return_value.po_items.return_value = [{"item": 1}]
        service = ShopifyService()
        resp = service.po_items({"id": 1})
        self.assertEqual(resp["status"], "success")
        self.assertIsInstance(resp["data"], list)

    @patch("src.services.shopify_service.ShopifyModel")
    def test_po_items_failure(self, mock_model):
        mock_model.return_value.po_items.side_effect = Exception("fail")
        service = ShopifyService()
        resp = service.po_items({"id": 1})
        self.assertEqual(resp["status"], "failure")

    @patch("src.services.shopify_service.ShopifyModel")
    def test_fetch_all_shopify_customers_success(self, mock_model):
        mock_model.return_value.fetch_all_shopify_customers.return_value = [{"id": 1}]
        service = ShopifyService()
        resp = service.fetch_all_shopify_customers({"foo": "bar"})
        self.assertEqual(resp, [{"id": 1}])

    @patch("src.services.shopify_service.ShopifyModel")
    def test_fetch_all_shopify_customers_failure(self, mock_model):
        mock_model.return_value.fetch_all_shopify_customers.side_effect = Exception("fail")
        service = ShopifyService()
        resp = service.fetch_all_shopify_customers({"foo": "bar"})
        self.assertIsNone(resp)

    @patch("src.services.shopify_service.ShopifyModel")
    def test_z_table_persistance_success(self, mock_model):
        mock_model.return_value.z_table_persistance.return_value = {"status": "success"}
        service = ShopifyService()
        resp = service.z_table_persistance({"foo": "bar"})
        self.assertEqual(resp, {"status": "success"})

    @patch("src.services.shopify_service.ShopifyModel")
    def test_z_table_persistance_failure(self, mock_model):
        mock_model.return_value.z_table_persistance.side_effect = Exception("fail")
        service = ShopifyService()
        resp = service.z_table_persistance({"foo": "bar"})
        self.assertEqual(resp["status"], "failure")

    @patch("src.services.shopify_service.ShopifyModel")
    def test_delete_item_success(self, mock_model):
        mock_model.return_value.delete_items = AsyncMock(return_value={"status": "success"})
        service = ShopifyService()
        import asyncio
        result = asyncio.run(service.delete_item({"foo": "bar"}))
        self.assertEqual(result["status"], "success")

    @patch("src.services.shopify_service.ShopifyModel")
    def test_delete_item_failure(self, mock_model):
        mock_model.return_value.delete_items = AsyncMock(side_effect=Exception("fail"))
        service = ShopifyService()
        import asyncio
        result = asyncio.run(service.delete_item({"foo": "bar"}))
        self.assertEqual(result["status"], "failure")

if __name__ == "__main__":
    unittest.main()