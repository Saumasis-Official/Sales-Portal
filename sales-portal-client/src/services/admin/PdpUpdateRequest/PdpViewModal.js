import React from 'react'
import Util from '../../../util/helper/index';
import { Modal} from 'antd';
import {pages, features, hasViewPermission} from '../../../persona/requests.js';

function PdpUpdateViewModal(props) {
    const {isModalVisible, hideModal, reqData} = props
    
    return (
        <div>
            <Modal title="Request Details" visible={!!isModalVisible}
                onCancel={hideModal} footer={null}
                wrapClassName='comment-modal'>
                <div className="basic-details">
                    <div className="form-wrapper">
                        <label>PDP Request Number :</label>
                        <span>{reqData.pdp_update_req_no}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Distributor :</label>
                        <span>{reqData.distributor_name} ({reqData.distributor_code})</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Sales Area Details :</label>
                        <span>{reqData.sales_org}/{reqData.dist_channel}/{reqData.division}/{reqData.plant_code}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Current PDP :</label>
                        <span>{reqData.status === 'APPROVED'? reqData.pdp_requested: reqData.pdp_current}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Requested PDP :</label>
                        <span>{reqData.pdp_requested}</span>
                    </div>
                    { hasViewPermission(pages.PDP_REQUESTS, features.VIEW_REQUESTED_BY) &&
                        <div className="form-wrapper">
                            <label>Requested By:</label>
                            <span>{`${reqData.created_by.substring(0,reqData.created_by.indexOf('-'))} <${reqData.tse_code}>`}</span>
                        </div>
                    }
                    <div className="form-wrapper">
                        <label>Requested Reason :</label>
                        <span>{reqData.request_comments}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Requested Date :</label>
                        <span>{reqData.created_on
                            ? <>{Util.formatDate(reqData.created_on)},{Util.formatTime(reqData.created_on)}</>
                            : '-'}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Status :</label>
                        <span
                            className={"badges " +
                                (reqData.status == 'PENDING' ? 'bg-pending' : '' ||
                                    reqData.status == 'APPROVED' ? 'bg-approved' : '' ||
                                        reqData.status == 'REJECTED' ? 'bg-rejected' : '')
                            }
                        >{reqData.status}</span>
                    </div>

                    {reqData.status === 'APPROVED' &&  
                    <>
                    <div className= "form-wrapper">
                        <label>Date of Approval :</label>
                        <span>{reqData.update_on
                            ? <>{Util.formatDate(reqData.update_on)}, {Util.formatTime(reqData.update_on)}</>
                            : '-'}</span>
                    </div>  
                    <div className="form-wrapper">
                        <label>Approved By :</label>
                        <span>{reqData.updated_by?.substring(0,reqData.updated_by?.indexOf('-'))}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Approval Reason :</label>
                        <span>{reqData.response_comments}</span>
                    </div>
                    </>
                    }
                    
                    {reqData.status === 'REJECTED' && 
                    <>
                    <div className="form-wrapper">
                        <label>Rejected By :</label>
                        <span>{reqData.updated_by?.substring(0,reqData.updated_by?.indexOf('-'))}</span>
                    </div>  
                    <div className="form-wrapper">
                        <label>Rejection Reason :</label>
                        <span>{reqData.response_comments}</span>
                    </div>
                    </>
                    }
                    
                    
                </div>
            </Modal>
        </div>
    )
}

export default PdpUpdateViewModal
