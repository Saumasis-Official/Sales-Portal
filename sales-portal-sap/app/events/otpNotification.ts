
import Otp from '../helper/otp';
declare function require(name: string);

const events = require('events');
const winston = require('winston');

const eventEmitter = new events.EventEmitter();

eventEmitter.on('sendOTP', (otpData: { id: any, mobile: any, otp: any }) => {
  winston.log('info', `sending otp to mobile ${otpData.mobile}`);
  Otp.send_otp(otpData);
});

export default eventEmitter;
