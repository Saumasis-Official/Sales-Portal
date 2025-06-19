import snowflake from 'snowflake-sdk';
import eventEmitter from '../events/processEvent';
import logger from './logger';
import * as crypto from 'crypto';

const snowflakeConfig = global['configuration'].snowflake;

class SnowflakeConnection {
    connection: snowflake.Connection | null = null;
    isConnected: boolean = false;

    static instance: SnowflakeConnection;

    constructor() {
        if (!SnowflakeConnection.instance) {
            SnowflakeConnection.instance = this;
        }
        return SnowflakeConnection.instance;
    }

    createConnection() {
        const privateKeyPem = this.getSecretKey();
        if (!privateKeyPem) {
            logger.error('Unable to get private key');
            this.isConnected = false;
            return;
        }
        this.connection = snowflake.createConnection({
            account: snowflakeConfig.snow_park_account,
            username: snowflakeConfig.snow_park_user,
            role: snowflakeConfig.snow_park_role,
            warehouse: snowflakeConfig.snow_park_warehouse,
            clientSessionKeepAlive: true,
            privateKey: privateKeyPem,
            authenticator: snowflakeConfig.snow_park_authenticator,
        });

        this.connection.connect((err, conn) => {
            if (err) {
                console.error('Unable to connect: ' + err.message);
                this.isConnected = false;
            } else {
                console.log('Successfully connected to Snowflake.');
                this.isConnected = true;
            }
        });
    }

    getConnection() {
        if (!this.isConnected) {
            this.createConnection();
        }
        return this.connection;
    }

    async query(sql: string, binds: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            const connection = this.getConnection();
            if (!connection) {
                return reject(new Error('No connection available'));
            }

            connection.execute({
                sqlText: sql,
                binds: binds,
                complete: (err, stmt, rows) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(rows);
                },
            });
        });
    }

    getSecretKey() {
        const privateKey = snowflakeConfig.snow_park_private_key?.replace(/\\n/g, '\n');
        const privateKeyPassphrase = snowflakeConfig.snow_park_pass_phrase;
        if (!privateKey || !privateKeyPassphrase) {
            logger.error("CAUGHT: Error in SnowflakeConnection->getSecretKey : Private Key or Pass Phrase not found")
            return null;
        }
        try {
            const privateKeyObject = crypto.createPrivateKey({
                key: privateKey,
                format: 'pem',
                passphrase: privateKeyPassphrase,
            });
            return privateKeyObject
                ?.export({
                    format: 'pem',
                    type: 'pkcs8',
                })
                ?.toString() ?? null;
        }
        catch (error) {
            logger.error("CAUGHT: Error in SnowflakeConnection->getSecretKey: ", error);
            return null;
        }
    }
}

const snowflakeConnection = new SnowflakeConnection();
export default snowflakeConnection;
