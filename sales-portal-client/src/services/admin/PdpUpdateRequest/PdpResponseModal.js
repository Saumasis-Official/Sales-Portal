import React, { useState } from 'react'
import { Modal, Input } from 'antd';
const { TextArea } = Input;
function PdpResponseModal(props) {
    const { hideModal, isVisible, handleSubmit, data, status } = props;
    const [comment, setComment] = useState("");
    const submitHandler = (data) => {
        setComment("");
        handleSubmit(data);
    }
    return (
        <div>
            {data && <Modal title={status === 'APPROVED' ? "Accept Request" : "Reject Request"} visible={!!isVisible}
                onCancel={hideModal} footer={null} wrapClassName='comment-modal'>
                <form>
                    <div className="basic-details">
                        <div className="form-wrapper">
                            <label>PDP Update Request No :</label>
                            <span>{data.pdp_update_req_no}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Distributor Name :</label>
                            <span>{data.distributor_name} {data.distributor_code}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Sales Area Details :</label>
                            <span>{data.sales_org}/{data.dist_channel}/{data.division}/{data.plant_code}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Current PDP:</label>
                            <span>{data.pdp_current}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Requested PDP:</label>
                            <span>{data.pdp_requested}</span>
                        </div>
                        {data?.pdp_requested.startsWith('FN') && <div>
                            <div className="form-wrapper">
                                <label>Requested Reference Date:</label>
                                <span>{data.ref_date_requested}</span>
                            </div>
                            <div className="form-wrapper">
                                <label>Current Reference Date:</label>
                                <span>{data.ref_date_current}</span>
                            </div>
                        </div>}
                        <div className="form-wrapper">
                            <label>Request Reason:</label>
                            <span>{data.request_comments}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Raised By:</label>
                            <span>{`${data.created_by.substring(0, data.created_by.indexOf('-'))} <${data.tse_code}>`}</span>
                        </div>
                    </div>
                    <div className="comment-fld">
                        <label>Reason</label>
                        <div>
                            <TextArea
                                value={comment}
                                maxLength={255}
                                showCount
                                onChange={e => setComment(e.target.value)}
                                placeholder="Enter reason here"
                            />
                        </div>
                    </div>
                    <div className="comment-btn">
                        <button type="button" 
                            disabled ={comment.length <8}
                            className="sbmt-btn"
                            onCancel={hideModal} onClick={() => {
                                let responseData = { ...data }
                                responseData.status = status.toUpperCase();
                                responseData['response'] = comment;
                                submitHandler(responseData)
                            }}  >
                            Submit
                        </button>
                    </div>
                </form>
            </Modal>}
        </div>
    )
}

export default PdpResponseModal
