import React from 'react';
import { Modal, Alert } from 'antd';
import '../CommentModal/CommentModal.css';
import PropTypes from 'prop-types';

const ForecastUploadErrorNotification = (props) => {
    const { data = {}, message, visible, handleErrorCancel } = props
    const errAreas = Object.keys(data).filter(key => data[key].status === false) || [];
    function jsonToUserFriendlyText(json) {
        const data = JSON.parse(JSON.stringify(json))
        delete data["__line__"]
        const keyNameTransformer = {
            by_allocation: "forecast",
            customer_name: "db_name",
            parent_desc: "psku",
            parent_sku: "psku_description",
            sold_to_party: "db_code",
            adjusted_forecast: "adjusted_forecast",
        }
        return Object.keys(data)?.map((key, index) => {
            const newKey = keyNameTransformer[key] ? keyNameTransformer[key] : key;
            return (
                <>
                    <b className={data[key] === '' ? "comment-red" : ""}>{newKey.replace(/_/g, ' ').toLocaleUpperCase()}</b>: {data[key]}
                    <br />
                </>
            )
        })
    }

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
                    errAreas?.map((key) => {
                        const area = key;
                        const err_data = data[key].data;
                        const err_message = data[key].message;
                        return (
                            <div key={area} >
                                <h3 style={{margin:"5px 0px"}}>{area}</h3>
                                {err_message && <Alert description={err_message} type="error"/>}
                                <ul>
                                    {err_data?.errorMessages?.map((d, index) => {
                                        return (
                                            <li className='comment-item' key={`comment-item-${area}-${index}`}>
                                                <div className="comment-number" key={index} >
                                                    <p>{index + 1}</p>
                                                </div>
                                                {d["__line__"] && <div className="comment-line-number" key={err_data["__line__"]} >
                                                    <p>Line : {d["__line__"]}</p>
                                                </div>}
                                                <div className="comment-info">
                                                    {d}
                                                    {/* {jsonToUserFriendlyText(d)} */}
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                                {err_data?.mismatchedData?.length >0  &&
                                    <>
                                        <Alert
                                            description={`There are mismatched data in ${area} sheet. Please check the sheet and try again.`}
                                            type="error" />
                                        <ul style={{margin:"10px 0px"}}>
                                            {err_data?.mismatchedData?.map((d, index) => {
                                                return (
                                                    <div className='comment-item' key={`comment-item-${index}`}>
                                                        <div className="comment-number" key={index} >
                                                            <p>{index + 1}</p>
                                                        </div>
                                                        <div className="comment-info">
                                                            {jsonToUserFriendlyText(d)}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </ul>
                                    </>
                                }
                            </div>
                        )
                    })
                }
                
            </Modal>
        </div>
    );
};

ForecastUploadErrorNotification.propTypes = {
    data: PropTypes.shape({
        errorMessages: PropTypes.array,
        mismatchedData: PropTypes.array,
    }),
    message: PropTypes.string,
    visible: PropTypes.bool,
    handleErrorCancel: PropTypes.func,
};

export default ForecastUploadErrorNotification;