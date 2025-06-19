import React from 'react';
import { Modal, Alert } from 'antd';
import '../CommentModal/CommentModal.css';
import PropTypes from 'prop-types';

const StockNormUploadErrorNotification = (props) => {
    const { data, message, visible, handleErrorCancel } = props

    return (
        <div>
            <Modal
                title="Error Notification"
                visible={visible}
                onCancel={handleErrorCancel}
                footer={null}
                wrapClassName='comment-modal comment-lists'
                width={700} // Customize the width as needed
            >
                {
                    Object.keys(data).map((sheet) => {
                        const sheetData = data[sheet];
                        return (
                            <div key={sheet} >
                                <h3 style={{ margin: "5px 0px" }}>{sheet}</h3>
                                {sheetData?.message && <Alert description={sheetData?.message} type="error" />}
                                <ul>
                                    {sheetData?.data?.errorMessages?.map((d, index) => {
                                        return (
                                            <div className='comment-item' key={`comment-item-${sheet}-${index}`}>
                                                <div className="comment-number" key={index} >
                                                    <p>{index + 1}</p>
                                                </div>
                                                {d["__line__"] && <div className="comment-line-number" key={data["__line__"]} >
                                                    <p>Row : {d["__line__"]}</p>
                                                </div>}
                                                <div className="comment-info">
                                                    {d.message}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </ul>
                            </div>
                        )
                    })
                }
            </Modal>
        </div>
    );
};

StockNormUploadErrorNotification.propTypes = {
    data: PropTypes.shape({
        errorMessages: PropTypes.array
    }),
    message: PropTypes.string,
    visible: PropTypes.bool,
    handleErrorCancel: PropTypes.func,
};

export default StockNormUploadErrorNotification;