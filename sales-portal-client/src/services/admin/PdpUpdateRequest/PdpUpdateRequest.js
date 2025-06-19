import React, { useEffect, useState, useRef } from 'react';
import { Select, notification, Tooltip } from 'antd';
import { CloseCircleOutlined, FormOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import debounce from 'lodash.debounce';
import '../../../style/admin/Dashboard.css';
import { connect } from 'react-redux';
import * as AdminAction from '../actions/adminAction';
import LocalAuth from '../../../util/middleware/auth';
import Util from '../../../util/helper/index';
import Panigantion from '../../../components/Panigantion';
import Loader from '../../../components/Loader';
import './PdpUpdateRequest.css'
import PdpListToExcel from './PdpListToExcel';
import PdpUpdateViewModal from './PdpViewModal';
import PdpRequestModal from './PdpRequestModal';
import PdpResponseModal from './PdpResponseModal';
import { pages, hasRespondPermission, hasViewPermission, features } from '../../../persona/requests.js';


let PdpUpdateRequest = props => {
    const browserHistory = props.history;
    const {
        getDistributorList,
        getCustomerGroupDetails,
        getPdpRequestList,
        pdpRequestResponse,
        savePdpUpdateRequest,
    } = props


    const [pdpReqList, setPdpReqList] = useState([])
    const [pdpReqListCount, setPdpReqListCount] = useState(0)
    const [offset, setOffset] = useState(0)
    const [limit, setLimit] = useState(10)
    const [search, setSearch] = useState('')
    const [pageNo, setPageNo] = useState(1)
    const [selectedStatus, setSelectedStatus] = useState('ALL')
    const [showSearch, setShowSearch] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isPdpViewModalVisible, setIsPdpViewModalVisible] = useState(false);
    const [exportedList, setExportedList] = useState([]);
    const [viewModalData, setViewModalData] = useState();
    const [isPdpRequestModalVisible, setIsPdpRequestModalVisible] = useState(false);
    const [dbList, setDbList] = useState([]);
    const [isPdpResponseModalVisible, setIsPdpResponseModalVisible] = useState(false);
    const [responseModalData, setResponseModalData] = useState();
    const [responseType, setResponseType] = useState();
    const [fetchPdpList, setFetchPdpList] = useState(0);

    var adminRole = LocalAuth.getAdminRole();

    const debouncedSearch = useRef(debounce(nextValue => setSearch(nextValue), 500)).current;

    const pdpStatus = [{ label: 'ALL', value: 'ALL' }, { label: 'PENDING', value: 'PENDING' }, { label: 'APPROVED', value: 'APPROVED' }, { label: 'REJECTED', value: 'REJECTED' }];

    useEffect(async () => {

        let pdpList = await getPdpRequestList({ offset, limit, search, status: selectedStatus });
        if (pdpList?.success) {
            setPdpReqList(pdpList.data.rows.map(o => {
                o.ref_date_current = (o.ref_date_current === '00000000') ? "-" : o.ref_date_current.substring(6) + '/' + o.ref_date_current.substring(4, 6) + '/' + o.ref_date_current.substring(0, 4);
                o.ref_date_requested = (o.ref_date_requested === '00000000') ? "-" : o.ref_date_requested.substring(6) + '/' + o.ref_date_requested.substring(4, 6) + '/' + o.ref_date_requested.substring(0, 4);
                return o;
            }));
            setPdpReqListCount(pdpList.data.totalCount);
        }

    }, [search, limit, offset, selectedStatus, fetchPdpList]);

    useEffect(() => {
        async function getCustomerGroupList() {
            let cgDetails = await getCustomerGroupDetails();
            let dbs = await getDistributorList();
            let filteredCgs = cgDetails?.data?.filter(o => o.pdp_update_enabled).map(o => o.name);

            let filteredDbs = (adminRole.includes('TSE')) ? dbs?.rows?.filter(o => dbs?.userCode.includes(o.tse_code)) : dbs?.rows;
            filteredDbs = filteredDbs?.filter(o => o.customer_group === filteredCgs?.find((e) => e === o.customer_group))
            setDbList(filteredDbs);
        }
        getCustomerGroupList();
    }, [])

    const onSearch = (e) => {
        const { value } = e.target;
        debouncedSearch(value);
        setShowSearch(value);
        setOffset(0);
        setPageNo(1)
    }

    const resetPage = () => {
        debouncedSearch('');
        setShowSearch('')
        setOffset(0);
    }

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage)
        setOffset((page - 1) * limit)
        setPageNo(page)
    }

    const newPdpRequest = async () => {
        setIsPdpRequestModalVisible(true);
    };

    const hidePdpRequestModal = () => {
        setIsPdpRequestModalVisible(false);
    }


    const showViewModal = (item) => {
        setViewModalData(item);
        setIsPdpViewModalVisible(true);

    };


    const statusChangeHandler = (value) => {
        setSelectedStatus(value);
        setLimit(itemsPerPage);
        setOffset(0);
        setPageNo(1);
        setSearch("");
        setShowSearch("");
    }
    const tabFunction = (value) => {
        if (value === 'Sales Hierarchy Requests') {
            if (hasRespondPermission(pages.SHR)) {
                browserHistory.push({ pathname: "/admin/pending-requests", state: { tabState: "Sales Hierarchy Requests" } });
            } else {
                browserHistory.push({ pathname: "/admin/tse-requests", state: { tabState: "Sales Hierarchy Requests" } });
            }
        }else if (value === 'Service Delivery Requests') {
            browserHistory.push({ pathname: "/admin/cfa-so-requests", state: { tabState: "Service Delivery Requests" } });
        }else if (value === 'Pdp Update Requests') {
            browserHistory.push({ pathname: "/admin/pdp-update", state: { tabState: "Pdp Update Requests" } });
        }else if (value === 'Plant Update Requests'){
            browserHistory.push({ pathname: "/admin/tse-requests", state: { tabState: "Plant Update Requests" } });
        }else if(value==='Rush Order Requests'){
            browserHistory.push({ pathname: "/admin/rush-order-requests", state: { tabState: "Rush Order Requests" } });
        }else if(value === 'PDP Unlock Requests'){
            browserHistory.push({ pathname: "/admin/pdp-unlock-requests", state: { tabState: "PDP Unlock Requests" } });
        }
        setShowSearch('');
        debouncedSearch('');
        setSelectedStatus('ALL');
    }

    const selectAll = (e) => {
        if (e.target.checked) {
            setExportedList([...pdpReqList]);
        } else {
            setExportedList([]);
        }
    };
    const checkExisting = (item) => {
        let itemExist = false;
        let filteredArr = exportedList.filter(i => i.pdp_update_req_no === item.pdp_update_req_no);
        if (filteredArr.length > 0) {
            itemExist = true;
        }
        return itemExist;
    };
    const exportExcelHandler = (e, item) => {
        if (e.target.checked) {
            setExportedList(exportedList.concat(item))
        } else {
            setExportedList(exportedList.filter((exportItem) => exportItem.pdp_update_req_no !== item.pdp_update_req_no))
        }
    };
    const onCheckReset = () => {
        setExportedList([]);
    };

    const hidePdpViewModal = () => {
        setIsPdpViewModalVisible(false);
        setViewModalData(null);
    }

    const showResponseModal = (item, status) => {
        setIsPdpResponseModalVisible(true);
        setResponseModalData(item);
        setResponseType(status);
    }

    const hidePdpResponseModal = () => {
        setIsPdpRequestModalVisible(false);
        setResponseModalData(null);
        setResponseType(null);
    }

    const submitPdpResponse = async (data) => {
        try {
            let responsePayload = {
                "pdpNo": data.pdp_update_req_no,
                "dbCode": data.distributor_code,
                "dbName": data.distributor_name,
                "sales_org": data.sales_org,
                "division": data.division,
                "distribution_channel": data.dist_channel,
                "plant_code": data.plant_code,
                "status": data.status,
                "pdp_old": data.pdp_current,
                "pdp_new": data.pdp_requested,
                "ref_date_old": data.ref_date_current === '-' ? '00000000' : data.ref_date_current.substring(6) + data.ref_date_current.substring(3, 5) + data.ref_date_current.substring(0, 2),
                "ref_date_new": data.ref_date_requested === '-' ? '00000000' : data.ref_date_requested.substring(6) + data.ref_date_requested.substring(3, 5) + data.ref_date_requested.substring(0, 2),
                "response": data.response,
                "created_by": data.created_by.substring(data.created_by.indexOf('-') + 1).trim()
            };
            let updateForecastDistributionPayload = {
                distributor_code: data.distributor_code,
                division: data.division,
                updated_pdp: data.pdp_requested,
                type: "PDP_UPDATE",
            }
            let response = await pdpRequestResponse(responsePayload);
            if (response.success) {
                if (data.status === 'APPROVED')
                notificationSender(true, 'Success', `Response to Pdp Update Request No: ${data.pdp_update_req_no} saved and notified successfully.`);
                setFetchPdpList(prev => prev + 1);
            } else {
                notificationSender(false, 'Failure', `Couldn't save response to Pdp Update Request No: ${data.pdp_update_req_no} .`);
            }
            hidePdpResponseModal();
        } catch (error) {
            hidePdpResponseModal();
            notificationSender(false, 'Failure', `Couldn't save response to Pdp Update Request No: ${data.pdp_update_req_no} .`);
        }
    }

    const sendPdpUpdateRequest = async (data) => {
        let response = await savePdpUpdateRequest(data);
        if (response?.success) {
            notificationSender(true, 'PDP Update Request Success', 'PDP Update Request saved and notified successfully.');
            setFetchPdpList(prev => prev + 1);
        }
        else {
            notificationSender(false, 'PDP Update Request Success', "Couldn't save PDP update request, try again later");
        }

    }

    const notificationSender = (success, message, description) => {
        if (success) {
            notification.success({
                message: message,
                description: description,
                duration: 3,
                className: 'notification-green',
            });
        } else {
            notification.error({
                message: message,
                description: description,
                duration: 3,
                className: 'notification-error',
            })
        }
    }

    return (
        <>
            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    <div className="sdr-dashboard-head">
                        <h2>PDP Update Requests</h2>
                        {/*   <div className='heading'>Service Delivery Requests</div> */}
                        <div className='header-btns-filters'>
                            <div className="sdr-dashboard-search">
                                <input type="text" className="search-fld"
                                    placeholder="Search by- PDP Req. No./ DB Name/ DB Code/ Plant code"
                                    value={showSearch} onChange={(e) => { onSearch(e) }} />
                                <div onClick={resetPage} className="search-close"><CloseCircleOutlined /></div>
                            </div>
                            <div className='sdr-status-filter'>
                                <Select
                                    showSearch
                                    style={{ fontSize: '13px' }}
                                    className='width120px'
                                    placeholder="Select pdp update request status"
                                    defaultValue={'ALL'}
                                    optionFilterProp="children"
                                    onChange={statusChangeHandler}
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={pdpStatus}
                                />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex' }}>
                        <div className="req-tabs">
                            {hasViewPermission(pages.SHR) &&
                                <button id="salesHierarchy" className={`tablink`} onClick={() => { tabFunction('Sales Hierarchy Requests') }}>Sales Hierarchy</button>
                            }
                            <button id="pdpUpdate" className={`tablink active`} >PDP Update</button>
                            {hasViewPermission(pages.PDP_UNLOCK) && <button id="pdpUnlock" className={`tablink`} onClick={() => { tabFunction('PDP Unlock Requests') }}>PDP Unlock</button>}
                            {hasViewPermission(pages.PLANT_REQUEST) && <button id="plantUpdate" className={`tablink`} onClick={() => { tabFunction('Plant Update Requests') }}>Plant Update</button>}
                            {!hasViewPermission(pages.SDR, features.ONLY_SDR_VIEW) && <button id="ServiceDelivery" className={`tablink`} onClick={() => { tabFunction('Service Delivery Requests') }}>Service Delivery</button>}
                            {hasViewPermission(pages.RO_REQUESTS) && <button id="rushOrder" className={`tablink`} onClick={() => { tabFunction('Rush Order Requests') }}>Rush Order</button>}
                        </div>
                        {/* <div className='tabs'> */}
                        <div className='header-block-right'>
                            <div className='hbr-item1'>
                                <div className='dot-pending'></div> <div style={{ marginRight: '4px' }}>Pending</div>
                                <div className='dot-approved'></div> <div style={{ marginRight: '4px' }}>Approved</div>
                                <div className='dot-rejected'></div> <div style={{ marginRight: '4px' }}>Rejected</div>
                            </div>

                            {hasViewPermission(pages.PDP_REQUESTS, features.VIEW_RAISE) &&
                                <div className='hbr-item2'>
                                    <button
                                        type="submit" onClick={newPdpRequest}
                                        className="add-btn">
                                        PDP Update Request <img src="/assets/images/plus-icon.svg" alt="" />
                                    </button>
                                </div>}
                        </div>
                    </div>
                    {/* </div> */}


                    <div className="admin-dashboard-table">
                        <Loader>
                            <table>
                                <thead>
                                    <tr>

                                        {
                                            pdpReqList && pdpReqList.length > 0 && <th className='width3'>
                                                <input id={'checkbox-header'} onChange={(e) => { selectAll(e) }} type="checkbox" /> </th>
                                        }

                                        <th className='width12'>PDP Req No.</th>
                                        <th className="width8" style={{ textAlign: "center" }}>Request Date</th>
                                        <th className="width20" style={{ textAlign: "center" }}>Distributor Name</th>
                                        <th className="width5">Plant Code</th>
                                        <th className="width5">Requested PDP</th>
                                        <th className="width8" style={{ textAlign: "center" }}>Response Date</th>
                                        <th className='width3' style={{ textAlign: "center" }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pdpReqList.map((item, index) => {
                                        const itemExisting = checkExisting(item);
                                        return (
                                            <>
                                                <tr key={index} style={{ backgroundColor: item.status === 'PENDING' ? 'rgb(242, 216, 168)' : item.status === 'APPROVED' ? '#adefc0' : 'rgb(225 95 95 / 63%)' }}>
                                                    {pdpReqList && pdpReqList.length > 0 && <td className='width3'>
                                                        <label htmlFor={index}>
                                                            <input id={index} type="checkbox" checked={itemExisting} onChange={(event) => exportExcelHandler(event, item)} />
                                                            <span className="checkmark-box"></span>
                                                        </label>
                                                    </td>}
                                                    <td className='width12'>{item.pdp_update_req_no}</td>
                                                    <td className="width8" style={{ textAlign: "center" }}>{Util.formatDate(item.created_on)}, {Util.formatTime(item.created_on)}</td>
                                                    <td className="width18" style={{ textAlign: "center" }}>{item.distributor_name} ({item.distributor_code})</td>
                                                    <td style={{ textAlign: "center" }}>{item.plant_code}</td>
                                                    <td className="width5" style={{ textAlign: "center" }}>{item.pdp_requested}</td>
                                                    <td style={{ textAlign: "center" }}>{item.update_on ? <>{Util.formatDate(item.update_on)},{Util.formatTime(item.update_on)}</> : '-'}</td>
                                                    {!hasRespondPermission(pages.PDP_REQUESTS) ?
                                                        <td className='admin-ations'>
                                                            <div className='action-btns'>
                                                                <i className='info-icon' onClick={() => showViewModal(item)}>
                                                                    <Tooltip placement="bottom" title="View"><EyeOutlined /></Tooltip></i>
                                                            </div>
                                                        </td> : <td className='admin-ations'>

                                                            {item.status == 'PENDING' ? <div className='action-btns'>
                                                                <i className='info-icon'>
                                                                    <Tooltip placement="bottom" title="Approve" onClick={() => { showResponseModal(item, 'APPROVED') }}><CheckCircleOutlined /></Tooltip></i>
                                                                <i className='info-icon'>
                                                                    <Tooltip placement="bottom" title="Reject" onClick={() => { showResponseModal(item, 'REJECTED') }}><CloseCircleOutlined /></Tooltip></i>
                                                            </div> : <div className='action-btns'>
                                                                <i className='info-icon' onClick={() => showViewModal(item)}>
                                                                    <Tooltip placement="bottom" title="View"><EyeOutlined /></Tooltip></i>
                                                            </div>}
                                                        </td>}
                                                </tr>

                                            </>
                                        )

                                    })}
                                    {pdpReqList.length === 0 &&
                                        <tr style={{ textAlign: 'center' }}>
                                            <td colSpan="10">No request available</td>
                                        </tr>}
                                </tbody>
                            </table>
                        </Loader>
                    </div>
                    <div className="btn-download" style={{ width: "100%", margin: "10px 0" }}>
                        {(exportedList && exportedList.length <= 0) ?
                            <button disabled>Download</button>
                            : <PdpListToExcel pdpData={exportedList} onCancel={onCheckReset} />
                        }
                    </div>

                    <Panigantion
                        data={pdpReqList ? pdpReqList : []}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        itemsCount={pdpReqListCount}
                        setModifiedData={onChangePage}
                        pageNo={pageNo}
                    />
                </div>
            </div>
            {viewModalData && <PdpUpdateViewModal isModalVisible={isPdpViewModalVisible} hideModal={hidePdpViewModal} reqData={viewModalData}></PdpUpdateViewModal>}
            {responseModalData && responseType && <PdpResponseModal hideModal={hidePdpResponseModal} isVisible={isPdpResponseModalVisible} handleSubmit={submitPdpResponse} data={responseModalData} status={responseType}></PdpResponseModal>}
            <PdpRequestModal
                visible={!!isPdpRequestModalVisible}
                onCancel={hidePdpRequestModal}
                dbList={dbList}
                onSubmit={sendPdpUpdateRequest}
            />
        </>
    )
}
const mapStateToProps = (state) => {
    return {
        pdp_req_list: state.admin.get('pdp_update_requests'),
        customer_groups: state.admin.get('customer_group_list'),
        distributor_list: state.admin.get('distributor_code'),

    }
}
const mapDispatchToProps = (dispatch) => {
    return {
        getCustomerGroupDetails: () => dispatch(AdminAction.getCustomerGroupDetails()),
        getPdpRequestList: ({ offset, limit, search, status }) => dispatch(AdminAction.getPdpUpdateRequests({ offset, limit, search, status })),
        savePdpUpdateRequest: (data) => dispatch(AdminAction.savePdpUpdateRequest(data)),
        pdpRequestResponse: (data) => dispatch(AdminAction.pdpUpdateResponse(data)),
        getDistributorList: () => dispatch(AdminAction.getDistributorCodeForTSE()),
    }
}


export default connect(mapStateToProps, mapDispatchToProps)(PdpUpdateRequest)
