import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import LocalAuth from '../../../util/middleware/auth';
import { DatePicker, Space, Tooltip } from 'antd';
import OpenPOs from './OpenPOs';
import RDDDetails from './RDDDetails';
import ClosedPOs from './ClosedPOs';
import { CloseCircleOutlined } from '@ant-design/icons';
import debounce from 'lodash.debounce';
import moment from 'moment';
import * as Actions from '../../admin/actions/adminAction';
import '../Questionnaire/survey.css';
import '../MdmDashboard/MdmMasterDashboard.css';
import './Mtecom.css';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Util from '../../../util/helper/index.js';
import {
  hasEditPermission,
  hasViewPermission,
  pages,
} from '../../../persona/mdm';
import ServerTimer from '../../../components/ServerTImer';
import auth from '../../../util/middleware/auth';

let Dashboard = (props) => {
  const { poList, getAppSettingList ,mtEcomAutoSOSync} = props;
  const [poData, setPoData] = useState([]);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [showSearch, setShowSearch] = useState('');
  const { RangePicker } = DatePicker;
  const [tabName, setTabName] = useState('OPEN POs');
  const [status, setStatus] = useState('Open');
  const [rddFlag, setRddFlag] = useState(false);
  const [rddFromTime, setRddFromTime] = useState('');
  const [rddToTime, setRddToTime] = useState('');
  const [rddTimeFlag, setRddTimeFlag] = useState(false);
  const [dateRange, setDateRange] = useState(['', '']);
  const [search, setSearch] = useState({
    po_number: 0,
    fromDate: '',
    toDate: '',
  });
  const [filters, setFilters] = useState({
    selectedCustomerNames: [],
    selectedStatuses: [],
  });
  const adminAccessToken = LocalAuth.getAdminAccessToken();
  const [lastSync, setLastSync] = useState();
  const debouncedSearch = useRef(
    debounce((nextValue) => setSearch(nextValue), 1000),
  ).current;
  const prevStatusRef = useRef(status);
  const filtersRef = useRef(filters);

  const tabFunction = (value) => {
    setTabName(value);
    setPoData([]);
    setSearch({ po_number: 0, fromDate: '', toDate: '' });
    setShowSearch('');
    setDateRange(['', '']);
    setOffset(0);
    setPageNo(1);
    setFilters({
      selectedCustomerNames: [],
      selectedStatuses: [],
    });
    filtersRef.current = {
      selectedCustomerNames: [],
      selectedStatuses: [],
    };
  };

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab');
  const [customerNames, setCustomerNames] = useState([]);
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    if (tabFromUrl === 'RDD') {
      tabFunction('RDD');
    }
  }, [tabFromUrl]);

  useEffect(() => {
    if (tabName === 'OPEN POs') {
      setStatus('Open');
    } else if (tabName === 'CLOSED POs') {
      setStatus('Closed');
    } else if (tabName === 'RDD') {
      setStatus('RDD');
    }
  }, [tabName]);

  useEffect(() => {
    if (status && prevStatusRef.current !== status) {
      prevStatusRef.current = status; // Update the ref with the new status
      getData();
    }
  }, [status]);

  useEffect(() => {
    getData();
  }, [offset, limit]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    filtersRef.current = newFilters;
    getData();
  };

  useEffect(() => {
    setRddTimeFlag(Util.getRDDDateFlag(rddFromTime, rddToTime));
  }, [rddFromTime, rddToTime]);

  useEffect(() => {
    soSync();
  }, []);

  useEffect(async () => {
    const res = await getAppSettingList();
    if (res.data) {
      setRddFlag(
        res.data.find((item) => item.key === 'ENABLE_MT_ECOM_RDD')[
          'value'
        ],
      );
      setRddFromTime(
        res.data.find((item) => item.key === 'ENABLE_RDD_START_TIME')[
          'value'
        ],
      );
      setRddToTime(
        res.data.find((item) => item.key === 'ENABLE_RDD_END_TIME')[
          'value'
        ],
      );
    }
  }, []);

  const soSync = async () => {
    let user_id = localStorage.getItem('user_id');
    let response = await mtEcomAutoSOSync(user_id);
    setLastSync(response.body);
  };

  const getData = async () => {
    if (adminAccessToken) {
      let poPayload = {
        offset: offset,
        limit: limit,
        status: status,
        search: search,
        selectedCustomerNames:
          filtersRef.current.selectedCustomerNames,
        selectedStatuses: filtersRef.current.selectedStatuses,
      };
      let data = [];
      try {
        poPayload['role'] = auth.getAdminRole();
        poPayload['id'] = localStorage.getItem('user_id');
        data = await poList(poPayload);
        setPoData(data?.body);
        setCustomerNames(data?.body?.customerNames || []);
        setStatuses(data?.body?.statuses || []);
      } catch (error) {
        console.error(error);
      }
    }
  };

  function useDeepCompareEffect(callback, dependencies) {
    const currentDependenciesRef = useRef();
    const dependenciesString = JSON.stringify(dependencies);
    if (
      !currentDependenciesRef.current ||
      currentDependenciesRef.current !== dependenciesString
    ) {
      callback();
    }
    currentDependenciesRef.current = dependenciesString;
  }

  useDeepCompareEffect(() => {
    setOffset(0);
    setPageNo(1);
    getData();
  }, [search]);

  useEffect(() => {
    let data = {};
    if (dateRange.length === 2) {
      const fromDate = dateRange[0];
      const toDate = dateRange[1];

      if (fromDate) {
        data.fromDate = fromDate;
      }
      if (toDate) {
        data.toDate = toDate;
      }
    }
  }, [dateRange]);

  const handleDateChange = (dateArray) => {
    let selectedDate = [];
    if (dateArray[0]) {
      selectedDate[0] = dateArray[0];
    }
    if (dateArray[1]) {
      selectedDate[1] = dateArray[1];
    }
    setDateRange(selectedDate);
    setSearch({
      ...search,
      fromDate: selectedDate[0],
      toDate: selectedDate[1],
    });
    setOffset(0);
    setLimit(10);
    setPageNo(1);
  };

  const onSearch = (e) => {
    const { value } = e.target;
    const payload = {
      ...search,
      po_number: value,
      fromDate: dateRange[0],
      toDate: dateRange[1],
    };

    debouncedSearch(payload);
    setShowSearch(value);
    setPageNo(1);
  };

  const resetPage = () => {
    setShowSearch('');
    setSearch({ ...search, po_number: '' });
  };

  const formulateRangePickerValues = () => {
    let startDate = null;
    let endDate = null;
    if (dateRange[0]) {
      startDate = moment(dateRange[0], 'YYYY-MM-DD');
    }
    if (dateRange[1]) {
      endDate = moment(dateRange[1], 'YYYY-MM-DD');
    }
    return [startDate, endDate];
  };

  return (
    <div className="admin-dashboard-wrapper ecom-table">
      <div className="admin-dashboard-block">
        <div className="left-header-ecom">
          <div className="admin-dashboard-head Mdm-Header">
            {tabName === 'OPEN POs' && (
              <h2 className="card-row-col">Open POs</h2>
            )}
            {tabName === 'CLOSED POs' && (
              <h2 className="card-row-col">Closed POs</h2>
            )}
            {tabName === 'RDD' && (
              <h2 className="card-row-col">RDD</h2>
            )}
          </div>
          <div>
            {hasViewPermission(pages.SO_SYNC) && (
              <div
                style={{ display: 'flex' }}
                className="sync-button"
              >
                <Tooltip
                  title={
                    <>
                      Last refreshed:{' '}
                      {lastSync
                        ? moment(lastSync).format(
                            'DD MMM, YYYY, h:mm A',
                          )
                        : ''}
                      <br />
                      Server time: <ServerTimer />
                    </>
                  }
                >
                  <button
                    type="submit"
                    className={
                      !hasEditPermission(pages.SO_SYNC)
                        ? 'disabled-blue-btn'
                        : 'blue-button'
                    }
                    onClick={soSync}
                    disabled={!hasEditPermission(pages.SO_SYNC)}
                  >
                    <>
                      Sync Now
                      <img
                        className="refresh-icon"
                        src="/assets/images/refresh-icon.svg"
                        alt=""
                      />
                    </>
                  </button>
                </Tooltip>
              </div>
            )}
          </div> 
        </div>

        <div className="ecom-header-two">
          <div className="dashboard-tabs">
            <button
              className={
                tabName === 'OPEN POs' ? `tablink active` : 'tablink'
              }
              onClick={() => tabFunction('OPEN POs')}
            >
              <span>Open POs</span>
            </button>
            <button
              className={
                tabName === 'CLOSED POs'
                  ? `tablink active`
                  : 'tablink'
              }
              onClick={() => tabFunction('CLOSED POs')}
            >
              <span>Closed POs</span>
            </button>
            {rddFlag === 'YES' && (
              <button
                className={
                  tabName === 'RDD' ? `tablink active` : 'tablink'
                }
                onClick={() => tabFunction('RDD')}
              >
                <span>RDD</span>
              </button>
            )}
          </div>
          <div className="header-div">
            <div
              className="search_box-ecom"
              style={{
                marginRight: tabName !== 'RDD' ? '10px' : '60px',
              }}
            >
              <input
                type="text"
                className="search-fld"
                placeholder={
                  tabName !== 'RDD'
                    ? 'Search by PO#, SO#...'
                    : 'Search by PO#, SO#, Invoice#...'
                }
                value={showSearch}
                onChange={(e) => {
                  onSearch(e);
                }}
              />
              <div onClick={resetPage} className="close-search">
                <CloseCircleOutlined />
              </div>
            </div>
            {tabName === 'RDD' && rddTimeFlag && (
              <Link
                to={{ pathname: '/admin/mt-ecom-rdd-management' }}
              >
                <button type="submit" className="add-button-rdd">
                  Select RDD
                  <img src="/assets/images/plusIcon.svg" alt="" />
                </button>
              </Link>
            )}
            {tabName !== 'RDD' && (
              <div className="po-created-session-date-picker">
                <Space direction="vertical">
                  <RangePicker
                    value={formulateRangePickerValues()}
                    allowClear={true}
                    placeholder={['From Date', 'To Date']}
                    format="YYYY-MM-DD"
                    onChange={(value, ds) => handleDateChange(ds)}
                    disabledDate={(current) =>
                      moment().isBefore(current)
                    }
                  />
                </Space>
              </div>
            )}
          </div>
        </div>

        <div>
          {tabName === 'OPEN POs' && (
            <OpenPOs
              poDataList={poData}
              status={setStatus}
              updatedLimit={setLimit}
              updatedOffset={setOffset}
              pageNo={pageNo}
              setPageNo={setPageNo}
              onFilterChange={handleFilterChange}
              customerNames={customerNames}
              statuses={statuses}
            />
          )}
          {tabName === 'CLOSED POs' && (
            <ClosedPOs
              poDataList={poData}
              status={setStatus}
              updatedLimit={setLimit}
              updatedOffset={setOffset}
              pageNo={pageNo}
              setPageNo={setPageNo}
              onFilterChange={handleFilterChange}
              customerNames={customerNames}
            />
          )}
          {tabName === 'RDD' && (
            <RDDDetails
              poDataList={poData}
              status={setStatus}
              updatedLimit={setLimit}
              updatedOffset={setOffset}
              pageNo={pageNo}
              setPageNo={setPageNo}
              onFilterChange={handleFilterChange}
              customerNames={customerNames}
              statuses={statuses}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = () => {};

const mapDispatchToProps = (dispatch) => {
  return {
    poList: (data) => dispatch(Actions.poList(data)),
    getAppSettingList: () => dispatch(Actions.getAppSettingList()),
    mtEcomAutoSOSync: (user_id) =>
      dispatch(Actions.mtEcomAutoSOSync(user_id)),
  };
};

const EcomDashboard = connect(
  mapStateToProps,
  mapDispatchToProps,
)(Dashboard);

export default EcomDashboard;
