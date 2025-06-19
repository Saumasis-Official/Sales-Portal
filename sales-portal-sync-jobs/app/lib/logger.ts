import correlator from 'express-correlation-id';
import commonHelper from '../helper';
const { createLogger, format, transports } = require('winston');
const { combine, splat, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp, ...metadata }) => { // ...metadata
  let msg = `${timestamp} ${correlator.getId() || ''} [${level}] : ${message} `
  /*if (Object.keys(metadata).length) {
    msg += JSON.stringify(metadata)
  }*/
  if (Object.keys(metadata).length) {
    msg += (commonHelper.isCircular(metadata) && !commonHelper.isJsonObject(metadata)) ? metadata : JSON.stringify(metadata);
  }
  return msg;
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