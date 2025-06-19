require('dotenv').config();
import http from 'http';
import debug from 'debug';
import eventEmitter from './app/events/processEvent'
// After you declare "app"
const env = process.env.NODE_ENV || 'dev'
global.configuration = require(`./app/config/environments/${env}`);
import App from './express';
const port = (process.env.AUTH_SERVICE_PORT);
import logger from './app/lib/logger';

import redisConnector from './app/lib/redis-connector';

import PostgresqlConnection from './app/lib/postgresqlConnection';
const conn = PostgresqlConnection.getInstance();

import RedisConnector from './app/lib/redis-connector';

const write = conn.getWriteClient();
const reader = conn.getReadClient();
conn.notifyReady();

const server = http.createServer(App);
let redisReady = false;

if (!module.parent) {
  eventEmitter.on('dbConnectionsReady', () => {
    if (!global['serviceUp']) {
      server.listen(process.env.AUTH_SERVICE_PORT,
        () => {
          logger.info(`API running in environment ${process.env.NODE_ENV}`);
          logger.info(`API running at http://localhost:${port}`);
        },
      );
      server.setTimeout(200000);
      if (process['parent']) process.send('ready');
    }
  });
}

server.on('error', onError);
server.on('listening', onListening);


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
  
  // redisConnector.getRedisClient().disconnect();

  // Wait 10 secs for existing connection to close and then exit.
  setTimeout(() => {
    logger.info('Shutting down server');
    process.exit(0);
  }, 1000);
};

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('unhandledRejection', {
    promise,
    reason
  });
  logger.error('unhandledRejection  reason: ', reason);
  logger.error('unhandledRejection promise: ', promise);
  process.exit(1);
});

process.on('SIGINT', gracefulStopServer);
process.on('SIGTERM', gracefulStopServer);

function onListening(): void {
  global['serviceUp'] = true;
  let addr = server.address();
  let bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;;
}
