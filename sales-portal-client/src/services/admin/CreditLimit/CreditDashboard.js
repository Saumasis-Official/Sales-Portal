import { connect } from 'react-redux';
import LocalAuth from '../../../util/middleware/auth';
import React, { useEffect, useState, useRef } from 'react';
import TransactionSummary from './SummaryTab.js';
import GTTransactionSummary from './GTSummaryTab.js';
import { CloseCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import debounce from 'lodash.debounce';
import * as Actions from '../../admin/actions/adminAction';
import '../Questionnaire/survey.css';
import '../MdmDashboard/MdmMasterDashboard.css';
import './CreditLimit.css';
import ApproverConfigure from './ApproverConfigure.js';
import { Select, DatePicker, Space, Switch, Tooltip } from 'antd';
import moment from 'moment';
import Auth from '../../../util/middleware/auth';
import AccountMaster from './AccountMaster.js';
import { hasEditPermission, pages, features } from '../../../persona/distributorNav';
import Util from '../../../util/helper/index';
import { Radio } from 'antd';
import RequestingPage from './RequestingPage.js';
import GtRequestingPage from './GtRequestingPage.js';

const { Option } = Select;

let Dashboard = (props) => {
    
    let defaultChannelFromProp;
    if (hasEditPermission(pages.CREDIT_LIMIT, features.MT_REQUEST_CHANNEL)) {
        defaultChannelFromProp = props?.location?.state?.channel ?? 'mt';
    } else {
        defaultChannelFromProp = props?.location?.state?.channel ?? 'gt';
    }

    const { getTransactionSummary, getSSODetails, sso_user_details, getGTTransactionSummary, fetch_mt_cl_report, fetch_gt_cl_report } = props;
    const defaultChannel = () => {
        if (hasEditPermission(pages.CREDIT_LIMIT, features.MT_REQUEST_CHANNEL)) {
            return 'mt';
        } else if (hasEditPermission(pages.CREDIT_LIMIT, features.GT_REQUEST_CHANNEL)) {
            return 'gt';
        }
    };
    const [selectedOption, setSelectedOption] = useState(defaultChannelFromProp || defaultChannel());

    const getDefaultChannel = () => {
        if (selectedOption === 'mt') {
            return 'Transaction Summary';
        } else if (selectedOption === 'gt') {
            return 'GT Transaction Summary';
        }
    };
    const [data, setData] = useState([]);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [pageNo, setPageNo] = useState(1);

    const [showSearch, setShowSearch] = useState('');
    const [tabName, setTabName] = useState(getDefaultChannel());
    const [status, setStatus] = useState('ALL');
    const trStatus = [
        { label: 'ALL', value: 'ALL' },
        { label: 'PENDING', value: 'PENDING' },
        { label: 'APPROVED', value: 'APPROVED' },
        { label: 'REJECTED', value: 'REJECTED' },
    ];
    const [search, setSearch] = useState('');
    const [customerGroup, setCustomerGroup] = useState([]);
    const [filteredCustomerGroup, setFilteredCustomerGroup] = useState([]);
    const adminAccessToken = LocalAuth.getAdminAccessToken();
    const { RangePicker } = DatePicker;
    const [expiry, setExpiry] = useState({});
    const [dateRange, setDateRange] = useState([null, null]);
    const [isRespondedToggled, setIsRespondedToggled] = useState(false);
    const [customerGroups, setCustomerGroups] = useState([]);
    const [isLoadingDownload, setIsLoadingDownload] = useState(false);
    const debouncedSearch = useRef(debounce((nextValue) => setSearch(nextValue), 1000)).current;
    // const [getGTrequests, setGTrequests] = useState([]);
    const [filteredRegion, setFilteredRegion] = useState([]);
    const [selectedActionType, setSelectedActionType] = useState(null);
    const [selectedRegion, setSelectedRegion] = useState([]);
    const [requestedBySearch, setRequestedBySearch] = useState('');
    const itemsPerPage = 10;
    const tabFunction = (value) => {
        setTabName(value);
         reset()
    };

    const reset=()=>{
        setShowSearch('');
        debouncedSearch('');
        setDateRange(['', '']);
        setExpiry({ fromDate: '', toDate: '' });
        setOffset(0);
        setPageNo(1);
        setStatus('ALL');
        setFilteredCustomerGroup([]);
        setIsRespondedToggled(false);
        // setGTrequests([]);
        setSelectedActionType(null);
        setFilteredRegion([])
     }
    

    const getData = async () => {
        if (adminAccessToken && tabName === 'Transaction Summary') {
            let payload = {
                queryParams: {
                    status: status,
                    search: search.trim().replace(/\s+/g, ' '),
                    limit: limit,
                    offset: offset,
                    customer_group: filteredCustomerGroup[0] == null ? [] : filteredCustomerGroup,
                    type: 'ALL',
                    from_date: expiry.fromDate ? moment(expiry.fromDate).format('YYYY-MM-DD') : '',
                    to_date: expiry.toDate ? moment(expiry.toDate).format('YYYY-MM-DD') : '',
                    responded: isRespondedToggled ? 'True' : 'False',
                },
            };
            let data = [];
            try {
                data = await getTransactionSummary(payload);
                setData(data?.data);
                setCustomerGroup(data?.data?.rows);
                setCustomerGroups(data?.data?.customerGroups);
            } catch (error) {
                return error;
            }
        }
    };

    const getGTData = async () => {
        if (adminAccessToken && tabName === 'GT Transaction Summary') {
            let payload = {
                queryParams: {
                    status: status,
                    search: search.trim().replace(/\s+/g, ' '),
                    limit: limit,
                    offset: offset,
                    region: filteredRegion[0] == null ? [] : filteredRegion,
                    type: 'ALL',
                    action_type: selectedActionType ? selectedActionType : 'ALL',
                    requestedBySearch: requestedBySearch ||'',
                },
            };
            let data = [];
            try {
                data = await getGTTransactionSummary(payload);
                setData(data?.data);
                setSelectedRegion(data?.data?.data?.regions);
            } catch (error) {
                return error;
            }
        }
    };
    useEffect(() => {
        if (!sso_user_details || !Object.keys(sso_user_details).length) {
            const adminAccessDetails = Auth.getAdminAccessDetails();
            let sso_detail = {};
            if (adminAccessDetails && Object.keys(JSON.parse(adminAccessDetails)).length > 0) {
                sso_detail = JSON.parse(adminAccessDetails);
            }
            const emailId = sso_detail?.username?.replace(process.env.REACT_APP_COGNITO_IDP_NAME, '');
            if (emailId) {
                getSSODetails(emailId, props.history);
            }
        }
    }, [sso_user_details]);

    const uniqueGroups = [...new Set(customerGroup?.map((customer) => customer?.customer_group))];

    const filterByGroup = (group) => {
        setFilteredCustomerGroup([group]);
    };

    const filterByRegion = (region) => {
        setFilteredRegion([region]);
    };

    const handleClear = () => {
        setFilteredCustomerGroup([]); // Explicitly set to null on clear
        setFilteredRegion([]);
    };

    useEffect(() => {
        if (filteredCustomerGroup) {
            getData();
        }
        getGTData();
    }, [dateRange, status, search, offset, limit, isRespondedToggled, filteredCustomerGroup, selectedActionType, selectedOption, filteredRegion,requestedBySearch]);

    useEffect(() => {
        if (uniqueGroups.length === 1) {
            filterByGroup(uniqueGroups[0]);
        }
    }, []);

    useEffect(() => {
        if (uniqueGroups.length === 1) {
            filterByGroup(uniqueGroups[0]);
        }
    }, []);

    function useDeepCompareEffect(callback, dependencies) {
        const currentDependenciesRef = useRef();

        const dependenciesString = JSON.stringify(dependencies);
        if (!currentDependenciesRef.current || currentDependenciesRef.current !== dependenciesString) {
            callback();
        }
        currentDependenciesRef.current = dependenciesString;
    }

    useDeepCompareEffect(() => {
        setOffset(0);
        setPageNo(1);
        getData();
        getGTData();
    }, [search]);

    const onSearch = (e) => {
        const payload = e;
        debouncedSearch(payload);
        setShowSearch(payload);
        setPageNo(1);
    };
    const resetPage = () => {
        debouncedSearch('');
        setShowSearch('');
        setOffset(0);
        setPageNo(1);
        setDateRange(['', '']);
        setStatus('ALL');
        setSelectedActionType(null);
    };

    const formulateRangePickerValues = () => {
        let startDate = dateRange[0] ? moment(dateRange[0]) : null;
        let endDate = dateRange[1] ? moment(dateRange[1]) : null;
        return [startDate, endDate];
    };

    const handleDateChange = (dateArray) => {
        const formattedExpiry = {
            fromDate: dateArray?.[0] ? dateArray[0] : '',
            toDate: dateArray?.[1] ? dateArray[1] : '',
        };
        // setFilteredCustomerGroup([])
        setExpiry(formattedExpiry);
        setDateRange([formattedExpiry.fromDate, formattedExpiry.toDate]);
        setSearch(search);
        setOffset(0);
        setLimit(10);
        setPageNo(1);
    };

    const statusChangeHandler = (value) => {
        setStatus(value);
        setLimit(itemsPerPage);
        setOffset(0);
        setPageNo(1);
    };

    const disabledDate = (current) => {
        const oneYearAgo = moment().subtract(1, 'year');
        const fourMonthsFromNow = moment().add(4, 'months');
        return current.isBefore(oneYearAgo) || current.isAfter(fourMonthsFromNow);
    };

    const handleOptionChange = (value) => {
        setSelectedActionType(value);
    };

    const downloadAllData = async () => {
        try {
            setIsLoadingDownload(true);
            if(tabName === 'Transaction Summary'){
                const responseData = await fetch_mt_cl_report();
                if (!responseData) {
                    Util.notificationSender('Error', 'Failed to fetch report data', false);
                    return;
                }
                const rows = responseData?.data?.rows;
                if (!Array.isArray(rows) || rows.length === 0) {
                    Util.notificationSender('Error', 'No data available for download', false);
                    return;
                }
    
                const formattedData = rows.map((row) => ({
                    'Transaction ID': row.transaction_id || '-',
                    'Child ID': row.childid || '-',
                    'Payer Code': row.payercode || '-',
                    'Payer Name': row.payer_name || '-',
                    'Customer Group': row.customer_group || '-',
                    'Expiry Date': row.expirydate ? Util.formatDate(row.expirydate) : '-',
                    'Base Limit (₹)': row.baselimit || '-',
                    'Extension Amount (₹)': row.amount_requested || '-',
                    'Requested On': row.requested_on ? `${Util.formatDate(row.requested_on)} ${Util.formatTime(row.requested_on)}` : '-',
                    'Requested By': row.requested_by || '-',
                    'Approved By': row.responded_by && row.responded_by.length > 0 ? [...row.responded_by].reverse().join(', \n') : '-',
                    'Approved On': row.responded_on && row.responded_on.length > 0 ? Util.formatDatesArray(row.responded_on) : '-',
                    Status: row.status || '-',
                }));
    
                const fileName = `MT-Credit-Report-${Util.formatDate(new Date())}`;
                await new Promise((resolve) => {
                    const success = Util.CLdownloadExcelFile(formattedData, fileName);
                    if (success) {
                        Util.notificationSender('Success', 'MT Report downloaded successfully', true);
                    }
                    setTimeout(resolve, 100);
                });
            } 
            else if(tabName === 'GT Transaction Summary'){
                const responseData = await fetch_gt_cl_report();
                if (!responseData) {
                    Util.notificationSender('Error', 'Failed to fetch report data', false);
                    return;
                }
                const rows = responseData?.data?.rows;
                if (!Array.isArray(rows) || rows.length === 0) {
                    Util.notificationSender('Error', 'No data available for download', false);
                    return;
                }
                
                const formattedData = rows.map((row) => {
                    return {
                        'Transaction ID': row.transaction_id || '-',
                        'Child ID': row.child_id || '-',
                        'Distributor Code': row.distributor_code || '-',
                        'Distributor Name': row.distributor_name || '-',
                        'Region': row.region || '-',
                        'File Action Type': row.file_action_type || '-',
                        'Start Date': row.start_date ? Util.formatDateTime(row.start_date) : '-',
                        'End Date': row.end_date ? (row.end_date === '9999-12-12' ? '99-99-9999' : Util.formatDateTime(row.end_date)) : '-',
                        'Base Limit (₹)': row.baselimit || '-',
                        'Amount (₹)': row.amount || '-',
                        'Requested By': row.requested_by || '-',
                        'Date of upload': row.requested_on ? `${Util.formatDate(row.requested_on)} ${Util.formatTime(row.requested_on)}` : '-',
                        'Approved By': row.approved_by && row.approved_by.length > 0 ? [...row.approved_by].reverse().join(', \n') : '-',
                        'Approved On': row.approved_on && row.approved_on.length > 0 ? Util.formatDatesArray(row.approved_on) : '-',
                        'Status': row.status || '-',
                    };
                });
    
                const fileName = `GT-Credit-Report-${Util.formatDate(new Date())}`;
                await new Promise((resolve) => {
                    const success = Util.CLdownloadExcelFile(formattedData, fileName);
                    if (success) {
                        Util.notificationSender('Success', 'GT Report downloaded successfully', true);
                    }
                    setTimeout(resolve, 100);
                });
            }
          

        } catch (error) {
            console.error('Download process error:', error);
            Util.notificationSender('Error', 'Failed to process report data', false);
        } finally {
            setTimeout(() => {
                setIsLoadingDownload(false);
            }, 1000);
        }
    };

    const handleChannelChange = (e) => {
        const newChannel = e.target.value;
        setSelectedOption(newChannel);
        if (newChannel === 'mt') {
            setTabName('Transaction Summary');
        } else if (newChannel === 'gt') {
            setTabName('GT Transaction Summary');
        }
        reset()
    };
    return (
        <div className="admin-dashboard-wrapper ecom-table">
            <div className="admin-dashboard-block">
                {/* <div className="admin-dashboard-head Mdm-Header"> */}
                <div className="credit-dashboard-headers">
                    <div>
                        {tabName === 'Transaction Summary' && <h2 className="card-row-col">Transactions Summary</h2>}
                        {tabName === 'Requesting Page' && <h2 className="card-row-col">Credit Extension Request Form</h2>}
                        {tabName === 'GT Transaction Summary' && <h2 className="card-row-col">GT Transactions Summary</h2>}
                        {tabName === 'Account Master' && <h2 className="card-row-col">Account Master</h2>}
                        {tabName === 'Approver Configuration' && <h2 className="card-row-col">Configuration</h2>}
                        {tabName === 'GT Requesting Page' && <h2 className="card-row-col">Credit Extension Request Form</h2>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {tabName === 'Transaction Summary' && (
                            <div className="mt-ecom-downloadbtn">
                                <Tooltip title="Download MT-Credit Limit Report" placement="bottom">
                                    <button onClick={() => downloadAllData()} disabled={isLoadingDownload}>
                                        {isLoadingDownload ? 'Downloading...' : 'Reports'} <DownloadOutlined />
                                    </button>
                                </Tooltip>
                            </div>
                        )}
                        {tabName === 'GT Transaction Summary' && (
                            <div className="mt-ecom-downloadbtn">
                                <Tooltip title="Download GT-Credit Limit Report" placement="bottom">
                                    <button onClick={() => downloadAllData()} disabled={isLoadingDownload}>
                                        {isLoadingDownload ? 'Downloading...' : 'Reports'} <DownloadOutlined />
                                    </button>
                                </Tooltip>
                            </div>
                        )}
                        <div style={{ marginTop: '10px' }}>
                            <p>
                                <span id="customer-grp-p">Channel: </span>
                                <Radio.Group onChange={handleChannelChange} value={selectedOption} id="radio-grp">
                                    {hasEditPermission(pages.CREDIT_LIMIT, features.MT_REQUEST_CHANNEL) && <Radio value="mt">Alternate Channel</Radio>}
                                    {hasEditPermission(pages.CREDIT_LIMIT, features.GT_REQUEST_CHANNEL) && <Radio value="gt">GT</Radio>}
                                </Radio.Group>
                            </p>
                        </div>
                    </div>
                </div>
                {/* </div> */}

                <div className="ecom-header-two">
                    <div className="dashboard-tabs">
                        {selectedOption === 'mt' ? (
                            <>
                                {hasEditPermission(pages.CREDIT_LIMIT, features.TRANSACTIONS_VIEW) && (
                                    <button className={tabName === 'Transaction Summary' ? `tablink active` : 'tablink'} onClick={() => tabFunction('Transaction Summary')}>
                                        <span>Transactions</span>
                                    </button>
                                )}
                                {hasEditPermission(pages.CREDIT_LIMIT, features.ACCOUNT_VIEW) && (
                                    <button className={tabName === 'Account Master' ? `tablink active` : 'tablink'} onClick={() => tabFunction('Account Master')}>
                                        <span>Accounts</span>
                                    </button>
                                )}
                                {hasEditPermission(pages.CREDIT_LIMIT, features.CREATE_REQUEST_CL) && (
                                    <button className={tabName === 'Requesting Page' ? `tablink active` : 'tablink'} onClick={() => tabFunction('Requesting Page')}>
                                        <span>Request Form</span>
                                    </button>
                                )}

                                {hasEditPermission(pages.CREDIT_LIMIT, features.APPROVER_CONFIG) && (
                                    <button className={tabName === 'Approver Configuration' ? `tablink active` : 'tablink'} onClick={() => tabFunction('Approver Configuration')}>
                                        <span>Approver Config</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                {hasEditPermission(pages.CREDIT_LIMIT, features.GT_REPORTS_SECTION) && (
                                    <button className={tabName === 'GT Transaction Summary' ? `tablink active` : 'tablink'} onClick={() => tabFunction('GT Transaction Summary')}>
                                        <span>GT Reports Section</span>
                                    </button>
                                )}
                                {hasEditPermission(pages.CREDIT_LIMIT, features.CREATE_REQUEST_CL) && (
                                    <button className={tabName === 'GT Requesting Page' ? `tablink active` : 'tablink'} onClick={() => tabFunction('GT Requesting Page')}>
                                        <span>Request Form</span>
                                    </button>
                                )}
                                {hasEditPermission(pages.CREDIT_LIMIT, features.VIEW_GT_CONFIG) && (
                                    <button className={tabName === 'Approver Configuration' ? `tablink active` : 'tablink'} onClick={() => tabFunction('Approver Configuration')}>
                                        <span>Configuration</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {tabName === 'Transaction Summary' && (
                    <div className="admin-dashboard-head-bottom" style={{ marginTop: '20px' }}>
                        <div className="dashboard-parent-div">
                            <div style={{ paddingRight: '5px' }}>
                                <Select
                                    placeholder="Customer Group"
                                    style={{ width: '110px' }}
                                    onClear={handleClear}
                                    allowClear={customerGroups?.length > 0}
                                    onChange={(value) => filterByGroup(value)}>
                                    {customerGroups?.map((group) => (
                                        <Option key={group} value={group}>
                                            {group}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div style={{ paddingRight: '5px', position: 'relative' }}>
                                <input
                                    type="text"
                                    className="dash-search-fld-cl"
                                    id="credit-search-box"
                                    placeholder={'Search by Trans.id, Payer Name, Code, Requested By'}
                                    value={showSearch}
                                    onChange={(e) => {
                                        onSearch(e.target.value);
                                    }}
                                />
                                <div
                                    onClick={() => {
                                        resetPage();
                                    }}
                                    className="dash-search-close-cl">
                                    <CloseCircleOutlined />
                                </div>
                            </div>
                            <div style={{ paddingRight: '5px' }}>
                                <Space direction="vertical">
                                    <RangePicker
                                        value={formulateRangePickerValues()}
                                        allowClear={true}
                                        placeholder={['From Date', 'To Date']}
                                        format="YYYY-MM-DD"
                                        onChange={(value, ds) => {
                                            handleDateChange(ds);
                                        }}
                                        disabledDate={disabledDate}
                                        style={{ height: '32px' }}
                                    />
                                </Space>
                                <div className="filter-by-responded">
                                    <Switch checked={isRespondedToggled} onChange={setIsRespondedToggled} />
                                    <span style={{ marginLeft: 5 }}>Filter By Responded</span>
                                </div>
                            </div>
                            <div style={{ paddingRight: '5px' }}>
                                <Select
                                    showSearch
                                    // allowClear
                                    style={{ fontSize: '13px', width: '110px' }}
                                    className="width90px"
                                    placeholder="Select Status"
                                    defaultValue={'ALL'}
                                    optionFilterProp="children"
                                    onChange={statusChangeHandler}
                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    options={trStatus}
                                />
                            </div>

                            <div style={{ paddingLeft: '5px' }}>
                                {tabName === 'Transaction Summary' && (
                                    <div className="cl-info-item1">
                                        <div className="dot-pending"></div> <div style={{ marginRight: '4px' }}>Pending</div>
                                        <div className="dot-approved"></div> <div style={{ marginRight: '4px' }}>Approved</div>
                                        <div className="dot-rejected"></div> <div style={{ marginRight: '4px' }}>Rejected</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {tabName === 'GT Transaction Summary' && (
                    <div className="admin-dashboard-head-bottom" style={{ marginTop: '20px' }}>
                        <div className="dashboard-parent-div">
                            <div style={{ paddingRight: '5px' }}>
                                <Select
                                    placeholder="Cluster"
                                    style={{ width: '110px' }}
                                    onClear={handleClear}
                                    allowClear={selectedRegion?.length > 0}
                                    onChange={(value) => filterByRegion(value)}>
                                    {selectedRegion?.map((group) => (
                                        <Option key={group} value={group}>
                                            {group}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div style={{ paddingRight: '5px', position: 'relative' }}>
                                <input
                                    type="text"
                                    className="dash-search-fld-cl"
                                    style={{ width: '340px' }}
                                    placeholder={'Search by Trans.id, Party Name, Code, Requested by'}
                                    value={showSearch}
                                    onChange={(e) => {
                                        onSearch(e.target.value);
                                    }}
                                />
                                <div
                                    onClick={() => {
                                        resetPage();
                                    }}
                                    className="dash-search-close-cl">
                                    <CloseCircleOutlined />
                                </div>
                            </div>
                            <div>
                                <Select
                                    placeholder="Action Type"
                                    style={{ width: '210px', marginRight: '10px' }}
                                    defaultValue={'ALL'}
                                    allowClear
                                    onChange={handleOptionChange}
                                    value={selectedActionType}>
                                    <Option value="BASE_LIMIT_UPLOAD">Base Limit Upload</Option>
                                    <Option value="BASE_LIMIT_REMOVAL">Base Limit Removal</Option>
                                    <Option value="ADDITIONAL_LIMIT_UPLOAD">Additional Limit Upload</Option>
                                    <Option value="ADDITIONAL_LIMIT_REMOVAL">Additional Limit Removal</Option>
                                </Select>
                            </div>
                            <div style={{ paddingRight: '5px' }}>
                                <Select
                                    showSearch
                                    // allowClear
                                    style={{ fontSize: '13px', width: '110px' }}
                                    className="width90px"
                                    placeholder="Select Status"
                                    defaultValue={'ALL'}
                                    optionFilterProp="children"
                                    onChange={statusChangeHandler}
                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    options={trStatus}
                                />
                            </div>

                            <div style={{ paddingLeft: '5px' }}>
                                {tabName === 'GT Transaction Summary' && (
                                    <div className="cl-info-item1">
                                        <div className="dot-pending"></div> <div style={{ marginRight: '4px' }}>Pending</div>
                                        <div className="dot-approved"></div> <div style={{ marginRight: '4px' }}>Approved</div>
                                        <div className="dot-rejected"></div> <div style={{ marginRight: '4px' }}>Rejected</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <div>
                    {tabName === 'Transaction Summary' && (
                        <TransactionSummary tableData={data} status={setStatus} updatedLimit={setLimit} updatedOffset={setOffset} pageNo={pageNo} setPageNo={setPageNo} />
                    )}
                    {tabName === 'Account Master' && <AccountMaster></AccountMaster>}
                    {tabName === 'Requesting Page' && <RequestingPage></RequestingPage>}
                    {tabName === 'GT Requesting Page' && <GtRequestingPage></GtRequestingPage>}
                    {tabName === 'GT Transaction Summary' && (
                        <GTTransactionSummary tableData={data} status={setStatus} updatedLimit={setLimit} updatedOffset={setOffset} pageNo={pageNo} requestedBySearch={setRequestedBySearch} setPageNo={setPageNo} />
                    )}
                    {tabName === 'Approver Configuration' && <ApproverConfigure channel={selectedOption} setTabName={setTabName}></ApproverConfigure>}
                </div>
            </div>
        </div>
    );
};
const mapStateToProps = (state) => {
    return {
        sso_user_details: state.admin.get('sso_user_details'),
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        getAppSettingList: () => dispatch(Actions.getAppSettingList()),
        getTransactionSummary: (data) => dispatch(Actions.getTransactionSummary(data)),
        getGTTransactionSummary: (data) => dispatch(Actions.getGTTransactionSummary(data)),
        getSSODetails: (emailId, history) => dispatch(Actions.getSSODetails(emailId, history)),
        fetch_mt_cl_report: () => dispatch(Actions.fetch_mt_cl_report()),
        fetch_gt_cl_report: () => dispatch(Actions.fetch_gt_cl_report()),
    };
};

const CreditDashboard = connect(mapStateToProps, mapDispatchToProps)(Dashboard);

export default CreditDashboard;
