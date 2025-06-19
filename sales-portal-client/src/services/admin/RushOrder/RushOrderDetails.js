import React, { useState, useEffect, useRef, useMemo } from 'react';
import {useParams,useLocation} from 'react-router-dom';
import { connect } from 'react-redux';
import * as AdminAction from '../actions/adminAction';
import * as DashAction from '../../distributor/actions/dashboardAction';
import * as AuthAction from '../../auth/action';
import Util from '../../../util/helper';
import Auth from '../../../util/middleware/auth';
import { Tooltip, notification, DatePicker, Popover, Collapse } from 'antd';
import { InfoCircleFilled, CaretRightOutlined } from '@ant-design/icons';
import Loader from '../../../components/Loader';
import ValidateNSubmit from './ValidateNSubmit';
import { hasRespondPermission, pages } from '../../../persona/requests';
import { isUndefined } from 'lodash';
import { RUPEE_SYMBOL } from '../../../constants';
import appLevelConfiguration from "../../../config";
const RushOrderDetails = (props) => {
    const { history, getPODetails, po_details, getRegionDetails, distributor_profile, app_level_configuration, updateRushOrderRequest, fetchOrderRequest, setROExpired, getAppSettingList, getRushOrderApprovalCount, pdp_windows, getPDPWindows , approveRushOrderRequest} = props;
  const role = Auth.getRole();
//   const email = Auth.getUserEmail()?.toLowerCase();
    const email = Auth.getSSOUserEmail()?.toLowerCase();
  const {po_num, dist_id} = useParams();
  const po_number = Util.decryptData(po_num.replaceAll('*', '/').replaceAll('-','+'));
  const distributor_id = Util.decryptData(dist_id.replaceAll('*', '/').replaceAll('-','+'));
    const location = useLocation();
    const appConfig = appLevelConfiguration.app_level_configuration;
  

  const monthNames = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];
  const current_month = monthNames[(new Date()).getMonth()];

  const contents = (
    <div>
      <div>Please contact regional <br />CFA for any corrections</div>
    </div>
  );

  const getOrDefault = (map, key, defaultValue) => {
    return map.has(key) ? map.get(key) : defaultValue;
  }

  const [asm, setAsm] = useState([]);
  const [tse, setTse] = useState([]);
  const [activePdp, setActivePdp] = useState([]);
  const [inactivePdp, setInactivePdp] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [salesUnit, setSalesUnit] = useState('');
  const [soData, setSoData] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [willSubmit, setWillSubmit] = useState(false);
  const [requestStatus, setRequestStatus] = useState('EXPIRED');
  const [shipTo, setShipTo] = useState(null);
  const [unloading,setUnloading] = useState(null);
  const [orderRequestData, setOrderRequestData] = useState(null);
  const [isRushOrderResponseEnabled, setIsRushOrderResponseEnabled] = useState(false)
  const [poDetails, setPoDetails] = useState({});
  const [roApprovers, setRoApprovers] = useState([]);
  const [isResponseDisabled, setIsResponseDisabled] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState('');

  const submitPayload = useRef(null);
  const orderCreationData = useRef(null);
  const totalApprovals = useRef(0);
  const expiryHours = useRef(24);
  const approvalCount = useRef(0);
  const expiryHours2 = useRef(24);

  useEffect(()=>{
    async function fetchOrderRequestData(po){
        const response = await fetchOrderRequest(po);
        if(response.success){
            setOrderRequestData(response.data);
        }else{
            notificationSender(false, 'Error', 'Failed to fetch order request data.');
        }
    }
    if(po_number && distributor_id){
      getPODetails(po_number,distributor_id);
      getRegionDetails(distributor_id);
    //   if(orderRequestData == null)
        fetchOrderRequestData(po_number);
    }
  },[getPODetails,getRegionDetails,po_number,distributor_id,refresh,fetchOrderRequest]);

    useEffect(() => {
        pdp_windows?.forEach(window => {
            const config = window.pdp_type === "WE" ? appConfig.pdp_weekly : appConfig.pdp_fortnightly;
            if (+window.threshold_frequency === -1) {
                for (let day of Object.keys(config)) {
                    Object.assign(config[day], { orderWindow: window[config[day].key1], orderPlacementEndTime: window[config[day].key2] });
                }
            } else {
                Object.assign(config, { THRESHOLD_FREQUENCY: +window.threshold_frequency });
                for (let day of Object.keys(config)) {
                    Object.assign(config[day], { orderWindowException: window[config[day].key1], orderPlacementEndTimeException: window[config[day].key2] });
                }
            }
        });
    if(app_level_configuration?.length && distributor_profile){
        const pdp = Util.getPdpDetails(distributor_profile,app_level_configuration);
        const active_pdp = pdp.activeArr.map(o => { return {pdp: o?.pdp_day,
                                                            plant: o?.plant_name,
                                                            div: `${o?.division_description}/${o?.division}`}});
        const inactive_pdp = pdp.inactiveArr.map(o => { return {pdp: o?.pdp_day,
                                                                plant: o?.plant_name,
                                                                div: `${o?.division_description}/${o?.division}`}});
        setActivePdp(active_pdp);
        setInactivePdp(inactive_pdp);
    }else{
        getAppSettingList();
    }
    }, [app_level_configuration, distributor_profile, pdp_windows]);

  useEffect(() => {
    if(orderRequestData){
        setRequestStatus(orderRequestData.status);
    }
  },[orderRequestData]);

  useEffect(() => {
    async function fetchApprovalCount(){
        const res = await getRushOrderApprovalCount();
        if(res.success){
            approvalCount.current = res.data;
        }else{
            notificationSender(false, 'Error', 'Failed to fetch rush order approval count');
        }
    }
    
    // fetchApprovalCount();
    
  },[getRushOrderApprovalCount,refresh]);

  useEffect(() => {
    if(app_level_configuration?.length){
        const keys = ['RO_EXPIRY_WINDOW','RO_APPROVALS','ENABLE_RO_RESPONSE','RO_APPROVERS','RO_EXPIRY_WINDOW_2'];
        const keysMap = new Map();
        app_level_configuration.filter((item) => keys.includes(item.key)).forEach((item) => {
            keysMap.set(item.key,item.value);
        });
        
        // totalApprovals.current = parseInt(getOrDefault(keysMap,'RO_APPROVALS',0));
        expiryHours.current = parseInt(getOrDefault(keysMap,'RO_EXPIRY_WINDOW',24));
        expiryHours2.current = parseInt(getOrDefault(keysMap,'RO_EXPIRY_WINDOW_2',24));
        setIsRushOrderResponseEnabled(getOrDefault(keysMap,'ENABLE_RO_RESPONSE','NO') === 'YES');
        setRoApprovers(getOrDefault(keysMap,'RO_APPROVERS','')?.split(',').filter(o => o.trim().length > 8).map(o => o.trim().toLowerCase()));
        
    }else{
        getAppSettingList();
    }
  }, [app_level_configuration]);

  useEffect(() => {
    const email_index = roApprovers.indexOf(email);
    let can_respond = isRushOrderResponseEnabled;
    if(!can_respond){
        setDisabledMessage('Rush Order Approval/Rejection is disabled by Admin.');
        setIsResponseDisabled(true);
        return;
    }
    can_respond = requestStatus === 'PENDING' && hasRespondPermission(pages.RO_REQUESTS) && email_index >= 0;
    if(!can_respond){
        setDisabledMessage('You are not authorized to approve/reject this request');
        setIsResponseDisabled(true);
        return;
    }
    can_respond = can_respond && (email_index < 1 || orderRequestData.responded_by_email?.find(e => e.toLowerCase() === roApprovers[email_index-1]));
    if(!can_respond){
        setDisabledMessage('You cannot approve/reject this request unless your previous approver approves it first.');
        setIsResponseDisabled(true);
        return;
    }
    can_respond = can_respond && !orderRequestData.responded_by_email?.find(e => e.toLowerCase() === email);
    if(!can_respond){
        setDisabledMessage('You have already responded to this request');
        setIsResponseDisabled(true);
        return;
    }
    setDisabledMessage('');
    setIsResponseDisabled(false);
    
  },[roApprovers,orderRequestData,requestStatus]);
  useEffect(()=>{
    const pos = po_details[0] || {};
    setPoDetails(pos);
    if(pos?.Itemset){
      let sales_unit = '';
      if(pos.SO_VALUE && (requestStatus === 'APPROVED')){
        const so_data = {
            so_number: pos.SO_NUMBER,
            so_value: pos.SO_VALUE,
            so_date: pos.SO_DATE,
          };
        setSoData(so_data);
      }else{
        setSoData(null);
      }

      if(pos?.partnerset.length){
        const ship_to = pos.partnerset.filter(o => o.PARTN_ROLE === 'WE')[0];
        const unloading = pos.partnerset.filter(o => o.PARTN_ROLE === 'Y1')[0];
        
        setShipTo({name:ship_to.PARTN_NAME, code:ship_to.PARTN_NUMB});
        if(isUndefined(unloading))
            setUnloading({name:ship_to.PARTN_NAME, code:ship_to.PARTN_NUMB});
        else
            setUnloading({name:unloading.PARTN_NAME, code:unloading.PARTN_NUMB});
      }else{
        setShipTo(null);
        setUnloading(null);
      }
      
      const table_data = pos.Itemset.map((item) => {
        sales_unit = item.SALES_UNIT;
        return {
            material: item.DESCRIPTION,
            material_code: item.MATERIAL,
            qty: item.REQ_QTY,
            ton: item.Quantity_Ton.split(' ')[0],
            distribution_channel: item.DISTR_CHAN,
            division: item.DIVISION,
            sales_org: +(item.SALES_ORG),
            open_order: item.open_order,
            stock_in_hand: item.stock_in_hand,
            stock_in_transit: item.stock_in_transit,
        };
      });
      setSalesUnit(sales_unit);
      setTableData(table_data);
    }
  },[po_details]);

  useEffect(()=>{
      if (distributor_profile) {
          getPDPWindows(distributor_profile.group5_id)
      const ASM = distributor_profile?.asm?.map(o => `${o.first_name ? o.first_name : 'NA'} ${o.last_name ? o.last_name : ''} (${o.code ? o.code : 'NA'})`);
      const TSE = distributor_profile?.tse?.map(o => `${o.first_name ? o.first_name : 'NA'} ${o.last_name ? o.last_name : ''} (${o.code ? o.code : 'NA'})`);
      setAsm(ASM ? ASM : ['NA']);
      setTse(TSE ? TSE : ['NA']);
    }
  },[distributor_profile]);

  useEffect(() => {
    async function updateOrderRequest(payload){
        const response = await updateRushOrderRequest(payload);
        if(response.success){
            notificationSender(true, 'Success', 'Request approved successfully');
        }else{
            notificationSender(false, 'Error', 'Order created but failed to update request status');
        }
        orderCreationData.current = null;
        submitPayload.current = null;
        setRefresh(!refresh);
        setRequestStatus('APPROVED');
    }

    async function approveRequest(payload){
        const response = await approveRushOrderRequest(payload);
        if(response.success){
            notificationSender(true, 'Success', 'Request approved successfully');
        }else{
            notificationSender(false, 'Error', 'Order created but failed to update request status');
        }
        orderCreationData.current = null;
        submitPayload.current = null;
        setRefresh(!refresh);
        setRequestStatus('APPROVED');
    }
    
    if(willSubmit === false && orderCreationData.current){
        history.replace({ pathname: location.pathname });
        try{
            if(orderCreationData.current.createSuccess){
                const result = orderCreationData.current.createData.NAVRESULT.results[0];
                if(result?.PoNumber){
                    const createPayload = {
                        queryParams : {
                            po_number: result.PoNumber,
                            distributor_id: result.Sold_to,
                            status: 'APPROVED',
                            so_number: result.SalesOrder,
                            so_amount: result.Net_value,
                            distributor_name: distributor_profile.name,
                            distributor_email: distributor_profile.email,
                            tse_email: distributor_profile?.tse?.filter(o => o.email).map(o => o.email),
                            asm_email: distributor_profile?.asm?.filter(o => o.email).map(o => o.email),
                            rsm_email: distributor_profile?.rsm?.filter(o => o.email).map(o => o.email),
                            cluster_email: distributor_profile?.cluster?.filter(o => o.email).map(o => o.email),
                            request_date: po_details[0].REQ_DATE_H,
                        }
                    }
                    updateOrderRequest(createPayload);
                }else{
                    const approvePayload = {
                        queryParams : {
                            po_number: po_number,
                            distributor_id: distributor_profile.id,
                            distributor_name: distributor_profile.name,
                            distributor_email: distributor_profile.email,
                            tse_email: distributor_profile?.tse?.filter(o => o.email).map(o => o.email),
                            asm_email: distributor_profile?.asm?.filter(o => o.email).map(o => o.email),
                            rsm_email: distributor_profile?.rsm?.filter(o => o.email).map(o => o.email),
                            cluster_email: distributor_profile?.cluster?.filter(o => o.email).map(o => o.email),
                            request_date: po_details[0].REQ_DATE_H,
                        }
                    }
                    approveRequest(approvePayload);
                }
                
            }else{
                notificationSender(false, 'Error', 'Failed to approve request');
            }
        }catch(e){
            notificationSender(false, 'Error', 'Failed to approve request since error in order creation response.');
        }
        orderCreationData.current = null;
    }
  },[willSubmit]);

  const notificationSender = (success, message, description) => {
    if (success) {
        notification.success({
            message: message,
            description: description,
            duration: 6,
            className: 'notification-green',
        });
    } else {
        notification.error({
            message: message,
            description: description,
            duration: 6,
            className: 'notification-error',
        })
    }
  }

  async function canRespond(){
    if(!isRushOrderResponseEnabled){
        notificationSender(false, 'Error', 'Rush Order Approval/Rejection is disabled by Admin.');
        return false;
    }
    if(!orderRequestData?.requested_on){
        notificationSender(false, 'Error', 'Cannot fetch order request date. Try again after some time.');
        return false;
    }
    if(orderRequestData.status === 'APPROVED'){
        notificationSender(false, 'Error', 'Request already approved');
        return false;
    }
    if(orderRequestData.status === 'REJECTED'){
        notificationSender(false, 'Error', 'Request already rejected');
        return false;
    }
    const email_index = roApprovers.indexOf(email);
    if(email_index < 0){
        notificationSender(false, 'Error', 'You are not authorized to approve/reject this request');
        return false;
    }
    const dateString = (email_index === 0) ? orderRequestData.requested_on 
                                            : orderRequestData.responded_on[orderRequestData.responded_by_email.findIndex(e => e.toLowerCase() === roApprovers[email_index-1])];

    const request_date = new Date(dateString);
    const diff_hours = Math.abs(new Date() - request_date) / 36e5;
    if((email_index === 0 && diff_hours >= expiryHours.current) || (email_index > 0 && diff_hours >= expiryHours2.current)){
        notificationSender(false, 'Expired', `Request with PO No.- ${orderRequestData.po_number} has expired`);
        const setExpiredResponse = await setROExpired();
        if(setExpiredResponse.success){
            setRefresh(!refresh);
        }
        return false;
    }
    
    if(email_index > 0 && !orderRequestData.responded_by_email?.find(e => e.toLowerCase() === roApprovers[email_index-1])){
        notificationSender(false, 'Error', 'You cannot approve/reject this request unless your previous approver approves it first.');
        return false;
    }
    if(orderRequestData.responded_by_email?.find(e => e.toLowerCase() === email)){
        notificationSender(false, 'Error', 'You have already responded to this request');
        return false;
    }
    return true;
  }

  const handleApprove = async() => {
    history.replace({ pathname: location.pathname });
    const canRespondFlag = await canRespond();
    if(!canRespondFlag)
        return;
    if(totalApprovals.current === 0 || approvalCount.current < totalApprovals.current){
        if(poDetails && Object.keys(poDetails).length && distributor_profile && Object.keys(distributor_profile).length){
            const email_index = roApprovers.indexOf(email);
            const isApproved = email_index === (roApprovers.length - 1);
            if(isApproved){
                submitPayload.current = {po_details:poDetails,distributor_profile,requested_by:orderRequestData.requested_by};
                setWillSubmit(true);
            }else{
                const approvePayload = {
                    queryParams : {
                        po_number: po_number,
                        distributor_id: distributor_id,
                        status: 'PENDING',
                        distributor_name: distributor_profile.name,
                        distributor_email: distributor_profile.email,
                        tse_email: distributor_profile?.tse?.filter(o => o.email).map(o => o.email),
                        asm_email: distributor_profile?.asm?.filter(o => o.email).map(o => o.email),
                        rsm_email: distributor_profile?.rsm?.filter(o => o.email).map(o => o.email),
                        cluster_email: distributor_profile?.cluster?.filter(o => o.email).map(o => o.email),
                        request_date: po_details[0].REQ_DATE_H,
                        tentative_amount: po_details[0].OrderAmount+"",
                        location: `${distributor_profile?.group5} - ${distributor_profile?.area_code}`,
                        rsm: distributor_profile?.rsm?.map(o => `${o?.first_name} ${o?.last_name}`).join(', ') || '-',
                        reason: orderRequestData.reason ?? 'Others',
                        comments: orderRequestData.comments ?? '-',
                    }
                }
                setWillSubmit(true);
                const approve_response = await updateRushOrderRequest(approvePayload);
                setWillSubmit(false);
                
                if(approve_response.success){
                    notificationSender(true, 'Success', 'Request approved successfully');
                    setRefresh(!refresh);
                }else{
                    notificationSender(false, 'Error', 'Failed to approve request');
                }
            }
            
        }
    }else{
        notificationSender(false, 'Error', 'You have reached the maximum limit of approvals for the month of ' + current_month);
    }
  }

  const handleReject = async() => {
    history.replace({ pathname: location.pathname });
    const canRespondFlag = await canRespond();
    if(!canRespondFlag)
        return;
    const rejectPayload = {
        queryParams : {
            po_number: po_number,
            distributor_id: distributor_id,
            status: 'REJECTED',
            distributor_name: distributor_profile.name,
            distributor_email: distributor_profile.email,
            tse_email: distributor_profile?.tse?.filter(o => o.email).map(o => o.email),
            asm_email: distributor_profile?.asm?.filter(o => o.email).map(o => o.email),
            rsm_email: distributor_profile?.rsm?.filter(o => o.email).map(o => o.email),
            cluster_email: distributor_profile?.cluster?.filter(o => o.email).map(o => o.email),
            request_date: poDetails.REQ_DATE_H,
        }
    }
    setWillSubmit(true);
    const reject_response = await updateRushOrderRequest(rejectPayload);
    setWillSubmit(false);
    
    if(reject_response.success){
        notificationSender(true, 'Success', 'Request rejected successfully');
        setRefresh(!refresh);
        setRequestStatus('REJECTED');
    }else{
        notificationSender(false, 'Error', 'Failed to reject request');
    }
  }
  
  useEffect(()=>{
    if(poDetails?.Itemset && distributor_profile?.name && orderRequestData){
        if(location.state){
            const {action} = location?.state; 
            if(action === 'approve' && roApprovers.length){
                handleApprove();
            }else if(action === 'reject' && roApprovers.length){
                handleReject();
            }
        }
    }
  },[requestStatus,orderRequestData,location?.state, poDetails, distributor_profile, roApprovers]);

  return (
    <>
      <div className="admin-dashboard-wrapper">
        <div className="admin-dashboard-block">
            <div className="distributor_info">
                <div className="row1">
                    <div className="col1">Name: {distributor_profile?.name}</div>
                    <div className="col2">Area: {distributor_profile?.region}</div>
                </div>
                <div className="row2">
                    <div className="col1">ASM: {asm?.map(o => { return (<span style={{margin: '0px 5px'}}>{o}</span>)})}</div>
                    <div className="col2">TSE: {tse?.map(o => { return (<span style={{margin: '0px 5px'}}>{o}</span>)})}</div>
                </div>
                <div className="row3">
                    <div className="col1">Ship To: {shipTo ? `${shipTo.name} (${shipTo.code})` : '-'}</div>
                    <div className="col2">Unloading: {unloading? `${unloading.name} (${unloading.code})`: '-'}</div>
                </div>
                <div className="row4">
                    <div className="col1">PO Number: {po_number}</div>
                    <div className="col2">Status: 
                        <span className={(requestStatus === 'APPROVED') ? "status-approved" 
                                            : (requestStatus === 'REJECTED')? "status-rejected" 
                                              : (requestStatus === 'PENDING')? "status-pending" 
                                                : "status-expired"}>
                            {requestStatus}
                        </span>
                    </div>
                </div>

                {soData && requestStatus === 'APPROVED' &&
                    <div className="row5">
                        <div className="col1">SO Number: {soData.so_number}</div>
                        <div className="col2">Net Value: {requestStatus === 'APPROVED' ? `${RUPEE_SYMBOL} ${soData.so_value}`: `${soData.so_value}`}</div>
                        <div className="col3">Order Date: {soData?.so_date ? `${Util.formatDate(soData.so_date)} , ${Util.formatTime(soData.so_date)}` : 'NA'}</div>
                    </div>
                }

                {/* active PDP */}
                <table className="pdp-tbl"  >
                    <thead>
                    <tr>
                        <th style={{ width: '27%' }}>PDP Day (Active)</th>
                        <th style={{ width: '32%' }}>Plant Code!
                        <Popover content={contents} placement="bottom" trigger="hover"
                            className="th-info-icon">
                            <InfoCircleFilled />
                        </Popover>
                        </th>
                        <th>Division</th>
                    </tr>
                    </thead>
                </table>
                <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-pdp-tbl">
                    <Collapse.Panel>
                    <table className="pdp-tbl">
                        <tbody>
                        {
                            activePdp?.map((item) => (
                                <tr key={item.div} >
                                    <td style={{ width: '27%' }} >{item.pdp === undefined ? 'N/A' : item.pdp}</td>
                                    <td style={{ width: '32%' }} >{item.plant === undefined ? 'N/A' : item.plant}</td>
                                    <td>{item.div === undefined ? 'N/A' : item.div}</td>
                                </tr>
                            ))
                        }
                        {
                            activePdp.length === 0 && (
                                <tr key='0' >
                                    <td style={{ width: '27%' }} >N/A</td>
                                    <td style={{ width: '32%' }} >N/A</td>
                                    <td>N/A</td>
                                </tr>
                            )
                        }
                        </tbody>
                    </table>
                    </Collapse.Panel>
                </Collapse>

                {/* upcoming PDP */}
                <table className="pdp-tbl"  >
                    <thead>
                    <tr>
                        <th style={{ width: '27%' }}>PDP Day (Upcoming)</th>
                        <th style={{ width: '32%' }}>Plant Code!
                        <Popover content={contents} placement="bottom" trigger="hover"
                            className="th-info-icon">
                            <InfoCircleFilled />
                        </Popover>
                        </th>
                        <th>Division</th>
                    </tr>
                    </thead>
                </table>
                <Collapse bordered={false} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />} className="collapse-pdp-tbl">
                    <Collapse.Panel>
                    <table className="pdp-tbl">
                        <tbody>
                        {
                            inactivePdp?.map((item) => (
                                <tr key={item.div} >
                                    <td style={{ width: '27%' }} >{item.pdp === undefined ? 'N/A' : item.pdp}</td>
                                    <td style={{ width: '32%' }} >{item.plant === undefined ? 'N/A' : item.plant}</td>
                                    <td>{item.div === undefined ? 'N/A' : item.div}</td>
                                </tr>
                            ))
                        }
                        {
                            inactivePdp.length === 0 && (
                                <tr key='0' >
                                    <td style={{ width: '27%' }} >N/A</td>
                                    <td style={{ width: '32%' }} >N/A</td>
                                    <td>N/A</td>
                                </tr>
                            )
                        }
                        </tbody>
                    </table>
                    </Collapse.Panel>
                </Collapse>
            </div>
            
            {requestStatus === 'PENDING'
                && <div className="order-btns">
                    <div className='dis-message'>{disabledMessage}</div>
                    <button className='approve-btn' disabled={willSubmit || isResponseDisabled} onClick={handleApprove}>Approve</button>
                    <button className='reject-btn' disabled={willSubmit || isResponseDisabled} onClick={handleReject}>Reject</button>
                </div>
            }
            <div className="admin-dashboard-table">
              <Loader>
                <table>
                    <thead>
                        <tr>
                            <th className="width25" style={{ textAlign: "center" }}>Material</th>
                            <th className="width15" style={{ textAlign: "center" }}>Material Code</th>
                            <th className="width15" style={{ textAlign: "center" }}>Quantity (in {salesUnit !== ''? salesUnit: 'CV'})</th>
                            <th className="width15" style={{ textAlign: "center" }}>Quantity (in tonnes)</th>
                            <th className="width10" style={{ textAlign: "center" }}>SIH</th>
                            <th className="width10" style={{ textAlign: "center" }}>SIT</th>
                            <th className='width10' style={{ textAlign: "center" }}>OO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((item, index) => (
                            <tr key={index}>
                                <td className="width25" >{item.material}</td>
                                <td className="width15" style={{ textAlign: "center" }}>{item.material_code}</td>
                                <td className="width15" style={{ textAlign: "center" }}>{item.qty}</td>
                                <td className="width15" style={{ textAlign: "center" }}>{item.ton}</td>
                                <td className="width10" style={{ textAlign: "center" }}>{item.stock_in_hand === "" ? "-" : item.stock_in_hand}</td>
                                <td className="width10" style={{ textAlign: "center" }}>{item.stock_in_transit === "" ? "-" : item.stock_in_transit}</td>
                                <td className="width10" style={{ textAlign: "center" }}>{item.open_order === "" ? "-" : item.open_order}</td>
                            </tr>
                        ))}
                        {tableData.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: "center" }}>No data found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
              </Loader>
            </div>
        </div>
      </div>
      {willSubmit && submitPayload.current && 
        <ValidateNSubmit 
              po_data={submitPayload.current.po_details} 
            distributor_data={submitPayload.current.distributor_profile} 
            raised_by={submitPayload.current.requested_by}
            liquidation={false} 
            selflifting={false} 
            autoOrder={false} 
            validateSubmit={willSubmit}
            afterSubmit={setWillSubmit}
            submitResponse={orderCreationData} />}
      
      
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    po_details: state.dashboard.get('po_details'),
    distributor_profile: state.dashboard.get('region_details'),
    app_level_configuration: state.auth.get('app_level_configuration'),
      pdp_windows: state.auth.get('pdp_windows'),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
      getPODetails: (po_number,distributor_id) => dispatch(DashAction.getPODetails(po_number,distributor_id)),
      getRegionDetails: (distributor_id) => dispatch(DashAction.getRegionDetails(distributor_id)),
      updateRushOrderRequest: (data) => dispatch(AdminAction.updateRushOrderRequest(data)),
      fetchOrderRequest: (po_number) => dispatch(AdminAction.fetchOrderRequest(po_number)),
      setROExpired : () => dispatch(AuthAction.setROExpired()),
      getAppSettingList: () => dispatch(AdminAction.getAppSettingList()),
      getRushOrderApprovalCount: () => dispatch(AdminAction.getRushOrderApprovalCount()),
      approveRushOrderRequest: (data) => dispatch(AdminAction.approveRushOrderRequest(data)),
      getPDPWindows: (regionId) => dispatch(AdminAction.getPDPWindow(regionId))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RushOrderDetails);
