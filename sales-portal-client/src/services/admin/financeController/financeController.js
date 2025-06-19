import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import * as AuthAction from '../../auth/action';
import ExportToExcel from './ExportToExcel';
import Panigantion from '../../../components/Panigantion';
import Util from '../../../util/helper';
import { Checkbox, Input, Select } from 'antd';
import './financeController.css';
const { Option } = Select;

const FinanceController = ({ fetchDistributorAgreements }) => {
  const [data, setData] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [deselectedRows, setDeselectedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [totalCount, setTotalCount] = useState(0);
  const [exportedList, setExportedList] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, [currentPage, limit, offset, search, status]);

  const fetchData = async () => {
    const res = await fetchDistributorAgreements(
      limit,
      (currentPage - 1) * limit,
      status,
      search,
    );
    if (res.success) {
      setData(res.data.agreements.dbResponse);
      setTotalCount(res.data.agreements.dbResponseCount);
    } else {
      setData([]);
      setTotalCount(0);
    }
  };

  const handleCheckboxChange = (id) => {
    if (selectedRows.has(id)) {
      selectedRows.delete(id);
      setDeselectedRows(new Set([...deselectedRows, id]));
    } else {
      selectedRows.add(id);
      setDeselectedRows(
        new Set([...deselectedRows].filter((rowId) => rowId !== id)),
      );
    }
    setSelectedRows(new Set(selectedRows));
  };

  const handleSearchChange = (searchTerm) => {
    setSearch(searchTerm);
    setCurrentPage(1);
    setSelectedRows(new Set());
    setDeselectedRows(new Set());
  };

  const handleStatusChange = (statusValue) => {
    setStatus(statusValue);
    setCurrentPage(1);
    setSelectedRows(new Set());
    setDeselectedRows(new Set());
  };

  const handleSelectAllPages = async () => {
    const res = await fetchDistributorAgreements(
      totalCount,
      0,
      status,
      search,
    );
    if (res.success) {
      const allIds = res.data.agreements.dbResponse.map(
        (item) => item.distributor_id,
      );
      if (allIds.every((id) => selectedRows.has(id))) {
        allIds.forEach((id) => {
          selectedRows.delete(id);
          setDeselectedRows(new Set([...deselectedRows, id]));
        });
      } else {
        allIds.forEach((id) => {
          selectedRows.add(id);
          setDeselectedRows(
            new Set(
              [...deselectedRows].filter((rowId) => rowId !== id),
            ),
          );
        });
      }
      setSelectedRows(new Set(selectedRows));
    }
  };

  useEffect(() => {
    const updateExportedList = async () => {
      const selectedIds = Array.from(selectedRows);

      const res = await fetchDistributorAgreements(
        totalCount,
        0,
        status,
        search,
      );

      if (res.success) {
        const allData = res.data.agreements.dbResponse;
        const filteredData = allData.filter((item) =>
          selectedIds.includes(item.distributor_id),
        );
        setExportedList(filteredData);
      } else {
        console.error('Fetch was not successful.');
      }
    };

    updateExportedList();
  }, [selectedRows, totalCount, status, search]);

  const onCheckReset = () => {
    setExportedList([]);
  };

  const handleDownload = () => {
    onCheckReset();
    setSelectedRows(new Set());
    setDeselectedRows(new Set());
  };

  const onChangePage = (page, itemsPerPage) => {
    setLimit(itemsPerPage);
    setOffset((page - 1) * limit);
    setCurrentPage(page);
  };

  return (
    <div className="admin-dashboard-wrapper">
      <div className="admin-dashboard-block">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h1 className="table-heading">
            Distributor NOC Status Report
          </h1>
          <div className="sdr-dashboard-search">
            <Input
              type="text"
              className="search-fld"
              placeholder="Search by Distributor ID/ Name/ City"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="select-ant-selecting">
            <Select
              showSearch
              className="custom-ant-selecting width120px"
              placeholder="Select status"
              value={status}
              onChange={(value) => handleStatusChange(value)}
            >
              <Option value="ALL">All</Option>
              <Option value="AGREED">Agreed</Option>
              <Option value="DISAGREED">Disagreed</Option>
            </Select>
          </div>
        </div>
        <div className="admin-dashboard-table">
          <table>
            <thead>
              <tr>
                <th>
                  <Checkbox
                    type="checkbox"
                    checked={
                      totalCount > 0 &&
                      Array.from(selectedRows).length === totalCount
                    }
                    onChange={handleSelectAllPages}
                  />
                </th>
                <th>Distributor ID</th>
                <th>Distributor Name</th>
                <th>City</th>
                <th>TSE Code</th>
                <th>Area Code</th>
                <th>Consent Status</th>
                <th>Response Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.distributor_id}>
                  <td>
                    <Checkbox
                      type="checkbox"
                      style={{ padding: '0 0 60px 0 ' }}
                      checked={selectedRows.has(item.distributor_id)}
                      onChange={() =>
                        handleCheckboxChange(item.distributor_id)
                      }
                    />
                  </td>
                  <td>{item.distributor_id}</td>
                  <td>{item.distributor_name}</td>
                  <td>{item.city}</td>
                  <td>{item.tse_code}</td>
                  <td>{item.area_code}</td>
                  <td>{item.agreement_status}</td>
                  <td>
                    {`${Util.formatDate(
                      item.created_at,
                    )} ${Util.formatTime(item.created_at)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Panigantion
          data={data ? data : []}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          itemsCount={data && totalCount}
          setModifiedData={onChangePage}
          pageNo={currentPage}
        />
        <div
          className="btn-download"
          style={{ width: '100%', margin: '10px 0' }}
        >
          {exportedList && exportedList.length <= 0 ? (
            <button disabled>Download</button>
          ) : (
            <ExportToExcel
              data={exportedList}
              onCancel={onCheckReset}
              onDownload={handleDownload}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  fetchDistributorAgreements: (limit, offset, status, search) =>
    dispatch(
      AuthAction.fetchDistributorAgreements(
        limit,
        offset,
        status,
        search,
      ),
    ),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(FinanceController);
