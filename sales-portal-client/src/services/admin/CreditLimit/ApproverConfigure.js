import { connect } from 'react-redux';
import React, { useEffect, useState } from 'react';
import { hasEditPermission, pages, features } from '../../../persona/distributorNav';
import { Select, notification, Modal, Form, Input, Radio, Space } from 'antd';
import '../Questionnaire/survey.css';
import './CreditLimit.css';
import * as Action from '../actions/adminAction';
import { NO_DATA_SYMBOL } from '../../../constants';
import GTConfiguration from './GTConfiguration';
import { Tooltip } from 'antd'; 
const { Option } = Select;

const ApproverConfig = (props) => {
    const { getSalesApprover, getApproverDetails, updateApproverDetails, getRiskCategory, add_approver_config, get_category_list, fetch_unmapped_group, channel } = props;
    const [isEditing, setIsEditing] = useState(false);
    const [approvers, setApprovers] = useState([]);
    const [draftData, setDraftData] = useState([]);
    const [approverData, setApproverData] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [editedData, setEditedData] = useState({});
    const [riskCategory] = useState(['Low Credit Risk-B', 'Medium Credit Risk-C', 'High Credit Risk-D']);
    const [category, setCategory] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [addForm] = Form.useForm();
    const [headerData, setHeaderData] = useState({
        approver2: '',
        approver3: '',
        subCategories: [],
    });
    const [customerGroups, setCustomerGroups] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [headerName, setHeaderName] = useState('');

    useEffect(() => {
        const fetchApprovers = async () => {
            try {
                const response = await getSalesApprover();
                setApprovers(response?.data?.rows);
            } catch (error) {
                console.error('Error fetching approvers:', error);
            }
        };
        fetchApprovers();
    }, []);

    useEffect(() => {
        fetchApprovers();
        fetchUnMappedCG();
        fetchRiskCategory();
        fetchCategoryList();
    }, []);

    const fetchApprovers = async () => {
        try {
            const response = await getApproverDetails();

            // Transform the data to match the table structure
            const transformedData = response?.data?.map((item) => {
                const transformedItem = {
                    category: item.category,
                    finance_emails: item.approver_2.email,
                };

                // Map each sub-category email to a field
                item.approver_3.sub_category.forEach((subCat) => {
                    const emailKey = `${formatEmailKey(subCat.header)}_email`;
                    transformedItem[emailKey] = subCat.email;
                });
                return transformedItem;
            });
            setTableData(transformedData);
            // Set header data from first item
            if (response?.data?.[0]) {
                const headerConfig = {
                    approver2: response.data[0].approver_2.header,
                    approver3: response.data[0].approver_3.header,
                    subCategories: response.data[0].approver_3.sub_category.map((cat) => ({
                        header: cat.header,
                        customer_group: cat.customer_group,
                        key: formatEmailKey(cat.header),
                    })),
                };
                setHeaderData(headerConfig);
            }
        } catch (error) {
            console.error('Error fetching approvers:', error);
        }
    };

    const fetchRiskCategory = async () => {
        try {
            await getRiskCategory().then((res) => {
                setApproverData(res?.data);
            });
        } catch (error) {
            console.error('Error while fetching risk category:', error);
        }
    };
    const fetchCategoryList = async () => {
        try {
            const categoryList = await get_category_list();
            setCategory(categoryList.data || []);
        } catch (error) {
            console.error('Error while fetching risk category:', error);
        }
    };

    const fetchUnMappedCG = async () => {
        try {
            await fetch_unmapped_group().then((res) => {
                setCustomerGroups(res?.data?.unmappedGroups || []);
                setHeaderName(res?.data?.headerNames);
            });
        } catch (error) {
            console.error('Error while UnMapped Customer Groups:', error);
        }
    };

    const handleInputChange = (index, field, value, item) => {
        // Update draft data as before
        const newDraftData = [...draftData];
        newDraftData[index] = {
            ...newDraftData[index],
            [field]: value,
        };
        setDraftData(newDraftData);

        // Track the change
        setEditedData((prev) => ({
            ...prev,
            [item.category]: {
                ...(prev[item.category] || {}),
                [field]: value,
            },
        }));
    };

    const handleSave = async () => {
        try {
            // Convert edited data to API format
            const apiPayload = Object.entries(editedData).map(([category, changes]) => {
                const payload = {
                    category,
                    approver_2: {
                        email: changes.finance_emails,
                        header: headerData.approver2,
                    },
                    approver_3: {
                        header: headerData.approver3,
                        sub_category: [],
                    },
                };
                // Add only changed sub-category emails
                headerData.subCategories.forEach((subCat) => {
                    const emailKey = `${formatEmailKey(subCat.header)}_email`;
                    if (changes[emailKey]) {
                        payload.approver_3.sub_category.push({
                            header: subCat.header,
                            email: changes[emailKey],
                        });
                    }
                });
                return payload;
            });
            if (apiPayload.length === 0) {
                throw new Error('No changes to save');
            }
            const res = await updateApproverDetails({
                queryParams: apiPayload,
            });

            if (res?.data.status) {
                notification.success({
                    message: 'Success',
                    description: res?.message || 'MT Approver details updated successfully',
                    duration: 2,
                    className: 'notification-green',
                });
                // Refresh data after successful update
                fetchApprovers();
            } else {
                notification.error({
                    message: 'Error',
                    description: 'Some Error occurred',
                    duration: 2,
                    className: 'notification-red',
                });
            }
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'An error occurred while saving',
                duration: 2,
                className: 'notification-red',
            });
        } finally {
            setDraftData([]);
            setEditedData({});
            setIsEditing(false);
        }
    };

    const handleCancel = () => {
        setDraftData([]);
        setEditedData({});
        setIsEditing(false);
    };

    const formatEmailKey = (header) => {
        return header
            .toLowerCase()
            .replace(/\+/g, 'plus')
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .trim();
    };

    const handleEdit = () => {
        // Make a deep copy of tableData
        const initializedData = tableData.map((item) => {
            // First copy all existing properties
            const newItem = { ...item };
            // Ensure finance_emails is set
            if (!newItem.finance_emails) {
                newItem.finance_emails = '';
            }
            // Ensure all subcategory emails are set
            headerData.subCategories.forEach((subCat) => {
                const emailKey = `${formatEmailKey(subCat.header)}_email`;
                if (!newItem[emailKey]) {
                    newItem[emailKey] = '';
                }
            });
            return newItem;
        });
        setDraftData(initializedData);
        setIsEditing(true);
    };
    const mapDataToTable = (data) => {
        return data?.map((item) => ({
            credit_risk: item?.credit_risk,
            approvers: [item?.low_credit_risk_b, item?.medium_credit_risk_c, item?.high_credit_risk_d],
        }));
    };

    const getCustomerNameValidationRules = (headerName) => {
        return [
            {
                required: true,
                message: 'Please provide a name!',
            },
            {
                pattern: /^[a-zA-Z0-9-_+\s]+$/,
                message: 'Special characters : hyphens (-) , underscores (_) , plus (+) are only allowed',
            },
            {
                validator: async (_, value) => {
                    if (!value) return Promise.resolve();
                    // Trim whitespace and check if empty
                    if (value.trim().length === 0) {
                        return Promise.reject('Name cannot be only whitespace');
                    }
                    // Must contain at least one letter
                    if (!/[a-zA-Z]/.test(value)) {
                        return Promise.reject('Must contain at least one letter');
                    }
                    // Check if name already exists (case insensitive)
                    const trimmedValue = value.trim().toLowerCase();
                    const exists = headerName.some((name) => name.toLowerCase() === trimmedValue);
                    if (exists) {
                        return Promise.reject('This name already exists. Please choose a different name.');
                    }
                    return Promise.resolve();
                },
            },
        ];
    };

    const showModal = () => {
        setIsModalVisible(true);
    };

    const handleModalCancel = () => {
        addForm.resetFields();
        setIsModalVisible(false);
    };

    const handleModalOk = async () => {
        if (isSubmitting) {
            return; // Prevent multiple submissions
        }
        try {
            setIsSubmitting(true);
            const values = await addForm.validateFields();
            // Validate required fields
            if (!values.sales_codes || !values.sales_emails || !values.customer_group) {
                throw new Error('Please fill all required fields');
            }
            const payload = {
                category: category, // Sending all 5 categories
                sales_codes: values.sales_codes.trim(),
                sales_emails: values.sales_emails,
                customer_group: values.customer_group,
            };
            const response = await add_approver_config({
                queryParams: payload,
            });
            if (response?.data) {
                notification.success({
                    message: 'Success',
                    description: 'MT Configuration added successfully',
                    duration: 2,
                    className: 'notification-green',
                });

                setIsModalVisible(false);
                addForm.resetFields();
                fetchApprovers();
                fetchUnMappedCG();
            } else {
                notification.error({
                    message: 'Error',
                    description: 'Failed to add configuration',
                    duration: 2,
                    className: 'notification-red',
                });
            }
        } catch (error) {
            notification.error({
                message: 'Error',
                description: error.message || 'Some Validation missing for MT Config',
                duration: 2,
                className: 'notification-red',
            });
        } finally {
            setIsSubmitting(false); // End loading
        }
    };

    return (
        <>
            {/* MT CONFIG */}
            {channel === 'mt' ? (
                <div>
                    <>
                        <h2 className="card-row-col mt-ecom-settings" style={{ marginBottom: '0px', marginTop: '20px' }}>
                            MT APPROVER CONFIGURATION
                        </h2>
                        {hasEditPermission(pages.CREDIT_LIMIT, features.EDIT_APPROVER_CONFIG) && (
                            <div className="button-container" style={{ marginTop: '-40px' }}>
                                {!isEditing && (
                                    <>
                                        <button className="cl-edit-button" onClick={handleEdit}>
                                            Edit
                                        </button>
                                        <button className="cl-add-button" onClick={showModal}>
                                            Add
                                        </button>
                                    </>
                                )}
                                {isEditing && (
                                    <>
                                        <button className="cl-cancel-button" onClick={handleCancel}>
                                            Cancel
                                        </button>
                                        <button className="cl-save-button" onClick={handleSave}>
                                            Save
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </>

                    <div className="admin-dashboard-table CL-Approver-TableHeader">
                        <table>
                            <thead>
                                <tr>
                                    <th className="sub-head"></th>
                                    <th className="sub-head" colSpan="1">
                                        {headerData.approver2}
                                    </th>
                                    <th className="sub-head" colSpan={headerData.subCategories.length}>
                                        {headerData.approver3}
                                    </th>
                                </tr>
                                <tr>
                                    <th></th>
                                    <th className="sub-head"></th>
                                    {headerData.subCategories.map((category, idx) => (
                                        <th key={idx} className="sub-head">
                                            <Tooltip 
                                                title={Array.isArray(category.customer_group) ? 
                                                    category.customer_group.join(', ') : 
                                                    category.customer_group
                                                }
                                                placement="bottom"
                                            >
                                                {category.header}
                                            </Tooltip>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {(isEditing ? draftData : tableData)?.map((item, index) => (
                                    <tr key={index}>
                                        <td className="sub-head">{item.category}</td>
                                        <td className="sub-head">
                                            {isEditing ? (
                                                <Select
                                                    style={{ width: '200px' }}
                                                    showSearch
                                                    value={item.finance_emails}
                                                    placeholder="Select email"
                                                    optionFilterProp="children"
                                                    filterOption={(input, option) => option?.children?.toLowerCase().includes(input.toLowerCase())}
                                                    onChange={(value) => handleInputChange(index, 'finance_emails', value, item)}>
                                                    {approvers?.map((approver) => (
                                                        <Option key={approver.email} value={approver.email}>
                                                            {approver.email}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            ) : (
                                                item.finance_emails || NO_DATA_SYMBOL
                                            )}
                                        </td>
                                        {headerData.subCategories?.map((category, idx) => {
                                            const emailKey = `${formatEmailKey(category.header)}_email`;
                                            return (
                                                <td key={idx} className="sub-head">
                                                    {isEditing ? (
                                                        <Select
                                                            style={{ width: '200px' }}
                                                            showSearch
                                                            value={item[emailKey]}
                                                            placeholder="Select email"
                                                            optionFilterProp="children"
                                                            filterOption={(input, option) => option?.children?.toLowerCase().includes(input.toLowerCase())}
                                                            onChange={(value) => handleInputChange(index, emailKey, value, item)}>
                                                            {approvers?.map((approver) => (
                                                                <Option key={approver.email} value={approver.email}>
                                                                    {approver.email}
                                                                </Option>
                                                            ))}
                                                        </Select>
                                                    ) : (
                                                        item[emailKey] || NO_DATA_SYMBOL
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="admin-dashboard-table ">
                        <br />

                        <table>
                            <thead>
                                <tr>
                                    <th className="sub-head">Credit Risk</th>
                                    {riskCategory.map((category, index) => (
                                        <th className="sub-head" key={index}>
                                            {category}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {mapDataToTable(approverData)?.map((row, index) => (
                                    <tr key={index}>
                                        <td className="sub-head">{row.credit_risk}</td>
                                        {row.approvers.map((approver, idx) => (
                                            <td className="sub-head" key={idx}>
                                                {approver}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Modal
                        title="Add New Approver"
                        visible={isModalVisible}
                        onOk={handleModalOk}
                        onCancel={handleModalCancel}
                        afterClose={() => {
                            addForm.resetFields();
                            setIsSubmitting(false);
                        }}
                        width={800}
                        confirmLoading={isSubmitting}
                        okButtonProps={{ disabled: isSubmitting }}>
                        <Form form={addForm} layout="vertical">
                            <Form.Item name="category" label="Category">
                                <Radio.Group>
                                    <Space wrap size={[4, 22]} className="approver-category-space">
                                        {category.map((cat) => (
                                            <Radio.Button
                                                key={cat}
                                                value={cat}
                                                style={{
                                                    marginRight: '4px',
                                                    marginBottom: '4px',
                                                    borderRadius: '10px',
                                                    padding: '2px 6px',
                                                }}
                                                className="approver-category-radio-button">
                                                {cat === 'Approver Category 5 (Default Approver Category)' ? 'Approver Category 5' : cat}
                                            </Radio.Button>
                                        ))}
                                    </Space>
                                </Radio.Group>
                            </Form.Item>
                            <Form.Item name="sales_codes" label="Customer Name" rules={getCustomerNameValidationRules(headerName)}>
                                <Input placeholder="Enter customer name. This will be shown as Header" maxLength={50} />
                            </Form.Item>
                            <Form.Item name="customer_group" label="Customer Group" rules={[{ required: true, message: 'Please select customer group!' }]}>
                                <Select mode="multiple" placeholder="Select Customer Groups">
                                    {customerGroups.map((group) => (
                                        <Option key={group} value={group}>
                                            {group}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item name="sales_emails" label="Sales UP4 (3rd Approver)" rules={[{ required: true, message: 'Please select sales email!' }]}>
                                <Select placeholder="Select Email as 3rd Approver" showSearch>
                                    {approvers.map((approver) => (
                                        <Option key={approver.email} value={approver.email}>
                                            {approver.email}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <div style={{ backgroundColor: '#f0f2f5', padding: '12px', borderRadius: '4px', marginTop: '16px', borderLeft: '4px solid #1890ff' }}>
                                <span style={{ fontWeight: 500 }}>
                                    Note:
                                    <br />
                                    1. Finance UP3 (2nd Approver) will stay the same as per the current configuration.
                                    <br />
                                    2. All Approver categories will be added to the selected customer group.
                                </span>
                            </div>
                        </Form>
                    </Modal>
                </div>
            ) : (
                <div>
                    {/* GT Config */}
                    <GTConfiguration></GTConfiguration>
                </div>
            )}
        </>
    );
};

const mapStateToProps = () => {
    return {};
};
const mapDispatchToProps = (dispatch) => {
    return {
        getSalesApprover: () => dispatch(Action.salesApprover()),
        getApproverDetails: () => dispatch(Action.getApproverDetails()),
        updateApproverDetails: (data) => dispatch(Action.updateApproverDetails(data)),
        getRiskCategory: () => dispatch(Action.getRiskCategory()),
        add_approver_config: (data) => dispatch(Action.add_approver_config(data)),
        get_category_list: () => dispatch(Action.get_category_list()),
        fetch_unmapped_group: () => dispatch(Action.fetch_unmapped_group()),
        add_GT_approvers: (data) => dispatch(Action.add_GT_approvers(data)),
        get_cluster: () => dispatch(Action.get_cluster()),
        get_GT_approvers: () => dispatch(Action.get_GT_approvers()),
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(ApproverConfig);
