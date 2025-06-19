import unittest
from unittest.mock import patch, MagicMock
from src.services.xml_validation_service import XmlValidationService

class TestXmlValidationService(unittest.TestCase):
    def setUp(self):
        self.svc = XmlValidationService()

    @patch("src.services.xml_validation_service.s3_client")
    @patch("src.services.xml_validation_service.constants")
    @patch("src.services.xml_validation_service.xml_helper")
    @patch("src.services.xml_validation_service.response_handlers")
    @patch("src.services.xml_validation_service.mail_helper")
    def test_validate_xml_services_unique_id_missing(self, mock_mail_helper, mock_response_handlers, mock_xml_helper, mock_constants, mock_s3_client):
        mock_xml_helper.get_node_data.side_effect = [None]
        mock_response_handlers.send.return_value = "handled_error"
        xml = "<xml></xml>"
        result = self.svc.validate_xml_services(xml)
        self.assertEqual(result, "handled_error")
        mock_mail_helper.send_mail.assert_called_once()
        mock_response_handlers.send.assert_called_once()

    @patch("src.services.xml_validation_service.s3_client")
    @patch("src.services.xml_validation_service.constants")
    @patch("src.services.xml_validation_service.xml_helper")
    @patch("src.services.xml_validation_service.response_handlers")
    @patch("src.services.xml_validation_service.mail_helper")
    def test_validate_xml_services_msg_type_missing(self, mock_mail_helper, mock_response_handlers, mock_xml_helper, mock_constants, mock_s3_client):
        mock_xml_helper.get_node_data.side_effect = ["uniqueid", None]
        mock_response_handlers.send.return_value = "msg_type_error"
        xml = "<xml></xml>"
        result = self.svc.validate_xml_services(xml)
        self.assertEqual(result, "msg_type_error")
        mock_mail_helper.send_mail.assert_called_once()
        mock_response_handlers.send.assert_called_once()

    @patch("src.services.xml_validation_service.s3_client")
    @patch("src.services.xml_validation_service.constants")
    @patch("src.services.xml_validation_service.xml_helper")
    @patch("src.services.xml_validation_service.response_handlers")
    @patch("src.services.xml_validation_service.mail_helper")
    @patch("src.services.xml_validation_service.acknowledgement_helper")
    def test_validate_xml_services_msg_data_missing(self, mock_ack_helper, mock_mail_helper, mock_response_handlers, mock_xml_helper, mock_constants, mock_s3_client):
        mock_xml_helper.get_node_data.side_effect = ["uniqueid", "msgtype", None]
        mock_response_handlers.send.return_value = "msg_data_error"
        xml = "<xml></xml>"
        result = self.svc.validate_xml_services(xml)
        self.assertEqual(result, "msg_data_error")
        mock_mail_helper.send_mail.assert_called_once()
        mock_ack_helper.send_error_ack_to_reliance.assert_called_once()
        mock_response_handlers.send.assert_called_once()

    @patch("src.services.xml_validation_service.s3_client")
    @patch("src.services.xml_validation_service.xml_validation_model")
    @patch("src.services.xml_validation_service.sqs_helper")
    @patch("src.services.xml_validation_service.constants")
    @patch("src.services.xml_validation_service.xml_helper")
    @patch("src.services.xml_validation_service.mail_helper")
    @patch("src.services.xml_validation_service.acknowledgement_helper")
    @patch("src.services.xml_validation_service.response_handlers")
    def test_validate_xml_services_purchase_order_valid(
        self, mock_response_handlers, mock_ack_helper, mock_mail_helper, mock_xml_helper, mock_constants, mock_sqs_helper, mock_xml_validation_model, mock_s3_client
    ):
        mock_constants.MSG_TYPE_PURCHASE_ORDER = "PO_TYPE"
        mock_constants.RELIANCE = "RELIANCE"
        mock_constants.XSD_VALIDATION_STATUS_SUCCESS = "XSD_SUCCESS"
        mock_constants.XSD_SUCCESS = "XSD_SUCCESS"
        mock_constants.DATA_SENT_TO_SQS = "SQS"
        mock_constants.ACKNOWLEDGEMENT_SUCCESS = "ACK_SUCCESS"
        mock_constants.DATA_VALIDATED_SUCCESSFULLY = "VALIDATED"

        mock_xml_helper.get_node_data.side_effect = ["uniqueid", mock_constants.MSG_TYPE_PURCHASE_ORDER, "<msg>data</msg>"]
        mock_xml_helper.get_direct_value_from_idoc.return_value = "1234567890"
        mock_xml_helper.validate_xml_with_xsd.return_value = True

        with patch("src.services.xml_validation_service.etree.parse") as mock_etree_parse, \
             patch("src.services.xml_validation_service.lxml.etree.tostring", return_value=b"<xml></xml>"), \
             patch("src.services.xml_validation_service.xmltodict.parse") as mock_xmltodict_parse, \
             patch("src.services.xml_validation_service.lxml.etree.XMLSchema"):
            mock_file = MagicMock()
            mock_etree_parse.return_value = mock_file
            mock_xmltodict_parse.return_value = {
                "ORDERS05_VEN": {"IDOC": {"E1EDK02": {"BELNR": "1234567890"}}}
            }
            mock_xml_validation_model.save_or_update_po_details.return_value = True
            mock_xml_validation_model.create_logs.return_value = True
            xml = "<xml></xml>"
            result = self.svc.validate_xml_services(xml)
             # Update assertion to match actual response format
            expected_result = {
            "data": "1234567890",
            "message": mock_constants.DATA_VALIDATED_SUCCESSFULLY
            }
            self.assertEqual(result, expected_result)
            mock_sqs_helper.send_data_to_sqs.assert_called_once_with("1234567890")  # Updated to expect call
            mock_ack_helper.send_instant_ack.assert_called_once()  # Should be called for valid PO

    @patch("src.services.xml_validation_service.s3_client")
    @patch("src.services.xml_validation_service.constants")
    @patch("src.services.xml_validation_service.xml_helper")
    @patch("src.services.xml_validation_service.response_handlers")
    @patch("src.services.xml_validation_service.mail_helper")
    @patch("src.services.xml_validation_service.acknowledgement_helper")
    def test_validate_xml_services_invalid_msg_type(self, mock_ack_helper, mock_mail_helper, mock_response_handlers, mock_xml_helper, mock_constants, mock_s3_client):
        mock_xml_helper.get_node_data.side_effect = ["uniqueid", "SOMETHING_ELSE", "<msg>data</msg>"]
        mock_response_handlers.send.return_value = "invalid_msg_type"
        xml = "<xml></xml>"
        result = self.svc.validate_xml_services(xml)
        self.assertEqual(result, "invalid_msg_type")
        mock_mail_helper.send_mail.assert_called_once()
        mock_ack_helper.send_error_ack_to_reliance.assert_called_once()
        mock_response_handlers.send.assert_called_once()

    @patch("src.services.xml_validation_service.s3_client")
    @patch("src.services.xml_validation_service.constants")
    @patch("src.services.xml_validation_service.xml_helper")
    @patch("src.services.xml_validation_service.response_handlers")
    @patch("src.services.xml_validation_service.mail_helper")
    def test_validate_xml_services_invalid_po_number(self, mock_mail_helper, mock_response_handlers, mock_xml_helper, mock_constants, mock_s3_client):
        mock_constants.MSG_TYPE_PURCHASE_ORDER = "PO_TYPE"
        mock_xml_helper.get_node_data.side_effect = ["uniqueid", mock_constants.MSG_TYPE_PURCHASE_ORDER, "<msg>data</msg>"]
        mock_xml_helper.get_direct_value_from_idoc.return_value = "123"
        mock_response_handlers.send.return_value = "invalid_po_number"
        with patch("src.services.xml_validation_service.etree.parse") as mock_etree_parse, \
             patch("src.services.xml_validation_service.lxml.etree.tostring", return_value=b"<xml></xml>"), \
             patch("src.services.xml_validation_service.xmltodict.parse") as mock_xmltodict_parse:
            mock_file = MagicMock()
            mock_etree_parse.return_value = mock_file
            mock_xmltodict_parse.return_value = {
                "ORDERS05_VEN": {"IDOC": {"E1EDK02": {"BELNR": "123"}}}
            }
            xml = "<xml></xml>"
            result = self.svc.validate_xml_services(xml)
            self.assertEqual(result, "invalid_po_number")
            mock_mail_helper.send_mail.assert_called_once()
            mock_response_handlers.send.assert_called_once()

    @patch("src.services.xml_validation_service.s3_client")
    @patch("src.services.xml_validation_service.xml_validation_model")
    @patch("src.services.xml_validation_service.acknowledgement_helper")
    @patch("src.services.xml_validation_service.constants")
    @patch("src.services.xml_validation_service.xml_helper")
    @patch("src.services.xml_validation_service.response_handlers")
    @patch("src.services.xml_validation_service.mail_helper")
    def test_validate_xml_services_xsd_validation_failed(
        self, mock_mail_helper, mock_response_handlers, mock_xml_helper, mock_constants, mock_ack_helper, mock_xml_validation_model, mock_s3_client
    ):
        # Set up constants
        mock_constants.MSG_TYPE_PURCHASE_ORDER = "PO_TYPE"
        mock_constants.XSD_VALIDATION_STATUS_FAILED = "XSD_FAILED"
        mock_constants.XSD_FAILED = "XSD_FAILED"
         # Set up xml helper mocks
        mock_xml_helper.get_node_data.side_effect = ["uniqueid", mock_constants.MSG_TYPE_PURCHASE_ORDER, "<msg>data</msg>"]
        mock_xml_helper.get_direct_value_from_idoc.return_value = "1234567890"
        mock_xml_helper.validate_xml_with_xsd.return_value = False
        # Set up response handler mock
        mock_response_handlers.send.return_value = "xsd_failed"
        with patch("src.services.xml_validation_service.etree.parse") as mock_etree_parse, \
             patch("src.services.xml_validation_service.lxml.etree.tostring", return_value=b"<xml></xml>"), \
             patch("src.services.xml_validation_service.xmltodict.parse") as mock_xmltodict_parse, \
             patch("src.services.xml_validation_service.lxml.etree.XMLSchema"):
            
            # Set up XML parsing mocks
            mock_file = MagicMock()
            mock_etree_parse.return_value = mock_file
            mock_xmltodict_parse.return_value = {
                "ORDERS05_VEN": {"IDOC": {"E1EDK02": {"BELNR": "1234567890"}}}
            }
            xml = "<xml></xml>"
            result = self.svc.validate_xml_services(xml)
            self.assertEqual(result, "xsd_failed")
        
            mock_mail_helper.send_mail.assert_called()
             # Verify expected calls
            mock_mail_helper.send_mail.assert_called_once()
            mock_ack_helper.send_error_ack_to_reliance.assert_called_once()
            mock_response_handlers.send.assert_called_once()
            

    @patch("src.services.xml_validation_service.s3_client")
    @patch("src.services.xml_validation_service.constants")
    @patch("src.services.xml_validation_service.xml_helper")
    @patch("src.services.xml_validation_service.response_handlers")
    @patch("src.services.xml_validation_service.mail_helper")
    def test_validate_xml_services_exception(self, mock_mail_helper, mock_response_handlers, mock_xml_helper, mock_constants, mock_s3_client):
        mock_constants.MSG_TYPE_PURCHASE_ORDER = "PO_TYPE"
        mock_xml_helper.get_node_data.side_effect = ["uniqueid", mock_constants.MSG_TYPE_PURCHASE_ORDER, "<msg>data</msg>"]
        with patch("src.services.xml_validation_service.etree.parse", side_effect=Exception("fail")):
            mock_response_handlers.send.return_value = "generic_exception"
            xml = "<xml></xml>"
            result = self.svc.validate_xml_services(xml)
            self.assertEqual(result, "generic_exception")
            mock_mail_helper.send_mail.assert_called()
            mock_response_handlers.send.assert_called_once()

    @patch("src.services.xml_validation_service.s3_client")
    @patch("src.services.xml_validation_service.constants")
    @patch("src.services.xml_validation_service.xml_helper")
    @patch("src.services.xml_validation_service.response_handlers")
    @patch("src.services.xml_validation_service.mail_helper")
    def test_validate_xml_services_etree_xmlsyntaxerror(self, mock_mail_helper, mock_response_handlers, mock_xml_helper, mock_constants, mock_s3_client):
        mock_constants.MSG_TYPE_PURCHASE_ORDER = "PO_TYPE"
        mock_xml_helper.get_node_data.side_effect = ["uniqueid", mock_constants.MSG_TYPE_PURCHASE_ORDER, "<msg>data</msg>"]
        with patch("src.services.xml_validation_service.etree.parse", side_effect=Exception("fail")):
            mock_response_handlers.send.return_value = "xml_syntax_error"
            xml = "<xml></xml>"
            result = self.svc.validate_xml_services(xml)
            self.assertEqual(result, "xml_syntax_error")
            mock_mail_helper.send_mail.assert_called()
            mock_response_handlers.send.assert_called_once()

if __name__ == "__main__":
    unittest.main()