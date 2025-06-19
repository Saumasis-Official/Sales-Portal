from typing import Optional, Dict
from src.models.log_model import LogModel
from src.models.xml_validation_model import XmlValidationModel
from src.utils import constants
from src.exceptions import log_service_exception as LogServiceException
from src.libs.loggers import Logger


class LogService:
    XML_VALIDATION_MODEL = None
    logger = Logger("LogService")

    def __init__(self):
        self.XML_VALIDATION_MODEL = XmlValidationModel()

    def insert_sync_log(type, result, data, distributor_id, error, is_cron_job):
        LogModel.insert_sync_log(type, result, data, distributor_id, error, is_cron_job)

    def insert_email_log(
            self,
            type: str,
            status: str,
            subject: str,
            recipients: dict,
            reference: Optional[str] = None,
            email_data: Optional[Dict] = None,
            error: Optional[str] = None,
    ):
        try: 
            data = {
                "type": type,
                "status": status,
                "subject": subject,
                "recipients": recipients,
                "reference": reference if reference else "Edi Mails",
                "email_data": email_data,
                "error": error,
            }
            LogModel.insert_email_log(data)
        except Exception as e:
            raise LogServiceException("insert_email_log", e)

    def log_process(self, po_number=None, log=None, status=None):
        try:
            log = {
                "po_number": po_number,
                "log": constants.JSON_VALIDATION_STATUS_SUCCESS,
                "status": constants.XSD_SUCCESS,
            }
            self.XML_VALIDATION_MODEL.create_logs(log)
            return True
        except Exception as e:
            Logger.error("Exception in LogService -> log_process: ", e)
            return False
