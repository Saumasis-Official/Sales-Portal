import {Request, Response} from 'express';
import logger from '../lib/logger';
import responseTemplate from '../helper/responseTemplate';

const validation = {
    async validateToken(req: Request, res: Response, next) {
        try {
            logger.info("Bearer Auth Authentication");
            const bearer_auth = req?.headers?.["bearer-auth"];
            if(bearer_auth === process.env.BEARER_AUTH){
                next();
            }else{
                return res.status(401).json(responseTemplate.tokenRequiredAuthError());
            }
        } catch (error) {
            logger.error("CAUGHT: Error in Bearer Auth Authentication, Error = ", error);
            return res.status(500).json({message: "Internal Server Error"});   
        }
    }
}

export default validation;