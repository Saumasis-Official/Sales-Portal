import React from 'react'
import { Modal} from 'antd';
function PlantRejectModal(props) {
  return (
    <div>
         <Modal title="Reject Request " visible={!!props.isRejectModalVisible}
                onCancel={props.hideModalAcceptAndReject} footer={null} wrapClassName='comment-modal'>
                <form>
                    {/* incase of ADD(Distributor not showing) -> ExistingTSE- DB's existing TSE, UpdatedTSE- Requesting TSE
                                  REMOVE(DB does not belongs to TSE)-> ExistingTSE- RequestingTSE, UpdatedTSE- ASM will select */}
                     <div className="basic-details"> 
                        <div className="form-wrapper">
                            <label>PC Code :</label>
                            <span>{props.logistic_response.pc_number}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Distributor Name :</label>
                            <span>{props.logistic_response.distributor_name} {props.logistic_response.distributor_code}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Current Sales Area :</label>
                            <span>{props.logistic_response.sales_org}/{props.logistic_response.previous_sales_details}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Requested Sales Area :</label>
                            <span>{props.logistic_response.sales_org}/{props.logistic_response.distribution_channel}/{props.logistic_response.division}/{props.logistic_response.plant_code}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Raised By:</label>
                            <span>{props.logistic_response.tseName}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Requested Reason: </label>
                            <span>{props.logistic_response.comments}</span>
                        </div>
                      
                    </div>
                    <div className="comment-fld">
                        <label>Reason</label>
                        <div>
                            <textarea
                                value={props.reasonInput}
                                maxLength={255}
                                onChange={e => props.setInputVal(e.target.value)}
                                placeholder="Enter reason here"
                            />
                        </div>
                    </div>
                    <div className="comment-btn">
                        <button type="button" className="sbmt-btn"
                            // disabled={!inputApprovedVal}
                            onCancel={props.hideModalAcceptAndReject} onClick={() => { props.handleUpdateRequest("REJECTED") }}  >
                            Submit
                        </button>
                    </div>
                </form> 

            </Modal>
    </div>
  )
}

export default PlantRejectModal
