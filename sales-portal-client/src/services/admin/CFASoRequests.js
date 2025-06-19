import React, { useEffect, useState, useRef } from 'react';
import { Modal, Select } from 'antd';
import { Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, FormOutlined, EyeOutlined } from '@ant-design/icons';
import _ from 'lodash';
import '../../style/admin/Dashboard.css';
import './TSEDistributorModal/TSEDistributorModal.css';
import axios from 'axios';
import { connect } from 'react-redux';
import * as Action from './actions/adminAction';

let CFASoRequests = props => {
    const stateTseRequests = {
        list: [
            { sdNo: '122200001', dBname: 'Singh Enterprises', dBcode: '100003', issue: 'Reason goes here...', creationDate: '10/10/2022, 05:10 PM', soNumber: '110524985', status: 'Open', comments: 'Comments goes here...', sdMaterial: 'HIMALAYAN_750ML_PET' },
            { sdNo: '122200002', dBname: 'BHAGWAN SAHAY GUPTA & BROS.', dBcode: '100055', issue: 'Reason goes here...', creationDate: '10/10/2022, 10:10 AM', soNumber: '110524985', status: 'Close', comments: 'Comments goes here...', sdMaterial: 'TATATEAADRAK_75G_POLY' },
            { sdNo: '122200003', dBname: 'BHARAT CONFEC & PERFUMERY', dBcode: '100056', issue: 'Reason goes here...', creationDate: '09/10/2022, 02:10 PM', soNumber: '110524985', status: 'Close', comments: 'Comments goes here...', sdMaterial: 'TSB_BURGER_PATTY_300G' },
        ],
        cfaReasonCategory: []

    }
    const { Option } = Select;
    const [cfaRequest, setCfaRequest] = useState({});
    const [isEditRequestModalVisible, setIsEditRequestModalVisible] = useState(false);
    const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
    let cfa_request = [];
    const showEditRequestModal = () => {
        setIsEditRequestModalVisible(cfaRequest);
    };
    const hideModal = () => {
        setIsEditRequestModalVisible(false);
        setIsDetailsModalVisible(false);
    };

    const showModalDetails = () => {
        setIsDetailsModalVisible(true);
    };

    const [inputApprovedVal, setInputApprovedVal] = useState('')



    var type = 'REPORT_ISSUE';

    const fetchServiceRequestCategories = async (type) => {
        stateTseRequests.list = null;
        await axios.get(`http://localhost:3004/sap/api/v1/service-request-category/${type}`)
            .then((response) => {
                setCfaRequest(response.data.data);

                stateTseRequests.cfaReasonCategory = response.data.data;

            })
            .catch((error) => {
            })
    }

    useEffect(() => {
        fetchServiceRequestCategories(type)
    }, [cfaRequest])


    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    <div className="admin-dashboard-head">
                        <h2>Service Delivery Requests</h2>
                        <div className="admin-dashboard-search">
                            <input type="text" className="search-fld"
                                placeholder="Search by distributor name, code, request type" />
                            <div><CloseCircleOutlined /></div>
                        </div>
                    </div>

                    <div className="admin-dashboard-table">
                        <table>
                            <thead>
                                <tr>
                                    <th className="width5">SD No.</th>
                                    <th className="width5">Requested Date <img src="/assets/images/sorting_icon.svg" alt=""></img></th>
                                    <th className="width15">Material</th>
                                    <th className="width10">SO No.</th>
                                    <th className="width20">DB Name</th>
                                    <th className="width20">Reason</th>
                                    <th className="width15">Comments</th>
                                    <th className="width5">Status</th>
                                    <th className='action-title width5' >Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stateTseRequests.list.map((item, index) => {
                                    return (
                                        <tr>
                                            <td>{item.sdNo}</td>
                                            <td>{item.creationDate}</td>
                                            <td>{item.sdMaterial}</td>
                                            <td>{item.soNumber}</td>
                                            <td>{item.dBname} ({item.dBcode}) </td>
                                            <td>{item.issue}</td>
                                            <td>{item.comments}</td>
                                            <td>
                                                <span
                                                    className={"badges " +
                                                        (item.status == 'Open' ? 'bg-pending' : '' ||
                                                            item.status == 'Close' ? 'bg-approved' : '')
                                                    }
                                                >{item.status}</span>
                                            </td>
                                            <td className='admin-ations'>
                                                <div className='action-btns'>
                                                    <button disabled={item.status == 'Close'}
                                                        className="info-icon" onClick={showEditRequestModal}>
                                                        <Tooltip placement="bottom"
                                                            title={item.status == 'Open' ? 'Edit' : ''} ><FormOutlined /></Tooltip>
                                                    </button>
                                                    <button className={"info-icon " +
                                                        (item.status == 'Open' ? 'hide-data' : 'show-data')
                                                    }
                                                        onClick={showModalDetails}>
                                                        <Tooltip placement="bottom"
                                                            title="View" ><EyeOutlined /></Tooltip>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )

                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* <Panigantion
                        data={tableDatas ? tableDatas : []}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        itemsCount={distributor_list && distributor_list.data && distributor_list.data.totalCount}
                        setModifiedData={onChangePage}
                    /> */}
                </div>

            </div>
            {/* edit request modal */}
            <Modal
                title="Request Response"
                visible={!!isEditRequestModalVisible}
                // reasonCategory={isEditRequestModalVisible}
                // data = {cfa_request}
                onCancel={hideModal} footer={null} wrapClassName='comment-modal' >
                {/* const {item} = props; */}


                <form>
                    <div className="comment-fld">
                        <label>Please Select Reason</label>
                        <div>

                            <Select placeholder="Select">
                                {/* <Option >inside</Option> */}
                                {cfaRequest.map((data, i) => {
                                    return (<Option key={i}>{data.label}</Option>)
                                })}
                            </Select>

                        </div>
                    </div>
                    <br />
                    <div className="comment-fld">
                        <label>Comments</label>
                        <div>
                            <textarea
                                id="comment"
                                name="comment"
                                value={inputApprovedVal}
                                onChange={e => setInputApprovedVal(e.target.value)}
                                placeholder="Enter comments here"
                            />
                        </div>
                    </div>
                    <div className="comment-btn">
                        <button type="submit" className="sbmt-btn"
                            disabled={!inputApprovedVal}
                            onCancel={hideModal} >
                            Submit
                        </button>
                    </div>
                </form>

            </Modal>

            {/* view request */}
            <Modal title="Request Response" visible={!!isDetailsModalVisible}
                onCancel={hideModal} footer={null} wrapClassName='comment-modal'>
                <div className="basic-details">
                    <div className="form-wrapper">
                        <label>Material :</label>
                        <span>TATATEAADRAK_75G_POLY </span>
                    </div>
                    <div className="form-wrapper">
                        <label>SO Number :</label>
                        <span>110524985 </span>
                    </div>
                    <div className="form-wrapper">
                        <label>Distributor Name :</label>
                        <span>Singh Enterprises (100003)</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Service Delivery Number :</label>
                        <span>122200001</span>
                    </div>
                    <div className="form-wrapper">
                        <label>CFA Reason :</label>
                        <span> Mapping is incorrect</span>
                    </div>
                    <div className="form-wrapper">
                        <label>CFA Comments :</label>
                        <span> Comments goes here..</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Response Date :</label>
                        <span> 13/10/2022, 05:10 PM</span>
                    </div>
                    <div className="form-wrapper">
                        <label>Status</label>
                        <span className="badges bg-approved">Close</span>
                    </div>
                </div>
            </Modal>

        </>
    )
}


export default CFASoRequests
