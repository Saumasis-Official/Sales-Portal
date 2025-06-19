import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { connect } from 'react-redux';
import * as AdminAction from '../actions/adminAction';
import Util from '../../../util/helper';
import Auth from '../../../util/middleware/auth';
import { notification, Popover } from 'antd';
import Loader from '../../../components/Loader';
import { ArrowLeftOutlined, InfoCircleFilled } from '@ant-design/icons';
import './TransactionDetails.css';
import { hasEditPermission, pages, features } from '../../../persona/distributorNav';

const GTTransactionDetails = (props) => {
    const browserHistory = props.history;
    const { getGTTransactionDetails, cl_gt_approver_update } = props;

    const email = Auth.getSSOUserEmail()?.toLowerCase();
    const { transaction_id } = useParams();
    const [transactionData, setTransactionData] = useState([]);
    const [headerData, setHeaderData] = useState({});
    const trans_id = Util.decryptData(transaction_id.replaceAll('*', '/').replaceAll('-', '+'));
    const [sortDirection, setSortDirection] = useState(false);
    const [actionMode, setActionMode] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [finalData, setFinalData] = useState([]);
    const [disabledMessage, setDisabledMessage] = useState('');
    const [approversData, setApproversData] = useState([]);
    const [isResponseDisabled, setIsResponseDisabled] = useState(false);
    const [respondedByEmail, setRespondedByEmail] = useState([]);
    const [transactionstatus, setTransactionStatus] = useState('');
    const [headerDataCheck, setHeaderDataCheck] = useState(false);
    const [gTCreditExtensionCheck, setGTCreditExtensionCheck] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [approversUniqueRemarks, setApproversUniqueRemarks] = useState([]);
    const [disabledSaveCancelButton, setdisabledSaveCancelButton] = useState(false);

    useEffect(() => {
        if (trans_id) {
            fetchOrderRequestData(trans_id);
        }
    }, [trans_id, getGTTransactionDetails]);

    async function fetchOrderRequestData(id) {
        const response = await getGTTransactionDetails(id);
        if (response?.success) {
            setTransactionData(response?.data?.result);
            if (!gTCreditExtensionCheck && response?.data?.result) {
                setGTCreditExtensionCheck(true);
            }
            const allEmails = response?.data?.result.flatMap((item) => item.responded_by_email);
            const uniqueEmails = [...new Set(allEmails)];
            setRespondedByEmail(uniqueEmails);

            const getUniqueRemarks = (data) => {
                const remarksByKey = {};
                data.forEach((item) => {
                    if (item.approvers_remarks) {
                        Object.entries(item.approvers_remarks).forEach(([key, value]) => {
                            if (!remarksByKey[key] && value) {
                                remarksByKey[key] = value;
                            }
                        });
                    }
                });
                return Object.values(remarksByKey);
            };
            const uniqueRemarks = getUniqueRemarks(response?.data?.result || []);
            setApproversUniqueRemarks(uniqueRemarks);
            setHeaderData(response?.data?.result[0]);
        } else {
            notificationSender(false, 'Error', 'Failed to fetch request data.');
        }
        if (!headerDataCheck && headerData) {
            setHeaderDataCheck(true);
        }
    }

    const handleCheckboxChange = (index) => {
        setSelectedRows((prevSelectedRows) => {
            const newSelectedRows = prevSelectedRows.includes(index) ? prevSelectedRows.filter((i) => i !== index) : [...prevSelectedRows, index];
            const updatedTransactions = transactionData.map((transaction, i) => ({
                ...transaction,
                status: actionMode === 'approve' ? (newSelectedRows.includes(i) ? 'APPROVED' : 'REJECTED') : newSelectedRows.includes(i) ? 'REJECTED' : 'APPROVED',
            }));
            setFinalData(updatedTransactions);
            return newSelectedRows;
        });
    };

    useEffect(() => {
        if (headerData?.approver_details) {
            const emailIDs = headerData?.approver_details?.filter((item) => typeof item === 'string').map((item) => item.split('#')[1].toLowerCase());
            setApproversData(emailIDs);
        }
    }, [headerData]);

    useEffect(() => {
        const hasPendingStatus = transactionData?.some((transaction) => transaction.status === 'PENDING');
        setTransactionStatus(hasPendingStatus);
    }, [transactionData]);

    useEffect(() => {
        if (headerData && Object.keys(headerData).length > 0 && transaction_id && props?.location?.state?.flag !== false) {
            let transaction_id = JSON.parse(window.localStorage.getItem('GT_CREDIT_LIMIT_REDIRECT_PARAMS'));
            if (transaction_id) {
                if (localStorage.getItem('GT_CREDIT_LIMIT_REDIRECT_PARAMS')) {
                    const parsed = JSON.parse(JSON.stringify(transaction_id));
                    if (parsed?.action) {
                        if (parsed.action === 'approve') {
                            handleGTCreditExtensionMail('approve');
                        } else if (parsed.action === 'reject') {
                            handleGTCreditExtensionMail('reject');
                        }
                    }
                }
            }
        }
    }, [headerDataCheck, gTCreditExtensionCheck]);

    function checkPreviousValue(email, approversData, getRespondedByEmail, message) {
        const index = approversData?.indexOf(email);
        if (index !== -1 && index >= 1) {
            const previousValue = approversData[index - 1];
            if (!getRespondedByEmail.includes(previousValue)) {
                return message;
            }
        }
        return null;
    }

    useEffect(() => {
        const email_index = approversData?.indexOf(email);
        let can_respond = approversData?.length > 0 && email_index >= 0;
        if (!can_respond && approversData?.length > 0) {
            setDisabledMessage('You are not authorized to approve/reject this request');
            setIsResponseDisabled(true);
            return;
        }
        if (can_respond && transactionData && transactionData?.length > 0) {
            can_respond = respondedByEmail?.includes(email);
            if (can_respond) {
                setDisabledMessage('You have already responded to this request');
                setIsResponseDisabled(true);
                return;
            }
        }
        const result = checkPreviousValue(email, approversData, respondedByEmail || [], 'You are not able to approve/reject until previous approver approves/reject');
        if (result) {
            setDisabledMessage(result);
            setIsResponseDisabled(true);
        }
    }, [email, approversData, headerData, transactionData]);
    const sortColumn = (columnName) => {
        const newSortDirection = !sortDirection;
        setSortDirection(newSortDirection);

        const sortedRows = [...transactionData].sort((a, b) => {
            let comparison = 0;
            const aValue = columnName === 'amount' ? parseFloat(a[columnName]) : a[columnName];
            const bValue = columnName === 'amount' ? parseFloat(b[columnName]) : b[columnName];

            if (aValue < bValue) {
                comparison = -1;
            }
            if (aValue > bValue) {
                comparison = 1;
            }
            return newSortDirection ? comparison : comparison * -1;
        });

        setTransactionData(sortedRows);
    };

    const handleApprove = (action) => {
        setActionMode(action);
    };

    const handleReject = (action) => {
        setActionMode(action);
    };

    const notificationSender = (success, message, description) => {
        if (success) {
            notification.success({
                message: message,
                description: description,
                duration: 6,
                className: 'notification-green',
            });
        } else {
            notification.error({
                message: message,
                description: description,
                duration: 6,
                className: 'notification-error',
            });
        }
    };

    const handleGTCreditExtensionMail = async (actionMode) => {
        const approvedData = transactionData?.filter((item) => item.status === 'PENDING');
        const finalData = approvedData?.map((item) => ({
            transaction_id: item.transaction_id,
            status: actionMode === 'approve' ? 'APPROVED' : 'REJECTED',
            child_id: item.child_id,
            approvers_remarks: actionMode === 'approve' ? 'APPROVED' : 'REJECTED',
        }));
        const finalPayload = {
            queryParams: finalData,
        };
        try {
            let approveResponse;
            approveResponse = await cl_gt_approver_update(finalPayload);
            if (approveResponse?.data?.success) {
                notificationSender(true, 'Success', actionMode === 'approve' ? 'Request approved successfully' : 'Request rejected successfully');
                fetchOrderRequestData(trans_id);
            } else {
                notificationSender(false, 'Error', approveResponse?.data?.message);
            }
        } catch (error) {
            console.log(error);
            notificationSender(false, 'Error', `Error while ${actionMode} the request`);
        } finally {
            setActionMode(null);
            setSelectAll(false);
            setdisabledSaveCancelButton(false);
            localStorage.removeItem('GT_CREDIT_LIMIT_REDIRECT_PARAMS');
        }
    };

    const handleSelectAllChange = () => {
        if (selectAll) {
            setSelectedRows([]);
            setFinalData(transactionData);
        } else {
            const allRowData = transactionData.map((transaction, index) => (transaction.status !== 'REJECTED' ? index : null)).filter((index) => index !== null);
            setSelectedRows(allRowData);
            const updatedTransactions = transactionData.map((transaction) => ({
                ...transaction,
                status: actionMode === 'approve' ? 'APPROVED' : 'REJECTED',
            }));
            setFinalData(updatedTransactions);
        }
        setSelectAll(!selectAll);
    };

    const handleCheckBoxSave = async () => {
        try {
            if (!remarks.trim()) {
                notification.error({
                    message: 'Error',
                    description: 'Remarks are required.',
                    duration: 6,
                    className: 'notification-error',
                });
                return;
            } else if (remarks.length < 10) {
                notification.error({
                    message: 'Error',
                    description: 'Remarks must be greater than 10  characters.',
                    duration: 6,
                    className: 'notification-error',
                });
                return;
            } else if (remarks.length > 500) {
                notification.error({
                    message: 'Error',
                    description: 'Remarks should not be greater than 500 characters.',
                    duration: 6,
                    className: 'notification-error',
                });
                return;
            }
            setdisabledSaveCancelButton(true);
            const finalPayloadData = finalData?.map((item) => ({
                transaction_id: item.transaction_id,
                status: item.status,
                child_id: item.child_id,
                approvers_remarks: remarks ? remarks : '-',
            }));
            const approvePayload = {
                queryParams: finalPayloadData,
            };
            try {
                const approveResponse = await cl_gt_approver_update(approvePayload);
                if (approveResponse?.data?.success) {
                    if (actionMode === 'approve') {
                        notificationSender(true, 'Success', 'Request approved successfully');
                        fetchOrderRequestData(trans_id);
                    } else {
                        notificationSender(true, 'Success', 'Request rejected successfully');
                        fetchOrderRequestData(trans_id);
                    }
                } else {
                    notificationSender(false, 'Error', approveResponse?.data?.message);
                }
            } catch (errorInfo) {
                console.error(errorInfo);
                notificationSender(false, 'Error', `error while ${actionMode} the request`);
            } finally {
                fetchOrderRequestData(trans_id);
                setActionMode(null);
                setSelectAll(false);
                setSelectedRows([]);
                setRemarks('');
            }
        } catch (errorInfo) {
            console.error(errorInfo);
        }
    };

    const handleCancelClick = () => {
        setActionMode(null);
        setSelectedRows([]);
        setSelectAll(false);
    };
    const approversRemarks = {
        [`${headerData?.approver_full_names ? headerData?.approver_full_names[0] : '-'} (First Approver)`]: `${approversUniqueRemarks[0] ?? '-'}`,
        [`${headerData?.approver_full_names ? headerData?.approver_full_names[1] : '-'} (Second Approver)`]: `${approversUniqueRemarks[1] ?? '-'}`,
    };

    return (
        <>
            <div className="distributor-main-page">
                <div className="distributor-info-block">
                    <div className="credit-limt-info-left">
                        <table className="credit-limit-info-tbl">
                            <tr>
                                <td>
                                    <span>Transaction Number </span>{' '}
                                </td>
                                <td className="credit-limit-info-td">
                                    {': '}
                                    {headerData?.transaction_id ? headerData?.transaction_id : '-'}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span>Requested By</span>{' '}
                                </td>
                                <td className="credit-limit-info-td">
                                    {': '}
                                    {headerData?.requested_by ? headerData?.requested_by : '-'}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span>Requested On</span>{' '}
                                </td>
                                <td className="credit-limit-info-td">
                                    {': '}
                                    {headerData?.requested_on ? `${Util.formatDate(headerData?.requested_on)}, ${Util.formatTime(headerData?.requested_on)}` : '-'}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span>Reason </span>{' '}
                                </td>

                                <td className="credit-limit-info-td">
                                    {': '}
                                    {headerData?.requestor_remarks ? (
                                        <span>
                                            {headerData.requestor_remarks.length > 10 ? (
                                                <span>
                                                    {headerData.requestor_remarks.slice(0, 10)}...
                                                    <Popover
                                                        content={
                                                            <div className="fixed-height-popover">
                                                                <div className="popover-content">{headerData?.requestor_remarks ? headerData.requestor_remarks : '-'}</div>
                                                            </div>
                                                        }
                                                        placement="top">
                                                        <InfoCircleFilled style={{ color: '#12b7e9' }} />
                                                    </Popover>
                                                </span>
                                            ) : (
                                                headerData.requestor_remarks
                                            )}
                                        </span>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div className="credit-limt-info-right">
                        <table className="credit-limit-info-tbl">
                            <tr>
                                <td>
                                    <span>First Approver</span>{' '}
                                </td>
                                <td className="credit-limit-info-td">
                                    {': '}
                                    {headerData?.approver_full_names ? headerData?.approver_full_names[0] : '-'}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span>Second Approver</span>{' '}
                                </td>
                                <td className="credit-limit-info-td">
                                    {': '}
                                    {headerData?.approver_full_names ? headerData?.approver_full_names[1] : '-'}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span>Action Type</span>{' '}
                                </td>
                                <td className="credit-limit-info-td">
                                    {': '}
                                    {headerData?.file_action_type ? headerData?.file_action_type.replace(/_/g, ' ') : '-'}
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <button
                                        className="navigateButton"
                                        onClick={() => {
                                            browserHistory.push({
                                                pathname: '/admin/credit-dashboard',
                                                state: {
                                                    channel: 'gt',
                                                },
                                            });
                                        }}>
                                        <ArrowLeftOutlined />
                                        Back To Transaction Summary Page
                                    </button>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div className="cl-card">
                    <div className="dashboard-table cl-new-dashboard-table">
                        <Loader>
                            <table>
                                <thead className="sales-orders-th">
                                    <tr className="cl-table-body">
                                        <th>{actionMode && <input type="checkbox" checked={selectAll} onChange={handleSelectAllChange} />}</th>
                                        <th onClick={() => sortColumn('child_id')} id="subrequest-id">
                                            Sub Request No <img src="/assets/images/sorting_icon.svg" alt="" />
                                        </th>
                                        <th id="subrequest-id">Party Name (Code) </th>
                                        <th>Base Limit</th>
                                        <th onClick={() => sortColumn('amount')}>
                                            Amount (₹) <img src="/assets/images/sorting_icon.svg" alt="" />
                                        </th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>
                                            Approved By{' '}
                                            <span
                                                style={{
                                                    color: 'white',
                                                    fontSize: 'large',
                                                }}></span>{' '}
                                        </th>
                                        <th>
                                            Approved On{' '}
                                            <span
                                                style={{
                                                    color: 'white',
                                                    fontSize: 'large',
                                                }}></span>{' '}
                                        </th>
                                        <th onClick={() => sortColumn('status')}>
                                            Status <img src="/assets/images/sorting_icon.svg" alt="" />{' '}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="cl-table-body">
                                    {transactionData?.length > 0 ? (
                                        transactionData?.map((transactionData, index) => (
                                            <tr key={index}>
                                                <td>
                                                    {actionMode && (
                                                        <input
                                                            disabled={transactionData?.status === 'REJECTED'}
                                                            type="checkbox"
                                                            checked={selectedRows?.includes(index)}
                                                            onChange={() => handleCheckboxChange(index)}
                                                        />
                                                    )}
                                                </td>
                                                <td>{transactionData?.child_id ? transactionData?.child_id : '-'}</td>
                                                <td>{transactionData?.distributor_code ? `${transactionData.distributor_name} (${transactionData.distributor_code})` : '-'}</td>
                                                <td>{transactionData?.base_limit ? transactionData?.base_limit : '-'}</td>
                                                <td>{transactionData?.amount ? transactionData?.amount : '-'}</td>
                                                <td>{transactionData?.start_date ? Util.formatDateTime(transactionData?.start_date) : '-'}</td>
                                                <td>
                                                    {' '}
                                                    {transactionData?.end_date
                                                        ? transactionData?.end_date.split('T')[0] === '9999-12-12'
                                                            ? '99-99-9999'
                                                            : Util.formatDateTime(transactionData?.end_date)
                                                        : '-'}
                                                </td>
                                                <td>
                                                    {Array.isArray(transactionData?.responded_by) && transactionData?.responded_by.length > 0 ? (
                                                        <ul style={{ marginTop: '15px' }}>
                                                            {transactionData?.responded_by.map((name, index) => (
                                                                <li key={index}>
                                                                    {name}
                                                                    {index < transactionData?.responded_by.length - 1 && (
                                                                        <>
                                                                            ,<br />
                                                                        </>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : transactionData?.responded_by ? (
                                                        <>
                                                            {transactionData?.responded_by.split(',').map((name, index) => (
                                                                <span key={index}>
                                                                    {name}
                                                                    {index < transactionData?.responded_by.split(',').length - 1 && (
                                                                        <>
                                                                            ,<br />
                                                                        </>
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {Array.isArray(transactionData?.responded_on) && transactionData?.responded_on.length > 0 ? (
                                                        <ul style={{ marginTop: '15px' }}>
                                                            {transactionData?.responded_on.map((dateTime, index) => (
                                                                <li key={index}>
                                                                    {Util.formatDate(dateTime)}, {Util.formatTime(dateTime)}
                                                                    {index < transactionData?.responded_on.length - 1 && <br />}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : transactionData?.responded_on ? (
                                                        <>
                                                            {Util.formatDate(transactionData?.responded_on)}, {Util.formatTime(transactionData?.responded_on)}
                                                        </>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {transactionData?.status ? (
                                                        <button
                                                            className={`status-cl-view ${
                                                                transactionData.status === 'APPROVED'
                                                                    ? 'cl-status-approved'
                                                                    : transactionData.status === 'REJECTED'
                                                                      ? 'cl-status-rejected'
                                                                      : 'cl-status-pending'
                                                            }`}>
                                                            {transactionData.status}
                                                        </button>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="10" style={{ textAlign: 'center' }}>
                                                No data found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </Loader>
                        <div className="request-form-container">
                            <div className="remarks-section">
                                {/* <div> */}
                                <div className="approvers-remarks-div">
                                    <ol className="approver-container">
                                        <h3 className="approvers-remarks-heading">Approvers Remarks</h3>
                                        {Object.entries(approversRemarks).map(([key, value], index) => (
                                            <li key={index} className="approver-item">
                                                <span className="approver-key">{key}</span>
                                                <span>:</span>
                                                <span className="approver-value">&nbsp;{value}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                                {hasEditPermission(pages.CREDIT_LIMIT, features.GT_APPROVE_REQUEST) && transactionstatus && (
                                    <>
                                        <label htmlFor="remarks">Remarks:</label>
                                        <br></br>
                                        <textarea
                                            className="remarks-textarea"
                                            value={remarks}
                                            disabled={selectedRows.length === 0 || isResponseDisabled}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder="Enter your remarks here..."
                                            rows="2"
                                            cols="50"
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {hasEditPermission(pages.CREDIT_LIMIT, features.GT_APPROVE_REQUEST) && transactionstatus && (
                        <div>
                            {actionMode ? (
                                <div className="order-btns">
                                    <button
                                        type="submit"
                                        disabled={selectedRows.length === 0 || disabledSaveCancelButton}
                                        className="exclusive-cl-button button-save-cl"
                                        onClick={handleCheckBoxSave}>
                                        Save
                                    </button>{' '}
                                    {!disabledSaveCancelButton && (
                                        <button className="exclusive-cl-button button-cancel-cl" onClick={handleCancelClick}>
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="order-btns">
                                    <div className="dis-message">{disabledMessage}</div>
                                    <button className="approve-btn" disabled={isResponseDisabled} onClick={() => handleApprove('approve')}>
                                        Approve
                                    </button>
                                    <button className="reject-btn" type="submit" disabled={isResponseDisabled} onClick={() => handleReject('reject')}>
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

const mapStateToProps = () => {
    return {};
};

const mapDispatchToProps = (dispatch) => {
    return {
        getGTTransactionDetails: (trans_id) => dispatch(AdminAction.getGTTransactionDetails(trans_id)),
        cl_gt_approver_update: (data) => dispatch(AdminAction.cl_gt_approver_update(data)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(GTTransactionDetails);
