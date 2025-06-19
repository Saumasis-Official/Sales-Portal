import React, { useState, useEffect } from 'react';
import OtpInput from 'react-otp-input';
import { connect } from 'react-redux';

import { message, notification } from 'antd';
import * as Action from './action';
import '../../style/auth/Otp.css';
import config from '../../config/server';
import ReactGA4 from 'react-ga4';
let OtpPage = (props) => {
  const browserHistory = props.history;
  let { timeExpiredAt } = props;
  const [timeLeft, setTimeLeft] = useState(timeExpiredAt);
  let login_id = props.login.get('login_id');
  const [confirmationRequired, setconfirmationRequired] =
    useState(true);
  // Declare a new state variable, which we'll call "count"
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
  if (login_id === '' || !props.location.state) {
    browserHistory.push('/auth/login');
    return <div></div>;
  }

  /** Fn called when there is a change in login form fields
   * and is used to use the login state and change the state variable values
   * **/
  const handleInputChange = (otp) => {
    setOtp(otp);
    if (otp.length >= 6) {
      document.getElementById('verify-btn').disabled = false;
    } else {
      document.getElementById('verify-btn').disabled = true;
    }
  };

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
      props.authInvalidateOtpForm(true);
      props.authSubmitOtpForm(false);
    }, 50);
  };

  let handleSubmit = (event) => {
    event.preventDefault();
    props.authSubmitOtpForm(true);

    if (!login_id) {
      errorHandler(
        'Technical Error',
        'Distributor id is mandatory to generate the otp code',
      );
    } else if (!otp || otp.length < 6) {
      errorHandler('Technical Error', 'Please enter correct OTP');
    } else {
      // props.authInvalidateLoginForm(false)

      document.getElementById('verify-btn').disabled = true;
      const response = props.authServerVerifyOtp({ login_id, otp });

      response
        .then((result) => {
          let json = result.data;
          props.authSubmitOtpForm(false);

          if (json.success === false) {
            setOtp('');
            notification.error({
              message: json.message || 'Error occurred',
              description: json.error || 'Please enter correct OTP',
              duration: 8,
              className: 'notification-error',
            });
            if (
              config.app_environment === 'uat' ||
              config.app_environment === 'prod' ||
              config.app_environment === 'dev'
            ) 
            {
              ReactGA4.event({
                category: 'Password',
                action: 'Entered incorrect OTP',
              });
            }
            
          } else {
            message.info('Successfully verified the OTP code', 3);
            document.getElementById('verify-btn').disabled = false;
            browserHistory.push('/auth/reset-password');
            if (
              config.app_environment === 'uat' ||
              config.app_environment === 'prod' ||
              config.app_environment === 'dev'
            ) 
            {
              ReactGA4.event({
                category: 'Password',
                action: 'Verified OTP',
              });
            }
          }
        })
        .catch((error) => {
          props.authSubmitOtpForm(false);
          if (error.result && error.result.data) {
            notification.error({
              message: 'Unable to verify the OTP code',
              description: error.result.data.message,
              duration: 8,
              className: 'notification-error',
            });
          }
          if (
            config.app_environment === 'uat' ||
            config.app_environment === 'prod' ||
            config.app_environment === 'dev'
          ) 
        {
            ReactGA4.event({
              category: 'Password',
              action: 'OTP verification tech error',
            });
          }
          
        });
    }
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
          login_id: login_id,
        });
        let json = response.data;

        props.authSubmitOtpForm(false);

        if (json.success === false) {
          notification.error({
            message: 'Technical Error',
            description: json.message,
            duration: 8,
            className: 'notification-error',
          });
          setMobile(null);
        } else {
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
        setMobile(null);
      }
    }
  };

  let changeTimerVisibility = (visibility) => {
    document.getElementById('otp-timer').style.display = !visibility
      ? 'none'
      : 'block';
    document.getElementById('resend-otp').style.display = !visibility
      ? 'block'
      : 'none';
  };
  let showOTPscreen = (event) => {
    event.preventDefault();
    setTimeLeft(timeExpiredAt);
    setconfirmationRequired(false);
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

  return (
    <div className="tcp-form-wrapper">
      <div className="tcp-logo-block">
        <img src="/assets/images/tcp-logo.svg" alt="" />
        <h2>PURCHASE ORDER PORTAL</h2>
      </div>
      <div className="tcp-otp-form">
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
            <h3>OTP Verification</h3>
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
              {' '}
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
                onChange={handleInputChange}
                numInputs={6}
                isInputNum={true}
                separator={<span></span>}
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
              <div className="bottom-btn">
                <button
                  type="submit"
                  className="default-btn"
                  id="verify-btn"
                  disabled
                >
                  Verify
                </button>
              </div>
            </div>
          )}
        </form>
        <br />
        <a className="back-to-login" onClick={onClickBackToLogin}>
          Back to login
        </a>
      </div>
    </div>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {
    status: state.auth.get('status'),
    login: state.auth.get('login'),
    timeExpiredAt: 180,
  };
};
const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    authSubmitOtpForm: (status) =>
      dispatch(Action.authSubmitOtpForm(status)),
    authInvalidateOtpForm: (value) =>
      dispatch(Action.authInvalidateOtpForm(value)),
    authUpdateOtpFormField: (data) =>
      dispatch(Action.authUpdateOtpFormField(data)),
    authServerVerifyOtp: (value) =>
      dispatch(Action.authServerVerifyOtp(value)),
    authServerGenerateOtpCode: (value) =>
      dispatch(Action.authServerGenerateOtpCode(value)),
  };
};

const ConnectOtpPage = connect(
  mapStateToProps,
  mapDispatchToProps,
)(OtpPage);

export default ConnectOtpPage;
