//-----------------------------------------------------=====Props and Constants====--------------------------------------------
//-----------------------------------------------------=====useState====-------------------------------------------------------
//-----------------------------------------------------=====useRef====---------------------------------------------------------
//-----------------------------------------------------=====useEffect====------------------------------------------------------
//-----------------------------------------------------=====Event Handlers=====------------------------------------------------
//-----------------------------------------------------=====API Calls=====-----------------------------------------------------
// ----------------------------------------------------=====Helpers=====-------------------------------------------------------
// ----------------------------------------------------=====Renders=====-------------------------------------------------------

import React, { useEffect, useState, useRef } from 'react';
import { notification, Tooltip } from 'antd';
import { connect } from 'react-redux';
import {
  features,
  hasViewPermission,
  pages,
} from '../../../persona/distributorHeader';
import Panigantion from '../../../components/Panigantion';
import './GTAutoClosureSetting.css';
import { NO_DATA_SYMBOL } from '../../../constants';
import LocalAuth from '../../../util/middleware/auth';
import {
  InfoCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import HeaderSearchBox from '../../../components/HeaderSearchBox/HeaderSearchBox';
import {
  fetchAutoClosureMTEcomSingleGrn,
  fetchMultiGrnData,
  multiUpdateMTEcom,
  updateMultiGrnAutoClosure,
  updateSingleGrnAutoClosure,
} from '../actions/adminAction';
import EcomAutoCLosureDetails from './EcomAutoCLosureDetails';
import EcomMultiGrnCustomerDetails from './EcomMultiGrnCustomerDetails';
import { debounce } from 'lodash';
import _ from 'lodash';
import { CUSTOMER_GROUPS } from '../../../config/constant';
import './EcomAutoClosureSetting.css';

const EcomAutoClosureSettings = ({
  fetchAutoClosureMTEcomSingleGrn,
  updateSingleGrn,
  fetchMultiGrnData,
  updateMultiGrnAutoClosure,
  multiUpdateMTEcom,
}) => {
  //-----------------------------------------------------=====Props and Constants====--------------------------------------------
  const hasPermission = hasViewPermission(
    pages.AUTO_CLOSURE,
    features.EDIT_Ecom_AUTO_CLOSURE,
  );
  const adminRole = LocalAuth.getAdminRole();

  //-----------------------------------------------------=====useState====-------------------------------------------------------
  const [isEditing, setIsEditing] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] =
    useState(false);
  const [multiGrnData, setMultiGrnData] = useState([]);
  const [multiGrnIds, setMultiGrnIds] = useState([]);
  const [enableSearch, setEnableSearch] = useState({
    singleGrnCode: false,
  });
  const [headerFilter, setHeaderFilter] = useState({
    singleGrnCode: '',
  });
  const [multiGrnOriginalData, setMultiGrnOriginalData] = useState(
    [],
  );
  const [isRemarksEnabled, setIsRemarksEnabled] = useState(false);
  const [headerShortClose, setHeaderShortClose] = useState();
  const [headerPoValidity, setHeaderPoValiodity] = useState();
  const [headerRemarks, setHeaderRemarks] = useState('');

  //-----------------------------------------------------=====useRef====---------------------------------------------------------
  const modifiedDataRef = useRef({});
  //-----------------------------------------------------=====useEffect====------------------------------------------------------
  // Fetch data for the first table (single GRNs)
  const fetchData = async () => {
    const payload = {
      customer_group: CUSTOMER_GROUPS.E_COMMERCE,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
      search: headerFilter.singleGrnCode
        ? headerFilter.singleGrnCode
        : null,
    };

    try {
      const singleGrnResponse = await fetchAutoClosureMTEcomSingleGrn(
        payload,
      );

      if (singleGrnResponse && singleGrnResponse.success) {
        setTableData(
          singleGrnResponse.data.data.map((item) => ({
            ...item,
            remarks:
              modifiedDataRef.current[item.id]?.remarks ||
              item.remarks,
            po_validity:
              modifiedDataRef.current[item.id]?.po_validity ||
              item.po_validity,
            short_close:
              modifiedDataRef.current[item.id]?.short_close ||
              item.short_close,
          })),
        );
        setOriginalData(singleGrnResponse.data.data);
        setTotalItems(singleGrnResponse.data.total);
      } else {
        setTableData([]);
        notification.error({
          message: 'Error Occurred',
          description: singleGrnResponse?.message
            ? singleGrnResponse.message
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

  // Call fetchData inside the useEffect
  useEffect(() => {
    fetchData();
  }, [
    currentPage,
    itemsPerPage,
    headerFilter.singleGrnCode,
    fetchAutoClosureMTEcomSingleGrn,
  ]);

  const fetchMultiGrnDataFunc = async () => {
    try {
      const multiGrnResponse = await fetchMultiGrnData({
        customer_group: CUSTOMER_GROUPS.E_COMMERCE,
      });

      if (multiGrnResponse && multiGrnResponse.success) {
        setMultiGrnData(multiGrnResponse.data);
        setMultiGrnOriginalData(multiGrnResponse.data);
        setMultiGrnIds(multiGrnResponse.data[0].ids);
      } else {
        notification.error({
          message: 'Error Occurred',
          description: multiGrnResponse?.message
            ? multiGrnResponse.message
            : 'Some error occurred while fetching multi GRN data',
          duration: 5,
          className: 'notification-error',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Technical Error',
        description:
          'Some error occurred while fetching multi GRN data',
        duration: 5,
        className: 'notification-error',
      });
    }
  };

  // Call fetchMultiGrnDataFunc inside the useEffect
  useEffect(() => {
    fetchMultiGrnDataFunc();
  }, [fetchMultiGrnData]);

  const handleHeaderChange = (e, field) => {
    let newValue = e.target.value;
    if (field === 'short_close') {
      newValue = newValue.replace(/^0+(?=\d)/, '');
      setHeaderShortClose(newValue);
    } else if (field === 'po_validity') {
      newValue = newValue.replace(/^0+(?=\d)/, '');
      setHeaderPoValiodity(newValue);
    } else if (field === 'remarks') {
      setHeaderRemarks(newValue);
    }
  };

  //-----------------------------------------------------=====Event Handlers=====------------------------------------------------
  const handleEditClick = () => {
    setIsEditing(!isEditing);

    if (isEditing) {
      modifiedDataRef.current = {};
      setTableData(originalData);
      setMultiGrnData(multiGrnOriginalData);
      setIsRemarksEnabled(false);
    } else {
      setMultiGrnData((prevData) =>
        prevData.map((item) => ({ ...item, remarks: '' })),
      );
      setIsRemarksEnabled(false);
      setHeaderShortClose('');
      setHeaderPoValiodity('');
      setHeaderRemarks('');
    }
  };

  const showNotification = (type, message, description) => {
    notification[type]({
      message,
      description,
      duration: 5,
      className: `notification-${
        type === 'error' ? 'error' : 'green'
      }`,
    });
  };

  const isInvalidRemarks = (remarks) =>
    !remarks || remarks.trim().length < 5;

  const checkInvalidRemarks = () => {
    const invalidSingleGrnRemarks = Object.values(
      modifiedDataRef.current,
    ).some(({ remarks }) => isInvalidRemarks(remarks));
    const invalidMultiGrnRemarks = multiGrnData.some(
      ({ remarks }) => remarks && isInvalidRemarks(remarks),
    );
    const multiGrnModified = multiGrnData.some(
      ({ po_validity, remarks }) =>
        po_validity !== null || remarks !== null,
    );

    if (invalidSingleGrnRemarks) {
      showNotification(
        'error',
        'Error',
        'Please provide valid remarks for all modified rows in Single GRN (minimum 5 characters).',
      );
      return true;
    }

    if (multiGrnModified && invalidMultiGrnRemarks) {
      showNotification(
        'error',
        'Error',
        'Please provide valid remarks for multi-GRN (minimum 5 characters) if remarks are entered.',
      );
      return true;
    }

    if (
      multiGrnModified &&
      multiGrnData.some(({ remarks }) => !remarks) &&
      isRemarksEnabled
    ) {
      showNotification(
        'error',
        'Error',
        'Please provide remarks for all modified rows in Multi GRN.',
      );
      return true;
    }

    return false;
  };

  const handleSaveClick = async () => {
    if (checkInvalidRemarks()) {
      setIsEditing(true);
      return;
    }

    if (headerShortClose || headerPoValidity || headerRemarks) {
      if (isInvalidRemarks(headerRemarks)) {
        showNotification(
          'error',
          'Error',
          'Remarks must be at least 5 characters long.',
        );
        setIsEditing(true);
        return;
      }

      const multiUpdatePayload = {
        customer_type: 'SINGLE_GRN',
        customer_group: CUSTOMER_GROUPS.E_COMMERCE,
        short_close:
          headerShortClose === '' ? null : +headerShortClose,
        po_validity:
          headerPoValidity === '' ? null : +headerPoValidity,
        remarks: headerRemarks,
      };

      try {
        const multiUpdateRes = await multiUpdateMTEcom(
          multiUpdatePayload,
        );
        if (multiUpdateRes?.success) {
          showNotification(
            'success',
            'Success',
            'Single GRN Multi updated successfully',
          );
          setIsEditing(false);
          modifiedDataRef.current = {};
          fetchData();
          fetchMultiGrnDataFunc();
        } else {
          showNotification(
            'error',
            'Error Occurred',
            multiUpdateRes?.message ||
              'Some error occurred while updating settings',
          );
          setIsEditing(true);
        }
      } catch (error) {
        showNotification(
          'error',
          'Technical Error',
          'Some error occurred while updating settings',
        );
        setIsEditing(true);
      }
    }

    const updatedData = Object.entries(
      modifiedDataRef.current,
    ).reduce((acc, [id, modifiedItem]) => {
      const originalItem = originalData.find(
        (data) => data.id === id,
      );
      const poValidityValue =
        modifiedItem.po_validity === ''
          ? null
          : modifiedItem.po_validity;
      const shortCloseValue =
        modifiedItem.short_close === ''
          ? null
          : modifiedItem.short_close;

      if (
        !originalItem ||
        modifiedItem.remarks !== originalItem.remarks ||
        poValidityValue !== originalItem.po_validity ||
        shortCloseValue !== originalItem.short_close
      ) {
        acc.push({
          id,
          short_close:
            shortCloseValue === null ? null : +shortCloseValue,
          po_validity:
            poValidityValue === null ? null : +poValidityValue,
          remarks: modifiedItem.remarks,
        });
      }
      return acc;
    }, []);

    if (updatedData.length > 0) {
      const payload = { updated_data: updatedData };

      try {
        const res = await updateSingleGrn(payload);
        if (res?.success) {
          showNotification(
            'success',
            'Success',
            'Single GRN auto closure settings updated successfully',
          );
          modifiedDataRef.current = {};
          setOriginalData(tableData);
          setIsEditing(false);
          fetchData();
        } else {
          showNotification(
            'error',
            'Error Occurred',
            res?.data?.message ||
              'Some error occurred while updating settings',
          );
          setIsEditing(true);
        }
      } catch (error) {
        showNotification(
          'error',
          'Technical Error',
          'Some error occurred while updating settings',
        );
        setIsEditing(true);
      }
    }

    if (
      isEditing &&
      multiGrnData.some(
        ({ remarks }) => remarks && remarks.trim().length >= 5,
      )
    ) {
      const multiGrnPayload = {
        ids: multiGrnIds,
        short_close:
          multiGrnData[0].short_close === ''
            ? null
            :  parseInt(multiGrnData[0].short_close, 10),
        po_validity:
          multiGrnData[0].po_validity === ''
            ? null
            : parseInt(multiGrnData[0].po_validity, 10),
        remarks: multiGrnData[0].remarks,
      };

      try {
        const multiGrnRes = await updateMultiGrnAutoClosure(
          multiGrnPayload,
        );
        if (multiGrnRes?.success) {
          showNotification(
            'success',
            'Success',
            'Multi GRN auto closure settings updated successfully',
          );
          setMultiGrnOriginalData(multiGrnData);
          setIsEditing(false);
          setIsRemarksEnabled(false);
          fetchMultiGrnDataFunc();
        } else {
          showNotification(
            'error',
            'Error Occurred',
            multiGrnRes?.data?.message ||
              'Some error occurred while updating multi GRN settings',
          );
          setIsEditing(true);
        }
      } catch (error) {
        showNotification(
          'error',
          'Technical Error',
          'Some error occurred while updating multi GRN settings',
        );
        setIsEditing(true);
      }
    }
  };

  //-----------------------------------------------------=====Helpers=====-------------------------------------------------------
  const handleIconClick = (data) => {
    setModalData(data);
    setIsModalVisible(true);
  };

  const hideModal = () => {
    setIsModalVisible(false);
    setModalData(null);
  };

  const hideDetailsModal = () => {
    setIsDetailsModalVisible(false);
  };

  const handleDetailsIconClick = () => {
    setIsDetailsModalVisible(true);
  };

  const handleChange = (e, index, field, isMultiGrn = false) => {
    let newValue = e.target.value;
    if (field === 'po_validity' || field === 'short_close') {
      newValue = newValue.replace(/^0+(?=\d)/, '');
    }
    const secondaryField =
      field === 'po_validity' ? 'short_close' : 'po_validity';

    if (isMultiGrn) {
      setMultiGrnData((prevData) =>
        prevData.map((item, i) =>
          i === index ? { ...item, [field]: newValue } : item,
        ),
      );

      if (field === 'po_validity' || field === 'short_close') {
        setIsRemarksEnabled(true);
      }
    } else {
      const secondaryFieldValue = tableData[index][secondaryField];
      setTableData((prevData) =>
        prevData.map((item, i) =>
          i === index ? { ...item, [field]: newValue } : item,
        ),
      );

      modifiedDataRef.current[tableData[index].id] = {
        ...modifiedDataRef.current[tableData[index].id],
        [field]: newValue,
        [secondaryField]: secondaryFieldValue,
      };
    }
  };

  const onChangePage = (page, itemsPerPage) => {
    setCurrentPage(page);
    setItemsPerPage(itemsPerPage);
  };

  const onFilterChange = (e, propsKey) => {
    let value = e.target.value;
    setCurrentPage(1);
    const temp = { ...headerFilter, [propsKey]: value };
    debouncedFilter(_.cloneDeep(temp));
  };

  const debouncedFilter = useRef(
    debounce((nextValue) => setHeaderFilter(nextValue), 400),
  ).current;

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
                multiGrnData.every(
                  (item) =>
                    !item.remarks || item.remarks.trim().length === 0,
                ) &&
                !headerShortClose &&
                !headerPoValidity &&
                !headerRemarks)
            }
          >
            Save
          </button>
        </div>
      )}

      <div className="admin-dashboard-table">
        <table>
          <thead>
            <tr>
              <th>
                {enableSearch.singleGrnCode ? (
                  <HeaderSearchBox
                    onClose={() => {
                      setEnableSearch({
                        ...enableSearch,
                        singleGrnCode: false,
                      });
                      setHeaderFilter({
                        ...headerFilter,
                        singleGrnCode: '',
                      });
                    }}
                    onFilterChange={onFilterChange}
                    propKey={'singleGrnCode'}
                  />
                ) : (
                  <>
                    Single GRN Payer Code{' '}
                    <SearchOutlined
                      onClick={() => {
                        setEnableSearch({
                          ...enableSearch,
                          singleGrnCode: true,
                        });
                      }}
                    />
                  </>
                )}
              </th>
              <th>
                {isEditing ? (
                  <input
                    type="number"
                    value={headerShortClose}
                    className="value-auto-closure"
                    placeholder="Short Close Value(in hrs)"
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
                  'Short Close Period (in hours)'
                )}
              </th>
              <th>
                {isEditing ? (
                  <input
                    type="number"
                    value={headerPoValidity}
                    className="value-auto-closure"
                    placeholder="PO Validity Value(in days)"
                    onChange={(e) =>
                      handleHeaderChange(e, 'po_validity')
                    }
                    style={{ width: '168px' }}
                    onWheel={(e) => e.target.blur()}
                    onKeyPress={(e) => {
                      const regex = /^[0-9]*$/;
                      if (!regex.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                ) : (
                  'PO Validity Period (in days)'
                )}
              </th>
              <th>Last Updated By</th>
              <th className="remarks-value-auto-closure">
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
              <th className="width6">Details</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
                  style={{
                    textAlign: 'center',
                    fontFamily: 'MyriadPro-Semibold, sans-serif',
                    fontSize: '20px',
                  }}
                >
                  No Data Available
                </td>
              </tr>
            ) : (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td>
                    {item.single_grn_code
                      ? `${item.single_grn_code}`
                      : NO_DATA_SYMBOL}
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
                    {isEditing ? (
                      <input
                        type="number"
                        value={item.po_validity || ''}
                        className="value-auto-closure"
                        onChange={(e) =>
                          handleChange(e, index, 'po_validity')
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
                    ) : item.po_validity !== undefined &&
                      item.po_validity !== null ? (
                      item.po_validity
                    ) : (
                      NO_DATA_SYMBOL
                    )}
                  </td>
                  <td>
                    {item.first_name &&
                    item.last_name &&
                    item.updated_by ? (
                      <Tooltip
                        placement="top"
                        title={`${item.first_name || ''} ${
                          item.last_name || ''
                        } (${item.updated_by || ''})`}
                      >
                        {`${item.first_name || ''} ${
                          item.last_name || ''
                        } (${item.updated_by || ''})`}
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
                  <td className="width6">
                    <i
                      className="info-icon"
                      onClick={() => handleIconClick(item)}
                    >
                      <Tooltip placement="bottom" title="Info">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </i>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <Panigantion
          data={tableData}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          itemsCount={totalItems}
          setModifiedData={onChangePage}
          pageNo={currentPage}
        />
      </div>
      <div className="admin-dashboard-table">
        <table>
          <thead>
            <tr>
              <th>Multi GRN</th>
              <th>
                Short Close Period (in hours)
              </th>
              <th>
                PO Validity Period (in days)
              </th>
              <th>Last Updated By</th>
              <th>Remarks</th>
              <th className="width6">Details</th>
            </tr>
          </thead>
          <tbody>
            {multiGrnData.map((item, index) => (
              <tr key={index}>
                <td >All Multi GRN Payer Codes</td>
                <td >
                  {isEditing ? (
                    <input
                      type="number"
                      value={multiGrnData[0].short_close || ''}
                      className="value-auto-closure"
                      onChange={(e) =>
                        handleChange(e, 0, 'short_close', true)
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
                  ) : (
                    multiGrnData[0].short_close || NO_DATA_SYMBOL
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      value={multiGrnData[0].po_validity || ''}
                      className="value-auto-closure"
                      onChange={(e) =>
                        handleChange(e, 0, 'po_validity', true)
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
                  ) : (
                    multiGrnData[0].po_validity || NO_DATA_SYMBOL
                  )}
                </td>
                <td>
                  {multiGrnData[0].first_name &&
                  multiGrnData[0].last_name &&
                  multiGrnData[0].updated_by ? (
                    <Tooltip
                      placement="top"
                      title={`${multiGrnData[0].first_name || ''} ${
                        multiGrnData[0].last_name || ''
                      } (${multiGrnData[0].updated_by || ''})`}
                    >
                      {`${multiGrnData[0].first_name || ''} ${
                        multiGrnData[0].last_name || ''
                      } (${multiGrnData[0].updated_by || ''})`}
                    </Tooltip>
                  ) : (
                    'PORTAL_MANAGED'
                  )}
                </td>
                <td className="remarks-value">
                  {isEditing ? (
                    <textarea
                      placeholder="Please enter your remarks (minimum 5 characters)"
                      value={multiGrnData[0].remarks || ''}
                      onChange={(e) =>
                        handleChange(e, 0, 'remarks', true)
                      }
                      disabled={!isRemarksEnabled}
                    />
                  ) : (
                    <Tooltip
                      placement="left"
                      title={
                        multiGrnData[0].remarks || NO_DATA_SYMBOL
                      }
                    >
                      {multiGrnData[0].remarks || NO_DATA_SYMBOL}
                    </Tooltip>
                  )}
                </td>
                <td className="width6">
                  <i
                    className="info-icon"
                    onClick={() => handleDetailsIconClick(item)}
                  >
                    <Tooltip placement="bottom" title="Info">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </i>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalVisible && (
        <EcomAutoCLosureDetails
          isModalVisible={isModalVisible}
          hideModal={hideModal}
          payerCode={modalData?.single_grn_code}
        />
      )}
      {isDetailsModalVisible && (
        <EcomMultiGrnCustomerDetails
          isDetailsModalVisible={isDetailsModalVisible}
          hideDetailsModal={hideDetailsModal}
        />
      )}
    </div>
  );
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  fetchAutoClosureMTEcomSingleGrn: (payload) =>
    dispatch(fetchAutoClosureMTEcomSingleGrn(payload)),
  updateSingleGrn: (payload) =>
    dispatch(updateSingleGrnAutoClosure(payload)),
  fetchMultiGrnData: (payload) =>
    dispatch(fetchMultiGrnData(payload)),
  updateMultiGrnAutoClosure: (payload) =>
    dispatch(updateMultiGrnAutoClosure(payload)),
  multiUpdateMTEcom: (payload) =>
    dispatch(multiUpdateMTEcom(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(EcomAutoClosureSettings);
