from enum import Enum

class ErrorMessage(str, Enum):
    INVOICE_PAYLOAD = "Failed to create SAP invoice payload"
    ARTICLE_ERROR =  "Product details are not found - CustomerProductID : {customer_product_id} , SITE_CODE: {site_code}"
    SITE_CODE_MISSING = "Site code : {site_code} is not available in masters for  - CustomerProductID : {customer_product_id}"
    VENDOR_ID_MISSING = 'Vendor ID : {vendor_code} is not available in masters for  - CustomerProductID : {customer_product_id}',
    CUSTOMER_PRODUCT_ID_MISSING = 'CustomerProductID is missing for the following Site Code : {site_code} ',
    MRP_ROR_ERROR = 'MRP Mismatch'
    BASE_PRICE_ROR_ERROR = 'EDI - Base Price match condition fail'
    CASELOT_ROR_ERROR = 'Caselot Mismatch'
    MRP_ROR_CODE = 'ED'
    CASELOT_ROR_CODE = 'ZE'
    INVOICE_PROCESSING = 'Failed to process invoice'
    SALES_ORDER_CREATE_FAILED= "Sales order creation failed"
    KAMS_NKAMS_EDIT_ERROR = 'Error while Updating Payer Code Mapping'
    KAMS_NKAMS_DELETE_ERROR = 'Error while Deleting Payer Code Mapping'
    ADD_KAMS_NKAMS_CUSTOMER_ERROR = 'Error while Adding KAMS/NKAMS Customer'
    INVOICE_SYNC_FAIL = 'Failed to sync Invoices'
    MAINTENANCE_OPEN = 'The Site is Under Maintenance'
    TOT_ROR_CODE = 'ZW'
    TOT_ROR_ERROR = 'ToT Mismatch'
