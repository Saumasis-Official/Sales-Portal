
import Email from '../helper/email';
declare function require(name: string);

const events = require('events');
const winston = require('winston');

const eventEmitter = new events.EventEmitter();
eventEmitter.on('welcome', (user) => {
  winston.log('info', `sending welcome email to ${user.email}`);
  Email.welcome(user);
});
eventEmitter.on('forgotPassword', (user, password, uuid) => {
  winston.log('info', `sending forgotPassword email to ${user.email}`);
});

export default eventEmitter;
