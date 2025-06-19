import { connect } from 'react-redux';
import React, { useEffect, useState, useRef } from 'react';
import Util from '../../../util/helper/index';
import Loader from '../../../components/Loader/mtIndex';
import { Link } from 'react-router-dom';
import Panigantion from '../../../components/Panigantion';
import './Mtecom.css';
import '../MdmDashboard/MdmMasterDashboard.css';
import '../Questionnaire/survey.css';
import { Select } from 'antd';
import { DownOutlined } from '@ant-design/icons';

const { Option } = Select;

function ClosedPOTable(props) {
  const {
    poDataList,
    status,
    updatedLimit,
    updatedOffset,
    pageNo,
    setPageNo,
    onFilterChange,
    customerNames,
  } = props;

  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [
    isCustomerNameSelectVisible,
    setIsCustomerNameSelectVisible,
  ] = useState(false);
  const [isCustomerNameDropdownOpen, setIsCustomerNameDropdownOpen] =
    useState(false);
  const [selectedCustomerNames, setSelectedCustomerNames] = useState(
    [],
  );
  const isClearingAllRef = useRef(false); // Ref to track bulk clear actions

  useEffect(() => {
    // status('Closed');
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

  const handleCustomerNameClear = () => {
    isClearingAllRef.current = true; // Set ref to true when clearing all
    setSelectedCustomerNames([]);
    setIsCustomerNameSelectVisible(false);
    setIsCustomerNameDropdownOpen(false);
    onFilterChange({
      selectedCustomerNames: [],
    });
    setTimeout(() => {
      isClearingAllRef.current = false;
    }, 0);
  };

  const handleCustomerNameBlur = () => {
    onFilterChange({ selectedCustomerNames });
  };

  return (
    <>
      <div className="admin-dashboard-table Mdm-TableHeader">
        <Loader>
          <table>
            <thead>
              <tr>
                <th className="sub-header">PO Number</th>
                <th className="sub-header">Customer Code</th>
                {!isCustomerNameSelectVisible ? (
                  <th
                    className="sub-header"
                    style={{ width: '160px' }}
                  >
                    Customer Name
                    <span
                      onClick={() => {
                        setIsCustomerNameSelectVisible(true);
                        setIsCustomerNameDropdownOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <DownOutlined />
                    </span>
                  </th>
                ) : (
                  <th
                    className="sub-header"
                    style={{ width: '170px' }}
                  >
                    <Select
                      mode="multiple"
                      autoFocus
                      maxTagCount={1}
                      maxTagTextLength={6}
                      style={{ width: '100%' }}
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
                <th className="sub-header">Site Code</th>
                <th className="sub-header">Created Date</th>
                <th className="sub-header">PO Expiry Date</th>
                <th className="sub-header">Sales Order</th>
                <th className="sub-header">Status</th>
              </tr>
            </thead>
            <tbody style={{ textAlign: 'center' }}>
              {poDataList &&
              poDataList.poList &&
              poDataList.poList.length > 0 ? (
                poDataList.poList.map((data, index) => (
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
                    <td>{data?.so_number ? data?.so_number : '-'}</td>
                    <td>{data?.status ? data?.status : '-'}</td>
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
          </table>
        </Loader>
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
)(ClosedPOTable);
