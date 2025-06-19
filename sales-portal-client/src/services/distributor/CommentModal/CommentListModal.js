import React from 'react';
import { connect } from 'react-redux';
import { Modal } from 'antd';
import * as Actions from '../../admin/actions/adminAction';
import { useEffect } from 'react';
import './CommentModal.css';
import Util from '../../../util/helper';

let DistributorCommentModalList = (props) => {
  const { data, visible, onCancel, type, getMaintenanceRequests } = props
  useEffect(() => {
    getMaintenanceRequests();
  }, []);

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
              if (type == 'email') {
                if (value.alert_setting_changes.update_email) {
                  return (
                    <div className='comment-item'>
                      <div className="comment-number" key={index} >
                        <p>{index + 1}</p>
                      </div>
                      <div className='comment-name'>
                        <b>Last updated by:</b> {value.name}({value.user_id})
                      </div>
                      <div className='comment-info'>
                        <b>Remarks:</b> {value.remarks}
                      </div>
                      <div className='comment-date'>
                        <b>Last updated on:</b> {Util.formatDateTime(value.created_on)}
                      </div>
                    </div>
                  )
                }
              }
              else if (type == 'mobile') {
                if (value.alert_setting_changes.update_mobile) {
                  return (
                    <div className='comment-item'>
                      <div className="comment-number" key={index} >
                        <p>{index + 1}</p>
                      </div>
                      <div className='comment-name'>
                        <b>Last updated by:</b> {value.name}({value.user_id})
                      </div>
                      <div className='comment-info'>
                        <b>Remarks:</b> {value.remarks}
                      </div>
                      <div className='comment-date'>
                        <b>Last updated on:</b> {Util.formatDateTime(value.created_on)}
                      </div>
                    </div>
                  )
                }
              }
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
  return {
    getMaintenanceRequests: () =>
      dispatch(Actions.getMaintenanceRequests())
  };
};

const CommentModalList = connect(
  mapStateToProps,
  mapDispatchToProps,
)(DistributorCommentModalList);

export default CommentModalList;
