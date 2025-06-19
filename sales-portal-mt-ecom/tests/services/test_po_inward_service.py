import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from src.services.po_inward_service import PoInwardService
from src.models.dto.po_dto import PoDTO
from src.enums.customers_enum import Customers
from src.enums.success_message import SuccessMessage
from src.enums.mt_ecom_status_type import MtEcomStatusType
from src.enums.error_message import ErrorMessage
from src.exceptions.po_transformer_exception import PoTransformerException
from src.exceptions.so_exception import SoException
from src.exceptions.sqs_exception import SQSException
from src.exceptions.po_acknowledgement_exception import PoAcknowledgementException
from src.exceptions.S3_exception import S3Exception
import pytz

class TestPoInwardService(unittest.TestCase):
    def setUp(self):
        self.svc = PoInwardService()

    @patch("src.services.po_inward_service.BlinkitTransformers")
    @patch("src.services.po_inward_service.AmazonTransformers")
    @patch("src.services.po_inward_service.BigBasketTransformers")
    @patch("src.services.po_inward_service.AmazonAcknowledgementsDTO")
    @patch("src.services.po_inward_service.mulesoft_service")
    def test_convert_customer_orders_amazon(
        self, mock_mulesoft_service, mock_amazon_ack_dto, mock_bigbasket_transformers, mock_amazon_transformers, mock_blinkit_transformers
    ):
        po_details = {"foo": "bar"}
        dummy_order1 = MagicMock(spec=PoDTO)
        dummy_order1.po_number = "123"
        dummy_order2 = MagicMock(spec=PoDTO)
        dummy_order2.po_number = "456"
        dummy_orders = [dummy_order1, dummy_order2]
        mock_amazon_transformers.return_value.po_transformer.return_value = dummy_orders
        mock_amazon_ack_dto.return_value = MagicMock()
        mock_mulesoft_service.acknowledgement.return_value = {"ack": "sent"}

        svc = PoInwardService()
        svc.AMAZON_TRANSFORMERS = mock_amazon_transformers.return_value
        svc.BIGBASKET_TRANSFORMERS = mock_bigbasket_transformers.return_value
        svc.BLINKIT_TRANSFORMERS = mock_blinkit_transformers.return_value
        svc.transformed_order_details = MagicMock(return_value="transformed!")  # Avoid PoDTO logic

        result = svc.convert_customer_orders(po_details, Customers.AMAZON, "loc", "reqid")
        self.assertEqual(result, {"ack": "sent"})

    @patch("src.services.po_inward_service.BlinkitTransformers")
    def test_convert_customer_orders_blinkit(self, mock_blinkit_transformers):
        po_details = {"foo": "bar"}
        dummy_order = MagicMock(spec=PoDTO)
        dummy_order.po_number = "999"
        mock_blinkit_transformers.return_value.po_transformer.return_value = dummy_order

        svc = PoInwardService()
        svc.BLINKIT_TRANSFORMERS = mock_blinkit_transformers.return_value
        svc.transformed_order_details = MagicMock(return_value="transformed!")
        result = svc.convert_customer_orders(po_details, Customers.BLINKIT, "loc", "reqid")
        self.assertEqual(result, "transformed!")

    def test_convert_customer_orders_invalid_customer(self):
        svc = PoInwardService()
        result = svc.convert_customer_orders({}, "NONEXISTENT")
        self.assertFalse(result)

    @patch("src.services.po_inward_service.BlinkitTransformers")
    def test_convert_customer_orders_exception(self, mock_blinkit_transformers):
        svc = PoInwardService()
        svc.BLINKIT_TRANSFORMERS = mock_blinkit_transformers.return_value
        svc.BLINKIT_TRANSFORMERS.po_transformer.side_effect = Exception("fail")
        with self.assertRaises(PoTransformerException):
            svc.convert_customer_orders({}, Customers.BLINKIT)

    @patch("src.services.po_inward_service.pytz.timezone", return_value=pytz.timezone("Asia/Kolkata"))
    def test_so_creation_success(self, mock_tz):
    # Arrange
        svc = PoInwardService()
        
        # Mock SAP_TRANSFORMERS
        svc.SAP_TRANSFORMERS = MagicMock()
        mock_payload = MagicMock()
        mock_payload.PoNumber = "abc"
        mock_payload.model_dump.return_value = {"po_number": "abc"}
        svc.SAP_TRANSFORMERS.convert_pieces_to_cases.return_value = MagicMock()
        svc.SAP_TRANSFORMERS.so_payload.return_value = mock_payload
        
        # Mock SAP_SERVICE
        svc.SAP_SERVICE = MagicMock()
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "data": {
                "data": {
                    "d": {
                        "NAVRES": {
                            "results": [
                                {
                                    "Sales_Order_Number": "123",
                                    "Type": "S",
                                    "Message": "Success"
                                }
                            ]
                        },
                        "NAVITEM": {
                            "results": [
                                {
                                    "ItemNumber": "1",
                                    "SystemSKUCode": "sku",
                                    "TargetQty": 5,
                                    "ROR": "-",
                                    "MRP": 100,
                                    "case_lot": 1
                                }
                            ]
                        }
                    }
                }
            }
        }
        svc.SAP_SERVICE.create_so.return_value = mock_response
        
        # Mock PO_PROCESSING_SO_CREATION_MODEL
        svc.PO_PROCESSING_SO_CREATION_MODEL = MagicMock()
        svc.PO_PROCESSING_SO_CREATION_MODEL.get_so_status.return_value = [{'so_flag': True}]
        
        # Mock other services
        svc.DATA_PERSIST_SERVICE = MagicMock()
        svc.MAIL_HELPER = MagicMock()
        svc.RESPONSE_HANDLERS = MagicMock()
        
        # Act
        result = svc.so_creation(MagicMock(po_number="abc"), "headerid")
        
        # Assert
        self.assertEqual(result["message"], SuccessMessage.SALES_ORDER_CREATE_SUCCESS)
        
        # Verify calls
        svc.SAP_SERVICE.create_so.assert_called_once_with(
            mock_payload.model_dump(),
            mock_payload.PoNumber
        )
        svc.DATA_PERSIST_SERVICE.save_req_res.assert_called_once()

   
    @patch("src.services.po_inward_service.pytz.timezone", return_value=pytz.timezone("Asia/Kolkata"))
    def test_so_creation_failure(self, mock_tz):
        # Arrange
        svc = PoInwardService()
        
        # Mock SAP_TRANSFORMERS
        svc.SAP_TRANSFORMERS = MagicMock()
        mock_payload = MagicMock()
        mock_payload.PoNumber = "abc"
        mock_payload.model_dump.return_value = {"po_number": "abc"}
        svc.SAP_TRANSFORMERS.convert_pieces_to_cases.return_value = MagicMock()
        svc.SAP_TRANSFORMERS.so_payload.return_value = mock_payload
        
        # Mock SAP_SERVICE
        svc.SAP_SERVICE = MagicMock()
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "data": {
                "data": {
                    "d": {
                        "NAVRES": {"results": [{"Type": "E", "Message": "Error"}]},
                        "NAVITEM": {"results": []}
                    }
                }
            }
        }
        svc.SAP_SERVICE.create_so.return_value = mock_response
        
        # Mock other services
        svc.DATA_PERSIST_SERVICE = MagicMock()
        svc.PO_PROCESSING_SO_CREATION_MODEL = MagicMock()
        svc.MAIL_HELPER = MagicMock()
        svc.RESPONSE_HANDLERS = MagicMock()
        svc.RESPONSE_HANDLERS.send.return_value = {"message": ErrorMessage.SALES_ORDER_CREATE_FAILED}
        
        # Act
        result = svc.so_creation(MagicMock(po_number="abc"), "headerid")
        
        # Assert
        self.assertEqual(result["message"], ErrorMessage.SALES_ORDER_CREATE_FAILED)
        
        # Verify calls
        svc.SAP_SERVICE.create_so.assert_called_once_with(
            mock_payload.model_dump(),
            mock_payload.PoNumber
        )
        svc.DATA_PERSIST_SERVICE.save_req_res.assert_called_once()

    @patch("src.services.po_inward_service.pytz.timezone", return_value=pytz.timezone("Asia/Kolkata"))
    @patch("src.services.po_inward_service.mulesoft_service")
    def test_so_creation_exception(self, mock_mulesoft_service, mock_tz):
        svc = PoInwardService()
        svc.SAP_TRANSFORMERS = MagicMock()
        svc.SAP_TRANSFORMERS.convert_pieces_to_cases.return_value = MagicMock()
        svc.SAP_TRANSFORMERS.so_payload.return_value = MagicMock(PoNumber="abc")
        svc.DATA_PERSIST_SERVICE = MagicMock()
        svc.RESPONSE_HANDLERS = MagicMock()
        mock_mulesoft_service.so_creation.side_effect = Exception("fail")
        with self.assertRaises(SoException):
            svc.so_creation(MagicMock(po_number="abc"), "headerid")

    @patch("src.services.po_inward_service.pd.DataFrame")
    @patch("src.services.po_inward_service.HelperClass")
    def test_mt_ecom_download_reports_email(self, mock_helper_class, mock_df):
        svc = PoInwardService()
        svc.MAIL_HELPER = MagicMock()
        svc.DATA_PERSIST_MODEL = MagicMock()
        svc.DATA_PERSIST_MODEL.download_reports.return_value = [{"customer": "foo", "plant_code": "bar"}]
        svc.HELPER_CLASS = MagicMock()
        svc.MAIL_HELPER.send_ecom_reports.return_value = "Email Sent Succesfully"
        data = {"type": "email"}
        mock_df.return_value.sort_values.return_value = MagicMock()
        result = svc.mt_ecom_download_reports(data)
        self.assertEqual(result, "Email Sent Succesfully")

    @patch("src.services.po_inward_service.pd.DataFrame")
    @patch("src.services.po_inward_service.HelperClass")
    def test_mt_ecom_download_reports_records(self, mock_helper_class, mock_df):
        svc = PoInwardService()
        svc.MAIL_HELPER = MagicMock()
        svc.DATA_PERSIST_MODEL = MagicMock()
        svc.DATA_PERSIST_MODEL.download_reports.return_value = [{"customer": "foo", "plant_code": "bar"}]
        svc.HELPER_CLASS = MagicMock()
        # Fix: Patch BOTH sort_values().to_dict() AND just to_dict()
        mock_df_instance = MagicMock()
        mock_df.return_value = mock_df_instance
        mock_df_instance.sort_values.return_value = mock_df_instance
        mock_df_instance.to_dict.return_value = {"records": [{"foo": "bar"}]}


    @patch("src.services.po_inward_service.pd.DataFrame")
    def test_mt_ecom_download_reports_exception(self, mock_df):
        svc = PoInwardService()
        svc.DATA_PERSIST_MODEL = MagicMock()
        svc.DATA_PERSIST_MODEL.download_reports.side_effect = Exception("fail")
        result = svc.mt_ecom_download_reports({})
        self.assertIsNone(result)

    def test_export_po_data_success(self):
        svc = PoInwardService()
        svc.DATA_PERSIST_MODEL = MagicMock()
        svc.DATA_PERSIST_MODEL.export_po_data.return_value = [{"foo":"bar"}]
        result = svc.export_po_data({"foo": "bar"})
        self.assertEqual(result, [{"foo":"bar"}])

    def test_export_po_data_exception(self):
        svc = PoInwardService()
        svc.DATA_PERSIST_MODEL = MagicMock()
        svc.DATA_PERSIST_MODEL.export_po_data.side_effect = Exception("fail")
        result = svc.export_po_data({"foo": "bar"})
        self.assertIsNone(result)

    @patch("src.services.po_inward_service.S3Service")
    @patch("src.services.po_inward_service.DataPersistService")
    @patch("src.services.po_inward_service.PoAckService")
    @patch("src.services.po_inward_service.SQSHelper")
    def test_transformed_order_details_success(self, mock_sqs_helper, mock_po_ack_service, mock_data_persist_service, mock_s3_service):
        svc = PoInwardService()
        svc.S3_SERVICE = mock_s3_service.return_value
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.PO_ACK_SERVICE = mock_po_ack_service.return_value
        svc.SQS_HELPER = mock_sqs_helper.return_value

        po_details = MagicMock(spec=PoDTO)
        po_details.po_number = "PO123"
        po_details.model_dump_json.return_value = '{"po_number": "PO123"}'
        svc.DATA_PERSIST_SERVICE.get_so_number.return_value = False
        svc.PO_ACK_SERVICE.po_acknowledgement.return_value = "ack"
        svc.DATA_PERSIST_SERVICE.fetch_workflow_configurations.return_value = {"acknowledgement": True}

        result = svc.transformed_order_details(po_details, Customers.BLINKIT, "PO123", {"raw": "data"})
        self.assertEqual(result, "ack")

    @patch("src.services.po_inward_service.S3Service")
    @patch("src.services.po_inward_service.DataPersistService")
    @patch("src.services.po_inward_service.PoAckService")
    @patch("src.services.po_inward_service.SQSHelper")
    def test_transformed_order_details_no_ack(self, mock_sqs_helper, mock_po_ack_service, mock_data_persist_service, mock_s3_service):
        svc = PoInwardService()
        svc.S3_SERVICE = mock_s3_service.return_value
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.PO_ACK_SERVICE = mock_po_ack_service.return_value
        svc.SQS_HELPER = mock_sqs_helper.return_value

        po_details = MagicMock(spec=PoDTO)
        po_details.po_number = "PO123"
        po_details.model_dump_json.return_value = '{"po_number": "PO123"}'
        svc.DATA_PERSIST_SERVICE.get_so_number.return_value = False
        svc.DATA_PERSIST_SERVICE.fetch_workflow_configurations.return_value = {"acknowledgement": False}

        result = svc.transformed_order_details(po_details, Customers.BLINKIT, "PO123", {"raw": "data"})
        self.assertEqual(result, "No Acknowledgment")

    @patch("src.services.po_inward_service.DataPersistService")
    def test_transformed_order_details_so_exists(self, mock_data_persist_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.DATA_PERSIST_SERVICE.get_so_number.return_value = True
        po_details = MagicMock(spec=PoDTO)
        po_details.po_number = "PO123"
        po_details.model_dump_json.return_value = '{"po_number": "PO123"}'
        result = svc.transformed_order_details(po_details, Customers.BLINKIT, "PO123", {"raw": "data"})
        self.assertFalse(result)

    @patch("src.services.po_inward_service.DataPersistService")
    def test_transformed_order_details_sqs_exception(self, mock_data_persist_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.DATA_PERSIST_SERVICE.get_so_number.return_value = False
        svc.SQS_HELPER = MagicMock()
        svc.SQS_HELPER.send_data_so_sqs.side_effect = SQSException("fail", "log")
        po_details = MagicMock(spec=PoDTO)
        po_details.po_number = "PO123"
        po_details.model_dump_json.return_value = '{"po_number": "PO123"}'
        result = svc.transformed_order_details(po_details, Customers.BLINKIT, "PO123", {"raw": "data"})
        self.assertFalse(result)

    @patch("src.services.po_inward_service.DataPersistService")
    def test_transformed_order_details_po_ack_exception(self, mock_data_persist_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.DATA_PERSIST_SERVICE.get_so_number.return_value = False
        svc.SQS_HELPER = MagicMock()
        svc.PO_ACK_SERVICE = MagicMock()
        svc.PO_ACK_SERVICE.po_acknowledgement.side_effect = PoAcknowledgementException("fail", "fail_msg")
        svc.DATA_PERSIST_SERVICE.fetch_workflow_configurations.return_value = {"acknowledgement": True}
        po_details = MagicMock(spec=PoDTO)
        po_details.po_number = "PO123"
        po_details.model_dump_json.return_value = '{"po_number": "PO123"}'
        result = svc.transformed_order_details(po_details, Customers.BLINKIT, "PO123", {"raw": "data"})
        self.assertFalse(result)

    @patch("src.services.po_inward_service.DataPersistService")
    def test_transformed_order_details_s3_exception(self, mock_data_persist_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.DATA_PERSIST_SERVICE.get_so_number.return_value = False
        svc.SQS_HELPER = MagicMock()
        svc.PO_ACK_SERVICE = MagicMock()
        svc.S3_SERVICE = MagicMock()
        svc.S3_SERVICE.send_po_to_s3.side_effect = S3Exception("fail", "log")
        po_details = MagicMock(spec=PoDTO)
        po_details.po_number = "PO123"
        po_details.model_dump_json.return_value = '{"po_number": "PO123"}'
        result = svc.transformed_order_details(po_details, Customers.BLINKIT, "PO123", {"raw": "data"})
        self.assertFalse(result)

    @patch("src.services.po_inward_service.DataPersistService")
    def test_delete_po_type_status(self, mock_data_persist_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.DATA_PERSIST_SERVICE.change_po_status.return_value = "UPDATED"
        result = svc.delete_po({'type': True})
        self.assertEqual(result, {"status": "Success", "Status Updated": "UPDATED"})

    @patch("src.services.po_inward_service.DataPersistService")
    def test_delete_po_delete(self, mock_data_persist_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.DATA_PERSIST_SERVICE.delete_po.return_value = "DELETED"
        result = svc.delete_po({'type': False})
        self.assertEqual(result, {"status": "success", "PO Deleted": "DELETED"})

    @patch("src.services.po_inward_service.DataPersistService")
    def test_delete_po_exception(self, mock_data_persist_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.DATA_PERSIST_SERVICE.delete_po.side_effect = Exception("fail")
        result = svc.delete_po({'type': False})
        self.assertIsNone(result)

    @patch("src.services.po_inward_service.S3Service")
    @patch("src.services.po_inward_service.DataPersistService")
    @patch("src.services.po_inward_service.ENV", "ENV")
    def test_mt_ecom_download_po_xml(self, mock_data_persist_service, mock_s3_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.S3_SERVICE = mock_s3_service.return_value
        svc.DATA_PERSIST_SERVICE.get_po_copy.return_value = {'xml_file_name': 'file.xml'}
        svc.S3_SERVICE.receive_data_from_s3_shopify.return_value = "<xml/>"
        import asyncio
        result = asyncio.run(svc.mt_ecom_download_po({'po': "PO123"}))
        self.assertEqual(result, {"type": "xml", "data": "<xml/>"})

    @patch("src.services.po_inward_service.S3Service")
    @patch("src.services.po_inward_service.DataPersistService")
    @patch("src.services.po_inward_service.ENV", "ENV")
    def test_mt_ecom_download_po_json(self, mock_data_persist_service, mock_s3_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.S3_SERVICE = mock_s3_service.return_value
        svc.DATA_PERSIST_SERVICE.get_po_copy.return_value = {}
        svc.S3_SERVICE.get_file_by_prefix.return_value = {'Contents': [{'Key': 'somekey'}]}
        svc.S3_SERVICE.receive_data_from_s3_shopify.return_value = '{"data": 123}'
        import asyncio
        result = asyncio.run(svc.mt_ecom_download_po({'po': "PO123"}))
        self.assertEqual(result, {"type": "json", "data": '{"data": 123}'})

    @patch("src.services.po_inward_service.S3Service")
    @patch("src.services.po_inward_service.DataPersistService")
    @patch("src.services.po_inward_service.ENV", "ENV")
    def test_mt_ecom_download_po_json_no_contents(self, mock_data_persist_service, mock_s3_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.S3_SERVICE = mock_s3_service.return_value
        svc.DATA_PERSIST_SERVICE.get_po_copy.return_value = {}
        svc.S3_SERVICE.get_file_by_prefix.return_value = {}
        import asyncio
        result = asyncio.run(svc.mt_ecom_download_po({'po': "PO123"}))
        self.assertIsNone(result)

    @patch("src.services.po_inward_service.S3Service")
    @patch("src.services.po_inward_service.DataPersistService")
    @patch("src.services.po_inward_service.ENV", "ENV")
    def test_mt_ecom_download_po_exception(self, mock_data_persist_service, mock_s3_service):
        svc = PoInwardService()
        svc.DATA_PERSIST_SERVICE = mock_data_persist_service.return_value
        svc.S3_SERVICE = mock_s3_service.return_value
        svc.DATA_PERSIST_SERVICE.get_po_copy.side_effect = Exception("fail")
        import asyncio
        result = asyncio.run(svc.mt_ecom_download_po({'po': "PO123"}))
        self.assertIsNone(result)

if __name__ == "__main__":
    unittest.main()