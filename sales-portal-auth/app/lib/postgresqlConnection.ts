import { Pool, PoolClient } from "pg";
import APIError from '../helper/errors';
import logger from './logger';
import eventEmitter from '../events/processEvent';

const pgsqlWriteConfig = global['configuration'].pgsql;
const pgsqlReadConfig = global['configuration'].pgsql_read;
const env = process.env.NODE_ENV;
let maxPoolSize: number = 30;
if (env === 'prod') {
    maxPoolSize = 150;
}


class PostgresqlConnection {
    connectionWritePool: Pool | null = null
    connectionReadPool: Pool | null = null
    readerReady: boolean = false;
    writerReady: boolean = false;

    static instance: PostgresqlConnection;

    createWriteConnection(config) {
        this.connectionWritePool = new Pool({
            host: config.pgsql_host,
            user: config.pgsql_username,
            port: parseInt(config.pgsql_port) || 5432,
            password: config.pgsql_password,
            database: config.pgsql_database_name,
            max: maxPoolSize,
            idleTimeoutMillis: 1000,
            connectionTimeoutMillis: 5000,
        });

        this.connectionWritePool.connect((error: any) => {
            if (error)
                throw new APIError(`PostgreSQL Write (connect) connection failed to port ${pgsqlWriteConfig.pgsql_port} and ${pgsqlWriteConfig.pgsql_host} host due to ${error}`, 1);
            else {
                logger.info(`PostgreSQL connected WRITE Node to port ${pgsqlWriteConfig.pgsql_port} and ${pgsqlWriteConfig.pgsql_host} host`);
                eventEmitter.emit('dbWriteReady', this.connectionWritePool);
                // this.writerReady = true;
            }
        });

        eventEmitter.on('dbWriteReady', (connection) => {
            this.writerReady = true;
            this.notifyReady();
        });

        return this.connectionWritePool;
    }
    createReadConnection(config) {
        this.connectionReadPool = new Pool({
            host: config.pgsql_host,
            user: config.pgsql_username,
            port: parseInt(config.pgsql_port) || 5432,
            password: config.pgsql_password,
            database: config.pgsql_database_name,
            max: maxPoolSize,
            idleTimeoutMillis: 1000,
            connectionTimeoutMillis: 5000,
        });

        this.connectionReadPool.connect((error: any) => {
            if (error)
                throw new APIError(`PostgreSQL Read (connect) connection failed to port ${pgsqlReadConfig.pgsql_port} and ${pgsqlReadConfig.pgsql_host} host due to ${error}`, 1);
            else {
                logger.info(`PostgreSQL connected READ Node to port ${pgsqlReadConfig.pgsql_port} and ${pgsqlReadConfig.pgsql_host} host`);
                eventEmitter.emit('dbReadReady', this.connectionReadPool);
                // this.readerReady = true;
            }
        });

        eventEmitter.on('dbReadReady', (connection) => {
            this.readerReady = true;
            this.notifyReady();
        });

        return this.connectionReadPool;
    }

    public notifyReady() {
        if (this.readerReady && this.writerReady){
            eventEmitter.emit('dbConnectionsReady', "Cluster ready");
        }
    }

    public async getReadClient() {
        if (this.connectionReadPool)
            return this.connectionReadPool.connect();
        return this.createReadConnection(pgsqlReadConfig).connect();
    }

    public async getWriteClient() {
        if (this.connectionWritePool)
            return this.connectionWritePool.connect();
        return this.createWriteConnection(pgsqlWriteConfig).connect();
    }

    public static getInstance(): PostgresqlConnection {
        if (!this.instance) {
            this.instance = new PostgresqlConnection();
        }
        return this.instance;
    }
}

export default PostgresqlConnection;