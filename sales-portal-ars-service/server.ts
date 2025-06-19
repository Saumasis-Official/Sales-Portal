require('dotenv').config();
import http from 'http';
import os from "os";

const env = process.env.NODE_ENV || 'dev'
global.configuration = require(`./app/config/environments/${env}`);

import App from './express'
import eventEmitter from './app/events/processEvent';
import logger from './app/lib/logger';
import PostgresqlConnection from './app/lib/postgresqlConnection';

const conn = PostgresqlConnection.getInstance();
const reader = conn.getReadClient();
const writer = conn.getWriteClient();
conn.notifyReady();

const host = os.hostname();

const server = http.createServer(App)
const port = process.env.ARS_SERVICE_PORT;

if (!module.parent) {
    eventEmitter.on('dbConnectionsReady', () => {
        if (!global['serviceUp']) {
            server.listen(process.env.ARS_SERVICE_PORT, () => {
                logger.info(`API running in environment ${env}`); 
                logger.info(`API running at http://${host}:${port} `) 
            })
            server.setTimeout(200000);
            if (process['parent']) process.send('ready');
        }
    })
}

server.on('error', onError);
server.on('listening', onListening)

//Replace with graceful termination
process.on('SIGTERM', gracefulStopServer)
process.on('SIGINT', gracefulStopServer)

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

function onListening():void {
    global['serviceUp'] = true;
    let addr = server.address()
    let bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;
    console.log(`Listening on ${bind}`);
}

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

function gracefulStopServer () {
    // Wait 10 secs for existing connection to close and then exit.
    setTimeout(() => {
        logger.info('Shutting down server');
        process.exit(0);
    }, 1000);
};