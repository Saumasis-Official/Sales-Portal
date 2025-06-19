import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Modal, notification } from 'antd';
import * as Action from '../actions/dashboardAction';
import '../EmailModal/style.css';
import * as ErrorAction from '../actions/errorAction';
import * as Actions from '../../admin/actions/adminAction';
import { errorReportFormat } from '../../../config/error';

let EditEmail = props => {
    const { sendSmsMail, onCancel, logAppIssue } = props
    const [emailId, setEmailId] = useState('');
    const [remark, setRemark] = useState('');
    const [modalShow, setModalShow] = useState(false);
    const { getMaintenanceRequests } = props
    // fn to display error notification using antd library
    useEffect(() => {
        getMaintenanceRequests();
        setModalShow(props.visible)
        setEmailId('')
    }, [props.visible])
    let errorHandler = (message, description) => {
        setTimeout(() => {
            notification.error({
                message,
                description,
                duration: 8,
                className: "notification-error"
            });
        }, 50)
    }

    //fn called when user clicked on Submit button
    let onSubmit = event => {

        event.preventDefault();
        if (!emailId) {
            errorHandler(
                'Error occurred',
                'Please enter your Email ID.'
            )
        }
        else if (!remark) {
            errorHandler(
                'Error occurred',
                'Please enter remark.'
            )
        } else {
            let data = {
                type: 'email',
                updateValue: emailId,
                remark: remark
            }
            sendSmsMail(data).then((response) => {
                if (response.data.success) {
                    notification.success({
                        message: "Success",
                        description: response.data.message,
                        duration: 2,
                        className: 'notification-green'
                    });
                    setEmailId('')
                    setModalShow(false)
                    onCancel()
                } else {
                    errorReportFormat.distributor_dashboard.profile_003.errorMessage = response.data.message;
                    errorReportFormat.distributor_dashboard.profile_003.logObj = { data: response.config.data, error_message: response.data };
                    logAppIssue(errorReportFormat.distributor_dashboard.profile_003);
                    notification.error({
                        message: 'Error occurred',
                        description: response.data.message,
                        duration: 3,
                        className: "notification-error"
                    });
                }
            })
        }
    }

    let handleInputChange = (event, field) => {
        let value = event.target.value;
        setEmailId(value)
    }

    let handleRemarkChange = (event) => {
        let value = event.target.value;
        setRemark(value)
    }
    let handleCancel= ()=>{
        setEmailId('');
        setRemark('');
        props.onCancel();
    }

    return (
        <>
            <Modal title="Email Update" visible={modalShow} onCancel={handleCancel} footer={null} wrapClassName='email-modal'>
                <form onSubmit={(e) => onSubmit(e)}>
                    <p className="label">Enter your email id to update</p>
                    <div className="form-wrap">
                        <input
                            id="emailId"
                            type="email"
                            name="emailId"
                            placeholder="Email ID"
                            className="form-control"
                            autoFocus
                            value={emailId}
                            onChange={e => {
                                handleInputChange(e, 'defaultEmail')
                            }}
                        />
                    </div>
                    <p className="label">Remark</p>
                    <div className="form-wrap">
                        <input
                            id="remark"
                            type="text"
                            name="remark"
                            placeholder="Remark"
                            className="form-control"
                            value={remark}
                            onChange={e => {
                                handleRemarkChange(e)
                            }}
                        />
                    </div>
                    <div className="form-btn">
                        <button type="submit" className="sbmt-btn">Submit</button>
                    </div>
                    <div className="note">
                        <p><b>Note: </b> We will send a verification link to your email, please use same to verify.</p>
                    </div>
                </form>
            </Modal>
        </>
    )
}

const mapStateToProps = () => {
    return {}
}
const mapDispatchToProps = (dispatch) => {
    return {
        getMaintenanceRequests: () =>
            dispatch(Actions.getMaintenanceRequests()),
        sendSmsMail: data =>
            dispatch(Action.sendSmsMail(data)),
        logAppIssue: (data) => dispatch(ErrorAction.logAppIssue(data)),
    }
}

const EmailModal = connect(
    mapStateToProps,
    mapDispatchToProps
)(EditEmail)

export default EmailModal
