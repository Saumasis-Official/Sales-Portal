import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import * as Action from './action';
import { Link } from 'react-router-dom';
import { notification } from 'antd';
import { AES } from 'crypto-js';
import config from '../../config/server';
import '../../style/auth/Login.css';
import ReactGA4 from 'react-ga4';
import useAuth from './hooks/useAuth';
import { notLoggedIn } from '../../util/middleware';
import { underMaintenance } from '../../util/middleware';
import * as Actions from '../admin/actions/adminAction'

import AuthLayout from '../../layout/Auth';
const baseConfig = config[config.serviceServerName['auth']];

let LoginPage = props => {
  const browserHistory = props.history;
  let login_id = props.login.get('login_id');
  let password = props.login.get('password');
  const validationFlag = props.login.get('error');
  notLoggedIn(props.history.location.pathname,props.history.replace);
  // fn to display error notification using antd libraray
  let errorHandler = (message, description) => {
    setTimeout(() => {
      notification.error({
        message,
        description,
        duration: 8,
        className: "notification-error"
      });
      props.authInvalidateLoginForm(false);
      props.authSubmitLoginForm(false);
      if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') 
      {
        ReactGA4.event({
          category: 'Login',
          action: 'Failed Login'
        });
      }
    }, 50)
  }

  async function getmaintenance() {
    const result = await props.getMaintenanceRequests(browserHistory);
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

  //fn called when user clicked on Login button
  let handleSubmit = event => {
    event.preventDefault();
    if (!login_id || !password) {
      if (!login_id) {
        errorHandler(
          'Error occurred',
          'Please enter your Distributor ID.'
        )
      } else if (!password) {
        errorHandler(
          'Error occurred',
          'Please enter the password.'
        )
      }
    } else if (password.length < 6) {
      errorHandler(
        'Error occurred',
        'Please enter valid password of minimum 6 characters in length.'
      )
    } else {
      const encryptedPassword = AES.encrypt(password, baseConfig.encryptionKey).toString();
      props.authInvalidateLoginForm(true);
      props.authServerLoginUser({ login_id: login_id.replace(/^0+/, ''), password: encryptedPassword, history: props.history});
      if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') 
      {
        ReactGA4.event({
          category: 'Login',
          action: 'Successful Login'
        });
      }
    }
  }

  /** Fn called when there is a change in login form fields 
   * and is used to use the login state and change the state variable values 
   * **/
  let handleInputChange = (event, field) => {
    let value = event.target.value;
    props.authUpdateLoginFormField({ field, value });
  }

  /** Fn called when user want to reset/recover password **/
  let generateOtp = event => {
    event.preventDefault();
    props.authInvalidateLoginForm(false);
    props.authSubmitLoginForm(false);
    if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') 
      {
        ReactGA4.event({
          category: 'Password',
          action: 'Attempted Password Change'
        });
      }
    if (!login_id) {
      errorHandler(
        'Error Occurred',
        'Please enter Distributor ID to reset password.'
      )
    } else {
      const response = Action.validateDistributorId(login_id.replace(/^0+/, ''));
      response.then(result => {
        if (result.data.success) {
          browserHistory.push({ pathname: "/auth/reset-password", state: { mobile: result.data.data.mobile } });
        } else {
          errorHandler(
            'Error Occurred',
            result.data.error || result.data.message || 'Error in validating Distributor ID'
          )
        }
      }).catch(error => {
        if (config.app_environment === 'uat' || config.app_environment === 'prod' || config.app_environment === 'dev') 
        {
          ReactGA4.event({
            category: 'Password',
            action: 'Got error in password change'
          });
        }
        errorHandler(
          'Error Occurred',
          error?.response?.data?.description)
      })
    }
    // document.getElementById("loginbtn").disabled = false;
  }

  /**
   * useEffect is hook function called to enable or disable login button state
   */
  useEffect(() => {
    document.getElementById("loginbtn").disabled = !validationFlag;
  }, [validationFlag]);

  /**
   * useEffect is hook function called to enable or disable the form invalidate state
   */
  useEffect(() => {
    if (login_id && password) {
      props.authInvalidateLoginForm(true);
    } else {
      props.authInvalidateLoginForm(false);
    }
  }, [login_id, password]);

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
        responseType: config.sso_login.responseType
      }
    }
  });

  const handleSSOLogin = () => {
    signIn();
  }

  return (
    <>
      <AuthLayout>
        <div className="tcp-form-wrapper">
          {/* <h1>Login</h1> */}
          <div className="tcp-logo-block">
            <img src="/assets/images/tcp-logo.svg" alt="" />
            <h2>PURCHASE ORDER PORTAL</h2>
          </div>
          <div className="tcp-login-form">
            {/* {props.login.get('error') && <Alert message="Please enter valid login/distributor id and password." type="error" showIcon="false" />} */}
            <form onSubmit={handleSubmit}>
              <div className="form-block">
                <label htmlFor="">Distributor ID</label>
                <input
                  id="login_id"
                  type="number"
                  name="login_id"
                  placeholder="Enter your Distributor ID"
                  className="form-control"
                  autoFocus
                  defaultValue={login_id}
                  onChange={(e) => {
                    handleInputChange(e, 'login_id');
                  }}
                />
              </div>
              <div className="form-block">
                <label htmlFor="">Password</label>
                <input
                  id="passwordlogin"
                  type="password"
                  name="passwordlogin"
                  placeholder="Enter Password"
                  className="form-control"
                  defaultValue={password}
                  onChange={(e) => {
                    handleInputChange(e, 'password');
                  }}
                />
              </div>
              <div className="form-block forgot-text">
                <a onClick={generateOtp}>
                  Register/Forgot Password ?
                </a>
                <br />
                <a
                  className="login-with-sso"
                  onClick={handleSSOLogin}
                >
                  Login with SSO
                </a>
              </div>
              <div className="bottom-btn">
                <button
                  type="submit"
                  name="singlebutton"
                  id="loginbtn"
                  className="default-btn"
                  disabled
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}

const mapStateToProps = (state, ownProps) => {
  return {
    status: state.auth.get('status'),
    login: state.auth.get('login')
  }
}
const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    authSubmitLoginForm: status => dispatch(Action.authSubmitLoginForm(status)),
    authInvalidateLoginForm: value =>
      dispatch(Action.authInvalidateLoginForm(value)),
    authUpdateLoginFormField: data =>
      dispatch(Action.authUpdateLoginFormField(data)),
    authServerLoginUser: value => dispatch(Action.authServerLoginUser(value)),
    authServerGenerateOtpCode: value => dispatch(Action.authServerGenerateOtpCode(value)),
    getMaintenanceRequests: (browserHistory) =>
    dispatch(Actions.getMaintenanceRequests(browserHistory))
  }
}

const ConnectLoginPage = connect(
  mapStateToProps,
  mapDispatchToProps
)(LoginPage)

export default ConnectLoginPage
