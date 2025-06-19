import React, { useEffect } from 'react'
import Util from '../../../util/helper/index';
import { Modal} from 'antd';
function PlantCodeUpdateViewModal(props) {
    let raisedByArray = (props.reqData && props.reqData.created_by) ? props.reqData.created_by?.trim().split(' ') : [];
    let raisedBy = '';
    for(let i=0; i< raisedByArray.length-1; i++)
       raisedBy += raisedByArray[i] + ' ';
    return (
        <div>
            <Modal title="Request Details" visible={!!props.isModalTseDetails}
                onCancel={props.hideTseDetailsModal} footer={null}
                wrapClassName='comment-modal'>
                <div className="basic-details">
                    <div className="form-wrapper">
                        <label>Plant Update Number:</label>
                        <span>{props.reqData.pc_number}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Distributor :</label>
                        <span>{props.reqData.distributor_name} ({props.reqData.distributor_code})</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Current Sales Area :</label>
                        {props.reqData.status === 'APPROVED' ? 
                        <span>{props.reqData.salesorg}/{props.reqData.distribution_channel}/{props.reqData.division}/{props.reqData.plant_code}</span>:
                        <span>{props.reqData.salesorg}/{props.reqData.previous_salesdetails}</span>}                        
                    </div>
                    <div className="form-wrapper">
                        <label>Requested Sales Area :</label>
                        <span>{props.reqData.salesorg}/{props.reqData.distribution_channel}/{props.reqData.division}/{props.reqData.plant_code}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Requested By :</label>
                        <span>{`${raisedBy} ${props?.reqData?.code === 'null' ? '' : "<" + props?.reqData?.code + ">"}`}</span>
                    </div>
                    {/* } */}
                    <div className="form-wrapper">
                        <label>Requested Reason :</label>
                        <span>{props.reqData.comments}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Requested Date :</label>
                        <span>{props.reqData.created_on
                            ? <>{Util.formatDate(props.reqData.created_on)},{Util.formatTime(props.reqData.created_on)}</>
                            : '-'}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Status :</label>
                        <span
                            className={"badges " +
                                (props.reqData.status == 'PENDING' ? 'bg-pending' : '' ||
                                    props.reqData.status == 'APPROVED' ? 'bg-approved' : '' ||
                                        props.reqData.status == 'REJECTED' ? 'bg-rejected' : '')
                            }
                        >{props.reqData.status}</span>
                    </div>
                    <div className={"form-wrapper " +
                        (props.reqData.status == 'APPROVED' ? 'show-data' : 'hide-data')
                    }>
                        <label>Date of Approval :</label>
                        <span>{props.reqData.update_on
                            ? <>{Util.formatDate(props.reqData.update_on)},{Util.formatTime(props.reqData.update_on)}</>
                            : '-'}</span>
                    </div>
                    <div className={"form-wrapper " +
                        (props.reqData.status == 'APPROVED' ? 'show-data' : 'hide-data')
                    }>
                        <label>Approved By :</label>
                        <span>{props.reqData.update_by}</span>
                    </div>
                    <div className={"form-wrapper " +
                        (props.reqData.status == 'REJECTED' ? 'show-data' : 'hide-data')
                    }>
                        <label>Rejected By :</label>
                        <span>{props.reqData.update_by}</span>
                    </div>
                    <div className="form-wrapper show-data">
                        {props.reqData.status == 'REJECTED' ? <label>Rejection Reason :</label> : <label>Approval Reason :</label>}
                        <span>{props.reqData.logistic_response}</span>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

export default PlantCodeUpdateViewModal
