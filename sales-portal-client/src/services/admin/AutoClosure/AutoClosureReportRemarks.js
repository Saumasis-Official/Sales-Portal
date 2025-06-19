import React from 'react';
import { Modal } from 'antd';
const AutoClosureReportRemarksModal = (props) => {
    const { data, visible, onCancel } = props;
    return (
        <>
            <Modal title="SAP Remarks" visible={visible} onCancel={onCancel} footer={null} wrapClassName="comment-modal comment-lists">
                {data?.length
                    ? data?.split(';')?.map((value, index) => {
                          return (
                              <div className="comment-item" key={index}>
                                  <div className="comment-number">
                                      <p>{index + 1}</p>
                                  </div>
                                  <div className="comment-name">{value}</div>
                              </div>
                          );
                      })
                    : 'No details found'}
            </Modal>
        </>
    );
};

export default AutoClosureReportRemarksModal;
