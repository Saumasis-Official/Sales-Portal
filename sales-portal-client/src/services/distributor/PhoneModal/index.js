import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import OtpInput from 'react-otp-input';
import { Modal, notification } from 'antd';
import * as Action from '../actions/dashboardAction';
import '../PhoneModal/style.css';
import * as ErrorAction from '../actions/errorAction';
import { errorReportFormat } from '../../../config/error';

let EditPhone = props => {
    const { sendSmsMail, visible, verifyOtp, getRegionDetails, onCancel, logAppIssue } = props

    const [phone_num, setPhoneNumber] = useState('');
    const [remark, setRemark] = useState('');

    const [isVisiblePhoneBox, setVisiblePhoneBox] = useState(true);

    let { timeExpiredAt } = props;
    const [confirmationRequired, setconfirmationRequired] = useState(true);
    const [modalShow, setModalShow] = useState(false)
    // Declare a new state variable, which we'll call "count"
    const [timeLeft, setTimeLeft] = useState(timeExpiredAt);

    const [mobile, setMobile] = useState(phone_num || 'XXX XXX XXXX');
    const [otp, setOtp] = useState('');

    useEffect(() => {
        setModalShow(visible)
        setVisiblePhoneBox(visible)
        setconfirmationRequired(visible);

    }, [visible])
    /** Fn called when there is a change in login form fields 
     * and is used to use the login state and change the state variable values 
     * **/
    const handleOtpInputChange = (otp) => {
        setOtp(otp);
        if (otp.length >= 6) {
            document.getElementById('verify-btn').disabled = false;
        } else {
            document.getElementById('verify-btn').disabled = true;
        }
    }

    // fn to display error notification using antd libraray
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

    let handleOtpSubmit = event => {
        event.preventDefault()
        if (!otp || otp.length < 6) {
            errorHandler(
                'Technical Error',
                'Please enter correct OTP'
            )
        } else {
            document.getElementById('verify-btn').disabled = true;
            let data = {
                otp: Number(otp),
                remark: remark
            }

            verifyOtp(data).then((response) => {
                if (response.data.success) {
                    notification.success({
                        message: "Success",
                        description: response.data.message,
                        duration: 2,
                        className: 'notification-green'
                    });
                    setOtp('')
                    setPhoneNumber('')
                    getRegionDetails();
                    setModalShow(false)
                    setVisiblePhoneBox(true)
                    setconfirmationRequired(true);
                    onCancel()
                    // setModalShow(false)
                } else {
                    errorReportFormat.distributor_dashboard.profile_005.errorMessage = response.data.message;
                    errorReportFormat.distributor_dashboard.profile_005.logObj = { data: response.config.data, error_message: response.data };
                    logAppIssue(errorReportFormat.distributor_dashboard.profile_005);
                    notification.error({
                        message: "Error occurred",
                        description: response.data.message,
                        duration: 3,
                        className: "notification-error"
                    });
                }
            })
        }
    }





    //fn called when user clicked on Submit button
    let handleSubmit = event => {
        event.preventDefault();
        let nameRegex = /^[2-9]\d{9}$/;
        if (!phone_num) {
            errorHandler(
                'Error occurred',
                'Please enter your Number.'
            )
        } else if (!nameRegex.test(phone_num)) {
            errorHandler(
                'Error occurred',
                'Please enter correct Number.'
            )
        }
        else if (!remark) {
            errorHandler(
                'Error occurred',
                'Please enter remark.'
            )
        } else {

            let mobileNumber = phone_num;
            if (mobileNumber && mobileNumber.length === 10) {
                mobileNumber = 'XXX' + ' ' + 'XXX' + ' ' + mobileNumber.slice(6, 10);
            }
            setMobile(mobileNumber);
            let data = {
                type: 'sms',
                updateValue: phone_num
            }
            sendSmsMail(data).then((response) => {
                if (response.data.success) {
                    notification.success({
                        message: "Success",
                        description: response.data.message,
                        duration: 2,
                        className: 'notification-green'
                    });
                    setOtp('')
                    setPhoneNumber('')
                    setconfirmationRequired(false);
                    setVisiblePhoneBox(false);
                } else {
                    errorReportFormat.distributor_dashboard.profile_004.errorMessage = response.data.message;
                    errorReportFormat.distributor_dashboard.profile_004.logObj = { data: response.config.data, error_message: response.data };
                    logAppIssue(errorReportFormat.distributor_dashboard.profile_004);
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
        setPhoneNumber(value)
    }

    let handleRemarkChange = (event) => {
        let value = event.target.value;
        setRemark(value)
    }
    let handleCancel= ()=>{
        setRemark('');
        setPhoneNumber('');
        props.onCancel();
    }
    return (
        <>
            <Modal title="Phone Number Update" visible={modalShow} onCancel={handleCancel} footer={null} wrapClassName='phone-modal'>
                <form onSubmit={handleSubmit}>
                    {isVisiblePhoneBox ? <div>
                        <p className="label">Enter your phone number to update</p>
                        <div className="form-wrap">
                            <input
                                id="phone_num"
                                type="text"
                                name="phone_num"
                                placeholder="Phone Number"
                                className="form-control"
                                maxLength={10}
                                autoFocus
                                value={phone_num}
                                onChange={e => {
                                    handleInputChange(e, 'defaultEmail')
                                }}
                                onKeyPress={(event) => {
                                    if (!/[0-9]/.test(event.key)) {
                                        event.preventDefault();
                                    }
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
                            <input type="submit" value="Submit" className="sbmt-btn" />
                        </div>
                    </div> : <div></div>}
                </form>
                <div>

                    <form onSubmit={handleOtpSubmit}>
                        {confirmationRequired ? <div></div> : <div> <div className="otp-form-head">
                            <h3>OTP Verification</h3>
                            <p>We have sent an OTP on your mobile : <span>{mobile}</span></p>
                        </div><div className="otp-timer">
                                <span id="resend-otp" style={{ display: "none" }}>
                                    <a>Resend OTP</a>
                                </span>
                            </div>
                            <OtpInput
                                value={otp}
                                onChange={handleOtpInputChange}
                                numInputs={6}
                                isInputNum={true}
                                separator={<span></span>}
                                inputStyle={{
                                    display: 'inline-block',
                                    width: '50px',
                                    height: '50px',
                                    textAlign: "center",
                                    border: "1px solid #E8E9EC",
                                    borderRadius: "2px",
                                    fontSize: "26px"
                                }}
                                containerStyle={`otp-wrapper`}
                                focusStyle={{ border: "1px solid #2E68AD" }}
                            />

                            <div className="bottom-btn">
                                <button type="submit" className="default-btn" id="verify-btn" disabled>Verify</button>
                            </div></div>}
                    </form>
                </div>
            </Modal>
        </>
    )
}

const mapStateToProps = () => {
    return {
        timeExpiredAt: 180
    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        sendSmsMail: data =>
            dispatch(Action.sendSmsMail(data)),
        verifyOtp: data =>
            dispatch(Action.verifyOtp(data)),
        getRegionDetails: () => dispatch(Action.getRegionDetails()),
        logAppIssue: (data) => dispatch(ErrorAction.logAppIssue(data)),
    }
}

const PhoneModal = connect(
    mapStateToProps,
    mapDispatchToProps
)(EditPhone);

export default PhoneModal;
