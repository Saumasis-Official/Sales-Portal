import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Modal, notification } from 'antd';
import '../EmailModal/style.css';

let EditEmail = props => {

    const [email_id, setEmailId] = useState('');

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

    //fn called when user clicked on Submit button
    let handleSubmit = event => {
        event.preventDefault();
        if (!email_id) {
            errorHandler(
                'Error occurred',
                'Please enter your Email ID.'
            )
        } else {
        }
    }

    let handleInputChange = (event, field) => {
        let value = event.target.value;

        setEmailId(value)
    }


    return (
        <>
            <Modal title="Email Update" visible={props.visible} onCancel={props.onCancel} footer={null} wrapClassName='email-modal'>
                <p>Enter your mail id to update</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-wrap">
                        <input
                            id="email_id"
                            type="email"
                            name="email_id"
                            placeholder="Email ID"
                            className="form-control"
                            autoFocus
                            defaultValue={email_id}
                            onChange={e => {
                                handleInputChange(e, 'defaultEmail')
                            }}
                        />
                    </div>
                    <div className="form-btn">
                        <input type="submit" value="Submit" className="sbmt-btn" />
                    </div>
                </form>
            </Modal>
        </>
    )
}

const mapStateToProps = () => {
    return {

    }
}
const mapDispatchToProps = () => {
    return {
    }
}

const EmailModal = connect(
    mapStateToProps,
    mapDispatchToProps
)(EditEmail)

export default EmailModal
