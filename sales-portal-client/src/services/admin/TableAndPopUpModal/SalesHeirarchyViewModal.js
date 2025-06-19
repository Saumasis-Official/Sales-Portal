import React from 'react'
import Util from '../../../util/helper/index';
import { Modal } from 'antd';
import { pages, features, hasViewPermission } from '../../../persona/requests';
function SalesHeirarchyViewModal(props) {
    return (
        <div>
            <Modal title="Request Details" visible={!!props.isModalTseDetails}
                onCancel={props.hideTseDetailsModal} footer={null}
                wrapClassName='comment-modal'>
                <div className="basic-details">
                    <div className="form-wrapper">
                        <label>SH Number :</label>
                        <span>{props.reqData.sh_number}</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Distributor :</label>
                        <span>{props.reqData.db_name} ({props.reqData.distributor_code})</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Request Type :</label>
                        <span>{props.reqData.type == "ADD" ? "Distributor is not showing" : props.reqData.type == "REMOVE" ? "Distributor does not belongs to TSE" : ""}</span>
                    </div>
                    {hasViewPermission(pages.SHR, features.VIEW_REQUESTING_TSE) &&
                        <div className="form-wrapper">
                            <label>Requesting TSE :</label>
                            <span>{props.reqData.tse_fname} {props.reqData.tse_lname}( {props.reqData.tse_code} )</span>
                        </div>
                    }
                    <div className="form-wrapper">
                        <label>Reason :</label>
                        <span>{props.reqData.submission_comments}</span>
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
                        <span>{props.reqData.updated_on
                            ? <>{Util.formatDate(props.reqData.updated_on)},{Util.formatTime(props.reqData.updated_on)}</>
                            : '-'}</span>
                    </div>
                    <div className={"form-wrapper " +
                        (props.reqData.status == 'REJECTED' ? 'show-data' : 'hide-data')
                    }>
                        <label>Date of Rejection :</label>
                        <span>{props.reqData.updated_on
                            ? <>{Util.formatDate(props.reqData.updated_on)},{Util.formatTime(props.reqData.updated_on)}</>
                            : '-'}</span>
                    </div>
                    <div className={"form-wrapper " +
                        (props.reqData.status == 'APPROVED' ? 'show-data' : 'hide-data')
                    }>
                        <label>Approved By :</label>
                        <span>{props.reqData.updated_by}</span>
                    </div>
                    <div className={"form-wrapper " +
                        (props.reqData.status == 'REJECTED' ? 'show-data' : 'hide-data')
                    }>
                        <label>Rejected By :</label>
                        <span>{props.reqData.updated_by}</span>
                    </div>
                    <div className={"form-wrapper " +
                        (props.reqData.status == 'REJECTED' ? 'show-data' : 'hide-data')
                    }>
                        <label>Rejection Reason :</label>
                        <span>{props.reqData.comments}</span>
                    </div>
                </div>

            </Modal>
    </div>
  )
}

export default SalesHeirarchyViewModal
