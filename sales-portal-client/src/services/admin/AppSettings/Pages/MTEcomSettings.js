import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import Panigantion from '../../../../components/Panigantion';
import { Select, notification, Tooltip, Input } from 'antd';
import * as Action from '../../actions/adminAction';
import '../AppSettings1.css';
import AddMTEcomModal from '../../addMTEComModal/addMTEcomModal';
import ToleranceModal from '../../mtEcomToleranceModal/ToleranceModal';
import { EditTwoTone, CloseCircleTwoTone, CheckCircleTwoTone } from '@ant-design/icons';
import Util from '../../../../util/helper/index';
import { MT_ECOM_CUSTOMER_WORKFLOW } from '../../../../config/constant';
import { pages, features, hasEditPermission } from '../../../../persona/distributorHeader';

function MTEcomSettings(props) {
    const [isEditable, setIsEditable] = useState(false);
    const [isDisable, setIsDisable] = useState(true);
    const [settingData, setSettingData] = useState([]);
    const [settingUpdatedData, setSettingUpdatedData] = useState([]);
    const [customerData, setCustomerData] = useState([]);
    const [previousData, setPreviousData] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [count, setCount] = useState(0);
    const [pageNo, setPageNo] = useState(1);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [appSettingList, setAppSettingList] = useState([]);
    const [customerWorkflowData, setCustomerWorkflowData] = useState([]);
    const [itemsPerPageWorkflow, setItemsPerPageWorkflow] = useState(10);
    const [countWorkflow, setCountWorkflow] = useState(0);
    const [pageNoWorkflow, setPageNoWorkflow] = useState(1);
    const [offsetWorkflow, setOffsetWorkflow] = useState(0);
    const [limitWorkflow, setLimitWorkflow] = useState(10);
    const [previousDataWorkflow, setPreviousDataWorkflow] = useState({});
    const [itemsPerPageTolerance, setItemsPerPageTolerance] = useState(10);
    const [toleranceCount, setToleranceCount] = useState(0);
    const [tolerancePageNo, setTolerancePageNo] = useState(1);
    const [toleranceOffset, setToleranceOffset] = useState(0);
    const [toleranceLimit, setToleranceLimit] = useState(10);
    const [poType, setPoType] = useState([]);
    const [workflowModal, setWorkflowModal] = useState(false);
    const [customers, setcustomers] = useState([]);
    const [toleranceData, setToleranceData] = useState([]);
    const [previousToleranceData, setPreviousToleranceData] = useState({});
    const [toleranceModalOpen, setToleranceModalOpen] = useState(false);
    const [toleranceEditMode, setToleranceEditMode] = useState(false);
    const [toleranceEditRow, setToleranceEditRow] = useState(null);
    const { getAppSettingList, updateAppSetting, customerList, addUpdateCustomer, customerWorkflowList, addUpdateCustomerWorkflow, mtEcomTOTTolerance } = props;
    //to call customer data
    useEffect(async () => {
        let app_setting_list = await getAppSettingList();
        setAppSettingList(app_setting_list);
        let payload = {
            limit: limit,
            offset: offset,
            search: '',
        };
        const customerData = await customerList(payload);
        setCustomerData(customerData?.body?.customerList);
        setCount(customerData?.body?.count);
    }, [offset, limit]);
    useEffect(async () => {
        const customerWorkflowData = await customerWorkflowList(limitWorkflow, offsetWorkflow);
        setCustomerWorkflowData(customerWorkflowData?.body?.customerWorkflowList);
        setPoType(customerWorkflowData?.body?.poType);
        setcustomers(customerWorkflowData?.body?.customer);
        setCountWorkflow(customerWorkflowData?.body?.count);
    }, [offsetWorkflow, limitWorkflow]);

    const appSettingsKeyArr = [
        'ENABLE_MT_ECOM_RDD',
        'ENABLE_RDD_START_TIME',
        'ENABLE_RDD_END_TIME',
        'ENABLE_MT_ECOM_SO_SYNC',
        'MT_ECOM_DEFAULT_RDD_DATE',
        'MT_ECOM_DEFAULT_SYNC_DATE',
        'MT_ECOM_DEFAULT_PO_EXPIRY_DATE',
        'MT_ECOM_DEFAULT_RDD_SYNC_FROM_DATE',
        'MT_ECOM_DEFAULT_RDD_SYNC_TO_DATE',
    ];
    const { Option } = Select;

    // For Pagination
    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };
    const onChangePageWorkflow = (page, itemsPerPage) => {
        setLimitWorkflow(itemsPerPage);
        setOffsetWorkflow((page - 1) * limit);
        setPageNoWorkflow(page);
        };

    const onChangePageTolerance = (page, itemsPerPage) => {
        setToleranceLimit(itemsPerPage);
        setToleranceOffset((page - 1) * limit);
        setTolerancePageNo(page);
        setItemsPerPageTolerance(itemsPerPage);
    };
    // For Field level edit
    const fieldOnChange = (e, index, type) => {
        if (type == 'customer_type') {
            customerData[index][type] = e;
            setCustomerData([...customerData]);
        } else if (type == 'po_type') {
            customerWorkflowData[index][type] = e;
            setCustomerWorkflowData([...customerWorkflowData]);
        } else {
            customerData[index][type] = e.target.value;
            setCustomerData([...customerData]);
        }
    };
    // For Field level edit workflow
    const changeRemarksHandler = (event, feature) => {
        setIsDisable(false);
        settingData.map((data) => {
            if (data.key === feature) {
                data.remarks = event.target.value;
            }
        });
        setSettingData([...settingData]);
        let remarkState = settingUpdatedData;
        settingUpdatedData.map((item, index) => {
            if (item.key === feature) {
                remarkState[index].remarks = event.target.value;
            }
        });
        setSettingUpdatedData(remarkState);
    };

    const changeTextSettingHandler = (event, feature) => {
        const value = event?.target?.value ? event?.target?.value : '';
        setIsDisable(false);
        settingData.map((data) => {
            if (data.key === feature) {
                data.value = value;
                data.disabled = false;
            }
        });
        setSettingData([...settingData]);
        let exists = false;
        settingUpdatedData.map((data) => {
            if (data.key === feature) {
                data.value = value;
                exists = true;
            }
        });
        if (exists) setSettingUpdatedData([...settingUpdatedData]);
        else setSettingUpdatedData([...settingUpdatedData, { key: feature, value: value }]);
    };
    const editOrCancelSettingHandler = () => {
        if (isEditable) {
            let settingList = [];
            for (let data of appSettingList.data) {
                if (appSettingsKeyArr.includes(data.key)) {
                    settingList.push({ ...data, disabled: true });
                }
            }
            setSettingData(settingList);
            setSettingUpdatedData([]);
        }
        setIsEditable(!isEditable);
        setIsDisable(true);
    };

    // For Enabling the edit button
    const enableEdit = (index, booleanFlag) => {
        setPreviousData({
            customer_name: customerData[index].customer_name,
            customer_code: customerData[index].customer_code,
            customer_type: customerData[index].customer_type,
        });
        customerData[index].is_disabled = booleanFlag;
        setCustomerData([...customerData]);
    };
    // For Enabling the workflow edit button
    const enableEditWorkflow = (index, booleanFlag) => {
        const previousData = JSON.parse(JSON.stringify(customerWorkflowData[index]));
        setPreviousDataWorkflow(previousData);
        const updatedData = [...customerWorkflowData];
        updatedData[index].is_disabled = booleanFlag;
        setCustomerWorkflowData(updatedData);
    };
    // For closing the edit
    const closeEdit = (index, booleanFlag) => {
        customerData[index].is_disabled = booleanFlag;
        customerData[index].customer_name = previousData.customer_name;
        customerData[index].customer_code = previousData.customer_code;
        customerData[index].customer_type = previousData.customer_type;
        setCustomerData([...customerData]);
    };
    // For closing the edit workflow
    const closeEditWorkflow = (index, booleanFlag) => {
        const updatedData = [...customerWorkflowData];
        updatedData[index] = { ...JSON.parse(JSON.stringify(previousDataWorkflow)), is_disabled: booleanFlag };
        setCustomerWorkflowData(updatedData);
    };
    // For saving the field data
    const onFieldLevelSave = async (index) => {
        customerData[index].is_disabled = true;
        setCustomerData([...customerData]);
        const response = await addUpdateCustomer(customerData[index]);
        if (response.body.message) {
            Util.notificationSender('Success', response.body.message, true);
        } else {
            customerData[index].customer_name = previousData.customer_name;
            customerData[index].customer_code = previousData.customer_code;
            customerData[index].customer_type = previousData.customer_type;
            setCustomerData([...customerData]);
            Util.notificationSender('Error', 'Error while updating customer', false);
        }
    };
    const showModal = (flag) => {
        if (flag) {
            setWorkflowModal(true);
            setIsModalOpen(true);
        } else {
            setWorkflowModal(false);
            setIsModalOpen(true);
        }
    };
    // Add New customer
    const createRequest = async (data) => {
        const response = await addUpdateCustomer(data);
        if (response.body.message) {
            Util.notificationSender('Success', response.body.message, true);
            setIsModalOpen(false);
            const customerData = await customerList(limit, offset);
            setCustomerData(customerData?.body?.customerList);
            setCount(customerData?.body?.count);
        } else {
            Util.notificationSender('Error', 'Error while Adding Customer', false);
        }
    };
    const createRequestWorkflow = async (data) => {
        const response = await addUpdateCustomerWorkflow(data);
        if (response.body.message) {
            Util.notificationSender('Success', response.body.message, true);
            setIsModalOpen(false);
            const customerWorkflowData = await customerWorkflowList(limit, offset);
            setCustomerWorkflowData(customerWorkflowData?.body?.customerWorkflowList);
            setCountWorkflow(customerWorkflowData?.body?.count);
        } else {
            Util.notificationSender('Error', 'Error while Adding Customer', false);
        }
    };
    const onCheckboxChange = (value, index, type) => {
        const updatedData = [...customerWorkflowData];
        updatedData[index][type] = !value;
        updatedData[index].is_disabled = false;
        setCustomerWorkflowData(updatedData);
    };
    const saveCustomerWorkflow = async (index) => {
        try {
            const updatedData = [...customerWorkflowData];
            updatedData[index].is_disabled = true;
            setCustomerWorkflowData(updatedData);

            const response = await addUpdateCustomerWorkflow(updatedData[index]);
            if (response.body.message) {
                Util.notificationSender('Success', response.body.message, true);
            } else {
                updatedData[index] = { ...JSON.parse(JSON.stringify(previousDataWorkflow)) };
                setCustomerWorkflowData(updatedData);
                Util.notificationSender('Error', 'Error while updating customer workflow', false);
            }
        } catch {
            const updatedData = [...customerWorkflowData];
            updatedData[index] = { ...JSON.parse(JSON.stringify(previousDataWorkflow)) };
            setCustomerWorkflowData(updatedData);
            Util.notificationSender('Error', 'Error while updating customer', false);
        }
    };
    const changeSelectSettingHandler = (value, feature) => {
        setIsDisable(false);
        settingData.map((data) => {
            if (data.key === feature) {
                data.value = value;
                data.disabled = false;
            }
        });
        setSettingData([...settingData]);
        let exists = false;
        settingUpdatedData.forEach((data) => {
            if (data.key === feature) {
                data.value = value;
                exists = true;
            }
        });
        if (exists) setSettingUpdatedData([...settingUpdatedData]);
        else setSettingUpdatedData([...settingUpdatedData, { key: feature, value }]);
    };
    useEffect(() => {
        if (appSettingList?.data) {
            let settingList = [];
            for (let data of appSettingList.data) {
                if (appSettingsKeyArr.includes(data.key)) {
                    settingList.push({ ...data, disabled: true });
                }
            }
            setSettingData(settingList);
        }
    }, [appSettingList]);

    const saveSettingHandler = async () => {
        for (let datum of settingUpdatedData) {
            if (!datum.remarks) {
                return notification.error({
                    message: 'Error',
                    description: `Please enter remarks for feature ${datum.key}`,
                    duration: 5,
                    className: 'notification-error',
                });
            } else if (datum.remarks.trim().length < 10) {
                return notification.error({
                    message: 'Error',
                    description: `Please enter minimum 10 characters in remarks to update the feature ${datum.key}`,
                    duration: 5,
                    className: 'notification-error',
                });
            }
        }

        try {
            const res = await updateAppSetting({
                app_level_configuration: settingUpdatedData,
            });
            if (res?.data?.success) {
                getAppSettingList();
                setSettingUpdatedData([]);
                notification.success({
                    message: 'Success',
                    description: 'App settings updated successfully',
                    duration: 2,
                    className: 'notification-green',
                });
                setIsDisable(true);
                setIsEditable(false);
            } else {
                notification.error({
                    message: 'Error Occurred',
                    description: res?.data?.message ? res.data.message : 'Some error occurred while updating app settings',
                    duration: 5,
                    className: 'notification-error',
                });
            }
        } catch {
            notification.error({
                message: 'Technical Error',
                description: 'Some error occurred while updating app settings',
                duration: 5,
                className: 'notification-error',
            });
        }
    };

    // Tolerance state and modal logic
    const fetchToleranceCustomers = async () => {
        const res = await mtEcomTOTTolerance({ tot_tolerance: 0, customer: '', type: '' });
        return res?.customer || [];
    };

    const openAddTolerance = () => {
        setToleranceEditMode(false);
        setToleranceEditRow(null);
        setToleranceModalOpen(true);
    };

    const handleToleranceModalCancel = () => {
        setToleranceModalOpen(false);
    };    

    const handleToleranceModalSave = async (payload) => {
        const res = await mtEcomTOTTolerance(payload);
        if (res?.message === "Add ToT Tolerance Success" || res?.message === "Update ToT Tolerance Success") {
            notification.success({ message: 'Tolerance saved successfully.' });
            setToleranceModalOpen(false);
            // Refresh tolerance list
            const listRes = await mtEcomTOTTolerance({ tot_tolerance: 0, customer: '', type: '' });
            const toleranceList = (listRes?.tolerance_data || []).map(item => ({
                ...item,
                is_disabled: true  
            }));
            setToleranceData(toleranceList);
        } else {
            notification.error({ message: 'Error saving tolerance.' });
        }
    };
    useEffect(() => {
        const fetchToleranceList = async () => {
            const payload = {
                tot_tolerance: 0,
                customer: '',
                type: '',
                limit: toleranceLimit,
                offset: toleranceOffset
            };
            const res = await mtEcomTOTTolerance(payload);
            const toleranceList = (res?.tolerance_data || []).map(item => ({
                ...item,
                is_disabled: true
            }));
            setToleranceData(toleranceList);
            setToleranceCount(res?.count || 0);
        };
        fetchToleranceList();
    }, [toleranceOffset, toleranceLimit, mtEcomTOTTolerance]);

    return (
        <>
            <div className="admin-dashboard-wrapper-1">
                <div className="admin-dashboard-block">
                    <h2 className="card-row-col">MT-ECOM Settings</h2>
                    <div className="admin-dashboard-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>Value</th>
                                    <th>Last updated by</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {settingData?.map((data) => {
                                    return (
                                        <tr key={data.key}>
                                            <td className="app-desc">
                                                {data.key}
                                                <span>{data.description ? data.description : ''}</span>
                                            </td>
                                            <td>
                                                <div className="value-col">
                                                    {isEditable ? (
                                                        <>
                                                            {data.field_type === 'SET' ? (
                                                                <Select
                                                                    className="user-role-select"
                                                                    value={data.value}
                                                                    onChange={(val) => changeSelectSettingHandler(val, data.key)}
                                                                    dropdownClassName="user-role-dropdown">
                                                                    {data.allowed_values.map((value, index) => {
                                                                        return (
                                                                            <Option key={index} value={value}>
                                                                                {value}
                                                                            </Option>
                                                                        );
                                                                    })}
                                                                </Select>
                                                            ) : (
                                                                <input
                                                                    className={data.field_type === 'TEXT' ? 'value-text-fld' : 'time-input-fld'}
                                                                    type={data.field_type === 'TEXT' ? 'text' : 'time'}
                                                                    value={data.value}
                                                                    onChange={(event) => changeTextSettingHandler(event, data.key)}
                                                                />
                                                            )}
                                                        </>
                                                    ) : (
                                                        <Tooltip placement="left" title={data.value}>
                                                            {data.value}
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {data.first_name && data.last_name && data.user_id ? `${data.first_name} ${data.last_name} (${data.user_id})` : data.updated_by}
                                            </td>
                                            <td className="remarks-value">
                                                {!isEditable ? (
                                                    <>
                                                        {!data.remarks || data.remarks.trim().length === 0 ? (
                                                            '-'
                                                        ) : (
                                                            <Tooltip placement="left" title={data.remarks}>
                                                                {data.remarks}
                                                            </Tooltip>
                                                        )}{' '}
                                                    </>
                                                ) : (
                                                    <textarea
                                                        placeholder="Please enter your remarks (minimum 10 characters)"
                                                        onChange={(e) => changeRemarksHandler(e, data.key)}
                                                        disabled={data.disabled}
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {hasEditPermission(pages.APP_SETTINGS, features.EDIT_APP_SETTINGS) && (
                        <div className="btn-wrapper">
                            <button type="button" onClick={editOrCancelSettingHandler}>
                                {isEditable ? 'Cancel' : 'Edit'}
                            </button>
                            <button type="button" onClick={saveSettingHandler} disabled={isDisable}>
                                Save
                            </button>
                        </div>
                    )}
                    <br />
                    <h2 className="card-row-col mt-ecom-settings">MT-ECOM Customer Details</h2>
                    <div className="admin-dashboard-table Mdm-TableHeader">
                        <div style={{ justifyContent: 'flex-end', display: 'flex' }}>
                            <button
                                onClick={() => showModal(false)}
                                type="submit"
                                className="add-btn customer-btn"
                                disabled={!hasEditPermission(pages.APP_SETTINGS, features.EDIT_APP_SETTINGS)}>
                                Add Customer
                                <img src="/assets/images/plus-icon.svg" alt="" style={{ paddingLeft: '5px' }} />
                            </button>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th className="width25">Customer Name</th>
                                    <th className="width25">Customer Code</th>
                                    <th className="width25">Customer Type</th>
                                    <th className="width25">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerData?.map((data, index) => {
                                    return (
                                        <tr key={data.key}>
                                            {!data?.is_disabled ? (
                                                <td className="width25">
                                                    <input
                                                        type="text"
                                                        className="width25 mt-ecom-input"
                                                        disabled={data?.is_disabled}
                                                        value={data?.customer_name}
                                                        onChange={(e) => fieldOnChange(e, index, 'customer_name')}
                                                    />
                                                </td>
                                            ) : (
                                                <td className="width25">{data?.customer_name}</td>
                                            )}
                                            {!data?.is_disabled ? (
                                                <td className="width25">
                                                    <input
                                                        type="text"
                                                        className="width25 mt-ecom-input"
                                                        disabled={data?.is_disabled}
                                                        value={data?.customer_code}
                                                        onChange={(e) => fieldOnChange(e, index, 'customer_code')}
                                                    />
                                                </td>
                                            ) : (
                                                <td className="width25">{data?.customer_code}</td>
                                            )}
                                            {!data?.is_disabled ? (
                                                <td className="width25">
                                                    <Select
                                                        onChange={(e) => {
                                                            fieldOnChange(e, index, 'customer_type');
                                                        }}
                                                        placeholder="Select"
                                                        name="reason"
                                                        value={data?.customer_type}
                                                        className="width25 mt-ecom-select">
                                                        <Option value="Single GRN">Single GRN</Option>
                                                        <Option value="Multi GRN">Multi GRN</Option>
                                                    </Select>
                                                </td>
                                            ) : (
                                                <td className="width25">{data?.customer_type}</td>
                                            )}
                                            <td className="width25">
                                                <div>
                                                    {data.is_disabled ? (
                                                        hasEditPermission(pages.APP_SETTINGS, features.EDIT_APP_SETTINGS) ? (
                                                            <EditTwoTone onClick={() => enableEdit(index, false)} />
                                                        ) : (
                                                            <EditTwoTone style={{ cursor: 'not-allowed' }} />
                                                        )
                                                    ) : (
                                                        <div>
                                                            <Tooltip placement="bottom" title="Save">
                                                                <CheckCircleTwoTone style={{ padding: '5px' }} onClick={() => onFieldLevelSave(index)} />
                                                            </Tooltip>
                                                            <Tooltip placement="bottom" title="Cancel">
                                                                <CloseCircleTwoTone style={{ padding: '5px' }} onClick={() => closeEdit(index, true)} />
                                                            </Tooltip>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {!(customerData?.length > 0) && (
                            <div className="NoDataDiv">
                                <b> No data available.</b>
                            </div>
                        )}
                    </div>
                    {customerData?.length > 0 && (
                        <Panigantion
                            data={customerData ? customerData : []}
                            itemsPerPage={itemsPerPage}
                            setItemsPerPage={setItemsPerPage}
                            itemsCount={count}
                            setModifiedData={onChangePage}
                            pageNo={pageNo}
                        />
                    )}
                    <br />
                    <h2 className="card-row-col mt-ecom-settings">MT-ECOM Customer Workflow Configuration</h2>
                    <div className="admin-dashboard-table Mdm-TableHeader">
                        <div style={{ justifyContent: 'flex-end', display: 'flex' }}>
                            <button
                                onClick={() => showModal(true)}
                                type="submit"
                                className="add-btn customer-workflow-btn"
                                disabled={!hasEditPermission(pages.APP_SETTINGS, features.EDIT_APP_SETTINGS)}>
                                Add Customer Workflow
                                <img src="/assets/images/plus-icon.svg" alt="" style={{ paddingLeft: '5px' }} />
                            </button>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Customer Name</th>
                                    {MT_ECOM_CUSTOMER_WORKFLOW.map((e, index) => {
                                        return <th key={index}>{e.label}</th>;
                                    })}
                                    <th>PO Type</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerWorkflowData?.map((data, index) => {
                                    return (
                                        <tr key={data.key}>
                                            <td>{data?.customer}</td>
                                            {MT_ECOM_CUSTOMER_WORKFLOW.map((e, idx) => {
                                                return (
                                                    <td key={idx}>
                                                        <input
                                                            type="checkbox"
                                                            checked={data[e.value]}
                                                            disabled={!hasEditPermission(pages.APP_SETTINGS, features.EDIT_APP_SETTINGS)}
                                                            onChange={() => onCheckboxChange(data[e.value], index, e.value)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            {!data?.is_disabled ? (
                                                <td>
                                                    <Select
                                                        onChange={(e) => {
                                                            fieldOnChange(e, index, 'po_type');
                                                        }}
                                                        placeholder="Select"
                                                        name="reason"
                                                        value={data?.po_type}
                                                        className="mt-ecom-select"
                                                        options={poType.map((e) => {
                                                            return {
                                                                label: e.enumlabel,
                                                                value: e.enumlabel,
                                                            };
                                                        })}></Select>
                                                </td>
                                            ) : (
                                                <td>{data?.po_type}</td>
                                            )}
                                            <td>
                                                {data.is_disabled ? (
                                                    hasEditPermission(pages.APP_SETTINGS, features.EDIT_APP_SETTINGS) ? (
                                                        <EditTwoTone onClick={() => enableEditWorkflow(index, false)} />
                                                    ) : (
                                                        <EditTwoTone style={{ cursor: 'not-allowed' }} />
                                                    )
                                                ) : (
                                                    <div>
                                                        <Tooltip placement="bottom" title="Save">
                                                            <CheckCircleTwoTone style={{ padding: '5px' }} onClick={() => saveCustomerWorkflow(index)} />
                                                        </Tooltip>
                                                        <Tooltip placement="bottom" title="Cancel">
                                                            <CloseCircleTwoTone style={{ padding: '5px' }} onClick={() => closeEditWorkflow(index, true)} />
                                                        </Tooltip>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {!(customerWorkflowData?.length > 0) && (
                            <div className="NoDataDiv">
                                <b> No data available.</b>
                            </div>
                        )}
                    </div>
                    {customerWorkflowData?.length > 0 && (
                        <Panigantion
                            data={customerWorkflowData ? customerWorkflowData : []}
                            itemsPerPage={itemsPerPageWorkflow}
                            setItemsPerPage={setItemsPerPageWorkflow}
                            itemsCount={countWorkflow}
                            setModifiedData={onChangePageWorkflow}
                            pageNo={pageNoWorkflow}
                        />
                    )}
                    <br />
                    {/* Tolerance Table Section */}
                                                            <h2 className="card-row-col mt-ecom-settings">MT-ECOM Customer Tolerance Configuration</h2>
                                                            <div className="admin-dashboard-table Mdm-TableHeader">
                                                                <div style={{ justifyContent: 'flex-end', display: 'flex' }}>
                                                                    <button
                                                                        onClick={openAddTolerance}
                                                                        type="button"
                                                                        className="add-btn tolerance-btn"
                                                                        disabled={!hasEditPermission(pages.APP_SETTINGS, features.EDIT_APP_SETTINGS)}>
                                                                        Add Tolerance
                                                                        <img src="/assets/images/plus-icon.svg" alt="" style={{ paddingLeft: '5px' }} />
                                                                    </button>
                                                                </div>
                                                                <table>
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Customer Name</th>
                                                                            <th>Tolerance</th>
                                                                            <th>Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>                                
                                                                        {toleranceData.map((row, idx) => (
                                                                            <tr key={row.customer}>
                                                                                <td>{row.customer}</td>
                                                                                <td>
                                                                                    {!row.is_disabled ? (                                                
                                                                                        <Input
                                                                                            type="number"
                                                                                            min={1}
                                                                                            max={100}
                                                                                            step={1}
                                                                                            className="mt-ecom-input"
                                                                                            value={row.tot_tolerance}
                                                                                            onKeyDown={(e) => {
                                                                                                if (
                                                                                                    e.key === 'e' ||
                                                                                                    e.key === 'E' ||
                                                                                                    e.key === '-' ||
                                                                                                    e.key === '.' ||
                                                                                                    e.key === '+'
                                                                                                ) {
                                                                                                    e.preventDefault();
                                                                                                }
                                                                                            }}
                                                                                            onChange={(e) => {
                                                                                                let val = e.target.value;
                                                                                                if (/^\d{0,3}$/.test(val)) {
                                                                                                    let intVal = parseInt(val, 10);
                                                                                                    if (val === '' || (intVal >= 1 && intVal <= 100)) {
                                                                                                        const updatedData = [...toleranceData];
                                                                                                        updatedData[idx].tot_tolerance = val === '' ? '' : intVal;
                                                                                                        setToleranceData(updatedData);
                                                                                                    }
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                    ) : (
                                                                                        row.tot_tolerance
                                                                                    )}
                                                                                </td>
                                                                                <td>
                                                                                    {row.is_disabled ? (
                                                                                        hasEditPermission(pages.APP_SETTINGS, features.EDIT_APP_SETTINGS) ? (                                                    <EditTwoTone onClick={() => {
                                                        // Save current value before editing
                                                        setPreviousToleranceData({
                                                            customer: row.customer,
                                                            tot_tolerance: row.tot_tolerance
                                                        });
                                                        const updatedData = [...toleranceData];
                                                        updatedData[idx].is_disabled = false;
                                                        setToleranceData(updatedData);
                                                    }} />
                                                ) : (
                                                    <EditTwoTone style={{ cursor: 'not-allowed' }} />
                                                )
                                            ) : (
                                                <div>
                                                    <Tooltip placement="bottom" title="Save">
                                                        <CheckCircleTwoTone 
                                                            style={{ padding: '5px' }} 
                                                            onClick={() => {
                                                                handleToleranceModalSave({
                                                                    customer: row.customer,
                                                                    tot_tolerance: Number(row.tot_tolerance),
                                                                    type: 'edit'
                                                                });
                                                                const updatedData = [...toleranceData];
                                                                updatedData[idx].is_disabled = true;
                                                                setToleranceData(updatedData);
                                                            }} 
                                                        />
                                                    </Tooltip>
                                                    <Tooltip placement="bottom" title="Cancel">                                                        <CloseCircleTwoTone 
                                                            style={{ padding: '5px' }} 
                                                            onClick={() => {
                                                                const updatedData = [...toleranceData];
                                                                // Restore previous value and disable editing
                                                                updatedData[idx] = {
                                                                    ...updatedData[idx],
                                                                    tot_tolerance: previousToleranceData.tot_tolerance,
                                                                    is_disabled: true
                                                                };
                                                                setToleranceData(updatedData);
                                                            }} 
                                                        />
                                                    </Tooltip>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!(toleranceData?.length > 0) && (
                            <div className="NoDataDiv">
                                <b> No data available.</b>
                            </div>
                        )}
                    </div>
                    {toleranceData?.length > 0 && (
                        <Panigantion
                            data={toleranceData ? toleranceData : []}
                            itemsPerPage={itemsPerPageTolerance}
                            setItemsPerPage={setItemsPerPageTolerance}
                            itemsCount={toleranceCount}
                            setModifiedData={onChangePageTolerance}
                            pageNo={tolerancePageNo}
                        />
                    )}
                </div>
            </div>
            <AddMTEcomModal
                visible={!!isModalOpen}
                onCancel={setIsModalOpen}
                createRequest={createRequest}
                createRequestWorkflow={createRequestWorkflow}
                flag={workflowModal}
                poType={poType}
                workflowType={MT_ECOM_CUSTOMER_WORKFLOW}
                customers={customers}
            />
            <ToleranceModal
                visible={toleranceModalOpen}
                onCancel={handleToleranceModalCancel}
                onSave={handleToleranceModalSave}
                isEdit={toleranceEditMode}
                initialCustomer={toleranceEditRow?.customer_name}
                initialTolerance={toleranceEditRow?.tot_tolerance}
                fetchCustomers={fetchToleranceCustomers}
            />
        </>
    );
}
const mapStateToProps = (state) => {
    return {
        app_setting_list: state.admin.get('app_setting_list'),
        sso_user_details: state.admin.get('sso_user_details'),
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        getAppSettingList: () => dispatch(Action.getAppSettingList()),
        updateAppSetting: (data) => dispatch(Action.updateAppSetting(data)),
        customerList: (limit, offset) => dispatch(Action.customerList(limit, offset)),
        addUpdateCustomer: (data) => dispatch(Action.addUpdateCustomer(data)),
        customerWorkflowList: (limit, offset) => dispatch(Action.customerWorkflowList(limit, offset)),
        addUpdateCustomerWorkflow: (data) => dispatch(Action.addUpdateCustomerWorkflow(data)),
        mtEcomTOTTolerance: (data) => dispatch(Action.mtEcomTOTTolerance(data)),
    };
};
export default connect(mapStateToProps, mapDispatchToProps)(MTEcomSettings);
