import os

from dotenv import load_dotenv

load_dotenv()

ENV = os.environ.get("ENV")

DATABASE = {
    "PGSQL_DATABASE_NAME": os.environ.get('PGSQL_DATABASE_NAME'),
    "PGSQL_USERNAME": os.environ.get('PGSQL_USERNAME'),
    "PGSQL_PASSWORD": os.environ.get('PGSQL_PASSWORD'),
    "PGSQL_READ_HOST": os.environ.get('PGSQL_READ_HOST'),
    "PGSQL_WRITE_HOST": os.environ.get('PGSQL_WRITE_HOST'),
    "PGSQL_PORT": os.environ.get('PGSQL_PORT'),
}

S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')

SQS = {
    'VALIDATE_PO_SQS': os.environ.get('VALIDATE_PO_SQS'),
    'INVOICE_SQS': os.environ.get('INVOICE_SQS'),
    'SO_SQS': os.environ.get('SO_SQS'),                 # remove it after creating separate queues for each customer
    'INVOICING_SQS': os.environ.get('INVOICING_SQS'),
    'BLINKIT_SO_SQS': os.environ.get('BLINKIT_SO_SQS'),  
    'AMAZON_SO_SQS': os.environ.get('AMAZON_SO_SQS'),    
    'BIGBASKET_SO_SQS': os.environ.get('BIGBASKET_SO_SQS'),    
    'SWIGGY_SO_SQS': os.environ.get('SWIGGY_SO_SQS'),    
    'BLINKIT_INVOICE_SQS': os.environ.get('BLINKIT_INVOICE_SQS'),    
    'AMAZON_INVOICE_SQS': os.environ.get('AMAZON_INVOICE_SQS'),     
    'BIGBASKET_INVOICE_SQS': os.environ.get('BIGBASKET_INVOICE_SQS'),     
    'SWIGGY_INVOICE_SQS': os.environ.get('SWIGGY_INVOICE_SQS'),    
    'ZEPTO_SO_SQS': os.environ.get('ZEPTO_SO_SQS'),   
    'ZEPTO_INVOICE_SQS': os.environ.get('ZEPTO_INVOICE_SQS'),   
}

# configurations related to sales-portal-sap service
SAP = {
    'SAP_MRP_CASELOT_CHECK_URL': os.environ.get('SAP_MRP_CASELOT_CHECK_URL'),
    'SAP_SO_CREATION_URL': os.environ.get('SAP_SO_CREATION_URL'),
    'SAP_MRP2_CHECK_URL': os.environ.get('SAP_MRP2_CHECK_URL'),
    'SAP_SO_DETAILS_URL': os.environ.get('SAP_SO_DETAILS_URL'),
    'SAP_GET_AMENDMENT_DETAILS': os.environ.get('SAP_GET_AMENDMENT_DETAILS'),
    'SAP_CREATE_AMENDMENT': os.environ.get('SAP_CREATE_AMENDMENT'),
    'SAP_MT_ECOM_SO_SYNC': os.environ.get('SAP_MT_ECOM_SO_SYNC'),
}
APP = {
    'FE_URL_CORS': os.environ.get('FE_URL_CORS'),
    'MT_ECOM_PORT': int(os.environ.get('MT_ECOM_PORT')),
    'MT_ECOM_HOST': os.environ.get('MT_ECOM_HOST', '0.0.0.0'),
}

RELIANCE_CONFIG = {
    'RELIANCE_API_URL': os.environ.get('RELIANCE_API_URL'),
    'RELIANCE_USERNAME': os.environ.get('RELIANCE_USERNAME'),
    'RELIANCE_PASSWORD': os.environ.get('RELIANCE_PASSWORD'),
    'RELIANCE_SOAP_ACTION': os.environ.get('RELIANCE_SOAP_ACTION'),
}

BLINKIT_APIS = {
    'AUTHORIZATION_TOKEN': os.environ.get('BLINKIT_AUTHORIZATION_TOKEN'),
    'PO_ACKNOWLEDGEMENT': os.environ.get('BLINKIT_PO_ACKNOWLEDGEMENT')
}

# configurations related to SAP
SAP_URLS = {
    "SO_CREATION": os.environ.get('MTECOM_SO_CREATION_API_URL'),
    'INVOICE_CREATION': os.environ.get('SAP_INVOICE_CREATION_URL'),
    'MRP_CASELOT_CHECK': os.environ.get('MTECOM_MRP_API_URL'),
    'HEADERS': {
        'X-Requested-With': 'X',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    'AUTH': {
        'username': os.environ.get('MTECOM_USER'),
        'password': os.environ.get('MTECOM_PASSWORD')
    },
}
MULESOFT ={
    'MULESOFT_BASE_URL' : os.environ.get('MULESOFT_BASE_URL'),
    'MULESOFT_CLIENT_ID' : os.environ.get('MULESOFT_CLIENT_ID'),
    'MULESOFT_CLIENT_SECRET' : os.environ.get('MULESOFT_CLIENT_SECRET'),
    'MULESOFT_SHOPIFY_BASE_URL' : os.environ.get('MULESOFT_SHOPIFY_BASE_URL'),
    'MULESOFT_SHOPIFY_CLIENT_ID' : os.environ.get('MULESOFT_SHOPIFY_CLIENT_ID'),
    'MULESOFT_SHOPIFY_CLIENT_SECRET' : os.environ.get('MULESOFT_SHOPIFY_CLIENT_SECRET'),
}

ISO_STATE = {
    'URL' : os.environ.get('ISO_STATE_URL'),
}
