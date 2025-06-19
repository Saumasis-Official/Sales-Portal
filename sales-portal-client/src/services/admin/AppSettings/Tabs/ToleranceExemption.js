import React, { useState, useEffect } from 'react';
import { Select, Tooltip, Input, Popover } from 'antd';
import { connect } from 'react-redux';
import {
  DeleteOutlined,
  SyncOutlined,
  SearchOutlined,
  HistoryOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import _ from 'lodash';
import * as Actions from '../../actions/adminAction';
import '../../../../style/admin/Dashboard.css';
import './ToleranceExemption.css';
import '../../Forecast/StockNormAudit.css';
import Util from '../../../../util/helper';
import {hasEditPermission,pages} from '../../../../persona/distributorHeader' 

let ToleranceExemption = (props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tableData, setTableData] = useState([]);
  const [disableAdd, setDisableAdd] = useState(false);
  const [deletedItems, setDeletedItems] = useState([]);
  const [skuCodes, setSkuCodes] = useState([]);
  const [selectedTab, setSelectedTab] = useState(
    'toleranceExemption',
  );

  const {
    pskuToleranceExclusions,
    getSKUCodes,
    updateToleranceExcludedPskus,
  } = props;

  const fetchData = async () => {
    try {
      const { data } = await pskuToleranceExclusions();
      if (data) {
        const filteredData = data.reduce((acc, item) => {
          if (!item.deleted) {
            acc.push({
              psku: item.psku,
              description: item.description,
              updated_by: item.updated_by,
              updated_on: item.updated_on,
              deleted: item.deleted,
            });
          }
          return acc;
        }, []);
        setTableData(filteredData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleReset = () => {
    fetchData();
    setSearchTerm('');
    setDeletedItems([]);
  };

  const handleDelete = (psku) => {
    const updatedData = [];
    let itemToDelete = null;
  
    for (const item of tableData) {
      if (item.psku === psku) {
        itemToDelete = item;
        if (!item.isNew) {
          updatedData.push({ ...item, deleted: true });
        }
      } else {
        updatedData.push(item);
      }
    }
  
    if (itemToDelete) {
      if (itemToDelete.isNew) {
        // Directly remove the item if it's newly added and not saved yet
        setTableData(updatedData);
      } else {
        // For existing items, mark as deleted and add to deletedItems for saving
        setDeletedItems((prevItems) => [
          ...prevItems,
          { ...itemToDelete, deleted: true },
        ]);
        setTableData(updatedData);
      }
    }
  };

  async function onSaveAllNewHandler() {
    const newData = tableData.filter((item) => item.isNew);
    const combinedData = [...newData, ...deletedItems].map(
      (item) => ({
        psku: item.psku,
        deleted: !!item.deleted,
      }),
    );

    if (combinedData.length === 0) {
      Util.notificationSender('Info', 'No changes to save.', true);
      return;
    }

    const save = await updateToleranceExcludedPskus({
      pskus: combinedData,
    });

    if (save.success) {
      Util.notificationSender('Success', save.message, true);
      fetchData();
      setSearchTerm('');
      setDeletedItems([]);
    } else {
      Util.notificationSender('Error', save.message, false);
    }
  }

  const onClickAddHandler = () => {
    const emptyRow = {
      psku: '',
      description: '',
      updated_by: '',
      updated_on: '',
      deleted: false,
      isNew: true,
    };

    tableData?.length
      ? setTableData([...tableData, emptyRow])
      : setTableData([emptyRow]);
  };

  useEffect(() => {
    const tableLength = tableData?.length;
    if (!tableData || tableLength <= 0) setDisableAdd(false);
    else if (
      tableData[tableLength - 1]?.psku &&
      tableData[tableLength - 1]?.description
    )
      setDisableAdd(false);
    else setDisableAdd(true);
  }, [tableData]);

  async function onSKUChangeHandler(value, id, type) {
    const res = await getSKUCodes();
    let selectedItem;

    if (type === 'code') {
      selectedItem = res.find((item) => item.code === value);
    } else if (type === 'description') {
      selectedItem = res.find((item) => item.description === value);
    }

    if (selectedItem) {
      const updatedRow = {
        ...tableData[id],
        psku: selectedItem.code,
        description: selectedItem.description,
      };
      let newData = [...tableData];
      newData[id] = updatedRow;
      setTableData(newData);
    }
  }
  useEffect(() => {
    if (selectedTab === 'toleranceExemption') {
      fetchSKUCodes();
    }
  }, [selectedTab]);

  async function fetchSKUCodes() {
    const res = await getSKUCodes();
    setSkuCodes(res);
  }

  const filteredSkuCodes = skuCodes.filter((item) => {
    return !tableData.some(
      (existingItem) =>
        existingItem.psku === item.code ||
        existingItem.description === item.description,
    );
  });

  const hasNewItems =
    tableData.some(
      (item) => item.isNew && item.psku && item.description,
    ) || deletedItems.length > 0;

  return (
    <>
      <div>
        <div className="n-card-h table-header-options tolerance-exemption">
          <Input
            className="search-input-tolerance"
            placeholder="Search by PSKU No. or Description"
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <Tooltip
            title="Reset to last saved state"
            placement="bottom"
          >
            <button className="reset-button" onClick={handleReset}>
              <SyncOutlined /> Reset
            </button>
          </Tooltip>
          <button
            className="save-all-button"
            onClick={() => onSaveAllNewHandler()}
            disabled={!(hasNewItems && hasEditPermission(pages.APP_SETTINGS,'EDIT'))}
          >
            <Tooltip title="Save" placement="bottom">
              <SaveOutlined /> Save
            </Tooltip>
          </button>
          <button
            className="addmore-button"
            onClick={onClickAddHandler}
            disabled={disableAdd}
          >
            {disableAdd ? (
              <Tooltip
                title="Add New Item Disabled"
                placement="bottom"
              >
                <img
                  src="/assets/images/add-order-disabled.svg"
                  alt="Add New Item"
                />
              </Tooltip>
            ) : (
              <Tooltip title="Add New Item" placement="bottom">
                <img
                  src="/assets/images/add-order.svg"
                  alt="Add New Item"
                />
              </Tooltip>
            )}
          </button>
        </div>

        <div className="admin-dashboard-table tolerance-exemption sn-table-container ">
          <table>
            <thead>
              <tr>
                <th className="width40">PSKU No.</th>
                <th className="width50">Description</th>
                <th className="width20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableData
                .filter(
                  (item) =>
                    item.psku
                      ?.toLowerCase()
                      .includes(searchTerm.toLowerCase()) ||
                    (item.description
                      ?.toLowerCase()
                      .includes(searchTerm.toLowerCase()) &&
                      !item.deleted),
                )
                .map((item, index) => (
                  <tr
                    key={index}
                    className={
                      item.isNew
                        ? 'change-color'
                        : item.deleted
                        ? 'deleted-row'
                        : ''
                    }
                  >
                    <td>
                      {item.psku ? (
                        <span>{item.psku}</span>
                      ) : (
                        <Select
                          style={{ width: '100%' }}
                          showSearch
                          autoFocus
                          placeholder="Select a PSKU Code"
                          optionFilterProp="children"
                          onChange={(value) => {
                            onSKUChangeHandler(value, index, 'code');
                          }}
                          filterOption={(input, option) =>
                            option.label
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          options={_.sortBy(filteredSkuCodes, [
                            'code',
                          ])?.map((item) => ({
                            label: item.code,
                            value: item.code,
                          }))}
                        />
                      )}
                    </td>
                    <td>
                      {item.description ? (
                        <span>{item.description}</span>
                      ) : (
                        <Select
                          style={{ width: '100%' }}
                          showSearch
                          placeholder="Select a PSKU Description"
                          optionFilterProp="children"
                          onChange={(value) => {
                            onSKUChangeHandler(
                              value,
                              index,
                              'description',
                            );
                          }}
                          filterOption={(input, option) =>
                            option.label
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          options={_.sortBy(filteredSkuCodes, [
                            'description',
                          ])?.map((item) => ({
                            label: item.description,
                            value: item.description,
                          }))}
                        />
                      )}
                    </td>
                    <td className="width20">
                      {!item.deleted && (
                        <>
                          <i className="info-icon tolerance-exemption">
                            <Tooltip
                              placement="bottom"
                              title="Delete"
                            >
                              <DeleteOutlined
                                onClick={() =>
                                  handleDelete(item.psku)
                                }
                              />
                            </Tooltip>
                          </i>
                          {item.updated_by && item.updated_on && (
                            <Popover
                              content={
                                <div className="tolerance-time-details">
                                  <p>
                                    <b>
                                      <i>Last Updated by:</i>
                                    </b>{' '}
                                    {item.updated_by}
                                  </p>
                                  <p>
                                    <b>
                                      <i>Last Updated on:</i>
                                    </b>{' '}
                                    {Util.formatDate(item.updated_on)}{' '}
                                    {Util.formatTime(item.updated_on)}
                                  </p>
                                </div>
                              }
                              title=""
                              trigger="hover"
                              placement="leftBottom"
                            >
                              <HistoryOutlined className="history-info-icon" />
                            </Popover>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {};
};

const mapDispatchToProps = (dispatch) => {
  return {
    getSKUCodes: () => dispatch(Actions.getSKUCodes()),
    pskuToleranceExclusions: () =>
      dispatch(Actions.getPskuToleranceExclusions()),
    updateToleranceExcludedPskus: (payload) =>
      dispatch(Actions.postToleranceExcludedPskus(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ToleranceExemption);
