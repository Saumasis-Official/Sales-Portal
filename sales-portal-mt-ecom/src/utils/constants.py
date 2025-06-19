# Constants

SUCCESS = 'Success'
RELIANCE = 'Reliance'
UNIQUE_ID = 'UNIQUE_ID'
MSG_TYPE = 'MSG_TYPE'
MSG_DATA = 'MSG_DATA'
INVALID_MSG_DATA = 'INVALID_MSG_DATA'
MSG_TYPE_PURCHASE_ORDER = 'PURCHASE_ORDER'
INVALID_MSG_DATA_MSG = 'InValid Request, Invalid MSG_DATA'
INVALID_REQUEST_UNIQUE_ID = 'InValid Request, UNIQUE_ID not exists in the request'
INVALID_MSG_TYPE = 'INVALID_MSG_TYPE'
INVALID_MSG_TYPE_MSG = 'InValid Request, InValid MSG_TYPE'
INVALID_MSG_TYPE_NOT_FOUND = 'InValid Request, MSG_TYPE not exists in the request'
INVALID_REQUEST_XML = 'INVALID_REQUEST_XML'
INVALID_PO_NUMBER_MSG = 'InValid Request, Purchase Order Number not exists in the request'


REQUEST_VALIDATION_ERROR = 'REQUEST_VALIDATION_ERROR'
REQUEST_VALIDATION_ERROR_MSG = 'ERROR in request validation'

XML_VALIDATION_FAILED = 'XML VALIDATION FAILED'
XML_VALIDATION_FAILED_MSG = 'InValid Request, XML validation failed'

XSD_VALIDATION_STATUS = 'XSD_VALIDATION_STATUS'
XSD_VALIDATION_STATUS_SUCCESS = 'Validation completed successfully'
XSD_VALIDATION_STATUS_FAILED = 'InValid Request, Validation failed'

JSON_VALIDATION_STATUS = "JSON_VALIDATION_STATUS"
JSON_VALIDATION_STATUS_SUCCESS = "Validation completed successfully"
JSON_VALIDATION_STATUS_FAILED = "Invalid request. Validation failed"


PO_REQUEST_RECEIVED = 'PO_REQUEST_RECEIVED'
PO_REQUEST_RECEIVED_MSG = 'PO Request received successfully'

DATA_SENT_TO_SQS = 'DATA_SENT_TO_SQS'
DATA_SENT_TO_SQS_MSG = 'Data sent to SQS successfully'

DATA_VALIDATED_SUCCESSFULLY = 'Data validated successfully'
EDI_REL = 'EDI#130212'
EDI_REL_PO = 'EDI#130212#PO#'
REL_OPEN_PO = '130212#OpenPO'


SK_ITEM_EAN = 'ItemEAN#'
SK_XML_VALIDATION = 'XML_Validation#'


# Types

TYPE_LINE_ITEM_EAN = 'LineItemEAN'
TYPE_XML_VALIDATION = 'XML_Validation'
TYPE_PO_STAGE = 'POStage'

# Status

STATUS_OPEN = 'OPEN'
STATUS_CLOSED = 'CLOSED'

# PO Stages

PO_STAGE = 'POStage#PO#'
PO_STAGE_FAILED = 'FAILED'
PO_STAGE_SUCCESS = 'SUCCESS'
PO_STAGE_XML_VALIDATION = 'XML_VALIDATION'

#BUCKET DETAILS


# Sets

PO_STATUS_SET = 'StatusSet'

PO_STATUS_SET_XML_FAILED = 'XMLFailed'
MRP_CASELOT_FAILED = 'Error in MRP and Caselot Check'
ARTICLE_LOOKUP_FAILED = 'Article Failed'
MRP_AMENDMENT_MSG = "MRP Check Failed, sent PO Amendment ACK to Reliance"
SAP_ERROR_MSG = "SAP Error in MRP and Caselot Check"

# ENUMS

XSD_FAILED = 'Validation Failed'
XSD_SUCCESS = 'Validation Success'
ACKNOWLEDGEMENT_FAILED = 'Acknowledgement Failed'
ACKNOWLEDGEMENT_SUCCESS = 'Acknowledgement Success'
ARTICLE_FAILED = 'Article Failed'
ARTICLE_SUCCESS = 'Article Success'
INVOICE_PENDING = 'Invoice Pending'
INVOICE_FAILED = 'Invoice Failed'
INVOICE_SUCCESS = 'Invoice Success'
MRP_FAILED = 'MRP Failed'
MRP_SUCCESS = 'MRP Success'
MRP2_FAILED = 'MRP2 Failed'
MRP2_SUCCESS = 'MRP2 Success'
CASELOT_SUCCESS = 'Caselot Success'
CASELOT_FAILED = 'Caselot Failed'
BASE_PRICE_FAILED = 'Base Price Failed'
BASE_PRICE_SUCCESS = 'Base Price Success'
TOT_FAILED = "ToT Failed"
TOT_SUCCESS = "ToT Success"
ASN_SENT = 'ASN Sent'
MRP_ROR_CODE = 'ED'
CASELOT_ROR_CODE = 'ZE'
CASELOT_ROR_ERROR = 'Pack size issue (PO vs SAP)'
MRP_ROR_ERROR = 'MRP Mismatch'
BASE_PRICE_ROR_ERROR = 'EDI - Base Price match condition fail'
ARTICLE_ROR_ERROR = 'PRODUCT_DETAILS_NOT_FOUND'
ARTICLE_LOOKUP_SUCCESS = 'Article Lookup completed successfully'
SALES_ORDER_CREATE_SUCCESS_MSG = 'Sales order created successfully'
SALES_ORDER_CREATE_FAILED_MSG = 'Sales order creation failed'
MRP2_FAILED_MSG = 'MRP2 Check failed'
MRP_SUCCESS_MSG = 'MRP Check completed successfully'
CASELOT_SUCCESS_MSG = 'Caselot Check completed successfully'
BASE_PRICE_SUCCESS_MSG = 'Base Price Check completed successfully'
VENDORIDACKNOWLEDGEMENT = 'Vendor Id Not Found'
PRODUCT_NOT_FOUND = 'PRODUCT_DETAILS_NOT_FOUND'
SO_SUCCESS = 'SO Success'
SO_FAILED = 'SO Failed'
MRP ='MRP'
CASELOT = 'CASELOT'
SAP_SO_STATUS_PARTIAL = 'PARTIAL'
PARTIAL_INVOICE = 'Partial Invoice'
COMPLETED='COMPLETED'
ORDER_MSG = 'Order Created Succesfully'
ORDER_ALREADY_EXIST = 'Purchase order number in document number'


