import os

from dotenv import load_dotenv

load_dotenv()


ARS_ALLOCATION = {
    "PORT": int(os.environ.get("ARS_ALLOCATION_SERVICE_PORT", 3007)),
    "HOST": os.environ.get("ARS_ALLOCATION_SERVICE_HOST", "localhost"),
    "UID": os.environ.get("DATALAKE_UID"),
    "PASSWORD": os.environ.get("DATALAKE_PASSWORD"),
    "AOS_MAX_THREADS": os.environ.get("AOS_MAX_THREADS", 10),
    "APPLICATION_ENV": os.environ.get("APPLICATION_ENV", "dev"),
    "FE_URL_CORS": os.environ.get("FE_URL_CORS"),
}

SNOW_PARK = {
    "ACCOUNT": os.environ.get("SNOW_PARK_ACCOUNT"),
    "USER": os.environ.get("SNOW_PARK_USER"),
    "ROLE": os.environ.get("SNOW_PARK_ROLE"),
    "WAREHOUSE": os.environ.get("SNOW_PARK_WAREHOUSE"),
    "AUTHENTICATOR": os.environ.get("SNOW_PARK_AUTHENTICATOR"),
    "PASS_PHRASE": os.environ.get("SNOW_PARK_PASS_PHRASE"),
    "PRIVATE_KEY": os.environ.get("SNOW_PARK_PRIVATE_KEY"),
}

# Get database configuration values from the .env file and store them in a dictionary
DATABASE = {
    "PGSQL_DATABASE_NAME": os.environ.get("PGSQL_DATABASE_NAME"),
    "PGSQL_USERNAME": os.environ.get("PGSQL_USERNAME"),
    "PGSQL_PASSWORD": os.environ.get("PGSQL_PASSWORD"),
    "PGSQL_HOST": os.environ.get("PGSQL_HOST"),
    "PGSQL_PORT": os.environ.get("PGSQL_PORT"),
}

# Get allocation service configuration values from the .env file and store them in a dictionary
ALLOCATION_SERVICE = {
    "BASE_URL": os.environ.get("ARS_ALLOCATION_BASE_URL"),
    "BASIC_AUTH": os.environ.get("API_AUTH"),
}

# Get the Pegasus order URL from the .env file
PEGASUS_ARS_URL = os.environ.get("PEGASUS_ARS_URL")
PEGASUS_AUTH_URL = os.environ.get("PEGASUS_AUTH_URL")
PEGASUS_ORDER_URL = os.environ.get("PEGASUS_ORDER_URL")
PEGASUS_SAP_URL = os.environ.get("PEGASUS_SAP_URL")

# Get additional URLs from the .env file and store them in a dictionary
PEGASUS_ARS_URLS = {
    "AOS_SOQ": f"{PEGASUS_ARS_URL}/ars-auto-submit-soq",
    "DISTRIBUTOR_PROFILE": f"{PEGASUS_ARS_URL}/distributor-profile",
    "STOCK_NORM_SYNC": f"{PEGASUS_ARS_URL}/sync-stock-norm",
    "FORECAST_DUMP_VALIDATION": f"{PEGASUS_ARS_URL}/admin/forecast-dump-validation",
    "AUTO_SUBMIT_FORECAST": f"{PEGASUS_ARS_URL}/admin/auto-submit-forecast",
    "FORECAST_TOTAL_SYNC": f"{PEGASUS_ARS_URL}/admin/sync-forecast-total",
    "ALLOCATION_FROM_STAGING": f"{PEGASUS_ARS_URL}/allocation-from-staging",
    "SYNC_STOCK_NORM": f"{PEGASUS_ARS_URL}/sync-stock-norm",
}

PEGASUS_AUTH_URLS = {
    "PEGASUS_AUTH_URL": PEGASUS_AUTH_URL,
    "PDP_WINDOW_API": f"{PEGASUS_AUTH_URL}/hc-index/pdp-window",
}

PEGASUS_ORDER_URLS = {
    "PEGASUS_ORDER_URL": PEGASUS_ORDER_URL,
    "RDD_AUTO_CLOSURE": f"{PEGASUS_ORDER_URL}/get-rdd-auto-closure",
}

PEGASUS_SAP_URLS = {
    "PEGASUS_SAP_URL": PEGASUS_SAP_URL,
    "WAREHOUSE_API": f"{PEGASUS_SAP_URL}/warehouse-details-dist-channel",
    "VALIDATE_ORDER_API": f"{PEGASUS_SAP_URL}/validate-order",
    "SUBMIT_ORDER_API": f"{PEGASUS_SAP_URL}/aos-order-submit",
    "REPORT_ISSUE": f"{PEGASUS_SAP_URL}/report-portal-error",
    "AUTO_CLOSURE_SAP": f"{PEGASUS_SAP_URL}/auto-closure-sync",
}

SQS = {"AOS_SUBMIT_QUEUE_SQS": os.environ.get("AOS_SUBMIT_QUEUE_SQS", "")}

EMAIL_CONFIG = {
    "EMAIL_SENDER": os.environ.get("EMAIL_SENDER", "noreply.pegasus@tataconsumer.com"),
    "AOS_REPORT_ISSUE_CC": os.environ.get("AOS_REPORT_ISSUE_CC"),
    "DL_HOLDINGS_SYNC_ERROR_TO": os.environ.get(
        "DL_HOLDINGS_SYNC_ERROR_TO", "pegasus-testing@tataconsumer.com"
    ),
}

AUTO_CLOSURE = {
    "AUTO_CLOSURE_SAP_BATCH_SIZE": int(
        os.environ.get("AUTO_CLOSURE_SAP_BATCH_SIZE", 50)
    )
}
