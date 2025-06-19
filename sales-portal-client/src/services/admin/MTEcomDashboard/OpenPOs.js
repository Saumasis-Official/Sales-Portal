import { connect } from 'react-redux';
import React, { useEffect, useState, useRef } from 'react';
import Util from '../../../util/helper/index';
import Loader from '../../../components/Loader/mtIndex';
import { Link } from 'react-router-dom';
import Panigantion from '../../../components/Panigantion';
import '../Questionnaire/survey.css';
import './Mtecom.css';
import { Select } from 'antd';
import { DownOutlined } from '@ant-design/icons';

const { Option } = Select;

function OpenPOTable(props) {
  const {
    poDataList,
    status,
    updatedLimit,
    updatedOffset,
    pageNo,
    setPageNo,
    onFilterChange,
    customerNames,
    statuses,
  } = props;

  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [
    isCustomerNameSelectVisible,
    setIsCustomerNameSelectVisible,
  ] = useState(false);
  const [isStatusSelectVisible, setIsStatusSelectVisible] =
    useState(false);
  const [selectedCustomerNames, setSelectedCustomerNames] = useState(
    [],
  );
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [isCustomerNameDropdownOpen, setIsCustomerNameDropdownOpen] =
    useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] =
    useState(false);
  const isClearingAllRef = useRef(false); // Ref to track bulk clear actions
  useEffect(() => {
    updatedLimit(limit);
    updatedOffset(offset);
  }, [
    limit,
    offset,
    poDataList,
    status,
    updatedLimit,
    updatedOffset,
  ]);

  const onChangePage = (page, itemsPerPage) => {
    setLimit(itemsPerPage);
    setOffset((page - 1) * limit);
    setPageNo(page);
  };

  const handleCustomerNameChange = (value) => {
    setSelectedCustomerNames(value);
    setPageNo(1);
  };

  const handleStatusChange = (value) => {
    setSelectedStatuses(value);
    setPageNo(1);
  };

  const handleCustomerNameClear = () => {
    isClearingAllRef.current = true; // Set ref to true when clearing all
    setSelectedCustomerNames([]);
    setIsCustomerNameSelectVisible(false);
    setIsCustomerNameDropdownOpen(false);
    onFilterChange({ selectedCustomerNames: [], selectedStatuses });
    setTimeout(() => {
      isClearingAllRef.current = false;
    }, 0);
  };

  const handleStatusClear = () => {
    isClearingAllRef.current = true; // Set ref to true when clearing all
    setSelectedStatuses([]);
    setIsStatusSelectVisible(false);
    setIsStatusDropdownOpen(false);
    onFilterChange({ selectedCustomerNames, selectedStatuses: [] });
    setTimeout(() => {
      isClearingAllRef.current = false;
    }, 0);
  };

  const handleCustomerNameBlur = () => {
    onFilterChange({ selectedCustomerNames, selectedStatuses });
  };

  const handleStatusesBlur = () => {
    onFilterChange({ selectedCustomerNames, selectedStatuses });
  };

  return (
    <>
      <div className="admin-dashboard-table Mdm-TableHeader">
        <table>
          <Loader>
            <thead>
              <tr>
                <th className="sub-header ">PO Number</th>
                <th
                  className="sub-header "
                  style={{ width: '160px' }}
                >
                  Customer Code
                </th>
                {!isCustomerNameSelectVisible ? (
                  <th
                    className="sub-header "
                    style={{ width: '160px' }}
                  >
                    Customer Name
                    <span
                      onClick={() => {
                        setIsCustomerNameSelectVisible(true);
                        setIsCustomerNameDropdownOpen(true);
                        setIsStatusDropdownOpen(false);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <DownOutlined />
                    </span>
                  </th>
                ) : (
                  <th
                    className="sub-header "
                    style={{ width: '180px' }}
                  >
                    <Select
                      mode="multiple"
                      autoFocus
                      open={isCustomerNameDropdownOpen}
                      maxTagCount={1}
                      maxTagTextLength={6}
                      style={{ width: '104%' }}
                      placeholder="Select customer names"
                      value={selectedCustomerNames}
                      onChange={handleCustomerNameChange}
                      allowClear={customerNames.length > 0}
                      onClear={handleCustomerNameClear}
                      onDropdownVisibleChange={(open) => {
                        setIsCustomerNameDropdownOpen(open);
                        if (!open) {
                          handleCustomerNameBlur();
                          if (selectedCustomerNames.length === 0) {
                            setIsCustomerNameSelectVisible(false);
                          }
                        }
                      }}
                      onDeselect={(value) => {
                        if (isClearingAllRef.current) return; // Skip if clearing all
                        const updatedCustomerNames =
                          selectedCustomerNames.filter(
                            (name) => name !== value,
                          );
                        if (updatedCustomerNames.length === 0) {
                          setIsCustomerNameSelectVisible(false);
                        }
                        onFilterChange({
                          selectedCustomerNames: updatedCustomerNames,
                          selectedStatuses,
                        });
                      }}
                    >
                      {customerNames.map((value) => (
                        <Option key={value} value={value}>
                          {value}
                        </Option>
                      ))}
                    </Select>
                  </th>
                )}
                <th className="sub-header ">SO Number</th>
                <th className="sub-header ">Site Code</th>
                <th className="sub-header ">PO Created Date</th>
                <th className="sub-header ">PO Expiry Date</th>
                {!isStatusSelectVisible ? (
                  <th
                    className="sub-header "
                    style={{ width: '160px' }}
                  >
                    Status
                    <span
                      onClick={() => {
                        setIsStatusSelectVisible(true);
                        setIsStatusDropdownOpen(true);
                        setIsCustomerNameDropdownOpen(false);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <DownOutlined />
                    </span>
                  </th>
                ) : (
                  <th
                    className="sub-header "
                    style={{ width: '185px' }}
                  >
                    <Select
                      mode="multiple"
                      autoFocus
                      maxTagCount={1}
                      style={{ width: '100%' }}
                      placeholder="Select statuses"
                      value={selectedStatuses}
                      maxTagTextLength={6}
                      onChange={handleStatusChange}
                      allowClear={statuses.length > 0}
                      onClear={handleStatusClear}
                      open={isStatusDropdownOpen}
                      onDropdownVisibleChange={(open) => {
                        setIsStatusDropdownOpen(open);
                        if (!open) {
                          handleStatusesBlur();
                          if (selectedStatuses.length === 0) {
                            setIsStatusSelectVisible(false);
                          }
                        }
                      }}
                      onDeselect={(value) => {
                        if (isClearingAllRef.current) return; // Skip if clearing all
                        const updatedStatuses =
                          selectedStatuses.filter(
                            (status) => status !== value,
                          );
                        if (updatedStatuses.length === 0) {
                          setIsStatusSelectVisible(false);
                        }
                        onFilterChange({
                          selectedCustomerNames,
                          selectedStatuses: updatedStatuses,
                        });
                      }}
                    >
                      {statuses.map((value) => (
                        <Option key={value} value={value}>
                          {value}
                        </Option>
                      ))}
                    </Select>
                  </th>
                )}
              </tr>
            </thead>
            <tbody style={{ textAlign: 'center' }}>
              {poDataList && poDataList?.poList?.length > 0 ? (
                poDataList?.poList?.map((data, index) => (
                  <tr key={index}>
                    <td>
                      <Link
                        to={{ pathname: '/admin/po-data' }}
                        onMouseEnter={() =>
                          localStorage.setItem(
                            'po_data',
                            JSON.stringify(data),
                          )
                        }
                      >
                        {data?.po_number ? data?.po_number : '-'}
                      </Link>
                    </td>
                    <td>
                      {data?.customer_code
                        ? data?.customer_code
                        : '-'}
                    </td>
                    <td>{data?.customer ? data?.customer : '-'}</td>
                    <td>{data?.so_number ? data?.so_number : '-'}</td>
                    <td>{data?.site_code ? data?.site_code : '-'}</td>
                    <td>
                      {data?.po_created_date &&
                      !isNaN(
                        new Date(data?.po_created_date).getTime(),
                      )
                        ? Util.formatDate(
                            new Date(data?.po_created_date),
                          )
                        : '-'}
                    </td>
                    <td>
                      {data?.delivery_date &&
                      !isNaN(new Date(data?.delivery_date).getTime())
                        ? Util.formatDate(
                            new Date(data?.delivery_date),
                          )
                        : '-'}
                    </td>
                    <td>{data?.status ? data?.status : ' -'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="NoDataDiv">
                    <b>No Data Available.</b>
                  </td>
                </tr>
              )}
            </tbody>
          </Loader>
        </table>
      </div>
      <Panigantion
        data={poDataList?.poList ? poDataList?.poList : []}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        itemsCount={poDataList?.total_count}
        setModifiedData={onChangePage}
        pageNo={pageNo}
      />
    </>
  );
}

const mapStateToProps = () => {
  return {};
};
const mapDispatchToProps = () => {
  return {};
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(OpenPOTable);
