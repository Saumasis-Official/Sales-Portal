/* eslint prefer-destructuring:0 */
const passportModule = require('passport');
const LocalStrategy = require('passport-local');
import AuthController from '../../controller/AuthController';
const helper = require('../../helper/bcrypt');


passportModule.use(new LocalStrategy(
  {
    usernameField: 'id',
    passwordField: 'password',
    passReqToCallback: true,
    session: false
  },
  ((req, id, password, done) => {
    // write code here to find user if it exists in system
    AuthController.getUserByDistributorId(id,(err: any,data: string | any[]) => {
      if (err) {
        return done(null, null);
      } else if (data.length === 0) {
        return done(null, null);
      }
      const flag = helper.comparePassword(password, data[0].password);
      if (!flag) {
        return done(null, null);
      }
      return done(null, data);
    })
    
  })
));

const localRoutes = {
  authenticate() {
    return passportModule.authenticate('local', { session: false });
  },
  authenticate_with_callback: () => passportModule.authenticate('local', {
    successRedirect: '/auth/success',
    failureRedirect: '/auth/failed'
  }),
};


export default localRoutes;
