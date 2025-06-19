import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Modal, notification } from 'antd';
import './CommentModal.css';

let AdminCommentModal = (props) => {

  const [showButton, setShowButton] = useState(false)
  // fn to display error notification using antd library
  const errorHandler = (message, description) => {
    setTimeout(() => {
      notification.error({
        message,
        description,
        duration: 2,
        className: 'notification-error',
      });
    }, 150);
  };

  const [commentValue, setCommentValue] = useState('');

  const commentSubmitHandler = (event) => {
    event.preventDefault();
    if (commentValue.trim().length === 0 || commentValue === null) {
      notification.error({
        message: 'Error',
        description: 'Please enter comment to save the changes',
        duration: 2,
        className: 'notification-error',
      });
    } else if (commentValue.trim().length > 255) {
      notification.error({
        message: 'Error',
        description: 'Comment should not be more than 255 characters',
        duration: 2,
        className: 'notification-error',
      });

    } else {      
      props.onCancel();
      setCommentValue('');      
      props.onUpdateDataMassEdit(commentValue);
      props.setIsEditMode(false);
      props.setChecked(false);
      props.setEnablePdpCheckbox(false);
      props.setIsEditingPdp(false);
      props.setEdit(false);
    }
  };

  const onCancel = () => {    
    setCommentValue("");    
    props.onCancel()    
  }
      

  const commentChangeHandler = (event) => {
    const { value } = event.target
    setCommentValue(value);
    if (value.length > 9) {
      setShowButton(value)
    } else {
      setShowButton(false)
    }
  };


  return (
    <>
      <Modal
        title='Comments'
        visible={props.visible}
        onCancel={onCancel}
        footer={null}
        wrapClassName="comment-modal"
      >
        {
          <form onSubmit={commentSubmitHandler}>
            <div className="comment-fld">
              <textarea
                value={commentValue}
                onChange={commentChangeHandler}
                placeholder="Enter comment for this distributor(minimum 10 characters)"
              />
            </div>
            <div className="comment-btn">
              <button disabled={!showButton} type="submit" className="sbmt-btn">
                Submit
              </button>
            </div>
          </form>
        }
      </Modal>
    </>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {};
};
const mapDispatchToProps = (dispatch, ownProps) => {
  return {};
};

const CommentModal = connect(
  mapStateToProps,
  mapDispatchToProps,
)(AdminCommentModal);

export default CommentModal;
