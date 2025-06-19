import React, { useEffect, useState, useRef } from 'react';

import { connect } from 'react-redux';
import Auth from '../../util/middleware/auth';
import { notification, Select } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import debounce from 'lodash.debounce';
import LocalAuth from '../../util/middleware/auth';
import Panigantion from '../../components/Panigantion';
import * as Action from './actions/adminAction';
import '../../style/admin/Dashboard.css';
import TSEDistributorContactModal from './TSEDistributorModal/TSEDistributorModal';
import './TSEDistributorModal/TSEDistributorModal.css';
import PlantCodeModel from './PlantCodeUpdateModel/PlantCodeModel'
import PlantCodeTable from './TableAndPopUpModal/PlantCodeTable.js'
import SalesHeirarchy from './TableAndPopUpModal/SalesHeirarchyTable'
import SalesHeirarchyViewModal from './TableAndPopUpModal/SalesHeirarchyViewModal'
import PlantCodeUpdateViewModal from './TableAndPopUpModal/PlantCodeUpdateViewModal';
import PlantAcceptModal from './TableAndPopUpModal/PlantAcceptModal';
import PlantRejectModal from './TableAndPopUpModal/PlantRejectModal';
import '../../style/admin/TSERequests.css';
import ExportPCUtoExcel from './PCUtoExcel/ExportPCUtoExcel'
import ExportSHRtoExcel from './SHRtoExcel/ExportSHRtoExcel'
import { pages, hasViewPermission, hasRaisePermission, hasRespondPermission, features } from '../../persona/requests';
import { teams, hasPermission } from '../../persona/pegasus.js';
const { Option } = Select;

