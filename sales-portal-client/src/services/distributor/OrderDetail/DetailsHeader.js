import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import jwt from 'jsonwebtoken';
import Auth from '../../../util/middleware/auth';
import * as Action from '../actions/dashboardAction';
import Util from '../../../util/helper/index';
import '../PODetails/PoDetails.css';
let DetailsHeader = (props) => {
    
    const browserHistory = props.history;
    const { delivery_no, invoice_no, po_number, po_date, so_number, so_date, market } = props.headerData;
    const { po_details, warehouses, distributorId } = props;
    const [shippingData, setShippingData] = useState({});
    const [unloadingData, setUnloadingData] = useState({});
    const [rdd, setRdd] = useState('');
    const [poDetails, setPoDetails] = useState({});
    const [Tat, setTat] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [reqRdd, setreqRdd] = useState('');

    const onClickCrossButton = (e) => {
        e.preventDefault();
        if (distributorId) {
            browserHistory.push({ pathname: "/admin/distributor", state: { distributorId } });
        } else {
            browserHistory.push('/distributor/dashboard');
        }
    };

    let access_token = Auth.getAccessToken();
    let admin_access_token = Auth.getAdminAccessToken();
    let role = Auth.getRole();
    let login_id = '';
    if (access_token || admin_access_token) {
        if (role) {
            login_id = distributorId
        } else {
            login_id = jwt.decode(access_token).login_id;
        }
    }

    useEffect(() => {
        if ((login_id &&
            login_id !== '' &&
            warehouses &&
            Object.keys(warehouses).length === 0) ||
            (warehouses.shipping_point.length === 0 && warehouses.unloading_point.length === 0)
        ) {
            props.getWarehouseDetails(login_id);
        }

        if (po_number && (!Array.isArray(po_details) || po_details.length === 0)) {
            props.getPODetails(po_number, login_id);
        }
    }, []);

    useEffect(() => {
        if (po_details?.length) {
            const pos = po_details.find((item) => item.SO_NUMBER === so_number) || po_details[0];
            
            setPoDetails(pos);
            const { partnerset, Itemset } = pos;
            setRdd(Itemset[0]?.RDD || '');
            let points = {};
           
            setTat(pos?.TAT || 0);
            setreqRdd(pos?.Req_Delv_Date ?  Util.formatRDDDate(pos?.Req_Delv_Date) : ''); 
                 
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

    useEffect(() => {
            /* SOPE-4948
               Case 1: If Rdd is present. 
                        RDD(Req_Delv_Date) + TAT               
               Case 2: If Rdd is not present. 
                        (SO Date + 1) + TAT
            */

            if(reqRdd) {
                const [day, month, year] = reqRdd.split('.').map(Number);
                const rddDate = new Date(year, month - 1, day);
                
                rddDate.setDate(rddDate.getDate() + Tat);
                const formattedExpDate = Util.formatDate(rddDate, 'DD-MMM-YYYY');
                setExpectedDeliveryDate(formattedExpDate); 
            } 
            else if(!reqRdd) {
                const soDate = new Date(so_date);
                soDate.setDate(soDate.getDate() + 1 + Tat);
                
                const formattedExpDate = Util.formatDate(soDate, 'DD-MMM-YYYY');
                setExpectedDeliveryDate(formattedExpDate);
                 }
    },[Tat,expectedDeliveryDate, reqRdd])

    

    const poDetailHandler = (delivery_no, invoice_no, po_number, po_date, so_number, so_date) => {
        let pathUrl = ''
        if (distributorId) {
            pathUrl = '/admin/po-details'
        } else {
            pathUrl = '/distributor/po-details'
        }
        browserHistory.push({
            pathname: pathUrl,
            state: {
                delivery_no: delivery_no,
                invoice_no: invoice_no,
                po_number: po_number,
                po_date: po_date,
                so_number: so_number,
                so_date: so_date,
                distributorId
            }
        });
    }

    return (
        <>

            <div className="po-details-head">
                <div className="so-details-col-1">
                    <div className="po-details">
                        <ul>
                            <li>SO Number</li>
                            <li className="field-val">
                                {/* <a href="/distributor/so-details"> */}
                                {so_number ? so_number : '-'}
                                {/* </a> */}
                            </li>
                            <li className="field-attr">
                                <span className="date">SO Date</span> {so_date ? Util.formatDate(so_date) : '-'}
                            </li>
                            {rdd && <li className="field-attr">
                                <span className="date">RDD</span> {Util.formatDate(rdd,'DD.MM.YYYY')}
                            </li>}
                        </ul>
                    </div>
                </div>

                <div className="so-details-col-1">
                    <div className="po-details">
                        <ul>
                            <li>PO Number</li>
                            <li className="field-val">
                                <a onClick={() => poDetailHandler(delivery_no, invoice_no, po_number, po_date, so_number, so_date)}>
                                    {po_number ? po_number : '-'}
                                </a>
                            </li>
                            <li className="field-attr">
                                <span className="date">PO Date</span> {po_date ? Util.formatDate(po_date) : '-'}
                            </li>
                            <li className="field-attr">
                                <span className="date">Exp. Del. Date</span> {expectedDeliveryDate ? expectedDeliveryDate : '-'}
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="so-details-col-2">
                    <div className="po-details">
                        <ul>
                            <li>Ship To</li>
                            <li className="field-val">
                                {shippingData.PARTN_NAME}
                            </li>
                            <li className="field-attr">
                                <span>Ship to customer Code</span>{' '}
                                {shippingData.PARTN_CODE}
                            </li>
                            <li className="field-attr">
                                <span>Market</span> {market}
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="so-details-col-2">
                    <div className="po-details">
                        <ul>
                            <li>Unloading Point</li>
                            <li className="field-val">
                                {unloadingData.PARTN_NAME ? unloadingData.PARTN_NAME : shippingData.PARTN_NAME}
                            </li>
                            <li className="field-attr">
                                <span>{unloadingData.PARTN_CODE ? 'Unloading Point code' : ''}</span>{' '}
                                {
                                    unloadingData.PARTN_CODE
                                        ? unloadingData.PARTN_CODE
                                        : shippingData.PARTN_CODE
                                }
                            </li>
                        </ul>
                    </div>
                </div>

                <img
                    src="/assets/images/cross-icon.svg"
                    alt="cancel"
                    className="back-button"
                    onClick={(e) => onClickCrossButton(e)}
                />

            </div>

        </>
    );
};

const mapStateToProps = (state, ownProps) => {
    return {
        materials: state.dashboard.get('materials'),
        order_list: state.dashboard.get('order_list'),
        po_details: state.dashboard.get('po_details'),
        region_details: state.dashboard.get('region_details'),
        warehouses: state.dashboard.get('warehouses'),
        expected_delivery_date: state.dashboard.get('expectedDeliveryDate'),
    };
};
const mapDispatchToProps = (dispatch, ownProps) => {
    return {
        getWarehouseDetails: (login_id) =>
            dispatch(Action.getWarehouseDetails(login_id)),
        getPODetails: (poDetails, login_id) => dispatch(Action.getPODetails(poDetails, login_id)),
    };
};

const ConnectDetailsHeader = connect(
    mapStateToProps,
    mapDispatchToProps,
)(DetailsHeader);

export default ConnectDetailsHeader;
