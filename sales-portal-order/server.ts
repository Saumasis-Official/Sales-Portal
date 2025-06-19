require('dotenv').config();
import http from 'http';
import debug from 'debug';
// After you declare "app"
const env = process.env.NODE_ENV || 'dev'
console.log(` using ${process.env.NODE_ENV} to run application`);
global.configuration = require(`./app/config/environments/${env}`);
import App from './express';
import eventEmitter from './app/events/processEvent'
const port = (process.env.ORDER_SERVICE_PORT);
import logger from './app/lib/logger';
import PostgresqlConnection from './app/lib/postgresqlConnection';
import snowflakeConnection from './app/lib/snowflakeConnection';

const conn = PostgresqlConnection.getInstance();

const write = conn.getWriteClient();
const reader = conn.getReadClient();
conn.notifyReady();

snowflakeConnection.getConnection()
const appServer = http.createServer(App);

if (!module.parent) {
  eventEmitter.on('dbConnectionsReady', () => {
    if (!global['serviceUp']) {
      appServer.listen(process.env.ORDER_SERVICE_PORT,
        () => {
          logger.info(`API running in environment ${process.env.NODE_ENV}`);
          logger.info(`API running at http://localhost:${port}`);
        },
      );
      appServer.setTimeout(200000);
      if (process['parent']) process.send('ready');
    }
  });
}


appServer.on('error', onError);
appServer.on('listening', onListening);

function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') throw error;
  let bind = (typeof port === 'string') ? 'Pipe ' + port : 'Port ' + port;
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

const gracefulStopServer = function () {
  // Wait 10 secs for existing connection to close and then exit.
  setTimeout(() => {
    logger.info('Shutting down server');
    process.exit(0);
  }, 1000);
};

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception: ', err);
  console.trace("Uncaught exception: ", err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('unhandledRejection: ', reason, promise);
  console.trace("unhandledRejection Reason-Promise: ", reason, promise);
  process.exit(1);
});

process.on('SIGINT', gracefulStopServer);
process.on('SIGTERM', gracefulStopServer);

function onListening(): void {
  global['serviceUp'] = true;
  let addr = appServer.address()
  let bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;
  console.log(`Listening on ${bind}`);
}

// Adding comment due to build detect failure
