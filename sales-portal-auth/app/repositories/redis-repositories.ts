import { appSettings, distributorList, adminAppSettings } from '../schemas/redis-schemas';
import { Entity, Repository } from 'redis-om';
import redisConnector from '../lib/redis-connector';
import logger from '../lib/logger';
import eventEmitter from '../../app/events/processEvent';

class CustomRespoitory extends Repository {
    isClientOpen: boolean;

    constructor(schema, client){
        super(schema, client)
        this.isClientConnected()
    }

    async isClientConnected () {
        this.isClientOpen = redisConnector.getRedisClient().closed ? false : true;

        // eventEmitter.on('redisReady', (client) => {
        //     this.isClientOpen = true;
        // });
    }

    async fetchAll(id: string){
        if (!this.isClientOpen){
            return {};
        }

        const data = await super.fetch(id).catch((error) => {
            logger.error(`Error fetching data from redis for id: ${id} :: ${error.message}`);
            return {};
        });
        return Object.values(data);
    }

    async saveAll(id: string, data: Entity){
        if (!this.isClientOpen){
            return {};
        }

        return super.save(id, data).catch((error) => {
            logger.error(`Error saving data to redis for id: ${id} :: ${error.message}`);
            return {};
        });
    }

    async removeById(id: string){
        if (!this.isClientOpen){
            return {};
        }

        return super.remove(id).catch((error) => {
            logger.error(`Error removing data from redis for id: ${id} :: ${error.message}`);
            return {};
        });
    }

}

const appSettingsRepository: CustomRespoitory = new CustomRespoitory(appSettings, redisConnector.getRedisClient())
const adminAppSettingsRepository: CustomRespoitory = new CustomRespoitory(adminAppSettings, redisConnector.getRedisClient())
const distributorListRepository: CustomRespoitory = new CustomRespoitory(distributorList, redisConnector.getRedisClient())

export { appSettingsRepository, distributorListRepository, adminAppSettingsRepository }