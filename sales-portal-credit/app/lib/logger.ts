import correlator from 'express-correlation-id';
import Helper from '../helper';
const { createLogger, format, transports } = require('winston');
const { combine, splat, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} ${correlator.getId() || ''} [${level}] : ${message} `;

    if (Object.keys(metadata).length) {
        msg += (Helper.isCircular(metadata) && !Helper.isJsonObject(metadata)) ? metadata : JSON.stringify(metadata);
      }
    return msg
});

const logger = createLogger({
    level: 'debug',
    format: combine(
        splat(),
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.Console({ level: 'info' }),
    ]
});
export default logger;