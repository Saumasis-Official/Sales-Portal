import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import moment from 'moment'
import jwt from 'jsonwebtoken';
import Auth from '../../../util/middleware/auth';
import Util from '../../../util/helper/index';
import OrderDetailsTable from './DeliveryDetailsTable';
import * as Action from '../actions/dashboardAction';
import './InvoiceDetails.css';
import { authenticatedUsersOnly } from '../../../util/middleware';

let InvoiceDetails = props => {
    const browserHistory = props.history;   
    const { delivery_no, invoice_no, po_number, po_date, so_number, so_date, market, distributorId } = props.location.state.headerData;
   if (props.location.pathname.split('/')[1] === 'distributor') {
     authenticatedUsersOnly(props.location.pathname, props.history);
   }
    const { po_details, warehouses } = props;
    const [poDetails, setPoDetails] = useState({});
    const onClickCrossButton = (e) => {
        e.preventDefault();
        let pathUrl = '';
        if (distributorId) {
            pathUrl = '/admin/sales-order';
        } else {
            pathUrl = '/distributor/sales-order';
        }
        browserHistory.push({
            pathname: pathUrl, state: {
                delivery_no: props.location.state.delivery_no,
                invoice_no: props.location.state.invoice_no,
                market,
                so_number,
                so_date,
                po_number,
                po_date,
                poDetails,
                distributorId
            }
        });
    }

    const onClickPoNumber = (e) => {
        e.preventDefault();
        let pathUrl = '';
        if (distributorId) {
            pathUrl = '/admin/po-details';
        } else {
            pathUrl = '/distributor/po-details';
        }
        browserHistory.push({
            pathname: pathUrl, state: {
                delivery_no: props.location.state.delivery_no,
                invoice_no: props.location.state.invoice_no,
                so_number,
                so_date,
                po_number,
                po_date,
                distributorId
            }
        });
    }

    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();

    let login_id = '';
    if (access_token) {
        login_id = jwt.decode(access_token) ? jwt.decode(access_token).login_id : null;
    } else if (admin_access_token) {
        login_id = distributorId;
    } else {
        browserHistory.push('/');
    }

    useEffect(() => {
        if (!props.location.state.tableItems) {
            browserHistory.push('/distributor/dashboard');
        }

        if ((login_id &&
            login_id !== '' &&
            warehouses &&
            Object.keys(warehouses).length === 0) ||
            (warehouses && warehouses.shipping_point && warehouses.shipping_point.length === 0
                && warehouses.unloading_point && warehouses.unloading_point.length === 0)
        ) {
            props.getWarehouseDetails(login_id);
        }

        if (po_number && (!Array.isArray(po_details) || po_details.length === 0)) {
            props.getPODetails(po_number, login_id);
        }
    }, []);

    const [shippingData, setShippingData] = useState({});
    const [unloadingData, setUnloadingData] = useState({});
    const [rdd, setRdd] = useState('');

    useEffect(() => {
        if (po_details.length) {
            const pos = po_details.find((item) => item.SO_NUMBER === so_number)  || po_details[0];
            setPoDetails(pos);
            const { partnerset, Itemset } = pos;
            setRdd(Itemset[0]?.RDD || '');
            let points = {};

            partnerset.forEach((item) => {
                if (!item.PARTN_NAME) {
                    if (item.PARTN_ROLE === 'WE' || item.PARTN_ROLE === 'SH') {
                        points['shipping_point'] = item.PARTN_NUMB;
                    } else if (item.PARTN_ROLE === 'Y1') {
                        points['unloading_point'] = item.PARTN_NUMB;
                    }
                } else {
                    if (item.PARTN_ROLE === 'WE' || item.PARTN_ROLE === 'SH') {
                        setShippingData({
                            PARTN_ROLE: 'shipping_point',
                            PARTN_CODE: item.PARTN_NUMB,
                            PARTN_NAME: item.PARTN_NAME,
                        });
                    } else if (item.PARTN_ROLE === 'Y1') {
                        setUnloadingData({
                            PARTN_ROLE: 'unloading_point',
                            PARTN_CODE: item.PARTN_NUMB,
                            PARTN_NAME: item.PARTN_NAME,
                        });
                    }
                }
            });

            if (points['shipping_point'] && warehouses['shipping_point']) {
                warehouses['shipping_point'].forEach((i) => {
                    if (i.partner_code === points['shipping_point']) {
                        setShippingData({
                            PARTN_ROLE: 'shipping_point',
                            PARTN_CODE: i.partner_code,
                            PARTN_NAME: i.partner_name,
                        });
                    }
                });
            }

            if (points['unloading_point'] && warehouses['unloading_point']) {
                warehouses['unloading_point'].forEach((i) => {
                    if (i.partner_code === points['unloading_point']) {
                        setUnloadingData({
                            PARTN_ROLE: 'unloading_point',
                            PARTN_CODE: i.partner_code,
                            PARTN_NAME: i.partner_name,
                        });
                    }
                });
            }
        }
    }, [po_details, warehouses]);

    return (
        <>
            <section className="main-content invoice-detail-page">

                <div className="po-details-head">

                    <div className="invoice-details-col-1">
                        <div className="invoice-details">
                            <ul>
                                {(props.location.state && props.location.state.type === 'delivery') ?
                                    <>
                                        <li>
                                            Delivery Number
                                        </li>
                                        <li className="field-val">
                                            {props.location.state.tableItems && props.location.state.tableItems[0].delivery}
                                        </li>
                                        <li className="field-attr">
                                            <span className="invoice_date">Delivery Date</span> {props.location.state.tableItems && `${Util.formatDate(props.location.state.tableItems[0].delivery_date)}`}
                                        </li>
                                    </>
                                    :
                                    <>
                                        <li>
                                            Invoice Number
                                        </li>
                                        <li className="field-val">
                                            {props.location.state.tableItems && props.location.state.tableItems[0].invoice}
                                        </li>
                                        <li className="field-attr">
                                            <span className="invoice_date">Invoice Date</span> {props.location.state.tableItems && `${Util.formatDate(props.location.state.tableItems[0].invoice_date)}`}
                                        </li>
                                    </>
                                }
                            </ul>
                        </div>
                    </div>

                    <div className="invoice-details-col-2">
                        <div className="invoice-details">
                            <ul>
                                <li>
                                    SO Number
                                </li>
                                <li className="field-val">
                                    {((delivery_no && delivery_no.length > 0) || (invoice_no && invoice_no.length > 0)) && so_number ? <a onClick={(e) => onClickCrossButton(e)}>
                                        {so_number}</a> : so_number
                                    }
                                </li>
                                <li className="field-attr">
                                    <span className="date">SO Date</span> {so_date ? Util.formatDate(so_date) : '-'}
                                </li>
                                {rdd && <li className="field-attr">
                                    <span className="date">RDD</span> {rdd.replaceAll('.','/')}
                                </li>}
                            </ul>
                        </div>
                    </div>

                    <div className="invoice-details-col-2">
                        <div className="invoice-details">
                            <ul>
                                <li>
                                    PO Number
                                </li>
                                <li className="field-val">
                                    {((delivery_no && delivery_no.length > 0) || (invoice_no && invoice_no.length > 0)) && po_number ? <a onClick={(e) => onClickPoNumber(e)}>
                                        {po_number}</a> : po_number
                                    }
                                </li>
                                <li className="field-attr">
                                    <span className="date">PO Date</span> {po_date ? Util.formatDate(po_date) : '-'}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="invoice-details-col-2">
                        <div className="invoice-details">
                            <ul>
                                <li>
                                    Ship To
                                </li>
                                <li className="field-val">
                                    {shippingData.PARTN_NAME}
                                </li>
                                <li className="field-attr">
                                    <span>Ship to customer Code</span>   {shippingData.PARTN_CODE}
                                </li>
                                <li className="field-attr">
                                    <span>Market</span> {market ? market : '-'}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="invoice-details-col-2">
                        <div className="invoice-details">
                            <ul>
                                <li>
                                    Unloading Point
                                </li>
                                <li className="field-val">
                                    {unloadingData.PARTN_NAME ? unloadingData.PARTN_NAME : shippingData.PARTN_NAME}

                                </li>
                                <li className="field-attr">
                                    {unloadingData.PARTN_CODE ? unloadingData.PARTN_CODE : shippingData.PARTN_CODE}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <img src="/assets/images/cross-icon.svg" alt="cancel" className="back-button" onClick={e => onClickCrossButton(e)} />

                </div>

                <div className="sales-order-block new-sales-order-block">
                    {/* <MaterialTable tableItems={tableItems} onOrderChange={setTotalAmount} /> */}
                    <OrderDetailsTable type={(props.location.state && props.location.state.type === 'delivery') ? 'delivery' : 'invoice'} tableItems={props.location.state.tableItems} />

                </div>
            </section>
        </>
    )
}

const mapStateToProps = (state, ownProps) => {
    return {
        materials: state.dashboard.get('materials'),
        order_list: state.dashboard.get('order_list'),
        po_details: state.dashboard.get('po_details'),
        region_details: state.dashboard.get('region_details'),
        warehouses: state.dashboard.get('warehouses'),
    }
}
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getWarehouseDetails: (login_id) =>
            dispatch(Action.getWarehouseDetails( login_id )),
        getPODetails: (poDetails, login_id) => dispatch(Action.getPODetails(poDetails, login_id)),
    }
}

const ConnectInvoiceDetails = connect(
    mapStateToProps,
    mapDispatchToProps
)(InvoiceDetails)

export default ConnectInvoiceDetails;
