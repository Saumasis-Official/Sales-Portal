import lxml
import json
from lxml import etree
import boto3
import xmltodict
from io import BytesIO
import os
import xml
import xml.dom.minidom
import xml.etree.ElementTree as ET
import datetime
from src.utils.xml_helper import XMLHelper
from src.utils.mail_helper import MailHelper
from src.utils.sqs_helper import SQSHelper
from src.utils import constants
from src.utils.validation_acknowledgement_helper import AcknowledgementHelper
from src.utils.error_helper import ErrorHelper
from src.models.xml_validation_model import XmlValidationModel
from src.utils.response_handlers import ResponseHandlers
from src.config.configurations import S3_BUCKET_NAME

xml_validation_model = XmlValidationModel()
acknowledgement_helper = AcknowledgementHelper()
xml_helper = XMLHelper()
response_handlers = ResponseHandlers()
mail_helper = MailHelper()
sqs_helper = SQSHelper()
bucket_name = S3_BUCKET_NAME
s3_client = boto3.client("s3")
env = os.environ.get("ENV")


class XmlValidationService:
    def validate_xml_services(self, request):
        try:
            unique_id = None
            msg_type = None
            po_number = ""
            data_dict = ""
            data = {}
            root = ET.fromstring(request)
            error_helper = ErrorHelper()
            # Fetching UNIQUE_ID from soap request
            unique_id = xml_helper.get_node_data(root, constants.UNIQUE_ID)
            # Fetching MSG_TYPE from soap request
            msg_type = xml_helper.get_node_data(root, constants.MSG_TYPE)
            if unique_id == None:
                # mail part
                subject = "Error in PO Validation"
                body = {
                    "po_number": "",
                    "Message": constants.INVALID_REQUEST_UNIQUE_ID,
                    "type": constants.XML_VALIDATION_FAILED,
                }
                mail_helper.send_mail(body, subject)  # mail part
                # return error_helper.add_error(400, constants.INVALID_REQUEST_UNIQUE_ID)
                return response_handlers.send(400, constants.INVALID_REQUEST_UNIQUE_ID)
            if msg_type == None:
                # mail part
                subject = "Error in PO Validation"
                body = {
                    "po_number": "",
                    "Message": constants.INVALID_MSG_TYPE_NOT_FOUND,
                    "type": constants.XML_VALIDATION_FAILED,
                }
                mail_helper.send_mail(body, subject)  # mail part
                # return error_helper.add_error(400, constants.INVALID_MSG_TYPE_NOT_FOUND)
                return response_handlers.send(400, constants.INVALID_MSG_TYPE_NOT_FOUND)
            # Fetching MSG_DATA from soap request
            msg_data = xml_helper.get_node_data(root, constants.MSG_DATA)
            if msg_data == None:
                # mail part
                subject = "Error in PO Validation"
                body = {
                    "po_number": "",
                    "Message": constants.INVALID_MSG_DATA_MSG,
                    "type": constants.XML_VALIDATION_FAILED,
                }
                mail_helper.send_mail(body, subject)  # mail part
                acknowledgement_helper.send_error_ack_to_reliance(
                    unique_id, constants.INVALID_MSG_DATA_MSG
                )
                # return error_helper.add_error(400, constants.INVALID_MSG_DATA_MSG)
                return response_handlers.send(400, constants.INVALID_MSG_DATA_MSG)
            xml_file = bytes(bytearray(msg_data, encoding="utf-8"))
            xml_file = etree.parse(BytesIO(xml_file))
            if constants.MSG_TYPE_PURCHASE_ORDER == msg_type:
                try:
                    data_dict = xmltodict.parse(lxml.etree.tostring(xml_file))
                    if data_dict.get("ORDERS05_VEN") and data_dict.get(
                        "ORDERS05_VEN"
                    ).get("IDOC"):
                        idoc = data_dict.get("ORDERS05_VEN").get("IDOC")
                        po_number = xml_helper.get_direct_value_from_idoc(
                            idoc, "E1EDK02", "BELNR"
                        )
                        if po_number and len(po_number) == 10:
                            # sales_order_number = xml_validation_model.save_or_update_po_details(unique_id,po_number)
                            # To store the file in s3
                            xml_file_key = (
                                env
                                + "/"
                                + "XML/"
                                + po_number
                                + str(
                                    datetime.datetime.now().isoformat(
                                        timespec="seconds"
                                    )
                                    + "Z"
                                )
                            )
                            s3_client.put_object(
                                Bucket=bucket_name, Key=xml_file_key, Body=request
                            )
                            print(
                                f"Successfully uploaded {xml_file_key} to {bucket_name}"
                            )
                            json_file_key = (
                                env
                                + "/"
                                + "json/"
                                + po_number
                                + str(
                                    datetime.datetime.now().isoformat(
                                        timespec="seconds"
                                    )
                                    + "Z"
                                )
                            )
                            s3_client.put_object(
                                Bucket=bucket_name,
                                Key=json_file_key,
                                Body=json.dumps(data_dict),
                            )
                            data = {
                                "po_number": po_number,
                                "unique_id": unique_id,
                                "xml_file_key": xml_file_key,
                                "po_data": json.dumps(data_dict),
                                "po_date": datetime.datetime.now(),
                                "json_file_key": json_file_key,
                                "status": "",
                                "customer": constants.RELIANCE,
                            }
                        else:
                            # mail part
                            subject = "Error in PO Validation"
                            body = {
                                "po_number": po_number,
                                "Message": constants.INVALID_PO_NUMBER_MSG,
                                "type": constants.XML_VALIDATION_FAILED,
                            }
                            mail_helper.send_mail(subject, body)

                            # return error_helper.add_error(400,constants.INVALID_PO_NUMBER_MSG)
                            return response_handlers.send(
                                400, constants.INVALID_PO_NUMBER_MSG
                            )
                    filename = "src/utils/PO_ORDERS05_VEN.xsd"
                    xml_validator = lxml.etree.XMLSchema(file=filename)
                    print(filename)
                    validation_resp = xml_helper.validate_xml_with_xsd(
                        xml_validator, xml_file
                    )
                    if validation_resp == False:
                        log = {
                            "po_number": po_number,
                            "log": constants.XSD_VALIDATION_STATUS_FAILED,
                            "status": constants.XSD_FAILED,
                        }
                        data["status"] = constants.XSD_FAILED
                        xml_validation_model.save_or_update_po_details(data)
                        xml_validation_model.create_logs(log)
                        acknowledgement_helper.send_error_ack_to_reliance(
                            unique_id, constants.XSD_VALIDATION_STATUS_FAILED
                        )
                        subject = "Error in PO Validation"
                        po_number = xml_helper.get_direct_value_from_idoc(
                            idoc, "E1EDK02", "BELNR"
                        )
                        body = {
                            "po_number": po_number,
                            "Message": constants.XSD_VALIDATION_STATUS_FAILED,
                            "type": constants.XML_VALIDATION_FAILED,
                        }
                        mail_helper.send_mail(body, subject)
                        # return error_helper.add_error(400,constants.XSD_VALIDATION_STATUS_FAILED)
                        return response_handlers.send(
                            400, constants.XSD_VALIDATION_STATUS_FAILED
                        )
                    else:
                        log = {
                            "po_number": po_number,
                            "log": constants.XSD_VALIDATION_STATUS_SUCCESS,
                            "status": constants.XSD_SUCCESS,
                        }
                        data["status"] = constants.XSD_SUCCESS
                        resp = xml_validation_model.save_or_update_po_details(data)
                        xml_validation_model.create_logs(log)
                        # SQS part
                        if resp:
                            sqs_helper.send_data_to_sqs(po_number)
                        log = {
                            "po_number": po_number,
                            "log": constants.DATA_SENT_TO_SQS,
                            "status": constants.XSD_SUCCESS,
                        }
                        xml_validation_model.create_logs(log)
                        log = {
                            "po_number": po_number,
                            "log": constants.DATA_SENT_TO_SQS,
                            "status": constants.ACKNOWLEDGEMENT_SUCCESS,
                        }
                        xml_validation_model.create_logs(log)
                        acknowledgement_helper.send_instant_ack(unique_id, po_number)
                        return {
                            "data": po_number,
                            "message": constants.DATA_VALIDATED_SUCCESSFULLY,
                        }
                except Exception as e:
                    print(e)
                    # mail part
                    subject = "Error in PO Validation"
                    body = {
                        "po_number": "",
                        "Message": constants.INVALID_REQUEST_XML,
                        "type": constants.XML_VALIDATION_FAILED,
                    }
                    mail_helper.send_mail(body, subject)
            else:
                subject = "Error in PO Validation"
                body = {
                    "po_number": "",
                    "Message": constants.INVALID_MSG_TYPE_MSG,
                    "type": constants.XML_VALIDATION_FAILED,
                }
                mail_helper.send_mail(body, subject)
                acknowledgement_helper.send_error_ack_to_reliance(
                    unique_id, constants.INVALID_MSG_TYPE_MSG
                )
                # return error_helper.add_error(400, constants.INVALID_MSG_TYPE_MSG)
                return response_handlers.send(400, constants.INVALID_MSG_TYPE_MSG)
            return po_number
        except etree.XMLSyntaxError as e:
            # mail part
            message_validate_po = "Error in PO Validation"
            exception_validate_po = {
                "po_number": po_number,
                "Message": str(e),
                "type": constants.XML_VALIDATION_FAILED,
            }
            mail_helper.send_mail(exception_validate_po, message_validate_po)
            print("XMLSyntaxError:", str(e))
            acknowledgement_helper.send_error_ack_to_reliance(unique_id, str(e))
            # return error_helper.add_error(400, str(e))
            return response_handlers.send(400, str(e))
        except etree.XMLSchemaError as e:
            # mail part
            message_validate_po = "Error in PO Validation"
            exception_validate_po = {
                "po_number": po_number,
                "exception": str(e),
                "Stage": "Exception in PO Validation",
            }
            mail_helper.send_mail(exception_validate_po, message_validate_po)
            print("XMLSchemaError:", str(e))
            acknowledgement_helper.send_error_ack_to_reliance(unique_id, str(e))
            # return error_helper.add_error(400, str(e))
            return response_handlers.send(400, str(e))
        except Exception as e:
            # mail part
            message_validate_po = "Error in PO Validation"
            exception_validate_po = {
                "po_number": po_number,
                "Message": str(e),
                "type": constants.XML_VALIDATION_FAILED,
            }
            mail_helper.send_mail(exception_validate_po, message_validate_po)
            print("Exception ::", str(e))
            acknowledgement_helper.send_error_ack_to_reliance(unique_id, str(e))
            # return error_helper.add_error(400, str(e))
            return response_handlers.send(400, str(e))

