import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import OtpInput from 'react-otp-input';
import * as Action from './action';
import { message, notification } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {  Link } from 'react-router-dom';
import PasswordStrengthBar from 'react-password-strength-bar';
import ReCAPTCHA from 'react-google-recaptcha';
import InputHelper from '../../util/helper/index';
import { AES } from 'crypto-js';
import ReactGA4 from 'react-ga4';
import config from '../../config/server';
import { underMaintenance } from '../../util/middleware';
import AuthLayout from '../../layout/Auth';
const baseConfig = config[config.serviceServerName['auth']];

let ResetPasswordPage = (props) => {
  const browserHistory = props.history;
  // underMaintenance(browserHistory);
  let { timeExpiredAt } = props;
  let login_id = props.login.get('login_id');
  const [confirmationRequired, setconfirmationRequired] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const recaptchaRef = useRef(null);
  // Declare a new state variable, which we'll call "count"
  const [timeLeft, setTimeLeft] = useState(timeExpiredAt);
  let mobileNumber = props.location.state.mobile;
  if (mobileNumber && mobileNumber.length === 10) {
    mobileNumber =
      mobileNumber.slice(0, 3) +
      ' ' +
      mobileNumber.slice(3, 6) +
      ' ' +
      mobileNumber.slice(6, 10);
  }
  const [mobile, setMobile] = useState(
    mobileNumber || 'XXX XXX XXXX',
  );
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (login_id) {
      // exit early when we reach 0
      if (!timeLeft) {
        // clearState();
        changeTimerVisibility(false);
        return;
      }

      // save intervalId to clear the interval when the
      // component re-renders
      const intervalId = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);

      // clear interval on re-render to avoid memory leaks
      return () => clearInterval(intervalId);
      // add timeLeft as a dependency to re-rerun the effect
      // when we update it
    }
  }, [timeLeft]);
  if (!login_id || login_id === '' || !props.location.state) {
    browserHistory.push('/auth/login');
    return <div></div>;
  }

  /** Fn called when there is a change in login form fields
   * and is used to use the login state and change the state variable values
   * **/
  const handleOtpChange = (otp) => {
    setOtp(otp);
  };

  // /**
  //  * Fn called to update OTP time expires base counter
  //  * **/
  // const clearState = () => {
  //     setTimeLeft(timeExpiredAt);
  // };

  const convertDisplayTimer = (timeLeft) => {
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft - minutes * 60;
    return `${String(minutes).padStart(2, '0')}:${String(
      seconds,
    ).padStart(2, '0')}`;
  };

  let errorHandler = (message, description) => {
    setTimeout(() => {
      notification.error({
        message: message,
        description: description,
        duration: 8,
        className: 'notification-error',
      });
      props.authInvalidateChangePasswordForm(true);
      props.authSubmitChangePasswordForm(false);
    }, 50);
  };

  let generateOtp = async () => {
    if (!login_id) {
      errorHandler(
        'Technical Error',
        'Distributor id is required to reset the password.',
      );
      setMobile(null);
    } else {
      try {
        const response = await props.authServerGenerateOtpCode({
          login_id: login_id.replace(/^0+/, ''),
        });
        let json = response.data;

        props.authSubmitChangePasswordForm(false);

        if (json.success === false) {
          notification.error({
            message: 'Technical Error',
            description: json.message,
            duration: 8,
            className: 'notification-error',
          });
          if (response.status === 400) setMobile(null);
        } else {
          setconfirmationRequired(false);
          if (mobile) {
            setTimeLeft(timeExpiredAt);
            changeTimerVisibility(true);
            message.info(json.message || 'OTP successfully sent', 3);
            if (
              config.app_environment === 'uat' ||
              config.app_environment === 'prod' ||
              config.app_environment === 'dev'
            ) 
			{
              ReactGA4.event({
                category: 'Password',
                action: 'Successful OTP Generation',
              });
            }
          }
        }
      } catch (error) {
        notification.error({
          message: 'Techincal Error',
          description: 'Error occurred while generating OTP',
          duration: 8,
          className: 'notification-error',
        });
      }
    }
  };

  let changeTimerVisibility = (visibility) => {
    if (document.getElementById('otp-timer')) {
      document.getElementById('otp-timer').style.display = !visibility
        ? 'none'
        : 'block';
    }
    if (document.getElementById('resend-otp')) {
      document.getElementById('resend-otp').style.display =
        !visibility ? 'block' : 'none';
    }
  };

  let showOTPscreen = (event) => {
    event.preventDefault();
    setTimeLeft(timeExpiredAt);
    generateOtp();
  };

  const onClickBackToLogin = () => {
    if (
      config.app_environment === 'uat' ||
      config.app_environment === 'prod' ||
      config.app_environment === 'dev'
    ) 
	{
      ReactGA4.event({
        category: 'Password',
        action: 'Cancelled password reset',
      });
    }

    browserHistory.push('/auth/login');
  };

  let password = props.reset_password.get('password');
  let password_confirm = props.reset_password.get('password_confirm');

  let handleSubmit = (event) => {
    event.preventDefault();
    const captchaToken = recaptchaRef.current.getValue();
    recaptchaRef.current.reset();
    if (!captchaToken) {
      notification.error({
        message: 'Please verify captcha first',
        duration: 8,
        className: 'notification-error',
      });
      return;
    }
    props.authSubmitChangePasswordForm(true);
    let errorHandler = (message, description) => {
      setTimeout(() => {
        props.authInvalidateChangePasswordForm(true);
        notification.error({
          message: message,
          description: description,
          duration: 8,
          className: 'notification-error',
        });
        props.authSubmitChangePasswordForm(false);
      }, 50);
    };

    if (!login_id) {
      errorHandler(
        'Error occurred',
        'Please enter login/distributor id.',
      );
    } else if (!otp || otp.length < 6) {
      errorHandler(
        'Invalid OTP',
        confirmationRequired
          ? 'Please generate the OTP'
          : 'Please enter the OTP',
      );
    } else if (!password || password === '' || password == null) {
      errorHandler('Invalid Password', 'Please enter the password');
    } else if (!InputHelper.validatePassword(password)) {
      errorHandler(
        'Invalid Password',
        'Password must be atleast 6 alphanumeric characters',
      );
    } else if (
      !password_confirm ||
      password_confirm === '' ||
      password_confirm !== password
    ) {
      errorHandler(
        'Invalid Password',
        'Set password and confirm password do not match',
      );
    } else {
      const encryptedPassword = AES.encrypt(
        password,
        baseConfig.encryptionKey,
      ).toString();
      props.authInvalidateChangePasswordForm(false);
      props.authServerResetPassword({
        login_id,
        otp,
        password: encryptedPassword,
        // history:props.history
      });
    }
  };

  let handleInputChange = (event, field) => {
    let value = event.target.value;
    setNewPassword(value);
    props.authUpdateChangePasswordFormField({ field, value });
  };

  return (
    <AuthLayout>
      <div className="tcp-logo-block">
        <img src="/assets/images/tcp-logo.svg" alt="" />
        <h2>PURCHASE ORDER PORTAL</h2>
      </div>
      <div className="tcp-login-form">
        {confirmationRequired ? (
          <div className="otp-form-head">
            {mobile ? (
              <p>
                We will send an OTP on your registered mobile :{' '}
                <span>{mobile}</span>
                <p className="generate-otp">
                  <a onClick={showOTPscreen} href="#">
                    Generate OTP
                  </a>
                </p>
              </p>
            ) : (
              <p style={{ color: 'red' }}>
                Mobile number in our record is not correct, please
                connect with your TSE
              </p>
            )}
          </div>
        ) : (
          <div className="otp-form-head">
            {mobile ? (
              <p>
                We have sent an OTP on your registered mobile :{' '}
                <span>{mobile}</span>
              </p>
            ) : (
              <p style={{ color: 'red' }}>
                Mobile number in our record is not correct, please
                connect with your TSE
              </p>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {confirmationRequired ? (
            <div></div>
          ) : (
            <div>
              <div className="otp-timer">
                <span id="otp-timer">
                  {convertDisplayTimer(timeLeft)}
                </span>
                <span id="resend-otp" style={{ display: 'none' }}>
                  <a onClick={generateOtp}>Resend OTP</a>
                </span>
              </div>
              <OtpInput
                value={otp}
                onChange={handleOtpChange}
                numInputs={6}
                isInputNum={true}
                renderSeparator={<span></span>}
                renderInput={(props) => <input {...props} />}
                inputStyle={{
                  display: 'inline-block',
                  width: '50px',
                  height: '50px',
                  textAlign: 'center',
                  border: '1px solid #E8E9EC',
                  borderRadius: '2px',
                  fontSize: '26px',
                }}
                containerStyle={`otp-wrapper`}
                focusStyle={{ border: '1px solid #2E68AD' }}
              />
              <br />
              <div className="form-block">
                <label htmlFor="">Set password</label>
                <input
                  id="passwordlogin"
                  type="password"
                  name="password"
                  placeholder="******"
                  className="form-control"
                  autoFocus
                  onChange={(e) => {
                    handleInputChange(e, 'password');
                  }}
                />
                <div className="password-info">
                  <InfoCircleOutlined />
                  Password must be atleast 6 alphanumeric characters
                </div>
                <PasswordStrengthBar
                  password={newPassword}
                  minLength={6}
                />
              </div>
              <div className="form-block">
                <label htmlFor="">Confirm password</label>
                <input
                  id="passwordConfirm"
                  type="password"
                  name="password_confirm"
                  placeholder="******"
                  className="form-control"
                  onChange={(e) => {
                    handleInputChange(e, 'password_confirm');
                  }}
                />
              </div>
            </div>
          )}
          <br />
          <Link to="/auth/login" className="back-to-login">
            Back to login
          </Link>
          {!confirmationRequired && (
            <>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={config.recaptchaKey}
              />
              <div className="bottom-btn">
                <button
                  type="submit"
                  name="singlebutton"
                  className="default-btn"
                >
                  Submit
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </AuthLayout>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {
    login: state.auth.get('login'),
    reset_password: state.auth.get('reset_password'),
    status: state.auth.get('status'),
    timeExpiredAt: 180,
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    authUpdateLoginFormField: (data) =>
      dispatch(Action.authUpdateLoginFormField(data)),
    authSubmitChangePasswordForm: (data) =>
      dispatch(Action.authSubmitChangePasswordForm(data)),
    authInvalidateChangePasswordForm: (data) =>
      dispatch(Action.authInvalidateChangePasswordForm(data)),
    authUpdateChangePasswordFormField: (data) =>
      dispatch(Action.authUpdateChangePasswordFormField(data)),
    authServerResetPassword: (data) =>
      dispatch(Action.authServerResetPassword(data)),
    authServerVerifyOtp: (value) =>
      dispatch(Action.authServerVerifyOtp(value)),
    authServerGenerateOtpCode: (value) =>
      dispatch(Action.authServerGenerateOtpCode(value)),
  };
};

const ConnectResetPasswordPage = connect(
  mapStateToProps,
  mapDispatchToProps,
)(ResetPasswordPage);

export default ConnectResetPasswordPage;
