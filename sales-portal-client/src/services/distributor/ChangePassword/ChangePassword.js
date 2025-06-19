import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { notification } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons'
import { AES } from 'crypto-js';
import PasswordStrengthBar from 'react-password-strength-bar'
import * as Action from '../actions/dashboardAction';
import * as Actions from '../../admin/actions/adminAction';
import InputHelper from '../../../util/helper/index';
import config from '../../../config/server';
import { DEFAULT_MESSAGES } from '../../../config/constant';
import './ChangePassword.css';
import * as ErrorAction from '../actions/errorAction';
import { errorReportFormat } from '../../../config/error';
import { authenticatedUsersOnly } from '../../../util/middleware';
const baseConfig = config[config.serviceServerName['auth']];

const { CHANGE_PASSWORD } = DEFAULT_MESSAGES;
const {
  ALPHANUMERIC_ERROR,
  ENTER_CUR_PASSWORD,
  ENTER_NEW_PASSWORD,
  ERROR,
  INVALID,
  MATCH_ERROR,
  SAME_PASSWORD,
  SUCCESS,
} = CHANGE_PASSWORD;
let ChangePassword = (props) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { getMaintenanceRequests } = props;

  useEffect(() => {
    getMaintenanceRequests();
  }, []);
  if (props.location.pathname.split('/')[1] === 'distributor') {
    authenticatedUsersOnly(props.location.pathname, props.history);
  }
  // fn to display error notification using antd library
  const errorHandler = (message, description) => {
    setTimeout(() => {
      notification.error({
        message,
        description,
        duration: 2,
        className: 'notification-error',
      });
    }, 150);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentPassword) {
      errorHandler(ERROR, ENTER_CUR_PASSWORD);
    } else if (!newPassword) {
      errorHandler(ERROR, ENTER_NEW_PASSWORD);
    } else if (newPassword === currentPassword) {
      errorHandler(ERROR, SAME_PASSWORD);
    } else if (!InputHelper.validatePassword(newPassword)) {
      errorHandler(INVALID, ALPHANUMERIC_ERROR);
    } else if (
      !confirmPassword ||
      confirmPassword === '' ||
      confirmPassword !== newPassword
    ) {
      errorHandler(INVALID, MATCH_ERROR);
    } else {
      const encryptedOldPassword = AES.encrypt(
        currentPassword,
        baseConfig.encryptionKey,
      ).toString();
      const encryptedNewPassword = AES.encrypt(
        newPassword,
        baseConfig.encryptionKey,
      ).toString();
      let passwordDetail = {
        current_password: encryptedOldPassword,
        new_password: encryptedNewPassword,
      };
      const response = await props.changePassword(passwordDetail);
      if (response.status === 200) {
        notification.success({
          message: 'Success',
          description: SUCCESS,
          duration: 2,
          className: 'notification-green',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        errorReportFormat.distributor_dashboard.pwd_001.logObj = { data: response.config.data, error_message: response.data };
        props.logAppIssue(errorReportFormat.distributor_dashboard.pwd_001);
        errorHandler(ERROR, response.data.message);
      }
    }
  };
  let handleCurrentPasswordChange = (event) => {
    setCurrentPassword(event.target.value);
  };
  let handleNewPasswordChange = (event) => {
    setNewPassword(event.target.value);
  };
  let handleConfirmPasswordChange = (event) => {
    setConfirmPassword(event.target.value);
  };
  return (
    <>
      <div className="main-content password-page">
        <div className="main-password-block">
          <h1>Change Password</h1>
          <form autoComplete="off" onSubmit={handleSubmit}>
            <div className="form-wrap">
              <label>
                <span>*</span> Current Password
              </label>
              <input
                autoComplete="off"
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => {
                  handleCurrentPasswordChange(e);
                }}
              />
            </div>
            <div className="form-wrap">
              <label>
                <span>*</span> New Password
              </label>
              <input
                autoComplete="off"
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => {
                  handleNewPasswordChange(e);
                }}
              />
              <div className='password-info'><InfoCircleOutlined />Password must be atleast 6 alphanumeric characters</div>
              <PasswordStrengthBar password={newPassword} minLength={6} />
            </div>
            <div className="form-wrap">
              <label>
                <span>*</span> Confirm Password
              </label>
              <input
                autoComplete="off"
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => {
                  handleConfirmPasswordChange(e);
                }}
              />
            </div>
            <div className="form-btns">
              <input
                type="submit"
                value="Save"
                className="save-btn"
              />
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

const mapStateToProps = () => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    getMaintenanceRequests: () =>
      dispatch(Actions.getMaintenanceRequests()),
    changePassword: (data) => dispatch(Action.changePassword(data)),
    getRegionDetails: () => dispatch(Action.getRegionDetails()),
    logAppIssue: (data) => dispatch(ErrorAction.logAppIssue(data)),
  };
};

const ConnectChangePassword = connect(
  mapStateToProps,
  mapDispatchToProps,
)(ChangePassword);

export default ConnectChangePassword;
