import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import moment from 'moment';
import { notification, Select, Tooltip, Modal, Form, DatePicker } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import * as AdminAction from './actions/adminAction';
import '../../style/admin/SyncJobs.css';
import Auth from '../../util/middleware/auth';
import ReactExport from 'react-data-export';
import Loader from '../../components/Loader';
import { pages, hasEditPermission, hasViewPermission } from '../../persona/distributorHeader';
import Util from '../../util/helper';
import _ from 'lodash';
import { InputNumber } from 'antd';
import ForecastAllocationSync from './ForecastSync/ForecastAllocation';
import PhasingSync from './ForecastSync/PhasingSync';
import ForecastSyncConnect from './ForecastSync/ForecastDump';

const ExcelFile = ReactExport.ExcelFile;
const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;
const specialActionSyncs = ['Material Tags Sync', 'Distributor Census Customer Group Sync', 'SKU SOQ Norm Sync', 'NourishCo Planning Sync'];
const uploadDownloadSyncs = ['Material Tags Sync', 'Distributor Census Customer Group Sync', 'SKU SOQ Norm Sync', 'NourishCo Planning Sync'];
const weightedAvgSyncs = ['ARS Forecast Dump', 'ARS Forecast Allocation', 'ARS Phasing'];

const { Option } = Select;
const { RangePicker } = DatePicker;

