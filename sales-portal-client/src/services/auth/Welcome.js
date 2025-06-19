import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import config from '../../config/server';
import useAuth from './hooks/useAuth';
import Auth from '../../util/middleware/auth';
import * as Action from './action';
import * as Actions from '../admin/actions/adminAction'
import { notLoggedIn } from '../../util/middleware';
import AuthLayout from '../../layout/Auth';
import Util from '../../util/helper';
let WelcomePage = (props) => {
  const browserHistory = props.history;
  notLoggedIn(props.history.location.pathname,props.history.replace);

  window.localStorage.setItem(
    'TCPL_SAP_formData',
    JSON.stringify([]),
  );
  window.localStorage.setItem(
    'TCPL_SAP_reorderData',
    JSON.stringify([]),
  );
  window.localStorage.setItem(
    'TCPL_SSOUserDetail',
    JSON.stringify({}),
  );

  const { fetchAppLevelConfiguration, getMaintenanceRequests } = props;

  async function getmaintenance() {
    const result = await getMaintenanceRequests(browserHistory);
    if (result && result.data) {
      if (result.data.length > 0) {
        if (result.data[0].status === 'OPEN') {
          browserHistory.push('/maintenance');
        }
      }
    }
  }

  useEffect(() => {
    getmaintenance();
  }, []);

  const { signIn } = useAuth({
    provider: config.sso_login.provider,
    options: {
      userPoolId: config.sso_login.userPoolId,
      userPoolWebClientId: config.sso_login.userPoolWebClientId,
      oauth: {
        domain: config.sso_login.domain,
        scope: config.sso_login.scope,
        redirectSignIn: config.sso_login.redirectSignIn,
        redirectSignOut: config.sso_login.redirectSignOut,
        region: config.sso_login.region,
        responseType: config.sso_login.responseType,
      },
    },
  });

  const handleSSOLogin = () => {
    signIn();
  };

  useEffect(() => {
    fetchAppLevelConfiguration();
    if (Auth.loggedIn()) {
      browserHistory.push('/distributor/dashboard');
    } else if (Auth.adminLoggedIn() && Auth.checkAdminLogin()) {
      browserHistory.push('/admin/dashboard');
    }
  }, []);

  return (
    <>
      <AuthLayout>
        <div className="tcp-form-wrapper">
          <h1>Login</h1>
          <div className="tcp-logo-block">
            <img src="assets/images/tcp-logo.svg" alt="" />
            <h2>PURCHASE ORDER PORTAL</h2>
          </div>
          <div className="distributer-btn">
            <Link to="/auth/login" className="default-btn">
              Distributor Login
            </Link>
            <>
              <br />
              <a className="sso-login" onClick={handleSSOLogin}>
                Login with SSO
              </a>
            </>
          </div>
        </div>
      </AuthLayout>
    </>
  );
};

const mapStateToProps = (/* state */) => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    getMaintenanceRequests: (browserHistory) =>
      dispatch(Actions.getMaintenanceRequests(browserHistory)),
    fetchAppLevelConfiguration: () =>
      dispatch(Action.fetchAppLevelSettings()),
  };
};

const ConnectWelcomePage = connect(
  mapStateToProps,
  mapDispatchToProps,
)(WelcomePage);

export default ConnectWelcomePage;
