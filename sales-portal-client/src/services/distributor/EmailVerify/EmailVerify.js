import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import './EmailVerify.css';
import * as Action from '../actions/dashboardAction';
import * as Actions from '../../admin/actions/adminAction';

let Emailverify = props => {
    const { getEmailVerify } = props
    const [showText, setShowText] = useState('')
    const { getMaintenanceRequests } = props;
    useEffect(() => {
        getMaintenanceRequests();
        let remark = "";
        if (props.location) {
            if (props.location.query) {
                remark = props.location.query.remark;
            }
        }
        getEmailVerify(props.params.id, remark).then((res) => {
            if (res && res.data && res.data.success) {
                setShowText(true)
            } else {
                setShowText(false)
            }
        });
    }, [props.params.id])

    return (
        <div className="email-verify-page">
            <div className="email-verify-mssg">
                <h2>
                    {
                        showText === '' ? '' : (
                            showText ?
                                'Your email address has been updated successfully !'
                                : 'Link Expired or Invalid Link'
                        )
                    }

                </h2>
                {/* <span>Continue to Dashboard</span> */}
            </div>
        </div>
    )
}

const mapStateToProps = (state, ownProps) => {
    return {

    }
}
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getMaintenanceRequests: () =>
            dispatch(Actions.getMaintenanceRequests()),
        getEmailVerify: (id, remark) => dispatch(Action.getEmailVerify(id, remark)),
    }
}

const EmailVerify = connect(
    mapStateToProps,
    mapDispatchToProps
)(Emailverify)

export default EmailVerify
