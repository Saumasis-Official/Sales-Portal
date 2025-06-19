/* eslint quote-props: 0 */
require('dotenv').config();
export {};
const configuration: any = {};

configuration.pgsql = {
    pgsql_connection_url: process.env.PGSQL_CONNECTION_URL,
    pgsql_host: process.env.PGSQL_HOST,
    pgsql_database_name: process.env.PGSQL_DATABASE_NAME,
    pgsql_username: process.env.PGSQL_USERNAME,
    pgsql_password: process.env.PGSQL_PASSWORD,
    pgsql_port: process.env.PGSQL_PORT,
};

configuration.pgsql_read = {
    pgsql_connection_url: process.env.PGSQL_CONNECTION_URL_READ,
    pgsql_host: process.env.PGSQL_HOST_READ,
    pgsql_database_name: process.env.PGSQL_DATABASE_NAME,
    pgsql_username: process.env.PGSQL_USERNAME,
    pgsql_password: process.env.PGSQL_PASSWORD,
    pgsql_port: process.env.PGSQL_PORT,
};

configuration.sap = {
    creditExtentionUpdateApi: process.env.SAP_UPDATE_CREDIT_EXTENSION,
    creditLimitApiEndpoint: process.env.SAP_CREDIT_LIMIT_API,
    auth: {
        username: process.env.SAP_AUTH_USERNAME,
        password: process.env.SAP_AUTH_PASSWORD,
    },
};

configuration.admin = {
    cognitoClientId: process.env.COGNITO_CLIENT_ID,
    cognitoIdpName: process.env.COGNITO_IDP_NAME,
};

configuration.URL = {
    frontEnd: process.env.FE_URL,
};

configuration.email = {
    enableEmail: process.env.ENABLE_EMAIL || 'TRUE',
    apiKey: process.env.API_KEY,
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
};

configuration.url = {
    FE: process.env.FE,
    API: process.env.API,
    FE_URL_CORS: process.env.FE_URL_CORS?.split(','),
};

configuration.crypto = {
    encryptionKey: process.env.ENCRYPTION_KEY,
};

configuration.s3 = {
    region: process.env.S3_REGION,
    creditLimitBucket: process.env.CREDIT_LIMIT_S3_BUCKET,
    creditLimitS3Path: process.env.CREDIT_LIMIT_S3_FOLDER_PATH + '/dev',
    creditLimitBaseLimitS3Path: process.env.CREDIT_LIMIT_BASELIMIT_UPLOAD_S3_FOLDER_PATH + '/dev',
    urlTimeout: process.env.S3_URL_TIMEOUT,
    creditLimitGTExcelS3Path: process.env.CREDIT_LIMIT_GT_S3_EXCEL_FOLDER_PATH + '/dev',
};

configuration.logLevel = 'info';

global['configuration'] = configuration;
module.exports = global['configuration'];
