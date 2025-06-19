//-----------------------------------------------------=====Props and Constants====--------------------------------------------
//-----------------------------------------------------=====useState====-------------------------------------------------------
//-----------------------------------------------------=====useRef====---------------------------------------------------------
//-----------------------------------------------------=====useEffect====------------------------------------------------------
//-----------------------------------------------------=====Event Handlers=====------------------------------------------------
//-----------------------------------------------------=====API Calls=====-----------------------------------------------------
// ----------------------------------------------------=====Helpers=====-------------------------------------------------------
// ----------------------------------------------------=====Renders=====-------------------------------------------------------

import React, { useEffect, useState, useRef } from 'react';
import { notification, Radio, Tooltip } from 'antd';
import { connect } from 'react-redux';
import {
  fetchAutoClosureGT,
  multiUpdateGTAutoClosure,
  updateAutoClosureGT,
} from '../actions/adminAction';
import {
  features,
  hasViewPermission,
  pages,
} from '../../../persona/distributorHeader';
import Panigantion from '../../../components/Panigantion';
import './GTAutoClosureSetting.css';
import {
  NO_DATA_SYMBOL,
  CUSTOMER_GROUPS_FOR_ARS,
} from '../../../constants';
import LocalAuth from '../../../util/middleware/auth';
import _ from 'lodash';

