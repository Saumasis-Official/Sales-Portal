import { notification, Modal, Select, Tooltip, Checkbox } from 'antd';
import { connect } from 'react-redux';
import * as Action from '../actions/adminAction';
import React, { useEffect, useState, useRef } from 'react';
import './AddKamsCustomers.css';
import Panigantion from '../../../components/Panigantion';
import { pages, hasViewPermission } from '../../../persona/mdm';
import { SearchOutlined } from '@ant-design/icons';
import HeaderSearchBox from '../../../components/HeaderSearchBox/HeaderSearchBox';
import { debounce } from 'lodash';
import _ from 'lodash';
import { EditTwoTone, CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';
import Loader from '../../../components/Loader';
const { Option } = Select;

function ViewKamsCustomers(props) {
    const { getKamsData, updateCustomerData } = props;
    const [count, setCount] = useState(0);
    const [pageNo, setPageNo] = useState(1);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [customerData, setCustomerData] = useState([]);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [enableSearch, setEnableSearch] = useState({
        kamsName: false,
        customerCode: false,
        email: false,
        payerCode: false,
    });
    const [headerFilter, setHeaderFilter] = useState({
        kamsName: '',
        customerCode: '',
        email: '',
        payerCode: '',
        customerGroup: [],
    });
    const [filterStringify, setFilterStringify] = useState('');
    const [editIndex, setEditIndex] = useState(null);
    const [originalData, setOriginalData] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalAction, setModalAction] = useState(null);
    const [modalIndex, setModalIndex] = useState(null);
    const [customerGroups, setCustomerGroups] = useState([]);
    const [selectedCustomerGroups, setSelectedCustomerGroups] = useState([]);
    const [customerGroupSearch, setCustomerGroupSearch] = useState('');
    const [selectedRows, setSelectedRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const isClearingAllRef = useRef(false);
    const isDropdownOpenRef = useRef(false);

    useEffect(() => {
        const stringify = JSON.stringify(headerFilter);
        if (stringify !== filterStringify) {
            setFilterStringify(stringify);
        }
    }, [filterStringify, headerFilter]);

    useEffect(() => {
        if (loading) {
            setIsModalVisible(false);
        }
    }, [loading]);

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    const responseHandler = (message, description, type) => {
        setTimeout(() => {
            if (type === 'SUCCESS')
                notification.success({
                    message: message,
                    description: description,
                    duration: 3,
                    className: 'notification-green',
                });
            else
                notification.error({
                    message: message,
                    description: description,
                    duration: 7,
                    className: 'notification-error error-scroll',
                });
        }, 50);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (filterStringify === '') return;
            const filterValue = filterStringify ? JSON.parse(filterStringify) : '';
            const payload = {
                limit: limit,
                offset: offset,
                search: filterValue,
            };
            const customerData = await getKamsData(payload);
            setCustomerGroups(Array.isArray(customerData?.body?.customer_groups) ? customerData.body.customer_groups : []);
            setCustomerData(customerData?.body?.kams_data);
            setCount(customerData?.body?.count);
        };
        fetchData();
    }, [offset, limit, filterStringify]);

    const onFilterChange = (e, propsKey) => {
        let value;
        if (e && e.target && e.target.value !== undefined) {
            value = e.target.value;
        } else {
            value = e;
        }
        setPageNo(1);
        const temp = { ...headerFilter, [propsKey]: value };
        debouncedFilter(_.cloneDeep(temp));
    };

    const debouncedFilter = useRef(debounce((nextValue) => setHeaderFilter(nextValue), 400)).current;

    const enableEditWorkflow = (index) => {
        setEditIndex(index);
        setOriginalData({ ...customerData[index] });
    };

    const saveCustomerWorkflow = (index) => {
        setModalAction('save');
        setModalIndex(index);
        setIsModalVisible(true);
    };

    const closeEditWorkflow = (index) => {
        const updatedCustomerData = [...customerData];
        updatedCustomerData[index] = originalData;
        setCustomerData(updatedCustomerData);
        setEditIndex(null);
    };

    const handleCheckboxChange = (e, index) => {
        const updatedCustomerData = [...customerData];
        updatedCustomerData[index].credit_limit = e.target.checked ? 'true' : 'false';
        setCustomerData(updatedCustomerData);
    };

    const handleDelete = (index) => {
        setModalAction('delete');
        setModalIndex(index);
        setIsModalVisible(true);
    };

    const getUniqueKey = (data) => `${data.payer_code}|${data.email}`;

    const handleRowSelection = (uniqueKey) => {
        setSelectedRows((prev) => (prev.includes(uniqueKey) ? prev.filter((key) => key !== uniqueKey) : [...prev, uniqueKey]));
    };

    const handleHeaderCheckboxChange = async (e) => {
        if (e.target.checked) {
            const allCustomerData = await fetchAllData();
            const allKeys = allCustomerData.map((data) => getUniqueKey(data));
            setSelectedRows(allKeys);
        } else {
            setSelectedRows([]);
        }
    };

    const fetchAllData = async () => {
        const filterValue = filterStringify ? JSON.parse(filterStringify) : '';
        const payload = {
            search: filterValue,
        };
        const customerData = await getKamsData(payload);
        return customerData?.body?.kams_data;
    };

    const confirmAction = async () => {
        setLoading(true);
        let payloads;
        if (modalAction === 'save') {
            const index = modalIndex;
            const data = customerData[index];
            const payload = {
                payer_code: data.payer_code,
                credit_limit: data.credit_limit === 'true',
                is_deleted: false,
                updated_by: window.localStorage.getItem('user_id') || '',
                user_id: data.user_id,
            };
            const response = await updateCustomerData(payload);
            if (response?.message) {
                responseHandler('Customer Data Updated', response.message, 'SUCCESS');
                setEditIndex(null);
                const customerData = await getKamsData({
                    limit,
                    offset,
                    search: JSON.parse(filterStringify),
                });
                setCustomerData(customerData?.body?.kams_data);
                setCount(customerData?.body?.count);
            } else {
                responseHandler('Failed to update Customer Data', response.message, 'FAILURE');
            }
        } else if (modalAction === 'delete') {
            const index = modalIndex;
            const data = customerData[index];
            const payload = {
                payer_code: data.payer_code,
                credit_limit: data.credit_limit === 'true',
                is_deleted: true,
                updated_by: window.localStorage.getItem('user_id') || '',
                user_id: data.user_id,
            };
            payloads = [payload];
        } else if (modalAction === 'globalDelete') {
            const allCustomerData = await fetchAllData();
            payloads = allCustomerData?.map((data) => {
                return {
                    payer_code: data.payer_code,
                    credit_limit: data.credit_limit === 'true',
                    is_deleted: true,
                    updated_by: window.localStorage.getItem('user_id') ? window.localStorage.getItem('user_id') : '',
                    user_id: data.user_id,
                };
            });
        } else if (modalAction === 'deleteSelected') {
            const [payerCodes, emails] = selectedRows.reduce(
                (acc, key) => {
                    const [payer_code, email] = key.split('|');
                    acc[0].push(payer_code);
                    acc[1].push(email);
                    return acc;
                },
                [[], []],
            );

            const filterValue = {
                payer_code: payerCodes,
                email: emails,
                ...JSON.parse(filterStringify),
            };

            const payload = { search: filterValue };
            const response = await getKamsData(payload);
            let dataToDelete = response?.body?.kams_data || [];
            dataToDelete = dataToDelete.filter((data) => selectedRows.includes(getUniqueKey(data)));

            payloads = dataToDelete.map((data) => ({
                payer_code: data.payer_code,
                credit_limit: data.credit_limit === 'true',
                is_deleted: true,
                updated_by: window.localStorage.getItem('user_id') || '',
                user_id: data.user_id,
            }));
        }

        if (payloads) {
            const response = await updateCustomerData(payloads);
            if (response?.message) {
                responseHandler(modalAction === 'deleteSelected' ? 'Selected Customer Data Deleted' : 'Customer Data Updated', response.message, 'SUCCESS');
                setSelectedRows([]);
                const filterValue = filterStringify ? JSON.parse(filterStringify) : '';
                const payload = {
                    limit: limit,
                    offset: offset,
                    search: filterValue,
                };
                const customerData = await getKamsData(payload);
                setCustomerGroups(customerData?.body?.customer_groups);
                setCustomerData(customerData?.body?.kams_data);
                setCount(customerData?.body?.count);
            } else {
                responseHandler('Failed to delete Customer Data', response.message, 'FAILURE');
            }
        }
        setLoading(false);
        setIsModalVisible(false);
    };

    const handleGlobalDelete = () => {
        if (selectedRows?.length === customerData?.length) {
            setModalAction('globalDelete');
        } else {
            setModalAction('deleteSelected');
        }
        setIsModalVisible(true);
    };

    const cancelAction = () => {
        setIsModalVisible(false);
    };

    const handleCustomerGroupChange = (value) => {
        setSelectedCustomerGroups(value);
        setPageNo(1);
        if (!isDropdownOpenRef.current) {
            onFilterChange(value, 'customerGroup');
        }
    };

    const handleCustomerGroupSearch = (value) => {
        setCustomerGroupSearch(value);
    };

    const handleDropdownVisibleChange = (open) => {
        isDropdownOpenRef.current = open;
        if (!open) {
            onFilterChange(selectedCustomerGroups, 'customerGroup');
        }
    };

    const handleCustomerGroupClear = () => {
        isClearingAllRef.current = true;
        setSelectedCustomerGroups([]);
        setTimeout(() => {
            isClearingAllRef.current = false;
            if (!isDropdownOpenRef.current) {
                onFilterChange([], 'customerGroup');
            }
        }, 0);
    };

    const filteredCustomerGroups = Array.isArray(customerGroups) ? customerGroups.filter((group) => group.toLowerCase().includes(customerGroupSearch.toLowerCase())) : [];

    return (
        <div className="admin-dashboard-block">
            {loading && <Loader />}
            <div className="global-actions">
                <Select
                    mode="multiple"
                    className="customer-group-select"
                    maxTagCount={5}
                    showSearch
                    allowClear
                    placeholder="Select Customer Group"
                    onChange={handleCustomerGroupChange}
                    onSearch={handleCustomerGroupSearch}
                    onDropdownVisibleChange={handleDropdownVisibleChange}
                    onClear={handleCustomerGroupClear}
                    value={selectedCustomerGroups}
                    notFoundContent="No customer groups found">
                    {filteredCustomerGroups?.map((group, index) => (
                        <Option key={index} value={group}>
                            {group}
                        </Option>
                    ))}
                </Select>
                <button onClick={handleGlobalDelete} className="submitButton-add-kams nkams-save" disabled={selectedRows.length === 0}>
                    Delete All
                </button>
            </div>
            <div className="admin-dashboard-table survey_tables">
                <table>
                    <thead>
                        <tr>
                            <th>
                                <Checkbox
                                    className="header-kams-checkbox"
                                    checked={selectedRows.length > 0 && selectedRows.length === count}
                                    onChange={handleHeaderCheckboxChange}
                                />
                            </th>
                            <th className="add-kams-search kams-name-column">
                                {enableSearch.kamsName ? (
                                    <HeaderSearchBox
                                        onClose={() => {
                                            setEnableSearch({
                                                ...enableSearch,
                                                kamsName: false,
                                            });
                                            setHeaderFilter({
                                                ...headerFilter,
                                                kamsName: '',
                                            });
                                        }}
                                        onFilterChange={onFilterChange}
                                        propKey={'kamsName'}
                                    />
                                ) : (
                                    <>
                                        KAMS/NKAMS Name{' '}
                                        <SearchOutlined
                                            className="unique-search-icon"
                                            onClick={() => {
                                                setEnableSearch({
                                                    ...enableSearch,
                                                    kamsName: true,
                                                });
                                            }}
                                        />
                                    </>
                                )}
                            </th>
                            <th className="customer-code-column">
                                {enableSearch.customerCode ? (
                                    <HeaderSearchBox
                                        onClose={() => {
                                            setEnableSearch({
                                                ...enableSearch,
                                                customerCode: false,
                                            });
                                            setHeaderFilter({
                                                ...headerFilter,
                                                customerCode: '',
                                            });
                                        }}
                                        onFilterChange={onFilterChange}
                                        propKey={'customerCode'}
                                    />
                                ) : (
                                    <>
                                        Customer Code{' '}
                                        <SearchOutlined
                                            className="unique-search-icon"
                                            onClick={() => {
                                                setEnableSearch({
                                                    ...enableSearch,
                                                    customerCode: true,
                                                });
                                            }}
                                        />
                                    </>
                                )}
                            </th>
                            <th className="center-align">
                                {enableSearch.email ? (
                                    <HeaderSearchBox
                                        onClose={() => {
                                            setEnableSearch({
                                                ...enableSearch,
                                                email: false,
                                            });
                                            setHeaderFilter({
                                                ...headerFilter,
                                                email: '',
                                            });
                                        }}
                                        onFilterChange={onFilterChange}
                                        propKey={'email'}
                                    />
                                ) : (
                                    <>
                                        Email{' '}
                                        <SearchOutlined
                                            className="unique-search-icon"
                                            onClick={() => {
                                                setEnableSearch({
                                                    ...enableSearch,
                                                    email: true,
                                                });
                                            }}
                                        />
                                    </>
                                )}
                            </th>
                            <th className="payer-code-column">
                                {enableSearch.payerCode ? (
                                    <HeaderSearchBox
                                        onClose={() => {
                                            setEnableSearch({
                                                ...enableSearch,
                                                payerCode: false,
                                            });
                                            setHeaderFilter({
                                                ...headerFilter,
                                                payerCode: '',
                                            });
                                        }}
                                        onFilterChange={onFilterChange}
                                        propKey={'payerCode'}
                                    />
                                ) : (
                                    <>
                                        Payer Code{' '}
                                        <SearchOutlined
                                            className="unique-search-icon"
                                            onClick={() => {
                                                setEnableSearch({
                                                    ...enableSearch,
                                                    payerCode: true,
                                                });
                                            }}
                                        />
                                    </>
                                )}
                            </th>
                            <th className="customer-group-column">Customer Group</th>
                            <th className="credit-limit-column">Credit Limit</th>
                            {hasViewPermission(pages.NAKM_DETAIL, 'EDIT') && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {customerData?.map((data, index) => {
                            const uniqueKey = getUniqueKey(data);
                            return (
                                <tr key={data.key}>
                                    <td>
                                        <Checkbox className="kams-checkbox" checked={selectedRows.includes(uniqueKey)} onChange={() => handleRowSelection(uniqueKey)} />
                                    </td>
                                    <td>{data?.first_name + ' ' + data?.last_name}</td>
                                    <td>{data?.customer_code}</td>
                                    <td>{data?.email}</td>
                                    <td className="center-align">{data?.payer_code}</td>
                                    <td className="center-align">{data?.customer_group}</td>
                                    <td className="center-align">
                                        <Checkbox
                                            checked={data?.credit_limit === 'true'}
                                            className="kams-checkbox"
                                            onChange={(e) => handleCheckboxChange(e, index)}
                                            readOnly={editIndex !== index}
                                            disabled={editIndex !== index}
                                        />
                                    </td>
                                    {hasViewPermission(pages.NAKM_DETAIL, 'EDIT') && (
                                        <td>
                                            <div className="button-container-kams">
                                                {editIndex === index ? (
                                                    <div className="edit-mode-buttons">
                                                        <Tooltip placement="bottom" title="Save">
                                                            <CheckCircleTwoTone style={{ padding: '5px' }} onClick={() => saveCustomerWorkflow(index)} />
                                                        </Tooltip>
                                                        <Tooltip placement="bottom" title="Cancel">
                                                            <CloseCircleTwoTone style={{ padding: '5px' }} onClick={() => closeEditWorkflow(index)} />
                                                        </Tooltip>
                                                    </div>
                                                ) : (
                                                    <Tooltip placement="bottom" title="Edit">
                                                        <EditTwoTone onClick={() => enableEditWorkflow(index)} />
                                                    </Tooltip>
                                                )}
                                                <span>
                                                    <img className="kams-img" src="/assets/images/delete.svg" onClick={() => handleDelete(index)} alt="delete material" />
                                                </span>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {!(customerData?.length > 0) && (
                    <div className="NoDataDiv">
                        <b>No data available.</b>
                    </div>
                )}
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
            </div>
            <Modal title="Confirm Action" visible={isModalVisible} onOk={confirmAction} onCancel={cancelAction} okText="Yes" cancelText="No">
                <p>This action will be applicable to all the customer codes for the selected Payer code and selected KAM/NKAM. Do you want to proceed?</p>
            </Modal>
        </div>
    );
}

const mapStateToProps = () => {
    return {};
};
const mapDispatchToProps = (dispatch) => {
    return {
        getKamsData: (payload) => dispatch(Action.getKamsData(payload)),
        updateCustomerData: (data) => dispatch(Action.updateCustomerData(data)),
    };
};
export default connect(mapStateToProps, mapDispatchToProps)(ViewKamsCustomers);
