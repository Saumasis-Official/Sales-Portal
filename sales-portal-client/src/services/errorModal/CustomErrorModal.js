import React, { useEffect, useState } from 'react';
import './CustomErrorModal.css';
import * as adminAction from '../../services/distributor/action';
import * as RequestPersona from '../../persona/requests.js';
import { connect } from 'react-redux';
import ReportIssueModal from '../../services/distributor/ReportIssueModal/ReportIssueModal';

/* 
  Implementation for SOPE 2826:
   This modal appears when user gets SAP related errors(Material mismatch/Order block etc).
   It asks the user if they want to report the issue (Validate or Submit)
   It is not effecting the existing order flow. 
    */

const CustomErrorModal = (props)=> {
  const { 
    isOpen,
    onClose,
    report_issues,
    admin_switched_to_distributor,
    context,
    distributorId
  }=props
  

  const [isReportModalVisible, setIsReportModalVisible] =
    useState(false);
  const [serviceLevelCategory, setServiceLevelCategory] = useState(
    [],
  );
  const [defaultOptionIndex, setDefaultOptionIndex] = useState(null);

  const handleReportModal = () => {
    setIsReportModalVisible(true);

    if (
      RequestPersona.hasViewPermission(
        RequestPersona.pages.SDR,
        RequestPersona.features.ONLY_SDR_VIEW,
      )
    ) {
      setServiceLevelCategory(report_issues);
    }
  };

  useEffect(() => {
    if (serviceLevelCategory && serviceLevelCategory.length) {
      if (context === 'submit') {
        setDefaultOptionIndex(serviceLevelCategory.length - 1);
      } else if (context === 'validate') {
        setDefaultOptionIndex(2); 
      }
    } else {
      let type = 'REPORT_ISSUE';
      props.fetchServiceLevelCategory(type).then((response) => {
        if (response && response.data && response.data.data) {
          setServiceLevelCategory(response.data.data);
        }
      });
    }
  }, [context, serviceLevelCategory]);
  const cancelReportModal = () => {
    setIsReportModalVisible(false);
  };

  if (!isOpen) return null;

  return (
    <div className="validationErrorModal">
      <div className="validationErrorModal-content">
        <h1>Do you want to report the issue?</h1>
        <div
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <button
            className="confirmation-button"
            onClick={handleReportModal}
          >
            Yes
          </button>
          <button className="confirmation-button" onClick={onClose}>
            No
          </button>
        </div>
        <ReportIssueModal
          visible={isReportModalVisible}
          onCancel={cancelReportModal}
          serviceLevelCategory={serviceLevelCategory}
          adminSwitchedToDistributor={admin_switched_to_distributor}
          onClose={onClose}
          history={props.history}
          distributorId={distributorId}
          defaultOptionIndex={defaultOptionIndex} 
        />
      </div>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    report_issues: state.admin.get('report_issues'),
    admin_switched_to_distributor: state.admin.get(
      'admin_switched_to_distributor',
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    fetchServiceLevelCategory: (type) =>
      dispatch(adminAction.fetchServiceLevelCategory(type)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CustomErrorModal);
