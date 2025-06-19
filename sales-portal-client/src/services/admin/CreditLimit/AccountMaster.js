import React, { useState, useEffect, useRef } from 'react';
import { Select, notification, Modal, Alert, Input } from 'antd';
import './AccountMaster.css';
import { connect } from 'react-redux';
import { HistoryOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import * as Action from '../actions/adminAction';
import { hasEditPermission, pages, features } from '../../../persona/distributorNav';
import { NO_DATA_SYMBOL } from '../../../constants/index.js';
import Panigantion from '../../../components/Panigantion';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import debounce from 'lodash.debounce';
import AccountMasterErrorModal from './AccountMasterErrorModal.js';
import Util from '../../../util/helper';

const { Option } = Select;

const AccountMaster = (props) => {
    const { account_master_list, customer_group_list, uploadBaseLimit, get_latest_upload_record } = props;
    const [showSearch, setShowSearch] = useState('');
    const [limit, setLimit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [pageNo, setPageNo] = useState(1);
    const [search, setSearch] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [loading, setLoading] = useState(false);
    const [customerDetails, setCustomerDetails] = useState([]);
    const [selectedCustomerGroup, setSelectedCustomerGroup] = useState('');
    const [tableData, setTableData] = useState(null);
    const [previousPayload, setPreviousPayload] = useState(null); // The crucial addition
    const [remarks, setRemarks] = useState('');
    const [remarksError, setRemarksError] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [fileName, setFileName] = useState('');
    const [uploadedFile, setUploadedFile] = useState({});
    const [sortDirection, setSortDirection] = useState(false);
    const debouncedSearch = useRef(debounce((nextValue) => setSearch(nextValue), 1000)).current;
    const [uploadErrors, setUploadErrors] = useState([]);
    const [uploadErrorsModalVisible, setUploadErrorsModalVisible] = useState(false);
    const [uploadErrorsMessage, setUploadErrorsMessage] = useState('');
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
    function closeModal() {
        setIsUploadModalOpen(false);
        setFileName('');
        setRemarks('');
        setRemarksError('');
    }
    const uploadData = async () => {
        setIsConfirmModalVisible(false);
        setIsUploadModalOpen(false);
        setLoading(true);
        setRemarksError('');
        setRemarks('');

        const formData = new FormData();
        formData.append('file', uploadedFile);
        if (remarks) {
            formData.append('remarks', JSON.stringify({ remarks: remarks }));
        }

        if (!uploadedFile) {
            notification.error({
                message: 'Error',
                description: 'Please select a file to upload',
            });
            setLoading(false);
        }

        try {
            if (uploadedFile) {
                notification.success({
                    message: 'Processing',
                    description: 'Please wait, File is getting validated in background.',
                    duration: 5,
                });
            }
            const response = await uploadBaseLimit(formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setLoading(false);

            if (response?.data?.success) {
                notification.success({
                    message: 'Success',
                    description: response.data.message || 'File uploaded successfully',
                    duration: 4,
                    className: 'notification-green',
                });
                let payload = {
                    data: {
                        search: search,
                        limit: limit,
                        offset: offset,
                        customer_group: selectedCustomerGroup,
                    },
                };

                notification.info({
                    message: 'Refreshing Data',
                    description: 'Please wait while we fetch the updated list.',
                    duration: 3,
                });

                const listResponse = await account_master_list(payload);
                if (listResponse) {
                    setTableData(listResponse.data);
                }
            } else {
                if (response.data.message === 'Validation Error') {
                    const errors = response.data.errors || [];
                    setUploadErrors(errors);
                    setUploadErrorsMessage(response.data.message || 'Error occurred during upload');
                    setUploadErrorsModalVisible(true);
                } else {
                    notification.error({
                        message: 'Error Occurred',
                        description: response.data.message,
                        duration: 5,
                        className: 'notification-error',
                    });
                }
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            setLoading(false);
            console.log(loading);
            notification.error({
                message: 'Error Occurred',
                description: 'Technical Error, File upload failed',
                duration: 5,
                className: 'notification-error',
            });
        }

        setRemarks('');
        setRemarksError('');
        setFileName('');
        setUploadedFile(null);
    };

    // Add this new function to handle confirmation cancel
    const handleConfirmCancel = () => {
        setIsConfirmModalVisible(false);
    };

    const hidePopup = () => {
        setUploadErrorsModalVisible(false);
    };

    const onChange = (e) => {
        const fileUploaded = e.target.files[0];
        if (fileUploaded) {
            const fileExtension = fileUploaded.name.split('.').pop().toLowerCase();
            if (fileExtension === 'xlsx') {
                setFileName(fileUploaded.name);
                setUploadedFile(fileUploaded);
            } else {
                notification.error({
                    message: 'Invalid File Type',
                    description: 'Please upload a valid .xlsx file',
                    duration: 5,
                    className: 'notification-error',
                });
            }
        } else {
            notification.error({
                message: 'No File Uploaded',
                description: 'Please upload a file',
                duration: 5,
                className: 'notification-error',
            });
            setRemarks('');
            setRemarksError('');
            setFileName('');
            setUploadedFile(null);
        }
        e.target.value = null;
    };

    const handleRemarksChange = (e) => {
        setRemarks(e.target.value);
        if (e.target.value.length >= 10) {
            setRemarksError('');
        } else {
            setRemarksError('Remarks must be at least 10 characters.');
        }
    };

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
        setSearch('');
    };

    const onReset = () => {
        setSelectedCustomerGroup(null);
        setOffset(0);
        setLimit(10);
        setPageNo(1);
        setTableData([]);
    };

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    useEffect(() => {
        const fetchCustomerDetails = async () => {
            try {
                const response = await customer_group_list();
                if (response && response.data) {
                    const customerGroupDetails = response.data.rows.map(item => ({
                        value: item.customer_group,
                        label: `${item.customer_group} - ${item.description}`
                    }));
                    setCustomerDetails(customerGroupDetails);
                  }
            } catch (error) {
                console.error('Error fetching customer details:', error);
            }
        };
        fetchCustomerDetails();
    }, []);

    useEffect(() => {
        if (selectedCustomerGroup !== null) {
            handleCustomerGroup(selectedCustomerGroup);
        } else {
            setTableData([]);
        }
    }, [selectedCustomerGroup, limit, offset, search]);

    const handleCustomerGroup = async () => {
        setLoading(true);

        let payload = {
            data: {
                search: search,
                limit: limit,
                offset: offset,
                customer_group: selectedCustomerGroup,
                // type: ""  //Download or view
            },
        };
        setPreviousPayload(payload);
        let response = [];
        try {
            if (payload) {
                response = await account_master_list(payload);
                if (response) {
                    setTableData(response.data);
                }
            } else {
                setTableData([]);
                setPreviousPayload(null);
            }
        } catch (error) {
            console.error('Error downloading Excel:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        // setDownloadLoading(true);
        if (!selectedCustomerGroup) {
            notification.info({
                message: 'Please select a customer group to download the Excel file format.',
                duration: 3,
                className: 'notification-red',
            });
            // setDownloadLoading(false);
            return;
        }
        try {
            const downloadPayload = { ...previousPayload };
            downloadPayload.data.type = 'Download';
            const apiResponse = await account_master_list(downloadPayload);

            if (!apiResponse?.data?.rows || apiResponse.data.rows.length === 0) {
                Notification.error({
                    message: 'No Data to Download',
                    description: 'No data found for the selected customer group.',
                    duration: 3,
                    className: 'notification-error',
                });
                // setDownloadLoading(false);
                return;
            }
            // setDownloadData(apiResponse.data.rows);
            const downloadData = apiResponse?.data?.rows.map((row) => ({
                'Payer Code': row.payer_code ?? NO_DATA_SYMBOL,
                'Payer Name': row.payer_name ?? NO_DATA_SYMBOL,
                'Base Limit': row.base_limit ?? NO_DATA_SYMBOL,
                // 'SAP Base Limit': row.sap_base_limit ?? NO_DATA_SYMBOL,
                'Updated Base Limit': '',
            }));
            const worksheet = XLSX.utils.json_to_sheet(downloadData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Master');
            const excelBuffer = XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'array',
            });
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const filename = `${selectedCustomerGroup}_account_master.xlsx`;
            saveAs(blob, filename);

            notification.success({
                message: 'Download Successfull',
                description: `"${filename}" has been downloaded successfully.`,
                duration: 3,
                className: 'notification-success',
            });
        } catch (error) {
            console.error('Error downloading Excel:', error);
            notification.error({
                message: 'Download Error',
                description: 'An error occurred while downloading. Please try again.',
                duration: 3,
                className: 'notification-error',
            });
        } finally {
            // setDownloadLoading(false);
        }
    };

    const sortColumn = (columnName) => {
        const newSortDirection = !sortDirection;
        setSortDirection(newSortDirection);

        const sortedRows =
            tableData && tableData.rows
                ? [...tableData.rows].sort((a, b) => {
                      let comparison = 0;

                      const aValue = columnName === 'credit' ? parseFloat(a && a[columnName] ? a[columnName] : 0) : a && a[columnName] ? a[columnName] : '';

                      const bValue = columnName === 'credit' ? parseFloat(b && b[columnName] ? b[columnName] : 0) : b && b[columnName] ? b[columnName] : '';

                      if (aValue < bValue) {
                          comparison = -1;
                      }
                      if (aValue > bValue) {
                          comparison = 1;
                      }
                      return newSortDirection ? comparison : comparison * -1;
                  })
                : [];

        tableData.rows = sortedRows;
    };
    // Separate function to handle initial upload button click
    const handleInitialUploadClick = async () => {
        try {
            const response = await get_latest_upload_record();
            if (response?.data) {
                if (!response.data.job_complete) {
                    notification.warning({
                        message: 'Upload in Progress',
                        description: 'Please wait previous upload is processing in background.',
                        duration: 3,
                    });
                    return;
                }
                // If job is complete, open upload modal
                setIsUploadModalOpen(true);
            } else {
                // If no previous upload exists
                setIsUploadModalOpen(true);
            }
        } catch (error) {
            console.error('Error checking upload status:', error);
            notification.error({
                message: 'Error',
                description: 'Failed to check upload status',
                duration: 3,
            });
        }
    };

    // Modify handleUploadClick to handle confirmation
    const handleUploadClick = () => {
        if (remarks.length < 10 || fileName === '') {
            return;
        }
        setIsConfirmModalVisible(true);
    };

    return (
        <>
            <div>
                <div className="header-account-cl">
                    <div style={{ paddingRight: '5px' }}>
                        <Select
                            placeholder="Customer Group"
                            style={{ width: '150px' }}
                            allowClear
                            onChange={(value) => {
                                setSelectedCustomerGroup(value);
                                setOffset(0);
                                setPageNo(1);
                            }}
                            onClear={onReset}>
                            {customerDetails.map((group) => (
                                <Option key={group.value} value={group.value}>
                                    {group.label}
                                </Option>
                            ))}
                        </Select>
                    </div>

                    <div className="dash-search-fld-cl-container" style={{ paddingRight: '5px' }}>
                        <input
                            type="text"
                            className="dash-search-fld-cl"
                            style={{ width: '350px' }}
                            placeholder="Search by Payer Code / Payer Code Name"
                            value={showSearch}
                            onChange={(e) => {
                                onSearch(e.target.value);
                            }}
                        />

                        <div onClick={resetPage} className="account-search-close-cl">
                            <CloseCircleOutlined />
                        </div>
                    </div>
                    <div>
                        {hasEditPermission(pages.CREDIT_LIMIT, features.REMARKS_VIEW) && (
                            <div>
                                <button className="account-button-cl" onClick={handleDownload}>
                                    <> Download</>
                                </button>
                                <button className="account-button-cl" onClick={handleInitialUploadClick}>
                                    Upload
                                </button>
                            </div>
                        )}
                        <Modal
                            title="Upload File"
                            visible={isUploadModalOpen}
                            onCancel={closeModal}
                            onOk={handleUploadClick}
                            okButtonProps={{
                                disabled: remarks.length < 10 || fileName === '',
                            }}
                            className="excel-upload-modal">
                            <div className="Upload-div forecast-upload-modal">
                                <label htmlFor="fileInput">
                                    <img width="120px" className="forecast-upload-icon" src="/assets/images/cloud-upload.svg" alt="" />
                                </label>
                                <input id="fileInput" type="file" accept=".xlsx" onChange={onChange} />
                                <p className="acc-p-upload">{fileName}</p>
                            </div>
                            <br />
                            <div style={{ marginBottom: '20px' }}>
                                <label>
                                    Remarks<b className="mandatory-mark">*</b> :{' '}
                                </label>
                                <Input.TextArea value={remarks} onChange={handleRemarksChange} rows={2} />
                                {remarksError && <p style={{ color: 'red' }}>{remarksError}</p>}
                            </div>
                            <Alert
                                message={
                                    <span style={{ paddingLeft: '30px' }}>
                                        <b>Informational Notes</b>
                                    </span>
                                }
                                description={
                                    <ul style={{ paddingLeft: '20px' }}>
                                        <li>
                                            <b className="mandatory-mark">*</b>Please upload a valid .xlsx file only.
                                        </li>
                                    </ul>
                                }
                                type="info"
                                showIcon
                            />
                        </Modal>

                        <Modal title="Confirm Action" visible={isConfirmModalVisible} onOk={uploadData} onCancel={handleConfirmCancel} okText="Confirm" cancelText="Cancel">
                            <div>
                                <p>You are about to initiate a bulk update of Base Credit Limit. Please review the following important information:</p>
                                <ul className="acc-confirmation-ul">
                                    <li className="acc-confirmation-list">
                                        <span className="acc-onfirmation-span">•</span>
                                        <span>This process will take several minutes to complete</span>
                                    </li>
                                    <li className="acc-confirmation-list">
                                        <span className="acc-onfirmation-span">•</span>
                                        <span>Once started, the process cannot be interrupted</span>
                                    </li>
                                    <li className="acc-confirmation-list">
                                        <span className="acc-onfirmation-span">•</span>
                                        <span>Existing Extended Credit Limit values will be invalidated for affected payer codes</span>
                                    </li>
                                </ul>
                            </div>
                            <p className="acc-confirm-action-text">Are you sure you want to proceed with this update?</p>
                        </Modal>
                    </div>
                </div>

                <div className="admin-dashboard-table">
                    <table>
                        <thead>
                            <tr>
                                <th className="sub-header" width="30px" onClick={() => sortColumn('payer_code')}>
                                    Payer Code <img src="/assets/images/sorting_icon.svg" alt="" />
                                </th>
                                <th className="sub-header" width="80px" onClick={() => sortColumn('payer_name')}>
                                    Payer Code Name <img src="/assets/images/sorting_icon.svg" alt="" />
                                </th>
                                <th className="sub-header" width="80px" onClick={() => sortColumn('base_limit')}>
                                    Base Credit Limit <img src="/assets/images/sorting_icon.svg" alt="" />
                                </th>
                                {/* <th className="sub-header" width="80px" onClick={() => sortColumn('sap_base_limit')}>
                                    SAP Credit Limit <img src="/assets/images/sorting_icon.svg" alt="" />
                                </th> */}
                                <th className="sub-header" width="150px">
                                    Extended Credit Limit (approved)
                                </th>
                                <th className="sub-header" width="150px">
                                    Extended CL % <br />
                                    (for Extended CL)
                                </th>
                                <th className="sub-header" width="80px">
                                    Expiry Date
                                </th>
                                <th className="sub-header" width="150px">
                                    Total Credit Limit
                                    <br /> (Base CL + Extended CL)
                                </th>
                                <th className="sub-header" width="10px">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData?.rows?.map((row, index) => (
                                <tr key={index}>
                                    <td>{row?.payer_code ? row.payer_code : NO_DATA_SYMBOL}</td>
                                    <td>{row?.payer_name ? row.payer_name : NO_DATA_SYMBOL}</td>
                                    <td>{row?.base_limit ? row?.base_limit : NO_DATA_SYMBOL}</td>
                                    {/* <td>{row?.sap_base_limit ? row?.sap_base_limit : NO_DATA_SYMBOL}</td> */}
                                    <td>{row?.amount_requested ? row.amount_requested : NO_DATA_SYMBOL}</td>
                                    <td>{row?.percentage_base_limit ? row.percentage_base_limit : NO_DATA_SYMBOL}</td>
                                    <td>{row?.expirydate ? Util.formatDate(row?.expirydate, 'YYYY-MM-DD') : NO_DATA_SYMBOL}</td>
                                    <td>{row?.total_base_limit ? parseFloat(row.total_base_limit).toFixed(2) : row?.base_limit ? row?.base_limit : NO_DATA_SYMBOL}</td>
                                    <td>
                                        <Popover
                                            content={
                                                <div className="time-details ">
                                                    <p style={{ marginBottom: '5px' }}>
                                                        <b>
                                                            <i>Last Updated by:</i>
                                                        </b>
                                                        {row?.full_name ? `  ${row.full_name}(${row.updated_by.split('#')[0]})` : NO_DATA_SYMBOL}
                                                    </p>
                                                    <p style={{ marginBottom: '5px' }}>
                                                        <b>
                                                            <i>Remarks:</i>
                                                        </b>
                                                        {row?.remarks ? `  ${row.remarks}` : NO_DATA_SYMBOL}
                                                    </p>
                                                    <p style={{ marginBottom: '5px' }}>
                                                        <b>
                                                            <i>Last Updated timestamp:</i>
                                                        </b>
                                                        {row?.updated_on ? `   ${Util.formatDate(row.updated_on)}, ${Util.formatTime(row.updated_on)}` : NO_DATA_SYMBOL}
                                                    </p>
                                                </div>
                                            }
                                            title=""
                                            trigger="hover"
                                            placement="leftBottom">
                                            <HistoryOutlined className="padding5px" />
                                        </Popover>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {uploadErrorsModalVisible && <AccountMasterErrorModal visible={uploadErrorsModalVisible} data={uploadErrors} message={uploadErrorsMessage} isMT={true} onCancel={hidePopup} />}
                <Panigantion
                    data={tableData ? tableData : []}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    itemsCount={tableData?.totalCount}
                    setModifiedData={onChangePage}
                    pageNo={pageNo}
                />
            </div>
        </>
    );
};

const mapStateToProps = () => {
    return {};
};

const mapDispatchToProps = (dispatch) => {
    return {
        uploadBaseLimit: (data) => dispatch(Action.uploadBaseLimit(data)),
        account_master_list: (payload) => dispatch(Action.account_master_list(payload)),
        customer_group_list: () => dispatch(Action.customer_group_list()),
        get_latest_upload_record: () => dispatch(Action.get_latest_upload_record()),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(AccountMaster);
