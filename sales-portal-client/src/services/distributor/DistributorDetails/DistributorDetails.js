import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { notification } from 'antd'
import Auth from '../../../util/middleware/auth';
import * as Action from '../actions/dashboardAction';
import Radio from '../../../components/Radio'
import EmailModal from '../EmailModal/index'
import PhoneModal from '../PhoneModal/index'
import CommentListModal from '../CommentModal/CommentListModal'
import serverConfig from '../../../config/server';
import './DistributorDetails.css';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import * as Actions from '../../admin/actions/adminAction';
import { authenticatedUsersOnly } from '../../../util/middleware';

let DistributorDetails = props => {
    const { getAlterDetails, alertDetails, updateAlert, region_details, getAlertCommentList, alert_comment_list, getMaintenanceRequests } = props
    const defaultFormData = {
        smsAlert: true,
        emailAlert: true,
        whatsAppAlert: true,
        po_so_sms: true,
        invoice_details_sync_sms: true,
        po_so_email: true,
        invoice_details_sync_email: true

    }
    const [formData, setFormData] = useState(defaultFormData);
    const [enableViewComment, setEnableViewComment] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [infoCategory, setInfoCategory] = useState('');
    if (props.location.pathname.split('/')[1] === 'distributor') {
        authenticatedUsersOnly(props.location.pathname, props.history);
      }
       const showModal = () => {
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);

    const showPhoneModal = () => {
        // debugger

        setIsPhoneModalVisible(!isPhoneModalVisible);
    };

    const handlePhoneModalCancel = () => {
        setIsPhoneModalVisible(false);
    };

    useEffect(() => {
        getMaintenanceRequests();
        props.getRegionDetails();
        if (alertDetails !== undefined) {
            setFormData((user) => {
                return {
                    ...user,
                    'po_so_sms': alertDetails.po_so_sms,
                    'po_so_email': alertDetails.po_so_email,
                    'invoice_details_sync_sms': alertDetails.invoice_details_sync_sms,
                    'invoice_details_sync_email': alertDetails.invoice_details_sync_email,
                };
            });
        }

    }, [alertDetails !== undefined])

    const handleInputChange = (e, name) => {
        let value = e.target && e.target.value === "true" ? true : false
        setFormData((user) => {
            return { ...user, [name]: value };
        });

    };

    const handleCloseCommentList = () => {
        setEnableViewComment(false)
    }

    const handleViewCommentModal = (arg) => {
        setEnableViewComment(true)
        setInfoCategory(arg)
        getAlertCommentList(region_details.id, arg);

    };

    let login_id = Auth.getLoginId();
    useEffect(() => {
        getAlterDetails(login_id)
    }, [])
    const onSubmit = (e) => {

        e.preventDefault();
        const { po_so_sms, invoice_details_sync_sms, po_so_email, invoice_details_sync_email } = formData
        updateAlert({
            "cloumn_name": [
                { "cloumn_name": "po_so_sms", "status": po_so_sms },
                { "cloumn_name": "invoice_details_sync_sms", "status": invoice_details_sync_sms },
                { "cloumn_name": "po_so_email", "status": po_so_email },
                { "cloumn_name": "invoice_details_sync_email", "status": invoice_details_sync_email }
            ],
            login_id: login_id
        }).then((response) => {
            if (response.status === 200) {
                notification.success({
                    message: "Success",
                    description: "Profile Details updated successfully",
                    duration: 1,
                    className: 'notification-green'
                });
                getAlterDetails(login_id)
            } else {
                notification.error({
                    message: "Error occurred",
                    description: response.message,
                    duration: 3,
                    className: "notification-error"
                });
            }
        })
    }

    return (
        <>
            <div className="main-content do-detail-page">
                <div className="do-detail-block">
                    {
                        region_details && region_details.name &&
                        <div className="basic-details">
                            <h3>Basic Details</h3>
                            <div className="form-wrapper">
                                <label>Distributor Name</label>
                                <span>{`${region_details && region_details.name} `}</span>
                            </div>
                            <div className="form-wrapper">
                                <label>Distributor Code</label>
                                <span>{region_details.id}</span>
                            </div>
                            <div className="form-wrapper">
                                <label>Email</label>
                                <span className="emailText">{region_details.email}
                                    <i className='info-icon' onClick={() => handleViewCommentModal('email')}><Tooltip placement="bottom" title="Info"><InfoCircleOutlined /></Tooltip></i>
                                    <em className="edit-mail" onClick={showModal}><img src="/assets/images/icon-edit.svg" alt="Email Edit" /></em>
                                </span>
                                {/* <input type="text" value={region_details.email} className="emailfld" /> */}
                            </div>
                            <div className="form-wrapper">
                                <label>Phone number</label>
                                <span className="phoneText">{region_details.mobile}
                                    <i className='info-icon' onClick={() => handleViewCommentModal('mobile')}><Tooltip placement="bottom" title="Info"><InfoCircleOutlined /></Tooltip></i>
                                    <em className="edit-phone" onClick={showPhoneModal}><img src="/assets/images/icon-edit.svg" alt="Phone Edit" /></em>
                                </span>
                                {/* <input type="text" value={region_details.mobile} className="phonefld" /> */}
                            </div>
                        </div>
                    }

                    {
                        alertDetails !== undefined &&

                        <form onSubmit={(e) => onSubmit(e)}>
                            <div className="alert-details">
                                <h3>Alerts Settings</h3>
                                <div className="form-wrapper2">
                                    {
                                        formData.smsAlert === true &&
                                        <>
                                            <fieldset>
                                                <legend>SMS Alerts</legend>
                                                <div>
                                                    <h4>Creation of PO and SO</h4>
                                                    <div className="radio-grp">
                                                        <Radio

                                                            id='pososms1'
                                                            label='Yes'
                                                            name='po_so_sms'
                                                            value={true}
                                                            onChange={handleInputChange}
                                                            checked={formData.po_so_sms === true}
                                                        />
                                                        <Radio

                                                            id='pososms2'
                                                            label='No'
                                                            name='po_so_sms'
                                                            value={false}
                                                            onChange={handleInputChange}
                                                            checked={formData.po_so_sms === false}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'none' }}>
                                                    <h4>Invoice details sync</h4>
                                                    <div className="radio-grp">
                                                        <Radio

                                                            id='invoicedetailssms1'
                                                            label='Yes'
                                                            name='invoice_details_sync_sms'
                                                            value={true}
                                                            onChange={handleInputChange}
                                                            checked={formData.invoice_details_sync_sms === true}
                                                        />
                                                        <Radio

                                                            id='invoicedetailssms2'
                                                            label='No'
                                                            name='invoice_details_sync_sms'
                                                            value={false}
                                                            onChange={handleInputChange}
                                                            checked={formData.invoice_details_sync_sms === false}
                                                        />
                                                    </div>
                                                </div>
                                            </fieldset>
                                        </>

                                    }
                                </div>
                                <div className="form-wrapper2">
                                    {
                                        formData.emailAlert === true &&
                                        <>
                                            <fieldset>
                                                <legend>Email Alerts</legend>
                                                <div>
                                                    <h4>Creation of PO and SO</h4>
                                                    <div className="radio-grp">
                                                        <Radio

                                                            id='posoemail1'
                                                            label='Yes'
                                                            name='po_so_email'
                                                            value={true}
                                                            onChange={handleInputChange}
                                                            checked={formData.po_so_email === true}
                                                        />
                                                        <Radio

                                                            id='posoemail2'
                                                            label='No'
                                                            name='po_so_email'
                                                            value={false}
                                                            onChange={handleInputChange}
                                                            checked={formData.po_so_email === false}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'none' }}>
                                                    <h4>Invoice details sync</h4>
                                                    <div className="radio-grp">
                                                        <Radio

                                                            id='invoicedetailsemail1'
                                                            label='Yes'
                                                            name='invoice_details_sync_email'
                                                            value={true}
                                                            onChange={handleInputChange}
                                                            checked={formData.invoice_details_sync_email === true}
                                                        />
                                                        <Radio

                                                            id='invoicedetailsemail2'
                                                            label='No'
                                                            name='invoice_details_sync_email'
                                                            value={false}
                                                            onChange={handleInputChange}
                                                            checked={formData.invoice_details_sync_email === false}
                                                        />
                                                    </div>
                                                </div>
                                            </fieldset>
                                        </>

                                    }
                                </div>
                            </div>
                            <div className="btn-grp">
                                <Link to='/distributor/dashboard' className="cancel-btn">Cancel</Link>
                                <button type="submit" className="sbmt-btn">Submit</button>
                            </div>
                        </form>
                    }

                </div>
            </div>
            <EmailModal visible={isModalVisible} onCancel={handleCancel} />
            <PhoneModal visible={isPhoneModalVisible} onCancel={handlePhoneModalCancel} />
            <CommentListModal
                visible={enableViewComment}
                onCancel={handleCloseCommentList}
                data={alert_comment_list && alert_comment_list.data}
                type={infoCategory}
            />
        </>
    )
}


const mapStateToProps = (state, ownProps) => {
    return {
        alertDetails: state.dashboard.get('alert_details'),
        region_details: state.dashboard.get('region_details'),
        alert_comment_list: state.admin.get('alert_comment_list'),
    };
};
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getMaintenanceRequests: () =>
            dispatch(Actions.getMaintenanceRequests()),
        getAlterDetails: (login_id) =>
            dispatch(Action.getAlterDetails({ login_id })),
        updateAlert: data =>
            dispatch(Action.updateAlert(data)),
        getRegionDetails: () => dispatch(Action.getRegionDetails()),
        getAlertCommentList: (distributorId, type) =>
            dispatch(Action.getAlertCommentList(distributorId, type)),
    };
};

const ConnectDistributorDetails = connect(
    mapStateToProps,
    mapDispatchToProps,
)(DistributorDetails);
export default ConnectDistributorDetails;

