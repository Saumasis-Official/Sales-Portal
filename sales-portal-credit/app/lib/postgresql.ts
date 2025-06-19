require('dotenv').config();
import APIError from '../helper/errors';
import logger from './logger';
import { Pool, Client } from 'pg';
import eventEmitter from '../events/processEvent';
// const config = global['configuration'].pgsql;

const connectionConfig = {
  pgsql_connection_url: process.env.PGSQL_CONNECTION_URL,
  pgsql_host: process.env.PGSQL_HOST,
  pgsql_database_name: process.env.PGSQL_DATABASE_NAME,
  pgsql_username: process.env.PGSQL_USERNAME,
  pgsql_password: process.env.PGSQL_PASSWORD,
  pgsql_port: parseInt(process.env.PGSQL_PORT)
}

const connection = new Pool({
  host: connectionConfig.pgsql_host,
  user: connectionConfig.pgsql_username,
  port: connectionConfig.pgsql_port,
  password: connectionConfig.pgsql_password,
  database: connectionConfig.pgsql_database_name,
  max: 20,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 20000,
})
connection.connect((error: any) => {
    
  // in case of error
  if (error) throw new APIError(`PostgreSQL connection failed (connect) to port ${connectionConfig.pgsql_port} and ${connectionConfig.pgsql_host} host due to ${error}`, 1);
  else {
    logger.info(`PostgreSQL connected to port ${connectionConfig.pgsql_port} and ${connectionConfig.pgsql_host} host`);
    eventEmitter.emit('dbReady', connection);
  }
});
connection.on('error', (error: any) => {
  logger.error(`Cannot establish a connection with the database due to ${error}`);
  /** To Prevent sensitive info leak, not raising  actual error */
  throw new APIError(`PostgreSQL connection failed (event) due to ${error}`, 1);
});

export default connection;