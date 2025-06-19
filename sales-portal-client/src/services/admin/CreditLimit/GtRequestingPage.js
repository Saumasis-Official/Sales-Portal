import React, { useState, useRef, useEffect } from 'react';
import { Select } from 'antd';
import './RequestingPage.css';
import { connect } from 'react-redux';
import { Alert, Modal, notification, Input } from 'antd';
import * as Action from '../actions/adminAction';
import AccountMasterErrorModal from './AccountMasterErrorModal.js';
import Util from '../../../util/helper/index';
import { hasEditPermission, pages, features } from '../../../persona/distributorNav';
import { GT_ACTION_TYPE } from '../../../config/constant';

const { Option } = Select;

const RequestingPage = (props) => {
    const { uploadGTRequests, fetch_gt_excel_data, get_requestor_clusters, get_gt_approver } = props;
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [selectedActionType, setSelectedActionType] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [fileName, setFileName] = useState('');
    const [uploadedFile, setUploadedFile] = useState({});
    const fileInputRef = useRef(null);
    const [uploadErrors, setUploadErrors] = useState([]);
    const [uploadErrorsModalVisible, setUploadErrorsModalVisible] = useState(false);
    const [uploadErrorsMessage, setUploadErrorsMessage] = useState('');
    const [isLoadingDownload, setIsLoadingDownload] = useState(false);
    const [gTClusterData, setGTClusterData] = useState([]);
    const [primaryApprover, setPrimaryApprover] = useState(null);
    const [secondaryApprover, setSecondaryApprover] = useState(null);
    const [approversData, setApproversData] = useState([]);
    const [remarks, setRemarks] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const checkActionType = selectedActionType === GT_ACTION_TYPE.BASE_LIMIT_UPLOAD || selectedActionType === GT_ACTION_TYPE.ADDITIONAL_LIMIT_UPLOAD;

    const handleClusterChange = (value) => {
        setSelectedCluster(value);
        setFileName('');
        setUploadedFile({});
        setSelectedActionType(null);
    };

    const handleOptionChange = (value) => {
        setSelectedActionType(value);
    };

    function closeModal() {
        setIsUploadModalOpen(false);
        setFileName('');
        setUploadedFile({});
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setRemarks('');
    }

    const onReset = () => {
        setFileName('');
        setUploadedFile({});
        setSelectedCluster(null);
        setSelectedActionType(null);
        setPrimaryApprover(null);
        setSecondaryApprover(null);
        setApproversData([]);
        setRemarks('');
        setIsUploading(false);
    };

    const uploadData = async () => {
        setIsUploading(true);
        if (!remarks.trim()) {
            notification.error({
                message: 'Error',
                description: 'Remarks are required.',
                duration: 2,
                className: 'notification-error',
            });
            return;
        } else if (remarks.length < 10) {
            notification.error({
                message: 'Error',
                description: 'Remarks must be greater than 10 characters.',
                duration: 2,
                className: 'notification-error',
            });
            return;
        } else if (remarks.length > 500) {
            notification.error({
                message: 'Error',
                description: 'Remarks should not be greater than 500 characters.',
                duration: 2,
                className: 'notification-error',
            });
            return;
        }
        //check for approvers
        if (!primaryApprover || !secondaryApprover) {
            notification.error({
                message: 'Error',
                description: 'Both primary and secondary approvers must be present',
                duration: 2,
                className: 'notification-red',
            });
            return;
        }
        if (isUploading) {
            notification.success({
                message: 'Processing',
                description: 'File is being uploaded, please wait...',
                duration: 2,
            });
        }
        setIsUploadModalOpen(false);
        const formData = new FormData();
        formData.append('file', uploadedFile);

        if (!uploadedFile) {
            notification.error({
                message: 'Error',
                description: 'Please select a file to upload',
            });
        }
        const queryParams = {
            cluster_code: selectedCluster,
            approver1: primaryApprover,
            approver2: secondaryApprover,
            action_type: selectedActionType,
            remarks: remarks,
        };

        formData.append('queryParams', JSON.stringify(queryParams));
        try {
            const response = await uploadGTRequests(formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response?.data?.success) {
                notification.success({
                    message: 'Success',
                    description: response.data.message,
                    duration: 4,
                    className: 'notification-green',
                });
            } else {
                if (response.data.message === 'Validation Error') {
                    const errors = response.data.errors || [];
                    setUploadErrors(errors);
                    setUploadErrorsMessage(response.data.message || 'Error occurred during upload');
                    setUploadErrorsModalVisible(true);
                    setSelectedCluster(null);
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
            notification.error({
                message: 'Error Occurred',
                description: 'Technical Error, File upload failed',
                duration: 5,
                className: 'notification-error',
            });
        }
        onReset();
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
            setFileName('');
            setUploadedFile(null);
        }
        e.target.value = null;
    };

    const hidePopup = () => {
        setUploadErrorsModalVisible(false);
    };

    async function fetchCluster() {
        try {
            const response = await get_requestor_clusters();
            if (response?.data) {
                setGTClusterData(response.data[0]?.cluster_code);
            } else {
                notification.error({
                    message: 'Error',
                    description: 'Failed to fetch cluster data',
                    duration: 2,
                    className: 'notification-red',
                });
            }
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'Failed to fetch cluster data',
                duration: 2,
                className: 'notification-red',
            });
        }
    }

    async function fetchApproversData() {
        try {
            const queryParams = {
                queryParams: {
                    cluster: selectedCluster,
                },
            };
            const response = await get_gt_approver(queryParams);
            if (response?.data) {
                setApproversData(response.data);
                const approversArray = response.data;
                if (approversArray.length > 0) {
                    const approvers = approversArray[0];
                    setApproversData(approversArray);
                    setPrimaryApprover(approvers.primary_approver);
                    setSecondaryApprover(approvers.secondary_approver);
                }
            } else {
                notification.error({
                    message: 'Error',
                    description: 'Failed to fetch Approvers Data',
                    duration: 2,
                    className: 'notification-red',
                });
            }
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'Failed to fetch approvers data',
                duration: 2,
                className: 'notification-red',
            });
        }
    }

    useEffect(() => {
        fetchCluster();
    }, []);

    useEffect(() => {
        if (selectedCluster) {
            fetchApproversData();
        }
    }, [selectedCluster]);

    const downloadAllData = async () => {
        try {
            setIsLoadingDownload(true);
            const responseData = await fetch_gt_excel_data({ clusterCode: selectedCluster, action_type: selectedActionType });
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
                'Party Code': row.party_code || '',
                'Party Name': row.party_name || '',
                'Base Limit': row.base_limit || '',
                ...(selectedActionType === GT_ACTION_TYPE.ADDITIONAL_LIMIT_UPLOAD && { TYPE: row.type || '' }),
                ...(checkActionType && { Amount: '' }),
                'Start Date': '',
                ...(checkActionType && { 'End Date': '' }),
            }));
            const getInitials = (str) =>
                str
                    .split('_')
                    .map((word) => word[0])
                    .join('');
            const fileName = `GT-${getInitials(selectedActionType)}-${selectedCluster}-${Util.formatDate(new Date())}`;
            await new Promise((resolve) => {
                const success = Util.CLdownloadExcelFile(formattedData, fileName);
                if (success) {
                    Util.notificationSender('Success', 'Excel file downloaded successfully', true);
                }
                setTimeout(resolve, 100);
            });
        } catch (error) {
            console.error('Download process error:', error);
            Util.notificationSender('Error', 'Failed to process report data', false);
        } finally {
            setTimeout(() => {
                setIsLoadingDownload(false);
            }, 1000);
        }
    };
    useEffect(() => {
        if (selectedCluster && selectedActionType && isLoadingDownload) {
            downloadAllData();
        }
    }, [selectedCluster, selectedActionType]);

    const handleRemarksChange = (e) => {
        setRemarks(e.target.value);
    };
    return (
        <>
            <div>
                <div className="header-account-cl">
                    <div style={{ paddingRight: '5px' }}>
                        <Select
                            placeholder="Select Cluster"
                            allowClear
                            onClear={onReset}
                            showSearch
                            value={selectedCluster}
                            onChange={handleClusterChange}
                            style={{ width: '150px' }}>
                            {gTClusterData?.flat().map((cluster) => (
                                <Option key={cluster} value={cluster}>
                                    {cluster}
                                </Option>
                            )) || []}
                        </Select>
                    </div>

                    <Select placeholder="Action Type" style={{ width: '200px' }} allowClear onChange={handleOptionChange} value={selectedActionType} disabled={!selectedCluster}>
                        <Option value="BASE_LIMIT_UPLOAD">Base Limit Upload</Option>
                        <Option value="BASE_LIMIT_REMOVAL">Base Limit Removal</Option>
                        <Option value="ADDITIONAL_LIMIT_UPLOAD">Additional Limit Upload</Option>
                        <Option value="ADDITIONAL_LIMIT_REMOVAL">Additional Limit Removal</Option>
                    </Select>
                    <p className="approvers-name">
                        <span className="approver-key">First Approver&nbsp;:&nbsp;</span>
                        {approversData[0]?.primary_full_name ?? '-'}
                    </p>
                    <p className="approvers-name">
                        <span className="approver-key">Second Approver&nbsp;:&nbsp;</span>
                        {approversData[0]?.secondary_full_name ?? '-'}
                    </p>
                </div>
                <div className="header-account-cl-gt">
                    <div>
                        <h3>{!selectedCluster ? 'Please Select Cluster' : !selectedActionType ? 'Please Select Action Type' : ''}</h3>
                        <div>
                            <button
                                className="account-button-cl"
                                disabled={!selectedActionType || !hasEditPermission(pages.CREDIT_LIMIT, features.GT_UPLOAD_ON_REQUEST) || isUploading}
                                onClick={() => downloadAllData()}>
                                {isLoadingDownload ? 'Downloading...' : 'Download'}
                                {/* <DownloadOutlined /> */}
                            </button>
                            <button
                                className="account-button-cl"
                                disabled={!selectedActionType || !hasEditPermission(pages.CREDIT_LIMIT, features.GT_UPLOAD_ON_REQUEST) || isUploading}
                                onClick={() => setIsUploadModalOpen(!isUploadModalOpen)}>
                                {' '}
                                Upload
                            </button>
                        </div>
                    </div>
                </div>
                <Modal
                    title="Upload File"
                    visible={isUploadModalOpen}
                    onCancel={closeModal}
                    onOk={uploadData}
                    className="excel-upload-modal"
                    okButtonProps={{ disabled: !fileName }}>
                    <div className="Upload-div forecast-upload-modal">
                        <label htmlFor="fileInput">
                            <img width="120px" className="forecast-upload-icon" src="/assets/images/cloud-upload.svg" alt="" />
                        </label>
                        <input id="fileInput" type="file" accept=".xlsx" onChange={onChange} />
                        <p style={{ color: 'blue' }}>{fileName}</p>
                    </div>
                    <br />
                    <div style={{ marginBottom: '20px' }}>
                        <label>
                            Remarks<b className="mandatory-mark">*</b> :{' '}
                        </label>
                        <Input.TextArea value={remarks} onChange={handleRemarksChange} placeholder="Please enter remarks (minimum 10 characters) " rows={2} />
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
                                    {!checkActionType && (
                                        <>
                                            <span>
                                                <b className="mandatory-mark">*</b><b>Base limit</b> is only for informational purpose.
                                            </span>
                                            <br></br>
                                            <span>
                                                <b className="mandatory-mark">*</b><b>End dates</b> will always be "99/99/9999".
                                            </span>
                                        </>
                                    )}
                                    <br></br>
                                    <b className="mandatory-mark">*</b>Please upload a valid &quot;.xlsx&quot; file only.
                                    <br></br>
                                    <b className="mandatory-mark">*</b>Start date {checkActionType ? 'and End date' : ''} should be in <b>"DD/MM/YYYY"</b> format.
                                    <br></br>
                                </li>
                            </ul>
                        }
                        type="info"
                        showIcon
                    />
                </Modal>
                {uploadErrorsModalVisible && (
                    <AccountMasterErrorModal visible={uploadErrorsModalVisible} data={uploadErrors} message={uploadErrorsMessage} isMT={false} onCancel={hidePopup} />
                )}
            </div>
        </>
    );
};

const mapStateToProps = () => {
    return {};
};

const mapDispatchToProps = (dispatch) => {
    return {
        uploadGTRequests: (data) => dispatch(Action.uploadGTRequests(data)),
        fetch_gt_excel_data: (data) => dispatch(Action.fetch_gt_excel_data(data)),
        get_requestor_clusters: () => dispatch(Action.get_requestor_clusters()),
        get_gt_approver: (data) => dispatch(Action.get_gt_approver(data)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(RequestingPage);
