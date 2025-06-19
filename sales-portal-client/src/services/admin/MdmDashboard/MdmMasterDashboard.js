
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './MdmMasterDashboard.css'
import Panigantion from '../../../components/Panigantion';
import LocalAuth from '../../../util/middleware/auth';
import { Button, Tag, Badge, Dropdown, Menu, Tooltip, notification, Popover } from 'antd';
import { EditTwoTone, CloseCircleTwoTone, SaveTwoTone, CheckCircleTwoTone, CheckCircleOutlined, BellTwoTone, SearchOutlined, InfoCircleFilled, DeleteTwoTone } from '@ant-design/icons';
import { useEffect } from 'react';
import SelectOption from './SelectOption';
import * as AdminActions from '../actions/adminAction';
import { connect } from 'react-redux';
import Util from '../../../util/helper/index'
import UploadExcel from '../../../components/UploadExcel/UploadExcel';
import { ActiveInActiveStatus, ArticleCodeStatus, ArticleDescription } from '../../../config/constant'
import HeaderSearchBox from '../../../components/HeaderSearchBox/HeaderSearchBox';
import MdmUploadErrorNotification from '../MdmDashboard/MdmUploadErrorNotification';
import { features, hasEditPermission, hasViewPermission, pages } from '../../../persona/mdm';
import OptionalColumns from "../../../components/OptionalColumns/OptionalColumns";
import { debounce } from 'lodash';
import NewPSku from '../CreateNewPSku/NewPSku.js';
import * as XLSX from 'xlsx';
import {RELIANCE_HEADER_DATA,ECOM_HEADER_DATA} from '../../../config/constant';


