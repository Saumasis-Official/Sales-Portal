import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { DatePicker, Space, Select, Upload, Button, Tooltip, Radio, Input } from 'antd';
import { UploadOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import _ from 'lodash';
import moment from 'moment';
import XLSX from 'xlsx';
import debounce from 'lodash/debounce';

import * as AdminAction from '../actions/adminAction';
import Util from '../../../util/helper';
import { NO_DATA_SYMBOL } from '../../../constants';
import Panigantion from '../../../components/Panigantion';
import Loader from '../../../components/Loader';
import './AutoClosureReports.css';
import AutoClosureReportRemarksModal from './AutoClosureReportRemarks';

const { RangePicker } = DatePicker;

const orderTypesOptions = [
    { label: 'DBO', value: 'NORMAL' },
    { label: 'ARS', value: 'ARS' },
    { label: 'LIQ', value: 'LIQUIDATION' },
    { label: 'RO', value: 'RUSH' },
    { label: 'BO', value: 'BULK' },
    { label: 'SFL', value: 'SELF_LIFTING' },
    { label: 'CCO', value: 'CALL_CENTER' },
    { label: 'SAP_REG', value: 'SAP_REG' },
    { label: 'SAP_LIQ', value: 'SAP_LIQ' },
];
const salesOrderTypeOptions = [
    { label: 'ZOR', value: 'ZOR' },
    { label: 'ZLIQ', value: 'ZLIQ' },
    { label: 'ZSAM', value: 'ZSAM' },
];

const AutoClosureReports = (props) => {
    //-----------------------------------------------------=====Props and Constants====--------------------------------------------
    const { fetchAutoClosureReportGT, fetchAutoClosureReportMT, fetchAutoClosureMTEcomConfig } = props;
    const location = useLocation();

    //-----------------------------------------------------=====useState====-------------------------------------------------------
    const defaultDateRange = [moment().startOf('month'), moment()];
    const [payload, setPayload] = useState({
        order_date_range: defaultDateRange.map((date) => date.format('YYYY-MM-DD')),
        order_types: null,
        sales_order_types: null,
        search: '',
        upload_so: false,
        customer_groups: null,
    });
    const [tableData, setTableData] = useState([]);
    const [uploadedSoNumberFile, setUploadedSoNumberFile] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [filterOption, setFilterOption] = useState('orderTypes');
    const [showSearch, setShowSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedDateRange, setSelectedDateRange] = useState(defaultDateRange);
    const [remarksModalVisible, setRemarksModalVisible] = useState(false);
    const [remarksData, setRemarksData] = useState(null);
    const [activeTab, setActiveTab] = useState(null);
    const [customerGroups, setCustomerGroups] = useState([]);

    //-----------------------------------------------------=====useEffect====------------------------------------------------------
    useEffect(() => {
        if (activeTab === 'GT') fetchGTReport();
        else if (activeTab === 'MT') fetchMTReport();
    }, [currentPage, itemsPerPage, payload, activeTab]);

    useEffect(() => {
        const tab = location?.state?.activeTab;
        setActiveTab(tab);
        if (tab === 'MT') fetchMTConfigs();
    }, [location?.state]);

    //-----------------------------------------------------=====Event Handlers=====------------------------------------------------
    const onChangeOrderTypes = (value) => {
        const temp = _.cloneDeep(payload);
        temp.order_types = value;
        setPayload(temp);
        setUploadedSoNumberFile([]);
    };

    const onChangeSalesOrderTypes = (value) => {
        const temp = _.cloneDeep(payload);
        temp.sales_order_types = value;
        setPayload(temp);
    };

    const onChangeDateRange = (date, dateString) => {
        const temp = _.cloneDeep(payload);
        temp.order_date_range = dateString.every((date) => date === '') ? null : dateString;
        setPayload(temp);
        setSelectedDateRange(date && date.length ? date : null);
    };

    const onCustomerGroupChangeHandler = (cgs) => {
        const temp = _.cloneDeep(payload);
        temp.customer_groups = cgs;
        setPayload(temp);
    };

    async function soUploadHandler(file) {
        try {
            const convertedData = await Util.convertExcelToJson(file);
            let uploadedSo = [];
            if (convertedData && convertedData['Sales Details']?.length) {
                if (!convertedData['Sales Details'][0]['SO Number']) {
                    Util.notificationSender('Error', 'Failed to upload SO#. File must contain "SO Number" column', false);
                } else {
                    uploadedSo = [...new Set(convertedData['Sales Details'].map((d) => d['SO Number']) ?? [])];
                }
            } else if (convertedData && convertedData['Sheet1']?.length) {
                if (!convertedData.Sheet1[0]['SO Number']) {
                    Util.notificationSender('Error', 'Failed to upload SO#. File must contain "SO Number" column', false);
                } else {
                    uploadedSo = [...new Set(convertedData.Sheet1.map((d) => d['SO Number']) ?? [])];
                }
            } else {
                Util.notificationSender('Error', 'Failed to upload SO#. File must contain "SO Number" column', false);
            }
            if (uploadedSo.length > 0) {
                const temp = _.cloneDeep(payload);
                temp.so_numbers = uploadedSo.map((s) => s.toString());
                setPayload(temp);
            }
        } catch {
            Util.notificationSender('Error', 'Failed to upload SO#. File must contain "SO Number" column', false);
        }
    }

    function soUploadChangeHandler({ fileList }) {
        const validFileList = fileList.filter((file) => file);
        const latestFile = validFileList[validFileList.length - 1];
        if (latestFile) {
            latestFile.status = 'done';
        }
        setUploadedSoNumberFile(validFileList);

        // Trigger API call if file list is empty
        if (validFileList.length === 0) {
            setPayload((prevPayload) => ({
                ...prevPayload,
                so_numbers: [],
            }));
        }
    }
    const downloadTable = async () => {
        setLoading(true);
        try {
            let response;
            if (activeTab === 'MT') {
                response = await fetchAutoClosureReportMT({
                    filterOptions: {
                        ...payload,
                    },
                });
            } else if (activeTab === 'GT') {
                response = await fetchAutoClosureReportGT({
                    ...payload,
                    limit: totalItems,
                    offset: 0,
                });
            }
            if (response?.success) {
                const result = activeTab === 'MT' ? response.data : response.data.paginatedRows;
                const formattedData = result.map((row) => {
                    const currentRow = {
                        ...row,
                        order_date: row.order_date ? Util.formatDate(row.order_date) : NO_DATA_SYMBOL,
                        job_run_date: row.job_run_date ? Util.formatDate(row.job_run_date) : NO_DATA_SYMBOL,
                        so_validity: row.so_validity ? Util.formatDate(row.so_validity) : NO_DATA_SYMBOL,
                    };
                    activeTab === 'GT' && (currentRow.rdd = Util.formatDate(row.rdd, 'YYYYMMDD') ?? NO_DATA_SYMBOL);
                    if (activeTab === 'MT') {
                        currentRow.invoice_date = Util.formatDate(row.invoice_date);
                        delete currentRow.total_rows;
                    }
                    return currentRow;
                });
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(formattedData);
                XLSX.utils.book_append_sheet(wb, ws, 'Auto Closure Reports');

                // Add current date to filename
                const currentDate = Util.formatDate(new Date());
                XLSX.writeFile(wb, `auto-closure-reports-${currentDate}.xlsx`);
            }
        } catch {
            Util.notificationSender('Error', `Failed to download auto closure reports`, false);
        } finally {
            setLoading(false);
        }
    };

    const onFilterOptionChange = (e) => {
        const value = e.target.value;
        setFilterOption(value);
        setPayload({
            order_date_range: value === 'uploadFile' ? null : defaultDateRange.map((date) => date.format('YYYY-MM-DD')),
            order_types: null,
            sales_order_types: null,
            search: '',
            upload_so: value === 'uploadFile',
        });
        clearSearch();
        setUploadedSoNumberFile([]);
        setSelectedDateRange(value === 'uploadFile' ? null : defaultDateRange);
    };

    const onSearch = (e) => {
        const { value } = e.target;
        setShowSearch(value);
        debouncedSearch(value);
        setCurrentPage(1);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter') {
            onSearch(e);
        }
    };

    const onPaste = (e) => {
        e.preventDefault();
        const pastedValue = e.clipboardData.getData('Text');
        setShowSearch(pastedValue);
        debouncedSearch(pastedValue);
        setCurrentPage(1);
    };

    const debouncedSearch = useRef(
        debounce((value) => {
            setPayload((prevPayload) => ({
                ...prevPayload,
                search: value,
            }));
        }, 1000),
    ).current;

    const handleRemarksViewModal = (data) => {
        setRemarksModalVisible(true);
        setRemarksData(data);
    };

    const handleRemarksViewModalCancel = () => {
        setRemarksModalVisible(false);
        setRemarksData(null);
    };

    //-----------------------------------------------------=====API Calls=====-----------------------------------------------------
    const fetchGTReport = async () => {
        setLoading(true);
        try {
            const response = await fetchAutoClosureReportGT({
                ...payload,
                limit: itemsPerPage,
                offset: (currentPage - 1) * itemsPerPage,
            });
            if (response?.success) {
                setTableData(response.data);
                setTotalItems(response.data.totalCount);
            }
        } catch {
            Util.notificationSender('Error', `Failed to fetch auto closure reports`, false);
        } finally {
            setLoading(false);
        }
    };

    const fetchMTReport = async () => {
        setLoading(true);
        try {
            const response = await fetchAutoClosureReportMT({
                filterOptions: {
                    ...payload,
                    limit: itemsPerPage,
                    offset: (currentPage - 1) * itemsPerPage,
                },
            });
            if (response?.success) {
                const data = response.data;
                setTableData({ paginatedRows: data });
                setTotalItems(data[0]?.total_rows);
            }
        } catch {
            Util.notificationSender('Error', `Failed to fetch auto closure reports`, false);
        } finally {
            setLoading(false);
        }
    };

    const fetchMTConfigs = async () => {
        const payload = { limit: 100, offset: 0 };
        fetchAutoClosureMTEcomConfig(payload).then((result) => {
            if (result?.data?.success) {
                const data = result.data.data;
                const cgs = data.map((item) => item.customer_group);
                setCustomerGroups(cgs);
            }
        });
    };

    // ----------------------------------------------------=====Helpers=====-------------------------------------------------------
    const onChangePage = (page, itemsPerPage) => {
        setCurrentPage(page);
        setItemsPerPage(itemsPerPage);
    };

    const clearSearch = () => {
        setShowSearch('');
        setPayload((prevPayload) => ({
            ...prevPayload,
            search: '',
        }));
        setCurrentPage(1);
    };

    // ----------------------------------------------------=====Renders=====-------------------------------------------------------

    return (
        <div className="admin-dashboard-wrapper">
            <div className="admin-dashboard-block">
                <div className="auto-closure-report-header">
                    <h2 style={{ display: 'inline-block' }} className="page-tritle-rdd">
                        {activeTab ?? ''} Auto Closure Reports
                    </h2>
                </div>

                <div>
                    <Space direction="horizontal">
                        <Radio.Group onChange={onFilterOptionChange} value={filterOption}>
                            <Radio value="orderTypes">Order Types</Radio>
                            <Radio value="uploadFile">Upload File</Radio>
                        </Radio.Group>

                        {filterOption === 'orderTypes' && (
                            <>
                                {activeTab === 'GT' && (
                                    <div>
                                        <Select
                                            style={{ margin: '0 20px' }}
                                            className="width185px custom-ant-select-multiple"
                                            mode="multiple"
                                            maxTagCount={2}
                                            allowClear
                                            placeholder="Order Types"
                                            options={orderTypesOptions}
                                            onChange={onChangeOrderTypes}
                                        />
                                        <Select
                                            className="width185px custom-ant-select-multiple"
                                            mode="multiple"
                                            placeholder="Sales Order Types"
                                            maxTagCount={2}
                                            allowClear
                                            options={salesOrderTypeOptions}
                                            onChange={onChangeSalesOrderTypes}
                                        />
                                    </div>
                                )}
                                <RangePicker onChange={onChangeDateRange} value={selectedDateRange} />
                                {activeTab === 'MT' && (
                                    <Select
                                        className="width185px custom-ant-select-multiple"
                                        mode="multiple"
                                        placeholder="Customer Groups"
                                        maxTagCount={2}
                                        allowClear
                                        options={customerGroups.map((item) => ({ label: item, value: item }))}
                                        onChange={onCustomerGroupChangeHandler}
                                    />
                                )}
                            </>
                        )}
                        {filterOption === 'uploadFile' && (
                            <Upload className="custom-upload" accept=".xlsx,.csv" fileList={uploadedSoNumberFile} beforeUpload={soUploadHandler} onChange={soUploadChangeHandler}>
                                <Tooltip title={`Upload file with "SO Number" column`}>
                                    <Button icon={<UploadOutlined />}>Upload SO#</Button>
                                </Tooltip>
                            </Upload>
                        )}
                    </Space>
                </div>

                <Input
                    type="text"
                    className="search-fld-auto-closure-report"
                    placeholder="Search by PO#, SO#..."
                    value={showSearch}
                    onChange={onSearch}
                    onKeyDown={onKeyDown}
                    onPaste={onPaste}
                    allowClear
                    onClear={clearSearch}
                />

                <div className="download-button-auto-closure-gt-reports-container">
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={downloadTable}
                        className="download-button-auto-closure-gt-reports"
                        disabled={tableData.paginatedRows?.length === 0}>
                        Download
                    </Button>
                </div>
                <div className="admin-dashboard-table">
                    <table id="auto-closure-reports-table">
                        <thead>
                            <tr>
                                <th>SO#</th>
                                <th>PO#</th>
                                {activeTab === 'MT' && <th>Invoice#</th>}
                                <th>DB Code</th>
                                {activeTab === 'MT' && <th>Customer Type</th>}
                                <th>Customer Group</th>
                                {activeTab === 'GT' && <th>Order Type</th>}
                                <th>Order Date</th>
                                {activeTab === 'GT' && <th>Sales Order Type</th>}
                                {activeTab === 'GT' && <th>RDD</th>}
                                {activeTab === 'MT' && <th>Invoice Date</th>}
                                <th>SO Validity</th>
                                <th>SO Sent to SAP</th>
                                <th>SAP Overall Status</th>
                                <th>Datalake Status</th>
                                <th>Job Run Date</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="14">
                                        <Loader />
                                    </td>
                                </tr>
                            ) : (
                                tableData?.paginatedRows?.map((item, index) => {
                                    return (
                                        <tr key={index}>
                                            <td>{item.sales_order ?? NO_DATA_SYMBOL}</td>
                                            <td>{item.po_number ?? NO_DATA_SYMBOL}</td>
                                            {activeTab === 'MT' && <td>{item.invoice ? item.invoice : NO_DATA_SYMBOL}</td>}
                                            <td>{item.db_code ?? NO_DATA_SYMBOL}</td>
                                            {activeTab === 'MT' && <td>{item.customer_type ?? NO_DATA_SYMBOL}</td>}
                                            <td>{item.customer_group ?? NO_DATA_SYMBOL}</td>
                                            {activeTab === 'GT' && <td>{item.order_type ?? NO_DATA_SYMBOL}</td>}
                                            <td>{item.order_date ? Util.formatDate(item.order_date) : NO_DATA_SYMBOL}</td>
                                            {activeTab === 'GT' && <td>{item.sales_order_type ?? NO_DATA_SYMBOL}</td>}
                                            {activeTab === 'GT' && <td>{item.rdd ? Util.formatDate(item.rdd, 'YYYYMMDD') : NO_DATA_SYMBOL}</td>}
                                            {activeTab === 'MT' && <td>{item.invoice_date ? Util.formatDate(item.invoice_date) : NO_DATA_SYMBOL}</td>}
                                            <td>{item.so_validity ? Util.formatDate(item.so_validity) : NO_DATA_SYMBOL}</td>
                                            <td>{item.so_sent_to_sap ? 'YES' : 'NO'}</td>
                                            <td>{item.overall_status ? item.overall_status : NO_DATA_SYMBOL}</td>
                                            <td>{item.datalake_status ?? NO_DATA_SYMBOL}</td>
                                            <td>{item.job_run_date ? Util.formatDate(item.job_run_date) : NO_DATA_SYMBOL}</td>
                                            <td>
                                                <i className="info-icon" onClick={() => handleRemarksViewModal(item.sap_message)}>
                                                    <EyeOutlined />
                                                </i>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            {!loading && tableData?.paginatedRows?.length === 0 && (
                                <tr>
                                    <td colSpan="14" className="auto-closure-report-text">
                                        No data to display. Fetch data using appropriate filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Panigantion
                    data={tableData}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    itemsCount={totalItems}
                    setModifiedData={onChangePage}
                    pageNo={currentPage}
                />
                <AutoClosureReportRemarksModal visible={remarksModalVisible} onCancel={handleRemarksViewModalCancel} data={remarksData} />
            </div>
        </div>
    );
};

const mapStateToProps = () => {
    return {};
};

const mapDispatchToProps = (dispatch) => {
    return {
        fetchAutoClosureReportGT: (payload) => dispatch(AdminAction.fetchAutoClosureReportGT(payload)),
        fetchAutoClosureReportMT: (payload) => dispatch(AdminAction.fetchAutoClosureReportMT(payload)),
        fetchAutoClosureMTEcomConfig: (payload) => dispatch(AdminAction.fetchAutoClosureMtEcomConfig(payload)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(AutoClosureReports);
