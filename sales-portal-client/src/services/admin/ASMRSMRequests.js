import React, { useEffect, useState, useRef } from 'react';
import { Modal, notification, Select } from 'antd';
import { Link } from 'react-router-dom';
import Auth from '../../util/middleware/auth';
import { Tooltip } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { connect } from 'react-redux';
import '../../style/admin/Dashboard.css';
import * as Action from './actions/adminAction';
import './TSEDistributorModal/TSEDistributorModal.css';
import Util from '../../../src/util/helper/index';
import Panigantion from '../../components/Panigantion';
import debounce from 'lodash.debounce';
import Loader from '../../components/Loader';
import LocalAuth from '../../util/middleware/auth';
import '../../style/admin/TSERequests.css';
import { pages, hasViewPermission } from '../../persona/requests';


let ASMRSMRequests = props => {
    const browserHistory = props.history;
    const defaultValues = {
        tseCode: 'Select TSE Code',
        tseCodes: 'Select TSE Code',
        inputApprovedVal: 'Enter comments here'
    }
    const [value, setvalue] = useState('')
    const { sso_user_details, getSSODetails, asm_requests, update_req_response, getASMRequests, updateTSERequest, tse_code_list, getTSECodeList,app_level_configuration } = props;
    const [data, setData] = useState([]);

    const [inputApprovedVal, setInputApprovedVal] = useState('')
    const [inputRejectedVal, setInputRejectedVal] = useState('')
    const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
    const [isAcceptModalVisible, setIsAcceptModalVisible] = useState(false);
    const [asmUserEmail, setASMUserEmail] = useState('');
    const [asmCode, setASMCode] = useState('');
    const [offset, setOffset] = useState(0)
    const [limit, setLimit] = useState(10)
    const status = 'PENDING'
    const [distCode, setDistCode] = useState('');
    const [requestID, setRequestID] = useState('');
    const [tseCode, setTSECode] = useState('');
    const [type, setType] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [search, setSearch] = useState('')
    const [showSearch, setShowSearch] = useState('');
    const debouncedSearch = useRef(debounce(nextValue => setSearch(nextValue), 500)).current;
    const [dataCount, setDataCount] = useState(0);
    const [tseCodes, setTseCodes] = useState([])
    const [tempTseCodes, setTempTseCodes] = useState()
    const [dbName, setDbName] = useState()
    const [tseName, setTseName] = useState()
    const [existingTse, setExistingTse] = useState({});
    const [shNumber, setshNumber] = useState('');
    const [pageNo, setPageNo] = useState(1);
    const [SDRequestsFeaturesFlag, setSDRequestsFeaturesFlag] = useState(true);
    const [tabShow, SetTabShow] = useState(true);
    const [SelectRequestType, setSelectRequestType] = useState("Sales Hierarchy Requests")



    const handleUpdateRequest = async (status) => {
        let payload = {};
        payload.distributor_code = distCode;
        payload.distributor_name = dbName;
        payload.TSE_code = tseCode;
        payload.Temp_TSE_Code = tempTseCodes;
        payload.status = status;
        payload.type = type;
        payload.comments = inputApprovedVal ? inputApprovedVal : inputRejectedVal;
        payload.updated_by = asmUserEmail;
        payload.ASMRSM_code = asmCode;
        payload.sh_number = shNumber;
        payload.existing_tse_name = existingTse.existing_tse_name;
        payload.existing_tse_code = existingTse.existing_tse_code;
        payload.existing_tse_email = existingTse.existing_tse_email;
        const updateTse = await updateTSERequest(payload, requestID);
        setvalue(updateTse)
        setInputApprovedVal('');
        setDistCode('');
        setRequestID('');
        setTSECode('');

    }

    const showModalAccept = (shNumber, tseCode, distributorCode, requestId, type, db_name, f_name, l_name, existing_tse_code, existing_tse_first_name, existing_tse_last_name, existing_tse_email) => {
        setshNumber(shNumber);
        (type === 'REMOVE') ? setTSECode('') : setTSECode(tseCode);
        setTempTseCodes(tseCode);
        setDistCode(distributorCode);
        setDbName(db_name)
        setRequestID(requestId);
        setTseName(f_name + " " + l_name)
        setType(type);
        setIsAcceptModalVisible(true);
        setExistingTse({
            existing_tse_code: existing_tse_code,
            existing_tse_name: existing_tse_first_name + " " + existing_tse_last_name,
            existing_tse_email: existing_tse_email,
        });
    };
    const hideModalAccept = () => {
        setTSECode('');
        setDistCode('');
        setRequestID('');
        setIsAcceptModalVisible(false);
        setExistingTse({});
        setInputApprovedVal('');
    };
    const showModalReject = (shNumber, tseCode, distributorCode, requestId, type, db_name, f_name, l_name, existing_tse_code, existing_tse_first_name, existing_tse_last_name, existing_tse_email) => {
        setshNumber(shNumber);
        setTempTseCodes(tseCode);
        setDistCode(distributorCode);
        setRequestID(requestId);
        setDbName(db_name);
        setType(type);
        setIsRejectModalVisible(true);
        setTseName(f_name + " " + l_name);
        setExistingTse({
            existing_tse_code: existing_tse_code,
            existing_tse_name: existing_tse_first_name + " " + existing_tse_last_name,
            existing_tse_email: existing_tse_email,
        });
    };
    const hideModalReject = () => {
        setTSECode('');
        setDistCode('');
        setRequestID('');
        setInputRejectedVal('');
        setIsRejectModalVisible(false);
    };

    useEffect(() => {
        if (Object.keys(sso_user_details)) {
            const adminAccessDetails = JSON.parse(Auth.getAdminAccessDetails());
            let email = adminAccessDetails?.username.split('_')[1];
            email && getSSODetails(email,props.history);
            email && setASMUserEmail(email);
        }
    }, [])

    useEffect(() => {
        if (sso_user_details && sso_user_details.data) {
            let code = sso_user_details.data[0].code != null ? sso_user_details.data[0].code : "";
            setASMCode(code);
            getASMRequests({ offset, limit, status, search });
            getTSECodeList();
        }
    }, [sso_user_details]);

    useEffect(() => {
        if (tse_code_list) {
            let tse = tse_code_list?.data?.rows?.map(o => o.code);
            setTseCodes(tse)
        }
    }, [tse_code_list]);

    useEffect(() => {
        if (value) {
            if (value.success == true) {
                hideModalAccept();
                hideModalReject();
                notification.success({
                    message: 'Success',
                    description: value.message,
                    duration: 3,
                    className: 'notification-green',
                });
                getASMRequests({ offset, limit, status, search });
            }
            else if (value.success == false) {
                hideModalAccept();
                hideModalReject();
                notification.error({
                    message: 'Error',
                    description: value.message,
                    duration: 5,
                    className: 'notification-error',
                })
            }
        }
    }, [value])

    useEffect(() => {
        if (asm_requests && asm_requests.rows) {
            setData(asm_requests?.rows);
            setDataCount(asm_requests?.totalCount);
        }
    }, [asm_requests])

    useEffect(() => {
        getASMRequests({ offset, limit, status, search });
        setDataCount(asm_requests?.totalCount);
    }, [search, limit, offset]);

    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
          for (let config of app_level_configuration) {
            if (config.key=="ENABLE_SERVICE_DELIVERY_REQUESTS"){
                config.value=="YES"?setSDRequestsFeaturesFlag(false):setSDRequestsFeaturesFlag(true);
                break;
            } 
          }
        }
      }, [app_level_configuration]);

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage)
        setOffset((page - 1) * limit)
        setPageNo(page)
    }

    const onSearch = (e) => {
        let { value } = e.target;
        setShowSearch(value);
        if (value.includes('Distributor is not showing')) {
            value = 'ADD';
        }
        else if (value.includes('Distributor does not belongs to TSE')) {
            value = 'REMOVE';
        }
        else { }
        debouncedSearch(value);
        setOffset(0);
        setPageNo(1)
    }

    const resetPage = () => {
        debouncedSearch('');
        setShowSearch('')
        setOffset(0);
    }

    const tabFunction=(value)=>{
        if(value =='Plant Update Requests'){
          browserHistory.push({ pathname: "/admin/tse-requests", state: { tabState:"Plant Update Requests" } })
        }else if(value==='Service Delivery Requests'){
          browserHistory.push({ pathname: "/admin/cfa-so-requests", state: { tabState:"Plant Update Requests" } });
        }else if(value==='Pdp Update Requests'){
            browserHistory.push({ pathname: "/admin/pdp-update", state: { tabState:"Pdp Update Requests" } });
        }else if(value==='Rush Order Requests'){
            browserHistory.push({ pathname: "/admin/rush-order-requests", state: { tabState: "Rush Order Requests" } });
        }else if(value === 'PDP Unlock Requests'){
            browserHistory.push({ pathname: "/admin/pdp-unlock-requests", state: { tabState: "PDP Unlock Requests" } });
        }
    }
    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    <div className="admin-dashboard-head">
                        <h2>Sales Hierarchy Requests</h2>
                        <div className="admin-dashboard-search">
                            <input type="text" className="search-fld"
                                placeholder="Search by SH code, DB name, DB code, request type, TSE code, TSE name"
                                value={showSearch} onChange={(e) => { onSearch(e) }} />
                            <div onClick={resetPage}><CloseCircleOutlined /></div>
                        </div>
                    </div>
                    <div className='req-tabs'>
                        <button id="salesHierarchy" className={`tablink active`} onClick={() => { tabFunction('Sales Hierarchy Requests') }}>Sales Hierarchy</button>
                        {hasViewPermission(pages.PDP_REQUESTS) && <button id="pdpUpdate" className={`tablink `} onClick={() => { tabFunction('Pdp Update Requests') }}>PDP Update</button>}
                        {hasViewPermission(pages.PDP_UNLOCK) && <button id="pdpUnlock" className={`tablink`} onClick={() => { tabFunction('PDP Unlock Requests') }}>PDP Unlock</button>}
                        {hasViewPermission(pages.PLANT_REQUEST) && <button id="plantUpdate" className={`tablink `} onClick={() => { tabFunction('Plant Update Requests') }}>Plant Update</button>}
                        {!SDRequestsFeaturesFlag ? <button id="ServiceDelivery" className={`tablink `} onClick={() => { tabFunction('Service Delivery Requests') }}>Service Delivery</button> : ""}
                        {hasViewPermission(pages.RO_REQUESTS) && <button id="rushOrder" className={`tablink`} onClick={() => { tabFunction('Rush Order Requests') }}>Rush Order</button>}
                    </div>
                    <div className="admin-dashboard-table">
                        <Loader>
                            <table>
                                <thead>
                                    <tr>
                                        <th className="width10">SH Code</th>
                                        <th className="width5">TSE Name</th>
                                        <th className="width5">TSE Code</th>
                                        <th className="width15">DB Name</th>
                                        <th className="width5">DB Code</th>
                                        <th className="width10">Request Type</th>
                                        <th className="width5">Requested Date</th>
                                        <th className='action-title width5'>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data && data.map((item, index) => {
                                        return (
                                            <tr key={index}>
                                                <td>{item.sh_number}</td>
                                                <td>{`${item.tse_fname} ${item.tse_lname}`}</td>
                                                <td>{item.tse_code}</td>
                                                <td>{item.db_name}</td>
                                                <td>{item.distributor_code}</td>
                                                <td>{item.type === "ADD" ? "Distributor is not showing" : item.type === "REMOVE" ? "Distributor does not belongs to TSE" : ""}</td>
                                                <td>{item.created_on
                                                    ? <>{Util.formatDate(item.created_on)}, {Util.formatTime(item.created_on)}</>
                                                    : '-'}</td>
                                                <td className='admin-ations'>
                                                    <div className='action-btns'>
                                                        <i className='info-icon'>
                                                            <Tooltip placement="bottom" title="Approve" onClick={() => { showModalAccept(item.sh_number, item.tse_code, item.distributor_code, item.id, item.type, item.db_name, item.tse_fname, item.tse_lname, item.existing_tse_code, item.existing_tse_first_name, item.existing_tse_last_name, item.existing_tse_email) }}><CheckCircleOutlined /></Tooltip></i>
                                                        <i className='info-icon'>
                                                            <Tooltip placement="bottom" title="Reject" onClick={() => { showModalReject(item.sh_number, item.tse_code, item.distributor_code, item.id, item.type, item.db_name, item.tse_fname, item.tse_lname, item.existing_tse_code, item.existing_tse_first_name, item.existing_tse_last_name, item.existing_tse_email) }}><CloseCircleOutlined /></Tooltip></i>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {data.length === 0 &&
                                        <tr style={{ textAlign: 'center' }}>
                                            <td colSpan="10">No request available</td>
                                        </tr>}
                                </tbody>
                            </table>
                            </Loader>
                        </div>
                        <Panigantion
                            data={data ? data : []}
                            itemsPerPage={itemsPerPage}
                            setItemsPerPage={setItemsPerPage}
                            itemsCount={data && dataCount}
                            setModifiedData={onChangePage}
                            pageNo={pageNo}
                        />
                </div>
            </div>
            {/* accept modal */}
            <Modal title="Assign New TSE " visible={!!isAcceptModalVisible}
                onCancel={hideModalAccept} footer={null} wrapClassName='comment-modal'>
                <form>
                    {/* incase of ADD(Distributor not showing) -> ExistingTSE- DB's existing TSE, UpdatedTSE- Requesting TSE
                                  REMOVE(DB does not belongs to TSE)-> ExistingTSE- RequestingTSE, UpdatedTSE- ASM will select */}
                    <div className="basic-details">
                        <div className="form-wrapper">
                            <label>SH Code :</label>
                            <span>{shNumber}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Distributor Name :</label>
                            <span>{dbName} ({distCode})</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Existing TSE :</label>
                            <span>{existingTse.existing_tse_name} ({existingTse.existing_tse_code})</span>
                        </div>
                        {type === 'ADD' &&
                            <div className="form-wrapper">
                                <label>Updated TSE :</label>
                                <span>{tseName} ({tempTseCodes})</span>
                            </div>
                        }
                    </div>
                    <div className="comment-fld">
                        {type === 'REMOVE' &&
                            <>
                                <label>Updated TSE :</label>
                                <Select
                                    showSearch
                                    optionFilterProp="children"
                                    value={tseCode}
                                    options={tseCodes?.filter((item) => { return item !== existingTse.existing_tse_code }).map(o => { return { value: o, label: o } })}
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').includes(input.toUpperCase())
                                    }
                                    onChange={e => setTSECode(e)} />
                            </>
                        }
                        <label>Reason</label>
                        <div>
                            <textarea
                                value={inputApprovedVal}
                                maxLength={255}
                                onChange={e => setInputApprovedVal(e.target.value)}
                                placeholder="Enter reason here"
                            />
                        </div>
                    </div>
                    <div className="comment-btn">
                        <button type="button" className="sbmt-btn"
                            disabled={!inputApprovedVal}
                            onCancel={hideModalAccept} onClick={() => { handleUpdateRequest("APPROVED") }}  >
                            Submit
                        </button>
                    </div>
                </form>

            </Modal>
            {/* reject modal */}
            <Modal title="Reject Request " visible={!!isRejectModalVisible}
                onCancel={hideModalReject} footer={null} wrapClassName='comment-modal'>
                <form>
                    <div className="basic-details">
                        <div className="form-wrapper">
                            <label>SH Code :</label>
                            <span>{shNumber}</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Distributor Name :</label>
                            <span>{dbName} ({distCode})</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Existing TSE :</label>
                            <span>{existingTse.existing_tse_name} ({existingTse.existing_tse_code})</span>
                        </div>
                        <div className="form-wrapper">
                            <label>Requesting TSE :</label>
                            <span>{tseName} ({tempTseCodes})</span>
                        </div>
                    </div>
                    <div className="comment-fld">
                        <label>Rejection Reason</label>
                        <div>
                            <textarea
                                id="comment"
                                name="comment"
                                value={inputRejectedVal}
                                onChange={e => setInputRejectedVal(e.target.value)}
                                placeholder="Enter reason here"
                            />
                        </div>
                    </div>
                    <div className="comment-btn">
                        <button type="button" className="sbmt-btn"
                            disabled={!inputRejectedVal}
                            onCancel={hideModalReject} onClick={() => { handleUpdateRequest("REJECTED") }}>
                            Submit
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    )
}

const mapStateToProps = (state) => {
    return {
        asm_requests: state.admin.get('asm_requests'),
        sso_user_details: state.admin.get('sso_user_details'),
        update_req_response: state.admin.get('update_req_response'),
        tse_code_list: state.admin.get('tse_code_list'),
        app_level_configuration: state.auth.get('app_level_configuration')
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        getASMRequests: ({ offset, limit, status, search }) => dispatch(Action.getASMRequests({ offset, limit, status, search })),
        updateTSERequest: (payload, requestID) => dispatch(Action.updateTSERequest(payload, requestID)),
        getSSODetails: (email,history) => dispatch(Action.getSSODetails(email,history)),
        getTSECodeList: () => dispatch(Action.getTSEList())
    };
};

const ConnectASMRequests = connect(
    mapStateToProps,
    mapDispatchToProps,
)(ASMRSMRequests);

export default ConnectASMRequests;