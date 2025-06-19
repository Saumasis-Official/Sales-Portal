import routes from './app/routes';
import boom from 'express-boom'; // Boom response objects in Express.
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import logger from 'morgan';
import bodyParser from 'body-parser';
import correlator from 'express-correlation-id';
import swaggerUi from 'swagger-ui-express';
import nocache from "nocache";
import compression from 'compression'
import basicAuth from 'express-basic-auth';
import express,{ Request, Response, NextFunction } from 'express';
// import KibanaLogger from './app/lib/logger';

const env = process.env.NODE_ENV;
global.configuration = require(`./app/config/environments/${env}`);
global.__basedir = __dirname + "/..";

class App{
    public express: express.Application;
    constructor() {
        this.express = express();
        this.middleware();
        this.routes();
    }

    private middleware() : void {
        this.express.use(logger('dev'));
        this.express.disable('x-powered-by');
        this.express.disable('etag');
        this.express.use(helmet());
        this.express.use(nocache());
        this.express.use(boom());
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

        this.express.use(bodyParser.urlencoded({ extended: false, limit: '5mb' })); // parse application/x-www-form-urlencoded
        this.express.use(bodyParser.json()); // parse application/json
        this.express.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, PATCH, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, api_key, Authorization, Referer');
            next();
        });
        const allowUrl = global.configuration.url['FE_URL_CORS'];
        var setCorsOrigin = function (req, callback) {
            const defaultOrigin = allowUrl[0];
            const origin = allowUrl.includes(req.header('Origin')) ? req.header('Origin') : defaultOrigin;
            const corsOptions = { optionsSuccessStatus: 200, origin: origin }
            callback(null, corsOptions);
        }

        if (env && env !== 'dev') {
            this.express.use(cors(setCorsOrigin));
        } else {
            this.express.use(cors({ optionsSuccessStatus: 200 }))
        }
        this.express.use(cookieParser()); // cookies-parser

        this.express.set('views', path.join(__dirname, 'views')); // setting views
        this.express.set('view engine', 'hbs');
        // server side template rendering
        this.express.use(express.static(path.join(__dirname, 'public')));
        this.express.use(correlator());
        this.express.use(compression());

        // Set timeout for all requests
        this.express.use((req, res, next) => {
            req.setTimeout(300000); // 5 minutes
            res.setTimeout(300000); // 5 minutes
            next();
        });

        // Handle timeout errors
        this.express.use((err: any, req: Request, res: Response, next: NextFunction) => {
            if (err.code === 'ETIMEDOUT') {
                res.status(503).send('Service Unavailable. Please try again later.');
            } else {
                next(err);
            }
        });
    }

    private routes() {
        
        const blockPreflightRequest = (req: Request, res: Response, next: NextFunction) => {
            if (req.method === 'OPTIONS') {
                // KibanaLogger.info(`in blockPreflightRequest: OPTIONS request: sending 204 response. PATH: ${req.path}`)
                res.sendStatus(204);
            } else {
                next();
            }
        };

        this.express.use('/arsservice/api/v1', blockPreflightRequest, routes);

        // const swaggerUsername = process.env.SWAGGER_USERNAME;
        // const swaggerPassword = process.env.SWAGGER_PASSWORD;
        // const swaggerAuth = {};
        // swaggerAuth[swaggerUsername] = swaggerPassword;
        // this.express.use('/order/swagger', basicAuth({
        //     users: swaggerAuth,
        //     challenge: true,
        // }), swaggerUi.serve, swaggerUi.setup(swaggerDocument));
        // this.express.use(errorHandlers.internalServerError);
        // this.express.use(errorHandlers.PageNotFound);

    }

    //Resolve the commented areas 
}

export default new App().express;