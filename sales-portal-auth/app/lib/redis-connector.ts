// Desc: Redis connector class to handle redis operations

import * as redis from 'redis';
import logger from './logger';
import eventEmitter from '../events/processEvent';
import { publicDecrypt } from 'crypto';

const redisConfig = global['configuration'].redis;

class RedisConnector {
    private client: any | null = null;

    constructor() {
        this.createRedisClient();
    }

    public async createRedisClient() {
        const redisHost = redisConfig?.host || 'localhost';
        const redisPort = redisConfig?.port || '6379';
        const redisURL = `redis://${redisHost}:${redisPort}`;

        this.client = redis.createClient({
            url: redisURL, 
            socket: { 
                connectTimeout : 10000,
                reconnectStrategy: (retries) => {
                    logger.info(`Redis reconnecting attempt stopped ${retries}`); 
                    return false;
                }
            }
        });

        this.client.on('connect', () => {
            logger.info(`Redis connected to ${redisURL}`);
        });
        
        this.client.on('ready', () => {
            eventEmitter.emit('redisReady', this.client);
        });

        this.client.on('reconnecting', () => {
            logger.info('Redis reconnecting');
        });

        this.client.on('error', (error: any) => {
            if (error.code == 'ECONNREFUSED') {
                logger.error('Redis connection refused');
            } else {
                logger.error(`Redis error: ${error}`);
            }
        });

        await this.client.connect().catch((error: any) => {
            logger.warn(`Redis connection error: ${error}`);
        });
    }

    getRedisClient() {
        if (!this.client) {
            this.createRedisClient();
        }
        return this.client;
    }   

    public async set(key: string, value: string) {
        return await this.client.set(key, JSON.stringify(value));
    }

    public async get(key: string) {
        if(this.client.isOpen) {
            const data = await this.client.get(key);
            return JSON.parse(data);
        } else { 
            return null 
        }
    }
}

class RedisConnectorSingleton {
    private static instance: RedisConnector | null = null;

    private constructor() {}

    public static getInstance(): RedisConnector {
        if (!RedisConnectorSingleton.instance) {
            RedisConnectorSingleton.instance = new RedisConnector();
        }
        return RedisConnectorSingleton.instance;
    }

    public static async set(key: string, value: string) {
        return RedisConnectorSingleton.getInstance().set(key, value);
    }

    public static async get(key: string) {
        return RedisConnectorSingleton.getInstance().get(key);
    }
}

export default RedisConnectorSingleton.getInstance();