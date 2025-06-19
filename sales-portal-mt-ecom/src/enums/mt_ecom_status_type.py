from enum import Enum


class MtEcomStatusType(str, Enum):
    MRP_SUCCESS = "MRP Success"
    ACKNOWLEDGEMENT_SUCCESS = "Acknowledgement Success"
    CASELOT_SUCCESS = "Caselot Success"
    SO_SUCCESS = "SO Success"
    VALIDATION_SUCCESS = "Validation Success"
    ARTICLE_SUCCESS = "Article Success"
    MRP_2_SUCCESS = "MRP 2 Success"
    ASN_SENT = "ASN Sent"
    INVOICE_PENDING = "Invoice Pending"
    INVOICE_SUCCESS = "Invoice Success"
    MRP_FAILED = "MRP Failed"
    ACKNOWLEDGEMENT_FAILED = "Acknowledgement Failed"
    CASELOT_FAILED = "Caselot Failed"
    SO_FAILED = "SO Failed"
    VALIDATION_FAILED = "Validation Failed"
    ARTICLE_FAILED = "Article Failed"
    MRP_2_FAILED = "MRP 2 Failed"
    PARTIAL_INVOICE = "Partial Invoice"
    NOT_YET_PROCESSED = "Not yet processed"
    PARTIALLY_PROCESSED = "Partially processed"
    SO_PENDING = "SO Pending"
    BASE_PRICE_FAILED = 'Base Price Failed'
    BASE_PRICE_SUCCESS = 'Base Price Success'
    TOT_FAILED = "ToT Failed"
    TOT_SUCCESS = "ToT Success"

