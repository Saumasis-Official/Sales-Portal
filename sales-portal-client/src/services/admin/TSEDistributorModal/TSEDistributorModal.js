import React, {  useState } from 'react';
import { Modal,  Select } from 'antd';
import { Link } from 'react-router-dom';
import LocalAuth from '../../../util/middleware/auth';

import './TSEDistributorModal.css';
import { hasRaisePermission, pages } from '../../../persona/requests';


let TSEDistributorContactModal = (props) => {
    const { Option } = Select;
    const { createRequest, dbcode, tseCode } = props;
    const [addDbOptions, setAddDbOptions] = useState([]);
    const [optionsList, setOptionsList] = useState([]);
    const defaultStates = {
        comments: '',
        distCode: '',
        type: '',
    }
    const setDefaultStates = () => {
        setComments(defaultStates.comments);
        setDistCode(defaultStates.distCode);
        setType(defaultStates.type);
    }

    const [comments, setComments] = useState('');
    const [distCode, setDistCode] = useState('');
    const [type, setType] = useState('');
    var adminRole = LocalAuth.getAdminRole();

    const handleChange = (e) => {
        if (e.target.name == 'comment') setComments(e.target.value);
    };

    const handleCreateRequest = () => {
        createRequest(comments, distCode + '', type);
        setDefaultStates();
    }

    const onSearch = (value) => {
    };

    const handleCancel = () => {
        setDefaultStates();
        props.onCancel();
    }
    const handle = (e) => {
        setType(e)
        setDistCode('');
        if (e === 'ADD' && tseCode !== null && tseCode !== "" && tseCode !== undefined && adminRole.includes('TSE')) {
            const tseCodeArr = tseCode?.split(',');
            let filteredOptions = dbcode?.filter((item) => { return !tseCodeArr.includes(item.tse_code) })?.map((i) => {
                return { label: i.profile_id, value: i.profile_id }
            })
            setOptionsList([...filteredOptions]);
        }
        else if (e === 'REMOVE' && tseCode !== null && tseCode !== "" && tseCode !== undefined && adminRole.includes('TSE')) {
            const tseCodeArr = tseCode?.split(',');
            let filteredOptions = dbcode?.filter((item) => { return tseCodeArr.includes(item.tse_code) })?.map((i) => {
                return { label: i.profile_id, value: i.profile_id }
            })
            setOptionsList([...filteredOptions]);
        }
        else {
            let filteredOptions = dbcode?.map((i) => {
                return { label: i.profile_id, value: i.profile_id };
            })
            setOptionsList([...filteredOptions]);
        }

    }

    return (
        <>
            <Modal title="New Sales Hierarchy Mapping Request" visible={props.visible} onCancel={handleCancel} footer={null} wrapClassName='comment-modal'>
                <form>
                    <div className="comment-fld">
                        <label>Request Type</label>
                        <Select onChange={e => { handle(e) }} placeholder="Select" name='reason'
                            value={type}>
                            <Option value="REMOVE">Distributor does not belongs to TSE</Option>
                            <Option value="ADD">Distributor is not showing</Option>
                        </Select>
                    </div>
                    <br />
                    <div className="comment-fld">
                        <label>Distributor Code</label>
                        <div>
                            <Select
                                name="dist_code"
                                showSearch
                                placeholder="Distributor Code"
                                optionFilterProp="children"
                                onChange={(value) => setDistCode(value)}
                                value={distCode}
                                options={optionsList}
                                filterOption={(input, option) => (option?.label ?? '').includes(input)}
                                disabled={type === defaultStates.type ? true : false}
                            />
                        </div>
                    </div>
                    <br />
                    <div className="comment-fld">
                        <label>Reason</label>
                        <div>
                            <textarea
                                id="comment" value={comments} onChange={e => handleChange(e)}
                                name="comment"
                                placeholder="Enter comment"
                                disabled={type === defaultStates.type ? true : false}
                            />
                        </div>
                    </div>
                    <div className="comment-btn">
                        <button type="button" className="sbmt-btn" disabled={!hasRaisePermission(pages.SHR) || !comments || !type || !distCode || distCode.length > 8 || distCode.length < 4} onClick={() => { handleCreateRequest() }}>
                            Submit
                        </button>

                    </div>
                </form>

            </Modal>
        </>
    )
}

export default TSEDistributorContactModal;
