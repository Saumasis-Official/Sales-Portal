import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { connect } from 'react-redux';
import * as AdminAction from '../actions/adminAction';
import Util from '../../../util/helper';
import Auth from '../../../util/middleware/auth';
import { notification, DatePicker, Popover, Tooltip} from 'antd';
import Loader from '../../../components/Loader';
import { ArrowLeftOutlined, InfoCircleFilled, DownloadOutlined } from '@ant-design/icons';
import { hasEditPermission, hasViewPermission, pages, features } from '../../../persona/distributorNav';
import moment from 'moment';
import { Form, Input } from 'antd';
import './TransactionDetails.css';
import { MT_ECOM_GROUPS } from '../../../config/constant';
import { NO_DATA_SYMBOL } from '../../../constants/index';
import { Spinner } from '../../../components';

const TransactionDetails = (props) => {
    const browserHistory = props.history;
    const { getTransactionDetails, cl_approver_update, getCreditDetailsFromSap } = props;
    const email = Auth.getSSOUserEmail()?.toLowerCase();
    const { transaction_id } = useParams();
    const trans_id = Util.decryptData(transaction_id.replaceAll('*', '/').replaceAll('-', '+'));
    const [transactionData, setTransactionData] = useState({});
    const [isResetEnable, setIsResetEnable] = useState(true);
    const [initialValues, setInitialValues] = useState({});
    const [action, setAction] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [approversData, setApproversData] = useState([]);
    const [transactionstatus, setTransactionStatus] = useState('');
    const [isResponseDisabled, setIsResponseDisabled] = useState(false);
    const [disabledMessage, setDisabledMessage] = useState('');
    const [editFlag, setEditFlag] = useState(false);
    const [form] = Form.useForm();
    const [headerData, setHeaderData] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const default_expiry_content = (
        <div>
            <div>Time : 11:59 PM</div>
        </div>
    );
    const [customerGroup, setCustomerGroup] = useState('');
    const [expiryDate, setExpiryDate] = useState(null);
    const [editIndex, setEditIndex] = useState(null);
    const [amountRequested, setAmountRequested] = useState('');
    const [selectedRows, setSelectedRows] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [actionMode, setActionMode] = useState(null);
    const [mtExclusiveData, setMtExclusiveData] = useState([]);
    const [finalMtExclusiveData, setFinalMtExclusiveData] = useState([]);
    const [isMtExclusiveRemarksDisabled, setMtExclusiveRemarksDisabled] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSaveEnabled, setIsSaveEnabled] = useState(true);
    const [mtEclusiveStatus, setMtEclusiveStatus] = useState(false);
    const [sortDirection, setSortDirection] = useState(false);
    const [headerDataCheck, setHeaderDataCheck] = useState(false);
    const [mtexclusiveCheck, setMtExclusiveCheck] = useState(false);
    const [exlusiveinitialValues, setExlusiveInitialValues] = useState({});
    const [respondedByEmail, setRespondedByEmail] = useState([]);
    const [checkactionFromMail, setCheckActionFromMail] = useState(true);
    const [ageing, setAgeing] = useState([]);
    const [approversUniqueRemarks, setApproversUniqueRemarks] = useState({});
    const [validatePayload, setValidateFromPayload] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [ecomRemarks, setEcomRemarks] = useState(false);

    const handleEditClickii = (index, amount, date) => {
        setEditIndex(index);
        setAmountRequested(amount);
        setExpiryDate(date ? moment(date) : null);
    };

    const handleSaveClick = () => {
        if (!amountRequested) {
            notificationSender(false, 'Error', 'Please enter amount requested');
            return;
        }

        if (!expiryDate) {
            notificationSender(false, 'Error', 'Expiry date should not be empty');
            return;
        }

        const updatedTransactions = [...mtExclusiveData];
        updatedTransactions[editIndex].amount_requested = amountRequested;
        setMtExclusiveData(updatedTransactions);
        setEditIndex(null);
        setActionMode(null);
        setIsSaveEnabled(true);
    };

    const handleCheckboxChange = (index) => {
        setSelectedRows((prevSelectedRows) => {
            const newSelectedRows = prevSelectedRows.includes(index) ? prevSelectedRows.filter((i) => i !== index) : [...prevSelectedRows, index];
            const updatedTransactions = mtExclusiveData.map((transaction, i) => ({
                ...transaction,
                status: actionMode === 'approve' ? (newSelectedRows.includes(i) ? 'APPROVED' : 'REJECTED') : newSelectedRows.includes(i) ? 'REJECTED' : 'APPROVED',
            }));
            setFinalMtExclusiveData(updatedTransactions);
            setMtExclusiveRemarksDisabled(false);
            return newSelectedRows;
        });
    };

    const handleMtExclusiveCheckBoxSave = async () => {
        try {
            setIsSubmitting(true);
            if (hasEditPermission(pages.CREDIT_LIMIT, features.CL_SECONDARY_REMARKS_VIEW) && actionMode === 'reject' && checkactionFromMail) {
                await form.validateFields(['remarks']);
            }
            if (hasEditPermission(pages.CREDIT_LIMIT, features.REMARKS_VIEW)) {
                await form.validateFields(['remarks']);
            }
            const finalData = finalMtExclusiveData?.map((item) => ({
                transaction_id: item.transaction_id,
                amount_requested: item.amount_requested,
                expirydate: form.getFieldValue('creditexpiry') ? form.getFieldValue('creditexpiry') : headerData?.expirydate,
                status: item.status,
                childid: item.childid,
                approver_remarks: form.getFieldValue('remarks') ? form.getFieldValue('remarks') : '-',
            }));
            const approvePayload = {
                queryParams: finalData,
            };
            try {
                const approveResponse = await cl_approver_update(approvePayload);
                if (approveResponse?.data?.success) {
                    if (actionMode === 'approve') {
                        notificationSender(true, 'Success', 'Exclusive Request approved successfully');
                        fetchOrderRequestData(trans_id);
                    } else {
                        notificationSender(true, 'Success', 'Exclusive Request rejected successfully');
                        fetchOrderRequestData(trans_id);
                    }
                    fetchOrderRequestData(trans_id);
                    setActionMode(null);
                    setMtExclusiveRemarksDisabled(true);
                    setSelectAll(false);
                    setSelectedRows([]);
                    form.setFieldsValue({ remarks: '' });
                } else {
                    notificationSender(false, 'Error', approveResponse?.data?.message);
                }
            } catch (errorInfo) {
                console.error(errorInfo);
                notificationSender(false, 'Error', `error while ${actionMode} the request`);
            }
        } catch (errorInfo) {
            console.error(errorInfo);
            // notificationSender(false, 'Error', 'Remarks is required');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelClick = () => {
        setEditIndex(null);
        setActionMode(null);
        setAmountRequested('');
        setMtExclusiveRemarksDisabled(true);
        const fieldsToReset = form.getFieldsValue();
        delete fieldsToReset['creditexpiry'];
        form.resetFields(Object.keys(fieldsToReset));
        setErrorMessage('');
        setIsSaveEnabled(true);
        setSelectedRows([]);
        setSelectAll(false);
    };

    const handleSelectAllChange = () => {
        if (selectAll) {
            setSelectedRows([]);
            setFinalMtExclusiveData(mtExclusiveData);
            setMtExclusiveRemarksDisabled(false);
        } else {
            const allRowData = mtExclusiveData.map((transaction, index) => (transaction.status !== 'REJECTED' ? index : null)).filter((index) => index !== null);
            setSelectedRows(allRowData);
            const updatedTransactions = mtExclusiveData.map((transaction) => ({
                ...transaction,
                status: actionMode === 'approve' ? 'APPROVED' : 'REJECTED',
            }));
            setFinalMtExclusiveData(updatedTransactions);
            setMtExclusiveRemarksDisabled(false);
        }
        setSelectAll(!selectAll);
    };

    const handleMtExclusiveApprove = (action) => {
        setActionMode(action);
    };

    const handleMtExclusiveReject = (action) => {
        setActionMode(action);
    };

    async function fetchOrderRequestData(id) {
        try {
            setIsDataLoading(true); 
            const response = await getTransactionDetails(id);
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to fetch transaction details');
            }
            setCustomerGroup(response?.data?.customerGroup);
            setTransactionData(response?.data);

            // Process emails
            const allEmails = response?.data?.result.flatMap((item) => item.responded_by_email);
            const uniqueEmails = [...new Set(allEmails)];
            setRespondedByEmail(uniqueEmails);

            //Approvers Remarks
            const uniqueRemarksByIndex = response?.data?.result[0].approvers_remarks.map((_, index) => {
                const remarksForApprover = response?.data?.result?.map((item) => item.approvers_remarks[index]);
                return [...new Set(remarksForApprover.filter((remark) => remark !== ''))];
            });

            setApproversUniqueRemarks(uniqueRemarksByIndex.flat());

            const headerData = response?.data?.result[0];
            if (!headerData) {
                throw new Error('No transaction data found');
            }
            setHeaderData(headerData);

            // Get SAP credit details if applicable
            const payer = headerData?.payercode;
            const group = response?.data?.customerGroup;

            if (group && payer && MT_ECOM_GROUPS.includes(group.toString())) {
                try {
                    if (hasViewPermission(pages.CREDIT_LIMIT, features.CL_AGEING_REPORT)) {
                        const res = await getCreditDetailsFromSap(payer);
                        if (!res?.success) {
                            throw new Error(res?.message || 'Failed to fetch SAP credit details');
                        }
                        const result = res?.data?.d?.results[0];
                        setAgeing(result);
                    }
                } catch (sapError) {
                    console.error('SAP API Error:', sapError);
                    notificationSender(false, 'Error', 'Failed to fetch credit details from SAP');
                }
            }

            // Set additional checks
            if (!headerDataCheck && headerData) {
                setHeaderDataCheck(true);
            }
            setMtExclusiveData(response?.data?.result);
            setIsDataLoading(false);
            if (!mtexclusiveCheck && response?.data?.result) {
                setMtExclusiveCheck(true);
            }
        } catch (error) {
            console.error('API Error:', error);
            notificationSender(false, 'Error', error.message || 'Failed to fetch request data');
        }
    }
    const approversRemarks = {
        [`${headerData?.approver_full_names ? headerData?.approver_full_names[0] : '-'} (First Approver)`]: `${approversUniqueRemarks[0] ?? '-'}`,
        [`${headerData?.approver_full_names ? headerData?.approver_full_names[1] : '-'} (Second Approver)`]: `${approversUniqueRemarks[1] ?? '-'}`,
        [`${headerData?.approver_full_names ? headerData?.approver_full_names[2] : '-'} (Third Approver)`]: `${approversUniqueRemarks[2] ?? '-'}`,
    };

    useEffect(() => {
        if (headerData?.approver_details) {
            const emailIDs = headerData?.approver_details?.filter((item) => typeof item === 'string').map((item) => item.split('#')[1].toLowerCase());
            setApproversData(emailIDs);
        }
    }, [headerData]);

    useEffect(() => {
        if (headerData?.status) {
            setTransactionStatus(headerData?.status);
        }
    }, [headerData]);

    useEffect(() => {
        const hasPendingStatus = mtExclusiveData?.some((transaction) => transaction.status === 'PENDING');
        setMtEclusiveStatus(hasPendingStatus);
    }, [mtExclusiveData]);

    useEffect(() => {
        if (trans_id) {
            fetchOrderRequestData(trans_id);
        }
    }, [trans_id, getTransactionDetails]);

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
        if (mtExclusiveData?.expirydate) {
            setExpiryDate(new Date(mtExclusiveData?.expirydate));
        }
        if (mtExclusiveData?.amount_requested) {
            setAmountRequested(mtExclusiveData?.amount_requested);
        }
    }, [mtExclusiveData]);

    useEffect(() => {
        const email_index = approversData?.indexOf(email);
        let can_respond = approversData?.length > 0 && email_index >= 0;
        if (!can_respond && approversData?.length > 0) {
            setDisabledMessage('You are not authorized to approve/reject this request');
            setIsResponseDisabled(true);
            setEditFlag(true);
            return;
        }
        if (can_respond && transactionData && transactionData?.result?.length > 0) {
            can_respond = respondedByEmail?.includes(email);
            if (can_respond) {
                setDisabledMessage('You have already responded to this request');
                setIsResponseDisabled(true);
                setEditFlag(true);
                return;
            }
        }
        const result = checkPreviousValue(email, approversData, respondedByEmail || [], 'You are not able to approve/reject until previous approver approves/reject');
        if (result) {
            setDisabledMessage(result);
            setIsResponseDisabled(true);
            setEditFlag(true);
        } else {
            setEditFlag(false);
        }
    }, [email, approversData, headerData, transactionstatus]);

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
    const handleREmarksChange = (e) => {
        const inputValue = e.target.value;
        console.log('inputValue', inputValue.length);
        if (inputValue.length > 0) {
            setEcomRemarks(true);
            console.log(ecomRemarks);
        }
        else {
            setEcomRemarks(false);  
        }
    };

    const handleApprove = async () => {
        if (checkactionFromMail) {
            if (ecomRemarks) {
                await form.validateFields(['remarks']);
            }
        }
        if (isSubmitting) return;
        setIsSubmitting(true);
        const formValues = form.getFieldsValue();
        try {
            if (hasEditPermission(pages.CREDIT_LIMIT, features.REMARKS_VIEW) && headerData?.status === 'PENDING') {
                try {
                    await form.validateFields(['remarks']);
                } catch (validationError) {
                    console.error('Validation error:', validationError);
                    setIsSubmitting(false);
                    return;
                }
            }

            const approvePayload = {
                queryParams: [
                    {
                        transaction_id: trans_id,
                        approver_remarks: formValues.remarks ? formValues.remarks : 'APPROVED',
                        amount_requested: formValues.extensionrequiredrs ? formValues.extensionrequiredrs : headerData?.amount_requested,
                        expirydate: formValues.creditexpiry ? formValues.creditexpiry : headerData?.expirydate,
                        childid: headerData?.childid,
                        status: 'APPROVED',
                    },
                ],
            };
            const approveResponse = await cl_approver_update(approvePayload);
            if (approveResponse?.data?.success) {
                notificationSender(true, 'Success', 'Request approved successfully');
                fetchOrderRequestData(trans_id);
            } else {
                notificationSender(false, 'Error', approveResponse?.data?.message);
            }
            onReset();
        } catch (error) {
            console.error('error', error);
            notificationSender(false, 'Error', 'Error while approving the request');
        } finally {
            setIsSubmitting(false);
            localStorage.removeItem('CREDIT_LIMIT_REDIRECT_PARAMS');
        }
    };

    const handleReject = async () => {
        if (checkactionFromMail) {
            if (action === 'reject') {
                await form.validateFields(['remarks']);
            }
        }
        if (isSubmitting) return;
        setIsSubmitting(true);
        const formValues = form.getFieldsValue();
        try {
            if (hasEditPermission(pages.CREDIT_LIMIT, features.REMARKS_VIEW) && headerData?.status === 'PENDING') {
                try {
                    await form.validateFields(['remarks']);
                } catch (validationError) {
                    console.error('Validation error:', validationError);
                    setIsSubmitting(false);
                    return;
                }
            }
            const rejectPayload = {
                queryParams: [
                    {
                        transaction_id: trans_id,
                        approver_remarks: formValues.remarks ? formValues.remarks : 'REJECTED',
                        amount_requested: formValues.extensionrequiredrs ? formValues.extensionrequiredrs : headerData?.amount_requested,
                        expirydate: formValues.creditexpiry ? formValues.creditexpiry : headerData?.expirydate,
                        childid: headerData?.childid,
                        status: 'REJECTED',
                    },
                ],
            };
            const rejectResponse = await cl_approver_update(rejectPayload);
            if (rejectResponse?.data?.success) {
                notificationSender(true, 'Success', 'Request rejected successfully');
                fetchOrderRequestData(trans_id);
            } else {
                notificationSender(false, 'Error', rejectResponse?.data?.message);
            }
            onReset();
        } catch (error) {
            console.error('error', error);
            notificationSender(false, 'Error', 'Error while rejecting the request');
        } finally {
            setIsSubmitting(false);
            setCheckActionFromMail(true);
            localStorage.removeItem('CREDIT_LIMIT_REDIRECT_PARAMS');
        }
    };

    useEffect(() => {
        if (headerData) {
            const extensionRequiredRs = headerData?.amount_requested || '';
            const baseLimit = headerData?.baselimit;
            const percentage = baseLimit ? (extensionRequiredRs / baseLimit) * 100 : '';
            const initialFormValues = {
                extensionrequiredrs: extensionRequiredRs,
                extensionrequiredpercentage: Number(percentage)?.toFixed(2),
                creditexpiry: moment(headerData?.expirydate),
            };
            setInitialValues(initialFormValues);
            form.setFieldsValue(initialFormValues);
        }
        const initialExclusiveValue = {
            creditexpiry: moment(headerData?.expirydate),
        };
        setExlusiveInitialValues(initialExclusiveValue);
    }, [headerData, form]);

    const handleNumberChange = (e) => {
        const value = e.target.value;
        const baseLimit = headerData?.baselimit;
        if (value) {
            const percentage = (value / baseLimit) * 100;
            form.setFieldsValue({
                extensionrequiredpercentage: percentage.toFixed(2),
            });
        } else {
            form.setFieldsValue({ extensionrequiredpercentage: '' });
        }
    };

    const disabledDate = (current) => {
        return current && current < moment().startOf('day');
    };

    const onReset = () => {
        setIsResetEnable(true);
        form.resetFields();
        form.setFieldsValue(initialValues);
        form.setFieldsValue(exlusiveinitialValues);
        setIsEditMode(false);
        setEcomRemarks(false);
    };

    useEffect(() => {
        if (headerData && Object.keys(headerData).length > 0 && transaction_id && props?.location?.state?.flag !== false) {
            let transaction_id = JSON.parse(window.localStorage.getItem('CREDIT_LIMIT_REDIRECT_PARAMS'));
            if (transaction_id) {
                if (localStorage.getItem('CREDIT_LIMIT_REDIRECT_PARAMS')) {
                    setValidateFromPayload(true);
                    const parsed = JSON.parse(JSON.stringify(transaction_id));
                    if (parsed?.action) {
                        if (parsed.action === 'approve') { 
                            if (customerGroup && MT_ECOM_GROUPS.includes(customerGroup)) {
                                handleApprove();
                            } else {
                                handleMtExclusiveMail('approve');
                            }
                        } else if (parsed.action === 'reject') {
                            if (customerGroup && MT_ECOM_GROUPS.includes(customerGroup)) {
                                setCheckActionFromMail(false);
                                handleReject();
                            } else {
                                setCheckActionFromMail(false);
                                handleMtExclusiveMail('reject');
                            }
                        }
                    }
                }
            }
        }
    }, [headerDataCheck, customerGroup, mtexclusiveCheck]);


    const handleMtExclusiveMail = async (actionMode) => {
        if (isDataLoading || mtExclusiveData.length === 0) {
            return;
        }

        await form.validateFields();
        const approvedData = mtExclusiveData?.filter((item) => item.status === 'PENDING');
        const finalData = approvedData?.map((item) => ({
            transaction_id: item.transaction_id,
            amount_requested: item.amount_requested,
            expirydate: form.getFieldValue('creditexpiry') ? form.getFieldValue('creditexpiry') : '-',
            status: actionMode === 'approve' ? 'APPROVED' : 'REJECTED',
            childid: item.childid,
            approver_remarks: form.getFieldValue('remarks') ? form.getFieldValue('remarks') : '-',
        }));
        const finalPayload = {
            queryParams: finalData,
        };
        try {
            if (isSubmitting) return;
            setIsSubmitting(true);
            const approveResponse = await cl_approver_update(finalPayload);
            if (approveResponse?.data?.success) {
                notificationSender(true, 'Success', actionMode === 'approve' ? 'Request approved successfully' : 'Request rejected successfully');
                fetchOrderRequestData(trans_id);
            }
        } catch (error) {
            console.log(error);
            notificationSender(false, 'Error', `Error while ${actionMode} the request`);
        } finally {
            setActionMode(null);
            setMtExclusiveRemarksDisabled(true);
            form.setFieldsValue({ remarks: '' });
            setSelectAll(false);
            setIsSubmitting(false);
            setValidateFromPayload(false);
            localStorage.removeItem('CREDIT_LIMIT_REDIRECT_PARAMS');
        }
    };
    useEffect(() => {
        if (!isDataLoading && mtExclusiveData.length > 0 && actionMode) {
            if (validatePayload) {
                if (hasEditPermission(pages.CREDIT_LIMIT, features.CL_SECONDARY_REMARKS_VIEW)) {
                    handleMtExclusiveMail(actionMode);
                }
            }
        }
    }, [isDataLoading, mtExclusiveData, actionMode]);

    const handleDownloadClick = () => {
        const downloadUrl = headerData?.file_link;
        if (downloadUrl) {
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = downloadUrl.split('/').pop();
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            notificationSender(true, 'Success', 'File downloaded successfully');
        } else {
            notificationSender(false, 'Error', 'Failed to download file');
        }
    };

    const handleValuesChange = () => {
        setIsResetEnable(false);
    };

    const onFinish = () => {
        if (action === 'approve') {
            setAction('');
            handleApprove();
        } else if (action === 'reject') {
            setAction('');
            handleReject();
        }
    };
    useEffect(() => {
        if (action) {
            onFinish();
        }
    }, [action]);

    const handleKeyPress = (e) => {
        const charCode = e.charCode;
        if (charCode < 48 || charCode > 57) {
            e.preventDefault();
        }
    };

    const handleEditClick = () => {
        if (isEditMode) {
            setIsEditMode(false);
        }
        setIsEditMode(!isEditMode);
        form.resetFields();
        form.setFieldsValue(initialValues);
        form.setFieldsValue(exlusiveinitialValues);
        setAction('');
    };

    const handleAmountChange = (e) => {
        const value = e.target.value;
        const isValid = /^[1-9][0-9]*$/.test(value);

        if ((isValid && value.length <= 10) || value === '') {
            setAmountRequested(value);
            setErrorMessage('');
            setIsSaveEnabled(false);
        } else if (value.length > 10) {
            setErrorMessage('Input should not exceed 10 characters');
            setIsSaveEnabled(false);
        } else {
            setErrorMessage('Should be a number and not start with zero');
            setIsSaveEnabled(false);
        }
    };

    const sortColumn = (columnName) => {
        const newSortDirection = !sortDirection;
        setSortDirection(newSortDirection);

        const sortedRows = [...mtExclusiveData].sort((a, b) => {
            let comparison = 0;
            const aValue = columnName === 'amount_requested' ? parseFloat(a[columnName]) : a[columnName];
            const bValue = columnName === 'amount_requested' ? parseFloat(b[columnName]) : b[columnName];

            if (aValue < bValue) {
                comparison = -1;
            }
            if (aValue > bValue) {
                comparison = 1;
            }
            return newSortDirection ? comparison : comparison * -1;
        });

        setMtExclusiveData(sortedRows);
    };

    let data = {};
    const {
        invoicesDue = ageing?.INVOICES_DUE ?? NO_DATA_SYMBOL,
        dzCollection = ageing?.DZ_COLLECTION ?? NO_DATA_SYMBOL,
        netOd = ageing?.AVA_BALANCE ?? NO_DATA_SYMBOL,
        invoicesNotDue = ageing?.INVOICES_NOTDUE ?? NO_DATA_SYMBOL,
        suDebitNote = ageing?.INVOICES_NOTDUE ?? NO_DATA_SYMBOL, //SAME ? FOR INVOICES NOT DUE
        creditNote = ageing?.CREDIT_NOTE ?? NO_DATA_SYMBOL,
        totalUtilization = ageing?.TOTAL ?? NO_DATA_SYMBOL,
    } = data || {};

    const creditData = [
        { label: 'Invoices Due', amount: invoicesDue },
        { label: 'DZ (collection)', amount: dzCollection },
        { label: 'Net OD', amount: netOd },
        { label: 'Invoices Not Due', amount: invoicesNotDue },
        { label: 'SU (Debit Note)', amount: suDebitNote },
        { label: 'Credit Note', amount: creditNote },
        { label: 'Total Utilization', amount: totalUtilization },
    ];

    const ageingData = [
        {
            label: '0-5 Days',
            amount: ageing?.ZERO_TO_FIVE ?? NO_DATA_SYMBOL,
        },
        {
            label: '6-10 Days',
            amount: ageing?.SIX_TO_TEN_DAYS ?? NO_DATA_SYMBOL,
        },
        {
            label: '11-30 Days',
            amount: ageing?.ELEVEN_TO_THIRTY ?? NO_DATA_SYMBOL,
        },
        {
            label: '31-60 Days',
            amount: ageing?.THIRTYONE_TO_SIXTY ?? NO_DATA_SYMBOL,
        },
    ];

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
                                    {headerData?.reason ? (
                                        <span>
                                            {headerData.reason.length > 10 ? (
                                                <span>
                                                    {headerData.reason.slice(0, 10)}...
                                                    <Popover
                                                        content={
                                                            <div className="fixed-height-popover">
                                                                <div className="popover-content">{headerData?.reason ? headerData.reason : '-'}</div>
                                                            </div>
                                                        }
                                                        placement="top">
                                                        <InfoCircleFilled style={{ color: '#12b7e9' }} />
                                                    </Popover>
                                                </span>
                                            ) : (
                                                headerData.reason
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
                                    <span>Third Approver</span>{' '}
                                </td>
                                <td className="credit-limit-info-td">
                                    {': '}
                                    {headerData?.approver_full_names ? headerData?.approver_full_names[2] : '-'}
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
                                                    channel: 'mt',
                                                },
                                            });
                                        }}>
                                        <ArrowLeftOutlined />
                                        Back To Transaction Summary Page
                                    </button>
                                </td>
                                <td className="credit-limit-info-td">
                                    {headerData?.file_link && (
                                        <Tooltip display="bottom" title="Download Payment confirmation sent by the requestor">
                                            <button className="payment-confirmation-btn-download" onClick={handleDownloadClick}>
                                                Payment Confirmation <DownloadOutlined />
                                            </button>
                                        </Tooltip>
                                    )}
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
                {customerGroup && MT_ECOM_GROUPS.includes(customerGroup) ? (
                    <div className="cl-card">
                        <div className="dashboard-table cl-new-dashboard-table">
                            <Spinner>
                                <h3>Customer Group : {headerData?.customer_group ? `${headerData.customer_group} - ${headerData.customer_group_description}` : '-'} </h3>
                                <table>
                                    <thead className="sales-orders-th">
                                        <tr>
                                            <th>Payer Code</th>
                                            <th className="thead-po">Base Limit (₹) </th>
                                            <th>Extension Required (₹) </th>
                                            <th className="so-column">
                                                Expiry Date{' '}
                                                <Popover content={default_expiry_content} placement="top" className="th-info-icon">
                                                    <InfoCircleFilled />
                                                </Popover>
                                            </th>
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
                                            <th>Status </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactionData?.result?.length > 0 ? (
                                            transactionData?.result.map((transactionData, index) => (
                                                <tr key={index}>
                                                    <td>{transactionData?.payercode ? transactionData?.payercode : '-'}</td>
                                                    <td>{transactionData?.baselimit ? transactionData?.baselimit : '-'}</td>
                                                    <td>{transactionData?.amount_requested ? transactionData?.amount_requested : '-'}</td>
                                                    <td>{transactionData?.expirydate ? <> {Util.formatDate(transactionData?.expirydate)} </> : '-'}</td>
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
                                                                className={`status-cl-view ${transactionData.status === 'APPROVED'
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
                                                <td colSpan="9" style={{ textAlign: 'center' }}>
                                                    No data found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {hasViewPermission(pages.CREDIT_LIMIT, features.CL_AGEING_REPORT) ? (
                                    <div className="credit-utilization-card">
                                        <div className="tables-container">
                                            <div className="table-wrapper">
                                                <h3>Credit Utilization</h3>
                                                <table>
                                                    <thead>
                                                        <tr className="ageing-tr">
                                                            <th>Names</th>
                                                            <th>Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {creditData.map((item, index) => (
                                                            <tr key={index} className={item.className}>
                                                                <td className="label-cell">{item.label}</td>
                                                                <td className="amount-cell">{item.amount}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="table-wrapper">
                                                <h3>AGEING</h3>
                                                <table>
                                                    <thead>
                                                        <tr className="ageing-tr">
                                                            <th>Ageing</th>
                                                            <th>Amount</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {ageingData.map((item, index) => (
                                                            <tr key={index} className={item.className}>
                                                                <td className="label-cell">{item.label}</td>
                                                                <td className="amount-cell">{item.amount}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    ''
                                )}
                            </Spinner>
                        </div>

                        <div className="request-form-container">
                            <Form
                                name="basic"
                                form={form}
                                initialValues={{
                                    creditexpiry: moment().add(7, 'days'),
                                }}
                                onFinish={onFinish}
                                requiredMark={false}
                                onValuesChange={handleValuesChange}
                                autoComplete="off">
                                <div>
                                    {hasEditPermission(pages.CREDIT_LIMIT, features.REMARKS_VIEW) && headerData?.status === 'PENDING' && (
                                        <div>
                                            <div className="approver-form-btns">
                                                <button disabled={editFlag} className="form-edit-btn" onClick={handleEditClick}>
                                                    {isEditMode ? 'Cancel' : 'Edit'}
                                                </button>
                                                <button className="approver-form-reset-btn" onClick={onReset} disabled={isResetEnable}>
                                                    Reset
                                                </button>
                                            </div>
                                            <div>
                                                <div className="cl-ecom-form-control">
                                                    <Form.Item
                                                        label="Extension Required(₹)"
                                                        name="extensionrequiredrs"
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message: 'Please enter the required ₹',
                                                            },
                                                            {
                                                                pattern: /^[1-9][0-9]*$/,
                                                                message: 'Should not starts with 0',
                                                            },
                                                        ]}>
                                                        <Input
                                                            style={{ width: '300px' }}
                                                            placeholder="Enter a Extension Required ₹"
                                                            onChange={handleNumberChange}
                                                            maxLength={10}
                                                            onKeyPress={handleKeyPress}
                                                            disabled={!isEditMode}
                                                        />
                                                    </Form.Item>
                                                    <Form.Item label="Extension Required (%)" name="extensionrequiredpercentage">
                                                        <Input style={{ width: '300px' }} disabled={true} placeholder="Extension Required %" readOnly />
                                                    </Form.Item>
                                                </div>
                                                <div className="cl-ecom-form-control">
                                                    <Form.Item label="Credit Expiry" name="creditexpiry" className="custom-form-approver-credit">
                                                        <DatePicker
                                                            disabledDate={disabledDate}
                                                            disabled={!isEditMode}
                                                            format="DD-MM-YYYY"
                                                            allowClear
                                                            onChange={(date) => {
                                                                if (!date) {
                                                                    form.setFieldsValue({
                                                                        creditexpiry: moment(headerData.expirydate),
                                                                    });
                                                                }
                                                            }}
                                                            style={{
                                                                width: '300px',
                                                                marginLeft: '50px',
                                                            }}></DatePicker>
                                                    </Form.Item>
                                                    <Form.Item
                                                        label="Remarks"
                                                        name="remarks"
                                                        className="custom-form-approver-remarks"
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message: 'Please enter your remarks',
                                                            },
                                                            {
                                                                min: 10,
                                                                message: 'Remarks must be between 10-3000 characters ',
                                                            },
                                                            {
                                                                max: 3000,
                                                                message: 'Remarks must not exceed 3000 characters',
                                                            },
                                                        ]}>
                                                        <Input.TextArea
                                                            className="request-form-textarea"
                                                            disabled={isResponseDisabled || isSubmitting}
                                                            onKeyPress={(e) => {
                                                                if (e.target.value.length === 0 && e.key === ' ') {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            placeholder="Remarks must be between 10-3000 characters"></Input.TextArea>
                                                    </Form.Item>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="approvers-remarks-div">
                                        {hasEditPermission(pages.CREDIT_LIMIT, features.CL_SECONDARY_REMARKS_VIEW) && transactionstatus === 'PENDING' && (
                                            <Form.Item
                                                label="Remarks"
                                                name="remarks"
                                                rules={[
                                                    {
                                                        required: true,
                                                        message: 'Please enter your remarks',
                                                    },
                                                    {
                                                        min: 10,
                                                        message: 'Remarks must be between 10-3000 characters ',
                                                    },
                                                    {
                                                        max: 3000,
                                                        message: 'Remarks must not exceed 3000 characters',
                                                    },
                                                ] }
                                                className="approvers-remarks-feild">
                                                <Input.TextArea className="approvers-remarks-textarea" placeholder="Please enter remarks"
                                                    disabled={isResponseDisabled || isSubmitting}
                                                    onKeyPress={(e) => {
                                                        if (e.target.value.length === 0 && e.key === ' ') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onChange={(e) => handleREmarksChange(e)}  
                                                ></Input.TextArea>
                                            </Form.Item>
                                        )}
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
                                    {hasEditPermission(pages.CREDIT_LIMIT, features.EDIT_APPROVAL_CL) && transactionstatus === 'PENDING' && (
                                        <div
                                            className="order-btns"
                                            style={{
                                                marginRight: '20px',
                                                marginTop: '10px',
                                            }}>
                                            <div className="dis-message">{disabledMessage}</div>
                                            <button className="approve-btn" disabled={isResponseDisabled || isSubmitting} type="button" onClick={() => setAction('approve')}>
                                                Approve
                                            </button>
                                            <button className="reject-btn" disabled={isResponseDisabled || isSubmitting} type="button" onClick={() => setAction('reject')}>
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </Form>
                        </div>
                    </div>
                ) : (
                    <div className="cl-card">
                        <div className="dashboard-table cl-new-dashboard-table">
                            <Spinner>
                                <h3>Customer Group : {headerData?.customer_group ? `${headerData.customer_group} - ${headerData.customer_group_description}` : '-'} </h3>
                                <table>
                                    <thead className="sales-orders-th">
                                        <tr className="cl-table-body">
                                            <th> {actionMode && <input type="checkbox" checked={selectAll} onChange={handleSelectAllChange} />}</th>
                                            <th onClick={() => sortColumn('childid')}>
                                                Sub Request No <img src="/assets/images/sorting_icon.svg" alt="" />
                                            </th>
                                            <th>Payer Code </th>
                                            <th className="thead-po">Base Limit (₹) </th>
                                            <th onClick={() => sortColumn('amount_requested')}>
                                                Extension Required (₹) <img src="/assets/images/sorting_icon.svg" alt="" />
                                            </th>
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
                                            <th>Status </th>
                                            {hasEditPermission(pages.CREDIT_LIMIT, features.REMARKS_VIEW) && <th>Action </th>}
                                        </tr>
                                    </thead>
                                            <tbody className="cl-table-body">
                                                {mtExclusiveData?.length > 0 ? (
                                                    mtExclusiveData?.map((transactionData, index) => (
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
                                                            <td>{transactionData?.childid ? transactionData?.childid : '-'}</td>
                                                            <td>{transactionData?.payercode ? transactionData?.payercode : '-'}</td>
                                                            <td>{transactionData?.baselimit ? transactionData?.baselimit : '-'}</td>
                                                            <td>
                                                                {editIndex === index ? (
                                                                    <>
                                                                        <input
                                                                            style={{ width: '120px' }}
                                                                            type="text"
                                                                            maxLength={10}
                                                                            value={amountRequested}
                                                                            onChange={handleAmountChange}
                                                                        />
                                                                        {errorMessage && (
                                                                            <div
                                                                                style={{
                                                                                    color: 'red',
                                                                                    fontSize: '12px',
                                                                                }}>
                                                                                {errorMessage}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    transactionData?.amount_requested || '-'
                                                                )}
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
                                                                        className={`status-cl-view ${transactionData.status === 'APPROVED'
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
                                                            {hasEditPermission(pages.CREDIT_LIMIT, features.REMARKS_VIEW) && (
                                                                <td>
                                                                    {editIndex === index ? (
                                                                        <>
                                                                            <button className="cl-button button-save-cl" disabled={isSaveEnabled} onClick={handleSaveClick}>
                                                                                Save
                                                                            </button>{' '}
                                                                            <button className="cl-button button-cancel-cl" onClick={handleCancelClick}>
                                                                                Cancel
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            className="cl-button button-edit-cl"
                                                                            disabled={isResponseDisabled}
                                                                            onClick={() => handleEditClickii(index, transactionData?.amount_requested || '-', transactionData?.expirydate)}>
                                                                            Edit
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            )}
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
                            </Spinner>
                        </div>

                        <div className="request-form-container">
                            <Form
                                name="basic"
                                form={form}
                                exlusiveinitialValues={{
                                    creditexpiry: moment().add(7, 'days'),
                                }}
                                onFinish={onFinish}
                                requiredMark={false}
                                onValuesChange={handleValuesChange}
                                autoComplete="off">
                                <div>
                                    {hasEditPermission(pages.CREDIT_LIMIT, features.REMARKS_VIEW) && mtEclusiveStatus && (
                                        <div className="cl-exc-form-control">
                                            {hasEditPermission(pages.CREDIT_LIMIT, features.REMARKS_VIEW) && (
                                                <div style={{ display: 'flex', gap: '200px', marginTop: '50px' }}>
                                                    <Form.Item label="Credit Expiry" name="creditexpiry" className="custom-form-approver-credit">
                                                        <DatePicker
                                                            disabledDate={disabledDate}
                                                            disabled={selectedRows.length === 0 || isSubmitting}
                                                            format="DD-MM-YYYY"
                                                            allowClear
                                                            onChange={(date) => {
                                                                if (!date) {
                                                                    form.setFieldsValue({
                                                                        creditexpiry: moment(headerData.expirydate),
                                                                    });
                                                                }
                                                            }}
                                                            style={{
                                                                width: '200px',
                                                                marginLeft: '50px',
                                                            }}></DatePicker>
                                                    </Form.Item>
                                                    <Form.Item
                                                        label="Remarks"
                                                        name="remarks"
                                                        rules={
                                                            isMtExclusiveRemarksDisabled
                                                                ? []
                                                                : [
                                                                      {
                                                                          required: true,
                                                                          message: 'Please enter your remarks',
                                                                      },
                                                                      {
                                                                          min: 10,
                                                                          message: 'Remarks must be between 10-3000 characters ',
                                                                      },
                                                                      {
                                                                          max: 3000,
                                                                          message: 'Remarks must not exceed 3000 characters',
                                                                      },
                                                                  ]
                                                        }
                                                        className="custom-form-approver-remarks">
                                                        <Input.TextArea
                                                            className="request-form-textarea"
                                                            disabled={selectedRows.length === 0 || isSubmitting}
                                                            placeholder="Remarks must be between 10-3000 characters"
                                                            onKeyPress={(e) => {
                                                                    if (e.target.value.length === 0 && e.key === ' ') {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                            ></Input.TextArea>
                                                    </Form.Item>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="approvers-remarks-div">
                                        {hasEditPermission(pages.CREDIT_LIMIT, features.CL_SECONDARY_REMARKS_VIEW) &&
                                            mtEclusiveStatus &&
                                            (actionMode === 'reject' || actionMode === 'approve') && (
                                                <Form.Item
                                                    label="Remarks"
                                                    name="remarks"
                                                    rules={
                                                        selectedRows.length > 0 && actionMode === 'reject'
                                                            ? [
                                                                  {
                                                                      required: true,
                                                                      message: 'Please enter your remarks',
                                                                  },
                                                                  {
                                                                      min: 10,
                                                                      message: 'Remarks must be between 10-3000 characters ',
                                                                  },
                                                                  {
                                                                      max: 3000,
                                                                      message: 'Remarks must not exceed 3000 characters',
                                                                  },
                                                              ]
                                                            : []
                                                    }
                                                    className="custom-form-approver-remarks approvers-remarks-feild">
                                                    <Input.TextArea className="request-form-textarea"
                                                        disabled={selectedRows.length === 0 || isSubmitting}
                                                        placeholder={actionMode === 'approve' ? "Please enter remarks" : "Remarks must be between 10-3000 characters"}
                                                        onKeyPress={(e) => {
                                                            if (e.target.value.length === 0 && e.key === ' ') {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                    >
                                                    </Input.TextArea>
                                                </Form.Item>
                                            )}
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
                                    {hasEditPermission(pages.CREDIT_LIMIT, features.EDIT_APPROVAL_CL) && mtEclusiveStatus && (
                                        <div>
                                            {actionMode ? (
                                                <div className="order-btns">
                                                    <button
                                                        type="submit"
                                                        disabled={selectedRows.length === 0 || isSubmitting}
                                                        className="exclusive-cl-button button-save-cl"
                                                        onClick={handleMtExclusiveCheckBoxSave}>
                                                        Save
                                                    </button>{' '}
                                                    <button className="exclusive-cl-button button-cancel-cl" onClick={handleCancelClick} disabled={isSubmitting}>
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="order-btns">
                                                    <div className="dis-message">{disabledMessage}</div>
                                                    <button
                                                        className="approve-btn"
                                                        disabled={isResponseDisabled || isSubmitting}
                                                        type="submit"
                                                        onClick={() => handleMtExclusiveApprove('approve')}>
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="reject-btn"
                                                        disabled={isResponseDisabled || isSubmitting}
                                                        type="submit"
                                                        onClick={() => handleMtExclusiveReject('reject')}>
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const mapStateToProps = (state) => {
    return {
        app_level_configuration: state.auth.get('app_level_configuration'),
        credit_details: state.dashboard.get('credit_details'),
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        getTransactionDetails: (trans_id) => dispatch(AdminAction.getTransactionDetails(trans_id)),
        cl_approver_update: (data) => dispatch(AdminAction.cl_approver_update(data)),
        getCreditDetailsFromSap: (login_id) => dispatch(AdminAction.getCreditDetailsFromSap(login_id)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(TransactionDetails);
