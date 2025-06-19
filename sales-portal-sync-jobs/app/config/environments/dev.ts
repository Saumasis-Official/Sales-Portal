/* eslint quote-props: 0 */
import 'dotenv/config';
export {};
const configuration: { [key: string]: object } = {};

configuration.pgsql = {
    pgsql_connection_url: process.env.PGSQL_CONNECTION_URL,
    pgsql_host: process.env.PGSQL_HOST,
    pgsql_database_name: process.env.PGSQL_DATABASE_NAME,
    pgsql_username: process.env.PGSQL_USERNAME,
    pgsql_password: process.env.PGSQL_PASSWORD,
    pgsql_port: process.env.PGSQL_PORT,
};

configuration.pgsql_read = {
    pgsql_connection_url: process.env.PGSQL_CONNECTION_URL_READ || process.env.PGSQL_CONNECTION_URL,
    pgsql_host: process.env.PGSQL_HOST_READ || process.env.PGSQL_HOST,
    pgsql_database_name: process.env.PGSQL_DATABASE_NAME,
    pgsql_username: process.env.PGSQL_USERNAME,
    pgsql_password: process.env.PGSQL_PASSWORD,
    pgsql_port: process.env.PGSQL_PORT,
};

configuration.s3 = {
    region: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_REGION,
    urlTimeout: process.env.S3_URL_TIMEOUT,
};

configuration.sap = {
    openSOApiEndpoint: process.env.SAP_OPEN_SO_API,
    distributorsApiEndpoint: process.env.SAP_DISTRIBUTOR_API,
    salesHierarchyApiEndpoint: process.env.SAP_SALES_HIERARCHY_API,
    materialsApiEndpoint: process.env.SAP_MATERIALS_API,

    auth: {
        username: process.env.SAP_AUTH_USERNAME,
        password: process.env.SAP_AUTH_PASSWORD,
    },
    salesHierarchyAuth: {
        username: process.env.SAP_SH_AUTH_USERNAME,
        password: process.env.SAP_SH_AUTH_PASSWORD,
    },
    distributorInventorySyncAwsConfig: {
        accessKeyId: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_SECRET_ACCESS_KEY,
        region: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_REGION,
        bucket: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_S3_BUCKET,
        folderPath: process.env.DISTRIBUTOR_INVENTORY_SYNC_AWS_S3_FOLDER_PATH,
    },
    distributorInventorySyncFields: {
        parentSKU: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_PARENT_SKU,
        skuDescription: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_PSKU_DESCRIPTION,
        month: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_MONTH,
        area: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_AREA,
        channel: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_CHANNEL,
        subChannel: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_SUB_CHANNEL,
        sku: process.env.DISTRIBUTOR_INVENTORY_SYNC_FIELD_SKU,
    },
    distributorInventorySyncFilePrefix: process.env.DISTRIBUTOR_INVENTORY_SYNC_FILE_PREFIX,
    distributorInventorySyncPSKUFilePrefix: process.env.DISTRIBUTOR_INVENTORY_SYNC_PSKU_FILE_PREFIX,
    nourishcoPlanningSyncFilePrefix: process.env.NOURISHCO_INVENTORY_SYNC_FILE_PREFIX,
    mtEcomSoSync: process.env.MT_ECOM_SO_SYNC,
};
configuration.sapApi = {
    warehouseDetailsOnDistChannel: process.env.SAP_MICROSERVICE_URL + '/api/v1' + '/warehouse-details-dist-channel',
    validateUrl: process.env.SAP_MICROSERVICE_URL + '/api/v1' + '/validate-order',
    reportErrorUrl: process.env.SAP_MICROSERVICE_URL + '/api/v1' + '/report-portal-error',
};
configuration.snowflake = {
    snow_park_account: process.env.SNOW_PARK_ACCOUNT,
    snow_park_user: process.env.SNOW_PARK_USER,
    snow_park_role: process.env.SNOW_PARK_ROLE,
    snow_park_warehouse: process.env.SNOW_PARK_WAREHOUSE,
    snow_park_pass_phrase: process.env.SNOW_PARK_PASS_PHRASE,
    snow_park_private_key: process.env.SNOW_PARK_PRIVATE_KEY,
    snow_park_authenticator: process.env.SNOW_PARK_AUTHENTICATOR,
};
configuration.arsDockerApis = {
    API: process.env.ARS_API_URL,
    USERNAME: process.env.ARS_USERNAME,
    PASSWORD: process.env.ARS_PASSWORD,
};

configuration.orderApi = {
    orderBaseUrl: process.env.ORDER_API_BASE_URL,
};

configuration.arsServiceApi = {
    arsServiceBaseUrl: process.env.ARS_SERVICE_BASE_URL,
};

configuration.admin = {
    cognitoClientId: process.env.COGNITO_CLIENT_ID,
    cognitoIdpName: process.env.COGNITO_IDP_NAME,
};

configuration.URL = {
    frontEnd: process.env.FE_URL,
};
configuration.otp = {
    apiUrl: process.env.MMX_API_URL,
    auth: {
        username: process.env.MMX_USER,
        password: process.env.MMX_PASSWORD,
    },
    smsTestingMobileNumber: process.env.SMS_TESTING_MOBILE_NUMBER,
};
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
    reportAutoValidationErrorMailIds: process.env.REPORT_ARS_AUTO_VALIDATION_ERROR_MAILIDS,
};
configuration.url = {
    FE: process.env.FE,
    API: process.env.API,
    FE_URL_CORS: process.env.FE_URL_CORS?.split(','),
};
configuration.mule = {
    clientId: process.env.MULE_CLIENT_ID,
    clientSecret: process.env.MULE_CLIENT_SECRET,
    xTransactionId: process.env.MULE_X_TRANSACTION_ID,
    productHierarchyApi: process.env.MULE_PRODUCT_HIERARCHY_API,
};
configuration.sms = {
    from: 'TCPPRI',
    apiUrl: process.env.MMX_API_URL,
    auth: {
        username: process.env.MMX_USER,
        password: process.env.MMX_PASSWORD,
    },
    smsTestingMobileNumber: process.env.SMS_TESTING_MOBILE_NUMBER ?? '8622018610',
};
module.exports = configuration;