HEADERS = {'X-Requested-With': "X", "Content-Type": "application/json", "Accept": "application/json"}


SENDER = 'salesmt@tataconsumer.com'
GROUP_ID = ['14','16']
ENABLE_MT_ECOM_SO_SYNC = 'ENABLE_MT_ECOM_SO_SYNC'
MT_ECOM_DEFAULT_RDD_DATE = 'MT_ECOM_DEFAULT_RDD_DATE'
MT_ECOM_DEFAULT_SYNC_DATE = 'MT_ECOM_DEFAULT_SYNC_DATE'
MT_ECOM_DEFAULT_PO_EXPIRY_DATE = 'MT_ECOM_DEFAULT_PO_EXPIRY_DATE'
RELIANCE_EXCEL_FORMAT = ['Parent SKU Code', 'Child SKU Code', 'Store ID', 'Customer Code', 'Reliance Article ID', 'VendorCode', 'ParentSKUDescription', 'SystemSKUDescription', 'Vendor Name', 'Plant Code', 'Division', 'RRL Article Description']
ECOM_EXCEL_FORMAT = ['PSKU', 'PSKU Description', 'SKU', 'SKU Description', 'Priority', 'Site Code', 'Customer Code', 'Article ID', 'Vendor Code', 'Plant Code', 'Division', 'Article Description', 'Customer Name']
MT_ECOM_CUSTOMERS = ['Reliance','Grofers','ARIPL','BigBasket','Swiggy','Zepto']
SALES_ORG = ['6010' , '5010']
SES_REGION = 'eu-west-1'
ERROR_MASTER = ['Net Value',
'Pricing',
'Shipping Point/Receiving Pt',
'Plant',
'ZMRP',
'Gross Weight',
'Order Quantity',
'Net Weight',
'Pricing',
'ZTTP',
'Invalid Sales unit(UOM)',
'Loading Date',
'Sales order block',
'Central sales block for customer',
'General block',
'JOCG Tax condition',
'JOSG Tax condition',
'ZSFE',
'marked for deletion',
' Incoterms',]
RECIPIENT_NOT_FOUND = 'Recipient not found'
ARIRL_INVOICE_NAME = "Amazon Retail India Private Limited"
TCPL_INVOICE_NAME = "Tata Consumer Products LTD"
ISO_STATE_CODE = {
    'Andaman and Nicobar Islands': 'AN',
    'Andhra Pradesh': 'AP',
    'Arunachal Pradesh': 'AR',
    'Assam': 'AS',
    'Bihar': 'BR',
    'Chandigarh': 'CH',
    'Chhattisgarh': 'CG',
    'Dadra and Nagar Haveli and Daman and Diu': 'DH',
    'Delhi': 'DL',
    'Goa': 'GA',
    'Gujarat': 'GJ',
    'Haryana': 'HR',
    'Himachal Pradesh': 'HP',
    'Jammu and Kashmir': 'JK',
    'Jharkhand': 'JH',
    'Karnataka': 'KA',
    'Kerala': 'KL',
    'Ladakh': 'LA',
    'Lakshadweep': 'LD',
    'Madhya Pradesh': 'MP',
    'Maharashtra': 'MH',
    'Manipur': 'MN',
    'Meghalaya': 'ML',
    'Mizoram': 'MZ',
    'Nagaland': 'NL',
    'Odisha': 'OD',
    'Puducherry': 'PY',
    'Punjab': 'PB',
    'Rajasthan': 'RJ',
    'Sikkim': 'SK',
    'Tamil Nadu': 'TN',
    'Telangana': 'TS',
    'Tripura': 'TR',
    'Uttar Pradesh': 'UP',
    'Uttarakhand': 'UK',
    'West Bengal': 'WB'
}
MT_ECOM_DEFAULT_RDD_SYNC_FROM_DATE = 'MT_ECOM_DEFAULT_RDD_SYNC_FROM_DATE'
MT_ECOM_DEFAULT_RDD_SYNC_TO_DATE = 'MT_ECOM_DEFAULT_RDD_SYNC_TO_DATE'
MDM_SPOC = 'Shanker.Palanivelu@tataconsumer.com,Amith.Gangadhar@tataconsumer.com,prakash.sethumani@tataconsumer.com'
MT_ECOM_EDIT_KAMS_NKAMS_detail = 'EDIT KAMS/NKAMS detail'
MT_ECOM_AUDIT_TRAIL_DELETE_TYPE_KAMS_NKAMS = 'Delete KAMS/NKAMS detail'
MT_ECOM_AUDIT_TRAIL_ADD_KAMS_NKAMS = 'Add KAMS/NKAMS detail'
CASELOT_ZERO = "Caselot is maintained 0 in SAP"