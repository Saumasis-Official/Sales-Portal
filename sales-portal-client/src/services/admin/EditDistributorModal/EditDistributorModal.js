import React, { useEffect, useState } from 'react';
import { Modal, notification } from 'antd';
import './EditDistributorModal.css';

let EditDistributorContactModal = (props) => {
    const { data, ssoRole, dbStatusDeleted } = props;
    const [email_id, setEmailId] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [commentValue, setCommentValue] = useState('');

    const isSupportAdmin = (ssoRole.includes('SUPPORT'));
    const isCCOrole = (ssoRole.includes('CALL_CENTRE_OPERATIONS'));

    useEffect(() => {
        if (data) {
            setEmailId(data.email)
            setPhoneNumber(data.mobile)
            setCommentValue('')
        }
    }, [data])

    const updateDistributorContactHandler = (event) => {
        event.preventDefault();
        let hasEnteredEmail = false;
        let hasEnteredPhoneNumber = false;
        let hasEmailError = false;
        let hasPhoneError = false;
        const nameRegexEmail = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        const nameRegex = /^[0-9]{10,12}$/;

        if (!nameRegexEmail.test(email_id)) {
            hasEmailError = true;
            notification.error({
                message: 'Error',
                description: 'Please enter valid email id',
                duration: 2,
                className: 'notification-error',
            });
            return true;
        }
        else if (!nameRegex.test(phoneNumber)) {

            hasPhoneError = true;
            notification.error({
                message: 'Error',
                description: 'Please enter valid phone number',
                duration: 2,
                className: 'notification-error',
            });
            return true;
        }
        else if (!email_id && !phoneNumber) {
            notification.error({
                message: 'Error',
                description: 'Please enter either email id or phone number',
                duration: 2,
                className: 'notification-error',
            });
            return true
        }
        else if (!commentValue) {
            notification.error({
                message: 'Error',
                description: 'Please enter comment',
                duration: 2,
                className: 'notification-error',
            });
            return true
        }
        else {

            let updatedData = {}
            if (email_id === data.email && phoneNumber === data.mobile) {
                updatedData = {}
            } else if (email_id !== data.email && phoneNumber !== data.mobile) {
                updatedData = { email_id, phoneNumber, commentValue }
            } else if (email_id !== data.email) {
                updatedData = { email_id, commentValue }

            } else if (phoneNumber !== data.mobile) {
                updatedData = { phoneNumber, commentValue }
            }
            props.onUpdateDistributorDetails(updatedData);

        }
    }

    const EmailChangeHandler = (event) => {
        const { value } = event.target
        setEmailId(value);
    };

    const PhoneChangeHandler = (event) => {
        const { value } = event.target
        setPhoneNumber(value);
    };

    const commentChangeHandler = (event) => {
        const { value } = event.target
        setCommentValue(value);
    };

    return (
        <>
            <Modal title="Distributor Contact" visible={props.visible} onCancel={props.onCancel} footer={null} wrapClassName='details-modal'>
                {
                    <div className="basic-details">
                        <div className="form-wrapper">
                            <label>Distributor Name :</label>
                            <span>{data.name}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Distributor Code :</label>
                            <span>{data.id}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Region :</label>
                            <span>{data.region}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>State :</label>
                            <span>{data.state}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Customer Group :</label>
                            <span>{data.customer_group}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Email Address :</label>
                            <span>{email_id}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Phone Number :</label>
                            <span>{phoneNumber}</span>
                        </div>
                    </div>
                }
                {/* <form onSubmit={updateDistributorContactHandler}>
                    <div className="form-wrap">
                        <label>Email Address</label>
                        <input
                            id="email_id"
                            type="email"
                            name="email_id"
                            value={email_id}
                            onChange={EmailChangeHandler}
                            placeholder={'Please enter email Id'}
                            className="form-control"
                            autoFocus
                            disabled={isSupportAdmin || dbStatusDeleted || isCCOrole}
                        />
                    </div>
                    
                    <div className="form-wrap">
                        <label>Phone Number</label>
                        <input
                            id="phone_number"
                            type="text"
                            name="phone_number"
                            value={phoneNumber}
                            onChange={PhoneChangeHandler}
                            placeholder={'Please enter phone number'}
                            className="form-control"
                            maxLength={10}
                            autoFocus
                            disabled={isSupportAdmin || dbStatusDeleted || isCCOrole}
                        />
                    </div>

                    {!isSupportAdmin && !dbStatusDeleted &&
                        <div className="form-wrap">
                            <label>Comment</label>
                            <textarea
                                id="comment"
                                type="text"
                                name="comment"
                                value={commentValue}
                                onChange={commentChangeHandler}
                                placeholder="Enter comment for this distributor(minimum 10 characters)"
                                className="form-control"
                                style={{ 'height': '100px' }}
                                disabled={(email_id === data.email && phoneNumber === data.mobile) ? true : false}
                            />
                        </div>}

                    {!isSupportAdmin  && 
                        <div className="form-btn" >
                            <button className="submit-bt" type='button' onClick={props.onCancel}> Cancel </button>
                            <button type="submit" className="submit-bt" hidden={dbStatusDeleted} disabled={(email_id === data.email && phoneNumber === data.mobile)} > Update </button>
                        </div>}
                </form> */}

            </Modal>
        </>
    )
}

export default EditDistributorContactModal;