function MdmMasterDashboard(props) {

  const { getMdmData, downloadMdmData, UpdateFieldLevelData, uploadMdmData, uploadedFile, setUploadedFile, resetUploadedFileData,mtecomUpload,addUpdateMdm} = props
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoadingDownload, setIsLoadingDownload] = useState(false);
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jsonData, setJsonData] = useState([]);
  const [mdmData, setMdmData] = useState([]);
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(10)
  const [pageNo, setPageNo] = useState(1)
  const [count, setCount] = useState(0)
  const [customerName, setCustomerName] = useState()
  const [upadtedObject, setUpadtedObject] = useState({})
  const [kams, setKams] = useState('')
  const [region, setRegion] = useState('')
  const [customerCode, setCustomerCode] = useState([])
  const [siteCode, setSiteCode] = useState([])
  const [depotCode, setDepotCode] = useState([])
  const [vendorCode, setVendorCode] = useState([])
  const [status, setStatus] = useState([])
  const [articleCode, setArticleCode] = useState('')
  const [articleDescription, setArticleDescription] = useState('')
  const [disable, setDisable] = useState(true)
  const [filterData, setFilterData] = useState()
  const [previousData, setPreviousData] = useState({})
  const [enableSearch, setEnableSearch] = useState({ pskusearch: false, skuSearch: false, articleSearch: false })
  const [headerFilter, setHeaderFilter] = useState({})
  const [uploadErrors, setUploadsErrors] = useState()
  const [uploadsErrorsMessage, setUploadsErrorsMessage] = useState('')
  const [uploadErrorsModalVisible, setUploadErrorsModalVisible] = useState(false);
  const [displayableColumns, setDisplayableColumns] = useState([]);
  const [isNewPSkuVisible, setisNewPSkuVisible] = useState(false);
  const [unMapData, setUnMapData] = useState();
  const [type, setType] = useState('ADD');

  const columnsOptions = [
    { label: 'Parent SKU Desc', value: 'parentSkuDesc', default: true },
    { label: 'Child SKU Desc', value: 'childSkuDesc', default: true },
    { label: 'MRP', value: 'mrp' },
    { label: 'Division', value: 'division' },
    { label: 'Age', value: 'age' },
    { label: 'L1 Pack', value: 'l1_pack' },
    { label: 'L2 Pack', value: 'l2_pack' },
    { label: 'L3 Pack', value: 'l3_pack' },
    { label: 'L4 Pack', value: 'l4_pack' },
  ];
  const contents = (
    <div>
      <div>In Days</div>
    </div>
  );
  let role = LocalAuth.getAdminRole();
  let dataDownload = {}

  const onChangePage = (page, itemsPerPage) => {
    setLimit(itemsPerPage)
    setOffset((page - 1) * limit)
    setPageNo(page)
  }
  const closeEdit = (index, booleanFlag) => {
    mdmData[index].is_disabled = booleanFlag;
    mdmData[index].article_id = previousData.article_id;
    mdmData[index].article_desc = previousData.article_desc;
    setMdmData([...mdmData]);
  }
  const enableEdit = (index, booleanFlag) => {
    setPreviousData({
      article_id: mdmData[index].article_id,
      article_desc: mdmData[index].article_desc
    })
    mdmData[index].is_disabled = booleanFlag;
    setMdmData([...mdmData]);
  }
  const adminAccessToken = LocalAuth.getAdminAccessToken();
  useEffect(async () => {
    getData()
  }, [offset, limit, kams, customerCode, siteCode, depotCode, vendorCode, region, status, headerFilter, articleCode, articleDescription])

  useEffect(() => {
    if (kams) {
      setDisable(false)
      setRegion("")
      setCustomerCode("")
      setDepotCode("")
      setSiteCode("")
      setVendorCode("")
      setStatus("")
      setArticleCode("")
      setArticleDescription("")
    }
  }, [kams, disable]);
  const getData = async (flag =false) => {
    if (adminAccessToken) {
      let mdmPayload = {
        offset: offset,
        limit: limit,
        kams: kams || '',
        customerCode: customerCode || [],
        siteCode: siteCode || [],
        depotCode: depotCode || [],
        region: region || [],
        vendorCode: vendorCode || [],
        status: status || [],
        headerFilter: headerFilter || {},
        article_code: articleCode || '',
        article_desc: articleDescription || ''
      }
      const data = await getMdmData(mdmPayload)
      mdmPayload?.kams && setMdmData(data?.data?.rows)
      setCount(data?.data?.count)
      if (!customerName || flag) {
        setCustomerName(data?.data?.customer_name)
      }
      if (data?.data?.filter_data) {
        setFilterData(data?.data?.filter_data)
      }
    }
  }
  const onFilterChange = (e, propsKey) => {
    headerFilter[propsKey] = e.target.value
    setHeaderFilter({ ...headerFilter })
  }
  const debouncedOnFilterChange = debounce(onFilterChange, 500);

  const onClose = (propKey) => {
    setEnableSearch({ ...enableSearch, [propKey]: false })
    delete headerFilter[propKey]
    setHeaderFilter({ ...headerFilter })
  }
  const fieldOnChnage = (e, index, type) => {
    mdmData[index][type] = e.target.value
    setMdmData([...mdmData])
  }
  const onFieldLevelSave = async (index) => {
    mdmData[index].is_disabled = true;
    setMdmData([...mdmData])
    const response = await UpdateFieldLevelData(mdmData[index]);
    if (response.success == true) {
      Util.notificationSender('Success', response.message, true)
    } else {
      mdmData[index].article_id = previousData.article_id;
      mdmData[index].article_desc = previousData.article_desc;
      setMdmData([...mdmData]);
      Util.notificationSender('Error', response.message, false)
    }
  }
  const fetchAging = (data) => {
    if (data.article_id === "" || data.article_desc === "" || data.article_id === null || data.article_desc === null) {
      if (data.updated_on) {
        return Math.floor((new Date() - new Date(data.updated_on)) / (1000 * 60 * 60 * 24))

      }
      else
        return Math.floor((new Date() - new Date(data.created_on)) / (1000 * 60 * 60 * 24))

    }
    else
      return '-'
  }
  const downloadData = async (key, loaderOff,customer) => {
    if (customer){
      if (customer === 'Reliance') handleDownload(RELIANCE_HEADER_DATA,customer)
      else handleDownload(ECOM_HEADER_DATA,customer)
    }
    else{
      dataDownload['kams'] = kams
      dataDownload['key'] = key
      dataDownload =
      {
        kams: kams || '',
        key: key || false,
        customerCode: customerCode || [],
        siteCode: siteCode || [],
        depotCode: depotCode || [],
        region: region || [],
        vendorCode: vendorCode || [],
        status: status || [],
        headerFilter: headerFilter || {},
        article_code: articleCode || '',
        article_desc: articleDescription || ''
      }
  
      setIsLoadingDownload(true)
      const responseData = await downloadMdmData({ dataDownload });
      if (responseData.success == false) {
        Util.notificationSender('Error', responseData.message, false)
      }
      else {
        //await Util.downloadExcelData(responseData);
        await Util.downloadExcelFile(responseData);
        Util.notificationSender('Success', 'Data Downloaded Successfully', true)
      }
  
  
      const Timeout = setTimeout(() => {
        setIsLoadingDownload(loaderOff)
      }, 1000);
  
      return (() => {
        clearTimeout(Timeout)
      })
    }
  }
  const handleDownload = (headers,customer) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([], { header: headers  });
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, customer+" master data template.xlsx");
  }

  const menu = () => {
    return (
      <Menu>
        <Menu.Item key='0' onClick={() => downloadData(true, false,"")}>
          <a>Download Mapped Data</a>
        </Menu.Item>
        <Menu.Item key='1' onClick={() => downloadData(false, false,"")}>
          <a>Download Unmapped Data</a>
        </Menu.Item>
        <Menu.Item key='1' onClick={() => downloadData(false, false,kams)}>
          <a>Download master data Template</a>
        </Menu.Item>
      </Menu>
    )
  }
  const exportData = () => {
    return (
      <Dropdown overlay={menu} disabled={!kams}>
        <Tooltip title={!kams ? 'Select customer name' : ''}>
          <Button
            className='Mdm-button'
            loading={false}
          >
            Export
          </Button>
        </Tooltip>
      </Dropdown>
    )
  };
  const uploadData = async () => {
    setIsLoadingUpload(true)
    setIsModalOpen(false)
    const data = new FormData();
    data.append('file', uploadedFile);
    data.append('user_id', localStorage.getItem('user_id'));
    if (!uploadedFile) {
      Util.notificationSender('Error', 'Please upload a file', false)
      return
    }
      const responseData = await mtecomUpload(data);
      const response = responseData?.data?.body;
      if (!response?.Success) {
        Util.notificationSender('Failed', response?.Failed, false)
      }
      else if(response?.data?.excluded_data?.length && response?.data?.uploaded_data){ {
        Util.notificationSender('Failed', 'Upload Failed Partially', false)
      }
      resetUploadedFileData()
      getData(true)
      setUploadsErrors(response?.data?.excluded_data) 
      setUploadsErrorsMessage("Upload Failed Partially : " + response?.data?.excluded_data.length + " rows failed to upload out of " + response?.data?.total_data + " rows attempted") 
      setUploadErrorsModalVisible(true);
    
    }else if(response?.data?.excluded_data?.length && !response?.data?.uploaded_data){ {
      Util.notificationSender('Failed', "Upload Failed Completely", false)
    }
    resetUploadedFileData()
    getData(true)
    setUploadsErrors(response?.data?.excluded_data) 
    setUploadsErrorsMessage("Upload Failed Completely : " + response?.data?.excluded_data.length + " rows failed to upload out of " + response?.data?.total_data + " rows attempted") 
    setUploadErrorsModalVisible(true);

    }else {
      Util.notificationSender('Success', response?.Success, true)
    }
    resetUploadedFileData()
    getData(true)
  
}

  function uploadModalOnClickHandler() {
    resetUploadedFileData();
    setIsModalOpen(true);
  }

  const createPSKU = () => {
    setisNewPSkuVisible(true)
    setType('ADD');
  }

  const EditSkuData = async (index, booleanFlag) => {
    setUnMapData(mdmData[index]);
    setisNewPSkuVisible(true)
    setType('UNMAP');
  }
  const handleNewPSkuCancelModal = () => {
    setisNewPSkuVisible(false);
  };

  const handleNewUpdatePsku = async (data) => {
    const res = await addUpdateMdm(data);
    await getData();
    if (res.success === true) {
      Util.notificationSender('Success', res.message, true);
    } else {
      Util.notificationSender('Error', res.message, false)
    };
  }
  return (
    <React.Fragment>
      <div className="admin-dashboard-wrapper">
        <div className="admin-dashboard-block">
          <div className="admin-dashboard-head Mdm-Header">
            <h2><b>SKU Data Management
              {/* <Link to="admin/mdm-report"><BellTwoTone  className='mdm-noti-icon'/> */}
              {/* <Badge className='mdm-badge' count={5} offset={[1,-23]}> </Badge></Link> */}
            </b></h2>
          </div>
          <div className='admin-dashboard-table Mdm-TableHeader'>
            <SelectOption for={'Customer Name'} mode={'single'} value={customerName} setKams={setKams} selectedValue={kams} mandatory={true} />
            <SelectOption for={'Customer Code'} value={filterData} disable={disable} setCustomerCode={setCustomerCode} values={customerCode} />
            <SelectOption for={'Region'} value={filterData} disable={disable} setRegion={setRegion} customerCode={customerCode} values={region} />
            <SelectOption for={'Site Code'} value={filterData} disable={disable} setSiteCode={setSiteCode} values={siteCode} />
            <SelectOption for={'Depot Code'} value={filterData} disable={disable} setDepotCode={setDepotCode} values={depotCode} />
            <SelectOption for={'Vendor Code'} value={filterData} disable={disable} setVendorCode={setVendorCode} values={vendorCode} />
            <SelectOption for={'Article Code'} mode={'single'} value={ArticleCodeStatus} disable={disable} setArticleCode={setArticleCode} values={articleCode} />
            <SelectOption for={'Article Description'} mode={'single'} value={ArticleDescription} disable={disable} setArticleDescription={setArticleDescription} values={articleDescription} />
            <SelectOption for={'Status'} value={ActiveInActiveStatus} disable={disable} setStatus={setStatus} values={status} />
            <div className='Mdm-Button-Container'>
              <OptionalColumns columns={columnsOptions} selectedColumns={displayableColumns} onChangeSelection={setDisplayableColumns} />
                {kams  && 
                <span>
                <Button
                  className='Mdm-button'
                  loading={false}
                  onClick={createPSKU}
                >
                  Add New
                </Button>
              </span>
                }
                
              {exportData()}
                <span>
                  <Button
                    className='Mdm-button'
                    type="primary"
                    loading={false}
                    onClick={uploadModalOnClickHandler}
                  >
                    Import
                  </Button>
                </span>
            </div>
            <UploadExcel
              sendData={uploadData}
              setIsModalOpen={setIsModalOpen}
              setJsonData={setJsonData}
              isModalOpen={isModalOpen} />
            <table className='MdmTable'>
              <thead>
                <tr>
                  {!enableSearch.pskusearch ? <th className='width12'>
                    Parent SKU Code <SearchOutlined onClick={() => { setEnableSearch({ ...enableSearch, pskusearch: true }) }} /></th>
                    : <th className='width12'><HeaderSearchBox onClose={onClose} onFilterChange={debouncedOnFilterChange} propKey={'pskusearch'} /></th>}
                  {displayableColumns.includes("parentSkuDesc") && <th className="width15">Parent SKU Description</th>}
                  {!enableSearch.skuSearch ? <th className='width12'>Child SKU Code <SearchOutlined onClick={() => { setEnableSearch({ ...enableSearch, skuSearch: true }) }} /></th>
                    : <th className='width12'><HeaderSearchBox onClose={onClose} onFilterChange={debouncedOnFilterChange} propKey={'skuSearch'} /></th>}
                  {displayableColumns.includes("childSkuDesc") && <th className="width15">Child SKU Description </th>}
                  {!enableSearch.articleSearch ? <th className='width10'>Article Code <SearchOutlined onClick={() => { setEnableSearch({ ...enableSearch, articleSearch: true }) }} /></th>
                    : <th className='width10'><HeaderSearchBox onClose={onClose} onFilterChange={debouncedOnFilterChange} propKey={'articleSearch'} /></th>}
                  <th className='width12'>Article Description</th>
                  {displayableColumns.includes("mrp") && <th className="width3">MRP</th>}
                  {displayableColumns.includes("division") && <th className="width7">Division</th>}
                  {displayableColumns.includes("age") && <th style={{ width: '6%' }}>Age
                    <Popover content={contents} placement="bottom" trigger="hover"
                      className="th-info-icon">
                      <InfoCircleFilled />
                    </Popover></th>}
                  {displayableColumns.includes("l1_pack") && <th className="width7">L1 Pack</th>}
                  {displayableColumns.includes("l2_pack") && <th className="width7">L2 Pack</th>}
                  {displayableColumns.includes("l3_pack") && <th className="width7">L3 Pack</th>}
                  {displayableColumns.includes("l4_pack") && <th className="width7">L4 Pack</th>}
                  {<th className="width4">Vendor Code</th>}
                  {<th className="width4">Site Code</th>}
                  {<th className="width4">Priority</th>}
                  {<th className='width3'>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {mdmData && mdmData?.length > 0
                  && (mdmData.map((data, index) => {
                    return (
                      <tr style={{ backgroundColor: data?.article_id === "" || data?.article_desc === "" || data?.article_id === null || data?.article_desc === null ? 'rgb(225 95 95 / 63%)' : "" }}>
                        <td>{data?.psku}</td>
                        {displayableColumns.includes("parentSkuDesc") && <td className='width5'>{data?.psku_desc}</td>}
                        <td>{data?.sku} </td>
                        {displayableColumns.includes("childSkuDesc") && <td>{data?.sku_desc}</td>}
                        {!data?.is_disabled ?
                          <td><input type="text" disabled={data?.is_disabled} value={data?.article_id}
                            onChange={(e) => fieldOnChnage(e, index, 'article_id')} />
                          </td> : <td>{data?.article_id}</td>
                        }
                        {!data?.is_disabled ? <td>
                          <input type="text" disabled={data?.is_disabled} value={data?.article_desc}
                            onChange={(e) => fieldOnChnage(e, index, 'article_desc')} />
                        </td> : <td>{data?.article_desc}</td>
                        }
                        {displayableColumns.includes("mrp") && <td>{data?.mrp}</td>}
                        {displayableColumns.includes("division") && <td>{data?.division}</td>}
                        {displayableColumns.includes("age") && <td>{fetchAging(data)}</td>}
                        {displayableColumns.includes("l1_pack") && <td>{`${data?.l1_pack}` === "null" ? '-' : `${data?.l1_pack} ${data?.l1_pack_uom}`}</td>}
                        {displayableColumns.includes("l2_pack") && <td>{`${data?.l2_pack}` === "null" ? '-' : `${data?.l2_pack} ${data?.l2_pack_uom}`}</td>}
                        {displayableColumns.includes("l3_pack") && <td>{`${data?.l3_pack}` === "null" ? '-' : `${data?.l3_pack} ${data?.l3_pack_uom}`}</td>}
                        {displayableColumns.includes("l4_pack") && <td>{`${data?.l4_pack}` === "null" ? '-' : `${data?.l4_pack} ${data?.l4_pack_uom}`}</td>}
                        {<td>{data?.vendor_code}</td>}
                        {<td>{data?.site_code}</td>}
                        {<td>{data?.priority}</td>}
                        <td>
                          <div className='mdm-action-button'>
                              {hasEditPermission(pages.SKU_DATA_MANAGEMENT) &&
                                <EditTwoTone onClick={() => EditSkuData(index, false)} />
                  }
                           
                          </div>
                        </td>
                      </tr>
                    )
                  })
                  )}
              </tbody>
            </table>
            {!(mdmData?.length > 0) && (<div className='NoDataDiv'>
              <b> No data available. Please make sure you have selected a "Customer Name"</b>
            </div>)}
          </div>
          {(mdmData?.length > 0) &&
            <Panigantion
              data={mdmData ? mdmData : []}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              itemsCount={count}
              setModifiedData={onChangePage}
              pageNo={pageNo}
            />}
          <MdmUploadErrorNotification
            visible={uploadErrorsModalVisible}
            data={uploadErrors}
            message={uploadsErrorsMessage}
            handleErrorCancel={() => setUploadErrorsModalVisible(false)} />
          {
            hasEditPermission(pages.SKU_DATA_MANAGEMENT) &&
            <NewPSku
              visible={!!isNewPSkuVisible}
              onCancel={handleNewPSkuCancelModal}
              getMdmData={getMdmData}
              onSave={handleNewUpdatePsku}
              data={unMapData}
              type={type}
              kams = {kams}
            />
          }
        </div>
      </div>
    </React.Fragment>
  );
}
const mapStateToProps = (state) => {
  return {
    uploadedFile: state.admin.get('uploaded_file')
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    downloadMdmData: ({ dataDownload }) => dispatch(AdminActions.downlaodMdmData({ dataDownload })),
    getMdmData: (mdmPayload) => dispatch(AdminActions.getMdmData(mdmPayload)),
    UpdateFieldLevelData: (data) => dispatch(AdminActions.UpdateFieldLevelData(data)),
    uploadMdmData: (data) => dispatch(AdminActions.uploadMdmData(data)),
    resetUploadedFileData: () => dispatch(AdminActions.resetUploadFileData()),
    mtecomUpload: (data) => dispatch(AdminActions.mtecomUpload(data)),
    addUpdateMdm: (data) => dispatch(AdminActions.addUpdateMdm(data))
  }
}


export default connect(mapStateToProps, mapDispatchToProps)(MdmMasterDashboard)