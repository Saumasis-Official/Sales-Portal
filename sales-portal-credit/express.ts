import router from './app/routes';
import boom from 'express-boom'; // Boom response objects in Express.
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import express from 'express';
import logger from 'morgan';
import bodyParser from 'body-parser';
import correlator from 'express-correlation-id';
import swaggerUi from 'swagger-ui-express'
import * as swaggerDocument from './docs/swagger/swagger.json'
import errorHandlers from './app/helper/errorHandler';
import nocache from "nocache";
import compression from 'compression';
import basicAuth from 'express-basic-auth'
import { Request, Response, NextFunction } from 'express';
import KibanaLogger from './app/lib/logger';

require('dotenv').config();
const env = process.env.NODE_ENV;
global.configuration = require(`./app/config/environments/${env}`);

global.__basedir = __dirname + "/..";

// Creates and configures an ExpressJS web server.
class App {
  // ref to Express instance
  public express: express.Application;
  //Run configuration methods on the Express instance.
  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
  }

  // Configure Express middleware.
  private middleware(): void {
    this.express.use(logger('dev'));
    this.express.disable('x-powered-by');
    this.express.disable('etag');
    this.express.use(helmet());
    this.express.use(nocache());
    this.express.use(boom());
    // this.express.use(helmet.noCache({ noEtag: true })); // set Cache-Control header
    this.express.use(helmet.noSniff()); // set X-Content-Type-Options header
    this.express.use(helmet.frameguard()); // set X-Frame-Options header
    this.express.use(helmet.xssFilter()); // set X-XSS-Protection header
    this.express.use(helmet.contentSecurityPolicy({  // set CSP header
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'", "https:", "data:"],
      }
    }));
    // logger logs on console
    this.express.use(bodyParser.urlencoded({ extended: false, limit: '5mb' })); // parse application/x-www-form-urlencoded
    this.express.use(bodyParser.json()); // parse application/json
    // enable CORS
    this.express.use((req, res, next) => {
      // res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, api_key, Authorization, Referer');
      next();
    });
    // register all custom Middleware
    // Extract URLs from the configuration
    const allowUrlCORS = global.configuration.url['FE_URL_CORS'];
    const allowUrlDEV = global.configuration.url['FE_URL_DEV'];
    const allowUrlPROD = global.configuration.url['FE_URL_PROD'];
    const allowUrlUAT = global.configuration.url['FE_URL_UAT'];
    const combinedUrls = [, allowUrlDEV,allowUrlPROD,allowUrlUAT].join(',');


    var setCorsOrigin = function (req, callback) {
      const defaultOrigin = allowUrlCORS;
      const origin = combinedUrls.includes(req.header('Origin')) ? req.header('Origin') : defaultOrigin;
      const corsOptions = { optionsSuccessStatus: 200, origin: origin }
      callback(null, corsOptions);
    }
    if(env && env !=='dev'){
      this.express.use(cors(setCorsOrigin));
    }else{
      this.express.use(cors({optionsSuccessStatus: 200}))
    }
    this.express.use(cookieParser()); // cookies-parser
    // manage session by cookies
    this.express.set('views', path.join(__dirname, 'views')); // setting views
    this.express.set('view engine', 'hbs');
    // server side template rendering
    this.express.use(express.static(path.join(__dirname, 'public')));
    this.express.use(bodyParser.json());
    this.express.use(bodyParser.urlencoded({ extended: false }));
    this.express.use(correlator());
    this.express.use(compression());
  }

  // Configure API endpoints.
  private routes(): void {
    /**
     * @param req : Express.Request
     * @param res : Express.Response
     * @param next : Express.NextFunction
     * SCENARIO:
     * It was observed that during the preflight request(i.e.request with OPTIONS method) the application was processing the entire request and then sending the response.
     * This was causing the application to process the request twice, once for the OPTIONS method and then for the actual request.
     * SOLUTION:
     * The applied cors() middleware will handle the preflight request and will send the suitable response.
     * In-spite of that if the preflight request continues to the controller layer, this function will restrict and send the response immediately.
     */
    const blockPreflightRequest = (req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'OPTIONS') {
        KibanaLogger.info(`in blockPreflightRequest: OPTIONS request: sending 204 response. PATH: ${req.path}`)
        res.sendStatus(204);
      } else {
        next();
      }
    };

    this.express.use('/credit/api/v1', blockPreflightRequest, router);
    const swaggerUsername = process.env.SWAGGER_USERNAME;
    const swaggerPassword = process.env.SWAGGER_PASSWORD;
    const swaggerAuth = {};
    swaggerAuth[swaggerUsername] = swaggerPassword;
    this.express.use('/credit/swagger', basicAuth({
      users: swaggerAuth,
      challenge: true,
    }), swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    this.express.use(errorHandlers.internalServerError);
    this.express.use(errorHandlers.PageNotFound);
  }

}

export default new App().express;