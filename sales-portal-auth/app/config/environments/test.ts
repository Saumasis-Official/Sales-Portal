/* eslint quote-props: 0 */
require('dotenv').config();
export { }
const configuration: any = {};
require('./test.env');

configuration.pgsql = {
  pgsql_connection_url: process.env.PGSQL_CONNECTION_URL,
  pgsql_host: process.env.PGSQL_HOST,
  pgsql_database_name: process.env.PGSQL_DATABASE_NAME,
  pgsql_username: process.env.PGSQL_USERNAME,
  pgsql_password: process.env.PGSQL_PASSWORD,
  pgsql_port: process.env.PGSQL_PORT
}

configuration.pgsql_read = {
  pgsql_connection_url: process.env.PGSQL_CONNECTION_URL_READ,
  pgsql_host: process.env.PGSQL_HOST_READ,
  pgsql_database_name: process.env.PGSQL_DATABASE_NAME,
  pgsql_username: process.env.PGSQL_USERNAME,
  pgsql_password: process.env.PGSQL_PASSWORD,
  pgsql_port: process.env.PGSQL_PORT
}
configuration.email = {
  enableEmail: process.env.ENABLE_EMAIL
}

configuration.azureAD = {
  clientID: process.env.AZUREAD_CLIENTID,
  authority: process.env.AZUREAD_AUTHORITY,
  secret: process.env.AZUREAD_SECRET,
  scopes: process.env.AZUREAD_SCOPES?.split(','),
  email_search_uri: process.env.AZUREAD_EMAIL_SEARCH_URI,
}
configuration.order ={
  customerGroupForOrdering : process.env.CUSTOMER_GROUPS_FOR_ORDERING,
  exclusionGroup : process.env.EXCLUSION_GROUP,
}

configuration.redis = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
}

global['configuration'] = configuration;
module.exports = global['configuration'];