import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';

import jwt from 'jsonwebtoken';
import Auth from '../../../util/middleware/auth';
import { Modal, notification, Alert, Select } from 'antd';
import * as ErrorAction from '../actions/errorAction';
import * as ErrorActionCFA from '../../admin/actions/errorAction';
import {teams, hasPermission} from '../../../persona/pegasus.js';
import auth from '../../../util/middleware/auth';


let ReportIssue = props => {
    const browserHistory = props.history;
    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    let login_id = '';
    let role = Auth.getRole();
    if (access_token || admin_access_token) {
        if (!role) {
            const decodedToken = jwt.decode(access_token);
            login_id = decodedToken ? jwt.decode(access_token).login_id : null;
        } else {
            login_id = props.distributorId || props.adminSwitchedToDistributor 
        }
    } else if (!role) {
        browserHistory.push('/');
    }

    const [showButton, setShowButton] = useState(false)
    const [reportIssueText, setReportIssueText] = useState('');
    const [selectedCatgeoryDesc, setSelectedCatgeoryDesc] = useState('');
    const [selectedCatgeory, setSelectedCatgeory] = useState('Please select category');
    const { region_details, issue, serviceLevelCategory, defaultOptionIndex} = props;

    const reportIssueHandler = async (event) => {
        event.preventDefault();
        if (reportIssueText.trim().length === 0 || reportIssueText === null) {
            notification.error({
                message: 'Error',
                description: 'Please enter your comments.',
                duration: 2,
                className: 'notification-error',
            });
        }
        else if (selectedCatgeory == 'Please select category' || selectedCatgeory == null || selectedCatgeory == undefined) {
            notification.error({
                message: 'Error',
                description: 'Please select category.',
                duration: 2,
                className: 'notification-error',
            });
        }
        else {
            try {
                let errorRecipientsCCArr = [];
                if (region_details) {
                    errorRecipientsCCArr.push(region_details.email);
                    if (region_details.asm) {
                        const asmEmailArr = region_details?.asm?.map(item => { return item.email ?? '' }) ?? [];
                        errorRecipientsCCArr = errorRecipientsCCArr.concat(asmEmailArr);
                    }
                    if (region_details.tse) {
                        const tseEmailArr = region_details?.tse?.map(item => { return item.email ?? '' }) ?? [];
                        errorRecipientsCCArr = errorRecipientsCCArr.concat(tseEmailArr);
                    }
                }
                let errorObject = {};
                if (!props.issue.errorCode) {
                    errorObject = {
                        remarks: reportIssueText,
                        categoryId: selectedCatgeory,
                        errorCode: 'ERR-DBO-COMM-001-NOERR',
                        ccRecipients: errorRecipientsCCArr.join(','),
                        tse: region_details.tse,
                    };
                } else {
                    errorObject = {
                        remarks: reportIssueText,
                        categoryId: selectedCatgeory,
                        ccRecipients: errorRecipientsCCArr.join(','),
                        tse: region_details.tse,
                        ...issue
                    };
                }
                let reportPortalErrorResponse;
                const adminRole = auth.getAdminRole();
                if (hasPermission(teams.LOGISTICS)) {
                    reportPortalErrorResponse = await props.reportPortalErrorForCFA(errorObject);
                } 
                else {
                    reportPortalErrorResponse = await props.reportPortalError(errorObject, login_id);
                }
                if (reportPortalErrorResponse && reportPortalErrorResponse.data && reportPortalErrorResponse.data.success) {
                    props.onCancel();
                    setReportIssueText('');
                    props.logAppIssue({});
                    notification.success({
                        message: "Issue Reported",
                        description: "Your issue has been reported.",
                        duration: 3,
                        className: 'notification-green'
                    });
                    if (props.onClose) {
                        props.onClose();
                      }
                } else {
                    notification.error({
                        message: 'Error',
                        description: 'Some error occurred while reporting portal issue.',
                        duration: 5,
                        className: 'notification-error',
                    });
                }
            } catch (error) {
                notification.error({
                    message: 'Technical error',
                    description: 'Some error occurred while reporting portal issue.',
                    duration: 5,
                    className: 'notification-error',
                });
            }
        }
    }

    const reportChangeHandler = (event) => {
        const { value } = event.target
        setReportIssueText(value);
        if (value.length > 0 && selectedCatgeory !== "Please select category") {
            setShowButton(value)
        } else {
            setShowButton(false)
        }
    };

    const handleCategoryChange = (value) => {
        setSelectedCatgeory(value);
        let filteredCategory = props.serviceLevelCategory.filter((cat) => { return cat.id === value });
        if (filteredCategory.length > 0) {
            setSelectedCatgeoryDesc(filteredCategory[0].description);
        }
        if (reportIssueText.length > 0 && value !== "Please select category") {
            setShowButton(value)
        } else {
            setShowButton(false)
        }
    }

    const handleOnCancel = () => {
        setSelectedCatgeory('Please select category');
        setReportIssueText('');
        setSelectedCatgeoryDesc('');
        props.onCancel();
    }

    useEffect(() => {
        if (props.visible) {
            if (
                defaultOptionIndex !== undefined &&
                serviceLevelCategory &&
                serviceLevelCategory.length > defaultOptionIndex &&
                serviceLevelCategory[defaultOptionIndex]
            ) {
                setSelectedCatgeory(serviceLevelCategory[defaultOptionIndex].id); 
                setSelectedCatgeoryDesc(serviceLevelCategory[defaultOptionIndex].description); 
            }
        }
    }, [props.visible, serviceLevelCategory, defaultOptionIndex]);

    return (
        <>
            <Modal title="Report Issue--" visible={props.visible} onCancel={handleOnCancel} footer={null} wrapClassName="comment-modal">
                {props.issue.errorMessage
                    ?
                    <Alert
                        message={props.issue.errorMessage}
                        type='error'
                    />
                    :
                    <Alert
                        message='No error found, please enter the issue details in comments.'
                        type='error'
                    />
                }
                <br />
                <form>
                    <div>
                        <Select defaultValue={selectedCatgeory} value={selectedCatgeory} onChange={(value) => handleCategoryChange(value)}>
                            {props.serviceLevelCategory.map((cat, i) => {
                                if (cat.label !== "Others") {
                                    return (
                                        <option value={cat.id} key={cat.id}>{cat.label}</option>
                                    );
                                }
                            })}
                            {props.serviceLevelCategory.map((cat, i) => {
                                if (cat.label === "Others") {
                                    return (
                                        <option value={cat.id} key={cat.id}>{cat.label}</option>
                                    );
                                }
                            })}
                        </Select>
                    </div>
                    <br />
                    <div className="comment-fld">
                        <textarea
                            value={selectedCatgeoryDesc}
                            style={{ height: 'max-content' }}
                            disabled
                        />
                    </div>
                    <br />
                    <div className="comment-fld">
                        <textarea
                            value={reportIssueText}
                            onChange={reportChangeHandler}
                            placeholder="Enter your comments. Minimum 8 characters are required..."
                        />
                    </div>
                    <div className="comment-btn">
                        <button disabled={!showButton || reportIssueText.length<8 } type="submit" onClick={e => reportIssueHandler(e)} className="sbmt-btn">
                            Submit
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    )
}

const mapStateToProps = (state, ownProps) => {
    return {
        issue: state.error.get('issue'),
        region_details: state.dashboard.get('region_details'),
    }
}
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        logAppIssue: (data) => dispatch(ErrorAction.logAppIssue(data)),
        reportPortalError: (data, login_id) => dispatch(ErrorAction.reportPortalError(data, login_id)),
        reportPortalErrorForCFA: (data) => dispatch(ErrorActionCFA.reportPortalErrorForCFA(data)),
    }
}

const ReportIssueModal = connect(
    mapStateToProps,
    mapDispatchToProps
)(ReportIssue)

export default ReportIssueModal