let SyncJobs = (props) => {
    //-----------------------------------------------------=====Props and Constants====--------------------------------------------
    const browserHistory = props.history;
    const {
        getSSODetails,
        downloadSampleTag,
        sso_user_details,
        dashboardFilterCategories,
        dlpSync,
        fetchDlpReportData,
        updateSkuSoqNorm,
        updateDBPopClass,
        downloadSkuSoqNorm,
        downloadDBPopClass,
        getArsAreaCodes,
        getForecastConfigurations,
        insertSyncLog,
        syncForecastDump,
        syncForecastAllocation,
        syncPhasing,
        upsertNourishcoPlanningSync,
        downloadNourishcoPlanning,
    } = props;
    const ssoRole = sso_user_details.data && sso_user_details.data.length && sso_user_details.data[0].roles;

    const syncNow = {
        'Material Sync': materialSync,
        'Distributor Sync': distributorSync,
        'MT ECOM SO Sync': mtEcomSOSync,
        'Sales Hierarchy Sync': salesHierarchySync,
        'Material Tags Sync': materialTagsSync,
        'SAP Holiday Sync': sapHolidaySync,
        'SKU Distributor Planning Sync': skuDistributorPlanningSync,
        'PSKU Distributor Planning Sync': pskuDistributorPlanningSync,
        'MDM Sync': mdmSync,
        'DLP Sync': dlpSyncFunc,
        'SKU SOQ Norm Sync': skuSoqNormSync,
        'Distributor Census Customer Group Sync': distributorCensusCustomerGroupSync,
        'ARS Forecast Dump': arsForecastDump,
        'ARS Forecast Allocation': arsForecastAllocation,
        'ARS Phasing': arsPhasing,
        'NourishCo Planning Sync': nourishcoPlanningSync,
    };

    const downloadFunctions = {
        'Material Tags Sync': downloadMaterialTags,
        'SKU SOQ Norm Sync': downloadSkuSoqNormHandler,
        'Distributor Census Customer Group Sync': downloadDBPopClassHandler,
        'NourishCo Planning Sync': downloadNourishcoForecast,
    };

    const MapJobsName = (data, settings) => {
        let pskuSetting = settings.filter((setting) => setting.key === 'ENABLE_PSKU')[0];
        const syncObj = {
            MATERIAL: 'Material Sync',
            DISTRIBUTOR: 'Distributor Sync',
            SALES_HIER: 'Sales Hierarchy Sync',
            MATERIAL_TAGS: 'Material Tags Sync',
            // MDM_SYNC: 'MDM Sync',
            SAP_HOLIDAY_SYNC: 'SAP Holiday Sync',
            DIST_INVENTORY: pskuSetting.value === 'NO' ? 'SKU Distributor Planning Sync' : '',
            PSKU_DIST_INVENTORY: pskuSetting.value === 'YES' ? 'PSKU Distributor Planning Sync' : '',
            NOURISHCO_PLANNING_SYNC: 'NourishCo Planning Sync',
            DLP_SYNC: 'DLP Sync',
            SKU_SOQ_NORM: 'SKU SOQ Norm Sync',
            DISTRIBUTOR_CENSUS_CUSTOMER_GROUP: 'Distributor Census Customer Group Sync',
            ARS_FORECAST_DUMP: 'ARS Forecast Dump',
            ARS_FORECAST_ALLOCATION: 'ARS Forecast Allocation',
            ARS_PHASING: 'ARS Phasing',
            'MT ECOM SO Sync': 'MT ECOM SO Sync',
        };
        let mappedList = data.map((item) => {
            if (Object.hasOwn(syncObj, item.type)) {
                const syncData = syncObj[item.type];
                if (syncData == '') item = '';
                else item.type = syncObj[item.type];
            } else item = '';
            return item;
        });
        return mappedList;
    };

    //-----------------------------------------------------=====useState====-------------------------------------------------------
    const [list, setList] = useState([]);
    const [settingsList, setSettingsList] = useState([]);
    const [areaCode, setAreaCode] = useState([]);
    const [selectedAreaCodes, setSelectedAreaCodes] = useState([]);
    const [mismatchData, setMismatchData] = useState([]);
    const [dlpReports, setDlpReports] = useState([]);
    const [cronList, setCronList] = useState([]);
    const [year, setYear] = useState([new Date().getFullYear()]);
    const [downloadData, setDownloadData] = useState({});
    const [openArsModal, setOpenArsModal] = useState(false);

    //-----------------------------------------------------=====useRef====---------------------------------------------------------
    const fileRefs = useRef({});
    const selectedFiles = useRef({});

    //-----------------------------------------------------=====useEffect====------------------------------------------------------
    useEffect(() => {
        if (!sso_user_details || !Object.keys(sso_user_details).length) {
            const adminAccessDetails = Auth.getAdminAccessDetails();
            let sso_detail = {};
            if (adminAccessDetails && Object.keys(JSON.parse(adminAccessDetails)).length > 0) {
                sso_detail = JSON.parse(adminAccessDetails);
            }
            const emailId = sso_detail && sso_detail.username && sso_detail.username.replace(process.env.REACT_APP_COGNITO_IDP_NAME, '');

            if (emailId) getSSODetails(emailId, props.history);
        }
    }, [sso_user_details]);

    useEffect(() => {
        if (settingsList.length === 0) {
            appSettingList();
        } else if (settingsList && settingsList.length > 0) {
            syncJobs();
            dashboardFilterCategories().then((response) => {
                const areaCodeSet = new Set();
                response.response.area_details.forEach((area) => {
                    areaCodeSet.add(area.area_code);
                });
                setAreaCode(Array.from(areaCodeSet));
            });
        }
    }, [settingsList]);

    useEffect(() => {
        if (ssoRole && !hasViewPermission(pages.SYNC_JOBS)) {
            browserHistory.push('/admin/dashboard');
        }
    }, [ssoRole]);

    //-----------------------------------------------------=====Event Handlers=====------------------------------------------------
    const fileChangeHandlers = (event) => {
        const file = event?.target.files[0];
        const type = event?.target.id?.split('#')[1];
        if (file) {
            selectedFiles.current[type] = file;
        }
    };

    function arsForecastDump() {
        setOpenArsModal('ARS Forecast Dump');
    }
    function arsForecastAllocation() {
        setOpenArsModal('ARS Forecast Allocation');
    }
    function arsPhasing() {
        setOpenArsModal('ARS Phasing');
    }

    //-----------------------------------------------------=====API Calls=====-----------------------------------------------------
    const appSettingList = () => {
        props
            .getAppSettingList()
            .then((res) => {
                if (res && res.success) {
                    const { data: logsList = [] } = res ? res : {};
                    if (logsList.length <= 0) {
                        errorHandler('Error Occurred!', 'Technical error while fetching app settings, please try again later.');
                    } else {
                        setSettingsList(logsList);
                    }
                } else {
                    errorHandler('Error Occurred!', 'Technical error while fetching app settings, please try again later.');
                }
            })
            .catch(() => {
                errorHandler('Error Occurred!', 'Technical error while fetching app settings, please try again later.');
            });
    };

    const syncJobs = () => {
        props
            .getSyncJobs()
            .then((res) => {
                if (res && res.status === 200) {
                    const { data = {} } = res;
                    const { data: logsList = [] } = data ? data : {};
                    if (logsList.length <= 0) {
                        errorHandler('Error Occurred!', 'Technical error while fetching sync logs, please try again later.');
                    } else {
                        let tempList = MapJobsName(logsList, settingsList).filter((i) => i);
                        const tempCronList = logsList.filter((item) => item.is_cron_job);
                        setList(tempList);
                        setCronList(_.sortBy(tempCronList, ['type']));
                    }
                } else {
                    errorHandler('Error Occurred!', 'Technical error while fetching sync logs, please try again later.');
                }
            })
            .catch(() => {
                errorHandler('Error Occurred!', 'Technical error while fetching sync logs, please try again later.');
            });
    };

    function materialSync() {
        props
            .materialSync()
            .then((res) => {
                responseHandler(res, 'Material Sync');
            })
            .catch(() => {
                errorHandler('Material Sync');
            });
    }

    function distributorSync() {
        props
            .distributorSync()
            .then((res) => {
                responseHandler(res, 'Distributor Sync');
            })
            .catch(() => {
                errorHandler('Distributor Sync');
            });
    }
    function mtEcomSOSync() {
        props
            .mtEcomSOSync()
            .then((res) => {
                responseHandler(res, 'MT ECOM SO Sync');
            })
            .catch(() => {
                errorHandler('MT ECOM SO Sync');
            });
    }

    function salesHierarchySync() {
        props
            .salesHierarchySync()
            .then((res) => {
                responseHandler(res, 'Sales Hierarchy Sync');
            })
            .catch(() => {
                errorHandler('Sales Hierarchy Sync');
            });
    }

    function materialTagsSync() {
        const key = 'Material Tags Sync';
        const uploadedFile = selectedFiles.current[key];
        if (!uploadedFile?.name) {
            Util.notificationSender('Error', 'Please upload a file', false);
            return;
        }
        const formData = new FormData();
        formData.append('dataset', uploadedFile);
        props
            .updateMaterialTags(formData)
            .then((res) => {
                responseHandler(res, key);
                fileRefs.current[key] = '';
                selectedFiles.current[key] = '';
            })
            .catch(() => {
                errorHandler(key);
            });
    }

    function sapHolidaySync(year) {
        if (year == null) {
            errorHandler('SAP Holiday Sync', 'Error occurred!', 'Please enter a valid year');
            return;
        }
        props
            .updateSAPHolidays({ selectedYears: year })
            .then((res) => {
                responseHandler(res, 'SAP Holiday Sync');
                setYear([new Date().getFullYear()]);
            })
            .catch((err) => {
                console.error('Error updating SAP holidays:', err);
                errorHandler('SAP Holiday Sync');
            });
    }

    function skuDistributorPlanningSync() {
        props
            .skuDistributorPlanningSync()
            .then((res) => {
                responseHandler(res, 'SKU Distributor Planning Sync');
            })
            .catch(() => {
                errorHandler('SKU Distributor Planning Sync');
            });
    }

    function pskuDistributorPlanningSync() {
        props
            .pskuDistributorPlanningSync()
            .then((res) => {
                responseHandler(res, 'PSKU Distributor Planning Sync');
            })
            .catch(() => {
                errorHandler('PSKU Distributor Planning Sync');
            });
    }

    function mdmSync() {
        props
            .mdmSync()
            .then((res) => {
                responseHandler(res, 'MDM Sync');
            })
            .catch(() => {
                errorHandler('MDM Sync');
            });
    }

    function dlpSyncFunc() {
        if (selectedAreaCodes.length === areaCode.length) {
            setSelectedAreaCodes([]);
        }
        dlpSync({ area_codes: selectedAreaCodes })
            .then((response) => {
                if (response.success) Util.notificationSender('Success', response.message, true);
                else Util.notificationSender('Failure', response.message);
            })
            .catch((err) => {
                Util.notificationSender('Failure', err);
            });
    }

    function skuSoqNormSync() {
        const key = 'SKU SOQ Norm Sync';
        const uploadedFile = selectedFiles.current[key];
        const formData = new FormData();
        formData.append('file', uploadedFile);
        if (!uploadedFile?.name) {
            Util.notificationSender('Error', 'Please upload a file', false);
            return;
        }
        const acceptedFileTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!acceptedFileTypes.includes(uploadedFile.type)) {
            Util.notificationSender('Error', 'Please upload an excel file', false);
            return;
        }
        updateSkuSoqNorm(formData)
            .then((res) => {
                fileRefs.current[key] = '';
                selectedFiles.current[key] = '';

                responseHandler(res, 'SKU SOQ Norm Sync');
            })
            .catch(() => {
                errorHandler('SKU SOQ Norm Sync');
            });
    }

    function nourishcoPlanningSync() {
        const key = 'NourishCo Planning Sync';
        const uploadedFile = selectedFiles.current[key];
        const formData = new FormData();
        formData.append('file', uploadedFile);
        if (!uploadedFile?.name) {
            Util.notificationSender('Error', 'Please upload a file', false);
            return;
        }
        const acceptedFileTypes = ['text/csv'];
        if (!acceptedFileTypes.includes(uploadedFile.type)) {
            Util.notificationSender('Error', 'Please upload an csv file', false);
            return;
        }
        upsertNourishcoPlanningSync(formData)
            .then((res) => {
                fileRefs.current[key] = '';
                selectedFiles.current[key] = '';
                responseHandler(res, 'NourishCo Planning Sync');
            })
            .catch(() => {
                errorHandler('NourishCo Planning Sync');
            });
    }

    function distributorCensusCustomerGroupSync() {
        const key = 'Distributor Census Customer Group Sync';
        const uploadedFile = selectedFiles.current[key];
        const formData = new FormData();
        formData.append('file', uploadedFile);
        if (!uploadedFile?.name) {
            Util.notificationSender('Error', 'Please upload a file', false);
            return;
        }
        const acceptedFileTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!acceptedFileTypes.includes(uploadedFile.type)) {
            Util.notificationSender('Error', 'Please upload an excel file', false);
            return;
        }
        updateDBPopClass(formData)
            .then((res) => {
                fileRefs.current[key] = '';
                selectedFiles.current[key] = '';
                responseHandler(res, 'Distributor Census Customer Group Sync');
            })
            .catch(() => {
                errorHandler('Distributor Census Customer Group Sync');
            });
    }

    function downloadNourishcoForecast() {
        downloadNourishcoPlanning()
            .then((res) => {
                if (res?.success) {
                    window.location.href = res?.data;
                } else {
                    Util.notificationSender('Error', res?.message, false);
                }
            })
            .catch((err) => {
                console.log(err);
                Util.notificationSender('Technical Error', 'Could not download the file. Please try again later.', false);
            });
    }

    function downloadMaterialTags() {
        const key = 'Material Tags Sync';
        downloadSampleTag().then((res) => {
            let finalObj = res?.data.map((obj) => {
                return {
                    Material: obj?.code,
                    Description: obj?.description,
                    'Pack Measure Tags': obj?.tags?.pack_measure_tags,
                    'Regional Brand Tags': obj?.tags?.regional_brand_tags,
                    'General Tags': obj?.tags?.general_tags,
                    'Pack Type Tags': obj?.tags?.pack_type_tags,
                };
            });
            const temp = _.cloneDeep(downloadData);
            temp[key] = finalObj;
            setDownloadData(temp);
            document.getElementById(`download#${key}`)?.click();
        });
    }

    function downloadDLPReport() {
        fetchDlpReportData().then((res) => {
            setDlpReports(res.dlpReportResult);
            setMismatchData(res.mismatchResult);
            document.getElementById('dlpReportDownload').click();
        });
    }

    function downloadSkuSoqNormHandler() {
        const key = `SKU SOQ Norm Sync`;
        downloadSkuSoqNorm()
            .then((res) => {
                const temp = _.cloneDeep(downloadData);
                temp[key] = res?.data;
                setDownloadData(temp);
                document.getElementById(`download#${key}`)?.click();
            })
            .catch(() => {});
    }

    function downloadDBPopClassHandler() {
        downloadDBPopClass()
            .then((res) => {
                const key = 'Distributor Census Customer Group Sync';
                const temp = _.cloneDeep(downloadData);
                temp[key] = res?.data;
                setDownloadData(temp);
                document.getElementById(`download#${key}`)?.click();
            })
            .catch((error) => {
                console.log(error);
            });
    }

    // ----------------------------------------------------=====Helpers=====-------------------------------------------------------
    const setFileRefs = (element) => {
        const type = element?.id?.split('#')[1];
        if (type) fileRefs.current[type] = element;
    };
    let errorHandler = (type, message = null, description = null) => {
        notification.error({
            message: message || 'Error Occurred!',
            description: description || `Technical error occurred while syncing ${type}, try again later.`,
            duration: 8,
            className: 'notification-error',
        });
        syncJobs();
    };

    const responseHandler = (res, type) => {
        const { data = {} } = res;
        if (res && res.status === 200) {
            if (data.success) {
                notification.info({
                    message: 'Synced',
                    description: data.message,
                    duration: 10,
                    className: 'notification-green',
                });
                syncJobs();
            } else {
                errorHandler(type, null, data.message || null);
            }
        } else {
            errorHandler(type, null, data.message || null);
        }
    };

    // ----------------------------------------------------=====Renders=====-------------------------------------------------------

    return (
        <div className="sync-wrapper">
            <div className="sync-block">
                <div className="sync-head">
                    <h2 className="sync-text">Sync Jobs</h2>
                </div>
                <div className="dashboard-table sync-table">
                    <table className="sync-table-table">
                        <Loader>
                            <thead className="sales-orders-th">
                                <tr>
                                    <th className="thead-po">Job Name</th>
                                    {/* <th>Last success time</th> */}
                                    <th>Last run time</th>
                                    <th>Last modified</th>
                                    <th>Last result</th>
                                    <th id="action-sync">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((item, i) => {
                                    return (
                                        <React.Fragment key={`items-list-${i}`}>
                                            <tr>
                                                <td className="#">{item.type ? item.type : '-'}</td>
                                                {/* <td>
                        {item.success_at
                          ? moment(item.success_at).format(
                            'DD MMM, YYYY, h:mm A',
                          )
                          : '-'}
                      </td> */}
                                                <td>
                                                    {item.run_at ? Util.convertUTCtoIST(item.run_at) : '-'}
                                                    {item.filename && item.success_at ? (
                                                        <i className="info-icon">
                                                            <Tooltip
                                                                placement="bottom"
                                                                title={
                                                                    item.filename && item.success_at
                                                                        ? 'Successfully run at ' + Util.formatDateTime(item.success_at) + ' / ' + item.filename
                                                                        : '-'
                                                                }>
                                                                <InfoCircleOutlined />
                                                            </Tooltip>
                                                        </i>
                                                    ) : (
                                                        ''
                                                    )}
                                                </td>
                                                <td>{item.upsert_count ? item.upsert_count : '-'}</td>
                                                <td>
                                                    {item.result ? item.result : '-'}
                                                    {item.result === 'FAIL' && (
                                                        <i className="info-icon">
                                                            <Tooltip placement="bottom" title={item.error_log ?? '-'}>
                                                                <InfoCircleOutlined />
                                                            </Tooltip>
                                                        </i>
                                                    )}
                                                </td>

                                                <td className="sync-actions-btns">
                                                    {/* {item.type === 'Material Tags Sync' && hasEditPermission(pages.SYNC_JOBS) &&
                            <div className='sync-btn-group'>
                              <div className='upload-sync'>
                                <label for="upload-file">
                                  <input id="upload-file" type="file" name="file" ref={fileRef} onChange={changeHandler} />
                                </label>
                              </div>
                              <div className="session-download-btn2">
                                <button
                                  className="sync-run-btn"
                                  type="button"
                                  onClick={() => {
                                    syncNow[item.type]()
                                  }}
                                >
                                  {'Upload & Run'}
                                </button>
                                <ExcelFile
                                  filename={`Ordering_Portal_Material_List_with_tagging_${new Date().getFullYear() + '_' + (new Date().getMonth() + 1) + '_' + new Date().getDate()}`}
                                  element={<button className="sync-run-btn"
                                  >
                                    {'Download Current Tags'}
                                  </button>}
                                >
                                  <ExcelSheet data={tagExcelData} name="Material_List_with_tagging">
                                    <ExcelColumn label="Material" value="code" />
                                    <ExcelColumn label="Description" value="description" />
                                    <ExcelColumn label="Pack Measure Tags" value="pack_measure_tags" />
                                    <ExcelColumn label="Regional Brand Tags" value="regional_brand_tags" />
                                    <ExcelColumn label="General Tags" value="general_tags" />
                                    <ExcelColumn label="Pack Type Tags" value="pack_type_tags" />

                                  </ExcelSheet>
                                </ExcelFile>
                              </div>
                            </div>
                          } */}
                                                    {item.type === 'SAP Holiday Sync' && hasEditPermission(pages.SYNC_JOBS) && (
                                                        <div className="sync-btn-group">
                                                            <InputNumber
                                                                min={2020}
                                                                max={2050}
                                                                style={{
                                                                    marginRight: '10px',
                                                                    width: 'max-content',
                                                                    minWidth: '100px',
                                                                }}
                                                                placeholder="Enter Year"
                                                                value={year}
                                                                onChange={(val) => setYear(val)}
                                                            />
                                                        </div>
                                                    )}
                                                    {item.type === 'DLP Sync' && hasEditPermission(pages.SYNC_JOBS) && (
                                                        <Select
                                                            mode="multiple"
                                                            options={areaCode.map((item) => ({
                                                                label: item,
                                                                value: item,
                                                            }))}
                                                            maxTagCount={1}
                                                            showArrow
                                                            showSearch
                                                            style={{
                                                                marginRight: '10px',
                                                                width: 'max-content',
                                                                minWidth: '100px',
                                                            }}
                                                            placeholder="All Area"
                                                            onChange={(val) => setSelectedAreaCodes(val)}
                                                            getPopupContainer={(trigger) => trigger.parentNode}
                                                        />
                                                    )}
                                                    {!specialActionSyncs.includes(item.type) &&
                                                        hasEditPermission(pages.SYNC_JOBS) &&
                                                        (!weightedAvgSyncs.includes(item.type) ? (
                                                            <button
                                                                className="sync-run-btn"
                                                                key={i}
                                                                type="button"
                                                                onClick={() => {
                                                                    syncNow[item.type](year);
                                                                }}>
                                                                Run
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="sync-run-btn"
                                                                key={i}
                                                                type="button"
                                                                onClick={() => {
                                                                    syncNow[item.type](year);
                                                                }}>
                                                                Configure & Run
                                                            </button>
                                                        ))}
                                                    {item.type === 'DLP Sync' && (
                                                        <>
                                                            <button
                                                                onClick={downloadDLPReport}
                                                                style={{
                                                                    display: 'block',
                                                                    margin: '10px auto',
                                                                }}
                                                                className="sync-run-btn">
                                                                Download Report
                                                            </button>
                                                            <ExcelFile
                                                                filename={
                                                                    item.run_at
                                                                        ? `DLP_Record_List_${moment(item.run_at).format('YYYY_MM_DD, h:mm A').replace(/:/g, '-')}`
                                                                        : `DLP_Record_List`
                                                                }
                                                                element={<button style={{ display: 'none' }} id="dlpReportDownload" />}>
                                                                <ExcelSheet data={dlpReports} name="DLP Report">
                                                                    {dlpReports.length > 1 &&
                                                                        Object.keys(dlpReports[0])?.map((data) => <ExcelColumn label={`${data}`} value={`${data}`} key={data} />)}
                                                                </ExcelSheet>
                                                                <ExcelSheet data={mismatchData} name="Mismatch Report">
                                                                    {mismatchData.length > 1 &&
                                                                        Object.keys(mismatchData[0])?.map((data) => <ExcelColumn label={`${data}`} value={`${data}`} key={data} />)}
                                                                </ExcelSheet>
                                                            </ExcelFile>
                                                        </>
                                                    )}
                                                    {uploadDownloadSyncs.includes(item.type) && hasEditPermission(pages.SYNC_JOBS) && (
                                                        <div className="sync-btn-group">
                                                            <div className="upload-sync">
                                                                <label htmlFor={`upload-file_${item.type}`}>
                                                                    <input id={`upload-file#${item.type}`} type="file" ref={setFileRefs} onChange={fileChangeHandlers} />
                                                                </label>
                                                            </div>
                                                            <div className="session-download-btn2">
                                                                <button
                                                                    className="sync-run-btn"
                                                                    type="button"
                                                                    onClick={() => {
                                                                        syncNow[item.type]();
                                                                    }}>
                                                                    {'Upload & Run'}
                                                                </button>
                                                                <button
                                                                    className="sync-run-btn"
                                                                    onClick={() => {
                                                                        downloadFunctions[item.type]();
                                                                    }}>
                                                                    Download
                                                                </button>
                                                                <ExcelFile
                                                                    filename={`${item.type}_${moment().format('YYYY_MM_DD, hh-mm A')}`}
                                                                    element={
                                                                        <button id={`download#${item.type}`} style={{ display: 'none' }}>
                                                                            Download
                                                                        </button>
                                                                    }>
                                                                    <ExcelSheet data={downloadData[item.type]} name="Sheet 1">
                                                                        {downloadData[item.type]?.length > 0 &&
                                                                            Object.keys(downloadData[item.type][0])?.map((data, index) => (
                                                                                <ExcelColumn key={`${item.type}_${index}`} label={`${data}`} value={`${data}`} />
                                                                            ))}
                                                                    </ExcelSheet>
                                                                </ExcelFile>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </Loader>
                    </table>
                </div>
                <br />
            </div>
            <div className="cron-block sync-block">
                <div className="sync-head">
                    <h2 className="sync-text">Automated Jobs</h2>
                </div>
                <div className="cron-logs dashboard-table sync-table">
                    <table>
                        <Loader>
                            <thead className="sales-orders-th">
                                <tr>
                                    <th className="thead-po">Job Name</th>
                                    <th>Last run time</th>
                                    <th>Last result</th>
                                </tr>
                            </thead>

                            <tbody>
                                {cronList.map((cronJob, key) => {
                                    return (
                                        <>
                                            <tr key={'cronList' + key}>
                                                <td className="#">{cronJob.type ? Util.toTitleCase(cronJob.type.replace(/_/g, ' ')) : '-'}</td>
                                                <td>{cronJob.run_at ? Util.formatDateTime(cronJob.run_at) : '-'}</td>
                                                <td>{cronJob.result ? cronJob.result : '-'}</td>
                                            </tr>
                                        </>
                                    );
                                })}
                            </tbody>
                        </Loader>
                    </table>
                </div>
            </div>
            {openArsModal && (
                <ArsModal
                    visible={openArsModal}
                    getArsAreaCodes={getArsAreaCodes}
                    insertSyncLog={insertSyncLog}
                    getForecastConfigurations={getForecastConfigurations}
                    syncForecastDump={syncForecastDump}
                    syncPhasing={syncPhasing}
                    syncForecastAllocation={syncForecastAllocation}
                    onCancel={() => setOpenArsModal(false)}
                />
            )}
        </div>
    );
};

const ArsModal = (props) => {
    const { visible, onCancel, getArsAreaCodes } = props;

    //-----------------------------------------------------=====useState====-------------------------------------------------------
    const [areaCodes, setAreaCodes] = useState([]);

    //-----------------------------------------------------=====useEffect====------------------------------------------------------

    useEffect(() => {
        if (visible === 'ARS Forecast Dump') {
            //fetch area codes from Forecast dashboard api
            getArsAreaCodes().then((response) => {
                if (response?.data?.success) setAreaCodes(response?.data?.data?.sort((a, b) => (a.code.toUpperCase() >= b.code.toUpperCase() ? 1 : -1)));
            });
        }
    }, []);
    return (
        <Modal title={visible} visible={visible} onCancel={onCancel} footer={null} width={800} maskClosable={false}>
            <div className="ars-modal">
                <div className="ars-modal-body">
                    {visible === 'ARS Forecast Dump' && <ForecastSyncConnect onCancel={onCancel} areaCodes={areaCodes} />}
                    {visible === 'ARS Forecast Allocation' && <ForecastAllocationSync onCancel={onCancel} areaCodes={areaCodes} />}
                    {visible === 'ARS Phasing' && <PhasingSync onCancel={onCancel} />}
                </div>
            </div>
        </Modal>
    );
};

const mapStateToProps = (state) => {
    return {
        sso_user_details: state.admin.get('sso_user_details'),
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        getSyncJobs: () => dispatch(AdminAction.getSyncJobs()),
        getAppSettingList: () => dispatch(AdminAction.getAppSettingList()),
        materialSync: () => dispatch(AdminAction.materialSync()),
        distributorSync: () => dispatch(AdminAction.distributorSync()),
        salesHierarchySync: () => dispatch(AdminAction.salesHierarchySync()),
        mdmSync: () => dispatch(AdminAction.mdmSync()),
        updateMaterialTags: (data) => dispatch(AdminAction.updateMaterialTags(data)),
        getSSODetails: (emailId, history) => dispatch(AdminAction.getSSODetails(emailId, history)),
        downloadSampleTag: () => dispatch(AdminAction.downloadSampleTag()),
        skuDistributorPlanningSync: () => dispatch(AdminAction.skuDistributorPlanningSync()),
        pskuDistributorPlanningSync: () => dispatch(AdminAction.pskuDistributorPlanningSync()),
        updateSAPHolidays: (data) => dispatch(AdminAction.updateSAPHolidays(data)),
        dlpSync: (data) => dispatch(AdminAction.dlpSync(data)),
        dashboardFilterCategories: () => dispatch(AdminAction.dashboardFilterCategories()),
        fetchDlpReportData: () => dispatch(AdminAction.fetchDlpReportData()),
        updateSkuSoqNorm: (data) => dispatch(AdminAction.updateSkuSoqNorm(data)),
        updateDBPopClass: (data) => dispatch(AdminAction.updateDBPopClass(data)),
        downloadDBPopClass: () => dispatch(AdminAction.downloadDBPopClass()),
        downloadSkuSoqNorm: () => dispatch(AdminAction.downloadSkuSoqNorm()),
        getArsAreaCodes: () => dispatch(AdminAction.getArsAreaCodes()),
        getForecastConfigurations: (areaCode) => dispatch(AdminAction.getForecastConfigurations({ areaCode })),
        insertSyncLog: (payload) => dispatch(AdminAction.insertSyncLog(payload)),
        syncForecastDump: (payload) => dispatch(AdminAction.syncForecastDump(payload)),
        syncPhasing: (payload) => dispatch(AdminAction.syncPhasing(payload)),
        syncForecastAllocation: (payload) => dispatch(AdminAction.syncForecastAllocation(payload)),
        mtEcomSOSync: () => dispatch(AdminAction.mtEcomSOSync()),
        upsertNourishcoPlanningSync: (payload) => dispatch(AdminAction.upsertNourishcoPlanningSync(payload)),
        downloadNourishcoPlanning: () => dispatch(AdminAction.downloadNourishcoPlanning()),
    };
};

const ConnectSyncJobs = connect(mapStateToProps, mapDispatchToProps)(SyncJobs);

export default ConnectSyncJobs;
