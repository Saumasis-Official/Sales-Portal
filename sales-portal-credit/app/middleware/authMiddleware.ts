require('dotenv').config();
const jwt = require("jsonwebtoken");
import responseTemplate from '../helper/responseTemplate';
import { UserService } from '../service/user.service';

const validation: any = {
  validateToken(req, res, next) {
    try {
      // validatr token here is its valid here
      const token = req.headers.authorization;
      if (token) {
        jwt.verify(token, process.env.SECRET_KEY, async(err, data) => {
          if (err) {
            res.status(403).json(responseTemplate.commonAuthUserDataError());
          } else {
            if(req.headers['x-correlation-id']){
              const correlationId = req.headers['x-correlation-id'];
              const result =await UserService.getSessionInvalidateStatus(data?.login_id,correlationId);
              if(result && result.length){
                const count = result[0]['count']
                if(+count>0){
                  return res.status(403).json(responseTemplate.invalidSession());
                }
              }
            }
            req.user = data;
            next();
          }
        });
      } else {
        res.status(403).json(responseTemplate.tokenRequiredAuthError());
      }
    } catch (error) {
      res.status(403).json(responseTemplate.error('Technical Error', 'There may some error occurred in user validation'));
    }

  }
};

export default validation;
