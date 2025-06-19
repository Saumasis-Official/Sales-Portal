from enum import Enum


class SuccessMessage(str, Enum):
    INVOICE_PAYLOAD = "SAP invoice payload created successfully"
    INVOICE_PROCESSING = 'Invoice processed and ASN sent successfully'
    SALES_ORDER_CREATE_SUCCESS = "Sales order created successfully",
    ARTICLE_SUCCESS = "Article lookup success"
    SO_ALREADY_EXISTS = "Sales order already exists"
    DATA_SENT_TO_SQS = "Data sent to SQS"
    ACKNOWLEDGEMENT_SENT = "Acknowledgement sent Successfully"
    KAMS_NKAMS_EDIT_SUCCESS = "KAMS/NKAMS Payer Code Mapping Updated successfully"
    KAMS_NKAMS_DELETE_SUCCESS = 'KAMS/NKAMS Payer Code Mapping Deleted successfully'
    ADD_KAMS_NKAMS_CUSTOMER_SUCCESS = 'KAMS/NKAMS Customer Added successfully'
    REMOVE_KAMS_NKAMS_CUSTOMER_SUCCESS = 'KAMS/NKAMS Customer Deleted successfully'
    INVOICE_SYNC_SUCCESS = 'Invoice Synced Successfully'
    ADD_TOT_TOLERANCE_SUCCESS = 'Add ToT Tolerance Success'
    UPDATE_TOT_TOLERANCE_SUCCESS = 'Update ToT Tolerance Success'
