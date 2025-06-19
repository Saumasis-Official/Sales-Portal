import logger from '../lib/logger';
import Template from "../helper/responseTemplate";
import { SuccessMessage } from '../constant/sucess.message';
import { ErrorMessage } from '../constant/error.message';
import { Request, Response } from 'express';
import redisConnector from '../lib/redis-connector';

class redisController{ 
    static async setRedisData(req: Request, res: Response) {
        return {}
    }

    static async getRedisData(req: Request, res: Response) { 
        return {}
    }

    static async deleteRedisData(req: Request, res: Response) { 
        return {}
    }

    static async flushRedisData(req: Request, res: Response) {
        let client = redisConnector.getRedisClient();
        return client.flushall('ASYNC', ()=> {
            return Template.successResponse(res, SuccessMessage.REDIS_FLUSHED, {});
        })
    }
}

export default redisController;