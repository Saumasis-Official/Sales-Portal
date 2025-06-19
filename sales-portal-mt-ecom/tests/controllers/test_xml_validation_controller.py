import unittest
from unittest.mock import patch, MagicMock
from src.controllers.xml_validation_controller import XmlValidationController

class TestXmlValidationController(unittest.TestCase):

    @patch("src.controllers.xml_validation_controller.xml_validation_service")
    def test_validate_xml_success(self, mock_service):
        """Test case for successful XML validation"""
        request = {"xml_data": "<root><child>Test</child></root>"}
        mock_service.validate_xml_services.return_value = True

        controller = XmlValidationController()
        result = controller.validate_xml(request)

        mock_service.validate_xml_services.assert_called_once_with(request)
        self.assertTrue(result)

    @patch("src.controllers.xml_validation_controller.xml_validation_service")
    def test_validate_xml_failure(self, mock_service):
        """Test case for failed XML validation"""
        request = {"xml_data": "<root><child>Test</child></root>"}
        mock_service.validate_xml_services.return_value = False

        controller = XmlValidationController()
        result = controller.validate_xml(request)

        mock_service.validate_xml_services.assert_called_once_with(request)
        self.assertFalse(result)

    @patch("src.controllers.xml_validation_controller.print")  
    @patch("src.controllers.xml_validation_controller.xml_validation_service")
    def test_validate_xml_exception(self, mock_service, mock_print):
        """Test case for handling exceptions"""
        request = {"xml_data": "<root><child>Test</child></root>"}
        mock_service.validate_xml_services.side_effect = Exception("Service Error")

        controller = XmlValidationController()
        result = controller.validate_xml(request)

        mock_service.validate_xml_services.assert_called_once_with(request)

        
        mock_print.assert_called_once()
        printed_arg = mock_print.call_args[0][0]
        self.assertIn("Service Error", str(printed_arg))  

        self.assertFalse(result)

if __name__ == "__main__":
    unittest.main()
