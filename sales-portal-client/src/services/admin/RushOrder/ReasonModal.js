import React, { useEffect, useState } from 'react';
import { Modal, Select, Input } from 'antd';
const { TextArea } = Input;

let ROReasonModal = (props) => {
  const {visible, onCancel, data, onSubmit} = props;
  const reasons = data?.reasons.map((reason) => { return { value: reason, label: reason } }) || [];
  
  const [selectedReason, setSelectedReason] = useState(undefined);
  const [canSubmit, setCanSubmit] = useState(false);
  const [comments, setComments] = useState(undefined);

  const reasonChangeHandler = (value) => {
    setSelectedReason(value);
  };

  const commentSubmitHandler = (event) => {
    const reasonPayload = {
        reason: selectedReason
    };
    if(comments) reasonPayload['comments'] = comments;
    setSelectedReason(undefined);
    setComments(undefined);
    onSubmit(reasonPayload);
  };

  const commentChangeHandler = (event) => {
    setComments(event.target.value);
  };

  const modalCloseHandler = () =>{
    onCancel();
  };

  useEffect(() => {
    if(!selectedReason || (selectedReason === 'Others' && (!comments || comments.length < 10))){
      setCanSubmit(false);
    }else {
      setCanSubmit(true);
    }
  }, [selectedReason, comments]);
 
  return (
    <>
      <Modal
        title='Rush Order Reason'
        visible={visible}
        onCancel={modalCloseHandler}
        footer={null}
      >
        <div className="reason-modal-body">
            <div className="ro-modal">
                <Select
                  showSearch
                  value={selectedReason}
                  style={{ width: '100%' }}
                  placeholder="Select Rush Order Reason"
                  optionFilterProp="children"
                  onChange={reasonChangeHandler}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={reasons}
                />
            </div>
            <div className="ro-modal">
                <TextArea showCount 
                    maxLength={100} 
                    value={comments}
                    onChange={commentChangeHandler} 
                    placeholder="Enter comment for this request (minimum 10 characters)."
                />
            </div>
            <div className="ro-modal-btn">
              <button disabled={!canSubmit} 
                type="submit" 
                className="sbmt-btn"
                onClick={commentSubmitHandler}
              >
                Submit
              </button>
            </div>
        </div>
      </Modal>
    </>
  );
};

export default ROReasonModal;
