import React, { useEffect, useState, useRef } from 'react';
import { notification, Tooltip } from 'antd';
import { connect } from 'react-redux';
import { features, hasViewPermission, pages } from '../../../persona/distributorHeader';
import Panigantion from '../../../components/Panigantion';
import './GTAutoClosureSetting.css';
import { NO_DATA_SYMBOL } from '../../../constants';
import LocalAuth from '../../../util/middleware/auth';
import {
    fetchAutoClosureMtEcomConfig,
    fetchMultiGrnData,
    multiUpdateMTEcom,
    updateMultiGrnAutoClosure,
    updateSingleGrnAutoClosure,
    updateAutoClosureMtEcomConfig,
} from '../actions/adminAction';
import MTAutoClosureDetails from './MTAutoClosureDetails';
import MTMultiGrnCustomerDetails from './MTMultiGrnCustomerDetails';
import _ from 'lodash';
import './EcomAutoClosureSetting.css';

const MTAutoClosureSettings = ({
    fetchAutoClosureMTEcomConfig,
    updateSingleGrn,
    fetchMultiGrnData,
    updateMultiGrnAutoClosure,
    multiUpdateMTEcom,
    updateAutoClosureMTEcomConfig,
}) => {
    //-----------------------------------------------------=====Props and Constants====--------------------------------------------
    const hasPermission = hasViewPermission(pages.AUTO_CLOSURE, features.EDIT_MT_AUTO_CLOSURE);
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
    const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
    const [multiGrnData, setMultiGrnData] = useState([]);
    const [headerFilter, setHeaderFilter] = useState({
        singleGrnCode: '',
    });
    const [multiGrnOriginalData, setMultiGrnOriginalData] = useState([]);
    const [isRemarksEnabled, setIsRemarksEnabled] = useState(false);

    const [headerPayload, setHeaderPayload] = useState({
        shortCloseSingleGrn: null,
        shortCloseMultiGrn: null,
        shortCloseRemarks: null,
    });

    const [payload, setPayload] = useState({});

    //-----------------------------------------------------=====useRef====---------------------------------------------------------
    const modifiedDataRef = useRef({});
    //-----------------------------------------------------=====useEffect====------------------------------------------------------
    // Call fetchData inside the useEffect
    useEffect(() => {
        fetchData();
    }, [currentPage, itemsPerPage, headerFilter.singleGrnCode, fetchAutoClosureMTEcomConfig]);

    // Fetch data for the first table (single GRNs)
    async function fetchData() {
        const payload = {
            limit: itemsPerPage,
            offset: (currentPage - 1) * itemsPerPage,
            search: headerFilter.singleGrnCode ? headerFilter.singleGrnCode : null,
        };

        try {
            const response = await fetchAutoClosureMTEcomConfig(payload);
            if (response?.data?.success) {
                setTableData(
                    response.data.data,
                    //   .map((item) => ({
                    //   ...item,
                    //   remarks:
                    //     modifiedDataRef.current[item.id]?.remarks ||
                    //     item.remarks,
                    //   po_validity:
                    //     modifiedDataRef.current[item.id]?.po_validity ||
                    //     item.po_validity,
                    //   short_close:
                    //     modifiedDataRef.current[item.id]?.short_close ||
                    //     item.short_close,
                    // })),
                );
                setOriginalData(response.data.data);
                setTotalItems(response.data.data[0]?.total_count ?? 0);
            } else {
                setTableData([]);
                notification.error({
                    message: 'Error Occurred',
                    description: response?.message ?? 'Some error occurred while fetching data',
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
    }

    const handleHeaderChange = (e, field) => {
        let newValue = e.target.value;
        if (newValue === '') newValue = null;
        const leadingZeroRegex = /^0+(?=\d)/;
        const tempHeaderPayload = {};
        if (field === 'short_close_single_grn') {
            newValue = newValue?.replace(leadingZeroRegex, '') ?? null;
            tempHeaderPayload['shortCloseSingleGrn'] = newValue;
        } else if (field === 'short_close_multi_grn') {
            newValue = newValue?.replace(leadingZeroRegex, '') ?? null;
            tempHeaderPayload['shortCloseMultiGrn'] = newValue;
        } else if (field === 'remarks') {
            tempHeaderPayload['shortCloseRemarks'] = newValue;
        }
        setHeaderPayload({ ...headerPayload, ...tempHeaderPayload });
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
            setMultiGrnData((prevData) => prevData.map((item) => ({ ...item, remarks: '' })));
            setIsRemarksEnabled(false);
            setHeaderPayload({
                shortCloseSingleGrn: null,
                shortCloseMultiGrn: null,
                shortCloseRemarks: null,
            });
            setPayload({});
        }
    };

    const showNotification = (type, message, description) => {
        notification[type]({
            message,
            description,
            duration: 5,
            className: `notification-${type === 'error' ? 'error' : 'green'}`,
        });
    };

    const isInvalidRemarks = (remarks) => {
        return !remarks || remarks.trim().length < 5;
    };

    const handleSaveClick = async () => {
        const isMultiUpdate = Object.values(headerPayload).some((elem) => elem != null);
        if (isMultiUpdate) {
            if (isInvalidRemarks(headerPayload.shortCloseRemarks)) {
                showNotification('error', 'Error', 'Remarks must be at least 5 characters long.');
                setIsEditing(true);
                return;
            }
            multiUpdateMTEcom(headerPayload)
                .then((result) => {
                    if (result?.success) {
                        setIsEditing(false);
                        setHeaderPayload({
                            shortCloseSingleGrn: null,
                            shortCloseMultiGrn: null,
                            shortCloseRemarks: null,
                        });
                        setPayload({});
                        showNotification('success', 'Success', 'Updated successfully');
                        fetchData();
                    } else showNotification('error', 'Error Occurred', 'Some error occurred while updating settings');
                })
                .catch((error) => {
                    showNotification('error', 'Error Occurred', 'Some error occurred while updating settings');
                });
            return;
        }
        const isInvalidRemark = Object.values(payload).some((item) => isInvalidRemarks(item.shortCloseRemarks));
        if (isInvalidRemark) {
            showNotification('error', 'Error', 'Remarks must be at least 5 characters long.');
            return;
        }
        if (!Object.keys(payload).length) {
            showNotification('error', 'Error', 'Please make changes before saving');
            return;
        }
        const finalPayload = Object.values(payload).map((item) => ({
            id: item.id,
            short_close_single_grn: item.shortCloseSingleGrn,
            short_close_multi_grn: item.shortCloseMultiGrn,
            remarks: item.shortCloseRemarks,
        }));

        updateAutoClosureMTEcomConfig(finalPayload)
            .then((res) => {
                if (!res?.data?.success) {
                    showNotification('error', 'Error Occurred', 'Some error occurred while updating settings');
                    setIsEditing(true);
                    return;
                }
                setIsEditing(false);
                setHeaderPayload({
                    shortCloseSingleGrn: null,
                    shortCloseMultiGrn: null,
                    shortCloseRemarks: null,
                });
                setPayload({});
                showNotification('success', 'Success', 'Updated successfully');
                fetchData();
            })
            .catch((error) => {
                showNotification('error', 'Error Occurred', 'Some error occurred while updating settings');
                setIsEditing(true);
            });
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

    const handleChange = (e, field, item) => {
        let newValue = e.target.value;
        const id = item.id;
        const existingPayloadData = payload[id] ?? {};
        let tempPayload = {
            id,
            shortCloseSingleGrn: existingPayloadData.hasOwnProperty('shortCloseSingleGrn') ? existingPayloadData['shortCloseSingleGrn'] : item.short_close_single_grn,
            shortCloseMultiGrn: existingPayloadData.hasOwnProperty('shortCloseMultiGrn') ? existingPayloadData['shortCloseMultiGrn'] : item.short_close_multi_grn,
            shortCloseRemarks: existingPayloadData.hasOwnProperty('shortCloseRemarks') ? existingPayloadData['shortCloseRemarks'] : null,
        };
        if (field === 'shortCloseSingleGrn' || field === 'shortCloseMultiGrn') {
            newValue = newValue?.replace(/^0+(?=\d)/, '') ?? '';
            if (newValue === '' || newValue === '') newValue = null;
            setIsRemarksEnabled(true);
        }
        tempPayload[field] = newValue;
        tempPayload = { ...(payload[id] ?? {}), ...tempPayload };
        setPayload({ ...payload, [id]: { ...tempPayload } });
    };

    const onChangePage = (page, itemsPerPage) => {
        setCurrentPage(page);
        setItemsPerPage(itemsPerPage);
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
                    <button type="button" onClick={handleSaveClick} disabled={!isEditing}>
                        Save
                    </button>
                </div>
            )}

            <div className="admin-dashboard-table">
                <table>
                    <thead>
                        <tr>
                            <th>Customer Group</th>
                            <th style={{ width: '200px' }}>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={headerPayload.shortCloseSingleGrn}
                                        className="value-auto-closure"
                                        placeholder="Single GRN"
                                        onChange={(e) => handleHeaderChange(e, 'short_close_single_grn')}
                                        onWheel={(e) => e.target.blur()}
                                        onKeyPress={(e) => {
                                            const regex = /^[0-9]*$/;
                                            if (!regex.test(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                    />
                                ) : (
                                    'Short Close Period (Single GRN) In Days'
                                )}
                            </th>
                            <th style={{ width: '200px' }}>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={headerPayload.shortCloseMultiGrn}
                                        className="value-auto-closure"
                                        placeholder="Multi GRN"
                                        onChange={(e) => handleHeaderChange(e, 'short_close_multi_grn')}
                                        onWheel={(e) => e.target.blur()}
                                        onKeyPress={(e) => {
                                            const regex = /^[0-9]*$/;
                                            if (!regex.test(e.key)) {
                                                e.preventDefault();
                                            }
                                        }}
                                    />
                                ) : (
                                    'Short Close Period (Multi GRN) In Days'
                                )}
                            </th>
                            <th>Last Updated By</th>
                            <th className="remarks-value-auto-closure">
                                {isEditing ? (
                                    <textarea
                                        value={headerPayload.shortCloseRemark}
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
                        {tableData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan="8"
                                    style={{
                                        textAlign: 'center',
                                        fontFamily: 'MyriadPro-Semibold, sans-serif',
                                        fontSize: '20px',
                                    }}>
                                    No Data Available
                                </td>
                            </tr>
                        ) : (
                            tableData.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.customer_group && item.customer_group_desc ? `${item.customer_group} - ${item.customer_group_desc}` : NO_DATA_SYMBOL}</td>
                                    <td>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={
                                                    payload[item.id] && payload[item.id]?.hasOwnProperty('shortCloseSingleGrn')
                                                        ? payload[item.id].shortCloseSingleGrn
                                                        : (item.short_close_single_grn ?? NO_DATA_SYMBOL)
                                                }
                                                className="value-auto-closure"
                                                onChange={(e) => handleChange(e, 'shortCloseSingleGrn', item)}
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
                                            (item.short_close_single_grn ?? NO_DATA_SYMBOL)
                                        )}
                                    </td>
                                    <td>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={
                                                    payload[item.id] && payload[item.id]?.hasOwnProperty('shortCloseMultiGrn')
                                                        ? payload[item.id].shortCloseMultiGrn
                                                        : (item.short_close_multi_grn ?? NO_DATA_SYMBOL)
                                                }
                                                className="value-auto-closure"
                                                onChange={(e) => handleChange(e, 'shortCloseMultiGrn', item)}
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
                                            (item.short_close_multi_grn ?? NO_DATA_SYMBOL)
                                        )}
                                    </td>
                                    <td>{item.updated_by_user_name ?? 'PORTAL_MANAGED'}</td>
                                    <td className="remarks-value">
                                        {isEditing ? (
                                            <textarea
                                                placeholder="Please enter your remarks (minimum 5 characters)"
                                                value={payload[item.id]?.shortCloseRemarks ?? ''}
                                                onChange={(e) => handleChange(e, 'shortCloseRemarks', item)}
                                                disabled={!payload[item.id]}
                                            />
                                        ) : !item.remarks || item.remarks.trim().length === 0 ? (
                                            NO_DATA_SYMBOL
                                        ) : (
                                            <Tooltip placement="left" title={item.remarks}>
                                                {item.remarks}
                                            </Tooltip>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div>
                    <Panigantion
                        data={tableData}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        itemsCount={totalItems}
                        setModifiedData={onChangePage}
                        pageNo={currentPage}
                    />
                </div>
            </div>
            {isModalVisible && <MTAutoClosureDetails isModalVisible={isModalVisible} hideModal={hideModal} payerCode={modalData?.single_grn_code} />}
            {isDetailsModalVisible && <MTMultiGrnCustomerDetails isDetailsModalVisible={isDetailsModalVisible} hideDetailsModal={hideDetailsModal} />}
        </div>
    );
};

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
    fetchAutoClosureMTEcomConfig: (payload) => dispatch(fetchAutoClosureMtEcomConfig(payload)),
    updateSingleGrn: (payload) => dispatch(updateSingleGrnAutoClosure(payload)),
    fetchMultiGrnData: (payload) => dispatch(fetchMultiGrnData(payload)),
    updateMultiGrnAutoClosure: (payload) => dispatch(updateMultiGrnAutoClosure(payload)),
    multiUpdateMTEcom: (payload) => dispatch(multiUpdateMTEcom(payload)),
    updateAutoClosureMTEcomConfig: (payload) => dispatch(updateAutoClosureMtEcomConfig(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(MTAutoClosureSettings);
