import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import LocalAuth from '../../../util/middleware/auth';
import * as Actions from '../../admin/actions/adminAction';
import Util from '../../../util/helper/index';
import '../../distributor/PODetails/PoDetails.css';
import 'antd/dist/antd.css';

import Loader from '../../../components/Loader';
import Panigantion from '../../../components/Panigantion';
import { NO_DATA_SYMBOL } from '../../../constants';
import { Link } from 'react-router-dom';
import './ShopifyMain.css';
import { Button, Modal, notification } from 'antd';
import { hasViewPermission, pages, features } from '../../../persona/distributorNav';

let ShopifyPOData = (props) => {
    const { shopifyPoItemList, deleteItems } = props;
    let po_data;
    po_data = window.localStorage.getItem('shopify-po-details');
    po_data = JSON.parse(po_data);
    const [pageNo, setPageNo] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [itemData, settemData] = useState([]);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [PO_NUMBER, setPO_NUMBER] = useState(po_data?.po_number || '');
    const [SO_NUMBER, setSO_NUMBER] = useState(po_data?.sales_order || '');
    const [PO_DATE, setPO_DATE] = useState(po_data?.po_date || '');
    const [SO_DATE, setSO_DATE] = useState(po_data?.so_date || '');
    const adminAccessToken = LocalAuth.getAdminAccessToken();
    const [hideDeleteButton, setHideDeleteButton] = useState(false);
    const [showDeletedBy, setShowDeletedBy] = useState(false);
    const [showDeletionTimeStamp, setShowDeletionTimeStamp] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSaveDisabled, setIsSaveDisabled] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        const hideDelete = localStorage.getItem('hideDeleteButton') === 'true';
        setHideDeleteButton(hideDelete);
        const showDeletedByValue = localStorage.getItem('deletedBy') === 'true';
        setShowDeletedBy(showDeletedByValue);
        const showDeletionTimeStampValue = localStorage.getItem('deletionTimeStamp') === 'true';
        setShowDeletionTimeStamp(showDeletionTimeStampValue);
    }, []);

    useEffect(async () => {
        getData();
    }, [offset, limit]);

    useEffect(() => {
        document.body.classList.add('body-overflow-hidden');
        return () => {
            document.body.classList.remove('body-overflow-hidden');
        };
    }, []);

    const onChangePage = (page, itemsPerPage) => {
        setLimit(itemsPerPage);
        setOffset((page - 1) * limit);
        setPageNo(page);
    };

    const getData = async () => {
        if (adminAccessToken) {
            let itemPayload = {
                limit: limit,
                offset: offset,
                po_id: po_data?.id,
                deletedItems: localStorage.getItem('hideDeleteButton'),
            };
            const data = await shopifyPoItemList(itemPayload);
            settemData(data?.data);
        }
    };

    const handleEditClick = () => {
        setIsEditMode(true);
    };
    const handleCancelClick = () => {
        setIsEditMode(false);
        setIsSaveDisabled(true);
        setSelectedRows([]);
        getData();
    };

    const handleSaveClick = () => {
        setIsModalVisible(true);
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
    };

    const handleModalOk = async () => {
        const payload = selectedRows.map((row) => ({
            po_id: po_data.id,
            item_number: row.item_number,
            is_deleted: row.is_deleted,
            user_id: localStorage.getItem('user_id'),
        }));
        try {
            const response = await deleteItems(payload);
            setIsModalVisible(false);
            setIsSaveDisabled(true);
            setIsEditMode(false);
            setSelectedRows([]);
            getData();
            notification.success({
                message: 'Success',
                description: response.data.message,
                duration: 4,
                className: 'notification-green',
            });
        } catch {
            notification.error({
                message: 'Error',
                description: 'Error in deleting item(s)',
                duration: 4,
                className: 'notification-red',
            });
        }
    };

    const handleCheckboxChange = (e, item, index) => {
        const isChecked = e.target.checked;
        let updatedRows = selectedRows.filter((row) => row.item_number !== item.item_number);
        let tempItemdata = itemData;
        tempItemdata.data[index].is_deleted = isChecked;
        settemData(tempItemdata);
        if (isChecked) {
            updatedRows.push({ ...item, is_deleted: true });
        } else {
            const isRowPresent = updatedRows.findIndex((row) => row.item_number === item.item_number);
            if (isRowPresent >= 0) {
                updatedRows[isRowPresent].is_deleted = false;
            } else updatedRows.push({ ...item, is_deleted: false });
        }
        setSelectedRows(updatedRows);
        setIsSaveDisabled(updatedRows.length === 0);
    };

    return (
        <>
            <section className="main-content po-details-page no-scroll">
                <div>
                    <div className="mt-po-details-head">
                        <div className="po-details-col-data">
                            <div className="po-details-shopify">
                                <ul>
                                    <li>
                                        <span>PO Number</span> {PO_NUMBER ? PO_NUMBER : NO_DATA_SYMBOL}
                                    </li>
                                    <li className="field-attr-mt">
                                        <span>PO Date</span> <span>{PO_DATE && !isNaN(new Date(PO_DATE).getTime()) ? Util.getDateAsMonthName(PO_DATE) : NO_DATA_SYMBOL}</span>
                                    </li>
                                </ul>
                                <ul>
                                    <li>
                                        <span>SO Number</span> <span>{SO_NUMBER ? SO_NUMBER : NO_DATA_SYMBOL}</span>
                                    </li>
                                    <li className="field-attr-mt">
                                        <span>SO Date</span> {SO_DATE && !isNaN(new Date(SO_DATE).getTime()) ? Util.getDateAsMonthName(SO_DATE) : NO_DATA_SYMBOL}
                                    </li>
                                </ul>
                                <ul className="btn-container">
                                    {!hideDeleteButton && hasViewPermission(pages.SHOPIFY, features.DELETE_BUTTON) && (
                                        <>
                                            {!isEditMode ? (
                                                <Button type="primary" className="shopify-delete" onClick={handleEditClick}>
                                                    Edit
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button type="default" className="shopify-cancel" onClick={handleCancelClick}>
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        type="primary"
                                                        className={`shopify-save ${isSaveDisabled ? 'shopify-disabled-button' : ''}`}
                                                        disabled={isSaveDisabled}
                                                        onClick={handleSaveClick}>
                                                        Save
                                                    </Button>
                                                </>
                                            )}
                                        </>
                                    )}
                                </ul>
                            </div>
                        </div>

                        <Link to="/admin/shopify-dashboard">
                            <img src="/assets/images/cross-icon.svg" alt="cancel" className="back-button" />
                        </Link>
                    </div>
                    <div className="admin-dashboard-table table-fixed">
                        <Loader>
                            <table>
                                <thead>
                                    <tr>
                                        <th className="sub-header width15" style={{ width: '5%' }}>
                                            Item Number
                                        </th>
                                        <th className="sub-header width15" style={{ width: '10%' }}>
                                            Customer Material code
                                        </th>
                                        <th className="sub-header width15" style={{ width: '10%' }}>
                                            Material Code
                                        </th>
                                        <th className="sub-header width15" style={{ width: '12%' }}>
                                            Material Description
                                        </th>
                                        <th className="sub-header width15" style={{ width: '6%' }}>
                                            Order Quantity
                                        </th>
                                        <th className="sub-header width15" style={{ width: '6%' }}>
                                            MRP
                                        </th>
                                        <th className="sub-header width15" style={{ width: '13%' }}>
                                            ROR
                                        </th>
                                        <th className="sub-header width15" style={{ width: '14%' }}>
                                            Message
                                        </th>
                                        {showDeletedBy && (
                                            <th className="sub-header width15" style={{ width: '10%' }}>
                                                Deleted By
                                            </th>
                                        )}
                                        {showDeletionTimeStamp && (
                                            <th className="sub-header width15" style={{ width: '15%' }}>
                                                Deleted On
                                            </th>
                                        )}
                                        {!hideDeleteButton && hasViewPermission(pages.SHOPIFY, features.DELETE_BUTTON) && (
                                            <th className="sub-header width15" style={{ width: '10%' }}>
                                                Delete
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody style={{ textAlign: 'left' }}>
                                    {itemData &&
                                        itemData?.data &&
                                        itemData?.data?.length > 0 &&
                                        itemData?.data?.map((data, index) => {
                                            return (
                                                <tr key={index}>
                                                    <td className="center-align">{data?.item_number ? data?.item_number : '-'}</td>
                                                    <td className="center-align">{data?.customer_material_code ? data?.customer_material_code : '-'}</td>
                                                    <td className="center-align">{data?.material_code ? data?.material_code : '-'}</td>
                                                    <td className="center-align">{data?.material_description ? data?.material_description : '-'}</td>
                                                    <td className="center-align">
                                                        {data?.order_quantity + data?.sales_unit ? `${data?.order_quantity} ${data?.sales_unit}` : '-'}
                                                    </td>
                                                    <td className="center-align" style={{ textAlign: 'right' }}>
                                                        {data?.item_conditions[0][0].Amount ? data?.item_conditions[0][0].Amount : '-'}
                                                    </td>
                                                    <td className="center-align">{data?.ror ? data.ror : data?.ror === '' ? data?.ror_trail : '-'}</td>
                                                    <td className="center-align">{data?.message ? data?.message : '-'}</td>
                                                    {showDeletedBy && <td className="center-align">{data?.updated_by ? data?.updated_by : '-'}</td>}
                                                    {showDeletionTimeStamp && (
                                                        <td className="center-align">
                                                            {' '}
                                                            {data?.is_deleted ? (data?.updated_on ? Util.formatDateTime(data?.updated_on) : '-') : '-'}
                                                        </td>
                                                    )}
                                                    {!hideDeleteButton && hasViewPermission(pages.SHOPIFY, features.DELETE_BUTTON) && (
                                                        <td className="center-align">
                                                            <input
                                                                type="checkbox"
                                                                className={`shopify-custom-checkbox ${!isEditMode ? 'disabled-checkbox' : ''}`}
                                                                checked={!!data.is_deleted}
                                                                onChange={(e) => handleCheckboxChange(e, data, index)}
                                                                disabled={!isEditMode}
                                                            />
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </Loader>
                        {!(itemData?.data?.length > 0) && (
                            <div className="NoDataDiv">
                                <b> No data available.</b>
                            </div>
                        )}
                    </div>
                    {itemData && itemData?.count > 10 && (
                        <Panigantion
                            data={itemData?.data ? itemData?.data : []}
                            itemsPerPage={itemsPerPage}
                            setItemsPerPage={setItemsPerPage}
                            itemsCount={itemData?.count}
                            setModifiedData={onChangePage}
                            pageNo={pageNo}
                        />
                    )}
                </div>
            </section>
            <Modal title="Confirmation" visible={isModalVisible} onOk={handleModalOk} onCancel={handleModalCancel} okText="Yes" cancelText="No">
                <p>Are you sure you want to save?</p>
            </Modal>
        </>
    );
};

const mapStateToProps = () => {
    return {};
};
const mapDispatchToProps = (dispatch) => {
    return {
        shopifyPoItemList: (data) => dispatch(Actions.shopifyPoItemList(data)),
        deleteItems: (data) => dispatch(Actions.deleteItems(data)),
    };
};

const ShopifyPoDetails = connect(mapStateToProps, mapDispatchToProps)(ShopifyPOData);

export default ShopifyPoDetails;
