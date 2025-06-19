import { React, useRef, useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Modal } from 'antd';
import { Link } from 'react-router-dom';
import jwt from 'jsonwebtoken';
import Auth from '../../../util/middleware/auth';
import * as AuthAction from '../../auth/action';
import styles from './CfaSurveyModal.module.css';

let CfaSurveyModal = (props) => {
  const browserHistory = props.history;
  let admin_access_token = Auth.getAdminAccessToken();
  let role = Auth.getRole();

  let access_token = Auth.getAccessToken();

  const {
    isVisible,
    onCancel,
    isSurveyLinkVisible,
    handleSurveyLinkCancel,
    surveyLink,
    sso_user_details,
    linkSurveyData,
  } = props;
  const distributor_code = useRef();
  let getRole =
    sso_user_details.data &&
    sso_user_details.data.length &&
    sso_user_details.data[0].roles;

  if (access_token || admin_access_token) {
    if (!role) {
      const login_id = jwt.decode(access_token).login_id;
      distributor_code.current = login_id;
    } else if (props.location?.state?.distributorId) {
      distributor_code.current = props.location.state.distributorId;
    }
  } else {
    if (!role) {
      browserHistory.push('/auth/login');
    }
  }

  const handleSurveyLinkClick = () => {
    const distributorCode = distributor_code.current
      ? `${distributor_code.current}`
      : '';
    const dynamicSurveyLink = `${surveyLink}${distributorCode}`;
    window.open(dynamicSurveyLink, '_blank');
    handleSurveyLinkCancel();

    let body = {
      questionnaire_id: linkSurveyData.id,
      db_code: distributor_code.current,
      survey_start: linkSurveyData.survey_start,
      survey_end: linkSurveyData.survey_end,
      response: {},
      updated_by: '',
      db_cfa_details: {},
    };

    props.surveyLinkResponse(body);
  };

  return (
    <div>
      <Modal
        title="CFA Survey"
        visible={isVisible}
        onCancel={onCancel}
        footer={null}
        wrapClassName="cfa-survey-modal"
      >
        <div className={styles.body}>
          <div className={styles.header}>CFA Survey is Active</div>
          <div className={styles.para}>
            For enhanced customer satisfaction, we have initiated a
            survey. We will use your responses to improve our
            services. Kindly take out few minutes to fill in the
            survey.
          </div>
        </div>
        <div className={styles.buttons}>
          <Link to="/distributor/cfa-survey">
            <button type="submit" className={styles.button_go}>
              {' '}
              Go to CFA Survey{' '}
            </button>
          </Link>
          <button
            className={styles.button_skip}
            type="button"
            onClick={onCancel}
          >
            {' '}
            Skip CFA Survey{' '}
          </button>
        </div>
      </Modal>
      <Modal
        title="Survey Link"
        visible={isSurveyLinkVisible}
        onCancel={handleSurveyLinkCancel}
        footer={null}
        wrapClassName="survey-link-modal"
        closable={false}
        maskClosable={false}
      >
        <div className={styles.body}>
          <div className={styles.header}>Survey Link</div>
          <div className={styles.para}>
            {' '}
            Your feedback is invaluable to us. Please take a moment to
            complete the survey by clicking the button below.
          </div>
        </div>
        <div className={styles.buttons}>
          <a
            href={surveyLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <button
              type="submit"
              className={styles.button_go}
              onClick={handleSurveyLinkClick}
            >
              Open Survey Link
            </button>
          </a>
        </div>
      </Modal>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    sso_user_details: state.admin.get('sso_user_details'),
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    surveyLinkResponse: (data) =>
      dispatch(AuthAction.surveyLinkResponse(data)),
  };
};

const SurveyModal = connect(
  mapStateToProps,
  mapDispatchToProps,
)(CfaSurveyModal);

export default SurveyModal;
