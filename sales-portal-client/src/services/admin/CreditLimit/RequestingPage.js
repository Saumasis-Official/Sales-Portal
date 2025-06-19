import React, { useState, useEffect, useRef } from 'react';
import { Button, notification, Form, Input, Select, DatePicker } from 'antd';
import './RequestingPage.css';
import moment from 'moment';
import * as Action from '../actions/adminAction';
import { connect } from 'react-redux';
import { UploadOutlined } from '@ant-design/icons';
import { Alert, Modal } from 'antd';
import { hasEditPermission, pages, features } from '../../../persona/distributorNav';
import { MT_ECOM_GROUPS } from '../../../config/constant';
import PropTypes from 'prop-types';
import { NO_DATA_SYMBOL } from '../../../constants/index';
import Loader from '../../../components/Loader/creditLimitIndex';
import { debounce } from 'lodash';

const { Option } = Select;

const RequestingPage = (props) => {
    const { sendCreditExtensionRequest, getCustomerDetails, getFinanceApprover, credit_details = {}, fetch_approvers } = props;

    const [customerDetails, setCustomerDetails] = useState([]);
    const [isSubmitEnable, setIsSubmitEnable] = useState(true);
    const [isResetEnable, setIsResetEnable] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState({});
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [fileName, setFileName] = useState('');
    const [uploadedEmailFile, setUploadedFile] = useState({});
    const [payerCode, setPayerCode] = useState('');
    const [form] = Form.useForm();
    const [filteredCustomerGroup, setFilteredCustomerGroup] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [selectedApprover, setSelectedApprover] = useState(null);
    const [payerName, setPayerName] = useState('');
    const [selectedCustomerGroup, setSelectedCustomerGroup] = useState('');
    const [rows, setRows] = useState([{}]);
    const [isAddRowDisabled, setIsAddRowDisabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [baseLimit, setBaseLimit] = useState(null);
    const [existingExtension, setExistingExtension] = useState('');
    const [existingExtensionPer, setExistingExtensionPer] = useState('');
    const [existingExtensionExpiry, setExistingExtensionExpiry] = useState('');
    const [riskFactor, setRiskFactor] = useState('');
    const [secondApprover, setSecondApprover] = useState('');
    const [thirdApprover, setThirdApprover] = useState('');
    const [secondApproverEmail, setSecondApproverEmail] = useState('');
    const [thirdApproverEmail, setThirdApproverEmail] = useState('');
    const fileInputRef = useRef(null);
    const baseLimitRef = useRef(null);
    const riskClassRef = useRef(null);

    useEffect(() => {
        const fetchApprovers = async () => {
            try {
                const response = await getFinanceApprover();
                setApprovers(response?.data?.rows);
            } catch (error) {
                console.error('Error fetching approvers:', error);
            }
        };

        fetchApprovers();
    }, []);

    const handleSelectChange = async (value) => {
        setSelectedApprover(value);
    };

    useEffect(() => {
        const fetchCustomerDetails = async () => {
            try {
                const response = await getCustomerDetails();
                if (response && response.data) {
                    setCustomerDetails(response?.data?.rows);
                }
            } catch (error) {
                console.error('Error fetching customer details:', error);
            }
        };
        fetchCustomerDetails();
    }, []);

    const uniqueCustomerCode = [...new Set(filteredCustomerGroup.map((customer) => customer.payer_code))];

    useEffect(() => {
        const availablePayerCodes = getAvailablePayerCodes(rows.length);
        setIsAddRowDisabled(availablePayerCodes.length === 0);
    }, [rows]);

    useEffect(() => {
        form.validateFields(['paymentconfirmation']);
    }, [fileName]);

    useEffect(() => {
        if (rows?.length > 0 && rows[rows.length - 1]?.extensionrequiredrs) {
            handleBlurExclusive();
        }
        if (rows?.length === 0) {
            setSecondApprover('');
            setThirdApprover('');
            setSecondApproverEmail('');
            setThirdApproverEmail('');
            setFileName('');
            form.resetFields();
        }
    }, [rows]);

    const disabledDate = (current) => {
        return current && current < moment().startOf('day');
    };

    const handleNumberChange = (e) => {
        const value = e.target.value;
        if (value) {
            const percentage = (value / baseLimit) * 100;
            form.setFieldsValue({
                extensionrequiredpercentage: percentage.toFixed(2),
            });
        } else {
            form.setFieldsValue({ extensionrequiredpercentage: '' });
        }
    };

    const handleNumberChangeMTExclusive = debounce(async (e, index) => {
        try {
            setIsLoading(true);
            const value = e.target.value;
            const updatedRows = [...rows];
            updatedRows[index].extensionrequiredrs = value;
            // updatedRows[index].riskFactor = riskFactor;
            if (value && baseLimit) {
                const percentage = (value / baseLimit) * 100;
                updatedRows[index].extensionrequiredpercentage = percentage.toFixed(2);
            } else {
                updatedRows[index].extensionrequiredpercentage = '';
            }
            setRows(updatedRows);
            form.setFieldsValue({
                [`extensionrequiredpercentage_${index}`]: updatedRows[index].extensionrequiredpercentage,
            });
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'Failed to process request',
            });
        } finally {
            setIsLoading(false);
        }
    }, 500);

    const handleFieldsChange = () => {
        setIsResetEnable(false);
        setIsSubmitEnable(false);
    };

    const onReset = () => {
        form.resetFields();
        setFileName('');
        setSelectedCustomer({});
        setFilteredCustomerGroup([]);
        setPayerCode('');
        setIsSubmitEnable(true);
        setIsResetEnable(true);
        setUploadedFile({});
        setRows([{}]);
        setBaseLimit(null);
        setSecondApprover('');
        setThirdApprover('');
    };
    const onResetPayerCodeChangeExclusive = () => {
        form.resetFields();
        setFileName('');
        // setSelectedCustomer({});
        // setFilteredCustomerGroup([]);
        setPayerCode('');
        // setIsSubmitEnable(true);
        // setIsResetEnable(true);
        setUploadedFile({});
        // setRows([{}]);
        setBaseLimit(null);
        setSecondApprover('');
        setThirdApprover('');
    };

    const mtExclusiveOnclear = (index) => {
        const updatedRows = [...rows];
        updatedRows[index] = {};
        setRows(updatedRows);
        form.setFieldsValue({
            [`extensionrequiredrs_${index}`]: ' ',
            [`extensionrequiredpercentage_${index}`]: ' ',
        });
        setSecondApprover('');
        setThirdApprover('');
    };

    const onSubmit = async (values) => {
        setIsSubmitEnable(true);
        if (!secondApproverEmail || !thirdApproverEmail) {
            let errorMessage = 'Not able to proceed: ';
            if (!secondApproverEmail) {
                errorMessage += 'Second approver not found. ';
            }
            if (!thirdApproverEmail) {
                errorMessage += 'Third approver not found.';
            }
            notification.error({
                message: 'Error Occurred',
                description: errorMessage.trim(),
                duration: 5,
                className: 'notification-error',
            });
            return;
        }

        const formattedValues = {
            ...values,
            creditexpiry: values.creditexpiry ? moment(values.creditexpiry) : null,
        };

        const mtExclusivePayload = rows
            .filter((row) => row?.baseLimit && row?.riskFactor)
            .map((row, index) => ({
                customer_Code: form.getFieldValue(`PayerCode_${index}`),
                amount_requested: form.getFieldValue(`extensionrequiredrs_${index}`).trim(),
                payer_code: row?.payerCode,
                payer_name: row?.payerName,
                approver1: formattedValues?.l1approver,
                approver2: secondApproverEmail,
                approver3: thirdApproverEmail,
                remarks: formattedValues?.remarks,
                expiry_date: formattedValues?.creditexpiry,
                base_limit: row.baseLimit,
            }));

        if (!MT_ECOM_GROUPS.includes(selectedCustomerGroup) && mtExclusivePayload.length !== rows?.length) {
            notification.error({
                message: 'Error Occurred',
                description: 'Please fill all required fields before proceeding',
                duration: 5,
                className: 'notification-error',
            });
            return;
        }
        // const mtExclusivePayload = rows.map((row, index) => ({
        //     customer_Code: form.getFieldValue(`PayerCode_${index}`),
        //     amount_requested: form.getFieldValue(`extensionrequiredrs_${index}`),
        //     payer_code: row?.payerCode,
        //     payer_name: row?.payerName,
        //     approver1: formattedValues?.l1approver,
        //     approver2: secondApproverEmail,
        //     approver3: thirdApproverEmail,
        //     remarks: formattedValues?.remarks,
        //     expiry_date: formattedValues?.creditexpiry,
        //     base_limit: row.baseLimit,
        // }));

        const mtEcomPayload = [
            {
                customer_Code: formattedValues?.CustomerCode,
                base_limit: formattedValues?.baseLimit || baseLimit,
                expiry_date: formattedValues?.creditexpiry,
                amount_requested: formattedValues?.extensionrequiredrs,
                payer_code: payerCode,
                remarks: formattedValues?.remarks,
                approver1: formattedValues?.l1approver,
                approver2: secondApproverEmail,
                approver3: thirdApproverEmail,
                payer_name: payerName,
            },
        ];

        const formData = new FormData();
        formData.append('file', uploadedEmailFile);
        if (MT_ECOM_GROUPS.includes(selectedCustomerGroup)) {
            formData.append('queryParams', JSON.stringify(mtEcomPayload));
        } else {
            formData.append('queryParams', JSON.stringify(mtExclusivePayload));
        }
        try {
            const res = await sendCreditExtensionRequest(formData);
            if (res?.success) {
                notification.success({
                    message: 'Success',
                    description: 'Credit extension request submitted successfully',
                    duration: 2,
                    className: 'notification-green',
                });
                setIsSubmitEnable(true);
                setFileName('');
            } else {
                notification.error({
                    message: 'Error Occurred',
                    description: 'Failed to submit credit extention request',
                    duration: 5,
                    className: 'notification-error',
                });
            }
        } catch (error) {
            notification.error({
                message: 'Technical Error',
                description: error.message,
                duration: 5,
                className: 'notification-error',
            });
        }
        onReset();
        setIsResetEnable(true);
    };
    useEffect(() => {
        baseLimitRef.current = baseLimit;
        riskClassRef.current = riskFactor;
    }, [baseLimit, riskFactor]);

    const handleSelectedPayerCode = async (value) => {
        if (!value) {
            setSelectedCustomer({});
            setPayerCode('');
            setPayerName('');
            setExistingExtension('');
            setExistingExtensionPer('');
            setExistingExtensionExpiry('');
            setBaseLimit(null);
            setRiskFactor('');
            setSecondApproverEmail('');
            setThirdApproverEmail('');
            setFileName('');
            setUploadedFile({});
            form.resetFields();
            return;
        }
        // setIsLoading(true)
        try {
            const customer = customerDetails.find((c) => c.payer_code === value);
            const baseLimit = customer?.mt_ecom_baseLimit;
            const riskClass = customer?.risk_class;
            // Update all states at once
            await Promise.all([
                setSelectedCustomer(customer),
                setPayerCode(customer?.payer_code),
                setPayerName(customer?.payer_name),
                setExistingExtension(customer?.amount_requested),
                setExistingExtensionPer(customer?.extensionpercentage),
                setExistingExtensionExpiry(customer?.expirydate),
                setBaseLimit(baseLimit),
                setRiskFactor(riskClass),
            ]);

            form.resetFields(['extensionrequiredrs', 'extensionrequiredpercentage']);
            setIsLoading(true);

            await props.getCreditLimitDetails(customer?.payer_code);
            setSecondApprover('');
            setThirdApprover('');
            setSecondApproverEmail('');
            setThirdApproverEmail('');
        } catch (error) {
            console.error('Error fetching credit limit details:', error);
            notification.error({
                message: 'Error',
                description: 'Failed to load customer details',
            });
            form.resetFields();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectedPayerCodeMTExclusive = async (value, index) => {
        if (!value) {
            return;
        }
        const selectedCustomer = customerDetails.find((customer) => customer.payer_code === value);
        setIsLoading(true);
        let baseLimitExclusive = 0;
        try {
            baseLimitExclusive = selectedCustomer?.mt_ecom_baseLimit;
            setBaseLimit(baseLimitExclusive);
            const temp = selectedCustomer?.risk_class;
            setRiskFactor(temp);
        } catch (error) {
            console.error('Error fetching credit limit details:', error);
        } finally {
            setIsLoading(false);
        }
        setSelectedCustomer(selectedCustomer);

        const updatedRows = [...rows];
        updatedRows[index] = {
            ...updatedRows[index],
            payerCode: value,
            payerName: selectedCustomer ? selectedCustomer.payer_name : '',
            baseLimit: baseLimitExclusive,
            existingExtension: selectedCustomer ? selectedCustomer.amount_requested : '',
            existingExtensionPer: selectedCustomer ? selectedCustomer.extensionpercentage : '',
            existingExpiry: selectedCustomer ? selectedCustomer.expirydate : '',
            riskFactor: selectedCustomer ? selectedCustomer.risk_class : '',
        };

        setRows(updatedRows);

        const checkPayerCode = rows.filter((row) => row.baseLimit === '' || row.riskFactor === '');
        if (rows.length === checkPayerCode.length) {
            onResetPayerCodeChangeExclusive();
        }
        if (!value) {
            form.setFieldsValue({ [`extensionrequiredrs_${index}`]: '' });
            form.setFieldsValue({
                [`extensionrequiredpercentage_${index}`]: '',
            });
        }
    };

    function closeModal() {
        setIsUploadModalOpen(false);
        setFileName('');
        setUploadedFile({});
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    const uploadPaymentFile = (e) => {
        const fileUploaded = e.target.files[0];
        if (fileUploaded) {
            const fileExtension = fileUploaded.name.split('.').pop().toLowerCase();
            if (fileExtension === 'msg' || fileExtension === 'eml') {
                setFileName(fileUploaded.name);
                setUploadedFile(fileUploaded);
                e.target.value = '';
            } else {
                notification.error({
                    message: 'Invalid File Type',
                    description: 'Please upload a valid ".msg" file',
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
        }
    };

    const uploadData = () => {
        setIsUploadModalOpen(false);
    };

    const uniqueGroups = [
        ...new Set(
            customerDetails
                .map((customer) => ({
                    group: customer.customer_group,
                    description: customer.customer_group_description,
                }))
                .map(JSON.stringify),
        ),
    ].map(JSON.parse);

    const filterByGroup = (group) => {
        const filteredCustomerGroup = customerDetails.filter((customer) => customer.customer_group === group);
        setFilteredCustomerGroup(filteredCustomerGroup);
        setSelectedCustomerGroup(group);
        form.resetFields(['PayerCode']);
        setSelectedCustomer({});
        setPayerName('');
        setExistingExtension('');
        setExistingExtensionPer('');
        setExistingExtensionExpiry('');
        setBaseLimit(null);
        setRows([{}]);
        setFileName('');
        setSecondApprover('');
        setThirdApprover('');
        const allFields = form.getFieldsValue();
        const fieldsToReset = Object.keys(allFields).filter((field) => field !== 'CustomerGroup');
        form.resetFields(fieldsToReset);
    };

    const handleKeyPress = async (e) => {
        const charCode = e.charCode;
        if (charCode < 48 || charCode > 57) {
            e.preventDefault();
        } else {
            await handleBlur(e);
        }
    };
    let data = {};
    const {
        invoicesDue = credit_details?.INVOICES_DUE ?? NO_DATA_SYMBOL,
        dzCollection = credit_details?.DZ_COLLECTION ?? NO_DATA_SYMBOL,
        netOd = credit_details?.AVA_BALANCE ?? NO_DATA_SYMBOL,
        invoicesNotDue = credit_details?.INVOICES_NOTDUE ?? NO_DATA_SYMBOL,
        suDebitNote = credit_details?.INVOICES_NOTDUE ?? NO_DATA_SYMBOL, //SAME ? FOR INVOICES NOT DUE
        creditNote = credit_details?.CREDIT_NOTE ?? NO_DATA_SYMBOL,
        totalUtilization = credit_details?.TOTAL ?? NO_DATA_SYMBOL,
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
            amount: credit_details?.ZERO_TO_FIVE ?? NO_DATA_SYMBOL,
        },
        {
            label: '6-10 Days',
            amount: credit_details?.SIX_TO_TEN_DAYS ?? NO_DATA_SYMBOL,
        },
        {
            label: '11-30 Days',
            amount: credit_details?.ELEVEN_TO_THIRTY ?? NO_DATA_SYMBOL,
        },
        {
            label: '31-60 Days',
            amount: credit_details?.THIRTYONE_TO_SIXTY ?? NO_DATA_SYMBOL,
        },
    ];

    const addRow = async () => {
        const newRowTemplate = {};
        try {
            const fieldsToValidate = rows.flatMap((_, index) => [`PayerCode_${index}`, `extensionrequiredrs_${index}`]);
            await form.validateFields(fieldsToValidate);
            const newRow = { ...newRowTemplate };
            setRows([...rows, newRow]);
            const newIndex = rows.length;
            form.setFieldsValue({
                [`PayerCode_${newIndex}`]: '',
                [`extensionrequiredrs_${newIndex}`]: '',
                [`extensionrequiredpercentage_${newIndex}`]: '',
                [`payer_name_${newIndex}`]: '',
                [`customerGroup_${newIndex}`]: '',
                [`type_${newIndex}`]: '',
            });
        } catch (error) {
            console.error(error);
            notification.error({
                message: 'Validation Error',
                description: 'Please fix the validation errors before adding a new request.',
                duration: 5,
                className: 'notification-error',
            });
        }
    };

    const handleDeleteRow = (index) => {
        setRows((prevRows) => {
            const updatedRows = prevRows.filter((_, i) => i !== index);
            const fieldsToUpdate = updatedRows.reduce((acc, row, idx) => {
                acc[`PayerCode_${idx}`] = row.payerCode;
                acc[`extensionrequiredrs_${idx}`] = row.extensionrequiredrs;
                acc[`extensionrequiredpercentage_${idx}`] = row.extensionrequiredpercentage;
                acc[`payer_name_${idx}`] = row.payer_name;
                acc[`riskFactor_${idx}`] = row.riskFactor;
                acc[`customerGroup_${idx}`] = selectedCustomerGroup;
                acc[`type_${idx}`] = 'MULTI';
                return acc;
            }, {});
            form.setFieldsValue(fieldsToUpdate);
            setRows(updatedRows);

            return updatedRows;
        });
    };

    const getAvailablePayerCodes = (index) => {
        const selectedPayerCodes = rows.map((row, idx) => idx !== index && row.payerCode).filter(Boolean);
        return uniqueCustomerCode.filter((code) => !selectedPayerCodes.includes(code));
    };

    const handleBlurExclusive = async () => {
        try {
            setIsLoading(true);
            if (!Array.isArray(rows) || rows.length === 0) {
                notification.error({
                    message: 'Error',
                    description: 'No data available to process',
                });
                return;
            }
            const missingDataRows = rows.filter((row) => {
                if (!row?.payerCode) return false; // Skip empty rows
                return !row?.riskFactor || !row?.baseLimit;
            });

            if (missingDataRows.length > 0) {
                const getErrorMessage = () => {
                    return missingDataRows
                        .map((row) => {
                            const messages = [];
                            if (!row.riskFactor && !row.baseLimit) {
                                messages.push(`Risk Class and Base Limit not found for Payer Code: ${row.payerCode}`);
                            } else if (!row.riskFactor) {
                                messages.push(`Risk Class not found for Payer Code: ${row.payerCode}`);
                            } else if (!row.baseLimit) {
                                messages.push(`Base Limit not found for Payer Code: ${row.payerCode} hence request can not proceed`);
                            }
                            return messages.join('\n');
                        })
                        .join('\n');
                };

                notification.error({
                    message: 'Error',
                    description: <pre style={{ whiteSpace: 'pre-wrap' }}>{getErrorMessage()}</pre>,
                    duration: 3,
                });
                return;
            }
            const isAllRowsFilled = rows.every((row) => row?.payerCode && row?.baseLimit && row?.extensionrequiredpercentage && row?.riskFactor);

            if (!isAllRowsFilled) {
                notification.info({
                    message: 'Info',
                    description: 'Please fill all required fields before proceeding',
                    duration: 3,
                });
                return;
            }
            const payload = rows.map((row) => ({
                payerCode: row?.payerCode,
                baseLimit: row?.baseLimit,
                // extensionrequiredrs: row.extensionrequiredrs,
                extensionrequiredpercentage: row?.extensionrequiredpercentage,
                riskFactor: row?.riskFactor,
                customerGroup: selectedCustomerGroup,
                type: 'MULTI',
            }));

            if (!MT_ECOM_GROUPS.includes(selectedCustomerGroup) && rows.length > 0 && rows[0]?.payerCode) {
                const response = await fetch_approvers(payload);
                setSecondApprover(response?.data?.[0]?.finance_name);
                setSecondApproverEmail(response?.data?.[0]?.finance_emails);
                setThirdApprover(response?.data?.[0]?.sales_name);
                setThirdApproverEmail(response?.data?.[0]?.sales_emails);

                if (!response?.data?.[0]) {
                    notification.error({
                        message: 'Error',
                        description: 'No approvers found for selected Payer Code',
                        duration: 3,
                    });
                    setSecondApprover('');
                    setThirdApprover('');
                    return;
                }
            } else {
                setSecondApprover('');
                setThirdApprover('');
                setSecondApproverEmail('');
                setThirdApproverEmail('');
            }
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'Failed to process request',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBlur = async (e) => {
        try {
            const { extensionrequiredpercentage } = form.getFieldsValue(['extensionrequiredpercentage']);
            const rowData = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

            const payloadData = {
                payerCode: rowData?.payerCode || payerCode,
                baseLimit: rowData?.baseLimit || baseLimit,
                extensionrequiredrs: rowData?.extensionrequiredrs || e.target.value,
                extensionrequiredpercentage: rowData?.extensionrequiredpercentage || extensionrequiredpercentage,
                payerName: rowData?.payerName || '',
                existingExtension: rowData?.existingExtension || null,
                existingExtensionPer: rowData?.existingExtensionPer || null,
                existingExpiry: rowData?.existingExpiry || null,
            };

            // Only create payload if in MT_ECOM_GROUPS
            if (!MT_ECOM_GROUPS.includes(selectedCustomerGroup)) {
                return;
            }

            const payload = {
                payer_code: payloadData?.payerCode,
                customer_group: selectedCustomerGroup,
                amount_requested: payloadData?.extensionrequiredrs,
                amount_percentage: payloadData?.extensionrequiredpercentage,
                risk_credit: riskFactor,
                base_limit: payloadData?.baseLimit,
            };

            if (!payload?.risk_credit || !payload?.base_limit) {
                const getErrorMessage = () => {
                    if (!payload?.risk_credit && !payload?.base_limit) {
                        return `Request can not proceed  as Risk Class and Base Limit not found for Payer Code: ${payload?.payer_code}`;
                    }
                    if (!payload?.risk_credit) {
                        return `Request can not proceed as Risk Class not found for Payer Code: ${payload?.payer_code}`;
                    }
                    return `Request can not proceed as Base Limit not found for Payer Code: ${payload?.payer_code}`;
                };
                notification.error({
                    message: 'Error',
                    description: getErrorMessage(),
                    duration: 3,
                });
                return;
            }

            const response = await fetch_approvers(payload);
            if (!response?.data?.[0]) {
                notification.error({
                    message: 'Error',
                    description: 'No approvers found for selected Payer Code',
                    duration: 3,
                });
                setSecondApprover('');
                setThirdApprover('');
                return;
            }

            setSecondApprover(response?.data?.[0]?.finance_name);
            setSecondApproverEmail(response?.data?.[0]?.finance_emails);
            setThirdApprover(response?.data?.[0]?.sales_name);
            setThirdApproverEmail(response?.data?.[0]?.sales_emails);
        } catch (error) {
            console.error('Error fetching approvers:', error);
            // notification.error({
            //     message: 'Error',
            //     description: 'Failed to process request',
            // });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div>
                <Form
                    name="basic"
                    form={form}
                    initialValues={{
                        creditexpiry: moment().add(7, 'days'),
                    }}
                    onFinish={onSubmit}
                    onFieldsChange={handleFieldsChange}
                    requiredMark={false}
                    autoComplete="off">
                    <div
                        style={{
                            marginTop: '20px',
                            display: 'flex',
                            gap: '20px',
                        }}>
                        <Form.Item label="Customer Group" name="CustomerGroup">
                            <Select placeholder="Customer Group" style={{ width: '150px' }} allowClear showSearch onChange={filterByGroup} onClear={onReset}>
                                {uniqueGroups.map((groupData) => (
                                    <Option key={groupData.group} value={groupData.group}>
                                        {groupData.group} - {groupData.description}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        {selectedCustomerGroup && MT_ECOM_GROUPS.includes(selectedCustomerGroup) && (
                            <Form.Item label="Payer Code" name="PayerCode">
                                <Select
                                    placeholder="Select Payer Code"
                                    style={{ width: '150px' }}
                                    allowClear
                                    showSearch
                                    onChange={handleSelectedPayerCode}
                                    disabled={filteredCustomerGroup.length <= 0}
                                    onClear={onReset}>
                                    {uniqueCustomerCode.map((group) => (
                                        <Option key={group} value={group}>
                                            {group}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        )}
                    </div>

                    <div className="admin-dashboard-table">
                        {selectedCustomerGroup && !MT_ECOM_GROUPS.includes(selectedCustomerGroup) ? (
                            <div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th className="sub-header">Payer Code</th>
                                            <th className="sub-header">Payer Name</th>
                                            <th className="sub-header">Base Limit(₹)</th>
                                            <th className="sub-header">Credit Risk</th>
                                            <th className="sub-header">Existing Extension (₹)</th>
                                            <th className="sub-header">Existing Extension (%)</th>
                                            <th className="sub-header">Existing Extension Expiry Date</th>
                                            <th className="sub-header">Extension Required (₹)</th>
                                            <th className="sub-header">Extension Required (%)</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ textAlign: 'left' }}>
                                        {filteredCustomerGroup.length > 0 ? (
                                            rows.map((row, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <Form.Item
                                                            name={`PayerCode_${index}`}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: 'Please select a Payer Code',
                                                                },
                                                            ]}>
                                                            <Select
                                                                placeholder="Payer Code"
                                                                style={{ width: '120px' }}
                                                                allowClear
                                                                showSearch
                                                                onClear={() => mtExclusiveOnclear(index)}
                                                                onChange={(value) => handleSelectedPayerCodeMTExclusive(value, index)}
                                                                disabled={filteredCustomerGroup.length <= 0}>
                                                                {getAvailablePayerCodes(index).map((group) => (
                                                                    <Option key={group} value={group}>
                                                                        {group}
                                                                    </Option>
                                                                ))}
                                                            </Select>
                                                        </Form.Item>
                                                    </td>
                                                    <td>{row.payerName ? row.payerName : NO_DATA_SYMBOL}</td>
                                                    <td>{row?.baseLimit ? row?.baseLimit : NO_DATA_SYMBOL}</td>
                                                    <td>{row?.riskFactor ? row?.riskFactor : NO_DATA_SYMBOL}</td>
                                                    <td>{row?.existingExtension ? row?.existingExtension : NO_DATA_SYMBOL}</td>
                                                    <td>{row?.existingExtensionPer ? row?.existingExtensionPer : NO_DATA_SYMBOL}</td>
                                                    <td>{row?.existingExpiry ? row?.existingExpiry.split('T')[0] : NO_DATA_SYMBOL}</td>
                                                    <td>
                                                        <Form.Item
                                                            name={`extensionrequiredrs_${index}`}
                                                            rules={
                                                                row.payerCode
                                                                    ? [
                                                                          {
                                                                              required: true,
                                                                              message: 'Please enter the required ₹',
                                                                          },
                                                                          {
                                                                              pattern: /^\s*[1-9][0-9]*$/,
                                                                              message: 'Should not start with 0',
                                                                          },
                                                                      ]
                                                                    : []
                                                            }>
                                                            <Input
                                                                style={{ width: '120px' }}
                                                                placeholder="Enter a Extension Required"
                                                                onChange={(e) => handleNumberChangeMTExclusive(e, index)}
                                                                // onBlur={handleBlurExclusive}
                                                                onKeyPress={handleKeyPress}
                                                                disabled={!row.payerCode}
                                                                maxLength={10}
                                                            />
                                                        </Form.Item>
                                                    </td>
                                                    <td>
                                                        <Form.Item name={`extensionrequiredpercentage_${index}`}>
                                                            <Input style={{ width: '100px' }} disabled={true} placeholder="Extension Required %" readOnly />
                                                        </Form.Item>
                                                    </td>
                                                    <td className="delete" style={{ cursor: 'pointer' }}>
                                                        <span>
                                                            <img src="/assets/images/delete.svg" onClick={() => handleDeleteRow(index)} alt="delete material" />
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="10" className="NoDataDiv">
                                                    <b>No Data Available. Please Select Customer Group</b>
                                                </td>
                                            </tr>
                                        )}
                                        <button type="button" className="form-add-btn" onClick={addRow} disabled={isAddRowDisabled}>
                                            Add +
                                        </button>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th className="sub-header">Payer Name</th>
                                            <th className="sub-header">Credit Risk Profile</th>
                                            <th className="sub-header">Base Limit (₹)</th>
                                            <th className="sub-header">Existing Extension (₹)</th>
                                            <th className="sub-header">Existing Extension (%)</th>
                                            <th className="sub-header">Existing Extension Expiry Date</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ textAlign: 'left' }}>
                                        {filteredCustomerGroup && filteredCustomerGroup.length > 0 && selectedCustomer?.payer_code && isLoading ? (
                                            <tr>
                                                <td colSpan="6" className="NoDataDiv">
                                                    <b>Loading please wait...</b>
                                                    <Loader />
                                                </td>
                                            </tr>
                                        ) : filteredCustomerGroup.length > 0 ? (
                                            selectedCustomer && Object.keys(selectedCustomer).length > 0 ? (
                                                <tr>
                                                    <td>{selectedCustomer?.payer_name ? selectedCustomer?.payer_name : NO_DATA_SYMBOL}</td>
                                                    <td>{riskFactor ? riskFactor : NO_DATA_SYMBOL}</td>
                                                    <td>{baseLimit ? baseLimit : NO_DATA_SYMBOL}</td>
                                                    <td>{existingExtension ? existingExtension : NO_DATA_SYMBOL}</td>
                                                    <td>{existingExtensionPer ? existingExtensionPer : NO_DATA_SYMBOL}</td>
                                                    <td>{existingExtensionExpiry ? existingExtensionExpiry.split('T')[0] : NO_DATA_SYMBOL}</td>
                                                </tr>
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="NoDataDiv">
                                                        <b>Please select a Payer Code</b>
                                                    </td>
                                                </tr>
                                            )
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="NoDataDiv">
                                                    <b>No Data Available. Please Select Customer Group</b>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div>
                        {isLoading ? (
                            <Loader />
                        ) : (
                            <>
                                {selectedCustomerGroup &&
                                MT_ECOM_GROUPS.includes(selectedCustomerGroup) &&
                                filteredCustomerGroup.length > 0 &&
                                selectedCustomer &&
                                Object.keys(selectedCustomer).length > 0 ? (
                                    <div className="credit-utilization-card">
                                        <div className="tables-container">
                                            <div className="table-wrapper">
                                                <h3>Credit Utilization</h3>
                                                <table>
                                                    <thead>
                                                        <tr>
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
                                                        <tr>
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

                                {hasEditPermission(pages.CREDIT_LIMIT, features.CREATE_REQUEST_CL) &&
                                    filteredCustomerGroup.length > 0 &&
                                    // credit_details?.CREDIT_LIMIT > 1 &&
                                    ((MT_ECOM_GROUPS.includes(selectedCustomerGroup) && payerCode !== '') ||
                                        (!MT_ECOM_GROUPS.includes(selectedCustomerGroup) && rows.length > 0)) && (
                                        <div className="request-details-card">
                                            <h2>REQUEST DETAILS</h2>
                                            {selectedCustomerGroup && MT_ECOM_GROUPS.includes(selectedCustomerGroup) && (
                                                <div className="request-details-section">
                                                    <Form.Item
                                                        label="Extension Required (₹)"
                                                        name="extensionrequiredrs"
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message: 'Please enter the required ₹',
                                                            },
                                                            {
                                                                pattern: /^[1-9][0-9]*$/,
                                                                message: 'Should not start with 0',
                                                            },
                                                        ]}>
                                                        <Input
                                                            style={{ width: '200px' }}
                                                            placeholder="Enter a Extension Required"
                                                            onChange={handleNumberChange}
                                                            onKeyPress={handleKeyPress}
                                                            maxLength={10}
                                                            onBlur={handleBlur}
                                                        />
                                                    </Form.Item>
                                                    <Form.Item label="Extension Required (%)" name="extensionrequiredpercentage">
                                                        <Input style={{ width: '200px' }} disabled={true} placeholder="Extension Required %" readOnly />
                                                    </Form.Item>
                                                </div>
                                            )}

                                            <div className="request-details-section">
                                                <Form.Item
                                                    label="Payment Confirmation"
                                                    name="paymentconfirmation"
                                                    rules={[
                                                        {
                                                            required: !fileName,
                                                            message: 'Payment confirmation is required',
                                                        },
                                                    ]}>
                                                    <Button
                                                        style={{ width: '200px', color: 'blue' }}
                                                        onClick={() => setIsUploadModalOpen(!isUploadModalOpen)}
                                                        icon={<UploadOutlined />}>
                                                        Click to Upload
                                                    </Button>
                                                    <p style={{ color: 'blue' }}>{fileName}</p>
                                                </Form.Item>
                                                <Form.Item
                                                    style={{ marginRight: '10px' }}
                                                    label="Credit Expiry"
                                                    name="creditexpiry"
                                                    className="credit-expiry-date"
                                                    rules={[
                                                        {
                                                            required: true,
                                                            message: 'Please select credit expiry date',
                                                        },
                                                    ]}>
                                                    <DatePicker
                                                        disabledDate={disabledDate}
                                                        format="DD-MM-YYYY"
                                                        style={{
                                                            width: '190px',
                                                            marginLeft: '62px',
                                                        }}
                                                    />
                                                </Form.Item>
                                            </div>
                                            <div className="request-details-section">
                                                <Form.Item
                                                    label="Reason for Extension"
                                                    name="remarks"
                                                    rules={[
                                                        {
                                                            required: true,
                                                            message: 'Please enter your remarks',
                                                        },
                                                        {
                                                            min: 10,
                                                            message: 'Remarks must be at least 10 characters',
                                                        },
                                                        {
                                                            max: 3000,
                                                            message: 'Remarks must not exceed 3000 characters',
                                                        },
                                                    ]}>
                                                    <Input.TextArea
                                                        className="requesting-form-textarea"
                                                        onKeyPress={(e) => {
                                                            if (e.target.value.length === 0 && e.key === ' ') {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                        placeholder="Please enter your remarks (10-3000 characters)"
                                                        minLength={10}
                                                    />
                                                </Form.Item>
                                            </div>

                                            <h2>APPROVER DETAILS</h2>
                                            <div className="approver-details-div">
                                                <Form.Item
                                                    label="First Approver"
                                                    name="l1approver"
                                                    rules={[
                                                        {
                                                            required: true,
                                                            message: 'Please select the first Approver',
                                                        },
                                                    ]}>
                                                    {approvers.length > 0 ? (
                                                        <Select
                                                            style={{ width: '200px' }}
                                                            placeholder="Please Select Approver"
                                                            allowClear
                                                            showSearch
                                                            onChange={handleSelectChange}
                                                            value={selectedApprover}>
                                                            {approvers.map((approver) => (
                                                                <Option key={approver?.user_id} value={approver?.email}>
                                                                    {approver?.first_name} {approver?.last_name}
                                                                </Option>
                                                            ))}
                                                        </Select>
                                                    ) : (
                                                        <p>{NO_DATA_SYMBOL}</p>
                                                    )}
                                                </Form.Item>
                                                <Form.Item label="Second Approver " name="l2approver">
                                                    <p>{secondApprover ? secondApprover : NO_DATA_SYMBOL}</p>
                                                </Form.Item>
                                                <Form.Item label="Third Approver " name="L2ApproverSales">
                                                    <p>{thirdApprover ? thirdApprover : NO_DATA_SYMBOL}</p>
                                                </Form.Item>
                                            </div>

                                            <div className="order-btns">
                                                <button className="form-reset-btn" onClick={onReset} disabled={isResetEnable}>
                                                    Reset
                                                </button>
                                                {hasEditPermission(pages.CREDIT_LIMIT, features.SUBMIT_REQUEST) && (
                                                    <button className="form-submit-btn" type="submit" disabled={isSubmitEnable}>
                                                        Submit
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </>
                        )}
                    </div>
                </Form>

                <Modal title="Upload File" visible={isUploadModalOpen} onCancel={closeModal} onOk={uploadData} className="excel-upload-modal">
                    <div className="Upload-div forecast-upload-modal">
                        <label htmlFor="fileInput">
                            <img width="120px" className="forecast-upload-icon" src="/assets/images/cloud-upload.svg" alt="" />
                        </label>
                        <input id="fileInput" type="file" accept=".msg" onChange={uploadPaymentFile} />
                        <p style={{ color: 'blue' }}>{fileName}</p>
                    </div>
                    <br />
                    <Alert
                        message={
                            <span style={{ paddingLeft: '30px' }}>
                                <b>Informational Notes</b>
                            </span>
                        }
                        description={
                            <ul style={{ paddingLeft: '20px' }}>
                                <li>
                                    <b className="mandatory-mark">*</b>Please upload a valid &quot;.msg&quot; or &quot;.eml&quot; file only.
                                </li>
                            </ul>
                        }
                        type="info"
                        showIcon
                    />
                </Modal>
            </div>
        </>
    );
};

RequestingPage.propTypes = {
    credit_details: PropTypes.shape({
        CREDIT_LIMIT: PropTypes.string,
        RISK_CLASS: PropTypes.string,
        INVOICES_DUE: PropTypes.string,
        DZ_COLLECTION: PropTypes.string,
        AVA_BALANCE: PropTypes.string,
        INVOICES_NOTDUE: PropTypes.string,
        CREDIT_NOTE: PropTypes.string,
        TOTAL: PropTypes.string,
        ZERO_TO_FIVE: PropTypes.string,
        SIX_TO_TEN_DAYS: PropTypes.string,
        ELEVEN_TO_THIRTY: PropTypes.string,
        THIRTYONE_TO_SIXTY: PropTypes.string,
    }),
};

const mapStateToProps = (state) => {
    return {
        credit_details: state.dashboard.get('credit_details'),
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        sendCreditExtensionRequest: (data) => dispatch(Action.sendCreditExtensionRequest(data)),
        getCustomerDetails: () => dispatch(Action.getCustomerDetails()),
        getFinanceApprover: () => dispatch(Action.financeApprover()),
        getCreditLimitDetails: (login_id) => dispatch(Action.getCreditLimitDetails(login_id)),
        // getCreditDetailsFromSap: (login_id) => dispatch(Action.getCreditDetailsFromSap(login_id)),
        fetch_approvers: (data) => dispatch(Action.fetch_approvers(data)),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(RequestingPage);
