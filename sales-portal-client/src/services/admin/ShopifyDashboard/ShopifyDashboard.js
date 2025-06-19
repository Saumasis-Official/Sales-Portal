import { connect } from 'react-redux';
import LocalAuth from '../../../util/middleware/auth';
import { useEffect, useState, useRef } from 'react';
import { DatePicker, Space, Tooltip, notification } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import debounce from 'lodash.debounce';
import moment from 'moment';
import * as Actions from '../../admin/actions/adminAction';
import '../Questionnaire/survey.css';
import '../MdmDashboard/MdmMasterDashboard.css';
import '../MTEcomDashboard/Mtecom.css';
import OpenPo from './OpenPo.js';
import ClosedPo from './ClosedPo.js';
import { hasViewPermission, pages, features } from '../../../persona/distributorNav.js';
import ResendPoModal from './ResendPoModal.js';
import * as AdminActions from '../../admin/actions/adminAction.js';
import auth from '../../../util/middleware/auth';

let Dashboard = (props) => {
  const { shopifyPoList } = props;
  const [poData, setPoData] = useState([]);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [pageNo, setPageNo] = useState(1);
  const [showSearch, setShowSearch] = useState('');
  const { RangePicker } = DatePicker;
  const [tabName, setTabName] = useState('OPEN POs');
  const [status, setStatus] = useState('Open');
  const [flag, setFlag] = useState(false);
  const [dateRange, setDateRange] = useState(['', '']);
  const [search, setSearch] = useState('');
  const [customerCodes, setCustomerCodes] = useState([]);
  const [retriggerSo, setRetriggerSo] = useState(true);
  
  const adminAccessToken = LocalAuth.getAdminAccessToken();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [resendPOData, setResendPOData] = useState(null);
  const [salesOrgData, setSalesOrgData] = useState(null);

  
  const showModal = async() => {
    const userId = localStorage.getItem('user_id');
    const res = await props.getAllResendPOData(userId);
    if (res.status === 'success') {
      setResendPOData(res.year);
      const salesOrg = res.sales_org[0]?.sales_org;
      setSalesOrgData(salesOrg);
      setIsModalVisible(true);
    }
    else{
      notification.error({
        message: 'Error',
        description: 'Fetch year was not successful.',
        duration: 4,
        className: 'notification-error',
      });
    } 
  };

  const handleCancel = () => {
      setIsModalVisible(false);
  };
 
  const debouncedSearch = useRef(
    debounce((nextValue,customerCodes) => {
      setSearch(nextValue)
      // setCustomerCodes(customerCodes);
    }, 2000),
  ).current;
  
  const tabFunction = (value) => {
    setTabName(value);
    setSearch('');
    setShowSearch('');
    setDateRange(['', '']);
    setOffset(0);
    setPageNo(1);
    setStatus(value === 'OPEN POs' ? 'Open' : 'Closed');
    setRetriggerSo(true)
    setCustomerCodes([])
  };
  
  const onSearch = (e) => {
      const { value } = e.target;
      debouncedSearch(value);
      setShowSearch(value);
      setPageNo(1);
    };
  const resetPage = () => {
      setShowSearch('');
      setSearch('');
      setFlag((prevFlag) => !prevFlag);
      setRetriggerSo(true)
      setCustomerCodes([])
  };

  const getData = async () => {
    if (adminAccessToken) {
      let poPayload = {
        limit: limit,
        offset: offset,
        search: search,
        status: status,
        date : {
         from: dateRange[0],
         to: dateRange[1],  
      },
       customerCodes: customerCodes,
      
      };
      let data = [];
      try {
        poPayload['role'] = auth.getAdminRole(); 
        poPayload['id'] = localStorage.getItem('user_id');
        data =  await shopifyPoList(poPayload);
        setPoData(data?.data);
      } catch (error) {
      } finally {
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
   if(search){
    setOffset(0);
    setPageNo(1);
    getData();
   }
   else{
    setRetriggerSo(true)
   }
  }, [search]);

  useEffect(() => {
    if(retriggerSo){
      getData();
      setRetriggerSo(false)
    }
  }, [offset, limit, status,dateRange,retriggerSo,customerCodes]);  
  
  const handleDateChange = (dateArray) => {
    let selectedDate = [];
    if (dateArray[0]) {
      selectedDate[0] = dateArray[0];
    }
    if (dateArray[1]) {
      selectedDate[1] = dateArray[1];
    }
    setDateRange(selectedDate);
    setSearch(search);
    setOffset(0);
    setLimit(10);
    setPageNo(1);
    setRetriggerSo(true)
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
          <h2 className="card-row-col">Shopify Dashboard</h2>
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
           
          </div>
          <div className="header-div">
            <div
              className="search_box-ecom"
            >
              <input
                type="text"
                className="search-fld"
                placeholder={
                   'Search by PO Number'
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
            {hasViewPermission(pages.SHOPIFY, features.SHOW_BUTTON_RESEND_PO) && (
            <div>
            <Tooltip placement="top" title={'Resend Failed PO to Portal'}>
                  <button onClick={showModal} className="resend-button">Resend PO</button>
            </Tooltip>
            </div>
               )}
          </div>
         
        </div>

         <div>
          {tabName === 'OPEN POs' && (
            <OpenPo
              poData={poData}
              flag={setFlag}
              status={setStatus}
              updatedLimit={setLimit}
              updatedOffset={setOffset}
              pageNo={pageNo}
              setPageNo={setPageNo}
              setRetriggerSo= {setRetriggerSo}
              setCustomerCodes={setCustomerCodes}
              visible={isModalVisible}
               />
          )}
           {tabName === 'CLOSED POs' && (
            <ClosedPo
              poData={poData}
              status={setStatus}
              flag={setFlag}
              updatedLimit={setLimit}
              updatedOffset={setOffset}
              pageNo={pageNo}
              setPageNo={setPageNo}
              setRetriggerSo= {setRetriggerSo}
              setCustomerCodes={setCustomerCodes}
              visible={isModalVisible}
            />
          )} 
        <div>
            <ResendPoModal
              visible={isModalVisible}
              onClose={handleCancel}
              resendPOData={resendPOData}
              salesOrg={salesOrgData}
            />
        </div>
          
        </div> 
      </div>
    </div>
  );
};
const mapStateToProps = (state) => { };

const mapDispatchToProps = (dispatch) => {
  return {
    shopifyPoList: (data) => dispatch(Actions.shopifyPoList(data)),
    getAllResendPOData: (userId) => dispatch(AdminActions.getAllResendPOData(userId)),
  };
};

const ShopifyDashboard = connect(
  mapStateToProps,
  mapDispatchToProps,
)(Dashboard);

export default ShopifyDashboard;
