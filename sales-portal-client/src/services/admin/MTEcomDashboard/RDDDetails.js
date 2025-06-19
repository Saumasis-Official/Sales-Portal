import { connect } from 'react-redux';
import React, { useEffect, useState, useRef } from 'react';
import Util from '../../../util/helper/index';
import Loader from '../../../components/Loader';
import { Link } from 'react-router-dom';
import '../Questionnaire/survey.css';
import './Mtecom.css';
import { NO_DATA_SYMBOL } from '../../../constants';
import { Select } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import Paginator from '../../../components/Panigantion';

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
    status('RDD');
    updatedLimit(limit);
    updatedOffset(offset);
  }, [limit, offset]);

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
    const booleanStatuses = value.map(
      (status) => status === 'Submitted',
    );
    setSelectedStatuses(booleanStatuses);
    setPageNo(1);
  };

  const handleCustomerNameClear = () => {
    isClearingAllRef.current = true;
    setSelectedCustomerNames([]);
    setIsCustomerNameSelectVisible(false);
    setIsCustomerNameDropdownOpen(false);
    onFilterChange({ selectedCustomerNames: [], selectedStatuses });
    setTimeout(() => {
      isClearingAllRef.current = false;
    }, 0);
  };

  const handleStatusClear = () => {
    isClearingAllRef.current = true;
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
        <Loader>
          <table>
            <thead>
              <tr>
                <th className="sub-header width15">PO Number</th>
                {!isCustomerNameSelectVisible ? (
                  <th className="sub-header width15">
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
                  <th className="sub-header width17">
                    <Select
                      mode="multiple"
                      autoFocus
                      maxTagCount={1}
                      maxTagTextLength={6}
                      style={{ width: '150px' }}
                      placeholder="Select customer names"
                      value={selectedCustomerNames}
                      onChange={handleCustomerNameChange}
                      allowClear={customerNames.length > 0}
                      onClear={handleCustomerNameClear}
                      open={isCustomerNameDropdownOpen}
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
                        if (isClearingAllRef.current) return;
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
                <th className="sub-header width15">PO Date</th>
                <th className="sub-header width15">SO Number</th>
                <th className="sub-header width15">SO Date</th>
                <th className="sub-header width15">Invoice Number</th>
                {!isStatusSelectVisible ? (
                  <th
                    className="sub-header"
                    style={{ width: '120px' }}
                  >
                    RDD
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
                    className="sub-header width15"
                    style={{ width: '120px' }}
                  >
                    <Select
                      mode="multiple"
                      autoFocus
                      maxTagCount={1}
                      maxTagTextLength={6}
                      style={{ width: '150px' }}
                      placeholder="Select statuses"
                      value={selectedStatuses.map((status) =>
                        status ? 'Submitted' : 'Not Submitted',
                      )}
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
                          selectedStatuses.filter((status) => {
                            if (value === 'Submitted')
                              return status !== true;
                            if (value === 'Not Submitted')
                              return status !== false;
                            return true;
                          });
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
              {poDataList?.poList?.length > 0 ? (
                poDataList.poList.map((data, index) => (
                  <tr key={index}>
                    <td>
                      <Link
                        to={{ pathname: '/admin/po-data' }}
                        onMouseEnter={() => {
                          data.type = 'POData';
                          localStorage.setItem(
                            'po_data',
                            JSON.stringify(data),
                          );
                        }}
                      >
                        {data?.po_number || NO_DATA_SYMBOL}
                      </Link>
                    </td>
                    <td>{data?.customer}</td>
                    <td>
                      {data?.po_created_date &&
                      !isNaN(
                        new Date(data?.po_created_date).getTime(),
                      )
                        ? Util.formatDate(
                            new Date(data?.po_created_date),
                          )
                        : NO_DATA_SYMBOL}
                    </td>
                    <td>{data?.so_number || NO_DATA_SYMBOL}</td>
                    <td>
                      {data?.so_created_date &&
                      !isNaN(
                        new Date(data?.so_created_date).getTime(),
                      )
                        ? Util.formatDate(
                            new Date(data?.so_created_date),
                          )
                        : NO_DATA_SYMBOL}
                    </td>
                    <td>
                      {data?.invoice_number ? (
                        <Link
                          onMouseEnter={() => {
                            data.type = 'Invoice';
                            localStorage.setItem(
                              'po_data',
                              JSON.stringify(data),
                            );
                          }}
                          to={{ pathname: '/admin/po-data' }}
                        >
                          {data.invoice_number}
                        </Link>
                      ) : (
                        'Invoice Pending'
                      )}
                    </td>
                    <td>
                      {data?.status ? (
                        <Link
                          onMouseEnter={() => {
                            data.type = 'RDDData';
                            localStorage.setItem(
                              'po_data',
                              JSON.stringify(data),
                            );
                          }}
                          to={{
                            pathname: '/admin/po-data',
                            state: { data, type: 'RDDData' },
                          }}
                        >
                          Submitted
                        </Link>
                      ) : (
                        'Not Submitted'
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="NoDataDiv">
                    <b>No Data Available.</b>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Loader>
      </div>
      <Paginator
        data={poDataList?.poList || []}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        itemsCount={poDataList?.total_count}
        setModifiedData={onChangePage}
        pageNo={pageNo}
      />
    </>
  );
}

const mapStateToProps = () => ({});

const mapDispatchToProps = () => ({});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(OpenPOTable);
