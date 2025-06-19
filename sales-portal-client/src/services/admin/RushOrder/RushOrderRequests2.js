import React, {
  useState,
  useEffect,
  useRef,
  useReducer,
} from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import * as AdminAction from '../actions/adminAction';
import * as DashAction from '../../distributor/actions/dashboardAction';
import debounce from 'lodash.debounce';
import { Select, notification, Tooltip, Popconfirm } from 'antd';
import {
  CloseCircleOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import RejectModal from './RejectModal';
import {
  hasViewPermission,
  hasRespondPermission,
  pages,
} from '../../../persona/requests';
import Loader from '../../../components/Loader';
import Util from '../../../util/helper/index';
import Panigantion from '../../../components/Panigantion';
import DropdownCheckbox from '../../../layout/DropdownCheckbox';
import useWindowDimensions from '../../../hooks/useWindowDimensions';
import '../requests.css'

import Auth from '../../../util/middleware/auth';
import {NO_DATA_SYMBOL} from '../../../constants/index'

const RushOrderRequests = (props) => {
  const { width } = useWindowDimensions();

  const [tableData, setTableData] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState('');
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [tableDataCount, setTableDataCount] = useState(0);
  // const [approvalCount, setApprovalCount] = useState(0);
  const [areaCodes, setAreaCodes] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedAreaCodes, setSelectedAreaCodes] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [isRegionFilterOpen, setIsRegionFilterOpen] = useState(false);
  const [isAreaFilterOpen, setIsAreaFilterOpen] = useState(false);

  const [responseCount, setResponseCount] = useState(0);
  const [totalApprovals, setTotalApprovals] = useState(0);
  const [roExpiry, setRoExpiry] = useState(24);
  const [isROResponseEnabled, setIsROResponseEnabled] =
    useState(false);
  const [roApprovers, setRoApprovers] = useState([]);
  const [roExpiry2, setRoExpiry2] = useState(24);
  const [isMassActionButtonsClicked, setIsMassActionButtonsClicked] =
    useState(false);
  const [allowMassAction, setAllowMassAction] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectItem, setRejectItem] = useState(null);
  const headerCheckBoxRef = useRef();

  const {
    getRushOrderRequests,
    getRushOrderApprovalCount,
    ro_approval_count,
    dashboardFilterCategories,
    dashboard_filter_categories,
    getPODetails,
    getRegionDetails,
    app_level_configuration,
    sendROApprovalEmail,
    updateRushOrderRequest2,
    massUpdateRushOrderRequest,
  } = props;
  const browserHistory = props.history;
  const roStatus = [
    { label: 'ALL', value: 'ALL' },
    { label: 'PENDING', value: 'PENDING' },
    { label: 'APPROVED', value: 'APPROVED' },
    { label: 'REJECTED', value: 'REJECTED' },
    { label: 'EXPIRED', value: 'EXPIRED' },
  ];
  const debouncedSearch = useRef(
    debounce((nextValue) => setSearch(nextValue), 500),
  ).current;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const currentMonth = monthNames[new Date().getMonth()];

  const email = Auth.getSSOUserEmail()?.toLowerCase();
  const sortDirection = useRef(true);
  const [, /* ignored */ forceUpdate] = useReducer((x) => x + 1, 0);
  const isMassApprove = useRef(false);
  const isMassReject = useRef(false);

  useEffect(() => {
    async function fetchApprovalCount() {
      const res = await getRushOrderApprovalCount();
      if (res.success) {
      } else {
        notificationSender(
          false,
          'Error',
          'Failed to fetch rush order approval count',
        );
      }
    }
    // fetchApprovalCount();
  }, [getRushOrderApprovalCount, responseCount]);

  useEffect(() => {
    if (app_level_configuration) {
      const keys = [
        'RO_EXPIRY_WINDOW',
        'RO_APPROVALS',
        'ENABLE_RO_RESPONSE',
        'RO_APPROVERS',
        'RO_EXPIRY_WINDOW_2',
      ];
      const keysMap = new Map();
      app_level_configuration
        .filter((item) => keys.includes(item.key))
        .forEach((item) => {
          keysMap.set(item.key, item.value);
        });
      // setTotalApprovals(parseInt(getOrDefault(keysMap,'RO_APPROVALS',0)));
      setRoExpiry(
        parseInt(getOrDefault(keysMap, 'RO_EXPIRY_WINDOW', 24)),
      );
      setRoExpiry2(
        parseInt(getOrDefault(keysMap, 'RO_EXPIRY_WINDOW_2', 24)),
      );
      setIsROResponseEnabled(
        getOrDefault(keysMap, 'ENABLE_RO_RESPONSE', 'NO') === 'YES',
      );
      setRoApprovers(
        getOrDefault(keysMap, 'RO_APPROVERS', '')
          ?.split(',')
          .filter((o) => o.trim().length > 8)
          .map((o) => o.trim().toLowerCase()),
      );
    }
  }, [app_level_configuration]);

  useEffect(() => {
    const email_index = roApprovers.indexOf(email);
    if (isROResponseEnabled && email_index >= 0) {
      setAllowMassAction(true);
    }
  }, [roApprovers]);

  useEffect(() => {
    // setApprovalCount(ro_approval_count);
  }, [ro_approval_count]);

  useEffect(() => {
    async function fetchRORequests(data) {
      const payload = { queryParams: data };
      const res = await getRushOrderRequests(payload);
      if (res.success) {
        const email_index = roApprovers.indexOf(email);
  
        const rowData = res.data.rows.map((data) => {
          const isChecked = headerCheckBoxRef.current?.checked && (
            data.status === 'PENDING' &&
            !data.responded_by_email?.find(
              (e) => e.toLowerCase() === email,
            ) &&
            (email_index < 1 ||
              data.responded_by_email?.find(
                (e) => e.toLowerCase() === roApprovers[email_index - 1],
              ))
          );
          return { checked: isChecked , ...data };
        });
        setTableData(rowData);
        setTableDataCount(res.data.totalCount);
      } else {
        notificationSender(false, 'Error', res.message);
      }
    }
    const payload_data = {
      status,
      region: selectedRegions,
      area: selectedAreaCodes,
      search,
      limit,
      offset,
    };
    fetchRORequests(payload_data);
  }, [
    getRushOrderRequests,
    status,
    search,
    limit,
    offset,
    selectedAreaCodes,
    selectedRegions,
    responseCount,
  ]);

  useEffect(() => {
    async function fetchFilterCategories() {
      const res = await dashboardFilterCategories();
      if (res) {
        const area_details = res?.response?.area_details;
        const area_codes = new Set();
        const regions = new Set();
        area_details.forEach((item) => {
          if (item.area_code && item.area_code !== '')
            area_codes.add(item.area_code);
          if (item.region && item.region !== '')
            regions.add(item.region);
        });
        setAreaCodes(
          Array.from(area_codes).sort((a, b) =>
            a.localeCompare(b, 'en-US', { sensitivity: 'base' }),
          ),
        );
        setRegions(
          Array.from(regions).sort((a, b) =>
            a.localeCompare(b, 'en-US', { sensitivity: 'base' }),
          ),
        );
      } else {
        notificationSender(
          false,
          'Error',
          'Cannot fetch regions and area details',
        );
      }
    }
    fetchFilterCategories();
  }, [dashboardFilterCategories]);

  const getOrDefault = (map, key, defaultValue) => {
    return map.has(key) ? map.get(key) : defaultValue;
  };

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
      });
    }
  };

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
  };

  const onChangePage = (page, itemsPerPage) => {
    setLimit(itemsPerPage);
    setOffset((page - 1) * limit);
    setPageNo(page);
  };

  const tabFunction = (value) => {
    if (value === 'Sales Hierarchy Requests') {
      if (hasRespondPermission(pages.SHR)) {
        browserHistory.push({
          pathname: '/admin/pending-requests',
          state: { tabState: 'Sales Hierarchy Requests' },
        });
      } else {
        browserHistory.push({
          pathname: '/admin/tse-requests',
          state: { tabState: 'Sales Hierarchy Requests' },
        });
      }
    } else if (value === 'Service Delivery Requests') {
      browserHistory.push({
        pathname: '/admin/cfa-so-requests',
        state: { tabState: 'Service Delivery Requests' },
      });
    } else if (value === 'Pdp Update Requests') {
      browserHistory.push({
        pathname: '/admin/pdp-update',
        state: { tabState: 'Pdp Update Requests' },
      });
    } else if (value === 'Plant Update Requests') {
      browserHistory.push({
        pathname: '/admin/tse-requests',
        state: { tabState: 'Plant Update Requests' },
      });
    } else {
      browserHistory.push({
        pathname: '/admin/pdp-unlock-requests',
        state: { tabState: 'PDP Unlock Requests' },
      });
    }

    setShowSearch('');
    debouncedSearch('');
    setStatus('ALL');
  };

  async function canRespond(request) {
    if (!isROResponseEnabled) {
      notificationSender(
        false,
        'Error',
        'Rush Order Approval/Rejection is disabled by Admin.',
      );
      return false;
    }
    if (request.status === 'APPROVED') {
      notificationSender(false, 'Error', 'Request already approved');
      return false;
    }
    if (request.status === 'REJECTED') {
      notificationSender(false, 'Error', 'Request already rejected');
      return false;
    }
    const email_index = roApprovers.indexOf(email);
    if (email_index < 0) {
      notificationSender(
        false,
        'Error',
        'You are not authorized to approve/reject this request',
      );
      return false;
    }

    if (
      request.responded_by_email?.find(
        (e) => e.toLowerCase() === email,
      )
    ) {
      notificationSender(
        false,
        'Error',
        'You have already responded to this request',
      );
      return false;
    }
    return true;
  }

  const handleApprove = async (item) => {
    const canRespondFlag = await canRespond(item);
    if (!canRespondFlag) return;
    // if (totalApprovals === 0 || approvalCount < totalApprovals) {
    const { po_number, distributor_id } = item;
    const approvePayload = {
      po_number,
      distributor_id,
      action: 'APPROVE',
    };
    const approve_response =
      await updateRushOrderRequest2(approvePayload);
    if (approve_response.success) {
      notificationSender(
        true,
        'Success',
        'Request approved successfully',
      );
      setResponseCount(responseCount + 1);
    } else {
      notificationSender(false, 'Error', approve_response.message);
    }
    // } else {
    //   notificationSender(
    //     false,
    //     'Error',
    //     'You have reached the maximum limit of approvals for the month of ' +
    //       currentMonth,
    //   );
    // }
  };

  const handleReject = async (item) => {
    const canRespondFlag = await canRespond(item);
    if (!canRespondFlag) return;
    setRejectItem(item);
    setRejectModalVisible(true);
  };

  const handleRejectConfirm = async (rejectComments) => {
    if (!rejectItem) return;

    // Handle mass reject
    if (rejectItem.isMultiple) {
      const selectedItems = tableData.filter(
        (item) =>
          item.checked &&
          item.status === 'PENDING' 
      );

      const requestPayload = {
        data: selectedItems.map((item) => ({
          po_number: item.po_number,
          distributor_id: item.distributor_id,
          action: 'REJECT',
          ...(rejectComments && { reject_comments: rejectComments })
        }))
      };

      setAllowMassAction(false);
      setIsMassActionButtonsClicked(false);
      
      const response = await massUpdateRushOrderRequest(requestPayload);
      setAllowMassAction(true);

      // Reset reject modal state
      setRejectModalVisible(false);
      setRejectItem(null);

      if (response.success) {
        const successMessage = response.data
          .filter((item) => item.success)
          .map((item) => `${item.po_number}: ${item.message}`)
          .join(', ');
        const errorMessage = response.data
          .filter((item) => !item.success)
          .map((item) => `${item.po_number}: ${item.message}`)
          .join(', ');

        if (successMessage) {
          notificationSender(true, 'Success', successMessage);
        }
        if (errorMessage) {
          notificationSender(false, 'Error', errorMessage);
        }
        setResponseCount(responseCount + 1);
      } else {
        notificationSender(false, 'Error', response.message);
      }
      return;
    }

    // Handle single reject
    const { distributor_id, po_number } = rejectItem;
    const rejectPayload = {
      po_number,
      distributor_id,
      action: 'REJECT',
      ...(rejectComments && { reject_comments: rejectComments }),
    };
    const reject_response =
      await updateRushOrderRequest2(rejectPayload);
    setRejectModalVisible(false);
    setRejectItem(null);
    if (reject_response.success) {
      notificationSender(
        true,
        'Success',
        'Request rejected successfully',
      );
      setResponseCount(responseCount + 1);
    } else {
      notificationSender(false, 'Error', reject_response?.message || 'Failed to reject request');
    }
  };

  const handleRejectCancel = () => {
    setRejectModalVisible(false);
    setRejectItem(null);
  };

  const handleApprovalEmail = async (item) => {
    const {
      po_number,
      distributor_id,
      status,
      responded_by_email,
      reason,
      comments,
    } = item;
    if (status !== 'PENDING') {
      notificationSender(false, 'Error', 'Request already ' + status);
      return;
    }
    const po_details = await getPODetails(po_number, distributor_id);
    const distributor_profile =
      await getRegionDetails(distributor_id);
    if (!po_details.length) {
      notificationSender(
        false,
        'Error',
        'Failed to fetch PO details',
      );
      return;
    }
    if (!distributor_profile) {
      notificationSender(
        false,
        'Error',
        'Failed to fetch Distributor details',
      );
      return;
    }
    if (roApprovers.length === 0) {
      notificationSender(
        false,
        'Error',
        'No approvers set for Rush Order Requests',
      );
      return;
    }
    const approval_no = responded_by_email?.length
      ? roApprovers.indexOf(
          responded_by_email[
            responded_by_email.length - 1
          ]?.toLowerCase(),
        ) + 1
      : 0;
    if (approval_no >= roApprovers.length) {
      notificationSender(
        false,
        'Error',
        'All approvers have responded to this request',
      );
      return;
    }
    const approver_email = roApprovers[approval_no];
    const approvalEmailPayload = {
      emailParams: {
        po_number: po_number,
        distributor_id: distributor_id,
        approver_email: approver_email,
        amount: po_details[0].OrderAmount + '',
        location: `${distributor_profile?.group5} - ${distributor_profile?.area_code}`,
        rsm:
          distributor_profile?.rsm
            ?.map((o) => `${o?.first_name} ${o?.last_name}`)
            .join(', ') || '-',
        reason: reason ?? 'Others',
        comments: comments ?? '-',
        approver_no: approval_no + 1,
      },
    };
    if (approval_no > 0) {
      approvalEmailPayload.emailParams['previous_approver_email'] =
        roApprovers[approval_no - 1];
    }
    const email_response = await sendROApprovalEmail(
      approvalEmailPayload,
    );
    if (email_response.success) {
      notificationSender(
        true,
        'Success',
        'Approval email sent successfully',
      );
    } else {
      notificationSender(
        false,
        'Error',
        'Failed to send approval email',
      );
    }
  };

  const handleInfo = (item) => {};

  const regionChangeHandler = (value) => {};

  const regionSavaHandler = (value) => {
    setSelectedRegions(value);
    setSelectedAreaCodes([]);
    const area_codes = new Set();
    if (value.length > 0) {
      dashboard_filter_categories.response.area_details.forEach(
        (item) => {
          if (value.includes(item.region))
            area_codes.add(item.area_code);
        },
      );
    } else {
      dashboard_filter_categories.response.area_details.forEach(
        (item) => {
          if (item.area_code && item.area_code !== '')
            area_codes.add(item.area_code);
        },
      );
    }
    setAreaCodes(
      Array.from(area_codes).sort((a, b) =>
        a.localeCompare(b, 'en-US', { sensitivity: 'base' }),
      ),
    );
  };

  const areaSaveHandler = (value) => {
    setSelectedAreaCodes(value);
  };

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

  const handleMassApprove = () => {
    isMassApprove.current = true;
    setIsMassActionButtonsClicked(true);
  };

  const handleMassReject = () => {
    isMassReject.current = true;
    setIsMassActionButtonsClicked(true);
  };

  const selectAll = (e) => {
    const tableDataCopy = [...tableData];
    const email_index = roApprovers.indexOf(email);
    tableDataCopy.forEach((item) => {
      if (
        item.status === 'PENDING' &&
        !item.responded_by_email?.find(
          (e) => e.toLowerCase() === email,
        ) &&
        (email_index < 1 ||
          item.responded_by_email?.find(
            (e) => e.toLowerCase() === roApprovers[email_index - 1],
          ))
      )
        item.checked = e.target.checked;
    });
    setTableData(tableDataCopy);
  };

  const handleCheckbox = (event, item) => {
    const tableDataCopy = [...tableData];
    for (let data of tableDataCopy) {
      if (data.po_number === item.po_number) {
        data.checked = event.target.checked;
        break;
      }
    }
    setTableData(tableDataCopy);
  };

  const handleMassCancel = () => {
    isMassApprove.current = false;
    isMassReject.current = false;
    setResponseCount(responseCount + 1);
    setIsMassActionButtonsClicked(false);
    setRejectModalVisible(false);
    setRejectItem(null);
  };

  function canMassRespond() {
    if (!isROResponseEnabled) {
      notificationSender(
        false,
        'Error',
        'Rush Order Approval/Rejection is disabled by Admin.',
      );
      return false;
    }

    const email_index = roApprovers.indexOf(email);
    if (email_index < 0) {
      notificationSender(
        false,
        'Error',
        'You are not authorized to approve/reject this request',
      );
      return false;
    }

    return true;
  }

  const handleMassSave = async () => {
    if (!canMassRespond()) return;
    const email_index = roApprovers.indexOf(email);
    
    // Get selected items
    const selectedItems = tableData
      .filter(
        (item) =>
          item.checked &&
          item.status === 'PENDING' &&
          !item.responded_by_email?.find(
            (e) => e.toLowerCase() === email,
          ) &&
          (email_index < 1 ||
            item.responded_by_email?.find(
              (e) => e.toLowerCase() === roApprovers[email_index - 1],
            )),
      );
    if (selectedItems.length === 0) {
      notificationSender(
        false,
        'Error',
        'No requests selected to approve/reject',
      );
      return;
    }

    if (isMassReject.current) {
      setRejectItem({ isMultiple: true });
      setRejectModalVisible(true);
      return;
    }
    
    const payload = {
      data: selectedItems.map((item) => ({
        po_number: item.po_number,
        distributor_id: item.distributor_id,
        action: 'APPROVE'
      }))
    };

    setAllowMassAction(false);
    setIsMassActionButtonsClicked(false);
    const response = await massUpdateRushOrderRequest(payload);
    setAllowMassAction(true);
    if (response.success) {
      const successMessage =
        response.data
          .filter((item) => item.success)
          .map((item) => {
            return `${item.po_number}: ${item.message}`;
          })
          .join(', ') || '';
      const errorMessage =
        response.data
          .filter((item) => !item.success)
          .map((item) => {
            return `${item.po_number}: ${item.message}`;
          })
          .join(', ') || '';
      if (successMessage)
        notificationSender(true, 'Success', successMessage);
      if (errorMessage)
        notificationSender(false, 'Error', errorMessage);
      setResponseCount(responseCount + 1);
    } else {
      notificationSender(false, 'Error', response.message);
    }

    isMassApprove.current = false;
    isMassReject.current = false;
  };

  return (
    <>
      <div className="admin-dashboard-wrapper">
        {width > 767 ? (
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
                    onChange={(e) => {
                      onSearch(e);
                    }}
                  />
                  <div onClick={resetPage} className="search-close">
                    <CloseCircleOutlined />
                  </div>
                </div>
                <div className="sdr-status-filter">
                  <Select
                    showSearch
                    style={{ fontSize: '13px' }}
                    className="width120px"
                    placeholder="Select sdr status"
                    defaultValue={'ALL'}
                    optionFilterProp="children"
                    onChange={statusChangeHandler}
                    filterOption={(input, option) =>
                      (option?.label ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={roStatus}
                  />
                </div>
              </div>
            </div>
            <div className="hbr-message">
              {/* {totalApprovals > 0 && (
                <span>
                  You have approved {approvalCount} out of{' '}
                  {totalApprovals} Rush Order request(s) for the month
                  of {currentMonth}.
                </span>
              )} */}
              <span>
                Rush Order requests need to be approved by first
                approver within {roExpiry} hours from creation.
              </span>
            </div>
            <div className="dashboard-neck">
              <div className="req-tabs">
                {hasViewPermission(pages.SHR) && (
                  <button
                    id="salesHierarchy"
                    className={`tablink`}
                    onClick={() => {
                      tabFunction('Sales Hierarchy Requests');
                    }}
                  >
                    Sales Hierarchy
                  </button>
                )}
                {hasViewPermission(pages.PDP_REQUESTS) && (
                  <button
                    id="pdpUpdate"
                    className={`tablink`}
                    onClick={() => {
                      tabFunction('Pdp Update Requests');
                    }}
                  >
                    PDP Update
                  </button>
                )}
                {hasViewPermission(pages.PDP_UNLOCK) && (
                  <button
                    id="pdpUnlock"
                    className={`tablink`}
                    onClick={() => {
                      tabFunction('PDP Unlock Requests');
                    }}
                  >
                    PDP Unlock
                  </button>
                )}
                {hasViewPermission(pages.PLANT_REQUEST) && (
                  <button
                    id="plantUpdate"
                    className={`tablink`}
                    onClick={() => {
                      tabFunction('Plant Update Requests');
                    }}
                  >
                    Plant Update
                  </button>
                )}
                {hasViewPermission(pages.SDR) && (
                  <button
                    id="serviceDelivery"
                    className={`tablink`}
                    onClick={() => {
                      tabFunction('Service Delivery Requests');
                    }}
                  >
                    Service Delivery
                  </button>
                )}
                <button id="RushOrder" className={`tablink active`}>
                  Rush Order
                </button>
              </div>
              <div className="header-block-right">
                <div className="hbr-item1">
                  <div className="dot-pending"></div>{' '}
                  <div style={{ marginRight: '4px' }}>Pending</div>
                  <div className="dot-approved"></div>{' '}
                  <div style={{ marginRight: '4px' }}>Approved</div>
                  <div className="dot-rejected"></div>{' '}
                  <div style={{ marginRight: '4px' }}>Rejected</div>
                  <div className="dot-expired"></div>{' '}
                  <div style={{ marginRight: '4px' }}>Expired</div>
                </div>
                <div className="hbr-item2n">
                  {!isMassActionButtonsClicked && (
                    <button
                      disabled={!allowMassAction}
                      className="approve-btn"
                      onClick={handleMassApprove}
                    >
                      Approve
                    </button>
                  )}
                  {!isMassActionButtonsClicked && (
                    <button
                      disabled={!allowMassAction}
                      className="reject-btn"
                      onClick={handleMassReject}
                    >
                      Reject
                    </button>
                  )}
                  {isMassActionButtonsClicked && (
                    <button
                      className="ro-cancel-btn"
                      onClick={handleMassCancel}
                    >
                      Cancel
                    </button>
                  )}
                  {isMassActionButtonsClicked && (
                    <button
                      className="ro-save-btn"
                      onClick={handleMassSave}
                    >
                      Save
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-dashboard-table">
              <Loader>
                <div className='requests-table-outer'>
                  <table>
                    <thead>
                      <tr>
                        {isMassActionButtonsClicked &&
                          tableData.length > 0 && (
                            <th className="width3">
                              <input
                                className="checkbox-header"
                                ref={headerCheckBoxRef}
                                checked={headerCheckBoxRef.current?.checked ?? false}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                }}
                                onChange={(e) => {
                                  selectAll(e);
                                }}
                                type="checkbox"
                              />
                            </th>
                          )}
                        <th
                          className="width15"
                          style={{ textAlign: 'center' }}
                          onClick={() => sortColumn('po_number')}
                        >
                          PO Number&nbsp;
                          <img
                            src="/assets/images/sorting_icon.svg"
                            alt=""
                          />
                        </th>
                        <th
                          className={
                            isMassActionButtonsClicked
                              ? 'width12'
                              : 'width15'
                          }
                          style={{ textAlign: 'center' }}
                          onClick={() => sortColumn('requested_on')}
                        >
                          Request Date&nbsp;
                          <img
                            src="/assets/images/sorting_icon.svg"
                            alt=""
                          />
                        </th>
                        <th
                          className="width5"
                          style={{ textAlign: 'center' }}
                        >
                          <DropdownCheckbox
                            name="Region"
                            options={regions}
                            value={selectedRegions}
                            isOpen={setIsRegionFilterOpen}
                            disabled={
                              regions.length === 0 || isAreaFilterOpen
                            }
                            onChange={regionChangeHandler}
                            onSave={regionSavaHandler}
                          />
                        </th>
                        <th
                          className="width5"
                          style={{ textAlign: 'center' }}
                        >
                          <DropdownCheckbox
                            name="Area"
                            options={areaCodes}
                            value={selectedAreaCodes}
                            isOpen={setIsAreaFilterOpen}
                            disabled={
                              areaCodes.length === 0 ||
                              isRegionFilterOpen
                            }
                            onChange={regionChangeHandler}
                            onSave={areaSaveHandler}
                          />
                        </th>
                        <th
                          className="width20"
                          style={{ textAlign: 'center' }}
                          onClick={() => sortColumn('distributor_name')}
                        >
                          Distributor Name&nbsp;
                          <img
                            src="/assets/images/sorting_icon.svg"
                            alt=""
                          />
                        </th>
                        <th className="width10" style={{ textAlign: "center" }}>Max PDP Freq</th>
                        <th
                          className="width10"
                          style={{ textAlign: 'center' }}
                        >
                          SO Number
                        </th>
                        <th
                          className="width15"
                          style={{ textAlign: 'center' }}
                        >
                          Response Date
                        </th>
                        <th
                          className="width15"
                          style={{ textAlign: 'center' }}
                        >
                          Request By
                        </th>
                        <th
                          className="width5"
                          style={{ textAlign: 'center' }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((item, index) => {
                        let backgroundColor = '';
                        if (item.status === 'PENDING')
                          backgroundColor = 'rgb(242, 216, 168)';
                        else if (item.status === 'APPROVED')
                          backgroundColor = '#adefc0';
                        else if (item.status === 'REJECTED')
                          backgroundColor = 'rgb(225 95 95 / 63%)';
                        else if (item.status === 'EXPIRED')
                          backgroundColor = '#f5f6f6';
                        const encrypted_po = Util.encryptData(
                          item.po_number,
                        )
                          .replaceAll('/', '*')
                          .replaceAll('+', '-');
                        const encrypted_distributor_id =
                          Util.encryptData(item.distributor_id)
                            .replaceAll('/', '*')
                            .replaceAll('+', '-');
                        const detailsPath = `/admin/rush-order-details/${encrypted_po}/${encrypted_distributor_id}`;
                        const email_index = roApprovers.indexOf(email);
                        const canRespondFlag =
                          hasRespondPermission(pages.RO_REQUESTS) &&
                          item.status === 'PENDING' &&
                          email_index >= 0 &&
                          !item.responded_by_email?.find(
                            (i) => i.toLowerCase() === email,
                          ) &&
                          (email_index < 1 ||
                            item.responded_by_email?.find(
                              (e) =>
                                e.toLowerCase() ===
                                roApprovers[email_index - 1],
                            ));
                        const next_approver_index = item
                          .responded_by_email?.length
                          ? roApprovers.indexOf(
                            item.responded_by_email[
                              item.responded_by_email.length - 1
                            ]?.toLowerCase(),
                          ) + 1
                          : 0;
                        const next_approver =
                          next_approver_index < roApprovers.length
                            ? roApprovers[next_approver_index]
                            : 'next approver';
                        const confirm_message = `Are you sure to re-send approval email to '${next_approver}'?`;
                        return (
                          <tr key={index} style={{ backgroundColor }}>
                            {isMassActionButtonsClicked && (
                              <td className="width3">
                                <label htmlFor={index}>
                                  <input
                                    id={index}
                                    type="checkbox"
                                    disabled={!canRespondFlag}
                                    checked={item.checked}
                                    onChange={(event) =>
                                      handleCheckbox(event, item)
                                    }
                                  />
                                  <span className="checkmark-box"></span>
                                </label>
                              </td>
                            )}
                            <td
                              className="width15"
                              style={{ textAlign: 'center' }}
                            >
                              <Link to={{ pathname: detailsPath }}>
                                {item.po_number}
                              </Link>
                            </td>
                            <td
                              className={
                                isMassActionButtonsClicked
                                  ? 'width12'
                                  : 'width15'
                              }
                              style={{ textAlign: 'center' }}
                            >
                              {Util.formatDate(item.requested_on)},{' '}
                              {Util.formatTime(item.requested_on)}
                            </td>
                            <td
                              className="width5"
                              style={{ textAlign: 'center' }}
                            >
                              {item.region}
                            </td>
                            <td
                              className="width5"
                              style={{ textAlign: 'center' }}
                            >
                              {item.area_code}
                            </td>
                            <td
                              className="width20"
                              style={{ textAlign: 'center' }}
                            >
                              {item.distributor_name} (
                              {item.distributor_id})
                            </td>
                            <td className="width10" style={{ textAlign: "center" }}>
                              {item.max_pdp_day ?
                                <>
                                  {item.max_pdp_day.map((pdpDay) => <span style={{ display: 'block' }}>{pdpDay}</span>)}
                                </>
                                : NO_DATA_SYMBOL
                              }
                            </td>
                            <td
                              className="width10"
                              style={{ textAlign: 'center' }}
                            >
                              {item.so_number ? item.so_number : '-'}
                            </td>
                            <td
                              className="width15"
                              style={{ textAlign: 'center' }}
                            >
                              {item.responded_on?.length ? (
                                <>
                                  {item.responded_on.map(
                                    (date, ind) => (
                                      <li key={ind}>
                                        {Util.formatDate(date)},{' '}
                                        {Util.formatTime(date)}
                                      </li>
                                    ),
                                  )}
                                </>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td
                              className="width15"
                              style={{ textAlign: 'center' }}
                            >
                              {item.requested_by.split('#')[0]}
                            </td>
                            <td
                              className="width5 admin-ations"
                              style={{ textAlign: 'center' }}
                            >
                              {canRespondFlag &&
                                !isMassActionButtonsClicked ? (
                                <div className="action-btns">
                                  <i className="info-icon">
                                    <Tooltip
                                      placement="top"
                                      title="Approve"
                                      onClick={() => {
                                        handleApprove(item);
                                      }}
                                    >
                                      <CheckCircleOutlined />
                                    </Tooltip>
                                  </i>
                                  <i className="info-icon">
                                    <Tooltip
                                      placement="top"
                                      title="Reject"
                                      onClick={() => {
                                        handleReject(item);
                                      }}
                                    >
                                      <CloseCircleOutlined />
                                    </Tooltip>
                                  </i>
                                </div>
                              ) : (
                                <div className="action-btns">
                                  <i
                                    className="info-icon"
                                    onClick={() => handleInfo(item)}
                                  >
                                    <Tooltip
                                      placement="top"
                                      title="View"
                                    >
                                      <Link
                                        to={{ pathname: detailsPath }}
                                      >
                                        <EyeOutlined />
                                      </Link>
                                    </Tooltip>
                                  </i>
                                </div>
                              )}
                              {item.status === 'PENDING' && (
                                <div className="action-btns">
                                  <i className="info-icon">
                                    <Popconfirm
                                      title={confirm_message}
                                      placement="topRight"
                                      onConfirm={() =>
                                        handleApprovalEmail(item)
                                      }
                                      onCancel={() => { }}
                                      okText="Yes"
                                      cancelText="No"
                                    >
                                      <Tooltip
                                        placement="bottom"
                                        title="Send email to next approver"
                                      >
                                        <SendOutlined />
                                      </Tooltip>
                                    </Popconfirm>
                                  </i>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {tableData.length === 0 && (
                        <tr style={{ textAlign: 'center' }}>
                          <td colSpan="10">No request available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
        ) : (
          <div className="ro-mobile-block">
            <div className="ro-mobile-head">
              <div className="ro-page-title">Rush Order Requests</div>
              <div className="ro-mobile-search">
                <input
                  type="text"
                  className="ro-mobile-search-fld"
                  placeholder="Search by PO No./ SO No./ DB Name/ DB Code/ PO amount"
                  value={showSearch}
                  onChange={(e) => {
                    onSearch(e);
                  }}
                />
                <div
                  onClick={resetPage}
                  className="ro-mobile-search-close"
                >
                  <CloseCircleOutlined />
                </div>
              </div>
              <div className="ro-mob-status-icon">
                <div className="dot-pending"></div>{' '}
                <div style={{ marginRight: '3px' }}>Pending</div>
                <div className="dot-approved"></div>{' '}
                <div style={{ marginRight: '3px' }}>Approved</div>
                <div className="dot-rejected"></div>{' '}
                <div style={{ marginRight: '3px' }}>Rejected</div>
                <div className="dot-expired-mob"></div>{' '}
                <div style={{ marginRight: '3px' }}>Expired</div>
              </div>
              <div className="ro-mobile-status-filter">
                <Select
                  showSearch
                  style={{ fontSize: '13px' }}
                  className="width120px"
                  placeholder="Select sdr status"
                  defaultValue={'ALL'}
                  optionFilterProp="children"
                  onChange={statusChangeHandler}
                  filterOption={(input, option) =>
                    (option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={roStatus}
                />
              </div>
              <div className="ro-mob-head-message">
                {/* {totalApprovals > 0 && (
                  <span>
                    You have approved {approvalCount} out of{' '}
                    {totalApprovals} Rush Order request(s) for the
                    month of {currentMonth}.
                  </span>
                )} */}
                <span>
                  Rush Order requests need to be approved by first
                  approver within {roExpiry} hours from creation.
                </span>
              </div>
              <div className="mob-req-tabs">
                {hasViewPermission(pages.PDP_UNLOCK) && (
                  <button
                    id="pdpUnlock"
                    className="mob-tablink"
                    onClick={() => {
                      tabFunction('PDP Unlock Requests');
                    }}
                  >
                    PDP Unlock
                  </button>
                )}
                {hasViewPermission(pages.SDR) && (
                  <button
                    id="serviceDelivery"
                    className="mob-tablink"
                    onClick={() => {
                      tabFunction('Service Delivery Requests');
                    }}
                  >
                    Service Delivery
                  </button>
                )}
                <button id="RushOrder" className="mob-tablink active">
                  Rush Order
                </button>
              </div>
              <div className="ro-mobile-header-btns">
                {isMassActionButtonsClicked && tableData.length > 0 
                && (
                  <input
                    className="ro-mobile-checkbox"
                    ref={headerCheckBoxRef}
                    checked={headerCheckBoxRef.current?.checked ?? false}
                    onChange={(e) => {
                      selectAll(e);
                    }}
                    type="checkbox"
                  />
                )}
                {!isMassActionButtonsClicked && (
                  <button
                    disabled={!allowMassAction}
                    className="approve-btn"
                    onClick={handleMassApprove}
                  >
                    Approve
                  </button>
                )}
                {!isMassActionButtonsClicked && (
                  <button
                    disabled={!allowMassAction}
                    className="reject-btn"
                    onClick={handleMassReject}
                  >
                    Reject
                  </button>
                )}
                {isMassActionButtonsClicked && (
                  <button
                    className="ro-cancel-btn"
                    onClick={handleMassCancel}
                  >
                    Cancel
                  </button>
                )}
                {isMassActionButtonsClicked && (
                  <button
                    className="ro-save-btn"
                    onClick={handleMassSave}
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
            <Loader>
              <div
                className="ro-mobile-body"
                style={{ marginBottom: '5px' }}
              >
                {tableData.map((item, index) => {
                  let backgroundColor = '';
                  if (item.status === 'PENDING')
                    backgroundColor = 'rgb(242, 216, 168)';
                  else if (item.status === 'APPROVED')
                    backgroundColor = '#adefc0';
                  else if (item.status === 'REJECTED')
                    backgroundColor = 'rgb(225 95 95 / 63%)';
                  else if (item.status === 'EXPIRED')
                    backgroundColor = '#d9d9d9';
                  const encrypted_po = Util.encryptData(item.po_number)
                    .replaceAll('/', '*')
                    .replaceAll('+', '-');
                  const encrypted_distributor_id = Util.encryptData(
                    item.distributor_id,
                  )
                    .replaceAll('/', '*')
                    .replaceAll('+', '-');
                  const detailsPath = `/admin/rush-order-details/${encrypted_po}/${encrypted_distributor_id}`;
                  const email_index = roApprovers.indexOf(email);
                  const canRespondFlag =
                    hasRespondPermission(pages.RO_REQUESTS) &&
                    item.status === 'PENDING' &&
                    email_index >= 0 &&
                    !item.responded_by_email?.find(
                      (i) => i.toLowerCase() === email,
                    ) &&
                    (email_index < 1 ||
                      item.responded_by_email?.find(
                        (e) =>
                          e.toLowerCase() ===
                          roApprovers[email_index - 1],
                      ));
                  const next_approver_index = item.responded_by_email
                    ?.length
                    ? roApprovers.indexOf(
                        item.responded_by_email[
                          item.responded_by_email.length - 1
                        ]?.toLowerCase(),
                      ) + 1
                    : 0;
                  const next_approver =
                    next_approver_index < roApprovers.length
                      ? roApprovers[next_approver_index]
                      : 'next approver';
                  const confirm_message = `Are you sure to re-send approval email to '${next_approver}'?`;
                  return (
                    <div
                      className="ro-mobile-body-card"
                      key={index}
                      style={{ backgroundColor }}
                    >
                      {isMassActionButtonsClicked && (
                        <input
                          id={index}
                          className="ro-mobile-checkbox-small"
                          type="checkbox"
                          disabled={!canRespondFlag}
                          checked={item.checked}
                          onChange={(event) =>
                            handleCheckbox(event, item)
                          }
                        />
                      )}
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">
                          PO Number
                        </span>
                        <span>
                          <Link to={{ pathname: detailsPath }}>
                            {item.po_number}
                          </Link>
                        </span>
                      </div>
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">
                          Region
                        </span>
                        <span>{item.region}</span>
                      </div>
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">
                          Distributor
                        </span>
                        <span>
                          {item.distributor_name} ({item.distributor_id}
                          )
                        </span>
                      </div>
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">Area</span>
                        <span>{item.area_code}</span>
                      </div>
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">
                          Request Date
                        </span>
                        <span>
                          {Util.formatDate(item.requested_on)},{' '}
                          {Util.formatTime(item.requested_on)}
                        </span>
                      </div>
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">
                          Requested By
                        </span>
                        <span>{item.requested_by.split('#')[0]}</span>
                      </div>
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">
                          Response Date
                        </span>
                        {item.responded_on?.length ? (
                          item.responded_on.map((date, ind) => (
                            <span key={ind}>
                              {Util.formatDate(date)},{' '}
                              {Util.formatTime(date)}
                            </span>
                          ))
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">
                          Response By
                        </span>
                        {item.responded_by?.length ? (
                          item.responded_by.map((item, ind) => (
                            <span key={ind}>{item}</span>
                          ))
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">
                          SO Number
                        </span>
                        {item.so_number ? (
                          <span>{item.so_number}</span>
                        ) : (
                          <span>&nbsp;-</span>
                        )}
                      </div>
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">
                          Max PDP Freq
                        </span>
                        <span>
                          {item.max_pdp_day ?
                            <>
                              {item.max_pdp_day.map((pdpDay) => <span style={{display:'block'}}>{pdpDay}</span>)}
                            </>
                            : NO_DATA_SYMBOL
                          }
                        </span>
                      </div>
                      <div className="ro-mobile-card-ele">
                        <span className="ro-card-ele-title">
                          Actions
                        </span>
                        {canRespondFlag &&
                        !isMassActionButtonsClicked ? (
                          <div className="mobile-action-btns">
                            <i className="mobile-info-icon">
                              <Tooltip
                                placement="top"
                                title="Approve"
                                onClick={() => {
                                  handleApprove(item);
                                }}
                              >
                                <CheckCircleOutlined />
                              </Tooltip>
                            </i>
                            <i className="mobile-info-icon">
                              <Tooltip
                                placement="top"
                                title="Reject"
                                onClick={() => {
                                  handleReject(item);
                                }}
                              >
                                <CloseCircleOutlined />
                              </Tooltip>
                            </i>
                            <i className="mobile-info-icon">
                              <Popconfirm
                                title={confirm_message}
                                placement="topRight"
                                onConfirm={() =>
                                  handleApprovalEmail(item)
                                }
                                onCancel={() => {}}
                                okText="Yes"
                                cancelText="No"
                              >
                                <Tooltip
                                  placement="bottom"
                                  title="Send email to next approver"
                                >
                                  <SendOutlined />
                                </Tooltip>
                              </Popconfirm>
                            </i>
                          </div>
                        ) : (
                          <div className="mobile-action-btns">
                            <i
                              className="mobile-info-icon"
                              onClick={() => handleInfo(item)}
                            >
                              <Tooltip placement="top" title="View">
                                <Link to={{ pathname: detailsPath }}>
                                  <EyeOutlined />
                                </Link>
                              </Tooltip>
                            </i>
                            {item.status === 'PENDING' && (
                              <i className="mobile-info-icon">
                                <Popconfirm
                                  title={confirm_message}
                                  placement="topRight"
                                  onConfirm={() =>
                                    handleApprovalEmail(item)
                                  }
                                  onCancel={() => {}}
                                  okText="Yes"
                                  cancelText="No"
                                >
                                  <Tooltip
                                    placement="bottom"
                                    title="Send email to next approver"
                                  >
                                    <SendOutlined />
                                  </Tooltip>
                                </Popconfirm>
                              </i>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Loader>
            <Panigantion
              data={tableData ? tableData : []}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              itemsCount={tableDataCount}
              setModifiedData={onChangePage}
              pageNo={pageNo}
            />
          </div>
        )}
      </div>
      <RejectModal
        visible={rejectModalVisible}  
        onCancel={handleRejectCancel}
        onConfirm={handleRejectConfirm}
      />
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    ro_approval_count: state.admin.get('ro_approval_count'),
    dashboard_filter_categories: state.admin.get(
      'dashboard_filter_categories',
    ),
    po_details: state.dashboard.get('po_details'),
    distributor_profile: state.dashboard.get('region_details'),
    app_level_configuration: state.auth.get(
      'app_level_configuration',
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getRushOrderRequests: (data) =>
      dispatch(AdminAction.getRushOrderRequests(data)),
    getRushOrderApprovalCount: () =>
      dispatch(AdminAction.getRushOrderApprovalCount()),
    dashboardFilterCategories: () =>
      dispatch(AdminAction.dashboardFilterCategories()),
    getPODetails: (po_number, distributor_id) =>
      dispatch(DashAction.getPODetails(po_number, distributor_id)),
    getRegionDetails: (distributor_id) =>
      dispatch(DashAction.getRegionDetails(distributor_id)),
    sendROApprovalEmail: (data) =>
      dispatch(AdminAction.sendROApprovalEmail(data)),
    updateRushOrderRequest2: (data) =>
      dispatch(AdminAction.updateRushOrderRequest2(data)),
    massUpdateRushOrderRequest: (data) =>
      dispatch(AdminAction.massUpdateRushOrderRequest(data)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(RushOrderRequests);
