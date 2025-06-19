import React, { useState, useEffect, useRef, useReducer } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import * as AdminAction from '../actions/adminAction';
import * as DashAction from '../../distributor/actions/dashboardAction';
import * as AuthAction from '../../auth/action';
import debounce from 'lodash.debounce';
import { Select, notification, Tooltip, Popconfirm  } from 'antd';
import { CloseCircleOutlined, EyeOutlined, CheckCircleOutlined, SendOutlined } from '@ant-design/icons';
import { hasViewPermission, hasRespondPermission, pages, features } from '../../../persona/requests';
import Loader from '../../../components/Loader';
import Util from '../../../util/helper/index';
import Panigantion from '../../../components/Panigantion';
import DropdownCheckbox from '../../../layout/DropdownCheckbox';
import ValidateNSubmit from './ValidateNSubmit';
import Auth from '../../../util/middleware/auth';

const RushOrderRequests = (props) => {
  
  const [tableData, setTableData] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState('');
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [tableDataCount, setTableDataCount] = useState(0);
  const [approvalCount, setApprovalCount] = useState(0);
  const [areaCodes, setAreaCodes] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedAreaCodes, setSelectedAreaCodes] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [isRegionFilterOpen, setIsRegionFilterOpen] = useState(false);
  const [isAreaFilterOpen, setIsAreaFilterOpen] = useState(false);
  const [willSubmit, setWillSubmit] = useState(false);
  const [responseCount, setResponseCount] = useState(0);
  const [totalApprovals, setTotalApprovals] = useState(0);
  const [roExpiry, setRoExpiry] = useState(24);
  const [isROResponseEnabled, setIsROResponseEnabled] = useState(false);
  const [roApprovers, setRoApprovers] = useState([]);
  const [roExpiry2, setRoExpiry2] = useState(24);

  const { getRushOrderRequests, getRushOrderApprovalCount, ro_approval_count, dashboardFilterCategories, dashboard_filter_categories, getPODetails, getRegionDetails, updateRushOrderRequest, app_level_configuration, fetchOrderRequest,  setROExpired, approveRushOrderRequest, sendROApprovalEmail } = props;
  const browserHistory = props.history;
  const roStatus = [{ label: 'ALL', value: 'ALL' }, { label: 'PENDING', value: 'PENDING' }, { label: 'APPROVED', value: 'APPROVED' }, { label: 'REJECTED', value: 'REJECTED' }, { label: 'EXPIRED', value: 'EXPIRED' }];
  const debouncedSearch = useRef(debounce((nextValue) => setSearch(nextValue), 500),).current;
  const monthNames = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];
  const currentMonth = monthNames[(new Date()).getMonth()];
  const submitPayload = useRef(null);
  const orderCreationData = useRef(null);
  // const email = Auth.getUserEmail()?.toLowerCase();
  const email = Auth.getSSOUserEmail()?.toLowerCase();
  const sortDirection = useRef(true);
  const [, /* ignored */ forceUpdate] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    async function fetchApprovalCount(){
        const res = await getRushOrderApprovalCount();
        if(res.success){
        }else{
            notificationSender(false, 'Error', 'Failed to fetch rush order approval count');
        }
    }
    // fetchApprovalCount();
  },[getRushOrderApprovalCount,responseCount]);

  useEffect(() => {
    if(app_level_configuration){
        const keys = ['RO_EXPIRY_WINDOW','RO_APPROVALS','ENABLE_RO_RESPONSE','RO_APPROVERS','RO_EXPIRY_WINDOW_2'];
        const keysMap = new Map();
        app_level_configuration.filter((item) => keys.includes(item.key)).forEach((item) => {
            keysMap.set(item.key,item.value);
        });
        // setTotalApprovals(parseInt(getOrDefault(keysMap,'RO_APPROVALS',0)));
        setRoExpiry(parseInt(getOrDefault(keysMap,'RO_EXPIRY_WINDOW',24)));
        setRoExpiry2(parseInt(getOrDefault(keysMap,'RO_EXPIRY_WINDOW_2',24)));
        setIsROResponseEnabled(getOrDefault(keysMap,'ENABLE_RO_RESPONSE','NO') === 'YES');
        setRoApprovers(getOrDefault(keysMap,'RO_APPROVERS','')?.split(',').filter(o => o.trim().length > 8).map(o => o.trim().toLowerCase()));
    }
  },[app_level_configuration]);

  useEffect(() => {
    // setApprovalCount(ro_approval_count);
  }, [ro_approval_count]);
  
  useEffect(() => {
    async function fetchRORequests(data) {
      const payload = { queryParams: data };
      const res = await getRushOrderRequests(payload);
      if (res.success) {
        setTableData(res.data.rows);
        setTableDataCount(res.data.totalCount);
      }else{
        notificationSender(false, 'Error', res.message);
      }
    }
    const payload_data = { status, region: selectedRegions, area: selectedAreaCodes, search, limit, offset };
    fetchRORequests(payload_data);
    
  }, [getRushOrderRequests, status, search, limit, offset, selectedAreaCodes, selectedRegions, responseCount]);

  useEffect(() => {
    async function fetchFilterCategories() {
        const res = await dashboardFilterCategories();
        if (res) {
            const area_details = res?.response?.area_details;
            const area_codes = new Set();
            const regions = new Set();
            area_details.forEach((item) => {
                if(item.area_code && item.area_code !== '')
                    area_codes.add(item.area_code);
                if(item.region && item.region !== '')
                    regions.add(item.region);
            });
            setAreaCodes(Array.from(area_codes).sort((a,b) => a.localeCompare(b, 'en-US', { sensitivity: 'base' })));
            setRegions(Array.from(regions).sort((a,b) => a.localeCompare(b, 'en-US', { sensitivity: 'base' })));
        } else {    
            notificationSender(false, 'Error', 'Cannot fetch regions and area details');
        }
    }
    fetchFilterCategories();
  }, [dashboardFilterCategories]);

  useEffect(() => {
    async function updateOrderRequest(payload){
        const response = await updateRushOrderRequest(payload);
        if(response.success){
            notificationSender(true, 'Success', 'Request approved successfully');
            setResponseCount(responseCount+1);
        }else{
            notificationSender(false, 'Error', 'Order created but failed to update request status');
        }
        submitPayload.current = null;
        orderCreationData.current = null;
    }
    async function approveRequest(payload){
        const response = await approveRushOrderRequest(payload);
        if(response.success){
            notificationSender(true, 'Success', 'Request approved successfully');
            setResponseCount(responseCount+1);
        }else{
            notificationSender(false, 'Error', 'Order created but failed to update request status');
        }
        submitPayload.current = null;
        orderCreationData.current = null;
    }
    if(willSubmit === false && orderCreationData.current){
        try{
          if(orderCreationData.current.createSuccess){
            const result = orderCreationData.current.createData.NAVRESULT.results[0];
            const { po_details, distributor_profile } = submitPayload.current;
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
                      po_number: po_details[0].PURCH_NO,
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

  const getOrDefault = (map, key, defaultValue) => {
    return map.has(key) ? map.get(key) : defaultValue;
  }

  function isSubset(arr1, arr2) {
    return arr2.every(item => arr1.some(e => e.toLowerCase() === item.toLowerCase()));
  }


  const notificationSender = (success, message, description) => {
    if (success) {
        notification.success({
            message: message,
            description: description,
            duration: 5,
            className: 'notification-green',
        });
    } else {
        notification.error({
            message: message,
            description: description,
            duration: 5,
            className: 'notification-error',
        })
    }
  }

  const onSearch = (e) => {
    const { value } = e.target;
    debouncedSearch(value);
    setShowSearch(value);
    setOffset(0);
    setPageNo(1);
  };

  const resetPage = () => {
    debouncedSearch('');
    setShowSearch('');
    setOffset(0);
    setPageNo(1);
  };

  const statusChangeHandler = (value) => {
    setStatus(value);
    setLimit(itemsPerPage);
    setOffset(0);
    setPageNo(1);
  }

  const onChangePage = (page, itemsPerPage) => {
    setLimit(itemsPerPage);
    setOffset((page - 1) * limit);
    setPageNo(page);
  }

  const tabFunction = (value) => {
    if (value === 'Sales Hierarchy Requests') {
      if (hasRespondPermission(pages.SHR)) {
        browserHistory.push({ pathname: "/admin/pending-requests", state: { tabState: "Sales Hierarchy Requests" } });
      } else {
        browserHistory.push({ pathname: "/admin/tse-requests", state: { tabState: "Sales Hierarchy Requests" } });
      }
    } else if (value === 'Service Delivery Requests') {
        browserHistory.push({ pathname: "/admin/cfa-so-requests", state: { tabState: "Service Delivery Requests" } });
    } else if (value === 'Pdp Update Requests') {
      browserHistory.push({ pathname: "/admin/pdp-update", state: { tabState: "Pdp Update Requests" } });
    } else if(value === 'Plant Update Requests'){
      browserHistory.push({ pathname: "/admin/tse-requests", state: { tabState: "Plant Update Requests" } });
    } else{
      browserHistory.push({ pathname: "/admin/pdp-unlock-requests", state: { tabState: "PDP Unlock Requests" } });
    
    }

    setShowSearch('');
    debouncedSearch('');
    setStatus('ALL');
  }

  async function canRespond(request){
    if(!isROResponseEnabled){
        notificationSender(false, 'Error', 'Rush Order Approval/Rejection is disabled by Admin.');
        return false;
    }
    if(request.status === 'APPROVED'){
      notificationSender(false, 'Error', 'Request already approved');
      return false;
    }
    if(request.status === 'REJECTED'){
        notificationSender(false, 'Error', 'Request already rejected');
        return false;
    }
    const email_index = roApprovers.indexOf(email);
    if(email_index < 0){
        notificationSender(false, 'Error', 'You are not authorized to approve/reject this request');
        return false;
    }
    const dateString = (email_index === 0) ? request.requested_on 
                                            : request.responded_on[request.responded_by_email.findIndex(e => e.toLowerCase() === roApprovers[email_index-1])];

    const request_date = new Date(dateString);
    const diff_hours = Math.abs(new Date() - request_date) / 36e5;
    if((email_index === 0 && diff_hours >= roExpiry) || (email_index > 0 && diff_hours >= roExpiry2)){
        notificationSender(false, 'Expired', `Request with PO No.- ${request.po_number} has expired`);
        const setExpiredResponse = await setROExpired();
        if(setExpiredResponse.success){
            setResponseCount(responseCount+1);
        }
        return false;
    }
    
    
    if(email_index > 0 && !request.responded_by_email?.find(e => e.toLowerCase() === roApprovers[email_index-1])){
        notificationSender(false, 'Error', 'You cannot approve/reject this request unless your previous approver approves it first.');
        return false; 
    }
    if(request.responded_by_email?.find(e => e.toLowerCase() === email)){
        notificationSender(false, 'Error', 'You have already responded to this request');
        return false;
    }
    return true;
  }

  const  handleApprove = async (item) => {
    const canRespondFlag = await canRespond(item);
    if(!canRespondFlag)
      return;
    if(totalApprovals === 0 || approvalCount < totalApprovals){
      const { po_number, distributor_id, reason, comments } = item;
      const request_date_respone = await fetchOrderRequest(po_number);
      if(request_date_respone.success){
        const po_details  = await getPODetails(po_number,distributor_id);
        const distributor_profile = await getRegionDetails(distributor_id);
        submitPayload.current = { po_details, distributor_profile, requested_by: request_date_respone.data.requested_by };
    
        if(po_details && distributor_profile){
          const email_index = roApprovers.indexOf(email);
          const isApproved = email_index === (roApprovers.length - 1);
          if(isApproved){
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
                  reason: reason ?? 'Others',
                  comments: comments ?? '-',
              }
            }
            const approve_response = await updateRushOrderRequest(approvePayload);
            if(approve_response.success){
                notificationSender(true, 'Success', 'Request approved successfully');
                setResponseCount(responseCount+1);
            }else{
                notificationSender(false, 'Error', approve_response.message);
            }
          }
        }
      }else{
          notificationSender(false, 'Error', 'Failed to fetch request date. Try again after some time.');
      }
    }else{
        notificationSender(false, 'Error', 'You have reached the maximum limit of approvals for the month of ' + currentMonth);
    }
    
  }
  const handleReject = async (item) => {
    const canRespondFlag = await canRespond(item);
    if(!canRespondFlag)
      return;
    const {distributor_id, po_number} = item;
    const request_date_respone = await fetchOrderRequest(po_number);
    if(request_date_respone.success){
      const po_details  = await getPODetails(po_number,distributor_id);
      const distributor_profile = await getRegionDetails(distributor_id);
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
              request_date: po_details[0].REQ_DATE_H,
          }
      }
      const reject_response = await updateRushOrderRequest(rejectPayload);
      if(reject_response.success){
          notificationSender(true, 'Success', 'Request rejected successfully');
          setResponseCount(responseCount+1);
      }else{
          notificationSender(false, 'Error', 'Failed to reject request');
      }
    }else{
      notificationSender(false, 'Error', 'Failed to fetch request date. Try again after some time.');
    }
  }

  const handleApprovalEmail = async (item) => {
    const { po_number, distributor_id, status, responded_by_email, reason, comments } = item;
    if(status !== 'PENDING'){
        notificationSender(false, 'Error', 'Request already '+status);
        return;
    }
    const po_details  = await getPODetails(po_number,distributor_id);
    const distributor_profile = await getRegionDetails(distributor_id);
    if(!po_details.length){
        notificationSender(false, 'Error', 'Failed to fetch PO details');
        return;
    }
    if(!distributor_profile){
        notificationSender(false, 'Error', 'Failed to fetch Distributor details');
        return;
    }
    if(roApprovers.length === 0){
        notificationSender(false, 'Error', 'No approvers set for Rush Order Requests');
        return;
    }
    const approval_no = (responded_by_email?.length) ? roApprovers.indexOf(responded_by_email[responded_by_email.length-1]?.toLowerCase()) + 1 : 0;
    if(approval_no >= roApprovers.length){
        notificationSender(false, 'Error', 'All approvers have responded to this request');
        return;
    }
    const approver_email = roApprovers[approval_no];
    const approvalEmailPayload = {
      emailParams : {
          po_number: po_number,
          distributor_id: distributor_id,
          approver_email: approver_email,
          amount: po_details[0].OrderAmount+"",
          location: `${distributor_profile?.group5} - ${distributor_profile?.area_code}`,
          rsm: distributor_profile?.rsm?.map(o => `${o?.first_name} ${o?.last_name}`).join(', ') || '-',
          reason: reason ?? 'Others',
          comments: comments ?? '-',
          approver_no: approval_no+1,
      }
    }
    if(approval_no > 0){
      approvalEmailPayload.emailParams['previous_approver_email'] = roApprovers[approval_no-1];
    }
    const email_response = await sendROApprovalEmail(approvalEmailPayload);
    if(email_response.success){
        notificationSender(true, 'Success', 'Approval email sent successfully');
    }else{
        notificationSender(false, 'Error', 'Failed to send approval email');
    }
  }

  const handleInfo = (item) => {
  }

  const regionChangeHandler = (value) => {
  }

  const regionSavaHandler = (value) => {
    setSelectedRegions(value);
    setSelectedAreaCodes([]);
    const area_codes = new Set();
    if(value.length > 0){
        dashboard_filter_categories
        .response.area_details
        .forEach((item) => {
            if (value.includes(item.region))
                area_codes.add(item.area_code);
        })
    }else{
        dashboard_filter_categories
        .response.area_details
        .forEach((item) => {
            if(item.area_code && item.area_code !== '')
            area_codes.add(item.area_code);
        })
    }
    setAreaCodes(Array.from(area_codes).sort((a,b) => a.localeCompare(b, 'en-US', { sensitivity: 'base' })));
  }

  const areaSaveHandler = (value) => {
    setSelectedAreaCodes(value);
  }

  const sortColumn = (columnName) => {
    sortDirection.current = !sortDirection.current;
    if (sortDirection.current) {
      tableData.sort((a, b) => {
        let comparison = 0;
        if (a[columnName] < b[columnName]) {
          comparison = -1;
        }
        if (a[columnName] > b[columnName]) {
          comparison = 1;
        }
        return comparison;
      });
    } else {
      tableData.sort((a, b) => {
        let comparison = 0;
        if (a[columnName] < b[columnName]) {
          comparison = -1;
        }
        if (a[columnName] > b[columnName]) {
          comparison = 1;
        }
        return comparison * -1;
      });
    }
    setTableData(tableData);
    forceUpdate();
  };

  return (
    <>
      <div className="admin-dashboard-wrapper">
        <div className="admin-dashboard-block">
          <div className="sdr-dashboard-head">
            <h2>Rush Order Requests</h2>
            <div className="header-btns-filters">
              <div className="sdr-dashboard-search">
                <input
                  type="text"
                  className="search-fld"
                  placeholder="Search by PO No./ SO No./ DB Name/ DB Code/ PO amount"
                  value={showSearch}
                  onChange={(e) => {onSearch(e)}}
                />
                <div onClick={resetPage} className="search-close"><CloseCircleOutlined /></div>
              </div>
              <div className='sdr-status-filter'>
                <Select
                  showSearch
                  style={{ fontSize: '13px' }}
                  placeholder="Select sdr status"
                  defaultValue={'ALL'}
                  optionFilterProp="children"
                  onChange={statusChangeHandler}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={roStatus}
                />
              </div>
            </div>
          </div>
          <div className='hbr-message'>
                {totalApprovals > 0 && <span>You have approved {approvalCount} out of {totalApprovals} Rush Order request(s) for the month of {currentMonth}.</span>}
                <span>Rush Order requests need to be approved by first approver within {roExpiry} hours from creation.</span>
          </div>
          <div className="dashboard-neck">
            <div className="req-tabs">
              {hasViewPermission(pages.SHR) && <button id="salesHierarchy" className={`tablink`} onClick={() => { tabFunction('Sales Hierarchy Requests') }}>Sales Hierarchy</button>}
              {hasViewPermission(pages.PDP_REQUESTS) && <button id="pdpUpdate" className={`tablink`} onClick={() => { tabFunction('Pdp Update Requests') }}>PDP Update</button>}
              {hasViewPermission(pages.PDP_UNLOCK) && <button id="pdpUnlock" className={`tablink`} onClick={() => { tabFunction('PDP Unlock Requests') }}>PDP Unlock</button>}
              {hasViewPermission(pages.PLANT_REQUEST) && <button id="plantUpdate" className={`tablink`} onClick={() => { tabFunction('Plant Update Requests') }}>Plant Update</button>}
              {hasViewPermission(pages.SDR) && <button id="serviceDelivery" className={`tablink`} onClick={() => { tabFunction('Service Delivery Requests') }}>Service Delivery</button>}
              <button id="RushOrder" className={`tablink active`} >Rush Order</button>
              
            </div>
            <div className='header-block-right'>
            
            <div className='hbr-item1'>
              <div className='dot-pending'></div> <div style={{ marginRight: '4px' }}>Pending</div>
              <div className='dot-approved'></div> <div style={{ marginRight: '4px' }}>Approved</div>
              <div className='dot-rejected'></div> <div style={{ marginRight: '4px' }}>Rejected</div>
              <div className='dot-expired'></div> <div style={{ marginRight: '4px' }}>Expired</div>
            </div>
            
            </div>
          </div>

          <div className="admin-dashboard-table">
            
            <Loader>
              <table>
                <thead>
                  <tr>
                    <th className="width15" style={{ textAlign: "center" }}
                      onClick={() => sortColumn('po_number')}>
                      PO Number&nbsp;
                      <img
                        src="/assets/images/sorting_icon.svg"
                        alt=""
                      />
                    </th>
                    <th className="width15" style={{ textAlign: "center" }}
                      onClick={() => sortColumn('requested_on')}>
                      Request Date&nbsp;
                      <img
                        src="/assets/images/sorting_icon.svg"
                        alt=""
                      />
                    </th>
                    <th className="width5" style={{ textAlign: "center" }}>
                        
                        <DropdownCheckbox
                            name = "Region"
                            options={regions}
                            value={selectedRegions}
                            isOpen = {setIsRegionFilterOpen}
                            disabled = {regions.length===0 || isAreaFilterOpen}
                            onChange={regionChangeHandler}
                            onSave = {regionSavaHandler}/>
                    </th>
                    <th className="width5" style={{ textAlign: "center" }}>
                        <DropdownCheckbox
                            name = "Area"
                            options={areaCodes}
                            value={selectedAreaCodes}
                            isOpen = {setIsAreaFilterOpen}
                            disabled = {areaCodes.length===0 || isRegionFilterOpen}
                            onChange={regionChangeHandler}
                            onSave = {areaSaveHandler}/>
                    </th>
                    <th className="width20" style={{ textAlign: "center" }}
                      onClick={() => sortColumn('distributor_name')}>
                      Distributor Name&nbsp;
                      <img
                        src="/assets/images/sorting_icon.svg"
                        alt=""
                      />
                    </th>
                    <th className="width10" style={{ textAlign: "center" }}>SO Number</th>
                    <th className="width15" style={{ textAlign: "center" }}>Response Date</th>
                    <th className="width15" style={{ textAlign: "center" }}>Request By</th>
                    <th className='width5' style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                    {tableData.map((item, index) => {
                        let backgroundColor = '';
                        if(item.status === 'PENDING')
                            backgroundColor = 'rgb(242, 216, 168)';
                        else if(item.status === 'APPROVED')
                            backgroundColor = '#adefc0';
                        else if(item.status === 'REJECTED')
                            backgroundColor = 'rgb(225 95 95 / 63%)';
                        else if(item.status === 'EXPIRED')
                            backgroundColor = '#f5f6f6';
                        const encrypted_po = Util.encryptData(item.po_number).replaceAll('/', '*').replaceAll('+','-');
                        const encrypted_distributor_id = Util.encryptData(item.distributor_id).replaceAll('/', '*').replaceAll('+','-');
                        const detailsPath = `/admin/rush-order-details/${encrypted_po}/${encrypted_distributor_id}`;
                        const email_index = roApprovers.indexOf(email);
                        const canRespondFlag = hasRespondPermission(pages.RO_REQUESTS) 
                                                && item.status === 'PENDING' 
                                                && email_index >= 0 
                                                && (email_index < 1 || item.responded_by_email?.find(i => i.toLowerCase() === roApprovers[email_index-1])) 
                                                && !item.responded_by_email?.find(i => i.toLowerCase() === email);
                        const next_approver_index = (item.responded_by_email?.length) ? roApprovers.indexOf(item.responded_by_email[item.responded_by_email.length-1]?.toLowerCase()) + 1 : 0;
                        const next_approver = (next_approver_index < roApprovers.length) ? roApprovers[next_approver_index] : 'next approver';
                        const confirm_message = `Are you sure to re-send approval email to '${next_approver}'?`
                        return (
                            <tr key={index} style={{ backgroundColor}}>
                                <td className="width15" style={{ textAlign: "center" }}>
                                    <Link to={{pathname: detailsPath}}>
                                        {item.po_number}
                                    </Link>
                                </td>
                                <td className="width15" style={{ textAlign: "center" }}>{Util.formatDate(item.requested_on)}, {Util.formatTime(item.requested_on)}</td>
                                <td className="width5" style={{ textAlign: "center" }}>{item.region}</td>
                                <td className="width5" style={{ textAlign: "center" }}>{item.area_code}</td>
                                <td className="width20" style={{ textAlign: "center" }}>{item.distributor_name} ({item.distributor_id})</td>
                                <td className="width10" style={{ textAlign: "center" }}>{(item.so_number)? item.so_number : "-"}</td>
                                <td className="width15" style={{ textAlign: "center" }}>{item.responded_on?.length 
                                                        ? <>{item.responded_on.map((date,ind) => (<li key={ind}>{Util.formatDate(date)}, {Util.formatTime(date)}</li>))}</> 
                                                        : "-"}</td>
                                <td className="width15" style={{ textAlign: "center" }}>{item.requested_by.split('#')[0]}</td>
                                <td className='width5 admin-ations' style={{ textAlign: "center" }}>
                                    {canRespondFlag ? <div className='action-btns'>
                                    <i className='info-icon'>
                                                                    <Tooltip placement="top" title="Approve" onClick={() => { handleApprove(item) }}><CheckCircleOutlined /></Tooltip></i>
                                                                <i className='info-icon'>
                                                                    <Tooltip placement="top" title="Reject" onClick={() => { handleReject(item) }}><CloseCircleOutlined /></Tooltip></i>
                                                                </div> 
                                                               : <div className='action-btns'>
                                                                    <i className='info-icon' onClick={() => handleInfo(item)}>
                                                                    <Tooltip placement="top" title="View">
                                                                      <Link to={{pathname: detailsPath}}>
                                                                          <EyeOutlined />
                                                                      </Link>
                                                                </Tooltip></i>
                                                                                </div>}
                                {item.status === 'PENDING' && 
                                    <div className='action-btns'>
                                        <i className='info-icon'>
                                          <Popconfirm
                                              title={confirm_message}
                                              placement="topRight"
                                              onConfirm={() => handleApprovalEmail(item)}
                                              onCancel={() => {}}
                                              okText="Yes"
                                              cancelText="No"
                                            ><Tooltip placement="bottom" title="Send email to next approver"><SendOutlined /></Tooltip>
                                          </Popconfirm>
                                        </i>
                                    </div>}
                                </td>
                            </tr>
                        );
                    })}
                    {tableData.length === 0 &&
                        <tr style={{ textAlign: 'center' }}>
                            <td colSpan="10">No request available</td>
                        </tr>}
                </tbody>
              </table>
            </Loader>
          </div>
          <Panigantion
            data={tableData ? tableData : []}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            itemsCount={tableDataCount}
            setModifiedData={onChangePage}
            pageNo={pageNo}
          />
        </div>
      </div>
      {willSubmit && submitPayload.current && 
        <ValidateNSubmit 
            po_data={submitPayload.current.po_details[0]} 
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
    ro_approval_count: state.admin.get('ro_approval_count'),
    dashboard_filter_categories: state.admin.get('dashboard_filter_categories'),
    po_details: state.dashboard.get('po_details'),
    distributor_profile: state.dashboard.get('region_details'),
    app_level_configuration: state.auth.get('app_level_configuration'),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getRushOrderRequests: (data) => dispatch(AdminAction.getRushOrderRequests(data)),
    getRushOrderApprovalCount: () => dispatch(AdminAction.getRushOrderApprovalCount()),
    dashboardFilterCategories: () => dispatch(AdminAction.dashboardFilterCategories()),
    getPODetails: (po_number,distributor_id) => dispatch(DashAction.getPODetails(po_number,distributor_id)),
    getRegionDetails: (distributor_id) => dispatch(DashAction.getRegionDetails(distributor_id)),
    updateRushOrderRequest: (data) => dispatch(AdminAction.updateRushOrderRequest(data)),
    fetchOrderRequest: (po_number) => dispatch(AdminAction.fetchOrderRequest(po_number)),
    setROExpired : () => dispatch(AuthAction.setROExpired()),
    approveRushOrderRequest: (data) => dispatch(AdminAction.approveRushOrderRequest(data)),
    sendROApprovalEmail: (data) => dispatch(AdminAction.sendROApprovalEmail(data)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RushOrderRequests);
