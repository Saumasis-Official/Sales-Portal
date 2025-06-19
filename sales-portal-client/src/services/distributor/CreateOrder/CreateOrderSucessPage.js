import React, { useEffect,useState } from 'react';
import { connect } from 'react-redux';
import * as Action from '../action';
import * as Actions from '../../admin/actions/adminAction';
import * as dashboardAction from '../actions/dashboardAction';
import Auth from '../../../util/middleware/auth';
import './OrderSuccess.css';
import { authenticatedUsersOnly } from '../../../util/middleware/index';
import PromisedCreditModal from '../OrderDetail/PromisedCreditModal';
import config from '../../../config';
import { RUPEE_SYMBOL } from '../../../constants/index';
const appConfig = config.app_level_configuration;

let CreateOrderSuccessPage = props => {
    const browserHistory = props.history;
    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    if (props.location.pathname.split('/')[1] === 'distributor') {
        authenticatedUsersOnly(props.location.pathname, props.history);
      }

    let role = Auth.getRole();
    if ((!role && !access_token) || (role && !admin_access_token)) {
        browserHistory.push('/');
    }
    const { createOrderData, getMaintenanceRequests, app_level_configuration,credit_details = {} } = props;
    
    const po_number = createOrderData.get('po_number');
    const so_number = createOrderData.get('so_number');
    const req_date = createOrderData.get('po_date');
    const order_total_amount = createOrderData.get('order_total_amount');

    const [isPromiseModalOpen, setIsPromiseModalOpen] = useState(true);
    const [creditData, setCreditData] = useState(props.location.state.creditData);
    const [creditDifference, setCreditDifference] = useState(props.location.state.creditDifference);
    const [enablePromiseCredit, setEnablePromiseCredit] = useState(false);

    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (!config) continue;
                
                if (config.key === appConfig.enable_promise_credit.key) {
                    setEnablePromiseCredit(config.value === appConfig.enable_promise_credit.enable_value);
                }
             }
        }
    }, [app_level_configuration]);
 
    const handlePromiseCreditSubmitted = (event) => {
        handleCloseModal();     
    };

    const handleCloseModal = () => {
        setIsPromiseModalOpen(false);
    };

    
    useEffect(() => {
        if (creditData.po_number && creditDifference <= 0 && enablePromiseCredit) {
             props.promiseCredit(creditData);
        }
    }, [creditData]);

  
    window.localStorage.setItem("TCPL_SAP_formData", JSON.stringify([]));
    let successOrderData = (JSON.parse(window.localStorage.getItem("TCPL_Success_Order_data")));
    let promisemodalflag = window.localStorage.getItem("TCPL_Promised_credit_flag");
    
    useEffect(() => {
        getMaintenanceRequests();
    }, []);
    

    const handleBackClick = event => {
        props.distributorResetCreateOrderCompleteFormFields();
       
        localStorage.removeItem("TCPL_Success_Order_data");
        localStorage.removeItem("TCPL_Promised_credit_flag");
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


    //  so number is string converting to array 

    const soNumber = successOrderData?.so_number?.split(',');

    return (
        <><section className="main-content order-success-page">
            <div className="success-wrapper">
                <div className="sucess-header">
                    <div className="success-img-flex">
                        <img src="/assets/images/success.svg" alt="" />
                        <h2>Submitted successfully!</h2>
                    </div>
                    <p>Your order has been successfully submitted, you may keep following order details for reference purposes.</p>
                    <hr />
                    <h3>Request summary</h3>
                </div>
                <div>

                </div>
                <div className="container-wrapper">
                    <div className='wrapper-container'>
                        <div style={{ flex: 'flex 70%' }}>

                            <h5>Purchase Order No #</h5>
                            {/* <h4>{po_number}</h4> */}
                            <h4>{successOrderData.po_number}</h4>

                        </div>
                        <div className='so-reference'>
                            <h5 className="success-item1" >SO Reference #</h5>
                            {/* <h4 className="success-item2">{so_number}</h4> */}
                            {soNumber.map((item, index) => (
                                <h4 className="">
                                    {item}
                                </h4>
                            ))}

                        </div>
                    </div>
                </div>
                <div className='container-wrapper'>
                    <div className='wrapper-container'>
                        <div style={{ flex: 'flex 40%' }}>
                            <h5>Request Date</h5>
                            <h4>{successOrderData.po_date}</h4>
                        </div>

                        <div className='order-value'>
                            <h5 className="success-item-req" style={{ padding: '0px 15px' }}>Order Value</h5>
                            <h4 className="success-item-req-value"><span>{RUPEE_SYMBOL}</span> {successOrderData.order_total_amount.toFixed(2)}</h4>
                        </div>
                    </div>
                </div>
                <div className="success-back-btn">
                    <button onClick={handleBackClick}>
                        Back to home<img src="/assets/images/path.svg" alt="" />
                    </button>
                </div>
            </div>
        </section>

            {enablePromiseCredit && creditDifference <= 0 && promisemodalflag == 'true' && <PromisedCreditModal
                isPromiseModalOpen={handleCloseModal}
                visible={isPromiseModalOpen}
                onCancel={handleCloseModal}
                setHandleCredit={handlePromiseCreditSubmitted}
                setCreditData={setCreditData}
                setCreditDifference={creditDifference}
                creditData={creditData}
                distributorId={props.location.state.distributorId} />}
        </>
    )
}

const mapStateToProps = state => {
    const token = Auth.getAccessToken();
    const userData = Auth.decodeToken(token);
    return {
        createOrderData: state.distributor.get('create_order'),
        sso_user_details: state.admin.get('sso_user_details'),
        credit_details: state.dashboard.get('credit_details'),
        app_level_configuration: state.auth.get('app_level_configuration'),
        userData
    }
}
const mapDispatchToProps = dispatch => {
    return {
        getMaintenanceRequests: () =>
            dispatch(Actions.getMaintenanceRequests()),
        distributorResetCreateOrderCompleteFormFields: () =>
            dispatch(Action.distributorResetCreateOrderCompleteFormFields()),
            promiseCredit: (data) => dispatch(Actions.promiseCredit(data)),
            getCreditLimitDetails: (login_id) => dispatch(dashboardAction.getCreditLimitDetails(login_id)),
    }
}

const ConnectCreateOrderSuccessPage = connect(
    mapStateToProps,
    mapDispatchToProps
)(CreateOrderSuccessPage)

export default ConnectCreateOrderSuccessPage
