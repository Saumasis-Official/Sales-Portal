/* eslint quote-props: 0 */
require('dotenv').config();
export { }
const configuration: any = {};

configuration.pgsql = {
  pgsql_connection_url: process.env.PGSQL_CONNECTION_URL,
  pgsql_host: process.env.PGSQL_HOST,
  pgsql_database_name: process.env.PGSQL_DATABASE_NAME,
  pgsql_username: process.env.PGSQL_USERNAME,
  pgsql_password: process.env.PGSQL_PASSWORD,
  pgsql_port: process.env.PGSQL_PORT
}

configuration.pgsql_read = {
  pgsql_connection_url: process.env.PGSQL_CONNECTION_URL_READ || process.env.PGSQL_CONNECTION_URL,
  pgsql_host: process.env.PGSQL_HOST_READ || process.env.PGSQL_HOST,
  pgsql_database_name: process.env.PGSQL_DATABASE_NAME,
  pgsql_username: process.env.PGSQL_USERNAME,
  pgsql_password: process.env.PGSQL_PASSWORD,
  pgsql_port: process.env.PGSQL_PORT
}

configuration.sap = {
  validateApiEndpoint: process.env.SAP_VALIDATE_API,
  createApiEndpoint: process.env.SAP_CREATE_API,
  reOrderApiEndpoint: process.env.SAP_REORDER_API,
  creditLimitApiEndpoint: process.env.SAP_CREDIT_LIMIT_API,
  updateEmailMobileEndpoint: process.env.SAP_UPDATE_EMAIL_MOBILE_API,
  salesOrderDelivery: process.env.SAP_SALES_ORDER_DELIVERY_API,
  salesOrderInvoice: process.env.SAP_SALES_ORDER_INVOICE_API,
  warehouseDetailsApiEndpoint: process.env.SAP_WAREHOUSE_DETAILS_API,
  materialsApiEndpoint: process.env.SAP_MATERIALS_API,
  openSOApiEndpoint: process.env.SAP_OPEN_SO_API,
  distributorsApiEndpoint: process.env.SAP_DISTRIBUTOR_API,
  soDetailsApiEndpoint: process.env.SAP_SO_DETAILS_API,
  salesHierarchyApiEndpoint: process.env.SAP_SALES_HIERARCHY_API,
  salesHierarchyUpdateApi: process.env.SAP_SALES_HIERARCHY_UPDATE_API,
  materialsBOMExplodeEndpoint: process.env.SAP_MATERIALS_BOUM_EXPLODE,
  liquidationApiEndpoint: process.env.SAP_LIQUIDATION_API,
  liquidationStorageLocation: process.env.LIQUIDATION_STORAGE_LOCATION,
  plantCodeUpdateMapping: process.env.SAP_DEPOT_CODE_UPDATE_MAPPING,
  pdpUpdateMapping: process.env.SAP_PDP_UPDATE_MAPPING,
  holidayCalendarEndpoint: process.env.SAP_HOLIDAY_CALENDAR_API,
  auth: {
    username: process.env.SAP_AUTH_USERNAME,
    password: process.env.SAP_AUTH_PASSWORD,
  },
  salesHierarchyAuth: {
    username: process.env.SAP_SH_AUTH_USERNAME,
    password: process.env.SAP_SH_AUTH_PASSWORD
  },
  distributorInventorySyncAwsConfig: {
    accessKeyId: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_SECRET_ACCESS_KEY,
    region: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_REGION,
    bucket: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_S3_BUCKET,
    folderPath: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_S3_FOLDER_PATH
  },
  distributorInventorySyncFields: {
    parentSKU: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_PARENT_SKU,
    month: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_MONTH,
    area: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_AREA,
    channel: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_CHANNEL,
    subChannel: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_SUB_CHANNEL,
    sku: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_SKU
  },
  distributorInventorySyncFilePrefix: process.env.DISTRIBUTOR_INVENTORY_SYNC_FILE_PREFIX,
  distributorInventorySyncPSKUFilePrefix: process.env.DISTRIBUTOR_INVENTORY_SYNC_PSKU_FILE_PREFIX,
  autoClosureApi: process.env.AUTO_CLOSURE_API,
}

configuration.admin = {
  cognitoClientId: process.env.COGNITO_CLIENT_ID,
  cognitoIdpName: process.env.COGNITO_IDP_NAME
}

configuration.URL = {
  frontEnd: process.env.FE_URL
}
configuration.mtecom ={
  mrpCaselotUrl: process.env.MTECOM_MRP_API_URL,
  soCreationUrl: process.env.MTECOM_SO_CREATION_API_URL,
  mrpCheck2Url: process.env.MTECOM_MRP_CHECK2_API_URL,
  getSODetailsUrl: process.env.SAP_SO_DETAILS_API,
  auth: {
    username: process.env.MTECOM_USER,
    password: process.env.MTECOM_PASSWORD
  },
  amendmentUrl: process.env.MTECOM_AMENDMENT_API_URL,
}
configuration.otp = {
  apiUrl: process.env.MMX_API_URL,
  auth: {
    username: process.env.MMX_USER,
    password: process.env.MMX_PASSWORD,
  },
  smsTestingMobileNumber: process.env.SMS_TESTING_MOBILE_NUMBER
}
configuration.email = {
  enableEmail: process.env.ENABLE_EMAIL || 'TRUE',
  apiKey: process.env.API_KEY,
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  accessKeyId: process.env.SES_ACCESS_KEY_ID,
  secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
  region: process.env.SES_REGION,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  warehouseDetailsFetchFailedMailId: process.env.WAREHOUSE_DETAILS_FETCH_FAILED_MAILID,
  reportPortalErrorMailIds: process.env.REPORT_PORTAL_ERROR_MAILIDS,
  reportAutoValidationErrorMailIds: process.env.REPORT_ARS_AUTO_VALIDATION_ERROR_MAILIDS,
}
configuration.url = {
  FE: process.env.FE,
  API: process.env.API,
  FE_URL_CORS: process.env.FE_URL_CORS?.split(',')
}
configuration.orderApi = {
  orderBaseUrl: process.env.ORDER_API_BASE_URL,
}
configuration.clearTax = {
  gstUrl: process.env.REACT_APP_CLEARTAX_GST_URL,
  panUrl: process.env.REACT_APP_CLEARTAX_PAN_URL,
  panExtraUrl : process.env.REACT_APP_CLEARTAX_EXTRA_PAN_URL,
  auth: {
    authorization: process.env.REACT_APP_CLEARTAX_BEARER_TOKEN,
    xCleartaxAuthToken: process.env.REACT_APP_CLEARTAX_AUTH_TOKEN
}
}
configuration.order ={
  customerGroupForOrdering : process.env.CUSTOMER_GROUPS_FOR_ORDERING
}

configuration.arsApi = {
  arsBaseUrl: process.env.ARS_API_BASE_URL
}

configuration.sqs = {
  accessKeyId: process.env.SQS_ACCESS_KEY_ID,
  secretAccessKey: process.env.SQS_SECRET_ACCESS_KEY,
  region: process.env.SQS_REGION,
  aosSubmitQueueUrl: process.env.AOS_SUBMIT_SQS_QUEUE_URL
}

configuration.mule = {
  clientId: process.env.MULE_CLIENT_ID,
  clientSecret: process.env.MULE_CLIENT_SECRET,
  xTransactionId: process.env.MULE_X_TRANSACTION_ID,
  productHierarchyApi: process.env.MULE_PRODUCT_HIERARCHY_API,
}


module.exports = configuration;