import React from 'react';
import { BrowserRouter, HashRouter, Route } from 'react-router-dom';


// ------------------Login pages-------------------//

import AuthLayout from './layout/Auth';
//------------------Layout-------------------//

//-----------------DashboardPage-------------//

import httpService from './axios-interceptors';
import EmailVerify from './services/distributor/EmailVerify/EmailVerify';
import ChangePassword from './services/distributor/ChangePassword/ChangePassword';
//Admin Dashboard 'admin/dashboard'

import NoAccess from './services/admin/NoAccess';

import Distributor from '../../sales-portal-client/src/routing/distributor';
import { func } from 'prop-types';
import Admin from './routing/admin';
import Auths from './routing/auth';
import Superadmin from './routing/superAdmin';
import WelcomePage from './services/auth/Welcome';
import Notfound from './services/distributor/MaintenancePage/MaintenancePage';
import Redirect from './redirect';
import logoutHandler from './services/logout';
httpService.setupInterceptors();

const AppRoutes = (props) => {
  return (
    <>
      <Route path="/" exact component={WelcomePage} />
      <Route path="/admin" component={Admin} />
      <Route path="/distributor" component={Distributor} />
      <Route path="/auth" component={Auths} />
      <Route path="/no-access" component={NoAccess} />
      <Route path="/email-verify/:id" component={EmailVerify} />
      <Route path="/superadmin"  component={Superadmin} />
      <Route path="/maintenance" component={Notfound} />
      <Route path="/adminmaintenance" component={Notfound} />
      <Route path="/redirect" component={Redirect} />
      <Route path="/logout" component={logoutHandler} />
    </>
  );
};

export default AppRoutes;
