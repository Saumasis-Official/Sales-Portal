import React, { useEffect, useState } from 'react';
import { Modal, Input } from 'antd';

const RejectModal = ({
  visible,
  onCancel,
  onConfirm,
}) => {
  const [rejectComments, setRejectComments] = useState('');
  const [canSubmit, setCanSubmit] = useState(true);

  useEffect(() => {
    if (rejectComments && rejectComments.length > 0 && rejectComments.length < 10) {
      setCanSubmit(false);
    } else {
      setCanSubmit(true);
    }
  }, [rejectComments]);

  useEffect(() => {
    if (!visible) {
      setRejectComments('');
    }
  }, [visible]);
  const handleOk = () => {
    if (canSubmit) {
      onConfirm(rejectComments);
      setRejectComments('');
    }
  };

  const handleCancel = () => {
    setRejectComments('');
    onCancel();
  };

  return (
    <Modal
      title="Reject Comment"
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Reject"
      cancelText="Cancel"
      okButtonProps={{ disabled: !canSubmit }}
    >
      <div className="reject-modal-body">
        <div className="comment-fld">
          <Input.TextArea
            rows={4}
            maxLength={200}
            showCount
            placeholder="Enter comments for rejection (optional). If provided, must be at least 10 characters."            value={rejectComments}
            onChange={e => setRejectComments(e.target.value)}
          />
        </div>
        {!canSubmit && rejectComments && rejectComments.length > 0 && (
          <div className="validation-message" style={{ color: 'red', marginTop: '8px' }}>
            Comments must be at least 10 characters long.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RejectModal;