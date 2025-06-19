import React from 'react';
import { connect } from 'react-redux';
import { Modal } from 'antd';
import DbMoqCss from './DistributorMoqModal.module.css';
let DistributorMoqModal = (props) => {
    const { data, visible, onCancel } = props
    return (
        <>
            <Modal
                title='MOQ Details'
                visible={visible}
                onCancel={onCancel}
                footer={null}
                wrapClassName="comment-modal comment-lists"
            >
                {
                    data && Array.isArray(data) && data.length > 0 ?
                        data.filter(o => o !== null).map((value, index) => {
                            let value_arr = value.plant_moq.split('^');
                            return (
                                <div className='comment-item'>
                                    <div className="comment-number" key={index} >
                                        <p>{index + 1}</p>
                                    </div>
                                    <div className='comment-name'>
                                        <b>Distribution Channel:</b> {value_arr[0]}
                                    </div>
                                    <div className='comment-name'>
                                        <b>Plant Code:</b> {value_arr[1]}
                                    </div>
                                    <div className='comment-name'>
                                        <b>Plant Name:</b> {value_arr[2]}
                                    </div>
                                    <div className='comment-name'>
                                        <b>Plant Location:</b> {value_arr[3]}
                                    </div>
                                    <div className='comment-name'>
                                        <b>Division (s):</b> {value_arr[5]}
                                    </div>
                                    <div className='comment-name'>
                                        <b>MOQ (in tonnes):</b> {value_arr[4]}
                                    </div>
                                </div>

                            )
                        })
                        : 'No MOQ details found'
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

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(DistributorMoqModal);
