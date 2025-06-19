from typing import List

import src.libs.helpers as Helpers
from src.config.configurations import EMAIL_CONFIG
from src.dto.report_issue_dto import ItemError, ErrorLogDetails, ErrorLog
from src.dto.validate_dto import ItemsDTO, OrderDataDTO
from src.libs.loggers import Logger, log_decorator

logger = Logger("ArsBusinessRules")


class ArsBusinessRules:

    @log_decorator
    def handle_validation(
        self,
        order_items: List[ItemsDTO],
        validation_response,
        order_data: OrderDataDTO,
        distributor_profile,
    ):
        # TODO: Handle DB level errors
        error_massages = {}
        error_items = []
        filtered_order_items = []
        tonn: float = 0
        order_id = None
        item_errors_list = []
        try:
            if not validation_response or not validation_response.get("success"):
                return {
                    "status": False,
                    "error_message": "Validation response is empty",
                }
            db_response = (
                validation_response.get("data", {})
                .get("d", {})
                .get("db_response", {})
                .get("data", [])
            )
            # order_id will only be available when record is persisted in 'orders' table.
            # which in-turn is done only when order is validated successfully with no validation errors
            order_id = db_response[0].get("id") if len(db_response) > 0 else None
            sap_item_list = (
                validation_response.get("data", {})
                .get("d", {})
                .get("NAVRESULT", {})
                .get("results", [])
            )
            for item in sap_item_list:
                if not item.get("Message") == "Order ready for creation":
                    errors = error_massages.get(item.get("Item"), [])
                    msg = item.get("Message", "").replace(":", "")
                    item["Message"] = msg
                    errors.append(msg)
                    error_massages[item.get("Item")] = errors
                else:
                    tonnage = Helpers.extract_number(item.get("Quantity_Ton"))
                    if tonnage:
                        tonn += tonnage

            for item in order_items:
                error = error_massages.get(getattr(item, "item_number"))
                if error:
                    error_item = {
                        "message": error,
                        "material": item,
                        "item_number": getattr(item, "item_number"),
                    }
                    item_error = ItemError(
                        item_number=getattr(item, "item_number"),
                        message=" ; ".join(error),
                    )
                    item_errors_list.append(item_error)
                    error_items.append(error_item)
                else:
                    filtered_order_items.append(item)
            order_items = filtered_order_items
            error_log_details = ErrorLogDetails(
                sales_order_data=order_data, errors=item_errors_list
            )
            error_log = ErrorLog(
                tse=distributor_profile.get("tse", []),
                ccRecipients=EMAIL_CONFIG.get("AOS_REPORT_ISSUE_CC"),
                logObj=error_log_details,
            )
            return {
                "status": False if len(error_items) > 0 else True,
                # "order_items": order_items,
                "error_items": error_items,
                "tonn": tonn,
                "order_id": order_id,
                "report_issue": error_log,
            }
        except Exception as e:
            logger.exception(e)
            return None