let TSERequests = (props) => {
    const browserHistory = props.history;
    const { sso_user_details, getSSODetails, distributor_list, tse_requests, create_req_response, getTSERequests, createTSERequest, distributor_code, getDistributorCodeForTSE, getPlantCodeRequestList, get_plant_code_request, logisticOfficerResponse, app_level_configuration, updateLogisticsOfficerRequest } = props;
    const [data, setData] = useState([]);
    const [reqData, setReqData] = useState({});
    const [tseUserEmail, setTSEUserEmail] = useState('');
    const [tseCode, setTSECode] = useState('');
    const [asmCode, setASMCode] = useState('');
    const [isModalTseDetails, setIsTseDetailsModalVisible] = useState(false);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [dbCode, setDbCode] = useState();
    const [pageNo, setPageNo] = useState(1);
    const [success, setSuccess] = useState(false)
    const [SelectRequestType, setSelectRequestType] = useState("Sales Hierarchy Requests")
    const [reasonInput, setReasonInput] = useState("")
    const [isPlantCodeModelVisible, setIsPlantCodeModelVisible] = useState(false);
    const [logistic_response, setLogisticResponse] = useState({})
    const [isRejectModalVisible, setIsRejectModalVisible] = useState(false)
    const [isAcceptModalVisible, setIsAcceptModalVisible] = useState(false)
    const [isTSEModalVisible, setIsTSEModalVisible] = useState(false);
    const [SDRequestsFeaturesFlag, setSDRequestsFeaturesFlag] = useState(true);
    const debouncedSearch = useRef(debounce(nextValue => setSearch(nextValue), 500)).current;
    const [selectedStatus, setSelectedStatus] = useState('ALL')
    const [exportedList, setExportedList] = useState([]);

    const pcStatus = [{ label: 'ALL', value: 'ALL' }, { label: 'PENDING', value: 'PENDING' }, { label: 'APPROVED', value: 'APPROVED' }, { label: 'REJECTED', value: 'REJECTED' }];

    const statusChangeHandler = (value) => {
        setSelectedStatus(value);
        setLimit(itemsPerPage);
        setOffset(0);
        setPageNo(1);

    }

    const selectAll = (e) => {
        if (e.target.checked) {
            setExportedList([...data]);
        } else {
            setExportedList([]);
        }
    };

    const checkExisting = (item) => {
        let itemExist = false;
        let filteredArr = (SelectRequestType !== "Sales Hierarchy Requests") ? exportedList.filter(i => i.pc_number === item.pc_number) : exportedList.filter(i => i.sh_number === item.sh_number);
        if (filteredArr.length > 0) {
            itemExist = true;
        }
        return itemExist;
    };

    const exportExcelHandler = (e, item) => {
        if (e.target.checked) {
            setExportedList(exportedList.concat(item))
        } else {
            if (SelectRequestType !== "Sales Hierarchy Requests")
                setExportedList(exportedList.filter((exportItem) => exportItem.pc_number !== item.pc_number))
            else
                setExportedList(exportedList.filter((exportItem) => exportItem.sh_number !== item.sh_number))
        }
    };
    const onCheckReset = () => {
        setExportedList([]);
    };
    var adminRole = LocalAuth.getAdminRole();
    const showPlantCodeModel = async () => {
        getDistributorCodeForTSE();
        setIsPlantCodeModelVisible(true)
    }

    const showModalQ = () => {
        getDistributorCodeForTSE();
        setIsTSEModalVisible(true);
    };
    const handleTSEDistributorCancelModal = () => {
        setIsTSEModalVisible(false);
        setIsPlantCodeModelVisible(false)
    };

    const showModalTseDetails = (item) => {
        setReqData(item);
        setIsTseDetailsModalVisible(true);
    };
    const hideTseDetailsModal = () => {
        setIsTseDetailsModalVisible(false);
    };

    const createRequest = async(comment, distCode, type) => {
        let payload = {};
        payload.status = "PENDING"
        payload.type = type;
        payload.submission_comments = comment;
        payload.distributor_code = distCode;
        payload.created_by = tseUserEmail;
        payload.TSE_code = tseCode;
        payload.ASMRSM_code = asmCode;
       let response = await createTSERequest(payload);
        if (response.success) {
            notification.success({
                message: 'Success',
                description: 'Sales Hierarchy request raised successfully',
                duration: 3,
                className: 'notification-green',
            });
            handleTSEDistributorCancelModal();
            getTSERequests({ offset, limit, search });
        }
        else {
            notification.error({
                message: 'Error',
                description: "Sales Hierarchy request can't  raised !something went wrong",
                duration: 5,
                className: 'notification-error',
            });
            handleTSEDistributorCancelModal();
        }
    }

    useEffect(() => {
        if (tse_requests) {
            if (tse_requests?.rows) {
                setData(tse_requests?.rows);
            }
        }
    }, [tse_requests])
    useEffect(() => {
        if (get_plant_code_request?.data ) {
             setData(get_plant_code_request.data.rows);
        }
    }, [get_plant_code_request])

    useEffect(() => {
        setOffset(0);
        setPageNo(1);
        setSelectedStatus('ALL')
    }, [SelectRequestType]);

    useEffect(() => {
        setDbCode(distributor_code?.rows);
    }, [distributor_code && distributor_code.length]);

    useEffect(() => {
        
            const adminAccessDetails = JSON.parse(Auth.getAdminAccessDetails());
          
            if(adminAccessDetails.username) {
                let email = adminAccessDetails?.username.split('_')[1];
                email && getSSODetails(email, props.history);
                email && setTSEUserEmail(email);
            }
        
    }, [])
    useEffect(async () => {
        if (props.location.state) {
            setSelectRequestType(props.location.state.tabState)
            setSuccess(false)
            if (props.location.state.tabState == "Sales Hierarchy Requests") {
                setData([])
                await getTSERequests(selectedStatus !== 'ALL' ? { offset, limit, search, status: selectedStatus } : { offset, limit, search });
            }
            else if (props.location.state.tabState == 'Plant Update Requests') {
                setData([])
                await getPlantCodeRequestList({ offset, limit, search, status: selectedStatus })
            }
        }
        else if (hasRaisePermission(pages.PLANT_REQUEST) && !hasPermission(teams.ADMIN)) {
            setSuccess(false)
            setSelectRequestType("Plant Update Requests")
            const a = await getPlantCodeRequestList({ offset, limit, search, status: selectedStatus })
        }
        else if (hasRespondPermission(pages.SDR, features.ONLY_SDR_VIEW)) {
            browserHistory.push({ pathname: "/admin/cfa-so-requests" })
        }
        else if (hasRespondPermission(pages.PDP_UNLOCK, features.ONLY_PDP_UNLOCK_VIEW)) {
            browserHistory.push({ pathname: "/admin/pdp-unlock-requests" })
        }
        else if (hasRespondPermission(pages.SHR)) {
            if (SelectRequestType == "Sales Hierarchy Requests")
                browserHistory.push({ pathname: "/admin/pending-requests" })
            else if (SelectRequestType == 'Plant Update Requests') {
                setData([])
                await getPlantCodeRequestList({ offset, limit, search, status: selectedStatus })
            }

        }
        else {
            setSuccess(false)
            if (SelectRequestType == "Sales Hierarchy Requests") {
                setData([])
                await getTSERequests(selectedStatus !== 'ALL' ? { offset, limit, search, status: selectedStatus } : { offset, limit, search });
            }
            else if (SelectRequestType == 'Plant Update Requests') {
                setData([])
                await getPlantCodeRequestList({ offset, limit, search, status: selectedStatus })
            }
        }
        props.location.state = undefined
    }, [tse_requests && tse_requests.length, search, offset, limit, get_plant_code_request && get_plant_code_request.length, SelectRequestType, success, selectedStatus]);

    useEffect(() => {
        if (sso_user_details && sso_user_details.data) {
            let code = sso_user_details.data[0].code != null ? sso_user_details.data[0].code : "";
            setTSECode(code);
            setASMCode(code.slice(0, 4));
        }
    }, [sso_user_details])

    useEffect(() => {

        if (hasRespondPermission(pages.SHR) && create_req_response && create_req_response?.data) {
            if (create_req_response?.data?.success) {
                handleTSEDistributorCancelModal();
                notification.success({
                    message: 'Success',
                    description: create_req_response.data.message,
                    duration: 3,
                    className: 'notification-green',
                });
                getTSERequests({ offset, limit, search });
            }
            else if (!create_req_response?.data?.success) {
                handleTSEDistributorCancelModal();
                notification.error({
                    message: 'Error',
                    description: create_req_response.data.message,
                    duration: 5,
                    className: 'notification-error',
                })
            }
            else if (create_req_response && !create_req_response?.data) {
                notification.error({
                    message: 'Error',
                    description: `Technical error occurred while adding request`,
                    duration: 5,
                    className: 'notification-error',
                })
            }
        }
    }, [create_req_response])



    const onSearch = (e) => {
        e.preventDefault();
        let { value } = e.currentTarget;
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
        setLimit(itemsPerPage)
        setPageNo(1)
    }
    const resetPage = () => {
        debouncedSearch('');
        setShowSearch('');
        setOffset(0);
    }
    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage)
        setOffset((page - 1) * limit)
        setPageNo(page)
    }
    const tabFunction = (value) => {
        if (value === 'Sales Hierarchy Requests') {
            hasRespondPermission(pages.SHR) ?
                browserHistory.push({ pathname: "/admin/pending-requests", state: { tabState: "Sales Hierarchy Requests" } })
                : browserHistory.push({ pathname: "/admin/tse-requests", state: { tabState: "Sales Hierarchy Requests" } })
        }
        else if (value === 'Service Delivery Requests') {
            browserHistory.push({ pathname: "/admin/cfa-so-requests" });
        }else if (value === 'Pdp Update Requests') {
            browserHistory.push({ pathname: "/admin/pdp-update", state: { tabState: "Pdp Update Requests" } });
        }else if(value==='Rush Order Requests'){
            browserHistory.push({ pathname: "/admin/rush-order-requests", state: { tabState: "Rush Order Requests" } });
        }else if(value === 'PDP Unlock Requests'){
            browserHistory.push({ pathname: "/admin/pdp-unlock-requests", state: { tabState: "PDP Unlock Requests" } });
        }
        setShowSearch('')
        setSearch('')
        setSelectRequestType(value)
    }
    const showModalAccept = (item) => {
        let raisedByArray = item?.created_by?.trim().split(' ');
        let raisedBy = '';
        for (let i = 0; i < raisedByArray.length - 1; i++)
            raisedBy += raisedByArray[i] + ' ';
        setLogisticResponse({
            pc_number: item.pc_number,
            distributor_code: item.distributor_code,
            distributor_name: item.distributor_name,
            division: item.division,
            tseName: raisedBy + ' <' + item.code + '>',
            tseId: item.created_by,
            distribution_channel: item.distribution_channel,
            sales_org: item.salesorg,
            request_type: item.requested_type,
            plant_code: item.plant_code,
            previous_sales_details: item.previous_salesdetails,
            comments: item.comments
        })
        setIsAcceptModalVisible(true)

    };

    const showModalReject = (item) => {
        let raisedByArray = item?.created_by?.trim().split(' ');
        let raisedBy = '';
        for (let i = 0; i < raisedByArray.length - 1; i++)
            raisedBy += raisedByArray[i] + ' ';
        setLogisticResponse({
            pc_number: item.pc_number,
            distributor_code: item.distributor_code,
            distributor_name: item.distributor_name,
            division: item.division,
            tseName: raisedBy + ' <' + item.code + '>',
            tseId: item.created_by,
            distribution_channel: item.distribution_channel,
            sales_org: item.salesorg,
            request_type: item.requested_type,
            plant_code: item.plant_code,
            previous_sales_details: item.previous_salesdetails,
            comments: item.comments
        })
        setIsRejectModalVisible(true)
    };

    const acceptRequestByLogisticOfficer = async (updateData, dbCode, name, comment) => {
        let data = {
            data: updateData,
            dbCode: dbCode,
            name: name,
            comment: comment
        }

        try {
            const response = await updateLogisticsOfficerRequest(data)

            if (response.success == true) {
                await getPlantCodeRequestList({ offset, limit, search, status: selectedStatus })
                notification.success({
                    message: 'Success',
                    description: "Plant Code updated successfully ",
                    duration: 3,
                    className: 'notification-green',
                });
            }


        } catch (error) {
            notification.error({
                message: 'Error',
                description: `Technical error occurred while updating `,
                duration: 5,
                className: 'notification-error',
            })
        }

        setReasonInput('')
        setIsPlantCodeModelVisible(false)
    }






    const handleUpdateRequest = async (status) => {
        logistic_response['status'] = status
        logistic_response['response'] = reasonInput
        const response = await logisticOfficerResponse(logistic_response)
        setSuccess(true)
        if (response) {
            if (response.success == true) {
                notification.success({
                    message: 'Success',
                    description: "Plant Code request successfully updated",
                    duration: 3,
                    className: 'notification-green',
                });
            } else {
                notification.error({
                    message: 'Error',
                    description: `Technical error occurred while updating request`,
                    duration: 5,
                    className: 'notification-error',
                })
            }
        } else {
            notification.error({
                message: 'Error',
                description: `Technical error occurred while updating request`,
                duration: 5,
                className: 'notification-error',
            })
        }
        setIsRejectModalVisible(false)
        setIsAcceptModalVisible(false)
        setLogisticResponse({})
        setReasonInput('')
    }
    const hideModalAcceptAndReject = () => {
        setIsRejectModalVisible(false)
        setIsAcceptModalVisible(false)
        setLogisticResponse({})
        setReasonInput('')
    };
    const setInputVal = (e) => {
        setReasonInput(e)
    }
    useEffect(() => {
        if (app_level_configuration && app_level_configuration.length) {
            for (let config of app_level_configuration) {
                if (config.key == "ENABLE_SERVICE_DELIVERY_REQUESTS") {
                    config.value == "YES" ? setSDRequestsFeaturesFlag(false) : setSDRequestsFeaturesFlag(true);
                    break;
                }
            }
        }
    }, [app_level_configuration]);
    return (
        <>

            <div className="admin-dashboard-wrapper">
                <div className="admin-dashboard-block">
                    {/* <Loader> */}
                    <div className="sdr-dashboard-head">
                        <h2>{SelectRequestType}</h2>
                        <div className='header-btns-filters'>
                            <div className="sdr-dashboard-search">
                                <input type="text" className="search-fld"
                                    value={showSearch}
                                    onChange={onSearch}
                                    placeholder={SelectRequestType === "Sales Hierarchy Requests" ? "Search by SHR No./ DB Code/ DB Name/ Request Type" : "Search by PC Req. No./ DB Code/ DB Name/ Plant Code"} />
                                <div onClick={resetPage} className="search-close"><CloseCircleOutlined /></div>
                            </div>
                            <div className='sdr-status-filter'>
                                <Select
                                    showSearch
                                    style={{ fontSize: '13px' }}
                                    className='width120px'
                                    placeholder="Select sdr status"
                                    defaultValue={'ALL'}
                                    optionFilterProp="children"
                                    value={selectedStatus}
                                    onChange={statusChangeHandler}
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={pcStatus}
                                />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex' }}>
                        <div className="req-tabs">
                            {hasViewPermission(pages.SHR) &&
                                <button id="salesHierarchy" className={`tablink ${SelectRequestType === 'Sales Hierarchy Requests' ? 'active' : ''}`} onClick={() => { tabFunction('Sales Hierarchy Requests') }}>Sales Hierarchy</button>
                            }
                            {
                                hasViewPermission(pages.PDP_REQUESTS) && <button id="pdpUpdate" className={`tablink`} onClick={() => { tabFunction('Pdp Update Requests') }}>PDP Update</button>
                            }
                            {hasViewPermission(pages.PDP_UNLOCK) && <button id="pdpUnlock" className={`tablink`} onClick={() => { tabFunction('PDP Unlock Requests') }}>PDP Unlock</button>}
                            <button id="plantUpdate" className={`tablink ${SelectRequestType === 'Plant Update Requests' ? 'active' : ''}`} onClick={() => { tabFunction('Plant Update Requests') }}>Plant Update</button>
                            {SDRequestsFeaturesFlag == false ? <button id="ServiceDelivery" className={`tablink ${SelectRequestType === 'Service Delivery Requests' ? 'active' : ''}`} onClick={() => { tabFunction('Service Delivery Requests') }}>Service Delivery</button> : ""}
                            {hasViewPermission(pages.RO_REQUESTS) && <button id="rushOrder" className={`tablink`} onClick={() => { tabFunction('Rush Order Requests') }}>Rush Order</button>}
                        </div>
                        <div className='header-block-right'>
                            <div className='hbr-item1'>
                                <div className='dot-pending'></div> <div style={{ marginRight: '4px' }}>Pending</div>
                                <div className='dot-approved'></div> <div style={{ marginRight: '4px' }}>Approved</div>
                                <div className='dot-rejected'></div> <div style={{ marginRight: '4px' }}>Rejected</div>
                            </div>
                            {hasViewPermission(pages.SHR, features.VIEW_RAISE) && SelectRequestType === "Sales Hierarchy Requests" &&

                                <div className='hbr-item2'>
                                    <button onClick={showModalQ} type="submit" className="add-btn">
                                        Sales Hierarchy Requests
                                        <img src="/assets/images/plus-icon.svg" alt="" />
                                    </button>
                                </div>
                            }
                            {hasViewPermission(pages.PLANT_REQUEST, features.VIEW_RAISE) && SelectRequestType !== "Sales Hierarchy Requests" &&

                                <div className='hbr-item2'>
                                    <button onClick={showPlantCodeModel} type="submit" className="add-btn">
                                        Plant Code Request
                                        <img src="/assets/images/plus-icon.svg" alt="" />
                                    </button>
                                </div>
                            }
                        </div>
                    </div>


                    {SelectRequestType === "Sales Hierarchy Requests" ?
                        //** Sales Hierarchy Requests Table*//
                        <SalesHeirarchy data={data} showModalTseDetails={showModalTseDetails}
                            selectAll={selectAll} checkExisting={checkExisting} exportExcelHandler={exportExcelHandler} />
                        :
                        <PlantCodeTable data={data}
                            showModalAccept={showModalAccept} showModalReject={showModalReject}
                            showModalTseDetails={showModalTseDetails}
                            selectAll={selectAll} checkExisting={checkExisting} exportExcelHandler={exportExcelHandler} />

                        //*Service Delivery Request*//
                    }



                    {SelectRequestType === "Sales Hierarchy Requests" ?
                        <>
                            <div className="btn-download" style={{ width: "100%", margin: "10px 0" }}>
                                {(exportedList && exportedList.length <= 0) ?
                                    <button disabled>Download</button>
                                    : <ExportSHRtoExcel shrData={exportedList} onCancel={onCheckReset} />
                                }
                            </div>
                            <Panigantion
                                data={data ? data : []}
                                itemsPerPage={itemsPerPage}
                                goToPage={pageNo}
                                setItemsPerPage={setItemsPerPage}
                                itemsCount={tse_requests && tse_requests.rows && tse_requests.totalCount}
                                setModifiedData={onChangePage} /></> :
                        <><div className="btn-download" style={{ width: "100%", margin: "10px 0" }}>
                            {(exportedList && exportedList.length <= 0) ?
                                <button disabled>Download</button>
                                : <ExportPCUtoExcel pcuData={exportedList} onCancel={onCheckReset} />
                            }
                        </div>
                            <Panigantion
                                data={data ? data : []}
                                goToPage={pageNo}
                                itemsPerPage={itemsPerPage}
                                setItemsPerPage={setItemsPerPage}
                                itemsCount={get_plant_code_request && get_plant_code_request.data?.rows && get_plant_code_request.data?.totalCount}
                                setModifiedData={onChangePage} /></>

                    }
                    {/* </Loader> */}

                    {dbCode != undefined ?
                        <PlantCodeModel
                            visible={!!isPlantCodeModelVisible}
                            distributor_list={dbCode}
                            tseCode={distributor_code?.userCode}
                            onCancel={handleTSEDistributorCancelModal}
                            setSuccess={setSuccess}
                            handleUpdateRequest={handleUpdateRequest}
                            acceptRequestByLogisticOfficer={acceptRequestByLogisticOfficer}
                        /> : ""}
                    <TSEDistributorContactModal
                        visible={!!isTSEModalVisible}
                        onCancel={handleTSEDistributorCancelModal}
                        data={isTSEModalVisible}
                        createRequest={createRequest}
                        dbcode={dbCode}
                        tseCode={distributor_code?.userCode}
                        tseEmail={tseUserEmail}
                    />
                </div>
            </div>

            {/* view modal  for sales heirarchy request*/}
            {SelectRequestType === "Sales Hierarchy Requests" ?
                <SalesHeirarchyViewModal reqData={reqData} isModalTseDetails={isModalTseDetails}
                    hideTseDetailsModal={hideTseDetailsModal} /> : SelectRequestType == "Plant Update Requests" ?

                    <PlantCodeUpdateViewModal reqData={reqData} isModalTseDetails={isModalTseDetails}
                        hideTseDetailsModal={hideTseDetailsModal} /> : ""
            }

            {/* accept modal */}
            <PlantAcceptModal isAcceptModalVisible={isAcceptModalVisible} hideModalAcceptAndReject={hideModalAcceptAndReject}
                logistic_response={logistic_response}
                reasonInput={reasonInput} setInputVal={setInputVal} handleUpdateRequest={handleUpdateRequest} />
            {/* reject modal */}
            <PlantRejectModal isRejectModalVisible={isRejectModalVisible} hideModalAcceptAndReject={hideModalAcceptAndReject}
                logistic_response={logistic_response}
                reasonInput={reasonInput} setInputVal={setInputVal} handleUpdateRequest={handleUpdateRequest} />
        </>
    )
}

