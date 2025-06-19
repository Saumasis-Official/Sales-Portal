import unittest
from unittest.mock import patch, Mock, AsyncMock
from src.controllers.shopify_controller import ShopifyController


class TestShopifyController(unittest.IsolatedAsyncioTestCase):  
    def setUp(self):
        self.controller = ShopifyController()
        self.controller.SHOPIFY_SERVICE = Mock()

    def test_sap_request_response_payload_request(self):
        payload = {"key": "value"}
        req_type = {"type": "request"}
        self.controller.SHOPIFY_SERVICE.sap_request_payload_persistance.return_value = {"status": "success"}
        
        result = self.controller.sap_request_response_payload(payload, req_type)
        
        self.controller.SHOPIFY_SERVICE.sap_request_payload_persistance.assert_called_once_with(payload)
        self.controller.SHOPIFY_SERVICE.sap_response_persistance.assert_called_once_with(payload)
        self.assertEqual(result, {"status": "success"})

    def test_sap_request_response_payload_invalid_type(self):
        payload = {"key": "value"}
        req_type = {"type": "invalid"}
        
        result = self.controller.sap_request_response_payload(payload, req_type)
        
        self.assertEqual(result, {"status": "failure", "message": "Invalid request type"})

    def test_po_list(self):
        data = {"filter": "test"}
        self.controller.SHOPIFY_SERVICE.po_list.return_value = {"orders": []}
        
        result = self.controller.po_list(data)
        
        self.controller.SHOPIFY_SERVICE.po_list.assert_called_once_with(data)
        self.assertEqual(result, {"orders": []})

    def test_po_items(self):
        params = {"po_number": "PO123"}
        self.controller.SHOPIFY_SERVICE.po_items.return_value = {"items": []}
        
        result = self.controller.po_items(params)
        
        self.controller.SHOPIFY_SERVICE.po_items.assert_called_once_with(params)
        self.assertEqual(result, {"items": []})

    def test_shopify_reports_success(self):
        data = {"report": "sales"}
        self.controller.SHOPIFY_SERVICE.shopify_reports.return_value = {"status": "success"}
        
        result = self.controller.shopify_reports(data)
        
        self.controller.SHOPIFY_SERVICE.shopify_reports.assert_called_once_with(data)
        self.assertEqual(result, {"status": "success"})

    def test_shopify_reports_exception(self):
        data = {"report": "sales"}
        self.controller.SHOPIFY_SERVICE.shopify_reports.side_effect = Exception("Test error")
        
        result = self.controller.shopify_reports(data)
        
        self.assertEqual(result, {"success": "failure", "error": "Test error"})

    def test_z_table_reports_success(self):
        data = {"table": "inventory"}
        self.controller.SHOPIFY_SERVICE.z_table_reports.return_value = {"status": "success"}
        
        result = self.controller.z_table_reports(data)
        
        self.controller.SHOPIFY_SERVICE.z_table_reports.assert_called_once_with(data)
        self.assertEqual(result, {"status": "success"})

    def test_fetch_all_shopify_customers(self):
        data = {"type": "all"}
        self.controller.SHOPIFY_SERVICE.fetch_all_shopify_customers.return_value = {"customers": []}
        
        result = self.controller.fetch_all_shopify_customers(data)
        
        self.controller.SHOPIFY_SERVICE.fetch_all_shopify_customers.assert_called_once_with(data)
        self.assertEqual(result, {"customers": []})

    def test_ror_reports_success(self):
        self.controller.SHOPIFY_SERVICE.ror_reports.return_value = {"status": "success"}
        
        result = self.controller.ror_reports()
        
        self.controller.SHOPIFY_SERVICE.ror_reports.assert_called_once()
        self.assertEqual(result, {"status": "success"})

    @patch("src.controllers.shopify_controller.Logger.error")
    async def test_delete_items_success(self, mock_logger):
        data = {"item_id": 123}
        self.controller.SHOPIFY_SERVICE.delete_item = AsyncMock(return_value={"status": "deleted"})
        
        result = await self.controller.delete_items(data)
        
        self.controller.SHOPIFY_SERVICE.delete_item.assert_called_once_with(data)
        self.assertEqual(result, {"status": "deleted"})

    @patch("src.controllers.shopify_controller.Logger.error")
    async def test_delete_items_exception(self, mock_logger):
        data = {"item_id": 123}
        self.controller.SHOPIFY_SERVICE.delete_item = AsyncMock(side_effect=Exception("Test error"))
        
        result = await self.controller.delete_items(data)
        
        self.assertEqual(result, {"success": "failure", "error": "Test error"})

    def test_resend_po_success(self):
        data = {"po_number": "PO123"}
        self.controller.SHOPIFY_SERVICE.resend_po.return_value = {"status": "resent"}
        
        result = self.controller.resend_po(data)
        
        self.controller.SHOPIFY_SERVICE.resend_po.assert_called_once_with(data)
        self.assertEqual(result, {"status": "resent"})


if __name__ == "__main__":
    unittest.main()
