import * as Action from '../actions/adminAction';
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Select, Tooltip } from 'antd';
import {
    pages,
    features,
    hasEditPermission,
  } from '../../../persona/distributorHeader';
import Util from '../../../util/helper';
import Panigantion from '../../../components/Panigantion';
import '../AppSettings/AppSettings1.css';
import '../MdmDashboard/MdmMasterDashboard.css';
import AddMTEcomModal from '../addMTEComModal/addMTEcomModal';
import { Link } from "react-router-dom";
import './AddKamsCustomers.css';
import { SearchOutlined } from '@ant-design/icons';
import HeaderSearchBox from '../../../components/HeaderSearchBox/HeaderSearchBox';
import { debounce } from 'lodash';

const MTEcomCustomerDetails = (props) => {
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
    const [enableSearch, setEnableSearch] = useState({
      customerCode: false,
      customerName: false,
    });
    const [headerFilter, setHeaderFilter] = useState({
      customerCode : '',
      customerName : ''
    } 
    );
    const {
        customerList,
        addUpdateCustomer,
      } = props;
    const { Option } = Select;
    useEffect(async () => {
      let payload ={
        limit : limit,
        offset: offset,
        search : headerFilter || ''
      }
    const customerData = await customerList(payload);
    setCustomerData(customerData?.body?.customerList);
    setCount(customerData?.body?.count);
    }, [headerFilter,offset, limit]);
    const fieldOnChange = (e, index, type) => {
    if (type == 'customer_type') {
        customerData[index][type] = e;
        setCustomerData([...customerData]);
    } else {
        customerData[index][type] = e.target.value;
        setCustomerData([...customerData]);
    }
    };
    const showModal = () => {
          setIsModalOpen(true);
       
      };
      const onFilterChange = (e, propsKey) => {
        let value = e.target.value;
        let data = {}
        setHeaderFilter({ ...headerFilter, [propsKey]: value });
      };
      const debouncedOnFilterChange = debounce(onFilterChange, 1000);
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
          Util.notificationSender(
            'Error',
            'Error while updating customer',
            false,
          );
        }
      };
    // For closing the edit
    const closeEdit = (index, booleanFlag) => {
        customerData[index].is_disabled = booleanFlag;
        customerData[index].customer_name = previousData.customer_name;
        customerData[index].customer_code = previousData.customer_code;
        customerData[index].customer_type = previousData.customer_type;
        setCustomerData([...customerData]);
    };
    // For Pagination
    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };
    const createRequest = async (data) => {
    const response = await addUpdateCustomer(data);
    if (response.body.message) {
      Util.notificationSender('Success', response.body.message, true);
      setIsModalOpen(false);
      const customerData = await customerList(limit, offset);
      setCustomerData(customerData?.body?.customerList);
      setCount(customerData?.body?.count);
    } else {
      Util.notificationSender(
        'Error',
        'Error while Adding Customer',
        false,
      );
    }
  };
  const onClose = (propKey) => {
    setEnableSearch({ ...enableSearch, [propKey]: false });
    setHeaderFilter({ ...headerFilter, [propKey]: '' });
  };
    return <>
    <div className="admin-dashboard-wrapper ecom-table">
            <div className="admin-dashboard-block">
                {/* <div className="left-header-ecom"> */}
        <h2 className="card-row-col mt-ecom-settings">
            MT-ECOM Customer Details
          </h2>
          <div className="admin-dashboard-table Mdm-TableHeader">
            <div
              style={{ justifyContent: 'flex-end', display: 'flex' }}
            >
              <Link to="/admin/mt-ecom-dashboard" className="back-to-dashboard">
                        Back to MT-Ecom Dashboard
                    </Link>
            </div>
            <table>
              <thead>
                <tr>
                {!enableSearch.customerName ? (
                <th>
                  Customer Name{' '}
                  <SearchOutlined
                    onClick={() => {
                      setEnableSearch({
                        ...enableSearch,
                        customerName: true,
                      });
                    }}
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
                {!enableSearch.customerCode ? (
                <th>
                  Customer Code{' '}
                  <SearchOutlined
                    onClick={() => {
                      setEnableSearch({
                        ...enableSearch,
                        customerCode: true,
                      });
                    }}
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
                  
                  {/* <th className="width25">Customer Code</th> */}
                  <th className="width25">Customer Type</th>
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
                            onChange={(e) =>
                              fieldOnChange(e, index, 'customer_name')
                            }
                          />
                        </td>
                      ) : (
                        <td className="width25">
                          {data?.customer_name}
                        </td>
                      )}
                      {!data?.is_disabled ? (
                        <td className="width25">
                          <input
                            type="text"
                            className="width25 mt-ecom-input"
                            disabled={data?.is_disabled}
                            value={data?.customer_code}
                            onChange={(e) =>
                              fieldOnChange(e, index, 'customer_code')
                            }
                          />
                        </td>
                      ) : (
                        <td className="width25">
                          {data?.customer_code}
                        </td>
                      )}
                      {!data?.is_disabled ? (
                        <td className="width25">
                          <Select
                            onChange={(e) => {
                              fieldOnChange(
                                e,
                                index,
                                'customer_type',
                              );
                            }}
                            placeholder="Select"
                            name="reason"
                            value={data?.customer_type}
                            className="width25 mt-ecom-select"
                          >
                            <Option value="Single GRN">
                              Single GRN
                            </Option>
                            <Option value="Multi GRN">
                              Multi GRN
                            </Option>
                          </Select>
                        </td>
                      ) : (
                        <td className="width25">
                          {data?.customer_type}
                        </td>
                      )}
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
            </div>
        </div>
        <AddMTEcomModal
        visible={!!isModalOpen}
        onCancel={setIsModalOpen}
        createRequest={createRequest}
      />
    </>
}
const mapStateToProps = (state) => {
    return {};
  };
const mapDispatchToProps = (dispatch) => {
    return {
      customerList: (data) =>
        dispatch(Action.customerList(data)),
      addUpdateCustomer: (data) =>
        dispatch(Action.addUpdateCustomer(data)),
    };
  };
  export default connect(mapStateToProps,mapDispatchToProps,)(MTEcomCustomerDetails);