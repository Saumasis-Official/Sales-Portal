import { Row, Col, Select, notification, Checkbox } from 'antd';
import { connect } from 'react-redux';
import * as Action from '../actions/adminAction';
import React, { useEffect, useState, useRef } from 'react';
import './AddKamsCustomers.css';
import Panigantion from '../../../components/Panigantion';
import * as SurveyAction from '../../distributor/actions/surveyAction';
import { SearchOutlined } from '@ant-design/icons';
import HeaderSearchBox from '../../../components/HeaderSearchBox/HeaderSearchBox';
import { debounce } from 'lodash';
import { pages, hasViewPermission } from '../../../persona/mdm';

function AddKamsCustomers(props) {
    const { getCustomerCodes, updateCustomerCodes, customerCodes, addUpdateKams } = props;
    const [emailId, setEmailId] = useState();
    const [emailList, setEmailList] = useState([]);
    const [customerData, setCustomerData] = useState([]);
    const [count, setCount] = useState(0);
    const [pageNo, setPageNo] = useState(1);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [enableSearch, setEnableSearch] = useState({
        customerCode: false,
        customerName: false,
    });
    const [headerFilter, setHeaderFilter] = useState({
        customerCode: '',
        customerName: '',
    });
    const [customerGroups, setCustomerGroups] = useState([]);
    const [payerCodes, setPayerCodes] = useState([]);
    const [selectedPayerCodes, setSelectedPayerCodes] = useState([]);
    const [selectedCustomerGroups, setSelectedCustomerGroups] = useState([]);
    const [isSaveEnabled, setIsSaveEnabled] = useState(false);
    const [creditLimit, setCreditLimit] = useState(false);
    const isFetchingData = useRef(false);
    const isClearingAllRef = useRef(false); // Ref to track bulk clear actions
    const { Option } = Select;

    const fetchCustomerData = async (updatedSelectedCustomerGroups, updatedSelectedPayerCodes) => {
        if (isFetchingData.current) return;
        isFetchingData.current = true;

        let data = {
            headerFilter,
            limit,
            offset,
            payerCode: updatedSelectedPayerCodes || selectedPayerCodes,
            customerGroup: updatedSelectedCustomerGroups || selectedCustomerGroups,
            role: localStorage.getItem('role'),
            user_id: localStorage.getItem('user_id'),
        };
        const customerData = await getCustomerCodes(data);
        setCustomerData(customerData?.body?.customer_data);
        setCount(customerData?.body?.count || 0);
        setCustomerGroups(customerData?.body?.customer_group);
        const payerCodes = customerData?.body?.payer_code || [];
        if (payerCodes.length > 0) {
            setPayerCodes([{ payer_code: 'Select All' }, ...payerCodes]);
        } else {
            setPayerCodes([]);
        }
        setEmailList(customerData?.body?.emails || []);

        isFetchingData.current = false;
    };

    useEffect(() => {
        const isSaveEnabled = emailId?.length > 0 && selectedCustomerGroups?.length > 0 && selectedPayerCodes?.length > 0;
        setIsSaveEnabled(isSaveEnabled);
    }, [emailId, selectedCustomerGroups, selectedPayerCodes, customerCodes]);

    useEffect(() => {
        fetchCustomerData();
    }, [offset, limit, headerFilter]);

    const addUserDetails = async () => {
        let data = {
            id: localStorage.getItem('user_id'),
            email: emailId,
            customerGroup: selectedCustomerGroups,
            payerCode: selectedPayerCodes,
            customerCode: customerCodes.customer_codes,
            creditLimit: creditLimit,
        };
        let response = await addUpdateKams(data);
        if (response?.body && response?.body?.message) {
            setEmailId();
            updateCustomerCodes({
                customer_codes: [],
            });
            setLimit(10);
            setOffset(0);
            setSelectedCustomerGroups([]);
            setSelectedPayerCodes([]);
            setCustomerGroups([]);
            setPayerCodes([]);
            setCreditLimit(false);
            responseHandler('User added', response.body.message, 'SUCCESS');
            let data = {
                headerFilter: headerFilter || '',
                limit: limit,
                offset: offset,
                payerCode: [],
                customerGroup: [],
                role: localStorage.getItem('role'),
                user_id: localStorage.getItem('user_id'),
            };
            const customerData = await getCustomerCodes(data);
            setCustomerData(customerData?.body?.customer_data);
            setCount(customerData.body.count || 0);
            setCustomerGroups(customerData?.body?.customer_group);
            const payerCodes = customerData.body.payer_code || [];
            if (payerCodes.length > 0) {
                setPayerCodes([{ payer_code: 'Select All' }, ...payerCodes]);
            } else {
                setPayerCodes([]);
            }
            setEmailList(customerData?.body?.emails || []);
        } else {
            responseHandler('Failed to add User', response.detail, 'FAILURE');
        }
    };
    let responseHandler = (message, description, type) => {
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
    const onClose = (propKey) => {
        setEnableSearch({ ...enableSearch, [propKey]: false });
        delete headerFilter[propKey];
        setHeaderFilter({ ...headerFilter });
        fetchCustomerData();
    };
    const onFilterChange = (e, propsKey) => {
        let value = e.target.value;
        setHeaderFilter({ ...headerFilter, [propsKey]: value });
        setPageNo(1);
        setLimit(itemsPerPage);
        setOffset(0);
    };
    const debouncedOnFilterChange = debounce(onFilterChange, 1000);
    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    const handleCustomerGroupChange = (value) => {
        setSelectedCustomerGroups(value);
        setPageNo(1);
        setOffset(0);
    };

    const handleCustomerGroupBlur = () => {
        if (!isClearingAllRef.current) {
            fetchCustomerData(selectedCustomerGroups, selectedPayerCodes);
        }
    };

    const handleCustomerGroupClear = () => {
        isClearingAllRef.current = true;
        setSelectedCustomerGroups([]);
        setTimeout(() => {
            isClearingAllRef.current = false;
            fetchCustomerData([], selectedPayerCodes);
        }, 0);
    };

    const handleCustomerGroupDeselect = (value) => {
        if (isClearingAllRef.current) return;
        const updatedSelectedCustomerGroups = selectedCustomerGroups.filter((group) => group !== value);
        setSelectedCustomerGroups(updatedSelectedCustomerGroups);
        fetchCustomerData(updatedSelectedCustomerGroups, selectedPayerCodes);
    };

    const handlePayerCodeChange = (value) => {
        if (value.includes('Select All')) {
            if (selectedPayerCodes.length === payerCodes.length - 1) {
                setSelectedPayerCodes([]);
            } else {
                setSelectedPayerCodes(payerCodes.map((payer) => payer.payer_code).filter((code) => code !== 'Select All'));
            }
        } else {
            setSelectedPayerCodes(value);
        }
        setPageNo(1);
        setOffset(0);
    };

    const handlePayerCodeBlur = () => {
        if (!isClearingAllRef.current) {
            fetchCustomerData(selectedCustomerGroups, selectedPayerCodes);
        }
    };

    const handlePayerCodeClear = () => {
        isClearingAllRef.current = true;
        setSelectedPayerCodes([]);
        setTimeout(() => {
            isClearingAllRef.current = false;
            fetchCustomerData(selectedCustomerGroups, []);
        }, 0);
    };

    const handlePayerCodeDeselect = (value) => {
        if (isClearingAllRef.current) return;
        const updatedSelectedPayerCodes = selectedPayerCodes.filter((code) => code !== value);
        setSelectedPayerCodes(updatedSelectedPayerCodes);
        fetchCustomerData(selectedCustomerGroups, updatedSelectedPayerCodes);
    };

    const onCustomerCodeSearch = () => {
        setEnableSearch({
            ...enableSearch,
            customerCode: true,
        });
        setPageNo(1);
        setLimit(itemsPerPage);
        setOffset(0);
    };

    const onCustomerNameSearch = () => {
        setEnableSearch({
            ...enableSearch,
            customerName: true,
        });
        setPageNo(1);
        setLimit(itemsPerPage);
        setOffset(0);
    };

  return (
    <div className="admin-dashboard-block">
      <Row className="filters-kams" gutter={16}>
        <Col>
          <Select
            mode="multiple"
            className="email-search"
            placeholder="Select KAMS/NKAMS Emails"
            showSearch
            maxTagCount={1}
            allowClear={emailId?.length > 0}
            value={emailId}
            onChange={(value) => setEmailId(value)}
            options={emailList?.map((emailObj) => ({
              label: emailObj.email,
              value: emailObj.email,
            }))}
            notFoundContent="No emails found"
            style={{ flex: '1', marginRight: '4px' }}
          >
            {emailList?.map((emailObj) => (
              <Option key={emailObj.email} value={emailObj.email}>
                {emailObj.email}
              </Option>
            ))}
          </Select>
        </Col>
        <Col style={{ paddingRight: '5px' }}>
          <Select
            mode="multiple"
            maxTagCount={1}
            showSearch
            value={selectedCustomerGroups}
            allowClear={customerGroups?.length > 0}
            style={{ width: '165px' }}
            placeholder="Customer Group"
            onChange={handleCustomerGroupChange}
            onBlur={handleCustomerGroupBlur}
            onClear={handleCustomerGroupClear}
            onDeselect={handleCustomerGroupDeselect}
            notFoundContent="No customer groups found"
          >
            {customerGroups
              ?.filter((group) => group.customer_group && group.customer_group.trim() !== '')
              .map((group) => (
                <Option key={group.customer_group} value={group.customer_group}>
                  {group.customer_group}
                </Option>
              ))}
          </Select>
        </Col>

        <Col style={{ paddingRight: '5px' }}>
          <Select
            mode="multiple"
            maxTagCount={1}
            showSearch
            value={selectedPayerCodes}
            allowClear={payerCodes?.length > 0}
            style={{ width: '172px' }}
            placeholder="Payer Code"
            onChange={handlePayerCodeChange}
            onBlur={handlePayerCodeBlur}
            onClear={handlePayerCodeClear}
            onDeselect={handlePayerCodeDeselect}
            notFoundContent="No payer codes found"
          >
            {payerCodes?.map((payer) => (
              <Option key={payer.payer_code} value={payer.payer_code}>
                {payer.payer_code}
              </Option>
            ))}
          </Select>
        </Col>
        <Col>
          <Checkbox
            checked={creditLimit}
            onChange={(e) => setCreditLimit(e.target.checked)}
            className="credit-limit-checkbox-kams"
          >
            Credit Limit
          </Checkbox>
        </Col>
        <Col>
          {hasViewPermission(pages.NAKM_DETAIL, 'EDIT') && (
            <div className="button-container-kams">
              <button
                onClick={addUserDetails}
                className="submitButton-add-kams nkams-save"
                disabled={!isSaveEnabled}
              >
                Save
              </button>
            </div>
          )}
        </Col>
      </Row>
      <div className="admin-dashboard-table survey_tables">
        <table>
          <thead>
            <tr>
              {!enableSearch.customerCode ? (
                <th>
                  Customer Code{' '}
                  <SearchOutlined
                    className="unique-search-icon"
                    onClick={onCustomerCodeSearch}
                  />
                </th>
              ) : (
                <th>
                  <HeaderSearchBox
                    onClose={onClose}
                    onFilterChange={debouncedOnFilterChange}
                    propKey={'customerCode'}
                  />
                </th>
              )}
              {!enableSearch.customerName ? (
                <th>
                  Customer Name{' '}
                  <SearchOutlined
                    className="unique-search-icon"
                    onClick={onCustomerNameSearch}
                  />
                </th>
              ) : (
                <th>
                  <HeaderSearchBox
                    onClose={onClose}
                    onFilterChange={debouncedOnFilterChange}
                    propKey={'customerName'}
                  />
                </th>
              )}
              <th>Payer Code</th>
              <th>Customer Group</th>
            </tr>
          </thead>
          <tbody>
            {customerData &&
              customerData?.map((data, index) => {
                return (
                  <tr key={index}>
                    <td>{data?.customer_code}</td>
                    <td>{data?.customer_name}</td>
                    <td>{data?.payer_code}</td>
                    <td>{data?.customer_group}</td>
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
        <Panigantion
          data={customerData ? customerData : []}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          itemsCount={count}
          setModifiedData={onChangePage}
          pageNo={pageNo}
        />
      </div>
    </div>
  );
}

const mapStateToProps = (state) => {
    return {
        customerCodes: state.survey.get('customer_codes'),
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        getCustomerCodes: (data) => dispatch(Action.getCustomerCodes(data)),
        updateCustomerCodes: (data) => dispatch(SurveyAction.updateCustomerCodes(data)),
        addUpdateKams: (data) => dispatch(Action.addUpdateKams(data)),
    };
};
export default connect(mapStateToProps, mapDispatchToProps)(AddKamsCustomers);
