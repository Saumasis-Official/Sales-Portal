/* eslint quote-props: 0 */
import dotenv from 'dotenv';
dotenv.config();
export {};
const configuration: Record<string, object> = {};

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

configuration.sap = {
    updateLoginSettingApiEndpoint: process.env.UPDATE_LOGIN_SETTING_API,
    updateAlertSettingsApiEndpoint: process.env.UPDATE_ALERT_SETTINGS_API,
    updateAlertHistoryApiEndpoint: process.env.UPDATE_ALERT_HISTORY_API,
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
    retryCountLimit: process.env.RETRY_OTP_COUNT_LIMIT,
    retryIntervalLimit: process.env.RETRY_OTP_INTERVAL_LIMIT,
    invalidCountLimit: process.env.INVALID_OTP_COUNT_LIMIT,
    invalidIntervalLimit: process.env.INVALID_OTP_INTERVAL_LIMIT,
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
};
configuration.url = {
    FE: process.env.FE,
    API: process.env.API,
    FE_URL_CORS: process.env.FE_URL_CORS?.split(','),
    ARS_ALLOCATION_BASE_URL: process.env.ARS_ALLOCATION_BASE_URL,
};
configuration.admin = {
    cognitoClientId: process.env.COGNITO_CLIENT_ID,
    cognitoIdpName: process.env.COGNITO_IDP_NAME,
    queryPassword: 'Dont tell Vijay/Amit',
};
configuration.order = {
    customerGroupForOrdering: process.env.CUSTOMER_GROUPS_FOR_ORDERING,
    exclusionGroup: process.env.EXCLUSION_GROUP,
};

configuration.redis = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
};
module.exports = configuration;
