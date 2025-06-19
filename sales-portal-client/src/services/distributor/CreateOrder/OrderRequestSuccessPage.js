import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import * as Action from '../action';
import * as Actions from '../../admin/actions/adminAction';
import Auth from '../../../util/middleware/auth';
import './OrderSuccess.css';
import { authenticatedUsersOnly } from '../../../util/middleware/index';

let OrderRequestSuccessPage = props => {
    const browserHistory = props.history;
    const { getMaintenanceRequests } = props;
    const { poNumber, requestNumber } = props.location.state;

    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    if (props.location.pathname.split('/')[1] === 'distributor') {
        authenticatedUsersOnly(props.location.pathname, props.history);
    }

    let role = Auth.getRole();
    if ((!role && !access_token) || (role && !admin_access_token)) {
        browserHistory.push('/');
    }

    window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify([]));
    useEffect(() => {
        getMaintenanceRequests();
    }, []);

    const handleBackClick = event => {
        props.distributorResetCreateOrderCompleteFormFields();
        if (role) {
            browserHistory.push({
                pathname: "/admin/distributor",
                state: {
                    distributorId: props.location.state.distributorId
                }
            });
        } else {
            browserHistory.push("/distributor/dashboard");
        }
    }

    useEffect(() => {
        return () => {
            props.distributorResetCreateOrderCompleteFormFields();
        };
    }, []);

    return (
        <section className="main-content order-success-page">
            <div className="success-wrapper">
                <div className="sucess-header">
                    <div className="success-img-flex">
                        <img src="/assets/images/success.svg" alt="" />
                        <h2>Requested successfully!</h2>
                    </div>
                    <p>Your order has been sent for approval. You may keep following details for reference purposes.</p>
                    <hr />
                    <h3>Request summary</h3>
                </div>
                <div className="success-card1">
                    <div className="success-so sucess-title">
                        <h5 className="success-item1">Request No #</h5>
                        <h4 className="success-item2">{requestNumber}</h4>
                    </div>
                    <div className="success-po sucess-title">
                        <h5>Purchase Order No #</h5>
                        <h4>{poNumber}</h4>
                    </div>
                </div>
                <div className="success-back-btn">
                    <button onClick={handleBackClick}>
                        Back to home<img src="/assets/images/path.svg" alt="" />
                    </button>
                </div>
            </div>
        </section>
    )
}

const mapStateToProps = state => {
    const token = Auth.getAccessToken();
    const userData = Auth.decodeToken(token);
    return {
        createOrderData: state.distributor.get('create_order'),
        sso_user_details: state.admin.get('sso_user_details'),
        userData
    }
}
const mapDispatchToProps = dispatch => {
    return {
        getMaintenanceRequests: () =>
            dispatch(Actions.getMaintenanceRequests()),
        distributorResetCreateOrderCompleteFormFields: () =>
            dispatch(Action.distributorResetCreateOrderCompleteFormFields())
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(OrderRequestSuccessPage)
