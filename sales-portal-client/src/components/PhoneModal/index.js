import React, { useState } from 'react';
import { connect } from 'react-redux';
import OtpInput from 'react-otp-input';
import { Modal, notification } from 'antd';
import '../PhoneModal/style.css'

let EditPhone = props => {

    const [phone_num, setPhoneNumber] = useState('');

    const [isVisiblePhoneBox, setVisiblePhoneBox] = useState(true);

    let { timeExpiredAt } = props;
    const [confirmationRequired, setconfirmationRequired] = useState(true);

    // Declare a new state variable, which we'll call "count"
    const [timeLeft, setTimeLeft] = useState(timeExpiredAt);

    const [mobile, setMobile] = useState(phone_num || 'XXX XXX XXXX');
    const [otp, setOtp] = useState('');

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

    const convertDisplayTimer = (timeLeft) => {
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft - minutes * 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
        }
    }





    //fn called when user clicked on Submit button
    let handleSubmit = event => {
        event.preventDefault();
        if (!phone_num) {
            errorHandler(
                'Error occurred',
                'Please enter your Number.'
            )
        } else if (phone_num.length < 10) {
            errorHandler(
                'Error occurred',
                'Please enter correct Number.'
            )
        } else {
            setconfirmationRequired(false);
            setVisiblePhoneBox(false);
            let mobileNumber = phone_num;

            if (mobileNumber && mobileNumber.length === 10) {
                mobileNumber = 'XXX' + ' ' + 'XXX' + ' ' + mobileNumber.slice(6, 10);
            }
            setMobile(mobileNumber);
        }
    }

    let handleInputChange = (event) => {
        let value = event.target.value;
        setPhoneNumber(value)
    }
    return (
        <>
            <Modal title="Phone Number Update" visible={props.visible} onCancel={props.onCancel} footer={null} wrapClassName='phone-modal'>
                <form onSubmit={handleSubmit}>
                    {isVisiblePhoneBox ? <div>
                        <p>Enter you number for update</p>
                        <div className="form-wrap">
                            <input
                                id="phone_num"
                                type="text"
                                name="phone_num"
                                placeholder="Phone Number"
                                className="form-control"
                                maxLength={10}
                                autoFocus
                                defaultValue={phone_num}
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
                        <div className="form-btn">
                            <input type="submit" value="Submit" className="sbmt-btn" />
                        </div>
                    </div> : <div></div>}
                </form>
                <div>

                    <form onSubmit={handleOtpSubmit}>
                        {confirmationRequired ? <div></div> : <div> <div className="otp-form-head">
                            <h3>OTP Verification</h3>
                            <p>We have sent an OTP on your registered mobile : <span>{mobile}</span></p>
                        </div><div className="otp-timer">
                                <span id="otp-timer">
                                    {convertDisplayTimer(timeLeft)}
                                </span>
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
const mapDispatchToProps = () => {
    return {
    }
}

const PhoneModal = connect(
    mapStateToProps,
    mapDispatchToProps
)(EditPhone)

export default PhoneModal
