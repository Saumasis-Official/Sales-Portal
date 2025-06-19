from typing import List

from pydantic import BaseModel

from src.dto.validate_dto import OrderDataDTO


class ItemError(BaseModel):
    item_number: str
    message: str


class ErrorLogDetails(BaseModel):
    sales_order_data: OrderDataDTO
    errors: List[ItemError]


class ErrorLog(BaseModel):
    # "AOS" in remarks is the keyword for report-issue api to identify the mail is regarding AOS
    remarks: str = "Auto-Order-Submit(AOS) validation process encountered error"
    categoryId: int = 7
    errorCode: str = "ERR-DBO-OVAL-009-TENT-AMOUNT"
    errorMessage: str = "Unable to get tentative amount value"
    tse: List = []
    ccRecipients: str
    logObj: ErrorLogDetails

    # allTentativeAmountsZero: bool
    # itemNumbersReceivedFromSAPValidationResponseCount: int
    # itemsSentForValidationCount: int
    # missingItemsFromSAPValidation: List[dict]
    # dbSpecificErrorExist: bool
