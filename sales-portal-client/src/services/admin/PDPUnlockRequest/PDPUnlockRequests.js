import React, { useState, useEffect, useRef, useReducer } from 'react';
import { useLocation } from 'react-router-dom';
import { connect } from 'react-redux';
import * as AdminAction from '../actions/adminAction';
import { Select, notification, Tooltip } from 'antd';
import debounce from 'lodash.debounce';
import { CloseCircleOutlined, EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { hasViewPermission, hasRespondPermission, pages, hasRaisePermission, features } from '../../../persona/requests';
import Loader from '../../../components/Loader';
import Util from '../../../util/helper/index';
import Panigantion from '../../../components/Panigantion';
import DistributorDetailsModal from './DistributorDetailsModal';
import ApprovedPDPUnlockRequestModal from './ApprovedPDPUnlockRequestModal';
import useWindowDimensions from '../../../hooks/useWindowDimensions';

const { Option } = Select;

const PDPUnlockRequests = (props) => {
    const { width, height } = useWindowDimensions();
    const location = useLocation();
    const {
        getPdpUnlockRequests,
        history,
        getDbRegions,
        getAppSettingList,
        updatePDPUnlockRequest,
        setExpiredPdpUnlockRequests,
        updateMultiplePDPUnlockRequests,
        insertApprovedPdpUnlockRequest,
        dashboardFilterCategories,
    } = props;
    const browserHistory = history;
    const debouncedSearch = useRef(debounce((nextValue) => setSearch(nextValue), 500)).current;
    const pdpUnlockStatus = [
        { label: 'ALL', value: 'ALL' },
        { label: 'PENDING', value: 'PENDING' },
        { label: 'APPROVED', value: 'APPROVED' },
        { label: 'REJECTED', value: 'REJECTED' },
        { label: 'EXPIRED', value: 'EXPIRED' },
        { label: 'PREAPPROVED', value: 'PREAPPROVED' },
    ];

    const [tableData, setTableData] = useState([]);
    const [status, setStatus] = useState('ALL');
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState('');
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [pageNo, setPageNo] = useState(1);
    const [tableDataCount, setTableDataCount] = useState(0);
    const [pdpApprovers, setPdpApprovers] = useState([]);
    const [fetchCount, setFetchCount] = useState(0);
    const [expiryHours, setExpiryHours] = useState(24);
    const [isMassActionButtonsClicked, setIsMassActionButtonsClicked] = useState(false);
    const [allowMassAction, setAllowMassAction] = useState(false);
    const userId = useRef(window.localStorage.getItem('user_id'));
    const sortDirection = useRef(true);
    const email = useRef(window.localStorage.getItem('email')?.toLowerCase());

    const [isDistributionDetailsModalVisible, setIsDistributionDetailsModalVisible] = useState(false);
    const [reqData, setReqData] = useState([]);
    const [reqDetails, setReqDetails] = useState({});
    const [expiryHours2, setExpiryHours2] = useState(24);
    const [isApprovedRequestModalOpen, setIsApprovedRequestModalOpen] = useState(false);
    const [, /* ignored */ forceUpdate] = useReducer((x) => x + 1, 0);
    const isMassApprove = useRef(false);
    const isMassReject = useRef(false);
    const dashboardFilterCategoriesData = useRef({});
    const headerCheckBoxRef = useRef();

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
            });
        }
    };

    useEffect(() => {
        async function fetchAppSettings() {
            const res = await getAppSettingList();
            if (res.data) {
                const approvers = res.data.find((item) => item.key === 'PDP_APPROVERS');
                const exp_hrs = res.data.find((item) => item.key === 'PDP_UNLOCK_EXPIRY_WINDOW')['value'] || 24;
                const exp_hrs2 = res.data.find((item) => item.key === 'PDP_UNLOCK_EXPIRY_WINDOW_2')['value'] || 24;
                if (exp_hrs) {
                    setExpiryHours(parseInt(exp_hrs));
                }
                if (exp_hrs2) {
                    setExpiryHours2(parseInt(exp_hrs2));
                }
                if (approvers?.value) {
                    setPdpApprovers(
                        approvers.value
                            .split(',')
                            .filter((o) => o.trim().length > 8)
                            .map((o) => o.trim().toLowerCase()),
                    );
                }
            }
        }
        fetchAppSettings();
    }, []);

    useEffect(() => {
        const email_index = pdpApprovers.indexOf(email.current);
        if (email_index >= 0) {
            setAllowMassAction(true);
        }
    }, [pdpApprovers]);

    useEffect(() => {
        if (location?.state?.id && tableData.length) {
            const { id, action } = location.state;
            const decryptedId = Util.decryptData(id.replaceAll('*', '/').replaceAll('-', '+')).replace(/^['"]|['"]$/g, '');
            const request = decryptedId ? tableData.find((item) => item.request_id === decryptedId) : null;
            if (!request) {
                notificationSender(false, 'Error', 'Request not found');
                return;
            }

            if (action === 'approve' && pdpApprovers.length) {
                handleApprove(request);
            } else if (action === 'reject' && pdpApprovers.length) {
                handleReject(request);
            }
        }
    }, [location?.state, tableData, pdpApprovers]);
    useEffect(() => {
        async function fetchRequests(data) {
            const email_index = pdpApprovers.indexOf(email.current);
            const res = await getPdpUnlockRequests(data);
            if (res.success) {
                const rowData = res.data.rows.map((data) => {
                    const isChecked =
                        headerCheckBoxRef.current?.checked &&
                        data.status === 'PENDING' &&
                        !data.responded_by_emails?.find((e) => e.toLowerCase() === email.current) &&
                        (email_index < 1 || data.responded_by_emails?.find((e) => e.toLowerCase() === pdpApprovers[email_index - 1]));
                    return { checked: isChecked, ...data };
                });
                setTableData(rowData);
                setTableDataCount(res.data.totalCount);
            } else {
                notificationSender(false, 'Error', res.message);
            }
        }
        const payload_data = { status, search, limit, offset };
        fetchRequests(payload_data);
    }, [getPdpUnlockRequests, status, search, limit, offset, fetchCount]);

    const handleDistributorDetailsModel = async (item) => {
        async function fetchRegions(data) {
            const res = await getDbRegions(data);
            if (res.success) {
                setReqData(res.data);
            } else {
                notificationSender(false, 'Error', res.message);
            }
        }

        await fetchRegions({ distributor_ids: item.distributor_codes });
        setReqDetails({ ...item });
        setIsDistributionDetailsModalVisible(true);
    };

    const tabFunction = (value) => {
        if (value === 'Sales Hierarchy Requests') {
            if (hasRespondPermission(pages.SHR)) {
                browserHistory.push({
                    pathname: '/admin/pending-requests',
                    state: { tabState: 'Sales Hierarchy Requests' },
                });
            } else {
                browserHistory.push({
                    pathname: '/admin/tse-requests',
                    state: { tabState: 'Sales Hierarchy Requests' },
                });
            }
        } else if (value === 'Service Delivery Requests') {
            browserHistory.push({
                pathname: '/admin/cfa-so-requests',
                state: { tabState: 'Service Delivery Requests' },
            });
        } else if (value === 'Pdp Update Requests') {
            browserHistory.push({
                pathname: '/admin/pdp-update',
                state: { tabState: 'Pdp Update Requests' },
            });
        } else if (value === 'Plant Update Requests') {
            browserHistory.push({
                pathname: '/admin/tse-requests',
                state: { tabState: 'Plant Update Requests' },
            });
        } else if (value === 'Rush Order Requests') {
            browserHistory.push({
                pathname: '/admin/rush-order-requests',
                state: { tabState: 'Rush Order Requests' },
            });
        }

        setShowSearch('');
        debouncedSearch('');
        setStatus('ALL');
    };

    const onSearch = (e) => {
        const { value } = e.target;
        debouncedSearch(value);
        setShowSearch(value);
        setOffset(0);
        setPageNo(1);
    };

    const resetPage = () => {
        debouncedSearch('');
        setShowSearch('');
        setOffset(0);
        setPageNo(1);
    };

    const statusChangeHandler = (value) => {
        setStatus(value);
        setLimit(itemsPerPage);
        setOffset(0);
        setPageNo(1);
    };

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    const sortColumn = (columnName) => {
        sortDirection.current = !sortDirection.current;
        if (sortDirection.current) {
            tableData.sort((a, b) => {
                let comparison = 0;
                if (a[columnName] < b[columnName]) {
                    comparison = -1;
                }
                if (a[columnName] > b[columnName]) {
                    comparison = 1;
                }
                if (!b[columnName]) {
                    comparison = -1;
                }
                return comparison;
            });
        } else {
            tableData.sort((a, b) => {
                let comparison = 0;
                if (a[columnName] < b[columnName]) {
                    comparison = -1;
                }
                if (a[columnName] > b[columnName]) {
                    comparison = 1;
                }
                if (!b[columnName]) {
                    comparison = 1;
                }
                return comparison * -1;
            });
        }
        setTableData(tableData);
        forceUpdate();
    };

    async function updateRequest(data, type) {
        try {
            const res = await updatePDPUnlockRequest(data);
            if (res.success) {
                setFetchCount((prev) => prev + 1);
                notificationSender(true, 'Success', `Request-${data.request_id} ${type} successfully`);
            } else {
                notificationSender(false, 'Error', res.message);
            }
        } catch (e) {
            notificationSender(false, 'Error', 'Failed to update request. Please try again later.');
        }
    }

    async function canRespond(request) {
        if (request.status === 'APPROVED') {
            notificationSender(false, 'Error', 'Request already approved');
            return false;
        }
        if (request.status === 'REJECTED') {
            notificationSender(false, 'Error', 'Request already rejected');
            return false;
        }
        const email_index = pdpApprovers.indexOf(email.current);
        if (email_index < 0) {
            notificationSender(false, 'Error', 'You are not authorized to approve/reject this request');
            return false;
        }
        const dateString =
            email_index === 0 ? request.requested_on : request.responded_on[request.responded_by_emails.findIndex((e) => e.toLowerCase() === pdpApprovers[email_index - 1])];

        const request_date = new Date(dateString);
        const diff_hours = Math.abs(new Date() - request_date) / 36e5;
        if ((email_index === 0 && diff_hours > expiryHours) || (email_index > 0 && diff_hours > expiryHours2)) {
            notificationSender(false, 'Error', 'Request expired');
            const setExpiredResponse = await setExpiredPdpUnlockRequests();
            if (setExpiredResponse.success) setFetchCount((prev) => prev + 1);
            return false;
        }
        if (email_index > 0 && !request.responded_by_emails?.find((e) => e.toLowerCase() === pdpApprovers[email_index - 1])) {
            notificationSender(false, 'Error', 'You cannot approve/reject this request unless your previous approver approves it first.');
            return false;
        }
        if (request.responded_by_emails?.find((e) => e.toLowerCase() === email.current)) {
            notificationSender(false, 'Error', 'You have already responded to this request');
            return false;
        }
        return true;
    }
    const handleApprove = async (request) => {
        history.replace({ pathname: location.pathname });
        const canApprove = await canRespond(request);
        if (!canApprove) return;

        const email_index = pdpApprovers.indexOf(email.current);
        const isApproved = email_index === pdpApprovers.length - 1;
        const payload = {
            request_id: request.request_id,
            regions: request.regions,
            area_codes: request.area_codes,
            start_date: request.start_date,
            end_date: request.end_date,
            requested_on: request.requested_on,
            requested_by_id: request.requested_by_id,
        };
        if (isApproved) payload['status'] = 'APPROVED';
        else {
            payload['approver_email'] = pdpApprovers[email_index + 1];
            payload['requested_by'] = request.requested_by.split('-')[0];
            payload['requested_by_role'] = request.requested_by.split('-')[1];
            payload['comments'] = request.comments;
        }

        updateRequest(payload, 'Approved');
    };

    const handleReject = async (request) => {
        history.replace({ pathname: location.pathname });
        const canReject = await canRespond(request);
        if (!canReject) return;
        const payload = {
            request_id: request.request_id,
            status: 'REJECTED',
            regions: request.regions,
            area_codes: request.area_codes,
            start_date: request.start_date,
            end_date: request.end_date,
            requested_on: request.requested_on,
            requested_by_id: request.requested_by_id,
        };

        updateRequest(payload, 'Rejected');
    };

    const handleMassApprove = () => {
        isMassApprove.current = true;
        setIsMassActionButtonsClicked(true);
    };

    const handleMassReject = () => {
        isMassReject.current = true;
        setIsMassActionButtonsClicked(true);
    };

    const selectAll = (e) => {
        const tableDataCopy = [...tableData];
        const email_index = pdpApprovers.indexOf(email.current);
        tableDataCopy.forEach((item) => {
            if (
                item.status === 'PENDING' &&
                !item.responded_by_emails?.find((e) => e.toLowerCase() === email.current) &&
                (email_index < 1 || item.responded_by_emails?.find((e) => e.toLowerCase() === pdpApprovers[email_index - 1]))
            )
                item.checked = e.target.checked;
        });
        setTableData(tableDataCopy);
    };

    const handleCheckbox = (event, item) => {
        const tableDataCopy = [...tableData];
        for (let data of tableDataCopy) {
            if (data.request_id === item.request_id) {
                data.checked = event.target.checked;
                break;
            }
        }
        setTableData(tableDataCopy);
    };

    const handleMassCancel = () => {
        isMassApprove.current = false;
        isMassReject.current = false;
        setFetchCount((prev) => prev + 1);
        setIsMassActionButtonsClicked(false);
    };

    async function canMassRespond() {
        const email_index = pdpApprovers.indexOf(email.current);
        if (email_index < 0) {
            notificationSender(false, 'Error', 'You are not authorized to approve/reject this request');
            return false;
        }
    }

    const handleMassSave = async () => {
        if (!canMassRespond()) return;

        const email_index = pdpApprovers.indexOf(email.current);
        const isApproved = email_index === pdpApprovers.length - 1;
        const selectedItems = tableData
            .filter(
                (item) =>
                    item.checked &&
                    item.status === 'PENDING' &&
                    !item.responded_by_emails?.find((e) => e.toLowerCase() === email.current) &&
                    (email_index < 1 || item.responded_by_emails?.find((e) => e.toLowerCase() === pdpApprovers[email_index - 1])),
            )
            .map((item) => {
                return {
                    request_id: item.request_id,
                    status: isMassApprove.current ? (isApproved ? 'APPROVED' : 'PENDING') : 'REJECTED',
                };
            });

        if (selectedItems.length === 0) {
            notificationSender(false, 'Error', 'No requests selected to approve/reject');
            return;
        }

        const payload = { data: selectedItems };
        setAllowMassAction(false);
        setIsMassActionButtonsClicked(false);
        const response = await updateMultiplePDPUnlockRequests(payload);
        setAllowMassAction(true);
        if (response.success) {
            const successMessage =
                response.data
                    .filter((item) => item.success)
                    .map((item) => {
                        return `${item.request_id}: ${item.message}`;
                    })
                    .join(', ') || '';
            const errorMessage =
                response.data
                    .filter((item) => !item.success)
                    .map((item) => {
                        return `${item.request_id}: ${item.message}`;
                    })
                    .join(', ') || '';
            if (successMessage) notificationSender(true, 'Success', successMessage);
            if (errorMessage) notificationSender(false, 'Error', errorMessage);
            setFetchCount((prev) => prev + 1);
        } else {
            notificationSender(false, 'Error', response.message);
        }

        isMassApprove.current = false;
        isMassReject.current = false;
    };

    const handleApprovedRequestModalClose = () => {
        setIsApprovedRequestModalOpen(false);
    };

    async function fetchDashboardFilters() {
        const filterCategories = await dashboardFilterCategories();
        if (Object.keys(filterCategories?.response || {}).length === 0) {
            notificationSender(false, 'Error', 'Failed to fetch filter categories');
            return false;
        }
        dashboardFilterCategoriesData.current = filterCategories.response;
        return true;
    }

    const handleApprovedRequestModalOpen = async () => {
        if (Object.keys(dashboardFilterCategoriesData.current).length === 0) {
            const haveFetched = await fetchDashboardFilters();
            if (!haveFetched) return;
        }
        setIsApprovedRequestModalOpen(true);
    };

    const submitApprovedRequest = async (data) => {
        const response = await insertApprovedPdpUnlockRequest(data);
        if (response.success) {
            notificationSender(true, 'Success', 'Request submitted successfully');
            setFetchCount((prev) => prev + 1);
        } else {
            notificationSender(false, 'Error', response.message);
        }
    };

    const onCancelDbDetailsModal = () => {
        setIsDistributionDetailsModalVisible(false);
        setReqData([]);
        setReqDetails({});
    };

    return (
        <>
            <div className="admin-dashboard-wrapper">
                {width > 767 ? (
                    <div className="admin-dashboard-block">
                        <div className="sdr-dashboard-head">
                            <h2>PDP Unlock Requests</h2>
                            <div className="header-btns-filters">
                                <div className="sdr-dashboard-search">
                                    <input
                                        type="text"
                                        className="search-fld"
                                        placeholder="Search by Area/ Region/ Requested by"
                                        value={showSearch}
                                        onChange={(e) => {
                                            onSearch(e);
                                        }}
                                    />
                                    <div onClick={resetPage} className="search-close">
                                        <CloseCircleOutlined />
                                    </div>
                                </div>
                                <div className="sdr-status-filter">
                                    <Select
                                        showSearch
                                        style={{ fontSize: '13px' }}
                                        className="width120px"
                                        placeholder="PDP Unlock status"
                                        defaultValue={'ALL'}
                                        optionFilterProp="children"
                                        onChange={statusChangeHandler}
                                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                        options={pdpUnlockStatus}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="hbr-message">
                            <span>PDP unlock requests need to be approved by 1st approver within {expiryHours} hours from creation.</span>
                        </div>
                        <div className="dashboard-neck">
                            <div className="req-tabs">
                                {hasViewPermission(pages.SHR) && (
                                    <button
                                        id="salesHierarchy"
                                        className={`tablink`}
                                        onClick={() => {
                                            tabFunction('Sales Hierarchy Requests');
                                        }}>
                                        Sales Hierarchy
                                    </button>
                                )}
                                {hasViewPermission(pages.PDP_REQUESTS) && (
                                    <button
                                        id="pdpUpdate"
                                        className={`tablink`}
                                        onClick={() => {
                                            tabFunction('Pdp Update Requests');
                                        }}>
                                        PDP Update
                                    </button>
                                )}
                                <button id="RushOrder" className={`tablink active`}>
                                    PDP Unlock
                                </button>
                                {hasViewPermission(pages.PLANT_REQUEST) && (
                                    <button
                                        id="plantUpdate"
                                        className={`tablink`}
                                        onClick={() => {
                                            tabFunction('Plant Update Requests');
                                        }}>
                                        Plant Update
                                    </button>
                                )}
                                {hasViewPermission(pages.SDR) && (
                                    <button
                                        id="serviceDelivery"
                                        className={`tablink`}
                                        onClick={() => {
                                            tabFunction('Service Delivery Requests');
                                        }}>
                                        Service Delivery
                                    </button>
                                )}
                                {hasViewPermission(pages.RO_REQUESTS) && (
                                    <button
                                        id="rushOrder"
                                        className={`tablink`}
                                        onClick={() => {
                                            tabFunction('Rush Order Requests');
                                        }}>
                                        Rush Order
                                    </button>
                                )}
                            </div>
                            <div className="header-block-right">
                                <div className="hbr-item1">
                                    <div className="dot-pending"></div> <div style={{ marginRight: '4px' }}>Pending</div>
                                    <div className="dot-approved"></div> <div style={{ marginRight: '4px' }}>Approved</div>
                                    <div className="dot-rejected"></div> <div style={{ marginRight: '4px' }}>Rejected</div>
                                    <div className="dot-expired"></div> <div style={{ marginRight: '4px' }}>Expired</div>
                                </div>
                                <div className="hbr-item2n">
                                    {!isMassActionButtonsClicked && hasRaisePermission(pages.PDP_UNLOCK, features.APPROVED_PDP_UNLOCK_REQUESTS) && (
                                        <button type="submit" onClick={handleApprovedRequestModalOpen} className="pdp-req-add-btn">
                                            Approved Request&nbsp; <img src="/assets/images/plus-icon.svg" alt="" />
                                        </button>
                                    )}
                                    {!isMassActionButtonsClicked && hasRespondPermission(pages.PDP_UNLOCK) && (
                                        <button disabled={!allowMassAction} className="approve-btn" onClick={handleMassApprove}>
                                            Approve
                                        </button>
                                    )}
                                    {!isMassActionButtonsClicked && hasRespondPermission(pages.PDP_UNLOCK) && (
                                        <button disabled={!allowMassAction} className="reject-btn" onClick={handleMassReject}>
                                            Reject
                                        </button>
                                    )}
                                    {isMassActionButtonsClicked && (
                                        <button className="ro-cancel-btn" onClick={handleMassCancel}>
                                            Cancel
                                        </button>
                                    )}
                                    {isMassActionButtonsClicked && (
                                        <button className="ro-save-btn" onClick={handleMassSave}>
                                            Save
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="admin-dashboard-table">
                            <Loader>
                                <div className='requests-table-outer'>
                                    <table>
                                        <thead>
                                            <tr>
                                                {isMassActionButtonsClicked && tableData.length > 0 && (
                                                    <th className="width3">
                                                        <br />
                                                        <input
                                                            className="checkbox-header"
                                                            style={{
                                                                width: '18px',
                                                                height: '18px',
                                                            }}
                                                            ref={headerCheckBoxRef}
                                                            checked={headerCheckBoxRef.current?.checked ?? false}
                                                            onChange={(e) => {
                                                                selectAll(e);
                                                            }}
                                                            type="checkbox"
                                                        />
                                                    </th>
                                                )}
                                                <th className={isMassActionButtonsClicked ? 'width12' : 'width15'}>
                                                    <br />
                                                    Request No.
                                                </th>
                                                <th className="width12" style={{ textAlign: 'center' }} onClick={() => sortColumn('requested_on')}>
                                                    <br />
                                                    Request Date&nbsp;
                                                    <img src="/assets/images/sorting_icon.svg" alt="" />
                                                </th>
                                                <th className="sub-head width20" style={{textAlign: 'center'}}>
                                                    <span className="sub-head-text">Requested PDP</span>
                                                    <tr className="grid-container-row-sn-default">
                                                        <th className="grid-cont-cell" onClick={() => sortColumn('start_date')}>
                                                            <span>Start Date</span>&nbsp;
                                                            <img src="/assets/images/sorting_icon.svg" alt="" />
                                                        </th>
                                                        <th className="grid-cont-cell" onClick={() => sortColumn('end_date')}>
                                                            <span>End Date</span>&nbsp;
                                                            <img src="/assets/images/sorting_icon.svg" alt="" />
                                                        </th>
                                                    </tr>
                                                </th>

                                                <th className="width12" style={{ textAlign: 'center' }} onClick={() => sortColumn('responded_on')}>
                                                    <br />
                                                    Response Date&nbsp;
                                                    <img src="/assets/images/sorting_icon.svg" alt="" />
                                                </th>
                                                <th className="width15" style={{ textAlign: 'center' }}>
                                                    <br />
                                                    Responded by
                                                </th>
                                                <th className="width10" style={{ textAlign: 'center' }}>
                                                    <br />
                                                    Requested By
                                                </th>
                                                <th className="width5" style={{ textAlign: 'center' }}>
                                                    <br />
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tableData.map((item, index) => {
                                                let backgroundColor = '';
                                                if (item.status === 'PENDING') backgroundColor = 'rgb(242, 216, 168)';
                                                else if (item.status === 'APPROVED') backgroundColor = '#adefc0';
                                                else if (item.status === 'REJECTED') backgroundColor = 'rgb(225 95 95 / 63%)';
                                                else if (item.status === 'EXPIRED') backgroundColor = '#f5f6f6';
                                                const email_index = pdpApprovers.indexOf(email.current);
                                                const canRespondFlag =
                                                    hasRespondPermission(pages.PDP_UNLOCK) &&
                                                    item.status === 'PENDING' &&
                                                    email_index >= 0 &&
                                                    (email_index < 1 || item.responded_by_emails?.find((e) => e.toLowerCase() === pdpApprovers[email_index - 1])) &&
                                                    !item.responded_by_emails?.find((e) => e.toLowerCase() === email.current);
                                                return (
                                                    <tr key={index} style={{ backgroundColor }}>
                                                        {isMassActionButtonsClicked && (
                                                            <td className="width3">
                                                                <label htmlFor={index}>
                                                                    <input
                                                                        id={index}
                                                                        type="checkbox"
                                                                        disabled={!canRespondFlag}
                                                                        checked={item.checked}
                                                                        onChange={(event) => handleCheckbox(event, item)}
                                                                    />
                                                                    <span className="checkmark-box"></span>
                                                                </label>
                                                            </td>
                                                        )}
                                                        <td
                                                            className={isMassActionButtonsClicked ? 'width12 text-hyperlink' : 'width15 text-hyperlink'}
                                                            onClick={(e) => handleDistributorDetailsModel(item)}>
                                                            {item.request_id}
                                                        </td>
                                                        <td className="width12" style={{ textAlign: 'center' }}>
                                                            {Util.formatDate(item.requested_on)}, {Util.formatTime(item.requested_on)}
                                                        </td>
                                                        <td className="sub-head sn-padding">
                                                            <tr className="grid-container-row-sn-default" style={{ backgroundColor: 'inherit' }}>
                                                                <td className="sn-padding">{Util.formatDate(item.start_date)}, 12:00 AM</td>
                                                                <td className="sn-padding">{Util.formatDate(item.end_date)}, 11:59 PM</td>
                                                            </tr>
                                                        </td>
                                                        <td className="width12" style={{ textAlign: 'center' }}>
                                                            {item.responded_on?.length ? (
                                                                <>
                                                                    {item.responded_on.map((date) => (
                                                                        <li>
                                                                            {Util.formatDate(date)}, {Util.formatTime(date)}
                                                                        </li>
                                                                    ))}
                                                                </>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {item.responded_by?.length ? (
                                                                <>
                                                                    {item.responded_by.map((name) => (
                                                                        <li>{name}</li>
                                                                    ))}
                                                                </>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>{item.requested_by?.split('-')[0]}</td>
                                                        <td
                                                            style={{
                                                                textAlign: 'center',
                                                                padding: '5px',
                                                            }}>
                                                            {canRespondFlag && !isMassActionButtonsClicked ? (
                                                                <div className="action-btns" style={{ width: '100%' }}>
                                                                    <i className="info-icon">
                                                                        <Tooltip
                                                                            placement="bottom"
                                                                            title="Approve"
                                                                            onClick={() => {
                                                                                handleApprove(item);
                                                                            }}>
                                                                            <CheckCircleOutlined />
                                                                        </Tooltip>
                                                                    </i>
                                                                    <i className="info-icon">
                                                                        <Tooltip
                                                                            placement="bottom"
                                                                            title="Reject"
                                                                            onClick={() => {
                                                                                handleReject(item);
                                                                            }}>
                                                                            <CloseCircleOutlined />
                                                                        </Tooltip>
                                                                    </i>
                                                                </div>
                                                            ) : (
                                                                <div className="action-btns" style={{ width: '100%' }}>
                                                                    <Tooltip placement="bottom" title="View">
                                                                        <EyeOutlined onClick={(e) => handleDistributorDetailsModel(item)} />
                                                                    </Tooltip>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {tableData.length === 0 && (
                                            <tr style={{ textAlign: 'center' }}>
                                                <td colSpan="10">No request available</td>
                                            </tr>
                                        )}
                                    </table>
                                </div>
                            </Loader>
                        </div>
                        <Panigantion
                            data={tableData ? tableData : []}
                            itemsPerPage={itemsPerPage}
                            setItemsPerPage={setItemsPerPage}
                            itemsCount={tableDataCount}
                            setModifiedData={onChangePage}
                            pageNo={pageNo}
                        />
                    </div>
                ) : (
                    <div className="ro-mobile-block">
                        <div className="ro-mobile-head">
                            <div className="ro-page-title">PDP Unlock Requests</div>
                            <div className="ro-mobile-search">
                                <input
                                    type="text"
                                    className="ro-mobile-search-fld"
                                    placeholder="Search by Area/ Region/ Requested by"
                                    value={showSearch}
                                    onChange={(e) => {
                                        onSearch(e);
                                    }}
                                />
                                <div onClick={resetPage} className="ro-mobile-search-close">
                                    <CloseCircleOutlined />
                                </div>
                            </div>
                            <div className="ro-mob-status-icon">
                                <div className="dot-pending"></div> <div style={{ marginRight: '3px' }}>Pending</div>
                                <div className="dot-approved"></div> <div style={{ marginRight: '3px' }}>Approved</div>
                                <div className="dot-rejected"></div> <div style={{ marginRight: '3px' }}>Rejected</div>
                                <div className="dot-expired-mob"></div> <div style={{ marginRight: '3px' }}>Expired</div>
                            </div>
                            <div className="ro-mobile-status-filter">
                                <Select
                                    showSearch
                                    style={{ fontSize: '11px' }}
                                    className="width120px"
                                    placeholder="PDP Unlock status"
                                    defaultValue={'ALL'}
                                    optionFilterProp="children"
                                    onChange={statusChangeHandler}
                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    // options={pdpUnlockStatus}
                                >
                                    {pdpUnlockStatus.map((data) => {
                                        return (
                                            <Option style={{ fontSize: '10px' }} value={data.value}>
                                                {data.label}
                                            </Option>
                                        );
                                    })}
                                </Select>
                            </div>
                            <div className="ro-mob-head-message">
                                <span>PDP unlock requests need to be approved by 1st approver within {expiryHours} hours from creation.</span>
                            </div>
                            <div className="mob-req-tabs">
                                <button id="RushOrder" className="mob-tablink active">
                                    PDP Unlock
                                </button>
                                {hasViewPermission(pages.SDR) && (
                                    <button
                                        id="serviceDelivery"
                                        className="mob-tablink"
                                        onClick={() => {
                                            tabFunction('Service Delivery Requests');
                                        }}>
                                        Service Delivery
                                    </button>
                                )}
                                {hasViewPermission(pages.RO_REQUESTS) && (
                                    <button
                                        id="rushOrder"
                                        className="mob-tablink"
                                        onClick={() => {
                                            tabFunction('Rush Order Requests');
                                        }}>
                                        Rush Order
                                    </button>
                                )}
                            </div>
                            <div className="ro-mobile-header-btns">
                                {isMassActionButtonsClicked && tableData.length > 0 && (
                                    <input
                                        className="ro-mobile-checkbox"
                                        ref={headerCheckBoxRef}
                                        checked={headerCheckBoxRef.current?.checked ?? false}
                                        onChange={(e) => {
                                            selectAll(e);
                                        }}
                                        type="checkbox"
                                    />
                                )}
                                {!isMassActionButtonsClicked && hasRaisePermission(pages.PDP_UNLOCK, features.APPROVED_PDP_UNLOCK_REQUESTS) && (
                                    <button type="submit" onClick={handleApprovedRequestModalOpen} className="pdp-req-add-btn">
                                        Approved Request&nbsp; <img src="/assets/images/plus-icon.svg" alt="" />
                                    </button>
                                )}
                                {!isMassActionButtonsClicked && hasRespondPermission(pages.PDP_UNLOCK) &&(
                                    <button disabled={!allowMassAction} className="approve-btn" onClick={handleMassApprove}>
                                        Approve
                                    </button>
                                )}
                                {!isMassActionButtonsClicked && hasRespondPermission(pages.PDP_UNLOCK) &&(
                                    <button disabled={!allowMassAction} className="reject-btn" onClick={handleMassReject}>
                                        Reject
                                    </button>
                                )}
                                {isMassActionButtonsClicked && (
                                    <button className="ro-cancel-btn" onClick={handleMassCancel}>
                                        Cancel
                                    </button>
                                )}
                                {isMassActionButtonsClicked && (
                                    <button className="ro-save-btn" onClick={handleMassSave}>
                                        Save
                                    </button>
                                )}
                            </div>
                        </div>
                        <Loader>
                            <div className="ro-mobile-body" style={{ marginBottom: '5px' }}>
                                {tableData.map((item, index) => {
                                    let backgroundColor = '';
                                    if (item.status === 'PENDING') backgroundColor = 'rgb(242, 216, 168)';
                                    else if (item.status === 'APPROVED') backgroundColor = '#adefc0';
                                    else if (item.status === 'REJECTED') backgroundColor = 'rgb(225 95 95 / 63%)';
                                    else if (item.status === 'EXPIRED') backgroundColor = '#d9d9d9';
                                    const email_index = pdpApprovers.indexOf(email.current);
                                    const canRespondFlag =
                                        hasRespondPermission(pages.PDP_UNLOCK) &&
                                        item.status === 'PENDING' &&
                                        email_index >= 0 &&
                                        (email_index < 1 || item.responded_by_emails?.find((e) => e.toLowerCase() === pdpApprovers[email_index - 1])) &&
                                        !item.responded_by_emails?.find((e) => e.toLowerCase() === email.current);
                                    return (
                                        <div className="ro-mobile-body-card" key={index} style={{ backgroundColor }}>
                                            {isMassActionButtonsClicked && (
                                                <input
                                                    id={index}
                                                    className="ro-mobile-checkbox-small"
                                                    type="checkbox"
                                                    disabled={!canRespondFlag}
                                                    checked={item.checked}
                                                    onChange={(event) => handleCheckbox(event, item)}
                                                />
                                            )}
                                            <div className="ro-mobile-card-ele">
                                                <span className="ro-card-ele-title">Request No.</span>
                                                <span className="text-hyperlink" onClick={(e) => handleDistributorDetailsModel(item)}>
                                                    {item.request_id}
                                                </span>
                                            </div>
                                            <div className="ro-mobile-card-ele">
                                                <span className="ro-card-ele-title">Actions</span>
                                                {canRespondFlag && !isMassActionButtonsClicked ? (
                                                    <div className="mobile-action-btns">
                                                        <i className="mobile-info-icon">
                                                            <Tooltip
                                                                placement="bottom"
                                                                title="Approve"
                                                                onClick={() => {
                                                                    handleApprove(item);
                                                                }}>
                                                                <CheckCircleOutlined />
                                                            </Tooltip>
                                                        </i>
                                                        <i className="mobile-info-icon">
                                                            <Tooltip
                                                                placement="bottom"
                                                                title="Reject"
                                                                onClick={() => {
                                                                    handleReject(item);
                                                                }}>
                                                                <CloseCircleOutlined />
                                                            </Tooltip>
                                                        </i>
                                                    </div>
                                                ) : (
                                                    <div className="mobile-action-btns">
                                                        <i className="mobile-info-icon" onClick={(e) => handleDistributorDetailsModel(item)}>
                                                            <Tooltip placement="bottom" title="View">
                                                                <EyeOutlined />
                                                            </Tooltip>
                                                        </i>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ro-mobile-card-ele">
                                                <span className="ro-card-ele-title">Start Date</span>
                                                <span>{Util.formatDate(item.start_date)}, 12:00 AM</span>
                                            </div>
                                            <div className="ro-mobile-card-ele">
                                                <span className="ro-card-ele-title">End Date</span>
                                                <span>{Util.formatDate(item.end_date)}, 11:59 PM</span>
                                            </div>
                                            <div className="ro-mobile-card-ele">
                                                <span className="ro-card-ele-title">Request Date</span>
                                                <span>
                                                    {Util.formatDate(item.requested_on)}, {Util.formatTime(item.requested_on)}
                                                </span>
                                            </div>
                                            <div className="ro-mobile-card-ele">
                                                <span className="ro-card-ele-title">Requested By</span>
                                                <span>{item.requested_by.split('#')[0]}</span>
                                            </div>
                                            <div className="ro-mobile-card-ele">
                                                <span className="ro-card-ele-title">Response Date</span>
                                                {item.responded_on?.length ? (
                                                    item.responded_on.map((date, ind) => (
                                                        <span key={ind}>
                                                            {Util.formatDate(date)}, {Util.formatTime(date)}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span>-</span>
                                                )}
                                            </div>
                                            <div className="ro-mobile-card-ele">
                                                <span className="ro-card-ele-title">Responded By</span>
                                                {item.responded_by?.length ? item.responded_by.map((item, ind) => <span key={ind}>{item}</span>) : <span>-</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Loader>
                        <Panigantion
                            data={tableData ? tableData : []}
                            itemsPerPage={itemsPerPage}
                            setItemsPerPage={setItemsPerPage}
                            itemsCount={tableDataCount}
                            setModifiedData={onChangePage}
                            pageNo={pageNo}
                        />
                    </div>
                )}

                <ApprovedPDPUnlockRequestModal
                    isModalVisible={isApprovedRequestModalOpen}
                    hideModal={handleApprovedRequestModalClose}
                    filterData={dashboardFilterCategoriesData.current}
                    submitRequest={submitApprovedRequest}
                    width={width}
                    height={height}
                />
                <DistributorDetailsModal
                    isModalVisible={isDistributionDetailsModalVisible}
                    hideModal={onCancelDbDetailsModal}
                    reqData={reqData}
                    reqDetails={reqDetails}
                    width={width}
                    height={height}
                />
            </div>
        </>
    );
};
const mapStateToProps = (state, ownProps) => {
    return {};
};
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getPdpUnlockRequests: (data) => dispatch(AdminAction.getPdpUnlockRequests(data)),
        getDbRegions: (data) => dispatch(AdminAction.getDbRegions(data)),
        getAppSettingList: () => dispatch(AdminAction.getAppSettingList()),
        updatePDPUnlockRequest: (data) => dispatch(AdminAction.updatePDPUnlockRequest(data)),
        setExpiredPdpUnlockRequests: () => dispatch(AdminAction.setExpiredPdpUnlockRequests()),
        updateMultiplePDPUnlockRequests: (data) => dispatch(AdminAction.updateMultiplePDPUnlockRequests(data)),
        insertApprovedPdpUnlockRequest: (data) => dispatch(AdminAction.insertApprovedPdpUnlockRequest(data)),
        dashboardFilterCategories: () => dispatch(AdminAction.dashboardFilterCategories()),
    };
};

const PDPRequests = connect(mapStateToProps, mapDispatchToProps)(PDPUnlockRequests);

export default PDPRequests;