const GTAutoClosureSettings = ({
  fetchAutoClosureGT,
  updateAutoClosureGT,
  multiUpdateGTAutoClosure,
}) => {
  //-----------------------------------------------------=====Props and Constants====--------------------------------------------
  // Check if the user has permission to view this page
  const hasPermission = hasViewPermission(
    pages.AUTO_CLOSURE,
    features.EDIT_GT_AUTO_CLOSURE,
  );
  const adminRole = LocalAuth.getAdminRole();
  const orderTypeMapping = {
    DBO: 'NORMAL',
    AOR: 'ARS',
    LIQ: 'LIQUIDATION',
    RO: 'RUSH',
    BO: 'BULK',
    SFL: 'SELF_LIFTING',
    CCO: 'CALL_CENTER',
    SAP_REG: 'SAP_REG',
    SAP_LIQ: 'SAP_LIQ',
  };

  //-----------------------------------------------------=====useState====-------------------------------------------------------
  const [isEditing, setIsEditing] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [orderType, setOrderType] = useState('DBO');
  const [totalItems, setTotalItems] = useState(0);
  const [headerShortClose, setHeaderShortClose] = useState();
  const [headerRemarks, setHeaderRemarks] = useState('');

  //-----------------------------------------------------=====useRef====---------------------------------------------------------
  const modifiedDataRef = useRef({});

  //-----------------------------------------------------=====useEffect====------------------------------------------------------
  const fetchData = async () => {
    const payload = {
      order_type: orderTypeMapping[orderType],
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
    };

    try {
      // ----------------------------------------------------=====API Calls=====-----------------------------------------------------

      const response = await fetchAutoClosureGT(payload);
      if (response && response.data) {
        let responseData = response.data.data;
        if (orderTypeMapping[orderType] === 'ARS') {
          responseData = responseData.filter((i) =>
            CUSTOMER_GROUPS_FOR_ARS.includes(i.customer_group),
          );
          setTotalItems(responseData.length);
        } else {
          setTotalItems(response.data.total);
        }
        setTableData(
          responseData.map((item) => ({
            ...item,
            remarks:
              modifiedDataRef.current[item.id]?.remarks ||
              item.remarks,
            short_close:
              modifiedDataRef.current[item.id]?.short_close ||
              item.short_close,
          })),
        );
        setOriginalData(responseData);
      } else {
        notification.error({
          message: 'Error Occurred',
          description: response?.data?.message
            ? response.data.message
            : 'Some error occurred while fetching data',
          duration: 5,
          className: 'notification-error',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Technical Error',
        description: 'Some error occurred while fetching data',
        duration: 5,
        className: 'notification-error',
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [orderType, currentPage, itemsPerPage]);

  //-----------------------------------------------------=====Event Handlers=====------------------------------------------------
  const handleEditClick = () => {
    setIsEditing(!isEditing);

    if (isEditing) {
      modifiedDataRef.current = {};
      setTableData(originalData);
    } else {
      setHeaderRemarks('');
      setHeaderShortClose('');
    }
  };

  const handleSaveClick = async () => {
    if (headerShortClose || headerRemarks) {
      if (headerRemarks.trim().length < 5) {
        notification.error({
          message: 'Error',
          description: 'Remarks must be at least 5 characters long.',
          duration: 5,
          className: 'notification-error',
        });
        return;
      }
      const multiUpdatePayload = {
        order_type: orderTypeMapping[orderType],
        short_close: headerShortClose !=='' ? +headerShortClose : null,
        remarks: headerRemarks,
      };

      try {
        const multiUpdateRes = await multiUpdateGTAutoClosure(
          multiUpdatePayload,
        );
        if (multiUpdateRes?.success) {
          notification.success({
            message: 'Success',
            description: 'Auto closure Multi updated successfully',
            duration: 2,
            className: 'notification-green',
          });
          setIsEditing(false);
          modifiedDataRef.current = {};
          fetchData();
          return;
        }
      } catch (error) {
        notification.error({
          message: 'Technical Error',
          description: 'Some error occurred while updating settings',
          duration: 5,
          className: 'notification-error',
        });
        return;
      }
      return;
    }

    const invalidRow = Object.entries(modifiedDataRef.current).some(
      ([id, updatedItem]) => {
        const remarks = updatedItem.remarks;
        return !remarks || remarks.trim().length < 5;
      },
    );

    if (invalidRow) {
      notification.error({
        message: 'Error',
        description:
          'Please provide valid remarks for all modified rows (minimum 5 characters).',
        duration: 5,
        className: 'notification-error',
      });
      return;
    }

    const updatedData = [];

    Object.entries(modifiedDataRef.current).forEach(
      ([id, modifiedItem]) => {
        const originalItem = originalData.find(
          (data) => data.id === id,
        );

        const shortCloseValue =
          modifiedItem.short_close === ''
            ? null
            : modifiedItem.short_close;

        if (
          !originalItem ||
          modifiedItem.remarks !== originalItem.remarks ||
          shortCloseValue !== originalItem.short_close
        ) {
          updatedData.push({
            id,
            short_close: shortCloseValue !== null ? +shortCloseValue : null,
            remarks: modifiedItem.remarks,
          });
        }
      },
    );

    if (updatedData.length === 0) {
      notification.info({
        message: 'No Changes Detected',
        description: 'No remarks have been updated.',
        duration: 5,
        className: 'notification-info',
      });
      return;
    }

    const payload = {
      updated_data: updatedData,
    };
    try {
      const res = await updateAutoClosureGT(payload);
      if (res?.success) {
        notification.success({
          message: 'Success',
          description: 'Auto closure settings updated successfully',
          duration: 2,
          className: 'notification-green',
        });
        modifiedDataRef.current = {};
        setOriginalData(tableData);
        setIsEditing(false);
        fetchData();
      } else {
        notification.error({
          message: 'Error Occurred',
          description: res?.data?.message
            ? res.data.message
            : 'Some error occurred while updating settings',
          duration: 5,
          className: 'notification-error',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Technical Error',
        description: 'Some error occurred while updating settings',
        duration: 5,
        className: 'notification-error',
      });
    }
  };

  //-----------------------------------------------------=====Helpers=====-------------------------------------------------------
  const handleChange = (e, index, field) => {
    let newValue = e.target.value;
    // Remove leading zeros
    if (field === 'short_close') {
      newValue = newValue.replace(/^0+(?=\d)/, '');
    }
    setTableData((prevData) =>
      prevData.map((item, i) =>
        i === index ? { ...item, [field]: newValue } : item,
      ),
    );

    modifiedDataRef.current[tableData[index].id] = {
      ...modifiedDataRef.current[tableData[index].id],
      [field]: newValue,
    };
  };

  const onChangePage = (page, itemsPerPage) => {
    setCurrentPage(page);
    setItemsPerPage(itemsPerPage);
  };

  const handleHeaderChange = (e, field) => {
    let newValue = e.target.value;
    if (field === 'short_close') {
      newValue = newValue.replace(/^0+(?=\d)/, '');
      setHeaderShortClose(newValue);
    } else if (field === 'remarks') {
      setHeaderRemarks(newValue);
    }
  };

  //-----------------------------------------------------=====Renders=====-------------------------------------------------------
  if (!hasPermission) {
    return null;
  }

  return (
    <div>
      {_.isEmpty(_.intersection(adminRole, ['SUPPORT', 'PORTAL_OPERATIONS'])) && (
        <div className="btn-wrapper" style={{ marginTop: '-40px' }}>
          <button type="button" onClick={handleEditClick}>
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={
              !isEditing ||
              (Object.keys(modifiedDataRef.current).length === 0 &&
                !headerShortClose &&
                !headerRemarks)
            }
          >
            Save
          </button>
        </div>
      )}
      <div className="order-type-container">
        <h3 className="order-type-label">Order Type:</h3>
        <Radio.Group
          value={orderType}
          onChange={(e) => {
            setOrderType(e.target.value);
            setCurrentPage(1);
          }}
          buttonStyle="solid"
        >
          <Radio value="DBO">DBO</Radio>
          <Radio value="AOR">AOR</Radio>
          <Radio value="LIQ">LIQ</Radio>
          <Radio value="RO">RO</Radio>
          <Radio value="BO">BO</Radio>
          <Radio value="SFL">SFL</Radio>
          <Radio value="CCO">CCO</Radio>
          <Radio value="SAP_REG">SAP Direct Orders Regular</Radio>
          <Radio value="SAP_LIQ">SAP Direct Orders Liquidation</Radio>
        </Radio.Group>
      </div>
      <div className="admin-dashboard-table unique-table">
        <table>
          <thead>
            <tr>
              <th>Customer Group</th>
              <th>
                {isEditing ? (
                  <input
                    type="number"
                    value={headerShortClose}
                    className="value-auto-closure"
                    placeholder='Short Close Value(in days)'
                    style={{ width: '168px' }}
                    onChange={(e) =>
                      handleHeaderChange(e, 'short_close')
                    }
                    onWheel={(e) => e.target.blur()}
                    onKeyPress={(e) => {
                      const regex = /^[0-9]*$/;
                      if (!regex.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                ) : (
                  'Short Close Period (in days)'
                )}
              </th>
              <th>Last updated by</th>
              <th className="remarks-value">
                {isEditing ? (
                  <textarea
                    value={headerRemarks}
                    onChange={(e) => handleHeaderChange(e, 'remarks')}
                    placeholder="Enter remarks (minimum 5 characters)"
                  />
                ) : (
                  'Remarks'
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((item, index) => (
              <tr key={index}>
                <td>
                  {item.customer_group &&
                  item.customer_group_description
                    ? `${item.customer_group} - ${item.customer_group_description}`
                    : ''}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      value={item.short_close || ''}
                      className="value-auto-closure"
                      onChange={(e) =>
                        handleChange(e, index, 'short_close')
                      }
                      min="0"
                      step="1"
                      onWheel={(e) => e.target.blur()}
                      onKeyPress={(e) => {
                        const regex = /^[0-9]*$/;
                        if (!regex.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                    />
                  ) : item.short_close !== undefined &&
                    item.short_close !== null ? (
                    item.short_close
                  ) : (
                    NO_DATA_SYMBOL
                  )}
                </td>
                <td>
                  {item.first_name &&
                  item.last_name &&
                  item.user_id ? (
                    <Tooltip
                      placement="top"
                      title={`${item.first_name} ${item.last_name} ${item.user_id}`}
                    >
                      {`${item.first_name} ${item.last_name} ${item.user_id}`}
                    </Tooltip>
                  ) : (
                    'PORTAL_MANAGED'
                  )}
                </td>
                <td className="remarks-value">
                  {isEditing ? (
                    <textarea
                      placeholder="Please enter your remarks (minimum 5 characters)"
                      value={
                        modifiedDataRef.current[item.id]?.remarks ||
                        ''
                      }
                      onChange={(e) =>
                        handleChange(e, index, 'remarks')
                      }
                      disabled={!modifiedDataRef.current[item.id]}
                    />
                  ) : !item.remarks ||
                    item.remarks.trim().length === 0 ? (
                    NO_DATA_SYMBOL
                  ) : (
                    <Tooltip placement="left" title={item.remarks}>
                      {item.remarks}
                    </Tooltip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Panigantion
        data={tableData}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        itemsCount={totalItems}
        setModifiedData={onChangePage}
        pageNo={currentPage}
      />
    </div>
  );
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  fetchAutoClosureGT: (payload) =>
    dispatch(fetchAutoClosureGT(payload)),
  updateAutoClosureGT: (payload) =>
    dispatch(updateAutoClosureGT(payload)),
  multiUpdateGTAutoClosure: (payload) =>
    dispatch(multiUpdateGTAutoClosure(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(GTAutoClosureSettings);
