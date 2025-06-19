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
  openSOApiEndpoint: process.env.OPEN_SO_API
}

configuration.admin = {
  cognitoClientId: process.env.COGNITO_CLIENT_ID,
  cognitoIdpName: process.env.COGNITO_IDP_NAME
}

configuration.URL = {
  frontEnd: process.env.FE_URL
}
configuration.otp = {
  apiUrl: process.env.MMX_API_URL,
  auth: {
    username: process.env.MMX_USER,
    password: process.env.MMX_PASSWORD,
  }
}
configuration.email = {
  enableEmail: process.env.ENABLE_EMAIL || 'TRUE',
  apiKey: process.env.API_KEY,
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  accessKeyId: process.env.SES_ACCESS_KEY_ID,
  secretAccessKey: process.env.SES_SECRET_ACCESS_KEY,
  region: process.env.SES_REGION,
  reportAutoValidationErrorMailIds: process.env.REPORT_ARS_AUTO_VALIDATION_ERROR_MAILIDS,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  }
}
// configuration.twilio = {
//   sid: process.env.SID,
//   token: process.env.TOKEN,
//   phone: process.env.PHONE,
// }
configuration.url = {
  FE: process.env.FE,
  API: process.env.API,
  FE_URL_CORS: process.env.FE_URL_CORS?.split(',')
}
// configuration.uploadpath = {
//   uploaddir: process.env.UPLOAD_DIR,
//   profiledir: process.env.PROFILE_PICTURE_DIR
// }
configuration.aoDatalake = {
  API: process.env.AO_DATALAKE_API_URL,
  USERNAME: process.env.AO_DATALAKE_USERNAME,
  PASSWORD: process.env.AO_DATALAKE_PASSWORD,
}
configuration.arsDockerApis = {
  API: process.env.ARS_API_URL,
  USERNAME: process.env.ARS_USERNAME,
  PASSWORD: process.env.ARS_PASSWORD,
}
configuration.sapApi = {
  warehouseDetailsOnDistChannel: process.env.SAP_MICROSERVICE_URL + '/api/v1' + '/warehouse-details-dist-channel',
  validateUrl: process.env.SAP_MICROSERVICE_URL + '/api/v1' + '/validate-order',
  reportErrorUrl: process.env.SAP_MICROSERVICE_URL + '/api/v1' + '/report-portal-error',
  createOrderUrl: process.env.SAP_MICROSERVICE_URL + '/api/v1/create-order',
}
configuration.crypto = {
  encryptionKey: process.env.ENCRYPTION_KEY
}
configuration.rushOrder = {
  requestCC : process.env.RO_CC,
}
configuration.s3 = {
  accessKey: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION,
  forecastBucket: process.env.FORECAST_S3_BUCKET,
  forecastDownloadPath: process.env.FORECAST_DONWLOAD_S3_FOLDER_PATH + '/uat',
  forecastUploadPath: process.env.FORECAST_UPLOAD_S3_FOLDER_PATH + '/uat',
  forecastArchivePath: process.env.FORECAST_ARCHIVE_S3_FOLDER_PATH + '/uat',
  urlTimeout: process.env.S3_URL_TIMEOUT,
}
configuration.order ={
  inclusionCustomerGroup : process.env.INCLUSION_CUSTOMER_GROUPS
}

configuration.snowflake = {
  snow_park_account: process.env.SNOW_PARK_ACCOUNT,
  snow_park_user: process.env.SNOW_PARK_USER,
  snow_park_role: process.env.SNOW_PARK_ROLE,
  snow_park_warehouse: process.env.SNOW_PARK_WAREHOUSE,
  snow_park_pass_phrase: process.env.SNOW_PARK_PASS_PHRASE,
  snow_park_private_key: process.env.SNOW_PARK_PRIVATE_KEY,
  snow_park_authenticator: process.env.SNOW_PARK_AUTHENTICATOR,
};
configuration.logLevel = 'info';
module.exports = configuration;