import unittest
from unittest.mock import patch, MagicMock
from src.controllers.po_processing_so_creation_controller import PoProcessingSoCreationController

class TestPoProcessingSoCreationController(unittest.TestCase):

    def setUp(self):
        self.controller = PoProcessingSoCreationController()

    @patch("src.services.po_processing_so_creation_service.PoProcessingSoCreationService.po_processing_so_creation_service")
    def test_po_processing_so_creation_success(self, mock_service):
        """Test case for successful PO processing."""
        sample_data = {"po_number": "PO12345", "order_id": 123, "customer_name": "John Doe"}

        mock_service.return_value = {"status": "success"}

        response = self.controller.po_processing_so_creation(sample_data)

        self.assertEqual(response, {"status": "success"})

    @patch("src.services.po_processing_so_creation_service.PoProcessingSoCreationService.po_processing_so_creation_service")
    def test_po_processing_so_creation_exception(self, mock_service):
        """Test case for exception handling in PO processing."""
        sample_data = {"po_number": "PO12345", "order_id": 123, "customer_name": "John Doe"}

        mock_service.side_effect = Exception("Service Error")

        with self.assertRaises(Exception) as context:
            self.controller.po_processing_so_creation(sample_data)

        self.assertEqual(str(context.exception), "Service Error")

if __name__ == "__main__":
    unittest.main()