const mapStateToProps = (state) => {
    return {
        tse_requests: state.admin.get('tse_requests'),
        sso_user_details: state.admin.get('sso_user_details'),
        create_req_response: state.admin.get('create_req_response'),
        distributor_code: state.admin.get('distributor_code'),
        get_plant_code_request: state.admin.get('get_plant_code_request'),
        app_level_configuration: state.auth.get('app_level_configuration')
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        getTSERequests: ({ offset, limit, search, status }) => dispatch(Action.getTSERequests({ offset, limit, search, status })),
        createTSERequest: (payload) => dispatch(Action.createTSERequest(payload)),
        getSSODetails: (email, history) => dispatch(Action.getSSODetails(email, history)),
        getDistributorCodeForTSE: () => dispatch(Action.getDistributorCodeForTSE()),
        getPlantCodeRequestList: ({ offset, limit, search, status }) => dispatch(Action.getPlantCodeRequestList({ offset, limit, search, status })),
        logisticOfficerResponse: (data) => dispatch(Action.logisticOfficerResponse(data)),
        updateLogisticsOfficerRequest: (data) => dispatch(Action.updateLogisticsOfficerRequest(data))
    };
};

const ConnectTSERequests = connect(
    mapStateToProps,
    mapDispatchToProps,
)(TSERequests);


export default ConnectTSERequests;
