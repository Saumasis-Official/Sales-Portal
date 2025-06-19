import React from 'react';
import { connect } from 'react-redux';
import { Modal } from 'antd';
import './CommentModal.css';
import Util from '../../../util/helper';

let AdminCommentModalList = (props) => {
  const { data, visible, onCancel } = props
  return (
    <>
      <Modal
        title='Comments'
        visible={visible}
        onCancel={onCancel}
        footer={null}
        wrapClassName="comment-modal comment-lists"
      >
        {
          data && Array.isArray(data) && data.length > 0 ?
            data.map((value, index) => {
              return (
                <div className='comment-item' key={value.created_on}>
                  <div className="comment-number" key={index} >
                    <p>{index + 1}</p>
                  </div>
                  <div className='comment-name'>
                    <b>Updated by:</b> {value.name} ({value.user_id})
                  </div>
                  {value.remarks &&
                    <div className='comment-info'>
                      <b>Remarks:</b> {value.remarks}
                    </div>}
                  <div className='comment-date'>
                    <b>Updated on:</b> {Util.formatDateTime(value.created_on)}
                 </div>
                </div>

              )
            })
            : 'No comments found'
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

const CommentModalList = connect(
  mapStateToProps,
  mapDispatchToProps,
)(AdminCommentModalList);

export default CommentModalList;
